# Meridian — complete manual feature test

Use the same latest APK on both phones. This guide covers non-Mesh features; physical Nearby testing is in MESH_TEST_GUIDE.md. Mark every item PASS, FAIL or BLOCKED and record the screen, action, expected result, actual result and exact error. An empty data feed can be correct UI behavior without proving live hazard detection.

## 0. Backend prerequisite

Configured API: https://safehaven-production-9f5d.up.railway.app

At the latest check on 10 October 2026, /api/health returned Railway HTTP 404, “Application not found”. Restore the Railway service/domain before judging online features. Open /api/health in a browser: expect JSON with status=ok, not an HTML page or Railway error. Check /openapi.json includes /api/intelligence/risk/assess and /api/intelligence/destinations/nearby. Those two routes require the canonical ui backend code. Enable private GEMINI_API_KEY/GNEWS_API_KEY where required; health flags identify whether those providers are configured. Do not put backend secrets in the APK. Confirm the API allows the Android https://localhost origin.

While blocked, local contact editing, saved itinerary/pack/guidance/phrases and physical Mesh remain independently testable. Do not clear app storage or uninstall while testing persistence.

## 1. Welcome, Google login and guest access

1. With internet on, open Meridian and choose Continue with Google. Choose a real account.
2. Expect Home; Profile should show that account's email, not a fabricated name/email.
3. Close/reopen the app. Expect the Firebase session to remain signed in.
4. Sign out. Expect welcome; reopening should not restore the signed-out account.
5. Start login again and cancel the chooser. Expect a usable welcome screen, no endless loader and no fake signed-in session.
6. Continue as guest. Expect Home and access to trip/local/Mesh tools without Google login.

A configuration error is FAIL/BLOCKED for native login, not a reason to count guest access as Google success. Physical account acceptance is separate from a successful APK build.

## 2. Home, Profile and navigation

1. Open each of the six Home tools: Risk insights, Trip replanner, Emergency guide, RescueMesh, Safety beacon, Safety pack. Check the correct page opens.
2. Test all five dock targets, especially SOS versus Mesh. Tap each target's centre and edge; they must select their own route.
3. Visit Explore → a destination → Map; use both screen Back and Android hardware Back. Expect the last page, with prior selection/scroll restored where retained.
4. Open and close Notifications, Menu, Settings and Edit profile. Back should dismiss the dialog before leaving the page; no stuck shimmer/loading screen.
5. Profile: Pencil opens the name editor; gear opens Settings; Contacts opens the pack's contacts section; My trips opens the replanner.
6. Verify the fixed Home/carousel artwork, dock animation and page shimmer remain intact. Check narrow screen, landscape, long names and the on-screen keyboard for clipping/overlap.

Profile display-name editing is local/session UI behavior; it is not a Firebase account-name update. Language preference selects supported content, not a complete translation of every UI label.

## 3. Explore: any destination

1. Search a city outside the preset cards, for example Tokyo or Nairobi; tap Search all locations.
2. Expect API results with region/country. Select the intended result; expect that place's risk screen.
3. Back to Home: the top-left destination should show the selection and reopen it.
4. Search ambiguous names and select a particular region; verify the selected coordinates/place do not silently become another result.
5. Search nonsense: expect a clear no-results message, not Manali or another default.
6. Open Choose an exact map point. Enter a label, valid latitude/longitude and its IANA timezone, such as Asia/Kolkata. Use this location; verify the labelled point is saved and opens Risk.
7. Test zero latitude/longitude: zero is valid. Test latitude 91, longitude 181 or Invalid/Zone: selection must be rejected.
8. Quickly change search text during a request; old results must not override the new search.

Named search depends on provider coverage. Coordinates support missing landmarks/trails. UTC is the manual default; enter the location's real timezone for local-hour risk windows.

## 4. Weather and basic risk signals

1. Choose a destination and a date within the displayed forecast, preferably the next few days.
2. Open Weather. Expect dated temperature/rain/wind values, timezone, source and retrieval time. Open its source link.
3. Pick other displayed forecast days. Values and selected date must update together.
4. Overview: the basic model flags daily rain >=20 mm, maximum temperature >=35°C, wind >=40 km/h, or thunderstorm weather codes 95/96/99.
5. If a displayed day crosses a threshold, expect Review these activities and a matching explanation. If none crosses it, expect No safety conclusion, not guaranteed safe.
6. Select a date outside forecast coverage. Expect an unavailable/coverage message, never invented values.
7. Refresh destination data. Timestamp/status should update after a successful response; failed refresh must clearly distinguish saved/partial information.
8. Change destination and verify old-place weather does not appear under the new name.

