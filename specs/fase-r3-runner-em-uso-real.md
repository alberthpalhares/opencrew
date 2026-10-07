# Spec — Fase R3: Reparos do runner em uso real (1.7.1)

- **Fase:** R3 · **Módulos:** Runtime (`templates/_opencrew/core/`: `runner.pipeline.md`, `scripts/`, `prompts/discovery.prompt.md`) + testes. O CLI (`src/`) não muda · **Status:** aprovada pelo dono (2026-10-06); implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Caminho da execução
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** execução real de 2026-10-06 (spec E1, §8, item 5), em que um agente fez o papel da IA da IDE e rodou uma crew seguindo o runner ao pé da letra; `IDEIAS.md` (as duas entradas com `→ R3`); achado T-M13 da auditoria de 2026-10-02.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Quem calcula os caminhos é um script, não a IA** (regras 1 a 6). Hoje a IA monta o caminho
   com `ls | sort | tail` e confere com `test -s` e `grep`. Não adotado: só reescrever o texto do
   runner com um comando para bash e outro para PowerShell (dobra o prompt e continua dependendo
   de a IA acertar).
2. **A pasta de versão continua subindo como hoje** (regra 3): cada passo que grava num grupo
   abre a `vN` seguinte. O que muda é a entrada: ela passa a ser procurada na versão mais nova
   que tem o arquivo. Não adotado: uma pasta de versão por ciclo de revisão (mais limpo, mas
   muda onde os arquivos ficam e mexe na U3a, que já conta com `v1`, `v2`, `v3`).
3. **Um comando só por conferência** (regra 5): existência, número de seções e TL;DR saem numa
   chamada. Hoje são até três.
4. **O que é só leitura deixa de ser comando** (regra 7): saber se a memória está no formato novo
   e se o `runs.md` existe passa a ser feito lendo o arquivo, sem terminal.

## 1. Objetivo
Uma IA que segue o runner ao pé da letra para no segundo passo, porque procura a entrada num
caminho em que o passo anterior não gravou. E, no Windows, cada conferência depende de a IA
traduzir um comando de bash. Depois desta fase, o caminho de cada arquivo da execução sai de um
script que roda igual em qualquer sistema, e a entrada de um passo é sempre a saída mais nova do
anterior.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| Execução real, achado 1 | `inputFile` validado só com o `run_id`: `output/<run>/pesquisa.md` falha com `v1/pesquisa.md` em disco | R3-02 |
| Execução real, achado 2 | Os exemplos do runner sugerem tudo em `v1`, e a regra sobe a pasta a cada passo | R3-01, R3-04a |
| Execução real, achados 3 e 13 | `test -s`, `grep -q`, `ls \| sort -V \| tail`, `mkdir -p`, `[ -f ]` no runner; `ls crews/ 2>/dev/null` no discovery | R3-01 a R3-04 |
| T-M13 | O Architect proíbe o `mkdir` do Bash e o runner manda usá-lo | R3-01d, R3-04 |
| R2, regra 20 | Caminho de crew sempre entre aspas e só com caracteres seguros | mantido: R3-04b |
| Fora daqui | Ver §8 | — |

## 3. Entradas
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| pasta atual do comando | raiz do projeto | sim | contém `_opencrew/` |
| `caminho.mjs <crew> <ação>` | nome da crew e ação | sim | `crews/<crew>/` existe, dentro do projeto; ação da regra 1 |
| `--run` | id da execução | nas ações `pasta`, `saida` e `entrada` | só letras, dígitos, `.`, `_` e `-` |
| `--arquivo` | caminho declarado no passo (`inputFile` ou `outputFile`) | nas ações `saida`, `entrada` e `conferir` | dentro do projeto |
| `--secoes` | inteiro | não | a partir de 1 |
| `--tldr` | opção | não | — |

## 4. Saídas
- **Uma linha de resultado**, sempre a última:
  `CAMINHO:OK <caminho>` · `CAMINHO:FALTA <caminho procurado>` · `CAMINHO:REPROVADO <motivo>`.
  O caminho sai relativo à raiz do projeto, com `/`.
