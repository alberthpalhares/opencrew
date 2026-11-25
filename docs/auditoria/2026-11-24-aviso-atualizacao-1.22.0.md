# Auditoria e aceite da 1.22.0

Data: 2026-11-24. Candidata local no Windows, Node 24.14.0.

## Escopo

A release inclui o aviso opcional de atualização e a prévia protegida, mais as correções de execução e Escritório da candidata 1.21.3 e as entregas organizadas com busca e escolha do destino final.

## Verificação automatizada

- `npm run verify`: **1.756 aprovados, zero falhas e dois pulados**. Lint, testes, sincronização de versão e empacotamento passaram; `.opencrew-version` e `package.json` confirmam 1.22.0.
- Evidência completa: `sandbox/verify-1.22.0-2026-11-24-final.log`.
- Testes focados do aviso, upgrade, caminhos e pacote: 75 aprovados, zero falhas e um pulado no sandbox por bloqueio de symlink. Na suíte completa fora do sandbox, os cenários de junction passaram.
- As falhas da primeira verificação foram corrigidas: AU-16 agora confirma que cache em pasta protegida suprime o aviso e não grava fora do projeto; `caminho.mjs` foi reduzido abaixo do limite contratual de 200 linhas ao mover a validação para `caminho/validar.mjs`.

## Jornada do aviso e atualização

No sandbox descartável `sandbox/aceite-aviso-1.22.0-20261124`, um workspace 1.21.2 recebeu um cache válido de 1.22.0. O script mostrou `ATUALIZACAO:DISPONIVEL 1.21.2 1.22.0`. A prévia `update --check` retornou a mesma dupla de versões com código 1 e não alterou nenhum arquivo. Após confirmação simulada no harness, `update --menu` concluiu a aplicação.

Conferidos depois da atualização: carimbo 1.22.0; script do aviso instalado; crew, `runs.md`, entrega, `company.md`, preferências e `.env` byte a byte preservados; edição local em `runner.pipeline.md` guardada em `.opencrew-backup/`. O teste automatizado `tests/upgrade-aviso-atualizacao.test.js` também cobre update a partir da 1.21.2.

Evidência: `sandbox/aceite-aviso-1.22.0-20261124/aceite-update.log`.

## Cópias em destinos reais

Foi montado um pacote fictício aprovado de dois arquivos, execução `2026-11-24-164500`, e copiado para:

- `G:\Meu Drive\OpenCrew-Aceite-1.22.0-20261124\aceite-destinos-2026-11-24-164500`
- `E:\OpenCrew-Aceite-1.22.0-20261124\aceite-destinos-2026-11-24-164500`

Os hashes SHA-256 dos arquivos no pacote local, no ponto de montagem do Google Drive e no HD externo coincidiram. O `execucao.json` guardou dois recibos; repetir a cópia no Drive retornou a mesma pasta e não criou duplicata. A sincronização remota do Google Drive continua sendo controlada pelo aplicativo do usuário.

Evidência: `sandbox/aceite-destinos-1.22.0-20261124/aceite-fisico.log`.

## Pré-publicação

- Consulta ao npm: `latest` = 1.21.2; `@aksp/opencrew@1.22.0` ainda não publicado.
- A primeira tentativa de publicação (workflow `45538366890`, commit `0334465`) parou antes do publish: o cenário de dois fechamentos simultâneos falhou no Windows/Node 22 e o job `publish` foi pulado. Nenhum pacote 1.22.0 foi publicado.
- Reproduzi a corrida no Windows: em 100 repetições, falhou na 87ª; a segunda execução recebeu `EPERM` transitório na recuperação da trava e deixou de gravar a linha de `runs.md`. A recuperação agora trata `EPERM`/`EBUSY` como disputa transitória e volta ao ciclo de aquisição. Depois da correção, o mesmo cenário passou em 200 repetições consecutivas.
- Evidências: falha reproduzida em `sandbox/stress-fechar-diagnostico.log`; resumo e última passagem em `sandbox/stress-fechar-resumo.txt` e `sandbox/stress-fechar-fix.log`.
- A validação local posterior à correção (`npm run verify`, Windows/Node 24.14.0) passou com **1.756 aprovados, zero falhas e dois pulados**. Evidência: `sandbox/verify-1.22.0-racefix-elevated.log`.
- A correção foi enviada no commit `3846ae6`; o CI `45541626666` passou nas seis combinações Windows/Ubuntu × Node 20.17/22/24, incluindo a auditoria de segurança. A versão continua fora do npm (`latest` = 1.21.2; consulta a `@aksp/opencrew@1.22.0` retornou 404).
- A tag `v1.22.0` ainda aponta ao commit da tentativa que falhou (`0334465`), cujo workflow `45538366890` pulou o publish. Depois de registrar esta atualização do relatório, a nova cabeça da `main` precisa passar a mesma matriz antes de substituir a tag não publicada e disparar o workflow OIDC.
- O dono autorizou commit, push, tag e publicação. Restam validar a nova cabeça da `main`, substituir `v1.22.0`, acompanhar OIDC, confirmar que `latest` virou 1.22.0 e publicar a release do GitHub.

## Limitação conhecida

A abertura automática do Escritório pelo Codex CLI passou no primeiro aceite interativo e falhou intermitentemente em ensaios posteriores. A investigação anterior permanece em `docs/auditoria/2026-11-24-entregas-organizadas-1.21.3.md`; esta auditoria não a classifica como resolvida.
