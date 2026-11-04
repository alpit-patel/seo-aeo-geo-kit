#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, cpSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditUrl, auditHtml } from '../src/audit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const HELP = `seo-aeo-geo-kit ${pkg.version}
SEO + AEO + GEO skills for Claude Code, plus a free page auditor.

Usage:
  npx seo-aeo-geo-kit audit <url|file.html> [--summary|--json]   Score a page 0-100 for SEO, AEO and GEO
  npx seo-aeo-geo-kit list [--family SEO|GEO|Blog|Growth|Text]
  npx seo-aeo-geo-kit install [--global] [--only seo,geo,blog] [--dest <dir>] [--force]

The best way to use the skills is the Claude Code plugin:
  /plugin marketplace add alpit-patel/seo-aeo-geo-kit
  /plugin install seo-aeo-geo-kit@seo-aeo-geo-kit
"install" copies skill folders only (no helper scripts); the plugin includes everything.`;

const bar = (n) => (n == null ? '  n/a ' : '█'.repeat(Math.round(n / 10)).padEnd(10, '░') + ' ' + String(n).padStart(3));

async function audit() {
  const target = args[1];
  if (!target) { console.error('Usage: audit <url|file.html>'); process.exit(1); }
  let r;
  try {
    r = /^https?:\/\//i.test(target) ? await auditUrl(target) : existsSync(target) ? auditHtml(readFileSync(target, 'utf8'), target) : (() => { throw new Error(`Not a URL or file: ${target}. Include https://`); })();
  } catch (e) { console.error('Error: ' + e.message); process.exit(1); }
  if (flag('--json')) { console.log(JSON.stringify(r, (k, v) => (v instanceof Set ? [...v] : v), 2)); return; }
  console.log(`\n${r.url}\n\nScore: ${r.total}/100\n`);
  for (const p of ['SEO', 'AEO', 'GEO']) console.log(`  ${p}  ${bar(r.pillars[p])}`);
  console.log('');
  if (!flag('--summary')) for (const p of ['SEO', 'AEO', 'GEO']) {
    console.log(p);
    for (const c of r.results.filter((x) => x.pillar === p)) console.log(`  ${c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '–'} ${c.label}${c.status === 'n/a' ? ' (not checked)' : ''}`);
  }
  if (r.top.length) { console.log('\nFix first:'); r.top.forEach((c, i) => console.log(`  ${i + 1}. ${c.fix}`)); }
  console.log('\nAutomated checks only. They show what is missing, not whether the page will rank.');
}

function list() {
  const reg = JSON.parse(readFileSync(join(ROOT, 'system/skill-registry.json'), 'utf8'));
  const fam = val('--family')?.toLowerCase();
  const rows = reg.filter((r) => !fam || r.family.toLowerCase() === fam);
  for (const r of rows) console.log(`${r.skill.padEnd(30)} ${r.family.padEnd(7)} ${r.purpose}`);
  console.log(`\n${rows.length} skills`);
}

function install() {
  const src = join(ROOT, 'skills');
  const dest = resolve(val('--dest') || (flag('--global') ? join(homedir(), '.claude', 'skills') : join(process.cwd(), '.claude', 'skills')));
  const only = (val('--only') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const names = readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(src, d.name, 'SKILL.md'))).map((d) => d.name)
    .filter((n) => !only.length || only.some((o) => n === o || n.startsWith(o + '-')));
  if (!names.length) { console.error('No skills match --only'); process.exit(1); }
  mkdirSync(dest, { recursive: true });
  let copied = 0, skipped = 0;
  for (const n of names) {
    const to = join(dest, n);
    if (existsSync(to) && !flag('--force')) { skipped++; continue; }
    cpSync(join(src, n), to, { recursive: true }); copied++;
  }
  console.log(`Installed ${copied} skill(s) to ${dest}${skipped ? ` (${skipped} already existed; use --force to overwrite)` : ''}.`);
  console.log('Helper scripts are not copied. For the full kit use the Claude Code plugin (see --help).');
}

if (flag('--version') || flag('-v')) console.log(pkg.version);
else if (!cmd || cmd === 'help' || flag('--help') || flag('-h')) console.log(HELP);
else if (cmd === 'audit') await audit();
else if (cmd === 'list') list();
else if (cmd === 'install') install();
else { console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(1); }
