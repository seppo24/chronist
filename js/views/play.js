// Spieler-Tablet: zeigt live den eigenen Charakterbogen. Route: #/play/<Raumcode>/<Spieler-id oder ->/<Konfiguration oder ->
import { h, clear, put, confirmDialog, debounce, uid } from '../util.js';
import * as live from '../live.js';
import { rollExpr, describeRoll } from '../dice.js';
import { playEffect, playSound, unlock, isUnlocked, isMuted, setMuted } from '../fx.js';

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
    put(root, 
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
    let curP = null;
    let mode = 'sheet'; // 'sheet' | 'create'
    let lastRoll = null;
    let localSubmitted = false;
    const history = [];
    let exprValue = '';
    const saveNotes = debounce(async () => { try { await live.tabletSaveNotes(code, pid, noteBox.value); } catch (e) { console.warn(e); } }, 700);

    const doRoll = async (expr, label, reqId) => {
      let r;
      try { r = rollExpr(expr); } catch (e) { lastRoll = { error: e.message }; draw(); return; }
      playSound('dice');
      lastRoll = { expr: r.expr, total: r.total, detail: describeRoll(r), label: label || '' };
      history.unshift(lastRoll); history.splice(5);
      draw();
      try { await live.tabletSend(code, pid, 'lastRoll', { expr: r.expr, total: r.total, detail: describeRoll(r), label: label || '', reqId: reqId || '' }); } catch (e) { console.warn(e); }
    };

    let prevP = null;
    let lastFxId;
    // Effekte: Befehle des Spielleiters und automatische Reaktion auf Lebenspunkte
    const reactFx = (old, p) => {
      const fx = p.fx;
      if (lastFxId === undefined) lastFxId = fx ? fx.id : null; // alter Effekt beim Öffnen: nicht erneut abspielen
      else if (fx && fx.id !== lastFxId) { lastFxId = fx.id; playEffect(fx.type, fx.text || ''); }
      if (!old) return;
      for (const r of p.resources || []) {
        const o = (old.resources || []).find((x) => x.key === r.key);
        if (!o || o.value === r.value) continue;
        if (r.value <= 0 && o.value > 0) playEffect('ko', '');
        else if (r.value < o.value) playEffect('hit', '');
        else playEffect('heal', '');
      }
    };

    const pending = {}; // eigene, noch nicht vom Spielleiter bestätigte Vorratsänderungen
    const shownValue = (r) => {
      const pd = pending[r.key];
      if (!pd) return r.value;
      if (r.value === pd.value || Date.now() - pd.t > 6000) { delete pending[r.key]; return r.value; }
      return pd.value;
    };
    const changeRes = async (r, d) => {
      const rv = curP.resources.find((x) => x.key === r.key);
      const nv = Math.max(0, Math.min(rv.max, shownValue(rv) + d));
      if (nv === shownValue(rv)) return;
      pending[r.key] = { value: nv, t: Date.now() };
      draw();
      try { await live.tabletSend(code, pid, 'resEdit', { key: r.key, value: nv }); } catch (e) { console.warn(e); }
    };

    function drawCreate() {
      const p = curP;
      const cr = p.create || {};
      const cur = cr.current || {};
      const attrs = p.attrs || [];
      const vals = {};
      for (const a of attrs) vals[a.key] = Number.isFinite(Number(cur.attrs && cur.attrs[a.key])) && cur.attrs[a.key] !== '' && cur.attrs[a.key] !== undefined ? Number(cur.attrs[a.key]) : (a.min ?? 0);
      const lo = (a) => (a.min ?? 0);
      const hi = (a) => (a.max ?? 20);
      const spent = () => attrs.reduce((n, a) => n + (vals[a.key] - lo(a)), 0);
      const nameIn = h('input', { type: 'text', value: cur.character || '', placeholder: 'Name deines Charakters', 'aria-label': 'Charaktername', class: 'bigin' });
      const skillsIn = h('textarea', { rows: 3, placeholder: 'Fertigkeiten, Zauber, Ausrüstung …', 'aria-label': 'Fertigkeiten' }, cur.skills || '');
      const bgIn = h('textarea', { rows: 4, placeholder: 'Herkunft, Aussehen, Ziele …', 'aria-label': 'Hintergrund' }, cur.background || '');
      const pool = h('div', { class: 'pool' });
      const tiles = h('div', { class: 'attr-grid' });
      const drawAttrs = () => {
        clear(tiles);
        if (cr.points) { pool.textContent = `Verfügbare Punkte: ${cr.points - spent()} von ${cr.points}`; pool.classList.toggle('over', cr.points - spent() < 0); }
        for (const a of attrs) {
          tiles.appendChild(h('div', { class: 'attr-tile', 'data-attr': a.key },
            h('div', { class: 'attr-name' }, a.name),
            h('div', { class: 'stepper' },
              h('button', { class: 'btn step', type: 'button', 'aria-label': `${a.name} senken`, onclick: () => { if (vals[a.key] > lo(a)) { vals[a.key]--; drawAttrs(); } } }, '−'),
              h('span', { class: 'attr-val' }, String(vals[a.key])),
              h('button', { class: 'btn step', type: 'button', 'aria-label': `${a.name} erhöhen`, onclick: () => { if (vals[a.key] < hi(a) && (!cr.points || spent() < cr.points)) { vals[a.key]++; drawAttrs(); } } }, '+')),
            a.description ? h('div', { class: 'muted small' }, a.description) : null));
        }
      };
      drawAttrs();
      clear(sheet);
      put(sheet, 
        h('div', { class: 'sheet-head' }, h('h2', {}, 'Charakter erschaffen'), cr.note ? h('div', { class: 'muted' }, cr.note) : null),
        cr.comment ? h('div', { class: 'sheet-block notice' }, h('strong', {}, 'Anmerkung des Spielleiters: '), cr.comment) : null,
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Name'), nameIn),
        attrs.length ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Werte'), cr.points ? pool : null, tiles) : null,
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Fertigkeiten & Ausrüstung'), skillsIn),
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Hintergrund'), bgIn),
        h('div', { class: 'row gap wrap end' },
          h('button', { class: 'btn', type: 'button', 'data-act': 'create-cancel', onclick: () => { mode = 'sheet'; draw(); } }, 'Abbrechen'),
          h('button', {
            class: 'btn primary', type: 'button', 'data-act': 'create-submit',
            onclick: async () => {
              if (!nameIn.value.trim()) { nameIn.focus(); return; }
              if (cr.points && spent() > cr.points) { return; }
              try { await live.tabletSend(code, pid, 'charDraft', { character: nameIn.value.trim(), attrs: { ...vals }, skills: skillsIn.value, background: bgIn.value }); } catch (e) { console.warn(e); return; }
              localSubmitted = true; mode = 'sheet'; draw();
            },
          }, 'Beim Spielleiter einreichen')));
    }

    function draw() {
      const p = curP;
      if (!p) return;
      if (mode === 'create') { drawCreate(); return; }
      const perms = p.perms || {};
      const cr = { ...(p.create || {}) };
      if (cr.status === 'zurückgegeben' || cr.status === 'übernommen') localSubmitted = false;
      if (localSubmitted && cr.open && cr.status !== 'zurückgegeben') cr.status = 'eingereicht';
      const focused = noteBox && document.activeElement === noteBox;
      const keepNotes = focused ? noteBox.value : (typeof p.playerNotes === 'string' ? p.playerNotes : (lastNotes ?? ''));
      lastNotes = keepNotes;
      clear(sheet);
      put(sheet, 
        h('div', { class: 'sheet-head' },
          h('h2', {}, p.character || p.name || 'Spieler'),
          h('div', { class: 'muted' }, [p.character ? p.name : '', p.rule, p.adventure].filter(Boolean).join(' · '))),
        p.request ? h('div', { class: 'sheet-block notice', 'data-request': p.request.reqId },
          h('strong', {}, `Der Spielleiter bittet dich um einen Wurf: ${p.request.label}`),
          h('div', { class: 'muted' }, p.request.expr),
          h('button', { class: 'btn primary big', type: 'button', 'data-act': 'roll-request', onclick: () => doRoll(p.request.expr, p.request.label, p.request.reqId) }, `🎲 ${p.request.expr} würfeln`)) : null,
        cr.open ? h('div', { class: 'sheet-block notice', 'data-create-open': '1' },
          h('strong', {}, cr.status === 'zurückgegeben' ? 'Der Spielleiter hat deinen Entwurf zurückgegeben.' : 'Du kannst deinen Charakter erschaffen.'),
          cr.comment ? h('div', {}, cr.comment) : null,
          cr.status === 'eingereicht' ? h('div', { class: 'muted' }, 'Entwurf eingereicht, der Spielleiter prüft ihn.') : null,
          h('button', { class: 'btn primary', type: 'button', 'data-act': 'create-open', onclick: () => { mode = 'create'; draw(); } }, cr.status === 'eingereicht' ? '✏️ Entwurf ändern' : '✏️ Charakter erschaffen')) : null,
        cr.status === 'übernommen' && !cr.open ? h('div', { class: 'sheet-block ok' }, '✔ Dein Charakter wurde vom Spielleiter übernommen.') : null,
        (p.attrs || []).length ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Werte'),
          h('div', { class: 'attr-grid' }, p.attrs.map((a) => h('div', { class: 'attr-tile', title: a.description || '' },
            h('div', { class: 'attr-val' }, a.value === null || a.value === undefined ? '–' : String(a.value)), h('div', { class: 'attr-name' }, a.name))))) : null,
        (p.resources || []).length ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Vorräte'),
          p.resources.map((r0) => {
            const r = { ...r0, value: shownValue(r0) };
            const pct = r.max > 0 ? Math.max(0, Math.min(100, Math.round((r.value / r.max) * 100))) : 0;
            return h('div', { class: `bar${pct <= 25 ? ' low' : ''}`, 'data-res': r.key },
              h('div', { class: 'bar-label' }, h('span', {}, r.name),
                h('span', { class: 'bar-ctrl' },
                  perms.res ? h('button', { class: 'btn step', type: 'button', 'aria-label': `${r.name} minus`, onclick: () => changeRes(r, -1) }, '−') : null,
                  h('strong', {}, `${r.value} / ${r.max}`),
                  perms.res ? h('button', { class: 'btn step', type: 'button', 'aria-label': `${r.name} plus`, onclick: () => changeRes(r, 1) }, '+') : null)),
              h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: `${pct}%` } })));
          })) : null,
        p.conditions ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Zustände'), h('p', { class: 'sheet-text' }, p.conditions)) : null,
        p.skills ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Fertigkeiten & Ausrüstung'), h('p', { class: 'sheet-text' }, p.skills)) : null,
        p.background ? h('div', { class: 'sheet-block' }, h('h3', {}, 'Hintergrund'), h('p', { class: 'sheet-text' }, p.background)) : null,
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Gegenstände'),
          (p.items || []).length ? h('div', { class: 'row gap wrap' }, p.items.map((i) => h('span', { class: 'chip' }, `🎒 ${i}`))) : h('p', { class: 'muted' }, 'Du trägst nichts Besonderes bei dir.'),
          (p.groupItems || []).length ? h('p', { class: 'muted small' }, 'Gruppe:') : null,
          (p.groupItems || []).length ? h('div', { class: 'row gap wrap' }, p.groupItems.map((i) => h('span', { class: 'chip' }, `👥 ${i}`))) : null),
        perms.dice ? diceBlock(p) : null);
      noteBox = h('textarea', { rows: 5, class: 'sheet-notes', placeholder: 'Deine Notizen …', 'aria-label': 'Deine Notizen' }, keepNotes);
      noteBox.addEventListener('input', saveNotes);
      put(sheet, 
        h('div', { class: 'sheet-block' }, h('h3', {}, 'Meine Notizen'), noteBox),
        h('div', { class: 'row end' }, h('button', {
          class: 'btn small', type: 'button', 'data-act': 'unpair',
          onclick: async () => {
            if (!(await confirmDialog('Dieses Tablet von diesem Spieler lösen?', { okText: 'Lösen' }))) return;
            setPaired(code, ''); unsub(); await showPick();
          },
        }, 'Tablet-Zuordnung lösen')));
    }

    function diceBlock(p) {
      const exprIn = h('input', { type: 'text', value: exprValue, placeholder: 'z. B. 2W6+1', 'aria-label': 'Würfelausdruck', class: 'short' });
      exprIn.addEventListener('input', () => { exprValue = exprIn.value; });
      const quick = [4, 6, 8, 10, 12, 20, 100];
      return h('div', { class: 'sheet-block dice-block', 'data-block': 'dice' },
        h('h3', {}, 'Würfeln'),
        p.dice && p.dice.primary ? h('button', { class: 'btn primary big', type: 'button', 'data-act': 'roll-primary', onclick: () => doRoll(p.dice.primary, 'Hauptwurf') }, `🎲 Hauptwurf (${p.dice.primary})`) : null,
        p.dice && p.dice.how ? h('p', { class: 'muted small' }, p.dice.how) : null,
        h('div', { class: 'row gap wrap' }, quick.map((n) => h('button', { class: 'btn', type: 'button', 'data-die': n, onclick: () => doRoll(`1W${n}`) }, `W${n}`))),
        h('div', { class: 'row gap wrap' }, exprIn, h('button', { class: 'btn', type: 'button', 'data-act': 'roll-expr', onclick: () => { if (exprIn.value.trim()) doRoll(exprIn.value.trim()); } }, 'Würfeln')),
        lastRoll ? (lastRoll.error ? h('p', { class: 'err' }, lastRoll.error) : h('div', { class: 'roll-result', 'data-total': lastRoll.total },
          h('div', { class: 'roll-total' }, String(lastRoll.total)),
          h('div', { class: 'muted' }, `${lastRoll.label ? `${lastRoll.label}: ` : ''}${lastRoll.detail}`))) : null,
        history.length > 1 ? h('div', { class: 'muted small' }, 'Davor: ' + history.slice(1).map((x) => `${x.expr} → ${x.total}`).join(' · ')) : null);
    }

    const unsub = await live.tabletWatchPlayer(code, pid, async (p) => {
      if (!p) { setPaired(code, ''); unsub(); await showPick('Dieser Spieler ist nicht mehr in der Sitzung. Bitte neu wählen.'); return; }
      const mine = p.claim && p.claim.id === device.id;
      if (mine) seenClaim = true;
      if (!mine && seenClaim) { setPaired(code, ''); unsub(); await showPick('Die Zuordnung dieses Tablets wurde aufgehoben. Bitte neu wählen.'); return; }
      if (!mine && !claimed) { claimed = true; live.tabletClaim(code, pid, device).catch((e) => console.warn(e)); }
      ctx.setTitle(p.character || p.name || 'Charakterbogen');
      // Eigene, noch nicht bestätigte Vorratsänderungen nicht mit altem Stand überschreiben
      reactFx(prevP, p);
      prevP = p;
      curP = p;
      if (mode === 'create' && !(p.create && p.create.open)) mode = 'sheet';
      if (mode === 'create') return; // Eingabe nicht stören
      draw();
    });
    cleanups.push(unsub);
  }

  main.appendChild(soundButton());
  if (pid) await showSheet(); else await showPick();
  return () => { saveCleanup(); };
  function saveCleanup() { for (const c of cleanups.splice(0)) { try { c(); } catch { /* egal */ } } }
}

/** Schwebender Knopf: Töne aktivieren (Browser verlangt eine Berührung) bzw. stumm schalten. */
export function soundButton() {
  const b = h('button', { class: 'btn small fx-toggle', type: 'button', 'data-act': 'sound' });
  const upd = () => { b.textContent = !isUnlocked() ? '🔊 Töne aktivieren' : (isMuted() ? '🔇 Ton aus' : '🔊 Ton an'); };
  b.addEventListener('click', () => {
    if (!isUnlocked()) { unlock(); setMuted(false); setTimeout(() => { playSound('gong'); upd(); }, 60); }
    else { setMuted(!isMuted()); if (!isMuted()) playSound('gong'); }
    upd();
  });
  // Eine beliebige Berührung entsperrt den Ton schon vorab (außer auf dem Knopf selbst)
  document.addEventListener('pointerdown', (e) => { if (!b.contains(e.target) && !isMuted()) { unlock(); setTimeout(upd, 60); } }, { once: true });
  upd();
  return b;
}
