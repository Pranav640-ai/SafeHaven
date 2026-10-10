package com.safehaven.rescuemesh

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.UUID
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SafetySpeech")
class SafetySpeechPlugin : Plugin() {
    private var engine: TextToSpeech? = null
    private var ready = false
    private var destroyed = false
    private val waiting = mutableListOf<Pair<PluginCall, (TextToSpeech) -> Unit>>()
    private fun withEngine(call: PluginCall, action: (TextToSpeech) -> Unit) {
        if (ready) { engine?.let { action(it) }; return }
        waiting.add(call to action)
        if (engine != null) return
        engine = TextToSpeech(context) { status ->
            activity.runOnUiThread {
                if (destroyed) return@runOnUiThread
                ready = status == TextToSpeech.SUCCESS
                engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String?) { speaking(true) }
                    override fun onDone(id: String?) { speaking(false) }
                    override fun onError(id: String?) { speaking(false) }
                    override fun onStop(id: String?, interrupted: Boolean) { speaking(false) }
                })
                val pending = waiting.toList(); waiting.clear()
                pending.forEach { (saved, fn) -> if (ready) engine?.let { fn(it) } else saved.reject("A speech engine is unavailable on this phone.") }
                if (!ready) { engine?.shutdown(); engine = null }
            }
        }
    }
    private fun speaking(value: Boolean) { if (!destroyed) notifyListeners("speech", JSObject().put("speaking", value)) }
    private fun voice(tts: TextToSpeech, language: String) = tts.voices?.firstOrNull {
        it.locale.language == Locale.forLanguageTag(language).language && !it.isNetworkConnectionRequired && !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
    }
    @PluginMethod fun available(call: PluginCall) { withEngine(call) { tts -> call.resolve(JSObject().put("available", voice(tts, call.getString("language") ?: "en") != null)) } }
    @PluginMethod fun readAloud(call: PluginCall) {
        val text = call.getString("text") ?: ""
        if (text.isBlank() || text.length > 3000) { call.reject("Instructions must contain 1–3000 characters."); return }
        withEngine(call) { tts ->
            val selected = voice(tts, call.getString("language") ?: "en")
            if (selected == null) { call.reject("Install an offline voice for this language in Android speech settings."); return@withEngine }
            tts.voice = selected; tts.setSpeechRate(0.9f)
            val result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString())
            if (result == TextToSpeech.ERROR) call.reject("Speech could not be started.") else call.resolve()
        }
    }
    @PluginMethod fun stop(call: PluginCall) { engine?.stop(); speaking(false); call.resolve() }
    override fun handleOnPause() { engine?.stop(); speaking(false); super.handleOnPause() }
    override fun handleOnDestroy() { destroyed = true; waiting.forEach { it.first.reject("Speech was closed.") }; waiting.clear(); engine?.stop(); engine?.shutdown(); engine = null; super.handleOnDestroy() }
}
