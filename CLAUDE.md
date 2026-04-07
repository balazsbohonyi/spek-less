# CLAUDE.md

This file provides guidance to Claude Code when working on the **SpekLess** codebase itself (not when using SpekLess inside another project).

If you're here to *use* SpekLess to build something else, read `README.md` instead. This file is for developing/maintaining the framework.

---

## Repository purpose

SpekLess is a lightweight, Claude Code–native spec-driven development framework. It ships as:

- **Ten slash skills** in `skills/` — copied into a target project's `.claude/skills/<namespace>/` by the installer
- **Five templates** in `templates/` — used by skills and the installer to scaffold feature docs and config
- **One installer** (`install.sh`) — Bash script that asks configuration questions and sets up a project
- **Two worked examples** in `examples/` — `001_toy-feature` (greenfield) and `002_adopted-feature` (retroactive via `/spek:adopt`)
- **Design docs** in `docs/` — authoritative architecture reference + comparison against GSD/SpecKit/ADR

There is **no runtime code** beyond `install.sh`. The skills are markdown files read by Claude Code. The templates are plain text with `{{PLACEHOLDER}}` substitution markers filled in by `sed` from the installer.

---

## Read these first

Before making non-trivial changes, read in this order:

1. **`README.md`** — user-facing walkthrough. Tells you what SpekLess is trying to be.
2. **`docs/architecture.md`** — the authoritative design reference. Every design decision and invariant is documented here. If a proposed change contradicts this doc, either the change is wrong or the doc needs updating first (not the other way around).
3. **`docs/comparison-with-gsd-and-speckit.md`** — explains what SpekLess deliberately keeps, rejects, and invents. Useful when you're tempted to add a feature "because GSD has it."
4. **`skills/new.md`** — the simplest skill. Read this to understand the skill file conventions before editing any other skill.
5. **`examples/001_toy-feature/spec.md` + `execution.md`** — what the output of the full greenfield workflow looks like. Any change to templates or skills should still produce output that matches this shape.
6. **`examples/002_adopted-feature/spec.md`** — what `/spek:adopt` output looks like. Retroactive spec with inferred Context, pre-checked tasks, no execution.md.

---

## Core invariants (DO NOT violate without updating architecture.md first)

These invariants are what SpekLess *is*. If you're about to change one, stop and think hard — you're either fixing a bug or changing the identity of the framework.

1. **Single-agent topology.** One main conversation drives everything. Sub-agents are used *only* as context firewalls for broad reads (Explore for codebase mapping, general-purpose for fresh-lens verify). Never create a new agent role per workflow step — that's the GSD failure mode SpekLess exists to avoid.

2. **Section ownership is the core rule.** Each skill owns exactly one section of `spec.md` and rewrites it idempotently. The *one* exception is `/spek:execute` ticking checkboxes in `## Plan` → `### Tasks`. No other exceptions.

3. **The document is the state.** No STATE.md. No lockfiles. No checkpoint machinery. If you need to know "where is this feature," read the sections. If you're about to create a new metadata file, stop.

4. **Append-only execution log.** `execution.md` is never rewritten. Course corrections, plan revisions, verify fixes — all append new entries.

5. **Skills are idempotent.** Re-running any skill must produce correct output from the current on-disk state, without assuming the skill authored the existing content. This makes manual editing a first-class intervention path.

6. **No forced commits.** The framework never runs `git commit` automatically. `starting_sha` is captured *passively* on first `/spek:execute` run as an audit anchor. `suggest_commits: true` offers commits via AskUserQuestion but never acts without user confirmation. `/spek:commit` is user-invoked only — it drafts a message and runs `git commit` strictly after explicit AskUserQuestion confirmation, never with `--amend`, never with `--no-verify`.

7. **Principles-aware.** Every skill reads `.specs/principles.md` if present. If you add a new skill, it must too.

8. **Section-scoped reads.** Skills use Grep + offset Read to fetch only the sections they need from `spec.md`. Skills that bulk-read the full file are regressions.

---

## Repository structure

```
spek-less/
├── install.sh                              # Bash installer (zero deps)
├── README.md                               # user-facing intro
├── CLAUDE.md                               # this file — for working ON SpekLess
├── LICENSE                                 # MIT
├── skills/                                 # the 10 skill files (copied by installer)
│   ├── kickoff.md, new.md, adopt.md        #   entry points
│   ├── discuss.md, plan.md,                #   workflow skills
│   │   execute.md, verify.md
│   ├── commit.md                           #   convenience: drafted commits
│   ├── status.md                           #   convenience: feature status (read-only)
│   └── resume.md                           #   convenience: resume after break/reset (read-only)
├── templates/                              # scaffolding templates
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
    └── comparison-with-gsd-and-speckit.md  # why certain things are / are not in SpekLess
```

