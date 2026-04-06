# LeanSpec Architecture

This document is the refined design reference for LeanSpec.

---

## Design principles

These are the foundational commitments every other decision follows from:

1. **The document is the state.** No separate state files, no lockfiles, no checkpoint machinery. The presence and content of sections within `spec.md` and `execution.md` is the entire representation of "where is this feature."
2. **Skills are idempotent and section-scoped.** Each skill owns exactly one section of the spec. Re-running a skill rewrites that section in full from the current inputs. The one exception is `/lean:execute`, which is append-only for `execution.md` and may tick checkboxes in the Plan's task list.
3. **Sub-agents are context firewalls, not workflow roles.** LeanSpec does not have a "planner agent" or a "reviewer agent." It has a main conversation that invokes sub-agents only to absorb large reads and return distilled summaries — preserving the main context.
4. **Workflow is a menu, not a pipeline.** The four workflow skills (`discuss`, `plan`, `execute`, `verify`) have a natural order but no enforced sequence. Any skill is skippable. Any skill is re-enterable. Mid-execute course correction is just "run `/lean:plan` again, then `/lean:execute` again" — no special intervention mode.
5. **Human-readable documents first.** Spec files are written to be read by humans as design docs, not as machine state. Fragmenting a feature across many files would optimize for tooling at the expense of readability.
6. **Commits are sacred to the user.** The framework never commits automatically. `starting_sha` is captured passively as an audit anchor for `/lean:verify`. `/lean:commit` exists as a user-triggered convenience: it drafts a spec-anchored message and runs `git commit` *only* after an explicit AskUserQuestion confirmation, never with `--amend`, never with `--no-verify`.

---

## Topology

LeanSpec uses a **single-agent + targeted sub-agents** topology:

- **Main conversation** — you talking to Claude Code, invoking slash skills. This is where all writes happen: editing `spec.md`, appending to `execution.md`, modifying source code.
- **Sub-agents** — spawned only when a skill needs to absorb a large read (broad codebase exploration, fresh-lens verification) without polluting the main context. The sub-agent does its work in an isolated conversation and returns a distilled summary.

We do NOT use:

