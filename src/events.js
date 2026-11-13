// Eventos aleatórios. Antes do Dia 0: vizinhos tocam a campainha com pedidos e ofertas, e imprevistos
// pelo bairro. Depois: sobreviventes batendo à porta, hordas, tempestades, suprimentos e panes.
// Escolhas têm consequência, às vezes dias depois (presentes, recados no rádio, quem virou zumbi).
import { W, H, DAY, OUTBREAK_TIME, RESEARCH } from './config.js';
import { dayIndex, minuteOfDay, shopsStatus } from './time.js';
import { findPath, zombieWalkable, zombieStep, isWalkable, canStep, onFloor, isOutbreak, countBuilt, allObjects } from './world.js';
import { isExteriorOpening, outsideTile, insideTile } from './siege.js';
import { stepAlong, queueTask, isSleeping } from './player.js';
import { citizenLook } from './people.js';
import { HOMES_NEAR } from './citizens.js';
import { homeName, residentsOf } from './neighbors.js';
import { newIntruder } from './npc.js';
import { nightLevel } from './light.js';
import { bus, toast } from './bus.js';
import { eggEvents } from './eastereggs.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const k2 = (x, y) => x + ',' + y;
const note = (msg) => toast(msg, 'event');
const mod = (s) => minuteOfDay(s.time);
const greet = (s) => (mod(s) < 12 * 60 ? 'bom dia' : mod(s) < 18 * 60 ? 'boa tarde' : 'boa noite');
const daytime = (s, a = 8, b = 19.5) => mod(s) >= a * 60 && mod(s) < b * 60;

export function evState(s) {
  return (s.ev ||= { next: s.time + rnd(5, 8) * 60, visit: null, pending: [], done: {}, promo: null, blackout: 0, horde: 0, solarBroken: false });
}

// ao carregar um save: o visitante (que não é salvo) já foi embora
export function onLoadEvents(s) {
  const E = evState(s);
  E.visit = null;
}

// ---------------- Visitantes ----------------
function frontDoor(s) {
  return onFloor(s, 'ground', () => {
    const doors = Object.entries(s.world.walls).filter(([k, w]) => w.type === 'door' && isExteriorOpening(s, k, w));
    if (!doors.length) return null;
    // a porta da frente (mais perto da rua) primeiro
    doors.sort((a, b) => (outsideTile(s, b[0])?.[1] ?? 0) - (outsideTile(s, a[0])?.[1] ?? 0));
    const [key] = doors[0];
    return { key, out: outsideTile(s, key), in: insideTile(s, key) };
  });
}

function spawnVisitor(s, who) {
  const door = frontDoor(s);
  if (!door?.out || !door.in) return null;
  return onFloor(s, 'ground', () => {
    // entra no terreno pela calçada, o mais perto possível da porta
    const starts = [];
    for (let x = 0; x < W; x++) if (zombieWalkable(s, x, H - 1)) starts.push([x, H - 1]);
    starts.sort((a, b) => Math.abs(a[0] - door.out[0]) - Math.abs(b[0] - door.out[0]));
    for (const st of starts) {
      const path = findPath(s, st[0], st[1], new Set([k2(...door.out)]), zombieWalkable, zombieStep);
      if (!path) continue;
      const v = {
        ...who, id: 'v' + Math.random().toString(36).slice(2), mode: 'visitor',
        x: st[0], y: st[1], px: st[0] + 0.5, py: st[1] + 0.5, path, start: st,
        facing: 1, walk: 0, moving: false, alpha: 0, speed: who.speed || 0.24, stride: 6, activity: 'vindo até a sua porta',
      };
      v.look = who.look || citizenLook(v);
      s.npcs.push(v);
      return { v, door };
    }
    return null;
  });
}

// um vizinho de verdade, que está em casa agora
function neighborAtHome(s) {
  const homes = HOMES_NEAR.slice(0, 10);
  const cands = s.npcs.filter((c) => c.mode === 'citizen' && !c.zombie && c.state === 'inside' && c.at === c.home && homes.includes(c.home) && !c.busy);
  return cands.length ? pick(cands) : null;
}

