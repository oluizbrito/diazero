// Simulação: passagem do tempo, necessidades, eventos diários, Dia 0 e contaminação.
import { DAY, RATES, OUTBREAK_TIME, POWER_CUT_TIME, WATER_CUT_TIME } from './config.js';
import { sealStatus, countBuilt, isIndoor, allObjects } from './world.js';
import { dayIndex, hasPower, survivedDays } from './time.js';
import { updatePlayer, isSleeping, isResting } from './player.js';
import { updateNpcs, onOutbreakNpcs } from './npc.js';
import { updateTraffic } from './traffic.js';
import { bus, toast } from './bus.js';
import { currentNoise, attention } from './attention.js';
import { updateEvents } from './events.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

// Quanto ar contaminado o Dr. respira por hora, conforme o andar onde ele está.
// Térreo e sótão dividem o mesmo ar; o bunker só recebe o que passa pelo alçapão.
export function contaminationRate(s, zone = s.player.floor === 'bunker' ? 'bunker' : 'house') {
  const seal = sealStatus(s);
  const inflow = seal.breaches.length * 8 + seal.unsealed.length * 1.5;
  const power = hasPower(s);
  const houseFilters = power ? countBuilt(s, 'filter', ['ground', 'attic']) : 0;
  if (zone === 'bunker') {
    const bf = power ? countBuilt(s, 'filter', ['bunker']) : 0;
    const sealed = !!s.floors.bunker?.hatchSealed;
    const leak = sealed ? 0 : Math.max(0, inflow - houseFilters * 3) * 0.4;
    return { rate: leak - bf * 3 - (sealed ? 1.5 : 0.3), inflow: leak, filters: bf, seal, zone, sealed };
  }
  return { rate: inflow - houseFilters * 3 - 0.3, inflow, filters: houseFilters, seal, zone };
}

export function update(s, dt) {
  while (dt > 0 && !s.flags.gameOver) {
    const d = Math.min(dt, 1);
    stepMinute(s, d);
    dt -= d;
  }
}

function crossed(prev, now, t) {
  return prev < t && now >= t;
}

function crossedDaily(prev, now, minute) {
  return Math.floor((prev - minute) / DAY) < Math.floor((now - minute) / DAY);
}

function stepMinute(s, d) {
  const prev = s.time;
  s.time += d;
  const h = d / 60;
  const n = s.needs;
  const sleeping = isSleeping(s);

  n.hunger = clamp(n.hunger - RATES.hunger * h * (sleeping ? 0.5 : 1));
  n.thirst = clamp(n.thirst - RATES.thirst * h * (sleeping ? 0.5 : 1));
  if (!sleeping && !isResting(s)) n.energy = clamp(n.energy - RATES.energy * h);

  let dmg = 0;
  if (n.hunger <= 0) dmg += 4;
  if (n.thirst <= 0) dmg += 6;
  if (n.energy <= 0) dmg += 2;
  if (n.contamination >= 50) dmg += 1.5;
  if (dmg > 0) n.health = clamp(n.health - dmg * h);
  else if (n.hunger > 30 && n.thirst > 30 && n.energy > 20) n.health = clamp(n.health + 1 * h);

  if (s.time >= OUTBREAK_TIME) {
    n.contamination = clamp(n.contamination + contaminationRate(s).rate * h);
  }

  updatePlayer(s, d);
  // barulho: sobe na hora, some aos poucos
  const cn = currentNoise(s).level;
  s.noise = Math.max(cn, (s.noise || 0) - d / 45);
  if (s.time >= OUTBREAK_TIME) hints(s, cn);
  if (s.npcs) updateNpcs(s, d);
  if (s.npcs) updateEvents(s, d);
  updateTraffic(s, d);

  // ---- eventos ----
  if (crossedDaily(prev, s.time, 6 * 60)) daily(s);
  if (crossed(prev, s.time, OUTBREAK_TIME - 60)) {
    toast('Falta 1 hora para o vírus chegar! Fique dentro de casa.', 'bad');
  }
  if (crossed(prev, s.time, OUTBREAK_TIME)) outbreak(s);
  if (crossed(prev, s.time, POWER_CUT_TIME)) {
    toast(countBuilt(s, 'solar') ? 'A rede elétrica caiu. O painel solar assumiu.' : 'A rede elétrica caiu. Sem energia.', 'bad');
  }
  if (crossed(prev, s.time, WATER_CUT_TIME)) toast('A água encanada parou. Agora só a água estocada.', 'bad');
  if (Math.floor(prev / 60) !== Math.floor(s.time / 60)) bus.emit('hour');

  if (n.contamination >= 100) {
    gameOver(s, 'zombie', 'Você virou zumbi', 'O ar contaminado entrou pelas frestas da casa. Os sintomas vieram rápido… e depois, mais nada.');
  } else if (n.health <= 0) {
    if (s.time - (s._zHitAt ?? -1e9) < 30) {
      gameOver(s, 'eaten', 'Mordido', 'A porta não segurou. Eles entraram, e o Dr. não conseguiu fugir a tempo. Reforce as aberturas e tenha sempre para onde correr.');
    } else {
      const why = n.thirst <= 0 ? 'de sede' : n.hunger <= 0 ? 'de fome' : 'de exaustão';
      gameOver(s, 'dead', 'Fim da linha', `Você morreu ${why}.`);
    }
  }
}

