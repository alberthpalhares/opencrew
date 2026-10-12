# Spec — Fase E3: Conversa e entrega visíveis, e escritório do tamanho da crew

- **Fase:** E3 · **Módulos:** Runtime (`templates/_opencrew/core/escritorio/`: `animacao.js`, `quadro.js`, `rotulos.js`, `modelo-agentes.js`, `modelo-visao.js`, `modelo-textos.js`, `modelo-mesas.js`, `rota.js`, `cena.js`, `sprites-sala.js` e um módulo novo de móveis, `painel.js`, `app.js`, `index.html`, `demo.js`, `escala.js`, `folha.js`) + README + CHANGELOG + testes. `estado.mjs`, o runner e o CLI não mudam · **Status:** implementada (1.19.0, 2026-10-12); aguarda a conferência visual do dono. Aprovada pelo dono em 2026-10-12 (as 7 decisões, mais o dia e a noite da regra 19); o dono quer ver a folha com as salas antes da tag
- **Versão:** a próxima minor livre (1.19.0, se a U6 fatia 3 não sair antes).
- **Termos novos no GLOSSARIO.md:** sim — Fala (balão de fala), Sala (do escritório), Período (do dia)
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** dois pedidos do dono em 2026-10-12: "não vi os personagens falando, balão de diálogo, nem vi eles se movimentando de uma mesa para outra pra entregar a demanda"; e "o escritório acompanhar o crescimento da crew: escritórios menores pra crews menores e maiores para crews maiores, com outros elementos de cenário, como tapete, estante de livros, abajur".
- **Depende de:** E1 (1.7.0), regras 18, 24 e 28; E2 (1.18.0).

**O que existe hoje e por que não se vê** (conferido no navegador em 2026-10-12):
- A caminhada existe: a cada passagem de bastão, quem entrega anda até a mesa de quem recebe, com
  o papel, e volta. Dura **4 segundos** no total, uma vez por passo. Numa execução real um passo
  leva minutos: quem não está olhando naquele instante não vê.
- A frase da entrega existe no `state.json` (`--mensagem`, que o runner já grava em todo passo),
  mas só aparece numa linha de texto do painel ("Última passagem de bastão: …"). **Ninguém fala.**
- O único balão sobre os bonecos é o rótulo do passo de quem trabalha e "aguardando você".
- Numa janela de 1024 px o desenho fica na **escala 1** (320×180 px): os bonecos têm 16 px.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Os bonecos falam o que a execução gravou, não frases inventadas.** A fala da entrega é a
   `mensagem` do passo; as demais são textos fixos e curtos (§3). Nada é gerado por IA na página.
2. **A entrega passa de 4 para cerca de 10 segundos**, com uma parada na mesa de quem recebe,
   onde acontece a conversa.
3. **Dá para rever a última entrega** com um clique, porque numa execução real ela acontece uma
   vez a cada vários minutos.
4. **O desenho ganha espaço:** em janela estreita o painel da equipe desce para baixo do desenho,
   para a cena ocupar a largura toda.
5. **Quatro tamanhos de sala, pelo número de agentes do elenco** (§2B). Sala menor tem menos
   pixels e por isso aparece **maior na tela**: numa crew de 3, os bonecos ficam bem mais visíveis.
6. **Os móveis de cenário são os mesmos para a mesma crew** (escolhidos pelo nome dela): cada
   crew tem o "seu" escritório, que não muda de uma execução para a outra, só quando o elenco
   muda de faixa.
7. **Tudo numa versão só** (conversa + salas), porque o tamanho da sala muda a geometria de que
   os balões e a caminhada dependem; em duas versões, a segunda refaria os testes da primeira.

## 1. Objetivo
Quem abre o escritório durante uma execução vê a equipe trabalhar **e conversar**: a entrega de
um agente ao outro é lenta o bastante para ser vista, tem fala de quem entrega e resposta de quem
recebe, e pode ser revista. O desenho deixa de ficar minúsculo em janela comum.

