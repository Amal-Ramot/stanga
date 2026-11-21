// צלילים מסונתזים (בלי קבצים)
let ctx = null;
let master = null;
export let muted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}

const noiseCache = new Map();
function noiseBuffer(dur) {
  const key = Math.round(dur * 1000);
  if (noiseCache.has(key) && noiseCache.get(key).sampleRate === ctx.sampleRate) return noiseCache.get(key);
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseCache.set(key, b);
  return b;
}

export function sfxKick(power = 0.6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
  g.gain.setValueAtTime(0.5 + power * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.06);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.4 * power + 0.1, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  n.connect(f).connect(ng).connect(master); n.start(t);
}

export function sfxBounce(v) {
  if (!ctx || v < 1.2) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
  g.gain.setValueAtTime(Math.min(0.35, v * 0.04), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.12);
}

export function sfxClang() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, a] of [[523, 0.25], [1187, 0.15], [1870, 0.1], [2630, 0.06]]) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(g).connect(master); o.start(t); o.stop(t + 1.3);
  }
}

export function sfxWhistle(len = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  const lfo = ctx.createOscillator(); const lg = ctx.createGain();
  o.frequency.value = 2900; lfo.frequency.value = 30; lg.gain.value = 120;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.02);
  g.gain.setValueAtTime(0.15, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.05);
  o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + len + 0.1); lfo.stop(t + len + 0.1);
}

export function sfxCheer(big = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
    const dur = big ? 2.4 : 1.4;
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(big ? 0.45 : 0.28, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(f).connect(g).connect(master); n.start(t);
  // "יש!!" – צפצוף שמח
  [660, 880, 1320].forEach((fr, i) => {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = 'square'; o.frequency.value = fr;
    og.gain.setValueAtTime(0.05, t + i * 0.1); og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);
    o.connect(og).connect(master); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.2);
  });
}

export function sfxBuzz() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 140;
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
}

// ---------- אווירת שכונה: מכוניות, ציפורים, כלב, ורדיו מהמרפסת ----------
let amb = null;
export function startAmbience() {
  if (!ctx || amb) return;
  amb = { bus: ctx.createGain(), music: ctx.createGain(), timers: [] };
  amb.bus.gain.value = 0.55; amb.bus.connect(master);
  // מוזיקה – "רדיו מהמרפסת": מסונן ורחוק
  const radioLP = ctx.createBiquadFilter(); radioLP.type = 'lowpass'; radioLP.frequency.value = 2600;
  const radioHP = ctx.createBiquadFilter(); radioHP.type = 'highpass'; radioHP.frequency.value = 180;
  amb.music.gain.value = 0.22;
  amb.music.connect(radioHP).connect(radioLP).connect(master);
  // רעש רקע עירוני
  const hum = ctx.createBufferSource(); hum.buffer = noiseBuffer(4); hum.loop = true;
  const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 300;
  const hg = ctx.createGain(); hg.gain.value = 0.05;
  hum.connect(hf).connect(hg).connect(amb.bus); hum.start();
  const loop = (fn, min, max) => {
    const tick = () => { fn(); amb.timers.push(setTimeout(tick, (min + Math.random() * (max - min)) * 1000)); };
    amb.timers.push(setTimeout(tick, (min * 0.3 + Math.random() * min) * 1000));
  };
  loop(carPass, 6, 16);
  loop(birds, 3, 8);
  loop(() => { if (Math.random() < 0.5) dogBark(); }, 18, 40);
  loop(() => { if (Math.random() < 0.6) honk(); }, 20, 45);
  startMusic();
}
export function setMusic(on) { if (amb) amb.music.gain.value = on ? 0.22 : 0; }

function pan(node, p) {
  if (!ctx.createStereoPanner) return node;
  const sp = ctx.createStereoPanner(); sp.pan.value = p; node.connect(sp); return sp;
}

function carPass() {
  const t = ctx.currentTime, dur = 3.5 + Math.random() * 2;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const motor = ctx.createOscillator(); motor.type = 'sawtooth';
  const base = 45 + Math.random() * 30;
  motor.frequency.setValueAtTime(base * 1.08, t); motor.frequency.linearRampToValueAtTime(base * 0.92, t + dur);
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  motor.connect(lp); n.connect(lp); lp.connect(g);
  if (sp) { sp.pan.setValueAtTime(-dir, t); sp.pan.linearRampToValueAtTime(dir, t + dur); g.connect(sp).connect(amb.bus); } else g.connect(amb.bus);
  motor.start(t); n.start(t); motor.stop(t + dur); n.stop(t + dur);
}

