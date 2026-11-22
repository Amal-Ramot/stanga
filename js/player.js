// ילד מהשכונה שחזר הרגע מבית הספר – גוף מעוגל, מפרקים, בגדים מלוכלכים
import * as THREE from 'three';
import { PLAYER } from './config.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const R = Math.random;
function cnv(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function stains(g, w, h, n, colors, rmin, rmax) {
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = rmin + R() * (rmax - rmin);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const c = colors[Math.floor(R() * colors.length)];
    grd.addColorStop(0, `rgba(${c},${0.25 + R() * 0.3})`); grd.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + R() * 0.6), R() * 3, 0, Math.PI * 2); g.fill();
  }
}
function fabricWeave(g, w, h, alpha) {
  g.globalAlpha = alpha;
  for (let y = 0; y < h; y += 2) { g.fillStyle = y % 4 ? '#000' : '#fff'; g.fillRect(0, y, w, 1); }
  g.globalAlpha = 1;
}

// חולצת בית ספר עם סמל וכתמים
function shirtTexture(o) {
  return cnv(512, 256, (g, w, h) => {
    g.fillStyle = o.shirt; g.fillRect(0, 0, w, h);
    fabricWeave(g, w, h, 0.035);
    // קפלים
    for (let i = 0; i < 14; i++) {
      const x = R() * w;
      const grd = g.createLinearGradient(x - 12, 0, x + 12, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - 12, R() * h * 0.5, 24, h * 0.6);
    }
    // סמל בית הספר בחזה (מרכז u=0.5 = קדימה)
    const cx = w * 0.5 + 34, cy = h * 0.38;
    g.strokeStyle = o.logo; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.stroke();
    g.fillStyle = o.logo;
    g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 12, cy + 8); g.lineTo(cx - 12, cy + 8); g.closePath(); g.fill();
    g.font = 'bold 11px "Rubik", sans-serif'; g.textAlign = 'center'; g.direction = 'rtl';
    g.fillText(o.school, cx, cy + 36);
    // לכלוך: אדמה, דשא, ארטיק, זיעה
    stains(g, w, h, 10, ['110,85,55', '90,70,45'], 6, 22);
    stains(g, w, h, 3, ['70,110,40'], 5, 14);
    stains(g, w, h, 2, ['200,60,90', '230,140,30'], 4, 10);
    stains(g, w, h, 4, ['150,140,110'], 15, 35);
    // שולי חולצה מלוכלכים יותר
    const grd = g.createLinearGradient(0, h * 0.75, 0, h);
    grd.addColorStop(0, 'rgba(90,75,50,0)'); grd.addColorStop(1, 'rgba(90,75,50,0.3)');
    g.fillStyle = grd; g.fillRect(0, h * 0.75, w, h * 0.25);
  });
}
function pantsTexture(o) {
  return cnv(256, 128, (g, w, h) => {
    g.fillStyle = o.pants; g.fillRect(0, 0, w, h);
    if (o.denim) {
      for (let i = 0; i < 4000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,30,0.1)'; g.fillRect(R() * w, R() * h, 2, 1); }
      g.strokeStyle = 'rgba(220,180,90,0.6)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h); g.stroke();
      // שוליים פרומים
      g.fillStyle = 'rgba(220,225,235,0.6)'; for (let x = 0; x < w; x += 3) g.fillRect(x, h - 4 - R() * 4, 1.5, 6);
    } else {
      fabricWeave(g, w, h, 0.05);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(w * 0.47, 0, 6, h); g.fillRect(w * 0.53, 0, 6, h);
    }
    stains(g, w, h, 6, ['110,85,55', '70,60,40'], 5, 18);
  });
}
function faceTexture(o) {
  return cnv(512, 256, (g, w, h) => {
    g.fillStyle = o.skin; g.fillRect(0, 0, w, h);
    stains(g, w, h, 8, ['150,90,60'], 10, 40);
    const fx = w * 0.25, fy = h * 0.52; // מרכז הפנים (u=0.25 → +z)
    // לחיים
    g.fillStyle = 'rgba(210,100,90,0.18)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 30, fy + 18, 14, 9, 0, 0, Math.PI * 2); g.fill(); }
    // עיניים
    for (const s of [-1, 1]) {
      g.fillStyle = '#f5f1ea'; g.beginPath(); g.ellipse(fx + s * 20, fy - 2, 9, 5.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = o.eyes || '#3b2818'; g.beginPath(); g.arc(fx + s * 20, fy - 2, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(fx + s * 20, fy - 2, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(fx + s * 20 - 2, fy - 5, 1.5, 1.5);
      // גבות
      g.strokeStyle = o.hair; g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(fx + s * 12, fy - 13); g.quadraticCurveTo(fx + s * 20, fy - 17, fx + s * 29, fy - 13); g.stroke();
    }
    // אף
    g.strokeStyle = 'rgba(120,70,45,0.45)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(fx - 2, fy + 2); g.lineTo(fx - 4, fy + 14); g.lineTo(fx + 3, fy + 16); g.stroke();
    // פה – חיוך עקום
    g.strokeStyle = '#8a3b33'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(fx - 10, fy + 26); g.quadraticCurveTo(fx, fy + 31, fx + 11, fy + 24); g.stroke();
    // לכלוך על הלחי
    stains(g, w, h, 2, ['100,80,55'], 5, 9);
  });
}
function hairTexture(color) {
  return cnv(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.18)';
      g.lineWidth = 1;
      const x = R() * w, y = R() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 6, y + 10 + R() * 14); g.stroke();
    }
  });
}

