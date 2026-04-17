# SpekLess

**A lightweight spec-first development workflow for AI coding agents.**

SpekLess gives every feature a single living design document (`spec.md`) and an append-only work journal (`execution.md`). A set of workflow skills — invoked as slash commands — drives the full lifecycle: clarify → plan → review → implement → verify → retrospect. The document *is* the state: no lockfiles, no state machines, no checkpoint files. Intervention is always just re-running a skill.

SpekLess ships as rendered skills for **Claude Code**, **Codex CLI**, and **OpenCode**. The document model — the spec, execution log, and principles file — is plain markdown and works with any agent or editor. The source `skills/` directory is canonical; the installer renders that source into each agent's package format.

---

## Why SpekLess exists

Spec-driven development in Claude Code is valuable — but the existing tools have friction:

- **GSD** produces excellent structure but burns tokens through fan-out subagents (researcher, planner, plan-checker, executor, verifier, integration-checker, nyquist-auditor, …) each starting cold, re-reading files, and writing their own artifact. It also forces atomic commits that pollute your git history and locks you into a rigid state machine.
- **GitHub SpecKit** fragments a feature across three files (`spec.md`, `plan.md`, `tasks.md`) and uses a template-driven flow that doesn't integrate with Claude Code skills.
- **Plain ADR/RFC docs** are human-readable but give you no help from the agent — every discussion, plan, and verification is ad-hoc.

SpekLess is the minimal system that keeps the good parts and cuts the rest:

- **One living `spec.md` per feature.** Reads like an RFC. Sections for Context, Discussion, Assumptions, Plan, Review, Verification, and Retrospective. Everything about a feature is in one place.
- **Append-only `execution.md` work journal.** A human-readable narrative of what was actually done, stored alongside the spec. Replaces atomic commit discipline without forcing you to commit on anyone else's rhythm.
- **Flat feature list.** No milestones-inside-phases-inside-tasks hierarchy. Big work decomposes into sibling docs via a single `part_of:` frontmatter field.
- **Slash skills, not subagent fan-out.** A single main agent drives everything via slash-commands; sub-agents are used *only* as context firewalls for broad codebase reads, never as pipeline steps. This solves a real problem multi-agent pipelines struggle with: *inter-agent amnesia*. When you spawn a PlanAgent after a DiscussAgent, the planner only knows what got serialized into a file — the *why* behind decisions is gone. SpekLess keeps one conversation alive across all steps, so context accumulates continuously and you can intervene at any point without re-briefing a new agent from scratch.
- **Free intervention.** The document *is* the state. There's no STATE.md, no checkpoint files, no locked step order. Edit any section, re-run any skill, at any time.

---

## Design decisions at a glance

| | SpekLess | GSD | SpecKit |
|---|---|---|---|
| Feature doc | One living `spec.md` | Fragmented (STATE, RESEARCH, PLAN, VERIFY) | Three files |
| Hierarchy | Flat list of features | Milestone → phase → task | Flat |
| Atomic commits | Never forced | Forced | Not tracked |
| Intervention at any step | ✓ | State-machine locked | Partial |
| Retroactive adoption of existing code | `/spek:adopt` | ✗ | ✗ |
| Greenfield PRD layer | `/spek:kickoff` + `project.md` | `PROJECT.md` + new-project | Partial |
| Project constitution | `principles.md` | ✗ | `constitution.md` |
| Subagent fan-out per workflow step | Never | Heavy | Never |
| Token cost | Lightest | Heaviest | Medium |

---

## Install

SpekLess is a cross-agent skill set plus an installer. Clone or download this repo, then run the installer inside any project where you want SpekLess:

```bash
git clone https://github.com/balazsbohonyi/spek-less.git /path/to/spek-less
cd /path/to/your/project
node /path/to/spek-less/install.js
```

Pass `--defaults` (or `-y`) to skip all prompts and accept default values non-interactively:

