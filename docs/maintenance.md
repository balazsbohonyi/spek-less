# SpekLess Maintenance Guide

Agent operating instructions for editing the SpekLess framework itself - conventions, change procedures, and smoke testing. Read this when you're about to modify a skill, template, or the installer.

---

## Skill file conventions

Every file in `skills/` follows this shape:

```markdown
---
name: spek:<skill-name>
description: <one-paragraph description - canonical source wording>
---

# spek:<skill-name> - <short tagline>

<1-2 paragraphs: what this skill does and when to invoke it>

## Inputs
<what arguments / context the skill expects>

## Reads (section-scoped)
<exactly which files and which sections the skill reads - be specific about section-scoped reads vs whole-file reads>

## Behavior
<what the skill actually does, including decision points and sub-agent delegation rules>

## Writes
<what files/sections the skill modifies - be explicit about what it does NOT touch>

## Output to user
<what the skill tells the user at the end - always include a suggested next step>

## Hard rules
<bulleted list of invariants this skill enforces - idempotency, section scope, no side effects, etc.>
```

**Canonical source format:** `skills/` is the single source of truth. Source skills are authored once in canonical SpekLess form, then rendered per agent during install and sync.

**Frontmatter format:** keep `name: spek:<skill>` in source files. The installer rewrites canonical `spek:<skill>` references to the configured namespace in installed copies, and Codex additionally converts them to `{ns}-<skill>` inside packaged `SKILL.md` files.

**Description field:** this is what skill loaders read when deciding whether a skill is relevant. Be specific about *when to use this skill vs alternatives*. Example: the `spek:new` description says "For greenfield projects use spek:kickoff first. For retroactively documenting existing code use spek:adopt." That disambiguation is critical.

**Command references:** source skills use two forms only:
- Internal guidance, headings, frontmatter, and behavior text use bare `spek:<skill>`.
- User-facing output and AskUserQuestion text use `{{CMD_PREFIX}}spek:<skill>`.

Do not hardcode `/` or `$` in source skill files. Do not hand-author Codex package directories in source.

**Length budget:** skill files should be **under ~300 lines** each. These are instructions the agent reads in-context, not documentation. Cut anything that is not load-bearing. If a skill file is getting too long, the skill is probably doing too much - consider splitting.

---

## Template file conventions

Templates in `_templates/` are plain markdown/yaml with `{{PLACEHOLDER}}` markers. The installer (`install.js`) substitutes placeholders with `String.prototype.replace`, then renders canonical command references for the selected agent and namespace.

Current placeholders:
- `{{ID}}`, `{{TITLE}}`, `{{DATE}}` - used in `spec.md.tmpl`
- `{{PROJECT_NAME}}`, `{{DATE}}` - used in `project.md.tmpl`
- `{{TITLE}}` - used in `execution.md.tmpl`
- `{{NAMESPACE}}`, `{{SPECS_ROOT}}`, `{{SUGGEST_COMMITS}}`, `{{SUBAGENT_THRESHOLD}}`, `{{COMMIT_STYLE}}` - used in `config.yaml.tmpl`

Canonical command references in templates use bare `spek:<skill>`. The installer renders them to:
- `{ns}:<skill>` for Claude Code and OpenCode
- `{ns}-<skill>` for Codex

When adding a new placeholder, update both the template and the code that substitutes it. The installer uses `String.prototype.replace(new RegExp('{{KEY}}', 'g'), value)` - no `sed`, no delimiter issues.

Templates contain HTML comments (`<!-- ... -->`) as inline guidance for humans editing the resulting files. Do not convert these to visible text - they are meant to disappear from rendered output.

---

## Installer conventions

