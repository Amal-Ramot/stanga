// קוראים בהנאה – המשחק הראשון במגרש המשחקים (משחק "מחסן המילים")
// הסיפור פרוס על המגרש כמו דף ענק ממחברת, וחסרות בו מילים.
// הדמות לוקחת ארגז-מילה מהמחסן ומניחה אותו במקום החסר.
import * as THREE from 'three';
import { STORIES } from './stories.js';
import { STORIES_A } from './stories-a.js';
import { makeTheater, SKIP } from './theater.js';
import { SCENES } from './scenes.js';

// ההתקדמות נשמרת באותו מקום כמו בגרסה הקודמת (stanga/learn), כדי שלא תאבד
const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-learn-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-learn-' + k, JSON.stringify(v)); } catch {} },
};

// ---------- פריסה על המגרש (מטרים) ----------
const PAGE = { w: 24, h: 11.4, cx: 0, cz: -1.5 };   // הדף הענק
const SHELF_Z = 6.5;                                 // שורת הארגזים של המחסן
const CW = 2048, CH = Math.round(CW * PAGE.h / PAGE.w);

const S = { phase: 'menu', story: null, mistakes: 0, filled: 0, grade: store.get('grade', 'c') };
const list = () => (S.grade === 'a' ? STORIES_A : STORIES);
const hasNikud = (story) => story && story.id.startsWith('a-');
const NIKUD_FONT = '"Noto Sans Hebrew", Rubik';
let FF = 'Rubik';
const plain = (w) => w.replace(/[֑-ׇ]/g, ''); // בלי ניקוד – להשוואה
let C = null;          // הליבה של מגרש המשחקים
let page = null;
let crates = [];
let held = null;
let extrasBuilt = null; // משטח העץ והשלט של המחסן
let cleared = false;
let theater = null;   // הסרט שמציג את הסיפור בשכונה
const $ = (id) => document.getElementById(id);

export const WORDS = {
  id: 'words', title: 'קוראים בהנאה', emoji: '📖', color: '#d98a2b',
  station: { x: -7, z: 1.2 },
  desc: 'קוראים סיפור ומשלימים את המילים החסרות',
  enter(core) {
    C = core;
    if (!cleared) { clearPageArea(); cleared = true; }
    if (!extrasBuilt) { extrasBuilt = makeShelfSign(); setupUI(); }
    extrasBuilt.visible = true;
    C.kid.pos.set(0, 0, 4.6); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
    toMenu();
  },
  exit() {
    endScene(true);
    S.phase = 'menu';
    held = null;
    clearBoard();
    if (extrasBuilt) extrasBuilt.visible = false;
    for (const id of ['w-menu', 'w-hud', 'w-over', 'w-rules', 'rotate', 'scene-ui']) $(id).classList.add('hidden');
  },
  canMove: () => S.phase === 'play',
  onTap, onAction: actNearby, update, camera,
};

