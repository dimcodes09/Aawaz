# 04 — Tech Stack

## 1. Mobile app

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React Native, bare CLI** | Custom native modules + foreground service. Expo config plugins can do it, but that is an extra abstraction for a team with zero native experience. |
| Languages | TypeScript (JS side), **Kotlin** (native side) | |
| Navigation | React Navigation | |
| Styling | NativeWind (Tailwind for RN) | Team already knows Tailwind |
| Animation | Reanimated 3 | Runs on UI thread, not JS thread |
| Risk meter | **`react-native-skia`** | 60 fps canvas. Do **not** animate with React state at 4 Hz — it will jank. |
| KV storage | `react-native-mmkv` v3 | Settings, threshold, flags — synchronous, no UI-thread stall |
| SQLite | `@op-engineering/op-sqlite` | Score history, sessions, trusted contacts |
| Secure storage | `react-native-keychain` → Android Keystore | Voiceprint encryption (hardware-backed) |
| State | Zustand | |
| Overlay | `SYSTEM_ALERT_WINDOW` + native overlay | Full-screen warning |
| Permissions | `react-native-permissions` | |

## 2. Native Android module — the critical path

| Component | API | Permission |
|---|---|---|
| Call detection | `TelephonyManager` + `PhoneStateListener` | `READ_PHONE_STATE` |
| Background persistence | Foreground Service, `type="microphone"` | `FOREGROUND_SERVICE_MICROPHONE` (mandatory Android 14+) |
| Audio capture | `AudioRecord`, `MediaRecorder.AudioSource.MIC`, 16 kHz PCM16 mono | `RECORD_AUDIO` |
| **Inference** | **`onnxruntime-android`** (Kotlin, not the RN binding) | — |
| Bridge | `ReactContextBaseJavaModule` + `DeviceEventEmitter` | — |
| Battery | `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` intent at onboarding | — |
| File decode (demo insurance only) | `MediaExtractor` + `MediaCodec` | `READ_MEDIA_AUDIO` |

**Why inference lives in Kotlin, not `onnxruntime-react-native`:** pushing
Float32 audio arrays across the JS bridge 4× per second janks the UI and burns
battery. Running inference in-process means audio never leaves the native layer
and detection keeps working when the JS thread is suspended. Only one float
crosses the bridge per verdict.

## 3. On-device models

| Model | Source | Licence | Size (int8) | Latency | Job |
|---|---|---|---|---|---|
| Silero VAD | snakers4/silero-vad | MIT | ~1 MB | <5 ms | Speech gate |
| ECAPA-TDNN | SpeechBrain | Apache-2.0 | ~6 MB | ~25 ms | Speaker attribution |
| **RawTFNet-32** | `SpeechAntiSpoofingBenchmarks/RawTFNet` | **MIT** | ~0.7 MB | measure wk2 | **Spoof detection — FINAL** |

Export: `torch.onnx.export()` → `onnxruntime.quantization.quantize_dynamic()`.
Total footprint under 12 MB.

**MODEL DECISION: LOCKED — RawTFNet-32.** Not revisited.

Input contract: exactly **64,600 samples (4.04 s), 16 kHz mono float32**.
Output: 2 logits, index 1 = bona fide. Window 4.04 s, hop 1.0 s.

Two engineering notes that follow from this choice, to be handled in week 2:
- RawTFNet uses channel shuffle, adaptive residual normalisation and
  depthwise-separable convolutions. These are export-fragile ops — run
  `torch.onnx.export` (opset 17) and the int8 parity check in **week 2**, not week 4.
- **Vendor `_net.py` and `rawtfnet.py` into our repo on day 1.** The upstream repo
  has one maintainer; MIT licence permits it. Do not depend on the Hub at build time.

## 4. ML training (offline, Python)

| Item | Choice | Note |
|---|---|---|
| Framework | PyTorch 2.x + torchaudio | Pin the version |
| Base checkpoints | RawTFNet-32 + AASIST-L (both MIT) | Reuse, then fine-tune. Do not reimplement. **Vendor the network code locally.** |
| Benchmark data | ASVspoof 2019 LA, 2021 LA + DF, In-the-Wild, ASVspoof 5 | Free, registration required |
| **Attack generation** | **XTTS-v2, F5-TTS, OpenVoice v2, RVC** | Open licences. **Do not use ElevenLabs** — their terms restrict derivative model use. |
| **Replay corpus** | Self-recorded: spoof audio played through phone speakers, re-captured on 3 devices | **Our actual IP** |
| Augmentation | ffmpeg (G.711 μ-law, AMR-NB 12.2k, Opus 8k), MUSAN noise, OpenSLR RIRs | |
| Tracking | Weights & Biases (free tier) | Judges respond well to real training curves |
| Compute | Colab Pro / Kaggle T4 | RawTFNet-16 is small; this is sufficient |

