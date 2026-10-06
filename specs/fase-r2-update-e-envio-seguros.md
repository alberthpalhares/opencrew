# Spec — Fase R2: update e envio seguros (1.6.3)

- **Fase:** R2 · **Módulos:** CLI (`src/commands/`, `src/lib/`) + Payload (skills de envio, `runner.pipeline.md`, `skills.engine.md`, `core/scripts/`) + CI (`.github/workflows/`) + testes · **Status:** aprovada pelo dono (2026-10-05); implementada (2026-10-06); release 1.6.3 aguardando a confirmação do dono
- **Termos novos no GLOSSARIO.md:** sim — Skill de envio, Nome seguro, Não conferido, Texto legado; "Cópia de segurança" e "Manifesto" passam a citar bloco marcado e `.mcp.json`
- **Modelo sugerido:** execução Sonnet 5.5 · médio (componentes A e B, que mexem em arquivo do usuário: alto)
- **Origem:** itens "→ R2" da spec R1 (§11 e §12), com os mesmos IDs: H e L vêm de `docs/auditoria/2026-10-04-revisao-specs.md` e da revisão do código da R1; C, da auditoria de 2026-10-02. Comportamento de hoje conferido no código da 1.6.2
- **Já decidido pelo dono (2026-10-05):** a R2 é a 1.6.3 · o Node mínimo declarado sobe (a dependência não volta para a linha anterior) · a publicação exige a porta também no Node 20

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **IDE instalada se prova pelo arquivo, não pela palavra "opencrew"** (regras 1 e 2). Codex junto
   de Gemini CLI, Qwen ou Antigravity: o resumo não o cita. Não adotado: lista de IDEs no manifesto.
2. **Texto antigo das pontes (até a 1.2.2) sai, com cópia, só quando está idêntico ao gerado**
   (regra 3). Editado por você: só aviso. Não adotado: remover o editado; nunca remover.
3. **Bloco do OpenCrew editado por dentro ganha cópia antes de ser regravado** (regras 4 e 7), fora
   do git. No 1º `update` há cópia mesmo sem edição (§12). Não adotado: comparar com textos antigos.
4. **O reparo de pontes só roda com o pacote na mesma versão do projeto** (regra 6). Versão
   diferente: para e manda rodar o `update`. Não adotado: avisar e pedir confirmação.
5. **`.mcp.json`: o servidor Playwright é entregue uma vez e não volta se você o remover** (regras 8
   a 11). A versão fixada não é trocada. Não adotado: nunca criar nem repor.
6. **Modelo de crew e skill do catálogo apagados continuam voltando no `update`** (regra 14); a R2
   só corrige as frases. Não adotado nesta fase: "apagado por você não volta" (→ U5).
7. **As frases reescritas do `update` saem em PT-BR e só afirmam o que foi feito** (regra 13; lista
   fechada). O resto do CLI continua em inglês (→ U5).
8. **Restos do OpenSquad: só aviso, nunca apaga** (regra 16). O aviso volta a cada `update` e passa
   a cobrir mais sete caminhos. Não adotado: remover com cópia (→ U5).
9. **`blotato` e `resend` mostram a prévia e pedem a palavra (`publicar`, `enviar`, `apagar`) antes
   de agir** (regra 18). Crew que hoje envia sem perguntar vai parar. Não adotado: uma palavra só.
10. **A marca "irreversível" fica só nas skills que publicam ou enviam** (regras 17 e 19). Skill que
    só gasta dinheiro não leva. Não adotado: o runner tratar o passo pela marca da skill (→ U4).
11. **Nome com caractere inseguro não entra em comando** (regra 21). Pasta da crew: o runner para.
    Arquivo de saída: oferece seguir sem conferir. Não adotado: mudar o script por causa da vírgula.
12. **O prompt de imagem vai por arquivo** (regra 22); `--prompt` segue aceito. Nenhum teste roda
    Python: contrato de texto e conferência manual (§9). Não adotado: recusar `--prompt`.
13. **Link criado por você dentro do projeto continua sendo lido; o `--corrigir` não grava fora da
    crew** (regras 23 e 24). Não adotado: recusar todo link que aponta para fora.
14. **Caminho de rede e endereço de site citados pela crew viram alerta "não conferido"** (regra
    25); o run não para. Não adotado: perguntar a cada run; deixar de listar a citação.
15. **Abaixo do Node 20.17.0 todo comando para**, inclusive `update` e `help` (regra 27). A promessa
    é "20.17 ou mais novo". Não adotado: só avisar; copiar a faixa exata das dependências.
16. **A publicação só sai com o CI verde (Ubuntu e Windows, Node 20.17.0 e 22) e a auditoria de
    segurança** (regras 29 e 30); disparo manual vira ensaio por padrão. Não adotado: sem auditoria.

## 1. Objetivo
O `update` e o `init --repair-bridges` ainda mexem em arquivo do usuário sem cópia, criam ponte de
IDE que não está instalada e dizem frases que não são verdade. Duas skills publicam e enviam sem
perguntar. Nome de arquivo e texto de prompt entram em comando sem proteção. O pacote promete um
Node em que o `init` não abre, e a publicação não espera o CI. Esta fase fecha esses defeitos, todos
já achados em revisão; nenhuma funcionalidade nova. Quem já usa recebe tudo com um `update`.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| H1-06, H3-10 | IDE detectada pela palavra "opencrew"; o resumo cita o Codex sem ele estar instalado | R2-01a a R2-01d |
| H3-06 | Ponte até a 1.2.2, sem marcador, continua mandando adotar o papel sempre | R2-01e a R2-01g |
| R1 §14 (ponte de bloco) | Bloco marcado editado por dentro é regravado sem cópia; seção de STATUS.md; cópias vão para o git do usuário | R2-01h a R2-01k |
| L6-06 | Reparo de pontes sem a guarda de versão | R2-01l |
| H3-09 | `.mcp.json` recriado, reposto e reformatado sem cópia | R2-02a a R2-02f |
| H3-14 | Manifesto ilegível é tratado como ausente ou derruba o comando | R2-02g, R2-02h |
| H3-11 (parte 1) | O resumo do `update` afirma o que não fez; a dica do `init` manda apagar `_opencrew/` | R2-03a a R2-03e |
| H3-19 | O aviso de restos promete "com segurança" e não vê as outras pastas | R2-03f a R2-03h |
| H1-04 | `blotato` e `resend` enviam sem prévia nem confirmação; a marca da skill não tem leitor | R2-04a a R2-04c |
| L7-14 | Caminho e texto com caractere de shell entram em comando | R2-04d a R2-04f |
| L7-10 | "Dentro do projeto" não resolve link; o `--corrigir` grava fora da crew | R2-05a a R2-05d |
| L7-11 | A conferência testa caminho de rede e endereço de site; erro de leitura sai sem mensagem | R2-05e a R2-05g |
| R1 §11 (Node), C-18 | O Node prometido é mais baixo que o real; o CI não testa o piso | R2-06a a R2-06d |
| Histórico das publicações | Três das cinco últimas versões saíram com o CI vermelho | R2-06e |
| Regra 14 do AGENTS.md | Tudo chega a quem já usa com um `update` | R2-upg |