// ---------- ניקוי השטח שמתחת לדף ----------
// מתחת לדף אין בורות ועשבים – אחרת הם מציצים דרך הנייר ומסתירים אותיות
function clearPageArea() {
  const x0 = PAGE.cx - PAGE.w / 2 - 0.4, x1 = PAGE.cx + PAGE.w / 2 + 0.4;
  const z0 = PAGE.cz - PAGE.h / 2 - 0.4, z1 = PAGE.cz + PAGE.h / 2 + 0.4;
  const inside = (x, z) => x > x0 && x < x1 && z > z0 && z < z1;
  C.R.scene.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const m = o.material;
    if (m.transparent && o.position.y > 0.015 && o.position.y < 0.02 && inside(o.position.x, o.position.z)) o.visible = false;
    if (m.alphaTest > 0 && o.geometry && o.parent === C.R.scene) {
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

// ---------- ציור הדף על קנבס ----------
function splitToken(tok) {
  const pre = tok.match(/^["'.,?!:…]+/)?.[0] || '';
  const post = tok.match(/["'.,?!:…]+$/)?.[0] || '';
  const core = tok.slice(pre.length, tok.length - post.length); // גרש בסוף מילה (ג'ינג'י) הוא חלק מהמילה
  return { pre, core, post };
}
function layoutPage(story) {
  const paras = story.field.map((i) => story.text[i]);
  const need = story.blanks.map(plain);
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
  const allWords = [...story.blanks, ...story.extra];
  let font = hasNikud(story) ? 100 : 64, lines;
  for (; font >= 36; font -= 2) { lines = flow(g, tokens, font, allWords); if (lines.ok) break; }
  return { tokens, font, lay: lines, canvas: c, ctx: g };
}
const M_RIGHT = 150, M_LEFT = 70;
const topOf = (font, lh) => 50 + font * 1.3 + lh * 1.05;
function flow(g, tokens, font, allWords) {
  g.font = `500 ${font}px ${FF}`;
  const lh = Math.round(font * (FF === 'Rubik' ? 1.62 : 1.85));
  const space = g.measureText(' ').width * 1.4;
  g.font = `700 ${font}px ${FF}`;
  const boxW = Math.max(...allWords.map((w) => g.measureText(w).width)) + font * 0.7;
  g.font = `500 ${font}px ${FF}`;
  let x = CW - M_RIGHT, line = 0;
  const placed = [];
  for (const t of tokens) {
    if (t.paraStart) { line++; x = CW - M_RIGHT; }
    if (t.first) x -= font * 1.2;
    const wPre = g.measureText(t.pre).width, wPost = g.measureText(t.post).width;
    const wCore = t.blank ? boxW : g.measureText(t.core).width;
    const w = wPre + wCore + wPost;
    if (x - w < M_LEFT) { line++; x = CW - M_RIGHT; }
    placed.push({ t, x, line, wPre, wCore, wPost });
    x -= w + space;
  }
  const top = topOf(font, lh);
  return { ok: top + line * lh + font * 0.6 + 30 <= CH, placed, lh, boxW, top };
}
function drawPage() {
  const { ctx: g, lay, font } = page;
  const { lh, top: TOP } = lay;
  g.fillStyle = '#fdfbf2'; g.fillRect(0, 0, CW, CH);
  g.fillStyle = '#b7cde6';
  for (let y = TOP - lh + font * 0.32; y < CH; y += lh) g.fillRect(0, Math.round(y), CW, 3);
  g.fillStyle = '#e59a9a'; g.fillRect(CW - M_RIGHT + 40, 0, 5, CH);
  g.fillStyle = '#e9e4d6';
  for (const y of [CH * 0.2, CH * 0.5, CH * 0.8]) { g.beginPath(); g.arc(CW - 50, y, 18, 0, Math.PI * 2); g.fill(); }
  g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#1f3f9c'; g.font = `800 ${Math.round(font * 1.15)}px ${FF}`;
  g.fillText(`${page.story.title}`, CW - M_RIGHT, TOP - lh * 1.05);
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
const toWorld = (px, py) => new THREE.Vector3(PAGE.cx + (px / CW - 0.5) * PAGE.w, 0, PAGE.cz + (py / CH - 0.5) * PAGE.h);

function clearBoard() {
  if (page) { C.R.scene.remove(page.mesh); page.tex.dispose(); page.mesh.material.dispose(); for (const b of page.blanks) C.R.scene.remove(b.glow); page = null; }
  for (const c of crates) C.R.scene.remove(c.group);
  crates = [];
}
function buildPage(story) {
  clearBoard();
  const L = layoutPage(story);
  page = { ...L, story, blanks: [] };
  for (const t of L.tokens) if (t.blank) page.blanks.push({ word: t.core, filled: false });
  page.tex = new THREE.CanvasTexture(L.canvas);
  page.tex.colorSpace = THREE.SRGBColorSpace;
  page.tex.anisotropy = 8;
  // הדף מצויר אחרי הקווים והגיר של המגרש, כך שהם לא עולים על האותיות
  const mat = new THREE.MeshStandardMaterial({ map: page.tex, roughness: 1, metalness: 0, transparent: true, opacity: 1, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  page.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE.w, PAGE.h), mat);
  page.mesh.rotation.x = -Math.PI / 2;
  page.mesh.renderOrder = 5;
  page.mesh.position.set(PAGE.cx, 0.06, PAGE.cz);
  page.mesh.receiveShadow = true;
  C.R.scene.add(page.mesh);
  drawPage();
  for (const b of page.blanks) {
    const r = b.rect, a = toWorld(r.x, r.y), c = toWorld(r.x + r.w, r.y + r.h);
    const w = c.x - a.x, d = c.z - a.z;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.12, d + 0.12),
      new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set((a.x + c.x) / 2, 0.075, (a.z + c.z) / 2); glow.renderOrder = 6;
    b.glow = glow; b.center = glow.position.clone(); b.size = [w, d];
    C.R.scene.add(glow);
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
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, H + 0.02, D + 0.02), woodDark);
    p.position.set(s * (W_ / 2 - 0.04), H / 2, 0); g.add(p);
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(W_ - 0.2, D - 0.12), new THREE.MeshStandardMaterial({ map: labelTexture(word), roughness: 0.9 }));
  lab.rotation.x = -Math.PI / 2; lab.position.y = H + 0.012; g.add(lab);
  C.R.scene.add(g);
  const cr = { word, group: g, home: slot.clone(), state: 'shelf', fly: null };
  g.traverse((o) => { o.userData.crateRef = cr; });
  g.position.copy(slot);
  return cr;
}
function buildCrates(story) {
  const words = [...page.blanks.map((b) => b.word), ...story.extra];
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  const n = words.length, gap = 2.65;
  crates = words.map((w, i) => makeCrate(w, new THREE.Vector3((i - (n - 1) / 2) * gap, 0, SHELF_Z)));
}
function makeShelfSign() {
  const grp = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.06, 1.7), new THREE.MeshStandardMaterial({ color: '#8c6a45', roughness: 0.95 }));
  deck.position.set(0, 0.03, SHELF_Z); deck.receiveShadow = true; grp.add(deck);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#2f6a3a'; g.fillRect(0, 0, 1024, 200);
  g.strokeStyle = '#f4f0e0'; g.lineWidth = 12; g.strokeRect(10, 10, 1004, 180);
  g.fillStyle = '#fff8dc'; g.font = '800 110px Rubik'; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('מחסן המילים', 512, 108);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.98), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  sign.position.set(0, 0.05, SHELF_Z + 1.45); sign.rotation.x = -Math.PI / 2;
  grp.add(sign);
  C.R.scene.add(grp);
  return grp;
}

// ---------- ממשק ----------
function setupUI() {
  $('w-rules-btn').addEventListener('click', () => $('w-rules').classList.remove('hidden'));
  $('w-rules-close').addEventListener('click', () => $('w-rules').classList.add('hidden'));
  $('w-home').addEventListener('click', toMenu);
  $('w-back').addEventListener('click', () => C.exitGame());
  $('w-again').addEventListener('click', () => startStory(S.story));
  $('w-next').addEventListener('click', () => { const L = list(); const i = L.indexOf(S.story); if (L[i + 1]) startStory(L[i + 1]); else toMenu(); });
  $('w-other').addEventListener('click', toMenu);
  $('w-replay').addEventListener('click', () => playScene(showOver));
  $('scene-skip').addEventListener('click', () => endScene(false));
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => { S.grade = b.dataset.grade; store.set('grade', S.grade); renderStoryList(); C.SFX.initAudio(); C.SFX.sfxKick(0.2); }));
  addEventListener('resize', checkOrientation);
}
const isOpen = (i, done = store.get('done', {})) => i === 0 || done[list()[i - 1].id] != null;
function renderStoryList() {
  const done = store.get('done', {});
  const box = $('stories'); box.innerHTML = '';
  document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('on', x.dataset.grade === S.grade));
  box.classList.toggle('nikud', S.grade === 'a');
  const STORIES_ = list();
  STORIES_.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const open = isOpen(i, done);
    const st = done[s.id];
    b.className = 'story-card' + (open ? '' : ' locked') + (open && st == null ? ' next' : '');
    b.innerHTML = `<span class="num">${i + 1}</span><span class="em">${open ? s.emoji : '🔒'}</span><span class="tt"></span>${st != null ? `<span class="best">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` : ''}`;
    b.querySelector('.tt').textContent = open ? s.title : 'נפתח אחרי הסיפור הקודם';
    b.disabled = !open;
    b.addEventListener('click', () => { if (!open) return; C.SFX.initAudio(); startStory(s); });
    box.appendChild(b);
  });
  const n = STORIES_.filter((s) => done[s.id] != null).length;
  $('progress').textContent = `(${n} מתוך ${STORIES_.length})`;
}
const starsFor = (m) => (m === 0 ? 3 : m <= 2 ? 2 : 1);
function checkOrientation() {
  const portrait = innerWidth / innerHeight < 0.95;
  $('rotate').classList.toggle('hidden', !(portrait && S.phase === 'play' && C && C.game === WORDS));
}

