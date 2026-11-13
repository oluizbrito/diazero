// Moradores da cidade: cada um com casa, perfil e rotina diária própria.
// Andam pelas calçadas, faixas de pedestre e praças; entram e saem dos prédios.
import { W, H, DAY } from './config.js';
import { CITY, BUILDINGS, TREES, PARK_TILES, groundType, crosswalk } from './city.js';
import { inLot, isOutbreak } from './world.js';
import { minuteOfDay, dayIndex } from './time.js';
import { dread } from './mood.js';
import { stepAlong } from './player.js';
import { houseStyle } from './buildings.js';

// ---------------- Grade de caminhada ----------------
const X0 = CITY.x0, Y0 = CITY.y0, GW = CITY.x1 - CITY.x0, GH = CITY.y1 - CITY.y0;
const WALK = new Uint8Array(GW * GH);
const gi = (x, y) => (y - Y0) * GW + (x - X0);
const inGrid = (x, y) => x >= X0 && y >= Y0 && x < X0 + GW && y < Y0 + GH;
export const walkable = (x, y) => inGrid(x, y) && WALK[gi(x, y)] === 1;

for (let y = Y0; y < Y0 + GH; y++) {
  for (let x = X0; x < X0 + GW; x++) {
    if (inLot(x, y)) continue; // o terreno do jogador é particular
    const g = groundType(x, y);
    if (g === 'sidewalk' || g === 'ground' || g === 'grass' || (g === 'street' && crosswalk(x, y))) WALK[gi(x, y)] = 1;
  }
}
for (const b of BUILDINGS) for (let x = b.x; x < b.x + b.w; x++) for (let y = b.y; y < b.y + b.d; y++) if (inGrid(x, y)) WALK[gi(x, y)] = 0;
for (const t of TREES) if (inGrid(t.x, t.y)) WALK[gi(t.x, t.y)] = 0;

// Busca em largura na grade da cidade
const prev = new Int32Array(GW * GH);
export function cityPath(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  if (!walkable(tx, ty)) return null;
  prev.fill(-1);
  const start = gi(sx, sy), goal = gi(tx, ty);
  const q = new Int32Array(GW * GH);
  let qh = 0, qt = 0;
  q[qt++] = start;
  prev[start] = start;
  while (qh < qt) {
    const cur = q[qh++];
    if (cur === goal) break;
    const cx = cur % GW, cy = (cur / GW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (prev[ni] !== -1 || !WALK[ni]) continue;
      prev[ni] = cur;
      q[qt++] = ni;
    }
  }
  if (prev[goal] === -1) return null;
  const path = [];
  for (let c = goal; c !== start; c = prev[c]) path.push([(c % GW) + X0, ((c / GW) | 0) + Y0]);
  return path.reverse();
}

// componente conectado à calçada da frente da casa (para descartar portas isoladas)
const REACH = new Uint8Array(GW * GH);
{
  const s0 = gi(12, H);
  const q = [s0];
  REACH[s0] = 1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cx = c % GW, cy = (c / GW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (REACH[ni] || !WALK[ni]) continue;
      REACH[ni] = 1;
      q.push(ni);
    }
  }
}
const reachable = (x, y) => inGrid(x, y) && REACH[gi(x, y)] === 1;
const PARKS = PARK_TILES.filter(([x, y]) => reachable(x, y));
const SIDEWALKS = [];
for (let y = Y0; y < Y0 + GH; y++) for (let x = X0; x < X0 + GW; x++) if (reachable(x, y) && groundType(x, y) === 'sidewalk') SIDEWALKS.push([x, y]);

// ---------------- Lugares (prédios com função) ----------------
export const ROLES = {
  padaria: { label: 'PADARIA', color: '#c8742e', in: 'na padaria', count: 6 },
  mercado: { label: 'MERCADO', color: '#2e8b57', in: 'no mercado', count: 4 },
  farmacia: { label: 'FARMÁCIA', color: '#2a9d8f', in: 'na farmácia', count: 3 },
  escritorio: { label: 'ESCRITÓRIOS', color: '#4b5d78', in: 'no trabalho', count: 6 },
  escola: { label: 'ESCOLA', color: '#3a6ea5', in: 'na escola', count: 3 },
  academia: { label: 'ACADEMIA', color: '#8e44ad', in: 'na academia', count: 2 },
  igreja: { label: 'IGREJA', color: '#8a7f6a', in: 'na igreja', count: 1 },
  bar: { label: 'BAR', color: '#b03a2e', in: 'no bar', count: 3 },
};

