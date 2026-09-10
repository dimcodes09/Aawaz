# 13 — Silence-pad experiment (streaming rescue attempt)

Track 3, priority experiment. **GATE: FAIL. Ship utterance mode.**

Set: edge-tts English pair set (demo language). 10 real + 10 synthetic clips,
5 mid-file windows each (window 0 excluded) = **50 real + 50 fake windows**.
Windows constructed as `[pad s digital silence][speech]`, total exactly 64600.

## Results

| Condition | Median risk real | Median risk fake | AUC | False alarm on real @75 |
|---|---|---|---|---|
| A. raw mid-file (baseline) | 96.0 | 50.5 | **0.353** | 84 % |
| pad 0.20 s | 94.0 | 15.0 | **0.289** | 72 % |
| pad 0.35 s | 18.0 | 2.0 | **0.295** | 26 % |
| pad 0.50 s | 4.0 | 1.0 | **0.273** | 6 % |
| *control: window 0* (docs/11) | *1.0* | *95.5* | *0.990* | *0 %* |

No pad length reaches AUC ≥ 0.90. **Gate fails at every pad length.**

## The finding is worse than "no separation" — it is inverted

Every AUC is **far below 0.5**, in a tight band (0.273–0.353). That is not noise
around chance; it is a systematic inversion. On mid-file windows the model
consistently ranks **synthetic audio as more bona-fide than genuine speech**.

Read the baseline row directly: raw mid-file gives median risk **96 for real**
and **50.5 for fake**. Genuine speech is scored nearly twice as risky as the
clone. The detector is not degraded on mid-file windows — it is backwards.

## Why padding cannot rescue it

Track 1's observation is confirmed and then some. Prepending silence is a very
strong risk suppressor on real audio: median risk 96 → 4 and false alarms
84 % → 6 % going from 0 to 0.50 s.

But it suppresses **fake at least as hard**: 50.5 → 1.0 over the same range.
Silence is a non-discriminative lever. It moves both classes toward "bona fide"
in lockstep, so the ranking never recovers — AUC stays pinned at ~0.29 no matter
how much is prepended. Tuning the pad length trades false alarms against false
negatives without ever creating separation.

The checkpoint's usable signal lives almost entirely in the natural leading
silence of window 0. Once that cue is gone, the remaining discrimination is
inverted, and no amount of synthetic silence puts it back.

## Consequence

**Ship utterance mode.** Score window 0 of each utterance, where the model is
measured at AUC 0.990. Do not stream mid-file windows into the pretrained
checkpoint under any pad policy — it would surface confident, inverted verdicts.

This is a property of the pretrained checkpoint, not of the streaming design.
Fine-tuning on mid-file windows is the path to streaming later, and it is now
unblocked (below).

## Fine-tuning unblocked

`rawtfnet.py` and `_net.py` **do not exist** in the HF repo. The 404s were not
transient — the repo contains only:

```
.gitattributes  Best_RawTFNet_32.pth  README.md  meta.yaml  rawtfnet.onnx  trt_rawtfnet.py
```

The README references `_net.py` / `rawtfnet.py`, but they are only in the source
repo it links: `github.com/swagshaw/RawTFNet-Pytorch`. Fetched from there into
`ml/vendor/rawtfnet/`:

```
model_scripts/rawtfnet.py  model_scripts/blocks/frontend.py
model_scripts/blocks/classifier.py  RawBoost.py  data_utils_SSL.py  main.py
```

Verified against the checkpoint:

```
signature: RawTFNet(sample_rate: int = 16000)
checkpoint tensors: 470   params: 181,414
load_state_dict: missing 0, unexpected 0
forward(zeros(1, 64600)) -> OK
```

Requires `torchinfo` (installed). Note the forward returns shape `(2,)` at batch
1, not `(1, 2)` — the same axis-less-squeeze defect diagnosed in docs/10,
confirmed at source. `ml/export/export_rawtfnet_b1.py` already handles it.

## Reproduce

```bash
python ml/eval/silence_pad_experiment.py
```

Raw numbers: `ml/eval/silence_pad_results.json`.
