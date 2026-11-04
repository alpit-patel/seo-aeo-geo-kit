// Regenerates docs/images/*.png and docs/demo.{mp4,gif} from REAL auditor output.
// Needs Playwright (+ Chromium) and ffmpeg. Run: node tools/media/build.cjs
const { chromium } = require('playwright');
const { execSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(ROOT, 'docs'), IMG = path.join(OUT, 'images');
const TMP = process.env.MEDIA_TMP || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'kitmedia-'));

const CSS = `*{margin:0;box-sizing:border-box}body{font-family:Inter,-apple-system,"SF Pro Display","Segoe UI",sans-serif;color:#f5f5f7;background:#0a0a0d;-webkit-font-smoothing:antialiased;overflow:hidden;position:relative}
body::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 90% 0%,#ff7a4566,transparent 70%),radial-gradient(55% 70% at 0% 100%,#7d7aff55,transparent 70%),radial-gradient(40% 50% at 50% 50%,#ff5c8a14,transparent 70%)}
.w{position:relative;z-index:1}.g{background:linear-gradient(135deg,#ff9f68,#ff5c8a 55%,#b48cff);-webkit-background-clip:text;background-clip:text;color:transparent}
.mute{color:#a1a1a6}.pill{display:inline-block;background:#ffffff14;border:2px solid #ffffff22;border-radius:18px;padding:12px 24px;font:600 26px "DejaVu Sans Mono",ui-monospace,monospace}
.chip{display:inline-block;padding:8px 20px;border-radius:999px;font-weight:700;font-size:22px;margin-right:10px;border:2px solid #ffffff33;background:#ffffff10}`;
const page = (body, css = '') => `<!doctype html><meta charset="utf-8"><style>${CSS}${css}</style><body>${body}</body>`;

async function auditData() {
  const { auditHtml } = await import(path.join(ROOT, 'src/audit.mjs'));
  return auditHtml(fs.readFileSync(path.join(ROOT, 'test/fixtures/sample.html'), 'utf8'), './sample-page.html');
}
const registry = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'system/skill-registry.json'), 'utf8'));

function ring(score, size = 300) {
  const r = size / 2 - 22, c = 2 * Math.PI * r, d = (score / 100) * c;
  return `<svg width="${size}" height="${size}"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9f68"/><stop offset="1" stop-color="#ff5c8a"/></linearGradient></defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#ffffff1a" stroke-width="22"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="22" stroke-linecap="round" stroke-dasharray="${d} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  <text x="50%" y="52%" text-anchor="middle" font-size="${size * 0.34}" font-weight="800" fill="#f5f5f7" font-family="Inter,sans-serif">${score}</text>
  <text x="50%" y="${size * 0.72}" text-anchor="middle" font-size="${size * 0.09}" fill="#a1a1a6" font-family="Inter,sans-serif">out of 100</text></svg>`;
}

async function shot(browser, name, w, h, html) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(IMG, name + '.png') }); await p.close();
  console.log('image', name);
}

