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

  // ---- DNA helix ----
  let phase = 0;
  function drawDNA() {
    const diag = Math.hypot(W, H);
    const amp = Math.max(70, Math.min(W, H) * 0.17);    // helix radius (big)
    const pitch = amp * 4.2;                             // length of one full turn
    const k = (Math.PI * 2) / pitch;
    const angle = -Math.atan2(H, W) * 0.85;              // diagonal: bottom-left -> top-right

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(angle);

    const half = diag / 2 + pitch;
    const step = 6;

    // base-pair rungs
    const rungGap = pitch / 10;
    const startRung = Math.floor((-half - phase / k) / rungGap) * rungGap;
    for (let t = startRung; t < half; t += rungGap) {
      const a = k * t + phase;
      const y1 = amp * Math.sin(a), y2 = -y1;
      const depth = (Math.cos(a) + 1) / 2;                // 0 back .. 1 front
      ctx.strokeStyle = `rgba(70, 110, 210, ${0.10 + 0.22 * depth})`;
      ctx.lineWidth = 2 + 2 * depth;
      ctx.beginPath();
      ctx.moveTo(t, y1);
      ctx.lineTo(t, y2);
      ctx.stroke();
      // nucleotide ends
      ctx.fillStyle = `rgba(90, 140, 240, ${0.18 + 0.35 * depth})`;
      ctx.beginPath(); ctx.arc(t, y1, 3 + 3 * depth, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(90, 140, 240, ${0.18 + 0.35 * (1 - depth)})`;
      ctx.beginPath(); ctx.arc(t, y2, 3 + 3 * (1 - depth), 0, Math.PI * 2); ctx.fill();
    }

    // two backbones, drawn in short segments so thickness follows depth
    for (const sign of [1, -1]) {
      for (let t = -half; t < half; t += step) {
        const a1 = k * t + phase, a2 = k * (t + step) + phase;
        const depth = (sign * Math.cos(a1) + 1) / 2;
        ctx.strokeStyle = `rgba(40, 80, 190, ${0.22 + 0.45 * depth})`;
        ctx.lineWidth = 3 + 6 * depth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t, sign * amp * Math.sin(a1));
        ctx.lineTo(t + step, sign * amp * Math.sin(a2));
        ctx.stroke();
      }
    }
    ctx.restore();
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
      ctx.font = `${c.size}px "DM Mono", monospace`;
      for (let i = 0; i < DIGITS_PER_COLUMN; i++) {
        const y = c.y - i * c.spacing;                   // i = 0 is the leading digit
        const x = c.x - i * c.spacing * c.drift;
        if (y < -20 || y > H + 20) continue;
        if (Math.random() < 0.004) c.digits[i] = c.digits[i] === '0' ? '1' : '0';
        const alpha = i === 0 ? 0.42 : 0.30 * (1 - i / DIGITS_PER_COLUMN) + 0.04;
        ctx.fillStyle = i === 0 ? `rgba(160, 220, 255, ${alpha})` : `rgba(100, 170, 240, ${alpha})`;
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
    phase += 0.6 * speedMul * dt;

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
