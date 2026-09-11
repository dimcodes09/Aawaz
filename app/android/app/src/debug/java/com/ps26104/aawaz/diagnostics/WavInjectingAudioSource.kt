package com.ps26104.aawaz.diagnostics

import android.content.Context
import android.util.Log
import org.webrtc.audio.JavaAudioDeviceModule
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Makes a bundled WAV act as the WebRTC *sender* source.
 *
 * libwebrtc's Java API has no push-style audio source: createAudioSource()
 * always pulls from the AudioDeviceModule, i.e. the microphone. The webrtc-sdk
 * build exposes JavaAudioDeviceModule.Builder.setAudioBufferCallback, and in
 * WebRtcAudioRecord's capture loop the call order is:
 *
 *     AudioRecord.read(byteBuffer, capacity)   // mic fills the buffer
 *     audioBufferCallback.onBuffer(byteBuffer) // <- this class
 *     nativeDataIsRecorded(...)                // handed to the Opus encoder
 *
 * So overwriting the buffer here replaces exactly what gets encoded and sent.
 * The WAV therefore travels the genuine media path - ADM, encoder, RTP, network,
 * remote track - and nothing bypasses WebRTC.
 *
 * Integrity: the buffer is overwritten on EVERY callback, without exception.
 * When no clip is playing it is filled with silence rather than passed through,
 * so live microphone audio can never reach the wire. That is what makes the
 * receiver's detector result attributable to the selected clip and nothing else.
 *
 * Debug-only. The WAV decode is duplicated here rather than reaching into
 * DemoAudioSource's private helpers, deliberately: DemoAudioSource is the locked
 * judge-demo path and is not worth destabilising for a test rig.
 */
class WavInjectingAudioSource(context: Context) : JavaAudioDeviceModule.AudioBufferCallback {

    companion object {
        private const val TAG = "AAWAZ_DIAG"
        const val SOURCE_SAMPLE_RATE = 16000
    }

    private val appContext = context.applicationContext

    /** Clip resampled to the ADM's rate. Written by the caller thread, read by the ADM thread. */
    @Volatile
    private var clip: ShortArray? = null

    @Volatile
    private var clipLabel: String = "none"

    @Volatile
    private var clipRate: Int = 0

    /** Read cursor, only touched on the ADM capture thread. */
    private var cursor = 0

    private val playing = AtomicBoolean(false)
    private val formatLogged = AtomicBoolean(false)

    /** Pending clip handed over from the UI thread, picked up by the ADM thread. */
    @Volatile
    private var pendingAsset: String? = null

    @Volatile
    private var pendingLabel: String = ""

    val isPlaying: Boolean
        get() = playing.get()

    val currentLabel: String
        get() = clipLabel

    /** Queues a clip; it starts on the next capture callback. */
    fun play(assetName: String, label: String) {
        pendingAsset = assetName
        pendingLabel = label
        Log.i(TAG, "WEBRTC_CALLER_AUDIO_START asset=$assetName label=$label")
    }

    fun stopClip() {
        playing.set(false)
        pendingAsset = null
        clip = null
        clipLabel = "none"
        Log.i(TAG, "WEBRTC_CALLER_AUDIO_STOP")
    }

