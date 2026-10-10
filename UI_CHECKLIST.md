# Meridian visible-scope checklist

Current decision audit. Checked items have been inspected in code; automation evidence is recorded in FINAL_HANDOFF.md. This is a UI inventory, not a claim of field-proven disaster safety. Fixed artwork must not be replaced again; see AGENTS.md.

## Core visibility - keep these fixed

- [x] Home has the six existing core cards: Risk insights, Trip replanner, Emergency guide, RescueMesh, Safety beacon and Safety pack.
- [x] Six styled SVG illustrations match the preferred set: ShieldAlert / Navigation / BookOpen / Radio / MapPin / Bookmark. Emoji replacements removed.
- [x] For your next trip keeps its three existing cards and MapPin / Navigation / Radio SVG artwork.
- [x] Existing card frames, icons, colors, typography, landscape images and animations retained.
- [x] Main navigation remains Home / Explore / SOS / Mesh / Profile, with separate SOS touch target.
- [x] Home destination shows the chosen location; generic safety hero still asks for a location.
- [x] Original/Proposed trip views, reasons and approval retained; approval updates Original and leaves no pending proposal changes.
- [x] Guide / pack / Mesh / beacon / SOS keep their core functionality and meaningful disabled states.

## Redundancy decisions - checked one by one

- [x] Removed Home mini-checklist: duplicated Safety pack preparation with a separate progress state.
- [x] Removed Home trip-note editor: hotel/meeting-point preparation belongs in Safety pack.
- [x] Preserved old trip-note data; it supplies the pack field when no hotel field has been saved. No saved data erased.
- [x] Kept Quick check-in: useful shortcut to consented private-group status.
- [x] Kept Emergency tips: short guidance access before opening the full guide.
- [x] Kept Notifications: saved destination warnings and a working latest-warning action.
- [x] Kept Menu: navigates to implemented tools/preferences.
- [x] Kept Profile quick access/progress/preferences: useful access to the same saved pack, not a separate preparation state.
- [x] Profile name editor uses Pencil and opens the name form.
- [x] Profile gear opens real Settings; About/help remains the Help & information action.
- [x] Advanced map routes/photo/community reports stay inside Map details, not extra Home promotions.
- [x] Source questions/listening stay inside Guidance; phrases/consular lookup/private groups stay inside Pack.
- [x] Operator publishing/simulation stays on private /response, outside tourist navigation.
- [x] No fake Google sign-in, SMS, rescue dispatch, online/offline switch or invented connected peers shown.
- [x] Mesh automatic help participation and optional known-partner mode retained; separate location/status/SOS consent retained.
- [x] Duplicate activation/install messages and extra header activation badges remain removed.
- [x] Redundant emoji art properties and unused Home note/checklist state/imports removed.

## Validation / remaining review

- [x] Previous four-width dock checks passed at 320/375/390/430px; no dock geometry changed in this update.
- [x] Previous Home destination, approval/reload and help-mode checks passed; new affected checks are recorded in final handoff.
- [ ] Physical phone keyboard/orientation, screen-reader, contrast and reviewed-language usability audit.
- [ ] Physical Mesh automatic pairing, ACK, persistence, compass, speech and three-phone relay acceptance.

Additional features are visible only where useful and supported. Empty sourced feeds explain missing coverage; they are not filled with sample data. Do not remove a core disabled native control merely because a browser cannot operate the radio.

Latest validation: three focused browser checks passed for fixed SVG artwork (6 + 3), duplicate removal/legacy note retention, Profile edit/settings, dialog Back/SOS and all Home/core routes. TypeScript strict unused checks, production web build and final Android build passed. APK assets match dist and the package installed on 5558/5560. Physical Mesh/production acceptance gaps remain unchanged.
