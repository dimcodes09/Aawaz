# PS26104 — Voice Clone Detection · SIH 2026

Real-time detection and prevention of voice cloning impersonation attacks.
Native React Native app, on-device inference, two modes.

## Read in this order

| Doc | What it is | Read when |
|---|---|---|
| **00 — Android Audio Feasibility** | The OS restriction and the day-1 kill-test | **Before writing any code** |
| 01 — Architecture | Modes, detection core, signal chain, data handling | Before building |
| 02 — SRS | Functional and non-functional requirements | Before building |
| 03 — Implementation Plan | Phased build with gates | Weekly |
| 04 — Tech Stack | Every library and why | When picking a dependency |
| 05 — ML Pipeline | Data, augmentation, training, evaluation | ML owner |
| 06 — Risk Register | Risks, mitigations, checkpoint dates | Weekly |
| 07 — Security and Privacy | The no-audio-stored architecture | Before the pitch |
| 08 — Demo Script | Minute-by-minute run and failure playbook | Week 5-6 |

## The five decisions that define this project

1. **RawTFNet-32 — LOCKED.** Better out-of-domain than AASIST (In-the-Wild
   38.51 % vs 43.01 %) at 0.178 M params vs 0.30 M, MIT licensed, self-contained
   inference code. ⚠️ Pretrained it scores near chance (~53 % EER) on modern
   neural-TTS, so **fine-tuning on self-generated XTTS-v2 / F5-TTS clones is
   load-bearing, not optional.** That work starts in week 2.
2. **Inference in Kotlin, not `onnxruntime-react-native`** — audio never crosses
   the JS bridge; only one float per verdict does.
3. **Automatic call detection, one-tap capture** — `TelephonyManager` is
   unrestricted, `AudioRecord`-during-call is not. We keep what the OS allows and
   are honest about the rest.
4. **No audio ever written to disk** — 32 KB RAM ring buffer, overwritten 4×/sec.
5. **Report five EER numbers, not one** — including the ones that look bad.

## Hard rules

- Hand-write the Kotlin ring buffer and windowing. Do not generate it.
- 16 kHz mono, exactly 64,600 samples (4.04 s) per window. Both models require
  this; no sub-second verdict is possible. 4 s window, 1 s hop.
- Never score silence — VAD gate first, always.
- Test on real OEM devices from week 1. Emulators do not reproduce the risk.
- Feature freeze end of week 5.