## 2. A entrega, passo a passo
| Momento | Duração | O que se vê |
|---|---|---|
| Ida | 3 s | Quem entrega levanta, anda até a frente da mesa de quem recebe, com o papel |
| Conversa | 4 s | Parado diante da mesa. Balão de fala de quem entrega, com a mensagem (2,5 s); depois, balão de quem recebe, com a resposta (1,5 s). O papel passa para a mesa de quem recebe |
| Volta | 3 s | Volta sem o papel e senta. Quem recebeu já está digitando |

8. **(pedido do dono em 2026-10-12) Dia e noite pelo horário real** de quem está olhando (o
   relógio do navegador), regra 19.

## 2B. As salas
| Sala | Elenco | Tela lógica | Mesas | O que tem além das mesas |
|---|---|---|---|---|
| Pequena | 1 a 3 | 240×126 (3 colunas × 2 linhas) | 3, na linha de cima | tapete com sofá ou poltronas na linha de baixo, 1 estante, 1 abajur, 1 planta |
| Média | 4 a 6 | 320×126 (4 × 2) | até 6 | tapete num canto livre, 1 estante, 1 abajur, plantas, bebedouro |
| Grande | 7 a 9 | 320×180 (4 × 3) | até 9 | canto de reunião (tapete + mesa baixa) nas células livres, 2 estantes, quadro branco, bebedouro, plantas |
| Completa | 10 a 12 | 400×180 (5 × 3) | 12, nas 4 primeiras colunas | a quinta coluna inteira é a área comum: sofá, tapete, estante, máquina de café, abajur |

O elenco conta todos os agentes do `state.json`, inclusive os pulados. Do 13º em diante, como
hoje: aparecem só na lista (regra 19 da E1), na sala Completa. Móveis novos, todos em matriz de
pixels: tapete (2 padrões), estante de livros, abajur de chão, sofá, poltrona, mesa baixa,
bebedouro, máquina de café, quadro branco, quadro de parede e mais 1 planta.

## 3. Regras
1. **Fala da entrega.** O texto é `handoff.message`. Sem mensagem: "Pronto, é com você.". A
   resposta de quem recebe é fixa: "Deixa comigo.". Mensagem longa é cortada no balão em 60
   caracteres visíveis, com "…", sem partir palavra ao meio quando der; o texto inteiro continua
   na linha do painel.
2. **Balão de fala ≠ balão de status.** O de fala tem rabicho apontando para quem fala e fundo
   claro; o de status (rótulo do passo, "aguardando você") continua como é. Durante a conversa,
   o balão de status dos dois envolvidos some, para não sobrepor.