---

## Skill file conventions

Every file in `skills/` follows this shape:

```markdown
---
name: spek:<skill-name>
description: <one-paragraph description — Claude Code reads this to decide when the skill is relevant>
---

# /spek:<skill-name> — <short tagline>

<1-2 paragraphs: what this skill does and when to invoke it>

## Inputs
<what arguments / context the skill expects>

## Reads (section-scoped)
<exactly which files and which sections the skill reads — be specific about section-scoped reads vs whole-file reads>

## Behavior
<what the skill actually does, including decision points and sub-agent delegation rules>

## Writes
<what files/sections the skill modifies — be explicit about what it does NOT touch>

## Output to user
<what the skill tells the user at the end — always include a suggested next step>

## Hard rules
<bulleted list of invariants this skill enforces — idempotency, section scope, no side effects, etc.>
```

**Frontmatter format:** `name` uses `spek:<skill>` even though the actual namespace is configurable at install time. The installer does not rewrite skill frontmatter — Claude Code resolves namespaces from the directory the skills live in (`.claude/skills/<ns>/`). Keep the `name` field as `spek:<skill>` as a reasonable default; if this proves wrong in practice (skills not discoverable under non-default namespaces), adjust here first.

**Description field:** this is what Claude Code shows to the model when deciding whether a skill is relevant. Be specific about *when to use this skill vs alternatives*. Example: the `/spek:new` description says "For greenfield projects use /spek:kickoff first. For retroactively documenting existing code use /spek:adopt." — this disambiguation is critical.

**Length budget:** skill files should be **under ~300 lines** each. These are instructions Claude reads in-context, not documentation. Cut anything that isn't load-bearing. If a skill file is getting too long, the skill is probably doing too much — consider splitting.

---

## Template file conventions

Templates in `templates/` are plain markdown/yaml with `{{PLACEHOLDER}}` markers. The installer (`install.sh`) and the skills substitute placeholders using `sed` or inline string replacement.

Current placeholders:
- `{{ID}}`, `{{TITLE}}`, `{{DATE}}` — used in `spec.md.tmpl`
- `{{PROJECT_NAME}}`, `{{DATE}}` — used in `project.md.tmpl`
- `{{TITLE}}` — used in `execution.md.tmpl`
- `{{NAMESPACE}}`, `{{SPECS_ROOT}}`, `{{SUGGEST_COMMITS}}`, `{{SUBAGENT_THRESHOLD}}`, `{{PROJECT_HINTS}}`, `{{COMMIT_STYLE}}` — used in `config.yaml.tmpl`

When adding a new placeholder, update both the template and the code that substitutes it. The installer's `sed` calls use `|` as the delimiter, so values containing `|` will break — avoid them in prompts or escape explicitly.

Templates contain HTML comments (`<!-- ... -->`) as inline guidance for humans editing the resulting files. Do not convert these to visible text — they're meant to disappear from rendered output.

---

## Installer conventions (`install.sh`)

- **Zero dependencies beyond standard POSIX utilities.** No `jq`, no `yq`, no `python`. Use `sed`, `grep`, `awk`, `cp`, `mkdir`.
- **Idempotent on existing projects.** Re-running must preserve existing `.specs/config.yaml`, `.specs/principles.md`, and all feature folders. When a file already exists, either skip it or read it for defaults — never silently overwrite. The `templates/` directory is the exception — it is always overwritten with the latest framework templates on re-install.
- **Per-project config is sovereign.** If both per-project and global configs exist, per-project wins. The installer writes per-project by default.
- **`--defaults` / `-y` flag.** Passing either flag at invocation skips all prompts (using the defaults), skips the summary confirmation, and runs non-interactively. If the directory is not a git repo, it also auto-runs `git init` without asking. Useful for scripted setups and quick trials.
- **All prompts have sensible defaults.** A user pressing Enter at every prompt should get a working install with reasonable choices.
- **Quoting matters on Windows.** This installer is expected to run under Git Bash on Windows as well as Linux/macOS. Quote path variables defensively (`"$PROJECT_ROOT"`, not `$PROJECT_ROOT`).

