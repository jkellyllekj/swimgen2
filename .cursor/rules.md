# SwimSum Cursor Rules & Manual

This file is the **permanent instruction manual** for the Cursor agent when working on the SwimSum / `swimgen2` project.

It is derived from, and must remain consistent with:
- `project-state.md` (canonical product, architecture, and roadmap source of truth)
- `WORKING-METHOD-REPLIT.md` (working method and agent execution protocol; adapted here for Cursor)

If this file and the project state ever appear to disagree, **treat `project-state.md` and `index.js` as the runtime authorities**, then update this file to match.

---

## 1. Phase & Intent

- **Project**: SwimSum - Swim Workout Generator (consumer app, not a demo).
- **Current Phase**: v1.5 / v1.8.2 – Layout, AdMob Integration, Console Compliance, CSS geometry locks, and Android WebView visual parity.
- **Release Strategy**: Ship **SwimSum Lite** first (template-based generator, ad-supported, simplified UI), then iterate.
- **Architecture Principle**: Template-only generation using real-world workouts. **No algorithmic invention.**
- **Mantra**: NEVER ABRIDGE, NEVER TRUNCATE, NEVER PERFORM BLANKET OVERWRITES.

High-level goals:
- Attractive, coach-plausible swim workout generator.
- Web app first, then mobile wrappers (Android/iOS).
- Monetisation active from day one (tiered subscription + ads).

---

## 2. LOCKED INVARIANTS (Do Not Break)

These are **hard constraints** from `project-state.md`. The agent must never propose or implement changes that violate them.

1. Generator uses **real-world templates ONLY** (no algorithmic invention).
2. Template library contains thousands of continuously growing sets.
3. **Swimmer Math**: All distances snapped to even multiples of pool length.
4. Feature Flag: `IS_LITE_MODE` controls UI complexity for App Store.
5. Edit operations (when present) must persist mathematically with the same snapping and template rules as initial generation.
6. All sets are **coach-plausible** and **wall-safe**.
7. The **v1 Lite release is a template-only generator**; users consume workouts generated from real templates without relying on an in-app editor.
8. Any future interactive editor or gesture system must be additive: it may change UX, but **must not** violate template integrity, swimmer math, or workout structure rules.
9. Animations are smooth **200ms transitions**, not instant.
10. Effort levels follow the standard color coding:
    - Easy: `#1e90ff`
    - Moderate: `#2ecc71`
    - Strong: `#f39c12`
    - Hard: `#f1c40f`
    - Full Gas: `#e74c3c`
11. Intervals calculate correctly for CSS or rest-based timing.
12. `index.js` is the runtime authority for generator behavior.
13. Generator never returns `null` or fails silently.
14. Reroll must always produce a valid workout.

When in doubt, **re-read `project-state.md` and this section before any non-trivial change**.

---

## 3. CSS & Layout Geometry Locks (Android WebView)

From `project-state.md` and `WORKING-METHOD-REPLIT.md` – these are **device-tested on Samsung S24+** and must not be changed without repeating that verification on physical hardware.

**Geometry:**
- Side gutters: **15px** fixed for all panels (generator, instruction, totals, workout cards).
- Card gaps: **12px** vertical spacing between workout set cards.
- Scroll offset: **24px** `margin-top` on `#workoutNameDisplay` so the generator panel scrolls cleanly out of view while keeping cards aligned.
- Scroll margin: `scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 14px)` on `#workoutNameDisplay` and `#cards`.
- Safe-area spacer: `.safe-area-spacer` height is `env(safe-area-inset-top, 0px)` (fallback `0px` – Android WebView provides correct inset).
- `ResultWrap` top margin: **4px**.

**Effort level bar:**
- Labels (“Easy”, “Moderate”, “Strong”, “Hard”, “Full Gas”) are **centered below dolphin icons**.
- “Moderate” uses **12px** font (longest word); all other labels use **14px**.
- Point sizes are locked to avoid accessibility/font scaling breaking the bar layout.

