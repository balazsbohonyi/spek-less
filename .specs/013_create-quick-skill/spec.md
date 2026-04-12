---
id: "013"
title: create quick skill
status: done
part_of: SpekLess
starting_sha: 0ababfe582cb5467e7393a145cedf2028a589035
created: 2026-04-12
tags: []
---

# create quick skill

## Context

> Part of [**SpekLess**](../project.md).

The full SpekLess workflow (new → discuss → plan → execute → verify) has real friction for micro-tasks: single-file fixes, mechanical renames, adding JSDoc to a public API. In practice this means developers skip SpekLess entirely for small tasks, losing the SHA anchor, execution log, and traceability that make the framework valuable. The task still gets done, but there's no spec record — nothing to resume from, nothing for verify to check against.

`/spek:quick` closes this gap: a single-invocation skill that delivers SpekLess guarantees (SHA anchor, execution log, auto-generated plan, verify-compatible spec) with minimal ceremony. The user describes the task in one sentence; the skill creates the spec folder, derives a lightweight Plan, executes immediately, and writes to execution.md. No discussion, no planning session, no staged workflow — just "do this small thing and leave a trail."

**Goal:** A developer can invoke `/spek:quick "fix the broken import in auth.ts"` and get full SpekLess traceability in a single step. The resulting spec is indistinguishable to downstream skills (`/spek:verify`, `/spek:status`, `/spek:commit`) from any other spec — no special-casing required.

**Out of scope:** Interactive gates, complexity detection, or any friction that would make quick slower than just asking Claude directly. The user decides when quick is appropriate.

## Discussion

### Alternatives considered

**Structural options for what the skill produces:**

- **Option A — Full folder, stripped spec.md** (chosen): Creates a numbered `.specs/NNN_slug/` folder with a `spec.md` containing frontmatter + Context + auto-generated Plan + Verification placeholder. No Discussion, no Assumptions. Identical folder shape to all other specs — `/spek:status`, `/spek:verify`, and `/spek:commit` work without modification.
- **Option B — Execution-only**: Creates the folder with only `execution.md`, no `spec.md`. Lighter, but breaks the assumption every spec folder has a `spec.md`. Would require special-casing in status and verify.
- **Option C — Shared quick-log**: Appends to a single `.specs/quick-log.md` file. Truly minimal but diverges from "document is the state" and can't be addressed individually by downstream skills.

Option A was chosen because it has the smallest delta from existing conventions and zero impact on other skills.

**Frontmatter field to identify quick specs:**

- **`quick: true`** (boolean): Simple, readable. But one-dimensional — can't distinguish adopted, migrated, or standard specs from each other.
- **`type: <enum>`** (chosen): Maps cleanly to creation paths. Each entry skill writes its own type. Values: `standard` (full workflow), `quick` (this skill), `adopted` (/spek:adopt), `migrated` (future migration skill). Skills that read `type:` treat absent field as `standard` for backwards compatibility with existing specs.

**"When to use" gate:**

A complexity-detection gate (word count heuristics, interactive confirmation) was considered and rejected. It adds friction that defeats the purpose of the skill. The gate is documentary only: the skill description and README state clearly that quick is for tasks you can describe in one sentence. Users are trusted to decide.

### Decisions made

1. **Structure:** Option A — full folder, stripped spec.md with Context + auto-generated Plan + Verification placeholder.
2. **Spec identity:** `type: quick` in frontmatter. All existing skills treat absent `type:` as `standard`.
3. **Auto-generated Plan:** Derived from the task description before execution. Gives `/spek:verify` a checking surface without requiring a special code path for quick specs. `/spek:quick` ticks the task checkbox itself as it executes.
4. **No gate:** Trust the user. Description clarity is the only requirement.
5. **Documentation:** README workflow section updated to mention `/spek:quick`; skill description opens with the "use for smaller tasks with SpekLess guarantees" framing.

### Framing

`/spek:quick` is `/spek:new` + auto-plan + `/spek:execute` collapsed into one invocation. The auto-plan is derived from the task description rather than from a real planning session. This framing keeps the implementation obvious and means downstream skills see a normal spec.

### Open questions

None. Design is closed.

## Assumptions

<!--
Written by /spek:discuss. Things taken as given before building — external service
behavior, data contracts, scale limits, third-party availability.
Checkboxes ticked [x] by /spek:verify when confirmed in the implementation.
Unverifiable assumptions are flagged explicitly rather than left silently unchecked.
-->

## Plan

### Tasks

1. [x] Create `skills/quick.md`
2. [x] Update `README.md` to document `/spek:quick`
3. [x] Update `docs/architecture.md` and `docs/maintenance.md`
4. [x] Sync `quick.md` to installed copies

### Details

#### 1. Create `skills/quick.md`

**Files:** `skills/quick.md`

