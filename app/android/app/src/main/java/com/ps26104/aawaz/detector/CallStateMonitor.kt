package com.ps26104.aawaz.detector

import android.content.Context
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * Tracks carrier call state using the API 31+ [TelephonyCallback] path.
 *
 * The deprecated PhoneStateListener is deliberately not used. Requires
 * READ_PHONE_STATE to be granted; without it registration throws SecurityException
 * and we degrade to reporting NO_PERMISSION rather than crashing.
 */
class CallStateMonitor(private val context: Context) {

    companion object {
        const val TAG = "AAWAZ_DIAG"

        const val STATE_IDLE = "IDLE"
        const val STATE_RINGING = "RINGING"
        const val STATE_OFFHOOK = "OFFHOOK"
        const val STATE_UNKNOWN = "UNKNOWN"
        const val STATE_NO_PERMISSION = "NO_PERMISSION"

        fun stateName(state: Int): String = when (state) {
            TelephonyManager.CALL_STATE_IDLE -> STATE_IDLE
            TelephonyManager.CALL_STATE_RINGING -> STATE_RINGING
            TelephonyManager.CALL_STATE_OFFHOOK -> STATE_OFFHOOK
            else -> STATE_UNKNOWN
        }
    }

    @Volatile
    var currentState: String = STATE_UNKNOWN
        private set

    private val executor: Executor = Executors.newSingleThreadExecutor()
    private var telephonyManager: TelephonyManager? = null
    private var callback: TelephonyCallback? = null

    private inner class Listener : TelephonyCallback(), TelephonyCallback.CallStateListener {
        override fun onCallStateChanged(state: Int) {
            val name = stateName(state)
            val previous = currentState
            currentState = name
            if (previous != name) {
                Log.i(TAG, "===== CALL STATE: $previous -> $name =====")
            }
        }
    }

    fun start() {
        if (callback != null) return
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        if (tm == null) {
            currentState = STATE_UNKNOWN
            Log.w(TAG, "CallStateMonitor: TelephonyManager unavailable on this device")
            return
        }
        telephonyManager = tm
        val listener = Listener()
        try {
            tm.registerTelephonyCallback(executor, listener)
            callback = listener
            Log.i(TAG, "CallStateMonitor: registered TelephonyCallback")
        } catch (se: SecurityException) {
            currentState = STATE_NO_PERMISSION
            Log.e(TAG, "CallStateMonitor: READ_PHONE_STATE not granted, call state unavailable", se)
        } catch (t: Throwable) {
            currentState = STATE_UNKNOWN
            Log.e(TAG, "CallStateMonitor: registration failed", t)
        }
    }

    fun stop() {
        val cb = callback ?: return
        try {
            telephonyManager?.unregisterTelephonyCallback(cb)
        } catch (t: Throwable) {
            Log.w(TAG, "CallStateMonitor: unregister failed", t)
        }
        callback = null
    }
}
