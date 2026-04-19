---
id: 027
title: cross-spec knowledge retrieval
status: done
part_of: SpekLess
starting_sha: a9fad56
created: 2026-04-19
tags: []
---

# cross-spec knowledge retrieval

## Context

> Part of [**SpekLess**](../project.md).

SpekLess already solves *intra-feature* amnesia: the single-agent topology ensures that nothing from `spek:discuss` is lost by the time you reach `spek:execute`. But there is a second amnesia problem the framework leaves untouched: *inter-feature* amnesia. The database pooling decision made in feature 012's Discussion, the auth trade-off reasoned through in feature 031's Assumptions — those decisions are written, structured, and findable, but the framework has no retrieval layer. The accumulated spec corpus is a filing cabinet. This skill makes it a knowledge base.

`spek:recall` is a read-only, user-invoked skill that takes a natural-language query, finds relevant prior decisions across all specs, and returns a cited summary. It searches the `## Context`, `## Discussion`, and `## Assumptions` sections of every spec — the three sections that capture *why* decisions were made, all owned by `spek:discuss`.

**Done looks like:** `/spek:recall "how have we handled caching?"` returns a brief synthesis of matching decisions, each cited by spec ID and labeled with its current status, so the caller can judge how much weight to give each result.

## Discussion

### Alternatives considered

**Full-corpus read** — read every Discussion section in every spec on every query. Thorough but expensive: at 50 specs, one `recall` call reads thousands of lines regardless of relevance. Worse, the cost scales with the corpus, which inverts the "value compounds with every feature" property into a tax that grows with usage. Rejected.

**Grep-first, skip non-matches** — grep the query's terms across all `spec.md` files, collect the matching files as candidates, do section-scoped reads of Context + Discussion + Assumptions only for those candidates. Fast, bounded, and cost-stable as the corpus grows. The known failure mode: vocabulary drift — a query about "token storage" misses a spec that used "JWT session management." This is an acceptable loss. The skill is a search aid, not an infallible oracle; "no results found, try these related terms" is a valid output.

**Grep-first with full-read fallback** — when fewer than N candidates surface, fall back to reading all Discussion sections. Catches the vocabulary gap, but at the cost of unpredictable token budgets and logic that gets worse as the corpus grows. Rejected for the same reason as full-corpus read.

### Decisions made

**Retrieval is grep-first.** Query terms are grepped across all `spec.md` files. Only matching files become candidates for section-scoped reads. No fallback to full-corpus reads.

**No status filter.** Results include specs at any status — `created`, `discussing`, `done`, everything. Each result is labeled with the spec's current status so the caller can judge weight: a `done` spec's Discussion reflects a verified decision; a `discussing` spec's may still be in flux.

**Sections searched: Context, Discussion, Assumptions.** All three are authored by `spek:discuss` and capture *why* decisions were made. Plan and Verification sections are tactical/outcome-oriented and are excluded.

**Output is a cited flat list.** Each result surfaces the spec ID, title, status, and the relevant excerpt or synthesized one-liner from the matching section. No attempt at a narrative synthesis across specs — the caller's job is to weigh the results, not the skill's.

## Assumptions

None. This skill has no external dependencies, no data contracts, and no third-party availability bets — it reads only files that already exist in `.specs/`.

## Plan

### Tasks

1. [x] Write `skills/recall.md`
2. [x] Sync `recall.md` to installed copies
3. [x] Update skill inventories in docs and CLAUDE.md
4. [x] Revise `skills/recall.md` to emit a synthesized summary before the cited matches
5. [x] Sync the revised recall skill to installed copies
6. [x] Update external docs to describe the summary-first recall output

### Details

#### 1. Write `skills/recall.md`

**Files:** `skills/recall.md` (new)