// porta: tile andável colado na fachada da frente (de preferência a face com letreiro)
for (const b of BUILDINGS) {
  const front = [];
  const mid = Math.floor(b.w / 2);
  for (let k = 0; k < b.w; k++) { const i = (mid + (k % 2 ? -(k + 1) / 2 : k / 2) + b.w) % b.w; front.push([b.x + i, b.y + b.d, 'y', i]); }
  const midd = Math.floor(b.d / 2);
  for (let k = 0; k < b.d; k++) { const j = (midd + (k % 2 ? -(k + 1) / 2 : k / 2) + b.d) % b.d; front.push([b.x + b.w, b.y + j, 'x', j]); }
  const door = front.find(([x, y]) => reachable(x, y));
  if (door) b.door = { x: door[0], y: door[1], face: door[2], at: door[3] };
}

const hash = (n) => Math.abs(Math.sin(n * 91.345 + 7.13) * 43758.5453) % 1;
const usable = BUILDINGS.filter((b) => b.door && !(b.x >= W && b.y >= H && b.h < 40));
const order = usable.map((b, i) => ({ b, r: hash(b.x * 31 + b.y * 17 + i) })).sort((a, b) => a.r - b.r).map((o) => o.b);
let oi = 0;
export const PLACES = {};
for (const [role, R] of Object.entries(ROLES)) {
  PLACES[role] = [];
  for (let i = 0; i < R.count && oi < order.length; i++) {
    const b = order[oi++];
    b.role = role;
    PLACES[role].push(b);
  }
}
export const HOMES = order.slice(oi);
// casas mais perto da do Dr. primeiro: é ali que moram os vizinhos que ele conhece
export const HOMES_NEAR = HOMES.slice().sort((a, b) =>
  Math.hypot(a.x + a.w / 2 - W / 2, a.y + a.d / 2 - H / 2) - Math.hypot(b.x + b.w / 2 - W / 2, b.y + b.d / 2 - H / 2));
// tudo que não é comércio vira casa de condomínio
for (const b of BUILDINGS) if (!b.role) houseStyle(b);

