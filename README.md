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
- 📤 **Tabelas em CSV** — as tabelas de um resultado saem em CSV, prontas para a planilha.
- 📬 **Entrega por canal** — depois de aprovar, você encontra a pasta `entrega/`: uma pasta por
  canal (Instagram, LinkedIn, blog, e-mail, WhatsApp, X/Twitter, YouTube), o texto pronto para
  colar, as imagens e um `LEIA-ME.md` com o passo a passo. O que não está pronto fica marcado.
- 📁 **Entrega no seu projeto** — a crew pergunta uma vez onde guardar e copia a entrega para uma
  pasta do seu projeto, uma subpasta por execução, sem sobrescrever nada.
- 📄 **Documento Word em papel timbrado** — ata, ofício, declaração: o texto em markdown vira um
  arquivo do Word com as mesmas palavras, o seu logotipo no cabeçalho, "Página X de Y" no rodapé
  e as linhas de assinatura. Um comando: `/opencrew documento <arquivo>`.
- 🎛️ **Seleção inteligente de agentes** — o sistema analisa seu pedido e
  sugere quais agentes são necessários para aquela tarefa. Você confirma ou
  ajusta com um clique. Agentes pulados não gastam tokens naquele run.
- 🔎 **Revisor com dentes** — antes da revisão, um verificador automático mede o texto
  (tamanho de título, meta description, legenda, hashtags, slides), barra placeholders,
  termos que você proibiu e `[PREENCHER]` pendentes, e aponta afirmações a confirmar.
  Bloqueio não passa, seja qual for a nota do revisor. A crew não inventa casos nem números:
  quando falta um dado real, ela pergunta na aprovação final.
- 🖥️ **Escritório ao vivo** — veja a equipe trabalhando numa sala em pixel-art, no navegador:
  quem está digitando, quem passou o bastão, quem espera a sua resposta. Opcional, desligado por
  padrão, só neste computador. Liga com `/opencrew dashboard`.
- 📂 **Crew que conhece o projeto** — liste em `fontes:` os arquivos e pastas do seu projeto
  (decisões, calendário, manual de marca) e a crew os lê em todo run, tratando-os como verdade.
  Reorganizou as pastas? No início do run ela confere os caminhos, acha para onde o arquivo foi
  e oferece corrigir. Correções que você faz num checkpoint ficam gravadas na hora.

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

