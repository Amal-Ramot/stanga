// טקסטורות פרוצדורליות + מפות נורמל (תבליט) לריאליזם
import * as THREE from 'three';
import { FIELD } from './config.js';

let seed = 19731948;
export function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rr = (a, b) => a + (b - a) * rand();
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export const QUALITY = { tex: 1 };

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(w)); c.height = Math.max(4, Math.round(h));
  return c;
}

export function toTex(c, { repeat, color = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

export function canvasTex(w, h, draw, opts) {
  const c = mkCanvas(w, h);
  draw(c.getContext('2d'), c.width, c.height);
  return toTex(c, opts);
}

// מפת נורמל מתוך קנבס גובה (אפור)
export function normalFromHeight(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = mkCanvas(w, h);
  const og = out.getContext('2d');
  const img = og.createImageData(w, h);
  const d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255;
    d[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return toTex(out, { color: false });
}

function grain(g, w, h, n, colors, smin, smax, amin = 0.15, amax = 0.6) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = pick(colors);
    g.globalAlpha = rr(amin, amax);
    const s = rr(smin, smax);
    g.fillRect(rand() * w, rand() * h, s, s);
  }
  g.globalAlpha = 1;
}
function blotches(g, w, h, n, rgbList, rmin, rmax, amin, amax) {
  for (let i = 0; i < n; i++) {
    const x = rand() * w, y = rand() * h, r = rr(rmin, rmax);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${pick(rgbList)},${rr(amin, amax)})`);
    grd.addColorStop(1, `rgba(${pick(rgbList)},0)`);
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// ---------- אספלט עם קווי גיר ----------
function chalkLine(g, pts, width = 5) {
  for (let pass = 0; pass < 4; pass++) {
    g.strokeStyle = `rgba(240,240,228,${0.22 + 0.18 * rand()})`;
    g.lineWidth = width * rr(0.45, 1.1);
    g.lineCap = 'round';
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + rr(-1.2, 1.2), jy = y + rr(-1.2, 1.2);
      i ? g.lineTo(jx, jy) : g.moveTo(jx, jy);
    });
    g.stroke();
  }
}
function chalkPath(g, x0, y0, x1, y1, w) {
  const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 25));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  chalkLine(g, pts, w);
}

function crackPaths(W, H, n) {
  const paths = [];
  for (let i = 0; i < n; i++) {
    let x = rand() * W, y = rand() * H, a = rand() * Math.PI * 2;
    const pts = [[x, y]];
    const len = rr(15, 45);
    for (let k = 0; k < len; k++) {
      a += rr(-0.5, 0.5);
      x += Math.cos(a) * 9; y += Math.sin(a) * 9;
      pts.push([x, y]);
    }
    paths.push({ pts, w: rr(1, 2.6) });
  }
  return paths;
}

export function asphaltTextures() {
  const AX = FIELD.asphaltX, AZ = FIELD.asphaltZ;
  const PPM = 64 * QUALITY.tex;
  const W = Math.round(AX * 2 * PPM), H = Math.round(AZ * 2 * PPM);
  const toPx = (x, z) => [(x + AX) * PPM, (z + AZ) * PPM];
  const map = canvasTex(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    // קווי מגרש בגיר
    const S = PPM / 64;
    const [cx, cy] = toPx(0, 0);
    chalkPath(g, cx, toPx(0, -AZ + 0.6)[1], cx, toPx(0, AZ - 0.6)[1], 6 * S);
    const circ = [];
    for (let a = 0; a <= 48; a++) {
      const t = a / 48 * Math.PI * 2;
      circ.push([cx + Math.cos(t) * 1.6 * PPM, cy + Math.sin(t) * 1.6 * PPM]);
    }
    chalkLine(g, circ, 6 * S);
    for (const s of [-1, 1]) {
      const gx = FIELD.goalX * s;
      const [a0, b0] = toPx(gx, -FIELD.postZ - 2.2);
      const [a1, b1] = toPx(gx, FIELD.postZ + 2.2);
      chalkPath(g, a0, b0, a1, b1, 6 * S);
      const [p0x, p0y] = toPx(gx - s * 3, -FIELD.postZ - 1.4);
      const [p1x, p1y] = toPx(gx - s * 3, FIELD.postZ + 1.4);
      const [q0x, q0y] = toPx(gx, -FIELD.postZ - 1.4);
      const [q1x, q1y] = toPx(gx, FIELD.postZ + 1.4);
      chalkLine(g, [[q0x, q0y], [p0x, p0y], [p1x, p1y], [q1x, q1y]], 5 * S);
      const [px, py] = toPx(gx - s * 4.2, 0);
      g.fillStyle = 'rgba(240,240,230,0.7)';
      g.beginPath(); g.arc(px, py, 6 * S, 0, Math.PI * 2); g.fill();
    }
    // קלאס
    const hop = [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]];
    const hx = -11.5, hz = 6.6, sq = 0.6;
    g.font = `bold ${22 * S}px "Rubik", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    hop.forEach(([dx, dy], i) => {
      const x = hx + dy * sq, z = hz + dx * sq * 2;
      const [a, b] = toPx(x - sq / 2, z - sq / 2);
      const [c, d] = toPx(x + sq / 2, z + sq / 2);
      chalkLine(g, [[a, b], [c, b], [c, d], [a, d], [a, b]], 4 * S);
      g.fillStyle = 'rgba(250,225,120,0.7)';
      g.fillText(String(i + 1), (a + c) / 2, (b + d) / 2);
    });
    g.save();
    const [tx, ty] = toPx(8.5, 7.0);
    g.globalAlpha = 0.65;
    g.fillStyle = 'rgba(255,150,190,1)';
    g.font = `bold ${50 * S}px "Rubik", sans-serif`;
    g.direction = 'rtl'; g.fillText('סטנגה לנצח!', tx, ty);
    g.restore();
    const [sx, sy] = toPx(-7, -7.2);
    g.strokeStyle = 'rgba(255,220,90,0.55)'; g.lineWidth = 6 * S;
    g.beginPath(); g.arc(sx, sy, 40 * S, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 10; i++) {
      const t = i / 10 * Math.PI * 2;
      g.beginPath(); g.moveTo(sx + Math.cos(t) * 52 * S, sy + Math.sin(t) * 52 * S);
      g.lineTo(sx + Math.cos(t) * 75 * S, sy + Math.sin(t) * 75 * S); g.stroke();
    }
  }, { repeat: [1, 1] });
  return { map };
}

