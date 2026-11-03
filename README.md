# SEO + AEO + GEO Skills

An end-to-end SEO, AEO (Answer Engine Optimization) and GEO (Generative Engine Optimization) skill
library for [Claude Code](https://claude.com/claude-code) and the Claude Agent SDK. Each skill is a
self-contained `SKILL.md` (plus any helper `scripts/`, `references/`, or `agents/`) that Claude Code
loads on demand when a matching task comes up.

## What's in here

Roughly 85 skills, organized by category:

- **`blog`, `blog-*`** - end-to-end blog production: briefs, outlines, writing, rewriting, style,
  taxonomy, cannibalization checks, decay detection, calendars, repurposing, audio/notebook exports,
  charts, schema, fact-checking, discourse/persona tuning, and a Google-data-informed content flow.
- **`seo`, `seo-*`** - full-site and single-page audits, technical SEO, Core Web Vitals, schema,
  sitemaps, hreflang, content quality (E-E-A-T), backlinks, image generation planning, local/maps SEO,
  competitor pages, programmatic SEO, content briefs, cluster/topic mapping, DataForSEO integration,
  drift monitoring, SXO (search experience), and AI-agent/"agentic" crawl readiness.
- **`seo-geo`, `geo-seo-claude/`** - GEO specialists: AI crawler access, `llms.txt`, passage-level
  citability, brand-mention tracking across AI answers, platform-specific tuning for Google AI
  Overviews / ChatGPT / Perplexity / Gemini / Copilot, GEO audits, proposals, and reporting.
- **Content & growth support** - `cro`, `offers`, `pricing`, `product-marketing`,
  `customer-research`, `marketing-psychology`, `reverse-engineer-marketing`, `sales-enablement`,
  `prospecting`, `cold-email`.
- **Editorial hygiene** - `humanizer`, `remove-ai-marks`, `clean-user-facing-text`.

## Orchestration layer

- [`system/routing.md`](system/routing.md) - which skill to reach for, and in what order.
- [`system/quality-gates.md`](system/quality-gates.md) - the checks that must pass before anything
  ships.
- [`system/editorial-standard.md`](system/editorial-standard.md) / [`system/evidence-policy.md`](system/evidence-policy.md)
  - voice, sourcing and claim-verification rules shared across skills.
- [`system/skill-registry.json`](system/skill-registry.json) / [`system/skill-routing.csv`](system/skill-routing.csv)
  - machine-readable skill index, usable for building your own orchestrator or dashboard.
- [`templates/`](templates/) - reusable content-brief, project-context, and QA-report templates.
- [`scripts/`](scripts/) - standalone Python helpers (Search Console + GA4 pulls, autocomplete gap
  analysis, AI-markup scanning, prose-dash cleanup, voice/schema auditing). Each takes a config file
  (see the `*.example.json` files) instead of hardcoded sites - copy one, drop in your own URLs and
  GA4 property IDs, and point the scripts at it. Set `GOOGLE_DATA_KEY` to your own Google service
  account JSON key path before running the Google-data scripts.

## Using this library

**As a Claude Code plugin / skill set**: copy the skill folders you want into your project's
`.claude/skills/` directory, or point a Claude Code plugin manifest at this repo. Every skill's
frontmatter (`name`, `description`, `user-invocable`, `license`) follows the standard Claude Code
skill format, so Claude Code picks them up automatically once they're on the skill path.

**Picking skills**: start with `system/routing.md` to see how the skills call into each other
(e.g. a full `seo-audit` fans out to `seo-technical`, `seo-content`, `seo-schema`, `seo-local`, etc.).
Most skills work standalone too - read a `SKILL.md` to see its exact trigger and process.

## License

MIT at the repo root (see [`LICENSE`](LICENSE)). Several individual skill folders carry their own
`LICENSE`/`LICENSE.txt` from their original upstream source - those apply to that folder specifically
and are left intact.
