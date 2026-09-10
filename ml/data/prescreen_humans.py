"""
Pre-screen genuine LibriSpeech utterances with RawTFNet before spending XTTS time.

Why this exists: the AI side of every pair scores 98-99 reliably, but the human
side does not. RawTFNet-32 flags a large share of genuine speech as spoofed in
first-window mode (docs/00-ANDROID-AUDIO-FEASIBILITY.md). Synthesising an XTTS
clone takes ~40 s; scoring a candidate takes ~50 ms. So score the humans first
and only clone the ones the detector already handles correctly.

This selects demo material; it does not alter any audio, model or threshold. The
pass rate printed at the end is the honest measure of how often this checkpoint
gets genuine English speech right, and belongs in the report.

Usage:  python ml/data/prescreen_humans.py [--candidates 200] [--need 3]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from math import gcd

import numpy as np
import onnxruntime as ort
import soundfile as sf
from scipy.signal import resample_poly

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "eval"))
from preprocess import WINDOW_SAMPLES, pad  # noqa: E402

CORPUS = ROOT / "ml" / "data" / "_raw" / "LibriSpeech" / "dev-clean"
OUT = ROOT / "ml" / "data" / "demo_voice"
POOL_JSON = OUT / "_human_pool.json"
SCREEN_JSON = OUT / "_prescreen.json"

MIN_S, MAX_S = 6.0, 10.0
MIN_WORDS, MAX_WORDS = 12, 28
TARGET_SR = 16000
CLEAR_AT = 45

SOURCE_DATASET = "LibriSpeech dev-clean (OpenSLR SLR12)"
LICENSE = "CC BY 4.0"


def to16k(x: np.ndarray, sr: int) -> np.ndarray:
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr == TARGET_SR:
        return x.astype(np.float32)
    g = gcd(int(sr), TARGET_SR)
    return resample_poly(x, TARGET_SR // g, sr // g).astype(np.float32)


def candidates():
    for trans in sorted(CORPUS.rglob("*.trans.txt")):
        for line in trans.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            utt_id, _, text = line.partition(" ")
            text = text.strip()
            words = text.split()
            if not (MIN_WORDS <= len(words) <= MAX_WORDS):
                continue
            if re.search(r"\d", text):
                continue
            flac = trans.parent / f"{utt_id}.flac"
            if not flac.exists():
                continue
            info = sf.info(str(flac))
            dur = info.frames / info.samplerate
            if not (MIN_S <= dur <= MAX_S):
                continue
            yield {"utt_id": utt_id, "speaker_id": utt_id.split("-")[0],
                   "path": flac, "text": text, "duration": round(dur, 3),
                   "sample_rate": info.samplerate}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", type=int, default=200)
    ap.add_argument("--need", type=int, default=3)
    args = ap.parse_args()

    if not CORPUS.exists():
        print(f"missing corpus at {CORPUS}", file=sys.stderr)
        return 1

    sess = ort.InferenceSession(
        str(ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"),
        providers=["CPUExecutionProvider"])

    def risk_of(path: pathlib.Path) -> tuple[int, float]:
        x, sr = sf.read(str(path), dtype="float32", always_2d=False)
        win = pad(to16k(x, sr)).astype(np.float32)
        logits = sess.run(["logits"], {"wav": win.reshape(1, -1)})[0][0]
        bona = float(logits[1])
        return int(round((1.0 - 1.0 / (1.0 + np.exp(-bona))) * 100)), bona

    # One utterance per speaker keeps the survey unbiased by any single voice.
    pool, seen = [], set()
    for c in candidates():
        if c["speaker_id"] in seen:
            continue
        seen.add(c["speaker_id"])
        pool.append(c)
        if len(pool) >= args.candidates:
            break
    # Top up with extra utterances if there are fewer speakers than requested.
    if len(pool) < args.candidates:
        for c in candidates():
            if len(pool) >= args.candidates:
                break
            if any(p["utt_id"] == c["utt_id"] for p in pool):
                continue
            pool.append(c)

    print(f"scoring {len(pool)} genuine utterances "
          f"({len(seen)} distinct speakers) in first-window mode...")

    scored = []
    for c in pool:
        r, bona = risk_of(c["path"])
        c2 = dict(c)
        c2["path"] = str(c["path"].relative_to(ROOT)).replace("\\", "/")
        c2["risk"] = r
        c2["logit_bonafide"] = round(bona, 4)
        scored.append(c2)

    risks = np.array([c["risk"] for c in scored])
    low = [c for c in scored if c["risk"] < CLEAR_AT]
    print(f"\nHUMAN risk distribution over {len(scored)} genuine clips:")
    print(f"  median {int(np.median(risks))}   mean {risks.mean():.1f}   "
          f"min {risks.min()}   max {risks.max()}")
    print(f"  below {CLEAR_AT} (correctly OK): {len(low)}/{len(scored)} "
          f"= {100 * len(low) / len(scored):.0f}%")
    print(f"  at/above 75 (false alarm):      "
          f"{int((risks >= 75).sum())}/{len(scored)} "
          f"= {100 * (risks >= 75).mean():.0f}%")

    # Lowest risk first, one per speaker.
    low.sort(key=lambda c: (c["risk"], c["utt_id"]))
    picked, pspk = [], set()
    for c in low:
        if c["speaker_id"] in pspk:
            continue
        pspk.add(c["speaker_id"])
        picked.append(c)
        if len(picked) == args.need:
            break

    if len(picked) < args.need:
        print(f"\nonly {len(picked)} usable humans found; "
              f"raise --candidates", file=sys.stderr)
        return 1

    rows = []
    print(f"\nselected {len(picked)}:")
    for i, c in enumerate(picked, start=1):
        rows.append({
            "pair_id": f"pair_{i:02d}",
            "speaker_id": c["speaker_id"],
            "utt_id": c["utt_id"],
            "source_path": c["path"],
            "transcript": c["text"],
            "source_dataset": SOURCE_DATASET,
            "license": LICENSE,
            "sample_rate": c["sample_rate"],
            "duration": c["duration"],
            "prescreen_human_risk": c["risk"],
        })
        print(f"  pair_{i:02d}  spk {c['speaker_id']:>5}  {c['duration']:5.2f}s  "
              f"risk {c['risk']:3}  {c['text'][:50]}")

    SCREEN_JSON.write_text(json.dumps({"scored": scored}, indent=2), encoding="utf-8")
    POOL_JSON.write_text(json.dumps({"selected": rows}, indent=2), encoding="utf-8")
    print(f"\nwrote {POOL_JSON.relative_to(ROOT)} and {SCREEN_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
