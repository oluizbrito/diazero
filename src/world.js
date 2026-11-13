// Consultas sobre o mapa: tiles, paredes (nas bordas dos tiles), objetos e vedação.
import { W, H, OBJ, OUTBREAK_TIME } from './config.js';

export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const inLot = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
export const tileAt = (s, x, y) => (inLot(x, y) ? s.world.tiles[y * W + x] : null);
export const INDOOR_TYPES = new Set(['floor', 'tile', 'wood', 'bath', 'attic', 'concrete']);
export const isIndoorTile = (t) => !!t && INDOOR_TYPES.has(t.type);
export const isIndoor = (s, x, y) => isIndoorTile(tileAt(s, x, y));

// ---- Andares ----
export const floorOf = (s) => s._layer || s.player.floor || 'ground';
export function onFloor(s, f, fn) {
  const prev = s._layer;
  s._layer = f;
  try { return fn(); } finally { s._layer = prev; }
}
export const allObjects = (s) => Object.values(s.floors).flatMap((f) => f.objects);
export function findObject(s, pred) {
  for (const [f, fl] of Object.entries(s.floors)) {
    const o = fl.objects.find(pred);
    if (o) return { o, floor: f };
  }
  return null;
}

// Bordas: 'n:x,y' = borda norte do tile (x,y); 'w:x,y' = borda oeste do tile (x,y)
export const edgeKey = (d, x, y) => `${d}:${x},${y}`;
export function parseEdge(k) {
  const [d, rest] = k.split(':');
  const [x, y] = rest.split(',').map(Number);
  return { d, x, y };
}
export function edgeBetween(x1, y1, x2, y2) {
  if (x2 === x1 && y2 === y1 - 1) return edgeKey('n', x1, y1);
  if (x2 === x1 && y2 === y1 + 1) return edgeKey('n', x1, y2);
  if (y2 === y1 && x2 === x1 - 1) return edgeKey('w', x1, y1);
  if (y2 === y1 && x2 === x1 + 1) return edgeKey('w', x2, y1);
  return null;
}
export function edgeSides(k) {
  const { d, x, y } = parseEdge(k);
  return d === 'n' ? [[x, y - 1], [x, y]] : [[x - 1, y], [x, y]];
}
// Portas, cercas (o Dr. passa pelo portão) e aberturas arrombadas não bloqueiam a passagem
export const wallBlocks = (w) => !!w && w.built && !w.broken && w.type !== 'door' && w.type !== 'fence';
export const canStep = (s, x1, y1, x2, y2) => !wallBlocks(s.world.walls[edgeBetween(x1, y1, x2, y2)]);
// Zumbis: tratam a cerca como passável no planejamento (vão derrubá-la no caminho)
export const zombieStep = (s, x1, y1, x2, y2) => !wallBlocks(s.world.walls[edgeBetween(x1, y1, x2, y2)]);
export const intactFence = (w) => !!w && w.type === 'fence' && w.built;

export function objectAt(s, x, y) {
  for (const o of s.world.objects) {
    if (x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1)) return o;
  }
  return null;
}
export const objById = (s, id) => s.world.objects.find((o) => o.id === id) || null;
export const countBuilt = (s, type, floors = null) => {
  let n = 0;
  for (const [f, fl] of Object.entries(s.floors)) {
    if (floors && !floors.includes(f)) continue;
    for (const o of fl.objects) if (o.type === type && o.built) n++;
  }
  return n;
};

export const isOutbreak = (s) => s.time >= OUTBREAK_TIME;

export function isWalkable(s, x, y) {
  if (!inLot(x, y)) return false;
  if (objectAt(s, x, y)) return false;
  if (isOutbreak(s) && !isIndoor(s, x, y)) return false;
  if (floorOf(s) !== 'ground' && !isIndoor(s, x, y)) return false;
  return true;
}

const zFree = (s, x, y) => { const o = objectAt(s, x, y); return !o || o.type === 'spikes'; };
export function zombieWalkable(s, x, y) {
  return inLot(x, y) && zFree(s, x, y) && !isIndoor(s, x, y) && !tileAt(s, x, y).pending;
}
// Zumbi que já invadiu: anda dentro e fora
export function intruderWalkable(s, x, y) {
  return inLot(x, y) && zFree(s, x, y) && !tileAt(s, x, y).pending;
}