// פרצוף מצויר לדמויות: עיניים גדולות, גבות, אף וחיוך
function kidFaceTexture(o) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 208;
  const g = c.getContext('2d');
  const W = 256, Hh = 208, cx = W / 2;
  const eyeY = 88, eyeDX = 50;
  // לחיים
  g.fillStyle = 'rgba(230,110,100,.28)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 70, 132, 20, 12, 0, 0, Math.PI * 2); g.fill(); }
  for (const s of [-1, 1]) {
    const x = cx + s * eyeDX;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, eyeY, 27, 32, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(40,25,15,.55)'; g.stroke();
    g.fillStyle = o.eyes || '#4a2e18'; g.beginPath(); g.arc(x + 3, eyeY + 5, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x + 3, eyeY + 5, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3, eyeY - 2, 6, 0, Math.PI * 2); g.fill();
    // גבות
    g.strokeStyle = o.hair || '#2a1a10'; g.lineWidth = 8; g.lineCap = 'round';
    g.lineWidth = 10; g.beginPath(); g.moveTo(x - 24, eyeY - 44 + (s > 0 ? 3 : 0)); g.quadraticCurveTo(x, eyeY - 58, x + 24, eyeY - 46 - (s > 0 ? 0 : 4)); g.stroke();
  }
  // אף
  g.strokeStyle = 'rgba(120,60,35,.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx - 2, 112); g.quadraticCurveTo(cx - 10, 128, cx + 2, 130); g.stroke();
  // פה – חיוך שובב
  g.fillStyle = '#7a2a22';
  g.beginPath(); g.moveTo(cx - 40, 146); g.quadraticCurveTo(cx, 196, cx + 42, 142); g.quadraticCurveTo(cx, 162, cx - 40, 146); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 32, 149); g.quadraticCurveTo(cx, 161, cx + 34, 146); g.lineTo(cx + 29, 154); g.quadraticCurveTo(cx, 166, cx - 27, 156); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function m(geo, mat) {
  const x = new THREE.Mesh(geo, mat);
  x.castShadow = true; x.receiveShadow = true;
  return x;
}
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

