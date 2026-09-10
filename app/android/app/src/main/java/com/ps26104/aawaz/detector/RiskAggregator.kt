package com.ps26104.aawaz.detector

/**
 * Smooths per-window risk and applies hysteresis so the reported state does not
 * flicker around a threshold.
 *
 * Constants are pinned by docs/CONTRACTS.md: EMA alpha 0.4, window 4,
 * hysteresis raise at 75, clear at 45.
 *
 * On "EMA alpha 0.4 over 4 windows": alpha 0.4 already gives an effective memory
 * of roughly four windows, so the two are one setting described twice rather
 * than two independent knobs. Implemented as a plain EMA with alpha 0.4, seeded
 * with the first score so the very first reading is not dragged toward zero.
 *
 * States, matching the contract enum:
 *   ANALYSING  no full 4.04 s window has been scored yet; score 0
 *   HIGH       latched once smoothed risk reaches RAISE, held until it drops
 *              below CLEAR
 *   ELEVATED   smoothed risk sits in the CLEAR..RAISE band, not latched
 *   OK         smoothed risk below CLEAR
 *
 * The latch is what makes this hysteresis: between 45 and 75 the state depends
 * on which side it entered from, so a score hovering at 74 cannot oscillate.
 */
class RiskAggregator(
    private val alpha: Double = ALPHA,
    private val raiseAt: Int = RAISE_AT,
    private val clearAt: Int = CLEAR_AT
) {

    companion object {
        const val ALPHA = 0.4
        const val EMA_WINDOWS = 4
        const val RAISE_AT = 75
        const val CLEAR_AT = 45

        const val STATE_ANALYSING = "ANALYSING"
        const val STATE_OK = "OK"
        const val STATE_ELEVATED = "ELEVATED"
        const val STATE_HIGH = "HIGH"
    }

    private var ema: Double = 0.0
    private var seeded = false
    private var latchedHigh = false

    /** Windows scored so far. */
    var windowCount: Int = 0
        private set

    /** Current smoothed score, 0 while ANALYSING. */
    val smoothedScore: Int
        get() = if (!seeded) 0 else Math.round(ema).toInt().coerceIn(0, 100)

    val state: String
        get() = when {
            !seeded -> STATE_ANALYSING
            latchedHigh -> STATE_HIGH
            smoothedScore >= raiseAt -> STATE_HIGH
            smoothedScore >= clearAt -> STATE_ELEVATED
            else -> STATE_OK
        }

    /** Feeds one window's raw risk (0-100) and returns the new reading. */
    fun update(rawRisk: Int): Reading {
        val clamped = rawRisk.coerceIn(0, 100)
        if (!seeded) {
            ema = clamped.toDouble()
            seeded = true
        } else {
            ema = alpha * clamped + (1.0 - alpha) * ema
        }
        windowCount++

        val score = smoothedScore
        if (score >= raiseAt) {
            latchedHigh = true
        } else if (score < clearAt) {
            latchedHigh = false
        }
        return current()
    }

    /** The reading to emit without feeding a new window (the 1 Hz heartbeat). */
    fun current(): Reading = Reading(smoothedScore, state, System.currentTimeMillis())

    fun reset() {
        ema = 0.0
        seeded = false
        latchedHigh = false
        windowCount = 0
    }

    data class Reading(val score: Int, val state: String, val ts: Long)
}
