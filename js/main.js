// סטנגה בשכונה – לוגיקת המשחק
import * as THREE from 'three';
import { FIELD, BALL, PLAYER, POINTS, POTHOLES } from './config.js';
import { loadAll, onProgress, fitModel } from './assets.js';
import { buildWorld, animateWorld } from './world.js';
import { Player, KIDS } from './player.js';
import { AI } from './ai.js';
import { initInput, readIntent, endFrame, isTouchDevice, consumeEdge } from './input.js';
import { createRenderer } from './render.js';
import * as SFX from './audio.js';

const $ = (id) => document.getElementById(id);
const tmpV = new THREE.Vector3();

// ---------- מצב המשחק ----------
const G = {
  state: 'menu', // menu | setpiece | play | goal | over
  mode: 'ai', difficulty: 'medium', target: 21,
  time: 0, timeScale: 1, slowmo: 0,
  players: [], ai: null,
  ball: null,
  lastToucher: null, lastTouchTime: -10, lastKickTime: -10,
  shotType: 'kick', hits: new Set(), nutmegOf: null,
  kicker: null, goalTimer: 0, scores: [0, 0], paused: false,
  juggles: 0,
  other(p) { return p === this.players[0] ? this.players[1] : this.players[0]; },
  canTouch(p) {
    if (this.state === 'setpiece') return p === this.kicker;
    if (this.state !== 'play') return false;
    return this.lastToucher !== p || !this.ball.groundedSinceTouch;
  },
  kickSpeeds(type, p) {
    if (type === 'lob') return { h: 5 + 8 * p, vy: 4 + 4.5 * p };
    if (type === 'heel') return { h: 8 + 5 * p, vy: 0.9 };
    if (type === 'scissors') return { h: 15, vy: 2.0 };
    return { h: 7 + 15 * p, vy: 0.5 + 1.4 * p };
  },
};

let R, W, A;
let quality = 'high';

// ---------- אתחול ----------
async function boot() {
  initInput();
  quality = isTouchDevice() ? 'low' : (new URLSearchParams(location.search).get('q') || 'high');
  onProgress((p) => { $('load-bar').style.width = `${Math.round(p * 100)}%`; });
  try { await document.fonts.load('900 40px Rubik'); await document.fonts.load('400 40px "Secular One"'); } catch {}
  A = await loadAll();
  $('load-bar').style.width = '100%';
  R = await createRenderer($('game'), A, quality);
  W = buildWorld(R.scene, A);
  $('backend').textContent = R.backend;

  G.players = [new Player(R.scene, KIDS.p1), new Player(R.scene, KIDS.p2)];
  makeBall();
  placeForMenu();
  layoutCamera(true);

  $('loading').classList.add('hidden');
  $('menu').classList.remove('hidden');
  setupMenu();
  R.renderer.setAnimationLoop(loop);
  window.__ready = R.backend;
  window.__G = G;
}

function makeBall() {
  const group = new THREE.Group();
  let inner;
  if (A.models.dirty_football) {
    inner = fitModel(A.models.dirty_football.clone(), { maxDim: BALL.r * 2 });
    inner.position.y = -BALL.r;
  } else {
    inner = new THREE.Mesh(new THREE.SphereGeometry(BALL.r, 24, 16), new THREE.MeshStandardMaterial({ color: '#ddd' }));
    inner.castShadow = true;
  }
  const spin = new THREE.Group(); spin.add(inner); group.add(spin);
  R.scene.add(group);
  G.ball = { pos: new THREE.Vector3(0, BALL.r, 0), vel: new THREE.Vector3(), mesh: group, spin, groundedSinceTouch: true, hole: -1 };
}

function placeForMenu() {
  const [p1, p2] = G.players;
  p1.pos.set(-1.5, 0, 0.8); p1.facing = 0.2;
  p2.pos.set(1.8, 0, -0.6); p2.facing = Math.PI - 0.3;
  G.ball.pos.set(-0.6, BALL.r, 0.9); G.ball.vel.set(0, 0, 0);
}