**Approach:** Standard skill shape — Inputs / Reads / Behavior / Writes / Output to user / Hard rules. Inputs: required query string (error if missing). Reads: `config.yaml` for `specs_root`, then grep the key content terms from the query case-insensitively across all `<specs_root>/*/spec.md` files to find candidates. For each candidate file, read frontmatter (id, title, status) plus section-scoped Context, Discussion, and Assumptions (Grep `^## ` to locate boundaries, then offset/limit Read per section). Output: flat cited list — one block per matching spec showing `[ID status] title`, which section matched, and a one-line excerpt of the relevant passage. "No results found — try different terms" message when grep returns nothing. Hard rules: strictly read-only, no sub-agents, no status filter, grep-first only (no full-corpus fallback), query argument is required. Keep the file under ~300 lines per the principles length budget.

#### 2. Sync `recall.md` to installed copies

**Files:** `.claude/commands/spek/recall.md`, `~/.claude/commands/spek/recall.md`, `.codex/skills/spek-recall/SKILL.md`, `~/.codex/skills/spek-recall/SKILL.md`, `.opencode/commands/spek/recall.md`, `~/.config/opencode/commands/spek/recall.md`

**Approach:** Per the Sync Rule: check for existence of each install root before writing — do not create directories that aren't already there. Apply the same render rules as `install.js`: replace `{{CMD_PREFIX}}` with the correct agent prefix, replace canonical `spek:<skill>` with the configured namespace. For Codex, render `spek:<skill>` as `spek-<skill>` and write `SKILL.md` as UTF-8 without BOM (a BOM before `---` breaks Codex YAML frontmatter parsing).

#### 3. Update skill inventories in docs and CLAUDE.md

**Files:** `CLAUDE.md`, `README.md`, `docs/architecture.md`, `docs/comparison.md`

**Approach:** Add `recall.md` to the `skills/` tree in `CLAUDE.md` under the convenience entries alongside `status.md` and `resume.md`. Grep each of `README.md` and `docs/architecture.md` for `resume` or `status` to locate their skill inventory positions, then insert `recall` as a convenience skill (read-only query). Evaluate `docs/comparison.md` for the design-philosophy reasoning from Discussion (rejected retrieval strategies: full-corpus read, grep+fallback); add a feature matrix row and a novel-features entry capturing why grep-first was chosen and what alternatives were ruled out — this is exactly what `comparison.md` exists to preserve. Confirm `docs/maintenance.md` needs no change via a quick grep before skipping.

#### 4. Revise `skills/recall.md` to emit a synthesized summary before the cited matches

**Files:** `skills/recall.md`

**Approach:** Keep the existing grep-first candidate selection and section-scoped reads exactly as-is; the new behavior is a presentation-layer addition after retrieval, not a semantic-search change. Update the skill so that once matching excerpts are gathered, it writes a 1-2 sentence synthesis that states the dominant answer to the user's query in plain language, then follows with the cited per-spec result blocks. Constrain the synthesis to information supported by the retrieved passages, avoid inventing facts when results conflict or are thin, and make the no-results path remain unchanged.

#### 5. Sync the revised recall skill to installed copies

**Files:** `.claude/commands/spek/recall.md`, `~/.claude/commands/spek/recall.md`, `.codex/skills/spek-recall/SKILL.md`, `~/.codex/skills/spek-recall/SKILL.md`, `.opencode/commands/spek/recall.md`, `~/.config/opencode/commands/spek/recall.md`

**Approach:** Re-apply the Sync Rule after the source skill changes, again checking each install root for existence before writing and avoiding creation of missing roots. Preserve the existing render behavior: canonical `spek:<skill>` references rewritten to the configured namespace, agent-specific command prefix rendering, and UTF-8 without BOM for Codex `SKILL.md` files.

#### 6. Update external docs to describe the summary-first recall output

**Files:** `README.md`, `docs/architecture.md`, `docs/comparison.md`

