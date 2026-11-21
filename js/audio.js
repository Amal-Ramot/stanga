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

// מוזיקה מקורית בסגנון ים-תיכוני של שנות ה-90:
// דרבוקה בקצב מקסום, בוזוקי בסולם חיג'אז עם טרמולו וקישוטים, קלידים ובס
const HZ = (m) => 440 * Math.pow(2, (m - 69) / 12);
// חיג'אז על רה: D Eb F# G A Bb C
const N = { D3: 50, A2: 45, G2: 43, C3: 48, Bb2: 46, Eb3: 51,
  D4: 62, Eb4: 63, Fs4: 66, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74, Eb5: 75, Fs5: 78, G5: 79 };

// מנגינה: [תו, אורך בשמיניות, טרמולו?] – 4 משפטים של 2 תיבות (16 שמיניות)
const MEL = [
  // A – פתיחה עולה
  [['D4', 1], ['Eb4', 1], ['Fs4', 1], ['G4', 1], ['A4', 2], ['Bb4', 1], ['A4', 1], ['G4', 1], ['A4', 1], ['Bb4', 1], ['C5', 1], ['A4', 4, 1]],
  // B – ירידה בחיג'אז
  [['D5', 1], ['C5', 1], ['Bb4', 1], ['A4', 1], ['Bb4', 1], ['A4', 1], ['G4', 1], ['Fs4', 1], ['G4', 2], ['Fs4', 1], ['Eb4', 1], ['D4', 4, 1]],
  // C – שיא
  [['A4', 1], ['A4', 1], ['Bb4', 1], ['C5', 1], ['D5', 2], ['Eb5', 1], ['D5', 1], ['C5', 1], ['D5', 1], ['C5', 1], ['Bb4', 1], ['A4', 4, 1]],
  // D – חזרה הביתה
  [['Bb4', 1], ['A4', 1], ['G4', 1], ['A4', 1], ['Bb4', 2], ['A4', 1], ['G4', 1], ['Fs4', 1], ['G4', 1], ['Fs4', 1], ['Eb4', 1], ['D4', 4, 1]],
];
// אקורדים לכל חצי-תיבה (8 שמיניות): שורש בס + תווי אקורד
const CH = {
  D: { bass: 'D3', notes: [62, 66, 69] }, Cm: { bass: 'C3', notes: [60, 63, 67] },
  Gm: { bass: 'G2', notes: [62, 67, 70] }, Eb: { bass: 'Eb3', notes: [63, 67, 70] },
  A: { bass: 'A2', notes: [61, 64, 69] }, Bb: { bass: 'Bb2', notes: [62, 65, 70] },
};
const PROG = [['D', 'D', 'Cm', 'D'], ['Gm', 'Cm', 'Eb', 'D'], ['D', 'Cm', 'Bb', 'A'], ['Gm', 'Eb', 'Cm', 'D']];
// מקסום בשש-עשריות: D=דום T=טק k=קה (רך)
const MAQSUM = ['D', '', 'T', 'k', '', 'k', 'T', '', 'D', '', 'T', 'k', '', 'k', 'T', 'k'];

function startMusic(ahead = 0.5) {
  const bpm = 100, s16 = 60 / bpm / 4;
  let step = 0;
  let next = ctx.currentTime + 0.25;
  // לוח זמנים של המנגינה מראש: 4 משפטים × 32 שש-עשריות
  const melEvents = [];
  let pos = 0;
  MEL.forEach((phrase) => {
    let p = pos;
    for (const [n, len8, trem] of phrase) { melEvents.push({ at: p, n: N[n], len: len8 * 2, trem: !!trem }); p += len8 * 2; }
    pos += 32;
  });
  const LOOP = 128; // 4 משפטים
  const sched = () => {
    while (next < ctx.currentTime + ahead) {
      const t = next;
      const s = step % LOOP;
      const bar16 = s % 16;
      const intro = step < 32; // בהתחלה רק דרבוקה וקלידים
      // דרבוקה
      const hit = MAQSUM[bar16];
      if (hit) darbuka(t, hit, (step % 64) >= 60 && hit !== 'D');
      if ((step % 64) >= 60) darbuka(t + s16 / 2, 'k', false); // מילוי בסוף משפט
      // רק (טמבורין) עדין
      if (step % 2 === 1) riq(t, 0.012);
      // בס – דום-דום של מזרחית
      const chord = CH[PROG[Math.floor(s / 32) % 4][Math.floor((s % 32) / 8)]];
      if (bar16 === 0 || bar16 === 6 || bar16 === 8 || bar16 === 14) pluck(t, HZ(N[chord.bass]), s16 * 2.5, 0.12, 'bass');
      // קלידים – אקורדים על ה"אוף"
      if (bar16 % 4 === 2) for (const n of chord.notes) organ(t, HZ(n), s16 * 1.6, 0.016);
      // בוזוקי
      if (!intro || step >= 16) {
        for (const e of melEvents) if (e.at === s && !intro) bouzouki(t, HZ(e.n), e.len * s16, e.trem, s16);
      }
      step++;
      next += s16;
    }
    if (ahead <= 1) amb.timers.push(setTimeout(sched, 120));
  };
  sched();
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

// בוזוקי: מריטה בהירה + טרמולו בתווים ארוכים + קישוט (גרייס) מהטון שמעל
function bouzouki(t, f, len, trem, s16) {
  if (Math.random() < 0.35 && !trem) pluck(t, f * Math.pow(2, 1 / 12), 0.05, 0.05, 'bz'); // קישוט
  const t0 = t + (Math.random() < 0.35 && !trem ? 0.045 : 0);
  if (trem) {
    const n = Math.max(2, Math.round(len / (s16 / 2)));
    for (let i = 0; i < n; i++) pluck(t0 + i * (s16 / 2), f, s16 * 0.6, 0.07 * (1 - i / (n * 1.6)), 'bz');
  } else pluck(t0, f, Math.min(len, 0.5), 0.085, 'bz');
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
