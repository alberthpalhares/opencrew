# Spec — Fase 1: hotfix 1.4.2 ("parar de causar dano")

- **Fase:** 1 · **Módulos:** CLI (`src/`, `bin/`) + Runtime (`templates/`) · **Status:** implementada (2026-10-02); conferência manual de publicação pendente (§10)
- **Termos novos no GLOSSARIO.md:** sim — `side_effects` (passo irreversível); adicionar antes do código
- **Modelo sugerido:** execução Sonnet 5.5 · médio (alternativa econômica: Haiku 4.5 para F1-11/F1-12/F1-13)

## 1. Objetivo
Quem instala ou atualiza o OpenCrew 1.4.2 não perde arquivos, não recebe instruções que não
são dele, não publica nada nas redes antes da revisão e da aprovação final, e não corre o
risco de um texto vindo da web virar comando no terminal.

## 2. O que esta fase herda
Varredura de `Alocação: → F1` / dono `F1` em `docs/auditoria/2026-10-02-auditoria-geral.md`,
`IDEIAS.md` e nos testes:

| Origem | Item | Exige daqui |
|---|---|---|
| Auditoria | C-02, C-24, C-22 (cli) | F1-02 |
| Auditoria | C-03 | F1-01 |
| Auditoria | C-04, T-M1 (gitignore), T-B12 | F1-06 |
| Auditoria | C-05, D-07 | F1-05 |
| Auditoria | C-06, C-21 (bin) | F1-07 |
| Auditoria | C-07 | F1-03 |
| Auditoria | C-16, D-03 | F1-04 |
| Auditoria | T-A3 | F1-08 |
| Auditoria | T-A4 | F1-09 |
| Auditoria | T-M2, T-M3, T-M4 (instagram) | F1-10 |
| Auditoria | T-A5, T-A6 | F1-11 |
| Auditoria | T-B2 | F1-12 |
| `tests/ides.test.js` | teste `todo` "pontes sem conteúdo do mantenedor" | F1-01 vira teste normal (verde) |
| `tests/template-refs.test.js` | 3 entradas em `KNOWN_BROKEN` | F1-11 esvazia a lista |
| `IDEIAS.md` | #7 parcial (C-04/C-05) | F1-05, F1-06 |
| Working tree | compactação pendente de `templates/AGENTS.md` | F1-13 |

## 3. Entradas (CLI)

| Comando | Opções aceitas | Validação |
|---|---|---|
| `init` | `--ide=<ids>` / `--ide <ids>`, `--all`, `-y`/`--yes`, `--repair-bridges`, `-h`/`--help` | opção desconhecida, argumento posicional ou `--ide` sem nenhum id válido → erro antes de escrever |
| `update` / `upgrade` | `--check`, `--dry-run` (alias de `--check`), `-h`/`--help` | opção desconhecida → erro antes de escrever |
| (global) | `-v`/`--version`, `-h`/`--help`, `version`, `help` | — |

## 4. Saídas
- Arquivos no projeto do usuário: `.gitignore` e `.env.example` existentes ganham um bloco
  `# opencrew:start` … `# opencrew:end` no **fim**, sem tocar no resto.
- `AGENTS.md` legado: cópia em `AGENTS.md.bak` antes de ser trocado pela ponte.
- `CLAUDE.md` de instalações existentes: a seção "STATUS.md (gestão de sessão)" sai do bloco
  opencrew no próximo `update`.
- Códigos de saída: 0 sucesso · 1 erro de uso ou de execução · 130 cancelado pelo usuário.
  `update --check` e `update --dry-run` também saem com 1 quando há atualização disponível
  (não é erro).

## 5. Regras de negócio
1. **Nenhuma escrita antes da validação.** Opções, IDs de IDE e a escolha interativa de IDEs
   são resolvidos antes do primeiro arquivo ser escrito.
2. **`--help` nunca executa o comando**, em qualquer posição (`opencrew update --help`).
3. **Instalação completa = `_opencrew/core/` + stamp `_opencrew/.opencrew-version`.** O stamp
   é o último arquivo escrito e não é copiado do payload. Workspace com core e sem stamp é
   uma instalação interrompida: o `init` a **retoma**, preenchendo só o que falta.
4. **Arquivo compartilhado recebe bloco marcado.** `.gitignore` e `.env.example` existentes:
   bloco opencrew acrescentado no fim (marcadores `#`). Rodar de novo substitui só o bloco.
   Arquivo inexistente: criado com o conteúdo do template dentro do bloco.
