// Spielleiter-Modus: Abenteuer am Spieltisch durchführen.
import { h, clear, toast, confirmDialog, formDialog, copyText, downloadText, fmtTime, fmtDate, uid, debounce } from '../util.js';
import { md } from '../md.js';
import { getItem, saveItem, deleteItem } from '../store.js';
import { GM_TOOLS, gmSystem, runWorkshopTool, newPlayer, upsertItem, COLLECTIONS } from '../adventure.js';
import { createChat } from '../chat.js';
import { itemDetails, subtitle } from './collection.js';
import { rollExpr, describeRoll, parseDice, extremes } from '../dice.js';
import { rulesetToMd } from '../export.js';
import { sceneById, outLinks, sceneStatus, ensureFlowState, hasFlow, lockReason, reqList, rollPasses } from '../flow.js';
import { reqControls, giveItem } from './reqs.js';
import { imageStrip, imageToDataUrl, getImageUrl } from '../images.js';
import * as live from '../live.js';
import { FOG_SIZES, normFog, newFog, cellOf, setBit, allBits, revealedCount, drawFog } from '../fog.js';
import { playFlow } from './flowplay.js';
import { EFFECTS, playEffect, unlock as fxUnlock } from '../fx.js';

const TABS = [
  ['scene', '🎬 Szene'],
  ['flow', '🔀 Weg'],
  ['dice', '🎲 Würfel'],
  ['players', '👥 Spieler'],
  ['items', '🎒 Inventar'],
  ['tablets', '📱 Tablets'],
  ['board', '🗺️ Spielbrett'],
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

  const saveSes = async () => { await saveItem('sessions', ses); live.liveNotify(adv, ses); };
  const saveAdv = async () => { await saveItem('adventures', adv); };
  const saveSesDebounced = debounce(saveSes, 400);
  const addLog = (text, kind = 'note') => { ses.log.push({ id: uid('log'), t: new Date().toISOString(), text, kind }); };
  ensureFlowState(ses);

  // Live-Verbindung zu den Spieler-Tablets (nur wenn für diese Sitzung zugeschaltet)
  const liveUi = { onPlayers: null, sceneRedraw: null };
  let lastClaims = ses.room && ses.room.on ? live.currentClaims(ses.room.code) : {};
  /** Für „Am Tablet würfeln lassen“: verbundene Spieler und Sendefunktion (null, wenn keine Tablets laufen). */
  const tabletOpts = () => {
    if (!(ses.room && ses.room.on && live.getConfig())) return null;
    const players = ses.players.filter((p) => lastClaims[p.id] && lastClaims[p.id].claim).map((p) => ({ id: p.id, name: p.character || p.name }));
    if (!players.length) return null;
    return {
      players,
      send: async (pid, req) => {
        const pl = ses.players.find((x) => x.id === pid);
        if (pl) { pl.rollRequest = req; addLog(`Wurf angefordert bei ${pl.name}: ${req.label} (${req.expr})`, 'note'); }
        await saveSes();
      },
    };
  };
  const liveHooks = {
    onPlayers: (m) => {
      const before = JSON.stringify(Object.keys(lastClaims).filter((k) => lastClaims[k].claim).sort());
      lastClaims = m;
      if (liveUi.onPlayers) liveUi.onPlayers(m);
      if (liveUi.sceneRedraw && before !== JSON.stringify(Object.keys(m).filter((k) => m[k].claim).sort())) liveUi.sceneRedraw();
    },
    onNotes: () => { saveItem('sessions', ses); },
    onChanged: () => { saveSes(); },
    onEvent: (pl, kind, ev) => handleTabletEvent(pl, kind, ev),
  };

  /** Ereignisse von Spieler-Tablets: Wurf, Vorratsänderung, Charakterentwurf. */
  function handleTabletEvent(pl, kind, ev) {
    const who = pl.character || pl.name || 'Spieler';
    if (kind === 'roll') {
      addLog(`🎲 ${who} würfelt${ev.label ? ` „${ev.label}“` : ''}: ${ev.detail || ev.expr} → ${ev.total}`, 'roll');
      toast(`🎲 ${who}: ${ev.total}`, 'info', 3500);
      if (ev.reqId) {
        const r = adv.scenes.flatMap((s) => reqList(s)).find((x) => x.id === ev.reqId);
        if (r && r.type === 'roll') {
          const ok = rollPasses(r, Number(ev.total));
          ses.rolls = ses.rolls || {};
          ses.rolls[r.id] = { total: Number(ev.total), ok, expr: ev.detail || ev.expr, manual: false, by: who, t: new Date().toISOString() };
          addLog(`Wurf „${r.label || 'Probe'}“ von ${who}: ${ev.total} ${ok ? 'geschafft' : 'misslungen'}`, 'roll');
          pl.rollRequest = null;
        }
      }
    } else if (kind === 'res') {
      const rv = pl.resources && pl.resources[ev.key];
      if (rv) {
        rv.value = Math.max(0, Math.min(rv.max, Math.round(Number(ev.value) || 0)));
        const name = (adv.ruleset?.resources || []).find((x) => x.key === ev.key)?.name || ev.key;
        addLog(`${who} setzt ${name} auf ${rv.value}/${rv.max}`, 'note');
      }
    } else if (kind === 'draft') {
      pl.draft = { character: ev.character || '', attrs: ev.attrs || {}, skills: ev.skills || '', background: ev.background || '', t: ev.t };
      pl.createStatus = 'eingereicht';
      pl.createComment = '';
      addLog(`${who} hat einen Charakterentwurf eingereicht`, 'note');
      toast(`📝 Charakterentwurf von ${pl.name}`, 'ok', 5000);
    }
  }
  if (ses.room && ses.room.on && live.getConfig()) live.startLive(adv, ses, liveHooks).catch((e) => console.warn('Live:', e));

  /** Live-Raum (für Tablets und Spielbrett) anlegen. */
  const ensureRoom = async () => {
    if (ses.room && ses.room.on) return true;
    ses.room = { on: true, code: live.newRoomCode(), createdAt: Date.now(), boardImages: [] };
    await saveSes();
    try { await live.startLive(adv, ses, liveHooks); return true; } catch (e) { toast(`Verbindung fehlgeschlagen: ${live.friendlyError(e)}`, 'err', 7000); ses.room = null; await saveItem('sessions', ses); return false; }
  };

  /** Spielbrett: Karte zeigen / leeren / Text zeigen. */
  const boardShowImage = async (im, sceneName) => {
    const api = await live.startLive(adv, ses, liveHooks);
    ses.room.boardImages = ses.room.boardImages || [];
    if (!ses.room.boardImages.includes(im.id)) {
      const d = await imageToDataUrl(im.id);
      if (!d) throw new Error('Das Bild liegt auf diesem Gerät nicht vor (erst synchronisieren).');
      await api.putBoardImage(im.id, im.name, d);
      ses.room.boardImages.push(im.id);
    }
    ses.room.board = { mode: 'image', imageId: im.id, name: im.name || sceneName || '' };
    await boardPush();
  };
  const fogFor = (imageId) => normFog(ses.room && ses.room.fog && ses.room.fog[imageId]);
  /** Aktuellen Spielbrett-Zustand (inkl. Nebel der gezeigten Karte) an die Tablets senden. */
  const boardPush = async () => {
    const api = await live.startLive(adv, ses, liveHooks);
    const b = ses.room.board || { mode: 'blank' };
    await api.setBoard({ ...b, fog: b.mode === 'image' ? fogFor(b.imageId) : null });
    await saveSes();
  };
  const boardSet = async (b) => {
    ses.room.board = b;
    await boardPush();
  };

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
      if (ses.room && ses.room.on && ses.room.boardAuto && (sc.images || []).length) {
        boardShowImage(sc.images[0], sc.name).catch((e) => toast(`Spielbrett: ${live.friendlyError(e)}`, 'err', 6000));
      }
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
            const rc = reqControls(adv, ses, target, { saveSes, addLog, onChange: draw, tablets: tabletOpts() });
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
    liveUi.sceneRedraw = draw;
    return () => { liveUi.sceneRedraw = null; };
  }

  // ---------------------------------------------------------------- Weg (Flowchart)
  if (tab === 'flow') {
    playFlow(panel, adv, ses, { enter: enterScene, saveSes, addLog, tabletOpts });
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
      panel.appendChild(h('p', { class: 'muted small' }, 'Name, Charakter, Werte, Vorräte, Zustände, Fertigkeiten und Gegenstände sehen die Spieler auf ihrem Tablet (Tab „📱 Tablets“). Das untere Notizfeld ist nur für dich.'));

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
        const attrDefs = adv.ruleset?.attributes || [];
        p.attrs = p.attrs || {};
        const attrEls = attrDefs.map((a) => {
          const inp = h('input', { type: 'number', class: 'tiny', value: p.attrs[a.key] ?? '', 'aria-label': `${a.name} von ${p.name}`, min: a.min, max: a.max });
          inp.addEventListener('input', () => { p.attrs[a.key] = inp.value === '' ? '' : Number(inp.value); saveSesDebounced(); });
          return h('label', { class: 'attr' }, h('span', { class: 'small' }, a.name), inp);
        });
        const skillsIn = h('textarea', { rows: 2, placeholder: 'Fertigkeiten, Zauber, Ausrüstung (für den Spieler sichtbar)' }, p.skillsText || '');
        skillsIn.addEventListener('input', () => { p.skillsText = skillsIn.value; saveSesDebounced(); });
        noteIn.placeholder = 'GM-Notizen zu diesem Spieler (nur für dich, nie auf dem Tablet)';
        const card = h('div', { class: 'card player' },
          h('div', { class: 'row gap' }, nameIn, charIn),
          attrEls.length ? h('div', { class: 'attr-list' }, attrEls) : null,
          resEls.length ? h('div', { class: 'res-list' }, resEls) : null,
          condIn, skillsIn, noteIn,
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

  // ---------------------------------------------------------------- Tablets
  if (tab === 'tablets') {
    const cfg = live.getConfig();
    let claims = {};
    const draw = () => {
      clear(panel);
      if (!cfg) {
        panel.appendChild(h('div', { class: 'card' },
          h('h3', {}, '📱 Spieler-Tablets'),
          h('p', {}, 'Jeder Spieler kann sein eigenes Tablet mit dem Charakterbogen nutzen. Dafür braucht die App einmalig eine Live-Verbindung (Firebase, kostenlos).'),
          h('p', {}, h('a', { class: 'btn primary', href: '#/settings' }, 'Live-Verbindung einrichten'), ' ', h('a', { class: 'btn', href: '#/help' }, 'Anleitung'))));
        return;
      }
      if (!ses.room || !ses.room.on) {
        panel.appendChild(h('div', { class: 'card' },
          h('h3', {}, '📱 Spieler-Tablets'),
          h('p', {}, 'Optional zuschaltbar. Die Tablets zeigen dann live den Charakterbogen jedes Spielers. GM-Inhalte (Notizen, Geheimnisse, Szenen) werden nie übertragen.'),
          h('button', {
            class: 'btn primary', type: 'button', 'data-act': 'tablets-on',
            onclick: async () => {
              await ensureRoom();
              draw();
            },
          }, 'Tablets zuschalten')));
        return;
      }
      const code = ses.room.code;
      const copy = async (text, msg) => { await copyText(text); toast(msg, 'ok', 2200); };
      panel.appendChild(h('div', { class: 'card' },
        h('h3', {}, '📱 Spieler-Tablets sind zugeschaltet'),
        h('p', { class: 'muted small' }, `Raumcode: ${live.prettyCode(code)} (geheim halten – wer ihn kennt, sieht die Charakterbögen).`),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn', type: 'button', 'data-act': 'copy-pick', onclick: () => copy(live.roomLink(code), 'Link kopiert: Das Tablet wählt den Spieler selbst') }, '🔗 Auswahl-Link kopieren'),
          h('button', {
            class: 'btn danger', type: 'button', 'data-act': 'tablets-off',
            onclick: async () => {
              if (!(await confirmDialog('Tablets abschalten? Alle Daten dieser Sitzung werden aus Firebase gelöscht, die Tablets verlieren ihre Zuordnung.', { okText: 'Abschalten', danger: true }))) return;
              try { const api = await live.startLive(adv, ses, liveHooks); await api.close(); } catch (e) { console.warn(e); }
              ses.room = null; await saveSes(); draw();
            },
          }, 'Tablets abschalten')),
        h('div', { class: 'row gap wrap permrow' },
          h('label', { class: 'inline' }, h('input', { type: 'checkbox', 'data-perm': 'dice', checked: !(ses.room.perms && ses.room.perms.dice === false), onchange: async (e) => { ses.room.perms = { ...(ses.room.perms || {}), dice: e.target.checked }; await saveSes(); } }), ' Spieler dürfen am Tablet würfeln'),
          h('label', { class: 'inline' }, h('input', { type: 'checkbox', 'data-perm': 'res', checked: !!(ses.room.perms && ses.room.perms.res), onchange: async (e) => { ses.room.perms = { ...(ses.room.perms || {}), res: e.target.checked }; await saveSes(); } }), ' Spieler dürfen ihre Vorräte (z. B. Lebenspunkte) selbst ändern')),
        h('p', { class: 'muted small' }, 'Jedes Tablet öffnet den Link und tippt auf seinen Namen, oder du schickst jedem Spieler seinen eigenen Link (🔗 pro Zeile).')));
      const fxTarget = h('select', { 'aria-label': 'Empfänger des Effekts', 'data-fx': 'target' },
        h('option', { value: 'all' }, 'Alle Tablets + Spielbrett'), h('option', { value: 'board' }, 'Nur Spielbrett'),
        ses.players.map((p) => h('option', { value: p.id }, p.character || p.name || 'Spieler')));
      const fxText = h('input', { type: 'text', maxlength: 80, placeholder: 'Optionaler Text auf dem Bildschirm, z. B. „Hinterhalt!“', 'aria-label': 'Effekttext', 'data-fx': 'text' });
      panel.appendChild(h('div', { class: 'card fxpanel' },
        h('h3', {}, '🔊 Töne und Effekte'),
        h('p', { class: 'muted small' }, 'Spielt einen Klang mit Bildschirm-Blitz auf den gewählten Tablets. Tablets müssen einmal „Töne aktivieren“ angetippt haben.'),
        h('div', { class: 'row gap wrap' }, fxTarget, fxText),
        h('div', { class: 'row gap wrap' }, EFFECTS.map((e) => h('button', {
          class: 'btn small', type: 'button', 'data-fx-send': e.id,
          onclick: async () => {
            try {
              fxUnlock();
              const api = await live.startLive(adv, ses, liveHooks);
              await api.sendFx(fxTarget.value, e.id, fxText.value.trim());
              playEffect(e.id, fxText.value.trim());
              toast(`${e.label} gesendet`, 'ok', 1500);
            } catch (err) { toast(live.friendlyError(err), 'err', 5000); }
          },
        }, e.label)))));
      if (!ses.players.length) panel.appendChild(h('div', { class: 'empty' }, 'Noch keine Spieler. Lege sie im Tab „👥 Spieler“ an.'));
      for (const p of ses.players) {
        const c = (claims[p.id] || {}).claim;
        panel.appendChild(h('div', { class: 'card row gap wrap tabletrow', 'data-pid': p.id },
          h('div', { class: 'grow' }, h('strong', {}, p.name || 'Spieler'), p.character ? h('span', { class: 'muted small block' }, p.character) : null),
          h('span', { class: `chip ${c ? 'ok' : ''}`, 'data-claim': c ? 'yes' : 'no' }, c ? `📱 ${c.name || 'Tablet'} verbunden` : '○ noch kein Tablet'),
          h('button', { class: 'btn small', type: 'button', 'data-act': 'copy-player', onclick: () => copy(live.roomLink(code, p.id), `Link für ${p.name} kopiert`) }, '🔗 Link'),
          h('button', {
            class: 'btn small', type: 'button', 'data-act': 'create-toggle',
            onclick: async () => { p.createOpen = !p.createOpen; if (p.createOpen && p.createStatus !== 'eingereicht') p.createStatus = 'offen'; await saveSes(); draw(); },
          }, p.createOpen ? '✏️ Erschaffung schließen' : '✏️ Erschaffung erlauben'),
          c ? h('button', {
            class: 'btn small', type: 'button', 'data-act': 'release',
            onclick: async () => { try { const api = await live.startLive(adv, ses, liveHooks); await api.release(p.id); } catch (e) { toast(e.message, 'err'); } },
          }, 'Freigeben') : null));
        if (p.draft && p.createStatus === 'eingereicht') {
          const d = p.draft;
          const attrDefs = adv.ruleset?.attributes || [];
          const comment = h('input', { type: 'text', placeholder: 'Anmerkung für den Spieler (bei „Zurückgeben“)', 'aria-label': `Anmerkung für ${p.name}` });
          panel.appendChild(h('div', { class: 'card draftcard', 'data-draft': p.id },
            h('h3', {}, `📝 Entwurf von ${p.name}`),
            h('p', {}, h('strong', {}, d.character || '(ohne Namen)')),
            attrDefs.length ? h('p', {}, attrDefs.map((a) => `${a.name} ${d.attrs && d.attrs[a.key] !== undefined ? d.attrs[a.key] : '–'}`).join(' · ')) : null,
            d.skills ? h('p', { class: 'sheet-text' }, `Fertigkeiten: ${d.skills}`) : null,
            d.background ? h('p', { class: 'sheet-text' }, `Hintergrund: ${d.background}`) : null,
            h('div', { class: 'row gap wrap' }, comment,
              h('button', {
                class: 'btn small primary', type: 'button', 'data-act': 'draft-accept',
                onclick: async () => {
                  p.character = d.character || p.character;
                  p.attrs = { ...(p.attrs || {}), ...(d.attrs || {}) };
                  p.skillsText = d.skills || p.skillsText || '';
                  p.background = d.background || '';
                  p.draft = null; p.createStatus = 'übernommen'; p.createComment = ''; p.createOpen = false;
                  addLog(`Charakter von ${p.name} übernommen: ${p.character}`, 'note');
                  await saveSes(); draw();
                },
              }, '✔ Übernehmen'),
              h('button', {
                class: 'btn small', type: 'button', 'data-act': 'draft-return',
                onclick: async () => {
                  p.createStatus = 'zurückgegeben'; p.createComment = comment.value.trim(); p.createOpen = true;
                  await saveSes(); draw();
                },
              }, '↩ Zurückgeben'))));
        }
      }
    };
    liveUi.onPlayers = (m) => { claims = m; if (panel.isConnected) draw(); };
    draw();
    if (ses.room && ses.room.on && cfg) live.startLive(adv, ses, liveHooks).then((api) => { claims = api.claims(); draw(); }).catch((e) => toast(`Live-Verbindung: ${e.message}`, 'err', 6000));
    return () => { liveUi.onPlayers = null; };
  }

  // ---------------------------------------------------------------- Spielbrett
  if (tab === 'board') {
    const cfg = live.getConfig();
    const fogCard = (b) => {
      let fog = fogFor(b.imageId);
      const save = () => { ses.room.fog = ses.room.fog || {}; ses.room.fog[b.imageId] = fog; };
      const push = debounce(async () => { save(); try { await boardPush(); } catch (e) { toast(`Spielbrett: ${live.friendlyError(e)}`, 'err', 6000); } }, 250);
      const info = h('span', { class: 'muted small', 'data-fog-count': '1' });
      const img = h('img', { alt: '' });
      getImageUrl(b.imageId).then((u) => { if (u) img.src = u; });
      const canvas = h('canvas', { 'aria-label': 'Nebel bearbeiten', 'data-fog-canvas': '1' });
      const wrap = h('div', { class: 'fogwrap' }, img, canvas);
      const paint = () => {
        drawFog(canvas, fog, { opacity: 0.62, grid: true });
        info.textContent = fog.on ? `${revealedCount(fog)} von ${fog.cols * fog.rows} Feldern aufgedeckt` : 'Nebel ist aus: Die Karte ist komplett sichtbar.';
      };
      img.addEventListener('load', paint);
      let painting = null;
      const at = (e) => { const r = canvas.getBoundingClientRect(); return cellOf(fog, e.clientX - r.left, e.clientY - r.top, r.width, r.height); };
      canvas.addEventListener('pointerdown', (e) => {
        if (!fog.on) return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const i = at(e);
        painting = fog.bits[i] === '1' ? '0' : '1';
        fog = { ...fog, bits: setBit(fog.bits, i, painting === '1') };
        paint(); push();
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!painting) return;
        const i = at(e);
        if (fog.bits[i] !== painting) { fog = { ...fog, bits: setBit(fog.bits, i, painting === '1') }; paint(); push(); }
      });
      const stop = () => { painting = null; };
      canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
      const sizeSel = h('select', { 'aria-label': 'Rastergröße', 'data-fog-size': '1' }, FOG_SIZES.map(([c, r]) => h('option', { value: `${c}x${r}`, selected: c === fog.cols && r === fog.rows }, `${c} × ${r} Felder`)));
      sizeSel.addEventListener('change', () => { const [c, r] = sizeSel.value.split('x').map(Number); fog = { ...newFog(c, r), on: fog.on }; paint(); push(); });
      const card = h('div', { class: 'card fogpanel', 'data-fogcard': '1' },
        h('h3', {}, '🌫️ Nebel des Krieges'),
        h('p', { class: 'muted small' }, 'Aktiv: Die Spieler sehen nur aufgedeckte Felder. Tippe oder wische über die Vorschau, um Felder aufzudecken oder wieder zu verdecken.'),
        h('div', { class: 'row gap wrap' },
          h('label', { class: 'inline' }, h('input', { type: 'checkbox', 'data-fog-on': '1', checked: fog.on, onchange: (e) => { fog = { ...fog, on: e.target.checked }; paint(); push(); } }), ' Nebel aktiv'),
          sizeSel,
          h('button', { class: 'btn small', type: 'button', 'data-act': 'fog-reveal-all', onclick: () => { fog = { ...fog, bits: allBits(fog, true) }; paint(); push(); } }, 'Alles aufdecken'),
          h('button', { class: 'btn small', type: 'button', 'data-act': 'fog-cover-all', onclick: () => { fog = { ...fog, bits: allBits(fog, false) }; paint(); push(); } }, 'Alles verdecken')),
        info, wrap);
      requestAnimationFrame(paint);
      return card;
    };
    const draw = () => {
      clear(panel);
      if (!cfg) {
        panel.appendChild(h('div', { class: 'card' }, h('h3', {}, '🗺️ Spielbrett'),
          h('p', {}, 'Ein Tablet in der Tischmitte zeigt dann die Karten, die du freigibst. Dafür braucht die App einmalig die Live-Verbindung (Firebase).'),
          h('p', {}, h('a', { class: 'btn primary', href: '#/settings' }, 'Live-Verbindung einrichten'))));
        return;
      }
      if (!ses.room || !ses.room.on) {
        panel.appendChild(h('div', { class: 'card' }, h('h3', {}, '🗺️ Spielbrett'),
          h('p', {}, 'Optional zuschaltbar. Das Tablet in der Tischmitte zeigt nur, was du ausdrücklich freigibst: eine Karte, einen Text oder nichts. GM-Inhalte sind nie sichtbar.'),
          h('button', { class: 'btn primary', type: 'button', 'data-act': 'room-on', onclick: async () => { await ensureRoom(); draw(); } }, 'Spielbrett zuschalten')));
        return;
      }
      const b = ses.room.board || null;
      const status = !b || b.mode === 'blank' ? 'Leer (Wartebild)' : b.mode === 'text' ? `Text: „${b.text}“` : `Karte: ${b.name || 'ohne Namen'}`;
      const wrap = async (fn) => { try { await fn(); draw(); } catch (e) { toast(`Spielbrett: ${live.friendlyError(e)}`, 'err', 7000); } };
      const textIn = h('input', { type: 'text', placeholder: 'Kurzer Text für alle, z. B. „Ihr hört ein Heulen …“', 'aria-label': 'Text für das Spielbrett' });
      panel.appendChild(h('div', { class: 'card' },
        h('h3', {}, '🗺️ Spielbrett'),
        h('p', { class: 'muted small' }, 'Öffne den Spielbrett-Link auf dem Tablet in der Tischmitte (Vollbild-Knopf oben rechts).'),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn', type: 'button', 'data-act': 'copy-board', onclick: async () => { await copyText(live.boardLink(ses.room.code)); toast('Spielbrett-Link kopiert', 'ok', 2200); } }, '🔗 Spielbrett-Link kopieren')),
        h('p', {}, h('strong', {}, 'Gerade zu sehen: '), h('span', { 'data-board-status': '1' }, status)),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn', type: 'button', 'data-act': 'board-clear', onclick: () => wrap(() => boardSet({ mode: 'blank' })) }, '⬛ Leeren'),
          textIn,
          h('button', { class: 'btn', type: 'button', 'data-act': 'board-text', onclick: () => { const t = textIn.value.trim(); if (t) wrap(() => boardSet({ mode: 'text', text: t })); } }, '💬 Text zeigen')),
        h('label', { class: 'inline' },
          h('input', { type: 'checkbox', 'data-act': 'board-auto', checked: !!ses.room.boardAuto, onchange: async (e) => { ses.room.boardAuto = e.target.checked; await saveSes(); } }),
          ' Bei Szenenwechsel automatisch die erste Karte der neuen Szene zeigen')));
      if (b && b.mode === 'image') panel.appendChild(fogCard(b));
      const order = [...adv.scenes].sort((x, y) => (x.id === ses.currentSceneId ? -1 : 0) - (y.id === ses.currentSceneId ? -1 : 0));
      let any = false;
      for (const sc of order) {
        for (const im of sc.images || []) {
          any = true;
          const on = b && b.mode === 'image' && b.imageId === im.id;
          const thumb = h('img', { alt: '' });
          getImageUrl(im.id).then((u) => { if (u) thumb.src = u; });
          panel.appendChild(h('div', { class: `card boardpick${on ? ' on' : ''}`, 'data-img': im.id },
            thumb,
            h('div', { class: 'grow' }, h('strong', {}, im.name || 'Karte'), h('span', { class: 'muted small block' }, sc.name + (sc.id === ses.currentSceneId ? ' (aktuelle Szene)' : ''))),
            h('button', { class: 'btn small primary', type: 'button', 'data-act': 'board-show', onclick: () => wrap(() => boardShowImage(im, sc.name)) }, on ? '✔ Zu sehen' : '▶ Zeigen')));
        }
      }
      if (!any) panel.appendChild(h('div', { class: 'empty' }, 'Noch keine Karten. Hänge in der Werkstatt (Tab „🔀 Handlung“) Bilder an Knoten.'));
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
