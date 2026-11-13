// Andares extras: sótão (acima do térreo) e bunker (escavado embaixo do terreno).
import { W, H, OBJ, FLOORS } from './config.js';
import { onFloor, isIndoor, isIndoorTile, inLot, perimeterEdges, findObject } from './world.js';
import { placePlayerNear } from './player.js';
import { bus, toast } from './bus.js';

function newObj(s, type, x, y, data = {}) {
  const d = OBJ[type];
  return { id: s.nextId++, type, x, y, w: d.w || 1, h: d.h || 1, built: true, data };
}

// O sótão tem a mesma planta do térreo: cada piso interno do térreo tem um piso de sótão em cima.
export function syncAttic(s) {
  const a = s.floors.attic;
  if (!a) return;
  const g = s.floors.ground;
  for (let i = 0; i < W * H; i++) {
    const t = g.tiles[i];
    const indoor = isIndoorTile(t) && t.type !== 'attic' && t.type !== 'concrete';
    if (indoor && a.tiles[i].type !== 'attic') a.tiles[i] = { type: 'attic' };
  }
  // respiros que deixaram de ficar na borda (a casa cresceu) viram parede comum
  onFloor(s, 'attic', () => {
    const per = new Set(perimeterEdges(s));
    for (const [k, w] of Object.entries(a.walls)) if (w.type === 'vent' && !per.has(k)) delete a.walls[k];
  });
}

export function ensureAttic(s, hx, hy) {
  if (!s.floors.attic) {
    const tiles = Array.from({ length: W * H }, () => ({ type: 'void' }));
    s.floors.attic = { tiles, walls: {}, objects: [] };
    syncAttic(s);
    const a = s.floors.attic;
    // dois respiros no telhado: aberturas que precisam ser vedadas
    onFloor(s, 'attic', () => {
      // nas paredes do fundo (norte e oeste), onde dá para ver
      const per = perimeterEdges(s).map((k) => { const [d, r] = k.split(':'); const [x, y] = r.split(',').map(Number); return { k, d, x, y }; });
      const back = (d, a, b) => {
        const c = per.filter((e) => e.d === d && onFloor(s, 'attic', () => isIndoor(s, e.x, e.y)));
        if (!c.length) return null;
        const m = Math.min(...c.map((e) => e[a]));
        const row = c.filter((e) => e[a] === m).sort((p, q) => p[b] - q[b]);
        return row[Math.floor(row.length / 2)].k;
      };
      const pick = [back('n', 'y', 'x'), back('w', 'x', 'y')].filter(Boolean);
      for (const k of pick) a.walls[k] = { type: 'vent', built: true, sealed: false };
    });
    // caixas antigas do Dr.: cadernos de pesquisa de 30 anos atrás
    const spot = farthestIndoor(s, 'attic', hx, hy);
    if (spot) a.objects.push(newObj(s, 'boxes', spot[0], spot[1], { searched: false }));
  }
  s.floors.attic.objects.push(newObj(s, 'atticHatch', hx, hy));
}

function farthestIndoor(s, f, hx, hy) {
  let best = null, bd = -1;
  onFloor(s, f, () => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isIndoor(s, x, y)) continue;
      const d = Math.abs(x - hx) + Math.abs(y - hy);
      if (d > bd) { bd = d; best = [x, y]; }
    }
  });
  return best;
}

export function ensureBunker(s, hx, hy) {
  if (!s.floors.bunker) {
    const tiles = Array.from({ length: W * H }, () => ({ type: 'earth' }));
    s.floors.bunker = { tiles, walls: {}, objects: [], hatchSealed: false };
  }
  const b = s.floors.bunker;
  // sala inicial 2×2 em volta da escada
  const x0 = hx + 1 < W ? hx : hx - 1, y0 = hy + 1 < H ? hy : hy - 1;
  for (let y = y0; y <= y0 + 1; y++) for (let x = x0; x <= x0 + 1; x++) if (inLot(x, y)) b.tiles[y * W + x] = { type: 'concrete' };
  b.objects.push(newObj(s, 'bunkerLadder', hx, hy));
}

// Depois de concluir uma obra que liga andares
export function onBuilt(s, o) {
  if (o.type === 'ladder') {
    ensureAttic(s, o.x, o.y);
    toast('Sótão aberto! Use a escada para subir.', 'good');
  }
  if (o.type === 'bunkerHatch') {
    ensureBunker(s, o.x, o.y);
    toast('Bunker aberto! Desça pelo alçapão e escave para ampliar.', 'good');
  }
}

// Leva o jogador para outro andar, ao lado da escada correspondente
export function changeFloor(s, to) {
  const link = { attic: 'atticHatch', ground: null, bunker: 'bunkerLadder' };
  const from = s.player.floor;
  let anchor;
  if (to === 'ground') {
    const type = from === 'attic' ? 'ladder' : 'bunkerHatch';
    anchor = s.floors.ground.objects.find((o) => o.type === type);
  } else anchor = s.floors[to]?.objects.find((o) => o.type === link[to]);
  if (!anchor) return false;
  s.player.floor = to;
  s.player.path = [];
  placePlayerNear(s, anchor.x, anchor.y);
  bus.emit('floor', to);
  toast(FLOORS[to].name, 'info');
  return true;
}

export const hasFloor = (s, f) => !!s.floors[f];
export const ladderOf = (s) => findObject(s, (o) => o.type === 'ladder');
