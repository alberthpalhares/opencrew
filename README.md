# opencrew

**Crie equipes de agentes de IA que trabalham juntos — direto na sua IDE.**

> 🇧🇷 This README is in Brazilian Portuguese (PT-BR), the project's primary audience. If
> you don't read Portuguese, use your browser's translator (e.g. Google Translate) or ask
> an AI assistant to translate this page.

opencrew é um framework de orquestração multi-agente. Descreva o que você precisa em
linguagem natural e ele monta um time de agentes especializados que rodam como um pipeline
automatizado, com pontos de aprovação humana. Funciona no Claude Code, Cursor, Codex,
Gemini CLI, OpenCode, Antigravity e mais.

> **Este não é um framework original — é a minha versão pessoal do OpenSquad.**
> O [OpenSquad](https://github.com/renatoasse/opensquad) foi criado por
> [Renato Asse](https://github.com/renatoasse) ([Comunidade Sem Codar](https://semcodar.com.br)).
> Eu ([aksp](https://www.npmjs.com/~aksp)) uso o OpenSquad no dia a dia e quis melhorar
> algumas coisas para o meu próprio fluxo de trabalho — o `opencrew` é essa versão
> reformulada, compartilhada caso ajude outras pessoas também. Todo o crédito pela ideia e
> pelo framework original é do Renato Asse. Veja [Origem e créditos](#origem-e-créditos)
> abaixo. Licenciado sob MIT, assim como o original.

---

## Instalação

**Pré-requisito:** Node.js 20+

```bash
npx @aksp/opencrew init
```

O `init` monta o workspace na pasta atual e pergunta quais IDEs de IA você usa, gerando os
arquivos de integração certos para cada uma. Depois:

1. Abra a pasta na sua IDE de IA.
2. Digite `/opencrew` para começar — a primeira execução configura o perfil da sua empresa.

Isso já é suficiente para criar e rodar crews: nenhuma chave de API é obrigatória para usar
o opencrew.

O arquivo `.env.example` só entra em cena se você quiser usar **skills opcionais** que
dependem de serviços externos — por exemplo, publicar no Instagram, gerar imagens com IA,
fazer web scraping (Apify) ou enviar e-mails (Resend). Se for usar alguma delas, copie
`.env.example` para `.env` e preencha só as chaves da skill em questão; o resto pode ficar
em branco.

Você pode pré-selecionar as IDEs (pula a pergunta) ou configurar todas de uma vez:

```bash
npx @aksp/opencrew init --ide=claude-code,codex
npx @aksp/opencrew init --all
```

## Atualizando

Atualize o framework sem perder o seu trabalho:

```bash
npx @aksp/opencrew update
```

O `update` atualiza apenas `_opencrew/core`, as skills do catálogo e o `AGENTS.md`. Suas
`crews/`, memória, integrações de IDE e `.env` continuam intactos.

## IDEs suportadas

| IDE | Arquivo(s) de integração gerado(s) |
|-----|--------------------------|
| Claude Code | `.claude/skills/opencrew/SKILL.md`, `CLAUDE.md` |
| Codex (OpenAI) | `AGENTS.md` (nativo) + `.agents/skills/opencrew/SKILL.md` |
| Cursor | `.cursor/rules/opencrew.mdc` |
| VS Code + Copilot | `.github/copilot-instructions.md` |
| OpenCode | `.opencode/commands/opencrew.md` |
| Antigravity | `.agent/rules/opencrew.md`, `.agent/workflows/opencrew.md` |
| Gemini CLI | `GEMINI.md` |
| Qwen Code | `QWEN.md` |
| Trae | `.trae/rules/opencrew.md` |

Cada integração é só um ponteiro enxuto para a fonte única de verdade, o **`AGENTS.md`**.

## Como funciona

- **Architect** projeta uma crew a partir da sua descrição (agentes, pipeline, skills).
- **Sherlock** (opcional) analisa perfis de referência para extrair padrões reais de conteúdo.
- **Pipeline Runner** executa a crew, pausando nos checkpoints para sua aprovação.
- **Skills Engine** carrega integrações (scraping, design, publicação, e-mail…) sob demanda,
  usando um esquema em duas camadas para manter o consumo de tokens baixo.

## Comandos (dentro da sua IDE)

| Comando | O que faz |
|---------|--------------|
| `/opencrew` | Abre o menu principal |
| `/opencrew create <descrição>` | Cria uma nova crew |
| `/opencrew run <nome>` | Executa uma crew |
| `/opencrew list` | Lista suas crews |
| `/opencrew edit <nome>` | Modifica uma crew |
| `/opencrew skills` | Navega / instala / remove skills |

## Para mantenedores

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Regra de ouro: `AGENTS.md` é o único lugar onde
vivem as instruções do sistema; os arquivos por IDE são gerados a partir de `src/lib/ides.js`.

## Origem e créditos

`opencrew` é uma **distribuição reformulada do [OpenSquad](https://github.com/renatoasse/opensquad)**,
o framework de orquestração multi-agente criado e mantido por
**[Renato Asse](https://github.com/renatoasse)**, fundador da
[Comunidade Sem Codar](https://semcodar.com.br). O projeto original, seu conceito, o modelo
de agentes, o design do pipeline e o sistema de skills são trabalho dele — dê uma estrela e
siga o [repositório original](https://github.com/renatoasse/opensquad) e assista ao
[vídeo de lançamento](https://www.youtube.com/watch?v=CL1ppI4qHeU).

Eu uso o OpenSquad no meu dia a dia e fiz algumas mudanças que se encaixam no meu jeito de
trabalhar, que acredito que também podem ajudar outras pessoas. O que esta versão muda em
relação ao original:

- **Instalador npm no meu escopo** — `npx @aksp/opencrew init` / `update`, com um caminho
  de atualização não destrutivo que preserva suas crews, memória e `.env`.
- **Fonte única de verdade para multi-IDE** — um `AGENTS.md` canônico; cada IDE recebe um
  arquivo de integração gerado e enxuto, em vez de um documento mantido manualmente para
  cada ferramenta.
- **Melhorias de economia de tokens e de invocação de skills** no núcleo do framework.

Este é um fork independente, feito pela comunidade — **não** é afiliado nem endossado pelo
Renato Asse ou pela Comunidade Sem Codar. Se você quiser o projeto oficial, use
[`npx opensquad init`](https://github.com/renatoasse/opensquad).

## Licença

MIT — veja [LICENSE](LICENSE). Framework OpenSquad original © Renato Asse, também MIT.
