============================================================================
APP STORE RELEASE STRATEGY
============================================================================
DECISION: Release "SwimSum Lite" to App Store
Goal: Get a functional basic version to the App Store quickly
Approach: Hide advanced features, basic ad-supported model
Future: Collect emails for update notifications, premium features in updates
Code Strategy: Keep everything in same project, copy original math for reference

CURRENT READY FEATURES (V1.0 Base):
- Template-based generation with 27 real workout templates
- Randomization working (no identical workouts)
- Core bug fixes completed (cool down, odd/even parsing)
- Project board with automated sync
- Comments & Feedback column added for team collaboration
- Swimmer Math Engine (27m/33m snapping) active

IMMEDIATE PRE-LAUNCH TASKS (V1.0):
HIGH PRIORITY:
✅ COMPLETED: Fix pool length math (Swimmer Math Engine implemented 2026-02-11)
✅ COMPLETED: Hide advanced options & set editor (Lite Mode Toggle implemented 2026-02-11)
✅ COMPLETED: Generate Signed Bundle (v1.0 uploaded to Internal Testing)
✅ COMPLETED: Fix Ad ID Declaration in Play Console
✅ COMPLETED: Update Data Safety Form & Account Deletion URLs (2026-02-16)
✅ COMPLETED: Align Triple-Link Privacy Policy (Store, Data Safety, Deletion)
✅ COMPLETED: Initialize AdMob Test Banner with Adaptive Height logic
✅ COMPLETED: Redesign Splash Screen with sequential text animation (2026-02-16)
✅ COMPLETED: Replace set reroll dolphins with spinning refresh icons (2026-02-16)
✅ COMPLETED: Program Email Collection Logic & Firebase Integration (2026-02; Web SDK + Email Link).
⏳ PENDING: Implement Adaptive AdMob Banner height (Fix 'narrow' look).
✅ COMPLETED: Integrated Auth Flow: Google Sign-in / Email account creation gate (2026-02; Firebase Web SDK).
✅ COMPLETED: Tester 'Skip' Logic: LocalStorage flag for internal test bypass (2026-02-16).
✅ COMPLETED: Placeholder Auth Gate (Sign-in/Google) with "Skip" logic for testers (2026-02-16).
- Fix Android Visual Fidelity (Current blocker: "Bloated" look/wrong backgrounds)
- Add ad placement framework - Basic banner/interstitial ads
- Add email signup collection - For update notifications
- Comprehensive testing - All distances (500-10000m), all pool lengths

MEDIUM PRIORITY:
- Add "Idea parking" column to board for 8 pending idea items
- Update sync script to recognize new board columns

POST-LAUNCH ENHANCEMENTS (V1.1+):
- Premium tier features (advanced editing, more templates)
- Interval and pace calculations
- Expanded template library (100+ templates)
- Mobile drag gesture improvements
- Social sharing features
- Restore pool length math for all pool sizes

============================================================================

Project: SwimSum - Swim Workout Generator
Working title(s): SwimSum (final name)

Last updated: 2026-03-11

### Version and release (2026-03-05)
- **Version 1.0.12 (versionCode 34)** – closed-testing build with hardened auth, improved gradients, and initial AdMob/Billing wiring. In `android/app/build.gradle`: versionCode 34, versionName "1.0.12".
- **Closed testing:** A release must have an app bundle **attached** (Add app bundle / Upload). If the release shows "No app bundles have been added" or "Available on 0 devices", add the new AAB to that release and roll out again.
- **Gradient blend:** In `index.js` `gradientStyleForZones`, stripe bands use ±22% and stepped bands use ~35% overlap so colours visibly blend instead of hard stripes.
- **Ads:** Test ads are default (`TEST_ADS` true). For production/real ads, build with `TEST_ADS=false` (e.g. set env or build flag). Production IDs are in code (BANNER_PROD_ID, INTERSTITIAL_PROD_ID). Remove Ads subscription not yet purchasable; Play Billing dependency added, purchase flow still TODO.
- **Connect phone to Android Studio (wireless):** Pairing by QR/code has not worked; use **same hotspot** (PC and phone on same hotspot). Wireless debugging port changes each time – in Developer options note the IP:port (e.g. 192.168.0.16:44271). **Authoritative procedure:** from the project root run `npm run connect-phone -- <IP>:<port>`. This calls `connect-phone.ps1`, which uses the stored adb path (`C:\Users\jesse\AppData\Local\Android\Sdk\platform-tools\adb.exe`) to execute `adb connect <IP>:<port>`. If the script reports that adb.exe is missing, update the path inside `connect-phone.ps1` or reinstall Platform Tools. Future agents must not try to pair via QR/code first; always follow this hotspot + `npm run connect-phone` workflow.

### Version and release (2026-03-10 – Billing + Analytics)
- **Current Version: 1.0.13 (versionCode 35)** – Android `app` module now sets `versionCode 35`, `versionName "1.0.13"`. This is the first build with working Google Play Billing integration for the `remove_ads_yearly` subscription plus Firebase Analytics wiring.
- **Billing (Remove Ads):**
  - Native `BillingBridge` plugin refactored to use a single `activePurchaseCall` and to supply the **subscription offer token** when launching the billing flow (required for Play Billing v5+).
  - `purchaseRemoveAds` and `checkRemoveAdsEntitlement` both fully resolve or reject their `PluginCall`s; entitlement checks query Play purchases and return `hasRemoveAds` to JS.
  - On device, `index.js` calls `BillingBridge.purchaseRemoveAds()` from all Remove Ads entry points; on success it sets `hasRemoveAds` and thanks the user, on failure it shows an explanatory message.
  - Current behaviour: Play billing UI now appears and works correctly **only for Play-signed builds installed from the test track**. Locally installed (Android Studio) builds still show “This version of the application is not configured for billing” / “Purchase failed” – this is expected and due to signature mismatch, not a code bug.
  - Entitlement sync on startup: `syncEntitlementFromBilling()` runs once on app load and calls `BillingBridge.checkRemoveAdsEntitlement()` to align local `hasRemoveAds` state with any active Play subscription on the device.
- **Analytics (Firebase Analytics via AnalyticsBridge):**
  - Added `implementation 'com.google.firebase:firebase-analytics'` under the existing Firebase BOM in `android/app/build.gradle`.
  - New native Capacitor plugin `AnalyticsBridge` (`android/app/src/main/java/com/creativearts/swimsum/AnalyticsBridge.java`) wraps `FirebaseAnalytics` and exposes three methods to JS:
    - `setUserId({ userId })` – sets the Firebase Analytics `user_id` (we pass in the Firebase Auth UID).
    - `setUserProperty({ name, value })` – sets GA4 user properties (e.g. `subscription_status`).
    - `logEvent({ name, ...params })` – logs events, coercing extra params to strings in a `Bundle`.
  - `MainActivity` now registers `AnalyticsBridge` alongside `AuthBridge` and `BillingBridge` so it is available in the WebView.
  - In `index.js` we added a small analytics wrapper:
    - `trackEvent(name, params)` – no-op in the browser; on-device calls `AnalyticsBridge.logEvent({ name, ...params })` and swallows any errors so UX is never broken by logging.
    - `trackSetUserId(uid)` – called when auth resolves a user; sets the analytics `user_id` to the Firebase Auth UID.
    - `trackSetUserProperty(key, value)` – used to keep a high-level `subscription_status` user property in sync (`free` vs `remove_ads`).
  - Key events and properties now instrumented:
    - On boot: `app_open` with params `{ signed_in: true/false, environment: 'capacitor'|'web' }` fires once when `authReadyPromise` resolves.
    - Workout generation: `generate_workout` with pool length (custom vs standard), unit, target distance, focus, and whether kick/pull are included.
    - Rerolls: `reroll_section` with section index, label, target distance, and cumulative `reroll_count` per section.
    - Deletions: `delete_section` with section index and label whenever a card is deleted.
    - Monetisation funnel:
      - `remove_ads_cta_clicked` with `source: 'premium_page'` or `source: 'support_after_interstitial'` when the user taps Remove Ads from those entry points.
      - `remove_ads_flow_opened` when the JS billing flow is about to call into native billing.
      - `remove_ads_purchase_success` when a Remove Ads purchase resolves with `hasRemoveAds=true`.
      - `remove_ads_purchase_failed` with a `reason` string when Play rejects the purchase or when the entitlement cannot be confirmed.
  - User properties:
    - `subscription_status` is kept in sync with the local `hasRemoveAds` flag (`'remove_ads'` vs `'free'`) via `trackSetUserProperty` inside `setHasRemoveAds`.
    - Analytics `user_id` is set to the anonymous Firebase Auth UID (no email/name stored as analytics properties).
- **Build + Capacitor sync:**
  - `npm run build` generates a fresh `www/` bundle (index, styles, assets, offline-engine) and confirms the web app remains self-contained.
  - `npx cap sync android` was run from the project root so `android/app/src/main/assets/public` now contains the latest web build, and `capacitor.config.json` is refreshed.
  - Android Studio can generate the signed AAB for closed testing directly from the current `android` project without additional CLI steps.
