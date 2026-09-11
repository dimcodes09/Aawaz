package com.ps26104.aawaz.detector

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Judge-demo audio source: plays a bundled clip out loud AND feeds the exact
 * same PCM into the existing [ModeAPipeline].
 *
 * One buffer, two destinations. The audience hears the voice through the
 * speaker while the detector scores that same audio, so the risk on screen is
 * demonstrably about what they just heard - not a canned number.
 *
 * Nothing here duplicates the detection stack. It is an audio *source* only:
 * frames go to [PcmFrameSink], which is the same entry point the WebRTC remote
 * track uses. Resampler, ring buffer, RawTFNet and the aggregator are the
 * existing ones.
 *
 * Clips are 48 kHz mono 16-bit, matching what libwebrtc delivers, so the
 * pipeline sees identical framing either way.
 *
 * No React Native imports.
 */
class DemoAudioSource(context: Context) {

    companion object {
        const val TAG = "AAWAZ_DIAG"

        const val ASSET_REAL = "demo_real_48k.wav"
        const val ASSET_FAKE = "demo_fake_48k.wav"

        /**
         * Validated LibriSpeech / XTTS-v2 pairs (docs/15-DEMO-VOICE-DATASET.md).
         * These ship at 16 kHz, the rate the dataset was approved and scored at,
         * so they are upsampled to 48 kHz on the way out - see [play].
         */
        const val ASSET_PAIR01_HUMAN = "demo_pair01_human.wav"
        const val ASSET_PAIR01_AI = "demo_pair01_ai.wav"
        const val ASSET_PAIR02_HUMAN = "demo_pair02_human.wav"
        const val ASSET_PAIR02_AI = "demo_pair02_ai.wav"
        const val ASSET_PAIR03_HUMAN = "demo_pair03_human.wav"
        const val ASSET_PAIR03_AI = "demo_pair03_ai.wav"

        /** Selection key -> (asset, spoken label). Keeps the bridge dumb. */
        val CLIPS: Map<String, Pair<String, String>> = mapOf(
            "real" to (ASSET_REAL to "REAL HUMAN"),
            "fake" to (ASSET_FAKE to "AI VOICE"),
            "pair01_human" to (ASSET_PAIR01_HUMAN to "PAIR 01 HUMAN"),
            "pair01_ai" to (ASSET_PAIR01_AI to "PAIR 01 AI"),
            "pair02_human" to (ASSET_PAIR02_HUMAN to "PAIR 02 HUMAN"),
            "pair02_ai" to (ASSET_PAIR02_AI to "PAIR 02 AI"),
            "pair03_human" to (ASSET_PAIR03_HUMAN to "PAIR 03 HUMAN"),
            "pair03_ai" to (ASSET_PAIR03_AI to "PAIR 03 AI"),
        )

        const val SAMPLE_RATE = 48000
        /** 10 ms at 48 kHz, the same chunk size libwebrtc hands the sink. */
        const val FRAME_SAMPLES = 480
    }

    private val appContext = context.applicationContext
    private val playing = AtomicBoolean(false)

    val isPlaying: Boolean
        get() = playing.get()

    fun stop() {
        playing.set(false)
    }

    /**
     * Blocking. Call from a background thread.
     *
     * Restarts the pipeline first so each demo tap is scored from a clean ring
     * buffer and a clean EMA, then streams the clip once from its start.
     */
    fun play(assetName: String, label: String) {
        if (!playing.compareAndSet(false, true)) {
            Log.i(TAG, "DEMO_AUDIO: already playing, ignoring " + label)
            return
        }

        var audioTrack: AudioTrack? = null
        try {
            val raw = readPcm16WavFromAssets(assetName)
            if (raw.channels != 1) {
                Log.e(TAG, "DEMO_AUDIO: " + assetName + " has " + raw.channels + " ch; need mono")
                return
            }
            // The approved voice-pair dataset is 16 kHz (that is the rate it was
            // scored at). Playback and ModeAPipeline both speak 48 kHz, and
            // 48000 = 3 x 16000 exactly, so lift it by a clean integer factor.
            // The pipeline's own anti-alias filter removes the interpolation
            // images on the way back down; no detector code is involved.
            val wav = when (raw.sampleRate) {
                SAMPLE_RATE -> raw
                SAMPLE_RATE / 3 -> Wav(upsampleBy3(raw.samples), SAMPLE_RATE, 1)
                else -> {
                    Log.e(
                        TAG,
                        "DEMO_AUDIO: " + assetName + " is " + raw.sampleRate +
                            " Hz; need 48000 or 16000 Hz mono"
                    )
                    return
                }
            }
            if (raw.sampleRate != wav.sampleRate) {
                Log.i(
                    TAG,
                    "DEMO_AUDIO: " + assetName + " upsampled " + raw.sampleRate +
                        " -> " + wav.sampleRate + " Hz (x3, linear)"
                )
            }

            Log.i(TAG, "===== DEMO AUDIO START: " + label + " (" + assetName + ") =====")

            // Fresh pipeline per clip: clean ring buffer, clean aggregator.
            ModeAController.stop()
            val pipeline = ModeAController.start(appContext)
            val sink: PcmFrameSink = pipeline

            audioTrack = buildAudioTrack()
            audioTrack.play()

            val frame = ShortArray(FRAME_SAMPLES)
            var pos = 0
            var framesSent = 0

            while (playing.get() && pos + FRAME_SAMPLES <= wav.samples.size) {
                System.arraycopy(wav.samples, pos, frame, 0, FRAME_SAMPLES)
                pos += FRAME_SAMPLES

                // Audible first. A blocking write also paces the loop to real
                // time, which is exactly the cadence the pipeline expects, so no
                // separate sleep is needed.
                audioTrack.write(frame, 0, FRAME_SAMPLES, AudioTrack.WRITE_BLOCKING)
                sink.onPcmFrames(frame, FRAME_SAMPLES, wav.sampleRate, wav.channels)
                framesSent++
            }

            Log.i(
                TAG,
                String.format(
                    Locale.US,
                    "DEMO_AUDIO: %s streamed %d frames (%.2f s) to speaker + pipeline",
                    label, framesSent, framesSent * FRAME_SAMPLES / SAMPLE_RATE.toDouble()
                )
            )
            pipeline.logSummary(label)
            Log.i(TAG, "===== DEMO AUDIO END: " + label + " =====")
        } catch (t: Throwable) {
            Log.e(TAG, "DEMO_AUDIO failed for " + label + ": " + t.javaClass.simpleName + ": " + t.message, t)
        } finally {
            try {
                audioTrack?.stop()
                audioTrack?.release()
            } catch (ignored: Throwable) {
            }
            playing.set(false)
        }
    }