const SURV_NAMES = ['Marta', 'Rafael', 'Joana', 'Diego', 'Clara', 'Wesley', 'Bianca', 'Tiago'];
function survivor() {
  const name = pick(SURV_NAMES);
  return {
    name, persona: 'casa', skin: pick(['#e0ac69', '#c68642', '#8d5524', '#f1c27d']),
    shirt: pick(['#8a3b3b', '#3b5a8a', '#5a7a3b', '#7a5a8a']), pants: '#3a3f55', hair: pick(['#3b2a20', '#1f1a17', '#7a5a3a']),
    speed: 0.2,
  };
}

function startVisit(s, ev) {
  const E = evState(s);
  let who, src = null;
  if (ev.who) who = ev.who(s);
  else if (ev.post) who = survivor();
  else {
    src = neighborAtHome(s);
    if (!src) return false;
    who = { name: src.name, persona: src.persona, skin: src.skin, shirt: src.shirt, pants: src.pants, hair: src.hair, look: citizenLook(src), speed: src.speed };
  }
  const sp = spawnVisitor(s, who);
  if (!sp) return false;
  if (src) src.busy = true;
  E.visit = { ev: ev.id, npc: sp.v.id, key: sp.door.key, in: sp.door.in, state: 'arrive', until: 0, src: src?.id ?? null, house: src ? homeName(src.home) : null, post: !!ev.post, ring: 0 };
  return true;
}

function visitor(s) {
  const V = evState(s).visit;
  return V && s.npcs.find((n) => n.id === V.npc);
}

function leave(s) {
  const E = evState(s), V = E.visit, v = visitor(s);
  if (!V) return;
  if (!v) { endVisit(s); return; }
  v.ring = false;
  v.activity = 'indo embora';
  v.path = onFloor(s, 'ground', () => findPath(s, v.x, v.y, new Set([k2(...v.start)]), zombieWalkable, zombieStep)) || [];
  V.state = 'leave';
}

function endVisit(s) {
  const E = evState(s), V = E.visit;
  if (!V) return;
  s.npcs = s.npcs.filter((n) => n.id !== V.npc);
  const src = s.npcs.find((c) => c.id === V.src);
  if (src) src.busy = false;
  E.visit = null;
}

function updateVisit(s, dt) {
  const E = evState(s), V = E.visit;
  if (!V) return;
  const v = visitor(s);
  if (!v) { E.visit = null; return; }
  v.alpha = Math.min(1, v.alpha + dt * 0.2);
  if (V.state === 'arrive') {
    if (v.path.length) { stepAlong(v, v.speed * dt); return; }
    v.moving = false; v.back = true; v.ring = true; v.knock = V.post;
    v.activity = V.post ? 'batendo na porta' : 'tocando a campainha';
    V.state = 'wait';
    V.until = s.time + (V.post ? 70 : 100);
    V.ring = s.time;
    bus.emit('ring', V.post);
    toast(V.post ? 'Batidas na porta! Alguém lá fora pede ajuda. Toque na porta para atender.' : `Ding-dong! ${v.name}${V.house ? ` (${V.house})` : ''} tocou a campainha. Toque na porta para atender.`, V.post ? 'bad' : 'info');
  } else if (V.state === 'wait') {
    if (s.time - V.ring > 25) { V.ring = s.time; bus.emit('ring', V.post); }
    if (s.time >= V.until) {
      const ev = EVENTS.find((e) => e.id === V.ev);
      if (ev?.timeout) ev.timeout(s, v, V);
      else toast(`${v.name} desistiu de esperar e foi embora.`, 'info');
      leave(s);
    }
  } else if (V.state === 'leave') {
    if (v.path.length) { stepAlong(v, v.speed * dt); v.alpha = Math.min(v.alpha, 1); return; }
    v.alpha -= dt * 0.3;
    if (v.alpha <= 0) endVisit(s);
  }
}

