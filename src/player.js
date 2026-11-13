// Movimento do personagem e execução de tarefas (andar até o alvo, depois agir).
import { WALK_SPEED } from './config.js';
import { findPath, standTiles, isWalkable, inLot, floorOf } from './world.js';
import { ACTIONS, resolve } from './actions.js';
import { toast } from './bus.js';
import { isDarkAt } from './light.js';
import { dayIndex } from './time.js';

const k = (x, y) => x + ',' + y;

// Move uma entidade (player/zumbi) ao longo do caminho
export function stepAlong(ent, dist) {
  let move = dist;
  ent.moving = false;
  while (move > 0 && ent.path.length) {
    const [tx, ty] = ent.path[0];
    const cx = tx + 0.5, cy = ty + 0.5;
    const dx = cx - ent.px, dy = cy - ent.py;
    const d = Math.hypot(dx, dy);
    if (Math.abs(dx - dy) > 0.01) ent.facing = dx - dy > 0 ? 1 : -1;
    if (Math.abs(dx + dy) > 0.01) ent.back = dx + dy < 0; // indo "para cima" da tela: de costas
    ent.moving = true;
    if (d <= move) {
      ent.px = cx; ent.py = cy; ent.x = tx; ent.y = ty;
      ent.path.shift();
      move -= d;
    } else {
      ent.px += (dx / d) * move;
      ent.py += (dy / d) * move;
      move = 0;
    }
  }
  if (ent.moving) ent.walk += dist * (ent.stride || 6); // passada: maior = pernas mais rápidas
  else ent.back = false; // parado: sempre de frente para a câmera
}

export const MAX_QUEUE = 8;
let nextTaskId = 1;

// Andar até um tile também é uma tarefa da fila
export function moveTo(s, x, y) {
  if (!isWalkable(s, x, y)) return false;
  return queueTask(s, { kind: 'spot', x, y }, 'goto');
}

export function clearTasks(s) {
  const p = s.player;
  p.task = null;
  p.queue = [];
  p.hidden = false;
  p.path = [];
  p.goal = null;
}

// Começa uma tarefa agora (substitui a atual). Retorna true se deu certo.
export function startTask(s, target, act, { silent = false, id = nextTaskId++ } = {}) {
  const p = s.player;
  const A = ACTIONS[act];
  if (target.floor && target.floor !== p.floor) { if (!silent) toast('Isso fica em outro andar', 'bad'); return false; }
  const e = resolve(s, target);
  if (!e) return false;
  if (A.can) {
    const ok = A.can(s, e, target);
    if (ok !== true) { if (!silent) toast(ok, 'bad'); return false; }
  }
  const goals = new Set(standTiles(s, target).map(([x, y]) => k(x, y)));
  const path = findPath(s, p.x, p.y, goals);
  if (!path) { if (!silent) toast('Não consigo chegar lá', 'bad'); return false; }
  p.hidden = false;
  p.path = path;
  p.goal = target.kind === 'spot' ? [target.x, target.y] : null;
  p.task = { id, act, target, phase: 'walk', elapsed: 0, duration: 0 };
  return true;
}

// Coloca a tarefa no fim da fila (começa já se ele estiver parado)
export function queueTask(s, target, act) {
  const p = s.player;
  const id = nextTaskId++;
  target = { ...target, floor: target.floor || floorOf(s) };
  if (!p.task && !p.path.length) return startTask(s, target, act, { id });
  if (p.queue.length >= MAX_QUEUE) { toast('A fila de tarefas está cheia', 'bad'); return false; }
  p.queue.push({ id, target, act });
  return true;
}

// Cancela uma tarefa da fila (ainda não iniciada)
export function cancelQueued(s, id) {
  const p = s.player;
  p.queue = p.queue.filter((q) => q.id !== id);
}

// Cancela a tarefa atual e segue para a próxima da fila
export function cancelCurrent(s) {
  const p = s.player;
  p.task = null;
  p.hidden = false;
  p.path = [];
  p.goal = null;
  nextTask(s);
}