// ---------- בור באספלט ----------
export function potholeTextures() {
  const S = 256;
  const pts = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    pts.push([S / 2 + Math.cos(a) * rr(70, 112), S / 2 + Math.sin(a) * rr(60, 108)]);
  }
  const shape = (g, scale = 1) => {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const X = S / 2 + (x - S / 2) * scale, Y = S / 2 + (y - S / 2) * scale;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.closePath();
  };
  // גובה: בור עמוק, שוליים שבורים
  const hc = mkCanvas(S, S); const hg = hc.getContext('2d');
  hg.fillStyle = '#9a9a9a'; hg.fillRect(0, 0, S, S);
  hg.fillStyle = '#c8c8c8'; shape(hg, 1.12); hg.fill();
  hg.fillStyle = '#3a3a3a'; shape(hg, 1.0); hg.fill();
  hg.fillStyle = '#1a1a1a'; shape(hg, 0.75); hg.fill();
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(rr(20, 120));
    hg.fillStyle = `rgb(${v},${v},${v})`;
    hg.beginPath(); hg.arc(S / 2 + rr(-80, 80), S / 2 + rr(-75, 75), rr(1, 4), 0, Math.PI * 2); hg.fill();
  }
  const normalMap = normalFromHeight(hc, 5);
  const map = canvasTex(S, S, (g) => {
    g.clearRect(0, 0, S, S);
    // שוליים סדוקים ובהירים
    g.fillStyle = 'rgba(70,68,64,0.55)'; shape(g, 1.15); g.fill();
    g.fillStyle = '#2a2724'; shape(g, 1.0); g.fill();
    // חצץ ועפר בתחתית
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = pick(['#6b6359', '#4d473f', '#8a8172', '#3a352f', '#9b917f', '#5a4a38']);
      g.beginPath(); g.arc(S / 2 + rr(-85, 85), S / 2 + rr(-80, 80), rr(0.8, 3.5), 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = '#000'; shape(g, 1.16); g.fill();
    g.globalCompositeOperation = 'source-over';
    // שלולית קטנה לפעמים
    if (rand() < 0.4) {
      g.fillStyle = 'rgba(60,70,75,0.75)';
      g.beginPath(); g.ellipse(S / 2 + rr(-20, 20), S / 2 + rr(-20, 20), rr(25, 45), rr(18, 35), rr(0, 3), 0, Math.PI * 2); g.fill();
    }
  });
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.wrapS = normalMap.wrapT = THREE.ClampToEdgeWrapping;
  return { map, normalMap };
}