## 3. Entradas
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| versão do Node da máquina | número | sim | igual ou acima do piso do `engines.node` (regra 27) |
| `init --repair-bridges` (com `--ide`, `--all` ou `--yes`) | comando do CLI | — | versão do pacote igual à do carimbo do workspace; sem carimbo, roda (regra 6) |
| `_opencrew/manifest.json` | registro caminho → hash | não | ausente, ilegível ou válido (regra 12); ganha um registro por bloco marcado e o do `.mcp.json` |
| `.mcp.json` | JSON do usuário | não | objeto com `mcpServers` objeto; senão, tratado como inválido (regra 11) |
| resposta do usuário à prévia de `blotato` e `resend` | palavra | sim | `publicar`, `enviar` ou `apagar`, conforme a ação; qualquer outra cancela (regra 18) |
| caminho que o runner põe num comando | texto | — | só os caracteres da regra 21 |
| `generate.py --prompt-file` | arquivo de texto | um entre `--prompt-file` e `--batch` (`--prompt`: legado) | existe, não está vazio, UTF-8 com ou sem BOM |
| `verificar.mjs --crew` e `--arquivo`; `conferir-fontes.mjs --crew` | caminho | sim | dentro do projeto pelo texto ou pelo lugar real (regra 23) |
| `dry_run` no disparo manual do `publish.yml` | ligado ou desligado | não | padrão: ligado |

## 4. Saídas
- **Resumo do `update`:** as linhas da §6; código 0 mesmo com `.mcp.json` ou manifesto inválido.
- **Cópia de segurança** (`.opencrew-backup/<data>/<caminho>`): guarda também o arquivo com bloco
  editado, o arquivo com texto legado removido e o `.mcp.json` regravado.
- **Manifesto:** um registro por bloco marcado e o de que o `.mcp.json` foi entregue.
- **Código 1, nada escrito:** Node abaixo do piso; lista de IDEs não abre; reparo em outra versão.
- **Skills de envio e runner:** prévia e pedido da palavra; pergunta de nome inseguro; linha "não
  verificado" na aprovação final.
- **Conferência de fontes:** alerta "não conferido" (conta em alertas; `FONTES:OK`); uma linha por
  arquivo que o `--corrigir` pulou; "Não consegui conferir", código 1, sem `FONTES:`.
- **Publicação:** só depois da matriz verde; no disparo manual, ensaio sem publicar.

## 5. Regras de negócio
**A — Detecção de IDE e pontes (CLI)**
1. **IDE instalada** é a que tem: (a) um arquivo de ponte só dela com "opencrew" no caminho; ou (b)
   um arquivo de instruções dividido com o usuário (`CLAUDE.md`, `GEMINI.md`, `QWEN.md`,
   `.github/copilot-instructions.md`) com o marcador `<!-- opencrew:start -->` ou a linha do título
   gerado (`# opencrew — …`), em qualquer linha, sem contar BOM e CRLF. Os quatro títulos ficam
   fixos no código. Arquivo que só cita a palavra fica intacto e não cria ponte.
2. **IDE sem arquivo só dela** (hoje, o Codex) só conta quando o arquivo existe e nenhuma outra IDE
   que grava o mesmo caminho foi detectada. Regra geral, sem nome de IDE no código.
3. **Texto legado:** o que as versões até a 1.2.2 gravavam como arquivo inteiro nas cinco pontes sem
   frontmatter (as quatro da regra 1 e `.trae/rules/opencrew.md`), um texto fixo por arquivo. O
   `update` e o reparo o procuram **fora do bloco**, tolerando CRLF. Idêntico: copiam o arquivo
   inteiro e tiram só esse trecho. Só o título ou a frase com "adopt" (texto editado): não mexem e
   avisam (§6). Vale para quem já está em "bloco + texto legado".
4. **Bloco marcado com cópia.** Uma função só grava todo bloco marcado (pontes, `AGENTS.md`,
   `.gitignore`, `.env.example`) no `init`, no `update` e no reparo, e o registra no manifesto.
   Igual ao novo (sem contar CRLF/LF): não grava. Igual ao registro: regrava sem cópia. Outro caso,
   ou sem registro: copia o arquivo inteiro antes. Arquivo sem bloco: o bloco entra no topo (no fim,
   em `.gitignore` e `.env.example`), sem cópia. O fim de linha do arquivo é mantido.
5. **Seção de STATUS.md** (1.4.0/1.4.1): removida só dentro do bloco; a frase só sai se algo mudou.
6. **Reparo e versão.** `init --repair-bridges` só regrava com o pacote na versão do carimbo do
   workspace. Outra versão: para antes de qualquer escrita, com qualquer opção, código 1, e manda
   rodar o `update` (§6), sem a linha de ajuda em inglês. Sem carimbo, o reparo roda (R1).
7. **Cópias fora do git.** O bloco do `.gitignore` ganha `.opencrew-backup/`, e o `update` passa a
   entregar esse bloco pela regra 4, como o `init`. O do `.env.example` segue só no `init`.

**B — `.mcp.json` e manifesto (CLI)**
8. **Entrega uma vez.** O manifesto registra que o `.mcp.json` foi entregue: no `init`, quando ele
   cria o arquivo (não quando mantém o do usuário). No `update`, sem registro: cria o arquivo ou
   acrescenta o servidor `playwright`, o que faltar, e registra. Com registro: não cria nem repõe, e
   avisa em uma linha. O registro passa de um `update` para o outro.
9. **Regravar com cópia.** Toda regravação do `.mcp.json` copia o arquivo antes, diz isso na própria
   linha e mantém a indentação e o fim de linha.
10. **Versão e pasta de saída.** O `update` não troca a versão do Playwright. `--output-dir` só
    entra na entrada do OpenCrew (a que usa `_opencrew/config/playwright.config.json`) que ainda não
    tem `--output-dir` nem `--output-dir=…`. O `_comment` do template deixa de prometer a troca.
11. **Fora do formato.** JSON válido que não é objeto, ou com `mcpServers` que não é objeto: aviso,
    arquivo intacto, e o `update` segue até o fim (resumo e carimbo).
12. **Manifesto ilegível** (existe, mas não é JSON, ou `files` não é um objeto com ao menos uma
    entrada): o `update` avisa, copia tudo o que difere, como num projeto sem registro, refaz o
    registro e troca a frase do resumo (§6). O reparo copia o que difere, não refaz o registro e
    aponta para o `update`. Manifesto ausente: nada muda. Nunca sai erro técnico em inglês.

**C — O que o `update` diz e os restos antigos (CLI)**
13. **Só afirma o que fez.** Cada passo do `update` devolve o que criou, regravou ou manteve, e o
    resumo imprime isso. Lista fechada (textos na §6): frase final, pontes, seção de STATUS.md,
    `.mcp.json`, cópias com manifesto, `AGENTS.md` e `.gitignore`. "Primeira atualização com
    proteção" não muda: passa a ser verdade com as regras 4 e 9. Essas frases saem em PT-BR; o resto
    do CLI, não.
14. **O apagado ainda volta.** Modelo de crew e skill do catálogo apagados seguem sendo recriados. A
    saída lista o que foi recriado em `crews/`; o README deixa de dizer que `crews/` nunca é tocado.
