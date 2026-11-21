// שכונת שיכונים ישראלית, שנות ה-90 – גאומטריה אמיתית + טקסטורות מצולמות
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FIELD, POTHOLES } from './config.js';
import { pbrMaterial, fitModel } from './assets.js';
import {
  rand, rr, pick, canvasTex, asphaltTextures, shutterTextures, perforatedTexture,
  leafTexture, grilleTexture, plasterTextures, signTex, graffitiTexture, stickerTexture, streakTexture,
  GRAFFITI, STICKERS, streetSignTexture, houseNumberTexture, potholeTextures, crackOverlay, grassTexture,
} from './textures.js';

// ---------- כלים ----------
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}
// קופסה עם UV במטרים
function boxW(w, h, d, tile = 2.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
  }
  return g;
}
function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

// איחוד גאומטריות לפי חומר – מעט קריאות ציור
class Batch {
  constructor() { this.groups = new Map(); }
  add(mat, geo, matrix) {
    const c = geo.clone();
    if (matrix) c.applyMatrix4(matrix);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(c);
  }
  build(parent, { cast = true, recv = true } = {}) {
    for (const [mat, geos] of this.groups) {
      const indexed = geos.filter((g) => g.index);
      const non = geos.filter((g) => !g.index);
      for (const list of [indexed, non]) {
        if (!list.length) continue;
        const merged = mergeGeometries(list, false);
        if (!merged) continue;
        const m = new THREE.Mesh(merged, mat);
        m.castShadow = cast && !mat.transparent; m.receiveShadow = recv;
        parent.add(m);
      }
    }
    this.groups.clear();
  }
}

function mesh(geo, mat, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}

// ---------- גרפיטי ----------
const graffitiCache = new Map();
function graffitiMat(item) {
  const key = item.t + item.c;
  if (!graffitiCache.has(key)) {
    const tex = graffitiTexture(item.t, item.c, { outline: item.o });
    graffitiCache.set(key, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4 }));
  }
  return graffitiCache.get(key);
}
// מדביק גרפיטי על משטח: parent, רוחב, מיקום, סיבוב (הפנים פונות ל-+z המקומי)
function graffiti(parent, item, width, x, y, z, ry = 0) {
  const mat = graffitiMat(item);
  const aspect = mat.map.userData.aspect || 4;
  const m = mesh(new THREE.PlaneGeometry(width, width / aspect), mat, false, true);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.renderOrder = 3;
  parent.add(m);
  return m;
}
function sticker(parent, idx, x, y, z, ry = 0, s = 0.32) {
  const [t, bg, fg] = STICKERS[idx % STICKERS.length];
  const m = mesh(new THREE.PlaneGeometry(s, s * 80 / 256), new THREE.MeshStandardMaterial({ map: stickerTexture(t, bg, fg), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4 }), false);
  m.position.set(x, y, z); m.rotation.set(0, ry, rr(-0.15, 0.15));
  parent.add(m);
}
let gIdx = 0;
const nextGraffiti = () => GRAFFITI[(gIdx++) % GRAFFITI.length];

// ---------- חומרים ----------
const M = {};
const WALL_TINTS = ['#f1ebe0', '#ebe2cf', '#f4f1ea', '#e6dac4', '#efe6d6'];
const SHUTTER_COLORS = ['#d8d3c4', '#cbc3ad', '#a9b8b8', '#bfae8c', '#b4bfae', '#d6c4a4', '#9fb0bd'];
const CLOTHES = ['#d33b45', '#e9c440', '#3a72d6', '#f5f5f0', '#f39ab4', '#2a9d8f', '#ef8f2c', '#7b4fc9', '#5a6b7a'];

