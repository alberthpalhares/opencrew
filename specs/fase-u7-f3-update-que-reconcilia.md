# Spec — Fase U7-F3: `update` que reconcilia

- **Fase:** F3 do roteiro U7 (`specs/fase-u7-roteiro.md`) · **Módulos:** CLI (`src/commands/update.js`, `src/commands/init.js`, `src/lib/manifest.js`, `src/lib/blocos.js`, `src/lib/mcp.js`, `src/lib/legado.js`, `src/lib/migrations.js`, `src/lib/resumo.js`, novo `src/lib/reconciliar.js`) + testes + CHANGELOG + AGENTS.md + GLOSSARIO.md + IDEIAS.md · **Status:** aprovada pelo dono em 2026-11-01 (spec e as decisões da §8, todas como recomendadas) e **revisada no mesmo dia** depois de uma revisão independente (Fable 5.1, high), com os quatro ajustes de escopo aprovados (§2); implementada (1.20.0), aguardando segunda revisão independente, merge e Release
- **Versão:** 1.20.0 (minor: o `update` passa a **apagar** arquivo que saiu do pacote e a **renovar** arquivo que antes ficava para sempre na versão velha).
- **Termos novos no GLOSSARIO.md:** "Arquivo órfão" (arquivo que o OpenCrew entregou numa versão e que o pacote novo não traz mais).
- **Modelo sugerido:** execução Opus 5.5 · alto (regras 3 e 14: o `update` mexe no projeto do usuário; duas revisões independentes).
- **Origem:** auditoria técnica independente de 2026-10-31 (itens 7.1 e 7.2) e a triagem da F0 (C-27, H3-11, T-M9). Cada problema abaixo foi **reproduzido em 2026-11-01** numa pasta temporária, com o código da 1.19.5.
- **Depende de:** F1 (1.19.4) e F2 (1.19.5), publicadas. É pré-requisito da F4 (dividir prompts renomeia arquivos) e da F10 (reescrever os agentes-base).
- **Fato que mede o risco:** `git log --diff-filter=D,R -- templates` está **vazio**: nenhum arquivo do payload foi removido ou renomeado em toda a história. Hoje nenhum projeto tem órfão; a F3 é a fundação para as fases que vão renomear arquivos, e **não apaga nada em projeto real por enquanto**.

## 1. Objetivo
Fazer o `update` deixar o projeto igual ao que a versão nova entregaria, sem tocar no que é do usuário: tirar o que o pacote não traz mais, levar a melhoria ao arquivo que o usuário não editou, respeitar a skill que ele desinstalou, e não carimbar a versão nova sobre arquivos velhos.

## 2. Mudanças de escopo depois da revisão independente (aprovadas em 2026-11-01)
1. **A porta única de escrita sai para uma F3b** (nove pontos em seis módulos, com semântica própria de pasta-link e `realpath` no Windows). Na F3 ficam: o `isLink` do destino em todos os escritores que ainda não o têm, e a checagem de **pasta-link onde se apaga** (órfãos).
2. **`update --check` lista** o que seria removido e as skills desinstaladas, sem apagar nem copiar nada.
3. **Skill desinstalada** é a que **não tem pasta**; pasta sem `SKILL.md` é recriada.
4. **`init` delegado ao `update` ignora `--ide/--all/--yes`** e diz como criar a ponte de uma IDE nova.

## 3. O que o código faz hoje (reproduzido)
| # | Problema | Como reproduzi | Causa no código |
|---|---|---|---|
| 1 | **Arquivo que saiu do pacote fica para sempre.** | `init`, um arquivo extra em `_opencrew/core/prompts/` com entrada no `manifest.json`, `update`: continua lá. | `refreshFramework` (`update.js`) só grava; nada compara o manifesto com o pacote. |
| 2 | **Agente-base não editado nunca recebe a melhoria (H3-11)** e a entrada dele **some do manifesto**. | `init`, `agents/copywriter.agent.md` com texto antigo e o hash dele no manifesto, `update`: o arquivo fica velho e a entrada some. | `agents/`, `config/`, `_investigations/` entram com `overwrite: false`; `deliverFile` devolve `kept` sem registrar; `writeManifest` regrava só o que foi registrado. |
| 3 | **Skill desinstalada volta no próximo `update` (T-M9).** | `init`, apagar `skills/canva/`, `update`: volta. | `deliverTree(tpl('skills'), …, { overwrite: true })` recria o que falta. A Operação 4 do `skills.engine.md` apaga a pasta e não deixa rastro. |
| 4 | **`init` sobre workspace sem carimbo mistura versões.** | `init`, um arquivo velho em `_opencrew/core/`, apagar `.opencrew-version`, `init`: o velho fica e o carimbo vira o novo. | `workspaceState` lê "sem carimbo" como instalação interrompida e retoma sem sobrescrever; o `update` recusa o mesmo workspace. Cada um manda para o outro. |
| 5 | **Escrita através de link simbólico** fora do `deliverFile`: `deliverBlock`, `mcp.js`, `writeManifest`, o carimbo, `legado.js`. | Revisão da F1 e leitura. | `exists` + `fs.writeFile` direto. |

