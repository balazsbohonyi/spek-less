# SpekLess Maintenance Guide

Agent operating instructions for editing the SpekLess framework itself — conventions, change procedures, and smoke testing. Read this when you're about to modify a skill, template, or the installer.

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

**Frontmatter format:** `name` uses `spek:<skill>` even though the actual namespace is configurable at install time. The installer does not rewrite skill frontmatter — Claude Code resolves namespaces from the directory the skills live in (`.claude/commands/<ns>/`). Keep the `name` field as `spek:<skill>` as a reasonable default.

**Description field:** this is what Claude Code shows to the model when deciding whether a skill is relevant. Be specific about *when to use this skill vs alternatives*. Example: the `/spek:new` description says "For greenfield projects use /spek:kickoff first. For retroactively documenting existing code use /spek:adopt." — this disambiguation is critical.

**Length budget:** skill files should be **under ~300 lines** each. These are instructions Claude reads in-context, not documentation. Cut anything that isn't load-bearing. If a skill file is getting too long, the skill is probably doing too much — consider splitting.

---

## Template file conventions

Templates in `_templates/` are plain markdown/yaml with `{{PLACEHOLDER}}` markers. The installer (`install.js`) substitutes these via `String.prototype.replace`; skills substitute their own inline.

Current placeholders:
- `{{ID}}`, `{{TITLE}}`, `{{DATE}}` — used in `spec.md.tmpl`
- `{{PROJECT_NAME}}`, `{{DATE}}` — used in `project.md.tmpl`
- `{{TITLE}}` — used in `execution.md.tmpl`
- `{{NAMESPACE}}`, `{{SPECS_ROOT}}`, `{{SUGGEST_COMMITS}}`, `{{SUBAGENT_THRESHOLD}}`, `{{PROJECT_HINTS}}`, `{{COMMIT_STYLE}}` — used in `config.yaml.tmpl`

When adding a new placeholder, update both the template and the code that substitutes it. The installer uses `String.prototype.replace(new RegExp('{{KEY}}', 'g'), value)` — no `sed`, no delimiter issues.

Templates contain HTML comments (`<!-- ... -->`) as inline guidance for humans editing the resulting files. Do not convert these to visible text — they're meant to disappear from rendered output.

---

## Installer conventions

- **Zero runtime dependencies.** `install.js` is a single CommonJS file that uses only Node.js built-ins (`fs`, `path`, `os`, `readline`, `child_process`). No `npm`, no `node_modules`, no `package.json`.
- **Node.js 14 LTS minimum.** Uses the callback-based `readline.createInterface` API (not `readline/promises`, which requires Node 17+).
- **Idempotent on existing projects.** Re-running must preserve existing `.specs/config.yaml`, `.specs/principles.md`, and all feature folders. When a file already exists, either skip it or read it for defaults — never silently overwrite. The `_templates/` directory is the exception — it is always overwritten with the latest framework templates on re-install.
- **Per-project config is sovereign.** If both per-project and global configs exist, per-project wins. The installer writes per-project by default.
- **`--defaults` / `-y` flag.** Passing either flag at invocation skips all prompts (using the defaults), skips the summary confirmation, and runs non-interactively. Useful for scripted setups and quick trials.
- **All prompts have sensible defaults.** A user pressing Enter at every prompt should get a working install with reasonable choices.
- **Platform guards.** On startup, the installer detects WSL + Windows-native Node.js (where `process.execPath` starts with `/mnt/`) and exits with a clear error message pointing the user to `nvm`. Gracefully skips global install if `os.homedir()` returns null.

---

## Making changes

### Adding a new skill

After confirming with the user that the new skill is warranted (see [When to ask](../CLAUDE.md#when-to-ask-the-user-vs-just-do-it)):

1. Decide whether the new skill is genuinely needed, or whether an existing skill should be extended. **Default to extending.** New skills expand the surface area users have to learn.
2. Read `skills/new.md` as a structural template.
3. Create `skills/<name>.md` following the skill file conventions above.
4. Update `README.md`, `CLAUDE.md`, and `docs/architecture.md` to reference the new skill.
5. Update `install.js` only if the new skill needs special installation handling — it shouldn't, because the installer copies `skills/*.md` generically.
6. Update `docs/comparison.md` if the new capability changes the feature matrix.

### Modifying an existing skill

1. Read the skill's current file in full. Skills have load-bearing details in the "Hard rules" section that are easy to accidentally break.
2. Check `docs/architecture.md` for invariants the skill enforces.
3. Make the edit.
4. **Smoke test manually** (see [Manual smoke test](#manual-smoke-test) below).
5. If the edit changes externally-visible behavior, update the README walkthrough that covers this skill.

### Changing a template

1. Search for the template filename across `skills/` and `install.js` to find all consumers.
2. If you add a placeholder, add the substitution in every consumer.
3. Run the installer against a scratch directory to verify the generated config looks right.
4. If you change the `spec.md.tmpl` section structure, update **every skill** that reads sections from `spec.md` — several skills use `Grep "^## "` to find section boundaries.

### Changing the architecture

1. Edit `docs/architecture.md` first.
2. Then edit the affected skills.
3. Then update the worked example in `examples/001_toy-feature/` so it still matches what real runs would produce.
4. Then update README.
5. Then update `docs/comparison.md` if the feature matrix changes.

Architecture changes are the slowest kind of change to make correctly — budget time for the cascade.

---

## Manual smoke test

SpekLess has no automated test suite in v1.0.0. The smoke test is:

```bash
# 1. Create a scratch project
mkdir /tmp/spek-less-smoke && cd /tmp/spek-less-smoke
git init

# 2. Run the installer
node /path/to/spek-less/install.js
# Press Enter at every prompt to accept defaults.

# 3. Verify the install
ls -la .specs/                    # should contain config.yaml and principles.md
ls -la .claude/commands/spek/     # should contain all skill files
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