function makeMaterials(A) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  M.plaster = WALL_TINTS.map((c) => {
    const t = plasterTextures(c);
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: A.pbr.white_rough_plaster?.normalMap || t.normalMap, roughness: 0.95 });
    m.normalScale = new THREE.Vector2(1.3, 1.3);
    return m;
  });
  M.stone = pbrMaterial(A, 'white_sandstone_bricks', { color: '#f3e6cc' });
  M.rust = pbrMaterial(A, 'rusty_metal_02', { metalness: 0.6 });
  M.goalWhite = std('#efefe9', { roughness: 0.45, metalness: 0.35 });
  M.goalWhite.normalMap = A.pbr.rusty_metal_02?.normalMap || null;
  M.kioskShutter = pbrMaterial(A, 'painted_metal_shutter', { color: '#9fb6c8', metalness: 0.4 });
  M.glass = std('#1b242b', { roughness: 0.08, metalness: 0.1 });
  M.dark = std('#151515', { roughness: 0.9 });
  M.alu = std('#c9cbcc', { roughness: 0.35, metalness: 0.7 });
  M.aluDark = std('#7d8285', { roughness: 0.4, metalness: 0.6 });
  M.concrete = std('#b9b4aa', { roughness: 0.95 });
  M.concrete.normalMap = A.pbr.white_rough_plaster?.normalMap || null;
  M.roofTar = std('#4a4744', { roughness: 0.9 });
  M.tank = std('#efefea', { roughness: 0.35, metalness: 0.25 });
  M.panelGlass = std('#1c2a44', { roughness: 0.12, metalness: 0.5 });
  M.ironBars = std('#3b3b3a', { roughness: 0.5, metalness: 0.7 });
  M.bark = std('#5c4c3c', { roughness: 1 });
  M.bark.normalMap = A.pbr.rusty_metal_02?.normalMap || null;
  M.leafInner = std('#1f3a19', { roughness: 1 });
  M.curb = std('#a9a8a3', { roughness: 0.95 });
  M.curb.normalMap = A.pbr.white_rough_plaster?.normalMap || null;
  M.dumpster = std('#2d6337', { roughness: 0.55, metalness: 0.35 });
  M.dumpster.normalMap = A.pbr.rusty_metal_02?.normalMap || null;
  M.tire = std('#1a1a1a', { roughness: 0.9 });
  M.hub = std('#b8bcbf', { roughness: 0.3, metalness: 0.8 });
  M.plasticBlack = std('#222324', { roughness: 0.6 });
  M.lightF = std('#fff6dd', { roughness: 0.2, emissive: '#fff2cc', emissiveIntensity: 0.15 });
  M.lightR = std('#a81c1c', { roughness: 0.3, emissive: '#600', emissiveIntensity: 0.2 });
  M.line = std('#e8e2c8');
  M.perfBack = std('#2b2824', { roughness: 1 });
  M.door = std('#5d4632', { roughness: 0.7 });
  M.pot = std('#a8532e', { roughness: 0.9 });
  M.plant = std('#3c6b2c', { roughness: 0.9, flatShading: true });
  M.shutters = SHUTTER_COLORS.map((c) => {
    const t = shutterTextures(c);
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.6 });
  });
  M.cloth = CLOTHES.map((c) => std(c, { side: THREE.DoubleSide, roughness: 1 }));
  M.perforated = WALL_TINTS.map((c) => new THREE.MeshStandardMaterial({ map: perforatedTexture(c), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
  M.grille = new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.6 });
  M.acBody = std('#e6e5e0', { roughness: 0.5 });
  M.streak = new THREE.MeshStandardMaterial({ map: streakTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
}

// ---------- רכיבי חזית ----------
// בונים במערכת צירים של חזית: x לאורך, y למעלה, z החוצה (פני הקיר ב-z=0)
function windowUnit(B, F, x, y, ww, wh, opts) {
  const sh = pick(M.shutters);
  const frac = opts.shutter ?? rr(0, 1);
  B.add(M.glass, new THREE.PlaneGeometry(ww, wh), F.clone().multiply(M4(x, y + wh / 2, 0.012)));
  if (frac > 0.02) {
    const h = wh * frac;
    B.add(sh, scaleUV(new THREE.PlaneGeometry(ww, h), ww / 0.6, h / 1.2), F.clone().multiply(M4(x, y + wh - h / 2, 0.03)));
  }
  const t = 0.06, dpt = 0.09;
  B.add(M.alu, new THREE.BoxGeometry(ww + t * 2, t, dpt), F.clone().multiply(M4(x, y - t / 2, dpt / 2)));
  B.add(M.alu, new THREE.BoxGeometry(t, wh, dpt), F.clone().multiply(M4(x - ww / 2 - t / 2, y + wh / 2, dpt / 2)));
  B.add(M.alu, new THREE.BoxGeometry(t, wh, dpt), F.clone().multiply(M4(x + ww / 2 + t / 2, y + wh / 2, dpt / 2)));
  B.add(M.alu, new THREE.BoxGeometry(0.035, wh, 0.05), F.clone().multiply(M4(x, y + wh / 2, 0.035)));
  // ארגז תריס
  B.add(opts.boxMat || sh, boxW(ww + 0.16, 0.24, 0.16, 1), F.clone().multiply(M4(x, y + wh + 0.12, 0.08)));
  // אדן
  B.add(M.concrete, boxW(ww + 0.26, 0.05, 0.2, 1), F.clone().multiply(M4(x, y - 0.085, 0.1)));
  if (opts.bars) {
    for (let k = 0; k <= 6; k++) B.add(M.ironBars, new THREE.BoxGeometry(0.02, wh, 0.02), F.clone().multiply(M4(x - ww / 2 + k * ww / 6, y + wh / 2, 0.14)));
    for (const yy of [0.1, wh / 2, wh - 0.1]) B.add(M.ironBars, new THREE.BoxGeometry(ww, 0.025, 0.02), F.clone().multiply(M4(x, y + yy, 0.14)));
  }
  if (opts.ac) {
    const ax = x + ww / 2 + 0.55;
    B.add(M.acBody, boxW(0.78, 0.52, 0.28, 1), F.clone().multiply(M4(ax, y + 0.1, 0.16)));
    B.add(M.grille, new THREE.PlaneGeometry(0.7, 0.44), F.clone().multiply(M4(ax, y + 0.1, 0.302)));
    B.add(M.streak, new THREE.PlaneGeometry(0.4, 1.3), F.clone().multiply(M4(ax, y - 0.82, 0.008)));
  }
  if (rand() < 0.35) B.add(M.streak, new THREE.PlaneGeometry(ww * 0.8, 1.1), F.clone().multiply(M4(x, y - 0.66, 0.006)));
}

function balconyUnit(B, F, x, y0, bw, FH, wallMat, opts) {
  const depth = 1.15, pw = bw - 0.2;
  B.add(M.concrete, boxW(pw, 0.18, depth, 1.5), F.clone().multiply(M4(x, y0 + 0.09, depth / 2)));
  windowUnit(B, F, x, y0 + 0.2, Math.min(1.9, pw - 0.5), 2.1, { shutter: rr(0.1, 0.95), boxMat: wallMat });
  const closed = opts.closed;
  if (opts.rail && !closed) {
    B.add(M.ironBars, new THREE.BoxGeometry(pw, 0.05, 0.05), F.clone().multiply(M4(x, y0 + 1.05, depth - 0.03)));
    B.add(M.ironBars, new THREE.BoxGeometry(pw, 0.04, 0.04), F.clone().multiply(M4(x, y0 + 0.3, depth - 0.03)));
    for (let k = 0; k <= Math.floor(pw / 0.13); k++) B.add(M.ironBars, new THREE.BoxGeometry(0.018, 0.85, 0.018), F.clone().multiply(M4(x - pw / 2 + k * 0.13, y0 + 0.65, depth - 0.03)));
    for (const s of [-1, 1]) B.add(M.ironBars, new THREE.BoxGeometry(0.05, 0.9, depth), F.clone().multiply(M4(x + s * (pw / 2 - 0.025), y0 + 0.62, depth / 2)));
  } else {
    B.add(wallMat, boxW(pw, 1.0, 0.12, 2.5), F.clone().multiply(M4(x, y0 + 0.68, depth - 0.06)));
    for (const s of [-1, 1]) B.add(wallMat, boxW(0.12, 1.0, depth, 2.5), F.clone().multiply(M4(x + s * (pw / 2 - 0.06), y0 + 0.68, depth / 2)));
    B.add(M.concrete, boxW(pw + 0.04, 0.06, 0.18, 1), F.clone().multiply(M4(x, y0 + 1.2, depth - 0.06)));
    if (rand() < 0.5) B.add(M.streak, new THREE.PlaneGeometry(pw * 0.7, 0.9), F.clone().multiply(M4(x, y0 + 0.65, depth + 0.004)));
  }
  if (closed) {
    // סגירת מרפסת – אלומיניום ותריסים
    const hgt = FH - 1.35;
    const sh = pick(M.shutters);
    const frac = rr(0.3, 1);
    B.add(M.glass, new THREE.PlaneGeometry(pw - 0.1, hgt), F.clone().multiply(M4(x, y0 + 1.25 + hgt / 2, depth - 0.1)));
    B.add(sh, scaleUV(new THREE.PlaneGeometry(pw - 0.1, hgt * frac), (pw - 0.1) / 0.6, hgt * frac / 1.2), F.clone().multiply(M4(x, y0 + 1.25 + hgt * (1 - frac / 2), depth - 0.08)));
    for (let k = 0; k <= 3; k++) B.add(M.alu, new THREE.BoxGeometry(0.05, hgt, 0.06), F.clone().multiply(M4(x - (pw - 0.1) / 2 + k * (pw - 0.1) / 3, y0 + 1.25 + hgt / 2, depth - 0.07)));
    B.add(M.alu, new THREE.BoxGeometry(pw, 0.06, 0.08), F.clone().multiply(M4(x, y0 + FH - 0.1, depth - 0.07)));
  } else if (opts.laundry) {
    const ly = y0 + 2.0;
    for (const lz of [depth - 0.3, depth - 0.6]) {
      B.add(M.line, new THREE.BoxGeometry(pw - 0.3, 0.012, 0.012), F.clone().multiply(M4(x, ly, lz)));
      let cx = x - pw / 2 + 0.3;
      while (cx < x + pw / 2 - 0.5) {
        const cw = rr(0.25, 0.6), ch = rr(0.35, 0.75);
        B.add(pick(M.cloth), new THREE.PlaneGeometry(cw, ch), F.clone().multiply(M4(cx + cw / 2, ly - ch / 2, lz, rr(-0.1, 0.1), rr(-0.15, 0.15))));
        cx += cw + rr(0.05, 0.3);
      }
    }
  }
  if (!closed && rand() < 0.45) {
    for (let k = 0; k < 2; k++) {
      const px = x + rr(-pw / 2 + 0.3, pw / 2 - 0.3);
      B.add(M.pot, new THREE.CylinderGeometry(0.16, 0.12, 0.3, 10), F.clone().multiply(M4(px, y0 + 0.33, depth - 0.3)));
      B.add(M.plant, new THREE.IcosahedronGeometry(0.28, 1), F.clone().multiply(M4(px, y0 + 0.65, depth - 0.3, 0, 0, 0, 1, rr(0.8, 1.5), 1)));
    }
  }
}

function entranceUnit(B, F, x, FH, floors, wallMat, perfMat, numMat) {
  B.add(M.perfBack, new THREE.PlaneGeometry(1.5, 2.3), F.clone().multiply(M4(x, 1.15, 0.01)));
  B.add(M.door, boxW(0.68, 2.15, 0.05, 1), F.clone().multiply(M4(x - 0.36, 1.08, 0.03)));
  B.add(M.door, boxW(0.68, 2.15, 0.05, 1), F.clone().multiply(M4(x + 0.36, 1.08, 0.03)));
  B.add(M.glass, new THREE.PlaneGeometry(0.4, 1.2), F.clone().multiply(M4(x - 0.36, 1.3, 0.06)));
  B.add(M.glass, new THREE.PlaneGeometry(0.4, 1.2), F.clone().multiply(M4(x + 0.36, 1.3, 0.06)));
  B.add(M.concrete, boxW(2.4, 0.16, 1.2, 1.5), F.clone().multiply(M4(x, 2.62, 0.6)));
  B.add(numMat, new THREE.PlaneGeometry(0.56, 0.42), F.clone().multiply(M4(x + 1.1, 2.2, 0.03)));
  for (let f = 1; f < floors; f++) {
    const y0 = f * FH, h = FH - 0.35;
    B.add(M.perfBack, new THREE.PlaneGeometry(1.3, h), F.clone().multiply(M4(x, y0 + 0.2 + h / 2, 0.005)));
    B.add(perfMat, scaleUV(new THREE.PlaneGeometry(1.3, h), 1.3 / 0.4, h / 0.4), F.clone().multiply(M4(x, y0 + 0.2 + h / 2, 0.1)));
    for (const s of [-1, 1]) B.add(wallMat, boxW(0.18, h + 0.1, 0.2, 2.5), F.clone().multiply(M4(x + s * 0.74, y0 + 0.2 + h / 2, 0.1)));
  }
}

function solarHeater(B, x, y, z, ry) {
  const F = M4(x, y, z, 0, ry);
  B.add(M.panelGlass, new THREE.BoxGeometry(0.95, 0.06, 1.75), F.clone().multiply(M4(0, 0.62, 0.32, -0.6)));
  B.add(M.alu, new THREE.BoxGeometry(1.0, 0.03, 1.8), F.clone().multiply(M4(0, 0.58, 0.32, -0.6)));
  for (const s of [-1, 1]) {
    B.add(M.alu, new THREE.BoxGeometry(0.04, 1.0, 0.04), F.clone().multiply(M4(s * 0.45, 0.5, -0.35)));
    B.add(M.alu, new THREE.BoxGeometry(0.04, 0.04, 1.4), F.clone().multiply(M4(s * 0.45, 0.04, 0.2)));
  }
  B.add(M.tank, new THREE.CylinderGeometry(0.3, 0.3, 1.25, 16), F.clone().multiply(M4(0, 1.12, -0.42, 0, 0, Math.PI / 2)));
  B.add(M.aluDark, new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), F.clone().multiply(M4(0.35, 0.7, -0.1, 0.9)));
}

function antenna(B, x, y, z) {
  B.add(M.alu, new THREE.CylinderGeometry(0.025, 0.03, 2.8, 6), M4(x, y + 1.4, z));
  const ry = rr(0, Math.PI);
  for (let i = 0; i < 5; i++) B.add(M.alu, new THREE.CylinderGeometry(0.012, 0.012, 1.3 - i * 0.18, 4), M4(x, y + 1.9 + i * 0.18, z, 0, ry, Math.PI / 2));
}

// ---------- בניין ----------
function building(scene, { x, z, w, d, floors, rotY = 0, sides = [], num = 7, street = 'הרצל', graffitiCount = 2 }) {
  const FH = 2.9;
  const H = floors * FH + 0.5;
  const wi = Math.floor(rand() * WALL_TINTS.length);
  const wallMat = M.plaster[wi];
  const perfMat = M.perforated[wi];
  const numMat = new THREE.MeshStandardMaterial({ map: houseNumberTexture(num, street), roughness: 0.4, emissive: '#1f57a3', emissiveIntensity: 0.15 });
  const B = new Batch();
  const root = new THREE.Group();

  B.add(wallMat, boxW(w, H - 0.6, d, 2.5), M4(0, 0.6 + (H - 0.6) / 2, 0));
  B.add(M.stone, boxW(w + 0.08, 0.6, d + 0.08, 1.6), M4(0, 0.3, 0));
  B.add(M.roofTar, new THREE.BoxGeometry(w - 0.1, 0.05, d - 0.1), M4(0, H + 0.02, 0));
  for (const [px, pz, pw, pd] of [[0, d / 2 - 0.1, w, 0.2], [0, -d / 2 + 0.1, w, 0.2], [w / 2 - 0.1, 0, 0.2, d], [-w / 2 + 0.1, 0, 0.2, d]]) {
    B.add(wallMat, boxW(pw, 0.7, pd, 2.5), M4(px, H + 0.35, pz));
    B.add(M.concrete, boxW(pw + 0.06, 0.06, pd + 0.06, 1), M4(px, H + 0.72, pz));
  }
  const srx = rr(-w / 5, w / 5);
  B.add(wallMat, boxW(2.8, 2.4, 3, 2.5), M4(srx, H + 1.2, -d / 4));
  B.add(M.concrete, boxW(3.0, 0.12, 3.2, 1), M4(srx, H + 2.45, -d / 4));
  // דודי שמש
  const n = Math.max(3, Math.floor(w / 1.6));
  for (let i = 0; i < n; i++) {
    const sx = -w / 2 + 1.0 + i * ((w - 2.0) / Math.max(1, n - 1));
    if (Math.abs(sx - srx) < 1.8) continue;
    solarHeater(B, sx + rr(-0.15, 0.15), H, d / 2 - 2.0 + rr(-0.2, 0.2), 0);
    if (rand() < 0.55) solarHeater(B, sx + rr(-0.15, 0.15), H, rr(-d / 2 + 1.6, d / 2 - 4.5), 0);
  }
  for (let i = 0; i < 4; i++) antenna(B, rr(-w / 2 + 1, w / 2 - 1), H, rr(-d / 2 + 1, d / 2 - 1));

  // חזית קדמית
  const bays = Math.max(2, Math.round(w / 3.3));
  const bw = w / bays;
  const mid = Math.floor(bays / 2);
  const colType = [];
  for (let b = 0; b < bays; b++) colType.push(b === mid ? 'entrance' : rand() < 0.5 ? 'balcony' : 'window');
  const front = M4(0, 0, d / 2);
  for (let f = 1; f < floors; f++) B.add(M.concrete, boxW(w + 0.04, 0.16, 0.06, 1), front.clone().multiply(M4(0, f * FH, 0.03)));
  for (let b = 0; b < bays; b++) {
    const cx = -w / 2 + (b + 0.5) * bw;
    if (colType[b] === 'entrance') { entranceUnit(B, front, cx, FH, floors, wallMat, perfMat, numMat); continue; }
    for (let f = 0; f < floors; f++) {
      const y0 = f * FH;
      if (colType[b] === 'balcony' && f > 0) balconyUnit(B, front, cx, y0, bw, FH, wallMat, { closed: rand() < 0.4, rail: rand() < 0.35, laundry: rand() < 0.6 });
      else windowUnit(B, front, cx, y0 + 0.95, Math.min(1.4, bw - 1.2), 1.3, { bars: f === 0 && rand() < 0.7, ac: rand() < 0.3 });
    }
  }
  for (const s of [-1, 1]) B.add(M.aluDark, new THREE.CylinderGeometry(0.05, 0.05, H, 8), front.clone().multiply(M4(s * (w / 2 - 0.25), H / 2, 0.07)));

  const faceMat = {
    px: M4(w / 2, 0, 0, 0, Math.PI / 2),
    nx: M4(-w / 2, 0, 0, 0, -Math.PI / 2),
    back: M4(0, 0, -d / 2, 0, Math.PI),
  };
  for (const sd of sides) {
    const F = faceMat[sd];
    const len = sd === 'back' ? w : d;
    const cols = Math.max(1, Math.round(len / 4.5));
    for (let c = 0; c < cols; c++) {
      const ux = -len / 2 + (c + 0.5) * len / cols;
      for (let f = 0; f < floors; f++) windowUnit(B, F, ux, f * FH + 0.95, 1.0, 1.2, { bars: f === 0 && rand() < 0.6, ac: rand() < 0.3 });
    }
  }
  B.build(root);

  // גרפיטי וסלוגנים בקומת הקרקע
  const spots = [];
  for (let b = 0; b < bays; b++) if (b !== mid) spots.push(-w / 2 + (b + 0.5) * bw + (rand() < 0.5 ? -1 : 1) * bw * 0.3);
  for (let i = 0; i < Math.min(graffitiCount, spots.length); i++) {
    const sx = spots.splice(Math.floor(rand() * spots.length), 1)[0];
    graffiti(root, nextGraffiti(), rr(1.8, 2.6), sx, rr(0.45, 0.75), d / 2 + 0.05);
  }
  for (let i = 0; i < 3; i++) sticker(root, Math.floor(rand() * 10), rr(-w / 2 + 0.5, w / 2 - 0.5), rr(0.9, 1.6), d / 2 + 0.03);
  for (const sd of sides) {
    const F = faceMat[sd];
    const g = graffiti(new THREE.Group(), nextGraffiti(), 2.4, rr(-d / 4, d / 4), 0.6, 0.05);
    g.applyMatrix4(F); root.add(g);
  }
  root.position.set(x, 0, z);
  root.rotation.y = rotY;
  scene.add(root);
}

// ---------- עצים ----------
let leafMats = null;
function treeMaterials() {
  if (leafMats) return leafMats;
  const pals = [
    ['#2f5a24', '#3d6e2c', '#4b7f34', '#264b1d', '#5a8c3c'],
    ['#355e2a', '#466f33', '#2b4f22', '#5d7f3a', '#6c8f45'],
  ];
  leafMats = pals.map((p) => new THREE.MeshStandardMaterial({ map: leafTexture(p), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }));
  return leafMats;
}

function tree(scene, x, z, s = 1) {
  const B = new Batch();
  const g = new THREE.Group();
  const trunkH = 2.4 * s;
  B.add(M.bark, new THREE.CylinderGeometry(0.17 * s, 0.3 * s, trunkH, 9), M4(0, trunkH / 2, 0, rr(-0.06, 0.06), 0, rr(-0.06, 0.06)));
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + rr(-0.3, 0.3);
    const len = rr(1.4, 2.0) * s, tilt = rr(0.5, 0.9);
    const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const c = new THREE.Vector3(0, trunkH - 0.2, 0).addScaledVector(dir, len / 2);
    B.add(M.bark, new THREE.CylinderGeometry(0.05 * s, 0.12 * s, len, 6), new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
  }
  const cy = trunkH + 1.5 * s, R = 2.3 * s;
  B.add(M.leafInner, new THREE.IcosahedronGeometry(1, 2), M4(0, cy, 0, 0, 0, 0, R * 0.78, R * 0.55, R * 0.78));
  const lm = pick(treeMaterials());
  for (let i = 0; i < 170; i++) {
    const u = rand() * Math.PI * 2, v = Math.acos(rr(-0.75, 1));
    const rad = rr(0.7, 1.0);
    const px = Math.cos(u) * Math.sin(v) * R * rad;
    const py = Math.cos(v) * R * 0.68 * rad + cy;
    const pz = Math.sin(u) * Math.sin(v) * R * rad;
    const sz = rr(1.0, 1.5) * s;
    B.add(lm, new THREE.PlaneGeometry(sz, sz), M4(px, py, pz, rr(0, Math.PI), rr(0, Math.PI), rr(0, Math.PI)));
  }
  B.build(g);
  g.position.set(x, 0, z);
  g.userData.sway = rand() * 6;
  scene.add(g);
  return g;
}

// ---------- מכונית שנות ה-90 ----------
function car90(scene, x, z, rotY, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.55 });
  const L = 3.9, W = 1.62;
  const body = new THREE.Shape();
  body.moveTo(-L / 2, 0.32); body.lineTo(-L / 2, 0.78); body.lineTo(-L / 2 + 0.25, 0.86);
  body.lineTo(L / 2 - 0.45, 0.88); body.lineTo(L / 2 - 0.05, 0.74); body.lineTo(L / 2, 0.42); body.lineTo(L / 2 - 0.1, 0.32);
  body.lineTo(1.63, 0.32); body.absarc(1.25, 0.32, 0.38, 0, Math.PI, false);
  body.lineTo(-0.88, 0.32); body.absarc(-1.26, 0.32, 0.38, 0, Math.PI, false);
  body.lineTo(-L / 2, 0.32);
  const bg = new THREE.ExtrudeGeometry(body, { depth: W - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
  bg.translate(0, 0, -(W - 0.12) / 2);
  g.add(mesh(bg, paint));
  const cab = new THREE.Shape();
  cab.moveTo(-L / 2 + 0.3, 0.86); cab.lineTo(-L / 2 + 0.55, 1.36); cab.lineTo(0.55, 1.38); cab.lineTo(1.1, 0.88);
  const cg = new THREE.ExtrudeGeometry(cab, { depth: W - 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  cg.translate(0, 0, -(W - 0.3) / 2);
  g.add(mesh(cg, M.glass));
  const roof = mesh(new THREE.BoxGeometry(1.55, 0.05, W - 0.28), paint);
  roof.position.set(-0.6, 1.39, 0); g.add(roof);
  for (const s of [-1, 1]) {
    const bump = mesh(new THREE.BoxGeometry(0.14, 0.18, W + 0.04), M.plasticBlack);
    bump.position.set(s * (L / 2 + 0.02), 0.42, 0); g.add(bump);
    const strip = mesh(new THREE.BoxGeometry(L - 0.4, 0.07, 0.02), M.plasticBlack);
    strip.position.set(0, 0.6, s * (W / 2 + 0.01)); g.add(strip);
    const hl = mesh(new THREE.BoxGeometry(0.04, 0.14, 0.38), M.lightF); hl.position.set(L / 2 + 0.01, 0.62, s * 0.5); g.add(hl);
    const tl = mesh(new THREE.BoxGeometry(0.04, 0.16, 0.3), M.lightR); tl.position.set(-L / 2 - 0.01, 0.66, s * 0.55); g.add(tl);
  }
  for (const [wx, wz] of [[1.25, 1], [-1.26, 1], [1.25, -1], [-1.26, -1]]) {
    const tire = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 18), M.tire);
    tire.rotation.x = Math.PI / 2; tire.position.set(wx, 0.31, wz * (W / 2 - 0.08)); g.add(tire);
    const hub = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14), M.hub);
    hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.31, wz * (W / 2 + 0.03)); g.add(hub);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
}

