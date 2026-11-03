# AI Hygiene Pipeline: Provenance Cleaning + Humanization

Documents how `remove-ai-marks`, `clean-user-facing-text`, and `humanizer`
(added 2026-09-15) fit into the existing blog pipeline. All three are
third-party MIT-licensed skills, vendored into this library at the top level
(`remove-ai-marks/`, `clean-user-facing-text/`, `humanizer/`), matching this
library's flat per-skill folder convention. Original source checkouts are
kept at `_external-src/` for reference/updates.

| Skill | Source | Purpose | Dependency |
|---|---|---|---|
| `remove-ai-marks` | github.com/guillaumemeyer/watermarks-remover | Strips AI-provenance metadata (C2PA/Content Credentials, EXIF/XMP AI tags) from images and other files | Local HTTP service (stdlib Python, no third-party packages required for core cleaning) |
| `clean-user-facing-text` | same repo, lighter sibling skill | Text-only Unicode/invisible-character cleaning, self-contained | None — pure Python scripts, no service needed |
| `humanizer` | github.com/blader/humanizer | Rewrites AI-sounding prose against 25 named structural patterns (staged rhetoric, forced triads, hedge stacking, etc.) while preserving all facts | None — pure prompting skill |

## Where each one runs in the pipeline

```
blog-outline → blog-write ──┬─→ blog-image (Step 6.5: remove-ai-marks on every generated PNG/JPEG/WebP)
                             └─→ Phase 6 Quality Check, item 20: humanizer pass on final prose
                                       ↓
                             blog-seo-check / blog-analyze (Originality Gate + Pre-Publish Reminder)
                                       ↓
                                   publish

blog-rewrite → Phase 4l: phrase/word swap, then humanizer pass on the result
```

- **Images**: every PNG/JPEG/WebP that `blog-image` generates or edits gets
  `remove-ai-marks` run against it before delivery (see `blog-image/SKILL.md`
  Step 6.5). This is a hard requirement for that skill's own output, not
  optional — the generated file otherwise carries Gemini's embedded
  provenance metadata.
- **Prose**: `blog-write` (new draft) and `blog-rewrite` (existing post) both
  run `humanizer` as the last content step before quality checks. It sits
  downstream of this library's own phrase-list/em-dash/rhythm rules
  (`ai-slop-detection.md`, `editorial-heuristics.md`) — those catch
  word-level tells, humanizer catches the structural ones a word swap can't
  (e.g. "It's not just X, it's Y" framing, or a dramatic one-line closer
  repeated after every section).

## Setup required (one-time, not automated silently)

`remove-ai-marks` needs its HTTP service running. This session started it
locally in the background for testing:

```bash
python3 service/scripts/server.py --host 127.0.0.1 --port 8765
# from a checkout of guillaumemeyer/watermarks-remover — this library's copy
# is at _external-src/watermarks-remover/
```

It binds to loopback only, needs no third-party Python packages for the core
metadata-stripping path, and is stdlib-only. Optional deeper cleaning
(`exiftool`, `c2patool`, `qpdf`, `ghostscript` for PDF/advanced EXIF, pixel-
domain watermark removal) needs those external tools installed separately —
check `$WM/capabilities` before promising anything beyond basic metadata
stripping. Without them, cleaning still runs but is reported as best-effort.

**If the service isn't running when `blog-image` needs it**, the skill fails
visibly (tells the user the image is uncleaned and how to start the service)
rather than silently delivering an image that still carries AI-provenance
metadata, or claiming a cleaning result it didn't actually perform.

## Ethics note (carried from the source skill, apply the same way here)

`remove-ai-marks` is intended for **content you own** — hygiene/privacy, not
evading disclosure obligations you're actually bound by (a platform's ToS, a
publication's editorial policy, an academic integrity requirement). Do not
market a cleaned result as "proof of human authorship" — cleaning provenance
metadata says nothing about whether prose reads well or is accurate; those
are what `humanizer`, `ai-slop-detection.md`, and the Originality Gate in
`quality-scoring.md` actually check. If a specific use case looks like it's
about evading a disclosure requirement the user is actually bound by, flag it
before proceeding — see `remove-ai-marks/references/ethics.md`.

## Relationship to the existing Originality Gate

Stripping AI metadata and humanizing prose style are cosmetic/hygiene steps —
neither one satisfies the Originality Gate added to `quality-scoring.md`.
A post can be fully "clean" (no AI metadata, no AI writing tells) and still
fail the gate if it has no original data, first-hand experience, distinct
framework, or named expert analysis. Run both pipelines; they check different
things and neither substitutes for the other.
