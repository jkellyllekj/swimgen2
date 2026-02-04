# Project: Swim Workout Generator

Working title(s): SwimDice / SetRoll / PacePalette (TBD)  
Last updated: 2026-02-04  
Status: Active (Pause In Action Resume)

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

Phase: v1 Reality Anchoring and Productisation

Primary goals:
- Generator outputs are coach plausible on first generation
- Set structures feel conventional and recognisable
- Workouts are wall safe in all pool lengths
- The app is usable poolside
- Product is ready for TestFlight by end of February

Constraints:
- Core generator correctness is prioritised
- UI redesign is not permitted, but additive UI evolution is allowed
- No AI rewrite layer yet
- Changes must be bounded and testable
- Avoid speculative architecture work

Phase is complete when:
- Generator uses a finite catalogue of coach normal set structures
- Outputs can be swum without "why would a coach do this" moments
- v1 feature set is complete and internally stable
- App is ready for TestFlight distribution

============================================================================
ARCHITECTURE OVERVIEW
============================================================================

Current State:
- Monolithic index.js (7000+ lines)
- Algorithmic generator with realism issues
- Working UI/gesture layer
- Broken edit persistence

Target Architecture:
- index.js (orchestrator only)
- core/generator-v2.js (template-based generation)
- core/template-library.js (real-world patterns)
- core/editor-engine.js (working edit with tabs)
- ui/gestures.js (drag/swipe interactions)
- ui/renderer.js (card display/animation)
- business/tiers.js (Free/Premium/Pro gating)

Migration Path:
1. Build generator-v2 alongside current system
2. Test side-by-side output comparison
3. Gradually replace algorithmic generation
4. Preserve all UI/gesture functionality

Legacy notes:
- Workouts are generated deterministically with seeded variation
- Manual swimming and inspection is authoritative
- The agent is execution only
- Planning, validation, and judgement happen in chat

============================================================================
PAUSE IN ACTION AND NEW CHAT HANDOVER
============================================================================

When a Pause In Action is declared:
- The current chat is disposable
- Continuity must be recovered from this file
- No prior chat context should be assumed

Canonical raw links:
PROJECT: labsg-app-01
https://raw.githubusercontent.com/jkellyllekj/labsg-app-01/main/project-state.md
https://raw.githubusercontent.com/jkellyllekj/labsg-app-01/main/WORKING-METHOD-REPLIT.md
https://raw.githubusercontent.com/jkellyllekj/labsg-app-01/main/COACH_DESIGN_NOTES.md
https://raw.githubusercontent.com/jkellyllekj/labsg-app-01/main/index.js
https://raw.githubusercontent.com/jkellyllekj/labsg-app-01/main/styles.css

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

- index.js is runtime authority
- Generator never returns null or fails silently
- Reroll must always produce a valid workout
- Reality Anchors remain active constraints:
  - Section distance buckets enforced for Warm up, Kick, Cool down
  - Sprint volume caps enforced, with single line sprint blocks rejected
  - Validation is section aware via validateSetBody(body, targetDistance, poolLen, sectionLabel)
- Generator must use real-world templates only (no algorithmic invention)
- Edit operations must persist mathematically
- All sets must be coach-plausible on first generation
- Template library is authoritative source of set patterns

============================================================================
PRODUCT TIERS AND MONETISATION (v1)
============================================================================

SwimGen uses a subscription based model. Generator rerolls are deterministic and local. Monetisation is not tied to generation count.

Free (ad supported):
- Unlimited workout generation
- Full workout visibility
- Standard pool lengths
- Fixed sets (no resizing or editing)
- Persistent ad banner at top of screen
- Optional light interstitial ads

Premium:
- Removes all ads
- Allows resizing workout sections
- Allows rerolling individual sections
- Supports custom pool lengths

Pro:
- Includes all Premium features
- Adds pace input (CSS or equivalent)
- Pace aware set suggestions
- Advanced control over effort and stroke bias
- Intended home for future advanced features

