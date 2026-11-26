// תיאטרון השכונה – אחרי שמשלימים סיפור, הוא "קורה" בשכונה כמו סרט קצר.
// כל סיפור מקבל תסריט (ב-scenes.js): פונקציה אסינכרונית שמזיזה דמויות, מדברת בבועות ומציגה את משפטי הסיפור.
//
// כלים לתסריט (T):
//   T.beat(i, async () => {...}) – מציג את פסקה i של הסיפור בתחתית המסך, מריץ את הפעולות,
//                                 ומחכה שיהיה מספיק זמן לקרוא את הפסקה
//   T.actor(שם, הגדרות)          – דמות (מודל, צבעים, height, x, z, facing)
//   T.walk(דמות, x, z, מהירות)    – הליכה (await מחכה שתגיע)
//   T.face(דמות, x, z) · T.say(דמות, טקסט, שניות) · T.anim(דמות, 'cheer'|'sad'|'kick'|'lob')
//   T.ball(x, z) · T.kick(x0, z0, x1, z1, גובה, שניות) · T.holdBall(דמות) · T.dropBall(x, z)
//   T.add(אובייקט) · T.remove(אובייקט) · T.hold(אובייקט, דמות) – חפץ בידיים
//   T.tween(אובייקט, {x, y, z}, שניות) – הזזה חלקה של חפץ
//   T.cam([x,y,z], [x,y,z]) · T.wait(שניות) · T.rain(true/false) · T.night(true/false)
//   T.music(true/false) – הרדיו מהמרפסת
// אם לוחצים "דלג", כל פעולה שמחכים לה זורקת SKIP והתסריט נעצר מעצמו.
import * as THREE from 'three';
import { Player, KIDS } from '../../../js/player.js';
import { fitModel } from '../../../js/assets.js';
import { BALL } from '../../../js/config.js';

export const SKIP = Symbol('skip');

