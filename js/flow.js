// Handlungs-Flowchart: Logik (ohne Oberfläche) und SVG-Darstellung.
//
// Modell: Jede Szene ist ein Knoten.
//   scene.links  = [{ to: <Szenen-id>, label: 'optional' }]   Pfeile von dieser Szene zu anderen
//   scene.unlock = { mode: 'any' | 'all' | 'count', count: n }  wann DIESE Szene frei wird,
//                  gemessen an den Szenen, die auf sie zeigen ("Vorgänger")
//   scene.x / scene.y                                         Position im Diagramm
// Sitzung:  ses.visited = [ids]  (schon betreten),  ses.forced = [ids]  (vom Spielleiter freigeschaltet)
import { h, clear } from './util.js';

export const NODE_W = 146;
export const NODE_H = 58;
export const GAP_X = 34;
export const GAP_Y = 64;
const PAD = 30;

export const UNLOCK_LABELS = {
  any: 'Sobald einer der Vorgänger besucht ist',
  all: 'Erst wenn alle Vorgänger besucht sind',
  count: 'Sobald mindestens … Vorgänger besucht sind',
};

// ---------------------------------------------------------------- Logik

export const sceneById = (adv, id) => adv.scenes.find((s) => s.id === id);

/** Gültige ausgehende Verbindungen (Ziel existiert, keine Schleife auf sich selbst). */
export function outLinks(adv, scene) {
  return (scene.links || []).filter((l) => l.to !== scene.id && sceneById(adv, l.to));
}

/** ids aller Szenen, die auf `id` zeigen. */
export function incoming(adv, id) {
  return adv.scenes.filter((s) => s.id !== id && (s.links || []).some((l) => l.to === id)).map((s) => s.id);
}

export function hasFlow(adv) {
  return adv.scenes.some((s) => outLinks(adv, s).length > 0);
}

export function unlockRule(scene) {
  const u = (scene && scene.unlock) || {};
  const mode = ['any', 'all', 'count'].includes(u.mode) ? u.mode : 'any';
  return { mode, count: Math.max(1, parseInt(u.count, 10) || 1) };
}

/** Kurztext für das Abzeichen am Knoten, z. B. "alle 3" oder "2 von 3". Leer, wenn keine Regel nötig ist. */
export function gateText(adv, scene) {
  const n = incoming(adv, scene.id).length;
  if (n < 2) return '';
  const r = unlockRule(scene);
  if (r.mode === 'all') return `alle ${n}`;
  if (r.mode === 'count') return `${Math.min(r.count, n)} von ${n}`;
  return '';
}

export function visitedSet(ses) {
  return new Set([...(ses.visited || []), ...(ses.doneScenes || []), ses.currentSceneId].filter(Boolean));
}

/** Zustand einer Szene in einer Sitzung: current | visited | available | locked. */
export function sceneStatus(adv, ses, id) {
  const scene = sceneById(adv, id);
  const visited = visitedSet(ses);
  const preds = incoming(adv, id);
  const rule = unlockRule(scene);
  const metList = preds.filter((p) => visited.has(p));
  const missing = preds.filter((p) => !visited.has(p));
  let needed = 0;
  if (preds.length) needed = rule.mode === 'all' ? preds.length : rule.mode === 'count' ? Math.min(rule.count, preds.length) : 1;
  const forced = (ses.forced || []).includes(id);
  const open = !hasFlow(adv) || preds.length === 0 || metList.length >= needed || forced;
  let state;
  if (ses.currentSceneId === id) state = 'current';
  else if (visited.has(id)) state = 'visited';
  else state = open ? 'available' : 'locked';
  return { state, open, met: metList.length, needed, preds, missing, forced };
}

/** Sitzungsstand für den Flow vorbereiten (ältere Sitzungen kennen ihn noch nicht). */
export function ensureFlowState(ses) {
  if (!Array.isArray(ses.visited)) ses.visited = [...new Set([...(ses.doneScenes || []), ses.currentSceneId].filter(Boolean))];
  if (!Array.isArray(ses.forced)) ses.forced = [];
}

// ---------------------------------------------------------------- Anordnung

/** Automatische Anordnung von oben nach unten. Liefert Map id -> {x,y} für ALLE Szenen. */
export function computeLayout(adv) {
  const sc = adv.scenes;
  const n = sc.length;
  const level = new Map(sc.map((s) => [s.id, 0]));
  for (let it = 0; it < n; it++) {
    let changed = false;
    for (const s of sc) {
      for (const l of outLinks(adv, s)) {
        const want = Math.min(level.get(s.id) + 1, n);
        if (level.get(l.to) < want) { level.set(l.to, want); changed = true; }
      }
    }
    if (!changed) break;
  }
  const rows = new Map();
  for (const s of sc) {
    const lv = level.get(s.id);
    if (!rows.has(lv)) rows.set(lv, []);
    rows.get(lv).push(s);
  }
  const maxCount = Math.max(1, ...[...rows.values()].map((r) => r.length));
  const maxW = maxCount * NODE_W + (maxCount - 1) * GAP_X;
  const out = new Map();
  for (const [lv, row] of rows) {
    const rowW = row.length * NODE_W + (row.length - 1) * GAP_X;
    row.forEach((s, i) => out.set(s.id, { x: Math.round((maxW - rowW) / 2 + i * (NODE_W + GAP_X)), y: lv * (NODE_H + GAP_Y) }));
  }
  return out;
}

