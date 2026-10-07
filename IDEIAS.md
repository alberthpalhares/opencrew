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
>
> Saíram em 2026-10-07, entregues na v1.9.0 (CHANGELOG): a cópia da entrega para uma pasta do
> projeto, o relatório do laço de revisão gravado pelo script, e, no `.gitignore`, o marcador órfão
> e o comentário do bloco. O que a 1.9.0 deixou de fora (`specs/fase-u3a2-entrega-no-projeto.md`,
> §8) está nas entradas abaixo.
>
> Saíram em 2026-10-07, entregues na v1.10.0 (CHANGELOG): "Documentos oficiais em DOCX/PDF" (o
> documento Word) e "Papel timbrado / modelo `.dotx` do usuário" (o perfil de documento oficial:
> logotipo, cabeçalho e rodapé num arquivo de texto do projeto). O que a 1.10.0 deixou de fora
> (`specs/fase-u3b-documento-word.md`, §8) está numa entrada só, abaixo: "Documento Word: o que a
> 1.10.0 não fez".
>
> Saíram em 2026-10-07, entregues na v1.11.0 (CHANGELOG): o conserto de crews antigas
> (`/opencrew repair` com o script `conserto.mjs`), o formato da crew escrito num arquivo só, o
> domínio de documento na criação e `init --ide=<lista> --yes`. O que a 1.11.0 deixou de fora
> (`specs/fase-u4a-conserto-de-crews.md`, §8) está nas entradas abaixo. **A U4 saiu em três
> fatias:** 1 = 1.11.0 (entregue); 2 = 1.12.0 (histórico confiável e modo equipe); 3 = 1.13.0
> (estado da execução e `retomar`).

---

## `/opencrew retomar` — retomar um run interrompido
- **O que já existe:** o estado do run vive só na memória do modelo (T-A11).
- **Alocação:** → U4 fatia 3 (1.13.0) — depende de `run-state.json`; o formato da crew já está
  escrito desde a 1.11.0.
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
- **O que já existe:** 874 linhas depois da U3a fatia 1 (eram 865 na 1.7.1, 882 depois da E1, 965 na 1.6.3 e 829 na auditoria de 2026-10-02) lidas em
  todo run; overhead fixo de 25–35k tokens contra os "~5K" anunciados no tier Express.
- **Alocação:** → U5 — núcleo de ~250 linhas + arquivos carregados sob demanda
  (Escritório, seleção de agentes, reflexão); carregar os agentes uma vez só (T-M11).
- **Custo de adiar:** cada run paga o custo; a divisão fica mais cara à medida que a
  U1–U4 acrescentam regras ao runner.
- **Aprovação:** não.

## Documento Word: o que a 1.10.0 não fez
- **O que já existe:** desde a 1.10.0, `documento.mjs` gera o `.docx` de um texto em markdown,
  com o perfil de documento oficial do projeto (logotipo PNG, três linhas de cabeçalho, rodapé com
  "Página X de Y", margens, fonte e tamanho do corpo), título e subtítulo centralizados, quebra de
  página e assinaturas; na entrega, `documentos/<nome>.docx`. Ficou fora
  (`specs/fase-u3b-documento-word.md`, §8):
  1. ler ou regravar o `.dotx` do usuário; logotipo JPEG ou SVG;
  2. imagem no corpo, hyperlink clicável, nota de rodapé, sumário automático;
  3. numeração automática de seções e de listas;
  4. tamanhos, cores e estilos por documento ou por perfil (além de margens, fonte e tamanho do
     corpo); largura e alinhamento por coluna nas tabelas; data à direita;
  5. mais de um perfil por projeto, ou perfil por crew, na entrega (`--perfil` atende o comando
     avulso);
  6. PDF direto, sem o Word;
  7. da spec de 2026-10-04: nome do arquivo pelo título e sufixo `-v2`; vários arquivos por
     chamada; `--crew` e a "conferência do texto"; modo plano (`entrega.documentos_em`) e as
     perguntas `--lembrar-documentos…`; `entrega.documentos` para `.md` sem formato; cabeçalho e
     rodapé por crew; citação, código e limpeza de HTML e de comentários; 3 níveis de recuo;
     carimbo SHA-256 da conferência;
  8. ativar por pedido em texto em conversa nova; tarefa avulsa no histórico (dar o formato
     `documento-oficial` aos passos de crews antigas saiu na 1.11.0, com `/opencrew repair`);
  9. documento em outro idioma ("Página X de Y" e avisos só em PT-BR); a linha "Não medido" do
     verificador para `documento-oficial` (o formato não tem limite a medir; hoje a linha aparece
     e não bloqueia).
