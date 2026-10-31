# Spec — Fase U7-F1: Higiene técnica e segurança do CLI e dos scripts

- **Fase:** F1 do roteiro U7 (`specs/fase-u7-roteiro.md`) · **Módulos:** CLI (`src/commands/init.js`, `src/commands/update.js`, `src/lib/manifest.js`, `src/lib/fsx.js`, `package.json`, `eslint.config.js`) + Payload (`templates/skills/image-creator/SKILL.md`, `templates/_opencrew/core/scripts/escritorio/servidor.mjs`, `templates/_opencrew/core/skills.engine.md`, `templates/AGENTS.md`) + CHANGELOG + AGENTS.md + testes · **Status:** aprovada pelo dono em 2026-10-31 (spec, cenários e as quatro decisões da §8, todas como recomendadas); em implementação
- **Versão:** 1.19.4 (patch: reparos, sem recurso novo).
- **Termos novos no GLOSSARIO.md:** não.
- **Modelo sugerido:** execução Opus 5.5 · alto (segurança e escrita no projeto do usuário).
- **Origem:** auditoria técnica independente de 2026-10-31 (Fable 5.1, high) e a triagem da F0. Cada item abaixo foi **conferido no código** em 2026-10-31; o que as auditorias antigas apontavam e já está corrigido ficou de fora (§6).
- **Depende de:** F0 (1.19.3, roteiro). Nada em `update` ainda muda de desenho: isso é a F3.

## 1. Objetivo
Fechar defeitos pequenos e riscos que podem atingir quem já usa o OpenCrew: um servidor local exposto à rede durante a geração de imagens, uma cópia de segurança que vai parar no commit do usuário, escrita através de link simbólico, `init` rodando na pasta pessoal, `update` sem workspace dizendo "ok" ao shell, uma instalação de skill que baixa código de uma branch que muda, e um teste que reprova só por rodar como root.

## 2. O que o código faz hoje (conferido)
| # | Item | Evidência |
|---|---|---|
| 1 | `tests/conserto-bordas.test.js:53-58` (U4a-02b) usa `chmod 444` e espera `CONSERTO:ERRO`; como root vem `CONSERTO:APLICADO`. O U6b-05b já tem o guarda (`limpeza-revisao.test.js:93`). | rodado em 2026-10-31 |
| 2 | `image-creator/SKILL.md:41` roda `python -m http.server 8765` (escuta em todas as interfaces) e usa `http://localhost:8765`; os passos 3 e 6 só têm bash (`&`, `seq`, `pkill`). | linhas 41-56 |
| 3 | `servidor.mjs:10-14`: CSP sem `frame-ancestors`; sem `Referrer-Policy`. (Binding em `127.0.0.1`, `Host`, rotas fixas e `textContent` estão corretos: não mexer.) | leitura |
| 4 | `update.js:144-157`: o AGENTS.md legado vai para `AGENTS.md.bak` na raiz do projeto, fora de `.opencrew-backup/` e do bloco do `.gitignore`. | leitura |
| 5 | `manifest.js:91-110` (`deliverFile`) e `fsx.writeFileSafe` gravam em `dest` sem `lstat`: um link simbólico no lugar do arquivo é seguido. | leitura |
| 6 | `init.js:23` usa `process.cwd()` sem nenhuma proteção: rodar na pasta pessoal ou na raiz do disco instala o workspace ali; dentro de um workspace, cria um segundo. | `grep homedir` vazio |
| 7 | `update.js:37-41`: sem `_opencrew/core`, avisa e **sai com 0**. | leitura |
| 8 | `eslint.config.js:12`: `no-unused-vars` só avisa. Hoje há zero avisos. | `eslint` em 2026-10-31 |
| 9 | `fsx.js`: `ensureDir`, `copyDir`, `deleteDir` não são importados por `src/` nem `bin/`; `@inquirer/confirm` está no `package.json` e não é importado. | `grep` |
| 10 | `skills.engine.md:17,26,215-216`: a instalação remota busca scripts em `…/main/templates/skills` (muda sem aviso) e roda `npm install`/`pip install`. | leitura |
| 11 | `templates/AGENTS.md:79`: `/opencrew reset` "Confirm and reset all configuration" — sem definição em nenhum prompt (`grep`). | leitura |