function honk() {
  const t = ctx.currentTime;
  for (const [st, len] of [[0, 0.18], [0.25, 0.4]]) {
    for (const f of [392, 494]) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.025, t + st); g.gain.setValueAtTime(0.025, t + st + len); g.gain.linearRampToValueAtTime(0, t + st + len + 0.03);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
      o.connect(lp).connect(g); pan(g, Math.random() * 1.6 - 0.8).connect(amb.bus);
      o.start(t + st); o.stop(t + st + len + 0.05);
    }
  }
}

function birds() {
  const t0 = ctx.currentTime, n = 2 + Math.floor(Math.random() * 5), p = Math.random() * 1.6 - 0.8;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * (0.09 + Math.random() * 0.1);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    const f = 3200 + Math.random() * 1800;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (0.6 + Math.random() * 0.3), t + 0.07);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); pan(g, p).connect(amb.bus); o.start(t); o.stop(t + 0.1);
  }
}

function dogBark() {
  const t0 = ctx.currentTime, p = Math.random() * 1.6 - 0.8;
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    const t = t0 + i * 0.32;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.18);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    n.connect(bp).connect(g); o.connect(bp); pan(g, p).connect(amb.bus);
    n.start(t); o.start(t); o.stop(t + 0.18);
  }
}

// מוזיקה מקורית בסגנון מזרחי-קצבי של שנות ה-90:
// סולו "קלידים מזרחיים" רציף עם סלסולים (גלישות, סיבובים, טרילים, ויברטו),
// דרבוקה מהירה, מחיאות כפיים, טמבורין, ובס+קלידים באום-פה
const HZ = (m) => 440 * Math.pow(2, (m - 69) / 12);
// חיג'אז על רה – דרגות סולם (0 = D4)
const SCALE = [57, 58, 60, 62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79];
const DEG0 = 3; // אינדקס של D4
const deg = (d) => SCALE[Math.max(0, Math.min(SCALE.length - 1, d + DEG0))];
const N = { D3: 50, A2: 45, G2: 43, C3: 48, Bb2: 46, Eb3: 51 };

// [דרגה, אורך בשש-עשריות, קישוט] — s=סלסול, t=טריל, g=גלישה. כל משפט = 32
const P1 = [[4, 2, 'g'], [5, 2], [4, 2], [3, 2, 's'], [4, 4, 't'], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2, 's'], [5, 2], [4, 8, 't']];
const P2 = [[7, 2, 'g'], [6, 1], [7, 1], [6, 2], [5, 2, 's'], [4, 2], [5, 2], [4, 2], [3, 2], [2, 4, 't'], [3, 2], [2, 2], [1, 2, 's'], [0, 6]];
const P3 = [[7, 4, 'g'], [8, 2, 's'], [7, 2], [6, 2], [7, 2], [8, 2], [9, 2, 's'], [10, 6, 't'], [9, 2], [8, 2], [7, 6, 'g']];
const P4 = [[6, 2], [7, 2], [6, 2], [5, 2, 's'], [4, 4, 't'], [5, 2], [4, 2], [3, 2], [2, 2, 's'], [1, 2], [2, 2], [0, 8, 't']];
const SONG = [P1, P2, P1, P2, P3, P4, P3, P4];
const CH = {
  D: { bass: 'D3', notes: [62, 66, 69] }, Cm: { bass: 'C3', notes: [60, 63, 67] },
  Gm: { bass: 'G2', notes: [62, 67, 70] }, Eb: { bass: 'Eb3', notes: [63, 67, 70] }, Bb: { bass: 'Bb2', notes: [62, 65, 70] },
};
const HARM = { P1: ['D', 'D', 'Gm', 'D'], P2: ['Cm', 'Bb', 'D', 'D'], P3: ['D', 'Cm', 'D', 'D'], P4: ['Cm', 'D', 'Gm', 'D'] };
const HKEY = new Map([[P1, 'P1'], [P2, 'P2'], [P3, 'P3'], [P4, 'P4']]);
// דרבוקה מהירה בתיבה (16): D=דום T=טק k=קה
const RHY = ['D', '', 'k', 'T', '', 'k', 'D', '', 'D', '', 'k', 'T', '', 'k', 'T', 'k'];

