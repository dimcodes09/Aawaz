"""
The critical test: does the pretrained RawTFNet catch XTTS-v2?

The polarity gate was passed against edge-tts, which is conventional neural TTS.
The demo uses XTTS-v2, which is neural-codec TTS — the class the vendor README
explicitly marks "does not generalize" (CD-ADD 52.85 % EER, CVoiceFake_small
54.94 %, SONAR 55.85 %). If the pretrained model is near chance on XTTS-v2, the
live demo cannot rest on it.

Four conditions are measured:
  1. real vs XTTS-v2, clean
  2. real vs XTTS-v2, after an Opus 24 kbps round-trip (the Mode A channel)
  3. real vs edge-tts, clean (the existing baseline, for comparison)
  4. count of XTTS-v2 clips scoring below risk 50 (false negatives)

The Opus round-trip is applied to BOTH classes, because the detector will see
every call through that codec, not just the spoofed side. Applying it to one
class only would manufacture a codec artefact the model could cheat on.

    ffmpeg -i in.wav  -c:a libopus -b:a 24k -ar 48000 tmp.opus
    ffmpeg -i tmp.opus -ar 16000 -ac 1 out.wav

Run:  python ml/eval/xtts_spotcheck.py
"""

from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys

import numpy as np
import onnxruntime as ort

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from preprocess import WINDOW_SAMPLES, load_window  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
EVAL = pathlib.Path(__file__).resolve().parent
MODEL = ROOT / "ml" / "export" / "rawtfnet32_b1.onnx"
OPUS_DIR = EVAL / "data" / "opus"

N = 10
RISK_FN_THRESHOLD = 50


def ffmpeg_bin() -> str:
    found = shutil.which("ffmpeg") or shutil.which(
        "ffmpeg", path=str(pathlib.Path.home() / "scoop" / "shims")
    )
    if not found:
        raise RuntimeError("ffmpeg not on PATH")
    return found


def opus_roundtrip(src: pathlib.Path, dst: pathlib.Path) -> pathlib.Path:
    """Encode to Opus 24 kbps @ 48 kHz, decode back to 16 kHz mono WAV."""
    if dst.exists() and dst.stat().st_size > 1000:
        return dst
    ff = ffmpeg_bin()
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(".opus")
    for cmd in (
        [ff, "-y", "-loglevel", "error", "-i", str(src),
         "-c:a", "libopus", "-b:a", "24k", "-ar", "48000", str(tmp)],
        [ff, "-y", "-loglevel", "error", "-i", str(tmp),
         "-ar", "16000", "-ac", "1", str(dst)],
    ):
        subprocess.run(cmd, check=True, capture_output=True)
    tmp.unlink(missing_ok=True)
    return dst


def sigmoid(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-x)))


def risk_of(l1: float) -> int:
    return int(round((1.0 - sigmoid(l1)) * 100))


def auc(real: np.ndarray, fake: np.ndarray) -> float:
    wins = sum(float(a) > float(b) for a in real for b in fake)
    ties = sum(float(a) == float(b) for a in real for b in fake)
    return (wins + 0.5 * ties) / (len(real) * len(fake))


def eer(real: np.ndarray, fake: np.ndarray) -> float:
    thresholds = np.concatenate([[-np.inf], np.unique(np.concatenate([real, fake])), [np.inf]])
    best = None
    for t in thresholds:
        frr = float(np.mean(real < t))
        far = float(np.mean(fake >= t))
        gap = abs(far - frr)
        if best is None or gap < best[0]:
            best = (gap, (far + frr) / 2.0)
    return best[1]


def score(session, paths):
    name = session.get_inputs()[0].name
    out = []
    for p in paths:
        window = load_window(str(p), normalise=False)
        assert window.shape == (WINDOW_SAMPLES,), window.shape
        logits = session.run(None, {name: window[None, :]})[0][0]
        out.append(float(logits[1]))
    return np.array(out)


