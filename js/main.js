// סטנגה בשכונה – לוגיקת המשחק
import * as THREE from 'three';
import { FIELD, BALL, PLAYER, POINTS, POTHOLES } from './config.js';
import { loadAll, onProgress, fitModel } from './assets.js';
import { buildWorld, animateWorld } from './world.js';
import { Player, KIDS, EXTRA_KIDS } from './player.js';
import { AI } from './ai.js';
import { initInput, readIntent, endFrame, isTouchDevice, consumeEdge } from './input.js';
import { createRenderer } from './render.js';
import * as SFX from './audio.js';
import { initTournament, recordResult, T as TOUR, LEVEL_NAME } from './tournament.js';
import { NET, initNet, setOpen, sendSnapshot, sendInput, sendEvent, endMatch } from './net.js';

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
  makeExtras();
  placeExtrasAtSpots();
  makeBall();
  placeForMenu();
  layoutCamera(true);

  $('loading').classList.add('hidden');
  setupMenu();
  R.renderer.setAnimationLoop(loop);
  initTournament((level) => startMatch({ tournament: level })).catch(() => {});
  initNet({ onStart: startNetMatch, onEvent: onNetEvent, onEnd: onNetEnd }).then((ok) => {
    if (!ok) return;
    // שחקן רשום מופיע בלובי של המחוברים
    setInterval(() => { if (TOUR.me && !NET.profile) setOpen(TOUR.me, true); }, 1500);
  }).catch(() => {});
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
  $('btn-start').addEventListener('click', () => startMatch());
  $('btn-rules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('rules-close').addEventListener('click', () => $('rules').classList.add('hidden'));
  $('btn-again').addEventListener('click', () => {
    if (G.net || G.mode === 'net') { $('over').classList.add('hidden'); toMenu(); $('tour').classList.remove('hidden'); return; }
    if (TOUR.me && TOUR.db && G.lastTour) startMatch({ tournament: G.lastTour }); else startMatch();
  });
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
    SFX.initAudio(); SFX.startAmbience();
    startCinematic();
  };
  $('cine-skip').addEventListener('click', (e) => { e.stopPropagation(); endCinematic(); });
  intro.addEventListener('click', go);
  addEventListener('keydown', (e) => {
    if (!intro.classList.contains('hidden')) { go(); return; }
    if (G.state === 'cinematic') { endCinematic(); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (G.state === 'play' || G.state === 'setpiece' || G.paused)) togglePause();
  });
}

function toMenu() {
  TOUR.active = false;
  if (G.net) { G.net = null; endMatch('quit'); }
  G.state = 'menu';
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('menu').classList.remove('hidden');
  placeForMenu();
}

function togglePause() {
  if (G.state === 'menu' || G.state === 'over') return;
  if (G.net) { message('אין הפסקות במשחק אונליין 🙂', 1500); return; }
  G.paused = !G.paused;
  $('pause').classList.toggle('hidden', !G.paused);
}

function startMatch(opts) {
  if (G.net) { G.net = null; endMatch('quit'); }
  if (G.mode === 'net') G.mode = 'ai';
  const tour = opts && opts.tournament;
  if (tour) { G.mode = 'ai'; G.difficulty = tour; G.target = 11; TOUR.active = true; TOUR.level = tour; G.lastTour = tour; }
  else { TOUR.active = false; G.lastTour = null; }
  $('over-tour').hidden = true;
  SFX.initAudio(); SFX.startAmbience();
  $('menu').classList.add('hidden');
  $('over').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouchDevice()) $('touch').classList.remove('hidden');
  G.scores = [0, 0];
  G.players[0].name = G.mode === 'ai' ? 'אתה (אבי)' : 'אבי';
  G.players[1].name = G.mode === 'ai' ? 'יניב מקומה 3' : 'יניב';
  G.players[0].speedMul = 1; G.players[1].speedMul = 1;
  G.ai = G.mode === 'ai' ? new AI(G, G.players[1], G.difficulty) : null;
  $('name1').textContent = G.players[0].name;
  $('name2').textContent = G.players[1].name;
  $('target-lbl').textContent = `משחקים עד ${G.target}`;
  updateScore();
  setPiece(G.players[0], 'פתיחה! אבי בועט מהאמצע');
  SFX.sfxWhistle(0.6);
}