function startMusic(ahead = 0.5) {
  const bpm = 126, s16 = 60 / bpm / 4;
  let step = 0;
  let next = ctx.currentTime + 0.25;
  const PH = 32, LOOP = SONG.length * PH;
  const INTRO = 32; // שתי תיבות של כלי הקשה לפני הסולו
  const sched = () => {
    while (next < ctx.currentTime + ahead) {
      const t = next;
      const bar16 = step % 16;
      const songStep = step - INTRO;
      // כלי הקשה
      const hit = RHY[bar16];
      const fill = (step % 64) >= 60;
      if (hit) darbuka(t, fill && hit === 'k' ? 'T' : hit, fill);
      if (fill) darbuka(t + s16 / 2, 'k', false);
      riq(t, bar16 % 2 === 0 ? 0.03 : 0.014);
      if (bar16 === 4 || bar16 === 12) clap(t);
      // הרמוניה
      const phrase = SONG[Math.floor(Math.max(0, songStep) / PH) % SONG.length];
      const chord = CH[HARM[HKEY.get(phrase)][Math.floor(((Math.max(0, songStep)) % PH) / 8)]];
      if (bar16 === 0 || bar16 === 8) pluck(t, HZ(N[chord.bass]), s16 * 1.8, 0.13, 'bass');
      if (bar16 === 6 || bar16 === 14) pluck(t, HZ(N[chord.bass] + 7), s16 * 1.4, 0.09, 'bass');
      if (bar16 % 4 === 2) for (const n of chord.notes) organ(t, HZ(n), s16 * 1.3, 0.017);
      // סולו – מתחיל בכל תחילת משפט
      if (songStep >= 0 && songStep % PH === 0) leadPhrase(t, phrase, s16);
      step++;
      next += s16;
    }
    if (ahead <= 1) amb.timers.push(setTimeout(sched, 120));
  };
  sched();
}

// קול סולו רציף אחד למשפט – כך שהתווים גולשים זה לזה כמו זמר/קלידן מזרחי
function leadPhrase(t0, phrase, s16) {
  const total = phrase.reduce((a, n) => a + n[1], 0) * s16;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const o2 = ctx.createOscillator(); o2.type = 'square';
  const vib = ctx.createOscillator(); vib.frequency.value = 6.2;
  const vibG = ctx.createGain(); vibG.gain.value = 0;
  vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 2;
  const g2 = ctx.createGain(); g2.gain.value = 0.35;
  const g = ctx.createGain(); g.gain.value = 0;
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(amb.music);
  const F = o.frequency, F2 = o2.frequency;
  const setF = (f, at, tc = 0.012) => { F.setTargetAtTime(f, at, tc); F2.setTargetAtTime(f * 0.5, at, tc); };
  const vol = 0.075;
  let t = t0;
  F.setValueAtTime(HZ(deg(phrase[0][0])), t0); F2.setValueAtTime(HZ(deg(phrase[0][0])) * 0.5, t0);
  for (const [d, len, orn] of phrase) {
    const dur = len * s16;
    const f = HZ(deg(d)), up = HZ(deg(d + 1)), down = HZ(deg(d - 1));
    // התקפה קלה לכל תו
    g.gain.setTargetAtTime(vol * 0.55, t, 0.004);
    g.gain.setTargetAtTime(vol, t + 0.012, 0.01);
    vibG.gain.setTargetAtTime(0, t, 0.01);
    if (orn === 'g') {
      // גלישה מלמטה אל התו
      F.setValueAtTime(down, t); F2.setValueAtTime(down * 0.5, t);
      setF(f, t + 0.01, 0.03);
    } else if (orn === 's') {
      // סלסול: תו → מעל → תו → מתחת → תו
      const q = Math.min(dur / 5, 0.055);
      setF(f, t, 0.006); setF(up, t + q, 0.006); setF(f, t + 2 * q, 0.006); setF(down, t + 3 * q, 0.006); setF(f, t + 4 * q, 0.008);
    } else if (orn === 't') {
      // טריל מהיר עם התו שמעל, ואז החזקה עם ויברטו
      setF(f, t, 0.01);
      const end = t + dur * 0.45;
      let k = 0;
      for (let tt = t + 0.04; tt < end; tt += 0.042, k++) setF(k % 2 ? f : up, tt, 0.005);
      setF(f, end, 0.01);
    } else {
      setF(f, t, 0.012);
    }
    // ויברטו מתגבר בתווים ארוכים
    if (len >= 4) { vibG.gain.setTargetAtTime(f * 0.022, t + dur * 0.4, dur * 0.2); }
    else if (len >= 2) { vibG.gain.setTargetAtTime(f * 0.008, t + dur * 0.5, 0.05); }
    t += dur;
  }
  g.gain.setTargetAtTime(0, t0 + total - 0.04, 0.03);
  for (const x of [o, o2, vib]) { x.start(t0); x.stop(t0 + total + 0.2); }
}

