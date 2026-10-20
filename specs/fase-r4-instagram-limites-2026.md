# Spec — Fase R4: Limites do Instagram de 2026

- **Fase:** R4 · **Módulos:** Payload (`templates/_opencrew/core/best-practices/`: `instagram-feed.md`, `instagram-reels.md`, `social-networks-publishing.md`, `image-design.md`; `templates/skills/`: `instagram-publisher` (SKILL.md + `scripts/publish.js`), `template-designer` (SKILL.md + `base-templates/model-a|b|c.html`), `image-creator`, `image-fetcher`) + CHANGELOG + AGENTS.md + IDEIAS.md + testes · **Status:** aprovada pelo dono em 2026-10-20 ("aprovado"); implementada (1.19.2)
- **Versão:** 1.19.2 (a U6 fatia 3, `fase-u6c-medicao.md`, segue como 1.20.0).
- **Termos novos no GLOSSARIO.md:** não.
- **Modelo sugerido:** execução Sonnet 5.5 · alto
- **Origem:** pedido do dono em 2026-10-20: o `instagram-feed` não contempla os formatos novos do Instagram (carrossel de até 20, 3:4 com 1080 de largura, até 5 hashtags). Pediu a atualização com base na documentação do próprio Instagram.
- **Depende de:** U1 (1.5.0, regra 12: limites no `constraints:` medidos pelo `verificar.mjs`); R1 (1.6.1, a medição por peça).

**Fontes oficiais** (consultadas em 2026-10-20):

| Limite | Fonte | O que diz |
|---|---|---|
| Itens no carrossel | Central de Ajuda, "Como compartilhar um post com várias fotos ou vídeos" — https://help.instagram.com/269314186824048 | "Você pode compartilhar até 20 fotos e vídeos como um único post" |
| | API — https://developers.facebook.com/docs/instagram-platform/content-publishing/ | "Carousels are limited to 20 images, videos, or a mix of the two" |
| Proporção e tamanho | Central de Ajuda, "Resolução de imagem das fotos…" — https://help.instagram.com/1631821640426723 | proporção "entre 1,91:1 e 3:4 (largura de 1080 pixels com altura entre 566 e 1440 pixels)" |
| Hashtags | Central de Ajuda, "Como usar hashtags no Instagram" — https://help.instagram.com/351460621611097 | "Você pode usar até cinco marcações em um post" |
| Legenda | API, referência IG User Media — https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media | 2.200 caracteres (não muda) |

**Divergência entre o app e a API (registrada, não resolvida por nós):** a referência da API
(`ig-user/media`) ainda diz que a imagem "Must be within a 4:5 to 1.91:1 range" e fala em 30
hashtags. O 3:4 vale no app; quem publica pela API (skill `instagram-publisher`) precisa de 4:5.
O teto de 5 hashtags vale para as duas vias (5 cabe nos 30 da API).

**Decisões do dono (2026-10-20):**
1. **3:4 (1080×1440) vira o padrão e o máximo** do carrossel, **com aviso** para quem publica pela
   API: lá, 4:5 (1080×1350).
2. **Escopo: tudo que é Instagram no payload** — feed, Reels, publisher, presets de imagem,
   `social-networks-publishing` e testes —, para nada no pacote contradizer a regra nova.
3. **Entrega: 1.19.2**, push e tag só com o sim do dono.

## 1. Objetivo
A crew que faz post de Instagram entrega carrossel de até 20 slides em 3:4 e legenda com até 5
hashtags, e o revisor bloqueia o que passar disso. Quem publica pela API é avisado de que lá a
imagem precisa ser 4:5.

## 2. Regras
1. **`instagram-feed.md`** — `constraints:` com `hashtags_max: 5`, `recommended_hashtags: "3-5"`,
   `carousel_max_slides: 20`, `image_ratio: "3:4 portrait (max); 1.91:1 to 3:4 accepted"`,
   `image_resolution: "1080x1440px"`. Os demais limites ficam como estão. `version: "1.1.0"`.
   O texto (Compact Rules, Writing Guidelines, Output Format, Quality Criteria, Anti-Patterns)
   para de recomendar "5-15" e de citar 30. Seção nova **Image Specs**: largura 1080; altura de
   566 a 1440; 3:4 por padrão; todos os slides na proporção do primeiro; publicação pela API:
   4:5, 1080×1350. As faixas de cada formato de carrossel (8–10 etc.) ficam; uma linha diz que o
   teto é 20, sem incentivar encher slides.