15. **Reinstalar.** A dica do `init` em workspace já instalado deixa de mandar apagar `_opencrew/`:
    aponta para o `update` e diz o que a pasta guarda.
16. **Restos do OpenSquad: só aviso.** Sem `_opensquad` na raiz, o `update` segue avisando os `.md`
    que citam `_opensquad/` nas cinco pastas de hoje e passa a avisar sete caminhos exatos:
    `.cursor/rules/opensquad.mdc`, `.cursor/commands/opensquad.md`,
    `.opencode/commands/opensquad.md`, `.qwen/skills/opensquad/SKILL.md`,
    `.trae/rules/opensquad.md`, `.github/prompts/opensquad.prompt.md` e
    `.agents/skills/opensquad/SKILL.md`. Pasta `opensquad/` ou arquivo `opensquad.*` é "ponte do
    OpenSquad"; o que só cita `_opensquad/` recebe o texto cauteloso. O `playwright` do `.mcp.json`
    que aponta para um arquivo de `_opensquad/` que não existe ganha uma linha. Nada é apagado nem
    alterado; o aviso volta a cada `update` e não sai no `update --check`.

**D — Skills de envio e texto em comando (payload)**
17. **Marca na skill.** Toda skill do catálogo que publica ou envia declara
    `side_effects: irreversible`: `instagram-publisher`, `blotato`, `resend`. O campo entra em
    `skill-format.md` e `skills.engine.md`. Skill que só gasta dinheiro não leva.
18. **Bloco de confirmação** em `blotato` e `resend`, escrito pela ação. Antes de qualquer chamada
    que publica, agenda, envia ou apaga: prévia (§6); palavra (`publicar` no `blotato`, `enviar` no
    `resend`, `apagar` quando apaga), e outra resposta cancela; uma chamada só; em falha ou sem
    resposta, não repete e avisa que pode já ter saído. A confirmação vale para um envio: passo que
    roda de novo mostra a prévia outra vez e avisa da tentativa anterior. No `blotato`, o upload de
    mídia vem depois da palavra; `best-practices/social-networks-publishing.md` deixa de mandar
    ensaiar e subir mídia no Blotato antes dela (o ensaio fica só para o `instagram-publisher`). No
    `resend`, a prévia traz remetente, destinatários e quantidade.
19. **A marca tem leitor.** O índice de skills (skills engine e runner) lê `side_effects`: a linha
    da skill avisa "irreversível", e as instruções dela são carregadas antes do primeiro uso.
20. **Aspas.** Caminho da crew em comando vai entre aspas duplas: os quatro moldes do runner que não
    têm, o de `export.prompt.md` e a URL nos comandos de `sherlock-shared.md`.
21. **Nome seguro.** Seção do runner, antes do primeiro comando: só entra em comando o caminho feito
    de letras (com acento), dígitos, espaço e `. _ - / \ : ( )`. Com outro caractere, não monta o
    comando. Pasta da crew: para e pede para renomear. Arquivo de saída: oferece parar ou seguir sem
    conferir (aparece como não verificado na aprovação final). `instagram-publisher` e
    `image-ai-generator` citam a regra. Os scripts não mudam: vírgula se resolve renomeando.
22. **Prompt de imagem por arquivo.** `image-ai-generator` ganha `--prompt-file`; o SKILL.md manda
    gravar o prompt num arquivo e proíbe pôr o texto no comando. `--prompt` segue aceito (legado).
    Prompt e lote são lidos em `utf-8-sig`; erro de leitura sai em PT-BR.

**E — Scripts do runtime (payload)**
23. **Dentro do projeto, por qualquer nome.** O caminho é aceito quando o texto ou o lugar real
    fica dentro do projeto; recusado só quando os dois dizem "fora". Raiz e caminho são resolvidos
    do mesmo jeito; o lugar real só é consultado quando o texto diz "fora", e nunca para caminho de
    rede. O relatório e a sugestão usam o lugar real. O que é alcançado por link criado dentro do
    projeto continua lido, mesmo apontando para fora.
24. **`--corrigir` não escreve fora da crew.** Só regrava o arquivo cujo lugar real fica dentro da
    pasta real da crew, e só se ela fica dentro do projeto. O resto ganha uma linha (§6).
    "Corrigidos" conta só o que foi gravado.
25. **Rede e site: não conferido.** Citação que começa por `\\` ou `//`, ou que é endereço de site
    (tem `://`, menos `http(s)://`, que segue fora da coleta e sem alerta, como hoje; começa por
    `mailto:` ou `www.`; ou o primeiro segmento tem ponto e termina em 2 a 24 letras, como
    `exemplo.com/…`, sem pasta com esse nome no projeto), vira alerta "não conferido": conta em
    "alertas", não muda o status,
    e o `--corrigir` não a toca. O script nunca acessa a rede, e citação de duas barras não chega ao
    disco, em nenhum sistema. O runner cita o alerta e não para.
26. **Erro ao ler arquivo da crew:** a conferência responde "Não consegui conferir: {motivo}",
    código 1, sem rastro de erro e sem linha `FONTES:`.

**F — Node e publicação**
27. **Piso do Node.** `engines.node` vira `>=20.17.0` (pelo npm, não à mão). Abaixo dele, todo
    comando para antes de qualquer escrita, código 1. A leitura do piso mora num módulo próprio.
    Vale para o CLI; os scripts do payload seguem só com APIs do Node 20.0.
28. **Lista de IDEs que não abre.** Falha ao carregar a lista do `init`: mensagem com a saída
    `--ide=…` ou `--all`, código 1, nada escrito. Ctrl+C continua saindo com 130.
29. **CI e publicação.** A matriz do `ci.yml` testa `20.17.0` e `22`, em Ubuntu e Windows. O
    `ci.yml` vira reutilizável (`workflow_call`); o `publish.yml` o chama, e o job `publish` só roda
    depois (`needs`). A auditoria (`npm audit --audit-level=high`) vem junto e barra a publicação.
30. **Ensaio.** No disparo manual, `dry_run` (padrão: ligado) troca o último passo por
    `npm publish --dry-run`.

