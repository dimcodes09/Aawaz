"""
Build the 20-clip polarity check set.

10 genuine human clips (LibriSpeech dev-clean via the public HF datasets-server,
no auth) and 10 synthetic clips produced with edge-tts from *the same
transcripts*. Matching the text on both sides removes linguistic content as a
confound, so any separation the model shows is about voice provenance.

Mozilla Common Voice Hindi was the intended source but is gated behind
authentication (HTTP 401 from the datasets-server), so it cannot be used here.
That is a step-2 problem; this step only needs genuine human speech.

Output: ml/eval/data/real/*.flac, ml/eval/data/fake/*.mp3, manifest.json
"""

from __future__ import annotations

import asyncio
import json
import pathlib
import sys

import requests

ROOT = pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"
REAL = DATA / "real"
FAKE = DATA / "fake"

N_CLIPS = 10
ROWS_URL = "https://datasets-server.huggingface.co/rows"

# Distinct voices so the synthetic side is not one speaker repeated.
VOICES = [
    "en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural",
    "en-GB-RyanNeural", "en-AU-NatashaNeural", "en-US-JennyNeural",
    "en-US-EricNeural", "en-IE-EmilyNeural", "en-CA-LiamNeural",
    "en-IN-NeerjaNeural",
]


def fetch_real() -> list[dict]:
    REAL.mkdir(parents=True, exist_ok=True)
    response = requests.get(
        ROWS_URL,
        params={
            "dataset": "hf-internal-testing/librispeech_asr_dummy",
            "config": "clean",
            "split": "validation",
            "offset": 0,
            "length": N_CLIPS,
        },
        timeout=60,
    )
    response.raise_for_status()

    entries = []
    for i, row in enumerate(response.json()["rows"][:N_CLIPS]):
        record = row["row"]
        src = record["audio"][0]["src"]
        dest = REAL / f"real_{i:02d}.flac"
        dest.write_bytes(requests.get(src, timeout=120).content)
        entries.append({
            "id": f"real_{i:02d}",
            "path": str(dest.relative_to(ROOT.parent.parent)),
            "label": "real",
            "text": record["text"],
            "speaker_id": record.get("speaker_id"),
        })
        print(f"  real_{i:02d}  {dest.stat().st_size:>8} B  {record['text'][:52]}")
    return entries


async def synth_one(text: str, voice: str, dest: pathlib.Path) -> None:
    import edge_tts
    await edge_tts.Communicate(text, voice).save(str(dest))


def fetch_fake(real_entries: list[dict]) -> list[dict]:
    FAKE.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, source in enumerate(real_entries):
        voice = VOICES[i % len(VOICES)]
        dest = FAKE / f"fake_{i:02d}.mp3"
        # Title-case the LibriSpeech transcript; it is stored fully upper-cased
        # and some TTS voices spell out all-caps text letter by letter.
        text = source["text"].capitalize()
        asyncio.run(synth_one(text, voice, dest))
        entries.append({
            "id": f"fake_{i:02d}",
            "path": str(dest.relative_to(ROOT.parent.parent)),
            "label": "fake",
            "text": text,
            "voice": voice,
            "pairs_with": source["id"],
        })
        print(f"  fake_{i:02d}  {dest.stat().st_size:>8} B  {voice}")
    return entries


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    print("fetching genuine human clips (LibriSpeech dev-clean):")
    real = fetch_real()
    print("\nsynthesising matched clips (edge-tts neural voices):")
    fake = fetch_fake(real)

    manifest = ROOT / "manifest.json"
    manifest.write_text(json.dumps({"clips": real + fake}, indent=2))
    print(f"\nwrote {manifest} ({len(real)} real + {len(fake)} fake)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
