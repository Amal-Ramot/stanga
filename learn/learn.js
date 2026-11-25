// סטנגה קוראים – מחסן המילים
// הסיפור פרוס על המגרש כמו דף ענק ממחברת, וחסרות בו מילים.
// אבי לוקח ארגז-מילה מהמחסן ומניח אותו במקום החסר.
// משתמש באותו עולם, אותם ילדים ואותם צלילים של סטנגה שכונות (../js/)
import * as THREE from 'three';
import { loadAll, onProgress } from '../js/assets.js';
import { buildWorld, animateWorld } from '../js/world.js';
import { Player, KIDS, EXTRA_KIDS } from '../js/player.js';
import { createRenderer } from '../js/render.js';
import * as SFX from '../js/audio.js';
import { STORIES } from './stories.js';
import { STORIES_A } from './stories-a.js';

const $ = (id) => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-learn-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-learn-' + k, JSON.stringify(v)); } catch {} },
};

// ---------- פריסה על המגרש (מטרים) ----------
const PAGE = { w: 24, h: 11.4, cx: 0, cz: -1.5 };   // הדף הענק
const SHELF_Z = 6.5;                                 // שורת הארגזים של המחסן
const CW = 2048, CH = Math.round(CW * PAGE.h / PAGE.w);
const SPEED = 4.6;

const S = { phase: 'menu', story: null, mistakes: 0, filled: 0, grade: store.get('grade', 'c') };
// כיתה א' (עם ניקוד) או כיתה ג'
const list = () => (S.grade === 'a' ? STORIES_A : STORIES);
const hasNikud = (story) => story && story.id.startsWith('a-');
const NIKUD_FONT = '"Noto Sans Hebrew", Rubik';
let FF = 'Rubik'; // הגופן של הדף והארגזים (בכיתה א' – גופן שמציג ניקוד ברור)
const plain = (w) => w.replace(/[\u0591-\u05C7]/g, ''); // בלי ניקוד – להשוואה
let R, W, A, kid, extras = [];
let page = null;       // { mesh, canvas, ctx, tex, blanks: [...] }
let crates = [];       // ארגזי המילים
let held = null;       // הארגז שאבי מחזיק
let goal = null;       // לאן אבי הולך ומה יעשה כשיגיע
let time = 0;
const keys = new Set();

// ---------- אתחול ----------
async function boot() {
  const forced = new URLSearchParams(location.search).get('q');
  onProgress((p) => { $('load-bar').style.width = `${Math.round(p * 100)}%`; });
  try { await document.fonts.load('500 40px Rubik'); await document.fonts.load('800 40px Rubik'); } catch {}
  try { await Promise.all(['500', '700', '800'].map((w) => document.fonts.load(`${w} 40px "Noto Sans Hebrew"`, 'אָבּ'))); } catch {}
  A = await loadAll();
  R = await createRenderer($('game'), A, forced || (isTouch() ? 'low' : 'medium'));
  W = buildWorld(R.scene, A);
  clearPageArea();
  kid = new Player(R.scene, { ...KIDS.p1, model: A.kids && A.kids.Casual_Male, shirt: '#7fb2e0', pants: '#2f4a73', skin: '#e2b08a' });
  kid.arrow.visible = false;
  kid.ringMat.color.set('#ffd23f');
  makeExtras();
  makeShelfSign();
  kid.pos.set(0, 0, 4.6); kid.facing = -Math.PI / 2;
  setupUI();
  $('loading').classList.add('hidden');
  $('menu').classList.remove('hidden');
  R.renderer.setAnimationLoop(loop);
  window.__ready = R.backend;
  window.__S = S;
  window.__R = R;
  window.__dbg = { get crates() { return crates; }, get page() { return page; }, tap: (x, y) => onTap({ clientX: x, clientY: y }), solve: () => { for (const b of page.blanks) b.filled = true; S.filled = page.blanks.length; drawPage(); finish(); } }; // לבדיקות
}