// ---------- אביזרי שכונה ----------
function laundryPoles(scene, x, z, len) {
  const B = new Batch();
  const g = new THREE.Group();
  for (const sx of [0, len]) {
    for (const sz of [-0.65, 0.65]) B.add(M.rust, new THREE.CylinderGeometry(0.045, 0.05, 1.95, 8), M4(sx, 0.97, sz));
    B.add(M.rust, new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), M4(sx, 1.88, 0, Math.PI / 2));
  }
  B.build(g);
  const clothes = [];
  for (const sz of [-0.5, -0.17, 0.17, 0.5]) {
    const line = mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4), M.line, false);
    line.rotation.z = Math.PI / 2; line.position.set(len / 2, 1.86, sz); g.add(line);
    let cx = 0.25;
    while (cx < len - 0.4) {
      const cw = rr(0.3, 0.75), ch = rr(0.4, 0.85);
      const geo = new THREE.PlaneGeometry(cw, ch, 2, 3); geo.translate(0, -ch / 2, 0);
      const cl = mesh(geo, pick(M.cloth));
      cl.position.set(cx + cw / 2, 1.86, sz);
      cl.userData.phase = rand() * 6;
      g.add(cl); clothes.push(cl);
      cx += cw + rr(0.06, 0.35);
    }
  }
  g.position.set(x, 0, z);
  scene.add(g);
  return clothes;
}

