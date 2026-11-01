# Spec — Fase U7-F3: `update` que reconcilia

- **Fase:** F3 do roteiro U7 (`specs/fase-u7-roteiro.md`) · **Módulos:** CLI (`src/commands/update.js`, `src/commands/init.js`, `src/lib/manifest.js`, `src/lib/blocos.js`, `src/lib/mcp.js`, `src/lib/fsx.js`, `src/lib/migrations.js`, `src/lib/resumo.js`) + testes + CHANGELOG + AGENTS.md + IDEIAS.md · **Status:** rascunho — aguardando aprovação do dono (regra 1: SPEC ⏸ → BDD ⏸)
- **Versão:** 1.20.0 (minor: o `update` passa a **apagar** arquivo que saiu do pacote e a **renovar** arquivo que antes ficava para sempre na versão velha).
- **Termos novos no GLOSSARIO.md:** "Arquivo órfão" (arquivo que o OpenCrew entregou numa versão e que o pacote novo não traz mais).
- **Modelo sugerido:** execução Opus 5.5 · alto (regras 3 e 14: o `update` mexe no projeto do usuário; revisão independente obrigatória).
- **Origem:** auditoria técnica independente de 2026-10-31 (itens 7.1 e 7.2) e a triagem da F0 (C-27, H3-11, T-M9). Cada problema abaixo foi **reproduzido em 2026-11-01** numa pasta temporária, com o código da 1.19.5.
- **Depende de:** F1 (1.19.4) e F2 (1.19.5), publicadas. É pré-requisito da F4 (dividir prompts renomeia arquivos) e da F10 (reescrever os agentes-base).

## 1. Objetivo
Fazer o `update` deixar o projeto igual ao que a versão nova entregaria, sem tocar no que é do usuário: tirar o que o pacote não traz mais, levar a melhoria ao arquivo que o usuário não editou, respeitar a skill que ele desinstalou, e não carimbar a versão nova sobre arquivos velhos.

## 2. O que o código faz hoje (reproduzido)
| # | Problema | Como reproduzi | Causa no código |
|---|---|---|---|
| 1 | **Arquivo que saiu do pacote fica para sempre.** Um prompt renomeado ou removido numa versão nova continua em `_opencrew/core/` e a IA pode carregá-lo. | `init`, um arquivo extra em `_opencrew/core/prompts/` com a entrada dele no `manifest.json`, `update`: o arquivo continua lá (`(a) … true`). | `refreshFramework` (`update.js:111-121`) só grava; nada compara o manifesto com o pacote. |
| 2 | **Agente-base não editado nunca recebe a melhoria (H3-11).** | `init`, um `agents/copywriter.agent.md` com o texto de uma versão anterior e o hash dele no manifesto (nada editado pelo usuário), `update`: o arquivo continua velho **e a entrada some do manifesto** (`(c) false`, `false`). | `agents/`, `config/`, `_investigations/` entram com `overwrite: false` (`update.js:118`); `deliverFile` (`manifest.js:98-115`) devolve `kept` sem registrar o arquivo; `writeManifest` regrava a lista só com o que foi registrado. Depois do primeiro `update`, o arquivo deixa de ser rastreado. |
| 3 | **Skill desinstalada volta no próximo `update` (T-M9).** | `init`, apagar `skills/canva/`, `update`: a pasta volta (`(d) true`). | `deliverTree(tpl('skills'), …, { overwrite: true })` recria tudo que falta (`update.js:115`). O `skills.engine.md` (Operação 4) apaga a pasta e não deixa rastro. |
| 4 | **`init` sobre workspace completo sem carimbo mistura versões.** | `init`, um arquivo velho em `_opencrew/core/`, apagar `.opencrew-version`, `init` de novo: o arquivo velho fica e o carimbo vira a versão nova (`(b) true`, `1.19.5`). | `workspaceState` (`init.js:150-153`) lê "sem carimbo" como instalação interrompida e retoma com `overwrite: false`; o `update` recusa o mesmo workspace ("rode init", `update.js:44-49`). Cada um manda para o outro. |
| 5 | **A escrita através de link simbólico ainda existe fora do `deliverFile`.** `deliverBlock` (`blocos.js:103-114`), `mcp.js:31,105`, `writeManifest`, o carimbo, e uma **pasta** que é link (`_opencrew/core` → fora). | Revisão independente da F1 (confirmada na leitura); registrada no `IDEIAS.md` → F3. | `exists` + `fs.writeFile` direto, sem olhar o link. |

**Já resolvido, fora desta fase:** o "marcador de fim apagado gera bloco duplicado e mistura LF/CRLF" (C-26 da auditoria antiga): o `deliverBlock` trata o marcador órfão (copia o arquivo, devolve o bloco inteiro) e escreve no fim de linha do arquivo (`blocos.js:60-77`); está coberto por `tests/update-u3a2.test.js` (U3a-12i-f2).