To prove the positive detection path, you need a real forecast day crossing a threshold, or a developer-controlled staging fixture. Ordinary weather with no signals does not prove the positive path. Do not choose a risky trip merely to test the app. These are planning heuristics, not disaster prediction; time to impact can correctly remain Unknown.

## 5. Detailed activity risk and reported events

1. In Risk → Overview, find Activity risk details.
2. Change Outdoor/Indoor/Water and the date; expect an assessment for the current selection and its explicit local planning window.
3. Expand Evidence and source coverage. Verify sources, evidence, timestamps, unavailable/skipped providers and uncertainty are visible.
4. A missing forecast/feed must give no safety conclusion or an unavailable state, not a reassuring numeric clearance.
5. If nearby reported events appear, open source links; check publication time/distance and the unconfirmed-local-impact label.
6. A severe earthquake report must not become a claimed evacuation order. Old events must remain historical/contextual.

The hourly prototype and basic daily thresholds are different models; their scores need not match. This section is BLOCKED until the intelligence routes are deployed and available.

## 6. Source reports and explanations

1. Risk → Reports: if records exist, inspect source, publication time, historical/recent label and local-relevance caveat.
2. Open Read report; expect the actual source page.
3. Tap Explain in preferred language. Expect a source-grounded explanation, language/translation label and English comparison where applicable.
4. Repeat in English and a supported alternative language.
5. If the feed is empty/unavailable, expect that message and coverage limitations, not invented reports or assurance of no hazards.

News coverage needs its configured provider. Explanation/translation may be restricted or fall back when AI is unavailable; note the actual behavior rather than marking a fallback as full AI acceptance.

## 7. Trip replanner: create and compare

1. Choose the same tested destination. Add an outdoor activity (e.g. Park walk), a water activity, an indoor activity and a Fixed booking (e.g. Hotel booking). Use real test dates within the forecast.
2. Add at least two activity dates if you want to test moving a stop within the trip window. Enter a preference, such as indoor activities.
3. Edit one Original activity; verify the intended row changes. Remove a disposable row; verify other rows remain.
4. Tap Review itinerary. Expect Original plan and Proposed plan, source/engine information, reasons and clear limitations.
5. If a forecast threshold affects an outdoor/water activity, expect a proposal or date change with its reason. Ordinary indoor activities should not be changed solely by those weather rules; applicable published warnings can affect indoor stops.
6. Fixed bookings must remain unchanged. Proposed dates must stay inside the dates entered for the trip.
7. Switch Original/Proposed repeatedly: Original must stay unchanged before approval.
8. If nothing is affected, No changes proposed is valid. Do not expect every test to generate a change.
9. Out-of-range forecast dates must be described as unknown, not assessed as safe.

Gemini is optional for the rule-based proposal path. An engine label saying Forecast planning rules (AI unavailable or not needed) is valid, but does not prove AI-generated suggestions. The same source warning/news is not automatically a verified closure.

## 8. Proposal edits, approval, rejection and persistence

1. On a plan with a real proposed change, choose Edit proposal; modify its activity/date/type, save, and compare with Original.
2. Approve changes. Expect the Original to adopt the approved proposal. Proposed should show no pending changes; approval reasons remain available.
3. Close/reopen and return to My trips. Approved stops should remain stored locally, without duplicate rows.
4. Create another proposal and reject it. Original must remain intact; no rejected changes should be applied.
5. Change an Original stop after analysis. The previous analysis must not stay presented as a current valid proposal without re-review.
6. Go to Safety pack: Saved itinerary should reflect the approved Original, not an unapproved alternative.

## 9. Nearby alternative discovery

1. Trip replanner → Find nearby alternatives → Find nearby places.
2. Expect real OSM candidates or an honest unavailable/empty response. Check straight-line distance, ranking explanation and missing opening/access information.
3. Choose Use as activity draft. Expect the form's activity/type to fill.
4. The candidate must not automatically add a saved stop, replace a booking or approve the proposal. Review and save explicitly.
5. Change destination and search again; suggestions from the old place must not masquerade as results for the new place.

BLOCKED if the nearby intelligence endpoint is missing. Listed venues are not guaranteed open, accessible or safe.

## 10. Map, location and road routes

1. Risk → Map: expect the map centred on the selected destination with its marker. Pan/zoom and read marker legend/source information.
2. Show my location on the map: grant permission and check your location. Deny permission on a separate attempt: expect a useful error/manual selection, not a crash.
3. Tap the map to select a point; verify report coordinates update.
4. Open Check a road route. Search/select a second town. Choose whether the start is the destination or selected map point.
5. Without endpoint-sharing consent, Compare road routes should stay disabled. Grant consent and compare.
6. Expect route length and loaded-warning intersections. No match must say safety unknown, not safe route.
7. Open Nearby assistance. If directory entries exist, inspect source/update/phone and use one as a route destination. Empty coverage must say so, without invented shelters.
8. Disconnect internet: show map unavailability/saved overlays where available. Offline street tiles are not a supported downloaded map feature.

