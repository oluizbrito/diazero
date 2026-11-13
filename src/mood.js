// Clima e tensão: quanto mais perto do Dia 0, mais sombrio fica tudo.
import { START_TIME, OUTBREAK_TIME, DAY } from './config.js';
import { dayIndex } from './time.js';

// 0 = vida normal (Dia -7) · 1 = Dia 0 ao meio-dia em diante
export function dread(s) {
  if (s.time >= OUTBREAK_TIME) return 1;
  const t = Math.max(0, (s.time - START_TIME) / (OUTBREAK_TIME - START_TIME));
  return Math.pow(t, 1.4);
}

// Chuva: começa no Dia -2 e não para mais; intensidade varia ao longo do dia
export function rainAmount(s) {
  const d = dayIndex(s.time);
  if (d < -2) return 0;
  const base = d === -2 ? 0.35 : d === -1 ? 0.6 : 0.8;
  const wave = 0.75 + 0.25 * Math.sin((s.time / DAY) * Math.PI * 6);
  return base * wave;
}

// Quantos focos de incêndio/fumaça na cidade
export function fireCount(s) {
  if (s.time >= OUTBREAK_TIME) return 9;
  const d = dayIndex(s.time);
  if (d < -4) return 0;
  return { [-4]: 1, [-3]: 2, [-2]: 3, [-1]: 5, [0]: 7 }[d] ?? 0;
}

// Viaturas com sirene na rua (Dia -3 até o Dia 0)
export function sirenCount(s) {
  const d = dayIndex(s.time);
  if (s.time >= OUTBREAK_TIME) return 1; // uma abandonada, ainda piscando
  if (d < -3) return 0;
  return d === -3 ? 1 : 2;
}

// Filtro CSS aplicado ao canvas (gradação de cor do "filme")
export function gradeFilter(s) {
  const d = dread(s);
  const out = s.time >= OUTBREAK_TIME;
  const sat = 0.88 - 0.5 * d - (out ? 0.08 : 0);
  const bri = 1 - 0.16 * d - (out ? 0.04 : 0);
  const con = 1.04 + 0.12 * d;
  const sep = out ? 0.18 : 0.06 * d;
  return `saturate(${sat.toFixed(3)}) brightness(${bri.toFixed(3)}) contrast(${con.toFixed(3)}) sepia(${sep.toFixed(3)})`;
}