## 3. Regras
1. **Arquivo órfão (C-27).** Depois de entregar, o `update` compara o `manifest.json` anterior com o que o pacote novo traz. É órfão o caminho que está no manifesto, **sob `_opencrew/core/`, `_opencrew/agents/`, `_opencrew/config/` ou `skills/`**, e que o pacote novo não entrega. Nada fora desses quatro prefixos é órfão: `crews/`, `_opencrew/_memory/`, `.env*`, `.claude/` e o resto são do usuário. Sem manifesto (versões ≤ 1.5.0) ou com manifesto ilegível: nenhum órfão é tocado.
   - **Órfão que o usuário não editou** (o hash do arquivo é o do manifesto; CRLF/LF não conta): é removido, **com cópia em `.opencrew-backup/<data>/`**, e a pasta que ficar vazia sai junto.
   - **Órfão que o usuário editou**: **fica onde está**, sai do manifesto (passa a ser dele) e o resumo avisa quais são.
   - Link simbólico nunca é seguido nem apagado; o caminho precisa ficar dentro do projeto.
2. **Arquivo não editado recebe a melhoria (H3-11).** Em `_opencrew/agents/` e `_opencrew/config/`, se o arquivo existe, o pacote novo traz outro texto e o hash do arquivo é o **registrado no manifesto** (o usuário não editou), o `update` o substitui (sem cópia: nada do usuário se perde) e o registra. Se o usuário editou, o arquivo fica como está **e a entrada dele continua no manifesto** (hoje some). `crews/` fica como está: nunca é renovado (são modelos que o usuário pode estar usando).
3. **Skill desinstalada não volta (T-M9).** Uma skill está desinstalada quando o manifesto tem arquivos de `skills/<nome>/` e `skills/<nome>/SKILL.md` **não existe**. O `update` não recria nenhum arquivo dela, mantém as entradas no manifesto e o resumo diz "Skill desinstalada, não recriei: <nomes>". Falta de um arquivo solto numa skill instalada (com `SKILL.md`) continua sendo recriada. Skill nova do pacote (sem entrada no manifesto) é criada como hoje. Para reinstalar, vale a Operação 1 do `skills.engine.md`.
4. **`init` sem carimbo, com registro.** Se `_opencrew/core` existe, o carimbo falta e há `manifest.json` legível, o `init` **não retoma como instalação nova**: diz "O carimbo da versão sumiu; refazendo como atualização" e segue o caminho do `update`. O `update`, sem carimbo e com manifesto legível, **usa a versão do manifesto como a instalada** (em vez de recusar) e grava o carimbo no fim. Sem carimbo **e** sem manifesto continua como hoje (instalação interrompida: o `init` retoma, o `update` pede o `init`).
5. **Uma só porta de escrita no projeto.** Toda escrita do CLI dentro do projeto (arquivos, blocos, `.mcp.json`, manifesto, carimbo, cópias de segurança) passa por uma função de `fsx.js` que **não grava quando o destino é um link simbólico ou quando uma pasta do caminho, dentro do projeto, é um link** (compara o caminho real da pasta com o do projeto). O resultado é o `kept` de hoje, com o aviso "link simbólico: não gravei …" (`ctx.links`, da F1).
6. **O resumo diz o que foi feito**: uma linha para os órfãos removidos (com o nome da pasta da cópia), uma para os editados que ficaram, uma para as skills desinstaladas, uma para o carimbo refeito. Em PT-BR, com acentos.

