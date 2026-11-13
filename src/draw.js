// Primitivas isométricas e desenho de objetos/personagens (tudo procedural, sem imagens).
import { hpFrac } from './siege.js';
import { drawSleeperHead, drawSitterBack } from './people.js';
export const TW = 64, TH = 32, HW = 32, HH = 16;

export const P = (x, y, z = 0) => [(x - y) * HW, (x + y) * HH - z];
export function screenToWorld(sx, sy) {
  const a = sx / HW, b = sy / HH;
  return [(a + b) / 2, (b - a) / 2];
}

// ---------- Escurecimento por luz ----------
// tint 0 = cor normal · 1 = totalmente no escuro. Cada objeto é desenhado com o tint da luz que recebe.
let tint = 0;
const NIGHT = [8, 11, 24];
const tintCache = new Map();
export const setTint = (v) => { tint = Math.max(0, Math.min(1, Math.round(v * 40) / 40)); };
export const getTint = () => tint;

function parseColor(c) {
  if (c[0] === '#') {
    const n = parseInt(c.slice(1, 7), 16);
    return [n >> 16, (n >> 8) & 255, n & 255, 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((v) => parseFloat(v));
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}

export function col(c) {
  if (!tint || typeof c !== 'string') return c;
  const key = c + '|' + tint;
  let v = tintCache.get(key);
  if (v) return v;
  const p = parseColor(c);
  if (!p) return c;
  const k = 1 - tint;
  // a luz some, e o que sobra puxa para um azul-escuro
  const r = p[0] * k + NIGHT[0] * tint, g = p[1] * k + NIGHT[1] * tint, b = p[2] * k + NIGHT[2] * tint;
  v = p[3] < 1 ? `rgba(${r | 0},${g | 0},${b | 0},${p[3]})` : `rgb(${r | 0},${g | 0},${b | 0})`;
  if (tintCache.size > 20000) tintCache.clear();
  tintCache.set(key, v);
  return v;
}

const shadeCache = new Map();
export function shade(hex, f) {
  const key = hex + f;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f >= 1) { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  else { r *= f; g *= f; b *= f; }
  v = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, v);
  return v;
}

export function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = col(fill); ctx.fill(); }
  if (stroke) { ctx.strokeStyle = col(stroke); ctx.lineWidth = lw; ctx.stroke(); }
}

export function box(ctx, x, y, z, w, d, h, c, o = {}) {
  const left = o.left || c, right = o.right || shade(c, 0.82), top = o.top || shade(c, 1.14);
  poly(ctx, [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left);
  poly(ctx, [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right);
  poly(ctx, [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top);
}

// silhueta (hexágono) de uma caixa — usada para cliques
export const boxHull = (x, y, z, w, d, h) => [
  P(x, y + d, z), P(x + w, y + d, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h), P(x, y + d, z + h),
];

// quadriláteros em faces verticais
export const faceY = (x0, x1, y, z0, z1) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
export const faceX = (x, y0, y1, z0, z1) => [P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)];
export const topQ = (x0, y0, x1, y1, z) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];

export function tile(ctx, x, y, fill) {
  poly(ctx, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], fill);
}

export function circle(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = col(fill);
  ctx.fill();
}

export function ellipse(ctx, cx, cy, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = col(fill);
  ctx.fill();
}

