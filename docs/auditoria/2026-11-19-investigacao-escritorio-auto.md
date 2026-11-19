# Investigação e correção — abertura automática do Escritório

Data: 2026-11-19 · Situação: correção implementada e verificada em runtime/CLI; o dono confirmou abertura automática e visual em uma crew de teste no Codex App.

## Evidências

1. O contrato U7-F3c exige abrir a URL no navegador integrado depois da confirmação do estado, sem interromper a execução se falhar. A abertura é realizada pelo agente usando as ferramentas da sessão, não pelo servidor (`specs/fase-u7-f3c-escritorio-auto-open.md`, §§ 2, 4 e 6).
2. O runner e a ponte genérica pedem a abertura, mas não identificam uma ferramenta ou sequência concreta para o Codex App. O tratamento explícito de daemon fora do sandbox aparece sobretudo na ponte do Antigravity (`templates/_opencrew/core/runner/escritorio.md`, `src/lib/ides.js`). Assim, seguir a instrução depende da interpretação do agente e das capacidades expostas na sessão.
3. `--automatico` inicia um processo filho e confirma `/estado` antes de emitir URL, mas essa confirmação não garante que o processo sobreviva ao término da ferramenta do harness. `--preparar` pode emitir `ESCRITORIO:DAEMON` com URL antes de existir servidor; a instrução exige iniciar o daemon antes de abrir. Não se deve apresentar essa URL como funcional antes de nova verificação de prontidão e identidade. Isso é uma hipótese compatível com o relato, não uma reprodução do incidente.
4. O registro de 16/11 relata que a confirmação visual no WebView ficou pendente por solicitação de permissão expirada. A suíte verifica principalmente instruções por regex e comportamento simulado de processos; não prova abertura integrada, persistência real nem atualização visual durante um run.
5. O `STATUS.md` registra falha de publicação de 1.21.1 e npm em 1.21.0 naquele momento; não foi conferido o estado atual do registro npm nem a versão instalada no projeto em que o problema ocorreu. A correção `--preparar` pode não estar presente naquele projeto: verificar antes de atribuir causa. Não há servidor escutando nas portas 4747–4756 neste momento, o que não prova o estado da sessão anterior.
6. A spec U7-F3c ainda afirma que o servidor escuta apenas em 127.0.0.1, mas E6 e o código usam 0.0.0.0; reconciliar os contratos sem alterar a política de rede aprovada por E6.

## Correção aplicada

1. `porta.mjs` agora só considera pronta uma página com HTTP 200 e conteúdo HTML, e confere em `/estado` projeto, versão e o par exato crew/run solicitado. A confirmação com `--confirmar --porta` não faz descoberta nem inicia outro processo.
2. `DAEMON` é tratado como instrução de inicialização. O processo é iniciado na porta indicada e, em seguida, a confirmação consulta novamente a instância. Uma ocupação de porta é identificada como `PORTA_OCUPADA`; a preparação pode ser refeita uma vez, sem encerrar o serviço que já estava usando a porta.
3. O fluxo comum de `run`, `retomar` e `pedir` e a ponte do Codex instruem a confirmação antes de abrir a URL exata no Browser integrado visível. Falha técnica pode seguir para navegador externo autorizado; recusa ou bloqueio de política não é contornado. `Dashboard: off` continua impedindo a abertura e a gravação de estado.
4. O `update` já entrega runtime e ponte como arquivos renováveis; o teste de upgrade cobre workspace antigo e preservação das preferências e conteúdo local.
5. A etapa de testes de `scripts/verify.js` limita concorrência a quatro workers no máximo. A execução inicial com 22 workers sofreu contenção de recursos e excedeu por duas linhas o teto agregado do runner; ambos foram corrigidos antes da verificação final.

## Validação e limites

- A causa exata da ocorrência relatada continua sem reprodução: não temos o workspace, harness, versão instalada ou erro original. A falha de prontidão/identidade era uma lacuna comprovada no contrato anterior, compatível com o relato, mas não prova que foi a causa daquele incidente.
- `npm run verify` terminou com código zero no Windows/Node 24. Também passaram 36 testes focados de Escritório, pontes, contratos e upgrades; 29 contratos de runner/tamanho; e 52 testes de servidor/página/estado executados com acesso autorizado a loopback.
- Um processo real foi lançado em pasta temporária: continuou respondendo depois de o comando de inicialização retornar. A raiz respondeu HTTP 200, `/estado` respondeu 200, e `--confirmar --porta ... --crew teste --run <id>` devolveu a URL com aquele run exato; o daemon permaneceu ativo. Outro ensaio confirmou marcador de conflito sem terminar o serviço existente.
- A tentativa de inspeção assistida por CUA nesta sessão expirou ao aguardar `service_info`. Depois, o dono executou uma crew de teste no Codex App e confirmou que funcionou, concluindo o aceite visual principal. Não foram registrados o run_id, a versão do workspace nem os passos observados. Antigravity e Claude Code Desktop não foram conferidos nesta validação.
- A confirmação por harness remoto, VPN e encaminhamento de porta depende de capacidade oferecida e autorizada pelo próprio harness; esta sessão não verificou esses ambientes.
- Não houve bump de versão, commit, push, tag ou publicação. A release depende de conferência visual e das decisões de entrega previstas nas regras do repositório.