```bash
node /path/to/spek-less/install.js --defaults
```

The installer asks:

1. Command namespace (default: `spek`)
2. Target AI agent: Claude Code, Codex CLI, or OpenCode
3. Install scope: per-project, global, or both
4. Specs root directory (default: `.specs/`)
5. Whether the execute command should suggest commits (default: no)
6. Subagent delegation threshold (default: 3 reads)
7. Whether to create a starter `principles.md` (default: yes)
8. Commit message style for the commit command — `plain` (default), `conventional`, or a custom free-text rule

The installer also:
- Detects if the directory is not a git repo and offers to run `git init`
- Renders templates to `.specs/_templates/` so skills can reference them at runtime
- Renders installed skills per agent:
- Claude Code and OpenCode: flat `<skill>.md` command files
- Codex: `.codex/skills/<namespace>-<skill>/SKILL.md` packages

The installer is **idempotent and safe on existing projects**: re-running it preserves your features and principles, rewrites config and rendered artifacts from current source, and removes stale deleted skills/templates from installed copies.

Command form by agent:
- Claude Code: `/spek:new`, `/spek:kickoff`, `/spek:plan`
- OpenCode: `/spek:new`, `/spek:kickoff`, `/spek:plan`
- Codex CLI: `$spek-new`, `$spek-kickoff`, `$spek-plan`

---

## The skills

Skills fall into three categories.

### Entry points
Pick one of these skills when starting.

| Skill | Use when |
|---|---|
| **`/spek:kickoff`** | Starting a greenfield project. Runs an extended PRD-style discussion, writes `.specs/project.md`, and offers to scaffold initial feature folders. |
| **`/spek:ingest`** | Convert existing plans, PRDs, or notes (file or current conversation) into one or more SpekLess specs with graduated status. |
| **`/spek:new`** | Adding a new feature to any project. Creates a skeleton feature folder and nothing else. |
| **`/spek:adopt`** | Retroactively documenting code that already exists. Reads the actual files (via an Explore sub-agent if broad), reverse-engineers Context and Plan sections, marks all tasks as already done. Unique to SpekLess. |
| **`/spek:quick`** | Small, self-contained tasks where the full workflow would be overhead. Describe the task in one sentence — the skill creates the spec, executes inline, and leaves a complete audit trail. Skips discuss, plan, and assumptions. |

### Workflow
Use these skills in sequence per feature.

| Skill | What it does |
|---|---|
| **`/spek:discuss`** | Conversational exploration. Writes `## Context` and `## Discussion`. Proactively surfaces ambiguities rather than waiting for you to volunteer them. |
| **`/spek:plan`** | Writes `## Plan` — task breakdown with checkboxes plus per-task details. May delegate codebase exploration to an Explore sub-agent. Safely re-runnable for mid-execute course corrections. |
| **`/spek:review`** | Pre-execution design review. Reads Context, Discussion, Assumptions, Plan, and principles, then writes `## Review` with `critical`, `warning`, and `note` findings plus an explicit next-move choice. Advisory and user-invoked — not automatic. |
| **`/spek:execute`** | Implements the tasks one at a time. Writes append-only entries to `execution.md`. Ticks checkboxes in the Plan as it goes. Resumable from whatever's unchecked. |
| **`/spek:verify`** | Goal-backward verification. Reads Plan, execution log, and `git diff`. Writes `## Verification`. If issues are found, offers (via AskUserQuestion) to run `/spek:execute` to fix, `/spek:plan` to revise, or stop. Strictly read-only for source code. |
| **`/spek:retro`** | Post-completion retrospective. Reads the spec, execution log, and principles, then writes `## Retrospective` after the work is done or cleanly verified. If it notices project-wide lessons, it offers a single AskUserQuestion to append confirmed candidates to `principles.md`. |

`/spek:review` sits between planning and execution when you want a deliberate design checkpoint. It is optional, but it gives the plan a durable review artifact before code starts.