Notes:
- No standalone ad removal only tier
- Subscription only (monthly and yearly)
- No lifetime unlocks
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
- Gesture heavy interactions are deferred

The current colour coded workout cards are a core engagement feature.

============================================================================
RECENT WORK (FACTS, NOT PLANS)
============================================================================

## Recent Work (Today)
1. **Drag-and-Drop Reordering**: 
   - Long-press (300ms) to initiate drag on workout sets
   - Visual feedback: card lifts with shadow/scale during drag
   - Drop zone detection with physical card separation (40px gap)
   - Smooth animations (0.2s) for card movement
   - DOM reordering with data-index updates
   - Integration with existing swipe/double-tap gestures
   - Mobile touch support with scroll prevention

2. **Bug Fixes**:
   - Fixed container ID reference (workoutResultsBox → cards)
   - Fixed JavaScript variable crash (adjustedTo → toIndex)
   - Fixed CSS transition timing issues
   - Added proper touch event handling

- Gesture editing math totals fixed (2026-02-03)
  - Drag-to-delete: Updates math totals, preserves footer
  - Drag-to-move: Updates math totals, preserves footer  
  - Edit modal: Updates math totals, preserves footer, edits correct set
  - All operations use direct DOM updates instead of full re-render
  - data-index tracking ensures correct set identification after deletions/moves
  - All gesture handlers now read data-index dynamically

- Gesture editing foundation implemented (2026-02-02)
  - Drag left: moves set to bottom (green feedback on right side)
  - Drag right: deletes set (red feedback on left side)
  - Visual feedback positioned correctly for mobile (indicators on visible side)
  
- Edit modal improvements:
  - Responsive design for mobile screens (98% width on small screens)
  - Effort level selection with gradient/striation options (Build, Descend, Alternate)
  - Set type preservation in editor (detects kick, drill, pull, backstroke, etc.)
  
- Fixed effort color mapping:
  - Easy: blue
  - Moderate: green
  - Strong: yellow
  - Hard: orange
  - Full Gas: red
  
- Re-render system fixed:
  - rerenderWorkoutFromArray() now calls main renderCards() function
  - Math totals update after all gesture operations
  - Gestures re-attached after each render via setupGestureEditing()

- Previous work (2026-01-30):
  - Post generation validator added
  - Exact target totals enforcement for standard pools
  - Rep count realism caps and odd prime rep elimination
  - Runtime crash fix in buildOneSetBodyShared

- 2026-02-04: Drag implementation complete with remaining animation issues
- 2026-02-04: LocalStorage persistence implemented for user settings
- 2026-02-04: Critical generator flaw identified - produces unrealistic sets (e.g., 76x25 cooldown)
- 2026-02-04: Edit functionality discovered broken - changes don't persist mathematically
- 2026-02-04: Decision made to rebuild generator using real-world templates only
- 2026-02-04: Mobile drag requires horizontal swipe first to work properly

============================================================================
TESTING AND TOOLING
============================================================================

- Automated smoke test script: scripts/gen_smoke_test.js

Smoke test suites:
- Suite A: crash and retry hardening
- Suite B: rep count sanity (25m)
- Suite C: intensity detection (TODO)
- Suite D: 25yd parity

Manual testing is authoritative. Short distance manual testing is mandatory:
- 25m at 1000, 1500, 2000
- Custom pool at 2000

============================================================================
KNOWN LIMITATIONS
============================================================================

- API returns workoutText plus structured metadata
- /generate-workout includes:
  - sections
  - sectionMeta
  - workoutMeta

This enables detection of:
- red presence
- label and colour mismatches
- striation patterns

Gesture editing limitations:
- No vertical reordering (only move to bottom)
- No set resizing via edge dragging
- No set duplication gesture
- Drill sets don't regenerate multiple drill variations when count changes

Critical Bugs (Must Fix Before Launch):
- Generator creates mathematically impossible/unrealistic sets
  - Example: 76x25 cooldown would never exist in real coaching
  - Sets must come from real-world template library only
