# Meridian Google sign-in setup

## Android account login

1. Open the Firebase console for **safe-havenai**, the same project as `src/firebase.ts`.
2. Project settings → General → Your apps → Add app → Android. Register **com.safehaven.ai** (nickname Meridian). If this package already exists, select it instead of adding a duplicate.
3. Add this laptop’s debug **SHA-1**: `BB:56:F3:6B:F2:4A:1D:1F:A5:67:F3:D4:8B:28:72:4B:BA:BC:6C:76`.
4. Authentication → Sign-in method → Google → Enable. Choose the support email and save.
5. Download an updated **google-services.json** for that Android app. Save it as `native/google-services.json` in this repository. It is ignored by Git. A service-account/private-key download is NOT this file.
6. Run `npm run android:sync`, then build the APK with JDK 21:

```powershell
$env:JAVA_HOME='C:\Users\asus\.jdks\jbr-21.0.11'
.\android\gradlew.bat -p android :app:assembleDebug --no-daemon '-Pandroid.injected.testOnly=false'
```

7. Transfer the new `android/app/build/outputs/apk/debug/app-debug.apk` to the phone and install it as an update. Open Meridian → Continue with Google → choose a real account. Confirm Home opens, Profile shows the account email, app restart preserves sign-in, and Sign out returns to the welcome page. Cancel the account chooser and verify guest access still works. Do not uninstall to upgrade.

The native bridge uses Android Credential Manager, not a Firebase browser popup in a WebView. It obtains a Google token and Firebase JS establishes the same persisted user session used by the browser app. The Web OAuth client from the Android download is loaded into Capacitor config at sync time. Missing config displays a setup error and leaves guest access usable. Google account login requires internet; Nearby chat/Host/Join does not.

For release builds, register the release certificate SHA-1 (and Play App Signing certificate if publishing). Different machines/debug keys need their own fingerprint. Optional SHA-256 for this laptop: `0E:29:AB:8D:8A:95:1C:0F:14:08:7A:57:5F:48:80:D7:80:E7:67:D2:28:86:16:7C:97:67:96:77:FD:A0:31:7F`.

## Website login

Enable Google in Firebase Authentication and add the deployed hostname under authorized domains. Browser login uses Firebase signInWithPopup; popup cancellation returns to welcome without a fabricated account. Keep the project consistent with Android. No client secret or service-account key is needed in the client.

## Acceptance and remaining work

Browser UI/guest checks and compilation are separate from real Google account acceptance. Google login currently identifies the profile; it does not sync saved travel data, validate a Mesh participant identity or grant backend/operator access. Server Firebase ID-token verification and user-scoped storage/roles remain separate work.

References: [Firebase Google Android setup](https://firebase.google.com/docs/auth/android/google-signin) and [Android Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg).
