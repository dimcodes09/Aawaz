package com.ps26104.aawaz.diagnostics

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.SystemClock
import android.util.Log
import com.ps26104.aawaz.detector.AudioMetrics
import com.ps26104.aawaz.detector.ModeAController
import com.ps26104.aawaz.detector.ModeAPipeline
import com.ps26104.aawaz.detector.PcmFrameSink
import com.ps26104.aawaz.detector.Resampler48to16
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Debug-only feasibility probe: real microphone PCM into the existing
 * [ModeAPipeline].
 *
 * This is an audio *source* and nothing more. It creates no detector, no
 * resampler, no ring buffer and no aggregator - frames go into the same
 * [PcmFrameSink] entry point the WebRTC remote track and the judge demo use, so
 * every measurement below comes from the already-validated stack.
 *
 * Why it does not reuse AudioCaptureService: that service records at 16 kHz, and
 * [ModeAPipeline] accepts only 48 kHz mono (it drops anything else at the input
 * guard). The pipeline's contract is the fixed point here, so the probe records
 * at 48 kHz mono and hands over 480-sample frames - byte-for-byte the shape
 * libwebrtc delivers. AudioCaptureService is left untouched.
 *
 * Scoring mode: the probe needs many windows, so it switches the pipeline to
 * STREAMING and restores FIRST_WINDOW on stop. That restore matters - the
 * validated judge demo depends on FIRST_WINDOW being the resting mode.
 */
class MicProbe(private val context: Context) {

    companion object {
        private const val TAG = "AAWAZ_DIAG"

        /** Must match the pipeline's input contract. */
        const val SAMPLE_RATE = Resampler48to16.INPUT_RATE
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val ENCODING = AudioFormat.ENCODING_PCM_16BIT

        /** 10 ms at 48 kHz, matching the WebRTC callback shape. */
        const val FRAME_SAMPLES = 480

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var windowsLogged: Int = 0
            private set
    }

    private val running = AtomicBoolean(false)
    private var thread: Thread? = null
    private var audioRecord: AudioRecord? = null

    @SuppressLint("MissingPermission")
    fun start(label: String) {
        if (running.getAndSet(true)) {
            Log.i(TAG, "MICPROBE already running")
            return
        }
        windowsLogged = 0

        val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, ENCODING)
        if (minBuffer <= 0) {
            Log.e(TAG, "MICPROBE HARD FAIL: getMinBufferSize=" + minBuffer)
            running.set(false)
            return
        }
        val bufferBytes = minBuffer * 4

        val record = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                ENCODING,
                bufferBytes
            )
        } catch (t: Throwable) {
            Log.e(TAG, "MICPROBE HARD FAIL: AudioRecord ctor " + t.javaClass.simpleName + ": " + t.message, t)
            running.set(false)
            return
        }

        if (record.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "MICPROBE HARD FAIL: AudioRecord state=" + record.state)
            record.release()
            running.set(false)
            return
        }

        try {
            record.startRecording()
        } catch (t: Throwable) {
            Log.e(TAG, "MICPROBE HARD FAIL: startRecording " + t.message, t)
            record.release()
            running.set(false)
            return
        }

        audioRecord = record

        // Fresh pipeline, and STREAMING so every hop is scored.
        ModeAController.stop()
        val pipeline = ModeAController.start(context)
        pipeline.scoreMode = ModeAPipeline.ScoreMode.STREAMING

        isRunning = true
        Log.i(TAG, "===== MICPROBE START: " + label + " =====")
        Log.i(
            TAG,
            "MICPROBE: source=MIC rate=" + SAMPLE_RATE + " ch=MONO enc=PCM_16BIT " +
                "minBuf=" + minBuffer + " recState=" + record.recordingState +
                " mode=" + pipeline.scoreMode + " ep=" + pipeline.executionProvider
        )
        Log.i(TAG, "MICPROBE,uptimeMs,windowIndex,rms,risk,state")

        thread = Thread({ loop(record, pipeline, label) }, "aawaz-mic-probe").also {
            it.priority = Thread.MAX_PRIORITY
            it.start()
        }
    }

    fun stop() {
        if (!running.getAndSet(false)) return
        thread?.let {
            it.interrupt()
            try {
                it.join(1500)
            } catch (ignored: InterruptedException) {
            }
        }
        thread = null

        audioRecord?.let { rec ->
            try {
                if (rec.recordingState == AudioRecord.RECORDSTATE_RECORDING) rec.stop()
            } catch (ignored: Throwable) {
            }
            try {
                rec.release()
            } catch (ignored: Throwable) {
            }
        }
        audioRecord = null

        // Restore the resting mode the judge demo relies on.
        try {
            ModeAController.pipeline(context).scoreMode = ModeAPipeline.ScoreMode.FIRST_WINDOW
        } catch (ignored: Throwable) {
        }
        ModeAController.stop()

        isRunning = false
        Log.i(TAG, "===== MICPROBE STOP: windows=" + windowsLogged + " =====")
    }

    private fun loop(record: AudioRecord, pipeline: ModeAPipeline, label: String) {
        val sink: PcmFrameSink = pipeline
        val frame = ShortArray(FRAME_SAMPLES)

        // Accumulated over the audio fed since the last scored window, so the
        // logged RMS describes the audio that window actually saw.
        var sumSquares = 0.0
        var sampleCount = 0L
        var lastInferenceCount = pipeline.inferenceCount

        try {
            while (running.get()) {
                var filled = 0
                while (filled < FRAME_SAMPLES && running.get()) {
                    val n = record.read(frame, filled, FRAME_SAMPLES - filled)
                    if (n <= 0) {
                        Log.w(TAG, "MICPROBE: read returned " + n)
                        break
                    }
                    filled += n
                }
                if (filled < FRAME_SAMPLES) continue

                val frameRms = AudioMetrics.rms(frame, FRAME_SAMPLES)
                sumSquares += frameRms * frameRms * FRAME_SAMPLES
                sampleCount += FRAME_SAMPLES

                sink.onPcmFrames(frame, FRAME_SAMPLES, SAMPLE_RATE, 1)

                // One line per window the detector actually scored.
                val count = pipeline.inferenceCount
                if (count != lastInferenceCount) {
                    lastInferenceCount = count
                    val windowRms =
                        if (sampleCount > 0) Math.sqrt(sumSquares / sampleCount) else 0.0
                    val reading = pipeline.currentReading
                    windowsLogged++
                    Log.i(
                        TAG,
                        String.format(
                            Locale.US,
                            "MICPROBE,%d,%d,%.1f,%d,%s",
                            SystemClock.uptimeMillis(),
                            windowsLogged,
                            windowRms,
                            pipeline.lastRawRisk,
                            reading.state
                        )
                    )
                    sumSquares = 0.0
                    sampleCount = 0
                }
            }
        } catch (ie: InterruptedException) {
            Log.i(TAG, "MICPROBE: interrupted, exiting")
        } catch (t: Throwable) {
            Log.e(TAG, "MICPROBE loop aborted: " + t.javaClass.simpleName + ": " + t.message, t)
        }
        Log.i(TAG, "MICPROBE: loop exited for " + label)
    }
}
