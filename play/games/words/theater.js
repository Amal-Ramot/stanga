// תיאטרון השכונה – אחרי שמשלימים סיפור, הוא "קורה" בשכונה כמו סרט קצר.
// כל סיפור מקבל תסריט (ב-scenes.js): פונקציה אסינכרונית שמזיזה דמויות, מדברת בבועות ומציגה את משפטי הסיפור.
//
// כלים לתסריט (T):
//   T.actor(שם, הגדרות)      – דמות חדשה (מודל, צבעים, גובה, מיקום)
//   T.walk(דמות, x, z, מהירות) – הליכה (מחכים לה עם await)
//   T.face(דמות, x, z)       – להסתובב לכיוון נקודה
//   T.say(דמות, טקסט, שניות) – בועת דיבור
//   T.caption(טקסט)          – משפט מהסיפור בתחתית המסך
//   T.anim(דמות, 'cheer'|'sad'|'kick'|'lob')
//   T.ball(x, z)             – כדור; T.kick(מ-x,z, אל-x,z, גובה, שניות)
//   T.add(object3D)          – אובייקט לסצנה (יימחק בסוף)
//   T.cam([x,y,z], [x,y,z])  – זווית מצלמה
//   T.wait(שניות)
import * as THREE from 'three';
import { Player, KIDS } from '../../../js/player.js';
import { fitModel } from '../../../js/assets.js';
import { BALL } from '../../../js/config.js';

export function makeTheater(C, onCaption) {
  const actors = [], objects = [], bubbles = [], walks = new Map();
  let ballObj = null, ballFly = null;
  const cam = { pos: new THREE.Vector3(0, 8, 12), look: new THREE.Vector3(0, 0, 0) };
  const T = { skipped: false, cam: (p, l) => { cam.pos.set(...p); cam.look.set(...l); } };
  const layer = document.getElementById('bubbles-play');

  T.actor = (name, o) => {
    const k = new Player(C.R.scene, { ...KIDS.p1, name, ...o, model: C.A.kids && C.A.kids[o.model] });
    k.arrow.visible = false; k.ring.visible = false;
    k.pos.set(o.x || 0, 0, o.z || 0); k.facing = o.facing ?? -Math.PI / 2;
    const el = document.createElement('div'); el.className = 'bubble-say'; layer.appendChild(el);
    k.bubble = el; bubbles.push(el);
    k.height = o.height || 1.42;
    actors.push(k);
    return k;
  };
  T.add = (o) => { C.R.scene.add(o); objects.push(o); return o; };
  T.remove = (o) => { C.R.scene.remove(o); };
  T.wait = (s) => new Promise((res) => { if (T.skipped) return res(); const t = setTimeout(res, s * 1000); T._timers.push([t, res]); });
  T._timers = [];
  T.walk = (a, x, z, speed = 2.2) => new Promise((res) => { walks.set(a, { to: new THREE.Vector3(x, 0, z), speed, res }); if (T.skipped) res(); });
  T.face = (a, x, z) => { a.facing = Math.atan2(z - a.pos.z, x - a.pos.x); };
  T.anim = (a, type) => a.play(type);
  T.say = (a, text, s = 2.4) => {
    a.bubble.textContent = text; a.bubble.classList.add('show');
    clearTimeout(a.sayT); a.sayT = setTimeout(() => a.bubble.classList.remove('show'), s * 1000);
  };
  T.caption = (text) => onCaption(text);
  T.ball = (x, z) => {
    if (!ballObj) {
      let inner;
      if (C.A.models.dirty_football) { inner = fitModel(C.A.models.dirty_football.clone(), { maxDim: BALL.r * 2 }); inner.position.y = -BALL.r; }
      else inner = new THREE.Mesh(new THREE.SphereGeometry(BALL.r, 20, 14), new THREE.MeshStandardMaterial({ color: '#ddd' }));
      ballObj = T.add(new THREE.Group()); ballObj.add(inner);
    }
    ballObj.position.set(x, BALL.r, z); ballObj.visible = true;
    return ballObj;
  };
  T.kick = (x0, z0, x1, z1, h = 0.4, dur = 0.8) => new Promise((res) => {
    T.ball(x0, z0); ballObj.userData.holder = null; C.SFX.sfxKick(0.5);
    ballFly = { t: 0, dur, from: new THREE.Vector3(x0, BALL.r, z0), to: new THREE.Vector3(x1, BALL.r, z1), h, res };
    if (T.skipped) { ballFly = null; res(); }
  });
  T.holdBall = (a) => { T.ball(0, 0); ballObj.userData.holder = a; };
  T.dropBall = (x, z) => { T.ball(x, z); ballObj.userData.holder = null; };

  // עדכון בכל פריים
  T.update = (dt) => {
    for (const [a, w] of walks) {
      const d = w.to.clone().sub(a.pos); d.y = 0;
      const L = d.length();
      if (L < 0.08) { a.vel.set(0, 0, 0); walks.delete(a); w.res(); continue; }
      a.vel.copy(d.multiplyScalar(Math.min(w.speed, L * 4) / L));
      a.pos.addScaledVector(a.vel, dt);
      a.facing = Math.atan2(a.vel.z, a.vel.x);
    }
    for (const a of actors) { if (!walks.has(a)) a.vel.multiplyScalar(0.8); a.update(dt, C.time); }
    if (ballFly) {
      const F = ballFly; F.t += dt;
      const p = Math.min(1, F.t / F.dur);
      ballObj.position.lerpVectors(F.from, F.to, p);
      ballObj.position.y = BALL.r + Math.sin(Math.PI * p) * F.h;
      ballObj.rotation.z -= dt * 14;
      if (p >= 1) { ballFly = null; C.SFX.sfxBounce(0.4); F.res(); }
    } else if (ballObj && ballObj.userData.holder) {
      const a = ballObj.userData.holder; const f = a.forward(new THREE.Vector3());
      ballObj.position.set(a.pos.x + f.x * 0.3, 0.85, a.pos.z + f.z * 0.3);
    }
    // חפצים שדמות מחזיקה בידיים (למשל מגש)
    for (const o of objects) {
      const a = o.userData.follow; if (!a) continue;
      const f = a.forward(new THREE.Vector3());
      o.position.set(a.pos.x + f.x * 0.32, 0.95, a.pos.z + f.z * 0.32); o.rotation.y = -a.facing;
    }
    // בועות דיבור מעל הראש
    for (const a of actors) {
      if (!a.bubble.classList.contains('show')) continue;
      const v = a.pos.clone(); v.y = (a.height || 1.5) + 0.35; v.project(C.R.camera);
      a.bubble.style.left = `${(v.x + 1) / 2 * innerWidth}px`; a.bubble.style.top = `${(1 - v.y) / 2 * innerHeight}px`;
    }
  };
  T.camera = () => ({ pos: cam.pos.clone(), look: cam.look.clone(), speed: 2.6 });
  // דילוג: כל ההמתנות נגמרות מיד
  T.skip = () => {
    T.skipped = true;
    for (const [t, res] of T._timers) { clearTimeout(t); res(); }
    for (const [, w] of walks) w.res();
    walks.clear();
    if (ballFly) { const r = ballFly.res; ballFly = null; r(); }
  };
  T.dispose = () => {
    for (const a of actors) { C.R.scene.remove(a.root); clearTimeout(a.sayT); }
    for (const o of objects) C.R.scene.remove(o);
    for (const b of bubbles) b.remove();
  };
  return T;
}

