# Sherlock — Trends Extractor

Load `sherlock-shared.md` before using this extractor.

This file contains the trending topics and cultural signals extraction process. The Architect loads this file (alongside `sherlock-shared.md`) when the investigation requires understanding what's trending now — what people are talking about, what's going viral, and what cultural moments the crew can tap into.

This extractor uses `web_search` and `web_fetch` native tools — no browser automation needed.

---

## When to Use

The Architect dispatches Sherlock-Trends when:

- The crew creates content that needs to feel current and culturally relevant
- The briefing requires "what's trending" or "what's viral right now"
- The user wants content that rides cultural waves (newsjacking, trendjacking)
- A content crew needs angle ideas grounded in current conversations
- The crew's audience is on platforms where trend velocity matters (Twitter/X, TikTok, Instagram)

---

## Trend Sources

Sherlock-Trends searches across multiple trend surfaces:

| Source | Method | What It Captures |
|--------|--------|-----------------|
| Twitter/X trending | `web_search "trending twitter {date}"` or `"{domain} twitter discussion"` | Real-time conversation spikes |
| GitHub trending | `web_search "github trending {domain}"` or `web_fetch github.com/trending` | Developer/tech trending repos and topics |
| Product Hunt | `web_search "product hunt trending {domain}"` or `web_fetch producthunt.com` | New product launches, tech trends |
| Hacker News | `web_search "hacker news {domain}"` or `web_fetch news.ycombinator.com` | Tech community discussions |
| Reddit | `web_search "site:reddit.com {domain} trending"` | Community discussions by subreddit |
| Google Discover / News | `web_search "{domain} news today"` | News cycle peaks |
| YouTube trending | `web_search "{domain} viral video"` or `"{domain} trending youtube"` | Video content trends |
| Industry newsletters | `web_search "{domain} newsletter roundup 2026"` | Curated weekly trends |
| Conference talks | `web_search "{domain} conference 2026 talks"` | What experts are presenting now |

---

## Extraction Process

### Step 1: Broad Trend Scan

Run parallel searches across 3-4 trend surfaces most relevant to the crew's domain:

1. **News/current events**: `"{domain}" news {current month} 2026`
2. **Social conversation**: `"{domain}" twitter discussion` or `"people talking about {domain}"`
3. **Community pulse**: `"site:reddit.com {domain}"` or `"site:news.ycombinator.com {domain}"`
4. **Product/tool trends**: `"new {domain} tools 2026"` or `"best {domain} software 2026"`

Collect the top 5-8 signals from each surface. A "signal" is:
- A topic mentioned by 3+ independent sources in the last 30 days
- A term or phrase appearing in multiple headlines
- A tool/product/method getting multiple mentions
- A debate or controversy with active discussion

### Step 2: Signal Validation

Not every trending topic is worth acting on. Validate each signal:

1. **Velocity**: Is interest accelerating or already fading?
   - Search for the topic + date range: `"{topic}" after:2026-07-01`
   - Check if mentions are increasing week-over-week

2. **Relevance**: Does this trend connect to the crew's domain?
   - Direct hit: trend IS about the domain → high priority
   - Adjacent: trend touches the domain tangentially → creative angle needed
   - Noise: trend is unrelated → skip

3. **Longevity**: Is this a flash in the pan or a lasting shift?
   - News cycle (24-48h): act fast or skip
   - Seasonal (repeats annually): plan ahead
   - Structural (permanent change): highest value — build strategy around it

4. **Audience overlap**: Would the crew's target audience care about this?
   - Direct: audience is actively discussing this → high priority
   - Peripheral: audience might find it interesting → medium
   - Irrelevant: audience doesn't care → skip

### Step 3: Angle Generation

For validated trends, brainstorm content angles:

1. **Newsjacking**: How can the crew add its perspective to a breaking story?
   - "X just happened — here's what it means for {audience}"
   - "The {domain} perspective on {trend}"

2. **Educational**: How can the crew explain the trend to its audience?
   - "What {trend} means for {audience} in 2026"
   - "5 things {audience} needs to know about {trend}"

3. **Contrarian**: What's the opposite take?
   - "Why {trend} won't matter for {audience}"
   - "The {trend} hype — what nobody is talking about"

4. **Tactical**: How can the audience act on this trend?
   - "How to use {trend} for {outcome}"
   - "{Steps} to take advantage of {trend} today"

### Step 4: Trend Timeline

Map the trend lifecycle to help the crew time its content:

```
Trend: {trend name}
├── Emerging (now-2 weeks ago): first mentions appearing
├── Rising (now): accelerating discussion, media picking it up ← BEST TIME TO ACT
├── Peak (1-2 weeks from now): maximum attention, saturated coverage
├── Declining (3-4 weeks): interest fading, late movers
└── Evergreen (ongoing): settles into background knowledge
```

