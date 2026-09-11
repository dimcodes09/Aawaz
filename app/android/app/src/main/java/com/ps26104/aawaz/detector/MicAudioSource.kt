package com.ps26104.aawaz.detector

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Live microphone as an input to the existing Mode A pipeline.
 *
 * This is an audio *source* and nothing more. Frames go into the same
 * [PcmFrameSink] entry point the WebRTC remote track and the demo clips use, so
 * the resampler, ring buffer, RawTFNet and the aggregator are the existing ones.
 * No second detector, no new scoring, no thresholds touched.
 *
 * Why it does not reuse AudioCaptureService: that service records at 16 kHz and
 * only writes diagnostic CSV rows - it has never fed the pipeline. ModeAPipeline
 * accepts 48 kHz mono only (its input guard drops anything else), so this
 * records at 48 kHz and hands over 480-sample frames, byte-identical in shape to
 * what libwebrtc delivers.
 *
 * Nothing is written to disk. Audio exists only in the frame buffer and in the
 * pipeline's ring buffer, both of which are overwritten continuously.
 */
class MicAudioSource(context: Context) {

    companion object {
        const val TAG = "AAWAZ_DIAG"

        /** Must match the pipeline's input contract. */
        const val SAMPLE_RATE = 48000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val ENCODING = AudioFormat.ENCODING_PCM_16BIT

        /** 10 ms at 48 kHz, matching the WebRTC callback shape. */
        const val FRAME_SAMPLES = 480

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private val appContext = context.applicationContext
    private val running = AtomicBoolean(false)
    private var thread: Thread? = null
    private var audioRecord: AudioRecord? = null

    /** Recording held in memory only. Never written to disk, cleared after analysis. */
    private var recorded: ShortArray = ShortArray(0)
    private var recordedCount = 0
    private val recording = AtomicBoolean(false)

    val isRecording: Boolean
        get() = recording.get()

    /** Seconds captured so far. */
    val recordedSeconds: Double
        get() = recordedCount.toDouble() / SAMPLE_RATE

    @SuppressLint("MissingPermission")
    fun start(): Boolean {
        if (running.getAndSet(true)) {
            Log.i(TAG, "MIC_DETECT already running")
            return true
        }

        val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, ENCODING)
        if (minBuffer <= 0) {
            Log.e(TAG, "MIC_DETECT HARD FAIL: getMinBufferSize=$minBuffer")
            running.set(false)
            return false
        }

        val record = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                ENCODING,
                minBuffer * 4
            )
        } catch (t: Throwable) {
            Log.e(TAG, "MIC_DETECT HARD FAIL: ${t.javaClass.simpleName}: ${t.message}", t)
            running.set(false)
            return false
        }

        if (record.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "MIC_DETECT HARD FAIL: AudioRecord state=${record.state}")
            record.release()
            running.set(false)
            return false
        }

        try {
            record.startRecording()
        } catch (t: Throwable) {
            Log.e(TAG, "MIC_DETECT HARD FAIL: startRecording ${t.message}", t)
            record.release()
            running.set(false)
            return false
        }

        audioRecord = record

        // Fresh pipeline so the scored window starts here, with whatever quiet
        // precedes the speaker - the condition this checkpoint behaves in.
        ModeAController.stop()
        val pipeline = ModeAController.start(appContext)

        isRunning = true
        Log.i(TAG, "===== MIC_DETECT START =====")
        Log.i(
            TAG,
            "MIC_DETECT source=MIC rate=$SAMPLE_RATE ch=MONO enc=PCM_16BIT " +
                "minBuf=$minBuffer recState=${record.recordingState} " +
                "mode=${pipeline.scoreMode} ep=${pipeline.executionProvider}"
        )

        thread = Thread({ loop(record, pipeline) }, "aawaz-mic-detect").also {
            it.priority = Thread.MAX_PRIORITY
            it.start()
        }
        return true
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
        isRunning = false
        Log.i(TAG, "===== MIC_DETECT STOP =====")
    }

    /**
     * Utterance capture: records the microphone into memory without scoring
     * anything. This is deliberately NOT the streaming path - the checkpoint is
     * only reliable on a window aligned to the start of an utterance, so the
     * audio is buffered first and scored once, exactly like a demo clip.
     */
    @SuppressLint("MissingPermission")
    fun startRecording(): Boolean {
        if (recording.getAndSet(true)) return true

        val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, ENCODING)
        if (minBuffer <= 0) {
            recording.set(false)
            return false
        }
        val record = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC, SAMPLE_RATE, CHANNEL_CONFIG, ENCODING,
                minBuffer * 4
            )
        } catch (t: Throwable) {
            Log.e(TAG, "MIC_REC ctor failed: ${t.message}", t)
            recording.set(false)
            return false
        }
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release(); recording.set(false); return false
        }
        try {
            record.startRecording()
        } catch (t: Throwable) {
            record.release(); recording.set(false); return false
        }

        audioRecord = record
        // 20 s ceiling; a demo utterance is a few seconds.
        recorded = ShortArray(SAMPLE_RATE * 20)
        recordedCount = 0
        Log.i(TAG, "===== MIC_REC START (buffering, not scoring) =====")

        thread = Thread({
            val chunk = ShortArray(FRAME_SAMPLES)
            try {
                while (recording.get()) {
                    val n = record.read(chunk, 0, FRAME_SAMPLES)
                    if (n <= 0) continue
                    if (recordedCount + n <= recorded.size) {
                        System.arraycopy(chunk, 0, recorded, recordedCount, n)
                        recordedCount += n
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "MIC_REC loop: ${t.message}")
            }
        }, "aawaz-mic-rec").also { it.start() }
        return true
    }

    /**
     * Stops recording and scores the utterance once, through the same route the
     * validated demo clips take: fresh pipeline, then frames pushed from sample
     * zero so the FIRST_WINDOW lands on the start of the recording.
     *
     * The buffer is cleared afterwards. Nothing is persisted.
     */
    fun stopAndAnalyze(): Double {
        if (!recording.getAndSet(false)) return -1.0
        thread?.let { it.interrupt(); try { it.join(1200) } catch (ignored: InterruptedException) {} }
        thread = null
        audioRecord?.let { rec ->
            try { if (rec.recordingState == AudioRecord.RECORDSTATE_RECORDING) rec.stop() } catch (ignored: Throwable) {}
            try { rec.release() } catch (ignored: Throwable) {}
        }
        audioRecord = null

        val samples = recordedCount
        val seconds = samples.toDouble() / SAMPLE_RATE
        Log.i(TAG, "===== MIC_REC STOP: $samples samples (%.2f s) =====".format(seconds))

        // ModeAPipeline needs 64600 samples at 16 kHz = 4.0375 s of audio.
        val needed = (SAMPLE_RATE * 4.05).toInt()
        if (samples < needed) {
            Log.e(TAG, "MIC_REC too short: %.2f s, need >= 4.05 s".format(seconds))
            recorded = ShortArray(0); recordedCount = 0
            return -1.0
        }

        ModeAController.stop()
        val pipeline = ModeAController.start(appContext)
        val sink: PcmFrameSink = pipeline
        val frame = ShortArray(FRAME_SAMPLES)
        var pos = 0
        while (pos + FRAME_SAMPLES <= samples) {
            System.arraycopy(recorded, pos, frame, 0, FRAME_SAMPLES)
            sink.onPcmFrames(frame, FRAME_SAMPLES, SAMPLE_RATE, 1)
            pos += FRAME_SAMPLES
        }
        Log.i(TAG, "MIC_REC analysed %.2f s through the existing utterance path".format(seconds))

        // Temporary by construction: the buffer is dropped immediately.
        recorded = ShortArray(0)
        recordedCount = 0
        return seconds
    }

    private fun loop(record: AudioRecord, pipeline: ModeAPipeline) {
        val sink: PcmFrameSink = pipeline
        val frame = ShortArray(FRAME_SAMPLES)
        var firstFrameLogged = false
        var framesFed = 0L

        try {
            while (running.get()) {
                var filled = 0
                while (filled < FRAME_SAMPLES && running.get()) {
                    val n = record.read(frame, filled, FRAME_SAMPLES - filled)
                    if (n <= 0) {
                        Log.w(TAG, "MIC_DETECT read returned $n")
                        break
                    }
                    filled += n
                }
                if (filled < FRAME_SAMPLES) continue

                sink.onPcmFrames(frame, FRAME_SAMPLES, SAMPLE_RATE, 1)
                framesFed++

                if (!firstFrameLogged) {
                    firstFrameLogged = true
                    Log.i(
                        TAG,
                        "MIC_DETECT_FIRST_PCM frames flowing to the existing pipeline " +
                            "($FRAME_SAMPLES samples @ ${SAMPLE_RATE}Hz mono)"
                    )
                }
            }
        } catch (ie: InterruptedException) {
            Log.i(TAG, "MIC_DETECT interrupted")
        } catch (t: Throwable) {
            Log.e(TAG, "MIC_DETECT loop aborted: ${t.javaClass.simpleName}: ${t.message}", t)
        }
        Log.i(TAG, "MIC_DETECT loop exited after $framesFed frames")
    }
}
