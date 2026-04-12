'use strict';

/**
 * SpekLess installer
 *
 * Interactive installer for SpekLess — a lightweight spec-first development
 * framework for Claude Code. Run this script inside any project (new or existing).
 *
 * What it does:
 *   1. Asks a handful of configuration questions
 *   2. Writes .specs/config.yaml (per-project) and optionally ~/.claude/spek-config.yaml (global)
 *   3. Copies skills into .claude/commands/<namespace>/ or ~/.claude/commands/<namespace>/ or both
 *   4. Optionally creates .specs/principles.md from the template
 *   5. Copies templates to .specs/_templates/ for runtime access by skills
 *   6. Writes a SpekLess section to CLAUDE.md (creates it if missing)
 *
 * Idempotent: re-running preserves existing features, config, and principles.
 * Only patches what's missing.
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
    console.log(`${C.dim}Detected existing install at .specs/config.yaml${C.reset}`);
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
  let   defaultProjectHints    = readYamlValue(existingConfig, 'project_hints')     || '';
  if (defaultProjectHints === '(none)') defaultProjectHints = '';

  // Step 2: Configuration
  card(2, 5, 'Configuration', 'config');

  // Namespace — with validation loop
  let namespace = await ask('Slash command namespace (affects /NAMESPACE:plan, etc.)', defaultNamespace);
  while (!namespace || /[\s/]/.test(namespace)) {
    console.log(`${C.red}Error:${C.reset} Namespace must be non-empty and contain no spaces or slashes.`);
    namespace = await ask('Slash command namespace (affects /NAMESPACE:plan, etc.)', defaultNamespace);
  }
  console.log('');

  const specsRoot = await ask('Specs root directory (relative to project root)', defaultSpecsRoot);

  console.log('');
  console.log(`Install scope ${C.dim}— where should the skills live?${C.reset}`);
  console.log(`  ${C.bold}1${C.reset})  Per-project only ${C.dim}(.claude/commands/${namespace}/)${C.reset}`);
  console.log(`  ${C.bold}2${C.reset})  Global only ${C.dim}(~/.claude/commands/${namespace}/)${C.reset}`);
  console.log(`  ${C.bold}3${C.reset})  Both ${C.dim}— per-project wins when present${C.reset}`);
  const installScope = await ask('Choice (1/2/3)', '1');

  console.log('');
  console.log(`Git integration: should ${cmd(`/${namespace}:execute`)} suggest commits at natural boundaries?`);
  console.log(`${C.dim}Default is NO — respects your commit rhythm. You can still commit manually anytime.${C.reset}`);
  const suggestCommitsAnswer = await askYN('Suggest commits?', defaultSuggestCommits === 'true' ? 'y' : 'n');
  console.log('');
  const suggestCommits = suggestCommitsAnswer;

  const subagentThreshold = await ask(
    `Subagent delegation threshold (# of reads before /${namespace}:plan delegates to Explore)`,
    defaultSubagentThresh
  );

  console.log('');
  console.log(`Project language / framework hints ${C.dim}(optional, free text)${C.reset}`);
  console.log(`${C.dim}Example: 'TypeScript + Bun + React. Prefer functional components. ESM only.'${C.reset}`);
  const projectHints = await ask('Hints (press Enter to skip)', defaultProjectHints || '');

  console.log('');
  const createPrinciples = await askYN(
    `Create starter principles.md? (/${namespace}:kickoff will help fill it in later)`,
    'y'
  );

  console.log('');
  console.log(`Commit message style for ${cmd(`/${namespace}:commit`)}:`);
  console.log(`  ${C.bold}plain${C.reset}         — spec-anchored: '001: Add dark mode toggle — tasks 1-3' + bullet body`);
  console.log(`  ${C.bold}conventional${C.reset}  — conventional commits: 'feat(001): add dark mode toggle'`);
  console.log(`  ${C.bold}custom${C.reset}        — enter a free-text rule on the next line`);
  let commitStyle = await ask('Commit style (plain/conventional/custom)', defaultCommitStyle);
  console.log('');
  if (commitStyle === 'custom') {
    console.log(`${C.dim}Describe your commit rule in one line (e.g. 'prefix with [JIRA-xxx], sentence case').${C.reset}`);
    const customRule = await ask('Rule', 'plain');
    console.log('');
    commitStyle = customRule || 'plain';
  }

  // Step 3: Summary
  card(3, 5, 'Summary', 'summary');

  const scopeLabel = { '1': 'per-project', '2': 'global', '3': 'both' }[installScope] || installScope;
  console.log(`  ${C.bold}Namespace:${C.reset}          ${namespace}  ${C.dim}(/${namespace}:kickoff, /${namespace}:new, /${namespace}:plan, ...)${C.reset}`);
  console.log(`  ${C.bold}Specs root:${C.reset}         ${specsRoot}`);
  console.log(`  ${C.bold}Install scope:${C.reset}      ${installScope} ${C.dim}(${scopeLabel})${C.reset}`);
  console.log(`  ${C.bold}Suggest commits:${C.reset}    ${suggestCommits}`);
  console.log(`  ${C.bold}Subagent threshold:${C.reset} ${subagentThreshold}`);
  console.log(`  ${C.bold}Create principles:${C.reset}  ${createPrinciples}`);
  console.log(`  ${C.bold}Commit style:${C.reset}       ${commitStyle}`);
  if (projectHints) {
    console.log(`  ${C.bold}Project hints:${C.reset}      ${projectHints}`);
  }
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
    projectHints: projectHints || '(none)',
    createPrinciples: createPrinciples === 'true',
    commitStyle,
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
    suggestCommits, subagentThreshold, projectHints,
    createPrinciples, commitStyle,
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
  for (const f of tmplFiles) {
    copyFileSafe(path.join(templatesSrc, f), path.join(templatesDest, f));
  }
  console.log(`${iconOk}Copied templates to ${specsRoot}/_templates/`);

  // (c) Install skills
  const perProjectSkillsDir = path.join(cwd, '.claude', 'commands', namespace);
  const home = safeHomedir();
  const globalSkillsDir = home ? path.join(home, '.claude', 'commands', namespace) : null;

  function installSkillsTo(dest) {
    mkdirSafe(dest);
    const skillFiles = fs.readdirSync(skillsSrc).filter(f => f.endsWith('.md'));
    for (const f of skillFiles) {
      copyFileSafe(path.join(skillsSrc, f), path.join(dest, f));
      console.log(`  ${iconOk}copied skills/${f}`);
    }
  }

  if (installScope === '1' || installScope === '3') {
    console.log(`${iconOk}Installing skills to ${perProjectSkillsDir}`);
    installSkillsTo(perProjectSkillsDir);
  }
  if ((installScope === '2' || installScope === '3') && globalSkillsDir) {
    console.log(`${iconOk}Installing skills to ${globalSkillsDir}`);
    installSkillsTo(globalSkillsDir);
  } else if ((installScope === '2' || installScope === '3') && !globalSkillsDir) {
    console.log(`${iconWarn}${C.yellow}Warning:${C.reset} Cannot determine home directory — skipping global skills install.`);
  }

  // (d) Write config files
  const configTemplatePath = path.join(templatesSrc, 'config.yaml.tmpl');
  const configTemplate = fs.readFileSync(configTemplatePath, 'utf8');

  function renderConfig(tmpl) {
    return tmpl
      .replace(/\{\{NAMESPACE\}\}/g,          namespace)
      .replace(/\{\{SPECS_ROOT\}\}/g,          specsRoot)
      .replace(/\{\{SUGGEST_COMMITS\}\}/g,     suggestCommits)
      .replace(/\{\{SUBAGENT_THRESHOLD\}\}/g,  subagentThreshold)
      .replace(/\{\{PROJECT_HINTS\}\}/g,       projectHints)
      .replace(/\{\{COMMIT_STYLE\}\}/g,        commitStyle);
  }

  const perProjectConfigPath = path.join(specsRootAbs, 'config.yaml');
  if (fs.existsSync(perProjectConfigPath)) {
    console.log(`${iconInfo}Preserving existing ${specsRoot}/config.yaml (delete it and re-run if you want a full rewrite)`);
  } else {
    writeFileSafe(perProjectConfigPath, renderConfig(configTemplate));
    console.log(`${iconOk}Writing ${specsRoot}/config.yaml`);
  }

  if ((installScope === '2' || installScope === '3') && home) {
    const globalConfigPath = path.join(home, '.claude', 'spek-config.yaml');
    if (fs.existsSync(globalConfigPath)) {
      console.log(`${iconInfo}Preserving existing ${globalConfigPath} (delete it and re-run if you want a full rewrite)`);
    } else {
      writeFileSafe(globalConfigPath, renderConfig(configTemplate));
      console.log(`${iconOk}Writing ${globalConfigPath}`);
    }
  }

  // (e) Write principles.md
  if (createPrinciples) {
    const principlesPath = path.join(specsRootAbs, 'principles.md');
    if (fs.existsSync(principlesPath)) {
      console.log(`${iconInfo}Preserving existing ${specsRoot}/principles.md`);
    } else {
      const principlesTmpl = path.join(templatesSrc, 'principles.md.tmpl');
      copyFileSafe(principlesTmpl, principlesPath);
      console.log(`${iconOk}Writing ${specsRoot}/principles.md`);
      console.log(`  ${iconInfo}(run ${cmd(`/${namespace}:kickoff`)} to have SpekLess help fill it in)`);
    }
  }

  // (f) Append SpekLess block to CLAUDE.md
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const speklessBlockTmpl = path.join(templatesSrc, 'spekless-block.md.tmpl');
  const speklessBlock = renderConfig(fs.readFileSync(speklessBlockTmpl, 'utf8'));

  let claudeMdContent = '';
  if (fs.existsSync(claudeMdPath)) {
    claudeMdContent = fs.readFileSync(claudeMdPath, 'utf8');
  }

  if (claudeMdContent.includes('## SpekLess')) {
    console.log(`${iconInfo}CLAUDE.md already contains SpekLess block — skipping`);
  } else {
    writeFileSafe(claudeMdPath, claudeMdContent + speklessBlock + '\n');
    console.log(`${iconOk}Writing SpekLess section to CLAUDE.md`);
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

function writeFileSafe(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error(`${C.red}Error:${C.reset} Could not write ${filePath}: ${err.message}`);
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
  console.log('SpekLess installed will preserve your features and config, only patching');
  console.log('anything missing.');
  console.log('');
  if (defaultsMode) {
    console.log(`${C.dim}Running in --defaults mode: all prompts will use default values.${C.reset}`);
    console.log('');
  }

  // Git repo check
  const isGitRepo = fs.existsSync(path.join(cwd, '.git'));
  if (!isGitRepo) {
    console.log('This directory is not a git repository.');
    console.log('SpekLess uses git for: starting_sha tracking, /spek:verify diffs,');
    console.log('and /spek:commit integration.');
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
  const ns = config.namespace;
  const sr = config.specsRoot;
  console.log('SpekLess is installed. Next steps:');
  console.log('');
  console.log(`  1. ${C.dim}(Optional)${C.reset} Edit ${sr}/principles.md to capture your project's conventions,`);
  console.log(`     or run ${cmd(`/${ns}:kickoff`)} — it will offer to help fill it in.`);
  console.log(`  2. Start a new feature:`);
  console.log(`       Greenfield project?  ${C.dim}→${C.reset}  ${cmd(`/${ns}:kickoff`)}`);
  console.log(`       Existing codebase?   ${C.dim}→${C.reset}  ${cmd(`/${ns}:adopt`)} or ${cmd(`/${ns}:new`)}`);
  console.log(`  3. Work through a feature: ${cmd(`/${ns}:discuss`)} ${C.dim}→${C.reset} ${cmd(`/${ns}:plan`)} ${C.dim}→${C.reset} ${cmd(`/${ns}:execute`)} ${C.dim}→${C.reset} ${cmd(`/${ns}:verify`)}`);
  console.log(`  4. Pick up where you left off: ${cmd(`/${ns}:resume`)}`);
  console.log('');
  console.log(`${C.dim}Read ${scriptDir}/README.md for walkthroughs and design rationale.${C.reset}`);
  console.log('');
}

main().catch(err => {
  console.error(`${C.red}Fatal:${C.reset} ${err.message}`);
  process.exit(1);
});