// מתחת לדף אין בורות ועשבים – אחרת הם מציצים דרך הנייר ומסתירים אותיות
function clearPageArea() {
  const x0 = PAGE.cx - PAGE.w / 2 - 0.4, x1 = PAGE.cx + PAGE.w / 2 + 0.4;
  const z0 = PAGE.cz - PAGE.h / 2 - 0.4, z1 = PAGE.cz + PAGE.h / 2 + 0.4;
  const inside = (x, z) => x > x0 && x < x1 && z > z0 && z < z1;
  R.scene.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const m = o.material;
    // בורות: מדבקות שקופות קטנות על האספלט
    if (m.transparent && o.position.y > 0.015 && o.position.y < 0.02 && inside(o.position.x, o.position.z)) o.visible = false;
    // עשבים: גוש אחד מאוחד ונמוך – מעלימים רק את המשולשים שבתוך הדף
    if (m.alphaTest > 0 && o.geometry && o.parent === R.scene) {
      const g = o.geometry; g.computeBoundingBox();
      if (g.boundingBox.max.y > 0.7) return;
      const pos = g.attributes.position;
      const idx = g.index;
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
        const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
        if (!inside(cx, cz)) continue;
        if (idx) { idx.setX(i + 1, a); idx.setX(i + 2, a); } else { for (const v of [b, c]) pos.setXYZ(v, pos.getX(a), pos.getY(a), pos.getZ(a)); }
      }
      if (idx) idx.needsUpdate = true; else pos.needsUpdate = true;
    }
  });
}

// ילדי השכונה צופים מהצד
const CROWD = [[-15.6, -4.2], [-15.8, 2.2], [15.7, -3.6], [15.9, 1.6], [-9.5, -9.4], [8.6, -9.5]];
function makeExtras() {
  const n = isTouch() ? 3 : CROWD.length;
  const models = ['Casual_Female', 'Casual3_Male', 'Casual2_Female', 'Worker_Male', 'Casual3_Female', 'Casual_Bald'];
  extras = EXTRA_KIDS.slice(0, n).map((o, i) => {
    const k = new Player(R.scene, { ...o, attackDir: 1, name: '', model: A.kids && A.kids[models[i % models.length]], noShadow: true, height: 1.3 + Math.random() * 0.15 });
    k.ring.visible = false; k.arrow.visible = false;
    k.root.scale.setScalar(0.9 + Math.random() * 0.12);
    k.root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    k.pos.set(CROWD[i][0], 0, CROWD[i][1]);
    return k;
  });
}