## 6. Erros e casos-limite
| Situação | Comportamento | Mensagem |
|---|---|---|
| Node abaixo do piso | código 1, nada escrito, em qualquer comando | "O OpenCrew precisa do Node.js 20.17.0 ou mais novo. Esta máquina está com o v{versão}." e "Instale a versão LTS em https://nodejs.org/ e rode o comando de novo. Nada foi alterado nesta pasta." |
| A lista de IDEs do `init` não abre | código 1, nada escrito | "Não consegui abrir a lista de IDEs neste Node (v{versão})." e "Atualize o Node em https://nodejs.org/ ou escolha as IDEs no próprio comando: npx @aksp/opencrew init --ide=claude-code (ou --all para todas). Nada foi alterado nesta pasta." |
| Reparo com pacote de outra versão | código 1, nada escrito | Mais antigo: "Você tem a v{instalada} instalada e este pacote é a v{pacote} (mais antigo). Nada foi alterado. Rode `npx @aksp/opencrew@latest update`: ele já atualiza as pontes. Para a ponte de uma IDE nova, repita este comando depois." · Mais novo: "Este projeto está na v{instalada} e este pacote é a v{pacote} (mais novo). O reparo não atualiza o projeto. Nada foi alterado. Rode `npx @aksp/opencrew@latest update`: ele já atualiza as pontes. Para a ponte de uma IDE nova, repita este comando depois." |
| `init` num workspace já instalado | não escreve; a dica muda | "Para atualizar, rode `npx @aksp/opencrew@latest update`. Não apague `_opencrew/` para reinstalar: a pasta guarda a sua memória (`_opencrew/_memory/`) e as suas best-practices (`_opencrew/best-practices.local/`)." |
| Pontes no `update` | uma linha por caso que aconteceu; sem ponte detectada: código 0, nada criado | "Pontes atualizadas: {IDEs}." · "Pontes criadas: {arquivos}." · "Pontes das IDEs já estavam em dia." · "Nenhuma ponte de IDE encontrada: nada a atualizar. Para criar a ponte de uma IDE: `npx @aksp/opencrew@latest init --repair-bridges --ide=<id>`." |
| Texto legado idêntico, fora do bloco | copia o arquivo e tira o trecho | "{arquivo}: removi o texto antigo do OpenCrew (instalações até a 1.2.2), que mandava adotar o papel do OpenCrew sempre. O bloco novo ficou no lugar e o resto do arquivo não mudou. Cópia em .opencrew-backup/{data}/{arquivo}." |
| Texto legado editado | não mexe | "{arquivo} ainda tem um texto antigo do OpenCrew, alterado depois da instalação, que manda adotar o papel do OpenCrew sempre. Não mexi nele. Para o OpenCrew só agir quando chamado, apague à mão o trecho que começa em `# opencrew — …` fora do bloco `opencrew:start` / `opencrew:end`." |
| Bloco regravado com cópia (regra 4) | copia o arquivo inteiro antes; linha na lista de cópias | "{arquivo} (só o bloco do OpenCrew foi regravado; o resto do arquivo não mudou)" |
| Cópias feitas, com manifesto | cabeçalho da lista | "{N} arquivo(s) foram copiados para {pasta}/ antes de serem substituídos (editados por você, ou sem registro de entrega):" |
| Seção de STATUS.md dentro do bloco | remove; fora do bloco, nada e nenhuma linha | "CLAUDE.md: removi a seção de STATUS.md que as versões 1.4.0 e 1.4.1 gravaram por engano." |
| `AGENTS.md` e `.gitignore` no `update` | sem mudança, nenhuma linha | "AGENTS.md: bloco do OpenCrew acrescentado no topo; o seu texto foi mantido." · "AGENTS.md: bloco do OpenCrew atualizado." · "`.gitignore` criado com o bloco do OpenCrew." · "`.gitignore`: bloco do OpenCrew acrescentado no fim; as suas linhas foram mantidas." · "`.gitignore`: bloco do OpenCrew atualizado." |
| Modelo de crew que faltava | recriado e listado | "{N} arquivo(s) que faltava(m) em `crews/` foram entregues de novo: {lista}." |
| Fim do `update` | frase final | "Não foram alterados: as crews que você criou, `_opencrew/_memory/`, `_opencrew/best-practices.local/` e `.env`." |
| `.mcp.json` sem registro de entrega | cria o arquivo, ou acrescenta o servidor com cópia; uma vez | "`.mcp.json` criado com o servidor Playwright do OpenCrew (as skills image-creator e image-fetcher precisam dele). Se você apagou esse arquivo de propósito, pode apagar de novo: o `update` não recria mais." · "Servidor Playwright acrescentado ao `.mcp.json` (cópia do arquivo anterior em `.opencrew-backup/<data>/.mcp.json`). Se você o removeu de propósito, pode remover de novo: o `update` não repõe mais." |
| `.mcp.json` com registro de entrega | não cria nem repõe | "O `.mcp.json` não existe e não foi recriado. Sem o servidor Playwright, as skills image-creator e image-fetcher não funcionam." · "O `.mcp.json` está sem o servidor Playwright do OpenCrew e ficou como está. Sem ele, as skills image-creator e image-fetcher não funcionam." |
| Entrada do OpenCrew sem `--output-dir` | acrescenta, com cópia | "`.mcp.json`: a saída do Playwright agora vai para `_opencrew/logs/playwright/` (cópia do arquivo anterior em `.opencrew-backup/<data>/.mcp.json`)." |
| `.mcp.json` fora do formato | não altera; o `update` segue | "O `.mcp.json` não tem o formato esperado (um objeto com `mcpServers`) e não foi alterado. Confira o arquivo." |
| `playwright` aponta para arquivo de `_opensquad/` que não existe | não altera | "O servidor `playwright` do `.mcp.json` aponta para `{caminho}`, que não existe neste projeto (resto do OpenSquad). Não alterei o arquivo." |
| `_comment` do `templates/.mcp.json` | texto novo no arquivo entregue | "Versão do Playwright MCP fixada por estabilidade. Para trocar, edite a versão abaixo e reinicie a IDE. O `update` do OpenCrew não altera a versão que está neste arquivo." |
| Manifesto ilegível, no `update` | aviso antes de regravar; frase no resumo, no lugar de "Primeira atualização…" | "O registro de arquivos (`_opencrew/manifest.json`) está ilegível. Vou tratar esta atualização como a de um projeto sem registro: todo arquivo diferente do pacote novo é copiado para `.opencrew-backup/` antes de ser substituído. O registro é refeito no fim." · "O registro estava ilegível: guardamos tudo o que diferia do pacote novo. Daqui em diante, só o que você editar." |
| Manifesto ilegível, no reparo | copia o que difere; não refaz | "O registro de arquivos (`_opencrew/manifest.json`) está ilegível; o reparo não o refaz. Rode `npx @aksp/opencrew@latest update` para refazer." |
| Restos do OpenSquad | cabeçalho, uma linha por arquivo, linha final; nada é apagado | "{N} resto(s) de uma instalação antiga do OpenSquad (a pasta `_opensquad/` não existe neste projeto). Nada foi apagado:" · "{caminho} — ponte do OpenSquad; o OpenCrew não usa este arquivo." · "{caminho} — cita `_opensquad/`; confira antes de apagar, pode ser um arquivo seu." · "Se você não usa mais o OpenSquad, pode apagar as pontes listadas. Este aviso volta a cada `update` enquanto os arquivos existirem." |
| Prévia do `blotato` (" / " é quebra de linha) | espera a palavra | "Vou publicar isto: / Contas: {conta} ({rede}), … / Quando: agora, ou agendado para {data e hora} / Texto ({N} caracteres): {texto} / Mídia: {arquivos}, ou nenhuma / Para publicar, responda com a palavra publicar. Qualquer outra resposta cancela." |
| Prévia do `resend` | espera a palavra | "Vou enviar este e-mail: / De: {remetente} / Para: {N} destinatário(s): {até 10 endereços}… e mais {N-10} / Assunto: {assunto} / Início do texto: {3 primeiras linhas} / Anexos: {nomes}, ou nenhum / Quando: agora, ou agendado para {data e hora} / Para enviar, responda com a palavra enviar. Qualquer outra resposta cancela." |
| Ação que apaga (contato, domínio) | espera a palavra | "Vou apagar isto: {o que será apagado}. Para apagar, responda com a palavra apagar. Qualquer outra resposta cancela." |
| Outra resposta à prévia | cancela, nada sai | "Nada foi publicado." · "Nenhum e-mail foi enviado." · "Nada foi apagado." |
| Falha ou resposta ausente depois da chamada | não repete | "⚠️ Não recebi a confirmação do {Blotato ou Resend}. {A publicação pode já ter saído, ou O e-mail pode já ter sido enviado}. Confira no painel antes de tentar de novo. Não vou repetir sozinho." |
| O passo de envio roda pela segunda vez | prévia de novo | "Este passo já tentou {publicar ou enviar} nesta execução. Confira se saiu antes de confirmar de novo." |
| Arquivo de saída com caractere fora da regra 21 | o runner não monta o comando e pergunta; se seguir, linha na aprovação final | "⚠️ O nome `{caminho}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses. / 1. Parar para você renomear (ajuste também o `outputFile` do passo) / 2. Seguir sem conferir este arquivo" · "{arquivo} — não verificado: nome com caractere que não vai em comando" |
| Pasta da crew com caractere fora da regra 21 | o runner para | "⚠️ A pasta da crew (`crews/{name}`) tem um caractere que não posso usar em comandos ({caractere}). Renomeie a pasta e rode de novo." |
| `generate.py`: prompt ou lote que não dá para ler | código 1, sem rastro de erro | "Arquivo de prompt não encontrado: {caminho}" · "O arquivo de prompt está vazio: {caminho}" · "Use só um: --prompt-file ou --batch." · "Não consegui ler o lote {caminho}: {motivo}. Grave o arquivo em UTF-8." |
| `--corrigir` diante de link para fora | não grava o arquivo (ou nada, se a crew inteira é o link) | "Não corrigi `{arquivo}`: é um link que aponta para fora da crew. O caminho citado nele continua como estava." · "Não corrigi nada: a pasta `{crew}` é um link que aponta para fora do projeto." |
| Citação de caminho de rede ou de endereço de site | alerta; não muda o status | "- ⚠️ `{citação}` é um caminho de rede ou um endereço de site: não conferi se existe (a conferência não acessa a rede). (citado em {arquivos})" |
| Erro ao ler um arquivo da crew na conferência | código 1, sem linha `FONTES:` | "Não consegui conferir: {motivo}" |