## 5. Backend — **none of it is in the audio path**

| Service | Choice | Purpose |
|---|---|---|
| WebRTC signalling | **Go** + Gorilla WebSocket | Concurrent WS connections — Go's genuine strength |
| TURN/STUN | coturn | NAT traversal |
| Enterprise API + console | **FastAPI** | REST + gRPC, score ingestion, dashboard |
| **Database** | **PostgreSQL 16** | Orgs, users, anonymised score events, audit log. **Never raw audio, never voiceprints.** |
| **Cache / session** | **Redis** | WebRTC signalling state, presence, rate limits. TTL-based, ephemeral. |
| ORM + migrations | SQLAlchemy 2.0 + Alembic | |
| Auth | JWT (`python-jose`) + bcrypt | Enterprise console only |
| Evidence PDF | ReportLab | |
| **Object storage** | **NONE — deliberate** | There is no audio to store. State this in the pitch. |
| Deploy | Railway / Render (services), Vercel (console UI) | |

**The Go vs FastAPI question, settled:** Go handles signalling, FastAPI handles
the enterprise API and ML tooling, and **neither touches audio** — inference is
on-device. One sentence, clean, defensible.

## 6. Tooling

| Purpose | Tool |
|---|---|
| Version control | Git + GitHub, protected `main` |
| Native builds | Android Studio (Ladybug+), Gradle |
| Design | Figma |
| API testing | Postman |
| Profiling | Android Studio Profiler (latency + battery) |
| Crash reporting | Sentry (optional) |

## 7. Deliberately rejected

| Option | Why not |
|---|---|
| Expo managed workflow | Foreground services + custom Kotlin modules add friction for a team new to native |
| Flutter | Discards the team's existing React/TS skills |
| `onnxruntime-react-native` | Forces audio across the JS bridge |
| MFCC / CQT features | AASIST is a **raw-waveform** model with a sinc-conv front end. The original doc's MFCC+CQT line contradicts the chosen architecture — removed. |
| ASVspoof PA track for Mode B | PA replays **bona-fide human** speech; Mode B replays **TTS** speech. Different artefacts, near-zero transfer. Build our own replay corpus instead. |
| ElevenLabs for training data | Licence restriction on derivative models |
| Server-side inference | Breaks the on-device privacy claim, adds latency, creates DPDP exposure |
| Go anywhere near inference | The entire anti-spoofing ecosystem is Python/ONNX |


---

## 8. Storage architecture — the full picture

| Layer | Technology | Contents | Leaves device? |
|---|---|---|---|
| On-device secure | Android Keystore (hardware-backed) | Voiceprint embedding, encryption keys | **Never** |
| On-device KV | MMKV | Settings, threshold, onboarding flags | **Never** |
| On-device relational | SQLite (`op-sqlite`) | Score history, sessions, trusted contacts, evidence metadata | **Never** |
| Server relational | PostgreSQL 16 | Orgs, users, anonymised scores, audit log | Mode A / enterprise only |
| Server cache | Redis | Signalling session state, presence, rate limits | Ephemeral |
| Object storage | **NONE** | — | **No audio exists to store** |

### Server schema

| Table | Key columns |
|---|---|
| `organizations` | id, name, plan, threshold_policy |
| `users` | id, org_id, role, email_hash |
| `sessions` | id, org_id, started_at, ended_at, mode |
| `score_events` | id, session_id, ts, risk_score, signal_breakdown (jsonb) |
| `alerts` | id, session_id, ts, level, action_taken |
| `evidence_packs` | id, session_id, audio_sha256, timeline (jsonb), created_at |
| `audit_log` | id, actor_id, action, ts |

**No table contains audio. No column stores a voiceprint.** Enforce this at the
schema level and in a CI check, so a future contributor cannot add one by accident.

Note `evidence_packs.audio_sha256` stores a **hash**, not audio — it proves a
given recording matches the analysed session without retaining the recording.

## 9. Infrastructure and tooling

| Purpose | Tool |
|---|---|
| Go signalling + FastAPI + Postgres + Redis | Railway or Render |
| Console UI | Vercel |
| Local dev | Docker + docker-compose |
| Native builds | Android Studio (Ladybug+) + Gradle |
| VCS | GitHub, protected `main`, PR review required |
| CI | GitHub Actions — lint, test, APK build |
| Design | Figma |
| API testing | Postman |
| Profiling | Android Studio Profiler (latency + battery) |
| ML tracking | Weights & Biases |
