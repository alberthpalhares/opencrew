# Pesquisa — escritórios de agentes de IA (2026-10-05)

> Pedido do dono: confirmar, olhando mais repositórios e sistemas parecidos, se o desenho da
> fase E1 (`specs/fase-e1-escritorio-ao-vivo.md`) é o melhor caminho. Este relatório traz o que
> foi encontrado e **14 sugestões de emenda à spec**. O dono aceitou as 14, com as recomendações
> da tabela, em 2026-10-05; elas foram aplicadas na spec no mesmo dia.

## 1. Como foi feita
- **Descoberta:** 6 buscas por ângulos diferentes (GitHub, agentes de código, frameworks
  multiagente, comunidade, outros idiomas, arquiteturas) e 1 rodada só de lacunas: 78 projetos.
- **Leitura a fundo** (código e issues, não só README): 18 projetos.
- **Confronto com a spec:** 4 lentes (estado, pixel-art, experiência, robustez e escopo).
- **Verificação:** cada sugestão passou por 2 céticos, um conferindo a evidência na fonte e outro
  o encaixe nas regras do projeto. As 14 saíram **reduzidas**: nenhuma foi aceita inteira.

**Limites:** cerca de 60 projetos ficaram só no nível de descoberta. Parte das issues foi lida pela página
do GitHub (a API recusou alguns pedidos). O Reddit foi lido por arquivos de terceiros, com
placares possivelmente defasados. X e YouTube não foram abertos. Estrelas são as de 2026-10-05.

## 2. O que existe
Há mais de 300 repositórios do tema só em 2026. Os mais usados:

| Projeto | Estrelas | Como sabe o que o agente faz | Desenho |
|---|---|---|---|
| [Paperclip](https://github.com/paperclipai/paperclip) | 97 mil | heartbeat em banco | sem escritório próprio; vem de plugins da comunidade |
| [edict](https://github.com/cft0808/edict) | 17 mil | o agente roda um script (`kanban_update.py`) | painel HTML, sem pixel-art |
| [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) | 9,5 mil | hooks e transcrições do Claude Code | canvas 2D, PNG de terceiros |
| [munder-difflin](https://github.com/HarnessMD/munder-difflin) | 8,5 mil | arquivos num git local | Pixi.js, tileset com licença própria |
| [Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI) | 7,5 mil | o agente roda um script (`set_state.py`) | Phaser, arte de uso não comercial |
| [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) | 6,4 mil | hooks de ~27 agentes | mascote de desktop (Electron) |
| [OpenSquad](https://github.com/renatoasse/opensquad) | 2,1 mil | a IA reescreve o `state.json` inteiro | Phaser, PNG sem origem documentada |

Os que seguem o mesmo desenho da nossa spec (sem dependência, servidor local só de leitura,
consulta periódica, desenho em código, sem PNG) são pequenos e recentes:
[cubicle](https://github.com/caglarutkuguler/cubicle),
[hermes-pixel-office](https://github.com/teknium1/hermes-pixel-office),
[escritorio-de-pixels](https://github.com/simiao-cavalcante/escritorio-de-pixels),
[ai_crew](https://github.com/heekeunlee/ai_crew) e
[escritorio-agentes](https://github.com/manualdotrafego/escritorio-agentes).

**Frameworks:** não foi achado escritório embutido nem complemento relevante em CrewAI, AutoGen,
LangGraph, MetaGPT, n8n, Dify e Flowise (buscados, não abertos um a um). O ChatDev 2.0 trocou o
dele por um canvas de fluxo. O escritório vive em torno das ferramentas de linha de comando.

## 3. O que os usuários dizem
- **Queixa nº 1: a tela mente.** Boneco se mexendo com o agente parado, ou parado com o agente
  trabalhando (OpenSquad #33, Star-Office-UI #72, #87 e #102, Pixel Agents #413).
- **Dúvida nº 1: gasta tokens?** É o comentário mais votado nos posts do tema.
- **Onde desistem:** instalação e conexão (openclaw-office #24: "instalei várias vezes, sempre
  reconectando, desisti"; Star-Office-UI #46: abriu o arquivo direto e ficou em "loading").
- **Pedido nº 1:** funcionar fora do VS Code e do Claude Code.
- **Risco que se repete:** arte de terceiros com licença restrita.

## 4. O que a pesquisa confirma na spec
- **A IA avisa por script (decisão 2).** É a única fonte que conhece o passo e o agente e vale
  nas 9 IDEs. Hooks só enxergam ferramenta e sessão. Star-Office-UI e edict usam o mesmo padrão.
- **Desligado por padrão (decisão 3).** Responde à dúvida do gasto de tokens.
- **Consulta de 1 s, sem WebSocket (decisão 5).** hermes-pixel-office e cubicle vivem só disso.
- **Desenho em código, sem PNG (decisão 6).** É o que todo projeto sem dependência faz, e evita
  o problema de licença que os grandes têm.
- **Servidor só local, só leitura, com conferência de `Host`.** Um projeto parecido teve aviso
  de segurança por escutar em todas as interfaces com CORS aberto.
- **Gravação por arquivo temporário e troca de nome.** cubicle e OpenSpec adotaram o mesmo
  depois de o leitor pegar arquivo pela metade.
- **O escritório nunca para a execução.** Num projeto, um hook travou a sessão do agente.
- **Ocioso fica parado; demonstração com etiqueta.** É exatamente o que a issue #33 do OpenSquad
  reclama que falta.
- **320×180 com base de 16 px.** Mesma faixa do Pixel Agents (grade de 320×176).
- **Som, editor de sala, mascotes e medição fora da fase.** Quem fez pagou em defeitos.

**Ponto de atenção:** 12 mesas em 320×180 é apertado. Conferir no primeiro protótipo visual.

## 5. Sugestões de emenda (aceitas em 2026-10-05)
A coluna "Recomendação" já é a versão reduzida pelos céticos, e foi a que entrou na spec. Os
números de regra citados são os da spec de antes da emenda.

| # | O que muda | Evidência principal | Recomendação |
|---|---|---|---|
| S1 | **Um comando por passo.** O `passo` grava a passagem de bastão; saem o evento `handoff` e o status `delivering`. A página anima a caminhada quando a passagem muda, por 2 s. | No runner, entrega e passo seguinte são chamadas coladas: a caminhada quase nunca apareceria. O cubicle deduz a entrega na página. | Adotar. Corta cerca de 4 de 13 comandos numa crew de 5 agentes. |
| S2 | **"Sem sinal".** Execução em andamento sem atualização há muito tempo: o boneco para de digitar e ganha "?", e a lista diz "Sem sinal há N min". Calculado na leitura; nada é regravado; checkpoint nunca expira. | hermes, pixtuoid, edict e miniverse fazem (de 5 a 20 min). O clawd-on-desk subiu para 20 min por causa de passo longo. | Adotar com 20 min. |
| S3 | **Não subir dois servidores.** Se já há um escritório deste projeto na faixa de portas, o comando mostra o endereço e sai. | hermes sonda a porta; Star-Office-UI #31: porta em conflito gerou "sempre idle". | Adotar só isto. Processo destacado e fechamento por inatividade: não (sem evidência; escondem erro). |
| S4 | **Texto seguro no terminal.** Rótulo, mensagem e motivo só com letras, números, espaço e pontuação simples, começando por letra ou número. Rótulo vira opcional ("Passo K de N"). | Reproduzido aqui: em bash e PowerShell "R$50" chega cortado e `$(...)` executa; o cmd expande `%NOME%`. | Adotar. |
| S5 | **Nenhum texto dentro do canvas.** Nomes e balões são elementos da página sobre o desenho. | Texto num canvas de 320 px ampliado vira borrão. cubicle e Pixel Agents fazem assim; munder-difflin #340. | Adotar. Corrige uma contradição da regra 19. |
| S6 | **Cada tela diz o próximo passo.** Aviso para quem abre o arquivo direto; "Sem conexão… Para reabrir: /opencrew dashboard"; na demonstração, "Nenhuma execução ainda. Rode uma crew e ela aparece aqui."; `?demo` força a demonstração. | Star-Office-UI #46 e openclaw-office #24. hermes tem três telas, cada uma com instrução. | Adotar. `?demo`: os céticos divergiram; recomendo incluir (serve à conferência à mão). |
| S7 | **`estado.mjs` que se conserta.** `passo` sem estado recria o estado; o script confere ele mesmo se o escritório está ligado; repete a troca de nome se o Windows recusar; a página segura o último estado bom por 3 consultas. | hermes cria o agente em qualquer evento. Hoje um `iniciar` perdido deixaria a execução inteira invisível. | Adotar. A repetição no Windows: os céticos divergiram; recomendo incluir, porque a página lê o arquivo a cada segundo. |
| S8 | **Status legível de relance.** Monitor aceso ao trabalhar, âmbar piscando no checkpoint, vermelho na falha. O título da aba acompanha ("(!) Aguardando você — crew"). | cubicle e hermes usam o monitor. Pixel Agents #286: só o balão passa despercebido. | Adotar. Sem piscar de olhos no ocioso. |
| S9 | **Sai a cópia do estado em `output/<run>/`.** Nada a lê. | Busca no repositório: nenhum leitor. | Adotar o corte. Sinal de reserva vindo do disco: adiar para a U4. |
| S10 | **Animação pelo relógio e escala em pixels do dispositivo.** | Constantes do Pixel Agents (digitar 0,3 s, andar 0,15 s, zoom inteiro em pixels do dispositivo). | Adotar. Faz os pixels ficarem quadrados no Windows a 125% e 150%. |
| S11 | **Boneco por faixas trocáveis** (pernas, braços), caminhada em linha reta com duração fixa, e a página pode ter mais de quatro arquivos. | ai_crew troca linhas do sprite; claw-empire anda em linha reta; busca de caminho deu defeito em dois projetos. | Adotar. Protege o alvo de 200 linhas. |
| S12 | **Cabeçalhos do servidor.** Sem cache, sem CORS; `Host` recusado responde 421 com a instrução. | cubicle, escritorio-de-pixels; agentsview #78: recusa muda confundiu o usuário. | Adotar. Política de segurança de conteúdo: os céticos divergiram; recomendo incluir (uma linha). |
| S13 | **A lista mostra o que cada agente fez** (o último rótulo dele). | Comentário mais votado do tema: "o que eles entregam, além de parecer ocupados?". | Adotar só o rótulo. Caminho do arquivo entregue: não (o comando roda antes de o arquivo existir). |
| S14 | **Agente desconhecido lista os ids válidos**; ao iniciar com o escritório ligado, o runner diz uma vez como abri-lo; o README diz "só neste computador, sem internet, sem medição". | `set_state.py` do Star-Office-UI; spec-workflow-mcp #36: usuário esquece o comando. | Adotar. |

**Correção de fato na spec (erro meu):** a §10 diz que ler hooks "só serviria a 1 das 9 IDEs".
Hooks existem em 8 das 9, mas com 8 formatos diferentes e gravando na configuração do usuário.
A conclusão não muda (fica fora da fase), o motivo sim.

**Efeito no tamanho:** S1 e S9 encolhem o contrato (um evento, um status e uma opção a menos).
As demais acrescentam regras e cenários; a spec cresce.

## 6. O que não foi adotado e por quê
- Processo do servidor destacado e fechamento automático: nenhum projeto lido faz isso em Node;
  esconde erros e pode não subir em ambiente isolado.
- Sinal de vida pela data dos arquivos de saída: nenhum projeto mostra que funciona → U4.
- Caminho do arquivo entregue com botão "copiar": o comando roda antes de o arquivo existir.
- Eco de progresso em todo evento: só gasta tokens.
- Piscar de olhos no ocioso: contraria a queixa da issue #33 do OpenSquad.
- Limite de 50 crews e de 256 KB na leitura: sem evidência; poderia esconder a crew ativa.
