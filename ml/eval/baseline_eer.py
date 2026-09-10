"""
Baseline EER of the pretrained RawTFNet on the Hindi corpus.

This is the honesty number. Published results put this architecture family near
chance on modern neural TTS it was never trained on, so a poor EER here is the
expected and correct outcome, not a failure.

Scoring convention: the bona-fide score is logits[1], confirmed as the bona-fide
index by docs/11-POLARITY-CHECK.md. Positive class is bona-fide (real), so
  FRR(t) = fraction of real  clips scoring below t   (genuine speech rejected)
  FAR(t) = fraction of fake  clips scoring at/above t (clone accepted as real)
EER is where the two curves cross.

Splitting: real clips and their clones are kept in the SAME split. A clone shares
its speaker and its words with its source, so separating them would leak the
evaluation set into training.

Run:  python ml/eval/baseline_eer.py
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
EVAL = pathlib.Path(__file__).resolve().parent
MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"

HOLDOUT_FRACTION = 0.20
SPLIT_SEED = 26104


def compute_eer(real_scores: np.ndarray, fake_scores: np.ndarray):
    """EER and its threshold, scores oriented so higher = more bona-fide."""
    thresholds = np.unique(np.concatenate([real_scores, fake_scores]))
    thresholds = np.concatenate([[-np.inf], thresholds, [np.inf]])

    best = None
    for t in thresholds:
        frr = float(np.mean(real_scores < t))
        far = float(np.mean(fake_scores >= t))
        gap = abs(far - frr)
        if best is None or gap < best[0]:
            best = (gap, float((far + frr) / 2.0), float(t), far, frr)
    _, eer, threshold, far, frr = best
    return eer, threshold, far, frr


def auc_real_over_fake(real_scores: np.ndarray, fake_scores: np.ndarray) -> float:
    wins = sum(float(a) > float(b) for a in real_scores for b in fake_scores)
    ties = sum(float(a) == float(b) for a in real_scores for b in fake_scores)
    return (wins + 0.5 * ties) / (len(real_scores) * len(fake_scores))


def load_manifests():
    clips = []
    for name in ("hindi_real.json", "hindi_xtts.json"):
        path = EVAL / name
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return None
        clips.extend(json.loads(path.read_text(encoding="utf-8"))["clips"])
    return clips


def assign_splits(clips):
    """Hold out 20% of PAIRS, keeping each clone with its source clip."""
    pair_keys = sorted({c.get("pairs_with") or c["id"] for c in clips})
    rng = np.random.default_rng(SPLIT_SEED)
    shuffled = list(pair_keys)
    rng.shuffle(shuffled)
    n_holdout = max(1, int(round(len(shuffled) * HOLDOUT_FRACTION)))
    holdout = set(shuffled[:n_holdout])
    for c in clips:
        key = c.get("pairs_with") or c["id"]
        c["split"] = "holdout" if key in holdout else "train"
    return holdout


def main() -> int:
    clips = load_manifests()
    if not clips:
        print("run build_hindi_real.py and build_hindi_clones.py first", file=sys.stderr)
        return 1

    holdout = assign_splits(clips)
    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name

    print(f"model : {MODEL.name}")
    print(f"clips : {len(clips)} total, {len(holdout)} pairs held out "
          f"({HOLDOUT_FRACTION:.0%}, seed {SPLIT_SEED})")

    for clip in clips:
        window = load_window(str(ROOT / clip["path"]), normalise=False)
        assert window.shape == (WINDOW_SAMPLES,), window.shape
        logits = session.run(None, {name: window[None, :]})[0][0]
        clip["l0"] = float(logits[0])
        clip["l1"] = float(logits[1])
        clip["risk"] = int(round((1.0 - 1.0 / (1.0 + np.exp(-float(logits[1])))) * 100))

    results = {}
    for split in ("holdout", "train", "all"):
        subset = clips if split == "all" else [c for c in clips if c["split"] == split]
        real = np.array([c["l1"] for c in subset if c["label"] == "real"])
        fake = np.array([c["l1"] for c in subset if c["label"] == "fake"])
        if len(real) == 0 or len(fake) == 0:
            continue

        eer, threshold, far, frr = compute_eer(real, fake)
        auc = auc_real_over_fake(real, fake)
        results[split] = {
            "n_real": int(len(real)), "n_fake": int(len(fake)),
            "eer": eer, "eer_threshold": threshold, "far": far, "frr": frr,
            "auc": auc,
            "real_median_l1": float(np.median(real)),
            "fake_median_l1": float(np.median(fake)),
            "real_median_risk": float(np.median(
                [c["risk"] for c in subset if c["label"] == "real"])),
            "fake_median_risk": float(np.median(
                [c["risk"] for c in subset if c["label"] == "fake"])),
        }

        print(f"\n{'=' * 66}\n{split.upper()}  ({len(real)} real, {len(fake)} fake)\n{'=' * 66}")
        print(f"  EER                 {eer * 100:6.2f} %   (threshold {threshold:+.4f})")
        print(f"  AUC                 {auc:6.3f}")
        print(f"  median logits[1]    real {np.median(real):+8.4f}   "
              f"fake {np.median(fake):+8.4f}")
        print(f"  median risk         real {results[split]['real_median_risk']:6.1f}   "
              f"fake {results[split]['fake_median_risk']:6.1f}")

        # What the shipped thresholds would actually do on this data.
        raised = sum(1 for c in subset if c["label"] == "real" and c["risk"] >= 75)
        missed = sum(1 for c in subset if c["label"] == "fake" and c["risk"] < 75)
        n_r = sum(1 for c in subset if c["label"] == "real")
        n_f = sum(1 for c in subset if c["label"] == "fake")
        print(f"  at CONTRACTS.md raise threshold 75:")
        print(f"    false alarms on real  {raised}/{n_r} ({raised / n_r:.0%})")
        print(f"    clones missed         {missed}/{n_f} ({missed / n_f:.0%})")

    (EVAL / "baseline_eer.json").write_text(
        json.dumps({"results": results, "clips": clips}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nwrote {EVAL / 'baseline_eer.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
