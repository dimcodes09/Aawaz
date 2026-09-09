# 01 — System Architecture

## 1. Design principle

**One detection core. Two audio sources. All inference on-device.**

The detection core is written once in Kotlin, wrapping ONNX Runtime Android.
Every mode differs only in how audio reaches that core. This keeps the privacy
claim ("no biometric data leaves the device") literally true at code level, and
means a model improvement benefits both modes at once.

## 2. Mode matrix

| | Mode A — Verified Channel | Mode B — Guardian |
|---|---|---|
| **User** | Banks, enterprises, government | Individuals, live calls |
| **Audio source** | WebRTC remote track | Ambient mic, speakerphone |
| **OS restriction** | None | Capture is best-effort (see doc 00) |
| **Call detection** | App owns the call | `TelephonyManager` — **fully automatic** |
| **Capture trigger** | Automatic | **One-tap arm** on the auto-shown shield |
| **Signal quality** | Clean digital | Degraded (acoustic replay path) |
| **Can prevent?** | Yes — step-up / drop | Warn only |
| **Priority** | P0 | P0 |

### The detection / capture split — state this precisely

| | Blocked by Android? | Our behaviour |
|---|---|---|
| Call **detection** (`TelephonyManager`, `READ_PHONE_STATE`) | No — fully permitted | **Automatic.** App wakes itself, shows the shield overlay unprompted. |
| Call **audio capture** (`AudioRecord` during a call) | Yes, since Android 11 | **One tap.** User confirms, speakerphone engages, monitoring begins. |

The user never has to remember the app exists or open it. That is the meaningful
difference from manually-triggered checkers, and it survives the OS restriction
intact. Reword USP #1 from "no manual action required" to
**"zero-recall protection — you never have to remember it exists."**

**Engineering-only fallback (not a product mode, not in the pitch):** a
`MediaExtractor` file-decode path feeding the same core. Its sole purpose is
demo insurance if mic capture is blocked on the demo handset.

## 3. Layer diagram

```
┌──────────────────── React Native (TypeScript) ────────────────────┐
│  Onboarding · Enrollment · Risk meter · Alert overlay             │
│  Mode A call UI · Shield prompt · Settings & threshold            │
└──────────────▲─────────────────────────────────────┬─────────────┘
        score events                          commands
        (1 float, 4 Hz)                    (arm / disarm / scan)
┌──────────────┴─────────────────────────────────────▼─────────────┐
│                  Kotlin Native Module                             │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  DETECTION CORE  (audio NEVER crosses the bridge)       │     │
│  │  ring buffer 4.04s / hop 1.0s                            │     │
│  │    → Silero VAD          (skip silence)                  │     │
│  │    → ECAPA-TDNN          (caller vs. enrolled user)      │     │
│  │    → RawTFNet-16 int8       (spoof score)                   │     │
│  │    → prosody heuristics  (fusion input)                  │     │
│  │    → logistic fusion → EMA(α=0.3) → hysteresis           │     │
│  └────────▲──────────────▲───────────────▲─────────────────┘     │
│           │                  │                   │               │
│  TelephonyManager      AudioRecord         WebRTC track          │
│  (detect only)         (Mode B)            (Mode A)               │
│  Foreground Service, type=microphone                              │
└───────────────────────────────────────────────────────────────────┘
                              │  score + metadata only, never audio
┌─────────────────────────────▼─────────────────────────────────────┐
│  Go signalling (WebRTC, Mode A)  ·  coturn TURN/STUN               │
│  FastAPI enterprise console + REST/gRPC  ·  PostgreSQL             │
│  NOT in the audio path. Optional. App works fully without it.      │
└───────────────────────────────────────────────────────────────────┘
```

## 4. Detection core — signal chain

