'use strict';

/**
 * SpekLess installer
 *
 * Interactive installer for SpekLess — a lightweight spec-first development
 * framework for Claude Code, Codex CLI, and OpenCode. Run this script inside
 * any project (new or existing).
 *
 * What it does:
 *   1. Asks a handful of configuration questions
 *   2. Writes .specs/config.yaml (per-project) and optionally ~/.claude/spek-config.yaml (global)
 *   3. Renders skills into agent-specific install targets
 *   4. Optionally creates .specs/principles.md from the template
 *   5. Renders templates to .specs/_templates/ for runtime access by skills
 *
 * Idempotent: re-running preserves existing features and principles.
 * config.yaml is always overwritten (collectConfig reads existing values as defaults).
 *
 * Usage:
 *   cd /path/to/your/project
 *   node /path/to/spek-less/install.js
 *   node /path/to/spek-less/install.js --defaults   # non-interactive, accept all defaults
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Module-level state (set by main() before calling collectConfig)
// ---------------------------------------------------------------------------

let useDefaults = false;

// ---------------------------------------------------------------------------
// Terminal capability detection
// ---------------------------------------------------------------------------

function detectTerminal() {
  // NO_COLOR env var: https://no-color.org/
  if (process.env.NO_COLOR !== undefined) return { useColor: false, useUnicode: false };
  if (!process.stdout.isTTY) return { useColor: false, useUnicode: false };
  if (process.env.TERM === 'dumb') return { useColor: false, useUnicode: false };

  const useColor = true;
  // Unicode box-drawing is safe when the terminal reports color support
  const useUnicode = !!(
    process.env.COLORTERM ||
    process.env.WT_SESSION ||
    (process.env.TERM && /xterm|256color|color|ansi/i.test(process.env.TERM))
  );

  return { useColor, useUnicode };
}

const TERM = detectTerminal();

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const C = {
  reset:   TERM.useColor ? '\x1b[0m'  : '',
  bold:    TERM.useColor ? '\x1b[1m'  : '',
  dim:     TERM.useColor ? '\x1b[2m'  : '',
  cyan:    TERM.useColor ? '\x1b[36m' : '',
  green:   TERM.useColor ? '\x1b[32m' : '',
  yellow:  TERM.useColor ? '\x1b[33m' : '',
  magenta: TERM.useColor ? '\x1b[35m' : '',
  gray:    TERM.useColor ? '\x1b[90m' : '',
  red:     TERM.useColor ? '\x1b[31m' : '',
};

// ---------------------------------------------------------------------------
// Card renderer
// ---------------------------------------------------------------------------

// Icons: unicode path uses narrow BMP symbols (all wide:false) to keep card() alignment exact.
// Log-prefix icons in runInstall() use emoji directly — overflow in prose lines is harmless.
const ICONS = {
  welcome: { uni: '\u2605 ', asc: '[>]', wide: false },  // ★ BLACK STAR
  config:  { uni: '\u2699 ', asc: '[*]', wide: false },  // ⚙ (no variation selector)
  summary: { uni: '\u2630 ', asc: '[~]', wide: false },  // ☰ TRIGRAM FOR HEAVEN
  install: { uni: '\u25b8 ', asc: '[>]', wide: false },  // ▸ SMALL BLACK RIGHT-POINTING TRIANGLE
  done:    { uni: '\u2713 ', asc: '[+]', wide: false },  // ✓ CHECK MARK
  error:   { uni: '\u2717 ', asc: '[!]', wide: false },  // ✗ BALLOT X
  info:    { uni: '\u2139 ', asc: '[i]', wide: false },  // ℹ (no variation selector)
};

/**
 * Render a full-terminal-width bordered step card.
 * @param {number} stepN   - Current step number (0 = no counter)
 * @param {number} total   - Total steps (0 = no counter)
 * @param {string} title   - Step title
 * @param {string} iconKey - Key into ICONS map
 */
