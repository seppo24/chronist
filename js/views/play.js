// Spieler-Tablet: zeigt live den eigenen Charakterbogen. Route: #/play/<Raumcode>/<Spieler-id oder ->/<Konfiguration oder ->
import { h, clear, confirmDialog, debounce, uid } from '../util.js';
import * as live from '../live.js';

const deviceInfo = () => {
  try {
    const d = JSON.parse(localStorage.getItem('chronist.device') || 'null');
    if (d && d.id) return d;
  } catch { /* neu anlegen */ }
  const d = { id: uid('dev'), name: `Tablet ${Math.random().toString(36).slice(2, 5).toUpperCase()}` };
  try { localStorage.setItem('chronist.device', JSON.stringify(d)); } catch { /* ohne Speicher */ }
  return d;
};
const keyFor = (code) => `chronist.tablet.${code}`;
const getPaired = (code) => { try { return localStorage.getItem(keyFor(code)) || ''; } catch { return ''; } };
const setPaired = (code, pid) => { try { if (pid) localStorage.setItem(keyFor(code), pid); else localStorage.removeItem(keyFor(code)); } catch { /* egal */ } };

export async function render(main, [code, pidArg, cfgArg], ctx) {
  ctx.setTitle('Spieler-Tablet');
  const cleanups = [];
  const root = h('div', { class: 'view play' });
  main.appendChild(root);
  const say = (title, text, extra) => { clear(root); root.appendChild(h('div', { class: 'card playmsg' }, h('h2', {}, title), h('p', {}, text), extra || null)); };

  // Konfiguration aus dem Link übernehmen und aus der Adresse entfernen
  if (cfgArg && cfgArg !== '-') {
    const cfg = live.decodeConfig(cfgArg);
    if (cfg) live.setConfig(cfg);
    history.replaceState(null, '', `#/play/${code}/${pidArg && pidArg !== '-' ? pidArg : '-'}`);
  }
  if (!live.getConfig()) { say('Noch nicht verbunden', 'Öffne bitte den Link, den dir der Spielleiter geschickt hat. Er enthält alles Nötige.'); return; }

  let wake = null;
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch { /* optional */ }
  cleanups.push(() => { try { wake && wake.release(); } catch { /* egal */ } });

  const device = deviceInfo();
  say('Verbinde …', 'Einen Moment bitte.');
  let room;
  try { room = await live.tabletRoom(code); } catch (e) { say('Keine Verbindung', `Der Spielraum ließ sich nicht erreichen: ${e.message || e}`); return; }
  if (!room) { say('Spielraum nicht gefunden', 'Der Raum existiert nicht (mehr). Frage den Spielleiter nach einem neuen Link.'); return; }

  let pid = pidArg && pidArg !== '-' ? pidArg : getPaired(code);
  if (pidArg && pidArg !== '-') setPaired(code, pidArg);

  async function showPick(note) {
    clear(root);
    const list = h('div', { class: 'list' });
    root.append(
      h('h2', {}, room.title || 'Abenteuer'),
      h('p', {}, note || 'Wer bist du? Tippe auf deinen Namen. Dieses Tablet gehört dann dir.'),
      list);
    const unsub = await live.tabletWatchPlayers(code, (players) => {
      clear(list);
      if (!players.length) list.appendChild(h('div', { class: 'empty' }, 'Der Spielleiter hat noch keine Spieler angelegt.'));
      for (const p of players.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
        const other = p.claim && p.claim.id !== device.id;
        list.appendChild(h('button', {
          class: `btn playpick${other ? ' taken' : ''}`, type: 'button', 'data-pid': p.id,
          onclick: async () => {
            if (other && !(await confirmDialog(`„${p.name}“ gehört schon einem anderen Tablet (${p.claim.name}). Trotzdem übernehmen?`, { okText: 'Übernehmen' }))) return;
            setPaired(code, p.id); pid = p.id;
            cleanups.splice(cleanups.indexOf(unsub), 1); unsub();
            await showSheet();
          },
        }, h('strong', {}, p.name || 'Spieler'), p.character ? h('span', { class: 'muted small block' }, p.character) : null, other ? h('span', { class: 'small block' }, '📱 schon vergeben') : null));
      }
    });
    cleanups.push(unsub);
  }

  async function showSheet() {
    clear(root);
    const sheet = h('div', { class: 'sheet' });
    root.appendChild(sheet);
    let seenClaim = false;
    let claimed = false;
    let noteBox = null;
    let lastNotes = null;
    const saveNotes = debounce(async () => { try { await live.tabletSaveNotes(code, pid, noteBox.value); } catch (e) { console.warn(e); } }, 700);
    const unsub = await live.tabletWatchPlayer(code, pid, async (p) => {
      if (!p) { setPaired(code, ''); unsub(); await showPick('Dieser Spieler ist nicht mehr in der Sitzung. Bitte neu wählen.'); return; }
      const mine = p.claim && p.claim.id === device.id;
      if (mine) seenClaim = true;
      if (!mine && seenClaim) { setPaired(code, ''); unsub(); await showPick('Die Zuordnung dieses Tablets wurde aufgehoben. Bitte neu wählen.'); return; }
      if (!mine && !claimed) { claimed = true; live.tabletClaim(code, pid, device).catch((e) => console.warn(e)); }
      ctx.setTitle(p.character || p.name || 'Charakterbogen');
      const focused = noteBox && document.activeElement === noteBox;
      const keepNotes = focused ? noteBox.value : (typeof p.playerNotes === 'string' ? p.playerNotes : (lastNotes ?? ''));
      lastNotes = keepNotes;
      clear(sheet);
      sheet.append(
        h('div', { class: 'sheet-head' },
          h('h2', {}, p.character || p.name || 'Spieler'),
          h('div', { class: 'muted' }, [p.character ? p.name : '', p.rule, p.adventure].filter(Boolean).join(' · '))),
        (p.attrs || []).length ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Werte'),
          h('div', { class: 'attr-grid' }, p.attrs.map((a) => h('div', { class: 'attr-tile', title: a.description || '' },
            h('div', { class: 'attr-val' }, a.value === null || a.value === undefined ? '–' : String(a.value)), h('div', { class: 'attr-name' }, a.name))))) : null,
        (p.resources || []).length ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Vorräte'),
          p.resources.map((r) => {
            const pct = r.max > 0 ? Math.max(0, Math.min(100, Math.round((r.value / r.max) * 100))) : 0;
            return h('div', { class: `bar${pct <= 25 ? ' low' : ''}`, 'data-res': r.key },
              h('div', { class: 'bar-label' }, h('span', {}, r.name), h('strong', {}, `${r.value} / ${r.max}`)),
              h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: `${pct}%` } })));
          })) : null,
        p.conditions ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Zustände'), h('p', { class: 'sheet-text' }, p.conditions)) : null,
        p.skills ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Fertigkeiten & Ausrüstung'), h('p', { class: 'sheet-text' }, p.skills)) : null,
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Gegenstände'),
          (p.items || []).length ? h('div', { class: 'row gap wrap' }, p.items.map((i) => h('span', { class: 'chip' }, `🎒 ${i}`))) : h('p', { class: 'muted' }, 'Du trägst nichts Besonderes bei dir.'),
          (p.groupItems || []).length ? h('p', { class: 'muted small' }, 'Gruppe:') : null,
          (p.groupItems || []).length ? h('div', { class: 'row gap wrap' }, p.groupItems.map((i) => h('span', { class: 'chip' }, `👥 ${i}`))) : null));
      noteBox = h('textarea', { rows: 5, class: 'sheet-notes', placeholder: 'Deine Notizen …', 'aria-label': 'Deine Notizen' }, keepNotes);
      noteBox.addEventListener('input', saveNotes);
      sheet.append(
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Meine Notizen'), noteBox),
        h('div', { class: 'row end' }, h('button', {
          class: 'btn small', type: 'button', 'data-act': 'unpair',
          onclick: async () => {
            if (!(await confirmDialog('Dieses Tablet von diesem Spieler lösen?', { okText: 'Lösen' }))) return;
            setPaired(code, ''); unsub(); await showPick();
          },
        }, 'Tablet-Zuordnung lösen')));
    });
    cleanups.push(unsub);
  }

  if (pid) await showSheet(); else await showPick();
  return () => { saveCleanup(); };
  function saveCleanup() { for (const c of cleanups.splice(0)) { try { c(); } catch { /* egal */ } } }
}
