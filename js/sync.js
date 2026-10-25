// Abgleich zwischen lokalem Speicher und Dropbox-App-Ordner.
//  /adventures/<id>.json   /sessions/<id>.json   /deleted/<collection>__<id>.json (Löschvermerke)
// Regel: Die neuere Fassung (nach "updatedAt") gewinnt.
import * as dbx from './dropbox.js';
import {
  listItems, listIds, getItem, saveItem, deleteItem, onDataChange, getSettings,
  getPendingDeletes, removePendingDelete,
} from './store.js';
import { debounce } from './util.js';

const COLLECTIONS = ['adventures', 'sessions'];
const statusListeners = new Set();
let status = { state: 'off', message: 'Dropbox nicht verbunden', lastSync: null };
let running = null;
const dirty = new Set();

export function getStatus() { return status; }
export function onStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }
function setStatus(patch) {
  status = { ...status, ...patch };
  for (const fn of statusListeners) { try { fn(status); } catch (e) { console.error(e); } }
}

const secs = (iso) => Math.floor(Date.parse(iso) / 1000) * 1000;
const idFromName = (name) => name.replace(/\.json$/, '');

async function pushItem(collection, obj) {
  if (collection === 'images') {
    if (obj.blob) await dbx.uploadBlob(`/images/${obj.id}.jpg`, obj.blob, obj.updatedAt);
    return;
  }
  await dbx.uploadText(`/${collection}/${obj.id}.json`, JSON.stringify(obj), obj.updatedAt);
}

const remotePath = (collection, id) => `/${collection}/${id}${collection === 'images' ? '.jpg' : '.json'}`;

// Bilder ändern sich nie (neue Fassung = neue id): fehlt eine Seite, wird kopiert; Löschvermerke gelten sofort.
async function syncImages(tombs, stats) {
  const remote = await dbx.listFolder('/images');
  const remoteMap = new Map(remote.map((r) => [r.name.replace(/\.jpg$/, ''), r]));
  const localIds = new Set(await listIds('images'));
  for (const id of localIds) {
    if (tombs.has(`images__${id}`)) { await deleteItem('images', id, { fromSync: true }); stats.del++; continue; }
    if (!remoteMap.has(id)) {
      const rec = await getItem('images', id);
      if (rec) { await pushItem('images', rec); stats.up++; }
    }
  }
  for (const [id, r] of remoteMap) {
    if (localIds.has(id)) continue;
    if (tombs.has(`images__${id}`)) { await dbx.deleteFile(`/images/${r.name}`); continue; }
    const blob = await dbx.downloadBlob(`/images/${r.name}`);
    await saveItem('images', { id, blob, size: blob.size, updatedAt: r.client_modified }, { fromSync: true });
    stats.down++;
  }
}

export async function syncAll() {
  if (!dbx.isConnected()) { setStatus({ state: 'off', message: 'Dropbox nicht verbunden' }); return { ok: false, skipped: true }; }
  if (running) return running;
  running = (async () => {
    setStatus({ state: 'busy', message: 'Synchronisiere …' });
    const stats = { up: 0, down: 0, del: 0 };
    try {
      // 1. Löschvermerke aus Dropbox lesen und lokal anwenden
      const tombEntries = await dbx.listFolder('/deleted');
      const tombs = new Map(); // key -> deletedAt(ms)
      for (const t of tombEntries) tombs.set(idFromName(t.name), Date.parse(t.client_modified));

      // 2. eigene ausstehende Löschungen nach Dropbox schicken
      for (const d of getPendingDeletes()) {
        await dbx.deleteFile(remotePath(d.collection, d.id));
        await dbx.uploadText(`/deleted/${d.collection}__${d.id}.json`, JSON.stringify(d), d.deletedAt);
        tombs.set(`${d.collection}__${d.id}`, Date.parse(d.deletedAt));
        removePendingDelete(d.collection, d.id);
        stats.del++;
      }

      for (const col of COLLECTIONS) {
        const remote = await dbx.listFolder(`/${col}`);
        const remoteMap = new Map(remote.map((r) => [idFromName(r.name), r]));
        const local = await listItems(col);
        const localMap = new Map(local.map((l) => [l.id, l]));

        // lokale Objekte
        for (const item of local) {
          const tomb = tombs.get(`${col}__${item.id}`);
          if (tomb && tomb >= secs(item.updatedAt)) {
            await deleteItem(col, item.id, { fromSync: true });
            stats.del++;
            continue;
          }
          const r = remoteMap.get(item.id);
          if (!r) { await pushItem(col, item); stats.up++; continue; }
          const rt = Date.parse(r.client_modified);
          const lt = secs(item.updatedAt);
          if (lt > rt) { await pushItem(col, item); stats.up++; }
          else if (rt > lt) {
            const obj = JSON.parse(await dbx.downloadText(`/${col}/${r.name}`));
            await saveItem(col, obj, { fromSync: true });
            stats.down++;
          }
        }
        // nur in Dropbox vorhandene Objekte
        for (const [id, r] of remoteMap) {
          if (localMap.has(id)) continue;
          const tomb = tombs.get(`${col}__${id}`);
          if (tomb && tomb >= Date.parse(r.client_modified)) { await dbx.deleteFile(`/${col}/${r.name}`); continue; }
          const obj = JSON.parse(await dbx.downloadText(`/${col}/${r.name}`));
          await saveItem(col, obj, { fromSync: true });
          stats.down++;
        }
      }
      await syncImages(tombs, stats);
      const when = new Date().toISOString();
      setStatus({
        state: 'ok', lastSync: when,
        message: `Synchronisiert (↑${stats.up} ↓${stats.down}${stats.del ? ` ✕${stats.del}` : ''})`,
      });
      return { ok: true, ...stats };
    } catch (e) {
      console.error(e);
      setStatus({ state: 'error', message: `Sync-Fehler: ${e.message}` });
      return { ok: false, error: e.message };
    } finally {
      running = null;
    }
  })();
  return running;
}

// Einzelne Objekte kurz nach dem Speichern hochladen
const flush = debounce(async () => {
  if (!dbx.isConnected() || !getSettings().autoSync) { dirty.clear(); return; }
  const todo = [...dirty];
  dirty.clear();
  setStatus({ state: 'busy', message: 'Speichere in Dropbox …' });
  try {
    for (const key of todo) {
      const [col, id] = key.split('/');
      const obj = await getItem(col, id);
      if (obj) await pushItem(col, obj);
    }
    // gelöschte Objekte werden über einen vollständigen Abgleich behandelt
    if (getPendingDeletes().length) await syncAll();
    else setStatus({ state: 'ok', lastSync: new Date().toISOString(), message: 'Synchronisiert' });
  } catch (e) {
    console.error(e);
    setStatus({ state: 'error', message: `Sync-Fehler: ${e.message}` });
    for (const k of todo) dirty.add(k);
  }
}, 3500);

export function initSync() {
  onDataChange((evt) => {
    if (evt.fromSync) return;
    if (!dbx.isConnected() || !getSettings().autoSync) return;
    if (evt.type === 'save') { dirty.add(`${evt.collection}/${evt.id}`); flush(); }
    if (evt.type === 'delete') flush();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && dbx.isConnected() && getSettings().autoSync) syncAll();
  });
  if (dbx.isConnected()) {
    setStatus({ state: 'idle', message: 'Dropbox verbunden' });
    if (getSettings().autoSync) syncAll();
  }
}

export function refreshStatusAfterConnect() {
  setStatus({ state: dbx.isConnected() ? 'idle' : 'off', message: dbx.isConnected() ? 'Dropbox verbunden' : 'Dropbox nicht verbunden' });
}
