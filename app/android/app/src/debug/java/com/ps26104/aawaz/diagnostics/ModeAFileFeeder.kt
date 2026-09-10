package com.ps26104.aawaz.diagnostics

import android.content.Context
import android.util.Log
import com.ps26104.aawaz.detector.ModeAController
import com.ps26104.aawaz.detector.PcmFrameSink
import com.ps26104.aawaz.detector.Resampler48to16
import java.io.File
import java.util.Locale

/**
 * Debug-only harness that pushes a WAV file through the real Mode A pipeline.
 *
 * It feeds the exact same [PcmFrameSink] entry point the WebRTC sink uses, in
 * the exact same shape libwebrtc delivers (480-sample mono frames at 48 kHz,
 * one per 10 ms), so the resampler, ring buffer, detector and aggregator are
 * all exercised for real. Nothing is bypassed.
 *
 * Pacing is real time on purpose: the pipeline deliberately drops a window if
 * inference is still busy, so feeding faster than real time would measure
 * drop-handling rather than accuracy.
 */
class ModeAFileFeeder(private val context: Context) {

    companion object {
        private const val TAG = "AAWAZ_DIAG"
        private const val FRAME_SAMPLES = 480
        private const val FRAME_MS = 10L
    }

    @Volatile
    private var cancelled = false

    fun cancel() {
        cancelled = true
    }

    /**
     * Feeds [fileName] (from the app's external files dir) on the calling
     * thread until [targetSeconds] of audio has been delivered, looping the
     * clip if it is shorter. Must be a 48 kHz mono 16-bit PCM WAV.
     */
    fun feed(fileName: String, label: String, targetSeconds: Int = 20, loop: Boolean = true) {
        cancelled = false
        val dir = context.getExternalFilesDir(null)
        if (dir == null) {
            Log.e(TAG, "MODEA_FEED: no external files dir")
            return
        }
        val file = File(dir, fileName)
        if (!file.exists()) {
            Log.e(TAG, "MODEA_FEED: missing " + file.absolutePath)
            return
        }

        val wav = try {
            readPcm16Wav(file)
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA_FEED: could not parse " + fileName + ": " + t.message, t)
            return
        }

        if (wav.sampleRate != Resampler48to16.INPUT_RATE || wav.channels != 1) {
            Log.e(
                TAG,
                "MODEA_FEED: " + fileName + " is " + wav.sampleRate + " Hz / " +
                    wav.channels + " ch; need 48000 Hz mono"
            )
            return
        }

        val sink: PcmFrameSink = ModeAController.pipeline(context)
        val clipFrames = wav.samples.size / FRAME_SAMPLES
        val totalFrames = if (loop) {
            targetSeconds * 1000 / FRAME_MS.toInt()
        } else {
            // Demo mode plays the clip once from its start. Looping would splice
            // the end back onto the beginning and change what the model sees.
            clipFrames
        }
        val frame = ShortArray(FRAME_SAMPLES)
        var readPos = 0

        Log.i(TAG, "===== MODEA_FEED START: " + label + " (" + fileName + ") =====")
        Log.i(
            TAG,
            String.format(
                Locale.US,
                "MODEA_FEED: %d samples (%.2f s) at %d Hz, %s, %d frames",
                wav.samples.size, wav.samples.size / 48000.0, wav.sampleRate,
                if (loop) "looping to " + targetSeconds + " s" else "single pass from start",
                totalFrames
            )
        )

        var sent = 0
        val startedAt = System.currentTimeMillis()
        while (sent < totalFrames && !cancelled) {
            for (i in 0 until FRAME_SAMPLES) {
                frame[i] = wav.samples[readPos]
                readPos++
                if (readPos == wav.samples.size) readPos = 0
            }
            // readPos wrapping is only meaningful when looping; a single pass
            // stops at clipFrames before it can wrap.
            sink.onPcmFrames(frame, FRAME_SAMPLES, wav.sampleRate, wav.channels)
            sent++

            // Keep to the wall clock rather than sleeping a flat 10 ms, so
            // scheduler jitter does not accumulate into a slow feed.
            val due = startedAt + sent * FRAME_MS
            val sleep = due - System.currentTimeMillis()
            if (sleep > 0) {
                try {
                    Thread.sleep(sleep)
                } catch (ie: InterruptedException) {
                    Thread.currentThread().interrupt()
                    break
                }
            }
        }
        Log.i(
            TAG,
            "===== MODEA_FEED END: " + label + " frames=" + sent +
                " elapsed=" + (System.currentTimeMillis() - startedAt) + " ms ====="
        )
    }

    private class Wav(val samples: ShortArray, val sampleRate: Int, val channels: Int)

    /** Minimal RIFF/WAVE reader for uncompressed 16-bit PCM. */
    private fun readPcm16Wav(file: File): Wav {
        val bytes = file.readBytes()
        require(bytes.size > 44) { "file too small to be a WAV" }
        require(tag(bytes, 0) == "RIFF" && tag(bytes, 8) == "WAVE") { "not a RIFF/WAVE file" }

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
            // Chunks are word aligned.
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
