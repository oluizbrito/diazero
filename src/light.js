// Iluminação: noite, luzes da casa, postes de rua e luz vazando pelas janelas.
import { W, H } from './config.js';
import { isIndoor, inLot, parseEdge, edgeSides, floorOf } from './world.js';
import { litTiles } from './rooms.js';
import { minuteOfDay, hasPower, hasGrid } from './time.js';

export const NIGHT_MAX = 0.82;

// 0 = dia claro · NIGHT_MAX = madrugada
export function nightLevel(s) {
  const m = minuteOfDay(s.time) / 60;
  let v;
  // anoitece das 17:30 às 18:30 · amanhece das 05:30 às 06:30
  if (m >= 18.5 || m < 5.5) v = 1;
  else if (m >= 17.5) v = m - 17.5;
  else if (m < 6.5) v = 1 - (m - 5.5);
  else v = 0;
  v = v * v * (3 - 2 * v); // transição suave
  return v * NIGHT_MAX;
}

// Luz acesa no tile (x,y) do andar atual; sem coordenadas: alguma luz acesa no andar
export function lightsOn(s, x, y) {
  const { lit } = litTiles(s, floorOf(s));
  if (x == null) return lit.some((v) => v);
  return inLot(Math.floor(x), Math.floor(y)) && lit[Math.floor(y) * W + Math.floor(x)] === 1;
}

// Postes na calçada em volta do terreno (só funcionam com a rede elétrica)
export const LAMPS = [
  [-1, 2], [-1, 8], [-1, 14], [W, 2], [W, 8], [W, 14],
  [2, -1], [8, -1], [14, -1], [3, H], [9, H], [15, H],
].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
export const lampsOn = (s) => hasGrid(s);

// Janelas externas da casa (de onde a luz vaza para o quintal)
function outerWindows(s, lit) {
  const out = [];
  for (const [k, w] of Object.entries(s.world.walls)) {
    if (w.type !== 'window' || !w.built) continue;
    const sides = edgeSides(k);
    const inside = sides.find(([x, y]) => isIndoor(s, x, y));
    const outside = sides.find(([x, y]) => !isIndoor(s, x, y));
    if (!inside || !outside || !lit[inside[1] * W + inside[0]]) continue;
    const { d, x, y } = parseEdge(k);
    const cx = d === 'n' ? x + 0.5 : x, cy = d === 'n' ? y : y + 0.5;
    out.push({ x: cx + (outside[0] - inside[0]) * 0.6, y: cy + (outside[1] - inside[1]) * 0.6 });
  }
  return out;
}

const PAD = 4;
const GW = W + PAD * 2, GH = H + PAD * 2;

// Calcula o "tint" (quanto escurecer) de cada tile perto da casa. Fora dessa área: noite plena.
export function computeLighting(s) {
  const f = floorOf(s);
  const { lit } = litTiles(s, f);
  const house = lit.some((v) => v);
  const litAt = (x, y) => { x = Math.floor(x); y = Math.floor(y); return inLot(x, y) && lit[y * W + x] === 1; };
  if (f !== 'ground') {
    // bunker: sem janela nenhuma · sótão: só a luz que passa pelas telhas
    const night = nightLevel(s);
    const dark = f === 'bunker' ? 0.86 : Math.max(0.3, night);
    const on = Math.min(0.12, dark);
    return { N: f === 'bunker' ? 0.82 : night, at: (x, y) => (litAt(x, y) ? on : dark), house, lit, litAt, lamps: [], wins: [], floor: f };
  }
  const N = nightLevel(s);
  const grid = new Float32Array(GW * GH);
  const lamps = lampsOn(s) ? LAMPS : [];
  const wins = house ? outerWindows(s, lit) : [];
  if (N > 0) {
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const x = gx - PAD, y = gy - PAD;
        const cx = x + 0.5, cy = y + 0.5;
        let t = N;
        if (inLot(x, y) && isIndoor(s, x, y)) {
          t = lit[y * W + x] ? Math.min(N, 0.08) : N * 0.92;
        } else {
          for (const l of lamps) {
            const d = Math.hypot(cx - l.x, cy - l.y);
            if (d < 3.4) t = Math.min(t, N * (0.34 + 0.66 * (d / 3.4) ** 1.5));
          }
          for (const w of wins) {
            const d = Math.hypot(cx - w.x, cy - w.y);
            if (d < 2.6) t = Math.min(t, N * (0.42 + 0.58 * (d / 2.6)));
          }
        }
        grid[gy * GW + gx] = t;
      }
    }
  }
  const at = (x, y) => {
    if (N === 0) return 0;
    const gx = Math.floor(x) + PAD, gy = Math.floor(y) + PAD;
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return N;
    return grid[gy * GW + gx];
  };
  return { N, at, house, lit, litAt, lamps, wins, floor: f };
}

// Está escuro demais para trabalhar direito neste tile?
export function isDarkAt(s, x, y) {
  if (floorOf(s) === 'bunker') return !lightsOn(s, x, y);
  const N = nightLevel(s);
  if (N < 0.45) return false;
  if (isIndoor(s, x, y)) return !lightsOn(s, x, y);
  return true;
}