function dumpster(scene, x, z, rotY) {
  const g = new THREE.Group();
  const body = new THREE.Shape();
  body.moveTo(-0.95, 0.25); body.lineTo(-1.05, 1.35); body.lineTo(1.05, 1.35); body.lineTo(0.95, 0.25); body.lineTo(-0.95, 0.25);
  const geo = new THREE.ExtrudeGeometry(body, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  geo.translate(0, 0, -0.55);
  g.add(mesh(geo, M.dumpster));
  const lid = mesh(new THREE.BoxGeometry(2.2, 0.08, 1.3), M.dumpster);
  lid.position.set(0, 1.46, -0.15); lid.rotation.x = -0.2; g.add(lid);
  for (const sx of [-0.75, 0.75]) for (const sz of [-0.45, 0.45]) {
    const w = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), M.tire);
    w.rotation.x = Math.PI / 2; w.position.set(sx, 0.12, sz); g.add(w);
  }
  const bag = mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.3 }));
  bag.position.set(1.3, 0.28, 0.4); bag.scale.y = 0.8; g.add(bag);
  graffiti(g, GRAFFITI[5], 1.4, 0, 0.85, 0.62);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
}

function cat(scene, x, y, z, color = '#d9883a') {
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.11, 0.24, 4, 10), fur);
  body.rotation.x = Math.PI / 2 - 0.5; body.position.set(0, 0.17, -0.04); g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.36, 0.12); g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.1, 14, 10), fur));
  for (const sx of [-0.055, 0.055]) {
    const ear = mesh(new THREE.ConeGeometry(0.035, 0.07, 4), fur);
    ear.position.set(sx, 0.09, 0); head.add(ear);
  }
  const tail = new THREE.Group();
  const tm = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.38, 6), fur);
  tm.position.y = 0.19; tail.add(tm);
  tail.position.set(0, 0.06, -0.2); tail.rotation.x = -1.2; g.add(tail);
  g.position.set(x, y, z); g.rotation.y = Math.PI / 2;
  scene.add(g);
  return { g, tail, head };
}