// ---------------- Perfis e rotinas ----------------
const NAMES = ['Marta', 'João', 'Ana', 'Carlos', 'Lúcia', 'Pedro', 'Bia', 'Rafael', 'Sônia', 'Diego', 'Júlia', 'Paulo', 'Clara', 'Mateus',
  'Rosa', 'André', 'Lívia', 'Tiago', 'Helena', 'Bruno', 'Fernanda', 'Caio', 'Vera', 'Gustavo', 'Isabel', 'Renato', 'Camila', 'Hugo',
  'Nair', 'Igor', 'Teresa', 'Fábio', 'Alice', 'Otávio', 'Neusa', 'Léo',
  'Beatriz', 'Samuel', 'Gabriela', 'Vítor', 'Larissa', 'Eduardo', 'Jéssica', 'Márcio', 'Patrícia', 'Rogério', 'Sandra', 'Wagner',
  'Daniela', 'Luís', 'Cristina', 'Murilo', 'Valéria', 'Henrique', 'Aline', 'Sérgio', 'Mônica', 'Raul', 'Elisa', 'Jorge'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a86b3c'];
const HAIRS = ['#3b2a20', '#1d1d1d', '#a0522d', '#d9c27a', '#c9ccd3', '#6b4423'];
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hm = (h, m = 0) => h * 60 + m;

const PERSONAS = {
  escritorio: {
    label: 'Trabalha em escritório', shirts: ['#e8ecf2', '#9db4d4', '#c9d3df'], pants: '#2c3446',
    plan: () => {
      const wake = rnd(hm(6), hm(7));
      const p = [{ go: 'padaria', at: wake + 20, stay: rnd(10, 20) }];
      p.push({ go: 'escritorio', at: hm(8), stay: rnd(hm(7, 30), hm(8, 30)) });
      if (chance(0.45)) p.push({ go: 'mercado', at: hm(16, 45), stay: rnd(15, 30) });
      if (chance(0.1)) p.push({ go: 'bar', at: hm(18, 30), stay: rnd(60, 120) });
      return p;
    },
  },
  tranquilo: {
    label: 'Rotina tranquila', shirts: ['#b7a98f', '#8f9a83', '#a78f8f'], pants: '#5a5246',
    plan: () => {
      const wake = rnd(hm(5, 30), hm(6, 30));
      const p = [{ go: 'padaria', at: wake + 15, stay: rnd(15, 30) }, { go: 'praca', at: hm(8), stay: rnd(60, 120) }];
      if (chance(0.45)) p.push({ go: 'farmacia', at: hm(14), stay: rnd(10, 20) });
      if (chance(0.35)) p.push({ go: 'igreja', at: hm(15, 30), stay: rnd(45, 75) });
      return p;
    },
  },
  estudante: {
    label: 'Estudante', shirts: ['#e85d75', '#50c8c6', '#f5a623', '#7ed321'], pants: '#3a4a7a',
    plan: () => {
      const p = [{ go: 'escola', at: hm(7), stay: rnd(hm(4, 45), hm(5, 15)) }];
      if (chance(0.45)) p.push({ go: 'academia', at: hm(14), stay: rnd(60, 90) });
      else p.push({ go: 'praca', at: hm(14, 30), stay: rnd(40, 90) });
      if (chance(0.08)) p.push({ go: 'bar', at: hm(19), stay: rnd(60, 120) });
      return p;
    },
  },
  noturno: {
    label: 'Vida noturna', shirts: ['#2d2d35', '#5a2a3a', '#3a3a5a'], pants: '#1d1d24',
    plan: () => {
      const p = [{ go: 'padaria', at: rnd(hm(10), hm(11)), stay: rnd(15, 25) }];
      if (chance(0.6)) p.push({ go: 'mercado', at: hm(15), stay: rnd(20, 40) });
      p.push({ go: 'bar', at: rnd(hm(19, 30), hm(20, 30)), stay: rnd(hm(2), hm(3, 30)) });
      return p;
    },
  },
  atleta: {
    label: 'Atleta', shirts: ['#ff6b35', '#00b4d8', '#e63946'], pants: '#22223b',
    plan: () => {
      const p = [{ go: 'corrida', at: rnd(hm(5, 40), hm(6, 10)), stay: rnd(40, 60) }];
      if (chance(0.5)) p.push({ go: 'escritorio', at: hm(9), stay: rnd(hm(7), hm(8)) });
      else p.push({ go: 'academia', at: hm(10), stay: rnd(60, 120) });
      if (chance(0.4)) p.push({ go: 'mercado', at: hm(16, 30), stay: rnd(15, 30) });
      return p;
    },
  },
  casa: {
    label: 'Cuida da casa', shirts: ['#d98cb3', '#9fc5a8', '#f2c94c'], pants: '#4a4a5a',
    plan: () => {
      const p = [{ go: 'padaria', at: rnd(hm(6, 30), hm(7, 30)), stay: rnd(10, 20) }, { go: 'mercado', at: hm(9), stay: rnd(30, 50) }];
      if (chance(0.3)) p.push({ go: 'farmacia', at: hm(11), stay: rnd(10, 20) });
      if (chance(0.4)) p.push({ go: 'praca', at: hm(14, 30), stay: rnd(45, 90) });
      return p;
    },
  },
};
const PERSONA_KEYS = ['escritorio', 'escritorio', 'escritorio', 'tranquilo', 'tranquilo', 'estudante', 'estudante', 'noturno', 'atleta', 'atleta', 'casa', 'casa'];

const GOING = {
  padaria: 'indo à padaria', mercado: 'indo ao mercado', farmacia: 'indo à farmácia', escritorio: 'indo ao trabalho',
  escola: 'indo à escola', academia: 'indo à academia', igreja: 'indo à igreja', bar: 'indo ao bar', praca: 'indo à praça',
  corrida: 'correndo', casa: 'voltando para casa',
};

// Plano do dia ajustado pela tensão: mais gente fica em casa e corre ao mercado
function makePlan(c, s) {
  const d = dread(s);
  let plan = PERSONAS[c.persona].plan().filter((it) => !chance(d * 0.75));
  if (chance(d * 0.9)) plan.push({ go: 'mercado', at: rnd(hm(8), hm(16)), stay: rnd(20, 50), panic: true });
  if (dayIndex(s.time) >= 0) plan = plan.filter((it) => it.at < hm(10) && chance(0.3)); // Dia 0: quase ninguém sai
  return plan.sort((a, b) => a.at - b.at);
}

function nearestPlace(role, x, y, exact = false) {
  const list = PLACES[role] || [];
  if (!list.length) return null;
  const sorted = list.slice().sort((a, b) => Math.abs(a.door.x - x) + Math.abs(a.door.y - y) - (Math.abs(b.door.x - x) + Math.abs(b.door.y - y)));
  return sorted[exact || chance(0.8) ? 0 : Math.min(1, sorted.length - 1)];
}

function jogTarget(x, y) {
  let best = pick(SIDEWALKS);
  for (let i = 0; i < 60; i++) {
    const p = pick(SIDEWALKS);
    const dd = Math.abs(p[0] - x) + Math.abs(p[1] - y);
    if (dd >= 10 && dd <= 26) return p;
  }
  return best;
}

function nearestPark(x, y) {
  let best = null, bd = 1e9;
  for (let i = 0; i < 40; i++) {
    const p = pick(PARKS);
    const dd = Math.abs(p[0] - x) + Math.abs(p[1] - y);
    if (dd < bd) { bd = dd; best = p; }
  }
  return best;
}

// ---------------- Moradores ----------------
let nextId = 1;
function newCitizen(i, s) {
  const persona = PERSONA_KEYS[i % PERSONA_KEYS.length];
  const P = PERSONAS[persona];
  // famílias de 2 a 3 pessoas dividem a mesma casa
  const home = HOMES_NEAR[Math.floor(i * 0.4) % HOMES_NEAR.length];
  const c = {
    id: nextId++, mode: 'citizen', name: NAMES[i % NAMES.length], persona,
    home, shirt: pick(P.shirts), pants: P.pants, skin: pick(SKINS), hair: pick(HAIRS),
    x: home.door.x, y: home.door.y, px: home.door.x + 0.5, py: home.door.y + 0.5, path: [],
    state: 'inside', at: home, until: 0, alpha: 0, facing: 1, walk: 0, moving: false,
    plan: [], planDay: null, step: 0, activity: 'em casa', zombie: false, mask: false,
    // cada um no seu passo (casas por minuto de jogo; o Dr. anda a 0.35)
    speed: { tranquilo: rnd(0.14, 0.2), estudante: rnd(0.24, 0.33), atleta: rnd(0.25, 0.32), escritorio: rnd(0.22, 0.3) }[persona] ?? rnd(0.18, 0.28),
    stride: rnd(5, 7.5), // cadência da passada
    gaitPh: rnd(0, 100), // fase do vai-e-vem de velocidade
    pause: 0, // parado na calçada (olhando o celular, uma vitrine…)
  };
  return c;
}

function departTo(c, s, item) {
  let tx, ty, place = null;
  if (item.go === 'casa') { place = c.home; [tx, ty] = [place.door.x, place.door.y]; }
  else if (item.go === 'praca') [tx, ty] = nearestPark(c.home.door.x, c.home.door.y) || [c.x, c.y];
  else if (item.go === 'corrida') [tx, ty] = jogTarget(c.x, c.y);
  else {
    // cada morador tem os "seus" lugares: os mais próximos de casa
    c.fav ||= {};
    if (!c.fav[item.go]) c.fav[item.go] = nearestPlace(item.go, c.home.door.x, c.home.door.y, true);
    place = c.fav[item.go];
    if (!place) return false;
    [tx, ty] = [place.door.x, place.door.y];
  }
  const path = cityPath(c.x, c.y, tx, ty);
  if (!path) return false;
  c.path = path;
  c.target = { item, place };
  c.state = 'walking';
  c.at = null;
  c.activity = item.panic ? 'correndo ao mercado' : GOING[item.go];
  c.mask = !c.zombie && chance(0.1 + 0.9 * dread(s));
  return true;
}

function arrive(c, s) {
  const { item, place } = c.target;
  const now = s.time;
  if (item.go === 'corrida') {
    // mais um trecho de corrida ou volta para casa
    if ((c.jogLeft = (c.jogLeft ?? 3) - 1) > 0) { departTo(c, s, item); return; }
    c.jogLeft = undefined;
    departTo(c, s, { go: 'casa' });
    return;
  }
  if (item.go === 'praca') {
    c.state = 'linger';
    c.until = now + item.stay;
    c.activity = 'passeando na praça';
    return;
  }
  c.state = 'entering';
  c.at = place;
  c.until = now + (item.go === 'casa' ? 0 : item.stay);
  c.activity = item.go === 'casa' ? 'em casa' : ROLES[item.go]?.in || item.go;
}

function nextFromPlan(c, s) {
  const m = minuteOfDay(s.time);
  // descarta compromissos que já passaram muito do horário
  while (c.step < c.plan.length && c.plan[c.step].at + 120 < m) c.step++;
  return c.plan[c.step] || null;
}

function updateCitizen(c, s, dt) {
  const now = s.time;
  const m = minuteOfDay(now);
  const day = dayIndex(now);

  // fade de entrar/sair dos prédios
  if (c.state === 'entering') {
    c.alpha = Math.max(0, c.alpha - 0.15 * dt);
    if (c.alpha <= 0) c.state = 'inside';
    return;
  }
  if (c.state !== 'inside' && c.alpha < 1) c.alpha = Math.min(1, c.alpha + 0.15 * dt);

  if (c.state === 'walking') {
    const jog = c.target?.item.go === 'corrida';
    const panic = 1 + 0.8 * dread(s);
    // paradinhas de vez em quando (não quando corre ou está em pânico)
    if (c.pause > 0) { c.pause -= dt; c.moving = false; return; }
    if (!jog && dread(s) < 0.4 && chance(0.006 * dt)) { c.pause = rnd(1.5, 6); c.moving = false; return; }
    // ritmo que oscila devagar: ninguém anda em velocidade constante
    const gait = 1 + 0.15 * Math.sin(now / 9 + c.gaitPh) + 0.07 * Math.sin(now / 3.3 + c.gaitPh * 2.1);
    stepAlong(c, c.speed * (jog ? 2.1 : 1) * panic * gait * dt);
    c.walk += jog ? dt * 0.5 : 0;
    if (!c.path.length) arrive(c, s);
    return;
  }
  if (c.state === 'linger') {
    // passeia devagar pela praça
    if (!c.path.length && chance(0.02 * dt)) {
      const t = [c.x + Math.round(rnd(-3, 3)), c.y + Math.round(rnd(-3, 3))];
      if (walkable(...t)) c.path = cityPath(c.x, c.y, ...t) || [];
    }
    if (c.path.length) stepAlong(c, c.speed * 0.45 * dt);
    else c.moving = false;
    if (now >= c.until) leaveFor(c, s);
    return;
  }
  // dentro de um prédio
  if (c.at === c.home) {
    if (c.planDay !== day && m > hm(4)) { c.plan = makePlan(c, s); c.planDay = day; c.step = 0; }
    const item = nextFromPlan(c, s);
    if (item && m >= item.at && m < hm(23, 30)) { c.step++; departTo(c, s, item); }
  } else if (now >= c.until) {
    leaveFor(c, s);
  }
}

// sai do lugar atual: vai direto ao próximo compromisso ou passa em casa
function leaveFor(c, s) {
  const item = nextFromPlan(c, s);
  const m = minuteOfDay(s.time);
  if (item && item.at - m < 60) { c.step++; if (departTo(c, s, item)) return; }
  departTo(c, s, { go: 'casa' });
}

// ---------------- Zumbis pela cidade ----------------
function roam(z, s) {
  for (let i = 0; i < 6; i++) {
    // um terço deles se aproxima da casa do jogador
    const near = chance(0.33);
    const bx = near ? W / 2 : z.x, by = near ? H / 2 : z.y;
    const t = [Math.round(bx + rnd(-16, 16)), Math.round(by + rnd(-16, 16))];
    if (!walkable(...t)) continue;
    const path = cityPath(z.x, z.y, ...t);
    if (path) { z.path = path; return; }
  }
}

function turnZombie(c) {
  Object.assign(c, { zombie: true, mask: false, skin: '#8fbf7a', state: 'roam', activity: 'vagando sem rumo', at: null, wait: rnd(0, 30), path: [], speed: rnd(0.1, 0.15) });
}

function updateZombie(z, s, dt) {
  if (z.alpha < 1) z.alpha = Math.min(1, z.alpha + 0.15 * dt);
  if (z.path.length) { stepAlong(z, z.speed * dt); return; }
  z.moving = false;
  z.wait -= dt;
  if (z.wait <= 0) { z.wait = rnd(10, 80); roam(z, s); }
}

// ---------------- API ----------------
export const CITIZEN_COUNT = 60;

export function initCitizens(s) {
  const list = [];
  const out = isOutbreak(s);
  for (let i = 0; i < CITIZEN_COUNT; i++) {
    const c = newCitizen(i, s);
    if (out) {
      // depois do Dia 0: já espalhados pela cidade como zumbis
      const [x, y] = pick(SIDEWALKS);
      Object.assign(c, { x, y, px: x + 0.5, py: y + 0.5, alpha: 1 });
      turnZombie(c);
    } else {
      c.plan = makePlan(c, s);
      c.planDay = dayIndex(s.time);
      // começa onde a rotina manda estar agora
      const m = minuteOfDay(s.time);
      c.step = 0;
      for (let k = 0; k < c.plan.length; k++) {
        const it = c.plan[k];
        if (m >= it.at && m < it.at + it.stay) {
          const place = it.go === 'praca' || it.go === 'corrida' ? null : nearestPlace(it.go, c.home.door.x, c.home.door.y, true);
          if (place) { Object.assign(c, { at: place, until: it.at + it.stay - m + s.time, x: place.door.x, y: place.door.y, px: place.door.x + 0.5, py: place.door.y + 0.5, activity: ROLES[it.go].in }); c.step = k + 1; }
          break;
        }
        if (it.at + it.stay <= m) c.step = k + 1;
      }
    }
    list.push(c);
  }
  return list;
}

export function onOutbreakCitizens(s) {
  for (const c of s.npcs) {
    if (c.mode !== 'citizen') continue;
    if (c.state === 'walking' || c.state === 'linger') turnZombie(c);
    else c.emergeAt = s.time + rnd(10, 600); // quem estava dentro sai infectado aos poucos
  }
}

export function updateCitizens(s, dt) {
  for (const c of s.npcs) {
    if (c.mode !== 'citizen') continue;
    if (c.busy) continue; // está na porta do Dr. (evento)
    if (c.zombie) { updateZombie(c, s, dt); continue; }
    if (c.emergeAt != null) {
      if (s.time >= c.emergeAt) {
        const door = (c.at || c.home).door;
        Object.assign(c, { x: door.x, y: door.y, px: door.x + 0.5, py: door.y + 0.5, alpha: 0, emergeAt: null });
        turnZombie(c);
      }
      continue;
    }
    updateCitizen(c, s, dt);
  }
}

// O lugar "de sempre" do morador para cada tipo de estabelecimento
export function favPlace(c, role) {
  c.fav ||= {};
  if (!(role in c.fav)) c.fav[role] = nearestPlace(role, c.home.door.x, c.home.door.y, true);
  return c.fav[role];
}

export const isVisibleCitizen = (c) => c.mode === 'citizen' && c.state !== 'inside' && c.emergeAt == null && c.alpha > 0;
export const citizenInfo = (c) => ({ name: c.name, persona: c.zombie ? 'Já não é mais quem era' : PERSONAS[c.persona].label, activity: c.activity });

export { DAY };
