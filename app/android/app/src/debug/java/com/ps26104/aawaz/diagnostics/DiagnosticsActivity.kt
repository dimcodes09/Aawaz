package com.ps26104.aawaz.diagnostics

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.ps26104.aawaz.R
import com.ps26104.aawaz.detector.AudioCaptureService
import com.ps26104.aawaz.detector.DemoAudioSource
import com.ps26104.aawaz.detector.ModeAController
import com.ps26104.aawaz.detector.ModeAPipeline
import com.ps26104.aawaz.detector.WebRtcPcmSink
import java.util.Locale

/**
 * Debug-only harness for the audio feasibility test. Not present in release builds.
 *
 * Note on API 34+: a microphone-type foreground service can only be started while
 * the app is visible AND RECORD_AUDIO is already granted. Grant permissions first,
 * then press START CAPTURE from this screen.
 */
class DiagnosticsActivity : Activity() {

    companion object {
        private const val TAG = "AAWAZ_DIAG"
        private const val REQ_PERMISSIONS = 26104
        private const val UI_REFRESH_MS = 300L
    }

    private lateinit var metricsText: TextView
    private lateinit var deviceText: TextView
    private lateinit var permissionsText: TextView
    private lateinit var probeText: TextView
    private lateinit var modeaText: TextView
    private lateinit var micProbeText: TextView

    private var modeAProbe: ModeALoopbackProbe? = null
    private var feeder: ModeAFileFeeder? = null
    private var feedThread: Thread? = null
    private var micProbe: MicProbe? = null
    private var speakerPlayer: MediaPlayer? = null

    private val handler = Handler(Looper.getMainLooper())
    private val refresh = object : Runnable {
        override fun run() {
            renderLatest()
            renderPermissions()
            renderProbe()
            renderModeA()
            renderMicProbe()
            handler.postDelayed(this, UI_REFRESH_MS)
        }
    }

    private val requiredPermissions = arrayOf(
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.POST_NOTIFICATIONS
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_diagnostics)

        deviceText = findViewById(R.id.deviceText)
        permissionsText = findViewById(R.id.permissionsText)
        metricsText = findViewById(R.id.metricsText)
        probeText = findViewById(R.id.probeText)
        modeaText = findViewById(R.id.modeaText)
        micProbeText = findViewById(R.id.micProbeText)

        deviceText.text = Build.MANUFACTURER + " " + Build.MODEL +
            "  |  Android " + Build.VERSION.RELEASE + "  |  API " + Build.VERSION.SDK_INT

        findViewById<Button>(R.id.permissionsButton).setOnClickListener {
            if (hasAllPermissions()) {
                Toast.makeText(this, "All 3 already granted, nothing to ask", Toast.LENGTH_SHORT).show()
                Log.i(TAG, "GRANT PERMISSIONS pressed: all 3 already granted, no dialog needed")
            } else {
                requestPermissionsIfNeeded()
            }
            renderPermissions()
        }

        findViewById<Button>(R.id.startButton).setOnClickListener {
            if (!hasAllPermissions()) {
                Toast.makeText(this, "Grant permissions first", Toast.LENGTH_SHORT).show()
                requestPermissionsIfNeeded()
                return@setOnClickListener
            }
            AudioCaptureService.start(this)
            Log.i(TAG, "===== START CAPTURE pressed =====")
        }

        findViewById<Button>(R.id.stopButton).setOnClickListener {
            AudioCaptureService.stop(this)
            Log.i(TAG, "===== STOP CAPTURE pressed =====")
        }

        findViewById<Button>(R.id.probeAButton).setOnClickListener {
            if (!hasAllPermissions()) {
                Toast.makeText(this, "Grant permissions first", Toast.LENGTH_SHORT).show()
                requestPermissionsIfNeeded()
                return@setOnClickListener
            }
            if (modeAProbe == null) modeAProbe = ModeALoopbackProbe(this)
            modeAProbe?.start()
        }

        findViewById<Button>(R.id.probeAStopButton).setOnClickListener {
            modeAProbe?.stop()
        }

        findViewById<Button>(R.id.modeToggleButton).setOnClickListener { button ->
            val pipeline = ModeAController.pipeline(this)
            pipeline.scoreMode = if (pipeline.scoreMode == ModeAPipeline.ScoreMode.FIRST_WINDOW) {
                ModeAPipeline.ScoreMode.STREAMING
            } else {
                ModeAPipeline.ScoreMode.FIRST_WINDOW
            }
            (button as Button).text = "MODE: " + pipeline.scoreMode + " (tap to toggle)"
            Log.i(TAG, "===== MODEA SCORE MODE -> " + pipeline.scoreMode + " =====")
        }

        findViewById<Button>(R.id.testRealButton).setOnClickListener {
            runClip("modea_real_48k.wav", "REAL CLIP")
        }

