/* FIG & MOON — real 3D perfume bottle (Three.js r128, loaded on demand from cdnjs).
   Glass flacon + rose liquid + brushed-gold cap + the label artwork, lit by a procedural "moonlit studio".
   Units: 1 unit = 100 px of the source photo. Falls back to the flat cutout image if WebGL/Three is unavailable. */
(() => {
  'use strict';
  const SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const load = () => new Promise((ok, no) => {
    if (window.THREE) return ok();
    const s = document.createElement('script'); s.src = SRC; s.onload = ok; s.onerror = () => no(new Error('three.js failed to load'));
    document.head.appendChild(s);
  });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function rrShape(T, w, h, r) {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  // rounded, bevelled box (total size w × h × d)
  function rrBox(T, w, h, d, r, b) {
    const g = new T.ExtrudeGeometry(rrShape(T, w - 2 * b, h - 2 * b, Math.max(0.01, r - b)), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 12 });
    g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals();
    return g;
  }

  function brushedGold(T) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#b48f55'); gr.addColorStop(.5, '#d5b47a'); gr.addColorStop(1, '#b08a50');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) {
      const y = Math.random() * 512, x = Math.random() * 512, l = 60 + Math.random() * 420, light = Math.random() < .5;
      g.fillStyle = light ? `rgba(255,236,190,${.015 + Math.random() * .035})` : `rgba(70,45,15,${.015 + Math.random() * .035})`;
      g.fillRect(x, y, l, .5 + Math.random() * .9);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4; t.repeat.set(.5, 1);
    return t;
  }

  function moonlitStudio(T, renderer) {
    const pm = new T.PMREMGenerator(renderer), sc = new T.Scene();
    sc.background = new T.Color(0x000000);
    const panel = (geo, pos, col, k) => {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); sc.add(m);
    };
    panel(new T.PlaneGeometry(14, 9), [0, 15, 4], 0xfff3e0, 2.6);          // overhead softbox
    panel(new T.PlaneGeometry(3, 18), [14, 1, 7], 0xffd9a6, 4.5);          // warm right strip
    panel(new T.PlaneGeometry(3, 18), [-14, 1, 5], 0xc9bcff, 2.2);          // cool left strip
    panel(new T.PlaneGeometry(16, 4), [0, -7, 13], 0xffb8d2, .9);          // rose fill from below
    panel(new T.PlaneGeometry(10, 7), [2, 3, 17], 0xffe9c4, 3.2);          // warm front softbox (lights the gold faces)
    panel(new T.CircleGeometry(4.2, 48), [-7, 11, -15], 0xf2f0ff, 5);       // the moon, behind
    panel(new T.PlaneGeometry(5, 14), [9, 2, -12], 0xd7cfff, 2.4);          // back rim strip
    const tex = pm.fromScene(sc, 0.03).texture; pm.dispose();
    return tex;
  }

  function loadLabelTexture(T) {
    return new Promise((ok, no) => {
      const im = new Image(); im.onload = () => {
        try {
          const sx = 80, sy = 96, sw = 865, sh = 1356, c = document.createElement('canvas'); c.width = 864; c.height = 1356;
          c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; ok(t);
        } catch (e) { no(e); }
      };
      im.onerror = no; im.src = 'assets/fig-moon-label.png';
    });
  }

  async function init(frame, canvas, opts = {}) {
    await load();
    const T = window.THREE, reduce = !!opts.reduce;
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const env = moonlitStudio(T, renderer);
    const labelTex = await loadLabelTexture(T);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(20, 1, 1, 200);
    camera.position.set(0, 0, 40); camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xcfc8ff, 0x2a1840, .18));
    const key = new T.DirectionalLight(0xffe2b8, 1.1); key.position.set(8, 10, 12); scene.add(key);
    const fill = new T.DirectionalLight(0xa89cff, .9); fill.position.set(-10, 2, 8); scene.add(fill);
    const rim = new T.DirectionalLight(0xdfe0ff, 1.3); rim.position.set(-4, 8, -12); scene.add(rim);

    const bottle = new T.Group(); scene.add(bottle);
    const BW = 6.1, BH = 9.17, BD = 3.6, BY = -1.235;       // glass body
    const reflect = { color: 0xffffff, metalness: 1, roughness: .07, envMap: env, transparent: true, depthWrite: false,
      // additive light that leaves the canvas alpha untouched (plain additive would turn the glass into opaque black on a transparent canvas)
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor };

    // glass body: faint tint + additive environment reflections (bright streaks on the bevels, none on the flat faces)
    const bodyGeo = rrBox(T, BW, BH, BD, .5, .16);
    const tint = new T.Mesh(bodyGeo, new T.MeshPhysicalMaterial({ color: 0xd9d0ff, roughness: .04, metalness: 0, transparent: true, opacity: .04, depthWrite: false, envMap: env, envMapIntensity: .25 }));
    const refl = new T.Mesh(bodyGeo, new T.MeshStandardMaterial({ ...reflect, roughness: .14, envMapIntensity: .16, opacity: .9 }));
    const reflBack = new T.Mesh(bodyGeo, new T.MeshStandardMaterial({ ...reflect, roughness: .14, envMapIntensity: .08, opacity: .6, side: T.BackSide }));
    [tint, refl, reflBack].forEach(m => { m.position.y = BY; bottle.add(m); });

    // thick glass base
    const baseGeo = rrBox(T, BW - .9, 1.05, BD - .9, .35, .12);
    const base = new T.Mesh(baseGeo, new T.MeshPhysicalMaterial({ color: 0xcfc6f0, roughness: .06, transparent: true, opacity: .14, depthWrite: false, envMap: env, envMapIntensity: .4 }));
    base.position.y = BY - BH / 2 + .62; bottle.add(base);
    const baseR = new T.Mesh(baseGeo, new T.MeshStandardMaterial({ ...reflect, roughness: .14, envMapIntensity: .14, opacity: .8 })); baseR.position.copy(base.position); bottle.add(baseR);

    // rose liquid
    const liqH = 7.55, liqGeo = rrBox(T, BW - 1.0, liqH, BD - 1.0, .3, .12);
    const liquid = new T.Mesh(liqGeo, new T.MeshStandardMaterial({ color: 0xe8719f, roughness: .15, metalness: 0, transparent: true, opacity: .6, depthWrite: false, emissive: 0xc2336f, emissiveIntensity: .42, envMap: env, envMapIntensity: .3, side: T.DoubleSide }));
    liquid.position.y = BY - BH / 2 + 1.1 + liqH / 2; liquid.renderOrder = 1; bottle.add(liquid);

    // label: printed paper on the front face (unlit so the artwork keeps its true colours)
    const LH = 7.2, LW = LH * (864 / 1356), LY = -1.26;
    const front = new T.Mesh(new T.PlaneGeometry(LW, LH), new T.MeshBasicMaterial({ map: labelTex, color: 0xf1f1f1, toneMapped: false }));
    front.position.set(0, LY, BD / 2 + .012); front.renderOrder = 2; bottle.add(front);

    // brushed-gold collar + cap
    const goldTex = brushedGold(T);
    const gold = new T.MeshStandardMaterial({ color: 0xffe3a8, map: goldTex, bumpMap: goldTex, bumpScale: .04, metalness: 1, roughness: .27, envMap: env, envMapIntensity: 1.9 });
    const collar = new T.Mesh(new T.CylinderGeometry(1.02, 1.08, .58, 48), gold); collar.position.y = 3.56; bottle.add(collar);
    const ring = new T.Mesh(new T.CylinderGeometry(1.14, 1.14, .1, 48), gold); ring.position.y = 3.3; bottle.add(ring);
    const cap = new T.Mesh(rrBox(T, 4.83, 2.0, 3.0, .12, .07), gold); cap.position.y = 4.81; bottle.add(cap);

    // ---------- sizing: the canvas is wider/taller than the frame so the rotating bottle is never clipped ----------
    let cw = 1, ch = 1;
    function resize() {
      const r = canvas.getBoundingClientRect(); cw = Math.max(2, r.width); ch = Math.max(2, r.height);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      // frame height ≙ 12.2 units; the canvas is 1.12× the frame height
      const visH = 12.2 * (ch / (frame.clientHeight || ch));
      camera.position.z = (visH / 2) / Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      camera.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(frame);

    // ---------- interaction: hover follows the cursor around the whole section, touch drags ----------
    const sec = frame.closest('section') || document.body;
    let tx = .32, ty = .05, rx = tx, ry = ty, active = false, dragging = false, lastX = 0, idleT = 0, visible = true;
    const set = (cx, cy) => {
      const r = frame.getBoundingClientRect(), nx = clamp((cx - (r.left + r.width / 2)) / (innerWidth * .45), -1, 1), ny = clamp((cy - (r.top + r.height / 2)) / (innerHeight * .5), -1, 1);
      tx = nx * 1.0; ty = ny * .22; active = true;
    };
    sec.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !reduce) set(e.clientX, e.clientY); else if (dragging) { tx = clamp(tx + (e.clientX - lastX) * .012, -1.15, 1.15); lastX = e.clientX; active = true; } });
    sec.addEventListener('pointerleave', () => { active = false; });
    frame.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { dragging = true; lastX = e.clientX; } });
    addEventListener('pointerup', () => { dragging = false; });
    frame.style.touchAction = 'pan-y';
    if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(frame);

    let last = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (!visible) { last = now; return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now; idleT += dt;
      if (!active && !dragging && !reduce) { tx = .32 + Math.sin(idleT * .55) * .3; ty = .05 + Math.sin(idleT * .4 + 1) * .05; }
      const k = 1 - Math.pow(.0009, dt);                       // frame-rate independent damping
      ry += (tx - ry) * k; rx += (ty - rx) * k;
      bottle.rotation.y = ry; bottle.rotation.x = rx;
      bottle.position.y = reduce ? 0 : Math.sin(idleT * 1.1) * .05;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
    frame.classList.add('gl-ready');

    return {
      // CSS-pixel position (relative to the canvas box) of a point in bottle space, plus the bottle's facing
      project(x, y, z) {
        const v = new T.Vector3(x, y, z); bottle.updateMatrixWorld(); v.applyMatrix4(bottle.matrixWorld).project(camera);
        return { x: (v.x + 1) / 2 * cw, y: (1 - v.y) / 2 * ch, facing: Math.sin(bottle.rotation.y) };
      },
    };
  }
  window.Bottle3D = { init };
})();
