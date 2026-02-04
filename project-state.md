# Project: Swim Workout Generator

Working title(s): SwimDice / SetRoll / PacePalette (TBD)  
Last updated: 2026-02-04  
Status: Active Development - Template-Based Rebuild

============================================================================
READ THIS FIRST
============================================================================

This file is the single source of truth for the project.

If there is any uncertainty about:
- what we are working on
- what phase we are in
- what is allowed or frozen
- how to resume after a break

Then STOP and read this file in full before doing anything else.

Chat memory is disposable. This file is not.

============================================================================
ACTIVE DEVELOPMENT - SWIMGEN2
============================================================================

**Repository:** https://github.com/jkellyllekj/SwimGen2  
**Status:** Template-based rebuild preserving UI layer  
**Core Principle:** No algorithmic set invention - real-world templates only  
**Scale Goal:** Thousands of validated swim sets continuously growing  
**Current Focus:** Foundation overhaul with real-world template library

============================================================================
INSTRUCTION STYLE RULE
============================================================================

The assistant must always provide explicit, start to finish instructions.

This means:
- Always specify the exact file name(s)
- Always specify exactly where to change the file (section or heading and position)
- Always provide copy and paste ready text blocks for additions or replacements
- Do not say "add this somewhere" or "put this in the project state" without exact placement
- Planning happens in chat. The agent is execution only.

Agent message format rule (from WORKING-METHOD-REPLIT.md):
- All instructions sent to the agent must be enclosed in a single code block
- Begin with "START MESSAGE TO AGENT"
- End with "FINISH MESSAGE TO AGENT"
- Contain all actions, tests, and reporting requirements inline
- Never rely on prose outside the code block

============================================================================
PROJECT INTENT
============================================================================

Swim Workout Generator (SwimGen) is intended to be a real, shippable consumer app, not a demo.

The goal is:
- A usable, attractive, coach plausible swim workout generator
- Deployed first as a web app
- Then wrapped and shipped to the iOS App Store
- With monetisation from day one
- Without architectural dead ends that require a rebuild

Long term evolution is expected (years), but v1 must stand on its own.

============================================================================
CURRENT PHASE
============================================================================

Phase: Template-Based Rebuild Foundation

Primary goals:
- Replace algorithmic generator with real-world template library
- Fix critical bugs (edit persistence, unrealistic sets)
- Preserve and enhance current UI/gesture functionality
- Build scalable architecture for thousands of swim sets

Constraints:
- Generator uses ONLY real-world templates (no algorithmic invention)
- Current UI/gestures must be preserved during migration
- All sets must be coach-plausible and wall-safe
- Template collection is continuous process

Phase is complete when:
- Generator uses validated template library with 1000+ real sets
- Edit functionality works with tabbed interface
- All critical bugs are resolved
- Architecture supports continuous template growth

============================================================================
ARCHITECTURE OVERVIEW (MIGRATION PATH)
============================================================================

**CURRENT (LEGACY):**
- Monolithic index.js with algorithmic generation
- Working UI/gestures with animation issues
- Broken edit persistence
- Limited set variation

**TARGET (SWIMGEN2):**
```
/swimgen2/
├── legacy/                    # Original working code
├── src/
│   ├── generator-v2.js        # Template-based engine
│   ├── template-library/      # Real-world sets (thousands)
│   ├── editor/                # Tabbed editor system
│   │   ├── drill-editor.js
│   │   ├── mainset-editor.js
│   │   └── effort-builder.js
│   ├── pace-calculator.js     # CSS/interval mathematics
│   └── workout-model.js       # Data structures
├── ui/                        # Preserved & enhanced UI
│   ├── gestures.js            # Enhanced with phone gestures
│   ├── renderer.js            # Animation fixes
│   ├── modals.js              # Tabbed edit modal
│   └── background-options.js
└── business/
    ├── tiers.js               # Free/Premium/Pro gating
    ├── ads.js                 # Ad integration for free tier
    └── storage.js             # Workout history/favorites
```

**MIGRATION STRATEGY:**
1. Build generator-v2 alongside legacy system
2. Compare outputs for realism validation
3. Gradually replace algorithmic generation
4. Preserve all UI/gesture functionality
5. Cutover when template library > 1000 validated sets

============================================================================
PAUSE IN ACTION AND NEW CHAT HANDOVER
============================================================================

When a Pause In Action is declared:
- The current chat is disposable
- Continuity must be recovered from this file
- No prior chat context should be assumed

