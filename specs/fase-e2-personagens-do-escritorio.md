# Spec — Fase E2: Personagens do escritório (feminino e masculino, mais peles, cabelos e olhos)

- **Fase:** E2 · **Módulos:** Runtime (`templates/_opencrew/core/escritorio/`: `sprites.js`, `sprites-rosto.js` novo, `modelo-agentes.js`, `cena.js`, `demo.js`; `scripts/estado/elenco.mjs` e `nucleo.mjs`; `prompts/build.prompt.md`; `scripts/conserto/` no ponto que refaz o `crew-party.csv`) + README + CHANGELOG + GLOSSARIO + testes. O CLI (`src/`) não muda · **Status:** implementada (1.18.0, 2026-10-12); aguarda a conferência visual do dono
- **Versão:** 1.18.0.
- **Termos novos no GLOSSARIO.md:** sim — Personagem (do escritório)
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** pedido do dono em 2026-10-12: "mais opções de personagens, com mais tons de pele, com tipos de cabelo diferentes, cor dos olhos… Separar personagem feminino de masculino".
- **Depende de:** E1 (1.7.0, `specs/fase-e1-escritorio-ao-vivo.md`), regras 16 e 18.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Quem diz se o personagem é feminino ou masculino é a crew, não um sorteio.** O
   `crew-party.csv` ganha uma coluna opcional, `personagem`, com `feminino` ou `masculino`. Crew
   nova: quem cria a crew preenche conforme o nome que deu ao agente ("Rita Redação" → feminino).
   Crew antiga, sem a coluna: o escritório escolhe pelo `id`, sempre igual para o mesmo agente; o
   dono pode pedir à IA para acrescentar a coluna. Não adotado: adivinhar pelo nome (erra) e só
   sortear (a "Renata" pode sair com o boneco masculino).
2. **Pele, cabelo e olhos continuam escolhidos pelo escritório, a partir do `id`** — não há
   configuração por agente. Um agente tem sempre a mesma aparência, em qualquer mesa e execução.
   Configurar agente por agente fica fora (§6).
3. **A aparência dos agentes que já existem muda uma vez**, ao atualizar: há mais opções e a
   conta é outra. Depois disso fica estável.
4. **Sem imagem no pacote:** os personagens continuam sendo matrizes de pixels em código, 16×16.
5. **(decidido pelo dono em 2026-10-12) Peles e cabelos são paletas novas, feitas do zero**, com as
   quantidades aprovadas (8 e 9): as de hoje têm pouca variação. Nenhuma cor atual é reaproveitada
   por obrigação. Os valores propostos estão na §2 e ainda dependem do olho do dono.

## 1. Objetivo
Hoje todos os bonecos do escritório saem do mesmo molde: muda a cor da camisa, do cabelo (6) e da
pele (5). Com 5 agentes na sala, parecem cópias. Esta fase dá ao escritório personagens que se
distinguem de relance: dois moldes (feminino e masculino), cortes de cabelo diferentes, mais tons
de pele e de cabelo, e olhos coloridos.

## 2. Saídas
| Peça | Hoje | Depois |
|---|---|---|
| Molde | 1 | 2: feminino e masculino (silhueta do tronco e da roupa diferente) |
| Corte de cabelo | 1 | 5 por molde (10 no total), entre eles: curto, médio, longo, cacheado/crespo com volume, preso (coque ou rabo), raspado/careca |
| Tom de pele | 5 | 8, paleta nova, do mais claro ao mais escuro, com passos parecidos de luminosidade: `#fde4d2`, `#f4c9a4`, `#e5ac7b`, `#cf8e5a`, `#b0713f`, `#8b5431`, `#663b23`, `#432617` |
| Cor de cabelo | 6 | 9, paleta nova: preto `#15131c`, castanho-escuro `#3a2318`, castanho `#7b4a2b`, ruivo `#b8452a`, loiro-escuro `#b98a45`, loiro `#efcf6a`, grisalho `#8f96a3`, branco `#f0ece2` e azul de tintura `#3f7fe0` |
| Cor dos olhos | — (ponto de tinta) | 4: castanho-escuro `#2e1a10`, castanho-claro `#a9682e`, verde `#3f9a5c` e azul `#3b86d8` |
| Camisa | 12, pela mesa | igual (regra 16 da E1) |

Combinações por molde: 5 × 8 × 9 × 4 = 1.440, menos as duplas próximas demais (regras 3 e 4).

## 3. Regras
1. **Dois moldes, as mesmas poses.** Cada molde tem as poses da E1 (parado, digitar, andar, mão
   levantada, festa, papel, espelhado). Corte de cabelo e pose se combinam: nenhum corte some,
   quebra ou muda de lugar quando o boneco levanta o braço ou comemora.
2. **O contorno continua de 16×16**, com o contorno em tinta. Corte com volume cabe na matriz;
   nenhum pixel sai dela. O sinal sobre a cabeça e o balão ficam onde estão.