## 7. Segurança
Nada é apagado nesta fase. O que sai de um arquivo do usuário (texto legado idêntico, bloco ou
`.mcp.json` regravado) tem antes a cópia do arquivo inteiro, fora do git. O CLI grava pelo caminho
que encontra: se uma pasta do OpenCrew é um link criado pelo usuário, a gravação segue o link e a
cópia fica dentro do projeto. Os scripts leem o que o usuário apontou, inclusive por link dele
dentro do projeto; nenhum grava fora da pasta real da crew nem acessa a rede. Nome fora da regra 21
não entra em comando; texto de prompt vai por arquivo. Nada sai para conta externa sem a palavra do
usuário, nem para o npm sem a matriz verde. Limite: link físico (§12).

## 8. Cenários BDD
**A — Detecção de IDE e pontes**
- **R2-01a** DADO só Cursor e, um por vez, `CLAUDE.md`, `GEMINI.md`, `QWEN.md` e
  `.github/copilot-instructions.md` do usuário citando "OpenCrew" QUANDO `update` e QUANDO
  `init --repair-bridges` ENTÃO o arquivo não muda, não nasce ponte e a saída só cita o Cursor.
- **R2-01b** DADO ponte até a 1.2.2 de Copilot, Gemini e Qwen (título gerado, sem marcador), com
  texto do usuário acima do título e CRLF QUANDO `update` ENTÃO a IDE é detectada e atualizada.
- **R2-01c** DADO `init --ide=<id>`, para cada uma das 9 IDEs ENTÃO a detecção devolve só essa IDE;
  com Gemini CLI, Qwen ou Antigravity, o `update` e o reparo não citam o Codex.
- **R2-01d** DADO `src/lib/ides.js` ENTÃO os 4 caminhos divididos com o usuário e os 4 títulos
  gerados são os escritos por extenso no teste.
- **R2-01e** DADO workspace até a 1.2.2 (5 pontes inteiras, sem marcador) e DADO "bloco + texto
  legado" QUANDO `update` ENTÃO cada arquivo fica igual ao de uma instalação nova, sem "adopt", com
  cópia em `.opencrew-backup/<data>/`; o segundo `update` não copia de novo.
- **R2-01f** DADO texto legado com texto do usuário antes e depois (um caso em CRLF) QUANDO `update`
  ENTÃO o legado sai e o texto do usuário não muda.
- **R2-01g** DADO texto legado com uma linha editada QUANDO `update` e QUANDO
  `init --repair-bridges` ENTÃO fora do bloco nada muda e sai o aviso com o caminho.
- **R2-01h** DADO uma linha do usuário dentro do bloco do `CLAUDE.md` (em CRLF) e do `AGENTS.md`
  QUANDO `update` ENTÃO há cópia de cada arquivo como estava, o bloco fica novo, o resto fica
  intacto e em CRLF, o resumo lista os dois, e o segundo `update` não copia de novo.
- **R2-01i** DADO manifesto da 1.6.2 (sem registro de bloco) QUANDO `update` ENTÃO o bloco igual ao
  novo, ou só diferente em CRLF, não muda e não ganha cópia; o bloco diferente do novo (o do
  `.gitignore`) fica novo, com cópia. DADO bloco igual ao registro e diferente do novo (versão
  anterior) ENTÃO fica novo, sem cópia.
- **R2-01j** DADO `init` em pasta nova ENTÃO o manifesto registra os blocos e o do `.gitignore` traz
  `.opencrew-backup/`. DADO `_opencrew/` apagada e uma linha do usuário no bloco do `.gitignore`
  QUANDO `init` ENTÃO há cópia do `.gitignore` antes de o bloco ser regravado.
- **R2-01k** DADO só Cursor e `CLAUDE.md` do usuário com o título `## STATUS.md (gestão de sessão)`
  fora de bloco QUANDO dois `update` ENTÃO nada muda, não nasce ponte e nenhuma linha diz "removi".
- **R2-01l** DADO carimbo 9.0.0 e DADO carimbo 1.0.0 QUANDO `init --repair-bridges` sem opção, com
  `--yes`, `--all` e `--ide=cursor` ENTÃO código 1, pasta idêntica, e a mensagem cita as duas
  versões e o `update`, sem "Run npx". DADO workspace sem carimbo ENTÃO o reparo roda.

**B — `.mcp.json` e manifesto**
- **R2-02a** DADO manifesto com o registro do `.mcp.json` QUANDO `update` ENTÃO o arquivo apagado
  não é recriado (código 0), e o arquivo sem `playwright` não muda nem ganha cópia.
- **R2-02b** DADO manifesto sem esse registro QUANDO `update` ENTÃO o arquivo ausente é criado; o
  servidor ausente entra, com cópia do original citada na saída. Removido de novo, não volta.
