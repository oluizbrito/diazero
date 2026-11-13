// Segredos (easter eggs): referências geek e brasileiras escondidas pela casa, pela TV, pelo rádio e no teclado.
// Os achados valem entre partidas (localStorage); os efeitos de "uma vez por jogo" ficam em s.flags.eggOnce.
import { minuteOfDay, dayIndex, pad } from './time.js';
import { bus, toast } from './bus.js';

export const EGGS = [
  { id: 'konami', title: 'Código secreto', hint: 'Um código famoso de videogame, digitado com as setas.', desc: '↑↑↓↓←→←→BA: necessidades cheias, uma vez por jogo.' },
  { id: 'xyzzy', title: 'Palavra mágica', hint: 'A palavra de uma aventura de texto de 1976.', desc: 'XYZZY. Nada acontece.' },
  { id: 'iddqd', title: 'Modo deus', hint: 'O código de invencibilidade de um FPS dos anos 90.', desc: 'IDDQD não funciona com ciência.' },
  { id: 'penta', title: 'É penta!', hint: 'Digite o grito de 2002.', desc: 'Depois do Dia 0, o grito atrai os infectados.' },
  { id: 'sextou', title: 'Sextou', hint: 'Digite o grito oficial do fim de semana.', desc: 'No apocalipse todo dia é sexta. E segunda.' },
  { id: 'varginha', title: 'Eu vi!', hint: 'Digite o nome da cidade mineira mais famosa de 1996.', desc: 'O ET de Varginha. Ninguém vai acreditar em você.' },
  { id: 'vozbrasil', title: 'Em Brasília, 19 horas', hint: 'Ouça o rádio de pilha na hora certa, antes do Dia 0.', desc: 'A Voz do Brasil no rádio de pilha.' },
  { id: 'leet', title: 'Hora de elite', hint: 'Olhe o relógio de pêndulo no começo da tarde.', desc: '13:37. Elite.' },
  { id: 'cuca', title: 'A Cuca vem pegar', hint: 'Olhe o relógio de pêndulo à meia-noite.', desc: 'Dorme, nenê.' },
  { id: 'livro42', title: 'A resposta', hint: 'A estante de livros muda conforme a hora.', desc: 'A resposta para a vida, o universo e tudo mais.' },
  { id: 'alienista', title: 'Casa Verde', hint: 'Há um clássico de Machado na estante.', desc: 'O médico que internou a cidade inteira.' },
  { id: 'sorvete', title: 'Pote de sorvete', hint: 'Abra a geladeira mais de uma vez.', desc: 'Nunca é sorvete. É feijão.' },
  { id: 'zap', title: 'Grupo da família', hint: 'Antes do Dia 0, o celular apita.', desc: 'Chá de boldo cura tudo, segundo a Tia Cleide.' },
  { id: 'viajante', title: '1,21 gigawatt', hint: 'Um visitante que não sabe em que ano está.', desc: 'Ele precisava de energia para o carro.' },
  { id: 'evidencias', title: 'Ninguém resiste', hint: 'Uma noite depois do Dia 0, alguém canta na rua.', desc: 'Evidências, num karaokê a pilha.' },
  { id: 'zumbi', title: 'Rosto conhecido', hint: 'Toque nos infectados: alguns ainda têm personalidade.', desc: 'Nem todo zumbi perdeu o estilo.' },
  { id: 'preguica', title: 'Ai, que preguiça!', hint: 'Insista no símbolo da tela de título.', desc: 'Macunaíma, o herói sem nenhum caráter.' },
];
const BY_ID = Object.fromEntries(EGGS.map((e) => [e.id, e]));
const KEY = 'diazero.segredos';

function loadFound() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}
const found = loadFound();
export const isFound = (id) => found.has(id);
export const foundCount = () => EGGS.filter((e) => found.has(e.id)).length;

export function findEgg(id) {
  if (!BY_ID[id] || found.has(id)) return;
  found.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch { /* sem armazenamento: vale só nesta sessão */ }
  bus.emit('toast', { msg: `Segredo encontrado: ${BY_ID[id].title} (${foundCount()}/${EGGS.length})`, kind: 'egg' });
}

const once = (s, id) => {
  const o = (s.flags.eggOnce ||= {});
  if (o[id]) return false;
  o[id] = true;
  return true;
};
const hash = (str) => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ---------------- Códigos no teclado ----------------
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keys = [];
let typed = '';

const WORDS = {
  xyzzy: () => toast('Nada acontece.', 'info'),
  iddqd: () => toast('IDDQD? Modo deus não existe, Doutor. Existe vedação, estoque e método científico.', 'info'),
  sextou: (s) => toast(s.flags.outbreak ? 'SEXTOU! …ou é terça? Depois do Dia 0, o calendário perdeu o sentido.' : 'SEXTOU! O Dr. abre uma cerveja sem álcool e volta a pregar tábuas.', 'info'),
  penta: (s) => {
    if (s.flags.outbreak && s.player.floor !== 'bunker') {
      s.noise = 1;
      toast('É PENTAAA! O Dr. grita como em 2002… e lá fora, os infectados ouviram.', 'bad');
    } else toast('É PENTAAA! O Dr. grita da janela como em 2002. Os vizinhos acham que ele enlouqueceu de vez.', 'info');
  },
  varginha: () => toast('Um vulto de pele marrom e olhos vermelhos espia por cima do muro e some. Não era zumbi. Ninguém vai acreditar em você.', 'event'),
};

