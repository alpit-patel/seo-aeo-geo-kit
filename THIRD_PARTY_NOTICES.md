# Third-party notices

The original work in this kit (the auditor CLI, validator, launcher, routing and quality system, templates and integration) is Copyright (c) 2026 Alpit Patel, MIT. The kit also combines material with skills and tooling from open-source projects, all released under the MIT License. Each skill folder keeps its own license file where the upstream project provided one. Thank you to the original authors.

| Copyright / author | Skills |
| --- | --- |
| No author or license recorded in the skill (origin to be confirmed by the maintainer) | `blog-analyze`, `blog-audit`, `blog-brand`, `blog-brief`, `blog-calendar`, `blog-cannibalization`, `blog-chart`, `blog-decay`, `blog-discourse`, `blog-factcheck`, `blog-geo`, `blog-outline`, `blog-persona`, `blog-repurpose`, `blog-rewrite`, `blog-schema`, `blog-seo-check`, `blog-strategy`, `blog-style`, `blog-taxonomy`, `blog-write`, `cold-email`, `customer-research`, `geo`, `geo-audit`, `geo-brand-mentions`, `geo-citability`, `geo-compare`, `geo-content`, `geo-crawlers`, `geo-llmstxt`, `geo-platform-optimizer`, `geo-proposal`, `geo-prospect`, `geo-report`, `geo-report-pdf`, `geo-schema`, `geo-technical`, `marketing-psychology`, `offers`, `pricing`, `product-marketing`, `prospecting`, `reverse-engineer-marketing`, `sales-enablement` |
| Copyright (c) 2026 AgriciDaniel | `seo`, `seo-agentic`, `seo-audit`, `seo-backlinks`, `seo-competitor-pages`, `seo-content`, `seo-dataforseo`, `seo-geo`, `seo-google`, `seo-hreflang`, `seo-image-gen`, `seo-images`, `seo-local`, `seo-maps`, `seo-page`, `seo-plan`, `seo-programmatic`, `seo-schema`, `seo-sitemap`, `seo-technical` |
| Author: AgriciDaniel | `blog`, `blog-audio`, `blog-cluster`, `blog-flow`, `blog-google`, `blog-image`, `blog-notebooklm`, `seo-cluster`, `seo-drift`, `seo-flow`, `seo-sxo` |
| Copyright (c) 2026 Guillaume Meyer and contributors | `clean-user-facing-text`, `remove-ai-marks` |
| Copyright (c) 2025 Corey Haines | `cro` |
| Copyright (c) 2025 Siqi Chen | `humanizer` |
| Copyright (c) 2026 puneetindersingh | `seo-content-brief` |
| Author: SEO/AEO/GEO Skills Project | `seo-voice` |

## Vendored projects

- `vendor/geo-seo-claude/` is from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude), Copyright (c) 2026 Zubair Trabzada, MIT. Its license is in `vendor/geo-seo-claude/LICENSE`.

If you are an author listed here and want a change to attribution, please open an issue.

## Bundled helper tooling

- `scripts/` (the Python helpers, launcher and runtime other than the seven genericized scripts listed in the README), `agents/`, `schema/`, `data/`, `requirements.txt` and the `seo-ecommerce` skill are from [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) v2.5.0 (commit `6be93f4`), Copyright (c) 2026 agricidaniel, MIT. The full license text is in `LICENSES/claude-seo.txt`. The `seo-ecommerce` skill also credits its original author, Matej Marjanovic, in its metadata.
- Not included from that project: `hooks/` (they run code automatically on file edits) and `extensions/` (optional third-party MCP servers).