export function cylinder(ctx, cx, cy, z, r, h, c) {
  const [sx, sy] = P(cx, cy, z);
  const g = ctx.createLinearGradient(sx - r, 0, sx + r, 0);
  g.addColorStop(0, col(shade(c, 1.1)));
  g.addColorStop(0.5, col(c));
  g.addColorStop(1, col(shade(c, 0.7)));
  ctx.beginPath();
  ctx.ellipse(sx, sy, r, r / 2, 0, 0, Math.PI);
  ctx.lineTo(sx - r, sy - h);
  ctx.ellipse(sx, sy - h, r, r / 2, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ellipse(ctx, sx, sy - h, r, r / 2, shade(c, 1.2));
}

// ---------- Paredes ----------
const WALL = '#f4f5f9';
const WALL_T = 0.14;
export const WALL_TALL = 74, WALL_LOW = 12;

export function wallBox(d, x, y) {
  const t = WALL_T;
  return d === 'n' ? [x - t / 2, y - t / 2, 1 + t, t] : [x - t / 2, y - t / 2, t, 1 + t];
}

export function drawWall(ctx, d, x, y, w, tall, opts = {}) {
  const [bx, by, bw, bd] = wallBox(d, x, y);
  const H = tall ? WALL_TALL : WALL_LOW;
  const type = w.pending && opts.preview ? w.pending : w.type;
  const col = opts.color || WALL;
  const wallOpts = { top: opts.top || (tall ? '#c9ceda' : '#dfe3eb'), right: shade(col, 0.84), left: shade(col, 0.95) };
  // quad numa face visível ao longo da parede, de a até b (0..1), alturas z0..z1
  const q = (a, b, z0, z1) => (d === 'n' ? faceY(x + a, x + b, by + bd, z0, z1) : faceX(bx + bw, y + a, y + b, z0, z1));

  if (type === 'fence') {
    drawFence(ctx, d, x, y, w);
    return;
  }
  if (type === 'door') {
    if (tall) {
      if (d === 'n') {
        box(ctx, bx, by, 0, 0.2, bd, H, col, wallOpts);
        box(ctx, x + 0.8, by, 0, 0.2 + WALL_T / 2, bd, H, col, wallOpts);
        box(ctx, bx, by, 58, bw, bd, H - 58, col, wallOpts);
      } else {
        box(ctx, bx, by, 0, bw, 0.2, H, col, wallOpts);
        box(ctx, bx, y + 0.8, 0, bw, 0.2 + WALL_T / 2, H, col, wallOpts);
        box(ctx, bx, by, 58, bw, bd, H - 58, col, wallOpts);
      }
      if (w.broken) {
        poly(ctx, q(0.2, 0.8, 0, 58), '#2a2622');
        poly(ctx, q(0.22, 0.42, 0, 9), '#9b7650');
        poly(ctx, q(0.55, 0.76, 0, 5), '#8a6446');
      } else {
        poly(ctx, q(0.2, 0.8, 0, 58), w.sealed ? '#9b7650' : '#b98757');
        poly(ctx, q(0.66, 0.72, 26, 30), '#e8c35a');
      }
    } else {
      box(ctx, bx, by, 0, bw, bd, 3, w.broken ? '#4a3f36' : '#b98757');
    }
  } else {
    box(ctx, bx, by, 0, bw, bd, H, col, wallOpts);
    if (type === 'window') {
      if (tall) {
        poly(ctx, q(0.18, 0.82, 24, 58), w.broken ? '#e7e9ee' : '#ffffff');
        poly(ctx, q(0.23, 0.77, 28, 54), w.broken ? '#1d2026' : '#8fc8f0');
        if (w.broken) {
          poly(ctx, [q(0.23, 0.36, 28, 54)[0], q(0.23, 0.36, 28, 54)[1], q(0.23, 0.3, 28, 44)[2]], '#b9dcf3');
          poly(ctx, [q(0.6, 0.77, 28, 54)[3], q(0.6, 0.77, 28, 54)[2], q(0.7, 0.77, 40, 54)[0]], '#b9dcf3');
        } else poly(ctx, q(0.48, 0.52, 28, 54), '#ffffff');
      } else {
        const z = H + 0.5;
        const pts = d === 'n' ? topQ(x + 0.15, by, x + 0.85, by + bd, z) : topQ(bx, y + 0.15, bx + bw, y + 0.85, z);
        poly(ctx, pts, w.broken ? '#1d2026' : '#8fc8f0');
      }
    } else if (type === 'vent') {
      if (tall) {
        poly(ctx, q(0.3, 0.7, 38, 58), '#5b5048');
        for (let i = 0; i < 4; i++) poly(ctx, q(0.3, 0.7, 41 + i * 4.5, 42.5 + i * 4.5), '#a89a8c');
      } else {
        const pts = d === 'n' ? topQ(x + 0.3, by, x + 0.7, by + bd, H + 0.5) : topQ(bx, y + 0.3, bx + bw, y + 0.7, H + 0.5);
        poly(ctx, pts, '#5b5048');
      }
    }
  }
  // cortinas nas janelas e decoração nas paredes (só nas paredes altas)
  if (tall && type === 'window' && w.curtain && !w.broken) {
    const c = w.curtain;
    poly(ctx, q(0.1, 0.9, 61, 62.5), '#8a6446');
    poly(ctx, q(0.1, 0.26, 20, 61), c);
    poly(ctx, q(0.74, 0.9, 20, 61), c);
    poly(ctx, q(0.17, 0.19, 20, 61), shade(c, 0.85));
    poly(ctx, q(0.81, 0.83, 20, 61), shade(c, 0.85));
  }
  if (tall && type === 'wall' && w.decor) drawDecor(ctx, d, x, y, w.decor, q);
  const opening = type === 'window' || type === 'door' || type === 'vent';
  // reforços: tábuas pregadas e chapas de metal
  if (opening && !w.broken && w.rf && tall) {
    const [z0, z1] = type === 'door' ? [4, 56] : [22, 60];
    if (w.rf >= 2) {
      poly(ctx, q(0.16, 0.84, z0, z1), '#8e96a3');
      poly(ctx, q(0.16, 0.84, z1 - 3, z1), '#a9b0bb');
      for (const [a, zz] of [[0.22, z0 + 4], [0.78, z0 + 4], [0.22, z1 - 6], [0.78, z1 - 6]]) poly(ctx, q(a - 0.02, a + 0.02, zz, zz + 2), '#5d6573');
    }
    const plank = (a0, z0a, a1, z1a) => {
      const p0 = q(a0, a0, z0a, z0a)[0], p1 = q(a1, a1, z1a, z1a)[0];
      ctx.strokeStyle = col2('#7a5534'); ctx.lineWidth = 7; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke();
      ctx.strokeStyle = col2('#a7774a'); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke();
    };
    plank(0.1, z0 + 8, 0.9, z1 - 10);
    plank(0.1, z1 - 8, 0.9, z0 + 10);
  } else if (opening && !w.broken && w.rf && !tall) {
    const pts = d === 'n' ? topQ(x + 0.1, by - 0.03, x + 0.9, by + bd + 0.03, H + 1) : topQ(bx - 0.03, y + 0.1, bx + bw + 0.03, y + 0.9, H + 1);
    poly(ctx, pts, w.rf >= 2 ? '#8e96a3' : '#a7774a');
  }
  // rachaduras quando está cedendo
  if (opening && !w.broken && tall && w.hp != null && hpFrac(w) < 0.6) {
    const zc = type === 'door' ? 30 : 40;
    const pts = [q(0.35, 0.35, zc + 12, zc + 12)[0], q(0.45, 0.45, zc + 2, zc + 2)[0], q(0.4, 0.4, zc - 4, zc - 4)[0], q(0.55, 0.55, zc - 12, zc - 12)[0]];
    ctx.strokeStyle = 'rgba(40,30,25,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke();
  }
  if (w.sealed && !w.broken && (type === 'window' || type === 'door' || type === 'vent')) {
    const z0 = tall ? (type === 'door' ? 6 : type === 'vent' ? 38 : 26) : 2, z1 = tall ? (type === 'door' ? 54 : 56) : H;
    const a = q(0.22, 0.78, z0, z1);
    ctx.strokeStyle = 'rgba(120,120,120,.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(...a[0]); ctx.lineTo(...a[2]);
    ctx.moveTo(...a[1]); ctx.lineTo(...a[3]);
    ctx.stroke();
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

const col2 = (c) => col(c);

// Quadros, diplomas, fotos, armários de parede…
function drawDecor(ctx, d, x, y, kind, q) {
  switch (kind) {
    case 'picture':
      poly(ctx, q(0.18, 0.82, 30, 58), '#7a5234');
      poly(ctx, q(0.22, 0.78, 33, 55), '#bcd9ec');
      poly(ctx, [q(0.22, 0.22, 33, 33)[0], q(0.45, 0.45, 45, 45)[0], q(0.6, 0.6, 40, 40)[0], q(0.78, 0.78, 47, 47)[0], q(0.78, 0.78, 33, 33)[0]], '#7aa35a');
      poly(ctx, q(0.6, 0.68, 49, 52), '#f5d36a');
      break;
    case 'diploma':
      poly(ctx, q(0.25, 0.75, 34, 54), '#c9a24a');
      poly(ctx, q(0.28, 0.72, 36, 52), '#f6f0de');
      for (let i = 0; i < 4; i++) poly(ctx, q(0.34, 0.66 - (i % 2) * 0.1, 47 - i * 3, 47.6 - i * 3), '#8a7a5a');
      poly(ctx, q(0.58, 0.66, 38, 41), '#c0392b');
      break;
    case 'photos':
      for (const [a, z, c] of [[0.15, 40, '#c9a24a'], [0.42, 46, '#2b2b2b'], [0.66, 38, '#e8e4da']]) {
        poly(ctx, q(a, a + 0.2, z, z + 13), c);
        poly(ctx, q(a + 0.03, a + 0.17, z + 2, z + 11), '#a9b8c8');
        poly(ctx, q(a + 0.08, a + 0.12, z + 4, z + 8), '#d9a77e');
      }
      break;
    case 'board':
      poly(ctx, q(0.08, 0.92, 28, 60), '#7a5234');
      poly(ctx, q(0.11, 0.89, 30, 58), '#2f4a3a');
      ctx.strokeStyle = 'rgba(230,235,225,.75)'; ctx.lineWidth = 0.9;
      for (let i = 0; i < 5; i++) {
        const a = q(0.16, 0.16 + 0.25 + (i * 13 % 30) / 100, 52 - i * 5, 52 - i * 5);
        ctx.beginPath(); ctx.moveTo(...a[0]); ctx.lineTo(...a[1]); ctx.stroke();
      }
      ctx.beginPath(); const c = q(0.7, 0.7, 44, 44)[0]; ctx.arc(c[0], c[1], 4, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'calendar':
      poly(ctx, q(0.35, 0.65, 34, 54), '#f8f6f0');
      poly(ctx, q(0.35, 0.65, 49, 54), '#c0392b');
      for (let i = 0; i < 3; i++) poly(ctx, q(0.39, 0.61, 44 - i * 4, 45 - i * 4), '#9aa0a8');
      break;
    case 'mirror':
      poly(ctx, q(0.25, 0.75, 34, 60), '#c9ced6');
      poly(ctx, q(0.28, 0.72, 36, 58), '#d6e8f2');
      poly(ctx, q(0.34, 0.42, 40, 54), 'rgba(255,255,255,.6)');
      break;
    case 'clockWall': {
      const c = q(0.5, 0.5, 50, 50)[0];
      circle(ctx, c[0], c[1], 7.5, '#7a5234'); circle(ctx, c[0], c[1], 6, '#f6f0de');
      ctx.strokeStyle = col('#2b2b2b'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0], c[1] - 4); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + 3, c[1] + 1); ctx.stroke();
      break;
    }
    case 'shelfWall':
      poly(ctx, q(0.1, 0.9, 46, 48), '#8a6446');
      for (const [a, c] of [[0.18, '#e57373'], [0.36, '#ffd54f'], [0.55, '#81c784'], [0.72, '#e3d2b0']]) poly(ctx, q(a, a + 0.12, 48, 56), c);
      break;
    case 'kcab':
      // armário de cozinha suspenso
      if (d === 'n') box(ctx, x + 0.02, y + 0.07, 44, 0.96, 0.32, 24, '#f2ede4', { top: '#e4ddd0' });
      else box(ctx, x + 0.07, y + 0.02, 44, 0.32, 0.96, 24, '#f2ede4', { top: '#e4ddd0' });
      if (d === 'n') { poly(ctx, faceY(x + 0.06, x + 0.48, y + 0.39, 46, 66), '#ebe4d8'); poly(ctx, faceY(x + 0.52, x + 0.94, y + 0.39, 46, 66), '#ebe4d8'); }
      else { poly(ctx, faceX(x + 0.39, y + 0.06, y + 0.48, 46, 66), '#e2dbcf'); poly(ctx, faceX(x + 0.39, y + 0.52, y + 0.94, 46, 66), '#e2dbcf'); }
      break;
  }
}

function drawFence(ctx, d, x, y, w) {
  const C = '#e9dcc4';
  const t = 0.05;
  const lean = w.hp != null && hpFrac(w) < 0.5;
  const post = (a, h) => (d === 'n' ? box(ctx, x + a - t, y - t, 0, t * 2, t * 2, h, C) : box(ctx, x - t, y + a - t, 0, t * 2, t * 2, h, C));
  for (const a of [0.08, 0.36, 0.64, 0.92]) post(a, lean && a > 0.5 ? 14 : 22);
  const rail = (z) => (d === 'n' ? box(ctx, x, y - t / 2, z, 1, t, 3, '#d8c8aa') : box(ctx, x - t / 2, y, z, t, 1, 3, '#d8c8aa'));
  rail(7);
  rail(lean ? 12 : 16);
}

export function wallHull(d, x, y, tall) {
  const [bx, by, bw, bd] = wallBox(d, x, y);
  return boxHull(bx, by, 0, bw, bd, tall ? WALL_TALL : WALL_LOW + 14);
}

// ---------- Objetos ----------
const SHELF_COLORS = ['#e85d75', '#f5a623', '#4a90d9', '#7ed321', '#50c8c6', '#f2c230'];

export const DRAW = {
  fridge(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.12, y + 0.15, 0, 0.76, 0.7, 62, '#eef1f6');
    poly(ctx, faceY(x + 0.12, x + 0.88, y + 0.85, 40, 41.5), '#b9c0cc');
    poly(ctx, faceY(x + 0.74, x + 0.78, y + 0.85, 44, 56), '#9aa3b0');
    poly(ctx, faceY(x + 0.74, x + 0.78, y + 0.85, 18, 34), '#9aa3b0');
  },
  sink(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.05, y + 0.1, 0, 0.9, 0.8, 24, '#f7f8fb', { top: '#dfe4ec' });
    poly(ctx, faceY(x + 0.49, x + 0.51, y + 0.9, 3, 21), '#cfd5df');
    poly(ctx, topQ(x + 0.25, y + 0.28, x + 0.75, y + 0.72, 24.5), '#a7b6c8');
    box(ctx, x + 0.46, y + 0.14, 24, 0.08, 0.08, 12, '#9aa3b0');
    box(ctx, x + 0.46, y + 0.14, 34, 0.08, 0.22, 3, '#9aa3b0');
  },
  stove(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.05, y + 0.1, 0, 0.9, 0.8, 24, '#e9ecf2');
    poly(ctx, faceY(x + 0.2, x + 0.8, y + 0.9, 5, 18), '#3b404c');
    box(ctx, x + 0.08, y + 0.13, 24, 0.84, 0.74, 2, '#2d3038');
    for (const [a, b] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
      const [sx, sy] = P(x + a, y + b, 26.5);
      ellipse(ctx, sx, sy, 6, 3, '#555b66');
    }
  },
  table(ctx, o) {
    const { x, y } = o;
    for (const [a, b] of [[0.15, 0.15], [0.79, 0.15], [0.15, 0.79], [0.79, 0.79]]) box(ctx, x + a, y + b, 0, 0.06, 0.06, 18, '#a8743f');
    box(ctx, x + 0.1, y + 0.1, 18, 0.8, 0.8, 4, '#c8915a');
    const [sx, sy] = P(x + 0.5, y + 0.5, 22);
    ellipse(ctx, sx, sy, 7, 3.5, '#ffffff');
  },
  bed(ctx, o, s, on, occupant) {
    const { x, y } = o;
    box(ctx, x + 0.05, y + 0.02, 0, 0.9, 0.1, 30, '#8a6446');
    box(ctx, x + 0.05, y + 0.1, 0, 0.9, 1.85, 10, '#9b7653');
    box(ctx, x + 0.1, y + 0.12, 10, 0.8, 1.8, 6, '#ffffff');
    box(ctx, x + 0.2, y + 0.18, 16, 0.6, 0.32, 5, '#eef2f8');
    if (occupant === 'sleep') drawSleeperHead(ctx, ...P(x + 0.5, y + 0.36, 23));
    box(ctx, x + 0.08, y + 0.62, 10, 0.84, 1.33, 8, '#5b8fd9');
    if (occupant === 'sleep') {
      // corpo sob o cobertor
      box(ctx, x + 0.2, y + 0.58, 18, 0.6, 1.15, 4, '#6a9be0');
      box(ctx, x + 0.12, y + 0.58, 18, 0.76, 0.12, 2.5, '#ffffff');
    }
  },
  tv(ctx, o, s, on) {
    const { x, y } = o;
    box(ctx, x + 0.08, y + 0.15, 0, 0.84, 0.45, 16, '#7a6352');
    box(ctx, x + 0.12, y + 0.25, 16, 0.76, 0.08, 34, '#22252c');
    poly(ctx, faceY(x + 0.15, x + 0.85, y + 0.33, 19, 47), on ? '#7fd3ff' : '#2d3a55');
  },
  sofa(ctx, o, s, on, occupant) {
    const { x, y } = o;
    box(ctx, x + 0.05, y + 0.15, 0, 0.9, 0.62, 12, '#e86a8f');
    box(ctx, x + 0.12, y + 0.2, 12, 0.76, 0.55, 4, '#f39bb5');
    box(ctx, x + 0.05, y + 0.15, 0, 0.12, 0.62, 19, '#d95b80');
    box(ctx, x + 0.83, y + 0.15, 0, 0.12, 0.62, 19, '#d95b80');
    if (occupant === 'rest') drawSitterBack(ctx, ...P(x + 0.5, y + 0.48, 16), performance.now(), s.needs.energy < 40);
    box(ctx, x + 0.05, y + 0.72, 0, 0.9, 0.2, 28, '#d95b80');
  },
  computer(ctx, o, s, on) {
    const { x, y } = o;
    for (const [a, b] of [[0.12, 0.15], [0.82, 0.15], [0.12, 0.8], [0.82, 0.8]]) box(ctx, x + a, y + b, 0, 0.06, 0.06, 22, '#8a6446');
    box(ctx, x + 0.08, y + 0.1, 22, 0.84, 0.8, 3, '#c8915a');
    box(ctx, x + 0.25, y + 0.22, 25, 0.5, 0.06, 20, '#2a2d34');
    poly(ctx, faceY(x + 0.28, x + 0.72, y + 0.28, 28, 43), on ? '#8fe3b0' : '#3d4a63');
    box(ctx, x + 0.3, y + 0.5, 25, 0.4, 0.18, 1.5, '#d7dbe3');
  },
  shelf(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.1, y + 0.15, 0, 0.8, 0.5, 64, '#8f98aa');
    let ci = o.id;
    for (const z of [6, 21, 36, 51]) {
      poly(ctx, faceY(x + 0.12, x + 0.88, y + 0.65, z - 2, z - 0.5), '#6f7789');
      for (let i = 0; i < 4; i++) {
        const a = 0.15 + i * 0.18;
        poly(ctx, faceY(x + a, x + a + 0.13, y + 0.66, z, z + 10), SHELF_COLORS[ci++ % SHELF_COLORS.length]);
      }
    }
  },
  plant(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.36, y + 0.36, 0, 0.28, 0.28, 13, '#d9774f');
    const [sx, sy] = P(x + 0.5, y + 0.5, 24);
    circle(ctx, sx - 5, sy + 2, 8, '#3f9e5b');
    circle(ctx, sx + 5, sy + 1, 8, '#47ad65');
    circle(ctx, sx, sy - 5, 9, '#5cc27a');
  },
  tree(ctx, o) {
    const { x, y } = o;
    const [sx0, sy0] = P(x + 0.5, y + 0.5);
    ellipse(ctx, sx0, sy0, 22, 11, 'rgba(0,0,0,.12)');
    box(ctx, x + 0.44, y + 0.44, 0, 0.12, 0.12, 32, '#8b5a3c');
    const [sx, sy] = P(x + 0.5, y + 0.5, 52);
    circle(ctx, sx, sy, 22, '#2f8f5b');
    circle(ctx, sx - 6, sy - 6, 15, '#3fa86b');
    circle(ctx, sx - 9, sy - 10, 6, '#5cc285');
  },
  car(ctx, o) {
    const { x, y } = o;
    for (const [a, b] of [[0.15, 0.4], [0.85, 0.4], [0.15, 1.6], [0.85, 1.6]]) {
      const [sx, sy] = P(x + a, y + b, 5);
      ellipse(ctx, sx, sy, 6, 6, '#2b2e36');
    }
    box(ctx, x + 0.1, y + 0.1, 5, 0.8, 1.8, 14, '#ec4d8a');
    box(ctx, x + 0.15, y + 0.6, 19, 0.7, 0.85, 13, '#f5f7fb');
    poly(ctx, faceY(x + 0.2, x + 0.8, y + 1.45, 21, 30), '#5d86c9');
    poly(ctx, faceX(x + 0.85, y + 0.68, y + 1.37, 21, 30), '#4d74b3');
    poly(ctx, faceY(x + 0.15, x + 0.3, y + 1.9, 12, 16), '#fff3b0');
    poly(ctx, faceY(x + 0.7, x + 0.85, y + 1.9, 12, 16), '#fff3b0');
  },
  planter(ctx, o) {
    const { x, y } = o;
    const d = o.data || {};
    box(ctx, x + 0.08, y + 0.08, 0, 0.84, 0.84, 14, '#b07a4a');
    poly(ctx, topQ(x + 0.14, y + 0.14, x + 0.86, y + 0.86, 14.5), d.watered ? '#3d2717' : '#6e4a2e');
    if (d.stage === 'growing' || d.stage === 'ripe') {
      const g = d.stage === 'ripe' ? 3 : d.growth;
      for (const [a, b] of [[0.32, 0.32], [0.68, 0.32], [0.32, 0.68], [0.68, 0.68]]) {
        const [sx, sy] = P(x + a, y + b, 15);
        const r = 3 + g * 3;
        circle(ctx, sx, sy - r * 0.6, r, g >= 2 ? '#3f9e5b' : '#6cc24a');
        if (d.stage === 'ripe') {
          circle(ctx, sx - 3, sy - r, 2.6, '#e53935');
          circle(ctx, sx + 3, sy - r * 0.5, 2.6, '#e53935');
        }
      }
    }
  },
  cistern(ctx, o) {
    const { x, y } = o;
    cylinder(ctx, x + 0.5, y + 0.5, 0, 24, 46, '#4a90d9');
    const [sx, sy] = P(x + 0.5, y + 0.5, 46);
    ellipse(ctx, sx, sy, 10, 5, '#2f6db0');
    box(ctx, x + 0.05, y + 0.45, 6, 0.2, 0.1, 4, '#9aa3b0');
  },
  solar(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.2, y + 0.25, 0, 0.06, 0.06, 30, '#9aa3b0');
    box(ctx, x + 0.74, y + 0.25, 0, 0.06, 0.06, 30, '#9aa3b0');
    box(ctx, x + 0.2, y + 0.75, 0, 0.06, 0.06, 12, '#9aa3b0');
    box(ctx, x + 0.74, y + 0.75, 0, 0.06, 0.06, 12, '#9aa3b0');
    const c = [P(x + 0.08, y + 0.12, 32), P(x + 0.92, y + 0.12, 32), P(x + 0.92, y + 0.9, 12), P(x + 0.08, y + 0.9, 12)];
    poly(ctx, c, '#1f3b73', '#c9d3e6', 1.5);
    ctx.strokeStyle = 'rgba(140,170,230,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const a = P(x + 0.08 + i * 0.21, y + 0.12, 32), b = P(x + 0.08 + i * 0.21, y + 0.9, 12);
      ctx.moveTo(...a); ctx.lineTo(...b);
    }
    const m1 = P(x + 0.08, y + 0.51, 22), m2 = P(x + 0.92, y + 0.51, 22);
    ctx.moveTo(...m1); ctx.lineTo(...m2);
    ctx.stroke();
  },
  ladder(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.12, y + 0.12, WALL_TALL - 0.5, 0.76, 0.76, 1, '#3a2c20');
    for (const a of [0.28, 0.66]) box(ctx, x + a, y + 0.42, 0, 0.06, 0.06, WALL_TALL, '#a7774a');
    for (let z = 8; z < WALL_TALL; z += 11) box(ctx, x + 0.28, y + 0.43, z, 0.44, 0.04, 2.5, '#c08d5b');
  },
  atticHatch(ctx, o) {
    const { x, y } = o;
    poly(ctx, topQ(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.5), '#8a6446');
    poly(ctx, topQ(x + 0.16, y + 0.16, x + 0.84, y + 0.84, 0.8), '#20180f');
    for (const a of [0.28, 0.66]) box(ctx, x + a, y + 0.42, 0, 0.06, 0.06, 8, '#a7774a');
    box(ctx, x + 0.28, y + 0.43, 6, 0.44, 0.04, 2, '#c08d5b');
  },
  bunkerHatch(ctx, o, s) {
    const { x, y } = o;
    box(ctx, x + 0.1, y + 0.1, 0, 0.8, 0.8, 4, '#7d8592');
    poly(ctx, topQ(x + 0.18, y + 0.18, x + 0.82, y + 0.82, 4.5), '#8e96a3');
    const [sx, sy] = P(x + 0.5, y + 0.5, 6);
    ctx.strokeStyle = col('#4c535e'); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 9, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 9, sy); ctx.lineTo(sx + 9, sy); ctx.moveTo(sx, sy - 4.5); ctx.lineTo(sx, sy + 4.5); ctx.stroke();
  },
  bunkerLadder(ctx, o, s) {
    const { x, y } = o;
    const [sx, sy] = P(x + 0.5, y + 0.5, WALL_TALL);
    // luz que desce pelo alçapão
    if (!s.floors.bunker?.hatchSealed) {
      const g = ctx.createLinearGradient(0, sy, 0, sy + 70);
      g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx - 16, sy); ctx.lineTo(sx + 16, sy); ctx.lineTo(sx + 26, sy + 70); ctx.lineTo(sx - 26, sy + 70); ctx.fill();
    }
    for (const a of [0.28, 0.66]) box(ctx, x + a, y + 0.42, 0, 0.06, 0.06, WALL_TALL, '#8e96a3');
    for (let z = 8; z < WALL_TALL; z += 11) box(ctx, x + 0.28, y + 0.43, z, 0.44, 0.04, 2.5, '#b5bcc7');
    box(ctx, x + 0.12, y + 0.12, WALL_TALL - 2, 0.76, 0.76, 2, s.floors.bunker?.hatchSealed ? '#9aa3b0' : '#5d6573');
  },
  lab(ctx, o, s, on, occupant) {
    const { x, y } = o;
    for (const [a, b] of [[0.08, 0.12], [0.86, 0.12], [0.08, 0.82], [0.86, 0.82]]) box(ctx, x + a, y + b, 0, 0.06, 0.06, 24, '#9aa3b0');
    box(ctx, x + 0.05, y + 0.08, 24, 0.9, 0.84, 3, '#eef1f6', { top: '#f7f8fb' });
    box(ctx, x + 0.1, y + 0.6, 4, 0.8, 0.3, 2, '#d5dbe5');
    // microscópio
    box(ctx, x + 0.18, y + 0.2, 27, 0.22, 0.22, 3, '#2d3038');
    box(ctx, x + 0.25, y + 0.24, 30, 0.07, 0.07, 14, '#3b404c');
    box(ctx, x + 0.22, y + 0.22, 42, 0.14, 0.12, 4, '#2d3038');
    // frascos
    const glow = on ? '#7dff9a' : '#7fb8a0';
    for (const [a, b, c] of [[0.6, 0.25, glow], [0.75, 0.3, '#f5a0c0'], [0.66, 0.55, '#9ad0ff']]) {
      const [fx, fy] = P(x + a, y + b, 27);
      ellipse(ctx, fx, fy - 4, 4, 5, c);
      ctx.fillStyle = col('#dfe4ec');
      ctx.fillRect(fx - 1.5, fy - 13, 3, 6);
    }
    if (on) {
      const [gx, gy] = P(x + 0.6, y + 0.25, 30);
      const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, 22);
      g.addColorStop(0, 'rgba(125,255,154,.45)'); g.addColorStop(1, 'rgba(125,255,154,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, Math.PI * 2); ctx.fill();
    }
  },
  tank(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.15, y + 0.15, 0, 0.7, 0.7, 6, '#8a6446');
    cylinder(ctx, x + 0.5, y + 0.5, 6, 22, 34, '#3f7fc7');
    const [sx, sy] = P(x + 0.5, y + 0.5, 40);
    ellipse(ctx, sx, sy, 14, 7, '#2f6db0');
  },
  boxes(ctx, o) {
    const { x, y } = o;
    const C = o.data?.searched ? '#b39066' : '#c9a26b';
    box(ctx, x + 0.08, y + 0.1, 0, 0.5, 0.5, 18, C);
    box(ctx, x + 0.5, y + 0.4, 0, 0.42, 0.45, 14, '#bf9862');
    box(ctx, x + 0.14, y + 0.16, 18, 0.38, 0.38, 14, '#d4ae78');
    poly(ctx, topQ(x + 0.3, y + 0.16, x + 0.36, y + 0.54, 32.2), '#e6d3a8');
  },
  spikes(ctx, o) {
    const { x, y } = o;
    poly(ctx, topQ(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.3), 'rgba(80,60,40,.35)');
    const used = 3 - (o.data?.uses ?? 3);
    for (const [a, b, h] of [[0.25, 0.25, 16], [0.6, 0.22, 14], [0.42, 0.5, 18], [0.75, 0.55, 15], [0.28, 0.72, 14], [0.62, 0.78, 17]]) {
      box(ctx, x + a, y + b, 0, 0.06, 0.06, h, '#8b5a3c');
      const [tx, ty] = P(x + a + 0.03, y + b + 0.03, h);
      ctx.fillStyle = col(used ? '#7a2a22' : '#d9c3a0');
      ctx.beginPath(); ctx.moveTo(tx - 2.5, ty + 1); ctx.lineTo(tx, ty - 5); ctx.lineTo(tx + 2.5, ty + 1); ctx.fill();
    }
  },
  filter(ctx, o, s, on) {
    const { x, y } = o;
    box(ctx, x + 0.2, y + 0.2, 0, 0.6, 0.6, 42, '#d5dbe5');
    const [sx, sy] = P(x + 0.5, y + 0.8, 24);
    circle(ctx, sx, sy, 9, '#8a93a6');
    circle(ctx, sx, sy, 3, '#5d6576');
    const [lx, ly] = P(x + 0.7, y + 0.8, 38);
    circle(ctx, lx, ly, 2.5, on ? '#3ddc84' : '#e53935');
  },
};

// ---------- Personagens (people.js) ----------
export { drawPerson, PLAYER_LOOK, drawSleeperHead, drawSitterBack } from './people.js';
