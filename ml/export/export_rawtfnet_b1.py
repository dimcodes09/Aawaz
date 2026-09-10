"""
Clean batch-1 ONNX export for RawTFNet, from the PyTorch source.

This is the correct fix for the batch-2 lock described in fix_batch_dim.py.
It cannot be run yet: ml/vendor/rawtfnet/ is empty and torch is not installed
in this environment, so there is no module to import and no checkpoint to load.
Fill in `load_model` once the source lands, then run:

    python ml/export/export_rawtfnet_b1.py --checkpoint <path> \
        --out ml/export/rawtfnet32_b1.onnx

Two things matter here beyond passing dynamic_axes.

1. The channel-shuffle blocks must derive N from the tensor, not from Python.
   The shipped export baked the dummy input's batch size into 18 reshape
   targets. Inside the shuffle layer, write

       n, c, h, w = x.shape                 # traced as Shape/Gather ops
       x = x.view(n, groups, c // groups, h, w)

   and NOT

       x = x.view(2, groups, c // groups, h, w)
       x = x.view(x.size(0), ...)           # also fine, also shape-derived

   Exporting with a batch-1 dummy input additionally makes any residual frozen
   dim harmless, since 1 is the shape we actually serve.

2. The classifier tail must not end in a bare `.squeeze()`. An axis-less squeeze
   removes every size-1 dim, so at batch 1 it eats the batch dim and the output
   drops from (1, 2) to (2,). Use `.squeeze(-1).squeeze(-1)` or, better,
   ReduceMean with keepdims=False over the spatial axes only.

Verify the result with verify_batch1.py before handing it to Track 1.
"""

import argparse
import sys

WINDOW_SAMPLES = 64600  # 4.04 s at 16 kHz, per docs/CONTRACTS.md


def load_model(checkpoint: str):
    """Build RawTFNet and load weights.

    Not implemented: ml/vendor/rawtfnet/ is empty. Wire this to the real module
    when the source is vendored, e.g.

        from ml.vendor.rawtfnet.model import RawTFNet
        model = RawTFNet(...)
        state = torch.load(checkpoint, map_location="cpu")
        model.load_state_dict(state["model"] if "model" in state else state)
        model.eval()
        return model
    """
    raise NotImplementedError(
        "RawTFNet source is not vendored yet (ml/vendor/rawtfnet/ is empty). "
        "Until it is, use fix_batch_dim.py to patch the existing ONNX."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--out", default="ml/export/rawtfnet32_b1.onnx")
    parser.add_argument("--opset", type=int, default=17)
    args = parser.parse_args()

    import torch  # imported late so --help works without torch installed

    model = load_model(args.checkpoint)

    # Batch 1, not 2. A batch-1 dummy input means any dim the tracer does freeze
    # is frozen at the value we actually serve in production.
    dummy = torch.randn(1, WINDOW_SAMPLES)

    torch.onnx.export(
        model,
        dummy,
        args.out,
        input_names=["waveform"],
        output_names=["logits"],
        dynamic_axes={"waveform": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=args.opset,
    )
    print(f"wrote {args.out}")

    # A shape-frozen graph will not survive this.
    import numpy as np
    import onnxruntime as ort

    session = ort.InferenceSession(args.out, providers=["CPUExecutionProvider"])
    name = session.get_inputs()[0].name
    out = session.run(None, {name: np.zeros((1, WINDOW_SAMPLES), np.float32)})[0]
    assert out.shape == (1, 2), f"expected (1, 2), got {out.shape}"
    print("batch-1 smoke test passed:", out.shape)

    print("\nNOTE: input is named 'waveform' here. The graph Track 1 currently "
          "loads names it 'wav'. Agree the name before swapping the asset.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