- **Analytics validation plan:**
  - Use Firebase Console → Analytics → **DebugView** with `adb shell setprop debug.firebase.analytics.app com.creativearts.swimsum` to verify events from a real device.
  - Confirm that `app_open`, `generate_workout`, `reroll_section`, `delete_section`, and the Remove Ads funnel events appear with reasonable parameters and that `user_id` matches the Firebase Auth UID when signed in.
- **Data safety + privacy (next steps, not blocking closed testing):**
  - Current closed-testing builds may ship before updating Data Safety again; before **production** we must confirm:
    - In Play Console → App content → Data safety: “App activity/Usage data” and “Identifiers” are marked as collected for **Analytics/Product improvement** and **not required for app functionality**, and as **not shared** beyond Google services.
    - Privacy policy text (hosted on the SwimSum site / Google Sites) includes a short statement noting we use Firebase Analytics to collect anonymized usage data (country, app usage frequency, workout generation behaviour, subscription events) to improve SwimSum and that we do not store names/emails as analytics properties.
  - **Checklist:** See **DECLARATIONS-AND-REVIEW.md** for a double-check list (Data safety, ads, permissions, account deletion) and steps for submitting for review (closed testing and production).
- **Premium options Remove Ads fix (2026-03-10):**
  - The "Prefer just to remove ads?" button in the premium overlay lives in a different IIFE from the Remove Ads billing code, so it was calling `startRemoveAdsPurchase()` which was not in scope → ReferenceError after the alert, so nothing happened. Fixed by having the premium button call `window.showRemoveAdsPlaceholder()` and optionally `window.logRemoveAdsEvent()`; those are now exposed on `window` from the Remove Ads IIFE. The redundant "Starting Remove Ads purchase…" alert was removed.
  - **Google Group link:** A single constant `GOOGLE_GROUP_URL` (and `window.SWIMSUM_GOOGLE_GROUP_URL`) is set in the Remove Ads IIFE; the support modal "Join the discussion" link and the premium overlay "Join our Google Group" link both use it. Default is `https://groups.google.com/g/swimsum`. If your actual group URL differs, change `GOOGLE_GROUP_URL` in `index.js` (search for "GOOGLE_GROUP_URL") and rebuild.
- **Immediate next step (March 2026 Pause In Action):**
  - Human will generate a new **signed AAB** from Android Studio for version **1.0.14+ (versionCode 36+)** and upload it to the **closed testing** track in Play Console. Once processed, install from the Play Store test link on a physical device and re-test:
    - Remove Ads purchase flow (billing dialog appears, purchase succeeds with no “not configured for billing” error when using the Play-signed build and correct test account).
    - Ads behaviour (test vs production IDs as configured).
    - Analytics events visible in Firebase DebugView from the Play-signed build.

### Conventional comparison (2026-03-03)
- **Phase 1:** Corpus built in `research/outputs/conventional-corpus.json` (62 workouts from USMS article fetch + curated seed). Analysis produced `research/outputs/conventional-rules.json` (distance buckets for 25m/25yd and 50m; allowed main/kick/drill rep patterns). Comparison script `research/compare-generator.js` runs the generator vs rules and writes `research/outputs/conventional-violation-report.json`.
- **Phase 2:** Generator updated per violation report: 50m warm/build buckets [200,400,500]; 25m/25yd warm/build [300,400,500,600,800]; conventional main rep patterns only (e.g. 4/5/6/8/10/12×50/75/100/200); post-pass sanitizes main-like section bodies. Violations reduced from 63 to 12 (remaining mostly 5x50 and N×25 in edge cases).
- **Phase 3:** Version bumped to 1.0.10 (versionCode 32). `npm run build` and `npx cap sync android` completed. Gradle `bundleRelease` failed with “invalid source release: 21” (JDK). To produce the AAB: use JDK 21 and run `cd android && .\gradlew.bat bundleRelease`, or in Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle, choose release, sign with your keystore. AAB output path: `android/app/build/outputs/bundle/release/app-release.aab`. Upload that file to Play Console for closed testing.

Status: Migrated from Replit to local Cursor + Android Studio workspace. GitHub is the Source of Truth. Native Android Google Sign-In implemented via AuthBridge (Firebase). Email+password sign-in implemented with verification emails working and **hard email-gating** enforced (unverified email+password users are kept at the auth gate with clear “verify then sign in again” copy). Heavy splash screen removed in favour of a lightweight logo fly-in and a 4-card onboarding sequence (Step 1–4) that auto-plays twice, then remains as a static instruction stack with a `?` help button to replay the animation. Onboarding instruction cards have been tuned to use slightly desaturated, non-button-like pastels distinct from the main workout cards (colours captured in `colorStyleForEffortOnboarding` in `index.js`). Ad behaviour for v1 Lite is now defined: free users see a bottom Adaptive Banner plus an optional welcome interstitial (once per app session), while users with a `hasRemoveAds` entitlement see no banner and no welcome interstitial. A `hasRemoveAds` entitlement flag exists in the client, wired via localStorage for now; real Play Billing wiring is still TODO. AdMob integration remains test-ID first, with production IDs configured behind a TEST_ADS flag. Testing: Internal/closed testing in progress (second week). Working build protected on branch `cursor-transition`. Generator math and UI are in active refinement for standard pools (25m, 50m, 25yd) with lengths display, drill structure, and reroll behaviour iterated in this cycle.
Current Version: 1.0.13 (versionCode 35) – see "Version and release (2026-03-10 – Billing + Analytics)" above. AAB should be built via Android Studio (Generate Signed Bundle / APK) using the existing release keystore and uploaded to the Play Console closed testing track.

### 🏢 BUSINESS & PLAY CONSOLE CREDENTIALS
* **Organization Name:** CREATIVE ARTS GLOBAL LTD
* **Address:** Unit 82A, BURY ST. EDMUNDS, IP28 7DE, United Kingdom
* **D-U-N-S Number:** 234466045
* **Play Console Status:** Pending conversion from Personal to Organization account.

============================================================================ READ THIS FIRST
This file is the single source of truth for the project.

If there is any uncertainty about:
- what we are working on
- what phase we are in
- what is allowed or frozen
- how to resume after a break

Then STOP and read this file in full before doing anything else.

Chat memory is disposable. This file is not.

============================================================================ ANDROID BUILD PROTOCOL (CRITICAL)
Strict process for generating App Store builds from Replit:

1. DOWNLOAD:
   - Download `android` folder from Replit.
   - Unzip to local machine.

2. OPEN IN ANDROID STUDIO:
   - File > Open.
   - Navigate to the **INNER** `android` folder.
   - CHECK: The folder MUST directly contain `build.gradle`, `settings.gradle`, and the `app` folder.
   - DO NOT open the outer `android` folder (nested structure causes "Add Configuration" error).

3. SYNC:
   - Select "This Window".
   - **WAIT** for the progress bar (bottom right) to finish completely.
   - DO NOT click "AGP Upgrade Assistant" (Dismiss all notifications).

4. BUILD:
   - Verify top toolbar shows module `app` (not "Add Configuration").
   - Build > Generate Signed Bundle / APK.
   - Select "Android App Bundle".
   - Use saved Keystore (Release key).
   - Destination: `android/app/release/app-release.aab`.

============================================================================ CURRENT BUGS (ACTIVE)
🐛 BUG: Android Visual Fidelity
   - Symptom: App looks "bloated", wrong backgrounds, fonts off in WebView.
   - Status: Detected 2026-02-14 after first successful install.
   - Suspect: Viewport meta tags, CSS unit scaling, or stale `www` sync.

🐛 BUG: Replit Auth on Published Web App
   - Symptom: Friends asked to login to Replit to view app.
   - Fix: Must toggle Deployment setting to "Public".

🐛 AUTH & SPLASH SAGA (Feb 2026)
   - History:
     - Initial app used Firebase Web SDK (`signInWithPopup` / `signInWithRedirect`) inside the Capacitor WebView. On device this opened an external Firebase page that never returned to the app, often showing a blank page or “missing initial state” errors.
     - Introduced native `AuthBridge` plugin using FirebaseAuth + GoogleSignIn, added SHA‑1 fingerprint, updated `google-services.json`, and added `com.google.android.gms:play-services-auth` in `android/app/build.gradle`.
     - Several iterations of splash/auth timing changes caused regressions: frozen blue splash (no animation), missing auth gate, or `generateWorkoutLocal is not defined` when the offline engine was not loaded.
   - Current behaviour:
     - Google sign-in: Native AuthBridge flow now works; users can sign in with Google on device and appear in Firebase Auth, then proceed into the app.
     - Email sign-in: Email+password sign-in path creates accounts and sends verification emails; users can still reach the generator immediately after account creation (gating on `emailVerified` is still being hardened).
     - Splash: Current build sometimes skips or briefly flashes the Capacitor/native splash before showing the SwimSum splash; earlier builds could freeze on a plain blue screen. Long‑term goal is to minimise/remove the splash in favour of a simple logo + in‑app help overlay.
   - Remaining issues:
     - Email path should enforce `emailVerified === true` before allowing access to the generator, with clear “verify your email, then sign in again” messaging.
     - Splash/boot path is fragile; changes to script loading order or auth gate wiring can still cause a stuck blue screen or skipped animation.