// ---------- סלנג של השכונה (שנות ה-90) ----------
const SLANG = {
  goal: ['גווווול!', 'יא מלך!', 'שיחקת אותה!', 'אין עליי!', 'פצצה!', 'קלאסה!', 'רגל של זהב!', 'אש!'],
  conceded: ['פדיחה...', 'נו באמת!', 'זה לא נחשב!', 'מזל של מתחילים', 'חוזר! לא הייתי מוכן', 'יא חוצפן!'],
  nutmeg: ['בין הרגליים!! חחחח', 'עברת בשער של המשפחה!'],
  nutmegged: ['פאדיחה!!!', 'אמא שלי ראתה מהמרפסת...'],
  post: ['חבל על הזמן!', 'וואלה, קורה!', 'כמעט!!', 'אוףףף'],
  postSaved: ['מזל!', 'הקורה איתי!', 'יוווו'],
  foulBy: ['מה פתאום?!', 'בחיים לא!', 'לא נגעתי!', 'דמיינת, אחי'],
  foulOn: ['אחי! נגעת פעמיים!', 'פאול! פנדל!', 'יא רמאי!', 'עונשין!!'],
  pothole: ['חוזר! זה הבור!', 'הבור הזה...', 'וואלה העירייה...'],
  kickoff: ['יאללה בלגן!', 'סבבה, מתחילים', 'יאללה, תביא!', 'מוכן?'],
  juggle: ['אחלה הקפצות!', 'כמו בטלוויזיה!'],
  scissors: ['כמו ברזילאי!', 'אוה! מספרת!'],
  heel: ['עקב של זהב!', 'ראית את זה?!'],
  win: ['מלך השכונה!', 'יאללה, מי מביא ארטיק?'],
};
const sayTimers = [null, null];
const sayPos = [null, null];
function say(p, kind, chance = 1) {
  if (!p || Math.random() > chance) return;
  const i = G.players.indexOf(p);
  const list = SLANG[kind];
  const el = $(`say${i}`);
  el.textContent = list[Math.floor(Math.random() * list.length)];
  if (G.net && G.net.role === 'host') sendEvent({ k: 'say', i, t: el.textContent });
  el.classList.add('show');
  sayPos[i] = p;
  clearTimeout(sayTimers[i]);
  sayTimers[i] = setTimeout(() => { el.classList.remove('show'); sayPos[i] = null; }, 1900);
}
function sayText(p, text, audioWord) {
  const i = G.players.indexOf(p);
  const el = $(`say${i}`);
  el.textContent = text; el.classList.add('show');
  sayPos[i] = p;
  clearTimeout(sayTimers[i]);
  sayTimers[i] = setTimeout(() => { el.classList.remove('show'); sayPos[i] = null; }, 2200);
}
function updateBubbles() {
  for (let i = 0; i < 2; i++) {
    if (!sayPos[i]) continue;
    const v = sayPos[i].pos.clone(); v.y = 1.75;
    v.project(R.camera);
    const el = $(`say${i}`);
    el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
  }
}

