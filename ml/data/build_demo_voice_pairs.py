"""
Build human/AI voice pairs for the Aawaz demo.

For each selected LibriSpeech utterance:
  human_original.wav   verbatim copy of the LibriSpeech FLAC decoded to WAV
  ai_xtts_original.wav XTTS-v2 speaking the SAME transcript, using the human
                       clip as the speaker reference
  human.wav            16 kHz mono PCM16 detector copy
  ai_xtts.wav          16 kHz mono PCM16 detector copy
  transcript.txt       one transcript, shared by both sides of the pair

Ground truth is provenance, not content: identical words, identical speaker
reference, so the only thing separating the two files is that one was spoken by
a person and one was synthesised by XTTS-v2.

Environment notes carried over from ml/eval/build_hindi_clones.py, which is the
script that established these workarounds on this machine:
  * Coqui gates the XTTS weights behind a licence prompt; COQUI_TOS_AGREED makes
    the run non-interactive instead of hanging on stdin.
  * torchaudio >= 2.9 routes audio I/O through torchcodec, which needs FFmpeg
    *shared* libraries. The ffmpeg here is a static build, so torchaudio.load
    fails on every reference clip. XTTS only uses it to read the speaker
    reference and soundfile reads these files fine, so it is redirected.

Nothing is trimmed, gated or gain-normalised. Leading silence is preserved on
purpose - the validated demo scores the first window and the checkpoint is known
to key on it (docs/00-ANDROID-AUDIO-FEASIBILITY.md).

Usage:  python ml/data/build_demo_voice_pairs.py
"""

from __future__ import annotations

import datetime
import json
import os
import pathlib
import sys
import time
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "ml" / "data" / "demo_voice"
POOL_JSON = OUT / "_human_pool.json"
MANIFEST = OUT / "manifest.json"

MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"
LANGUAGE = "en"
TARGET_SR = 16000
MAX_ABS = 0.99          # clipping guard for the detector copies


def to_mono(x: np.ndarray) -> np.ndarray:
    return x.mean(axis=1) if x.ndim > 1 else x


def resample(x: np.ndarray, sr: int, target: int = TARGET_SR) -> np.ndarray:
    if sr == target:
        return x.astype(np.float32)
    g = gcd(int(sr), int(target))
    return resample_poly(x, target // g, sr // g).astype(np.float32)


def write_detector_copy(x: np.ndarray, sr: int, dest: pathlib.Path) -> dict:
    """16 kHz mono PCM16. Scaled down only if it would otherwise clip."""
    y = resample(to_mono(x), sr)
    peak = float(np.abs(y).max()) if y.size else 0.0
    scaled = False
    if peak > MAX_ABS:
        y = y * (MAX_ABS / peak)
        scaled = True
    sf.write(str(dest), y, TARGET_SR, subtype="PCM_16")
    return {
        "path": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "sample_rate": TARGET_SR,
        "duration": round(len(y) / TARGET_SR, 3),
        "peak": round(float(np.abs(y).max()) if y.size else 0.0, 5),
        "rms": round(float(np.sqrt((y ** 2).mean())) if y.size else 0.0, 5),
        "peak_limited": scaled,
    }


def load_tts():
    os.environ.setdefault("COQUI_TOS_AGREED", "1")

    import torch
    import torchaudio

    def _soundfile_load(path, *args, **kwargs):
        data, rate = sf.read(str(path), dtype="float32", always_2d=True)
        return torch.from_numpy(np.ascontiguousarray(data.T)), rate

    torchaudio.load = _soundfile_load

    from TTS.api import TTS

    print(f"torch {torch.__version__}; loading {MODEL}")
    t0 = time.time()
    tts = TTS(MODEL, progress_bar=False)
    print(f"model ready in {time.time() - t0:.0f}s")
    return tts


def main() -> int:
    if not POOL_JSON.exists():
        print(f"missing {POOL_JSON}; run select_human_utterances.py first", file=sys.stderr)
        return 1

    selected = json.loads(POOL_JSON.read_text(encoding="utf-8"))["selected"]
    tts = load_tts()
    generated_on = datetime.date.today().isoformat()

    pairs, failures = [], []
    for row in selected:
        pair_dir = OUT / row["pair_id"]
        pair_dir.mkdir(parents=True, exist_ok=True)

        src = ROOT / row["source_path"]
        human_raw, human_sr = sf.read(str(src), dtype="float32", always_2d=False)
        human_raw = to_mono(human_raw)

        # Original, verbatim: only the FLAC container is dropped.
        human_original = pair_dir / "human_original.wav"
        sf.write(str(human_original), human_raw, human_sr, subtype="PCM_16")

        transcript = row["transcript"]
        (pair_dir / "transcript.txt").write_text(transcript + "\n", encoding="utf-8")

        ai_original = pair_dir / "ai_xtts_original.wav"
        if ai_original.exists() and ai_original.stat().st_size > 1000:
            ai_raw, ai_sr = sf.read(str(ai_original), dtype="float32", always_2d=False)
            ai_raw = to_mono(ai_raw)
            print(f"  {row['pair_id']} reusing existing XTTS output")
        else:
            print(f"  {row['pair_id']} synthesising ({len(transcript.split())} words)...")
            try:
                wav = np.asarray(
                    tts.tts(text=transcript, speaker_wav=str(src), language=LANGUAGE),
                    dtype=np.float32,
                )
            except Exception as exc:                        # noqa: BLE001
                failures.append({"pair_id": row["pair_id"],
                                 "error": f"{type(exc).__name__}: {exc}"})
                print(f"    FAILED {type(exc).__name__}: {str(exc)[:140]}")
                continue
            ai_sr = int(getattr(tts.synthesizer, "output_sample_rate", 24000))
            ai_raw = to_mono(wav)
            sf.write(str(ai_original), ai_raw, ai_sr, subtype="PCM_16")

        human_det = write_detector_copy(human_raw, human_sr, pair_dir / "human.wav")
        ai_det = write_detector_copy(ai_raw, ai_sr, pair_dir / "ai_xtts.wav")

        pairs.append({
            "pair_id": row["pair_id"],
            "speaker_id": row["speaker_id"],
            "utt_id": row["utt_id"],
            "transcript": transcript,
            "source_dataset": row["source_dataset"],
            "license": row["license"],
            "generation_model": "XTTS-v2 (tts_models/multilingual/multi-dataset/xtts_v2)",
            "generation_language": LANGUAGE,
            "generated_on": generated_on,
            "human_original": {
                "path": str(human_original.relative_to(ROOT)).replace("\\", "/"),
                "sample_rate": int(human_sr),
                "duration": round(len(human_raw) / human_sr, 3),
            },
            "ai_original": {
                "path": str(ai_original.relative_to(ROOT)).replace("\\", "/"),
                "sample_rate": int(ai_sr),
                "duration": round(len(ai_raw) / ai_sr, 3),
            },
            "human": human_det,
            "ai": ai_det,
        })
        print(f"    human {human_det['duration']:.2f}s  ai {ai_det['duration']:.2f}s")

    MANIFEST.write_text(json.dumps(
        {"pairs": pairs, "failures": failures,
         "target_sample_rate": TARGET_SR,
         "note": "Detector copies are 16 kHz mono PCM16. Leading silence preserved."},
        indent=2), encoding="utf-8")
    print(f"\nwrote {MANIFEST.relative_to(ROOT)}  pairs={len(pairs)} failures={len(failures)}")
    return 0 if pairs else 1


if __name__ == "__main__":
    raise SystemExit(main())
