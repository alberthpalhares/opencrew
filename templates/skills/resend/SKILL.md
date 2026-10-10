---
name: resend
description: >
  Send emails through Resend's official MCP server.
  Supports single send, batch send, HTML and plain text bodies,
  attachments, CC/BCC, scheduling, and contact management.
description_pt-BR: >
  Envie emails pelo servidor MCP oficial da Resend.
  Suporta envio individual, envio em lote, corpo HTML e texto puro,
  anexos, CC/BCC, agendamento e gerenciamento de contatos.
description_es: >
  Enviar correos electrónicos a través del servidor MCP oficial de Resend.
  Soporta envío individual, envío por lotes, cuerpo HTML y texto plano,
  adjuntos, CC/BCC, programación y gestión de contactos.
type: mcp
version: "1.0.0"
mcp:
  server_name: resend
  command: npx
  args: ["-y", "resend-mcp"]
  transport: stdio
side_effects: irreversible
env:
  - RESEND_API_KEY
categories: [email, automation, communication]
---

# Resend — Email Skill

## When to use

Use this skill when a crew needs to send emails — welcome messages, notifications,
reports, newsletters, or any transactional/marketing email. Resend handles delivery
so the crew only needs to compose the content and call the MCP tools.

## Instructions

### Confirmation (before any send, schedule or delete)

Sending is **irreversible**: an e-mail cannot be taken back once it leaves. The rule below is
about the **action**, whatever the tool is called on the server: before ANY call that sends,
schedules or deletes, follow this order. The messages to the user are in PT-BR, as written here.

1. Prepare **from**, **to**, **subject**, **body** (HTML or plain text) and attachments. Call no
   sending tool yet.
2. **Preview (prévia)** — show the user exactly this, filled in:
   ```
   Vou enviar este e-mail:
   De: {remetente}
   Para: {N} destinatário(s): {até 10 endereços}… e mais {N-10}
   Assunto: {assunto}
   Início do texto: {3 primeiras linhas}
   Anexos: {nomes}, ou nenhum
   Quando: agora, ou agendado para {data e hora}
   Para enviar, responda com a palavra enviar. Qualquer outra resposta cancela.
   ```
   (`{N}` is the total of recipients — to, CC and BCC; in a batch, of all the e-mails together.
   List at most 10 addresses; "… e mais {N-10}" only when there are more. `Quando`: write `agora`
   or `agendado para …`. `Anexos`: the file names, or `nenhum`.)
3. Wait for the word **enviar**. Any other answer — including silence, "ok" or "sim" — cancels:
   say "Nenhum e-mail foi enviado." and stop.
4. Only after the word: make **one single call** — `send_email` for one e-mail,
   `batch_send_emails` for a batch.
5. On success: check the response for the `id` (one per item in a batch) and save it to the step
   output file immediately.
6. On failure, timeout or missing answer: do NOT repeat the call again, in this step or in a retry.
   Tell the user: "⚠️ Não recebi a confirmação do Resend. O e-mail pode já ter sido enviado.
   Confira no painel antes de tentar de novo. Não vou repetir sozinho."
7. One confirmation is worth one send. If this step runs again in the same run (a retry, or back
   from a rejected review), show the preview again, after this line: "Este passo já tentou enviar
   nesta execução. Confira se saiu antes de confirmar de novo." — and wait for the word.
8. A call that **deletes** (removing a contact or a domain) follows the same order with its own
   word: "Vou apagar isto: {o que será apagado}. Para apagar, responda com a palavra apagar.
   Qualquer outra resposta cancela." Any other answer: "Nada foi apagado."

### Sending a single email

Fields: **from**, **to**, **subject** and **body**; a successful `id` in the response confirms the
e-mail was queued.

### Sending a batch

A batch to **more than 20 recipients** is confirmed with the user before sending, with the number of
recipients: `Vou enviar para {n} destinatários. Posso seguir?` (the confirmation above still applies).

Build an array of email objects (same fields as single send). Each item in the response has its
own `id` or error — report both; never send the failed ones again on your own.

### Attachments

Pass attachments as an array with `filename`, `path` (local file), `url`, or `content` (base64).

### Scheduling

Include a `scheduled_at` field (ISO 8601 datetime) to schedule future delivery. A scheduled e-mail
asks for the same preview and the same word, with the date and time on the `Quando` line.

## Best practices

- Validate **from** against a verified domain before sending — Resend rejects unverified senders.
- Keep subject lines under 80 characters for better deliverability.
- For batch sends, group by shared content to reduce payload size.
- Always check the response for errors and surface them to the user rather than silently failing
  — and never by sending again.
- When composing HTML emails, keep the markup simple — most email clients ignore complex CSS.

## Available operations

- **Send Email** — Single email with HTML/text body, attachments, CC/BCC, reply-to (only after the word)
- **Batch Send** — Multiple emails in one call (only after the word)
- **Schedule Email** — Queue an email for future delivery (only after the word)
- **List/Get Emails** — Check delivery status of sent emails
- **Cancel Email** — Cancel a scheduled email before it sends
- **Manage Contacts** — Create, list, update, and remove contacts from audiences (removing asks for the word `apagar`)
- **Manage Domains** — Add and verify sender domains (removing asks for the word `apagar`)

## Setup

1. Create a free account at [resend.com](https://resend.com)
2. Generate an API key (starts with `re_`)
3. Add a verified sender domain (or use Resend's shared `onboarding@resend.dev` for testing)
4. Set `RESEND_API_KEY` in your `.env` file