// ---------- תפריט ----------
function setupMenu() {
  const sel = (group, key, cb) => {
    document.querySelectorAll(`[data-${group}]`).forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll(`[data-${group}]`).forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        G[key] = b.dataset[group] === String(+b.dataset[group]) ? +b.dataset[group] : b.dataset[group];
        if (cb) cb();
        SFX.initAudio(); SFX.sfxKick(0.2);
      });
    });
  };
  sel('mode', 'mode', () => { $('diff-row').style.display = G.mode === 'ai' ? '' : 'none'; });
  sel('diff', 'difficulty');
  sel('target', 'target');
  if (isTouchDevice()) {
    document.querySelector('[data-mode="2p"]').style.display = 'none';
  }
  $('btn-start').addEventListener('click', startMatch);
  $('btn-rules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('rules-close').addEventListener('click', () => $('rules').classList.add('hidden'));
  $('btn-again').addEventListener('click', startMatch);
  $('btn-menu').addEventListener('click', () => { $('over').classList.add('hidden'); toMenu(); });
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-quit').addEventListener('click', () => { $('pause').classList.add('hidden'); G.paused = false; toMenu(); });
  $('btn-sound').addEventListener('click', () => {
    SFX.setMuted(!SFX.muted);
    $('btn-sound').textContent = SFX.muted ? '🔇' : '🔊';
  });
  $('btn-music').addEventListener('click', () => {
    G.music = !G.music; SFX.setMusic(G.music);
    $('btn-music').classList.toggle('off', !G.music);
  });
  G.music = true;
  // מסך פתיחה בסגנון שנות ה-90: לחיצה ראשונה מפעילה סאונד
  const intro = $('intro');
  const go = () => {
    if (intro.classList.contains('hidden')) return;
    intro.classList.add('hidden');
    SFX.initAudio(); SFX.startAmbience(); SFX.sfxCheer(false);
  };
  intro.addEventListener('click', go);
  addEventListener('keydown', (e) => {
    if (!intro.classList.contains('hidden')) { go(); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (G.state === 'play' || G.state === 'setpiece' || G.paused)) togglePause();
  });
}

function toMenu() {
  G.state = 'menu';
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('menu').classList.remove('hidden');
  placeForMenu();
}

function togglePause() {
  if (G.state === 'menu' || G.state === 'over') return;
  G.paused = !G.paused;
  $('pause').classList.toggle('hidden', !G.paused);
}

function startMatch() {
  SFX.initAudio(); SFX.startAmbience();
  $('menu').classList.add('hidden');
  $('over').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouchDevice()) $('touch').classList.remove('hidden');
  G.scores = [0, 0];
  G.players[0].name = G.mode === 'ai' ? 'אתה (אבי)' : 'אבי';
  G.players[1].name = G.mode === 'ai' ? 'שמוליק מקומה 3' : 'שמוליק';
  G.players[0].speedMul = 1; G.players[1].speedMul = 1;
  G.ai = G.mode === 'ai' ? new AI(G, G.players[1], G.difficulty) : null;
  $('name1').textContent = G.players[0].name;
  $('name2').textContent = G.players[1].name;
  $('target-lbl').textContent = `משחקים עד ${G.target}`;
  updateScore();
  setPiece(G.players[0], 'פתיחה! אבי בועט מהאמצע');
  SFX.sfxWhistle(0.6);
}

// ---------- מצבים ----------
function setPiece(kicker, msg) {
  const other = G.other(kicker);
  G.state = 'setpiece';
  G.kicker = kicker;
  G.lastToucher = null;
  G.hits.clear(); G.nutmegOf = null;
  G.ball.pos.set(0, BALL.r, 0); G.ball.vel.set(0, 0, 0);
  G.ball.groundedSinceTouch = true;
  kicker.pos.set(-kicker.attackDir * 0.75, 0, 0); kicker.vel.set(0, 0, 0);
  kicker.facing = kicker.attackDir > 0 ? 0 : Math.PI;
  other.pos.set(-other.attackDir * (FIELD.goalX - 0.6), 0, 0); other.vel.set(0, 0, 0);
  other.facing = other.attackDir > 0 ? 0 : Math.PI;
  message(msg, 2600);
}

function registerTouch(p, type) {
  if (G.lastToucher === p && G.ball.groundedSinceTouch) { foul(p); return false; }
  if (G.lastToucher === p) { G.juggles++; if (G.juggles >= 2) pop(`הקפצה ×${G.juggles}`, '', '#fff', 700); }
  else G.juggles = 0;
  G.lastToucher = p;
  G.lastTouchTime = G.time;
  G.ball.groundedSinceTouch = false;
  G.shotType = type;
  G.hits.clear();
  G.nutmegOf = null;
  return true;
}

