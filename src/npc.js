// Gente na cidade: moradores com rotina (citizens.js) e, depois do Dia 0, zumbis no quintal.
// Zumbis rondam, forçam portas e janelas (as mais fracas primeiro), derrubam cercas,
// caem nas estacas e, se arrombarem uma abertura, invadem a casa atrás do Dr.
import { W, H, DAY, OUTBREAK_TIME, ZOMBIE_DPS } from './config.js';
import { findPath, zombieWalkable, intruderWalkable, inLot, isOutbreak, onFloor, zombieStep, canStep, edgeBetween, intactFence, objectAt, parseEdge } from './world.js';
import { stepAlong, clearTasks } from './player.js';
import { initCitizens, updateCitizens, onOutbreakCitizens } from './citizens.js';
import { isExteriorOpening, outsideTile, insideTile, hpOf, maxHp, hpFrac, OPENING_NAME } from './siege.js';
import { nightLevel, NIGHT_MAX } from './light.js';
import { attention } from './attention.js';
import { litTiles } from './rooms.js';
import { toast } from './bus.js';

const SHIRTS = ['#e85d75', '#4a90d9', '#f5a623', '#7ed321', '#9b59b6', '#50c8c6', '#ffffff'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const k2 = (x, y) => x + ',' + y;

function zombieBody(x, y) {
  return {
    id: 'z' + Math.random().toString(36).slice(2), x, y, px: x + 0.5, py: y + 0.5, path: [], wait: Math.random() * 60, alpha: 1,
    zombie: true, shirt: pick(SHIRTS), skin: '#8fbf7a', hair: '#3b2a20', facing: 1, walk: 0, moving: false,
    name: 'Desconhecido', activity: 'rondando a casa',
  };
}

// Zumbis que entram no quintal pelas bordas do terreno
function newYardZombie(s) {
  const edges = [];
  for (let x = 0; x < W; x++) edges.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) edges.push([0, y], [W - 1, y]);
  const ok = edges.filter(([x, y]) => zombieWalkable(s, x, y));
  if (!ok.length) return null;
  const [x, y] = pick(ok);
  return { ...zombieBody(x, y), mode: 'yard', z: 'wander' };
}

export function newIntruder(x, y) {
  return { ...zombieBody(x, y), mode: 'intruder', activity: 'dentro da casa!', hitCd: 10, repath: 0 };
}

// Os infectados fogem da claridade: de dia quase não aparecem; à noite vêm em massa.
// Luz e barulho trazem mais deles; escuro e silêncio, menos.
const nightF = (s) => Math.min(1, nightLevel(s) / NIGHT_MAX);
function yardTarget(s) {
  const days = Math.max(0, (s.time - OUTBREAK_TIME) / DAY);
  const horde = Math.min(22, 6 + days * 3);
  const base = 1 + (horde - 1) * nightF(s);
  const hordeNight = s.ev?.horde && s.time < s.ev.horde ? 1.8 : 1; // noite de horda (aviso no rádio)
  return Math.round(base * hordeNight * (0.7 + 0.8 * (s._att?.total ?? 0)));
}

// Sai do terreno pela borda mais distante (passando direto pela casa)
function sendAway(s, n) {
  const edges = [];
  for (let x = 0; x < W; x++) edges.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) edges.push([0, y], [W - 1, y]);
  const far = edges.filter(([x, y]) => zombieWalkable(s, x, y) && Math.abs(x - n.x) + Math.abs(y - n.y) > 10);
  const goal = far.length ? pick(far) : null;
  const path = goal && findPath(s, n.x, n.y, new Set([k2(...goal)]), zombieWalkable, zombieStep);
  if (!path) return false;
  n.path = path; n.z = 'leave'; n.bashing = false;
  n.activity = nightF(s) < 0.3 ? 'fugindo da claridade' : 'passando direto';
  return true;
}

export function initNpcs(s) {
  s.npcs = initCitizens(s);
  if (isOutbreak(s)) onFloor(s, 'ground', () => {
    for (let i = 0; i < yardTarget(s); i++) { const n = newYardZombie(s); if (n) s.npcs.push(n); }
    for (const [x, y] of s.flags.intruders || []) s.npcs.push(newIntruder(x, y));
  });
}

export function onOutbreakNpcs(s) {
  onOutbreakCitizens(s);
  onFloor(s, 'ground', () => { for (let i = 0; i < 4; i++) { const n = newYardZombie(s); if (n) s.npcs.push(n); } });
}

export function updateNpcs(s, dt) {
  if (dt <= 0) return;
  updateCitizens(s, dt);
  onFloor(s, 'ground', () => updateZombies(s, dt));
}

let warnCd = 0;
function warn(s, msg) {
  if (s.time < warnCd) return;
  warnCd = s.time + 90;
  toast(msg, 'bad');
}

