# Spec — Fase U7-F3c: Escritório automático por execução

- **Fase:** U7-F3c · **Status:** implementada na 1.21.0 (2026-11-12) · **Módulos:** runtime do Escritório, estado por execução, preferências, pontes dos harnesses e testes de upgrade
- **Versão:** 1.21.0 (minor: o Escritório passa a abrir automaticamente por padrão e a acompanhar execuções individuais)
- **Depende de:** U7-F3 (1.20.0), publicada
- **Origem:** pedido do dono para abrir o Escritório sempre que `run`, `retomar` ou `pedir` começar, usando o navegador embutido em apps que o ofereçam e o navegador do sistema nos harnesses CLI.

## 1. Objetivo

Quando uma execução confirmada começa, abrir o Escritório já apontado para aquela `crew` e `run_id`. A abertura e os eventos de uma execução não podem trocar o estado de outra execução simultânea da mesma crew. Instalações novas ligam o recurso por padrão; instalações antigas que receberam `Dashboard: disabled` passam a ligá-lo depois do `update`, sem reescrever `_opencrew/_memory/preferences.md`. `/opencrew dashboard off` grava `Dashboard: off` como escolha explícita.

## 2. Contratos

1. `estado.mjs` mantém a forma antiga sem `--run`; com `--run <run_id>`, grava somente `crews/<crew>/output/<run_id>/estado-escritorio.json`. O run precisa ser seguro, existir e ficar dentro da pasta de saída real da crew. O próprio script continua sendo o único escritor do estado.
2. O servidor continua preso a `127.0.0.1` e somente leitura. `/estado` sem query mantém a visão geral atual. `/estado?crew=<crew>&run_id=<id>` devolve apenas o estado daquela execução. A URL de abertura usa esses parâmetros e mostra a execução pedida, mesmo com outra execução da mesma crew ativa.
3. `escritorio.mjs --automatico --crew <crew> --run <id>` localiza ou inicia o servidor em segundo plano e só imprime `ESCRITORIO:URL <url>` depois de confirmar `projeto` e `versao` em `/estado`. Primeiro reutiliza uma instância compatível em qualquer porta do intervalo; servidor antigo continua em execução e não é reutilizado. Ocupação de portas leva à próxima porta livre. `--externo` abre a URL no navegador padrão e ainda imprime o link; erro de ambiente gráfico também preserva o link.
4. Apps Claude Code Desktop, Codex App e Antigravity App usam o Browser integrado quando a sessão oferece a ferramenta e a política permite localhost. Harnesses CLI passam `--externo` e mostram a URL clicável. Falha técnica do Browser permite fallback externo; recusa ou bloqueio de política deixa o link manual e não é contornado. Sem interface gráfica, a crew continua e o link fica disponível.
5. `Dashboard: off` desliga. Ausência da linha, valor `disabled` legado, ou qualquer valor diferente de `off` deixa o Escritório ligado. O molde de preferências de uma instalação nova passa a dizer `enabled`. O `update` não toca em `_memory/`.
6. `run`, `retomar` e `pedir` abrem a página só depois das confirmações já exigidas por cada caminho. Em `pedir`, o estado usa o agente escolhido para a tarefa e o revisor escolhido, quando houver; não deduz agente do passo correspondente do pipeline.
7. Se abrir o Escritório falhar, a execução continua e o usuário recebe um aviso uma vez por execução.

## 3. Cenários BDD

