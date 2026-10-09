# SafeHaven AI — Mobile UI Prototype

A **mobile-first, React + TypeScript + Vite** interface designed for the SafeHaven AI TravelTech prototype. Built around the user's District and Uber references with a distinct SafeHaven visual identity. All flows in this branch are **UI-only demonstrations**.

## Run on your laptop

Install Node.js LTS (22+ recommended) and Git, then run:

```bash
git clone -b ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173/`). In Chrome, press **F12**, then **Ctrl + Shift + M** to select a Pixel or iPhone viewport. Browser device emulation is a layout preview, not an Android runtime.

**If you downloaded the ZIP instead:** unzip it, open a terminal inside its `safehaven-ui` folder, then run `npm install` and `npm run dev`.

Run production checks with `npm run build`; test the result with `npm run preview`. The dev server is configured with `--host 0.0.0.0`, so a phone on the same Wi-Fi can use the Network URL printed by Vite if local firewall rules permit it. Local IP HTTP previews are not equivalent to a Capacitor APK.

## UI walkthrough

1. Start on the **login screen**. Tap **Explore as guest** or type a phone number and **Continue**; both enter the mock preview. **No SMS or OTP is sent.**
2. Home has a risk hero, 3-column feature grid, horizontal Embla carousel and a scroll-compacting floating dock.
3. Open Risk, Trip Replanner, Emergency Guide, RescueMesh, Community Beacon, Safety Pack, and Profile. Navigation and previews respond to taps.
4. From **Profile → About SafeHaven → Replay loading animation**, watch the skeleton shimmer and content transition. You can also switch between screens to see simulated loading.
5. Open SOS in the center of the dock to view a *demo-only* bottom sheet. It never sends a message.

## Design system and components

- Near-black background (#121215), charcoal surfaces, violet/indigo accent, restrained blue/teal/amber/red feature colors.
- Plus Jakarta Sans via Google Fonts with system fallback; fixed type scale and consistent editorial hierarchy.
- Motion for page transitions, dock active-pill and bottom sheet; **Embla Carousel** for horizontal editorial cards; **React Loading Skeleton** for shimmer; **Lucide** icons. CSS handles native vertical scrolling and safe-area padding.
- Login and profile screens follow the *layout principles* of user-provided District screenshots, without copying District branding or proprietary assets.
- One optional remotely served Unsplash photograph on the location card and one on a featured carousel; graceful gradient fallback if blocked. No AI-generated UI images, no embedded emojis and no generated full-screen assets.

## What is *not* implemented

This prototype does **not** fetch weather, news, official alerts, locations, AI recommendations or real maps. It has **no account authentication**, actual downloaded offline packs, Android Nearby Connections, SOS dispatch, beacon broadcasts, messaging delivery or check-in synchronization. Any message, check-in, beacon or edit is a **local state preview**. Risk and itinerary data are clearly marked as examples. The web frontend is intentionally independent so it can be wired to a Python FastAPI backend and packaged via Capacitor later.

## Developer notes

- Main screens and local mock state: `src/App.tsx`
- App design tokens, responsive layout, transitions: `src/styles.css`
- Design checklist and scope: `UI_CHECKLIST.md`
- Entry: `src/main.tsx`

Don't show "delivered", "verified", "safe route" or "official shelter" for unverified, offline or simulated data. Preserve the opt-in nature of Community Beacons and never imply that navigating toward one is safe.