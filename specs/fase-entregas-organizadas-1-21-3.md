# Spec — Entregas organizadas e destino final (candidata 1.21.3)

**Situação:** spec e cenários BDD aprovados pelo dono. Implementação e verificação local concluídas. Aceite manual e publicação pendentes.

## Objetivo

Reunir os arquivos atuais de uma execução durante a aprovação, preservar suas revisões e facilitar sua localização. Ao terminar e aprovar o trabalho, permitir escolher onde guardar a entrega.

## Organização e busca

- Novas execuções de `run` e `pedir` reúnem os arquivos conferidos em `atuais/`, com nomes e grupos declarados pela crew. `historico/` guarda revisões numeradas por arquivo, sem uma pasta por revisão. `INDICE.md` apresenta tema, situação, arquivos atuais e links para as revisões, distinguindo conferido, aguardando aprovação e aprovado.
- `caminho.mjs` reserva área exclusiva por tentativa do passo, com os arquivos relacionados no mesmo grupo. `conferir` preserva as validações existentes e consolida o conjunto completo sob trava da execução. Falha ou interrupção preserva a última versão conferida. Uma edição do usuário em `atuais/` é preservada e a nova revisão conferida é indicada.
- O registro da execução guarda todos os arquivos de cada passo e identifica as revisões aprovadas. Retomada, verificação e entrega usam o registro. Uma correção posterior exige nova aprovação antes da cópia. A entrega mantém os nomes e a associação de imagens e HTML editável.
- `/opencrew buscar "<termo>"` consulta tema e nomes em todas as crews, com filtros opcionais `--crew` e `--run`, sem diferenciar acentos ou maiúsculas. Ordena os mais recentes primeiro e mostra crew, execução, situação e caminho. Material aprovado aponta ao pacote final e à última cópia registrada. Execuções antigas são consultadas no formato existente; as abertas continuam nesse formato até terminar. Sem registro confiável, exibe “aprovação não registrada”.

## Destino da entrega

- O pacote é montado em `output/<execução>/entrega/` com as revisões aprovadas. Depois da última etapa, a crew pergunta onde guardar, oferecendo manter na crew, usar o destino salvo ou indicar outra pasta. Destino já informado para a execução vale como escolha; só vira sugestão futura se o usuário pedir para lembrá-lo.
- São aceitas pastas do projeto, de outro projeto, sincronizadas localmente ou em disco externo. Fora do projeto, a escolha deve ser explícita e a pasta deve existir. O resultado informa o caminho gravado. A sincronização depende do aplicativo de nuvem. Preferências com caminhos absolutos ficam em configuração local ignorada pelo Git.
- Separar montagem local e cópia final em `entregar.mjs`, permitindo copiar o pacote aprovado sem executar a crew novamente. O destino existente da crew vira sugestão. Crew antiga sem checkpoint final pede aprovação explícita antes da cópia. Pendências podem ser corrigidas ou aceitas como ressalvas; deixadas para depois, o pacote fica na crew.
- A cópia reserva uma pasta própria para a execução. A repetição do mesmo pacote reutiliza o recibo. Pacote alterado e aprovado gera reentrega, preservando arquivos e LEIA-ME anteriores. Destino indisponível ou falha de gravação é informado com o link local e permite nova tentativa ou escolha posterior, sem repetir publicação. Cópia externa indisponível não torna uma execução elegível à limpeza por si só.

## Compatibilidade e aceite

- `update` preserva crews, preferências, registros e pastas antigas e instala o runtime novo. O carimbo local permanece 1.21.3.
- A validação deverá cobrir 40 revisões, múltiplos arquivos por passo, concorrência, edição manual, interrupções, rejeição, retomada, aprovação, pedido avulso, busca, upgrade e segurança das gravações. Destinos internos, sincronizados e externos deverão ser exercitados, inclusive falha, colisão, repetição e reentrega.
- Atualizar documentação, changelog e STATUS. Publicação depende de `npm run verify`, aceite em sandbox e Codex App, matriz Windows/Ubuntu em Node 20.17, 22 e 24, e autorização do dono para push e tag.

## Cenários BDD aprovados