- **U7F3C-01a** DADA uma preferência ausente ou `Dashboard: disabled` QUANDO o runtime consulta o Escritório ENTÃO ele está ligado; DADA `Dashboard: off` ENTÃO não abre nem grava estado.
- **U7F3C-01b** DADO `/opencrew dashboard off` ENTÃO somente a linha `Dashboard` muda para `off`; o restante das preferências permanece igual.
- **U7F3C-02a** DADO um servidor compatível deste projeto em qualquer porta do intervalo QUANDO o modo automático é chamado ENTÃO ele reutiliza essa instância e retorna a URL dela depois de validar projeto e versão.
- **U7F3C-02b** DADO um serviço ocupando a porta inicial e nenhum servidor compatível QUANDO o modo automático é chamado ENTÃO ele mantém o serviço intacto, inicia o Escritório numa porta livre e retorna a URL confirmada.
- **U7F3C-02c** DADO um Escritório de versão anterior em execução ENTÃO ele continua ativo e o modo automático inicia ou reutiliza o servidor da versão atual em outra porta.
- **U7F3C-02d** DADO `--externo` QUANDO o navegador do sistema abre com sucesso ENTÃO o comando também imprime uma URL clicável; sem interface gráfica ou com falha ao abrir, imprime a URL e continua com código que não interrompe a crew.
- **U7F3C-03a** DADAS duas execuções simultâneas da mesma crew QUANDO ambas gravam eventos ENTÃO cada arquivo `output/<run_id>/estado-escritorio.json` muda independentemente.
- **U7F3C-03b** DADA a URL com crew e run_id QUANDO o navegador consulta `/estado` ENTÃO recebe só o estado dessa execução; nomes inválidos, run ausente e caminhos que escapariam da pasta de saída não leem arquivos externos.
- **U7F3C-03c** DADO um pedido avulso com agente de trabalho e revisor definidos QUANDO seus eventos chegam ao Escritório ENTÃO o trabalho e a revisão aparecem nos agentes escolhidos, mesmo que os números coincidam com passos diferentes do pipeline.
- **U7F3C-03d** DADO um run salvo QUANDO o Escritório é reaberto após a confirmação de retomada ENTÃO `iniciar --run` preserva o estado salvo e os eventos seguintes continuam a partir dele.
- **U7F3C-04a** DADO um workspace 1.20.0 com preferência `Dashboard: disabled` QUANDO recebe `update` e começa uma execução ENTÃO o runtime novo abre o Escritório, a preferência antiga continua byte a byte intacta e o estado novo fica na pasta do run.
- **U7F3C-05a** DADO `run`, `retomar` ou `pedir` QUANDO começa após as confirmações requeridas ENTÃO o agente prepara a URL da execução e a abre no Browser integrado disponível ou, em CLI, no navegador do sistema; recusa ou política bloqueada deixa um link manual e não para a crew.

## 4. Conferência fora do `npm run verify`

Conferir uma execução real em cada app desktop compatível e em um harness CLI local: URL aberta sem ação adicional quando a ferramenta integrada permite; progresso atualizado em pelo menos um passo; execução simultânea isolada; link e fallback. Se a sessão não expuser o Browser ou a política impedir localhost, registrar essa limitação e verificar que o link permanece no chat. O `verify` não prova a aparência no navegador.

## 5. Travas

- `tests/estado-execucoes.test.js` (U7F3C-03a, 03c e 03d): estado isolado por run_id, agente de pedido explícito e retomada sem reset.
- `tests/escritorio-auto.test.js` (U7F3C-02a a 02d e 03b): descoberta/reuso, porta, validação do servidor, URL e navegador externo.
- `tests/upgrade-u7f3c.test.js` (U7F3C-04a): o `update` leva o runtime a um workspace 1.20.0 sem mudar `_memory/`.
- `tests/runtime-contracts-u7f3c.test.js` (U7F3C-01b e 05a): preferências e instruções de harness/run/pedido/retomada.

## 6. Limites

O runtime não pode chamar APIs privadas dos aplicativos. A abertura embutida é feita pelo agente através das ferramentas Browser que a própria sessão expõe; política, sessão remota ou ausência da ferramenta deixam um link manual. Abrir o navegador externo em apps desktop é fallback apenas para falha técnica, não para recusa do usuário ou bloqueio de política.

## 7. Registro da implementação

- Implementados os cenários U7F3C-01a a 03c, 04a e 05a.
- Contrato `U7F3C-03c` em `tests/runtime-contracts-e1.test.js` alinhado à redação de `templates/_opencrew/core/runner/escritorio.md`, e retentativa `trocarNome` (recusas transitórias `EPERM`/`EBUSY`/`EACCES` no Windows) unificada em `comum.mjs` e aplicada em `entrega/gravar.mjs`, `entrega/copia.mjs` e `estado/arquivo.mjs`.
- `npm run verify` verde fora do sandbox no Windows/Node 24: `lint`, `test` (1.677 testes: 1.675 passaram, 0 falharam, 2 pulados específicos de POSIX), `version-sync` (`1.21.0`) e `size`.
- Conferência real em workspace temporário (`init --ide=antigravity --yes`): `escritorio.mjs --automatico` subiu o servidor na porta `4747` (`ESCRITORIO:URL`), confirmou `/estado?crew=teste&run_id=...` isolado em duas execuções simultâneas, atualizou o passo 2 de `run_1` sem alterar `run_2` e reutilizou a mesma porta na chamada seguinte. Limitação registrada (§4): o MCP `chrome_devtools` não estava conectado ao Chrome (`DevToolsActivePort` ausente), portanto a abertura visual sem clique em Claude Code Desktop, Codex App e Antigravity App permanece pendente de conferência visual nessas sessões.