// Dicas, uma vez só, quando o jogador começa a chamar atenção
function hints(s, cn) {
  const nt = (s.flags.notified ||= {});
  if (!nt.noise && cn >= 0.5) { nt.noise = true; toast('Barulho atrai os infectados. Fazer obra à noite é chamar a horda.', 'bad'); }
  if (!nt.light && Math.floor(s.time) % 30 === 0) {
    const a = attention(s);
    if (a.night > 0.5 && a.leaks.length) { nt.light = true; toast('A luz nas janelas chama os infectados. Apague os cômodos com janela (botão Luz).', 'bad'); }
  }
  if (!nt.dawn && s.time % 1440 >= 6.5 * 60 && s.time % 1440 < 7 * 60) { nt.dawn = true; toast('Com o dia claro, os infectados se escondem. À noite eles voltam em bando.', 'info'); }
}

function daily(s) {
  const day = dayIndex(s.time);
  // canteiros (em qualquer andar)
  for (const o of allObjects(s)) {
    if (o.type !== 'planter' || !o.built) continue;
    const dd = o.data;
    if (dd.stage === 'growing' && dd.watered) {
      dd.growth++;
      if (dd.growth >= 3) dd.stage = 'ripe';
    }
    dd.watered = false;
  }
  // cisternas e caixas d'água
  const cisterns = countBuilt(s, 'cistern'), tanks = countBuilt(s, 'tank');
  if (cisterns || tanks) {
    const rain = Math.random() < 0.35;
    const gain = cisterns * (1 + (rain ? 4 : 0)) + tanks * (2 + (rain ? 4 : 0));
    s.stock.agua += gain;
    toast(`${rain ? 'Choveu! ' : ''}Chuva captada: +${gain} porções de água`, 'good');
  }
  if (day < 0) toast('Novas notícias na TV', 'info');
  if (day === 0) bus.emit('news', 0);
}

function outbreak(s) {
  s.flags.outbreak = true;
  const p = s.player;
  if (!p.away && !isIndoor(s, p.x, p.y)) {
    gameOver(s, 'outside', 'Pego do lado de fora', 'Ao meio-dia do Dia 0 você estava fora de casa. O vírus estava no ar. Você virou zumbi em minutos.');
    return;
  }
  if (s.npcs) onOutbreakNpcs(s);
  bus.emit('outbreak');
}

export function gameOver(s, reason, title, text) {
  if (s.flags.gameOver) return;
  s.flags.gameOver = { reason, title, text, days: survivedDays(s) };
  s.player.task = null;
  s.player.path = [];
  bus.emit('gameover', s.flags.gameOver);
}