export function onKey(G, e) {
  const s = G.s;
  keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
  if (keys.join() === KONAMI.join()) {
    keys = [];
    if (once(s, 'konami')) {
      Object.assign(s.needs, { hunger: 100, thirst: 100, energy: 100 });
      toast('↑↑↓↓←→←→BA! O Dr. sente que ganhou 30 vidas… era só um café passado na hora. (Fome, sede e energia cheias)', 'good');
    } else toast('↑↑↓↓←→←→BA! Desta vez, nada. Truque de uma vez por partida.', 'info');
    findEgg('konami');
    return 'konami';
  }
  if (e.key.length !== 1) return null;
  typed = (typed + e.key.toLowerCase()).slice(-12);
  for (const [w, fn] of Object.entries(WORDS)) {
    if (typed.endsWith(w)) { typed = ''; fn(s); findEgg(w); return w; }
  }
  return null;
}

// ---------------- Objetos da casa ----------------
const BOOKS = [
  { t: 'O Guia do Mochileiro das Galáxias. Na página 42, sublinhado à caneta: "a resposta é 42". O Dr. ainda procura a pergunta.', egg: 'livro42' },
  { t: 'O Alienista, de Machado de Assis. Um médico que internou a cidade inteira na Casa Verde. Na margem: "o Simão Bacamarte tinha um ponto".', egg: 'alienista' },
  { t: 'Guerra Mundial Z, cheio de anotações a lápis. Na última página: "otimista demais".' },
  { t: 'Macunaíma, de Mário de Andrade. Um marcador na página do "Ai, que preguiça!".' },
  { t: 'Uma coleção de gibis da Turma, de quando os netos vinham passar as férias.' },
  { t: 'Virologia, epidemiologia… e romances policiais.' },
];
export function bookInfo(s) {
  const b = BOOKS[Math.floor(minuteOfDay(s.time) / 60) % BOOKS.length];
  return { label: b.t, icon: 'info', egg: b.egg };
}

export function clockInfo(s) {
  const m = minuteOfDay(s.time);
  const hh = pad(m / 60), mm = pad(m % 60);
  if (m >= 13 * 60 + 30 && m < 13 * 60 + 45) {
    return m === 13 * 60 + 37
      ? { label: '13:37. Um horário de elite. O pêndulo parece balançar com mais estilo.', icon: 'clock', egg: 'leet' }
      : { label: `Tic-tac. São ${hh}:${mm}. Quase um horário de elite.`, icon: 'clock' };
  }
  if (m < 20) return { label: `Dong… dong… Meia-noite (${hh}:${mm}). Dorme, nenê, que a Cuca vem pegar.`, icon: 'clock', egg: 'cuca' };
  return { label: `Tic-tac. São ${hh}:${mm}. Era do seu pai.`, icon: 'clock' };
}

// muda a cada meia hora de jogo: quem abre a geladeira mais de uma vez acaba achando
export function fridgeInfo(s) {
  return Math.floor(s.time / 30) % 3 === 0
    ? { label: 'No fundo, um pote de sorvete de creme. Você já sabe: é feijão.', icon: 'info', egg: 'sorvete' }
    : { label: 'Leite, ovos, meio pudim e um pote de margarina cheio de botões.', icon: 'info' };
}

export function pcInfo(s) {
  const L = [
    'Na área de trabalho: "tese_final_FINAL_v3_agoravai.doc".',
    'Uma aba aberta há 9 anos: "como desligar o caps lock".',
    'O papel de parede é um mapa da propagação da gripe de 1918.',
    'Senha num post-it colado no monitor: "senha123". Segurança de primeira.',
  ];
  return { label: L[Math.floor(minuteOfDay(s.time) / 120) % L.length], icon: 'info' };
}

// ---------------- Rádio: A Voz do Brasil ----------------
// Antes do Dia 0, às 19h, o rádio toca a Voz do Brasil em vez do plantão
export function radioEgg(s) {
  const m = minuteOfDay(s.time);
  if (s.flags.outbreak || m < 19 * 60 || m >= 20 * 60) return false;
  bus.emit('eggStory', {
    title: 'A Voz do Brasil', icon: 'radio',
    paras: [
      'Os primeiros acordes do Guarani, de Carlos Gomes, e a voz de sempre:',
      '"Em Brasília, dezenove horas."',
      'Em uma hora inteira de programa, nenhuma palavra sobre o vírus. Só a votação de uma comissão sobre o Dia Nacional do Pastel.',
    ],
    button: 'Desligar o rádio',
  });
  findEgg('vozbrasil');
  return true;
}