- **Node.js 20.17 ou mais novo** ([baixar](https://nodejs.org/))
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
| `AGENTS.md` (ponte) + `.cursor/rules/opencrew.mdc` | Cursor |
| `AGENTS.md` (ponte) + `.github/copilot-instructions.md` | VS Code + GitHub Copilot |
| `AGENTS.md` (ponte) + `.opencode/commands/opencrew.md` | OpenCode |
| `AGENTS.md` (ponte) + `.agent/rules/opencrew.md` + `.agent/workflows/opencrew.md` + `.agents/skills/opencrew/SKILL.md` + `.agents/workflows/opencrew.md` | Google Antigravity |
| `GEMINI.md` (ponte) + `.agents/skills/opencrew/SKILL.md` | Gemini CLI |
| `QWEN.md` (ponte) + `.agents/skills/opencrew/SKILL.md` | Qwen Code |
| `AGENTS.md` (ponte) + `.trae/rules/opencrew.md` | Trae |

> **Claude Cowork (modo alternativo):** o Cowork não reconhece o comando `/opencrew` (ele não lê
> skills de dentro da pasta do projeto). Funciona assim: abra a pasta do projeto e peça, em texto:
> *"Leia o arquivo `_opencrew/core/system.md` deste projeto e siga as instruções dele. Mostre o
> menu principal."* Depois use frases como "rodar a crew blog-semanal" no lugar dos comandos com `/`.


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
├── .gitignore                    ← bloco `# opencrew` no fim; suas linhas são mantidas
├── .env.example                  ← idem
│
├── _opencrew/
│   ├── core/
│   │   ├── system.md             ← 🧠 sistema completo do OpenCrew
│   │   ├── runner.pipeline.md    ← executor de pipeline
│   │   ├── skills.engine.md      ← gerenciador de skills
│   │   ├── architect.agent.yaml  ← definição do Arquiteto
│   │   ├── formato-da-crew.md    ← o formato dos arquivos de uma crew (crew.yaml, pipeline.yaml, passos)
│   │   ├── best-practices/       ← 24 guias de melhores práticas + _catalog.yaml
│   │   ├── scripts/              ← verificador, conferência de fontes, caminhos, entrega, documento Word, conserto de crews e os scripts do Escritório
│   │   ├── modelos/              ← modelo do perfil de documento oficial (papel timbrado)
│   │   ├── escritorio/           ← página do Escritório ao vivo (abre com /opencrew dashboard)
│   │   └── prompts/              ← 15 prompts de fase (discovery, design, build, entrega, documento, etc.)
│   ├── agents/                   ← 5 agentes base compartilhados
│   │   ├── researcher.agent.md
│   │   ├── copywriter.agent.md
│   │   ├── reviewer.agent.md
│   │   ├── designer.agent.md
│   │   └── strategist.agent.md
│   ├── _memory/
│   │   ├── company.md            ← perfil da sua empresa (onboarding)
│   │   ├── preferences.md        ← idioma, tier padrão, Escritório ligado ou desligado
│   │   └── documento-oficial.md  ← seu papel timbrado (só existe depois que você pede; veja "Documento Word")
│   └── .opencrew-version
│
├── crews/                        ← suas crews vivem aqui
│   ├── blog-semanal/             ← template: blog semanal
│   │   └── output/<execução>/    ← criada a cada execução
│   │       ├── v1/  v2/  …       ← o que cada passo gravou
│   │       └── entrega/          ← o que você usa: LEIA-ME.md + uma pasta por canal (copiada para a pasta do projeto que você escolher)
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
```

---

## Entrega por canal

Depois da aprovação final, a crew monta a pasta `entrega/` dentro da pasta da execução
(`crews/<crew>/output/<execução>/entrega/`). É ali que está o que você vai usar:

```
entrega/
├── LEIA-ME.md      ← comece por aqui: o que fazer com cada arquivo, canal por canal
├── instagram/      ← legenda.txt (hashtags no fim) e as imagens, com o nome original
├── linkedin/       ← post.txt e, se houver, post-comentario.txt (o primeiro comentário)
├── blog/           ← seo.txt (título, meta description, palavra-chave, slug) e artigo.md
├── email/          ← assunto.txt, previa.txt e corpo.md
├── whatsapp/       ← mensagem.txt
├── twitter/        ← tweet.txt (na thread: tweet-1.txt, tweet-2.txt…)
├── youtube/        ← o roteiro
├── documentos/     ← o Word (.docx) de cada texto de formato documento-oficial
├── outros/         ← arquivo sem canal (proposta, minuta, relatório), como está
└── editaveis/      ← o HTML dos slides, para quem quiser ajustar
```

Só aparecem as pastas que a execução tem.

- **Texto pronto para colar.** Os `.txt` saem sem `#`, `**`, rótulos nem recados internos, com as
  hashtags no fim. Com mais de uma peça do mesmo tipo, os arquivos são numerados (`post-1.txt`,
  `post-2.txt`).
- **O `LEIA-ME.md` diz o que fazer.** Cada canal tem a situação ("Pronto", "Pronto, com ressalva"
  ou "Não está pronto"), os arquivos, de onde cada um veio e os passos, numerados. "Antes de usar"
  junta o que falta e o que foi entregue com ressalva; "O que não foi conferido" lembra o que
  ninguém mediu (links e fatos, texto dentro das imagens, aparência final em cada rede).
- **O que não está pronto fica marcado, e você escolhe.** Sobrou um `[PREENCHER]` ou um texto
  acima do limite? O canal aparece como "Não está pronto" e a crew oferece três saídas:
  1. **Corrigir agora** — ela ajusta no arquivo de origem, verifica e monta a entrega de novo.
  2. **Entregar assim mesmo** — o que falta fica escrito como ressalva no começo do LEIA-ME, e o
     canal passa a "Pronto, com ressalva".
  3. **Deixar para depois** — o canal fica como "Não está pronto" e não é copiado para o projeto.
     Quando o dado existir, peça a entrega dessa execução de novo.
- **Não tem o dado na hora?** Na aprovação final, diga "não tenho esse dado": a crew não insiste e
  não inventa — o `[PREENCHER]` fica no texto e você decide na entrega.
- **Arquivo sem canal vai para `outros/`**, inteiro e com o nome original: nada some.
- **A pasta `entrega/` é refeita a cada entrega e fica fora do git.** O que você editar ali se
  perde: o que é para guardar está na cópia do seu projeto (abaixo).
- **Execução antiga?** Peça à IA: "monte a entrega da execução X da crew Y". Ela lista os
  arquivos, pede o seu "sim" e monta a pasta. Funciona em crews criadas antes da 1.8.0, depois
  do `update`.

### A cópia no seu projeto

Na primeira entrega de cada crew, a IA pergunta: "Quer que eu copie o resultado para uma pasta do
projeto?". Se você disser uma pasta (por exemplo, `Conteudo/Prontos`), a crew copia a entrega para
uma pasta do seu projeto, uma subpasta por execução: `<pasta>/<execução>/`, com o `LEIA-ME.md` e
as pastas dos canais prontos.

- **A pergunta é feita uma vez por crew.** A resposta — também o "não" — fica na linha
  `entrega.destino` do `crew.yaml` da crew (o arquivo anterior fica em `crew.yaml.bak`). Para
  mudar depois, peça à IA ou edite essa linha.
- **Nada é sobrescrito.** Entregar de novo sem mudança não cria nada. Canal que ficou pronto
  depois entra na mesma pasta. Se algo que já foi copiado mudou, a entrega nova vai para
  `<execução>-reentrega-2` (depois `-3`…), ao lado, e a anterior fica como estava, com um aviso no
  LEIA-ME dela. O que você editar ou guardar na cópia continua lá, e editar a cópia não faz a
  entrega seguinte virar reentrega.
- **Só vai o que está pronto.** Canal "Não está pronto" fica fora da cópia, a menos que você
  escolha "Entregar assim mesmo".
- **A pasta fica dentro do projeto**, fora de `_opencrew/`, `crews/`, `skills/`, `.git/` e
  `node_modules/`; se não existe, é criada. Se ela entra no git, a escolha é sua.

A entrega não gera PDF nem imagem: `artigo.md`, `corpo.md` e os roteiros saem em markdown, e o
LEIA-ME ensina a salvar como PDF pelo "Imprimir" do seu editor. O LEIA-ME e os nomes dos arquivos
são sempre em português.

---

## Documento Word

Ata, ofício, declaração, contrato: quando o resultado é um documento para imprimir, assinar ou
protocolar, o OpenCrew transforma o texto em markdown num arquivo do Word (`.docx`) com **as
mesmas palavras e os mesmos números, na mesma ordem**. Você escreve (ou a crew escreve) o texto;
um comando gera o documento.

**Como gerar:** no chat da sua IDE, digite `/opencrew documento Atas/ata.md` — ou escolha
"Documento Word" em "Mais opções" do menu. O Word sai ao lado do texto, com o mesmo nome
(`Atas/ata.docx`), e a IA mostra o relatório: onde gravou, qual papel timbrado usou e os avisos.
Também funciona direto no terminal, na pasta do projeto:

```bash
node _opencrew/core/scripts/documento.mjs "Atas/ata.md"
node _opencrew/core/scripts/documento.mjs "Atas/ata.md" --saida "Documentos/Prontos"
node _opencrew/core/scripts/documento.mjs --criar-perfil     # cria o arquivo do papel timbrado
```

**Papel timbrado.** Na primeira vez, a IA pergunta se você quer configurar o papel timbrado do
projeto. Com o "sim", ela cria o perfil de documento oficial em
`_opencrew/_memory/documento-oficial.md`, pergunta o logotipo, as linhas do cabeçalho e o rodapé
e preenche o arquivo. É um arquivo de texto, seu, que o `update` nunca toca. Nele ficam:

- o logotipo (um PNG de até 2 MB, dentro do projeto) e a largura dele;
- três linhas de cabeçalho (nome da organização, registro, site e contato);
- o texto do rodapé e o "Página X de Y";
- as margens, a fonte e o tamanho da letra.

Com o "não", o documento sai sem timbre, com as margens padrão e "Página X de Y" no rodapé. É um
perfil por projeto; mudar o perfil não muda os documentos já gerados.

**Como escrever o texto.** Markdown comum, um parágrafo por linha, com três marcações a mais:

```
::: titulo ATA DA REUNIÃO DA DIRETORIA
::: subtitulo Realizada em 5 de maio de 2026

# I. Abertura
Aos 5 dias do mês de maio de 2026, reuniu-se a diretoria.

::: assinaturas
Ana Lima | Presidente
Rui Sá | Secretário
:::

::: quebra-de-pagina
::: titulo ANEXO I — CALENDÁRIO
```

- `::: titulo` e `::: subtitulo` saem centralizados; `#`, `##` e `###` viram os títulos das
  seções; tabela vira tabela; `- item` vira lista com marcador.
- `::: quebra-de-pagina` começa uma página nova (para o anexo); `::: assinaturas`, uma linha
  `Nome | Cargo` por pessoa e `:::` para fechar montam as linhas de assinatura.
- **Os números são os seus.** "1.", "6.1.", "a)" e "§ 1º" vão como texto, do jeito que você
  escreveu: nada é renumerado, reordenado nem corrigido.
- **Nada é trocado sem você saber.** Se já existe um Word diferente com esse nome (você pode tê-lo
  editado), nada é gravado: a IA pergunta antes de substituir.
- **Avisos de conversão.** O relatório diz o que não coube no documento e ficou como texto: imagem,
  marcação `:::` desconhecida, bloco de assinaturas sem o `:::` final. Perfil com erro (chave
  desconhecida, logotipo que não existe) não gera documento: a mensagem diz a linha.
- **O Word é uma cópia do texto.** O que você mudar no Word não volta para o texto: altere o texto
  e gere de novo. Para ter um PDF, abra o documento no Word e use Salvar como PDF.

**Dentro de uma crew.** O passo cujo resultado é um documento usa `format: documento-oficial` (o
guia que ensina o redator a escrever assim). Na entrega, esse texto vira
`entrega/documentos/<nome>.docx`, com o papel timbrado do projeto, e o LEIA-ME diz o que conferir.
Crews novas já nascem assim; numa crew antiga, acrescente `format: documento-oficial` ao passo.

**O que não faz.** Não põe imagem no corpo do texto, link clicável, sumário, nota de rodapé nem
numeração automática; o logotipo é só PNG; tamanhos e cores dos títulos são fixos; não lê nem
regrava um modelo `.dotx`. Os testes conferem a estrutura do arquivo; como ele fica na página,
você confere no Word. No LibreOffice e no Google Docs o resultado não foi conferido.

Quem já usa o OpenCrew recebe o documento Word com um `npx @aksp/opencrew@latest update`.

---

## Escritório ao vivo

Quer ver a equipe trabalhando? O **Escritório** é uma página em pixel-art, aberta no navegador,
em que cada agente tem a sua mesa: digita quando é a vez dele, leva o papel ao colega na passagem
de bastão e levanta a mão quando espera uma resposta sua. Ao lado do desenho ficam o passo atual,
a lista dos agentes (com o status por extenso e o que cada um fez) e a última passagem de bastão.

**Como abrir:** no chat da sua IDE, digite `/opencrew dashboard`. O comando liga o Escritório,
sobe a página e mostra o endereço — `http://127.0.0.1:4747`, ou a porta livre seguinte. A próxima
execução de crew aparece ali; enquanto não há nenhuma, a página roda uma demonstração. Repetir o
comando é seguro: ele devolve o mesmo endereço.

Se a sua IDE não roda comando em segundo plano, ela mostra o comando para você rodar em outro
terminal, na pasta do projeto:

```bash
node _opencrew/core/scripts/escritorio.mjs            # Ctrl+C para fechar
node _opencrew/core/scripts/escritorio.mjs --porta 5000
```

Para desligar: `/opencrew dashboard off`.

O que vale saber antes de ligar:

- **Vem desligado.** Sem o `/opencrew dashboard`, nada muda nas suas execuções.
- **Roda só neste computador, sem internet e sem medição.** A página é servida em `127.0.0.1`,
  só lê o estado das suas crews (`crews/<crew>/state.json`), não carrega nada de fora e não envia
  dado nenhum para lugar nenhum.
- **Com ele ligado, cada passo custa um comando curto a mais.** É assim que a IA avisa o que está
  fazendo: um comando de terminal por passo. Em IDE que pede aprovação a cada comando, libere o
  `estado.mjs` uma vez.
- **A tela mostra o que a IA avisa, e pode atrasar.** Se a IA pular um aviso, o desenho só se
  acerta no passo seguinte. Depois de 2 minutos sem novidade a página diz há quanto tempo foi a
  última atualização; depois de 20, o agente aparece "sem sinal" — o que não quer dizer que
  travou: um passo longo é normal.
- **O Escritório nunca para a execução.** Se o aviso falhar, a crew segue trabalhando.
- **Até 12 mesas.** Numa crew maior, os agentes a mais aparecem só na lista ao lado.

Quem já usa o OpenCrew recebe o Escritório com um `npx @aksp/opencrew@latest update`.

---

## Mantendo o OpenCrew atualizado

```bash
npx @aksp/opencrew@latest update
```

Um único comando traz **todas** as melhorias para quem já usa uma versão antiga — sem perder
o que você fez:

| O que é atualizado | O que NUNCA é tocado |
|---|---|
| `_opencrew/core/` (framework) e skills do catálogo | As crews que você criou em `crews/` |
| Pastas novas do framework (agentes-base, config) e modelos de crew — só o que falta | `_opencrew/_memory/` (perfil, preferências) |
| Pontes das IDEs **que você já tem instaladas** (nunca cria de IDE nova) | `_opencrew/best-practices.local/` (suas best-practices) |
| Bloco do OpenCrew em `AGENTS.md`, `CLAUDE.md` e `.gitignore` (o resto do arquivo fica intacto) | `.env` (suas chaves) |
| Servidor Playwright no `.mcp.json`, entregue uma vez (outros servidores intactos) | |

- **Editou um arquivo do framework, um skill do catálogo ou o bloco do OpenCrew?** Antes de
  substituir, o `update` guarda o arquivo inteiro em `.opencrew-backup/<data>/` e lista o que
  copiou. Essa pasta fica fora do git (entra no bloco do `.gitignore`). No primeiro `update` para
  a 1.6.3 há cópia do `.gitignore` mesmo sem edição sua: as versões anteriores não registravam o
  bloco.
- **O `.gitignore` tem um marcador do bloco sem o par** (só `# opencrew:start` ou só
  `# opencrew:end`)? Nenhuma linha sua é apagada: o `update` guarda o arquivo como estava e põe
  um bloco completo no fim. O bloco começa por um comentário que diz que ele é do OpenCrew: as
  suas linhas ficam fora dele.
- **E as crews que você já tinha?** O `update` não mexe nelas. Para levar a elas o que veio
  depois — o formato de cada texto (sem ele o redator não recebe o guia do tipo de texto), os
  arquivos do projeto que a crew deve ler, as proibições que o verificador consegue barrar —,
  peça na sua IDE `/opencrew repair <nome>`. Ele mostra o que falta, pergunta antes de cada
  mudança e deixa uma cópia `.bak` do arquivo que alterou. O que não dá para consertar assim
  (crew sem passo de revisão, publicação antes da revisão) ele aponta e manda para
  `/opencrew edit`.
- **Texto que não é post nem documento para assinar?** Proposta, minuta que outro passo diagrama,
  plano: o passo recebe o formato `texto-livre`. Não há limite de tamanho, nada vira Word, e a
  entrega guarda o arquivo como está, em `outros/`.
- **A instalação anterior parou no meio?** O `update` não altera nada e pede para você rodar
  `npx @aksp/opencrew init`, que conclui a instalação sem apagar o que já existe.
- **Apagou um modelo de crew ou um skill do catálogo?** Ele volta no `update`, e a saída diz o
  que foi entregue de novo.
- **Removeu o servidor Playwright do `.mcp.json`?** O `update` o entrega uma única vez; se você
  remover de novo, não volta. A versão fixada no arquivo não é trocada.
- **Uma IDE só conta como instalada pelo arquivo de ponte dela**, não por um arquivo seu que cite
  o OpenCrew. Texto antigo das pontes (instalações até a 1.2.2) é retirado, com cópia, quando
  está idêntico ao que o OpenCrew gravou.
- **Versão mais nova instalada?** O `update` não volta para uma versão mais antiga (cache do
  `npx`): ele para e pede `npx @aksp/opencrew@latest update`.

Para regravar as pontes de IDE num workspace que já existe:

```bash
npx @aksp/opencrew@latest init --repair-bridges                    # só as IDEs que você já tem instaladas
npx @aksp/opencrew@latest init --repair-bridges --ide=claude-code  # só as indicadas (ou uma IDE nova)
npx @aksp/opencrew@latest init --repair-bridges --all              # as 9 IDEs
```

Sem `--ide` e sem `--all`, o `init --repair-bridges` usa a mesma detecção do `update` (aqui o
`--yes` não escolhe IDE); se não encontra nenhuma ponte, para com erro e pede `--ide=<id>`.
O reparo não instala: numa pasta sem workspace do OpenCrew ele para com erro e pede o `init`.
Ele também só roda com o pacote na mesma versão do projeto: com outra versão, para sem alterar
nada e pede o `update`.
Ponte de arquivo inteiro que você editou (ex.: `.claude/skills/opencrew/SKILL.md`) é copiada
antes para `.opencrew-backup/<data>/`, e o resumo do `init --repair-bridges` lista cada cópia.

Se você está migrando de uma versão anterior a v1.3, o `update` detecta
AGENTS.md legados (sistema completo de 150 linhas) e os substitui pela ponte
fina. Desde a v1.4.2 o arquivo original é copiado antes para `AGENTS.md.bak` (até a v1.4.1,
instruções suas adicionadas a esse `AGENTS.md` legado eram perdidas).

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
| `/opencrew repair <nome>` | Mostra o que falta numa crew que você já tem (formato de cada texto, arquivos do projeto que ela deve ler, proibições que o verificador consegue barrar, nomes dos agentes) e conserta um ponto por vez, com o seu sim e uma cópia `.bak` |
| `/opencrew delete <nome>` | Remove uma crew |
| `/opencrew skills` | Navega, instala ou remove skills |
| `/opencrew install <skill>` | Instala uma skill do catálogo |
| `/opencrew settings` | Altera preferências (idioma, tier, Escritório) |
| `/opencrew dashboard` | Liga e abre o Escritório ao vivo (a equipe trabalhando, no navegador) |
| `/opencrew dashboard off` | Desliga o Escritório |
| `/opencrew documento <arquivo>` | Transforma um texto (`.md` ou `.txt`) em documento Word, com o papel timbrado do projeto |
| `/opencrew show-company` | Mostra o perfil da empresa |
| `/opencrew edit-company` | Reconfigura o perfil da empresa |
| `/opencrew help` | Mostra a lista de comandos |

### No terminal (CLI)

| Comando | O que faz |
|---|---|
| `npx @aksp/opencrew init` | Instala o OpenCrew na pasta atual |
| `npx @aksp/opencrew@latest update` | Atualiza o framework |
| `npx @aksp/opencrew update --check` (ou `--dry-run`) | Verifica se há update disponível, sem alterar nada |
| `npx @aksp/opencrew upgrade` | Atalho para `update` |
| `npx @aksp/opencrew init --ide=claude-code,cursor` | Instala só as pontes das IDEs indicadas (também com `--yes`) |
| `npx @aksp/opencrew init --all` (ou `-y`) | Instala as pontes de todas as IDEs |
| `npx @aksp/opencrew@latest init --repair-bridges` | Regrava as pontes das IDEs já instaladas num workspace existente (`--ide=a,b`: só as indicadas; `--all`: as 9) |
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
