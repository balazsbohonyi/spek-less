#!/usr/bin/env bash
#
# SpekLess installer
#
# Interactive installer for SpekLess — a lightweight spec-first development
# framework for Claude Code. Run this script inside any project (new or existing).
#
# What it does:
#   1. Asks a handful of configuration questions
#   2. Writes .specs/config.yaml (per-project) and optionally ~/.claude/spek-config.yaml (global)
#   3. Copies skills into .claude/commands/<namespace>/ or ~/.claude/commands/<namespace>/ or both
#   4. Optionally creates .specs/principles.md from the template
#   5. Copies templates to .specs/templates/ for runtime access by skills
#   6. Writes a SpekLess section to CLAUDE.md (creates it if missing)
#
# Idempotent: re-running preserves existing features, config, and principles.
# Only patches what's missing.
#
# Usage:
#   cd /path/to/your/project
#   /path/to/spek-less/install.sh
#   /path/to/spek-less/install.sh --defaults   # non-interactive, accept all defaults

set -euo pipefail

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
USE_DEFAULTS=false
case "${1:-}" in
    --defaults|-y) USE_DEFAULTS=true ;;
esac

# ---------------------------------------------------------------------------
# Locate the SpekLess source directory (where this script lives)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SKILLS_SRC="$SCRIPT_DIR/skills"
TEMPLATES_SRC="$SCRIPT_DIR/templates"

if [ ! -d "$SKILLS_SRC" ] || [ ! -d "$TEMPLATES_SRC" ]; then
    echo "ERROR: Cannot find skills/ or templates/ next to install.sh"
    echo "Expected layout: $SCRIPT_DIR/{skills,templates}/"
    exit 1
fi

PROJECT_ROOT="$(pwd)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ask() {
    # ask "prompt" "default"
    local prompt="$1"
    local default="$2"
    local answer
    if [ "$USE_DEFAULTS" = "true" ]; then
        echo "$default"
        return
    fi
    if [ -n "$default" ]; then
        read -r -p "$prompt [$default]: " answer
        echo "${answer:-$default}"
    else
        read -r -p "$prompt: " answer
        echo "$answer"
    fi
}

ask_yn() {
    # ask_yn "prompt" "default (y|n)"
    local prompt="$1"
    local default="$2"
    local answer
    local suffix
    if [ "$USE_DEFAULTS" = "true" ]; then
        case "$default" in
            [yY]*) echo "true" ;;
            *) echo "false" ;;
        esac
        return
    fi
    if [ "$default" = "y" ]; then
        suffix="[Y/n]"
    else
        suffix="[y/N]"
    fi
    read -r -p "$prompt $suffix: " answer
    answer="${answer:-$default}"
    case "$answer" in
        [yY]*) echo "true" ;;
        *) echo "false" ;;
    esac
}

banner() {
    echo
    echo "==============================================="
    echo "  $1"
    echo "==============================================="
    echo
}

escape_sed() {
    # Escape characters that are special in sed replacement strings: \ & |
    local value="$1"
    value="${value//\\/\\\\}"
    value="${value//&/\\&}"
    value="${value//|/\\|}"
    printf '%s' "$value"
}

# ---------------------------------------------------------------------------
# Git repo check
# ---------------------------------------------------------------------------
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "This directory is not a git repository."
    echo "SpekLess uses git for: starting_sha tracking, /spek:verify diffs,"
    echo "and /spek:commit integration."
    echo
    INIT_GIT=$(ask_yn "Initialize git here?" "y")
    if [ "$INIT_GIT" = "true" ]; then
        git init
        echo
    else
        echo "Warning: git-dependent features will not work until you run git init."
        echo
    fi
fi

# ---------------------------------------------------------------------------
# Welcome
# ---------------------------------------------------------------------------
banner "SpekLess installer"
echo "Installing into: $PROJECT_ROOT"
echo
echo "This installer is idempotent — re-running on a project that already has"
echo "SpekLess installed will preserve your features and config, only patching"
echo "anything missing."
echo
if [ "$USE_DEFAULTS" = "true" ]; then
    echo "Running in --defaults mode: all prompts will use default values."
    echo
fi

# ---------------------------------------------------------------------------
# Detect existing install
# ---------------------------------------------------------------------------
EXISTING_CONFIG=""
if [ -f ".specs/config.yaml" ]; then
    EXISTING_CONFIG=".specs/config.yaml"
    echo "Detected existing install at .specs/config.yaml"
    echo "Will preserve existing features and principles. You can accept current"
    echo "values by pressing Enter at each prompt."
    echo
