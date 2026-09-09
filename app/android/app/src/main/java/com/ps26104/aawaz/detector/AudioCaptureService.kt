package com.ps26104.aawaz.detector

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import java.io.File
import java.util.Locale

/**
 * Microphone-type foreground service that captures 16 kHz mono PCM from the plain
 * MIC source and emits one diagnostic CSV line every 500 ms.
 *
 * Deliberately uses only Play-Store-legal APIs: AudioSource.MIC, no VOICE_CALL,
 * no VOICE_DOWNLINK/UPLINK, no CAPTURE_AUDIO_OUTPUT. If the platform silences or
 * blocks capture during a carrier call, that outcome is the finding and is
 * recorded, never worked around.
 *
 * This package must remain free of React Native imports.
 */
class AudioCaptureService : Service() {

    companion object {
        const val TAG = "AAWAZ_DIAG"

        const val ACTION_START = "com.ps26104.aawaz.detector.action.START"
        const val ACTION_STOP = "com.ps26104.aawaz.detector.action.STOP"

        const val CHANNEL_ID = "aawaz_capture"
        private const val CHANNEL_NAME = "Aawaz capture"
        private const val NOTIFICATION_ID = 26104

        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val ENCODING = AudioFormat.ENCODING_PCM_16BIT

        /** One CSV line per this many milliseconds of audio. */
        const val WINDOW_MS = 500
        const val CSV_FILE_NAME = "aawaz_diag.csv"
        const val CSV_HEADER =
            "tag,uptimeMillis,rms,peak,dbfs,zeroRatio,readResult,callState,audioMode,outputDevice"

        /** Latest emitted window, for crude debug UI observation. Not used by production logic. */
        @Volatile
        var latest: Snapshot? = null
            private set

        @Volatile
        var isRunning: Boolean = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, AudioCaptureService::class.java).setAction(ACTION_START)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, AudioCaptureService::class.java).setAction(ACTION_STOP)
            context.startService(intent)
        }

        fun audioModeName(mode: Int): String = when (mode) {
            AudioManager.MODE_NORMAL -> "NORMAL"
            AudioManager.MODE_RINGTONE -> "RINGTONE"
            AudioManager.MODE_IN_CALL -> "IN_CALL"
            AudioManager.MODE_IN_COMMUNICATION -> "IN_COMMUNICATION"
            AudioManager.MODE_CALL_SCREENING -> "CALL_SCREENING"
            else -> "MODE_" + mode
        }

        fun deviceTypeName(type: Int): String = when (type) {
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "BUILTIN_EARPIECE"
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "BUILTIN_SPEAKER"
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> "WIRED_HEADSET"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "WIRED_HEADPHONES"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "BLUETOOTH_SCO"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "BLUETOOTH_A2DP"
            AudioDeviceInfo.TYPE_BLE_HEADSET -> "BLE_HEADSET"
            AudioDeviceInfo.TYPE_BLE_SPEAKER -> "BLE_SPEAKER"
            AudioDeviceInfo.TYPE_USB_HEADSET -> "USB_HEADSET"
            AudioDeviceInfo.TYPE_USB_DEVICE -> "USB_DEVICE"
            AudioDeviceInfo.TYPE_TELEPHONY -> "TELEPHONY"
            AudioDeviceInfo.TYPE_HEARING_AID -> "HEARING_AID"
            else -> "TYPE_" + type
        }

        fun readResultName(readResult: Int): String = when (readResult) {
            AudioRecord.ERROR_INVALID_OPERATION -> "ERROR_INVALID_OPERATION(-3)"
            AudioRecord.ERROR_BAD_VALUE -> "ERROR_BAD_VALUE(-2)"
            AudioRecord.ERROR_DEAD_OBJECT -> "ERROR_DEAD_OBJECT(-6)"
            AudioRecord.ERROR -> "ERROR(-1)"
            else -> readResult.toString()
        }
    }

    /** One emitted 500 ms window. */
    data class Snapshot(
        val uptimeMillis: Long,
        val rms: Double,
        val peak: Int,
        val dbfs: Double,
        val zeroRatio: Double,
        val readResult: Int,
        val callState: String,
        val audioMode: String,
        val outputDevice: String
    )

    private var audioRecord: AudioRecord? = null
    private var captureThread: Thread? = null

    @Volatile
    private var running = false

    private lateinit var audioManager: AudioManager
    private var callStateMonitor: CallStateMonitor? = null
    private var csvFile: File? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Log.i(TAG, "===== CAPTURE STOP REQUESTED =====")
            stopCapture()
            stopSelf()
            return START_NOT_STICKY
        }

        if (running) return START_NOT_STICKY

        try {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } catch (t: Throwable) {
            // On API 34+ this is rejected unless RECORD_AUDIO was granted while visible.
            Log.e(
                TAG,
                "startForeground(microphone) REJECTED by platform: " +
                    t.javaClass.simpleName + ": " + t.message,
                t
            )
            stopSelf()
            return START_NOT_STICKY
        }

        callStateMonitor = CallStateMonitor(this).also { it.start() }
        startCapture()
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopCapture()
        callStateMonitor?.stop()
        callStateMonitor = null
        super.onDestroy()
    }

    // ---------------------------------------------------------------- capture

    private fun startCapture() {
        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, ENCODING)
        val bufferSizeBytes = minBufferSize * 4

        Log.i(TAG, "===== AAWAZ CAPTURE STARTUP =====")
        Log.i(
            TAG,
            "device: " + Build.MANUFACTURER + " " + Build.MODEL +
                " | Android " + Build.VERSION.RELEASE + " | API " + Build.VERSION.SDK_INT
        )
        Log.i(TAG, "config: source=MIC rate=" + SAMPLE_RATE + " ch=MONO enc=PCM_16BIT")
        Log.i(
            TAG,
            "getMinBufferSize=" + minBufferSize + " bytes; requested bufferSize=" +
                bufferSizeBytes + " bytes (x4)"
        )

        if (minBufferSize <= 0) {
            Log.e(
                TAG,
                "HARD FAIL: getMinBufferSize returned " + minBufferSize +
                    " (" + readResultName(minBufferSize) + "). Cannot open AudioRecord."
            )
            stopSelf()
            return
        }

        val record = try {
            @Suppress("MissingPermission")
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                ENCODING,
                bufferSizeBytes
            )
        } catch (t: Throwable) {
            Log.e(
                TAG,
                "HARD FAIL: AudioRecord constructor threw " +
                    t.javaClass.simpleName + ": " + t.message,
                t
            )
            stopSelf()
            return
        }

        Log.i(TAG, "audioRecord.state=" + record.state + " (1=INITIALIZED, 0=UNINITIALIZED/hard fail)")
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(
                TAG,
                "HARD FAIL: AudioRecord did not initialise. This is a valid negative result, " +
                    "not something to work around."
            )
            record.release()
            stopSelf()
            return
        }

        try {
            record.startRecording()
        } catch (t: Throwable) {
            Log.e(TAG, "HARD FAIL: startRecording threw " + t.javaClass.simpleName + ": " + t.message, t)
            record.release()
            stopSelf()
            return
        }

        Log.i(TAG, "audioRecord.recordingState=" + record.recordingState + " (3=RECORDING, 1=STOPPED)")
        Log.i(TAG, "audioSessionId=" + record.audioSessionId)
        Log.i(
            TAG,
            "audioMode at start=" + audioModeName(audioManager.mode) +
                " | outputDevice=" + currentOutputDevice()
        )
        Log.i(TAG, "===== END STARTUP BANNER =====")

        if (record.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
            Log.e(
                TAG,
                "HARD FAIL: recordingState is " + record.recordingState +
                    ", not RECORDING. Stopping cleanly."
            )
            try {
                record.stop()
            } catch (ignored: Throwable) {
            }
            record.release()
            stopSelf()
            return
        }

        audioRecord = record
        csvFile = prepareCsvFile()
        running = true
        isRunning = true

        captureThread = Thread({ captureLoop(record, bufferSizeBytes) }, "aawaz-capture").also {
            it.priority = Thread.MAX_PRIORITY
            it.start()
        }
    }

    private fun captureLoop(record: AudioRecord, bufferSizeBytes: Int) {
        val windowSamples = SAMPLE_RATE * WINDOW_MS / 1000
        val window = ShortArray(windowSamples)
        val maxChunk = (bufferSizeBytes / 2).coerceAtLeast(256)

        var filled = 0
        var lastReadResult = 0
        var windowStartedAt = SystemClock.uptimeMillis()

        try {
            while (running) {
                val toRead = minOf(maxChunk, windowSamples - filled)
                val n = try {
                    record.read(window, filled, toRead)
                } catch (t: Throwable) {
                    Log.e(TAG, "read() threw " + t.javaClass.simpleName + ": " + t.message, t)
                    AudioRecord.ERROR
                }

                if (n > 0) {
                    filled += n
                    lastReadResult = n
                } else {
                    // Zero or negative reads are recorded, never fatal. Keep looping.
                    lastReadResult = n
                    if (n < 0) {
                        Log.w(TAG, "read() returned " + readResultName(n))
                    }
                    Thread.sleep(10)
                }

                val elapsed = SystemClock.uptimeMillis() - windowStartedAt
                if (filled >= windowSamples || elapsed >= WINDOW_MS) {
                    emit(window, filled, lastReadResult)
                    filled = 0
                    windowStartedAt = SystemClock.uptimeMillis()
                }
            }
        } catch (ie: InterruptedException) {
            Log.i(TAG, "capture thread interrupted, exiting cleanly")
        } catch (t: Throwable) {
            Log.e(TAG, "capture loop aborted: " + t.javaClass.simpleName + ": " + t.message, t)
        }
        Log.i(TAG, "capture loop exited")
    }

    private fun emit(window: ShortArray, length: Int, readResult: Int) {
        val rms = AudioMetrics.rms(window, length)
        val peak = AudioMetrics.peak(window, length)
        val dbfs = AudioMetrics.dbfs(rms)
        val zeroRatio = AudioMetrics.zeroRatio(window, length)
        val callState = callStateMonitor?.currentState ?: CallStateMonitor.STATE_UNKNOWN
        val audioMode = audioModeName(audioManager.mode)
        val outputDevice = currentOutputDevice()
        val uptime = SystemClock.uptimeMillis()

        val line = String.format(
            Locale.US,
            "AAWAZ_DIAG,%d,%.1f,%d,%.1f,%.3f,%d,%s,%s,%s",
            uptime, rms, peak, dbfs, zeroRatio, readResult, callState, audioMode, outputDevice
        )

        Log.i(TAG, line)
        appendCsv(line)

        latest = Snapshot(
            uptime, rms, peak, dbfs, zeroRatio, readResult, callState, audioMode, outputDevice
        )
    }

    private fun stopCapture() {
        if (!running && audioRecord == null) return
        running = false
        isRunning = false
        captureThread?.let {
            it.interrupt()
            try {
                it.join(1000)
            } catch (ignored: InterruptedException) {
            }
        }
        captureThread = null
        audioRecord?.let { record ->
            try {
                if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) record.stop()
            } catch (t: Throwable) {
                Log.w(TAG, "stop() failed: " + t.message)
            }
            try {
                record.release()
            } catch (ignored: Throwable) {
            }
        }
        audioRecord = null
        Log.i(TAG, "===== CAPTURE STOPPED =====")
    }

    // --------------------------------------------------------------- platform

    /** API 31+ communication device. isSpeakerphoneOn() is deprecated and deliberately unused. */
    private fun currentOutputDevice(): String {
        return try {
            val device: AudioDeviceInfo? = audioManager.communicationDevice
            if (device == null) "NONE" else deviceTypeName(device.type)
        } catch (t: Throwable) {
            "UNAVAILABLE"
        }
    }

    private fun prepareCsvFile(): File? {
        return try {
            val dir = getExternalFilesDir(null) ?: return null
            val file = File(dir, CSV_FILE_NAME)
            if (!file.exists() || file.length() == 0L) {
                file.appendText(CSV_HEADER + "\n")
            }
            Log.i(TAG, "csv: " + file.absolutePath)
            file
        } catch (t: Throwable) {
            Log.e(TAG, "could not open csv file: " + t.message, t)
            null
        }
    }

    private fun appendCsv(line: String) {
        val file = csvFile ?: return
        try {
            file.appendText(line + "\n")
        } catch (t: Throwable) {
            Log.w(TAG, "csv append failed: " + t.message)
        }
    }

    private fun createNotificationChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "Aawaz microphone capture diagnostics"
            channel.setShowBadge(false)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Aawaz capture running")
            .setContentText("Microphone diagnostics active")
            .setSmallIcon(android.R.drawable.presence_audio_online)
            .setOngoing(true)
            .build()
    }
}
