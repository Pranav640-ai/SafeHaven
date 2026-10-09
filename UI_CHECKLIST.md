# SafeHaven UI design checklist — implementation audit

These are the acceptance rules for the front-end prototype, based on the supplied District Login/Profile/Hotlists/Search/Home screenshots, Uber Home/Services/Activity/Skeleton screenshots, and SafeHaven's five-module product scope.

## Visual design and editorial style

- [x] Use one font family and a consistent heading/body/caption weight and size scale. Plus Jakarta Sans + platform fallback.
- [x] Take reference from the **arrangement** of District login (dark brand visual above restrained form) and profile (account card, wide useful banner, three shortcuts, grouped preference rows).
- [x] Use a deliberate color system: near-black, charcoal, violet with controlled blue, rose, teal and amber accents.
- [x] Avoid full AI-generated screen images, obvious AI-style decorative UI widgets and repeating unnecessary pill badges.
- [x] Replace all emoji navigation and module imagery with one consistent Lucide icon family.
- [x] Keep user-facing copy short and specific; avoid exaggerated feature claims or vague AI marketing language.
- [x] Preserve meaningful whitespace, readable line lengths and clear information priority rather than treating every element as a promotional card.
- [x] Images are optional editorial accents; one remote non-AI photo each for the featured carousel and risk cover with CSS gradients as fallback.

## Components and interactions

- [x] Real reusable UI components: heading, back header, list row, feature card, bottom sheet, status note, carousel.
- [x] Reuse established packages: Motion, Embla Carousel, React Loading Skeleton, Lucide React.
- [x] Horizontal swipe with drag/snapping in the carousel; vertically scrolling content with native touch momentum.
- [x] Floating bottom navigation with animated active pill, scroll-down compact state and scroll-up expanded state.
- [x] Center SOS access stays visible when the navigation compacts.
- [x] Subtle transition when changing pages; press states; animated bottom sheet.
- [x] Simulated shimmer loading on page changes and replay from Profile, then revealed content.
- [x] Reduced-motion support for users who prefer less animation.

## Responsive and usability

- [x] `viewport-fit=cover`; `100dvh` mobile shell and safe-area-aware top/bottom spacing.
- [x] Three-column module grid with adaptive internal widths and small-phone breakpoint at 350px.
- [x] 44px+ touch target for major interactive controls; form input mode `tel` and explicit labels.
- [x] Accessible names on navigation, form controls, dialog and icon buttons.
- [x] Scrollable dialog/content; keyboard focus indicators; color alone does not carry safety status.
- [ ] **Physical device review pending:** check Android and iOS viewports with local Vite server and native browser, including software keyboard and orientation changes.
- [ ] **Production compile pending:** local dependency installation blocked in the assistant environment; user can run `npm install && npm run build`.

## Features retained (five modules)

- [x] Destination risk intelligence UI, incident provenance and explicit mock-data labels.
- [x] Minimum-disruption itinerary comparison UI; mock alternatives labeled accordingly.
- [x] Emergency guide UI with three sample hazards and clear limitation notice.
- [x] RescueMesh chats and Community Safety Beacon as a subfeature, both explicitly not connected.
- [x] Safety pack/check-in UI; states are local only, not downloaded or shared.
- [x] Login and profile UI added as common app-shell flows, not new feature modules.
- [x] SOS always framed as a **non-sending demo**.

## Remaining integration responsibilities

Wire API content and official source provenance; make real authentication optional; implement Android/Kotlin Nearby Connections and independently validate direct links before relays; implement consent-based beacon lifecycle and location expiration; test Android APK on two or three real devices. None are implied to work in this UI prototype.
- [x] Parent phone scroll container uses `touch-action: auto`, avoiding the vertical-only gesture restriction that blocked inner horizontal strips.

### v6 visual and interaction review

- [x] Porcelain, ocean blue, muted sea-glass and sand replaces previous neon green/dark theme.
- [x] Consistent type roles: Nunito for UI text, Raleway for headings, Abril Fatface only for editorial emphasis.
- [x] Frosted white translucent widgets over a subtle grid and soft spotlight.
- [x] Preserved red for SOS and amber for caution.
- [x] Removed swipe-strip arrow buttons and compulsory snap.
- [x] Implemented restrained elastic edge pull on both sides of native horizontal strips.
- [x] Kept every RescueMesh action clearly marked demo only.
- [ ] Verify real touch interactions and contrast after the React dependencies install locally.
