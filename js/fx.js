// Töne und Effekte: kleine Klänge per WebAudio (keine Audiodateien nötig) und kurze Bildschirm-Blitze.
import { h } from './util.js';

export const EFFECTS = [
  { id: 'slash', label: '⚔️ Schwerthieb', flash: 'red' },
  { id: 'hit', label: '💥 Treffer', flash: 'red' },
  { id: 'heal', label: '💚 Heilung', flash: 'green' },
  { id: 'magic', label: '✨ Zauber', flash: 'violet' },
  { id: 'alarm', label: '🚨 Alarm', flash: 'red' },
  { id: 'gong', label: '🔔 Gong', flash: 'gold' },
  { id: 'fanfare', label: '🎺 Erfolg', flash: 'gold' },
  { id: 'ko', label: '💀 Niedergeschlagen', flash: 'dark' },
  { id: 'dice', label: '🎲 Würfeln', flash: null },
];
const KNOWN = new Set(EFFECTS.map((e) => e.id));

const MUTE_KEY = 'chronist.fx.muted';
let ac = null;

export const isMuted = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } };
export function setMuted(v) { try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* egal */ } }
export const isUnlocked = () => !!ac && ac.state === 'running';

/** Muss durch eine Berührung/einen Klick ausgelöst werden (Browser-Vorgabe). */
export function unlock() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!ac) ac = new Ctx();
    if (ac.state === 'suspended') ac.resume();
    return true;
  } catch { return false; }
}

function tone(freq, t0, dur, { type = 'sine', gain = 0.18, to = null, attack = 0.005 } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(t0, dur, { gain = 0.25, from = 6000, to = 800, q = 1, type = 'bandpass' } = {}) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t0);
}

const SOUNDS = {
  slash: (t) => { noise(t, 0.28, { from: 9000, to: 1200, q: 2, gain: 0.35 }); tone(900, t, 0.18, { type: 'sawtooth', to: 200, gain: 0.08 }); },
  hit: (t) => { tone(140, t, 0.25, { type: 'sine', to: 45, gain: 0.5 }); noise(t, 0.12, { from: 1800, to: 300, gain: 0.3, type: 'lowpass' }); },
  heal: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.45, { gain: 0.14 })); },
  magic: (t) => { for (let i = 0; i < 7; i++) tone(1200 + Math.random() * 1800, t + i * 0.06, 0.35, { gain: 0.07, to: 2400 + Math.random() * 1200 }); tone(330, t, 0.7, { type: 'triangle', gain: 0.08, to: 660 }); },
  alarm: (t) => { for (let i = 0; i < 4; i++) { tone(880, t + i * 0.32, 0.16, { type: 'square', gain: 0.1 }); tone(660, t + i * 0.32 + 0.16, 0.16, { type: 'square', gain: 0.1 }); } },
  gong: (t) => { [110, 165, 233, 277].forEach((f, i) => tone(f * (1 + i * 0.01), t, 2.6, { gain: 0.16 / (i + 1), attack: 0.01 })); noise(t, 0.2, { from: 3000, to: 500, gain: 0.1 }); },
  fanfare: (t) => { [[392, 0], [392, 0.14], [392, 0.28], [523, 0.46]].forEach(([f, d]) => tone(f, t + d, d === 0.46 ? 0.7 : 0.13, { type: 'square', gain: 0.1 })); },
  ko: (t) => { tone(220, t, 1.1, { type: 'sawtooth', to: 55, gain: 0.2 }); tone(110, t + 0.15, 1.0, { type: 'sine', to: 40, gain: 0.3 }); },
  dice: (t) => { for (let i = 0; i < 6; i++) noise(t + i * 0.055 + Math.random() * 0.02, 0.05, { from: 3500, to: 1500, gain: 0.22, q: 3 }); },
};

/** Spielt einen Klang (falls entsperrt und nicht stumm). Merkt sich zum Testen in window.__fxPlayed. */
export function playSound(type) {
  (window.__fxPlayed = window.__fxPlayed || []).push(type);
  if (isMuted() || !KNOWN.has(type)) return false;
  if (!unlock() || !ac || ac.state !== 'running') return false;
  try { SOUNDS[type](ac.currentTime + 0.01); return true; } catch { return false; }
}

/** Kurzer Bildschirm-Blitz (+ optional Text). */
export function flash(type, text = '') {
  const def = EFFECTS.find((e) => e.id === type);
  const color = def ? def.flash : null;
  if (!color && !text) return;
  const el = h('div', { class: `fx-flash fx-${color || 'none'}`, 'data-fx': type, 'aria-hidden': 'true' }, text ? h('div', { class: 'fx-text' }, text) : null);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), text ? 2600 : 900);
}

/** Klang + Blitz zusammen. */
export function playEffect(type, text = '') {
  playSound(type);
  flash(type, text);
}
