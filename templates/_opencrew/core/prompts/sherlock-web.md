# Sherlock — Web Extractor

Load `sherlock-shared.md` before using this extractor.

This file contains the web research extraction process. The Architect loads this file (alongside `sherlock-shared.md`) when the investigation requires researching public websites, blogs, news portals, or any non-social web source.

Unlike social extractors, this extractor does NOT use browser automation — it uses `web_search` and `web_fetch` native tools for content extraction.

---

## When to Use

The Architect dispatches Sherlock-Web when:

- The crew needs competitive analysis from public websites
- The briefing requires industry research from blogs and news portals
- The user wants to analyze a specific company's public-facing content strategy
- The crew domain involves market research, industry trends, or technical documentation
- Reference URLs point to non-social domains (`.com`, `.org`, `.blog`, `.dev`, etc.)

---

## Source Coverage

Sherlock-Web can extract content from:

| Source Type | Method | Output |
|---|---|---|
| Company websites | `web_fetch` homepage + key pages | Content strategy, messaging patterns, product positioning |
| Industry blogs | `web_search` + `web_fetch` top results | Topic trends, writing style, audience engagement signals |
| News portals | `web_search` + `web_fetch` articles | Headline patterns, editorial angle, sourcing habits |
| Documentation / technical sites | `web_fetch` specific pages | Structure patterns, depth of coverage, tone |
| Landing pages / funnels | `web_fetch` key URLs | Copy patterns, CTA strategies, value proposition framing |
| Forums / communities (Reddit, Stack Overflow, etc.) | `web_search site:domain` + `web_fetch` | Discussion patterns, pain points, language used by audience |

---

## Extraction Process

### Step 1: Search Strategy

Based on the crew briefing and the domains identified in `discovery.yaml`, formulate search queries that target the specific knowledge needed.

**Query formulation rules:**
- Be specific — "SaaS onboarding best practices 2026" not "SaaS"
- Use domain filters when relevant: `site:company.com strategy`
- Search for examples: `"{domain}" examples` and `"best {content type}" examples`
- Search for anti-patterns: `"{domain}" mistakes` and `"{domain}" pitfalls`
- Search for frameworks: `"{domain}" framework` and `"{domain}" methodology`