// ---------- ציור הדף על קנבס ----------
function splitToken(tok) {
  const pre = tok.match(/^["'.,?!:…]+/)?.[0] || '';
  const post = tok.match(/["'.,?!:…]+$/)?.[0] || '';
  // גרש בסוף מילה (ג'ינג'י) הוא חלק מהמילה
  let core = tok.slice(pre.length, tok.length - post.length);
  return { pre, core, post };
}

function layoutPage(story) {
  const paras = story.field.map((i) => story.text[i]);
  const need = story.blanks.map(plain);
  // מסמנים את המופע הראשון של כל מילה חסרה (ההשוואה בלי ניקוד)
  const tokens = [];
  paras.forEach((p, pi) => {
    p.split(/\s+/).forEach((t, ti) => {
      const s = splitToken(t);
      const bi = need.indexOf(plain(s.core));
      tokens.push({ ...s, raw: t, blank: bi >= 0 ? (need[bi] = null, true) : false, paraStart: ti === 0 && pi > 0, first: ti === 0 });
    });
  });
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const g = c.getContext('2d');
  // מחפשים את גודל האות הכי גדול שהקטע נכנס בו
  const allWords = [...story.blanks, ...story.extra];
  // בכיתה א' – אותיות גדולות במיוחד
  let font = hasNikud(story) ? 100 : 64, lines;
  for (; font >= 36; font -= 2) {
    lines = flow(g, tokens, font, allWords);
    if (lines.ok) break;
  }
  return { tokens, font, lay: lines, canvas: c, ctx: g };
}

const M_RIGHT = 150, M_LEFT = 70;
const topOf = (font, lh) => 50 + font * 1.3 + lh * 1.05; // קו הבסיס של השורה הראשונה (מתחת לכותרת)
function flow(g, tokens, font, allWords) {
  g.font = `500 ${font}px ${FF}`;
  const lh = Math.round(font * (FF === 'Rubik' ? 1.62 : 1.85)); // לניקוד צריך יותר מקום בין השורות
  const space = g.measureText(' ').width * 1.4;
  g.font = `700 ${font}px ${FF}`;
  const boxW = Math.max(...allWords.map((w) => g.measureText(w).width)) + font * 0.7;
  g.font = `500 ${font}px ${FF}`;
  let x = CW - M_RIGHT, line = 0;
  const placed = [];
  for (const t of tokens) {
    if (t.paraStart) { line++; x = CW - M_RIGHT; }
    if (t.first) x -= font * 1.2; // הזחה בתחילת פסקה
    const wPre = g.measureText(t.pre).width, wPost = g.measureText(t.post).width;
    const wCore = t.blank ? boxW : g.measureText(t.core).width;
    const w = wPre + wCore + wPost;
    if (x - w < M_LEFT) { line++; x = CW - M_RIGHT; }
    placed.push({ t, x, line, wPre, wCore, wPost });
    x -= w + space;
  }
  const lines = line + 1;
  const top = topOf(font, lh);
  return { ok: top + (lines - 1) * lh + font * 0.6 + 30 <= CH, placed, lh, boxW, top };
}

function drawPage() {
  const { ctx: g, lay, font, tokens } = page;
  const { lh, top: TOP } = lay;
  // נייר מחברת: שורות כחולות ושוליים אדומים מימין
  g.fillStyle = '#fdfbf2'; g.fillRect(0, 0, CW, CH);
  g.fillStyle = '#b7cde6';
  // קו מתחת לכל שורת טקסט (וגם מתחת לכותרת)
  for (let y = TOP - lh + font * 0.32; y < CH; y += lh) g.fillRect(0, Math.round(y), CW, 3);
  g.fillStyle = '#e59a9a'; g.fillRect(CW - M_RIGHT + 40, 0, 5, CH);
  // חורים של קלסר
  g.fillStyle = '#e9e4d6';
  for (const y of [CH * 0.2, CH * 0.5, CH * 0.8]) { g.beginPath(); g.arc(CW - 50, y, 18, 0, Math.PI * 2); g.fill(); }
  // כותרת
  g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#1f3f9c'; g.font = `800 ${Math.round(font * 1.15)}px ${FF}`;
  g.fillText(`${page.story.title}`, CW - M_RIGHT, TOP - lh * 1.05);
  // טקסט
  let bi = 0;
  for (const p of lay.placed) {
    const yBase = TOP + p.line * lh;
    let x = p.x;
    g.font = `500 ${font}px ${FF}`; g.fillStyle = '#141b33';
    if (p.t.pre) { g.fillText(p.t.pre, x, yBase); x -= p.wPre; }
    if (p.t.blank) {
      const b = page.blanks[bi++];
      const top = yBase - font * 0.95, h = font * 1.3;
      b.rect = { x: x - p.wCore, y: top, w: p.wCore, h };
      roundRect(g, x - p.wCore + 4, top, p.wCore - 8, h, 14);
      if (b.filled) {
        g.fillStyle = 'rgba(46, 204, 113, .18)'; g.fill();
        g.lineWidth = 4; g.strokeStyle = '#1f8a4c'; g.setLineDash([]); g.stroke();
        g.fillStyle = '#16703c'; g.font = `700 ${font}px ${FF}`; g.textAlign = 'center';
        g.fillText(b.word, x - p.wCore / 2, yBase); g.textAlign = 'right';
      } else {
        g.fillStyle = 'rgba(255, 226, 64, .45)'; g.fill();
        g.lineWidth = 5; g.strokeStyle = '#d9a400'; g.setLineDash([16, 10]); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(160, 120, 0, .55)'; g.font = `700 ${Math.round(font * 0.7)}px ${FF}`; g.textAlign = 'center';
        g.fillText('?', x - p.wCore / 2, yBase - font * 0.12); g.textAlign = 'right';
      }
      x -= p.wCore;
      g.font = `500 ${font}px ${FF}`; g.fillStyle = '#1c2540';
    } else { g.fillText(p.t.core, x, yBase); x -= p.wCore; }
    if (p.t.post) g.fillText(p.t.post, x, yBase);
  }
  page.tex.needsUpdate = true;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
// מקנבס לעולם
const toWorld = (px, py) => new THREE.Vector3(PAGE.cx + (px / CW - 0.5) * PAGE.w, 0, PAGE.cz + (py / CH - 0.5) * PAGE.h);

function buildPage(story) {
  if (page) { R.scene.remove(page.mesh); page.tex.dispose(); page.mesh.material.dispose(); for (const b of page.blanks) R.scene.remove(b.glow); }
  const L = layoutPage(story);
  page = { ...L, story, blanks: [] };
  for (const t of L.tokens) if (t.blank) page.blanks.push({ word: t.core, filled: false });
  page.tex = new THREE.CanvasTexture(L.canvas);
  page.tex.colorSpace = THREE.SRGBColorSpace;
  page.tex.anisotropy = 8;
  // הדף מצויר אחרי הקווים והגיר של המגרש (שהם שכבות שקופות), כך שהם לא עולים על האותיות
  const mat = new THREE.MeshStandardMaterial({ map: page.tex, roughness: 1, metalness: 0, transparent: true, opacity: 1, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  page.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE.w, PAGE.h), mat);
  page.mesh.rotation.x = -Math.PI / 2;
  page.mesh.renderOrder = 5;
  page.mesh.position.set(PAGE.cx, 0.06, PAGE.cz);
  page.mesh.receiveShadow = true;
  R.scene.add(page.mesh);
  drawPage();
  // מסגרת זוהרת מעל כל מקום חסר – מראה לאן אפשר להניח (וגם משמשת ללחיצה)
  for (const b of page.blanks) {
    const r = b.rect, a = toWorld(r.x, r.y), c = toWorld(r.x + r.w, r.y + r.h);
    const w = c.x - a.x, d = c.z - a.z;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.12, d + 0.12),
      new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set((a.x + c.x) / 2, 0.075, (a.z + c.z) / 2); glow.renderOrder = 6;
    glow.userData.blank = b; b.glow = glow; b.center = glow.position.clone(); b.size = [w, d];
    R.scene.add(glow);
  }
}

// ---------- המחסן: ארגזים עם מילים ----------
function labelTexture(word) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 220;
  const g = c.getContext('2d');
  g.fillStyle = '#f6ecd2'; g.fillRect(0, 0, 512, 220);
  g.strokeStyle = '#8a6a3c'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 210);
  g.fillStyle = '#1c2540'; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let f = 120; g.font = `800 ${f}px ${FF}`;
  while (g.measureText(word).width > 460 && f > 50) { f -= 6; g.font = `800 ${f}px ${FF}`; }
  g.fillText(word, 256, 118);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const woodMat = new THREE.MeshStandardMaterial({ color: '#b07a43', roughness: 0.85 });
const woodDark = new THREE.MeshStandardMaterial({ color: '#7d532a', roughness: 0.9 });
function makeCrate(word, slot) {
  const W_ = 2.3, H = 0.5, D = 1.0;
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(W_, H, D), woodMat);
  box.position.y = H / 2; box.castShadow = true; box.receiveShadow = true; g.add(box);
  for (const s of [-1, 1]) { // קרשים כהים בצדדים
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, H + 0.02, D + 0.02), woodDark);
    p.position.set(s * (W_ / 2 - 0.04), H / 2, 0); g.add(p);
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(W_ - 0.2, D - 0.12), new THREE.MeshStandardMaterial({ map: labelTexture(word), roughness: 0.9 }));
  lab.rotation.x = -Math.PI / 2; lab.position.y = H + 0.012; g.add(lab);
  g.traverse((o) => { o.userData.crate = true; });
  R.scene.add(g);
  const cr = { word, group: g, home: slot.clone(), state: 'shelf', fly: null };
  g.userData.crateRef = cr;
  g.traverse((o) => { o.userData.crateRef = cr; });
  g.position.copy(slot);
  return cr;
}
function buildCrates(story) {
  for (const c of crates) R.scene.remove(c.group);
  const words = [...page.blanks.map((b) => b.word), ...story.extra];
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const n = words.length, gap = 2.65;
  crates = words.map((w, i) => makeCrate(w, new THREE.Vector3((i - (n - 1) / 2) * gap, 0, SHELF_Z)));
}
// שלט "מחסן המילים" ומשטח עץ מתחת לארגזים
function makeShelfSign() {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.06, 1.7), new THREE.MeshStandardMaterial({ color: '#8c6a45', roughness: 0.95 }));
  deck.position.set(0, 0.03, SHELF_Z); deck.receiveShadow = true; R.scene.add(deck);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#2f6a3a'; g.fillRect(0, 0, 1024, 200);
  g.strokeStyle = '#f4f0e0'; g.lineWidth = 12; g.strokeRect(10, 10, 1004, 180);
  g.fillStyle = '#fff8dc'; g.font = '800 110px Rubik'; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('מחסן המילים', 512, 108);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.98), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  sign.position.set(0, 0.05, SHELF_Z + 1.45); sign.rotation.x = -Math.PI / 2;
  R.scene.add(sign);
}

