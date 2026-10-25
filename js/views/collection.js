// Liste mit Karten für Szenen / NSCs / Orte (Anzeigen, Bearbeiten, Sortieren, Löschen).
import { h, clear, confirmDialog, uid } from '../util.js';
import { md } from '../md.js';
import { COLLECTIONS, upsertItem, removeItem } from '../adventure.js';
import { imageStrip, removeImage } from '../images.js';

export function itemDetails(col, item, { showGm = true } = {}) {
  const def = COLLECTIONS[col];
  const wrap = h('div', { class: 'item-details' });
  for (const f of def.fields) {
    if (f.key === 'name' || !item[f.key]) continue;
    if (f.gm && !showGm) continue;
    wrap.appendChild(h('div', { class: `kv${f.gm ? ' gm' : ''}${f.key === 'read_aloud' ? ' readaloud' : ''}` },
      h('div', { class: 'k' }, (f.gm ? '🔒 ' : '') + f.label),
      h('div', { class: 'v md', html: md(item[f.key]) })));
  }
  if (!wrap.children.length) wrap.appendChild(h('p', { class: 'muted' }, 'Noch keine Details.'));
  return wrap;
}

export function subtitle(col, item) {
  if (col === 'scenes') return [item.act, item.location].filter(Boolean).join(' · ');
  if (col === 'npcs') return item.role || '';
  return (item.description || '').slice(0, 80);
}

function editForm(col, item, onSave, onCancel) {
  const def = COLLECTIONS[col];
  const inputs = {};
  const rows = def.fields.map((f) => {
    const el = f.type === 'textarea' ? h('textarea', { rows: 4 }, item[f.key] || '') : h('input', { type: 'text', value: item[f.key] || '' });
    inputs[f.key] = el;
    return h('label', { class: `field${f.gm ? ' gm' : ''}` }, h('span', {}, (f.gm ? '🔒 ' : '') + f.label), el);
  });
  return h('div', { class: 'edit-form' }, rows,
    h('div', { class: 'row end gap' },
      h('button', { class: 'btn', onclick: onCancel }, 'Abbrechen'),
      h('button', {
        class: 'btn primary',
        onclick: () => onSave(Object.fromEntries(def.fields.map((f) => [f.key, inputs[f.key].value]))),
      }, 'Speichern')));
}

/** adv: Abenteuer-Objekt; save(): speichert es; Rückgabe: DOM-Element */
export function collectionView(adv, col, save) {
  const def = COLLECTIONS[col];
  const root = h('div', { class: 'collection' });
  const expanded = new Set();
  let editing = null;

  async function addNew() {
    const r = upsertItem(adv, col, { name: `Neu: ${def.singular}`, id: uid(col.slice(0, 3)) });
    editing = r.id;
    expanded.add(r.id);
    await save();
    draw();
  }

  async function move(i, d) {
    const list = adv[col];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await save();
    draw();
  }

  function draw() {
    clear(root);
    root.appendChild(h('div', { class: 'row between gap wrap' },
      h('div', { class: 'muted' }, `${adv[col].length} ${def.label}`),
      h('button', { class: 'btn primary', onclick: addNew }, `+ ${def.singular} hinzufügen`)));
    if (!adv[col].length) {
      root.appendChild(h('div', { class: 'empty' }, `Noch keine ${def.label}. Lass sie im Chat von Claude entwerfen oder lege sie hier selbst an.`));
    }
    adv[col].forEach((item, i) => {
      const open = expanded.has(item.id);
      const card = h('div', { class: `card item${open ? ' open' : ''}` });
      const head = h('button', {
        class: 'item-head', type: 'button',
        onclick: () => { open ? expanded.delete(item.id) : expanded.add(item.id); draw(); },
      },
        h('span', { class: 'ico' }, def.icon),
        h('span', { class: 'grow' },
          h('strong', {}, (col === 'scenes' ? `${i + 1}. ` : '') + (item.name || '(ohne Name)')),
          h('span', { class: 'muted small block' }, subtitle(col, item))),
        h('span', { class: 'chev' }, open ? '▾' : '▸'));
      card.appendChild(head);
      if (open) {
        if (editing === item.id) {
          card.appendChild(editForm(col, item, async (data) => {
            Object.assign(item, data);
            editing = null;
            await save();
            draw();
          }, () => { editing = null; draw(); }));
        } else {
          card.appendChild(itemDetails(col, item));
          if (col === 'scenes') card.appendChild(h('div', { class: 'item-details' }, imageStrip(item, save, { editable: true })));
          card.appendChild(h('div', { class: 'row gap wrap item-actions' },
            h('button', { class: 'btn small', onclick: () => { editing = item.id; draw(); } }, '✏️ Bearbeiten'),
            def.orderable ? h('button', { class: 'btn small', onclick: () => move(i, -1), disabled: i === 0, 'aria-label': 'Nach oben' }, '↑') : null,
            def.orderable ? h('button', { class: 'btn small', onclick: () => move(i, 1), disabled: i === adv[col].length - 1, 'aria-label': 'Nach unten' }, '↓') : null,
            h('button', {
              class: 'btn small danger',
              onclick: async () => {
                if (await confirmDialog(`„${item.name}“ wirklich löschen?`, { okText: 'Löschen', danger: true })) {
                  if (col === 'scenes') for (const im of item.images || []) await removeImage(im.id);
                  removeItem(adv, col, item.id);
                  await save();
                  draw();
                }
              },
            }, '🗑 Löschen')));
        }
      }
      root.appendChild(card);
    });
  }

  draw();
  root.redraw = draw;
  return root;
}
