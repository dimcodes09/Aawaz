"""
Extract the real half of the Hindi evaluation corpus from FLEURS hi_in.

Source: google/fleurs, config hi_in, split test. Public, no auth, real human
Hindi speech at 16 kHz. This replaces Mozilla Common Voice Hindi, which is gated
(HTTP 401 from the HF datasets-server for mozilla-foundation/common_voice_*).

Clips are written as 16 kHz mono WAV at full length. They are *not* cropped to
64600 samples here: the anti-spoof window is applied at scoring time by
ml/eval/preprocess.py, and XTTS-v2 wants a longer reference than 4 s for voice
cloning. Clips shorter than MIN_SECONDS are skipped so the clone reference has
enough material to work with.

Output: ml/eval/data/hindi_real/*.wav + hindi_real.json
"""

from __future__ import annotations

import io
import json
import pathlib
import sys

import numpy as np
import pyarrow.parquet as pq
import soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parent
PARQUET = ROOT / "data" / "fleurs" / "hi_in_test.parquet"
OUT_DIR = ROOT / "data" / "hindi_real"
MANIFEST = ROOT / "hindi_real.json"

N_CLIPS = 300
TARGET_SR = 16000
MIN_SECONDS = 5.0     # XTTS-v2 reference audio; shorter clones badly
MAX_SECONDS = 20.0    # skip outliers, they only slow synthesis down


def main() -> int:
    if not PARQUET.exists():
        print(f"missing {PARQUET}; run the FLEURS download first", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    table = pq.read_table(PARQUET)
    print(f"parquet rows: {table.num_rows}")
    print(f"columns: {table.column_names}")

    cols = set(table.column_names)
    text_col = "transcription" if "transcription" in cols else "raw_transcription"
    has_gender = "gender" in cols
    has_speaker = "speaker_id" in cols

    entries = []
    skipped_short = skipped_long = 0

    for i in range(table.num_rows):
        if len(entries) >= N_CLIPS:
            break
        row = {name: table.column(name)[i].as_py() for name in table.column_names}

        audio = row["audio"]
        raw = audio["bytes"] if isinstance(audio, dict) else audio
        if raw is None:
            continue

        x, sr = sf.read(io.BytesIO(raw), dtype="float32", always_2d=False)
        if x.ndim > 1:
            x = x.mean(axis=1)
        duration = len(x) / sr
        if duration < MIN_SECONDS:
            skipped_short += 1
            continue
        if duration > MAX_SECONDS:
            skipped_long += 1
            continue

        if sr != TARGET_SR:
            from math import gcd
            from scipy.signal import resample_poly
            g = gcd(int(sr), TARGET_SR)
            x = resample_poly(x, TARGET_SR // g, sr // g).astype(np.float32)

        clip_id = f"hreal_{len(entries):03d}"
        dest = OUT_DIR / f"{clip_id}.wav"
        sf.write(dest, x, TARGET_SR, subtype="PCM_16")

        entries.append({
            "id": clip_id,
            "path": str(dest.relative_to(ROOT.parents[1])).replace("\\", "/"),
            "label": "real",
            "text": row.get(text_col, ""),
            "duration_s": round(float(len(x) / TARGET_SR), 2),
            "gender": row.get("gender") if has_gender else None,
            "speaker_id": row.get("speaker_id") if has_speaker else None,
            "source_id": row.get("id"),
        })
        if len(entries) % 50 == 0:
            print(f"  {len(entries)} clips written")

    MANIFEST.write_text(json.dumps({"clips": entries}, indent=2, ensure_ascii=False),
                        encoding="utf-8")

    total = sum(e["duration_s"] for e in entries)
    print(f"\nwrote {len(entries)} real Hindi clips to {OUT_DIR}")
    print(f"  skipped: {skipped_short} under {MIN_SECONDS}s, "
          f"{skipped_long} over {MAX_SECONDS}s")
    print(f"  total audio: {total / 60:.1f} min, mean {total / max(len(entries), 1):.1f}s")
    print(f"  manifest: {MANIFEST}")
    return 0 if entries else 1


if __name__ == "__main__":
    sys.exit(main())