5. **Payload sem conteúdo do mantenedor** (AGENTS.md regra 2): `CLAUDE_MD` e
   `templates/gitignore` sem STATUS.md.
6. **Publicar/enviar é sempre o último trecho do pipeline:**
   `… → Review → Final Approval (checkpoint) → [Publish/Send]`.
   Passos que só renderizam (imagens, slides) continuam antes do Review.
7. **Passo irreversível** (`side_effects: irreversible` no frontmatter do step: publicar,
   enviar e-mail, postar) **nunca** tem retry automático nem auto-correção de veto. Qualquer
   falha ou saída ausente → o runner pergunta ao usuário, informando que a ação pode já ter
   acontecido.
8. **Publicação no Instagram:** preview (imagens + legenda) → `--dry-run` → o usuário digita
   a confirmação explícita → publicação real. A legenda vai por arquivo (`--caption-file`);
   o `SKILL.md` nunca manda interpolá-la no shell (garantia de prompt; o script ainda aceita
   `--caption`: §12).
9. **Upload público só de imagem da crew:** `publish.js` aceita apenas `.jpg`/`.jpeg` dentro
   de `crews/*/output/`; upload no imgBB com expiração de 1 dia; o token do Instagram vai no
   corpo dos POST, não na URL.

## 6. Erros e casos-limite

| Situação | Comportamento esperado | Mensagem ao usuário |
|---|---|---|
| `opencrew update --foo` | exit 1, nada escrito | `Unknown option '--foo' for "update".` + dica `Run npx @aksp/opencrew help for usage.` |
| `opencrew init minha-pasta` | exit 1, nada escrito | `init does not take a directory — cd into the project folder first.` |
| `opencrew init --ide=bogus` | exit 1, nada escrito | `Unknown IDE "bogus". Valid: claude-code, codex, …` |
| `--ide=cursor,bogus` | segue só com cursor | aviso `Unknown IDE "bogus" — skipped.` |
| Ctrl+C no prompt de IDE | exit 130, nada escrito | `Cancelled — nothing was written.` |
| Erro inesperado (EPERM, disco cheio) | exit 1, sem stack trace (stack só com `OPENCREW_DEBUG=1`) | `✗ <mensagem>` |
| `update` sem `AGENTS.md` | cria a ponte e conclui | `AGENTS.md (bridge created)` |
| `AGENTS.md` legado + `AGENTS.md.bak` já existe | backup em `AGENTS.md.bak-<timestamp>` | `AGENTS.md (migrated from legacy full-system to thin bridge — backed up to <arquivo>)` |
| `.gitignore` sem marcador de fim (editado à mão) | acrescenta bloco novo no fim; não apaga nada | — |
| `publish.js` com `.env`, `.png` ou caminho fora de `crews/*/output/` | recusa antes de qualquer upload | `Refusing to upload <path>: only .jpg/.jpeg files inside crews/*/output/ are allowed.` |

## 7. Segurança
- Nada vindo de conteúdo pesquisado (legenda, títulos) é interpolado em comando de shell. É
  garantia de prompt (F1-10e): o `publish.js` ainda aceita `--caption` (§12).
- Nenhum arquivo fora de `crews/*/output/` e nenhum não-JPEG pode ser enviado ao imgBB.
- Token fora da URL nos POST (logs de proxy/servidor não o registram).
- `.claude/settings.local.json`, `crews/*/state.json` e `crews/*/_investigations/` entram
  no `.gitignore` do usuário.

## 8. Cenários BDD

**F1-01 — Payload sem conteúdo do mantenedor**
- **F1-01a** DADO o mapa de pontes de `src/lib/ides.js` QUANDO o teste varre todo conteúdo de
  ponte ENTÃO nenhuma contém `STATUS.md`, `Skill: /status`, `/ideias` ou "gestão de sessão".
- **F1-01b** DADO `templates/gitignore` QUANDO lido ENTÃO não contém `STATUS.md`.
- **F1-01c** DADO um workspace 1.4.1 cujo `CLAUDE.md` tem o bloco opencrew com a seção
  STATUS.md e texto do usuário fora do bloco QUANDO `update` roda ENTÃO o bloco é regravado
  sem a seção STATUS.md E o texto do usuário fica intacto.