function card(stepN, total, title, iconKey) {
  const iconDef = ICONS[iconKey] || ICONS.info;
  const icon = TERM.useUnicode ? iconDef.uni : iconDef.asc;
  const isWide = TERM.useUnicode && iconDef.wide;

  const width = process.stdout.columns || 80;
  const innerWidth = width - 2;

  const leftContent  = `  ${icon}  ${title}  `;
  const rightContent = total > 0 ? `  Step ${stepN} of ${total}  ` : '';
  // Emoji glyphs that are wide (2 cols) have .length 2 in JS but display as 2 cols —
  // that matches. However surrogate-pair emoji that also carry a trailing space in their
  // icon string mean the string length is already correct. We subtract 1 extra column
  // when the icon is wide to compensate for terminal double-width rendering.
  const spacerLen = Math.max(0, innerWidth - leftContent.length - rightContent.length - (isWide ? 1 : 0));
  const spacer = ' '.repeat(spacerLen);

  if (TERM.useUnicode) {
    const bar = '\u2500'.repeat(innerWidth);
    const top = '\u250C' + bar + '\u2510';
    const bot = '\u2514' + bar + '\u2518';
    console.log('');
    console.log(C.reset + top);
    console.log('\u2502' + C.bold + leftContent + C.reset + spacer + C.dim + rightContent + C.reset + '\u2502');
    console.log(C.reset + bot);
    console.log('');
  } else {
    const bar = '='.repeat(innerWidth);
    console.log('');
    console.log(`+${bar}+`);
    console.log(`|${leftContent}${spacer}${rightContent}|`);
    console.log(`+${bar}+`);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Command string colorizer
// ---------------------------------------------------------------------------

/**
 * Wrap a command string (e.g. /spek:plan) in green ANSI when color is enabled.
 */
function cmd(str) {
  return TERM.useColor ? C.green + str + C.reset : str;
}

function renderSkillRef(namespace, agent, skillName) {
  return agent === 'codex'
    ? `${namespace}-${skillName}`
    : `${namespace}:${skillName}`;
}

function renderCommand(namespace, agent, prefix, skillName) {
  return `${prefix}${renderSkillRef(namespace, agent, skillName)}`;
}

function renderSpekRefs(content, namespace, agent) {
  return content.replace(/\bspek:([a-z0-9-]+)\b/g, (_, skillName) => (
    renderSkillRef(namespace, agent, skillName)
  ));
}

function renderTemplateContent(content, namespace, agent) {
  return renderSpekRefs(content, namespace, agent);
}

function renderSkillContent(content, namespace, agent, prefix) {
  const withPrefix = content.replace(/\{\{CMD_PREFIX\}\}/g, prefix);
  return renderSpekRefs(withPrefix, namespace, agent);
}

function isLegacySpekSkillFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return /(^|\n)name:\s*"?spek:[a-z0-9-]+/m.test(content)
      || /(^|\n)#\s+spek:[a-z0-9-]+/m.test(content);
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// readline helpers (Node 14 LTS compatible — no readline/promises needed)
// ---------------------------------------------------------------------------

/**
 * Prompt the user for a string value.
 * Returns defaultVal immediately when useDefaults is set.
 */
function ask(prompt, defaultVal) {
  if (useDefaults) return Promise.resolve(defaultVal != null ? String(defaultVal) : '');

  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const hint = (defaultVal != null && defaultVal !== '')
      ? ` ${C.gray}[${defaultVal}]${C.reset}`
      : '';
    rl.question(`${C.green}?${C.reset} ${prompt}${hint}: `, answer => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed !== '' ? trimmed : (defaultVal != null ? String(defaultVal) : ''));
    });
  });
}

/**
 * Prompt the user for a yes/no answer.
 * defaultYN: 'y' or 'n'
 * Returns the string 'true' or 'false'.
 */
function askYN(prompt, defaultYN) {
  if (useDefaults) return Promise.resolve(defaultYN === 'y' ? 'true' : 'false');

  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const suffix = defaultYN === 'y'
      ? `${C.gray}[Y/n]${C.reset}`
      : `${C.gray}[y/N]${C.reset}`;
    rl.question(`${C.green}?${C.reset} ${prompt} ${suffix}: `, answer => {
      rl.close();
      const a = (answer.trim().toLowerCase() || defaultYN);
      resolve(a.startsWith('y') ? 'true' : 'false');
    });
  });
}