// ---------- פתיחה קולנועית: השכונה, והילדים יורדים מהבניין ----------
const CINE_LEN = 16;
const camKeys = [
  { t: 0, p: [38, 30, 34], l: [0, 0, -6] },
  { t: 3, p: [8, 27, 40], l: [0, 2, -8] },
  { t: 5.6, p: [-6, 12, 12], l: [-20, 1.5, -2] },     // ילדים יוצאים מבניין 8
  { t: 7.8, p: [-3.5, 4.4, -7.2], l: [-7.9, 1.5, -14] }, // בניין 12 – אבי
  { t: 10, p: [6, 5, -6.5], l: [11.5, 1.4, -14.5] },    // בניין 14 – יניב
  { t: 13, p: [-4, 10, 9], l: [0, 0.8, -2] },
];
// מסלולים: [בניין, מתי יוצא, מהירות, נקודות ביניים..., יעד]
function kidPaths(doors) {
  const d = (n) => doors[n] ? [doors[n].door.x, doors[n].door.z] : [0, -14];
  const out = (n, k = 1.6) => { const b = doors[n]; return b ? [b.door.x + b.out.x * k, b.door.z + b.out.z * k] : [0, -12]; };
  return {
    main: [
      { b: 12, appear: 7.6, speed: 2.4, path: [d(12), out(12, 1.9), [-7.9, -10.3], [-6.5, -8.0], [-1.5, 0.8]] },
      { b: 14, appear: 9.4, speed: 2.4, path: [d(14), out(14, 2.6), [12.0, -10.3], [10, -8], [1.8, -0.6]] },
    ],
    extras: [
      { b: 8, appear: 4.6, speed: 1.9, path: [d(8), out(8, 1.5), [-19.2, -6], [-17.7, -4.5]] },
      { b: 8, appear: 5.3, speed: 1.7, path: [d(8), out(8, 1.2), [-19.4, 1], [-17.7, 1.8]] },
      { b: 9, appear: 6.0, speed: 1.8, path: [d(9), out(9, 1.4), [19.6, -5], [17.8, -5.5]] },
      { b: 9, appear: 6.6, speed: 1.6, path: [d(9), out(9, 1.2), [19.4, 0.8], [17.8, 0.4]] },
      { b: 12, appear: 8.6, speed: 2.0, path: [d(12), out(12, 1.6), [-8.1, -10.3], [-9, -8.6], [-3.2, -11.25]] },
      { b: 14, appear: 10.2, speed: 1.9, path: [d(14), out(14, 2.2), [12.2, -10.3], [11.5, -8.6], [5.0, -11.2]] },
    ],
  };
}
let PATHS = null;
// ילדי השכונה – צופים מסביב למגרש
function makeExtras() {
  const n = quality === 'low' ? 4 : EXTRA_KIDS.length;
  G.extras = EXTRA_KIDS.slice(0, n).map((o) => {
    const k = new Player(R.scene, { ...o, attackDir: 1, name: '' });
    k.ring.visible = false; k.arrow.visible = false;
    k.root.scale.setScalar(0.9 + Math.random() * 0.12);
    return k;
  });
}
function placeExtrasAtSpots() {
  if (!PATHS) PATHS = kidPaths(W.doors);
  G.extras.forEach((k, i) => {
    const p = PATHS.extras[i].path; const e = p[p.length - 1];
    k.pos.set(e[0], 0, e[1]); k.vel.set(0, 0, 0); k.root.visible = true; k.script = null;
  });
}
function updateExtras(dt) {
  for (const k of G.extras) {
    if (k.script) {
      const sc = k.script;
      if (G.cineT < sc.appear) { k.root.visible = false; k.vel.set(0, 0, 0); }
      else {
        k.root.visible = true;
        const wp = sc.path[Math.min(k.wp, sc.path.length - 1)];
        const dx = wp[0] - k.pos.x, dz = wp[1] - k.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.25 && k.wp < sc.path.length - 1) k.wp++;
        if (d > 0.05) {
          const v = Math.min(sc.speed, d * 3);
          k.vel.set(dx / d * v, 0, dz / d * v);
          k.pos.addScaledVector(k.vel, dt);
          k.facing = Math.atan2(dz, dx);
        } else { k.vel.set(0, 0, 0); if (k.wp >= sc.path.length - 1) k.script = null; }
      }
    } else {
      k.vel.multiplyScalar(0.8);
      // מסתכלים על הכדור
      const want = Math.atan2(G.ball.pos.z - k.pos.z, G.ball.pos.x - k.pos.x);
      let d = want - k.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      k.facing += d * Math.min(1, dt * 3);
    }
    k.update(dt, G.time);
  }
}
function crowdReact(scorer) {
  for (const k of G.extras) if (!k.script) setTimeout(() => k.play(Math.random() < 0.75 ? 'cheer' : 'sad'), Math.random() * 400);
}
let camCurve, lookCurve;
function startCinematic() {
  G.state = 'cinematic';
  G.cineT = 0;
  G.cineSaid = {};
  camCurve = new THREE.CatmullRomCurve3(camKeys.map((k) => new THREE.Vector3(...k.p)), false, 'centripetal');
  lookCurve = new THREE.CatmullRomCurve3(camKeys.map((k) => new THREE.Vector3(...k.l)), false, 'centripetal');
  if (!PATHS) PATHS = kidPaths(W.doors);
  G.players.forEach((p, i) => {
    const k = PATHS.main[i];
    p.pos.set(k.path[0][0], 0, k.path[0][1]); p.vel.set(0, 0, 0);
    p.facing = Math.PI / 2; p.root.visible = false; p.cineWp = 1;
    p.ring.visible = false; p.arrow.visible = false;
  });
  G.extras.forEach((k, i) => {
    const sc = PATHS.extras[i];
    k.pos.set(sc.path[0][0], 0, sc.path[0][1]); k.root.visible = false; k.script = sc; k.wp = 1;
  });
  G.ball.mesh.visible = false;
  $('cine').classList.remove('hidden', 'out');
  typeCaption("שכונה ג', קיץ 1997.\nאחרי בית הספר...", 0.6);
}
let capTimer = null;
function typeCaption(text, delay = 0) {
  clearInterval(capTimer);
  const el = $('cine-cap'); el.textContent = '';
  let i = 0;
  setTimeout(() => { capTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(capTimer); }, 55); }, delay * 1000);
}
function endCinematic() {
  if (G.state !== 'cinematic') return;
  clearInterval(capTimer);
  G.players.forEach((p) => { p.root.visible = true; p.ring.visible = true; p.arrow.visible = true; });
  G.ball.mesh.visible = true;
  placeExtrasAtSpots();
  $('cine').classList.add('out');
  setTimeout(() => $('cine').classList.add('hidden'), 800);
  toMenu();
  layoutCamera(true);
}
function cineCamera(t) {
  const times = camKeys.map((k) => k.t);
  const n = camKeys.length;
  const cam = R.camera;
  if (t < times[n - 1]) {
    let i = 0; while (i < n - 2 && t > times[i + 1]) i++;
    let f = (t - times[i]) / (times[i + 1] - times[i]);
    f = f * f * (3 - 2 * f);
    const u = (i + f) / (n - 1);
    cam.position.copy(camCurve.getPoint(u));
    cam.lookAt(lookCurve.getPoint(u));
  } else {
    // נחיתה רכה אל מצלמת המשחק
    const from = camCurve.getPoint(1), fromL = lookCurve.getPoint(1);
    G.state = 'menu'; layoutCamera(true); G.state = 'cinematic';
    const toP = R.camera.position.clone(), toL = camTarget.clone();
    let f = Math.min(1, (t - times[n - 1]) / (CINE_LEN - times[n - 1]));
    f = f * f * (3 - 2 * f);
    cam.position.copy(from.lerp(toP, f));
    cam.lookAt(fromL.lerp(toL, f));
  }
  cam.updateMatrixWorld();
  R.sun.target.position.set(0, 0, -4);
  R.sun.position.set(-22, 24, 12);
}
function cineKids(dt, t) {
  const intents = [];
  G.players.forEach((p, i) => {
    const k = PATHS.main[i];
    if (t < k.appear) { intents.push({ wx: 0, wz: 0 }); return; }
    p.root.visible = true;
    const wp = k.path[Math.min(p.cineWp, k.path.length - 1)];
    const dx = wp[0] - p.pos.x, dz = wp[1] - p.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.3 && p.cineWp < k.path.length - 1) p.cineWp++;
    const last = p.cineWp === k.path.length - 1;
    const sp = (last ? k.speed * 1.6 : k.speed) / PLAYER.speed;
    if (last && d < 0.15) intents.push({ wx: 0, wz: 0, face: i === 0 ? 0.2 : Math.PI - 0.3 });
    else intents.push({ wx: dx / (d || 1) * Math.min(1, d) * sp, wz: dz / (d || 1) * Math.min(1, d) * sp });
  });
  // אבי מכדרר את הכדור
  const p1 = G.players[0];
  if (p1.root.visible) {
    G.ball.mesh.visible = true;
    const f = p1.forward();
    const target = tmpV.set(p1.pos.x + f.x * 0.5, BALL.r, p1.pos.z + f.z * 0.5);
    if (t > 14) target.set(-0.6, BALL.r, 0.9);
    const prev = G.ball.pos.clone();
    G.ball.pos.lerp(target, Math.min(1, dt * 8));
    G.ball.vel.copy(G.ball.pos).sub(prev).divideScalar(Math.max(dt, 1e-4));
    G.ball.vel.y = 0;
  }
  // דיאלוג
  const once = (key, at, fn) => { if (t >= at && !G.cineSaid[key]) { G.cineSaid[key] = 1; fn(); } };
  once('c2', 4.4, () => typeCaption('כל השכונה יורדת למטה...'));
  once('c3', 7.4, () => typeCaption('אבי, בניין 12.'));
  once('s0', 8.8, () => sayText(G.players[0], 'יניב! רד כבר!', 'yalla'));
  once('c4', 9.6, () => typeCaption('יניב, בניין 14.'));
  once('s1', 10.8, () => sayText(G.players[1], 'יאללה, מי שמפסיד מביא ארטיק!', 'achla'));
  once('s2', 12.4, () => sayText(G.players[0], 'סבבה, אחי!', 'sababa'));
  once('c5', 13.2, () => typeCaption('סטנגה בשכונה.'));
  once('end', CINE_LEN, endCinematic);
  return intents;
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
  setTimeout(() => say(kicker, 'kickoff', 0.7), 400);
}

