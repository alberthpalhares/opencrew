# Spec — Fase U6, fatia 1: Polimento do uso real (1.16.0)

- **Fase:** U6-1 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/verificar/` + módulo novo `verificar/datas.mjs`, `scripts/entrega/resumo.mjs`, `scripts/documento/` ou `entrega/documentos.mjs` (aviso do perfil), `runner.pipeline.md`, `runner/fim-da-execucao.md`, `runner/retomar.md`, `runner/selecao-de-agentes.md`, `runner/contrato-de-saida.md`, `prompts/pedido.prompt.md`, `prompts/entrega.prompt.md`, `prompts/repair.prompt.md`) + `tests/_helpers.js` + README + CHANGELOG + testes. O CLI (`src/`) não muda · **Status:** escrita em 2026-10-08; **aprovada pelo dono em 2026-10-08** ("aprovado"); implementada em 2026-10-09 — os desvios do texto aprovado estão na §12
- **Termos novos no GLOSSARIO.md:** não
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u6-roteiro.md` (fatia 1); `IDEIAS.md` — "Achados da execução real de aceite da 1.15.0", "Achados da execução real de aceite da 1.14.0" (itens 2 a 9, 11 e 12), "Documento Word: perfil vazio no relatório", "Testes deixam pastas temporárias sem apagar".

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Data com dia da semana errado vira alerta do verificador**, nunca bloqueio: "20 de setembro, sábado"
   em 2026 cai num domingo. Só olha texto que traz **dia da semana e data juntos**; não julga data
   passada (uma ata cita datas passadas de propósito).
2. **O arquivo entregue continua com o nome do passo** (`rascunho.md`). Renomear mudaria o que a
   entrega, os testes e quem já usa conhecem. O tema da execução já abre o `LEIA-ME.md`.
3. **"Corrigir agora" na entrega passa a abrir versão nova**, como a correção em checkpoint já faz, em
   vez de editar o arquivo no lugar.
4. **As revisões do pedido saem da numeração do texto:** `v1`, `v2`… são só do texto; os vereditos vão
   para `revisao/v1`, `revisao/v2`…
5. **Textos fixos mostrados ao usuário passam a PT-BR** nas partes do fim da execução, do conserto e da
   seleção de agentes. O cabeçalho "Running crew" e os rótulos do runner ficam como estão (a IA os traduz
   para o idioma do usuário, como hoje).
6. **Os testes passam a apagar o que criam**, sem mexer em cada teste: o auxiliar que cria a pasta
   temporária a remove quando o processo de teste termina.
7. **Fica de fora** (continua no `IDEIAS.md`): nome do arquivo entregue, o pedido ler quase o runner
   inteiro, prompts de criação acima do tamanho, exemplos neutros.

## 1. Objetivo
As execuções reais da 1.14.0 e da 1.15.0 seguiram os prompts ao pé da letra e mostraram pontos em que o
texto deixa a IA adivinhar ou em que uma frase engana o usuário. Nenhum trava o uso; todos aparecem a
quem usa. Depois desta fatia esses pontos têm regra escrita e, onde dá, trava automática. Nada muda no
que o verificador **bloqueia** nem no que o produto **apaga**. Chega a quem já usa com um `update`.

## 2. O que esta fatia herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `verificar/documento.mjs` (U5a) | alertas de texto de Word, por formato | módulo irmão de alerta de data, por texto, em qualquer formato (regra 1) |
| `entrega/resumo.mjs` | uma linha `- {Canal}: {situação}` por canal; texto sem canal vai para `outros` sem linha | linha `- Outros arquivos: …` (regra 5) |
| `entrega.prompt.md`, "Corrigir agora" | edita o arquivo no lugar, "no new `vN`" | passa a abrir versão nova (regra 3) |
| `pedido.prompt.md`, Step 6 | revisão gravada com `saida` em `output/revisao.md` | `output/revisao/revisao.md` (regra 4) |
| `runner/fim-da-execucao.md`, menu final; `repair.prompt.md`, "Run it:" | em inglês | PT-BR (regra 7) |
| `runner.pipeline.md`, lista "Agent Loading" | numerada 1, 2, 3, 5, 6, 4 | 1 a 6 em ordem (regra 8) |
| `runner.pipeline.md`, checkpoint e `REGRAS DO REVISOR` | nada sobre resposta parcial; o revisor dá "nota" sem escala | regras 9 e 10 |
| `runner/retomar.md`, cabeçalho e seleção de agentes | sem forma para a execução retomada | regra 11 |
| Documento Word, perfil | perfil criado e vazio aparece como se houvesse papel timbrado | aviso (regra 6) |
| `tests/_helpers.js` `mkTmp` | cria `%TEMP%\opencrew-*` e não apaga (99.677 pastas em 2026-10-08) | remove no fim (regra 12) |
| Tamanho | núcleo do runner em 554 linhas, teto 560 | regra 13 |