- **R2-02c** DADO `.mcp.json` com tab e CRLF e a entrada do OpenCrew sem `--output-dir` QUANDO
  `update` ENTÃO a entrada ganha o par, o arquivo segue com tab e CRLF, e há cópia.
- **R2-02d** DADO a entrada do OpenCrew com `@playwright/mcp@0.0.40` ENTÃO a versão não muda. DADO
  um `playwright` posto pelo usuário, ou a entrada já com `--output-dir=x` ENTÃO o arquivo não muda.
- **R2-02e** DADO `.mcp.json` com `null`, `[]` ou `{"mcpServers":"x"}` QUANDO `update` ENTÃO código
  0, arquivo intacto, aviso de formato, resumo completo e carimbo na versão do pacote.
- **R2-02f** DADO `init` em pasta sem `.mcp.json` ENTÃO o manifesto ganha o registro; em pasta que
  já tinha, não. O `_comment` do template não promete que o `update` troca a versão.
- **R2-02g** DADO manifesto que não é JSON, ou com `files` `null`, `[]` ou `{}`, e uma skill editada
  QUANDO `update` ENTÃO código 0, aviso de ilegível, cópia feita, manifesto válido no fim, sem
  "Cannot read properties" nem "Primeira atualização". Com manifesto ausente, essa frase continua.
- **R2-02h** DADO `files: null` QUANDO `init --repair-bridges` ENTÃO código 0: com ponte diferente,
  cópia e a linha que aponta para o `update`; com ponte igual, o manifesto não é regravado.

**C — O que o `update` diz e os restos antigos**
- **R2-03a** DADO um modelo de crew apagado QUANDO `update` ENTÃO ele volta, a saída lista o caminho
  e a frase final é a da §6. O README não diz que `crews/` nunca é tocado sem a ressalva.
- **R2-03b** DADO IDE instalada com um arquivo de ponte faltando QUANDO `update` ENTÃO ele sai em
  "Pontes criadas", com o caminho. DADO nada a regravar ENTÃO "já estavam em dia". DADO nenhuma
  ponte ENTÃO código 0, nada criado e a mensagem com o comando do reparo.
- **R2-03c** DADO manifesto presente e um arquivo do framework diferente do pacote, sem entrada nele
  QUANDO `update` ENTÃO o resumo das cópias não diz "que você tinha editado".
- **R2-03d** DADO `AGENTS.md` e `.gitignore` do usuário sem marcador QUANDO `update` ENTÃO a saída
  diz, de cada um, que o bloco foi acrescentado e o texto mantido. DADO bloco já igual ENTÃO nenhuma
  linha de `AGENTS.md`.
- **R2-03e** DADO workspace já instalado QUANDO `init` ENTÃO a saída não manda apagar `_opencrew/`,
  aponta para o `update` e cita `_opencrew/_memory/` e `_opencrew/best-practices.local/`.
- **R2-03f** DADO `.gemini/skills/opensquad/SKILL.md` e um `.claude/skills/minha/SKILL.md` do
  usuário que cita `_opensquad/` QUANDO dois `update` ENTÃO, nos dois, saem o cabeçalho com o total,
  "ponte do OpenSquad" na ponte, "confira antes de apagar" no do usuário e a linha final; nada muda.
- **R2-03g** DADO cada um dos 7 caminhos da regra 16 QUANDO `update` ENTÃO o aviso cita o caminho.
  DADO `_opensquad/` na raiz, ou `update --check` ENTÃO nenhum aviso.
- **R2-03h** DADO `.mcp.json` cujo `playwright` usa `_opensquad/config/playwright.config.json`,
  inexistente QUANDO `update` ENTÃO sai o aviso e o arquivo não muda.

**D — Skills de envio e texto em comando** (contrato de texto)
- **R2-04a** DADO o catálogo ENTÃO `instagram-publisher`, `blotato` e `resend` declaram
  `side_effects: irreversible`; todo SKILL.md com a marca tem prévia, palavra e "não repetir";
  `skill-format.md` e `skills.engine.md` documentam o campo.
- **R2-04b** DADO o corpo de `blotato` e de `resend` ENTÃO a ordem é prévia → palavra (`publicar`;
  `enviar`; `apagar`) → chamada única; o texto proíbe repetir depois de falha, avisa que pode já ter
  saído e manda mostrar a prévia de novo se o passo rodar outra vez. No `blotato`, o upload vem
  depois da palavra; no `resend`, a prévia cita remetente, destinatários e quantidade. A
  best-practice de publicação não manda subir mídia no Blotato sem postar.
- **R2-04c** DADO `skills.engine.md` e `runner.pipeline.md` ENTÃO o índice lê `side_effects`, avisa
  "irreversível" na linha da skill e manda carregar as instruções antes de usar.
- **R2-04d** DADO os blocos de comando de `runner.pipeline.md` e `export.prompt.md` ENTÃO, fora de
  aspas duplas, não sobra caminho da crew. DADO `sherlock-shared.md` ENTÃO a URL vai entre aspas.
- **R2-04e** DADO `runner.pipeline.md` ENTÃO a seção de nome seguro vem antes do primeiro comando,
  lista os caracteres permitidos e traz as três mensagens da §6; `instagram-publisher` e
  `image-ai-generator` citam a regra.
- **R2-04f** DADO o SKILL.md e o `generate.py` do `image-ai-generator`, lidos como texto ENTÃO o
  `invoke` usa `--prompt-file`, o SKILL.md não contém `--prompt "` e proíbe pôr o prompt no comando;
  o script declara `--prompt-file`, mantém `--prompt` e abre prompt e lote com `utf-8-sig`.

**E — Scripts do runtime**
- **R2-05a** DADO `--arquivo` absoluto de dentro do projeto, escrito por uma junção que aponta para
  a raiz (e o inverso: terminal aberto na junção, caminho real) ENTÃO código 0 e cabeçalho
  `### crews/x/output/post.md`. No Windows, idem com nome curto. `../fora.md` segue recusado.
- **R2-05b** DADO `crews/c/output/elo`, junção para uma pasta de fora, e `--arquivo` por ela ENTÃO o
  arquivo é verificado. DADO a crew citando um arquivo de dentro pela junção da raiz ENTÃO a
  sugestão é o caminho relativo, e é ele que o `--corrigir` grava.
- **R2-05c** DADO crew que é junção para fora do projeto QUANDO `--corrigir` ENTÃO a pasta de fora
  fica idêntica (nenhum `.bak`), sai o aviso e o status é `FONTES:PENDENTE`.
- **R2-05d** DADO `pipeline/steps` como junção para fora (e um link de arquivo em `agents/`, onde o
  sistema deixa criar) e um agente comum QUANDO `--corrigir` ENTÃO só o agente comum é corrigido,
  com `.bak`; sai uma linha por arquivo pulado, e a contagem é a do que foi gravado.
- **R2-05e** DADO a crew citando `\\servidor\pasta\arq.md` e `//servidor/pasta/arq.md` ENTÃO nenhuma
  chamada de disco usa caminho de duas barras, saem dois alertas "não conferido", o resumo é
  `2 fontes — 0 ok, 0 pendentes, 2 alertas` e o status é `FONTES:OK`; com uma pendência real ao
  lado, `FONTES:PENDENTE`. No verificador, `--arquivo` de rede é recusado sem tocar o disco.
