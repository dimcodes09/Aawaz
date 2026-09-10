package com.ps26104.aawaz.detector

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.os.SystemClock
import android.util.Log
import java.nio.FloatBuffer
import java.util.Collections
import java.util.Locale

/**
 * RawTFNet anti-spoofing inference, ONNX Runtime with the XNNPACK execution
 * provider, model loaded from assets.
 *
 * Contract (docs/CONTRACTS.md, confirmed against ml/export/rawtfnet32_b1.onnx):
 *   input  "wav"     float32[1, 64600]  16 kHz mono, normalised [-1, 1]
 *   output "logits"  float32[1, 2]      index 1 = bona-fide logit
 *   risk = round((1 - sigmoid(logits[0][1])) * 100)
 *
 * Normalisation note: samples arrive already divided by 32768 from
 * [Resampler48to16]. ml/eval/preprocess.py reads with soundfile dtype="float32",
 * and libsndfile divides 16-bit PCM by 32768, so the two agree exactly. No
 * amplitude/peak normalisation is applied — preprocess.py defaults to
 * normalise=False, and ml/eval/polarity_results.json shows that default gives
 * the wider real/fake separation (94.5 vs 93.0 risk gap).
 *
 * No React Native imports.
 */
class RawTFNetDetector(private val context: Context) {

    companion object {
        const val TAG = "AAWAZ_DIAG"
        const val MODEL_ASSET = "rawtfnet32_b1.onnx"
        const val INPUT_NAME = "wav"
        const val OUTPUT_NAME = "logits"
        const val WINDOW_SAMPLES = RingBuffer.CAPACITY

        /** Bona-fide logit index. Track 3 confirmed: real -> risk 1, fake -> risk 95.5. */
        const val BONAFIDE_INDEX = 1
    }

    private var environment: OrtEnvironment? = null
    private var session: OrtSession? = null

    private var inputName = INPUT_NAME
    private var outputName = OUTPUT_NAME

    private val inputShape = longArrayOf(1L, WINDOW_SAMPLES.toLong())
    private val latenciesMs = Collections.synchronizedList(mutableListOf<Double>())

    /** Execution provider actually in use, for the record. */
    var executionProvider: String = "NONE"
        private set

    val isLoaded: Boolean
        get() = session != null

    fun load() {
        if (session != null) return

        val modelBytes = context.assets.open(MODEL_ASSET).use { it.readBytes() }
        val env = OrtEnvironment.getEnvironment()
        environment = env

        val options = OrtSession.SessionOptions()
        options.setIntraOpNumThreads(2)
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        executionProvider = try {
            options.addXnnpack(mapOf("intra_op_num_threads" to "2"))
            "XNNPACK"
        } catch (t: Throwable) {
            // Falling back is a real result worth seeing in the latency numbers,
            // not something to hide.
            Log.w(TAG, "MODEA: XNNPACK unavailable (" + t.javaClass.simpleName + ": " + t.message + "), using default CPU EP")
            "CPU"
        }

        val created = env.createSession(modelBytes, options)
        session = created

        created.inputNames.firstOrNull()?.let { inputName = it }
        created.outputNames.firstOrNull()?.let { outputName = it }

        Log.i(TAG, "===== MODE A MODEL LOADED =====")
        Log.i(TAG, "model=" + MODEL_ASSET + " bytes=" + modelBytes.size + " ep=" + executionProvider)
        Log.i(TAG, "inputs=" + created.inputNames + " outputs=" + created.outputNames)
        Log.i(TAG, "expecting input '" + inputName + "' float32[1," + WINDOW_SAMPLES + "], output '" + outputName + "' float32[1,2]")
        Log.i(TAG, "===== END MODEL BANNER =====")
    }

    /**
     * Runs one window. [window] must hold exactly [WINDOW_SAMPLES] normalised
     * float samples. Returns null if the session is not loaded or inference
     * fails; a failed window is skipped, never fatal.
     */
    fun infer(window: FloatArray): Result? {
        val env = environment ?: return null
        val ortSession = session ?: return null
        require(window.size >= WINDOW_SAMPLES) {
            "window must hold $WINDOW_SAMPLES samples, got ${window.size}"
        }

        return try {
            val startNs = SystemClock.elapsedRealtimeNanos()
            val buffer = FloatBuffer.wrap(window, 0, WINDOW_SAMPLES)
            OnnxTensor.createTensor(env, buffer, inputShape).use { tensor ->
                ortSession.run(mapOf(inputName to tensor)).use { results ->
                    val raw = results[0].value
                    val logits = extractLogits(raw) ?: return null
                    val elapsedMs = (SystemClock.elapsedRealtimeNanos() - startNs) / 1_000_000.0
                    latenciesMs.add(elapsedMs)

                    val bonafideLogit = logits[BONAFIDE_INDEX]
                    val risk = Math.round((1.0 - sigmoid(bonafideLogit)) * 100.0).toInt()
                        .coerceIn(0, 100)
                    Result(risk, logits[0], logits[1], elapsedMs)
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA: inference failed: " + t.javaClass.simpleName + ": " + t.message, t)
            null
        }
    }

    /** Median of every inference so far, or 0.0 if none. */
    fun medianLatencyMs(): Double {
        val snapshot = synchronized(latenciesMs) { latenciesMs.toDoubleArray() }
        if (snapshot.isEmpty()) return 0.0
        snapshot.sort()
        val mid = snapshot.size / 2
        return if (snapshot.size % 2 == 1) {
            snapshot[mid]
        } else {
            (snapshot[mid - 1] + snapshot[mid]) / 2.0
        }
    }

    fun inferenceCount(): Int = synchronized(latenciesMs) { latenciesMs.size }

    fun logLatencySummary() {
        val n = inferenceCount()
        if (n == 0) {
            Log.i(TAG, "MODEA latency: no inferences run")
            return
        }
        val snapshot = synchronized(latenciesMs) { latenciesMs.toDoubleArray() }
        snapshot.sort()
        Log.i(
            TAG,
            String.format(
                Locale.US,
                "MODEA latency: n=%d median=%.1f ms min=%.1f ms max=%.1f ms p90=%.1f ms ep=%s",
                n, medianLatencyMs(), snapshot.first(), snapshot.last(),
                snapshot[((n * 0.9).toInt()).coerceAtMost(n - 1)], executionProvider
            )
        )
    }

    fun close() {
        logLatencySummary()
        try {
            session?.close()
        } catch (t: Throwable) {
            Log.w(TAG, "MODEA: session close failed: " + t.message)
        }
        session = null
        environment = null
    }

    fun resetLatencies() {
        synchronized(latenciesMs) { latenciesMs.clear() }
    }

    /** ORT hands back float[1][2] for a batch-1 run; tolerate float[2] too. */
    private fun extractLogits(raw: Any?): FloatArray? {
        return when (raw) {
            is Array<*> -> {
                val row = raw.firstOrNull()
                if (row is FloatArray && row.size >= 2) row else null
            }
            is FloatArray -> if (raw.size >= 2) raw else null
            else -> {
                Log.e(TAG, "MODEA: unexpected output type " + (raw?.javaClass?.name ?: "null"))
                null
            }
        }
    }

    private fun sigmoid(x: Float): Double = 1.0 / (1.0 + Math.exp(-x.toDouble()))

    /** One window's verdict. */
    data class Result(
        val risk: Int,
        val spoofLogit: Float,
        val bonafideLogit: Float,
        val latencyMs: Double
    )
}
