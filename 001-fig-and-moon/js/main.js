/* FIG & MOON — The Moonlit Orchard
   1. sky / orchard theme driven by scroll (noon → dusk → midnight)
   2. hero: the label's fig dissolves into light particles that rise and form a crescent moon
   3. UI: nav, scene reveal, scent tabs, bottle tilt + mist, label foil, mock form */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // deterministic RNG → the same particle layout every take (repeatable for recording)
  let seed = 20261016;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ================= theme: sky + orchard colours by scene value s (0..1) ================= */
  const KF = [
    { s: 0,    top: '#f6efe3', bot: '#ead8c1', far: '#d3c8ac', mid: '#b4ad8b', near: '#868a6c' },
    { s: .16,  top: '#f3dfca', bot: '#ecc3a0', far: '#cfb3a0', mid: '#aa9484', near: '#7d7466' },
    { s: .32,  top: '#cf93a2', bot: '#eca47d', far: '#a8728a', mid: '#7e5273', near: '#573858' },
    { s: .46,  top: '#5b3a6e', bot: '#b4667f', far: '#6b4670', mid: '#48305f', near: '#2c1f48' },
    { s: .62,  top: '#1e1840', bot: '#4a2e62', far: '#2f2458', mid: '#211a47', near: '#150f33' },
    { s: .85,  top: '#100c28', bot: '#231a44', far: '#1c1640', mid: '#130f31', near: '#0b0820' },
    { s: 1,    top: '#0b0920', bot: '#1a1338', far: '#171238', mid: '#0f0b2a', near: '#080619' },
  ].map(k => ({ s: k.s, top: hex(k.top), bot: hex(k.bot), far: hex(k.far), mid: hex(k.mid), near: hex(k.near) }));
  const INK_DAY = [58, 24, 52], INK_NIGHT = [244, 234, 218];
  const ACC_DAY = [146, 104, 40], ACC_NIGHT = [232, 198, 130];
  const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

  const th = { s: 0, night: 0, k: 0 };
  let lastThemeS = -1;
  function applyTheme(s) {
    if (Math.abs(s - lastThemeS) < 0.0006) return;
    lastThemeS = s;
    let i = 0;
    while (i < KF.length - 2 && s > KF[i + 1].s) i++;
    const a = KF[i], b = KF[i + 1], t = clamp((s - a.s) / (b.s - a.s));
    const c = {}; ['top', 'bot', 'far', 'mid', 'near'].forEach(n => { c[n] = mix(a[n], b[n], t); });
    const L = (lum(c.top) + lum(c.bot)) / 2;
    const k = 1 - smooth(L, .34, .52);                 // 0 = day ink, 1 = night ink
    th.k = k; th.night = smooth(s, .34, .8); th.s = s;
    const ink = mix(INK_DAY, INK_NIGHT, k), acc = mix(ACC_DAY, ACC_NIGHT, k);
    const st = root.style;
    st.setProperty('--sky-top', rgb(c.top)); st.setProperty('--sky-bot', rgb(c.bot));
    st.setProperty('--tree-far', rgb(c.far)); st.setProperty('--tree-mid', rgb(c.mid)); st.setProperty('--tree-near', rgb(c.near));
    st.setProperty('--ink', rgb(ink)); st.setProperty('--ink-soft', rgb(ink, .74)); st.setProperty('--line', rgb(ink, .2));
    st.setProperty('--accent', rgb(acc));
    st.setProperty('--panel', k < .5 ? rgb([255, 251, 243], lerp(.55, .3, k * 2)) : rgb([255, 255, 255], lerp(.14, .07, (k - .5) * 2)));
    st.setProperty('--fruit', smooth(s, .5, .9).toFixed(3));
    document.body.style.background = rgb(c.bot);
    // sun: sinks toward the horizon, then is gone
    const sun = $('#sun');
    sun.style.opacity = (1 - smooth(s, .06, .42)).toFixed(3);
    sun.style.transform = `translate(-50%, -50%) translateY(${(smooth(s, 0, .4) * 62).toFixed(1)}vh) scale(${lerp(1, 1.25, smooth(s, 0, .4)).toFixed(3)})`;
    // orchard comes closer as we walk in
    layers.forEach((l, n) => { l.style.transform = `scale(${(1 + s * (0.05 + n * 0.07)).toFixed(4)}) translateY(${(-s * (n * 6)).toFixed(1)}px)`; });
    $('#rail-dot').style.top = (s * 100).toFixed(1) + '%';
  }

  /* ================= orchard silhouettes (SVG, generated) ================= */
  const orchard = $('#orchard');
  const NS = 'http://www.w3.org/2000/svg';
  const layers = [];
  (function buildOrchard() {
    const rows = [
      { c: 'var(--tree-far)', y: 372, sc: .62, gap: 118, fruits: 0 },
      { c: 'var(--tree-mid)', y: 410, sc: .85, gap: 150, fruits: 1 },
      { c: 'var(--tree-near)', y: 462, sc: 1.1, gap: 210, fruits: 1 },
    ];
    rows.forEach((row, ri) => {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'layer'); g.setAttribute('fill', row.c);
      let x = -40 + rnd() * 40;
      while (x < 1700) {
        const sc = row.sc * (.85 + rnd() * .35), cx = x, base = row.y;
        const tr = document.createElementNS(NS, 'path');
        tr.setAttribute('d', `M${cx - 5 * sc} ${base + 24} L${cx - 3 * sc} ${base - 40 * sc} L${cx + 3 * sc} ${base - 40 * sc} L${cx + 5 * sc} ${base + 24}Z`);
        g.appendChild(tr);
        const blobs = [[0, -92, 52], [-40, -66, 40], [40, -68, 42], [-14, -118, 36], [22, -106, 38]];
        blobs.forEach(([dx, dy, r]) => {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', (cx + dx * sc).toFixed(1)); c.setAttribute('cy', (base + dy * sc).toFixed(1)); c.setAttribute('r', (r * sc).toFixed(1));
          g.appendChild(c);
        });
        x += row.gap * (.8 + rnd() * .5);
      }
      const ground = document.createElementNS(NS, 'rect');
      ground.setAttribute('x', -200); ground.setAttribute('y', row.y + 18); ground.setAttribute('width', 2000); ground.setAttribute('height', 300);
      g.appendChild(ground);
      orchard.appendChild(g); layers.push(g);
    });
    // glowing fruit on the nearer rows — appear at night
    const glow = document.createElementNS(NS, 'g'); glow.setAttribute('style', 'opacity:var(--fruit)');
    for (let i = 0; i < 46; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (rnd() * 1600).toFixed(0)); c.setAttribute('cy', (300 + rnd() * 170).toFixed(0));
      c.setAttribute('r', (1.4 + rnd() * 1.8).toFixed(1)); c.setAttribute('fill', '#ffd98a');
      c.setAttribute('opacity', (.45 + rnd() * .5).toFixed(2));
      glow.appendChild(c);
    }
    orchard.appendChild(glow);
  })();

  /* ================= canvas world ================= */
  const cv = $('#fx'), cx = cv.getContext('2d');
  const V = { w: 0, h: 0, dpr: 1, figH: 300, figCx: 0, figCy: 0, moonCx: 0, moonCy: 0, moonR: 120, moonEndCx: 0, moonEndCy: 0, moonEndR: 60, heroEnd: 1, storyEnd: 1, mobile: false };
  const CROP = { x: 300, y: 560, w: 420, h: 540 };
  let P = null;           // particles
  let cutout = null;      // fig cut-out canvas
  let intro = reduce ? 1 : 0, introStarted = false, introT0 = 0;

  function measure() {
    V.w = innerWidth; V.h = innerHeight; V.dpr = Math.min(devicePixelRatio || 1, 2); V.mobile = V.w < 700;
    cv.width = Math.round(V.w * V.dpr); cv.height = Math.round(V.h * V.dpr);
    V.figH = Math.min(V.h * (V.mobile ? .42 : .42), V.w * (V.mobile ? .8 : .6) * CROP.h / CROP.w);
    V.figCx = V.w / 2; V.figCy = V.h * (V.mobile ? .42 : .41);
    const S = Math.min(V.h * .42, V.w * .6);
    V.moonCx = V.w / 2 + S * .12; V.moonCy = V.h * (V.mobile ? .34 : .33); V.moonR = S / 2;
    V.moonEndCx = V.w * (V.mobile ? .76 : .85); V.moonEndCy = V.h * (V.mobile ? .17 : .2); V.moonEndR = V.moonR * (V.mobile ? .3 : .38);
    const hero = $('#hero'), story = $('#story');
    V.heroEnd = Math.max(1, hero.offsetHeight - V.h);
    V.storyEnd = Math.max(V.heroEnd + 1, story.offsetTop + story.offsetHeight - V.h * .4);
  }

  /* ---- build particles from the label image (sampled pixels of the real fig) ---- */
  function buildParticles(fromPixels) {
    const N = V.mobile ? 2800 : 4600;
    P = {
      n: N, ix: new Float32Array(N), iy: new Float32Array(N), r: new Uint8Array(N), g: new Uint8Array(N), b: new Uint8Array(N),
      mu: new Float32Array(N), mv: new Float32Array(N), sx: new Float32Array(N), sy: new Float32Array(N),
      dl: new Float32Array(N), cdx: new Float32Array(N), cdy: new Float32Array(N), sz: new Float32Array(N), sd: new Float32Array(N),
    };
    // crescent (opens to the right, leans like the label's moon): rejection sampling in unit coordinates
    const rot = -.42, cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < N; i++) {
      let u, v;
      do { u = rnd() * 2 - 1; v = rnd() * 2 - 1; } while (u * u + v * v > 1 || Math.hypot(u - .34, v + .06) < .88);
      P.mu[i] = u * cr - v * sr; P.mv[i] = u * sr + v * cr;
    }
    for (let i = 0; i < N; i++) {
      const pick = fromPixels(i);
      P.ix[i] = pick.x; P.iy[i] = pick.y; P.r[i] = pick.c[0]; P.g[i] = pick.c[1]; P.b[i] = pick.c[2];
      const ang = rnd() * Math.PI * 2, rad = .6 + rnd() * 1.1;
      P.sx[i] = Math.cos(ang) * rad * 1.1; P.sy[i] = Math.sin(ang) * rad * .8 + .35;
      const yn = pick.y / CROP.h;
      P.dl[i] = clamp(.55 * (1 - yn) + rnd() * .4, 0, 1);      // neck leaves first, base last
      P.cdx[i] = (rnd() * 2 - 1) * .85; P.cdy[i] = -(.12 + rnd() * .8);
      P.sz[i] = 1.1 + rnd() * rnd() * 2.6; P.sd[i] = rnd();
    }
  }

  function sampleFromImage(img) {
    // img is the pre-cropped fig (js/fig-data.js, a data: URI so pixels stay readable even from file://)
    const off = document.createElement('canvas'); off.width = CROP.w; off.height = CROP.h;
    const o = off.getContext('2d', { willReadFrequently: true }); o.drawImage(img, 0, 0);
    // paper colour from an empty patch (top-left of the crop)
    const pp = o.getImageData(2, 80, 38, 60).data; let pr = 0, pg = 0, pb = 0;
    for (let i = 0; i < pp.length; i += 4) { pr += pp[i]; pg += pp[i + 1]; pb += pp[i + 2]; }
    const pn = pp.length / 4; pr /= pn; pg /= pn; pb /= pn;
    const id = o.getImageData(0, 0, CROP.w, CROP.h); const d = id.data;
    const cand = [];
    for (let y = 0; y < CROP.h; y++) for (let x = 0; x < CROP.w; x++) {
      const i = (y * CROP.w + x) * 4;
      const dist = Math.hypot(d[i] - pr, d[i + 1] - pg, d[i + 2] - pb);
      let a = smooth(dist, 14, 48);
      if (y < 64 && x > 228) a = 0;                  // crescent tail that overlaps the crop
      if (y < 40 && x <= 228) a *= smooth(y, 0, 40); // stem fades into nothing
      d[i + 3] = Math.round(a * 255);
      if (a > .7) cand.push(i);
    }
    cutout = document.createElement('canvas'); cutout.width = CROP.w; cutout.height = CROP.h;
    cutout.getContext('2d').putImageData(id, 0, 0);
    buildParticles(() => {
      const i = cand[(rnd() * cand.length) | 0], p = i / 4;
      return { x: (p % CROP.w) + rnd() - .5, y: Math.floor(p / CROP.w) + rnd() - .5, c: [d[i], d[i + 1], d[i + 2]] };
    });
  }

  function sampleProcedural() { // used if pixel access is unavailable (e.g. opened from file://)
    const pal = [[150, 98, 120], [168, 112, 134], [132, 84, 108], [214, 170, 96], [190, 150, 80]];
    buildParticles(() => {
      let x, y;
      do { x = 30 + rnd() * 360; y = 20 + rnd() * 500; } while (!(((x - 210) / 178) ** 2 + ((y - 380) / 150) ** 2 < 1 || (y < 300 && Math.abs(x - 205 - (y - 300) * .12) < 6 + (y / 300) * 60 * Math.max(0, (y - 20) / 280))));
      return { x, y, c: pal[(rnd() * (rnd() < .78 ? 3 : 5)) | 0] };
    });
  }

  /* ---- ambient: stars + fireflies ---- */
  const stars = Array.from({ length: 150 }, () => ({ x: rnd(), y: rnd() * .7, r: .5 + rnd() * 1.3, ph: rnd() * 6.28, sp: .6 + rnd() * 1.6 }));
  const flies = Array.from({ length: 34 }, () => ({ x: rnd(), y: .55 + rnd() * .4, ph: rnd() * 6.28, sp: .15 + rnd() * .3, r: 5 + rnd() * 8 }));
  const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.25, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();

  /* ---- scroll → scene values ---- */
  function scrollState() {
    const y = scrollY, he = V.heroEnd;
    const p = clamp(y / he);
    let s;
    if (y <= he) s = .58 * easeIO(p) * .5 + .58 * p * .5;      // eased blend, gentle
    else s = .58 + .42 * clamp((y - he) / (V.storyEnd - he));
    const m = easeIO(clamp((y - he) / (V.h * .95)));            // moon travels to the corner
    return { y, p, s, m };
  }

  const GOLD = [214, 168, 86], BRIGHT = [255, 230, 166];
  let t0 = performance.now(), last = t0;

  const dockEl = $('#bottle-frame'); let dock = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
    const { p, s, m } = scrollState();
    applyTheme(s);
    heroText(p);
    if (introStarted && intro < 1) intro = clamp((now - introT0) / 3000);

    cx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    cx.clearRect(0, 0, V.w, V.h);
    const night = th.night;

    // stars
    if (night > .02) {
      for (const st of stars) {
        const a = night * (.35 + .65 * (.5 + .5 * Math.sin(t * st.sp + st.ph))) * (.4 + .6 * (1 - st.y / .7));
        cx.fillStyle = `rgba(255,244,225,${a.toFixed(3)})`;
        cx.beginPath(); cx.arc(st.x * V.w, st.y * V.h, st.r, 0, 6.283); cx.fill();
      }
    }
    // fireflies drifting among the trees
    if (night > .05) {
      cx.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        const x = (f.x + Math.sin(t * f.sp + f.ph) * .05) * V.w, y = (f.y + Math.cos(t * f.sp * 1.3 + f.ph) * .03) * V.h;
        const a = night * (.25 + .75 * Math.max(0, Math.sin(t * .9 + f.ph * 3)));
        cx.globalAlpha = a * .8; const g = f.r * 2.4; cx.drawImage(sprite, x - g / 2, y - g / 2, g, g);
      }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    }

    if (!P) return;
    const mc = { x: lerp(V.moonCx, V.moonEndCx, m), y: lerp(V.moonCy, V.moonEndCy, m), r: lerp(V.moonR, V.moonEndR, m) };
    // while the bottle is on screen the moon "docks" beside the bottle's shoulder instead of sitting over the heading in the corner
    const fr = dockEl.getBoundingClientRect();
    const wTarget = m > .98 ? smooth(clamp((Math.min(fr.bottom, V.h) - Math.max(fr.top, 0)) / Math.max(1, fr.height)), .12, .62) : 0;
    dock += (wTarget - dock) * .1;                                 // eased, so the moon never jumps
    if (dock > .5) {                                               // dissolve-move: fade out in the corner, reappear by the bottle (no flight across the text)
      mc.r *= .82;                                                 // a little smaller beside the bottle
      const narrow = V.w < 700;                                    // phone: no room beside the bottle → rest in the space above its shoulder
      const tx = narrow ? fr.left + fr.width * .78 : fr.left + fr.width * .84 + mc.r * 1.8;
      const ty = narrow ? fr.top - mc.r * .9 : fr.top + fr.height * .075 + mc.r * .2;
      mc.x = Math.min(tx, V.w - mc.r * 1.3); mc.y = ty;
    }
    const dimMul = Math.pow(Math.abs(1 - 2 * clamp(dock, 0, 1)), 1.4);   // 1 → 0 → 1 across the hand-over
    const formed = smooth(p, .72, 1);
    // moon halo
    if (formed > 0) {
      const ha = formed * (.2 + .45 * night) * dimMul;
      const gr = cx.createRadialGradient(mc.x - mc.r * .25, mc.y, 0, mc.x - mc.r * .25, mc.y, mc.r * 2.3);
      gr.addColorStop(0, `rgba(255,222,150,${(ha * .5).toFixed(3)})`); gr.addColorStop(.4, `rgba(255,200,130,${(ha * .18).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,130,0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = gr; cx.fillRect(mc.x - mc.r * 3, mc.y - mc.r * 3, mc.r * 6, mc.r * 6); cx.globalCompositeOperation = 'source-over';
    }

    const fs = V.figH / CROP.h, fx0 = V.figCx - CROP.w / 2 * fs, fy0 = V.figCy - CROP.h / 2 * fs;
    // the real fig artwork, dissolving as the particles lift off
    const imgA = smooth(intro, .6, 1) * (1 - smooth(p, .03, .17));
    if (cutout && imgA > .003) { cx.globalAlpha = imgA; cx.drawImage(cutout, fx0, fy0, CROP.w * fs, CROP.h * fs); cx.globalAlpha = 1; }

    const amp = reduce ? 0 : 1;
    const sizeFig = Math.max(.8, fs * 1.35), sizeMoon = clamp(mc.r / 190, .5, 1.15);
    const glowIdx = V.mobile ? 9 : 6;
    const bright = [lerp(GOLD[0], BRIGHT[0], night), lerp(GOLD[1], BRIGHT[1], night), lerp(GOLD[2], BRIGHT[2], night)];
    const glows = [];
    const pre = smooth(p, .05, .2) * (1 - smooth(p, .2, .3));
    for (let i = 0; i < P.n; i++) {
      let px = fx0 + P.ix[i] * fs, py = fy0 + P.iy[i] * fs;
      if (intro < 1) {
        const ai = clamp(intro * 1.55 - P.sd[i] * .55), e = 1 - Math.pow(1 - ai, 3), ang = (1 - e) * 2.6;
        const ox = P.sx[i] * V.figH, oy = P.sy[i] * V.figH, c = Math.cos(ang), sn = Math.sin(ang);
        px = lerp(V.figCx + ox * c - oy * sn, px, e); py = lerp(V.figCy + ox * sn + oy * c, py, e);
      } else if (amp) { py += Math.sin(t * 1.2 + P.sd[i] * 40) * .5 * (1 - smooth(p, 0, .1)); }
      if (pre > 0) { px += Math.sin(t * 5 + P.sd[i] * 60) * 1.6 * pre; py -= pre * 7 * P.sd[i]; }

      let size = P.sz[i] * sizeFig, lit = 0, X = px, Y = py, alpha = 1;
      const q = clamp((p - .15 - P.dl[i] * .45) / .36);
      if (q > 0) {
        const e = easeIO(q);
        const jx = Math.sin(P.sd[i] * 50 + t * .7), jy = Math.cos(P.sd[i] * 37 + t * .6);
        const R = mc.r * (.97 + (P.sd[i] - .5) * .04);
        const tx = mc.x + P.mu[i] * R + (e >= 1 ? jx * 1.4 * amp * (mc.r / 150) : 0), ty = mc.y + P.mv[i] * R + (e >= 1 ? jy * 1.4 * amp * (mc.r / 150) : 0);
        const mx = (px + tx) / 2 + P.cdx[i] * V.figH * .7, my = (py + ty) / 2 + P.cdy[i] * V.figH * .7;
        const o = 1 - e;
        X = o * o * px + 2 * o * e * mx + e * e * tx; Y = o * o * py + 2 * o * e * my + e * e * ty;
        const turb = Math.sin(Math.PI * e) * amp;
        X += Math.sin(t * 2.2 + P.sd[i] * 30 + e * 7) * turb * V.figH * .035;
        Y += Math.cos(t * 1.9 + P.sd[i] * 22 + e * 6) * turb * V.figH * .03;
        lit = smooth(q, 0, .3);
        size = lerp(P.sz[i] * sizeFig, P.sz[i] * sizeMoon * .9, e) * (1 + .8 * Math.sin(Math.PI * e));
        if (e >= 1) { const tw = .5 + .5 * Math.sin(t * 2 + P.sd[i] * 40); alpha = lerp(.78, 1, tw) * dimMul; size *= lerp(.85, 1.15, tw); }
      }
      let r = P.r[i], g = P.g[i], b = P.b[i];
      if (lit > 0) { const k = .86 + P.sd[i] * .2; r = lerp(r, Math.min(255, bright[0] * k), lit); g = lerp(g, Math.min(255, bright[1] * k), lit); b = lerp(b, Math.min(255, bright[2] * k), lit); }
      cx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha.toFixed(2)})`;
      cx.fillRect(X - size / 2, Y - size / 2, size, size);
      if (lit > .04 && i % glowIdx === 0) glows.push(X, Y, size, lit, alpha);
    }
    if (glows.length) {
      cx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < glows.length; k += 5) {
        const gsz = (glows[k + 2] * 9 + 8) * clamp(mc.r / 190, .5, 1); cx.globalAlpha = glows[k + 3] * glows[k + 4] * (.18 + .5 * night);
        cx.drawImage(sprite, glows[k] - gsz / 2, glows[k + 1] - gsz / 2, gsz, gsz);
      }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---- hero copy follows scroll ---- */
  const hTitle = $('#h-title'), hEye = $('#h-eyebrow'), hSub = $('#h-sub'), hHint = $('#h-hint'), hCap = $('#h-caption');
  function heroText(p) {
    const introText = smooth(intro, .7, 1);
    const out = 1 - smooth(p, .03, .2);
    hTitle.style.opacity = (introText * out).toFixed(3);
    hTitle.style.transform = `translateY(${(-p * 90).toFixed(1)}px)`;
    hTitle.style.filter = out < 1 ? `blur(${((1 - out) * 6).toFixed(1)}px)` : 'none';
    hEye.style.opacity = (introText * out).toFixed(3);
    hSub.style.opacity = (introText * out).toFixed(3);
    hHint.style.opacity = (introText * (1 - smooth(p, .0, .05))).toFixed(3);
    const c = smooth(p, .84, .97);
    hCap.style.opacity = c.toFixed(3);
    hCap.style.transform = `translateY(${((1 - c) * 24).toFixed(1)}px)`;
  }

  /* ---- boot: wait for fonts + label image, then start the intro ---- */
  function startIntro() { introStarted = true; introT0 = performance.now(); }
  measure();
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    try { sampleFromImage(img); } catch (e) { cutout = null; sampleProcedural(); }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { if (!reduce) startIntro(); });
  };
  img.onerror = () => { sampleProcedural(); if (!reduce) startIntro(); };
  if (window.FIG_CROP) img.src = window.FIG_CROP; else { sampleProcedural(); if (!reduce) startIntro(); }
  requestAnimationFrame(frame);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const had = !!P; measure(); if (had && img.complete) { try { sampleFromImage(img); } catch (e) { sampleProcedural(); } } }, 150); });
  addEventListener('load', measure);

  /* ================= UI ================= */
  // nav
  const nav = $('#nav'), mbtn = $('#menu-btn');
  const setMenu = open => { nav.classList.toggle('is-open', open); mbtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
  mbtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  const bar = $('#top-bar');
  const barState = () => bar.classList.toggle('is-solid', scrollY > 60);
  addEventListener('scroll', barState, { passive: true }); barState();
  // scrollspy
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('[data-spy]').forEach(a => a.classList.toggle('is-active', a.dataset.spy === e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['story', 'notes', 'bottle', 'label', 'reserve'].forEach(id => spy.observe($('#' + id)));
  // reveal
  const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.reveal').forEach(el => rv.observe(el));
  setTimeout(() => $$('.reveal:not(.is-in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); }), 1800);
  $('#to-top').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  // scent tabs (moon phase follows)
  const tabs = $$('.tabs [role="tab"]'), panels = $$('.tabpanel'), phase = $('#moon-phase'), phLabel = $('#mp-label');
  const phNames = ['夕暮れ ・ トップノート', '真夜中 ・ ミドルノート', '夜明け ・ ラストノート'];
  function selectTab(i, focus) {
    tabs.forEach((t, n) => { t.setAttribute('aria-selected', String(n === i)); t.tabIndex = n === i ? 0 : -1; panels[n].hidden = n !== i; });
    phase.dataset.phase = i; phLabel.textContent = phNames[i]; if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % 3, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i + 2) % 3, true); }
    });
  });

  // bottle: real 3D (default, WebGL) → falls back to the transparent photo; ?bottle=cutout / ?bottle=original for comparison
  const frameEl = $('#bottle-frame'), mist = $('#mist'), mx = mist.getContext('2d');
  const variant = new URLSearchParams(location.search).get('bottle') || '3d';
  const useCut = variant !== 'original', use3d = variant === '3d';
  let bottle3d = null;
  if (variant === 'original') {                       // original studio photo (arch frame) — comparison only
    frameEl.classList.remove('is-cutout', 'is-3d');
    const bi = $('img', frameEl); bi.src = 'assets/fig-moon-bottle.png'; bi.width = 1024; bi.height = 1536;
    $('.reflect', frameEl).removeAttribute('src');
  } else if (!use3d) frameEl.classList.remove('is-3d');
  if (use3d) {
    // load Three.js + the model only when the section is about to be seen
    let started = false;
    const start = () => {
      if (started) return; started = true;
      const sc = document.createElement('script'); sc.src = 'js/bottle3d.js';
      sc.onload = () => window.Bottle3D.init(frameEl, $('#bottle-gl'), { reduce }).then(api => { bottle3d = api; }).catch(() => frameEl.classList.remove('is-3d'));
      sc.onerror = () => frameEl.classList.remove('is-3d');
      document.head.appendChild(sc);
    };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '900px 0px' }); io.observe(frameEl); } else start();
  }
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduce && !use3d) {
    frameEl.addEventListener('pointermove', e => {
      const r = frameEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      frameEl.classList.add('is-tilting');
      frameEl.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg'); frameEl.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg');
      frameEl.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); frameEl.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
    });
    frameEl.addEventListener('pointerleave', () => { frameEl.classList.remove('is-tilting'); frameEl.style.setProperty('--rx', '0deg'); frameEl.style.setProperty('--ry', '0deg'); });
  }

  /* mist: a fine, cool spray — pale droplets + a few gold glints + soft vapour, drawn additively */
  let mp = [], mraf = 0;
  function sizeMist() { const d = Math.min(devicePixelRatio || 1, 2); mist.width = mist.clientWidth * d; mist.height = mist.clientHeight * d; mx.setTransform(d, 0, 0, d, 0, 0); }
  function spray() {
    frameEl.classList.add('has-pressed'); sizeMist();
    const w = mist.clientWidth, h = mist.clientHeight, gl = use3d && frameEl.classList.contains('gl-ready') && bottle3d;
    // nozzle: collar of the 3D bottle (follows the rotation) or a fixed spot on the photo
    const o = gl ? bottle3d.project(1.0, 3.3, .3)
      : use3d ? { x: w * .5, y: h * ((.225 + .06) / 1.12), facing: 0 }      // wide canvas box (3D variant before WebGL is ready)
      : { x: w * .505, y: h * (useCut ? .225 : .3), facing: 0 };
    const sx = o.x, sy = o.y;
    const lean = gl ? o.facing * .9 : 0;                         // spray leans the way the bottle faces
    const base = -.42 + lean;                                    // out of the neck, fanning up and to the right
    const droplets = reduce ? 50 : 300, vapour = reduce ? 8 : 30;
    for (let i = 0; i < droplets; i++) {
      const a = base + (rnd() - .5) * 1.0, v = 3.4 + rnd() * 8.5, gold = rnd() < .1;
      mp.push({ k: 0, x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: .009 + rnd() * .014, r: .8 + rnd() * 2.2, c: gold ? [255, 226, 160] : (rnd() < .35 ? [255, 226, 240] : [232, 228, 255]), tw: rnd() * 6.28 });
    }
    for (let i = 0; i < vapour; i++) {
      const a = base + (rnd() - .5) * .8, v = 2.2 + rnd() * 4.6;
      mp.push({ k: 1, x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: .007 + rnd() * .007, r: 12 + rnd() * 22, c: [226, 218, 255], tw: 0 });
    }
    if (!mraf) mraf = requestAnimationFrame(tickMist);
  }
  function tickMist() {
    mx.clearRect(0, 0, mist.clientWidth, mist.clientHeight);
    mx.globalCompositeOperation = useCut ? 'lighter' : 'source-over';
    mp = mp.filter(p => p.life > 0);
    for (const p of mp) {
      p.x += p.vx; p.y += p.vy; p.life -= p.dec;
      if (p.k === 0) {
        p.vx *= .972; p.vy = p.vy * .972 - .014;
        const a = Math.max(0, p.life) * (.55 + .35 * Math.sin(p.tw + p.life * 18)) * (useCut ? 1 : .8);
        const c = useCut ? p.c : [196, 138, 168];
        mx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; mx.beginPath(); mx.arc(p.x, p.y, p.r, 0, 6.283); mx.fill();
      } else {
        p.vx *= .97; p.vy = p.vy * .97 - .01; p.r += .5;
        const a = Math.max(0, p.life) * (useCut ? .05 : .1), c = useCut ? p.c : [214, 160, 190];
        const g = mx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        mx.fillStyle = g; mx.beginPath(); mx.arc(p.x, p.y, p.r, 0, 6.283); mx.fill();
      }
    }
    mx.globalCompositeOperation = 'source-over';
    mraf = mp.length ? requestAnimationFrame(tickMist) : 0;
    if (!mp.length) mx.clearRect(0, 0, mist.clientWidth, mist.clientHeight);
  }
  frameEl.addEventListener('click', spray);
  frameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spray(); } });

  // label foil
  const lc = $('#label-card');
  if (finePointer && !reduce) {
    lc.addEventListener('pointermove', e => {
      const r = lc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      lc.classList.remove('idle');
      lc.style.setProperty('--lx', (x * 100).toFixed(0) + '%'); lc.style.setProperty('--ly', (y * 100).toFixed(0) + '%');
      lc.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg'); lc.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
    });
    lc.addEventListener('pointerleave', () => { lc.classList.add('idle'); lc.style.setProperty('--rx', '0deg'); lc.style.setProperty('--ry', '0deg'); });
  }
  if (!reduce) lc.classList.add('idle');

  // mock reservation form — nothing is sent or stored
  const form = $('#reserve-form'), msg = $('#form-msg'), email = $('#email');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!email.checkValidity() || !email.value.trim()) { msg.textContent = '正しいメールアドレスを入力してください。'; email.focus(); return; }
    msg.textContent = 'ありがとうございます。デモのため、実際には送信されていません。'; form.reset();
  });
})();
