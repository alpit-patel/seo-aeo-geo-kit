# Third-party notices

The kit is curated and maintained by Alpit Patel. The original work in it (the auditor CLI, installer, validator, the `seo-voice` skill, routing and quality system, templates and integration) is Copyright (c) 2026 Alpit Patel, MIT. Every skill carries `maintainer: "Alpit Patel"` in its metadata. The kit also combines material with skills and tooling from open-source projects, all released under the MIT License. Each skill folder keeps its own license file where the upstream project provided one. Thank you to the original authors.

| Copyright / author | Skills |
| --- | --- |
| No author recorded in the file. Same family as the `blog` skill by AgriciDaniel, and `blog-chart`, `blog-factcheck` and `blog-strategy` reference [claude-blog](https://github.com/AgriciDaniel/claude-blog). `blog-discourse` is adapted from the methodology of `last30days-skill` (Matt Van Horn, MIT) | `blog-analyze`, `blog-audit`, `blog-brand`, `blog-brief`, `blog-calendar`, `blog-cannibalization`, `blog-chart`, `blog-decay`, `blog-discourse`, `blog-factcheck`, `blog-geo`, `blog-outline`, `blog-persona`, `blog-repurpose`, `blog-rewrite`, `blog-schema`, `blog-seo-check`, `blog-strategy`, `blog-style`, `blog-taxonomy`, `blog-write` |
| No author recorded in the file. These came from the vendored [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) project (Copyright (c) 2026 Zubair Trabzada, MIT) | `geo`, `geo-audit`, `geo-brand-mentions`, `geo-citability`, `geo-compare`, `geo-content`, `geo-crawlers`, `geo-llmstxt`, `geo-platform-optimizer`, `geo-proposal`, `geo-prospect`, `geo-report`, `geo-report-pdf`, `geo-schema`, `geo-technical` |
| No author recorded in the file. They follow the structure of [marketingskills](https://github.com/coreyhaines31/marketingskills) by Corey Haines (MIT), and several link to it directly. `product-marketing` adapts material from [skills-marketing-library](https://github.com/retieedra-profound/skills-marketing-library) (MIT) | `cold-email`, `customer-research`, `marketing-psychology`, `offers`, `pricing`, `product-marketing`, `prospecting`, `reverse-engineer-marketing`, `sales-enablement` |
| Copyright (c) 2026 AgriciDaniel | `seo`, `seo-agentic`, `seo-audit`, `seo-backlinks`, `seo-competitor-pages`, `seo-content`, `seo-dataforseo`, `seo-geo`, `seo-google`, `seo-hreflang`, `seo-image-gen`, `seo-images`, `seo-local`, `seo-maps`, `seo-page`, `seo-plan`, `seo-programmatic`, `seo-schema`, `seo-sitemap`, `seo-technical` |
| Author: AgriciDaniel | `blog`, `blog-audio`, `blog-cluster`, `blog-flow`, `blog-google`, `blog-image`, `blog-notebooklm`, `seo-cluster`, `seo-drift`, `seo-flow`, `seo-sxo` |
| Copyright (c) 2026 Guillaume Meyer and contributors | `clean-user-facing-text`, `remove-ai-marks` |
| Copyright (c) 2025 Corey Haines | `cro` |
| Copyright (c) 2025 Siqi Chen | `humanizer` |
| Copyright (c) 2026 puneetindersingh | `seo-content-brief` |
| Alpit Patel (original to this kit) | `seo-voice` |

## Vendored projects

- `vendor/geo-seo-claude/` is from [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude), Copyright (c) 2026 Zubair Trabzada, MIT. Its license is in `vendor/geo-seo-claude/LICENSE`.

If you are an author listed here and want a change to attribution, please open an issue.

## Bundled helper tooling

- `scripts/` (the Python helpers, launcher and runtime other than the seven genericized scripts listed in the README), `agents/`, `schema/`, `data/`, `requirements.txt` and the `seo-ecommerce` skill are from [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) v2.5.0 (commit `6be93f4`), Copyright (c) 2026 agricidaniel, MIT. The full license text is in `LICENSES/claude-seo.txt`. The `seo-ecommerce` skill also credits its original author, Matej Marjanovic, in its metadata.
- Not included from that project: `hooks/` (they run code automatically on file edits) and `extensions/` (optional third-party MCP servers).