3. **Olhos.** Um pixel por olho, na cor sorteada. Se a cor sorteada fica próxima demais da pele
   (diferença de cor abaixo do mínimo: castanho-escuro na pele 8, castanho-claro na pele 5), vale
   a cor de olhos seguinte da lista. O teste confere que, para as 8 peles, a cor final nunca está
   abaixo do mínimo.
4. **Cabelo × pele.** Mesma regra: cabelo próximo demais da pele (castanho na pele 6, loiro na
   pele 2) dá lugar à cor de cabelo seguinte da lista. Com paletas largas as duas não podem ser
   distintas em todas as 72 duplas; a troca garante que o cabelo sempre se destaca do rosto.
5. **De onde vem cada escolha.** Molde: a coluna `personagem` (`feminino`/`masculino`, sem
   diferenciar maiúsculas, com ou sem acento; `f`/`m` valem); ausente, vazia ou outro valor → pelo
   `id`. Corte, pele, cabelo e olhos: sempre pelo `id`, cada um por um trecho diferente da mesma
   semente (a FNV-1a da E1), para não andarem juntos. Camisa: pela mesa.
6. **Estável.** O mesmo `id` e o mesmo `personagem` dão sempre o mesmo boneco. Trocar de mesa só
   muda a camisa.
7. **Elenco.** `estado.mjs iniciar` lê a coluna `personagem` do `crew-party.csv`, se existir, e
   grava `personagem` em cada agente do `state.json` (`feminino`, `masculino` ou ausente).
   `state.json` antigo, sem o campo, é lido como hoje. Valor estranho no arquivo é ignorado, nunca
   erro (regra 2 da E1: o estado nunca derruba a execução).
8. **Crew nova.** O `build.prompt.md` passa a escrever o cabeçalho
   `id,displayName,title,icon,path,execution,personagem` e manda preencher conforme o nome do
   agente. O conserto `manifesto` (U4a), ao refazer o arquivo, mantém a coluna e os valores que
   já existiam; não inventa valor para quem não tinha.
9. **Crew antiga não é tocada.** Nada é gravado no `crew-party.csv` de ninguém pelo `update`. Sem
   a coluna, tudo funciona (regra 5).
10. **A lista ao lado do desenho** (painel) não muda: nome, ícone e status.
11. **Demonstração.** Os cinco agentes do modo demo declaram `personagem` conforme o nome e saem
    com cortes, peles e olhos diferentes entre si.
12. **Tamanho.** Cada arquivo de `escritorio/` continua em até 200 linhas; as matrizes dos cortes
    e dos moldes vão para módulo próprio.

## 4. Cenários
- **E2-01a** DADOS os dois moldes e os 5 cortes de cada ENTÃO toda matriz tem 16 linhas de 16
  letras, só com letras da paleta, em todas as poses (com e sem papel, festa, espelhado).
- **E2-01b** DADOS dois cortes do mesmo molde ENTÃO as matrizes da pose parada são diferentes; e
  o molde feminino é diferente do masculino com o mesmo corte.
- **E2-01c** DADA a pose de mão levantada e a de festa ENTÃO os pixels de cabelo do corte estão
  lá, e o braço também.
- **E2-02a** DADAS as 8 peles ENTÃO estão em ordem, da mais clara à mais escura, e a
  luminosidade da primeira é pelo menos 4 vezes a da última; DADAS as 8 peles × 4 olhos e × 9
  cabelos, depois da troca das regras 3 e 4, ENTÃO nenhuma dupla final está abaixo da diferença
  mínima, e cada pele fica com pelo menos 3 olhos e 7 cabelos possíveis.
- **E2-03a** DADO um `id` ENTÃO `aparencia` devolve sempre o mesmo molde, corte, pele, cabelo e
  olhos; DADA outra mesa ENTÃO só a camisa muda.
- **E2-03b** DADOS 200 `id` diferentes ENTÃO aparecem os 2 moldes, os 5 cortes de cada, as 8
  peles, os 9 cabelos e os 4 olhos; e corte, pele e olhos não andam juntos (não há par de
  escolhas que só apareça combinado).
- **E2-03c** DADO `personagem: feminino` ENTÃO o molde é o feminino, seja qual for o `id`; idem
  `masculino`, `Feminino`, `F`, `m`; DADO vazio, ausente ou `outro` ENTÃO vale o do `id`.
- **E2-04a** DADO um `crew-party.csv` com a coluna `personagem` QUANDO roda `estado.mjs iniciar`
  ENTÃO cada agente do `state.json` tem o valor; DADO o arquivo sem a coluna (ou só com `id`)
  ENTÃO o `state.json` sai como hoje, sem o campo.
- **E2-04b** DADO um `state.json` antigo, sem `personagem`, e um com valor estranho ENTÃO a
  página monta os bonecos sem erro.
