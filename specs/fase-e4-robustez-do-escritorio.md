# Spec — Fase E4: Robustez do escritório ao vivo

- **Fase:** E4 · **Módulos:** Runtime (`templates/_opencrew/core/scripts/`: `escritorio.mjs`, `escritorio/servidor.mjs`, `escritorio/porta.mjs`, `estado.mjs` + módulo novo `estado/passo-agente.mjs`, `caminho.mjs`, `caminho/argumentos.mjs`, `execucao/retomar.mjs`; `templates/_opencrew/core/escritorio/`: `index.html`, `modelo-textos.js` e o arquivo novo `aviso.js`; `runner.pipeline.md` e `runner/escritorio.md`, só na mesma linha; `templates/AGENTS.md`) + CLI (`src/commands/update.js`, `src/lib/resumo.js`) + README + CHANGELOG + testes · **Status:** implementada (1.19.1, 2026-10-12); aprovada pelo dono em 2026-10-12 (as decisões 1 a 7); aguarda a conferência do dono numa execução real
- **Versão:** 1.19.1 (a U6 fatia 3, `fase-u6c-medicao.md`, passa a 1.20.0).
- **Termos novos no GLOSSARIO.md:** não. Ajuste no verbete "Escritório" (a versão no `/estado`).
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** relato do dono em 2026-10-12, de uma execução real da crew `sistema-gestao-poty`: o painel travou depois de um `update`, a mensagem da página apontou a causa errada, duas sessões abriram a mesma crew com 3 minutos de diferença e um passo foi registrado com o agente errado.
- **Depende de:** E1 (1.7.0), regras 13 a 15, 20 e 22; U5c (1.14.0), o `execucao.json` e o `retomar`.

**O que existe hoje e por que falhou** (conferido no código em 2026-10-12):
- O comando reconhece "já aberto" comparando só o id `projeto` do `/estado`
  (`escritorio/porta.mjs`). O servidor monta a lista de rotas uma vez, na subida, mas relê do
  disco o conteúdo de cada arquivo. Depois de um `update`, o `index.html` novo pede módulos que
  o servidor antigo não tem na lista: 404, e a página nunca desenha. A E1 registrou isso como
  limite conhecido (§11), só na spec.
- A frase de abertura é HTML estático e só fala em "abrir pelo endereço, e não pelo arquivo".
- O `state.json` é um por crew. O `estado.mjs iniciar` substitui o que houver, e o
  `caminho.mjs pasta` não olha se a crew tem execução aberta.
- O `runner/escritorio.md` diz que `{id}` é "a coluna `id` do `crew-party.csv`", sem dizer que
  ele vem do `agent:` do passo. O `estado.mjs` só confere se o id está no elenco.
- A igualdade entre a pasta da página e a lista `ARQUIVOS` **já é travada** (E1-04j). Não foi
  ela que falhou.

**Decisões do dono (2026-10-12):**
1. Servidor desatualizado: **só avisar** (o servidor não se encerra sozinho).
2. Agente errado no passo: **o texto fica explícito e o script corrige**, sem recusar.
3. O apelido `--execucao` para `--run` **fica de fora** (§6).

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está no texto):
4. **"Execução recente" = atividade nas últimas 2 horas.** Execução aberta mais antiga que isso
   não barra uma nova (ela continua aparecendo no `/opencrew retomar`).
5. **O comando com servidor desatualizado sai com código 1**, para a IA não tratar a linha como
   sucesso.
6. **Todo `update` que muda a versão pede para reabrir o escritório**, mesmo quando a página
   não mudou: a versão comparada é a do OpenCrew, não uma soma dos arquivos da página.
7. **O pedido avulso (`pasta --pedido`) não entra na regra das duas execuções**: nem barra, nem
   é barrado.

## 1. Objetivo
Quem atualiza o OpenCrew com o escritório aberto fica sabendo que precisa reabri-lo, pelo
`update`, pelo comando e pela página. Duas sessões não abrem a mesma crew sem que a segunda
seja perguntada. O boneco que aparece trabalhando é o do agente do passo.

## 2. Regras