**Approach:** Update user-facing and contributor docs anywhere `spek:recall` is still described as returning only a flat cited list so they now describe a short synthesized answer followed by cited matches. Re-evaluate `docs/architecture.md`, `docs/maintenance.md`, and `docs/comparison.md` explicitly per the Documentation principle; architecture and comparison should reflect the new "summary-first, citations-second" output contract, while maintenance likely needs no change unless it mentions recall's output shape. Do not ask `spek:execute` to edit this feature spec itself: `spec.md` narrative sections are owned by other workflow steps, so any request to rewrite feature 027's Context or Discussion must be handled outside execution.

## Review

**Summary:** The design is clean and well-bounded. Grep-first, section-scoped reads is the correct retrieval strategy — cost-stable as the corpus grows, no novel architecture, no external dependencies. The three-task decomposition covers everything the Context promises. One warning stands: Task 3 dismisses `docs/comparison.md` on the wrong grounds, potentially leaving durable design reasoning undocumented. Otherwise the plan is ready.

**Critical findings:**
- None.

**Warnings:**
- **Task 3 dismisses `docs/comparison.md` on incorrect grounds.** The plan states comparison.md "doesn't enumerate individual skills and needs no change" — true that it doesn't enumerate skills, but that's beside the point. `comparison.md`'s purpose is to document SpekLess's design philosophy: what the framework deliberately keeps, rejects, and invents. The Discussion section contains detailed reasoning on two rejected retrieval strategies (full-corpus read; grep-first with full-read fallback). That reasoning is exactly the content `comparison.md` exists to preserve, so future contributors don't re-litigate settled choices. Conflating skill enumeration with design-philosophy coverage causes the skip. The Documentation principle also explicitly requires evaluating all three docs.

