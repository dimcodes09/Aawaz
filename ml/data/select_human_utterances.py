"""
Select demo-suitable human utterances from LibriSpeech dev-clean.

Source: https://www.openslr.org/12  (LibriSpeech, CC BY 4.0, Panayotov et al. 2015)

Selection rules, in order:
  * duration inside [MIN_S, MAX_S]
  * one utterance per speaker, so the demo pairs are not all the same voice
  * prefer a transcript that is readable aloud: word count in a sane band and
    no numerals (XTTS has to re-speak this text verbatim, and digits invite
    normalisation differences between the human reading and the synthesis)
  * prefer clips whose opening is quiet, because the validated demo scores the
    FIRST window and the checkpoint is known to key on leading silence
    (docs/00-ANDROID-AUDIO-FEASIBILITY.md). Sorting on this does not modify a
    single sample - it only decides which existing recordings we pick.

Originals are copied verbatim. No trimming, no gain, no silence removal.

Usage:  python ml/data/select_human_utterances.py [--count 3] [--pool 0]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

import numpy as np
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[2]
CORPUS = ROOT / "ml" / "data" / "_raw" / "LibriSpeech" / "dev-clean"
OUT = ROOT / "ml" / "data" / "demo_voice"
POOL_JSON = OUT / "_human_pool.json"

MIN_S, MAX_S = 6.0, 10.0
MIN_WORDS, MAX_WORDS = 12, 28

SOURCE_DATASET = "LibriSpeech dev-clean (OpenSLR SLR12)"
LICENSE = "CC BY 4.0"


def utterances():
    """Yield every dev-clean utterance with its transcript and duration."""
    for trans in sorted(CORPUS.rglob("*.trans.txt")):
        for line in trans.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            utt_id, _, text = line.partition(" ")
            flac = trans.parent / f"{utt_id}.flac"
            if not flac.exists():
                continue
            info = sf.info(str(flac))
            yield {
                "utt_id": utt_id,
                "speaker_id": utt_id.split("-")[0],
                "path": flac,
                "text": text.strip(),
                "duration": round(info.frames / info.samplerate, 3),
                "sample_rate": info.samplerate,
                "channels": info.channels,
            }


def lead_rms(path: pathlib.Path, seconds: float = 0.3) -> float:
    """RMS of the opening of the clip. Used only for ranking, never to edit."""
    x, sr = sf.read(str(path), dtype="float32", always_2d=False)
    if x.ndim > 1:
        x = x.mean(axis=1)
    head = x[: int(seconds * sr)]
    if head.size == 0:
        return 1.0
    return float(np.sqrt((head ** 2).mean()))


def eligible(u) -> bool:
    if not (MIN_S <= u["duration"] <= MAX_S):
        return False
    words = u["text"].split()
    if not (MIN_WORDS <= len(words) <= MAX_WORDS):
        return False
    if re.search(r"\d", u["text"]):
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=3, help="speakers to select")
    ap.add_argument("--pool", type=int, default=0,
                    help="rank index to start from, for re-picking after a rejection")
    args = ap.parse_args()

    if not CORPUS.exists():
        print(f"missing corpus at {CORPUS}", file=sys.stderr)
        print("run the OpenSLR download/extract step first", file=sys.stderr)
        return 1

    cands = [u for u in utterances() if eligible(u)]
    print(f"dev-clean: {len(cands)} utterances match "
          f"{MIN_S}-{MAX_S}s and {MIN_WORDS}-{MAX_WORDS} words")

    for u in cands:
        u["lead_rms"] = lead_rms(u["path"])

    # Quietest opening first; that is the condition the validated first-window
    # demo was built around.
    cands.sort(key=lambda u: (u["lead_rms"], u["utt_id"]))

    picked, seen = [], set()
    for u in cands[args.pool:]:
        if u["speaker_id"] in seen:
            continue
        seen.add(u["speaker_id"])
        picked.append(u)
        if len(picked) == args.count:
            break

    if len(picked) < args.count:
        print(f"only found {len(picked)} distinct speakers", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for i, u in enumerate(picked, start=1):
        rows.append({
            "pair_id": f"pair_{i:02d}",
            "speaker_id": u["speaker_id"],
            "utt_id": u["utt_id"],
            "source_path": str(u["path"].relative_to(ROOT)).replace("\\", "/"),
            "transcript": u["text"],
            "source_dataset": SOURCE_DATASET,
            "license": LICENSE,
            "sample_rate": u["sample_rate"],
            "duration": u["duration"],
            "lead_rms": round(u["lead_rms"], 6),
        })
        print(f"  {rows[-1]['pair_id']}  spk {u['speaker_id']:>5}  "
              f"{u['duration']:.2f}s  leadRMS {u['lead_rms']:.5f}  {u['text'][:52]}")

    POOL_JSON.write_text(json.dumps({"selected": rows}, indent=2), encoding="utf-8")
    print(f"\nwrote {POOL_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