function registerTouch(p, type) {
  if (G.lastToucher === p && G.ball.groundedSinceTouch) { foul(p); return false; }
  if (G.lastToucher === p) { G.juggles++; if (G.juggles >= 2) pop(`הקפצה ×${G.juggles}`, '', '#fff', 700); if (G.juggles === 3) say(G.other(p), 'juggle'); }
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
  SFX.sfxWhistle(0.35); setTimeout(() => SFX.sfxWhistle(0.35), 420); if (G.net) sendEvent({ k: 'sfx', n: 'foul' });
  say(o, 'foulOn');
  setTimeout(() => say(p, 'foulBy'), 900);
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
    say(o, 'goal'); setTimeout(() => say(owner, 'conceded'), 700);
    return;
  }
  let pts = POINTS.goal, title = 'גול!', color = '#7CFC00';
  if (G.nutmegOf === owner) { pts = POINTS.nutmeg; title = 'בין הרגליים!!!'; color = '#ff4fd8'; }
  else if (G.shotType === 'scissors') { pts = POINTS.scissors; title = 'מספרת!!'; color = '#00e5ff'; }
  else if (G.shotType === 'heel') { pts = POINTS.heel; title = 'גול בעקב!'; color = '#ffd54f'; }
  award(scorer, pts, title, color);
  SFX.sfxCheer(pts >= 4);
  crowdReact(scorer);
  if (G.net) sendEvent({ k: 'sfx', n: pts >= 4 ? 'cheer2' : 'cheer' });
  if (pts === POINTS.nutmeg) { say(scorer, 'nutmeg'); setTimeout(() => say(owner, 'nutmegged'), 800); }
  else { say(scorer, 'goal'); setTimeout(() => say(owner, 'conceded', 0.8), 800); }
  if (pts >= 4) G.slowmo = 1.2;
}

