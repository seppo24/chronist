// Nebel des Krieges: Raster über einer Karte. Zustand: { cols, rows, bits } mit bits = Text aus '0' (verdeckt) und '1' (aufgedeckt),
// Zelle (spalte, zeile) liegt an Stelle zeile * cols + spalte.

export const FOG_SIZES = [[8, 6], [12, 8], [16, 12], [24, 16]];

export const newFog = (cols = 12, rows = 8) => ({ on: false, cols, rows, bits: '0'.repeat(cols * rows) });

export function normFog(f) {
  const cols = Math.max(1, Math.min(48, parseInt(f && f.cols, 10) || 12));
  const rows = Math.max(1, Math.min(48, parseInt(f && f.rows, 10) || 8));
  let bits = String((f && f.bits) || '');
  if (bits.length !== cols * rows) bits = '0'.repeat(cols * rows);
  return { on: !!(f && f.on), cols, rows, bits };
}

export const cellOf = (fog, x, y, w, h) => {
  const c = Math.max(0, Math.min(fog.cols - 1, Math.floor((x / w) * fog.cols)));
  const r = Math.max(0, Math.min(fog.rows - 1, Math.floor((y / h) * fog.rows)));
  return r * fog.cols + c;
};

export const setBit = (bits, i, v) => bits.slice(0, i) + (v ? '1' : '0') + bits.slice(i + 1);
export const allBits = (fog, v) => (v ? '1' : '0').repeat(fog.cols * fog.rows);
export const revealedCount = (fog) => (fog.bits.match(/1/g) || []).length;

/** Zeichnet den Nebel auf ein Canvas, das per CSS die Größe des Bildes hat. opacity 1 = blickdicht (Spielbrett). */
export function drawFog(canvas, fog, { opacity = 1, grid = false } = {}) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(1, Math.round(rect.width * dpr));
  const H = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!fog || !fog.on) return;
  ctx.fillStyle = `rgba(0,0,0,${opacity})`;
  for (let r = 0; r < fog.rows; r++) {
    for (let c = 0; c < fog.cols; c++) {
      if (fog.bits[r * fog.cols + c] === '1') continue;
      const x0 = Math.floor((c * W) / fog.cols);
      const x1 = Math.ceil(((c + 1) * W) / fog.cols);
      const y0 = Math.floor((r * H) / fog.rows);
      const y1 = Math.ceil(((r + 1) * H) / fog.rows);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  if (grid) {
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    for (let c = 1; c < fog.cols; c++) { const x = Math.round((c * W) / fog.cols) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let r = 1; r < fog.rows; r++) { const y = Math.round((r * H) / fog.rows) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
}
