# Spec — Fase U5, fatia 1: Polimento do uso (1.12.0)

- **Fase:** U5-1 · **Módulos:** Runtime (`templates/_opencrew/core/`: `best-practices/texto-livre.md` e `_catalog.yaml`, `scripts/verificar/`, `scripts/conferir-fontes.mjs` e `conferir-fontes/relatorio.mjs`, `scripts/documento/`, `scripts/caminho.mjs`, `scripts/conserto/achados.mjs`, `scripts/entrega/leiame.mjs`, `runner.pipeline.md`, `formato-da-crew.md`, `prompts/{discovery,design,build,repair}.prompt.md`; `templates/AGENTS.md`) + README + CHANGELOG + testes. O CLI (`src/`) não muda · **Status:** aprovada pelo dono (2026-10-07); implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Texto livre (formato)
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u5-roteiro.md` (fatia 1); `IDEIAS.md` — "Achados da execução real de aceite da 1.11.0", "Achados da execução real de aceite da 1.10.0" (itens 1 a 5 e 11), "Runner: depois de um veto…", "Onboarding: formato do `company.md`…"; e a resposta do dono de 2026-10-07 sobre a crew de propostas ("não preciso de Word da proposta").

**Correção de uma frase da 1.11.0** (regra 9 do `AGENTS.md`). O `/opencrew repair`, o README e o
CHANGELOG dizem que, sem `format:`, "o verificador mede o texto como post de blog". Conferido no
código e num teste à mão em 2026-10-07: isso só acontece quando o arquivo tem `title:` no
frontmatter. O que acontece sempre, sem o formato: o redator não recebe o guia do tipo de texto, a
entrega não sabe de que canal ele é e o verificador procura no texto rótulos de todos os canais.
Esta fase troca a frase em todos os lugares (regra 3).

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Um formato novo, `texto-livre`**, para texto que não é de rede nem vira Word: proposta, minuta
   que vira HTML ou PDF, plano, relatório interno. Não tem limite de tamanho, não gera Word e vai
   para `outros/` na entrega. É o que o `/opencrew repair` passa a propor para a minuta da crew de
   propostas.
2. **O `run_id` passa a nascer no script.** `caminho.mjs "<crew>" pasta` sem `--run` cria a pasta
   com a data e a hora do computador e devolve o nome; a IA deixa de inventar a hora. Com `--run`
   continua como hoje.
3. **`FONTES:OK` com alerta continua `FONTES:OK`** (o runner depende disso), mas o relatório passa
   a dizer que há alertas e como corrigir os que têm sugestão.
4. **Aviso de documento vira alerta do verificador, não bloqueio.** Imagem, marcação `:::`
   desconhecida e bloco de assinaturas sem fim aparecem antes do revisor, e ele decide.
5. **Chave do perfil quase certa (`Logotipo:`, `rodapé:`) vira erro com a grafia certa**, como já é
   a chave desconhecida. Hoje é ignorada em silêncio.
6. **Prompts de criação: só as contradições listadas na regra 14.** Nada de redesenho; cada uma
   ganha uma frase só.

## 1. Objetivo
Tirar o que atrapalha quem usa o produto hoje: a crew de propostas fica sem achado pendente sem
ganhar um Word que ninguém pediu; as mensagens param de dizer o que não é verdade ("mede como
blog", "1 alertas", `FONTES:OK` sem citar o alerta); o que o Word não vai converter aparece antes
do revisor; e a IA para de improvisar onde os prompts de criação se contradizem. Chega a quem já
usa com um `update`.

## 2. O que esta fase herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `verificar/pecas.mjs`, `lerPecas` | sem formato declarado: título do frontmatter medido como blog e rótulos de todos os canais lidos; com formato fora da tabela: nada disso | `texto-livre` é formato fora da tabela (regra 1) |
| `verificar/medicao.mjs`, `naoMedidos` | formato com best-practice e sem peça medida ganha "o verificador ainda não mede os limites do formato X", mesmo quando o formato não tem limite nenhum | regra 2 |
| `entrega/canais.mjs` | formato sem `platform:` de canal vai para `outros/` | `texto-livre` não declara `platform:` |
| `documento/markdown.mjs` | `lerMarkdown(texto)` devolve os contadores `imagens`, `desconhecidas`, `semFim`; tabela com linha maior que o cabeçalho ganha coluna sem aviso | regras 6 e 8 |
| `documento/perfil.mjs` | só é chave a linha em minúsculas, na primeira coluna; `Logotipo:` e ` rodape:` são comentário | regra 7 |
| `conferir-fontes/relatorio.mjs` | "1 fontes", "1 pendentes", "1 alertas"; o `--corrigir` imprime o relatório duas vezes e não diz qual arquivo mudou nem o nome da cópia | regras 4 e 5 |
| `caminho.mjs` | `pasta` exige `--run`; o runner manda montar `YYYY-MM-DD-HHmmss` "using the current timestamp" | decisão 2 |
| Runner, Veto | depois do conserto por veto, o arquivo não passa de novo pelo `conferir` | regra 11 |
| Runner | "Task tool", "Read tool", "Write tool", `.claude/settings.local.json` | regra 12 |
| `conserto/achados.mjs`, `repair.prompt.md`, `formato-da-crew.md`, README, CHANGELOG | a frase "mede como post de blog" | regra 3 |
| `templates/AGENTS.md`, onboarding | não diz o formato do `company.md` nem manda tirar `<!-- NOT CONFIGURED -->` | regra 15 |
| Tamanho | runner 872 linhas, design 703, build 649 | regra 16 |

## 3. Entradas
Nenhum comando novo. Mudam:
```
node _opencrew/core/scripts/caminho.mjs "<crew>" pasta            (novo: sem --run)
node _opencrew/core/scripts/caminho.mjs "<crew>" pasta --run <id> (como hoje)
```
e o formato `texto-livre` passa a valer em `format:` de um passo e em `caminho=texto-livre`.

## 4. Saídas
- **`caminho.mjs … pasta` sem `--run`:** cria `crews/<crew>/output/<AAAA-MM-DD-HHmmss>/` com a data
  e a hora locais; se a pasta já existe, `-2`, `-3`… A última linha é `CAMINHO:OK <pasta>`; o
  `run_id` é o último segmento.
- **`conferir-fontes.mjs`:** o resumo concorda em número ("1 fonte — 1 ok, 0 pendentes, 1 alerta").
  Com alerta ou pendência que tem sugestão, e sem `--corrigir`, uma linha a mais:
  "Para trocar os caminhos que têm sugestão, rode de novo com --corrigir (cada arquivo alterado
  ganha uma cópia)." Com `--corrigir`, quando algo foi trocado: uma linha por arquivo —
  "Corrigi: <arquivo> (cópia: <nome da cópia>)" — e o relatório de depois, uma vez só.
- **`verificar.mjs`, arquivo com `=documento-oficial`:** três alertas possíveis, com a quantidade
  e a concordância ("1 imagem não entra no documento" / "3 imagens não entram no documento"; "1
  marcação `:::` desconhecida vai como texto"; "1 bloco de assinaturas sem a linha `:::` do fim
  vai como texto"), todos com o nome "Documento Word".
  A linha "Não medido — o verificador ainda não mede os limites do formato…" some para formato
  que não declara limite.
- **`documento.mjs`:** aviso novo de conversão: "{n} linha(s) de tabela com mais células que o
  cabeçalho: a coluna a mais ficou sem título."
- **Perfil:** "Perfil, linha {n}: a chave se escreve {chave certa}: em minúsculas, sem acento, no começo da linha e sem espaço antes dos dois-pontos."

- **LEIA-ME da entrega:** "O que não foi conferido" só cita imagens e redes quando a entrega tem
  canal de rede.

## 5. Regras
**Formato `texto-livre`**
1. `best-practices/texto-livre.md` existe, está no `_catalog.yaml`, não declara `platform:` nem
   `constraints:`. O guia é curto: texto completo e final, sem rótulos `=== … ===`, sem frontmatter,
   `[PREENCHER: …]` para o dado que falta. Declarado num passo: o título do frontmatter não é
   medido como blog, os rótulos de canal não são lidos, as checagens gerais (placeholder,
   proibição, afirmação a confirmar) continuam, e a entrega leva o arquivo para `outros/`.
2. A linha "Não medido — o verificador ainda não mede os limites do formato X" só aparece quando o
   best-practice de X declara ao menos um limite (`constraints:` com alguma chave).
   `documento-oficial` e `texto-livre` não declaram nenhum e não a recebem; `youtube-script`,
   que declara limites ainda não medidos, continua recebendo.
3. A frase "mede como post de blog" sai de `conserto/achados.mjs`, `repair.prompt.md`,
   `formato-da-crew.md`, README e da entrada 1.11.0 do CHANGELOG. No lugar: "Sem o formato, o
   redator não recebe o guia desse tipo de texto, e o verificador procura no arquivo peças de rede
   (legenda, post, título de blog)." O
   `repair.prompt.md` passa a propor `texto-livre` para o texto que não é de rede nem documento
   para imprimir ou assinar.

**Conferência de fontes**
4. O resumo e as mensagens concordam em número. `FONTES:OK` e `FONTES:PENDENTE` não mudam de
   sentido (decisão 3).
5. Com `--corrigir`, o relatório de antes não é impresso quando algo foi trocado; cada arquivo
   alterado aparece com o nome da cópia que ficou (`.bak`, ou `.bak-<data>` quando já havia uma).

**Documento Word**
6. Para o item com formato `documento-oficial`, o verificador lê o texto com `lerMarkdown` e põe
   um alerta para cada contador diferente de zero (decisão 4). Nenhum vira bloqueio.
7. No perfil, a linha `Palavra: valor` cuja chave, em minúsculas, sem acento e sem espaço em
   volta, é uma chave conhecida — e que não está escrita exatamente assim — é erro com a grafia
   certa. Linha que não parece chave continua comentário.
8. Tabela com linha de mais células que o cabeçalho continua sendo convertida como hoje, com o
   aviso da §4.
9. O prompt do documento ganha o texto fixo das perguntas do logotipo, das três linhas e do
   rodapé (§6), e diz que "Não encontrei {arquivo}." e "Só converto texto…" voltam à pergunta do
   arquivo.

**Runner**
10. O `run_id` vem do `caminho.mjs … pasta` sem `--run` (decisão 2). A data dos arquivos de
    checkpoint e da linha do `runs.md` é a do `run_id`.
11. Depois de um conserto por veto, o arquivo passa de novo pelo `caminho.mjs … conferir` antes
    de o veto ser reavaliado.
12. O runner não cita ferramenta de uma IDE só: "Task tool" vira "o mecanismo de subagente da sua
    IDE (sem ele, rode o passo na conversa)"; "Read tool" e "Write tool", "a ferramenta de ler" e
    "de escrever arquivo"; `.claude/settings.local.json`, "a configuração de MCP da sua IDE".
13. O score do `runs.md` não muda aqui (fatia 3).

**Prompts de criação** (uma frase cada; decisão 6)
14. (a) design: a pergunta de tier só é pulada quando o `discovery.yaml` diz que um modelo foi
    usado (campo `template:`, que o discovery passa a gravar só nesse caso); (b) design: linha de
    papel e de guia para redator de documento (`documento-oficial`) e para `texto-livre`; (c)
    design: `extends:` quando há agente-base que serve, "do zero" só quando não há; sem `ls`;
    (d) build: `agent_dependencies` lista também os agentes cujas saídas o passo carrega em
    "Context Loading"; (e) build: a conferência de skills instaladas não vale para as nativas
    (`web_search`, `web_fetch`); (f) build: exemplo de saída com 15 linhas ou mais, nos dois
    lugares; (g) discovery: opções em lista numerada, sem "responda com um número" e "não diga
    responda com um número" ao mesmo tempo; (h) discovery: quando `/opencrew create <descrição>`
    já trouxe o objetivo, a pergunta 1 vira confirmação; (i) discovery: o teto de perguntas do
    passo 3 não conta a pergunta das fontes; (j) `system.md`: o menu só aparece quando nenhum
    comando veio junto.

**Onboarding e tamanho**
15. O onboarding grava o `company.md` com cabeçalhos fixos (Nome, O que faz, Público, Produtos e
    serviços, Tom de voz, Site e redes) e tira a marca `<!-- NOT CONFIGURED -->` do `company.md` e
    do `preferences.md` ao terminar.
16. Runner, build e design terminam a fase com no máximo as linhas de hoje (872, 649, 703).

## 6. Textos
| Onde | Texto |
|---|---|
| Achado `formato` (script) | "{n} passo(s) que a revisão confere não diz(em) o formato do texto." / "Sem o formato, o redator não recebe o guia desse tipo de texto, e o verificador procura no arquivo peças de rede (legenda, post, título de blog)." |
| `repair`, pergunta do formato | "Estes passos não dizem que tipo de texto produzem; sem isso, o redator não recebe o guia do tipo de texto e o verificador procura no arquivo peças de rede. Minha proposta: {passo → formato}. Posso gravar assim?" |
| Documento, logotipo | "Qual é o arquivo do logotipo? (PNG, dentro do projeto. Pode responder 'sem logotipo'.)" |
| Documento, cabeçalho | "Quais são as linhas do cabeçalho? Até três: nome da entidade, CNPJ ou registro, endereço." |
| Documento, rodapé | "Quer um texto no rodapé, além de 'Página X de Y'?" |

## 7. Cenários
Cada cenário vira ao menos um teste com o mesmo ID no nome.

- **U5a-01a** um arquivo com `title:` no frontmatter e `=texto-livre` não é medido como blog; sem formato, é.
- **U5a-01b** `=texto-livre` com um rótulo `=== LEGENDA ===` no corpo: o rótulo é texto, não peça.
- **U5a-01c** `texto-livre` na entrega vai para `outros/`, com o nome original, e não gera `.docx`.
- **U5a-01d** o catálogo lista `texto-livre`; o arquivo não tem `platform:` nem `constraints:`.
- **U5a-01e** proibição da memória e `[PREENCHER]` continuam bloqueando em `texto-livre`.
- **U5a-02a** `=documento-oficial` e `=texto-livre` não recebem a linha "Não medido"; `=youtube-script` continua recebendo.
- **U5a-03a** o achado `formato` e o `repair.prompt.md` não dizem "post de blog"; `conserto.mjs --aplicar "formato:8=texto-livre"` grava e o diagnóstico da crew responde `CONSERTO:OK`.
- **U5a-03b** README, CHANGELOG (1.11.0) e `formato-da-crew.md` não dizem que o texto sem formato é medido como blog.
- **U5a-04a** "1 fonte — 1 ok, 0 pendentes, 1 alerta"; "2 fontes — 0 ok, 2 pendentes, 0 alertas".
- **U5a-04b** com um caminho absoluto e sem `--corrigir`: a linha "Para trocar…" aparece e a última linha é `FONTES:OK`; sem sugestão nenhuma, a linha não aparece.
- **U5a-05a** `--corrigir` que troca um caminho: o relatório sai uma vez, e há a linha "Corrigi: … (cópia: ….bak)"; com `.bak` já existente, o nome é o da cópia com data.
- **U5a-06a** texto com uma imagem, um `::: caixa` e um `::: assinaturas` sem fim, `=documento-oficial`: três alertas, `VERIFICACAO:OK`.
- **U5a-06b** o mesmo texto `=texto-livre`: nenhum dos três alertas.
- **U5a-07a** perfil com `Logotipo: x.png`: erro "a chave se escreve logotipo"; com ` rodape: x` e com `rodapé: x`: o mesmo, com `rodape`; com `Observação: texto`: sem erro.
- **U5a-08a** tabela com uma linha de 4 células e cabeçalho de 3: o `.docx` sai e o relatório traz o aviso.
- **U5a-09a** `documento.prompt.md` tem as três perguntas da §6 e manda voltar à pergunta do arquivo nas duas mensagens.
- **U5a-10a** `pasta` sem `--run` cria `output/<AAAA-MM-DD-HHmmss>/` com a hora injetada no teste e devolve `CAMINHO:OK`; chamado de novo no mesmo segundo, cria a pasta com `-2`.
- **U5a-10b** `pasta --run x` continua igual; `saida`, `entrada` sem `--run` continuam erro de uso.
- **U5a-10c** o runner manda rodar `pasta` sem `--run`, tirar o `run_id` da resposta e não montar a hora.
- **U5a-11a** a seção de veto do runner manda repetir o `conferir` depois do conserto.
- **U5a-12a** o runner não contém "Task tool", "Read tool", "Write tool" nem `.claude/settings.local.json`.
- **U5a-14a a 14j** um teste de texto por letra da regra 14.
- **U5a-15a** o `system.md` traz os seis cabeçalhos do `company.md` e manda tirar a marca dos dois arquivos.
- **U5a-16a** runner ≤ 872, build ≤ 649, design ≤ 703 linhas.
- **U5a-17a** entrega só com `documentos/`: "O que não foi conferido" não cita imagens nem redes.
- **U5a-upg-a** workspace 1.11.0 com uma crew cujo passo não tem formato → `update` → `texto-livre.md` instalado; `conserto.mjs --aplicar "formato:1=texto-livre"` do workspace grava; nenhum arquivo de `crews/` mudou com o `update`.

## 8. Fora desta fase
| Item | Destino |
|---|---|
| Dividir o runner | → U5 fatia 2 (1.13.0) |
| Score do `runs.md`, execução abortada, histórico, `retomar` | → U5 fatia 3 (1.14.0) |
| `/opencrew pedir`, entrega avulsa, documento por pedido em texto | → U5 fatia 4 (1.15.0) |
| `FONTES:OK` virar outro status quando há alerta | → sem fase — mudaria o contrato que o runner lê; a linha nova resolve |
| Agentes-base no formato do Build (Gate 1 × base) | → sem fase — projeto pausado (roteiro da U5) |
| "6 tons padrão" sem definição; checkpoint de aprovação de conteúdo no tier Standard | → sem fase — projeto pausado; nenhum impediu criar a crew |
| Saída do `init` em inglês | → sem fase — projeto pausado |
| "Caminho citado num passo contado como fonte" | → sem fase — projeto pausado; muda o que a conferência conta |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente do código dos scripts alterados.
- [ ] Execução real por IA num projeto de teste: criar uma crew de proposta (passo com
      `texto-livre`) pelos prompts, rodar até a entrega com o `run_id` vindo do script, e seguir
      o `/opencrew repair` numa crew com passo sem formato.
- [ ] Com o sim do dono: release; `update` em A e B; e o conserto da `propostas-comerciais`
      (`formato:8=texto-livre`) aplicado com o sim dele — depois disso as três crews reais
      respondem `CONSERTO:OK`.
- [ ] README, CHANGELOG, GLOSSARIO, `IDEIAS.md` e o roteiro das auditorias atualizados no mesmo commit.

## 10. Limites conhecidos
- **Da revisão do código (2026-10-07):** `pasta` com um `--arquivo` sobrando derrubava o script;
  `--run` sem valor ganhava a mensagem errada; a mensagem da chave do perfil não citava o espaço
  antes dos dois-pontos. Os três corrigidos, com teste. Ficou como está: arquivo (não pasta) com
  o nome exato da execução em `output/` faz o `pasta` parar com erro; uma linha só com dezenas de
  milhares de pares de `*` derruba a leitura do documento, e o verificador marca o arquivo como
  "não verificado".
- **Da execução real (2026-10-07, `%TEMP%\opencrew-u5a-real-8409`):** a crew de proposta criada
  pelos prompts saiu com `texto-livre` e `CONSERTO:OK`; a execução foi até a entrega com o `run_id`
  do script, sem `.docx`; o conserto de uma crew com passo sem formato e caminho absoluto terminou
  em dia, com as cópias certas e nada alterado fora dela. Ajustes que saíram dela, só com teste
  automático (não houve segunda execução real): o discovery e o `repair` perguntam se o texto
  precisa virar Word, em vez de supor; depois do onboarding, o comando que veio junto é atendido;
  duas frases cortadas no `entrega.prompt.md` (desde a 1.10.0) foram completadas; arquivo
  `texto-livre` em `outros/` deixou de aparecer como aviso; a frase do achado `formato` diz o que
  de fato acontece (o verificador procura peças de rede), não "vai para outros". O que ela achou
  e é anterior à fase está no `IDEIAS.md`.
- `texto-livre` não mede nada além das checagens gerais: é a escolha para quando não há limite a medir.
- A hora do `run_id` é a do computador que roda o script.
- Os alertas de documento dependem de o passo declarar `documento-oficial`.
- As frases novas dos prompts de criação são conferidas por teste de texto; se a IA as segue, só a execução real mostra.

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 9 | U5a-03a e 03b (a frase errada não volta) |
| 12 | U5a-01a, 02a (o que `texto-livre` mede e não mede) |
| 14 | `tests/upgrade-u5a.test.js` (U5a-upg-a) |
| 15 | U5a-10a (o `caminho.mjs` continua criando só pastas, dentro de `output/`) |