function checkWin() {
  const i = G.scores.findIndex((s) => s >= G.target);
  if (i < 0) return false;
  if (G.net) sendEvent({ k: 'over', w: i, sc: G.scores.slice() });
  showOver(i);
  return true;
}

function showOver(i) {
  G.state = 'over';
  const w = G.players[i];
  say(w, 'win');
  $('over-title').textContent = `${w.name} ניצח!`;
  $('over-score').textContent = `${G.scores[0]} : ${G.scores[1]}`;
  $('over-sub').textContent = G.net ? 'משחק טורניר אונליין – מי שמפסיד מביא ארטיק 🍦' : G.mode === 'ai' ? (i === 0 ? 'מלך השכונה! אמא קוראת לעלות לאכול 🍝' : 'יניב מקומה 3 לקח אותך... רוצה נקמה?') : 'מי שמפסיד מביא ארטיק לכולם 🍦';
  $('over').classList.remove('hidden');
  $('touch').classList.add('hidden');
  SFX.sfxCheer(true);
  if (TOUR.active) {
    const el = $('over-tour'); el.hidden = false; el.textContent = 'שומר את התוצאה בטבלת הטורניר...';
    const meIdx = G.net && G.net.role === 'guest' ? 1 : 0;
    recordResult(i === meIdx, G.scores[meIdx], G.scores[1 - meIdx]).then((r) => {
      if (!r) { el.hidden = true; return; }
      el.textContent = r.error ? 'התוצאה לא נשמרה בטבלה.' : `טורניר השכונה: ${r.add ? `+${r.add} נקודות! ` : ''}אתה במקום ${r.rank} מתוך ${r.of} (${r.pts} נק')`;
    });
  }
}

