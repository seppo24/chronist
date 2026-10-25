// Lokaler Speicher (IndexedDB) + Einstellungen (localStorage).
// Alle Daten liegen zuerst lokal; Dropbox-Sync (sync.js) gleicht sie ab.

const DB_NAME = 'chronist';
const STORE = 'items';

let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'key' });
          s.createIndex('collection', 'collection', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// ---------- Ereignisse ----------
const listeners = new Set();
export function onDataChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(evt) { for (const fn of listeners) { try { fn(evt); } catch (e) { console.error(e); } } }

// ---------- Sammlungen: 'adventures', 'sessions' ----------
export async function listItems(collection) {
  const rows = await tx('readonly', (s) => req2p(s.index('collection').getAll(collection)));
  return rows.map((r) => r.data).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/** Nur die ids einer Sammlung (ohne die Daten zu laden, wichtig bei Bildern). */
export async function listIds(collection) {
  const keys = await tx('readonly', (s) => req2p(s.index('collection').getAllKeys(IDBKeyRange.only(collection))));
  return keys.map((k) => String(k).slice(collection.length + 1));
}

export async function getItem(collection, id) {
  const row = await tx('readonly', (s) => req2p(s.get(`${collection}/${id}`)));
  return row ? row.data : null;
}

/** Speichert ein Objekt. opts.fromSync=true: updatedAt unverändert lassen, kein Upload anstoßen. */
export async function saveItem(collection, obj, opts = {}) {
  if (!opts.fromSync) obj.updatedAt = new Date().toISOString();
  await tx('readwrite', (s) => req2p(s.put({
    key: `${collection}/${obj.id}`, collection, id: obj.id, updatedAt: obj.updatedAt, data: obj,
  })));
  emit({ type: 'save', collection, id: obj.id, fromSync: !!opts.fromSync });
  return obj;
}

export async function deleteItem(collection, id, opts = {}) {
  await tx('readwrite', (s) => req2p(s.delete(`${collection}/${id}`)));
  if (!opts.fromSync) addPendingDelete(collection, id);
  emit({ type: 'delete', collection, id, fromSync: !!opts.fromSync });
}

export async function clearAllData() {
  await tx('readwrite', (s) => req2p(s.clear()));
  emit({ type: 'clear' });
}

export async function exportAll() {
  const adventures = await listItems('adventures');
  const sessions = await listItems('sessions');
  return { format: 'chronist-backup', version: 1, exportedAt: new Date().toISOString(), adventures, sessions };
}

export async function importAll(backup) {
  if (!backup || backup.format !== 'chronist-backup') throw new Error('Das ist keine gültige Chronist-Sicherung.');
  let n = 0;
  for (const a of backup.adventures || []) { await saveItem('adventures', a); n++; }
  for (const s of backup.sessions || []) { await saveItem('sessions', s); n++; }
  return n;
}

// ---------- Einstellungen (nur auf diesem Gerät, werden NICHT synchronisiert) ----------
const SETTINGS_KEY = 'chronist.settings';
const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'claude-sonnet-5-5',
  maxTokens: 6000,
  dropboxAppKey: '',
  autoSync: true,
  tokensIn: 0,
  tokensOut: 0,
  tokensCached: 0,
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  emit({ type: 'settings' });
  return next;
}
export function addTokenUsage(u) {
  if (!u) return;
  const s = getSettings();
  saveSettings({
    tokensIn: s.tokensIn + (u.input_tokens || 0),
    tokensOut: s.tokensOut + (u.output_tokens || 0),
    tokensCached: s.tokensCached + (u.cache_read_input_tokens || 0),
  });
}

// ---------- Ausstehende Löschungen (für Sync) ----------
const PD_KEY = 'chronist.pendingDeletes';
export function getPendingDeletes() {
  try { return JSON.parse(localStorage.getItem(PD_KEY) || '[]'); } catch { return []; }
}
function addPendingDelete(collection, id) {
  const list = getPendingDeletes().filter((d) => !(d.collection === collection && d.id === id));
  list.push({ collection, id, deletedAt: new Date().toISOString() });
  localStorage.setItem(PD_KEY, JSON.stringify(list));
}
export function removePendingDelete(collection, id) {
  const list = getPendingDeletes().filter((d) => !(d.collection === collection && d.id === id));
  localStorage.setItem(PD_KEY, JSON.stringify(list));
}
