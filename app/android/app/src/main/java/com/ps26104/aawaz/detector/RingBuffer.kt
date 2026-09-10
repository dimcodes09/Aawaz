package com.ps26104.aawaz.detector

/**
 * Fixed-capacity circular buffer of 16 kHz mono float samples that hands out one
 * overlapping analysis window every [HOP] samples.
 *
 * Capacity is exactly the model's input length, so a window is "the most recent
 * [CAPACITY] samples" and nothing else.
 *
 * The hop arithmetic is the part worth being careful about. An off-by-one here
 * does not throw and does not look wrong in a log — it quietly shifts every
 * window by a sample and shows up much later as unexplained accuracy loss. Two
 * rules keep it honest:
 *
 *  1. [pendingSinceWindow] is decremented by exactly [HOP] on each emit, never
 *     reset to zero. If a write overshoots the boundary the surplus carries
 *     forward, so window starts stay exactly [HOP] apart forever.
 *  2. No window is produced until [totalWritten] has reached [CAPACITY]. The
 *     first window is full real audio, never zero-padded.
 *
 * Not thread-safe by itself; [ModeAPipeline] owns the lock.
 */
class RingBuffer(
    val capacity: Int = CAPACITY,
    val hop: Int = HOP
) {

    companion object {
        /** RawTFNet input length: 64600 samples = 4.0375 s at 16 kHz. */
        const val CAPACITY = 64600

        /** 1.0 s hop at 16 kHz. */
        const val HOP = 16000
    }

    private val buffer = FloatArray(capacity)

    /** Index the next sample will be written to. */
    private var writePos = 0

    /** Total samples ever written. Saturates conceptually at >= capacity. */
    private var totalWritten = 0L

    /** New samples accumulated since the last window was handed out. */
    private var pendingSinceWindow = 0

    /** True once [capacity] samples have been written at least once. */
    val isPrimed: Boolean
        get() = totalWritten >= capacity

    /** Samples still needed before the first window can be produced. */
    val samplesUntilPrimed: Long
        get() = (capacity - totalWritten).coerceAtLeast(0L)

    fun write(source: FloatArray, count: Int) {
        var remaining = count
        var srcIndex = 0
        while (remaining > 0) {
            val room = capacity - writePos
            val chunk = if (remaining < room) remaining else room
            System.arraycopy(source, srcIndex, buffer, writePos, chunk)
            writePos += chunk
            if (writePos == capacity) writePos = 0
            srcIndex += chunk
            remaining -= chunk
        }
        totalWritten += count
        pendingSinceWindow += count
    }

    /**
     * If a new window is due, copies the most recent [capacity] samples into
     * [destination] oldest-first and returns true. Otherwise leaves
     * [destination] untouched and returns false.
     */
    fun readWindowIfDue(destination: FloatArray): Boolean {
        require(destination.size >= capacity) {
            "destination must hold at least $capacity samples, got ${destination.size}"
        }
        if (!isPrimed) return false
        if (pendingSinceWindow < hop) return false

        // The buffer is full, so the oldest retained sample sits at writePos and
        // the newest sits at writePos - 1 (wrapping). Copy from oldest forward.
        val tail = capacity - writePos
        System.arraycopy(buffer, writePos, destination, 0, tail)
        if (writePos > 0) {
            System.arraycopy(buffer, 0, destination, tail, writePos)
        }

        // Carry the surplus forward rather than resetting, so window starts stay
        // exactly `hop` apart even when a write straddles the boundary.
        pendingSinceWindow -= hop
        return true
    }

    fun reset() {
        buffer.fill(0f)
        writePos = 0
        totalWritten = 0L
        pendingSinceWindow = 0
    }
}