// ---------------- Infectados com personalidade ----------------
const ZOMBIE_QUIRKS = [
  'ainda com a camisa do tetra, de 94',
  'com um crachá: "Umbrella — estagiário"',
  'cantarolando algo parecido com "Thriller"',
  'procurando cérebros. Vai passar fome nesta rua',
  'de chinelo e meia. Nem o apocalipse muda isso',
  'com uma camiseta "Eu sobrevivi ao bug do milênio"',
  'segurando um carrinho de pipoca. Era o pipoqueiro da praça',
];
export function zombieQuirk(n) {
  const h = hash(n.id);
  return (h >>> 4) % 6 === 0 ? ZOMBIE_QUIRKS[(h >>> 9) % ZOMBIE_QUIRKS.length] : null;
}

// ---------------- Tela de título ----------------
export function initTitleEgg() {
  const badge = document.querySelector('.title-badge');
  const tag = document.querySelector('.title-tag');
  if (!badge || !tag) return;
  let n = 0, t = 0;
  badge.style.cursor = 'pointer';
  badge.addEventListener('click', () => {
    const now = performance.now();
    n = now - t < 900 ? n + 1 : 1;
    t = now;
    if (n === 7) {
      tag.textContent = 'Ai, que preguiça… de sobreviver.';
      findEgg('preguica');
    }
  });
}

// ---------------- Rodapé da TV ----------------
export const EGG_TICKER = [
  'Mega-Sena acumula: ninguém acerta 4, 8, 15, 16, 23 e 42',
  'Moradores de Varginha (MG) dizem ter visto "aquilo" de novo',
  'Farmacêutica Umbrella nega envolvimento com o novo vírus',
  'Prefeitura descarta ataque de chupa-cabra no interior',
  'Brasil perde de 7 a 1 em ranking de leitos de UTI',
  'Novela das nove é interrompida e espectadores reclamam mais do que do vírus',
  'Especialistas garantem: o bug do milênio agora vai',
];
export function eggTicker(day) {
  const a = hash('tk' + day) % EGG_TICKER.length;
  return [EGG_TICKER[a], EGG_TICKER[(a + 3) % EGG_TICKER.length]];
}

// ---------------- Eventos (entram no catálogo de events.js) ----------------
const ZAP = [
  'Tia Cleide no grupo da família: "Chá de boldo com alho e limão CURA o vírus!!! Compartilhem antes que apaguem".',
  'O primo Wellington mandou no grupo da família um áudio de 11 minutos de "um amigo do cunhado que é enfermeiro em Brasília".',
  'Grupo da família: alguém mandou "bom dia" com uma foto de rosas e um gatinho de óculos escuros. Ninguém comenta o vírus.',
  'Tia Cleide: "O Átila é médico, ele que diga!". Você digita uma resposta longa. Apaga. Manda só um joinha.',
];
export function eggEvents({ DAY, pre, post, daytime, note, give, later, nightLevel }) {
  return [
    {
      id: 'zap', weight: 1.5, gap: 1.2 * DAY, simple: true,
      when: (s) => pre(s) && daytime(s, 8, 22),
      run: (s) => {
        const i = (s.flags.zapIdx = (s.flags.zapIdx ?? -1) + 1);
        note(ZAP[i % ZAP.length]);
        findEgg('zap');
      },
    },
    {
      id: 'viajante', visit: true, weight: 1.5, once: true,
      who: () => ({ name: 'Marcelo', persona: 'estudante', skin: '#f1c27d', shirt: '#c0392b', pants: '#3a4f7a', hair: '#6b4423', speed: 0.32 }),
      when: (s) => pre(s) && daytime(s) && dayIndex(s.time) >= -6 && dayIndex(s.time) <= -1,
      card: () => ({
        title: 'Um visitante confuso', icon: 'warning',
        text: '"Doutor! Desculpa… que dia é hoje? E que ano? Não, sério, que ANO? Eu preciso de 1,21 gigawatt. É para o meu carro. Ele precisa chegar a 88 milhas por hora…"',
        choices: [
          { label: 'Dizer a data e o ano', desc: 'Ele parece precisar muito disso.', run: (s, v) => {
            toast(`${v.name} arregala os olhos: "Pesado!" e sai correndo. Na calçada fica um almanaque esportivo.`, 'good');
            later(s, 90, { type: 'gift', items: {}, text: 'Você apostou num jogo do almanaque esportivo, numa lotérica, por telefone. Acertou. (+R$ 300)', money: 300 });
            findEgg('viajante');
          } },
          { label: 'Mostrar a caixa de luz', desc: '"220 volts, rapaz. Gigawatt, só com um raio."', run: (s, v) => {
            toast(`${v.name} olha para o céu: "Um raio… claro! A torre do relógio!" e vai embora agradecendo.`, 'info');
            findEgg('viajante');
          } },
        ],
      }),
    },
    {
      id: 'evidencias', post: true, weight: 1, once: true, simple: true,
      when: (s) => post(s) && nightLevel(s) > 0.3,
      run: () => {
        note('Na casa da frente, alguém liga um karaokê a pilha e canta "Evidências" a plenos pulmões. Lá fora, os infectados param e ficam olhando. Ninguém resiste a essa música.');
        findEgg('evidencias');
      },
    },
  ];
}
