(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('gameStage');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayKicker = document.getElementById('overlayKicker');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayCopy = document.getElementById('overlayCopy');
  const overlayIcon = document.getElementById('overlayIcon');
  const gameOverDialogue = document.getElementById('gameOverDialogue');
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const dialogueBadge = document.getElementById('dialogueBadge');
  const liveNote = document.getElementById('liveNote');
  const flapAudio = document.getElementById('flapAudio');
  const gameOverAudio = document.getElementById('gameOverAudio');

  const W = 480;
  const H = 800;
  const GROUND = 714;
  const BIRD_X = 145;
  const GAP_WIDTH = 210;
  const PIPE_WIDTH = 86;
  const PIPE_SPACING = 270;
  const face = new Image();
  face.src = 'assets/bird-face.png';

  let state = 'ready';
  let bird = { x: BIRD_X, y: 375, velocity: 0, flapPulse: 0 };
  let pipes = [];
  let score = 0;
  let best = 0;
  let elapsed = 0;
  let worldScroll = 0;
  let lastFrame = 0;
  let badgeTimer = 0;
  let groundOffset = 0;
  let particles = [];
  let previousGap = 398;

  try { best = Number(localStorage.getItem('astraSkyHopBest') || 0); } catch (_) { best = 0; }
  bestEl.textContent = String(best);

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  new ResizeObserver(resizeCanvas).observe(stage);
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function roundedRect(x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function playClip(audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    } catch (_) { /* Playback can be unavailable until the browser receives a gesture. */ }
  }

  function showFlapDialogue() {
    dialogueBadge.textContent = 'Dialogue 1';
    dialogueBadge.classList.add('show');
    badgeTimer = 0.72;
    playClip(flapAudio);
  }

  function startGame() {
    score = 0;
    elapsed = 0;
    pipes = [];
    particles = [];
    previousGap = 398;
    worldScroll = 0;
    bird = { x: BIRD_X, y: 375, velocity: 0, flapPulse: 0 };
    scoreEl.textContent = '0';
    state = 'playing';
    overlay.classList.add('hidden');
    gameOverDialogue.hidden = true;
    liveNote.textContent = 'Nice and steady. Watch the next gap.';
    spawnPipe(W + 85);
  }

  function flap() {
    if (state !== 'playing') startGame();
    bird.velocity = -465;
    bird.flapPulse = 1;
    showFlapDialogue();
    for (let i = 0; i < 4; i++) {
      particles.push({ x: bird.x - 26, y: bird.y + 6 + Math.random() * 13, vx: -45 - Math.random() * 50, vy: (Math.random() - .5) * 70, life: .25 + Math.random() * .18, max: .43, r: 2 + Math.random() * 2, color: i % 2 ? '#fff3b3' : '#ffffff' });
    }
  }

  function spawnPipe(x) {
    const margin = 158;
    const gap = Math.max(170, GAP_WIDTH - Math.floor(score / 8) * 2);
    const shift = (Math.random() - .5) * 195;
    let gapY = Math.max(margin, Math.min(GROUND - margin, previousGap + shift));
    if (Math.random() < .45) gapY = margin + Math.random() * (GROUND - margin * 2);
    previousGap = gapY;
    pipes.push({ x, gapY, gap, scored: false, seed: Math.random() * 10 });
  }

  function endGame() {
    if (state !== 'playing') return;
    state = 'over';
    burst(bird.x, bird.y, 20);
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      try { localStorage.setItem('astraSkyHopBest', String(best)); } catch (_) { /* Private browsing can block storage. */ }
    }
    overlayKicker.textContent = 'DIALOGUE 2';
    overlayTitle.textContent = 'Game over!';
    overlayCopy.textContent = `Astra flew past ${score} ${score === 1 ? 'pipe' : 'pipes'}. Ready for another try?`;
    overlayIcon.textContent = '✦';
    gameOverDialogue.hidden = false;
    startButton.textContent = 'Play again';
    overlay.classList.remove('hidden');
    liveNote.textContent = 'That was a close one. Give it another go!';
    dialogueBadge.classList.remove('show');
    playClip(gameOverAudio);
  }

  function burst(x, y, amount) {
    const colors = ['#ffd46b', '#fff5ce', '#f68f73', '#ffffff'];
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 65 + Math.random() * 210;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .35 + Math.random() * .45, max: .8, r: 2 + Math.random() * 4, color: colors[i % colors.length] });
    }
  }

  function drawCloud(x, y, scale, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y + 7 * scale, 46 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 24 * scale, y + 6 * scale, 22 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 1 * scale, y - 7 * scale, 26 * scale, 23 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 26 * scale, y + 5 * scale, 25 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#59aee5'); sky.addColorStop(.57, '#91d6f0'); sky.addColorStop(1, '#d6eff0');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // distant soft sun halo
    const sun = ctx.createRadialGradient(375, 100, 2, 375, 100, 92);
    sun.addColorStop(0, 'rgba(255,246,190,.67)'); sun.addColorStop(1, 'rgba(255,246,190,0)');
    ctx.fillStyle = sun; ctx.fillRect(280, 5, 190, 190);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 117 - worldScroll * (.13 + i * .012)) % (W + 155) + W + 155) % (W + 155) - 70;
      const y = 116 + ((i * 139) % 390);
      drawCloud(x, y, .58 + (i % 3) * .14, .64);
    }
    // city silhouette in the distance
    ctx.fillStyle = '#a7d8e4';
    const skylineBase = 672;
    const buildings = [34,52,31,67,43,29,58,38,76,33,51,28,62,39,70,34,48,64,30];
    let x = -((worldScroll * .24) % 64);
    let i = 0;
    while (x < W) {
      const bw = 23 + (i % 3) * 5;
      const bh = buildings[i % buildings.length];
      ctx.fillRect(x, skylineBase - bh, bw, bh + 5);
      ctx.fillStyle = 'rgba(255,255,255,.48)';
      for (let wy = skylineBase - bh + 9; wy < skylineBase - 4; wy += 13) {
        ctx.fillRect(x + 5, wy, 3, 4); ctx.fillRect(x + 14, wy, 3, 4);
      }
      ctx.fillStyle = '#a7d8e4'; x += bw + 9; i++;
    }
    // treetops
    ctx.fillStyle = '#52966f'; ctx.beginPath(); ctx.moveTo(0, 686);
    for (let px = 0; px <= W + 16; px += 16) {
      const py = 680 + Math.sin((px + worldScroll * .2) * .045) * 8 + Math.sin(px * .12) * 3;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  function drawPipe(pipe) {
    const x = pipe.x;
    const gapTop = pipe.gapY - pipe.gap / 2;
    const gapBottom = pipe.gapY + pipe.gap / 2;
    const capH = 26;
    const right = x + PIPE_WIDTH;

    // lower pipe stem and cap
    drawPipeStem(x + 7, gapBottom + capH - 1, PIPE_WIDTH - 14, GROUND - (gapBottom + capH) + 4, false, pipe.seed);
    drawPipeCap(x, gapBottom - 2, PIPE_WIDTH, capH, false, pipe.seed);
    // upper pipe stem and cap
    drawPipeStem(x + 7, 0, PIPE_WIDTH - 14, gapTop - capH + 2, true, pipe.seed + 1);
    drawPipeCap(x, gapTop - capH, PIPE_WIDTH, capH, true, pipe.seed + 1);

    // inner highlight helps define the opening
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x + 6, gapTop - 2, 3, 13);
    ctx.fillRect(x + 6, gapBottom - 11, 3, 13);
    ctx.fillStyle = 'rgba(20,89,60,.27)';
    ctx.fillRect(right - 7, gapTop - 2, 3, 13);
    ctx.fillRect(right - 7, gapBottom - 11, 3, 13);
  }

  function drawPipeStem(x, y, w, h, inverted, seed) {
    if (h <= 0) return;
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#277d4a'); grad.addColorStop(.2, '#59b967'); grad.addColorStop(.53, '#43a95b'); grad.addColorStop(.84, '#319451'); grad.addColorStop(1, '#216f47');
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(226,255,192,.35)'; ctx.fillRect(x + 8, y, 5, h);
    ctx.fillStyle = 'rgba(15,78,49,.22)'; ctx.fillRect(x + w - 12, y, 5, h);
    ctx.fillStyle = 'rgba(17,78,52,.42)'; ctx.fillRect(x, inverted ? y + h - 4 : y, w, 4);
    // rivets on the stem
    for (let ry = y + 24 + ((seed * 13) % 24); ry < y + h - 8; ry += 47) {
      drawRivet(x + 5, ry); drawRivet(x + w - 5, ry);
    }
  }

  function drawPipeCap(x, y, w, h, upper, seed) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#267347'); grad.addColorStop(.18, '#64c16c'); grad.addColorStop(.51, '#4caf5e'); grad.addColorStop(.83, '#348b4e'); grad.addColorStop(1, '#206740');
    ctx.fillStyle = grad; roundedRect(x, y, w, h, 7); ctx.fill();
    ctx.fillStyle = 'rgba(226,255,189,.45)'; roundedRect(x + 7, y + 3, 7, h - 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(15,71,44,.26)'; ctx.fillRect(x + 2, upper ? y + h - 5 : y + 1, w - 4, 4);
    ctx.strokeStyle = 'rgba(24,94,51,.5)'; ctx.lineWidth = 1.5; roundedRect(x + .75, y + .75, w - 1.5, h - 1.5, 7); ctx.stroke();
    for (const rx of [x + 8, x + w - 8]) {
      drawRivet(rx, y + h / 2);
    }
  }

  function drawRivet(x, y) {
    ctx.fillStyle = 'rgba(18,78,48,.42)'; ctx.beginPath(); ctx.arc(x + 1, y + 1, 3.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c3d7a1'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - .7, y - .7, .8, 0, Math.PI * 2); ctx.fill();
  }

  function drawGround(dt) {
    const top = GROUND;
    ctx.fillStyle = '#398749'; ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = '#86c95e'; ctx.fillRect(0, top, W, 12);
    ctx.fillStyle = '#c2e67d'; ctx.fillRect(0, top, W, 3);
    groundOffset = (groundOffset + currentSpeed() * dt) % 42;
    for (let x = -42 + groundOffset; x < W; x += 42) {
      ctx.fillStyle = 'rgba(26,100,55,.24)';
      ctx.beginPath(); ctx.moveTo(x, top + 13); ctx.lineTo(x + 22, top + 13); ctx.lineTo(x + 8, H); ctx.lineTo(x - 13, H); ctx.closePath(); ctx.fill();
    }
    // tiny grass strokes
    ctx.strokeStyle = 'rgba(213,248,151,.43)'; ctx.lineWidth = 2;
    for (let x = 5; x < W; x += 27) {
      const yy = top + 19 + ((x * 7) % 48);
      ctx.beginPath(); ctx.moveTo(x, yy + 4); ctx.lineTo(x + 3, yy); ctx.stroke();
    }
  }

  function drawBird() {
    const x = bird.x, y = bird.y;
    const tilt = Math.max(-.38, Math.min(.58, bird.velocity / 850));
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    // soft shadow and golden body
    ctx.fillStyle = 'rgba(32,81,94,.16)'; ctx.beginPath(); ctx.ellipse(2, 22, 34, 13, 0, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createLinearGradient(-31, 0, 35, 25);
    body.addColorStop(0, '#ffbd45'); body.addColorStop(.55, '#ffdf77'); body.addColorStop(1, '#f7a934');
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 9, 34, 27, -.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(193,126,41,.42)'; ctx.lineWidth = 2; ctx.stroke();
    // tail feathers
    ctx.fillStyle = '#f2a73a'; ctx.beginPath(); ctx.moveTo(-28, 9); ctx.lineTo(-44, 0); ctx.lineTo(-39, 17); ctx.closePath(); ctx.fill();
    // fluttering wing
    ctx.save(); ctx.translate(-9, 13); ctx.rotate(-.22 + Math.sin(elapsed * 16) * .16 - bird.flapPulse * .45);
    ctx.fillStyle = '#eea82d'; ctx.beginPath(); ctx.ellipse(-4, 0, 18, 11, -.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe17f'; ctx.beginPath(); ctx.ellipse(-3, -2, 13, 7, -.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // orange beak
    ctx.fillStyle = '#ee8443'; ctx.beginPath(); ctx.moveTo(25, 5); ctx.lineTo(46, 11); ctx.lineTo(26, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb451'; ctx.beginPath(); ctx.moveTo(26, 9); ctx.lineTo(43, 12); ctx.lineTo(27, 14); ctx.closePath(); ctx.fill();
    // friend's face from the supplied image, clipped to a soft portrait silhouette
    if (face.complete && face.naturalWidth) {
      ctx.save();
      ctx.shadowColor = 'rgba(53,88,97,.23)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      ctx.drawImage(face, -32, -57, 68, 82);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f2c19c'; ctx.beginPath(); ctx.ellipse(0, -12, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27394b'; ctx.beginPath(); ctx.arc(0, -27, 23, Math.PI, Math.PI * 2); ctx.fill();
    }
    // sparkle
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(21, -31, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 230 * dt; p.life -= dt;
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
  }

  function currentSpeed() { return Math.min(330, 194 + score * 2.2); }

  function update(dt) {
    elapsed += dt;
    if (state === 'playing') {
      bird.velocity += 1450 * dt;
      bird.y += bird.velocity * dt;
      bird.flapPulse = Math.max(0, bird.flapPulse - dt * 4.2);
      worldScroll += currentSpeed() * dt;
      for (const pipe of pipes) {
        pipe.x -= currentSpeed() * dt;
        const left = bird.x - 24, right = bird.x + 28;
        const top = bird.y - 31, bottom = bird.y + 27;
        const gapTop = pipe.gapY - pipe.gap / 2;
        const gapBottom = pipe.gapY + pipe.gap / 2;
        if (right > pipe.x && left < pipe.x + PIPE_WIDTH && (top < gapTop || bottom > gapBottom)) {
          endGame(); break;
        }
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.scored = true; score += 1; scoreEl.textContent = String(score);
          liveNote.textContent = score === 1 ? 'First pipe cleared! Keep flapping.' : `${score} pipes cleared. Nice flying!`;
          if (score > best) {
            best = score; bestEl.textContent = String(best);
            try { localStorage.setItem('astraSkyHopBest', String(best)); } catch (_) { /* Private browsing can block storage. */ }
          }
        }
      }
      if (pipes.length && pipes[pipes.length - 1].x < W - PIPE_SPACING) spawnPipe(W + 24);
      pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -20);
      if (bird.y - 31 < 0 || bird.y + 27 > GROUND) endGame();
    } else if (state === 'ready') {
      elapsed += dt * .1;
      bird.y = 375 + Math.sin(elapsed * 2.2) * 7;
      bird.flapPulse = Math.max(0, bird.flapPulse - dt * 2);
      worldScroll += 22 * dt;
    }
    if (badgeTimer > 0) {
      badgeTimer -= dt;
      if (badgeTimer <= 0) dialogueBadge.classList.remove('show');
    }
  }

  function render(dt) {
    drawSky();
    for (const pipe of pipes) drawPipe(pipe);
    drawGround(dt);
    drawBird();
    drawParticles(dt);
    if (state === 'playing' && score > 0 && score % 5 === 0) {
      // The standard score display stays in the HUD; this keeps the playfield uncluttered.
    }
  }

  function frameLoop(now) {
    const dt = Math.min(.035, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    render(dt);
    requestAnimationFrame(frameLoop);
  }
  requestAnimationFrame(frameLoop);

  function handleFlapInput(event) {
    if (event) event.preventDefault();
    flap();
  }

  canvas.addEventListener('pointerdown', handleFlapInput, { passive: false });
  startButton.addEventListener('click', () => { startGame(); flap(); });
  restartButton.addEventListener('click', () => { startGame(); flap(); });
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      flap();
    }
  });
})();
