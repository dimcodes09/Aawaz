package com.ps26104.aawaz.diagnostics

import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.IOException
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.nio.charset.StandardCharsets

/**
 * Minimal debug-only LAN signalling for the two-device WebRTC demo.
 *
 * Carries SDP and nothing else. Media never touches this socket - it goes over
 * WebRTC's own transport. There is no server, no cloud, no STUN/TURN: one phone
 * listens on the local network and the other connects to its IP.
 *
 * Wire format, one frame per message:
 *
 *     [4-byte big-endian length N][N bytes UTF-8 payload]
 *     payload = "<type>\n<sdp>"
 *
 * Length prefixing is the point: TCP is a byte stream, so a single read is not a
 * message. [readFrame] loops until exactly N bytes have arrived, which means a
 * multi-kilobyte SDP split across several TCP segments reassembles correctly.
 *
 * The payload is deliberately not JSON. SDP is multi-line text full of
 * characters that would need escaping, and a hand-rolled escaper is a bug farm.
 * The length prefix already delimits the frame, so the first line is the type
 * and everything after the first newline is the SDP, byte for byte.
 *
 * Non-trickle ICE: each side gathers candidates fully before sending, so exactly
 * two frames cross this socket per call - one offer, one answer. There are no
 * candidate messages and no long-lived channel to keep alive.
 *
 * This file has no Android imports on purpose. Logging is injected, so the whole
 * protocol can be exercised on a plain JVM without a device.
 */
object LanSignalling {

    /** Arbitrary high port, outside the ephemeral range on Android. */
    const val DEFAULT_PORT = 45871

    const val TYPE_OFFER = "offer"
    const val TYPE_ANSWER = "answer"

    /**
     * Control frame, sent by the caller when it starts a clip. Carries no SDP -
     * the body is just a human-readable label. It exists because the receiver
     * has no other way to know when to open a fresh detector window aligned to
     * the start of the clip. Still SDP-plane only: no media crosses this socket.
     */
    const val TYPE_CLIP_START = "clip_start"

    /** Refuse absurd frames rather than allocating whatever a peer claims. */
    const val MAX_FRAME_BYTES = 1 shl 20   // 1 MiB; a real SDP is a few KB

    /** No-op logger so the protocol can run headless in tests. */
    val SILENT: (String) -> Unit = {}

    data class Message(val type: String, val sdp: String)

    /**
     * One signalling connection. Not thread-safe; the call flow is strictly
     * sequential (send offer, await answer / await offer, send answer).
     */
    class Connection internal constructor(
        private val socket: Socket,
        private val log: (String) -> Unit,
    ) : AutoCloseable {

        private val input = DataInputStream(socket.getInputStream().buffered())
        private val output = DataOutputStream(socket.getOutputStream().buffered())

        val remoteAddress: String
            get() = socket.inetAddress?.hostAddress ?: "unknown"

        fun send(message: Message) {
            val payload = (message.type + "\n" + message.sdp).toByteArray(StandardCharsets.UTF_8)
            require(payload.size <= MAX_FRAME_BYTES) {
                "frame of ${payload.size} bytes exceeds $MAX_FRAME_BYTES"
            }
            output.writeInt(payload.size)
            output.write(payload)
            output.flush()
            log("SIGNAL send type=${message.type} bytes=${payload.size}")
        }

        /**
         * Reads exactly one frame, blocking until it is complete.
         *
         * [timeoutMs] bounds how long we wait with no data arriving; it is not a
         * deadline for the whole message, so a slow peer dribbling a large SDP
         * still succeeds as long as it keeps sending.
         */
        fun receive(timeoutMs: Int = 30_000): Message {
            socket.soTimeout = timeoutMs

            val length = try {
                input.readInt()
            } catch (eof: EOFException) {
                throw IOException("peer closed before sending a frame header", eof)
            }
            if (length <= 0 || length > MAX_FRAME_BYTES) {
                throw IOException("bad frame length $length")
            }

            // readFully loops internally until all `length` bytes arrive, which
            // is what makes this correct across TCP segment boundaries.
            val payload = ByteArray(length)
            try {
                input.readFully(payload)
            } catch (eof: EOFException) {
                throw IOException("peer closed mid-frame; expected $length bytes", eof)
            }

            val text = String(payload, StandardCharsets.UTF_8)
            val split = text.indexOf('\n')
            if (split <= 0) throw IOException("malformed frame: no type line")

            val message = Message(text.substring(0, split), text.substring(split + 1))
            log("SIGNAL recv type=${message.type} bytes=$length")
            return message
        }

        override fun close() {
            try {
                socket.close()
            } catch (ignored: IOException) {
            }
        }
    }

    /**
     * Receiver side: binds and waits for the caller to connect.
     *
     * Kept separate from [Connection] so the listening socket can be opened (and
     * reported in the UI) before any peer shows up.
     */
    class Listener(
        port: Int = DEFAULT_PORT,
        private val log: (String) -> Unit = SILENT,
    ) : AutoCloseable {

        private val server = ServerSocket().apply {
            reuseAddress = true
            bind(InetSocketAddress(port))
        }

        val boundPort: Int
            get() = server.localPort

        init {
            log("SIGNAL listening on port $boundPort")
        }

        /** Blocks until a caller connects, or throws on timeout. */
        fun accept(timeoutMs: Int = 0): Connection {
            server.soTimeout = timeoutMs
            val socket = server.accept()
            socket.tcpNoDelay = true
            log("SIGNAL accepted ${socket.inetAddress?.hostAddress}")
            return Connection(socket, log)
        }

        override fun close() {
            try {
                server.close()
            } catch (ignored: IOException) {
            }
        }
    }

    /** Caller side: connects to the receiver's IP. */
    fun connect(
        host: String,
        port: Int = DEFAULT_PORT,
        timeoutMs: Int = 10_000,
        log: (String) -> Unit = SILENT,
    ): Connection {
        val socket = Socket()
        try {
            socket.connect(InetSocketAddress(host, port), timeoutMs)
            socket.tcpNoDelay = true
        } catch (t: Throwable) {
            try {
                socket.close()
            } catch (ignored: IOException) {
            }
            throw t
        }
        log("SIGNAL connected to $host:$port")
        return Connection(socket, log)
    }

    /** True when a failure is just "nobody connected yet", so callers can retry. */
    fun isTimeout(t: Throwable): Boolean = t is SocketTimeoutException
}
