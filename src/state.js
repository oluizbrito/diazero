// Criação do estado inicial e salvamento.
import { W, H, START_TIME, START_MONEY, OBJ } from './config.js';
import { edgeKey } from './world.js';

const SAVE_KEY = 'diazero.save.v1';

// garagem: vaga de concreto encostada na parede leste (quarto), com a entrada de carro descendo até a rua
const CARPORT = { x: 16, y: 7, w: 2, h: 5 };
const CAR_SPOT = [17, 9];

export function createNewGame() {
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push({ type: 'grass' });
  const setTile = (x, y, type) => (tiles[y * W + x] = { type });
  const rect = (x0, y0, x1, y1, type) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTile(x, y, type);
  };

  // Casa de um idoso (x 3..15, y 3..11):
  //  fundos  → cozinha | sala de jantar | escritório
  //  frente  → banheiro + lavanderia | corredor | sala de estar | quarto
  rect(3, 3, 6, 6, 'tile'); // cozinha
  rect(7, 3, 10, 6, 'floor'); // sala de jantar
  rect(11, 3, 15, 6, 'wood'); // escritório
  rect(3, 7, 5, 8, 'bath'); // banheiro
  rect(3, 9, 5, 11, 'tile'); // lavanderia
  rect(6, 7, 6, 11, 'floor'); // corredor
  rect(7, 7, 12, 11, 'floor'); // sala de estar
  rect(13, 7, 15, 11, 'floor'); // quarto
  rect(10, 12, 10, H - 1, 'path'); // caminho até a calçada
  rect(CARPORT.x, CARPORT.y, CARPORT.x + CARPORT.w - 1, H - 1, 'drive'); // garagem coberta colada ao quarto + entrada até a rua
  rect(1, 4, 2, 6, 'path'); // quintalzinho da cozinha

  const walls = {};
  const wall = (d, x, y, type = 'wall', extra = {}) => (walls[edgeKey(d, x, y)] = { type, built: true, sealed: false, ...extra });
  for (let x = 3; x <= 15; x++) { wall('n', x, 3); wall('n', x, 12); }
  for (let y = 3; y <= 11; y++) { wall('w', 3, y); wall('w', 16, y); }
  // divisórias internas
  // cozinha | jantar: sem parede, separados só pelo balcão (península)
  for (const y of [3, 5, 6]) wall('w', 11, y); // jantar | escritório
  wall('w', 11, 4, 'door');
  for (const x of [11, 12, 13, 14, 15]) wall('n', x, 7); // escritório | sala e quarto
  for (const x of [3, 4, 5]) wall('n', x, 7); // cozinha | banheiro
  // cozinha | corredor: passagem aberta, sem porta
  for (const x of [3, 4, 5]) wall('n', x, 9); // banheiro | lavanderia
  wall('w', 6, 7); wall('w', 6, 8, 'door'); // banheiro
  wall('w', 6, 9); wall('w', 6, 10, 'door'); wall('w', 6, 11); // lavanderia
  for (const y of [7, 8, 9, 11]) wall('w', 13, y); // sala | quarto
  wall('w', 13, 10, 'door');
  // janelas (com cortinas) e portas externas
  const win = (d, x, y, curtain) => wall(d, x, y, 'window', { curtain });
  win('n', 5, 3, '#f2d27a'); // sobre a pia
  win('n', 9, 3, '#c98a8a');
  win('n', 13, 3, '#8fa8c8');
  win('w', 3, 7, '#bcd8e8');
  win('w', 3, 10, '#f2d27a');
  win('w', 16, 4, '#8fa8c8');
  win('w', 16, 9, '#c9a0b8');
  win('n', 4, 12, '#f2d27a');
  win('n', 8, 12, '#c98a8a');
  win('n', 12, 12, '#c98a8a');
  win('n', 14, 12, '#c9a0b8');
  wall('w', 3, 5, 'door'); // porta da cozinha para o quintal
  wall('n', 10, 12, 'door'); // porta da frente
  // decoração nas paredes
  const decor = (d, x, y, kind) => { walls[edgeKey(d, x, y)].decor = kind; };
  decor('n', 4, 3, 'kcab'); decor('n', 6, 3, 'kcab');
  decor('w', 3, 4, 'calendar');
  decor('n', 8, 3, 'picture');
  decor('n', 14, 3, 'diploma'); decor('n', 15, 3, 'board');
  decor('w', 3, 8, 'mirror'); decor('w', 3, 9, 'shelfWall');
  decor('n', 11, 7, 'picture'); decor('n', 12, 7, 'photos');
  decor('w', 13, 9, 'picture');

  const rugs = [
    { x: 10, y: 8, w: 3, h: 2, c: '#9c3f3a', b: '#e2c48a' }, // sala
    { x: 14, y: 9, w: 2, h: 2, c: '#7a6aa0', b: '#e8dcc0' }, // quarto
  ];

  const objects = [];
  const s0 = { nextId: 1 };
  const add = (type, x, y, data = {}) => {
    const d = OBJ[type];
    objects.push({ id: s0.nextId++, type, x, y, w: d.w || 1, h: d.h || 1, built: true, data });
  };
  // cozinha
  add('fridge', 3, 3); add('sink', 5, 3); add('stove', 6, 3); add('claypot', 3, 6);
  add('peninsula', 7, 3);
  // sala de jantar
  add('grandClock', 10, 3);
  add('diningTable', 8, 5);
  add('chair', 7, 5, { dir: 'e' }); add('chair', 8, 6, { dir: 'n' });
  // escritório
  add('bookcase', 11, 3); add('computer', 13, 3); add('deskChair', 13, 4, { dir: 'n' }); add('scienceShelf', 15, 4);
  // banheiro
  add('bathSink', 3, 7); add('toilet', 4, 7); add('shower', 5, 7);
  // lavanderia (com a despensa)
  add('tanque', 3, 10); add('shelf', 3, 11);
  // sala de estar
  add('tv', 11, 7); add('coffeeTable', 11, 9); add('sofa', 11, 10); add('floorLamp', 12, 11);
  add('rocker', 8, 10, { dir: 'e' }); add('radio', 9, 10);
  // quarto
  add('bed2', 14, 7); add('nightstand', 13, 7);
  // lado de fora
  add('car', CAR_SPOT[0], CAR_SPOT[1]);
  add('tree', 2, 2);
  add('tree', 2, 14);
  add('tree', 18, 3);
  add('tree', 7, 15);

  return attachWorld({
    version: 2,
    time: START_TIME,
    money: START_MONEY,
    stock: { comida: 4, agua: 0, sementes: 0, kitMedico: 0, madeira: 0, tijolo: 0, metal: 0, vedacao: 0, reagentes: 0, amostra: 0 },
    needs: { hunger: 80, thirst: 75, energy: 90, health: 100, contamination: 0 },
    floors: { ground: { tiles, walls, objects, rugs, carport: { ...CARPORT } } },
    nextId: s0.nextId,
    research: { pts: 0, unlocked: 1 },
    player: freshPlayer(9, 8),
    flags: { intro: false, lights: true, outbreak: false, gameOver: null, newsSeen: -99, notified: {}, intruders: [] },
  });
}