## 3. Entradas
Nenhum comando novo. `verificar.mjs` ganha um alerta; `entregar.mjs` ganha uma linha de resumo; o resto são
textos dos prompts.

## 4. Saídas
- **Alerta de data** (relatório do verificador, nível `alerta`, item "Datas"):
  `‘{trecho}’: {data} de {ano} cai num/numa {dia certo}. Confira a data.`
  Exemplo: `‘20 de setembro, sábado’: 20 de setembro de 2026 cai num domingo. Confira a data.`
- **Resumo da entrega** com texto sem canal: `- Outros arquivos: Pronto` (ou `Pronto, com ressalva` /
  `Não está pronto`, pelas mesmas regras dos canais), antes das pendências.
- **Aviso de perfil vazio**, no relatório do `documento.mjs` e nos avisos da entrega:
  `Perfil de documento encontrado, mas sem logotipo nem cabeçalho: o documento sai sem papel timbrado.`
- **Pedido:** `revisao/v1/revisao.md`, `revisao/v2/revisao.md`… ao lado de `v1/`, `v2/`… do texto.

## 5. Regras
**Verificador**
1. O alerta de data olha, em todo texto verificado, trechos de duas formas: `{dia da semana}, {d} de {mês}`
   e `{d} de {mês}, {dia da semana}` (também com `({dia})` e `–`/`-` no lugar da vírgula; dia com ou sem
   `-feira`; mês por extenso ou abreviado de 3 letras). O ano é o escrito logo depois (`de 2026`) ou, sem
   ano, o do relógio do computador. Se o dia da semana não bate com a data, um alerta por trecho (repetido
   igual conta uma vez). Data impossível (30 de fevereiro) vira o mesmo alerta, com "não existe". Texto
   sem dia da semana junto da data não gera nada.
2. O alerta não conta como bloqueio: o status do verificador não muda por ele. Entra no resumo da
   aprovação final como os outros alertas.

**Entrega**
3. "Corrigir agora" (opção 1 do `ENTREGA:INCOMPLETA`) manda seguir `runner/correcao-no-checkpoint.md`,
   item 3, e rodar a entrega de novo com a lista nova; no pedido, o passo é o 1.
4. No pedido, o veredito do revisor é gravado com `saida` em `crews/{name}/output/revisao/revisao.md` (e
   `conferir --passo 2`). O texto fica com `v1`, `v2`… sem intercalar.
5. O resumo mostra a situação de `outros` quando é o único destino ou quando tem pendência; com canais, a
   linha de `outros` só aparece se houver pendência.
6. Perfil de documento sem logotipo e sem nenhuma das linhas de cabeçalho (todas vazias ou ausentes) é
   dito como "vazio" no lugar de "perfil usado"; o documento sai igual a hoje.