// ---------- ממשק ----------
function setupUI() {
  renderStoryList();
  $('btn-rules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('rules-close').addEventListener('click', () => { $('rules').classList.add('hidden'); SFX.initAudio(); });
  $('btn-home').addEventListener('click', toMenu);
  $('btn-again').addEventListener('click', () => startStory(S.story));
  $('btn-next').addEventListener('click', () => { const L = list(); const i = L.indexOf(S.story); if (L[i + 1]) startStory(L[i + 1]); else toMenu(); });
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => { S.grade = b.dataset.grade; store.set('grade', S.grade); renderStoryList(); SFX.initAudio(); SFX.sfxKick(0.2); }));
  $('btn-other').addEventListener('click', toMenu);
  R.renderer.domElement.addEventListener('pointerdown', onTap);
  addEventListener('keydown', (e) => {
    if (S.phase !== 'play') return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); actNearby(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('resize', checkOrientation);
  checkOrientation();
}

// סיפור נפתח אחרי שמשלימים את הסיפור שלפניו
const isOpen = (i, done = store.get('done', {})) => i === 0 || done[list()[i - 1].id] != null;
function renderStoryList() {
  const done = store.get('done', {});
  const box = $('stories'); box.innerHTML = '';
  document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('on', x.dataset.grade === S.grade));
  box.classList.toggle('nikud', S.grade === 'a');
  const STORIES = list();
  STORIES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const open = isOpen(i, done);
    const st = done[s.id];
    b.className = 'story-card' + (open ? '' : ' locked') + (open && st == null ? ' next' : '');
    b.innerHTML = `<span class="num">${i + 1}</span><span class="em">${open ? s.emoji : '🔒'}</span><span class="tt"></span>${st != null ? `<span class="best">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` : ''}`;
    b.querySelector('.tt').textContent = open ? s.title : 'נפתח אחרי הסיפור הקודם';
    b.disabled = !open;
    b.addEventListener('click', () => { if (!open) return; SFX.initAudio(); SFX.startAmbience(); startStory(s); });
    box.appendChild(b);
  });
  const n = STORIES.filter((s) => done[s.id] != null).length;
  $('progress').textContent = `(${n} מתוך ${STORIES.length})`;
}
const starsFor = (m) => (m === 0 ? 3 : m <= 2 ? 2 : 1);