function kiosk(scene, A, x, z, rotY) {
  const g = new THREE.Group();
  const b = mesh(boxW(4.2, 3.0, 3.2, 2.5), M.plaster[0]); b.position.y = 1.5; g.add(b);
  const roofB = mesh(boxW(4.5, 0.15, 3.5, 1.5), M.concrete); roofB.position.y = 3.05; g.add(roofB);
  const aw = canvasTex(256, 64, (c, w, h) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f1e8' : '#2c6aa8'; c.fillRect(i * w / 8, 0, w / 8, h); }
    c.fillStyle = 'rgba(80,60,40,0.25)'; c.fillRect(0, h - 10, w, 10);
  });
  const awning = mesh(new THREE.BoxGeometry(4.4, 0.05, 1.5), new THREE.MeshStandardMaterial({ map: aw, roughness: 0.9 }));
  awning.position.set(0, 2.55, 2.25); awning.rotation.x = 0.28; g.add(awning);
  const sign = mesh(new THREE.PlaneGeometry(3.8, 0.7), new THREE.MeshStandardMaterial({ map: signTex('מכולת השכונה', '#b92b27', '#fff3cf'), roughness: 0.6 }), false);
  sign.position.set(0, 3.03 - 0.12, 1.62); g.add(sign);
  const shutter = mesh(scaleUV(new THREE.PlaneGeometry(1.6, 2.1), 1, 1.2), M.kioskShutter, false);
  shutter.position.set(-0.95, 1.05, 1.61); g.add(shutter);
  const door = mesh(new THREE.PlaneGeometry(1.3, 2.1), M.perfBack, false);
  door.position.set(0.95, 1.05, 1.605); g.add(door);
  const poster = mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ map: canvasTex(128, 170, (c, w, h) => {
    c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c62828'; c.font = 'bold 30px "Rubik", sans-serif'; c.textAlign = 'center';
    c.fillText('ארטיק', w / 2, 45); c.fillText('קרטיב', w / 2, 85);
    c.fillStyle = '#1d3557'; c.font = 'bold 24px sans-serif'; c.fillText('1.50 ש"ח', w / 2, 135);
  }) }), false);
  poster.position.set(1.75, 1.4, 1.62); g.add(poster);
  const fridge = mesh(new THREE.BoxGeometry(1.2, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.35 }));
  fridge.position.set(1.3, 0.45, 2.1); g.add(fridge);
  const crateM = new THREE.MeshStandardMaterial({ color: '#2a7a3b', roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const cr = mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), crateM);
    cr.position.set(-1.85 + (i > 2 ? 0.55 : 0), 0.14 + (i % 3) * 0.28, 2.0); g.add(cr);
  }
  graffiti(g, GRAFFITI[0], 2.6, 0, 1.4, 0, Math.PI / 2).position.set(2.11, 1.5, 0);
  sticker(g, 0, -1.9, 1.5, 1.62);
  sticker(g, 1, 0.1, 2.25, 1.62);
  const chair = A.models.plastic_monobloc_chair_01;
  if (chair) {
    for (const [cx, cz, r] of [[-0.3, 3.0, 0.4], [0.5, 3.3, -0.5], [-1.2, 3.4, 2.6]]) {
      const c = fitModel(chair.clone(), { height: 0.82 });
      c.position.set(cx, 0, cz); c.rotation.y = r; g.add(c);
    }
  }
  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
}

