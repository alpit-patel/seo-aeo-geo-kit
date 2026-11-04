// Installs the kit's skills into Claude Code, Codex, OpenCode, Antigravity, or any tool that reads the
// Agent Skills format (SKILL.md folders). For non-Claude targets it also installs the helper files and
// rewrites Claude-only references so the skills work there.
import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

export const SPEC_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const MOVE_TO_METADATA = ['author', 'version', 'tags'];

// target -> [global dir, project dir, needs portable rewrite]
export function targets(env = process.env, home = homedir()) {
  return {
    claude: { global: join(home, '.claude', 'skills'), project: '.claude/skills', portable: false, label: 'Claude Code' },
    codex: { global: join(env.CODEX_HOME || join(home, '.codex'), 'skills'), project: '.agents/skills', portable: true, label: 'OpenAI Codex' },
    opencode: { global: join(env.XDG_CONFIG_HOME || join(home, '.config'), 'opencode', 'skills'), project: '.opencode/skills', portable: true, label: 'OpenCode' },
    antigravity: { global: join(home, '.gemini', 'antigravity', 'skills'), project: '.agent/skills', portable: true, label: 'Google Antigravity' },
    agents: { global: join(home, '.agents', 'skills'), project: '.agents/skills', portable: true, label: 'Any Agent Skills tool (.agents/skills)' },
  };
}

// Split frontmatter into top-level key blocks, keeping each key's continuation lines together.
export function splitFrontmatter(text) {
  const t = text.replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const blocks = []; let cur = null;
  for (const line of m[1].split('\n')) {
    const k = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (k && !/^\s/.test(line)) { cur = { key: k[1], lines: [line] }; blocks.push(cur); }
    else if (cur) cur.lines.push(line);
  }
  return { blocks, body: m[2] };
}

// Keep only Agent Skills fields. author/version/tags move into `metadata` so attribution is never lost.
export function portableFrontmatter(text) {
  const fm = splitFrontmatter(text);
  if (!fm) return text;
  const keep = fm.blocks.filter((b) => SPEC_KEYS.includes(b.key));
  const moved = fm.blocks.filter((b) => MOVE_TO_METADATA.includes(b.key));
  if (moved.length) {
    let meta = keep.find((b) => b.key === 'metadata');
    if (!meta) { meta = { key: 'metadata', lines: ['metadata:'] }; keep.push(meta); }
    else if (/^metadata:\s*\S/.test(meta.lines[0])) return rebuild(keep, fm.body); // inline metadata: leave as is
    for (const b of moved) {
      const first = b.lines[0].replace(/^[A-Za-z0-9_-]+:\s*/, '').trim();
      const rest = b.lines.slice(1).filter((l) => l.trim());
      if (meta.lines.some((l) => new RegExp(`^\\s+${b.key}:`).test(l))) continue; // already in metadata
      if (rest.length) { meta.lines.push(`  ${b.key}:`); rest.forEach((l) => meta.lines.push('  ' + l)); }
      else meta.lines.push(`  ${b.key}: ${/^["']/.test(first) || /^[\[{]/.test(first) ? first : JSON.stringify(first)}`);
    }
  }
  const order = (b) => SPEC_KEYS.indexOf(b.key);
  keep.sort((a, b) => order(a) - order(b));
  return rebuild(keep, fm.body);
}
const rebuild = (blocks, body) => `---\n${blocks.map((b) => b.lines.join('\n')).join('\n')}\n---\n${body}`;

export function rewriteText(text, supportDir) {
  const s = supportDir.replace(/\\/g, '/');
  return text.split('${CLAUDE_PLUGIN_ROOT}').join(s).split('../../vendor/').join(s + '/vendor/');
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

export function skillNames(root, only = []) {
  const src = join(root, 'skills');
  return readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(src, d.name, 'SKILL.md'))).map((d) => d.name)
    .filter((n) => !only.length || only.some((o) => n === o || n.startsWith(o + '-')));
}

export function install({ root, target, dest, only = [], force = false, portable }) {
  const names = skillNames(root, only);
  if (!names.length) throw new Error('No skills match --only');
  const isPortable = portable ?? target.portable;
  mkdirSync(dest, { recursive: true });
  const support = join(dest, '_seo-aeo-geo-kit');
  let copied = 0, skipped = 0;
  if (isPortable) {
    for (const d of ['scripts', 'agents', 'schema', 'data', 'system', 'templates', 'vendor', 'LICENSES']) {
      if (existsSync(join(root, d))) cpSync(join(root, d), join(support, d), { recursive: true, filter: (s) => !/__pycache__|\.pyc$/.test(s) });
    }
    for (const f of walk(support).filter((p) => p.endsWith('.md') && !/[\\/]vendor[\\/]/.test(p))) writeFileSync(f, rewriteText(readFileSync(f, 'utf8'), support));
    const rt = join(support, 'scripts', 'runtime.py');
    if (existsSync(rt)) {
      const hint = `Run: python '${support.replace(/\\/g, '/').replace(/['"\\]/g, '')}/scripts/runtime.py' setup (then retry)`;
      writeFileSync(rt, readFileSync(rt, 'utf8').split('Run `/seo setup` and retry.').join(hint + '.'));
    }
    for (const f of ['requirements.txt', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) if (existsSync(join(root, f))) cpSync(join(root, f), join(support, f));
    writeFileSync(join(support, 'README.txt'), `Helper files for the seo-aeo-geo-kit skills in this folder.\nOne-time setup for the Python helpers (optional):\n  python "${support.replace(/\\/g, '/')}/scripts/runtime.py" setup\nThis folder has no SKILL.md on purpose, so agents do not treat it as a skill.\n`);
  }
  for (const n of names) {
    const to = join(dest, n);
    if (existsSync(to) && !force) { skipped++; continue; }
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    cpSync(join(root, 'skills', n), to, { recursive: true, filter: (s) => !/__pycache__|\.pyc$/.test(s) });
    if (isPortable) {
      for (const f of walk(to).filter((p) => p.endsWith('.md'))) {
        let t = readFileSync(f, 'utf8');
        if (f === join(to, 'SKILL.md')) t = portableFrontmatter(t);
        writeFileSync(f, rewriteText(t, support));
      }
    }
    copied++;
  }
  return { copied, skipped, dest, support: isPortable ? support : null, portable: isPortable, total: names.length };
}

export function detect(env = process.env, home = homedir()) {
  const t = targets(env, home);
  return Object.entries(t).map(([k, v]) => {
    const parent = dirname(v.global);
    const present = existsSync(parent) || (k === 'agents' && existsSync(join(home, '.agents')));
    const installed = existsSync(v.global) && existsSync(join(v.global, 'seo-audit', 'SKILL.md'));
    return { target: k, label: v.label, toolFound: present, kitInstalled: installed, globalDir: v.global, projectDir: v.project };
  });
}
