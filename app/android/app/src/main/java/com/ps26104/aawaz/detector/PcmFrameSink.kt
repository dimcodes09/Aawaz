package com.ps26104.aawaz.detector

/**
 * Receives raw PCM frames pulled off a WebRTC remote audio track.
 *
 * Implementations are called on libwebrtc's audio thread and must return
 * quickly. [samples] is reused between calls; copy anything you keep.
 */
fun interface PcmFrameSink {
    fun onPcmFrames(samples: ShortArray, count: Int, sampleRate: Int, channels: Int)
}
