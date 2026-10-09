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
2. Home has a risk hero, 3-column feature grid, interactive local check-in, expandable emergency tips, an on-page preparation checklist, a horizontal momentum/drag-free Embla carousel with arrow controls, and a scroll-compacting floating dock.
3. Open Risk, Trip Replanner, Emergency Guide, RescueMesh, Community Beacon, Safety Pack, and Profile. Navigation and previews respond to taps.
4. From **Profile → About SafeHaven → Replay loading animation**, watch the skeleton shimmer and content transition. You can also switch between screens to see simulated loading.
5. Open SOS in the center of the dock to view a *demo-only* bottom sheet. It never sends a message.

## Design system and components

- Near-black graphite background (#101216), charcoal surfaces, indigo/blue and teal accents, and controlled coral/amber/violet feature colors.
- DM Sans for controls and body text, League Spartan for page/card headings, and a restrained Libre Caslon Display accent on onboarding; with system fallbacks and a consistent type scale.
- Motion for page transitions, button feedback and bottom sheet; **Embla Carousel** for horizontal editorial cards; **React Loading Skeleton** for shimmer; **Lucide** icons. CSS handles native vertical scrolling and safe-area padding.
- Login and profile screens follow the *layout principles* of user-provided District screenshots, without copying District branding or proprietary assets.
- Restored small, colorful emoji-based illustrations in the six Home cards and spotlight carousel, inspired by the earlier premium prototype. The Home risk banner uses a bundled generated landscape illustration (not a baked UI screen). Destination photography uses an optional Unsplash photo with a gradient fallback. Navigation and functional controls use Lucide SVG icons.

## What is *not* implemented

This prototype does **not** fetch weather, news, official alerts, locations, AI recommendations or real maps. It has **no account authentication**, actual downloaded offline packs, Android Nearby Connections, SOS dispatch, beacon broadcasts, messaging delivery or check-in synchronization. Any message, check-in, beacon or edit is a **local state preview**. Risk and itinerary data are clearly marked as examples. The web frontend is intentionally independent so it can be wired to a Python FastAPI backend and packaged via Capacitor later.

## Developer notes

- Main screens and local mock state: `src/App.tsx`
- App design tokens, responsive layout, transitions: `src/styles.css`
- Design checklist and scope: `UI_CHECKLIST.md`
- Entry: `src/main.tsx`

Don't show "delivered", "verified", "safe route" or "official shelter" for unverified, offline or simulated data. Preserve the opt-in nature of Community Beacons and never imply that navigating toward one is safe.

## UI polish v3

The floating dock is CSS-centered with independent, locally clipped active-tab indicators to avoid overlapping bubbles and off-center icons on compact mobile widths. The previous UI commit remains recoverable via the `ui-before-artwork-dock-fix` branch.

## UI interaction polish v4

- **Horizontal gesture:** use touch or trackpad to drag the Home spotlight carousel left/right. It uses Embla drag-free momentum (no forced CSS snapping) and provides visible previous/next buttons for mouse users. Filter tabs also support horizontal drag/scroll.
- **Vertical scroll:** native browser momentum/overscroll with no scroll locking or sticky section snapping. Navigation shrinks only after a meaningful downward gesture, and expands on upward scroll.
- **Independent Home tools:** local check-in toggle, a source-cautioned safety-tip expander and a preparation checklist. All local-only.
- **Mobile typography/colors:** League Spartan display, DM Sans UI, Libre Caslon Display small editorial accent, indigo/teal with restrained warm category colors.
- **Android handoff:** see `ANDROID_MESH_SETUP.md` for Gradle and manifest snippets and the main-branch Kotlin review. The generated Capacitor Android project does not yet exist in this branch.

## UI v5 — green spotlight, destination discovery, and organized mesh

- Deep emerald spotlight/glass theme and fine grid treatment. The grid is drawn in CSS so it works offline without a downloaded background.
- The **Explore** page includes sample destination tiles, category filters, a scenic cover, and horizontal scrolling.
- **Home** retains local-only check-in, hazard tips and preparation checklist, and adds a session-only trip reminder that can be edited in place.
- **RescueMesh** includes **Chats / Nearby / Beacons / SOS** tabs. All connectivity and messages remain simulations; no native transport or server is connected.
- Horizontal showcases now use **native overflow scrolling** instead of a snap-driven carousel: swipe on a touchscreen or trackpad, click the arrow buttons, or click-drag with a mouse. The scroll is free-moving and does not force the selected card into a snapped position.
- Destination photography uses hosted Unsplash image URLs; it requires internet when first opened. The editorial Explore cover also has a local fallback in `public/visuals/sunset-trail.webp` (a generated graphic). For eventual offline installation, replace the online photo URLs with locally optimized and licensed files.
- Image credit: destination background/photo assets from [Unsplash](https://unsplash.com/license), including the hosted landscape photographs linked in the source. These are demonstration photos and not necessarily photographs of the labeled locations.

### Test checklist

1. Start with `npm install && npm run dev`; enter via **Explore as guest**.
2. Home: edit a trip note, mark check-in, tick a preparation item, expand an emergency tip without navigating away.
3. Explore: type `Goa` and clear the field; switch between Mountains, Nature, and Coast; click/swipe the destination photos horizontally.
4. Home spotlight: swipe left/right by touch or mouse drag; use chevron buttons and verify vertical scrolling still works when the finger starts on a carousel card.
5. RescueMesh: switch among Chats, Nearby, Beacons and SOS; preview a scan; send a local message draft; never expect real devices or message delivery.
6. Test at 320, 375, 390 and 430px phone widths and in a real phone browser when possible.

## v6 — porcelain and tidal blue theme

The UI now uses a restrained **warm porcelain + ocean blue + sea-glass + sand** palette in place of the earlier neon green/dark theme. Interface text and small controls stay opaque for contrast; supporting surfaces use translucent panels with backdrop blur over a subtle CSS grid and soft spotlights. No background image or network request is needed for the grid.

**Typography:** Nunito for body/UI labels, Raleway for headings and navigation, and Abril Fatface for a few prominent editorial highlights (all loaded from Google Fonts with local system fallbacks). Astralaga is not bundled because redistribution rights/availability were not established.

**Horizontal gestures:** Home spotlight and Explore destination strips use native horizontal overflow and a subtle spring pull (Motion) when dragged a short distance past either edge. Carousel arrow buttons and sticky snapping have been removed. Phone swipes use native browser momentum; desktop users can also drag with a mouse. Reduced-motion preferences disable the spring effect.

This is still a mock-interface-only project; UI indicators are examples, not live safety advisories or connected RescueMesh states.

## Final interface pass (v7)

- Typography: Raleway headings, Nunito controls/body, Abril Fatface only for editorial highlights.
- Unified sapphire/blue porcelain palette in `src/styles.css`, with v7 styles preserved in their original cascade order. Blue grid, frosted slate-blue cards, readable white selected tab.
- Lucide vector feature icons replace emoji artwork; swipe rows fade at the sides with edge breathing room.
- Profile has an editable identity area, genuine local safety-pack progress, shortcuts and grouped settings.
- Real Unsplash photography is used for the Home hero and destinations where online; local scenic cover remains the fallback. These photos depict places generically and are not live hazard data.
- Weather, SOS, mesh and data integrations are pending. Safety-critical feedback still says not sent/not connected.

Run `npm install`, `npm run dev`, then `npm run build` to validate locally.