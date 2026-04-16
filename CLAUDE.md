This file provides guidance to Claude Code when working on the **SpekLess** codebase itself (not when using SpekLess inside another project).

If you're here to *use* SpekLess to build something else, read `README.md` instead. This file is for developing/maintaining the framework.

---

## Repository purpose

SpekLess is a lightweight, Claude Code–native spec-driven development framework. It ships as:

- **Slash skills** in `skills/` — copied into a target project's `.claude/commands/<namespace>/` by the installer
- **Six templates** in `_templates/` — used by skills and the installer to scaffold feature docs and config
- **One installer** (`install.js`) — Node.js script (CommonJS, zero deps) that asks configuration questions and sets up a project
- **Two worked examples** in `examples/` — `001_toy-feature` (greenfield) and `002_adopted-feature` (retroactive via `/spek:adopt`)
- **Design docs** in `docs/` — authoritative architecture reference + comparison against GSD/SpecKit/ADR

There is **no runtime code** beyond `install.js`. The skills are markdown files read by Claude Code. The templates are plain text with `{{PLACEHOLDER}}` substitution markers filled in by the installer via `String.prototype.replace`.

---

## Read these first

Before making non-trivial changes, read in this order:

1. **`README.md`** — user-facing walkthrough. Tells you what SpekLess is trying to be.
2. **`docs/architecture.md`** — the authoritative design reference. Every design decision and invariant is documented here. If a proposed change contradicts this doc, either the change is wrong or the doc needs updating first (not the other way around).
3. **`docs/comparison.md`** — explains what SpekLess deliberately keeps, rejects, and invents. Useful when you're tempted to add a feature "because GSD has it."
4. **`skills/new.md`** — the simplest skill. Read this to understand the skill file conventions before editing any other skill.
5. **`examples/001_toy-feature/spec.md` + `execution.md`** — what the output of the full greenfield workflow looks like. Any change to templates or skills should still produce output that matches this shape.
6. **`examples/002_adopted-feature/spec.md`** — what `/spek:adopt` output looks like. Retroactive spec with inferred Context, pre-checked tasks, no execution.md.

---

## Core invariants (DO NOT violate without updating architecture.md first)

These invariants are what SpekLess *is*. If you're about to change one, stop and think hard — you're either fixing a bug or changing the identity of the framework.

1–4. See `.specs/principles.md` → **Architecture** section. The four canonical rules (single-agent topology, section ownership, document-as-state, append-only log) live there.

   Keep the main conversation alive across all steps. Sub-agents may be spawned only as read-only context helpers (Explore, Plan for critique, general-purpose for fresh-lens verify) — never as owners of a workflow step. Each sub-agent reads, returns a result, and exits. Spawning a new agent per step breaks continuity: prior decisions become invisible to the next agent, which forces complex state serialization and makes the workflow hard to debug.

5. **Skills are idempotent.** Re-running any skill must produce correct output from the current on-disk state, without assuming the skill authored the existing content. This makes manual editing a first-class intervention path.

6. **No forced commits.** The framework never runs `git commit` automatically. `starting_sha` is captured *passively* on first `/spek:execute` run as an audit anchor. `suggest_commits: true` offers commits via AskUserQuestion but never acts without user confirmation. `/spek:commit` is user-invoked only — it drafts a message and runs `git commit` strictly after explicit AskUserQuestion confirmation, never with `--amend`, never with `--no-verify`.

7. **Principles-aware.** Every skill reads `.specs/principles.md` if present. If you add a new skill, it must too.

8. **Section-scoped reads.** Skills use Grep + offset Read to fetch only the sections they need from `spec.md`. Skills that bulk-read the full file are regressions.

---

## Repository structure

