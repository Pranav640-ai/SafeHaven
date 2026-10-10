package com.safehaven.rescuemesh

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream
import java.io.File

/** Offline PDF rendering only; nothing is shared with another app or service. */
@CapacitorPlugin(name = "VaultPreview")
class VaultPreviewPlugin : Plugin() {
    override fun load() {
        // Recover temporary preview files left by a process interruption.
        context.cacheDir.listFiles()?.filter { it.name.startsWith("meridian-vault-preview-") }?.forEach { it.delete() }
    }

    @PluginMethod fun renderPdf(call: PluginCall) {
        val encoded = call.getString("data") ?: ""
        val pageNumber = call.getInt("page", 0) ?: 0
        if (encoded.length > 7_000_000 || encoded.isBlank()) {
            call.reject("Choose a PDF no larger than 5 MB."); return
        }
        Thread {
            var file: File? = null
            var bitmap: Bitmap? = null
            var bytes: ByteArray? = null
            try {
                val document = Base64.decode(encoded, Base64.DEFAULT)
                bytes = document
                require(document.size <= 5 * 1024 * 1024) { "PDF is too large" }
                val temporary = File.createTempFile("meridian-vault-preview-", ".pdf", context.cacheDir)
                file = temporary
                temporary.writeBytes(document)
                ParcelFileDescriptor.open(temporary, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { renderer ->
                        require(pageNumber in 0 until renderer.pageCount) { "Page is unavailable" }
                        renderer.openPage(pageNumber).use { page ->
                            val scale = minOf(2.0f, 1600f / maxOf(page.width, page.height))
                            val image = Bitmap.createBitmap(maxOf(1, (page.width * scale).toInt()), maxOf(1, (page.height * scale).toInt()), Bitmap.Config.ARGB_8888)
                            bitmap = image
                            image.eraseColor(android.graphics.Color.WHITE)
                            page.render(image, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            val output = ByteArrayOutputStream()
                            image.compress(Bitmap.CompressFormat.PNG, 100, output)
                            call.resolve(JSObject().put("image", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)).put("pages", renderer.pageCount))
                        }
                    }
                }
            } catch (_: Exception) {
                call.reject("PDF could not be previewed. Try a valid PDF or a document image.")
            } finally {
                bitmap?.recycle(); bytes?.fill(0); file?.delete()
            }
        }.start()
    }
}
