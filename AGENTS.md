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
Node.js ≥ 20 (ESM) · deps: `@inquirer/checkbox` · testes: `node:test` · lint: ESLint 9 ·
CI: GitHub Actions (Ubuntu + Windows, Node 20/22) · publish: tag `v*` → npm.

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
(`opencrew:start/end`). **Trava:** `tests/init.test.js`, `tests/update.test.js`.

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
real no npm, o dashboard.

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

## Regra → Trava

| Regra | Trava | Tipo |
|---|---|---|
| 1 Ciclo | sem trava — revisão humana | — |
| 2 Payload sem mantenedor | `tests/ides.test.js`, `tests/package.test.js` | Reprova |
| 3 Não destruir dado | `tests/init.test.js`, `tests/update.test.js` | Reprova |
| 4 Referências existem | `tests/template-refs.test.js` | Reprova |
| 5 Pacote = doc | `tests/package.test.js` | Reprova |
| 6 Tamanho | `scripts/check-size.js` | Alerta |
| 7 Porta única | `scripts/verify.js` + proveta `tests/verify.test.js` | Reprova |
| 8 Versão | `scripts/check-version-sync.js`, passo tag × versão no `publish.yml` | Reprova |
| 9 Doc que mente | sem trava — revisão humana | — |
| 10 Quando travar | sem trava — revisão humana | — |
| 11 Continuidade | sem trava — revisão humana | — |

## Dogfood (usar o OpenCrew neste repo)
Use `sandbox/` (fora do git): `cd sandbox && node ../bin/opencrew.js init --ide=claude-code`.
Nunca instale o runtime na raiz — ele colide com este arquivo.

## O que NÃO fazer
- Copiar à mão arquivos do payload para a raiz.
- Funcionalidade fora da fase atual: vai para `IDEIAS.md`, com triagem e `Alocação: →`.
- Item adiado sem destino (`Alocação: → Fase N — motivo` / `→ sem fase — motivo`).
- Plano, decisão ou relatório guardado só fora do repositório.