    /**
     * Called by WebRtcAudioRecord on its capture thread, once per 10 ms buffer,
     * before the data reaches the encoder.
     *
     * @return the capture timestamp; passed through unchanged.
     */
    override fun onBuffer(
        buffer: ByteBuffer,
        audioFormat: Int,
        channelCount: Int,
        sampleRate: Int,
        bytesRead: Int,
        captureTimeNs: Long,
    ): Long {
        try {
            if (formatLogged.compareAndSet(false, true)) {
                Log.i(
                    TAG,
                    "WEBRTC_CALLER_ADM_BUFFER format=$audioFormat channels=$channelCount " +
                        "sampleRate=$sampleRate bytes=$bytesRead " +
                        "(mic data is overwritten on every callback)"
                )
            }

            // Pick up a queued clip on this thread so cursor/clip stay consistent.
            pendingAsset?.let { asset ->
                pendingAsset = null
                loadClip(asset, pendingLabel, sampleRate)
            }

            val totalSamples = bytesRead / 2
            if (totalSamples <= 0) return captureTimeNs

            val source = clip
            val active = playing.get() && source != null

            // Absolute writes: the native side reads the buffer's backing memory
            // from offset 0, so position/limit must not be relied on.
            //
            // Byte order is written out explicitly rather than via putShort.
            // WebRtcAudioRecord allocates this buffer with allocateDirect() and
            // never calls order(), so it keeps Java's BIG_ENDIAN default - while
            // AudioRecord.read() and the native encoder both treat the memory as
            // little-endian. Using putShort here byte-swaps every sample, which
            // sounds like loud distortion rather than the clip.
            var written = 0
            if (active) {
                val frames = totalSamples / channelCount.coerceAtLeast(1)
                outer@ for (f in 0 until frames) {
                    if (cursor >= source!!.size) {
                        // Clip finished: stop and let the rest of this buffer be
                        // silence, so the tail is clean.
                        playing.set(false)
                        Log.i(
                            TAG,
                            "WEBRTC_CALLER_AUDIO_STOP clip finished label=$clipLabel " +
                                "samples=${source.size} rate=$clipRate"
                        )
                        break@outer
                    }
                    val sample = source[cursor]
                    cursor++
                    for (c in 0 until channelCount.coerceAtLeast(1)) {
                        writeLittleEndian(buffer, written + c, sample)
                    }
                    written += channelCount.coerceAtLeast(1)
                }
            }

            // Everything not covered by clip audio is silenced. This is the line
            // that guarantees the microphone never reaches the network.
            for (i in written until totalSamples) {
                writeLittleEndian(buffer, i, 0)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "WEBRTC_CALLER onBuffer failed: ${t.javaClass.simpleName}: ${t.message}", t)
        }
        return captureTimeNs
    }

    /** Writes one 16-bit sample little-endian, ignoring the buffer's order flag. */
    private fun writeLittleEndian(buffer: ByteBuffer, sampleIndex: Int, value: Short) {
        val at = sampleIndex * 2
        val v = value.toInt()
        buffer.put(at, (v and 0xFF).toByte())
        buffer.put(at + 1, ((v shr 8) and 0xFF).toByte())
    }

    /** Decode + resample on first use at the ADM's actual rate. */
    private fun loadClip(assetName: String, label: String, sampleRate: Int) {
        try {
            val wav = readPcm16WavFromAssets(assetName)
            if (wav.channels != 1) {
                Log.e(TAG, "WEBRTC_CALLER clip $assetName has ${wav.channels} ch; need mono")
                return
            }
            val resampled = resample(wav.samples, wav.sampleRate, sampleRate)
            clip = resampled
            clipLabel = label
            clipRate = sampleRate
            cursor = 0
            playing.set(true)
            Log.i(
                TAG,
                "WEBRTC_CALLER clip loaded label=$label asset=$assetName " +
                    "src=${wav.sampleRate}Hz ${wav.samples.size} samples -> " +
                    "${sampleRate}Hz ${resampled.size} samples " +
                    "(${"%.2f".format(resampled.size.toDouble() / sampleRate)} s)"
            )
        } catch (t: Throwable) {
            Log.e(TAG, "WEBRTC_CALLER clip load failed: ${t.javaClass.simpleName}: ${t.message}", t)
        }
    }

    /** Linear interpolation to an arbitrary target rate. Exact multiple for 16k -> 48k. */
    private fun resample(src: ShortArray, from: Int, to: Int): ShortArray {
        if (from == to || src.isEmpty()) return src
        val ratio = to.toDouble() / from.toDouble()
        val out = ShortArray((src.size * ratio).toInt())
        for (i in out.indices) {
            val x = i / ratio
            val i0 = x.toInt()
            val i1 = (i0 + 1).coerceAtMost(src.size - 1)
            val frac = x - i0
            val v = src[i0] + (src[i1] - src[i0]) * frac
            out[i] = v.toInt().coerceIn(-32768, 32767).toShort()
        }
        return out
    }

    private class Wav(val samples: ShortArray, val sampleRate: Int, val channels: Int)

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
