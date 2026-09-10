package com.ps26104.aawaz.detector

import android.content.Context
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Log
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Mode A detection pipeline: remote WebRTC PCM -> 16 kHz -> 4.04 s window
 * -> RawTFNet -> smoothed risk, emitted at 1 Hz.
 *
 * Threading. Frames arrive on libwebrtc's audio thread and must not be blocked,
 * so that thread only resamples and appends to the ring buffer. When a window
 * comes due it is copied into a spare array and handed to a single inference
 * thread. If inference is still busy the window is dropped and counted rather
 * than queued: a backlog would make every score progressively staler, and a
 * dropped window is honest and visible.
 *
 * No React Native imports. The bridge subscribes to [listener]; audio never
 * leaves this package.
 */
class ModeAPipeline(context: Context) : PcmFrameSink {

    companion object {
        const val TAG = "AAWAZ_DIAG"
        const val EMIT_INTERVAL_MS = 1000L

        /** 480 input frames per WebRTC callback decimate to 160. Headroom for jitter. */
        private const val RESAMPLE_OUT_CAPACITY = 1024
    }

    fun interface Listener {
        fun onRisk(reading: RiskAggregator.Reading)
    }

    /**
     * How much of the stream gets scored.
     *
     * FIRST_WINDOW is the demo path. The checkpoint only behaves correctly on a
     * window aligned to the start of the audio, with the recording's own leading
     * silence intact (see docs/00 and the silence-leakage finding), so we score
     * that one window and stop. Nothing is reconstructed or padded.
     *
     * STREAMING keeps scoring every hop. It is retained deliberately because it
     * is what demonstrates the silence-leakage finding.
     */
    enum class ScoreMode { FIRST_WINDOW, STREAMING }

    private val appContext = context.applicationContext
    private val resampler = Resampler48to16()
    private val ringBuffer = RingBuffer()
    private val detector = RawTFNetDetector(appContext)
    private val aggregator = RiskAggregator()

    private val resampleOut = FloatArray(RESAMPLE_OUT_CAPACITY)

    /** Owned by the audio thread while writing, by the worker while inferring. */
    private val bufferLock = Any()
    private val pendingWindow = FloatArray(RingBuffer.CAPACITY)
    private val inferenceWindow = FloatArray(RingBuffer.CAPACITY)

    private val inferenceBusy = AtomicBoolean(false)
    private val running = AtomicBoolean(false)

    private var workerThread: HandlerThread? = null
    private var workerHandler: Handler? = null
    private var emitThread: HandlerThread? = null
    private var emitHandler: Handler? = null

    @Volatile
    var listener: Listener? = null

    /** Demo default. Flip to STREAMING from the debug screen to show the finding. */
    @Volatile
    var scoreMode: ScoreMode = ScoreMode.FIRST_WINDOW

    @Volatile
    private var firstWindowDone = false

    @Volatile
    private var droppedWindows = 0

    @Volatile
    private var lastReading: RiskAggregator.Reading = aggregator.current()

    val isRunning: Boolean
        get() = running.get()

    val medianLatencyMs: Double
        get() = detector.medianLatencyMs()

    val inferenceCount: Int
        get() = detector.inferenceCount()

    val executionProvider: String
        get() = detector.executionProvider

    /** Latest emitted reading, for the debug readout and the demo screen. */
    val currentReading: RiskAggregator.Reading
        get() = if (aggregator.windowCount == 0) aggregator.current() else lastReading

    /** Raw (unsmoothed) risk of the most recent scored window, -1 if none. */
    @Volatile
    var lastRawRisk: Int = -1
        private set

    fun start() {
        if (running.getAndSet(true)) return
        Log.i(TAG, "===== MODE A PIPELINE START =====")

        resampler.reset()
        ringBuffer.reset()
        aggregator.reset()
        detector.resetLatencies()
        droppedWindows = 0
        firstWindowDone = false
        lastRawRisk = -1
        lastReading = aggregator.current()

        try {
            detector.load()
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA: model load failed: " + t.javaClass.simpleName + ": " + t.message, t)
            running.set(false)
            return
        }

        workerThread = HandlerThread("aawaz-modea-infer").also {
            it.start()
            workerHandler = Handler(it.looper)
        }
        emitThread = HandlerThread("aawaz-modea-emit").also {
            it.start()
            emitHandler = Handler(it.looper)
        }
        scheduleEmit()

        Log.i(
            TAG,
            "MODEA: window=" + RingBuffer.CAPACITY + " samples (" +
                String.format(Locale.US, "%.4f", RingBuffer.CAPACITY / 16000.0) +
                " s) hop=" + RingBuffer.HOP + " samples (1.0 s) mode=" + scoreMode +
                " ep=" + detector.executionProvider
        )
    }