// Busca em largura até qualquer tile-objetivo. Retorna lista de [x,y] (sem o início) ou null.
export function findPath(s, sx, sy, goals, walk = isWalkable, step = canStep) {
  const startK = sx + ',' + sy;
  if (goals.has(startK)) return [];
  const prev = new Map([[startK, null]]);
  const q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (prev.has(k) || !walk(s, nx, ny) || !step(s, x, y, nx, ny)) continue;
      prev.set(k, [x, y]);
      if (goals.has(k)) {
        const path = [[nx, ny]];
        let c = [x, y];
        while (c && !(c[0] === sx && c[1] === sy)) {
          path.unshift(c);
          c = prev.get(c[0] + ',' + c[1]);
        }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

// Tiles de onde o personagem consegue interagir com um alvo
export function standTiles(s, target) {
  const out = [];
  if (target.kind === 'obj') {
    const o = objById(s, target.id);
    if (!o) return out;
    const w = o.w || 1, h = o.h || 1;
    for (let x = o.x; x < o.x + w; x++) {
      for (let y = o.y; y < o.y + h; y++) {
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (nx >= o.x && nx < o.x + w && ny >= o.y && ny < o.y + h) continue;
          if (inLot(nx, ny) && canStep(s, nx, ny, x, y)) out.push([nx, ny]);
        }
      }
    }
  } else if (target.kind === 'edge') {
    const sides = edgeSides(target.key);
    for (const [x, y] of sides) {
      if (!inLot(x, y)) continue;
      out.push([x, y]);
      // móvel encostado na janela/porta: alcança por cima dele, a partir dos tiles ao lado
      if (objectAt(s, x, y)) {
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (sides.some(([a, b]) => a === nx && b === ny) || !inLot(nx, ny)) continue;
          if (isIndoor(s, nx, ny) === isIndoor(s, x, y) && canStep(s, x, y, nx, ny)) out.push([nx, ny]);
        }
      }
    }
  } else if (target.kind === 'spot') {
    out.push([target.x, target.y]);
  } else if (target.kind === 'npc') {
    const n = (s.npcs || []).find((q) => q.id === target.id);
    if (n) for (const [dx, dy] of [[0, 0], ...DIRS]) {
      const nx = n.x + dx, ny = n.y + dy;
      if (inLot(nx, ny)) out.push([nx, ny]);
    }
  } else if (target.kind === 'tile') {
    out.push([target.x, target.y]);
    for (const [dx, dy] of DIRS) {
      const nx = target.x + dx, ny = target.y + dy;
      if (inLot(nx, ny) && canStep(s, nx, ny, target.x, target.y)) out.push([nx, ny]);
    }
  }
  return out;
}

// Bordas externas de um andar: tile interno ao lado de tile não-interno
export function perimeterEdges(s) {
  const out = new Set();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isIndoor(s, x, y)) continue;
      for (const [dx, dy] of DIRS) {
        if (!isIndoor(s, x + dx, y + dy)) out.add(edgeBetween(x, y, x + dx, y + dy));
      }
    }
  }
  return [...out];
}

// Vedação de um andar (chaves de borda daquele andar).
// Térreo: buraco = borda externa sem parede. Sótão: o telhado fecha, só os respiros vazam. Bunker: a terra fecha tudo.
export function sealStatusFloor(s, f = floorOf(s)) {
  const breaches = [], unsealed = [], openings = [];
  if (!s.floors[f] || f === 'bunker') return { breaches, unsealed, openings };
  onFloor(s, f, () => {
    for (const k of perimeterEdges(s)) {
      const w = s.world.walls[k];
      if (f === 'ground' && (!w || !w.built || w.broken)) { breaches.push(k); continue; }
      if (!w || !w.built) continue;
      if (w.broken) { breaches.push(k); continue; }
      if (w.type !== 'wall' && w.type !== 'fence') {
        openings.push(k);
        if (!w.sealed) unsealed.push(k);
      }
    }
  });
  return { breaches, unsealed, openings };
}

// Vedação da casa inteira (térreo + sótão). Chaves com prefixo do andar.
export function sealStatus(s) {
  const out = { breaches: [], unsealed: [], openings: [] };
  for (const f of ['ground', 'attic']) {
    const r = sealStatusFloor(s, f);
    for (const k of Object.keys(out)) out[k].push(...r[k].map((e) => f + '|' + e));
  }
  return out;
}

export function objDef(type) {
  return OBJ[type];
}