function checkOrientation() {
  const portrait = innerWidth / innerHeight < 0.95;
  $('rotate').classList.toggle('hidden', !(portrait && S.phase === 'play'));
}

function startStory(story) {
  S.story = story; S.mistakes = 0; S.filled = 0;
  FF = hasNikud(story) ? NIKUD_FONT : 'Rubik';
  document.body.classList.toggle('nikud', hasNikud(story));
  buildPage(story);
  buildCrates(story);
  held = null; goal = null;
  kid.pos.set(0, 0, 4.6); kid.facing = -Math.PI / 2; kid.vel.set(0, 0, 0);
  S.phase = 'play';
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('story-lbl').textContent = `${story.emoji} ${story.title}`;
  updateHud();
  hint('לחצו על ארגז במחסן המילים (למטה) כדי לקחת מילה');
  checkOrientation();
  if (!store.get('seen-rules', false)) { store.set('seen-rules', true); $('rules').classList.remove('hidden'); }
}

function toMenu() {
  S.phase = 'menu'; goal = null;
  $('menu').classList.remove('hidden'); $('hud').classList.add('hidden'); $('over').classList.add('hidden');
  renderStoryList();
  checkOrientation();
}

function updateHud() {
  $('filled').textContent = `${S.filled}/${page.blanks.length}`;
  const st = starsFor(S.mistakes);
  $('stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
}
function hint(t) { $('hint').textContent = t || ''; }

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

// ---------- לחיצות ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function onTap(e) {
  if (S.phase !== 'play') return;
  SFX.initAudio();
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, R.camera);
  // ארגז?
  const shelfCrates = crates.filter((c) => c.state === 'shelf').map((c) => c.group);
  const hitC = ray.intersectObjects(shelfCrates, true)[0];
  if (hitC) return goToCrate(hitC.object.userData.crateRef);
  // מקום חסר? (בודקים לפי מיקום על הרצפה, עם קצת מרווח)
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.04), p)) return;
  const b = blankAt(p, 0.35);
  if (b) {
    if (b.filled) return message('את המקום הזה כבר מילאנו ✓');
    if (!held) { message('קודם לוקחים מילה מהמחסן 📦'); return walkTo(p, null); }
    return walkTo(b.center, { type: 'drop', blank: b });
  }
  // לחיצה על המחסן כשמחזיקים מילה = מחזירים אותה
  if (held && Math.abs(p.z - SHELF_Z) < 1 && Math.abs(p.x) < 12) return walkTo(held.home.clone().add(new THREE.Vector3(0, 0, -1.05)), { type: 'return' });
  walkTo(p, null);
}
function blankAt(p, pad) {
  if (!page) return null;
  for (const b of page.blanks) {
    if (Math.abs(p.x - b.center.x) <= b.size[0] / 2 + pad && Math.abs(p.z - b.center.z) <= b.size[1] / 2 + pad) return b;
  }
  return null;
}
function goToCrate(cr) {
  if (held === cr) return;
  walkTo(cr.home.clone().add(new THREE.Vector3(0, 0, -1.05)), { type: 'pick', crate: cr });
}
function walkTo(p, action) {
  const t = p.clone(); t.y = 0;
  t.x = THREE.MathUtils.clamp(t.x, -15, 15); t.z = THREE.MathUtils.clamp(t.z, -8.3, 8.3);
  goal = { to: t, action };
}

