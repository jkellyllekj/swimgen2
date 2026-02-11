============================================================================
APP STORE RELEASE STRATEGY
============================================================================
DECISION: Release "SwimGen2 Lite" to App Store
Goal: Get a functional basic version to the App Store quickly
Approach: Hide advanced features, basic ad-supported model
Future: Collect emails for update notifications, premium features in updates
Code Strategy: Keep everything in same project, copy original math for reference

CURRENT READY FEATURES (V1.0 Base):

Template-based generation with 27 real workout templates

Randomization working (no identical workouts)

Core bug fixes completed (cool down, odd/even parsing)

Project board with automated sync

Comments & Feedback column added for team collaboration

IMMEDIATE PRE-LAUNCH TASKS (V1.0):

HIGH PRIORITY:

✅ COMPLETED: Fix pool length math (Swimmer Math Engine implemented 2026-02-11)

✅ COMPLETED: Hide advanced options & set editor (Lite Mode Toggle implemented 2026-02-11)

Add ad placement framework - Basic banner/interstitial ads

Add email signup collection - For update notifications

Comprehensive testing - All distances (500-10000m), all pool lengths

MEDIUM PRIORITY:

Add "Idea parking" column to board for 8 pending idea items

Update sync script to recognize new board columns

POST-LAUNCH ENHANCEMENTS (V1.1+):

Premium tier features (advanced editing, more templates)

Interval and pace calculations

Expanded template library (100+ templates)

Mobile drag gesture improvements

Social sharing features

Restore pool length math for all pool sizes

============================================================================

Project: Swim Workout Generator
Working title(s): SwimDice / SetRoll / PacePalette (TBD)

Last updated: 2026-02-11

Status: Active Development - Lite Mode Finalization

============================================================================ READ THIS FIRST
This file is the single source of truth for the project.

If there is any uncertainty about:

what we are working on

what phase we are in

what is allowed or frozen

how to resume after a break

Then STOP and read this file in full before doing anything else.

Chat memory is disposable. This file is not.

============================================================================ CURRENT BUGS (ACTIVE)
🐛 BUG: Template metadata appearing as swim sets (FIXED 2026-02-05)

"Workout total: Xm" was parsed as a section due to colon format

Fixed by changing to "Total Xm" (no colon)

============================================================================ ACTIVE DEVELOPMENT - SWIMGEN2
Repository: https://github.com/jkellyllekj/swimgen2

Status: Template-based rebuild preserving UI layer

Core Principle: No algorithmic set invention - real-world templates only

Scale Goal: Thousands of validated swim sets continuously growing

Current Focus: Lite Mode launch & Swimmer Math Stability

============================================================================ INSTRUCTION STYLE RULE
The assistant must always provide explicit, start to finish instructions.

This means:

Always specify the exact file name(s)

Always specify exactly where to change the file (section or heading and position)

Always provide copy and paste ready text blocks for additions or replacements

Do not say "add this somewhere" or "put this in the project state" without exact placement

Planning happens in chat. The agent is execution only.

Agent message format rule (from WORKING-METHOD-REPLIT.md):

All instructions sent to the agent must be enclosed in a single code block

Begin with "START MESSAGE TO AGENT"

End with "FINISH MESSAGE TO AGENT"

Contain all actions, tests, and reporting requirements inline

Never rely on prose outside the code block

============================================================================ PROJECT INTENT
Swim Workout Generator (SwimGen) is intended to be a real, shippable consumer app, not a demo.

The goal is:

A usable, attractive, coach plausible swim workout generator

Deployed first as a web app

Then wrapped and shipped to the iOS App Store

With monetisation from day one

Without architectural dead ends that require a rebuild

Long term evolution is expected (years), but v1 must stand on its own.

============================================================================ CURRENT PHASE
Phase: Template-Based Rebuild Foundation & Lite Mode Launch

Primary goals:

Replace algorithmic generator with real-world template library

Fix critical bugs (edit persistence, unrealistic sets)

Preserve and enhance current UI/gesture functionality

Build scalable architecture for thousands of swim sets

