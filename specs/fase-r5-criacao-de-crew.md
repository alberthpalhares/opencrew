# Spec — Fase R5: Criação de crew — tamanho coerente e time separado do pipeline

- **Fase:** R5 · **Módulos:** Payload (`templates/_opencrew/core/prompts/`: `design.prompt.md` (Fases B.5, D, F, G, H e Output), `discovery.prompt.md` (resumo do template), `build.prompt.md` (Step D)) + CHANGELOG + AGENTS.md + IDEIAS.md + testes · **Status:** rascunho — aguardando aprovação do dono (regra 1: SPEC ⏸ → BDD ⏸)
- **Versão:** 1.19.3 (patch; a U6 fatia 3, `fase-u6c-medicao.md`, segue como 1.20.0).
- **Termos novos no GLOSSARIO.md:** não. Usa "Passo" (já no glossário), nunca "etapa".
- **Modelo sugerido:** execução Sonnet 5.5 · Default
- **Origem:** pedido do dono em 2026-10-30, na criação de uma crew: (1) o `/opencrew create` pergunta o tamanho (tier) e logo depois sugere um time de outro tamanho; (2) time (pessoas) e pipeline (passos) saem misturados — uma crew pode ter 7 membros e 12 passos. Plano revisado de forma independente (Fable 5.1, high); todos os achados foram conferidos no código.
- **Depende de:** nada novo. O `design.prompt.md` mora em `_opencrew/core/`, que o `update` já renova (regra 14).

**Decisões do dono (2026-10-30, "sigo as recomendações"):**
1. Vocabulário: **"passos"** do pipeline, nunca "etapas".
2. Teto de linhas: **compactar** o `design.prompt.md` para manter 703, em vez de subir o teto.
3. **`templates/crews/*/discovery.template.yaml` fora do escopo** (o `update` não renova `crews/`).
4. Entrega: 1.19.3; `npm version`, push e tag só com o sim do dono (regra 8).

## 1. Objetivo
O número de pessoas da crew proposta respeita o tier que o usuário escolheu, em todas as fases do
Design; e o usuário vê, em blocos separados, **quem** é cada membro (nome e função) e **quais**
são os passos do pipeline e quem faz cada um.

