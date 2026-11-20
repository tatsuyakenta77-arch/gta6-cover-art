// Draws the multi-panel GTA-style cover: photos in a poster grid, each with a colour
// grade, a scrim, and the bold caption in the vendored Anton face. One code path draws
// the live preview and the exported PNG, so what you see is what you share.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.02)',
    overlays: [
      { stops: [[0, 'rgba(255,154,61,0.20)'], [0.55, 'rgba(255,94,122,0.12)'], [1, 'rgba(255,46,136,0.34)']], blend: 'soft-light' },
      { stops: [[0, 'rgba(255,190,80,0.10)'], [1, 'rgba(120,20,90,0.22)']], blend: 'overlay' },
    ],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.96)',
    overlays: [
      { stops: [[0, 'rgba(255,0,160,0.30)'], [0.5, 'rgba(120,0,180,0.10)'], [1, 'rgba(0,220,255,0.30)']], blend: 'overlay' },
      { stops: [[0, 'rgba(0,0,0,0.10)'], [1, 'rgba(10,0,40,0.28)']], blend: 'multiply' },
    ],
  },
  gold: {
    label: 'Golden Hour',
    filter: 'saturate(1.25) contrast(1.05) brightness(1.06)',
    overlays: [
      { stops: [[0, 'rgba(255,215,106,0.26)'], [1, 'rgba(255,122,24,0.30)']], blend: 'soft-light' },
      { stops: [[0, 'rgba(255,240,180,0.08)'], [1, 'rgba(90,40,0,0.18)']], blend: 'overlay' },
    ],
  },
  teal: {
    label: 'Miami Teal',
    filter: 'saturate(1.30) contrast(1.10) hue-rotate(-14deg)',
    overlays: [
      { stops: [[0, 'rgba(0,190,180,0.28)'], [1, 'rgba(255,120,40,0.26)']], blend: 'overlay' },
      { stops: [[0, 'rgba(0,60,70,0.14)'], [1, 'rgba(0,0,0,0.16)']], blend: 'multiply' },
    ],
  },
};

export const LAYOUTS = {
  solo: { label: '1 panel', panels: 1 },
  duo: { label: '2 panels', panels: 2 },
  trio: { label: '3 panels', panels: 3 },
  quad: { label: '4 panels', panels: 4 },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080 · square post' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350 · portrait post' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080 · wide post' },
};

/** Panel rectangles for a layout, in pixels of a cover `w` by `h`. */
export function panelRects(layout, w, h) {
  const m = Math.max(6, Math.round(Math.min(w, h) * 0.014));
  const g = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  const x = m, y = m, iw = w - 2 * m, ih = h - 2 * m;
  if (layout === 'solo') return [{ x, y, w: iw, h: ih }];
  if (layout === 'duo') {
    const half = (iw - g) / 2;
    return [{ x, y, w: half, h: ih }, { x: x + half + g, y, w: half, h: ih }];
  }
  if (layout === 'trio') {
    const leftW = Math.round(iw * 0.56);
    const rightX = x + leftW + g, rightW = iw - leftW - g;
    const halfH = (ih - g) / 2;
    return [
      { x, y, w: leftW, h: ih },
      { x: rightX, y, w: rightW, h: halfH },
      { x: rightX, y: y + halfH + g, w: rightW, h: halfH },
    ];
  }
  const halfW = (iw - g) / 2, halfH = (ih - g) / 2;
  return [
    { x, y, w: halfW, h: halfH },
    { x: x + halfW + g, y, w: halfW, h: halfH },
    { x, y: y + halfH + g, w: halfW, h: halfH },
    { x: x + halfW + g, y: y + halfH + g, w: halfW, h: halfH },
  ];
}

/** Cover-fits one photo into a panel, honouring its zoom and pan offsets. */
function drawPanelPhoto(ctx, rect, panel, grade) {
  const img = panel.img;
  if (!img) return;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - pw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  for (const o of grade.overlays) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    for (const [stop, color] of o.stops) grad.addColorStop(stop, color);
    ctx.globalCompositeOperation = o.blend;
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/** Draws the caption block: sub-caption, then the big Anton title. */
function drawCaption(ctx, w, h, caption, sub) {
  const text = (caption || '').trim().toUpperCase();
  const subText = (sub || '').trim().toUpperCase();
  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h);
  scrim.addColorStop(0, 'rgba(12,4,24,0)');
  scrim.addColorStop(0.55, 'rgba(12,4,24,0.42)');
  scrim.addColorStop(1, 'rgba(12,4,24,0.86)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  if (subText) {
    let subSize = Math.round(h * 0.034);
    ctx.font = `${subSize}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(subText).width > w * 0.86 && subSize > 10) {
      subSize -= 1;
      ctx.font = `${subSize}px Anton, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff7ab8';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(subText, w / 2, h * 0.815);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  if (!text) return;
  let size = Math.round(h * 0.118);
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 14) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const y = h * 0.945;
  const grad = ctx.createLinearGradient(0, y - size, 0, y);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#fff3c4');
  grad.addColorStop(1, '#ffb03a');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(3, size * 0.10);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, w / 2, y);
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole cover onto `canvas` (sized to the export size) from `state`:
 * { layout, grade, caption, sub, panels: [{img, zoom, ox, oy}], selected }.
 * With `editor` true it also draws the selected-panel outline for the preview.
 */
export function drawCover(canvas, state, editor = false) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = panelRects(state.layout, w, h);
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.img) {
      drawPanelPhoto(ctx, rect, panel, grade);
    } else {
      ctx.fillStyle = '#241534';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(14, Math.round(h * 0.022))}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`DROP A PHOTO · PANEL ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  // Soft vignette over the whole poster.
  const vig = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,18,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  drawCaption(ctx, w, h, state.caption, state.sub);
  if (editor) {
    const sel = rects[state.selected || 0];
    if (sel) {
      ctx.save();
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.005));
      ctx.setLineDash([Math.round(w * 0.02), Math.round(w * 0.012)]);
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      ctx.setLineDash([]);
      const tag = `PANEL ${(state.selected || 0) + 1}`;
      ctx.font = `${Math.max(13, Math.round(h * 0.02))}px Anton, sans-serif`;
      const tw = ctx.measureText(tag).width;
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(sel.x, sel.y, tw + 18, Math.round(h * 0.032) + 8);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, sel.x + 9, sel.y + (Math.round(h * 0.032) + 8) / 2);
      ctx.restore();
    }
  }
}

/** Renders the cover at an export size and returns the fresh canvas. */
export function renderExport(state, sizeKey) {
  const size = SIZES[sizeKey] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state, false);
  return canvas;
}
