// Einstieg: Router, Kopfzeile, Start der Dienste.
import { h, clear, toast } from './util.js';
import { APP_VERSION, APP_NAME } from './version.js';
import { handleRedirect } from './dropbox.js';
import { initSync, onStatus, syncAll } from './sync.js';
import * as dbx from './dropbox.js';

const routes = [
  [/^#\/?$/, () => import('./views/home.js')],
  [/^#\/adventure\/([^/]+)(?:\/(\w+))?$/, () => import('./views/workshop.js')],
  [/^#\/session\/([^/]+)(?:\/(\w+))?$/, () => import('./views/session.js')],
  [/^#\/play\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?$/, () => import('./views/play.js')],
  [/^#\/settings$/, () => import('./views/settings.js')],
  [/^#\/help(?:\/(\w+))?$/, () => import('./views/help.js')],
];

const titleEl = h('div', { class: 'title' }, APP_NAME);
const backBtn = h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Startseite' }, '🏠');
const syncBtn = h('button', { class: 'icon-btn sync', 'aria-label': 'Dropbox-Status', title: 'Dropbox' }, '☁');
const header = h('header', { class: 'topbar' },
  backBtn, titleEl, syncBtn,
  h('a', { class: 'icon-btn', href: '#/help', 'aria-label': 'Hilfe' }, '❓'),
  h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Einstellungen' }, '⚙️'));
const main = h('main', { id: 'main' });
const footer = h('footer', { class: 'footer muted small' }, `${APP_NAME} · v${APP_VERSION}`);

const ctx = {
  setTitle(t) { titleEl.textContent = t; document.title = `${t} – Chronist`; },
};

let cleanup = null;
let renderToken = 0;

async function route() {
  const token = ++renderToken;
  if (cleanup) { try { await cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  clear(main);
  main.scrollTop = 0;
  const hash = location.hash || '#/';
  document.body.dataset.route = hash.split('/')[1] || 'home';
  backBtn.classList.toggle('invisible', hash === '#/' || hash === '' || hash === '#');
  ctx.setTitle(APP_NAME);

  const hit = routes.map(([re, load]) => [hash.match(re), load]).find(([m]) => m);
  if (!hit) {
    main.appendChild(h('div', { class: 'empty' }, 'Seite nicht gefunden.', h('p', {}, h('a', { class: 'btn', href: '#/' }, 'Zur Startseite'))));
    return;
  }
  const [m, load] = hit;
  try {
    const mod = await load();
    if (token !== renderToken) return;
    const c = await mod.render(main, m.slice(1).map((x) => (x ? decodeURIComponent(x) : x)), ctx);
    if (token !== renderToken) { if (typeof c === 'function') c(); return; }
    cleanup = typeof c === 'function' ? c : null;
  } catch (e) {
    console.error(e);
    clear(main);
    main.appendChild(h('div', { class: 'empty error' }, `Fehler beim Anzeigen: ${e.message}`));
  }
}

function setupSyncButton() {
  onStatus((st) => {
    syncBtn.dataset.state = st.state;
    syncBtn.textContent = { off: '☁', idle: '☁', busy: '🔄', ok: '☁✔', error: '☁⚠' }[st.state] || '☁';
    syncBtn.title = st.message;
  });
  syncBtn.addEventListener('click', async () => {
    if (!dbx.isConnected()) { location.hash = '#/settings'; return; }
    toast('Synchronisiere …', 'info', 1200);
    const r = await syncAll();
    toast(r.ok ? 'Synchronisiert' : `Sync-Fehler: ${r.error || ''}`, r.ok ? 'ok' : 'err', 4000);
    if (r.ok) route();
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker:', e));
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });
window.addEventListener('hashchange', route);

async function start() {
  document.getElementById('app').append(header, main, footer);
  setupSyncButton();

  let redirectResult = null;
  try { redirectResult = await handleRedirect(); } catch (e) { redirectResult = { ok: false, message: e.message }; }
  if (redirectResult) {
    location.hash = '#/settings';
    toast(redirectResult.message, redirectResult.ok ? 'ok' : 'err', 6000);
  }

  initSync();
  registerServiceWorker();
  await route();
}

start();
