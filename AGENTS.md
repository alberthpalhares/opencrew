# AGENTS.md — OpenCrew (desenvolvimento)

> Regras para QUALQUER agente/IDE que trabalhe **no código do OpenCrew**. Fonte única:
> não duplique estas regras. `CLAUDE.md` só aponta para cá.
>
> ⚠️ Este arquivo NÃO é o runtime do produto. O runtime que vai para o usuário vive em
> `templates/AGENTS.md` (instalado como `_opencrew/core/system.md`). Para **usar** o
> OpenCrew neste repo, trabalhe em `sandbox/` (veja "Dogfood" abaixo).

## Antes de tocar em qualquer coisa
1. `STATUS.md` — onde paramos (local, fora do git).
2. Este `AGENTS.md` (se a IDE já o carregou, não releia).
3. `GLOSSARIO.md` — linguagem do domínio.
4. A spec da fase atual em `specs/` e o relatório em `docs/auditoria/`.

## O que é este projeto
CLI npm (`@aksp/opencrew`) que instala num projeto do usuário um sistema de crews de
agentes de IA (prompts, best-practices, skills) e as pontes para 9 IDEs.
Classificação project-standards: **T3** (DDD + SDD + BDD + TDD).

Duas camadas com regras diferentes:
- **CLI** (`bin/`, `src/`) — código Node que escreve no projeto do usuário.
- **Payload** (`templates/`) — prompts e skills que a IA do usuário executa.

## Stack
Node.js ≥ 20.17 (ESM; os scripts do payload usam só APIs do Node 20.0) · deps: `@inquirer/checkbox` (+ `@inquirer/confirm`, sem uso em `src/`;
remoção: C-22 da auditoria de 2026-10-02 → U5) · testes: `node:test` · lint: ESLint 9 ·
CI: GitHub Actions (Ubuntu + Windows, Node 20.17/22) · publish: tag `v*` → npm, só depois da
matriz do CI verde (o `publish.yml` chama o `ci.yml`).

## Regras inegociáveis
(IDs estáveis: regra nova entra no fim; nunca renumerar.)

### 1. Ciclo de trabalho
SPEC ⏸ → BDD ⏸ → TESTE (falha) → CÓDIGO → LIMPEZA → `npm run verify` → REGISTRA.
⏸ = parar e aguardar aprovação do dono. Specs em `specs/`, cenários com ID; cada cenário
gera ≥ 1 teste com o mesmo ID no nome.

### 2. Payload sem conteúdo do mantenedor
Nada em `templates/` ou nas pontes de `src/lib/ides.js` pode citar o fluxo pessoal do
mantenedor (STATUS.md, skills `/status`, `/ideias`, caminhos locais). O payload vai para
o projeto de cada usuário. **Trava:** `tests/ides.test.js` + `tests/package.test.js`.

### 3. Não destruir dado do usuário
`init` e `update` nunca sobrescrevem, sem backup ou confirmação, arquivo que o usuário
possa ter editado (`crews/`, `_opencrew/_memory/`, `.env*`, `.gitignore`, `.mcp.json`,
`CLAUDE.md`/`AGENTS.md`/`GEMINI.md`). Arquivo compartilhado recebe **bloco marcado**
(`opencrew:start/end`). **Trava:** `tests/init.test.js`, `tests/init-safety.test.js`, `tests/init-repair.test.js`,
`tests/update.test.js`, `tests/update-u2.test.js`, `tests/update-u3a2.test.js`.

### 4. Referências do payload existem
Todo caminho de `_opencrew/...` ou `skills/<x>/...` citado num prompt existe em
`templates/`. **Trava:** `tests/template-refs.test.js`.

### 5. O pacote publicado é o que a doc promete
O que o README diz que é instalado está no tarball; segredo, log e arquivo local não
estão. **Trava:** `tests/package.test.js` (sobre `npm pack --dry-run --json`).

### 6. Tamanho de arquivo — alerta, não bloqueio
Alvos: `src/` e `scripts/` 200 · `tests/` 300 · prompts de `templates/_opencrew/core/` 400
linhas (orçamento de tokens) · função 20 linhas/3 args/2 níveis.
Faixas: aviso 100–110% · atenção 110–130% · alto 130–150% · crítico >150%.
Exceção: `templates/skills/opencrew-skill-creator/` (código de terceiros adaptado).
**Trava:** `scripts/check-size.js` (sai sempre com 0).