- **Código de saída:** 0 quando a linha `CAMINHO:` sai; 1 em erro de uso (ação ou opção faltando,
  raiz sem `_opencrew/`, crew inexistente ou fora do projeto), sem linha `CAMINHO:` e sem
  escrever nada.

## 5. Regras

**Script (`scripts/caminho.mjs`, módulos em `scripts/caminho/`)**
1. **Quatro ações:**
   - `pasta --run <id>`: cria `crews/<crew>/output/<id>/` (com as pastas-mãe) e responde
     `CAMINHO:OK`. Pasta que já existe não é erro.
   - `saida --run <id> --arquivo <declarado>`: devolve o caminho em que o passo grava (regras 2 e
     3) e cria a pasta dele.
   - `entrada --run <id> --arquivo <declarado>`: devolve o caminho da saída mais nova desse
     arquivo (regra 4), ou `CAMINHO:FALTA`.
   - `conferir --arquivo <caminho já resolvido> [--secoes N] [--tldr]`: confere o arquivo
     gravado (regra 5).
2. **Caminho da execução.** Caminho declarado que começa por `crews/<crew>/output/` ganha
   `<run>/` logo depois de `output/`. Qualquer outro caminho é devolvido como veio, sem pasta de
   versão e sem criar nada.
3. **Pasta de versão na saída.** O grupo é a pasta do arquivo, já com o `<run>`. A versão é a
   maior `vN` que existe no grupo, mais 1; sem nenhuma, `v1`. Contam só pastas de nome `v` +
   número; a ordem é numérica (`v10` vem depois de `v9`).
4. **Entrada: a versão mais nova que tem o arquivo.** No grupo do arquivo, procura da maior `vN`
   para a menor e devolve a primeira em que o arquivo existe e não está vazio. Se não achar em
   nenhuma, olha o próprio grupo, sem pasta de versão (é onde ficam as respostas de checkpoint).
   Não achou: `CAMINHO:FALTA`, com o caminho do grupo.
5. **Conferência do arquivo gravado.** `CAMINHO:OK` quando o arquivo existe e não está vazio e,
   se pedido: tem pelo menos N linhas começando por `## ` (`--secoes`) e tem uma linha começando
   por `## TL;DR` (`--tldr`). Senão `CAMINHO:REPROVADO`, com o primeiro motivo da §6.
6. **Só cria pastas, e só dentro de `crews/<crew>/output/<run>/`.** Nunca cria, altera nem
   apaga arquivo. Sem dependência; APIs do Node 20.0.

**Runner e discovery**
7. **O runner deixa de ter comando de bash para caminho e conferência.** A transformação de
   caminho (hoje "Step 1" e "Step 2"), a validação de entrada, a validação de saída, a contagem
   de seções, o TL;DR e a criação da pasta da execução viram chamadas ao `caminho.mjs`. Saber se
   `memories.md` tem o título `## Estilo de Escrita` e se `runs.md` existe passa a ser feito
   lendo o arquivo com a ferramenta de leitura, sem comando. Ficam como estão as chamadas a
   `verificar.mjs`, `conferir-fontes.mjs` e `estado.mjs`.
8. **A entrada de um passo vem do script.** Antes de executar o passo, o runner roda `entrada`
   para o `inputFile`. `CAMINHO:OK`: usa o caminho devolvido. `CAMINHO:FALTA`: a pergunta de
   hoje ("Input … not found": pular o passo ou abortar), sem mudança de texto.
9. **A saída de um passo vem do script, uma vez por grupo.** O runner roda `saida` para o
   primeiro `outputFile` de cada grupo e reaproveita a pasta de versão devolvida para os outros
   arquivos do mesmo grupo naquele passo, como hoje.
10. **Script que não roda: o runner avisa e segue**, como na R1 (regra 20 de lá): mostra uma
    linha ao usuário, monta o caminho pela regra escrita no próprio runner (a regra fica lá, em
    prosa, sem comando) e continua. O arquivo assim tratado aparece como "não verificado" na
    aprovação final.
11. **Regra do nome seguro (R2) vale para os comandos novos:** nome da crew e caminhos entre
    aspas duplas, só com os caracteres da regra 20 da R2.
