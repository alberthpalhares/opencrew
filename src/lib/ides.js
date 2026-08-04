// Single source of truth = AGENTS.md (shipped at project root).
// Every IDE gets only a THIN bridge file that points at AGENTS.md.
// Adding support for a new IDE = one more entry in this list.

const BRIDGE = `Read \`AGENTS.md\` at the project root and adopt the opencrew system role.
Follow all initialization, command routing, and workflow instructions defined there.

If invoked with arguments (e.g. \`/opencrew create ...\`, \`/opencrew run ...\`),
route to the matching action from the Command Routing table in AGENTS.md.
If invoked without arguments, show the Main Menu.`;

// Claude Code needs one extra rule (checkpoints must use AskUserQuestion) and a
// note that its own Playwright plugin must be off (opencrew ships its own via .mcp.json).
const CLAUDE_SKILL = `---
name: opencrew
description: "opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage AI agent crews."
---

# opencrew (Claude Code entry point)

${BRIDGE}

## Claude Code specifics (override AGENTS.md where they conflict)

- **Checkpoints MUST use \`AskUserQuestion\`** — never output a checkpoint question as plain text.
  Combine multiple questions into a single call (max 4 slots, each with 2–4 options).
- Checkpoint steps always run inline (never dispatched as subagents).
- opencrew uses its own \`@playwright/mcp\` server (see \`.mcp.json\`). The native Claude Code
  Playwright plugin must be disabled to avoid conflicts.
`;

const CLAUDE_MD = `# opencrew — Project Instructions

This project uses **opencrew**, a multi-agent orchestration framework.
The full system definition lives in \`AGENTS.md\` — read it and adopt that role.

Type \`/opencrew\` to open the main menu.

## Notes for Claude Code

- All checkpoint questions use \`AskUserQuestion\`.
- opencrew ships its own Playwright MCP (\`.mcp.json\`); disable the native Playwright plugin.
- Do not manually edit files under \`_opencrew/core/\` unless you know what you're doing.

## STATUS.md (gestão de sessão)

This project uses \`STATUS.md\` for session continuity. The file is local (gitignored).

**At the start of every session:**
- Read \`STATUS.md\`. If it doesn't exist, create it with the template below.
- Report a 3-line summary: what was in progress, what's next, any blockers.

**During the session:**
- Move items from ⬜ Pendente to 🔄 Em andamento when you start working on them.
- Move items to ✅ Concluído when finished.
- Add new items that emerge during work.

**Before ending the session:**
- Ensure \`STATUS.md\` reflects the real state.
- Update \`Última sessão\` timestamp.

**Template:**
\`\`\`markdown
# STATUS — OpenCrew

> Última sessão: {today}
> Skill: /status

## 🔄 Em andamento

## ⬜ Pendente

## ✅ Concluído (esta sessão)

## 📋 Backlog

## 💡 Decisões
\`\`\`
`;

const render = (title, extra = '') =>
  `# ${title}\n\n${BRIDGE}${extra ? `\n\n${extra}` : ''}\n`;

/**
 * Each IDE lists the files its bridge writes. `content` is plain text.
 * `mdc` files (Cursor) get a small frontmatter so the rule always applies.
 */
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
      { path: '.agents/skills/opencrew/SKILL.md', content: `---\nname: opencrew\ndescription: Run opencrew — multi-agent orchestration. Use when the user types /opencrew or asks to create, run, or manage crews.\n---\n\n${BRIDGE}\n` },
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
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    files: [{ path: 'GEMINI.md', content: render('opencrew — Gemini CLI') }],
  },
  {
    id: 'qwen',
    label: 'Qwen Code',
    files: [{ path: 'QWEN.md', content: render('opencrew — Qwen Code') }],
  },
  {
    id: 'trae',
    label: 'Trae',
    files: [{ path: '.trae/rules/opencrew.md', content: render('opencrew — Trae') }],
  },
];

export const ideById = (id) => IDES.find((i) => i.id === id);
export const allIdeIds = () => IDES.map((i) => i.id);