============================================================================ ACTIVE DEVELOPMENT - SWIMGEN2
Repository: https://github.com/jkellyllekj/swimgen2

Status: Template-based rebuild preserving UI layer
Core Principle: No algorithmic set invention - real-world templates only
Scale Goal: Thousands of validated swim sets continuously growing
Current Focus: Fixing Android WebView visual issues & Lite Mode launch

============================================================================ INSTRUCTION STYLE RULE
The assistant must always provide explicit, start to finish instructions.

This means:
- Always specify the exact file name(s)
- Always specify exactly where to change the file (section or heading and position)
- Always provide copy and paste ready text blocks for additions or replacements
- Do not say "add this somewhere" or "put this in the project state" without exact placement

Planning happens in chat. The agent is execution only.

Agent message format rule (from WORKING-METHOD-REPLIT.md):
- All instructions sent to the agent must be enclosed in a single code block
- Begin with "START MESSAGE TO AGENT"
- End with "FINISH MESSAGE TO AGENT"
- Contain all actions, tests, and reporting requirements inline
- Never rely on prose outside the code block

============================================================================ PROJECT INTENT
Swim Workout Generator (SwimSum) is intended to be a real, shippable consumer app, not a demo.

The goal is:
1. A usable, attractive, coach plausible swim workout generator
2. Deployed first as a web app
3. Then wrapped and shipped to the iOS App Store
4. With monetisation from day one
5. Without architectural dead ends that require a rebuild

Long term evolution is expected (years), but v1 must stand on its own.

============================================================================ CURRENT PHASE
Phase: v1.5 - Layout, AdMob Integration & Console Compliance

Primary goals:
- Finalize AdMob layout with Adaptive Banners (pinned to bottom:0)
- Splash screen professional branding ("SwimSum" text addition)
- 2026 Play Store compliance (Web-based account deletion via Google Sites)
- Extraction of offline-engine.js and resolution of scope/newline bugs

Constraints:
- Generator uses ONLY real-world templates (no algorithmic invention)
- Current UI/gestures must be preserved
- All sets must be coach-plausible and wall-safe
- ALL existing colors and backgrounds preserved (no CSS hex code changes)

Phase is complete when:
- Layout fixes verified on mobile
- Auth & Ad SDK integration ready for next phase
- Code is clean and modular

============================================================================ ARCHITECTURE OVERVIEW (MIGRATION PATH)
CURRENT (LITE RELEASE READY):
- Monolithic index.js with Template-Only generation
- Swimmer Math Logic: Correct snapping for custom pools (27m/33m)
- Feature Flag: IS_LITE_MODE toggle for App Store release
- Working UI/gestures with animation issues
- Broken edit persistence (Locked for Lite Mode)

TARGET (SWIMGEN2):
/swimgen2/
├── legacy/                     # Original working code
├── src/
│   ├── generator-v2.js         # Template-based engine
│   ├── template-library/       # Real-world sets (thousands)
│   ├── editor/                 # Tabbed editor system
│   │   ├── drill-editor.js
│   │   ├── mainset-editor.js
│   │   └── effort-builder.js
│   ├── pace-calculator.js      # CSS/interval mathematics
│   └── workout-model.js        # Data structures
├── ui/                         # Preserved & enhanced UI
│   ├── gestures.js             # Enhanced with phone gestures
│   ├── renderer.js             # Animation fixes
│   ├── modals.js               # Tabbed edit modal
│   └── background-options.js
└── business/
    ├── tiers.js                # Free/Premium/Pro gating
    ├── ads.js                  # Ad integration for free tier
    └── storage.js              # Workout history/favorites

**MIGRATION STRATEGY:**
1.  Build generator-v2 alongside legacy system
2.  Compare outputs for realism validation
3.  Gradually replace algorithmic generation
4.  Preserve all UI/gesture functionality
5.  Cutover when template library > 1000 validated sets

============================================================================ PAUSE IN ACTION AND NEW CHAT HANDOVER
When a Pause In Action is declared:
1. The current chat is disposable
2. Continuity must be recovered from this file
3. No prior chat context should be assumed

Canonical raw links:
PROJECT: SwimSum
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/project-state.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/WORKING-METHOD-REPLIT.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/COACH_DESIGN_NOTES.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/index.js
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/styles.css

Rules:
- Assistant cannot browse repo folders
- Only exact file URLs are readable
- After any logic change, index.js must be re linked (raw link is sufficient)

Pinning rule:
For precise debugging, pin index.js to a commit permalink when investigating a bug so the file cannot change under us.

### Handoff note – end of 2026‑02‑27

- **Current build:** 1.0.7 (versionCode 29) – hardened email gating, simplified logo + onboarding instead of heavy splash, lock button that freezes generator/controls while still allowing scroll, AdMob test banner at bottom, and new SwimSum S‑logo launcher icon created via Asset Studio.
- **Play Console:** latest closed‑testing release has been submitted and is awaiting Google review; once approved we can invite more testers and gauge real‑world behaviour (auth friction, onboarding clarity, lock button usefulness, icon appearance, and ad intrusiveness).
- **Next focus for future chats:** return to the **math and logic** inside the generator (pace/interval reasoning, set composition, edge cases for distances) and the **Advanced options** surface (strokes, equipment, templates) which are still roughly wired but not final. The v1 Lite app is shippable today, but we want v1.1+ to have more polished, coach‑plausible logic and clearer options.
- **Reminder to future agent:** do **not** abridge this file; only append / update sections with precise patches. Follow the existing Android build protocol (npm run build → npx cap copy android → Android Studio signed bundle) and the “Launcher Icon & Branding Workflow” section if the S‑logo or icon assets are touched again.

### Handoff note – 2026‑03‑02 (Billing + Analytics regression)

- **Current build on device:** 1.0.13 (versionCode 35) with Google Play Billing + Firebase Analytics wiring in place as described in “Version and release (2026‑03‑10 – Billing + Analytics)”, but the **Remove Ads** purchase flow is still effectively broken in practice.
- **Symptom:** All “Remove Ads” entry points (premium page buttons, support banner CTA, etc.) currently **do nothing visible** on device; Google Play’s purchase dialog is never shown and no entitlement is granted. Logcat repeatedly reports `ReferenceError: trackEvent is not defined` from `index.js` (around the billing/analytics funnel code, latest seen near line 4443).
- **Root cause (current understanding):** Analytics instrumentation for the Remove Ads funnel was added on top of the billing wiring using a `trackEvent` helper defined inside one IIFE and (intended to be) exposed as `window.trackEvent`. However, several billing‑related call sites still execute in a different IIFE/scope and invoke a bare `trackEvent(...)`. On real devices, those call sites throw a `ReferenceError` before reaching the Capacitor billing bridge, so **analytics failures are blocking the billing UI entirely**.
- **Attempts this session (all failed):** Introduced a `globalThis.trackEvent` shim at the very top of `index.js`, explicitly assigned `window.trackEvent = trackEvent` at the definition site, and then updated billing‑related code paths to call `window.trackEvent` behind `typeof window.trackEvent === 'function'` guards. Despite these changes, Logcat still shows `ReferenceError: trackEvent is not defined` for the Remove Ads paths and the UI remains inert, suggesting that at least one billing/CTA code path is still invoking an unscoped `trackEvent(...)` or running before the analytics helper is initialised in the WebView.
- **What is known to work:** Outside of this Remove Ads regression, Firebase Analytics is otherwise wired and events such as `app_open`, `generate_workout`, and reroll/delete events have been observed in DebugView from earlier builds. The native `BillingBridge` plugin compiles and, in earlier iterations, the Play billing sheet could be reached from a Play‑signed build when called directly without analytics wrappers. The current blocker is **JavaScript scoping/initialisation order** in `index.js`, not Play Console SKU configuration.
- **Next steps for the next agent:**
  - Open `index.js` and locate **all** references to `trackEvent` and `window.trackEvent`, especially inside the Remove Ads funnel (`startRemoveAdsPurchase`, premium page CTAs, interstitial support CTAs, and any shared helpers). Replace or wrap any remaining bare `trackEvent(...)` calls so that (a) they cannot throw if analytics is missing, and (b) they never prevent the call into `BillingBridge.purchaseRemoveAds()` / `BillingBridge.checkRemoveAdsEntitlement()`. It is acceptable to temporarily **no‑op analytics in these flows** to unblock billing.
  - Verify via a local debug build that tapping any Remove Ads button at least logs console output and reaches the Capacitor billing bridge (even if Play Billing subsequently rejects the purchase in a debug‑signed build). The key is that **JS errors must no longer occur before the native call**.
  - Once JS scoping is fixed, rebuild (`npm run build` → `npx cap sync android`) and then generate a new Play‑signed AAB for 1.0.13 (or bump to 1.0.14) so the human can re‑test on a closed‑testing install. Only after the purchase dialog reliably appears and resolves should analytics events (`remove_ads_cta_clicked`, `remove_ads_flow_opened`, `remove_ads_purchase_success` / `failed`) be carefully re‑enabled around the billing calls with hardened guards.
  - Keep this section **unabridged** and append any future findings here; do not delete prior notes about the billing/analytics integration even if the underlying bug is later fixed.