/**
 * Prompt the user to pick from a numbered list of choices.
 * Returns the chosen index (0-based). Falls back to defaultIndex on invalid input.
 */
function askChoice(prompt, choices, defaultIndex) {
  if (useDefaults) return Promise.resolve(defaultIndex);

  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const hint = `${C.gray}[${defaultIndex + 1}]${C.reset}`;
    rl.question(`${C.green}?${C.reset} ${prompt} ${hint}: `, answer => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === '') { resolve(defaultIndex); return; }
      const n = parseInt(trimmed, 10);
      resolve((!isNaN(n) && n >= 1 && n <= choices.length) ? n - 1 : defaultIndex);
    });
  });
}

// ---------------------------------------------------------------------------
// YAML scalar reader (flat key: value, no complex YAML parsing)
// ---------------------------------------------------------------------------

/**
 * Read a scalar value from a flat YAML file.
 * Strips surrounding quotes if present.
 */
function readYamlValue(filePath, key) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const re = new RegExp(`^${key}:\\s*(.+)`, 'm');
    const m = content.match(re);
    if (!m) return '';
    return m[1].trim().replace(/^["']|["']$/g, '');
  } catch (_) {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Config collection flow
// ---------------------------------------------------------------------------

/**
 * Run the interactive configuration questions and return a config object.
 * @param {boolean} defaultsMode - Skip all prompts and use defaults
 */
async function collectConfig(defaultsMode) {
  useDefaults = defaultsMode;

  // Detect existing config (per-project wins over global)
  const cwd = process.cwd();
  let existingConfig = '';
  const perProjectConfig = path.join(cwd, '.specs', 'config.yaml');
  const home = safeHomedir();
  const globalConfig = home ? path.join(home, '.claude', 'spek-config.yaml') : '';

  if (fs.existsSync(perProjectConfig)) {
    existingConfig = perProjectConfig;
    console.log(`${C.dim}Detected existing install at ${cmd('.specs/config.yaml')} ${C.reset}`);
    console.log(`${C.dim}Will preserve existing features and principles. Press Enter to keep current values.${C.reset}`);
  } else if (globalConfig && fs.existsSync(globalConfig)) {
    existingConfig = globalConfig;
    console.log(`${C.dim}Detected existing global config at ${globalConfig}${C.reset}`);
    console.log(`${C.dim}Defaults will be loaded from the global config.${C.reset}`);
  }

  // Read defaults from existing config
  const defaultNamespace       = readYamlValue(existingConfig, 'namespace')         || 'spek';
  const defaultSpecsRoot       = readYamlValue(existingConfig, 'specs_root')        || '.specs';
  const defaultSuggestCommits  = readYamlValue(existingConfig, 'suggest_commits')   || 'false';
  const defaultSubagentThresh  = readYamlValue(existingConfig, 'subagent_threshold')|| '3';
  const defaultCommitStyle     = readYamlValue(existingConfig, 'commit_style')      || 'plain';

  // Step 2: Configuration
  card(2, 5, 'Configuration', 'config');

  // Namespace — with validation loop
  let namespace = await ask('Command namespace (affects spek:plan / spek-plan style names)', defaultNamespace);
  while (!namespace || /[\s/]/.test(namespace)) {
    console.log(`${C.red}Error:${C.reset} Namespace must be non-empty and contain no spaces or slashes.`);
    namespace = await ask('Command namespace (affects spek:plan / spek-plan style names)', defaultNamespace);
  }
  console.log('');

  // Agent question - determines cmdPrefix and skills install directory
  const agentChoices = ['claude_code', 'codex', 'opencode'];
  const agentLabels  = ['Claude Code', 'Codex CLI', 'OpenCode'];
  const defaultAgentIdx = 0;
  console.log('Which AI coding agent are you using?');
  agentLabels.forEach((label, i) => console.log(`  ${C.bold}${i + 1}${C.reset}. ${label}`));
  const agentIdx = await askChoice('Choice', agentChoices, defaultAgentIdx);
  const aiAgent   = agentChoices[agentIdx];
  const aiAgentLabel = agentLabels[agentIdx];
  const cmdPrefix = aiAgent === 'codex' ? '$' : '/';
  console.log('');

  const specsRoot = await ask('Specs root directory (relative to project root)', defaultSpecsRoot);

  console.log('');
  console.log(`Git integration: should ${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'execute'))} suggest commits at natural boundaries?`);
  console.log(`${C.dim}Default is NO — respects your commit rhythm. You can still commit manually anytime.${C.reset}`);
  const suggestCommitsAnswer = await askYN('Suggest commits?', defaultSuggestCommits === 'true' ? 'y' : 'n');
  console.log('');
  const suggestCommits = suggestCommitsAnswer;

  const subagentThreshold = await ask(
    `Subagent delegation threshold (# of reads before ${renderSkillRef(namespace, aiAgent, 'plan')} delegates to Explore)`,
    defaultSubagentThresh
  );

  console.log('');
  const createPrinciples = await askYN(
    `Create starter principles.md? (${renderCommand(namespace, aiAgent, cmdPrefix, 'kickoff')} will help fill it in later)`,
    'y'
  );

  console.log('');
  console.log(`Commit message style for ${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'commit'))}:`);
  console.log(`  ${C.bold}plain${C.reset}         — spec-anchored: ${cmd("'001: Add dark mode toggle — tasks 1-3'")}`);
  console.log(`  ${C.bold}conventional${C.reset}  — conventional commits: ${cmd("'feat(001): add dark mode toggle'")}`);
  console.log(`  ${C.bold}custom${C.reset}        — enter a free-text rule on the next line`);
  let commitStyle = await ask('Commit style (plain/conventional/custom)', defaultCommitStyle);
  console.log('');
  if (commitStyle === 'custom') {
    console.log(`${C.dim}Describe your commit rule in one line (e.g. 'prefix with [JIRA-xxx], sentence case').${C.reset}`);
    const customRule = await ask('Rule', 'plain');
    console.log('');
    commitStyle = customRule || 'plain';
  }

  // Agent question — determines skills install directory
  // Compute agent-dependent directory labels for install scope question
  const perProjectDir = aiAgent === 'codex'
    ? `.codex/skills/${renderSkillRef(namespace, aiAgent, 'new')}/SKILL.md`
    : aiAgent === 'opencode'
      ? `.opencode/commands/${namespace}/`
      : `.claude/commands/${namespace}/`;
  const globalDir = aiAgent === 'codex'
    ? `~/.codex/skills/${renderSkillRef(namespace, aiAgent, 'new')}/SKILL.md`
    : aiAgent === 'opencode'
      ? `~/.config/opencode/commands/${namespace}/`
      : `~/.claude/commands/${namespace}/`;

  console.log(`Install scope ${C.dim}— where should the skills live?${C.reset}`);
  console.log(`  ${C.bold}1${C.reset}. Per-project only ${C.dim}(${cmd(perProjectDir)})${C.reset}`);
  console.log(`  ${C.bold}2${C.reset}. Global only ${C.dim}(${cmd(globalDir)})${C.reset}`);
  console.log(`  ${C.bold}3${C.reset}. Both ${C.dim}— per-project wins when present${C.reset}`);
  const installScope = await ask('Choice', '1');

  // Step 3: Summary
  card(3, 5, 'Summary', 'summary');

  const scopeLabel = { '1': 'per-project', '2': 'global', '3': 'both' }[installScope] || installScope;
  console.log(`  ${C.bold}Namespace:${C.reset}          ${namespace}  ${C.dim}(${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'kickoff'))}, ${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'new'))}, ${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'plan'))}, ...)${C.reset}`);
  console.log(`  ${C.bold}Specs root:${C.reset}         ${specsRoot}`);
  console.log(`  ${C.bold}AI agent:${C.reset}           ${aiAgentLabel}`);
  console.log(`  ${C.bold}Install scope:${C.reset}      ${scopeLabel}`);
  console.log(`  ${C.bold}Suggest commits:${C.reset}    ${suggestCommits}`);
  console.log(`  ${C.bold}Subagent threshold:${C.reset} ${subagentThreshold}`);
  console.log(`  ${C.bold}Create principles:${C.reset}  ${createPrinciples}`);
  console.log(`  ${C.bold}Commit style:${C.reset}       ${commitStyle}`);
  console.log('');

  if (!useDefaults) {
    const confirm = await askYN('Proceed with these settings?', 'y');
    console.log('');
    if (confirm !== 'true') {
      console.log('Aborted.');
      process.exit(1);
    }
  }

  return {
    namespace,
    specsRoot,
    installScope,
    suggestCommits,
    subagentThreshold,
    createPrinciples: createPrinciples === 'true',
    commitStyle,
    aiAgent,
    cmdPrefix,
  };
}

// ---------------------------------------------------------------------------
// Install actions
// ---------------------------------------------------------------------------

/**
 * Execute all file installation steps.
 * @param {object} config    - Config object from collectConfig()
 * @param {string} scriptDir - Directory where install.js lives (SpekLess source root)
 */
async function runInstall(config, scriptDir) {
  card(4, 5, 'Installing', 'install');

  const cwd = process.cwd();
  const {
    namespace, specsRoot, installScope,
    suggestCommits, subagentThreshold,
    createPrinciples, commitStyle, aiAgent, cmdPrefix,
  } = config;

  const specsRootAbs = path.resolve(cwd, specsRoot);
  const templatesSrc  = path.join(scriptDir, '_templates');
  const templatesDest = path.join(specsRootAbs, '_templates');
  const skillsSrc     = path.join(scriptDir, 'skills');

  // Icon shortcuts for install log messages.
  // Use emoji here (not ICONS.uni) so card alignment is unaffected — overflow in prose lines is fine.
  const iconOk   = TERM.useUnicode ? '\u2705 '       : ICONS.done.asc  + ' ';  // ✅
  const iconInfo = TERM.useUnicode ? '\u2139\uFE0F ' : ICONS.info.asc  + ' ';  // ℹ️
  const iconWarn = TERM.useUnicode ? '\u274C '        : ICONS.error.asc + ' ';  // ❌

  // (a) Create specsRoot and _templates
  mkdirSafe(specsRootAbs);
  mkdirSafe(templatesDest);

  // (b) Copy templates
  const tmplFiles = fs.readdirSync(templatesSrc).filter(f => f.endsWith('.tmpl'));
  // Purge stale template files no longer present in source
  if (fs.existsSync(templatesDest)) {
    const srcTmplSet = new Set(tmplFiles);
    for (const f of fs.readdirSync(templatesDest).filter(f => f.endsWith('.tmpl'))) {
      if (!srcTmplSet.has(f)) fs.unlinkSync(path.join(templatesDest, f));
    }
  }
  for (const f of tmplFiles) {
    const content = fs.readFileSync(path.join(templatesSrc, f), 'utf8');
    const rendered = renderTemplateContent(content, namespace, aiAgent);
    writeFileSafe(path.join(templatesDest, f), rendered);
  }
  console.log(`${iconOk}Copied rendered templates to ${specsRoot}/_templates/`);

  // (c) Install skills — directory and prefix depend on the chosen AI agent
  const home = safeHomedir();
  function agentPerProjectDir(agent, ns, base) {
    if (agent === 'codex')     return path.join(base, '.codex', 'skills');
    if (agent === 'opencode')  return path.join(base, '.opencode', 'commands', ns);
    return path.join(base, '.claude', 'commands', ns);  // claude_code default
  }
  function agentGlobalDir(agent, ns, h) {
    if (!h) return null;
    if (agent === 'codex')     return path.join(h, '.codex', 'skills');
    if (agent === 'opencode')  return path.join(h, '.config', 'opencode', 'commands', ns);
    return path.join(h, '.claude', 'commands', ns);     // claude_code default
  }
  const perProjectSkillsDir = agentPerProjectDir(aiAgent, namespace, cwd);
  const globalSkillsDir     = agentGlobalDir(aiAgent, namespace, home);

  function installSkillsTo(dest, prefix) {
    mkdirSafe(dest);
    const skillFiles = fs.readdirSync(skillsSrc).filter(f => f.endsWith('.md')).sort();
    const skillNames = skillFiles.map(f => path.basename(f, '.md'));

    if (aiAgent === 'codex') {
      const expectedDirNames = new Set(skillNames.map(skillName => renderSkillRef(namespace, aiAgent, skillName)));

      if (fs.existsSync(dest)) {
        for (const entry of fs.readdirSync(dest)) {
          const entryPath = path.join(dest, entry);
          const stat = fs.lstatSync(entryPath);

          if (stat.isFile() && entry.endsWith('.md') && isLegacySpekSkillFile(entryPath)) {
            fs.unlinkSync(entryPath);
            continue;
          }

          if (!stat.isDirectory()) continue;
          const skillPath = path.join(entryPath, 'SKILL.md');
          if (fs.existsSync(skillPath) && entry.startsWith(`${namespace}-`) && !expectedDirNames.has(entry)) {
            removePathSafe(entryPath);
          }
        }
      }

      for (const f of skillFiles) {
        const skillName = path.basename(f, '.md');
        const content = fs.readFileSync(path.join(skillsSrc, f), 'utf8');
        const rendered = renderSkillContent(content, namespace, aiAgent, prefix);
        const skillDir = path.join(dest, renderSkillRef(namespace, aiAgent, skillName));
        mkdirSafe(skillDir);
        writeFileSafe(path.join(skillDir, 'SKILL.md'), rendered);
      }
      return;
    }

    // Purge stale skill files no longer present in source
    if (fs.existsSync(dest)) {
      const srcSet = new Set(skillFiles);
      for (const f of fs.readdirSync(dest).filter(f => f.endsWith('.md'))) {
        if (!srcSet.has(f)) fs.unlinkSync(path.join(dest, f));
      }
    }

    for (const f of skillFiles) {
      const content = fs.readFileSync(path.join(skillsSrc, f), 'utf8');
      const rendered = renderSkillContent(content, namespace, aiAgent, prefix);
      writeFileSafe(path.join(dest, f), rendered);
    }
  }

  if (installScope === '1' || installScope === '3') {
    console.log(`${iconOk}Installing skills to ${perProjectSkillsDir}`);
    installSkillsTo(perProjectSkillsDir, cmdPrefix);
  }
  if ((installScope === '2' || installScope === '3') && globalSkillsDir) {
    console.log(`${iconOk}Installing skills to ${cmd(globalSkillsDir)}`);
    installSkillsTo(globalSkillsDir, cmdPrefix);
  } else if ((installScope === '2' || installScope === '3') && !globalSkillsDir) {
    console.log(`${iconWarn}${C.yellow}Warning:${C.reset} Cannot determine home directory — skipping global skills install.`);
  }

  // (d) Write config files
  const configTemplatePath = path.join(templatesSrc, 'config.yaml.tmpl');
  const configTemplate = fs.readFileSync(configTemplatePath, 'utf8');

  function renderConfig(tmpl) {
    const rendered = tmpl
      .replace(/\{\{NAMESPACE\}\}/g,          namespace)
      .replace(/\{\{SPECS_ROOT\}\}/g,          specsRoot)
      .replace(/\{\{SUGGEST_COMMITS\}\}/g,     suggestCommits)
      .replace(/\{\{SUBAGENT_THRESHOLD\}\}/g,  subagentThreshold)
      .replace(/\{\{COMMIT_STYLE\}\}/g,        commitStyle);
    return renderTemplateContent(rendered, namespace, aiAgent);
  }

  const perProjectConfigPath = path.join(specsRootAbs, 'config.yaml');
  writeFileSafe(perProjectConfigPath, renderConfig(configTemplate));
  console.log(`${iconOk}Writing ${specsRoot}/config.yaml`);

  if ((installScope === '2' || installScope === '3') && home) {
    const globalConfigPath = path.join(home, '.claude', 'spek-config.yaml');
    writeFileSafe(globalConfigPath, renderConfig(configTemplate));
    console.log(`${iconOk}Writing ${globalConfigPath}`);
  }

  // (e) Write principles.md
  if (createPrinciples) {
    const principlesPath = path.join(specsRootAbs, 'principles.md');
    if (fs.existsSync(principlesPath)) {
      console.log(`${iconInfo}Preserving existing ${specsRoot}/principles.md`);
    } else {
      const principlesTmpl = path.join(templatesSrc, 'principles.md.tmpl');
      const renderedPrinciples = renderTemplateContent(
        fs.readFileSync(principlesTmpl, 'utf8'),
        namespace,
        aiAgent
      );
      writeFileSafe(principlesPath, renderedPrinciples);
      console.log(`${iconOk}Writing ${specsRoot}/principles.md`);
      console.log(`  ${iconInfo}(run ${cmd(renderCommand(namespace, aiAgent, cmdPrefix, 'kickoff'))} to have SpekLess help fill it in)`);
    }
  }

}

// ---------------------------------------------------------------------------
// Platform guards and entry point
// ---------------------------------------------------------------------------

/**
 * Check for known platform issues that would cause silent failures.
 * Exits with a clear error message if an issue is detected.
 */
function detectPlatformIssues() {
  // WSL + Windows-native Node.js: paths will be garbled
  try {
    if (fs.existsSync('/proc/version')) {
      const procVersion = fs.readFileSync('/proc/version', 'utf8');
      if (/microsoft|wsl/i.test(procVersion)) {
        // We're in WSL. Check if the node binary is a Windows path (mounted drive)
        const nodePath = process.execPath;
        if (nodePath.startsWith('/mnt/')) {
          console.error(
            `${C.red}Error:${C.reset} You're running Windows Node.js inside WSL.\n` +
            `Paths will be garbled and the install will fail silently.\n` +
            `Install Node.js for WSL (e.g. via nvm) and retry:\n` +
            `  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash\n` +
            `  nvm install --lts`
          );
          process.exit(1);
        }
      }
    }
  } catch (_) {
    // /proc/version not readable — not in WSL, skip check
  }
}

/**
 * Return the user's home directory, or null if unavailable (some CI environments).
 */
function safeHomedir() {
  const home = os.homedir();
  return (home && home.trim() !== '') ? home : null;
}

// ---------------------------------------------------------------------------
// File operation helpers (with friendly error messages)
// ---------------------------------------------------------------------------

function mkdirSafe(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    console.error(`${C.red}Error:${C.reset} Could not create directory ${dirPath}: ${err.message}`);
    process.exit(1);
  }
}

function copyFileSafe(src, dest) {
  try {
    fs.copyFileSync(src, dest);
  } catch (err) {
    console.error(`${C.red}Error:${C.reset} Could not copy ${src} to ${dest}: ${err.message}`);
    process.exit(1);
  }
}

function stripUtf8Bom(content) {
  return typeof content === 'string' && content.charCodeAt(0) === 0xFEFF
    ? content.slice(1)
    : content;
}

function writeFileSafe(filePath, content) {
  try {
    const normalized = stripUtf8Bom(content);
    // Write explicit UTF-8 bytes so generated Codex SKILL.md files never pick up a BOM.
    fs.writeFileSync(filePath, Buffer.from(normalized, 'utf8'));
  } catch (err) {
    console.error(`${C.red}Error:${C.reset} Could not write ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

function removePathSafe(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) return;
    const stat = fs.lstatSync(targetPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(targetPath)) {
        removePathSafe(path.join(targetPath, entry));
      }
      fs.rmdirSync(targetPath);
      return;
    }
    fs.unlinkSync(targetPath);
  } catch (err) {
    console.error(`${C.red}Error:${C.reset} Could not remove ${targetPath}: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main() {
  // Parse flags
  const args = process.argv.slice(2);
  const defaultsMode = args.includes('--defaults') || args.includes('-y');
  // Set module-level flag immediately so askYN/ask calls before collectConfig also respect --defaults.
  useDefaults = defaultsMode;

  // Platform checks (exits with a message if something is wrong)
  detectPlatformIssues();

  const scriptDir = __dirname;
  const cwd = process.cwd();

  // Verify SpekLess source layout
  const skillsSrc    = path.join(scriptDir, 'skills');
  const templatesSrc = path.join(scriptDir, '_templates');
  if (!fs.existsSync(skillsSrc) || !fs.existsSync(templatesSrc)) {
    console.error(
      `${C.red}Error:${C.reset} Cannot find skills/ or _templates/ next to install.js\n` +
      `Expected layout: ${scriptDir}/{skills,_templates}/`
    );
    process.exit(1);
  }

  // Step 1: Welcome
  card(1, 5, 'SpekLess Installer', 'welcome');
  console.log(`Installing into: ${C.bold}${cwd}${C.reset}`);
  console.log('');
  console.log('This installer is idempotent — re-running on a project that already has');
  console.log('SpekLess installed will preserve your existing features and principles.md.');
  console.log('config.yaml is always regenerated (existing values shown as defaults).');
  console.log('');
  if (defaultsMode) {
    console.log(`${C.dim}Running in ${cmd('--defaults')} mode: all prompts will use default values.${C.reset}`);
    console.log('');
  }

  // Git repo check
  const isGitRepo = fs.existsSync(path.join(cwd, '.git'));
  if (!isGitRepo) {
    console.log('This directory is not a git repository.');
    console.log('SpekLess uses git for: starting_sha tracking, spek:verify diffs,');
    console.log('and spek:commit integration.');
    console.log('');

    const initGit = await askYN('Initialize git here?', 'y');
    if (initGit === 'true') {
      const { execSync } = require('child_process');
      try {
        execSync('git init', { cwd, stdio: 'inherit' });
        console.log('');
      } catch (err) {
        console.error(`${C.red}Error:${C.reset} git init failed: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log(`${C.yellow}Warning:${C.reset} git-dependent features will not work until you run git init.`);
      console.log('');
    }
  }

  // Collect configuration (steps 2-3)
  const config = await collectConfig(defaultsMode);

  // Run install (step 4)
  await runInstall(config, scriptDir);

  // Step 5: Done
  card(5, 5, 'Done', 'done');
  const ns  = config.namespace;
  const sr  = config.specsRoot;
  const pfx = config.cmdPrefix;
  console.log('SpekLess is installed. Next steps:');
  console.log('');
  console.log(`  1. ${C.dim}(Optional)${C.reset} Edit ${sr}/principles.md to capture your project's conventions,`);
  console.log(`     or run ${cmd(renderCommand(ns, config.aiAgent, pfx, 'kickoff'))} — it will offer to help fill it in.`);
  console.log(`  2. Start a new feature:`);
  console.log(`       Greenfield project?  ${C.dim}→${C.reset}  ${cmd(renderCommand(ns, config.aiAgent, pfx, 'kickoff'))}`);
  console.log(`       Existing codebase?   ${C.dim}→${C.reset}  ${cmd(renderCommand(ns, config.aiAgent, pfx, 'adopt'))}, ${cmd(renderCommand(ns, config.aiAgent, pfx, 'new'))}, ${cmd(renderCommand(ns, config.aiAgent, pfx, 'quick'))} or ${cmd(renderCommand(ns, config.aiAgent, pfx, 'ingest'))}`);
  console.log(`  3. Work through a feature: ${cmd(renderCommand(ns, config.aiAgent, pfx, 'discuss'))} ${C.dim}→${C.reset} ${cmd(renderCommand(ns, config.aiAgent, pfx, 'plan'))} ${C.dim}→${C.reset} ${cmd(renderCommand(ns, config.aiAgent, pfx, 'review'))} ${C.dim}→${C.reset} ${cmd(renderCommand(ns, config.aiAgent, pfx, 'execute'))} ${C.dim}→${C.reset} ${cmd(renderCommand(ns, config.aiAgent, pfx, 'verify'))} ${C.dim}→${C.reset} ${cmd(renderCommand(ns, config.aiAgent, pfx, 'retro'))}`);
  console.log(`  4. Pick up where you left off: ${cmd(renderCommand(ns, config.aiAgent, pfx, 'resume'))}`);
  console.log('');
}

main().catch(err => {
  console.error(`${C.red}Fatal:${C.reset} ${err.message}`);
  process.exit(1);
});