function startStory(story) {
  S.story = story; S.mistakes = 0; S.filled = 0;
  FF = hasNikud(story) ? NIKUD_FONT : 'Rubik';
  document.body.classList.toggle('nikud', hasNikud(story));
  buildPage(story);
  buildCrates(story);
  held = null;
  C.kid.pos.set(0, 0, 4.6); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
  S.phase = 'play';
  $('w-menu').classList.add('hidden'); $('w-over').classList.add('hidden'); $('w-hud').classList.remove('hidden');
  $('story-lbl').textContent = `${story.emoji} ${story.title}`;
  updateHud();
  hint('לחצו על ארגז במחסן המילים (למטה) כדי לקחת מילה');
  checkOrientation();
  if (!store.get('seen-rules', false)) { store.set('seen-rules', true); $('w-rules').classList.remove('hidden'); }
}
function toMenu() {
  endScene(true);
  S.phase = 'menu'; held = null;
  clearBoard();
  $('w-menu').classList.remove('hidden'); $('w-hud').classList.add('hidden'); $('w-over').classList.add('hidden');
  renderStoryList();
  checkOrientation();
}
function updateHud() {
  $('filled').textContent = `${S.filled}/${page.blanks.length}`;
  const st = starsFor(S.mistakes);
  $('stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
}
function hint(t) { $('hint').textContent = t || ''; }

// ---------- לחיצות ----------
function onTap(e) {
  if (S.phase !== 'play') return true; // בתפריט – לא זזים
  const shelf = crates.filter((c) => c.state === 'shelf').map((c) => c.group);
  const hit = C.rayFrom(e).intersectObjects(shelf, true)[0];
  if (hit) { goToCrate(hit.object.userData.crateRef); return true; }
  const p = C.groundAt(e);
  if (!p) return true;
  const b = blankAt(p, 0.35);
  if (b) {
    if (b.filled) { C.message('את המקום הזה כבר מילאנו ✓'); return true; }
    if (!held) { C.message('קודם לוקחים מילה מהמחסן 📦'); C.walkTo(p); return true; }
    C.walkTo(b.center, () => { if (held && !b.filled) drop(b); });
    return true;
  }
  if (held && Math.abs(p.z - SHELF_Z) < 1 && Math.abs(p.x) < 12) { C.walkTo(held.home.clone().add(new THREE.Vector3(0, 0, -1.05)), () => returnHeld()); return true; }
  return false; // הליבה תוליך את הדמות לנקודה
}
function blankAt(p, pad) {
  if (!page) return null;
  for (const b of page.blanks) if (Math.abs(p.x - b.center.x) <= b.size[0] / 2 + pad && Math.abs(p.z - b.center.z) <= b.size[1] / 2 + pad) return b;
  return null;
}
function goToCrate(cr) {
  if (held === cr) return;
  C.walkTo(cr.home.clone().add(new THREE.Vector3(0, 0, -1.05)), () => { if (cr.state === 'shelf') pick(cr); });
}
function actNearby() {
  if (S.phase !== 'play') return;
  const k = C.kid;
  if (!held) {
    let best = null, bd = 1.7;
    for (const c of crates) if (c.state === 'shelf') { const d = Math.hypot(c.home.x - k.pos.x, c.home.z - k.pos.z); if (d < bd) { bd = d; best = c; } }
    if (best) pick(best); else C.message('צריך לעמוד ליד ארגז במחסן');
  } else {
    const b = blankAt(k.pos, 0.6);
    if (b && !b.filled) drop(b);
    else if (Math.abs(k.pos.z - SHELF_Z) < 1.8) returnHeld();
    else C.message('צריך לעמוד על מקום חסר (מסגרת צהובה)');
  }
}
function pick(cr) {
  if (held) returnHeld(true);
  held = cr; cr.state = 'held';
  C.SFX.sfxKick(0.25);
  C.kid.play('lob');
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
  C.kid.play('kick');
  if (cr.word === b.word) {
    held = null; cr.state = 'flying';
    cr.fly = { t: 0, dur: 0.35, from: cr.group.position.clone(), to: b.center.clone(), into: b };
  } else {
    S.mistakes++;
    C.SFX.sfxBuzz();
    C.kid.play('sad');
    C.message(`"${cr.word}" לא מתאימה כאן. קראו את המשפט שוב 🧐`, 2800);
    returnHeld(true);
    updateHud();
    hint('לחצו על ארגז במחסן המילים כדי לקחת מילה');
  }
}
function placed(b, cr) {
  b.filled = true; S.filled++;
  C.R.scene.remove(cr.group); cr.state = 'used';
  drawPage();
  C.SFX.sfxCheer(false);
  for (const e of C.extras) if (Math.random() < 0.6) setTimeout(() => e.play('cheer'), Math.random() * 300);
  const left = page.blanks.length - S.filled;
  C.pop(['יופי!', 'מצוין!', 'נכון!', 'כל הכבוד!'][Math.floor(Math.random() * 4)], left ? `נשארו עוד ${left}` : '', '#7ee08a');
  updateHud();
  hint(left ? 'לחצו על ארגז במחסן המילים כדי לקחת עוד מילה' : '');
  if (!left) setTimeout(finish, 1400);
}
function finish() {
  if (C.game !== WORDS) return;
  C.kid.play('cheer');
  C.SFX.sfxCheer(true);
  const st = starsFor(S.mistakes);
  const done = store.get('done', {});
  done[S.story.id] = Math.max(done[S.story.id] ?? 0, st);
  store.set('done', done);
  S.lastStars = st;
  $('w-hud').classList.add('hidden');
  // אם יש לסיפור "סרט" – רואים אותו קורה בשכונה, ואחר כך מסך הסיום
  if (SCENES[S.story.id]) setTimeout(() => playScene(showOver), 1200);
  else showOver();
}

// ---------- הסרט: הסיפור קורה בשכונה ----------
function playScene(then) {
  if (C.game !== WORDS) return;
  S.phase = 'scene';
  $('w-over').classList.add('hidden'); $('w-hud').classList.add('hidden'); $('w-menu').classList.add('hidden');
  clearBoard(); if (extrasBuilt) extrasBuilt.visible = false;
  C.kid.root.visible = false;
  const ui = $('scene-ui'); ui.classList.remove('hidden');
  ui.classList.toggle('nikud', hasNikud(S.story));
  $('scene-cap').textContent = '';
  theater = makeTheater(C, S.story, (text) => { const el = $('scene-cap'); el.textContent = text; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); });
  theater.then = then;
  const T = theater;
  SCENES[S.story.id](T).catch((e) => { if (e !== SKIP) console.error(e); }).finally(() => { if (theater === T) endScene(false); });
}
function endScene(silent) {
  if (!theater) return;
  const T = theater; theater = null;
  T.skip(); T.dispose();
  $('scene-ui').classList.add('hidden');
  if (C) { C.kid.root.visible = true; if (extrasBuilt) extrasBuilt.visible = true; }
  if (!silent && T.then && C.game === WORDS) T.then();
}

