// Ações que o personagem executa em objetos, janelas/portas e obras.
import { OBJ, BUILD, MEAL, DRINK, RATES, REINFORCE, RESEARCH } from './config.js';
import { objById, tileAt, isOutbreak, floorOf } from './world.js';
import { hasPower, hasTapWater, hasInternet, dayIndex } from './time.js';
import { pendingBuild, completeBuild, demolish, missingFor } from './build.js';
import { changeFloor } from './floors.js';
import { maxHp, hpOf, isExteriorOpening } from './siege.js';
import { gameOver } from './sim.js';
import { bus, toast } from './bus.js';
import { bookInfo, clockInfo, fridgeInfo, pcInfo, radioEgg } from './eastereggs.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

export function resolve(s, target) {
  if (target.kind === 'obj') return objById(s, target.id);
  if (target.kind === 'edge') return s.world.walls[target.key] || null;
  if (target.kind === 'tile' || target.kind === 'spot') return tileAt(s, target.x, target.y);
  if (target.kind === 'npc') return (s.npcs || []).find((n) => n.id === target.id && n.mode === 'intruder' && !n.dead) || null;
  return null;
}

const payCost = (s, cost) => { for (const [r, n] of Object.entries(cost)) s.stock[r] -= n; };
const costCheck = (s, cost) => { const m = missingFor(s, cost); return m.length ? 'Falta: ' + m.join(', ') : true; };

// ---- Pesquisa da cura ----
export function researchInfo(s) {
  const r = s.research;
  const i = RESEARCH.phases.findIndex((p) => r.pts < p.to);
  const idx = i < 0 ? RESEARCH.phases.length - 1 : i;
  const ph = RESEARCH.phases[idx];
  const from = idx ? RESEARCH.phases[idx - 1].to : 0;
  return { idx, phase: ph, from, pts: r.pts, locked: !!ph.needs && r.unlocked <= idx, done: r.pts >= 100 };
}

function researchCan(s) {
  if (s.needs.energy < 20) return 'Cansado demais';
  if (!hasPower(s)) return 'Sem energia para os equipamentos';
  if (!(s.stock.reagentes > 0)) return 'Sem reagentes (Distribuidora Hospitalar)';
  const ri = researchInfo(s);
  if (ri.locked && !(s.stock.amostra > 0)) {
    return isOutbreak(s) ? 'Precisa de amostra viva: colete o ar numa janela ou abata um invasor' : 'Sem o vírus aqui, a modelagem chegou ao limite';
  }
  return true;
}

function researchDone(s, lab) {
  const r = s.research;
  const ri = researchInfo(s);
  if (ri.locked) {
    s.stock.amostra--;
    r.unlocked = ri.idx + 1;
    toast(`Amostra isolada. Começa a fase: ${ri.phase.name}`, 'good');
  }
  s.stock.reagentes--;
  s.needs.energy = Math.max(0, s.needs.energy - 15);
  const gain = RESEARCH.gain * (floorOf(s) === 'bunker' ? RESEARCH.bunkerBonus : 1);
  r.pts = Math.min(ri.phase.to, r.pts + gain);
  if (r.pts >= 100) {
    gameOver(s, 'cure', 'A cura',
      'Depois de dias de trabalho no laboratório improvisado, a última amostra reage. Anticorpos. Estáveis. O Doutor Átila Varela, o maior cientista da sua geração, acaba de sintetizar a cura. Agora o mundo precisa saber.');
    return;
  }
  const nx = researchInfo(s);
  if (nx.idx !== ri.idx) toast(`Fase concluída: ${ri.phase.name}!`, 'good');
  else toast(`Pesquisa: ${Math.round(r.pts)}%`, 'good');
}

