"""
Clone every real Hindi clip with XTTS-v2, one clone per real clip.

Each real clip is used as the speaker reference for XTTS-v2 and re-speaks its own
transcription in Hindi. Same speaker, same words, synthetic delivery — so a
detector cannot separate the classes on content or on speaker identity, only on
provenance. This mirrors the design used in the polarity check.

XTTS-v2 output is 24 kHz; clips are resampled to 16 kHz mono to match
docs/CONTRACTS.md and the real half of the corpus.

Output: ml/eval/data/hindi_xtts/*.wav + hindi_xtts.json
"""

from __future__ import annotations

import json
import pathlib
import sys
import time

import numpy as np
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parent
REAL_MANIFEST = ROOT / "hindi_real.json"
OUT_DIR = ROOT / "data" / "hindi_xtts"
MANIFEST = ROOT / "hindi_xtts.json"

MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"
TARGET_SR = 16000
LANGUAGE = "hi"


def resample_to_16k(x: np.ndarray, sr: int) -> np.ndarray:
    if sr == TARGET_SR:
        return x.astype(np.float32)
    from math import gcd
    from scipy.signal import resample_poly
    g = gcd(int(sr), TARGET_SR)
    return resample_poly(x, TARGET_SR // g, sr // g).astype(np.float32)


def main() -> int:
    if not REAL_MANIFEST.exists():
        print(f"missing {REAL_MANIFEST}; run build_hindi_real.py first", file=sys.stderr)
        return 1

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    real_clips = json.loads(REAL_MANIFEST.read_text(encoding="utf-8"))["clips"]
    if limit:
        real_clips = real_clips[:limit]

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Coqui gates the XTTS weights behind its own licence prompt; this is a
    # non-interactive run, so accept it explicitly rather than hang on stdin.
    import os
    os.environ.setdefault("COQUI_TOS_AGREED", "1")

    import torch
    from TTS.api import TTS

    print(f"torch {torch.__version__}, loading {MODEL} (first run downloads ~2 GB)")
    t0 = time.time()
    tts = TTS(MODEL, progress_bar=False)
    print(f"model ready in {time.time() - t0:.0f}s")

    entries = []
    failures = []
    started = time.time()

    for i, source in enumerate(real_clips):
        clip_id = f"hxtts_{i:03d}"
        dest = OUT_DIR / f"{clip_id}.wav"
        reference = ROOT.parents[1] / source["path"]

        if dest.exists() and dest.stat().st_size > 1000:
            wav, sr = sf.read(dest, dtype="float32")
        else:
            try:
                wav = np.asarray(
                    tts.tts(
                        text=source["text"],
                        speaker_wav=str(reference),
                        language=LANGUAGE,
                    ),
                    dtype=np.float32,
                )
                sr = getattr(tts.synthesizer, "output_sample_rate", 24000)
                wav = resample_to_16k(wav, sr)
                sf.write(dest, wav, TARGET_SR, subtype="PCM_16")
                sr = TARGET_SR
            except Exception as exc:                       # noqa: BLE001
                failures.append({"id": clip_id, "error": f"{type(exc).__name__}: {exc}"})
                print(f"  {clip_id} FAILED {type(exc).__name__}: {str(exc)[:120]}")
                continue

        entries.append({
            "id": clip_id,
            "path": str(dest.relative_to(ROOT.parents[1])).replace("\\", "/"),
            "label": "fake",
            "engine": "xtts_v2",
            "text": source["text"],
            "duration_s": round(len(wav) / TARGET_SR, 2),
            "pairs_with": source["id"],
            "speaker_id": source.get("speaker_id"),
        })

        done = i + 1
        if done % 10 == 0:
            rate = (time.time() - started) / done
            left = rate * (len(real_clips) - done)
            print(f"  {done}/{len(real_clips)} clones  "
                  f"{rate:.1f}s/clip  ~{left / 60:.0f} min left")

    MANIFEST.write_text(
        json.dumps({"clips": entries, "failures": failures}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nwrote {len(entries)} XTTS-v2 clones to {OUT_DIR}")
    if failures:
        print(f"  {len(failures)} failures recorded in the manifest")
    return 0 if entries else 1


if __name__ == "__main__":
    sys.exit(main())
