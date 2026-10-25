// Würfel: unterstützt Ausdrücke wie "2W6+3", "d20", "4d6kh3" (die 3 höchsten), "2d20kl1" (der niedrigste).

function rnd(max) {
  // gleichmäßig verteilt, ohne Modulo-Verzerrung
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return (buf[0] % max) + 1;
}

const TERM = /([+-]?)\s*(?:(\d*)\s*[dDwW]\s*(\d+)(?:\s*k([hHlL])\s*(\d+))?|(\d+))/g;

export function parseDice(expr) {
  const src = String(expr || '').trim();
  if (!src) return null;
  const terms = [];
  let consumed = 0;
  TERM.lastIndex = 0;
  let m;
  while ((m = TERM.exec(src)) !== null) {
    if (m.index !== consumed && src.slice(consumed, m.index).trim() !== '') return null;
    consumed = TERM.lastIndex;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) {
      const count = m[2] === '' || m[2] === undefined ? 1 : parseInt(m[2], 10);
      const sides = parseInt(m[3], 10);
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
      terms.push({ kind: 'dice', sign, count, sides, keep: m[4] ? { mode: m[4].toLowerCase(), n: parseInt(m[5], 10) } : null });
    } else if (m[6] !== undefined) {
      terms.push({ kind: 'const', sign, value: parseInt(m[6], 10) });
    }
  }
  if (consumed !== src.length && src.slice(consumed).trim() !== '') return null;
  return terms.length ? terms : null;
}

export function rollExpr(expr) {
  const terms = parseDice(expr);
  if (!terms) throw new Error(`Ungültiger Würfelausdruck: "${expr}"`);
  let total = 0;
  const parts = [];
  for (const t of terms) {
    if (t.kind === 'const') {
      total += t.sign * t.value;
      parts.push({ text: `${t.sign < 0 ? '−' : '+'}${t.value}`, value: t.sign * t.value });
      continue;
    }
    const rolls = Array.from({ length: t.count }, () => rnd(t.sides));
    let kept = rolls.map(() => true);
    if (t.keep) {
      const order = rolls.map((v, i) => [v, i]).sort((a, b) => (t.keep.mode === 'h' ? b[0] - a[0] : a[0] - b[0]));
      kept = rolls.map(() => false);
      order.slice(0, Math.min(t.keep.n, rolls.length)).forEach(([, i]) => { kept[i] = true; });
    }
    const sum = rolls.reduce((s, v, i) => s + (kept[i] ? v : 0), 0);
    total += t.sign * sum;
    parts.push({
      text: `${t.sign < 0 ? '−' : ''}${t.count}W${t.sides}${t.keep ? `k${t.keep.mode}${t.keep.n}` : ''}`,
      rolls, kept, sides: t.sides, value: t.sign * sum,
    });
  }
  return { expr: String(expr).trim(), total, parts };
}

export function describeRoll(r) {
  const detail = r.parts
    .map((p) => (p.rolls ? `${p.text}[${p.rolls.map((v, i) => (p.kept[i] ? v : `(${v})`)).join(', ')}]` : p.text))
    .join(' ');
  return `${r.expr} → ${r.total}  (${detail})`;
}

/** Größter/kleinster Wurf, für Hervorhebung (Patzer/Volltreffer) beim ersten Würfeltyp. */
export function extremes(r) {
  const p = r.parts.find((x) => x.rolls);
  if (!p) return null;
  const k = p.rolls.filter((_, i) => p.kept[i]);
  return { allMax: k.every((v) => v === p.sides), allMin: k.every((v) => v === 1), sides: p.sides };
}
