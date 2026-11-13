// Vizinhança gerada: uma grade de quarteirões em volta do terreno, com ruas, calçadas, prédios e praças.
import { W, H } from './config.js';

// Período da grade: terreno (W×H) + calçada + 2 faixas de rua + calçada
export const PX = W + 4;
export const PY = H + 4;

// A cidade é um quadrado (em tiles) centrado no terreno — assim a projeção é um losango perfeito.
export const CITY_R = 45;
const CX = Math.round(W / 2), CY = Math.round(H / 2);
export const CITY = { x0: CX - CITY_R, x1: CX + CITY_R, y0: CY - CITY_R, y1: CY + CITY_R, cx: CX, cy: CY, size: CITY_R * 2 };

const mod = (a, n) => ((a % n) + n) % n;

function axisType(v, P, S) {
  const m = mod(v, P);
  if (m === S + 1 || m === S + 2) return 'street';
  if (m === S || m === S + 3) return 'sidewalk';
  return 'in';
}

const blockOf = (x, y) => [Math.floor((x + 1) / PX), Math.floor((y + 1) / PY)];

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const blockKinds = new Map();
function blockKind(bx, by) {
  const k = bx + ',' + by;
  if (!blockKinds.has(k)) {
    const r = rng((bx + 50) * 131 + (by + 50) * 7919);
    blockKinds.set(k, bx === 0 && by === 0 ? 'home' : r() < 0.14 ? 'park' : 'city');
  }
  return blockKinds.get(k);
}

export function groundType(x, y) {
  const ax = axisType(x, PX, W), ay = axisType(y, PY, H);
  if (ax === 'street' || ay === 'street') return 'street';
  if (ax === 'sidewalk' || ay === 'sidewalk') return 'sidewalk';
  const [bx, by] = blockOf(x, y);
  return blockKind(bx, by) === 'park' ? 'grass' : 'ground';
}

// Faixa tracejada no meio das ruas: devolve 'x', 'y' ou null
export function laneMark(x, y) {
  const ax = axisType(x, PX, W), ay = axisType(y, PY, H);
  if (ay === 'street' && ax !== 'street' && mod(y, PY) === H + 2 && (x & 1)) return 'y';
  if (ax === 'street' && ay !== 'street' && mod(x, PX) === W + 2 && (y & 1)) return 'x';
  return null;
}

const COLORS = ['#f2c230', '#f08aa8', '#a3abbd', '#6fb6e8', '#8fd3c1', '#f5a46b'];

// Divide um comprimento em pedaços (prédios) separados por 1 tile de vão
function split(len, r, min, max) {
  const out = [];
  let p = 0;
  while (p < len) {
    let size = min + Math.floor(r() * (max - min + 1));
    if (len - p - size < min) size = len - p;
    out.push([p, size]);
    p += size + 1;
  }
  return out;
}

export const BUILDINGS = [];
export const TREES = [];

for (let bx = -2; bx <= 2; bx++) {
  for (let by = -2; by <= 2; by++) {
    const kind = blockKind(bx, by);
    if (kind === 'home') continue;
    const ox = bx * PX, oy = by * PY;
    const r = rng((bx + 50) * 997 + (by + 50) * 31);
    if (kind === 'park') {
      for (let i = 0; i < 14; i++) TREES.push({ x: ox + 1 + Math.floor(r() * (W - 2)), y: oy + 1 + Math.floor(r() * (H - 2)) });
      continue;
    }
    // prédios na frente do terreno (na tela, abaixo dele) são baixos para não taparem a casa
    const front = bx >= 1 && by >= 1;
    const side = bx >= 1 || by >= 1;
    const [hMin, hMax] = front ? [30, 60] : side ? [50, 130] : [70, 200];
    for (const [px, pw] of split(W, r, 4, 7)) {
      for (const [py, pd] of split(H, r, 4, 6)) {
        if (r() < 0.12) {
          TREES.push({ x: ox + px + Math.floor(pw / 2), y: oy + py + Math.floor(pd / 2) });
          continue;
        }
        const h = Math.round((hMin + r() * (hMax - hMin)) / 10) * 10;
        BUILDINGS.push({ x: ox + px, y: oy + py, w: pw, d: pd, h, c: COLORS[Math.floor(r() * COLORS.length)] });
      }
    }
  }
}

// Faixa de pedestre: trecho de rua no prolongamento de uma calçada (esquinas)
export function crosswalk(x, y) {
  const ax = axisType(x, PX, W), ay = axisType(y, PY, H);
  if (ax === 'street' && ay === 'sidewalk') return 'x'; // atravessa andando ao longo de x
  if (ay === 'street' && ax === 'sidewalk') return 'y';
  return null;
}

// Tiles de praça (gramado dos quarteirões-parque)
export const PARK_TILES = [];
for (let y = CITY.y0; y < CITY.y1; y++) {
  for (let x = CITY.x0; x < CITY.x1; x++) {
    if (groundType(x, y) === 'grass') PARK_TILES.push([x, y]);
  }
}