export class Player {
  constructor(scene, opts) {
    this.name = opts.name;
    this.color = opts.shirt;
    this.attackDir = opts.attackDir;
    this.pos = new THREE.Vector3(-this.attackDir * 3, 0, 0);
    this.vel = new THREE.Vector3();
    this.facing = this.attackDir > 0 ? 0 : Math.PI;
    this.runPhase = 0;
    this.anim = null;
    this.charge = 0;
    this.speedMul = 1;

    const skin = new THREE.MeshStandardMaterial({ color: opts.skin, roughness: 0.62 });
    const shirtM = new THREE.MeshStandardMaterial({ map: shirtTexture(opts), roughness: 0.95 });
    const pantsM = new THREE.MeshStandardMaterial({ map: pantsTexture(opts), roughness: 0.9 });
    const hairM = new THREE.MeshStandardMaterial({ map: hairTexture(opts.hair), roughness: 0.75 });
    const faceM = new THREE.MeshStandardMaterial({ map: faceTexture(opts), roughness: 0.6 });
    const sockM = new THREE.MeshStandardMaterial({ color: opts.socks || '#e9e6df', roughness: 1 });
    const shoeM = new THREE.MeshStandardMaterial({ color: opts.shoe || '#ececec', roughness: 0.6 });
    const soleM = new THREE.MeshStandardMaterial({ color: '#5b5148', roughness: 0.9 });

    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    // פלג גוף עליון – פרופיל מסובב (Lathe) בצורת ילד
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.74;
    this.body.add(this.pelvis);
    const prof = [[0.0, -0.08], [0.135, -0.07], [0.15, 0.0], [0.145, 0.08], [0.14, 0.16], [0.15, 0.26], [0.165, 0.34], [0.16, 0.39], [0.12, 0.43], [0.05, 0.45], [0.0, 0.452]];
    const torsoGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 28);
    torsoGeo.rotateY(Math.PI);
    torsoGeo.scale(1, 1, 0.66);
    this.chest = new THREE.Group();
    this.pelvis.add(this.chest);
    const torso = m(torsoGeo, shirtM); this.chest.add(torso);
    // חולצה מבצבצת מעל המכנס
    const shorts = m(new THREE.CylinderGeometry(0.152, 0.16, 0.16, 24, 1, true), pantsM);
    shorts.scale.z = 0.68; shorts.position.y = -0.03; shorts.material.side = THREE.DoubleSide; this.pelvis.add(shorts);
    const crotch = m(new THREE.SphereGeometry(0.15, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pantsM);
    crotch.scale.set(1, 0.55, 0.68); crotch.position.y = -0.1; this.pelvis.add(crotch);

    const neck = m(cap(0.045, 0.06), skin); neck.position.y = 0.48; this.chest.add(neck);
    this.head = new THREE.Group(); this.head.position.y = 0.6; this.chest.add(this.head);
    const headGeo = new THREE.SphereGeometry(0.112, 32, 22); headGeo.scale(0.92, 1.08, 1.0);
    this.head.add(m(headGeo, faceM));
    const nose = m(new THREE.SphereGeometry(0.018, 8, 6), skin); nose.position.set(0, -0.01, 0.11); nose.scale.set(0.9, 1.1, 1); this.head.add(nose);
    for (const s of [-1, 1]) {
      const ear = m(new THREE.SphereGeometry(0.028, 10, 8), skin); ear.scale.set(0.45, 1, 0.8); ear.position.set(s * 0.1, 0, 0); this.head.add(ear);
    }
    // שיער עם נפח – כדור מעוות
    const hg = new THREE.SphereGeometry(0.122, 28, 18, 0, Math.PI * 2, 0, Math.PI * (opts.longHair ? 0.68 : 0.52));
    const pa = hg.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pa, i);
      const n = 1 + (Math.sin(v.x * 90) * Math.cos(v.z * 80) + Math.sin(v.y * 120)) * 0.035;
      v.multiplyScalar(n); pa.setXYZ(i, v.x, v.y, v.z);
    }
    hg.computeVertexNormals(); hg.scale(0.95, 1.05, 1.05);
    const hair = m(hg, hairM); hair.rotation.x = 0.42; hair.position.set(0, 0.018, -0.022); this.head.add(hair);
    if (opts.cap) {
      const capM = new THREE.MeshStandardMaterial({ color: opts.cap, roughness: 0.85 });
      const c = m(new THREE.SphereGeometry(0.13, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), capM);
      c.position.y = 0.02; this.head.add(c);
      const peak = m(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 20, 1, false, 0, Math.PI), capM);
      peak.position.set(0, 0.045, opts.capBack ? -0.12 : 0.12); peak.rotation.y = opts.capBack ? Math.PI : 0; peak.scale.set(1, 1, 0.9);
      if (opts.capBack) peak.rotation.y = 0;
      this.head.add(peak);
    }

    // רגליים: ירך → ברך → שוק → כף רגל
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.085, -0.04, 0); this.pelvis.add(hip);
      const shortLeg = m(new THREE.CylinderGeometry(0.075, 0.068, opts.longPants ? 0.36 : 0.17, 16), pantsM);
      shortLeg.position.y = opts.longPants ? -0.18 : -0.085; hip.add(shortLeg);
      if (!opts.longPants) { const thigh = m(cap(0.058, 0.2), skin); thigh.position.y = -0.2; hip.add(thigh); }
      const knee = new THREE.Group(); knee.position.y = -0.35; hip.add(knee);
      if (opts.longPants) { const pl = m(new THREE.CylinderGeometry(0.066, 0.06, 0.32, 14), pantsM); pl.position.y = -0.15; knee.add(pl); }
      else { const shin = m(cap(0.047, 0.22), skin); shin.position.y = -0.15; knee.add(shin); }
      const sock = m(new THREE.CylinderGeometry(0.048, 0.044, 0.1, 12), sockM); sock.position.y = -0.27; knee.add(sock);
      const ankle = new THREE.Group(); ankle.position.y = -0.33; knee.add(ankle);
      const shoe = m(cap(0.05, 0.12), shoeM); shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.05, 1, 0.75); shoe.position.set(0, -0.01, 0.045); ankle.add(shoe);
      const sole = m(new THREE.BoxGeometry(0.1, 0.02, 0.22), soleM); sole.position.set(0, -0.045, 0.045); ankle.add(sole);
      this.legs.push({ hip, knee, ankle, s });
    }
    // ידיים: כתף → מרפק → אמה
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.175, 0.37, 0); this.chest.add(sh);
      const sleeve = m(new THREE.CylinderGeometry(0.058, 0.055, 0.13, 14), shirtM); sleeve.position.y = -0.05; sh.add(sleeve);
      const upper = m(cap(0.04, 0.16), skin); upper.position.y = -0.12; sh.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = -0.23; sh.add(elbow);
      const fore = m(cap(0.036, 0.15), skin); fore.position.y = -0.1; elbow.add(fore);
      const hand = m(new THREE.SphereGeometry(0.042, 12, 10), skin); hand.scale.set(0.8, 1.1, 0.6); hand.position.y = -0.21; elbow.add(hand);
      sh.rotation.z = s * 0.1;
      this.arms.push({ sh, elbow, s });
    }

    // טבעת "תור" מתחת לשחקן
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#2ecc71', transparent: true, opacity: 0.8, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 40), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03; this.ring.renderOrder = 2;
    this.root.add(this.ring);
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.16); arrowShape.lineTo(0.11, 0); arrowShape.lineTo(-0.11, 0); arrowShape.closePath();
    this.arrowMat = new THREE.MeshBasicMaterial({ color: opts.marker || opts.shirt, transparent: true, opacity: 0.9, depthWrite: false });
    this.arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), this.arrowMat);
    this.arrow.rotation.x = -Math.PI / 2; this.arrow.position.set(0, 0.035, 0.56);
    this.root.add(this.arrow);

    scene.add(this.root);
    if (opts.model) this.useModel(opts);
    this.sync();
  }

  // דמות מצוירת עם שלד ואנימציות (Quaternius, CC0)
  useModel(opts) {
    const m = SkeletonUtils.clone(opts.model.scene);
    const H = opts.height || 1.42;
    m.updateMatrixWorld(true);
    this.addFaceAndShoes(m, opts);
    m.scale.setScalar(H / 3.25);
    const COL = { Skin: opts.skin, Face: opts.skin, Shirt: opts.shirt, Pants: opts.pants, Hair: opts.hair };
    m.traverse((o) => {
      if (!o.isMesh) return;
      const list = (Array.isArray(o.material) ? o.material : [o.material]).map((mt) => {
        const c = mt.clone();
        if (COL[mt.name]) c.color.set(COL[mt.name]);
        c.roughness = 0.75; c.metalness = 0;
        return c;
      });
      o.material = Array.isArray(o.material) ? list : list[0];
      o.castShadow = opts.noShadow ? false : true;
    });
    this.body.visible = false;
    this.root.add(m);
    this.model = m;
    this.mixer = new THREE.AnimationMixer(m);
    const clip = (n) => opts.model.animations.find((a) => a.name.endsWith('|' + n));
    const act = (n, once) => {
      const c = clip(n); if (!c) return null;
      const a = this.mixer.clipAction(c);
      if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      return a;
    };
    this.acts = { idle: act('Idle'), walk: act('Walk'), win: act('Victory', true), lose: act('Defeat', true) };
    this.acts.idle.play(); this.acts.walk.play();
    this.acts.walk.setEffectiveWeight(0);
    this.mixer.update(Math.random() * 2);
    const B = (n) => m.getObjectByName(n);
    this.bones = { legR: B('UpperLegR'), kneeR: B('LowerLegR'), legL: B('UpperLegL'), kneeL: B('LowerLegL'), hips: B('Hips'), torso: B('Torso'), armR: B('UpperArmR'), armL: B('UpperArmL') };
    // תנוחת המנוחה של כל עצם – משחזרים לפני כל פריים כדי שתוספות לא יצטברו
    this.boneRest = Object.values(this.bones).filter(Boolean).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
    this.emote = null;
  }

  // פרצוף מצויר ונעלי ספורט – מוצמדים לעצמות של הראש והרגליים
  addFaceAndShoes(m, opts) {
    const attach = (boneName, obj, worldPos) => {
      const bone = m.getObjectByName(boneName);
      if (!bone) return;
      const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
      const world = new THREE.Matrix4().compose(worldPos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      new THREE.Matrix4().multiplyMatrices(inv, world).decompose(obj.position, obj.quaternion, obj.scale);
      bone.add(obj);
    };
    // פרצוף: משטח מעוקל על חזית הראש
    const geo = new THREE.PlaneGeometry(1.12, 0.92, 18, 14);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i);
      const z = 0.53 * Math.sqrt(Math.max(0, 1 - (x / 0.7) ** 2 - (y / 0.66) ** 2)) - 0.5;
      pa.setZ(i, z + 0.025);
    }
    geo.computeVertexNormals();
    const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: kidFaceTexture(opts), transparent: true, roughness: 0.8, depthWrite: false }));
    face.renderOrder = 2;
    attach('Head', face, new THREE.Vector3(0, 2.6, 0.5));
    // נעליים
    const shoeCol = opts.shoe || '#f2f2ee';
    const upperM = new THREE.MeshStandardMaterial({ color: shoeCol, roughness: 0.6 });
    const soleM = new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: 0.9 });
    const stripeM = new THREE.MeshStandardMaterial({ color: opts.shoeStripe || '#2f6fd0', roughness: 0.6 });
    for (const [bn, sx] of [['FootL', 0.264], ['FootR', -0.264]]) {
      const g = new THREE.Group();
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 10), upperM);
      up.rotation.x = Math.PI / 2; up.scale.set(1.05, 1, 0.85); up.position.set(0, 0.12, 0.08); g.add(up);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.62), soleM);
      sole.position.set(0, 0.03, 0.08); g.add(sole);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.345, 0.05, 0.3), stripeM);
      st.position.set(0, 0.13, 0.06); g.add(st);
      g.traverse((o) => { if (o.isMesh) o.castShadow = !opts.noShadow; });
      attach(bn, g, new THREE.Vector3(sx, 0, 0));
    }
  }

  updateModel(dt) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const k = Math.min(1, sp / PLAYER.speed);
    const A = this.acts;
    if (!this.emote) {
      const w = Math.min(1, sp / 0.6);
      A.walk.setEffectiveWeight(w); A.idle.setEffectiveWeight(1 - w);
      A.walk.timeScale = 1 + k * 1.9; // הליכה מהירה = ריצה מצחיקה
    }
    for (const [bn, q, p0] of this.boneRest) { bn.quaternion.copy(q); bn.position.copy(p0); }
    this.mixer.update(dt);
    // תוספות על השלד: טעינה, בעיטות ומספרת
    const b = this.bones;
    this.model.position.y = 0; this.model.rotation.x = 0;
    if (this.charge > 0 && b.legR) { b.legR.rotation.x += 0.8 * this.charge; b.kneeR.rotation.x -= 1.0 * this.charge; }
    if (this.anim && b.legR) {
      const a = this.anim;
      const p = Math.min(1, a.t);
      const sn = Math.sin(Math.PI * p);
      if (a.type === 'kick' || a.type === 'whiff') { b.legR.rotation.x -= 1.5 * sn - 0.5 * (1 - p); b.kneeR.rotation.x += 0.4 * (1 - sn); }
      else if (a.type === 'lob') { b.legR.rotation.x -= 1.6 * sn; if (b.torso) b.torso.rotation.x -= 0.15 * sn; }
      else if (a.type === 'heel') { b.legR.rotation.x += 0.7 * sn; b.kneeR.rotation.x -= 1.6 * sn; }
      else if (a.type === 'head') { b.torso.rotation.x += 0.5 * sn; this.model.position.y = 0.25 * sn; }
      else if (a.type === 'scissors') {
        // מספרת: קפיצה, הגוף נשכב לאחור סביב האגן, רגל שמאל עולה ואז רגל ימין מצליפה מעל הראש
        const h = 0.55 * (this.model.scale.y * 3.25 / 1.42); // גובה האגן
        const lean = -1.25 * Math.sin(Math.PI * Math.min(1, p * 1.15));
        this.model.rotation.x = lean;
        this.model.position.y = h - h * Math.cos(lean) + 0.65 * sn;
        this.model.position.z = -h * Math.sin(lean);
        const s1 = Math.sin(Math.PI * Math.min(1, p * 2));            // רגל שמאל – חצי ראשון
        const s2 = Math.sin(Math.PI * Math.max(0, Math.min(1, (p - 0.25) * 1.6))); // רגל ימין – מצליפה
        b.legL.rotation.x -= 1.5 * s1; b.kneeL.rotation.x += 0.9 * s1;
        b.legR.rotation.x -= 2.3 * s2; b.kneeR.rotation.x += 0.5 * (1 - s2) * sn;
        if (b.armL) b.armL.rotation.z += 1.1 * sn;
        if (b.armR) b.armR.rotation.z -= 1.1 * sn;
      }
    }
  }

  setEmote(kind) {
    if (!this.acts) return;
    const a = kind === 'cheer' ? this.acts.win : kind === 'sad' ? this.acts.lose : null;
    if (!a) return;
    for (const x of [this.acts.win, this.acts.lose]) if (x) x.stop();
    a.reset(); a.setEffectiveWeight(1); a.play();
    this.acts.idle.setEffectiveWeight(0); this.acts.walk.setEffectiveWeight(0);
    this.emote = a;
    clearTimeout(this.emoteT);
    this.emoteT = setTimeout(() => { a.fadeOut(0.3); this.emote = null; }, 1800);
  }

  forward(out = new THREE.Vector3()) {
    return out.set(Math.cos(this.facing), 0, Math.sin(this.facing));
  }

  legPositions() {
    const sp = this.vel.length() / PLAYER.speed;
    const spread = 1 - 0.45 * Math.min(1, sp);
    const f = this.forward();
    const right = new THREE.Vector3(-f.z, 0, f.x);
    const off = PLAYER.legOffset * spread;
    return [this.pos.clone().addScaledVector(right, off), this.pos.clone().addScaledVector(right, -off)];
  }

  play(type) {
    this.animSeq = (this.animSeq || 0) + 1; this.animType = type;
    const dur = { kick: 0.34, lob: 0.38, heel: 0.36, scissors: 0.8, head: 0.32, whiff: 0.32, cheer: 1.4, sad: 1.2 }[type] || 0.3;
    this.anim = { type, t: 0, dur };
    if (this.model && (type === 'cheer' || type === 'sad')) this.setEmote(type);
  }

  setTurn(state) {
    this.ringMat.color.set(state === 'yes' ? '#2ecc71' : state === 'no' ? '#e74c3c' : '#f1c40f');
  }

  update(dt, t) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const k = Math.min(1, sp / PLAYER.speed);
    this.runPhase += dt * (3 + sp * 2.3);
    const ph = this.runPhase;
    const spread = 1 - 0.45 * k;
    // מחזור ריצה עם כיפוף ברכיים
    for (const L of this.legs) {
      const p = ph + (L.s > 0 ? Math.PI : 0);
      L.hip.rotation.x = -Math.sin(p) * 0.85 * k;
      L.knee.rotation.x = Math.max(0, Math.sin(p - 1.3)) * 1.4 * k + 0.05;
      L.ankle.rotation.x = -Math.max(0, Math.sin(p - 1.0)) * 0.4 * k;
      L.hip.rotation.z = -L.s * 0.2 * spread * (1 - k * 0.5);
      L.knee.rotation.z = L.s * 0.12 * spread * (1 - k);
    }
    for (const A of this.arms) {
      const p = ph + (A.s > 0 ? 0 : Math.PI);
      A.sh.rotation.x = -Math.sin(p) * 0.8 * k;
      A.elbow.rotation.x = -(0.25 + 0.9 * k);
      A.sh.rotation.z = A.s * (0.1 + 0.08 * k);
    }
    this.body.position.y = Math.abs(Math.cos(ph)) * 0.05 * k;
    this.chest.rotation.x = 0.2 * k;
    this.chest.rotation.y = Math.sin(ph) * 0.18 * k;
    this.body.rotation.x = 0; this.body.rotation.z = 0;
    // נשימה בעמידה
    this.chest.scale.setScalar(1 + Math.sin(t * 3) * 0.008 * (1 - k));
    this.head.rotation.y = -this.chest.rotation.y * 0.7;

    const Rl = this.legs[1], Ll = this.legs[0];
    if (this.charge > 0) {
      Rl.hip.rotation.x = 0.7 * this.charge;
      Rl.knee.rotation.x = 1.2 * this.charge;
      this.chest.rotation.x = -0.1 * this.charge;
      this.arms[0].sh.rotation.z = -0.6 * this.charge;
    }
    if (this.anim) {
      const a = this.anim;
      a.t += dt / a.dur;
      const p = Math.min(1, a.t);
      const sn = Math.sin(Math.PI * p);
      if (a.type === 'kick' || a.type === 'whiff') {
        Rl.hip.rotation.x = 0.6 * (1 - p) - 1.6 * sn;
        Rl.knee.rotation.x = 1.3 * (1 - p) * (1 - sn) + 0.1;
        this.arms[0].sh.rotation.z = -0.8 * sn; this.arms[1].sh.rotation.x = 0.6 * sn;
        this.chest.rotation.x = -0.15 * sn;
      } else if (a.type === 'lob') {
        Rl.hip.rotation.x = -1.9 * sn; Rl.knee.rotation.x = 0.4 * (1 - sn);
        this.chest.rotation.x = -0.35 * sn;
        for (const A of this.arms) A.sh.rotation.z = A.s * 0.7 * sn;
      } else if (a.type === 'heel') {
        Rl.hip.rotation.x = 0.4 * sn; Rl.knee.rotation.x = 1.9 * sn;
        this.chest.rotation.x = 0.25 * sn;
      } else if (a.type === 'head') {
        this.chest.rotation.x = 0.5 * sn; this.body.position.y += 0.28 * sn;
        for (const A of this.arms) A.sh.rotation.z = A.s * 0.6 * sn;
      } else if (a.type === 'cheer') {
        // קפיצות שמחה וידיים למעלה
        this.body.position.y += Math.abs(Math.sin(p * Math.PI * 3)) * 0.22;
        for (const A of this.arms) { A.sh.rotation.z = A.s * 2.6 * Math.min(1, sn * 3); A.elbow.rotation.x = -0.2; }
      } else if (a.type === 'sad') {
        this.chest.rotation.x = 0.35 * Math.min(1, sn * 3); this.head.rotation.x = 0.4 * Math.min(1, sn * 3);
        for (const A of this.arms) A.sh.rotation.z = A.s * 0.05;
      } else if (a.type === 'scissors') {
        this.body.rotation.x = -1.5 * sn;
        this.body.position.y += 0.75 * sn;
        Rl.hip.rotation.x = -2.2 * Math.sin(Math.PI * Math.min(1, p * 1.4)); Rl.knee.rotation.x = 0.2;
        Ll.hip.rotation.x = 1.0 * sn; Ll.knee.rotation.x = 0.8 * sn;
        for (const A of this.arms) { A.sh.rotation.z = A.s * 1.4 * sn; A.elbow.rotation.x = -0.3; }
      }
      if (a.t >= 1) this.anim = null;
    }
    this.ring.scale.setScalar(1 + 0.05 * Math.sin(t * 6));
    this.arrow.position.z = 0.56 + this.charge * 0.5;
    this.arrow.scale.setScalar(1 + this.charge * 0.9);
    if (this.model) this.updateModel(dt);
    this.sync();
  }

  sync() {
    this.root.position.copy(this.pos);
    this.root.rotation.y = Math.PI / 2 - this.facing;
  }
}