export const ACTIONS = {
  goto: { label: 'Andar até aqui', icon: 'walk', duration: 0 },
  eat: {
    label: 'Comer', icon: 'eat', duration: 25,
    can: (s) => s.stock.comida > 0 || 'Sem comida no estoque',
    done: (s) => { s.stock.comida--; s.needs.hunger = clamp(s.needs.hunger + MEAL); },
  },
  drink: {
    label: 'Beber água', icon: 'drink', duration: 5,
    can: (s) => hasTapWater(s) || s.stock.agua > 0 || 'A água encanada acabou e não há água estocada',
    done: (s) => {
      if (!hasTapWater(s)) s.stock.agua--;
      s.needs.thirst = clamp(s.needs.thirst + DRINK);
    },
  },
  sleep: {
    label: 'Dormir', icon: 'sleep', fast: true, hide: true,
    can: (s) => s.needs.energy < 90 || 'Sem sono agora',
    tick: (s, dt) => { s.needs.energy = clamp(s.needs.energy + (RATES.sleep * dt) / 60); },
    isDone: (s) => s.needs.energy >= 100,
  },
  rest: {
    label: 'Descansar no sofá', icon: 'rest', duration: 60, hide: true,
    tick: (s, dt) => { s.needs.energy = clamp(s.needs.energy + (RATES.rest * dt) / 60); },
  },
  news: {
    label: 'Ver notícias', icon: 'tv', duration: 0,
    can: (s) => hasPower(s) || 'Sem energia',
    done: (s, e) => { s._tvOn = e.id; bus.emit('news', dayIndex(s.time)); },
  },
  work: {
    label: 'Consultoria online (+R$ 250, 3h)', icon: 'work', duration: 180,
    can: (s) => (!hasInternet(s) ? 'A internet caiu' : !hasPower(s) ? 'Sem energia' : s.needs.energy < 20 ? 'Cansado demais' : true),
    done: (s) => { s.money += 250; s.needs.energy = clamp(s.needs.energy - 10); toast('+R$ 250 pela consultoria', 'good'); },
  },
  inventory: { label: 'Ver estoque', icon: 'box', ui: true, run: () => bus.emit('openInventory') },
  travel: {
    label: 'Ir às compras de carro', icon: 'car', duration: 1,
    done: () => bus.emit('openTravel'),
  },
  plant: {
    label: 'Plantar (1 semente)', icon: 'plant', duration: 20,
    can: (s, e) => (e.data.stage !== 'empty' ? 'Já plantado' : s.stock.sementes > 0 || 'Sem sementes'),
    done: (s, e) => { s.stock.sementes--; Object.assign(e.data, { stage: 'growing', growth: 0, watered: false }); },
  },
  water: {
    label: 'Regar', icon: 'waterCan', duration: 10,
    can: (s, e) => (e.data.watered ? 'Já regado hoje' : hasTapWater(s) || s.stock.agua > 0 || 'Sem água para regar'),
    done: (s, e) => { if (!hasTapWater(s)) s.stock.agua--; e.data.watered = true; },
  },
  harvest: {
    label: 'Colher (+4 comida)', icon: 'harvest', duration: 20,
    can: (s, e) => e.data.stage === 'ripe' || 'Ainda não está pronto',
    done: (s, e) => { s.stock.comida += 4; Object.assign(e.data, { stage: 'empty', growth: 0, watered: false }); toast('+4 porções de comida', 'good'); },
  },
  seal: {
    label: 'Vedar (1 kit de vedação)', icon: 'seal', duration: 30,
    can: (s, e) => (e.sealed ? 'Já vedada' : s.stock.vedacao > 0 || 'Sem kit de vedação (Loja de Construção)'),
    done: (s, e) => { s.stock.vedacao--; e.sealed = true; },
  },
  build: {
    label: 'Construir', icon: 'build',
    duration: (s, t) => BUILD[pendingBuild(s, t)]?.time || 30,
    can: (s, e, t) => !!pendingBuild(s, t) || 'Nada para construir',
    done: (s, e, t) => completeBuild(s, t),
  },
  chop: {
    label: 'Cortar árvore (+3 madeira, 2h)', icon: 'axe', duration: 120,
    can: (s) => !isOutbreak(s) || 'Não dá mais para ir lá fora',
    done: (s, e) => { s.world.objects = s.world.objects.filter((o) => o !== e); s.stock.madeira += 3; toast('+3 madeira', 'good'); },
  },
  relax: {
    label: 'Sentar e ler o jornal (1h)', icon: 'rest', duration: 60,
    tick: (s, dt) => { s.needs.energy = clamp(s.needs.energy + (RATES.rest * dt) / 60); },
  },
  radio: {
    label: 'Ouvir o rádio de pilha', icon: 'radio', duration: 0,
    done: (s, e) => { if (radioEgg(s)) return; s._radioOn = e.id; bus.emit('news', dayIndex(s.time)); },
  },
  shower: {
    label: 'Tomar banho (20 min)', icon: 'shower', duration: 20, hide: true,
    can: (s) => hasTapWater(s) || s.stock.agua > 0 || 'Sem água para o banho',
    done: (s) => {
      if (!hasTapWater(s)) s.stock.agua--;
      s.needs.energy = clamp(s.needs.energy + 10);
      toast(hasTapWater(s) ? 'Banho tomado. Que alívio.' : 'Banho de caneca, com água estocada. Melhor que nada.', 'good');
    },
  },
  medkit: {
    label: 'Tomar remédio (1 kit médico, +40 saúde)', icon: 'medkit', duration: 10,
    can: (s) => (!(s.stock.kitMedico > 0) ? 'Sem kit médico' : s.needs.health < 100 || 'Saúde já está cheia'),
    done: (s) => { s.stock.kitMedico--; s.needs.health = clamp(s.needs.health + 40); },
  },
  goUp: { label: 'Subir ao sótão', icon: 'up', duration: 6, done: (s) => changeFloor(s, 'attic') },
  goDown: { label: 'Descer ao térreo', icon: 'down', duration: 6, done: (s) => changeFloor(s, 'ground') },
  goBunker: { label: 'Descer ao bunker', icon: 'down', duration: 8, done: (s) => changeFloor(s, 'bunker') },
  goGround: { label: 'Subir ao térreo', icon: 'up', duration: 8, done: (s) => changeFloor(s, 'ground') },
  sealHatch: {
    label: 'Vedar o alçapão (1 kit de vedação)', icon: 'seal', duration: 40,
    can: (s) => (s.floors.bunker?.hatchSealed ? 'Já vedado' : s.stock.vedacao > 0 || 'Sem kit de vedação'),
    done: (s) => { s.stock.vedacao--; s.floors.bunker.hatchSealed = true; toast('Alçapão vedado: o ar do bunker fica limpo.', 'good'); },
  },
  research: {
    label: 'Pesquisar a cura (4h, 1 reagente)', icon: 'flask', duration: RESEARCH.shift,
    can: (s) => researchCan(s),
    done: (s, e) => researchDone(s, e),
  },
  search: {
    label: 'Vasculhar as caixas', icon: 'box', duration: 40,
    can: (s, e) => !e.data.searched || 'Já vasculhadas',
    done: (s, e) => {
      e.data.searched = true;
      s.stock.madeira += 3;
      s.stock.metal += 1;
      s.research.pts = Math.min(RESEARCH.phases[0].to, s.research.pts + 10);
      bus.emit('story', 'notes');
    },
  },
  reinforce1: {
    label: `Reforçar com tábuas (2 madeira)`, icon: 'shield', duration: REINFORCE[1].time,
    can: (s, e) => costCheck(s, REINFORCE[1].cost),
    done: (s, e) => { payCost(s, REINFORCE[1].cost); e.rf = 1; delete e.hp; },
  },
  reinforce2: {
    label: `Blindar com chapas (2 metal)`, icon: 'shield', duration: REINFORCE[2].time,
    can: (s, e) => costCheck(s, REINFORCE[2].cost),
    done: (s, e) => { payCost(s, REINFORCE[2].cost); e.rf = 2; delete e.hp; },
  },
  patch: {
    label: 'Remendar (1 madeira, +150)', icon: 'build', duration: 30,
    can: (s, e) => (hpOf(e) >= maxHp(e) ? 'Inteira' : costCheck(s, { madeira: 1 })),
    done: (s, e) => { s.stock.madeira--; e.hp = Math.min(maxHp(e), hpOf(e) + 150); if (e.hp >= maxHp(e)) delete e.hp; },
  },
  rebuild: {
    label: 'Reconstruir', icon: 'build', duration: 60,
    can: (s, e) => costCheck(s, BUILD[e.type].cost),
    done: (s, e) => { payCost(s, BUILD[e.type].cost); e.broken = false; e.rf = 0; delete e.hp; e.sealed = false; toast('Reconstruída. Falta vedar de novo.', 'info'); },
  },
  sampleAir: {
    label: 'Coletar amostra do ar (+20% contaminação)', icon: 'sample', duration: 30,
    can: (s) => isOutbreak(s) || 'O vírus ainda não chegou aqui',
    done: (s) => {
      s.stock.amostra++;
      s.needs.contamination = Math.min(100, s.needs.contamination + 20);
      toast('Você entreabriu a janela e coletou o ar lá fora. +1 amostra viral', 'bad');
    },
  },
  fight: {
    label: 'Enfrentar o infectado', icon: 'fight', duration: 12,
    reach: (s, n) => Math.hypot(n.px - s.player.px, n.py - s.player.py) < 1.7 || 'Ele se afastou',
    done: (s, n) => {
      n.dead = true;
      n.state = 'dead';
      const dmg = 5 + Math.round(Math.random() * 15);
      s.needs.health = Math.max(1, s.needs.health - dmg);
      s.stock.amostra++;
      toast(`Você abateu o infectado (-${dmg} saúde). Coletou uma amostra de tecido.`, 'good');
    },
  },
  answer: { label: 'Atender a porta', icon: 'door', ui: true, run: (s) => bus.emit('goAnswer', s) },
  answerDo: { label: 'Atender a porta', icon: 'door', duration: 2, done: (s) => bus.emit('answerDoor', s) },
  repairSolar: {
    label: 'Consertar o inversor (1 metal, 40 min)', icon: 'build', duration: 40,
    can: (s) => costCheck(s, { metal: 1 }),
    done: (s) => { s.stock.metal--; s.ev.solarBroken = false; toast('Painel solar consertado. A energia voltou.', 'good'); },
  },
  cancelBuild: {
    label: 'Cancelar obra (devolve materiais)', icon: 'cancel', ui: true,
    run: (s, t) => { demolish(s, t); },
  },
};