```
spek-less/
├── install.js                              # Node.js installer (CommonJS, zero deps)
├── README.md                               # user-facing intro
├── CLAUDE.md                               # this file — for working ON SpekLess
├── LICENSE                                 # MIT
├── skills/                                 # skill files (copied by installer)
│   ├── kickoff.md, ingest.md, new.md,       #   entry points
│   │   adopt.md, quick.md
│   ├── discuss.md, plan.md,                #   workflow skills
│   │   execute.md, verify.md
│   ├── commit.md                           #   convenience: drafted commits
│   ├── status.md                           #   convenience: feature status (read-only)
│   └── resume.md                           #   convenience: resume after break/reset (read-only)
├── _templates/                            # scaffolding templates
│   ├── spec.md.tmpl
│   ├── execution.md.tmpl
│   ├── project.md.tmpl
│   ├── config.yaml.tmpl
│   └── principles.md.tmpl
├── examples/
│   ├── 001_toy-feature/                    # worked greenfield example
│   │   ├── spec.md
│   │   └── execution.md
│   └── 002_adopted-feature/                # worked /spek:adopt example
│       └── spec.md                         # no execution.md — work predates SpekLess
└── docs/
    ├── architecture.md                     # authoritative design reference
    ├── maintenance.md                      # agent instructions for editing the framework
    └── comparison.md                       # why certain things are / are not in SpekLess
```

---

## Skill file conventions

Skills follow a standard shape: frontmatter, then sections Inputs / Reads / Behavior / Writes / Output to user / Hard rules. See [`docs/maintenance.md`](docs/maintenance.md#skill-file-conventions) for the full template, frontmatter rules, and length budget.

---

## Template file conventions

Templates use `{{PLACEHOLDER}}` markers substituted via `String.prototype.replace`. See [`docs/maintenance.md`](docs/maintenance.md#template-file-conventions) for the current placeholder list and substitution rules.

---

## Installer conventions (`install.js`)

The installer is CommonJS, zero-deps, Node 14+, and idempotent on re-run. See [`docs/maintenance.md`](docs/maintenance.md#installer-conventions) for the full constraint list.

---

## Making changes

See [`docs/maintenance.md`](docs/maintenance.md#making-changes) for the step-by-step checklists for each change type.

### Adding a new skill

After confirming with the user that the new skill is warranted (see [When to ask](#when-to-ask-the-user-vs-just-do-it)), follow the checklist in `docs/maintenance.md`.

### Modifying an existing skill

Read the skill in full first — the "Hard rules" section is load-bearing. Then follow the checklist in `docs/maintenance.md`.

### Changing a template

Several skills use `Grep "^## "` to find section boundaries in `spec.md` — a structure change cascades to every skill that reads it. See `docs/maintenance.md` for the full checklist.

### Changing the architecture

Edit `docs/architecture.md` first, then cascade to skills → examples → README → comparison doc. See `docs/maintenance.md` for the full sequence.

---

## Manual smoke test

Before committing a non-trivial change, run the smoke test in [`docs/maintenance.md`](docs/maintenance.md#manual-smoke-test).

---

## Commit conventions

Use descriptive, scope-prefixed commit messages:

- `skills/plan: handle mid-execute replanning correctly`
- `installer: route skills to correct agent directory`
- `templates: add {{SUBAGENT_THRESHOLD}} placeholder to config.yaml.tmpl`
- `docs: document the section-ownership exception`
- `example: update toy-feature to match new spec.md structure`

Do **not** use machine-generated commits (no Claude Code attribution footers in SpekLess's own git history — this repo's commits should look hand-written, because SpekLess's entire thesis is that forced agent commits are a pollution to avoid).

---

## Things that are deliberately missing from v1.0.0

See [What's deliberately missing](docs/architecture.md#whats-deliberately-missing-from-v100) in architecture.md — resist adding these.

---

## When to ask the user vs just do it

- **Just do it:** typo fixes, comment clarifications, template placeholder additions, skill "Hard rules" tightening, adding a section to the example.
- **Ask first:** adding a new skill, removing an existing skill, changing a core invariant, touching `install.js` question flow, changing frontmatter format across skills, altering the `.specs/` directory layout.

When in doubt, read `docs/architecture.md` and check whether the change would contradict it. If yes, ask. If no, proceed.
