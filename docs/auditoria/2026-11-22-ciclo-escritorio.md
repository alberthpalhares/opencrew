# Ciclo de vida do Escritório — investigação e correção

Data: 2026-11-22 · Situação: implementação local em 1.21.3; sem commit, tag ou publicação.

## Evidências

1. No workspace Córtex em 1.21.2, o registro de uma execução publicada não tinha `estado-escritorio.json`. A consulta da URL com `crew` e `run_id` devolveu outra execução da mesma crew, cujo estado visual estava parado no passo 10. A leitura por `?crew=` continua sendo uma visão geral; a consulta direcionada estava recorrendo indevidamente a essa visão geral.
2. Os quatro registros citados da crew `conteudo` foram encerrados como abortados no mesmo minuto de 22/11. Três tinham estado visual. A gravação do registro e o último evento visual eram comandos separados; isso permite divergência se a sessão encerrar entre eles. A causa original das interrupções permanece indeterminada.
3. A abertura automática iniciava o servidor em segundo plano e validava a URL naquele momento, mas não havia encerramento automático quando ocioso. Nenhuma porta padrão do Escritório estava escutando durante a investigação; não foi possível confirmar se o harness tinha encerrado um processo anterior.
4. A suíte exigia o fallback de execução direcionada para outra execução. O cenário U7F3C-08a substituiu esse contrato permissivo.

## Correções

- A URL com `run_id` lê somente aquele run. O registro de execução prevalece sobre o estado visual nos runs fechados; sem estado visual, a página deriva resultado e horário de fechamento do registro. Run aberto sem estado próprio recebe uma tela de preparação. A URL base mantém a visão geral e `?crew=` continua filtrando a crew.
- `execucao.mjs fechar` passou a determinar o resultado exibido. Falha em gravar `execucao.json` emite `EXECUCAO:FECHAMENTO_PENDENTE`; o runner repete somente esse comando uma vez. Falha no `runs.md` fica separada e não repete entrega ou publicação. A entrega/resultado é fechado antes das rotinas de memória e resumo.
- Servidor automático relembra atividade dos registros e estados, fecha dois minutos depois do último run encerrado, ou dois minutos depois de um run aberto passar duas horas sem eventos. Registro aberto sem horário verificável conta inatividade a partir do início do servidor, em vez de mantê-lo vivo indefinidamente. Abas e consultas não estendem o prazo. Um novo evento de retomada atualiza atividade sem zerar o passo salvo. Sinal de término encerra apenas o próprio servidor e fecha suas conexões.
- A inicialização volta a sondar uma porta ocupada por concorrência e reutiliza uma instância compatível confirmada. Instalações antigas continuam identificáveis pelo `update`, que preserva crews, execuções, estados e preferências, inclusive `Dashboard: off`.

## Verificação

- Suíte focada de ciclo, servidor, modelo, runner, encerramento, upgrade e pacote: **128/128 passaram**.
- Testes HTTP reais confirmaram resposta da página, fechamento e reabertura da porta após os dois minutos (relógio controlado), após `SIGTERM`, e depois de terminar à força um servidor filho. A invocação automática seguinte voltou a responder e confirmou o `run_id` exato.
- Upgrade simulado de 1.21.2 e de uma instalação legada instalou a vigia e a ponte atualizadas e preservou preferências e arquivos de execução.
- `lint`, `scripts/check-version-sync.js` (1.21.3), `scripts/check-size.js` e `git diff --check` passaram. O núcleo do runner ficou em 559/560 linhas; os avisos de tamanho restantes são não bloqueantes.
- `npm run verify` falhou no estágio de testes. Reexecução isolada de quatro suítes afetadas: 86 passaram e 6 falharam. Dois cenários de link de pasta falharam com `EPERM` ao criar symlink no sandbox do Windows. Quatro cenários não relacionados ao Escritório falharam ao localizar ou classificar caminhos absolutos (`tests/conferir-fontes-r1.test.js`, `tests/conferir-fontes.test.js` e `tests/u5a-scripts.test.js`). Esses testes não foram alterados nesta entrega.

## Limites

- O motivo original de cada uma das quatro execuções abortadas não foi identificado, e não se reproduziu o desaparecimento espontâneo do servidor relatado.
- A validação visual no Codex App Windows ficou pendente. A skill `computer-use` instalada proíbe automatizar a interface do próprio Codex App; os testes verificam o servidor HTTP, não a aparência da sala, abertura de aba integrada nem uma mudança de passo observada em uma crew real.
- O npm está preparado para 1.21.3 localmente, mas a entrega ainda não foi publicada. `npm version patch --no-git-tag-version` atualizou os arquivos de versão, mas a etapa final tentou gravar o índice Git e recebeu `EPERM` em `.git/index.lock`, que é somente leitura neste ambiente. Nenhum commit, tag ou push foi realizado.

