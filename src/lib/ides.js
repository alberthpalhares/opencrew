// Single source of truth = _opencrew/core/system.md (from templates/AGENTS.md).
// Every IDE gets only a THIN bridge file that points at it.
// Adding support for a new IDE = one more entry in this list.

// Coexistence (U6): opencrew only takes over when called — other agent systems in the same
// project keep priority for everything else.
const ACTIVATION = `Use opencrew ONLY when the user types \`/opencrew\` or asks to create, run or manage
AI agent crews. In that case, read \`_opencrew/core/system.md\` and follow its initialization,
command routing and workflow instructions. For anything else, the other instructions of this
project take precedence.`;

const BRIDGE = `${ACTIVATION}

If invoked with arguments (e.g. \`/opencrew create ...\`, \`/opencrew run ...\`),
route to the matching action from the Command Routing table in \`_opencrew/core/system.md\`.
If invoked without arguments, show the Main Menu.`;

// Claude Code needs one extra rule (checkpoints must use AskUserQuestion) and a
// note that its own Playwright plugin must be off (opencrew ships its own via .mcp.json).
const CLAUDE_SKILL = `---
name: opencrew
description: "opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage AI agent crews."
---

# opencrew (Claude Code entry point)

${BRIDGE}

## Claude Code specifics (override system.md where they conflict)

- **Checkpoints MUST use \`AskUserQuestion\`** — never output a checkpoint question as plain text.
  Combine multiple questions into a single call (max 4 slots, each with 2–4 options).
- Checkpoint steps always run inline (never dispatched as subagents).
- opencrew uses its own \`@playwright/mcp\` server (see \`.mcp.json\`). The native Claude Code
  Playwright plugin must be disabled to avoid conflicts.
`;

const CLAUDE_MD = `# opencrew — Project Instructions

This project uses **opencrew**, a multi-agent orchestration framework.

${ACTIVATION}

Type \`/opencrew\` to open the main menu.

## Notes for Claude Code

- All checkpoint questions use \`AskUserQuestion\`.
- opencrew ships its own Playwright MCP (\`.mcp.json\`); disable the native Playwright plugin.
- Do not manually edit files under \`_opencrew/core/\` unless you know what you're doing.
`;

// Root AGENTS.md: thin bridge to the full system definition (written by init and update).
export const AGENTS_BRIDGE = `# opencrew\n\n${ACTIVATION}\n\nType \`/opencrew\` to open the main menu.\n`;

// Marker that identifies the maintainer STATUS.md section leaked into CLAUDE.md by 1.4.0/1.4.1.
export const LEAKED_STATUS_SECTION = '## STATUS.md (gestão de sessão)';

// The title of CLAUDE.md, GEMINI.md, QWEN.md and copilot-instructions.md (files shared with
// the user) is how `update` recognizes a bridge written up to 1.2.2, which has no marker. The
// four titles are fixed in ./deteccao.js and pinned by R2-01d (tests/ides.test.js): to change
// one here, keep the old one there.
const render = (title, extra = '') =>
  `# ${title}\n\n${BRIDGE}${extra ? `\n\n${extra}` : ''}\n`;

/**
 * Each IDE lists the files its bridge writes. `content` is plain text.
 * `mdc` files (Cursor) get a small frontmatter so the rule always applies.
 */
// Shared by IDEs that use `.agents/skills/` (Codex, Antigravity 2.0, Gemini CLI, Warp, etc.).
// This is the emerging standard location for workspace-level skills.
const AGENTS_SKILL = `---
name: opencrew
description: Run opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage crews.
---

${BRIDGE}
`;

export const IDES = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    files: [
      { path: '.claude/skills/opencrew/SKILL.md', content: CLAUDE_SKILL },
      { path: 'CLAUDE.md', content: CLAUDE_MD },
    ],
  },
  {
    id: 'codex',
    label: 'Codex (OpenAI)',
    // Codex reads AGENTS.md natively — always shipped. Add a slash-style helper too.
    files: [
      { path: '.agents/skills/opencrew/SKILL.md', content: AGENTS_SKILL },
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    files: [
      { path: '.cursor/rules/opencrew.mdc', content: `---\ndescription: opencrew — multi-agent orchestration framework.\nalwaysApply: true\n---\n\n${BRIDGE}\n` },
    ],
  },
  {
    id: 'copilot',
    label: 'VS Code + Copilot',
    files: [
      { path: '.github/copilot-instructions.md', content: render('opencrew — Copilot Instructions') },
    ],
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    files: [
      { path: '.opencode/commands/opencrew.md', content: `---\ndescription: opencrew — Multi-agent orchestration framework. Create and run AI crews.\n---\n\n${BRIDGE}\n` },
    ],
  },
  {
    id: 'antigravity',
    label: 'Antigravity (Gemini)',
    files: [
      {
        path: '.agent/rules/opencrew.md',
        content: `---\nname: opencrew\n---\n\n${BRIDGE}\n\n## Antigravity specifics\n\n- This environment does not support background/parallel subagents. Run all tasks inline and\n  sequentially — never announce parallel work and then skip it.\n- Ask only one question per message; present options as a numbered list.\n`,
      },
      { path: '.agent/workflows/opencrew.md', content: `---\nname: opencrew\ndescription: opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage crews.\n---\n\n${render('opencrew Workflow (Antigravity)')}` },
      // .agents/ (plural) — standard location for Antigravity 2.0+ and CLI.
      // Skills are discovered by the IDE, workflows appear as slash commands.
      { path: '.agents/skills/opencrew/SKILL.md', content: AGENTS_SKILL },
      { path: '.agents/workflows/opencrew.md', content: `---\nname: opencrew\ndescription: opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage crews.\n---\n\n${BRIDGE}\n` },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    files: [
      { path: 'GEMINI.md', content: render('opencrew — Gemini CLI') },
      // Gemini CLI also reads .agents/skills/ for slash commands.
      { path: '.agents/skills/opencrew/SKILL.md', content: AGENTS_SKILL },
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen Code',
    files: [
      { path: 'QWEN.md', content: render('opencrew — Qwen Code') },
      // Qwen Code also reads .agents/skills/ for slash commands.
      { path: '.agents/skills/opencrew/SKILL.md', content: AGENTS_SKILL },
    ],
  },
  {
    id: 'trae',
    label: 'Trae',
    files: [{ path: '.trae/rules/opencrew.md', content: render('opencrew — Trae') }],
  },
];

export const ideById = (id) => IDES.find((i) => i.id === id);
export const allIdeIds = () => IDES.map((i) => i.id);
