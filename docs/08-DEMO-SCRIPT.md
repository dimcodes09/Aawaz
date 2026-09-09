# 08 — Demo Script

**Total: 5 minutes. Rehearse 30+ times on the actual demo device.**

---

## Setup checklist (night before)

- [ ] Two devices paired and tested for Mode A on a mobile hotspot, not venue Wi-Fi
- [ ] coturn reachable; fallback local-network path tested
- [ ] XTTS-v2 loaded and **warm** on the laptop (cold start kills the room)
- [ ] Volunteer's consent recorded in writing
- [ ] Backup video of the full working demo on the laptop **and** on a phone
- [ ] Second identical device, fully configured, in a bag
- [ ] Offline APK on two USB drives
- [ ] Battery-optimisation exemption already granted on both devices
- [ ] Aeroplane mode tested for the Mode B segment

## The run

| # | Time | Action | Line to say |
|---|---|---|---|
| 1 | 0:00 | Open on the problem, one verified statistic only | "A cloned voice needs about ten seconds of audio. Here is what that costs India." |
| 2 | 0:30 | **Volunteer speaks 15 s into the mic** (consent already given) | "We are going to clone your voice, with your permission, right now." |
| 3 | 0:45 | Cloning runs — **fill the silence, do not stand quietly** | Explain the two modes while it processes |
| 4 | 1:15 | Play the clone into a Mode A call | "This is a bank approval call. Watch the meter." |
| 5 | 1:25 | Meter spikes red within ~2 s | "Sub-150 ms inference, a fresh verdict every 250 ms." |
| 6 | 1:40 | Transfer approval blocked → step-up verification | "We do not drop the call. We interrupt the transaction." |
| 7 | 2:10 | **Aeroplane mode on.** Repeat detection | "Detection just ran with no network. It never left the phone." |
| 8 | 2:40 | Mode B: place a real call, shield appears **on its own**, tap once | "We never asked you to open the app." |
| 9 | 3:10 | **The honesty slide** — five EER numbers, baseline vs ours | "Everyone shows one number. Here are five, including the ones that hurt." |
| 10 | 3:50 | Drag the threshold slider live, FPR/FNR moves | "A false positive is worse than a false negative here. You control it." |
| 11 | 4:20 | Evidence pack PDF generated | "Attachable to a cybercrime complaint. Contains no audio — because we never had any." |
| 12 | 4:40 | Close on the Android restriction finding | "We tested on three OEMs before designing. Any team claiming automatic carrier interception has not." |

## Failure playbook

| If this fails | Do this |
|---|---|
| Live cloning is slow | Pre-cloned sample on the laptop, ready to play. Never wait in silence. |
| Mode A call will not connect | Switch to hotspot. Then to the backup video. |
| Mode B shield does not appear | Say the OEM finding out loud, show the matrix, move on. **This is a prepared answer, not a failure.** |
| Meter does not spike | Second device from the bag. Keep talking. |
| Device crashes | Backup video. "Let me show you the recorded run while I restart." |

**Rule: never apologise for more than one sentence, and never debug on stage.**

## The three questions, prepared

**"What is your false positive rate?"**
> Point at the slider. Give the EER number. "We never auto-block on score alone —
> high risk triggers step-up verification, so the user always has a path forward."

**"Does it work on a compressed 8 kHz call?"**
> Show the codec augmentation table. Give the before/after number.

**"What about a cloner released next month?"**
> "We held out an entire TTS engine from training. Here is that number. We also
> fuse four independent signals, so no single artefact is the whole detector."
