# Glossário — Linguagem Ubíqua

> Termo novo entra aqui ANTES de aparecer no código ou num prompt. A coluna `Contexto`
> diz em qual camada o termo vive: **CLI** (`bin/`, `src/`) ou **Runtime** (`templates/`).

| Termo | Termo no Código | Contexto | Definição |
|---|---|---|---|
| Crew | `crew` | Runtime | Equipe de agentes que produz um tipo de conteúdo; vive em `crews/{code}/` com `crew.yaml` e `pipeline.yaml` |
| Agente | `agent` | Runtime | Persona com papel definido (`*.agent.md`); pode estender um agente base de `_opencrew/agents/` via `extends:` |
| Passo | `step` | Runtime | Unidade do pipeline executada por um agente, inline ou como checkpoint |
| Passo irreversível | `side_effects: irreversible` | Runtime | Passo cujo efeito sai do projeto e não se desfaz (publicar, enviar e-mail, postar); sempre no fim do pipeline, depois do Review e da aprovação final, e nunca repetido automaticamente |
| Verificador automático | `verificar.mjs` | Runtime | Script que mede o texto antes do revisor (tamanhos, hashtags, placeholders, termos proibidos, afirmações a confirmar) usando os `constraints:` dos best-practices; a última linha diz o estado: `VERIFICACAO:OK`, `VERIFICACAO:BLOQUEADA` ou `VERIFICACAO:AGUARDANDO_USUARIO` |
| Bloqueio | `VERIFICACAO:BLOQUEADA` | Runtime | Falha objetiva do verificador (acima de um máximo, placeholder, termo proibido); força REJECT na revisão. `[PREENCHER]` também aparece como bloqueio no relatório, mas, quando é o único tipo, o estado é `VERIFICACAO:AGUARDANDO_USUARIO`: não força REJECT e a aprovação final pede o dado ao usuário |
| Alerta | — | Runtime | Ponto a conferir (abaixo de um mínimo, afirmação em 1ª pessoa com dado); não bloqueia, mas limita a nota a 7/10 e aparece na aprovação final |
| Marcador de dado faltante | `[PREENCHER: …]` | Runtime | O que o agente escreve no lugar de um dado real que não tem; a aprovação final pede ao usuário |
| Fontes do projeto | `fontes:` (crew.yaml) | Runtime | Arquivos/pastas do projeto do usuário que a crew lê a cada run e trata como verdade (caminho relativo à raiz) |
| Conferência de fontes | `conferir-fontes.mjs` | Runtime | Script que confere, no início do run, se os arquivos citados pela crew existem e sugere o novo caminho quando foram movidos |
| Overlay local | `_opencrew/best-practices.local/` | Runtime | Best-practices do usuário (aprendidas ou criadas), lidas antes das do core e nunca tocadas pelo `update` |
| Checkpoint | `checkpoint` | Runtime | Passo que para e pede decisão do usuário |
| Execução | `run` | Runtime | Uma passada completa do pipeline de uma crew; identificada por `run_id`, saída em `output/{run_id}/` |
| Skill | `skill` | Runtime | Capacidade externa (`skills/<nome>/SKILL.md`, às vezes com `scripts/`) que um agente pode usar |
| Best-practice | `best-practice` | Runtime | Guia por formato ou disciplina em `_opencrew/core/best-practices/`, indexado em `_catalog.yaml`; a versão do usuário mora no overlay local, que o runner e o verificador leem antes da do core |
| Tier da crew | `tier` | Runtime | Profundidade do pipeline: Express / Standard / Full (não confundir com o tier project-standards do repo) |
| Sistema | `system.md` | Runtime | Definição completa do runtime; fonte: `templates/AGENTS.md`, instalada em `_opencrew/core/system.md` |
| Ponte | `bridge` | CLI | Arquivo fino por IDE que aponta para o sistema; gerado de `src/lib/ides.js` |
| Bloco marcado | `opencrew:start/end` | CLI | Trecho delimitado por marcadores que o CLI pode regravar sem tocar no resto do arquivo do usuário |
| Workspace | `workspace` | CLI | Projeto do usuário com o OpenCrew instalado (`_opencrew/core` + stamp de versão) |
| Payload | `templates/` | CLI | Tudo o que o `init` copia para o projeto do usuário |
| Stamp de versão | `.opencrew-version` | CLI | Versão do OpenCrew instalada no workspace |
| Manifesto | `_opencrew/manifest.json` | CLI | Registro (caminho → hash) dos arquivos que o OpenCrew entregou, gravado pelo `init`, pelo `update` e pelo `init --repair-bridges`; é por ele que o `update` distingue o arquivo que o usuário editou do que só está antigo (não confundir com o `crew-party.csv`, o manifesto de agentes de uma crew) |
| Cópia de segurança | `.opencrew-backup/<data>/` | CLI | Pasta onde o `update` (e o `init --repair-bridges`) guarda, antes de substituir, o arquivo do framework (core, skill do catálogo, ponte de arquivo inteiro) que o usuário editou — ou, sem manifesto, todo arquivo diferente do pacote novo; o resumo do `update` lista o que foi copiado |
| Sandbox | `sandbox/` | Repo | Workspace local do mantenedor para testar o runtime; fora do git |