function foul(p) {
  const o = G.other(p);
  SFX.sfxWhistle(0.35); setTimeout(() => SFX.sfxWhistle(0.35), 420);
  setTimeout(() => SFX.shout(undefined, 'achi', 2), 900);
  pop('נגיעה כפולה!', `בעיטת עונשין ל${o.name} מקו האמצע`, '#ffcf3f', 1800);
  setPiece(o, `${p.name} נגע פעמיים ברצף. בעיטת עונשין!`);
}

function award(p, pts, title, color) {
  const i = G.players.indexOf(p);
  G.scores[i] += pts;
  updateScore(i);
  pop(title, `+${pts} ל${p.name}`, color, 1700);
}

function onGoal(goalSide) {
  // goalSide: +1 = השער הימני (של שחקן 2), -1 = השמאלי (של שחקן 1)
  const owner = goalSide > 0 ? G.players[1] : G.players[0];
  const scorer = G.lastToucher;
  G.state = 'goal';
  G.goalTimer = 2.4;
  G.concededBy = owner;
  if (!scorer || scorer === owner) {
    const o = G.other(owner);
    award(o, POINTS.goal, 'גול עצמי!', '#ff8a65');
    SFX.sfxCheer(false);
    return;
  }
  let pts = POINTS.goal, title = 'גול!', color = '#7CFC00';
  if (G.nutmegOf === owner) { pts = POINTS.nutmeg; title = 'בין הרגליים!!!'; color = '#ff4fd8'; }
  else if (G.shotType === 'scissors') { pts = POINTS.scissors; title = 'מספרת!!'; color = '#00e5ff'; }
  else if (G.shotType === 'heel') { pts = POINTS.heel; title = 'גול בעקב!'; color = '#ffd54f'; }
  award(scorer, pts, title, color);
  SFX.sfxCheer(pts >= 4);
  if (pts >= 4) G.slowmo = 1.2;
}

function checkWin() {
  const i = G.scores.findIndex((s) => s >= G.target);
  if (i < 0) return false;
  G.state = 'over';
  const w = G.players[i];
  $('over-title').textContent = `${w.name} ניצח!`;
  $('over-score').textContent = `${G.scores[0]} : ${G.scores[1]}`;
  $('over-sub').textContent = G.mode === 'ai' ? (i === 0 ? 'מלך השכונה! אמא קוראת לעלות לאכול 🍝' : 'שמוליק מקומה 3 לקח אותך... רוצה נקמה?') : 'מי שמפסיד מביא ארטיק לכולם 🍦';
  $('over').classList.remove('hidden');
  $('touch').classList.add('hidden');
  SFX.sfxCheer(true);
  return true;
}

// ---------- בעיטות ----------
function doKick(p, type, power) {
  const b = G.ball;
  const okState = G.state === 'play' || (G.state === 'setpiece' && p === G.kicker);
  const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
  const hd = Math.hypot(dx, dz);
  let ok = okState;
  if (ok) {
    if (type === 'scissors') ok = b.pos.y > 0.5 && b.pos.y < 2.2 && hd < 1.05;
    else if (type === 'heel') ok = b.pos.y < 0.6 && hd < PLAYER.reach;
    else ok = b.pos.y < 0.95 && hd < PLAYER.reach;
  }
  if (!ok) { p.play(type === 'scissors' ? 'scissors' : 'whiff'); return; }
  if (G.state === 'setpiece') { G.state = 'play'; hideMessage(); }
  if (!registerTouch(p, type)) return;

  const f = p.forward();
  let dir = f.clone();
  if (type === 'heel' || type === 'scissors') dir.negate();
  if (type === 'kick' || type === 'lob') {
    // סיוע כיוון עדין לעבר השער
    const gx = p.attackDir * FIELD.goalX;
    const tz = Math.max(-FIELD.postZ - 0.2, Math.min(FIELD.postZ + 0.2, b.pos.z + dir.z / Math.max(0.1, Math.abs(dir.x)) * Math.abs(gx - b.pos.x)));
    const to = tmpV.set(gx - b.pos.x, 0, tz - b.pos.z).normalize();
    if (dir.dot(to) > Math.cos(0.45) && Math.sign(dir.x) === p.attackDir) dir.lerp(to, 0.35).normalize();
  }
  const { h, vy } = G.kickSpeeds(type, power);
  const jitter = (Math.random() - 0.5) * 0.04;
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), jitter);
  b.vel.set(dir.x * h, vy, dir.z * h);
  if (b.pos.y < BALL.r + 0.01) b.pos.y = BALL.r + 0.01;
  p.play(type);
  G.lastKickTime = G.time;
  G.kickerGrace = p;
  SFX.sfxKick(type === 'scissors' ? 1 : power);
  if (type === 'scissors') { G.slowmo = 0.7; pop('מספרת!', '', '#00e5ff', 700); }
  if (type === 'heel') pop('עקב!', '', '#ffd54f', 600);
}

