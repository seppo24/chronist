// Datenmodell des Abenteuers, Werkzeuge für Claude und die Systemprompts.
import { uid, slugify } from './util.js';
import { APP_VERSION } from './version.js';
import { sceneById, incoming, outLinks, unlockRule, hasFlow, sceneStatus, visitedSet, UNLOCK_LABELS, reqList, reqText, lockReason } from './flow.js';
import { parseDice } from './dice.js';

export const SECTIONS = [
  { id: 'konzept', title: 'Konzept & Ton', icon: '💡', hint: 'Grundidee, Stimmung, Vorbilder, Spielstil, Länge.' },
  { id: 'welt', title: 'Welt & Hintergrund', icon: '🌍', hint: 'Schauplatz, Fraktionen, Magie/Technik, wichtige Regeln der Welt.' },
  { id: 'regeln', title: 'Regelwerk (Text)', icon: '📜', hint: 'Erklärung der Spielmechanik in Worten. Die Zahlen stehen im Tab „Regelwerk“.' },
  { id: 'charaktere', title: 'Charaktererschaffung', icon: '🧙', hint: 'Wie Spieler ihre Figuren bauen: Herkunft, Klassen/Wege, Startwerte.' },
  { id: 'handlung', title: 'Handlung & Akte', icon: '📖', hint: 'Roter Faden in Akten, Wendepunkte, mögliche Enden.' },
  { id: 'geheimnisse', title: 'GM-Geheimnisse', icon: '🗝️', hint: 'Nur für den Spielleiter: Wahrheiten, Twists, Auflösungen.', gmOnly: true },
  { id: 'zufall', title: 'Zufallstabellen', icon: '🎲', hint: 'Begegnungen, Gerüchte, Beute, Namen …' },
  { id: 'handouts', title: 'Handouts', icon: '✉️', hint: 'Briefe, Rätsel, Texte, die Spielern gezeigt werden dürfen.' },
];

export const STATUS_LABELS = { entwurf: 'Entwurf', arbeit: 'In Arbeit', bereit: 'Spielbereit' };

export function newAdventure({ title, setting, playerCount }) {
  const now = new Date().toISOString();
  return {
    schema: 1,
    id: uid('adv'),
    title: title || 'Neues Abenteuer',
    setting: setting || '',
    playerCount: Number(playerCount) || 5,
    status: 'entwurf',
    createdAt: now,
    updatedAt: now,
    appVersion: APP_VERSION,
    sections: Object.fromEntries(SECTIONS.map((s) => [s.id, ''])),
    ruleset: null,
    scenes: [],
    npcs: [],
    locations: [],
    notes: '',
    chat: [],
  };
}

export function newSession(adv, name) {
  const now = new Date().toISOString();
  const players = Array.from({ length: adv.playerCount || 5 }, (_, i) => newPlayer(adv, `Spieler ${i + 1}`));
  return {
    schema: 1,
    id: uid('ses'),
    adventureId: adv.id,
    adventureTitle: adv.title,
    name: name || `Sitzung vom ${new Date().toLocaleDateString('de-DE')}`,
    createdAt: now,
    updatedAt: now,
    currentSceneId: adv.scenes[0]?.id || null,
    doneScenes: [],
    visited: adv.scenes[0] ? [adv.scenes[0].id] : [],
    forced: [],
    items: [],
    rolls: {},
    players,
    log: [],
    chat: [],
    dice: [],
    status: 'laufend',
  };
}

export function newPlayer(adv, name) {
  const resources = {};
  for (const r of adv?.ruleset?.resources || []) {
    const max = Number(r.max) || 0;
    resources[r.key] = { value: max, max };
  }
  return { id: uid('pl'), name, character: '', resources, conditions: '', notes: '', tablet: null };
}