- Edit modal changes don't persist to workout mathematics
  - Users can edit sets but totals don't update correctly
  - Changes don't save to the workout array
- Mobile drag reset without horizontal swipe
  - Vertical-only drag fails on mobile
  - Requires horizontal gesture first to activate

Major Issues:
- Drop animation instant instead of smooth 200ms
- No auto-scroll when dragging to off-screen positions
- Pace/CSS system not yet implemented
- Template-based drill selection missing

Minor Issues:
- Dolphin button inconsistency (web vs mobile)
- Animation timing inconsistencies
- Some gesture conflicts in edge cases

============================================================================
NEXT SINGLE STEP (ACTIVE)
============================================================================

REBUILD STRATEGY (ACTIVE)

Phase 1: Foundation Overhaul (Immediate)

1. Build Real-World Template Library
   - Source: USA Swimming, Swim England Masters, Master Swim Swam, reputable coaching publications
   - Rule: No algorithmic set invention - only real patterns from coaching practice
   - Format: { pattern: "8x50 kick", distance: 400, effort: "moderate", section: "kick" }

2. Create generator-v2.js
   - Template-based generation only
   - Matches templates to distance/pool constraints
   - Ensures "wall-safe" sets only
   - Preserves current UI/gesture layer

3. Fix Edit Persistence
   - Edit modal must actually modify workout array
   - Mathematical totals must update correctly
   - Changes must persist through re-renders

Phase 2: Core v1 Features (Next)
- Pace/CSS interval calculations
- Template-based drill selection with 30+ drill options
- Working tabbed editor for set types (kick, drill, main, etc.)
- Effort level customization (builds, pyramids, alternations)

Phase 3: Polish & Launch (Final)
- Smooth 200ms animations throughout
- Monetization tier implementation (Free/Ads, Premium, Pro)
- App Store readiness (offline, performance, store assets)

CRITICAL RULE: No new algorithmic set generation. Template matching only.

============================================================================
TEMPLATE LIBRARY SPECIFICATION
============================================================================

Sources (Real Coaching Sets Only):
- USA Swimming published workouts (usaswimming.org)
- Swim England Masters sessions (swimming.org)
- Master Swim Swam archives
- Reputable coaching blogs and publications
- Historical workout databases

Template Format:
```javascript
{
  pattern: "8x50 kick steady",
  baseDistance: 400,
  effort: "moderate",
  section: "kick",
  equipment: ["fins"],
  stroke: "freestyle",
  variations: [
    "6x50 kick moderate",
    "10x50 kick build", 
    "8x75 kick steady"
  ]
}
```

Validation Rules:
- Every template must come from real coaching practice
- No mathematically impossible combinations
- All sets must be "wall-safe" for given pool length
- Effort progressions must follow coaching norms

============================================================================
GESTURE EDITING STATUS (Current Focus)
============================================================================

## Gesture Editing Status
✅ **Enabled & Fully Functional**
- Swipe right → Delete set
- Swipe left → Defer to next workout  
- Double-tap → Edit set (with color-matched modal)
- Long-press (300ms) + drag → Reorder sets
- All gestures work together with conflict prevention

============================================================================
IDEA PARKING LOT (NOT SCHEDULED, NOT COMMITTED)
============================================================================

Rule: Idea Capture Responsibility

If an idea is discussed and not written here, it is considered lost.

Items below are not tasks and must not be implemented without promotion.

Template driven realism:
- Shift from generate then ban to template first generation
- Large corpus of coach derived set shapes
- Templates tagged by intent, stroke mix, energy system

User customisation and editing:
- Drag to reorder sections
- Resize sections by dragging edges
- Swipe to remove sections
- Lock sections to preserve them across rerolls
- Poolside interaction lock mode to prevent accidental edits
- Manual distance rebalancing when resizing sections
- Workout total may exceed or fall below slider after edits
- Optional lock to preserve total and redistribute
- Insert new section between existing blocks

Visual themes:
- White background and monochrome modes
- Colour banding instead of full card backgrounds
- User selectable themes

