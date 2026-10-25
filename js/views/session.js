// Spielleiter-Modus: Abenteuer am Spieltisch durchführen.
import { h, clear, toast, confirmDialog, formDialog, copyText, downloadText, fmtTime, fmtDate, uid, debounce } from '../util.js';
import { md } from '../md.js';
import { getItem, saveItem, deleteItem } from '../store.js';
import { GM_TOOLS, gmSystem, runWorkshopTool, newPlayer, upsertItem, COLLECTIONS } from '../adventure.js';
import { createChat } from '../chat.js';
import { itemDetails, subtitle } from './collection.js';
import { rollExpr, describeRoll, parseDice, extremes } from '../dice.js';
import { rulesetToMd } from '../export.js';
import { sceneById, outLinks, sceneStatus, ensureFlowState, hasFlow, lockReason } from '../flow.js';
import { reqControls, giveItem } from './reqs.js';
import { imageStrip } from '../images.js';
import { playFlow } from './flowplay.js';

const TABS = [
  ['scene', '🎬 Szene'],
  ['flow', '🔀 Weg'],
  ['dice', '🎲 Würfel'],
  ['players', '👥 Spieler'],
  ['items', '🎒 Inventar'],
  ['world', '🗺️ NSCs & Orte'],
  ['rules', '📜 Regeln'],
  ['log', '📝 Protokoll'],
  ['assistant', '🤖 Assistent'],
];

