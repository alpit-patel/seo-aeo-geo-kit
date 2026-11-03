---
name: geo-update
description: Pull the latest GEO-SEO skill updates from the upstream repository. Compares installed files against the latest release, shows what changed, and updates all skills, agents, scripts, and schema templates in place.
allowed-tools:
  - Bash
  - Read
  - Write
---

# GEO-SEO Update Skill

## Purpose

Updates the GEO-SEO git clone at `<kit-root>/geo-seo-claude` to the latest upstream version. Shows a summary of what changed before and after the update.

---

## Update Workflow

> **Local setup:** this toolkit is NOT installed under `~/.claude/`. It runs in place from
> the git clone at `<kit-root>/geo-seo-claude`. Skills live under `geo/` and `skills/` there, and scripts, templates, schema and agents
> are referenced by absolute `<kit-root>/geo-seo-claude/...` paths. The 5 agents are copied
> into `~/.claude/agents/` so Claude Code can spawn them. Do **not** run `install.sh` or copy
> anything into `~/.claude/`.

### Step 1: Check for Upstream Changes

```bash
REPO="<kit-root>/geo-seo-claude"
git -C "$REPO" fetch origin
git -C "$REPO" log --oneline HEAD..origin/main
git -C "$REPO" diff --stat HEAD origin/main
```

If there are no new commits, report "already up to date" and stop. Otherwise show the user
the commit list and the changed-file summary, noting new, modified and removed files.

### Step 2: Pull, Preserving Local Path Edits

The skill files carry local edits that point paths at D: (see "Local path edits" below). Keep them:

```bash
git -C "$REPO" stash push -m "local-paths"
git -C "$REPO" pull --ff-only origin main
git -C "$REPO" stash pop
```

If `stash pop` reports conflicts, or upstream reintroduced `~/.claude/skills/geo/` paths, resolve
by taking upstream's version and re-applying the path edits:

```bash
cd "$REPO"
git checkout HEAD -- geo skills ':!skills/geo-update'   # upstream versions, keep this local workflow
git checkout stash@{0} -- skills/geo-update/SKILL.md && git stash drop
R=<kit-root>/geo-seo-claude
sed -i "s#~/\.claude/skills/geo/templates/#$R/templates/#g" geo/SKILL.md skills/geo-report-pdf/SKILL.md
sed -i "s#python3 ~/\.claude/skills/geo/scripts/#python $R/scripts/#g" skills/*/SKILL.md geo/SKILL.md
sed -i "s#\`agents/geo-#\`$R/agents/geo-#g" geo/SKILL.md
grep -rn '~/\.claude/skills/geo' geo/SKILL.md skills/*/SKILL.md | grep -v geo-update
```

Any remaining hits from the last `grep` need to be repointed by hand to the matching `$R/...` path.

### Step 3: Resync Agents

```bash
cp "$REPO"/agents/geo-*.md ~/.claude/agents/
```

### Step 4: Update Python Dependencies

If `requirements.txt` changed in the pull:

```bash
python -m pip install -r "$REPO/requirements.txt" --quiet
```

Report any failures but do not treat them as fatal.

### Step 5: Report Results

Summarise the new commits, the files that changed, whether the path edits were re-applied, and
the dependency status. Remind the user that skill changes take effect in new sessions.

### Local path edits

| File | Edit |
|------|------|
| `geo/SKILL.md` | `agents/geo-*.md` and `~/.claude/skills/geo/templates/*` point to `<kit-root>/geo-seo-claude/...` |
| `skills/geo-report-pdf/SKILL.md` | template/CSS paths point to `<kit-root>/geo-seo-claude/templates/` |
| `skills/geo-schema/SKILL.md` | `fetch_page.py` points to `<kit-root>/geo-seo-claude/scripts/` |
| `skills/geo-update/SKILL.md` | this workflow (replaces upstream's `~/.claude` copy-install flow) |

---

## Important Notes

- **Never delete local files** that no longer exist upstream. The user may have customised them. List them and let the user decide.
- **Never modify `~/.claude/settings.json` or `~/.claude/settings.local.json`** — these are user configuration files, not part of the GEO-SEO toolkit.
- **If already up to date** (no diff), report that and skip the copy step.
- **Restart notice:** Remind the user that skill changes take effect in new Claude Code sessions. They should restart their session to use the updated skills.
