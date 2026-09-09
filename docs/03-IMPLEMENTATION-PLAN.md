# 03 — Implementation Plan

**Governing rule: build the demo first, then make it real.**
A convincing pipeline with a fake score in week 1 beats a perfect model with no
pipeline in week 5. Every phase below has a gate. Do not start the next phase
until the gate passes.

---

## Phase 0 — Kill-test and setup · Days 1-3

| # | Task | Owner | Output |
|---|---|---|---|
| 0.1 | **Run the audio kill-test on 3 OEM devices** (doc 00) | Native pair | Filled results matrix — **blocks everything else** |
| 0.2 | Monorepo: `/app` `/native` `/ml` `/server` `/docs` | Backend | Repo |
| 0.3 | Bare React Native CLI init (NOT Expo), builds to a real device | Frontend | APK on a phone |
| 0.4 | Download ASVspoof 2019 LA, 2021 DF, In-the-Wild | ML | Data on disk |
| 0.5 | Load RawTFNet-32; score 20 clips in Colab | ML | A plausible number |
| 0.7 | **Vendor `_net.py` + `rawtfnet.py` into our repo** — do not depend on the Hub | ML | Local copies committed |
| 0.6 | Pin every dependency version; commit lockfiles | All | `package-lock`, `requirements.txt` |

**Gate 0:** the OEM matrix is filled in, Mode B's final shape is decided, and the
RawTFNet network code is vendored into the repo.

---

## Phase 1 — Fake-it prototype · Week 1

Wire the **entire** product with a random-walk score generator. **Zero ML.**

| # | Task | Owner |
|---|---|---|
| 1.1 | Kotlin foreground service (type `microphone`) + RN bridge skeleton | Native |
| 1.2 | `TelephonyManager` call detection → emits `CALL_STARTED` to JS | Native |
| 1.3 | Fake score generator emitting a smooth random walk at 4 Hz | Native |
| 1.4 | Risk meter in `react-native-skia`, 60 fps, driven by bridge events | Frontend |
| 1.5 | Overlay warning above threshold (`SYSTEM_ALERT_WINDOW`) | Frontend |
| 1.6 | Mode A: `react-native-webrtc` two-device call working | Frontend |
| 1.8 | Go WebRTC signalling server + coturn deployed | Backend |
| 1.9 | Simulated bank-approval screen that blocks at high score | Frontend |

**Gate 1: the demo looks finished.** Show it to someone outside the team without
explaining. If they believe it works, the gate passes. This is the single most
important gate in the project.

---

## Phase 2 — Real model in the loop · Week 2

| # | Task | Owner |
|---|---|---|
| 2.1 | ONNX export (opset 17) + int8 quantisation of RawTFNet-32; parity check (500 clips, <1 pt EER drift) | ML |
| 2.2 | Same for Silero VAD and ECAPA-TDNN | ML |
| 2.3 | Integrate `onnxruntime-android` into the Kotlin module | Native |
| 2.4 | Ring buffer: **64,600-sample (4.04 s) window, 1.0 s hop**, 16 kHz mono | Native |
| 2.5 | Replace fake score with the real chain: VAD → ECAPA → RawTFNet-32 → fusion | Native |
| 2.6 | EMA (α=0.4, 4 windows) + hysteresis (75/45) + warm-up "analysing" state | Native |
| 2.7 | Measure real latency on a 4 GB device with Android Profiler | Native |
| 2.8 | Voice enrollment flow + Keystore-encrypted embedding | Frontend + Native |
| 2.9 | **Generate Hindi XTTS-v2 / F5-TTS clones and fine-tune.** Pretrained checkpoints score near chance on modern TTS — without this the live demo fails | ML |
| 2.10 | Baseline eval: clean → codec → In-the-Wild → own modern-TTS set | ML |

**Gate 2:** clone a teammate with XTTS-v2, play it into the device, meter goes red
within ~5 s (4 s window + inference). Latency measured on real hardware and
written down.

