---
name: blotato
description: >
  Social media publishing and scheduling platform.
  Publish and schedule posts across Instagram, LinkedIn, Twitter/X,
  TikTok, YouTube, and more. Upload media and monitor post status.
description_pt-BR: >
  Plataforma de publicação e agendamento em redes sociais.
  Publique e agende posts no Instagram, LinkedIn, Twitter/X,
  TikTok, YouTube e mais. Faça upload de mídia e monitore o status dos posts.
description_es: >
  Plataforma de publicación y programación en redes sociales.
  Publica y programa posts en Instagram, LinkedIn, Twitter/X,
  TikTok, YouTube y más. Sube contenido multimedia y monitorea el estado de los posts.
type: mcp
version: "1.0.0"
mcp:
  server_name: blotato
  transport: http
  url: "https://mcp.blotato.com/mcp"
  headers:
    blotato-api-key: BLOTATO_API_KEY
side_effects: irreversible
env:
  - BLOTATO_API_KEY
categories: [social-media, automation, publishing, scheduling]
---

# Blotato Publisher

## When to use

Use Blotato when you need to publish or schedule social media posts across multiple platforms from a single interface. Blotato supports Instagram, LinkedIn, Twitter/X, TikTok, YouTube, and more. It handles media uploads, post scheduling, and status monitoring.

## Instructions

You have access to Blotato for social media publishing.

### Workflow

Publishing is **irreversible**: a post cannot be taken back once it is live. The rule below is
about the **action**, whatever the tool is called on the server: before ANY call that publishes,
schedules or deletes, follow this order. The messages to the user are in PT-BR, as written here.

1. List the connected accounts (`blotato_list_accounts`, read-only) to get the account IDs and
   platforms. Send nothing to Blotato yet, not even media.
2. **Preview (prévia)** — show the user exactly this, filled in:
   ```
   Vou publicar isto:
   Contas: {conta} ({rede}), …
   Quando: agora, ou agendado para {data e hora}
   Texto ({N} caracteres): {texto}
   Mídia: {arquivos}, ou nenhuma
   Para publicar, responda com a palavra publicar. Qualquer outra resposta cancela.
   ```
   (`Quando`: write `agora` or `agendado para …`. `Mídia`: the file names, or `nenhuma`.)
3. Wait for the word **publicar**. Any other answer — including silence, "ok" or "sim" — cancels:
   say "Nada foi publicado." and stop.
4. Only after the word: upload the media, if any (`blotato_upload_media`), then make **one single
   call** that publishes or schedules (`blotato_create_post`; if the server takes one account per
   call, once per account of the preview and never twice for the same account).
5. On success: check the result (`blotato_get_post_status`) and save the post URL and ID to the
   step output file immediately.
6. On failure, timeout or missing answer: do NOT repeat the call again, in this step or in a retry.
   Tell the user: "⚠️ Não recebi a confirmação do Blotato. A publicação pode já ter saído. Confira
   no painel antes de tentar de novo. Não vou repetir sozinho."
7. One confirmation is worth one publication. If this step runs again in the same run (a retry, or
   back from a rejected review), show the preview again, after this line: "Este passo já tentou
   publicar nesta execução. Confira se saiu antes de confirmar de novo." — and wait for the word.
8. A call that **deletes** (a post, a scheduled post, media) follows the same order with its own
   word: "Vou apagar isto: {o que será apagado}. Para apagar, responda com a palavra apagar.
   Qualquer outra resposta cancela." Any other answer: "Nada foi apagado."

### Best practices

- For scheduled posts, use ISO 8601 format for datetime
- After the publishing call, read `blotato_get_post_status` until status is "published" or
  "scheduled" — reading the status is safe; calling `blotato_create_post` again is not
- If status is "failed", report the error details to the user and let them decide

### Requirements

- Blotato account required (blotato.com)
- API key must be configured (Blotato Settings > API section)

## Available operations

- **List Accounts** -- Retrieve connected social media accounts and their platform types
- **Upload Media** -- Upload images and videos for use in posts (only after the word)
- **Create Post** -- Publish or schedule a post to one or more platforms (only after the word)
- **Get Post Status** -- Monitor publishing status (published, scheduled, failed)
- **Multi-platform Publishing** -- Post the same content across Instagram, LinkedIn, Twitter/X, TikTok, YouTube simultaneously