**Approach:** Write the skill file following standard conventions (frontmatter + Inputs / Reads / Behavior / Writes / Output to user / Hard rules). The skill accepts a required task description argument. Behavior: (1) determine next spec number via Glob same as `/spek:new`; (2) derive slug from description; (3) create the spec folder and write a stripped `spec.md` inline — frontmatter includes `type: quick` and `status: executing`, sections are `## Context` (filled from description), `## Plan` (auto-generated 1–3 atomic tasks derived from the description), `## Verification` (placeholder HTML comment); no `## Discussion`, no `## Assumptions`; (4) capture `starting_sha` via `git rev-parse HEAD`, write to frontmatter; (5) create `execution.md` from template; (6) execute tasks inline just as `/spek:execute` would: log entries, code changes, checkbox ticking; (7) set `status: verifying` when all tasks checked. The plan auto-generation must be concrete and checkable — not just restate the description, but break it into file-level steps. Keep the file under ~300 lines (principles).

#### 2. Update `README.md` to document `/spek:quick`

**Files:** `README.md`

**Approach:** Add `/spek:quick` to the skills reference list and to the workflow section. Frame it as "for small tasks where the full workflow would be overhead — describe in one sentence, get full traceability." Keep the addition short (3–5 lines); the skill's own description carries the detail. Do not duplicate the Discussion doc here.

#### 3. Update `docs/architecture.md` and `docs/maintenance.md`

**Files:** `docs/architecture.md`, `docs/maintenance.md`

**Approach:** In `docs/architecture.md`: (a) add `quick.md` to the File Inventory skill list; (b) add a `type:` row or note to the spec.md ownership table calling out that `type: quick` is written by `/spek:quick` and absent = `standard`; (c) note in the lifecycle section that quick specs enter at `executing`, skipping `created/discussing/planning`. In `docs/maintenance.md`: update the smoke test step 3 reference from "all 10 skill files" to "all 11 skill files."

#### 4. Sync `quick.md` to installed copies

**Files:** `.claude/commands/spek/quick.md`, `~/.claude/commands/spek/quick.md` (if dir exists)

**Approach:** Mechanical sync per the Sync Rule in `principles.md`. After task 1 creates `skills/quick.md`, copy it to the project-local install at `.claude/commands/spek/quick.md`. Check whether the global install directory `~/.claude/commands/spek/` exists before copying — do not create it if absent. This keeps the running skills and the source in sync, which is mandatory per principles.

## Verification

**Task-by-task check:**
- Task 1 — Create `skills/quick.md`: ✓ — 142 lines, correct section order (Inputs/Reads/Behavior/Writes/Output/Hard rules), `starting_sha` uses full SHA, synced copy confirmed identical
- Task 2 — Update `README.md`: ✓ — intro "ten → eleven", section header updated, `/spek:quick` in entry points table, version history line updated to "Eleven skills"
- Task 3 — Update `docs/architecture.md` and `docs/maintenance.md`: ✓ — `quick.md` and `spekless-block.md.tmpl` in inventory; `type: quick` frontmatter note present; lifecycle paragraph added; smoke test count 10 → 11
- Task 4 — Sync `quick.md` to installed copies: ✓ — `.claude/commands/spek/quick.md` present and identical; global install absent, correctly skipped

**Verify-fix check:**
- Fix 1–9 (SHA wording, CLAUDE.md counts/tree, template file, install.js refactor, principles sync rule, architecture inventory, kickoff grouping, template count, version history): ✓ — all confirmed in final working tree

**Principles check:**
- Single-agent topology: ✓ — hard rule "Never spawn sub-agents" in `skills/quick.md`
- Section ownership: ✓ — skill owns only the spec and execution.md it creates
- Document is the state: ✓ — no STATE.md or checkpoint files introduced
- Append-only log: ✓ — hard rule present in `skills/quick.md`
- Skill < ~300 lines: ✓ — 142 lines
- Code style sections in order: ✓ — Inputs / Reads / Behavior / Writes / Output to user / Hard rules
- Sync Rule: ✓ — `quick.md` synced to `.claude/commands/spek/`; spekless-block.md.tmpl update rule added to `principles.md`
- No forced commits: ✓ — AskUserQuestion gate present; never automatic

**Goal check:** The goal was full SpekLess traceability in a single invocation, with the resulting spec indistinguishable to downstream skills. `skills/quick.md` delivers this: numbered spec folder, `type: quick` frontmatter, auto-generated Plan, inline execution, `status: verifying` at end — no downstream special-casing required. The installer now derives the CLAUDE.md SpekLess block from `_templates/spekless-block.md.tmpl`, so future skill additions are automatically reflected in newly installed projects. All out-of-scope items (gates, complexity detection) are absent.

**Issues found:** None.

**Status:** READY_TO_SHIP