function faceTarget(p, target) {
  let tx, ty;
  if (target.kind === 'edge') {
    const [d, rest] = target.key.split(':');
    const [x, y] = rest.split(',').map(Number);
    tx = d === 'n' ? x + 0.5 : x; ty = d === 'n' ? y : y + 0.5;
  } else { tx = target.x ?? null; ty = target.y ?? null; }
  if (tx == null) return;
  const dx = tx - p.px, dy = ty - p.py;
  if (Math.abs(dx - dy) > 0.01) p.facing = dx - dy > 0 ? 1 : -1;
  p.back = false; // trabalhando em pé: de lado, virado para o objeto, mas mostrando o rosto
}

export function updatePlayer(s, dt) {
  const p = s.player;
  if (p.away) return;
  // se o próximo passo ficou bloqueado (ex.: começou o Dia 0), recalcula/aborta
  if (p.path.length) {
    const [nx, ny] = p.path[0];
    if (!isWalkable(s, nx, ny)) {
      p.path = [];
      if (p.task) { toast('Caminho bloqueado', 'bad'); p.task = null; }
    }
  }
  stepAlong(p, WALK_SPEED * dt);
  if (!p.path.length) p.goal = null;

  const t = p.task;
  if (t && !p.path.length) {
    const A = ACTIONS[t.act];
    const e = resolve(s, t.target);
    if (!e) { p.task = null; p.hidden = false; return; }
    if (t.phase === 'walk') {
      if (A.can) {
        const ok = A.can(s, e, t.target);
        if (ok !== true) { toast(ok, 'bad'); p.task = null; return nextTask(s); }
      }
      if (A.reach) {
        const ok = A.reach(s, e, t.target);
        if (ok !== true) { toast(ok, 'bad'); p.task = null; return nextTask(s); }
      }
      t.phase = 'do';
      t.elapsed = 0;
      t.duration = typeof A.duration === 'function' ? A.duration(s, t.target) : A.duration || 0;
      if (t.target.kind === 'obj') faceTarget(p, { x: e.x + 0.5, y: e.y + 0.5 });
      else if (t.target.kind === 'npc') faceTarget(p, { x: e.px, y: e.py });
      else faceTarget(p, t.target);
      if (A.hide) p.hidden = true;
    }
    if (t.phase === 'do') {
      if (A.tick) A.tick(s, dt, t);
      // no escuro tudo demora mais
      const slowable = !A.isDone && t.duration > 0 && t.act !== 'rest';
      t.dark = slowable && isDarkAt(s, p.x, p.y);
      if (t.dark && s._darkWarned !== dayIndex(s.time)) {
        s._darkWarned = dayIndex(s.time);
        toast('Está escuro: as tarefas demoram mais. Acenda as luzes.', 'bad');
      }
      t.elapsed += dt * (t.dark ? 0.6 : 1);
      const finished = A.isDone ? A.isDone(s, t) : t.elapsed >= t.duration;
      if (finished) {
        p.task = null;
        p.hidden = false;
        if (A.done) A.done(s, e, t.target);
        nextTask(s);
      }
    }
  }
  if (!p.task && !p.path.length && p.queue.length) nextTask(s);
}

function nextTask(s) {
  const p = s.player;
  while (p.queue.length && !p.task) {
    const q = p.queue.shift();
    startTask(s, q.target, q.act, { id: q.id });
  }
}

export function taskProgress(s) {
  const t = s.player.task;
  if (!t || t.phase !== 'do') return null;
  if (t.act === 'sleep') return s.needs.energy / 100;
  return t.duration ? Math.min(1, t.elapsed / t.duration) : null;
}

export function isSleeping(s) {
  const t = s.player.task;
  return !!t && t.phase === 'do' && t.act === 'sleep';
}

export function isResting(s) {
  const t = s.player.task;
  return !!t && t.phase === 'do' && t.act === 'rest';
}

// Coloca o personagem no tile andável mais próximo de (x,y)
export function placePlayerNear(s, x, y) {
  const p = s.player;
  const seen = new Set([k(x, y)]);
  const q = [[x, y]];
  for (let i = 0; i < q.length; i++) {
    const [cx, cy] = q[i];
    if (isWalkable(s, cx, cy)) {
      Object.assign(p, { x: cx, y: cy, px: cx + 0.5, py: cy + 0.5, path: [] });
      return;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inLot(nx, ny) || seen.has(k(nx, ny))) continue;
      seen.add(k(nx, ny));
      q.push([nx, ny]);
    }
  }
}