// Atender: o Dr. larga o que está fazendo e vai até a porta
bus.on('goAnswer', (s) => {
  const V = evState(s).visit;
  if (!V || V.state !== 'wait') return;
  const p = s.player;
  if (p.floor !== 'ground') { toast('Desça ao térreo para atender a porta.', 'bad'); return; }
  if (p.task) { p.queue.unshift({ id: -Date.now(), target: p.task.target, act: p.task.act }); p.task = null; p.hidden = false; }
  p.path = [];
  queueTask(s, { kind: 'spot', x: V.in[0], y: V.in[1], floor: 'ground' }, 'answerDo');
});

bus.on('answerDoor', (s) => {
  const E = evState(s), V = E.visit, v = visitor(s);
  if (!V || V.state !== 'wait' || !v) return;
  V.state = 'talk';
  v.ring = false;
  v.activity = 'conversando com o Dr.';
  const ev = EVENTS.find((e) => e.id === V.ev);
  showCard(s, ev, v, V, () => { if (E.visit === V && V.state === 'talk') leave(s); });
});

// ---------------- Cartões de decisão ----------------
function showCard(s, ev, v, V, after) {
  const c = ev.card(s, v, V);
  bus.emit('eventCard', {
    ...c,
    who: v || null,
    house: V?.house || null,
    choices: c.choices.map((ch) => ({
      ...ch,
      ok: ch.can ? ch.can(s) : true,
      run: () => { ch.run?.(s, v, V); after?.(); },
    })),
  });
}

// ---------------- Consequências futuras ----------------
function later(s, minutes, item) {
  evState(s).pending.push({ at: s.time + minutes, ...item });
}

const GIVE_NAMES = { comida: 'comida', agua: 'água', madeira: 'madeira', metal: 'metal', vedacao: 'kits de vedação', sementes: 'sementes', kitMedico: 'kit médico', reagentes: 'reagentes' };
const giveStr = (items) => Object.entries(items).map(([r, n]) => `+${n} ${GIVE_NAMES[r] || r}`).join(', ');
const give = (s, items) => { for (const [r, n] of Object.entries(items)) s.stock[r] = (s.stock[r] || 0) + n; };

function runPending(s, p) {
  if (p.type === 'gift') {
    if (isOutbreak(s) && !p.anyTime) return; // o presente não chegou a tempo
    give(s, p.items);
    if (p.money) s.money += p.money;
    const got = giveStr(p.items);
    note(got ? `${p.text} (${got})` : p.text);
  } else if (p.type === 'radio') {
    note(p.text);
  } else if (p.type === 'turn') {
    // o sobrevivente que entrou não resistiu
    let g = s.npcs.find((n) => n.id === p.npc);
    const pos = g ? [g.x, g.y] : p.pos;
    s.npcs = s.npcs.filter((n) => n !== g);
    const z = { ...newIntruder(pos[0], pos[1]), shirt: g?.shirt || '#8a3b3b' };
    s.npcs.push(z);
    s._intrDirty = true;
    toast(`${p.name} começa a tremer… e se levanta diferente. Virou um deles, dentro de casa!`, 'bad');
  } else if (p.type === 'fate') {
    note(`Pela fresta da janela você reconhece a roupa de ${p.name}, cambaleando no meio deles.`);
  }
}

// ---------------- Catálogo ----------------
const pre = (s) => !isOutbreak(s);
const post = (s) => isOutbreak(s);
const researchCap = (s, n) => { s.research.pts = Math.min(Math.max(s.research.pts, RESEARCH.phases[0].to * 0.99), s.research.pts + n); };

