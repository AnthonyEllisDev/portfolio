/* ===========================================================================
   panel.js — the shared half of the live monitors.

   Several pages on this site draw charts from public feeds, and they all hit
   the same three problems: a status pill that has to tell the truth when a
   feed is down, canvas that has to be sized to the device pixel ratio or every
   line is soft, and agencies that ship the same idea in two different shapes.
   That work lives here instead of three times over.

   No modules and no build step. Each monitor page is meant to be readable as
   one file; a <script src> that defines a handful of functions is the smallest
   thing that gets the duplication out without adding tooling.
   ======================================================================== */

/* ── small change ──────────────────────────────────────────────────────── */

const $   = id => document.getElementById(id);
const css = n  => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const num = v  => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

/* Feeds date things as "2026-09-14T09:57:05", "2026-09-14 09:57:05.000" or
   "09/14/2026 09:00:00", all of them UTC and none of them saying so. */
function parseTime(s){
  const t = String(s).trim();
  const us = t.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
  if (us) return new Date(Date.UTC(+us[3], +us[1] - 1, +us[2], +us[4], +us[5]));
  return new Date(t.replace(' ', 'T').replace(/(\.\d+)?$/, 'Z'));
}

/* Two shapes turn up, sometimes from the same host: arrays of objects, and
   arrays-of-arrays with a header row, like a CSV that took a wrong turn. Both
   get flattened to plain objects and the keys lowercased, because the same
   quantity arrives as "Kp" in one feed and "kp" in the next. */
function rows(data){
  if (!Array.isArray(data) || !data.length) throw new Error('unexpected shape');
  if (Array.isArray(data[0])){
    const head = data[0].map(h => String(h).trim().toLowerCase());
    return data.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  }
  return data.map(o => Object.fromEntries(
    Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])));
}

async function grab(url, shape){
  const r = await fetch(url, {cache: 'no-store'});
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  const j = await r.json();
  return shape === 'raw' ? j : rows(j);
}

/* Run every feed independently. One agency having a bad afternoon should cost
   you one panel, not the page. Returns {values, failures} with values in the
   order the jobs were given. */
async function gather(jobs){
  const names = Object.keys(jobs);
  const settled = await Promise.allSettled(Object.values(jobs));
  const values = {};
  let failures = 0;
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled'){ values[names[i]] = s.value; }
    else { failures++; console.warn('feed failed: ' + names[i] + ' —',
                                    (s.reason && s.reason.message) || s.reason); }
  });
  return {values, failures, total: names.length};
}

/* ── status pill ───────────────────────────────────────────────────────── */

function setStatus(kind, text){
  const el = $('status');
  if (!el) return;
  el.className = 'status ' + kind;
  $('statusText').textContent = text;
}

/* Say what actually happened rather than rounding it to "live". */
function reportStatus(failures, total, sourceName){
  const when = new Date().toLocaleTimeString();
  if (failures === 0)            setStatus('ok',   'Live · ' + when);
  else if (failures < total)     setStatus('warn', failures + ' feed' + (failures > 1 ? 's' : '') + ' down');
  else                           setStatus('err',  (sourceName || 'Source') + ' unreachable');
}

/* ── readouts ──────────────────────────────────────────────────────────── */

function put(id, value, unit, cls, note){
  const dd = $(id);
  if (!dd) return;
  dd.className = cls || '';
  dd.innerHTML = value + (unit ? '<span class="unit">' + unit + '</span>' : '');
  if (note !== undefined){
    const n = $(id.replace(/^v/, 'n'));
    if (n) n.textContent = note;
  }
}

/* ── canvas ────────────────────────────────────────────────────────────── */

/* Size the backing store to the CSS width times the device pixel ratio, then
   scale the context back down. Skip this and every line is soft on any screen
   made in the last decade. */
function fit(cv){
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.parentNode.clientWidth;
  const h = parseInt(cv.getAttribute('height'), 10);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.height = h + 'px';
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return {g, w, h};
}

function empty(g, w, h, msg){
  g.fillStyle = css('--faint'); g.font = '12px ui-monospace, monospace';
  g.textAlign = 'center'; g.fillText(msg || 'no data', w / 2, h / 2); g.textAlign = 'left';
}