// סדקים וטלאים – שכבה שקופה על האספלט
export function crackOverlay(W, H) {
  return canvasTex(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    // טלאי אספלט ישנים
    for (let i = 0; i < 7; i++) {
      g.save(); g.translate(rand() * W, rand() * H); g.rotate(rr(-0.3, 0.3));
      const w = rr(90, 260), h = rr(70, 170);
      g.fillStyle = `rgba(${pick(['25,25,27', '45,44,42'])},${rr(0.15, 0.3)})`;
      g.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; g.lineTo(Math.cos(a) * w / 2 * rr(0.75, 1), Math.sin(a) * h / 2 * rr(0.75, 1)); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(10,10,10,0.35)'; g.lineWidth = 1.5; g.stroke();
      g.restore();
    }
    // סדקים מתפצלים
    const crack = (x, y, a, len, w, depth) => {
      g.lineWidth = w; g.strokeStyle = 'rgba(30,28,26,0.55)';
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < len; k++) {
        a += rr(-0.45, 0.45); x += Math.cos(a) * 7; y += Math.sin(a) * 7;
        g.lineTo(x, y);
        if (depth < 2 && rand() < 0.06) { g.stroke(); crack(x, y, a + rr(-1.2, 1.2), len * 0.5, w * 0.6, depth + 1); g.beginPath(); g.moveTo(x, y); }
      }
      g.stroke();
    };
    for (let i = 0; i < 20; i++) crack(rand() * W, rand() * H, rand() * Math.PI * 2, rr(15, 55), rr(1.2, 2.4), 0);
    // רשת סדקי "עור תנין"
    for (let k = 0; k < 4; k++) {
      const cx = rand() * W, cy = rand() * H;
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = 'rgba(15,14,12,0.6)'; g.lineWidth = 1.2;
        const x = cx + rr(-70, 70), y = cy + rr(-50, 50);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-18, 18), y + rr(-18, 18)); g.stroke();
      }
    }
    // חול שנערם בשוליים
    for (let i = 0; i < 2500; i++) {
      const side = Math.floor(rand() * 4);
      const d = Math.pow(rand(), 2.5) * 70;
      const x = side < 2 ? rand() * W : side === 2 ? d : W - d;
      const y = side >= 2 ? rand() * H : side === 0 ? d : H - d;
      g.fillStyle = `rgba(${pick(['170,150,115', '150,130,100', '120,105,80'])},${rr(0.2, 0.5)})`;
      g.fillRect(x, y, rr(1, 4), rr(1, 4));
    }
  });
}

export function grassTexture() {
  return canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) {
      const x = rr(20, 108);
      g.strokeStyle = pick(['#6f7d3a', '#8a8f45', '#566b2c', '#a39a55', '#7a8a3c']);
      g.lineWidth = rr(1.2, 2.6);
      g.beginPath(); g.moveTo(x, 128);
      g.quadraticCurveTo(x + rr(-12, 12), rr(60, 100), x + rr(-25, 25), rr(10, 70));
      g.stroke();
    }
  });
}

// ---------- טיח שפריץ ----------
export function plasterTextures(base) {
  const S = 512;
  const hc = mkCanvas(S, S);
  const hg = hc.getContext('2d');
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {
    const v = Math.floor(rr(90, 230));
    hg.fillStyle = `rgb(${v},${v},${v})`;
    hg.globalAlpha = rr(0.3, 0.9);
    hg.beginPath(); hg.arc(rand() * S, rand() * S, rr(0.5, 2.4), 0, Math.PI * 2); hg.fill();
  }
  hg.globalAlpha = 1;
  const normalMap = normalFromHeight(hc, 2.6);
  const map = canvasTex(S, S, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    g.globalAlpha = 0.35; g.drawImage(hc, 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
    blotches(g, S, S, 18, ['120,110,90', '255,255,250', '140,130,110'], 30, 120, 0.05, 0.14);
  });
  return { map, normalMap };
}