## 4. Cenários (BDD)
- **U7F3-01a** DADO um arquivo de `_opencrew/core/` que o manifesto conhece e o pacote novo não traz, não editado, QUANDO `update` ENTÃO ele some, a cópia está em `.opencrew-backup/<data>/` e o resumo cita o arquivo.
- **U7F3-01b** DADO o mesmo arquivo **editado** ENTÃO ele continua, sai do manifesto e o resumo avisa.
- **U7F3-01c** DADOS um arquivo de `crews/`, um de `_opencrew/_memory/`, um `.env` e um arquivo qualquer do usuário com entrada no manifesto QUANDO `update` ENTÃO nenhum é tocado.
- **U7F3-01d** DADO um órfão que é link simbólico para fora do projeto ENTÃO o link e o alvo ficam como estão. DADO manifesto ausente ou ilegível ENTÃO nenhum órfão é removido.
- **U7F3-01e** DADA uma pasta que fica vazia depois da remoção ENTÃO ela sai; uma pasta com arquivo do usuário não sai.
- **U7F3-02a** DADO `_opencrew/agents/x.agent.md` não editado (hash do manifesto) e com texto antigo QUANDO `update` ENTÃO recebe o texto novo, sem cópia, e fica no manifesto com o hash novo.
- **U7F3-02b** DADO o mesmo arquivo **editado** ENTÃO fica como está **e a entrada continua no manifesto** (hash anterior).
- **U7F3-02c** DADO um modelo em `crews/` com texto antigo e não editado ENTÃO continua como está.
- **U7F3-03a** DADA a skill `canva` desinstalada (pasta apagada, entradas no manifesto) QUANDO `update` ENTÃO a pasta **não** volta, as entradas ficam no manifesto e o resumo diz "Skill desinstalada, não recriei: canva".
- **U7F3-03b** DADA uma skill instalada com um arquivo solto apagado ENTÃO o arquivo é recriado. DADA uma skill nova no pacote (sem entrada no manifesto) ENTÃO é criada.
- **U7F3-04a** DADO workspace completo sem `.opencrew-version`, com manifesto legível, QUANDO `init` ENTÃO uma linha diz que refaz como atualização, o arquivo velho de `_opencrew/core/` é renovado (com cópia, se editado) e o carimbo é o da versão nova.
- **U7F3-04b** DADO o mesmo workspace QUANDO `update` ENTÃO usa a versão do manifesto, renova e grava o carimbo; sem manifesto, continua pedindo o `init`.
- **U7F3-05a** DADO um link simbólico no lugar de `AGENTS.md`/`.gitignore`/`.mcp.json`/`manifest.json`/`.opencrew-version` ENTÃO nada é gravado através dele e o resumo diz "link simbólico: não gravei …".
- **U7F3-05b** DADA `_opencrew/core` que é um link para fora ENTÃO nada é gravado do outro lado. (Teste pulado onde não dá para criar link.)
- **U7F3-06a** (contrato) DADO `resumo.js` ENTÃO as quatro linhas novas existem em PT-BR.
- **U7F3-upg** DADO um workspace 1.19.5 com um órfão não editado, um agente-base não editado com texto antigo, uma skill desinstalada e o carimbo de uma versão antiga QUANDO `update` ENTÃO o órfão sai (com cópia), o agente-base é renovado, a skill não volta, a crew do usuário fica intacta e o manifesto novo é consistente (`npm ci` não é necessário: o teste lê o JSON).

## 5. Travas que mudam
- Testes que fixam que `agents/`, `config/` ficam "só o que falta" **sem distinguir arquivo editado de não editado** (conferir em `tests/update*.test.js`, `tests/r2-*.test.js`, `tests/upgrade*.test.js`) passam a distinguir; o caso "editado fica como está" continua valendo.
- Testes que fixam "`update` sem carimbo recusa" (`INTERRUPTED`) passam a cobrir os dois casos (com e sem manifesto).
- `AGENTS.md`: regra 3 (acrescentar que o `update` remove órfão não editado, com cópia) e a regra 14 (acrescentar `tests/upgrade-u7f3.test.js`).
- Teto: `update.js` (156 linhas), `manifest.js` (136) e `init.js` (198) estão perto dos 200: a lógica nova mora num módulo novo (`src/lib/reconciliar.js`) para não passar do alvo.

## 6. Fora do escopo
- **`crews/` renovado.** Modelos de crew continuam intocados.
- Arquivos do usuário que ele mesmo registrou no manifesto (o manifesto só guarda o que o CLI entregou).
- Desfazer o `update` (a cópia em `.opencrew-backup/` é manual) e um comando `uninstall`.
- O formato do `manifest.json` não muda (lista de caminho → hash); o que a F3 muda é como ele é usado.
- A F4 (dividir prompts) e a F10 (agentes-base): só dependem desta fase.

## 7. Conferência que o `npm run verify` não cobre (regra 7)
Um `update` real, com o pacote desta versão, numa **cópia** de um projeto do dono que já use o OpenCrew (nunca o original): conferir o resumo, que nada de `crews/` e `_memory/` mudou (`diff -r` antes e depois, ignorando `.opencrew-backup/`) e que o que foi removido está na pasta de cópia. **Conferência do dono.** A suíte roda no CI do Windows e do Linux, que cobre os caminhos.

## 8. Decisões pedidas ao dono
1. **Aprovar esta spec e os cenários** (⏸).
2. **Órfão que o usuário editou:** deixar onde está e avisar (recomendado) — ou fazer a cópia e apagar também? Recomendo deixar: a regra 3 diz que arquivo editado não se destrói.
3. **Órfão não editado:** remover **com cópia** (recomendado) — ou remover sem cópia? A cópia é barata e desfaz o erro.
4. **H3-11 só em `agents/` e `config/`** (recomendado, `crews/` fica de fora) — ou também renovar os modelos de `crews/` não editados?
5. **Skill desinstalada não volta** (recomendado). A alternativa é manter o comportamento de hoje (volta sempre).
6. **`update` sem carimbo e com registro segue em frente** (recomendado) — ou continua exigindo o `init`?
7. **Versão 1.20.0** (minor) por apagar arquivo do projeto — ou 1.19.6?
