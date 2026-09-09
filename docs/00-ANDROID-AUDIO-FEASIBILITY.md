# 00 — Android Audio Capture Feasibility

**Status: BLOCKING. Read before writing any other code.**
**Owner: Native/Android pair. Deadline: Day 3.**

---

## 1. The finding

The original Mode B design assumed a third-party Android app can capture the
remote caller's voice during a live carrier call, using the microphone while
the call is on speakerphone. **This assumption is false on Android 11 and above.**

Timeline of the restriction:

| Version / Date | Change |
|---|---|
| Android 10 (2019) | Direct call-audio API closed to third-party apps |
| Android 11 (2020) | The speakerphone-microphone workaround also closed |
| May 2022 | Play Store policy bars the Accessibility API for call-audio capture; hundreds of apps removed |
| 2023 onward | OEMs ship native call recording in their own dialer using privileged system APIs |

Native dialers (Google Phone, Samsung One UI) work because they are **system
applications holding signature-level permissions**. That path is not available
to an app distributed through the Play Store.

## 2. Every path evaluated

| Approach | API | Verdict |
|---|---|---|
| Downlink capture | `AudioRecord(VOICE_CALL)` / `VOICE_DOWNLINK` | Requires `CAPTURE_AUDIO_OUTPUT`, a signature/privileged permission. **Not grantable.** |
| Ambient capture | `AudioRecord(MIC)` during active call | Telephony holds input priority. Returns silence or near-silence on most OEMs. **Best-effort only.** |
| Other-app VoIP capture | `AudioPlaybackCapture` (Android 10+) | Apps using `USAGE_VOICE_COMMUNICATION` (WhatsApp, Signal, Meet) are **non-capturable by design.** |
| Accessibility workaround | `AccessibilityService` | **Banned by Play Store policy.** Automatic rejection. |
| Default dialer | `InCallService` + `ROLE_DIALER` | Grants call *control* (answer, mute, end), **not raw audio frames.** |
| Root / Xposed / custom ROM | — | Not deployable. Not demoable. Disqualifying. |
| **Own VoIP stack** | `react-native-webrtc` / `ConnectionService` | ✅ **Full audio access. This is Mode A.** |
| File decode | `MediaExtractor` / `MediaCodec` | ✅ Full access. Kept internally as **demo insurance only**, not a product feature. |

**What still works and must be kept:** `TelephonyManager` / `PhoneStateListener`
call-state *detection* requires only `READ_PHONE_STATE` and is unaffected. We
keep automatic call detection; we lose automatic call *audio*.

## 3. The kill-test (Day 1-3)

Build a throwaway Kotlin app. No React Native, no UI, no model.

```kotlin
// Foreground service, type "microphone"
val rec = AudioRecord(
    MediaRecorder.AudioSource.MIC,
    16000,
    AudioFormat.CHANNEL_IN_MONO,
    AudioFormat.ENCODING_PCM_16BIT,
    bufSize
)
rec.startRecording()
// every 500 ms:
val rms = sqrt(buf.map { it.toDouble() * it }.average())
Log.d("KILLTEST", "rms=$rms state=${tm.callState}")
```

### Protocol
1. Install on **3 physical devices**, different OEMs — one Xiaomi/Redmi, one
   Samsung, one stock Android (Pixel/Motorola/Nothing).
2. Place a real carrier call. Put it on **speakerphone**.
3. Have the remote party speak while the local user stays completely silent.
4. Record the RMS value in the matrix below.
5. Repeat the whole test with a **WhatsApp** call.

### Results matrix — fill this in

| Device | Android ver. | Carrier + speaker, remote talking | Carrier, local talking | WhatsApp, remote talking | Verdict |
|---|---|---|---|---|---|
| Xiaomi / Redmi | | | | | |
| Samsung | | | | | |
| Stock Android | | | | | |

### Decision rule

| Outcome | Action |
|---|---|
| Remote RMS is clearly above the silence floor on **2 or more** devices | Mode B ships as one-tap Guardian. Document which OEMs work. |
| Remote RMS is at the floor on 2 or more devices | Mode B ships as **detect-and-prompt only** — the app still warns the user that a call is in progress and offers guidance, and the OEM matrix goes in the pitch as a finding. |
| Recording fails to start at all during a call | Same as above, plus state this explicitly in the pitch as a finding. |

## 4. Why this is a strength, not a setback

Most competing teams will demo Mode B on an emulator or with a pre-recorded
audio file and never discover this. Presenting a measured OEM matrix and a
design that respects the platform's actual security model reads as engineering
maturity. The line to use:

> "We do not claim to intercept carrier call audio. Android has forbidden that
> for every third-party app since version 11, and the Play Store banned the
> Accessibility workaround in 2022. We tested this on three OEMs before
> designing around it. Any team claiming automatic carrier-call interception
> either has not tested on Android 11+ or is using a workaround that cannot ship."
