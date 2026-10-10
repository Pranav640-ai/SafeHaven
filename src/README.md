# SafeHaven Google login — integrated

Firebase Google sign-in is **already integrated** into this React app. There is no separate frontend login branch to merge. The GitHub `GoogleLoginPage` branch currently follows the Kotlin-only `main` history; the working React files are on `ui`.

## Files

- `GoogleLoginPage.tsx`: Google popup authentication, guest entry and visible sign-in errors.
- `GoogleLoginPage.css`: scoped welcome layout, matching the shared `phone-shell` dimensions. Full-viewport on mobile, centered 410px phone on desktop.
- `firebase.ts`: Firebase Web SDK initialization, Auth and Google provider for the existing SafeHaven Firebase project.
- `App.tsx`: Firebase `onAuthStateChanged` subscriber, persisted web login state, guest flow, profile display and logout.

## Configure and verify

1. Run `npm ci && npm run dev`.
2. Firebase Console → Authentication → Sign-in method → enable Google.
3. Firebase Console → Authentication → Settings → Authorized domains → include the actual hosted web domain. `localhost` can be authorized for development.
4. Use `Continue with Google` in a supported web browser. Test that Profile shows the returned account and Sign out returns to welcome.
5. Use `Continue as guest` to verify non-authenticated browsing.
6. Run `npm run build` and `npm run test:web`; `tests/auth-layout.spec.ts` checks welcome sizing/alignment and guest navigation.

The Firebase web API key/config are **public client configuration**, not server secrets. Never add an Admin SDK service-account file, private signing key or other secret to the frontend or APK.

**Android note:** Firebase `signInWithPopup` is a web-browser flow. A Capacitor WebView may require an Android-native sign-in implementation; do not claim it is production-tested on Android solely because the website works.