function axes(g, w, h, pad, lo, hi, label, divs){
  divs = divs || 4;
  g.strokeStyle = css('--line'); g.fillStyle = css('--faint');
  g.lineWidth = 1; g.font = '11px ui-monospace, monospace';
  for (let i = 0; i <= divs; i++){
    const y = Math.round(pad.t + (h - pad.t - pad.b) * i / divs) + .5;
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
    const v = hi - (hi - lo) * i / divs;
    g.fillText(label(v), 4, y + 3.5);
  }
}

/* One or more time series on shared axes.

   The x axis is time, not array position. That matters the moment two series
   cover different spans — a measured curve that stops at this hour and a
   forecast that runs into tomorrow have to line up on the same clock, and
   plotting by index would quietly stretch the short one to fill the frame. */
function lines(cv, sets, opts){
  opts = opts || {};
  const {g, w, h} = fit(cv);
  const pad = opts.pad || {l: 52, r: 10, t: 12, b: 22};

  const live = sets.filter(s => s.pts && s.pts.some(p => p.v !== null));
  if (!live.length){ empty(g, w, h, opts.emptyMsg); return; }

  const all = live.flatMap(s => s.pts).filter(p => p.v !== null);
  const times = all.map(p => +p.t);
  const t0 = opts.t0 !== undefined ? +opts.t0 : Math.min(...times);
  const t1 = opts.t1 !== undefined ? +opts.t1 : Math.max(...times);
  const vals = all.map(p => p.v);
  let lo = opts.lo !== undefined ? opts.lo : Math.min(...vals);
  let hi = opts.hi !== undefined ? opts.hi : Math.max(...vals);
  const span = (hi - lo) || 1;
  if (opts.lo === undefined) lo -= span * .12;
  if (opts.hi === undefined) hi += span * .12;

  axes(g, w, h, pad, lo, hi, opts.label || (v => v.toFixed(0)), opts.divs);

  const X = t => pad.l + (w - pad.l - pad.r) * ((+t - t0) / ((t1 - t0) || 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / ((hi - lo) || 1));

  if (opts.zero !== undefined && opts.zero > lo && opts.zero < hi){
    const y = Math.round(Y(opts.zero)) + .5;
    g.save(); g.setLineDash([4, 4]); g.strokeStyle = css('--line-hi');
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.restore();
  }

  /* "now" divider: everything right of it is somebody's guess. */
  if (opts.now !== undefined){
    const x = Math.round(X(opts.now)) + .5;
    if (x > pad.l && x < w - pad.r){
      g.save(); g.setLineDash([3, 5]); g.strokeStyle = css('--line-hi');
      g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, h - pad.b); g.stroke(); g.restore();
      g.fillStyle = css('--faint'); g.font = '10px ui-monospace, monospace';
      g.fillText('now', Math.min(x + 4, w - pad.r - 24), pad.t + 10);
    }
  }

  live.forEach(s => {
    const stroke = s.stroke || css('--accent');

    if (s.fill){
      const grad = g.createLinearGradient(0, pad.t, 0, h - pad.b);
      grad.addColorStop(0, s.fill); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.beginPath(); let started = false, firstX = 0, lastX = 0;
      s.pts.forEach(p => { if (p.v === null) return;
        const x = X(p.t), y = Y(p.v);
        if (!started){ g.moveTo(x, y); started = true; firstX = x; }
        else g.lineTo(x, y);
        lastX = x; });
      if (started){
        g.lineTo(lastX, h - pad.b); g.lineTo(firstX, h - pad.b); g.closePath();
        g.fillStyle = grad; g.fill();
      }
    }

    /* Gaps break the path. Drawing straight across a hole invents readings. */
    g.save();
    if (s.dash) g.setLineDash([5, 4]);
    g.beginPath(); let started = false;
    s.pts.forEach(p => { if (p.v === null){ started = false; return; }
      const x = X(p.t), y = Y(p.v);
      started ? g.lineTo(x, y) : (g.moveTo(x, y), started = true); });
    g.strokeStyle = stroke; g.lineWidth = s.width || 1.9;
    g.lineJoin = 'round'; g.globalAlpha = s.alpha || 1; g.stroke(); g.restore();
    g.globalAlpha = 1;

    if (s.dot !== false){
      const last = [...s.pts].reverse().find(p => p.v !== null);
      if (last){
        g.beginPath(); g.arc(X(last.t), Y(last.v), 3.4, 0, Math.PI * 2);
        g.fillStyle = stroke; g.globalAlpha = s.alpha || 1; g.fill(); g.globalAlpha = 1;
      }
    }
  });

  /* key, bottom left, only when there is more than one thing to tell apart */
  if (live.length > 1){
    g.font = '11px ui-monospace, monospace'; g.textAlign = 'left';
    let x = pad.l;
    live.forEach(s => {
      if (!s.name) return;
      g.strokeStyle = s.stroke || css('--accent'); g.lineWidth = 2;
      g.save(); if (s.dash) g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(x, h - 6); g.lineTo(x + 14, h - 6); g.stroke(); g.restore();
      g.fillStyle = css('--faint'); g.fillText(s.name, x + 19, h - 3);
      x += 19 + g.measureText(s.name).width + 16;
    });
  }
}

