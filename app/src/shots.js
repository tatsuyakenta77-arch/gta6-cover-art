// Fixed scenes for screenshots. `?shot=editor` shows the page with photos loaded;
// `?shot=cover` shows the cover alone, full-bleed. Query knobs: photo (comma-separated
// sample names, one per panel), caption, sub, layout, grade, size.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photo') ?? 'vice-street').split(',').filter(Boolean);
  const images = [];
  for (const name of photos) {
    const img = await api.loadImage(`samples/${name}.jpg`);
    img.dataset.sample = name;
    images.push(img);
  }
  if (query.get('layout')) api.setLayout(query.get('layout'));
  if (query.get('grade')) api.setGrade(query.get('grade'));
  if (query.get('size')) api.setSize(query.get('size'));
  api.setCaption(query.get('caption') ?? 'Sunset Heist');
  api.setSub(query.get('sub') ?? 'Neon Nights');
  // Fill panels in order with the named photos (repeating the last if short).
  const panels = api.state.panels;
  const count = { solo: 1, duo: 2, trio: 3, quad: 4 }[api.state.layout] || 3;
  for (let i = 0; i < count; i++) {
    const img = images[Math.min(i, images.length - 1)];
    panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
  }
  api.state.selected = 0;
  api.redraw();
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
