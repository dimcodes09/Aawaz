"""
Score the demo pairs with the existing RawTFNet-32 pipeline.

Nothing about the model or the contract is re-implemented here. Preprocessing is
ml/eval/preprocess.py (the same module the polarity check and the Android
contract were built against):

    16 kHz mono float32 in [-1, 1], 64600 samples, head crop.

Head crop means the scored window is the FIRST 4.0375 s of the clip, leading
silence intact. That is deliberately the same first-window method the validated
Android demo uses (ScoreMode.FIRST_WINDOW). No streaming, no VAD, no padding,
no threshold changes - see docs/00-ANDROID-AUDIO-FEASIBILITY.md for why the
checkpoint is only trustworthy in this condition.

    risk = round((1 - sigmoid(logits[1])) * 100)      index 1 = bona-fide

Usage:  python ml/data/score_pairs.py
"""

from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import onnxruntime as ort

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "eval"))
from preprocess import WINDOW_SAMPLES, load_window  # noqa: E402

MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"
MANIFEST = ROOT / "ml" / "data" / "demo_voice" / "manifest.json"
RESULTS = ROOT / "ml" / "data" / "demo_voice" / "scores.json"

PREPROCESSING_MODE = "first_window_head_crop_64600_16k_mono_no_norm"
RAISE_AT = 75
CLEAR_AT = 45


def state_for(risk: int) -> str:
    if risk >= RAISE_AT:
        return "HIGH"
    if risk >= CLEAR_AT:
        return "ELEVATED"
    return "OK"


def main() -> int:
    if not MODEL.exists():
        print(f"missing model {MODEL}", file=sys.stderr)
        return 1
    if not MANIFEST.exists():
        print(f"missing {MANIFEST}", file=sys.stderr)
        return 1

    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    pairs = json.loads(MANIFEST.read_text(encoding="utf-8"))["pairs"]

    def score(path: pathlib.Path) -> dict:
        win = load_window(str(path))                 # 64600, first window
        assert win.shape == (WINDOW_SAMPLES,), win.shape
        logits = sess.run(["logits"], {"wav": win.reshape(1, -1).astype(np.float32)})[0][0]
        bona = float(logits[1])
        risk = int(round((1.0 - 1.0 / (1.0 + np.exp(-bona))) * 100))
        return {"risk": risk, "logit_spoof": float(logits[0]), "logit_bonafide": bona,
                "state": state_for(risk)}

    hdr = (f"{'pair':8} {'type':6} {'risk':>5} {'state':>9} "
           f"{'logit_spoof':>12} {'logit_bona':>11} {'dur':>6} {'sr':>6}  mode")
    print(hdr)
    print("-" * len(hdr))

    rows = []
    for p in pairs:
        for kind, key in (("human", "human"), ("ai", "ai")):
            path = ROOT / p[key]["path"]
            r = score(path)
            row = {
                "pair_id": p["pair_id"],
                "type": kind,
                "path": p[key]["path"],
                "risk": r["risk"],
                "state": r["state"],
                "logit_spoof": round(r["logit_spoof"], 4),
                "logit_bonafide": round(r["logit_bonafide"], 4),
                "duration": p[key]["duration"],
                "sample_rate": p[key]["sample_rate"],
                "preprocessing_mode": PREPROCESSING_MODE,
            }
            rows.append(row)
            print(f"{p['pair_id']:8} {kind:6} {r['risk']:5} {r['state']:>9} "
                  f"{r['logit_spoof']:12.4f} {r['logit_bonafide']:11.4f} "
                  f"{p[key]['duration']:6.2f} {p[key]['sample_rate']:6}  {PREPROCESSING_MODE}")

    # A pair is usable for the demo only if it separates in the right direction.
    print()
    verdicts = {}
    for p in pairs:
        h = next(r for r in rows if r["pair_id"] == p["pair_id"] and r["type"] == "human")
        a = next(r for r in rows if r["pair_id"] == p["pair_id"] and r["type"] == "ai")
        ok = h["risk"] < CLEAR_AT and a["risk"] >= RAISE_AT
        verdicts[p["pair_id"]] = {
            "human_risk": h["risk"], "ai_risk": a["risk"],
            "gap": a["risk"] - h["risk"], "passes": ok,
        }
        print(f"{p['pair_id']}  human {h['risk']:3}  ai {a['risk']:3}  "
              f"gap {a['risk'] - h['risk']:4}  "
              f"{'PASS' if ok else f'FAIL (need human<{CLEAR_AT} and ai>={RAISE_AT})'}")

    passed = [k for k, v in verdicts.items() if v["passes"]]
    print(f"\n{len(passed)}/{len(pairs)} pairs pass the demo gate")

    RESULTS.write_text(json.dumps(
        {"rows": rows, "verdicts": verdicts,
         "gate": {"human_below": CLEAR_AT, "ai_at_or_above": RAISE_AT},
         "preprocessing_mode": PREPROCESSING_MODE,
         "model": str(MODEL.relative_to(ROOT)).replace("\\", "/")},
        indent=2), encoding="utf-8")
    print(f"wrote {RESULTS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