- **Alocação:** itens 1 a 7 → sem fase — o perfil cobre o caso real (a ata comparada pelo dono em
  2026-10-07); cada um abre partes e relações novas no arquivo, muda o texto oficial (3) ou
  precisa de motor de renderização (6); voltam só com pedido real, e o 4 só se uma comparação
  lado a lado pedir. Item 8 → U4 fatia 2 (1.12.0) — é pedido avulso, como o modo equipe. Item 9 → U5.
- **Custo de adiar:** quem tem um modelo `.dotx` ou logotipo que não é PNG ajusta à mão (converte
  o logotipo, aplica o modelo no Word); documento em outro idioma sai com "Página X de Y" em português.
- **Aprovação:** não.

## Modo equipe: `/opencrew pedir <crew> "<tarefa>"`
- **O que já existe:** só o pipeline completo. No uso real a crew virou equipe permanente com
  tarefas avulsas fora do pipeline, uma delas fora do histórico (dor 7).
- **Alocação:** → U4 fatia 2 (1.12.0) — com `runs.md` confiável para tarefas avulsas. Inclui a entrega avulsa
  (arquivos fora de uma execução, sem `--run`): é o modo equipe que cria a tarefa fora do
  pipeline (`specs/fase-u3a2-entrega-no-projeto.md`, §8).
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
- **Alocação:** → U3a fatia 3 (sem versão; depois da U4) — é conferência de fontes, não entrega,
  e não cabia na 1.9.0 (`specs/fase-u3a2-entrega-no-projeto.md`, §8). Como aviso que não para a
  execução: não muda `FONTES:` e o `--corrigir` nunca reescreve a fonte.
- **Custo de adiar:** peças visuais sem logo, falha silenciosa.
- **Aprovação:** não.

## `.gitignore` antigo no `update`: linhas soltas do template
- **O que já existe:** a R2 (1.6.3) fez o `update` renovar o bloco do `.gitignore`; a 1.9.0
  tratou o marcador órfão e pôs o comentário no bloco. Falta transformar em bloco as 8 linhas
  soltas das versões 1.0.0 a 1.4.1, sem repetir nenhuma.
- **Alocação:** → sem fase — cosmético (linha repetida não muda o que o git ignora) e exige
  reescrever linha do usuário; quem atualizou desde a 1.6.3 já tem o bloco
  (`specs/fase-u3a2-entrega-no-projeto.md`, §8).
- **Custo de adiar:** `.gitignore` antigo fica com linhas repetidas depois do `update`; nada se perde.
- **Aprovação:** não.

## Publicador lendo a pasta da entrega; "já publicado"
- **O que já existe:** desde a 1.8.0 a entrega é montada antes do passo que publica, e o LEIA-ME
  avisa "Esta crew publica este canal sozinha". O publicador do Instagram ainda lê o arquivo do
  passo, não `entrega/instagram/`; não existe `--publicado`, `publicado.json` nem a situação "Já
  publicado"; a confirmação de publicar não repete as ressalvas; canal com `[PREENCHER]` aceito
  pode ser publicado pela crew (regras 23 a 25 e cenários U3a-08e-f2 a 08p, upg-c e upg-d da spec
  grande, `specs/fase-u3a-entrega-por-canal.md`).
- **Alocação:** → sem fase — corte do dono em 2026-10-07: nenhuma crew real publica em rede
  social sozinha; volta com pedido real (`specs/fase-u3a2-entrega-no-projeto.md`, §8).
- **Custo de adiar:** quem publica pela crew publica o texto do passo, não o da entrega, e pode
  publicar um canal entregue com ressalva sem novo aviso.
- **Aprovação:** não.

## Entrega: o que muda o que o verificador bloqueia (medir como será colado, imagens, mais de um canal)
- **O que já existe:** a entrega (1.8.0 e 1.9.0) separa por canal e copia para o projeto. Legenda,
  post e tweet são medidos sem as hashtags no fim (só o alerta da regra 34 da 1.8.0); assunto,
  prévia, WhatsApp, cada tweet de thread e as imagens saem como "não medido"; arquivo com seções
  de mais de um canal vai inteiro para um canal só; HTML editável com caminho `file://` não é
  avisado, e a skill `image-creator` manda embutir imagem por caminho absoluto (regras 5, 9, 10,
  11 e 26 da spec grande; U3a-09a a 09f, 04c a 04p, 03m a 03u, 07k a 07p).