============================================================================ WORKOUT STRUCTURE RULES
Standard section order:
1. Warm up
2. Build
3. Kick
4. Drill
5. Main
6. Cool down

Rules:
- Warm up and cool down are always low effort
- Build is warm up part two
- Main is primary intensity
- No section may end off wall

Short workout rule (critical):
1000m workouts must not be over constrained by forcing all sections
The generator must avoid impossible constraint combinations at short totals

Section gating (current intent):
- Below 1200m: Drill may be omitted
- Below 1000m: Kick and Drill may be omitted
- At 1800m and above: full structure is expected
This gating exists to prevent constraint satisfaction failure at short totals.

============================================================================ DISTANCE AND POOL RULES
- All sets must end on the same wall they start
- Set distances must be divisible by 2 times pool length (wall safe)
- Even Length Requirement: For any distance > 1 length, the count must be even (2, 4, 6, etc.) to ensure wall return.
- Honest Totals: Total distance is the sum of actual snapped distances, not the target distance.
- Custom pool lengths (example 33m) are first class citizens
- For standard pools (25m, 50m, 25yd) totals should match the slider exactly

============================================================================ EFFORT RULES
- Warm up and Cool down: blue or green only
- Build: progressive (may touch orange, rarely red)
- Drill: usually blue or green
- Kick: may include strong or hard
- Main: yellow, orange, red expected

Variety intent:
- About 60 to 70 percent of workouts include at least one red exposure
- Gradients should not be overused
- Hard efforts should sometimes stand alone

============================================================================ EDIT MODAL COLOR STANDARDS
All edit modal effort selectors must use these exact colors:
- Easy: #1e90ff (blue)
- Moderate: #2ecc71 (green)
- Strong: #f39c12 (orange)
- Hard: #f1c40f (yellow/cream)
- Full Gas: #e74c3c (red)

============================================================================ LOCKED INVARIANTS
1. Generator uses real-world templates ONLY (no algorithmic invention)
2. Template library contains thousands of continuously growing sets
3. Swimmer Math: All distances snapped to even multiples of pool length.
4. Feature Flag: IS_LITE_MODE controls UI complexity for App Store.
5. Edit operations persist mathematically with tabbed interface
6. All sets are coach-plausible and wall-safe
7. Current UI/gestures preserved and enhanced during migration
8. Phone and web have appropriate gesture sets for their platforms
9. Animations are smooth 200ms transitions, not instant
10. Effort levels follow standard color coding
11. Intervals calculate correctly for CSS or rest-based timing
12. index.js is runtime authority
13. Generator never returns null or fails silently
14. Reroll must always produce a valid workout

============================================================================ CSS GEOMETRY LOCKS (2026-02-22)
These values are device-tested on Samsung S24+ and must not be changed without physical device verification.

1. **Side Gutters:** 15px fixed for all panels (generator, instruction, totals, workout cards).
2. **Card Gaps:** 12px vertical spacing between workout set cards.
3. **Scroll Offset:** 24px margin-top on `#workoutNameDisplay` ensures the generator panel scrolls fully out of view while keeping cards perfectly aligned below the status bar.
4. **Scroll Margin:** `scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 14px)` on `#workoutNameDisplay` and `#cards` -- tuned to position content just below the Android title bar.
5. **Safe Area Spacer:** `.safe-area-spacer` height set to `env(safe-area-inset-top, 0px)` -- fallback is 0px because Android WebView handles its own inset.
6. **ResultWrap Top Margin:** 4px (reduced from 16px to tighten generator-to-workout gap).

============================================================================ EFFORT LEVEL BAR LOCKS (2026-02-22)
- Labels ("Easy", "Moderate", "Strong", "Hard", "Full Gas") are centered below dolphin icons.
- "Moderate" uses 12px font (longest word); all others use 14px.
- Fixed point-size constraints are active to prevent Android accessibility/font-scaling from breaking the layout.

============================================================================ SPLASH SCREEN LOCKS (2026-02-22)
- All splash text uses viewport-width (vw) units instead of fixed px to prevent Android system font scaling from causing overflow.
- "SwimSum" title: `font-size: 15vw` (~54px on 360px phone).
- "Workout Generator" subtitle: `font-size: 5.5vw` (~20px on 360px phone).
- Bullet point text: `font-size: 4.2vw` (~15px on 360px phone).
- Container: `#splash-content` width 90vw, max-width 500px, centered with `margin: 0 auto`.
- **Known High-Priority Bug:** On devices with very high zoom/accessibility settings, the text may still appear oversized. Future fix: transition to an SVG logo or hard-constrained container for the title.

============================================================================ PRODUCT TIERS AND MONETISATION (v1)
SwimSum uses a subscription based model. Generator rerolls are deterministic and local. Monetisation is not tied to generation count.

Free Tier (Ad-supported):
- Basic template-based generation
- Standard pool lengths (25m, 50m, 25yd)
- Fixed set structures (no editing)
- Persistent banner ad + light interstitial ads
- Lite Mode Active: UI simplified (IS_LITE_MODE = true)

Premium Tier (Subscription):
- Removes all ads
- Allows custom pool lengths
- Allows set resizing and editing
- Basic pace suggestions
- Equipment toggles (fins, paddles, snorkel, pull buoy)

Pro Tier (Subscription):
- Includes all Premium features
- Adds full pace/CSS integration with interval calculations
- Advanced effort customization (builds, pyramids, alternations)
- Drill database access (30+ drills with categorization)
- Workout history and favorites system
- Advanced control over effort and stroke bias
- Season planning foundation

Notes:
- No standalone ad removal only tier
- Subscription only (monthly and yearly)
- Free trial supported where platform allows

Accounts:
- No mandatory accounts in v1
- Account system deferred to post v1

============================================================================ UI EVOLUTION RULES
UI is stable but not frozen.
Rules:
- Structural redesign is not allowed in v1
- Additive and reversible UI changes are allowed
- Visual variants (example white background) may be added if they do not destabilise layout or interaction
- Current color coded workout cards are a core engagement feature

============================================================================ RECENT WORK (FACTS, NOT PLANS)
Recent Work (2026-02-16) - v1.5 Layout, AdMob Integration & Console Compliance
✅ COMPLETED: Ad Banner moved to bottom (position:fixed bottom:0, perpetual-banner class).
✅ COMPLETED: FIXED CRITICAL BUG: Resolved newline escape issue (\\n -> \n) in offline-engine.js that prevented colored chip rendering.
✅ COMPLETED: Play Console Compliance: Updated Data Safety declarations for Email, User IDs, and Device IDs (AdMob).
✅ COMPLETED: Triple-Link Privacy: Synced Privacy Policy URL across Store Settings, Data Safety, and Account Deletion fields.
✅ COMPLETED: Google Sites Update: Established web-based account deletion portal for 2026 compliance.
✅ COMPLETED: AdMob Test Initialization: Loaded Adaptive Banner (Test ID: ca-app-pub-3940256099942544/6300978111).
✅ COMPLETED: Splash Screen Update: Integrated "SwimSum" branding text above dolphin imagery.
✅ COMPLETED: Extraction: Moved ~1855 lines of generation logic to public/offline-engine.js with window-object scoping.
✅ COMPLETED: Splash Screen Animation: Implemented high-position 'SwimSum' zoom with drop shadow, followed by sequential black subtitle fade-ins ('Choose pool', 'Swipe distance', 'Generate').
✅ COMPLETED: Splash Screen Branding: Added enlarged (80% bigger) generator dolphin as the final stage of the splash sequence.
✅ COMPLETED: UI Refresh: Replaced individual workout set reroll dolphins with spinning refresh icons for better UX clarity.
✅ COMPLETED: AdMob: Upgraded banner logic to 'Adaptive Banner' for improved vertical weight (min-height: 60px).
✅ COMPLETED: Splash Screen Overhaul: High-pos 'SwimSum' zoom, triple black-text subtitles (Choose, Swipe, Generate), and 80% enlarged dolphin finale.
✅ COMPLETED: Animation Timings: 400ms subtitle fades with 500ms pauses and 1500ms final hold.
✅ COMPLETED: Icon Refresh: Replaced all individual set reroll dolphins with spinning refresh icons for standard UX.
✅ COMPLETED: Adaptive Banner Prep: Ad container moved to bottom:0 (currently narrow, fix pending).
✅ COMPLETED: Splash Screen Finalization: Sequential title zoom, instruction fade-ins, and 80% enlarged dolphin finale.
✅ COMPLETED: UI Polish: Replaced set reroll dolphins with black, smooth-spinning refresh icons.
✅ COMPLETED: Layout: Centered all instruction text on the generator page for visual balance.

