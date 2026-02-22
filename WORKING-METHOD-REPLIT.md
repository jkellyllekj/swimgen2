Understood. I have compiled the full, unabridged, and unpruned master document. This version integrates the Permanent Code Integrity Protocol as the lead section and updates the existing rules to ensure that master documents are protected from truncation.

Copy everything below and replace the current contents of WORKING-METHOD-REPLIT.md entirely.

Working Method: Replit Agent Edition
Last updated: 2026-02-11

Status: Authoritative - Code Integrity Edition

============================================================================
PERMANENT CODE INTEGRITY PROTOCOL
This protocol is the primary guardrail for all project development:

Holistic Awareness: The Assistant must maintain constant awareness of all project code and logic across all master files.

Unabridged Updates: When updating Master Documents (e.g., project-state.md, WORKING-METHOD-REPLIT.md, index.js, styles.css), the Assistant must provide the entire, unabridged file. Pruning, truncating, or using placeholders (e.g., "// ... rest of code") is strictly prohibited.

Preservation of Progress: Neither the Assistant nor the Agent may erase, truncate, or lose any existing progress, long-term roadmap items, or established logic.

Logical Authority: The Assistant (Architect) provides the logic; the Agent is the execution arm. Do not delegate logical thinking or architectural decisions to the Agent.

============================================================================

Purpose
This document defines how we work inside Replit using the Agent so we move fast, avoid context decay, and do not waste time or money. This is a reusable working method intended to apply to any project.

Core truth
GitHub is the source of truth for code history and rollback. Replit is the workspace where the Agent edits and runs code.

Git first workflow
We now use a Git first workflow so ChatGPT can read files directly from GitHub and we do not need to upload zips or paste large files.

Rules:

GitHub is the single source of truth.

Replit is a working copy only.

ChatGPT reads project files directly from GitHub.

Replit Agent is execution only.

File link formats:

Preferred for ChatGPT reading: GitHub file links with ?plain=1
Example: .../blob/main/index.js?plain=1

Also acceptable: raw links
Example: https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/main/index.js

Pinning for stability:

For precise debugging, pin links to a commit hash so the file cannot change under us.

On a GitHub file page, pressing y converts the URL to a commit pinned permalink.

Standard flow:

ChatGPT opens project-state.md first and follows its links to inspect the specific target file(s) before deciding the next change. ChatGPT must not issue agent code edit instructions based on assumptions.

ChatGPT writes an execution only prompt for the Replit Agent, or the human edits manually.

Replit Agent makes the change and tests exactly what was requested.

Commit and push to GitHub.

ChatGPT re reads the updated GitHub files.

Context decay control
The assistant must always provide the full, unabridged master document when updating core project files (project-state.md, WORKING-METHOD-REPLIT.md, index.js, styles.css).

Never prune or truncate these files to ensure the long-term roadmap and current logic are never lost.

For very small logic tweaks within a session, precise targeted edit instructions are allowed, but any "Master Save" or major edit requires a full-file output.

This avoids context decay and protects the project's "Source of Truth."

Chat is for planning, reasoning, review, and decisions. The Agent is an execution tool, not the primary thinker.

Caller and Agent Execution Protocol
The agent must never invent functions, variables, or code blocks.

The caller is responsible for reading index.js directly and identifying exact blocks for modification.

All agent instructions must reference real, existing code from index.js.

If project-state.md and index.js disagree on code structure, index.js takes precedence.

Any formatting or logic changes must occur only at verified formatting points in code (e.g. display assembly block).

Agent does not search, infer, or explore — only executes scoped changes as defined by the caller.

All input validation and global constraints (e.g. minimum workout length) must be enforced at the workout generation entry point.

Caller is responsible for identifying and extracting this entry point for the agent.

Agent must not patch deep helper logic (e.g. set builders or line formatters) to enforce top-level rules.

AGENT COST CONTROL AND SCOPE LOCK
Purpose
The agent is execution only. The architect does all analysis, planning, and design in chat. The agent never explores, refactors, or decides on its own.

