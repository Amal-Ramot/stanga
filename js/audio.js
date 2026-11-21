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

function noiseBuffer(dur) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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

// מוזיקה מקורית בסגנון פופ-מזרחי של שנות ה-90 (סינתיסייזר + תופים)
function startMusic() {
  const bpm = 104, beat = 60 / bpm;
  // סולם פריגי-דומיננטי (חיג'אז) על מי
  const scale = [0, 1, 4, 5, 7, 8, 10, 12];
  const root = 64; // E4
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const melody = [0, 1, 2, 1, 2, 3, 4, 3, 2, 1, 2, 4, 3, 2, 1, 0, 4, 5, 4, 3, 4, 5, 7, 5, 4, 3, 2, 3, 2, 1, 0, 0];
  const bassLine = [0, 0, 5, 5, 3, 3, 0, 0];
  let step = 0;
  let next = ctx.currentTime + 0.2;
  const sched = () => {
    while (next < ctx.currentTime + 0.6) {
      const s = step % 32;
      const t = next;
      // תופים
      if (s % 4 === 0 || s % 8 === 6) drum(t, 'kick');
      if (s % 8 === 4) drum(t, 'snare');
      if (s % 2 === 1) drum(t, 'hat');
      if (s % 16 === 14) drum(t + beat / 4, 'snare');
      // בס
      if (s % 2 === 0) synth(t, mtof(root - 24 + scale[bassLine[(s >> 2) % 8]]), beat * 0.45, 'triangle', 0.09);
      // מנגינה (כל צעד = שמינית)
      const deg = melody[s];
      if (s % 8 !== 7) synth(t, mtof(root + scale[deg % 8] + (deg >= 8 ? 12 : 0)), beat * 0.42, 'square', 0.035, true);
      // אקורדים
      if (s % 8 === 0) for (const d of [0, 2, 4]) synth(t, mtof(root - 12 + scale[(bassLine[(s >> 2) % 8] + d) % 8]), beat * 3.6, 'sawtooth', 0.012);
      step++;
      next += beat / 2;
    }
    amb.timers.push(setTimeout(sched, 150));
  };
  sched();
}

function synth(t, f, len, type, vol, vibrato) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
  if (vibrato) {
    const l = ctx.createOscillator(); const lg = ctx.createGain();
    l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + len + 0.05);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + len * 0.7); g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(g).connect(amb.music); o.start(t); o.stop(t + len + 0.02);
}

function drum(t, kind) {
  if (kind === 'kick') {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(amb.music); o.start(t); o.stop(t + 0.2);
  } else {
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(kind === 'hat' ? 0.05 : 0.15);
    const f = ctx.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ctx.createGain(); g.gain.setValueAtTime(kind === 'hat' ? 0.04 : 0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'hat' ? 0.04 : 0.14));
    n.connect(f).connect(g).connect(amb.music); n.start(t);
  }
}
