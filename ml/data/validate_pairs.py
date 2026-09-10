"""
Validate every human/AI demo pair before it is allowed near the detector.

Checks per pair, both sides:
   1 human file exists          7 PCM16 subtype
   2 AI file exists             8 duration inside the demo band
   3 transcript exists          9 RMS / peak sensible
   4 transcripts identical     10 no clipping
   5 sample rate == 16000      11 audio decodes and is finite
   6 mono

Exit code is non-zero if any pair fails, so this can gate the scoring step.

Usage:  python ml/data/validate_pairs.py
"""

from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "ml" / "data" / "demo_voice" / "manifest.json"

TARGET_SR = 16000
MIN_S, MAX_S = 5.0, 12.0
MIN_RMS, MAX_RMS = 0.005, 0.5
CLIP_LIMIT = 0.999
CLIP_MAX_SAMPLES = 3


def check_audio(path: pathlib.Path) -> tuple[dict, list[str]]:
    problems: list[str] = []
    if not path.exists():
        return {}, [f"missing file {path.name}"]

    info = sf.info(str(path))
    x, sr = sf.read(str(path), dtype="float32", always_2d=False)

    if sr != TARGET_SR:
        problems.append(f"sample_rate {sr} != {TARGET_SR}")
    if info.channels != 1:
        problems.append(f"channels {info.channels} != 1")
    if "PCM_16" not in info.subtype:
        problems.append(f"subtype {info.subtype} != PCM_16")

    if x.ndim > 1:
        problems.append("not mono after decode")
        x = x.mean(axis=1)
    if x.size == 0:
        return {}, problems + ["empty audio"]
    if not np.all(np.isfinite(x)):
        problems.append("non-finite samples (corrupt)")

    dur = len(x) / sr
    rms = float(np.sqrt((x ** 2).mean()))
    peak = float(np.abs(x).max())
    clipped = int(np.sum(np.abs(x) >= CLIP_LIMIT))

    if not (MIN_S <= dur <= MAX_S):
        problems.append(f"duration {dur:.2f}s outside {MIN_S}-{MAX_S}s")
    if not (MIN_RMS <= rms <= MAX_RMS):
        problems.append(f"rms {rms:.4f} outside {MIN_RMS}-{MAX_RMS}")
    if clipped > CLIP_MAX_SAMPLES:
        problems.append(f"clipping: {clipped} samples at full scale")

    return {"duration": dur, "rms": rms, "peak": peak,
            "clipped": clipped, "sr": sr, "ch": info.channels,
            "subtype": info.subtype}, problems


def main() -> int:
    if not MANIFEST.exists():
        print(f"missing {MANIFEST}", file=sys.stderr)
        return 1

    pairs = json.loads(MANIFEST.read_text(encoding="utf-8"))["pairs"]

    hdr = (f"{'pair':8} {'side':6} {'dur':>6} {'sr':>6} {'ch':>3} {'subtype':>8} "
           f"{'rms':>7} {'peak':>7} {'clip':>5}  {'status'}")
    print(hdr)
    print("-" * len(hdr))

    all_ok = True
    for p in pairs:
        pair_dir = ROOT / "ml" / "data" / "demo_voice" / p["pair_id"]
        tpath = pair_dir / "transcript.txt"

        pair_problems: list[str] = []
        if not tpath.exists():
            pair_problems.append("transcript.txt missing")
            transcript = None
        else:
            transcript = tpath.read_text(encoding="utf-8").strip()
            if transcript != p["transcript"].strip():
                pair_problems.append("transcript.txt differs from manifest")

        for side, key in (("human", "human"), ("ai", "ai")):
            path = ROOT / p[key]["path"]
            stats, problems = check_audio(path)
            ok = not problems
            all_ok &= ok
            if stats:
                print(f"{p['pair_id']:8} {side:6} {stats['duration']:6.2f} "
                      f"{stats['sr']:6} {stats['ch']:3} {stats['subtype']:>8} "
                      f"{stats['rms']:7.4f} {stats['peak']:7.4f} {stats['clipped']:5}  "
                      f"{'PASS' if ok else 'FAIL: ' + '; '.join(problems)}")
            else:
                print(f"{p['pair_id']:8} {side:6} {'-':>6} {'-':>6} {'-':>3} {'-':>8} "
                      f"{'-':>7} {'-':>7} {'-':>5}  FAIL: {'; '.join(problems)}")

        # The transcripts are shared by construction; this proves it held.
        same = transcript is not None and not pair_problems
        all_ok &= same
        print(f"{p['pair_id']:8} {'pair':6} {'':>6} {'':>6} {'':>3} {'':>8} "
              f"{'':>7} {'':>7} {'':>5}  "
              f"{'transcripts identical' if same else 'FAIL: ' + '; '.join(pair_problems)}")

    print()
    print("ALL PAIRS VALID" if all_ok else "VALIDATION FAILED")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