Constraints:

Generator uses ONLY real-world templates (no algorithmic invention)

Current UI/gestures must be preserved during migration

All sets must be coach-plausible and wall-safe

Template collection is continuous process

Phase is complete when:

Generator uses validated template library with 1000+ real sets

Edit functionality works with tabbed interface

All critical bugs are resolved

Architecture supports continuous template growth

============================================================================ ARCHITECTURE OVERVIEW (MIGRATION PATH)
CURRENT (LITE RELEASE READY):

Monolithic index.js with Template-Only generation

Swimmer Math Logic: Correct snapping for custom pools (27m/33m)

Feature Flag: IS_LITE_MODE toggle for App Store release

Working UI/gestures with animation issues

Broken edit persistence (Locked for Lite Mode)

TARGET (SWIMGEN2):


/swimgen2/
├── legacy/                    \# Original working code
├── src/
│   ├── generator-v2.js        \# Template-based engine
│   ├── template-library/      \# Real-world sets (thousands)
│   ├── editor/                \# Tabbed editor system
│   │   ├── drill-editor.js
│   │   ├── mainset-editor.js
│   │   └── effort-builder.js
│   ├── pace-calculator.js     \# CSS/interval mathematics
│   └── workout-model.js       \# Data structures
├── ui/                        \# Preserved & enhanced UI
│   ├── gestures.js            \# Enhanced with phone gestures
│   ├── renderer.js            \# Animation fixes
│   ├── modals.js              \# Tabbed edit modal
│   └── background-options.js
└── business/
├── tiers.js               \# Free/Premium/Pro gating
├── ads.js                 \# Ad integration for free tier
└── storage.js             \# Workout history/favorites

**MIGRATION STRATEGY:**

1.  Build generator-v2 alongside legacy system
2.  Compare outputs for realism validation
3.  Gradually replace algorithmic generation
4.  Preserve all UI/gesture functionality
5.  Cutover when template library \> 1000 validated sets
============================================================================ PAUSE IN ACTION AND NEW CHAT HANDOVER
When a Pause In Action is declared:

The current chat is disposable

Continuity must be recovered from this file

No prior chat context should be assumed

Canonical raw links:
PROJECT: SwimGen2
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/project-state.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/WORKING-METHOD-REPLIT.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/COACH_DESIGN_NOTES.md
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/index.js
https://raw.githubusercontent.com/jkellyllekj/swimgen2/main/styles.css

Rules:

Assistant cannot browse repo folders

Only exact file URLs are readable

After any logic change, index.js must be re linked (raw link is sufficient)

Pinning rule:

For precise debugging, pin index.js to a commit permalink when investigating a bug so the file cannot change under us.

============================================================================ WORKOUT STRUCTURE RULES
Standard section order:

Warm up

Build

Kick

Drill

Main

Cool down

Rules:

Warm up and cool down are always low effort

Build is warm up part two

Main is primary intensity

No section may end off wall

Short workout rule (critical):

1000m workouts must not be over constrained by forcing all sections

The generator must avoid impossible constraint combinations at short totals

Section gating (current intent):

Below 1200m: Drill may be omitted

Below 1000m: Kick and Drill may be omitted

At 1800m and above: full structure is expected

This gating exists to prevent constraint satisfaction failure at short totals.

============================================================================ DISTANCE AND POOL RULES
All sets must end on the same wall they start

Set distances must be divisible by 2 times pool length (wall safe)

Even Length Requirement: For any distance > 1 length, the count must be even (2, 4, 6, etc.) to ensure wall return.

Honest Totals: Total distance is the sum of actual snapped distances, not the target distance.

Custom pool lengths (example 33m) are first class citizens

For standard pools (25m, 50m, 25yd) totals should match the slider exactly

============================================================================ EFFORT RULES
Warm up and Cool down: blue or green only

Build: progressive (may touch orange, rarely red)

Drill: usually blue or green

Kick: may include strong or hard

Main: yellow, orange, red expected

Variety intent:

About 60 to 70 percent of workouts include at least one red exposure

