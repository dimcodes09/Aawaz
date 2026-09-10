"""
Build the 3 demo pairs for the presentation.

Selection rules, applied in order:
  - both clips 6-10 s
  - leading silence left intact (no trimming) - window 0 is where this
    checkpoint actually works, and its natural leading silence is the cue
  - scored on WINDOW 0 only
  - real must score risk < 20, fake must score risk > 80

Only pairs passing all of it are shipped. Output: demo/clips/*.wav at 48 kHz.

Run:  python ml/eval/build_demo_clips.py
"""

from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import onnxruntime as ort
import soundfile as sf
from scipy.signal import resample_poly

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from preprocess import TARGET_SR, WINDOW_SAMPLES, pad, to_mono, resample  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
EVAL = pathlib.Path(__file__).resolve().parent
MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"
OUT = ROOT / "demo" / "clips"

OUT_SR = 48000
MIN_S, MAX_S = 6.0, 10.0
REAL_MAX_RISK, FAKE_MIN_RISK = 20, 80
N_PAIRS = 3


def risk_of(l1: float) -> int:
    return int(round((1.0 - 1.0 / (1.0 + np.exp(-l1))) * 100))


def main() -> int:
    clips = json.loads((EVAL / "manifest.json").read_text(encoding="utf-8"))["clips"]
    reals = {c["id"]: c for c in clips if c["label"] == "real"}
    fakes = [c for c in clips if c["label"] == "fake"]

    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name

    def load16k(path: pathlib.Path):
        x, sr = sf.read(str(path), dtype="float32", always_2d=False)
        return resample(to_mono(x), sr).astype(np.float32)

    def window0_risk(x16: np.ndarray) -> int:
        w = pad(x16, WINDOW_SAMPLES).astype(np.float32)
        return risk_of(float(session.run(None, {name: w[None, :]})[0][0][1]))

    OUT.mkdir(parents=True, exist_ok=True)
    chosen, rejected = [], []

    for fake in fakes:
        if len(chosen) >= N_PAIRS:
            break
        real = reals.get(fake.get("pairs_with"))
        if real is None:
            continue

        rx = load16k(ROOT / real["path"])
        fx = load16k(ROOT / fake["path"])
        rdur, fdur = len(rx) / TARGET_SR, len(fx) / TARGET_SR
        rrisk, frisk = window0_risk(rx), window0_risk(fx)

        why = []
        if not (MIN_S <= rdur <= MAX_S):
            why.append(f"real {rdur:.1f}s outside {MIN_S}-{MAX_S}s")
        if not (MIN_S <= fdur <= MAX_S):
            why.append(f"fake {fdur:.1f}s outside {MIN_S}-{MAX_S}s")
        if rrisk >= REAL_MAX_RISK:
            why.append(f"real risk {rrisk} >= {REAL_MAX_RISK}")
        if frisk <= FAKE_MIN_RISK:
            why.append(f"fake risk {frisk} <= {FAKE_MIN_RISK}")

        if why:
            rejected.append({"pair": f"{real['id']}/{fake['id']}", "reasons": why,
                             "real_risk": rrisk, "fake_risk": frisk,
                             "real_s": round(rdur, 2), "fake_s": round(fdur, 2)})
            print(f"  skip {real['id']}/{fake['id']}: {'; '.join(why)}")
            continue

        idx = len(chosen) + 1
        entry = {"pair": idx, "text": real["text"], "voice": fake.get("voice"),
                 "real": {"file": f"demo_real_{idx:02d}.wav", "risk": rrisk,
                          "duration_s": round(rdur, 2)},
                 "fake": {"file": f"demo_fake_{idx:02d}.wav", "risk": frisk,
                          "duration_s": round(fdur, 2)}}
        for x16, meta in ((rx, entry["real"]), (fx, entry["fake"])):
            sf.write(OUT / meta["file"],
                     resample_poly(x16, OUT_SR // 16000, 1).astype(np.float32),
                     OUT_SR, subtype="PCM_16")
        chosen.append(entry)
        print(f"  PASS pair {idx}: real {rrisk} ({rdur:.1f}s) / "
              f"fake {frisk} ({fdur:.1f}s)  [{fake.get('voice')}]")

    manifest = {"clips": chosen, "rejected": rejected,
                "rules": {"window": "window 0 only", "leading_silence": "intact",
                          "real_max_risk": REAL_MAX_RISK,
                          "fake_min_risk": FAKE_MIN_RISK,
                          "duration_s": [MIN_S, MAX_S], "output_sr": OUT_SR}}
    (OUT.parent / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nshipped {len(chosen)}/{N_PAIRS} pairs to {OUT}")
    return 0 if len(chosen) == N_PAIRS else 1


if __name__ == "__main__":
    sys.exit(main())
