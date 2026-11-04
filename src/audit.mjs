// Deterministic SEO + AEO + GEO page audit. Zero dependencies. Network is used only for the URL you pass
// (plus that site's robots.txt and llms.txt).
const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'anthropic-ai'];

const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || []).slice(2).find((x) => x !== undefined) ?? null;
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
const words = (s) => (s.match(/[\p{L}\p{N}'’-]+/gu) || []).length;

export function parsePage(html, url = '') {
  const body = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
  const text = strip(body);
  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  const metas = tags(html, 'meta');
  const meta = (n) => { const m = metas.find((t) => (attr(t, 'name') || attr(t, 'property') || '').toLowerCase() === n); return m ? attr(m, 'content') : null; };
  const links = tags(html, 'link');
  const canonical = (() => { const l = links.find((t) => /\bcanonical\b/i.test(attr(t, 'rel') || '')); return l ? attr(l, 'href') : null; })();
  const h = (n) => [...body.matchAll(new RegExp(`<h${n}\\b[^>]*>([\\s\\S]*?)<\\/h${n}>`, 'gi'))].map((m) => strip(m[1])).filter(Boolean);
  const imgs = tags(body, 'img');
  const anchors = [...body.matchAll(/<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi)].map((m) => m[2] ?? m[3]);
  let host = ''; try { host = new URL(url).hostname; } catch { /* local file */ }
  const abs = anchors.filter((a) => /^https?:\/\//i.test(a));
  const external = abs.filter((a) => { try { return host && new URL(a).hostname.replace(/^www\./, '') !== host.replace(/^www\./, ''); } catch { return false; } });
  const internal = anchors.filter((a) => a && !/^(#|mailto:|tel:|javascript:)/i.test(a) && !abs.includes(a)).concat(abs.filter((a) => !external.includes(a)));
  const ld = [];
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ld.push(JSON.parse(m[1])); } catch { /* invalid JSON-LD */ }
  }
  // Walk every nested node: types, sameAs, author and dates often live below the top level.
  const types = new Set(); let sameAsFound = false, authorFound = false, dateFound = false;
  const walkLd = (n) => {
    if (Array.isArray(n)) return n.forEach(walkLd);
    if (!n || typeof n !== 'object') return;
    for (const t of [].concat(n['@type'] || [])) if (typeof t === 'string') types.add(t);
    if (n.sameAs) sameAsFound = true;
    if (n.author) authorFound = true;
    if (n.datePublished || n.dateModified) dateFound = true;
    Object.values(n).forEach(walkLd);
  };
  walkLd(ld);
  const firstP = (() => { const m = body.match(/<\/h1>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i) || body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i); return m ? strip(m[1]) : ''; })();
  return {
    url, title, description: meta('description'), canonical, viewport: meta('viewport'), lang: (html.match(/<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z-]+)/i) || [])[1] || null,
    h1: h(1), h2: h(2), h3: h(3), imgs: imgs.length, imgsWithAlt: imgs.filter((t) => (attr(t, 'alt') || '').trim()).length,
    internalLinks: internal.length, externalLinks: external.length, words: words(text), text, firstParagraphWords: words(firstP),
    lists: (body.match(/<(ul|ol|table)\b/gi) || []).length, ldTypes: types, hasLd: ld.length > 0,
    author: !!(meta('author') || authorFound || /rel\s*=\s*["']author["']/i.test(html) || /\bby\s+[A-Z][a-z]+/.test(text.slice(0, 1500))),
    date: !!(meta('article:published_time') || meta('date') || dateFound || /<time\b/i.test(html)),
    sameAs: sameAsFound, numbers: (text.match(/\b\d[\d,.]*%?/g) || []).length, ogTitle: !!meta('og:title'), ogImage: !!meta('og:image'),
  };
}

export function parseRobots(txt) {
  const groups = []; let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim(); if (!line) continue;
    const [k, ...r] = line.split(':'); const key = k.trim().toLowerCase(); const v = r.join(':').trim();
    if (key === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); }
    else if ((key === 'disallow' || key === 'allow') && cur) cur.rules.push([key, v]);
  }
  return (bot) => {
    const g = groups.find((x) => x.agents.includes(bot.toLowerCase())) || groups.find((x) => x.agents.includes('*'));
    if (!g) return true;
    return !g.rules.some(([k, v]) => k === 'disallow' && v === '/');
  };
}

// Each check: [id, pillar, weight, label, test(p, ctx) -> true|false|null (null = not applicable), fix]
// A heading is a question when it ends in ?, ignoring trailing emoji or spaces.
const isQuestion = (x) => /\?[\s\p{Extended_Pictographic}\uFE0F\u200D]*$/u.test(x);
const CHECKS = [
  ['title', 'SEO', 8, 'Title tag 20-65 characters', (p) => p.title.length >= 20 && p.title.length <= 65, 'Write a unique title of 20-65 characters with the main topic first.'],
  ['desc', 'SEO', 6, 'Meta description 70-165 characters', (p) => !!p.description && p.description.length >= 70 && p.description.length <= 165, 'Add a meta description of 70-165 characters that answers the searcher.'],
  ['h1', 'SEO', 6, 'Exactly one H1', (p) => p.h1.length === 1, 'Use exactly one H1 that matches the page topic.'],
  ['h2', 'SEO', 4, 'At least 3 H2 sections', (p) => p.h2.length >= 3, 'Break the content into 3 or more H2 sections.'],
  ['canon', 'SEO', 4, 'Canonical URL set', (p) => !!p.canonical, 'Add <link rel="canonical"> pointing to the preferred URL.'],
  ['lang', 'SEO', 2, 'html lang attribute', (p) => !!p.lang, 'Add lang="en" (or your language) to <html>.'],
  ['viewport', 'SEO', 3, 'Mobile viewport meta', (p) => !!p.viewport, 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.'],
  ['alt', 'SEO', 4, 'Images have alt text (90%+)', (p) => (p.imgs === 0 ? null : p.imgsWithAlt / p.imgs >= 0.9), 'Add descriptive alt text to every meaningful image.'],
  ['depth', 'SEO', 4, 'At least 400 words of content', (p) => p.words >= 400, 'Add depth: cover the topic fully (400+ words, usually far more for competitive terms).'],
  ['internal', 'SEO', 4, 'At least 3 internal links', (p) => p.internalLinks >= 3, 'Link to 3 or more related pages on your site.'],
  ['og', 'SEO', 3, 'Open Graph title and image', (p) => p.ogTitle && p.ogImage, 'Add og:title and og:image so shares look right.'],
  ['https', 'SEO', 2, 'Served over HTTPS', (p) => (/^https?:/.test(p.url) ? p.url.startsWith('https:') : null), 'Serve the site over HTTPS.'],
  ['schema', 'AEO', 8, 'Structured data (JSON-LD) present', (p) => p.hasLd, 'Add JSON-LD (Organization, Article or Service) to the page.'],
  ['faq', 'AEO', 8, 'FAQ markup or question headings', (p) => p.ldTypes.has('FAQPage') || p.ldTypes.has('Question') || [...p.h2, ...p.h3].filter((x) => isQuestion(x)).length >= 2, 'Add an FAQ section with real questions and FAQPage schema.'],
  ['answer', 'AEO', 7, 'Answer-first opening (under 60 words)', (p) => p.firstParagraphWords > 0 && p.firstParagraphWords <= 60, 'Open with a direct 1-3 sentence answer under 60 words before any background.'],
  ['lists', 'AEO', 4, 'Lists or tables for scannable answers', (p) => p.lists >= 1, 'Add a list or table that answers the main question at a glance.'],
  ['qheads', 'AEO', 3, 'Question-style headings', (p) => [...p.h2, ...p.h3].some((x) => isQuestion(x)), 'Phrase at least one heading as a real question people ask (ending in ?).'],
  ['article', 'AEO', 2, 'Page-type schema (Article/Service/Product/etc.)', (p) => ['Article', 'BlogPosting', 'Service', 'Product', 'HowTo', 'WebPage', 'LocalBusiness'].some((t) => p.ldTypes.has(t)), 'Add schema that matches the page type.'],
  ['bots', 'GEO', 8, 'robots.txt allows AI crawlers', (p, c) => (c.robots == null ? null : AI_BOTS.slice(0, 4).every((b) => c.robots(b))), 'Allow GPTBot, ClaudeBot, PerplexityBot and Google-Extended in robots.txt if you want AI citations.'],
  ['llms', 'GEO', 5, 'llms.txt present', (p, c) => (c.llms == null ? null : c.llms), 'Publish /llms.txt describing your site for AI systems.'],
  ['author', 'GEO', 6, 'Visible author or byline', (p) => p.author, 'Show who wrote the page (author name, role, credentials).'],
  ['date', 'GEO', 4, 'Publish or updated date', (p) => p.date, 'Show a publish or last-updated date, and add datePublished/dateModified in schema.'],
  ['sources', 'GEO', 5, 'Cites at least 2 external sources', (p) => (p.url ? p.externalLinks >= 2 : null), 'Link to 2 or more authoritative external sources for key claims.'],
  ['facts', 'GEO', 4, 'Concrete facts and numbers (5+)', (p) => p.numbers >= 5, 'Add specific figures, dates and named facts that AI systems can quote.'],
  ['entity', 'GEO', 4, 'Entity signals (sameAs / Organization)', (p) => p.sameAs || p.ldTypes.has('Organization') || p.ldTypes.has('Person'), 'Add Organization or Person schema with sameAs links to your profiles.'],
];

export function score(p, ctx = {}) {
  const pillars = { SEO: [0, 0], AEO: [0, 0], GEO: [0, 0] }; const results = [];
  for (const [id, pillar, w, label, test, fix] of CHECKS) {
    const r = test(p, ctx);
    if (r === null) { results.push({ id, pillar, label, status: 'n/a', weight: w, fix }); continue; }
    pillars[pillar][1] += w; if (r) pillars[pillar][0] += w;
    results.push({ id, pillar, label, status: r ? 'pass' : 'fail', weight: w, fix });
  }
  const pct = ([a, b]) => (b ? Math.round((a / b) * 100) : null);
  const earned = Object.values(pillars).reduce((s, [a]) => s + a, 0), possible = Object.values(pillars).reduce((s, [, b]) => s + b, 0);
  return { total: possible ? Math.round((earned / possible) * 100) : 0, pillars: Object.fromEntries(Object.entries(pillars).map(([k, v]) => [k, pct(v)])), results, top: results.filter((r) => r.status === 'fail').sort((a, b) => b.weight - a.weight).slice(0, 5) };
}

function decode(buf, contentType = '') {
  const head = new TextDecoder('latin1').decode(buf.slice(0, 2048));
  const label = (contentType.match(/charset\s*=\s*["']?([\w-]+)/i) || head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i) || [])[1] || 'utf-8';
  try { return new TextDecoder(label).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}

async function get(url, { timeout = 15000, max = 5e6 } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'seo-aeo-geo-kit/audit (+https://github.com/alpit-patel/seo-aeo-geo-kit)', accept: 'text/html,application/xhtml+xml,*/*;q=0.8' } });
    const buf = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    return { ok: res.ok, status: res.status, url: res.url, type, text: decode(buf.byteLength > max ? buf.slice(0, max) : buf, type) };
  } catch (e) {
    const why = e.name === 'AbortError' ? 'timed out' : e.cause?.code || e.cause?.message || e.message;
    throw new Error(`Could not fetch ${url} (${why}). Check the address and your connection.`);
  } finally { clearTimeout(t); }
}

export async function auditUrl(url, opts = {}) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http and https URLs are supported');
  const page = await get(u.href, opts);
  if (!page.ok) throw new Error(`Fetching ${u.href} returned HTTP ${page.status}`);
  const looksHtml = /html|xml/i.test(page.type) || (!page.type && /^\s*</.test(page.text));
  if (!looksHtml) throw new Error(`${u.href} returned ${page.type || 'unknown content'}, not a web page. The auditor only scores HTML pages.`);
  if (!page.text.trim()) throw new Error(`${u.href} returned an empty page.`);
  const origin = new URL(page.url).origin;
  const [rb, ll] = await Promise.allSettled([get(origin + '/robots.txt', opts), get(origin + '/llms.txt', opts)]);
  const isLlms = (r) => r.status === 'fulfilled' && r.value.ok && !/<html/i.test(r.value.text.slice(0, 300));
  let llms = ll.status === 'fulfilled' ? isLlms(ll) : null;
  // Sites served from a sub-path (GitHub project pages, /docs/ sites) keep llms.txt beside the page.
  const base = new URL('.', page.url);
  if (llms !== true && base.pathname !== '/') {
    const [sub] = await Promise.allSettled([get(base.href + 'llms.txt', opts)]);
    if (isLlms(sub)) llms = true;
  }
  const ctx = {
    robots: rb.status === 'fulfilled' && rb.value.ok && !/<html/i.test(rb.value.text) ? parseRobots(rb.value.text) : rb.status === 'fulfilled' && rb.value.status === 404 ? () => true : null,
    llms,
  };
  return { url: page.url, ...score(parsePage(page.text, page.url), ctx), page: undefined };
}

export function auditHtml(html, label = 'local file') { return { url: label, ...score(parsePage(html, '')) }; }
export { CHECKS };