// שני הילדים של המשחק
export const KIDS = {
  p1: { name: 'אבי', shirt: '#a9cbe8', logo: '#1d3f78', school: 'בי"ס אחד העם', pants: '#3c5a86', denim: true, skin: '#e2b08a', hair: '#2a1a10', shoe: '#e9e9e4', marker: '#2f7de0', attackDir: 1 },
  p2: { name: 'יניב', shirt: '#f3f1ea', logo: '#a3262c', school: 'בי"ס ביאליק', pants: '#5a5d63', denim: false, longPants: true, skin: '#c48e62', hair: '#140c07', shoe: '#2c2c2c', cap: '#c9302c', capBack: true, marker: '#e0442f', attackDir: -1 },
};

// ילדי השכונה שיורדים לראות את המשחק
export const EXTRA_KIDS = [
  { shirt: '#f2efe6', logo: '#1d5a3a', school: 'בי"ס הרצל', pants: '#2f3f66', denim: true, skin: '#e8bb94', hair: '#6b3e1f', shoe: '#ddd', longHair: true },
  { shirt: '#e6c34a', logo: '#333', school: '', pants: '#4a4a4a', skin: '#b9804f', hair: '#120a05', shoe: '#222', longPants: true },
  { shirt: '#9fc2df', logo: '#1d3f78', school: 'בי"ס אחד העם', pants: '#3a5a86', denim: true, skin: '#d9a27a', hair: '#2a1a10', shoe: '#ececec', cap: '#2a5ea8' },
  { shirt: '#c94b4b', logo: '#fff', school: '', pants: '#22252b', skin: '#f0c9a8', hair: '#b8862e', shoe: '#ececec', longHair: true },
  { shirt: '#f3f1ea', logo: '#a3262c', school: 'בי"ס ביאליק', pants: '#5a5d63', longPants: true, skin: '#a8714a', hair: '#0f0905', shoe: '#2c2c2c' },
  { shirt: '#6f9e6a', logo: '#fff', school: '', pants: '#3c5a86', denim: true, skin: '#e2b08a', hair: '#3b2414', shoe: '#e9e9e4', longHair: true },
];