- **E2-05a** `build.prompt.md` traz o cabeçalho de 7 colunas e a instrução de preencher
  `personagem`; o conserto `manifesto` mantém a coluna e os valores de um arquivo que já a tinha.
- **E2-06a** DADO o modo demo ENTÃO os cinco bonecos têm o molde do nome e não há dois iguais.
- **E2-upg** DADO um workspace 1.17.0 com uma crew de `crew-party.csv` de 6 colunas QUANDO roda o
  `update` ENTÃO o arquivo da crew não mudou, `estado.mjs iniciar` funciona e a página nova monta
  os bonecos.

## 5. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código; `npm run verify` verde.
- [ ] **Conferência visual (dono):** a porta não vê desenho. Uma folha com todos os cortes dos
      dois moldes, nas 8 peles, é aberta no navegador (modo demo ampliado, só para a conferência)
      e o dono aprova os desenhos antes da tag. Ajuste de pixel entra antes do release.
- [ ] README (seção do escritório), CHANGELOG, GLOSSARIO no mesmo commit.
- [ ] Release: push → CI verde nas 4 células → tag → release no GitHub, com o sim do dono.

## 6. Fora desta fase
| O que não entra | Alocação |
|---|---|
| Escolher pele, cabelo e olhos agente por agente | → sem fase — só com pedido real; a coluna `personagem` abre o caminho |
| Acessórios (óculos, barba, brinco, chapéu), roupas diferentes além da silhueta | → sem fase — cabe depois, com os mesmos módulos |
| Personagem não binário ou neutro declarado | → sem fase — hoje, sem a coluna, o escritório escolhe um dos dois moldes |
| Boneco maior que 16×16, animação de rosto | → sem fase — muda a cena inteira |
| Gravar a coluna nas crews antigas pelo `update` | → sem fase — o `update` não toca em `crews/` (regra 3 do AGENTS.md) |

## 7. Limites conhecidos
- Em 16×16 a cor dos olhos é um pixel por olho: aparece com a página ampliada, pouco na menor escala.
- A diferença entre os moldes é de silhueta e de corte; não há traço de rosto.
- Crew antiga sem a coluna pode ter um agente de nome feminino com o molde masculino, até alguém
  preencher a coluna.

**Desvios e decisões da implementação (1.18.0):**
- **Semente espalhada antes de fatiar.** Os trechos da FNV-1a pura andam juntos em `id` parecidos
  (`agente-1`, `agente-2`…: quem tinha o mesmo cabelo saía sempre com o mesmo molde, e o E2-03b
  reprovava). A semente passa por uma mistura final (a do MurmurHash3) e só então é fatiada: molde,
  bit 4 · pele, bits 5 a 7 · corte, 8 a 11 · olhos, 12 e 13 · cabelo, 14 a 21.
- **"Próximo demais"** é a distância em linha reta no cubo RGB abaixo de 60 (`DIFERENCA_MINIMA`).
  Sobram, por pele, da 1 à 8: 8, 8, 8, 8, 7, 7, 7 e 7 cabelos; 4, 4, 4, 4, 3, 3, 4 e 3 olhos. O
  preto na pele 8 (distância 50) também dá lugar à cor seguinte.
- **A cabeça ficou 2 pixels mais estreita** (10 de largura, era 12) para o cabelo com volume ser
  visivelmente maior que ela sem sair dos 16×16. O corpo mantém a largura.
- **Corte e pose por camadas**, não por troca de linha: corpo (com as linhas de digitar/andar) →
  braço levantado → papel → cabeça com o corte. O corte só usa as colunas 2 a 13; os braços, as
  colunas 0, 1, 14 e 15.
- **Cortes:** feminino — longo, chanel (o "médio"), cacheado, coque, curto; masculino — curto,
  topete, crespo, raspado, calvo com cabelo dos lados. Não há rabo de cavalo.
- **Uma cor a mais na paleta do boneco:** a sombra do cabelo (o cabelo um quarto mais escuro), que
  dá a textura do cacheado, do crespo e do raspado.
- **Módulos:** além de `sprites-rosto.js`, entraram `sprites-corpo.js`, `sprites-boneco.js` (monta
  as camadas; `linhasDoBoneco` e `coresDoBoneco` saíram de `sprites.js`), `modelo-personagem.js`
  (paletas e `aparencia`, que saíram de `modelo-agentes.js`) e `folha.js`. `formato-da-crew.md`
  também ganhou a coluna.
- **Folha de conferência:** `?folha=1` no endereço do escritório (§5).
- **Leitura tolerante na página:** o `estado.mjs` só grava `feminino` ou `masculino`; a página, ao
  ler um `state.json` editado à mão, aceita também `f`/`m`, maiúsculas e acentos.
- **Demonstração:** os cinco têm cortes, peles e cabelos diferentes entre si; olhos, 4 cores em 5
  bonecos (só há 4).