// ---------- פיזיקה ----------
function segCollide(b, ax, ay, az, bx, by, bz, rad, key, goalIdx) {
  // התנגשות כדור עם קטע (קורה/משקוף)
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = ((b.pos.x - ax) * abx + (b.pos.y - ay) * aby + (b.pos.z - az) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t, cy = ay + aby * t, cz = az + abz * t;
  const nx = b.pos.x - cx, ny = b.pos.y - cy, nz = b.pos.z - cz;
  const d = Math.hypot(nx, ny, nz);
  const minD = BALL.r + rad;
  if (d >= minD || d === 0) return;
  const ux = nx / d, uy = ny / d, uz = nz / d;
  b.pos.set(cx + ux * minD, cy + uy * minD, cz + uz * minD);
  const vn = b.vel.x * ux + b.vel.y * uy + b.vel.z * uz;
  if (vn < 0) {
    b.vel.x -= 1.72 * vn * ux; b.vel.y -= 1.72 * vn * uy; b.vel.z -= 1.72 * vn * uz;
    if (-vn > 1.5) {
      SFX.sfxClang();
      shake(0.15);
      const scorer = G.lastToucher;
      const owner = G.players[goalIdx];
      if (G.state === 'play' && scorer && scorer !== owner && !G.hits.has(key)) {
        G.hits.add(key);
        SFX.shout(undefined, Math.random() < 0.5 ? 'walla' : 'opa', 3);
        if (key.endsWith('bar')) award(scorer, POINTS.crossbar, 'משקוף!', '#ffb300');
        else award(scorer, POINTS.post, 'קורה!', '#ffb300');
        if (checkWin()) return;
      }
    }
  }
}

function playerBallCollide(p) {
  const b = G.ball;
  if (G.state === 'setpiece' || G.state === 'menu') return;
  if (p === G.kickerGrace && G.time - G.lastKickTime < PLAYER.grace) return;
  const top = b.pos.y + BALL.r, bot = b.pos.y - BALL.r;
  const circles = [];
  if (top > 0.55 && bot < 1.55) circles.push({ c: p.pos, r: PLAYER.bodyR, part: b.pos.y > 1.3 ? 'head' : 'body' });
  if (bot < 0.55) for (const lp of p.legPositions()) circles.push({ c: lp, r: PLAYER.legR, part: 'leg' });
  for (const { c, r, part } of circles) {
    const dx = b.pos.x - c.x, dz = b.pos.z - c.z;
    const d = Math.hypot(dx, dz);
    const minD = r + BALL.r;
    if (d >= minD) continue;
    const nx = d > 0 ? dx / d : 1, nz = d > 0 ? dz / d : 0;
    b.pos.x = c.x + nx * minD; b.pos.z = c.z + nz * minD;
    const rvx = b.vel.x - p.vel.x, rvz = b.vel.z - p.vel.z;
    const vn = rvx * nx + rvz * nz;
    if (vn < 0) {
      b.vel.x -= 1.35 * vn * nx; b.vel.z -= 1.35 * vn * nz;
      b.vel.x += p.vel.x * 0.25; b.vel.z += p.vel.z * 0.25;
    }
    if (part === 'head') {
      const f = p.forward();
      b.vel.x = b.vel.x * 0.4 + f.x * 6; b.vel.z = b.vel.z * 0.4 + f.z * 6; b.vel.y = Math.max(b.vel.y, 2.2);
      p.play('head');
    }
    if (G.state === 'play') {
      if (G.lastToucher === p && G.time - G.lastTouchTime < 0.3) return;
      if (registerTouch(p, part === 'head' ? 'head' : 'body')) SFX.sfxBounce(Math.abs(vn) + 1.5);
    }
    return;
  }
}

function stepBall(dt) {
  const b = G.ball;
  if (G.state === 'setpiece' || G.state === 'menu') return;
  const prev = b.pos.clone();
  b.vel.y -= BALL.gravity * dt;
  const drag = 1 - BALL.airDrag * dt;
  b.vel.x *= drag; b.vel.z *= drag;
  b.pos.addScaledVector(b.vel, dt);
  // קרקע
  if (b.pos.y <= BALL.r) {
    b.pos.y = BALL.r;
    if (b.vel.y < -1.0) {
      SFX.sfxBounce(-b.vel.y);
      b.vel.y = -b.vel.y * BALL.restitution;
      b.vel.x *= 0.9; b.vel.z *= 0.9;
    } else {
      b.vel.y = 0;
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (sp > 0) {
        const ns = Math.max(0, sp - (BALL.rollFriction * sp * 0.35 + 0.45) * dt);
        b.vel.x *= ns / sp; b.vel.z *= ns / sp;
      }
    }
    b.groundedSinceTouch = true;
    // בורות באספלט – קפיצה לכיוון אקראי
    let inHole = -1;
    POTHOLES.forEach((h, i) => { if (Math.hypot(b.pos.x - h.x, b.pos.z - h.z) < h.r * 0.85) inHole = i; });
    if (inHole >= 0 && inHole !== b.hole) {
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (sp > 0.6) {
        const ang = (Math.random() - 0.5) * 1.3;
        const c = Math.cos(ang), s = Math.sin(ang);
        const vx = b.vel.x * c - b.vel.z * s, vz = b.vel.x * s + b.vel.z * c;
        b.vel.x = vx * 0.72; b.vel.z = vz * 0.72; b.vel.y = 0.6 + sp * 0.18;
        SFX.sfxBounce(3);
        if (sp > 3) pop('בור!', '', '#bbb', 500);
      } else { b.vel.x *= 0.5; b.vel.z *= 0.5; }
    }
    b.hole = inHole;
  }
  // גבולות – חומות ומשוכות
  if (Math.abs(b.pos.x) > FIELD.boundX) { b.pos.x = Math.sign(b.pos.x) * FIELD.boundX; b.vel.x *= -0.55; SFX.sfxBounce(Math.abs(b.vel.x) * 2); }
  if (Math.abs(b.pos.z) > FIELD.boundZ) { b.pos.z = Math.sign(b.pos.z) * FIELD.boundZ; b.vel.z *= -0.45; SFX.sfxBounce(Math.abs(b.vel.z) * 2); }
  // קורות ומשקופים
  const { goalX, postZ, goalH, postR } = FIELD;
  [-1, 1].forEach((s, gi) => {
    const gx = s * goalX;
    for (const pz of [-postZ, postZ]) segCollide(b, gx, 0, pz, gx, goalH, pz, postR, `${gi}-post${pz}`, gi);
    segCollide(b, gx, goalH, -postZ, gx, goalH, postZ, postR, `${gi}-bar`, gi);
  });
  // שער?
  if (G.state === 'play') {
    for (const [gi, s] of [[0, -1], [1, 1]]) {
      const gx = s * goalX;
      if ((prev.x - gx) * s < 0 && (b.pos.x - gx) * s >= 0 && Math.abs(b.pos.z) < postZ - 0.02 && b.pos.y < goalH) {
        onGoal(s);
        return;
      }
    }
    // בין הרגליים
    for (const p of G.players) {
      if (p === G.lastToucher) continue;
      if (b.pos.y < 0.4 && Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 0.2) G.nutmegOf = p;
    }
  }
  for (const p of G.players) playerBallCollide(p);
}

function stepPlayer(p, intent, dt) {
  let wx = intent.wx, wz = intent.wz;
  const max = PLAYER.speed * p.speedMul * (p.charge > 0 ? 0.6 : 1);
  const tvx = wx * max, tvz = wz * max;
  const dvx = tvx - p.vel.x, dvz = tvz - p.vel.z;
  const dl = Math.hypot(dvx, dvz), maxDv = PLAYER.accel * dt;
  if (dl > maxDv) { p.vel.x += dvx / dl * maxDv; p.vel.z += dvz / dl * maxDv; } else { p.vel.x = tvx; p.vel.z = tvz; }
  p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
  p.pos.x = Math.max(-FIELD.boundX + 0.3, Math.min(FIELD.boundX - 0.3, p.pos.x));
  p.pos.z = Math.max(-FIELD.boundZ + 0.3, Math.min(FIELD.boundZ - 0.3, p.pos.z));
  // כיוון פנים
  let target = null;
  if (intent.face != null) target = intent.face;
  else if (Math.hypot(wx, wz) > 0.15) target = Math.atan2(wz, wx);
  if (target != null) {
    let d = target - p.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.facing += d * Math.min(1, PLAYER.turnRate * dt);
  }
  // בבעיטה חופשית – היריב מתרחק 3 מטר
  if (G.state === 'setpiece' && p !== G.kicker) {
    const dx = p.pos.x - G.ball.pos.x, dz = p.pos.z - G.ball.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 3) { p.pos.x = G.ball.pos.x + dx / (d || 1) * 3; p.pos.z = G.ball.pos.z + dz / (d || 1) * 3; }
  }
}

