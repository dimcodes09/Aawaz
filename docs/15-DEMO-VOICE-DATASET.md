# 15 - Demo Voice Dataset (Human vs XTTS-v2)

A small, reproducible human/AI voice-pair set for the Aawaz judge demo. Three
genuine human utterances and three XTTS-v2 clones **of the same sentences**,
scored with the existing RawTFNet-32 pipeline.

Everything here is regenerable from the scripts in `ml/data/`. No audio was
hand-edited.

## 1. Human source: LibriSpeech dev-clean

- **Source:** <https://www.openslr.org/12> - LibriSpeech ASR corpus, `dev-clean.tar.gz` (337 MB)
- **License:** CC BY 4.0 - LibriSpeech (c) 2014 Vassil Panayotov; Panayotov et al., ICASSP 2015
- **Why this subset:** `dev-clean` is the smallest *clean* official subset (40
  speakers, 2,703 utterances) and ships per-utterance transcripts alongside the
  audio, so human/AI text matching is exact rather than transcribed. The full
  ~1000-hour corpus was **not** downloaded.

The repository already contained LibriSpeech-derived clips, but every one of them
was **speaker 1272** (from the HuggingFace `librispeech_asr_dummy` subset). That
cannot satisfy "different speakers", which is why real `dev-clean` was fetched.

**Selection filters:** 6-10 s duration, 12-28 words, no numerals (digits invite
normalisation mismatches between a human reading and XTTS), one utterance per
speaker. Originals are copied verbatim - no trimming, no gating, no gain change,
and **leading silence is preserved deliberately**.

## 2. AI source: XTTS-v2

- **Model:** `tts_models/multilingual/multi-dataset/xtts_v2` (Coqui TTS 0.27.5), language `en`
- **Method:** each human clip is the **speaker reference**, and XTTS re-speaks
  that clip's **exact transcript**.

That construction is the point: identical words, identical speaker identity, same
chain into the detector. The only variable left is provenance - one was spoken by
a person, one was synthesised. A detector cannot separate them on content or on
speaker identity.

Ground truth is by construction, not by labelling: every "AI" file was produced
locally by XTTS-v2 on 2026-09-11. No internet-sourced AI voices were used.

**Environment issues** (carried over from `ml/eval/build_hindi_clones.py`, which
established these on this machine - nothing was upgraded):

- Coqui gates the XTTS weights behind a licence prompt, so `COQUI_TOS_AGREED=1`
  keeps a non-interactive run from hanging on stdin.
- `torchaudio >= 2.9` routes audio I/O through torchcodec, which needs FFmpeg
  **shared** libraries; this machine has a static ffmpeg, so `torchaudio.load`
  fails on every reference clip. XTTS only uses it to read the speaker reference,
  so it is redirected to `soundfile`.
- Versions in use: torch 2.14.0+cpu, torchaudio 2.11.0+cpu, TTS 0.27.5,
  transformers 4.57.1, onnxruntime 1.29.0. **Nothing was installed or upgraded.**

## 3. Preprocessing

Originals are kept separately from the detector copies.

| File | Purpose |
|---|---|
| `human_original.wav` | LibriSpeech FLAC decoded to WAV, otherwise verbatim (16 kHz) |
| `ai_xtts_original.wav` | Raw XTTS-v2 output at its native 24 kHz |
| `human.wav`, `ai_xtts.wav` | Detector copies: **16 kHz mono PCM16** |
| `transcript.txt` | One transcript, shared by both sides of the pair |

Detector copies are resampled (`scipy.resample_poly`) and mixed to mono only.
Peak limiting applies **only** if a file would otherwise clip; none of the six
needed it. No silence removal, no VAD, no loudness normalisation.

## 4. RawTFNet-32 scoring

Scored through the existing contract. The model was not modified and no threshold
was changed:

- Preprocessing: `ml/eval/preprocess.py` - 16 kHz mono float32 in [-1, 1],
  **64,600 samples, head crop**
- Head crop means the scored window is the **first 4.0375 s**, leading silence
  intact - the same `ScoreMode.FIRST_WINDOW` method the validated Android demo uses
- `risk = round((1 - sigmoid(logits[1])) * 100)`, index 1 = bona-fide
- Gate: human < 45 **and** AI >= 75

