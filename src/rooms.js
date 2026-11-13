// Cômodos: áreas internas ligadas sem parede/porta entre elas (portas separam, passagens abertas juntam).
// Cada cômodo tem sua luz, que o jogador acende ou apaga.
import { W, H } from './config.js';
import { isIndoor, onFloor, edgeBetween, DIRS, perimeterEdges, edgeSides } from './world.js';
import { hasPower } from './time.js';

const separates = (w) => !!w && w.built && !w.broken;

function nameFor(f, types) {
  if (f === 'attic') return 'Sótão';
  if (f === 'bunker') return 'Bunker';
  const has = (...t) => t.some((k) => types.has(k));
  const kitchen = has('stove', 'fridge', 'sink');
  const living = has('sofa', 'tv', 'rocker');
  if (has('bed', 'bed2')) return 'Quarto';
  if (has('shower', 'toilet')) return 'Banheiro';
  if (kitchen && living) return 'Cozinha e salas';
  if (kitchen) return 'Cozinha';
  if (has('computer', 'bookcase', 'scienceShelf')) return 'Escritório';
  if (has('tanque', 'washer')) return 'Lavanderia';
  if (living) return 'Sala';
  if (has('diningTable')) return 'Sala de jantar';
  if (has('lab')) return 'Laboratório';
  return 'Cômodo';
}

// Cômodos de um andar: { idx: Int16Array (tile → cômodo ou -1), rooms: [{ key, name, floor, tiles, windows }] }
export function computeRooms(s, f) {
  if (!s.floors[f]) return { idx: new Int16Array(W * H).fill(-1), rooms: [] };
  return onFloor(s, f, () => {
    const idx = new Int16Array(W * H).fill(-1);
    const rooms = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (idx[y * W + x] >= 0 || !isIndoor(s, x, y)) continue;
      const id = rooms.length;
      const tiles = [y * W + x];
      idx[y * W + x] = id;
      for (let i = 0; i < tiles.length; i++) {
        const cx = tiles[i] % W, cy = (tiles[i] / W) | 0;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (!isIndoor(s, nx, ny) || idx[ny * W + nx] >= 0) continue;
          if (separates(s.world.walls[edgeBetween(cx, cy, nx, ny)])) continue;
          idx[ny * W + nx] = id;
          tiles.push(ny * W + nx);
        }
      }
      rooms.push({ key: f + ':' + tiles[0], floor: f, tiles, windows: [] });
    }
    // objetos de cada cômodo → nome
    const types = rooms.map(() => new Set());
    for (const o of s.world.objects) { const r = idx[o.y * W + o.x]; if (r >= 0) types[r].add(o.type); }
    const count = {};
    for (const [i, r] of rooms.entries()) {
      r.name = nameFor(f, types[i]);
      count[r.name] = (count[r.name] || 0) + 1;
    }
    const seen = {};
    for (const r of rooms) if (count[r.name] > 1) r.name += ' ' + (seen[r.name] = (seen[r.name] || 0) + 1);
    // janelas/respiros de cada cômodo que dão para fora
    for (const k of perimeterEdges(s)) {
      const w = s.world.walls[k];
      if (!w || !w.built || (w.type !== 'window' && w.type !== 'vent')) continue;
      const inside = edgeSides(k).find(([x, y]) => isIndoor(s, x, y));
      const r = inside && idx[inside[1] * W + inside[0]];
      if (r >= 0) rooms[r].windows.push(k);
    }
    return { idx, rooms };
  });
}

// O jogador quer esta luz acesa? (padrão: o interruptor geral)
export const roomWanted = (s, r) => (s.lights && r.key in s.lights ? s.lights[r.key] : s.flags.lights !== false);
export const roomLit = (s, r) => hasPower(s) && roomWanted(s, r);

export function setRoomLight(s, r, on) {
  s.lights ||= {};
  s.lights[r.key] = on;
}
export function setAllLights(s, on) {
  s.flags.lights = on;
  s.lights = {};
}

// Todos os cômodos da casa, por andar
export function allRooms(s) {
  return ['ground', 'attic', 'bunker'].filter((f) => s.floors[f]).flatMap((f) => computeRooms(s, f).rooms);
}

// Mapa de tiles acesos de um andar
export function litTiles(s, f) {
  const R = computeRooms(s, f);
  const lit = new Uint8Array(W * H);
  if (hasPower(s)) for (const r of R.rooms) if (roomWanted(s, r)) for (const t of r.tiles) lit[t] = 1;
  return { lit, R };
}
