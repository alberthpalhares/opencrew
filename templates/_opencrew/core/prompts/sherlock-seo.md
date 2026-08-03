# Sherlock — SEO / Keywords Extractor

Load `sherlock-shared.md` before using this extractor.

This file contains the SEO and keyword research extraction process. The Architect loads this file (alongside `sherlock-shared.md`) when the investigation requires search trend analysis, keyword discovery, or content-gap identification.

This extractor uses `web_search` native tool — no browser automation needed. For Google Trends data specifically, it fetches trend pages; for keyword volume estimation, it searches for public keyword data and industry reports.

---

## When to Use

The Architect dispatches Sherlock-SEO when:

- The crew's purpose involves content marketing, SEO, or organic growth
- The briefing mentions search visibility, keyword targeting, or content optimization
- The crew needs to understand what people are searching for in a given domain
- The user wants data-driven content planning (not just creative intuition)
- A content crew needs topic clusters and keyword maps for editorial planning

---

## Extraction Process

### Step 1: Keyword Discovery

Based on the crew's domain (from `discovery.yaml`), generate seed keywords and expand:

1. **Seed keywords** — Extract from crew briefing: what product/service/topic is the content about?
   - Example: crew for "SaaS onboarding" → seeds: "user onboarding", "SaaS retention", "product adoption"

2. **Search expansion** — For each seed, run `web_search` with discovery queries:
   - `"{seed}" related topics`
   - `"{seed}" trends 2026`
   - `"{seed}" questions people ask`
   - `"what is {seed}"` (triggers "People Also Ask" results)

3. **Collect related terms** — From search results, extract:
   - Related keywords mentioned in titles and meta descriptions
   - Question patterns (how to X, why is Y, what is Z)
   - Long-tail variations (specific, multi-word phrases)

### Step 2: Search Intent Analysis

For the top 5-8 keywords discovered, classify search intent:

| Keyword | Intent | Volume Signal | Competition Signal |
|---------|--------|---------------|-------------------|
| "{keyword}" | Informational | High — appears in multiple sources | Medium — 3 competitors targeting it |
| "{keyword}" | Commercial | Medium | High — 8+ competitors |
| "{keyword}" | Transactional | Low | Low — underserved |

**Intent types:**
- **Informational**: User wants to learn something ("how to", "what is", "guide")
- **Commercial**: User is comparing options ("best", "vs", "review")
- **Transactional**: User wants to take action ("buy", "sign up", "download", "pricing")
- **Navigational**: User wants to find a specific site/brand

### Step 3: Content Gap Analysis

Identify topics with high search interest but weak existing content:

1. **Search for major topics** in the domain: `"{topic}" guide` and `"{topic}" best practices`
2. **Assess top results** — are they comprehensive? recent? well-structured?
3. **Identify gaps**:
   - Topics with only thin/outdated content (opportunity: create the definitive guide)
   - Topics with content but no clear structure (opportunity: create the framework)
   - Topics with content but no visual/examples (opportunity: create the visual guide)
   - Questions with no single authoritative answer (opportunity: own the answer)

### Step 4: Trend Detection

Search for signals that indicate rising or falling interest:

1. **Rising trends** — `"{domain}" growing trend` or `"{domain}" 2026 predictions`
2. **Seasonal patterns** — `"{domain}" {month}` or `"when do people search for {domain}"`
3. **Technology shifts** — `"{domain}" AI` or `"{domain}" automation` (what's changing the field)
4. **Platform migration** — `"{domain}" moving from X to Y` (where is the audience going)

### Step 5: Competitive Keyword Landscape

When the crew has identified competitors (from discovery or web research):

1. Search for competitor content: `site:{competitor.com} {topic}`
2. Identify keywords they rank for (visible from search result snippets)
3. Find keywords they DON'T target → these are the crew's opportunities
4. Map their content structure: what formats do they use? how deep do they go?

---

## Output

### `raw-content.md`

```markdown
# Raw Content: SEO Research — {domain/topic}

Investigated: {YYYY-MM-DD}
Seed keywords: {list}
Keywords discovered: {N total}
Search engines used: web_search (native)

---

## Keyword Map

### Primary Keywords (high volume, high relevance)
| Keyword | Intent | Volume Signal | Competition | Opportunity Score |
|---------|--------|---------------|-------------|-------------------|
| {keyword} | {intent type} | {high/medium/low} | {high/medium/low} | {★-★★★★★} |

### Long-Tail Keywords
| Keyword | Intent | Notes |
|---------|--------|-------|
| {long-tail phrase} | {intent type} | {why this matters} |

### Question Keywords
| Question | Search Context | Content Opportunity |
|----------|---------------|-------------------|
| "{question}?" | {when would someone search this} | {what content would answer it} |

---

## Content Gap Analysis

### Underserved Topics
1. **{topic}**: Current coverage is {thin/outdated/nonexistent}. Top results: {URLs}. Gap: {description}.
2. **{topic}**: Current coverage is {thin/outdated/nonexistent}. Top results: {URLs}. Gap: {description}.

### Over-Served Topics (avoid or differentiate)
1. **{topic}**: {N} strong results already. To compete: {what unique angle would be needed}.

---

## Trend Signals

| Trend | Direction | Evidence | Relevance to Crew |
|-------|-----------|----------|-------------------|
| {trend name} | ↗️ Rising / ↘️ Declining / → Stable | {source or signal} | {why this matters for the crew} |
```

### `pattern-analysis.md`

```markdown
# Pattern Analysis: SEO Research — {domain/topic}

Analyzed: {YYYY-MM-DD}
Keywords analyzed: {N}
Content gaps identified: {N}
Trends detected: {N}

## Executive Summary
{3-5 sentences on the search landscape — what people are looking for, what's
missing, and where the crew should focus}

## Search Demand Pattern
- Total addressable search volume: {estimate — high/medium/low}
- Intent distribution: {X}% informational, {Y}% commercial, {Z}% transactional
- Seasonality: {present/absent, with patterns if any}
- Trend direction: {rising/stable/declining} for core topics

## Content Opportunity Matrix

| Topic | Demand | Current Supply | Opportunity |
|-------|--------|---------------|-------------|
| {topic} | High | Weak | 🔴 Build now — own this space |
| {topic} | High | Strong | 🟡 Differentiate with unique angle |
| {topic} | Medium | Weak | 🟢 Good supplemental content |
| {topic} | Low | Strong | ⚪ Skip |

## Keyword-to-Content Mapping

For each primary keyword, the recommended content format:

1. **"{keyword}"** → {blog post / guide / comparison / tool / landing page}
   - Angle: {suggested angle}
   - Supporting keywords: {related terms to include}
   - Estimated depth: {word count or scope}

2. **"{keyword}"** → {format}
   - Angle: {suggested angle}
   - Supporting keywords: {related terms}
   - Estimated depth: {word count or scope}

## Recommendations for Crew

Five SEO-informed content recommendations:

1. **[Recommendation]**: {Details — what to create, why, expected impact}
2. **[Recommendation]**: {Details}
3. **[Recommendation]**: {Details}
4. **[Recommendation]**: {Details}
5. **[Recommendation]**: {Details}
```

---

## Smart Recommendations

- **Blog/SEO crews**: Full extraction — keyword map + content gaps + competitive landscape. 10+ keywords.
- **Social media crews**: Light extraction — trending topics and question patterns only. Skip competitive keyword analysis.
- **Strategy crews**: Focus on content gaps and trend signals. Use as input for editorial planning.
- **General crews**: Top 5 keywords + main content gaps only. Keep it focused.

## Limitations

- This extractor uses `web_search`, not direct API access to Google Trends, SEMrush, or Ahrefs. Volume and competition signals are estimates based on visible search result patterns — they are directional, not precise.
- For exact search volumes, the user would need API access to a keyword tool (can be added as a skill later).
- Google Trends data is fetched from publicly visible trend pages — availability varies by region and topic.

## Timeout and Error Handling

- Maximum time: 15 minutes
- If a keyword returns no useful results, mark as "insufficient data" and move on
- If trend data is unavailable for a topic, note the gap
- **Never fabricate search volumes or trend data.**