- **Zero runtime dependencies.** `install.js` is a single CommonJS file that uses only Node.js built-ins (`fs`, `path`, `os`, `readline`, `child_process`). No `npm`, no `node_modules`, no `package.json`.
- **Node.js 14 LTS minimum.** Uses the callback-based `readline.createInterface` API, not `readline/promises`.
- **Idempotent on existing projects.** Re-running preserves existing `.specs/principles.md` and all feature folders. `config.yaml` is always overwritten on re-run because `collectConfig()` reads existing values as defaults before prompting. The `.specs/_templates/` directory is also overwritten with the latest rendered framework templates on re-install.
- **Per-project config is sovereign.** If both per-project and global configs exist, per-project wins. The installer writes per-project by default.
- **Rendered installs, not raw copies.** Installing skills means:
- applying `{{CMD_PREFIX}}`
- rewriting canonical `spek:<skill>` references to the configured namespace
- packaging Codex skills as `.codex/skills/{ns}-<skill>/SKILL.md`
- rendering command references inside `_templates/`
- **Codex skill encoding matters.** Codex `SKILL.md` files must be written as UTF-8 **without BOM** so the opening `---` frontmatter delimiter is at byte 0. Avoid Windows PowerShell `Set-Content -Encoding utf8` for Codex skill writes; it can add a BOM. Prefer `install.js` or an explicit no-BOM writer.
- **Stale install cleanup is required.** Reinstall must remove deleted skills and templates from installed copies. For Codex it must also clean up legacy flat `.md` files left by older broken installs.
- **`--defaults` / `-y` flag.** Passing either flag skips all prompts, skips the summary confirmation, and runs non-interactively. Useful for scripted setups and quick trials.
- **All prompts have sensible defaults.** A user pressing Enter at every prompt should get a working install with reasonable choices.
- **Platform guards.** On startup, the installer detects WSL + Windows-native Node.js (where `process.execPath` starts with `/mnt/`) and exits with a clear error message pointing the user to `nvm`. Gracefully skip global install if `os.homedir()` returns null.

---

## Making changes

### Adding a new skill

After confirming with the user that the new skill is warranted (see [When to ask](../CLAUDE.md#when-to-ask-the-user-vs-just-do-it)):

1. Decide whether the new skill is genuinely needed, or whether an existing skill should be extended. **Default to extending.** New skills expand the surface area users have to learn.
2. Read `skills/new.md` as a structural template.
3. Create `skills/<name>.md` following the canonical source conventions above.
4. Do not create agent-specific copies in source. The installer and Sync Rule derive those.
5. Update `README.md`, `CLAUDE.md`, and `docs/architecture.md` to reference the new skill.
6. Update `install.js` only if the new skill changes rendering behavior or install packaging. Ordinary new skills should be picked up automatically.
7. Update `docs/comparison.md` if the new capability changes the feature matrix.
8. Smoke test at least one Claude/OpenCode install and one Codex install before calling the change complete.

### Modifying an existing skill

1. Read the skill's current file in full. Skills have load-bearing details in the "Hard rules" section that are easy to accidentally break.
2. Check `docs/architecture.md` for invariants the skill enforces.
3. Make the edit in `skills/<name>.md` only.
4. If the edit affects command references, packaging, or install behavior, also review `_templates/`, `.specs/principles.md`, and `install.js`.
5. **Smoke test manually** (see [Manual smoke test](#manual-smoke-test) below).
6. If the edit changes externally visible behavior, update the README walkthrough that covers this skill.

### Changing a template

1. Search for the template filename across `skills/` and `install.js` to find all consumers.
2. If you add a placeholder, add the substitution in every consumer.
3. If the template mentions SpekLess commands, verify the installer still renders those references correctly for Claude/OpenCode and Codex.
4. Run the installer against a scratch directory to verify the generated config and copied templates look right.
5. If you change the `spec.md.tmpl` section structure, update **every skill** that reads sections from `spec.md` - several skills use `Grep "^## "` to find section boundaries.

### Changing the architecture

1. Edit `docs/architecture.md` first.
2. Then edit the affected skills and installer rendering rules.
3. Then update the worked example in `examples/001_toy-feature/` so it still matches what real runs would produce.
4. Then update README.
5. Then update `docs/comparison.md` if the feature matrix changes.

Architecture changes are the slowest kind of change to make correctly - budget time for the cascade.

---

## Manual smoke test

SpekLess has no automated test suite in v1.0.0. The smoke test is:

```bash
# 1. Create a scratch project
mkdir /tmp/spek-less-smoke && cd /tmp/spek-less-smoke
git init

# 2. Run the installer once for each agent you changed
node /path/to/spek-less/install.js
# Accept defaults or choose the target agent explicitly.

# 3. Verify the install
ls -la .specs/                    # should contain config.yaml and principles.md
ls -la .specs/_templates/         # should contain rendered templates, no stale deleted files
ls -la .claude/commands/spek/     # Claude Code path when Claude Code was selected
ls -la .opencode/commands/spek/   # OpenCode path when OpenCode was selected
ls -la .codex/skills/spek-new/    # Codex path when Codex was selected
cat .specs/config.yaml            # should have populated values, no {{PLACEHOLDERS}}

# 4. Start the selected agent in the scratch project and run a workflow
# Claude/OpenCode:
#   /spek:new "add a greeting endpoint"
# Codex:
#   $spek-new "add a greeting endpoint"
# Then continue with discuss/plan/execute/verify in the target agent's command form.
```

**Before committing a non-trivial change, run at least steps 1-3 of the smoke test.** Skipping this has already caused render and packaging bugs.