### 7. Verificação antes de dizer "pronto"
`npm run verify` — lint, testes, version-sync, alerta de tamanho, conteúdo do pacote. Sai
diferente de zero se qualquer passo reprovar. O CI e o publish chamam o mesmo comando.
**Não cobre:** a execução real dos prompts por uma IA (conferir no `sandbox/`), o publish
real no npm, a aparência do escritório no navegador. Nem abrir o `.docx` no Word: se abre sem
aviso de reparo e como fica na página é conferência do dono.

### 8. Versão e release
Nunca editar `version` à mão: `npm version <bump>` (carimba `.opencrew-version`). O release
só existe com tag `v*` no GitHub — é ela que dispara o publish. Push e tag só com
confirmação do dono. **Trava:** `scripts/check-version-sync.js` + checagem tag × versão
no `publish.yml`.

### 9. Documento que mente é corrigido no mesmo commit
README, CHANGELOG, CONTRIBUTING, specs e este arquivo. Divergência: o código manda.

### 10. Quando travar
2 tentativas falhas seguidas → parar e escrever o diagnóstico (o que acontece, o que foi
tentado, o que está ambíguo na spec).

### 11. Continuidade
Ao terminar QUALQUER sessão, mesmo interrompida: atualizar `STATUS.md` (local, fora do
git — regra deste projeto; diverge de propósito da skill project-standards).

### 12. Limite de formato só vale se o verificador mede
Todo limite que o produto promete (tamanho de título, legenda, post, hashtags, slides) mora no
frontmatter `constraints:` do best-practice — com nome canônico — e é medido por
`_opencrew/core/scripts/verificar.mjs` antes do revisor. Limite só escrito em prosa é intenção.
**Trava:** `tests/verificar*.test.js` + `tests/runtime-contracts.test.js` (U1-05) e
`tests/runtime-contracts-r1.test.js`.

### 13. Texto que o usuário vê: PT-BR correto
Mensagens, perguntas e relatórios mostrados ao usuário final são em português do Brasil, com
acentos. Outros idiomas: tradução pelo modelo. **Trava:** sem trava — revisão humana (→ U5).

### 14. Toda mudança chega a quem já usa
Toda melhoria do runtime tem que chegar a um projeto que já tem uma versão antiga com um único
`npx @aksp/opencrew@latest update`, sem perder dado do usuário. Se a mudança mora fora de
`_opencrew/core/` ou dos skills do catálogo (o que o `update` renova), a mesma entrega inclui a
migração no `update`. Release = commit + tag `v*` no GitHub (o CI publica no npm).
**Trava:** `tests/upgrade.test.js` (simula um workspace pré-1.5 e atualiza), `tests/upgrade-r3.test.js`,
`tests/upgrade-u3a.test.js`, `tests/upgrade-u3a2.test.js`, `tests/upgrade-u3b.test.js`, `tests/upgrade-u4a.test.js`,
`tests/upgrade-u5a.test.js`, `tests/upgrade-u5c.test.js` e `tests/runtime-contracts-u5d.test.js` (U5d-upg-a).

### 15. Script do runtime só escreve onde foi combinado
Script do runtime só escreve onde foi combinado: arquivos da crew (com `.bak`), o `state.json` da
crew, a pasta de saída da crew (`crews/<crew>/output/`) e o destino declarado; nunca sobrescreve
arquivo do usuário, e só apaga a própria pasta de entrega e os temporários que ele mesmo criou.
O `documento.mjs` grava o `.docx` pedido e o perfil que faltava (`--criar-perfil`); um `.docx`
diferente que já existe só é trocado com `--substituir`, e ele nunca apaga nada.
O `conserto.mjs` só grava com `--aplicar`, e só o `crew.yaml`, o `crew-party.csv`, os agentes, os
passos, a memória e o histórico (`runs.md`) da crew, cada um com a cópia `.bak` (a que já existe
fica); nunca apaga.
O `caminho.mjs` e o `execucao.mjs` gravam o registro da execução (`output/<execução>/execucao.json`),
e o `execucao.mjs fechar` põe ou troca uma linha do `runs.md` da crew; mais nada. O pedido avulso
(`pasta --pedido`) é uma execução: vale a mesma regra.
**Trava:** `tests/entregar*.test.js` (U3a-14b): em cada cenário, fora da pasta da execução — e,
desde a 1.9.0, do destino escolhido e do `crew.yaml` + `.bak` (só com `--lembrar-destino`) —, a
árvore do projeto é igual antes e depois, e não sobra pasta `.tmp`; `tests/upgrade-u3a2.test.js`;
`tests/documento*.test.js` (U3b-04j): fora do `.docx` de saída — e do perfil, em `--criar-perfil` —,
a árvore do projeto é igual antes e depois; `tests/entregar-documentos.test.js` e
`tests/upgrade-u3b.test.js`; `tests/conserto*.test.js` (U4a-02j): fora dos arquivos combinados da
crew e das cópias `.bak`, a árvore do projeto é igual antes e depois, e o diagnóstico não grava nada;
`tests/execucao*.test.js` (U5c-07a): fora do `execucao.json` da execução e, no `fechar`, do `runs.md`,
a árvore do projeto é igual antes e depois, e não sobra arquivo temporário; U5c-04b: no `runs.md` só
muda a linha da execução.

