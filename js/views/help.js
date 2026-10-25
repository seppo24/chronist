// Hilfe: Admin-Anleitung, interaktive Testcheckliste, Versionsverlauf (aus den Markdown-Dateien).
import { h, clear } from '../util.js';
import { md } from '../md.js';
import { APP_VERSION } from '../version.js';

const FILES = {
  guide: ['📘 Anleitung', './ADMIN-ANLEITUNG.md'],
  checklist: ['✅ Testcheckliste', './TESTCHECKLISTE.md'],
  changelog: ['🕘 Versionsverlauf', './CHANGELOG.md'],
};

async function load(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} konnte nicht geladen werden (${res.status})`);
  return res.text();
}

const CHECK_KEY = 'chronist.checklist';
function loadChecks() { try { return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}'); } catch { return {}; } }

export async function render(main, [tabParam], ctx) {
  const tab = FILES[tabParam] ? tabParam : 'guide';
  ctx.setTitle('Hilfe');
  const panel = h('div', { class: 'panel scroll' });
  main.append(h('div', { class: 'view help' },
    h('nav', { class: 'tabs' }, Object.entries(FILES).map(([k, [label]]) =>
      h('a', { class: `tab${k === tab ? ' active' : ''}`, href: `#/help/${k}` }, label))),
    panel));
  panel.appendChild(h('p', { class: 'muted' }, 'Lade …'));

  let text;
  try { text = await load(FILES[tab][1]); } catch (e) {
    clear(panel);
    panel.appendChild(h('div', { class: 'empty' }, e.message));
    return;
  }
  clear(panel);

  if (tab !== 'checklist') {
    panel.appendChild(h('div', { class: 'card md doc', html: md(text) }));
    return;
  }

  // Interaktive Checkliste: Zeilen "- [ ] ..." werden zu Häkchen, die auf dem Gerät gespeichert werden.
  const checks = loadChecks();
  const bucket = (checks[APP_VERSION] = checks[APP_VERSION] || {});
  const summary = h('div', { class: 'card row between gap center wrap' });
  const body = h('div', { class: 'card doc' });
  panel.append(summary, body);

  const items = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let buf = [];
  const flush = () => { if (buf.length) { body.appendChild(h('div', { class: 'md', html: md(buf.join('\n')) })); buf = []; } };
  for (const line of lines) {
    const m = line.match(/^\s*-\s+\[( |x|X)\]\s+(.*)$/);
    if (!m) { buf.push(line); continue; }
    flush();
    const label = m[2].trim();
    const box = h('input', { type: 'checkbox', checked: !!bucket[label] });
    const row = h('label', { class: `check${bucket[label] ? ' done' : ''}` }, box, h('span', { class: 'md', html: md(label).replace(/^<p>|<\/p>$/g, '') }));
    box.addEventListener('change', () => {
      bucket[label] = box.checked;
      row.classList.toggle('done', box.checked);
      localStorage.setItem(CHECK_KEY, JSON.stringify(checks));
      update();
    });
    items.push(box);
    body.appendChild(row);
  }
  flush();

  const count = h('strong', {});
  const update = () => { count.textContent = `${items.filter((b) => b.checked).length} / ${items.length} geprüft`; };
  update();
  summary.append(
    h('div', {}, h('div', {}, count), h('div', { class: 'muted small' }, `Gilt für Version ${APP_VERSION}. Häkchen werden nur auf diesem Gerät gespeichert.`)),
    h('button', {
      class: 'btn small',
      onclick: () => { for (const b of items) { b.checked = false; b.dispatchEvent(new Event('change')); } },
    }, 'Zurücksetzen'));
}