## 11. Community observations — staging or genuine reports only

Do not publish fictional hazards or requests for rescue to a public service. Use a separate staging backend for test observations, or report only a genuine observation you intend to publish.

1. Map → Share an observation: select point/type, enter description and inspect the coordinates.
2. Before consent, submission must be disabled. Consent explicitly, submit and note the received report ID/state.
3. Refresh on another phone at the same place; expect the actual published report labelled unverified with observation time/expiry.
4. On the submitting phone, Remove my report; refresh both phones and verify removal.
5. Another phone without the owner's deletion capability must not be offered ownership deletion.
6. Check expiry/operator rejection on staging; stale/rejected reports must not be active observations.

## 12. Road-photo assessment

1. Map → Review a road photo: select a non-sensitive road image.
2. Before photo-sharing consent, assessment must be disabled. Grant consent and assess.
3. Expect visible observations, model estimate, confidence/uncertainty and limitations. It must not claim known water depth, guaranteed passability or a safe road.
4. Try cancelling file selection and an unsupported/oversized image; expect usable error/recovery.
5. If Gemini is absent, expect unavailable/configuration behavior, not a fabricated analysis.

## 13. Emergency guidance, languages, listening and questions

1. Home → Emergency guide. Test Flood, Extreme heat and Earthquake; each must show its own source-linked steps.
2. Change Preferred language: English, Hindi, Tamil; compare the English source and translation labels. French/Spanish may depend on configured AI or explicit fallback.
3. Save guidance for the pack; reopen it there. Prepare the needed language online before testing it offline.
4. Test the step-focused emergency view: next/previous steps remain in range; leaving focus restores the full guidance.
5. Test Read aloud and Stop with volume up. Missing language voice should be reported/disabled. A installed native offline voice can be tested again with internet off.
6. Open source questions, ask What should I do first? and compare the response with the selected source. Ask something outside that source: expect bounded/unsupported scope rather than invented instructions.
7. Open a source link; verify it reaches the cited guidance.

## 14. Safety pack and contacts

1. Profile → Contacts: save a number you own/are authorized to test, with a category. Check the number is displayed correctly.
2. Tap it: expect the phone dialler with that number. Cancel without calling emergency services.
3. Edit name/category/number and save: expect one updated row, not a duplicate. Save the same normalized number again: expect duplicate prevention.
4. Delete a disposable contact. Existing legacy contacts without categories should remain usable.
5. Enter hotel/meeting-point information and mark preparation checklist items. Those marks mean manually reviewed, not automatically verified.
6. In Risk, save the briefing; in the guide, save guidance. In Safety pack, tap Prepare offline guidance and wait for completion.
7. Check saved itinerary, briefing, preparation time, contacts and guidance. Source snapshots should show timestamps, not claim to be live.
8. Disable internet, close/reopen the app, use guest access if necessary, and check all saved items. Restart without uninstalling/clearing storage.
9. Fresh online requests must explain offline failure rather than replacing saved content with invented live information.

## 15. Phrase bank and consular directory

1. Safety pack → Critical travel phrases: select each supported language, check phrases and English comparison; test offline.
2. Open Embassy and consular contacts, enter nationality and find contacts.
3. If maintained listings exist, check source/update and dialler link. If absent, expect no maintained listings, not fabricated embassy numbers.

## 16. Online private groups — two phones

1. Both phones need internet and a functioning backend. Safety pack → Private group check-in.
2. A enters display name/group name, grants consent and creates a private group. Share its group-ID/private-invite string only with B.
3. B enters its display name and invite, grants consent and joins. Refresh on both; expect the two actual members.
4. Status buttons must be disabled before fresh sharing consent. A consents and sends safe; B refreshes and sees the status and timestamp. Repeat B → need help → A refresh.
5. Disconnect A from internet. Queue a status; expect it to be pending locally, not already received by B. Cancel it, then reconnect: the cancelled status must not be sent.
6. Queue another consented status while offline; reconnect/sync and check the new status on B. A stale earlier timestamp must not overwrite a newer accepted status.
7. B leaves/removes membership. Refresh A: B's shared membership/status must disappear. B must lose access to that group.
8. Invalid invites should fail clearly. Creating/joining/sharing does not silently send GPS.

These are status groups, not online buddy chat. Buddy invitations and one-to-one online messaging are deferred and should not be counted as implemented.

## 17. Notifications and signed warnings

