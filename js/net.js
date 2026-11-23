// משחק בזמן אמת בין שני שחקנים רשומים (יכולת room של Claude AI)
// המזמין = "מארח": מריץ את הפיזיקה ושולח מצב. המוזמן = "אורח": שולח לחיצות ומציג.
const $ = (id) => document.getElementById(id);

export const NET = {
  room: null, myPeer: null, lobby: [], match: null, role: null, opp: null,
  remoteInput: { x: 0, z: 0, ch: 0, a: null }, lastSnap: null, onStart: null, onEvent: null, onEnd: null,
  pendingInvite: null, outgoing: null, profile: null, seeking: false,
};

const clean = (s, m) => String(s || '').replace(/[<>]/g, '').trim().slice(0, m);

export async function initNet({ onStart, onEvent, onEnd }) {
  NET.onStart = onStart; NET.onEvent = onEvent; NET.onEnd = onEnd;
  if (!window.claude || typeof window.claude.use !== 'function') return false;
  const room = await window.claude.use('room');
  if (!room) return false;
  NET.room = room;
  room.onPeers((ch) => {
    for (const p of ch.peers) if (p.isMe && p.sameTab) NET.myPeer = p.peer;
    NET.lobby = ch.peers.filter((p) => !p.isMe && p.presence && p.presence.open && p.kind === 'viewer');
    renderLobby();
    autoMatch();
  }, () => {});
  setInterval(autoMatch, 2000);
  room.on('invite', (m) => {
    if (!m.data || m.data.to !== NET.myPeer || NET.match) return;
    NET.pendingInvite = { from: m.peer, match: clean(m.data.match, 40), nick: clean(m.data.nick, 16), hood: clean(m.data.hood, 20) };
    if (NET.seeking && m.data.auto) acceptInvite(); // שידוך אוטומטי – מתחילים מיד
    else showInvite();
  });
  room.on('accept', (m) => {
    const o = NET.outgoing;
    if (!m.data || m.data.to !== NET.myPeer || !o || m.data.match !== o.match) return;
    NET.outgoing = null;
    hideWaiting();
    startAs('host', o.match, { peer: m.peer, nick: clean(m.data.nick, 16), hood: clean(m.data.hood, 20) });
  });
  room.on('decline', (m) => {
    const o = NET.outgoing;
    if (!m.data || m.data.to !== NET.myPeer || !o || m.data.match !== o.match) return;
    NET.outgoing = null;
    hideWaiting('השחקן לא יכול עכשיו. נסו מישהו אחר.');
  });
  $('inv-yes').addEventListener('click', acceptInvite);
  $('inv-no').addEventListener('click', declineInvite);
  $('wait-cancel').addEventListener('click', () => { NET.outgoing = null; hideWaiting(); });
  return true;
}

// מופיע בלובי (רק שחקן רשום שפתח את חלון הטורניר)
export function setOpen(profile, open) {
  if (!NET.room) return;
  NET.profile = profile;
  NET.room.presence(open && profile ? { open: true, nick: profile.nick, hood: profile.hood, busy: !!NET.match, seek: !!NET.seeking && !NET.match } : { open: null, nick: null, hood: null, busy: null, seek: null }).catch(() => {});
}

// חיפוש יריב אוטומטי: כל השחקנים שמחפשים ממוינים לפי מזהה, ומשודכים בזוגות.
// מי שהמזהה שלו קטן יותר בזוג שולח את ההזמנה, והשני מקבל אותה אוטומטית.
export function setSeeking(on) {
  NET.seeking = !!on && !!NET.profile;
  setOpen(NET.profile, !!NET.profile);
  renderLobby();
  autoMatch();
}
function autoMatch() {
  if (!NET.seeking || NET.match || NET.outgoing || !NET.myPeer || !NET.profile) return;
  const seekers = NET.lobby.filter((p) => p.presence.seek && !p.presence.busy).map((p) => p.peer);
  const all = [...seekers, NET.myPeer].sort();
  const i = all.indexOf(NET.myPeer);
  const partner = all[i ^ 1];
  if (!partner || NET.myPeer > partner) return; // רק הקטן מבין השניים מזמין
  const p = NET.lobby.find((x) => x.peer === partner);
  if (p) invite(p, true);
}

function renderLobby() {
  const box = $('lobby-list');
  if (!box) return;
  box.textContent = '';
  $('lobby').hidden = !NET.room || !NET.profile;
  const st = document.createElement('div'); st.className = 'lobby-seek';
  const seekers = NET.lobby.filter((p) => p.presence.seek && !p.presence.busy);
  st.textContent = NET.match ? 'במשחק...' : NET.seeking
    ? (seekers.length ? 'נמצא שחקן פנוי! מתחילים משחק...' : '🔎 מחפש שחקן פנוי... ברגע שעוד שחקן רשום ייכנס לטורניר, המשחק יתחיל לבד.')
    : '';
  box.appendChild(st);
  const list = NET.lobby;
  if (!list.length) {
    const d = document.createElement('div'); d.className = 'lobby-empty';
    d.textContent = 'אין כרגע עוד שחקנים מחוברים. שלחו את הקישור לחברים מהשכונה.';
    box.appendChild(d); return;
  }
  for (const p of list) {
    const row = document.createElement('div'); row.className = 'lobby-row';
    const name = document.createElement('span');
    name.textContent = `${clean(p.presence.nick, 16) || 'שחקן'}${p.presence.hood ? ' · ' + clean(p.presence.hood, 20) : ''}`;
    const tag = document.createElement('small');
    tag.textContent = p.presence.busy ? 'במשחק' : p.presence.seek ? 'מחפש משחק' : 'מחובר';
    row.append(name, tag); box.appendChild(row);
  }
}