// s.world aponta para o andar "atual": o que está sendo simulado/desenhado (s._layer) ou o do jogador.
export function attachWorld(s) {
  Object.defineProperty(s, 'world', {
    get() { return this.floors[this._layer || this.player.floor] || this.floors.ground; },
    enumerable: false,
    configurable: true,
  });
  return s;
}

export function freshPlayer(x, y, floor = 'ground') {
  return { x, y, px: x + 0.5, py: y + 0.5, path: [], task: null, queue: [], facing: 1, walk: 0, hidden: false, floor };
}

// Saves da v0.1 (um andar só) viram o térreo
function migrate(s) {
  if (s.version === 1) {
    s.floors = { ground: s.world };
    s.nextId = s.world.nextId;
    delete s.world.nextId;
    delete s.world;
    s.version = 2;
  }
  s.research ||= { pts: 0, unlocked: 1 };
  s.stock.reagentes ||= 0;
  s.stock.amostra ||= 0;
  s.flags.intruders ||= [];
  moveGarage(s);
  return s;
}

// saves antigos: a garagem era uma faixa solta na frente; vira a vaga ao lado da casa
function moveGarage(s) {
  const g = s.floors.ground;
  if (g.carport) return;
  const car = g.objects.find((o) => o.type === 'car');
  const { x, y, w, h } = CARPORT;
  const at = (tx, ty) => g.tiles[ty * W + tx];
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    if (at(tx, ty).type !== 'grass') return;
    if (g.objects.some((o) => o !== car && tx >= o.x && tx < o.x + (o.w || 1) && ty >= o.y && ty < o.y + (o.h || 1))) return;
  }
  for (let ty = y; ty < H; ty++) for (let tx = x; tx < x + w; tx++) {
    const t = at(tx, ty);
    if (t.type === 'grass' || t.type === 'path') g.tiles[ty * W + tx] = { type: 'drive' };
  }
  if (car) { car.x = CAR_SPOT[0]; car.y = CAR_SPOT[1]; }
  g.carport = { ...CARPORT };
}

export function saveGame(s) {
  try {
    const data = JSON.stringify(s, (k, v) => (k === 'npcs' || k.startsWith('_') ? undefined : v));
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version !== 1 && s.version !== 2) return null;
    migrate(s);
    const p = s.player;
    s.player = { ...freshPlayer(p.x, p.y, p.floor || 'ground'), facing: p.facing };
    return attachWorld(s);
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