**Já resolvido, fora desta fase:** o "marcador de fim apagado gera bloco duplicado e mistura LF/CRLF" (C-26): `deliverBlock` trata o marcador órfão e escreve no fim de linha do arquivo; coberto por `tests/update-u3a2.test.js` (U3a-12i-f2).

## 4. Regras
1. **Arquivo órfão (C-27).** Depois de entregar, o `update` compara o `manifest.json` anterior com o que o pacote novo trouxe. Candidato a órfão é o caminho do manifesto que:
   - está sob `_opencrew/core/`, `_opencrew/agents/`, `_opencrew/config/` ou `skills/` (nada fora desses quatro prefixos: `crews/`, `_opencrew/_memory/`, `.env*`, `.claude/` e o resto são do usuário; e **`skills/.custom/` nunca**);
   - depois de normalizado continua sob o prefixo, não é absoluto e não tem `\`, `:` nem segmento `..` (chave estranha é ignorada: nem órfão, nem erro);
   - o pacote novo não entrega.
   Sem manifesto (≤ 1.5.0) ou com manifesto ilegível: nenhum órfão é tocado. Arquivo da entrada que já não existe: a entrada sai em silêncio.
   - **Não editado** (o hash é o do manifesto; CRLF/LF não conta): na ordem **link? → hash → cópia em `.opencrew-backup/<data>/` → remoção**. Link simbólico nunca é seguido, copiado nem apagado, e **a pasta do arquivo também não pode ser um link nem apontar para fora do projeto** (comparação do caminho real, com `path.relative`, como o `comum.mjs` dos scripts). Pasta que ficar vazia sai (`rmdir` não recursivo, nunca acima do prefixo, nunca o prefixo em si; só `skills/<nome>/`).
   - **Editado** (ou ilegível por EISDIR, EACCES, EPERM): fica onde está, sai do manifesto (passa a ser do usuário) e o resumo avisa. Nunca lança erro.
2. **Arquivo não editado recebe a melhoria (H3-11).** Em `_opencrew/agents/` e `_opencrew/config/`, se o arquivo existe, o pacote traz outro texto e o hash dele é o **registrado no manifesto**, o `update` o substitui (sem cópia) e o registra. Se o usuário editou, fica **e a entrada anterior continua no manifesto**. **Sem entrada no manifesto, o arquivo fica e continua sem registro: o CLI nunca registra o hash de um arquivo que não entregou** (senão a edição do usuário viraria "não editado" no update seguinte). `crews/` nunca é renovado.
3. **Skill desinstalada não volta (T-M9).** Está desinstalada a skill cujos arquivos o manifesto conhece e cuja **pasta `skills/<nome>/` não existe** (ou está sem arquivos). O `update` não recria nada dela, **mantém as entradas no manifesto** e o resumo diz "Skill desinstalada, não recriei: <nomes>. Para reinstalar: peça `/opencrew` → skills → instalar." Se a pasta existe sem `SKILL.md`, o `SKILL.md` é recriado como hoje. Se o pacote novo **não entrega mais** a skill, vale "órfão" (as entradas saem). Skill nova do pacote (sem entrada) é criada como hoje. Skill renomeada pelo usuário é só mais uma skill dele.
4. **`init` sem carimbo, com registro.** Se `_opencrew/core` existe, o carimbo falta e há `manifest.json` legível, o `init` diz "O carimbo da versão sumiu; refazendo como atualização. Para a ponte de uma IDE nova: `init --repair-bridges --ide=<id>`" e segue o `update` **sem** as opções do `init`. O `update`, sem carimbo, usa `manifest.version` como a instalada (`carimbo ?? manifest.version ?? null`; sem os dois, `INTERRUPTED` como hoje); a trava de versão mais nova continua valendo. Sem carimbo e sem manifesto: como hoje.
5. **Escrita e link (parte da F3).** Todo escritor do CLI que ainda não olha o destino (`deliverBlock`, `mcp.js`, `writeManifest`, o carimbo, `legado.js`, `writeFileSafe` da ponte legada) não grava quando o **destino** é link simbólico, com o aviso "link simbólico: não gravei …" (`ctx.links`). A checagem de **pasta-link** é obrigatória só onde se apaga (regra 1). A porta única de escrita é a F3b.
6. **`update --check`** (e `--dry-run`) lista o que seria removido (e o que ficaria por estar editado) e as skills desinstaladas, **sem apagar, copiar nem gravar nada** (a árvore do projeto é igual antes e depois).
7. **O resumo diz o que foi feito**, em PT-BR com acentos: os arquivos removidos (com teto de linhas, como as cópias) e a pasta da cópia; os órfãos editados que ficaram; as skills desinstaladas; o carimbo refeito. `removeOrphans` roda **antes** do resumo.

## 5. Cenários (BDD)
- **U7F3-01a** DADO um arquivo de `_opencrew/core/` que o manifesto conhece e o pacote novo não traz, não editado, QUANDO `update` ENTÃO ele some, a cópia está em `.opencrew-backup/<data>/` e o resumo cita o arquivo.
- **U7F3-01b** DADO o mesmo arquivo **editado** ENTÃO ele continua, sai do manifesto e o resumo avisa.
- **U7F3-01c** DADOS um arquivo de `crews/`, um de `_opencrew/_memory/`, um `.env`, um de `skills/.custom/` e um qualquer do usuário, todos com entrada forjada no manifesto, QUANDO `update` ENTÃO nenhum é tocado.
- **U7F3-01d** DADO um órfão que é link simbólico para fora do projeto ENTÃO o link e o alvo ficam como estão e nada é copiado. DADO manifesto ausente ou ilegível ENTÃO nenhum órfão é removido.
- **U7F3-01e** DADA uma pasta que fica vazia depois da remoção ENTÃO ela sai; uma pasta com arquivo do usuário (inclusive oculto) não sai; `_opencrew/core` e `skills` em si nunca saem.
- **U7F3-01f** DADA a **pasta do caminho** do órfão que é um link para fora do projeto (`_opencrew/core` → fora) ENTÃO nada é apagado nem copiado do outro lado. (Pulado onde não dá para criar link.)
- **U7F3-01g** DADA uma chave do manifesto com `..`, absoluta, com `\` ou `:` ENTÃO é ignorada: o arquivo que ela aponta fora do prefixo (um `.env` na raiz) fica, e nada vai para fora de `.opencrew-backup/`.
- **U7F3-01h** DADO o `update` rodado **duas vezes seguidas** ENTÃO o segundo não remove nem avisa nada novo e o manifesto fica igual. DADO um manifesto que lista um arquivo que já não existe (um `update` interrompido) ENTÃO a entrada sai em silêncio. DADA uma pasta no lugar de um arquivo do manifesto (EISDIR) ENTÃO o `update` conclui e avisa.
- **U7F3-02a** DADO `_opencrew/agents/x.agent.md` não editado (hash do manifesto) e com texto antigo QUANDO `update` ENTÃO recebe o texto novo, sem cópia, e fica no manifesto com o hash novo.
- **U7F3-02b** DADO o mesmo arquivo **editado** ENTÃO fica como está **e a entrada continua no manifesto** (hash anterior).
- **U7F3-02c** DADO um modelo em `crews/` com texto antigo e não editado ENTÃO continua como está.
- **U7F3-02d** DADO um arquivo de `agents/` **sem entrada no manifesto** (workspace antigo) e com texto diferente do pacote ENTÃO fica como está e **continua sem entrada** (o segundo `update` também o deixa).
- **U7F3-03a** DADA a skill `canva` desinstalada (pasta apagada, entradas no manifesto) QUANDO `update` ENTÃO a pasta **não** volta, as entradas ficam e o resumo diz "Skill desinstalada, não recriei: canva", **também no segundo `update`**.
- **U7F3-03b** DADA uma skill instalada com a pasta mas sem `SKILL.md`, ou com um arquivo solto apagado ENTÃO os arquivos são recriados. DADA uma skill nova no pacote (sem entrada) ENTÃO é criada. DADA uma skill que o pacote não entrega mais E está desinstalada ENTÃO as entradas saem.
- **U7F3-04a** DADO workspace completo sem `.opencrew-version`, com manifesto legível, QUANDO `init` ENTÃO uma linha diz que refaz como atualização e como criar a ponte de IDE nova, o arquivo velho de `_opencrew/core/` é renovado e o carimbo é o da versão nova.
- **U7F3-04b** DADO o mesmo workspace QUANDO `update` ENTÃO usa a versão do manifesto, renova e grava o carimbo; manifesto com versão **mais nova** que o pacote ENTÃO recusa; sem manifesto e sem carimbo, continua pedindo o `init`; manifesto sem `version` ENTÃO `INTERRUPTED`.
- **U7F3-05a** DADO um link simbólico no lugar de `AGENTS.md`, `.gitignore`, `.mcp.json`, `manifest.json` ou `.opencrew-version` ENTÃO nada é gravado através dele e o resumo diz "link simbólico: não gravei …". (Pulado onde não dá para criar link.)
- **U7F3-06a** DADO `update --check` (e `--dry-run`) com um órfão e uma skill desinstalada ENTÃO a saída os lista e a árvore do projeto é igual antes e depois (inclusive sem `.opencrew-backup/`).
- **U7F3-06b** (contrato) DADO `resumo.js` ENTÃO as linhas novas existem em PT-BR, e uma `.opencrew-backup/` já existente de outra data não atrapalha.
- **U7F3-upg** DADO um workspace 1.19.5 com um órfão não editado, um agente-base não editado com texto antigo, uma skill desinstalada e o carimbo de uma versão antiga QUANDO `update` ENTÃO o órfão sai (com cópia), o agente-base é renovado, a skill não volta, a crew do usuário fica intacta e o manifesto novo é consistente.

## 6. Travas que mudam
- A revisão independente não achou teste antigo que fixe o comportamento de hoje ("a entrada some", "update sem carimbo recusa" sem manifesto): os casos sem manifesto continuam valendo, e os novos fixam os dois lados. Se a implementação quebrar algum, o motivo entra aqui.
- `AGENTS.md`: regra 3 (o `update` remove órfão não editado, com cópia, e nunca toca `crews/`, `_memory/`, `.env*`) e regra 14 (`tests/upgrade-u7f3.test.js`).
- Teto: `init.js` fica em até 200 linhas (mover `normalizeIdes`/`tpl` para um módulo); a lógica nova mora em `src/lib/reconciliar.js`.

## 7. Fora do escopo
- **A porta única de escrita** (`escrever`, pasta-link em todos os escritores, `crews/` como link do usuário que não pode virar erro): **F3b**, com spec própria.
- Renovar `crews/`; um comando `uninstall`; desfazer o `update` (a cópia em `.opencrew-backup/` é manual); mudar o formato do `manifest.json`.
- A F4 (dividir prompts) e a F10 (agentes-base): só dependem desta fase.

## 8. Conferência que o `npm run verify` não cobre (regra 7)
Um `update` real, com o pacote desta versão, numa **cópia** de um projeto do dono que já use o OpenCrew (nunca o original): primeiro `update --check`, depois `update`; conferir o resumo, que nada de `crews/` e `_memory/` mudou (`diff -r` antes e depois, ignorando `.opencrew-backup/`) e que o que foi removido está na pasta de cópia. **Conferência do dono.** Como hoje não há órfão histórico, a prova de que a remoção funciona é o `tests/upgrade-u7f3.test.js` e os cenários acima.

## 9. Decisões do dono (2026-11-01, todas como recomendadas)
1. **Spec e cenários aprovados** (⏸); os quatro ajustes da §2, aprovados com o plano revisado.
2. **Órfão que o usuário editou:** fica onde está e avisa. **Órfão não editado:** sai com cópia.
3. **H3-11 só em `agents/` e `config/`.**
4. **Skill desinstalada não volta.**
5. **`update` e `init` sem carimbo e com registro seguem como atualização.**
6. **Versão 1.20.0.**