Recent Work (2026-02-22) - v1.8.2 CSS Geometry Lock & Signing Key Verification
[2026-02-22] Signing Key Verified: 'swimsum_alias' confirmed as the production alias. Version Code bumped for Google Play upload.
[2026-02-22] CSS Baseline Locked: 15px margins, 12px set-gaps, 24px scroll-offset confirmed stable.
[2026-02-22] Splash Screen: Migrated all splash text from fixed px to viewport-width (vw) units to prevent Android font-scaling overflow.
[2026-02-22] Scroll Margin: Tuned to `calc(env(safe-area-inset-top, 0px) + 14px)` for precise title bar clearance on S24+.
[2026-02-22] Version bump: 1.8.2 (versionCode 22).

Recent Work (2026-02-18) - v1.8 Release Candidate (Stability Update)
[2026-02-18] **v1.8 Release Candidate (Stability Update):**
    - AdMob: Finalized ADAPTIVE_BANNER with min-height: 60px to prevent layout shifts.
    - Splash Screen: Fixed scaling logic (Content 90% vs Background 100%) to prevent "floating box" visual glitches.
    - Background Engine: Resolved "Black Screen Flash" and "Solid Blue Overlay" regressions by enforcing strict transparency on body/html layers.
    - Visual Polish: Confirmed margins and background rendering are functioning correctly on target devices (S24+).
[2026-02-18] **Testing Status:**
    - 9/12 Testers acquired. Ready for next Internal/Closed track upload to trigger the 14-day clock.
[2026-02-19] **Business Verification:** Acquired official D-U-N-S number. Documented business credentials in project state to prepare for Google Play Console Organization conversion and future Merchant Profile / IAP setup.

Recent Work (2026-02-17) - v1.6 Internal Release Ready
✅ COMPLETED: Version bump to 1.6 (versionCode 6) to force Play Store propagation fix.
✅ COMPLETED: Splash/Auth branding: Locked in maroon 'WORKOUT GENERATOR' subtitle and 80% dolphin finale.
✅ COMPLETED: UI Polish: Verified centering for all instructions and black smooth-spinning refresh icons.
✅ COMPLETED: Navigation: Premium screen back button now an overlay (prevents splash re-trigger).
✅ COMPLETED: AdMob: Standardized Adaptive Banner height (min-height: 60px).

Recent Work (2026-02-14)
✅ COMPLETED: Android Build & Upload
- Generated Signed Bundle (Release v1.0, 6.16MB).
- Uploaded to Google Play Internal Testing.
- Resolved "Ad ID Declaration" blocking error.
- Documented "Nested Folder" build protocol.
🐛 BUG DETECTED: Android Visual Fidelity
- Mobile app looks "bloated" and lacks correct styling compared to web.
- Backgrounds not loading correctly in WebView.

Recent Work (2026-02-12)
✅ COMPLETED: Gesture System Stabilization (The "Big One")
- Infinite Recursion Fix: Removed circular call between finalSync() and rerenderWorkoutFromArray().
- Safety Timeout Removal: Deleted 5s freezer; recursion fix made it obsolete.
- Mobile Scroll Restoration: Changed touch-action from 'none' to 'pan-y' to allow vertical scrolling.
- Footer Persistence: Added forced opacity:1 in finalSync to prevent vanishing totals.
- Ghost Drop Fix: Updated handleGhostDrop to call finalSync() ensuring math updates after drag.
- PreventDefault Scoping: Scoped touchmove prevention to isLongPressDragging only.
- Pop-Back Fix: Split event handling (Touch for mobile, Pointer for desktop) to avoid pointercancel conflicts on S24.
- Double-Fire Prevention: Added dragCommitted flag.
- Pointercancel Safety: Added 200ms timeout net.
- RESULT: Drag/Drop works on S24 and Web. Footer persists. Math is accurate.

Recent Work (2026-02-11)
✅ COMPLETED: Swimmer Math Engine
- Implemented getSnappedDistance() to handle 27m/33m pools.
- All generation paths (V1, Template, Dynamic) now force even lengths.
- Added (N lengths) annotations to workout display.
- Total Footer now sums actual section distances for "Honest Total."
✅ COMPLETED: Restored native 3D Lock Icons for cross-platform visual parity.
✅ COMPLETED: Implemented ignoreNextClick logic to fix web auto-relock bug.
✅ COMPLETED: Corrected Ad Banner copy (Removed "Pro/Limited Time" references).
✅ COMPLETED: Implemented true double-buffered background cross-fades (no solid color flash).
✅ COMPLETED: Separated image cycling from solid color picking logic.
✅ COMPLETED: Replaced live-sort drag-and-drop with standard "Ghost Card" pattern to fix mobile "pop-back" bug.
✅ COMPLETED: Fixed mobile "Reset Jump" by disabling body scroll during drag.
✅ COMPLETED: Implemented "Cooldown Shield" -- deferred sets now move above the Cool down.
✅ COMPLETED: Fixed shadow-loss bug by forcing Boulder Shadows globally on cards.
✅ COMPLETED: Replaced lock emoji with SVG for cross-device consistency.
✅ COMPLETED: Fixed web auto-relock using unlockInProgress flag and stopImmediatePropagation.
✅ COMPLETED: Instruction card uses flex order to stay visible on load, moves below workout on generate.
✅ COMPLETED: Resolved web "auto-relock" bug using 500ms click-guard logic.
✅ COMPLETED: Stabilized Instruction Card position using min-height on results container.
✅ COMPLETED: Standardized Lock icon (Gold/Silver) across Web and Mobile.
✅ COMPLETED: Unified Premium/Ad-Removal navigation (direct link to /premium).
✅ COMPLETED: Fixed Pool Selection Highlights (Gold shadow/border).
✅ COMPLETED: Removed unintended boxes/shadows from Set Reroll dolphins.
✅ COMPLETED: Adjusted Workout Title width to 45% and prevented text wrapping.
✅ COMPLETED: Fixed top-row icons to be floating silhouettes with Drop icon.
✅ COMPLETED: Restored gold highlight for selected pool size.
✅ COMPLETED: Implemented smooth cross-fade for background images (no color flashing).
✅ COMPLETED: Fixed web lock behavior (no auto-relock on mouse-up) and enhanced 3D look.
✅ COMPLETED: Increased icon sizes in title row for better balance.
✅ COMPLETED: Replaced black ad banner with Navy-Blue high-performance gradient.
✅ COMPLETED: Centered ad text and fixed "Remove Ads" button clipping on S24 Plus.
✅ COMPLETED: Improved lock visibility: Gold/Flipped (Unlocked) vs Silver (Locked).
✅ COMPLETED: Redesigned Ad Banner to dark theme with bottom-right button placement.
✅ COMPLETED: Adjusted title icon sizes for better visual balance.
✅ COMPLETED: Fixed mobile unlock issue by isolating touch events and adding haptic feedback.
✅ COMPLETED: Replaced intrusive alerts with subtle Toast notifications.
✅ COMPLETED: Implemented Fixed "Frame" Ad Banner (75px depth) with pulse animation.
✅ COMPLETED: Fixed scroll-to-workout logic to account for header offset.
✅ COMPLETED: Standardized Title Bar height and icon vertical alignment.
✅ COMPLETED: Converted title bar icons to floating silhouettes (removed boxes/shadows).
✅ COMPLETED: Fixed 2s Lock-Hold for Web (added mouse event support).
✅ COMPLETED: Placed Lock on far left of workout title bar.
✅ COMPLETED: Implemented Edge-to-Edge Perpetual Banner (100vw).
✅ COMPLETED: Unified Eyedropper and Frame buttons with Boulder Shadows.
✅ COMPLETED: Added Interaction Lock with 2s hold-to-unlock.
✅ COMPLETED: Implemented 300ms long-press delay for gesture movement.
✅ COMPLETED: Implemented "Boulder Shadow" logic globally for heavy UI presence.
✅ COMPLETED: Replaced swatch row with unified Color Picker to prevent mobile crowding.
✅ COMPLETED: Enhanced Glass UI with layered shadows for better definition on light backgrounds.
✅ COMPLETED: Resized color swatches to 24px to match icon standard.
✅ COMPLETED: Implemented Perpetual (Sticky) Ad Banner.
✅ COMPLETED: Added Background Color Swatches (White, Black, Cream, Blue, Pink) to UI.
✅ COMPLETED: Lite Mode Implementation
- Added IS_LITE_MODE flag to client script.
- Added .lite-mode CSS class to hide Advanced Options row.
- Redesigned bottom bar to split Pool Info and Total Distance.
✅ REFACTORED: Help UI into collapsible "Show More" format.
✅ RESTORED: Original card spacing (0px margin).
✅ FIXED: Math Footer persistence during set deletion.
✅ FIXED: S24 "Pop-back" via e.preventDefault() scroll-lock.