**Splash screen locks:**
- All splash text uses **vw units**, not `px`.
- “SwimSum” title: `15vw`.
- “Workout Generator” subtitle: `5.5vw`.
- Bullet text: `4.2vw`.
- Container `#splash-content`: width `90vw`, `max-width: 500px`, centered via `margin: 0 auto`.
- Known bug: very high font zoom may still cause oversize text. Acceptable for now; future fix is SVG logo or constrained container.

**Ad banner & bottom tray:**
- Perpetual banner anchored to bottom (`bottom: 0`), 100% width, `min-height: 60px`, with safe-area bottom padding.
- Bottom tray and banner backgrounds use the existing dark gradients; **do not change hex colors** without explicitly updating the geometry locks and testing on device.

---

## 4. Workout Structure & Math Rules

**Standard section order:**
1. Warm up
2. Build
3. Kick
4. Drill
5. Main
6. Cool down

**Section effort rules:**
- Warm up & Cool down: low effort only (blue/green).
- Build: progressive; may touch orange, rarely red.
- Drill: usually blue or green.
- Kick: may include strong or hard.
- Main: yellow/orange/red expected.

**Distance and pool rules:**
- All sets end on the **same wall** they start.
- Set distances must be divisible by **2 × pool length** (wall safe).
- For distances > 1 length, count must be **even** (2, 4, 6, …) to ensure wall return.
- Total distance is the sum of **snapped** distances (honest totals).
- Custom pool lengths (e.g. 33m, 27m) are first-class.
- For 25m/50m/25yd standard pools, totals should match slider exactly.
- UI distance displays should, where space permits, use the combined format `400m (16 Lengths)` with `Lengths` as the standard label.

**Short workout rule:**
- 1000m workouts must **not** be over-constrained by forcing all sections.
- Section gating:
  - Below 1200m: Drill may be omitted.
  - Below 1000m: Kick and Drill may be omitted.
  - At 1800m and above: full structure is expected.

These rules must be respected by **both generation and editing paths**. Any change in math or UI must keep these constraints intact.

---

## 5. Generator Architecture (Current vs Target)

**Current (Lite release ready):**
- Monolithic `index.js` with **template-only** generation (no algorithmic fallback).
- Swimmer Math logic in place (`getSnappedDistance`, even-length enforcement, honest totals).
- `IS_LITE_MODE` feature flag simplifies UI for App Store.
- UI/gestures working with some animation and persistence issues.
- Edit persistence is currently **broken/limited** – this is acknowledged and scheduled work.

**Target (SWIMGEN2 modular architecture):**

Intended structure:
- `legacy/` – original working code.
- `src/generator-v2.js` – template-based engine.
- `src/template-library/` – large, validated real-world template collection.
- `src/editor/` – tabbed editor (drill, main, kick, pull, warmup, cooldown).
- `src/pace-calculator.js` – CSS/interval math.
- `src/workout-model.js` – data structures.
- `ui/` – preserved/enhanced UI (gestures, renderer, modals, backgrounds).
- `business/tiers.js`, `business/ads.js`, `business/storage.js` – monetisation and persistence.

**Migration strategy:**
1. Build `generator-v2` alongside legacy system.
2. Compare outputs for realism and wall safety.
3. Gradually replace older generation logic.
4. Preserve all existing gestures and UI behavior during cutover.
5. Switch fully when template library exceeds 1000 validated sets.

When working in Cursor, keep migration plans in mind: **avoid refactors that make this modularization harder.**

---

## 6. Active Development Focus (from `project-state.md`)

The `ACTIVE DEVELOPMENT – SWIMGEN2` and **Rebuild & Feature Strategy (ACTIVE)** sections define what is currently in scope:

**Phase 1 – Foundation (mostly completed):**
- ✅ Template-only generator using 27 real-world templates (500m–10000m).
- ✅ Correct snapping and honest totals (Swimmer Math).
- ✅ Template-based realism (no algorithmic patterns).
- ⏳ **Pending**: fixed edit system with tabs; edits must persist mathematically and respect all math/effort rules.