function separatePlayers() {
  const [a, b] = G.players;
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
  const d = Math.hypot(dx, dz), min = 0.62;
  if (d < min && d > 0) {
    const push = (min - d) / 2;
    a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
    b.pos.x += dx / d * push; b.pos.z += dz / d * push;
  }
}

// ---------- קלט ----------
const camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
function screenToWorld(it) {
  return { wx: camRight.x * it.x + camUp.x * it.y, wz: camRight.z * it.x + camUp.z * it.y };
}

function humanControl(p, mode, dt) {
  const it = readIntent(mode);
  const w = screenToWorld(it);
  const out = { wx: w.wx, wz: w.wz, face: null };
  if (G.state === 'goal' || G.state === 'over') { out.wx *= 0.5; out.wz *= 0.5; }
  const held = it.kick ? 'kick' : it.lob ? 'lob' : null;
  if (held) { p.charging = held; p.charge = Math.min(1, p.charge + dt / 0.7); }
  else if (p.charging) { doKick(p, p.charging, 0.15 + 0.85 * p.charge); p.charging = null; p.charge = 0; }
  if (it.heel) doKick(p, 'heel', 0.7);
  if (it.scissors) doKick(p, 'scissors', 1);
  return out;
}

// ---------- מצלמה ----------
const camTarget = new THREE.Vector3();
let portrait = false;
function layoutCamera(snap) {
  const cam = R.camera;
  portrait = innerWidth / innerHeight < 0.95;
  const tilt = THREE.MathUtils.degToRad(portrait ? 58 : 50);
  const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const aspect = innerWidth / innerHeight;
  const hw = portrait ? 7 : 10, hd = portrait ? 10.5 : 7;
  const dist = Math.max(hw / (vt * aspect), hd * Math.sin(tilt) / vt) * 1.05;
  const b = G.ball ? G.ball.pos : new THREE.Vector3();
  const focus = G.state === 'menu' ? new THREE.Vector3(0, 0, 0.5) : new THREE.Vector3(
    THREE.MathUtils.clamp(b.x * 0.85, portrait ? -8 : -8.5, portrait ? 8 : 8.5), 0,
    THREE.MathUtils.clamp(b.z * 0.7, portrait ? -4.5 : -4, portrait ? 4.5 : 3.5));
  if (snap) camTarget.copy(focus); else camTarget.lerp(focus, 0.06);
  const off = portrait
    ? new THREE.Vector3(-Math.cos(tilt), Math.sin(tilt), 0).multiplyScalar(dist)
    : new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist);
  cam.position.copy(camTarget).add(off);
  if (G.shake > 0) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake, 0));
  cam.lookAt(camTarget);
  cam.updateMatrixWorld();
  camRight.setFromMatrixColumn(cam.matrixWorld, 0); camRight.y = 0; camRight.normalize();
  cam.getWorldDirection(camUp); camUp.y = 0; camUp.normalize();
  // שמש עוקבת אחרי המצלמה לצללים חדים
  R.sun.target.position.set(camTarget.x, 0, camTarget.z);
  R.sun.position.set(camTarget.x - 22, 24, camTarget.z + 16);
}
function shake(a) { G.shake = Math.max(G.shake || 0, a); }

