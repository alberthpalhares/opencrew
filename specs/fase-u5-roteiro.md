# Roteiro — Fase U5, o fechamento do OpenCrew (1.12.0 a 1.15.0)

- **Status:** aprovado pelo dono em 2026-10-07. Depois da U5 o projeto entra em pausa: uso como está.
- **O que é:** a U5 deixou de ser a trilha "rápido, barato e em PT-BR, contínuo". Passa a reunir o
  polimento do uso, a divisão do runner e o resto da U4 (histórico confiável, retomar execução,
  modo equipe e entrega avulsa), e termina com o fechamento dos documentos.
- **Como sai:** quatro fatias, cada uma com spec própria, aprovação do dono, execução real e
  release, na ordem abaixo. O ciclo do `AGENTS.md` vale em cada uma.

| Fatia | Versão | Spec | O que entrega |
|---|---|---|---|
| 1. Polimento do uso | 1.12.0 | `fase-u5a-polimento-do-uso.md` | formato para texto sem canal e sem Word; mensagens da conferência de fontes; avisos de documento antes do revisor; consertos pequenos do runner; contradições dos prompts de criação; onboarding |
| 2. Runner dividido | 1.13.0 | `fase-u5b-runner-dividido.md` (a escrever) | o `runner.pipeline.md` fica com o que toda execução usa; cada bloco condicional vira um arquivo em `_opencrew/core/runner/`, com um toco no molde da seção `### Entrega`. Nenhuma regra muda de texto |
| 3. Execução registrada | 1.14.0 | `fase-u5c-execucao-registrada.md` | registro da execução em disco, gravado por script; `runs.md` gravado pelo script (uma definição de score, execução abortada registrada); conciliação do histórico antigo no `/opencrew repair`; Regra de Ouro contada pelo registro; `/opencrew retomar` |
| 4. Modo equipe | 1.15.0 | `fase-u5d-modo-equipe.md` (a escrever) | `/opencrew pedir <crew> "<tarefa>"`; entrega avulsa (`entregar.mjs` sem `--run`); documento Word por pedido em texto |
| Fechamento | no commit da fatia 4 | — | `IDEIAS.md`: o que não entrou vira `→ sem fase — projeto pausado`; roteiro das auditorias e da jornada fechado; `STATUS.md` com "Como retomar" |

## Por que nesta ordem
- A fatia 2 vem antes das 3 e 4 para que o que elas acrescentam já nasça fora do núcleo do runner.
- A fatia 4 depende da 3: a tarefa avulsa é registrada no histórico que a 3 torna confiável.
- As fatias 1 e 2 melhoram o produto sozinhas; se a pausa precisar vir antes, o corte é depois delas.

## O que o levantamento de 2026-10-07 mostrou
- **Runner (871 linhas):** 368 usadas em toda execução, 382 só em alguma condição, 121 só no fim.
  Saem sem quebrar teste: resumo da ordem dos passos, compressão de contexto, tarefas do agente e
  nota de idioma (112 linhas). Seleção de agentes (77), fim da execução (105), migração de memória
  (32) e contrato de saída (32) custam de 1 a 10 testes cada. Escritório e laço de revisão são os
  mais caros (cerca de 50 e 40 testes presos ao cabeçalho).
- **`update`:** arquivo novo em `_opencrew/core/` chega a quem já usa; arquivo removido ou renomeado
  fica para trás. A divisão só acrescenta arquivos.
- **Estado em disco:** não existe. O `state.json` do Escritório só é gravado com o painel ligado, é
  um por crew e não guarda `run_id`, passos nem caminhos.
- **Histórico:** o `runs.md` é escrito pela IA, só no fim, com duas definições de score (numa crew
  real saiu uma terceira); execução abortada não é registrada; a Regra de Ouro conta repetições
  num arquivo que, por regra, não guarda dado de execução.
- **Entrega:** `entregar.mjs` exige `--run`; o resto dele não depende do pipeline.

## Fica de fora (registrado no fechamento como "sem fase — projeto pausado")
Orçamento de custo por execução · limpeza e retenção · overlay local de best-practices ·
agentes-base no formato do Build e `extends:` · busca semântica nas fontes · `/opencrew feedback` ·
contagem de caracteres do X · trecho visível de 125 e 210 caracteres · exemplos neutros no payload ·
U3a fatia 3 (medir como colado, imagens, mais de um canal) · publicador lendo a entrega · extras do
documento Word (`.dotx`, imagem, sumário, PDF direto) · reordenar a publicação antes da revisão.
