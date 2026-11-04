# SEO + AEO + GEO Kit: instructions for AI coding agents

This repository is a library of **Agent Skills** (folders with a `SKILL.md`) for SEO, AEO (answer engines),
GEO (AI search) and VEO (voice), plus a page auditor CLI. It works in Claude Code, OpenAI Codex, OpenCode,
Google Antigravity and any tool that reads the Agent Skills format.

## If a user asks you to use these skills

1. Skills live in `skills/<name>/SKILL.md`. Read `system/routing.md` to pick the minimum set of skills for the task.
2. Before shipping any deliverable, apply `system/quality-gates.md` and `system/evidence-policy.md`. Never invent evidence, statistics or sources.
3. Helper scripts live in `scripts/`. Skills call them as `"${CLAUDE_PLUGIN_ROOT}/scripts/claude-seo" run <script>.py`.
   Outside Claude Code, treat `${CLAUDE_PLUGIN_ROOT}` as the root of this repository (or of the installed `_seo-aeo-geo-kit` folder).
   If a helper is unavailable or not set up, do the check manually and say the automated check was skipped.
4. One-time setup for the Python helpers (optional): `python scripts/runtime.py setup`.
5. Some skills mention "spawning an agent" or slash commands such as `/seo audit`. If your tool has no sub-agents or slash commands, perform the same steps yourself in order.

## Quick page audit (no setup, works anywhere Node 18+ runs)

```bash
npx seo-aeo-geo-kit audit https://example.com/page --summary
```

## Installing the skills into a tool

```bash
npx seo-aeo-geo-kit install --target codex --global       # also: opencode, antigravity, agents, claude
npx seo-aeo-geo-kit doctor                                # shows which tools are detected
```

## Working on this repository

- `npm test` runs unit and integration tests. `npm run validate` checks skills, registry, links and leaks.
- Do not edit upstream skills to remove author credits. Credits live in the skill's frontmatter, its `LICENSE` file and `THIRD_PARTY_NOTICES.md`.
- Keep `system/skill-registry.json` and `system/skill-routing.csv` in sync with `skills/` (the validator enforces this).
- Do not hardcode personal paths, client names, keys or IDs into any skill.