// ---------- משחק אונליין בין שני שחקנים רשומים ----------
function startNetMatch(role, opp) {
  G.paused = false;
  $('pause').classList.add('hidden');
  $('tour').classList.add('hidden');
  $('over').classList.add('hidden');
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouchDevice()) $('touch').classList.remove('hidden');
  G.net = { role, seq: 0, lastRemote: 0 };
  G.mode = 'net'; G.ai = null; G.target = 11;
  TOUR.active = !!TOUR.me; TOUR.level = 'easy'; // ניצחון אונליין = 3 נקודות
  $('over-tour').hidden = true;
  const myNick = (TOUR.me && TOUR.me.nick) || 'אני';
  G.players[0].name = role === 'host' ? `${myNick} (אתה)` : opp.nick || 'יריב';
  G.players[1].name = role === 'host' ? opp.nick || 'יריב' : `${myNick} (אתה)`;
  G.players.forEach((p) => { p.speedMul = 1; p.charge = 0; p.charging = null; p.seenSeq = p.animSeq || 0; });
  $('name1').textContent = G.players[0].name;
  $('name2').textContent = G.players[1].name;
  $('target-lbl').textContent = 'אונליין · עד 11';
  G.scores = [0, 0]; updateScore();
  SFX.initAudio(); SFX.startAmbience();
  if (role === 'host') { setPiece(G.players[0], `פתיחה! ${G.players[0].name} בועט מהאמצע`); SFX.sfxWhistle(0.6); }
  else { G.state = 'setpiece'; G.kicker = G.players[0]; message('מתחבר למשחק...', 2000); }
}

function onNetEvent(e) {
  if (!G.net || G.net.role !== 'guest') return;
  if (e.k === 'pop' && Array.isArray(e.a)) pop(String(e.a[0] || '').slice(0, 40), String(e.a[1] || '').slice(0, 80), String(e.a[2] || '#fff').slice(0, 20), +e.a[3] || 1400);
  else if (e.k === 'msg') message(String(e.t || '').slice(0, 120), +e.ms || 2500);
  else if (e.k === 'say' && (e.i === 0 || e.i === 1)) sayText(G.players[e.i], String(e.t || '').slice(0, 60));
  else if (e.k === 'sfx') {
    if (e.n === 'clang') SFX.sfxClang();
    else if (e.n === 'foul') { SFX.sfxWhistle(0.35); setTimeout(() => SFX.sfxWhistle(0.35), 420); }
    else if (e.n === 'cheer' || e.n === 'cheer2') { SFX.sfxCheer(e.n === 'cheer2'); crowdReact(); }
  } else if (e.k === 'over' && (e.w === 0 || e.w === 1) && Array.isArray(e.sc)) {
    G.scores = [+e.sc[0] || 0, +e.sc[1] || 0]; updateScore();
    showOver(e.w);
  }
}

function onNetEnd(reason) {
  if (!G.net) return;
  const wasOver = G.state === 'over';
  G.net = null;
  if (!wasOver) { TOUR.active = false; toMenu(); message('היריב יצא מהמשחק. התוצאה לא נרשמה.', 3500); }
}

const r2 = (v) => Math.round(v * 100) / 100;
function buildSnapshot() {
  const b = G.ball;
  return {
    st: G.state, k: G.players.indexOf(G.kicker), lt: G.players.indexOf(G.lastToucher), g: b.groundedSinceTouch ? 1 : 0,
    sc: G.scores, b: [r2(b.pos.x), r2(b.pos.y), r2(b.pos.z), r2(b.vel.x), r2(b.vel.y), r2(b.vel.z)],
    p: G.players.map((p) => [r2(p.pos.x), r2(p.pos.z), r2(p.vel.x), r2(p.vel.z), r2(p.facing), r2(p.charge), p.animSeq || 0, p.animType || '']),
  };
}

