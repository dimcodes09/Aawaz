"""Verify the batch-1 ONNX against the original batch-2 graph."""
import sys
import numpy as np
import onnx
import onnxruntime as ort

ORIG = "app/android/app/src/main/assets/rawtfnet.onnx"
FIXED = "ml/export/rawtfnet32_b1.onnx"
TOL = 1e-4

opts = ort.SessionOptions()
opts.log_severity_level = 4

rng = np.random.default_rng(1234)
wav = rng.standard_normal((1, 64600)).astype(np.float32)

fixed = ort.InferenceSession(FIXED, opts, providers=["CPUExecutionProvider"])
name = fixed.get_inputs()[0].name

ok = True

print("=== 1. batch-1 ONNX runs ===")
try:
    y1 = fixed.run(None, {name: wav})[0]
    print(f"    PASS  ran without error, dtype {y1.dtype}")
except Exception as exc:                                   # noqa: BLE001
    ok = False
    y1 = None
    print(f"    FAIL  {type(exc).__name__}: {exc}")

print("\n=== 2. output shape is [1, 2] ===")
if y1 is None:
    ok = False
    print("    FAIL  no output")
else:
    print(f"    {'PASS' if y1.shape == (1, 2) else 'FAIL'}  shape {y1.shape}")
    ok = ok and y1.shape == (1, 2)

print("\n=== 3. batch-1 matches batch-2 row 0 within 1e-4 ===")
orig = ort.InferenceSession(ORIG, opts, providers=["CPUExecutionProvider"])
y2 = orig.run(None, {orig.get_inputs()[0].name: np.concatenate([wav, wav], 0)})[0]
if y1 is None:
    ok = False
    print("    FAIL  no batch-1 output to compare")
else:
    diff = float(np.abs(y1[0] - y2[0]).max())
    print(f"    batch-1     : {np.array2string(y1[0], precision=7)}")
    print(f"    batch-2 row0: {np.array2string(y2[0], precision=7)}")
    print(f"    {'PASS' if diff < TOL else 'FAIL'}  max abs diff {diff:.3e} (tol {TOL})")
    ok = ok and diff < TOL

print("\n=== extra: batch dims 1..4 all run and stay row-independent ===")
for n in (1, 2, 3, 4):
    batch = np.concatenate([wav] + [rng.standard_normal((1, 64600)).astype(np.float32)
                                    for _ in range(n - 1)], 0)
    y = fixed.run(None, {name: batch})[0]
    diff = float(np.abs(y[0] - y1[0]).max()) if y1 is not None else float("nan")
    status = "PASS" if diff < TOL else "FAIL"
    ok = ok and diff < TOL
    print(f"    batch {n}: shape {y.shape}  row0 drift vs batch-1 {diff:.3e}  {status}")

print("\n=== onnx.checker ===")
onnx.checker.check_model(onnx.load(FIXED))
print("    PASS  model is well formed")

print("\nRESULT:", "ALL CHECKS PASS" if ok else "FAILURES PRESENT")
sys.exit(0 if ok else 1)
