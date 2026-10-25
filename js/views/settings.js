// Einstellungen: Claude, Dropbox, Daten, Version.
import { h, clear, toast, confirmDialog, copyText, downloadText } from '../util.js';
import {
  getSettings, saveSettings, exportAll, importAll, clearAllData,
} from '../store.js';
import * as dbx from '../dropbox.js';
import { syncAll, onStatus, refreshStatusAfterConnect } from '../sync.js';
import { streamMessage } from '../claude.js';
import { APP_VERSION, APP_BUILD_DATE } from '../version.js';
import { fmtDate } from '../util.js';

const MODELS = [
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (Standard – schnell, günstig)'],
  ['claude-opus-5-5', 'Claude Opus 5.5 (stärker, teurer)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (am günstigsten)'],
  ['claude-fable-5-1', 'Claude Fable 5.1 (Spitzenmodell, am teuersten)'],
];

export async function render(main, _p, ctx) {
  ctx.setTitle('Einstellungen');
  const s = getSettings();
  const root = h('div', { class: 'view settings' });
  main.appendChild(root);

  // ---- Claude
  const keyIn = h('input', { type: 'password', value: s.apiKey, placeholder: 'sk-ant-…', autocomplete: 'off', spellcheck: false });
  const modelSel = h('select', {}, [
    ...MODELS.map(([v, l]) => h('option', { value: v, selected: v === s.model }, l)),
    h('option', { value: '__custom', selected: !MODELS.some((m) => m[0] === s.model) }, 'Eigener Modellname …'),
  ]);
  const customIn = h('input', { type: 'text', value: MODELS.some((m) => m[0] === s.model) ? '' : s.model, placeholder: 'Modell-ID', class: MODELS.some((m) => m[0] === s.model) ? 'hidden' : '' });
  modelSel.addEventListener('change', () => customIn.classList.toggle('hidden', modelSel.value !== '__custom'));
  const maxIn = h('input', { type: 'number', min: 1000, max: 16000, step: 500, value: s.maxTokens });
  const testOut = h('div', { class: 'muted small' });

  const saveClaude = () => {
    const model = modelSel.value === '__custom' ? customIn.value.trim() || s.model : modelSel.value;
    saveSettings({ apiKey: keyIn.value.trim(), model, maxTokens: Math.max(1000, Math.min(16000, Number(maxIn.value) || 6000)) });
  };
  for (const el of [keyIn, modelSel, customIn, maxIn]) el.addEventListener('change', saveClaude);

  const usage = h('div', { class: 'muted small' });
  const drawUsage = () => {
    const u = getSettings();
    usage.textContent = `Bisher verbraucht: ${u.tokensIn.toLocaleString('de-DE')} Eingabe-Tokens (davon ${u.tokensCached.toLocaleString('de-DE')} aus dem Cache), ${u.tokensOut.toLocaleString('de-DE')} Ausgabe-Tokens.`;
  };
  drawUsage();

  root.appendChild(h('div', { class: 'card' },
    h('h3', {}, '🤖 Claude'),
    h('p', { class: 'muted small' }, 'Der Key bleibt nur in diesem Browser und wird weder in Dropbox noch auf GitHub gespeichert. Auf jedem Gerät einmal eingeben.'),
    h('label', { class: 'field' }, h('span', {}, 'API-Key'), keyIn),
    h('label', { class: 'inline' },
      h('input', { type: 'checkbox', onchange: (e) => { keyIn.type = e.target.checked ? 'text' : 'password'; } }), ' Key anzeigen'),
    h('label', { class: 'field' }, h('span', {}, 'Modell'), modelSel, customIn),
    h('label', { class: 'field' }, h('span', {}, 'Maximale Antwortlänge (Tokens)'), maxIn),
    h('div', { class: 'row gap wrap' },
      h('button', {
        class: 'btn',
        onclick: async () => {
          saveClaude();
          testOut.textContent = 'Teste …';
          try {
            const r = await streamMessage({ system: 'Antworte nur mit dem Wort OK.', messages: [{ role: 'user', content: 'Test' }], tools: [] });
            const t = r.content.map((b) => b.text || '').join('').trim();
            testOut.textContent = `✔ Verbindung funktioniert (Antwort: ${t || '…'}).`;
            drawUsage();
          } catch (e) { testOut.textContent = `✖ ${e.message}`; }
        },
      }, 'Verbindung testen'),
      h('button', { class: 'btn', onclick: () => { saveSettings({ tokensIn: 0, tokensOut: 0, tokensCached: 0 }); drawUsage(); } }, 'Zähler zurücksetzen')),
    testOut, usage));

  // ---- Dropbox
  const keyDbx = h('input', { type: 'text', value: s.dropboxAppKey, placeholder: 'App key aus der Dropbox App Console', autocomplete: 'off', spellcheck: false });
  keyDbx.addEventListener('change', () => saveSettings({ dropboxAppKey: keyDbx.value.trim() }));
  const statusLine = h('div', { class: 'muted small' });
  const dbxBox = h('div', { class: 'card' });
  const unsub = onStatus((st) => {
    statusLine.textContent = `${st.message}${st.lastSync ? ` · zuletzt ${fmtDate(st.lastSync)}` : ''}`;
  });

  const drawDbx = () => {
    clear(dbxBox);
    const connected = dbx.isConnected();
    dbxBox.append(
      h('h3', {}, '☁️ Dropbox'),
      h('p', { class: 'muted small' }, 'Deine Abenteuer und Sitzungen werden als Dateien im App-Ordner deiner Dropbox gesichert und zwischen Geräten abgeglichen. Einrichtung: siehe Anleitung.'),
      h('label', { class: 'field' }, h('span', {}, 'Dropbox App Key'), keyDbx),
      h('div', { class: 'field' }, h('span', {}, 'Redirect-URI (genau so in der Dropbox App Console eintragen)'),
        h('div', { class: 'row gap' }, h('code', { class: 'uri grow' }, dbx.redirectUri()), h('button', { class: 'btn small', onclick: () => copyText(dbx.redirectUri()) }, 'Kopieren'))),
      statusLine,
      h('div', { class: 'row gap wrap' },
        connected ? null : h('button', {
          class: 'btn primary',
          onclick: async () => {
            saveSettings({ dropboxAppKey: keyDbx.value.trim() });
            try { await dbx.startAuth(); } catch (e) { toast(e.message, 'err', 5000); }
          },
        }, 'Mit Dropbox verbinden'),
        connected ? h('button', {
          class: 'btn primary',
          onclick: async () => { const r = await syncAll(); toast(r.ok ? 'Synchronisiert' : `Fehler: ${r.error || ''}`, r.ok ? 'ok' : 'err', 4000); },
        }, '🔄 Jetzt synchronisieren') : null,
        connected ? h('button', {
          class: 'btn',
          onclick: async () => {
            if (await confirmDialog('Dropbox auf diesem Gerät trennen? Lokale Daten bleiben erhalten.', { okText: 'Trennen' })) {
              dbx.disconnect(); refreshStatusAfterConnect(); drawDbx();
            }
          },
        }, 'Trennen') : null),
      connected ? h('label', { class: 'inline' },
        h('input', { type: 'checkbox', checked: getSettings().autoSync, onchange: (e) => saveSettings({ autoSync: e.target.checked }) }),
        ' Automatisch synchronisieren') : null);
  };
  drawDbx();
  root.appendChild(dbxBox);

  // ---- Daten
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try {
      const n = await importAll(JSON.parse(await f.text()));
      toast(`${n} Einträge importiert`, 'ok');
    } catch (e) { toast(`Import fehlgeschlagen: ${e.message}`, 'err', 5000); }
    fileIn.value = '';
  });
  root.appendChild(h('div', { class: 'card' },
    h('h3', {}, '💾 Daten'),
    h('div', { class: 'row gap wrap' },
      h('button', {
        class: 'btn',
        onclick: async () => downloadText(`chronist-sicherung-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportAll(), null, 2)),
      }, 'Sicherung exportieren'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Sicherung importieren'),
      fileIn,
      h('button', {
        class: 'btn danger',
        onclick: async () => {
          if (await confirmDialog('ALLE lokalen Abenteuer und Sitzungen auf diesem Gerät löschen? (Dropbox bleibt unberührt, falls verbunden – beim nächsten Abgleich kommen die Daten zurück.)', { okText: 'Alles löschen', danger: true })) {
            await clearAllData(); toast('Lokale Daten gelöscht', 'ok');
          }
        },
      }, 'Lokale Daten löschen'))));

  // ---- Version / App
  const cacheLine = h('span', {}, '…');
  if (window.caches) caches.keys().then((k) => { cacheLine.textContent = k.filter((x) => x.startsWith('chronist-')).join(', ') || 'kein Cache'; });
  else cacheLine.textContent = 'nicht verfügbar';
  const installBtn = h('button', { class: 'btn hidden' }, '📲 App installieren');
  if (window.__installPrompt) {
    installBtn.classList.remove('hidden');
    installBtn.onclick = async () => { window.__installPrompt.prompt(); window.__installPrompt = null; installBtn.classList.add('hidden'); };
  }
  root.appendChild(h('div', { class: 'card' },
    h('h3', {}, 'ℹ️ App'),
    h('p', {}, `Version ${APP_VERSION} (${APP_BUILD_DATE})`),
    h('p', { class: 'muted small' }, 'Service-Worker-Cache: ', cacheLine),
    h('div', { class: 'row gap wrap' },
      installBtn,
      h('a', { class: 'btn', href: '#/help/changelog' }, 'Versionsverlauf'),
      h('button', {
        class: 'btn',
        onclick: async () => {
          if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
          if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
          toast('Cache geleert, lade neu …', 'ok', 1500);
          setTimeout(() => location.reload(), 600);
        },
      }, 'Update erzwingen (Cache leeren)'))));

  return () => unsub();
}
