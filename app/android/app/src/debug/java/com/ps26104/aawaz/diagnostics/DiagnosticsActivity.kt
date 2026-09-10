package com.ps26104.aawaz.diagnostics

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.ps26104.aawaz.R
import com.ps26104.aawaz.detector.AudioCaptureService
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

    private var modeAProbe: ModeALoopbackProbe? = null

    private val handler = Handler(Looper.getMainLooper())
    private val refresh = object : Runnable {
        override fun run() {
            renderLatest()
            renderPermissions()
            renderProbe()
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
