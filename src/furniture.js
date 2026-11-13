// Móveis da casa do Dr. (uma casa de idoso de verdade): registrados em DRAW.
import { DRAW, P, box, poly, faceY, faceX, topQ, ellipse, circle, cylinder, shade, col, drawSleeperHead } from './draw.js';
import { lightsOn, nightLevel } from './light.js';

const WOOD = '#9b6b45', WOOD_D = '#7a5234', WOOD_L = '#b9895c';
const legs4 = (ctx, x, y, a, b, w, d, h, c) => {
  for (const [i, j] of [[a, b], [a + w, b], [a, b + d], [a + w, b + d]]) box(ctx, x + i, y + j, 0, 0.05, 0.05, h, c);
};
const hashN = (n, k) => Math.abs(Math.sin(n * 12.9898 + k * 78.233) * 43758.5453) % 1;

// direção para onde o móvel "olha" (n/s/e/w)
const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

function glowAt(ctx, sx, sy, r, rgb, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

Object.assign(DRAW, {
  // ---------- cozinha ----------
  counter(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.04, y + 0.1, 0, 0.92, 0.82, 27, '#f2ede4', { top: '#e4ddd0' });
    poly(ctx, faceY(x + 0.08, x + 0.48, y + 0.92, 3, 24), '#ebe4d8');
    poly(ctx, faceY(x + 0.52, x + 0.92, y + 0.92, 3, 24), '#ebe4d8');
    poly(ctx, faceY(x + 0.4, x + 0.45, y + 0.93, 14, 17), '#b8a68e');
    poly(ctx, faceY(x + 0.55, x + 0.6, y + 0.93, 14, 17), '#b8a68e');
    box(ctx, x + 0.02, y + 0.08, 27, 0.96, 0.86, 3, '#5d5a58', { top: '#6f6b67' });
    // pote de mantimentos e pano de prato
    box(ctx, x + 0.2, y + 0.2, 30, 0.16, 0.16, 9, '#e3d2b0');
    box(ctx, x + 0.42, y + 0.22, 30, 0.14, 0.14, 7, '#d9c09a');
    poly(ctx, faceY(x + 0.62, x + 0.8, y + 0.935, 14, 24), '#e57373');
  },
  // balcão/península entre a cozinha e a sala de jantar (1×2), virado para a sala
  peninsula(ctx, o) {
    const { x, y } = o;
    // armário embaixo, com portas viradas para a sala de jantar
    box(ctx, x + 0.12, y + 0.04, 0, 0.72, 1.9, 27, '#f2ede4', { top: '#e4ddd0', right: '#e2d9cb' });
    poly(ctx, faceY(x + 0.12, x + 0.84, y + 1.94, 0, 4), '#cfc6b6');
    for (const [a, b] of [[0.1, 0.62], [0.68, 1.2], [1.26, 1.86]]) {
      poly(ctx, faceX(x + 0.841, y + a, y + b, 5, 24), '#ebe3d6');
      poly(ctx, faceX(x + 0.842, y + (a + b) / 2 - 0.03, y + (a + b) / 2 + 0.03, 15, 19), '#b8a68e');
    }
    // tampo de granito, com o beiral saindo para o lado da sala
    box(ctx, x + 0.06, y, 27, 0.94, 2, 3.5, '#5d5a58', { top: '#726d68', right: '#4e4b49' });
    // fruteira, garrafa de café e pão
    const [fx, fy] = P(x + 0.5, y + 0.45, 31);
    ellipse(ctx, fx, fy, 8, 4, '#d9cfc0');
    circle(ctx, fx - 3, fy - 3, 2.6, '#f2c230'); circle(ctx, fx + 2, fy - 3.5, 2.6, '#e53935'); circle(ctx, fx, fy - 5.5, 2.4, '#7cb342');
    cylinder(ctx, x + 0.45, y + 1.15, 30.5, 3.5, 13, '#c0392b');
    box(ctx, x + 0.42, y + 1.12, 43, 0.06, 0.06, 2.5, '#2b2b2b');
    box(ctx, x + 0.3, y + 1.5, 30.5, 0.3, 0.32, 5, '#d9a45a', { top: '#e8b86a' });
  },
  claypot(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.1, y + 0.15, 0, 0.8, 0.7, 22, WOOD, { top: WOOD_L });
    // filtro de barro: dois potes empilhados com torneirinha
    cylinder(ctx, x + 0.5, y + 0.5, 22, 15, 14, '#c0703f');
    cylinder(ctx, x + 0.5, y + 0.5, 36, 13, 10, '#cf7e4b');
    const [sx, sy] = P(x + 0.5, y + 0.5, 46);
    ellipse(ctx, sx, sy, 7, 3.5, '#a85d33');
    const [tx, ty] = P(x + 0.5, y + 0.9, 27);
    ctx.fillStyle = col('#c9ced6'); ctx.fillRect(tx - 1, ty - 1, 6, 2);
    // copo ao lado
    const [cx, cy] = P(x + 0.18, y + 0.82, 22);
    ctx.fillStyle = col('rgba(200,225,250,.85)'); ctx.fillRect(cx - 2, cy - 7, 4, 7);
  },
  bin(ctx, o) {
    const { x, y } = o;
    cylinder(ctx, x + 0.5, y + 0.5, 0, 8, 16, '#8e96a3');
    const [sx, sy] = P(x + 0.5, y + 0.5, 17);
    ellipse(ctx, sx, sy, 8, 4, '#6c737f');
  },

  // ---------- sala de jantar ----------
  diningTable(ctx, o) {
    const { x, y } = o;
    legs4(ctx, x, y, 0.12, 0.15, 1.7, 0.65, 22, WOOD_D);
    box(ctx, x + 0.06, y + 0.08, 22, 1.88, 0.84, 3, WOOD, { top: WOOD_L });
    // toalha de renda
    poly(ctx, topQ(x + 0.3, y + 0.12, x + 1.7, y + 0.88, 25.2), '#f6f2e8');
    poly(ctx, faceY(x + 0.3, x + 1.7, y + 0.88, 20, 25.2), '#efe8da');
    // fruteira e vaso
    const [fx, fy] = P(x + 0.7, y + 0.5, 26);
    ellipse(ctx, fx, fy, 8, 4, '#d9cfc0');
    circle(ctx, fx - 3, fy - 3, 2.6, '#f2c230'); circle(ctx, fx + 2, fy - 3.5, 2.6, '#e53935'); circle(ctx, fx, fy - 5.5, 2.4, '#7cb342');
    box(ctx, x + 1.3, y + 0.42, 25, 0.12, 0.12, 10, '#5d86c9');
    const [vx, vy] = P(x + 1.36, y + 0.48, 37);
    circle(ctx, vx - 2, vy, 2.5, '#f48fb1'); circle(ctx, vx + 2, vy - 1, 2.5, '#fff59d'); circle(ctx, vx, vy - 3, 2.3, '#f48fb1');
  },
  chair(ctx, o) {
    const { x, y } = o;
    const d = o.data?.dir || 's';
    legs4(ctx, x, y, 0.25, 0.25, 0.45, 0.45, 12, WOOD_D);
    box(ctx, x + 0.22, y + 0.22, 12, 0.56, 0.56, 2.5, WOOD, { top: '#c9a27a' });
    const [vx, vy] = DIRV[d];
    // encosto do lado oposto ao que a cadeira "olha"
    const bx = vx === 0 ? x + 0.22 : vx > 0 ? x + 0.2 : x + 0.74;
    const by = vy === 0 ? y + 0.22 : vy > 0 ? y + 0.2 : y + 0.74;
    const bw = vx === 0 ? 0.56 : 0.06, bd = vx === 0 ? 0.06 : 0.56;
    box(ctx, bx, by, 14, bw, bd, 16, WOOD);
  },
  cristaleira(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.08, y + 0.15, 0, 0.84, 0.6, 28, WOOD_D, { top: WOOD });
    box(ctx, x + 0.1, y + 0.17, 28, 0.8, 0.5, 42, WOOD, { top: WOOD_L });
    poly(ctx, faceY(x + 0.14, x + 0.86, y + 0.67, 31, 67), 'rgba(190,220,235,.55)');
    for (const z of [42, 55]) poly(ctx, faceY(x + 0.14, x + 0.86, y + 0.671, z, z + 1), '#d8c6a8');
    // pratos e taças
    for (const [a, z] of [[0.25, 33], [0.5, 33], [0.75, 33], [0.3, 46], [0.6, 46]]) {
      const [sx, sy] = P(x + a, y + 0.45, z + 4);
      ellipse(ctx, sx, sy, 3.6, 4, '#f4f4f0');
      ellipse(ctx, sx, sy, 1.6, 1.8, '#7aa0d0');
    }
    for (const a of [0.3, 0.5, 0.7]) { const [sx, sy] = P(x + a, y + 0.5, 57); ctx.fillStyle = col('rgba(230,240,250,.9)'); ctx.fillRect(sx - 1.5, sy - 6, 3, 6); }
    poly(ctx, faceY(x + 0.3, x + 0.7, y + 0.76, 8, 20), shade(WOOD_D, 0.9));
  },
  grandClock(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.25, y + 0.3, 0, 0.5, 0.4, 14, WOOD_D);
    box(ctx, x + 0.29, y + 0.32, 14, 0.42, 0.36, 44, WOOD);
    box(ctx, x + 0.24, y + 0.28, 58, 0.52, 0.44, 18, WOOD_D, { top: WOOD });
    poly(ctx, faceY(x + 0.33, x + 0.67, y + 0.685, 17, 54), 'rgba(40,30,20,.55)');
    // mostrador
    const [cx, cy] = P(x + 0.5, y + 0.72, 67);
    circle(ctx, cx, cy, 6.5, '#f3ead6');
    const t = Date.now() / 1000;
    ctx.strokeStyle = col('#2b2b2b'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(t / 600) * 4.5, cy - Math.cos(t / 600) * 4.5); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(t / 50) * 3, cy - Math.cos(t / 50) * 3); ctx.stroke();
    // pêndulo
    const [px, py] = P(x + 0.5, y + 0.69, 52);
    const sw = Math.sin(t * Math.PI) * 0.35;
    ctx.strokeStyle = col('#c9a24a'); ctx.lineWidth = 1.2;
    const ex = px + Math.sin(sw) * 22, ey = py + Math.cos(sw) * 22;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    circle(ctx, ex, ey, 3.2, '#d9b25a');
  },

  // ---------- escritório ----------
  computer(ctx, o, s, on) {
    const { x, y } = o;
    legs4(ctx, x, y, 0.08, 0.1, 0.8, 0.72, 22, WOOD_D);
    box(ctx, x + 0.04, y + 0.06, 22, 0.92, 0.86, 3, WOOD, { top: WOOD_L });
    box(ctx, x + 0.62, y + 0.12, 4, 0.3, 0.72, 18, WOOD_D, { top: WOOD });
    // monitor antigo
    box(ctx, x + 0.22, y + 0.12, 25, 0.5, 0.38, 20, '#d9d4c7');
    poly(ctx, faceY(x + 0.26, x + 0.68, y + 0.5, 28, 43), on ? '#8fe3b0' : '#334050');
    if (on) for (let i = 0; i < 4; i++) poly(ctx, faceY(x + 0.3, x + 0.3 + 0.1 + ((i * 37) % 25) / 100, y + 0.501, 39 - i * 3, 40 - i * 3), '#2f6b48');
    box(ctx, x + 0.25, y + 0.58, 25, 0.36, 0.14, 1.5, '#e8e4da');
    // pilha de papéis, caneca e luminária
    box(ctx, x + 0.72, y + 0.62, 25, 0.2, 0.24, 4, '#f6f2e8');
    box(ctx, x + 0.08, y + 0.7, 25, 0.1, 0.1, 5, '#c0392b');
    box(ctx, x + 0.82, y + 0.15, 25, 0.04, 0.04, 16, '#3a3f4a');
    box(ctx, x + 0.76, y + 0.15, 40, 0.14, 0.1, 4, '#3a6e5a');
  },
  deskChair(ctx, o) {
    const { x, y } = o;
    const d = o.data?.dir || 'n';
    const [vx, vy] = DIRV[d];
    const cx = x + 0.5, cy = y + 0.5;
    const back = () => {
      // encosto estofado do lado oposto à escrivaninha
      const bx = cx - vx * 0.3, by = cy - vy * 0.3;
      box(ctx, bx - 0.02, by - 0.02, 14, 0.04, 0.04, 6, '#3a3f4a');
      if (vx === 0) box(ctx, cx - 0.25, by - 0.04, 17, 0.5, 0.08, 14, '#3d4a5c', { top: '#566479' });
      else box(ctx, bx - 0.04, cy - 0.25, 17, 0.08, 0.5, 14, '#3d4a5c', { top: '#566479' });
    };
    const farBack = d === 'e' || d === 's';
    // base de cinco pés com rodinhas
    const [sx, sy] = P(cx, cy, 1.5);
    ctx.strokeStyle = col('#2b2f38'); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const [ex, ey] = P(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, 1.5);
      ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const [ex, ey] = P(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, 0);
      circle(ctx, ex, ey, 1.6, '#1d2027');
    }
    if (farBack) back();
    // pistão e assento
    box(ctx, cx - 0.03, cy - 0.03, 1.5, 0.06, 0.06, 9, '#8e96a3');
    box(ctx, cx - 0.27, cy - 0.27, 10.5, 0.54, 0.54, 3.5, '#3d4a5c', { top: '#4f5d73' });
    if (!farBack) back();
  },
  bookcase(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.06, y + 0.12, 0, 0.88, 0.55, 70, WOOD_D, { top: WOOD });
    poly(ctx, faceY(x + 0.1, x + 0.9, y + 0.67, 3, 67), '#3a2a1e');
    let k = o.id * 7;
    const C = ['#8e3b2f', '#2f4f6f', '#4a6b3a', '#a77b2f', '#5a3a5a', '#2b5b5b', '#7a6a5a', '#b04a3a'];
    for (const z of [4, 20, 36, 52]) {
      poly(ctx, faceY(x + 0.1, x + 0.9, y + 0.67, z - 1.5, z), WOOD);
      let a = 0.12;
      while (a < 0.86) {
        const w = 0.05 + hashN(k, 1) * 0.05, h = 9 + hashN(k, 2) * 5;
        if (a + w > 0.88) break;
        poly(ctx, faceY(x + a, x + a + w, y + 0.672, z, z + h), C[k % C.length]);
        a += w + 0.008; k++;
      }
    }
  },
  scienceShelf(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.08, y + 0.15, 0, 0.84, 0.6, 30, WOOD_D, { top: WOOD });
    // microscópio antigo de latão, globo e frascos
    box(ctx, x + 0.2, y + 0.3, 30, 0.2, 0.2, 3, '#3a3f4a');
    box(ctx, x + 0.26, y + 0.34, 33, 0.06, 0.06, 14, '#c9a24a');
    box(ctx, x + 0.22, y + 0.31, 46, 0.14, 0.12, 4, '#b08a3a');
    box(ctx, x + 0.62, y + 0.42, 30, 0.05, 0.05, 8, '#7a5234');
    const [gx, gy] = P(x + 0.64, y + 0.44, 46);
    circle(ctx, gx, gy, 7, '#4f8fc0');
    circle(ctx, gx - 2, gy - 1, 3, '#7cb342'); circle(ctx, gx + 3, gy + 2, 2, '#7cb342');
    for (const [a, c] of [[0.4, '#7fd3a0'], [0.82, '#f5a0c0']]) { const [sx, sy] = P(x + a, y + 0.65, 30); ellipse(ctx, sx, sy - 3, 2.5, 3.5, c); }
    poly(ctx, faceY(x + 0.15, x + 0.85, y + 0.751, 6, 24), shade(WOOD_D, 0.9));
  },

  // ---------- sala de estar ----------
  armchair(ctx, o, s) {
    drawSeat(ctx, o, '#7a8f6a', 0);
  },
  rocker(ctx, o, s) {
    const occupied = s.player.task?.phase === 'do' && s.player.task.target.id === o.id;
    drawRocker(ctx, o, occupied ? Math.sin((Date.now() / 1000) * 1.6) : 0);
  },
  coffeeTable(ctx, o) {
    const { x, y } = o;
    legs4(ctx, x, y, 0.18, 0.2, 0.6, 0.55, 11, WOOD_D);
    box(ctx, x + 0.12, y + 0.15, 11, 0.76, 0.7, 3, WOOD, { top: WOOD_L });
    poly(ctx, topQ(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 14.2), '#f4efe2');
    box(ctx, x + 0.2, y + 0.55, 14, 0.25, 0.18, 1.5, '#d8e0ea');
    box(ctx, x + 0.62, y + 0.22, 14, 0.08, 0.16, 1.5, '#2b2b2b');
  },
  floorLamp(ctx, o, s) {
    const { x, y } = o;
    const [bx, by] = P(x + 0.5, y + 0.5, 0);
    ellipse(ctx, bx, by, 6, 3, '#4a3f35');
    box(ctx, x + 0.48, y + 0.48, 0, 0.04, 0.04, 50, '#4a3f35');
    const on = lightsOn(s, x, y);
    const [sx, sy] = P(x + 0.5, y + 0.5, 52);
    ctx.fillStyle = col(on ? '#f7e3b5' : '#e3d4b5');
    ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx + 9, sy + 10); ctx.lineTo(sx - 9, sy + 10); ctx.closePath(); ctx.fill();
    if (on && nightLevel(s) > 0.2) glowAt(ctx, sx, sy + 6, 46, '255,210,140', 0.35);
  },
  radio(ctx, o, s, on) {
    const { x, y } = o;
    legs4(ctx, x, y, 0.2, 0.2, 0.55, 0.55, 18, WOOD_D);
    box(ctx, x + 0.15, y + 0.15, 18, 0.7, 0.7, 2.5, WOOD, { top: WOOD_L });
    box(ctx, x + 0.25, y + 0.3, 20.5, 0.5, 0.3, 11, '#6b4a33', { top: '#7d5a40' });
    poly(ctx, faceY(x + 0.29, x + 0.52, y + 0.6, 23, 29), '#d8c9a8');
    for (let i = 0; i < 3; i++) poly(ctx, faceY(x + 0.29, x + 0.52, y + 0.601, 24 + i * 2, 24.5 + i * 2), '#9a8a6a');
    const [kx, ky] = P(x + 0.64, y + 0.6, 26); circle(ctx, kx, ky, 1.8, '#2b2b2b');
    box(ctx, x + 0.68, y + 0.36, 31.5, 0.02, 0.02, 10, '#9aa3b0');
    if (on) { const t = Date.now() / 300; ctx.strokeStyle = 'rgba(255,230,160,.7)'; ctx.lineWidth = 1; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(kx + 4, ky - 6, 3 * i + (t % 1) * 2, -0.8, 0.8); ctx.stroke(); } }
  },
  tv(ctx, o, s, on) {
    const { x, y } = o;
    box(ctx, x + 0.06, y + 0.15, 0, 0.88, 0.5, 18, WOOD, { top: WOOD_L });
    poly(ctx, faceY(x + 0.1, x + 0.48, y + 0.65, 3, 15), shade(WOOD, 0.88));
    poly(ctx, faceY(x + 0.52, x + 0.9, y + 0.65, 3, 15), shade(WOOD, 0.88));
    poly(ctx, topQ(x + 0.15, y + 0.2, x + 0.85, y + 0.6, 18.2), '#f6f2e8');
    box(ctx, x + 0.46, y + 0.32, 18, 0.08, 0.06, 4, '#22252c');
    box(ctx, x + 0.12, y + 0.3, 22, 0.76, 0.06, 28, '#22252c');
    poly(ctx, faceY(x + 0.15, x + 0.85, y + 0.36, 24, 48), on ? '#7fd3ff' : '#2d3a55');
    // porta-retrato no rack
    box(ctx, x + 0.78, y + 0.5, 18, 0.12, 0.04, 8, '#c9a24a');
  },
  fern(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.38, y + 0.38, 0, 0.24, 0.24, 18, WOOD_D);
    cylinder(ctx, x + 0.5, y + 0.5, 18, 7, 8, '#c0703f');
    const [sx, sy] = P(x + 0.5, y + 0.5, 28);
    ctx.strokeStyle = col('#3f8f4f'); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI - Math.PI;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.cos(a) * 10, sy - 12, sx + Math.cos(a) * 16, sy + 4 - Math.abs(Math.sin(a)) * 4); ctx.stroke();
    }
  },

  // ---------- quarto ----------
  bed2(ctx, o, s, on, occupant) {
    const { x, y } = o;
    box(ctx, x + 0.05, y + 0.02, 0, 1.9, 0.12, 36, WOOD_D, { top: WOOD });
    poly(ctx, faceY(x + 0.25, x + 1.75, y + 0.14, 22, 32), WOOD);
    box(ctx, x + 0.05, y + 0.12, 0, 1.9, 1.82, 11, WOOD);
    box(ctx, x + 0.09, y + 0.15, 11, 1.82, 1.76, 6, '#ffffff');
    box(ctx, x + 0.18, y + 0.2, 17, 0.7, 0.34, 5, '#f4f1ea');
    box(ctx, x + 1.1, y + 0.2, 17, 0.7, 0.34, 5, '#f4f1ea');
    if (occupant === 'sleep') drawSleeperHead(ctx, ...P(x + 0.53, y + 0.38, 23));
    // colcha de retalhos
    const breathe = occupant === 'sleep' ? Math.sin(Date.now() / 900) * 0.8 : 0;
    box(ctx, x + 0.07, y + 0.62, 11, 1.86, 1.34, 7 + breathe, '#c25b56');
    const Q = ['#e8b04a', '#5b8fd9', '#7cb342', '#f4f1ea', '#c25b56', '#9c6ab0'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const a = x + 0.12 + i * 0.3, b = y + 0.68 + j * 0.31;
      poly(ctx, topQ(a, b, a + 0.28, b + 0.29, 18.2 + breathe), Q[(i * 3 + j * 5 + o.id) % Q.length]);
    }
    if (occupant === 'sleep') box(ctx, x + 0.2, y + 0.6, 18 + breathe, 0.62, 0.14, 2.5, '#ffffff');
  },
  nightstand(ctx, o, s) {
    const { x, y } = o;
    box(ctx, x + 0.15, y + 0.2, 0, 0.7, 0.6, 22, WOOD, { top: WOOD_L });
    poly(ctx, faceY(x + 0.2, x + 0.8, y + 0.8, 12, 19), shade(WOOD, 0.9));
    // abajur, óculos de leitura, livro, despertador
    box(ctx, x + 0.25, y + 0.3, 22, 0.1, 0.1, 10, '#c9b79a');
    const on = lightsOn(s, x, y);
    const [sx, sy] = P(x + 0.3, y + 0.35, 36);
    ctx.fillStyle = col(on ? '#f7e3b5' : '#e8dcc0');
    ctx.beginPath(); ctx.moveTo(sx - 4, sy - 2); ctx.lineTo(sx + 4, sy - 2); ctx.lineTo(sx + 6, sy + 5); ctx.lineTo(sx - 6, sy + 5); ctx.closePath(); ctx.fill();
    if (on && nightLevel(s) > 0.2) glowAt(ctx, sx, sy + 3, 30, '255,210,140', 0.3);
    box(ctx, x + 0.5, y + 0.45, 22, 0.28, 0.2, 2.5, '#2f4f6f');
    box(ctx, x + 0.55, y + 0.22, 22, 0.14, 0.08, 5, '#e8e4da');
  },
  wardrobe(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.12, y + 0.06, 0, 0.62, 1.88, 60, WOOD, { top: WOOD_L, right: shade(WOOD, 0.85) });
    poly(ctx, faceX(x + 0.74, y + 0.1, y + 0.96, 5, 56), shade(WOOD, 0.9));
    poly(ctx, faceX(x + 0.74, y + 1.0, y + 1.9, 5, 56), shade(WOOD, 0.9));
    poly(ctx, faceX(x + 0.741, y + 0.8, y + 0.85, 28, 38), '#c9a24a');
    poly(ctx, faceX(x + 0.741, y + 1.1, y + 1.15, 28, 38), '#c9a24a');
    // mala velha em cima
    box(ctx, x + 0.2, y + 0.3, 60, 0.5, 0.8, 8, '#6b4a33');
  },
  dresser(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.15, y + 0.06, 0, 0.6, 0.88, 32, WOOD, { top: WOOD_L });
    for (const z of [4, 14, 24]) {
      poly(ctx, faceX(x + 0.75, y + 0.1, y + 0.9, z, z + 8), shade(WOOD, 0.92));
      poly(ctx, faceX(x + 0.751, y + 0.45, y + 0.55, z + 3, z + 5), '#c9a24a');
    }
    // porta-retratos: a esposa, os netos
    for (const [b, c] of [[0.25, '#c9a24a'], [0.55, '#e8e4da'], [0.75, '#9aa3b0']]) {
      box(ctx, x + 0.35, y + b, 32, 0.04, 0.14, 9, c);
      poly(ctx, faceX(x + 0.391, y + b + 0.02, y + b + 0.12, 33.5, 39.5), '#a9b8c8');
    }
  },

  // ---------- banheiro e lavanderia ----------
  toilet(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.3, y + 0.12, 0, 0.4, 0.24, 30, '#f4f6f8');
    box(ctx, x + 0.34, y + 0.32, 0, 0.32, 0.4, 14, '#eef1f4');
    const [sx, sy] = P(x + 0.5, y + 0.58, 15);
    ellipse(ctx, sx, sy, 7.5, 4.5, '#f8fafb');
    ellipse(ctx, sx, sy, 4.5, 2.6, '#cfe0ea');
  },
  bathSink(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.42, y + 0.25, 0, 0.16, 0.16, 22, '#eef1f4');
    box(ctx, x + 0.15, y + 0.1, 22, 0.7, 0.55, 6, '#f8fafb');
    poly(ctx, topQ(x + 0.25, y + 0.18, x + 0.75, y + 0.58, 28.2), '#cfe0ea');
    box(ctx, x + 0.46, y + 0.12, 28, 0.06, 0.06, 6, '#9aa3b0');
    // escova e remédios
    box(ctx, x + 0.72, y + 0.2, 28, 0.06, 0.06, 6, '#e53935');
    box(ctx, x + 0.2, y + 0.15, 28, 0.08, 0.08, 4, '#ffb74d');
  },
  shower(ctx, o, s, on, occupant) {
    const { x, y } = o;
    const busy = occupant === 'shower';
    const t = Date.now() / 1000;
    poly(ctx, topQ(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 1), '#cfe0ea');
    box(ctx, x + 0.05, y + 0.05, 1, 0.9, 0.9, 2, '#dfe9ef');
    box(ctx, x + 0.45, y + 0.08, 0, 0.04, 0.04, 66, '#9aa3b0');
    box(ctx, x + 0.35, y + 0.08, 64, 0.3, 0.2, 3, '#b8c0cc');
    const front = faceY(x + 0.05, x + 0.95, y + 0.95, 2, 70);
    const side = faceX(x + 0.95, y + 0.05, y + 0.95, 2, 70);
    if (!busy) {
      poly(ctx, front, 'rgba(200,225,240,.28)', 'rgba(200,210,220,.7)', 1);
      poly(ctx, side, 'rgba(200,225,240,.22)', 'rgba(200,210,220,.7)', 1);
      return;
    }
    // ---- alguém tomando banho ----
    const [sx, sy] = P(x + 0.5, y + 0.5, 0);
    // água caindo do chuveiro
    const [hx, hy] = P(x + 0.5, y + 0.18, 63);
    ctx.strokeStyle = 'rgba(190,220,245,.7)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const k = (t * 2.2 + i * 0.29) % 1;
      const dx = (i - 4) * 1.6;
      ctx.beginPath(); ctx.moveTo(hx + dx * (1 + k), hy + k * 50); ctx.lineTo(hx + dx * (1 + k), hy + k * 50 + 5); ctx.stroke();
    }
    // silhueta desfocada: lavando a cabeça
    const scrub = Math.sin(t * 7) * 2;
    ctx.save();
    ctx.filter = 'blur(2.2px)';
    ctx.fillStyle = col('rgba(226,178,136,.85)');
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 37); ctx.quadraticCurveTo(sx - 9, sy - 20, sx - 6, sy - 3);
    ctx.lineTo(sx + 6, sy - 3); ctx.quadraticCurveTo(sx + 9, sy - 20, sx + 8, sy - 37);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - 45, 7, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = col('rgba(226,178,136,.85)');
    ctx.beginPath(); ctx.moveTo(sx - 7, sy - 35); ctx.lineTo(sx - 10, sy - 44); ctx.lineTo(sx - 4 + scrub, sy - 51);
    ctx.moveTo(sx + 7, sy - 35); ctx.lineTo(sx + 10, sy - 44); ctx.lineTo(sx + 4 - scrub, sy - 51); ctx.stroke();
    // espuma no cabelo
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(sx - 5 + i * 2 + Math.sin(t * 3 + i) * 0.6, sy - 50 - (i % 2) * 2.5, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // vidro embaçado: mais branco em cima, onde o vapor junta
    const fog = (pts) => {
      const top = Math.min(...pts.map((q) => q[1])), bot = Math.max(...pts.map((q) => q[1]));
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, 'rgba(240,244,248,.78)');
      g.addColorStop(0.55, 'rgba(232,239,245,.62)');
      g.addColorStop(1, 'rgba(222,233,241,.5)');
      ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(200,210,220,.85)'; ctx.lineWidth = 1; ctx.stroke();
    };
    fog(front); fog(side);
    // gotas escorrendo (riscos limpos no embaçado)
    ctx.strokeStyle = 'rgba(170,200,225,.55)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (const [a, sp, len] of [[0.18, 0.13, 14], [0.42, 0.09, 22], [0.71, 0.17, 10], [0.86, 0.11, 18]]) {
      const k = (t * sp + a) % 1;
      const p0 = faceY(x + 0.05 + a * 0.9, x + 0.05 + a * 0.9, y + 0.951, 0, 0)[0];
      const top = 66 - k * 46;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - top); ctx.lineTo(p0[0], p0[1] - top + len); ctx.stroke();
    }
    // espuma grudada no vidro
    const foam = (px, py, n, r) => {
      for (let i = 0; i < n; i++) {
        const ang = i * 2.4, d = (i % 3) * r * 0.55;
        const bx = px + Math.cos(ang) * d, by = py + Math.sin(ang) * d * 0.7;
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(bx, by, r * (0.5 + (i % 2) * 0.25), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(190,205,220,.6)'; ctx.lineWidth = 0.6; ctx.stroke();
      }
    };
    const f1 = faceY(x + 0.3, x + 0.3, y + 0.951, 18, 18)[0];
    const f2 = faceY(x + 0.72, x + 0.72, y + 0.951, 40, 40)[0];
    const f3 = faceX(x + 0.951, y + 0.6, y + 0.6, 12, 12)[0];
    foam(f1[0], f1[1], 9, 3.6); foam(f2[0], f2[1], 7, 3); foam(f3[0], f3[1], 8, 3.2);
    // vapor saindo por cima
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.25 + i / 5) % 1;
      const [vx, vy] = P(x + 0.5, y + 0.5, 70 + k * 30);
      ctx.fillStyle = `rgba(245,248,252,${0.5 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(vx + Math.sin(i * 1.7 + t) * 8, vy, 7 + k * 12, 0, Math.PI * 2); ctx.fill();
    }
  },
  washer(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.12, y + 0.12, 0, 0.76, 0.72, 34, '#f4f6f8');
    const [sx, sy] = P(x + 0.5, y + 0.84, 18);
    circle(ctx, sx, sy, 8, '#c9d3df'); circle(ctx, sx, sy, 5.5, '#6f8fae');
    poly(ctx, faceY(x + 0.15, x + 0.85, y + 0.841, 28, 33), '#dde3ea');
  },
  tanque(ctx, o) {
    const { x, y } = o;
    box(ctx, x + 0.15, y + 0.15, 0, 0.7, 0.62, 26, '#d8dde3');
    poly(ctx, topQ(x + 0.22, y + 0.22, x + 0.78, y + 0.7, 26.2), '#aab6c2');
    box(ctx, x + 0.46, y + 0.16, 26, 0.06, 0.06, 8, '#9aa3b0');
    // balde
    cylinder(ctx, x + 0.9, y + 0.85, 0, 5, 9, '#4a90d9');
  },
});

// poltrona / cadeira de balanço: assento + encosto do lado oposto à direção
function drawSeat(ctx, o, c, rocker) {
  const { x, y } = o;
  const d = o.data?.dir || 's';
  const [vx, vy] = DIRV[d];
  box(ctx, x + 0.15, y + 0.15, rocker ? 4 : 0, 0.7, 0.7, rocker ? 9 : 12, rocker ? WOOD : c, { top: shade(c, 1.12) });
  const bx = vx === 0 ? x + 0.15 : vx > 0 ? x + 0.1 : x + 0.75;
  const by = vy === 0 ? y + 0.15 : vy > 0 ? y + 0.1 : y + 0.75;
  const bw = vx === 0 ? 0.7 : 0.15, bd = vx === 0 ? 0.15 : 0.7;
  box(ctx, bx, by, 0, bw, bd, rocker ? 34 : 30, c);
  // braços
  if (!rocker) {
    if (vx === 0) { box(ctx, x + 0.1, y + 0.15, 0, 0.12, 0.7, 19, shade(c, 0.95)); box(ctx, x + 0.78, y + 0.15, 0, 0.12, 0.7, 19, shade(c, 0.95)); }
    else { box(ctx, x + 0.15, y + 0.1, 0, 0.7, 0.12, 19, shade(c, 0.95)); box(ctx, x + 0.15, y + 0.78, 0, 0.7, 0.12, 19, shade(c, 0.95)); }
  } else {
    // almofada de crochê
    const [sx, sy] = P(x + 0.5, y + 0.5, 14);
    ellipse(ctx, sx, sy, 8, 4, '#e8d9b5');
  }
}

// Cadeira de balanço de madeira: arcos curvos, pés finos, assento com almofada de crochê,
// encosto inclinado com ripas e travessa curva, braços sobre balaústres.
// Desenhada num sistema local: u = de trás (0) para a frente (1), v = de um lado (0) ao outro (1).
function drawRocker(ctx, o, rock) {
  const { x, y } = o;
  const d = o.data?.dir || 'e';
  const tilt = rock * 0.12; // inclinação do balanço
  const L = (u, v, z) => {
    const zz = z + (0.5 - u) * tilt * 40 * (z > 0 ? 1 : 0.6) + Math.abs(rock) * 0.8;
    if (d === 'e') return P(x + u, y + v, zz);
    if (d === 'w') return P(x + 1 - u, y + 1 - v, zz);
    if (d === 's') return P(x + 1 - v, y + u, zz);
    return P(x + v, y + 1 - u, zz); // n
  };
  const line = (p0, p1, w, c) => {
    ctx.strokeStyle = col(c); ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke();
  };
  const DARK = '#6e4a2f', MID = '#8f6240', LIGHT = '#b07c52';
  const backFirst = d === 'e' || d === 's'; // encosto longe da câmera: desenha antes
  const sides = backFirst ? [0.18, 0.82] : [0.82, 0.18];

  // arcos (o lado de trás primeiro)
  for (const v of sides) {
    const a = L(0.02, v, 1), m = L(0.5, v, -2.5), b = L(0.98, v, 1);
    ctx.strokeStyle = col(v === sides[0] ? DARK : MID); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(m[0] * 2 - (a[0] + b[0]) / 2, m[1] * 2 - (a[1] + b[1]) / 2, ...b); ctx.stroke();
  }
  const back = () => {
    // montantes do encosto, inclinados para trás
    for (const v of sides) line(L(0.24, v, 12), L(0.08, v, 50), 2.6, v === sides[0] ? DARK : MID);
    // travessas e ripas
    line(L(0.2, 0.18, 22), L(0.2, 0.82, 22), 2, MID);
    for (const v of [0.32, 0.44, 0.56, 0.68]) line(L(0.2, v, 22), L(0.1, v, 46), 1.6, LIGHT);
    // travessa de cima curvada
    const t0 = L(0.08, 0.14, 49), tm = L(0.06, 0.5, 54), t1 = L(0.08, 0.86, 49);
    ctx.strokeStyle = col(MID); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...t0); ctx.quadraticCurveTo(tm[0] * 2 - (t0[0] + t1[0]) / 2, tm[1] * 2 - (t0[1] + t1[1]) / 2, ...t1); ctx.stroke();
  };
  if (backFirst) back();
  // pés
  for (const v of sides) {
    line(L(0.28, v, 0.5), L(0.28, v, 13), 2, DARK);
    line(L(0.78, v, 0.5), L(0.78, v, 13), 2, v === sides[0] ? DARK : MID);
  }
  // assento
  poly(ctx, [L(0.2, 0.16, 13), L(0.82, 0.16, 13), L(0.82, 0.84, 13), L(0.2, 0.84, 13)], LIGHT);
  poly(ctx, [L(0.82, 0.16, 13), L(0.82, 0.84, 13), L(0.82, 0.84, 10.5), L(0.82, 0.16, 10.5)], MID);
  // almofada de crochê
  poly(ctx, [L(0.28, 0.24, 14.5), L(0.76, 0.24, 14.5), L(0.76, 0.76, 14.5), L(0.28, 0.76, 14.5)], '#efe2c4');
  poly(ctx, [L(0.38, 0.34, 14.8), L(0.66, 0.34, 14.8), L(0.66, 0.66, 14.8), L(0.38, 0.66, 14.8)], null, '#c9a87a', 1);
  // braços: do encosto até a frente, apoiados num balaústre
  for (const v of sides) {
    const c = v === sides[0] ? DARK : MID;
    line(L(0.8, v, 13), L(0.8, v, 26), 1.8, c);
    line(L(0.18, v, 31), L(0.9, v, 26), 2.8, c);
  }
  if (!backFirst) back();
}
