// Prédios da cidade: residenciais com variações e estabelecimentos com identidade própria
// (fachada, vitrine, toldo, letreiro e detalhes de cada tipo).
import { P, box, poly, faceY, faceX, cylinder, ellipse, circle, shade, setTint, col } from './draw.js';

const hash = (a, b, c = 0) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453) % 1;

// ---------- Fachada da frente (a face da porta) ----------
function front(b) {
  const fy = !b.door || b.door.face === 'y';
  const len = fy ? b.w : b.d;
  const pt = (a, off, z) => (fy ? P(b.x + a, b.y + b.d + off, z) : P(b.x + b.w + off, b.y + a, z));
  const quad = (a0, a1, z0, z1, off = 0.01) => [pt(a0, off, z0), pt(a1, off, z0), pt(a1, off, z1), pt(a0, off, z1)];
  // caixa encostada na frente: a ao longo da fachada, off para fora
  const boxOut = (ctx, a, off, la, lo, z, h, c) =>
    fy ? box(ctx, b.x + a, b.y + b.d + off, z, la, lo, h, c) : box(ctx, b.x + b.w + off, b.y + a, z, lo, la, h, c);
  const doorA = b.door ? b.door.at + 0.5 : len / 2;
  return { fy, len, pt, quad, boxOut, doorA };
}

