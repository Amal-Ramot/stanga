// מקלדת + שליטה במגע
const MAPS = {
  p1: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    kick: ['Space'], lob: ['ShiftLeft'], heel: ['KeyE'], scissors: ['KeyQ'],
  },
  p2: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    kick: ['Enter', 'NumpadEnter', 'Numpad0'], lob: ['ShiftRight', 'Numpad1'],
    heel: ['Slash', 'Numpad2'], scissors: ['Period', 'Numpad3'],
  },
};

const down = new Set();
const edges = new Set();
const touch = { x: 0, y: 0, kick: false, lob: false, heelEdge: false, scEdge: false, active: false };

export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!down.has(e.code)) edges.add(e.code);
    down.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());
  setupTouch();
}

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

const any = (codes) => codes.some((c) => down.has(c));
const edge = (codes) => codes.some((c) => edges.has(c));

export function consumeEdge(code) {
  const had = edges.has(code);
  edges.delete(code);
  return had;
}

// mode: 'p1-solo' (שילוב שני המיפויים), 'p1', 'p2'
export function readIntent(mode) {
  const maps = mode === 'p1-solo' ? [MAPS.p1, MAPS.p2] : [MAPS[mode]];
  const it = { x: 0, y: 0, kick: false, lob: false, heel: false, scissors: false };
  for (const m of maps) {
    it.x += (any(m.right) ? 1 : 0) - (any(m.left) ? 1 : 0);
    it.y += (any(m.up) ? 1 : 0) - (any(m.down) ? 1 : 0);
    it.kick ||= any(m.kick);
    it.lob ||= any(m.lob);
    it.heel ||= edge(m.heel);
    it.scissors ||= edge(m.scissors);
  }
  it.x = Math.max(-1, Math.min(1, it.x));
  it.y = Math.max(-1, Math.min(1, it.y));
  const l = Math.hypot(it.x, it.y);
  if (l > 1) { it.x /= l; it.y /= l; }
  if (mode !== 'p2' && touch.active) {
    if (Math.hypot(touch.x, touch.y) > 0.15) { it.x = touch.x; it.y = touch.y; }
    it.kick ||= touch.kick; it.lob ||= touch.lob;
    it.heel ||= touch.heelEdge; it.scissors ||= touch.scEdge;
  }
  return it;
}

export function endFrame() {
  edges.clear();
  touch.heelEdge = false; touch.scEdge = false;
}

function setupTouch() {
  const pad = document.getElementById('joy');
  const knob = document.getElementById('joy-knob');
  if (!pad) return;
  let id = null, cx = 0, cy = 0;
  const R = 55;
  const move = (e) => {
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    touch.x = (dx * k) / R; touch.y = -(dy * k) / R;
  };
  pad.addEventListener('pointerdown', (e) => {
    id = e.pointerId; touch.active = true;
    const r = pad.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    pad.setPointerCapture(id); move(e); e.preventDefault();
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; touch.x = touch.y = 0; knob.style.transform = '';
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);

  const hold = (elId, key) => {
    const b = document.getElementById(elId);
    if (!b) return;
    b.addEventListener('pointerdown', (e) => { touch.active = true; touch[key] = true; b.classList.add('on'); b.setPointerCapture(e.pointerId); e.preventDefault(); });
    const up = () => { touch[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  const tap = (elId, key) => {
    const b = document.getElementById(elId);
    if (!b) return;
    b.addEventListener('pointerdown', (e) => { touch.active = true; touch[key] = true; e.preventDefault(); });
  };
  hold('b-kick', 'kick');
  hold('b-lob', 'lob');
  tap('b-heel', 'heelEdge');
  tap('b-sc', 'scEdge');
}