        findViewById<Button>(R.id.testFakeButton).setOnClickListener {
            runClip("modea_fake_48k.wav", "SYNTHETIC CLIP")
        }

        findViewById<Button>(R.id.runSixPairsButton).setOnClickListener {
            runAllSixPairs()
        }

        findViewById<Button>(R.id.speakerRealButton).setOnClickListener {
            playThroughSpeakerOnly("demo_real_48k.wav", "REAL CLIP")
        }

        findViewById<Button>(R.id.speakerFakeButton).setOnClickListener {
            playThroughSpeakerOnly("demo_fake_48k.wav", "AI CLIP")
        }

        findViewById<Button>(R.id.micProbeStartButton).setOnClickListener {
            if (!hasAllPermissions()) {
                Toast.makeText(this, "Grant permissions first", Toast.LENGTH_SHORT).show()
                requestPermissionsIfNeeded()
                return@setOnClickListener
            }
            val probe = micProbe ?: MicProbe(this).also { micProbe = it }
            probe.start("MIC PROBE")
            Toast.makeText(this, "Mic probe started", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.micProbeStopButton).setOnClickListener {
            micProbe?.stop()
        speakerPlayer?.release()
        speakerPlayer = null
            Toast.makeText(this, "Mic probe stopped", Toast.LENGTH_SHORT).show()
        }

        bindMark(R.id.mark1Button, 1, "no call, room silent, noise floor")
        bindMark(R.id.mark2Button, 2, "no call, LOCAL speaking at ~30 cm")
        bindMark(R.id.mark3Button, 3, "carrier call, speakerphone, REMOTE talking, local silent")
        bindMark(R.id.mark4Button, 4, "carrier call, speakerphone, LOCAL talking, remote silent")
        bindMark(R.id.mark5Button, 5, "call ended, room silent, recovery check")

        requestPermissionsIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        handler.post(refresh)
    }

    override fun onPause() {
        handler.removeCallbacks(refresh)
        super.onPause()
    }

    override fun onDestroy() {
        feeder?.cancel()
        micProbe?.stop()
        ModeAController.stop()
        modeAProbe?.stop()
        modeAProbe = null
        super.onDestroy()
    }