12. **Discovery:** a listagem das crews existentes deixa de ser `ls crews/ 2>/dev/null`; passa a
    ser feita com a ferramenta de listar pastas da IDE.
13. **O Architect e o runner deixam de se contradizer sobre o `mkdir`:** nenhum dos dois manda
    criar pasta por comando; a pasta da execução nasce na ação `pasta` e as demais na `saida`.

**Entrega**
14. **Tudo mora em `templates/_opencrew/core/`**: chega a quem já usa com um `update`, sem
    migração (regra 14 do AGENTS.md). Execução antiga, gravada pelas regras de antes, continua
    legível: a regra 4 acha qualquer `vN`.

## 6. Textos
| Onde | Texto |
|---|---|
| `conferir`, arquivo ausente ou vazio | `CAMINHO:REPROVADO arquivo ausente ou vazio` |
| `conferir`, poucas seções | `CAMINHO:REPROVADO <achadas> seções, mínimo <N>` |
| `conferir`, sem TL;DR | `CAMINHO:REPROVADO falta a seção TL;DR` |
| erro de uso | `Uso: node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]` e o motivo |
| Runner, script que não rodou | `Não consegui rodar a conferência de caminhos; sigo pela regra escrita e marco os arquivos como não verificados.` |

## 7. Cenários

**R3-01 — Saída**
- **R3-01a** DADA uma execução sem nenhum arquivo QUANDO `saida --arquivo crews/x/output/pesquisa.md`
  ENTÃO `CAMINHO:OK crews/x/output/<run>/v1/pesquisa.md` e a pasta `v1` existe.
- **R3-01b** DADO o grupo com `v1` e `v3` ENTÃO a saída vai para `v4`; com `v9` e `v10`, para `v11`;
  pasta chamada `versao2` ou arquivo chamado `v5` não contam.
- **R3-01c** DADO `--arquivo crews/x/output/slides/capa.md` ENTÃO o grupo é `…/<run>/slides/` e a
  versão é contada só dentro dele.
- **R3-01d** QUANDO `pasta --run r1` duas vezes ENTÃO as duas respondem `CAMINHO:OK` e a pasta existe.
- **R3-01e** DADO `--arquivo docs/fora.md` (fora de `output/`) ENTÃO o caminho volta igual e nada é
  criado.

**R3-02 — Entrada**
- **R3-02a** DADOS `v1/pesquisa.md` e `v2/post.md` QUANDO `entrada --arquivo crews/x/output/pesquisa.md`
  ENTÃO `CAMINHO:OK …/v1/pesquisa.md` (é o caso que hoje falha).
- **R3-02b** DADO o arquivo em `v1` e, reescrito, em `v3` ENTÃO a entrada é a de `v3`; se o de `v3`
  estiver vazio, a de `v1`.
- **R3-02c** DADA a resposta de um checkpoint gravada direto no grupo, sem `vN`, ENTÃO a entrada a
  acha; havendo também numa `vN`, vale a da `vN`.
- **R3-02d** DADO nenhum arquivo ENTÃO `CAMINHO:FALTA`, código 0.

**R3-03 — Conferência e casca**
- **R3-03a** arquivo com conteúdo: `CAMINHO:OK`; ausente ou com 0 bytes: o texto da §6.
- **R3-03b** `--secoes 3` com duas linhas `## `: reprovado com a contagem; com três: OK. `###` não
  conta.
- **R3-03c** `--tldr` sem a linha `## TL;DR`: reprovado; com ela: OK.
- **R3-03d** crew inexistente, `../fora`, `--run` com barra ou sem `--run`: código 1, sem linha
  `CAMINHO:` e nada criado.
- **R3-03e** DEPOIS de qualquer sequência de ações ENTÃO nenhum arquivo foi criado, alterado ou
  apagado, e toda pasta nova está dentro de `crews/<crew>/output/<run>/`.

**R3-04 — Runner e prompts (contrato)**
- **R3-04a** o runner cita `scripts/caminho.mjs` com as quatro ações e não tem mais `ls -1`,
  `sort -V`, `test -s`, `test -f`, `grep -q`, `grep -c`, `mkdir -p` nem `[ -f`.
