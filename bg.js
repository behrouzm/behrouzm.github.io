/* Animated background: diagonal navy DNA helix + falling binary columns.
   Both speed up while the page is scrolled and ease back to normal afterwards. */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1;
  let columns = [];

  // ---- speed control (shared by DNA and digits) ----
  const BASE_SPEED = 1;
  let boost = 0;                 // extra speed added by scrolling
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    boost = Math.min(boost + dy * 0.015, 2.5);   // "a bit" faster, capped
  }, { passive: true });

  // ---- binary rain setup ----
  const DIGITS_PER_COLUMN = 10;
  function makeColumn(i, count) {
    const slot = W / count;
    const spacing = 34 + Math.random() * 22;            // vertical gap between digits
    return {
      x: slot * i + slot * (0.25 + Math.random() * 0.5),
      y: Math.random() * (H + spacing * DIGITS_PER_COLUMN) - spacing * DIGITS_PER_COLUMN,
      speed: 0.55 + Math.random() * 0.6,                 // each column its own pace
      drift: (Math.random() - 0.5) * 0.45,               // each column its own slant
      spacing,
      size: 13 + Math.random() * 5,
      digits: Array.from({ length: DIGITS_PER_COLUMN }, () => (Math.random() < 0.5 ? '0' : '1')),
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.max(5, Math.min(14, Math.round(W / 120)));
    columns = Array.from({ length: count }, (_, i) => makeColumn(i, count));
  }
  window.addEventListener('resize', () => { resize(); if (reduceMotion) frame(performance.now()); });
  resize();

  // ---- DNA helix (B-DNA: ~10.5 bp per turn, unequal major/minor grooves) ----
  let spin = 0;        // rotation of the helix around its own axis
  let shift = 0;       // travel of the helix along its axis
  const PAIRS = ['AT', 'TA', 'CG', 'GC'];
  const pairAt = n => PAIRS[((n * 2654435761) >>> 0) % 4];   // stable pseudo-random sequence
  const GROOVE = Math.PI * 0.72;                               // strand phase offset -> major/minor grooves

  function drawDNA() {
    const diag = Math.hypot(W, H);
    const amp = Math.max(90, Math.min(220, Math.min(W, H) * 0.21));  // helix radius
    const pitch = amp * 3.4;                                          // B-DNA pitch/diameter ~1.7
    const k = (Math.PI * 2) / pitch;
    const gap = pitch / 10.5;                                         // rise per base pair
    const ang = -Math.atan2(H, W) * 0.85;
    const ca = Math.cos(ang), sa = Math.sin(ang), cx = W / 2, cy = H / 2;
    const P = (t, y) => [cx + t * ca - y * sa, cy + t * sa + y * ca];  // helix frame -> screen
    const half = diag / 2 + pitch;
    const phaseAt = t => k * (t - shift) + spin;

    // backbone segments, split into back and front layers for a 3D look
    const step = 5, back = [], front = [];
    for (const off of [0, GROOVE]) {
      for (let t = -half; t < half; t += step) {
        const a1 = phaseAt(t) + off, a2 = phaseAt(t + step) + off;
        const depth = (Math.cos(a1) + 1) / 2;
        const seg = { p1: P(t, amp * Math.sin(a1)), p2: P(t + step, amp * Math.sin(a2)), depth };
        (depth < 0.5 ? back : front).push(seg);
      }
    }
    const drawSegs = segs => {
      ctx.lineCap = 'round';
      for (const s of segs) {
        ctx.strokeStyle = `rgba(30, 58, 138, ${0.16 + 0.40 * s.depth})`;
        ctx.lineWidth = 8 + 10 * s.depth;
        ctx.beginPath(); ctx.moveTo(s.p1[0], s.p1[1]); ctx.lineTo(s.p2[0], s.p2[1]); ctx.stroke();
      }
    };
    drawSegs(back);

    // base pairs: letters + dotted hydrogen bonds (A-T: 2, C-G: 3)
    const n0 = Math.floor((-half - shift) / gap), n1 = Math.ceil((half - shift) / gap);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let n = n0; n <= n1; n++) {
      const t = n * gap + shift;
      const a = phaseAt(t);
      const y1 = amp * Math.sin(a), y2 = amp * Math.sin(a + GROOVE);
      const d = Math.abs(y2 - y1);
      if (d < 40) continue;                                   // edge-on pairs are hidden
      const depth = ((Math.cos(a) + Math.cos(a + GROOVE)) / 2 + 1) / 2;
      const alpha = 0.22 + 0.42 * depth;
      const pair = pairAt(n);
      const dir = Math.sign(y2 - y1);
      const yA = y1 + dir * 16, yB = y2 - dir * 16;           // letter positions near each strand
      const bonds = pair === 'AT' || pair === 'TA' ? 2 : 3;

      // dotted H-bonds between the two letters
      ctx.fillStyle = `rgba(30, 58, 138, ${alpha})`;
      const inner1 = yA + dir * 12, inner2 = yB - dir * 12;
      const len = Math.abs(inner2 - inner1);
      const dots = Math.max(2, Math.floor(len / 7));
      for (let b = 0; b < bonds; b++) {
        const dt = (b - (bonds - 1) / 2) * 5;                 // parallel bond lines
        for (let i = 0; i <= dots; i++) {
          const yy = inner1 + (inner2 - inner1) * (i / dots);
          const [x, y] = P(t + dt, yy);
          ctx.beginPath(); ctx.arc(x, y, 1.4 + 0.6 * depth, 0, Math.PI * 2); ctx.fill();
        }
      }
      // base letters
      ctx.font = `700 ${Math.round(12 + 6 * depth)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = `rgba(13, 42, 120, ${alpha + 0.1})`;
      let [x, y] = P(t, yA); ctx.fillText(pair[0], x, y);
      [x, y] = P(t, yB); ctx.fillText(pair[1], x, y);
    }

    drawSegs(front);
  }

  // ---- binary rain ----
  function drawDigits(dt, speedMul) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of columns) {
      const v = 38 * c.speed * speedMul * dt;            // px moved this frame
      c.y += v;
      c.x += v * c.drift;
      const len = c.spacing * DIGITS_PER_COLUMN;
      if (c.y - len > H || c.x < -40 || c.x > W + 40) {
        Object.assign(c, makeColumn(Math.floor(Math.random() * columns.length), columns.length));
        c.y = -c.spacing;
      }
      ctx.font = `500 ${c.size}px "JetBrains Mono", monospace`;
      for (let i = 0; i < DIGITS_PER_COLUMN; i++) {
        const y = c.y - i * c.spacing;                   // i = 0 is the leading digit
        const x = c.x - i * c.spacing * c.drift;
        if (y < -20 || y > H + 20) continue;
        if (Math.random() < 0.004) c.digits[i] = c.digits[i] === '0' ? '1' : '0';
        const alpha = i === 0 ? 0.40 : 0.28 * (1 - i / DIGITS_PER_COLUMN) + 0.05;
        ctx.fillStyle = i === 0 ? `rgba(11, 122, 106, ${alpha})` : `rgba(37, 99, 235, ${alpha})`;
        ctx.fillText(c.digits[i], x, y);
      }
    }
  }

  // ---- main loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    boost *= Math.pow(0.12, dt);                         // ease back to normal speed
    const speedMul = BASE_SPEED + boost;
    spin += 0.55 * speedMul * dt;
    shift += 22 * speedMul * dt;

    ctx.clearRect(0, 0, W, H);
    drawDNA();
    drawDigits(dt, speedMul);
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    frame(performance.now());                            // one static frame
  } else {
    requestAnimationFrame(frame);
  }
})();
