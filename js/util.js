// Kleine Hilfsfunktionen ohne Abhängigkeiten.

/** DOM-Helfer: h('div', {class:'x', onclick: fn}, 'Text', childNode) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'for') el.htmlFor = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role') el.setAttribute(k, v === true ? '' : v);
    else if (k in el) {
      try { el[k] = v; } catch { el.setAttribute(k, v); }
    } else el.setAttribute(k, v === true ? '' : v);
  }
  appendKids(el, children);
  return el;
}

function appendKids(el, kids) {
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) appendKids(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

/** Wie el.append(...), überspringt aber null/false (natives append würde „null“ als Text einfügen). */
export function put(el, ...kids) {
  appendKids(el, kids);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uid(prefix = 'id') {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}-${Date.now().toString(36)}${rnd[0].toString(36)}${rnd[1].toString(36)}`.slice(0, 40);
}

export function slugify(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function debounce(fn, ms) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function fmtDate(iso, withTime = true) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return '–';
  const opts = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleString('de-DE', opts);
}

export function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function toast(msg, kind = 'info', ms = 3200) {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.appendChild(box);
  }
  const t = h('div', { class: `toast ${kind}` }, msg);
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('In die Zwischenablage kopiert', 'ok', 1800);
  } catch {
    toast('Kopieren nicht möglich', 'err');
  }
}

/** Bestätigungsdialog (ersetzt window.confirm, funktioniert auch in installierten PWAs gut). */
export function confirmDialog(message, { okText = 'OK', cancelText = 'Abbrechen', danger = false } = {}) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dlg' });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(
      h('p', {}, message),
      h('div', { class: 'row end gap' },
        h('button', { class: 'btn', onclick: () => done(false) }, cancelText),
        h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => done(true) }, okText),
      ),
    );
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    document.body.appendChild(dlg);
    dlg.showModal();
  });
}

/** Eingabedialog mit mehreren Feldern. fields: [{key,label,type,value,placeholder,options}] */
export function formDialog(title, fields, { okText = 'OK' } = {}) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dlg' });
    const inputs = {};
    const rows = fields.map((f) => {
      let input;
      if (f.type === 'textarea') input = h('textarea', { rows: f.rows || 3, placeholder: f.placeholder || '' }, f.value || '');
      else if (f.type === 'select') {
        input = h('select', {}, (f.options || []).map((o) => h('option', { value: o.value, selected: o.value === f.value }, o.label)));
      } else input = h('input', { type: f.type || 'text', value: f.value ?? '', placeholder: f.placeholder || '', min: f.min, max: f.max });
      inputs[f.key] = input;
      return h('label', { class: 'field' }, h('span', {}, f.label), input);
    });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const submit = () => {
      const out = {};
      for (const f of fields) out[f.key] = inputs[f.key].value;
      done(out);
    };
    dlg.append(
      h('h3', {}, title),
      ...rows,
      h('div', { class: 'row end gap' },
        h('button', { class: 'btn', onclick: () => done(null) }, 'Abbrechen'),
        h('button', { class: 'btn primary', onclick: submit }, okText),
      ),
    );
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
    document.body.appendChild(dlg);
    dlg.showModal();
    const first = dlg.querySelector('input,textarea,select');
    if (first) first.focus();
  });
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