elif [ -f "$HOME/.claude/spek-config.yaml" ]; then
    EXISTING_CONFIG="$HOME/.claude/spek-config.yaml"
    echo "Detected existing global config at $HOME/.claude/spek-config.yaml"
    echo "Defaults will be loaded from the global config."
    echo
fi

# ---------------------------------------------------------------------------
# Read existing values (if any) to use as defaults
# ---------------------------------------------------------------------------
get_yaml_value() {
    # Best-effort YAML scalar read (good enough for our flat config)
    local file="$1"
    local key="$2"
    if [ -f "$file" ]; then
        grep -E "^${key}:" "$file" 2>/dev/null | sed -E "s/^${key}:[[:space:]]*//" | head -n1 || true
    fi
}

DEFAULT_NAMESPACE="$(get_yaml_value "$EXISTING_CONFIG" namespace)"
DEFAULT_NAMESPACE="${DEFAULT_NAMESPACE:-spek}"

DEFAULT_SPECS_ROOT="$(get_yaml_value "$EXISTING_CONFIG" specs_root)"
DEFAULT_SPECS_ROOT="${DEFAULT_SPECS_ROOT:-.specs}"

DEFAULT_SUGGEST_COMMITS="$(get_yaml_value "$EXISTING_CONFIG" suggest_commits)"
DEFAULT_SUGGEST_COMMITS="${DEFAULT_SUGGEST_COMMITS:-false}"

DEFAULT_SUBAGENT_THRESHOLD="$(get_yaml_value "$EXISTING_CONFIG" subagent_threshold)"
DEFAULT_SUBAGENT_THRESHOLD="${DEFAULT_SUBAGENT_THRESHOLD:-3}"

DEFAULT_COMMIT_STYLE="$(get_yaml_value "$EXISTING_CONFIG" commit_style)"
DEFAULT_COMMIT_STYLE="${DEFAULT_COMMIT_STYLE:-plain}"

DEFAULT_PROJECT_HINTS="$(get_yaml_value "$EXISTING_CONFIG" project_hints)"
# Strip surrounding quotes that the template writes: project_hints: "..."
DEFAULT_PROJECT_HINTS="${DEFAULT_PROJECT_HINTS#\"}"
DEFAULT_PROJECT_HINTS="${DEFAULT_PROJECT_HINTS%\"}"
DEFAULT_PROJECT_HINTS="${DEFAULT_PROJECT_HINTS:-(none)}"

# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------
banner "Configuration"

NAMESPACE=$(ask "Slash command namespace (affects /NAMESPACE:plan, etc.)" "$DEFAULT_NAMESPACE")
while [[ "$NAMESPACE" =~ [[:space:]/] ]] || [ -z "$NAMESPACE" ]; do
    echo "ERROR: Namespace must be non-empty and contain no spaces or slashes."
    NAMESPACE=$(ask "Slash command namespace (affects /NAMESPACE:plan, etc.)" "$DEFAULT_NAMESPACE")
done
SPECS_ROOT=$(ask "Specs root directory (relative to project root)" "$DEFAULT_SPECS_ROOT")

echo
echo "Install scope — where should the skills live?"
echo "  1) Per-project only (.claude/commands/$NAMESPACE/) — skills only work in this project"
echo "  2) Global only (~/.claude/commands/$NAMESPACE/) — skills work in all projects; per-project config still written here"
echo "  3) Both — per-project wins when present"
INSTALL_SCOPE=$(ask "Choice (1/2/3)" "1")

echo
echo "Git integration: should /$NAMESPACE:execute suggest commits at natural boundaries?"
echo "Default is NO — respects your commit rhythm. You can still commit manually anytime."
SUGGEST_COMMITS=$(ask_yn "Suggest commits?" "n")

SUBAGENT_THRESHOLD=$(ask "Subagent delegation threshold (# of reads before /plan delegates to Explore)" "$DEFAULT_SUBAGENT_THRESHOLD")

echo
echo "Project language / framework hints (optional, free text)."
echo "Example: 'TypeScript + Bun + React. Prefer functional components. ESM only.'"
echo "Press Enter to skip."
if [ "$USE_DEFAULTS" = "true" ]; then
    PROJECT_HINTS="$DEFAULT_PROJECT_HINTS"
else
    read -r -p "Hints [$DEFAULT_PROJECT_HINTS]: " PROJECT_HINTS
    PROJECT_HINTS="${PROJECT_HINTS:-$DEFAULT_PROJECT_HINTS}"
fi