**Notes:**
- **`docs/maintenance.md` skip is asserted, not verified.** The claim that it needs no change is plausible (it's a process checklist, not a skill registry), but the executor should do a quick grep before skipping — the plan's assertion is not evidence.
- **"None" in Assumptions undersells the grep-first trade-off.** Vocabulary drift is a named, accepted failure mode in Discussion. Making it an explicit assumption — "grep-first retrieval; vocabulary mismatch returns empty results, which is accepted behavior, not a defect" — gives `spek:verify` something concrete to confirm and signals to callers that zero results mean "not found," not "broken."

**Recommended next move:** `spek:execute` — no critical issues block execution. The warning is resolvable inline during Task 3 by reading `comparison.md` before deciding to skip it.

## Verification

**Task-by-task check:**
- Task 1 - Write `skills/recall.md`: ✓ - [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:12) contains the required Inputs/Reads/Behavior/Writes/Output/Hard rules shape, and [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:77) enforces grep-first, no-status-filter, and read-only behavior.
- Task 2 - Sync `recall.md` to installed copies: ✓ - [.claude/commands/spek/recall.md](/D:/develop/projects/spek-less/.claude/commands/spek/recall.md:1), [.codex/skills/spek-recall/SKILL.md](/D:/develop/projects/spek-less/.codex/skills/spek-recall/SKILL.md:1), and [.opencode/commands/spek/recall.md](/D:/develop/projects/spek-less/.opencode/commands/spek/recall.md:1) exist with the expected agent-specific command names.
- Task 3 - Update skill inventories in docs and CLAUDE.md: ✓ - `recall` is listed in [CLAUDE.md](/D:/develop/projects/spek-less/CLAUDE.md:69), [README.md](/D:/develop/projects/spek-less/README.md:128), [docs/architecture.md](/D:/develop/projects/spek-less/docs/architecture.md:105), and [docs/comparison.md](/D:/develop/projects/spek-less/docs/comparison.md:182).
- Task 4 - Revise `skills/recall.md` to emit a synthesized summary before the cited matches: ✓ - [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:43), [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:72), and [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:81) require a summary-first, evidence-bound output contract.
- Task 5 - Sync the revised recall skill to installed copies: ✓ - the same summary-first behavior appears in [.claude/commands/spek/recall.md](/D:/develop/projects/spek-less/.claude/commands/spek/recall.md:43), [.codex/skills/spek-recall/SKILL.md](/D:/develop/projects/spek-less/.codex/skills/spek-recall/SKILL.md:43), and [.opencode/commands/spek/recall.md](/D:/develop/projects/spek-less/.opencode/commands/spek/recall.md:43).
- Task 6 - Update external docs to describe the summary-first recall output: ✓ - [README.md](/D:/develop/projects/spek-less/README.md:128), [docs/architecture.md](/D:/develop/projects/spek-less/docs/architecture.md:105), and [docs/comparison.md](/D:/develop/projects/spek-less/docs/comparison.md:186) all describe `spek:recall` as returning a brief synthesized answer followed by cited matches.

**Principles check:**
- Skill file conventions and length budget: ✓ - [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:12) follows the standard section order and stays well under the ~300-line cap.
- Single-agent topology and read-only boundaries: ✓ - [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:10) and [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:82) keep the skill strictly read-only with no sub-agents.
- Sync Rule: ✓ - the source skill and all three project-local rendered copies are present and aligned: [skills/recall.md](/D:/develop/projects/spek-less/skills/recall.md:1), [.claude/commands/spek/recall.md](/D:/develop/projects/spek-less/.claude/commands/spek/recall.md:1), [.codex/skills/spek-recall/SKILL.md](/D:/develop/projects/spek-less/.codex/skills/spek-recall/SKILL.md:1), [.opencode/commands/spek/recall.md](/D:/develop/projects/spek-less/.opencode/commands/spek/recall.md:1).
- Documentation cascade: ✓ - the feature is reflected in contributor inventory and user-facing docs: [CLAUDE.md](/D:/develop/projects/spek-less/CLAUDE.md:69), [README.md](/D:/develop/projects/spek-less/README.md:128), [docs/architecture.md](/D:/develop/projects/spek-less/docs/architecture.md:105), and [docs/comparison.md](/D:/develop/projects/spek-less/docs/comparison.md:186).

**Goal check:** The implementation achieves the Context goal. SpekLess now has a dedicated read-only retrieval skill that searches `Context`, `Discussion`, and `Assumptions`, labels results with spec status, and presents them as a brief synthesis followed by cited matches. The rendered copies and documentation make the capability discoverable across Claude Code, Codex, and OpenCode, which supports the project success metrics around reusable canonical skills and low-overhead workflow continuity.

**Issues found:**
None.

**Status:** READY_TO_SHIP

## Retrospective

**Outcome:** SpekLess gained a read-only `spek:recall` skill that turns the accumulated spec corpus into a searchable knowledge base for prior decisions. The delivered work matches the feature goal: the skill searches only Context, Discussion, and Assumptions, labels results with spec status, syncs across installed agent copies, and documents both the capability and its grep-first design rationale.

**What went well:**
- The implementation stayed tightly bounded: one new skill, one sync pass, and the expected documentation touch points, with verification finding no gaps against the plan.
- The skill shape and guardrails were straightforward to encode because existing principles already define section order, read-only boundaries, and sync behavior.

**What surprised us:**
- The review warning about `docs/comparison.md` was materially useful. The plan initially framed comparison coverage too narrowly, and execution corrected that by documenting the rejected retrieval alternatives there instead of treating the file as an inventory-only concern.
- Verification had to account for the feature being staged rather than committed, which reinforced that SpekLess's audit anchor is helpful but does not replace checking actual on-disk or indexed state.

**Principle candidates:**
- `During verification, if \`git diff <starting_sha>..HEAD\` is empty, also check the staged diff before concluding that no implementation changes exist.` â€” none; useful verifier behavior, but too implementation-specific to elevate into `principles.md`.
- `When review identifies a documentation target that plan underspecified, execution should treat that as part of completing the feature rather than as optional follow-up.` â€” already covered by `## Documentation` in [.specs/principles.md](/D:/develop/projects/spek-less/.specs/principles.md:35).
