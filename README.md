# opencrew

**Create AI agent crews that work together — right from your IDE.**

opencrew is a multi-agent orchestration framework. Describe what you need in plain
language and it assembles a team of specialized agents that run as an automated pipeline
with human approval checkpoints. It works across Claude Code, Cursor, Codex, Gemini CLI,
OpenCode, Antigravity and more.

> **This is not an original framework — it's my personal build of OpenSquad.**
> [OpenSquad](https://github.com/renatoasse/opensquad) was created by
> [Renato Asse](https://github.com/renatoasse) ([Comunidade Sem Codar](https://semcodar.com.br)).
> I ([aksp](https://www.npmjs.com/~aksp)) use OpenSquad daily and wanted to improve a few
> things for my own workflow — so `opencrew` is that reworked version, shared in case it
> helps others too. All credit for the original idea and framework goes to Renato Asse.
> See [Origin & credits](#origin--credits) below. MIT licensed, same as the original.

---

## Installation

**Prerequisite:** Node.js 20+

```bash
npx @aksp/opencrew init
```

`init` scaffolds the workspace in the current folder and asks which AI IDEs you use, then
generates the right integration files for each. Then:

1. Open the folder in your AI IDE.
2. Copy `.env.example` to `.env` and fill in keys for the skills you plan to use.
3. Type `/opencrew` to start — the first run sets up your company profile.

Preselect IDEs (skip the prompt) or configure all of them:

```bash
npx @aksp/opencrew init --ide=claude-code,codex
npx @aksp/opencrew init --all
```

## Updating

Refresh the framework without losing your work:

```bash
npx @aksp/opencrew update
```

`update` refreshes only `_opencrew/core`, the catalog skills and `AGENTS.md`.
Your `crews/`, memory, IDE bridges and `.env` are left untouched.

## Supported IDEs

| IDE | Bridge file(s) generated |
|-----|--------------------------|
| Claude Code | `.claude/skills/opencrew/SKILL.md`, `CLAUDE.md` |
| Codex (OpenAI) | `AGENTS.md` (native) + `.agents/skills/opencrew/SKILL.md` |
| Cursor | `.cursor/rules/opencrew.mdc` |
| VS Code + Copilot | `.github/copilot-instructions.md` |
| OpenCode | `.opencode/commands/opencrew.md` |
| Antigravity | `.agent/rules/opencrew.md`, `.agent/workflows/opencrew.md` |
| Gemini CLI | `GEMINI.md` |
| Qwen Code | `QWEN.md` |
| Trae | `.trae/rules/opencrew.md` |

Every bridge is a thin pointer to the single source of truth, **`AGENTS.md`**.

## How it works

- **Architect** designs a crew from your description (agents, pipeline, skills).
- **Sherlock** (optional) analyzes reference profiles to extract real content patterns.
- **Pipeline Runner** executes the crew, pausing at checkpoints for your approval.
- **Skills Engine** loads integrations (scraping, design, publishing, email…) on demand,
  using a two-tier scheme to keep token usage low.

## Commands (inside your IDE)

| Command | What it does |
|---------|--------------|
| `/opencrew` | Open the main menu |
| `/opencrew create <description>` | Create a new crew |
| `/opencrew run <name>` | Run a crew |
| `/opencrew list` | List your crews |
| `/opencrew edit <name>` | Modify a crew |
| `/opencrew skills` | Browse / install / remove skills |

## For maintainers

See [CONTRIBUTING.md](CONTRIBUTING.md). The golden rule: `AGENTS.md` is the only place
system instructions live; per-IDE files are generated from `src/lib/ides.js`.

## Origin & credits

`opencrew` is a **reworked distribution of [OpenSquad](https://github.com/renatoasse/opensquad)**,
the multi-agent orchestration framework created and maintained by
**[Renato Asse](https://github.com/renatoasse)**, founder of
[Comunidade Sem Codar](https://semcodar.com.br). The original project, its concept, agent
model, pipeline design and skill system are his work — please star and follow the
[upstream repository](https://github.com/renatoasse/opensquad) and watch the
[launch video](https://www.youtube.com/watch?v=CL1ppI4qHeU).

I use OpenSquad in my day-to-day and made a few changes that fit how I work, which I believe
can help other people as well. What this build changes relative to upstream:

- **npm installer under my scope** — `npx @aksp/opencrew init` / `update`, with a
  non-destructive update path that preserves your crews, memory and `.env`.
- **Single source of truth for multi-IDE** — one canonical `AGENTS.md`; every IDE gets a
  thin generated bridge file instead of a hand-maintained document per tool.
- **Token-economy and skill-invocation improvements** to the framework core.

This is an independent, community fork — it is **not** affiliated with or endorsed by
Renato Asse or Comunidade Sem Codar. If you want the official project, use
[`npx opensquad init`](https://github.com/renatoasse/opensquad).

## License

MIT — see [LICENSE](LICENSE). Original OpenSquad framework © Renato Asse, also MIT.