const hasPos = (s) => Number.isFinite(s.x) && Number.isFinite(s.y);

export function positions(adv) {
  const auto = computeLayout(adv);
  const map = new Map();
  for (const s of adv.scenes) map.set(s.id, hasPos(s) ? { x: s.x, y: s.y } : auto.get(s.id));
  return map;
}

/** Schreibt fehlende Positionen in die Szenen. true, wenn etwas geändert wurde. */
export function persistMissingPositions(adv) {
  let changed = false;
  const auto = computeLayout(adv);
  for (const s of adv.scenes) {
    if (!hasPos(s)) { const p = auto.get(s.id); s.x = p.x; s.y = p.y; changed = true; }
  }
  return changed;
}

export function resetLayout(adv) {
  for (const s of adv.scenes) { delete s.x; delete s.y; }
  return persistMissingPositions(adv);
}

/** Freie Stelle in der Nähe von (x,y), an der kein anderer Knoten liegt. */
export function freeSpot(adv, x, y) {
  const pos = positions(adv);
  const taken = (px, py) => [...pos.values()].some((p) => Math.abs(p.x - px) < NODE_W + 8 && Math.abs(p.y - py) < NODE_H + 8);
  let px = x;
  for (let i = 0; i < 60 && taken(px, y); i++) px += NODE_W + GAP_X;
  return { x: px, y };
}

// ---------------------------------------------------------------- Darstellung (SVG)

const NS = 'http://www.w3.org/2000/svg';
let instanceCounter = 0;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  for (const k of kids) n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return n;
}

export function wrapName(name, max = 18, maxLines = 2) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const out = lines.slice(0, maxLines);
  if (lines.length > maxLines) out[maxLines - 1] = out[maxLines - 1].slice(0, max - 1) + '…';
  const cut = out.map((l) => (l.length > max ? l.slice(0, max - 1) + '…' : l));
  return cut.length ? cut : ['(ohne Name)'];
}

function edgePath(a, b) {
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y + NODE_H;
  const x2 = b.x + NODE_W / 2;
  const y2 = b.y;
  if (y2 > y1 + 10) {
    const dy = Math.max(28, (y2 - y1) / 2);
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  }
  // Rückwärts- oder Seitwärts-Verbindung: seitlich herum
  const sx = a.x + NODE_W;
  const sy = a.y + NODE_H / 2;
  const tx = b.x + NODE_W;
  const ty = b.y + NODE_H / 2;
  const out = Math.max(sx, tx) + 46;
  return `M ${sx} ${sy} C ${out} ${sy}, ${out} ${ty}, ${tx} ${ty}`;
}

function edgeMid(a, b) {
  return { x: (a.x + b.x) / 2 + NODE_W / 2, y: (a.y + b.y) / 2 + NODE_H / 2 + (b.y > a.y + 10 ? 0 : -10) };
}

/**
 * Erzeugt ein Flowchart.
 *  adv, editable (Knoten verschiebbar), selected() -> id,
 *  nodeInfo(scene) -> { cls, badge, gate }   (Darstellung je Knoten)
 *  onSelect(id), onMove(id, x, y)
 * Rückgabe: { el, draw, fit, zoomBy, getZoom }
 */