- **R2-05f** DADO, entre crases, `exemplo.com/blog/`, `www.exemplo.com/a.html`,
  `ftp://exemplo.com/a.csv` e `mailto:a@exemplo.com/x.md` ENTÃO alerta "não conferido" e `FONTES:OK`;
  com a pasta `exemplo.com/` no projeto, a primeira é caminho. O runner cita o alerta e segue.
- **R2-05g** DADO link quebrado em `agents/`, ou junção de pasta chamada `x.md` QUANDO a conferência
  roda ENTÃO "Não consegui conferir: {motivo}", código 1, sem rastro de erro e sem linha `FONTES:`.

**F — Node e publicação**
- **R2-06a** DADO `package.json` e o lock ENTÃO `engines.node` tem o formato `>=X.Y.Z`, toda
  dependência de produção com `engines.node` aceita esse piso, e o README cita o mesmo piso.
- **R2-06b** DADO Node 20.16.0 QUANDO `update`, `init --yes`, `help` e `--version` ENTÃO a mensagem
  do piso, código 1, nenhum comando chamado, pasta intacta. DADO 20.17.0 ENTÃO roda.
- **R2-06c** DADO terminal interativo e a lista de IDEs que falha ao carregar QUANDO `init` sem
  opção ENTÃO a mensagem cita `--ide` e `--all`, código 1, pasta intacta. Ctrl+C segue com 130.
- **R2-06d** DADO `ci.yml` ENTÃO a matriz tem `ubuntu-latest` e `windows-latest`, e as versões do
  Node são o piso do `engines.node` e `22`.
- **R2-06e** DADO `ci.yml` e `publish.yml` ENTÃO o primeiro aceita `workflow_call` e roda
  `npm audit --audit-level=high`; no segundo, um job o usa, o job que publica declara `needs` dele,
  o passo tag × versão vem antes de publicar, e o disparo manual tem `dry_run` com padrão ligado,
  que leva a `npm publish --dry-run`.

**Upgrade**
- **R2-upg** DADO um workspace 1.6.2 com crew, memória, overlay local e `.env` QUANDO `update` ENTÃO
  `blotato` e `resend` trazem a marca e o bloco de confirmação, o runner traz a seção de nome
  seguro, a conferência entregue devolve "não conferido" para um caminho de rede, o bloco do
  `.gitignore` traz `.opencrew-backup/`, e os dados do usuário não mudam.

## 9. O que o humano confere na tela
- [ ] No `sandbox/`, num workspace 1.6.2 com uma linha própria dentro do bloco do `CLAUDE.md`, rodar
      o `update` e ler o resumo: cada linha confere com o que mudou, e a cópia existe.
- [ ] Gerar uma imagem em modo de teste com `--prompt-file`, num prompt com "R$50", aspas e acento:
      a imagem sai com o preço certo (nenhum teste roda Python).
- [ ] Numa conta de teste, uma crew com `blotato` ou `resend`: a prévia aparece, outra resposta
      cancela, a palavra envia uma vez só (jornada de referência, U0).
- [ ] Antes da tag: um pull request com a matriz nova mostra as quatro células verdes (a suíte nunca
      rodou no Node 20.17.0), e o `publish` disparado à mão, com `dry_run` ligado, não publica nada.

## 10. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vermelhos antes do código; o R1-08d passa a exigir a cópia.
- [ ] `npm run verify` verde; os testes de F1, U1, U2 e R1 continuam passando.
- [ ] No mesmo commit (regra 9): README (pré-requisitos, tabela do `update`, pontes, reparo,
      cópias), `GLOSSARIO.md`, `AGENTS.md` (Stack e tabela Regra → Trava), `CONTRIBUTING.md`,
      `.nvmrc`, specs F1, R1 e U2 (cada "→ R2" e o que esta fase muda), U3a (o `.gitignore` passa a
      seguir a regra 4 daqui) e U3b, e o C-18 da auditoria de 2026-10-02.
- [ ] CHANGELOG 1.6.3: a primeira linha diz que o Node mínimo subiu numa versão de correção; cita a
      palavra pedida por `blotato` e `resend` e a última entrega do `.mcp.json`.
- [ ] Conferências da §9 antes da tag (a terceira entra na U0); `npm version patch`; commit, tag e
      publicação só com confirmação do dono.

**A porta não cobre:** uma IA seguindo as regras 18, 19 e 21 (→ U0); a suíte num Node 20.17.0 local;
o `generate.py` (Python); a publicação real.

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| "Registrado no manifesto e ausente = apagado por você, não volta" (modelo de crew e skill do catálogo) e "registrado e não editado = recebe a melhoria" (agentes-base, `config/`, `_investigations/` e modelos de crew): as duas partes do H3-11 | → U5 — decididas juntas, com o T-M9 |
| Frases do CLI fora da lista da regra 13: "Framework and catalog skills refreshed (N files written)", sem dizer quais; o aviso do Playwright no `init` quando o `.mcp.json` foi mantido; os textos em inglês do reparo ("regenerated", "merged") | → U5 — tradução e revisão do resto do CLI |
| Remover restos do OpenSquad com cópia; avisar `_build/` e logs antigos na raiz, `squads/`, `dashboard/` e texto do OpenSquad em arquivos compartilhados | → U5 — limpeza assistida (`/opencrew cleanup`), com confirmação por arquivo |
| `CLAUDE.md` que é link para o `AGENTS.md` recebe duas pontes no mesmo arquivo | → U5 — polimento: nada se perde |
| O runner tratar como irreversível o passo cujo agente usa skill com a marca; crew já criada que copiou `--prompt "…"` para o passo | → U4 — conserto de crews antigas (H1-01) |
| Confirmação de gasto em `image-ai-generator`, `apify` e `canva`; servidores MCP sem versão fixada nas skills (`resend`, `apify`) | → U5 — comportamento novo e polimento, não defeito achado em revisão |
| Trocar o `@playwright/mcp@latest` de instalações da 1.0.x pela versão fixada | → sem fase — não dá para distinguir de escolha do usuário; a fase que mudar a versão traz a migração |
| Dependência que flutua (`@inquirer/checkbox ^5.1.0`; o pacote publicado não leva lock) e remoção do `@inquirer/confirm` (C-22); células de CI para o Node 22.13 e o 24 (C-18) | → U5 — o piso da dependência pode subir de novo |
| Link físico (dois nomes para o mesmo arquivo) no `--corrigir`; vírgula em nome de arquivo aceita pelo script | → sem fase — limite declarado (§12); a vírgula se resolve renomeando |
| Apontados para cá pela spec U3a (§11 e §12): no `publish.js`, emoji contado como 2 (o verificador conta 1) e post de uma imagem só recusado; aviso "Já publicado" em crew anterior à 1.4.2 que publica por `blotato` ou `resend` | → U5 — polimento do publicador; a crew antiga → U4. Fora da triagem desta fase |

## 12. Limites conhecidos
- IDE sem nenhum arquivo de ponte próprio não é detectada (apagar tudo é desinstalar): volta com
  `init --repair-bridges --ide=<id>`. Idem para arquivo de instruções sem marcador e sem título.
