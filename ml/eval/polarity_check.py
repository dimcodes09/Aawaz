"""
Polarity check: does index 1 of `logits` really mean bona-fide?

docs/CONTRACTS.md defines

    risk = round((1 - sigmoid(logits[1])) * 100)

which is only correct if index 1 is the bona-fide logit. If the indices are the
other way round, every risk score the app shows is inverted: real callers flagged
as clones and clones waved through. That is the single failure mode worth
checking before anything else is built on top.

Run:  python ml/eval/polarity_check.py
"""

from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import onnxruntime as ort

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from preprocess import WINDOW_SAMPLES, load_window  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"
MANIFEST = pathlib.Path(__file__).resolve().parent / "manifest.json"


def sigmoid(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-x)))


def contract_risk(logits: np.ndarray) -> int:
    """risk = round((1 - sigmoid(logit[1])) * 100), per docs/CONTRACTS.md."""
    return int(round((1.0 - sigmoid(float(logits[1]))) * 100))


def score_all(session, clips, normalise: bool):
    name = session.get_inputs()[0].name
    rows = []
    for clip in clips:
        window = load_window(str(ROOT / clip["path"]), normalise=normalise)
        assert window.shape == (WINDOW_SAMPLES,), window.shape
        logits = session.run(None, {name: window[None, :]})[0][0]
        rows.append({
            "id": clip["id"],
            "label": clip["label"],
            "l0": float(logits[0]),
            "l1": float(logits[1]),
            "risk": contract_risk(logits),
            "argmax": int(np.argmax(logits)),
        })
    return rows


def summarise(rows, title: str) -> dict:
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")
    print(f"{'clip':<10} {'true label':<11} {'logits[0]':>11} {'logits[1]':>11} "
          f"{'risk':>6} {'argmax':>7}")
    print("-" * 78)
    for r in rows:
        print(f"{r['id']:<10} {r['label']:<11} {r['l0']:>11.4f} {r['l1']:>11.4f} "
              f"{r['risk']:>6} {r['argmax']:>7}")

    real = [r for r in rows if r["label"] == "real"]
    fake = [r for r in rows if r["label"] == "fake"]
    stats = {
        "real_median_risk": float(np.median([r["risk"] for r in real])),
        "fake_median_risk": float(np.median([r["risk"] for r in fake])),
        "real_median_l1": float(np.median([r["l1"] for r in real])),
        "fake_median_l1": float(np.median([r["l1"] for r in fake])),
        "real_argmax1": sum(r["argmax"] == 1 for r in real),
        "fake_argmax1": sum(r["argmax"] == 1 for r in fake),
    }

    print("-" * 78)
    print(f"{'MEDIAN real':<22} risk {stats['real_median_risk']:>6.1f}   "
          f"logits[1] {stats['real_median_l1']:>9.4f}   "
          f"argmax==1 in {stats['real_argmax1']}/{len(real)}")
    print(f"{'MEDIAN fake':<22} risk {stats['fake_median_risk']:>6.1f}   "
          f"logits[1] {stats['fake_median_l1']:>9.4f}   "
          f"argmax==1 in {stats['fake_argmax1']}/{len(fake)}")

    gap = stats["fake_median_risk"] - stats["real_median_risk"]
    stats["risk_gap_fake_minus_real"] = gap
    print(f"\nrisk gap (fake - real): {gap:+.1f}")
    print("  positive => CONTRACTS.md polarity is CORRECT (index 1 = bona-fide)")
    print("  negative => polarity is INVERTED, risk formula is backwards")
    print("  ~zero    => no separation; polarity undetermined from this data")

    # Rank separation, independent of any threshold or of the risk formula.
    lo = [r["l1"] for r in real]
    hi = [r["l1"] for r in fake]
    wins = sum(a > b for a in lo for b in hi)
    ties = sum(a == b for a in lo for b in hi)
    auc = (wins + 0.5 * ties) / (len(lo) * len(hi))
    stats["auc_l1_real_over_fake"] = auc
    print(f"\nAUC of logits[1] ranking real above fake: {auc:.3f}")
    print("  1.0 = perfect separation in the contract's direction")
    print("  0.5 = chance, no discrimination")
    print("  0.0 = perfect separation, inverted")
    return stats


def main() -> int:
    clips = json.loads(MANIFEST.read_text())["clips"]
    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    print(f"model : {MODEL.name}")
    print(f"clips : {sum(c['label'] == 'real' for c in clips)} real, "
          f"{sum(c['label'] == 'fake' for c in clips)} fake")

    out = {}
    # Amplitude normalisation is unverified (trt_rawtfnet.py is absent), so the
    # check is run both ways. A conclusion that flips between them is not a
    # conclusion.
    for normalise in (False, True):
        label = ("peak-normalised" if normalise else "raw float, no normalisation")
        out[str(normalise)] = summarise(
            score_all(session, clips, normalise),
            f"preprocessing: {label}",
        )

    print(f"\n{'=' * 78}\nSTABILITY ACROSS THE UNVERIFIED NORMALISATION CHOICE\n{'=' * 78}")
    a, b = out["False"], out["True"]
    print(f"  risk gap  raw {a['risk_gap_fake_minus_real']:+.1f}   "
          f"normalised {b['risk_gap_fake_minus_real']:+.1f}")
    print(f"  AUC       raw {a['auc_l1_real_over_fake']:.3f}        "
          f"normalised {b['auc_l1_real_over_fake']:.3f}")
    agree = np.sign(a["risk_gap_fake_minus_real"]) == np.sign(b["risk_gap_fake_minus_real"])
    print(f"  conclusion is {'STABLE' if agree else 'NOT STABLE'} "
          "across the normalisation assumption")

    (pathlib.Path(__file__).resolve().parent / "polarity_results.json").write_text(
        json.dumps(out, indent=2)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