---

## Making changes

### Adding a new skill

1. Decide whether the new skill is genuinely needed, or whether an existing skill should be extended. **Default to extending.** New skills expand the surface area users have to learn.
2. Read `skills/new.md` as a structural template.
3. Create `skills/<name>.md` following the skill file conventions above.
4. Update `README.md` (the skills table — update count accordingly) and `docs/architecture.md` (add to the ownership / behavior sections).
5. Update `install.sh` only if the new skill needs special installation handling — it shouldn't, because the installer copies `skills/*.md` generically.
6. Update `docs/comparison-with-gsd-and-speckit.md` if the new capability changes the feature matrix.

### Modifying an existing skill

1. Read the skill's current file in full. Skills have load-bearing details in the "Hard rules" section that are easy to accidentally break.
2. Check `docs/architecture.md` for invariants the skill enforces.
3. Make the edit.
4. **Smoke test manually** (see below).
5. If the edit changes externally-visible behavior, update the README walkthrough that covers this skill.

### Changing a template

1. Search for the template filename across `skills/` and `install.sh` to find all consumers.
2. If you add a placeholder, add the substitution in every consumer.
3. Run the installer against a scratch directory to verify the generated config looks right.
4. If you change the `spec.md.tmpl` section structure, update **every skill** that reads sections from `spec.md` — several skills use `Grep "^## "` to find section boundaries.

### Changing the architecture

1. Edit `docs/architecture.md` first.
2. Then edit the affected skills.
3. Then update the worked example in `examples/001_toy-feature/` so it still matches what real runs would produce.
4. Then update README.
5. Then update `docs/comparison-with-gsd-and-speckit.md` if the feature matrix changes.

Architecture changes are the slowest kind of change to make correctly — budget time for the cascade.

---

## Manual smoke test

SpekLess has no automated test suite in v1.0.0. The smoke test is:

```bash
# 1. Create a scratch project
mkdir /tmp/spek-less-smoke && cd /tmp/spek-less-smoke
git init

# 2. Run the installer
/path/to/spek-less/install.sh
# Press Enter at every prompt to accept defaults.

# 3. Verify the install
ls -la .specs/                    # should contain config.yaml and principles.md
ls -la .claude/skills/spek/       # should contain all 10 skill files
cat .specs/config.yaml            # should have populated values, no {{PLACEHOLDERS}}

# 4. Start Claude Code in the scratch project and run a workflow
#    /spek:new "add a greeting endpoint"
#    /spek:discuss
#    /spek:plan
#    /spek:execute
#    /spek:verify
# Confirm each step writes to the correct section and respects the hard rules.
```

**Before committing a non-trivial change, run at least steps 1-3 of the smoke test.** Skipping this has caused `sed` substitution bugs in the past.

---

## Commit conventions

Use descriptive, scope-prefixed commit messages:

- `skills/plan: handle mid-execute replanning correctly`
- `installer: preserve existing config on re-run`
- `templates: add {{PROJECT_HINTS}} placeholder to config.yaml.tmpl`
- `docs: document the section-ownership exception`
- `example: update toy-feature to match new spec.md structure`

Do **not** use machine-generated commits (no Claude Code attribution footers in SpekLess's own git history — this repo's commits should look hand-written, because SpekLess's entire thesis is that forced agent commits are a pollution to avoid).

---

## Things that are deliberately missing from v1.0.0

When working on SpekLess, resist the temptation to add these — they're on the post-v1.0.0 list for a reason:

- `/spek:archive` — convenience skill for archiving completed features
- Execution log compaction
- Custom `spec-verifier` sub-agent type
- Git hook integration
- Contract tests / OpenAPI extension
- Standalone CLI beyond the installer
- Wave-based parallel execution
- Coverage auditing (Nyquist-style)

Each of these is a real capability, but adding them to v1.0.0 blows up the MVP surface area before real usage has surfaced which ones actually matter.

---

## When to ask the user vs just do it

- **Just do it:** typo fixes, comment clarifications, template placeholder additions, skill "Hard rules" tightening, adding a section to the example.
- **Ask first:** adding a new skill, removing an existing skill, changing a core invariant, touching `install.sh` question flow, changing frontmatter format across skills, altering the `.specs/` directory layout.

When in doubt, read `docs/architecture.md` and check whether the change would contradict it. If yes, ask. If no, proceed.
