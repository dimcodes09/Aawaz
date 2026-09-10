package com.ps26104.aawaz.detector

import android.content.Context

/**
 * Single owner of the Mode A pipeline.
 *
 * The audio producer (the WebRTC sink) and the risk consumer (the RN bridge)
 * are created independently and must reach the same pipeline instance. This is
 * that instance, and nothing more.
 *
 * No React Native imports.
 */
object ModeAController {

    @Volatile
    private var instance: ModeAPipeline? = null

    /** The pipeline, created on first use. */
    fun pipeline(context: Context): ModeAPipeline {
        val existing = instance
        if (existing != null) return existing
        return synchronized(this) {
            instance ?: ModeAPipeline(context).also { instance = it }
        }
    }

    fun start(context: Context): ModeAPipeline = pipeline(context).also { it.start() }

    fun stop() {
        instance?.stop()
    }

    val isRunning: Boolean
        get() = instance?.isRunning == true

    val medianLatencyMs: Double
        get() = instance?.medianLatencyMs ?: 0.0

    val inferenceCount: Int
        get() = instance?.inferenceCount ?: 0
}
