# 12 — XTTS-v2 gate (the critical test)

Track 3, Task 2. Does the pretrained RawTFNet catch XTTS-v2 on Hindi?

**Literal gate verdict: PASS (AUC 0.850 clean, 0.890 after Opus).**
**Engineering verdict: DO NOT SHIP THIS AS-IS.** The gate passes on a technicality.
The model flags **50–80 % of genuine Hindi speakers as clones**.

## Results

10 real Hindi clips (FLEURS `hi_in`) vs 10 XTTS-v2 clones of the *same speakers,
same transcripts*. Opus 24 kbps / 48 kHz round-trip applied to **both** classes.

| # | Condition | Median risk real | Median risk fake | AUC | EER % | FN < 50 |
|---|---|---|---|---|---|---|
| 1 | real vs XTTS-v2, clean | **75.0** | 99.5 | **0.850** | 30.00 | 0/10 |
| 2 | real vs XTTS-v2, Opus 24k | **78.5** | 100.0 | **0.890** | 20.00 | 0/10 |
| 3 | real vs edge-tts, clean (baseline) | 1.0 | 95.5 | 0.990 | 10.00 | 1/10 |

Zero false negatives on XTTS-v2 — every clone was caught. That is the good half.

## Why the pass is not real

The model catches 10/10 clones because it calls **almost everything** a clone.

| Condition | Threshold | False alarms on genuine Hindi | Clones caught |
|---|---|---|---|
| clean | 45 (CONTRACTS clear) | **8/10 (80 %)** | 10/10 |
| clean | 75 (CONTRACTS raise) | **5/10 (50 %)** | 10/10 |
| Opus 24k | 45 | **8/10 (80 %)** | 10/10 |
| Opus 24k | 75 | **6/10 (60 %)** | 10/10 |
| edge-tts (English) | 75 | 0/10 (0 %) | 8/10 |

Per-clip risk, sorted:

```
real  Hindi clean : [  1,  20,  58,  68,  71,  79,  94,  99,  99, 100]
XTTS  Hindi clean : [ 99,  99,  99,  99,  99, 100, 100, 100, 100, 100]
real  English     : [  1,   1,   1,   1,   1,   1,   1,   2,   3,   9]
```

At the shipped raise threshold of 75, **half the genuine Hindi callers in this
sample would be shown a HIGH warning.** A demo like that is worse than no
detector: it teaches the user to ignore the alert.

## The actual finding: language domain shift, not spoof detection

Same model, same `real` label, genuine human speech in both cases:

| Genuine speech | Median risk |
|---|---|
| English (LibriSpeech) | **1.0** |
| Hindi (FLEURS) | **75.0** |

RawTFNet trained only on ASVspoof2019 LA, which is English. It has not learned
"synthetic vs bona fide" in a language-agnostic way — on Hindi it largely scores
*the language itself* as spoofed. The high AUC on XTTS is a side effect of the
whole Hindi distribution being pushed toward "fake", not of the clones being
separated from the reals.

This is consistent with the vendor's own README, which marks exactly this
attack class as failing:

| Vendor benchmark | EER % | Vendor note |
|---|---|---|
| ASVspoof2019_LA (in-domain) | 1.99 | training data |
| InTheWild | 38.51 | out-of-domain |
| CD-ADD | 52.85 | *"modern neural-TTS; does not generalize"* |
| CVoiceFake_small | 54.94 | *"multilingual neural-codec TTS; does not generalize"* |
| SONAR | 55.85 | *"multilingual TTS/VC; does not generalize"* |

Our measured EER of 30 % (clean) / 20 % (Opus) sits between InTheWild and the
"does not generalize" rows — about where the vendor's numbers predict.

## Two secondary observations

**Opus made it better, not worse** (AUC 0.850 → 0.890, EER 30 % → 20 %). The
codec appears to smooth away some of the Hindi-specific detail the model was
misfiring on. Encouraging for the Mode A channel, but it is a 10-clip sample and
should not be leaned on.

**AUC 0.850 is exactly on the gate boundary and statistically fragile.** With
10 v 10 there are only 100 pairwise comparisons, so AUC moves in steps of 0.01.
The clean condition is *one clip-pair* away from failing the gate. Treating
0.850 as a pass on this sample size is not defensible.

## Recommendation

Report the literal result honestly — the gate as written passes — but treat this
as the **AUC < 0.85 branch in practice**: fine-tuning is mandatory before the
demo. The blocker is not clone detection, which is at 100 %; it is the
false-alarm rate on genuine Hindi speech, which is 50–80 %.

Fine-tuning on Hindi real vs Hindi clone should fix this directly, because the
problem is a domain gap the training set can close.

**Still blocked for fine-tuning:** `rawtfnet.py` and `_net.py` were referenced by
`trt_rawtfnet.py` and the README but were **not** vendored — only
`trt_rawtfnet.py`, `Best_RawTFNet_32.pth` and `README.md` arrived. The PyTorch
model cannot be instantiated, so steps 4 and 5 cannot start until those two
files land.

## Reproduce

```bash
python ml/eval/build_hindi_real.py        # FLEURS hi_in -> 300 real clips
python ml/eval/build_hindi_clones.py 15   # XTTS-v2 clones
python ml/eval/xtts_spotcheck.py          # 4 conditions + gate
```

Raw numbers: `ml/eval/xtts_spotcheck.json`.

Two environment notes for whoever repeats this:

- torchaudio ≥ 2.9 routes audio I/O through torchcodec, which needs FFmpeg
  *shared* libraries. The ffmpeg here is a static build, so every XTTS reference
  load failed with "Could not load libtorchcodec". `build_hindi_clones.py`
  patches `torchaudio.load` to use soundfile instead.
- coqui-tts is incompatible with transformers 5.x (`isin_mps_friendly` was
  removed); transformers is pinned to 4.57.1.
- XTTS-v2 raised a bare `NotImplementedError` on 2 of 15 Hindi transcripts
  (not length-related — a 198-char clip succeeded, a 98-char one failed). Clones
  are therefore paired to their source by `pairs_with`, never by list position.