⚠️ **If the meter does not go red, that is expected with a pretrained checkpoint** —
both architectures score near chance on modern neural-TTS. Fine-tuning on your own
clones (task 2.9) is what fixes it. Do not skip it to week 3.

---

## Phase 3 — The differentiators · Weeks 3-4

This is where marks are actually won.

| # | Task | Owner | Why it matters |
|---|---|---|---|
| 3.1 | **Build the replay corpus** — play spoofed audio through phone speakers, re-record on 3 devices | ML + Native | Nobody else will have this. It is our real IP. |
| 3.2 | Codec augmentation: G.711 μ-law, AMR-NB 12.2k, Opus 8k, MUSAN, RIRs | ML | The before/after 8 kHz table |
| 3.3 | **Extend** clone generation to more regional languages and engines (OpenVoice v2, RVC) | ML | Broadens the novelty claim started in week 2 |
| 3.4 | Fine-tune RawTFNet-16 on augmented + replay + Indian data | ML | The headline number |
| 3.5 | **Hold out one entire TTS engine from training** | ML | Answers "what about next month's cloner" |
| 3.6 | Prosody heuristics + logistic fusion + per-signal explainability | ML + Native | Generalisation argument |
| 3.8 | Full eval sweep, produce the honesty table | ML | The winning slide |

**Gate 3:** the honesty table is filled with real measured numbers, and the
In-the-Wild figure is meaningfully better than the pretrained baseline.

---

## Phase 4 — Prevention, polish, rehearsal · Weeks 5-6

| # | Task | Owner |
|---|---|---|
| 4.1 | Mode A step-up verification interlock on the approval flow | Frontend + Backend |
| 4.2 | Threshold slider with live FPR/FNR curve | Frontend |
| 4.3 | Trusted-contact notification | Frontend |
| 4.4 | Evidence pack: hash + timeline + per-signal breakdown → PDF | Backend |
| 4.5 | FastAPI enterprise console + REST endpoint + gRPC stub | Backend |
| 4.6 | Battery-optimisation exemption onboarding flow | Native |
| 4.7 | Test on 5+ real devices; fix OEM-specific failures | All |
| 4.8 | Signed release APK; offline install backup on 2 USB drives | All |
| 4.9 | **Rehearse the full demo 30+ times** | Presenters |

**Gate 4:** the complete demo runs end-to-end, on the actual demo device, in
aeroplane mode where possible, three times consecutively without a failure.

---

## Team assignment

| Members | Owns | Critical note |
|---|---|---|
| 2× Frontend | RN screens, meter, WebRTC UI, enrollment, shield prompt | Start learning Kotlin bridge basics in week 1 |
| 2× Backend | Go signalling, FastAPI, DB, evidence pack — **one co-owns native Kotlin** | Native is the critical path; two people must know it |
| 1× AI/ML | Training, replay corpus, augmentation, ONNX export, eval | Start the replay corpus in week 2, not week 4 |
| 4× Presenters (overlapping) | Narrative, slides, Q&A | Must be able to answer the Android restriction question cold |

**Highest-priority skill gap:** nobody has native Android experience. Two people
begin foreground service + `TelephonyManager` work on Day 1, in parallel with
everything else. This is the schedule risk that sinks the project if deferred.

---

## Hard rules

1. **Hand-write the Kotlin ring buffer and windowing yourself.** Generated code
   produces subtly broken audio buffering — off-by-one hop sizes, sample-rate
   drift — which is invisible until accuracy is mysteriously 20 % low.
2. **16 kHz mono everywhere, and exactly 64,600 samples per window.** Sample-rate
   or window-length mismatch is the most common cause of "worked in Colab, dead in
   the demo".
3. **Audio never crosses the RN bridge.** Only the score.
4. **Never score silence.** VAD gate first, always.
5. **Test on real devices from week 1.** Emulators do not reproduce OEM audio
   behaviour, which is the entire risk surface here.
6. **Freeze features at end of week 5.** Week 6 is rehearsal and bug-fixing only.
