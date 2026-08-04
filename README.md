# 🤖 OpenCrew — Sua Equipe de IA

[![CI](https://github.com/alberthpalhares/opencrew/actions/workflows/ci.yml/badge.svg)](https://github.com/alberthpalhares/opencrew/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40aksp%2Fopencrew)](https://www.npmjs.com/package/@aksp/opencrew)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

O **OpenCrew** transforma sua IDE de IA em um **estúdio criativo com equipe**.
Descreva o que você precisa em linguagem natural e ele monta um time de agentes
especializados — pesquisador, redator, revisor, designer, estrategista — que
trabalham juntos em um pipeline automatizado, com checkpoints para sua aprovação.

**Não é um template. Não é um prompt fixo. É uma fábrica de conteúdo que roda
dentro da sua IDE.**

> 🇧🇷 OpenCrew tem como público primário o Brasil. This README is in PT-BR.

---

## O que você ganha

- 🔎 **Sherlock** — pesquisa em redes sociais, web, SEO e trending topics para
  fundamentar cada conteúdo em dados reais, não achismo.
- ✍️ **Redator + Revisor** — conteúdo escrito com ganchos, ângulos e CTAs
  estratégicos, revisado por um agente dedicado antes de chegar a você.
- 🎨 **Designer integrado** — carrosséis, banners e posts visuais alinhados à
  identidade da sua marca (ou de templates prontos).
- 🎯 **3 níveis de profundidade** — Express (rápido), Standard (diário) ou
  Full (clientes, projetos complexos). Você escolhe quanta energia quer gastar.
- 🧠 **Aprendizado contínuo** — a crew aprende com suas correções. Se você
  rejeita o mesmo erro 3 vezes, vira Regra de Ouro automática.
- 📦 **Templates prontos** — blog semanal, Instagram carrossel, newsletter
  mensal, lançamento de produto. Comece em 2 minutos.
- 📤 **Exportação multi-formato** — PDF, CSV e posts formatados por plataforma,
  sem abrir editor nenhum.

---

## Por que dentro da IDE e não no browser?

| 🖥️ **OpenCrew (na sua IDE)** | 🌐 **ChatGPT / Claude (browser)** |
|---|---|
| Lê e escreve arquivos do seu projeto | Precisa de upload/download manual |
| Pipeline automatizado com checkpoints | Você faz o papel de orquestrador |
| Memória entre sessões (aprende com você) | Começa do zero toda conversa |
| Skills: publicar, gerar imagem, enviar email | Precisa de ferramentas externas |
| Agentes especializados com papéis e nomes | Um modelo genérico faz-tudo |
| Dados ficam no seu computador | Dados trafegam pelo browser |
| Templates e workflows reutilizáveis | Cria do zero toda vez |

> 💡 **Resumindo:** ChatGPT ou Claude no browser são como um freela que você
> precisa briefar do zero a cada projeto. O OpenCrew é sua equipe fixa que já
> conhece seu negócio, seu tom de voz e suas preferências — e melhora a cada run.

---

## Como instalar

### Pré-requisitos

- **Node.js 20+** ([baixar](https://nodejs.org/))
- Uma IDE de IA com acesso a arquivos locais: **Claude Code**, **Cursor**,
  **Codex (OpenAI)**, **Gemini CLI**, **Google Antigravity**, **OpenCode**,
  **VS Code + Copilot**, **Qwen Code** ou **Trae**.

### Método 1: Via NPX (Recomendado 🚀)

```bash
npx @aksp/opencrew init
```

O `init` monta o workspace na pasta atual. Ele pergunta quais IDEs você usa
e gera os arquivos de integração automaticamente. **Se você já tem um
`AGENTS.md` ou `CLAUDE.md` com instruções do seu projeto, eles são preservados**
— o OpenCrew adiciona sua ponte sem apagar nada.

Você pode pré-selecionar as IDEs ou instalar em todas de uma vez:

```bash
npx @aksp/opencrew init --ide=claude-code,codex
npx @aksp/opencrew init --all
```

### Método 2: Via Git Clone

```bash
# macOS / Linux (Bash/Zsh)
git clone https://github.com/alberthpalhares/opencrew.git "meu-projeto" && cd "meu-projeto"
```

No Windows PowerShell:
```powershell
git clone https://github.com/alberthpalhares/opencrew.git "meu-projeto"; cd "meu-projeto"
```

Depois instale as dependências e configure as IDEs:

```bash
npm install
npm start -- --all
```

### Iniciando o OpenCrew

1. Abra a pasta do projeto na sua IDE de IA.
2. Digite `/opencrew` para começar — a primeira execução configura o perfil
   da sua empresa (nome, site, tom de voz) em 2 minutos.
3. Depois é só pedir: "cria uma crew para posts de Instagram em carrossel"
   ou "preciso de uma newsletter mensal sobre IA".

**Nenhuma chave de API é necessária para começar.** Se uma skill opcional
precisar de uma (ex: Instagram, Resend, Apify), o OpenCrew pede direto na
conversa e salva tudo sozinho. Você não edita arquivo nenhum.

---

## Funciona em qualquer IDE

O `AGENTS.md` na raiz do projeto é uma **ponte fina** que aponta para o sistema
completo em `_opencrew/core/system.md`. Cada IDE recebe um arquivo de integração
enxuto — todos apontam para a mesma fonte.

| Arquivo gerado | Compatível com |
|---|---|
| `AGENTS.md` (ponte) + `.claude/skills/opencrew/SKILL.md` + `CLAUDE.md` | Claude Code |
| `AGENTS.md` (ponte) + `.agents/skills/opencrew/SKILL.md` | OpenAI Codex, Codex CLI |
| `AGENTS.md` (ponte) + `.cursor/rules/opencrew.mdc` | Cursor, Windsurf |
| `AGENTS.md` (ponte) + `.github/copilot-instructions.md` | VS Code + GitHub Copilot |
| `AGENTS.md` (ponte) + `.opencode/commands/opencrew.md` | OpenCode |
| `AGENTS.md` (ponte) + `.agent/rules/opencrew.md` | Google Antigravity |
| `GEMINI.md` (ponte) | Gemini CLI |
| `QWEN.md` (ponte) | Qwen Code |
| `AGENTS.md` (ponte) + `.trae/rules/opencrew.md` | Trae |

> ⚠️ **Importante:** `CLAUDE.md`, `GEMINI.md` e os demais arquivos de IDE são
> pontes geradas automaticamente. Eles são finos (5-10 linhas) e usam blocos
> marcados (`<!-- opencrew:start/end -->`) que permitem **merge não-destrutivo**
> com instruções que você já tenha nesses arquivos. Se precisar editar o
> comportamento do OpenCrew, edite os arquivos em `_opencrew/core/`.

---

## Estrutura de pastas gerada

```
meu-projeto/
├── AGENTS.md                     ← ponte fina (7 linhas)
├── CLAUDE.md                     ← ponte fina + suas instruções (merge)
├── GEMINI.md                     ← ponte fina (Gemini CLI)
├── .mcp.json                     ← servidor Playwright do OpenCrew
├── .gitignore
├── .env.example
│
├── _opencrew/
│   ├── core/
│   │   ├── system.md             ← 🧠 sistema completo do OpenCrew
│   │   ├── runner.pipeline.md    ← executor de pipeline
│   │   ├── skills.engine.md      ← gerenciador de skills
│   │   ├── architect.agent.yaml  ← definição do Arquiteto
│   │   ├── best-practices/       ← 23 guias de melhores práticas
│   │   └── prompts/              ← 12 prompts de fase (discovery, design, build, etc.)
│   ├── agents/                   ← 5 agentes base compartilhados
│   │   ├── researcher.agent.md
│   │   ├── copywriter.agent.md
│   │   ├── reviewer.agent.md
│   │   ├── designer.agent.md
│   │   └── strategist.agent.md
│   ├── _memory/
│   │   ├── company.md            ← perfil da sua empresa (onboarding)
│   │   └── preferences.md        ← idioma, tier padrão, dashboard
│   └── .opencrew-version
│
├── crews/                        ← suas crews vivem aqui
│   ├── blog-semanal/             ← template: blog semanal
│   ├── instagram-carrossel/      ← template: Instagram carrossel
│   ├── newsletter-mensal/        ← template: newsletter
│   └── lancamento-produto/       ← template: lançamento
│
├── skills/                       ← skills instaladas (11 do catálogo)
│   ├── apify/                    ← web scraping
│   ├── canva/                    ← design no Canva
│   ├── image-creator/            ← HTML/CSS → imagem
│   ├── instagram-publisher/      ← publicação no Instagram
│   ├── resend/                   ← envio de emails
│   └── ...
│
└── dashboard/
    └── index.html                ← dashboard visual (opcional, offline)
```

---

## Mantendo o OpenCrew atualizado

```bash
npx @aksp/opencrew update
```

O `update` **nunca destrói seus dados**. Ele atualiza apenas:

| O que é atualizado | O que NUNCA é tocado |
|---|---|
| `_opencrew/core/` (framework) | `crews/` (suas crews) |
| Skills do catálogo | `_opencrew/_memory/` (perfil, preferências) |
| `_opencrew/core/system.md` | `.env` (suas chaves) |
| Bloco `<!-- opencrew -->` nos bridges | Arquivos de IDE (fora do bloco) |

Se você está migrando de uma versão anterior a v1.3, o `update` detecta
AGENTS.md legados (sistema completo de 150 linhas) e os substitui pela ponte
fina automaticamente, sem perder suas instruções.

Para verificar se há atualização disponível sem aplicar:

```bash
npx @aksp/opencrew update --check
```

---

## Comandos

### Dentro da sua IDE (chat)

| Comando | O que faz |
|---|---|
| `/opencrew` | Abre o menu principal |
| `/opencrew create <descrição>` | Cria uma nova crew a partir da sua descrição |
| `/opencrew run <nome>` | Executa o pipeline de uma crew |
| `/opencrew list` | Lista todas as suas crews |
| `/opencrew edit <nome>` | Modifica uma crew existente |
| `/opencrew repair <nome>` | Conserta o manifesto de uma crew com nomes quebrados |
| `/opencrew delete <nome>` | Remove uma crew |
| `/opencrew skills` | Navega, instala ou remove skills |
| `/opencrew install <skill>` | Instala uma skill do catálogo |
| `/opencrew settings` | Altera preferências (idioma, tier, dashboard) |
| `/opencrew show-company` | Mostra o perfil da empresa |
| `/opencrew edit-company` | Reconfigura o perfil da empresa |
| `/opencrew help` | Mostra a lista de comandos |

### No terminal (CLI)

| Comando | O que faz |
|---|---|
| `npx @aksp/opencrew init` | Instala o OpenCrew na pasta atual |
| `npx @aksp/opencrew update` | Atualiza o framework |
| `npx @aksp/opencrew update --check` | Verifica se há update disponível |
| `npx @aksp/opencrew version` | Mostra a versão instalada |
| `npx @aksp/opencrew help` | Mostra ajuda dos comandos CLI |

---

## Para quem é

- **Criadores de conteúdo** — mantenha consistência de qualidade e tom de voz
  mesmo publicando todo dia.
- **Agências e estúdios** — cada cliente tem sua crew, seu perfil, seu tom.
  O OpenCrew não mistura.
- **Empresas com marketing interno** — automatize a produção de conteúdo sem
  contratar mais ninguém.
- **Freelancers** — entregue mais rápido, com qualidade consistente, e cobre
  por resultado, não por hora.
- **Não é para** — substituir pensamento estratégico humano. O OpenCrew
  executa, você decide. Os checkpoints existem por um motivo.

---

## Créditos

Este projeto é uma **adaptação independente do [OpenSquad](https://github.com/renatoasse/opensquad)**,
criado por **[Renato Asse](https://github.com/renatoasse)**, fundador da
[Comunidade Sem Codar](https://semcodar.com.br). A ideia original, o conceito
de multi-agentes e o design do pipeline são trabalho dele. Se você quiser o
projeto oficial, use [`npx opensquad init`](https://github.com/renatoasse/opensquad).

Esta versão (`@aksp/opencrew`) é mantida por **[Alberth Klinsmann](https://github.com/alberthpalhares)**
([PALHARES Estúdio & Corporativo](https://github.com/alberthpalhares)) como uma
adaptação pessoal, compartilhada publicamente caso ajude outras pessoas. **Não é**
afiliada nem endossada pelo Renato Asse ou pela Comunidade Sem Codar.

Licenciado sob MIT — veja [LICENSE](LICENSE). Framework original também MIT.

---

*Sua IDE já é inteligente. Com o OpenCrew, ela vira seu estúdio.*