// ---------- אביזרים פשוטים ----------
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }

export const PROPS = {
  // גינה קטנה עם עגבניות וגדר נמוכה מלפנים
  garden(x, z) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(4, 0.12, 2.4), mat('#5a3d22'), 0, 0.06, 0));
    for (const [px, pz] of [[-1.2, -0.4], [0, 0.3], [1.2, -0.3], [-0.5, 0.7], [0.8, 0.8]]) {
      g.add(mesh(new THREE.ConeGeometry(0.28, 0.75, 8), mat('#3f8a35'), px, 0.48, pz));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#d9302a', { roughness: 0.4 }), px + Math.cos(i * 2.1) * 0.2, 0.35 + i * 0.12, pz + Math.sin(i * 2.1) * 0.2));
    }
    // גדר עץ נמוכה בצד הקרוב
    for (let i = -2; i <= 2; i += 0.5) g.add(mesh(new THREE.BoxGeometry(0.08, 0.8, 0.06), mat('#e8dcc0'), i, 0.4, 1.35));
    g.add(mesh(new THREE.BoxGeometry(4.1, 0.08, 0.05), mat('#e8dcc0'), 0, 0.62, 1.38));
    g.position.set(x, 0, z);
    return g;
  },
  // מגש עם כוסות לימונדה
  tray() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.03, 0.3), mat('#c0c4c8', { metalness: 0.4 })));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.14, 12), mat('#f7e26b', { roughness: 0.2, transparent: true, opacity: 0.9 }), s * 0.1, 0.085, 0));
    return g;
  },
  // שלט מקרטון עם טקסט
  sign(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#c9a16b'; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#2a2430'; x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = text.split('\n');
    x.font = '800 58px Rubik';
    lines.forEach((l, i) => x.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 70));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.castShadow = true;
    return m;
  },
};
