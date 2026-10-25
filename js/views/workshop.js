// Werkstatt: Abenteuer gemeinsam mit Claude entwickeln.
import { h, clear, toast, confirmDialog, formDialog, downloadText, debounce } from '../util.js';
import { md } from '../md.js';
import { getItem, saveItem, deleteItem, listItems } from '../store.js';
import {
  SECTIONS, STATUS_LABELS, WORKSHOP_TOOLS, workshopSystem, runWorkshopTool, progress, newSession,
} from '../adventure.js';
import { createChat } from '../chat.js';
import { collectionView } from './collection.js';
import { rulesetToMd, adventureToMarkdown } from '../export.js';
import { flowTab } from './flowedit.js';
import { removeImage } from '../images.js';

const TABS = [
  ['chat', '💬 Chat'],
  ['flow', '🔀 Handlung'],
  ['sections', '📚 Abschnitte'],
  ['rules', '⚙️ Regelwerk'],
  ['scenes', '🎬 Szenen'],
  ['npcs', '🧑‍🤝‍🧑 NSCs'],
  ['locations', '📍 Orte'],
  ['more', '⋯ Mehr'],
];

export async function render(main, [id, tabParam], ctx) {
  const adv = await getItem('adventures', id);
  if (!adv) {
    main.appendChild(h('div', { class: 'empty' }, 'Dieses Abenteuer wurde nicht gefunden. Vielleicht ist es noch nicht synchronisiert.',
      h('p', {}, h('a', { class: 'btn', href: '#/' }, 'Zur Startseite'))));
    return;
  }
  const tab = TABS.some((t) => t[0] === tabParam) ? tabParam : 'chat';
  ctx.setTitle(adv.title);

  const save = async () => { await saveItem('adventures', adv); };
  let chat = null;

  const progBar = h('div', { class: 'progress', title: 'Fortschritt' }, h('div', { class: 'bar' }));
  const progText = h('span', { class: 'muted small' });
  const updateProgress = () => {
    const p = progress(adv);
    progBar.firstChild.style.width = `${p.pct}%`;
    progText.textContent = `${p.done}/${p.total} · ${p.checks.filter((c) => !c[1]).map((c) => c[0]).slice(0, 3).join(', ') || 'alles da'}${p.checks.filter((c) => !c[1]).length > 3 ? ' …' : ''}`;
  };

  const tabs = h('nav', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) =>
    h('a', { class: `tab${key === tab ? ' active' : ''}`, href: `#/adventure/${adv.id}/${key}`, role: 'tab' }, label)));
  const panel = h('div', { class: `panel ${tab === 'chat' ? 'panel-chat' : ''}` });
  main.append(h('div', { class: 'view workshop' },
    h('div', { class: 'row gap center prog-row' }, progBar, progText), tabs, panel));
  updateProgress();
  requestAnimationFrame(() => {
    const a = tabs.querySelector('.active');
    if (a && a.scrollIntoView) a.scrollIntoView({ inline: 'center', block: 'nearest' });
  });

  // ---------------------------------------------------------------- Chat
  if (tab === 'chat') {
    const quickPrompts = [
      { label: '🚀 Idee entwickeln', text: `Lass uns anfangen. Mein Vorbild/Setting: ${adv.setting || '(noch offen)'}. Stelle mir die wichtigsten Fragen und schlage mir 3 Richtungen für Ton und Grundidee vor.` },
      { label: '⚙️ Regelwerk entwerfen', text: 'Entwirf auf Basis von Konzept und Welt ein eigenes, schnell spielbares Regelwerk. Schlage mir zuerst die Kernmechanik in 2–3 Varianten vor.' },
      { label: '🧙 Charaktererschaffung', text: 'Entwickle die Charaktererschaffung passend zum Regelwerk, so dass sie in unter 10 Minuten am Tablet erledigt ist.' },
      { label: '📖 Handlung in Akten', text: 'Schlage mir einen roten Faden in Akten mit Wendepunkten vor. Plane für etwa 5 Spieler und mehrere Spielabende.' },
      { label: '🎬 Szenen ausarbeiten', text: 'Arbeite die Szenen des nächsten Akts aus (mit Vorlesetext, GM-Notizen und Proben) und lege sie an.' },
      { label: '🧑‍🤝‍🧑 NSCs & Orte', text: 'Lege die wichtigsten NSCs und Orte an, die bisher in der Handlung vorkommen, und ergänze fehlende.' },
      { label: '✅ Spielbereit-Check', text: 'Führe einen Spielbereit-Check durch: Was fehlt noch, wo gibt es Widersprüche, was ist am Tisch schwer spielbar? Nenne konkrete nächste Schritte.' },
    ];
    chat = createChat({
      getHistory: () => adv.chat,
      persist: async (hist) => {
        if (hist.length > 200) hist.splice(0, hist.length - 200);
        adv.chat = hist;
        await save();
      },
      getSystem: () => workshopSystem(adv),
      tools: WORKSHOP_TOOLS,
      runTool: (name, input) => {
        // Bilder gelöschter Szenen mit aufräumen
        const doomed = name === 'delete_item' && input.collection === 'scenes' ? [...(adv.scenes.find((s) => s.id === input.id)?.images || [])] : [];
        const out = runWorkshopTool(adv, name, input);
        for (const im of doomed) removeImage(im.id);
        return out;
      },
      onDataChanged: () => { updateProgress(); ctx.setTitle(adv.title); },
      quickPrompts,
      placeholder: 'Nachricht an Claude …',
      emptyHint: `Hier entwickelst du „${adv.title}“ im Gespräch mit Claude. Tippe unten auf „🚀 Idee entwickeln“ oder beschreibe einfach, worauf du Lust hast. Ergebnisse werden automatisch in den Tabs Abschnitte, Regelwerk, Szenen, NSCs und Orte abgelegt.`,
    });
    panel.appendChild(chat.el);
    return () => chat && chat.destroy();
  }

  // ---------------------------------------------------------------- Handlung (Flowchart)
  if (tab === 'flow') {
    flowTab(panel, adv, async () => { await save(); updateProgress(); });
    return;
  }

  // ---------------------------------------------------------------- Abschnitte
  if (tab === 'sections') {
    const editingIds = new Set();
    const drawSections = () => {
      clear(panel);
      for (const s of SECTIONS) {
        const text = adv.sections[s.id] || '';
        const card = h('div', { class: `card section${s.gmOnly ? ' gm' : ''}` });
        const head = h('div', { class: 'row between gap center' },
          h('h3', {}, `${s.icon} ${s.title}`, s.gmOnly ? h('span', { class: 'chip gmchip' }, '🔒 nur GM') : null),
          editingIds.has(s.id) ? null : h('button', { class: 'btn small', onclick: () => { editingIds.add(s.id); drawSections(); } }, text ? '✏️ Bearbeiten' : '✏️ Schreiben'));
        card.appendChild(head);
        if (editingIds.has(s.id)) {
          const ta = h('textarea', { rows: 12, class: 'big' }, text);
          card.append(ta, h('div', { class: 'row end gap' },
            h('button', { class: 'btn', onclick: () => { editingIds.delete(s.id); drawSections(); } }, 'Abbrechen'),
            h('button', {
              class: 'btn primary',
              onclick: async () => { adv.sections[s.id] = ta.value; editingIds.delete(s.id); await save(); drawSections(); },
            }, 'Speichern')));
        } else if (text.trim()) {
          card.appendChild(h('div', { class: 'md', html: md(text) }));
        } else {
          card.appendChild(h('p', { class: 'muted' }, s.hint));
        }
        panel.appendChild(card);
      }
    };
    drawSections();
    return;
  }

  // ---------------------------------------------------------------- Regelwerk
  if (tab === 'rules') {
    const drawRules = () => {
      clear(panel);
      const rs = adv.ruleset;
      panel.appendChild(h('div', { class: 'row gap wrap' },
        h('a', { class: 'btn primary', href: `#/adventure/${adv.id}/chat` }, rs ? '💬 Mit Claude überarbeiten' : '💬 Mit Claude entwerfen'),
        rs ? h('button', { class: 'btn', onclick: editJson }, '{ } Als JSON bearbeiten') : null,
        rs ? h('button', {
          class: 'btn danger',
          onclick: async () => {
            if (await confirmDialog('Das gesamte strukturierte Regelwerk löschen?', { okText: 'Löschen', danger: true })) {
              adv.ruleset = null; await save(); drawRules();
            }
          },
        }, '🗑 Löschen') : null));
      panel.appendChild(h('div', { class: 'card md', html: md(rulesetToMd(rs)) }));
    };
    const editJson = () => {
      clear(panel);
      const ta = h('textarea', { rows: 24, class: 'big mono' }, JSON.stringify(adv.ruleset, null, 2));
      panel.append(
        h('p', { class: 'muted' }, 'Für Fortgeschrittene: Das Regelwerk als JSON. Felder: name, summary, dice, attributes, skills, resources, conditions, combat, magic, progression, extra.'),
        ta,
        h('div', { class: 'row end gap' },
          h('button', { class: 'btn', onclick: drawRules }, 'Abbrechen'),
          h('button', {
            class: 'btn primary',
            onclick: async () => {
              try {
                const obj = JSON.parse(ta.value);
                if (!obj.name) throw new Error('„name“ fehlt');
                obj.attributes = obj.attributes || [];
                obj.resources = obj.resources || [];
                adv.ruleset = obj;
                await save();
                toast('Regelwerk gespeichert', 'ok');
                drawRules();
              } catch (e) { toast(`Ungültiges JSON: ${e.message}`, 'err', 5000); }
            },
          }, 'Speichern')));
    };
    drawRules();
    return;
  }

  // ---------------------------------------------------------------- Szenen / NSCs / Orte
  if (['scenes', 'npcs', 'locations'].includes(tab)) {
    panel.appendChild(collectionView(adv, tab, async () => { await save(); updateProgress(); }));
    return;
  }

  // ---------------------------------------------------------------- Mehr
  const titleIn = h('input', { type: 'text', value: adv.title });
  const settingIn = h('textarea', { rows: 3 }, adv.setting);
  const countIn = h('input', { type: 'number', min: 1, max: 12, value: adv.playerCount });
  const statusIn = h('select', {}, Object.entries(STATUS_LABELS).map(([v, l]) => h('option', { value: v, selected: v === adv.status }, l)));
  const notesIn = h('textarea', { rows: 6 }, adv.notes || '');
  const persistMeta = debounce(async () => {
    adv.title = titleIn.value.trim() || adv.title;
    adv.setting = settingIn.value;
    adv.playerCount = Math.max(1, Math.min(12, Number(countIn.value) || adv.playerCount));
    adv.status = statusIn.value;
    adv.notes = notesIn.value;
    await save();
    ctx.setTitle(adv.title);
  }, 500);
  for (const el of [titleIn, settingIn, countIn, statusIn, notesIn]) el.addEventListener('input', persistMeta);
  statusIn.addEventListener('change', persistMeta);

  const sessions = (await listItems('sessions')).filter((s) => s.adventureId === adv.id);

  panel.append(
    h('div', { class: 'card' },
      h('label', { class: 'field' }, h('span', {}, 'Titel'), titleIn),
      h('label', { class: 'field' }, h('span', {}, 'Vorbild / Setting'), settingIn),
      h('div', { class: 'row gap wrap' },
        h('label', { class: 'field grow' }, h('span', {}, 'Spieler (ohne Spielleitung)'), countIn),
        h('label', { class: 'field grow' }, h('span', {}, 'Status'), statusIn)),
      h('label', { class: 'field' }, h('span', {}, 'Eigene Notizen'), notesIn)),
    h('div', { class: 'card' },
      h('h3', {}, '▶ Spielen'),
      h('p', { class: 'muted' }, sessions.length ? `${sessions.length} bisherige Sitzung(en).` : 'Noch keine Sitzung gestartet.'),
      h('div', { class: 'row gap wrap' },
        h('button', {
          class: 'btn primary',
          onclick: async () => {
            if (adv.status !== 'bereit' && !(await confirmDialog('Das Abenteuer ist noch nicht als „Spielbereit“ markiert. Trotzdem eine Sitzung starten?', { okText: 'Sitzung starten' }))) return;
            const r = await formDialog('Neue Sitzung', [{ key: 'name', label: 'Name', value: `Sitzung vom ${new Date().toLocaleDateString('de-DE')}` }], { okText: 'Starten' });
            if (!r) return;
            const ses = newSession(adv, r.name.trim());
            await saveItem('sessions', ses);
            location.hash = `#/session/${ses.id}`;
          },
        }, '▶ Neue Sitzung starten'),
        ...sessions.slice(0, 3).map((s) => h('a', { class: 'btn', href: `#/session/${s.id}` }, `Fortsetzen: ${s.name}`)))),
    h('div', { class: 'card' },
      h('h3', {}, '📤 Export'),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn', onclick: () => downloadText(`${fileName(adv.title)}.md`, adventureToMarkdown(adv), 'text/markdown') }, 'Als Textdokument (.md)'),
        h('button', { class: 'btn', onclick: () => downloadText(`${fileName(adv.title)}.json`, JSON.stringify(adv, null, 2)) }, 'Rohdaten (.json)'))),
    h('div', { class: 'card' },
      h('h3', {}, '⚠️ Gefahrenzone'),
      h('button', {
        class: 'btn danger',
        onclick: async () => {
          if (!(await confirmDialog(`„${adv.title}“ mit allem Inhalt löschen? Das gilt auch für Dropbox. Zugehörige Sitzungen bleiben bestehen, können aber nicht mehr geöffnet werden.`, { okText: 'Endgültig löschen', danger: true }))) return;
          for (const s of adv.scenes) for (const im of s.images || []) await removeImage(im.id);
          await deleteItem('adventures', adv.id);
          toast('Abenteuer gelöscht', 'ok');
          location.hash = '#/';
        },
      }, '🗑 Abenteuer löschen')));
}

const fileName = (t) => String(t).toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-|-$/g, '') || 'abenteuer';
