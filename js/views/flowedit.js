// Werkstatt-Tab „Handlung“: Flowchart bearbeiten (Knoten, Wege, Freischaltregeln, Karten).
import { h, clear, confirmDialog, formDialog, uid } from '../util.js';
import { upsertItem, removeItem } from '../adventure.js';
import {
  createFlow, persistMissingPositions, resetLayout, outLinks, incoming, unlockRule, sceneById,
  freeSpot, positions, gateText, UNLOCK_LABELS, NODE_H, GAP_Y,
} from '../flow.js';
import { imageStrip, removeImage } from '../images.js';

export function flowTab(panel, adv, save) {
  if (persistMissingPositions(adv)) save();
  let selected = adv.scenes[0]?.id ?? null;
  let mode = 'diagram';

  const nodeInfo = (s) => ({ cls: 'plain', badge: (s.images || []).length ? `🗺️${s.images.length}` : '', gate: gateText(adv, s) });
  const flow = createFlow({
    adv, editable: true,
    selected: () => selected,
    nodeInfo,
    onSelect: (id) => { selected = id; flow.draw(); drawDetail(); },
    onMove: async (id, x, y) => { const s = sceneById(adv, id); if (s) { s.x = x; s.y = y; await save(); } },
  });

  const flowBox = h('div', { class: 'flowbox' });
  const detail = h('div', { class: 'flowdetail' });

  async function addNode(parentId) {
    const r = await formDialog(parentId ? 'Neuer Folgeknoten' : 'Neuer Knoten', [{ key: 'name', label: 'Name (Ort oder Ereignis)', placeholder: 'z. B. Taverne „Zum goldenen Krug“' }], { okText: 'Anlegen' });
    if (!r || !r.name.trim()) return;
    const res = upsertItem(adv, 'scenes', { id: uid('sce'), name: r.name.trim() });
    const parent = parentId ? sceneById(adv, parentId) : null;
    const pp = parent ? positions(adv).get(parent.id) : null;
    const spot = pp ? freeSpot(adv, pp.x, pp.y + NODE_H + GAP_Y) : freeSpot(adv, 0, 0);
    res.item.x = spot.x;
    res.item.y = spot.y;
    if (parent) { parent.links = parent.links || []; parent.links.push({ to: res.id, label: '' }); }
    selected = res.id;
    await save();
    refreshAll();
  }

  function refreshAll() { flow.draw(); drawDetail(); }

  function nodePanel(scene) {
    const box = h('div', { class: 'card nodepanel' });
    const nameIn = h('input', { type: 'text', value: scene.name, 'aria-label': 'Name des Knotens' });
    nameIn.addEventListener('change', async () => {
      scene.name = nameIn.value.trim() || scene.name;
      await save();
      refreshAll();
    });
    box.append(
      h('label', { class: 'field' }, h('span', {}, 'Name des Knotens'), nameIn),
      h('p', { class: 'muted small' }, scene.summary ? scene.summary.slice(0, 160) : 'Beschreibung, Vorlesetext, GM-Notizen usw. bearbeitest du im Tab „🎬 Szenen“ (oder lässt sie von Claude schreiben).'));

    // ausgehende Wege
    const outs = outLinks(adv, scene);
    const outBox = h('div', { class: 'field' }, h('span', {}, 'Von hier aus geht es weiter zu'));
    if (!outs.length) outBox.appendChild(h('div', { class: 'muted small' }, 'Noch keine Wege. Füge unten einen hinzu.'));
    const chips = h('div', { class: 'row gap wrap' });
    for (const l of outs) {
      chips.appendChild(h('span', { class: 'chip linkchip' },
        `→ ${sceneById(adv, l.to).name}${l.label ? ` (${l.label})` : ''}`,
        h('button', {
          class: 'x', type: 'button', 'aria-label': `Weg zu ${sceneById(adv, l.to).name} entfernen`,
          onclick: async () => { scene.links = scene.links.filter((x) => x !== l); await save(); refreshAll(); },
        }, '×')));
    }
    outBox.appendChild(chips);
    box.appendChild(outBox);

    const candidates = adv.scenes.filter((s) => s.id !== scene.id && !outs.some((l) => l.to === s.id));
    const target = h('select', { 'aria-label': 'Ziel des neuen Weges' }, candidates.map((s) => h('option', { value: s.id }, s.name)));
    const label = h('input', { type: 'text', placeholder: 'Beschriftung (optional)', 'aria-label': 'Beschriftung' });
    box.appendChild(h('div', { class: 'field' },
      h('span', {}, 'Neuen Weg hinzufügen'),
      candidates.length ? h('div', { class: 'row gap wrap' }, target, label,
        h('button', {
          class: 'btn small primary', type: 'button',
          onclick: async () => {
            scene.links = scene.links || [];
            scene.links.push({ to: target.value, label: label.value.trim() });
            await save();
            refreshAll();
          },
        }, '＋ Weg')) : h('div', { class: 'muted small' }, 'Keine weiteren Knoten zum Verbinden.'),
      h('div', { class: 'row gap wrap' }, h('button', { class: 'btn small', type: 'button', onclick: () => addNode(scene.id) }, '＋ Neuer Folgeknoten'))));

    // Freischaltung
    const preds = incoming(adv, scene.id);
    const rule = unlockRule(scene);
    const unlockBox = h('div', { class: 'field' }, h('span', {}, 'Wann wird dieser Knoten frei?'));
    if (!preds.length) unlockBox.appendChild(h('div', { class: 'muted small' }, 'Startpunkt: Kein Pfeil zeigt hierher, er ist von Anfang an frei.'));
    else {
      unlockBox.appendChild(h('div', { class: 'row gap wrap' }, preds.map((p) => h('span', { class: 'chip' }, `← ${sceneById(adv, p).name}`))));
      if (preds.length === 1) unlockBox.appendChild(h('div', { class: 'muted small' }, 'Nur ein Vorgänger: frei, sobald er besucht wurde.'));
      else {
        const modeSel = h('select', { 'aria-label': 'Freischaltregel' }, Object.entries(UNLOCK_LABELS).map(([v, l]) => h('option', { value: v, selected: v === rule.mode }, l)));
        const countIn = h('input', { type: 'number', min: 1, max: preds.length, value: Math.min(rule.count, preds.length), class: rule.mode === 'count' ? '' : 'hidden', 'aria-label': 'Mindestanzahl' });
        const apply = async () => {
          scene.unlock = { mode: modeSel.value, count: Math.max(1, Math.min(preds.length, parseInt(countIn.value, 10) || 1)) };
          countIn.classList.toggle('hidden', modeSel.value !== 'count');
          await save();
          refreshAll();
        };
        modeSel.addEventListener('change', apply);
        countIn.addEventListener('change', apply);
        unlockBox.append(modeSel, countIn);
      }
    }
    box.appendChild(unlockBox);

    box.appendChild(imageStrip(scene, async () => { await save(); flow.draw(); }, { editable: true }));

    box.appendChild(h('div', { class: 'row gap wrap end' },
      h('button', {
        class: 'btn small danger', type: 'button',
        onclick: async () => {
          if (!(await confirmDialog(`Knoten „${scene.name}“ samt Inhalt löschen? Alle Wege von und zu ihm verschwinden.`, { okText: 'Löschen', danger: true }))) return;
          for (const im of scene.images || []) await removeImage(im.id);
          removeItem(adv, 'scenes', scene.id);
          selected = adv.scenes[0]?.id ?? null;
          await save();
          refreshAll();
        },
      }, '🗑 Knoten löschen')));
    return box;
  }

  function drawDetail() {
    clear(detail);
    if (!adv.scenes.length) return;
    if (mode === 'list') {
      for (const s of adv.scenes) {
        const d = h('details', { class: 'card', open: s.id === selected },
          h('summary', {}, h('strong', {}, s.name), h('span', { class: 'muted small' }, ` → ${outLinks(adv, s).map((l) => sceneById(adv, l.to).name).join(', ') || 'Ende'}`)));
        d.addEventListener('toggle', () => { if (d.open) selected = s.id; });
        d.appendChild(nodePanel(s));
        detail.appendChild(d);
      }
      return;
    }
    const sc = sceneById(adv, selected);
    if (!sc) { detail.appendChild(h('p', { class: 'muted' }, 'Tippe auf einen Knoten, um ihn zu bearbeiten.')); return; }
    detail.appendChild(nodePanel(sc));
  }

  function drawAll() {
    clear(panel);
    clear(flowBox);
    if (!adv.scenes.length) {
      panel.appendChild(h('div', { class: 'empty' },
        h('p', {}, '🔀 Hier entsteht der rote Faden deiner Geschichte als Flowchart: Orte und Ereignisse als Knoten, dazwischen Wege, optional mit Bedingungen („erst wenn alle drei Orte besucht wurden“).'),
        h('p', {}, h('a', { class: 'btn primary', href: `#/adventure/${adv.id}/chat` }, '💬 Von Claude entwerfen lassen'), ' ', h('button', { class: 'btn', onclick: () => addNode(null) }, '＋ Ersten Knoten anlegen'))));
      return;
    }
    const toolbar = h('div', { class: 'flowbar row gap wrap' },
      h('button', { class: 'btn small primary', type: 'button', onclick: () => addNode(null) }, '＋ Knoten'),
      h('button', {
        class: 'btn small', type: 'button',
        onclick: async () => {
          if (!(await confirmDialog('Alle Knoten automatisch neu anordnen? Eigene Positionen gehen verloren.', { okText: 'Anordnen' }))) return;
          resetLayout(adv); await save(); refreshAll(); flow.fit();
        },
      }, '🧭 Anordnen'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Verkleinern', onclick: () => flow.zoomBy(0.8) }, '−'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Vergrößern', onclick: () => flow.zoomBy(1.25) }, '+'),
      h('button', { class: 'btn small', type: 'button', onclick: () => flow.fit() }, '⤢ Einpassen'),
      h('button', {
        class: 'btn small', type: 'button',
        onclick: () => { mode = mode === 'diagram' ? 'list' : 'diagram'; drawAll(); },
      }, mode === 'diagram' ? '☰ Listenansicht' : '🔀 Diagramm'));
    panel.appendChild(toolbar);
    if (mode === 'diagram') {
      flowBox.appendChild(flow.el);
      panel.appendChild(flowBox);
      panel.appendChild(h('p', { class: 'muted small' }, 'Knoten antippen = bearbeiten, mit dem Finger/der Maus ziehen = verschieben. Pfeile zeigen die Wege, ⛓ zeigt eine Bedingung, 🗺️ Karten.'));
    }
    panel.appendChild(detail);
    flow.draw();
    drawDetail();
  }

  drawAll();
}
