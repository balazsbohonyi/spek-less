---
name: spek-commit
description: Draft and create a git commit summarizing work done on a feature — reads the spec, execution log tail, and git diff, drafts a spec-anchored commit message, and asks the user to confirm before committing. Never automatic. Never amends. Never bypasses hooks.
---

# spek-commit — User-triggered, LLM-drafted commits

You are drafting a git commit message that summarizes the work done on a feature since the last commit, and (on user confirmation) creating the commit. You are the only skill besides `spek-execute` that can write to the working tree, and the only skill anywhere that runs `git commit`.

This is a **convenience skill**, not a workflow step. The user invokes it whenever they want — after one task, after all tasks, after a verify-fix pass, never. SpekLess does not force commits and never calls this skill automatically.

## Inputs

- Optional feature argument (e.g. `spek-commit 003`). Resolve via current-feature discovery if omitted.
- Optional free-text modifier (e.g. `spek-commit just the verify fixes`, `spek-commit scope=task 3`). Use it to narrow what the draft summarizes.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`, `commit_style`. `commit_style` is one of: `plain` (default), `conventional`, or a free-text custom rule the installer captured. Empty / missing = treat as `plain`.
2. **`.specs/principles.md`** (if exists) — full file. Principles **win over config** when they declare something more specific about commit messages (e.g. "prefix with [JIRA-xxx]"). Config is the baseline; principles override.
3. **`<feature>/spec.md`** — frontmatter (`id`, `title`) plus `## Plan` → `### Tasks` only. Use Grep to find headers, then targeted Read. You need checkbox state and task titles, not `### Details`.
4. **`<feature>/execution.md`** — tail (~80 lines). This tells you what's been done recently.
5. **Git state** — run via Bash:
   - `git status --short` (detect clean tree, staged vs unstaged split)
   - `git diff --stat` and `git diff --cached --stat` (file-level summary of changes)
   - Never bulk-read source files. The Plan and execution log tell you what was done; the diff confirms which files changed.

## Main loop

### 1. Resolve feature

Use the standard current-feature discovery: explicit argument (supports `NNN.M` form) → git branch (`feat/NNN-*` or `feat/NNN.M-*`) → most-recently-modified `.specs/NNN_*/` or `.specs/NNN.M_*/` → ask.

### 2. Detect nothing-to-commit

Run `git status --short`. If the working tree and index are both clean, output:

```
Nothing to commit — working tree is clean.
```

and stop. Do not proceed further.

### 3. Stage handling

- **If something is already staged** (`git diff --cached` non-empty), use **exactly that staged set**. Do not add more files. Proceed to step 4.
- **If nothing is staged but the working tree has modifications**, use the AskUserQuestion tool with three options:
  1. **"Stage all modified tracked files and continue"** (recommended)
  2. **"Cancel — I'll stage manually and re-run"**
  3. **"Cancel entirely"**

  On option 1, run `git add -u` (tracked files only — never `git add .`, which could pick up secrets or untracked artifacts). Then proceed.
  On options 2/3, stop cleanly.

### 3.5. Spec-file split detection

After staging is resolved, check whether the staged set mixes `.specs/` files with source files. Run `git diff --cached --name-only` and partition the results:

- If the staged files are **all under `.specs/`** or **all outside `.specs/`**, proceed to step 4 without prompting.
- If staged files include **both `.specs/` paths and source paths**, use AskUserQuestion:
  1. **"Commit together — single message covers everything"** (recommended for most cases)
  2. **"Split — commit source files first, then `.specs/` files separately"**
  3. **"Split — commit `.specs/` files first, then source files separately"**

If the user chooses to split: execute two sequential commits, each with its own drafted message and AskUserQuestion confirmation. Stage and commit the first group, then stage and commit the second group.

### 4. Determine scope

Run `git log --oneline --follow -- <specs_root>/<feature>/` to find the most recent commit touching this feature's directory. Everything in execution.md *after* that commit's timestamp is *uncommitted work* (or everything, if there are no prior commits). Extract:

- **Tasks that became checked** since the anchor (cross-reference `Task N complete` log entries with current checkbox state in the Plan).
- **Verify-fix entries** since the anchor (log entries produced after a `spek-verify` pass flagged issues).
- **Course corrections** since the anchor.

If the user supplied a free-text modifier ("just the verify fixes"), use it to narrow the scope — include only the matching entries in the draft.

### 5. Multi-feature guard

Look at the staged file paths. If any staged file is listed in the `Files:` line of another feature's Plan (grep `.specs/*/spec.md` for the file path), you have a cross-feature commit. AskUserQuestion:

1. **"Commit anyway — single message covers both features"**
2. **"Cancel — I'll split this commit"**

Default to asking rather than refusing. The user might have a legitimate reason.

### 6. Draft the commit message

Base format (when `commit_style` is `plain` or unset):

```
<id>: <summary> — <scope descriptor>

- <bullet per completed task or verify fix, with primary file in parens>
- <...>

Spec: <relative path to spec.md>
```

Example:

```
001: Add dark mode toggle — tasks 1–3

- Task 1: Theme state module with localStorage (src/theme/state.ts)
- Task 2: ThemeSelect component wired into settings (src/components/ThemeSelect.tsx)
- Task 3: Initial theme applied on app mount (src/app.ts)

Spec: .specs/001_add-dark-mode-toggle/spec.md
```

