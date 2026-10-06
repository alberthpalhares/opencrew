# IDEIAS — o que espera a hora certa

> Ideia só entra com triagem (4 campos): **O que plano/specs já dizem** · **Alocação**
> (`→ Fase N` ou `→ sem fase`, com motivo) · **Custo de adiar** · **Aprovação** (só se
> mudar o escopo de uma fase). Ideia implementada ou descartada **sai** daqui — o histórico
> fica no `CHANGELOG.md`. Ordem de execução: trilhas U e R em
> `docs/auditoria/2026-10-02-auditoria-geral.md` §3 (emenda de 2026-10-04) e
> `docs/jornada/2026-10-02-uso-real.md`.
>
> As 10 ideias do backlog original (Sherlock multi-fonte, criação por papéis, skills
> dinâmicas, tiers, aprendizado contínuo, templates de crew, exportação, registro de
> agentes, instalação não-destrutiva, seleção de agentes) saíram: estão no CHANGELOG
> (v1.3.0–v1.4.0). A #7 (instalação não-destrutiva) foi concluída na v1.4.2 (bloco marcado
> no `.gitignore` e no `.env.example`).
>
> Saíram em 2026-10-04, entregues na v1.6.0 (CHANGELOG): "Crew que lê as fontes do próprio
> projeto" e "Convivência com outros sistemas de agentes". O que ficou de fora delas tem destino:
> `fontes:` em crews que já existem → entrada do conserto de crews antigas, abaixo (U4); pontes
> antigas sem marcador → R2 (`docs/auditoria/2026-10-04-revisao-specs.md` §7, H3-06).

---

## `/opencrew retomar` — retomar um run interrompido
- **O que já existe:** o estado do run vive só na memória do modelo (T-A11).
- **Alocação:** → U4 — depende de `run-state.json` e do formato canônico de
  `pipeline.yaml` (T-A10).
- **Custo de adiar:** run longo que estoura o contexto é perdido inteiro.
- **Aprovação:** não.

## Orçamento de custo por run
- **O que já existe:** nada; skills pagas (OpenRouter, Apify, Resend) sem teto (T-A12).
- **Alocação:** → U5 — `Budget:` em `preferences.md`, confirmação antes de lote pago,
  teto de `--batch` no `generate.py`.
- **Custo de adiar:** gasto inesperado do usuário; retries multiplicam o custo.
- **Aprovação:** não.

## `/opencrew cleanup` + retenção
- **O que já existe:** `runs.md`, `output/{run_id}/vN/`, `_investigations/` (com `.wav`)
  crescem sem poda.
- **Alocação:** → U5.
- **Custo de adiar:** disco e leitura de contexto crescem com o uso.
- **Aprovação:** não.

## Dividir o `runner.pipeline.md`
- **O que já existe:** 916 linhas (~13k tokens; eram 829 na auditoria de 2026-10-02) lidas em
  todo run; overhead fixo de 25–35k tokens contra os "~5K" anunciados no tier Express.
- **Alocação:** → U5 — núcleo de ~250 linhas + arquivos carregados sob demanda
  (dashboard, seleção de agentes, reflexão); carregar os agentes uma vez só (T-M11).
- **Custo de adiar:** cada run paga o custo; a divisão fica mais cara à medida que a
  U1–U4 acrescentam regras ao runner.
- **Aprovação:** não.

## Documentos oficiais em DOCX/PDF + entrega dentro das pastas do projeto
- **O que já existe:** export PDF não executável (T-M21); no uso real o usuário escreveu um
  script Python + automação do Word à parte e copiou os resultados à mão (dor 6).
- **Alocação:** → U3b (documento Word, 1.8.0); a entrega nas pastas do projeto → U3a (1.7.0).
  PDF direto → sem fase — precisa de motor de renderização; o Word salva como PDF.
- **Custo de adiar:** o resultado não vira uso direto; gambiarras por projeto.
- **Aprovação:** sim — dada em 2026-10-04 para o motor: gerador próprio de `.docx`, sem
  dependência, em perfil fechado (`docs/auditoria/2026-10-04-revisao-specs.md` §2.5, decisão D5).

## Modo equipe: `/opencrew pedir <crew> "<tarefa>"`
- **O que já existe:** só o pipeline completo. No uso real a crew virou equipe permanente com
  tarefas avulsas fora do pipeline, uma delas fora do histórico (dor 7).
- **Alocação:** → U4 — com `runs.md` confiável para tarefas avulsas.
- **Custo de adiar:** histórico e memória perdem o que acontece fora do pipeline.
- **Aprovação:** não.

## `/opencrew feedback` — relato de uso para issue
- **O que já existe:** nenhum canal; usuários do npm não deixam rastro (U0).
- **Alocação:** → U5 — monta um texto (versão, etapa, onde travou, sem conteúdo do cliente)
  que o próprio usuário cola numa issue; + issue template "Relato de uso".
