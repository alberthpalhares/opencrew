---
name: "Documento oficial"
platform: "documento"
content_type: "official-document"
description: "Text that becomes a Word document to print, sign or file: minutes, official letters, statements, contracts and reports, written so the conversion keeps every word"
whenToUse: |
  Creating agents that produce a document to print, sign or file — minutes (ata), official letter (ofício), statement, contract, formal report — which the project turns into a Word file (.docx).
version: "1.0.0"
---

## Compact Rules

1. One paragraph per line. Never break a paragraph in the middle: each line of the file becomes one paragraph of the document, and lines that follow each other are not joined.
2. Start with `::: titulo` and, when there is one, `::: subtitulo`, as the first lines of the text (one line each).
3. Use `#`, `##` and `###` for the sections, and no deeper level.
4. Write every number by hand — "I.", "1.", "6.1.", "a)", "§ 1º" — in sections and in items. Nothing is numbered automatically: the number you write is the official text.
5. Use a simple table (header line, separator line, rows) for figures and lists of names. No merged cells, no table inside a table.
6. Put `::: quebra-de-pagina` alone on a line before each annex (anexo), so the annex starts on a new page.
7. Put the `::: assinaturas` block at the end of the document (and at the end of an annex that is signed): one line `Nome | Cargo` per person, closed by a line with only `:::`.
8. No image, no HTML, no labels such as `=== … ===`, no notes section and no comments to the reader: everything in the file goes to the document.
9. Write the full, final text. Missing real data is marked `[PREENCHER: o que falta]`; never invent a name, a date, a number or a registration.
10. Use bold (`**texto**`) and italic (`*texto*`) sparingly; a list of plain items uses `- `.

## What the conversion does

The project turns this text into a Word file with one script, with the same words and the same
numbers, in the same order. Knowing what it does tells you how to write:

| You write | The document gets |
|---|---|
| `::: titulo Texto` · `::: subtitulo Texto` | A centered title · a centered subtitle, in italic. Valid anywhere, as many times as needed (an annex has its own) |
| `# Texto` · `## Texto` · `### Texto` | Section headings of level 1 (shown in capitals), 2 and 3 |
| A line of text | One justified paragraph |
| A line that starts with a number or a letter of item (`1.`, `a)`) | A common paragraph, with the number as you wrote it; two spaces at the start of the line indent it |
| `- item` | A bulleted item (two spaces before it: second level) |
| A table | A table with equal columns and the first line in bold |
| `---` alone on a line | A horizontal line |
| `::: quebra-de-pagina` | The next block starts on a new page |
| `::: assinaturas` … `:::` | Signature lines, two per row, with the name above the role |
| `[texto](https://endereco)` | `texto (https://endereco)`, as plain text |

The header with the logo, the footer with "Página X de Y", the margins and the font come from
the profile of the project, not from the text: never write a header, a footer or a page number.

## The three markings

A marking is a line that starts with `:::` in the first column.

- **Title and subtitle** — `::: titulo ATA DA REUNIÃO` and `::: subtitulo Realizada em 5 de maio de 2026`. One line each. They are not sections: the sections are the `#` lines.
- **Page break** — `::: quebra-de-pagina`, alone on the line, with nothing after it.
- **Signatures** — open with `::: assinaturas`, write one person per line as `Nome | Cargo` (the role is optional) and close with `:::`. Inside the block nothing else is read: bold and italic signs would be printed as typed. The order you write is the order on the page, left to right and top to bottom.

Any other word after `:::` is not a marking: the line goes to the document as text, and the
conversion warns about it. A signature block without the closing `:::` also stays as text.

## What does not go in the text

- **Images** (`![…](…)`) — the document carries no image in the body; the line would stay as text. The logo belongs to the profile of the project.
- **HTML** (`<br>`, `<center>`, `<table>`) and HTML comments — they would be printed as they are.
- **Labels and service blocks** (`=== TÍTULO ===`, `NOTES:`, checklists for the writer) — they are not removed.
- **A notes section** ("Notas", "Observações do redator", "Fontes consultadas" that are not part of the document) — say it to the user in the conversation, not in the file.
- **Frontmatter is the only exception**: a `---` block of `chave: valor` lines at the very top stays out of the document.

