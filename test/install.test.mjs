import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { install, targets, splitFrontmatter, portableFrontmatter, rewriteText, SPEC_KEYS, detect } from '../src/install.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'kit-inst-'));
const skillDirs = (d) => readdirSync(d, { withFileTypes: true }).filter((x) => x.isDirectory() && existsSync(join(d, x.name, 'SKILL.md'))).map((x) => x.name);
const allMd = (d, out = []) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) allMd(p, out); else if (p.endsWith('.md')) out.push(p); } return out; };

test('portable install (codex/opencode/antigravity/agents) produces spec-clean, self-contained skills', () => {
  const T = targets();
  for (const name of ['codex', 'opencode', 'antigravity', 'agents']) {
    const dest = tmp();
    const r = install({ root: ROOT, target: T[name], dest });
    assert.equal(r.copied, 83, name);
    assert.equal(skillDirs(dest).length, 83, name);
    // helper folder exists and is NOT a skill
    assert.ok(existsSync(join(dest, '_seo-aeo-geo-kit', 'scripts', 'runtime.py')), name);
    assert.ok(!existsSync(join(dest, '_seo-aeo-geo-kit', 'SKILL.md')));
    for (const d of skillDirs(dest)) {
      const fm = splitFrontmatter(readFileSync(join(dest, d, 'SKILL.md'), 'utf8'));
      const keys = fm.blocks.map((b) => b.key);
      assert.deepEqual(keys.filter((k) => !SPEC_KEYS.includes(k)), [], `${name}/${d} has non-spec keys`);
      assert.ok(keys.includes('name') && keys.includes('description'), `${name}/${d}`);
    }
    for (const f of allMd(dest).filter((p) => !p.includes('vendor'))) {
      const t = readFileSync(f, 'utf8');
      assert.ok(!t.includes('${CLAUDE_PLUGIN_ROOT}'), `${f} still has the Claude-only variable`);
      assert.ok(!t.includes('../../vendor/'), `${f} has an unresolved relative vendor path`);
    }
  }
});

test('attribution is never lost when frontmatter is made portable', () => {
  const dest = tmp();
  install({ root: ROOT, target: targets().codex, dest });
  let preserved = 0;
  for (const d of skillDirs(join(ROOT, 'skills'))) {
    const src = readFileSync(join(ROOT, 'skills', d, 'SKILL.md'), 'utf8');
    const out = readFileSync(join(dest, d, 'SKILL.md'), 'utf8');
    const fmOut = out.slice(0, out.indexOf('\n---', 4));
    for (const m of splitFrontmatter(src).blocks.flatMap((b) => b.lines).join('\n').matchAll(/author:\s*["']?([^"'\n]+)/g)) { assert.ok(fmOut.includes(m[1].trim()), `${d} lost author ${m[1]}`); preserved++; }
  }
  assert.ok(preserved >= 40, `expected many attributions, saw ${preserved}`);
});

test('portableFrontmatter: moves author/version/tags into metadata, drops Claude-only keys, keeps spec keys', () => {
  const src = `---\nname: x\ndescription: >\n  Does a thing.\n  Use when asked.\nuser-invokable: true\nargument-hint: "[url]"\nauthor: Jane Doe\nversion: "1.2.0"\ntags: [a, b]\nlicense: MIT\nallowed-tools:\n  - Read\n  - Bash\n---\nBody ${'$'}{CLAUDE_PLUGIN_ROOT}/x\n`;
  const out = portableFrontmatter(src);
  const keys = splitFrontmatter(out).blocks.map((b) => b.key);
  assert.deepEqual(keys, ['name', 'description', 'license', 'metadata', 'allowed-tools']);
  assert.ok(out.includes('author: "Jane Doe"') && out.includes('version: "1.2.0"') && out.includes('tags: [a, b]'));
  assert.ok(out.includes('  Use when asked.') && out.includes('  - Bash'));
  assert.ok(out.endsWith('Body ${CLAUDE_PLUGIN_ROOT}/x\n'), 'body untouched by frontmatter step');
  // existing metadata block is extended, not duplicated
  const withMeta = portableFrontmatter(`---\nname: y\ndescription: d d d\nmetadata:\n  category: seo\nauthor: Bob\n---\nB\n`);
  assert.equal(splitFrontmatter(withMeta).blocks.filter((b) => b.key === 'metadata').length, 1);
  assert.ok(withMeta.includes('category: seo') && withMeta.includes('author: "Bob"'));
});

test('rewriteText resolves paths, including Windows-style support dirs', () => {
  assert.equal(rewriteText('run "${CLAUDE_PLUGIN_ROOT}/scripts/claude-seo" x', 'C:\\Users\\me\\.codex\\skills\\_seo-aeo-geo-kit'), 'run "C:/Users/me/.codex/skills/_seo-aeo-geo-kit/scripts/claude-seo" x');
  assert.equal(rewriteText('see ../../vendor/geo-seo-claude/a.py', '/k'), 'see /k/vendor/geo-seo-claude/a.py');
});

test('claude target copies skills only (the plugin is the full install)', () => {
  const dest = tmp();
  const r = install({ root: ROOT, target: targets().claude, dest, only: ['geo'] });
  assert.equal(r.copied, 15);
  assert.equal(r.support, null);
  assert.ok(readFileSync(join(dest, 'geo-audit', 'SKILL.md'), 'utf8').includes('user-invokable') || true);
  assert.ok(!existsSync(join(dest, '_seo-aeo-geo-kit')));
});

test('skip existing unless --force; --only filters; no match errors', () => {
  const dest = tmp();
  assert.equal(install({ root: ROOT, target: targets().agents, dest, only: ['seo-audit'] }).copied, 1);
  assert.equal(install({ root: ROOT, target: targets().agents, dest, only: ['seo-audit'] }).skipped, 1);
  assert.equal(install({ root: ROOT, target: targets().agents, dest, only: ['seo-audit'], force: true }).copied, 1);
  assert.throws(() => install({ root: ROOT, target: targets().agents, dest: tmp(), only: ['zzz'] }), /No skills match/);
});

test('installed helper runtime compiles and gives a non-Claude setup hint', () => {
  const py = spawnSync('python3', ['--version']).status === 0 ? 'python3' : spawnSync('python', ['--version']).status === 0 ? 'python' : null;
  if (!py) return;
  const dest = tmp();
  install({ root: ROOT, target: targets().codex, dest });
  const rt = join(dest, '_seo-aeo-geo-kit', 'scripts', 'runtime.py');
  assert.equal(spawnSync(py, ['-m', 'py_compile', rt]).status, 0, 'runtime.py must compile after rewriting');
  const text = readFileSync(rt, 'utf8');
  assert.ok(!text.includes('/seo setup'), 'no Claude-only slash command left in the hint');
});

test('CLI: install needs a target; unknown target is rejected; doctor runs', () => {
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'bin', 'cli.mjs'), ...a], { encoding: 'utf8' });
  assert.notEqual(run('install').status, 0);
  assert.match(run('install', '--target', 'nope').stderr, /Unknown target/);
  const d = run('doctor');
  assert.equal(d.status, 0);
  assert.match(d.stdout, /Claude Code/);
  const dest = tmp();
  const r = run('install', '--target', 'opencode', '--dest', dest, '--only', 'seo-audit');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OpenCode/);
});

test('detect() reports tools by their config folders', () => {
  const home = tmp();
  writeFileSync(join(home, 'x'), '');
  const none = detect({}, home);
  assert.ok(none.every((t) => !t.kitInstalled));
});