### Servidor desatualizado
1. **Versão no `/estado`.** A resposta ganha o campo `versao`: o texto de
   `_opencrew/.opencrew-version`, lido uma vez, na subida do servidor (sem o arquivo: `""`).
   `projeto` e `crews` não mudam.
2. **Reconhecer o desatualizado.** Ao achar na porta um escritório deste projeto, o comando
   compara a `versao` da resposta com a que ele mesmo lê do disco. Igual: "já aberto", como hoje.
   Diferente, ou resposta sem o campo (servidor até a 1.19.0): escreve a linha da §3, não abre
   servidor novo, não tenta outra porta e sai com código 1.
3. **Quem fecha.** O `/opencrew dashboard` (`templates/AGENTS.md`), ao receber essa linha: se o
   processo em segundo plano foi aberto por esta conversa, a IA o encerra e roda o comando de
   novo; senão, mostra a linha ao usuário. Nenhum script encerra processo.
4. **O `update` avisa.** Depois de renovar os arquivos, o `update` procura um escritório deste
   projeto nas portas 4747 a 4756 (a mesma pergunta ao `/estado`). Achando, o resumo ganha a
   linha da §3. Sem escritório, ou com `--check`, nada é escrito. A procura nunca faz o
   `update` falhar e não soma mais de 2 segundos quando nada responde.

### Página
5. **Frase de abertura.** O texto estático passa a dar as duas saídas (§3). Vale também num
   servidor antigo, porque o `index.html` é relido do disco.
6. **Dizer qual arquivo faltou.** `aviso.js` é um módulo sem nenhum `import`, carregado por
   `src` antes do `app.js`: como não depende de outro arquivo, roda mesmo quando o `app.js` não roda. Se 4 segundos depois da carga a frase de abertura ainda estiver na
   tela, ele pede o `app.js` e, a partir dele, cada módulo citado em `from './…'`, uma vez
   cada. Havendo resposta diferente de 200, troca o texto da abertura pela frase da §3, com os
   nomes em ordem alfabética. Sem nenhuma falha, não mexe em nada. Texto por `textContent`
   (regra 24 da E1). Num servidor até a 1.19.0 o próprio `aviso.js` dá 404 e vale a regra 5.
7. **Lista fechada.** `aviso.js` entra em `ARQUIVOS`. Todo `from './x.js'` de um arquivo da
   pasta da página aponta para um nome de `ARQUIVOS`.

### Duas execuções da mesma crew
8. **Perguntar antes de abrir.** `caminho.mjs <crew> pasta`, sem `--run`, sem `--pedido` e sem
   `--nova`: se a crew tem execução `aberta`, que não seja pedido, com atividade nas últimas
   2 horas, o script **não cria pasta nem grava nada**, escreve as linhas da §3 e termina com
   `CAMINHO:ABERTA <run>` (código 0). Atividade é o mais recente entre `iniciadaEm`, o `em` dos
   passos e o `em` dos marcos. Com mais de uma, vale a de atividade mais recente.
9. **`--nova`.** Com a opção, `pasta` cria a execução como hoje. `--nova` só vale em `pasta` e
   não vai com `--run`.
10. **O runner pergunta.** Ao ler `CAMINHO:ABERTA`, o runner mostra as linhas ao usuário,
    pergunta e segue a resposta: `/opencrew retomar <crew>` ou o mesmo comando com `--nova`.
    A instrução está nas linhas do script; no runner, só o nome da resposta nova.

### Agente do passo
11. **Texto.** `{id}` é o valor de `agent:` do frontmatter do passo, que é o mesmo texto da
    coluna `id` do `crew-party.csv`.
12. **O script corrige.** Em `passo` e `checkpoint` com `--n K`, o `estado.mjs` lê os passos da
    crew e tira os de agente com status `skipped` no estado. **Só se sobrarem exatamente
    `step.total` passos**, o K-ésimo é o passo em curso, e o agente dele (`agent:`, pelo último
    segmento) é o que vale: se `--agente` veio diferente ou não veio, o script usa o do passo e
    responde `ESTADO:OK — agente do passo K: <id>`. Passo sem `agent:` segue sem agente (na
    resposta, `nenhum` no lugar do id).