- **Alocação:** → U3a fatia 3 (sem versão; depois da U4) — muda o que bloqueia: texto que hoje
  passa pode parar, e pede a conferência do dono em cada rede; mudar a skill pede teste de
  renderização real (`specs/fase-u3a2-entrega-no-projeto.md`, §8).
- **Custo de adiar:** texto que passa no verificador pode estourar o limite ao ser colado com as
  hashtags; imagem fora do tamanho da rede só é vista na hora de postar.
- **Aprovação:** não.

## Conserto de crews: reordenar sozinho a publicação que vem antes da revisão
- **O que já existe:** desde a 1.11.0, `/opencrew repair` aponta a crew que publica antes da revisão
  ou da aprovação final (`publica-antes`), a que não tem revisão (`sem-revisao`) e a que não tem
  aprovação final, e manda para `/opencrew edit`; não reordena nem cria passos (T-B15, H1-01).
- **Alocação:** → sem fase — nenhuma crew real está assim (as do Projeto A foram recriadas na
  1.6.0; a do B não publica), e mover passos mexe nos números que `on_reject` usa
  (`specs/fase-u4a-conserto-de-crews.md`, decisão 5). Volta com um caso real.
- **Custo de adiar:** quem tem uma crew anterior à 1.4.2 que publica reordena pela edição da crew.
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

---

> As quatro entradas abaixo vêm da execução real de 2026-10-06 (spec E1, §8, item 5): um agente fez o
> papel da IA da IDE (Codex), criou uma crew de 3 agentes e a rodou seguindo o runner ao pé da
> letra. Tudo isto já existia antes da E1. Outras duas (a entrada do passo que não achava a saída anterior; os comandos só de bash) saíram daqui para a fase de reparo R3 (1.7.1, `specs/fase-r3-runner-em-uso-real.md`).

## Agentes-base fora do formato do Build; `extends:`; nomes de campo do `design.yaml`
- **O que já existe:** a 1.11.0 escreveu o formato da crew num arquivo só
  (`_opencrew/core/formato-da-crew.md`) e acertou quem faz a junção de `extends:` (o Build). Ficou
  fora: os cinco agentes-base não têm as seções que o Gate 1 do Build exige (T-M20), então
  `extends:` não poupa trabalho (T-B8); o `design.yaml` usa `input_file`/`output_file` e o passo,
  `inputFile`/`outputFile`.
- **Alocação:** → U5 — pede reescrever os cinco agentes-base (`specs/fase-u4a-conserto-de-crews.md`,
  decisão 9); o `design.yaml` é arquivo interno da criação e não chega ao runner.
- **Custo de adiar:** o Build completa à mão o que falta no agente-base, a cada crew criada.
- **Aprovação:** não.

## Histórico: o score do `runs.md` tem duas definições
- **O que já existe:** o runner define o score como "agent outputs approved" e como
  `{approved}/{total checkpoints}`; numa crew real o score saiu como nota ("8,2"), uma terceira
  definição. Em outra, há pastas de execução sem linha no `runs.md` e linha sem pasta (leitura
  das crews reais, 2026-10-07). O histórico confiável é da U4 (T-B6, T-A11).
- **Alocação:** → U4 fatia 2 (1.12.0) — junto do histórico confiável.
- **Custo de adiar:** o mesmo número quer dizer coisas diferentes de uma execução para outra.
- **Aprovação:** não.

## Onboarding: formato do `company.md` e a marca `NOT CONFIGURED`
- **O que já existe:** o onboarding não define o formato do `company.md` nem manda tirar
  `<!-- NOT CONFIGURED -->` de `preferences.md` depois de configurar.
- **Alocação:** → U5 — polimento de prompt.
- **Custo de adiar:** perfil da empresa em formato livre; a marca pode ficar no arquivo já
  configurado.
- **Aprovação:** não.

## Trecho visível da legenda e do post: limite declarado e não medido
- **O que já existe:** `caption_visible_chars: 125` (`instagram-feed`, `instagram-reels`) e
  `post_visible_chars: 210` (`linkedin-post`) estão no frontmatter `constraints:`; na execução
  real o verificador mediu caracteres e hashtags da legenda, mas não o gancho de 125. Fere a
  regra 12 do AGENTS.md. Os outros máximos sem medição já têm destino (spec U1 §12, H2-13).
- **Alocação:** → U5 — junto do resto do H2-13.
- **Custo de adiar:** o gancho passa do corte do "ver mais" sem aviso.
- **Aprovação:** não.

---

> As duas entradas abaixo vêm da execução real de aceite da R3 (2026-10-06, spec R3 §9). A
> terceira (o relatório do laço de revisão copiado à mão) saiu na 1.9.0.

