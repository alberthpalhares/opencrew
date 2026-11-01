# Spec — Fase U7-F2: Publicação e CI seguros

- **Fase:** F2 do roteiro U7 (`specs/fase-u7-roteiro.md`) · **Módulos:** infraestrutura (`.github/workflows/ci.yml`, `.github/workflows/publish.yml`) + testes (`tests/release-gate.test.js`) + docs (`CONTRIBUTING.md`, `AGENTS.md`) + CHANGELOG · **Status:** aprovada pelo dono em 2026-10-31 (spec, cenários e as quatro decisões da §7, todas como recomendadas); publicada no npm em 2026-11-01 (1.19.5), a primeira publicação por OIDC; revisão independente (Fable 5.1, high) feita, achados tratados
- **Versão:** 1.19.5 (patch: infraestrutura, nenhuma linha de `src/` nem de `templates/` muda).
- **Termos novos no GLOSSARIO.md:** não.
- **Modelo sugerido:** execução Opus 5.5 · alto (publica no npm; erro aqui trava o release).
- **Origem:** auditoria técnica independente de 2026-10-31 (itens 4.1 a 4.5) e a triagem da F0 (C-18, C-19, T-B14). Os fatos do npm abaixo vêm da documentação oficial (https://docs.npmjs.com/trusted-publishers, lida em 2026-10-31); o que não deu para confirmar está marcado.
- **Depende de:** F1 publicada (1.19.4). **Ação do dono fora do repositório:** cadastrar o publicador de confiança no npmjs.com (§6).

## 1. Objetivo
Tirar o release da dependência de um token que expira e endurecer o CI: a publicação autentica por OIDC (sem segredo guardado), o ensaio manual passa a pegar "versão já publicada" e tag errada, o CI roda com o mínimo de permissão, sem scripts de instalação, em ações que não usam mais o Node 20 e também no Node 24.

## 2. O que o código faz hoje (conferido)
| # | Item | Evidência |
|---|---|---|
| 1 | `publish.yml:84` publica com `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` e `npm publish --provenance`. O token granular que o npm emite expira; quando expirar, o `publish` falha no último passo, com a tag já criada. | `publish.yml:76-84` |
| 2 | O job `publish` usa `node-version: '22'` (o `22` mais recente, ≥ 22.14), mas o `npm` que vem com o Node 22 é o 10.x; o publicador de confiança exige **npm ≥ 11.5.1 e Node ≥ 22.14.0**. | `publish.yml:49-54`; docs do npm |
| 3 | O ensaio (`workflow_dispatch` com `dry_run`) roda `npm publish --dry-run`, que não autentica, não gera proveniência e **não vê "versão já existe"**; o passo "tag × versão" é pulado fora de tag. | `publish.yml:56-76` |
| 4 | `ci.yml` não declara `permissions` (herda o padrão do repositório); instala com `npm ci` (roda scripts de instalação); usa `actions/checkout@v4` e `actions/setup-node@v4`, que rodam em Node 20 (o log do publish de 2026-10-31 avisa que é deprecado). | `ci.yml:26-38`; log do run 41233589978 |
| 5 | A matriz é `['20.17.0', '22']`: o Node 24 (LTS) não é testado. Ela está escrita em quatro lugares: `ci.yml`, `tests/release-gate.test.js` (R2-06d), `CONTRIBUTING.md:34,84` e `AGENTS.md:27`. | `grep` |

**Fatos do npm (documentação oficial):** o publicador é cadastrado no npmjs.com, em *Packages → `@aksp/opencrew` → Settings → Trusted Publisher*, com dono ou organização, repositório, **nome do arquivo do workflow** (`publish.yml`, com extensão), ambiente (opcional) e as ações permitidas. O npm **não confere** o cadastro ao salvar: o erro só aparece na hora de publicar. Um cadastro novo precisa de uma publicação bem-sucedida em **2 dias** ou expira. Só vale em runner hospedado (o `ubuntu-latest` serve). O `id-token: write` é obrigatório (o `publish.yml` já o tem). A proveniência é gerada sozinha para repositório e pacote públicos. O CLI tenta OIDC antes de cair para token. Workflow reutilizável: a validação olha o workflow **que chama**; aqui o `npm publish` está no próprio `publish.yml` (e `ci.yml` só é chamado), então o caso comum se aplica. **Não confirmado:** se o `npm publish --dry-run` exercita o OIDC (a documentação não diz; por isso o ensaio não promete isso).

## 3. Regras
1. **Publicação por OIDC.** O passo `Publish` não recebe mais `NODE_AUTH_TOKEN`; o `--provenance` e o `--access public` ficam. O comentário do cabeçalho deixa de dizer "Requires an NPM_TOKEN repo secret" e passa a dizer que a publicação usa o publicador de confiança do npm.
2. **Versões mínimas, verificadas.** Antes de publicar, o job instala `npm@11` (`npm install -g npm@11`) e um passo falha com mensagem clara se o Node for menor que 22.14.0 ou o `npm` menor que 11.5.1 (comparando as três partes da versão, não só a maior).
3. **Ensaio que pega o erro de verdade.** Em todo disparo do `publish.yml` (tag ou manual), um passo confere que a versão do `package.json` **ainda não existe no npm** (`npm view @aksp/opencrew@<versão> version` deve falhar com 404); se existir, para com a mensagem "Esta versão já foi publicada". O passo "tag × versão" continua só em tag; no disparo manual, o `package.json` × `.opencrew-version` já é conferido pelo `npm run verify` (passo `version-sync`), que o ensaio roda. O ensaio continua sem segredo e sem publicar.
4. **`ci.yml` com o mínimo.** `permissions: contents: read` no topo; `npm ci --ignore-scripts` (nenhuma dependência precisa de script de instalação: o único script do projeto é o `version`).
5. **Actions fora do Node 20, fixadas por SHA.** `actions/checkout` e `actions/setup-node` na versão maior mais recente que roda em Node 24, **pelo SHA do commit** da tag com o comentário da versão (decisão do dono, §7); a versão exata e o SHA são conferidos na hora da implementação, na página de releases de cada Action (os resultados de busca de 2026-10-31 apontam v6 para as duas, de fontes de terceiros: não aceito como prova). O `dependabot.yml` mantém os SHAs em dia.
6. **Node 24 na matriz.** `node-version: ['20.17.0', '22', '24']`. Se a célula do 24 reprovar por causa do código do pacote, a F2 corrige o que for nosso; se for de uma dependência, registra no `IDEIAS.md` e a célula fica como está até haver decisão do dono.
7. **A matriz continua escrita em um lugar só de verdade.** O teste R2-06d passa a esperar `[piso, '22', '24']`; `CONTRIBUTING.md` (linhas 34 e 84) e `AGENTS.md` (Stack) passam a dizer "Node 20.17, 22 e 24".
8. **Depois da primeira publicação por OIDC bem-sucedida**, o segredo `NPM_TOKEN` é apagado do repositório e o token é revogado no npm (ação do dono); o `CONTRIBUTING.md:125` (passo 3 do "npm publish") passa a descrever o cadastro do publicador de confiança em vez do segredo.

## 4. Cenários (BDD)
- **U7F2-01a** (contrato) DADO `publish.yml` ENTÃO o passo que publica não tem `NODE_AUTH_TOKEN` nem `secrets.NPM_TOKEN`, mantém `--provenance --access public`, e o job tem `id-token: write`; o ensaio continua sem segredo e sem proveniência.
- **U7F2-02a** (contrato) DADO `publish.yml` ENTÃO existe um passo que instala `npm@11` e outro que falha se o Node < 22.14.0 ou o npm < 11.5.1, ambos antes do `npm publish`.
- **U7F2-02b** DADA a função/script de comparação de versão usada nesse passo ENTÃO `11.5.0` reprova, `11.5.1` e `11.10.0` passam, `10.9.2` reprova; `22.13.9` reprova e `22.14.0` passa. (Se for um script de verdade em `scripts/`, o teste roda o script; se for linha do YAML, o teste lê a comparação.)
- **U7F2-03a** (contrato) DADO `publish.yml` ENTÃO um passo confere "versão ainda não publicada" com `npm view` antes de qualquer `npm publish`, nos dois gatilhos, e o passo "tag × versão" continua só em tag.
- **U7F2-04a** (contrato) DADO `ci.yml` ENTÃO tem `permissions:` com só `contents: read` e a instalação é `npm ci --ignore-scripts`; `publish.yml` instala igual.
- **U7F2-05a** (contrato) DADOS `ci.yml` e `publish.yml` ENTÃO nenhuma Action usa `@v4`, e as duas citam a versão escolhida.
- **U7F2-05b** (contrato) DADO o repositório ENTÃO `.github/dependabot.yml` existe, com o ecossistema `github-actions` e agenda semanal; e cada `uses:` de `ci.yml` e `publish.yml` aponta para um SHA de 40 caracteres, seguido do comentário da versão.
- **U7F2-06a** (contrato) DADO `ci.yml` ENTÃO `node-version` é `['20.17.0', '22', '24']` (o piso lido do `package.json`); `CONTRIBUTING.md` e `AGENTS.md` dizem 20.17, 22 e 24.
- **U7F2-07a** (contrato) DADO `CONTRIBUTING.md` ENTÃO não manda criar o segredo `NPM_TOKEN`.
- **U7F2-upg** Não se aplica: nada em `templates/` nem em `src/` muda, então não há o que o `update` entregar (regra 14: a mudança mora fora do que o `update` renova e **não precisa de migração**, porque não chega ao projeto do usuário).

## 5. Travas que mudam
- `tests/release-gate.test.js`: **R2-06d** passa a esperar a matriz com o Node 24; **o teste do `NODE_AUTH_TOKEN`** (linha 98: `assert.match(real[0], /NODE_AUTH_TOKEN…/)`) passa a exigir a **ausência** do token no passo real; o resto (ordem tag × versão antes de publicar, `dry_run` ligado por padrão, um só job publica) fica.
- Testes novos em `tests/publicacao-f2.test.js` (mesmo estilo: o YAML lido como texto, sem rede) para os cenários U7F2-01a a 07a; o script `scripts/check-publish-env.js` guarda a comparação de versão (U7F2-02b).
- `AGENTS.md`: Stack e regra 8 (a trava do `publish.yml`).

## 6. Ação do dono fora do repositório (npmjs.com e GitHub)
1. **Antes do Release da 1.19.5:** em npmjs.com → Packages → `@aksp/opencrew` → Settings → *Trusted Publisher* → GitHub Actions: dono `alberthpalhares`, repositório `opencrew`, workflow `publish.yml`, ambiente em branco, ação permitida: publicar. **O npm não confere ao salvar**: um erro de digitação só aparece na publicação (`ENEEDAUTH` ou um 404 no envio), e a publicação falha sem publicar nada; é só corrigir o cadastro e usar "Re-run failed jobs". O cadastro expira se a primeira publicação bem-sucedida não vier em 2 dias: cadastre **no dia do Release**. O pacote precisa já existir no npm para ter essa tela (inferência: a configuração fica nas *Settings* do pacote).
2. **Depois da primeira publicação por OIDC bem-sucedida:** apagar o segredo `NPM_TOKEN` (Settings → Secrets → Actions) e revogar o token no npm. Opcional e recomendado: no npm, exigir 2FA e proibir tokens para o pacote (a documentação sugere).

## 7. Decisões do dono (2026-10-31, todas como recomendadas)
1. **Spec e cenários aprovados** (⏸).
2. **Sem token de reserva na 1.19.5.** Se o cadastro estiver errado, a publicação falha de forma visível e segura (nada é publicado).
3. **Actions fixadas pelo SHA do commit**, com o comentário da versão, e um `.github/dependabot.yml` (ecossistema `github-actions`, semanal) para as atualizações chegarem como PRs.
4. **O ensaio manual passa a falhar** se a versão do `package.json` já estiver publicada (hoje passa).

## 8. Fora do escopo
- `npm audit` moderado do ESLint (só devDependencies); subir o ESLint.
- `npm stage publish` e a política de 2FA do pacote (ação do dono, §6).
- Qualquer mudança em `src/` ou `templates/`.
- A F3 (`update` que reconcilia), que é a próxima fase de código.

## 9. Conferência que o `npm run verify` não cobre (regra 7)
- **A publicação real por OIDC**: só o Release da 1.19.5 prova. É a conferência do dono (e a minha, no log do job).
- O ensaio manual (`workflow_dispatch`, `dry_run` ligado) rodado uma vez antes do Release: tem que passar na 1.19.5 (versão ainda não publicada) e **falhar** na 1.19.4 (já publicada).
- A célula do Node 24: o CI do PR é a prova (não há Node 24 neste ambiente).