Previous Work (2026-02-05)
✅ COMPLETED: Template-Only Generation System
- Created src/data/workoutTemplates.js with 27 real workout templates
- Mini templates: Quick Dip (500m), Express Swim (800m), Lunch Break (1000m), Quick Technique (1200m)
- Full templates: Easy Recovery, Sprint Prep, Threshold Builder, Endurance Builder, Volume Day, etc.
- findClosestTemplate() + scaleTemplate() for intelligent distance matching
- All algorithmic fallback REMOVED - 100% template-based generation
- No more "6x200 easy" warmups or "16x100 moderate" algorithmic patterns
✅ COMPLETED: Cooldown Logic Fix
- Uses 10% of total distance with sensible rounding
- Standard values: [100, 150, 200, 300, 400, 500]
- Max 16 reps limit enforced
✅ COMPLETED: 6000m+ Workout Support
- Extended warmup buckets to [200-800]
- Smart rep distances (100m/200m for longer sets)
- Prevents 30-rep validator limit violations
✅ FIXED: Template Metadata Bug
- "Workout total: Xm" was parsed as swim section
- Fixed by changing format to "Total Xm" (no colon)

Previous Work (2026-02-04)
Generator Analysis Complete:
- Critical flaw identified: produces unrealistic sets (e.g., 76x25 cooldown)
- Edit functionality broken: changes don't persist mathematically
- Mobile drag requires horizontal swipe first
- Animation issues: drops instant instead of 200ms smooth

Strategic Decisions Made:
- Complete template-based rebuild required
- No algorithmic set invention - real-world templates only
- New repository: SwimSum for clean development
- Scale goal: Thousands of validated swim sets

Current Implementation Status:
- Drag-and-drop functional with animation issues
- LocalStorage persistence implemented for user settings
- Dolphin button inconsistent (works on mobile, not web)
- All four gesture operations work but need polish
- Gesture editing math totals fixed (2026-02-03)
- Drag-to-delete: Updates math totals, preserves footer
- Drag-to-move: Updates math totals, preserves footer
- Edit modal: Updates math totals, preserves footer, edits correct set
- All operations use direct DOM updates instead of full re-render

Previous work (2026-01-30):
- Post generation validator added
- Exact target totals enforcement for standard pools
- Rep count realism caps and odd prime rep elimination
- Runtime crash fix in buildOneSetBodyShared

============================================================================ REBUILD & FEATURE STRATEGY (ACTIVE)
PHASE 1: FOUNDATION OVERHAUL (IMMEDIATE)
✅ COMPLETED: Real-World Template Library (27 templates, 500m-10000m)
- Sources: USA Swimming, Swim England, SwimSwam, coaching publications
- No algorithmic invention - only real patterns
- Continuous collection & validation pipeline
✅ COMPLETED: Generator-v2 Engine
- Template matching only, no algorithmic generation
- Outputs only coach-plausible, wall-safe sets
- Preserves current UI/gesture layer
⏳ PENDING: Fixed Edit System with Tabs
- Tabbed interface: Drill, Main, Kick, Pull, Warmup, Cooldown tabs
- Each tab has type-specific controls
- Edit changes persist mathematically

PHASE 2: SET EDITOR ENHANCEMENTS
⏳ PENDING: Drill Editor Tab
- Drill database with 30+ options with categorization (catch, cadence, turns, etc.)
- Custom drill text entry
- Drill selection matching interval count
⏳ PENDING: Main Set Editor Tab
- Pyramid configuration (100-200-300-200-100 patterns)
- Multiple interval types within single set (e.g., 12x100 + 8x50)
- Mixed effort levels within sets
⏳ PENDING: Effort Customization
- Build from X to Y (selectable start/end efforts)
- Alternate between A and B (selectable pairs)
- Gradient options across full spectrum (easy to full gas)
⏳ PENDING: Interval/Rest System
- CSS-based auto-calculation with 5/10 second rounding
- Rest-based alternative (20s rest, etc.)
- Send-off vs rest interval options
- Display intervals per set

PHASE 3: UI & GESTURE POLISH
⏳ PENDING: Animation Fixes
- Smooth 200ms drop animations (not instant)
- Cards flow into position, not teleport
- Other cards scroll up/down smoothly during reorder
✅ COMPLETED: Drag-and-Drop Module Extraction
- src/modules/dragDropManager.js (707 lines) extracted
- Contains all drag-and-drop/touch gesture logic
⏳ PENDING: Gesture Enhancements
- Phone: Two-finger spread to add set between cards
- Web: Alternative add-set method (plus button or gesture)
- Mobile drag without requiring horizontal swipe first
- Auto-scroll when dragging to off-screen positions
⏳ PENDING: Visual Customization
- Solid color square backgrounds (white, black, color picker)
- Variable image backgrounds from existing collection
- Consistent color coding per effort level

PHASE 4: ADVANCED FEATURES
⏳ PENDING: Regeneration Improvements
- Greater set variation (not repetitive patterns)
- Favorites/heart system for preferred sets
- Tag-based generation (endurance, sprint, technique focus)
⏳ PENDING: Pace/CSS Integration
- CSS input for pace-aware intervals
- Adjustments for different strokes (IM vs freestyle)
- Rest period customization per set
⏳ PENDING: Equipment Integration
- Fins, paddles, snorkel, pull buoy toggles
- Equipment-aware set suggestions
- Display equipment icons in sets
⏳ PENDING: Workout Management
- Save favorite workouts
- Upload workout results/times
- Progress tracking over time
- Season planning foundation

PHASE 5: LAUNCH PREPARATION
- Monetization Tiers Implementation
- App Store Readiness (iOS/Android wrappers)
- Performance Optimization
- Offline Functionality

============================================================================ TEMPLATE LIBRARY ARCHITECTURE
GOAL: Thousands of real-world swim sets, continuously growing collection.

VALIDATION PIPELINE:
- Source Verification (provenance tracking)
- Format Validation (automated parsing)
- Coach Review (realism check)
- Community Rating (ongoing quality)

COLLECTION SOURCES:
- USA Swimming published workouts
- Swim England Masters sessions
- SwimSwam "Workout of the Week" archive
- Swimming World Magazine workouts
- FINA competition training sets
- Coaching blog publications
- TrainingPeaks public workouts
- Academic swimming studies
- Community coach submissions

STORAGE STRUCTURE:
/swimgen2/src/template-library/
├── collector/             # Automated collection tools
├── sources/               # Raw collected sets by source
├── validated/             # Coach-approved sets
├── community/             # User-submitted sets (vetted)
└── index.js               # Consolidated access

