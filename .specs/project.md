---
name: SpekLess
created: 2026-04-07
status: active
---

# SpekLess

## Problem

Solo developers and indie hackers using AI coding agents (Claude Code) suffer from context drift: the AI loses track of the original intent mid-feature, producing code that diverges from the goal without any clear record of why. Without a spec anchor, every pause, context reset, or resumed session requires re-explaining the entire goal from scratch. The result is wasted tokens, re-done work, and a git history that tells you *what* changed but never *why*.

Existing solutions (GSD, SpecKit, manual ADRs) either introduce too much orchestration overhead, require proprietary tooling, or aren't designed for the solo developer who needs to move fast.

## Vision

SpekLess becomes the default lightweight spec discipline for solo developers using Claude Code. Every feature starts with a two-minute spec conversation. The AI stays on-target through planning, execution, and verification without the developer re-explaining context. When work pauses, the spec is the handoff — readable by the next Claude Code session, or by the developer themselves in six months.

The framework is so small it disappears: a handful of markdown skill files, a Node.js installer, and a `.specs/` folder in every project.

## Users & Use Cases

**Primary user:** Solo developers and indie hackers shipping personal projects or small products with Claude Code as their primary development driver.

**Core use cases:**

1. **Starting a new feature** — developer runs `/spek:new` + `/spek:discuss` to anchor intent before writing any code, preventing the AI from immediately going off-script.
2. **Resuming after a break** — developer runs `/spek:resume` after a context reset; the AI reads the spec and picks up exactly where it left off without re-prompting.
3. **Adopting existing code** — developer runs `/spek:adopt` to retroactively document something already built, establishing a spec baseline for future changes.
4. **Verifying work** — developer runs `/spek:verify` to confirm the implementation matches the original goal, not just that the code runs.
5. **Greenfield project kickoff** — developer runs `/spek:kickoff` to define problem, vision, and initial feature set before writing a single line of code.

## Success Metrics

- A developer can complete the full workflow (kickoff → discuss → plan → execute → verify) on a new feature without re-explaining the goal at any step.
- The total token overhead of using SpekLess (reading specs, writing logs) is lower than the cost of recovering from a single significant context-drift incident.
- Installation takes under 2 minutes on a fresh git repo with zero prior setup.
- The framework requires no configuration beyond accepting installer defaults for a first project.

## Scope - v1.0.0

### In Scope

- **10 Claude Code skills** (`kickoff`, `new`, `adopt`, `discuss`, `plan`, `execute`, `verify`, `commit`, `status`, `resume`) shipped as markdown files in `skills/`
- **Node.js installer** (`install.js`) that sets up SpekLess in any git repo — single CommonJS file, zero npm dependencies
- **5 templates** scaffolding `spec.md`, `execution.md`, `project.md`, `config.yaml`, and `principles.md`
- **2 worked examples** showing the full greenfield workflow and the retroactive adopt workflow
- **Architecture and comparison documentation** in `docs/`
- **Windows / Git Bash compatibility** across all skills and the installer

### Out of Scope

- Multi-agent orchestration or wave-based parallel execution (GSD-style complexity)
- CI/CD and git hook integration (auto-spec validation in pipelines)
- Coverage auditing (Nyquist-style test coverage baked into workflow)
- Standalone CLI or binary beyond `install.js`
- IDE plugins or editor integrations
- Team collaboration features (shared spec reviews, PR-linked specs)

## Constraints

- **Claude Code-native only.** Skills are markdown files read by Claude Code. No runtime, no build step, no separate tooling required.
- **Zero npm dependencies.** `install.js` uses only Node.js built-ins (`fs`, `path`, `os`, `readline`). Requires Node.js 14 LTS or later.
- **Windows / Git Bash compatible.** The installer and all skills must work on Windows under Git Bash, not just Linux/macOS. Path quoting and newline handling must be defensive.
- **Single-agent topology.** The framework must not require or encourage multi-agent orchestration — one main conversation drives everything.
- **Solo maintainer.** No CI pipeline, no automated tests in v1. Changes are validated by manual smoke test against a scratch project.

## Initial Feature Set

<!--
Checkboxes tick as features reach `status: done`. This doubles as a
lightweight backlog — the single source of truth for "what are we building right now."
-->

- [x] 001: Core workflow skills — The six primary skills (kickoff, new, discuss, plan, execute, verify) that constitute the full spec-first workflow
- [x] 002: Convenience skills — The four supporting skills (commit, status, resume, adopt) that complete the developer experience
- [x] 003: Installer — install.js with full interactive prompts, `--defaults` flag, and idempotent re-run behavior
- [x] 004: Templates and scaffolding — Five templates covering spec, execution log, project vision, config, and principles
- [x] 005: Documentation and examples — Architecture reference, GSD/SpecKit comparison, and two worked examples (greenfield + adopted)
