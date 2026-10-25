// Startseite: Abenteuer und Sitzungen.
import { h, clear, formDialog, confirmDialog, fmtDate } from '../util.js';
import { listItems, saveItem, getSettings, deleteItem } from '../store.js';
import { newAdventure, newSession, progress, STATUS_LABELS } from '../adventure.js';

export async function render(main, _params, ctx) {
  ctx.setTitle('Chronist');
  const root = h('div', { class: 'view home' });
  main.appendChild(root);

  const draw = async () => {
    const advs = await listItems('adventures');
    const sessions = await listItems('sessions');
    clear(root);

    if (!getSettings().apiKey) {
      root.appendChild(h('div', { class: 'banner warn' },
        '🔑 Für die Entwicklung mit Claude fehlt noch dein API-Key. ',
        h('a', { class: 'btn small', href: '#/settings' }, 'Einstellungen öffnen')));
    }

    root.appendChild(h('div', { class: 'row between center gap wrap' },
      h('h2', {}, 'Deine Abenteuer'),
      h('button', {
        class: 'btn primary',
        onclick: async () => {
          const r = await formDialog('Neues Abenteuer', [
            { key: 'title', label: 'Titel', placeholder: 'z. B. Die Schule der Sternenzauberer' },
            { key: 'setting', label: 'Vorbild / Setting (Gefühl, nicht Kopie)', type: 'textarea', rows: 3, placeholder: 'z. B. Zauberschule mit Internat-Flair, Rätseln und Freundschaft' },
            { key: 'playerCount', label: 'Spieler (ohne Spielleitung)', type: 'number', value: 5, min: 1, max: 12 },
          ], { okText: 'Anlegen' });
          if (!r) return;
          const adv = newAdventure({ title: r.title.trim() || 'Neues Abenteuer', setting: r.setting.trim(), playerCount: r.playerCount });
          await saveItem('adventures', adv);
          location.hash = `#/adventure/${adv.id}/chat`;
        },
      }, '+ Neues Abenteuer')));

    if (!advs.length) {
      root.appendChild(h('div', { class: 'empty' },
        h('p', {}, '🎲 Noch nichts da. Lege dein erstes Abenteuer an – Claude hilft dir dann Schritt für Schritt bei Idee, Regelwerk, Handlung, Szenen und NSCs.'),
        h('p', { class: 'muted' }, 'Tipp: Beschreibe beim Anlegen das Gefühl, das du dir wünschst (z. B. „Zauberschule“ oder „Action-Fantasy mit Licht und Dunkelheit“).')));
    }

    for (const adv of advs) {
      const p = progress(adv);
      const running = sessions.find((s) => s.adventureId === adv.id && s.status !== 'beendet');
      root.appendChild(h('div', { class: 'card adv' },
        h('div', { class: 'row between gap center' },
          h('h3', {}, adv.title),
          h('span', { class: `chip status-${adv.status}` }, STATUS_LABELS[adv.status] || adv.status)),
        adv.setting ? h('p', { class: 'muted clamp' }, adv.setting) : null,
        h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${p.pct}%` } })),
        h('div', { class: 'muted small' }, `${p.done}/${p.total} Bausteine · ${adv.scenes.length} Szenen · ${adv.npcs.length} NSCs · ${adv.locations.length} Orte · geändert ${fmtDate(adv.updatedAt)}`),
        h('div', { class: 'row gap wrap' },
          h('a', { class: 'btn', href: `#/adventure/${adv.id}/chat` }, '🛠 Werkstatt'),
          h('button', {
            class: 'btn primary',
            onclick: async () => {
              if (running) { location.hash = `#/session/${running.id}`; return; }
              const ses = newSession(adv);
              await saveItem('sessions', ses);
              location.hash = `#/session/${ses.id}`;
            },
          }, running ? '▶ Sitzung fortsetzen' : '▶ Spielen'))));
    }

    if (sessions.length) {
      root.appendChild(h('h2', {}, 'Sitzungen'));
      for (const s of sessions) {
        root.appendChild(h('div', { class: 'card row between gap center wrap' },
          h('div', {},
            h('strong', {}, s.name),
            h('div', { class: 'muted small' }, `${s.adventureTitle} · ${s.status === 'beendet' ? 'beendet' : 'laufend'} · ${fmtDate(s.updatedAt)}`)),
          h('div', { class: 'row gap' },
            h('a', { class: 'btn small primary', href: `#/session/${s.id}` }, s.status === 'beendet' ? 'Ansehen' : 'Fortsetzen'),
            h('button', {
              class: 'btn small danger', 'aria-label': 'Sitzung löschen',
              onclick: async () => {
                if (await confirmDialog(`Sitzung „${s.name}“ löschen?`, { okText: 'Löschen', danger: true })) { await deleteItem('sessions', s.id); draw(); }
              },
            }, '🗑'))));
      }
    }
  };
  await draw();
}
