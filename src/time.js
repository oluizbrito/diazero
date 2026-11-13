import { DAY, DAY0, OUTBREAK_TIME, POWER_CUT_TIME, WATER_CUT_TIME, SHOP_OPEN, SHOP_CLOSE } from './config.js';
import { countBuilt } from './world.js';

export const dayIndex = (t) => Math.floor(t / DAY) - DAY0;
export const minuteOfDay = (t) => ((t % DAY) + DAY) % DAY;
export const pad = (n) => String(Math.floor(n)).padStart(2, '0');
// Período do dia: manhã (05h–12h), tarde (12h–18h), noite (18h–05h)
export function periodStr(t) {
  const h = minuteOfDay(t) / 60;
  return h >= 5 && h < 12 ? 'Manhã' : h >= 12 && h < 18 ? 'Tarde' : 'Noite';
}
export const periodIcon = (t) => ({ Manhã: 'sunrise', Tarde: 'sun', Noite: 'moon' })[periodStr(t)];
export const clockStr = (t) => `${pad(minuteOfDay(t) / 60)}:${pad(minuteOfDay(t) % 60)}`;

export function durationStr(min) {
  min = Math.max(0, Math.ceil(min));
  const d = Math.floor(min / DAY), h = Math.floor((min % DAY) / 60), m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h${pad(m)}`;
  return `${m} min`;
}

export const hasGrid = (s) => s.time < POWER_CUT_TIME && !(s.ev?.blackout > s.time); // apagões de evento
export const hasPower = (s) => hasGrid(s) || (countBuilt(s, 'solar') > 0 && !s.ev?.solarBroken);
export const hasTapWater = (s) => s.time < WATER_CUT_TIME;
export const hasInternet = (s) => s.time < OUTBREAK_TIME;

export const priceMult = (s) => 1 + Math.max(0, dayIndex(s.time) + 7) * 0.1;

export function shopsStatus(s) {
  if (s.time >= OUTBREAK_TIME) return 'Sair agora é virar zumbi.';
  if (dayIndex(s.time) >= 0) return 'Lojas fechadas: saques e pânico na cidade.';
  const m = minuteOfDay(s.time);
  if (m < SHOP_OPEN || m >= SHOP_CLOSE) return 'Lojas fechadas. Abrem às 07:00.';
  return null;
}

export const survivedDays = (s) => Math.max(0, Math.floor((s.time - OUTBREAK_TIME) / DAY));