## 3. Regras
1. **U4a-02b sem root.** O teste ganha o mesmo guarda do U6b-05b (`skip` com motivo "needs POSIX and a user that is not root"). Nenhum comportamento do `conserto.mjs` muda.
2. **`image-creator`.** O servidor escuta só em `127.0.0.1` (`--bind 127.0.0.1`) e a skill usa `http://127.0.0.1:8765` em todo lugar; os passos 3 e 6 ganham a variante PowerShell (`Start-Process`, `Stop-Process`) ao lado do bash, e a skill diz para a IA escolher pelo sistema.
3. **Escritório.** Toda resposta leva `Referrer-Policy: no-referrer` e a CSP passa a terminar em `; frame-ancestors 'none'`. Nenhuma resposta ganha `Access-Control-*`.
4. **Cópia do AGENTS.md legado.** Passa por `backupFile` (cai em `.opencrew-backup/<data>/AGENTS.md`); a mensagem diz o caminho; não sobra `AGENTS.md.bak` na raiz.
5. **Link simbólico.** `deliverFile` e `writeFileSafe` não gravam através de link simbólico: o arquivo do outro lado fica como está, o resultado é `kept` e o resumo diz "link simbólico: não gravei". (No Windows, onde criar link pede permissão, o teste é pulado como os de `scripts-links.test.js`.)
6. **`init` na pasta errada.** (a) Se o alvo é a pasta pessoal do usuário (`os.homedir()`) ou a raiz de um disco, `init` recusa com `UsageError` ("Esta é a sua pasta pessoal (ou a raiz do disco). Entre na pasta do projeto e rode de novo."), antes de qualquer escrita. (b) Se uma pasta acima já tem `_opencrew/core`, `init` **avisa** (uma linha: onde está o workspace e que se quis usá-lo, é lá) e **segue**: não recusa, porque um workspace por cliente dentro de outra pasta pode ser de propósito.
7. **`update` sem workspace** sai com código 1 (a mesma mensagem), também com `--check`.
8. **Lint.** `no-unused-vars` passa a `error` (hoje há zero avisos, então nada quebra).
9. **Código morto.** Saem `ensureDir`, `copyDir`, `deleteDir` de `fsx.js` (e os testes que só existiam por eles) e `@inquirer/confirm` do `package.json` e do `package-lock.json` (`npm ci` continua funcionando). O `AGENTS.md` deixa de citar o `@inquirer/confirm`.
10. **`skills.engine.md` (T-M8).** A instalação de skill passa a: (a) usar primeiro o catálogo já instalado em `skills/` (o `init` e o `update` o copiam); (b) só buscar fora quando a skill não está no catálogo, e então de `…/v<versão instalada>/templates/skills`, nunca de `main`; (c) mostrar a lista exata de pacotes e **perguntar antes** de rodar `npm install`/`pip install`. Nenhuma outra regra do arquivo muda.
11. **`/opencrew reset` (T-B4).** A linha sai de `templates/AGENTS.md`: o comando nunca foi definido e seria destrutivo. Se um dia fizer falta, entra com spec própria.

## 4. Cenários (BDD)
- **U7F1-01a** DADO um usuário root QUANDO `npm test` roda ENTÃO o U4a-02b é pulado com o motivo, e a suíte não reprova por ele; como usuário comum, o teste roda como hoje.
- **U7F1-02a** (contrato) DADA a skill `image-creator` ENTÃO tem `--bind 127.0.0.1`, não tem `localhost:8765`, e traz a variante PowerShell com `Stop-Process`.
- **U7F1-03a** DADO o servidor do Escritório ENTÃO toda resposta (página, script, `/estado`, 404, 405) traz `Referrer-Policy: no-referrer`, a CSP contém `frame-ancestors 'none'` e nenhuma traz `Access-Control-Allow-Origin`.
- **U7F1-04a** DADO um workspace com AGENTS.md legado QUANDO `update` ENTÃO a cópia fica em `.opencrew-backup/<data>/AGENTS.md`, a raiz não ganha `AGENTS.md.bak` e o AGENTS.md vira a ponte fina.
- **U7F1-05a** DADO um link simbólico no lugar de um arquivo do payload QUANDO `update` ENTÃO o arquivo para onde o link aponta fica igual, o resultado é `kept` e o resumo traz a frase do link.
- **U7F1-06a** DADA a pasta pessoal (com `HOME`/`USERPROFILE` apontados para uma pasta temporária, nunca a real) QUANDO `init` ENTÃO `UsageError`, código 1 e nada gravado.
- **U7F1-06b** DADA a raiz do disco (o alvo é injetado: o teste nunca grava lá) ENTÃO `init` recusa pela mesma regra.
- **U7F1-06c** DADA uma pasta dentro de outra com `_opencrew/core` QUANDO `init` ENTÃO uma linha avisa onde está o workspace de cima e o `init` conclui.
- **U7F1-07a** DADA uma pasta sem workspace QUANDO `update` (e `update --check`) ENTÃO a mensagem de hoje e código 1; nada gravado.
- **U7F1-08a** (contrato) DADO `eslint.config.js` ENTÃO `no-unused-vars` é `error`, e `npm run lint` sai 0.
- **U7F1-09a** (contrato) DADO `fsx.js` ENTÃO exporta só o que `src/` usa; DADO o `package.json` ENTÃO não tem `@inquirer/confirm` e `package-lock.json` concorda com ele.
- **U7F1-10a** (contrato) DADO `skills.engine.md` ENTÃO manda usar o catálogo instalado antes de buscar fora, busca pela tag da versão instalada, nunca por `main`, e pede confirmação com a lista de pacotes antes de instalar.
- **U7F1-11a** (contrato) DADO `templates/AGENTS.md` ENTÃO não tem `/opencrew reset`, e nenhum arquivo do payload o cita.
- **U7F1-upg** DADO um workspace 1.19.3 QUANDO `update` ENTÃO `skills/image-creator/SKILL.md`, `_opencrew/core/skills.engine.md`, `_opencrew/core/system.md` e os scripts do Escritório trazem o texto novo, e os arquivos das crews do usuário ficam intactos. O que mora no CLI (`init`, `update`, `fsx`) chega com o pacote novo (`npx @aksp/opencrew@latest`).