// כתמי לחות/חלודה – שכבה שקופה
export function streakTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const x = rr(8, w - 8), len = rr(h * 0.4, h);
      const grd = g.createLinearGradient(0, 0, 0, len);
      grd.addColorStop(0, 'rgba(70,55,35,0.55)');
      grd.addColorStop(1, 'rgba(70,55,35,0)');
      g.fillStyle = grd; g.fillRect(x, 0, rr(2, 7), len);
    }
  });
}

// תריס גלילה
export function shutterTextures(color) {
  const hc = mkCanvas(64, 256);
  const hg = hc.getContext('2d');
  for (let y = 0; y < 256; y += 8) {
    const grd = hg.createLinearGradient(0, y, 0, y + 8);
    grd.addColorStop(0, '#303030'); grd.addColorStop(0.3, '#d0d0d0'); grd.addColorStop(0.9, '#909090'); grd.addColorStop(1, '#202020');
    hg.fillStyle = grd; hg.fillRect(0, y, 64, 8);
  }
  const normalMap = normalFromHeight(hc, 2.5);
  const map = canvasTex(64, 256, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.45; g.drawImage(hc, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    blotches(g, 64, 256, 4, ['90,80,60'], 10, 40, 0.1, 0.25);
  });
  return { map, normalMap };
}

// בלוק מחורר (שקוף בחורים)
export function perforatedTexture(base) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    grain(g, 128, 128, 800, ['#bbb3a0', '#f5f0e6'], 0.5, 2);
    g.globalCompositeOperation = 'destination-out';
    for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) {
      g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  });
}

// מרצפות מדרכה
export function paverTextures() {
  const S = 256, n = 4, s = S / n;
  const hc = mkCanvas(S, S); const hg = hc.getContext('2d');
  hg.fillStyle = '#202020'; hg.fillRect(0, 0, S, S);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    hg.fillStyle = `rgb(${rr(170, 200)},${rr(170, 200)},${rr(170, 200)})`;
    hg.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
  }
  grain(hg, S, S, 4000, ['#999', '#ddd'], 0.5, 2);
  const normalMap = normalFromHeight(hc, 4);
  const map = canvasTex(S, S, (g) => {
    g.fillStyle = '#7d776c'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = pick(['#c5bfb2', '#bab3a4', '#cbc5b8', '#b0a999', '#a49b8a']);
      g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    }
    grain(g, S, S, 6000, ['#8f897d', '#ddd6c8', '#6d675d'], 0.5, 2.2);
    blotches(g, S, S, 6, ['70,65,55'], 10, 50, 0.08, 0.2);
  });
  return { map, normalMap };
}

// אבן ירושלמית
export function stoneTextures() {
  const W = 512, H = 256;
  const rows = 4, rh = H / rows;
  const blocks = [];
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rr(20, 60) : 0;
    while (x < W) { const bw = rr(70, 130); blocks.push([x, r * rh, bw, rh]); x += bw; }
  }
  const hc = mkCanvas(W, H); const hg = hc.getContext('2d');
  hg.fillStyle = '#303030'; hg.fillRect(0, 0, W, H);
  for (const [x, y, w, h] of blocks) {
    const grd = hg.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 0.7);
    grd.addColorStop(0, '#e0e0e0'); grd.addColorStop(1, '#8a8a8a');
    hg.fillStyle = grd; hg.fillRect(x + 3, y + 3, w - 6, h - 6);
  }
  grain(hg, W, H, 12000, ['#777', '#ccc'], 0.6, 3);
  const normalMap = normalFromHeight(hc, 3.5);
  const map = canvasTex(W, H, (g) => {
    g.fillStyle = '#9a8f78'; g.fillRect(0, 0, W, H);
    for (const [x, y, w, h] of blocks) {
      g.fillStyle = pick(['#dccca6', '#d4c39c', '#e3d5b3', '#cdbb93', '#d9c7a0']);
      g.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
    grain(g, W, H, 14000, ['#b8a882', '#efe4c8', '#a8987a'], 0.6, 2.5);
  });
  return { map, normalMap };
}