- **F1-01d** DADO um workspace sem `CLAUDE.md` QUANDO `update` roda ENTÃO nenhum `CLAUDE.md`
  é criado.

**F1-02 — Parser estrito e `--help` seguro**
- **F1-02a** DADO um workspace instalado QUANDO `update --help` (ou `-h`) roda ENTÃO a ajuda é
  impressa, exit 0, e o hash da pasta é idêntico antes e depois.
- **F1-02b** DADO uma pasta vazia QUANDO `init --help` roda ENTÃO exit 0 e nenhum arquivo é criado.
- **F1-02c** DADO um workspace QUANDO `update --dry-run` roda ENTÃO se comporta como `--check`
  (nada escrito).
- **F1-02d** QUANDO `update --foo` roda ENTÃO exit 1, mensagem de opção desconhecida, nada escrito.
- **F1-02e** QUANDO `init --ide claude-code` (com espaço) roda ENTÃO só a ponte do Claude Code
  é escrita.
- **F1-02f** QUANDO `init -yv` roda ENTÃO é tratado como `-y -v` (imprime a versão), sem
  "Unknown command".
- **F1-02g** QUANDO `init --ide=bogus` roda ENTÃO exit 1 e nada escrito.
- **F1-02h** QUANDO `init minha-pasta` roda ENTÃO exit 1 e nada escrito.

**F1-03 — `update` sem `AGENTS.md`**
- **F1-03a** DADO um workspace sem `AGENTS.md` QUANDO `update` roda ENTÃO exit 0, `AGENTS.md`
  criado com a ponte e o stamp atualizado.

**F1-04 — Backup do `AGENTS.md` legado**
- **F1-04a** DADO um `AGENTS.md` legado (`# opencrew Instructions`, sem marcadores) com uma
  linha do usuário QUANDO `update` roda ENTÃO `AGENTS.md.bak` tem o conteúdo original byte a
  byte E `AGENTS.md` vira a ponte.
- **F1-04b** DADO que `AGENTS.md.bak` já existe QUANDO a migração roda ENTÃO o backup novo vai
  para `AGENTS.md.bak-<timestamp>` e o `.bak` antigo fica intacto.

**F1-05 — `.env.example` preservado**
- **F1-05a** DADO um `.env.example` do usuário QUANDO `init` roda ENTÃO as linhas originais
  continuam no topo, com o mesmo texto e na mesma ordem (quebras de linha: §12), seguidas do
  bloco `# opencrew:start … # opencrew:end`.
- **F1-05b** DADO o caso F1-05a QUANDO o bloco é escrito duas vezes (idempotência) ENTÃO
  existe exatamente um bloco opencrew.
- **F1-05c** DADO uma pasta sem `.env.example` QUANDO `init` roda ENTÃO o arquivo é criado com
  as variáveis do template.

**F1-06 — `.gitignore` protegido**
- **F1-06a** DADO um `.gitignore` do usuário QUANDO `init` roda ENTÃO nenhuma linha original
  muda (quebras de linha: §12) e o bloco opencrew no fim contém `.env`,
  `_opencrew/_browser_profile/`, `.claude/settings.local.json`, `crews/*/state.json` e
  `crews/*/_investigations/`.
- **F1-06b** idempotência: duas escritas → um único bloco.
- **F1-06c** DADO um bloco opencrew sem marcador de fim QUANDO o bloco é escrito ENTÃO nenhuma
  linha do usuário é apagada.

**F1-07 — Instalação interrompida**
- **F1-07a** DADO uma pasta vazia e o prompt de IDE cancelado (`ExitPromptError`) QUANDO `init`
  roda ENTÃO exit 130, mensagem `Cancelled — nothing was written.` e a pasta continua vazia.
- **F1-07b** DADO um workspace com `_opencrew/core/` e sem stamp (instalação interrompida)
  QUANDO `init --ide=claude-code` roda ENTÃO a instalação é retomada e concluída (stamp, ponte e
  `system.md` presentes), sem sobrescrever arquivos já existentes.
- **F1-07c** DADO uma instalação nova QUANDO o `init` termina ENTÃO o stamp é o último arquivo
  escrito e o payload não traz um stamp copiado.
- **F1-07d** DADO um erro inesperado dentro de um comando QUANDO `bin/opencrew.js` roda ENTÃO
  exit 1, uma linha `✗ <mensagem>` e nenhum stack trace (stack só com `OPENCREW_DEBUG=1`).

