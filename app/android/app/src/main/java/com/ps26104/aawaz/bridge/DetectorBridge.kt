package com.ps26104.aawaz.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.ps26104.aawaz.detector.DemoAudioSource
import com.ps26104.aawaz.detector.MicAudioSource
import com.ps26104.aawaz.detector.ModeAController
import com.ps26104.aawaz.detector.RiskAggregator

/**
 * The one React Native aware file in the project.
 *
 * Audio never crosses the bridge. The pipeline runs entirely in
 * com.ps26104.aawaz.detector and hands this class a finished reading; only
 * { score, state, ts } is emitted to JS, at 1 Hz.
 *
 * Contract (docs/CONTRACTS.md):
 *   event "AawazRisk" -> { score: Int 0-100, state: String, ts: Long }
 *   state in "ANALYSING" | "OK" | "ELEVATED" | "HIGH"
 */
class DetectorBridge(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "DetectorBridge"
        const val EVENT_RISK = "AawazRisk"
    }

    override fun getName(): String = NAME

    private val listener = ModeAPipelineListener()
    private var demoSource: DemoAudioSource? = null
    private var micSource: MicAudioSource? = null

    @ReactMethod
    fun startModeA(promise: Promise) {
        try {
            val pipeline = ModeAController.pipeline(reactContext)
            pipeline.listener = listener
            pipeline.start()
            promise.resolve(pipeline.isRunning)
        } catch (t: Throwable) {
            promise.reject("MODEA_START_FAILED", t.message, t)
        }
    }

    @ReactMethod
    fun stopModeA(promise: Promise) {
        try {
            ModeAController.stop()
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("MODEA_STOP_FAILED", t.message, t)
        }
    }

    /**
     * Judge demo: play a validated clip out loud and score that same audio with
     * the existing detector. "real" or "fake". Runs off the JS thread; the
     * resulting risk arrives through the normal AawazRisk event, not from here.
     */
    @ReactMethod
    fun playDemoClip(kind: String, promise: Promise) {
        try {
            // Unknown keys fall back to the original REAL clip, so the existing
            // "real" / "fake" judge-demo behaviour is unchanged.
            val entry = DemoAudioSource.CLIPS[kind.lowercase()]
                ?: (DemoAudioSource.ASSET_REAL to "REAL HUMAN")
            val asset = entry.first
            val label = entry.second
            val source = demoSource ?: DemoAudioSource(reactContext).also { demoSource = it }
            if (source.isPlaying) {
                promise.resolve(false)
                return
            }
            pipelineListenerAttached()
            Thread({ source.play(asset, label) }, "aawaz-demo-audio").start()
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("DEMO_CLIP_FAILED", t.message, t)
        }
    }

    /** Current media volume as a percentage, so the UI can warn if it is muted. */
    @ReactMethod
    fun getMediaVolumePercent(promise: Promise) {
        val source = demoSource ?: DemoAudioSource(reactContext).also { demoSource = it }
        promise.resolve(source.mediaVolumePercent())
    }

    /**
     * DemoAudioSource restarts the pipeline, which does not clear the listener
     * field, but re-asserting it keeps this safe if start order ever changes.
     */
    private fun pipelineListenerAttached() {
        ModeAController.pipeline(reactContext).listener = listener
    }

    /**
     * Live microphone into the existing detector. Audio is never stored; it goes
     * straight to the same PcmFrameSink the demo clips and WebRTC use.
     */
    @ReactMethod
    fun startMicDetection(promise: Promise) {
        try {
            ModeAController.pipeline(reactContext).listener = listener
            val source = micSource ?: MicAudioSource(reactContext).also { micSource = it }
            promise.resolve(source.start())
        } catch (t: Throwable) {
            promise.reject("MIC_START_FAILED", t.message, t)
        }
    }

    @ReactMethod
    fun stopMicDetection(promise: Promise) {
        try {
            micSource?.stop()
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("MIC_STOP_FAILED", t.message, t)
        }
    }

    /** Utterance capture: buffer the mic, score once. Nothing is persisted. */
    @ReactMethod
    fun startRecording(promise: Promise) {
        try {
            val source = micSource ?: MicAudioSource(reactContext).also { micSource = it }
            promise.resolve(source.startRecording())
        } catch (t: Throwable) {
            promise.reject("REC_START_FAILED", t.message, t)
        }
    }

    /** Returns seconds analysed, or -1 if the clip was too short to score. */
    @ReactMethod
    fun analyzeRecording(promise: Promise) {
        try {
            ModeAController.pipeline(reactContext).listener = listener
            val source = micSource
            if (source == null) {
                promise.resolve(-1.0)
                return
            }
            promise.resolve(source.stopAndAnalyze())
        } catch (t: Throwable) {
            promise.reject("REC_ANALYZE_FAILED", t.message, t)
        }
    }

    /** Median inference latency in ms, for the pitch numbers. */
    @ReactMethod
    fun getMedianLatencyMs(promise: Promise) {
        promise.resolve(ModeAController.medianLatencyMs)
    }

    /** Required by NativeEventEmitter on iOS; harmless no-ops on Android. */
    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    private fun emit(reading: RiskAggregator.Reading) {
        if (!reactContext.hasActiveReactInstance()) return
        val payload: WritableMap = Arguments.createMap().apply {
            putInt("score", reading.score)
            putString("state", reading.state)
            putDouble("ts", reading.ts.toDouble())
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_RISK, payload)
    }

    private inner class ModeAPipelineListener : com.ps26104.aawaz.detector.ModeAPipeline.Listener {
        override fun onRisk(reading: RiskAggregator.Reading) = emit(reading)
    }
}