// אדמה ועשב יבש
export function groundTextures() {
  const S = 512;
  const hc = mkCanvas(S, S); const hg = hc.getContext('2d');
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  grain(hg, S, S, 30000, ['#555', '#aaa', '#ccc'], 0.6, 3, 0.3, 0.8);
  const normalMap = normalFromHeight(hc, 2);
  const map = canvasTex(S, S, (g) => {
    g.fillStyle = '#8b7a5a'; g.fillRect(0, 0, S, S);
    blotches(g, S, S, 30, ['110,125,60', '95,110,55', '150,130,95', '120,105,75'], 30, 110, 0.3, 0.6);
    grain(g, S, S, 40000, ['#7a6a4c', '#9c8b6a', '#6f8a4a', '#5f7a3e', '#a69676', '#b0a070'], 0.5, 2.5);
    g.strokeStyle = 'rgba(90,110,50,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 2500; i++) {
      const x = rand() * S, y = rand() * S;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-3, 3), y - rr(3, 8)); g.stroke();
    }
  });
  return { map, normalMap };
}

// אשכול עלים לעצים (שקוף)
export function leafTexture(palette) {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 108;
      const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
      g.save(); g.translate(x, y); g.rotate(rand() * Math.PI * 2);
      const c = pick(palette);
      g.fillStyle = c;
      g.beginPath(); g.ellipse(0, 0, rr(6, 11), rr(3, 5.5), 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke();
      g.restore();
    }
  });
}

export function grilleTexture() {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#e4e3de'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#9b9a95';
    for (let y = 8; y < 60; y += 5) g.fillRect(6, y, 52, 2);
    g.fillStyle = 'rgba(120,100,70,0.25)'; g.fillRect(0, 50, 64, 14);
  });
}

