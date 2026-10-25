// Darstellung von Regelwerk und komplettem Abenteuer als Markdown (Anzeige + Export).
import { SECTIONS, COLLECTIONS, STATUS_LABELS } from './adventure.js';

export function rulesetToMd(rs) {
  if (!rs) return '_Noch kein Regelwerk festgelegt._';
  const o = [];
  o.push(`# ${rs.name || 'Regelwerk'}`);
  if (rs.summary) o.push(rs.summary);
  if (rs.dice) {
    o.push('## Würfelmechanik');
    o.push(`**Standardwurf:** ${rs.dice.primary || '–'}`);
    if (rs.dice.how_it_works) o.push(rs.dice.how_it_works);
  }
  if (rs.attributes?.length) {
    o.push('## Grundwerte');
    o.push('| Wert | Bedeutung | Spanne |\n|---|---|---|\n' + rs.attributes.map((a) =>
      `| **${a.name}** | ${String(a.description || '').replace(/\|/g, '/')} | ${a.min ?? ''}${a.min !== undefined && a.max !== undefined ? '–' : ''}${a.max ?? ''} |`).join('\n'));
  }
  if (rs.resources?.length) {
    o.push('## Vorräte');
    o.push(rs.resources.map((r) => `- **${r.name}** (Start ${r.max})${r.description ? ` – ${r.description}` : ''}`).join('\n'));
  }
  if (rs.skills?.length) {
    o.push('## Fertigkeiten & Fähigkeiten');
    o.push(rs.skills.map((s) => `- **${s.name}**${s.attribute ? ` _(${s.attribute})_` : ''} – ${s.description || ''}`).join('\n'));
  }
  if (rs.conditions?.length) {
    o.push('## Zustände');
    o.push(rs.conditions.map((c) => `- **${c.name}** – ${c.effect}`).join('\n'));
  }
  if (rs.combat) o.push('## Kampf & Konflikte\n' + rs.combat);
  if (rs.magic) o.push('## Magie & Spezielles\n' + rs.magic);
  if (rs.progression) o.push('## Fortschritt\n' + rs.progression);
  if (rs.extra) o.push('## Weiteres\n' + rs.extra);
  return o.join('\n\n');
}

export function adventureToMarkdown(adv) {
  const o = [];
  o.push(`# ${adv.title}`);
  o.push(`_${adv.setting || ''}_  \nStatus: ${STATUS_LABELS[adv.status] || adv.status} · Spieler: ${adv.playerCount} + Spielleitung`);
  for (const s of SECTIONS) {
    if (adv.sections[s.id]?.trim()) o.push(`## ${s.title}${s.gmOnly ? ' (nur GM)' : ''}\n\n${adv.sections[s.id].trim()}`);
  }
  if (adv.ruleset) o.push('## Regelwerk (Kurzfassung)\n\n' + rulesetToMd(adv.ruleset).replace(/^# /gm, '### ').replace(/^## /gm, '### '));
  for (const [col, def] of Object.entries(COLLECTIONS)) {
    if (!adv[col].length) continue;
    o.push(`## ${def.label}`);
    adv[col].forEach((it, i) => {
      const lines = [`### ${col === 'scenes' ? `${i + 1}. ` : ''}${it.name}`];
      for (const f of def.fields) {
        if (f.key === 'name' || !it[f.key]) continue;
        lines.push(`**${f.label}:** ${it[f.key]}`);
      }
      if (col === 'scenes') {
        const outs = (it.links || []).map((l) => adv.scenes.find((s) => s.id === l.to)).filter(Boolean);
        if (outs.length) lines.push(`**Führt weiter zu:** ${outs.map((s) => s.name).join(', ')}`);
        const preds = adv.scenes.filter((s) => (s.links || []).some((l) => l.to === it.id));
        if (preds.length >= 2 && it.unlock && it.unlock.mode !== 'any') {
          lines.push(`**Frei, wenn:** ${it.unlock.mode === 'all' ? 'alle' : `mindestens ${it.unlock.count} von`} ${preds.map((s) => s.name).join(', ')} besucht ${it.unlock.mode === 'all' ? 'sind' : 'sind'}`);
        }
        if ((it.images || []).length) lines.push(`**Karten/Bilder:** ${it.images.map((i) => i.name).join(', ')}`);
      }
      o.push(lines.join('\n\n'));
    });
  }
  if (adv.notes?.trim()) o.push('## Notizen\n\n' + adv.notes.trim());
  return o.join('\n\n') + '\n';
}