(async () => {
  const a = await auditData(), n = registry().length;
  const browser = await chromium.launch();

  await shot(browser, 'social', 1280, 640, page(`<div class="w" style="display:flex;height:640px;align-items:center;padding:0 80px;justify-content:space-between">
    <div><div class="mute" style="font-size:22px;font-weight:600;letter-spacing:.1em">FOR CLAUDE CODE · CODEX · OPENCODE · ANTIGRAVITY</div>
    <div style="font-size:96px;font-weight:800;line-height:1;letter-spacing:-4px;margin-top:18px">SEO + AEO<br><span class="g">+ GEO Kit</span></div>
    <div class="mute" style="font-size:30px;margin-top:22px;max-width:640px;line-height:1.35">${n} skills + a free page auditor. Rank in Google, win answers, get cited by AI.</div>
    <div style="margin-top:30px"><span class="chip">SEO</span><span class="chip">AEO</span><span class="chip">GEO</span><span class="chip">VEO</span></div></div>
    <div>${ring(a.total, 330)}</div></div>`));

  await shot(browser, 'hero', 1600, 720, page(`<div class="w" style="padding:70px 90px">
    <div style="display:flex;justify-content:space-between;align-items:center"><div>
    <div style="font-size:92px;font-weight:800;letter-spacing:-4px;line-height:1.02">Claude <span class="g">SEO + AEO + GEO</span> Kit</div>
    <div class="mute" style="font-size:34px;margin-top:20px;max-width:900px;line-height:1.35">Research, write, fact-check and audit pages for Google, answer engines and AI search.</div></div></div>
    <div style="display:flex;gap:22px;margin-top:56px">${[['SEO', 'Google rankings', 'Technical, schema, content, backlinks, local'], ['AEO', 'Featured answers', 'Answer-first copy, FAQs, structured data'], ['GEO', 'AI citations', 'Crawler access, llms.txt, citability, brand mentions'], ['VEO', 'Voice answers', 'Spoken answers, voice search, local intent']].map(([t, s, d], i) => `<div style="flex:1;background:#ffffff0f;border:2px solid #ffffff1c;border-radius:30px;padding:30px"><div class="g" style="font-size:54px;font-weight:800">${t}</div><div style="font-size:28px;font-weight:700;margin-top:6px">${s}</div><div class="mute" style="font-size:22px;margin-top:10px;line-height:1.35">${d}</div></div>`).join('')}</div>
    <div style="margin-top:44px"><span class="pill">npx seo-aeo-geo-kit audit &lt;url&gt;</span></div></div>`));

  const pill = [['SEO', '#ff9f68', 'Be found in Google', ['seo-audit', 'seo-technical', 'seo-schema', 'seo-content', 'seo-local'], 'Rankings and clicks'],
    ['AEO', '#ffd60a', 'Be the direct answer', ['blog-outline', 'seo-schema', 'seo-content', 'blog-factcheck'], 'Featured snippets, answer boxes'],
    ['GEO', '#7be495', 'Be cited by AI', ['geo-audit', 'geo-crawlers', 'geo-citability', 'geo-llmstxt', 'geo-brand-mentions'], 'ChatGPT, Perplexity, AI Overviews'],
    ['VEO', '#7cc4ff', 'Be heard by voice', ['seo-voice', 'seo-local', 'seo-maps'], 'Spoken answers, local intent']];
  await shot(browser, 'pillars', 1600, 900, page(`<div class="w" style="padding:60px 70px"><div style="font-size:60px;font-weight:800;letter-spacing:-2px">One kit. <span class="g">Four ways to be found.</span></div>
    <div style="display:flex;gap:22px;margin-top:44px">${pill.map(([t, c, s, sk, o]) => `<div style="flex:1;background:#ffffff0d;border:2px solid #ffffff1a;border-radius:30px;padding:30px;height:640px"><div style="font-size:70px;font-weight:800;color:${c}">${t}</div><div style="font-size:30px;font-weight:700;margin:6px 0 24px">${s}</div>${sk.map((x) => `<div style="font:500 22px 'DejaVu Sans Mono',monospace;background:#ffffff10;border-radius:12px;padding:10px 14px;margin-bottom:10px">${x}</div>`).join('')}<div class="mute" style="margin-top:26px;font-size:22px;line-height:1.4">Outcome<br><b style="color:#f5f5f7">${o}</b></div></div>`).join('')}</div></div>`));

  const fixes = a.top;
  await shot(browser, 'audit-card', 1200, 1000, page(`<div class="w" style="padding:60px 70px"><div class="mute" style="font-size:24px;font-weight:600;letter-spacing:.14em">SAMPLE AUDIT · ./sample-page.html</div>
    <div style="display:flex;align-items:center;gap:50px;margin-top:26px">${ring(a.total, 280)}<div style="flex:1">${['SEO', 'AEO', 'GEO'].map((k) => `<div style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700"><span>${k}</span><span>${a.pillars[k]}</span></div><div style="height:18px;border-radius:9px;background:#ffffff1a;margin-top:8px"><div style="height:18px;border-radius:9px;width:${Math.max(a.pillars[k], 1.5)}%;background:linear-gradient(90deg,#ff9f68,#ff5c8a)"></div></div></div>`).join('')}</div></div>
    <div style="font-size:34px;font-weight:800;margin:44px 0 16px">Fix first</div>${fixes.map((f, i) => `<div style="display:flex;gap:18px;align-items:flex-start;background:#ffffff0d;border:2px solid #ffffff17;border-radius:22px;padding:20px 24px;margin-bottom:14px;font-size:25px;line-height:1.35"><span class="g" style="font-weight:800;font-size:30px">${i + 1}</span><span>${f.fix}</span></div>`).join('')}
    <div class="mute" style="font-size:22px;margin-top:20px">Free: npx seo-aeo-geo-kit audit &lt;url&gt;</div></div>`));

  const steps = ['Research', 'Brief', 'Write', 'Fact-check', 'Humanize', 'Audit', 'Publish'];
  await shot(browser, 'pipeline', 1600, 520, page(`<div class="w" style="padding:60px 70px"><div style="font-size:52px;font-weight:800;letter-spacing:-2px">From idea to <span class="g">page that ranks and gets cited</span></div>
    <div style="display:flex;align-items:center;margin-top:60px">${steps.map((s, i) => `<div style="flex:1;text-align:center"><div style="width:118px;height:118px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#ff9f6833,#7d7aff33);border:3px solid #ffffff2a;display:flex;align-items:center;justify-content:center;font-size:46px;font-weight:800">${i + 1}</div><div style="font-size:26px;font-weight:700;margin-top:16px">${s}</div></div>${i < steps.length - 1 ? '<div style="width:40px;height:4px;background:#ffffff33;margin-bottom:34px"></div>' : ''}`).join('')}</div>
    <div class="mute" style="font-size:24px;margin-top:50px">Every stage has a skill. Every claim gets checked. Every page gets scored for SEO, AEO and GEO.</div></div>`));

  // ---------- demo video (real output) ----------
  const work = path.join(TMP, 'work'); fs.mkdirSync(work, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'test/fixtures/sample.html'), path.join(work, 'sample-page.html'));
  const lines = execSync(`node ${path.join(ROOT, 'bin/cli.mjs')} audit ./sample-page.html --summary`, { cwd: work, encoding: 'utf8' }).split('\n').slice(1);
  const listOut = execSync(`node ${path.join(ROOT, 'bin/cli.mjs')} list --family GEO`, { encoding: 'utf8' }).split('\n').filter(Boolean).slice(0, 8);
  const demo = `<!doctype html><meta charset="utf-8"><style>${CSS}
  html,body{width:1280px;height:720px}
  .term{position:absolute;left:90px;right:90px;top:112px;bottom:36px;background:#0f0f14;border:2px solid #ffffff22;border-radius:22px;box-shadow:0 40px 120px #000a;z-index:2;overflow:hidden}
  .bar{height:52px;background:#1a1a22;display:flex;align-items:center;padding:0 20px;gap:10px}.bar i{width:16px;height:16px;border-radius:50%;display:block}
  #out{font:500 22px/1.36 "DejaVu Sans Mono",monospace;padding:26px 34px;white-space:pre;color:#e9e9ee}
  .ok{color:#7be495}.no{color:#ff6b6b}.dim{color:#8e8e96}.sc{color:#ff9f68;font-weight:700}
  #title{position:absolute;left:90px;top:34px;font-size:38px;font-weight:800;letter-spacing:-1px;z-index:3}
  #end{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0d;opacity:0}
  </style><body><div id="title">Claude <span class="g">SEO + AEO + GEO</span> Kit</div>
  <div class="term"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div><div id="out"></div></div>
  <div id="end"><div class="w" style="text-align:center"><div style="font-size:84px;font-weight:800;letter-spacing:-3px;line-height:1.05">Score any page.<br><span class="g">Fix what AI and Google miss.</span></div>
  <div style="margin-top:46px"><span class="pill">npx seo-aeo-geo-kit audit &lt;url&gt;</span></div>
  <div class="mute" style="font-size:30px;margin-top:34px">github.com/alpit-patel/seo-aeo-geo-kit</div></div></div>
  <script>
  const A=${JSON.stringify(lines)}, L=${JSON.stringify(listOut)};
  const out=document.getElementById('out'),endEl=document.getElementById('end');
  const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const col=l=>esc(l).replace(/✓/g,'<span class="ok">✓</span>').replace(/✗/g,'<span class="no">✗</span>').replace(/^(\\s*)–/,'$1<span class="dim">–</span>').replace(/(Score: \\d+\\/100)/,'<span class="sc">$1</span>');
  const C1='npx seo-aeo-geo-kit audit ./sample-page.html', C2='npx seo-aeo-geo-kit list --family GEO', P='<span class="dim">$</span> ';
  // schedule (seconds)
  const T1=0.9, T1e=T1+C1.length*0.048, O1=T1e+0.5;
  const aT=[];let t=O1;for(const l of A){aT.push(t);t+=l.trim()?0.11:0.04}
  const O1e=t, S2=O1e+3.2, T2e=S2+C2.length*0.048, O2=T2e+0.4;
  const lT=L.map((_,i)=>O2+i*0.16), O2e=O2+L.length*0.16, END=O2e+2.2, TOTAL=END+3.8;
  window.TOTAL=TOTAL;
  window.render=function(now){
    let h='';
    if(now<S2){
      const n=Math.max(0,Math.min(C1.length,Math.floor((now-T1)/0.048)));
      h=P+esc(C1.slice(0,n))+(now<T1e&&now>=T1-0.4?(Math.floor(now*2)%2?'▌':' '):'')+'\\n';
      if(now>=O1) for(let i=0;i<A.length;i++) if(now>=aT[i]) h+=col(A[i])+'\\n';
    } else {
      const n=Math.max(0,Math.min(C2.length,Math.floor((now-S2)/0.048)));
      h=P+esc(C2.slice(0,n))+(now<T2e?'▌':'')+'\\n';
      if(now>=O2) for(let i=0;i<L.length;i++) if(now>=lT[i]) h+=esc(L[i])+'\\n';
    }
    out.innerHTML=h;
    endEl.style.opacity=Math.max(0,Math.min(1,(now-END)/0.8));
  };
  window.render(0);
  </script></body>`;
  const htmlPath = path.join(TMP, 'demo.html'); fs.writeFileSync(htmlPath, demo);
  const FPS = 15, frames = path.join(TMP, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
  const dp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await dp.goto('file://' + htmlPath);
  const total = await dp.evaluate('window.TOTAL');
  const nFrames = Math.ceil(total * FPS);
  for (let i = 0; i < nFrames; i++) {
    await dp.evaluate((t) => window.render(t), i / FPS);
    await dp.screenshot({ path: path.join(frames, String(i).padStart(4, '0') + '.png') });
  }
  await browser.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${frames}/%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an "${path.join(OUT, 'demo.mp4')}"`);
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${frames}/%04d.png" -c:v libvpx-vp9 -b:v 0 -crf 34 -pix_fmt yuv420p -an "${path.join(OUT, 'demo.webm')}"`);
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${frames}/%04d.png" -vf "fps=10,scale=860:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" "${path.join(OUT, 'demo.gif')}"`);
  execSync(`ffmpeg -y -loglevel error -ss 7.5 -i "${path.join(OUT, 'demo.mp4')}" -frames:v 1 "${path.join(IMG, 'demo-poster.png')}"`);
  console.log('video done');
})();