const INFO = {
  cisternInfo: (s, o) => ({ label: 'Cisterna: capta chuva todo dia às 06:00', icon: 'info' }),
  clockInfo,
  cristInfo: () => ({ label: 'A louça de festa. Ninguém usa desde o último Natal com a família.', icon: 'info' }),
  bookInfo,
  fridgeInfo,
  pcInfo,
  sciInfo: () => ({ label: 'O microscópio de latão do primeiro laboratório. Ainda funciona.', icon: 'info' }),
  photoInfo: () => ({ label: 'Fotos da esposa, que já se foi, e dos netos, que moram longe.', icon: 'info' }),
  tankInfo: () => ({ label: "Caixa d'água: recolhe a chuva do telhado às 06:00", icon: 'info' }),
  spikesInfo: (s, o) => ({ label: `Armadilha: ${o.data.uses ?? 3} uso(s) restante(s)`, icon: 'info' }),
  solarInfo: () => ({ label: 'Painel solar: gera energia quando a rede cair', icon: 'info' }),
  filterInfo: (s) => ({ label: hasPower(s) ? 'Filtro ligado: limpando o ar' : 'Filtro desligado: sem energia', icon: 'info' }),
};

function planterActions(s, o) {
  const d = o.data;
  const out = [];
  if (d.stage === 'empty') out.push('plant');
  if (d.stage === 'growing') out.push('water');
  if (d.stage === 'ripe') out.push('harvest');
  return out;
}

