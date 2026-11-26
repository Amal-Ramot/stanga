// מגרש המשחקים – הפלטפורמה
// חצר השכונה היא "לובי": בוחרים דמות, מסתובבים בחצר ומגיעים לתחנות של משחקים.
// כל משחק הוא קובץ נפרד בתיקייה games/ ונרשם ברשימה ב-games/index.js.
//
// מה כל משחק מקבל (C – "הליבה"):
//   C.R (רנדרר וסצנה), C.W (העולם), C.A (נכסים), C.kid (הדמות שבחרו), C.extras (ילדי השכונה)
//   C.time, C.SFX (צלילים), C.$ (getElementById), C.isTouch()
//   C.walkTo(נקודה, כשמגיעים) – הדמות הולכת לנקודה ומפעילה פונקציה כשהיא מגיעה
//   C.groundAt(event) – הנקודה על הרצפה שבה לחצו; C.rayFrom(event) – קרן מהמצלמה
//   C.message(טקסט), C.pop(כותרת, משנה, צבע), C.exitGame() – חזרה לחצר
//
// מה משחק מגדיר (ראו games/words/words.js כדוגמה):
//   { id, title, emoji, color, station: {x, z}, enter(C), exit(C), update(dt, C),
//     onTap(event, C) → true אם טיפל בלחיצה, onAction(C) – רווח/Enter,
//     camera(C, vt, aspect) → { pos, look, speed } או null למצלמה הרגילה, canMove(C) → האם הדמות זזה }
import * as THREE from 'three';
import { loadAll, onProgress } from '../js/assets.js';
import { buildWorld, animateWorld } from '../js/world.js';
import { Player, KIDS, EXTRA_KIDS } from '../js/player.js';
import { createRenderer } from '../js/render.js';
import * as SFX from '../js/audio.js';
import { GAMES } from './games/index.js';

const $ = (id) => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-play-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-play-' + k, JSON.stringify(v)); } catch {} },
};

// ---------- הדמויות שאפשר לבחור ----------
export const CHARACTERS = [
  { name: 'אבי', model: 'Casual_Male', shirt: '#7fb2e0', pants: '#2f4a73', skin: '#e2b08a', hair: '#2a1a10' },
  { name: 'נועה', model: 'Casual_Female', shirt: '#f29bb8', pants: '#3c5a86', skin: '#f0c9a8', hair: '#6b3e1f' },
  { name: 'יניב', model: 'Casual2_Male', shirt: '#e8e4da', pants: '#4a4d55', skin: '#c48e62', hair: '#140c07' },
  { name: 'דנה', model: 'Casual2_Female', shirt: '#ffd166', pants: '#2f3f66', skin: '#e8bb94', hair: '#b8862e' },
  { name: 'סשה', model: 'Casual3_Male', shirt: '#7fbf7a', pants: '#3a3a3a', skin: '#f3d2b5', hair: '#d9b26a' },
  { name: 'תמר', model: 'Casual3_Female', shirt: '#d9534f', pants: '#22252b', skin: '#b9804f', hair: '#120a05' },
  { name: 'משה', model: 'Worker_Male', shirt: '#e6c34a', pants: '#4a4a4a', skin: '#a8714a', hair: '#0f0905' },
  { name: 'רוני', model: 'Casual_Bald', shirt: '#9fc2df', pants: '#3a5a86', skin: '#d9a27a', hair: '#2a1a10' },
];

// ---------- הליבה שמשותפת לכל המשחקים ----------
export const C = {
  R: null, W: null, A: null, kid: null, extras: [], time: 0,
  SFX, $, isTouch, game: null, mode: 'loading', // loading | choose | hub | game
  walkTo, groundAt, rayFrom, message, pop, exitGame,
};
const SPEED = 4.6;
const keys = new Set();
let goal = null;
let charIdx = store.get('char', -1);

async function boot() {
  const forced = new URLSearchParams(location.search).get('q');
  onProgress((p) => { $('load-bar').style.width = `${Math.round(p * 100)}%`; });
  try { await document.fonts.load('500 40px Rubik'); await document.fonts.load('800 40px Rubik'); } catch {}
  try { await Promise.all(['500', '700', '800'].map((w) => document.fonts.load(`${w} 40px "Noto Sans Hebrew"`, 'אָבּ'))); } catch {}
  C.A = await loadAll();
  C.R = await createRenderer($('game'), C.A, forced || (isTouch() ? 'low' : 'medium'));
  C.W = buildWorld(C.R.scene, C.A);
  makeExtras();
  buildStations();
  setupInput();
  $('loading').classList.add('hidden');
  if (charIdx < 0 || !CHARACTERS[charIdx]) chooseCharacter(0); else { makeKid(charIdx); toHub(); }
  C.R.renderer.setAnimationLoop(loop);
  window.__ready = C.R.backend;
  window.__C = C;
}

