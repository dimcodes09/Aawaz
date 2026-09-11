package com.ps26104.aawaz.diagnostics

import android.content.Context
import android.media.AudioManager
import android.util.Log
import com.ps26104.aawaz.detector.AudioCaptureService
import com.ps26104.aawaz.detector.ModeAController
import com.ps26104.aawaz.detector.WebRtcPcmSink
import org.webrtc.AudioTrack
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.RtpTransceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.audio.JavaAudioDeviceModule
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Phase B: a real two-device WebRTC audio call over the LAN.
 *
 * One PeerConnection per device - unlike [ModeALoopbackProbe], which wires two
 * PeerConnections together inside a single process and never touches a network.
 * Here the SDP crosses a real TCP socket ([LanSignalling]) and the media crosses
 * a real RTP path between two phones.
 *
 * Non-trickle ICE. Each side sets its local description, waits for
 * iceGatheringState == COMPLETE, and only then reads back `localDescription` -
 * which by that point carries every candidate inline. So exactly one offer and
 * one answer cross the wire and there is no candidate channel to keep open.
 *
 * Scope: establish the connection and detect the remote audio track. Attaching
 * WebRtcPcmSink and scoring is Phase D; injecting a WAV as the sender source is
 * Phase C. Nothing here touches the detector.
 *
 * Threading: every public entry point returns immediately and does its work on a
 * single background executor. libwebrtc observer callbacks arrive on its own
 * signalling thread and only ever count down a latch or post a log - they never
 * block, and they never touch the UI directly.
 */
