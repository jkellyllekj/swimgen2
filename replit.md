# Swim Workout Generator

## Overview

The Swim Workout Generator is a web application designed to create structured swim workouts. It is currently built as a Node.js + Express web app, serving both the API and a simple HTML frontend. The primary target is the Android Play Store, with plans for cross-platform expansion to iOS and web using React Native (Expo). The application focuses on generating coach-quality workouts with a deterministic algorithm.

The long-term vision includes migrating to React Native with Expo for mobile app stores, while the web app serves as a development preview. Future plans involve moving the workout algorithm to a server-side component for IP protection.

## User Preferences

Preferred communication style: Simple, everyday language.

Additional project-specific preferences:
- Work in small, focused changes (one goal per change, minimal files touched)
- At session start, state current phase, next task, and expected file changes before editing
- Keep PROJECT_STATE.md current as the source of truth
- No em dashes in UI copy
- Distances must snap to pool length multiples

## System Architecture

### Application Structure
The application uses Express with inline HTML/CSS/JavaScript. The main file is `index.js` (6,343 lines), with modularized components in `src/modules/`. No build step; relies on plain Node.js and Express.

**Extracted Modules:**
- `src/modules/dragDropManager.js`: Ghost Card drag-and-drop with S24 Scroll-Lock (e.preventDefault on touchmove). Includes setupCardGestures (long-press drag, swipe left/right, double-tap edit), highlightDropTarget, handleGhostDrop for reordering, and cleanupGhostDrag. Exports template strings concatenated into HTML response.
- `src/modules/setMath.js`: Pure calculation utilities including deterministic functions (fnv1a32, shuffleWithSeed, mulberry32), distance snapping, pace calculations, set parsing, and rep scheme selection.
- `src/modules/workoutLibrary.js`: Static workout data including drill names (13 items), workout name pools, section allocation profiles, and label normalization.
- `src/modules/workoutGenerator.js` (567 lines): Workout generation helpers including name generation, validation, full gas injection, drill set generation, and workout text parsing (parseWorkoutTextToSections, inferZoneFromText, inferIsStriatedFromText).

**Phase 3-4A Integration Status:**
- Module-level duplicate functions removed from index.js and replaced with imports (~330 lines removed total)
- Backward-compat aliases added: snapToPoolMultipleShared, snapRepDistToPool
- Route-handler helpers moved to workoutGenerator.js (parseWorkoutTextToSections, inferZoneFromText, inferIsStriatedFromText)
- Cool down calculation: Now uses calculateSensibleCoolDown (10% of total, snapped to standard values [100,150,200,300,400,500], max 16 reps)
- Slider snapping: 100m increments below 2000m, 200m increments at/above 2000m
- Warmup buckets extended to [200-800] to support longer workouts (6000m+)
- TARGET LOCK fallback now uses smart rep distances (100m/200m for longer sets) to stay under 30-rep limit

**Phase 5: Template-Only Generation (COMPLETE):**
- Created src/data/workoutTemplates.js with 27 real swim workout templates (500m-10000m)
- Mini templates added: Quick Dip (500m), Express Swim (800m), Lunch Break (1000m), Quick Technique (1200m)
- Full templates: Easy Recovery, Sprint Prep, Threshold Builder, Endurance Builder, Volume Day, etc.
- findClosestTemplate() matches target distance to nearest template
- scaleTemplate() intelligently scales sections while preserving proportions
- REP_LIMITS enforce coaching constraints (200m max 8 reps, 100m max 16, etc.)
- **TEMPLATE-ONLY MODE**: All algorithmic fallback REMOVED - every workout uses templates
- When scale factor within 15%, uses original descriptions; otherwise regenerates
- Verified: No "6x200 easy" warmups or "16x100 moderate" algorithmic patterns

**Critical Deterministic Functions (must never change):**
- fnv1a32: `h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0`
- shuffleWithSeed: `((seed * (i + 1) * 9973) >>> 0) % (i + 1)`
- pickEvenRepScheme: 4-pass algorithm for odd pool edge cases

**Future Modularization Approach:**
1. Analyze dependencies in index.js first
2. Create dependency graph before extracting
3. Extract leaf functions first (no dependencies)
4. Test at each extraction step
5. Never break working functionality