function showOver() {
  if (C.game !== WORDS) return;
  S.phase = 'over';
  const st = S.lastStars;
  const done = store.get('done', {});
  const L = list();
  const nextS = L[L.indexOf(S.story) + 1];
  const allDone = L.every((x) => done[x.id] != null);
  $('over-title').textContent = !nextS && allDone ? 'סיימת את כל הסיפורים! 🏆' : 'השלמת את הסיפור! 🎉';
  $('w-next').textContent = nextS ? `לסיפור הבא: ${nextS.emoji} ${nextS.title} ▶` : 'לכל הסיפורים';
  $('over-stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('w-replay').classList.toggle('hidden', !SCENES[S.story.id]);
  $('over-sub').textContent = S.mistakes === 0 ? 'בלי אף טעות – אלופי הקריאה של השכונה!' : `השלמת ${S.story.blanks.length} מילים עם ${S.mistakes} ${S.mistakes === 1 ? 'טעות' : 'טעויות'}.`;
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
  $('w-hud').classList.add('hidden');
  $('w-over').classList.remove('hidden');
}

// ---------- עדכון בכל פריים ----------
function update(dt) {
  const t = C.time;
  if (theater) { theater.update(dt); return; }
  for (const c of crates) {
    if (c.state === 'held') {
      const target = C.kid.pos.clone(); target.y = 1.55 + Math.abs(Math.sin(t * 9)) * 0.03 * Math.min(1, C.kid.vel.length());
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
        else { c.state = 'shelf'; c.group.position.copy(c.home); c.group.scale.setScalar(1); C.SFX.sfxBounce(0.4); }
      }
    } else if (c.state === 'shelf') {
      c.group.scale.setScalar(1);
      c.group.position.y = 0.06;
    }
  }
  if (page) for (const b of page.blanks) b.glow.material.opacity = !b.filled && held ? 0.28 + 0.22 * Math.sin(t * 5) : 0;
}

