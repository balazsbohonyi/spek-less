---
name: SpekLess
created: 2026-04-07
status: active
---

# SpekLess

## Problem

Solo developers and indie hackers using AI coding agents suffer from context drift: the agent loses track of the original intent mid-feature, produces work that diverges from the goal, and leaves no durable record of why decisions were made. Without a spec anchor, every pause, context reset, or resumed session requires re-explaining the entire goal from scratch. The result is wasted tokens, redone work, and a git history that tells you what changed but never why.

Existing solutions either introduce too much orchestration overhead, require proprietary tooling, fragment a feature across too many files, or are not designed for a solo developer who needs to move quickly while keeping context intact.

## Vision

SpekLess becomes the default lightweight spec discipline for solo developers using terminal-native AI coding agents. Every feature starts with a short spec conversation. The agent stays on-target through planning, review, execution, verification, and retrospective learning without the developer re-explaining context. When work pauses, the spec is the handoff: readable by the next Claude Code, Codex CLI, or OpenCode session, or by the developer themselves months later.

The framework is so small it disappears: a handful of markdown skill files, a zero-dependency Node.js installer, and a `.specs/` folder in every project.

## Users & Use Cases

**Primary user:** Solo developers and indie hackers shipping personal projects or small products with an AI coding agent as their primary development driver.

**Core use cases:**

1. **Greenfield project kickoff** - developer runs `/spek:kickoff` to define problem, vision, constraints, and initial feature set before writing a single line of code.
2. **Starting a new feature** - developer runs `/spek:new` plus `/spek:discuss` to anchor intent before writing code, preventing the agent from immediately going off-script.
3. **Converting existing planning material into specs** - developer runs `/spek:ingest` to turn PRDs, notes, or existing plans into proper SpekLess artifacts instead of retyping them manually.
4. **One-shot quick work with traceability** - developer runs `/spek:quick` for small changes that still need a spec, execution log, and verification-friendly audit trail.
5. **Adopting existing code** - developer runs `/spek:adopt` to retroactively document something already built, establishing a spec baseline for future changes.
6. **Resuming after a break** - developer runs `/spek:resume` after a context reset; the agent reads the spec and picks up exactly where it left off without re-prompting.
7. **Verifying and learning from finished work** - developer runs `/spek:verify` and then `/spek:retro` to confirm the implementation matches the original goal and capture reusable lessons.

## Success Metrics

- A developer can complete the full workflow (`kickoff` -> `discuss` -> `plan` -> `review` -> `execute` -> `verify` -> `retro`) on a new feature without re-explaining the goal at any step.
- The total token overhead of using SpekLess (reading specs, writing logs) is lower than the cost of recovering from a single significant context-drift incident.
- Installation takes under 2 minutes on a fresh git repo with zero prior setup.
- The framework requires no configuration beyond accepting installer defaults for a first project.
- The same canonical `skills/` source can be rendered and used in Claude Code, Codex CLI, and OpenCode without maintaining three divergent frameworks.

## Scope - v1.0.0

### In Scope

- **A set of SpekLess skills** shipped as markdown files in `skills/`, covering:
- Entry points: `kickoff`, `ingest`, `new`, `adopt`, `quick`
- Workflow: `discuss`, `plan`, `review`, `execute`, `verify`, `retro`
- Convenience: `commit`, `status`, `resume`
- **Node.js installer** (`install.js`) that sets up SpekLess in any git repo - single CommonJS file, zero npm dependencies
- **5 templates** scaffolding `spec.md`, `execution.md`, `project.md`, `config.yaml`, and `principles.md`
- **2 worked examples** showing the full greenfield workflow and the retroactive adopt workflow
- **Contributor and design documentation** in `docs/architecture.md`, `docs/comparison.md`, and `docs/maintenance.md`
- **Cross-agent rendering support** for Claude Code, Codex CLI, and OpenCode from one canonical skill source
- **Windows / Git Bash compatibility** across the installer and generated project artifacts

### Out of Scope

- Multi-agent orchestration or wave-based parallel execution (GSD-style complexity)
- CI/CD and git hook integration (auto-spec validation in pipelines)
- Coverage auditing (Nyquist-style test coverage baked into workflow)
- Standalone CLI or binary beyond `install.js`
- IDE plugins or editor integrations
- Team collaboration features (shared spec reviews, PR-linked specs)

## Constraints

- **Agent-portable markdown skills.** Skills are authored once as markdown source and rendered per target agent. No runtime, no build step, no separate service required beyond the installer.
- **Zero npm dependencies.** `install.js` uses only Node.js built-ins (`fs`, `path`, `os`, `readline`). Requires Node.js 14 LTS or later.
- **Windows / Git Bash compatible.** The installer and all skills must work on Windows under Git Bash, not just Linux/macOS. Path quoting and newline handling must be defensive.
- **Single-agent topology.** The framework must not require or encourage multi-agent orchestration - one main conversation drives everything.
- **Solo maintainer.** No CI pipeline, no automated tests in v1. Changes are validated by manual smoke test against a scratch project.

## Initial Feature Set

<!--
Checkboxes tick as features reach `status: done`. This doubles as a
lightweight backlog - the single source of truth for "what are we building right now."
-->

- [x] 001: Core workflow skills - The workflow backbone for feature creation, planning, review, execution, verification, and retrospective learning
- [x] 002: Supporting skills - Adopt, ingest, quick, commit, status, and resume round out the day-to-day workflow around the core spine
- [x] 003: Installer - `install.js` with interactive prompts, `--defaults`, and idempotent re-run behavior
- [x] 004: Templates and scaffolding - Templates for `spec.md`, `execution.md`, `project.md`, `config.yaml`, and `principles.md`
- [x] 005: Documentation and examples - README, architecture/comparison docs, and worked examples