**TEMPLATE FORMAT:**
```javascript
{
  "id": "usaswim-2024-001",
  "pattern": "8x50 kick on 1:00",
  "baseDistance": 400,
  "effort": "moderate",
  "section": "kick",
  "equipment": ["fins"],
  "stroke": "freestyle",
  "interval": "1:00",
  "variations": ["6x50", "10x50", "8x75"],
  "tags": ["kick", "ankle flexibility", "fins"],
  "source": "USA Swimming - Spring Training",
  "coachNotes": "Focus on steady kick tempo",
  "validation": {
    "coachApproved": true,
    "usageCount": 1250,
    "rating": 4.8
  }
}
QUALITY RULES:

Every template must be from real coaching practice

No mathematically impossible combinations

All sets must be "wall-safe" for common pool lengths

Effort progressions must follow coaching norms

Source attribution maintained

============================================================================ SET EDITOR SPECIFICATION
TABBED INTERFACE:

Drill Tab

Drill database with 30+ options

Categorization: catch, cadence, turns, breathing, etc.

Custom drill text entry

Drill-to-interval matching logic

Main Set Tab

Pyramid builder (ascend/descend/symmetric)

Mixed interval builder (e.g., 12x100 + 8x50)

Effort variation within set

Interval time calculation (CSS or rest-based)

Kick/Pull Tab

Equipment selection (fins, paddles, snorkel, buoy)

Stroke specification

Distance/rep configuration

Effort level setting

Warmup/Cooldown Tab

Progressive effort builder

Distance allocation

Stroke variety controls

EFFORT CUSTOMIZATION:

Build: Select start effort (easy) to end effort (full gas)

Alternate: Choose two efforts to alternate between

Gradient: Smooth progression across selected range

Fixed: Single effort level for entire set

INTERVAL SYSTEM:

CSS-based: Auto-calculates send-off times

Rest-based: Fixed rest periods between intervals

Hybrid: Base interval with adjustable rest

Display: Shows interval/rest per set in workout view

============================================================================ GESTURE & UI ENHANCEMENTS
PHONE-SPECIFIC GESTURES:

Two-finger spread/pinch: Add/remove set between cards

Long-press + drag: Current reorder functionality (needs mobile fix)

Horizontal swipe: Delete/defer (currently working)

WEB ALTERNATIVES:

Plus button between cards for add-set

Right-click context menu for set operations

Keyboard shortcuts for power users

ANIMATION STANDARDS:

All transitions: 200ms duration

Easing: cubic-bezier(0.2, 0.8, 0.3, 1)

Drop animation: Cards flow into place, not teleport

Scroll animation: Smooth auto-scroll during drag

VISUAL CUSTOMIZATION:

Solid background options: white, black, color picker

Image backgrounds: Curated swimming-related images

Consistent color coding per effort level

Icon system: Equipment, stroke, effort indicators

============================================================================ KNOWN BUGS & LIMITATIONS (MUST FIX)
CRITICAL BUGS (MUST FIX):
✅ FIXED: Generator creates unrealistic/never-used sets (e.g., 76x25 cooldown)

Now uses template-only generation with 27 real workout patterns
🔄 IN PROGRESS: Edit modal changes don't persist to workout mathematics
⏳ PENDING: Mobile vertical drag fails without horizontal swipe first
✅ FIXED: Set regeneration produces limited variation (same patterns)

Template library provides variety via findClosestTemplate()

MAJOR ISSUES:

Drop animation instant (not 200ms smooth)

No auto-scroll during drag to off-screen positions

Pace/CSS system not implemented

Drill selection missing (no database)

Effort customization limited (no build/alternate/gradient options)

Tabbed editor missing (single interface for all set types)

UI/DESIGN ISSUES:

Dolphin button inconsistent (web vs mobile)

Animation timing inconsistencies

Background customization limited

Phone-specific gestures missing (two-finger spread)

No visual indication for add-set functionality on web

GENERATOR REALISM ISSUES:
✅ FIXED: Produces sets that would never be used in real coaching
✅ FIXED: Limited variation in set patterns
✅ FIXED: No connection to real-world swimming practice
✅ FIXED: Mathematical correctness but coaching implausibility

All issues resolved via template-only generation (Phase 5 complete)

============================================================================ TESTING AND TOOLING
Automated smoke test script: scripts/gen_smoke_test.js
Smoke test suites:

Suite A: crash and retry hardening

Suite B: rep count sanity (25m)

Suite C: intensity detection (TODO)

Suite D: 25yd parity

Manual testing is authoritative. Short distance manual testing is mandatory:

25m at 1000, 1500, 2000

Custom pool at 2000

New Testing Requirements:

Template validation testing

Coach plausibility checks

Wall-safety verification

Edit persistence testing

============================================================================ RESEARCH PIPELINE
PURPOSE: Collect and analyze real swim workouts to build template library.
LOCATION: /research/ directory (separate from working app)

STRUCTURE:
research/
├── collectors/
│   ├── usms-collector.js
│   ├── coach-sites-collector.js
│   └── public-databases-collector.js
├── analysis/
│   ├── pattern-finder.js
│   └── popularity-ranker.js
├── outputs/
│   ├── top-500-patterns.json
│   └── pattern-insights.md
└── README.md

RULES:

Research tools run SEPARATELY from working app

Do NOT modify index.js or app code

Research findings inform gradual improvements

All collected workouts must have source attribution

============================================================================ IDEA PARKING LOT (NOT SCHEDULED, NOT COMMITTED)
Rule: Idea Capture Responsibility
If an idea is discussed and not written here, it is considered lost.
Items below are not tasks and must not be implemented without promotion.

Template driven realism:

Shift from generate then ban to template first generation

Large corpus of coach derived set shapes

Templates tagged by intent, stroke mix, energy system

User customisation and editing:

Drag to reorder sections

Resize sections by dragging edges

Swipe to remove sections

Lock sections to preserve them across rerolls

Poolside interaction lock mode to prevent accidental edits

Manual distance rebalancing when resizing sections

Workout total may exceed or fall below slider after edits

Optional lock to preserve total and redistribute

Insert new section between existing blocks

Visual themes:

White background and monochrome modes

Colour banding instead of full card backgrounds

User selectable themes

Pacing and timing:

Floating pace clock overlay

Standalone pace clock app

Interval based and rest based views

Estimated workout duration

Video and feedback systems:

Drill demonstration videos linked from sets

Timestamped video references

Delayed playback poolside mirror system

Underwater and multi angle feedback concepts

Hardware and accessories:

Waterproof phone cases with built in stands

Poolside mounting concepts

Potential partnerships

Accounts and data:

Optional user accounts

Saved preferences

Workout history

Email capture

AI and higher tiers:

AI as constrained editor

AI generated coaching notes

Optionally suggest coach rationale per set

Full AI generation only after validator maturity

============================================================================ GESTURE EDITING STATUS
Gesture Editing Status

Swipe right: Delete set

Swipe left: Defer to next workout

Double-tap: Edit set (with color-matched modal)

Long-press (300ms) + drag: Reorder sets

All gestures work together with conflict prevention

============================================================================ COMMENTS & FEEDBACK
Team Notes
[11/2023] JK: Fixed template parsing bugs - cool down no longer shows "Total Xm", odd/even sets now display correctly
[11/2023] JK: Working on template randomization to prevent identical 2000m workouts
[02/2026] JK: Android pipeline established. Beware "inner folder" trap. Visual parity is priority.

User Feedback
[To be implemented]

============================================================================ END OF DOCUMENT
Milestone: Version 25 (1.0.3) built for production upload. Signing alias 'swimsum_alias' confirmed.

## Milestones & Native Integration (Feb 2026)

- Successfully bridged Web code to Native Android via Capacitor.
- Established Wireless ADB connectivity via Mobile Hotspot + USB Handshake (Port 5555) to bypass coworking network isolation.
- Pivoted Google Auth from Web-only to Native Android implementation; pending SHA-1 extraction via Gradle for Firebase registration.

## What's Coming Up / Active Focus (Feb 2026)

- **UI fixes (onboarding & layout):** Onboarding cards now animate in order (Step 1 green, Step 2 yellow, Step 3 orange, Step 4 red) and then live as a static 4‑card stack under the generator. Next tweaks are mostly polish: timing/verbiage adjustments and any additional spacing changes from real‑device testing.
- **Help redesign (DONE for v1 Lite):** Heavy splash replaced with a logo fly‑in and in‑context onboarding; persistent **?** help button in the header replays the animated sequence on demand. No separate fullscreen “coach mark” overlay any more.
- **Ad polish:** Make ads a bit more intrusive for testing; define placement and behaviour, then wire the production AdMob IDs and remove the fake bottom banner text once `remove_ads` subscription is live.
- **Advanced options & math tweaks:** After this closed‑testing build stabilises, return to the underlying workout math and advanced options (stroke filters, equipment flags, send‑off estimates) for a v1.1+ iteration – the current Lite build is functional and shippable, but the sets and options still need refinement.
- **Premium features (behind flags):** Continue development of premium features (custom pool sizes, equipment, editing sets, etc.) but keep them **switched off** until launch strategy is set. No pruning of existing notes; all 1000+ lines retained.

## Auth Iterations & Lessons (Feb 2026)

- **Web SDK in WebView is a dead end for Google sign-in.** Using Firebase Web SDK (`signInWithPopup` / `signInWithRedirect`) inside the Capacitor WebView consistently led to blank Firebase pages and “missing initial state” errors; the correct pattern is **native Firebase Auth + a thin JS bridge (AuthBridge)**.
- **Firebase wiring matters: SHA‑1 + `google-services.json` + `default_web_client_id`.** Google sign-in only works reliably after:
  - Adding the debug SHA‑1 fingerprint via Gradle `signingReport` into Firebase Project Settings.
  - Downloading and committing the updated `android/app/google-services.json`.
  - Adding the Web client ID from `google-services.json` as `@string/default_web_client_id` in `android/app/src/main/res/values/strings.xml` so `GoogleSignInOptions.requestIdToken(...)` matches the project.
- **Email+password sign-in now sends verification emails.** Email+password accounts are created via native Firebase Auth and verification links are sent successfully; product decision still pending on whether unverified users may continue to generate workouts or must verify first.
- **Splash and boot timing are tightly coupled to auth.** Changing when scripts load (Firebase, offline-engine, auth gate) can freeze the blue splash or skip animations. Long‑term pattern is to keep native splash minimal, hide it early, and rely on in‑app logo + help overlay instead of a heavy blocking splash sequence.
- **Dated log:** 2026‑02‑26 – Full‑day auth debugging: retired Web SDK popup/redirect in WebView, adopted native AuthBridge path, added SHA‑1 + updated `google-services.json`, confirmed Google sign-in on device, implemented email verification flow; remaining work is stricter gating on `emailVerified` and hardening splash/auth timing.
- **Dated log:** 2026‑02‑27 – Hardened email gating on both native and web paths so email+password users cannot reach the generator until `emailVerified === true`, added a password visibility toggle in the auth gate, and confirmed that deleting a Google user in Firebase does not revoke Google account consent (Google sign-in continues to recreate the user once the device account has approved the app). Also removed the heavy blocking splash in favour of a lightweight logo fly‑in plus a 4‑card onboarding sequence that auto‑plays twice on first launches and then remains as a static “How to use SwimSum” stack under the generator, with a `?` help button to replay the animation.

## Next 7 Days – Launch Checklist (Feb 2026)

- ✅ **Google sign-in:** Keep validating native AuthBridge Google sign-in on real devices (internal testers) and ensure it behaves the same in closed testing builds from Play Console.
- ✅ **Email gating:** Email+password users can no longer reach the generator until `emailVerified === true`; both native AuthBridge and Firebase Web fallback paths now (1) send or re-send verification emails, (2) sign the user out, and (3) show “check your inbox and spam folder, then sign in again” copy before returning them to the auth gate.
- ⏳ **Ads:** Confirm AdMob test banners render correctly in debug and that production AdMob IDs and Consent/Privacy configuration are ready for release; verify banners appear in closed testing builds without layout regressions.
- ⏳ **Closed testing build:** Push a fresh closed‑testing release with the final sign‑in behaviour and capture tester feedback (especially around auth friction, onboarding clarity, lock‑button behaviour, icon appearance, and ad intrusiveness). **Current status:** hardened‑auth build 1.0.7 (versionCode 29) with new onboarding, lock button, and SwimSum S‑logo launcher icon has been prepared and submitted to the closed testing track; review and tester feedback are pending.
- ⏳ **Marketing hooks & site:** Ensure privacy policy and supporting pages are live at `https://swimsum.com` (backed by Firebase Hosting), and sketch first‑pass plan for using Firebase Auth emails (with explicit consent) to announce future premium tiers and content (e.g., drill videos, technique tips).

