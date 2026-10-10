package com.safehaven.rescuemesh

import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CustomCredential
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.ClearCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/** Native account chooser; Firebase JS exchanges the Google token for its own session. */
@CapacitorPlugin(name = "MeridianAuth")
class MeridianAuthPlugin : Plugin() {
    private var cancellation: CancellationSignal? = null

    @PluginMethod fun signIn(call: PluginCall) {
        val clientId = config.getString("webClientId") ?: ""
        if (!clientId.endsWith(".apps.googleusercontent.com")) {
            call.reject("Android Google sign-in is not configured yet. Continue as guest for now.", "auth/android-not-configured")
            return
        }
        if (cancellation != null) {
            call.reject("Sign-in is already open.", "auth/cancelled-popup-request")
            return
        }
        val signal = CancellationSignal()
        cancellation = signal
        activity.runOnUiThread {
            try {
                val option = GetSignInWithGoogleOption.Builder(clientId).build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                CredentialManager.create(context).getCredentialAsync(activity, request, signal,
                    ContextCompat.getMainExecutor(context),
                    object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                        override fun onResult(result: GetCredentialResponse) {
                            cancellation = null
                            try {
                                val credential = result.credential
                                require(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) { "Unexpected sign-in credential" }
                                val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
                                call.resolve(JSObject().put("idToken", token))
                            } catch (_: Exception) { call.reject("Google could not return a valid sign-in credential.") }
                        }
                        override fun onError(error: GetCredentialException) {
                            cancellation = null
                            if (error is GetCredentialCancellationException) call.reject("Sign-in cancelled.", "auth/popup-closed-by-user")
                            else call.reject("Google sign-in could not complete. Check your internet and the app's Firebase Android registration.", "auth/native-sign-in-failed")
                        }
                    })
            } catch (_: Exception) {
                cancellation = null
                call.reject("Google account chooser is unavailable. Update Google Play services and retry.")
            }
        }
    }

    @PluginMethod fun clearSession(call: PluginCall) {
        CredentialManager.create(context).clearCredentialStateAsync(ClearCredentialStateRequest(), null,
            ContextCompat.getMainExecutor(context),
            object : CredentialManagerCallback<Void?, ClearCredentialException> {
                override fun onResult(result: Void?) { call.resolve() }
                override fun onError(error: ClearCredentialException) { call.reject("Could not clear Google account selection.") }
            })
    }
    override fun handleOnDestroy() { cancellation?.cancel(); cancellation = null; super.handleOnDestroy() }
}