function applySnapshot(s, dt) {
  if (!s || !Array.isArray(s.p) || !Array.isArray(s.b)) return;
  const k = Math.min(1, dt * 14);
  if (['setpiece', 'play', 'goal', 'over'].includes(s.st) && G.state !== 'over') G.state = s.st;
  G.kicker = G.players[s.k] || null;
  G.lastToucher = G.players[s.lt] || null;
  G.ball.groundedSinceTouch = !!s.g;
  if (Array.isArray(s.sc) && (s.sc[0] !== G.scores[0] || s.sc[1] !== G.scores[1])) {
    const bump = s.sc[0] !== G.scores[0] ? 0 : 1;
    G.scores = [+s.sc[0] || 0, +s.sc[1] || 0]; updateScore(bump);
  }
  const b = G.ball;
  const tb = new THREE.Vector3(+s.b[0] || 0, +s.b[1] || BALL.r, +s.b[2] || 0);
  if (b.pos.distanceTo(tb) > 3) b.pos.copy(tb); else b.pos.lerp(tb, k);
  b.vel.set(+s.b[3] || 0, +s.b[4] || 0, +s.b[5] || 0);
  s.p.forEach((q, i) => {
    const p = G.players[i]; if (!p || !Array.isArray(q)) return;
    const tp = new THREE.Vector3(+q[0] || 0, 0, +q[1] || 0);
    if (p.pos.distanceTo(tp) > 3) p.pos.copy(tp); else p.pos.lerp(tp, k);
    p.vel.set(+q[2] || 0, 0, +q[3] || 0);
    let d = (+q[4] || 0) - p.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    p.facing += d * k;
    p.charge = Math.max(0, Math.min(1, +q[5] || 0));
    const seq = +q[6] || 0;
    if (seq !== p.seenSeq) {
      p.seenSeq = seq;
      const t = String(q[7] || '');
      if (['kick', 'lob', 'heel', 'scissors', 'head', 'whiff'].includes(t)) { p.play(t); p.seenSeq = seq; if (t !== 'whiff') SFX.sfxKick(0.6); }
    }
  });
}

// האורח: קלט מקומי → נשלח למארח
function guestControl(dt, now) {
  const p = G.players[1];
  const it = readIntent('p1-solo');
  const w = screenToWorld(it);
  const held = it.kick ? 'kick' : it.lob ? 'lob' : null;
  let action = null;
  if (held) { p.charging = held; p.netCharge = Math.min(1, (p.netCharge || 0) + dt / 0.7); }
  else if (p.charging) { action = { t: p.charging, p: r2(0.15 + 0.85 * p.netCharge) }; p.charging = null; p.netCharge = 0; }
  if (it.heel) action = { t: 'heel', p: 0.7 };
  if (it.scissors) action = { t: 'scissors', p: 1 };
  if (action) { G.net.seq++; G.net.pendingAction = { n: G.net.seq, ...action }; }
  sendInput({ x: r2(w.wx), z: r2(w.wz), ch: r2(p.netCharge || 0), a: G.net.pendingAction || null }, now);
}

