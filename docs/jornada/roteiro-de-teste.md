# Jornada de referência — roteiro de teste de uso real (U0)

> Rodar **antes de cada release** (e depois de qualquer trilha U), num projeto real com o
> OpenCrew instalado — não no repositório-mãe. Registrar o resultado em
> `docs/jornada/medicoes.md` (uma linha por rodada). Sem dados de cliente no registro.

## Preparação
1. No projeto real: `npx @aksp/opencrew@<versão-candidata> update` (ou `npm pack` local +
   `npx <arquivo .tgz> update`).
2. Anotar a hora de início.

## Roteiro
1. Abrir a IDE e digitar `/opencrew`.
2. Rodar a crew principal do projeto com um tema real da semana.
3. Responder aos checkpoints como faria de verdade (sem "atalhos de teste").
4. Na aprovação final, conferir o relatório do verificador automático (U1+).
5. Usar o resultado de verdade: publicar, enviar ou arquivar no lugar definitivo.

## O que medir

| Métrica | Como medir |
|---|---|
| Decisões | Quantas vezes a IA pediu escolha/confirmação até o resultado final |
| Duração | Do `/opencrew` ao resultado final aprovado (min) |
| Passos fora do chat | Terminal, editar arquivo, procurar pasta, copiar à mão, gerar formato à parte |
| Bloqueios do verificador | Quantos, e quais eram reais |
| Correções manuais | O que você ainda teve de corrigir depois da aprovação (tipo, não o texto) |
| Inventou fato? | Sim/não — e se o marcador `[PREENCHER]` apareceu no lugar |
| Usou o resultado? | Sim (onde) / não (por quê) |
| Travou? | Onde e o que fez para seguir |

## Registro

Acrescentar em `docs/jornada/medicoes.md`:

| Data | Versão | Projeto (A/B/…) | Decisões | Min | Fora do chat | Bloqueios (reais) | Correções | Inventou? | Usou? | Travou? |
|---|---|---|---|---|---|---|---|---|---|---|

Uma métrica que piora entre releases vira item em `IDEIAS.md` com triagem.
