# SpekLess vs GSD vs SpecKit vs ADR/RFC

A detailed comparison against the closest existing spec-driven development frameworks. This document exists to clarify what SpekLess deliberately keeps, deliberately rejects, and is genuinely novel about.

---

## Feature matrix

| Feature | SpekLess | GSD | SpecKit | ADR/RFC |
|---|---|---|---|---|
| **Artifact model** | | | | |
| Living design doc per feature | ✓ (`spec.md`) | ✗ (fragmented across STATE/RESEARCH/PLAN/VERIFY) | partial (3 files: spec/plan/tasks) | ✓ (one file) |
| Flat feature list, no hierarchy | ✓ | ✗ (milestones → phases → tasks) | ✓ | ✓ |
| Execution journal separate from design doc | ✓ (`execution.md`) | partial (state + commit log) | ✗ | ✗ |
| **Workflow** | | | | |
| Non-linear, re-enterable steps | ✓ | ✗ (state machine) | partial | N/A |
| Free intervention at any step | ✓ | ✗ | partial | N/A |
| Task breakdown with checkboxes | ✓ | ✓ | ✓ | ✗ |
| Idempotent skill re-runs | ✓ | ✗ (checkpoints matter) | partial | N/A |
| **Verification** | | | | |
| Goal-backward verify step | ✓ | ✓ | ✗ | ✗ |
| Fresh-lens verification (isolated agent) | ✓ (general-purpose subagent) | ✓ (nyquist-auditor + verifier) | ✗ | ✗ |
| Verify offers next moves (fix/revise/stop) | ✓ (AskUserQuestion) | ✗ | ✗ | ✗ |
| Coverage auditing (Nyquist-style) | ✗ (deferred) | ✓ | ✗ | ✗ |
| **Commits and git** | | | | |
| Atomic commits enforced | ✗ (intentional) | ✓ | ✗ | ✗ |
| `starting_sha` audit anchor | ✓ | partial | ✗ | ✗ |
| User controls commit rhythm | ✓ | ✗ | ✓ | ✓ |
| User-triggered LLM-drafted commit messages | ✓ (`/spek:commit`) | ✗ (auto-commits only, no user-invoked message drafting) | ✗ | ✗ |
| **Context and knowledge** | | | | |
| Project constitution / principles file | ✓ (`principles.md`) | ✗ | ✓ (`constitution.md`) | ✗ |
| Greenfield PRD layer | ✓ (`/spek:kickoff` + `project.md`) | ✓ (PROJECT.md + new-project skill) | partial (constitution covers some) | ✗ |
| Retroactive adoption of existing code | ✓ (`/spek:adopt`) | ✗ | ✗ | ✗ |
| Clarification detection in discuss | ✓ (prompt pattern) | partial | ✓ (explicit clarify step) | ✗ |
| Principles building assistance | ✓ (via `/spek:kickoff`) | ✗ | ✗ | ✗ |
| **Agent architecture** | | | | |
| Single-agent + skills topology | ✓ | ✗ (fan-out) | N/A | N/A |
| Sub-agents used only as context firewalls | ✓ | ✗ (workflow roles) | N/A | N/A |
| Custom agent types defined | ✗ (built-in only) | ✓ (many) | N/A | N/A |
| **Packaging** | | | | |
| Native Claude Code skills | ✓ | partial | ✗ (template-based) | ✗ |
| Interactive installer with config | ✓ | ✓ | ✓ | ✗ |
| Idempotent installer safe on existing projects | ✓ | ✓ | ✓ | N/A |
| **Token efficiency** | | | | |
| Relative token cost per feature | Lightest | Heaviest | Medium | N/A (no agent) |
| Section-scoped reads | ✓ | ✗ | ✗ | N/A |
| Sub-agent firewalls for broad reads | ✓ | partial | ✗ | N/A |
| Append-only execution log (tail reads) | ✓ | ✗ | ✗ | N/A |

---

## What SpekLess keeps from GSD

GSD pioneered several ideas that SpekLess retains:

1. **Spec-before-code as a hard rule.** The feature gets designed before implementation begins, not alongside it.
2. **Goal-backward verification.** Verify reads Context first and checks backward: *did the implementation achieve the stated goal?* — rather than checking forward from "did all the tests pass?"
3. **Interactive installer producing a config file.** Users configure the framework once at install time; skills read the config at runtime.
4. **Mid-flight course corrections as a first-class concern.** Work changes direction; the framework must handle it gracefully.
5. **A project-level vision document.** GSD has `PROJECT.md`; SpekLess has `project.md`. Both serve as shared context that feature-level work references.

---

## What SpekLess rejects from GSD

### The multi-subagent fan-out architecture

GSD's workflow spawns specialized sub-agents for most steps: `gsd-phase-researcher`, `gsd-planner`, `gsd-plan-checker`, `gsd-executor`, `gsd-verifier`, `gsd-integration-checker`, `gsd-nyquist-auditor`, and others. Each one starts cold, re-reads the relevant files, re-derives context from the planning directory, and writes its own artifact.

**The problem:** sub-agent cost compounds linearly with the number of sub-agents, and most of the cost is re-deriving context the main conversation already has. GSD's architecture is beautiful for a team of specialized humans but wasteful for an LLM where the main conversation already holds most of the state.

**SpekLess's choice:** a single main conversation drives everything via skills. Sub-agents are used only when they demonstrably save tokens — specifically, when a skill needs to absorb a large read (broad codebase exploration, fresh-lens verification) without polluting the main context. The sub-agent then returns a distilled summary.

### Milestone → phase → task hierarchy

GSD nests work: a milestone contains phases, a phase contains tasks, each phase lives in its own directory with multiple state files. For a single developer working on one feature at a time, this is bureaucratic overhead.

**SpekLess's choice:** a flat list of features. Big work decomposes into **sibling** feature docs linked by a single `part_of:` frontmatter field — not into child documents nested under a parent. There are no milestones in SpekLess. The `project.md` document holds product-level vision without being a parent of features.

### The state machine

GSD tracks progress in `STATE.md` files and uses checkpoint semantics. A step is "in progress," "done," "blocked," etc. Editing a state file manually is risky because downstream tools depend on its structure.

**SpekLess's choice:** *the document is the state.* The presence and content of sections in `spec.md` (plus checkbox state in the Tasks list) represents the entire state of a feature. There is no separate state file to reconcile. Editing `spec.md` by hand is safe and encouraged — skills read the current state fresh on every run.

### Forced atomic commits

GSD creates a commit per task, producing many small machine-generated commits in git history.

**The problem:** this pollutes history with messages like "Complete task 3.2," disrupts the user's natural commit rhythm, and creates friction for rebases, squashes, and PR reviews.

**SpekLess's choice:** never commit automatically. Capture `starting_sha` once at the beginning of `/spek:execute` as an audit anchor for `/spek:verify`, then let the user commit whenever and however they want. Optionally, if the user sets `suggest_commits: true` in config, `/spek:execute` will offer commits at natural boundaries — but via `AskUserQuestion`, never automatically.

---

## What SpekLess keeps from SpecKit

1. **Constitution / principles file.** SpecKit's `constitution.md` is an excellent idea — a small document that captures project conventions and is read at every step. SpekLess adopts this as `principles.md`.
2. **Proactive clarification in the discussion step.** SpecKit pushes the agent to surface ambiguities rather than wait for the user to volunteer them. SpekLess bakes this into `/spek:discuss` as a prompt pattern.
3. **Template-driven document structure.** Skeleton files with placeholders, filled in over time. SpekLess uses this for `spec.md`, `execution.md`, `project.md`, and `principles.md`.

---

## What SpekLess rejects from SpecKit

### The three-file-per-feature split

SpecKit divides a feature across `spec.md`, `plan.md`, and `tasks.md`. This optimizes for tooling (each file has a known structure) at the expense of readability — a human reading the feature has to stitch three files together mentally.

**SpekLess's choice:** one living `spec.md` with section headers for Context, Discussion, Plan, and Verification. Execution tracking lives in a separate `execution.md` because it's a different *kind* of document (append-only work journal vs. stable design doc), not a different slice of the same document.