    fun stop() {
        if (!running.getAndSet(false)) return
        emitHandler?.removeCallbacksAndMessages(null)
        emitThread?.quitSafely()
        emitThread = null
        emitHandler = null

        workerHandler?.removeCallbacksAndMessages(null)
        workerThread?.quitSafely()
        workerThread = null
        workerHandler = null

        detector.close()
        Log.i(
            TAG,
            "MODEA: stopped. windows=" + aggregator.windowCount + " dropped=" + droppedWindows
        )
        Log.i(TAG, "===== MODE A PIPELINE STOP =====")
    }

    /**
     * Called on libwebrtc's audio thread. Keep this cheap: resample, append,
     * and hand off. No inference, no allocation, no logging in the hot path.
     */
    override fun onPcmFrames(
        samples: ShortArray,
        count: Int,
        sampleRate: Int,
        channels: Int
    ) {
        if (!running.get()) return
        // In demo mode the verdict is final once the opening window is scored.
        if (scoreMode == ScoreMode.FIRST_WINDOW && firstWindowDone) return
        if (sampleRate != Resampler48to16.INPUT_RATE || channels != 1) {
            // Guard rather than silently mis-resample. Logged once per frame is
            // too noisy, so only report the first offending frame.
            reportUnexpectedFormat(sampleRate, channels)
            return
        }

        val produced = resampler.process(samples, count, resampleOut)
        if (produced <= 0) return

        val windowReady: Boolean
        synchronized(bufferLock) {
            ringBuffer.write(resampleOut, produced)
            windowReady = ringBuffer.readWindowIfDue(pendingWindow)
            if (windowReady) {
                System.arraycopy(pendingWindow, 0, inferenceWindow, 0, RingBuffer.CAPACITY)
            }
        }
        if (!windowReady) return

        if (!inferenceBusy.compareAndSet(false, true)) {
            droppedWindows++
            return
        }
        workerHandler?.post { runInference() } ?: inferenceBusy.set(false)
    }

    private fun runInference() {
        try {
            val startedAt = SystemClock.uptimeMillis()
            val result = detector.infer(inferenceWindow)
            if (result == null) {
                Log.w(TAG, "MODEA: window skipped, inference returned null")
                return
            }
            val reading = aggregator.update(result.risk)
            lastReading = reading
            lastRawRisk = result.risk
            if (scoreMode == ScoreMode.FIRST_WINDOW) {
                firstWindowDone = true
                Log.i(
                    TAG,
                    String.format(
                        Locale.US,
                        "MODEA_FIRST_WINDOW,risk=%d,state=%s,spoof_logit=%.4f," +
                            "bonafide_logit=%.4f,latency_ms=%.1f,ep=%s",
                        result.risk, reading.state, result.spoofLogit,
                        result.bonafideLogit, result.latencyMs, detector.executionProvider
                    )
                )
            }
            Log.i(
                TAG,
                String.format(
                    Locale.US,
                    "MODEA_WINDOW,%d,%d,%d,%s,%.4f,%.4f,%.1f",
                    startedAt, result.risk, reading.score, reading.state,
                    result.spoofLogit, result.bonafideLogit, result.latencyMs
                )
            )
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA: inference task failed: " + t.javaClass.simpleName + ": " + t.message, t)
        } finally {
            inferenceBusy.set(false)
        }
    }

    /**
     * Final tally for a run: the smoothed score and state the aggregator ended
     * on, plus the latency number we quote.
     */
    fun logSummary(label: String) {
        val reading = if (aggregator.windowCount == 0) aggregator.current() else lastReading
        Log.i(
            TAG,
            String.format(
                Locale.US,
                "MODEA_SUMMARY,%s,final_score=%d,state=%s,windows=%d,dropped=%d," +
                    "median_latency_ms=%.1f,ep=%s",
                label, reading.score, reading.state, aggregator.windowCount,
                droppedWindows, detector.medianLatencyMs(), detector.executionProvider
            )
        )
        detector.logLatencySummary()
    }

    /** 1 Hz heartbeat so JS keeps receiving state during ANALYSING and silence. */
    private fun scheduleEmit() {
        emitHandler?.postDelayed({
            if (running.get()) {
                val reading = if (aggregator.windowCount == 0) aggregator.current() else lastReading
                listener?.onRisk(reading)
                scheduleEmit()
            }
        }, EMIT_INTERVAL_MS)
    }

    @Volatile
    private var formatReported = false

    private fun reportUnexpectedFormat(sampleRate: Int, channels: Int) {
        if (formatReported) return
        formatReported = true
        Log.e(
            TAG,
            "MODEA: expected " + Resampler48to16.INPUT_RATE + " Hz mono, got " +
                sampleRate + " Hz / " + channels + " ch. Frames ignored."
        )
    }
}