- **R3-04b** nos comandos novos, o nome da crew e os caminhos estão entre aspas duplas.
- **R3-04c** o runner diz que a entrada vem da ação `entrada` e mantém a pergunta de pular ou
  abortar; traz a frase da §6 para o script que não rodou.
- **R3-04d** `discovery.prompt.md` não tem `ls crews/`; o Architect e o runner não mandam criar
  pasta por comando.

**R3-upg — Quem já usa**
- **R3-upg-a** DADO um workspace 1.7.0 QUANDO `update` ENTÃO existe `scripts/caminho.mjs` e as crews
  e a memória ficam iguais, byte a byte.
- **R3-upg-b** DADA, nesse workspace, uma execução antiga com `v1/pesquisa.md` e `v2/post.md` ENTÃO
  o script instalado resolve a entrada de `pesquisa.md` em `v1`.

## 8. Fora desta fase
| Item | Alocação |
|---|---|
| Uma pasta de versão por ciclo de revisão, em vez de uma por passo | → U3a — é ela que define onde fica a entrega |
| "Save final output" sem dizer qual arquivo é o final | → U3a (regra 21 de lá tira o passo) |
| Formato canônico de `pipeline.yaml` e de `crew.yaml`; `id` do agente com três definições | → U4 |
| Onboarding: formato do `company.md` e a marca `NOT CONFIGURED` | → U5 |
| Trecho visível da legenda declarado e não medido | → U5 |
| Dividir o runner em arquivos sob demanda | → U5 |

## 9. Critérios de aceite
- [x] Cenários com teste de mesmo ID, vistos vermelhos antes do código (R3-upg-b foi escrito depois do script: nasceu verde).
- [x] `npm run verify` verde; os testes R2-04d que contam comandos de bash no runner são
      reescritos para o contrato novo (R3-04a, R3-04b).
- [x] Uma execução real de crew, por um agente no papel da IDE, do início ao fim, sem parar em
      "Input not found" e sem traduzir comando. Feita em 2026-10-06, no PowerShell, com uma crew
      de 3 agentes e 5 passos criada pelo fluxo normal: 12 comandos do runner, nenhum traduzido,
      todos com código 0; as 3 entradas responderam `CAMINHO:OK` (uma de checkpoint, sem `vN`, e as
      de `v1` e `v2`). Não exercitados: `CAMINHO:FALTA`, `CAMINHO:REPROVADO` e revisão rejeitada.
- [x] No mesmo commit: CHANGELOG 1.7.1, GLOSSARIO, `IDEIAS.md` (saem as duas entradas), README se
      citar os comandos (não cita: sem mudança).
- [ ] `npm version patch --no-git-tag-version`; push, CI verde nas quatro células e só então a tag,
      com confirmação do dono.

## 10. Limites conhecidos
- O script resolve caminho e conferência; ele não impede a IA de gravar em outro lugar. A
  validação de saída continua sendo a trava.
- Dois passos rodando ao mesmo tempo no mesmo grupo podem receber a mesma `vN`. O runner roda um
  passo por vez.
- Passo reexecutado por veto regrava no mesmo caminho e o runner não manda repetir o `conferir`:
  o arquivo corrigido segue sem passar de novo pela conferência (visto na execução real).
- "Save final output" continua no runner e gera uma cópia do arquivo final na raiz da execução
  (§8: sai na U3a).
- Cada conferência continua sendo uma chamada de terminal; o número de chamadas por passo cai,
  mas não some.

## 11. Travas que esta spec deixa
`tests/caminho.test.js` (R3-01, R3-02) · `tests/caminho-casca.test.js` (R3-03) ·
`tests/runtime-contracts-r3.test.js` (R3-04) · `tests/runtime-contracts-r2.test.js` (R2-04d
reescritos) · `tests/upgrade.test.js` ou `tests/upgrade-r3.test.js` (R3-upg) · alerta de tamanho:
nenhum módulo acima de 200 linhas, nenhum teste novo acima de 300.
