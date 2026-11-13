// Quanto a casa chama a atenção dos zumbis: luz vazando pelas janelas (sobretudo à noite) e barulho.
// Escuro e silêncio = eles passam direto.
import { W } from './config.js';
import { ACTIONS } from './actions.js';

// barulho de cada ação (0..1)
const NOISE = {
  chop: 0.9, reinforce1: 0.9, reinforce2: 1, patch: 0.8, rebuild: 0.9, fight: 1, shower: 0.35, search: 0.3,
  sampleAir: 0.3, seal: 0.2, sealHatch: 0.2, work: 0.1, research: 0.15, plant: 0.1, harvest: 0.1, water: 0.1,
};
import { nightLevel, NIGHT_MAX } from './light.js';
import { litTiles } from './rooms.js';
import { onFloor, edgeSides, isIndoor } from './world.js';
import { pendingBuild } from './build.js';

// Barulho que o Dr. está fazendo agora (0..1)
export function currentNoise(s) {
  const p = s.player;
  const t = p.task;
  if (!t || t.phase !== 'do' || p.away) return { level: 0, what: null };
  let n = NOISE[t.act] || 0;
  if (t.act === 'build') n = pendingBuild(s, t.target) === 'dig' ? 0.5 : 0.85;
  if (t.act === 'eat') { const o = s.world.objects.find((q) => q.id === t.target.id); if (o?.type === 'stove') n = 0.2; }
  const muffle = p.floor === 'bunker' ? 0.15 : p.floor === 'attic' ? 0.8 : 1;
  return { level: n * muffle, what: ACTIONS[t.act].label.replace(/ \(.*\)$/, '') };
}

// Janelas (e respiros) com luz acesa atrás. Chapas de metal tapam a luz.
export function leakingWindows(s) {
  const out = [];
  for (const f of ['ground', 'attic']) {
    if (!s.floors[f]) continue;
    const { lit, R } = litTiles(s, f);
    for (const r of R.rooms) for (const k of r.windows) {
      const w = s.floors[f].walls[k];
      if (w.rf >= 2) continue;
      const inside = onFloor(s, f, () => edgeSides(k).find(([x, y]) => isIndoor(s, x, y)));
      if (inside && lit[inside[1] * W + inside[0]]) out.push({ floor: f, key: k, room: r.name, weight: w.type === 'vent' ? 0.5 : w.rf ? 0.6 : 1 });
    }
  }
  return out;
}

export function attention(s) {
  const night = Math.min(1, nightLevel(s) / NIGHT_MAX);
  const leaks = leakingWindows(s);
  const leak = leaks.reduce((t, l) => t + l.weight, 0);
  const light = Math.min(1, leak / 3) * (0.08 + 0.92 * night);
  const noise = Math.min(1, s.noise || 0);
  const total = Math.min(1, light * 0.85 + noise * 0.9);
  return { total, light, noise, leaks, night };
}

export function attentionLevel(a) {
  return a.total < 0.1 ? 'low' : a.total < 0.4 ? 'mid' : 'high';
}