export function progress(adv) {
  const checks = [
    ['Konzept', !!adv.sections.konzept.trim()],
    ['Welt', !!adv.sections.welt.trim()],
    ['Regelwerk', !!adv.ruleset],
    ['Charaktere', !!adv.sections.charaktere.trim()],
    ['Handlung', !!adv.sections.handlung.trim()],
    ['Szenen', adv.scenes.length > 0],
    ['Handlungsfluss', adv.scenes.some((s) => (s.links || []).length > 0)],
    ['NSCs', adv.npcs.length > 0],
    ['Orte', adv.locations.length > 0],
  ];
  const done = checks.filter((c) => c[1]).length;
  return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

// ---------------------------------------------------------------- Sammlungen

export const COLLECTIONS = {
  scenes: {
    label: 'Szenen', singular: 'Szene', icon: '🎬', orderable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'act', label: 'Akt / Abschnitt', type: 'text' },
      { key: 'location', label: 'Ort', type: 'text' },
      { key: 'summary', label: 'Kurzbeschreibung', type: 'textarea' },
      { key: 'read_aloud', label: 'Vorlesetext (für Spieler)', type: 'textarea' },
      { key: 'gm_notes', label: 'GM-Notizen (geheim)', type: 'textarea', gm: true },
      { key: 'npcs', label: 'Beteiligte NSCs', type: 'text' },
      { key: 'challenges', label: 'Herausforderungen / Proben', type: 'textarea' },
      { key: 'rewards', label: 'Belohnungen / Folgen', type: 'textarea' },
    ],
  },
  npcs: {
    label: 'NSCs', singular: 'NSC', icon: '🧑‍🤝‍🧑',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Rolle', type: 'text' },
      { key: 'description', label: 'Aussehen & Auftreten', type: 'textarea' },
      { key: 'personality', label: 'Persönlichkeit & Ziele', type: 'textarea' },
      { key: 'stats', label: 'Werte (nach Regelwerk)', type: 'textarea' },
      { key: 'secrets', label: 'Geheimnisse (nur GM)', type: 'textarea', gm: true },
    ],
  },
  locations: {
    label: 'Orte', singular: 'Ort', icon: '📍',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Beschreibung', type: 'textarea' },
      { key: 'details', label: 'Besonderheiten / Details', type: 'textarea' },
      { key: 'secrets', label: 'Geheimnisse (nur GM)', type: 'textarea', gm: true },
    ],
  },
};

export function upsertItem(adv, collection, data) {
  if (!COLLECTIONS[collection]) throw new Error(`Unbekannte Sammlung: ${collection}`);
  const list = adv[collection];
  let id = data.id ? slugify(data.id) : '';
  if (!id) id = slugify(data.name) || uid('item');
  const existing = list.find((x) => x.id === id);
  const clean = {};
  for (const f of COLLECTIONS[collection].fields) {
    if (data[f.key] !== undefined) clean[f.key] = Array.isArray(data[f.key]) ? data[f.key].join(', ') : String(data[f.key]);
  }
  if (existing) {
    Object.assign(existing, clean);
    return { id, created: false, item: existing };
  }
  const item = { id, ...Object.fromEntries(COLLECTIONS[collection].fields.map((f) => [f.key, ''])), ...clean };
  if (collection === 'scenes') Object.assign(item, { links: [], unlock: { mode: 'any', count: 1 }, images: [] });
  list.push(item);
  return { id, created: true, item };
}

export function removeItem(adv, collection, id) {
  const i = adv[collection].findIndex((x) => x.id === id);
  if (i < 0) return false;
  adv[collection].splice(i, 1);
  if (collection === 'scenes') {
    for (const s of adv.scenes) s.links = (s.links || []).filter((l) => l.to !== id);
  }
  return true;
}

/** Szene über id ODER Namen finden (Claude nennt manchmal den Namen). */
export function findScene(adv, ref) {
  const q = String(ref ?? '').trim().toLowerCase();
  if (!q) return null;
  return adv.scenes.find((s) => s.id.toLowerCase() === q) || adv.scenes.find((s) => s.name.trim().toLowerCase() === q) || null;
}

// ---------------------------------------------------------------- Werkzeuge für Claude

const itemSchema = (collection) => ({
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Kurze, stabile Kennung in Kleinbuchstaben ohne Leerzeichen, z. B. "szene-02-bibliothek". Gleiche id = bestehenden Eintrag ändern.' },
    ...Object.fromEntries(COLLECTIONS[collection].fields.map((f) => [f.key, { type: 'string', description: f.label }])),
  },
  required: ['id', 'name'],
});

