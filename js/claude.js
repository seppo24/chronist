// Anbindung an die Claude-API (direkt aus dem Browser, mit Streaming und Werkzeugen).
import { getSettings, addTokenUsage } from './store.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

export class ClaudeError extends Error {
  constructor(message, status) { super(message); this.name = 'ClaudeError'; this.status = status; }
}

function friendlyError(status, body) {
  const msg = body?.error?.message || '';
  if (status === 401) return 'Der API-Key wurde abgelehnt (401). Bitte unter Einstellungen prüfen.';
  if (status === 403) return `Zugriff verweigert (403). ${msg}`;
  if (status === 404) return `Modell nicht gefunden (404). Bitte Modellnamen unter Einstellungen prüfen. ${msg}`;
  if (status === 429) return 'Zu viele Anfragen oder Limit erreicht (429). Kurz warten und erneut senden.';
  if (status === 529 || status === 503) return 'Claude ist gerade überlastet. Bitte gleich nochmal versuchen.';
  if (status === 400 && /credit|balance/i.test(msg)) return 'Das API-Guthaben ist aufgebraucht. Bitte in der Anthropic Console aufladen.';
  return `Fehler ${status}: ${msg || 'unbekannt'}`;
}

/**
 * Eine Anfrage mit Streaming. Gibt {content, stop_reason, usage} zurück.
 * onText(deltaText) wird für Textstücke aufgerufen.
 */
export async function streamMessage({ system, messages, tools, onText, signal }) {
  const s = getSettings();
  if (!s.apiKey) throw new ClaudeError('Es ist noch kein Claude-API-Key hinterlegt (Einstellungen).', 0);

  const body = {
    model: s.model,
    max_tokens: Number(s.maxTokens) || 6000,
    system,
    messages,
    stream: true,
  };
  if (tools && tools.length) body.tools = tools;

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': s.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ClaudeError('Keine Verbindung zur Claude-API (Internet?). ' + e.message, 0);
  }

  if (!res.ok) {
    let j = null;
    try { j = await res.json(); } catch { /* ignore */ }
    throw new ClaudeError(friendlyError(res.status, j), res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const blocks = [];
  let stopReason = null;
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

  const handle = (evt) => {
    switch (evt.type) {
      case 'message_start': {
        const u = evt.message?.usage || {};
        usage.input_tokens = u.input_tokens || 0;
        usage.cache_read_input_tokens = u.cache_read_input_tokens || 0;
        usage.cache_creation_input_tokens = u.cache_creation_input_tokens || 0;
        break;
      }
      case 'content_block_start': {
        const cb = evt.content_block;
        blocks[evt.index] = cb.type === 'tool_use'
          ? { type: 'tool_use', id: cb.id, name: cb.name, input: {}, _json: '' }
          : { type: cb.type, text: cb.text || '' };
        break;
      }
      case 'content_block_delta': {
        const b = blocks[evt.index];
        if (!b) break;
        if (evt.delta.type === 'text_delta') {
          b.text += evt.delta.text;
          if (onText) onText(evt.delta.text);
        } else if (evt.delta.type === 'input_json_delta') {
          b._json += evt.delta.partial_json;
        }
        break;
      }
      case 'content_block_stop': {
        const b = blocks[evt.index];
        if (b && b.type === 'tool_use') {
          try { b.input = b._json ? JSON.parse(b._json) : {}; } catch { b.input = {}; b._parseError = true; }
        }
        break;
      }
      case 'message_delta':
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
        if (evt.usage?.output_tokens) usage.output_tokens = evt.usage.output_tokens;
        break;
      case 'error':
        throw new ClaudeError(`Claude meldet: ${evt.error?.message || 'Fehler im Stream'}`, 0);
      default:
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (!json) continue;
      let evt;
      try { evt = JSON.parse(json); } catch { continue; }
      handle(evt);
    }
  }

  addTokenUsage(usage);
  const content = blocks.filter(Boolean).map((b) => {
    if (b.type === 'tool_use') {
      const out = { type: 'tool_use', id: b.id, name: b.name, input: b.input };
      if (b._parseError) out._parseError = true;
      return out;
    }
    return b;
  });
  return { content, stop_reason: stopReason, usage };
}
