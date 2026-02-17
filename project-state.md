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
⏳ PENDING: Program Email Collection Logic & Firebase Integration
⏳ PENDING: Implement Adaptive AdMob Banner height (Fix 'narrow' look).
⏳ PENDING: Integrated Auth Flow: Google Sign-in / Email account creation gate.
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

Last updated: 2026-02-17

Status: Active Development - v1.6 Internal Release Ready (2026-02-17)

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