// מקלדת: רווח לוקח את הארגז הקרוב או מניח במקום הקרוב
function actNearby() {
  if (!held) {
    let best = null, bd = 1.7;
    for (const c of crates) if (c.state === 'shelf') { const d = Math.hypot(c.home.x - kid.pos.x, c.home.z - kid.pos.z); if (d < bd) { bd = d; best = c; } }
    if (best) pick(best); else message('צריך לעמוד ליד ארגז במחסן');
  } else {
    const b = blankAt(kid.pos, 0.6);
    if (b && !b.filled) drop(b);
    else if (Math.abs(kid.pos.z - SHELF_Z) < 1.8) returnHeld();
    else message('צריך לעמוד על מקום חסר (מסגרת צהובה)');
  }
}

function pick(cr) {
  if (held) returnHeld(true);
  held = cr; cr.state = 'held';
  SFX.sfxKick(0.25);
  kid.play('lob');
  hint(`לוקחים את "${cr.word}" למקום החסר המתאים בסיפור`);
}
function returnHeld(quiet) {
  if (!held) return;
  const cr = held; held = null;
  cr.state = 'flying';
  cr.fly = { t: 0, dur: 0.6, from: cr.group.position.clone(), to: cr.home.clone(), back: true };
  if (!quiet) hint('לחצו על ארגז במחסן המילים כדי לקחת מילה');
}
function drop(b) {
  const cr = held; if (!cr) return;
  kid.play('kick');
  if (cr.word === b.word) {
    held = null; cr.state = 'flying';
    cr.fly = { t: 0, dur: 0.35, from: cr.group.position.clone(), to: b.center.clone(), into: b };
  } else {
    S.mistakes++;
    SFX.sfxBuzz();
    kid.play('sad');
    message(`"${cr.word}" לא מתאימה כאן. קראו את המשפט שוב 🧐`, 2800);
    returnHeld(true);
    updateHud();
    hint('לחצו על ארגז במחסן המילים כדי לקחת מילה');
  }
}
function placed(b, cr) {
  b.filled = true; S.filled++;
  R.scene.remove(cr.group); cr.state = 'used';
  drawPage();
  SFX.sfxCheer(false);
  for (const e of extras) if (Math.random() < 0.6) setTimeout(() => e.play('cheer'), Math.random() * 300);
  const left = page.blanks.length - S.filled;
  pop(['יופי!', 'מצוין!', 'נכון!', 'כל הכבוד!'][Math.floor(Math.random() * 4)], left ? `נשארו עוד ${left}` : '', '#7ee08a');
  updateHud();
  hint(left ? 'לחצו על ארגז במחסן המילים כדי לקחת עוד מילה' : '');
  if (!left) setTimeout(finish, 1400);
}