- Ponte criada por engano da 1.6.0 à 1.6.2 já tem marcador e não se distingue de uma legítima. Para
  tirar à mão: apague o bloco `opencrew:start` … `opencrew:end` e a pasta de ponte da IDE.
- Com Codex e Gemini, Qwen ou Antigravity juntos, o resumo não cita o Codex (o arquivo dele é
  atualizado). Com `GEMINI.md` ou `QWEN.md` apagado e a skill compartilhada presente, diz "Codex".
- Primeiro `update`: nenhuma instalação até a 1.6.2 tem registro de bloco. Ganha cópia, editado ou
  não, todo arquivo cujo bloco difere do novo: o `.gitignore` de quem instalou desde a 1.4.2 (regra
  7) e as pontes e o `AGENTS.md` de quem vem de até a 1.5.0. Quem removeu o servidor do `.mcp.json`
  antes da 1.6.3 o recebe uma última vez. `@playwright/mcp@latest` da 1.0.x e o `_comment` antigo
  ficam como estão. Lista escrita em uma linha no `.mcp.json` vira um item por linha ao ser
  regravada. `.gitignore` sem bloco (até a 1.4.1) ganha o bloco no fim e mantém as linhas antigas,
  repetidas, fora dele (→ U3a).
- Manifesto válido mas incompleto não é detectável. As guardas novas só valem com o pacote 1.6.3 ou
  mais novo (por isso a documentação manda usar `@latest`). Os sete caminhos novos do OpenSquad
  foram conferidos só com o pacote `opensquad` 0.1.15.
- As regras 18, 19 e 21 dependem da IA; os testes só garantem o texto → U0. Os nomes das ferramentas
  de `blotato` e `resend` não foram conferidos nos servidores: daí a regra 18 ser escrita pela ação.
- Link físico não é reconhecido: o `--corrigir` ainda grava por ele. Unidade mapeada (`Z:\…`) para a
  rede é testada como disco local. `\\?\C:\…` e pasta com cara de domínio que sumiu saem como "não
  conferido". Lote de imagens fora de UTF-8 passa a falhar, com mensagem.
- Node: o aviso do próprio npm, em inglês, aparece antes da mensagem do piso. Quem está no Node 20.0
  a 20.16 precisa atualizar; a saída de emergência é `npx @aksp/opencrew@1.6.2 update`.
- Publicação: cerca de 1 min 30 s mais lenta, e uma célula instável a segura (saída: rodar o job de
  novo). Tag de prévia (`v1.6.3-rc.0`) casa com `v*` e seria publicada: não ensaiar assim. Não
  conferido: se o ensaio tenta gerar a proveniência.
- Tamanho (regra 6 do AGENTS.md): o runner (945 linhas, alvo 400) e o skills engine seguem acima do
  alvo; a R2 acrescenta poucas linhas. A divisão fica na U5.

## 13. Travas que esta spec deixa
Testes novos em `tests/`, um `<nome>.test.js` cada: `r2-deteccao` (R2-01a a c) · `r2-legado` (R2-01e
a g) · `r2-blocos` (R2-01h a l) · `r2-mcp` (R2-02a a f) · `r2-manifesto` (R2-02g, h) · `r2-resumo`
(R2-03a a e) · `r2-restos` (R2-03f a h) · `skills-envio` (R2-04a, b) · `runtime-contracts-r2`
(R2-04c a f; texto do runner de R2-05f) · `scripts-links` (R2-05a a d) · `scripts-rede` (R2-05e a
g) · `node-piso` (R2-06a a c) · `release-gate` (R2-06d, e). Em arquivos que já existem:
`ides.test.js` (R2-01d) e `upgrade.test.js` (R2-upg). Os textos legados e os títulos ficam escritos
no próprio teste, não importados de `src/`.

Código, em módulos novos de `src/lib/`: `deteccao.js` (regras 1 e 2) · `blocos.js` (regra 4) ·
`legado.js` (regra 3) · `mcp.js` (regras 8–11) · `resumo.js` (regra 13) · `node-version.js` (regra
27). A guarda de versão do reparo, dividida com o `update`, e os restos ficam em `migrations.js`; a
validação do manifesto, em `manifest.js`. No payload: `comum.mjs` recebe a regra 23; em
`conferir-fontes.mjs`, a guarda de escrita e a classificação da citação viram funções próprias. A
tabela Regra → Trava do `AGENTS.md` ganha os arquivos novos nas regras 3, 8 e 14.

## 14. Correções

Leituras adotadas na implementação (2026-10-06), onde a spec não fechava o caso.
- Registro de bloco: fica em `files` do manifesto, com a chave `<arquivo>#opencrew` e o hash do
  bloco. Quando o `init` faz cópia, lista as cópias, como o reparo.
- O `init` comum não tira texto legado (a regra 3 fala de `update` e reparo). O aviso de texto
  editado sai também quando fora do bloco só sobrou o título, e volta a cada `update`.
- Guarda do reparo: vem antes da validação de `--ide`; carimbo vazio conta como sem carimbo.
- `blotato` também pede a palavra `apagar`. Cancelar e-mail agendado, criar ou alterar contato e
  verificar domínio não pedem palavra. O `instagram-publisher` segue aceitando `publish` ou
  `publicar`, como na F1.
- Aspas: havia um quinto comando do runner sem aspas (`mkdir` da pasta da execução); ganhou.
  URL sem aspas continua nos quatro prompts `sherlock-<rede>.md`, que a regra 20 não lista → U5.
- `generate.py`: com `--prompt` e `--prompt-file` juntos, vale o arquivo; os arquivos são lidos
  antes da chave da API.
- Rede e site: `caminho: https://…` em `fontes:` segue como pendência, como hoje; `www.` e
  `mailto:` viram alerta mesmo com pasta de mesmo nome. Caminho de rede em `--crew` e `--arquivo`
  é recusado pelo texto, sem tocar o disco.
- "Corrigidos" conta caminhos; arquivo pulado ganha uma linha só. A guarda de escrita confere
  também a pasta onde o `.bak` é gravado.
- Node: a checagem do piso fica depois da leitura dos argumentos (opção errada ainda responde o
  erro de uso). No `publish.yml`, o ensaio é um passo próprio, sem o token.
- Resumo: "já estavam em dia" só sai quando nenhuma ponte foi atualizada nem criada; a lista de
  `crews/` inclui o `.gitkeep`; a linha do `playwright` que aponta para `_opensquad/` não entra
  no total de restos. Texto fora da §6: "AGENTS.md criado com o bloco do OpenCrew."
- Tamanho: o runner foi a 965 linhas e o skills engine a 495; `generate.py` a 211.
- Não feito: a rodada de revisão do código por lentes independentes (feita na R1) não foi
  repetida aqui. Nada rodou em Node 20.17 nem em Ubuntu antes do push: a prova é o CI.
- Achados de passagem, sem conserto nesta fase: a migração do `AGENTS.md` anterior à 1.3 grava a
  ponte sem marcador e o `update` seguinte duplica o texto → U5; `__pycache__` criado ao compilar
  o `generate.py` no repositório entraria no pacote → U5 (barrar no teste do pacote).