### Formal contract tests and OpenAPI integration

SpecKit has strong support for API-heavy projects via contract tests and schema definitions. These are valuable but require significant template machinery.

**SpekLess's choice:** defer to post-v1.0.0. A `/spek:contract` extension can be added later without disturbing the core workflow.

---

## What's genuinely novel in SpekLess

### `/spek:adopt` — retroactive documentation of existing code

As far as I can find, no existing spec-driven framework offers this. GSD, SpecKit, BMAD, and the ADR tradition all assume you start with a spec and produce code. SpekLess recognizes the common case of **installing a framework on a codebase with existing, undocumented work** and provides a skill that reverse-engineers a spec from the actual files.

`/spek:adopt` is what makes SpekLess useful on day one of installation in a mature repo. You don't have to write fake historical specs by hand.

### Intervention as "just re-run a skill"

Other frameworks treat intervention as a special mode — a dedicated flow for mid-phase changes, rollbacks, or revisions. SpekLess recognizes that **every intervention is just another invocation of an existing skill**, because skills are idempotent and section-scoped. The result: there is no intervention documentation to learn, because there is no intervention mode. You just run `/spek:plan` again. You just edit the file. The framework gets out of your way.

### Verify as advisory-only with explicit next-move prompts

GSD's verifier can be configured to trigger automatic fixes. SpekLess explicitly keeps `/spek:verify` **read-only for source code** and has it end its turn with an `AskUserQuestion` offering:

1. Run `/spek:execute` to fix the flagged issues
2. Run `/spek:plan` to revise the approach
3. Stop and let the user decide

This preserves the cognitive separation between "does this work?" and "make it work" — which is the entire point of having a distinct verify step in the first place.

### `/spek:commit` — user-triggered, LLM-drafted commits

GSD auto-generates commit messages but couples them to forced atomic commits — you can't have GSD's message quality without also accepting its commit rhythm. SpecKit and the ADR tradition don't address commit content at all. SpekLess splits the two: the *forcing* is rejected, but the *message quality* is preserved via an explicit skill the user invokes whenever they want.

The skill reads the Plan's checkbox state, the execution log's tail since the last commit, and the current git diff, then drafts a subject anchored to the feature id (`001: Add dark mode toggle — tasks 1–3`) plus a bullet body listing the completed units of work, plus a footer linking back to the spec. Message style is configurable at install time (`plain` / `conventional` / custom free-text rule), with `principles.md` allowed to override when a project needs something more specific. The commit is only created after an explicit AskUserQuestion confirmation; the skill never amends, never bypasses pre-commit hooks, and never uses `git add -A`.

Two convenience skills ship in v1.0.0: `/spek:commit` because commit-message summarization is the single content-quality benefit SpekLess otherwise gave up by rejecting GSD's atomic commits, and `/spek:status` because "the document is the state" needs a command to read that state at a glance — especially when resuming after a context reset.

### Section ownership as the core design rule

Every skill owns exactly one section of `spec.md` (plus `/spek:execute` owning `execution.md` and the checkbox state carve-out). This is what makes skills safely re-runnable and what makes manual editing first-class. It's also what keeps the MVP tiny — there's nothing clever happening, just a consistent rule that everything follows.

---

## Which framework is right for you?

- **GSD** — You want maximum process rigor. You're comfortable with heavy token usage. You want specialized agent roles and a formal state machine. You plan large projects with many milestones and want the framework to hold the structure for you.
- **SpecKit** — You primarily build APIs. You value contract-test discipline and OpenAPI integration. You're happy with a three-file-per-feature model and template-driven flows.
- **ADR/RFC** — You want zero-agent, human-only design docs. You're documenting decisions for a team of humans, not using an AI assistant to drive the work.
- **SpekLess** — You want the discipline of spec-before-code without the token cost, the rigidity, or the machine-generated git commits. You value human-readable documents over tool-friendly structure. You want to intervene freely. You may have existing code you want to document retroactively.

SpekLess's audience is the single developer (or small team) using Claude Code to ship real software — not teams simulating enterprise process, and not projects where the framework is the product.
