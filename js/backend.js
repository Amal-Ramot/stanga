// חיבור ל-Supabase: טבלת הטורניר (Postgres + RLS) ומשחק אונליין (Realtime).
// מספק את אותו ממשק שהקוד של הטורניר והמשחק אונליין משתמשים בו (claude.use: db / user / room).
const SUPABASE_URL = 'https://kxovmqhicolmngdlulca.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sXWNFXWvVafCg3VB5z0csg_5bU5DjVG'; // מפתח ציבורי – מיועד לדפדפן

const LEAGUE_FIELDS = ['nick', 'hood', 'played', 'wins', 'losses', 'gf', 'ga', 'pts'];

function makeBackend() {
  const lib = window.supabase;
  if (!lib || !lib.createClient) return null;
  const sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'stanga-auth' },
    realtime: { params: { eventsPerSecond: 40 } },
  });

  // זהות אנונימית – נשמרת בדפדפן, כך שהשחקן נשאר אותו שחקן בטבלה
  let uidPromise = null;
  const getUid = () => {
    if (!uidPromise) {
      uidPromise = (async () => {
        const { data: s } = await sb.auth.getSession();
        if (s && s.session && s.session.user) return s.session.user.id;
        const { data, error } = await sb.auth.signInAnonymously();
        if (error || !data || !data.user) throw error || new Error('no user');
        return data.user.id;
      })().catch((e) => { uidPromise = null; console.warn('auth', e); return null; });
    }
    return uidPromise;
  };

  const user = {
    id: () => getUid(),
    can: async () => ((await getUid()) ? true : null),
  };

  // ---- "db": רק אוסף league ----
  const db = {
    collection(name) {
      if (name !== 'league') throw new Error('unknown collection');
      const q = {
        orderBy() { return q; },
        limit() { return q; },
        onSnapshot(next, error) {
          let stopped = false, timer = null;
          const fetchRows = async () => {
            const { data, error: e } = await sb.from('league').select('*').order('pts', { ascending: false }).limit(500);
            if (stopped) return;
            if (e) { if (error) error({ code: 'unavailable', message: e.message }); return; }
            next({ docs: (data || []).map((r) => ({ id: r.id, data: () => r })) });
          };
          fetchRows();
          const ch = sb.channel('league-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'league' }, () => {
              clearTimeout(timer); timer = setTimeout(fetchRows, 300);
            })
            .subscribe();
          const poll = setInterval(fetchRows, 30000); // גיבוי אם Realtime לא זמין
          return () => { stopped = true; clearInterval(poll); sb.removeChannel(ch); };
        },
        doc(id) {
          return {
            async set(obj) {
              const uid = await getUid();
              if (!uid || uid !== id) throw { code: 'invalid_argument', message: 'not your row' };
              const row = { id };
              for (const k of LEAGUE_FIELDS) if (obj[k] !== undefined) row[k] = obj[k];
              row.updated_at = new Date().toISOString();
              const { error } = await sb.from('league').upsert(row);
              if (error) throw { code: 'unavailable', message: error.message };
            },
          };
        },
      };
      return q;
    },
  };

  // ---- "room": ערוצי Realtime (לובי + חדר לכל משחק) ----
  const peerId = 'p' + Math.random().toString(36).slice(2, 10);
  function makeRoom(name) {
    const listeners = {}; const peerSubs = [];
    let state = {}; let ready = false; let peersCache = [];
    const ch = sb.channel('stanga-' + name, { config: { presence: { key: peerId }, broadcast: { self: false, ack: false } } });
    const buildPeers = () => {
      const ps = ch.presenceState();
      const list = [];
      for (const [key, metas] of Object.entries(ps)) {
        const m = metas[metas.length - 1] || {};
        const { presence_ref, ...presence } = m;
        list.push({ peer: key, by: null, isMe: key === peerId, sameTab: key === peerId, kind: 'viewer', guest: false, presence, updatedAt: Date.now() });
      }
      return list;
    };
    const firePeers = (joined = [], left = []) => {
      peersCache = buildPeers();
      for (const f of peerSubs) f({ peers: peersCache, joined, left, updated: [] });
    };
    ch.on('presence', { event: 'sync' }, () => firePeers());
    // עדכון presence ב-Supabase נשלח כ"יציאה+כניסה" – מדווחים על יציאה רק אם המשתתף באמת נעלם
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      setTimeout(() => { if (!ch.presenceState()[key]) firePeers([], [{ peer: key }]); }, 1500);
    });
    ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
      const fns = listeners[event]; if (!fns || !payload) return;
      const msg = { topic: event, data: payload.data, peer: payload.peer, by: null, isMe: payload.peer === peerId, sameTab: payload.peer === peerId, kind: 'viewer', guest: false };
      for (const f of fns) f(msg);
    });
    const joined = new Promise((resolve) => {
      ch.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') { ready = true; await ch.track(state); firePeers(); resolve(); }
        else if (status !== 'CLOSED') console.warn('realtime', name, status, err && err.message);
      });
      setTimeout(resolve, 8000);
    });
    const room = {
      name,
      emit: async (topic, data) => {
        await joined;
        const r = await ch.send({ type: 'broadcast', event: topic, payload: { data, peer: peerId } });
        if (r !== 'ok') throw { code: 'unavailable', message: String(r) };
      },
      on: (topic, fn) => { (listeners[topic] ||= []).push(fn); return () => { listeners[topic] = listeners[topic].filter((x) => x !== fn); }; },
      presence: async (patch) => {
        state = { ...state };
        for (const [k, v] of Object.entries(patch)) { if (v === null) delete state[k]; else state[k] = v; }
        if (ready) await ch.track(state);
      },
      peers: () => peersCache,
      onPeers: (fn) => { peerSubs.push(fn); setTimeout(() => fn({ peers: peersCache, joined: peersCache, left: [], updated: [] }), 0); return () => {}; },
      connected: () => ready,
      leave: async () => { try { await ch.untrack(); } catch {} sb.removeChannel(ch); },
      join: async (n) => { const r = makeRoom(n); await r._joined; return r; },
      _joined: joined,
    };
    return room;
  }
  let lobby = null;
  const room = new Proxy({}, { get: (_, k) => { lobby ||= makeRoom('lobby'); return lobby[k]; } });

  return { use: async (n) => ({ db, user, room })[n] || null };
}

// בגרסה בתוך Claude AI יש כבר window.claude; ב-GitHub Pages משתמשים ב-Supabase
if (!window.claude) {
  try { const b = makeBackend(); if (b) window.claude = b; } catch (e) { console.warn('backend', e); }
}
