# Contributing to SEO + AEO + GEO Kit

This repository is a library of Claude Code skills for SEO, AEO and GEO work. There is no single
app to run - each top-level folder with a `SKILL.md` is an independent, loadable skill.

## Before doing anything

1. Read `system/routing.md` - it maps tasks to the right skill(s) and shows how skills fan out to
   each other (e.g. a site audit delegates to several narrower skills).
2. Read `system/quality-gates.md` - the checks a deliverable must pass before it's considered done.
3. Read `system/editorial-standard.md` and `system/evidence-policy.md` for voice and sourcing rules
   shared across the content skills.

## Working on a skill

- Treat `SKILL.md` frontmatter (`name`, `description`, `argument-hint`) as the contract for when
  that skill should trigger - keep it accurate when editing.
- Scripts under a skill's `scripts/` folder should take config/CLI arguments rather than hardcoded
  values - see `scripts/*.example.json` in the repo root for the pattern used by the shared Google
  data pipeline.
- Don't hardcode project-, client- or site-specific names, keys, or IDs into a skill. If a skill
  needs per-project config, read it from a file the caller provides (see `google_data.py`'s
  `sites.json` convention).

## Adding a new skill

Give it a `SKILL.md` with the standard frontmatter, add it to `system/skill-registry.json` and
`system/skill-routing.csv`, and note where it fits in `system/routing.md`.

## Checks before you open a PR

```bash
npm test            # unit and integration tests
npm run validate    # skills, registry, links, leaks
claude plugin validate .
```

The skills live in `skills/`. Shared helpers are in `scripts/`; bundled upstream tooling is in `vendor/`.