export function makeTheater(C, story, onCaption) {
  const actors = [], objects = [], bubbles = [], walks = new Map(), tweens = new Set();
  let ballObj = null, ballFly = null, rain = null, night = null;
  const cam = { pos: new THREE.Vector3(0, 8, 12), look: new THREE.Vector3(0, 0, 0) };
  const T = { skipped: false, story, A: C.A };
  const layer = document.getElementById('bubbles-play');
  // פעולה שמחכים לה זורקת SKIP אחרי דילוג; פעולה שלא מחכים לה – נבלעת בשקט
  const guard = (p) => { const q = p.then((v) => { if (T.skipped) throw SKIP; return v; }); q.catch(() => {}); return q; };

  T.cam = (p, l) => { cam.pos.set(...p); cam.look.set(...l); };
  T.actor = (name, o) => {
    const k = new Player(C.R.scene, { ...KIDS.p1, name, ...o, model: C.A.kids && C.A.kids[o.model] });
    k.arrow.visible = false; k.ring.visible = false;
    k.pos.set(o.x || 0, o.y || 0, o.z || 0); k.facing = o.facing ?? -Math.PI / 2;
    const el = document.createElement('div'); el.className = 'bubble-say'; layer.appendChild(el);
    k.bubble = el; bubbles.push(el);
    k.height = o.height || 1.42;
    actors.push(k);
    return k;
  };
  T.add = (o) => { C.R.scene.add(o); objects.push(o); return o; };
  T.remove = (o) => { C.R.scene.remove(o); o.userData.follow = null; };
  T.hold = (o, a) => { o.userData.follow = a; };
  T._timers = [];
  T.wait = (s) => guard(new Promise((res) => { if (T.skipped) return res(); const t = setTimeout(res, s * 1000); T._timers.push([t, res]); }));
  T.walk = (a, x, z, speed = 2.2) => guard(new Promise((res) => { if (T.skipped) return res(); walks.set(a, { to: new THREE.Vector3(x, a.pos.y, z), speed, res }); }));
  T.face = (a, x, z) => { a.facing = Math.atan2(z - a.pos.z, x - a.pos.x); };
  T.anim = (a, type) => a.play(type);
  T.say = (a, text, s = 2.6) => {
    a.bubble.textContent = text; a.bubble.classList.add('show');
    clearTimeout(a.sayT); a.sayT = setTimeout(() => a.bubble.classList.remove('show'), s * 1000);
  };
  T.caption = (text) => onCaption(text);
  // פסקה מהסיפור + פעולות + זמן קריאה
  T.beat = async (i, fn) => {
    const text = story.text[i] || '';
    onCaption(text);
    const t0 = performance.now();
    if (fn) await fn();
    const need = Math.max(3.2, text.length / 13);
    const left = need - (performance.now() - t0) / 1000;
    if (left > 0) await T.wait(left);
  };
  T.tween = (o, to, s = 1) => guard(new Promise((res) => {
    if (T.skipped) return res();
    tweens.add({ o, from: o.position.clone(), to: new THREE.Vector3(to.x ?? o.position.x, to.y ?? o.position.y, to.z ?? o.position.z), t: 0, s, res });
  }));
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
  T.kick = (x0, z0, x1, z1, h = 0.4, dur = 0.8) => guard(new Promise((res) => {
    T.ball(x0, z0); ballObj.userData.holder = null; C.SFX.sfxKick(0.5);
    if (T.skipped) return res();
    ballFly = { t: 0, dur, from: new THREE.Vector3(x0, BALL.r, z0), to: new THREE.Vector3(x1, BALL.r, z1), h, res };
  }));
  T.holdBall = (a) => { T.ball(0, 0); ballObj.userData.holder = a; };
  T.dropBall = (x, z) => { T.ball(x, z); ballObj.userData.holder = null; };
  T.music = (on) => C.SFX.setMusic(on);

  // ---------- גשם ----------
  T.rain = (on) => {
    if (on && !rain) {
      const n = 1600, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * 50, y = Math.random() * 16, z = (Math.random() - 0.5) * 36;
        pos.set([x, y, z, x + 0.05, y - 0.55, z], i * 6);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#c8d6e6', transparent: true, opacity: 0.55 }));
      C.R.scene.add(rain);
      rain.userData.save = { sun: C.R.sun.intensity, exp: C.R.renderer.toneMappingExposure };
      C.R.sun.intensity *= 0.35; C.R.renderer.toneMappingExposure *= 0.8;
    } else if (!on && rain) {
      C.R.scene.remove(rain); C.R.sun.intensity = rain.userData.save.sun; C.R.renderer.toneMappingExposure = rain.userData.save.exp; rain = null;
    }
  };
  // ---------- לילה (בלי חשמל: חושך וכוכבים) ----------
  T.night = (on) => {
    if (on && !night) {
      const sc = C.R.scene;
      night = { sun: C.R.sun.intensity, exp: C.R.renderer.toneMappingExposure, env: sc.environmentIntensity, bg: sc.background, fog: sc.fog };
      C.R.sun.intensity = 0.15; C.R.renderer.toneMappingExposure = 0.55; sc.environmentIntensity = 0.12;
      sc.background = new THREE.Color('#0b1030'); sc.fog = null;
      const n = 900, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3, r = 160; p.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      night.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fffbe8', size: 1.6, sizeAttenuation: false }));
      sc.add(night.stars);
      night.lamp = new THREE.PointLight('#ffcf80', 30, 14, 1.6); sc.add(night.lamp);
    } else if (!on && night) {
      const sc = C.R.scene;
      C.R.sun.intensity = night.sun; C.R.renderer.toneMappingExposure = night.exp; sc.environmentIntensity = night.env;
      sc.background = night.bg; sc.fog = night.fog; sc.remove(night.stars); sc.remove(night.lamp); night = null;
    }
  };
  T.lampAt = (x, y, z) => { if (night) night.lamp.position.set(x, y, z); };

  // ---------- עדכון בכל פריים ----------
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
    for (const tw of tweens) {
      tw.t += dt; const p = Math.min(1, tw.t / tw.s);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      tw.o.position.lerpVectors(tw.from, tw.to, e);
      if (p >= 1) { tweens.delete(tw); tw.res(); }
    }
    if (ballFly) {
      const F = ballFly; F.t += dt;
      const p = Math.min(1, F.t / F.dur);
      ballObj.position.lerpVectors(F.from, F.to, p);
      ballObj.position.y = BALL.r + Math.sin(Math.PI * p) * F.h;
      ballObj.rotation.z -= dt * 14;
      if (p >= 1) { ballFly = null; C.SFX.sfxBounce(0.4); F.res(); }
    } else if (ballObj && ballObj.userData.holder) {
      const a = ballObj.userData.holder; const f = a.forward(new THREE.Vector3());
      ballObj.position.set(a.pos.x + f.x * 0.3, a.pos.y + 0.85, a.pos.z + f.z * 0.3);
    }
    for (const o of objects) {
      const a = o.userData.follow; if (!a) continue;
      const f = a.forward(new THREE.Vector3());
      o.position.set(a.pos.x + f.x * 0.32, a.pos.y + (o.userData.holdY || 0.95), a.pos.z + f.z * 0.32); o.rotation.y = -a.facing;
    }
    if (rain) { rain.position.y -= dt * 18; if (rain.position.y < -8) rain.position.y += 8; }
    if (night && night.stars) night.stars.rotation.y += dt * 0.004;
    for (const a of actors) {
      if (!a.bubble.classList.contains('show')) continue;
      const v = a.pos.clone(); v.y += (a.height || 1.5) + 0.35; v.project(C.R.camera);
      a.bubble.style.left = `${(v.x + 1) / 2 * innerWidth}px`; a.bubble.style.top = `${(1 - v.y) / 2 * innerHeight}px`;
    }
  };
  T.camera = () => ({ pos: cam.pos.clone(), look: cam.look.clone(), speed: 2.6 });
  T.skip = () => {
    T.skipped = true;
    for (const [t, res] of T._timers) { clearTimeout(t); res(); }
    for (const [, w] of walks) w.res();
    walks.clear();
    for (const tw of tweens) tw.res();
    tweens.clear();
    if (ballFly) { const r = ballFly.res; ballFly = null; r(); }
  };
  T.dispose = () => {
    T.rain(false); T.night(false); T.music(true);
    for (const a of actors) { C.R.scene.remove(a.root); clearTimeout(a.sayT); }
    for (const o of objects) C.R.scene.remove(o);
    if (ballObj) C.R.scene.remove(ballObj);
    for (const b of bubbles) b.remove();
  };
  return T;
}

