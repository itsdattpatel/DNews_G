# AI Prompts — AI World News Desk
*Version 1.0 · 2026-10-30*

---

## 1. Design Principles

- Every prompt produces **strict JSON only** — no prose, no markdown fences.
- The system prompt forbids code generation.
- Prompts are in `backend/src/ai/prompts.ts`; changing them requires no code change elsewhere.
- Batch size: up to 20 articles per request to stay within token limits on free tiers.
- If a provider returns malformed JSON, retry once with a stricter "return ONLY valid JSON" suffix, then mark articles as `ai_failed`.

---

## 2. Article Enrichment Prompt

### 2.1 System Prompt

```
You are a multilingual news analyst. You receive a JSON array of raw news articles.
For EACH article you must return a corresponding JSON object with exactly the fields
defined below. Do NOT produce any prose, markdown, or code. Return ONLY a valid
JSON array. Do NOT generate executable code of any kind.
```

### 2.2 User Prompt Template

```
Analyse the following {{COUNT}} news articles and return a JSON array of exactly
{{COUNT}} objects in the same order. Each object must have these exact keys:

{
  "article_index": <integer — same position as input>,
  "title_english": <string — translated headline in English>,
  "body_english":  <string — full article translated to English, preserve paragraphs>,
  "summary":       <string — 3–5 sentence neutral summary in English>,
  "keywords":      <string[] — 5 to 10 lowercase keywords, most important first>,
  "categories":    <string[] — one or more from:
                    ["World","Politics","Business","Tech","Science","Health",
                     "Sports","Entertainment","Environment","Crime","Animals"]>,
  "breaking_score": <integer 0–100 — urgency/novelty; 100 = unprecedented breaking news>,
  "species_tags":   <string[] — animal/plant species mentioned; empty array if none>,
  "location_tags":  <string[] — countries and cities mentioned>,
  "anchor_phrases": <array of objects [{"phrase": string, "sentence_index": integer}] — each phrase MUST appear verbatim in body_english and support summary sentence at sentence_index>
}

Input articles:
{{ARTICLES_JSON}}
```

### 2.3 Input Article Shape

```json
[
  {
    "article_index": 0,
    "title_original": "...",
    "body_original": "...",
    "language": "hi",
    "source_country": "India",
    "source_name": "The Hindu"
  }
]
```

### 2.4 Expected Output Shape (one element)

```json
{
  "article_index": 0,
  "title_english": "Floods hit southern India",
  "body_english": "Full translated article text ...",
  "summary": "Heavy rains caused severe flooding across Tamil Nadu. At least 30 people have been reported missing. Relief operations are underway with the army deployed to affected districts. Thousands of families have been moved to temporary shelters. The state government declared a red alert for three districts.",
  "keywords": ["flood","tamil nadu","india","relief","army","displacement","rainfall","alert","dam","rescue"],
  "categories": ["World","Environment"],
  "breaking_score": 82,
  "species_tags": [],
  "location_tags": ["India","Tamil Nadu","Chennai"],
  "anchor_phrases": [{"phrase": "Heavy rains caused severe flooding", "sentence_index": 0}]
}
```

---

## 3. Archive Chat Prompt

Used by POST /api/search when `use_ai: true`.

### 3.1 System Prompt

```
You are a news archive assistant. You have been given a set of news articles
retrieved from a local database using full-text search. Answer the user's question
using ONLY information from the provided articles. Do not fabricate facts.
If the answer is not in the articles, say so. Return plain English prose — no JSON,
no markdown, no code.
```

### 3.2 User Prompt Template

```
Question: {{QUERY}}

Retrieved articles ({{COUNT}} total):
{{ARTICLES_JSON}}

Answer the question using only information from the articles above.
Cite article titles where relevant (e.g., "According to [The Hindu, 2026-10-28]...").
```

---

## 4. Morning Briefing Prompt

### 4.1 System Prompt

```
You are a professional news anchor writing a 2-minute morning radio briefing.
Write in a warm, clear, neutral broadcast style. No markdown. Plain paragraphs.
```

### 4.2 User Prompt Template

```
Today is {{DATE}}. Here are the top {{COUNT}} stories from around the world,
ranked by breaking score:

{{STORIES_JSON}}

Write a 2-minute morning briefing (approximately 300 words) covering the most
important stories. Group geographically where natural. End with a brief,
optimistic closing line.
```

---

## 5. Story Clustering Similarity (Optional AI Path)

Only used if cosine similarity is insufficient (feature flag `ai_clustering: true`).

### 5.1 System Prompt

```
You are a deduplication engine. Given two news article summaries, decide if they
describe the same real-world event. Return ONLY valid JSON. No prose. No code.
```

### 5.2 User Prompt Template

```
Article A summary: "{{SUMMARY_A}}"
Article B summary: "{{SUMMARY_B}}"

Return exactly: { "same_event": true } or { "same_event": false }
```

---

## 6. Validation & Error Handling

| Condition | Action |
|-----------|--------|
| Response is not valid JSON | Retry once with stricter suffix; then mark `ai_failed` |
| `article_index` out of range | Skip that element; log warning |
| `spider_type` not in fixed set | Default to `"Reader"` |
| `breaking_score` outside 0-100 | Clamp to range |
| `categories` contains unknown string | Discard unknown value; keep valid ones |
| Batch partially fails | Save successful items; re-queue failures |

---

## 7. Token Budget (approximate)

| Provider | Free input limit | Batch strategy |
|----------|-----------------|----------------|
| Gemini Flash | 1M tokens/min (free) | Up to 20 articles, ~800 tokens each = ~16k in + ~8k out |
| Groq | 14,400 tokens/min (free) | Reduce to 5 articles per batch |
| Mistral | Per-plan | 10 articles per batch |
| Cerebras | Per-plan | 10 articles per batch |
| Ollama | Local — no limit | 5 articles per batch (RAM-dependent) |

Batch size is set per-provider in `config/ai-providers.ts`.