## Structure of a document

1. **Title and subtitle** — what the document is; when and where, in the subtitle.
2. **Opening** — who, when, where, under which rule or call.
3. **Body in numbered sections** — one subject per section, in the order of the agenda or of the request. Decisions are written as decisions ("Aprovado por unanimidade."), with the numbers that support them.
4. **Closing** — what happens next, and who wrote the document.
5. **Signatures** — everyone who signs, with the role.
6. **Annexes** — each one after a page break, with its own title.

## Output Example

```markdown
::: titulo ATA DA REUNIÃO DA DIRETORIA
::: subtitulo Realizada em 5 de maio de 2026, na sede da Associação Exemplo de Moradores

# I. Abertura
Aos 5 dias do mês de maio de 2026, às 19h, reuniu-se a diretoria da Associação Exemplo de Moradores, na Rua das Acácias, 100, com a presença dos três diretores.
A presidente, Ana Lima, abriu a reunião e convidou Rui Sá para secretariar os trabalhos.

# II. Ordem do dia
A presidente leu a ordem do dia:
1. Reforma do salão de festas;
2. Calendário de eventos do segundo semestre.

# III. Reforma do salão de festas
## 3.1. Orçamentos recebidos
A tesoureira, Bia Reis, apresentou os três orçamentos recebidos:

| Empresa | Prazo | Valor |
|---|---|---|
| Construtora Exemplo | 30 dias | R$ 18.400,00 |
| Reformas Modelo | 45 dias | R$ 16.900,00 |
| Obras Amostra | 25 dias | R$ 21.000,00 |

## 3.2. Deliberação
Por unanimidade, a diretoria aprovou o orçamento da **Reformas Modelo**, com as seguintes condições:
- pagamento em três parcelas iguais;
- início da obra depois da festa junina.

# IV. Calendário de eventos
Ficou aprovado o calendário do segundo semestre, que segue no Anexo I.

# V. Encerramento
Nada mais havendo a tratar, a presidente encerrou a reunião às 20h15. Eu, Rui Sá, secretário, lavrei esta ata, que vai assinada por todos.

::: assinaturas
Ana Lima | Presidente
Rui Sá | Secretário
Bia Reis | Tesoureira
:::

::: quebra-de-pagina
::: titulo ANEXO I — CALENDÁRIO DE EVENTOS
::: subtitulo Segundo semestre de 2026

| Data | Evento | Responsável |
|---|---|---|
| 12 de julho | Festa julina | Bia Reis |
| 20 de setembro | Mutirão de limpeza | Rui Sá |
| 6 de dezembro | Confraternização | Ana Lima |
```

## Anti-Patterns

- A paragraph broken into several lines "to fit the screen": it becomes several paragraphs.
- `1.` typed for every item, counting on automatic numbering: the document shows exactly what is typed.
- The title of the document as `# Título`: it becomes a section heading, not the centered title.
- A signature drawn with underscores (`______`): use the `::: assinaturas` block.
- "Página 1 de 3", the name of the organization or the date of printing written in the text: the header and the footer come from the profile.
- A closing note such as "Posso ajustar o que precisar": it would be printed in the document.

## Quality Criteria

- [ ] Each paragraph is on one line; no line is a continuation of the previous one
- [ ] `::: titulo` is the first line of the text (after the frontmatter, if there is one)
- [ ] Every section and item number is written by hand, in sequence, with no gap
- [ ] Every table has a header line and a separator line, and the same number of columns in each row
- [ ] Each annex comes after `::: quebra-de-pagina` and has its own `::: titulo`
- [ ] The `::: assinaturas` block is closed by `:::` and lists everyone who signs
- [ ] No image, HTML, label, notes section or message to the reader
- [ ] No invented data: what is missing is `[PREENCHER: …]`
