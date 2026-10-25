// Dropbox-Anbindung: Anmeldung per OAuth2 (PKCE, ohne Server) und die paar nötigen API-Aufrufe.
// Die App nutzt einen "App-Ordner": Dropbox legt ihn selbst unter  Dropbox/Apps/<App-Name>/  an.
import { getSettings } from './store.js';

const TOKEN_KEY = 'chronist.dropbox';
const VERIFIER_KEY = 'chronist.dropbox.verifier';

export function redirectUri() {
  const u = new URL(location.href);
  let p = u.pathname.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return `${u.origin}${p}`;
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

function loadTokens() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}
function saveTokens(t) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); }

export function isConnected() {
  const t = loadTokens();
  return !!(t && t.refresh_token);
}

export function disconnect() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function startAuth() {
  const appKey = getSettings().dropboxAppKey.trim();
  if (!appKey) throw new Error('Bitte zuerst den Dropbox App Key eintragen.');
  const { verifier, challenge } = await pkcePair();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(VERIFIER_KEY, verifier); // Fallback, falls sessionStorage beim Rücksprung fehlt
  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: appKey,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    redirect_uri: redirectUri(),
  }).toString();
  location.href = url.toString();
}

/** Beim App-Start aufrufen: verarbeitet den Rücksprung von Dropbox (?code=...). */
export async function handleRedirect() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const err = params.get('error');
  if (!code && !err) return null;

  // Adresszeile säubern, egal was passiert
  history.replaceState(null, '', redirectUri() + location.hash);

  if (err) return { ok: false, message: `Dropbox hat die Anmeldung abgelehnt: ${params.get('error_description') || err}` };

  const verifier = sessionStorage.getItem(VERIFIER_KEY) || localStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  if (!verifier) return { ok: false, message: 'Anmeldung unterbrochen (Prüfcode fehlt). Bitte erneut verbinden.' };

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: getSettings().dropboxAppKey.trim(),
      code_verifier: verifier,
      redirect_uri: redirectUri(),
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.refresh_token) {
    return { ok: false, message: `Dropbox-Anmeldung fehlgeschlagen: ${j.error_description || j.error || res.status}` };
  }
  saveTokens({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (j.expires_in - 60) * 1000,
    account_id: j.account_id,
  });
  return { ok: true, message: 'Dropbox ist verbunden.' };
}

async function accessToken() {
  const t = loadTokens();
  if (!t) throw new Error('Dropbox ist nicht verbunden.');
  if (t.access_token && t.expires_at > Date.now()) return t.access_token;
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token,
      client_id: getSettings().dropboxAppKey.trim(),
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (j.error === 'invalid_grant') disconnect();
    throw new Error(`Dropbox-Anmeldung abgelaufen: ${j.error_description || j.error || res.status}. Bitte neu verbinden.`);
  }
  saveTokens({ ...t, access_token: j.access_token, expires_at: Date.now() + (j.expires_in - 60) * 1000 });
  return j.access_token;
}

// Dropbox-API-Arg muss reines ASCII sein: Sonderzeichen als \uXXXX
function argHeader(obj) {
  return JSON.stringify(obj).replace(/[\u007f-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
}

async function rpc(endpoint, body) {
  const token = await accessToken();
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    const e = new Error(`Dropbox ${endpoint}: ${res.status} ${txt.slice(0, 200)}`);
    e.status = res.status;
    e.summary = txt;
    throw e;
  }
  return res.json();
}

/** Liste aller Dateien in einem Ordner. Fehlt der Ordner, kommt eine leere Liste. */
export async function listFolder(path) {
  const entries = [];
  try {
    let r = await rpc('files/list_folder', { path, limit: 2000 });
    entries.push(...r.entries);
    while (r.has_more) {
      r = await rpc('files/list_folder/continue', { cursor: r.cursor });
      entries.push(...r.entries);
    }
  } catch (e) {
    if (e.status === 409 && /not_found/.test(e.summary || '')) return [];
    throw e;
  }
  return entries.filter((x) => x['.tag'] === 'file');
}

async function uploadBody(path, body, clientModifiedIso) {
  const token = await accessToken();
  const arg = { path, mode: 'overwrite', mute: true, autorename: false };
  if (clientModifiedIso) arg.client_modified = new Date(clientModifiedIso).toISOString().replace(/\.\d+Z$/, 'Z');
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': argHeader(arg),
      'content-type': 'application/octet-stream',
    },
    body,
  });
  if (!res.ok) throw new Error(`Dropbox upload ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export function uploadText(path, text, clientModifiedIso) { return uploadBody(path, text, clientModifiedIso); }
export function uploadBlob(path, blob, clientModifiedIso) { return uploadBody(path, blob, clientModifiedIso); }

export async function downloadBlob(path) {
  const token = await accessToken();
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': argHeader({ path }) },
  });
  if (!res.ok) throw new Error(`Dropbox download ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.blob();
}

export async function downloadText(path) {
  const token = await accessToken();
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': argHeader({ path }) },
  });
  if (!res.ok) throw new Error(`Dropbox download ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.text();
}

export async function deleteFile(path) {
  try {
    await rpc('files/delete_v2', { path });
  } catch (e) {
    if (e.status === 409 && /not_found/.test(e.summary || '')) return;
    throw e;
  }
}

export async function accountInfo() {
  const token = await accessToken();
  const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Dropbox Konto: ${res.status}`);
  return res.json();
}
