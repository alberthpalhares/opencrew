# Catálogo de Skills — opencrew

Este é o índice de skills disponíveis no catálogo oficial do opencrew. O Skills Engine
(`_opencrew/core/skills.engine.md`) lê este arquivo durante a descoberta de skills (Operação 7)
e busca `SKILL.md` de cada uma via `https://raw.githubusercontent.com/alberthpalhares/opencrew/main/templates/skills/<name>/SKILL.md`
para instalação (Operação 2).

| Skill | Tipo | Descrição |
|-------|------|-----------|
| `apify` | mcp | Plataforma de web scraping e automação. Extrai dados de qualquer site usando Actors prontos da Apify Store. |
| `blotato` | mcp | Publicação e agendamento em redes sociais (Instagram, LinkedIn, Twitter/X, TikTok, YouTube). |
| `canva` | mcp | Cria, busca, preenche e exporta designs do Canva (autenticação via OAuth). |
| `image-ai-generator` | script | Gera imagens via API do OpenRouter (modo teste barato + modo produção de alta qualidade). |
| `image-creator` | mcp | Renderiza HTML/CSS em imagens pixel-perfect via Playwright. Motor genérico para qualquer formato visual. |
| `image-fetcher` | hybrid | Obtém assets visuais de múltiplas fontes: busca na web, screenshots via Playwright, arquivos do usuário. |
| `instagram-publisher` | script | Publica carrosséis do Instagram a partir de imagens locais via imgBB + Graph API. |
| `opencrew-best-practice-creator` | prompt | Guia a criação e manutenção de arquivos de best-practice na biblioteca do opencrew. |
| `opencrew-skill-creator` | prompt | Cria, edita e avalia (evals/benchmark) skills do opencrew de qualquer tipo. |
| `resend` | mcp | Envio de emails pelo servidor MCP oficial da Resend (individual, lote, anexos, agendamento). |
| `template-designer` | prompt | Seleção de template visual para agentes de design — gera variações, renderiza e salva a identidade aprovada. |

Para instalar qualquer uma delas dentro da sua IDE: `/opencrew install <nome>`.
