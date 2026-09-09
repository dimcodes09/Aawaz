# 05 — ML Pipeline

## 1. The problem nobody else will name

The published AASIST checkpoint scores approximately **0.83 % EER on ASVspoof
2019 LA** (in-domain) but around **43 % EER on the In-the-Wild dataset** — close
to a coin toss on realistic audio. Detection is *not* a solved problem, and the
generalisation gap **is** our research contribution.

Any team presenting a single "99 % accuracy" number either has not evaluated
out-of-domain or is hiding it. Our accuracy slide shows the gap and then shows
we narrowed it.

## 2. Model — RawTFNet-32 (LOCKED)

### Verified facts (from the published model cards)

| Model | Params | MACs | 2019 LA | 2021 LA | 2021 DF | In-the-Wild | Licence |
|---|---|---|---|---|---|---|---|
| AASIST | 0.30 M | 8.9 G | **0.83 %** | 12.35 % | 17.04 % | 43.01 % | MIT |
| AASIST-L | 0.085 M | — | 0.99 % | 13.15 % | 15.96 % | 44.45 % | MIT |
| **RawTFNet-32** | **0.178 M** | **5.4 G** | 1.99 % | **8.03 %** | **15.16 %** | **38.51 %** | MIT |

**Correction:** the only released RawTFNet checkpoint is `Best_RawTFNet_32.pth`
(177,540 params). The 0.07 M "RawTFNet-16" figure appears in the paper but has
no public weights. All benchmark numbers above belong to the **-32** variant.

### 🔴 The finding that matters most

The RawTFNet model card reports these additional out-of-domain results, with its
own annotations:

| Dataset | EER | Card's note |
|---|---|---|
| CD-ADD (modern neural TTS) | 52.85 % | **"does not generalize"** |
| SONAR (multilingual TTS/VC) | 55.85 % | **"does not generalize"** |
| CVoiceFake (neural-codec TTS) | 54.94 % | **"does not generalize"** |
| ASVspoof5 | 45.07 % | **"does not generalize"** |
| DeepVoice | 50.16 % | — |

**Worse than chance on modern neural-TTS.** AASIST is equivalent (51.05 % on
CD-ADD). This is a field-wide limitation, not a RawTFNet defect.

**Consequence: XTTS-v2 and F5-TTS are exactly this class of model.** A pretrained
checkpoint of either architecture will very likely FAIL to detect a live clone on
stage. Fine-tuning on our own modern-TTS clones is therefore **load-bearing, not
a novelty bonus.** It moves to week 2.

### Known integration risks

| # | Risk | Which model | Mitigation |
|---|---|---|---|
| 1 | Fails on modern TTS out of the box | Both | Fine-tune on own clones — week 2 |
| 2 | **Fixed 64,600-sample (4.04 s) input** — breaks any sub-second window design | Both | 4 s window, **1 s hop** (not 0.25 s) |
| 3 | ONNX export: channel shuffle, adaptive residual norm, depthwise-separable convs are the ops that most often break export or quantise badly | **RawTFNet** | Export in week 2; AASIST-L is the fallback |
| 4 | Newer paper, one maintainer, low download count | **RawTFNet** | **Vendor `_net.py` + `rawtfnet.py` into our repo** — do not depend on the Hub |
| 5 | 5.4 GMACs is heavy for a 4 GB phone | Both (AASIST worse) | int8 + larger hop; measure on real hardware week 2 |

### Week 2 validation checklist (the model is chosen; these must still pass)

1. ONNX export, opset 17 → int8 dynamic quantisation
2. Parity check: 500 clips, PyTorch vs int8 ONNX, EER drift must be <1 point
3. Latency on a real 4 GB device with XNNPACK execution provider
4. **EER on our own XTTS-v2 / F5-TTS Hindi clones** — the demo-critical metric

Vendor `_net.py` and `rawtfnet.py` into the repo on day 1 (MIT permits it).

**Pitch line (valid either way):** "We chose the model that scores worse on the
benchmark everyone quotes and better on realistic audio. In-domain EER is a
vanity metric."

## 3. Data plan## 3. Data plan

| Source | Purpose | Notes |
|---|---|---|
| ASVspoof 2019 LA | Training base | Registration required |
| ASVspoof 2021 LA + DF | Codec robustness eval | DF is codec-degraded |
| In-the-Wild | **Reality check** | Expect an ugly baseline number |
| ASVspoof 5 | Modern attacks | Crowdsourced, harder |
| **Self-generated Indian-language clones** | Fine-tuning + novelty | XTTS-v2, F5-TTS, OpenVoice v2, RVC |
| **Self-recorded replay corpus** | Mode B path | Our IP — see §5 |
| MUSAN + OpenSLR RIRs | Augmentation | Noise + reverb |