## Regra → Trava

| Regra | Trava | Tipo |
|---|---|---|
| 1 Ciclo | sem trava — revisão humana | — |
| 2 Payload sem mantenedor | `tests/ides.test.js`, `tests/package.test.js` (U3b-07a: o modelo do perfil), `tests/documento-contratos.test.js` (U3b-06a: o exemplo do guia) | Reprova |
| 3 Não destruir dado | `tests/init.test.js`, `tests/init-safety.test.js`, `tests/init-repair.test.js`, `tests/update.test.js`, `tests/update-u2.test.js`, `tests/update-u3a2.test.js`, `tests/r2-*.test.js`, `tests/scripts-links.test.js` | Reprova |
| 4 Referências existem | `tests/template-refs.test.js` | Reprova |
| 5 Pacote = doc | `tests/package.test.js` | Reprova |
| 6 Tamanho | `scripts/check-size.js`; o núcleo do runner em até 560 linhas: `tests/runtime-contracts-u5b.test.js` (U5b-01b), `tests/runtime-contracts-u5c.test.js` (U5c-10a) e `tests/runtime-contracts-u5d.test.js` (U5d-05a) | Alerta; o teto do runner reprova |
| 7 Porta única | `scripts/verify.js` + proveta `tests/verify.test.js` | Reprova |
| 8 Versão | `scripts/check-version-sync.js`, passo tag × versão no `publish.yml`, `tests/release-gate.test.js`, `tests/node-piso.test.js` | Reprova |
| 9 Doc que mente | sem trava — revisão humana | — |
| 10 Quando travar | sem trava — revisão humana | — |
| 11 Continuidade | sem trava — revisão humana | — |
| 12 Limite medido | `tests/verificar*.test.js`, `tests/runtime-contracts.test.js`, `tests/runtime-contracts-r1.test.js`, `tests/conserto-aplicar.test.js` (U4a-02f e 02g: a trava da proibição), `tests/u5a-scripts.test.js` (U5a-01 e 02: o que `texto-livre` mede e não mede) | Reprova |
| 13 PT-BR para o usuário | sem trava — revisão humana (→ U5) | — |
| 14 Chega a quem já usa | `tests/upgrade.test.js`, `tests/upgrade-r3.test.js`, `tests/upgrade-u3a.test.js`, `tests/upgrade-u3a2.test.js`, `tests/upgrade-u3b.test.js`, `tests/upgrade-u4a.test.js`, `tests/upgrade-u5a.test.js`, `tests/runtime-contracts-u5b.test.js` (U5b-upg-a), `tests/upgrade-u5c.test.js`, `tests/runtime-contracts-u5d.test.js` (U5d-upg-a) | Reprova |
| 15 Script só escreve onde foi combinado | `tests/entregar*.test.js` (U3a-14b; com o destino: `entregar-destino`, `entregar-copia`, `entregar-ressalvas`, `entregar-leiame-copia`; com o documento Word: `tests/entregar-documentos.test.js`), `tests/upgrade-u3a2.test.js`, `tests/documento*.test.js` (U3b-04j), `tests/upgrade-u3b.test.js`, `tests/conserto*.test.js` (U4a-02j), `tests/execucao*.test.js` (U5c-07a e 04b; U5d-03b: o pedido) | Reprova |

## Dogfood (usar o OpenCrew neste repo)
Use `sandbox/` (fora do git): `cd sandbox && node ../bin/opencrew.js init --ide=claude-code`.
Nunca instale o runtime na raiz — ele colide com este arquivo.

## O que NÃO fazer
- Copiar à mão arquivos do payload para a raiz.
- Funcionalidade fora da fase atual: vai para `IDEIAS.md`, com triagem e `Alocação: →`.
- Item adiado sem destino (`Alocação: → Fase N — motivo` / `→ sem fase — motivo`).
- Plano, decisão ou relatório guardado só fora do repositório.
