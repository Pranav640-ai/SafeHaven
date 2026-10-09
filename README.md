# SafeHaven AI — Mobile Frontend

A mobile-first React + TypeScript + Vite interface for SafeHaven AI. The same frontend can later be hosted as a website and packaged with Capacitor for Android.

## Run locally

Install Node.js 22+ and Git, then:

```bash
git clone -b ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
```

Open the Vite URL (typically http://localhost:5173). In Chrome, press **F12** and then **Ctrl + Shift + M** to preview mobile sizes. On a real phone connected to the same Wi-Fi, use the **Network** URL Vite prints if your firewall allows it.

Verify with `npm run build` and `npm run preview`.

## Final UI design

- **District-inspired layouts:** six centered illustrated feature tiles, card-led discovery, grouped Profile options and a restrained onboarding form. All branding and layout code are original to SafeHaven.
- **Two-color canvas:** glacier blue → pale iris, with a subtle blue grid and frosted glass-like cards. Deep sapphire for navigation and primary actions.
- **Typography:** Raleway for headings, Nunito for controls and body, regular-weight Cormorant Garamond italic for occasional editorial lines (Google Fonts with system fallbacks). No artificial bold on the serif accents.
- **Icons:** Lucide React vectors, one distinct icon per feature, no duplicated corner glyphs.
- **Interaction:** Motion page transitions and bottom sheets; native horizontal swipe/momentum with short spring end-pull and fading edges; native vertical scrolling, shrinking floating dock and skeleton shimmer.
- **Consolidated styles:** the old layered theme files and obsolete CSS declarations were removed. All theme definitions live in `src/styles.css`.

## Screens

Home, Explore Destinations, Risk Intelligence, Trip Replanner, Emergency Guidance, RescueMesh (Chats, Nearby, Beacons and SOS), Safety Pack, Login and Profile.

Home includes local check-in, preparation checklist, emergency tip expander and editable trip note. Profile includes display-name editing, linked safety-pack progress, grouped preferences and the loading animation replay.

## Integration limitations

The current branch is a **frontend-only prototype**. It does not connect to actual weather, news, government alerts, Gemini, Supabase, login authentication, Android Nearby Connections, offline delivery or emergency dispatch. SOS does not transmit anything, messages and check-ins remain local, and sample alerts must not appear current or officially verified. Community beacons are opt-in, unverified volunteer reports, not designated safe shelters.

The separate Kotlin RescueMesh work lives on `main` and has not been merged. See `ANDROID_MESH_SETUP.md` for a handoff regarding Android permissions and build configuration.

## Testing

- TSX syntax/transpilation and CSS parsing checks completed.
- Static Chromium responsive checks at 320, 390 and 430px show no document-level horizontal overflow; the feature tiles and dock remain within phone bounds.
- Full npm dependency installation, production build and physical phone gestures **have not been verified here** due unavailable registry downloads. Run `npm install && npm run build` locally before merging to main.
