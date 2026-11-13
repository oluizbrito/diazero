// Resistência de portas/janelas e cercas contra os zumbis.
import { OPENING_HP, REINFORCE, FENCE_HP } from './config.js';
import { edgeSides, isIndoor, onFloor } from './world.js';

export function maxHp(w) {
  if (w.type === 'fence') return FENCE_HP;
  const base = OPENING_HP[w.type] || 0;
  return base + (REINFORCE[w.rf || 0]?.hp || 0);
}
export const hpOf = (w) => (w.hp == null ? maxHp(w) : w.hp);
export const hpFrac = (w) => Math.max(0, hpOf(w) / maxHp(w));

// Abertura do térreo que dá para o quintal (zumbis podem forçar)
export function isExteriorOpening(s, k, w) {
  if (!w || !w.built || w.broken || (w.type !== 'door' && w.type !== 'window')) return false;
  return onFloor(s, 'ground', () => {
    const sides = edgeSides(k);
    const ins = sides.filter(([x, y]) => isIndoor(s, x, y)).length;
    return ins === 1;
  });
}

export function outsideTile(s, k) {
  return onFloor(s, 'ground', () => edgeSides(k).find(([x, y]) => !isIndoor(s, x, y)));
}
export function insideTile(s, k) {
  return onFloor(s, 'ground', () => edgeSides(k).find(([x, y]) => isIndoor(s, x, y)));
}

export const OPENING_NAME = { door: 'porta', window: 'janela', vent: 'respiro', fence: 'cerca', wall: 'parede' };