/* Single series, kept because most panels only have one. */
function line(cv, pts, opts){
  opts = opts || {};
  lines(cv, [{pts, stroke: opts.stroke, fill: opts.fill}], opts);
}

/* Bars, measured solid and forecast outlined. The two are never the same
   thing and should never look the same. */
function bars(cv, items, opts){
  opts = opts || {};
  const {g, w, h} = fit(cv);
  const pad = opts.pad || {l: 30, r: 10, t: 12, b: 26};
  if (!items.length){ empty(g, w, h, opts.emptyMsg); return; }

  const vals = items.map(i => i.v);
  const hi = opts.hi !== undefined ? opts.hi : Math.max(...vals, 0);
  const lo = opts.lo !== undefined ? opts.lo : Math.min(...vals, 0);
  axes(g, w, h, pad, lo, hi, opts.label || (v => v.toFixed(0)), opts.divs || 3);

  const bw = (w - pad.l - pad.r) / items.length;
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / ((hi - lo) || 1));
  const base = Y(Math.max(lo, Math.min(hi, 0)));

  items.forEach((p, i) => {
    const x = Math.round(pad.l + bw * i) + 1;
    const bwPx = Math.max(1, Math.floor(bw) - 2);
    const y = Y(p.v);
    const top = Math.min(y, base), bh = Math.max(1, Math.abs(base - y));
    const c = opts.color ? opts.color(p.v) : css('--accent');
    g.fillStyle = c; g.globalAlpha = p.forecast ? .28 : .92;
    g.fillRect(x, Math.round(top), bwPx, Math.round(bh));
    g.globalAlpha = 1;
    if (p.forecast){
      g.strokeStyle = c; g.globalAlpha = .5; g.lineWidth = 1;
      g.strokeRect(x + .5, Math.round(top) + .5, bwPx - 1, Math.round(bh) - 1);
      g.globalAlpha = 1;
    }
  });

  if (opts.threshold !== undefined && opts.threshold > lo && opts.threshold < hi){
    const y = Math.round(Y(opts.threshold)) + .5;
    g.save(); g.setLineDash([3, 4]); g.strokeStyle = opts.thresholdColor || 'rgba(255,184,107,.5)';
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.restore();
  }

  if (opts.keys){
    g.fillStyle = css('--faint'); g.font = '11px ui-monospace, monospace';
    g.fillText(opts.keys[0], pad.l, h - 8);
    const split = items.findIndex(i => i.forecast);
    if (split > 0 && opts.keys[1])
      g.fillText(opts.keys[1], Math.min(pad.l + bw * split, w - pad.r - 62), h - 8);
  }
}

/* ── redraw on resize, and hide chrome when embedded ───────────────────── */

function monitor(load, refreshMs){
  if (document.documentElement.classList.contains('embedded'))
    document.querySelectorAll('a[href]').forEach(a => a.target = '_top');
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(load, 220); });
  load();
  if (refreshMs) setInterval(load, refreshMs);
}
