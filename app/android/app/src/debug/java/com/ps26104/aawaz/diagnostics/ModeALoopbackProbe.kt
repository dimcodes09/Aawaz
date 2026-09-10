package com.ps26104.aawaz.diagnostics

import android.content.Context
import android.media.AudioManager
import android.util.Log
import com.ps26104.aawaz.detector.AudioCaptureService
import com.ps26104.aawaz.detector.CallStateMonitor
import com.ps26104.aawaz.detector.WebRtcPcmSink
import org.webrtc.AudioTrack
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.MediaStreamTrack
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.RtpTransceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.audio.JavaAudioDeviceModule

/**
 * Single-device loopback WebRTC probe. Debug-only test rig, not product code.
 *
 * Two PeerConnections on this device, wired directly to each other with no
 * signalling server and no network hop: pcLocal sends a microphone audio track,
 * pcRemote receives it. The received (remote) RTCAudioTrack is what a real call
 * would hand us, so attaching a sink to it proves the Mode A PCM path.
 *
 * The only thing being proven here is that raw PCM can be pulled off a remote
 * audio track. No call UI, no signalling, no product logic.
 */
class ModeALoopbackProbe(private val context: Context) {

    companion object {
        private const val TAG = "AAWAZ_DIAG"
        private const val STREAM_ID = "aawaz_probe_stream"

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private var factory: PeerConnectionFactory? = null
    private var audioDeviceModule: JavaAudioDeviceModule? = null
    private var pcLocal: PeerConnection? = null
    private var pcRemote: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var remoteAudioTrack: AudioTrack? = null
    private var sink: WebRtcPcmSink? = null
    private var eglBase: EglBase? = null

    private var callStateMonitor: CallStateMonitor? = null
    private val audioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var previousAudioMode = AudioManager.MODE_NORMAL

    fun start() {
        if (isRunning) {
            Log.i(TAG, "MODEA_PROBE already running")
            return
        }
        Log.i(TAG, "===== MODE A PROBE START: WebRTC loopback, remote track sink =====")

        try {
            previousAudioMode = audioManager.mode
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            Log.i(
                TAG,
                "MODEA_PROBE: audioMode set to " +
                    AudioCaptureService.audioModeName(audioManager.mode) +
                    " (was " + AudioCaptureService.audioModeName(previousAudioMode) + ")"
            )

            callStateMonitor = CallStateMonitor(context).also { it.start() }

            PeerConnectionFactory.initialize(
                PeerConnectionFactory.InitializationOptions.builder(context)
                    .createInitializationOptions()
            )

            // APM off. In a single-device loopback the "remote" signal IS our own
            // microphone, so an active echo canceller treats it as echo and
            // suppresses it almost completely - which would make the sink look
            // silent for reasons that have nothing to do with the PCM path.
            val adm = JavaAudioDeviceModule.builder(context)
                .setUseHardwareAcousticEchoCanceler(false)
                .setUseHardwareNoiseSuppressor(false)
                .createAudioDeviceModule()
            audioDeviceModule = adm

            val egl = EglBase.create()
            eglBase = egl

            val pcf = PeerConnectionFactory.builder()
                .setAudioDeviceModule(adm)
                .setVideoEncoderFactory(DefaultVideoEncoderFactory(egl.eglBaseContext, true, true))
                .setVideoDecoderFactory(DefaultVideoDecoderFactory(egl.eglBaseContext))
                .createPeerConnectionFactory()
            factory = pcf

            val config = PeerConnection.RTCConfiguration(emptyList()).apply {
                sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            }

            val local = pcf.createPeerConnection(config, LocalObserver())
                ?: throw IllegalStateException("createPeerConnection(local) returned null")
            val remote = pcf.createPeerConnection(config, RemoteObserver())
                ?: throw IllegalStateException("createPeerConnection(remote) returned null")
            pcLocal = local
            pcRemote = remote

            val audioConstraints = MediaConstraints().apply {
                mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "false"))
                mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "false"))
            }
            val audioSource = pcf.createAudioSource(audioConstraints)
            val track = pcf.createAudioTrack("aawaz_probe_local_audio", audioSource)
            localAudioTrack = track
            local.addTrack(track, listOf(STREAM_ID))

            isRunning = true
            negotiate(local, remote)
        } catch (t: Throwable) {
            Log.e(TAG, "MODEA_PROBE start failed: " + t.javaClass.simpleName + ": " + t.message, t)
            stop()
        }
    }

    fun stop() {
        if (!isRunning && factory == null) return
        isRunning = false
        Log.i(TAG, "===== MODE A PROBE STOP =====")

        try {
            remoteAudioTrack?.let { track -> sink?.let { track.removeSink(it) } }
        } catch (t: Throwable) {
            Log.w(TAG, "MODEA_PROBE removeSink failed: " + t.message)
        }
        sink = null
        remoteAudioTrack = null

        closeQuietly { pcLocal?.close(); pcLocal?.dispose() }
        closeQuietly { pcRemote?.close(); pcRemote?.dispose() }
        pcLocal = null
        pcRemote = null
        localAudioTrack = null

        closeQuietly { factory?.dispose() }
        factory = null
        closeQuietly { audioDeviceModule?.release() }
        audioDeviceModule = null
        closeQuietly { eglBase?.release() }
        eglBase = null

        callStateMonitor?.stop()
        callStateMonitor = null

        closeQuietly { audioManager.mode = previousAudioMode }
        WebRtcPcmSink.clearLatest()
        Log.i(TAG, "MODEA_PROBE stopped, audioMode restored to " +
            AudioCaptureService.audioModeName(audioManager.mode))
    }

    // ------------------------------------------------------------ negotiation

    /**
     * Offer/answer exchanged directly between the two local PeerConnections.
     * No signalling server: the SDP is simply handed across in process.
     */
    private fun negotiate(local: PeerConnection, remote: PeerConnection) {
        local.createOffer(object : SimpleSdpObserver("createOffer") {
            override fun onCreateSuccess(offer: SessionDescription) {
                local.setLocalDescription(object : SimpleSdpObserver("local.setLocal") {
                    override fun onSetSuccess() {
                        remote.setRemoteDescription(object : SimpleSdpObserver("remote.setRemote") {
                            override fun onSetSuccess() {
                                createAnswer(local, remote)
                            }
                        }, offer)
                    }
                }, offer)
            }
        }, MediaConstraints())
    }

    private fun createAnswer(local: PeerConnection, remote: PeerConnection) {
        remote.createAnswer(object : SimpleSdpObserver("createAnswer") {
            override fun onCreateSuccess(answer: SessionDescription) {
                remote.setLocalDescription(object : SimpleSdpObserver("remote.setLocal") {
                    override fun onSetSuccess() {
                        local.setRemoteDescription(
                            object : SimpleSdpObserver("local.setRemote") {
                                override fun onSetSuccess() {
                                    Log.i(TAG, "MODEA_PROBE: loopback negotiation complete")
                                }
                            }, answer
                        )
                    }
                }, answer)
            }
        }, MediaConstraints())
    }

    private fun attachSink(track: AudioTrack) {
        if (sink != null) return
        remoteAudioTrack = track
        val monitor = callStateMonitor
        val pcmSink = WebRtcPcmSink(
            context,
            callStateProvider = { monitor?.currentState ?: CallStateMonitor.STATE_UNKNOWN }
        )
        sink = pcmSink
        track.addSink(pcmSink)
        // Mute playout. The sink taps the track before the output mixer, so we
        // still get every PCM frame, but nothing is played into the room. That
        // removes the acoustic loop the echo canceller would otherwise converge
        // on and cancel - which is what silenced the sink after ~10 s.
        track.setVolume(0.0)
        Log.i(
            TAG,
            "MODEA_PROBE: AudioTrackSink attached to REMOTE track id=" + track.id() +
                " state=" + track.state() + " enabled=" + track.enabled()
        )
    }

    private inline fun closeQuietly(block: () -> Unit) {
        try {
            block()
        } catch (t: Throwable) {
            Log.w(TAG, "MODEA_PROBE teardown step failed: " + t.message)
        }
    }

    // -------------------------------------------------------------- observers

    private inner class LocalObserver : BaseObserver("local") {
        override fun onIceCandidate(candidate: IceCandidate) {
            pcRemote?.addIceCandidate(candidate)
        }
    }

    private inner class RemoteObserver : BaseObserver("remote") {
        override fun onIceCandidate(candidate: IceCandidate) {
            pcLocal?.addIceCandidate(candidate)
        }

        override fun onTrack(transceiver: RtpTransceiver) {
            val track = transceiver.receiver?.track()
            if (track is AudioTrack) {
                Log.i(TAG, "MODEA_PROBE: onTrack delivered a remote AudioTrack")
                attachSink(track)
            }
        }

        override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>?) {
            val track = receiver.track()
            if (track is AudioTrack) {
                Log.i(TAG, "MODEA_PROBE: onAddTrack delivered a remote AudioTrack")
                attachSink(track)
            }
        }
    }

    private open inner class BaseObserver(private val label: String) : PeerConnection.Observer {
        override fun onSignalingChange(state: PeerConnection.SignalingState) {}
        override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
            Log.i(TAG, "MODEA_PROBE[" + label + "] iceConnection=" + state)
        }

        override fun onConnectionChange(state: PeerConnection.PeerConnectionState) {
            Log.i(TAG, "MODEA_PROBE[" + label + "] connection=" + state)
        }

        override fun onIceConnectionReceivingChange(receiving: Boolean) {}
        override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {}
        override fun onIceCandidate(candidate: IceCandidate) {}
        override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) {}
        override fun onAddStream(stream: MediaStream) {}
        override fun onRemoveStream(stream: MediaStream) {}
        override fun onDataChannel(channel: org.webrtc.DataChannel) {}
        override fun onRenegotiationNeeded() {}
        override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>?) {}
        override fun onTrack(transceiver: RtpTransceiver) {}
    }

    private open inner class SimpleSdpObserver(private val label: String) : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String?) {
            Log.e(TAG, "MODEA_PROBE " + label + " createFailure: " + error)
        }

        override fun onSetFailure(error: String?) {
            Log.e(TAG, "MODEA_PROBE " + label + " setFailure: " + error)
        }
    }
}