Gradients should not be overused

Hard efforts should sometimes stand alone

============================================================================ EDIT MODAL COLOR STANDARDS
All edit modal effort selectors must use these exact colors:

Easy: #1e90ff (blue)

Moderate: #2ecc71 (green)

Strong: #f39c12 (orange)

Hard: #f1c40f (yellow/cream)

Full Gas: #e74c3c (red)

============================================================================ LOCKED INVARIANTS
Generator uses real-world templates ONLY (no algorithmic invention)

Template library contains thousands of continuously growing sets

Swimmer Math: All distances snapped to even multiples of pool length.

Feature Flag: IS_LITE_MODE controls UI complexity for App Store.

Edit operations persist mathematically with tabbed interface

All sets are coach-plausible and wall-safe

Current UI/gestures preserved and enhanced during migration

Phone and web have appropriate gesture sets for their platforms

Animations are smooth 200ms transitions, not instant

Effort levels follow standard color coding

Intervals calculate correctly for CSS or rest-based timing

index.js is runtime authority

Generator never returns null or fails silently

Reroll must always produce a valid workout

============================================================================ PRODUCT TIERS AND MONETISATION (v1)
SwimGen uses a subscription based model. Generator rerolls are deterministic and local. Monetisation is not tied to generation count.

Free Tier (Ad-supported):

Basic template-based generation

Standard pool lengths (25m, 50m, 25yd)

Fixed set structures (no editing)

Persistent banner ad + light interstitial ads

Lite Mode Active: UI simplified (IS_LITE_MODE = true)

Premium Tier (Subscription):

Removes all ads

Allows custom pool lengths

Allows set resizing and editing

Basic pace suggestions

Equipment toggles (fins, paddles, snorkel, pull buoy)

Pro Tier (Subscription):

Includes all Premium features

Adds full pace/CSS integration with interval calculations

Advanced effort customization (builds, pyramids, alternations)

Drill database access (30+ drills with categorization)

Workout history and favorites system

Advanced control over effort and stroke bias

Season planning foundation

Notes:

No standalone ad removal only tier

Subscription only (monthly and yearly)

Free trial supported where platform allows

Accounts:

No mandatory accounts in v1

Account system deferred to post v1

============================================================================ UI EVOLUTION RULES
UI is stable but not frozen.

Rules:

Structural redesign is not allowed in v1

Additive and reversible UI changes are allowed

Visual variants (example white background) may be added if they do not destabilise layout or interaction

Current color coded workout cards are a core engagement feature

============================================================================ RECENT WORK (FACTS, NOT PLANS)
Recent Work (2026-02-11)
✅ COMPLETED: Swimmer Math Engine

Implemented getSnappedDistance() to handle 27m/33m pools.

All generation paths (V1, Template, Dynamic) now force even lengths.

Added (N lengths) annotations to workout display.

Total Footer now sums actual section distances for "Honest Total."

✅ COMPLETED: Enhanced Glass UI with layered shadows for better definition on light backgrounds.

✅ COMPLETED: Resized color swatches to 24px to match icon standard.

✅ COMPLETED: Implemented Perpetual (Sticky) Ad Banner.

✅ COMPLETED: Added Background Color Swatches (White, Black, Cream, Blue, Pink) to UI.

✅ COMPLETED: Lite Mode Implementation

Added IS_LITE_MODE flag to client script.

Added .lite-mode CSS class to hide Advanced Options row.

Redesigned bottom bar to split Pool Info and Total Distance.

Previous Work (2026-02-05)
✅ COMPLETED: Template-Only Generation System

Created src/data/workoutTemplates.js with 27 real workout templates

Mini templates: Quick Dip (500m), Express Swim (800m), Lunch Break (1000m), Quick Technique (1200m)

Full templates: Easy Recovery, Sprint Prep, Threshold Builder, Endurance Builder, Volume Day, etc.

findClosestTemplate() + scaleTemplate() for intelligent distance matching

All algorithmic fallback REMOVED - 100% template-based generation

