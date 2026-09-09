# 02 — Software Requirements Specification

PS26104 · AI-Powered Real-Time Detection and Prevention of Voice Cloning
Impersonation Attacks · SIH 2026 (AICTE)

---

## 1. Scope

### 1.1 In scope
- On-device detection of AI-generated / cloned speech during live voice calls
- Continuous risk scoring with configurable alerting and escalation
- One-time voice enrollment for cross-session consistency checking
- Enterprise REST/gRPC API for score consumption
- Hindi and English, architected for regional extension

### 1.2 Explicitly out of scope — state these in the pitch
- Interception of carrier/GSM call audio (OS-prohibited; see doc 00)
- Capture of audio from third-party VoIP apps (`USAGE_VOICE_COMMUNICATION` is non-capturable)
- Offline/file-based scanning as a user feature (a file-decode path exists internally as demo insurance only)
- iOS Guardian mode (iOS blocks third-party mic access during calls entirely)
- Zero-internet operation for Mode A (WebRTC requires connectivity; detection itself is offline)
- Production-grade coverage of all 22 scheduled Indian languages

## 2. Users

| Actor | Goal | Mode |
|---|---|---|
| Individual citizen | Not be defrauded by a cloned relative's voice | B |
| Elderly / low-tech user | Protection needing minimal interaction | B — auto-detect, one tap |
| Bank approval officer | Verify a high-value voice instruction | A |
| Enterprise security team | Monitor and audit voice-channel risk | A + console |
| Cyber-cell investigator | Obtain usable evidence post-incident | Evidence pack |

## 3. Functional requirements

### FR-1 Voice Enrollment
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Guide user through recording ≥30 s of their own speech | P0 |
| FR-1.2 | Generate ECAPA-TDNN embedding on-device; discard the audio | P0 |
| FR-1.3 | Store embedding encrypted via Android Keystore | P0 |
| FR-1.4 | Allow enrolling trusted contacts from a shared audio sample | P1 |
| FR-1.5 | Allow deletion of any voiceprint; deletion is immediate and irreversible | P0 |

### FR-2 Detection Core
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Accept 16 kHz mono PCM from any of the three sources | P0 |
| FR-2.2 | Produce a 0-100 risk score every 1 s (4.04 s window, 1 s hop) | P0 |
| FR-2.3 | Gate on VAD; never emit a score for a non-speech window | P0 |
| FR-2.4 | Attribute each speech turn to local user or remote party | P1 |
| FR-2.5 | Apply EMA smoothing (α=0.4, 4 windows) | P0 |
| FR-2.9 | Show an "analysing" state, not a score, until a full 4.04 s window is available | P0 |
| FR-2.6 | Apply hysteresis: raise at 75, clear at 45 | P0 |
| FR-2.7 | Expose per-signal contribution for explainability | P1 |
| FR-2.8 | Run entirely on-device; never transmit audio or features | P0 |

### FR-3 Mode A — Verified Channel
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Place and receive in-app WebRTC calls | P0 |
| FR-3.2 | Route the remote track into the detection core | P0 |
| FR-3.3 | Display a live risk meter to both participants | P0 |
| FR-3.4 | Trigger step-up verification when score ≥ 75 | P0 |
| FR-3.5 | Support browser join via one-time link for guests | P1 |
| FR-3.6 | Support org-configurable auto-drop policy, off by default | P2 |

### FR-4 Mode B — Guardian
| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Detect call start/end via `TelephonyManager` | P0 |
| FR-4.2 | On call start, surface a one-tap "Shield" overlay | P0 |
| FR-4.3 | On tap, prompt speakerphone and begin ambient capture | P0 |
| FR-4.4 | Detect a silent/blocked input stream and inform the user honestly | P0 |
| FR-4.5 | Show a full-screen warning when score ≥ 75 | P0 |
| FR-4.6 | Offer one-tap notification to a trusted contact | P1 |
| FR-4.7 | Degrade gracefully with a clear message on OEMs where capture is blocked | P0 |
| FR-4.8 | Never write captured audio to storage at any point | P0 |

### FR-6 Alerting and Evidence
| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | User-adjustable sensitivity threshold with live FPR/FNR guidance | P0 |
| FR-6.2 | Generate an evidence pack: SHA-256 hash, score timeline, per-signal breakdown, timestamps | P1 |
| FR-6.3 | Export evidence pack as PDF for cybercrime complaint attachment | P1 |
| FR-6.4 | Never include raw audio in an exported pack | P0 |

### FR-7 Enterprise API
| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | REST endpoint accepting anonymised score events | P1 |
| FR-7.2 | gRPC streaming for live session monitoring | P2 |
| FR-7.3 | Dashboard: sessions, score distribution, flagged calls | P2 |
| FR-7.4 | Reject any request containing raw audio at the schema level | P0 |

## 4. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Inference latency after window close | < 500 ms on 4 GB RAM device — **measure week 2** |
| NFR-2 | Time to first verdict from speech onset | < 5 s (4.04 s window is fixed by the model) |
| NFR-3 | Total on-device model footprint | < 12 MB |
| NFR-4 | APK size | < 60 MB |
| NFR-5 | Battery drain, Mode B active | < 6 %/hour |
| NFR-6 | Minimum supported device | Android 10, 4 GB RAM, 64 GB storage |
| NFR-7 | Detection works with no network connectivity | Mode B fully offline |
| NFR-8 | Raw audio persisted to disk | Zero bytes, always |
| NFR-9 | Cold start to armed | < 3 s |
| NFR-10 | UI frame rate during live scoring | 60 fps sustained |
| NFR-11 | Detection of clones from modern TTS (XTTS-v2, F5-TTS) | **Requires fine-tuning — pretrained checkpoints score near chance on this class** |

## 5. Accuracy targets — internal, do not publish unqualified

| Evaluation set | Baseline (RawTFNet-32 pretrained) | Target (after our work) |
|---|---|---|
| ASVspoof 2019 LA (in-domain) | 1.99 % EER | maintain |
| ASVspoof 2021 DF (codec-degraded) | 15.16 % EER | < 12 % |
| In-the-Wild (unseen, realistic) | 38.51 % EER | **< 25 %** |
| **Modern TTS (CD-ADD class)** | **~53 % EER — near chance** | **< 20 % — this is the demo-critical one** |
| Our replay corpus (Mode B path) | to be measured | < 30 % |
| Our Hindi/regional held-out set | to be measured | < 25 % |
| Held-out unseen TTS engine | to be measured | report honestly |

Two things to understand here. First, the In-the-Wild gap is the honest headline:
published checkpoints score ~2 % in-domain and ~38-44 % out-of-domain. Second and
more urgently, **both AASIST and RawTFNet score near chance on modern neural-TTS
(CD-ADD, SONAR, CVoiceFake) — the exact class that XTTS-v2 and F5-TTS belong to.**
Without fine-tuning on our own generated clones, the live demo will not detect the
voice we clone on stage. This makes fine-tuning a week-2 dependency, not a week-3
enhancement.

## 6. Constraints

| Constraint | Consequence |
|---|---|
| Android 11+ blocks call-audio capture | Mode B is one-tap ambient, not automatic capture |
| Play Store bans Accessibility for call audio | That workaround is not an option at any point |
| DPDP Act 2023 — voiceprints are sensitive personal data | On-device only; no cloud biometric storage |
| Team has zero prior native Android experience | Native work starts Day 1 and runs in parallel |
| OEM battery optimisation kills background services | Foreground service + exemption request + 3-device testing |
| ElevenLabs terms restrict derivative model use | Training data generated only with open TTS models |