async function invite(p, auto) {
  if (!NET.profile || NET.match) return;
  const match = 'm-' + Math.random().toString(36).slice(2, 10);
  NET.outgoing = { to: p.peer, match };
  if (!auto) showWaiting(`מחכה ש${clean(p.presence.nick, 16) || 'השחקן'} יענה...`);
  try { await NET.room.emit('invite', { to: p.peer, match, nick: NET.profile.nick, hood: NET.profile.hood, auto: !!auto }); }
  catch (e) { NET.outgoing = null; hideWaiting(e && e.code === 'not_permitted' ? 'אין לך הרשאה להזמין (צריך Contributor).' : 'ההזמנה לא נשלחה.'); }
  setTimeout(() => { if (NET.outgoing && NET.outgoing.match === match) { NET.outgoing = null; hideWaiting(auto ? '' : 'אין תשובה. נסו שוב.'); } }, auto ? 8000 : 30000);
}

function showInvite() {
  const i = NET.pendingInvite;
  $('inv-text').textContent = `${i.nick || 'שחקן'}${i.hood ? ' מ' + i.hood : ''} מזמין אותך למשחק טורניר!`;
  $('invite').classList.remove('hidden');
}
async function acceptInvite() {
  const i = NET.pendingInvite; NET.pendingInvite = null;
  $('invite').classList.add('hidden');
  if (!i || !NET.profile) return;
  try { await NET.room.emit('accept', { to: i.from, match: i.match, nick: NET.profile.nick, hood: NET.profile.hood }); } catch { return; }
  startAs('guest', i.match, { peer: i.from, nick: i.nick, hood: i.hood });
}
async function declineInvite() {
  const i = NET.pendingInvite; NET.pendingInvite = null;
  $('invite').classList.add('hidden');
  if (i) NET.room.emit('decline', { to: i.from, match: i.match }).catch(() => {});
}
function showWaiting(t) { $('wait-text').textContent = t; $('waiting').classList.remove('hidden'); }
function hideWaiting(t) {
  $('waiting').classList.add('hidden');
  if (t) { const s = $('tour-status'); if (s) s.textContent = t; }
}

async function startAs(role, name, opp) {
  try { NET.match = await NET.room.join(name); } catch { NET.match = null; return; }
  NET.role = role; NET.opp = opp; NET.lastSnap = null;
  NET.remoteInput = { x: 0, z: 0, ch: 0, a: null };
  setOpen(NET.profile, true);
  let seen = false;
  NET.match.onPeers((ch) => {
    if (ch.peers.some((p) => p.peer === opp.peer)) seen = true;
    if (seen && ch.left.some((p) => p.peer === opp.peer)) endMatch('left');
  }, () => endMatch('left'));
  if (role === 'host') NET.match.on('in', (m) => { if (m.peer === opp.peer && m.data) NET.remoteInput = m.data; });
  if (role === 'guest') NET.match.on('st', (m) => { if (m.peer === opp.peer && m.data) NET.lastSnap = m.data; });
  NET.match.on('ev', (m) => { if (m.peer === opp.peer && NET.onEvent) NET.onEvent(m.data || {}); });
  if (NET.onStart) NET.onStart(role, opp);
}

// שליחות בתדירות גבוהה – דרך presence של חדר המשחק
let lastSend = 0;
export function sendSnapshot(s, now) {
  if (!NET.match || now - lastSend < 66) return; // ~15 בשנייה
  lastSend = now;
  NET.match.emit('st', s).catch(() => {});
}
let lastInput = '';
export function sendInput(i, now) {
  if (!NET.match) return;
  const key = JSON.stringify(i);
  if (key === lastInput && now - lastSend < 500) return; // שולחים רק כשמשהו השתנה
  if (now - lastSend < 50) return;
  lastSend = now; lastInput = key;
  NET.match.emit('in', i).catch(() => {});
}
export function sendEvent(e) {
  if (NET.match && NET.role === 'host') NET.match.emit('ev', e).catch(() => {});
}

export async function endMatch(reason) {
  const m = NET.match;
  if (!m) return;
  NET.match = null; NET.role = null; NET.seeking = false;
  try { await m.leave(); } catch {}
  setOpen(NET.profile, !!NET.profile);
  if (NET.onEnd) NET.onEnd(reason);
}