## Runner: depois de um veto, o arquivo corrigido não é conferido de novo; restos de comando
- **O que já existe:** a ordem é conferir → veto; reexecutado por veto, o passo regrava no mesmo
  caminho e o runner não manda repetir o `conferir` (spec R3, §10). O `run_id` pede "a hora
  atual" sem dizer de onde. `design.prompt.md` ainda manda `ls _opencrew/agents/`.
- **Alocação:** → U5 — polimento de prompts; nenhum dos três parou a execução.
- **Custo de adiar:** arquivo corrigido segue sem a conferência de seções; a IA improvisa um
  comando para a hora e para a listagem.
- **Aprovação:** não.

## Achados da execução real de aceite da 1.11.0 (2026-10-07) — prompts de criação e `conferir-fontes`
- **Origem:** execução real por agente, no papel da IA da IDE (Codex), num projeto novo: criação
  de uma crew de ata e conserto de uma crew antiga (`specs/fase-u4a-conserto-de-crews.md`, §10).
  O que era desta fase foi corrigido nela. Ficou, tudo anterior à 1.11.0:
  1. design: "template usado" é detectado por `tier` presente, que o discovery grava sempre; sem
     linha de papel nem de guia para redator de documento; `extends:` × "do zero"; "Task tool" e
     `ls` num prompt compartilhado; checkpoint de aprovação de conteúdo no tier Standard × "só com
     passo de renderização";
  2. build: `agent_dependencies` vem de um `inputFile` só, e o revisor lê duas saídas; a
     conferência "skills instaladas em `skills/`" reprova `web_search`, que é nativa; exemplo de
     saída com "20+" linhas num ponto e "15+" em outro; "6 tons padrão" sem definição; pesquisa
     atribuída ao discovery;
  3. discovery: "responda com um número" × "só apresente as opções"; a pergunta 1 é refeita mesmo
     quando `/opencrew create <descrição>` já trouxe o objetivo; "2 a 3 perguntas" × as 3 de
     documento mais a de fontes;
  4. ponto de entrada: "senão, mostre o menu" não abre exceção para comando com argumento (só a
     ponte da IDE diz para rotear); a saída do `init` está em inglês;
  5. `conferir-fontes.mjs`: `FONTES:OK` com alerta aberto; "1 alertas"; com `--corrigir`, o
     relatório sai duas vezes, a mensagem não diz o arquivo nem a cópia, e a cópia vira
     `.bak-<data>` quando já existe `.bak`; a contagem de fontes muda sem explicação depois da
     correção.
- **Alocação:** → U5 — polimento de prompts e de mensagens; nenhum impediu criar a crew nem
  consertar a antiga. O item "agentes-base fora do formato do Build" já tem entrada própria.
- **Custo de adiar:** a IA improvisa nesses pontos, cada uma de um jeito.
- **Aprovação:** não.

## Achados da execução real de aceite da 1.10.0 (2026-10-07)
- **Origem:** execução real por agente, no papel da IA da IDE, num projeto novo (rota
  `/opencrew documento`, nova geração, crew de ata até a entrega). Quatro ajustes entraram na
  própria 1.10.0 (a rota não exige onboarding; a entrega avisa quando o Word sai sem papel
  timbrado; "Antes de usar" no LEIA-ME de documento; o prompt da entrega trata erro de perfil).
- **Documento Word, ficou para depois:**
  1. o verificador não vê imagem, `:::` desconhecido nem assinaturas sem fim antes do revisor
     (os avisos só aparecem na entrega), e a linha "Não medido" sugere um limite que não existe;
  2. chave do perfil quase certa (`Logotipo:`, `rodapé:`, com espaço antes) é ignorada sem aviso;
     perfil criado e vazio aparece no relatório como se houvesse timbre;
  3. o prompt não tem texto fixo para a pergunta do logotipo, das três linhas e do rodapé, e é
     ambíguo para "Não encontrei {arquivo}." e "Só converto texto…" (deveria voltar à pergunta do arquivo);
  4. tabela com linha de mais células que o cabeçalho cria coluna sem aviso;
  5. "O que não foi conferido" lista imagens e redes numa entrega só de documentos.
- **Criação e execução de crew (antigos):** os itens 6 a 10 saíram na 1.11.0.
  11. `conferir-fontes.mjs`: "1 fontes" e conta como fonte um caminho citado num passo.
- **Alocação:** → U5 — itens 1 a 5 e 11 (texto e avisos). O item 1 era da U4: é aviso do
  verificador, não conserto de crew nem criação (`specs/fase-u4a-conserto-de-crews.md`, §8).
- **Aprovação:** não.
