// Spielleiter-Tab „Weg“: Flowchart mit Spielstand (aktuell / besucht / frei / gesperrt).
import { h, clear } from '../util.js';
import { md } from '../md.js';
import { createFlow, sceneById, sceneStatus, gateText, hasFlow, lockReason, lockBadge } from '../flow.js';
import { reqControls } from './reqs.js';
import { imageStrip } from '../images.js';

const STATE_TEXT = {
  current: '▶ Aktuelle Szene',
  visited: '✔ Schon besucht',
  available: 'Frei – kann besucht werden',
  locked: '🔒 Noch gesperrt',
};

/** enter(id) wechselt die Szene (inkl. Rückfrage bei gesperrten); saveSes() speichert die Sitzung. */
export function playFlow(panel, adv, ses, { enter, saveSes, addLog = () => {} }) {
  if (!adv.scenes.length) {
    panel.appendChild(h('div', { class: 'empty' }, 'Dieses Abenteuer hat noch keine Szenen.'));
    return;
  }
  let selected = ses.currentSceneId || adv.scenes[0].id;

  const nodeInfo = (s) => {
    const st = sceneStatus(adv, ses, s.id);
    const badge = { current: '▶', visited: '✔', available: '', locked: lockBadge(st) }[st.state];
    return { cls: st.state, badge: badge + ((s.images || []).length ? ' 🗺️' : ''), gate: gateText(adv, s) };
  };

  const flow = createFlow({
    adv, editable: false, selected: () => selected, nodeInfo,
    onSelect: (id) => { selected = id; flow.draw(); drawInfo(); },
  });
  const info = h('div', { class: 'flowdetail' });

  function drawInfo() {
    clear(info);
    const sc = sceneById(adv, selected);
    if (!sc) return;
    const st = sceneStatus(adv, ses, sc.id);
    const card = h('div', { class: 'card nodepanel' },
      h('h3', {}, sc.name),
      h('div', { class: 'row gap wrap' },
        h('span', { class: `chip status-${st.state}` }, STATE_TEXT[st.state]),
        sc.act ? h('span', { class: 'chip' }, sc.act) : null,
        st.forced ? h('span', { class: 'chip' }, '🔓 vom Spielleiter freigegeben') : null));
    if (st.state === 'locked') {
      card.appendChild(h('p', { class: 'muted' }, `Gesperrt: ${lockReason(adv, st)}.`));
    }
    if (sc.summary) card.appendChild(h('div', { class: 'md', html: md(sc.summary) }));
    card.appendChild(imageStrip(sc, async () => {}, { editable: false }));
    if (st.state !== 'current' && st.state !== 'visited') {
      const rc = reqControls(adv, ses, sc, { saveSes, addLog, onChange: () => { flow.draw(); drawInfo(); } });
      if (rc) card.appendChild(rc);
    }
    const row = h('div', { class: 'row gap wrap' });
    if (st.state !== 'current') {
      row.appendChild(h('button', {
        class: 'btn primary', type: 'button',
        onclick: async () => { if (await enter(sc.id)) location.hash = `#/session/${ses.id}/scene`; },
      }, '▶ Hierhin wechseln'));
    }
    if (st.state === 'locked') {
      row.appendChild(h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          ses.forced = ses.forced || [];
          if (!ses.forced.includes(sc.id)) ses.forced.push(sc.id);
          await saveSes();
          flow.draw();
          drawInfo();
        },
      }, '🔓 Freischalten (Spielleiter-Entscheid)'));
    }
    card.appendChild(row);
    info.appendChild(card);
  }

  panel.append(
    h('div', { class: 'flowlegend row gap wrap muted small' },
      h('span', {}, '▶ aktuell'), h('span', {}, '✔ besucht'), h('span', {}, '○ frei'), h('span', {}, '🔒 gesperrt (x/y Vorgänger)'), h('span', {}, '⛓ Bedingung'), h('span', {}, '🔑 Gegenstand/Wurf nötig')),
    h('div', { class: 'row gap wrap flowbar' },
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Verkleinern', onclick: () => flow.zoomBy(0.8) }, '−'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Vergrößern', onclick: () => flow.zoomBy(1.25) }, '+'),
      h('button', { class: 'btn small', type: 'button', onclick: () => flow.fit() }, '⤢ Einpassen')),
    flow.el,
    ...(hasFlow(adv) ? [] : [h('p', { class: 'muted small' }, 'In diesem Abenteuer sind noch keine Wege eingezeichnet, deshalb sind alle Szenen frei. Wege legst du in der Werkstatt im Tab „🔀 Handlung“ an.')]),
    info);
  drawInfo();
}