13. **Na dúvida, vale o que veio.** Contagem que não bate, `step.total` ausente, crew ilegível
    ou agente do passo fora do elenco: nada é corrigido e o comportamento é o de hoje.
14. **Nada novo é gravado.** O `state.json` e o `execucao.json` têm os campos de hoje.

### Limites de tamanho
15. O núcleo do runner continua em até 560 linhas e o total em até 1.030: as mudanças em
    `runner.pipeline.md` e `runner/escritorio.md` são na mesma linha. Cada script e cada
    arquivo da página, em até 200 linhas.

## 3. Textos
| Onde | Texto |
|---|---|
| `escritorio.mjs`, servidor desatualizado | `O escritório aberto em http://127.0.0.1:<porta> é de uma versão anterior. Feche esse processo e rode o comando de novo.` |
| Resumo do `update` | `O escritório está aberto em http://127.0.0.1:<porta>. Feche e rode /opencrew dashboard de novo para ver a versão nova.` |
| `index.html`, abertura | `Abrindo o escritório… Se esta mensagem não sumir, feche o escritório e rode /opencrew dashboard de novo. Confira também se abriu pelo endereço que o comando mostrou, e não pelo arquivo.` |
| `aviso.js`, arquivo faltando | `O escritório não carregou: faltou <nomes>. Feche o escritório e rode /opencrew dashboard de novo.` |
| `caminho.mjs pasta`, linha 1 | `A crew <crew> já tem uma execução aberta: <run> (<tema>), com atividade há <N> min.` (sem tema: sem os parênteses) |
| linha 2 | `O painel do escritório é um só por crew: duas execuções ao mesmo tempo se misturam nele.` |
| linha 3 | `Pergunte ao usuário: continuar aquela (/opencrew retomar <crew>) ou abrir outra (repita este comando com --nova).` |
| última linha | `CAMINHO:ABERTA <run>` |
| `estado.mjs`, agente corrigido | `ESTADO:OK — agente do passo <K>: <id>` (passo sem `agent:`: `nenhum`) |

## 4. Cenários
- **E4-01a** DADO um servidor do escritório ENTÃO o `/estado` traz `projeto`, `versao` (o
  carimbo do projeto na subida) e `crews`; sem o arquivo do carimbo, `versao` é `""`.
- **E4-01b** DADO na porta um escritório deste projeto com a mesma versão QUANDO o comando roda
  ENTÃO código 0 e a linha "já aberto", como na E1-04h.
- **E4-01c** DADO na porta um escritório deste projeto que responde sem `versao` (1.19.0), ou com
  outra versão QUANDO o comando roda ENTÃO código 1, a linha "versão anterior" com a porta dele
  e nenhum servidor novo, nem na porta seguinte.
- **E4-01d** DADO o `update` com um escritório deste projeto no ar ENTÃO o resumo traz a linha
  com o endereço; sem escritório, ou com o de outro projeto, ENTÃO não traz; com `--check`
  ENTÃO não traz.
- **E4-01e** DADO o `/opencrew dashboard` de `templates/AGENTS.md` ENTÃO ele diz o que fazer
  com a linha "versão anterior" (regra 3).
- **E4-02a** DADO o `index.html` ENTÃO a frase de abertura da §3 está no HTML estático, visível
  sem JavaScript, e é igual a `TEXTOS.abrindo`.
- **E4-02b** DADA a abertura ainda visível aos 4 s e um módulo que responde 404 ENTÃO o texto
  da abertura passa a ser a frase com o nome dele; DADOS dois ENTÃO os dois, em ordem
  alfabética; cada arquivo é pedido uma vez.
- **E4-02c** DADA a abertura já escondida aos 4 s ENTÃO nada é pedido; DADOS todos os arquivos
  com 200 ENTÃO o texto não muda.
- **E4-02d** DADO o `index.html` ENTÃO os scripts são `aviso.js` e depois `app.js`, os dois por
  `src`; `aviso.js` não tem `import` nem escreve HTML.
