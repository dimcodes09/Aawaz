# 00 — Android Audio Capture Feasibility (empirical)

On-device measurement of whether a **normal, non-privileged third-party app**
receives the REMOTE party's voice via `AudioRecord(MediaRecorder.AudioSource.MIC)`
during an active carrier call on speakerphone.

Only Play-Store-legal APIs were used. No `VOICE_CALL`, `VOICE_DOWNLINK`,
`VOICE_UPLINK`, `CAPTURE_AUDIO_OUTPUT`, AccessibilityService, or root. A negative
result is a valid result and was not worked around.

**Verdict: SILENCED BY OS.** See [The gate](#the-gate).

## Device under test

| Manufacturer | Model | Android version | API level | Serial |
|---|---|---|---|---|
| vivo | V2502 | 16 | 36 | 10BF7B0H6A0046E |

## Capture configuration

| Parameter | Value |
|---|---|
| Audio source | `MediaRecorder.AudioSource.MIC` |
| Sample rate | 16000 Hz |
| Channel | `CHANNEL_IN_MONO` |
| Encoding | `ENCODING_PCM_16BIT` |
| Buffer size | `AudioRecord.getMinBufferSize(...) * 4` |
| Window | 500 ms per emitted CSV row |

## Data provenance

Source: `docs/aawaz_diag.csv`, 1,064 data rows.

The file contains two runs. They are separated by an `uptimeMillis` gap of
**17,654,545 ms (4.90 h)** between row index 342 and 343.

| | rows | uptime range |
|---|---|---|
| Earlier aborted run — **discarded** | 343 | 186,658,309 – 186,840,615 |
| Re-run — **analysed below** | 721 | 204,495,160 – 206,493,036 (1,997.9 s) |

`docs/aawaz_diag_logcat.txt` exists but **does not cover the analysed session**.
Its CSV rows span 186,658,309 – 186,840,615, i.e. exactly the 343 discarded rows
of the aborted run, and it carries no STEP 4 banner. Step boundaries for the
analysed session were therefore recovered by the fallback method — segmentation
on `callState` plus the RMS step change — and **all step labels below are
inferred, at lower confidence than banner-matched boundaries would be**.

One boundary could not be recovered at all. The OFFHOOK block contains no RMS
step change because every row in it is identical, so the STEP 3 / STEP 4 split
is an arbitrary halving of the speakerphone rows. This does not affect any
conclusion: both halves are identical.

## Startup facts

Omitted for the analysed session. The startup banner is only present in the
logcat of the aborted run, which is a different `AudioRecord` instance, so
quoting its `audioSessionId` or buffer sizes here would be misattribution.

What the data itself proves about initialisation: `AudioRecord.read()` returned
**+320 on every row of the analysed session with zero negative returns**, which
an uninitialised or non-recording `AudioRecord` cannot do.

For reference only, the aborted run's banner reported
`getMinBufferSize=1280 bytes`, `audioRecord.state=1`, `recordingState=3`,
`audioSessionId=68185` — same device, same build, different session.

## Validation

| Check | Result |
|---|---|
| Any segment under 20 rows | None. Smallest is STEP 1 at 36 rows. |
| Gaps > 2000 ms in retained session | One: **1,637,094 ms (27.3 min)** at idx 277→278, `IDLE→IDLE`, `NORMAL→NORMAL`. Sits before the call; does not touch steps 3, 4 or 5. |
| Gaps inside the OFFHOOK block | **None.** Largest consecutive gap during the call is 640 ms. Capture ran continuously for all 141.8 s. |
| STEP 3 validity gate | **PASSES** on 273 rows — `callState=OFFHOOK`, `audioMode=IN_CALL`, `outputDevice=BUILTIN_SPEAKER` all hold with no exceptions. |
| Negative `readResult` | **0 rows** in the entire retained session. |
| `dbfs == -999.0` (exact digital silence) | **550 rows**, of which **283 are the entire OFFHOOK block** and 264 more are a pre-call `IN_COMMUNICATION` / `BLUETOOTH_SCO` stretch. |

The first 11 OFFHOOK rows report `BUILTIN_EARPIECE` — speakerphone was not yet
engaged — and are excluded from STEP 3 and STEP 4 so the gate is measured only
on genuine speakerphone rows.

## Results

First 2 rows of each segment dropped as settling.

| Step | Median RMS | Peak | dBFS | zeroRatio | readResult | Interpretation |
|---|---|---|---|---|---|---|
| 1 — no call, room silent (noise floor) | 164.2 | 668 | −46.0 | 0.003 | +320, no negatives | Valid noise floor. Mic healthy. |
| 2 — no call, local speaking ~30 cm | 1508.3 | 8651 | −26.7 | 0.001 | +320, no negatives | 9.2× the floor. Capture demonstrably works. |
| 3 — carrier call, speakerphone, REMOTE speaking only | **0.0** | **0** | **−999.0** | **1.000** | +320, no negatives | **Absolute digital silence. Valid stream, no content.** |
| 4 — carrier call, speakerphone, local speaking | **0.0** | **0** | **−999.0** | **1.000** | +320, no negatives | **Also silent. The mute is not remote-specific.** |
| 5 — call ended, room silent (recovery) | 166.7 | 625 | −45.9 | 0.002 | +320, +2560 | Returns to the STEP 1 floor. Full recovery. |

Stability (min / max RMS within segment):

| Step | rows used | min RMS | max RMS |
|---|---|---|---|
| 1 | 34 | 113.3 | 415.6 |
| 2 | 63 | 100.3 | 3228.5 |
| 3 | 134 | 0.0 | 0.0 |
| 4 | 135 | 0.0 | 0.0 |
| 5 | 43 | 0.0 | 1008.7 |

Context columns observed per segment:

| Step | callState | audioMode | outputDevice |
|---|---|---|---|
| 1 | IDLE | NORMAL | BUILTIN_EARPIECE |
| 2 | IDLE | NORMAL | BUILTIN_EARPIECE |
| 3 | OFFHOOK | IN_CALL | BUILTIN_SPEAKER |
| 4 | OFFHOOK | IN_CALL | BUILTIN_SPEAKER |
| 5 | IDLE | IN_CALL, NORMAL | BUILTIN_SPEAKER, BUILTIN_EARPIECE |

Across all 284 OFFHOOK rows there is exactly one non-zero row — the first
(`rms 37.7, peak 370`), the tail of the pre-call buffer — and it falls in the
earpiece rows excluded from the gate. The other 283 are precisely
`rms 0.0, peak 0, dbfs -999.0, zeroRatio 1.000`.

## The deciding comparison

| | Median RMS |
|---|---|
| STEP 1 — noise floor | **164.2** |
| STEP 3 — remote talking on speakerphone | **0.0** |
| STEP 4 — local talking on speakerphone (control) | **0.0** |

**STEP 3 / STEP 1 ratio = 0.000.**

The control did not behave as hypothesised. STEP 4 is not high — it is also
exactly zero. The platform is **not** selectively excluding remote audio while
passing local audio. It mutes the third-party microphone feed entirely for the
duration of the call, in both directions.

## The gate

- **STEP 3 RMS clearly above the floor (~2x or more) and zeroRatio low**
  → **CAPTURE WORKS.** Mode B proceeds as one-tap Guardian.
- **STEP 3 RMS at the floor, or zeroRatio near 1.000**
  → **SILENCED BY OS.** Mode B becomes detect-and-warn only.
- **`audioRecord.state == 0`, or `read()` returns negative during the call**
  → **HARD BLOCKED.** Same product outcome, recorded as a distinct finding.

`zeroRatio` is the discriminator between the second and third outcomes: Android
commonly returns a *valid* stream of pure silence rather than an error during a
call. A silenced stream and a failed stream are different findings.

### Verdict: SILENCED BY OS

Justified by these numbers specifically:

- STEP 3 median RMS **0.0** against a STEP 1 floor of **164.2**. Not merely at
  the floor — below it, at absolute digital zero. Ratio 0.000.
- STEP 3 median zeroRatio **1.000**. Not "near" 1.000; exactly 1.000 on all 273
  speakerphone rows.
- **Not HARD BLOCKED.** `read()` returned **+320 on every row with zero negative
  returns** — no `ERROR_INVALID_OPERATION`, `ERROR_BAD_VALUE` or
  `ERROR_DEAD_OBJECT`. Android delivered a valid, correctly sized, uninterrupted
  PCM stream containing nothing but zeros. This is exactly the case `zeroRatio`
  was added to catch.
- **Not CAPTURE WORKS**, by a wide margin. STEP 2 at 1508.3 (9.2× the floor) and
  STEP 5 recovery at 166.7 prove the microphone path is healthy immediately
  before and after the call. The silence is call-scoped, not a broken capture
  chain.

**Product consequence: Mode B becomes detect-and-warn only.** Live capture of
the remote party's voice during a carrier call is not available to a
Play-Store-legal app on this device.

## Findings

**1. The mute is blanket, not remote-selective.** STEP 4 was the control for
this and it reads 0.0, identical to STEP 3. Once `audioMode` reaches `IN_CALL`,
the third-party MIC feed is zeroed regardless of who is speaking. This is a
sharper and more final result than "remote audio is excluded": there is no
partial signal to work with, in either direction.

**2. Silencing is not unique to carrier calls.** In the retained session, 264
rows before the call also read `rms 0.0 / zeroRatio 1.000`, while `callState`
was `IDLE` but `audioMode` was `IN_COMMUNICATION` on a `BLUETOOTH_SCO` route —
another app held the communication audio path. The same zeroing applied. The
trigger appears to be ownership of the communication audio path, not the carrier
call as such. Worth confirming deliberately if VoIP detection is ever
reconsidered.

**3. Mid-call stall: did not recur.** The re-run's OFFHOOK block is continuous —
141.8 s with a maximum consecutive gap of 640 ms and no dropped rows. The
service was not killed during the call, so the zeros are a genuine platform
result and not an artefact of Funtouch OS suspending the service. Disabling
battery optimisation before the run appears to have worked.

Note on the 123 s mid-call stall reported from an earlier run: **it is not
present in either session in this CSV.** The aborted run's largest gap is
11,846 ms (11.8 s), between two `IDLE` rows. That run also never reached
`OFFHOOK` at all — it contains zero OFFHOOK rows, which is presumably why it was
aborted. If the 123 s stall matters, its data is not in this file.

**4. One 27.3-minute gap in the retained session**, at idx 277→278, between two
`IDLE`/`NORMAL` rows well before the call. Consistent with the capture being
stopped and restarted during test setup. Without a logcat for this session it
cannot be distinguished from a service kill, but either way it precedes the call
and affects no measured step.

## What would need re-running to strengthen this

The conclusion is sound on the evidence, but two gaps are worth closing if this
finding is ever challenged:

1. **Capture the logcat for the same session as the CSV.** The supplied logcat
   is from the aborted run, which cost banner-accurate step boundaries and the
   startup facts. Redirect logcat to a file with `-v time` before pressing START
   and keep it running until after STOP.
2. **Press MARK STEP 4.** The aborted run has no STEP 4 banner and the re-run's
   boundary had to be inferred by halving. With every step marked, the STEP 3 /
   STEP 4 split becomes fact rather than inference.