echo
CREATE_PRINCIPLES=$(ask_yn "Create starter principles.md? (/$NAMESPACE:kickoff will help fill it in later)" "y")

echo
echo "Commit message style for /$NAMESPACE:commit."
echo "  plain         — spec-anchored: '001: Add dark mode toggle — tasks 1-3' + bullet body"
echo "  conventional  — conventional commits: 'feat(001): add dark mode toggle'"
echo "  custom        — enter a free-text rule on the next line"
COMMIT_STYLE=$(ask "Commit style (plain/conventional/custom)" "$DEFAULT_COMMIT_STYLE")
if [ "$COMMIT_STYLE" = "custom" ]; then
    echo "Describe your commit rule in one line (e.g. 'prefix with [JIRA-xxx], sentence case')."
    if [ "$USE_DEFAULTS" = "true" ]; then
        COMMIT_STYLE="plain"
    else
        read -r -p "Rule: " COMMIT_STYLE_CUSTOM
        COMMIT_STYLE="${COMMIT_STYLE_CUSTOM:-plain}"
    fi
fi

# ---------------------------------------------------------------------------
# Summary and confirm
# ---------------------------------------------------------------------------
banner "Summary"
cat <<EOF
  Namespace:          $NAMESPACE  (slash commands: /$NAMESPACE:kickoff, /$NAMESPACE:new, /$NAMESPACE:plan, ...)
  Specs root:         $SPECS_ROOT
  Install scope:      $INSTALL_SCOPE (1=per-project, 2=global, 3=both)
  Suggest commits:    $SUGGEST_COMMITS
  Subagent threshold: $SUBAGENT_THRESHOLD
  Create principles:  $CREATE_PRINCIPLES
  Commit style:       $COMMIT_STYLE