def main() -> int:
    real_manifest = EVAL / "hindi_real.json"
    xtts_manifest = EVAL / "hindi_xtts.json"
    edge_manifest = EVAL / "manifest.json"
    for m in (real_manifest, xtts_manifest, edge_manifest):
        if not m.exists():
            print(f"missing {m}", file=sys.stderr)
            return 1

    all_real = json.loads(real_manifest.read_text(encoding="utf-8"))["clips"]
    all_xtts = json.loads(xtts_manifest.read_text(encoding="utf-8"))["clips"]
    edge = json.loads(edge_manifest.read_text(encoding="utf-8"))["clips"]
    edge_real = [c for c in edge if c["label"] == "real"][:N]
    edge_fake = [c for c in edge if c["label"] == "fake"][:N]

    # Pair by `pairs_with`, not by position: XTTS fails on the odd transcript,
    # so clone indices are not dense and positional zipping would silently
    # compare a clone against the wrong speaker's real clip.
    real_by_id = {c["id"]: c for c in all_real}
    pairs = [(real_by_id[c["pairs_with"]], c)
             for c in all_xtts if c.get("pairs_with") in real_by_id][:N]

    if len(pairs) < N:
        print(f"only {len(pairs)} real/XTTS pairs available, need {N}", file=sys.stderr)
        return 1

    real_clips = [p[0] for p in pairs]
    xtts_clips = [p[1] for p in pairs]
    real_paths = [ROOT / c["path"] for c in real_clips]
    xtts_paths = [ROOT / c["path"] for c in xtts_clips]
    print("pairs: " + ", ".join(f"{r['id']}~{x['id']}" for r, x in pairs))

    print("applying Opus 24k round-trip to both classes...")
    real_opus = [opus_roundtrip(p, OPUS_DIR / f"real_{i:02d}.wav")
                 for i, p in enumerate(real_paths)]
    xtts_opus = [opus_roundtrip(p, OPUS_DIR / f"xtts_{i:02d}.wav")
                 for i, p in enumerate(xtts_paths)]

    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])

    conditions = {
        "1. real vs XTTS-v2, clean": (
            score(session, real_paths), score(session, xtts_paths)),
        "2. real vs XTTS-v2, Opus 24k": (
            score(session, real_opus), score(session, xtts_opus)),
        "3. real vs edge-tts, clean": (
            score(session, [ROOT / c["path"] for c in edge_real]),
            score(session, [ROOT / c["path"] for c in edge_fake])),
    }

    print(f"\n{'=' * 86}")
    print(f"{'condition':<32} {'med risk real':>13} {'med risk fake':>13} "
          f"{'AUC':>7} {'EER %':>7} {'FN<50':>7}")
    print("=" * 86)

    results = {}
    for label, (real_scores, fake_scores) in conditions.items():
        real_risk = np.array([risk_of(x) for x in real_scores])
        fake_risk = np.array([risk_of(x) for x in fake_scores])
        a = auc(real_scores, fake_scores)
        e = eer(real_scores, fake_scores)
        fn = int((fake_risk < RISK_FN_THRESHOLD).sum())
        results[label] = {
            "median_risk_real": float(np.median(real_risk)),
            "median_risk_fake": float(np.median(fake_risk)),
            "auc": a, "eer": e,
            "false_negatives_below_50": fn, "n_fake": len(fake_risk),
            "real_l1": real_scores.tolist(), "fake_l1": fake_scores.tolist(),
            "real_risk": real_risk.tolist(), "fake_risk": fake_risk.tolist(),
        }
        print(f"{label:<32} {np.median(real_risk):>13.1f} {np.median(fake_risk):>13.1f} "
              f"{a:>7.3f} {e * 100:>7.2f} {fn:>4}/{len(fake_risk)}")

    xtts_clean = results["1. real vs XTTS-v2, clean"]
    xtts_opus_r = results["2. real vs XTTS-v2, Opus 24k"]

    print(f"\n{'=' * 86}\nPER-CLIP RISK\n{'=' * 86}")
    print(f"{'i':>3}  {'real clean':>10} {'XTTS clean':>10} "
          f"{'real opus':>10} {'XTTS opus':>10}")
    for i in range(N):
        print(f"{i:>3}  {xtts_clean['real_risk'][i]:>10} {xtts_clean['fake_risk'][i]:>10} "
              f"{xtts_opus_r['real_risk'][i]:>10} {xtts_opus_r['fake_risk'][i]:>10}")

    print(f"\n{'=' * 86}\nGATE: AUC >= 0.85 on XTTS-v2\n{'=' * 86}")
    for key, label in (("1. real vs XTTS-v2, clean", "clean"),
                       ("2. real vs XTTS-v2, Opus 24k", "Opus 24k")):
        a = results[key]["auc"]
        print(f"  XTTS-v2 {label:<10} AUC {a:.3f}  ->  "
              f"{'PASS, ships today' if a >= 0.85 else 'FAIL, fine-tuning MANDATORY'}")

    (EVAL / "xtts_spotcheck.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nwrote {EVAL / 'xtts_spotcheck.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