Pacing and timing:
- Floating pace clock overlay
- Standalone pace clock app
- Interval based and rest based views
- Estimated workout duration

Video and feedback systems:
- Drill demonstration videos linked from sets
- Timestamped video references
- Delayed playback poolside mirror system
- Underwater and multi angle feedback concepts

Hardware and accessories:
- Waterproof phone cases with built in stands
- Poolside mounting concepts
- Potential partnerships

Accounts and data:
- Optional user accounts
- Saved preferences
- Workout history
- Email capture

AI and higher tiers:
- AI as constrained editor
- AI generated coaching notes
- Optionally suggest coach rationale per set
- Full AI generation only after validator maturity

============================================================================
KNOWN ISSUES
============================================================================

## Known Issues
- Edit modal background still very dark (requested: lighter, 20% opacity dark blue)
- No undo for accidental deletions/reorders
- Drag feedback could show original position marker
- Very long workouts might have scrolling issues during drag
- Short workout constraint failure still observed
- Effort gradients slightly overrepresented
- Full Gas underrepresented in some runs
- Rare odd length leaks in edge cases
- Custom pool lengths formatting inconsistency: some sections omit (N lengths) while others show it in the same workout

---

## Next Phase: Interactive Set Editing UI (📐 In Planning)

Goal: Enable users to directly interact with individual swim sets using touch gestures, similar to task/timer apps.

### Planned Features:

- **Swipe Right** → Delete set (workout total shrinks)
- **Swipe Left** → Defer (move set to bottom)
- **Press + Hold + Drag** → Reorder sets
- **3-Finger Tap** → Duplicate set
- **2-Finger Spread Between Sets** → Insert new set via modal

### Add Set Modal Options:
- Distance (e.g. 200, 400)
- Set type: warm up, main, drill, kick, pull, cooldown
- Effort profile: steady, build, sprint, threshold
- Optional tags: pyramid, breathing, technique
- Interval/turnaround pacing if swimmer time is known

### Edit Existing Set:
- Tap set → Edit reps, interval, effort level
- Pinch to resize total distance (e.g. 400 → 600)
- Swipe down or long-press → Regenerate set

### Finalization Mode:
- Lock workout to prevent accidental changes (wet screen mode)

This scope will be handled in a separate UI-focused thread.

---

============================================================================
PAUSE IN ACTION HANDOVER (2026-02-03)
============================================================================

**Session Summary**:
- Fixed gesture editing to preserve footer after all operations
- Implemented direct DOM manipulation for delete/move/edit (no full re-render)
- Added data-index tracking to reliably identify sets after deletions/moves
- All gesture handlers now read data-index dynamically instead of using stale closure-captured indices
- Math totals (yellow TOTAL box) update correctly after all operations

**Fixes Completed This Session**:
1. deleteWorkoutSet() removes DOM element directly, renumbers remaining sets
2. moveSetToBottom() moves DOM element directly, renumbers all sets
3. saveGestureEdit() updates specific set in DOM without full re-render
4. All gesture handlers use data-index attribute for accurate set identification
5. Footer (TOTAL box, pool info chips, lengths count) preserved after all operations

**Previous Session (2026-02-02)**:
- Implemented basic gesture editing: drag left (move to bottom), drag right (delete)
- Fixed mobile visual feedback positioning
- Created responsive edit modal
- Corrected effort color mapping
- Added pattern options (Build, Descend, Alternate)

**Next Priorities**:
1. Edit modal color matching with app's 5 core colors
2. User-selectable effort levels in edit modal
3. Drill set regeneration with drill picker
4. Background themes (black/white toggle)

**Ready for Next Agent**:
The project is in a stable state. Gesture editing core is complete and functional.

**Primary Files**:
- index.js - Main app with gesture functions (deleteWorkoutSet, moveSetToBottom, saveGestureEdit)
- styles.css - Gesture and modal styles
- project-state.md - This file

============================================================================
END OF FILE
============================================================================