## Revisão geral da candidata 1.21.3

Recomendação de publicação pendente das correções abaixo e da conferência no Codex App. A revisão manteve o código do produto como estava.

1. **P1 — Abertura pode parar na primeira porta reservada.** `spawn` confirma a criação do processo, antes de o filho fazer `listen`. Ao falhar o bind sem listener TCP, a descoberta para em `nao-confirmado`, mesmo com portas seguintes livres. Reproduzido com filho simulado que emite `spawn` e sai. A inicialização exata só informa conflito para `EADDRINUSE`. No fluxo desktop, `--confirmar` sonda a página uma vez e pode devolver indisponibilidade enquanto o processo lançado em segundo plano ainda está iniciando. Separar erro de bind, serviço ocupado e falha de confirmação, respeitando um prazo total. Ver `escritorio/automatico.mjs`, `escritorio/porta.mjs`, `escritorio/servidor.mjs` e `escritorio.mjs`.
2. **P1 — Registros antigos podem encerrar um servidor recém-aberto.** A vigia usa o fim mais recente encontrado no disco mesmo quando ele antecede a inicialização. Um fechamento antigo de seis minutos produziu um prazo quatro minutos anterior à inicialização. `/opencrew dashboard` também usa `--automatico` e pode sofrer esse efeito ao abrir apenas para consultar o histórico. Além disso, a descoberta não distingue a instância manual da automática ao reaproveitar a porta. Ver `escritorio/vigia.mjs`, `escritorio/porta.mjs` e `templates/AGENTS.md`.
3. **P1 — Registro parcialmente inválido interfere na página e no desligamento.** Um JSON legível com `passos: [null]` gerou `TypeError` na leitura da página e na vigia. Na visão geral, um erro de um run rejeita a consulta inteira. A vigia captura a falha e adia o desligamento em todo ciclo. Os leitores devem partilhar a normalização do registro ou isolar campos e arquivos inválidos individualmente. Um estado visual corrompido também impede a abertura pelo fluxo normal, pois `ESTADO:IGNORADO` não aciona a URL, mesmo quando o registro permite mostrar a preparação. Ver `escritorio/leitura.mjs`, `escritorio/vigia.mjs`, `estado.mjs` e `runner/escritorio.md`.
4. **P1 — O fechamento ainda confunde erro de leitura com ausência do registro.** `fechar` usa o leitor que converte falhas de leitura em `null`, então pode substituir o registro existente por um novo sem passos nem marcos se a renomeação for bem-sucedida após a falha de leitura. O código já tem um leitor que propaga erros transitórios nas operações de gravação. O problema existia na base e importa para a nova regra de fechar antes da memória. Duas finalizações simultâneas da mesma crew também podem perder uma linha do histórico porque a leitura e a regravação de `runs.md` não são coordenadas entre processos. Ver `execucao.mjs` e `execucao/registro.mjs`.
5. **P1 — Atividade no disco não identifica a sessão.** O daemon recebe sinais para encerrar o servidor inteiro e não identifica qual run perdeu sua sessão. A abertura de um novo run da mesma crew ainda usa `CAMINHO:ABERTA` por até duas horas com base no registro e pede confirmação de `--nova`; o texto ainda afirma que as duas execuções se misturam. A interação entre o fechamento do Codex App e duas sessões ativas não foi demonstrada. Ver `escritorio/servidor.mjs` e `caminho/aberta.mjs`.
6. **P2 — Falta aplicar a seleção de crew e run também na página.** Com apenas `?crew=`, o Browser consulta a visão geral. Uma consulta direcionada vazia cai na demonstração. Em reconexão, o modelo aceita qualquer resposta com `crews` sem confirmar a identidade da instância e a execução pedida. O aviso de perda de conexão já existe e o polling continua, mas o dado exibido precisa ser explicitamente marcado como a última etapa conhecida. Ver `escritorio/app.js` e `escritorio/modelo-pagina.js`.
7. **P2 — Uma instância existente ainda mostra runs iniciados com o Escritório desligado.** `Dashboard: off` suprime o evento visual e a abertura automática. O leitor novo sintetiza estado direto de `execucao.json` na visão geral, e a vigia também conta esses registros como atividade. Assim, um run iniciado depois de desligar o Escritório ainda pode aparecer em um servidor que já estava aberto e prolongar sua vida. Conferir a transição de preferência com instância ativa e distinguir a leitura histórica manual da inscrição de uma nova execução no Escritório. Ver `escritorio/leitura.mjs` e `escritorio/vigia.mjs`.
8. **P1 — Quatro contratos do runner ficam vermelhos na suíte completa.** `tests/runtime-contracts-u5b.test.js` ainda exige o cabeçalho antigo de `fim-da-execucao.md`, comandos visuais `concluir` e `falhar` e a numeração anterior. A revisão anterior atualizou outros testes focados e deixou essa suíte de fora. Reescrever as asserções afetadas para medir a nova ordem de fechamento e a leitura da parte de memória e resumo.

