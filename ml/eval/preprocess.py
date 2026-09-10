"""
RawTFNet input preprocessing.

PROVENANCE WARNING
------------------
The task specified "preprocess exactly as trt_rawtfnet.py specifies". That file
does not exist in this repository — ml/vendor/rawtfnet/ is empty and there is no
trt_rawtfnet.py anywhere in the tree. Nothing here is copied from it.

What is used instead, and why:

* 16 kHz mono, float32, range [-1, 1]
      Pinned by docs/CONTRACTS.md ("float32[1, 64600] 16kHz mono, normalised
      [-1, 1]"). This part is contract, not inference.

* 64600 samples (4.0375 s)
      Pinned by docs/CONTRACTS.md and by the ONNX input shape.

* Length handling: TILE-REPEAT for short clips, HEAD CROP for long clips
      NOT verified against trt_rawtfnet.py. 64600 is the ASVspoof2019/2021
      constant, and the RawNet2 / AASIST / RawGAT-ST family that RawTFNet
      belongs to all ship the same `pad()`:

          def pad(x, max_len=64600):
              x_len = x.shape[0]
              if x_len >= max_len:
                  return x[:max_len]
              num_repeats = int(max_len / x_len) + 1
              return np.tile(x, (1, num_repeats))[:, :max_len][0]

      That is what is implemented below. It is an assumption inherited from the
      architecture family, and it must be re-checked when trt_rawtfnet.py lands.

* Amplitude normalisation: NONE by default
      The RawNet2/AASIST family feeds the raw soundfile float read straight in,
      already in [-1, 1]. Some forks divide by max(abs(x)). Because this is
      unverified, `normalise` is a parameter and the polarity check reports both
      settings, so the conclusion cannot rest on the wrong guess.
"""

from __future__ import annotations

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

TARGET_SR = 16000
WINDOW_SAMPLES = 64600


def to_mono(x: np.ndarray) -> np.ndarray:
    return x.mean(axis=1) if x.ndim > 1 else x


def resample(x: np.ndarray, sr: int, target_sr: int = TARGET_SR) -> np.ndarray:
    if sr == target_sr:
        return x
    from math import gcd
    g = gcd(int(sr), int(target_sr))
    return resample_poly(x, target_sr // g, sr // g)


def pad(x: np.ndarray, max_len: int = WINDOW_SAMPLES) -> np.ndarray:
    """ASVspoof-family length handling: head crop if long, tile-repeat if short."""
    x_len = x.shape[0]
    if x_len >= max_len:
        return x[:max_len]
    num_repeats = int(max_len / x_len) + 1
    return np.tile(x, num_repeats)[:max_len]


def load_window(path: str, normalise: bool = False) -> np.ndarray:
    """Read any audio file to a single float32[64600] window at 16 kHz mono."""
    x, sr = sf.read(path, dtype="float32", always_2d=False)
    x = to_mono(x)
    x = resample(x, sr).astype(np.float32)
    if normalise:
        peak = np.abs(x).max()
        if peak > 0:
            x = x / peak
    return pad(x).astype(np.float32)
