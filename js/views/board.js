// Spielbrett-Tablet für die Tischmitte: zeigt, was der Spielleiter freigibt (Karte, Text oder nichts).
// Route: #/board/<Raumcode>/-/<Konfiguration>
import { h, clear, put } from '../util.js';
import * as live from '../live.js';
import { drawFog } from '../fog.js';
import { playEffect } from '../fx.js';
import { soundButton } from './play.js';

export async function render(main, [code, , cfgArg], ctx) {
  ctx.setTitle('Spielbrett');
  const root = h('div', { class: 'view board' });
  main.appendChild(root);
  const say = (t) => { clear(root); root.appendChild(h('div', { class: 'board-msg' }, t)); };

  if (cfgArg && cfgArg !== '-') {
    const cfg = live.decodeConfig(cfgArg);
    if (cfg) live.setConfig(cfg);
    history.replaceState(null, '', `#/board/${code}/-`);
  }
  if (!live.getConfig()) { say('Bitte den Spielbrett-Link des Spielleiters öffnen.'); return; }

  let wake = null;
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch { /* optional */ }

  say('Verbinde …');
  let room;
  try { room = await live.tabletRoom(code); } catch (e) { say(`Keine Verbindung: ${live.friendlyError(e)}`); return; }
  if (!room) { say('Spielraum nicht gefunden. Bitte einen neuen Link vom Spielleiter holen.'); return; }

  const cache = new Map();
  let shown = '';
  let zoomed = false;
  const stage = h('div', { class: 'board-stage' });
  const fsBtn = h('button', {
    class: 'board-fs', type: 'button', 'aria-label': 'Vollbild',
    onclick: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* egal */ } },
  }, '⛶');
  clear(root);
  put(root, stage, fsBtn);

  let view = null; // { id, canvas, wrap, fog } der gerade gezeigten Karte
  const paintFog = () => { if (view) drawFog(view.canvas, view.fog ? { ...view.fog, on: true } : null, { opacity: 1 }); };
  window.addEventListener('resize', paintFog);

  const draw = async (b) => {
    // Gleiche Karte, nur der Nebel hat sich geändert: Bild nicht neu aufbauen
    if (b && b.mode === 'image' && view && view.id === b.imageId) {
      view.fog = b.fog || null;
      paintFog();
      return;
    }
    const sig = b ? `${b.mode}|${b.imageId}|${b.text}|${b.rev}` : 'none';
    if (sig === shown) return;
    shown = sig;
    clear(stage);
    view = null;
    zoomed = false;
    if (!b || b.mode === 'blank') { stage.appendChild(h('div', { class: 'board-idle' }, room.title || 'Spielbrett')); return; }
    if (b.mode === 'text') { stage.appendChild(h('div', { class: 'board-text' }, b.text)); return; }
    if (b.mode === 'image') {
      stage.appendChild(h('div', { class: 'board-idle' }, 'Lade Karte …'));
      let d = cache.get(b.imageId);
      if (!d) { try { d = await live.boardImage(code, b.imageId); } catch (e) { d = null; } if (d) cache.set(b.imageId, d); }
      if (shown !== sig) return;
      clear(stage);
      if (!d) { stage.appendChild(h('div', { class: 'board-idle' }, 'Karte nicht verfügbar')); return; }
      const img = h('img', { class: 'board-img', src: d.data, alt: b.name || 'Karte' });
      const canvas = h('canvas', { class: 'board-fog' });
      const wrap = h('div', { class: 'board-wrap' }, img, canvas);
      const scroller = h('div', { class: 'board-scroll' }, wrap);
      scroller.addEventListener('click', () => { zoomed = !zoomed; scroller.classList.toggle('zoomed', zoomed); requestAnimationFrame(paintFog); });
      put(stage, scroller, b.name ? h('div', { class: 'board-caption' }, b.name) : null);
      view = { id: b.imageId, canvas, wrap, fog: b.fog || null };
      if (img.complete) paintFog(); else img.addEventListener('load', paintFog);
      requestAnimationFrame(paintFog);
    }
  };
  put(root, soundButton());
  let lastFx;
  const unFx = await live.boardFxWatch(code, (fx) => {
    if (lastFx === undefined) { lastFx = fx ? fx.id : null; return; }
    if (fx && fx.id !== lastFx) { lastFx = fx.id; playEffect(fx.type, fx.text || ''); }
  });
  const unsub = await live.boardWatch(code, draw);
  if (!shown) draw(null);
  return () => { window.removeEventListener('resize', paintFog); try { unsub(); unFx(); } catch { /* egal */ } try { wake && wake.release(); } catch { /* egal */ } };
}