function shelter(scene, x, z, rotY) {
  const g = new THREE.Group();
  const box = mesh(boxW(2.6, 1.5, 3.2, 2.5), M.plaster[3]); box.position.y = 0.75; g.add(box);
  const cap = mesh(boxW(2.8, 0.1, 3.4, 1), M.concrete); cap.position.y = 1.55; g.add(cap);
  const opening = mesh(new THREE.PlaneGeometry(1.2, 1.15), M.perfBack, false);
  opening.position.set(0, 0.6, 1.605); g.add(opening);
  const door = mesh(new THREE.PlaneGeometry(0.55, 1.1), M.ironBars, false);
  door.position.set(-0.3, 0.58, 1.61); door.rotation.y = -0.5; g.add(door);
  const sign = mesh(new THREE.PlaneGeometry(1.3, 0.36), new THREE.MeshStandardMaterial({ map: signTex('מקלט', '#efe7cf', '#1a1a1a', 256, 72, 52) }), false);
  sign.position.set(0, 1.32, 1.61); g.add(sign);
  for (const s of [-1, 1]) {
    const vent = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 12), M.aluDark);
    vent.position.set(s * 0.8, 1.85, -1); g.add(vent);
    const capv = mesh(new THREE.ConeGeometry(0.24, 0.16, 12), M.aluDark);
    capv.position.set(s * 0.8, 2.2, -1); g.add(capv);
  }
  graffiti(g, GRAFFITI[2], 2.8, 0, 0.75, 0, Math.PI / 2).position.set(1.31, 0.75, 0);
  graffiti(g, GRAFFITI[3], 2.6, 0, 0.75, 0, -Math.PI / 2).position.set(-1.31, 0.75, 0);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
}

function payphone(scene, x, z, rotY) {
  const g = new THREE.Group();
  const pole = mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), M.aluDark); pole.position.y = 0.7; g.add(pole);
  const hood = mesh(new THREE.BoxGeometry(0.75, 0.85, 0.5), new THREE.MeshStandardMaterial({ color: '#2d6fb7', roughness: 0.45, metalness: 0.2 }));
  hood.position.set(0, 1.75, 0.12); g.add(hood);
  const ph = mesh(new THREE.BoxGeometry(0.38, 0.55, 0.14), M.hub); ph.position.set(0, 1.62, 0.34); g.add(ph);
  const rec = mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), M.plasticBlack); rec.position.set(-0.12, 1.64, 0.43); g.add(rec);
  const sign = mesh(new THREE.PlaneGeometry(0.7, 0.17), new THREE.MeshStandardMaterial({ map: signTex('טלכרט', '#ffffff', '#2d6fb7', 256, 64, 44) }), false);
  sign.position.set(0, 2.08, 0.375); g.add(sign);
  sticker(g, 2, 0, 0.9, 0.065, 0, 0.11);
  g.position.set(x, 0, z); g.rotation.y = rotY;
  scene.add(g);
}

function bike(scene, x, z, rotY, color) {
  const g = new THREE.Group();
  const fm = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 });
  for (const sx of [-0.52, 0.52]) {
    const w = mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), M.tire); w.position.set(sx, 0.33, 0); g.add(w);
    const hubm = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), M.hub); hubm.rotation.x = Math.PI / 2; hubm.position.set(sx, 0.33, 0); g.add(hubm);
  }
  const tube = (ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay);
    const t = mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 6), fm);
    t.position.set((ax + bx) / 2, (ay + by) / 2, 0); t.rotation.z = -Math.atan2(bx - ax, by - ay); g.add(t);
  };
  tube(-0.52, 0.33, -0.05, 0.33); tube(-0.05, 0.33, -0.2, 0.85); tube(-0.2, 0.8, 0.42, 0.78); tube(-0.05, 0.33, 0.42, 0.78); tube(0.42, 0.85, 0.52, 0.33); tube(-0.52, 0.33, -0.2, 0.8);
  const bar = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M.hub); bar.rotation.x = Math.PI / 2; bar.position.set(0.42, 0.95, 0); g.add(bar);
  const seat = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.12), M.plasticBlack); seat.position.set(-0.22, 0.9, 0); g.add(seat);
  g.position.set(x, 0, z); g.rotation.set(0, rotY, 0.22);
  scene.add(g);
}

function goal(scene, x, dir) {
  const B = new Batch();
  const g = new THREE.Group();
  const { postZ, goalH, postR } = FIELD;
  for (const s of [-1, 1]) {
    B.add(M.goalWhite, new THREE.CylinderGeometry(postR, postR, goalH, 14), M4(0, goalH / 2, s * postZ));
    B.add(M.rust, new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8), M4(dir * 0.55, goalH / 2 - 0.1, s * postZ, 0, 0, dir * 0.55));
    B.add(M.rust, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), M4(dir * 0.5, 0.04, s * postZ, 0, 0, Math.PI / 2));
  }
  B.add(M.goalWhite, new THREE.CylinderGeometry(postR, postR, postZ * 2 + postR * 2, 14), M4(0, goalH, 0, Math.PI / 2));
  const stripe = new THREE.MeshStandardMaterial({ color: '#c8352b', roughness: 0.5, metalness: 0.2 });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) B.add(stripe, new THREE.CylinderGeometry(postR + 0.004, postR + 0.004, 0.2, 14), M4(0, 0.25 + k * 0.55, s * postZ));
  B.build(g);
  // רשת קרועה
  const netTex = canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(235,235,230,0.85)'; c.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.ellipse(w * 0.65, h * 0.7, 50, 40, 0.3, 0, Math.PI * 2); c.fill();
  });
  const netMat = new THREE.MeshStandardMaterial({ map: netTex, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 });
  const net = mesh(new THREE.PlaneGeometry(postZ * 2, Math.hypot(goalH, 1.0)), netMat, true, false);
  net.position.set(dir * 0.5, goalH / 2, 0);
  net.rotation.set(0, Math.PI / 2, 0);
  net.rotateX(-dir * Math.atan2(1.0, goalH));
  g.add(net);
  g.position.set(x, 0, 0);
  scene.add(g);
}

function streetSign(scene, x, z, ry, he, ar, en) {
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.045, 2.8, 8), M.aluDark); pole.position.y = 1.4; g.add(pole);
  const mat = new THREE.MeshStandardMaterial({ map: streetSignTexture(he, ar, en), roughness: 0.5 });
  const sg = mesh(new THREE.BoxGeometry(1.0, 0.39, 0.03), [M.alu, M.alu, M.alu, M.alu, mat, mat]);
  sg.position.set(0, 2.6, 0.05); g.add(sg);
  sticker(g, 1, 0, 1.4, 0.046, 0, 0.12);
  g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
}