// ---------- הדמות ----------
function makeKid(i) {
  const ch = CHARACTERS[i];
  const old = C.kid;
  if (old) C.R.scene.remove(old.root);
  const k = new Player(C.R.scene, { ...KIDS.p1, ...ch, model: C.A.kids && C.A.kids[ch.model] });
  k.arrow.visible = false;
  k.ringMat.color.set('#ffd23f');
  if (old) { k.pos.copy(old.pos); k.facing = old.facing; }
  C.kid = k;
  return k;
}

// ---------- בחירת דמות ----------
const STAGE = new THREE.Vector3(0, 0, 4.2);
function chooseCharacter(start) {
  C.mode = 'choose';
  if (C.game) leaveGame();
  charIdx = start >= 0 ? start : Math.max(0, store.get('char', 0));
  makeKid(charIdx);
  C.kid.pos.copy(STAGE); C.kid.facing = Math.PI / 2; C.kid.vel.set(0, 0, 0);
  C.kid.ring.visible = false;
  goal = null;
  showStations(false);
  showUI('choose');
  updateChooser();
}
function updateChooser() {
  const ch = CHARACTERS[charIdx];
  $('ch-name').textContent = ch.name;
  $('ch-count').textContent = `${charIdx + 1} / ${CHARACTERS.length}`;
}
function stepChoice(d) {
  charIdx = (charIdx + d + CHARACTERS.length) % CHARACTERS.length;
  makeKid(charIdx);
  C.kid.pos.copy(STAGE); C.kid.facing = Math.PI / 2; C.kid.ring.visible = false;
  updateChooser();
  SFX.initAudio(); SFX.sfxKick(0.2);
}
function confirmChoice() {
  store.set('char', charIdx);
  SFX.initAudio(); SFX.startAmbience();
  C.kid.play('cheer');
  SFX.sfxCheer(false);
  setTimeout(toHub, 900);
}