function updateZombies(s, dt) {
  if (!isOutbreak(s)) return;
  s._att = attention(s);
  // a cada 15 min: chegam mais (à noite, em bando) ou os que sobram vão embora
  const q = Math.floor(s.time / 15);
  if (s._zQ !== q) {
    s._zQ = q;
    const all = s.npcs.filter((n) => n.mode === 'yard' && !n.dead);
    const yard = all.filter((n) => n.z !== 'leave');
    const target = yardTarget(s);
    if (all.length < target) {
      for (let i = 0; i < Math.min(target - all.length, nightF(s) > 0.5 ? 3 : 1); i++) { const n = newYardZombie(s); if (n) s.npcs.push(n); }
    } else if (yard.length > target + 1) {
      const idle = yard.filter((n) => n.z === 'wander' || (n.z === 'bash' && nightF(s) < 0.3));
      for (const n of idle.slice(0, Math.min(3, yard.length - target))) sendAway(s, n);
    }
  }
  for (const n of s.npcs) {
    if (n.dead) { n.alpha -= dt / 25; n.moving = false; continue; }
    if (n.mode === 'yard') updateYard(s, n, dt);
    else if (n.mode === 'intruder') updateIntruder(s, n, dt);
  }
  const before = s.npcs.length;
  s.npcs = s.npcs.filter((n) => !(n.dead && n.alpha <= 0) && !n.gone);
  if (before !== s.npcs.length || s._intrDirty !== false) {
    s.flags.intruders = s.npcs.filter((n) => n.mode === 'intruder' && !n.dead).map((n) => [n.x, n.y]);
    s._intrDirty = false;
  }
}

// ---------- no quintal ----------
function chooseOpening(s) {
  const list = [];
  const { lit } = litTiles(s, 'ground');
  const night = nightF(s) > 0.4;
  const p = s.player;
  const noisy = (s.noise || 0) > 0.2 && p.floor !== 'bunker' && !p.away;
  for (const [k, w] of Object.entries(s.world.walls)) {
    if (!isExteriorOpening(s, k, w)) continue;
    const out = outsideTile(s, k);
    if (!out || !inLot(...out)) continue;
    // as mais fracas atraem mais; à noite, janela com luz atrás atrai muito; barulho atrai para perto do Dr.
    const ins = insideTile(s, k);
    const litIn = night && ins && lit[ins[1] * W + ins[0]] && (w.rf || 0) < 2;
    const near = noisy && Math.hypot(out[0] - p.x, out[1] - p.y) < 6;
    list.push({ k, out, wgt: (300 / maxHp(w)) * (litIn ? 5 : 1) * (near ? 4 : 1) });
  }
  if (!list.length) return null;
  let r = Math.random() * list.reduce((t, o) => t + o.wgt, 0);
  for (const o of list) { r -= o.wgt; if (r <= 0) return o; }
  return list[list.length - 1];
}

function updateYard(s, n, dt) {
  // armadilha de estacas
  const o = objectAt(s, n.x, n.y);
  if (o && o.type === 'spikes' && o.built && !n.moving) {
    n.dead = true;
    o.data.uses = (o.data.uses ?? 3) - 1;
    if (o.data.uses <= 0) s.world.objects = s.world.objects.filter((q) => q !== o);
    if (!s._spikeMsg || s.time - s._spikeMsg > 180) { s._spikeMsg = s.time; toast('As estacas pegaram um infectado.', 'good'); }
    return;
  }

  if (n.z === 'bash') return bash(s, n, dt);

  if (n.path.length) {
    // cerca no caminho: derruba antes de passar
    const [nx, ny] = n.path[0];
    const ek = edgeBetween(n.x, n.y, nx, ny);
    const w = ek && s.world.walls[ek];
    if (intactFence(w) && Math.abs(n.px - n.x - 0.5) < 0.05 && Math.abs(n.py - n.y - 0.5) < 0.05) {
      n.z = 'bash'; n.bashKey = ek; n.bashT = 0; n.giveUp = 120 + Math.random() * 120;
      return;
    }
    stepAlong(n, 0.08 * dt);
    if (!n.path.length && n.z === 'leave') { n.gone = true; return; }
    if (!n.path.length && n.z === 'go') {
      n.z = 'bash'; n.bashT = 0; n.giveUp = 60 + Math.random() * 150;
      n.activity = 'forçando a ' + OPENING_NAME[s.world.walls[n.bashKey]?.type];
    }
    return;
  }
  n.moving = false;
  n.wait -= dt;
  if (n.wait > 0) return;
  n.wait = 20 + Math.random() * 90;
  n.activity = 'rondando a casa';
  // luz e barulho chamam; no escuro e no silêncio eles perdem o interesse e passam direto
  const days = (s.time - OUTBREAK_TIME) / DAY;
  const A = s._att?.total ?? 0;
  const pTarget = A < 0.08 ? 0 : Math.min(0.85, A * (0.7 + 0.06 * days)) * (0.2 + 0.8 * nightF(s));
  if (Math.random() < pTarget) {
    const t = chooseOpening(s);
    if (t) {
      const path = findPath(s, n.x, n.y, new Set([k2(...t.out)]), zombieWalkable, zombieStep);
      if (path) {
        n.path = path; n.z = 'go'; n.bashKey = t.k;
        if (!path.length) { n.z = 'bash'; n.bashT = 0; n.giveUp = 90; }
        return;
      }
    }
  }
  if ((A < 0.25 || nightF(s) < 0.3) && sendAway(s, n)) return;
  n.z = 'wander';
  const tx = Math.floor(Math.random() * W), ty = Math.floor(Math.random() * H);
  if (zombieWalkable(s, tx, ty)) n.path = findPath(s, n.x, n.y, new Set([k2(tx, ty)]), zombieWalkable, zombieStep) || [];
}