export const EVENTS = [
  // ===== Antes do Dia 0: visitas =====
  {
    id: 'arroz', visit: true, weight: 3, gap: 1.5 * DAY,
    when: (s) => pre(s) && daytime(s),
    card: (s, v) => ({
      title: 'Vizinho na porta', icon: 'home',
      text: `"Doutor, ${greet(s)}! Desculpa incomodar… acabou o arroz lá em casa e o mercado está uma loucura. O senhor teria um pouquinho?"`,
      choices: [
        { label: 'Dar 2 porções de comida', desc: 'Um favor nunca é esquecido.', can: (s) => s.stock.comida >= 2 || 'Você não tem 2 porções', run: (s, v, V) => {
          s.stock.comida -= 2;
          toast(`${v.name} agradece muito e promete retribuir.`, 'good');
          later(s, rnd(0.8, 1.6) * DAY, { type: 'gift', items: pick([{ madeira: 4 }, { sementes: 4 }, { vedacao: 1, comida: 2 }, { agua: 4 }]), text: `${v.name} deixou um pacote na sua porta, com um bilhete: "Obrigado pelo arroz, Doutor!"` });
        } },
        { label: 'Hoje não vai dar', desc: 'Cada porção pode fazer falta.', run: (s, v) => toast(`${v.name} entende e volta para casa.`, 'info') },
      ],
    }),
  },
  {
    id: 'consulta', visit: true, weight: 3, gap: 2 * DAY,
    when: (s) => pre(s) && daytime(s) && dayIndex(s.time) >= -5,
    card: (s, v) => ({
      title: 'Uma consulta na porta', icon: 'medkit',
      text: `"Doutor, o senhor é médico, né? Meu filho está com febre e uma tosse esquisita desde ontem. No posto disseram que é só virose…"`,
      choices: [
        { label: 'Examinar o menino', desc: '+5% na pesquisa · −10 energia · eles insistem em pagar R$ 150', can: (s) => s.needs.energy >= 15 || 'Cansado demais', run: (s) => {
          researchCap(s, 5); s.needs.energy = Math.max(0, s.needs.energy - 10); s.money += 150;
          toast('Os sintomas batem com o que você temia. Você anota tudo. (+5% pesquisa, +R$ 150)', 'good');
        } },
        { label: 'Mandar ao hospital', desc: 'Não é mais sua função.', run: (s, v) => toast(`${v.name} vai embora preocupado.`, 'info') },
      ],
    }),
  },
  {
    id: 'garagem', visit: true, weight: 2, once: true,
    when: (s) => pre(s) && daytime(s) && dayIndex(s.time) <= -2,
    card: (s, v) => ({
      title: 'Venda de garagem', icon: 'wood',
      text: `"Doutor! A gente está indo para o sítio da minha sogra até essa confusão passar. Estou vendendo o que sobrou da reforma: tábuas e umas chapas. R$ 250 tudo."`,
      choices: [
        { label: 'Comprar por R$ 250', desc: '+6 madeira, +2 metal, sem perder 3 horas indo à loja.', can: (s) => s.money >= 250 || 'Dinheiro insuficiente', run: (s) => { s.money -= 250; give(s, { madeira: 6, metal: 2 }); toast('Negócio fechado. +6 madeira, +2 metal', 'good'); } },
        { label: 'Não, obrigado', run: (s, v) => toast(`${v.name} deseja boa sorte e segue para a próxima casa.`, 'info') },
      ],
    }),
  },
  {
    id: 'cetico', visit: true, weight: 2, once: true,
    when: (s) => pre(s) && daytime(s) && dayIndex(s.time) <= -3,
    card: (s, v) => ({
      title: 'O vizinho cético', icon: 'home',
      text: `"Ô Doutor! Vi o senhor carregando madeira para lá e para cá. Vai construir uma arca? Hahaha! Esse vírus aí é invenção da TV."`,
      choices: [
        { label: 'Explicar o perigo com calma', desc: 'Talvez ele acredite. Talvez não. (−5 energia)', run: (s, v) => {
          s.needs.energy = Math.max(0, s.needs.energy - 5);
          if (chance(0.55)) {
            toast(`${v.name} fica sério. "O senhor acha mesmo?"`, 'info');
            later(s, rnd(1, 2) * DAY, { type: 'gift', items: { vedacao: 2 }, text: `${v.name} deixou 2 kits de vedação na sua porta. No bilhete: "Comprei a mais. O senhor tinha razão."` });
          } else toast(`${v.name} ri e vai embora. "Arca de Noé!"`, 'info');
        } },
        { label: 'Só sorrir e acenar', run: (s, v) => toast(`${v.name} vai embora rindo sozinho.`, 'info') },
      ],
    }),
  },
  {
    id: 'abrigo', visit: true, weight: 6, once: true,
    when: (s) => pre(s) && (dayIndex(s.time) === -1 ? daytime(s) : dayIndex(s.time) === 0 && daytime(s, 7, 10.5)),
    card: (s, v) => ({
      title: 'Um pedido difícil', icon: 'warning',
      text: `"Doutor… a TV não fala de outra coisa. O senhor sempre avisou. A gente não tem nada estocado, e as lojas estão vazias. Eu tenho filhos pequenos…"`,
      choices: [
        { label: 'Dar 3 comida e 3 água', desc: 'Pode fazer falta depois.', can: (s) => (s.stock.comida >= 3 && s.stock.agua >= 3) || 'Você não tem o bastante', run: (s, v) => {
          s.stock.comida -= 3; s.stock.agua -= 3;
          toast(`${v.name} chora e te abraça. "Deus lhe pague, Doutor."`, 'good');
          later(s, Math.max(60, OUTBREAK_TIME + DAY + 20 * 60 - s.time), { type: 'radio', text: `No rádio de pilha, uma voz conhecida: "…aqui é ${v.name}. Se o Doutor estiver ouvindo: a gente chegou no abrigo da igreja. Obrigada por tudo."` });
        } },
        { label: 'Ensinar a vedar a casa', desc: 'Conhecimento não pesa na despensa.', run: (s, v) => toast(`Você mostra como usar fita e plástico nas frestas. ${v.name} anota tudo.`, 'info') },
        { label: 'Fechar a porta', run: (s, v) => toast(`${v.name} fica parado um tempo na calçada antes de ir embora.`, 'bad') },
      ],
    }),
  },

  // ===== Antes do Dia 0: imprevistos =====
  {
    id: 'entrega', weight: 2, once: true,
    when: (s) => pre(s) && daytime(s, 9, 18) && dayIndex(s.time) <= -2,
    card: (s) => {
      const house = homeName(pick(HOMES_NEAR.slice(0, 6)));
      return {
        title: 'Encomenda trocada', icon: 'box',
        text: `O entregador deixou na sua porta uma caixa endereçada à ${house}. Pelo rótulo: 3 kits de vedação.`,
        choices: [
          { label: 'Ficar com a caixa', desc: '+3 kits de vedação. Ninguém vai saber.', run: (s) => { give(s, { vedacao: 3 }); toast('Você guarda a caixa no estoque. +3 kits de vedação', 'good'); } },
          { label: 'Levar aos vizinhos', desc: 'O certo a fazer.', run: (s) => {
            toast(`A ${house} agradece a gentileza.`, 'info');
            later(s, rnd(0.7, 1.4) * DAY, { type: 'gift', items: { comida: 3, agua: 3 }, text: `A ${house} deixou uma cesta na sua porta: "Pela honestidade, Doutor."` });
          } },
        ],
      };
    },
  },
  {
    id: 'promo', weight: 2, gap: 2 * DAY, simple: true,
    when: (s) => pre(s) && daytime(s, 7, 14) && dayIndex(s.time) <= -1 && !shopsStatus(s),
    run: (s) => {
      const shop = pick(['construcao', 'mercado']);
      evState(s).promo = { shop, until: s.time - mod(s) + 21 * 60 };
      note(shop === 'construcao' ? 'Panfleto na caixa de correio: Loja de Construção com 25% de desconto hoje, até as 21h!' : 'Panfleto na caixa de correio: Supermercado com 25% de desconto hoje, até as 21h!');
    },
  },
  {
    id: 'apagao', weight: 1.5, gap: 3 * DAY, simple: true,
    when: (s) => pre(s) && dayIndex(s.time) >= -6 && dayIndex(s.time) <= -1,
    run: (s) => { evState(s).blackout = s.time + 180; note('Queda de energia no bairro! A companhia promete religar em umas 3 horas.'); },
  },

  // ===== Depois do Dia 0 =====
  {
    id: 'sobrevivente', visit: true, post: true, weight: 3, gap: 1.5 * DAY,
    when: (s) => post(s) && daytime(s, 7.5, 16.5) && s.time > OUTBREAK_TIME + 240,
    card: (s, v) => ({
      title: 'Alguém lá fora', icon: 'warning',
      text: `"Tem alguém aí? Por favor! Meu nome é ${v.name}. Eu estou bem, juro, é só uma tossezinha… Me deixa entrar, por favor, eles vão voltar quando escurecer!"`,
      choices: [
        { label: 'Abrir a porta', desc: 'O ar de fora entra junto (+12 contaminação). E se a tosse for o que você está pensando?', run: (s, v, V) => {
          s.needs.contamination = Math.min(100, s.needs.contamination + 12);
          give(s, { comida: 2, kitMedico: 1 });
          toast(`${v.name} entra chorando e divide o que tem na mochila. (+2 comida, +1 kit médico)`, 'good');
          // vira hóspede dentro de casa… por enquanto
          v.mode = 'guest'; v.ring = false; v.activity = 'tossindo, encolhido num canto';
          v.x = V.in[0]; v.y = V.in[1]; v.px = v.x + 0.5; v.py = v.y + 0.5; v.path = []; v.back = false;
          later(s, rnd(70, 160), { type: 'turn', npc: v.id, name: v.name, pos: V.in });
          evState(s).visit = null;
        } },
        { label: 'Passar comida e água pela fresta', desc: '−1 comida, −1 água', can: (s) => (s.stock.comida >= 1 && s.stock.agua >= 1) || 'Você não tem o bastante', run: (s, v) => {
          s.stock.comida--; s.stock.agua--;
          give(s, { reagentes: 1 });
          toast(`${v.name} agradece e passa de volta pela fresta um frasco que pegou numa farmácia. (+1 reagente)`, 'good');
        } },
        { label: 'Não responder', desc: 'Silêncio. Esperar que vá embora.', run: (s, v) => later(s, rnd(90, 200), { type: 'fate', name: v.name }) },
      ],
    }),
    timeout: (s, v) => { toast(`As batidas param. ${v.name} desiste e se afasta.`, 'bad'); later(s, rnd(90, 200), { type: 'fate', name: v.name }); },
  },
  {
    id: 'horda', post: true, weight: 2, gap: 2 * DAY,
    when: (s) => post(s) && daytime(s, 15, 19),
    card: (s) => ({
      title: 'Aviso no rádio', icon: 'radio',
      text: '"…repetindo: uma grande concentração de infectados está se deslocando pela zona norte esta noite. Quem estiver em casa: apague as luzes, não faça barulho, reforce portas e janelas…"',
      choices: [{ label: 'Preparar a casa', desc: 'Esta noite virão muito mais. Apague as luzes e fique em silêncio.', run: (s) => { evState(s).horde = s.time - mod(s) + DAY + 6 * 60; } }],
    }),
  },
  {
    id: 'drone', post: true, weight: 1.5, gap: 3 * DAY,
    when: (s) => post(s) && daytime(s, 9, 16),
    card: (s) => {
      const attic = !!s.floors.attic;
      const loot = { comida: 4, agua: 4, kitMedico: 1, reagentes: 2 };
      return {
        title: 'Suprimentos do céu', icon: 'box',
        text: attic
          ? 'Um zumbido sobre o telhado: um drone do exército solta uma caixa de suprimentos. Ela cai bem em cima da casa! Da janela do sótão dá para puxá-la com um cabo de vassoura.'
          : 'Um zumbido sobre o telhado: um drone do exército solta uma caixa de suprimentos… que cai no meio do quintal, onde ninguém pode ir. Com um sótão, daria para alcançar o telhado.',
        choices: attic
          ? [{ label: 'Puxar a caixa pelo sótão', desc: giveStr(loot), run: (s) => { give(s, loot); toast(`A caixa está inteira! ${giveStr(loot)}`, 'good'); } }]
          : [{ label: 'Ver a caixa ficar lá fora', run: () => {} }],
      };
    },
  },
  {
    id: 'tempestade', post: true, weight: 2, gap: 2 * DAY, simple: true,
    when: (s) => post(s) && onFloor(s, 'ground', () => Object.entries(s.world.walls).some(([k, w]) => w.type === 'window' && w.sealed && isExteriorOpening(s, k, w))),
    run: (s) => {
      const win = onFloor(s, 'ground', () => pick(Object.entries(s.world.walls).filter(([k, w]) => w.type === 'window' && w.sealed && isExteriorOpening(s, k, w))));
      if (win) win[1].sealed = false;
      const rain = countBuilt(s, 'cistern') * 3 + countBuilt(s, 'tank') * 3;
      if (rain) s.stock.agua += rain;
      note(`Tempestade! O vento arrancou a vedação de uma janela: o ar contaminado está entrando. Vede de novo!${rain ? ` (Chuva captada: +${rain} água)` : ''}`);
    },
  },
  {
    id: 'ratos', post: true, weight: 1.2, gap: 3 * DAY, simple: true,
    when: (s) => post(s) && s.stock.comida >= 5,
    run: (s) => { const n = Math.max(1, Math.round(s.stock.comida * 0.15)); s.stock.comida -= n; note(`Ratos roeram a despensa durante a noite. −${n} comida.`); },
  },
  {
    id: 'painel', post: true, weight: 1.5, gap: 3 * DAY, simple: true,
    when: (s) => post(s) && countBuilt(s, 'solar') > 0 && !evState(s).solarBroken && s.time > OUTBREAK_TIME + DAY,
    run: (s) => { evState(s).solarBroken = true; note('O inversor do painel solar queimou! A casa está sem energia. Toque no painel para consertar (1 metal).'); },
  },
  {
    id: 'grito', post: true, weight: 1, gap: 2 * DAY, simple: true,
    when: (s) => post(s) && nightLevel(s) > 0.3,
    run: () => note(pick([
      'Um grito na casa ao lado. Depois, silêncio.',
      'Um carro passa em disparada, buzinando sem parar. Some na esquina. Ninguém vai atrás.',
      'Um cachorro late a noite toda. De madrugada, para de repente.',
      'Ao longe, tiros. Três. Depois mais nenhum.',
    ])),
  },
];