**F1-08 — Publicar depois da revisão**
- **F1-08a** DADO `design.prompt.md` QUANDO os padrões de pipeline são lidos ENTÃO todo padrão
  termina em `Review → Final Approval checkpoint → [Publish/Send]`, sem passo de
  publicação/envio antes do Review.
- **F1-08b** DADO `build.prompt.md` QUANDO os gates são lidos ENTÃO existe um gate BLOCKING que
  exige que todo passo `side_effects: irreversible` venha depois do Review e imediatamente
  depois de um checkpoint posterior ao Review.

**F1-09 — Passo irreversível sem retry automático**
- **F1-09a** DADO `build.prompt.md` QUANDO o formato de step é lido ENTÃO `side_effects:
  irreversible` está definido e é obrigatório para passos de publicar/enviar/postar.
- **F1-09b** DADO `runner.pipeline.md` QUANDO as regras de retry (validação de saída, falha de
  subagente, auto-correção de veto) são lidas ENTÃO cada uma exclui passos irreversíveis e manda
  perguntar ao usuário, avisando que a ação pode já ter ocorrido.

**F1-10 — Instagram seguro**
- **F1-10a** QUANDO `publish.js --caption-file legenda.txt` roda ENTÃO a legenda é lida do
  arquivo (UTF-8, sem interpretação de shell).
- **F1-10b** QUANDO `--images` inclui `.env`, um `.png` ou um caminho fora de `crews/*/output/`
  ENTÃO o script falha antes de qualquer chamada de rede.
- **F1-10c** QUANDO uma imagem é enviada ao imgBB ENTÃO o formulário inclui `expiration`.
- **F1-10d** QUANDO um POST é feito à Graph API ENTÃO `access_token` não aparece na URL.
- **F1-10e** DADO o `SKILL.md` QUANDO lido ENTÃO o fluxo é preview → `--dry-run` → confirmação
  explícita → publicação, e o `invoke` usa `--caption-file`.

**F1-11 — Caminhos das skills**
- **F1-11a** DADO `tests/template-refs.test.js` QUANDO roda ENTÃO `KNOWN_BROKEN` está vazio e
  todos os testes passam.
- **F1-11b** DADO o `instagram-publisher` QUANDO procura imagens ENTÃO usa a pasta do run atual
  (`crews/{crew}/output/{run_id}/…`), e o `image-creator` instrui screenshot em JPEG quando o
  destino é Instagram.
- **F1-11c** DADO o `image-ai-generator` QUANDO lido ENTÃO os comandos usam
  `{skill_path}/scripts/generate.py` e documentam `py -3`/`python` no Windows.

**F1-12 — Toggle do dashboard**
- **F1-12a** DADO `preferences.md` com `- **Dashboard:** enabled` QUANDO o runner lê a regra
  ENTÃO o texto da regra casa esse formato (negrito e marcador de lista).

**F1-13 — Compactação do `templates/AGENTS.md`**
- **F1-13a** DADO a compactação pendente QUANDO commitada ENTÃO `tests/docs.test.js` continua
  verde e o título `# opencrew Instructions` (usado pela detecção de legado) é mantido.

## 9. O que o humano confere na tela
Num terminal, numa pasta de teste vazia (ex.: `D:\tmp\teste-opencrew`):
- [ ] Rodar `node "<repo>\bin\opencrew.js" update --help`: aparece a ajuda e **nenhum**
      arquivo é criado na pasta. — pendente: sem registro (teste: F1-02a, F1-02b)
- [ ] Criar um `.gitignore` com a linha `minha-regra` e um `.env.example` com
      `MINHA_CHAVE=`, rodar `node "<repo>\bin\opencrew.js" init --ide=claude-code`, abrir os
      dois arquivos: as linhas originais continuam no topo, e o bloco `# opencrew` está no fim.
      — pendente: sem registro (teste: F1-05a, F1-06a)
- [ ] Abrir o `CLAUDE.md` gerado: **não** pode aparecer "STATUS.md". — pendente: sem registro
      (teste: F1-01a)
- [ ] Apagar a pasta, rodar `init` sem `--ide`, apertar Ctrl+C na lista de IDEs: aparece
      "Cancelled — nothing was written." e a pasta continua vazia. — pendente: sem registro
      (teste: F1-07a)