- A fan-out of specialized agents per workflow step (GSD's model)
- Role-based agents (PM, architect, QA — BMAD's model)
- A dedicated agent for every sub-task

This choice is the single largest token-cost difference between LeanSpec and GSD.

### When sub-agents fire

| Skill | Sub-agent used | Trigger |
|---|---|---|
| `/lean:plan` | **Explore** (built-in) | When understanding the feature area would take more than `subagent_threshold` targeted reads/greps (default: 3). |
| `/lean:plan` | **Plan** (built-in, optional) | After drafting a plan, optionally delegates a critique pass. Replaces GSD's plan-checker. Skip for simple features. |
| `/lean:adopt` | **Explore** (built-in) | When the user supplies a broad scope ("the auth module") rather than specific files. |
| `/lean:verify` | **general-purpose** (built-in) | For non-trivial features (more than ~5 tasks or large diffs). The fresh sub-agent conversation is the mechanism behind "fresh lens." |

No custom agent types are defined in v1.0.0. The "verifier" behavior is a prompt pattern applied to the general-purpose sub-agent, not a new agent class. If the pattern proves unreliable in practice, a dedicated `spec-verifier` sub-agent can be added post-v1.0.0 without disturbing the core design.

---

## Artifact model

### `.specs/` layout

```
.specs/
├── config.yaml          # per-project framework config (written by installer)
├── principles.md        # project constitution — HOW we build, read by every skill
├── project.md           # product vision / PRD — WHAT & WHY, read by skills as context (optional)
├── templates/          # framework templates (copied by installer, overwritten on re-install)
├── 001_<slug>/
│   ├── spec.md          # living design doc
│   └── execution.md     # append-only work journal
├── 002_<slug>/
│   ├── spec.md
│   └── execution.md
└── ...
```

Features are numbered sequentially and prefixed with a zero-padded integer. Numbers are assigned at creation time and never reused or backfilled. Gaps from deleted features are acceptable and expected.

### `spec.md` sections and ownership

| Section | Owner skill | Rewrite behavior |
|---|---|---|
| Frontmatter (YAML) | shared — each skill can update its relevant fields | `status` advances; `starting_sha` written once by `/lean:execute`; other fields stable after creation |
| `## Context` | `/lean:new` (skeleton), `/lean:discuss` (fills) | Rewritten by `/lean:discuss` only when the problem/goal/constraints shift |
| `## Discussion` | `/lean:discuss` | Fully rewritten on every `/lean:discuss` run |
| `## Plan` → `### Tasks` | `/lean:plan` owns titles/structure; `/lean:execute` owns checkbox state | `/lean:plan` rewrites titles/structure; on rewrite, checkbox state is preserved for unchanged tasks and reset for changed ones |
| `## Plan` → `### Details` | `/lean:plan` | Fully rewritten on every `/lean:plan` run |
| `## Verification` | `/lean:verify` | Fully rewritten on every `/lean:verify` run |
| _(none)_ | `/lean:commit` | Owns nothing in `spec.md`. Appends one `Committed` entry per commit to `execution.md`; side-effect is a git commit. |
| _(none)_ | `/lean:status` | Owns nothing. Strictly read-only — reads frontmatter and checkbox lines, writes nothing. |
| _(none)_ | `/lean:resume` | Owns nothing. Strictly read-only — reads frontmatter, checkbox lines, and execution.md tail. Suggests next command. |

### Feature status lifecycle

```
created → discussing → planning → executing → verifying → done
```

Skills advance the status automatically as they complete their work. Manual editing is safe — skills never regress status unless the user explicitly re-runs an earlier step. The initial status `created` is set when `/lean:new` (or `/lean:kickoff` scaffolding) creates the spec; `/lean:discuss` advances it to `discussing` on its first run.

### `execution.md` ownership

`/lean:execute` owns this file as its primary writer, and `/lean:commit` appends one-line `Committed` entries to it. It is append-only. Other skills read it: `/lean:plan` for mid-execute replanning, `/lean:verify` as a narrative source, and `/lean:commit` (tail reads) to detect what's been committed and what's new since the last commit.

### `principles.md` ownership

Primarily user-edited. Every skill reads it as context. `/lean:kickoff` may write to it via an opt-in "principles building" conversation — it asks targeted questions and fills in the template with real project conventions. No other skill writes to it. The installer creates a starter template on request.

### `project.md` ownership

`/lean:kickoff` owns this file. It is fully rewritten on every `/lean:kickoff` run. Other skills read it as context (scope, constraints, vision) but never modify it.

---

## The single section-ownership exception

There is exactly one place where strict section ownership is relaxed:

> `/lean:execute` may tick checkboxes in the `### Tasks` subsection of `## Plan` as it completes tasks. Everything else in `## Plan` is owned by `/lean:plan`.

This carve-out exists because checkboxes are **execution state**, not plan content. Without it, either (a) checkbox state would have to live in a separate file (breaking "the document is the state"), or (b) `/lean:execute` would need a more complex mechanism to signal completion.

When `/lean:plan` re-runs, it **preserves checkbox state for unchanged tasks** and **resets checkboxes for changed tasks**. A task is considered "unchanged" if its title and approach are substantively the same; cosmetic edits (rewording) preserve the checkbox.

---

## Current-feature discovery

Skills that operate on a specific feature (everything except `/lean:new`, `/lean:adopt`, `/lean:kickoff`, and the bootstrap flow — `/lean:commit` included) resolve the "current feature" in this order:

1. **Explicit argument** — `/lean:plan 003` → `.specs/003_*/`
2. **Git branch mapping** — current branch `feat/003-token-storage` → `.specs/003_token-storage/`
3. **Most recently modified** `.specs/NNN_*/` directory
4. **Ask the user** — if none of the above resolve unambiguously, the skill lists available features and prompts

This gives zero-friction defaults for the common case (working on one feature per branch) without locking users into a branch-naming convention.

---

## Context engineering tactics

Each skill applies specific tactics to keep token usage low:

- **Targeted section reads via Grep + offset Read.** To read only `## Plan` from a `spec.md`:
  ```
  Grep "^## " spec.md  # find line numbers of section headers
  Read spec.md --offset <start-of-plan> --limit <length-of-plan>
  ```
  Skills know exactly which sections they need and never read the full file.

- **Execution log tail reads.** `/lean:execute` on resume reads only the last ~50 lines of `execution.md` — enough to know where the previous run stopped and recognize any course corrections.

- **Diff-based verify.** `/lean:verify` reads `git diff <starting_sha>..HEAD` as its primary technical source. It targets individual files only when the diff is unclear. It never bulk-reads the source tree.

- **Sub-agent firewalls.** When `/lean:plan` would need 3+ targeted reads to understand an unfamiliar area, it delegates to an Explore sub-agent. The sub-agent absorbs the raw source reads; the main conversation sees only the distilled summary.

- **Config and principles read once.** Each skill reads `config.yaml` and `principles.md` once at the start of its run and caches the values in-context.

- **No redundant metadata files.** There is no STATE.md, ROADMAP.md, progress file, or lockfile. Everything a skill needs is in `spec.md`, `execution.md`, `config.yaml`, and `principles.md`.

---

## Intervention mechanics

The core claim: **every intervention reduces to re-running a skill.**

| Scenario | How to intervene |
|---|---|
| Mid-discuss, change direction | Keep talking — the conversation itself is the intervention |
| Post-plan, tweak the plan | `/lean:plan` with a modifier ("use Postgres instead") |
| Mid-execute, plan is wrong | Interrupt → `/lean:plan` (reads `execution.md`, preserves completed tasks) → `/lean:execute` (continues from first unchecked) |
| Post-execute, change before verifying | `/lean:execute` with a modifier, or edit files manually |
| Post-verify, issues flagged | Verify's AskUserQuestion offers `/lean:execute` / `/lean:plan` / stop |
| Any time, manual edit | Open the file in an editor; skills read current state fresh on next run |

There is no "intervention mode" to enter, no state to reset, no checkpoint to roll back. The idempotence of skills plus the append-only execution log is the entire mechanism.

---

## Why we rejected alternatives

### Why not GSD's multi-subagent fan-out?

Every sub-agent starts cold, re-reads files, re-derives context, and writes its own artifact. Token cost compounds linearly with the number of sub-agents. For LeanSpec's scope (a single developer iterating on features) the cost dominates the benefit. Sub-agents are retained only where they demonstrably save tokens (large codebase reads) rather than spend them.

### Why not SpecKit's three-file model?

Fragmenting a feature across `spec.md`, `plan.md`, and `tasks.md` optimizes for tooling at the expense of readability. A human reading a feature wants one document they can scroll through. A single living doc with section headers matching workflow steps gives the same structure without the fragmentation.

### Why not a milestone → phase → task hierarchy?

GSD nests work inside work. For the common case (one developer, 3-8 tasks per feature), the hierarchy adds bureaucracy without proportional clarity. LeanSpec uses a flat list of features and decomposes only when a feature genuinely requires it — via `part_of:` frontmatter that creates sibling documents, not children.

### Why not role-based agents (BMAD)?

Role-based agents make sense in team-simulation contexts. For a single developer working with Claude Code, the roles collapse — you're the PM, architect, and engineer. Simulating separate roles just adds handoff overhead.

### Why not contract tests / OpenAPI schemas (SpecKit)?

Valuable for API-heavy projects, but they add significant template machinery. A post-v1.0.0 extension (`/lean:contract`) can graft them on without disturbing the core workflow.

---

## What's deliberately missing from v1.0.0

- **Coverage auditing (Nyquist-style)** — GSD's quantitative verification of test coverage against phase requirements. Low ROI for the common case; can be added as a `/lean:audit` skill post-v1.0.0.
- **Integration testing across features** — cross-feature verification flows. Features can currently reference each other via `part_of:`, but there's no automated cross-feature check.
- **Wave-based parallel execution** — running independent tasks in parallel. LeanSpec executes tasks sequentially within a feature. Parallelism comes from the user running multiple features simultaneously on separate branches.
- **Execution log compaction** — when `execution.md` grows large, we currently rely on tail reads. If real usage shows logs getting so large that even the tail is expensive, compaction becomes worthwhile. Not before.
- **`/lean:archive`** — moving completed features to an archive directory. Deferred until usage patterns reveal whether users want it or just `mv` folders manually.
- **Custom agent types** — see "Topology → When sub-agents fire" above. Built-in agents cover v1.0.0.

These are all add-ons, not redesigns. Adding any of them later does not require changing the core artifact model or the workflow skills.

---

## File inventory

This is the full list of files:

```
leanspec/
├── install.sh                              # interactive installer
├── README.md                               # user-facing introduction + walkthroughs
├── skills/
│   ├── kickoff.md                          # greenfield entry point
│   ├── new.md                              # new-feature entry point
│   ├── adopt.md                            # retroactive-documentation entry point
│   ├── discuss.md                          # workflow: exploration
│   ├── plan.md                             # workflow: task breakdown
│   ├── execute.md                          # workflow: implementation
│   ├── verify.md                           # workflow: verification
│   ├── commit.md                           # convenience: drafted commit message + commit on confirm
│   ├── status.md                           # convenience: feature status at a glance (read-only)
│   └── resume.md                           # convenience: resume guidance after break/reset (read-only)
├── templates/
│   ├── spec.md.tmpl
│   ├── execution.md.tmpl
│   ├── project.md.tmpl
│   ├── config.yaml.tmpl
│   └── principles.md.tmpl
├── examples/
│   ├── 001_toy-feature/                    # fully worked greenfield feature
│   │   ├── spec.md
│   │   └── execution.md
│   └── 002_adopted-feature/                # retroactively documented feature (via /lean:adopt)
│       └── spec.md                         # no execution.md — work predates LeanSpec
└── docs/
    ├── architecture.md                     # this document
    └── comparison-with-gsd-and-speckit.md  # detailed competitor comparison
```
