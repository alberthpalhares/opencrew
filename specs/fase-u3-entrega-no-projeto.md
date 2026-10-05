# Spec — Fase U3: Entrega no projeto (1.7.0)

- **Fase:** U3 · **Módulos:** Runtime (`templates/`) + CLI (`update`) · **Status:** aguardando aprovação
- **Termos novos no GLOSSARIO.md:** sim — Entrega, Destino da entrega
- **Modelo sugerido:** execução Sonnet 5.5 · médio

## 1. Objetivo
Ao fim de uma execução, o resultado aprovado chega **pronto para usar, no lugar certo do projeto**:
cada canal numa pasta, textos prontos para colar, documentos oficiais em `.docx`, e um `LEIA-ME`
dizendo o que fazer com cada coisa. Chega de copiar à mão ou escrever script à parte.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| Uso real, dor 6 (Projeto B) | DOCX/PDF oficiais por script Python + Word feito à parte; resultados copiados à mão para as pastas do projeto | U3-01, U3-02, U3-03 |
| Uso real, dor 6 (Projeto A) | Zip de saída nunca usado; legenda/LinkedIn/blog misturados num markdown; HTML dos slides não guardado | U3-01 |
| T-M21 | Export PDF não executável (`npx playwright open` + "imprimir") | U3-04 |
| IDEIAS | Logo citado em fonte (manual de marca) que não existe na pasta → slides sem logo, sem aviso | U3-05 |
| IDEIAS | `.opencrew-backup/` e bloco do `.gitignore` não renovado pelo `update` | U3-06 |
| U1-05 (feito) | Instagram 4:5 / máx. 10 slides já corrigido | — |
| Fora daqui | Publicação automática, agendamento, Google Drive API | → sem fase |

## 3. Entradas
- `crew.yaml` ganha `entrega:` (opcional):
  ```yaml
  entrega:
    destino: Ativos/Projetos/Reforma/Entregas/   # relativo à raiz do projeto
    documentos: [docx]                           # formatos de documento oficial
  ```
- `node _opencrew/core/scripts/entregar.mjs --crew crews/<nome> --run <run_id> [--destino <pasta>]`
- Convenção de nomes nas saídas aprovadas (o build passa a gerar assim): arquivos `.md` com
  frontmatter `canal: instagram|linkedin|blog|email|whatsapp|documento` e `titulo:`.

## 4. Saídas
`crews/<nome>/output/<run_id>/entrega/` (e cópia em `destino`, se configurado):
```
LEIA-ME.md                 o que há aqui e como usar, por canal (PT-BR)
instagram/  01.jpg … , legenda.txt, hashtags.txt
linkedin/   post.txt
blog/       artigo.md, seo.txt (título, meta, slug)
email/      assunto.txt, corpo.md
documentos/ <titulo>.docx  (um por saída com canal: documento)
fontes/     slides-html/   (HTML dos slides, para reeditar)
```
Última linha do script: `ENTREGA:OK` ou `ENTREGA:INCOMPLETA`.

## 5. Regras de negócio
1. **Só o aprovado**: usa a última versão (`vN`) de cada saída listada no passo final; nunca mistura versões.
2. **Verificação antes**: roda o verificador da U1 em tudo que vai para `entrega/`; bloqueio →
   `ENTREGA:INCOMPLETA` e o LEIA-ME abre com os pendentes. `[PREENCHER]` pendente também.
3. **Canal por frontmatter**: textos de redes são separados por seção (`## Legenda Instagram`,
   `## Post LinkedIn`) em arquivos próprios, **sem alterar uma palavra**.
4. **Imagens**: copia só `.jpg/.jpeg` do último run, 2–10, mesma proporção entre 4:5 e 1,91:1
   (lê cabeçalho JPEG); fora disso, aviso com o conserto. HTML dos slides vai para `fontes/`.
5. **DOCX sem dependências**: `md → .docx` por gerador próprio (zip + OOXML mínimo com
   `node:zlib`): títulos, parágrafos, negrito/itálico, listas, tabelas, quebra de página
   (`---` entre `<!-- pagina -->`), cabeçalho/rodapé opcionais (`entrega.cabecalho`).
   O arquivo abre no Word e no LibreOffice sem aviso de reparo.
6. **Destino**: com `destino`, copia `entrega/` para lá (caminho relativo ao projeto, dentro do
   projeto); **nunca sobrescreve**: arquivo existente com conteúdo diferente ganha sufixo
   `-v2`, `-v3`.
7. **LEIA-ME em PT-BR**, gerado: lista só os canais presentes; por canal, passo a passo curto
   ("Instagram: abra o app → novo post → escolha as imagens na ordem → cole `legenda.txt`").
8. **Runner**: ao fim, roda o `entregar.mjs` e o resumo final mostra a pasta `entrega/`, o que há
   em cada canal e os próximos passos numerados (substitui "Output saved to").
9. **Export PDF**: sai da lista de formatos oferecidos até haver um método executável (T-M21);
   `export.prompt.md` passa a apontar para `documentos/*.docx` (Word/LibreOffice exportam PDF).
