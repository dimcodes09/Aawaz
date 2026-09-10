# 14 — Results summary

All numbers previously measured. Nothing re-run for this document.
Risk is the CONTRACTS.md score: `round((1 - sigmoid(logits[1])) * 100)`,
0 = confident genuine, 100 = confident clone. Model:
`ml/export/rawtfnet32_b1.onnx` (pretrained, not fine-tuned).

## Measured

| Condition | Real median risk | Fake median risk | AUC |
|---|---|---|---|
| **Window 0, English** | **1.0** | **95.5** | **0.990** |
| Window 0, Hindi | 75.0 | 99.5 | 0.850 |
| Opus 24 k round-trip, Hindi | 78.5 | 100.0 | 0.890 |
| Mid-file windows, English | 96.0 | 50.5 | **0.353 — INVERTED** |
| Mid-file + 0.5 s silence pad | 4.0 | 1.0 | 0.273 |

AUC is the probability the model ranks a genuine clip as more bona-fide than a
clone. 1.0 is perfect, 0.5 is chance, **below 0.5 means the ranking is
backwards**.

## What each row says

**Window 0, English — this is the demo.** Clean separation, 0 % false alarms at
the raise threshold of 75. Source: docs/11-POLARITY-CHECK.md.

**Window 0, Hindi — usable ranking, unusable in production.** AUC 0.850 clears
the gate on paper, but genuine Hindi speakers sit at median risk 75, so 50–60 %
of them trip the raise threshold. The model largely scores *the language* as
spoofed: same model, genuine speech, English median risk 1.0 vs Hindi 75.0.
Source: docs/12-XTTS-GATE.md.

**Opus 24 k, Hindi — the codec does not hurt.** AUC improves 0.850 → 0.890
through the Mode A channel. Good news for the transport, on a 10-clip sample.

**Mid-file windows — the checkpoint is backwards here.** Genuine speech scores
risk 96 while clones score 50.5. The model keys on the natural leading silence
of window 0, an ASVspoof-2019 dataset artifact; once that cue is gone the
remaining discrimination inverts. Source: docs/13-SILENCE-PAD-GATE.md.

**Silence pad — cannot rescue streaming.** Prepending 0.5 s of digital silence
does pull real risk down hard (96 → 4, false alarms 84 % → 6 %), but it
suppresses clones just as hard (50.5 → 1.0). Both classes move together, so AUC
stays inverted at every pad length tested (0.20 / 0.35 / 0.50 s).

## Published vendor benchmarks

From the RawTFNet model card (Xiao, Dang & Das, 2025). EER: lower is better,
50 % is chance.

| Dataset | EER % | Note |
|---|---|---|
| ASVspoof2019 LA | **1.99** | in-domain — the training set |
| InTheWild | **38.51** | out-of-domain, real-world deepfakes |
| CD-ADD | **52.85** | modern neural TTS — *"does not generalize"* |

Our own measurements land where these predict: strong in-domain, degraded
out-of-domain, and at or worse than chance on modern neural-codec TTS.

## Position for the presentation

The honest framing is that we measured a real limitation rather than papering
over it:

1. **Utterance mode ships.** Score window 0 per utterance, where the model is
   measured at AUC 0.990 on English.
2. **Streaming does not ship on this checkpoint.** The inversion is a property
   of the pretrained weights, not of our pipeline. Fine-tuning on mid-file
   windows is the route to streaming, and is now unblocked.
3. **Hindi needs fine-tuning before it is demoable.** Clone detection is already
   at 100 %; the blocker is the false-alarm rate on genuine Hindi speakers.

## Demo assets

`demo/clips/`, 48 kHz mono WAV, leading silence intact, scored on window 0 only.

| Pair | Real | risk | Fake | risk | Voice |
|---|---|---|---|---|---|
| 1 | demo_real_01.wav (9.0 s) | 1 | demo_fake_01.wav (6.8 s) | 94 | en-US-JennyNeural |
| 2 | demo_real_02.wav (9.2 s) | 1 | demo_fake_02.wav (6.4 s) | 95 | en-IE-EmilyNeural |
| 3 | demo_real_03.wav (7.1 s) | 1 | demo_fake_03.wav (6.2 s) | 99 | en-AU-NatashaNeural |

Every clip clears the ship rule (real < 20, fake > 80) with wide margin.
Inventory and rejected candidates: `demo/manifest.json`.