No more "6x200 easy" warmups or "16x100 moderate" algorithmic patterns

✅ COMPLETED: Cooldown Logic Fix

Uses 10% of total distance with sensible rounding

Standard values: [100, 150, 200, 300, 400, 500]

Max 16 reps limit enforced

✅ COMPLETED: 6000m+ Workout Support

Extended warmup buckets to [200-800]

Smart rep distances (100m/200m for longer sets)

Prevents 30-rep validator limit violations

✅ FIXED: Template Metadata Bug

"Workout total: Xm" was parsed as swim section

Fixed by changing format to "Total Xm" (no colon)

Previous Work (2026-02-04)
Generator Analysis Complete:

Critical flaw identified: produces unrealistic sets (e.g., 76x25 cooldown)

Edit functionality broken: changes don't persist mathematically

Mobile drag requires horizontal swipe first

Animation issues: drops instant instead of 200ms smooth

Strategic Decisions Made:

Complete template-based rebuild required

No algorithmic set invention - real-world templates only

New repository: SwimGen2 for clean development

Scale goal: Thousands of validated swim sets

Current Implementation Status:

Drag-and-drop functional with animation issues

LocalStorage persistence implemented for user settings

Dolphin button inconsistent (works on mobile, not web)

All four gesture operations work but need polish

Gesture editing math totals fixed (2026-02-03)

Drag-to-delete: Updates math totals, preserves footer

Drag-to-move: Updates math totals, preserves footer

Edit modal: Updates math totals, preserves footer, edits correct set

All operations use direct DOM updates instead of full re-render

Previous work (2026-01-30):

Post generation validator added

Exact target totals enforcement for standard pools

Rep count realism caps and odd prime rep elimination

Runtime crash fix in buildOneSetBodyShared

============================================================================ REBUILD & FEATURE STRATEGY (ACTIVE)
PHASE 1: FOUNDATION OVERHAUL (IMMEDIATE)

✅ COMPLETED: Real-World Template Library (27 templates, 500m-10000m)

Sources: USA Swimming, Swim England, SwimSwam, coaching publications

No algorithmic invention - only real patterns

Continuous collection & validation pipeline

✅ COMPLETED: Generator-v2 Engine

Template matching only, no algorithmic generation

Outputs only coach-plausible, wall-safe sets

Preserves current UI/gesture layer

⏳ PENDING: Fixed Edit System with Tabs

Tabbed interface: Drill, Main, Kick, Pull, Warmup, Cooldown tabs

Each tab has type-specific controls

Edit changes persist mathematically

PHASE 2: SET EDITOR ENHANCEMENTS

⏳ PENDING: Drill Editor Tab

Database of 30+ drills with categorization (catch, cadence, turns, etc.)

Custom drill entry field

Drill selection matching interval count

⏳ PENDING: Main Set Editor Tab

Pyramid configuration (100-200-300-200-100 patterns)

Multiple interval types within single set (e.g., 12x100 + 8x50)

Mixed effort levels within sets

⏳ PENDING: Effort Customization

Build from X to Y (selectable start/end efforts)

Alternate between A and B (selectable pairs)

Gradient options across full spectrum (easy to full gas)

⏳ PENDING: Interval/Rest System

CSS-based auto-calculation with 5/10 second rounding

Rest-based alternative (20s rest, etc.)

Send-off vs rest interval options

Display intervals per set

PHASE 3: UI & GESTURE POLISH

⏳ PENDING: Animation Fixes

Smooth 200ms drop animations (not instant)

Cards flow into position, not teleport

Other cards scroll up/down smoothly during reorder

✅ COMPLETED: Drag-and-Drop Module Extraction

src/modules/dragDropManager.js (707 lines) extracted

Contains all drag-and-drop/touch gesture logic

⏳ PENDING: Gesture Enhancements

Phone: Two-finger spread to add set between cards

Web: Alternative add-set method (plus button or gesture)

Mobile drag without requiring horizontal swipe first

Auto-scroll when dragging to off-screen positions

⏳ PENDING: Visual Customization

