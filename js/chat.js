// Wiederverwendbare Chat-Komponente (Werkstatt und GM-Assistent).
import { h, clear, toast, fmtTime } from './util.js';
import { md } from './md.js';
import { streamMessage, ClaudeError } from './claude.js';
import { getSettings } from './store.js';

const MAX_HISTORY = 24; // so viele Nachrichten werden maximal mitgeschickt (der Stand steckt ohnehin im Systemprompt)

/**
 * opts:
 *  getHistory(): Array<{role, content, notes?, at?, error?}>
 *  persist(history): Promise — speichert Verlauf (und ggf. geänderte Daten)
 *  getSystem(): system-Blöcke (wird in jeder Runde neu gebaut)
 *  tools: Werkzeugdefinitionen
 *  runTool(name, input): {result, note} — verändert die Daten im Speicher
 *  onDataChanged(): Callback nach Werkzeug-Änderungen (UI aktualisieren)
 *  quickPrompts: [{label, text}]
 *  placeholder, emptyHint
 */
export function createChat(opts) {
  let busy = false;
  let abort = null;

  const list = h('div', { class: 'chat-list' });
  const usageLine = h('div', { class: 'chat-usage muted small' });
  const input = h('textarea', { class: 'chat-input', rows: 1, placeholder: opts.placeholder || 'Nachricht …', enterKeyHint: 'send' });
  const sendBtn = h('button', { class: 'btn primary send', type: 'button', 'aria-label': 'Senden' }, '➤');
  const stopBtn = h('button', { class: 'btn danger send hidden', type: 'button', 'aria-label': 'Stoppen' }, '■');
  const quick = h('div', { class: 'quick' }, (opts.quickPrompts || []).map((q) =>
    h('button', { class: 'chip', type: 'button', onclick: () => { input.value = q.text; autosize(); input.focus(); if (q.send) send(); } }, q.label)));
  const root = h('div', { class: 'chat' }, list, usageLine, quick,
    h('div', { class: 'chat-form' }, input, sendBtn, stopBtn));

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    // Enter sendet nur am PC (Strg/Cmd+Enter immer); auf dem Handy bleibt Enter = Zeilenumbruch
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && (!coarse || e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', () => send());
  stopBtn.addEventListener('click', () => abort && abort.abort());

  function bubble(msg) {
    const isUser = msg.role === 'user';
    const body = h('div', { class: 'md' });
    if (isUser) body.textContent = msg.content;
    else body.innerHTML = md(msg.content || '');
    const notes = (msg.notes || []).map((n) => h('span', { class: 'chip note' }, '✔ ' + n));
    const el = h('div', { class: `msg ${isUser ? 'user' : 'assistant'}${msg.error ? ' error' : ''}` },
      body,
      notes.length ? h('div', { class: 'notes' }, notes) : null,
      msg.at ? h('div', { class: 'time muted small' }, fmtTime(msg.at)) : null);
    return { el, body };
  }

  function renderAll() {
    clear(list);
    const hist = opts.getHistory();
    if (!hist.length) list.appendChild(h('div', { class: 'empty' }, opts.emptyHint || 'Noch keine Nachrichten.'));
    for (const m of hist) list.appendChild(bubble(m).el);
    scrollDown();
  }

  function scrollDown() { list.scrollTop = list.scrollHeight; }

  function setBusy(b) {
    busy = b;
    sendBtn.classList.toggle('hidden', b);
    stopBtn.classList.toggle('hidden', !b);
    input.disabled = b;
    root.classList.toggle('busy', b);
  }

  function showUsage(u) {
    if (!u) return;
    const total = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    usageLine.textContent = `Letzte Anfrage: ${total} Tokens rein (${u.cache_read_input_tokens || 0} aus Cache), ${u.output_tokens || 0} raus`;
  }

  async function send(textOverride) {
    if (busy) return;
    const text = (textOverride ?? input.value).trim();
    if (!text) return;
    if (!getSettings().apiKey) { toast('Bitte zuerst den Claude-API-Key unter Einstellungen eintragen.', 'err', 4500); return; }

    const hist = opts.getHistory();
    hist.push({ role: 'user', content: text, at: new Date().toISOString() });
    input.value = '';
    autosize();
    renderAll();
    await opts.persist(hist);

    const apiMsgs = hist
      .filter((m) => !m.error && m.content)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));
    while (apiMsgs.length && apiMsgs[0].role !== 'user') apiMsgs.shift();

    const live = bubble({ role: 'assistant', content: '' });
    live.el.classList.add('streaming');
    list.appendChild(live.el);
    scrollDown();

    setBusy(true);
    abort = new AbortController();
    let shown = '';
    const notes = [];
    let lastUsage = null;
    let failed = null;

    try {
      for (let iter = 0; iter < 8; iter++) {
        if (iter > 0 && shown) shown += '\n\n';
        const res = await streamMessage({
          system: opts.getSystem(),
          messages: apiMsgs,
          tools: opts.tools,
          signal: abort.signal,
          onText: (t) => { shown += t; live.body.innerHTML = md(shown); scrollDown(); },
        });
        lastUsage = res.usage;
        showUsage(res.usage);

        const clean = res.content.map((b) => (b.type === 'tool_use' ? { type: 'tool_use', id: b.id, name: b.name, input: b.input } : b));
        const toolUses = res.content.filter((b) => b.type === 'tool_use');
        if (!toolUses.length || res.stop_reason !== 'tool_use') {
          if (res.stop_reason === 'max_tokens') shown += '\n\n_(Antwort wurde wegen der Längenbegrenzung abgeschnitten – schreibe „weiter“.)_';
          break;
        }
        apiMsgs.push({ role: 'assistant', content: clean });
        const results = [];
        for (const tu of toolUses) {
          try {
            if (tu._parseError) throw new Error('Werkzeugaufruf war unvollständig (Antwort zu lang). Bitte in kleineren Schritten erneut versuchen.');
            const out = opts.runTool(tu.name, tu.input || {});
            if (out.note) notes.push(out.note);
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out.result) });
          } catch (e) {
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ error: e.message }), is_error: true });
          }
        }
        apiMsgs.push({ role: 'user', content: results });
        if (opts.onDataChanged) opts.onDataChanged();
      }
    } catch (e) {
      failed = e;
    }

    setBusy(false);
    abort = null;
    live.el.classList.remove('streaming');

    if (failed && failed.name === 'AbortError') {
      shown += shown ? '\n\n_(abgebrochen)_' : '_(abgebrochen)_';
      failed = null;
    }
    if (failed) {
      const msg = failed instanceof ClaudeError ? failed.message : `Unerwarteter Fehler: ${failed.message}`;
      if (shown.trim() || notes.length) {
        hist.push({ role: 'assistant', content: shown, notes, at: new Date().toISOString() });
        hist.push({ role: 'assistant', content: `⚠️ ${msg}`, error: true, at: new Date().toISOString() });
      } else {
        hist.push({ role: 'assistant', content: `⚠️ ${msg}`, error: true, at: new Date().toISOString() });
      }
    } else {
      hist.push({ role: 'assistant', content: shown.trim() ? shown : '(Keine Textantwort)', notes, at: new Date().toISOString() });
    }
    await opts.persist(hist);
    if (opts.onDataChanged) opts.onDataChanged();
    renderAll();
    if (lastUsage) showUsage(lastUsage);
  }

  renderAll();
  return {
    el: root,
    refresh: renderAll,
    send,
    prefill(text) { input.value = text; autosize(); input.focus(); },
    isBusy: () => busy,
    destroy() { if (abort) abort.abort(); },
  };
}