function finish() {
  S.phase = 'over';
  kid.play('cheer'); kid.setEmote && kid.setEmote('cheer');
  SFX.sfxCheer(true);
  const st = starsFor(S.mistakes);
  const done = store.get('done', {});
  done[S.story.id] = Math.max(done[S.story.id] ?? 0, st);
  store.set('done', done);
  const STORIES = list();
  const idx = STORIES.indexOf(S.story);
  const nextS = STORIES[idx + 1];
  const allDone = STORIES.every((x) => done[x.id] != null);
  $('over-title').textContent = !nextS && allDone ? 'סיימת את כל הסיפורים! 🏆' : 'השלמת את הסיפור! 🎉';
  $('btn-next').textContent = nextS ? `לסיפור הבא: ${nextS.emoji} ${nextS.title} ▶` : 'לכל הסיפורים';
  $('btn-next').classList.toggle('unlock', !!nextS);
  $('over-stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('over-sub').textContent = S.mistakes === 0 ? 'בלי אף טעות – אלוף הקריאה של השכונה!' : `השלמת ${page.blanks.length} מילים עם ${S.mistakes} ${S.mistakes === 1 ? 'טעות' : 'טעויות'}.`;
  // הקטע המלא, עם המילים שהושלמו מודגשות
  const box = $('over-text'); box.innerHTML = '';
  const need = S.story.blanks.map(plain);
  for (const i of S.story.field) {
    const p = document.createElement('p');
    S.story.text[i].split(/\s+/).forEach((t, k) => {
      if (k) p.append(' ');
      const s = splitToken(t);
      const bi = need.indexOf(plain(s.core));
      if (bi >= 0) { need[bi] = null; p.append(s.pre); const m = document.createElement('mark'); m.textContent = s.core; p.append(m, s.post); }
      else p.append(t);
    });
    box.appendChild(p);
  }
  $('hud').classList.add('hidden');
  $('over').classList.remove('hidden');
}

// ---------- תנועה ----------
function stepKid(dt) {
  let mv = null;
  if (S.phase === 'play') {
    const kx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const kz = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    if (kx || kz) { goal = null; mv = new THREE.Vector3(kx, 0, kz).normalize().multiplyScalar(SPEED); }
    else if (goal) {
      const d = goal.to.clone().sub(kid.pos); d.y = 0;
      const L = d.length();
      if (L < 0.12) {
        const a = goal.action; goal = null;
        if (a) {
          if (a.type === 'pick' && a.crate.state === 'shelf') pick(a.crate);
          else if (a.type === 'drop' && held && !a.blank.filled) drop(a.blank);
          else if (a.type === 'return') returnHeld();
        }
      } else mv = d.multiplyScalar(Math.min(SPEED, L * 5) / L);
    }
  }
  if (mv) {
    kid.vel.lerp(mv, Math.min(1, dt * 12));
    kid.pos.addScaledVector(kid.vel, dt);
    kid.pos.x = THREE.MathUtils.clamp(kid.pos.x, -15.3, 15.3); kid.pos.z = THREE.MathUtils.clamp(kid.pos.z, -8.4, 8.4);
    const want = Math.atan2(kid.vel.z, kid.vel.x);
    let df = want - kid.facing; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
    kid.facing += df * Math.min(1, dt * 12);
  } else kid.vel.multiplyScalar(Math.max(0, 1 - dt * 14));
}

function stepCrates(dt) {
  for (const c of crates) {
    if (c.state === 'held') {
      // מעל הראש של אבי
      const target = kid.pos.clone(); target.y = 1.55 + Math.abs(Math.sin(time * 9)) * 0.03 * Math.min(1, kid.vel.length());
      c.group.position.lerp(target, Math.min(1, dt * 18));
      c.group.scale.setScalar(0.62);
    } else if (c.fly) {
      const F = c.fly; F.t += dt;
      const p = Math.min(1, F.t / F.dur);
      c.group.position.lerpVectors(F.from, F.to, p);
      c.group.position.y = THREE.MathUtils.lerp(F.from.y, F.to.y, p) + Math.sin(Math.PI * p) * (F.back ? 1.4 : 0.5);
      c.group.scale.setScalar(F.into ? 0.62 * (1 - p * 0.6) : 0.62 + 0.38 * p);
      if (p >= 1) {
        c.fly = null;
        if (F.into) placed(F.into, c);
        else { c.state = 'shelf'; c.group.position.copy(c.home); c.group.scale.setScalar(1); SFX.sfxBounce(0.4); }
      }
    } else if (c.state === 'shelf') {
      c.group.scale.setScalar(1);
      c.group.position.y = 0.06;
    }
  }
  // המקומות החסרים מהבהבים כשמחזיקים מילה
  if (page) for (const b of page.blanks) b.glow.material.opacity = !b.filled && held ? 0.28 + 0.22 * Math.sin(time * 5) : 0;
}

// ---------- מצלמה ----------
// מבט מלמעלה בזווית, כך שכל הדף והמחסן נכנסים למסך
// זווית: 50° מהרצפה, 6° מהצד. המצלמה עוקבת אחרי אבי בהזזה בלבד (בלי סיבוב), כך שהשורות נשארות ישרות וקריאות
// שתי זוויות:
//  • מלמעלה – כל הסיפור והמחסן על המסך (כשאבי לא מחזיק מילה)
//  • מקרוב – כשאבי מחזיק מילה, המצלמה מתקרבת ומלווה אותו עד שהוא מניח אותה
const CAM_TOP = { tilt: 62, hw: 14.3, hd: 8.4 };
const CAM_NEAR = { tilt: 48, hw: 4.6, ahead: 1.5 }; // ממש קרוב מאחורי אבי, קצת מלמעלה כדי שהארגז לא יסתיר את הטקסט שלפניו
function camera() {
  const cam = R.camera;
  const aspect = innerWidth / innerHeight;
  const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  let pos, look;
  const near = S.phase === 'play' && held;
  if (S.phase === 'menu') {
    const t = time * 0.06;
    pos = new THREE.Vector3(Math.sin(t) * 6, 11, 22); look = new THREE.Vector3(0, 0, 0);
  } else if (near) {
    // מקרוב, מאחורי אבי ומעט מעליו; מסתכלים קצת קדימה כדי לראות את השורות שלפניו
    const tilt = THREE.MathUtils.degToRad(CAM_NEAR.tilt);
    const dist = CAM_NEAR.hw / (vt * Math.min(aspect, 1.8));
    look = new THREE.Vector3(kid.pos.x, 0.5, kid.pos.z - CAM_NEAR.ahead);
    pos = look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist));
  } else {
    // מלמעלה, כמו בהתחלה – כל הדף והמחסן נכנסים למסך
    const tilt = THREE.MathUtils.degToRad(CAM_TOP.tilt);
    const dist = Math.max(CAM_TOP.hw / (vt * aspect), CAM_TOP.hd * Math.sin(tilt) / vt) * 1.03;
    look = new THREE.Vector3(0, 0, 0.45);
    pos = look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist));
  }
  // מעבר רך בין הזוויות (תלוי בזמן, כך שהוא זהה במחשב מהיר ואיטי)
  const k = S.phase === 'menu' ? 1 : 1 - Math.exp(-(camera.dt || 0.016) * (near ? 4 : 2.4));
  cam.position.lerp(pos, k);
  if (!camera.look) camera.look = look.clone();
  camera.look.lerp(look, k);
  cam.lookAt(camera.look);
  cam.updateMatrixWorld();
  R.sun.target.position.set(camera.look.x, 0, camera.look.z);
  R.sun.position.copy(R.SUN_OFFSET).add(R.sun.target.position);
}

// ---------- לולאה ----------
let last = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  stepKid(dt);
  stepCrates(dt);
  kid.update(dt, time);
  for (const e of extras) {
    const want = Math.atan2(kid.pos.z - e.pos.z, kid.pos.x - e.pos.x);
    let d = want - e.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    e.facing += d * Math.min(1, dt * 3);
    e.update(dt, time);
  }
  animateWorld(W, time);
  camera.dt = dt; camera();
  R.render();
}

boot().catch((e) => {
  console.error(e);
  $('load-msg').textContent = e && e.message === 'NO_3D'
    ? 'הדפדפן הזה לא מצליח להפעיל גרפיקה תלת-ממדית. נסו דפדפן אחר (כרום או אדג׳ מעודכנים).'
    : 'משהו השתבש בטעינה. נסו לרענן את הדף.';
});
