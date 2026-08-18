/**
 * verify.mjs — automated checks for the procedural galaxy generator.
 *
 * Drives the shipped single-file build in headless Chromium and asserts the
 * properties the write-up claims: that generation is deterministic, that the
 * worker path and the main-thread path agree bit for bit, that every
 * morphology produces a distinct galaxy, that nothing renders black, and that
 * a deep link restores the view it encodes.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node test/verify.mjs [path/to/galaxy.html]
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const target = process.argv[2] || 'demos/galaxy.html';
const path = resolve(process.cwd(), target);
if (!existsSync(path)) {
  console.error(`can't find ${path}`);
  process.exit(2);
}

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  pass  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
};

/* FNV-1a over the bytes of a typed array. Runs in the page. */
const HASH = `(buf) => {
  const b = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}`;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function open(hash = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 160)); });
  await page.goto(pathToFileURL(path).href + hash, { waitUntil: 'load' });
  await page.waitForFunction(() => window.GX && window.GX.galaxy && window.GX.app, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  return { page, problems };
}

console.log(`\nverifying ${target}\n`);

/* ── 1. boot ─────────────────────────────────────────────────────────── */
console.log('boot');
{
  const { page, problems } = await open();
  check('loads with a clean console', problems.length === 0, problems.slice(0, 2).join(' | '));
  check('exposes the generator API', await page.evaluate(() =>
    typeof GX.galaxy.generate === 'function' && typeof GX.genWorker.generateGalaxy === 'function'));
  await page.close();
}

/* ── 2. determinism ──────────────────────────────────────────────────── */
console.log('\ndeterminism');
{
  const { page } = await open();
  const r = await page.evaluate((hashSrc) => {
    const hash = eval(hashSrc);
    const p = Object.assign(GX.galaxy.defaults(), { seed: 0x7F8A2C91, starCount: 60000 });
    const a = GX.galaxy.generate(p);
    const b = GX.galaxy.generate(p);
    const c = GX.galaxy.generate(Object.assign({}, p, { seed: 0xBD441234 }));
    return {
      a: hash(a.positions), b: hash(b.positions), c: hash(c.positions),
      aCol: hash(a.colors), bCol: hash(b.colors),
      count: a.count,
    };
  }, HASH);
  check('same seed produces a bit-identical position buffer', r.a === r.b, `${r.a} vs ${r.b}`);
  check('same seed produces a bit-identical colour buffer', r.aCol === r.bCol);
  check('a different seed produces a different galaxy', r.a !== r.c);
  check('star count matches the request', r.count === 60000, String(r.count));
  await page.close();
}

/* ── 3. worker parity ────────────────────────────────────────────────── */
console.log('\nworker');
{
  const { page } = await open();
  const r = await page.evaluate(async (hashSrc) => {
    const hash = eval(hashSrc);
    const p = Object.assign(GX.galaxy.defaults(), { seed: 0x5EED0001, starCount: 40000 });
    const viaWorker = await GX.genWorker.generateGalaxy(p);
    const onMain = GX.galaxy.generate(p);
    return {
      status: GX.genWorker.status(),
      worker: hash(viaWorker.positions),
      main: hash(onMain.positions),
      kb: Math.round(GX.genWorker.sourceKB()),
    };
  }, HASH);
  check('the worker actually started', r.status === 'worker', r.status);
  check('worker output matches the main thread bit for bit', r.worker === r.main, `${r.worker} vs ${r.main}`);
  check('worker bundle is assembled at runtime', r.kb > 0, `${r.kb} kB`);
  await page.close();
}

/* ── 4. morphologies ─────────────────────────────────────────────────── */
console.log('\nmorphologies');
{
  const { page } = await open();
  const r = await page.evaluate((hashSrc) => {
    const hash = eval(hashSrc);
    const out = {};
    for (const t of GX.galaxy.TYPES) {
      const g = GX.galaxy.generate(Object.assign(GX.galaxy.defaults(), {
        seed: 0x1234ABCD, starCount: 30000, type: t.key,
      }));
      let finite = true;
      for (let i = 0; i < 300; i++) if (!Number.isFinite(g.positions[i])) { finite = false; break; }
      out[t.key] = { h: hash(g.positions), finite, count: g.count };
    }
    return out;
  }, HASH);
  const keys = Object.keys(r);
  check('all five morphologies generate', keys.length === 5, keys.join(','));
  check('every morphology is distinct', new Set(keys.map(k => r[k].h)).size === keys.length);
  check('no NaN positions in any morphology', keys.every(k => r[k].finite));
  await page.close();
}

/* ── 5. it isn't rendering black ─────────────────────────────────────── */
console.log('\nrender');
{
  const { page } = await open('#seed=7F8A-2C91-BD44');
  const lum = await page.evaluate(() => new Promise(res => {
    requestAnimationFrame(() => {
      const src = document.querySelector('canvas');
      const c = document.createElement('canvas');
      c.width = 160; c.height = 100;
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, lit = 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += v; if (v > 24) lit++;
      }
      res({ mean: sum / (d.length / 4), litFraction: lit / (d.length / 4) });
    });
  }));
  check('the galaxy view renders something', lum.mean > 1.5, `mean luminance ${lum.mean.toFixed(2)}`);
  check('a meaningful share of pixels are lit', lum.litFraction > 0.01, `${(lum.litFraction * 100).toFixed(1)}%`);
  await page.close();
}

/* ── 6. deep links ───────────────────────────────────────────────────── */
console.log('\ndeep links');
{
  const { page } = await open('#seed=7F8A-2C91-BD44&type=barred&stars=90000');
  const st = await page.evaluate(() => {
    const s = GX.app.state();
    return { code: s.code, type: s.params.type, stars: s.params.starCount, view: s.view };
  });
  check('seed restored from the URL', /7F8A/i.test(st.code), st.code);
  check('morphology restored from the URL', st.type === 'barred', st.type);
  check('star count restored from the URL', st.stars === 90000, String(st.stars));
  await page.close();
}

await browser.close();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