## 2. Causa (conferida no código)
- **Tamanho.** A Fase B.5 pergunta o tier (Express 2-3 · Standard 3-5 · Full 5-7 pessoas). A Fase D
  ("Role Proposal") sugere o time por outra régua, a complexidade ("2-3 / 3-4 / 4-6 roles"), sem
  olhar o tier. A Fase F ("Recruit all agents necessary…") e a G ("ONE dedicated creator agent per
  target format") podem levar o número para fora da faixa depois — Express com 3 formatos vira 4.
  O resumo do template (`discovery.prompt.md`, "Time sugerido: {N} agentes") não cita o tier.
- **Mistura.** A Fase H (em inglês) mostra "N agents", `Tasks: a → b → c` por agente e o pipeline
  numa linha com os mesmos rótulos de papel. Pessoa, tarefa do agente, passo e checkpoint (decisão
  do usuário) parecem uma lista só. O runner roda **todas** as `tasks:` do agente em cada passo em
  que ele aparece (`runner/tarefas-do-agente.md`); por isso não se mostra tarefa por passo.

## 3. Regras
1. **Fase D — faixa do tier.** O número de pessoas vem da linha *Agent count* da tabela *Tier
   Impact* (Express 2-3, Standard 3-5, Full 5-7); a complexidade só escolhe **dentro** da faixa.
   O bullet "Suggest based on crew complexity: 2-3 / 3-4 / 4-6" sai.
2. **Fase D — anúncio.** Antes da lista, uma linha diz o tier e a faixa ("Você escolheu Standard →
   3 a 5 pessoas"). A lista traz só pessoas: ícone, nome, função em uma frase — sem passos, sem
   tarefas, sem skills.
3. **Fase D — edição fora da faixa.** Se a edição do usuário ("adicionar, remover ou modificar") —
   ou o time do template, na trilha em que o tier vem como fato — leva o número para fora da faixa,
   a IA diz em uma linha e pergunta: manter o tier ou mudar. Vale o que o usuário escolher, e é
   esse tier que vai para o `design.yaml`.
4. **Fase F — sem agente a mais.** O número de agentes foi fechado na Fase D; a F não acrescenta.
   Se a faixa não comporta um criador por formato, um criador atende vários (o `format:` é do
   passo, não do agente). A regra da Fase G que pede um criador por formato passa a valer "quando a
   faixa do tier permite".
5. **Fase B.5 e resumo do template.** A opção que é o `Default Tier` das preferências vem marcada
   "(padrão das suas preferências)". O resumo do template na Discovery mostra o tier e o time juntos:
   "Tier: {tier} · Time: {N} pessoas".
6. **Fase H — dois blocos, em PT-BR** (o texto mostrado ao usuário segue a regra 13):
   - "👥 **Time — N pessoas**": uma linha por pessoa (ícone, nome, função). Nada de tarefas, passos
     ou skills.
   - "🔀 **Pipeline — M passos**": lista numerada; cada linha com o número, a ação (verbo) e quem faz
     (nome da pessoa, ou "você decide" no checkpoint); o `format` quando houver. Checkpoint = "você
     decide" (informa o foco · escolhe a notícia · escolhe o ângulo · aprova), com a decisão no rótulo.
   - O rótulo de um passo **nunca** é nome de pessoa nem de papel. A mesma pessoa pode aparecer em
     vários passos. **Tarefas do agente não aparecem em lugar nenhum da Fase H.**
   - Os padrões de sequência (fonte fixa / notícias) ficam só na Fase G; a H não os repete. As linhas
     de passo do exemplo não usam `→`.
   - Fecha com "Posso criar?" e os caminhos dos documentos de referência, como hoje.
7. **Output — autoconferência.** Antes de gravar o `design.yaml`: `agents:` tem N entradas e
   `pipeline:` tem M — os números apresentados. (O arquivo só existe depois da aprovação, por isso
   a conferência mora na gravação, não na apresentação.)
8. **Build, Step D.** O resumo final passa a dizer `Crew "{name}" criada: {N} pessoas, {M} passos no
   pipeline!` — uma linha no lugar de uma (o `build.prompt.md` tem folga de 1 linha: teto 651).

## 4. Cenários (BDD)
- **R5-01a** (contrato) DADO o `design.prompt.md` ENTÃO a Fase D liga o número de pessoas à linha
  *Agent count* da tabela de tiers e não traz mais "Suggest based on crew complexity".
- **R5-01b** (contrato) DADO o `design.prompt.md` ENTÃO a Fase D manda perguntar "manter o tier ou
  mudar" quando a edição ou o template leva o número para fora da faixa.
- **R5-02a** (contrato) DADA a Fase D ENTÃO ela manda dizer o tier e a faixa antes de listar, e a
  lista de pessoas não traz tarefas, passos nem skills.
- **R5-03a** (contrato) DADA a Fase F ENTÃO ela diz que não acrescenta agentes além da Fase D e que
  um criador pode atender vários formatos; DADA a Fase G ENTÃO "um criador por formato" vale quando
  a faixa do tier permite.
- **R5-04a** (contrato) DADOS `design.prompt.md` (B.5) e `discovery.prompt.md` ENTÃO a opção do
  `Default Tier` é marcada "(padrão das suas preferências)" e o resumo do template traz "Tier:" e
  "Time:" juntos; o texto antigo "Time sugerido: {N} agentes" some.
- **R5-05a** (contrato) DADA a Fase H ENTÃO está em PT-BR, tem os dois blocos "Time — N pessoas" e
  "Pipeline — M passos", não contém "Tasks:" nem a frase em inglês "I'll create a crew".
- **R5-05b** (contrato) DADA a Fase H ENTÃO manda rotular passo por ação (nunca por nome/papel),
  chamar checkpoint de "você decide" e não listar tarefas do agente.
- **R5-06a** (contrato) DADA a seção Output ENTÃO manda conferir que `agents:` tem N entradas e
  `pipeline:` tem M antes de gravar.
- **R5-07a** (contrato) DADO o Step D do `build.prompt.md` ENTÃO diz "{N} pessoas" e "{M} passos" e
  o arquivo não passa de 651 linhas.
- **R5-upg** DADO um workspace com `design.prompt.md` antigo (com "Suggest based on crew
  complexity") QUANDO `update` ENTÃO o arquivo traz o texto novo e o `crew.yaml` das crews do
  usuário fica intacto. Não há migração: o arquivo mora em `_opencrew/core/` (regra 14).

## 5. Travas existentes que mudam
- **F1-08a** (`tests/runtime-contracts.test.js`) exige ≥ 4 linhas com `→` + `Review` +
  `checkpoint` (2 na Fase G, 2 na H). Como a H deixa de repetir os padrões, o limiar cai para **≥ 2**,
  com comentário citando R5; o resto do teste (publicar só depois de Review + aprovação) não muda.
- **Teto de linhas** `design.prompt.md` ≤ 703 (`tests/runtime-contracts-u4a.test.js` e
  `-u5a.test.js`) **não sobe**: o crescimento da D/F/H/Output é compensado compactando os exemplos
  de nomes por idioma da Fase F (22 linhas → ~6) e tirando as linhas de padrão repetidas da H.
  `build.prompt.md` ≤ 651 (u5a): troca de 1 linha por 1 linha.
- **Frases travadas, preservadas:** `**Every crew needs a review step**`, `The step still exists
  (with \`on_reject\`), so the automatic checker runs before it.`, a linha da tabela de tiers
  (`Express.*Standard.*Full`), "present roles as people", "never as tools or skills", os títulos das
  Fases B.5 a H, "DO ask about tier".

## 6. Fora do escopo
- `templates/crews/*/discovery.template.yaml`: o `update` entrega `crews/` sem sobrescrever
  (`overwrite: false`); mudá-los exigiria migração (regra 14). O `newsletter-mensal` é
  `tier: express` com revisor dedicado, contra a tabela → `IDEIAS.md` (→ sem fase — depende de
  migração dos templates).
- Fluxo `/opencrew edit` e `repair.prompt.md`; mudar as faixas dos tiers.
- A Fase C extrai artefatos "para CADA agente" antes de a Fase D fechar o time → `IDEIAS.md`
  (→ sem fase — mudança de ordem das fases, precisa de spec própria).
- Itens já no `IDEIAS.md`: "a tabela de tier Standard não comporta a crew de dois agentes" fica
  como **consequência aceita** (quem quer 2 pessoas escolhe Express); "`Default Tier` lido e a
  pergunta feita mesmo assim" é **fechado** pela regra 5.

## 7. Conferência que o `npm run verify` não cobre (regra 7)
A execução real do prompt por uma IA, no `sandbox/`: criar uma crew Express com 3 formatos (regra 4)
e uma Full; conferir a faixa na Fase D e os blocos "Time" e "Pipeline" com N e M certos. Conferência do dono.