EOF
echo
if [ "$USE_DEFAULTS" != "true" ]; then
    CONFIRM=$(ask_yn "Proceed with these settings?" "y")
    if [ "$CONFIRM" != "true" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# ---------------------------------------------------------------------------
# Create directories
# ---------------------------------------------------------------------------
banner "Installing"

mkdir -p "$SPECS_ROOT"

# Copy templates for runtime access by skills
TEMPLATES_DEST="$SPECS_ROOT/templates"
mkdir -p "$TEMPLATES_DEST"
for tmpl_file in "$TEMPLATES_SRC"/*.tmpl; do
    cp "$tmpl_file" "$TEMPLATES_DEST/"
done
echo "Copied templates to $TEMPLATES_DEST/"

PER_PROJECT_SKILLS_DIR=".claude/commands/$NAMESPACE"
GLOBAL_SKILLS_DIR="$HOME/.claude/commands/$NAMESPACE"

install_skills_to() {
    local dest="$1"
    mkdir -p "$dest"
    for skill_file in "$SKILLS_SRC"/*.md; do
        local name
        name="$(basename "$skill_file")"
        cp "$skill_file" "$dest/$name"
        echo "  copied skills/$name -> $dest/$name"
    done
}

case "$INSTALL_SCOPE" in
    1)
        echo "Installing skills to $PER_PROJECT_SKILLS_DIR"
        install_skills_to "$PER_PROJECT_SKILLS_DIR"
        ;;
    2)
        echo "Installing skills to $GLOBAL_SKILLS_DIR"
        install_skills_to "$GLOBAL_SKILLS_DIR"
        ;;
    3)
        echo "Installing skills to $PER_PROJECT_SKILLS_DIR"
        install_skills_to "$PER_PROJECT_SKILLS_DIR"
        echo "Installing skills to $GLOBAL_SKILLS_DIR"
        install_skills_to "$GLOBAL_SKILLS_DIR"
        ;;
    *)
        echo "Invalid install scope: $INSTALL_SCOPE"
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# Write config files (per-project and optionally global)
# ---------------------------------------------------------------------------
# Escape values once; reused for both per-project and global config writes.
NS_ESC="$(escape_sed "$NAMESPACE")"
SPECS_ESC="$(escape_sed "$SPECS_ROOT")"
SC_ESC="$(escape_sed "$SUGGEST_COMMITS")"
SAT_ESC="$(escape_sed "$SUBAGENT_THRESHOLD")"
PH_ESC="$(escape_sed "$PROJECT_HINTS")"
CS_ESC="$(escape_sed "$COMMIT_STYLE")"

write_config() {
    # write_config <destination_path>
    local dest="$1"
    sed \
        -e "s|{{NAMESPACE}}|$NS_ESC|g" \
        -e "s|{{SPECS_ROOT}}|$SPECS_ESC|g" \
        -e "s|{{SUGGEST_COMMITS}}|$SC_ESC|g" \
        -e "s|{{SUBAGENT_THRESHOLD}}|$SAT_ESC|g" \
        -e "s|{{PROJECT_HINTS}}|$PH_ESC|g" \
        -e "s|{{COMMIT_STYLE}}|$CS_ESC|g" \
        "$TEMPLATES_SRC/config.yaml.tmpl" > "$dest"
}

# Per-project config
CONFIG_PATH="$SPECS_ROOT/config.yaml"
if [ -f "$CONFIG_PATH" ]; then
    echo "Preserving existing $CONFIG_PATH (delete it and re-run if you want a full rewrite)"
else
    echo "Writing $CONFIG_PATH"
    write_config "$CONFIG_PATH"
fi

# Global config — written when installing globally (scope 2 or 3).
# Skills fall back to this file when no per-project config.yaml is present.
if [ "$INSTALL_SCOPE" = "2" ] || [ "$INSTALL_SCOPE" = "3" ]; then
    GLOBAL_CONFIG_PATH="$HOME/.claude/spek-config.yaml"
    if [ -f "$GLOBAL_CONFIG_PATH" ]; then
        echo "Preserving existing $GLOBAL_CONFIG_PATH (delete it and re-run if you want a full rewrite)"
    else
        echo "Writing $GLOBAL_CONFIG_PATH"
        write_config "$GLOBAL_CONFIG_PATH"
    fi
fi

# ---------------------------------------------------------------------------
# Write principles.md
# ---------------------------------------------------------------------------
PRINCIPLES_PATH="$SPECS_ROOT/principles.md"
if [ "$CREATE_PRINCIPLES" = "true" ]; then
    if [ -f "$PRINCIPLES_PATH" ]; then
        echo "Preserving existing $PRINCIPLES_PATH"
    else
        echo "Writing $PRINCIPLES_PATH"
        cp "$TEMPLATES_SRC/principles.md.tmpl" "$PRINCIPLES_PATH"
        echo "  (run /$NAMESPACE:kickoff to have SpekLess help fill it in)"
    fi
fi

# ---------------------------------------------------------------------------
# Write SpekLess block to CLAUDE.md
# ---------------------------------------------------------------------------
CLAUDEMD_PATH="CLAUDE.md"
if [ -f "$CLAUDEMD_PATH" ] && grep -qF "## SpekLess" "$CLAUDEMD_PATH"; then
    echo "CLAUDE.md already contains SpekLess block — skipping"
else
    echo "Writing SpekLess section to CLAUDE.md"
    cat >> "$CLAUDEMD_PATH" <<CLAUDEEOF

## SpekLess

This project uses SpekLess for spec-first development.
- **Config:** \`$SPECS_ROOT/config.yaml\`
- **Principles:** \`$SPECS_ROOT/principles.md\` — read by every skill, constrains all plans and execution
- **Feature specs:** \`$SPECS_ROOT/NNN_*/spec.md\` — one living design doc per feature
- **Skills:** \`.claude/commands/$NAMESPACE/\` — invoke as \`/$NAMESPACE:new\`, \`/$NAMESPACE:adopt\`, \`/$NAMESPACE:discuss\`, \`/$NAMESPACE:plan\`, \`/$NAMESPACE:execute\`, \`/$NAMESPACE:verify\`, \`/$NAMESPACE:commit\`, \`/$NAMESPACE:status\`, \`/$NAMESPACE:resume\`

Workflow: \`/$NAMESPACE:kickoff\` (greenfield) or \`/$NAMESPACE:new\` (feature) → \`/$NAMESPACE:discuss\` → \`/$NAMESPACE:plan\` → \`/$NAMESPACE:execute\` → \`/$NAMESPACE:verify\`
CLAUDEEOF
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
banner "Done"
cat <<EOF
SpekLess is installed. Next steps:

  1. (Optional) Edit $SPECS_ROOT/principles.md to capture your project's conventions,
     or run /$NAMESPACE:kickoff — it will offer to help fill it in.
  2. Start a new feature:
       Greenfield project?  →  /$NAMESPACE:kickoff
       Existing codebase?   →  /$NAMESPACE:adopt or /$NAMESPACE:new
  3. Work through a feature: /$NAMESPACE:discuss → /$NAMESPACE:plan → /$NAMESPACE:execute → /$NAMESPACE:verify
  4. Pick up where you left off: /$NAMESPACE:resume

Read $SCRIPT_DIR/README.md for walkthroughs and design rationale.
EOF
