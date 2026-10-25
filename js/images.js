// Karten und Bilder: lokal in IndexedDB (Sammlung "images"), per Dropbox als echte .jpg-Dateien abgeglichen.
// Eine Szene verweist mit scene.images = [{ id, name }] auf ihre Bilder.
import { h, clear, uid, toast, confirmDialog, formDialog } from './util.js';
import { saveItem, getItem, deleteItem } from './store.js';

const urlCache = new Map();

export async function getImageUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const rec = await getItem('images', id);
  if (!rec || !rec.blob) return null;
  const url = URL.createObjectURL(rec.blob);
  urlCache.set(id, url);
  return url;
}

export function forgetImage(id) {
  const u = urlCache.get(id);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(id);
}

export async function removeImage(id) {
  forgetImage(id);
  await deleteItem('images', id);
}

/** Verkleinert auf höchstens maxSide Pixel und wandelt in JPEG um (hält Dropbox und Handy schlank). */
async function toJpeg(file, maxSide = 2000) {
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`„${file.name || 'Datei'}“ ist kein lesbares Bild.`);
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const hh = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hh;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, hh);
  ctx.drawImage(bmp, 0, 0, w, hh);
  if (bmp.close) bmp.close();
  const toBlob = (q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
  let blob = await toBlob(0.86);
  if (blob && blob.size > 3_000_000) blob = await toBlob(0.7);
  if (!blob) throw new Error('Das Bild konnte nicht umgewandelt werden.');
  return blob;
}

export async function addImageFile(file) {
  const blob = await toJpeg(file);
  const id = uid('img');
  await saveItem('images', { id, blob, size: blob.size });
  return id;
}

function viewer(im) {
  const dlg = h('dialog', { class: 'dlg wide viewer' });
  const img = h('img', { alt: im.name || 'Bild' });
  getImageUrl(im.id).then((u) => { if (u) img.src = u; else img.replaceWith(h('p', { class: 'muted' }, 'Dieses Bild ist auf diesem Gerät noch nicht angekommen. Bitte synchronisieren.')); });
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.append(
    h('div', { class: 'row between center' }, h('strong', {}, im.name || 'Bild'), h('button', { class: 'btn small', onclick: close }, 'Schließen')),
    h('div', { class: 'viewer-body' }, img));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.appendChild(dlg);
  dlg.showModal();
}

/**
 * Bilderleiste für eine Szene.
 *  owner: Szene (hat .images), save(): speichert das Abenteuer, editable: Hinzufügen/Umbenennen/Löschen
 */
export function imageStrip(owner, save, { editable = true, title = '🗺️ Karten & Bilder' } = {}) {
  const root = h('div', { class: 'imgstrip' });

  async function draw() {
    clear(root);
    const list = owner.images || [];
    if (!list.length && !editable) return;
    root.appendChild(h('div', { class: 'k small muted' }, title));
    const grid = h('div', { class: 'imggrid' });
    for (const im of list) {
      const img = h('img', { alt: im.name || 'Bild', loading: 'lazy' });
      const fig = h('figure', { class: 'thumb' },
        h('button', { class: 'thumb-btn', type: 'button', 'aria-label': `${im.name || 'Bild'} öffnen`, onclick: () => viewer(im) }, img),
        h('figcaption', {}, im.name || 'Bild'));
      getImageUrl(im.id).then((u) => {
        if (u) img.src = u;
        else { fig.classList.add('missing'); img.replaceWith(h('span', { class: 'muted small' }, 'noch nicht synchronisiert')); }
      });
      if (editable) {
        fig.appendChild(h('div', { class: 'row gap thumb-actions' },
          h('button', {
            class: 'btn small', type: 'button', 'aria-label': 'Umbenennen',
            onclick: async () => {
              const r = await formDialog('Bild umbenennen', [{ key: 'name', label: 'Name', value: im.name || '' }]);
              if (r) { im.name = r.name.trim() || im.name; await save(); draw(); }
            },
          }, '✏️'),
          h('button', {
            class: 'btn small danger', type: 'button', 'aria-label': 'Bild löschen',
            onclick: async () => {
              if (!(await confirmDialog(`Bild „${im.name || 'Bild'}“ löschen?`, { okText: 'Löschen', danger: true }))) return;
              owner.images = owner.images.filter((x) => x.id !== im.id);
              await save();
              await removeImage(im.id);
              draw();
            },
          }, '🗑')));
      }
      grid.appendChild(fig);
    }
    if (grid.children.length) root.appendChild(grid);
    if (editable) {
      const input = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden' });
      input.addEventListener('change', async () => {
        const files = [...input.files];
        input.value = '';
        for (const f of files) {
          try {
            toast(`Bild wird verarbeitet: ${f.name}`, 'info', 1500);
            const id = await addImageFile(f);
            owner.images = owner.images || [];
            owner.images.push({ id, name: (f.name || 'Bild').replace(/\.[^.]+$/, '') });
            await save();
          } catch (e) { toast(e.message, 'err', 5000); }
        }
        draw();
      });
      root.append(input, h('button', { class: 'btn small', type: 'button', onclick: () => input.click() }, '＋ Karte / Bild hinzufügen'));
    }
  }
  draw();
  return root;
}