**Textos em PT-BR (regra 13 do `AGENTS.md`)**
7. Passam a PT-BR: o resumo de fim de execução e o menu final (`fim-da-execucao.md`:
   "✅ Execução concluída!", "📁 Entrega: …", "O que você quer fazer? ● Rodar de novo (outro tema) ○
   Editar este conteúdo ○ Voltar ao menu"); o "Run it:" do `repair` (`Para rodar: /opencrew run {code}`);
   os textos mostrados ao usuário em `selecao-de-agentes.md` e `contrato-de-saida.md`. As frases em
   inglês que outros arquivos citam ("the final menu of the runner", "Edit this content") acompanham.

**Runner (núcleo ≤ 560 linhas)**
8. A lista "Agent Loading" é renumerada 1 a 6, na ordem em que se aplica (agente, memória, formato,
   skills…); nenhuma regra muda de texto.
9. Checkpoint com resposta parcial: quando o usuário responde só parte do que o checkpoint perguntou, a
   IA pergunta **uma vez** só pelo que falta, dizendo o que é; se ele não tem, segue com o que tem e
   anota o que ficou de fora no arquivo do checkpoint. (≤ 3 linhas no núcleo.)
10. Revisor: o veredito é `APROVADO` ou `REPROVADO`, com nota de 0 a 10 dita como "nota X/10"; o guia
    `_opencrew/core/best-practices/review.md` é carregado junto do revisor. (Entra no bloco
    `REGRAS DO REVISOR`, no lugar de frase equivalente, sem crescer o núcleo.)
11. Retomada: o cabeçalho mostra `Retomando do passo {N} de {total}`; a seleção de agentes, quando a crew
    declara `agent_dependencies:`, é perguntada de novo e a IA avisa que a escolha anterior não foi
    guardada. (Em `runner/retomar.md`.)

**Testes**
12. `mkTmp` registra a pasta e a remove (`rmSync`, com repetição no Windows) na saída do processo de
    teste. Nenhum teste muda. O `npm run verify` não aumenta o número de pastas `opencrew-*` no `%TEMP%`.

**Tamanho**
13. Núcleo do runner ≤ 560 linhas; partes ≤ 120; total (núcleo + partes) ≤ 1.020; `pedido.prompt.md` ≤ 160.

## 6. Textos
| Onde | Texto |
|---|---|
| Alerta de data | `‘{trecho}’: {data} de {ano} cai num/numa {dia certo}. Confira a data.` / `‘{trecho}’: {data} de {ano} não existe. Confira a data.` |
| Resumo da entrega | `- Outros arquivos: Pronto` |
| Perfil vazio | `Perfil de documento encontrado, mas sem logotipo nem cabeçalho: o documento sai sem papel timbrado.` |
| Menu final | `O que você quer fazer? ● Rodar de novo (outro tema) ○ Editar este conteúdo ○ Voltar ao menu` |
| Cabeçalho da retomada | `Retomando do passo {N} de {total}` |

## 7. Cenários
- **U6a-01a** texto com "20 de setembro, sábado" e relógio em 2026: um alerta `‘20 de setembro, sábado’: 20 de setembro de 2026 cai num domingo…`; a ordem inversa ("sábado, 20 de setembro") e "(sábado)" dão o mesmo alerta.
- **U6a-01b** "sábado, 11 de outubro de 2026" (cai num domingo): alerta com o ano escrito; "domingo, 11 de outubro" não gera alerta; "sexta-feira, 9 de outubro de 2026" (confere) não gera alerta.
- **U6a-01c** data impossível ("30 de fevereiro, quinta") gera o alerta "não existe"; texto sem dia da semana, ou com data e dia longe um do outro, não gera nada.
- **U6a-01d** o alerta não muda o status: texto limpo com o alerta continua `VERIFICACAO:OK`; com bloqueio, continua `BLOQUEADA`; repetido igual conta uma vez.
- **U6a-02a** `entregar.mjs` de um texto `texto-livre` (só `outros/`): o resumo traz `- Outros arquivos: Pronto`; com canal e sem pendência em `outros`, a linha não aparece; com pendência, aparece `Não está pronto`.
- **U6a-03a** `entrega.prompt.md`: a opção 1 manda seguir o item 3 de `correcao-no-checkpoint.md` (versão nova) e não tem mais "in place" nem "no new `vN`".
- **U6a-03b** `pedido.prompt.md`: o veredito vai em `crews/{name}/output/revisao/revisao.md`; com `saida` repetido, o texto fica em `v1`, `v2` e os vereditos em `revisao/v1`, `revisao/v2` (script real, sem interleaving).
- **U6a-04a** perfil de documento sem logotipo e sem cabeçalho: o relatório do `documento.mjs` e os avisos da entrega trazem a frase de perfil vazio; com logotipo, ou com ao menos uma linha de cabeçalho, não; o `.docx` gerado é o mesmo de antes (bytes iguais).
- **U6a-05a** `fim-da-execucao.md`, `repair.prompt.md`, `selecao-de-agentes.md` e `contrato-de-saida.md` não têm mais as frases em inglês mostradas ao usuário listadas na regra 7; têm as de PT-BR da §6; os testes antigos que citavam as inglesas citam as novas.
- **U6a-06a** runner: a lista "Agent Loading" é 1 a 6 em ordem; a regra de resposta parcial está no checkpoint com a pergunta única; o bloco `REGRAS DO REVISOR` tem `APROVADO` ou `REPROVADO`, "nota X/10" e manda carregar `review.md`; o núcleo tem ≤ 560 linhas e o total ≤ 1.020.
- **U6a-06b** `retomar.md`: cabeçalho `Retomando do passo {N} de {total}` e a regra da seleção de agentes refeita com o aviso.
- **U6a-07a** (higiene) depois de rodar um arquivo de teste que usa `mkTmp`, a pasta que ele criou não existe mais; o número de pastas `opencrew-*` no `%TEMP%` antes e depois de um `npm run verify` é o mesmo (±0, descontadas as de outro processo).
- **U6a-upg-a** workspace 1.15.0 → `update` → o `verificar.mjs` instalado dá o alerta de data, `fim-da-execucao.md` está em PT-BR; nenhum arquivo de `crews/` mudou.

## 8. Fora desta fatia
| Item | Destino |
|---|---|
| Nome do arquivo entregue (`rascunho.md`) | → sem fase — muda o que a entrega e os testes travam (decisão 2) |
| O pedido lê quase o runner inteiro | → sem fase — refatorar o runner de novo |
| Prompts de criação acima do tamanho-alvo; exemplos neutros no payload | → sem fase — projeto pausado |
| Checar data **passada** ou no futuro distante | → sem fase — ata cita data passada de propósito |
| Cabeçalho e rótulos em inglês do runner ("Running crew", "Tier:") | → sem fase — a IA já os traduz |
| Fatias 2 e 3 da U6 | → `fase-u6b-…` e `fase-u6c-…` (roteiro) |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente do código dos scripts alterados.
- [ ] Execução real por IA: um pedido com data de dia errado (o alerta aparece e a IA pergunta); uma entrega incompleta com "Corrigir agora" (sai versão nova); uma retomada de execução (cabeçalho e seleção); o texto do fim em PT-BR.
- [ ] Com o sim do dono: release; `update` em A e B; as três crews reais conferidas (só leitura).
- [ ] README, CHANGELOG e `IDEIAS.md` (itens entregues saem; o resto fica) no mesmo commit; `STATUS.md` atualizado.

## 10. Limites conhecidos
- O alerta de data só vê o par dia da semana + data escritos por extenso em PT-BR; "20/09 (sáb)" não é lido.
- Sem ano escrito, o ano é o do relógio do computador: texto sobre o ano seguinte pode ter o alerta errado, e a mensagem diz o ano que usou.
- A numeração 1 a 6 do runner não muda o que a IA faz, só tira a contradição entre a numeração e a ordem.

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 12 | `tests/verificar-datas.test.js` (U6a-01): o limite medido de data está no verificador, não só em prosa |
| 13 | U6a-05a (sem revisão humana nos textos fixos da lista) |
| 14 | `tests/upgrade-u6a.test.js` (U6a-upg-a) |
| 6 | U6a-06a (núcleo ≤ 560, total ≤ 1.020) |

## 12. O que mudou em relação ao texto aprovado
- **Total do runner: 1.030 linhas**, não 1.020: o núcleo ficou em 558 (a regra 9 e a escala do revisor
  entraram nele), as partes ganharam 3 linhas na retomada.
- **A escala do revisor mora fora do bloco `REGRAS DO REVISOR`** (uma frase logo depois dele), porque um
  teste da R1 trava as quatro linhas do bloco; o texto exigido é o mesmo.
- **O alerta de data** sai com o trecho como escrito entre aspas e a data por extenso com o ano
  (`‘20 de setembro, sábado’: 20 de setembro de 2026 cai num domingo. Confira a data.`); o ponto final da
  frase não entra no trecho, e o mesmo trecho com maiúscula diferente conta uma vez. O relógio é
  injetável (`agora`) só para teste.
- **O aviso de perfil vazio** é uma linha em "Avisos:" do relatório do `documento.mjs` (a linha
  `Perfil: <arquivo>` continua), não um texto no lugar de "perfil usado".
- **`fsx.test.js`** também passou a usar o `mkTmp` que limpa: ele criava as próprias pastas.
- O cabeçalho "Running crew" e os rótulos do runner continuam em inglês, como previsto na decisão 5.
- **Da revisão independente do código (6 defeitos reproduzidos, todos tratados):** o dia da semana entre
  duas datas serve às duas e só há alerta quando nenhuma bate (lista de itens "data, dia" não gera
  falso alerta); lista e intervalo de dias ("segunda a sexta", "sábado e domingo") não são conferidos;
  data sem ano que já passou vale também no ano seguinte, e 29 de fevereiro sem ano usa o próximo
  bissexto; o trecho do alerta vai entre aspas simples curvas (o relatório já põe aspas em volta do
  detalhe); o travessão longo vale como separador e a quebra de linha é fronteira; a busca é linear (1 MB
  em menos de 3 s); e a limpeza do `mkTmp` não reprova um arquivo de teste que passou.
- **Da segunda execução real (3 cenários, nenhum comando falhou):** o alerta de data agora é perguntado
  antes da aprovação (no pedido e na aprovação final do pipeline); "Corrigir agora" guarda o relatório
  da nova verificação e não repete o revisor nem o `marcar`; os rótulos `APPROVE`, `CONDITIONAL APPROVE`
  e `REJECT` do guia de revisão ficam mapeados para `APROVADO` e `REPROVADO`.
- **Limites que ficam:** dia da semana que abre a frase seguinte depois de vírgula é lido como o da
  data anterior; data em bloco de código é conferida; o score de um pedido cujo `[PREENCHER]` só foi
  preenchido na entrega sai limpo (`1/1`); no pipeline, o texto corrigido na aprovação final não passa
  de novo pelo revisor (só pelo verificador). Os três últimos estão no `IDEIAS.md`.