Canonical raw links:
PROJECT: SwimGen2
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
- For precise debugging, pin index.js to a commit permalink when investigating a bug so the file cannot change under us.

============================================================================
WORKOUT STRUCTURE RULES
============================================================================

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
- 1000m workouts must not be over constrained by forcing all sections
- The generator must avoid impossible constraint combinations at short totals

Section gating (current intent):
- Below 1200m: Drill may be omitted
- Below 1000m: Kick and Drill may be omitted
- At 1800m and above: full structure is expected

This gating exists to prevent constraint satisfaction failure at short totals.

============================================================================
DISTANCE AND POOL RULES
============================================================================

- All sets must end on the same wall they start
- Set distances must be divisible by 2 times pool length (wall safe)
- Slight total overshoot is allowed only to preserve wall endings when custom pools require it
- Custom pool lengths (example 33m) are first class citizens
- For standard pools (25m, 50m, 25yd) totals should match the slider exactly

============================================================================
EFFORT RULES
============================================================================

- Warm up and Cool down: blue or green only
- Build: progressive (may touch orange, rarely red)
- Drill: usually blue or green
- Kick: may include strong or hard
- Main: yellow, orange, red expected

Variety intent:
- About 60 to 70 percent of workouts include at least one red exposure
- Gradients should not be overused
- Hard efforts should sometimes stand alone

============================================================================
EDIT MODAL COLOR STANDARDS
============================================================================

All edit modal effort selectors must use these exact colors:
- Easy: #1e90ff (blue)
- Moderate: #2ecc71 (green) 
- Strong: #f39c12 (orange)
- Hard: #f1c40f (yellow/cream)
- Full Gas: #e74c3c (red)

============================================================================
LOCKED INVARIANTS
============================================================================

- Generator uses real-world templates ONLY (no algorithmic invention)
- Template library contains thousands of continuously growing sets
- Edit operations persist mathematically with tabbed interface
- All sets are coach-plausible and wall-safe
- Current UI/gestures preserved and enhanced during migration
- Phone and web have appropriate gesture sets for their platforms
- Animations are smooth 200ms transitions, not instant
- Effort levels follow standard color coding
- Intervals calculate correctly for CSS or rest-based timing
- index.js is runtime authority
- Generator never returns null or fails silently
- Reroll must always produce a valid workout

============================================================================
PRODUCT TIERS AND MONETISATION (v1)
============================================================================

SwimGen uses a subscription based model. Generator rerolls are deterministic and local. Monetisation is not tied to generation count.

**Free Tier (Ad-supported):**
- Basic template-based generation
- Standard pool lengths (25m, 50m, 25yd)
- Fixed set structures (no editing)
- Persistent banner ad + light interstitial ads

**Premium Tier (Subscription):**
- Removes all ads
- Allows custom pool lengths
- Allows set resizing and editing
- Basic pace suggestions
- Equipment toggles (fins, paddles, snorkel, pull buoy)

**Pro Tier (Subscription):**
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

============================================================================
UI EVOLUTION RULES
============================================================================

UI is stable but not frozen.

Rules:
- Structural redesign is not allowed in v1
- Additive and reversible UI changes are allowed
- Visual variants (example white background) may be added if they do not destabilise layout or interaction
- Current color coded workout cards are a core engagement feature

============================================================================
RECENT WORK (FACTS, NOT PLANS)
============================================================================

## Recent Work (2026-02-04)
1. **Generator Analysis Complete:**
   - Critical flaw identified: produces unrealistic sets (e.g., 76x25 cooldown)
   - Edit functionality broken: changes don't persist mathematically
   - Mobile drag requires horizontal swipe first
   - Animation issues: drops instant instead of 200ms smooth

2. **Strategic Decisions Made:**
   - Complete template-based rebuild required
   - No algorithmic set invention - real-world templates only
   - New repository: SwimGen2 for clean development
   - Scale goal: Thousands of validated swim sets

3. **Current Implementation Status:**
   - Drag-and-drop functional with animation issues
   - LocalStorage persistence implemented for user settings
   - Dolphin button inconsistent (works on mobile, not web)
   - All four gesture operations work but need polish

- Gesture editing math totals fixed (2026-02-03)
  - Drag-to-delete: Updates math totals, preserves footer
  - Drag-to-move: Updates math totals, preserves footer  
  - Edit modal: Updates math totals, preserves footer, edits correct set
  - All operations use direct DOM updates instead of full re-render

