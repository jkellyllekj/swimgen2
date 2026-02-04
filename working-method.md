<!-- __START_FILE_WM000__ -->

# Capisco — Working Method
## Structured Vibe Coding System

Last updated: 2026-01-07  
Status: **Authoritative**

---

<!--
============================================================================
BLOCK INDEX
WM010 — PURPOSE
WM020 — CORE_ENTITIES
WM030 — PHASE_DISCIPLINE
WM040 — PROGRESSIVE_STEP_RULE
WM050 — DOCUMENTATION_PARITY_RULE
WM060 — BLOCK_TAG_SYSTEM
WM070 — NUMERIC_BLOCK_ID_RULE
WM080 — CONTRACTS_BEFORE_FEATURES
WM090 — DECISION_CAPTURE
WM100 — REANCHORING
WM110 — PHASE_START_CHECKLIST
WM115 — ACTIVE_FILES_DISCIPLINE
WM120 — PAUSE_IN_ACTION
WM130 — LONG_TERM_GOAL
WM140 — ENVIRONMENT_REALITY_CHECK
WM150 — DISCOVERY_AND_SEARCH_RULES
WM160 — SPEC_VS_STATE_RULE
WM170 — CHAT_HANDOVER_ARTIFACT
WM180 — CONTEXT_SATURATION_AWARENESS
WM190 — ASSISTANT_SELF_ENFORCEMENT
============================================================================
-->

<!-- __START_WM_PURPOSE_WM010__ -->

## PURPOSE

This document defines **how we work**, not what we build.

It exists to:
- preserve creative, intuitive (“vibe”) exploration
- eliminate the failure modes of *undisciplined* vibe coding
- ensure continuity across long-running projects
- ensure that work actually **moves forward**

This is **vibe coding done correctly** — with structure, memory, and guardrails.

If there is any conflict between chat instructions and this file,  
**this file wins**.

<!-- __END_WM_PURPOSE_WM010__ -->

---

<!-- __START_WM_CORE_ENTITIES_WM020__ -->

## CORE ENTITIES (IMPORTANT DEFINITIONS)

### Project
A **long-lived codebase and repository** (e.g. *Capisco*).

- Canonical truth lives in **GitHub**
- Governed by:
  - `PROJECT_STATE.md`
  - `DECISIONS.md`
  - `WORKING_METHOD.md`

### Phase
A **bounded unit of intent**.

- Has a name and purpose
- May span multiple chat pages
- Explicitly entered and exited
- Progress is recorded in `PROJECT_STATE.md`
- Durable constraints may be logged in `DECISIONS.md`

### Chat Page
A **single ChatGPT conversation**.

- Has limited working memory
- Degrades over time
- Is **disposable by design**
- Never treated as a source of truth

Rule:  
When a chat page becomes overloaded, slow, or confused, it must be ended deliberately.

<!-- __END_WM_CORE_ENTITIES_WM020__ -->

---

<!-- __START_WM_PHASE_DISCIPLINE_WM030__ -->

## PHASE DISCIPLINE

Work is divided into explicit phases.

Rules:
- Phase changes must be **explicitly declared**
- Work outside the active phase is invalid
- A phase may span multiple chat pages

<!-- __END_WM_PHASE_DISCIPLINE_WM030__ -->

---

<!-- __START_WM_ONE_STEP_RULE_WM040__ -->

## PROGRESSIVE STEP RULE (CRITICAL)

We optimise for **forward progress without overload**.

### Default mode: **Bounded Batch Execution**

A single response **may include multiple steps** provided **all** of the following are true:

- Steps are **small, concrete, and sequential**
- Steps operate within the **same phase and context**
- Steps are **non-branching** (no forks or alternatives)
- Total steps are **explicitly enumerated**
- **Hard cap:** max **3–4 steps** per response

This replaces the earlier **“exactly one step”** constraint.

### Disallowed (still forbidden):

- Long, unstructured task lists
- Nested sub-steps
- “Choose-your-own-adventure” instructions
- Mixing unrelated files, phases, or concerns
- Anything that causes the user to stall on step 1 and abandon the rest

### Reset rule:

If confusion, friction, or loss of confidence appears:

- Immediately revert to **single-step mode**
- Or invoke **Pause In Action**

The goal is not procedural purity —  
the goal is **steady, visible progress**.

<!-- __END_WM_ONE_STEP_RULE_WM040__ -->

---

<!-- __START_WM_DOCUMENTATION_PARITY_WM050__ -->

## DOCUMENTATION PARITY RULE (CRITICAL)

**Documentation is treated as code.**

This includes:
- `PROJECT_STATE.md`
- `DECISIONS.md`
- `WORKING_METHOD.md`
- Any protocol, contract, or process file

Rules:
- All documentation must use block tags
- All edits are **full block replacements only**
- Partial, line-level edits are forbidden