**Rules:**
- **Subject ≤72 characters.** If the summary + scope descriptor would exceed this, truncate the summary (not the id).
- **One bullet per completed unit of work** — a task, a verify fix, or a course correction. Reference the primary file touched (the one with the most substantial change). Do not list every file touched; the point is readability, not completeness.
- **Footer is always the relative spec path**, so anyone reading the commit can jump to the full design doc.
- **No Claude Code attribution footer.** Do not append `🤖 Generated with Claude Code` or `Co-Authored-By:`. Users can add attribution manually if they want it.

**Style variants:**

- **`commit_style: conventional`** — use conventional commits format. Map task intent to a type (`feat` for new capability, `fix` for bug fix / verify fix, `refactor` for structural change, `docs` for doc-only, `test` for test-only). Subject becomes `<type>(<id>): <summary>`. Example: `feat(001): add dark mode toggle`.
- **`commit_style: <custom free text>`** — the installer captured a user-supplied rule. Read it literally and apply it to the draft.
- **`principles.md` overrides** — if the principles file declares a commit rule, it supersedes the config style. Read the principles carefully: a rule like "prefix all commits with [JIRA-xxx]" takes precedence over the conventional style from config.

### 7. Confirm with the user

Print the drafted message to the conversation, then use AskUserQuestion:

1. **"Commit as drafted"** (recommended)
2. **"Edit the message — I'll paste a revision"**
3. **"Cancel"**

### 8. Edit path

If the user picks "edit":
1. Print the current draft clearly (fenced code block).
2. Tell the user: *"Paste your revised message in your next reply — I'll re-confirm before committing."*
3. Wait for their reply.
4. Re-run step 7 with the revised message as the draft. Loop until they commit or cancel.

### 9. Commit

Run the commit via Bash. Use a HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
<subject>

<body>

Spec: <path>
EOF
)"
```

**Never use `--amend`.** **Never use `--no-verify`.** **Never disable GPG signing.** These are hard rules regardless of hook failures — see "Hook failure handling" below.

Capture the resulting short SHA: `git rev-parse --short HEAD`.

### 10. Output to the user

```
Committed <short-sha>: <subject>

Next: <suggestion — $spek-execute to continue, $spek-verify if all tasks are done, or stop>.
```

## Hook failure handling

If `git commit` exits non-zero because a pre-commit hook rejected the commit:

1. Surface the hook's stderr to the user verbatim.
2. Do NOT retry with `--no-verify`. That's a Claude Code-level hard rule, and it's also the right call here — hooks exist to catch problems, and bypassing them would undo the exact audit trail the user wanted from this skill.
3. Suggest the user fix the underlying issue, then re-run `spek-commit`.
4. Do NOT append a `Committed` entry to `execution.md` — the commit did not happen.

## Addressing verify-flagged commits

When `spek-commit` runs after a verify→fix cycle, the execution log tail will contain entries from `spek-execute` addressing the Verification section's issues. The draft should name those as fixes, not as a re-do of the original tasks. Example:

```
001: Fix verify-flagged issues — auth session leak

- Clear session token on logout (src/auth/logout.ts)
- Add null check in middleware (src/auth/middleware.ts)

Spec: .specs/001_auth-rewrite/spec.md
```

The cue is in the log entries: look for headings like `Fix: <something>` or `Addressing verify issue: <something>` produced by the prior `spek-execute` run.

## Writes

- **Git commit** — exactly one, and only after explicit user confirmation.
- **Nothing else.** No edits to `execution.md`, no edits to `spec.md`, no edits to source files, no edits to config.

## Output to user

See step 10. Always end with a suggested next step.

## Hard rules

- **Never commits without explicit user confirmation** via AskUserQuestion. A single canceled confirmation = no commit, full stop.
- **Never `--amend`.** Every run produces a new commit. If the user wants to fix the previous commit, they should do it manually.
- **Never `--no-verify`.** Pre-commit hooks run normally. Surface failures, don't bypass them.
- **Never disables GPG signing** or other commit integrity mechanisms.
- **Never auto-stages silently.** Either the user staged first, or they explicitly approved staging this invocation.
- **Never uses `git add .` or `git add -A`.** Use `git add -u` (tracked files only) to avoid accidentally committing secrets or untracked artifacts.
- **Section-scoped reads.** No bulk-reads of `spec.md` or source files. The Plan's task list and the execution log tell you what happened.
- **Never writes to `execution.md`.** Commits are recorded in git history; the execution log is a work journal, not a commit log.
- **No Claude Code attribution footer** in drafted messages. Users override this manually if they want attribution.
- **Principles override config.** When `principles.md` declares a commit rule, it supersedes `commit_style` from config.
- **Single feature per invocation by default.** Cross-feature diffs trigger an explicit confirmation.
- **Idempotent.** Re-running after a successful commit with no new changes → clean exit. Re-running on the same unstaged changes after cancelling → regenerates the draft from current state.
- **Never spawns sub-agents.** Same reasoning as `spek-execute`: the user is watching a commit get drafted, and that oversight is the point.