- Previous work (2026-01-30):
  - Post generation validator added
  - Exact target totals enforcement for standard pools
  - Rep count realism caps and odd prime rep elimination
  - Runtime crash fix in buildOneSetBodyShared

============================================================================
REBUILD & FEATURE STRATEGY (ACTIVE)
============================================================================

**PHASE 1: FOUNDATION OVERHAUL (IMMEDIATE)**
1. **Real-World Template Library** (Thousands of sets)
   - Sources: USA Swimming, Swim England, SwimSwam, coaching publications
   - No algorithmic invention - only real patterns
   - Continuous collection & validation pipeline

2. **Generator-v2 Engine**
   - Template matching only, no algorithmic generation
   - Outputs only coach-plausible, wall-safe sets
   - Preserves current UI/gesture layer

3. **Fixed Edit System with Tabs**
   - Tabbed interface: Drill, Main, Kick, Pull, Warmup, Cooldown tabs
   - Each tab has type-specific controls
   - Edit changes persist mathematically

**PHASE 2: SET EDITOR ENHANCEMENTS**
1. **Drill Editor Tab**
   - Database of 30+ drills with categorization (catch, cadence, turns, etc.)
   - Custom drill entry field
   - Drill selection matching interval count

2. **Main Set Editor Tab**
   - Pyramid configuration (100-200-300-200-100 patterns)
   - Multiple interval types within single set (e.g., 12x100 + 8x50)
   - Mixed effort levels within sets

3. **Effort Customization**
   - Build from X to Y (selectable start/end efforts)
   - Alternate between A and B (selectable pairs)
   - Gradient options across full spectrum (easy to full gas)

4. **Interval/Rest System**
   - CSS-based auto-calculation with 5/10 second rounding
   - Rest-based alternative (20s rest, etc.)
   - Send-off vs rest interval options
   - Display intervals per set

**PHASE 3: UI & GESTURE POLISH**
1. **Animation Fixes**
   - Smooth 200ms drop animations (not instant)
   - Cards flow into position, not teleport
   - Other cards scroll up/down smoothly during reorder

2. **Gesture Enhancements**
   - Phone: Two-finger spread to add set between cards
   - Web: Alternative add-set method (plus button or gesture)
   - Mobile drag without requiring horizontal swipe first
   - Auto-scroll when dragging to off-screen positions

3. **Visual Customization**
   - Solid color square backgrounds (white, black, color picker)
   - Variable image backgrounds from existing collection
   - Consistent color coding per effort level

**PHASE 4: ADVANCED FEATURES**
1. **Regeneration Improvements**
   - Greater set variation (not repetitive patterns)
   - Favorites/heart system for preferred sets
   - Tag-based generation (endurance, sprint, technique focus)

2. **Pace/CSS Integration**
   - CSS input for pace-aware intervals
   - Adjustments for different strokes (IM vs freestyle)
   - Rest period customization per set

3. **Equipment Integration**
   - Fins, paddles, snorkel, pull buoy toggles
   - Equipment-aware set suggestions
   - Display equipment icons in sets

4. **Workout Management**
   - Save favorite workouts
   - Upload workout results/times
   - Progress tracking over time
   - Season planning foundation

**PHASE 5: LAUNCH PREPARATION**
1. **Monetization Tiers Implementation**
2. **App Store Readiness** (iOS/Android wrappers)
3. **Performance Optimization**
4. **Offline Functionality**

============================================================================
TEMPLATE LIBRARY ARCHITECTURE
============================================================================

**GOAL:** Thousands of real-world swim sets, continuously growing collection.

**VALIDATION PIPELINE:**
1. Source Verification (provenance tracking)
2. Format Validation (automated parsing)
3. Coach Review (realism check)
4. Community Rating (ongoing quality)

**COLLECTION SOURCES:**
- USA Swimming published workouts
- Swim England Masters sessions
- SwimSwam "Workout of the Week" archive
- Swimming World Magazine workouts
- FINA competition training sets
- Coaching blog publications
- TrainingPeaks public workouts
- Academic swimming studies
- Community coach submissions