// ---------- החצר (לובי) ----------
const stations = [];
function stationSign(g) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 300;
  const x = c.getContext('2d');
  x.fillStyle = g.soon ? '#d9d4c7' : '#fff6dc'; x.fillRect(0, 0, 512, 300);
  x.strokeStyle = g.soon ? '#8d8676' : (g.color || '#1f3f9c'); x.lineWidth = 16; x.strokeRect(8, 8, 496, 284);
  x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '110px sans-serif'; x.fillText(g.emoji, 256, 108);
  x.fillStyle = '#1c2540'; x.font = '800 62px Rubik';
  x.fillText(g.title, 256, 232);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function buildStations() {
  for (const g of GAMES) {
    const grp = new THREE.Group();
    const col = new THREE.Color(g.soon ? '#9a9486' : (g.color || '#2f7de0'));
    // משטח עגול על הרצפה
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 40), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));
    pad.position.y = 0.03; pad.receiveShadow = true; grp.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.45, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; grp.add(ring);
    // שלט על עמוד, מאחורי המשטח
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10), new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.6 }));
    post.position.set(0, 0.95, -1.35); post.castShadow = true; grp.add(post);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.11), new THREE.MeshStandardMaterial({ map: stationSign(g), roughness: 0.8 }));
    sign.position.set(0, 1.85, -1.3); sign.castShadow = true; grp.add(sign);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.19, 0.04), new THREE.MeshStandardMaterial({ color: '#6b4a2b' }));
    back.position.set(0, 1.85, -1.33); grp.add(back);
    grp.position.set(g.station.x, 0, g.station.z);
    C.R.scene.add(grp);
    stations.push({ g, grp, ring });
  }
}
function showStations(v) { for (const s of stations) s.grp.visible = v; }
function nearStation() {
  let best = null, bd = 1.6;
  for (const s of stations) {
    const d = Math.hypot(C.kid.pos.x - s.g.station.x, C.kid.pos.z - s.g.station.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
let promptFor = null;
function updatePrompt() {
  const s = C.mode === 'hub' ? nearStation() : null;
  if (s === promptFor) return;
  promptFor = s;
  const el = $('prompt');
  if (!s) { el.classList.add('hidden'); return; }
  $('pr-title').textContent = `${s.g.emoji} ${s.g.title}`;
  $('pr-desc').textContent = s.g.desc || '';
  $('pr-go').textContent = s.g.soon ? 'בקרוב! 🚧' : 'יאללה ▶';
  $('pr-go').disabled = !!s.g.soon;
  el.classList.remove('hidden');
}

function toHub() {
  C.mode = 'hub';
  if (C.game) leaveGame();
  C.kid.ring.visible = true;
  if (C.kid.pos.distanceTo(STAGE) < 0.1 || C.kid.pos.z > 8) { C.kid.pos.set(0, 0, 5.4); C.kid.facing = -Math.PI / 2; }
  showStations(true);
  showUI('hub');
  $('hub-name').textContent = CHARACTERS[charIdx].name;
  promptFor = undefined; updatePrompt();
}

function enterGame(g) {
  if (!g || g.soon) return;
  goal = null; keys.clear();
  C.game = g; C.mode = 'game';
  showStations(false);
  showUI('game');
  SFX.initAudio(); SFX.startAmbience();
  g.enter(C);
}
function leaveGame() {
  const g = C.game; if (!g) return;
  C.game = null;
  try { g.exit(C); } catch (e) { console.error(e); }
  // הדמות חוזרת לחצר, ליד התחנה של המשחק
  C.kid.pos.set(g.station.x, 0, g.station.z + 2.2); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
}
function exitGame() { toHub(); }

// מה מוצג על המסך: בחירת דמות / חצר / משחק (המשחק מציג את החלונות שלו בעצמו)
function showUI(which) {
  $('choose').classList.toggle('hidden', which !== 'choose');
  $('hub-bar').classList.toggle('hidden', which !== 'hub');
  if (which !== 'hub') $('prompt').classList.add('hidden');
  document.body.dataset.mode = which;
}

// ---------- ילדי השכונה ----------
const CROWD = [[-15.6, -4.2], [-15.8, 2.2], [15.7, -3.6], [15.9, 1.6], [-9.5, -9.4], [8.6, -9.5]];
function makeExtras() {
  const n = isTouch() ? 3 : CROWD.length;
  const models = ['Casual_Female', 'Casual3_Male', 'Casual2_Female', 'Worker_Male', 'Casual3_Female', 'Casual_Bald'];
  C.extras = EXTRA_KIDS.slice(0, n).map((o, i) => {
    const k = new Player(C.R.scene, { ...o, attackDir: 1, name: '', model: C.A.kids && C.A.kids[models[i % models.length]], noShadow: true, height: 1.3 + Math.random() * 0.15 });
    k.ring.visible = false; k.arrow.visible = false;
    k.root.scale.setScalar(0.9 + Math.random() * 0.12);
    k.root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    k.pos.set(CROWD[i][0], 0, CROWD[i][1]);
    return k;
  });
}

// ---------- לחיצות ומקלדת ----------
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayFrom(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, C.R.camera);
  return raycaster;
}
function groundAt(e, y = 0.04) {
  const p = new THREE.Vector3();
  return rayFrom(e).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
}
function walkTo(p, onArrive) {
  const t = p.clone(); t.y = 0;
  t.x = THREE.MathUtils.clamp(t.x, -15, 15); t.z = THREE.MathUtils.clamp(t.z, -8.3, 8.3);
  goal = { to: t, onArrive };
}
function setupInput() {
  C.R.renderer.domElement.addEventListener('pointerdown', (e) => {
    SFX.initAudio();
    if (C.mode === 'choose') return;
    if (C.mode === 'game') { if (C.game.onTap && C.game.onTap(e, C)) return; if (C.game.canMove && !C.game.canMove(C)) return; }
    if (C.mode === 'hub') {
      // לחיצה על תחנה = הולכים אליה
      const hits = rayFrom(e).intersectObjects(stations.map((s) => s.grp), true)[0];
      if (hits) { const s = stations.find((x) => x.grp === hits.object.parent || x.grp.children.includes(hits.object)); if (s) return walkTo(new THREE.Vector3(s.g.station.x, 0, s.g.station.z + 0.3)); }
    }
    const p = groundAt(e);
    if (p) walkTo(p);
  });
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter'))) return;
    if (C.mode === 'choose') {
      if (e.code === 'ArrowRight') stepChoice(-1);
      else if (e.code === 'ArrowLeft') stepChoice(1);
      else if (e.code === 'Enter' || e.code === 'Space') confirmChoice();
      e.preventDefault(); return;
    }
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (C.mode === 'hub') { const s = nearStation(); if (s) enterGame(s.g); }
      else if (C.mode === 'game' && C.game.onAction) C.game.onAction(C);
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  // כפתורים
  $('ch-prev').addEventListener('click', () => stepChoice(-1)); // › (מימין) – הקודמת
  $('ch-next').addEventListener('click', () => stepChoice(1));  // ‹ (משמאל) – הבאה
  $('ch-ok').addEventListener('click', confirmChoice);
  $('btn-char').addEventListener('click', () => chooseCharacter(charIdx));
  $('pr-go').addEventListener('click', () => { if (promptFor) enterGame(promptFor.g); });
}

// ---------- הודעות ----------
let popTimer = null;
function pop(title, sub, color) {
  const el = $('pop');
  el.querySelector('.t').textContent = title;
  el.querySelector('.s').textContent = sub || '';
  el.style.setProperty('--c', color || '#fff');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(popTimer); popTimer = setTimeout(() => el.classList.remove('show'), 1300);
}
let msgTimer = null;
function message(t, ms) {
  const el = $('msg'); el.textContent = t; el.classList.add('show');
  clearTimeout(msgTimer); msgTimer = setTimeout(() => el.classList.remove('show'), ms || 2400);
}

// ---------- תנועה ----------
function stepKid(dt) {
  const k = C.kid;
  let mv = null;
  const canMove = C.mode === 'hub' || (C.mode === 'game' && (!C.game.canMove || C.game.canMove(C)));
  if (canMove) {
    const kx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const kz = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    if (kx || kz) { goal = null; mv = new THREE.Vector3(kx, 0, kz).normalize().multiplyScalar(SPEED); }
    else if (goal) {
      const d = goal.to.clone().sub(k.pos); d.y = 0;
      const L = d.length();
      if (L < 0.12) { const cb = goal.onArrive; goal = null; if (cb) cb(); }
      else mv = d.multiplyScalar(Math.min(SPEED, L * 5) / L);
    }
  } else goal = null;
  if (mv) {
    k.vel.lerp(mv, Math.min(1, dt * 12));
    k.pos.addScaledVector(k.vel, dt);
    k.pos.x = THREE.MathUtils.clamp(k.pos.x, -15.3, 15.3); k.pos.z = THREE.MathUtils.clamp(k.pos.z, -8.4, 8.4);
    const want = Math.atan2(k.vel.z, k.vel.x);
    let df = want - k.facing; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
    k.facing += df * Math.min(1, dt * 12);
  } else k.vel.multiplyScalar(Math.max(0, 1 - dt * 14));
}

// ---------- מצלמה ----------
const camLook = new THREE.Vector3();
let camInit = false;
function camera(dt) {
  const cam = C.R.camera;
  const aspect = innerWidth / innerHeight;
  const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  let pos, look, speed = 3;
  const custom = C.mode === 'game' && C.game.camera ? C.game.camera(C, vt, aspect) : null;
  if (custom) ({ pos, look } = custom), speed = custom.speed || 3;
  else if (C.mode === 'choose') {
    // מקרוב, מול הדמות
    look = new THREE.Vector3(STAGE.x, 0.85, STAGE.z);
    pos = new THREE.Vector3(STAGE.x + Math.sin(C.time * 0.4) * 0.6, 1.5, STAGE.z + 3.6);
    speed = 4;
  } else {
    // בחצר: מלווה את הדמות מאחור ומלמעלה
    // גבוה ורחוק מספיק כדי לראות את המגרש והתחנות, ועדיין זז עם הדמות
    const tilt = THREE.MathUtils.degToRad(56);
    const dist = 12.5 / (vt * Math.min(aspect, 1.8));
    look = new THREE.Vector3(C.kid.pos.x * 0.6, 0, C.kid.pos.z * 0.5 - 1.2);
    pos = look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist));
  }
  const k = camInit ? 1 - Math.exp(-dt * speed) : 1;
  camInit = true;
  cam.position.lerp(pos, k);
  camLook.lerp(look, k);
  cam.lookAt(camLook);
  cam.updateMatrixWorld();
  C.R.sun.target.position.set(camLook.x, 0, camLook.z);
  C.R.sun.position.copy(C.R.SUN_OFFSET).add(C.R.sun.target.position);
}

// ---------- לולאה ----------
let last = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  C.time += dt;
  stepKid(dt);
  if (C.mode === 'game' && C.game.update) C.game.update(dt, C);
  if (C.mode === 'choose') C.kid.facing = Math.PI / 2;
  C.kid.update(dt, C.time);
  for (const e of C.extras) {
    const want = Math.atan2(C.kid.pos.z - e.pos.z, C.kid.pos.x - e.pos.x);
    let d = want - e.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    e.facing += d * Math.min(1, dt * 3);
    e.update(dt, C.time);
  }
  for (const s of stations) if (s.grp.visible) s.ring.material.opacity = 0.45 + 0.35 * Math.sin(C.time * 3);
  updatePrompt();
  animateWorld(C.W, C.time);
  camera(dt);
  C.R.render();
}

boot().catch((e) => {
  console.error(e);
  $('load-msg').textContent = e && e.message === 'NO_3D'
    ? 'הדפדפן הזה לא מצליח להפעיל גרפיקה תלת-ממדית. נסו דפדפן אחר (כרום או אדג׳ מעודכנים).'
    : 'משהו השתבש בטעינה. נסו לרענן את הדף.';
});