- **E4-03a** DADA uma execução aberta com atividade há 3 minutos QUANDO roda `pasta` ENTÃO as
  três linhas e `CAMINHO:ABERTA <run>`, código 0, e a árvore do projeto é igual antes e depois.
- **E4-03b** DADA a mesma situação QUANDO roda `pasta --nova` ENTÃO `CAMINHO:OK` com uma
  execução nova, registrada como hoje.
- **E4-03c** DADA uma execução aberta com atividade há 3 horas, ou só execuções fechadas, ou só
  um pedido aberto ENTÃO `pasta` cria a execução como hoje; DADO `pasta --pedido` com uma
  execução aberta recente ENTÃO cria o pedido.
- **E4-03d** DADA uma execução aberta iniciada há 3 horas com um passo conferido há 10 minutos
  ENTÃO `CAMINHO:ABERTA`, e a linha 1 diz 10 min; DADAS duas abertas recentes ENTÃO vale a de
  atividade mais recente.
- **E4-03e** DADO `--nova` em `saida`, ou junto com `--run` ENTÃO erro de uso, código 1.
- **E4-03f** DADO o runner ENTÃO o comando que abre a execução cita `CAMINHO:ABERTA` e o que
  fazer com ela, e o núcleo e o total continuam dentro dos tetos.
- **E4-04a** DADOS os arquivos da pasta da página ENTÃO todo `from './x.js'` aponta para um
  nome de `ARQUIVOS`.
- **E4-05a** DADA uma crew de 3 passos (agentes a, b, c), iniciada com `--passos 3` QUANDO roda
  `passo --n 2 --agente a` ENTÃO quem fica `working` é `b` e a resposta é
  `ESTADO:OK — agente do passo 2: b`; com `--agente b` ENTÃO a resposta de hoje.
- **E4-05b** DADA a mesma crew com `b` pulado e `--passos 2` QUANDO roda `passo --n 2 --agente a`
  ENTÃO quem fica `working` é `c`.
- **E4-05c** DADA a contagem que não bate (`--passos 5` numa crew de 3), ou a crew sem
  `pipeline.yaml` ENTÃO vale o `--agente` que veio, com a resposta de hoje.
- **E4-05d** DADO um passo sem `agent:` e `--agente a` ENTÃO o passo segue sem agente; DADO o
  mesmo no `checkpoint` ENTÃO igual.
- **E4-05e** DADO o `runner/escritorio.md` ENTÃO ele diz que `{id}` vem do `agent:` do passo.
- **E4-upg** DADO um workspace 1.19.0 com o escritório dele no ar QUANDO roda o `update` ENTÃO
  o resumo avisa do escritório aberto; o comando novo responde "versão anterior" para aquele
  servidor; um servidor novo entrega todos os `ARQUIVOS`, com `aviso.js`; e `crews/` fica igual.

## 5. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código; `npm run verify` verde.
- [ ] **Conferência no `sandbox/`** (quem implementa): subir o escritório da 1.19.0, atualizar,
      ver a linha do `update`, rodar o comando (linha "versão anterior") e abrir a página no
      servidor antigo (frase nova); num servidor novo, tirar um módulo da lista e ver a frase do
      `aviso.js` no navegador; abrir duas execuções da mesma crew e ver a pergunta.
- [ ] **Conferência do dono** numa execução real, com o escritório aberto de antes do `update`.
- [ ] README, CHANGELOG, GLOSSARIO, §11 da spec da E1 e `AGENTS.md` do repositório (travas das
      regras 14 e 15) no mesmo commit; release pelo caminho de sempre.

## 6. Fora desta fase
| O que não entra | Alocação |
|---|---|
| Apelido `--execucao` para `--run` | → sem fase — falso positivo do hook lean-ctx do mantenedor; só o apelido não resolve (os prompts dizem `--run`), e trocar os prompts é mudança grande por causa de ferramenta de fora |
| Servidor que se encerra sozinho ao perceber o `update` | → sem fase — o dono escolheu só avisar |
| Um painel por execução (`state.json` com `run_id`, duas execuções da mesma crew lado a lado) | → sem fase — muda o formato do estado e a página; só com pedido |
| Recusar o `passo` com agente errado | → sem fase — o runner não repete o evento, e o painel ficaria sem o passo |
| O `update` achar o escritório aberto numa porta fora de 4747–4756 | → sem fase — limite conhecido |