Run all searches using `web_search`. Collect 3-5 high-signal results per query — skip results that are:
- Paywalled or login-gated (can't `web_fetch`)
- Obviously low-quality (thin content, spam)
- Duplicates of already-collected sources
- Older than 2 years unless specifically researching historical context

### Step 2: Deep Extraction

For each selected result, use `web_fetch` to retrieve full content. Extract:

1. **Key arguments / theses**: What is the main point? What claims are made?
2. **Evidence cited**: What data, examples, or sources are referenced?
3. **Structure pattern**: How is the content organized? (list, narrative, framework, comparison, etc.)
4. **Language patterns**: Vocabulary choices, tone markers, sentence style
5. **CTA / engagement hooks**: How does the content invite action or further reading?
6. **Unique insights**: What does this source say that others don't?

### Step 3: Competitive Analysis (when applicable)

When the crew needs competitive intelligence:

1. Search for competitor names + content keywords: `"{competitor}" "{topic}"`
2. Fetch their most visible content (blog posts, landing pages, case studies)
3. Map their content strategy: what topics do they cover? what do they avoid? what's their publishing cadence?
4. Identify gaps: topics competitors cover weakly or not at all → these become opportunities for the crew

---

## Output

Sherlock-Web produces the same two output files as social extractors:

### `raw-content.md`

```markdown
# Raw Content: Web Research — {topic/domain}

Investigated: {YYYY-MM-DD}
Total sources analyzed: {N}
Source types: {comma-separated: blogs, news, company sites, forums}

---

## Source 1: "{Title or Headline}"

**URL:** {url}
**Domain:** {domain.com}
**Type:** {blog post | news article | landing page | documentation | forum thread}
**Date:** {publication date or "unknown"}

### Summary
A 2-3 sentence objective summary of the source content.

### Key Arguments
- {Claim or finding 1}
- {Claim or finding 2}
- {Claim or finding 3}

### Evidence Cited
- {Source or data point 1}
- {Source or data point 2}

### Structure
{Description of content structure — e.g., "listicle with 7 items", "narrative case study", "framework with 4 pillars"}

### Language & Tone
- Tone: {formal/casual/authoritative/conversational/etc.}
- Notable vocabulary: {words or phrases characteristic of this source}
- Sentence style: {short punchy / long elaborate / mixed}

### Unique Insights
{What this specific source contributes to the research — something not found elsewhere}

---

## Source 2: "{Title or Headline}"
...
```

### `pattern-analysis.md`

```markdown
# Pattern Analysis: Web Research — {topic/domain}

Analyzed: {YYYY-MM-DD}
Sample size: {N} sources across {N} domains
Period covered: {earliest date} to {latest date}

## Executive Summary
{3-5 sentences on the dominant patterns, contradictions, and insights found}

## Content Patterns

### Topic Clusters
| Topic | Sources Covering It | Consensus or Debate? |
|-------|-------------------|----------------------|
| {topic 1} | 7 of 10 | Strong consensus — all say X |
| {topic 2} | 4 of 10 | Debate — 2 say X, 2 say Y |

### Structural Patterns
- Most common content format: {listicle / framework / narrative / how-to / opinion}
- Average depth: {superficial — 500 words / medium — 1500 words / deep — 3000+ words}
- Evidence quality: {data-rich with citations / anecdotal / mixed}

### Argument Patterns
- Claims everyone agrees on (safe territory):
  1. {claim}
  2. {claim}
- Claims with disagreement (opportunity for unique angle):
  1. {claim} — Side A says X, Side B says Y
  2. {claim} — Side A says X, Side B says Y

## Language Patterns

### Vocabulary Across Sources
Words and phrases that appear across multiple high-quality sources:
- "{phrase}" — used in {N} sources, signals {what}
- "{phrase}" — used in {N} sources, signals {what}

### Tone Distribution
- Authoritative/Expert: {N} of {total} sources
- Conversational/Accessible: {N} of {total} sources
- Data-Driven/Analytical: {N} of {total} sources

## Gaps and Opportunities

Topics that are under-covered or absent from top sources:
1. **{gap}**: Why it matters and how the crew could own this space
2. **{gap}**: Why it matters and how the crew could own this space

---

## Source Quality Assessment

| Source | Depth | Evidence Quality | Originality | Overall |
|--------|-------|-----------------|-------------|---------|
| {source 1} | High | Data-rich | High | ★★★★★ |
| {source 2} | Medium | Anecdotal | Medium | ★★★ |
| {source 3} | Low | None | Low | ★ |

---

## Recommendations for Crew

Five actionable recommendations based on web research patterns:

1. **[Recommendation]**: {Details with source references}
2. **[Recommendation]**: {Details with source references}
3. **[Recommendation]**: {Details with source references}
4. **[Recommendation]**: {Details with source references}
5. **[Recommendation]**: {Details with source references}
```

---

## Smart Recommendations

Sherlock-Web recommends extraction depth based on crew type:

- **Content creation crews**: Focus on topic clusters + language patterns. Extract hooks, CTAs, and structural patterns from top-performing content in the niche. 3-5 sources per query.
- **Strategy/analysis crews**: Deep extraction — 5-8 sources per query. Focus on competitive gaps, argument patterns, and evidence quality.
- **Technical/research crews**: Prioritize documentation sites and authoritative sources. Extract frameworks, methodologies, and technical vocabulary.
- **General crews**: Balanced — 3-5 sources, mix of breadth and depth.

## Timeout and Error Handling

- Maximum time per web research session: 15 minutes. Web search + fetch is faster than browser automation.
- If `web_fetch` fails for a URL (paywall, 403, timeout), skip and note in raw-content.md: "[Skipped: URL inaccessible — {reason}]"
- If search returns no results, broaden the query once. If still empty, report the gap — don't fabricate.
- **Never fabricate data. Never declare success over empty results.**
