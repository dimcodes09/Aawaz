package com.ps26104.aawaz.detector

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Streaming 48 kHz -> 16 kHz mono resampler: integer decimation by 3 with an
 * anti-aliasing low-pass applied first.
 *
 * No DSP dependency. The filter is a windowed-sinc FIR built at construction.
 *
 * Decimating by 3 without filtering would fold everything above 8 kHz back into
 * the 0-8 kHz band. The low-pass is set below the 8 kHz output Nyquist so the
 * folded energy is already attenuated by the time we throw samples away.
 *
 * int16 -> float32 [-1, 1] normalisation happens here, on the way in. Division
 * by 32768 is linear, so doing it before the filter instead of after is
 * arithmetically identical and saves a pass over the data. This matches
 * ml/eval/preprocess.py, which reads audio with soundfile dtype="float32" —
 * libsndfile divides 16-bit PCM by 32768 for exactly the same [-1, 1) range.
 */
class Resampler48to16(
    private val decimation: Int = 3,
    numTaps: Int = 31,
    cutoffHz: Double = 7200.0,
    inputRateHz: Double = 48000.0
) {

    companion object {
        const val INPUT_RATE = 48000
        const val OUTPUT_RATE = 16000

        /** Full scale for signed 16-bit PCM, matching AudioMetrics.FULL_SCALE. */
        const val FULL_SCALE = 32768.0f
    }

    private val taps: FloatArray = buildLowPass(numTaps, cutoffHz / inputRateHz)

    /** Delay line holding the most recent [taps].size input samples. */
    private val history = FloatArray(taps.size)
    private var historyPos = 0

    /**
     * Counts input samples between outputs. Starts at 0 so the very first input
     * sample produces an output, then every [decimation]th sample after it.
     */
    private var phase = 0

    /**
     * Feeds [count] samples from [input] and writes the decimated result into
     * [output]. Returns the number of output samples written.
     *
     * With 480 input samples per WebRTC callback this returns 160.
     */
    fun process(input: ShortArray, count: Int, output: FloatArray): Int {
        var produced = 0
        for (i in 0 until count) {
            history[historyPos] = input[i] / FULL_SCALE
            historyPos = if (historyPos + 1 == history.size) 0 else historyPos + 1

            if (phase == 0) {
                if (produced < output.size) {
                    output[produced] = convolve()
                    produced++
                }
            }
            phase++
            if (phase == decimation) phase = 0
        }
        return produced
    }

    /** Drops filter state. Call between separate capture sessions. */
    fun reset() {
        history.fill(0f)
        historyPos = 0
        phase = 0
    }

    /**
     * Dot product of the delay line with the filter, oldest sample first.
     * [historyPos] points at the oldest sample once the line has wrapped.
     */
    private fun convolve(): Float {
        var acc = 0f
        var idx = historyPos
        for (t in taps.indices) {
            acc += history[idx] * taps[t]
            idx = if (idx + 1 == history.size) 0 else idx + 1
        }
        return acc
    }

    /**
     * Hamming-windowed sinc low-pass, normalised to unity gain at DC so the
     * filter cannot change the signal level.
     *
     * [normalisedCutoff] is cutoff / inputRate, so 7200/48000 = 0.15.
     */
    private fun buildLowPass(numTaps: Int, normalisedCutoff: Double): FloatArray {
        require(numTaps % 2 == 1) { "numTaps must be odd for a symmetric linear-phase filter" }
        val h = DoubleArray(numTaps)
        val mid = (numTaps - 1) / 2.0
        var sum = 0.0
        for (n in 0 until numTaps) {
            val x = n - mid
            val sinc = if (x == 0.0) {
                2.0 * normalisedCutoff
            } else {
                sin(2.0 * PI * normalisedCutoff * x) / (PI * x)
            }
            val window = 0.54 - 0.46 * cos(2.0 * PI * n / (numTaps - 1))
            val v = sinc * window
            h[n] = v
            sum += v
        }
        val out = FloatArray(numTaps)
        for (n in 0 until numTaps) {
            out[n] = (h[n] / sum).toFloat()
        }
        return out
    }
}
