# Meridian

A travel-safety companion that brings destination intelligence, flexible trip planning, offline essentials and nearby communication into one experience.

**[Open the live demo](https://safehaven-production-3da2.up.railway.app)**

## From planning to travelling

Choose a destination and travel date, review weather and source reports, then build an itinerary. Compare proposed changes before accepting them and prepare a safety pack for offline access. During the trip, use guidance, companion check-ins, local observations or Android nearby communication according to your situation.

## Features and functionality

### Destination exploration and selection

Explore searches towns and cities beyond the featured destination cards. Results identify the region and country so travellers can distinguish places with similar names. For trails, landmarks or places missing from search, an exact labelled coordinate and timezone can be selected. The chosen destination is retained on Home and reused in its risk review.

### Destination risk insights

A dated overview combines rain, wind, temperature and forecast planning signals with source reports and local context. Outdoor, indoor and water activities can be examined separately through hourly evidence, an explicit planning window and source-coverage information. Unknown or unavailable information stays visible rather than being presented as a safe result.

Nearby disaster records show source links, timestamps and distance to the event centre. Historical reports and unconfirmed local impact are distinguished from current instructions. Forecast scores are model estimates, not disaster probabilities or official travel clearance.

### Source reports and public evidence

Travellers can read timestamped reports and open their original sources. Source-linked explanations preserve uncertainty and can use the preferred supported language.

Public evidence checks compare a community observation with Open-Meteo weather context, nearby USGS earthquake records, GDACS disaster reports and GDELT news discovery. Results show available evidence, check time and unavailable providers. Related weather, news or nearby events provide context; they do not independently verify the submitted incident.

### Trip planning and minimal-disruption replanning

Travellers create dated outdoor, water and indoor activities alongside fixed bookings. Trip review considers forecast signals, applicable published warning areas and travel preferences. AI-assisted suggestions are available when the provider is configured, with a labelled forecast-rule fallback.

The **Original plan** and **Proposed plan** remain separate before approval. Each proposal provides reasons and can be edited, approved or rejected. Approval updates the saved Original; the Proposed view then shows no pending changes. Rejection preserves the Original. Fixed bookings are retained, and proposed dates stay within the entered trip window.

### Nearby activity alternatives

The replanner discovers real OpenStreetMap candidates near the selected destination. Suggestions include straight-line distance, ranking explanations and information gaps such as unconfirmed opening hours or accessibility. Selecting a candidate fills the activity draft for review; it does not automatically overwrite a booking, save a stop or approve a change.

### Community incident reporting

A Home shortcut lets travellers publish observations with a category, estimated severity, description and selected coordinates. Supported categories include flood, landslide, road blockage, fire, weather and other incidents. Publishing requires explicit consent because the description and coordinates become public.

Travellers can filter nearby reports, request public-evidence checks and remove their own submissions. Reports expire after 24 hours. Active, date-relevant observations also appear in the destination Map and in risk/trip context within 10 km. Unverified observations do not independently change a plan or its risk score.

### Local conditions map and route comparison

The map displays the selected destination, source-event markers, community observations, published warning areas and available sourced assistance listings. Travellers can select a point manually or explicitly request their device location.

Road-route comparison checks returned OSRM routes against loaded warning polygons and presents intersections alongside distance. Assistance and consular listings retain source/update information where maintained data is available. A clear map or route without a matching loaded warning is not a guarantee of safety.

### Consented road-photo assessment

With a configured AI provider, travellers can submit a resized road image after explicit consent. The result describes visible conditions, concern and uncertainty. It does not certify passability, infer reliable flood depth or guarantee road safety.

### Emergency guidance and language support

Source-linked guidance covers Flood, Extreme heat and Earthquake. Travellers can read the full instructions or focus on one step at a time, compare English source text, save guidance and use read-aloud when the appropriate voice is installed.

English, prepared Hindi/Tamil content and provider-dependent French/Spanish translations are supported, with translation labels and limitations. Critical travel phrases remain available in the safety pack. Bounded source questions help explain the selected guidance without presenting the feature as unrestricted emergency advice.

### Offline safety pack and emergency contacts

The safety pack brings together saved contacts, approved itinerary, destination briefing, prepared guidance, phrases and preparation details. Saved information includes timestamps so a snapshot is not confused with a live alert.

Profile → Contacts supports contact categories, editing, duplicate-number prevention, deletion and dialler access. Preparation checklist items are marked manually. Previously saved essentials remain available without internet; fresh data requires a connection. Downloaded offline street maps are not included.

### Private online companion groups

Travellers create or join a private group using an invitation and explicit consent. Members share selected safe/need-help/unknown statuses with timestamps and refresh their companions' updates. Offline status changes can be queued, synchronized or cancelled; leaving removes membership and the shared status.

Group status sharing does not silently send GPS. These internet-based groups are separate from Nearby Mesh and are not a one-to-one buddy-chat service.

### Offline Android Nearby Mesh

Nearby Mesh connects participating Android phones through Bluetooth/Wi-Fi Nearby without relying on the deployed backend or mobile data. It supports automatic nearby help participation, optional known-partner pairing and a dedicated two-phone Host/Join mode.

Connected travellers exchange messages with peer receipt acknowledgements. Queued, offered and acknowledged states are kept distinct. Automatic help participation begins only after discovery is explicitly started; nearby display names remain unverified. Google account login does not automatically authenticate a radio participant.

### SOS and nearby check-ins

The separate SOS page sends assistance requests to nearby participants. Status check-ins require their own sharing consent. Bounded encrypted pending SOS/check-in queues expire within 24 hours, and acknowledgement is shown only when a peer confirms receipt.

Cancelling a pending request cannot retract a copy already received or relayed. This is traveller-to-traveller communication, not automatic contact with emergency services or guaranteed rescue dispatch.

### Temporary safety beacons

A participant can voluntarily share a GPS meeting point, optional capacity and an expiry time, then withdraw it. Receiving phones can request approximate distance and bearing toward that point. The publishing phone does not show an arrow to its own beacon.

Beacons are self-reported, unverified meeting points rather than certified shelters. Bearing is a straight-line direction, not a safe walking route. Offline peers may retain a copy until withdrawal reaches them or the beacon expires.

### Encrypted offline document vault

Profile → Document vault stores passport, visa, insurance and other document images/PDFs, plus explicit snapshots of emergency contacts. Labels and content are encrypted locally using passphrase-based AES-256-GCM authenticated encryption. The passphrase/key is not persisted.

Documents can be unlocked and viewed without internet. The vault locks when hidden, left or idle for two minutes. It supports up to 20 items, 5 MB per file and approximately 30 MB total, including offline native PDF page previews.

There is no password recovery or app-level cloud sync. Contacts snapshots are separate from the Safety pack's original list, and imported original files remain in their original locations. This protects stored vault data; it does not claim protection against a compromised device or unrestricted screenshots of unlocked content.

### Fake call and blank decoy

A Home shortcut opens a locally simulated incoming-call screen with a chosen caller name, immediate/delayed start and optional ringtone. Travellers can answer, view a call timer, decline, end or cancel the scheduled call. No real call is placed and no contact is notified.

A blank-screen option provides a quiet local decoy with a Return control. Both features work offline while the app is open, and their controls appear above the navigation dock.

### Google sign-in and guest access

The website uses Firebase Google sign-in; Android uses a native account chooser to establish the Firebase session. Profile shows the signed-in account, session persistence and sign-out are supported, and guest entry preserves access to local preparation and Nearby tools.

Account sign-in does not automatically synchronize locally saved trips/documents or grant response-team privileges.

### Notifications, signed bulletins and response tools

In-app notifications provide access to destination warnings. Configured supported browsers can opt into destination web push. Publisher bulletins carry source links, affected-area geometry, expiry and signature validation; a publisher signature is not itself proof of official authority.

A protected response workspace supports report review, source-linked publication and delivery metrics. Its isolated scenario simulator evaluates hypothetical areas/routes and virtual check-ins without changing live reports, groups or trips or sending real notifications. Native FCM and SMS are not included.

## Evaluation scope

Source coverage, configured providers and device capabilities determine which online results, translations, voices and directory entries are available. Missing coverage is shown explicitly. Mesh range, multi-hop/background behavior and native lifecycle behavior require physical-device evaluation; foreground message delivery is not a promise of universal connectivity. Local official instructions take priority over model estimates and community observations.

## Submission links

- **Live demo:** [Open Meridian](https://safehaven-production-3da2.up.railway.app)
- **Video submission:** Link to be added. <!-- Replace this line with the final video URL. -->
- **Android APK:** [Download Meridian](https://github.com/Pranav640-ai/SafeHaven/raw/refs/heads/ui/downloads/Meridian.apk)
