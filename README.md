# OpenCrew

[![CI](https://github.com/alberthpalhares/opencrew/actions/workflows/ci.yml/badge.svg)](https://github.com/alberthpalhares/opencrew/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40aksp%2Fopencrew)](https://www.npmjs.com/package/@aksp/opencrew)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Crie equipes de agentes de IA que trabalham juntos — direto na sua IDE.**

> 🇧🇷 This README is in Brazilian Portuguese (PT-BR), the project's primary audience. If
> you don't read Portuguese, use your browser's translator (e.g. Google Translate) or ask
> an AI assistant to translate this page.

OpenCrew é um framework de orquestração multi-agente. Descreva o que você precisa em
linguagem natural e ele monta um time de agentes especializados que rodam como um pipeline
automatizado, com pontos de aprovação humana. Funciona no Claude Code, Cursor, Codex,
Gemini CLI, OpenCode, Antigravity e mais.

> **Este não é um framework original — é a minha versão pessoal do OpenSquad.**
> O [OpenSquad](https://github.com/renatoasse/opensquad) foi criado por
> [Renato Asse](https://github.com/renatoasse) ([Comunidade Sem Codar](https://semcodar.com.br)).
> Eu ([aksp](https://www.npmjs.com/~aksp)) uso o OpenSquad no dia a dia e quis melhorar
> algumas coisas para o meu próprio fluxo de trabalho — o `OpenCrew` é essa versão
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

Isso já é suficiente para criar e rodar crews: nenhuma configuração prévia, instalação
extra ou chave de API é necessária para começar.

Algumas **skills opcionais** dependem de serviços externos — por exemplo, publicar no
Instagram, gerar imagens com IA, fazer web scraping (Apify) ou enviar e-mails (Resend). Você
não precisa se preocupar com isso antes de começar: se, ao montar uma crew, o OpenCrew
identificar que ela precisa de uma dessas skills, ele pede a chave direto na conversa
(explicando o que é e onde consegui-la) e salva tudo por conta própria. Não é preciso abrir
nem editar nenhum arquivo manualmente.

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

Cada integração é só um ponteiro enxuto para o **`AGENTS.md`** na raiz do projeto. O `AGENTS.md`
também é uma ponte fina — o sistema completo do OpenCrew vive em `_opencrew/core/system.md`.
Isso permite que você mantenha seu próprio `AGENTS.md` (ou `CLAUDE.md`, `GEMINI.md`, etc.) com
instruções do seu projeto sem conflitos — o OpenCrew faz merge preservando seu conteúdo.

## Como funciona

- **Discovery** entrevista você sobre o objetivo da crew e oferece templates prontos
  (blog semanal, Instagram, newsletter, lançamento de produto) para acelerar a criação.
- **Architect** sugere um time de pessoas (não ferramentas!) — "Pedro Pesquisa",
  "Clara Copy", "Renata Revisão" — e só depois resolve as skills técnicas.
- **Sherlock** pesquisa em redes sociais, web, SEO e trending topics para fundamentar
  o conteúdo em dados reais (não só intuição).
- **Pipeline Runner** executa a crew com 3 níveis de profundidade (Express/Standard/Full),
  aprende com seu feedback entre runs (Regras de Ouro), e exporta em PDF, CSV ou
  formato pronto para redes sociais.
- **Skills Engine** carrega integrações (scraping, design, publicação, e-mail…) sob demanda,
  e pode até gerar novas skills automaticamente quando o catálogo não tem o que você precisa.
- **Agentes compartilhados** (pesquisador, redator, revisor, designer, estrategista) vivem
  em `_opencrew/agents/` e são reutilizados entre crews — consistência e menos tokens.

## Dashboard (opcional)

O OpenCrew inclui um dashboard visual auto-contido — `dashboard/index.html`, um arquivo
HTML único sem dependências que mostra a execução de uma crew como um escritório virtual
animado (com agentes trabalhando em suas mesas, handoffs entre etapas, e indicador de
progresso). 

Ele é **desligado por padrão** — o Pipeline Runner não escreve `state.json` a menos que
você ligue o recurso (`Dashboard: enabled` em `_opencrew/_memory/preferences.md`, via
`/opencrew settings`). Inclui modo demo embutido para visualização sem precisar rodar uma
crew real.

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

`OpenCrew` é uma **distribuição reformulada do [OpenSquad](https://github.com/renatoasse/opensquad)**,
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
