# 11 — RawTFNet polarity check

Track 3, step 1. **GATE: PASS.** The `docs/CONTRACTS.md` risk formula is correct
as written. Do not invert it.

Model: `ml/export/rawtfnet32_b1.onnx`. Scripts: `ml/eval/`.

## Verdict

**Index 1 is genuinely the bona-fide logit.** Real speech scores near-zero risk,
synthetic speech scores near-100. The formula

```
risk = round((1 - sigmoid(logits[1])) * 100)
```

is right. Had the polarity been inverted, real callers would have been flagged
as clones and clones waved through.

| | real | fake |
|---|---|---|
| median risk | **1.0** | **95.5** |
| median `logits[1]` | +4.5187 | −3.1496 |
| `argmax == 1` | 10/10 | 1/10 |

Risk gap (fake − real): **+94.5**. AUC of `logits[1]` ranking real above fake:
**0.990**.

## Method

10 genuine human clips and 10 synthetic clips **of the same transcripts**.
Matching the text on both sides removes linguistic content as a confound, so the
separation measured is about voice provenance and nothing else.

- **Real**: LibriSpeech dev-clean, via the public HF datasets-server (no auth).
  10 distinct utterances, native 16 kHz.
- **Synthetic**: edge-tts neural voices, one distinct voice per clip
  (`en-US-AriaNeural`, `en-GB-RyanNeural`, `en-AU-NatashaNeural`, … 10 in all),
  24 kHz mp3 resampled to 16 kHz.

Mozilla Common Voice Hindi was the intended real-speech source but is **gated**:
the datasets-server returns HTTP 401 for `mozilla-foundation/common_voice_11_0`.
That blocks step 2, not this check — step 1 only needs genuine human speech.

## Results — raw float, no amplitude normalisation

| clip | true label | logits[0] | logits[1] | risk | argmax |
|---|---|---|---|---|---|
| real_00 | real | −4.2504 | 4.9551 | 1 | 1 |
| real_01 | real | −4.0522 | 4.7985 | 1 | 1 |
| real_02 | real | −4.1675 | 4.9324 | 1 | 1 |
| real_03 | real | −3.6805 | 4.3384 | 1 | 1 |
| real_04 | real | −3.3202 | 3.9939 | 2 | 1 |
| real_05 | real | −3.9051 | 4.6123 | 1 | 1 |
| real_06 | real | −2.9332 | 3.4764 | 3 | 1 |
| real_07 | real | −3.7508 | 4.4252 | 1 | 1 |
| real_08 | real | −1.9319 | 2.3254 | 9 | 1 |
| real_09 | real | −4.0593 | 4.7730 | 1 | 1 |
| fake_00 | fake | 4.8460 | −4.1454 | 98 | 0 |
| fake_01 | fake | 3.5761 | −2.9558 | 95 | 0 |
| fake_02 | fake | 3.9721 | −3.2827 | 96 | 0 |
| fake_03 | fake | 0.9183 | −0.7086 | 67 | 0 |
| fake_04 | fake | 5.6932 | −4.6622 | 99 | 0 |
| fake_05 | fake | 3.5218 | −2.7114 | 94 | 0 |
| fake_06 | fake | 5.9077 | −5.7342 | 100 | 0 |
| fake_07 | fake | 3.3426 | −3.0166 | 95 | 0 |
| **fake_08** | **fake** | **−2.7596** | **3.3397** | **3** | **1** |
| fake_09 | fake | 4.9055 | −4.6116 | 99 | 0 |

**19/20 correct. One miss: `fake_08` (`en-CA-LiamNeural`), risk 3** — a confident
false negative, scored as real as any genuine clip. Recorded, not smoothed over;
see Caveats.

## Stability across the unverified normalisation assumption

The check was run twice because amplitude normalisation could not be verified
(see below). A conclusion that flipped between the two would not be a conclusion.

| | raw float | peak-normalised |
|---|---|---|
| risk gap (fake − real) | +94.5 | +93.0 |
| AUC | 0.990 | 0.990 |
| real median risk | 1.0 | 1.0 |
| fake median risk | 95.5 | 94.0 |

**Stable.** The polarity finding does not depend on the assumption.

Peak normalisation slightly *weakens* the fakes: `fake_03` moves 67 → 36 and
`fake_07` 95 → 82, while `fake_08` stays wrong. Weak evidence for raw float
being the intended path, not proof.

## Preprocessing — provenance warning

The task said "preprocess exactly as `trt_rawtfnet.py` specifies". **That file
does not exist in this repository.** `ml/vendor/rawtfnet/` is empty and there is
no `trt_rawtfnet.py` anywhere in the tree. Nothing in `ml/eval/preprocess.py` is
copied from it. What was used:

| Parameter | Value | Provenance |
|---|---|---|
| Sample rate | 16 kHz mono | **Contract** — `docs/CONTRACTS.md` |
| Range | float32 [−1, 1] | **Contract** |
| Window | 64600 samples (4.0375 s) | **Contract** + ONNX input shape |
| Long clips | head crop `x[:64600]` | **Assumed** — ASVspoof family convention |
| Short clips | tile-repeat then crop | **Assumed** — ASVspoof family convention |
| Amplitude normalisation | none by default | **Assumed**; both settings tested |

64600 is the ASVspoof2019/2021 constant, and the RawNet2 / AASIST / RawGAT-ST
family RawTFNet belongs to all ship the same `pad()`:

```python
def pad(x, max_len=64600):
    if x.shape[0] >= max_len:
        return x[:max_len]
    num_repeats = int(max_len / x.shape[0]) + 1
    return np.tile(x, (1, num_repeats))[:, :max_len][0]
```

That is what is implemented. **Re-check it when `trt_rawtfnet.py` lands.**

## Caveats — what this result does and does not license

This is a 20-clip polarity check, not a benchmark. It establishes the sign of
the decision, nothing about accuracy.

1. **English, not Hindi.** Both sides are English. The Hindi/Hinglish target
   domain is untested.
2. **edge-tts is not the threat model.** Microsoft neural TTS is a generic
   speaker. Real voice-clone attacks use XTTS-v2 / F5-TTS targeting a specific
   person, which is a much harder problem. Expect step 3's EER to be far worse
   than 0.990 AUC suggests — that is anticipated and is the honest number.
3. **`fake_08` already shows the failure mode**: 1 in 10 synthetic clips passed
   as human with high confidence, on the *easy* attack class.
4. LibriSpeech is clean read speech; ASVspoof-trained models see it as
   in-distribution. Telephone-band audio through the Mode A WebRTC path will not
   be.

## Reproduce

```bash
python ml/eval/build_polarity_set.py   # fetches 10 real, synthesises 10 fake
python ml/eval/polarity_check.py       # scores all 20, both normalisations
```

Raw numbers: `ml/eval/polarity_results.json`. Clip inventory:
`ml/eval/manifest.json`.