export const WORKSHOP_TOOLS = [
  {
    name: 'set_section',
    description: 'Schreibt oder ersetzt einen Textabschnitt des Abenteuers (Markdown). Immer den vollständigen neuen Text des Abschnitts übergeben.',
    input_schema: {
      type: 'object',
      properties: {
        section_id: { type: 'string', enum: SECTIONS.map((s) => s.id), description: 'Welcher Abschnitt' },
        content: { type: 'string', description: 'Vollständiger Markdown-Text des Abschnitts' },
      },
      required: ['section_id', 'content'],
    },
  },
  {
    name: 'set_ruleset',
    description: 'Legt das strukturierte Regelwerk fest (ersetzt das bisherige komplett). Es muss auf einem Tablet-Charakterbogen und am Spieltisch schnell nutzbar sein: wenige Werte, klare Würfelmechanik.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name des Regelwerks' },
        summary: { type: 'string', description: '2–4 Sätze: Kernidee und Spielgefühl' },
        dice: {
          type: 'object',
          properties: {
            primary: { type: 'string', description: 'Standard-Würfelausdruck, z. B. "2W6" oder "W20"' },
            how_it_works: { type: 'string', description: 'Wie eine Probe abläuft und wie Erfolg bestimmt wird' },
          },
          required: ['primary', 'how_it_works'],
        },
        attributes: {
          type: 'array',
          description: 'Grundwerte der Figuren (typisch 3–6)',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Kennung ohne Leerzeichen' },
              name: { type: 'string' },
              description: { type: 'string' },
              min: { type: 'number' },
              max: { type: 'number' },
            },
            required: ['key', 'name', 'description'],
          },
        },
        skills: {
          type: 'array',
          description: 'Fertigkeiten, Zauber, Fähigkeiten (optional)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              attribute: { type: 'string', description: 'key des zugehörigen Grundwerts' },
              description: { type: 'string' },
            },
            required: ['name', 'description'],
          },
        },
        resources: {
          type: 'array',
          description: 'Zählbare Vorräte der Figuren, z. B. Lebenspunkte, Mana, Glück',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              name: { type: 'string' },
              max: { type: 'number', description: 'Standard-Maximum zu Spielbeginn' },
              description: { type: 'string' },
            },
            required: ['key', 'name', 'max'],
          },
        },
        conditions: {
          type: 'array',
          description: 'Zustände (z. B. Verängstigt, Verflucht) mit Wirkung',
          items: { type: 'object', properties: { name: { type: 'string' }, effect: { type: 'string' } }, required: ['name', 'effect'] },
        },
        combat: { type: 'string', description: 'Kampf-/Konfliktregeln in Kurzform (Markdown)' },
        magic: { type: 'string', description: 'Magie-/Spezialsystem in Kurzform (Markdown), falls vorhanden' },
        progression: { type: 'string', description: 'Wie Figuren besser werden' },
        extra: { type: 'string', description: 'Weitere Besonderheiten dieses Regelwerks (Markdown)' },
      },
      required: ['name', 'summary', 'dice', 'attributes', 'resources'],
    },
  },
  {
    name: 'upsert_scene',
    description: 'Legt eine Szene an oder ändert sie (gleiche id = ändern). Szenen erscheinen im Spielleiter-Modus in der Reihenfolge, in der sie angelegt wurden.',
    input_schema: itemSchema('scenes'),
  },
  {
    name: 'upsert_npc',
    description: 'Legt einen NSC an oder ändert ihn (gleiche id = ändern).',
    input_schema: itemSchema('npcs'),
  },
  {
    name: 'upsert_location',
    description: 'Legt einen Ort an oder ändert ihn (gleiche id = ändern).',
    input_schema: itemSchema('locations'),
  },
  {
    name: 'connect_scenes',
    description: 'Zeichnet im Handlungs-Flowchart einen Pfeil von einer Szene zu einer anderen („von hier aus kann man dorthin“). Mehrere Pfeile von einer Szene = Verzweigung. Szenen per id angeben. Optional eine kurze Beschriftung des Weges.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'id der Start-Szene' },
        to: { type: 'string', description: 'id der Ziel-Szene' },
        label: { type: 'string', description: 'Kurze Beschriftung, z. B. "durch das Tor" (optional)' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'disconnect_scenes',
    description: 'Entfernt den Pfeil von einer Szene zu einer anderen.',
    input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
  },
  {
    name: 'set_unlock_rule',
    description: 'Legt fest, wann eine Szene frei wird, wenn Pfeile aus mehreren Szenen auf sie zeigen. any = sobald EINE der Vorgänger-Szenen besucht wurde (Standard). all = erst wenn ALLE Vorgänger besucht wurden (z. B. Wald erst, wenn Kirche, Taverne und Schmied besucht sind). count = sobald mindestens `count` Vorgänger besucht wurden.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: { type: 'string', description: 'id der Szene, die freigeschaltet wird' },
        mode: { type: 'string', enum: ['any', 'all', 'count'] },
        count: { type: 'number', description: 'Nur bei mode=count: wie viele Vorgänger mindestens' },
      },
      required: ['scene_id', 'mode'],
    },
  },
  {
    name: 'add_scene_requirement',
    description: 'Fügt einer Szene eine zusätzliche Bedingung hinzu, die zur Freischaltung erfüllt sein muss (neben den Wegen). type=item: Die Gruppe muss einen Gegenstand besitzen (z. B. "Rostiger Schlüssel"). type=roll: Eine Probe muss gelingen (Würfelausdruck wie 1W20 oder 2W6+1, Vergleich ">=" = mindestens oder "<=" = höchstens, Zielwert). Alle Bedingungen einer Szene müssen erfüllt sein. Nutze für Gegenstände immer denselben Namen wie bei grant_items.',
    input_schema: {
      type: 'object',
      properties: {
        scene_id: { type: 'string', description: 'id der Szene, die die Bedingung bekommt' },
        type: { type: 'string', enum: ['item', 'roll'] },
        item: { type: 'string', description: 'Nur type=item: Name des Gegenstands' },
        label: { type: 'string', description: 'Nur type=roll: Name der Probe, z. B. "Schloss knacken"' },
        expr: { type: 'string', description: 'Nur type=roll: Würfelausdruck, z. B. 1W20' },
        cmp: { type: 'string', enum: ['>=', '<='], description: 'Nur type=roll: >= (mindestens) oder <= (höchstens). Standard >=' },
        target: { type: 'number', description: 'Nur type=roll: Zielwert' },
      },
      required: ['scene_id', 'type'],
    },
  },
  {
    name: 'clear_scene_requirements',
    description: 'Entfernt alle zusätzlichen Bedingungen (Gegenstände/Würfe) einer Szene.',
    input_schema: { type: 'object', properties: { scene_id: { type: 'string' } }, required: ['scene_id'] },
  },
  {
    name: 'grant_items',
    description: 'Legt fest, welche Gegenstände die Gruppe beim ersten Betreten einer Szene erhält (ersetzt die bisherige Liste). Leere Liste = keine.',
    input_schema: {
      type: 'object',
      properties: { scene_id: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
      required: ['scene_id', 'items'],
    },
  },
  {
    name: 'delete_item',
    description: 'Löscht eine Szene, einen NSC oder einen Ort. Nur nach Zustimmung des Nutzers verwenden.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: ['scenes', 'npcs', 'locations'] },
        id: { type: 'string' },
      },
      required: ['collection', 'id'],
    },
  },
  {
    name: 'set_adventure_info',
    description: 'Ändert Titel und/oder Status des Abenteuers.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        status: { type: 'string', enum: ['entwurf', 'arbeit', 'bereit'] },
      },
    },
  },
];