10. **Fontes citam arquivos que não existem**: `conferir-fontes.mjs` também confere, dentro das
    fontes `.md`, nomes de arquivo de imagem/documento citados (ex.: logos do manual de marca) e
    lista os que não existem na pasta citada, sugerindo os parecidos.
11. **`update`**: renova o bloco do `.gitignore`/`.env.example` (hoje só o `init` escreve) e
    acrescenta `.opencrew-backup/` ao bloco.

## 6. Erros e casos-limite
| Situação | Comportamento | Mensagem |
|---|---|---|
| Run sem saída aprovada | `ENTREGA:INCOMPLETA`, nada copiado | "Não encontrei saída aprovada em <run>." |
| Imagem PNG ou fora de 4:5–1,91:1 | aviso, imagem não entra | "slide-03.png: o Instagram só aceita JPEG…" |
| `destino` fora do projeto ou absoluto | recusa | "O destino precisa ser uma pasta dentro do projeto." |
| Arquivo igual já no destino | pula | — |
| Markdown com construção não suportada (HTML solto) | vira texto simples, aviso | "<n> trechos viraram texto simples." |

## 7. Segurança
Só lê/escreve dentro do projeto; `destino` validado; nunca apaga; não faz rede.

## 8. Cenários BDD
- **U3-01a** DADO saídas em `v1` e `v2` ENTÃO só `v2` entra na entrega.
- **U3-01b** DADO `legendas.md` com seções Instagram e LinkedIn ENTÃO `instagram/legenda.txt` e
  `linkedin/post.txt` têm o texto original byte a byte.
- **U3-01c** DADO bloqueio do verificador ENTÃO `ENTREGA:INCOMPLETA` e o LEIA-ME lista o pendente.
- **U3-01d** DADO imagens PNG, 3:4, e 11 slides ENTÃO avisos específicos e nada inválido copiado.
- **U3-01e** DADO HTML dos slides ENTÃO guardado em `fontes/slides-html/`.
- **U3-02a** DADO um markdown com título, parágrafos, lista, tabela e negrito ENTÃO o `.docx`
  é um zip válido e o `document.xml` contém esses elementos.
- **U3-02b** O `.docx` tem `[Content_Types].xml`, `_rels/.rels` e `word/document.xml` bem formados (XML válido).
- **U3-02c** Texto com acentos, aspas e `&`/`<` ficam corretos (escape XML).
- **U3-02d** `<!-- pagina -->` vira quebra de página.
- **U3-03a** DADO `destino` ENTÃO `entrega/` é copiada para lá; rodar de novo não duplica.
- **U3-03b** DADO arquivo diferente já existente ENTÃO `-v2`, o original intacto.
- **U3-03c** `destino` absoluto ou com `..` é recusado.
- **U3-04a** `export.prompt.md` não oferece PDF por `playwright open`; runner aponta para `documentos/`.
- **U3-05a** DADA uma fonte `.md` que cita `logo-preto.png` inexistente, com `Logo_Preta.png` na pasta ENTÃO pendência com sugestão.
- **U3-06a** DADO workspace 1.6.0 ENTÃO `update` renova o bloco do `.gitignore` incluindo `.opencrew-backup/`, sem tocar nas linhas do usuário.
- **U3-07a** Contratos: runner roda `entregar.mjs` no fim; resumo em PT-BR cita `entrega/`; build gera `canal:` no frontmatter.
- **U3-upg** `tests/upgrade.test.js`: workspace 1.6.0 → 1.7.0 recebe o script e o bloco novo.

## 9. O que o humano confere
- [ ] Rodar uma crew do Projeto A ou B até o fim: abrir `entrega/LEIA-ME.md` e seguir um canal.
- [ ] Abrir o `.docx` gerado no Word: sem aviso de reparo, títulos e tabelas corretos.
- [ ] Com `destino:`, conferir que o arquivo caiu na pasta certa do projeto.

## 10. Critérios de aceite
Cenários com teste de mesmo ID (vermelho antes); `npm run verify` verde; conferência da seção 9 (docx
conferido por mim em estrutura; abrir no Word é com você); CHANGELOG 1.7.0; release com confirmação;
atualizar A e B com autorização.

## 11. Fora de escopo → destino
| Não entra | Alocação |
|---|---|
| PDF direto (sem Word) | → sem fase — precisa de motor de renderização; Word/LibreOffice exportam |
| Papel timbrado/templates `.dotx` do usuário | → U4 |
| Publicação automática e agendamento | → sem fase |

## 12. Limites conhecidos
- Fidelidade do `.docx` é a de um conversor simples (sem imagens embutidas nem estilos de marca).
- A separação por canal depende de cabeçalhos/`canal:` — crews antigas sem eles só recebem a cópia dos arquivos (→ `repair` na U4).

## 13. Travas
`tests/entregar.test.js`, `tests/docx.test.js`, `tests/conferir-fontes.test.js` (U3-05), `tests/update-u2.test.js`/`upgrade.test.js`, `tests/runtime-contracts.test.js`.

## 14. Correções
(preenchida durante a implementação)
