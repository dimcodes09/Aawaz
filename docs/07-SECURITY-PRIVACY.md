# 07 — Security and Privacy Design

**Core claim: no recorded call audio is ever saved. Not to disk, not to a
server, not temporarily.** This is enforced by architecture, not by policy.

---

## 1. Data inventory

| Data | Form | Location | Lifetime | Leaves device? |
|---|---|---|---|---|
| Raw call audio | 16 kHz PCM16 mono | **RAM ring buffer only, ~32 KB** | Overwritten every 1 s | **Never** |
| Window features | Float tensors | RAM, inside ONNX Runtime | Per-inference | **Never** |
| Voiceprint | 192-float ECAPA embedding | Android Keystore-encrypted | Until user deletes | **Never** |
| Risk score timeline | Integers + timestamps | Local SQLite | Until user clears | Only if org opts in |
| Evidence pack | SHA-256 hash + score timeline + signal breakdown | Local file | User-controlled | Only on explicit user export |
| Model weights | ONNX int8 | Bundled in APK | Static | N/A |

**There is no file-write call anywhere in the audio path.** This is verifiable
by code inspection and should be stated that way — a reviewer can grep the
module for `FileOutputStream` and find nothing in the capture path.

## 2. Why the voiceprint is not a privacy liability

The enrolled voiceprint is a **192-dimensional embedding, not audio**. It is a
one-way projection: speech cannot be reconstructed from it. It is stored
encrypted via Android Keystore, which is hardware-backed on most modern
devices, so the key material does not leave the secure element.

Under DPDP Act 2023, voice biometric data is sensitive personal data. Our
position: the sensitive artefact never exists in transmissible form, and the
derived embedding never leaves the device. This is a stronger posture than
"we encrypt it in transit and store it in our cloud", which is what
foreign-hosted competitors offer.

## 3. Threat model

| Threat | Exposure | Mitigation |
|---|---|---|
| Device seized / forensically imaged | Score history, encrypted voiceprint | No audio exists to recover. Voiceprint is Keystore-encrypted and non-invertible. |
| Malicious app on the same device | Cannot read another app's private storage | Android sandbox + Keystore |
| Network interception | Only signalling metadata and optional anonymised scores | TLS; audio is never transmitted |
| Server compromise | No audio, no voiceprints stored server-side | Schema-level rejection of any audio field |
| **Adversary evades the detector** | Real risk — novel TTS engines | Held-out engine evaluation; multi-signal fusion; documented as a limitation |
| False accusation from a false positive | Reputational harm to a genuine caller | Never auto-block on score alone. Step-up verification, not rejection. Explainable per-signal breakdown. |

## 4. Permissions — minimum set, each justified

| Permission | Why | User-facing explanation |
|---|---|---|
| `RECORD_AUDIO` | Mode B capture, enrollment | "To listen for AI-generated voices during a call you choose to protect." |
| `READ_PHONE_STATE` | Detect call start/end | "So we can offer protection the moment a call begins." |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MICROPHONE` | Keep monitoring alive | Persistent notification is always visible while active. |
| `SYSTEM_ALERT_WINDOW` | Shield prompt + warning overlay | "To warn you over the call screen." |
| `POST_NOTIFICATIONS` | Alerts | |
| `INTERNET` | Mode A calling only | Detection itself is fully offline. |

**Not requested:** contacts, location, storage-wide access, SMS, camera.
Every permission we skip is a slide-worthy point.

## 5. Transparency requirements

| Requirement | Implementation |
|---|---|
| User always knows when monitoring is active | Persistent foreground notification, non-dismissable |
| User can stop instantly | One tap on the notification |
| Nothing runs before consent | Mode B does nothing until the shield is tapped |
| Deletion is real | "Delete my voiceprint" wipes the Keystore entry immediately and irreversibly |
| No silent recording | Speakerphone prompt makes the state visually obvious |

## 6. Consent and legal position

- **We do not intercept carrier calls.** Android forbids it for all third-party
  apps since version 11; the Play Store banned the Accessibility workaround in
  May 2022. We operate within those limits deliberately.
- Mode A: both parties are in an app that displays live monitoring status to
  each of them. Mutual awareness by design.
- Mode B: the local user consents explicitly per call by tapping the shield.
- **No audio is retained**, so recording-consent law is largely sidestepped —
  there is no recording. Flag this to a legal reviewer before public release.

## 7. Statements the team may make, verbatim

> "Audio never touches storage. It lives in a 32 KB RAM buffer that overwrites
> itself four times a second. There is nothing to leak, nothing to subpoena,
> and nothing to recover from a seized device."

> "The voiceprint is a 192-number vector, not a recording. You cannot
> reconstruct someone's voice from it, and it never leaves the phone."

> "We deliberately do not claim to intercept carrier call audio. Android has
> forbidden that for every third-party app since version 11. We tested this on
> three OEMs before designing around it."

## 8. Statements the team must NOT make

| Do not say | Why | Say instead |
|---|---|---|
| "We intercept and analyse your calls" | False and alarming | "We listen alongside the call, with your permission, when you tap to protect it." |
| "100 % accurate" / "99 % accuracy" | Indefensible; see doc 05 | "Here are our numbers across five evaluation conditions, including the hard ones." |
| "Fully offline" (unqualified) | Mode A needs connectivity | "Detection is fully offline. Only the calling feature needs a network." |
| "We store your voiceprint securely on our servers" | We do not store it at all | "It never leaves your device." |
