# SafeHaven AI — UI Preview

**One mobile-first SafeHaven experience.** This branch contains a UI-only React prototype inspired by the dark cards, floating navigation and interaction patterns of District and Uber. The visual work is original and does not use their proprietary code or branded assets.

## Run locally

```bash
npm install
npm run dev
```

Open the URL from Vite (usually http://localhost:5173). To preview mobile sizes on a laptop, open Chrome DevTools (`F12`) and toggle device emulation (`Ctrl+Shift+M`).

To compile:

```bash
npm run build
```

## Included screens

- Home dashboard with six entry tiles for the **five core modules** (Safety Beacon is part of RescueMesh)
- Explore/search shell, destination risk intelligence, sample trip replanner, emergency guidance
- RescueMesh chat drafts, opt-in Community Safety Beacon preview
- Offline Safety Pack/check-in preview, Profile/preferences
- District/Uber-inspired dark theme, shared card system, floating spring-animated bottom dock that shrinks while scrolling, Embla carousels, skeleton shimmer, tactile animations and SOS preview sheet

## Important: UI demonstration only

**No integrations are live** on this branch: no weather, incident/news feeds, AI trip replan, emergency SOS, Nearby Connections, location sharing, messaging, user accounts or offline caching. Mock alerts and example data are visibly labeled. SOS **never sends** anything, messages are local UI drafts, check-ins are not shared, community beacons are unverified examples and are **not broadcast**.

## Connecting later

Keep the React UI and replace mock collections in `src/App.tsx` with data hooks/services. The exact same project can be packaged with Capacitor later; Android-only RescueMesh features should be exposed via a native Kotlin bridge (Nearby Connections) and must be proven on physical devices. Do not display a sent/delivered state before receiving actual native acknowledgement.

## Libraries

React 19, Vite, TypeScript, Tailwind CSS 4 + custom design tokens, Motion, Embla Carousel, React Loading Skeleton and Lucide React. Font: Plus Jakarta Sans (with system fallbacks).