function wallSign(parent, x, y, z, ry, he, ar, en) {
  const mat = new THREE.MeshStandardMaterial({ map: streetSignTexture(he, ar, en), roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
  const m = mesh(new THREE.PlaneGeometry(1.1, 0.43), mat, false);
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m);
}

// ילקוט שנזרק אחרי בית הספר
function schoolbag(scene, x, z, ry, color, lying) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const body = mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 12), mat);
  body.scale.set(1.25, 1, 0.55); body.position.y = 0.23; g.add(body);
  const pocket = mesh(new THREE.CapsuleGeometry(0.08, 0.08, 4, 10), new THREE.MeshStandardMaterial({ color: '#f0c419', roughness: 0.8 }));
  pocket.scale.set(1.3, 1, 0.5); pocket.position.set(0, 0.17, 0.07); g.add(pocket);
  for (const s of [-1, 1]) {
    const strap = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16, Math.PI), M.plasticBlack);
    strap.position.set(s * 0.08, 0.28, -0.08); strap.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(strap);
  }
  g.position.set(x, 0, z); g.rotation.y = ry;
  if (lying) { g.rotation.x = -Math.PI / 2; g.position.y = 0.08; }
  scene.add(g);
}

function placeModel(scene, src, opts, x, z, ry = 0) {
  if (!src) return null;
  const m = fitModel(src.clone(), opts);
  m.position.set(x, 0, z); m.rotation.y = ry;
  scene.add(m);
  return m;
}

function hedgeRow(scene, A, x0, x1, z) {
  // משוכה: ליבה כהה + כרטיסי עלים
  const B = new Batch();
  const len = x1 - x0;
  B.add(M.leafInner, new THREE.BoxGeometry(len, 0.85, 0.6), M4((x0 + x1) / 2, 0.42, z));
  const lm = treeMaterials()[1];
  const n = Math.floor(len * 9);
  for (let i = 0; i < n; i++) {
    const sz = rr(0.55, 0.85);
    B.add(lm, new THREE.PlaneGeometry(sz, sz), M4(rr(x0, x1), rr(0.25, 0.95), z + rr(-0.38, 0.38), rr(0, Math.PI), rr(0, Math.PI), rr(0, Math.PI)));
  }
  B.build(scene);
}