- **EO-01** DADA uma nova execução, QUANDO um arquivo é conferido 40 vezes, ENTÃO `atuais/` contém a versão 40 e `historico/` contém as 39 anteriores, agrupadas por arquivo e sem pastas por revisão.
- **EO-02** DADO um passo que produz imagem e HTML relacionados, QUANDO ambos são conferidos, ENTÃO a consolidação preserva seus nomes e associação na entrega e no registro.
- **EO-03** DADO um passo com vários arquivos, QUANDO falta um arquivo ou a consolidação é interrompida, ENTÃO a última coleção conferida continua disponível e nenhuma coleção parcial é anunciada como concluída.
- **EO-04** DADOS processos concorrentes numa execução, QUANDO reservam e conferem tentativas, ENTÃO suas áreas são distintas e o registro e o índice refletem uma consolidação completa sem perda de arquivos.
- **EO-05** DADO um arquivo atual editado pelo usuário, QUANDO uma nova revisão é conferida, ENTÃO a edição permanece intacta e a nova revisão é indicada com seu caminho.
- **EO-06** DADOS uma execução interrompida e arquivos conferidos, QUANDO o usuário retoma, ENTÃO o registro identifica todos os arquivos do passo e a execução continua com a revisão correta.
- **EO-07** DADA uma revisão rejeitada ou uma correção após aprovação, QUANDO há nova versão, ENTÃO o índice a apresenta como pendente e ela só é copiada depois de nova aprovação.
- **EO-08** DADO um pedido avulso, QUANDO é revisado, aprovado e entregue, ENTÃO usa a mesma organização, mantém seu tipo e continua retomável.
- **EO-09** DADOS arquivos e temas em várias crews, QUANDO a busca recebe termo com outra capitalização ou acentuação, ENTÃO mostra resultados correspondentes mais recentes primeiro com crew, execução, situação e caminho; filtros de crew e run restringem os resultados.
- **EO-10** DADAS execuções antigas com pastas `vN`, QUANDO são buscadas ou retomadas, ENTÃO seus caminhos existentes são encontrados e uma execução antiga aberta permanece no formato antigo. Registro ausente ou ilegível resulta em “aprovação não registrada”.
- **EO-11** DADA uma entrega final aprovada, QUANDO o destino não foi informado, ENTÃO a crew pergunta onde guardar, oferece manter na crew, sugere o destino salvo quando existir e aceita outra pasta; só memoriza uma nova sugestão a pedido.
- **EO-12** DADO um destino informado para a execução, QUANDO a entrega final é aprovada, ENTÃO a crew usa essa escolha sem repetir a pergunta de destino.
- **EO-13** DADO um pacote aprovado, QUANDO o usuário escolhe pasta existente do projeto, de outro projeto, sincronizada localmente ou em disco externo, ENTÃO o pacote é copiado para pasta própria da execução e o caminho efetivo é informado.
- **EO-14** DADO um destino externo ausente, desconectado ou sem permissão, QUANDO a cópia falha, ENTÃO a entrega local continua acessível, o motivo e caminho são mostrados e o usuário pode tentar outro destino sem refazer trabalho ou publicação.
- **EO-15** DADA uma cópia concluída, QUANDO o mesmo pacote é copiado novamente ao mesmo destino, ENTÃO o recibo é reutilizado. Quando o pacote muda e é novamente aprovado, uma reentrega é criada e os arquivos e LEIA-ME anteriores permanecem intactos.
- **EO-16** DADAS cópias concorrentes ou uma pasta de destino já existente com o nome da execução, QUANDO a entrega é copiada, ENTÃO a reserva é exclusiva e dados anteriores são preservados.
- **EO-17** DADA uma crew antiga sem checkpoint final, QUANDO termina o trabalho, ENTÃO o pacote é mostrado e a cópia aguarda aprovação explícita. Pendência deixada para depois mantém o pacote na crew; ressalva aceita fica registrada.
- **EO-18** DADA uma cópia externa indisponível, QUANDO a limpeza avalia a execução, ENTÃO a cópia indisponível, sozinha, não a torna elegível à exclusão e a confirmação existente é preservada.
- **EO-19** DADO um workspace anterior à 1.21.3 com crews, preferências, registros e execuções antigas, QUANDO roda `update`, ENTÃO os dados são preservados e o novo runtime fica disponível.
- **EO-20** DADAS gravações de revisão, índice e entrega, QUANDO falham ou terminam, ENTÃO a árvore fora dos locais autorizados permanece intacta e os temporários próprios são tratados com segurança.
- **EO-21** DADA uma sugestão contendo caminho absoluto, QUANDO é lembrada, ENTÃO fica em configuração local ignorada pelo Git e o destino anterior da crew continua disponível como sugestão.