Hard scope rules

The agent may only edit the exact files explicitly listed in the message to agent.

The agent may only change the exact blocks or exact line ranges explicitly provided by the architect.

One commit per message unless the architect explicitly asks for more.

If the agent discovers a deeper issue, it must STOP and report. It must not continue with new ideas or additional changes.

Forbidden without explicit permission

Increasing retry counts.

Relaxing validators or constraints.

Expanding test coverage beyond what is requested.

Any large refactor, cleanup, or rewrite.

Adding new helper systems or new logic layers.

Budget rules

Default budget is 2 minutes of agent time.

Default limit is 1 file change.

If the work cannot be completed inside the budget, stop and report what is missing.

Required message format for tasks
The architect must provide:

Goal in one sentence.

File list.

Exact code to insert or exact blocks to replace.

Exact tests to run.

Commit message.

If any of these are missing, the agent must ask for the missing item and stop.

Documents
We keep three documents only.

Project state file
This is the authoritative, living record of the project. It contains vision, constraints, decisions, known limitations, and next steps.

The filename is project-state.md.

WORKING-METHOD-REPLIT.md
This file. It defines how we collaborate with the Agent.

COACH_DESIGN_NOTES.md or other design notes
Optional, project specific, deep intent documents. These are not required reading for the Agent unless explicitly instructed.

The Agent must keep the project’s designated project state file current when instructed.

Agent operating mode
Default mode is EXECUTION ONLY. The Agent does not own planning, architecture, or product decisions unless explicitly asked. The human plus ChatGPT do the thinking. The Agent does the edits, runs the app, and reports results.

Agent scope, execution only
By default, the Agent must not read project state or working method files. These documents are for the human and ChatGPT.

The Agent must only do what it is explicitly instructed to do in the current message. The Agent must not update docs, propose next steps, or infer intent unless explicitly instructed.

If the Agent is asked to run tests, it must run exactly the specified test and report only the requested output.

Instruction format rule
ALL instructions sent from ChatGPT to the agent MUST:

Be enclosed in a single code block

Begin with "START MESSAGE TO AGENT"

End with "FINISH MESSAGE TO AGENT"

Contain all actions, tests, and reporting requirements inline

Never rely on prose outside the code block

This rule is mandatory and overrides informal instructions.

Session start rule
At the start of every Agent session, the Agent must do this in order.

Wait for explicit instructions.

Execute only what is requested.

Do not add commentary, next steps, or doc updates unless asked.

If the Agent skips this, stop and restart the session.

Planning rule
Planning is done in chat, not by the Agent. The Agent must not generate its own plans unless explicitly asked to do so. If a task is already well defined, the Agent must skip planning and execute directly.

Change size rule
Agent must work in small, bounded micro changes. One goal per micro change.

An Agent run may include up to 3 micro changes if they are fully independent and low risk. Each micro change must be committed separately.

Touch as few files as possible. No refactors unless the project’s designated project state file explicitly allows it.

Testing rule, non negotiable
The Agent must not claim something works unless it was tested. For every change, the Agent must perform the relevant checks and report results. This includes one of the following, depending on the task.

Restart the workflow and run the app.

Generate a sample output and visually verify it.

Run the relevant command or test if applicable.

If something cannot be tested in Replit, the Agent must say why and describe the required manual step.

Definition of done
A change is done only when all of the following are true.

Code change is made.

App or tests have been run.

Errors are fixed or clearly listed.

The project’s designated project state file is updated if instructed.

Context decay control, recovery
When the session feels confused, repetitive, or risky:

Stop.

Re read the project’s designated project state file.

Summarise what is currently true.

Continue with one small change only.

New project intake, first session only
When starting a new project, the Agent must ask and record answers in the project’s designated project state file.

Target platforms now.

Platforms possibly needed later.

Prototype or long term product.

Login, payments, ads, notifications, offline, sync.

Data and storage needs.

Deployment target.

Team size.

Only then may the Agent recommend a stack and record the decision.

Safety rails
The Agent must never do the following without explicit permission.

