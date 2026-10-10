# App icon

Source: [Lucide shield-check](https://github.com/lucide-icons/lucide/blob/main/icons/shield-check.svg), used under the accompanying Lucide ISC license in `LICENSE`. The original downloaded SVG is preserved here. SafeHaven adds its existing sage background and ivory stroke; no in-app icons or branding are changed.

Generated web icons live in `public`; Android launcher resources live in `native/resources`. `npm run android:sync` copies the tracked resources into the generated Android project. To regenerate PNGs after intentionally updating this source, run `node scripts/generate-app-icons.mjs` (requires Playwright and installed Chrome). Then sync and build the Android APK normally.