EVENTS.push(...eggEvents({ DAY, pre, post, daytime, note, give, later, nightLevel }));

// ---------------- Laço ----------------
export function updateEvents(s, dt) {
  if (s.flags.gameOver) return;
  const E = evState(s);
  updateVisit(s, dt);
  for (const g of s.npcs || []) if (g.mode === 'guest' && g.path.length) stepAlong(g, 0.1 * dt);
  if (E.pending.length) {
    const due = E.pending.filter((p) => s.time >= p.at);
    if (due.length) { E.pending = E.pending.filter((p) => s.time < p.at); due.forEach((p) => runPending(s, p)); }
  }
  if (E.promo && s.time > E.promo.until) E.promo = null;
  if (s.time < E.next || E.visit || s.player.away) return;

  const canVisit = !isSleeping(s) && s.player.floor !== 'bunker';
  const pool = EVENTS.filter((e) =>
    (!e.once || !E.done[e.id]) && s.time - (E.done[e.id] ?? -1e9) >= (e.gap || DAY) && (!e.visit || canVisit) && e.when(s));
  if (!pool.length) { E.next = s.time + 45; return; }
  let r = Math.random() * pool.reduce((t, e) => t + e.weight, 0);
  const ev = pool.find((e) => (r -= e.weight) <= 0) || pool[0];

  const ok = ev.visit ? startVisit(s, ev) : true;
  if (!ok) { E.next = s.time + 30; return; }
  E.done[ev.id] = s.time;
  E.next = s.time + (isOutbreak(s) ? rnd(7, 13) : rnd(5, 10)) * 60;
  if (ev.visit) return;
  if (ev.simple) ev.run(s);
  else showCard(s, ev, null, null, null);
}

// Efeitos usados por outros sistemas
export const promoMult = (s, shopId) => (s.ev?.promo && s.ev.promo.shop === shopId && s.time <= s.ev.promo.until ? 0.75 : 1);
export const hordeMult = (s) => (s.ev?.horde && s.time < s.ev.horde ? 1.8 : 1);
