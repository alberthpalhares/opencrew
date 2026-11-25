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
- A tag `v1.22.0` já existe no commit da tentativa que falhou, mas ainda não publicou no npm. O próximo commit deve chegar à `main` e passar a matriz inteira antes de substituir essa tag não publicada pelo commit final; então será possível disparar a publicação OIDC com o código corrigido.
- O dono autorizou commit, push, tag e publicação. Restam `npm run verify`, commit e push, CI verde em Windows e Ubuntu com Node 20.17, 22 e 24, confirmar a ausência de 1.22.0 no registry e que `latest` não retrocederá, recriar a tag final, acompanhar OIDC, confirmar `latest` e publicar a release do GitHub.

## Limitação conhecida

A abertura automática do Escritório pelo Codex CLI passou no primeiro aceite interativo e falhou intermitentemente em ensaios posteriores. A investigação anterior permanece em `docs/auditoria/2026-11-24-entregas-organizadas-1.21.3.md`; esta auditoria não a classifica como resolvida.