// ---------- צעקות וסלנג של השכונה – סינתזת פורמנטים ----------
// פונמה: F = שלושה פורמנטים, v = קוליות, n = רעש (נשיפה/שריקה), a = עוצמה
const PH = {
  a: { F: [800, 1250, 2600], v: 1, n: 0.2, a: 1 }, e: { F: [550, 1850, 2550], v: 1, n: 0.2, a: 1 },
  i: { F: [300, 2250, 2950], v: 1, n: 0.2, a: 0.8 }, o: { F: [520, 900, 2450], v: 1, n: 0.2, a: 1 },
  y: { F: [290, 2200, 2900], v: 1, n: 0.1, a: 0.5 }, l: { F: [380, 1000, 2500], v: 1, n: 0.1, a: 0.5 },
  w: { F: [320, 720, 2300], v: 1, n: 0.1, a: 0.55 }, n: { F: [280, 1100, 2500], v: 1, n: 0, a: 0.45 },
  r: { F: [600, 1300, 2600], v: 0.6, n: 0.9, a: 0.5 }, b: { F: [300, 900, 2300], v: 0.4, n: 0, a: 0.06 },
  p: { F: [300, 900, 2300], v: 0, n: 0.6, a: 0.04 }, k: { F: [1500, 2200, 3000], v: 0, n: 1, a: 0.05 },
  h: { F: [550, 1850, 2550], v: 0, n: 1.4, a: 0.18 }, x: { F: [1300, 2300, 3300], v: 0, n: 1.6, a: 0.35 },
  s: { F: [4800, 6400, 8200], v: 0, n: 1.8, a: 0.35 },
};
const WORDS = {
  yalla: { f0: [240, 300, 210], seg: [['y', 0.05], ['a', 0.11], ['l', 0.045], ['a', 0.24]] },
  aywa: { f0: [260, 310, 200], seg: [['a', 0.1], ['y', 0.07], ['w', 0.06], ['a', 0.26]] },
  hey: { f0: [280, 330, 250], seg: [['h', 0.05], ['e', 0.2]] },
  opa: { f0: [250, 290, 220], seg: [['o', 0.1], ['p', 0.04], ['a', 0.2]] },
  sababa: { f0: [230, 280, 200], seg: [['s', 0.09], ['a', 0.08], ['b', 0.035], ['a', 0.08], ['b', 0.035], ['a', 0.22]] },
  achi: { f0: [250, 300, 230], seg: [['a', 0.12], ['x', 0.09], ['i', 0.22]] },
  walla: { f0: [220, 290, 190], seg: [['w', 0.06], ['a', 0.13], ['l', 0.05], ['a', 0.25]] },
  kapara: { f0: [240, 290, 210], seg: [['k', 0.04], ['a', 0.09], ['p', 0.04], ['a', 0.08], ['r', 0.05], ['a', 0.22]] },
  achla: { f0: [240, 300, 200], seg: [['a', 0.11], ['x', 0.08], ['l', 0.045], ['a', 0.24]] },
  habibi: { f0: [250, 300, 220], seg: [['h', 0.05], ['a', 0.09], ['b', 0.035], ['i', 0.08], ['b', 0.035], ['i', 0.22]] },
};
export const SLANG = ['sababa', 'achi', 'walla', 'kapara', 'achla', 'habibi', 'yalla', 'aywa'];
export function shout(t, word, crowd = 3, dest, pitch = 1) {
  if (!ctx) return;
  t = t ?? ctx.currentTime + 0.02;
  const w = WORDS[word]; if (!w) return;
  const out = dest || master;
  const total = w.seg.reduce((a, s) => a + s[1], 0);
  for (let v = 0; v < crowd; v++) {
    const tv = t + v * 0.018 + Math.random() * 0.02;
    const pm = pitch * (1 + (v - 1) * 0.06 + (Math.random() - 0.5) * 0.04);
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(w.f0[0] * pm, tv);
    src.frequency.linearRampToValueAtTime(w.f0[1] * pm, tv + total * 0.35);
    src.frequency.linearRampToValueAtTime(w.f0[2] * pm, tv + total);
    const vg = ctx.createGain(); vg.gain.value = 1;
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(total + 0.15);
    const ng = ctx.createGain(); ng.gain.value = 0.2;
    src.connect(vg); noise.connect(ng);
    const env = ctx.createGain(); env.gain.setValueAtTime(0, tv);
    const fs = [0, 1, 2].map((k) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [6, 9, 11][k];
      const g = ctx.createGain(); g.gain.value = [1, 0.6, 0.35][k];
      vg.connect(f); ng.connect(f); f.connect(g).connect(env);
      return f;
    });
    let tt = tv;
    for (const [ph, dur] of w.seg) {
      const P = PH[ph];
      fs.forEach((f, k) => f.frequency.setTargetAtTime(P.F[k] * (1 + (pm - 1) * 0.5), tt, 0.012));
      env.gain.setTargetAtTime(P.a, tt, 0.01);
      vg.gain.setTargetAtTime(P.v, tt, 0.008);
      ng.gain.setTargetAtTime(P.n, tt, 0.008);
      tt += dur;
    }
    env.gain.setTargetAtTime(0, tt - 0.04, 0.035);
    const mix = ctx.createGain(); mix.gain.value = 0.55 / crowd;
    env.connect(mix).connect(out);
    src.start(tv); noise.start(tv); src.stop(tt + 0.2); noise.stop(tt + 0.2);
  }
}