function bash(s, n, dt) {
  const w = s.world.walls[n.bashKey];
  const A = s._att?.total ?? 0;
  n.bashT += dt * (1 + (A < 0.1 ? 2 : 0) + (nightF(s) < 0.3 ? 3 : 0));
  if (!w || !w.built || w.broken || n.bashT > n.giveUp) { n.z = 'wander'; n.bashing = false; n.wait = 10 + Math.random() * 40; return; }
  n.bashing = true;
  n.moving = false;
  const { d, x, y } = parseEdge(n.bashKey);
  const cx = d === 'n' ? x + 0.5 : x, cy = d === 'n' ? y : y + 0.5;
  const dx = cx - n.px, dy = cy - n.py;
  if (Math.abs(dx - dy) > 0.01) n.facing = dx - dy > 0 ? 1 : -1;
  w.hp = hpOf(w) - ZOMBIE_DPS * dt;
  const name = OPENING_NAME[w.type];
  if (w.type !== 'fence') {
    if (!w._warn1) { w._warn1 = true; warn(s, `Zumbis forçando a ${name}!`); }
    if (hpFrac(w) < 0.35 && !w._warn2) { w._warn2 = true; warnCd = 0; warn(s, `A ${name} não vai aguentar muito!`); }
  }
  if (w.hp > 0) return;
  // cedeu
  if (w.type === 'fence') {
    delete s.world.walls[n.bashKey];
    toast('Os zumbis derrubaram uma cerca.', 'bad');
    n.z = 'wander'; n.bashing = false; n.wait = 5;
    return;
  }
  Object.assign(w, { broken: true, sealed: false, rf: 0, hp: 0 });
  warnCd = 0;
  warn(s, `Arrombaram a ${name}! Eles estão entrando!`);
  // todos que forçavam esta abertura entram
  const inside = insideTile(s, n.bashKey);
  for (const m of s.npcs) {
    if (m.mode !== 'yard' || m.dead || m.bashKey !== n.bashKey || m.z !== 'bash') continue;
    Object.assign(m, newIntruder(m.x, m.y), { id: m.id, shirt: m.shirt, px: m.px, py: m.py });
    m.path = inside ? [inside] : [];
  }
  s._intrDirty = true;
}

// ---------- dentro de casa ----------
function updateIntruder(s, n, dt) {
  const p = s.player;
  const hunting = p.floor === 'ground' && !p.away;
  n.hitCd -= dt;
  if (hunting) {
    const dist = Math.hypot(n.px - p.px, n.py - p.py);
    if (dist < 1.1) {
      n.moving = false;
      n.path = [];
      const dx = p.px - n.px, dy = p.py - n.py;
      if (Math.abs(dx - dy) > 0.01) n.facing = dx - dy > 0 ? 1 : -1;
      if (n.hitCd <= 0) {
        n.hitCd = 25;
        s.needs.health = Math.max(0, s.needs.health - 15);
        s.needs.contamination = Math.min(100, s.needs.contamination + 8);
        s._zHitAt = s.time;
        if (p.hidden) clearTasks(s); // acorda / levanta do sofá
        toast('Um infectado te atacou! (-15 saúde) Enfrente ou fuja para outro andar.', 'bad');
      }
      return;
    }
  }
  n.repath -= dt;
  if (n.path.length) { stepAlong(n, (hunting ? 0.12 : 0.07) * dt); if (!n.path.length) s._intrDirty = true; }
  if (n.repath > 0 && n.path.length) return;
  n.repath = hunting ? 8 : 60 + Math.random() * 60;
  if (hunting) {
    n.activity = 'caçando você!';
    n.path = findPath(s, n.x, n.y, new Set([k2(p.x, p.y)]), intruderWalkable, canStep) || [];
  } else if (!n.path.length) {
    n.activity = 'vagando pela casa';
    const tx = Math.floor(Math.random() * W), ty = Math.floor(Math.random() * H);
    n.path = findPath(s, n.x, n.y, new Set([k2(tx, ty)]), intruderWalkable, canStep) || [];
  }
}