// ---------- בניית העולם ----------
export function buildWorld(scene, A) {
  makeMaterials(A);
  const AX = FIELD.asphaltX, AZ = FIELD.asphaltZ, BX = 16.5, BZ = 10;

  const groundMat = pbrMaterial(A, 'dry_ground_01', { color: '#c9c6b8' });
  const ground = mesh(scaleUV(new THREE.PlaneGeometry(160, 160), 160 / 3, 160 / 3), groundMat, false);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

  const pavMat = pbrMaterial(A, 'concrete_tiles', { color: '#e4e4e2' });
  const pav = (w, d, x, z) => {
    const m = mesh(scaleUV(new THREE.PlaneGeometry(w, d), w / 2, d / 2), pavMat, false);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.0, z); scene.add(m);
  };
  pav(BX * 2 + 4, BZ - AZ + 1.6, 0, -(AZ + BZ) / 2 - 0.8);
  pav(BX * 2 + 4, BZ - AZ + 1.6, 0, (AZ + BZ) / 2 + 0.8);
  pav(BX - AX + 2, AZ * 2, -(AX + BX) / 2 - 1, 0);
  pav(BX - AX + 2, AZ * 2, (AX + BX) / 2 + 1, 0);
  pav(70, 3.0, 0, -12.4);
  pav(3.6, 24, -20.2, 0); pav(3.6, 24, 20.2, 0);
  pav(70, 3.2, 0, 12.6);

  const asphaltMat = pbrMaterial(A, 'worn_asphalt');
  asphaltMat.color.set('#e6e8ea');
  const asphalt = mesh(scaleUV(new THREE.PlaneGeometry(AX * 2, AZ * 2), AX * 2 / 3.2, AZ * 2 / 3.2), asphaltMat, false);
  asphalt.rotation.x = -Math.PI / 2; asphalt.position.y = 0.01; scene.add(asphalt);
  const chalk = asphaltTextures();
  const chalkMat = new THREE.MeshStandardMaterial({ map: chalk.map, transparent: true, depthWrite: false, roughness: 1 });
  const chalkPlane = mesh(new THREE.PlaneGeometry(AX * 2, AZ * 2), chalkMat, false);
  chalkPlane.rotation.x = -Math.PI / 2; chalkPlane.position.y = 0.014; scene.add(chalkPlane);
  const cracks = mesh(new THREE.PlaneGeometry(AX * 2, AZ * 2), new THREE.MeshStandardMaterial({ map: crackOverlay(1920, 1088), transparent: true, depthWrite: false, roughness: 1 }), false);
  cracks.rotation.x = -Math.PI / 2; cracks.position.y = 0.012; scene.add(cracks);
  for (const p of POTHOLES) {
    const t = potholeTextures();
    const pm = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, transparent: true, depthWrite: false, roughness: 0.95 });
    pm.normalScale = new THREE.Vector2(2, 2);
    const ph = mesh(new THREE.PlaneGeometry(p.r * 2.4, p.r * 2.4), pm, false);
    ph.rotation.x = -Math.PI / 2; ph.rotation.z = rr(0, Math.PI * 2); ph.position.set(p.x, 0.016, p.z); scene.add(ph);
  }
  // עשבים שצומחים מהסדקים ומהשוליים
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
  const GB = new Batch();
  const tuft = (x, z, s) => {
    for (let i = 0; i < 3; i++) GB.add(grassMat, new THREE.PlaneGeometry(0.4 * s, 0.35 * s), M4(x, 0.17 * s, z, 0, i * Math.PI / 3 + rr(0, 1), 0));
  };
  for (let i = 0; i < 90; i++) {
    const edge = rand() < 0.75;
    let x, z;
    if (edge) {
      if (rand() < 0.5) { x = rr(-AX, AX); z = (rand() < 0.5 ? -1 : 1) * (AZ - rr(0, 0.25)); }
      else { z = rr(-AZ, AZ); x = (rand() < 0.5 ? -1 : 1) * (AX - rr(0, 0.25)); }
    } else { x = rr(-AX, AX); z = rr(-AZ, AZ); if (Math.abs(x) < 11 && Math.abs(z) < 6) continue; }
    tuft(x, z, rr(0.6, 1.3));
  }
  for (const p of POTHOLES) for (let i = 0; i < 2; i++) { const a = rr(0, 6.28); tuft(p.x + Math.cos(a) * p.r * 1.1, p.z + Math.sin(a) * p.r * 1.1, rr(0.5, 0.9)); }
  GB.build(scene, { cast: false });

  const B = new Batch();
  // אבני שפה ישנות, אפורות, שבורות וחסרות
  const curb = (x, z, ry) => {
    if (rand() < 0.1) return; // חסרה
    const broken = rand() < 0.2;
    const len = broken ? rr(0.4, 0.7) : 0.97;
    B.add(M.curb, boxW(len, 0.15, 0.2, 1), M4(x + (broken ? rr(-0.2, 0.2) : 0) * Math.cos(ry), rr(0.03, 0.075), z, rr(-0.04, 0.04), ry + rr(-0.05, 0.05), rr(-0.05, 0.05)));
  };
  for (let x = -AX + 0.5; x < AX; x += 1) for (const s of [-1, 1]) curb(x, s * (AZ + 0.1), 0);
  for (let z = -AZ + 0.5; z < AZ; z += 1) for (const s of [-1, 1]) curb(s * (AX + 0.1), z, Math.PI / 2);
  for (const s of [-1, 1]) {
    B.add(M.stone, boxW(0.5, 1.0, BZ * 2 + 1.2, 1.6), M4(s * (BX + 0.25), 0.5, 0));
    B.add(M.concrete, boxW(0.62, 0.08, BZ * 2 + 1.3, 1), M4(s * (BX + 0.25), 1.04, 0));
  }
  B.build(scene);
  // גרפיטי על חומות האבן – פונה אל המגרש
  for (const s of [-1, 1]) {
    const ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    const xs = s * (BX - 0.01);
    const items = s < 0 ? [GRAFFITI[0], GRAFFITI[6], GRAFFITI[9]] : [GRAFFITI[1], GRAFFITI[4], GRAFFITI[10]];
    const zs = [-6.5, 0, 6.5];
    items.forEach((it, i) => graffiti(scene, it, rr(3.2, 4.2), xs, 0.52, zs[i] + rr(-0.8, 0.8), ry));
    sticker(scene, 0, xs - s * 0.005, 0.8, -3.2, ry, 0.5);
    sticker(scene, 3, xs - s * 0.005, 0.7, 3.4, ry, 0.45);
  }

  hedgeRow(scene, A, -BX, BX, -(BZ + 0.3));
  hedgeRow(scene, A, -BX, BX, BZ + 0.3);

  goal(scene, -FIELD.goalX, -1);
  goal(scene, FIELD.goalX, 1);

  building(scene, { x: -9.5, z: -19, w: 19, d: 10, floors: 4, sides: ['nx', 'px'], num: 12, street: 'הרצל', graffitiCount: 3 });
  building(scene, { x: 12, z: -20, w: 15, d: 10, floors: 3, sides: ['px', 'nx'], num: 14, street: 'הרצל', graffitiCount: 3 });
  building(scene, { x: -27.5, z: -1, w: 22, d: 10, floors: 4, rotY: Math.PI / 2, sides: ['px'], num: 8, street: "ז'בוטינסקי" });
  building(scene, { x: 27.5, z: -2, w: 20, d: 10, floors: 3, rotY: -Math.PI / 2, sides: ['nx'], num: 9, street: 'רמב"ם' });
  building(scene, { x: -25, z: -27, w: 13, d: 10, floors: 6, num: 3, street: 'העצמאות' });
  building(scene, { x: 28, z: -27, w: 15, d: 10, floors: 4, num: 5, street: 'העצמאות' });
  building(scene, { x: 0, z: -37, w: 26, d: 10, floors: 8, num: 21, street: 'בן גוריון' });

  const road = mesh(scaleUV(new THREE.PlaneGeometry(160, 6.5), 160 / 4, 6.5 / 4), pbrMaterial(A, 'worn_asphalt', { color: '#9a9c9f' }), false);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.006, 17.5); scene.add(road);
  const dashMat = new THREE.MeshStandardMaterial({ color: '#e9e4cf', roughness: 0.9 });
  for (let x = -70; x < 70; x += 4.5) {
    const dash = mesh(new THREE.PlaneGeometry(2.2, 0.14), dashMat, false);
    dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.012, 17.5); scene.add(dash);
  }
  car90(scene, -11, 15.4, 0, '#e8e3d3');
  car90(scene, -5.8, 15.4, 0, '#6b1d22');
  car90(scene, 6.5, 15.4, 0, '#2a4f7a');
  car90(scene, 15.8, 19.4, Math.PI, '#c9a94a');
  car90(scene, -22, 19.4, Math.PI, '#4b6b4a');
  placeModel(scene, A.models.covered_car, { maxDim: 4.2 }, 0.8, 15.5, Math.PI / 2);

  const trees = [
    tree(scene, 2.3, -13.6, 1.1), tree(scene, -19.4, 11.6, 1), tree(scene, 20.0, -12.0, 1.2),
    tree(scene, -20.2, -12.5, 0.95), tree(scene, 20.2, 8.4, 0.95), tree(scene, -21.3, 3.2, 0.8),
    tree(scene, 21.4, -4.5, 0.85), tree(scene, -12, -29, 1.3), tree(scene, 14, -30, 1.2),
    tree(scene, 34, 12, 1.2), tree(scene, -35, 13, 1.2), tree(scene, 9.5, 21.8, 1.1), tree(scene, -8, 22, 1.0),
  ];

  const clothes = [
    ...laundryPoles(scene, -14, -11.4, 4.5),
    ...laundryPoles(scene, 6.2, -11.5, 3.6),
  ];
  dumpster(scene, 14.3, -11.6, 0);
  dumpster(scene, -18.3, 7.4, Math.PI / 2);
  placeModel(scene, A.models.painted_wooden_bench, { maxDim: 1.8 }, 0, 11.4, Math.PI);
  placeModel(scene, A.models.painted_wooden_bench, { maxDim: 1.8 }, -18.5, -3.5, Math.PI / 2);
  placeModel(scene, A.models.street_lamp_01, { height: 5.5 }, -15, 12.3, 0);
  placeModel(scene, A.models.street_lamp_01, { height: 5.5 }, 10, 12.3, 0);
  placeModel(scene, A.models.plastic_monobloc_chair_01, { height: 0.82 }, 17.6, -6.8, -2.2);
  kiosk(scene, A, -23.5, 12.4, 0);
  shelter(scene, 18.7, 3.5, -Math.PI / 2);
  payphone(scene, -18.4, -7.5, Math.PI / 2);
  bike(scene, 3.4, 11.3, 0.2, '#b8262c');
  schoolbag(scene, -1.2, 10.9, 0.3, '#2c5fb0', false);
  schoolbag(scene, -0.4, 11.0, -0.4, '#c23a3a', true);
  schoolbag(scene, 15.2, -9.1, 1.2, '#2f7a45', true);
  streetSign(scene, -17.6, 13.4, 0, 'רח\' הרצל', 'شارع هرتسل', 'Herzl St.');
  streetSign(scene, 17.6, 13.4, 0, 'שד\' בן גוריון', 'جادة بن غوريون', "Ben Gurion Blvd.");
  streetSign(scene, -18.3, -12.4, Math.PI / 2, 'רח\' ז\'בוטינסקי', 'شارع جابوتنسكي', 'Jabotinsky St.');
  streetSign(scene, 18.4, -12.4, -Math.PI / 2, 'רח\' הרמב"ם', 'شارع الرمبام', 'HaRambam St.');
  bike(scene, 17.6, -9.2, 1.4, '#2c64b0');
  const cats = [
    cat(scene, -(BX + 0.25), 1.08, 3.5),
    cat(scene, 14.3, 1.52, -11.6, '#3a3a3a'),
  ];
  return { trees, clothes, cats };
}

export function animateWorld(w, t) {
  for (const c of w.clothes) { c.rotation.x = Math.sin(t * 2.0 + c.userData.phase) * 0.22 + 0.08; c.rotation.y = Math.sin(t * 1.3 + c.userData.phase) * 0.12; }
  for (const tr of w.trees) tr.rotation.z = Math.sin(t * 0.7 + tr.userData.sway) * 0.008;
  for (const k of w.cats) {
    k.tail.rotation.z = Math.sin(t * 2.5) * 0.5;
    k.head.rotation.y = Math.sin(t * 0.4) * 0.6;
  }
}