### Frontend
The frontend features an inline HTML interface. Users can select pool type (25m, 50m, 25yd, Custom) and target distance via a slider (500-10000m, snapping to 100). Workouts are displayed as chips with zone-based colored backgrounds (CardGym-style: Easy blue, Moderate green, Strong yellow, Hard orange, Full Gas red). Readability is ensured with white text on dark backgrounds. Vertical gradients are used for multi-zone sets like builds and descends.

Key UI elements include a snazzy workout name generator, a 13-drill name library, an emoji intensity strip, and a spinning dolphin animation during workout generation. The design uses a controlsGrid layout (grid-template-columns: 1fr auto) that stays 2-column on all screen sizes, with pool buttons on the left and the Generate button on the right. The Generate button contains both the label and dolphin inside as a vertical flex box with cyan glow-ring when active. UI chips use the readChip class (78% white opacity) for readable text on the Swim Gen title, background button, and distance pill. The Advanced options toggle uses a white chip with cyan glow when expanded. The design incorporates a premium outdoor pool photo background, drop shadows for depth, and ~8-10px rounded corners. Individual sets can be rerolled using a dolphin button.

### Routes
- `/`: Main workout generator page.
- `/viewport-lab`: Temporary page for responsive design testing (to be removed before production).
- `/generate-workout`: POST endpoint for workout generation.
- `/reroll-set`: POST endpoint for rerolling individual sets.

### Backend
The backend uses an Express 5.x server, running on port 5000 (or `PORT` environment variable). It provides JSON API endpoints for workout generation. The workout generation logic is entirely local and deterministic.

### Data Flow
The user selects workout parameters, which are sent to the `/generate-workout` endpoint. The backend allocates distances to workout sections (warm-up, drill, kick, pull, main, cool-down) and generates each set deterministically. The frontend then displays the workout as colored chips.

### Key Design Decisions
- **Clean rebuild**: The project opted for a fresh start rather than refactoring a legacy prototype.
- **Coach plausibility**: Workouts are designed to feel human-written.
- **Custom pool caution**: LLM arithmetic for custom pool lengths is validated.
- **Zone-based colors**: Five intensity levels are used for clear visual representation.
- **Zone striation logic**: Cards display gradients/stripes based on set content.
- **Rest/interval display**: Rest is shown only when a threshold pace is entered.
- **Descend pattern variety**: Includes diverse descending patterns beyond simple 1-4.
- **Freestyle default**: Warm-up and cool-down favor freestyle.
- **No "easy" in drill/kick/pull**: Color indicates intensity; "relaxed" is used instead of "easy".
- **Multi-part sets**: Approximately 20% probability for main sets 400m+ with distance validation.
- **Drill variety**: Provides drill choices for 6+ rep sets.

## External Dependencies

### Runtime Dependencies
- **Express 5.x**: Used as the web server framework.
- **OpenAI SDK**: Installed but not currently utilized for basic workout generation.

### Environment Configuration
- `OPENAI_API_KEY`: Replit Secret, present but not used by the current generation logic.
- `PORT`: Optional, defaults to 5000.

### No Database
The application is currently stateless and does not use any persistent storage.

## Recent Changes

### Gesture System Stabilization & Footer Immortalization (Feb 2026)
- **DOM Architecture**: Footer (#sticky-footer-panel containing totalBox + footerBox) moved OUTSIDE #resultWrap as a sibling. Nothing that clears resultWrap can destroy the footer.
- **Ghost Card System Retained**: Analyzed Ghost vs Live Sort; Ghost pattern kept for better visual feedback. Issues were edge cases in event handling, not architectural.
- **S24 Pop-Back Fix**: pointercancel handler commits to lastShiftTargetIndex and calls finalSync() (not just rerenderWorkoutFromArray). CSS touch-action: none on [data-effort] is the primary scroll lock.
- **Freeze Prevention**: All document.body.style.overflow = 'hidden' removed from drag start. cleanupGhostDrag resets body overflow/touchAction. No safety timeout (was causing 5s freezes; removed).
- **Animation Flow**: Delete/moveSetToBottom use 400ms slide-out animation (translateX(100%) + opacity + height collapse) with 450ms deferred array mutation. isAnimatingSetAction flag prevents double-firing.
- **finalSync()**: Single source of truth -- calls rerenderWorkoutFromArray() + updateMathTotals() + renderFooterTotalsAndMeta() + setupGestureEditing(). All state changes go through finalSync.
- **Stale Index Protection**: delete/move capture setRef (object reference) before animation, re-find live index via indexOf after timeout.