- **Custo de adiar:** decisões de produto sem evidência de quem usa.
- **Aprovação:** não.

## Conferir arquivos citados DENTRO das fontes (ex.: logos listados no manual de marca)
- **O que já existe:** U2 confere os caminhos citados pela crew; no Projeto A o manual de marca
  (uma fonte) lista nomes de logo que não existem na pasta — a crew usou texto no lugar do logo,
  sem aviso.
- **Alocação:** → U3a — como aviso que não para a execução: não muda `FONTES:` e o `--corrigir`
  nunca reescreve a fonte.
- **Custo de adiar:** peças visuais sem logo, falha silenciosa.
- **Aprovação:** não.

## `.opencrew-backup/` no `.gitignore` do usuário (e `update` renovar o bloco do `.gitignore`)
- **O que já existe:** a 1.6.0 cria `.opencrew-backup/<data>/` nas atualizações; o bloco do
  `.gitignore` só é escrito no `init` (o `update` não o renova).
- **Alocação:** → U3a — junto da entrega no projeto.
- **Custo de adiar:** em projetos com git, as cópias de segurança aparecem como arquivos novos.
- **Aprovação:** não.

## Papel timbrado / modelo `.dotx` do usuário
- **O que já existe:** nada. A spec U3 (não aprovada) previa `.docx` sem estilos de marca e
  mandava este item para a U4 sem motivo (A-36, G-20); o gerador decidido para a U3b é de perfil
  fechado (lista fixa de partes).
- **Alocação:** → sem fase — só depois da U3b e com pedido real; exige ler e regravar o arquivo
  de modelo do usuário.
- **Custo de adiar:** o documento sai sem timbre; quem precisa aplica o modelo à mão no Word.
- **Aprovação:** não.

## Conserto (`repair`) de crews antigas: ordem de publicação, `fontes:`, proibições sem aspas
- **O que já existe:** `/opencrew repair` só conserta nomes de agentes e o `crew-party.csv`; o
  `update` não altera as crews do usuário. Crews criadas antes da 1.4.2 mantêm "publicar antes
  do Review" (T-B15, H1-01); as anteriores à 1.6.0 não têm `fontes:` (H3-03); proibições antigas,
  sem aspas, não viram trava do verificador (H2-05); crews sem `on_reject` não passam pelo
  verificador (spec U1 §11).
- **Alocação:** → U4 — junto do histórico confiável; mexe em `crews/`, então pede confirmação e
  cópia (regra 3).
- **Custo de adiar:** as melhorias da 1.4.2, da 1.5.0 e da 1.6.0 só valem inteiras para crews novas.
- **Aprovação:** não.

## Overlay local: arquivo de acréscimo em vez de cópia inteira + aviso no `update`
- **O que já existe:** para gravar um aprendizado técnico, o runner copia o best-practice inteiro
  do core para `_opencrew/best-practices.local/`; daí em diante, correção de limite feita no core
  não chega mais àquele formato, e ninguém avisa (H3-01). A parte urgente (mesclar os
  `constraints:` com os do core e avisar quando o arquivo local não os declara) vai na R1.
- **Alocação:** → U5 — muda o desenho do overlay; as cópias inteiras que já existem continuam
  valendo.
- **Custo de adiar:** cada cópia local congela os limites daquele formato no projeto.
- **Aprovação:** sim — muda como o usuário guarda os próprios best-practices.

## Exemplos neutros no payload e nos testes
- **O que já existe:** exemplos de caminho tirados dos casos reais (cenários da spec U2) estão em
  `build.prompt.md`, em `discovery.prompt.md` e em `tests/conferir-fontes.test.js`; a trava de
  conteúdo do mantenedor (`tests/template-refs.test.js`) não os procura (G-29).
- **Alocação:** → U5 — higiene, sem urgência: são nomes genéricos de pasta, sem texto de cliente.
- **Custo de adiar:** esses nomes seguem no prompt instalado em todo usuário.
- **Aprovação:** não.

## Contagem de caracteres por canal (X/Twitter)
- **O que já existe:** o verificador conta todo emoji como 1 e a URL inteira, em qualquer canal
  (`verificar/regras.mjs`); no X, emoji vale 2 e todo link vale 23 (H2-17).
- **Alocação:** → U5 — polimento: o limite do tweet já é medido, só o peso muda.
- **Custo de adiar:** tweet com emojis passa acima do limite real; tweet com link longo é
  bloqueado sem motivo.
- **Aprovação:** não.

## Busca semântica dentro das fontes
- **O que já existe:** o runner lê cada fonte inteira até ~300 linhas; acima disso, só os títulos
  e os trechos que julgar relevantes (`runner.pipeline.md`, passo 1c). A spec U2 (§11) adiou a
  busca semântica (H3-12).
- **Alocação:** → U5 — custo (tokens por execução).
- **Custo de adiar:** em fonte longa, um trecho importante pode ficar fora da leitura.
- **Aprovação:** não.