    private fun bindMark(viewId: Int, step: Int, description: String) {
        findViewById<Button>(viewId).setOnClickListener {
            Log.i(TAG, "===== STEP " + step + " START: " + description + " =====")
            Toast.makeText(this, "Marked STEP " + step, Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Feeds one clip through the real pipeline on a background thread. The
     * pipeline is restarted first so each clip is scored from a clean ring
     * buffer and a clean EMA, with no carry-over from the previous run.
     */
    private fun runClip(fileName: String, label: String) {
        if (feedThread?.isAlive == true) {
            Toast.makeText(this, "A clip is already playing", Toast.LENGTH_SHORT).show()
            return
        }
        Toast.makeText(this, "Feeding " + label, Toast.LENGTH_SHORT).show()
        val worker = ModeAFileFeeder(this)
        feeder = worker
        feedThread = Thread({
            ModeAController.stop()
            ModeAController.start(this)
            val demo = ModeAController.pipeline(this).scoreMode ==
                ModeAPipeline.ScoreMode.FIRST_WINDOW
            worker.feed(fileName, label, targetSeconds = 20, loop = !demo)
            val pipeline = ModeAController.pipeline(this)
            Log.i(
                TAG,
                String.format(
                    Locale.US,
                    "MODEA_RESULT,%s,inferences=%d,median_latency_ms=%.1f,ep=%s",
                    label, pipeline.inferenceCount, pipeline.medianLatencyMs,
                    pipeline.executionProvider
                )
            )
            pipeline.logSummary(label)
        }, "aawaz-modea-feed").also { it.start() }
    }

    /**
     * Plays a clip out of the speaker WITHOUT feeding the pipeline, so the only
     * way the audio can reach the detector is acoustically, through the room and
     * back in via the microphone. That is the whole point of the air-path test.
     */
    private fun playThroughSpeakerOnly(assetName: String, label: String) {
        try {
            speakerPlayer?.release()
            val afd = assets.openFd(assetName)
            val player = MediaPlayer()
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            afd.close()
            player.setOnCompletionListener {
                Log.i(TAG, "===== SPEAKER ONLY END: " + label + " =====")
            }
            player.prepare()
            player.start()
            speakerPlayer = player
            Log.i(TAG, "===== SPEAKER ONLY START: " + label + " (" + assetName + ") =====")
            Toast.makeText(this, "Playing " + label + " via speaker", Toast.LENGTH_SHORT).show()
        } catch (t: Throwable) {
            Log.e(TAG, "SPEAKER ONLY failed: " + t.javaClass.simpleName + ": " + t.message, t)
        }
    }

    /**
     * Debug verification for the six bundled voice-pair assets. Plays each one
     * through the SAME DemoAudioSource the judge demo uses, so every score comes
     * from the real detector. Production UI is untouched.
     */
    private fun runAllSixPairs() {
        if (feedThread?.isAlive == true) {
            Toast.makeText(this, "A clip is already playing", Toast.LENGTH_SHORT).show()
            return
        }
        Toast.makeText(this, "Running 6 demo pairs", Toast.LENGTH_SHORT).show()
        val keys = listOf(
            "pair01_human", "pair01_ai",
            "pair02_human", "pair02_ai",
            "pair03_human", "pair03_ai",
        )
        feedThread = Thread({
            val source = DemoAudioSource(this)
            for (key in keys) {
                val entry = DemoAudioSource.CLIPS[key] ?: continue
                Log.i(TAG, "===== SIXPAIR BEGIN " + key + " =====")
                source.play(entry.first, entry.second)
                val pipeline = ModeAController.pipeline(this)
                Log.i(
                    TAG,
                    String.format(
                        Locale.US,
                        "SIXPAIR_RESULT,%s,%s,risk=%d,state=%s",
                        key, entry.first, pipeline.lastRawRisk,
                        pipeline.currentReading.state
                    )
                )
                try {
                    Thread.sleep(600)
                } catch (ie: InterruptedException) {
                    Thread.currentThread().interrupt()
                    break
                }
            }
            Log.i(TAG, "===== SIXPAIR DONE =====")
        }, "aawaz-sixpair").also { it.start() }
    }

    private fun renderMicProbe() {
        val pipeline = ModeAController.pipeline(this)
        micProbeText.text = String.format(
            Locale.US,
            "MIC PROBE%nrunning   : %s%nwindows   : %d%nlast risk : %s  %s",
            MicProbe.isRunning,
            MicProbe.windowsLogged,
            if (pipeline.lastRawRisk < 0) "-" else pipeline.lastRawRisk.toString(),
            pipeline.currentReading.state
        )
    }

    private fun renderModeA() {
        val pipeline = ModeAController.pipeline(this)
        modeaText.text = String.format(
            Locale.US,
            "MODE A%nmode      : %s%nRISK      : %d  %s%nraw risk  : %s%nrunning   : %s%nep        : %s%nwindows   : %d%nmedian ms : %.1f",
            pipeline.scoreMode,
            pipeline.currentReading.score,
            pipeline.currentReading.state,
            if (pipeline.lastRawRisk < 0) "-" else pipeline.lastRawRisk.toString(),
            pipeline.isRunning,
            pipeline.executionProvider,
            pipeline.inferenceCount,
            pipeline.medianLatencyMs
        )
    }

    private fun renderProbe() {
        val snapshot = WebRtcPcmSink.latest
        if (snapshot == null) {
            probeText.text =
                if (ModeALoopbackProbe.isRunning) "probe A: negotiating, no PCM yet" else "probe A stopped"
            return
        }
        probeText.text = String.format(
            Locale.US,
            "PROBE A remote sink%nrms       : %.1f%npeak      : %d%ndBFS      : %.1f%nzeroRatio : %.3f%ncb/window : %d%nframes/s  : %.1f",
            snapshot.rms,
            snapshot.peak,
            snapshot.dbfs,
            snapshot.zeroRatio,
            snapshot.readResult,
            WebRtcPcmSink.framesPerSecond
        )
    }

    private fun renderPermissions() {
        val builder = StringBuilder()
        for (permission in requiredPermissions) {
            val granted = checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
            builder.append(if (granted) "GRANTED " else "DENIED  ")
            builder.append(permission.substringAfterLast('.'))
            builder.append('\n')
        }
        permissionsText.text = builder.toString().trimEnd()
    }

    private fun renderLatest() {
        val snapshot = AudioCaptureService.latest
        if (snapshot == null) {
            metricsText.text = if (AudioCaptureService.isRunning) "starting..." else "capture stopped"
            return
        }
        metricsText.text = String.format(
            Locale.US,
            "running   : %s%nrms       : %.1f%npeak      : %d%ndBFS      : %.1f%nzeroRatio : %.3f%nread      : %d%ncallState : %s%naudioMode : %s%noutDevice : %s",
            AudioCaptureService.isRunning,
            snapshot.rms,
            snapshot.peak,
            snapshot.dbfs,
            snapshot.zeroRatio,
            snapshot.readResult,
            snapshot.callState,
            snapshot.audioMode,
            snapshot.outputDevice
        )
    }

    private fun hasAllPermissions(): Boolean = requiredPermissions.all {
        checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermissionsIfNeeded() {
        val missing = requiredPermissions.filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) return
        requestPermissions(missing.toTypedArray(), REQ_PERMISSIONS)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_PERMISSIONS) return
        for (i in permissions.indices) {
            val granted = grantResults.getOrNull(i) == PackageManager.PERMISSION_GRANTED
            Log.i(TAG, "permission " + permissions[i] + " granted=" + granted)
        }
    }
}