`/spek:retro` sits after completion. It is also optional, but it gives finished work a durable reflection artifact and turns repeated lessons into explicit project principles when the user confirms them.

### Convenience
Use these skills any time.

| Skill | What it does |
|---|---|
| **`/spek:commit`** | Drafts a spec-anchored git commit message summarizing work done since the last commit (tasks completed, verify fixes, course corrections), asks you to confirm via AskUserQuestion, then commits. Never automatic, never amends, never bypasses hooks. Respects a per-project `commit_style` chosen at install time, with `principles.md` allowed to override. |
| **`/spek:status`** | Shows a table of all features with their status, task progress (e.g. 3/5 done), and last modified date. Highlights the current feature. Strictly read-only — no writes, no sub-agents. Useful for a broad overview. |
| **`/spek:resume`** | Focused resume helper — shows the current feature's status, task progress, and last execution log entry, then suggests the right next command. Use when returning after a break or context reset. Strictly read-only. |

All skills are **idempotent, section-scoped, and principles-aware**. Re-running a skill rewrites its owned section in full (except `/spek:execute`, which is append-only for `execution.md` and owns checkbox state within the Plan's task list, `/spek:commit`, which is append-only for `execution.md` and whose side-effect is a git commit, and `/spek:status`/`/spek:resume`, which are strictly read-only). `/spek:review` owns `## Review`; `/spek:retro` owns `## Retrospective`; downstream skills may read those sections when needed, but they never rewrite them.

---

## Walkthrough 1 — Greenfield project via `/spek:kickoff`

You're starting a new product. You have an idea but no code.

```bash
cd /path/to/new/empty/repo
node /path/to/spek-less/install.js       # say yes to creating principles.md
```

In Claude Code:

```
/spek:kickoff "habit tracker for ADHD adults"
```

`/spek:kickoff` runs an extended, clarification-heavy conversation. It asks about:

- The specific problem and who has it
- What the product becomes if successful
- Primary users (it'll push back on vague archetypes)
- Success metrics (leading indicators, not vanity)
- Scope in/out
- Constraints (technical, business, timeline)

It writes `.specs/project.md` and proposes an initial feature set:

```
Initial Feature Set
- [ ] 001: Quick-capture for habit log
- [ ] 002: Daily check-in view
- [ ] 003: Streak tracking
- [ ] 004: Weekly summary email
```

At the end it asks whether to scaffold empty spec folders for these. If yes, `.specs/001_*`, `.specs/002_*`, etc. get created with minimal `spec.md` files. Then:

```
/spek:discuss 001
```

Explores the first feature in detail, with `project.md` as background context. Then `/spek:plan`, optionally `/spek:review`, then `/spek:execute` and `/spek:verify` as normal.

## Walkthrough 2 — Ongoing feature work via `/spek:new`

You have an existing project with SpekLess installed. You want to add a new feature.

```
/spek:new "add dark mode toggle"
```

This creates `.specs/042_add-dark-mode-toggle/spec.md` (numbered next in sequence) and returns immediately. No discussion, no plan — just the skeleton.

```
/spek:discuss
```

Runs the clarification conversation. Writes Context and Discussion.

```
/spek:plan
```

Writes the Plan with task breakdown. For unfamiliar parts of the codebase, it may delegate exploration to the Explore sub-agent so the main context stays lean.

```
/spek:review
```

Optional but recommended for non-trivial features. Reads the planned design, pressure-tests it before coding starts, and writes `## Review` with `critical`, `warning`, and `note` findings plus a recommended next move: revise the plan, proceed to execution and accept the risk, or revisit scope in discussion.

```
/spek:execute
```

Implements task-by-task. Creates `execution.md` on first run, stores `starting_sha` in the spec's frontmatter, ticks checkboxes as tasks complete, and writes a running narrative to the execution log. You commit whenever you want — no forced atomic commits.

```
/spek:commit
```

Optional, at any point. Drafts a commit message from the spec + execution log tail + git diff, shows it to you, and commits on confirmation. Subject anchors to the feature id (`001: Add dark mode toggle — tasks 1–3`); body lists the tasks or fixes completed since the last commit; footer links to the spec. You can accept the draft, paste a revision, or cancel.

```
/spek:verify
```

Reads `git diff <starting_sha>..HEAD`, the Plan, and the execution log. For non-trivial features it delegates to a fresh general-purpose sub-agent for a bias-free verification pass. Writes the Verification section. If it flags issues, it asks (via AskUserQuestion) whether to run `/spek:execute` to fix them now, `/spek:plan` to revise, or stop.

```
/spek:retro
```

Optional after the work is done. Reads the completed spec plus the execution log, writes `## Retrospective`, and offers a single principles-update prompt only when it found project-wide lessons worth keeping.

## Walkthrough 3 — Retroactively documenting existing code via `/spek:adopt`

You have code that was written without SpekLess and you want a spec for it — maybe for documentation, maybe as a verification baseline before refactoring.

```
/spek:adopt "the auth flow in src/auth/"
```

`/spek:adopt` delegates to an Explore sub-agent which maps the auth module. Then it writes a retrospective `spec.md`:

- **Context** inferred from what the code does (flagged as inferred if uncertain)
- **Discussion** listing visible design decisions
- **Plan** with all tasks pre-checked (`- [x]`) — "this is what the plan would have looked like"
- **starting_sha** = current HEAD (empty diff, since the work is already done)

Then:

```
/spek:verify
```

Treats this as a documentation check: it reads each task's Files/Approach and confirms the code matches. Any discrepancies become documentation issues, not bugs.

---

## Intervention: changing direction mid-feature

This is where SpekLess differs most sharply from GSD. There is no special "intervention mode." You just run whichever skill you need.

**Scenario — you're mid-execute and realize the approach is wrong:**

1. Interrupt `/spek:execute`
2. Tell the conversation what needs to change
3. Run `/spek:plan` — it reads `execution.md`, acknowledges completed work, and rewrites the Plan. Checkboxes for unchanged tasks are preserved; changed tasks reset; new tasks appended.
4. Run `/spek:execute` again — it picks up from the first unchecked task and appends a `Course correction` entry to the log.

**Scenario — verify found issues:**

1. `/spek:verify` flags issues and ends with an AskUserQuestion offering three options.
2. Pick "run `/spek:execute` to fix."
3. `/spek:execute` reads the Verification section, implements fixes, appends to the log.
4. Re-run `/spek:verify` to confirm.

**Scenario — review found design issues before execution:**

1. Run `/spek:review`.
2. If it flags plan-shaping issues, pick `/spek:plan`; if it flags scope or ambiguity issues, pick `/spek:discuss`.
3. Re-run `/spek:review` if you want a refreshed design pass on the revised spec.
4. Once the review is acceptable, continue to `/spek:execute`.

**Scenario — you want to edit a section by hand:**

Just open `spec.md` in your editor and edit it. Skills read the current state fresh every run — they never assume they authored the current content. Manual edits are first-class.

**Scenario — context fills up mid-execute and the feature isn't done:**

`/spek:execute` is resumable by construction — the append-only `execution.md` + unchecked Plan checkboxes are all the state it needs. When context gets tight:

1. Let the current task finish cleanly (don't stop mid-edit).
2. Have the agent append a `## <timestamp> — Pausing for context reset` entry to `execution.md` describing what's done and what isn't.
3. Optionally commit what you have.
4. **Start a fresh session** (`/clear` or a new terminal) — only the session boundary can actually shrink context; the framework can't shrink its own.
5. Run `/spek:execute` again. It reads the log's tail, sees the pause entry, and picks up from the first unchecked task.

No resume command, no special flag, no state file to reconcile. The document-is-state invariant is what makes this Just Work.

---

## Directory layout inside a project using SpekLess

```
<project-root>/
├── .specs/
│   ├── config.yaml                    # per-project config (written by installer)
│   ├── principles.md                  # project constitution (HOW we build)
│   ├── project.md                     # product vision / PRD (WHAT & WHY) — optional
│   ├── 001_auth-rewrite/
│   │   ├── spec.md
│   │   └── execution.md
│   ├── 002_token-storage/             # part_of: auth-rewrite (sibling decomposition)
│   │   ├── spec.md
│   │   └── execution.md
│   └── 003_settings-ui/
│       ├── spec.md
│       └── execution.md
└── .claude/
    └── skills/
        └── spec/                      # default namespace; configurable at install
            ├── kickoff.md
            ├── new.md
            ├── adopt.md
            ├── ingest.md
            ├── quick.md
            ├── discuss.md
            ├── plan.md
            ├── execute.md
            ├── verify.md
            ├── retro.md
            ├── commit.md
            ├── status.md
            └── resume.md
```

Claude/OpenCode install flat command files inside their namespace directories. Codex installs one packaged skill per directory under `.codex/skills/<namespace>-<skill>/SKILL.md`.

---

## The `principles.md` constitution

Every SpekLess skill reads `.specs/principles.md` on every run. This is where you record the project conventions that should shape plans, guide execution, and give verify concrete things to check against.

Keep principles **concrete and testable**. "Write clean code" is useless. "All public functions must have JSDoc with at least one `@example`" is useful.

The installer can create a starter file for you. Edit it to reflect your actual conventions. Principles are sticky — they apply to every feature, not one-offs.

---

## How SpekLess stays lean

Token efficiency isn't a side effect — it's the design:

- **Single-agent topology.** One conversation drives everything via skills. No cold-start subagent fan-out per workflow step.
- **Sub-agents as context firewalls only.** When `/spek:plan` or `/spek:adopt` needs to read an unfamiliar area of code, it delegates to an Explore sub-agent and receives a distilled summary. The raw source never enters the main conversation.
- **Section-scoped reads.** Skills use Grep to find section headers then Read with `offset`/`limit` to pull only the sections they need. `/spek:plan` doesn't read the Verification section. `/spek:verify` doesn't read the Discussion section.
- **The document is the state.** No STATE.md, no ROADMAP.md, no lockfiles. Progress is a set of checkboxes in the Plan; intent is whatever the most recent section rewrite says.
- **Diff-based verification.** `/spek:verify` reads `git diff <starting_sha>..HEAD` first, then targets specific files only if the diff is unclear. It never bulk-reads source trees.
- **Append-only execution log.** Old entries are never re-read unless a course correction needs context. The tail is usually enough.

---

## Example feature

Two worked examples are included:

- **`examples/001_toy-feature/`** — a greenfield feature (light/dark theme toggle) showing what the documents look like after the full `/spek:new` → `/spek:discuss` → `/spek:plan` → `/spek:review` → `/spek:execute` → `/spek:verify` → `/spek:retro` workflow. One `spec.md` that reads as a complete design doc, one `execution.md` that reads as an engineer's work journal.
- **`examples/002_adopted-feature/`** — a retroactively documented feature (user authentication module) created via `/spek:adopt`. Shows what an adopted spec looks like: inferred Context flagged as such, retrospective Plan with all tasks pre-checked, a completed `## Retrospective`, and no `execution.md` (the work predates SpekLess).

---

## Status

**v1.0.0** — Skill set, installer, templates, and two worked examples. See `docs/architecture.md` for the full design and `docs/comparison.md` for a detailed comparison.

Post-v1.0.0 candidates (explicitly deferred until real usage demands them):

- `/spek:archive` convenience skill
- Execution log compaction when logs get large
- Git hook integration
- Contract tests / OpenAPI extension
- Custom `spec-verifier` sub-agent (currently uses general-purpose)

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
