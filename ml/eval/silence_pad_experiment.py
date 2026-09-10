"""
Does prepending digital silence restore real/fake separation on mid-file windows?

Track 1 found the ASVspoof-2019 silence-leakage artifact on-device: the checkpoint
keys on LEADING SILENCE, not on spoofing. Window 0 of a file scores correctly;
every later window pins near 99 even for genuine speech.

Track 1 measured, on REAL audio only:
  real, leading silence stripped        risk 1  -> 99-100
  real, 0.35 s silence prepended to a
  MID-FILE window                       risk 99 -> 65-94

The untested half is what the same trick does to SYNTHETIC audio. If real drops
and fake stays pinned high, streaming is saved: every window can be constructed
as [pad s digital silence][rest speech] to total exactly 64600 samples.

Conditions: raw mid-file window, then pads of 0.20 / 0.35 / 0.50 s.
Set: the edge-tts English pair set (demo language).

Run:  python ml/eval/silence_pad_experiment.py
"""

from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import onnxruntime as ort
import soundfile as sf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from preprocess import TARGET_SR, WINDOW_SAMPLES, resample, to_mono  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
EVAL = pathlib.Path(__file__).resolve().parent
MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"

WINDOWS_PER_CLIP = 5
PADS_S = [0.0, 0.20, 0.35, 0.50]
RAISE_THRESHOLD = 75


def load_full(path: pathlib.Path) -> np.ndarray:
    x, sr = sf.read(str(path), dtype="float32", always_2d=False)
    return resample(to_mono(x), sr).astype(np.float32)


def mid_windows(x: np.ndarray, n: int = WINDOWS_PER_CLIP) -> list[np.ndarray]:
    """n windows of exactly WINDOW_SAMPLES, none of them window 0."""
    # Tile short clips up so a genuine mid-file offset exists. Tile-repeat is the
    # model's own documented pad policy, so this stays in-distribution.
    need = 2 * WINDOW_SAMPLES
    if len(x) < need:
        x = np.tile(x, int(np.ceil(need / len(x))))[:need]
    lo, hi = WINDOW_SAMPLES, len(x) - WINDOW_SAMPLES
    if hi <= lo:
        offsets = [lo] * n
    else:
        offsets = [int(round(o)) for o in np.linspace(lo, hi, n)]
    return [x[o:o + WINDOW_SAMPLES].copy() for o in offsets]


def apply_pad(window: np.ndarray, pad_s: float) -> np.ndarray:
    """[pad_s digital silence][speech], total exactly WINDOW_SAMPLES."""
    if pad_s <= 0:
        return window
    pad_n = int(round(pad_s * TARGET_SR))
    out = np.zeros(WINDOW_SAMPLES, dtype=np.float32)
    out[pad_n:] = window[: WINDOW_SAMPLES - pad_n]
    return out


def risk_of(l1: float) -> int:
    return int(round((1.0 - 1.0 / (1.0 + np.exp(-l1))) * 100))


def auc(real: np.ndarray, fake: np.ndarray) -> float:
    wins = sum(float(a) > float(b) for a in real for b in fake)
    ties = sum(float(a) == float(b) for a in real for b in fake)
    return (wins + 0.5 * ties) / (len(real) * len(fake))


def main() -> int:
    clips = json.loads((EVAL / "manifest.json").read_text(encoding="utf-8"))["clips"]
    real_clips = [c for c in clips if c["label"] == "real"]
    fake_clips = [c for c in clips if c["label"] == "fake"]

    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name

    def score(w: np.ndarray) -> float:
        return float(session.run(None, {name: w[None, :].astype(np.float32)})[0][0][1])

    banks = {}
    for label, group in (("real", real_clips), ("fake", fake_clips)):
        windows = []
        for c in group:
            windows.extend(mid_windows(load_full(ROOT / c["path"])))
        banks[label] = windows
    print(f"windows: {len(banks['real'])} real, {len(banks['fake'])} fake "
          f"({WINDOWS_PER_CLIP} mid-file per clip, window 0 excluded)")

    results = {}
    print(f"\n{'=' * 84}")
    print(f"{'condition':<26} {'med risk real':>13} {'med risk fake':>13} "
          f"{'AUC':>7} {'FA@75 real':>11}")
    print("=" * 84)

    for pad in PADS_S:
        rl = np.array([score(apply_pad(w, pad)) for w in banks["real"]])
        fl = np.array([score(apply_pad(w, pad)) for w in banks["fake"]])
        rr = np.array([risk_of(v) for v in rl])
        fr = np.array([risk_of(v) for v in fl])
        a = auc(rl, fl)
        fa = float((rr >= RAISE_THRESHOLD).mean())
        tag = "A. raw mid-file" if pad == 0 else f"pad {pad:.2f}s silence"
        results[tag] = {
            "pad_s": pad,
            "median_risk_real": float(np.median(rr)),
            "median_risk_fake": float(np.median(fr)),
            "auc": a,
            "false_alarm_real_at_75": fa,
            "real_risk": rr.tolist(), "fake_risk": fr.tolist(),
        }
        print(f"{tag:<26} {np.median(rr):>13.1f} {np.median(fr):>13.1f} "
              f"{a:>7.3f} {fa:>10.0%}")

    print(f"\n{'=' * 84}\nGATE: AUC >= 0.90 AND median risk real < 50\n{'=' * 84}")
    winners = [(t, r) for t, r in results.items()
               if r["auc"] >= 0.90 and r["median_risk_real"] < 50]
    if winners:
        best = max(winners, key=lambda kv: kv[1]["auc"])
        print(f"  STREAMING SAVED at {best[0]}: AUC {best[1]['auc']:.3f}, "
              f"median risk real {best[1]['median_risk_real']:.1f}, "
              f"false alarms {best[1]['false_alarm_real_at_75']:.0%}")
        print(f"  -> report pad length {best[1]['pad_s']:.2f}s to Track 1")
    else:
        print("  NO pad length satisfies both conditions -> ship utterance mode")
        for t, r in results.items():
            print(f"    {t:<26} AUC {r['auc']:.3f}  median real {r['median_risk_real']:.1f}")

    (EVAL / "silence_pad_results.json").write_text(json.dumps(results, indent=2))
    print(f"\nwrote {EVAL / 'silence_pad_results.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
