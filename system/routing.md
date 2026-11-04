# SKILL ROUTING POLICY

Use this file as the routing matrix and `skill-registry.json` / `skill-routing.csv` for per-skill detail.
Pick the pipeline from the request, then run the minimum set of skills it needs.

## Pipelines

| Pipeline | Entry | Core skills / scripts |
| --- | --- | --- |
| Google data | every audit, refresh, plan and report | `scripts/google_data.py`, `seo-google` |
| SEO | any page, site or technical task | `seo` router, `seo-audit`, `seo-technical`, `seo-page`, `seo-schema`, `seo-content` |
| AEO (answer engines) | questions, FAQs, answer-first rewrites | `blog-outline`, `seo-content`, `seo-schema`, `blog-factcheck` |
| GEO (AI search) | AI visibility, citations, crawlers | `geo` router, `geo-audit`, `geo-crawlers`, `geo-citability`, `geo-brand-mentions`, `geo-schema` |
| VEO (voice and local) | voice search, spoken answers, local | `seo-voice`, `seo-local`, `seo-maps`, `scripts/voice_audit.py` |
| Editorial | every reader-facing output | `blog-factcheck` -> `humanizer` -> `remove-ai-marks` -> `clean-user-facing-text` |

## Default routing

- Unknown SEO task -> `seo`; unknown GEO task -> `geo`; voice -> `seo-voice`
- Site diagnosis -> Google data -> `seo-audit` + technical / GEO / VEO diagnostics
- New content -> research -> brief -> outline -> write -> fact-check -> SEO -> AEO -> GEO -> VEO -> editorial QA
- Refresh -> Google data -> decay/drift -> analyze -> fact-check -> rewrite -> QA
- Programmatic -> template design -> pilot -> QA -> controlled scale
- International -> localization -> multilingual -> locale audit -> hreflang
- Final copy -> humanizer -> remove-ai-marks -> clean-user-facing-text -> human review

## Routing principle

Minimum sufficient skills. Run pipelines one by one and show progress with the pipeline graph.
Never run all skills merely because they exist.
