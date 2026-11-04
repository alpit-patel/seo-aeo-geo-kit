---
name: seo-voice
description: >
  VEO, voice engine optimization: make a business findable and correctly answered when people ask
  Gemini, Google Assistant, Siri, Alexa, ChatGPT voice or other voice assistants. Covers spoken-answer
  copy, local entity data (Business Profile, Apple Business Connect, Bing Places), click-to-call,
  schema, speakable (news only), and measuring conversational queries from Search Console. Use when
  the user says "voice search", "VEO", "voice engine optimization", "Alexa/Siri/Gemini voice", or
  asks how a business shows up in spoken answers. Not for building AI voice agents (that is a
  product/service task, not search).
metadata:
  author: Alpit Patel
  version: "1.0.0"
  category: seo
  verified: "2026-09-30"
  maintainer: "Alpit Patel"
  maintainer_url: "https://github.com/alpit-patel/seo-aeo-geo-kit"
---

# VEO: voice engine optimization

Voice answers are a delivery format, not a separate index. A voice assistant answers from the same
sources as its text version: a search index, local business listings, and (for LLM assistants) web
retrieval. VEO is therefore SEO + AEO + local SEO, with three extra constraints: the answer is heard
once, there is usually one answer not ten, and the next step is often a call or directions.

## Verified facts (check again if older than 90 days)

| Fact | Source | Checked |
| --- | --- | --- |
| Gemini fully replaced Google Assistant on Android phones, tablets, Wear OS, headphones and Android Auto; the switch-back option was removed. Nest/Home speakers and displays still run Google Assistant. | 9to5Google, 2026-09-28 | 2026-09-30 |
| Google `speakable` structured data is BETA, used by Google Assistant only for topical **news** queries, only for US users with Google Home devices set to English. Not relevant for service or product pages. | developers.google.com/search/docs/appearance/structured-data/speakable (updated 2026-09-08) | 2026-09-30 |
| Google says its AI features rely on core ranking, retrieval from the index and query fan-out; no special markup is needed. | developers.google.com/search/docs/fundamentals/ai-optimization-guide | 2026-09-30 |
| Apple Business Connect: businesses claim their location on Apple Maps. Apple's page does not state Siri use; do not claim it. | business.apple.com | 2026-09-30 |
| ChatGPT search results depend on `OAI-SearchBot` access; voice mode in ChatGPT uses the same assistant. The voice part is an inference, not documented. | developers.openai.com/api/docs/bots | 2026-09-29 |

Do not quote "X% of searches are voice" figures. The widely repeated ones (for example "50% of
searches will be voice by 2020") have no traceable primary study. If a number is needed, find a dated
primary source or say it is not measured.

## Workflow

1. **Inspect** the site (built HTML) and its local listings. Run
   `python scripts/voice_audit.py <built-site-dir> [--gsc projects/<p>/reports/google-data-<date>.json]`.
2. **Local entity data first** (biggest lever for "near me" and "call ..." requests):
   Google Business Profile complete (categories, services, hours, holiday hours, phone, booking link);
   Apple Business Connect claimed; Bing Places claimed (Copilot and Bing answers); name, address and
   phone identical everywhere. Route to `seo-local` / `seo-maps` for the audit.
3. **Spoken-answer copy** on pages that answer real questions (AEO rules, plus):
   - question as the heading, in the words people say ("how much does a dental implant cost near me");
   - first answer sentence stands alone when read aloud, roughly 20 to 45 words;
   - no answer that only makes sense with a table, a chart or "see above";
   - numbers said the way people say them ("from 250 dollars", "about two weeks");
   - brand and product names that are easy to pronounce, spelled consistently.
4. **Action paths**: a visible `tel:` link, a booking link, hours and service area on the page;
   Organization or LocalBusiness schema with `telephone`, `address`, `openingHoursSpecification`,
   `areaServed` where true (route to `seo-schema`). Speakable only for news publishers (see facts).
5. **Crawler access**: Googlebot, Bingbot, OAI-SearchBot, PerplexityBot allowed (route to `geo-crawlers`).
6. **Measure**: there is no voice report in Search Console. Use proxies and say they are proxies:
   - share of GSC impressions from conversational queries (question words or 6+ natural words),
     from `scripts/google_data.py` output;
   - Business Profile calls and direction requests;
   - GA4 `click_to_call` or equivalent key events, and AI-assistant referrals.
7. **Human editorial pass and QA** using `system/quality-gates.md`.

## Gates

- No fabricated voice statistics; every figure has a primary source and date.
- No speakable markup on non-news pages.
- Spoken answers are true on the page and match the schema.
- Local data is real: no fake addresses or service areas.

## Output

A short VEO report: local-listing gaps, pages with question headings but no stand-alone answer,
pages missing a call path, schema gaps, conversational-query share and its trend, and a prioritized
fix list (impact x confidence / effort).

<!-- SEO + AEO + GEO Kit, maintained by Alpit Patel: https://github.com/alpit-patel/seo-aeo-geo-kit -->