## 5. Travas que mudam
- `tests/conserto-bordas.test.js` (U4a-02b): ganha o `skip` por root.
- `tests/update.test.js` **F1-04a e F1-04b** (hoje esperam `AGENTS.md.bak` na raiz): passam a esperar a cópia em `.opencrew-backup/<data>/AGENTS.md`; o F1-04b passa a provar que um `AGENTS.md.bak` que o usuário já tinha na raiz não é tocado.
- `tests/escritorio.test.js` **E1-04i** (trava a CSP exata e "três cabeçalhos"): passa a esperar a CSP com `frame-ancestors 'none'` e o `Referrer-Policy`.
- Testes de `fsx` que cobrem `copyDir`/`deleteDir`/`ensureDir` saem junto com as funções.
- `tests/cli.test.js` **"update --check reports dry-run…"** (travava "sai com 0" no `update --check` sem workspace): passa a esperar 1. Consequência para quem usa `--check` em script: o código 1 já significava "há atualização"; agora também significa "não há workspace aqui" (a mensagem é outra). Quem precisa distinguir lê a mensagem.
- `AGENTS.md`: a linha do `@inquirer/confirm` na seção Stack e a tabela de travas da regra 14 ganham `upgrade-u7f1`.
- Tetos de linhas: `skills.engine.md` (494) não pode passar de 500; `templates/AGENTS.md` só diminui.

## 6. Fora do escopo (e já corrigido)
- **Já estava corrigido no código de hoje** (as auditorias antigas ainda os citam): `-y` atropelando `--ide` (C-11: `resolveIdes` lê `--ide` primeiro), pilha de erro em falha parcial (C-21: `reportError` só mostra a pilha com `OPENCREW_DEBUG`), `init minha-pasta` ignorando o argumento (agora é `UsageError`), lint sem `bin/` (`LINT_DIRS` já inclui).
- **T-M1 e T-A1** (segredos digitados no chat gravados em texto puro em `.claude/settings.local.json`; MCP verificado num arquivo que o Playwright do `.mcp.json` não usa): pedem pesquisa do que cada IDE lê e mudam o desenho das skills de MCP; o `.gitignore` já cobre o arquivo desde a 1.4.2. **Passam para a F8** (roteiro atualizado no mesmo commit desta spec).
- O servidor do Escritório além do cabeçalho; `HEAD` recebendo 405; a sonda de portas; mudar o formato de `/estado`.
- `update` remover arquivo que saiu do payload e `init` sobre workspace sem carimbo: F3.

## 7. Conferência que o `npm run verify` não cobre (regra 7)
- Uma geração de imagem real com a `image-creator` no Windows (PowerShell) e no macOS/Linux (bash): o servidor sobe só em `127.0.0.1`, o Playwright abre `http://127.0.0.1:8765/…` e o servidor é encerrado no fim. **Conferência do dono** (o ambiente de testes não tem navegador de produção).
- Um `update` real num projeto do dono (cópia dele, nunca o original) e o `init` numa pasta temporária.

## 8. Decisões do dono (2026-10-31, todas como recomendadas)
1. **Spec e cenários aprovados** (⏸).
2. **U0, a jornada de referência** (`docs/jornada/medicoes.md`, sem linha desde a 1.6.0): **declarada encerrada**. A conferência de cada fase passa a ser a simulação ou a execução real descrita na spec dela.
3. **Regra 6(b):** `init` dentro de um workspace só **avisa**.
4. **Regra 11:** `/opencrew reset` **sai** da lista.
