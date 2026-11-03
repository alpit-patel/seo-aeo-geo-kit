# SKILL ROUTING POLICY

Use `MASTER_SEO_SOP.md` section 38 as the canonical 77-skill routing matrix, and the auto-routing
table in `<your-run-command>.md` (section 3) to pick pipelines from the request.

## Pipelines

| Pipeline | Entry | Core skills / scripts | SOP |
| --- | --- | --- | --- |
| Google data | every audit, refresh, plan and report | `scripts/google_data.py`, `seo-google` | 42, 29 |
| SEO | any page, site or technical task | `seo` router, `seo-audit`, `seo-technical`, `seo-page`, `seo-schema`, `seo-content` | 20, 40 |
| AEO | questions, FAQs, answer-first rewrites | plan-sheet gap audit, `blog-outline`, `seo-content`, `blog-factcheck` | 13 |
| GEO | AI visibility, citations, crawlers | `geo` router, `geo-audit`, `geo-crawlers`, `geo-citability`, `geo-brand-mentions`, `geo-schema` | 14-16, 43 |
| VEO | voice search, spoken answers, local | `seo-voice`, `seo-local`, `seo-maps`, `scripts/voice_audit.py` | 41, 23 |
| Editorial | every reader-facing output | `blog-factcheck` -> `humanizer` -> `remove-ai-marks` (service) -> `clean-user-facing-text` | 10-12, 39.5 |

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