// המארח: קלט מרוחק → שחקן 2
function remoteIntent() {
  const ri = NET.remoteInput || {};
  const p = G.players[1];
  const x = Math.max(-1, Math.min(1, +ri.x || 0)), z = Math.max(-1, Math.min(1, +ri.z || 0));
  p.charge = Math.max(0, Math.min(1, +ri.ch || 0));
  const a = ri.a;
  if (a && +a.n > G.net.lastRemote && ['kick', 'lob', 'heel', 'scissors'].includes(a.t)) {
    G.net.lastRemote = +a.n;
    doKick(p, a.t, Math.max(0.15, Math.min(1, +a.p || 0.5)));
  }
  return { wx: x, wz: z, face: null };
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
  if (type === 'scissors') { G.slowmo = 0.7; pop('מספרת!', '', '#00e5ff', 700); say(G.other(p), 'scissors', 0.7); }
  if (type === 'heel') { pop('עקב!', '', '#ffd54f', 600); say(p, 'heel', 0.5); }
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
      SFX.sfxClang(); if (G.net) sendEvent({ k: 'sfx', n: 'clang' });
      shake(0.15);
      const scorer = G.lastToucher;
      const owner = G.players[goalIdx];
      if (G.state === 'play' && scorer && scorer !== owner && !G.hits.has(key)) {
        G.hits.add(key);
        say(scorer, 'post'); setTimeout(() => say(owner, 'postSaved', 0.6), 700);
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
  if (G.state === 'setpiece' || G.state === 'menu' || G.state === 'cinematic') return;
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
        if (sp > 3) { pop('בור!', '', '#bbb', 500); say(G.lastToucher ? G.other(G.lastToucher) : G.players[0], 'pothole', 0.5); }
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
  if (G.state !== 'cinematic') {
    p.pos.x = Math.max(-FIELD.boundX + 0.3, Math.min(FIELD.boundX - 0.3, p.pos.x));
    p.pos.z = Math.max(-FIELD.boundZ + 0.3, Math.min(FIELD.boundZ - 0.3, p.pos.z));
  }
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
  if (G.net && G.net.role === 'host') sendEvent({ k: 'pop', a: [title, sub, color, ms] });
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
  if (G.net && G.net.role === 'host') sendEvent({ k: 'msg', t, ms });
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
  if (G.net && G.net.role === 'guest') {
    guestControl(dt, now);
  } else if (G.net && G.net.role === 'host') {
    intents[0] = humanControl(G.players[0], 'p1-solo', dt);
    intents[1] = remoteIntent();
  } else if (G.state !== 'menu' && G.state !== 'cinematic') {
    intents[0] = humanControl(G.players[0], G.mode === 'ai' ? 'p1-solo' : 'p1', dt);
    if (G.ai) {
      const out = G.ai.think(dt);
      intents[1] = out;
      if (out.action) doKick(G.players[1], out.action.type, out.action.power);
    } else intents[1] = humanControl(G.players[1], 'p2', dt);
  } else if (G.state === 'cinematic') {
    G.cineT += dt;
    intents = cineKids(dt, G.cineT);
  } else {
    // בתפריט – הילדים מתמסרים בעצלתיים
    const t = G.time;
    intents[0] = { wx: 0, wz: 0, face: 0.2 + Math.sin(t * 0.5) * 0.3 };
    intents[1] = { wx: 0, wz: 0, face: Math.PI - 0.3 };
  }

  if (G.net && G.net.role === 'guest') { applySnapshot(NET.lastSnap, dt); acc = 0; }
  else acc += dt;
  while (acc >= STEP) {
    acc -= STEP;
    stepPlayer(G.players[0], intents[0], STEP);
    stepPlayer(G.players[1], intents[1], STEP);
    separatePlayers();
    stepBall(STEP);
    if (G.state === 'goal' || G.state === 'over') break;
  }
  if (G.net && G.net.role === 'host') sendSnapshot(buildSnapshot(), now);
  if (G.state === 'goal' && !(G.net && G.net.role === 'guest')) {
    G.goalTimer -= dt;
    if (G.goalTimer <= 0 && !checkWin()) setPiece(G.concededBy, `${G.concededBy.name} בועט מהאמצע`);
  }

  // עדכון גרפי
  for (const p of G.players) p.update(dt, G.time);
  updateExtras(dt);
  const b = G.ball;
  b.mesh.position.copy(b.pos);
  const sp = Math.hypot(b.vel.x, b.vel.z);
  if (sp > 0.01) {
    const axis = tmpV.set(b.vel.z, 0, -b.vel.x).normalize();
    b.spin.rotateOnWorldAxis(axis, sp / BALL.r * dt);
  }
  animateWorld(W, G.time);
  if (G.state === 'cinematic') cineCamera(G.cineT); else layoutCamera(false);
  if (G.state !== 'menu' && G.state !== 'cinematic') updateTurnHud();
  updateBubbles();
  R.render();
  endFrame();
}

addEventListener('resize', () => R && layoutCamera(true));
boot().catch((e) => {
  console.error(e);
  $('load-msg').textContent = 'שגיאה בטעינה: ' + e.message;
});
