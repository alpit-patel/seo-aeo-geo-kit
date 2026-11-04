import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { auditHtml, parsePage, parseRobots, score } from '../src/audit.mjs';

const fx = (n) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', n), 'utf8');

test('good page scores high, bad page scores low', () => {
  const good = auditHtml(fx('good.html')), bad = auditHtml(fx('bad.html'));
  assert.ok(good.total >= 80, `good scored ${good.total}`);
  assert.ok(bad.total <= 20, `bad scored ${bad.total}`);
  assert.ok(good.total > bad.total + 50);
  assert.ok(bad.top.length > 0 && bad.top[0].fix);
});

test('parses structure correctly', () => {
  const p = parsePage(fx('good.html'), 'https://example.com/guide');
  assert.equal(p.h1.length, 1);
  assert.ok(p.ldTypes.has('FAQPage') && p.ldTypes.has('Article'));
  assert.equal(p.internalLinks, 3);
  assert.equal(p.externalLinks, 2);
  assert.ok(p.author && p.date && p.sameAs);
});

test('robots.txt parsing for AI bots', () => {
  const allow = parseRobots('User-agent: *\nAllow: /');
  assert.equal(allow('GPTBot'), true);
  const block = parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /');
  assert.equal(block('GPTBot'), false);
  assert.equal(block('ClaudeBot'), true);
  const all = parseRobots('User-agent: *\nDisallow: /');
  assert.equal(all('PerplexityBot'), false);
});

test('network-only checks are skipped for local files and used when context given', () => {
  const p = parsePage(fx('good.html'), '');
  const local = score(p, {});
  assert.equal(local.results.find((r) => r.id === 'bots').status, 'n/a');
  const blocked = score(p, { robots: parseRobots('User-agent: *\nDisallow: /'), llms: false });
  assert.equal(blocked.results.find((r) => r.id === 'bots').status, 'fail');
  assert.equal(blocked.results.find((r) => r.id === 'llms').status, 'fail');
});

test('handles hostile and empty input without throwing', () => {
  for (const h of ['', '<', '<script type="application/ld+json">{bad json</script>', '<h1>' + 'x'.repeat(1e5)]) {
    const r = auditHtml(h);
    assert.ok(Number.isInteger(r.total) && r.total >= 0 && r.total <= 100);
  }
});

import { createServer } from 'node:http';
import { auditUrl } from '../src/audit.mjs';

test('audits a live URL including robots.txt and llms.txt', async () => {
  const good = fx('good.html');
  const run = async (robots, llms) => {
    const srv = createServer((req, res) => {
      if (req.url === '/robots.txt') { res.writeHead(robots == null ? 404 : 200, { 'content-type': 'text/plain' }); res.end(robots ?? ''); }
      else if (req.url === '/llms.txt') { res.writeHead(llms ? 200 : 404, { 'content-type': 'text/plain' }); res.end(llms || 'no'); }
      else if (req.url === '/gone') { res.writeHead(404); res.end('x'); }
      else { res.writeHead(200, { 'content-type': 'text/html' }); res.end(good); }
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${srv.address().port}`;
    try { return { r: await auditUrl(base + '/'), base }; } finally { srv.close(); }
  };
  const ok = (await run('User-agent: *\nAllow: /', '# site')).r;
  assert.equal(ok.results.find((x) => x.id === 'bots').status, 'pass');
  assert.equal(ok.results.find((x) => x.id === 'llms').status, 'pass');
  const blocked = (await run('User-agent: GPTBot\nDisallow: /', null)).r;
  assert.equal(blocked.results.find((x) => x.id === 'bots').status, 'fail');
  assert.equal(blocked.results.find((x) => x.id === 'llms').status, 'fail');
  assert.equal(blocked.results.find((x) => x.id === 'https').status, 'fail');
});

test('URL errors are clear', async () => {
  await assert.rejects(() => auditUrl('ftp://example.com'), /http and https/);
  await assert.rejects(() => auditUrl('http://127.0.0.1:1/'), /Could not fetch/);
});

test('"Why choose us" is not a question heading', () => {
  const r = auditHtml('<html lang="en"><body><h1>A</h1><h2>Why choose us</h2></body></html>');
  assert.equal(r.results.find((x) => x.id === 'qheads').status, 'fail');
  const q = auditHtml('<html lang="en"><body><h1>A</h1><h2>Why choose us?</h2></body></html>');
  assert.equal(q.results.find((x) => x.id === 'qheads').status, 'pass');
  const e = auditHtml('<html lang="en"><body><h1>A</h1><h2>What does it show? 🎁</h2></body></html>');
  assert.equal(e.results.find((x) => x.id === 'qheads').status, 'pass');
});

test('reads nested JSON-LD (author, sameAs, FAQ inside other nodes)', () => {
  const html = `<html lang="en"><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","author":{"@type":"Person","name":"A","sameAs":["https://github.com/a"]},"datePublished":"2026-01-01","hasPart":{"@type":"FAQPage"}}</script></head><body><h1>x</h1></body></html>`;
  const p = parsePage(html);
  assert.ok(p.ldTypes.has('Person') && p.ldTypes.has('FAQPage'));
  assert.ok(p.sameAs && p.author && p.date);
});

test('rejects non-HTML and empty responses instead of scoring them', async () => {
  const srv = createServer((req, res) => {
    if (req.url === '/json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"a":1}'); }
    else if (req.url === '/empty') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); }
    else if (req.url === '/latin1') { res.writeHead(200, { 'content-type': 'text/html; charset=iso-8859-1' }); res.end(Buffer.from('<html lang="fr"><head><title>Caf\xe9 Gu\xe9rin tr\xe8s bon restaurant</title></head><body><h1>x</h1></body></html>', 'latin1')); }
    else if (req.url === '/meta') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(Buffer.from('<html><head><meta charset="windows-1252"><title>Caf\xe9 Gu\xe9rin tr\xe8s bon restaurant</title></head><body><h1>x</h1></body></html>', 'latin1')); }
    else if (req.url === '/slow') { setTimeout(() => { res.writeHead(200); res.end('x'); }, 3000); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    await assert.rejects(() => auditUrl(base + '/json'), /not a web page/);
    await assert.rejects(() => auditUrl(base + '/empty'), /empty page/);
    await assert.rejects(() => auditUrl(base + '/slow', { timeout: 300 }), /timed out/);
    for (const p of ['/latin1', '/meta']) {
      const r = await auditUrl(base + p);
      assert.equal(r.results.find((x) => x.id === 'title').status, 'pass', `${p} title decoded correctly`);
    }
  } finally { srv.close(); }
});
