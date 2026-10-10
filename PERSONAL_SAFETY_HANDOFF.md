# Incident integration, offline vault and decoy — 10 October 2026

## User-requested scope

Beacon direction belongs to the receiving phone, not its own published point. Add the supplied public incident module and connect observations to risk/trip review. Add Document vault in Profile and Fake call & decoy on Home. Keep six Home and three next-trip illustrations unchanged.

## Incident ZIP adaptation

Source: SafeHaven_Incident_Public_API_Verification.zip, SHA-256 2f326657097de6d2c59c5641833da93f3fa6473ff26f46aa1e7516874ffc292b. Its README is reference material, not authorization to replace Meridian or deploy a separate stack. Adapted category/severity/location/form/filter/ownership/public-evidence behavior into the current FastAPI/SQLite safety observations. No competing Express POST /api/incidents service was installed; that path already serves destination source reports. Existing observation ownership/moderation/24-hour expiry remains canonical, rather than the ZIP's 30-day list.

Home → Report an incident → choose town/exact coordinates or explicitly use GPS → choose category/severity → consent to publishing description/coordinates → submit. Nearby active observations appear in this list and existing Risk → Map. Categories: flood, landslide, road blockage, fire, weather, other. Deletion uses the existing per-report bearer capability saved in my-reports; it is not Google-account ownership.

GET /api/safety/reports/{rid}/evidence checks Open-Meteo model context, USGS records within 150 km/past week, GDACS centres within 250 km, optional place-name GDELT news discovery. Checks are on demand, bounded and cached for five minutes. Every public check remains unverified; missing/failed feeds are explicit, unsafe links are suppressed, no raw upstream error/secret is returned. Nearby events/news never certify a report or become an evacuation order. Live read-only check returned Open-Meteo, USGS and GDACS; GDELT was unavailable. No test incident was published to production.

Replanner and detailed risk show active, date-relevant community context within 10 km. Resolved/rejected/expired observations are excluded. Community observations do not independently change the plan, alter the risk score or override fixed bookings. Forecast/published warning rules and explicit Original/Proposed approval remain authoritative. Existing Map routes can display the same observations.

## Encrypted local document vault

Profile → Document vault → create a unique passphrase (minimum 12 characters) → import JPEG/PNG/WebP/PDF. Supports Passport/Visa/Insurance/Other and an encrypted snapshot of saved emergency contacts. Up to 20 entries, 5 MB per file, approximately 30 MB total.

Web Crypto AES-256-GCM authenticated encryption with random 96-bit IV per write; PBKDF2-SHA256 with 600,000 iterations and a random 128-bit salt. IndexedDB contains only version/KDF parameters/salt/IV/ciphertext: labels, categories, documents and contacts snapshot are encrypted inside the payload. The non-extractable key/passphrase is not persisted. Writes check the previous IV in one database transaction to avoid silent overwrites by another window.

Unlock/view/delete works without internet. Lock on leaving the page, document visibility loss or two minutes without pointer/key interaction. Wrong passwords or tampered ciphertext fail closed. No cloud sync, recovery service, biometric/hardware-key claim or independent security audit. JavaScript memory cannot promise forensic zeroization; unlocked content/screenshots and a compromised app/device remain outside this at-rest protection. Android/system backup may include encrypted app storage; original files selected from outside the vault remain wherever the user originally saved them.

Contacts snapshot is a copy: the Safety pack's original contacts remain separately available and are not retroactively encrypted or removed. Snapshot updates are explicit. No vault content is sent to Meridian/backend/AI/Mesh.

Android VaultPreviewPlugin uses the framework PdfRenderer offline, renders one page at a time and does not launch external viewers. It briefly writes a private cache PDF for rendering, deletes it in finally, and cleans orphaned preview files on plugin load after process interruption. Native PDF preview, app lifecycle/keyboard/backup behavior still require physical-device acceptance. Browser PDF preview depends on its built-in viewer. The native plugin is reproduced by install-rescuemesh; generated root android is not committed.

Implementation reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey and https://www.w3.org/TR/WebCryptoAPI/.

## Fake call and decoy

Home Quick actions → Fake call & decoy. Set a caller name, immediate/5/15/30-second delay and optional local ringtone. Answer displays a local call timer; decline/end/cancel stop it. No phone call, network request or contact notification is made. Keep the app foreground; this is not a background incoming-call service.

Blank decoy is an all-black local overlay with a bottom Return control. Call/blank overlays use a portal above the dock so its SOS button cannot intercept Return. Back exits through normal history and unmount clears timers/audio. Sound/silent-mode behavior must be tested on real phones. These tools do not guarantee a safe exit from a situation.

## Beacon fix

A beacon whose sender identity matches the current phone never shows a direction arrow/distance to itself. Show approximate distance & bearing is available for active beacons from other participants. On the receiving phone, tap it and grant location access to show the bearing. Publishing does not silently acquire recipient location. Radio/ACK/relay protocol unchanged.

## Deployment and acceptance

Build web before Android sync; do not use an APK containing older assets. Rebuild/install the new APK as an update on both phones. Incident/evidence/risk/trip context needs the canonical ui backend deployed with persistent storage. Vault/decoy/beacon radio features do not depend on Railway. The most recent Railway health check in this chat returned Application not found (404); restore its service/domain and verify /api/health plus new routes before claiming online acceptance.

Focused acceptance evidence and APK verification are recorded in FINAL_HANDOFF.md. Remaining: real two-phone recipient arrow/GPS; native PDF multiple pages/restart/denial; local ringtone and hardware Back; vault idle/background/restart/low-storage/backup handling; real deployed incident submit/delete/source-context visibility on another phone. Buddy chat remains deferred.

Focused final validation: five incident/backend checks and four browser checks passed. Vault/incident checks also passed after the final storage-conflict guard and GPS/filter additions. Wrong passphrase, tampered ciphertext, offline image/contact viewing, visibility lock, report consent/deletion/context, decoy cancellation/overlay and own-versus-recipient bearing were exercised. Live read-only public providers: Open-Meteo/USGS/GDACS available, GDELT unavailable. Production web and Android debug builds passed; all final APK assets match dist and VaultPreview/Google configuration are packaged. No full-suite rerun. Native PDF/audio/lifecycle and deployed incident acceptance remain pending.