| Stage | Component | Budget | Notes |
|---|---|---|---|
| 1 | Ring buffer, 16 kHz PCM16 mono | — | **64,600-sample (4.04 s) window, 1.0 s hop → 1 verdict/sec.** The window length is fixed by the model and is not tunable. |
| 2 | Silero VAD (ONNX, ~1 MB) | <5 ms | Skip windows below speech threshold. Never score silence — it produces garbage scores. |
| 3 | ECAPA-TDNN (~6 MB) | ~25 ms | Cosine similarity vs enrolled voiceprint. High → local user, skip. Low → caller, score. Mode B only. |
| 4 | RawTFNet-16 int8 (~0.15 MB) | ~40-70 ms | Raw waveform in, bona-fide logit out |
| 5 | Prosody heuristics | <5 ms | Pause distribution, energy envelope, breath-gap detection |
| 6 | Logistic fusion | <1 ms | 4 inputs → single 0-100 risk score. Explainable — we can show per-signal contribution. |
| 7 | EMA smoothing, α = 0.4, 4 windows | — | Fewer windows because the hop is now 1 s, not 0.25 s |
| 8 | Hysteresis | — | **Raise at 0.75, clear only below 0.45.** Prevents oscillation at the boundary. |

**Budget: under 500 ms per window on a 4 GB device. MEASURE THIS IN WEEK 2.**

⚠️ **Do not assume a 250 ms hop is achievable.** At 5.4 GMACs per inference, a
250 ms hop demands ~21.6 GMACs/sec sustained, which a mid-range phone will not
hold. Start at a 1 s hop and tighten only if measurements allow.

### Latency — state it precisely

| Metric | Value | Use this phrasing |
|---|---|---|
| Inference latency after window close | measure (budget <500 ms) | "Sub-half-second inference" |
| Time from speech onset to **first** verdict | ~4.0 s (model needs a full 4.04 s window) | "First verdict in about four seconds, then continuous" |
| Verdict refresh rate | 1 Hz | "A fresh verdict every second" |

**Warm-up handling:** for the first 4 s of speech, tile-repeat the available audio
to 64,600 samples and display an amber "analysing" state — **do not show a
confident score**, because tile-padded input is out of distribution and its score
is unreliable.

Never claim sub-second end-to-end detection. The model requires a 4.04 s window
by construction. A judge who asks how a 4 s window yields a 300 ms verdict will
expose the claim. "First verdict in four seconds, refreshed every second" is
both true and fast enough to stop a transaction.

## 5. Speaker attribution (replaces "voice isolation")

You cannot subtract one voice from a mixed mono signal using a voiceprint. What
is achievable is **per-segment attribution**:

```
VAD segments the audio into speech turns
  → for each turn: ECAPA embedding
  → cosine similarity vs enrolled user voiceprint
  → sim > 0.65  : local user  → skip, do not score
  → sim <= 0.65 : remote party → send to RawTFNet
  → overlapping speech → mark low-confidence, exclude from EMA
```

Say "speaker attribution" or "turn-level speaker discrimination", not "voice
isolation" or "source separation". The precision matters if an audio-savvy
judge is on the panel.

## 6. Prevention layer

| Risk band | Mode A | Mode B |
|---|---|---|
| 0-44 (Low) | Green indicator | Green indicator |
| 45-74 (Elevated) | Amber banner | Amber banner |
| 75-100 (High) | **Step-up verification required** before any approval action; optional auto-drop by policy | Full-screen overlay warning; one-tap notify trusted contact |

Mode A never silently drops by default — a false positive that kills a genuine
call is worse than a warning. Auto-drop is an organisation-configurable policy,
off by default.

## 7. Data handling

| Data | Where it lives | Leaves device? |
|---|---|---|
| Raw audio | RAM ring buffer only, overwritten every 1 s | **Never** |
| Voiceprint embedding | Android Keystore-encrypted, local | **Never** |
| Risk score timeline | Local SQLite | Only if org opts in |
| Evidence pack | Local; user-initiated export | Only on explicit user action |
| Model weights | Bundled in APK | N/A |

No audio is written to disk at any point in the live path. This is the DPDP Act
answer and it should be stated as an architectural fact, not a policy promise.
