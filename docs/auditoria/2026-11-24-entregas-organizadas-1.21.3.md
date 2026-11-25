# Aceite local das entregas organizadas da 1.21.3

## Evidências

- Com a versão anterior do código, o teste EO-01 falhava porque `atuais/texto.md` não existia. Na candidata, a revisão 40 fica em `atuais/` e as 39 anteriores ficam no histórico do arquivo.
- Uma tentativa com HTML e imagem em que a imagem faltava foi recusada antes de a coleção ser consolidada. Uma interrupção simulada entre a troca de um arquivo e o registro do lote foi recuperada ao consultar a entrada.
- Uma edição manual da saída atual permaneceu no disco quando chegou uma nova revisão. O pacote anterior perdeu a autorização para nova cópia. Depois do aceite da nova revisão, uma reentrega foi criada e o LEIA-ME da cópia anterior foi preservado.
- O aceite pelo terminal rodou numa instalação isolada com a ponte Codex. Exercitou pedido, retomada, busca sem acentos, aprovação, sugestão da crew e cópia para outra pasta com espaço no nome, fora da raiz do projeto de teste. Repetir a cópia manteve uma única pasta de destino.
- O teste EO-19 confirmou que o update da 1.21.2 instala os scripts novos e preserva preferências, o registro e os arquivos legados. O teste de concorrência confirmou que duas cópias do mesmo pacote retornam o mesmo destino, mesmo com o nome inicial ocupado.
- A verificação completa em Windows com Node 24.14.0 passou com 1.737 testes aprovados, zero falhas e dois pulados. Carimbo e pacote sincronizados em 1.21.3.

## Aceite antes de publicar

O dono confirmou que, no primeiro teste interativo pelo Codex CLI, o navegador abriu automaticamente e o Escritório mostrou a crew avançando. Essa observação valida o fluxo no primeiro teste. O erro de conexão e a falha de abertura no reteste seguem como ocorrências separadas.

Após os ajustes de porta e contenção, a suíte completa voltou a passar no Windows com Node 24.14.0. Foram 1.737 aprovados, zero falhas e dois pulados, com código de saída 0.

A bateria automatizada confirmou HTTP 200 para a página e o estado da execução ativa, inclusive a mudança do passo 1 para o 2. O ensaio iniciou e encerrou seu próprio servidor. Ele não valida a abertura do navegador pelo Codex CLI.

Na primeira suíte completa, dois testes do Escritório misturavam sondagens simuladas com o uso real da porta 4747. O bind direto nessa porta retornou `EADDRINUSE`, e o preparo anunciou corretamente os links em 4748. Os testes agora controlam a sondagem de identidade e a disponibilidade da porta. Na mesma suíte, oito de doze processos concorrentes ficaram pendentes ao gravar marcos. A trava ganhou prazo de espera de 12 segundos, com variação no intervalo entre tentativas. Os três casos passaram no reteste focado.

O reteste interativo no Codex CLI, run `2026-11-24-111303`, passou na escolha do destino interno. A crew perguntou onde guardar antes do menu final, copiou para `Entregas`, registrou o recibo e fechou como aprovada com 1/1. Texto e LEIA-ME da cópia têm os mesmos hashes do pacote local. Os marcos da revisão e da aprovação foram gravados. O Escritório voltou a não abrir automaticamente e a sessão ofereceu um link manual. O acesso por esse link não foi confirmado.

No aceite interativo do Codex CLI, a execução `2026-11-24-095937` chegou ao checkpoint 3. A conferência consolidou texto e parecer em `atuais/` e o índice aponta para ambos. O registro permanece aberto, com `marcos: []`. O relato não demonstra a chamada do verificador automático, e a pasta `entrega/` ainda não existe. A revisão humana no fluxo e a escolha de destino ainda precisam ser exercitadas.

O comando de confirmação devolveu a URL exata da execução. O Edge apresentou `ERR_CONNECTION_REFUSED` depois disso. A consulta posterior desta sessão não encontrou listener na porta 4747. O PID informado no relato indicava um processo Node, o que por si só não comprovava que o servidor ainda escutava. A causa permanece em investigação.

1. Abra o workspace de teste em `sandbox/codex-entregas-aZyRNT`. No Codex CLI, envie `$opencrew run texto-de-teste`. No Codex App, peça para rodar a crew `texto-de-teste` com o OpenCrew. Confirme a abertura do Escritório e confira o arquivo em `atuais/`.
2. Peça uma correção, confira o índice e retome o mesmo run. Aprove a revisão e confirme que a escolha do destino ocorre após a última etapa.
3. Use um material de teste para conferir a gravação num diretório sincronizado e num HD ou SSD externo. Desconecte a unidade antes de outra cópia e confira se o pacote local permanece acessível. O aplicativo da nuvem confirma o estado da sincronização.
4. Com a verificação local e o aceite concluídos, prepare a candidata para revisão. Push e tag dependem de autorização do dono e a publicação depende da matriz Windows/Ubuntu com Node 20.17, 22 e 24.