class RealCallSession(
    context: Context,
    private val role: Role,
    private val events: Events,
) {

    enum class Role { CALLER, RECEIVER }

    /** UI/logging callbacks. Invoked off the main thread. */
    interface Events {
        /** A named state value changed, e.g. PEER_CONNECTION_STATE = CONNECTED. */
        fun onState(key: String, value: String)

        /** A one-shot milestone was reached, e.g. OFFER_SENT. */
        fun onMilestone(name: String)

        /** Terminal failure; the session has stopped. */
        fun onFailure(message: String)
    }

    companion object {
        const val TAG = "AAWAZ_DIAG"
        private const val STREAM_ID = "aawaz_call_stream"
        private const val TRACK_ID = "aawaz_call_audio"

        /** ICE gathering on a LAN is quick; this is a generous ceiling. */
        private const val ICE_GATHER_TIMEOUT_MS = 15_000L
        private const val SIGNAL_TIMEOUT_MS = 60_000

        /**
         * The phone's LAN address, for showing on screen so the other device can
         * be pointed at it. Site-local IPv4 only - loopback and link-local are
         * useless to a peer.
         */
        fun localIpAddress(): String {
            return try {
                val usable = NetworkInterface.getNetworkInterfaces().toList()
                    .filter { it.isUp && !it.isLoopback }
                    .flatMap { iface ->
                        iface.inetAddresses.toList()
                            .filterIsInstance<Inet4Address>()
                            .filter { !it.isLoopbackAddress && !it.isLinkLocalAddress }
                            .map { iface.name to it }
                    }

                // Prefer Wi-Fi. A phone on mobile data also has a site-local IPv4
                // on rmnet_*, and showing that would send the other phone chasing
                // an address it can never reach. Both devices must be on the same
                // LAN for this to work at all, so wlan is the only useful answer.
                val wifi = usable.firstOrNull {
                    it.first.startsWith("wlan") || it.first.startsWith("ap")
                }
                val chosen = wifi ?: usable.firstOrNull()
                when {
                    chosen == null -> "no IPv4"
                    wifi == null -> "${chosen.second.hostAddress} (${chosen.first}, NOT Wi-Fi)"
                    else -> chosen.second.hostAddress ?: "no IPv4"
                }
            } catch (t: Throwable) {
                "unknown (${t.javaClass.simpleName})"
            }
        }
    }

    private val appContext = context.applicationContext
    private val audioManager =
        appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val worker = Executors.newSingleThreadExecutor { r ->
        Thread(r, "aawaz-realcall")
    }
    private val running = AtomicBoolean(false)

    private var factory: PeerConnectionFactory? = null
    private var adm: JavaAudioDeviceModule? = null
    private var eglBase: EglBase? = null
    private var peer: PeerConnection? = null
    private var localTrack: AudioTrack? = null
    private var remoteTrack: AudioTrack? = null

    /** Caller only: replaces mic buffers with the selected demo clip. */
    private var wavSource: WavInjectingAudioSource? = null

    /** Receiver only: the existing sink that feeds the existing pipeline. */
    private var pcmSink: WebRtcPcmSink? = null

    private var listener: LanSignalling.Listener? = null
    private var connection: LanSignalling.Connection? = null

    private var previousAudioMode = AudioManager.MODE_NORMAL

    /** Counted down by the observer when gathering finishes. Replaced per negotiation. */
    @Volatile
    private var gatherLatch = CountDownLatch(1)

    @Volatile
    private var remoteTrackSeen = false

    /** Label of the clip the caller most recently announced. */
    @Volatile
    private var incomingClipLabel: String = "pre-clip (connection audio)"

    val isRunning: Boolean
        get() = running.get()

    // ------------------------------------------------------------------ start

    fun start(receiverIp: String? = null) {
        if (running.getAndSet(true)) {
            Log.i(TAG, "WEBRTC_$role already running")
            return
        }
        worker.execute {
            try {
                state("ROLE", role.name)
                state("LOCAL_IP", localIpAddress())
                buildStack()
                when (role) {
                    Role.CALLER -> runCaller(
                        requireNotNull(receiverIp) { "caller needs the receiver IP" })
                    Role.RECEIVER -> runReceiver()
                }
            } catch (t: Throwable) {
                Log.e(TAG, "WEBRTC_$role failed: ${t.javaClass.simpleName}: ${t.message}", t)
                events.onFailure("${t.javaClass.simpleName}: ${t.message}")
                stop()
            }
        }
    }

    /**
     * Builds the WebRTC stack with the same configuration the loopback probe
     * proved out: Java ADM, hardware AEC/NS off, Unified Plan, no ICE servers.
     * Both phones sit on one LAN, so host candidates are sufficient and STUN
     * would only add a dependency on the internet.
     */
    private fun buildStack() {
        previousAudioMode = audioManager.mode
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        Log.i(
            TAG,
            "WEBRTC_$role audioMode=${AudioCaptureService.audioModeName(audioManager.mode)} " +
                "(was ${AudioCaptureService.audioModeName(previousAudioMode)})"
        )

        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(appContext)
                .createInitializationOptions()
        )

        val builder = JavaAudioDeviceModule.builder(appContext)
            .setUseHardwareAcousticEchoCanceler(false)
            .setUseHardwareNoiseSuppressor(false)

        if (role == Role.CALLER) {
            // Phase C: the demo clip replaces the microphone inside the ADM, so
            // what leaves this phone over RTP is the WAV and nothing else.
            val injector = WavInjectingAudioSource(appContext)
            wavSource = injector
            builder.setAudioBufferCallback(injector)
            Log.i(TAG, "WEBRTC_CALLER audio buffer injection armed")
        }

        val module = builder.createAudioDeviceModule()
        adm = module

        val egl = EglBase.create()
        eglBase = egl

        val pcf = PeerConnectionFactory.builder()
            .setAudioDeviceModule(module)
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(egl.eglBaseContext, true, true))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(egl.eglBaseContext))
            .createPeerConnectionFactory()
        factory = pcf

        val config = PeerConnection.RTCConfiguration(emptyList()).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }

        peer = pcf.createPeerConnection(config, CallObserver())
            ?: throw IllegalStateException("createPeerConnection returned null")

        // Only the caller sends audio in this phase. Leaving the receiver without
        // a track keeps its microphone closed and makes the direction obvious in
        // the SDP: the receiver is recvonly.
        if (role == Role.CALLER) {
            val constraints = MediaConstraints().apply {
                mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "false"))
            }
            val source = pcf.createAudioSource(constraints)
            val track = pcf.createAudioTrack(TRACK_ID, source)
            localTrack = track
            peer?.addTrack(track, listOf(STREAM_ID))
            Log.i(TAG, "WEBRTC_CALLER local audio track added (mic source for Phase B)")
        }
    }

    // ----------------------------------------------------------------- caller

    private fun runCaller(receiverIp: String) {
        milestone("SIGNALLING_STARTED")
        state("SIGNALLING_STATE", "connecting to $receiverIp:${LanSignalling.DEFAULT_PORT}")
        Log.i(TAG, "WEBRTC_CALLER_CONNECT $receiverIp:${LanSignalling.DEFAULT_PORT}")

        val conn = LanSignalling.connect(
            receiverIp, LanSignalling.DEFAULT_PORT, 10_000
        ) { Log.i(TAG, "WEBRTC_CALLER $it") }
        connection = conn
        state("SIGNALLING_STATE", "connected")

        val pc = requireNotNull(peer)

        gatherLatch = CountDownLatch(1)
        val offer = createSdp(pc, isOffer = true)
        milestone("OFFER_CREATED")
        Log.i(TAG, "WEBRTC_CALLER_OFFER_CREATED ${offer.description.length} chars")

        setLocal(pc, offer)
        awaitIceGathering(pc)
        milestone("OFFER_ICE_COMPLETE")
        Log.i(TAG, "WEBRTC_CALLER_ICE_COMPLETE")

        // localDescription now carries every gathered candidate inline.
        val full = requireNotNull(pc.localDescription) { "no local description after gathering" }
        conn.send(LanSignalling.Message(LanSignalling.TYPE_OFFER, full.description))
        milestone("OFFER_SENT")
        Log.i(TAG, "WEBRTC_CALLER offer sent, ${full.description.length} chars, " +
            "${countCandidates(full.description)} candidates")

        val answer = conn.receive(SIGNAL_TIMEOUT_MS)
        require(answer.type == LanSignalling.TYPE_ANSWER) { "expected answer, got ${answer.type}" }
        milestone("ANSWER_RECEIVED")
        Log.i(TAG, "WEBRTC_CALLER answer received, ${answer.sdp.length} chars, " +
            "${countCandidates(answer.sdp)} candidates")

        setRemote(pc, SessionDescription(SessionDescription.Type.ANSWER, answer.sdp))
        state("SIGNALLING_STATE", "complete")
        Log.i(TAG, "WEBRTC_CALLER waiting for connectivity")
    }

    // --------------------------------------------------------------- receiver

    private fun runReceiver() {
        milestone("SIGNALLING_STARTED")
        val srv = LanSignalling.Listener(LanSignalling.DEFAULT_PORT) {
            Log.i(TAG, "WEBRTC_RECEIVER $it")
        }
        listener = srv
        state("SIGNALLING_STATE", "listening on ${localIpAddress()}:${srv.boundPort}")
        Log.i(TAG, "WEBRTC_RECEIVER_LISTENING port=${srv.boundPort} ip=${localIpAddress()}")

        // Blocking accept, on the worker thread. stop() closes the socket, which
        // unblocks this with an exception rather than leaving a thread parked.
        val conn = srv.accept(0)
        connection = conn
        state("SIGNALLING_STATE", "caller connected from ${conn.remoteAddress}")

        val offer = conn.receive(SIGNAL_TIMEOUT_MS)
        require(offer.type == LanSignalling.TYPE_OFFER) { "expected offer, got ${offer.type}" }
        milestone("OFFER_RECEIVED")
        Log.i(TAG, "WEBRTC_RECEIVER_OFFER_RECEIVED ${offer.sdp.length} chars, " +
            "${countCandidates(offer.sdp)} candidates")

        val pc = requireNotNull(peer)
        setRemote(pc, SessionDescription(SessionDescription.Type.OFFER, offer.sdp))

        gatherLatch = CountDownLatch(1)
        val answer = createSdp(pc, isOffer = false)
        milestone("ANSWER_CREATED")
        Log.i(TAG, "WEBRTC_RECEIVER_ANSWER_CREATED ${answer.description.length} chars")

        setLocal(pc, answer)
        awaitIceGathering(pc)
        milestone("ANSWER_ICE_COMPLETE")
        Log.i(TAG, "WEBRTC_RECEIVER_ICE_COMPLETE")

        val full = requireNotNull(pc.localDescription) { "no local description after gathering" }
        conn.send(LanSignalling.Message(LanSignalling.TYPE_ANSWER, full.description))
        milestone("ANSWER_SENT")
        Log.i(TAG, "WEBRTC_RECEIVER answer sent, ${full.description.length} chars, " +
            "${countCandidates(full.description)} candidates")

        state("SIGNALLING_STATE", "complete")
        Log.i(TAG, "WEBRTC_RECEIVER waiting for connectivity")

        awaitClipControl(conn)
    }

    /**
     * Receiver control loop. The signalling socket stays open after negotiation
     * purely so the caller can announce a clip start.
     *
     * Why this is needed: ModeAPipeline scores the FIRST window after it starts,
     * which is the only condition this checkpoint is trustworthy in. Without a
     * cue, that window lands on the silence right after connection and the clip
     * is never scored. Restarting the pipeline here re-arms the window so it
     * begins with the clip, leading silence and all.
     */
    private fun awaitClipControl(conn: LanSignalling.Connection) {
        while (running.get()) {
            val message = try {
                conn.receive(0)
            } catch (t: Throwable) {
                if (running.get()) Log.i(TAG, "WEBRTC_RECEIVER control loop ended: ${t.message}")
                return
            }
            if (message.type != LanSignalling.TYPE_CLIP_START) continue

            Log.i(TAG, "WEBRTC_RECEIVER_CLIP_START label=${message.sdp}")
            incomingClipLabel = message.sdp
            state("INCOMING_CLIP", message.sdp)
            try {
                // Fresh ring buffer and aggregator, so the next window is the clip.
                val pipeline = ModeAController.pipeline(appContext)
                val existing = pipeline.listener
                ModeAController.stop()
                // Preserve whoever owns the listener across the restart, so the
                // real Aawaz screen keeps receiving AawazRisk events.
                pipeline.listener = existing ?: ModeAPipelineListener()
                ModeAController.start(appContext)
                Log.i(
                    TAG,
                    "WEBRTC_RECEIVER detector re-armed for ${message.sdp}; " +
                        "next window starts from remote RTP audio"
                )
            } catch (t: Throwable) {
                Log.e(TAG, "WEBRTC_RECEIVER re-arm failed: ${t.message}", t)
            }
        }
    }

    // ------------------------------------------------------------ sdp helpers

    /** Blocking wrapper around createOffer/createAnswer. Worker thread only. */
    private fun createSdp(pc: PeerConnection, isOffer: Boolean): SessionDescription {
        val latch = CountDownLatch(1)
        var result: SessionDescription? = null
        var error: String? = null
        val observer = object : SdpObserver {
            override fun onCreateSuccess(description: SessionDescription) {
                result = description
                latch.countDown()
            }

            override fun onSetSuccess() {}
            override fun onCreateFailure(message: String?) {
                error = message
                latch.countDown()
            }

            override fun onSetFailure(message: String?) {}
        }
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }
        if (isOffer) pc.createOffer(observer, constraints) else pc.createAnswer(observer, constraints)

        if (!latch.await(15, TimeUnit.SECONDS)) throw IllegalStateException("createSdp timed out")
        error?.let { throw IllegalStateException("createSdp failed: $it") }
        return requireNotNull(result)
    }

    private fun setLocal(pc: PeerConnection, sdp: SessionDescription) =
        awaitSet("setLocalDescription") { pc.setLocalDescription(it, sdp) }

    private fun setRemote(pc: PeerConnection, sdp: SessionDescription) =
        awaitSet("setRemoteDescription") { pc.setRemoteDescription(it, sdp) }

    private fun awaitSet(label: String, action: (SdpObserver) -> Unit) {
        val latch = CountDownLatch(1)
        var error: String? = null
        action(object : SdpObserver {
            override fun onCreateSuccess(description: SessionDescription) {}
            override fun onSetSuccess() {
                latch.countDown()
            }

            override fun onCreateFailure(message: String?) {}
            override fun onSetFailure(message: String?) {
                error = message
                latch.countDown()
            }
        })
        if (!latch.await(15, TimeUnit.SECONDS)) throw IllegalStateException("$label timed out")
        error?.let { throw IllegalStateException("$label failed: $it") }
    }

    /**
     * Non-trickle gate: block until gathering completes. Checks the current
     * state first, because gathering can finish before the latch is installed.
     */
    private fun awaitIceGathering(pc: PeerConnection) {
        if (pc.iceGatheringState() == PeerConnection.IceGatheringState.COMPLETE) {
            state("ICE_GATHERING_STATE", "COMPLETE")
            return
        }
        if (!gatherLatch.await(ICE_GATHER_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
            throw IllegalStateException("ICE gathering did not complete in ${ICE_GATHER_TIMEOUT_MS}ms")
        }
    }

    private fun countCandidates(sdp: String) = sdp.lineSequence().count { it.startsWith("a=candidate") }

    // ------------------------------------------------------------------- stop

    /** Caller: send one of the validated demo clips over the live connection. */
    fun playClip(key: String) {
        val entry = com.ps26104.aawaz.detector.DemoAudioSource.CLIPS[key]
        if (entry == null) {
            Log.e(TAG, "WEBRTC_CALLER unknown clip key $key")
            return
        }
        val injector = wavSource
        if (injector == null) {
            Log.e(TAG, "WEBRTC_CALLER no injector; is this the caller role and session started?")
            return
        }
        // Tell the receiver first: it restarts its pipeline so the scored window
        // begins with this clip rather than with whatever silence preceded it.
        try {
            connection?.send(
                LanSignalling.Message(LanSignalling.TYPE_CLIP_START, entry.second)
            )
            Log.i(TAG, "WEBRTC_CALLER clip_start signalled: ${entry.second}")
        } catch (t: Throwable) {
            Log.e(TAG, "WEBRTC_CALLER could not signal clip start: ${t.message}")
        }
        injector.play(entry.first, entry.second)
        state("SENDING_CLIP", entry.second)
    }

    fun stopClip() {
        wavSource?.stopClip()
        state("SENDING_CLIP", "none")
    }

    fun stop() {
        if (!running.getAndSet(false)) return
        Log.i(TAG, "===== WEBRTC_$role STOP =====")

        // Closing the sockets first unblocks any parked accept()/receive().
        quietly { connection?.close() }
        quietly { listener?.close() }
        connection = null
        listener = null

        quietly { wavSource?.stopClip() }
        wavSource = null
        quietly { pcmSink?.let { sink -> remoteTrack?.removeSink(sink) } }
        pcmSink = null
        quietly { if (role == Role.RECEIVER) ModeAController.stop() }
        quietly { remoteTrack = null }
        quietly { localTrack?.dispose() }
        localTrack = null

        quietly { peer?.close() }
        quietly { peer?.dispose() }
        peer = null

        quietly { factory?.dispose() }
        factory = null
        quietly { adm?.release() }
        adm = null
        quietly { eglBase?.release() }
        eglBase = null

        quietly { audioManager.mode = previousAudioMode }
        remoteTrackSeen = false

        worker.shutdownNow()
        state("SIGNALLING_STATE", "stopped")
        state("PEER_CONNECTION_STATE", "CLOSED")
    }

    private inline fun quietly(block: () -> Unit) {
        try {
            block()
        } catch (ignored: Throwable) {
        }
    }

    private fun state(key: String, value: String) {
        Log.i(TAG, "WEBRTC_${role}_STATE $key=$value")
        events.onState(key, value)
    }

    private fun milestone(name: String) {
        Log.i(TAG, "WEBRTC_${role}_MILESTONE $name")
        events.onMilestone(name)
    }

    /** Surfaces the existing AawazRisk reading; no new scoring logic. */
    private inner class ModeAPipelineListener :
        com.ps26104.aawaz.detector.ModeAPipeline.Listener {
        private var firstResultLogged = false
        private val label: String = incomingClipLabel

        override fun onRisk(reading: com.ps26104.aawaz.detector.RiskAggregator.Reading) {
            state("RISK", "${reading.score} ${reading.state}")
            if (!firstResultLogged && reading.state != "ANALYSING") {
                firstResultLogged = true
                Log.i(
                    TAG,
                    "WEBRTC_RECEIVER_FIRST_DETECTOR_RESULT clip=$label " +
                        "score=${reading.score} state=${reading.state} " +
                        "clipSource=REMOTE_WEBRTC_TRACK"
                )
            }
        }
    }

    // --------------------------------------------------------------- observer

    private inner class CallObserver : PeerConnection.Observer {
        override fun onSignalingChange(newState: PeerConnection.SignalingState) {
            state("SIGNALING", newState.name)
        }

        override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState) {
            state("ICE_CONNECTION_STATE", newState.name)
        }

        override fun onConnectionChange(newState: PeerConnection.PeerConnectionState) {
            state("PEER_CONNECTION_STATE", newState.name)
            if (newState == PeerConnection.PeerConnectionState.CONNECTED) {
                milestone("PEER_CONNECTION_CONNECTED")
                Log.i(TAG, "WEBRTC_${role}_CONNECTED")
            }
        }

        override fun onIceConnectionReceivingChange(receiving: Boolean) {}

        override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState) {
            state("ICE_GATHERING_STATE", newState.name)
            if (newState == PeerConnection.IceGatheringState.COMPLETE) {
                // Never block here: this is libwebrtc's signalling thread.
                gatherLatch.countDown()
            }
        }

        /** Non-trickle: candidates ride inside the SDP, so nothing is sent here. */
        override fun onIceCandidate(candidate: IceCandidate) {}

        override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) {}
        override fun onAddStream(stream: MediaStream) {}
        override fun onRemoveStream(stream: MediaStream) {}
        override fun onDataChannel(channel: org.webrtc.DataChannel) {}
        override fun onRenegotiationNeeded() {}

        override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>?) {
            (receiver.track() as? AudioTrack)?.let { noteRemoteTrack(it, "onAddTrack") }
        }

        override fun onTrack(transceiver: RtpTransceiver) {
            (transceiver.receiver?.track() as? AudioTrack)?.let { noteRemoteTrack(it, "onTrack") }
        }
    }

    /**
     * Remote audio arrived. Deliberately left audible - no setVolume(0.0) here.
     * That mute existed only to stop the echo canceller eating the single-device
     * loopback; on two phones the receiver is meant to hear the caller.
     */
    private fun noteRemoteTrack(track: AudioTrack, via: String) {
        if (remoteTrackSeen) return
        remoteTrackSeen = true
        remoteTrack = track
        state("REMOTE_TRACK_RECEIVED", "true")
        milestone("REMOTE_TRACK_RECEIVED")
        Log.i(
            TAG,
            "WEBRTC_RECEIVER_REMOTE_TRACK via=$via id=${track.id()} " +
                "state=${track.state()} enabled=${track.enabled()}"
        )
        Log.i(TAG, "WEBRTC_RECEIVER_REMOTE_AUDIO audible (no setVolume(0.0) applied)")

        if (role != Role.RECEIVER) return
        try {
            // The existing pipeline and the existing sink. Nothing new is built:
            // this is the same wiring the loopback probe used, now fed by audio
            // that arrived over RTP from another phone.
            val pipeline = ModeAController.pipeline(appContext)
            // If the React Native bridge already owns the listener, leave it be -
            // that is what drives the real Aawaz UI. Ours is only a fallback.
            if (pipeline.listener == null) pipeline.listener = ModeAPipelineListener()
            ModeAController.start(appContext)

            val sink = WebRtcPcmSink(
                appContext,
                frameSink = pipeline
            )
            pcmSink = sink
            track.addSink(sink)
            Log.i(
                TAG,
                "WEBRTC_RECEIVER_FIRST_PCM sink attached to REMOTE track; " +
                    "detector input originates from RTP, not from any local file"
            )
            state("DETECTOR", "listening to remote track")
        } catch (t: Throwable) {
            Log.e(TAG, "WEBRTC_RECEIVER sink attach failed: ${t.javaClass.simpleName}: ${t.message}", t)
        }
    }
}
