# Roteiro — Fase U6, o que a pausa deixou para depois (1.16.0 a 1.18.0)

- **Status:** escolhido pelo dono em 2026-10-08 ("subconjunto seguro, em 3 fatias") ao tirar o projeto da
  pausa da U5. Cada fatia tem spec própria, aprovação do dono, revisão independente, execução real e
  release, na ordem abaixo. O ciclo do `AGENTS.md` vale em cada uma.
- **Origem:** o `IDEIAS.md` — toda entrada que dizia `sem fase — projeto pausado`. Esta fase escolhe o
  que é seguro de fazer agora; o resto continua lá, com o motivo.

| Fatia | Versão | Spec | O que entrega |
|---|---|---|---|
| 1. Polimento do uso real | 1.16.0 | `fase-u6a-polimento-do-uso-real.md` | o que as execuções reais da 1.14.0 e da 1.15.0 apontaram: data com dia da semana errado, versão nova na entrega, resposta parcial em checkpoint, escala do revisor, textos fixos em PT-BR, revisões fora da numeração do texto, resumo "Pronto" para texto sem canal, perfil de Word vazio; higiene: os testes passam a apagar o que criam |
| 2. Dados e custo | 1.17.0 | `fase-u6b-…` (a escrever) | `/opencrew cleanup` com retenção (apaga dado do usuário: só com confirmação e cópia), orçamento de custo por execução (`Budget:`), `/opencrew feedback` |
| 3. Medição | 1.18.0 | `fase-u6c-…` (a escrever) | peso do X (emoji vale 2, link vale 23), trecho visível da legenda e do post, overlay local de best-practices como acréscimo |

## Por que nesta ordem
- A fatia 1 não muda o que o produto bloqueia nem apaga, e age sobre o que o usuário já viu: é a de
  menor risco e maior efeito percebido.
- A fatia 2 apaga dado do usuário (regra 3 do `AGENTS.md`): vem depois, com o desenho de confirmação
  e de cópia aprovado à parte.
- A fatia 3 muda o que o verificador mede: uma crew real pode passar a ver bloqueio que não via, por
  isso é a última e pede a conferência do dono em cada rede.

## Fica de fora (continua `sem fase — projeto pausado` no `IDEIAS.md`, cada um com o motivo)
Medir "como será colado", imagens e mais de um canal · publicador lendo a entrega · Word itens 1 a 7
(`.dotx`, logotipo JPEG/SVG, imagem, sumário, PDF direto…) · reescrever os cinco agentes-base e
`extends:` · busca semântica nas fontes · conserto que reordena a publicação · `.gitignore` antigo no
`update` (exige reescrever linha do usuário) · prompts de criação acima do tamanho-alvo · exemplos
neutros no payload · nome do arquivo entregue · o pedido ler quase o runner inteiro.

## Teto de tamanho
O núcleo do `runner.pipeline.md` está em 554 linhas, de um teto de 560. Toda regra nova do runner nesta
fase vai para uma parte em `runner/` ou compensa cortando outra.