Delete databases.

Delete large folders.

Replace the whole app structure.

Migrate frameworks.

If something big is needed, the Agent proposes and waits.

Pause In Action protocol
Invoked by saying “Pause In Action” or “pause in action”.

When invoked, the Agent must immediately do the following.

Stop problem solving and halt work.

Ensure code is saved and in a stable state.

Update the project’s designated project state file with current reality, including:

Next steps

Decisions made

Vision updates

Observed failures

Produce a Handover Message that includes:

What was done this session

Current state

Outstanding initiatives

Next steps

Blockers

Files touched

Produce a Next Agent Prompt that can be used to resume work exactly where it left off.

The project’s designated project state file is the memory. The handover and prompt preserve continuity between sessions.

Stability note
This document should change rarely. The project’s designated project state file changes often. If this document needs to change, it should be discussed and agreed deliberately.

CSS & Layout Architecture Locks (2026-02-22)
The following CSS geometry values have been device-tested on Samsung S24+ and are locked. Do not modify without physical device verification.

Final CSS Geometry:
- Side Gutters: 15px (fixed for all devices, all panels).
- Card Gaps: 12px vertical spacing between sets.
- Scroll Offset: 24px margin-top on `#workoutNameDisplay` to ensure the generator panel scrolls fully out of view while keeping cards perfectly aligned below the status bar.
- Scroll Margin: `scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 14px)` on `#workoutNameDisplay` and `#cards`.
- Safe Area Spacer: `.safe-area-spacer` height `env(safe-area-inset-top, 0px)` -- 0px fallback because Android WebView handles its own inset.
- ResultWrap Top Margin: 4px.

Effort Level Bar:
- Labels ("Easy", "Moderate", "Strong", "Hard", "Full Gas") centered below icons.
- "Moderate" uses 12px font-size (longest word); others use 14px.
- Fixed point-size constraints active to prevent Android accessibility/font-scaling from breaking layout.

Safe Area Logic:
- Top-spacer height optimized for S24+ notch at `env(safe-area-inset-top, 0px)`.
- Do not add extra px fallback -- Android WebView provides the correct inset value natively.

Splash Screen Text:
- All splash text uses viewport-width (vw) units (not px) to prevent Android system font scaling overflow.
- "SwimSum": 15vw, "Workout Generator": 5.5vw, bullets: 4.2vw.
- Container: 90vw width, max-width 500px.
- Known High-Priority Bug: Splash text may still break on devices with very high zoom/accessibility settings. Future fix: SVG logo or hard-constrained container.

============================================================================

Agent Instruction Boundaries (Snapping + Regeneration Logic)
Effective Jan 2026, the Agent must follow these rules when working on snapping, set math, or regeneration logic:

DO NOT use any fallback methods like safeSimpleSetBody() to force totals.

DO NOT allow templates that mismatch the section's assigned distance.

DO NOT use plus or minus range matching in pickTemplate() or findBestFit(). Only exact matches are valid.

DO NOT inject single line fillers (example: 1x50 easy) to close gaps.

DO NOT reintroduce per pool snapping logic. All pools use a shared engine.

All regeneration (Main, Drill, etc.) must:

Retain original snapped allocation

Match math exactly

Snap to 2 times poolLength

Swimmer Math Requirement: Every distance must be a multiple of the pool length. For distances > 1 length, the count must be even (2, 4, 6, etc.) to ensure the swimmer returns to the wall.

Instruction Delivery Protocol
When the ChatGPT assistant provides instructions to the human, those instructions must ONLY be for the human to copy and send to the Replit Agent

The ChatGPT assistant must NEVER ask the human to directly edit code, search for functions, or perform implementation work

All implementation instructions must be formatted as executable Agent commands within START/FINISH MESSAGE TO AGENT blocks

The human's role is to review plans and deliver Agent instructions, not to perform coding tasks

Once you have replaced the file content on Replit, remember to commit and push to GitHub to lock this version into the project history.

Would you like me to start the "Pause in Action" protocol now?