For each trend, recommend TIMING: should the crew act now (news cycle), plan for next week (rising trend), or incorporate into long-term strategy (structural shift)?

---

## Output

### `raw-content.md`

```markdown
# Raw Content: Trend Research — {domain}

Investigated: {YYYY-MM-DD}
Trend surfaces scanned: {list — Twitter/X, Reddit, GitHub, Product Hunt, Hacker News, etc.}
Total signals detected: {N}
Validated trends: {N}

---

## Trend 1: "{Trend Name}"

**Source:** First detected on {platform/url}
**Velocity:** {accelerating / stable / declining}
**Relevance:** {direct hit / adjacent / noise}
**Longevity:** {news cycle / seasonal / structural}

### Signal Evidence
- {Source 1}: "{headline or excerpt}" — {date}
- {Source 2}: "{headline or excerpt}" — {date}
- {Source 3}: "{headline or excerpt}" — {date}

### Audience Connection
{Why the crew's audience would care about this — or why they wouldn't}

### Suggested Angles
1. **{Angle type}**: "{draft hook or headline}"
2. **{Angle type}**: "{draft hook or headline}"
3. **{Angle type}**: "{draft hook or headline}"

---

## Trend 2: "{Trend Name}"
...
```

### `pattern-analysis.md`

```markdown
# Pattern Analysis: Trend Research — {domain}

Analyzed: {YYYY-MM-DD}
Trends detected: {N}
Validated: {N} | Noise filtered: {N}
Trend lifecycle distribution: {N} emerging, {N} rising, {N} at peak, {N} declining

## Executive Summary
{3-5 sentences on the cultural moment — what's happening in {domain} right now,
where attention is flowing, and what the crew should act on immediately vs.
incorporate long-term}

## Trend Map

### Act Now (rising, high relevance, <1 week window)
| Trend | Angle | Content Urgency | Expected Shelf Life |
|-------|-------|----------------|---------------------|
| {trend} | {suggested angle} | 🔴 Immediate (24-48h) | 1 week |

### Plan This Week (rising, medium-high relevance)
| Trend | Angle | Content Urgency | Expected Shelf Life |
|-------|-------|----------------|---------------------|
| {trend} | {suggested angle} | 🟡 This week | 2-4 weeks |

### Build Into Strategy (structural, evergreen relevance)
| Trend | Strategic Implication | Timeline |
|-------|---------------------|----------|
| {trend} | {how this changes the crew's long-term approach} | Ongoing |

## Trending Vocabulary

Words and phrases gaining traction in {domain} discourse:

| Term | Meaning | Trend Direction | Adopt? |
|------|---------|----------------|--------|
| "{term}" | {definition in context} | ↗️ | Yes — audience expects it |
| "{term}" | {definition} | ↗️ | Cautiously — still niche |
| "{term}" | {definition} | ↘️ | No — already dated |

## Cultural Moments to Watch

Upcoming events, dates, and cultural moments the crew can plan content around:

| Date | Event / Moment | Relevance | Content Opportunity |
|------|---------------|-----------|-------------------|
| {date} | {event} | {why it matters for this audience} | {content idea} |

## Recommendations for Crew

1. **Act now — {trend}**: {specific content recommendation with angle and format}
2. **Plan ahead — {trend}**: {specific content recommendation}
3. **Ignore — {trend}**: {why this trending topic is a trap for this audience}
4. **Monitor — {trend}**: {keep watching but don't act yet}
5. **Build strategy — {trend}**: {long-term structural recommendation}
```

---

## Smart Recommendations

- **News/current events crews**: Full extraction — all 9 trend surfaces. Act on breaking trends. Emphasis on velocity and timing.
- **Content marketing crews**: Focus on structural trends + upcoming cultural moments. Less emphasis on real-time news.
- **Social media crews**: Focus on Twitter/X trends + Reddit communities + viral content patterns. Emphasis on angle generation.
- **Product/tech crews**: Focus on GitHub trending + Product Hunt + Hacker News. Emphasis on tool/methodology shifts.
- **General crews**: Top 5 trends across 3 surfaces. Quick validation pass. Actionable angles only.

## Limitations

- This extractor does not have API access to Twitter/X trending endpoints or TikTok's algorithm. Trend signals are from public search results and may lag real-time by hours.
- Virality prediction is inherently uncertain — this extractor provides directional signals, not guarantees.
- Regional trends may not surface in English-language searches. For geo-specific trends, add location qualifiers to search queries.

## Timeout and Error Handling

- Maximum time: 15 minutes
- If a trend surface returns no useful signals, skip it — not every domain has active trending conversations
- If trend data is thin, reduce scope: report what IS findable, note what isn't
- **Never fabricate trends or engagement numbers. "Insufficient data" is a valid finding.**
