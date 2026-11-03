# Backlink Quality: Toxic Patterns & Disavow Criteria

Reference for `seo-backlinks`'s toxic link detection step.

## High-risk patterns (flag immediately)

1. Links from known Private Blog Network (PBN) domains
2. 100% exact-match anchor text from a single domain
3. Links from penalized or deindexed domains
4. Mass directory submissions (50+ low-quality directory links in a short window)
5. Link farms — sites with thousands of outbound links per page, no editorial curation
6. Sitewide paid links (footer/sidebar link present across every page of a domain)
7. Links from domains with no organic traffic and no real content (auto-generated PBN tells)
8. Comment/forum spam links (auto-posted, irrelevant to the discussion)
9. Links from expired-domain abuse — a domain with unrelated backlink history repurposed to host thin/scraped content that then links out
10. Widget/badge link schemes ("Get this badge, link back to us") at scale
11. Negative-SEO-pattern link spikes — sudden burst of spammy links to a competitor's site, often with exact-match anchors, designed to trigger a manual action against them
12. Guest post networks selling placements purely for link equity with no editorial standard
13. Links embedded in scraped/copied content republished across many low-quality sites
14. Reciprocal link schemes at scale (A links to B, B links to A, repeated across a large coordinated set)
15. Links from sites in an unrelated language/geography with no topical connection to the business

## Medium-risk patterns (review manually, don't auto-flag as toxic)

16. Links from unrelated niches (a single off-topic link is normal; many is a signal)
17. Isolated reciprocal link pairs (normal in partnerships/sponsorships — pattern only matters at scale, see #14)
18. Links from thin-content pages (under ~100 words of surrounding context)
19. Excessive links from one otherwise-legitimate domain (50+ backlinks from a single site)
20. Nofollow-only linking domains at unusually high proportion (limited SEO value, not inherently toxic)
21. Links from sites with a declining traffic/authority trend (context matters — could be a legitimately struggling but real publisher)
22. Sponsored/affiliate links missing `rel="sponsored"`/`rel="ugc"` (a compliance issue, not necessarily a toxicity issue)
23. Old links from a domain that has since changed ownership/purpose (was legitimate when acquired, may not be now)

## Low-risk / usually fine (don't over-flag)

24. A moderate number of directory links from genuinely relevant, curated directories (Chamber of Commerce, industry associations)
25. Natural editorial mentions with branded or naked-URL anchors
26. Guest posts on topically relevant sites with genuine editorial review
27. Press mentions and news coverage links, even if unlinked/nofollow
28. Social media profile links (inherently nofollow on most platforms — expected, not a red flag)
29. A single off-topic link from an otherwise reputable domain

## Disavow criteria

Recommend disavowing a domain only when:

- It matches 2+ high-risk patterns (items 1–15), AND
- The link cannot be removed through outreach (site owner unreachable, or a
  clear negative-SEO/PBN pattern where outreach is pointless), AND
- The volume/pattern is large enough to plausibly trigger a manual action or
  algorithmic devaluation risk — a single low-authority spammy link rarely
  needs a disavow entry on its own

Disavow at the **domain level** (not individual URL) for PBN/spam domains
with many pages; disavow at the **URL level** only when isolated to specific
pages on an otherwise-legitimate domain (e.g. one spun-off spam subpage).

**Do not recommend mass disavowing without cause** — a disavow file is a
blunt instrument; overuse can remove link equity from borderline-but-fine
links and has limited-to-no positive effect if there's no actual manual
action or clear toxic pattern present. Google's own guidance is that most
sites never need to use the disavow tool.

## Scoring inputs

When calculating the Backlink Health Score's toxic-link-ratio factor, weight
by pattern severity: each high-risk pattern hit counts more than a medium-risk
one. A domain matching multiple high-risk patterns should dominate the score
more than several domains each matching one medium-risk pattern.