- [ ] No `sandbox/`, abrir `skills/instagram-publisher/SKILL.md`: o comando usa
      `--caption-file` e o fluxo pede confirmação explícita antes de publicar. — pendente: sem
      registro (teste: F1-10e)

Pendências acima (H1-12): nenhuma das cinco conferências manuais tem registro → U0 (jornada de
referência, com o dono). O teste citado cobre o mesmo comportamento, sem a conferência humana.

## 10. Critérios de aceite
- [ ] Todos os cenários F1-01a…F1-13a com teste de mesmo ID, visto vermelho antes do conserto.
      — os 39 têm teste de mesmo ID: o do F1-11a (H1-17) foi feito na R1 (1.6.1) — R1-09a. Ele
      nasceu verde (a lista já estava vazia): é trava de regressão, e vê-lo falhar com uma
      alteração provisória é critério da §10 da spec R1.
- [x] `npm run verify` verde (exit 0), sem teste `todo` e com `KNOWN_BROKEN` vazio. (A tag
      `v1.4.2` só publica depois do `npm run verify`; a 1.4.2 está no npm.)
- [ ] O que a porta não cobre foi conferido: execução real de uma crew com publicação em
      `--dry-run` no `sandbox/` (F1-08/F1-09/F1-10e), seção 9 feita à mão.
      — pendente: sem registro (H1-12) → U0 (jornada de referência, com o dono).
- [x] CHANGELOG 1.4.2 escrito; `npm version patch`; push/tag **só com confirmação do dono**.
      (1.4.2 publicada com tag no GitHub e no npm em 2026-10-02.)

## 11. Fora de escopo → destino

| O que não entra | Alocação |
|---|---|
| `update` refrescar o bloco do `.gitignore`/`.env.example` de instalações existentes | → U3a — o refresh das pontes (C-10) saiu na 1.6.0 (U2) sem estes blocos |
| Linha `STATUS.md` já gravada no `.gitignore` de quem instalou 1.4.0/1.4.1 | → sem fase — inofensiva; o usuário pode apagar |
| Regra preview/dry-run/confirmação em `blotato` e `resend` | → R2 — T-M4 (H1-04); ver §12 |
| Proteção de diretório-alvo (home/raiz do disco) e `init [dir]` | → U5 — C-20 |
| Converter PNG→JPEG no `publish.js` | → sem fase — exigiria dependência nativa; resolvido na origem (screenshot JPEG) |

## 12. Limites conhecidos
- F1-08/F1-09 mudam **prompts**: os testes garantem que o texto da regra existe e está no
  lugar certo, não que todo modelo de IA a siga. Conferência manual no `sandbox/`: pendente,
  sem registro (H1-12) → U0.
- Crews criadas antes da 1.4.2 mantêm o pipeline antigo (publicar antes do Review) até
  serem recriadas ou editadas. Elas também ficam sem a regra 7: seus passos de publicação não
  têm `side_effects: irreversible`, o runner só protege passo com essa marca e o `update` não
  altera `crews/` (H1-01). No Instagram, a confirmação explícita e o "não repetir" chegam pelo
  `update`, porque estão na skill do catálogo; em `blotato` e `resend`, não (ver abaixo).
  → U4 (T-B15) — `/opencrew repair` passa a reordenar passos irreversíveis.
- Os GET à Graph API continuam com o token na query (padrão da API): → sem fase — risco
  baixo, sem log de corpo.

Acrescentados em 2026-10-04 (revisão `docs/auditoria/2026-10-04-revisao-specs.md`):
- Regra 3 (H1-02): o `update` trata workspace com core e sem stamp como versão antiga, não
  como instalação interrompida. Ele atualiza e grava o stamp; depois disso o `init` responde
  `An opencrew workspace already exists here.` e não retoma. Ficam faltando `.gitignore` e
  `.env.example` (só o `init` os escreve). As pontes de IDE voltam com
  `init --repair-bridges --ide=<ide>`. → U3a.
- Regra 6 e F1-08b (H1-10): com dois passos de publicação no fim (ex.: Instagram e e-mail), os
  Gates 2b e 2c do `build.prompt.md` se contradizem. Cada passo irreversível exige um
  checkpoint imediatamente antes e, ao mesmo tempo, só aceita passos irreversíveis depois
  dele. O teste F1-08b só confere as palavras do gate. → U3a.
