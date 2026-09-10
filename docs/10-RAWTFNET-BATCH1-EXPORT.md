# 10 — RawTFNet batch-1 export

Track 3. Resolves the batch-2 lock that was blocking Track 1.

**Artifact: `ml/export/rawtfnet32_b1.onnx`** — batch-dynamic, verified at batch 1.

## Cross-batch equivalence: NO cross-batch operations. Row 0 is safe.

Answer to the question asked before recommending the duplicate-the-window
workaround: **YES, row 0 of a batch-2 forward pass is numerically equivalent to
a true batch-1 forward pass.** Verified both structurally and empirically.

Structural audit of all 501 nodes:

| Concern | Finding |
|---|---|
| BatchNorm running statistics | 4 `BatchNormalization` nodes, every one with `training_mode=0` and scale/B/mean/var all frozen initializers, single output. Inference-mode BN is a per-channel affine transform applied independently to each sample. No batch statistics are computed at runtime. |
| Reductions over the batch axis | Reduction axes present: `(1,3)` ×15, `(2,)` ×9, `(3,)` ×9, `(-1,-2)` ×1. **None touch axis 0.** |
| `ReduceProd` ×5 (axes unset) | Operate on `Gather` outputs of *shape vectors*, not activations. Shape arithmetic inside the shuffle blocks; the axis they reduce is the shape-vector axis, not the data batch axis. |
| `InstanceNormalization` / `LayerNormalization` | Zero of each. |
| `GlobalAveragePool` ×3 | Per-sample spatial pooling. Never couples batch. |

Empirical confirmation — row 0 held constant, row 1 varied to extremes:

| Row 1 content | Row 0 output | Drift |
|---|---|---|
| duplicate of row 0 | `[4.3674974, -4.8641143]` | — |
| independent noise | `[4.3674974, -4.8641143]` | 0.000e+00 |
| all zeros | `[4.3674974, -4.8641143]` | 0.000e+00 |
| row 0 × 1000 amplitude | `[4.3674974, -4.8641143]` | 0.000e+00 |

Bit-identical under every perturbation. The duplicate-and-read-row-0 workaround
was numerically sound. It is no longer needed.

## Root cause: not the hypothesis

The theory was `dummy_input=torch.randn(2, 64600)` with no `dynamic_axes`. That
is not what happened — the shipped graph **does** declare dynamic axes:

```
INPUT   wav    ['batch', 64600]
OUTPUT  logits ['batch', 2]
producer: pytorch 2.7.0, opset 17
```

`dynamic_axes` was set. Two separate interior defects locked it to batch 2.

### Defect 1 — 18 frozen reshape targets in the channel-shuffle blocks

```
Reshape '/net/classifier/feature/feature.1/shuffle_layer/Reshape'
Input shape:{1,32,23,16}, requested shape:{2,4,8,23,16}
```

Nine `shuffle_layer` blocks, two reshapes each. A channel shuffle does

```python
x = x.view(N, groups, C // groups, H, W).transpose(1, 2).reshape(N, C, H, W)
```

and `N` was captured as the Python int `2` from the batch-2 dummy input instead
of being read from the live tensor with a `Shape` op. The graph boundary stayed
dynamic; these interior constants did not.

Frozen targets, all with a literal `2` in dim 0:

| Block | Reshape | Reshape_1 |
|---|---|---|
| feature.1, feature.2 | `[2, 4, 8, 23, 16]` | `[2, 32, 23, 16]` |
| feature.5, feature.6 | `[2, 6, 8, 11, 8]` | `[2, 48, 11, 8]` |
| feature.9, feature.10 | `[2, 8, 8, 5, 4]` | `[2, 64, 5, 4]` |
| feature.12, .13, .14 | `[2, 10, 8, 5, 4]` | `[2, 80, 5, 4]` |

### Defect 2 — axis-less `Squeeze` at the classifier tail

Independent of defect 1, and it would have bitten immediately after fixing it:

```
ReduceMean(axes=[-1,-2], keepdims=0)  ->  (N, 2)
Squeeze(no axes)                      ->  logits
```

A `Squeeze` with no axes removes *every* size-1 dimension. At N=2 it is a no-op,
which is why it went unnoticed. At N=1 it eats the batch dim and the output
degrades from `(1, 2)` to `(2,)` — silently breaking the
`float32[1, 2]` output contract in `docs/CONTRACTS.md`.

## The fix

`ml/export/fix_batch_dim.py` operates on the ONNX graph directly, because
re-export from source is not currently possible: **`ml/vendor/rawtfnet/` is
empty and torch is not installed here.** There is no module to import and no
checkpoint to load.

1. Replace dim 0 of each of the 18 frozen reshape targets with `-1`, so the
   batch dim is inferred from the tensor. The remaining dims are genuinely
   static for a fixed 64600-sample input and are left untouched.
2. Remove the axis-less `Squeeze` and let `ReduceMean` write `logits` directly.
   Provably a no-op for N ≥ 2, and it fixes N = 1.

```bash
python ml/export/fix_batch_dim.py app/android/app/src/main/assets/rawtfnet.onnx ml/export/rawtfnet32_b1.onnx
```

`ml/export/export_rawtfnet_b1.py` is the clean source-side export for when
RawTFNet is vendored. It uses a batch-1 dummy input and documents both defects
so they are not reintroduced.

## Verification

`python ml/export/verify_batch1.py`

| Check | Result |
|---|---|
| 1. batch-1 ONNX runs | **PASS** |
| 2. output shape is `[1, 2]` | **PASS** — `(1, 2)` |
| 3. batch-1 matches batch-2 row 0 within 1e-4 | **PASS** — max abs diff **4.768e-07** |
| onnx.checker | **PASS** |

```
batch-1     : [ 4.2133675 -4.756898 ]
batch-2 row0: [ 4.213368  -4.7568984]
```

Batch 1–4 all run, with row 0 drift ≤ 4.768e-07 against the batch-1 reference.
The residual ~5e-7 is float32 accumulation-order noise, four orders of magnitude
inside tolerance.

Model: 867,294 bytes, opset 17, `wav: ['batch', 64600]` → `logits: ['batch', 2]`.

## Open items for Track 1

1. **Input tensor name is `wav`, not `waveform`.** The requested export
   specified `input_names=["waveform"]`. Renaming would break the Android
   session's current loader, so the patched artifact keeps `wav`.
   `docs/CONTRACTS.md` does not pin the tensor name — it should. Agree the name
   before swapping the asset.
2. **Filename.** `docs/CONTRACTS.md` names `ml/export/rawtfnet32_int8.onnx`.
   This artifact is `rawtfnet32_b1.onnx` and is **float32, not int8** —
   quantisation has not been done. Either the contract or the filename needs to
   change.
3. The asset currently in `app/android/app/src/main/assets/rawtfnet.onnx` is
   still the batch-2 graph. Swapping it is Track 1's call, not mine.