    private fun buildAudioTrack(): AudioTrack {
        val minBuffer = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(FRAME_SAMPLES * 2 * 4)

        return AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    // Media usage so the clip plays out loud on the speaker for
                    // the room, rather than into a call routing path.
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBuffer)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
    }

    /** Loudness hint for the demo: report current media volume so it can be raised. */
    fun mediaVolumePercent(): Int {
        return try {
            val am = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val cur = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            if (max <= 0) 0 else (cur * 100 / max)
        } catch (t: Throwable) {
            -1
        }
    }

    private class Wav(val samples: ShortArray, val sampleRate: Int, val channels: Int)

    /**
     * Integer x3 upsample with linear interpolation. Exact for 16 kHz -> 48 kHz.
     * Interpolation images sit above 8 kHz and are attenuated by the resampler
     * already in the pipeline, so nothing extra is needed here.
     */
    private fun upsampleBy3(src: ShortArray): ShortArray {
        if (src.isEmpty()) return src
        val out = ShortArray(src.size * 3)
        for (i in src.indices) {
            val a = src[i].toInt()
            val b = if (i + 1 < src.size) src[i + 1].toInt() else a
            out[i * 3] = a.toShort()
            out[i * 3 + 1] = (a + (b - a) / 3).toShort()
            out[i * 3 + 2] = (a + 2 * (b - a) / 3).toShort()
        }
        return out
    }

    /** Minimal RIFF/WAVE reader for uncompressed 16-bit PCM, read from assets. */
    private fun readPcm16WavFromAssets(assetName: String): Wav {
        val bytes = appContext.assets.open(assetName).use { it.readBytes() }
        require(bytes.size > 44) { "asset too small to be a WAV" }
        require(tag(bytes, 0) == "RIFF" && tag(bytes, 8) == "WAVE") { "not a RIFF/WAVE asset" }

        var pos = 12
        var sampleRate = 0
        var channels = 0
        var bitsPerSample = 0
        var dataOffset = -1
        var dataLength = 0

        while (pos + 8 <= bytes.size) {
            val chunkId = tag(bytes, pos)
            val chunkSize = le32(bytes, pos + 4)
            val body = pos + 8
            when (chunkId) {
                "fmt " -> {
                    channels = le16(bytes, body + 2)
                    sampleRate = le32(bytes, body + 4)
                    bitsPerSample = le16(bytes, body + 14)
                }
                "data" -> {
                    dataOffset = body
                    dataLength = minOf(chunkSize, bytes.size - body)
                }
            }
            if (dataOffset >= 0 && sampleRate > 0) break
            pos = body + chunkSize + (chunkSize and 1)
        }

        require(dataOffset >= 0) { "no data chunk" }
        require(bitsPerSample == 16) { "expected 16-bit PCM, got $bitsPerSample" }

        val count = dataLength / 2
        val samples = ShortArray(count)
        var b = dataOffset
        for (i in 0 until count) {
            samples[i] = ((bytes[b].toInt() and 0xFF) or (bytes[b + 1].toInt() shl 8)).toShort()
            b += 2
        }
        return Wav(samples, sampleRate, channels)
    }

    private fun tag(b: ByteArray, o: Int) = String(b, o, 4, Charsets.US_ASCII)

    private fun le16(b: ByteArray, o: Int) =
        (b[o].toInt() and 0xFF) or ((b[o + 1].toInt() and 0xFF) shl 8)

    private fun le32(b: ByteArray, o: Int) =
        (b[o].toInt() and 0xFF) or ((b[o + 1].toInt() and 0xFF) shl 8) or
            ((b[o + 2].toInt() and 0xFF) shl 16) or ((b[o + 3].toInt() and 0xFF) shl 24)
}