Violating this rule is a **process failure**, not a formatting issue.

<!-- __END_WM_DOCUMENTATION_PARITY_WM050__ -->

---

<!-- __START_WM_BLOCK_TAG_SYSTEM_WM060__ -->

## BLOCK-TAG EDITING SYSTEM

All editable files must be divided into explicit blocks.

Rules:
- Each block has `__START__` and `__END__`
- Blocks represent a single conceptual unit
- Only entire blocks may be replaced
- Reference block names directly in discussion

Tag formats:
- Markdown / HTML: `<!-- __START__ -->`
- CSS / JS: `/* __START__ */`
- JSON:
  - no block tags
  - no comments
  - must remain valid JSON

### Block size split rule (MANDATORY)

If a block grows large enough that it is awkward to paste, review, or reason about safely, it must be split into sub-blocks **before any further changes are made**.

Rules:
- Prefer multiple small sub-blocks over one large block
- UI templates, long strings, and render logic must be split early
- Do not add features to an oversized block
- New sub-blocks must follow the numeric ID rule
- Existing block numbers must never be renumbered

This rule exists to prevent partial pastes, stale mixed versions, and silent regressions.

This document follows its own rules.

<!-- __END_WM_BLOCK_TAG_SYSTEM_WM060__ -->

---

<!-- __START_WM_NUMERIC_BLOCK_ID_WM070__ -->

## NUMERIC BLOCK ID RULE (STABILITY GUARANTEE)

All block tags must include a **stable numeric identifier**.

Rules:
- Numbers are monotonic (WM010, WM020, WM030…)
- Numbers never change once assigned
- Names may evolve; numbers must not

Numeric IDs exist to:
- eliminate ambiguity
- support long-running evolution
- allow precise references across chats

<!-- __END_WM_NUMERIC_BLOCK_ID_WM070__ -->

---

<!-- __START_WM_CONTRACTS_WM080__ -->

## CONTRACTS BEFORE FEATURES

- Core objects require written contracts
- Invariants come before polish
- Feature ideas are parked until a contract changes

<!-- __END_WM_CONTRACTS_WM080__ -->

---

<!-- __START_WM_DECISION_CAPTURE_WM090__ -->

## DECISION CAPTURE

- Durable constraints go in `DECISIONS.md`
- Decisions are concise and dated
- Chat transcripts are never copied

<!-- __END_WM_DECISION_CAPTURE_WM090__ -->

---

<!-- __START_WM_REANCHORING_WM100__ -->

## RE-ANCHORING WHEN CONTEXT DEGRADES

When context becomes unreliable:
- Do not reread chat
- Re-anchor from:
  - `PROJECT_STATE.md`
  - `WORKING_METHOD.md`
  - `DECISIONS.md`

Truth lives in the repo, not chat.

<!-- __END_WM_REANCHORING_WM100__ -->

---

<!-- __START_WM_PHASE_START_CHECKLIST_WM110__ -->

## NEW PHASE / NEW CHAT CHECKLIST (MANDATORY)

At the start of any new phase or chat:

1. Identify the current phase
2. Re-read:
   - `PROJECT_STATE.md`
   - `WORKING_METHOD.md`
   - `DECISIONS.md`
3. State:
   - what is frozen
   - what is allowed
   - the next actionable work (bounded batch rules apply)

If skipped: **stop and reset**.

<!-- __END_WM_PHASE_START_CHECKLIST_WM110__ -->

---

<!-- __START_WM_ACTIVE_FILES_DISCIPLINE_WM115__ -->

## ACTIVE FILES DISCIPLINE (MANDATORY)

Every active phase must maintain a **small “Active Files” list** inside `PROJECT_STATE.md`.

Purpose:
- eliminate “which file is doing what?” searches
- prevent drift between chat understanding and repo reality
- make handoffs and new chats deterministic

Rules:
- The “Active Files” list must name:
  - the entry point(s) (HTML/CLI)
  - the renderer/module(s)
  - the primary data inputs (JSON, fixtures)
  - the source-of-truth styles (CSS)
  - any other file that must be understood to make progress
- If a file is not referenced by the active flow, it must **not** be added “just in case”.
- Unknowns are recorded explicitly as “TBD (not yet traced)”.

<!-- __END_WM_ACTIVE_FILES_DISCIPLINE_WM115__ -->

---

<!-- __START_WM_PAUSE_IN_ACTION_WM120__ -->

## PAUSE IN ACTION PROTOCOL

Invoked by saying:

> **“Pause In Action”**

When invoked:
- Stop problem-solving
- Lock repo truth
- Prepare clean handoff to next chat
- Confirm GitHub is canonical

<!-- __END_WM_PAUSE_IN_ACTION_WM120__ -->

---