2. **`instagram-reels.md`** — `hashtags_max: 5`; a regra de hashtags diz "até 5".
3. **`social-networks-publishing.md`** — carrossel de 2 a 20 imagens; hashtags do Instagram: até 5.
   O exemplo de preview da publicação pela API continua em 1080×1350, com a nota da faixa 4:5 a 1,91:1.
4. **`instagram-publisher`** — `publish.js` aceita de 2 a 20 imagens (a mensagem de erro diz
   2–20); o `SKILL.md` (descrições EN/PT/ES e corpo) diz 2–20 e avisa que a API exige 4:5 a 1,91:1.
5. **Presets de carrossel do Instagram em 1080×1440**: `template-designer` (SKILL.md e os três
   base-templates), `image-creator`, `image-fetcher`, `image-design.md`. Post quadrado (1080×1080)
   e Story/Reel (1080×1920) não mudam.
6. **Travas antigas que contrariam a regra nova são aposentadas:** U1-05b (proibia 1440 nos
   presets) e R1-09c (proibia "1080×1440" no payload inteiro). U1-05a passa a exigir os valores
   novos. U1-upg passa a esperar 1080x1440.
7. **O medidor não muda:** o `verificar.mjs` já lê `hashtags_max` e `carousel_max_slides` do
   frontmatter; só os valores mudam.

## 3. Cenários (BDD)
- **R4-01a** (contrato) DADO o `instagram-feed.md` ENTÃO tem `hashtags_max: 5`,
  `carousel_max_slides: 20`, `1080x1440px` e `3:4`; não tem "5-15", "30 hashtags" nem
  `1080x1350px` como resolução.
- **R4-01b** DADO um `=instagram-feed` com legenda e 6 hashtags ENTÃO o `verificar.mjs` dá
  bloqueio 6/5; com 5 hashtags, nenhum bloqueio de hashtags.
- **R4-01c** DADO um `=instagram-feed` com 20 slides ENTÃO nenhum bloqueio de slides; com 21,
  bloqueio 21/20.
- **R4-02a** (contrato) DADO o `instagram-reels.md` ENTÃO tem `hashtags_max: 5` e não tem "5-15".
- **R4-03a** DADO o `publish.js` com 21 imagens ENTÃO erro "2–20" antes de qualquer acesso à rede;
  com 20, esse erro não aparece. O `SKILL.md` diz 2–20 e cita a faixa 4:5 a 1,91:1 da API.
- **R4-04a** (contrato) DADOS os presets de carrossel do Instagram (regra 5) ENTÃO estão em
  1080×1440 e nenhum ainda dá 1080×1350 como tamanho de carrossel do feed.
- **R4-upg** DADO um workspace com `instagram-feed.md` e `instagram-reels.md` antigos (30
  hashtags, 10 slides, 1080x1350) QUANDO `update` ENTÃO os dois trazem os valores novos. Não há
  migração nova: os arquivos moram em `_opencrew/core/` e no catálogo de skills, que o `update`
  já renova (regra 14).

**Cenários antigos com números novos** (o que cada um confere não muda, só o número que cruza o
limite): nos testes de R1-01a/b/e/h/s/v, R1-04a, R1-10b/c e U1-01d (`tests/verificar*.test.js`),
12 slides contra 10 viram 22 contra 20, e 31 hashtags contra 30 viram 6 contra 5. No U3a-09c-f1
(`tests/entregar-pendencias.test.js`), as hashtags que levam a legenda a 2.260 e a 2.200
caracteres passam a ser 5. As specs R1, U1 e U3a ficam como registro histórico dos números da época.

## 4. Fora do escopo
- Crews já criadas pelo usuário que citam 1080×1350 nos próprios passos: são dado do usuário
  (regra 3) e continuam válidas no app e na API.
- `best-practices.local/` do usuário: o overlay dele continua valendo sobre o core, como antes.
- Checagem automática da proporção das imagens no `publish.js` antes do envio → `IDEIAS.md`.
- Mudança da API da Meta para 3:4: quando a referência oficial mudar, o aviso sai (→ sem fase).