export function planterStatus(o) {
  const d = o.data;
  if (d.stage === 'empty') return 'Vazio';
  if (d.stage === 'ripe') return 'Pronto para colher!';
  return `Crescendo (${d.growth}/3 dias)${d.watered ? ' · regado hoje' : ' · precisa de água'}`;
}

// Lista de opções para o menu de contexto
export function actionsFor(s, target) {
  const e = resolve(s, target);
  if (!e) return { title: '', items: [] };
  const items = [];
  const push = (act) => {
    const A = ACTIONS[act];
    const ok = A.can ? A.can(s, e, target) : true;
    items.push({ act, label: A.label, icon: A.icon, reason: ok === true ? null : ok });
  };
  let title = '';

  const bp = pendingBuild(s, target);
  if (target.kind === 'obj') title = OBJ[e.type].name;
  if (target.kind === 'edge') title = { wall: 'Parede', window: 'Janela', door: 'Porta', vent: 'Respiro do telhado', fence: 'Cerca' }[e.type];
  if (target.kind === 'tile') title = e.type === 'earth' ? 'Terra' : 'Piso';

  if (bp) {
    title = `Obra: ${BUILD[bp].name}`;
    push('build');
    push('cancelBuild');
    return { title, items };
  }

  if (target.kind === 'obj') {
    for (const a of OBJ[e.type].actions) {
      if (a === 'planter') planterActions(s, e).forEach(push);
      else if (INFO[a]) items.push({ ...INFO[a](s, e), info: true });
      else push(a);
    }
    if (e.type === 'planter') title += ` — ${planterStatus(e)}`;
    if (e.type === 'car' && isOutbreak(s)) items[0].label = 'Sair de casa (vai virar zumbi!)';
    if (e.type === 'solar' && s.ev?.solarBroken) { title += ' — inversor queimado'; push('repairSolar'); }
    if (e.type === 'bunkerLadder' && s.floors.bunker?.hatchSealed) items.splice(1, 1, { label: 'Alçapão vedado: ar limpo', icon: 'check', info: true });
    if (e.type === 'lab') {
      const ri = researchInfo(s);
      title = `Laboratório — ${Math.round(ri.pts)}%`;
      items.unshift({ info: true, icon: 'flask', label: `Fase ${ri.idx + 1}/3: ${ri.phase.name}` + (ri.locked ? ' · precisa de amostra' : '') });
      if (floorOf(s) === 'bunker') items.splice(1, 0, { info: true, icon: 'check', label: 'No bunker: +50% por sessão' });
    }
  } else if (target.kind === 'edge') {
    const isOpening = e.type === 'window' || e.type === 'door' || e.type === 'vent';
    if (e.broken) {
      items.push({ label: `Arrombada pelos zumbis!`, icon: 'warning', info: true });
      push('rebuild');
      items[items.length - 1].label = `Reconstruir (${Object.entries(BUILD[e.type].cost).map(([r, n]) => n + ' ' + r).join(', ')})`;
      return { title, items };
    }
    const V = s.ev?.visit;
    if (e.type === 'door' && V && V.state === 'wait' && V.key === target.key && floorOf(s) === 'ground') push('answer');
    if (isOpening) {
      if (e.sealed) items.push({ label: 'Vedada', icon: 'check', info: true });
      else push('seal');
    }
    if (isExteriorOpening(s, target.key, e) && floorOf(s) === 'ground') {
      const hp = hpOf(e), mx = maxHp(e);
      title += ` · ${['sem reforço', 'tábuas', 'chapas'][e.rf || 0]} ${Math.round(hp)}/${mx}`;
      if (!e.rf) push('reinforce1');
      else if (e.rf === 1) push('reinforce2');
      if (hp < mx) push('patch');
    }
    if ((e.type === 'window' || e.type === 'vent') && isOutbreak(s) && (floorOf(s) !== 'ground' || isExteriorOpening(s, target.key, e))) push('sampleAir');
    if (e.type === 'fence') items.push({ label: `Resistência ${Math.round(hpOf(e))}/${maxHp(e)}`, icon: 'shield', info: true });
  }
  return { title, items };
}