3. **Falas fixas dos outros momentos**, cada uma por 3 s, sobre o boneco, quando o status dele
   muda entre duas leituras: começou a trabalhar → o rótulo do passo, como fala ("Escrever o
   texto"); terminou (execução concluída) → "Pronto!"; falhou → "Deu problema."; checkpoint →
   continua o balão de status "aguardando você" (não é fala; fica enquanto durar). Depois dos
   3 s, vale o balão de status de hoje.
4. **O balão nunca sai da cena** nem cobre o nome de outra mesa: perto da borda ele se desloca
   para dentro; o rabicho continua apontando para quem fala. Texto por `textContent` (regra 24
   da E1).
5. **Tudo nasce da diferença entre duas leituras** (regra 28 da E1): abrir a página no meio de
   uma execução não dispara entrega nem fala. Aba oculta: ao voltar, a entrega cujo tempo já
   passou aparece terminada.
6. **Entregas em fila.** Se uma passagem nova chega enquanto a anterior ainda anda, a anterior
   termina na hora (o boneco aparece sentado) e a nova começa. Nunca dois bonecos andando.
7. **Rever.** A linha "Última passagem de bastão" do painel vira um botão ("Rever entrega"): ao
   clicar, a entrega daquela passagem roda de novo, do início. Vale teclado (Enter e espaço) e
   tem nome acessível. Sem passagem, não há botão. Enquanto uma entrega anda, o clique a recomeça.
8. **Reduzir movimento** (preferência do sistema): sem caminhada, como hoje; a fala da entrega
   aparece assim mesmo, sobre quem entrega sentado, e a resposta sobre quem recebe, nos mesmos
   tempos da conversa.
9. **Espaço do desenho.** Com menos de 1.100 px de largura útil, o painel da equipe fica abaixo
   do desenho, e a cena usa a largura inteira (numa janela de 1024 px: escala 3). Acima disso,
   fica ao lado, como hoje. A escala continua inteira (regra 16 da E1).
10. **Demonstração.** O roteiro mostra as três entregas com fala e resposta, uma falha com
    "Deu problema." e a conclusão com "Pronto!". As cenas ficam longas o bastante para a entrega
    inteira caber.
11. **Nada novo é gravado.** O `state.json` e os comandos do runner são os de hoje.
12. **Tamanho.** Cada arquivo de `escritorio/` em até 200 linhas.
13. **A sala é escolhida pelo elenco** (§2B) a cada leitura. Durante uma execução o elenco não
    muda, então a sala não muda. Ao trocar de crew no seletor, a sala troca na hora, sem animação
    de entrega nem fala (é "primeira leitura", regra 5).
14. **Geometria por sala.** Mesas, vãos de passagem, rota da entrega, posição dos nomes e dos
    balões são calculados para a sala em uso; nada mais supõe 320×180. A célula continua 80×54 e
    o boneco, 16×16. A escala continua inteira, calculada para a tela lógica da sala.
15. **Cenário não atrapalha.** Móvel de chão só ocupa célula sem mesa e fica fora dos vãos por
    onde a entrega passa; nenhum boneco, andando ou parado, cruza um móvel. Tapete fica sob os
    pés (pode ser pisado). Estante, quadro e quadro branco ficam encostados na parede do fundo e
    não cobrem janela, relógio nem o balão da primeira linha de mesas. Abajur aceso é enfeite
    fixo: sem animação.
16. **Cenário estável.** Quais móveis opcionais entram e de que lado ficam sai do nome da crew
    (a mesma semente da E2): a mesma crew, com o mesmo elenco, tem sempre a mesma sala.
17. **A ordem das mesas não muda:** a do elenco, da esquerda para a direita, de cima para baixo;
    a cor da camisa continua pela posição (regra 16 da E1).
18. **Folha de conferência.** `?folha=1` ganha as quatro salas vazias, com os móveis, para o
    dono aprovar o desenho — cada uma de dia e de noite.
19. **Dia e noite.** O período sai da hora local do navegador: manhã (6h às 9h59), dia (10h às
    16h59), entardecer (17h às 18h59) e noite (19h às 5h59). Muda o céu das janelas (claro; azul;
    alaranjado; escuro com lua e estrelas) e, à noite, a sala fica um pouco mais escura, os
    abajures aparecem acesos, com um halo claro no chão e na parede, e os monitores ligados
    continuam com a cor cheia. Nomes, balões e painel não escurecem: o texto continua legível
    (o escurecimento é só no canvas). A troca de período acontece sozinha, com a página aberta,
    na leitura seguinte à virada da hora, sem animação. O relógio da parede mostra a hora real
    (ponteiros em passos de 5 minutos). `?periodo=manha|dia|entardecer|noite` força um período,
    para conferência e para a folha. A hora entra no modelo por parâmetro (regra de pureza da E1).

## 4. Cenários
- **E3-01a** DADA uma passagem nova entre duas leituras ENTÃO, pelo tempo: de 0 a 3 s quem
  entrega anda com o papel; de 3 a 7 s está parado diante da mesa de quem recebe; de 7 a 10 s
  volta sem o papel; aos 10 s está sentado.
- **E3-01b** DADA a conversa ENTÃO de 3 a 5,5 s a fala é de quem entrega, com a mensagem; de 5,5
  a 7 s é de quem recebe, "Deixa comigo."; fora disso não há fala de entrega.
- **E3-01c** DADA uma passagem sem mensagem ENTÃO a fala é "Pronto, é com você."; DADA uma
  mensagem de 200 caracteres ENTÃO o balão tem até 60, termina em "…" e o painel traz o texto
  inteiro; DADA uma mensagem com `<b>` ENTÃO aparece como texto.
- **E3-01d** DADA a primeira leitura de uma crew já com passagem ENTÃO ninguém anda e ninguém fala.
- **E3-01e** DADA uma passagem nova aos 2 s de outra ENTÃO só o boneco da nova anda, do início.
- **E3-02a** DADO um agente que passa de `idle` a `working` entre duas leituras ENTÃO por 3 s há
  a fala com o rótulo do passo; depois, o balão de status; DADA a execução que passa a
  `completed` ENTÃO "Pronto!"; a `failed` ENTÃO "Deu problema." no agente que falhou.
- **E3-02b** DADOS os dois envolvidos numa conversa ENTÃO o balão de status deles não aparece
  enquanto ela dura.
- **E3-03a** DADO um balão na primeira e na última mesa da fileira ENTÃO ele está inteiro dentro
  da cena, e o rabicho aponta para o boneco.
- **E3-04a** DADA uma passagem já terminada QUANDO o botão "Rever entrega" é acionado (clique,
  Enter ou espaço) ENTÃO a entrega roda de novo do início; sem passagem ENTÃO não há botão.
- **E3-05a** DADO "reduzir movimento" ENTÃO todos ficam sentados, e as duas falas aparecem nos
  tempos da conversa.
- **E3-06a** DADA a largura útil de 1.000 px ENTÃO o painel está abaixo do desenho e a escala é
  3; DADA a de 1.400 px ENTÃO o painel está ao lado.
- **E3-07a** DADA a demonstração ENTÃO cada cena com passagem dura pelo menos 10 s, e o roteiro
  passa pelas falas da regra 10.
- **E3-08a** DADOS elencos de 1, 3, 4, 6, 7, 9, 10, 12 e 14 agentes ENTÃO a sala é Pequena,
  Pequena, Média, Média, Grande, Grande, Completa, Completa e Completa, com a tela lógica da §2B;
  toda mesa está inteira dentro da sala e nenhuma se sobrepõe.
- **E3-08b** DADA cada sala cheia ENTÃO, para todo par de mesas, a rota da entrega fica dentro
  da sala e não cruza tampo de mesa nem móvel de chão; e o ponto de parada diante de quem recebe
  está livre.
- **E3-08c** DADA cada sala ENTÃO nenhum móvel de chão ocupa célula com mesa; os de parede não
  cobrem janela nem relógio; todo móvel está inteiro dentro da sala; e toda matriz de móvel só
  usa letras da paleta dela.
- **E3-08d** DADO o mesmo nome de crew e o mesmo elenco ENTÃO os móveis e as posições são os
  mesmos; DADOS 30 nomes diferentes ENTÃO aparece mais de um arranjo em cada sala.
- **E3-08e** DADA a sala Pequena numa área de 1000×600 ENTÃO a escala é 4; a Completa na mesma
  área, 2; os nomes e os balões ficam sobre as mesas certas nas quatro salas.
- **E3-08f** DADA a troca de uma crew de 3 para uma de 8 no seletor ENTÃO a sala muda e não há
  entrega, fala nem erro.
- **E3-09a** DADAS as horas 5h59, 6h, 9h59, 10h, 16h59, 17h, 18h59 e 19h ENTÃO o período é
  noite, manhã, manhã, dia, dia, entardecer, entardecer e noite; DADO `?periodo=noite` ao
  meio-dia ENTÃO noite; valor desconhecido ENTÃO vale a hora.
- **E3-09b** DADA a noite ENTÃO o céu das janelas usa as cores da noite, há lua, o abajur está
  aceso e as cores do piso e da parede pintadas são mais escuras que as do dia; a cor da tela de
  um monitor ligado é a mesma do dia; DADO o dia ENTÃO nada é escurecido e o abajur está apagado.
- **E3-09c** DADA uma leitura às 18h59 e outra às 19h ENTÃO o período muda, sem entrega e sem
  fala; o relógio da parede às 15h20 aponta 3 e 4.
- **E3-upg** DADO um workspace 1.18.0 QUANDO roda o `update` ENTÃO a página nova é servida e um
  `state.json` gravado pela 1.18.0 é desenhado sem erro.

## 5. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código; `npm run verify` verde.
- [ ] **Conferência no navegador** (quem implementa): a demonstração inteira, com capturas da
      ida, da fala, da resposta e da volta, em 1024 px e em 1600 px de largura, sem erro no
      console; e uma execução dirigida à mão com `estado.mjs` numa crew de teste.
- [ ] **Conferência no navegador das quatro salas** (quem implementa): a folha com as salas e
      uma crew de teste de cada faixa, com uma entrega dirigida à mão em cada uma.
- [ ] **Conferência do dono** numa execução real de uma crew dele.
- [ ] README, CHANGELOG e GLOSSARIO no mesmo commit; release pelo caminho de sempre.

## 6. Fora desta fase
| O que não entra | Alocação |
|---|---|
| Falas escritas pela IA durante o passo ("estou lendo as fontes…") | → sem fase — exigiria o runner gravar texto novo a cada momento; só com pedido |
| Conversa de ida e volta com várias falas; agentes andando sem motivo (café, visita) | → sem fase — enfeite; cabe depois, sobre esta base |
| Som | → sem fase |
| Clima (chuva, sol), estações, horário de outro fuso ou do servidor | → sem fase — vale o relógio de quem olha |
| Sala que cresce com animação (parede abrindo), salas com vários cômodos, andares | → sem fase — enfeite |
| Escolher os móveis ou o tema da sala por crew (configuração) | → sem fase — só com pedido; hoje sai do nome da crew |
| Bonecos usando os móveis (sentar no sofá, pegar café) | → sem fase — cabe depois, sobre esta base |
| Histórico das entregas da execução (rever qualquer uma, não só a última) | → sem fase — o `state.json` só guarda a última passagem |
| Revisor devolvendo o texto (entrega no sentido contrário) | → sem fase — hoje o runner grava a devolução como um passo comum; ela aparece como entrega normal |

## 7. Limites conhecidos
- A fala só existe se o runner gravar a `mensagem` do passo; crew rodada sem o escritório ligado
  não tem o que mostrar depois.
- Uma entrega por passo: numa execução de 5 passos são 4 conversas. O botão de rever cobre a última.
- O balão corta a mensagem em 60 caracteres; frase longa só se lê inteira no painel.
- A sala muda de tamanho quando o elenco muda de faixa (de 3 para 4 agentes, por exemplo): os
  móveis são outros, porque o espaço é outro.
- Na sala Completa (10 a 12) a tela lógica é mais larga (400): em janela estreita ela fica numa
  escala menor que a das outras salas.

### Desvios e escolhas da implementação (1.19.0)
O que a spec não dizia, ou dizia de outro jeito, e como ficou. O código manda (regra 9 do AGENTS.md).
- **Módulos novos** em `escritorio/`, além dos listados no cabeçalho: `modelo-periodo.js`,
  `modelo-moveis.js`, `modelo-ambiente.js`, `modelo-falas.js`, `cena-sala.js`, `sprites-parede.js`,
  `sprites-moveis.js` e `folha-salas.js` (todos na lista fechada do `escritorio.mjs`). O modelo de
  cada leitura ganhou `ambiente` (`sala`, `moveis`, `periodo`, `relogio`) e `falas`.
- **"Largura útil" (regra 9) é a largura da janela.** O painel desce por regra de estilo
  (`max-width: 1099px`); o teste E3-06a confere a função pura `disposicao` e o contrato dela com a
  folha de estilo (limite e margens), porque nenhum teste abre navegador. Com o painel abaixo, as
  margens são 12 + 6 px de cada lado: com 1.000 px sobram 964 para a cena (escala 3 na sala Grande).
- **"Rever entrega" (regra 7) é um botão ao lado da linha, não a linha.** A linha "Última
  passagem de bastão" continua como texto, com a mensagem inteira (regra 1), e o `<button>` "Rever
  entrega" fica ao lado dela, descrito por ela (`aria-describedby`).
- **Mesas: só as de quem está no elenco.** "3" e "12" mesas da §2B são os lugares da sala; uma
  crew de 1 agente na sala Pequena tem 1 mesa desenhada, como na E1.
- **Onde ficam os móveis de chão.** Em células que nunca têm mesa: a linha de baixo na Pequena, as
  duas últimas colunas da linha de baixo na Média, as três últimas da linha de baixo na Grande, a
  quinta coluna na Completa. Numa crew de 4 na Média, as duas primeiras células da linha de baixo
  ficam só com o piso.
- **A rota ganhou um trecho.** Quando quem recebe está numa linha abaixo e em outro vão, a entrega
  vai pelo corredor da frente da linha de quem entrega (6 pontos em vez de 4): assim nenhum trecho
  passa por célula sem mesa.
- **Parede.** Na Grande o quadro branco fica no lugar de uma das 4 janelas. Na Completa a quinta
  coluna não tem janela: tem a estante, a máquina de café e o abajur.
- **Halo do abajur.** É uma luz translúcida em volta da cúpula e no chão; ela só alcança a parede
  quando o abajur está junto dela (sala Completa).
- **O que não escurece à noite:** além da tela dos monitores e do abajur aceso, o céu e o caixilho
  das janelas e os sinais sobre a cabeça (✓, "!" e "?").
- **Quem diz "Pronto!":** quem estava trabalhando na leitura anterior; se ninguém estava, o último
  agente concluído. **Quem diz o rótulo do passo:** todo agente cujo status passa a `working`
  entre duas leituras (também ao retomar depois de uma falha). Quem está andando não fala.
- **Balão de fala.** Tem até 104 px lógicos de largura e quebra em linhas; o de quem entrega fica
  sobre a mesa de quem recebe. Na vertical ele cabe entre a faixa de nomes da linha de cima e a
  cabeça de quem fala: na menor escala (1), um texto de 60 caracteres pode ser cortado na altura.
- **Tapetes e halo** são matrizes de pixels geradas por função (do tamanho pedido), não escritas
  linha a linha.
- **Folha.** O desenho de noite de cada sala mostra o arranjo oposto ao de dia (o outro lado, o
  outro assento, o outro tapete), para as duas variações aparecerem; `?folha=salas` e
  `?folha=personagens` mostram uma parte só.
- **Mensagem.** O `estado.mjs` já limita a `mensagem` a 120 caracteres ao gravar: o "texto
  inteiro" do painel é o que foi gravado.
- **Testes da E1/E2 atualizados** (não apagados): os que supunham 320×180 fixo, a entrega de 4 s e
  uma sala sem móveis — `tests/escritorio-animacao.test.js`, `-modelo`, `-pagina` e `-folha`. Os
  cenários E1-06a e E1-06d foram para `tests/escritorio-fontes.test.js`, sem mudança.
- **Não conferido por quem implementou:** a animação correndo em tempo real (a conferência no
  navegador foi quadro a quadro, com o relógio da página parado em cada instante) e a preferência
  "reduzir movimento" no navegador (só nos testes).
