// Live-Verbindung über Firebase (Firestore) für Spieler-Tablets.
//
// Grundsatz: Nach Firebase wandert NUR, was Spieler sehen dürfen (siehe publicPlayer).
// Alles andere (GM-Notizen, Geheimnisse, Szenen, Regeln des Spielleiters, Sitzungsprotokoll) bleibt auf den Geräten des
// Spielleiters und in Dropbox. Der Raumcode ist lang und zufällig; wer ihn nicht kennt, kommt nicht an die Daten.
import { getSettings, saveSettings } from './store.js';

const SDK_VERSION = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let sdkCache = null;

// ---------------------------------------------------------------- Konfiguration

export function getConfig() {
  const c = getSettings().firebase;
  return c && c.apiKey && c.projectId ? c : null;
}

export function setConfig(cfg) { saveSettings({ firebase: cfg || null }); }

/** Nimmt die Konfiguration aus der Firebase-Konsole entgegen (JSON oder das JavaScript-Beispiel mit `const firebaseConfig = { … }`). */
export function parseConfig(text) {
  const src = String(text || '');
  const out = {};
  const re = /["']?(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId|measurementId|databaseURL)["']?\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  if (!out.apiKey || !out.projectId) return null;
  return out;
}

export const encodeConfig = (cfg) => btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function decodeConfig(s) {
  try {
    const b = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const cfg = JSON.parse(decodeURIComponent(escape(atob(b + '='.repeat((4 - (b.length % 4)) % 4)))));
    return cfg && cfg.apiKey && cfg.projectId ? cfg : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- SDK laden

export async function load(cfg = getConfig()) {
  if (!cfg) throw new Error('Firebase ist noch nicht eingerichtet (Einstellungen → Live-Verbindung).');
  const key = cfg.projectId + ':' + cfg.apiKey;
  if (sdkCache && sdkCache.key === key) return sdkCache;
  const [app, fs] = await Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-firestore.js`)]);
  const appName = `chronist-${cfg.projectId}`;
  let inst;
  try { inst = app.getApps().find((a) => a.name === appName) || app.initializeApp(cfg, appName); } catch { inst = app.initializeApp(cfg, appName); }
  sdkCache = { key, db: fs.getFirestore(inst), fs };
  return sdkCache;
}

/** Verbindungstest: schreibt, liest und löscht ein Testdokument. */
export async function testConnection(cfg) {
  const { db, fs } = await load(cfg);
  const ref = fs.doc(db, 'rooms', `test-${Math.random().toString(36).slice(2, 12)}`);
  await fs.setDoc(ref, { ping: Date.now() });
  const back = await fs.getDoc(ref);
  await fs.deleteDoc(ref);
  if (!back.exists()) throw new Error('Das Testdokument kam nicht zurück. Prüfe die Regeln in Firestore.');
  return true;
}

// ---------------------------------------------------------------- Codes & Links

export function newRoomCode() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}

export function prettyCode(code) { return String(code || '').replace(/(.{4})(?=.)/g, '$1-'); }

/** Link für ein Tablet. pid leer = Tablet wählt den Spieler selbst. Enthält die (öffentliche) Firebase-Konfiguration. */
export function roomLink(code, pid = '') {
  const cfg = getConfig();
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/play/${code}/${pid || '-'}/${cfg ? encodeConfig(cfg) : '-'}`;
}

// ---------------------------------------------------------------- Was Spieler sehen dürfen

/** Einziger Weg nach Firebase: eine feste Auswahl an Feldern. */
export function publicPlayer(adv, ses, p) {
  const rs = adv.ruleset || {};
  const clean = (s) => String(s ?? '');
  return {
    v: 1,
    name: clean(p.name),
    character: clean(p.character),
    conditions: clean(p.conditions),
    skills: clean(p.skillsText),
    attrs: (rs.attributes || []).map((a) => ({
      key: a.key, name: clean(a.name), description: clean(a.description),
      value: p.attrs && p.attrs[a.key] !== undefined && p.attrs[a.key] !== '' ? Number(p.attrs[a.key]) : null,
    })),
    resources: (rs.resources || []).filter((r) => p.resources && p.resources[r.key]).map((r) => ({
      key: r.key, name: clean(r.name), value: Number(p.resources[r.key].value) || 0, max: Number(p.resources[r.key].max) || 0,
    })),
    items: (ses.items || []).filter((i) => i.holder === p.id).map((i) => clean(i.name)),
    groupItems: (ses.items || []).filter((i) => !i.holder).map((i) => clean(i.name)),
    rule: clean(rs.name),
    adventure: clean(adv.title),
  };
}

// ---------------------------------------------------------------- Spielleiter-Seite

let current = null;

/** Startet die Live-Verbindung für eine Sitzung. hooks.onPlayers(map) wird bei Änderungen der Tablets aufgerufen,
 *  hooks.onNotes(pid, text) wenn ein Spieler seine Notizen ändert. */
let starting = null;
export function startLive(adv, ses, hooks = {}) {
  if (current && current.code === ses.room.code) return Promise.resolve(startLiveNow(adv, ses, hooks));
  if (starting && starting.code === ses.room.code) {
    return starting.p.then((api) => { current.hooks = hooks; current.adv = adv; current.ses = ses; return api; });
  }
  const p = startLiveNow(adv, ses, hooks);
  starting = { code: ses.room.code, p };
  const clearIt = () => { if (starting && starting.p === p) starting = null; };
  p.then(clearIt, clearIt);
  return p;
}

async function startLiveNow(adv, ses, hooks = {}) {
  if (current && current.code === ses.room.code) { current.hooks = hooks; current.adv = adv; current.ses = ses; return current.api; }
  if (current) current.api.stop();
  const { db, fs } = await load();
  const code = ses.room.code;
  const state = { code, adv, ses, hooks, cache: new Map(), known: new Set(), claims: {}, unsub: null, timer: null };
  const roomRef = fs.doc(db, 'rooms', code);
  await fs.setDoc(roomRef, { v: 1, title: String(adv.title || ''), createdAt: ses.room.createdAt || Date.now(), open: true }, { merge: true });

  state.unsub = fs.onSnapshot(fs.collection(db, 'rooms', code, 'players'), (snap) => {
    const map = {};
    snap.forEach((d) => {
      const v = d.data();
      state.known.add(d.id);
      map[d.id] = { claim: v.claim || null, notes: v.playerNotes, notesAt: v.playerNotesAt || 0 };
    });
    state.claims = map;
    if (state.hooks.onPlayers) state.hooks.onPlayers(map);
    for (const [pid, v] of Object.entries(map)) {
      const pl = state.ses.players.find((x) => x.id === pid);
      if (pl && typeof v.notes === 'string' && v.notes !== (pl.playerNotes || '') && v.notesAt > (pl.playerNotesAt || 0)) {
        pl.playerNotes = v.notes; pl.playerNotesAt = v.notesAt;
        if (state.hooks.onNotes) state.hooks.onNotes(pid, v.notes);
      }
    }
  });

  const api = {
    code,
    /** Veröffentlicht geänderte Spieler (nur Unterschiede) und räumt entfernte Spieler weg. */
    async pushAll() {
      const a = state.adv, s = state.ses;
      const ids = new Set();
      for (const p of s.players) {
        ids.add(p.id);
        const data = publicPlayer(a, s, p);
        const str = JSON.stringify(data);
        if (state.cache.get(p.id) === str) continue;
        state.cache.set(p.id, str);
        await fs.setDoc(fs.doc(db, 'rooms', code, 'players', p.id), data, { merge: true });
      }
      for (const old of [...state.known]) {
        if (!ids.has(old)) { state.known.delete(old); state.cache.delete(old); await fs.deleteDoc(fs.doc(db, 'rooms', code, 'players', old)); }
      }
      for (const id of ids) state.known.add(id);
    },
    notify() { clearTimeout(state.timer); state.timer = setTimeout(() => api.pushAll().catch((e) => console.warn('Live:', e)), 500); },
    async release(pid) { await fs.setDoc(fs.doc(db, 'rooms', code, 'players', pid), { claim: null }, { merge: true }); },
    claims: () => state.claims,
    /** Beendet die Verbindung und löscht alle Daten dieses Raums aus Firebase. */
    async close() {
      api.stop();
      for (const id of new Set([...state.known, ...state.ses.players.map((p) => p.id)])) { try { await fs.deleteDoc(fs.doc(db, 'rooms', code, 'players', id)); } catch { /* egal */ } }
      try { await fs.deleteDoc(roomRef); } catch { /* egal */ }
    },
    stop() { if (state.unsub) { state.unsub(); state.unsub = null; } clearTimeout(state.timer); if (current && current.code === code) current = null; },
  };
  state.api = api;
  current = state;
  await api.pushAll();
  return api;
}

/** Wird bei jeder Speicherung der Sitzung aufgerufen. */
export function liveNotify(adv, ses) {
  if (current && ses.room && current.code === ses.room.code) { current.adv = adv; current.ses = ses; current.api.notify(); }
}

export function liveActive() { return !!current; }

// ---------------------------------------------------------------- Tablet-Seite

export async function tabletRoom(code) {
  const { db, fs } = await load();
  const snap = await fs.getDoc(fs.doc(db, 'rooms', code));
  return snap.exists() && snap.data().open !== false ? snap.data() : null;
}

export async function tabletWatchPlayers(code, cb) {
  const { db, fs } = await load();
  return fs.onSnapshot(fs.collection(db, 'rooms', code, 'players'), (snap) => {
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    cb(out);
  });
}

export async function tabletWatchPlayer(code, pid, cb) {
  const { db, fs } = await load();
  return fs.onSnapshot(fs.doc(db, 'rooms', code, 'players', pid), (snap) => cb(snap.exists() ? { id: pid, ...snap.data() } : null));
}

export async function tabletClaim(code, pid, device) {
  const { db, fs } = await load();
  await fs.setDoc(fs.doc(db, 'rooms', code, 'players', pid), { claim: { id: device.id, name: device.name, t: Date.now() } }, { merge: true });
}

export async function tabletSaveNotes(code, pid, text) {
  const { db, fs } = await load();
  await fs.setDoc(fs.doc(db, 'rooms', code, 'players', pid), { playerNotes: String(text), playerNotesAt: Date.now() }, { merge: true });
}
