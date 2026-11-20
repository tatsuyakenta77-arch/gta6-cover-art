// Wires Vice Cover Studio: pick photos, arrange the panels, grade, caption, export.
// Photos are read on this machine only and never leave it. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).

import { drawCover, renderExport, panelRects, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('subcaption');
const status = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('photo');

const SAMPLES = ['vice-street', 'neon-alley', 'pier', 'boulevard'];

const state = {
  layout: 'trio',
  grade: 'sunset',
  caption: 'Sunset Heist',
  sub: 'Neon Nights',
  size: '1080x1080',
  selected: 0,
  panels: [null, null, null, null].map(() => ({ img: null, zoom: 1, ox: 0, oy: 0 })),
};

function panelCount() { return LAYOUTS[state.layout].panels; }

function redraw() {
  drawCover(canvas, state, true);
}

function setSize(sizeKey) {
  state.size = sizeKey;
  canvas.width = SIZES[sizeKey].w;
  canvas.height = SIZES[sizeKey].h;
  document.querySelectorAll('.size-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === sizeKey));
  document.getElementById('export').textContent =
    `Export PNG ${SIZES[sizeKey].w} × ${SIZES[sizeKey].h}`;
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Puts `img` into panel `i` (or the selected panel) and resets its crop. */
function placePhoto(img, i = state.selected) {
  state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
  state.selected = i;
  syncPanelControls();
  redraw();
}

/** Fills empty panels, in order, with the given images. */
function placePhotos(images) {
  let i = 0;
  for (const img of images) {
    while (i < panelCount() && state.panels[i].img) i++;
    if (i >= panelCount()) break;
    placePhoto(img, i);
    i++;
  }
  if (!images.length) return;
  status.textContent = `${images.length} photo${images.length > 1 ? 's' : ''} loaded — drag a panel photo to move it, scroll to zoom.`;
}

async function loadFiles(files) {
  const images = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try { images.push(await loadImage(URL.createObjectURL(file))); }
    catch { status.textContent = `Could not read ${file.name}.`; }
  }
  placePhotos(images);
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  zoomInput.value = String(Math.round(((p.zoom || 1) - 1) * 100));
  document.getElementById('zoom-value').textContent = `${Math.round((p.zoom || 1) * 100)}%`;
  document.querySelectorAll('.layout-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('.sample-btn').forEach((b) =>
    b.classList.toggle('active', state.panels[state.selected] &&
      state.panels[state.selected].img?.dataset?.sample === b.dataset.sample));
}

/** Picks a layout, keeping each panel's photo where it was. */
function setLayout(layout) {
  state.layout = layout;
  if (state.selected >= panelCount()) state.selected = panelCount() - 1;
  syncPanelControls();
  redraw();
}

function setGrade(grade) {
  state.grade = grade;
  syncPanelControls();
  redraw();
}

// --- controls ---------------------------------------------------------------
fileInput.addEventListener('change', (e) => { loadFiles([...e.target.files]); fileInput.value = ''; });
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
  loadFiles([...e.dataTransfer.files]);
});
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => { e.preventDefault(); loadFiles([...e.dataTransfer.files]); });

document.querySelectorAll('.layout-btn').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('.grade-btn').forEach((b) =>
  b.addEventListener('click', () => setGrade(b.dataset.grade)));
document.querySelectorAll('.size-btn').forEach((b) =>
  b.addEventListener('click', () => setSize(b.dataset.size)));
document.querySelectorAll('.sample-btn').forEach((b) =>
  b.addEventListener('click', async () => {
    const img = await loadImage(`samples/${b.dataset.sample}.jpg`);
    img.dataset.sample = b.dataset.sample;
    placePhoto(img);
    status.textContent = `Sample “${b.dataset.sample}” in panel ${state.selected + 1}.`;
  }));

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.sub = subInput.value; redraw(); });

zoomInput.addEventListener('input', () => {
  const p = state.panels[state.selected];
  p.zoom = 1 + Number(zoomInput.value) / 100;
  document.getElementById('zoom-value').textContent = `${Math.round(p.zoom * 100)}%`;
  redraw();
});
document.getElementById('fill-all').addEventListener('click', () => {
  const src = state.panels[state.selected];
  if (!src.img) { status.textContent = 'Load a photo into the selected panel first.'; return; }
  for (let i = 0; i < panelCount(); i++) state.panels[i] = { ...src };
  redraw();
  status.textContent = 'One photo now fills every panel.';
});
document.getElementById('centre').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.zoom = 1; p.ox = 0; p.oy = 0;
  syncPanelControls();
  redraw();
});

// --- picking and moving a panel photo on the canvas --------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
function panelAt(point) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const i = panelAt(point);
  if (i < 0) return;
  state.selected = i;
  syncPanelControls();
  redraw();
  const p = state.panels[i];
  dragging = p.img ? { panel: p, x: point.x, y: point.y } : null;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const point = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const rect = rects[state.selected];
  dragging.panel.ox += (point.x - dragging.x) / rect.w;
  dragging.panel.oy += (point.y - dragging.y) / rect.h;
  dragging.x = point.x;
  dragging.y = point.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  if (!p.img) return;
  p.zoom = Math.min(3, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  syncPanelControls();
  redraw();
}, { passive: false });

// --- export ------------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  const out = renderExport(state, state.size);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${state.size}.png — share it anywhere.`;
  }, 'image/png');
});

// --- start -------------------------------------------------------------------
async function boot() {
  try { await document.fonts.load('80px Anton'); } catch { /* fall back to sans-serif */ }
  // Default cover: three Vice-City-style samples, so the app looks great at once.
  const defaults = ['vice-street', 'neon-alley', 'pier'];
  for (let i = 0; i < defaults.length; i++) {
    try {
      const img = await loadImage(`samples/${defaults[i]}.jpg`);
      img.dataset.sample = defaults[i];
      state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
    } catch { /* a missing sample just leaves its panel empty */ }
  }
  setSize(state.size);
  syncPanelControls();

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      loadImage, setLayout, setGrade, setSize, placePhoto, placePhotos, state,
      setCaption: (text) => { state.caption = text; captionInput.value = text; },
      setSub: (text) => { state.sub = text; subInput.value = text; },
      redraw,
    });
  }
  redraw();
}

boot();
