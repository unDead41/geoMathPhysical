package com.geomath.dev

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    private var pending: MethodChannel.Result? = null
    private var pendingText: String? = null
    private val writer = Executors.newSingleThreadExecutor()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "geomath/files")
            .setMethodCallHandler { call, result ->
                if (call.method != "saveText") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val content = call.argument<String>("content")
                if (content == null || content.toByteArray(Charsets.UTF_8).size > 32768) {
                    result.error("invalid", "Report text is invalid.", null)
                    return@setMethodCallHandler
                }
                if (pending != null) {
                    result.error("busy", "A document picker is already open.", null)
                    return@setMethodCallHandler
                }
                pending = result
                pendingText = content
                try {
                    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TITLE, "GeoMath_report.txt")
                    }
                    @Suppress("DEPRECATION")
                    startActivityForResult(intent, REPORT_REQUEST)
                } catch (_: Exception) {
                    pending = null
                    pendingText = null
                    result.error("unavailable", "The document picker is unavailable.", null)
                }
            }
    }

    @Deprecated("Android document picker activity result")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REPORT_REQUEST) return
        val result = pending ?: return
        val content = pendingText
        pending = null
        pendingText = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null || content == null) {
            result.success(false)
            return
        }
        writer.execute {
            try {
                val output = contentResolver.openOutputStream(uri, "wt")
                    ?: throw IllegalStateException("Output is unavailable")
                output.use { it.write(content.toByteArray(Charsets.UTF_8)); it.flush() }
                Handler(Looper.getMainLooper()).post { result.success(true) }
            } catch (_: Exception) {
                Handler(Looper.getMainLooper()).post {
                    result.error("storage", "The document has not been saved.", null)
                }
            }
        }
    }

    override fun onDestroy() {
        pending?.error("cancelled", "The document picker was closed.", null)
        pending = null
        pendingText = null
        writer.shutdown()
        super.onDestroy()
    }

    companion object { private const val REPORT_REQUEST = 4101 }
}