1. Home notification bell opens destination warnings for the saved place. Verify its latest-warning action opens the right destination.
2. In Risk, inspect published area warnings/source/expiry. Empty coverage is valid, but is not a successful live-warning delivery test.
3. Actual warning/signature/expiry tests require a configured publisher and staging source-linked bulletin. Verified publisher signature must not be described as verified official authority. Invalid/expired instructions must be suppressed.
4. Browser web push is tested in an installed HTTPS PWA/supported browser, not assumed native APK push. Configure VAPID/provider first; the option is hidden when unavailable.
5. Allow destination notifications, publish a real staging warning matching that selected place, and check actual notification receipt. Tap it and verify the destination opens. Stop subscription and verify later test notifications stop.
6. Deny browser notification permission: expect usable in-app warnings, no fake subscription success.

Native FCM and SMS are not implemented. An in-app green toast is not background push delivery.

## 18. PWA website and updates

1. Open the website on HTTPS in a supported browser; install/add to Home screen if offered.
2. Launch the installed site; test local preparation and offline reload after loading/saving content online.
3. When a new build is deployed and an update is actually offered, accept it; check new assets load and saved contacts/plans remain.
4. Fresh browser storage starts empty. Saved APK data and saved browser data are separate, not automatically synced by Google login.

## 19. Response dashboard and isolated simulation — operator only

This is a separate website /response path, not an ordinary tourist Profile feature. It needs configured operator authorization; signing in with Google alone does not grant it.

1. Open /response on staging; invalid/missing operator access must not reveal protected reports/actions.
2. With authorized access, inspect report counts and review a staging report with a corroborating source or rejection. Verify tourist-facing report status updates; private group membership/status must not leak into this dashboard.
3. Open Run an isolated scenario. Enter area ring [[77,10],[77.1,10],[77.1,10.1],[77,10.1],[77,10]] and intersecting route [[76.9,10.05],[77.2,10.05]]. Choose warning/critical severity and plausible virtual counts.
4. Evaluate; expect SIMULATED results and affected-route behavior for the simulated warning/critical area. Move the route outside the ring and compare.
5. Real reports, saved trips, private-group statuses and live notifications must stay unchanged. Actual notifications sent must remain zero.
6. Publisher tests for signed area geometry, applicable dates and expiry belong on staging. Do not create fictional live official instructions.

## 20. Results and remaining scope

Record each test: feature | phone/version | PASS/FAIL/BLOCKED | action | actual result | error/time. For a failure, capture the relevant screen without exposing invite tokens, account secrets or other people's private messages.

A useful complete acceptance run covers: guest/Google, destination selection, positive and missing-data risk, proposal compare/approve/reject, contacts/pack offline persistence, map/location/routes, genuine/staging reports, guide/languages/voice, real two-phone online group status, and the separate physical Mesh checklist. Provider-dependent tests stay BLOCKED until their dependencies work.

Not implemented: online buddy chat (next phase), licensed offline street maps, native FCM/SMS, continuous background hazard monitoring, automatic rescue dispatch, guaranteed safe routes, Mesh voice calls/messages and authenticated nearby display names. Three-phone relay, force-stop queue persistence, background/range acceptance and translation/medical/local-authority review remain additional gates.

## 21. New incident reporting shortcut

Home → Report an incident. Test categories/severity/filter; choose an exact public report point or explicitly use GPS. Submission is disabled without publication consent. On staging submit an observation, check it on another phone at the same point, use Check public evidence, and remove it from its owner phone. Evidence must stay unverified even when weather/news context exists. Check Risk → Map, detailed activity context and a date-matched trip stop within 10 km: the report should be visible without independently changing/approving the plan. Real deployed routes and persistent storage are prerequisites.

## 22. New encrypted document vault

Profile → Document vault. Use dummy documents for acceptance: create a long passphrase, import a small PNG and multi-page PDF, add an encrypted contacts snapshot and view all of them without internet. Lock; verify wrong passphrase fails and correct passphrase works. Hide the app, leave the page and separately wait two minutes idle: it should lock. Restart and unlock offline; verify documents persist. Delete a disposable document, reopen and confirm removal. Native PDF page controls, low-storage/error handling and interrupted-preview cleanup require the actual APK/device. Existing Safety pack contacts remain outside the vault; do not assume the snapshot encrypts/deletes that original list. No password recovery.

## 23. New fake call / blank decoy

Home → Fake call & decoy. Test immediate call, caller name, optional ringtone, answer/timer/end, decline and scheduled-call cancellation. Keep app foreground. Open blank screen; use bottom Return or hardware Back. Dock controls must not intercept the overlay. Leave with a scheduled call; it must not trigger later. Repeat offline. No real call should be placed or contact notified.

## 24. Receiver-only beacon direction

A publishes a beacon. Its own entry should have no arrow/distance to itself. B receives it and taps Show approximate distance & bearing with permission granted: B should see the direction/distance toward A. Test approximate/denied location; clear error/fallback is required. Reverse roles. Publishing does not automatically ask for the receiver's GPS.
