#!/usr/bin/env node
// Validates the kit: skill frontmatter, registry sync, broken links, dangling skill references, leaks.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const skillDirs = readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(SKILLS, d.name, 'SKILL.md'))).map((d) => d.name).sort();
const skillSet = new Set(skillDirs);
const agentSet = new Set([...walk(SKILLS), ...(existsSync(join(ROOT, 'agents')) ? walk(join(ROOT, 'agents')) : [])].filter((f) => /[\\/]agents[\\/][^\\/]+\.md$/.test(f)).map((f) => f.split(/[\\/]/).pop().replace(/\.md$/, '')));

export function parseFrontmatter(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {}; const lines = m[1].split('\n'); let key = null;
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv && !line.startsWith(' ')) {
      key = kv[1]; let v = kv[2].trim();
      if (/^[>|][-+]?$/.test(v)) v = '';
      fm[key] = v.replace(/^["']|["']$/g, '');
    } else if (key && line.trim() && (line.startsWith(' ') || line.startsWith('\t'))) {
      if (key === 'metadata' || key === 'allowed-tools') continue;
      fm[key] = ((fm[key] || '') + ' ' + line.trim()).trim().replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// 1. frontmatter
for (const d of skillDirs) {
  const text = readFileSync(join(SKILLS, d, 'SKILL.md'), 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) { err(`${d}: SKILL.md has no frontmatter`); continue; }
  if (fm.name !== d) err(`${d}: frontmatter name "${fm.name}" does not match folder`);
  if (!fm.description || fm.description.length < 30) err(`${d}: description missing or too short`);
  if (fm.description && fm.description.length > 1024) warn(`${d}: description over 1024 chars`);
  if (/\b(TODO|FIXME)\b|lorem ipsum/.test(text)) warn(`${d}: contains TODO/FIXME`);
}

// 2. registry + routing csv
const reg = JSON.parse(readFileSync(join(ROOT, 'system/skill-registry.json'), 'utf8'));
const regSet = new Set(reg.map((r) => r.skill));
for (const s of skillSet) if (!regSet.has(s)) err(`registry: missing skill "${s}"`);
for (const s of regSet) if (!skillSet.has(s)) err(`registry: "${s}" has no skills/ folder`);
if (regSet.size !== reg.length) err('registry: duplicate skill entries');
const csvRows = readFileSync(join(ROOT, 'system/skill-routing.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
if (csvRows.length !== reg.length) err(`routing csv has ${csvRows.length} rows but registry has ${reg.length}`);

// 3. markdown links + dangling skill refs + leaks
const mdFiles = walk(ROOT).filter((f) => f.endsWith('.md') && !f.includes(`${sep}vendor${sep}`));
const LEAK = [/__private_identifiers__/i, /[A-Z]:\/(?:Users|alpit|\.claude)/, /\bAIza[0-9A-Za-z_-]{30,}/, /\bsk-[A-Za-z0-9]{20,}/, /\bghp_[A-Za-z0-9]{20,}/, /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/];
const refRe = /`((?:seo|blog|geo)(?:-[a-z0-9]+)*)`/g;
for (const f of walk(ROOT)) {
  if (f.includes(`${sep}vendor${sep}`) || /\.(png|jpg|jpeg|gif|pdf|ico|woff2?)$/i.test(f)) continue;
  let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const rel = relative(ROOT, f).split(sep).join('/'); // forward slashes on every OS
  for (const re of LEAK) if (re.test(text) && !rel.startsWith('tools/')) err(`${rel}: possible leak matching ${re}`);
  if (!f.endsWith('.md')) continue;
  const clean = text.replace(/```[\s\S]*?```/g, '');
  for (const m of clean.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const t = m[1].split('#')[0];
    if (!t || /^(https?:|mailto:|tel:|\/)/.test(t)) continue;
    if (/[<>{}*]/.test(t) || /^(url|URL|filename\.md|pillar\.md|path|link)$/.test(t)) continue; // template placeholders
    if (!existsSync(resolve(dirname(f), decodeURI(t)))) err(`${rel}: broken link ${m[1]}`);
  }
  if (rel.startsWith('skills/') || rel.startsWith('system/') || rel === 'README.md') {
    for (const m of clean.matchAll(refRe)) {
      const n = m[1];
      if (n === 'seo' || n === 'blog' || n === 'geo') { if (!skillSet.has(n)) err(`${rel}: references missing skill ${n}`); continue; }
      if (!skillSet.has(n) && !agentSet.has(n)) warn(`${rel}: references unknown skill \`${n}\``);
    }
  }
}

// 4. helper-script coverage (informational: some are optional paid-API integrations)
const bundled = new Set(walk(ROOT).filter((f) => f.endsWith('.py')).map((f) => f.split(/[\\/]/).pop()));
const wanted = new Map();
for (const f of walk(SKILLS)) {
  if (!f.endsWith('.md')) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/claude-seo"? run ([a-z0-9_]+\.py)/g)) wanted.set(m[1], (wanted.get(m[1]) || 0) + 1);
}
const missing = [...wanted.keys()].filter((n) => !bundled.has(n)).sort();
if (!existsSync(join(ROOT, 'scripts', 'claude-seo'))) err('scripts/claude-seo launcher is missing');
console.log(`Helper scripts referenced by skills: ${wanted.size}, bundled: ${wanted.size - missing.length}, not bundled (fall back to manual checks): ${missing.length}`);
if (process.argv.includes('--scripts') && missing.length) console.log('  not bundled: ' + missing.join(', '));
console.log(`Skills: ${skillDirs.length} | registry rows: ${reg.length}`);
for (const w of warnings) console.log('warn  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `\nFAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `\nOK: 0 errors, ${warnings.length} warning(s)`);
if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(errors.length ? 1 : 0);
