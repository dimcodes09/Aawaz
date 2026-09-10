# Contracts — frozen, do not change without telling all tracks

## Track 1 → Track 2 (native → RN)
DeviceEventEmitter event name: "AawazRisk"
Payload: { score: Int 0-100, state: String, ts: Long }
state ∈ "ANALYSING" | "OK" | "ELEVATED" | "HIGH"
Emitted at 1 Hz. "ANALYSING" until a full 4.04s window exists.

## Track 3 → Track 1 (ML → native)
File: ml/export/rawtfnet32_int8.onnx
Input:  float32[1, 64600]  16kHz mono, normalised [-1, 1]
Output: float32[1, 2]      index 1 = bona-fide logit
risk = round((1 - sigmoid(logit[1])) * 100)

## Thresholds
EMA alpha 0.4, window 4. Hysteresis: raise at 75, clear at 45.