// ---------- מצלמה ----------
// מלמעלה (כל הסיפור והמחסן), ומקרוב כשהדמות מחזיקה מילה – מלווה אותה עד שהיא מניחה
const CAM_TOP = { tilt: 62, hw: 14.3, hd: 8.4 };
const CAM_NEAR = { tilt: 48, hw: 4.6, ahead: 1.5 };
function camera(core, vt, aspect) {
  if (theater) return theater.camera();
  if (S.phase === 'menu') {
    const t = C.time * 0.06;
    return { pos: new THREE.Vector3(Math.sin(t) * 6, 11, 22), look: new THREE.Vector3(0, 0, 0), speed: 2 };
  }
  if (S.phase === 'play' && held) {
    const tilt = THREE.MathUtils.degToRad(CAM_NEAR.tilt);
    const dist = CAM_NEAR.hw / (vt * Math.min(aspect, 1.8));
    const look = new THREE.Vector3(C.kid.pos.x, 0.5, C.kid.pos.z - CAM_NEAR.ahead);
    return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 4 };
  }
  const tilt = THREE.MathUtils.degToRad(CAM_TOP.tilt);
  const dist = Math.max(CAM_TOP.hw / (vt * aspect), CAM_TOP.hd * Math.sin(tilt) / vt) * 1.03;
  const look = new THREE.Vector3(0, 0, 0.45);
  return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 2.4 };
}

// לבדיקות
window.__words = { get crates() { return crates; }, get page() { return page; }, get S() { return S; }, scene: () => { S.lastStars = 3; playScene(showOver); }, sceneFor: (id) => { S.story = [...STORIES, ...STORIES_A].find((x) => x.id === id); S.lastStars = 3; playScene(() => {}); }, skip: () => endScene(true), solve: () => { for (const b of page.blanks) b.filled = true; S.filled = page.blanks.length; drawPage(); finish(); } };
