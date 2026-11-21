// טורניר השכונה – טבלה משותפת לכל מי שפותח את הקישור (בגרסת Claude AI, יכולת db)
// ניקוד ליגה: ניצחון = 3 נקודות + בונוס רמה (רגיל +1, מלך השכונה +2). שוויון בנקודות – הפרש שערים.
const $ = (id) => document.getElementById(id);
const BONUS = { easy: 0, medium: 1, hard: 2 };
const LEVEL_NAME = { easy: "קטן מכיתה ב'", medium: 'רגיל', hard: 'מלך השכונה' };

export const T = {
  db: null, user: null, myId: null, me: null, rows: [], canWrite: null,
  ready: false, active: false, level: 'medium', onPlay: null,
};

function clean(s, max) {
  return String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sortRows(rows) {
  return rows.sort((a, b) => (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.wins - a.wins) || (a.played - b.played));
}

export function myRank() {
  const i = T.rows.findIndex((r) => r.id === T.myId);
  return i < 0 ? null : { rank: i + 1, of: T.rows.length };
}

// אתחול – רק כשהדף רץ בתוך Claude AI
export async function initTournament(onPlay) {
  T.onPlay = onPlay;
  setupUI();
  if (!window.claude || typeof window.claude.use !== 'function') return; // GitHub Pages – אין טורניר
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  if (!db) return;
  T.db = db; T.user = user;
  try { T.myId = user ? await user.id() : null; } catch { T.myId = null; }
  try { T.canWrite = user ? await user.can('data.write') : null; } catch { T.canWrite = null; }
  subscribe(); // הכפתור יופיע רק אחרי שהטבלה נטענה בהצלחה
}

function subscribe() {
  const timer = setTimeout(() => { if (!T.ready) renderStatus('הטבלה לא נטענה. נסו לסגור ולפתוח את הטורניר שוב.'); }, 10000);
  T.db.collection('league').orderBy('pts', 'desc').limit(500).onSnapshot((snap) => {
    clearTimeout(timer);
    T.ready = true;
    $('btn-tour').hidden = false;
    const docs = snap.docs || [];
    T.rows = sortRows(docs.map((d) => {
      const x = d.data() || {};
      return {
        id: d.id, nick: clean(x.nick, 16) || 'שחקן', hood: clean(x.hood, 20),
        played: +x.played || 0, wins: +x.wins || 0, losses: +x.losses || 0,
        gf: +x.gf || 0, ga: +x.ga || 0, pts: +x.pts || 0,
      };
    }));
    T.me = T.rows.find((r) => r.id === T.myId) || null;
    render();
  }, () => { clearTimeout(timer); renderStatus('אין גישה לטבלה כרגע.'); });
}

function renderStatus(t) { $('tour-status').textContent = t; }

function render() {
  const body = $('tour-rows');
  body.textContent = '';
  if (!T.rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = 8; td.className = 'empty';
    td.textContent = 'הטבלה עוד ריקה. הירשמו ותהיו הראשונים בשכונה!';
    tr.appendChild(td); body.appendChild(tr);
  }
  T.rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (r.id === T.myId) tr.className = 'me';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
    const gd = r.gf - r.ga;
    for (const v of [medal, r.nick, r.hood, r.played, `${r.wins}-${r.losses}`, (gd > 0 ? '+' : '') + gd, r.pts]) {
      const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  const rk = myRank();
  const reg = $('tour-reg'), play = { hidden: true };
  if (T.canWrite === false || !T.myId) {
    reg.hidden = true; play.hidden = true;
    renderStatus(T.myId ? 'אפשר לצפות בטבלה. כדי להירשם צריך הרשאת "Contributor" לקישור.' : 'צריך להתחבר ל-Claude כדי להירשם לטורניר.');
  } else if (!T.me) {
    reg.hidden = false; play.hidden = true;
    renderStatus(`${T.rows.length} שחקנים בטבלה. הירשמו כדי להצטרף.`);
  } else {
    reg.hidden = true; play.hidden = false;
    renderStatus(`${T.me.nick}, אתה במקום ${rk.rank} מתוך ${rk.of} · ${T.me.pts} נקודות. בחרו יריב מהמחוברים למטה.`);
  }
}

async function register(e) {
  e.preventDefault();
  const nick = clean($('tour-nick').value, 16);
  const hood = clean($('tour-hood').value, 20);
  if (nick.length < 2) { renderStatus('כינוי צריך להיות לפחות 2 אותיות.'); return; }
  $('tour-reg-btn').disabled = true;
  try {
    await T.db.collection('league').doc(T.myId).set({ nick, hood, played: 0, wins: 0, losses: 0, gf: 0, ga: 0, pts: 0, joined: Date.now() });
  } catch (err) {
    if (err && err.code === 'invalid_argument') { T.canWrite = false; render(); }
    else renderStatus('ההרשמה לא נשמרה. נסו שוב בעוד רגע.');
  }
  $('tour-reg-btn').disabled = false;
}

// סיום משחק טורניר – עדכון השורה של השחקן
export async function recordResult(won, gf, ga) {
  if (!T.active || !T.db || !T.me) return null;
  T.active = false;
  const m = T.me;
  const add = won ? 3 + BONUS[T.level] : 0;
  const row = {
    nick: m.nick, hood: m.hood, played: m.played + 1, wins: m.wins + (won ? 1 : 0), losses: m.losses + (won ? 0 : 1),
    gf: m.gf + gf, ga: m.ga + ga, pts: m.pts + add, last: Date.now(),
  };
  try {
    await T.db.collection('league').doc(T.myId).set(row);
    // דירוג משוער מיד (העדכון החי יגיע מהמנוי)
    const rows = sortRows(T.rows.map((r) => (r.id === T.myId ? { ...r, ...row } : r)));
    const rank = rows.findIndex((r) => r.id === T.myId) + 1;
    return { add, rank, of: rows.length, pts: row.pts };
  } catch { return { error: true }; }
}

function setupUI() {
  $('btn-tour').addEventListener('click', () => { $('tour').classList.remove('hidden'); render(); });
  $('tour-close').addEventListener('click', () => $('tour').classList.add('hidden'));
  $('tour-reg').addEventListener('submit', register);
  document.querySelectorAll('[data-tlevel]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-tlevel]').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); T.level = b.dataset.tlevel;
  }));

}

export { LEVEL_NAME };