export function signTex(text, bg, fg, w = 512, h = 128, font = 70) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = `bold ${font}px "Rubik", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
    blotches(g, w, h, 6, ['90,80,60'], 10, 60, 0.08, 0.2);
  });
}

// שלט רחוב ישראלי (עברית/ערבית/אנגלית)
export function streetSignTexture(he, ar, en) {
  return canvasTex(512, 200, (g, w, h) => {
    g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d4e9e'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#1d4e9e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = 'rtl';
    g.font = '900 72px "Rubik", sans-serif'; g.fillText(he, w / 2, 72);
    g.font = '600 34px sans-serif'; g.fillText(ar, w / 2, 128);
    g.direction = 'ltr';
    g.font = '700 30px sans-serif'; g.fillText(en, w / 2, 168);
    blotches(g, w, h, 8, ['110,100,80'], 15, 70, 0.08, 0.22);
  });
}

// מספר בית כחול מואר עם שם הרחוב
export function houseNumberTexture(num, street) {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#1f57a3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8eef8'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.font = '900 96px "Rubik", sans-serif'; g.fillText(String(num), w / 2, 82);
    g.font = '700 34px "Rubik", sans-serif'; g.fillText(street, w / 2, 156);
    blotches(g, w, h, 4, ['20,20,30'], 10, 40, 0.1, 0.2);
  });
}

// גרפיטי בספריי – שקוף, עם ריסוס ונזילות
export function graffitiTexture(text, color, { font = 'Rubik', size = 80, outline = null, drips = true } = {}) {
  const tmp = mkCanvas(10, 10).getContext('2d');
  tmp.font = `900 ${size}px "${font}", sans-serif`;
  const tw = tmp.measureText(text).width;
  const W = Math.ceil(tw + size * 0.8), H = Math.ceil(size * 1.9);
  const c = mkCanvas(W, H);
  const g = c.getContext('2d');
  g.font = `900 ${size}px "${font}", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.direction = 'rtl';
  const cx = W / 2, cy = size * 0.75;
  g.save();
  g.translate(cx, cy); g.rotate(rr(-0.05, 0.05)); g.translate(-cx, -cy);
  if (outline) {
    g.lineJoin = 'round'; g.strokeStyle = outline; g.lineWidth = size * 0.12;
    g.shadowColor = outline; g.shadowBlur = size * 0.08;
    g.strokeText(text, cx, cy);
  }
  g.shadowColor = color; g.shadowBlur = size * 0.12;
  g.fillStyle = color; g.globalAlpha = 0.9;
  g.fillText(text, cx, cy);
  g.shadowBlur = 0;
  g.restore();
  // ריסוס מסביב
  g.fillStyle = color;
  for (let i = 0; i < W * 0.8; i++) {
    g.globalAlpha = rr(0.05, 0.35);
    g.fillRect(rr(size * 0.2, W - size * 0.2), cy + rr(-size * 0.6, size * 0.6), 1.4, 1.4);
  }
  // נזילות צבע
  if (drips) {
    g.globalAlpha = 0.8;
    g.strokeStyle = color; g.lineCap = 'round';
    for (let i = 0; i < Math.max(3, text.length * 0.7); i++) {
      const x = rr(size * 0.4, W - size * 0.4), y0 = cy + size * rr(0.15, 0.35);
      const len = rr(size * 0.15, size * 0.8);
      g.lineWidth = rr(1.5, 3.5);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + rr(-1, 1), y0 + len); g.stroke();
      g.beginPath(); g.arc(x, y0 + len, g.lineWidth * 0.8, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalAlpha = 1;
  const t = toTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.userData = { aspect: W / H };
  return t;
}

// סטיקר "העם עם הגולן" וכו'
export function stickerTexture(text, bg, fg) {
  if (text.startsWith('נ נח')) return nanachTexture();
  const t = canvasTex(256, 80, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = '900 40px "Rubik", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText(text, w / 2, h / 2 + 2);
    blotches(g, w, h, 5, ['120,110,90'], 10, 40, 0.1, 0.3);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rr(0, w), rand() < 0.5 ? 0 : h, rr(5, 14), 0, Math.PI * 2); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// מדבקת "נ נח נחמ נחמן מאומן" המקורית – בצורת מדרגות
export function nanachTexture() {
  const t = canvasTex(256, 80, (g, w, h) => {
    g.fillStyle = '#f1d23a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d3c8c'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#1d3c8c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    const lines = ['נ', 'נח', 'נחמ', 'נחמן', 'מאומן'];
    lines.forEach((l, i) => { g.font = `900 ${i === 4 ? 17 : 13}px "Rubik", sans-serif`; g.fillText(l, w / 2, 10 + i * 14.5); });
    blotches(g, w, h, 4, ['120,110,90'], 8, 30, 0.08, 0.2);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// כל הגרפיטי של השכונה
export const GRAFFITI = [
  { t: 'נ נח נחמ נחמן מאומן', c: '#f2d22e', o: '#1b3f8f' },
  { t: 'נ נח נחמ נחמן מאומן', c: '#2a63c9', o: null },
  { t: 'משיח! משיח! משיח!', c: '#1a4fb5', o: '#f0d33a' },
  { t: 'שלום חבר', c: '#222222', o: null },
  { t: 'מכבי אלופה', c: '#e6c51d', o: '#1d4f9c' },
  { t: 'הפועל!!', c: '#c4232c', o: null },
  { t: 'בית"ר ירושלים', c: '#e3c62a', o: '#111' },
  { t: 'אין ייאוש בעולם כלל', c: '#2b5fb8', o: null },
  { t: 'יוסי + מיכל', c: '#d43a8a', o: null },
  { t: 'אני אוהב את גלית', c: '#1f7a5a', o: null },
  { t: 'שכונה ג\' אימפריה', c: '#7a2bb0', o: '#fff' },
  { t: 'אסור לעשות פיפי פה!!', c: '#a32020', o: null },
];
export const STICKERS = [
  ['העם עם הגולן', '#f4d02a', '#1a1a1a'],
  ['שלום חבר', '#ffffff', '#1d3f8a'],
  ['נ נח נחמ נחמן מאומן', '#f1d23a', '#1d3c8c'],
  ['משיח', '#f6d433', '#1c3d8c'],
];

export function ballTexture() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#1c1c1c';
    const spots = [[0, 128], [128, 128], [256, 128], [384, 128], [64, 40], [192, 40], [320, 40], [448, 40], [64, 216], [192, 216], [320, 216], [448, 216]];
    for (const [x, y] of spots) {
      const sx = (y < 60 || y > 200) ? 1.9 : 1;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 - Math.PI / 2;
        g.lineTo(x + Math.cos(a) * 26 * sx, y + Math.sin(a) * 26);
      }
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(110,90,60,0.25)';
    for (let i = 0; i < 300; i++) g.fillRect(rand() * 512, rand() * 256, rr(1, 4), rr(1, 4));
  });
}
