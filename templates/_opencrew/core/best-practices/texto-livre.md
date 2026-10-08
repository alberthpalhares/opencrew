---
name: "Texto livre"
content_type: "plain-text"
description: "Text with no channel and no Word file: a proposal, a draft that becomes HTML or PDF, a plan, an internal report"
whenToUse: |
  Creating agents that write a text that is not a post for a network and is not a document to print or sign: commercial proposal, draft (minuta) that another step turns into HTML or PDF, work plan, internal report, briefing.
version: "1.0.0"
---

## Compact Rules

1. Write the full, final text: no outline, no notes to the reader, no "insert here".
2. No YAML frontmatter and no labels such as `=== TITLE ===`: everything in the file is the text itself.
3. Use `#`, `##` and `###` for the sections, simple tables for figures, `- ` for lists.
4. Missing real data is marked `[PREENCHER: o que falta]`; never invent a name, a date, a price or a number.
5. Copy figures exactly from the file they come from; when a total is shown, the parts add up to it.
6. Follow the structure the step asks for (its "Output Format"): this guide adds no structure of its own.

## What this format does not do

There is no size limit here and nothing is converted: the delivery keeps the file as it is, in
`outros/`. For a text to print, sign or file, use `documento-oficial`; for a post, an e-mail or a
message, use the format of that channel.