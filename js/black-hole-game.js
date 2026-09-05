(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const horizon = 455;
  const ui = {
    overlay: document.getElementById('gameOverlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'),
    start: document.getElementById('startButton'), pause: document.getElementById('pauseButton'), sound: document.getElementById('soundButton'),
    progress: document.getElementById('progressValue'), score: document.getElementById('scoreValue'), lives: document.getElementById('livesValue'),
    phaseIndex: document.getElementById('phaseIndex'), phaseTitle: document.getElementById('phaseTitle'), phaseDescription: document.getElementById('phaseDescription'),
    phaseTrack: document.getElementById('phaseTrack'), coord: document.getElementById('coordinateValue'), toast: document.getElementById('eventToast')
  };

  const state = { mode: 'ready', running: false, paused: false, score: 0, lives: 3, explored: 0, sound: true, round: 1, insideAt: 0, exitAt: 0, last: 0 };
  const keys = { left: false, right: false };
  const paddle = { x: W / 2, y: 655, w: 150, h: 15, target: W / 2 };
  const ball = { x: W / 2, y: 623, vx: 0, vy: 0, r: 6, trail: [] };
  const portal = { x: 250, w: 105, hue: 270, targetX: 250 };
  const visited = new Set();
  const cols = 58, rows = 23;
  let audio;

  function tone(freq, length = .08, type = 'sine', volume = .035) {
    if (!state.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type; osc.frequency.value = freq; gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + length);
      osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + length);
    } catch (_) { /* audio is optional */ }
  }

  function resetBall() {
    state.mode = 'docked'; ball.x = paddle.x; ball.y = paddle.y - 15; ball.vx = 0; ball.vy = 0; ball.trail.length = 0;
    portalSector('本局固定'); setPhase(1);
  }

  function launch() {
    if (!state.running || state.paused || state.mode !== 'docked') return;
    state.mode = 'flight';
    ball.vx = (portal.x - ball.x) * .55 + (Math.random() - .5) * 80;
    ball.vy = -620;
    tone(390, .12, 'triangle', .05);
    showToast('B / 探索球已发射');
  }

  function startGame() {
    if (state.mode === 'gameover' || state.mode === 'complete') restart();
    state.running = true; state.paused = false; ui.overlay.classList.add('hidden'); resetBall();
    ui.pause.innerHTML = '<span>Ⅱ</span> 暂停';
  }

  function restart() {
    state.score = 0; state.lives = 3; state.round = 1; state.explored = 0; visited.clear();
    paddle.x = W / 2; paddle.target = W / 2; movePortal(true); updateHud();
  }

  function togglePause() {
    if (!state.running || state.mode === 'gameover') return;
    state.paused = !state.paused;
    ui.pause.innerHTML = state.paused ? '<span>▶</span> 继续' : '<span>Ⅱ</span> 暂停';
    if (state.paused) {
      ui.title.textContent = '勘探已暂停'; ui.text.textContent = '黑洞仍在等待。准备好后继续任务。'; ui.start.textContent = '继续勘探 ↗'; ui.overlay.classList.remove('hidden');
    } else { ui.overlay.classList.add('hidden'); state.last = performance.now(); }
  }

  function movePortal(initial = false) {
    portal.targetX = 110 + Math.random() * (W - 220);
    if (initial) portal.x = portal.targetX;
    const sector = String(Math.floor(portal.targetX / W * 90) + 10).padStart(2, '0');
    ui.coord.textContent = `C-${sector} / 本局固定`;
  }

  function portalSector(status = '本局固定') {
    const sector = String(Math.floor(portal.x / W * 90) + 10).padStart(2, '0');
    ui.coord.textContent = `C-${sector} / ${status}`;
  }

  function enterBlackHole(now) {
    state.mode = 'inside'; state.insideAt = now; state.exitAt = now + 3300 + Math.random() * 2400;
    ball.y = horizon - ball.r - 3; ball.vy = -Math.max(420, Math.abs(ball.vy) * .78);
    ball.vx = (Math.random() < .5 ? -1 : 1) * (190 + Math.random() * 170);
    clearPixelAt(ball.x, ball.y);
    portal.hue = (portal.hue + 83) % 360; state.score += 150; portalSector('入口锁定'); setPhase(2); tone(92, .45, 'sawtooth', .045); showToast('C / 已穿越固定入口'); updateHud();
  }

  function exitBlackHole() {
    state.mode = 'returning'; ball.y = horizon + ball.r + 2;
    ball.vx *= .72; ball.vy = 430 + Math.min(130, state.round * 14);
    state.score += 250; portalSector('已通过'); setPhase(3); tone(620, .18, 'triangle', .055); showToast('B / 已穿过 C，准备回收'); updateHud();
  }

  function catchBall() {
    state.score += 500 + Math.round(state.explored * 10); state.round++;
    paddle.w = Math.max(105, 150 - state.round * 3); tone(740, .1, 'sine', .06); setTimeout(() => tone(980, .12, 'sine', .04), 70);
    showToast('A / 回收成功 +500'); resetBall(); updateHud();
  }

  function damage() {
    state.lives--; tone(62, .5, 'square', .05); showToast('警告 / 探索球结构受损'); updateHud();
    if (state.lives <= 0) {
      state.mode = 'gameover'; state.running = false; ui.title.textContent = '探测器已失联';
      ui.text.textContent = `最终探索 ${state.explored.toFixed(1)}% · 得分 ${state.score}`; ui.start.textContent = '重新校准 ↗'; ui.overlay.classList.remove('hidden');
    } else resetBall();
  }

  function setPhase(n) {
    const phases = [
      ['捕获信号', '校准 A 发射器，让 B 探索球保持在你的回收范围内。'],
      ['穿越未知', 'B 正在逐格擦除黑暗，随后必须返回同一个 C 入口。'],
      ['紧急回收', '返回轨迹已确认！移动 A，在探索球坠毁前接住它。']
    ];
    ui.phaseIndex.textContent = `0${n} / 03`; ui.phaseTitle.innerHTML = `<i></i> ${phases[n - 1][0]}`;
    ui.phaseDescription.textContent = phases[n - 1][1]; ui.phaseTrack.style.width = `${n * 33.333}%`;
  }

  function showToast(message) {
    ui.toast.textContent = message; ui.toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => ui.toast.classList.remove('show'), 1400);
  }

  function updateHud() {
    ui.progress.textContent = `${state.explored.toFixed(1)}%`; ui.score.textContent = String(Math.round(state.score)).padStart(4, '0');
    ui.lives.textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '●' : '○').join(' ');
  }

  function clearPixelAt(x, y) {
    const gx = Math.floor(x / W * cols);
    const gy = Math.floor((y - 20) / (horizon - 20) * rows);
    if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return false;
    const key = `${gx},${gy}`;
    if (visited.has(key)) return false;
    visited.add(key);
    state.explored = Math.min(100, visited.size / (cols * rows) * 100);
    state.score += 2;
    return true;
  }

  function collideWithPixel(previousX, previousY) {
    const cellW = W / cols, cellH = (horizon - 20) / rows;
    const horizontalHit = Math.abs(ball.vx / cellW) > Math.abs(ball.vy / cellH);
    const probeX = ball.x + (horizontalHit ? Math.sign(ball.vx) * ball.r : 0);
    const probeY = ball.y + (!horizontalHit ? Math.sign(ball.vy) * ball.r : 0);
    if (!clearPixelAt(probeX, probeY)) return;

    ball.x = previousX; ball.y = previousY;
    if (horizontalHit) {
      ball.vx *= -.94;
      ball.vy += (Math.random() - .5) * 95;
    } else {
      ball.vy *= -.94;
      ball.vx += (Math.random() - .5) * 95;
    }
    tone(235 + Math.random() * 80, .035, 'square', .018);
  }

  function update(dt, now) {
    const speed = 610;
    if (keys.left) paddle.target -= speed * dt;
    if (keys.right) paddle.target += speed * dt;
    paddle.target = Math.max(paddle.w / 2 + 15, Math.min(W - paddle.w / 2 - 15, paddle.target));
    paddle.x += (paddle.target - paddle.x) * Math.min(1, dt * 14);
    portal.x += (portal.targetX - portal.x) * Math.min(1, dt * 3);
    portal.hue = (portal.hue + dt * 38) % 360;

    if (state.mode === 'docked') { ball.x = paddle.x; ball.y = paddle.y - 19; return; }
    if (!['flight', 'inside', 'returning'].includes(state.mode)) return;
    const previousX = ball.x, previousY = ball.y;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
    if (ball.trail.length > 24) ball.trail.shift();
    ball.trail.forEach(p => p.life -= dt * 2.3);

    if (ball.x < ball.r + 8) { ball.x = ball.r + 8; ball.vx = Math.abs(ball.vx); tone(180, .03); }
    if (ball.x > W - ball.r - 8) { ball.x = W - ball.r - 8; ball.vx = -Math.abs(ball.vx); tone(180, .03); }

    if (state.mode === 'flight') {
      if (ball.y <= horizon && ball.vy < 0) {
        const inPortal = Math.abs(ball.x - portal.x) < portal.w / 2;
        if (inPortal) enterBlackHole(now);
        else { ball.y = horizon + ball.r; ball.vy = Math.abs(ball.vy) * .96; tone(130, .08, 'square', .025); }
      }
      if (ball.y > H + 30) damage();
    } else if (state.mode === 'inside') {
      collideWithPixel(previousX, previousY);
      const returningToGate = now > state.exitAt;
      if (returningToGate) {
        const dx = portal.x - ball.x;
        ball.vx *= Math.pow(.965, dt * 60);
        ball.vx += dx * 1.4 * dt;
        ball.vy += 310 * dt;
        portalSector('回航锁定');
      } else {
        ball.vx += Math.sin(now * .0027) * 18 * dt;
        ball.vy += Math.cos(now * .0021) * 14 * dt;
      }
      if (ball.y < 35) { ball.y = 35; ball.vy = Math.abs(ball.vy); }
      if (ball.y > horizon - ball.r) {
        const throughGate = returningToGate && Math.abs(ball.x - portal.x) < portal.w * .42 && ball.vy > 0;
        if (throughGate) exitBlackHole();
        else { ball.y = horizon - ball.r; ball.vy = -Math.max(150, Math.abs(ball.vy) * .86); }
      }
      updateHud();
    } else if (state.mode === 'returning') {
      ball.vy += 260 * dt;
      const paddleTop = paddle.y - paddle.h / 2;
      if (ball.vy > 0 && ball.y + ball.r >= paddleTop && ball.y - ball.r <= paddle.y + paddle.h && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) catchBall();
      else if (ball.y > H + 30) damage();
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, horizon, 0, H); bg.addColorStop(0, '#e9e8e3'); bg.addColorStop(1, '#dcdad3'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // The black hole is a field of discrete rectangular pixels. Explored pixels are cleared to white.
    const cellW = W / cols, cellH = (horizon - 20) / rows;
    ctx.fillStyle = '#303137'; ctx.fillRect(0, 20, W, horizon - 20);
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const cleared = visited.has(`${gx},${gy}`);
      const shade = 4 + ((gx * 17 + gy * 11) % 9);
      ctx.fillStyle = cleared ? '#f7f6f1' : `rgb(${shade},${shade + 1},${shade + 4})`;
      ctx.fillRect(gx * cellW + 1.1, 20 + gy * cellH + 1.1, cellW - 2.2, cellH - 2.2);
      if (cleared && (gx + gy) % 4 === 0) {
        ctx.fillStyle = `hsla(${portal.hue + gx * 3} 85% 62% / .14)`;
        ctx.fillRect(gx * cellW + 1.1, 20 + gy * cellH + 1.1, cellW - 2.2, cellH - 2.2);
      }
    }
    ctx.fillStyle = '#9b9da5'; ctx.font = '500 10px DM Mono, monospace'; ctx.fillText('D  /  PIXEL VOID', 24, 45);

    // chromatic portal
    const pg = ctx.createLinearGradient(portal.x - portal.w / 2, 0, portal.x + portal.w / 2, 0);
    [0, .25, .5, .75, 1].forEach((p, i) => pg.addColorStop(p, `hsl(${portal.hue + i * 72} 95% 60%)`));
    ctx.save(); ctx.shadowColor = `hsl(${portal.hue} 100% 60%)`; ctx.shadowBlur = 22; ctx.fillStyle = pg;
    roundedRect(portal.x - portal.w / 2, horizon - 7, portal.w, 14, 7); ctx.fill();
    ctx.globalAlpha = .24; roundedRect(portal.x - portal.w * .34, horizon - 44, portal.w * .68, 50, 18); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#676970'; ctx.font = '500 10px DM Mono, monospace'; ctx.fillText('C / PIGMENT GATE', portal.x - 55, horizon + 29);
    ctx.strokeStyle = 'rgba(17,18,22,.18)'; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke(); ctx.setLineDash([]);

    // return-space grid
    ctx.strokeStyle = 'rgba(17,18,22,.055)';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, horizon); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = horizon; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // trail
    ball.trail.forEach((p, i) => { if (p.life <= 0) return; ctx.globalAlpha = Math.max(0, p.life) * .45; ctx.fillStyle = state.mode === 'inside' ? `hsl(${portal.hue + i * 5} 90% 65%)` : '#101116'; ctx.beginPath(); ctx.arc(p.x, p.y, 2 + i / 12, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;

    // paddle A
    ctx.save(); ctx.shadowColor = 'rgba(80,90,0,.35)'; ctx.shadowBlur = 18; ctx.fillStyle = '#d6ff00'; roundedRect(paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h, 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#111216'; ctx.fillRect(paddle.x - 19, paddle.y - 12, 38, 5); ctx.font = '700 10px DM Mono, monospace'; ctx.fillText('A', paddle.x - 3.5, paddle.y + 28);

    // ball B
    ctx.save(); ctx.shadowColor = state.mode === 'inside' ? `hsl(${portal.hue} 100% 65%)` : '#000'; ctx.shadowBlur = state.mode === 'inside' ? 22 : 8;
    ctx.fillStyle = state.mode === 'inside' ? '#ffffff' : '#121318'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = state.mode === 'inside' ? `hsl(${portal.hue + 120} 100% 55%)` : '#d6ff00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r - 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (state.mode !== 'inside') { ctx.fillStyle = '#111216'; ctx.font = '700 10px DM Mono, monospace'; ctx.fillText('B', ball.x + 16, ball.y + 4); }
  }

  function loop(now) {
    const dt = Math.min(.034, (now - (state.last || now)) / 1000); state.last = now;
    if (state.running && !state.paused) update(dt, now); draw(); requestAnimationFrame(loop);
  }

  function pointerMove(clientX) {
    const rect = canvas.getBoundingClientRect(); paddle.target = (clientX - rect.left) / rect.width * W;
  }
  canvas.addEventListener('pointermove', e => pointerMove(e.clientX));
  canvas.addEventListener('pointerdown', e => {
    pointerMove(e.clientX);
    if (state.mode === 'docked') {
      paddle.x = paddle.target;
      ball.x = paddle.x;
      launch();
    }
  });
  window.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft') keys.left = true; if (e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'Space') { if (!state.running) startGame(); else if (state.paused) togglePause(); else launch(); }
    if (e.code === 'KeyP') togglePause();
  });
  window.addEventListener('keyup', e => { if (e.code === 'ArrowLeft') keys.left = false; if (e.code === 'ArrowRight') keys.right = false; });
  ui.start.addEventListener('click', () => state.paused ? togglePause() : startGame());
  ui.pause.addEventListener('click', togglePause);
  ui.sound.addEventListener('click', () => { state.sound = !state.sound; ui.sound.setAttribute('aria-pressed', String(state.sound)); if (state.sound) tone(520); });
  window.addEventListener('blur', () => { if (state.running && !state.paused) togglePause(); });
  movePortal(true); updateHud(); setPhase(1); draw(); requestAnimationFrame(loop);
})();
