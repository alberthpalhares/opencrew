---
name: instagram-publisher
description: >
  Publishes Instagram carousel posts from local images.
  Uploads images to imgBB (requires API key) for public hosting, creates Instagram
  media containers via the Graph API, and publishes the carousel.
  Supports 2-10 images per post and retrieves the real post permalink.
description_pt-BR: >
  Publica carrosséis do Instagram a partir de imagens locais.
  Faz upload das imagens para o imgBB (requer chave de API) como hospedagem pública,
  cria containers de mídia via Graph API e publica o carrossel.
  Suporta de 2 a 10 imagens por post e obtém o permalink real.
description_es: >
  Publica carruseles de Instagram a partir de imágenes locales.
  Sube las imágenes a imgBB (requiere clave de API) como hosting público, crea
  contenedores de medios vía Graph API y publica el carrusel.
  Soporta de 2 a 10 imágenes por post y obtiene el permalink real.
type: script
version: "1.0.0"
script:
  path: scripts/publish.js
  runtime: node
  invoke: "node --env-file=.env {skill_path}/scripts/publish.js --images \"{images}\" --caption-file \"{caption_file}\""
side_effects: irreversible
env:
  - INSTAGRAM_ACCESS_TOKEN
  - INSTAGRAM_USER_ID
  - IMGBB_API_KEY
categories: [social-media, publishing, instagram]
---

# Instagram Publisher

## When to use

Use the Instagram Publisher when you need to publish carousel posts directly to an Instagram Business account. This skill handles the full workflow: uploading images to imgBB (requires your own API key from https://api.imgbb.com/), creating Instagram media containers via the Graph API, and publishing the carousel. It supports 2-10 JPEG images per post.


## Instructions

### Workflow

Publishing is **irreversible**: a post cannot be taken back once it is live. This step
runs only at the end of the pipeline, after the Review and the Final Approval checkpoint,
and is **never** retried automatically.

1. Find the images produced by the rendering step **of this run** in
   `crews/{crew}/output/{run_id}/` (use the latest `vN/` folder if there are versions),
   JPEG only, sorted by name. If there are no `.jpg`/`.jpeg` files: stop and ask the user
   (PNG renders must be re-rendered as JPEG — Instagram accepts JPEG only).
2. Extract the caption from the approved content draft (hook slide text + CTA slide text,
   max 2200 characters) and **write it to a file**:
   `crews/{crew}/output/{run_id}/caption.txt`. Never put the caption inside a shell command.
3. **Preview**: show the user the ordered image list and the full caption, and let them
   confirm the order (use your IDE's native interactive-choice mechanism if it has one;
   otherwise a numbered list).
4. **Dry run** — validates images, credentials and containers without posting:
   ```
   node --env-file=.env {skill_path}/scripts/publish.js \
     --images "<comma-separated-ordered-paths>" \
     --caption-file "crews/{crew}/output/{run_id}/caption.txt" \
     --dry-run
   ```
   If it fails: show the error and stop.
5. **Ask for explicit confirmation** before going live: the user must answer with the
   word **publish** (or **publicar**). Any other answer — including silence, "ok" or an
   ambiguous reply — means do not publish.
6. **Live publish** — the same command without `--dry-run`. Run it **once**.
7. On success: save the post URL and post ID to the step output file immediately.
8. On failure or missing output: do NOT run the command again. Tell the user the post may
   already be live, ask them to check the Instagram profile, and let them decide.

### Constraints

- Images: JPEG only (`.jpg`/`.jpeg`), 2-10 per carousel, inside `crews/*/output/` — the
  script refuses anything else before uploading
- File names: the image paths and the caption file follow the safe-name rule (nome seguro) of
  `_opencrew/core/runner.pipeline.md` — letters, digits, space and `. _ - / \ : ( )`. With any
  other character (a comma included: it splits the `--images` list) do not run the command: ask
  the user to rename the file
- Images are hosted on imgBB for 24h only (enough for Instagram to fetch them)
- Caption: max 2200 characters
- Requires Instagram Business account (not Personal or Creator)
- Rate limit: 25 API-published posts per 24 hours

### Setup (first-time)

Copy `.env.example` to `.env` and fill in the three required variables:

```
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
IMGBB_API_KEY=
```

#### INSTAGRAM_ACCESS_TOKEN

Pré-requisito: conta Instagram Business conectada a uma Página do Facebook, e um app criado em [developers.facebook.com](https://developers.facebook.com/) (tipo: **Empresa**).

**Para obter um token de longa duração (válido 60 dias):**

1. Acesse seu app → **Graph API Explorer**
2. No dropdown do topo, selecione seu app
3. Clique em **"Gerar token de acesso"**
4. Ative as permissões:
   - `instagram_content_publish`
   - `instagram_basic`
   - `pages_read_engagement`
5. Clique em **"Gerar token de acesso"** e autorize — você receberá um token de curta duração (1h)
6. Converta para longa duração (60 dias) com este GET:
   ```
   https://graph.facebook.com/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={TOKEN_CURTO}
   ```
   _(APP_ID e APP_SECRET: seu app → Configurações → Básico)_
7. Copie o `access_token` da resposta e cole em `.env`

> O token expira em 60 dias. Repita o processo para renovar.

#### INSTAGRAM_USER_ID

1. No Graph API Explorer (com o token acima), faça GET em:
   ```
   /me/accounts
   ```
2. Localize sua **Página do Facebook** na resposta e anote o `id`
3. Faça GET em:
   ```
   /{page-id}?fields=instagram_business_account
   ```
4. Copie o `id` dentro de `instagram_business_account` — esse é o seu User ID

## Available operations

- **Publish Carousel** -- Upload images and publish a carousel post to Instagram
- **Dry Run** -- Test the full publishing flow without actually posting (use `--dry-run` flag)
- **Image Upload** -- Upload the crew's JPEG renders to imgBB for 24h (requires API key)
- **Status Check** -- Monitor media container processing status before publishing