Solid color square backgrounds (white, black, color picker)

Variable image backgrounds from existing collection

Consistent color coding per effort level

PHASE 4: ADVANCED FEATURES

⏳ PENDING: Regeneration Improvements

Greater set variation (not repetitive patterns)

Favorites/heart system for preferred sets

Tag-based generation (endurance, sprint, technique focus)

⏳ PENDING: Pace/CSS Integration

CSS input for pace-aware intervals

Adjustments for different strokes (IM vs freestyle)

Rest period customization per set

⏳ PENDING: Equipment Integration

Fins, paddles, snorkel, pull buoy toggles

Equipment-aware set suggestions

Display equipment icons in sets

⏳ PENDING: Workout Management

Save favorite workouts

Upload workout results/times

Progress tracking over time

Season planning foundation

PHASE 5: LAUNCH PREPARATION

Monetization Tiers Implementation

App Store Readiness (iOS/Android wrappers)

Performance Optimization

Offline Functionality

============================================================================ TEMPLATE LIBRARY ARCHITECTURE
GOAL: Thousands of real-world swim sets, continuously growing collection.

VALIDATION PIPELINE:

Source Verification (provenance tracking)

Format Validation (automated parsing)

Coach Review (realism check)

Community Rating (ongoing quality)

COLLECTION SOURCES:

USA Swimming published workouts

Swim England Masters sessions

SwimSwam "Workout of the Week" archive

Swimming World Magazine workouts

FINA competition training sets

Coaching blog publications

TrainingPeaks public workouts

Academic swimming studies

Community coach submissions

STORAGE STRUCTURE:


/swimgen2/src/template-library/
├── collector/             \# Automated collection tools
├── sources/               \# Raw collected sets by source
├── validated/             \# Coach-approved sets
├── community/             \# User-submitted sets (vetted)
└── index.js               \# Consolidated access

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

Color coding: Consistent effort-level colors

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
│   ├── usms-collector.js
│   ├── coach-sites-collector.js
│   └── public-databases-collector.js
├── analysis/
│   ├── pattern-finder.js
│   └── popularity-ranker.js
├── outputs/
│   ├── top-500-patterns.json
│   └── pattern-insights.md
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

User Feedback
[To be implemented]

============================================================================ END OF DOCUMENT

**Execution Requirements:**
1. Overwrite the entire `project-state.md` file with the block above.
2. Ensure NO sections are truncated. Every specification must be preserved.
3. Commit and push: `git add project-state.md`, `git commit -m "Comprehensive St
[2026-02-11] LITE MODE LOCKDOWN: 
- Hard-coded IS_LITE_MODE = true in index.js.
- Set display:none on advancedRow to remove Advanced options from active UI.
- Gated openGestureEditModal to disable the set editor for Lite release.

[2026-02-11] LITE MODE v2 FIXES: 
- Injected IS_LITE_MODE = true into client-side HOME_JS_DOM script block.
- Replaced adBanner dev links with perpetual ADVERTISEMENT placeholder + Remove Ads button.
- Strengthened advancedRow hide with display:none !important.

[2026-02-11] AD FRAMEWORK & PREMIUM: 
- Added isPremium flag to localStorage settings initialization.
- Wired Remove Ads button with confirm dialog and premium mode toggle.
- Banner auto-hides on load if isPremium is true in saved settings.

[2026-02-11] PREMIUM TEASER & GUIDE: 
- Replaced hidden advancedRow with "Premium Options (Coming Soon)" teaser button.
- Added "How to Use SwimGen" gesture guide card below generator form.
- Upgraded ad removal to 1-year subscription expiry logic with premiumExpiry timestamp.
- Added Premium Info popup listing upcoming premium features.

[2026-02-11] PREMIUM PAGE & BG CYCLER: 
- Created dedicated Premium landing page at /premium route.
- Premium teaser button now navigates to /premium page instead of alert.
- Updated How to Use guide with regeneration, frame icon, and feedback instructions.
- Enhanced background cycler with solid color modes (White, Black, Light Blue, Light Green pastels).
