// Bedienung der Bedingungen einer Szene im Spielleiter-Modus (Gegenstände & Würfe).
import { h, uid, toast } from '../util.js';
import { rollExpr, describeRoll } from '../dice.js';
import { reqList, reqState, rollPasses, hasItem } from '../flow.js';

/** Gegenstand ins Gruppen-Inventar legen (holder '' = Gruppe). */
export function giveItem(ses, name, holder = '') {
  const n = String(name || '').trim();
  if (!n) return null;
  ses.items = ses.items || [];
  const it = { id: uid('itm'), name: n, holder };
  ses.items.push(it);
  return it;
}

/**
 * Zeigt alle Bedingungen einer Szene mit Status und Knöpfen.
 * ctx: { saveSes, addLog, onChange }  – onChange zeichnet die umgebende Ansicht neu.
 * Gibt null zurück, wenn die Szene keine Bedingungen hat.
 */
export function reqControls(adv, ses, scene, { saveSes, addLog, onChange }) {
  const reqs = reqList(scene);
  if (!reqs.length) return null;
  const box = h('div', { class: 'reqbox' }, h('div', { class: 'muted small' }, 'Bedingungen für diese Szene'));
  const done = async () => { await saveSes(); onChange(); };

  for (const r of reqs) {
    const st = reqState(ses, r);
    const row = h('div', { class: `reqrow ${st.met ? 'met' : 'open'}`, 'data-req': r.id });
    if (r.type === 'item') {
      row.append(...[
        h('span', { class: 'grow' }, `🔑 ${r.item}: `, h('strong', {}, st.met ? '✔ vorhanden' : '✘ fehlt')),
        st.met ? null : h('button', {
          class: 'btn small', type: 'button',
          onclick: async () => { giveItem(ses, r.item); addLog(`Gegenstand erhalten: ${r.item}`, 'note'); toast(`„${r.item}“ ins Inventar gelegt`, 'ok'); await done(); },
        }, '＋ Ins Inventar')].filter(Boolean));
    } else {
      const sign = r.cmp === '<=' ? '≤' : '≥';
      const res = st.result;
      const resText = res ? `${res.ok ? '✔ geschafft' : '✘ misslungen'} (${res.total}${res.manual ? ', eingetragen' : ''})` : 'noch offen';
      const apply = async (total, expr, manual) => {
        const ok = rollPasses(r, total);
        ses.rolls = ses.rolls || {};
        ses.rolls[r.id] = { total, ok, expr, manual: !!manual, t: new Date().toISOString() };
        addLog(`Wurf „${r.label || 'Probe'}“: ${expr} → ${total} (${sign} ${r.target}) ${ok ? 'geschafft' : 'misslungen'}`, 'roll');
        await done();
      };
      const manualIn = h('input', { type: 'number', class: 'tiny', placeholder: 'Wert', 'aria-label': `Ergebnis für ${r.label || 'Probe'} eintragen` });
      row.append(...[
        h('span', { class: 'grow' }, `🎲 ${r.label || 'Probe'} (${r.expr} ${sign} ${r.target}): `, h('strong', {}, resText)),
        h('button', {
          class: 'btn small primary', type: 'button',
          onclick: async () => {
            let rr;
            try { rr = rollExpr(r.expr); } catch (e) { toast(e.message, 'err'); return; }
            toast(describeRoll(rr), 'info', 4000);
            await apply(rr.total, describeRoll(rr), false);
          },
        }, res ? '🎲 Nochmal würfeln' : '🎲 Würfeln'),
        manualIn,
        h('button', {
          class: 'btn small', type: 'button',
          onclick: async () => {
            const v = parseInt(manualIn.value, 10);
            if (!Number.isFinite(v)) { toast('Bitte einen Zahlenwert eintragen', 'err'); return; }
            await apply(v, `${r.expr} (am Tisch gewürfelt)`, true);
          },
        }, 'Eintragen'),
        res ? h('button', {
          class: 'btn small', type: 'button',
          onclick: async () => { delete ses.rolls[r.id]; await done(); },
        }, 'Zurücksetzen') : null].filter(Boolean));
    }
    box.appendChild(row);
  }
  return box;
}

export { hasItem };