**Do not use ElevenLabs to generate training data.** Their terms restrict using
outputs to build derivative/competing models. Open TTS models are also what
actual scammers use, so the data is more representative anyway.

## 4. Augmentation pipeline — highest ROI work in the project

Apply on-the-fly during training, random per sample:

| Augmentation | Implementation | Probability |
|---|---|---|
| Telephony bandwidth | 16k → 8k → 16k resample | 0.5 |
| G.711 μ-law | ffmpeg `pcm_mulaw` round-trip | 0.3 |
| AMR-NB 12.2 kbps | ffmpeg `libopencore_amrnb` | 0.3 |
| Opus @ 8 kbps | ffmpeg `libopus` | 0.3 |
| Room reverb | Convolve with OpenSLR RIR | 0.4 |
| Additive noise | MUSAN, SNR 5-20 dB | 0.5 |
| Random gain | -12 to +6 dB | 0.6 |
| Packet loss | Zero random 20 ms chunks | 0.2 |

Train with this from the very first epoch, not as a later refinement.

## 5. Replay corpus — build this yourself

The ASVspoof PA track will **not** help. PA replays *bona-fide human* speech
through speakers. Mode B replays *TTS-generated* speech through speakers. The
artefact structure is different and transfer is near zero.

### Procedure
1. Take 2,000 spoofed clips (ASVspoof LA + our own TTS) and 2,000 bona-fide clips.
2. Play each through a phone's earpiece **and** loudspeaker.
3. Re-record on a second phone held at realistic distance (10-30 cm).
4. Repeat across 3 device pairs and 3 acoustic environments (quiet room, street noise, indoor echo).
5. Label preserved from source.

This yields ~12,000 replay-path samples. **No other SIH team will have this**,
and it is the only data that honestly represents Mode B's signal path.

## 6. Training recipe

| Setting | Value |
|---|---|
| Base | RawTFNet-32 pretrained (fallback: AASIST-L, `clovaai/aasist`) |
| Input | Raw waveform, 16 kHz, **exactly 64,600 samples (4.04 s)** — fixed, not adjustable |
| Loss | Weighted CE (spoof-heavy class weighting) |
| Optimiser | Adam, lr 1e-4, cosine decay |
| Batch | 32 (fits a T4) |
| Epochs | 40-60 with early stopping on In-the-Wild EER |
| **Model selection** | **On out-of-domain EER, never in-domain** |

Selecting on in-domain validation is how teams end up with a 0.8 %/43 % split.
Select on the metric that reflects the deployment.

## 7. Evaluation protocol

Report **all five** numbers. Never one.

| Set | What it measures |
|---|---|
| ASVspoof 2019 LA | In-domain sanity — does training work at all |
| ASVspoof 2021 DF | Codec robustness |
| **In-the-Wild** | **Realistic generalisation — the headline** |
| Our replay corpus | Mode B's actual signal path |
| Held-out TTS engine | Unseen-attack generalisation |

**Hold out one entire TTS engine** (suggestion: F5-TTS) from all training. Its
result is the honest answer to "what about a cloner released next month".

## 8. Export

```python
torch.onnx.export(model, dummy, "rawtfnet16.onnx",
                  input_names=["waveform"], output_names=["logits"],
                  dynamic_axes={"waveform": {0: "batch"}}, opset_version=17)

from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic("rawtfnet16.onnx", "rawtfnet16_int8.onnx", weight_type=QuantType.QInt8)
```

**Verify parity after quantisation.** Score 500 clips with the PyTorch model and
the int8 ONNX model; EER must not degrade by more than 1 point absolute. Silent
quantisation damage is a common and hard-to-find failure.

## 9. The accuracy slide

| Condition | RawTFNet-32 baseline | Ours | Δ |
|---|---|---|---|
| ASVspoof 2019 LA (in-domain) | 1.99 % EER | | |
| ASVspoof 2021 LA | 8.03 % EER | | |
| ASVspoof 2021 DF (codec) | 15.16 % EER | | |
| **In-the-Wild (unseen)** | **38.51 % EER** | | |
| **Modern TTS (CD-ADD class)** | **~53 % EER — near chance** | | **the row that matters most** |
| Our replay corpus | — | | |
| Hindi/regional held-out | — | | |
| Held-out TTS engine | — | | |

Fill the blanks with measured numbers. The In-the-Wild row is the one that
wins. Present the baseline honestly — the size of the gap is what makes the
improvement meaningful.