export const GM_TOOLS = [
  {
    name: 'add_log',
    description: 'Schreibt einen Eintrag ins Sitzungsprotokoll (z. B. wichtige Ereignisse, Entscheidungen der Spieler).',
    input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  WORKSHOP_TOOLS.find((t) => t.name === 'upsert_npc'),
  WORKSHOP_TOOLS.find((t) => t.name === 'upsert_location'),
];

/** Führt ein Werkzeug auf dem Abenteuer aus. Gibt ein kurzes Ergebnisobjekt (für Claude) und eine Notiz (für die Anzeige) zurück. */
export function runWorkshopTool(adv, name, input) {
  switch (name) {
    case 'set_section': {
      const s = SECTIONS.find((x) => x.id === input.section_id);
      if (!s) throw new Error(`Unbekannter Abschnitt: ${input.section_id}`);
      adv.sections[s.id] = String(input.content ?? '');
      return { result: { ok: true }, note: `Abschnitt „${s.title}“ gespeichert` };
    }
    case 'set_ruleset': {
      const rs = { ...input };
      rs.attributes = rs.attributes || [];
      rs.resources = rs.resources || [];
      adv.ruleset = rs;
      return { result: { ok: true }, note: `Regelwerk „${rs.name}“ gespeichert` };
    }
    case 'upsert_scene': case 'upsert_npc': case 'upsert_location': {
      const col = name === 'upsert_scene' ? 'scenes' : name === 'upsert_npc' ? 'npcs' : 'locations';
      const r = upsertItem(adv, col, input);
      return {
        result: { ok: true, id: r.id, created: r.created },
        note: `${COLLECTIONS[col].singular} „${r.item.name}“ ${r.created ? 'angelegt' : 'aktualisiert'}`,
      };
    }
    case 'connect_scenes': {
      const a = findScene(adv, input.from);
      const b = findScene(adv, input.to);
      if (!a) throw new Error(`Szene nicht gefunden: ${input.from}`);
      if (!b) throw new Error(`Szene nicht gefunden: ${input.to}`);
      if (a.id === b.id) throw new Error('Eine Szene kann nicht auf sich selbst zeigen.');
      a.links = a.links || [];
      const ex = a.links.find((l) => l.to === b.id);
      if (ex) {
        if (input.label !== undefined) ex.label = String(input.label);
        return { result: { ok: true, created: false }, note: `Weg „${a.name} → ${b.name}“ aktualisiert` };
      }
      a.links.push({ to: b.id, label: input.label ? String(input.label) : '' });
      return { result: { ok: true, created: true }, note: `Weg „${a.name} → ${b.name}“ angelegt` };
    }
    case 'disconnect_scenes': {
      const a = findScene(adv, input.from);
      const b = findScene(adv, input.to);
      if (!a || !b) throw new Error('Szene nicht gefunden');
      const before = (a.links || []).length;
      a.links = (a.links || []).filter((l) => l.to !== b.id);
      if (a.links.length === before) throw new Error('Diese Verbindung gibt es nicht');
      return { result: { ok: true }, note: `Weg „${a.name} → ${b.name}“ entfernt` };
    }
    case 'set_unlock_rule': {
      const s = findScene(adv, input.scene_id);
      if (!s) throw new Error(`Szene nicht gefunden: ${input.scene_id}`);
      if (!['any', 'all', 'count'].includes(input.mode)) throw new Error('mode muss any, all oder count sein');
      s.unlock = { mode: input.mode, count: Math.max(1, parseInt(input.count, 10) || 1) };
      return { result: { ok: true }, note: `Freischaltung „${s.name}“: ${UNLOCK_LABELS[input.mode].toLowerCase()}` };
    }
    case 'add_scene_requirement': {
      const sc = findScene(adv, input.scene_id);
      if (!sc) throw new Error(`Szene nicht gefunden: ${input.scene_id}`);
      sc.requires = sc.requires || [];
      if (input.type === 'item') {
        const n = String(input.item || '').trim();
        if (!n) throw new Error('item (Name des Gegenstands) fehlt');
        if (sc.requires.some((r) => r.type === 'item' && r.item.toLowerCase() === n.toLowerCase())) return { result: { ok: true, created: false }, note: `Bedingung „${n}“ gab es schon` };
        sc.requires.push({ id: uid('req'), type: 'item', item: n });
        return { result: { ok: true, created: true }, note: `„${sc.name}“ verlangt Gegenstand „${n}“` };
      }
      if (input.type === 'roll') {
        const expr = String(input.expr || '').trim();
        if (!parseDice(expr)) throw new Error(`Ungültiger Würfelausdruck: "${expr}"`);
        const target = Number(input.target);
        if (!Number.isFinite(target)) throw new Error('target (Zielwert) fehlt');
        const r = { id: uid('req'), type: 'roll', label: String(input.label || 'Probe').trim() || 'Probe', expr, cmp: input.cmp === '<=' ? '<=' : '>=', target };
        sc.requires.push(r);
        return { result: { ok: true, created: true }, note: `„${sc.name}“ verlangt ${reqText(r)}` };
      }
      throw new Error('type muss item oder roll sein');
    }
    case 'clear_scene_requirements': {
      const sc = findScene(adv, input.scene_id);
      if (!sc) throw new Error(`Szene nicht gefunden: ${input.scene_id}`);
      sc.requires = [];
      return { result: { ok: true }, note: `Bedingungen von „${sc.name}“ entfernt` };
    }
    case 'grant_items': {
      const sc = findScene(adv, input.scene_id);
      if (!sc) throw new Error(`Szene nicht gefunden: ${input.scene_id}`);
      sc.grants = (Array.isArray(input.items) ? input.items : []).map((x) => String(x).trim()).filter(Boolean);
      return { result: { ok: true }, note: `„${sc.name}“ vergibt: ${sc.grants.join(', ') || '–'}` };
    }
    case 'delete_item': {
      const ok = removeItem(adv, input.collection, input.id);
      if (!ok) throw new Error('Eintrag nicht gefunden');
      return { result: { ok: true }, note: `${COLLECTIONS[input.collection].singular} gelöscht` };
    }
    case 'set_adventure_info': {
      if (input.title) adv.title = String(input.title);
      if (input.status) adv.status = input.status;
      return { result: { ok: true }, note: 'Abenteuer-Info geändert' };
    }
    default:
      throw new Error(`Unbekanntes Werkzeug: ${name}`);
  }
}

// ---------------------------------------------------------------- Systemprompts

function flowDump(adv, scene) {
  const outs = outLinks(adv, scene).map((l) => `${l.to}${l.label ? ` („${l.label}“)` : ''}`);
  const preds = incoming(adv, scene.id);
  const r = unlockRule(scene);
  let rule = '';
  if (preds.length >= 2) rule = r.mode === 'all' ? `erst wenn ALLE Vorgänger besucht sind (${preds.join(', ')})` : r.mode === 'count' ? `sobald mindestens ${r.count} von ${preds.length} Vorgängern besucht sind` : 'sobald ein Vorgänger besucht ist';
  const imgs = (scene.images || []).length;
  const rq = reqList(scene).map(reqText);
  const gr = (scene.grants || []);
  return `\n  - Führt zu: ${outs.join(', ') || '–'}${rule ? `\n  - Freischaltung: ${rule}` : ''}${rq.length ? `\n  - Zusätzliche Bedingungen (alle nötig): ${rq.join('; ')}` : ''}${gr.length ? `\n  - Gruppe erhält beim Betreten: ${gr.join(', ')}` : ''}${imgs ? `\n  - Karten/Bilder: ${imgs} hinterlegt (${scene.images.map((i) => i.name).join(', ')})` : ''}`;
}

export function stateDump(adv) {
  const p = progress(adv);
  const parts = [];
  parts.push(`# AKTUELLER STAND DES ABENTEUERS „${adv.title}“`);
  parts.push(`Vorbild/Setting laut Nutzer: ${adv.setting || '(noch offen)'}`);
  parts.push(`Spielerzahl (ohne Spielleiter): ${adv.playerCount} (variabel). Status: ${STATUS_LABELS[adv.status] || adv.status}. Fortschritt: ${p.done}/${p.total} (${p.checks.map((c) => `${c[0]} ${c[1] ? '✔' : '–'}`).join(', ')})`);
  for (const s of SECTIONS) {
    parts.push(`\n## Abschnitt ${s.id} – ${s.title}\n${adv.sections[s.id]?.trim() || '(leer)'}`);
  }
  parts.push(`\n## Regelwerk (strukturiert)\n${adv.ruleset ? JSON.stringify(adv.ruleset, null, 1) : '(noch nicht festgelegt)'}`);
  for (const [col, def] of Object.entries(COLLECTIONS)) {
    const items = adv[col];
    parts.push(`\n## ${def.label} (${items.length})`);
    if (!items.length) parts.push('(keine)');
    for (const it of items) {
      const rest = def.fields.filter((f) => f.key !== 'name' && it[f.key]).map((f) => `  - ${f.label}: ${it[f.key]}`).join('\n');
      parts.push(`- [${it.id}] ${it.name}\n${rest}${col === 'scenes' ? flowDump(adv, it) : ''}`);
    }
  }
  if (adv.notes?.trim()) parts.push(`\n## Notizen des Nutzers\n${adv.notes.trim()}`);
  return parts.join('\n');
}

const WORKSHOP_RULES = `Du bist „Der Chronist“, ein erfahrener Pen-&-Paper-Autor und Regelwerk-Designer. Du entwickelst gemeinsam mit dem Spielleiter (dem Nutzer, der nicht programmiert und kein Regelprofi sein muss) ein komplettes Abenteuer mit eigenem Regelwerk. Sprache: Deutsch.

ARBEITSWEISE
- Gehe Schritt für Schritt: 1 Idee & Ton → 2 Welt → 3 Regelwerk → 4 Charaktererschaffung → 5 Handlung & Akte → 6 Szenen, NSCs, Orte → 7 Spielbereit-Check. Springe nur, wenn der Nutzer es will.
- Stelle pro Nachricht höchstens 2–3 gezielte Fragen und mache immer konkrete Vorschläge (2–3 Varianten), damit der Nutzer nur wählen oder anpassen muss.
- Jedes Abenteuer bekommt sein EIGENES Regelwerk, das sich nach dem Setting anfühlt (ein Zauberschul-Abenteuer soll sich anders spielen als ein Action-Rollenspiel mit Lichtmagie und Herzlosen). Nimm Vorbilder als Gefühl und Inspiration, erfinde aber eigene Namen, Mechaniken und Texte. Gib keine urheberrechtlich geschützten Texte oder Regelwerke wieder.
- Regeln müssen am Tisch schnell laufen und auf einen Tablet-Charakterbogen passen: wenige Werte (typisch 3–6 Grundwerte), eine klare Standard-Würfelmechanik, wenige zählbare Vorräte, kurze Kampfregeln. Erkläre Regelentscheidungen in 1–2 Sätzen, damit der Nutzer sie nachvollziehen kann.
- Speichere Ergebnisse mit den Werkzeugen, sobald der Nutzer zugestimmt hat oder dich ausdrücklich auffordert, selbst auszuarbeiten. Ändere gezielt statt alles neu zu schreiben. Bei set_section immer den vollständigen neuen Abschnittstext übergeben. Bestätige nach dem Speichern kurz und schlage den nächsten Schritt vor.
- Szenen, NSCs und Orte immer mit stabilen ids anlegen (z. B. "szene-03-hoerner-alarm").
- HANDLUNGSFLUSS: Die Handlung ist ein Flowchart aus Szenen. Lege Szenen zuerst an, verbinde sie dann mit connect_scenes (Pfeil von → nach). Von einer Szene dürfen mehrere Pfeile ausgehen (Verzweigung, z. B. Stadt → Kirche, Taverne, Schmied). Zeigen mehrere Pfeile auf eine Szene, bestimmt set_unlock_rule, wann sie frei wird: all = erst wenn alle Vorgänger besucht wurden (Beispiel: Wald erst nach Kirche, Taverne und Schmied), count = mindestens n, any = sobald einer besucht wurde. Benenne Szenen als Knoten im Ablauf (Orte/Ereignisse), nicht als lange Sätze. Zusätzlich kannst du Szenen an Bedingungen knüpfen: add_scene_requirement (Gegenstand besitzen, z. B. Schlüssel für die Krypta; oder Probe bestehen, z. B. Schloss knacken 1W20 ab 12) und grant_items (welche Gegenstände die Gruppe beim ersten Betreten einer Szene erhält). Sorge dafür, dass jeder verlangte Gegenstand irgendwo erreichbar ist (grant_items in einer früher erreichbaren Szene oder Fundort in einer Szene/einem NSC), sonst sitzt die Gruppe fest. Der Nutzer sieht und verschiebt das Ganze im Tab „Handlung“ und kann dort Karten/Bilder an Szenen hängen; erwähne in Szenen, welche Karte sinnvoll wäre.
- Trenne sauber: Vorlesetexte für Spieler (read_aloud) enthalten nie Geheimnisse. Geheimnisse gehören in GM-Felder (gm_notes, secrets) oder den Abschnitt „geheimnisse“.
- Schreibe kompakt und gut lesbar auf einem Smartphone: kurze Absätze, Listen nur wenn nötig, keine langen Einleitungen.
- Wenn etwas im Stand unten schon existiert, baue darauf auf und widersprich dem nicht ohne Grund.
- Im Spielbereit-Check prüfst du Lücken, Widersprüche und Spielbarkeit und nennst konkret, was noch fehlt.`;

export function workshopSystem(adv) {
  return [
    { type: 'text', text: WORKSHOP_RULES },
    { type: 'text', text: stateDump(adv), cache_control: { type: 'ephemeral' } },
  ];
}

const GM_RULES = `Du bist der Assistent des Spielleiters während einer laufenden Pen-&-Paper-Sitzung. Sprache: Deutsch.
- Antworte kurz und sofort am Tisch verwendbar (meist unter 120 Wörter), außer der Spielleiter wünscht mehr.
- Bleib bei Welt, Ton, Regelwerk und Geheimnissen des Abenteuers (siehe Stand). Erfinde nichts, das dem Stand widerspricht, es sei denn, der Spielleiter bittet um Improvisation.
- Vorlesetexte setzt du in Anführungszeichen, getrennt von Hinweisen für den Spielleiter.
- Bei Regelfragen: Antwort zuerst, dann höchstens ein Satz Begründung. Nutze das Regelwerk des Abenteuers, nicht fremde Systeme.
- Wenn du spontan NSCs oder Orte erfindest, speichere sie mit den Werkzeugen. Wichtige Ereignisse darfst du auf Wunsch mit add_log protokollieren.`;

export function gmSystem(adv, session) {
  const players = session.players.map((p) => {
    const res = Object.entries(p.resources || {}).map(([k, v]) => `${k} ${v.value}/${v.max}`).join(', ');
    return `- ${p.name}${p.character ? ` (${p.character})` : ''}: ${res || '–'}${p.conditions ? `; Zustände: ${p.conditions}` : ''}${p.notes ? `; Notiz: ${p.notes}` : ''}`;
  }).join('\n');
  const scene = adv.scenes.find((s) => s.id === session.currentSceneId);
  const recent = session.log.slice(-15).map((l) => `- ${l.text}`).join('\n');
  const seen = visitedSet(session);
  const nameOf = (id) => sceneById(adv, id)?.name || id;
  const nexts = scene ? outLinks(adv, scene).map((l) => {
    const st = sceneStatus(adv, session, l.to);
    return `${nameOf(l.to)} [${l.to}]${l.label ? ` („${l.label}“)` : ''} – ${st.state === 'locked' ? `noch gesperrt (${lockReason(adv, st)})` : st.state === 'visited' ? 'schon besucht' : 'frei'}`;
  }) : [];
  const live = [
    '# LAUFENDE SITZUNG',
    `Aktuelle Szene: ${scene ? `${scene.name} [${scene.id}]` : '(keine gewählt)'}`,
    hasFlow(adv) ? `Mögliche nächste Szenen: ${nexts.join('; ') || 'keine (Ende dieses Strangs)'}` : '',
    `Besuchte Szenen: ${[...seen].map(nameOf).join(', ') || '–'}`,
    `Erledigte Szenen: ${session.doneScenes.join(', ') || '–'}`,
    `Inventar der Gruppe: ${(session.items || []).map((i) => i.name).join(', ') || '–'}`,
    `Spieler:\n${players || '(keine)'}`,
    `Letzte Protokolleinträge:\n${recent || '(leer)'}`,
  ].filter(Boolean).join('\n');
  return [
    { type: 'text', text: GM_RULES },
    { type: 'text', text: stateDump(adv), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: live },
  ];
}