// ---------- אביזרים פשוטים ----------
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function textTex(text, bg, fg, w = 512, h = 256, size = 58) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n');
  x.font = `800 ${size}px Rubik`;
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const PROPS = {
  garden(x, z) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(4, 0.12, 2.4), mat('#5a3d22'), 0, 0.06, 0));
    for (const [px, pz] of [[-1.2, -0.4], [0, 0.3], [1.2, -0.3], [-0.5, 0.7], [0.8, 0.8]]) {
      g.add(mesh(new THREE.ConeGeometry(0.28, 0.75, 8), mat('#3f8a35'), px, 0.48, pz));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.075, 10, 8), mat('#d9302a', { roughness: 0.4 }), px + Math.cos(i * 2.1) * 0.2, 0.35 + i * 0.12, pz + Math.sin(i * 2.1) * 0.2));
    }
    for (let i = -2; i <= 2; i += 0.5) g.add(mesh(new THREE.BoxGeometry(0.08, 0.8, 0.06), mat('#e8dcc0'), i, 0.4, 1.35));
    g.add(mesh(new THREE.BoxGeometry(4.1, 0.08, 0.05), mat('#e8dcc0'), 0, 0.62, 1.38));
    g.position.set(x, 0, z);
    return g;
  },
  tray() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.03, 0.3), mat('#c0c4c8', { metalness: 0.4 })));
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.14, 12), mat('#f7e26b', { roughness: 0.2, transparent: true, opacity: 0.9 }), s * 0.1, 0.085, 0));
    return g;
  },
  sign(text, bg = '#c9a16b', fg = '#2a2430', w = 1.3, h = 0.65) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: textTex(text, bg, fg), roughness: 0.9, side: THREE.DoubleSide }));
    m.castShadow = true;
    return m;
  },
  // חתול פשוט (גוף, ראש, אוזניים, זנב)
  cat(color = '#e08a2e') {
    const g = new THREE.Group(), m = mat(color);
    const body = mesh(new THREE.SphereGeometry(0.16, 14, 10), m, 0, 0.17, 0); body.scale.set(1, 0.85, 1.6); g.add(body);
    g.add(mesh(new THREE.SphereGeometry(0.11, 14, 10), m, 0, 0.3, 0.22));
    for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.035, 0.08, 4), m, s * 0.055, 0.41, 0.22); g.add(e); }
    const tail = mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.34, 6), m, 0, 0.3, -0.26); tail.rotation.x = -0.7; g.add(tail);
    for (const [sx, sz] of [[-0.07, 0.12], [0.07, 0.12], [-0.07, -0.12], [0.07, -0.12]]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), m, sx, 0.06, sz));
    return g;
  },
  // כלב פשוט עם קולר
  dog(color = '#8a5a2b', collar = '#d02a2a') {
    const g = new THREE.Group(), m = mat(color);
    const body = mesh(new THREE.SphereGeometry(0.22, 14, 10), m, 0, 0.36, 0); body.scale.set(0.9, 0.8, 1.6); g.add(body);
    g.add(mesh(new THREE.SphereGeometry(0.15, 14, 10), m, 0, 0.58, 0.34));
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('#5a3a1b'), 0, 0.55, 0.48));
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#5a3a1b'), s * 0.12, 0.66, 0.3); e.scale.set(0.6, 1.4, 0.6); g.add(e); }
    g.add(mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), mat(collar), 0, 0.5, 0.26));
    const tail = mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.3, 6), m, 0, 0.5, -0.38); tail.rotation.x = -0.9; tail.name = 'tail'; g.add(tail);
    for (const [sx, sz] of [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]]) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6), m, sx, 0.12, sz));
    return g;
  },
  // גג נמוך (מחסן) עם דוד שמש
  roof(w = 3, h = 2.6, d = 2) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, h, d), mat('#e9e2d0'), 0, h / 2, 0));
    const tank = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16), mat('#e8e8e8', { metalness: 0.5, roughness: 0.4 }), -w / 2 + 0.6, h + 0.45, -0.3); tank.rotation.z = Math.PI / 2; g.add(tank);
    const panel = mesh(new THREE.BoxGeometry(1.1, 0.05, 0.8), mat('#1f3554', { metalness: 0.6, roughness: 0.3 }), -w / 2 + 0.6, h + 0.35, 0.4); panel.rotation.x = -0.5; g.add(panel);
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 8), mat('#8a8a8a'), w / 2 - 0.2, h / 2, d / 2 + 0.06));
    return g;
  },
  ladder(h = 2.8) {
    const g = new THREE.Group(), m = mat('#c9a24a');
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.05, h, 0.05), m, s * 0.22, h / 2, 0));
    for (let y = 0.3; y < h; y += 0.35) g.add(mesh(new THREE.BoxGeometry(0.44, 0.04, 0.04), m, 0, y, 0));
    return g;
  },
  can() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14), mat('#c9ced4', { metalness: 0.6, roughness: 0.3 }))); g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 14), mat('#d99a7a'), 0, 0.03, 0)); return g; },
  balloons(colors = ['#e8414a', '#3a7be0', '#f2c230', '#43b05c']) {
    const g = new THREE.Group();
    colors.forEach((c, i) => {
      const b = mesh(new THREE.SphereGeometry(0.2, 14, 12), mat(c, { roughness: 0.3 }), (i - (colors.length - 1) / 2) * 0.28, 2.0 + (i % 2) * 0.2, 0); b.scale.y = 1.2; g.add(b);
      g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2, 4), mat('#eee'), b.position.x * 0.5, 1.3, 0));
    });
    return g;
  },
  mat(c = '#c0463a') { return mesh(new THREE.BoxGeometry(2.2, 0.03, 1.4), mat(c), 0, 0.015, 0); },
  cake(candles = 9) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 20), mat('#5a3320'), 0, 0.1, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 20), mat('#f4ead8'), 0, 0.21, 0));
    const fl = [];
    for (let i = 0; i < candles; i++) {
      const a = i / candles * Math.PI * 2;
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), mat('#4aa3e0'), Math.cos(a) * 0.18, 0.28, Math.sin(a) * 0.18));
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffcc44' })); f.position.set(Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18); g.add(f); fl.push(f);
    }
    g.userData.flames = fl;
    return g;
  },
  candle() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 10), mat('#f4efe0'), 0, 0.09, 0));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffb640' })); f.position.y = 0.22; f.scale.y = 1.6; g.add(f);
    return g;
  },
  watermelon() {
    const g = new THREE.Group();
    const r = mesh(new THREE.SphereGeometry(0.26, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2f7a32'), 0, 0, 0); r.rotation.x = Math.PI; r.position.y = 0.26; g.add(r);
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 18), mat('#e2393f'), 0, 0.26, 0));
    return g;
  },
  table(w = 1.2, d = 0.7) {
    const g = new THREE.Group(), m = mat('#9a6b3e');
    g.add(mesh(new THREE.BoxGeometry(w, 0.05, d), m, 0, 0.72, 0));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), m, sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06)));
    return g;
  },
  // דוכן / קיוסק קטן
  stand(text, color = '#d8433a') {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.2, 1.0, 0.7), mat('#e9dfc9'), 0, 0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.08, 1.0), mat(color), 0, 2.2, 0.1));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), mat('#777'), s * 1.1, 1.1, -0.3));
    const sg = PROPS.sign(text, color, '#fff6dc', 2.2, 0.45); sg.position.set(0, 2.45, 0.4); g.add(sg);
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(['#ff6b6b', '#ffd23f', '#4ecdc4', '#a06cd5', '#ff9f43'][i], { roughness: 0.4 }), -0.8 + i * 0.4, 1.08, 0.15));
    return g;
  },
  smallBall(c = '#ff5aa5') { return mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(c, { roughness: 0.4 })); },
  bucket() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.28, 16, 1, true), mat('#2f7de0', { side: THREE.DoubleSide }), 0, 0.14, 0)); g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), mat('#8fd0ff', { transparent: true, opacity: 0.8 }), 0, 0.22, 0)); return g; },
  bottle() { return mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 12), mat('#aee3ff', { transparent: true, opacity: 0.7, roughness: 0.1 }), 0, 0, 0); },
  // התזת מים: הרבה טיפות קטנות שעפות
  splash(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.85 }));
      d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 3);
      g.add(d);
    }
    g.position.set(x, 1, z);
    g.userData.splash = true;
    return g;
  },
  book(c = '#3a7a3a') {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.05, 0.36), mat(c)));
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.045, 0.34), mat('#f7f2e2'), 0.012, 0, 0));
    return g;
  },
  radio() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.3, 0.18), mat('#7a4b2a', { roughness: 0.5 }), 0, 0.15, 0));
    const spk = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), mat('#2a2a2a'), -0.12, 0.15, 0.09); spk.rotation.x = Math.PI / 2; g.add(spk);
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), mat('#e8d9a0'), 0.13, 0.18, 0.09));
    const ant = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4), mat('#bbb', { metalness: 0.8 }), 0.2, 0.5, -0.05); ant.rotation.z = -0.4; g.add(ant);
    return g;
  },
  chair(A) {
    if (A.models.plastic_monobloc_chair_01) return fitModel(A.models.plastic_monobloc_chair_01.clone(), { height: 0.85 });
    return mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat('#eee'), 0, 0.22, 0);
  },
  kite() {
    const g = new THREE.Group();
    const sh = new THREE.Shape(); sh.moveTo(0, 0.5); sh.lineTo(0.35, 0); sh.lineTo(0, -0.6); sh.lineTo(-0.35, 0); sh.closePath();
    const k = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#e8414a', side: THREE.DoubleSide })); g.add(k);
    const k2 = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#f2c230', side: THREE.DoubleSide })); k2.scale.set(0.5, 0.5, 1); k2.position.z = 0.01; g.add(k2);
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.12, 0.05, 0.01), mat(i % 2 ? '#3a7be0' : '#f2c230'), Math.sin(i) * 0.05, -0.7 - i * 0.18, 0));
    return g;
  },
  tree() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.22, 3, 10), mat('#6b4a2b'), 0, 1.5, 0));
    for (const [x, y, z, r] of [[0, 3.4, 0, 1.2], [0.7, 3, 0.2, 0.8], [-0.7, 3.1, -0.1, 0.9]]) g.add(mesh(new THREE.SphereGeometry(r, 12, 10), mat('#3f7a35'), x, y, z));
    return g;
  },
  stick(len = 2.2) { const m = mesh(new THREE.CylinderGeometry(0.025, 0.03, len, 6), mat('#8a6a3c'), 0, 0, 0); return m; },
  produce(c) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(c, { roughness: 0.5 }), (i % 3 - 1) * 0.2, 1.05 + Math.floor(i / 3) * 0.12, (Math.floor(i / 3) - 0.5) * 0.15)); return g; },
  basket() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.22, 14, 1, true), mat('#b88a4a', { side: THREE.DoubleSide }), 0, 0, 0)); g.add(mesh(new THREE.SphereGeometry(0.08, 8, 8), mat('#4caf50'), 0.05, 0.08, 0)); g.add(mesh(new THREE.SphereGeometry(0.07, 8, 8), mat('#e53935'), -0.06, 0.08, 0.04)); return g; },
  pita() { const m = mesh(new THREE.SphereGeometry(0.12, 12, 8), mat('#e3b97a')); m.scale.set(1, 0.45, 0.8); return m; },
  snail() {
    const g = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), mat('#b8a27a'), 0, 0.04, 0); body.rotation.x = Math.PI / 2; g.add(body);
    const shell = mesh(new THREE.TorusGeometry(0.07, 0.04, 8, 16), mat('#a0643a'), 0, 0.12, -0.02); shell.rotation.y = Math.PI / 2; g.add(shell);
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 4), mat('#b8a27a'), s * 0.02, 0.09, 0.1));
    return g;
  },
  leaf() { const m = mesh(new THREE.SphereGeometry(0.45, 12, 8), mat('#4f9a3a')); m.scale.set(1, 0.08, 0.6); return m; },
  bike(c = '#c62828') {
    const g = new THREE.Group(), m = mat('#222');
    for (const z of [-0.45, 0.45]) { const w = mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 20), m, 0, 0.32, z); w.rotation.y = Math.PI / 2; g.add(w); }
    const f = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), mat(c, { metalness: 0.4, roughness: 0.4 }), 0, 0.55, 0); g.add(f);
    const st = mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), mat(c), 0, 0.5, -0.2); st.rotation.x = 0.3; g.add(st);
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.22), mat('#333'), 0, 0.72, -0.25));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), mat('#999', { metalness: 0.7 }), 0, 0.85, 0.42));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), mat(c), 0, 0.7, 0.42));
    return g;
  },
  cookies() { const g = PROPS.tray(); g.children.slice(1).forEach((c) => g.remove(c)); for (let i = 0; i < 6; i++) { const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), mat('#c98c4a'), (i % 3 - 1) * 0.12, 0.03, (Math.floor(i / 3) - 0.5) * 0.12); g.add(c); g.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), mat('#3b2414'), c.position.x, 0.045, c.position.z)); } return g; },
  key() { const g = new THREE.Group(); g.add(mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), mat('#d4a83a', { metalness: 0.8, roughness: 0.3 }), 0, 0.08, 0)); g.add(mesh(new THREE.BoxGeometry(0.012, 0.1, 0.01), mat('#d4a83a', { metalness: 0.8 }), 0, 0.02, 0)); return g; },
  drain() { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(1.4, 0.02, 0.5), mat('#1a1a1a'), 0, 0.01, 0)); for (let i = -6; i <= 6; i++) g.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.5), mat('#777', { metalness: 0.6 }), i * 0.1, 0.025, 0)); return g; },
  magnet() { const m = mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12, Math.PI), mat('#d32f2f')); return m; },
  chalkboard(text) { const m = PROPS.sign(text, '#2f4f3a', '#f4f0e0', 2.6, 1.3); return m; },
  chick() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.07, 12, 10), mat('#ffd84a'), 0, 0.07, 0));
    g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#ffd84a'), 0, 0.15, 0.04));
    const beak = mesh(new THREE.ConeGeometry(0.015, 0.035, 6), mat('#f08a1a'), 0, 0.15, 0.1); beak.rotation.x = Math.PI / 2; g.add(beak);
    return g;
  },
  nest() { const m = mesh(new THREE.TorusGeometry(0.18, 0.07, 8, 16), mat('#8a6a3c')); m.rotation.x = Math.PI / 2; return m; },
  worm() { const m = mesh(new THREE.CapsuleGeometry(0.012, 0.08, 4, 6), mat('#d77a7a')); m.rotation.z = Math.PI / 2; return m; },
  // חלון של בניין שאפשר לשבור (זכוכית + רסיסים)
  window() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(1.4, 1.2, 0.06), mat('#f1ece0'), 0, 0, -0.04));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshStandardMaterial({ color: '#9ec9e6', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75 }));
    glass.position.z = 0.01; glass.name = 'glass'; g.add(glass);
    return g;
  },
  shards(x, y, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 12; i++) { const s = mesh(new THREE.TetrahedronGeometry(0.06), mat('#bfe3f7', { transparent: true, opacity: 0.8 }), (Math.random() - 0.5) * 1, 0.02, (Math.random() - 0.5) * 0.8); s.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(s); }
    g.position.set(x, y, z);
    return g;
  },
  broom() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), mat('#a07a4a'), 0, 0.6, 0)); g.add(mesh(new THREE.BoxGeometry(0.3, 0.15, 0.08), mat('#c9a24a'), 0, 0.05, 0)); return g; },
  pool(w = 8, d = 5) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), mat('#e9eef2'), 0, 0.15, 0));
    const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), new THREE.MeshStandardMaterial({ color: '#3fb0e0', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.9 }));
    water.position.y = 0.3; water.receiveShadow = true; g.add(water);
    // מקפצה נמוכה וגבוהה
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 1.4), mat('#2f7de0'), -w / 2 + 1.2, 0.7, -d / 2 - 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), mat('#ccc'), -w / 2 + 1.2, 0.35, -d / 2 - 0.8));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 1.6), mat('#e8414a'), w / 2 - 1.2, 2.4, -d / 2 - 0.2));
    g.add(mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), mat('#ccc'), w / 2 - 1.2, 1.2, -d / 2 - 0.9));
    return g;
  },
  stem() { const g = new THREE.Group(); const st = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1, 6), mat('#3f8a35'), 0, 0.5, 0); g.add(st); const h = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), mat('#f2c230'), 0, 1.02, 0.04); h.rotation.x = 1.2; h.name = 'head'; g.add(h); const c = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), mat('#5a3a1b'), 0, 1.04, 0.06); c.rotation.x = 1.2; g.add(c); return g; },
  crown() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12, 1, true), mat('#f2c230', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }))); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(0.025, 0.08, 4), mat('#f2c230', { metalness: 0.7 }), Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12)); } return g; },
  curtain() { const g = new THREE.Group(); for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(1.5, 2.6, 0.08), mat('#a3262c'), s * 2, 1.3, 0)); g.add(mesh(new THREE.BoxGeometry(5.6, 0.4, 0.1), mat('#7a1c20'), 0, 2.7, 0)); g.add(mesh(new THREE.BoxGeometry(5, 0.25, 2), mat('#8a6a45'), 0, 0.12, 1)); return g; },
  truck() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.2, 1.5, 3.6), mat('#f4f1ea'), 0, 1.05, 0));
    g.add(mesh(new THREE.BoxGeometry(2.1, 1.0, 1.2), mat('#f4f1ea'), 0, 0.8, 2.3));
    g.add(mesh(new THREE.BoxGeometry(2.0, 0.5, 0.05), mat('#9ec9e6', { roughness: 0.1 }), 0, 1.1, 2.92));
    for (const [x, z] of [[-1.05, -1.2], [1.05, -1.2], [-1.05, 2.2], [1.05, 2.2]]) { const w = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 14), mat('#222'), x, 0.35, z); w.rotation.z = Math.PI / 2; g.add(w); }
    const sg = PROPS.sign('גלידה 🍦', '#ff7eb6', '#fff', 1.8, 0.6); sg.position.set(1.12, 1.3, 0); sg.rotation.y = Math.PI / 2; g.add(sg);
    return g;
  },
  popsicle(c = '#f7e26b') { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.07, 0.14, 0.03), mat(c, { roughness: 0.4 }), 0, 0.1, 0)); g.add(mesh(new THREE.BoxGeometry(0.015, 0.08, 0.01), mat('#c9a16b'), 0, 0, 0)); return g; },
  chessboard() {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.add(mesh(new THREE.BoxGeometry(0.06, 0.01, 0.06), mat((i + j) % 2 ? '#3a2a1a' : '#f0e0c0'), (i - 3.5) * 0.06, 0, (j - 3.5) * 0.06));
    for (let i = 0; i < 8; i++) { g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 8), mat('#f8f8f0'), (i - 3.5) * 0.06, 0.03, -0.18)); g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 8), mat('#222'), (i - 3.5) * 0.06, 0.03, 0.18)); }
    return g;
  },
  sparkle() {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: '#fff27a' }));
    return m;
  },
};

// טיפות התזה – מעדכנים בכל פריים (נקרא מתוך התסריט עם T.splash)
export function addSplash(T, x, z) {
  const s = T.add(PROPS.splash(x, z));
  let t = 0;
  const step = () => {
    t += 1 / 60;
    for (const d of s.children) { d.userData.v.y -= 9.8 / 60; d.position.addScaledVector(d.userData.v, 1 / 60); }
    if (t < 1.2 && !T.skipped) requestAnimationFrame(step); else T.remove(s);
  };
  requestAnimationFrame(step);
}