- Regra 8 (H1-15): a spec não define o `--dry-run`. Hoje ele já envia as imagens ao imgBB
  (públicas por 24h) e cria os contêineres no Instagram; só não chama `media_publish`. Isso
  acontece antes de o usuário digitar a confirmação, e o comando real repete o envio e os
  contêineres. O `SKILL.md` descreve o teste como validação "sem postar". → U3a.
- Regra 8 e §7 (H1-11): o `publish.js` ainda aceita `--caption` (legado). O script não tem
  como impedir a interpolação: quem executa `$(…)` é o shell, antes do Node. A garantia é de
  prompt: nenhum texto do payload manda usar `--caption`, e o F1-10e trava o `SKILL.md`.
  → sem fase — decisão de 2026-10-04 (só documento); remover a opção faria falhar crews
  antigas cujo passo copiou o comando da 1.4.1.
- `blotato` e `resend` (H1-04, T-M4): publicam e enviam sem prévia, sem confirmação explícita
  e sem `side_effects: irreversible` no `SKILL.md`; só o Instagram ganhou a regra 8. Em crew
  nova, o Gate 2c ainda obriga a marca no passo e o checkpoint de Aprovação Final antes dele.
  Em crew antiga, a única barreira é o checkpoint que o Gate 2b já exigia antes de todo passo
  que publica; sem a marca no passo, a regra 7 (sem retry automático) não vale. → R2.
- F1-01d (H1-06): um `CLAUDE.md` do usuário que só cita a palavra "opencrew" faz o `update`
  tratar o Claude Code como instalado. O bloco opencrew entra no arquivo e
  `.claude/skills/opencrew/SKILL.md` é criado. → R2.
- F1-05a e F1-06a (H1-18): o bloco é escrito com LF. Em arquivo CRLF, a última linha do
  usuário perde o `\r` e o arquivo fica com quebras misturadas; linhas em branco no fim somem.
  O texto das linhas não muda. Os testes só usam LF. → U5 (C-26).
- `publish.js` é ESM com extensão `.js` (H1-19, T-B14): num projeto com `package.json`
  `"type": "commonjs"` ele falha com `SyntaxError`. Sem `"type"`, depende da detecção
  automática de sintaxe do Node, que as versões mais antigas aceitas pelo `engines`
  (`>=20.0.0`) não têm (não testado em Node antigo). → U5.

## 13. Travas que esta spec deixa
- `tests/ides.test.js`: pontes sem conteúdo do mantenedor (deixa de ser `todo`).
- `tests/template-refs.test.js`: `KNOWN_BROKEN` vazio — qualquer caminho novo quebrado reprova.
  O teste "F1-11a (R1-09a): …" passou a exigir a lista vazia (H1-17): feito na R1 (1.6.1) —
  R1-09a.
- `tests/cli.test.js`: `--help` em todo comando não escreve nada; opção desconhecida reprova.
- `tests/update.test.js` (F1-01c, F1-01d, F1-03a, F1-04a, F1-04b) e `tests/ides.test.js`
  (F1-01a, F1-01b): comportamento do `update` e conteúdo das pontes.
- `tests/init-safety.test.js` (F1-05 a F1-07c): nenhum arquivo do usuário (`.gitignore`,
  `.env.example`) perde conteúdo.
- `tests/instagram-publisher.test.js` (novo): validação de caminho/extensão, token fora da URL.
- `tests/runtime-contracts.test.js` (F1-08, F1-09): contrato "irreversível = último trecho,
  sem retry automático".

## 14. Correções
- 2026-10-02 — F1-01c: o bloco regravado do `CLAUDE.md` continua apontando para `AGENTS.md`
  (não direto para `system.md`); o teste confere o cabeçalho da ponte. Apontar direto → U2
  (C-14): feito na 1.6.0, as pontes apontam para `_opencrew/core/system.md` (teste U2-08a).
- 2026-10-02 — F1-02a/F1-02d: o teste grava um stamp antigo antes do snapshot. Sem isso, um
  `update` indevido reescreveria arquivos com conteúdo idêntico e o teste passaria pelo motivo
  errado.
- 2026-10-02 — F1-06c: achado no GREEN — com um `start` órfão, a **segunda** escrita casava
  do órfão até o fim do bloco novo e apagava linhas do usuário. A regex passou a casar só o
  bloco mais interno, e o teste agora escreve duas vezes. A substituição também usa função
  (conteúdo com `$&` não é mais interpretado).