<!-- __START_WM_LONG_TERM_GOAL_WM130__ -->

## LONG-TERM GOAL

Capisco is the proving ground.

The real product is a **repeatable creative development method** that does not collapse under scale.

This document matters as much as any code.

<!-- __END_WM_LONG_TERM_GOAL_WM130__ -->

---

<!-- __START_WM_ENVIRONMENT_REALITY_CHECK_WM140__ -->

## ENVIRONMENT REALITY CHECK (MANDATORY)

Tool availability **must never be assumed**.

If tooling is missing:
- switch methods
- document the constraint
- update `PROJECT_STATE.md`

Failure to account for environment constraints is a **method failure**.

<!-- __END_WM_ENVIRONMENT_REALITY_CHECK_WM140__ -->

---

<!-- __START_WM_DISCOVERY_AND_SEARCH_RULES_WM150__ -->

## DISCOVERY & SEARCH RULES (CRITICAL)

When file locations or edit targets are unknown:

1. **Do not guess**
2. Use editor-native search
3. If discovery is non-trivial:
   - stop
   - update `PROJECT_STATE.md`

### Block-name certainty requirement (MANDATORY)

- The assistant may only instruct a **block replacement** if it can name the exact block tag (e.g. `EXAMPLES_RENDER_R141`) with confidence.
- If the assistant **cannot** name the correct block tag:
  - it must request the **entire file** (or entire relevant file section) first
  - then identify the correct block tag
  - then provide a full-block replacement

This prevents wasted cycles where the user pastes the wrong fragment or the assistant targets a block that isn’t actually present.

Repeated discovery = missing project state.

<!-- __END_WM_DISCOVERY_AND_SEARCH_RULES_WM150__ -->

---

<!-- __START_WM_SPEC_VS_STATE_RULE_WM160__ -->

## SPEC VS PROJECT STATE RULE (CRITICAL)

- **Specs** define semantics and contracts
- **PROJECT_STATE.md** defines *what is active now*

If conflict arises:
- PROJECT_STATE wins for navigation
- Specs win for semantics

<!-- __END_WM_SPEC_VS_STATE_RULE_WM160__ -->

---

<!-- __START_CHAT_HANDOVER_ARTIFACT_WM170__ -->

## CHAT HANDOVER ARTIFACT (MANDATORY)

Every **Pause In Action** must produce a canonical **Next Chat Handover Message**.

Without it, the pause is invalid.

<!-- __END_CHAT_HANDOVER_ARTIFACT_WM170__ -->

---

<!-- __START_WM_CONTEXT_SATURATION_WM180__ -->

## CONTEXT SATURATION AWARENESS (NEW)

Chat-based work has **hard context limits**.

Signals that saturation is approaching:
- Noticeably slower responses
- Repetition or loss of precision
- Increased correction cycles
- UI lag or delayed typing
- Confusion about already-established facts

Causes:
- Long-lived conversations
- High file-count reasoning
- Dense architectural discussions
- Accumulated implicit state

Rules:
- The assistant must **explicitly warn** when saturation is likely
- Either party may invoke **Pause In Action** proactively
- Saturation is not a failure  
  **Ignoring it is**

This block exists to normalise early resets rather than late recovery.

<!-- __END_WM_CONTEXT_SATURATION_WM180__ -->

---

<!-- __START_WM_ASSISTANT_SELF_ENFORCEMENT_WM190__ -->

## ASSISTANT SELF-ENFORCEMENT (MANDATORY)

The assistant is **obligated** to actively enforce this Working Method on itself.

Rules:

- The assistant must continuously check its own behaviour against this document
- Existing rules are binding, not advisory
- Momentum, convenience, or “almost done” are **not valid reasons** to bypass any rule
- If a rule is violated or about to be violated, the assistant must:
  - stop immediately
  - state which rule is being violated
  - propose the smallest compliant corrective action
- The user must not be required to restate or police the rules
- Repeated violations of the same rule indicate a process failure and require reset or Pause In Action

This block exists to close the gap between written rules and actual execution.

<!-- __END_WM_ASSISTANT_SELF_ENFORCEMENT_WM190__ -->

<!-- __END_FILE_WM000__ -->
## Cost Control

The Agent must never initiate deep test loops, expansive validation cycles, or wide file scans unless explicitly instructed.

Examples of disallowed behavior:
- Iterating through dozens of distances to verify snapping ❌
- Auto-testing multiple templates or pool sizes without request ❌
- Expanding template libraries or fallback systems on its own ❌

Cost-sensitive execution rules:
- One task = one bounded action (code edit, sample generation, or test)
- If results are unclear or incomplete, wait for human feedback
- Do not retry, revalidate, or regenerate unless instructed

If the Agent is unsure whether it is allowed to run a large loop or series of tests — it must stop and ask.