No streaming, no mid-file windows, no VAD, no padding tricks. See
`docs/00-ANDROID-AUDIO-FEASIBILITY.md` for why this checkpoint is only
trustworthy in the first-window condition.

## 5. Final scores

| Pair | Speaker | Utterance | Human risk | AI risk | Gap | Duration (H / AI) |
|---|---|---|---|---|---|---|
| `pair_01` | 1272 | `1272-141231-0001` | **0** (OK) | **100** (HIGH) | 100 | 6.54s / 5.94s |
| `pair_02` | 2035 | `2035-152373-0010` | **0** (OK) | **97** (HIGH) | 97 | 7.60s / 8.63s |
| `pair_03` | 2078 | `2078-142845-0019` | **0** (OK) | **98** (HIGH) | 98 | 9.40s / 6.77s |

**3/3 pairs pass**, with a separation of 97-100 points.

### Transcripts

**pair_01** (speaker 1272)

> SWEAT COVERED BRION'S BODY TRICKLING INTO THE TIGHT LOINCLOTH THAT WAS THE ONLY GARMENT HE WORE

**pair_02** (speaker 2035)

> THE KINGDOM OF NORTHUMBRIA AS THE NAME IMPLIES EMBRACED NEARLY ALL THE COUNTRY FROM THE HUMBER TO THE PICTISH BORDER

**pair_03** (speaker 2078)

> SOME OF THE PREPARATIONS OF MAIZE FLOUR ARE VERY GOOD AND WHEN PARTAKEN IN MODERATION SUITABLE FOOD FOR ALMOST EVERYBODY

## 6. Rejected samples, and the honest caveat

The first three utterances selected - chosen only on duration, word count and a
quiet opening - produced **1/3 passing**:

| Pair | Speaker | Human risk | AI risk | Verdict |
|---|---|---|---|---|
| pair_01 | 84 | 79 | 99 | rejected - genuine speech flagged HIGH |
| pair_02 | 251 | 95 | 98 | rejected - genuine speech flagged HIGH |
| pair_03 | 3853 | 7 | 99 | passed |

The AI side was never the problem: it scored 98-99 every time. The human side was.

So the humans were **pre-screened with the detector** before spending XTTS time
(`ml/data/prescreen_humans.py`: ~50 ms to score a candidate versus ~40 s to clone
one). That screen scored **200 genuine dev-clean utterances across 40 speakers**:

- median human risk: **41**
- correctly below 45: **52%**
- **false-alarmed at >= 75: 39%**

**Roughly two in five genuine human utterances are called synthetic by this
checkpoint, even in its best-case first-window condition.** The three demo pairs
are drawn from the subset it handles correctly. That selection is disclosed here
rather than hidden, and the full screen is committed in
`ml/data/demo_voice/_prescreen.json` so the claim is checkable.

## 7. Limitations - read before presenting

- **This does not demonstrate general real-time detection.** It is a controlled,
  reproducible demonstration on validated samples, in the one condition where the
  checkpoint behaves.
- **The pairs are selected, not representative.** The 39% false-alarm rate
  above is the honest population figure.
- **First-window only.** Streamed audio has no file-start leading silence, and the
  checkpoint pins near 99 on essentially everything in that regime - measured on
  device with live microphone input.
- **One TTS engine, one language.** XTTS-v2, English. Nothing here generalises to
  other synthesisers, languages or codecs.
- **Clean read speech.** LibriSpeech is studio-quality audiobook narration - not
  telephony, not noisy, not codec-compressed.

## 8. Reproducing

```bash
curl -L -o ml/data/_raw/dev-clean.tar.gz https://www.openslr.org/resources/12/dev-clean.tar.gz
tar -xzf ml/data/_raw/dev-clean.tar.gz -C ml/data/_raw
python ml/data/prescreen_humans.py --candidates 200 --need 3
python ml/data/build_demo_voice_pairs.py
python ml/data/validate_pairs.py
python ml/data/score_pairs.py
```

`ml/data/select_human_utterances.py` is the naive (non-screened) selector, kept
for reference - it is what produced the rejected set in section 6.

Large data stays out of Git: `ml/data/_raw/` (672 MB extracted) and all generated
WAVs are gitignored. Only manifests, scores and scripts are committed.
