// Ícones de traço (24×24), monocromáticos — usados no HTML e no canvas.
export const ICONS = {
  // necessidades
  hunger: 'M7 2v20 M4 2v6a3 3 0 0 0 6 0V2 M17 22V2c-2.5 1.5-3.5 4-3.5 7v4H17',
  thirst: 'M12 2.7c3.2 4.1 6 7.6 6 11.1a6 6 0 0 1-12 0c0-3.5 2.8-7 6-11.1z',
  energy: 'M13 2 4 14h7l-1 8 9-12h-7z',
  health: 'M12 20s-7-4.4-9.2-8.8C1.3 8.2 3 4.5 6.5 4.5c2.1 0 3.6 1.2 4.5 2.7.9-1.5 2.4-2.7 4.5-2.7 3.5 0 5.2 3.7 3.7 6.7C19 15.6 12 20 12 20z',
  biohazard: 'M12 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z M7.6 11.6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z M16.4 11.6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z M12 12.6a.9.9 0 1 0 0 1.8.9.9 0 1 0 0-1.8z',
  // recursos
  food: 'M6 6h12v14H6z M6 6c0-1.2 2.7-2.2 6-2.2s6 1 6 2.2 M6 10h12 M6 16h12',
  water: 'M12 2.7c3.2 4.1 6 7.6 6 11.1a6 6 0 0 1-12 0c0-3.5 2.8-7 6-11.1z',
  seeds: 'M12 21v-9 M12 12c0-4-3-6-7-6 0 4 3 6 7 6z M12 10c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z',
  medkit: 'M4 7h16v13H4z M9 7V4h6v3 M12 10v7 M8.5 13.5h7',
  wood: 'M3 6h18v5H3z M3 13h18v5H3z M8 6v5 M15 13v5',
  brick: 'M3 5h18v14H3z M3 9.7h18 M3 14.3h18 M9 5v4.7 M15 9.7v4.6 M9 14.3V19',
  metal: 'M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  tape: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14z M11 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z M11 18h10',
  // ferramentas / barra
  build: 'M15 4l5 5-3 3-5-5z M12.5 6.5 3 16l3 3 9.5-9.5',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z M3 7.5 12 12l9-4.5 M12 12v9',
  plan: 'M9 3h6v3H9z M7 4.5H5V21h14V4.5h-2 M8.5 11h7 M8.5 15h4.5',
  car: 'M3 13l2.2-5.5h13.6L21 13v5H3z M3 13h18 M6.5 18v2 M17.5 18v2 M7 15.5h.01 M17 15.5h.01',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  pause: 'M8 5v14 M16 5v14',
  play: 'M7 4.5v15L19 12z',
  fast: 'M3 5.5v13L11 12z M12 5.5v13L20 12z',
  faster: 'M2 6v12l5.5-6z M8.5 6v12L14 12z M15 6v12l5.5-6z',
  // ações
  eat: 'M7 2v20 M4 2v6a3 3 0 0 0 6 0V2 M17 22V2c-2.5 1.5-3.5 4-3.5 7v4H17',
  drink: 'M6 3h12l-1.5 18h-9z M6.6 9h10.8',
  sleep: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  rest: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3 M2 11h4v4h12v-4h4v7H2z M4 18v2 M20 18v2',
  tv: 'M3 6h18v12H3z M8 21h8 M12 18v3 M8 2l4 4 4-4',
  work: 'M5 5h14v10H5z M2 19h20l-2-4H4z',
  walk: 'M5 12h14 M13 6l6 6-6 6',
  plant: 'M12 21v-9 M12 12c0-4-3-6-7-6 0 4 3 6 7 6z M12 10c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z',
  waterCan: 'M4 9h10v10H4z M14 11l6-4 M4 12H2 M17.5 13.5v1 M20 15v1',
  harvest: 'M3 10h18l-2 10H5z M8 10l4-6 4 6 M9 14v3 M15 14v3',
  seal: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14z M11 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z M11 18h10',
  cancel: 'M6 6l12 12 M18 6 6 18',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M12 11v6 M12 7.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  square: 'M5 5h14v14H5z',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  // construção
  wall: 'M3 5h18v14H3z M3 9.7h18 M3 14.3h18 M9 5v4.7 M15 9.7v4.6 M9 14.3V19',
  window: 'M4 4h16v16H4z M12 4v16 M4 12h16',
  door: 'M6 3h12v18H6z M14.5 12h.01',
  speaker: 'M4 9h4l5-4v14l-5-4H4z M16.5 8.5a5 5 0 0 1 0 7 M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0 M12 3v2',
  floor: 'M3 9l9-5 9 5-9 5z M3 14l9 5 9-5',
  planter: 'M4 11h16l-2 9H6z M12 11V6 M12 7c0-2-1.5-3-4-3 0 2 1.5 3 4 3z M12 8c0-2 1.5-3 4-3 0 2-1.5 3-4 3z',
  cistern: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3v12c0 1.7-3.1 3-7 3s-7-1.3-7-3z M5 6c0 1.7 3.1 3 7 3s7-1.3 7-3',
  solar: 'M3 8h18l-2 9H5z M9 8l-1 9 M15 8l1 9 M4 12.5h16 M12 17v4',
  filter: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M12 12c0-3 1-5 4-6 M12 12c3 0 5 1 6 4 M12 12c0 3-1 5-4 6 M12 12c-3 0-5-1-6-4',
  // diversos
  cart: 'M3 4h2l2.5 11h11L21 7H6.5 M9 20h.01 M18 20h.01',
  store: 'M3 21V9l9-6 9 6v12 M9 21v-6h6v6',
  save: 'M5 3h11l3 3v15H5z M8 3v5h7V3 M8 14h8v7H8z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5 M12 17h.01',
  reset: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
  warning: 'M12 3l10 18H2z M12 10v5 M12 18h.01',
  home: 'M3 11l9-8 9 8 M5 9.5V21h14V9.5',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v1h5v-1c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
  bulbOff: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2v1h5v-1c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z M3 3l18 18',
  sunrise: 'M12 3v3 M4.9 7.9l2.1 2.1 M19.1 7.9 17 10 M2 18h20 M6 18a6 6 0 0 1 12 0 M8 21h8',
  sun: 'M12 8a4 4 0 1 0 .01 0z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z M17 3v2 M16 4h2',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 .01 0z',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9 M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  ear: 'M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.5S14 18 12.5 19.5 8 20 8 17 M9 9a3 3 0 0 1 6 0c0 1.5-1.5 2-1.5 3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z M12 7v5l3 2',
  // andares, laboratório, defesa
  attic: 'M2 12 12 4l10 8 M5 10v10h14V10 M10 20v-5h4v5 M9 9.5h6',
  bunker: 'M2 8h20 M4 8v13h16V8 M12 3v5 M9 3h6 M8 13h8v4H8z',
  flask: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3 M7.5 15h9',
  sample: 'M14.5 3.5l6 6 M16 5 7 14l3 3 9-9 M7 14l-3.5 3.5a2.1 2.1 0 0 0 3 3L10 17 M10 12h4',
  shovel: 'M14 3l7 7 M17.5 6.5 9 15 M6 12l6 6-3 3-6-6z',
  fence: 'M5 21V6l1.5-2L8 6v15 M11.25 21V6l1.5-2 1.5 2v15 M17.5 21V6L19 4l1.5 2v15 M3 10h19 M3 16h19',
  spikes: 'M3 20h18 M5 20l2-12 2 12 M10 20l2-15 2 15 M15 20l2-11 2 11',
  axe: 'M14 3l7 7-4 1-4-4z M15 9 4 20 M12 5c-3 0-6 2-6 6',
  up: 'M12 20V5 M6 11l6-6 6 6',
  down: 'M12 4v15 M6 13l6 6 6-6',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4',
  radio: 'M3 9h18v11H3z M6 9l12-5 M7 13a2.5 2.5 0 1 0 0.01 0z M13 13h5 M13 16h5',
  shower: 'M4 21V7a4 4 0 0 1 8 0 M9 7h6 M12 10v1 M15 10l1 1 M9 10l-1 1 M12 14v1 M16 14l1 1 M8 14l-1 1',
  fight: 'M5 14V8a2 2 0 0 1 4 0v-1a2 2 0 0 1 4 0 2 2 0 0 1 4 0v1a2 2 0 0 1 2 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7z M9 8v4 M13 7v5 M17 8v4',
};

const NS = 'http://www.w3.org/2000/svg';
const FILLED = new Set(['play', 'fast', 'faster']);

export function icon(name, cls = '') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon ' + cls);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', ICONS[name] || ICONS.info);
  if (FILLED.has(name)) p.setAttribute('fill', 'currentColor');
  svg.append(p);
  return svg;
}

export const iconHTML = (name, cls = '') =>
  `<svg viewBox="0 0 24 24" class="icon ${cls}" aria-hidden="true"><path d="${ICONS[name] || ICONS.info}"${FILLED.has(name) ? ' fill="currentColor"' : ''}/></svg>`;

// Desenha no canvas, centralizado em (x,y)
const pathCache = new Map();
export function drawIcon(ctx, name, x, y, size, color, lw = 2) {
  let p = pathCache.get(name);
  if (!p) { p = new Path2D(ICONS[name] || ICONS.info); pathCache.set(name, p); }
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(p);
  ctx.restore();
}
