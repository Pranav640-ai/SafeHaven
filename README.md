# SafeHaven AI — Premium UI Prototype

This repository's `ui` branch contains the **UI-only** React + TypeScript + Vite prototype for SafeHaven AI, built with Tailwind CSS and reusable interaction components. The visual style is inspired by District and Uber, but all product branding, card styling, and generated illustrations are original.

## View on your laptop

Install Node.js 22 or current LTS and Git, then open a terminal:

```bash
git clone -b ui https://github.com/Pranav640-ai/SafeHaven.git
cd SafeHaven
npm install
npm run dev
```

In Chrome, visit **http://localhost:5173/** (or the URL Vite prints), press **F12**, and then **Ctrl + Shift + M** to select Pixel 7 or a similar ~390px wide phone viewport. Keep the terminal running for hot reload. Use `Ctrl + C` to stop it.

To use the packaged ZIP instead, extract the ZIP, open a terminal in the extracted folder, and run `npm install` followed by `npm run dev`.

To preview on a real phone, connect the laptop and phone to the same Wi-Fi, start Vite, and open the **Network** URL printed by Vite on the phone. If the network URL does not work, allow Node.js through your laptop's firewall.

For a production check:

```bash
npm run build
npm run preview
```

There is also a standalone HTML visual preview in the downloadable delivery. It is **not the React app**; it is intended as a quick design reference even without npm.

## What's included

- Home with premium dark gradients, a destination-intelligence status widget, six illustrated modules, animated carousel stories, and a custom **AI-generated** scenic feature image
- Risk Intelligence, Trip Replanner, Emergency Guide, RescueMesh messaging UI, Community Safety Beacon, Safety Pack/check-in UI, Search/Explore, and Profile
- Floating bottom dock that compacts when scrolling down and expands when scrolling back up, with a permanently available demo SOS control
- `motion` for tactile transitions and animated navigation, `embla-carousel-react` for swipeable cards, `react-loading-skeleton` for shimmer loading, and `lucide-react` for consistent icons
- Press **Preview shimmer loading** on Home to replay loading placeholders; risk cards have their own refresh preview
- Generated, optimized WebP artwork in `public/visuals/`
- Mobile and laptop layouts; basic reduced-motion accessibility styling

## Important: UI demonstration only

**None of the integrations are live**: no weather, news, incident warnings, Gemini, maps, login, emergency SOS delivery, native Android networking, GPS beacons, offline downloads, or group check-in synchronization. Every preview is explicitly demo content. RescueMesh messages are *local UI drafts*, not transmitted, and pressing SOS only opens a clear disclosure sheet.

The frontend can later be connected to a FastAPI service through a typed API client and to Capacitor/Kotlin for Android-only Nearby Connections. Never display actual delivered/sent states without real acknowledgments.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion · Embla Carousel · React Loading Skeleton · Lucide React · Plus Jakarta Sans (system fallback).