**STORAGE STRUCTURE:**
```
/swimgen2/src/template-library/
├── collector/          # Automated collection tools
├── sources/            # Raw collected sets by source
├── validated/          # Coach-approved sets
├── community/          # User-submitted sets (vetted)
└── index.js            # Consolidated access
```

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
```

**QUALITY RULES:**
- Every template must be from real coaching practice
- No mathematically impossible combinations
- All sets must be "wall-safe" for common pool lengths
- Effort progressions must follow coaching norms
- Source attribution maintained

============================================================================
SET EDITOR SPECIFICATION
============================================================================

**TABBED INTERFACE:**

**Drill Tab**
- Drill database with 30+ options
- Categorization: catch, cadence, turns, breathing, etc.
- Custom drill text entry
- Drill-to-interval matching logic

**Main Set Tab**
- Pyramid builder (ascend/descend/symmetric)
- Mixed interval builder (e.g., 12x100 + 8x50)
- Effort variation within set
- Interval time calculation (CSS or rest-based)

**Kick/Pull Tab**
- Equipment selection (fins, paddles, snorkel, buoy)
- Stroke specification
- Distance/rep configuration
- Effort level setting

**Warmup/Cooldown Tab**
- Progressive effort builder
- Distance allocation
- Stroke variety controls

**EFFORT CUSTOMIZATION:**
- Build: Select start effort (easy) to end effort (full gas)
- Alternate: Choose two efforts to alternate between
- Gradient: Smooth progression across selected range
- Fixed: Single effort level for entire set

**INTERVAL SYSTEM:**
- CSS-based: Auto-calculates send-off times
- Rest-based: Fixed rest periods between intervals
- Hybrid: Base interval with adjustable rest
- Display: Shows interval/rest per set in workout view

============================================================================
GESTURE & UI ENHANCEMENTS
============================================================================

**PHONE-SPECIFIC GESTURES:**
- Two-finger spread/pinch: Add/remove set between cards
- Long-press + drag: Current reorder functionality (needs mobile fix)
- Horizontal swipe: Delete/defer (currently working)

**WEB ALTERNATIVES:**
- Plus button between cards for add-set
- Right-click context menu for set operations
- Keyboard shortcuts for power users

**ANIMATION STANDARDS:**
- All transitions: 200ms duration
- Easing: cubic-bezier(0.2, 0.8, 0.3, 1)
- Drop animation: Cards flow into place, not teleport
- Scroll animation: Smooth auto-scroll during drag

**VISUAL CUSTOMIZATION:**
- Solid background options: white, black, color picker
- Image backgrounds: Curated swimming-related images
- Color coding: Consistent effort-level colors
- Icon system: Equipment, stroke, effort indicators

============================================================================
KNOWN BUGS & LIMITATIONS (MUST FIX)
============================================================================

**CRITICAL BUGS (MUST FIX):**
- Generator creates unrealistic/never-used sets (e.g., 76x25 cooldown)
- Edit modal changes don't persist to workout mathematics
- Mobile vertical drag fails without horizontal swipe first
- Set regeneration produces limited variation (same patterns)

**MAJOR ISSUES:**
- Drop animation instant (not 200ms smooth)
- No auto-scroll during drag to off-screen positions
- Pace/CSS system not implemented
- Drill selection missing (no database)
- Effort customization limited (no build/alternate/gradient options)
- Tabbed editor missing (single interface for all set types)

**UI/DESIGN ISSUES:**
- Dolphin button inconsistent (web vs mobile)
- Animation timing inconsistencies
- Background customization limited
- Phone-specific gestures missing (two-finger spread)
- No visual indication for add-set functionality on web

**GENERATOR REALISM ISSUES:**
- Produces sets that would never be used in real coaching
- Limited variation in set patterns
- No connection to real-world swimming practice
- Mathematical correctness but coaching implausibility

============================================================================
TESTING AND TOOLING
============================================================================

Automated smoke test script: scripts/gen_smoke_test.js

Smoke test suites:
- Suite A: crash and retry hardening
- Suite B: rep count sanity (25m)
- Suite C: intensity detection (TODO)
- Suite D: 25yd parity

Manual testing is authoritative. Short distance manual testing is mandatory:
- 25m at 1000, 1500, 2000
- Custom pool at 2000

New Testing Requirements:
- Template validation testing
- Edit persistence verification
- Animation timing verification
- Gesture functionality across platforms

============================================================================
GLOSSARY
============================================================================

- CSS: Critical Swim Speed (threshold pace)
- Wall safe: Total distance divisible by 2 times pool length
- Reroll: Regenerate a single set within a workout
- Section: Structural part of a workout (warmup, main, etc.)
- Set: Individual component with reps, distance, and effort
- Template: Real-world set pattern from coaching practice
- Interval: Time between rep starts (send-off time)
- Rest: Recovery time between reps