### Verificação da revisão

- 72 testes focados de Escritório, página, encerramento, retomada e atualização passaram. O teste HTTP do prazo usa `ler: async () => []`; comprova a liberação da porta, com pouca cobertura da leitura real dos registros e de duas execuções ativas.
- Na investigação dos seis casos da suíte completa, identificou-se que o caminho temporário do sandbox contém chaves (`{…}`). O coletor existente rejeita chaves em referências de documentos. As quatro falhas de caminhos absolutos desapareceram ao rodar as quatro suítes com temporário sem chaves dentro de `sandbox/`: 90 de 92 passaram, e restaram os dois testes que precisam criar symlink.
- A revisão também isolou oito testes de Escritório, entrega e limpeza que falham com `EPERM` ao criar junction no sandbox, inclusive com um temporário sem chaves. O teste E1-04h falha na preparação do atalho, antes de exercitar o reaproveitamento do servidor pelo caminho alternativo.
- `npm run verify` nesta revisão: lint passou. Dos 1.711 testes, 1.680 passaram, 29 falharam e 2 foram pulados. As falhas foram quatro contratos do runner, quatro caminhos com chaves e 21 operações de criação de links de pasta (20 `EPERM`, um `ENOENT` no cenário de alvo deliberadamente ausente). A porta de verificação continua vermelha.

## Correções após a revisão

- A abertura distingue processo criado, porta ocupada e página pronta. Tenta outra porta quando o filho termina antes de confirmar e volta a sondar uma disputa. A confirmação do daemon espera pela resposta da porta indicada. Histórico manual e servidor automático anunciam modos distintos.
- A vigia e a leitura da página usam a mesma normalização do registro. Um servidor novo tem seu próprio prazo ocioso. Um arquivo visual ilegível é preservado e o run ainda pode abrir a página com o registro disponível.
- `fechar` preserva o registro em falhas de leitura e emite o marcador de repetição. As atualizações do histórico da mesma crew são serializadas. A trava também protege a atualização de vínculos contra eventos concorrentes.
- `estado.mjs iniciar --sessao` associa um run à sessão quando a integração fornece o identificador. `desvincular` encerra só esse vínculo e mantém o run aberto. O servidor não divulga esse identificador. Sem vínculo verificável, a nova sessão pode iniciar outro run e a vigia usa o prazo de inatividade.
- A página envia o filtro de crew ou execução em todas as consultas e verifica projeto, versão e run antes de aplicar a resposta. Durante a perda de conexão, informa que a etapa exibida é a última conhecida. Um servidor automático já aberto respeita `Dashboard: off` ao ler registros sem estado visual.
- Atualizados os contratos do runner e a aceitação de chaves em caminhos absolutos existentes. Os testes de junção foram executados no Windows fora do sandbox para manter sua cobertura.

### Conferência no Windows

- A instalação sintética em `sandbox/ciclo-aceite-0032984f` foi criada com a ponte Codex. O Browser integrado exibiu `aceite-1` no passo 1 e avançou sozinho para o passo 2. Depois de `execucao.mjs fechar`, exibiu **Concluída** sem um evento visual de conclusão.
- Depois de pouco mais de dois minutos, a aba mostrou a última etapa com aviso de perda de conexão, a porta 4862 deixou de responder e a invocação seguinte reabriu o servidor nela com `aceite-2`. Uma notificação de fim de sessão simulada deixou `aceite-2` retomável.
- Duas invocações automáticas concorrentes na mesma instalação retornaram a porta 4864 com seus próprios identificadores de execução.
- A abertura da aba foi controlada pelo teste com a URL confirmada. A ponte executada por um agente em uma nova conversa e o sinal nativo ao fechar o Codex App não foram observados. A simulação de `desvincular` cobre o protocolo do runtime.
- `npm run verify` passou fora do sandbox do Windows: **1.719 aprovados, zero falhas e dois pulados**. O lint, a sincronização de versão e os testes de conteúdo do pacote também passaram. A bateria de 14 regressões de ciclo, histórico e caminhos absolutos passou dentro do sandbox.
- Sincronização da versão, análise de tamanho e `git diff --check` passaram. As regras de tamanho continuam emitindo avisos não bloqueantes.