## 7. Limites conhecidos
- O aviso do `update` só acha o escritório nas dez portas padrão; aberto com `--porta` fora
  dessa faixa, quem avisa é o comando, na vez seguinte, e a frase da página.
- A frase do `aviso.js` só existe em servidor da 1.19.1 em diante. Num servidor antigo, vale a
  frase estática.
- O `aviso.js` só enxerga `import` estático escrito como `from './nome.js'`, que é o único
  jeito usado na página.
- Duas sessões que rodem `pasta` no mesmo segundo ainda abrem duas execuções: a checagem lê o
  disco, sem trava.
- A correção do agente depende de `step.total` bater com os passos da crew. Numa retomada, ou
  com o `--passos` contado errado, vale o que o runner passou.

### Desvios e escolhas da implementação (1.19.1)
O que a spec não dizia, ou dizia de outro jeito, e como ficou. O código manda (regra 9 do AGENTS.md).
- **`aviso.js` é um módulo, não um script clássico.** Sem nenhum `import`, ele carrega sozinho do
  mesmo jeito, e como módulo pode ser importado pelos testes. O `index.html` passa a ter dois
  `<script type="module">` (o teste E1-06a foi atualizado).
- **O `update` só avisa do escritório de outra versão.** Rodar o `update` de novo na mesma versão,
  com um escritório já da versão nova no ar, não escreve a linha.
- **A procura do `update` pergunta às dez portas de uma vez**, com a espera de 1 segundo do
  `/estado`: com nada escutando, volta na hora.
- **Novos:** `src/lib/escritorio.js` (a linha do `update`), `scripts/caminho/aberta.mjs`,
  `scripts/estado/passo-agente.mjs`; `versaoDe` em `scripts/escritorio/projeto.mjs` e
  `sondarEstado` em `scripts/escritorio/porta.mjs` (a `sondar` continua, devolvendo só o projeto).
- **Onde o runner cita `CAMINHO:ABERTA`:** na célula do comando que abre a execução (passo 5b),
  e não na frase que lista as respostas do `caminho.mjs`, que é travada letra por letra por testes
  de fases anteriores. Nenhuma linha a mais: núcleo 559, total 1.029.
- **Menos de 1 minuto** de atividade aparece como "há 0 min".
- **Agente corrigido e estado recriado ao mesmo tempo:** a resposta é a do agente corrigido.
- **Testes de fases anteriores atualizados** (não apagados): E1-04a e E1-04b (o `/estado` tem
  `versao`), E1-06a e E1-06d (dois scripts; a frase nova), E1-05 §6 e E1-06 (a frase nova), E1-03a
  (o texto do `{id}`) e U5a-10a (a segunda execução no mesmo segundo pede `--nova`).
- **Conferido de verdade por quem implementou** (2026-10-12, workspace temporário com o `core` da
  1.19.0 tirado do git, servidor da 1.19.0 no ar na porta 4748): o `update` escreveu a linha do
  escritório aberto; o comando novo respondeu "versão anterior" com código 1; num servidor novo com
  `quadro.js` e `rota.js` apagados, o navegador mostrou "O escritório não carregou: faltou
  quadro.js, rota.js. …"; a segunda execução da mesma crew recebeu `CAMINHO:ABERTA`, e `--nova`
  criou a pasta. **Da 1.19.0 para a 1.19.1 a página continua abrindo no servidor antigo** (o único
  arquivo novo é o `aviso.js`, que só faz falta quando outro falta): o travamento do relato foi de
  um salto que trouxe módulos novos (para a 1.19.0), e é esse caso que as regras 1 a 6 cobrem daqui
  em diante.
- **Não conferido por quem implementou:** o que a IA faz ao ler `CAMINHO:ABERTA` e a linha "versão
  anterior" numa conversa real (só o texto do prompt tem teste).