- 2026-10-02 — F1-09: passos irreversíveis também passam a exigir `execution: inline` (o
  dry-run e a confirmação acontecem na conversa principal). O SKILL.md do instagram ganhou
  `side_effects: irreversible` no frontmatter.
- 2026-10-02 — F1-11c: `runtime: python3` → `runtime: python` (valor aceito pelo formato de skill).
- 2026-10-02 — Fora do texto aprovado, mas no mesmo arquivo tocado: a ponte do `AGENTS.md`
  virou a constante única `AGENTS_BRIDGE` em `src/lib/ides.js` (C-23 parcial).
- 2026-10-02 — Trava ampliada na auditoria de fim de fase: o teste "sem conteúdo do mantenedor"
  passou a varrer todo o `templates/`, não só as pontes.
- 2026-10-04 — F1-01d (H1-05): deixou de valer como está escrito. Desde a 1.6.0 (regra 11 da
  U2), o `update` detecta a IDE por qualquer arquivo de ponte próprio dela e regrava todos:
  com `.claude/skills/opencrew/SKILL.md` presente, um `CLAUDE.md` apagado volta. Continua
  valendo que IDE não instalada não ganha `CLAUDE.md` (U2-07b). O teste F1-01d passa porque
  instala só o Cursor; o nome dele ("update never creates a CLAUDE.md that did not exist")
  afirma mais do que o código faz. Correção do nome do teste: feita na R1 (1.6.1) — R1-09b
  (entrada de 2026-10-05, abaixo).
- 2026-10-04 — Status (H1-12): o critério 3 da §10 não foi conferido no release (auditoria de
  fim de fase, 2026-10-02) e não há registro de conferência posterior, nem das cinco
  conferências da §9. Ficam pendentes → U0 (jornada de referência, com o dono). A fase segue
  "implementada": código e testes estão na 1.4.2.
- 2026-10-04 — Faxina de documento, sem mudança de código (revisão
  `docs/auditoria/2026-10-04-revisao-specs.md`):
  - destinos "F2", "F3" e "F4", que deixaram de existir, trocados em §11, §12 e §14
    (H1-14, H1-01);
  - §4 e §6 alinhadas ao CLI: `update --check` sai com 1 quando há atualização, e as duas
    mensagens da tabela são as que o CLI imprime desde a 1.4.2 (H1-16). As mensagens do CLI
    desta fase seguem em inglês → U5;
  - §13: F1-05 a F1-07c estão em `tests/init-safety.test.js` (o F1-07d, em `tests/cli.test.js`)
    e F1-08/F1-09 em `tests/runtime-contracts.test.js`, não nos arquivos citados antes (H1-17);
  - regra 8, §7, F1-05a e F1-06a: frases ajustadas ao que o código faz; a diferença está em
    §12 (H1-11, H1-18);
  - §12: limites que a revisão achou, cada um com destino (H1-02, H1-04, H1-06, H1-10, H1-15,
    H1-19).
- 2026-10-05 — R1 (1.6.1): F1-01d (H1-05): só o teste mudou de nome; o `update` não mudou. O
  teste passou a se chamar "F1-01d (R1-09b): update gives no CLAUDE.md to an IDE that is not
  installed (Cursor-only workspace)" e diz o que testa: IDE não instalada não ganha `CLAUDE.md`.
  O `CLAUDE.md` apagado de uma IDE instalada continua voltando no `update` (regra 11 da U2;
  decisão 12 da spec R1); esse caso não tem teste próprio. O texto do F1-01d na §8 fica como
  contrato histórico, com esta ressalva.
- 2026-10-05 — R1 (1.6.1): F1-11a (H1-17): ganhou teste com o ID, "F1-11a (R1-09a): the
  KNOWN_BROKEN list is empty", em `tests/template-refs.test.js`. A lista vazia passou a ser
  exigida por teste (§10 e §13).
- 2026-10-05 — R1 (1.6.1): regra 4 e F1-06 (`.gitignore`): o teste "init preserves an existing
  .gitignore (overwrite:false)", de `tests/init.test.js`, foi substituído pelo R1-09d. O nome
  antigo citava `overwrite:false`, que não é como o `.gitignore` é escrito desde esta fase
  (bloco marcado). O R1-09d diz o que o teste prova: num workspace completo, o `init` roda de
  novo e sai sem escrever nada, e o `.gitignore` editado não muda. O bloco marcado segue travado
  pelos testes F1-06a a F1-06c, em `tests/init-safety.test.js`.