### Version and release (2026-03-11 – Billing polish & gradients)
- **Remove Ads entitlement (banner tray):** `applyRemoveAdsState` in `index.js` now hides the entire bottom banner tray (`#adBanner`) whenever `hasRemoveAds === true`, regardless of `IS_PRODUCTION_BUILD`. After a successful `remove_ads_yearly` subscription purchase (including test-card purchases via license testing), both the interstitial and the bottom banner disappear on device builds from Play tracks.
- **Gradient blend for multi-effort cards:** In `gradientStyleForZones`, the **striped** path (when `isZoneStriped` is true) was rewritten so multi-effort cards get **distinct colour bands with soft blend only at boundaries**. Stops are placed at 0%, at each zone boundary ±8% (blend zone), and 100%; no more wide overlapping bands, so colours stay definitive (e.g. blue, yellow, orange) and blend only where they meet. The non-striped (stepped) path is unchanged.

### Handoff note – 2026-03-11 (Open test prep, connect phone, iOS)
- **Connect phone (wireless):** User provides IP:port (e.g. `192.168.137.191:38337`). Run **only** `npm run connect-phone -- <IP>:<port>` from project root. Do not suggest QR/code pairing or raw `adb` unless the script fails; the script uses the stored adb path in `connect-phone.ps1`. Phone and PC must be on the same hotspot.
- **Play Console:** Production access granted. License testing is **account-level**: leave the app (back to main Play Console), then **Settings → License testing**, add tester Gmail; test-card purchases then work on closed/open test builds. Local Android Studio (debug) builds do **not** see Play entitlements (different signature)—banner/ads removal and billing must be verified on a **Play-signed build** from the test track.
- **Billing + gradients (this session):** Banner tray now hides when `hasRemoveAds` is true (all builds). Striped multi-effort gradients use distinct bands with ~8% blend at boundaries. Next: build new AAB with these changes, upload to closed or open test, install from Play Store, re-test test-card purchase (interstitial + banner should both disappear) and gradient appearance.
- **Open test / production:** Plan is open test next (share opt-in link with friends), then production when satisfied. No mandatory 14-day open test; can go straight to production if desired.
- **iOS / Apple:** Organization enrollment in progress (creativearts.com, D-U-N-S 234466045). When approved: cloud Mac or 2018+ Mac mini for Xcode; same repo, `npx cap add ios` / `npx cap sync ios` on Mac; single codebase for Android + iOS.

## Monetisation & Ad Strategy (Feb 2026)

- **AdMob configuration (current):**
  - AdMob App ID: `ca-app-pub-8975918152073391~1783741253`.
  - Banner Ad Unit ID (bottom Adaptive Banner): `ca-app-pub-8975918152073391/1711443276`.
  - Interstitial Ad Unit ID (welcome full‑screen ad): `ca-app-pub-8975918152073391/7973599297`.
  - Code currently uses Google’s test banner ID; production IDs and consent prompts will be wired in a subsequent iteration.
- **Remove-ads subscription (planned):**
  - Single paid tier for launch: **“Remove ads”** – **$10/year** (or regional equivalent, e.g. ~£7.50/year via Play Console). Optional monthly option to be decided (e.g. ~$1/month or £0.99/month if offered).
  - Behaviour: paying users see no bottom banner and no welcome interstitial; free users see an Adaptive Banner at the bottom plus a one-time “welcome” interstitial per session (only after the onboarding tutorial has played through at least twice).
  - UI entry points:
    - Small inline prompt near the banner (e.g. “Ads keep SwimSum free. Remove ads to support development.”).
    - A clearer option in a settings/help area (“Remove ads”) that explains the benefit and that purchases help fund SwimSum’s ongoing development.
- **Payments / merchant account status:**
  - Google Payments merchant profile created as an Individual, using personal legal details with public branding under the SwimSum / Creative Arts umbrella.
  - Revolut Pro bank account connected for payouts; micro-deposit verification is in progress and must complete before in‑app products can be created in Play Console.
  - Once verification is complete, Play Console will allow creation of the `remove_ads_yearly` subscription product, which will then be wired to a `hasRemoveAds` entitlement flag inside the app via Google Play Billing.

- **Update – 2026-03-02 (Ad flags wired):**
  - `TEST_ADS` flag added in `index.js`: when `TEST_ADS` is true, the app uses Google’s official AdMob test IDs for both the bottom Adaptive Banner and the one-time welcome interstitial; when false, it uses the production banner/interstitial IDs listed above.
  - Current v1 Lite ad layout on device: bottom Adaptive Banner pinned to `bottom:0` inside the perpetual bottom tray for free users, plus an optional “welcome” interstitial that may show at most once per app session (guarded by `ENABLE_INTERSTITIAL`).
  - A `hasRemoveAds` entitlement flag now exists in the client UI and is persisted via `localStorage` (`swimsum_has_remove_ads`) for manual toggling during development; real Play Billing is not wired yet, so remove‑ads remains a manual/dev-only entitlement for this build.
- **Update – 2026-03-02 (Interstitial after tutorial):**
  - Welcome interstitial is now gated on `swimsum_onboarding_runs >= 2`: it does not show on the first two app opens while the onboarding animation plays through. From the third session onward, the interstitial may show once per session (so the tutorial is never covered by the full-page ad).

## Launcher Icon & Branding Workflow (Feb 2026)

This section captures the **exact steps** for updating the SwimSum launcher icon and keeping the look consistent in future chats. Do **not** abridge or delete; only append.

### Current state

- The launcher icon now uses the **blue S‑shaped SwimSum logo** as the foreground.
- The icon is generated via Android Studio’s **Asset Studio → Image Asset → Launcher Icons (Adaptive and Legacy)**.
- Different Android launchers apply their own mask (circle / squircle / rounded square), so slight differences in outer shape between devices are expected.

### Preparing the logo artwork

- **Goal:** a square PNG where the S fills most of the canvas and the corners are transparent (or a solid colour we actually want), **no accidental green grid or layout guides**.
- Easiest path on Windows without paid tools:
  - Use **Paint 3D** or an online editor like **Photopea** to:
    - Open te source logo.
    - Remove any unwanted background (magic select / magic wand → delete) so only the S and its intended backdrop remain.
    - Ensure the canvas is square (e.g. 1024×1024) and the S is centered.
    - Export as **PNG** with transparency enabled.

### Asset Studio steps (Android Studio)

1. In Android Studio, open the inner `android` project.
2. From the `app` module, choose **File → New → Image Asset**.
3. **Icon Type:** `Launcher Icons (Adaptive and Legacy)`.
4. **Foreground Layer tab:**
   - Asset type: **Image**.
   - Source: the cleaned PNG logo (no green grid).
   - Turn **Trim = Yes**.
   - Adjust **Resize** so the S nearly touches the safe‑zone guides without clipping.
5. **Background Layer tab:**
   - Asset type: **Color** (not Image).
   - Choose a solid colour that fits SwimSum’s palette (e.g. a light or dark blue), or white if desired.
   - Avoid using an image here unless we explicitly want a pattern; this is where the accidental green grid came from.
6. Click **Next → Finish** to overwrite `ic_launcher` and `ic_launcher_round` in the `mipmap-*` folders.
7. Rebuild and reinstall the app (or generate a new signed bundle) to see the updated icon on device.

### Notes / Gotchas

- Android always applies the system mask to adaptive icons – we **cannot** have a free‑floating S with the phone wallpaper directly behind it. There will always be some platform‑defined shape.
- If the S looks too small or has a thick border:
  - Re‑open **Image Asset**, go to **Foreground Layer**, and move the **Resize** slider up so the S fills more of the safe zone.
  - Ensure we are not feeding Asset Studio a logo that already contains its own rounded‑square border plus additional padding.
