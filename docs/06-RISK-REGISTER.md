# 06 — Risk Register

| ID | Risk | Sev | Prob | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | **Android blocks mic capture during calls** — Mode B's premise fails | 🔴 Critical | **High** | Kill-test on day 1 (doc 00). Mode B keeps **automatic call detection** (`TelephonyManager` is unrestricted) and becomes **one-tap capture arm**. USP survives as zero-recall protection. | Native |
| R-2 | **Pretrained models score NEAR CHANCE on modern neural-TTS** (~53 % EER on CD-ADD class) — the exact class XTTS-v2 and F5-TTS belong to. **A stock checkpoint will not detect our own stage demo.** | 🔴 Critical | **Certain** | Fine-tune on self-generated modern-TTS clones **in week 2**, not week 3. Augmentation from epoch 1. Select on out-of-domain EER. | ML |
| R-2b | Model fails on realistic audio generally (~38 % In-the-Wild) | 🔴 Critical | High | Replay corpus + codec augmentation; present the five-number honesty table. | ML |
| R-3 | **Team has zero native Android experience** | 🟠 High | Certain | Two people start Kotlin work on Day 1. Foreground service prototyped in isolation before integration. | Native pair |
| R-4 | **OEM battery optimisation kills the foreground service** | 🟠 High | High | Foreground service type `microphone`; battery-exemption request at onboarding; test on Xiaomi + Samsung + stock from week 1. | Native |
| R-5 | **Live demo fails on stage** | 🟠 High | Medium | Pre-recorded backup video. Second identical device pre-configured. Demo in aeroplane mode where possible. Rehearse 30+ times. | Presenters |
| R-6 | **Latency exceeds the real-time claim** | 🟠 High | Medium | int8 quantisation; inference in Kotlin not JS; measure on a 4 GB device in week 2, not week 5. | Native |
| R-7 | **False positives destroy credibility** | 🟠 High | Medium | Hysteresis 75/45; EMA smoothing; step-up verification instead of auto-drop; user-tunable threshold shown live. | ML + Frontend |
| R-8 | **Unverified statistics in the pitch are challenged** | 🟠 High | Medium | Delete any figure without a primary source link. One verified stat beats five unverified. | Presenters |
| R-9 | **RN bridge janks under 4 Hz score updates** | 🟡 Medium | Medium | Skia canvas, Reanimated on UI thread, audio never crosses the bridge. | Frontend |
| R-10 | **ONNX export/quantisation fails or degrades** — RawTFNet uses channel shuffle, adaptive residual norm and DWS convs, all export-fragile | 🟠 High | Medium | Export in week 2. Parity check on 500 clips, fail if EER drifts >1 pt. If export fails, adjust ops or fall back to a plain-PyTorch-traced graph. | ML |
| R-15 | **4.04 s fixed window** — no sub-second verdict is possible with either model | 🟠 High | Certain | 4 s window / 1 s hop. Warm-up shows "analysing", never a confident score. Claim "first verdict in ~4 s, refreshed every second". | Native |
| R-16 | **RawTFNet is a 2025 paper with one maintainer and low adoption** | 🟡 Medium | Low | Vendor `_net.py` + `rawtfnet.py` into our repo on day 1. MIT licensed, self-contained. | ML |
| R-11 | **WebRTC NAT traversal fails on venue Wi-Fi** | 🟡 Medium | Medium | Self-hosted coturn; test on a mobile hotspot; local-network fallback path. | Backend |
| R-12 | **Scope creep** | 🟡 Medium | High | Two modes only. Feature freeze end of week 5. | All |
| R-13 | **ElevenLabs licence issue with training data** | 🟡 Medium | Low | Open TTS only — XTTS-v2, F5-TTS, OpenVoice v2, RVC. | ML |
| R-14 | **Dependency drift before the finale** | 🟡 Medium | Medium | Lockfiles committed day 1. No upgrades after week 4. | All |

## Checkpoints

| Date | Decision |
|---|---|
| Day 3 | Kill-test complete. Mode B's final shape locked. |
| End of week 1 | Gate 1 — does the fake-score demo look finished? If not, cut scope now. |
| End of week 2 | ONNX export + int8 parity verified. Latency measured on a 4 GB device. Fine-tuning on modern TTS underway. |
| End of week 4 | If Mode B is still unreliable, ship detect-and-prompt only and reallocate to Mode A. |
| End of week 5 | **Feature freeze.** Week 6 is rehearsal and bug-fixing only. |