export function createFlow({ adv, editable = false, selected = () => null, nodeInfo = () => ({}), onSelect = () => {}, onMove = () => {} }) {
  const uid = ++instanceCounter;
  const wrap = h('div', { class: `flow-wrap${editable ? ' editable' : ''}` });
  let zoom = 1;
  let fitted = false;
  let vbW = 100;
  let vbH = 100;
  let svg = null;
  let pos = new Map();
  let nodeEls = new Map();
  let edgeEls = [];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const applyZoom = () => {
    if (!svg) return;
    svg.setAttribute('width', Math.round(vbW * zoom));
    svg.setAttribute('height', Math.round(vbH * zoom));
  };

  function updateEdges() {
    for (const e of edgeEls) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      e.path.setAttribute('d', edgePath(a, b));
      if (e.label) {
        const m = edgeMid(a, b);
        e.label.setAttribute('x', m.x);
        e.label.setAttribute('y', m.y);
      }
    }
  }

  function draw() {
    const sl = wrap.scrollLeft;
    const st = wrap.scrollTop;
    clear(wrap);
    nodeEls = new Map();
    edgeEls = [];
    svg = null;
    if (!adv.scenes.length) {
      wrap.appendChild(h('div', { class: 'empty' }, 'Noch keine Knoten.'));
      return;
    }
    pos = positions(adv);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pos.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    const vx = minX - PAD;
    const vy = minY - PAD;
    vbW = maxX - minX + PAD * 2 + 50; // Platz für seitliche Rückwärts-Pfeile
    vbH = maxY - minY + PAD * 2;

    svg = el('svg', { class: 'flow-svg', viewBox: `${vx} ${vy} ${vbW} ${vbH}`, role: 'group', 'aria-label': 'Handlungs-Flowchart' });
    const defs = el('defs');
    for (const [name, cls] of [['a', ''], ['d', 'done']]) {
      defs.appendChild(el('marker', { id: `arr-${name}-${uid}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
        el('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: `flow-arrow ${cls}` })));
    }
    svg.appendChild(defs);

    const edgeLayer = el('g');
    const nodeLayer = el('g');
    svg.append(edgeLayer, nodeLayer);

    for (const s of adv.scenes) {
      const infoA = nodeInfo(s) || {};
      for (const l of outLinks(adv, s)) {
        const done = infoA.cls === 'visited' || infoA.cls === 'current';
        const path = el('path', { class: `flow-edge${done ? ' done' : ''}`, 'marker-end': `url(#arr-${done ? 'd' : 'a'}-${uid})` });
        edgeLayer.appendChild(path);
        let label = null;
        if (l.label) {
          label = el('text', { class: 'flow-label' }, l.label.length > 22 ? l.label.slice(0, 21) + '…' : l.label);
          edgeLayer.appendChild(label);
        }
        edgeEls.push({ from: s.id, to: l.to, path, label });
      }
    }

    const selId = selected();
    for (const s of adv.scenes) {
      const p = pos.get(s.id);
      const info = nodeInfo(s) || {};
      const g = el('g', {
        class: `flow-node ${info.cls || 'plain'}${s.id === selId ? ' sel' : ''}`,
        transform: `translate(${p.x} ${p.y})`,
        'data-id': s.id, tabindex: 0, role: 'button', 'aria-label': s.name,
      });
      g.appendChild(el('rect', { width: NODE_W, height: NODE_H, rx: 12 }));
      const lines = wrapName(s.name);
      lines.forEach((t, i) => g.appendChild(el('text', { class: 'flow-title', x: NODE_W / 2, y: lines.length === 1 ? NODE_H / 2 + 5 : 25 + i * 16, 'text-anchor': 'middle' }, t)));
      if (info.badge) g.appendChild(el('text', { class: 'badge', x: NODE_W - 8, y: 15, 'text-anchor': 'end' }, info.badge));
      if (info.gate) g.appendChild(el('text', { class: 'gate', x: 8, y: NODE_H - 7 }, '⛓ ' + info.gate));
      nodeLayer.appendChild(g);
      nodeEls.set(s.id, g);

      if (editable) attachDrag(g, s.id);
      else g.addEventListener('click', () => onSelect(s.id));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } });
    }
    updateEdges();
    wrap.appendChild(svg);
    applyZoom();
    wrap.scrollLeft = sl;
    wrap.scrollTop = st;
    if (!fitted) { fitted = true; requestAnimationFrame(fit); }
  }

  function attachDrag(g, id) {
    let start = null;
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      const p = pos.get(id);
      start = { px: e.clientX, py: e.clientY, x: p.x, y: p.y, moved: false };
      try { g.setPointerCapture(e.pointerId); } catch { /* ältere Browser */ }
    });
    g.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      if (!start.moved && Math.hypot(dx, dy) < 6) return;
      start.moved = true;
      const nx = Math.round(start.x + dx / zoom);
      const ny = Math.round(start.y + dy / zoom);
      pos.set(id, { x: nx, y: ny });
      g.setAttribute('transform', `translate(${nx} ${ny})`);
      updateEdges();
    });
    const end = (e, cancelled) => {
      if (!start) return;
      const s = start;
      start = null;
      try { g.releasePointerCapture(e.pointerId); } catch { /* egal */ }
      if (cancelled) { draw(); return; }
      if (s.moved) {
        const p = pos.get(id);
        onMove(id, p.x, p.y);
        draw();
      } else onSelect(id);
    };
    g.addEventListener('pointerup', (e) => end(e, false));
    g.addEventListener('pointercancel', (e) => end(e, true));
  }

  function fit() {
    const w = wrap.clientWidth;
    // nie so klein, dass die Schrift unlesbar wird; breitere Diagramme werden dann seitlich gescrollt
    zoom = w > 40 ? clamp((w - 8) / vbW, 0.66, 1) : 1;
    applyZoom();
  }

  draw();
  return {
    el: wrap,
    draw,
    fit,
    zoomBy(f) { zoom = clamp(zoom * f, 0.35, 2.2); applyZoom(); },
    getZoom: () => zoom,
  };
}
