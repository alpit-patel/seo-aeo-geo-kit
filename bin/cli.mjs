#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditUrl, auditHtml } from '../src/audit.mjs';
import { install as runInstall, targets, detect } from '../src/install.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const HELP = `seo-aeo-geo-kit ${pkg.version}
SEO + AEO + GEO skills for Claude Code, Codex, OpenCode, Antigravity and any Agent Skills tool,
plus a free page auditor.

Usage:
  npx seo-aeo-geo-kit audit <url|file.html> [--summary|--json]   Score a page 0-100 for SEO, AEO and GEO
  npx seo-aeo-geo-kit list [--family SEO|GEO|Blog|Growth|Text]
  npx seo-aeo-geo-kit doctor                                      Show which AI tools you have and what is installed
  npx seo-aeo-geo-kit install --target <tool> [--global] [--only seo,geo] [--dest <dir>] [--force]
      tools: claude, codex, opencode, antigravity, agents (any tool that reads .agents/skills)

Examples:
  npx seo-aeo-geo-kit install --target codex --global
  npx seo-aeo-geo-kit install --target opencode
  npx seo-aeo-geo-kit install --target antigravity --only seo,geo

Claude Code users can also install the full plugin:
  /plugin marketplace add alpit-patel/seo-aeo-geo-kit
  /plugin install seo-aeo-geo-kit@seo-aeo-geo-kit`;

const bar = (n) => (n == null ? '  n/a ' : '█'.repeat(Math.round(n / 10)).padEnd(10, '░') + ' ' + String(n).padStart(3));

async function audit() {
  const target = args[1];
  if (!target) { console.error('Usage: audit <url|file.html>'); process.exit(1); }
  let r;
  try {
    r = /^https?:\/\//i.test(target) ? await auditUrl(target) : existsSync(target) ? auditHtml(readFileSync(target, 'utf8'), target) : (() => { throw new Error(/^[a-z]+:\/\//i.test(target) ? `Unsupported address ${target}. Use an http or https URL.` : `Not a URL or file: ${target}. For a website include https:// (for example https://example.com).`); })();
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
  if (!rows.length) { console.log(`No skills in family "${val('--family')}". Families: ${[...new Set(reg.map((r) => r.family))].join(', ')}`); return; }
  for (const r of rows) console.log(`${r.skill.padEnd(30)} ${r.family.padEnd(7)} ${r.purpose}`);
  console.log(`\n${rows.length} skills`);
}

function doInstall() {
  const T = targets();
  const name = val('--target');
  if (!name && !val('--dest')) {
    console.error('Choose where to install with --target <claude|codex|opencode|antigravity|agents>, or give --dest <dir>.\nRun "npx seo-aeo-geo-kit doctor" to see which tools you have.');
    process.exit(1);
  }
  const t = T[name || 'agents'];
  if (!t) { console.error(`Unknown target "${name}". Choose: ${Object.keys(T).join(', ')}`); process.exit(1); }
  const dest = resolve(val('--dest') || (flag('--global') ? t.global : join(process.cwd(), t.project)));
  const only = (val('--only') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  let r;
  try { r = runInstall({ root: ROOT, target: t, dest, only, force: flag('--force'), portable: flag('--raw') ? false : undefined }); }
  catch (e) { console.error('Error: ' + e.message); process.exit(1); }
  console.log(`Installed ${r.copied} of ${r.total} skill(s) for ${t.label} into ${r.dest}${r.skipped ? ` (${r.skipped} already existed; use --force to overwrite)` : ''}.`);
  if (r.portable) {
    console.log(`Helper files are in ${r.support}.`);
    console.log(`Optional one-time setup for the Python helpers:\n  python "${r.support.replace(/\\/g, '/')}/scripts/runtime.py" setup`);
    console.log('Restart your agent so it picks up the new skills.');
  } else console.log('For the full kit including helper scripts, use the Claude Code plugin (see --help).');
}

function doctor() {
  console.log(`seo-aeo-geo-kit ${pkg.version}  |  Node ${process.version}\n`);
  for (const d of detect()) {
    console.log(`${d.toolFound ? '●' : '○'} ${d.label.padEnd(40)} ${d.toolFound ? (d.kitInstalled ? 'kit installed (global)' : 'found, kit not installed') : 'not found on this machine'}`);
    if (d.toolFound && !d.kitInstalled) console.log(`    npx seo-aeo-geo-kit install --target ${d.target} --global`);
  }
  console.log('\nProject install (current folder): npx seo-aeo-geo-kit install --target <tool>');
}

if (flag('--version') || flag('-v')) console.log(pkg.version);
else if (!cmd || cmd === 'help' || flag('--help') || flag('-h')) console.log(HELP);
else if (cmd === 'audit') await audit();
else if (cmd === 'list') list();
else if (cmd === 'install') doInstall();
else if (cmd === 'doctor') doctor();
else { console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(1); }