export async function render(main, [id, tabParam], ctx) {
  const ses = await getItem('sessions', id);
  if (!ses) {
    main.appendChild(h('div', { class: 'empty' }, 'Diese Sitzung wurde nicht gefunden.', h('p', {}, h('a', { class: 'btn', href: '#/' }, 'Zur Startseite'))));
    return;
  }
  const adv = await getItem('adventures', ses.adventureId);
  if (!adv) {
    main.appendChild(h('div', { class: 'empty' },
      'Das zugehörige Abenteuer ist auf diesem Gerät nicht vorhanden (noch nicht synchronisiert oder gelöscht).',
      h('p', {}, h('a', { class: 'btn', href: '#/settings' }, 'Zu den Einstellungen (Sync)'))));
    return;
  }
  const tab = TABS.some((t) => t[0] === tabParam) ? tabParam : 'scene';
  ctx.setTitle(`${ses.adventureTitle || adv.title} · ${ses.name}`);

  const saveSes = async () => { await saveItem('sessions', ses); };
  const saveAdv = async () => { await saveItem('adventures', adv); };
  const saveSesDebounced = debounce(saveSes, 400);
  const addLog = (text, kind = 'note') => { ses.log.push({ id: uid('log'), t: new Date().toISOString(), text, kind }); };
  ensureFlowState(ses);

  /** Szene betreten. Gesperrte Szenen nur nach Rückfrage (dann gilt sie als vom Spielleiter freigegeben). */
  const enterScene = async (id) => {
    const sc = sceneById(adv, id);
    if (!sc) return false;
    const st = sceneStatus(adv, ses, id);
    if (!st.open) {
      const ok = await confirmDialog(`„${sc.name}“ ist noch gesperrt: ${lockReason(adv, st)}. Trotzdem dorthin wechseln?`, { okText: 'Trotzdem wechseln' });
      if (!ok) return false;
      if (!ses.forced.includes(id)) ses.forced.push(id);
    }
    if (ses.currentSceneId !== id) {
      ses.currentSceneId = id;
      addLog(`Szene: ${sc.name}`, 'scene');
    }
    if (!ses.visited.includes(id)) {
      ses.visited.push(id);
      for (const g of sc.grants || []) {
        if (!String(g).trim()) continue;
        giveItem(ses, g);
        addLog(`Gegenstand erhalten: ${g} (in „${sc.name}“)`, 'note');
        toast(`🎒 Erhalten: ${g}`, 'ok');
      }
    }
    await saveSes();
    return true;
  };

  const tabs = h('nav', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) =>
    h('a', { class: `tab${key === tab ? ' active' : ''}`, href: `#/session/${ses.id}/${key}`, role: 'tab' }, label)));
  const panel = h('div', { class: `panel ${tab === 'assistant' ? 'panel-chat' : ''}` });
  const ended = ses.status === 'beendet';
  main.append(h('div', { class: 'view session' },
    ended ? h('div', { class: 'banner' }, 'Diese Sitzung ist beendet. ', h('button', { class: 'btn small', onclick: async () => { ses.status = 'laufend'; await saveSes(); location.reload(); } }, 'Wieder aufnehmen')) : null,
    tabs, panel));
  requestAnimationFrame(() => { const a = tabs.querySelector('.active'); if (a && a.scrollIntoView) a.scrollIntoView({ inline: 'center', block: 'nearest' }); });

  // Spieler an aktuelles Regelwerk angleichen (fehlende Vorräte ergänzen)
  const syncResources = () => {
    for (const p of ses.players) {
      for (const r of adv.ruleset?.resources || []) {
        if (!p.resources[r.key]) p.resources[r.key] = { value: Number(r.max) || 0, max: Number(r.max) || 0 };
      }
    }
  };
  syncResources();

  const findByRef = (list, ref) => {
    const q = ref.trim().toLowerCase();
    if (!q) return null;
    return list.find((x) => x.id === q || x.name.toLowerCase() === q) || list.find((x) => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase()));
  };

  function itemDialog(col, item) {
    const dlg = h('dialog', { class: 'dlg wide' });
    dlg.append(h('h3', {}, `${COLLECTIONS[col].icon} ${item.name}`), itemDetails(col, item),
      h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => { dlg.close(); dlg.remove(); } }, 'Schließen')));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  // ---------------------------------------------------------------- Szene
  if (tab === 'scene') {
    const draw = () => {
      clear(panel);
      const scenes = adv.scenes;
      if (!scenes.length) {
        panel.appendChild(h('div', { class: 'empty' }, 'Dieses Abenteuer hat noch keine Szenen. Lass sie in der Werkstatt von Claude anlegen.',
          h('p', {}, h('a', { class: 'btn', href: `#/adventure/${adv.id}/scenes` }, 'Zur Werkstatt'))));
        return;
      }
      const idx = Math.max(0, scenes.findIndex((s) => s.id === ses.currentSceneId));
      const cur = scenes[idx];
      const setScene = async (i) => {
        const s = scenes[Math.max(0, Math.min(scenes.length - 1, i))];
        if (s.id === ses.currentSceneId) return;
        await enterScene(s.id);
        draw();
      };
      const mark = (id) => {
        if (ses.doneScenes.includes(id)) return '✔ ';
        return sceneStatus(adv, ses, id).state === 'locked' ? '🔒 ' : '';
      };
      const done = ses.doneScenes.includes(cur.id);

      const select = h('select', { class: 'grow', onchange: (e) => setScene(scenes.findIndex((s) => s.id === e.target.value)) },
        scenes.map((s, i) => h('option', { value: s.id, selected: s.id === cur.id }, `${mark(s.id)}${i + 1}. ${s.name}`)));
      panel.appendChild(h('div', { class: 'row gap center scene-nav' },
        h('button', { class: 'btn', onclick: () => setScene(idx - 1), disabled: idx === 0, 'aria-label': 'Vorherige Szene' }, '◀'),
        select,
        h('button', { class: 'btn', onclick: () => setScene(idx + 1), disabled: idx === scenes.length - 1, 'aria-label': 'Nächste Szene' }, '▶')));

      const card = h('div', { class: 'card scene-card' },
        h('div', { class: 'row between gap center wrap' },
          h('h2', {}, `${idx + 1}. ${cur.name}`),
          h('button', {
            class: `btn small${done ? ' primary' : ''}`,
            onclick: async () => {
              if (done) ses.doneScenes = ses.doneScenes.filter((x) => x !== cur.id);
              else { ses.doneScenes.push(cur.id); addLog(`Szene abgeschlossen: ${cur.name}`, 'scene'); }
              await saveSes(); draw();
            },
          }, done ? '✔ Erledigt' : 'Als erledigt markieren')),
        h('div', { class: 'row gap wrap' },
          cur.act ? h('span', { class: 'chip' }, cur.act) : null,
          cur.location ? h('span', { class: 'chip' }, '📍 ' + cur.location) : null));
      if (cur.summary) card.appendChild(h('div', { class: 'md', html: md(cur.summary) }));
      if (cur.read_aloud) {
        card.appendChild(h('div', { class: 'kv readaloud' },
          h('div', { class: 'row between center' },
            h('div', { class: 'k' }, '📢 Vorlesetext'),
            h('button', { class: 'btn small', onclick: () => copyText(cur.read_aloud) }, 'Kopieren')),
          h('div', { class: 'v md', html: md(cur.read_aloud) })));
      }
      if (cur.gm_notes) card.appendChild(h('div', { class: 'kv gm' }, h('div', { class: 'k' }, '🔒 GM-Notizen'), h('div', { class: 'v md', html: md(cur.gm_notes) })));
      if (cur.challenges) card.appendChild(h('div', { class: 'kv' }, h('div', { class: 'k' }, 'Herausforderungen / Proben'), h('div', { class: 'v md', html: md(cur.challenges) })));
      if (cur.rewards) card.appendChild(h('div', { class: 'kv' }, h('div', { class: 'k' }, 'Belohnungen / Folgen'), h('div', { class: 'v md', html: md(cur.rewards) })));

      card.appendChild(imageStrip(cur, saveAdv, { editable: false }));

      // NSC- und Ort-Verweise als antippbare Chips
      const refs = [];
      for (const part of String(cur.npcs || '').split(/[,;]|\bund\b/i)) {
        const npc = findByRef(adv.npcs, part);
        if (npc && !refs.some((r) => r.item === npc)) refs.push({ col: 'npcs', item: npc });
      }
      const loc = cur.location ? findByRef(adv.locations, cur.location) : null;
      if (loc) refs.push({ col: 'locations', item: loc });
      if (refs.length) {
        card.appendChild(h('div', { class: 'row gap wrap refs' }, h('span', { class: 'muted small' }, 'Nachschlagen:'),
          refs.map((r) => h('button', { class: 'chip action', onclick: () => itemDialog(r.col, r.item) }, `${COLLECTIONS[r.col].icon} ${r.item.name}`))));
      } else if (cur.npcs) {
        card.appendChild(h('div', { class: 'muted small' }, `NSCs: ${cur.npcs}`));
      }
      panel.appendChild(card);

      // Wie geht es weiter? (Wege aus dem Flowchart, mit Sperr-Status)
      if (hasFlow(adv)) {
        const nexts = outLinks(adv, cur);
        const box = h('div', { class: 'card nextsteps' }, h('h3', {}, '➡️ Wie geht es weiter?'));
        if (!nexts.length) box.appendChild(h('p', { class: 'muted' }, 'Von hier gibt es keinen weiteren Weg (Ende dieses Strangs). Siehe Tab „🔀 Weg“.'));
        for (const l of nexts) {
          const target = sceneById(adv, l.to);
          const st = sceneStatus(adv, ses, l.to);
          const info = st.state === 'locked' ? `🔒 gesperrt – ${lockReason(adv, st)}` : st.state === 'visited' ? '✔ schon besucht' : st.state === 'current' ? 'aktuell' : 'frei';
          box.appendChild(h('button', {
            class: `btn nextbtn ${st.state}`, type: 'button',
            onclick: async () => { if (await enterScene(target.id)) draw(); },
          }, h('span', { class: 'grow' }, h('strong', {}, target.name), l.label ? h('span', { class: 'muted small block' }, l.label) : null), h('span', { class: 'small' }, info)));
          if (st.state !== 'visited' && st.state !== 'current') {
            const rc = reqControls(adv, ses, target, { saveSes, addLog, onChange: draw });
            if (rc) box.appendChild(rc);
          }
        }
        panel.appendChild(box);
      }

      panel.appendChild(h('details', { class: 'card' },
        h('summary', {}, `Alle Szenen (${scenes.length})`),
        h('div', { class: 'scene-list' }, scenes.map((s, i) =>
          h('button', { class: `scene-row${s.id === cur.id ? ' current' : ''}`, onclick: () => setScene(i) },
            h('span', {}, ses.doneScenes.includes(s.id) ? '✔' : s.id === cur.id ? '▶' : sceneStatus(adv, ses, s.id).state === 'locked' ? '🔒' : '○'),
            h('span', { class: 'grow' }, `${i + 1}. ${s.name}`),
            h('span', { class: 'muted small' }, s.act || ''))))));
    };
    draw();
    return;
  }

  // ---------------------------------------------------------------- Weg (Flowchart)
  if (tab === 'flow') {
    playFlow(panel, adv, ses, { enter: enterScene, saveSes, addLog });
    return;
  }

  // ---------------------------------------------------------------- Würfel
  if (tab === 'dice') {
    const primary = adv.ruleset?.dice?.primary;
    const out = h('div', { class: 'dice-out' });
    const hist = h('div', { class: 'dice-hist' });
    const exprIn = h('input', { type: 'text', placeholder: 'z. B. 2W6+3 oder 4d6kh3', inputMode: 'text', value: primary && parseDice(primary) ? primary : '' });
    const logChk = h('input', { type: 'checkbox' });
    const who = h('input', { type: 'text', placeholder: 'Wer würfelt? (optional)' });

    const showResult = (r) => {
      clear(out);
      const ex = extremes(r);
      out.append(
        h('div', { class: `dice-total${ex?.allMax ? ' max' : ''}${ex?.allMin ? ' min' : ''}` }, String(r.total)),
        h('div', { class: 'muted' }, describeRoll(r)));
    };
    const drawHist = () => {
      clear(hist);
      for (const d of [...ses.dice].reverse().slice(0, 15)) {
        hist.appendChild(h('div', { class: 'dice-row' }, h('span', { class: 'muted small' }, fmtTime(d.t)), h('span', {}, `${d.who ? d.who + ': ' : ''}${d.text}`)));
      }
    };
    const doRoll = async (expr) => {
      try {
        const r = rollExpr(expr);
        showResult(r);
        const entry = { t: new Date().toISOString(), who: who.value.trim(), text: describeRoll(r) };
        ses.dice.push(entry);
        if (ses.dice.length > 60) ses.dice.splice(0, ses.dice.length - 60);
        if (logChk.checked) addLog(`Wurf ${entry.who ? entry.who + ': ' : ''}${entry.text}`, 'dice');
        saveSesDebounced();
        drawHist();
        if (navigator.vibrate) navigator.vibrate(15);
      } catch (e) { toast(e.message, 'err'); }
    };
    exprIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRoll(exprIn.value); });

    panel.append(
      h('div', { class: 'card' },
        primary && parseDice(primary) ? h('button', { class: 'btn primary big', onclick: () => doRoll(primary) }, `Hauptwurf des Regelwerks: ${primary}`) : null,
        h('div', { class: 'dice-grid' }, [4, 6, 8, 10, 12, 20, 100].map((n) =>
          h('button', { class: 'btn die', onclick: () => doRoll(`1d${n}`) }, `W${n}`))),
        h('div', { class: 'row gap' }, exprIn, h('button', { class: 'btn primary', onclick: () => doRoll(exprIn.value) }, 'Würfeln')),
        h('div', { class: 'row gap center wrap' }, who, h('label', { class: 'inline' }, logChk, ' ins Protokoll'))),
      h('div', { class: 'card center-text' }, out),
      h('div', { class: 'card' }, h('h3', {}, 'Letzte Würfe'), hist));
    out.appendChild(h('div', { class: 'muted' }, 'Tippe auf einen Würfel.'));
    drawHist();
    return;
  }

  // ---------------------------------------------------------------- Spieler
  if (tab === 'players') {
    const resDefs = adv.ruleset?.resources || [];
    const draw = () => {
      clear(panel);
      panel.appendChild(h('div', { class: 'row gap wrap' },
        h('button', {
          class: 'btn primary',
          onclick: async () => { ses.players.push(newPlayer(adv, `Spieler ${ses.players.length + 1}`)); await saveSes(); draw(); },
        }, '+ Spieler'),
        resDefs.length ? h('button', {
          class: 'btn',
          onclick: async () => {
            for (const p of ses.players) for (const k of Object.keys(p.resources)) p.resources[k].value = p.resources[k].max;
            addLog('Alle Vorräte aufgefüllt', 'note');
            await saveSes(); draw();
          },
        }, 'Alle Vorräte auffüllen') : null));
      if (!resDefs.length) panel.appendChild(h('p', { class: 'muted' }, 'Das Regelwerk definiert noch keine Vorräte (z. B. Lebenspunkte). Sobald es welche gibt, erscheinen hier Zähler.'));
      panel.appendChild(h('p', { class: 'muted small' }, 'Spieler-Tablets mit eigenem Charakterbogen folgen in Phase 2. Das Feld „Charakter“ wird dafür schon mitgeführt.'));

      for (const p of ses.players) {
        const nameIn = h('input', { type: 'text', value: p.name, placeholder: 'Spielername' });
        const charIn = h('input', { type: 'text', value: p.character, placeholder: 'Charakter' });
        const condIn = h('input', { type: 'text', value: p.conditions, placeholder: 'Zustände (z. B. verängstigt)' });
        const noteIn = h('textarea', { rows: 2, placeholder: 'Notizen' }, p.notes);
        nameIn.addEventListener('input', () => { p.name = nameIn.value; saveSesDebounced(); });
        charIn.addEventListener('input', () => { p.character = charIn.value; saveSesDebounced(); });
        condIn.addEventListener('input', () => { p.conditions = condIn.value; saveSesDebounced(); });
        noteIn.addEventListener('input', () => { p.notes = noteIn.value; saveSesDebounced(); });

        const resEls = resDefs.map((r) => {
          const v = p.resources[r.key];
          const val = h('span', { class: 'res-val' }, `${v.value}/${v.max}`);
          const step = async (d) => {
            v.value = Math.max(0, Math.min(v.max, v.value + d));
            val.textContent = `${v.value}/${v.max}`;
            card.classList.toggle('low', resDefs[0] && p.resources[resDefs[0].key].value <= Math.ceil(p.resources[resDefs[0].key].max * 0.25));
            saveSesDebounced();
          };
          return h('div', { class: 'res' },
            h('span', { class: 'res-name' }, r.name),
            h('button', { class: 'btn step', onclick: () => step(-1), 'aria-label': `${r.name} minus` }, '−'),
            val,
            h('button', { class: 'btn step', onclick: () => step(1), 'aria-label': `${r.name} plus` }, '+'),
            h('button', {
              class: 'btn small', title: 'Maximum ändern',
              onclick: async () => {
                const f = await formDialog(`${r.name}: Maximum für ${p.name}`, [{ key: 'max', label: 'Neues Maximum', type: 'number', value: v.max, min: 0 }]);
                if (!f) return;
                v.max = Math.max(0, Number(f.max) || 0); v.value = Math.min(v.value, v.max);
                await saveSes(); draw();
              },
            }, '⚙'));
        });
        const card = h('div', { class: 'card player' },
          h('div', { class: 'row gap' }, nameIn, charIn),
          resEls.length ? h('div', { class: 'res-list' }, resEls) : null,
          condIn, noteIn,
          h('div', { class: 'row end' }, h('button', {
            class: 'btn small danger',
            onclick: async () => {
              if (await confirmDialog(`${p.name} aus der Sitzung entfernen?`, { okText: 'Entfernen', danger: true })) {
                ses.players = ses.players.filter((x) => x.id !== p.id); await saveSes(); draw();
              }
            },
          }, 'Entfernen')));
        panel.appendChild(card);
      }
    };
    draw();
    return () => saveSesDebounced.flush();
  }

  // ---------------------------------------------------------------- Nachschlagen (NSCs & Orte)
  // ---------------------------------------------------------------- Inventar
  if (tab === 'items') {
    const known = () => [...new Set([
      ...adv.scenes.flatMap((sc) => [...(sc.grants || []), ...(sc.requires || []).filter((r) => r.type === 'item').map((r) => r.item)]),
      ...(ses.items || []).map((i) => i.name),
    ].map((x) => String(x || '').trim()).filter(Boolean))];
    const draw = () => {
      clear(panel);
      const dl = h('datalist', { id: 'itemnames' }, known().map((n) => h('option', { value: n })));
      const nameIn = h('input', { type: 'text', list: 'itemnames', placeholder: 'Gegenstand, z. B. Rostiger Schlüssel', 'aria-label': 'Neuer Gegenstand' });
      const add = async () => {
        const n = nameIn.value.trim();
        if (!n) return;
        giveItem(ses, n);
        addLog(`Gegenstand erhalten: ${n}`, 'note');
        await saveSes();
        draw();
      };
      nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      panel.append(dl,
        h('p', { class: 'muted small' }, 'Das Inventar der Gruppe. Gegenstände, die Szenen verlangen („🔑“), werden hier gesucht. Szenen können Gegenstände beim ersten Betreten automatisch vergeben.'),
        h('div', { class: 'row gap wrap' }, nameIn, h('button', { class: 'btn primary', type: 'button', onclick: add }, '＋ Hinzufügen')));
      if (!ses.items.length) panel.appendChild(h('div', { class: 'empty' }, 'Noch keine Gegenstände.'));
      for (const it of ses.items) {
        const holder = h('select', { 'aria-label': `Besitzer von ${it.name}` },
          h('option', { value: '' }, 'Gruppe'),
          ses.players.map((p) => h('option', { value: p.id, selected: p.id === it.holder }, p.name || 'Spieler')));
        holder.addEventListener('change', async () => { it.holder = holder.value; await saveSes(); });
        panel.appendChild(h('div', { class: 'card row gap wrap itemrow', 'data-item': it.name },
          h('strong', { class: 'grow' }, `🎒 ${it.name}`), holder,
          h('button', {
            class: 'btn small danger', type: 'button', 'aria-label': `${it.name} entfernen`,
            onclick: async () => { ses.items = ses.items.filter((x) => x.id !== it.id); addLog(`Gegenstand abgegeben/verloren: ${it.name}`, 'note'); await saveSes(); draw(); },
          }, '🗑')));
      }
    };
    draw();
    return;
  }

  if (tab === 'world') {
    let which = 'npcs';
    let q = '';
    const search = h('input', { type: 'search', placeholder: 'Suchen …' });
    const list = h('div', { class: 'list' });
    const seg = h('div', { class: 'seg' });
    const draw = () => {
      clear(seg); clear(list);
      for (const c of ['npcs', 'locations']) {
        seg.appendChild(h('button', { class: `btn${which === c ? ' primary' : ''}`, onclick: () => { which = c; draw(); } }, `${COLLECTIONS[c].icon} ${COLLECTIONS[c].label} (${adv[c].length})`));
      }
      const items = adv[which].filter((it) => !q || JSON.stringify(it).toLowerCase().includes(q));
      if (!items.length) list.appendChild(h('div', { class: 'empty' }, q ? 'Nichts gefunden.' : 'Noch keine Einträge.'));
      for (const it of items) {
        const det = h('details', { class: 'card item' },
          h('summary', {}, h('strong', {}, it.name), h('span', { class: 'muted small block' }, subtitle(which, it))),
          itemDetails(which, it));
        list.appendChild(det);
      }
    };
    search.addEventListener('input', () => { q = search.value.trim().toLowerCase(); draw(); });
    panel.append(seg, search, list);
    draw();
    return;
  }

  // ---------------------------------------------------------------- Regeln
  if (tab === 'rules') {
    panel.appendChild(h('div', { class: 'card md', html: md(rulesetToMd(adv.ruleset)) }));
    for (const id2 of ['regeln', 'charaktere']) {
      const text = adv.sections[id2];
      if (text?.trim()) panel.appendChild(h('details', { class: 'card' }, h('summary', {}, id2 === 'regeln' ? 'Regelwerk (ausführlich)' : 'Charaktererschaffung'), h('div', { class: 'md', html: md(text) })));
    }
    return;
  }

  // ---------------------------------------------------------------- Protokoll
  if (tab === 'log') {
    const ta = h('textarea', { rows: 2, placeholder: 'Notiz hinzufügen …' });
    const list = h('div', { class: 'log-list' });
    const draw = () => {
      clear(list);
      if (!ses.log.length) list.appendChild(h('div', { class: 'empty' }, 'Noch keine Einträge. Szenenwechsel werden automatisch protokolliert.'));
      for (const e of [...ses.log].reverse()) {
        list.appendChild(h('div', { class: `log-row ${e.kind || ''}` },
          h('span', { class: 'muted small' }, fmtTime(e.t)),
          h('span', { class: 'grow' }, e.text),
          h('button', {
            class: 'btn small', 'aria-label': 'Eintrag löschen',
            onclick: async () => { ses.log = ses.log.filter((x) => x.id !== e.id); await saveSes(); draw(); },
          }, '×')));
      }
    };
    const add = async () => {
      const t = ta.value.trim();
      if (!t) return;
      addLog(t); ta.value = ''; await saveSes(); draw();
    };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add(); });
    const asText = () => `${ses.adventureTitle} – ${ses.name}\n\n` + ses.log.map((e) => `${fmtDate(e.t)}  ${e.text}`).join('\n');
    panel.append(
      h('div', { class: 'card' }, ta, h('div', { class: 'row gap end' }, h('button', { class: 'btn primary', onclick: add }, 'Hinzufügen'))),
      list,
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn', onclick: () => copyText(asText()) }, 'Kopieren'),
        h('button', { class: 'btn', onclick: () => downloadText(`protokoll-${ses.id}.txt`, asText(), 'text/plain') }, 'Als Datei'),
        ended ? null : h('button', {
          class: 'btn',
          onclick: async () => {
            if (await confirmDialog('Sitzung beenden? Sie bleibt gespeichert und kann wieder aufgenommen werden.', { okText: 'Beenden' })) {
              ses.status = 'beendet'; addLog('Sitzung beendet'); await saveSes(); location.hash = '#/';
            }
          },
        }, '⏹ Sitzung beenden'),
        h('button', {
          class: 'btn danger',
          onclick: async () => {
            if (await confirmDialog('Diese Sitzung samt Protokoll löschen?', { okText: 'Löschen', danger: true })) {
              await deleteItem('sessions', ses.id); location.hash = '#/';
            }
          },
        }, '🗑 Sitzung löschen')));
    draw();
    return;
  }

  // ---------------------------------------------------------------- Assistent
  let advDirty = false;
  const chat = createChat({
    getHistory: () => ses.chat,
    persist: async (hist) => {
      if (hist.length > 120) hist.splice(0, hist.length - 120);
      ses.chat = hist;
      await saveSes();
      if (advDirty) { advDirty = false; await saveAdv(); }
    },
    getSystem: () => gmSystem(adv, ses),
    tools: GM_TOOLS,
    runTool: (name, input) => {
      if (name === 'add_log') { addLog(String(input.text || ''), 'note'); return { result: { ok: true }, note: 'Ins Protokoll geschrieben' }; }
      advDirty = true;
      return runWorkshopTool(adv, name, input);
    },
    quickPrompts: [
      { label: '🎭 Szene beschreiben', text: 'Beschreibe die aktuelle Szene stimmungsvoll in 3–4 Sätzen zum Vorlesen.' },
      { label: '🧑 Spontaner NSC', text: 'Erfinde einen passenden NSC für die aktuelle Situation (Name, Auftreten, ein Geheimnis, ein typischer Satz) und lege ihn an.' },
      { label: '📖 Regelfrage', text: 'Regelfrage: ' },
      { label: '🌪️ Wendung', text: 'Die Spieler haben etwas Unerwartetes getan. Schlage mir 3 Wendungen vor, die zum Abenteuer passen.' },
      { label: '🏷️ Namen', text: 'Gib mir 8 passende Namen (Personen/Orte) zum Setting.' },
      { label: '🧾 Zusammenfassung', text: 'Fasse die bisherige Sitzung anhand des Protokolls in 5 Stichpunkten zusammen und nenne offene Fäden.' },
    ].map((q) => ({ ...q, send: q.label !== '📖 Regelfrage' })),
    placeholder: 'Frag den Assistenten …',
    emptyHint: 'Dein Assistent kennt das Abenteuer, die Regeln und die aktuelle Szene. Frag nach Vorlesetexten, Regelentscheidungen, spontanen NSCs oder Wendungen.',
  });
  panel.appendChild(chat.el);
  return () => chat.destroy();
}