// ---------- HUD ----------
function updateScore(bump) {
  $('score1').textContent = G.scores[0];
  $('score2').textContent = G.scores[1];
  if (bump != null) {
    const el = $(bump === 0 ? 'score1' : 'score2');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
}
let popTimer = null;
function pop(title, sub, color, ms) {
  const el = $('pop');
  el.querySelector('.t').textContent = title;
  el.querySelector('.s').textContent = sub || '';
  el.style.setProperty('--c', color || '#fff');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(popTimer);
  popTimer = setTimeout(() => el.classList.remove('show'), ms || 1400);
}
let msgTimer = null;
function message(t, ms) {
  const el = $('msg'); el.textContent = t; el.classList.add('show');
  clearTimeout(msgTimer); msgTimer = setTimeout(hideMessage, ms || 2500);
}
function hideMessage() { $('msg').classList.remove('show'); }

function updateTurnHud() {
  const [p1, p2] = G.players;
  for (const p of G.players) {
    let st = 'no';
    if (G.state === 'setpiece') st = p === G.kicker ? 'yes' : 'wait';
    else if (G.state === 'play') st = G.canTouch(p) ? 'yes' : 'no';
    else st = 'wait';
    p.setTurn(st);
  }
  let t = '';
  if (G.state === 'play') {
    const a = G.canTouch(p1), b = G.canTouch(p2);
    if (a && b) t = 'הכדור באוויר – אפשר להקפיץ!';
    else t = `תור: ${(a ? p1 : p2).name}`;
  } else if (G.state === 'setpiece') t = `בעיטה: ${G.kicker.name}`;
  $('turn').textContent = t;
  $('turn').style.color = G.state === 'play' && G.canTouch(p1) && !G.canTouch(p2) ? '#7fc4ff' : G.state === 'play' && G.canTouch(p2) && !G.canTouch(p1) ? '#ff8a80' : '#ffe082';
}

// ---------- לולאה ----------
let last = performance.now();
const STEP = 1 / 120;
let acc = 0;
function loop() {
  const now = performance.now();
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.paused) { R.render(); endFrame(); return; }
  if (G.slowmo > 0) { G.slowmo -= dt; G.timeScale = 0.35; } else G.timeScale += (1 - G.timeScale) * 0.15;
  dt *= G.timeScale;
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 0.8);

  // שליטה
  let intents = [{ wx: 0, wz: 0 }, { wx: 0, wz: 0 }];
  if (G.state !== 'menu') {
    intents[0] = humanControl(G.players[0], G.mode === 'ai' ? 'p1-solo' : 'p1', dt);
    if (G.ai) {
      const out = G.ai.think(dt);
      intents[1] = out;
      if (out.action) doKick(G.players[1], out.action.type, out.action.power);
    } else intents[1] = humanControl(G.players[1], 'p2', dt);
  } else {
    // בתפריט – הילדים מתמסרים בעצלתיים
    const t = G.time;
    intents[0] = { wx: 0, wz: 0, face: 0.2 + Math.sin(t * 0.5) * 0.3 };
    intents[1] = { wx: 0, wz: 0, face: Math.PI - 0.3 };
  }

  acc += dt;
  while (acc >= STEP) {
    acc -= STEP;
    stepPlayer(G.players[0], intents[0], STEP);
    stepPlayer(G.players[1], intents[1], STEP);
    separatePlayers();
    stepBall(STEP);
    if (G.state === 'goal' || G.state === 'over') break;
  }
  if (G.state === 'goal') {
    G.goalTimer -= dt;
    if (G.goalTimer <= 0 && !checkWin()) setPiece(G.concededBy, `${G.concededBy.name} בועט מהאמצע`);
  }

  // עדכון גרפי
  for (const p of G.players) p.update(dt, G.time);
  const b = G.ball;
  b.mesh.position.copy(b.pos);
  const sp = Math.hypot(b.vel.x, b.vel.z);
  if (sp > 0.01) {
    const axis = tmpV.set(b.vel.z, 0, -b.vel.x).normalize();
    b.spin.rotateOnWorldAxis(axis, sp / BALL.r * dt);
  }
  animateWorld(W, G.time);
  layoutCamera(false);
  if (G.state !== 'menu') updateTurnHud();
  R.render();
  endFrame();
}

addEventListener('resize', () => R && layoutCamera(true));
boot().catch((e) => {
  console.error(e);
  $('load-msg').textContent = 'שגיאה בטעינה: ' + e.message;
});
