# Meridian repository instructions

Read NEXT_AGENT_CONTEXT.md, UI_CHECKLIST.md, FEATURE_CHECKLIST.md and FINAL_HANDOFF.md before changes. Canonical branch is ui; old design branches and historical Kotlin handoffs are references.

## Fixed visual elements

Preserve the six Home SVG illustrations: ShieldAlert, Navigation, BookOpen, Radio, MapPin, Bookmark. Preserve For your next trip SVG illustrations: MapPin, Navigation, Radio. These are the styled vector versions from 6b61d84, not historical emoji artwork. Keep their widget layout, decorative frames, colors, fonts and animations unchanged unless the user explicitly requests a change. Never replace them during cleanup. Profile name edit uses Pencil; the Profile gear opens Settings.

Keep the static grid/spotlights, sage/ivory theme, Raleway/Nunito/editorial font roles, outline shimmer, dock animation and separate SOS/Mesh hit targets. UI changes should be limited to requested functionality/copy or removal of a demonstrated duplicate. The redundant Home mini-checklist and trip-note editor were removed; preparation belongs to Safety pack. Retain legacy saved notes and avoid deleting user data.

Use the checklists to record code present versus tested/production ready. Do not fabricate official data, shelters, routes, peers, authentication or delivery. Mesh help mode auto-accepts only after explicit discovery start; participants stay unverified. Known-partner code comparison is optional. Physical delivery is still unverified.

Run focused checks for affected behavior; do not repeatedly run the entire suite for cosmetic changes. Build web before syncing Android assets, stop on build failure, and verify APK assets. Tracked native sources are native/android; root android is generated. Never commit local secrets. Update authoritative docs and takeover context when behavior changes.
