package com.ps26104.aawaz.detector

import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Pure, dependency-free audio window metrics.
 *
 * No Android imports on purpose: this is the one file in the detector package that
 * is trivially unit-testable on the JVM. Every function operates on the first
 * [length] samples of a 16-bit PCM buffer.
 */
object AudioMetrics {

    /** Full scale for signed 16-bit PCM. */
    const val FULL_SCALE: Double = 32768.0

    /** Sentinel dBFS value used when the window is digital silence. */
    const val SILENT_DBFS: Double = -999.0

    /** Root mean square of the window. Returns 0.0 for an empty window. */
    fun rms(buffer: ShortArray, length: Int = buffer.size): Double {
        val n = clamp(buffer, length)
        if (n == 0) return 0.0
        var sumSquares = 0.0
        for (i in 0 until n) {
            val s = buffer[i].toDouble()
            sumSquares += s * s
        }
        return sqrt(sumSquares / n)
    }

    /** Largest absolute sample value in the window. Returns 0 for an empty window. */
    fun peak(buffer: ShortArray, length: Int = buffer.size): Int {
        val n = clamp(buffer, length)
        var max = 0
        for (i in 0 until n) {
            val v = abs(buffer[i].toInt())
            if (v > max) max = v
        }
        return max
    }

    /**
     * dBFS of an already computed [rmsValue], relative to [FULL_SCALE].
     * Returns [SILENT_DBFS] for exact digital silence rather than -Infinity.
     */
    fun dbfs(rmsValue: Double): Double {
        if (rmsValue <= 0.0) return SILENT_DBFS
        return 20.0 * log10(rmsValue / FULL_SCALE)
    }

    /**
     * Fraction of samples that are exactly zero.
     *
     * This is the metric that separates "the OS handed us an error" from
     * "the OS handed us a perfectly valid stream of nothing". A ratio near 1.0
     * during a call means capture is being silenced, not failing.
     */
    fun zeroRatio(buffer: ShortArray, length: Int = buffer.size): Double {
        val n = clamp(buffer, length)
        if (n == 0) return 0.0
        var zeros = 0
        for (i in 0 until n) {
            if (buffer[i].toInt() == 0) zeros++
        }
        return zeros.toDouble() / n
    }

    private fun clamp(buffer: ShortArray, length: Int): Int {
        if (length <= 0) return 0
        return if (length > buffer.size) buffer.size else length
    }
}
