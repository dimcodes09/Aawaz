package com.ps26104.aawaz.detector

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.SystemClock
import android.util.Log
import org.webrtc.AudioTrackSink
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale

/**
 * Attaches to a remote [org.webrtc.AudioTrack] and turns its PCM callbacks into
 * the same diagnostic CSV rows AudioCaptureService emits, tagged MODEA_PROBE.
 *
 * Audio never crosses the React Native bridge: libwebrtc hands us the frames on
 * a native audio thread and we measure them here. This package stays free of any
 * React Native import.
 *
 * libwebrtc delivers 10 ms frames, so [onData] fires ~100x/second. We accumulate
 * into [windowMs] windows to match the AudioRecord cadence, which lets the two
 * streams be compared row for row in the same logcat.
 */
class WebRtcPcmSink(
    context: Context,
    private val windowMs: Int = 500,
    private val callStateProvider: () -> String = { CallStateMonitor.STATE_UNKNOWN }
) : AudioTrackSink {

    companion object {
        const val TAG = "AAWAZ_DIAG"
        const val SEGMENT = "MODEA_PROBE"
        const val CSV_FILE_NAME = "aawaz_modea.csv"
        const val CSV_HEADER =
            "tag,uptimeMillis,rms,peak,dbfs,zeroRatio,callbacksInWindow,callState,audioMode,outputDevice"

        /** Latest emitted window, for the debug readout. */
        @Volatile
        var latest: AudioCaptureService.Snapshot? = null
            private set

        @Volatile
        var framesPerSecond: Double = 0.0
            private set

        /** Stream format as reported by libwebrtc on the first callbacks. */
        @Volatile
        var sampleRateHz: Int = 0
            private set

        @Volatile
        var channelCount: Int = 0
            private set

        @Volatile
        var bitsPerSampleValue: Int = 0
            private set

        @Volatile
        var framesPerCallback: Int = 0
            private set

        fun clearLatest() {
            latest = null
            framesPerSecond = 0.0
            sampleRateHz = 0
            channelCount = 0
            bitsPerSampleValue = 0
            framesPerCallback = 0
        }
    }

    private val appContext = context.applicationContext
    private val audioManager =
        appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private var window = ShortArray(0)
    private var filled = 0
    private var callbacksInWindow = 0

    private var windowStartedAt = 0L
    private var firstCallbackAt = 0L
    private var totalCallbacks = 0L
    private var formatLogged = false

    private var csvFile: File? = null

    /**
     * Called by libwebrtc on its own audio thread. [audioData] is only valid for
     * the duration of this call, so it is copied out immediately.
     */
    override fun onData(
        audioData: ByteBuffer,
        bitsPerSample: Int,
        sampleRate: Int,
        numberOfChannels: Int,
        numberOfFrames: Int,
        absoluteCaptureTimestampMs: Long
    ) {
        try {
            val now = SystemClock.uptimeMillis()
            if (firstCallbackAt == 0L) {
                firstCallbackAt = now
                windowStartedAt = now
                csvFile = prepareCsvFile()
            }
            totalCallbacks++
            callbacksInWindow++

            if (bitsPerSample != 16) {
                if (!formatLogged) {
                    formatLogged = true
                    Log.e(
                        TAG,
                        "MODEA_PROBE: unexpected bitsPerSample=" + bitsPerSample +
                            ", sink expects 16-bit PCM. Not measuring."
                    )
                }
                return
            }

            val windowSamples = sampleRate * numberOfChannels * windowMs / 1000
            if (window.size != windowSamples) {
                window = ShortArray(windowSamples)
                filled = 0
            }

            val shorts = audioData.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
            val available = shorts.remaining()
            val toCopy = minOf(available, window.size - filled)
            if (toCopy > 0) {
                shorts.get(window, filled, toCopy)
                filled += toCopy
            }

            // One-shot format banner, once ~1 s of frames has been observed so the
            // measured callback rate is meaningful.
            if (!formatLogged && now - firstCallbackAt >= 1000L) {
                formatLogged = true
                val elapsedSec = (now - firstCallbackAt) / 1000.0
                val fps = if (elapsedSec > 0) totalCallbacks / elapsedSec else 0.0
                framesPerSecond = fps
                sampleRateHz = sampleRate
                channelCount = numberOfChannels
                bitsPerSampleValue = bitsPerSample
                framesPerCallback = numberOfFrames
                // The CSV must be self-describing: logcat is not always available
                // on OEM builds, but the pulled file always is.
                appendCsv(
                    String.format(
                        Locale.US,
                        "# format sampleRate=%d channels=%d bitsPerSample=%d " +
                            "framesPerCallback=%d callbacksPerSec=%.1f window=%dms windowSamples=%d",
                        sampleRate, numberOfChannels, bitsPerSample, numberOfFrames,
                        fps, windowMs, windowSamples
                    )
                )
                Log.i(TAG, "===== MODE A SINK FORMAT =====")
                Log.i(
                    TAG,
                    String.format(
                        Locale.US,
                        "sink: sampleRate=%d channels=%d bitsPerSample=%d framesPerCallback=%d",
                        sampleRate, numberOfChannels, bitsPerSample, numberOfFrames
                    )
                )
                Log.i(
                    TAG,
                    String.format(
                        Locale.US,
                        "sink: measured %.1f callbacks/sec over %.2f s (%d callbacks); " +
                            "window=%d ms -> %d samples",
                        fps, elapsedSec, totalCallbacks, windowMs, windowSamples
                    )
                )
                Log.i(TAG, "===== END MODE A SINK FORMAT =====")
            }

            val elapsed = now - windowStartedAt
            if (filled >= window.size || elapsed >= windowMs) {
                emit(now, filled)
                filled = 0
                callbacksInWindow = 0
                windowStartedAt = now
            }
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA_PROBE sink onData failed: " + t.javaClass.simpleName + ": " + t.message, t)
        }
    }

    private fun emit(uptime: Long, length: Int) {
        val rms = AudioMetrics.rms(window, length)
        val peak = AudioMetrics.peak(window, length)
        val dbfs = AudioMetrics.dbfs(rms)
        val zeroRatio = AudioMetrics.zeroRatio(window, length)
        val audioMode = AudioCaptureService.audioModeName(audioManager.mode)
        val outputDevice = currentOutputDevice()
        val callState = callStateProvider()

        val line = String.format(
            Locale.US,
            "%s,%d,%.1f,%d,%.1f,%.3f,%d,%s,%s,%s",
            SEGMENT, uptime, rms, peak, dbfs, zeroRatio,
            callbacksInWindow, callState, audioMode, outputDevice
        )

        Log.i(TAG, line)
        appendCsv(line)

        latest = AudioCaptureService.Snapshot(
            uptime, rms, peak, dbfs, zeroRatio,
            callbacksInWindow, callState, audioMode, outputDevice
        )
    }

    private fun currentOutputDevice(): String {
        return try {
            val device: AudioDeviceInfo? = audioManager.communicationDevice
            if (device == null) "NONE" else AudioCaptureService.deviceTypeName(device.type)
        } catch (t: Throwable) {
            "UNAVAILABLE"
        }
    }

    private fun prepareCsvFile(): File? {
        return try {
            val dir = appContext.getExternalFilesDir(null) ?: return null
            val file = File(dir, CSV_FILE_NAME)
            if (!file.exists() || file.length() == 0L) {
                file.appendText(CSV_HEADER + "\n")
            }
            Log.i(TAG, "MODEA_PROBE csv: " + file.absolutePath)
            file
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA_PROBE could not open csv: " + t.message, t)
            null
        }
    }

    private fun appendCsv(line: String) {
        val file = csvFile ?: return
        try {
            file.appendText(line + "\n")
        } catch (t: Throwable) {
            Log.w(TAG, "MODEA_PROBE csv append failed: " + t.message)
        }
    }
}