function clap(t) {
  for (const dt of [0, 0.012, 0.024]) {
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.08);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(dt === 0.024 ? 0.12 : 0.06, t + dt); g.gain.exponentialRampToValueAtTime(0.001, t + dt + (dt === 0.024 ? 0.12 : 0.02));
    n.connect(bp).connect(g).connect(amb.music); n.start(t + dt);
  }
}

// רינדור תצוגה מקדימה של המוזיקה (לבדיקה)
export async function renderMusicPreview(seconds = 20) {
  const off = new OfflineAudioContext(2, 44100 * seconds, 44100);
  const saved = [ctx, master, amb];
  ctx = off; master = off.destination;
  amb = { music: off.createGain(), timers: [] };
  amb.music.gain.value = 0.5; amb.music.connect(off.destination);
  startMusic(seconds);
  const buf = await off.startRendering();
  [ctx, master, amb] = saved;
  noiseCache.clear();
  return buf;
}

function pluck(t, f, len, vol, kind) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'sawtooth'; o2.type = kind === 'bass' ? 'triangle' : 'square';
  o1.frequency.value = f; o2.frequency.value = f * (kind === 'bass' ? 1 : 2.003);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  const top = kind === 'bass' ? 700 : 5200;
  lp.frequency.setValueAtTime(top, t); lp.frequency.exponentialRampToValueAtTime(kind === 'bass' ? 200 : 900, t + len);
  lp.Q.value = kind === 'bass' ? 1 : 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + len + 0.08);
  const g2 = ctx.createGain(); g2.gain.value = kind === 'bass' ? 0.6 : 0.25;
  o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(amb.music);
  o1.start(t); o2.start(t); o1.stop(t + len + 0.1); o2.stop(t + len + 0.1);
}

function organ(t, f, len, vol) {
  for (const [mul, v] of [[1, 1], [2, 0.5], [3, 0.25]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.01);
    g.gain.setValueAtTime(vol * v, t + len * 0.6); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g).connect(amb.music); o.start(t); o.stop(t + len + 0.02);
  }
}

// דרבוקה: דום עמוק, טק חד, קה רך
function darbuka(t, kind, accent) {
  if (kind === 'D') {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.2);
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(amb.music); o.start(t); o.stop(t + 0.36);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.03);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.08, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(lp).connect(ng).connect(amb.music); n.start(t);
  } else {
    const soft = kind === 'k';
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.06);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = soft ? 2600 : 3600; bp.Q.value = 1.4;
    const g = ctx.createGain(); const v = soft ? 0.07 : accent ? 0.2 : 0.15;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + (soft ? 0.04 : 0.06));
    n.connect(bp).connect(g).connect(amb.music); n.start(t);
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.frequency.value = soft ? 620 : 820; og.gain.setValueAtTime(v * 0.4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(og).connect(amb.music); o.start(t); o.stop(t + 0.04);
  }
}

function riq(t, v) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.05);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
  const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
  n.connect(hp).connect(g).connect(amb.music); n.start(t);
}
