// Modo construção: posicionar plantas (blueprints), validar, demolir.
import { BUILD, OBJ, RESOURCES } from './config.js';
import { inLot, tileAt, isIndoor, isIndoorTile, edgeKey, edgeSides, objectAt, objById, isOutbreak, floorOf, DIRS, allObjects } from './world.js';
import { onBuilt, syncAttic } from './floors.js';

export function edgeFromPoint(fx, fy) {
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const dn = fy - ty, ds = ty + 1 - fy, dw = fx - tx, de = tx + 1 - fx;
  const m = Math.min(dn, ds, dw, de);
  if (m === dn) return edgeKey('n', tx, ty);
  if (m === ds) return edgeKey('n', tx, ty + 1);
  if (m === dw) return edgeKey('w', tx, ty);
  return edgeKey('w', tx + 1, ty);
}

export function missingFor(s, cost) {
  const miss = [];
  for (const [r, n] of Object.entries(cost)) {
    const have = s.stock[r] || 0;
    if (have < n) miss.push(`${n - have} ${RESOURCES[r].name.toLowerCase()}`);
  }
  return miss;
}

export function costStr(cost) {
  return Object.entries(cost).map(([r, n]) => `${RESOURCES[r].icon}${n}`).join(' ');
}

// Retorna true ou uma string com o motivo
export function canPlace(s, item, tx, ty, ek) {
  const B = BUILD[item];
  const f = floorOf(s);
  if (B.floors && !B.floors.includes(f)) return 'Não dá para construir isso neste andar';
  if (B.once && allObjects(s).some((o) => o.type === item)) return 'Só cabe um na casa';
  if (B.kind === 'edge') {
    const sides = edgeSides(ek);
    if (!sides.every(([x, y]) => inLot(x, y))) return 'Fora do terreno';
    if (item === 'fence') {
      if (sides.some(([x, y]) => isIndoor(s, x, y) || tileAt(s, x, y).pending)) return 'A cerca fica no quintal';
      if (isOutbreak(s)) return 'Não dá mais para ir lá fora';
      if (s.world.walls[ek]) return 'Já existe algo aqui';
      return true;
    }
    if (f !== 'ground' && !sides.every(([x, y]) => isIndoor(s, x, y))) return f === 'attic' ? 'O telhado já fecha aqui' : 'A terra já fecha aqui';
    if (!sides.some(([x, y]) => isIndoor(s, x, y) || tileAt(s, x, y).pending)) return 'Paredes só ao redor de pisos internos';
    const w = s.world.walls[ek];
    if (w) {
      if (!w.built || w.pending) return 'Já há uma obra aqui';
      if (item === 'wall') return 'Já existe uma parede aqui';
      if (w.type === item) return 'Já existe';
      if (w.type !== 'wall') return 'Demolir primeiro';
      if (w.broken) return 'Conserte primeiro';
    }
    if (isOutbreak(s) && !sides.some(([x, y]) => isIndoor(s, x, y))) return 'Não dá mais para ir lá fora';
    return true;
  }
  if (!inLot(tx, ty)) return 'Fora do terreno';
  const t = tileAt(s, tx, ty);
  if (t.pending) return 'Já há uma obra aqui';
  if (B.kind === 'dig') {
    if (t.type !== 'earth') return 'Já está escavado';
    const next = DIRS.some(([dx, dy]) => isIndoor(s, tx + dx, ty + dy));
    return next || 'Escave ao lado de uma parte já aberta';
  }
  if (objectAt(s, tx, ty)) return 'Ocupado';
  const p = s.player;
  if (f !== 'ground' && !isIndoorTile(t)) return 'Fora do andar';
  if (item === 'planter' && f === 'bunker') return 'Sem sol no bunker';
  if (B.kind === 'floor') {
    if (isIndoorTile(t)) return 'Já é piso interno';
    if (isOutbreak(s)) return 'Não dá mais para ir lá fora';
    return true;
  }
  if (p.x === tx && p.y === ty) return 'Você está em cima';
  const indoor = isIndoorTile(t);
  if (B.where === 'outdoor' && indoor) return 'Precisa ficar do lado de fora';
  if (B.where === 'indoor' && !indoor) return 'Precisa ficar dentro de casa';
  if (isOutbreak(s) && !indoor) return 'Não dá mais para ir lá fora';
  return true;
}

