"""
Make RawTFNet's exported ONNX batch-dynamic.

Why this exists
---------------
The shipped rawtfnet.onnx declares dynamic batch at the graph boundary
(wav: [batch, 64600], logits: [batch, 2]) but still refuses to run at batch 1:

    Reshape node '/net/classifier/feature/feature.1/shuffle_layer/Reshape'
    Input shape:{1,32,23,16}, requested shape:{2,4,8,23,16}

Each ShuffleNet-style channel-shuffle block does

    x = x.view(N, groups, C // groups, H, W).transpose(1, 2).reshape(N, C, H, W)

and at export time N was captured as the Python int 2 from the batch-2 dummy
input instead of being read from the live tensor with a Shape op. dynamic_axes
was set, so the declared interface is dynamic, but these 18 interior reshape
targets are frozen constants with a literal 2 in dim 0.

The fix replaces that leading 2 with -1 so the batch dim is inferred from the
tensor itself. The remaining dims in each target are genuinely static for a
fixed 64600-sample input and are left untouched.

There is a second, independent batch-1 bug. The graph ends with

    ReduceMean(axes=[-1,-2], keepdims=0)  ->  (N, 2)
    Squeeze(no axes)                      ->  logits

A Squeeze with no axes removes *every* size-1 dimension. At N=2 that is a no-op,
which is why it survived export unnoticed; at N=1 it eats the batch dim and the
output degrades from (1, 2) to (2,). Since the node provably does nothing for
N >= 2, it is removed and ReduceMean now writes `logits` directly.

This is a stopgap for when the PyTorch source is unavailable. The clean fix is
to re-export from source with a shape-derived batch dim: see
export_rawtfnet_b1.py.
"""

import argparse
import sys

import onnx
from onnx import numpy_helper


def fix(src: str, dst: str) -> int:
    model = onnx.load(src)
    graph = model.graph

    constant_nodes = {
        node.output[0]: node
        for node in graph.node
        if node.op_type == "Constant"
    }
    initializers = {init.name: init for init in graph.initializer}

    patched = 0
    for node in graph.node:
        if node.op_type != "Reshape" or len(node.input) < 2:
            continue
        target_name = node.input[1]

        if target_name in constant_nodes:
            tensor = constant_nodes[target_name].attribute[0].t
        elif target_name in initializers:
            tensor = initializers[target_name]
        else:
            # Shape-derived target, already dynamic. Nothing to do.
            continue

        shape = numpy_helper.to_array(tensor).copy()
        if shape.ndim != 1 or shape.size == 0 or shape[0] <= 0:
            continue

        print(f"  {node.name}: {shape.tolist()} -> {[-1] + shape[1:].tolist()}")
        shape[0] = -1
        tensor.CopyFrom(numpy_helper.from_array(shape, tensor.name))
        patched += 1

    squeezed = drop_batch_eating_squeeze(graph)

    onnx.checker.check_model(model)
    onnx.save(model, dst)
    return patched, squeezed


def drop_batch_eating_squeeze(graph) -> int:
    """Remove a trailing axis-less Squeeze that would collapse a batch of 1."""
    outputs = {out.name for out in graph.output}
    removed = 0
    for node in list(graph.node):
        if node.op_type != "Squeeze":
            continue
        if len(node.input) != 1:
            continue          # explicit axes, leaves batch alone
        if node.output[0] not in outputs:
            continue          # not the graph tail, out of scope for this fix

        producer = next(
            (n for n in graph.node if node.input[0] in n.output), None
        )
        if producer is None:
            continue

        print(f"  removing axis-less {node.name}; "
              f"{producer.name} now writes {node.output[0]} directly")
        for i, out in enumerate(producer.output):
            if out == node.input[0]:
                producer.output[i] = node.output[0]
        graph.node.remove(node)
        removed += 1
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("src")
    parser.add_argument("dst")
    args = parser.parse_args()

    print(f"reading {args.src}")
    patched, squeezed = fix(args.src, args.dst)
    print(f"\npatched {patched} reshape target(s), "
          f"removed {squeezed} batch-eating squeeze(s); wrote {args.dst}")
    return 0 if patched else 1


if __name__ == "__main__":
    sys.exit(main())
