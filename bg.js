/* Animated background: a vertical DNA double helix built from glowing particles
   (small blue/cyan squares with yellow-green sparks), rotating on a dark navy field
   with soft bokeh lights. Speeds up slightly while the page is scrolled. */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  // ---- scroll-linked speed ----
  let boost = 0, lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    boost = Math.min(boost + Math.abs(window.scrollY - lastY) * 0.012, 2);
    lastY = window.scrollY;
  }, { passive: true });

  // ---- palette ----
  const BLUES = ['#2f8bff', '#45a8ff', '#63c4ff', '#8fdcff', '#1f6fe0'];
  const LIMES = ['#c9f24b', '#b5e93a', '#e2ff6b'];

  // ---- particles ----
  // helix particles live in helix space (s = position in turns), so they rotate together
  const TURNS = 3;
  let helix = [], bokeh = [], dust = [];
  function build() {
    helix = [];
    for (let t = 0; t < TURNS; t++) {
      for (let strand = 0; strand < 2; strand++) {
        for (let i = 0; i < 520; i++) {
          helix.push({
            s: t + Math.random(), kind: strand,
            jr: rand(-0.16, 0.16), jy: rand(-0.035, 0.035),
            size: rand(1.2, 4.2), hollow: Math.random() < 0.55,
            color: Math.random() < 0.16 ? pick(LIMES) : pick(BLUES),
            tw: rand(0, Math.PI * 2),
          });
        }
      }
      // ~10 base pairs per turn, particles spread across each rung
      for (let b = 0; b < 10; b++) {
        const s0 = t + (b + 0.5) / 10;
        for (let i = 0; i < 75; i++) {
          helix.push({
            s: s0 + rand(-0.012, 0.012), kind: 2, u: rand(-0.92, 0.92),
            jr: 0, jy: rand(-0.02, 0.02),
            size: rand(1.2, 3.8), hollow: Math.random() < 0.5,
            color: Math.random() < 0.22 ? pick(LIMES) : pick(BLUES),
            tw: rand(0, Math.PI * 2),
          });
        }
      }
    }
    bokeh = Array.from({ length: Math.round(Math.max(14, W / 70)) }, () => ({
      x: rand(0, W), y: rand(0, H), r: rand(14, 34),
      vx: rand(-6, 6), vy: rand(-10, -2),
      rgb: Math.random() < 0.45 ? [120, 200, 60] : [40, 110, 255],
      a: rand(0.12, 0.32),
    }));
    dust = Array.from({ length: Math.round(Math.max(40, W / 22)) }, () => ({
      x: rand(0, W), y: rand(0, H), size: rand(3, 9),
      vx: rand(-4, 4), vy: rand(-8, 2),
      color: Math.random() < 0.3 ? pick(LIMES) : pick(BLUES),
      tw: rand(0, Math.PI * 2),
    }));
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }
  window.addEventListener('resize', () => { resize(); if (reduceMotion) frame(performance.now()); });
  resize();

  let spin = 0, rise = 0, clock = 0;

  function drawBackground() {
    const g = ctx.createRadialGradient(W * 0.68, H * 0.1, 0, W * 0.68, H * 0.35, Math.max(W, H) * 0.9);
    g.addColorStop(0, '#13285a');
    g.addColorStop(0.35, '#08142f');
    g.addColorStop(1, '#02050d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function square(x, y, s, color, alpha, hollow) {
    ctx.globalAlpha = alpha;
    if (hollow) {
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.8, s * 0.28);
      ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    } else {
      ctx.fillStyle = color; ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  function drawBokeh(dt, mul) {
    for (const b of bokeh) {
      b.x += b.vx * dt * mul; b.y += b.vy * dt * mul;
      if (b.y < -60) { b.y = H + 60; b.x = rand(0, W); }
      if (b.x < -60) b.x = W + 60;
      if (b.x > W + 60) b.x = -60;
      const [r, g2, bl] = b.rgb;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(${r},${g2},${bl},${b.a})`);
      g.addColorStop(0.6, `rgba(${r},${g2},${bl},${b.a * 0.6})`);
      g.addColorStop(1, `rgba(${r},${g2},${bl},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawHelix() {
    const cx = W > 900 ? W * 0.7 : W * 0.5;
    const R = Math.max(80, Math.min(170, W * 0.13));   // helix radius
    const pitch = R * 4.4;                              // height of one turn
    const top = H / 2 - (pitch * TURNS) / 2;

    const glow = ctx.createRadialGradient(cx, H * 0.45, 0, cx, H * 0.45, R * 2.6);
    glow.addColorStop(0, 'rgba(60,130,255,0.16)');
    glow.addColorStop(1, 'rgba(60,130,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - R * 3, 0, R * 6, H);

    ctx.globalCompositeOperation = 'lighter';
    for (const p of helix) {
      let s = (p.s + rise) % TURNS;
      if (s < 0) s += TURNS;
      const y = top + (s + p.jy) * pitch;
      if (y < -20 || y > H + 20) continue;
      const theta = s * Math.PI * 2 + spin;
      let x, z;
      if (p.kind === 2) {
        x = Math.cos(theta) * p.u; z = Math.sin(theta) * p.u;
      } else {
        const off = p.kind === 0 ? 0 : Math.PI, rr = 1 + p.jr;
        x = Math.cos(theta + off) * rr; z = Math.sin(theta + off) * rr;
      }
      const depth = (z + 1) / 2;                                    // 0 back .. 1 front
      const twinkle = 0.75 + 0.25 * Math.sin(clock * 3 + p.tw);
      square(cx + x * R, y, p.size * (0.65 + 0.7 * depth), p.color, (0.25 + 0.75 * depth) * twinkle, p.hollow);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawDust(dt, mul) {
    ctx.globalCompositeOperation = 'lighter';
    for (const d of dust) {
      d.x += d.vx * dt * mul; d.y += d.vy * dt * mul;
      if (d.y < -20) { d.y = H + 20; d.x = rand(0, W); }
      if (d.y > H + 20) d.y = -20;
      if (d.x < -20) d.x = W + 20;
      if (d.x > W + 20) d.x = -20;
      square(d.x, d.y, d.size, d.color, 0.35 + 0.35 * Math.sin(clock * 1.5 + d.tw), true);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    boost *= Math.pow(0.12, dt);
    const mul = 1 + boost;
    spin += 0.45 * mul * dt;      // rotation around the vertical axis
    rise += 0.035 * mul * dt;     // slow drift of the molecule along its axis
    clock += dt;

    drawBackground();
    drawBokeh(dt, mul);
    drawHelix();
    drawDust(dt, mul);
    if (!reduceMotion) requestAnimationFrame(frame);
  }
  if (reduceMotion) frame(performance.now()); else requestAnimationFrame(frame);
})();