**Phase 2 – Set editor enhancements (pending):**
- Drill editor tab (30+ drills, categorized).
- Main set editor with pyramids, mixed intervals, effort variation.
- Effort customization (build, alternate, gradients).
- Interval/rest system (CSS and rest-based).

**Phase 3 – UI polish (partially complete):**
- ✅ Drag-and-drop module extracted (can be refined or simplifed without changing generator/maths).
- ⏳ Animation fixes (smooth 200ms, non-teleporting).
- ⏳ Gesture enhancements (mobile gestures, auto-scroll, phone-specific interactions) — **optional UX** that must not change workout math or template behavior.
- ⏳ Visual customization (solid color backgrounds, image backgrounds, consistent effort color coding).

**Phase 4+ – Advanced features and launch prep (mostly future work):**
- Regeneration improvements, favorites, tag-based generation.
- Pace/CSS integration, equipment toggles, season planning.
- Monetisation tiers, wrappers, offline behavior, performance.

When assessing `index.js` or `styles.css`, always cross-check changes against these **in-scope phases**. Do not jump ahead into future phases without updating `project-state.md`.

---

## 7. Working Method in Cursor (Adapted from Replit)

The original `WORKING-METHOD-REPLIT.md` defines a **Caller/Agent** split. In Cursor, treat the human as the product owner and this agent as the **architect + implementer**, but retain the safety rails:

- **Execution discipline**:
  - Only touch files the user has explicitly put in scope.
  - Make small, bounded micro changes.
  - Run relevant tests or sanity checks after each change.
  - Never claim something works without actually checking.

- **Master documents**:
  - `project-state.md`, `WORKING-METHOD-REPLIT.md`, `index.js`, `styles.css` are **master documents**.
  - Do **not truncate** or replace these with elided versions (no `// ... rest of code` when updating them).
  - Any large structural or logic edit to these must be done as a **full-file update**.

- **Instruction style**:
  - When giving instructions to another agent/tool, always specify:
    - Exact filenames.
    - Exact sections/blocks to change.
    - Copy-paste ready code for adds/replacements.

- **Scope & budget**:
  - Prefer a single clear goal per micro-change.
  - Avoid large refactors unless the project state explicitly calls for them.
  - If a task appears larger than expected, **stop and report** rather than expanding scope silently.

This manual does **not** replace the original working-method file; it summarizes the parts that are relevant to Cursor and should be kept in sync conceptually.

---

## 8. UI Evolution Rules

From `project-state.md`:

- UI is **stable but not frozen**.
- Structural redesign is **not allowed in v1**.
- Additive and reversible UI changes are allowed.
- Visual variants (e.g. a white background mode) are allowed **only if** they do not destabilize layout or interaction.
- Color-coded workout cards are a core engagement feature; do not remove or flatten them without a deliberate product decision.

Any CSS or layout change must respect:
- Locked geometry values.
- Effort color mapping.
- Scroll and safe-area behavior on mobile, especially Android WebView.

---

## 9. Testing Expectations

From the testing sections in `project-state.md`:

- There is a smoke test script: `scripts/gen_smoke_test.js` with multiple suites; treat it as a **sanity baseline**, not full coverage.
- Manual testing is **authoritative**, especially:
  - 25m pool at 1000, 1500, 2000.
  - Custom pool (e.g. 33m) at 2000.
  - Lite vs non-lite UI states.
- New work that touches **math, generation, or gestures** must be accompanied by:
  - At least one manual run-through of key settings.
  - A clear note in `project-state.md` if there is any behavior regression or new constraint.

---

## 10. When Unsure

If a change touches any of:
- Generator math or snapping.
- Effort colors or labels.
- Core CSS geometry, safe-area logic, or splash sizing.
- Monetisation flows or tier gating.

…then the agent must:
1. **Re-read** `project-state.md` and this `rules.md` file.
2. Confirm that the change does not violate any **Locked Invariants** or geometry locks.
3. Prefer the **minimal** change that satisfies the current phase’s goals.
4. Report trade-offs and any remaining debt back to the user.

This file should be updated only when the underlying project intent or invariants change, and always in lockstep with `project-state.md`.

