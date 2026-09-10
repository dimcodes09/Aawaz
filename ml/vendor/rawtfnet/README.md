---
license: mit
tags:
  - audio
  - anti-spoofing
  - audio-deepfake-detection
  - speech
  - asvspoof
---

# RawTFNet

[![EER% 1.99 on ASVspoof2019_LA](https://img.shields.io/badge/EER%25%20on%20ASVspoof2019__LA-1.99%25-brightgreen)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 8.03 on ASVspoof2021_LA](https://img.shields.io/badge/EER%25%20on%20ASVspoof2021__LA-8.03%25-green)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 15.16 on ASVspoof2021_DF](https://img.shields.io/badge/EER%25%20on%20ASVspoof2021__DF-15.16%25-yellow)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 38.51 on InTheWild](https://img.shields.io/badge/EER%25%20on%20InTheWild-38.51%25-orange)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 52.85 on CD-ADD](https://img.shields.io/badge/EER%25%20on%20CD--ADD-52.85%25-red)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 55.85 on SONAR](https://img.shields.io/badge/EER%25%20on%20SONAR-55.85%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 29.76 on LibriSeVoc](https://img.shields.io/badge/EER%25%20on%20LibriSeVoc-29.76%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 36.62 on CFAD](https://img.shields.io/badge/EER%25%20on%20CFAD-36.62%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 54.94 on CVoiceFake_small](https://img.shields.io/badge/EER%25%20on%20CVoiceFake__small-54.94%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 45.07 on ASVspoof5](https://img.shields.io/badge/EER%25%20on%20ASVspoof5-45.07%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 50.16 on DeepVoice](https://img.shields.io/badge/EER%25%20on%20DeepVoice-50.16%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 48.35 on ArAD](https://img.shields.io/badge/EER%25%20on%20ArAD-48.35%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 23.73 on DECRO](https://img.shields.io/badge/EER%25%20on%20DECRO-23.73%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 41.01 on J-SPAW_LA](https://img.shields.io/badge/EER%25%20on%20J--SPAW__LA-41.01%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 52.59 on ODSS](https://img.shields.io/badge/EER%25%20on%20ODSS-52.59%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 37.6 on HABLA](https://img.shields.io/badge/EER%25%20on%20HABLA-37.6%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 22.87 on DFADD](https://img.shields.io/badge/EER%25%20on%20DFADD-22.87%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 15.76 on PyAra](https://img.shields.io/badge/EER%25%20on%20PyAra-15.76%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 43.12 on XMAD](https://img.shields.io/badge/EER%25%20on%20XMAD-43.12%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![1-SRR% 52.95 on LRLspoof](https://img.shields.io/badge/1--SRR%25%20on%20LRLspoof-52.95%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 35.15 on ADD22_eval_31](https://img.shields.io/badge/EER%25%20on%20ADD22__eval__31-35.15%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 38.6 on ADD2023_track12_test_r1](https://img.shields.io/badge/EER%25%20on%20ADD2023__track12__test__r1-38.6%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![EER% 13.59 on EmoFake_test](https://img.shields.io/badge/EER%25%20on%20EmoFake__test-13.59%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![1-SRR% 76.57 on EmoSpoofTTS](https://img.shields.io/badge/1--SRR%25%20on%20EmoSpoofTTS-76.57%25-lightgrey)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![arena tier](https://img.shields.io/endpoint?url=https://speechantispoofingbenchmarks-speechantispoofingarena.hf.space/badge/rawtfnet/tier.json)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)
[![arena rank](https://img.shields.io/endpoint?url=https://speechantispoofingbenchmarks-speechantispoofingarena.hf.space/badge/rawtfnet/rank.json)](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet)

A lightweight raw-waveform CNN for audio anti-spoofing (voice-deepfake detection),
proposed in *"RawTFNet: A Lightweight CNN Architecture for Speech Anti-spoofing"*
(Xiao, Dang & Das, 2025). The model takes a raw speech waveform and returns a score
where **higher = more bona fide**.

- **Code:** https://github.com/swagshaw/RawTFNet-Pytorch
- **Paper:** https://arxiv.org/abs/2507.08227
- **Parameters:** 177,540 (0.178 M)
- **Checkpoint:** [`Best_RawTFNet_32.pth`](./Best_RawTFNet_32.pth)

This repo is self-contained for inference: the network definition is in
[`_net.py`](./_net.py), and the exact wrapper used to produce the Arena scores is in
[`rawtfnet.py`](./rawtfnet.py).

## Architecture

RawTFNet operates directly on the raw waveform:

1. **Sinc-convolution front-end** (`SincConv`, AASIST-style) — fixed band-pass
   filters that turn the waveform into a time–frequency representation, followed by a
   ResNet-style block and three **depthwise-separable Res2Net-SE** blocks
   (`DWS_Frontend_SE`).
2. **Tf-SepNet classifier** (`TfSepNet`, depth=10, width=32) — stacked
   **time–frequency separable** convolution blocks with channel shuffle and adaptive
   residual normalization, ending in a 1×1 conv to 2 classes pooled over time and
   frequency.
3. The 2-logit output is read at **index 1 = bona fide**.

## How it was trained

- **Data:** ASVspoof 2019 **Logical Access (LA)**, with RawBoost data augmentation.
- **Input length:** raw audio at 16 kHz cropped/padded to 64,600 samples (~4.04 s).
- **Output:** 2-class logits; the bona-fide logit (index 1) is the score.

See the [source repository](https://github.com/swagshaw/RawTFNet-Pytorch) for the
full training and evaluation code.

## Benchmark result (Speech Anti-Spoofing Arena)

Evaluated through the reproducible [Speech Anti-Spoofing Arena](https://huggingface.co/spaces/SpeechAntiSpoofingBenchmarks/SpeechAntiSpoofingArena?system=rawtfnet).
Scores were computed with a **deterministic first-64,600-sample window** (no random
crop), so the numbers are exactly reproducible from the pinned score file.

| Dataset | Split | EER % | Trials | Skipped | Notes |
|---|---|---|---|---|---|
| ASVspoof2019_LA | test | **1.99** | 71,237 | 0 | in-domain (training data) |
| ASVspoof2021_LA | test | **8.03** | 181,566 | 0 | cross-dataset generalization |
| ASVspoof2021_DF | test | **15.16** | 611,829 | 0 | cross-dataset generalization |
| InTheWild | test | **38.51** | 31,779 | 0 | out-of-domain (real-world deepfakes) |
| CD-ADD | test | **52.85** | 20,786 | 0 | out-of-domain (modern neural-TTS); does not generalize |
| SONAR | test | **55.85** | 3,948 | 0 | out-of-domain (multilingual TTS/VC); does not generalize |
| LibriSeVoc | test | **29.76** | 18,487 | 0 | out-of-domain (neural vocoder artifacts) |
| CFAD | test | **36.62** | 62,999 | 0 | out-of-domain (Chinese audio deepfakes) |
| CVoiceFake_small | test | **54.94** | 138,136 | 0 | out-of-domain (multilingual neural-codec TTS); does not generalize |
| ASVspoof5 | test | **45.07** | 680,774 | 0 | out-of-domain (crowdsourced TTS/VC + adversarial); does not generalize |

The model trains only on ASVspoof2019 LA, so the in-domain EER is low (1.99 %) while
the cross-dataset / out-of-domain sets measure generalization to newer, unseen
attacks. RawTFNet generalizes notably better than the reference TCN/capsule models on
ASVspoof2021_LA, ASVspoof2021_DF, and InTheWild.

## Usage

The checkpoint is a `state_dict` for the `RawTFNet` network defined in
[`_net.py`](./_net.py). The input **must** be exactly 64,600 samples at 16 kHz mono —
window the waveform with `pad_fixed` (first 64,600 samples, tile-repeat if shorter).

```python
import numpy as np
from rawtfnet import RawTFNetModel   # _net.py + rawtfnet.py are in this repo

m = RawTFNetModel()
m.load()                                          # loads Best_RawTFNet_32.pth
audio = np.random.randn(48000).astype(np.float32) # float32 mono 16 kHz
print(m.score_batch([audio], [16000])[0])         # higher = more bona fide
m.unload()
```

Internally the wrapper windows the input, runs the network, and returns
`logits[:, 1]` (class 1 = bona fide). [`rawtfnet.py`](./rawtfnet.py) is the exact
`speech_spoof_bench` model that produced the Arena `scores.txt`.

## Citation

**This model / paper:**

```bibtex
@article{xiao2025rawtfnet,
  title={RawTFNet: A Lightweight CNN Architecture for Speech Anti-spoofing},
  author={Xiao, Yang and Dang, Ting and Das, Rohan Kumar},
  journal={arXiv preprint arXiv:2507.08227},
  year={2025}
}
```

**Training dataset — ASVspoof 2019:**

```bibtex
@article{wang2020asvspoof,
  title={ASVspoof 2019: A large-scale public database of synthesized, converted and replayed speech},
  author={Wang, Xin and Yamagishi, Junichi and Todisco, Massimiliano and Delgado, H{\'e}ctor and Nautsch, Andreas and Evans, Nicholas and Sahidullah, Md and Vestman, Ville and Kinnunen, Tomi and Lee, Kong Aik and others},
  journal={Computer Speech \& Language},
  volume={64},
  pages={101114},
  year={2020},
  publisher={Elsevier}
}
```

## License

MIT — see the [source repository](https://github.com/swagshaw/RawTFNet-Pytorch).

## Maintainer

Maintained by Kirill Borodin (SpeechAntiSpoofingBenchmarks).
- Email: kborodin.research@gmail.com
- Telegram: [@korallll_ai](https://t.me/korallll_ai)