// texto "pintado" na fachada, acompanhando a inclinação
function faceText(ctx, fr, a, z, text, size, color, glow) {
  const [sx, sy] = fr.pt(a, 0.03, z);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.transform(1, fr.fy ? 0.5 : -0.5, 0, 1, 0, 0);
  ctx.font = `700 ${size}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 10; }
  ctx.fillStyle = col(color);
  ctx.fillText(text, 0, 0.5);
  ctx.restore();
}

// toldo inclinado (liso ou listrado)
function awning(ctx, fr, a0, a1, colors, z = 20, depth = 0.38) {
  const n = Math.max(1, Math.round((a1 - a0) / 0.22));
  const step = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const s0 = a0 + i * step, s1 = s0 + step;
    const c = colors[i % colors.length];
    poly(ctx, [fr.pt(s0, 0, z), fr.pt(s1, 0, z), fr.pt(s1, depth, z - 6), fr.pt(s0, depth, z - 6)], c);
    poly(ctx, [fr.pt(s0, depth, z - 6), fr.pt(s1, depth, z - 6), fr.pt(s1, depth, z - 9), fr.pt(s0, depth, z - 9)], c);
  }
}

// vitrine de vidro com montantes
function storefront(ctx, fr, glass, frame, a0 = 0.2, a1 = fr.len - 0.2, z0 = 2, z1 = 16) {
  poly(ctx, fr.quad(a0, a1, z0, z1), glass);
  for (let a = a0; a <= a1 + 0.001; a += Math.max(0.6, (a1 - a0) / Math.round((a1 - a0) / 0.8))) {
    poly(ctx, fr.quad(a - 0.03, a + 0.03, z0, z1, 0.015), frame);
  }
  poly(ctx, fr.quad(a0, a1, z1, z1 + 1.2, 0.015), frame);
}

function door(ctx, fr, color, w = 0.6, h = 14) {
  poly(ctx, fr.quad(fr.doorA - w / 2, fr.doorA + w / 2, 0, h, 0.02), color);
}

function sign(ctx, fr, text, bg, fg, { z0 = 21, z1 = 34, size = 12, glow = null, lit = false, a0 = 0.15, a1 = fr.len - 0.15 } = {}) {
  poly(ctx, fr.quad(a0, a1, z0, z1, 0.02), bg);
  if (lit) setTint(0);
  faceText(ctx, fr, (a0 + a1) / 2, (z0 + z1) / 2, text, size, fg, lit ? glow : null);
}

function glowAt(ctx, fr, a, z, rgb, r, alpha) {
  const [sx, sy] = fr.pt(a, 0.1, z);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- Estilos dos estabelecimentos ----------
const STYLES = {
  farmacia: {
    wall: '#eef2ef', win: '#6f9c88', winLit: '#e9fff4', firstRow: 50,
    draw(ctx, b, fr, N, lit) {
      poly(ctx, fr.quad(0, fr.len, 0, 1.5), '#1f9d55');
      storefront(ctx, fr, lit ? '#e6fff2' : '#bfe3d2', '#ffffff');
      door(ctx, fr, lit ? '#d8f7e8' : '#8fc5ad');
      awning(ctx, fr, 0.1, fr.len - 0.1, ['#1f9d55']);
      sign(ctx, fr, 'FARMÁCIA', '#1f9d55', '#ffffff', { a0: 0.9, lit, glow: 'rgba(80,255,160,.9)' });
      // cruz verde
      const a = 0.45;
      if (lit) setTint(0);
      poly(ctx, fr.quad(a - 0.09, a + 0.09, 22, 44, 0.03), '#22c55e');
      poly(ctx, fr.quad(a - 0.3, a + 0.3, 29, 37, 0.03), '#22c55e');
      setTint(N);
      if (lit) glowAt(ctx, fr, a, 33, '60,230,130', 40, 0.5);
    },
  },
  padaria: {
    wall: '#f1e2c4', win: '#8a6a4a', winLit: '#ffd9a0', firstRow: 50,
    draw(ctx, b, fr, N, lit) {
      poly(ctx, fr.quad(0, fr.len, 0, 2), '#6b3e1f');
      if (lit) setTint(0);
      storefront(ctx, fr, lit ? '#ffd9a0' : '#e7c79a', '#6b3e1f');
      setTint(N);
      door(ctx, fr, '#6b3e1f');
      awning(ctx, fr, 0.1, fr.len - 0.1, ['#c8742e', '#fff4e0']);
      sign(ctx, fr, 'PADARIA', '#6b3e1f', '#ffe9c2', { lit, glow: 'rgba(255,200,120,.9)' });
      setTint(N);
      if (lit) glowAt(ctx, fr, fr.len / 2, 10, '255,190,110', 70, 0.25);
    },
  },
  mercado: {
    wall: '#f4f4f2', win: '#6c7f94', winLit: '#fff6d8', firstRow: 54,
    draw(ctx, b, fr, N, lit) {
      if (lit) setTint(0);
      storefront(ctx, fr, lit ? '#fff6d8' : '#cfdbe6', '#d62828', 0.15, fr.len - 0.15, 2, 20);
      setTint(N);
      door(ctx, fr, lit ? '#fff1c2' : '#a9bccd', 1, 18);
      poly(ctx, fr.quad(0, fr.len, 22, 38, 0.02), '#d62828');
      if (lit) setTint(0);
      faceText(ctx, fr, fr.len / 2, 30, 'SUPERMERCADO', 13, '#ffd23f', lit ? 'rgba(255,210,63,.9)' : null);
      setTint(N);
      // carrinhos na calçada
      for (const a of [0.25, 0.6]) fr.boxOut(ctx, a, 0.15, 0.28, 0.22, 3, 6, '#9aa3b0');
      if (lit) glowAt(ctx, fr, fr.len / 2, 10, '255,240,200', 90, 0.22);
    },
  },
  escritorio: {
    wall: '#8ea3b8', win: '#2c4660', winLit: '#cfe6ff', firstRow: 30, band: true,
    draw(ctx, b, fr, N, lit) {
      if (lit) setTint(0);
      storefront(ctx, fr, lit ? '#d9ecff' : '#3d5a78', '#c9d3df', 0.3, fr.len - 0.3, 0, 22);
      setTint(N);
      sign(ctx, fr, 'CENTRO EMPRESARIAL', '#1d2a3a', '#dfe7f1', { z0: 22.5, z1: 29, size: 8, a0: fr.len / 2 - 1.3, a1: fr.len / 2 + 1.3 });
      setTint(N);
    },
  },
  escola: {
    wall: '#d0603f', win: '#3f6fb0', winLit: '#ffe9b0', firstRow: 50,
    draw(ctx, b, fr, N, lit) {
      for (let z = 46; z < b.h - 6; z += 28) poly(ctx, fr.quad(0, fr.len, z, z + 2.5), '#f3efe6');
      poly(ctx, fr.quad(0, fr.len, 0, 3), '#f3efe6');
      storefront(ctx, fr, '#9cc0e0', '#f3efe6', fr.doorA - 1.2, fr.doorA + 1.2, 2, 18);
      door(ctx, fr, '#2f5c8f', 0.8, 16);
      sign(ctx, fr, 'ESCOLA MUNICIPAL', '#f2c230', '#3a2a10', { z0: 24, z1: 36, size: 11 });
      // mastro com bandeira no telhado
      const [x, y] = fr.fy ? [b.x + 0.3, b.y + b.d - 0.3] : [b.x + b.w - 0.3, b.y + 0.3];
      box(ctx, x, y, b.h, 0.05, 0.05, 34, '#c9ccd2');
      const [fx, fy] = P(x, y, b.h + 34);
      poly(ctx, [[fx, fy], [fx + 18, fy + 2], [fx + 17, fy + 12], [fx, fy + 10]], '#2f6fb0');
      poly(ctx, [[fx, fy + 4], [fx + 17.5, fy + 6.5], [fx + 17.3, fy + 8.5], [fx, fy + 6]], '#f3efe6');
    },
  },
  academia: {
    wall: '#2b2e36', win: '#1e2a3a', winLit: '#cfe8ff', firstRow: 50,
    draw(ctx, b, fr, N, lit) {
      if (lit) setTint(0);
      storefront(ctx, fr, lit ? '#d7ecff' : '#4a5a70', '#111317', 0.15, fr.len - 0.15, 2, 20);
      setTint(N);
      poly(ctx, fr.quad(0, fr.len, 21, 23, 0.02), '#b04fe0');
      poly(ctx, fr.quad(0.15, fr.len - 0.15, 25, 39, 0.02), '#1a1b20');
      if (lit) setTint(0);
      faceText(ctx, fr, fr.len / 2, 32, 'ACADEMIA', 13, lit ? '#e9b6ff' : '#b04fe0', lit ? 'rgba(190,80,255,1)' : null);
      setTint(N);
      if (lit) glowAt(ctx, fr, fr.len / 2, 32, '170,70,255', 60, 0.35);
    },
  },
  igreja: {
    wall: '#efe6d2', win: '#7aa0c8', winLit: '#ffd38a', firstRow: 999,
    draw(ctx, b, fr, N, lit) {
      // vitrais altos
      for (let a = 0.6; a < fr.len - 0.4; a += 1.2) {
        if (Math.abs(a - fr.doorA) < 0.7) continue;
        poly(ctx, fr.quad(a - 0.15, a + 0.15, 18, Math.min(b.h - 12, 60)), lit ? '#ffd38a' : '#5a7fb0');
        poly(ctx, fr.quad(a - 0.15, a + 0.15, 38, 39.5), '#efe6d2');
      }
      door(ctx, fr, '#6b4423', 0.8, 22);
      const [ax, ay] = fr.pt(fr.doorA, 0.03, 22);
      ellipse(ctx, ax, ay, 10, 6, col('#6b4423'));
      // torre com sino e cruz
      const tw = 1.4;
      const tx = fr.fy ? b.x + 0.2 : b.x + b.w - tw - 0.2, ty = fr.fy ? b.y + b.d - tw - 0.2 : b.y + 0.2;
      box(ctx, tx, ty, b.h, tw, tw, 38, '#efe6d2');
      poly(ctx, faceY(tx + 0.45, tx + 0.95, ty + tw, b.h + 18, b.h + 32), '#3b3f4a');
      poly(ctx, faceX(tx + tw, ty + 0.45, ty + 0.95, b.h + 18, b.h + 32), '#3b3f4a');
      const top = b.h + 38, peak = P(tx + tw / 2, ty + tw / 2, top + 26);
      poly(ctx, [P(tx, ty + tw, top), P(tx + tw, ty + tw, top), peak], '#8a5a44');
      poly(ctx, [P(tx + tw, ty, top), P(tx + tw, ty + tw, top), peak], '#6e4636');
      ctx.strokeStyle = col('#d8c27a');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(peak[0], peak[1]); ctx.lineTo(peak[0], peak[1] - 16);
      ctx.moveTo(peak[0] - 6, peak[1] - 11); ctx.lineTo(peak[0] + 6, peak[1] - 11);
      ctx.stroke();
    },
  },
  bar: {
    wall: '#4a2f24', win: '#2a1c16', winLit: '#ffb86b', firstRow: 50,
    draw(ctx, b, fr, N, lit) {
      if (lit) setTint(0);
      storefront(ctx, fr, lit ? '#ffb86b' : '#6b4a36', '#2a1810');
      setTint(N);
      door(ctx, fr, '#2a1810');
      awning(ctx, fr, 0.1, fr.len - 0.1, ['#b03a2e', '#f3e6d6']);
      poly(ctx, fr.quad(0.2, fr.len - 0.2, 24, 38, 0.02), '#1f1410');
      if (lit) setTint(0);
      faceText(ctx, fr, fr.len / 2, 31, 'BAR DO ZÉ', 13, lit ? '#ff6b5a' : '#b03a2e', lit ? 'rgba(255,60,40,1)' : null);
      setTint(N);
      if (lit) glowAt(ctx, fr, fr.len / 2, 31, '255,70,40', 60, 0.35);
      // mesinha e banquinhos na calçada
      for (const a of [0.6, fr.len - 0.9]) {
        if (Math.abs(a - fr.doorA) < 0.5) continue;
        fr.boxOut(ctx, a - 0.25, 0.45, 0.06, 0.06, 0, 9, '#3a2a20');
        fr.boxOut(ctx, a - 0.42, 0.28, 0.4, 0.4, 9, 1.5, '#d9d2c4');
        fr.boxOut(ctx, a + 0.2, 0.5, 0.16, 0.16, 0, 5, '#b03a2e');
      }
    },
  },
};

// ---------- Desenho principal ----------
export function drawBuilding(ctx, b, N, litFrac, shopsLit) {
  const S = b.role && STYLES[b.role];
  const wall = S ? S.wall : b.c;
  const fr = front(b);
  setTint(N);
  if (!S) { drawHouse(ctx, b, N, litFrac); return; }
  box(ctx, b.x, b.y, 0, b.w, b.d, b.h, wall);

  // janelas dos andares
  const win = S ? S.win : '#3f6fb0';
  const winLit = S ? S.winLit : '#f2cd72';
  const z0 = S ? S.firstRow : 22;
  const W_ = (pts, h) => {
    if (litFrac > 0 && h < litFrac) { setTint(0); poly(ctx, pts, winLit); setTint(N); } else poly(ctx, pts, win);
  };
  if (S && S.band) {
    // fachada de vidro: faixas contínuas por andar
    for (let z = z0; z < b.h - 10; z += 24) {
      W_(faceY(b.x + 0.05, b.x + b.w - 0.05, b.y + b.d, z, z + 16), hash(b.x, b.y, z));
      W_(faceX(b.x + b.w, b.y + 0.05, b.y + b.d - 0.05, z, z + 16), hash(b.x, b.y, z + 1));
      poly(ctx, faceY(b.x + 0.05, b.x + b.w - 0.05, b.y + b.d, z + 7.5, z + 8.5), '#9fb3c6');
    }
  } else {
    for (let z = z0; z < b.h - 14; z += 28) {
      for (let i = 0; i < b.w; i++) W_(faceY(b.x + i + 0.25, b.x + i + 0.75, b.y + b.d, z, z + 14), hash(b.x + i, b.y, z));
      for (let i = 0; i < b.d; i++) W_(faceX(b.x + b.w, b.y + i + 0.25, b.y + i + 0.75, z, z + 14), hash(b.x, b.y + i, z + 1));
    }
  }

  // telhado
  box(ctx, b.x + 0.15, b.y + 0.15, b.h, b.w - 0.3, b.d - 0.3, 3, wall, { top: S ? '#e9e9e4' : '#ffffff' });

  if (S) {
    S.draw(ctx, b, fr, N, shopsLit);
    setTint(N);
    return;
  }

  drawHouse(ctx, b, N, litFrac);
}

// ---------- Casas (condomínio) ----------
const HOUSE_WALLS = ['#f4d6a0', '#cfe3c8', '#f2c6c2', '#c9dcef', '#ece4d2', '#d8c8e8', '#f7e3b5', '#bfe0dc', '#f0d0b4', '#d6e6b8'];
const HOUSE_ROOFS = ['#a14a3b', '#6b4f3a', '#44566a', '#8c3b2e', '#5a6b4a', '#7a4a5a', '#b5643c'];
const HOUSE_DOORS = ['#6b4423', '#2f5c8f', '#8c2f2f', '#2e6b4f', '#3a3a3a', '#a07a2a'];

// estilo fixo de cada casa (mesma casa, mesmas cores, sempre)
export function houseStyle(b) {
  if (b.house) return b.house;
  const h = (k) => hash(b.x, b.y, k);
  const floors = h(1) < 0.45 ? 2 : 1;
  b.house = {
    wall: HOUSE_WALLS[Math.floor(h(2) * HOUSE_WALLS.length)],
    roof: HOUSE_ROOFS[Math.floor(h(3) * HOUSE_ROOFS.length)],
    door: HOUSE_DOORS[Math.floor(h(4) * HOUSE_DOORS.length)],
    trim: h(5) < 0.5 ? '#ffffff' : '#f3ead8',
    floors,
    bush: h(6) < 0.7,
    car: h(7) < 0.35,
    garage: h(8) < 0.4,
  };
  b.h = floors * 24 + 26;
  return b.house;
}

function drawHouse(ctx, b, N, litFrac) {
  const st = houseStyle(b);
  const fy = !b.door || b.door.face === 'y';
  const lenA = fy ? b.w : b.d; // ao longo da frente
  const lenD = fy ? b.d : b.w; // profundidade (fundo → frente)
  // (a, dep) → mundo. dep = 0 no fundo, lenD na frente
  const W = (a, dep) => (fy ? [b.x + a, b.y + dep] : [b.x + dep, b.y + a]);
  const boxAD = (a0, d0, la, ld, z, hh, c, o) => {
    const [x, y] = W(a0, d0);
    if (fy) box(ctx, x, y, z, la, ld, hh, c, o); else box(ctx, x, y, z, ld, la, hh, c, o);
  };
  const quadFront = (a0, a1, dep, z0, z1) => {
    const p = (a, z) => P(...W(a, dep), z);
    return [p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1)];
  };
  const quadSide = (aEnd, d0, d1, z0, z1) => {
    const p = (d, z) => P(...W(aEnd, d), z);
    return [p(d0, z0), p(d1, z0), p(d1, z1), p(d0, z1)];
  };

  // terreno: gramado e cerca dos fundos
  poly(ctx, [P(b.x, b.y), P(b.x + b.w, b.y), P(b.x + b.w, b.y + b.d), P(b.x, b.y + b.d)], '#9cc97a');
  const fence = '#f4f4f0';
  if (fy) { box(ctx, b.x, b.y, 0, b.w, 0.05, 7, fence); box(ctx, b.x, b.y, 0, 0.05, b.d, 7, fence); }
  else { box(ctx, b.x, b.y, 0, b.w, 0.05, 7, fence); box(ctx, b.x, b.y, 0, 0.05, b.d, 7, fence); }

  // dimensões da casa: no fundo do lote, deixando jardim na frente
  const doorA = b.door ? b.door.at + 0.5 : lenA / 2;
  const hw = Math.min(4.2, lenA - 0.8);
  let a0 = Math.max(0.4, Math.min(lenA - 0.4 - hw, doorA - hw / 2));
  const d0 = 0.4, hd = Math.min(3.6, lenD - 1.6);
  const d1 = d0 + hd;
  const wallH = st.floors * 24;
  const roofH = 17;

  // garagem ao lado (se couber)
  const garW = 1.4;
  const hasGarage = st.garage && lenA - (a0 + hw) > garW + 0.3;
  if (hasGarage) {
    boxAD(a0 + hw, d0 + 0.6, garW, hd - 0.6, 0, 18, st.wall);
    boxAD(a0 + hw - 0.05, d0 + 0.5, garW + 0.15, hd - 0.4, 18, 2.5, st.roof);
    poly(ctx, quadFront(a0 + hw + 0.15, a0 + hw + garW - 0.15, d1, 0, 14), '#d5d8de');
    for (let z = 3; z < 14; z += 3) poly(ctx, quadFront(a0 + hw + 0.15, a0 + hw + garW - 0.15, d1 + 0.005, z, z + 0.6), '#b9bec8');
  }

  // corpo da casa
  boxAD(a0, d0, hw, hd, 0, wallH, st.wall);
  poly(ctx, quadFront(a0, a0 + hw, d1 + 0.005, 0, 2.5), st.trim);
  if (st.floors === 2) poly(ctx, quadFront(a0, a0 + hw, d1 + 0.005, 23, 25), st.trim);

  // janelas e porta
  const win = (pts, k) => {
    const lit = litFrac > 0 && hash(b.x, b.y, k) < litFrac * 1.4;
    if (lit) { setTint(0); poly(ctx, pts, '#f2cd72'); setTint(N); } else poly(ctx, pts, '#5d86b8');
  };
  const doorAt = Math.max(a0 + 0.35, Math.min(a0 + hw - 0.35, doorA));
  for (let f = 0; f < st.floors; f++) {
    const z = f * 24 + 8;
    for (let a = a0 + 0.55; a < a0 + hw - 0.3; a += 1.1) {
      if (f === 0 && Math.abs(a + 0.25 - doorAt) < 0.6) continue;
      win(quadFront(a, a + 0.5, d1 + 0.01, z, z + 10), a * 7 + f);
      poly(ctx, quadFront(a - 0.05, a + 0.55, d1 + 0.012, z - 1.2, z), st.trim);
    }
    for (let d = d0 + 0.6; d < d1 - 0.4; d += 1.2) {
      win(quadSide(a0 + hw + 0.01, d, d + 0.5, z, z + 10), d * 11 + f + 50);
    }
  }
  poly(ctx, quadFront(doorAt - 0.25, doorAt + 0.25, d1 + 0.01, 0, 15), st.door);
  poly(ctx, quadFront(doorAt - 0.3, doorAt + 0.3, d1 + 0.012, 15, 16.5), st.trim);
  boxAD(doorAt - 0.35, d1, 0.7, 0.25, 0, 2, '#c9c4b8');

  // telhado de duas águas (cumeeira paralela à frente)
  const o = 0.15, top = wallH + roofH, mid = (d0 + d1) / 2;
  const R = (a, d, z) => P(...W(a, d), z);
  const ra0 = a0 - o, ra1 = a0 + hw + o, rd0 = d0 - o, rd1 = d1 + o;
  const dark = st.roof, light = shade(st.roof, 1.18);
  if (fy) {
    poly(ctx, [R(ra0, rd0, wallH - 2), R(ra1, rd0, wallH - 2), R(ra1, mid, top), R(ra0, mid, top)], shade(st.roof, 0.8));
    poly(ctx, [R(a0 + hw, d0, wallH), R(a0 + hw, d1, wallH), R(a0 + hw, mid, top - 2)], st.wall);
    poly(ctx, [R(ra0, mid, top), R(ra1, mid, top), R(ra1, rd1, wallH - 2), R(ra0, rd1, wallH - 2)], light);
  } else {
    poly(ctx, [R(ra0, rd0, wallH - 2), R(ra0, mid, top), R(ra1, mid, top), R(ra1, rd0, wallH - 2)], shade(st.roof, 0.8));
    poly(ctx, [R(a0 + hw, d0, wallH), R(a0 + hw, d1, wallH), R(a0 + hw, mid, top - 2)], shade(st.wall, 0.85));
    poly(ctx, [R(ra0, mid, top), R(ra1, mid, top), R(ra1, rd1, wallH - 2), R(ra0, rd1, wallH - 2)], light);
  }
  // beiral
  ctx.strokeStyle = col(shade(dark, 0.6));
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(...R(ra0, mid, top)); ctx.lineTo(...R(ra1, mid, top));
  ctx.stroke();

  // jardim: caminho, arbusto, carro e cerca da frente com portão
  const pathA0 = doorAt - 0.3;
  {
    const p = (a, d) => P(...W(a, d), 0.3);
    poly(ctx, [p(pathA0, d1 + 0.25), p(pathA0 + 0.6, d1 + 0.25), p(pathA0 + 0.6, lenD), p(pathA0, lenD)], '#d8d2c4');
  }
  if (st.bush) {
    const ba = a0 < 1.2 ? a0 + hw + 0.4 : 0.5;
    if (ba + 0.6 < lenA && !(hasGarage && ba > a0 + hw)) {
      const [bx, by] = W(ba + 0.3, d1 + 0.6);
      const [sx, sy] = P(bx, by, 8);
      circle(ctx, sx, sy, 9, '#3f8f4f');
      circle(ctx, sx - 4, sy - 4, 5, '#5cae68');
    }
  }
  if (st.car && hasGarage) {
    const ca = a0 + hw + 0.2, cd = d1 + 0.15;
    if (lenD - cd > 0.8) boxAD(ca, cd, garW - 0.4, Math.min(1.1, lenD - cd - 0.15), 3, 11, HOUSE_DOORS[Math.floor(hash(b.x, b.y, 9) * HOUSE_DOORS.length)]);
  }
  // cerca da frente e do lado, com abertura no caminho
  if (fy) {
    box(ctx, b.x + b.w - 0.05, b.y, 0, 0.05, b.d, 7, fence);
    if (pathA0 > 0) box(ctx, b.x, b.y + b.d - 0.05, 0, pathA0, 0.05, 7, fence);
    box(ctx, b.x + pathA0 + 0.6, b.y + b.d - 0.05, 0, b.w - pathA0 - 0.6, 0.05, 7, fence);
  } else {
    box(ctx, b.x, b.y + b.d - 0.05, 0, b.w, 0.05, 7, fence);
    if (pathA0 > 0) box(ctx, b.x + b.w - 0.05, b.y, 0, 0.05, pathA0, 7, fence);
    box(ctx, b.x + b.w - 0.05, b.y + pathA0 + 0.6, 0, 0.05, b.d - pathA0 - 0.6, 7, fence);
  }
}