function pay(s, cost, mult = 1) {
  for (const [r, n] of Object.entries(cost)) s.stock[r] = (s.stock[r] || 0) - Math.floor(n * mult);
}
function refund(s, cost, mult) {
  for (const [r, n] of Object.entries(cost)) s.stock[r] = (s.stock[r] || 0) + Math.floor(n * mult);
}

// Cria a planta da obra e retorna o alvo para a tarefa de construir
export function placeBlueprint(s, item, tx, ty, ek) {
  const B = BUILD[item];
  pay(s, B.cost);
  if (B.kind === 'edge') {
    const w = s.world.walls[ek];
    if (w) w.pending = item;
    else s.world.walls[ek] = { type: item, built: false, sealed: false };
    return { kind: 'edge', key: ek };
  }
  if (B.kind === 'floor' || B.kind === 'dig') {
    tileAt(s, tx, ty).pending = item;
    return { kind: 'tile', x: tx, y: ty };
  }
  const d = OBJ[item];
  const o = { id: s.nextId++, type: item, x: tx, y: ty, w: d.w || 1, h: d.h || 1, built: false, bp: item, data: {} };
  if (item === 'planter') o.data = { stage: 'empty', growth: 0, watered: false };
  s.world.objects.push(o);
  return { kind: 'obj', id: o.id };
}

// Qual obra está pendente neste alvo (id do BUILD) ou null
export function pendingBuild(s, target) {
  if (target.kind === 'obj') {
    const o = objById(s, target.id);
    return o && !o.built ? o.bp : null;
  }
  if (target.kind === 'edge') {
    const w = s.world.walls[target.key];
    if (!w) return null;
    if (w.pending) return w.pending;
    return w.built ? null : w.type;
  }
  if (target.kind === 'tile') return tileAt(s, target.x, target.y)?.pending || null;
  return null;
}

export function completeBuild(s, target) {
  if (target.kind === 'obj') {
    const o = objById(s, target.id);
    o.built = true;
    onBuilt(s, o);
  } else if (target.kind === 'edge') {
    const w = s.world.walls[target.key];
    if (w.pending) {
      w.type = w.pending;
      delete w.pending;
      w.sealed = false;
    } else w.built = true;
  } else if (target.kind === 'tile') {
    const t = tileAt(s, target.x, target.y);
    const what = t.pending;
    delete t.pending;
    if (what === 'dig') t.type = 'concrete';
    else { t.type = 'floor'; syncAttic(s); }
  }
}

// Demolir/cancelar. Obras não concluídas devolvem tudo; prontas devolvem metade.
export function demolish(s, target) {
  if (target.kind === 'obj') {
    const o = objById(s, target.id);
    if (!o) return 'Nada aqui';
    if (OBJ[o.type].fixed && o.built) return 'Não dá para demolir isso';
    if (o.type === 'tree' || o.type === 'boxes') return 'Não dá para demolir isso';
    if (s.player.x >= o.x && s.player.x < o.x + o.w && s.player.y >= o.y && s.player.y < o.y + o.h) return 'Você está em cima';
    if (o.bp) refund(s, BUILD[o.bp].cost, o.built ? 0.5 : 1);
    s.world.objects = s.world.objects.filter((x) => x !== o);
    return true;
  }
  if (target.kind === 'edge') {
    const w = s.world.walls[target.key];
    if (!w) return 'Nada aqui';
    if (w.pending) {
      refund(s, BUILD[w.pending].cost, 1);
      delete w.pending;
      return true;
    }
    if (!BUILD[w.type]) return 'Não dá para demolir isso';
    refund(s, BUILD[w.type].cost, w.built && !w.broken ? 0.5 : w.broken ? 0 : 1);
    delete s.world.walls[target.key];
    return true;
  }
  if (target.kind === 'tile') {
    const t = tileAt(s, target.x, target.y);
    if (!t?.pending) return 'Nada aqui';
    refund(s, BUILD[t.pending].cost, 1);
    delete t.pending;
    return true;
  }
  return 'Nada aqui';
}
