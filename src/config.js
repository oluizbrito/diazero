// ===== Constantes gerais do jogo =====
export const W = 20; // largura do terreno (tiles)
export const H = 18; // profundidade do terreno (tiles)

export const DAY = 1440; // minutos
export const DAY0 = 7; // índice absoluto do "Dia 0" (o jogo começa no Dia -7)
export const START_TIME = 8 * 60; // Dia -7, 08:00
export const OUTBREAK_TIME = DAY0 * DAY + 12 * 60; // Dia 0, 12:00 — o vírus chega pelo ar
export const POWER_CUT_TIME = (DAY0 + 1) * DAY + 6 * 60; // Dia 1, 06:00 — cai a rede elétrica
export const WATER_CUT_TIME = (DAY0 + 2) * DAY + 6 * 60; // Dia 2, 06:00 — para a água encanada

export const SHOP_OPEN = 7 * 60;
export const SHOP_CLOSE = 21 * 60;
export const TRIP_MINUTES = 180;

// minutos de jogo por segundo real
export const SPEEDS = [0, 5, 15, 40];
export const SLEEP_SPEED = 100;
export const WALK_SPEED = 0.35; // tiles por minuto de jogo

export const START_MONEY = 5000;

// taxas por hora de jogo
export const RATES = { hunger: 2.0, thirst: 2.2, energy: 4.2, sleep: 13, rest: 7 };
export const MEAL = 60;
export const DRINK = 60;

export const RESOURCES = {
  comida: { name: 'Comida', icon: 'food', unit: 'porções' },
  agua: { name: 'Água', icon: 'water', unit: 'porções' },
  sementes: { name: 'Sementes', icon: 'seeds', unit: 'un.' },
  kitMedico: { name: 'Kit médico', icon: 'medkit', unit: 'un.' },
  madeira: { name: 'Madeira', icon: 'wood', unit: 'un.' },
  tijolo: { name: 'Tijolo', icon: 'brick', unit: 'un.' },
  metal: { name: 'Metal', icon: 'metal', unit: 'un.' },
  vedacao: { name: 'Kit de vedação', icon: 'tape', unit: 'un.' },
  reagentes: { name: 'Reagentes', icon: 'flask', unit: 'un.' },
  amostra: { name: 'Amostra viral', icon: 'sample', unit: 'un.' },
};

// Andares da casa
export const FLOORS = {
  ground: { name: 'Térreo', icon: 'home' },
  attic: { name: 'Sótão', icon: 'attic' },
  bunker: { name: 'Bunker', icon: 'bunker' },
};
export const ATTIC_LIFT = 74; // altura (px) do piso do sótão = altura da parede

// Resistência de portas e janelas contra zumbis
export const OPENING_HP = { door: 300, window: 200 };
export const REINFORCE = [
  null,
  { name: 'Tábuas pregadas', cost: { madeira: 2 }, hp: 350, time: 40 },
  { name: 'Chapas de metal', cost: { metal: 2 }, hp: 1000, time: 60 },
];
export const FENCE_HP = 150;
export const ZOMBIE_DPS = 0.5; // dano por minuto de jogo de cada zumbi forçando

// Pesquisa da cura (pontos 0..100)
export const RESEARCH = {
  shift: 240, // minutos por sessão
  gain: 8, // pontos por sessão
  bunkerBonus: 1.5, // laboratório no bunker rende mais
  phases: [
    { to: 35, name: 'Modelagem do vírus', desc: 'Seus modelos antigos, atualizados com os dados da TV.' },
    { to: 70, name: 'Isolamento da cepa', desc: 'Precisa de uma amostra viva: toque numa janela e colete o ar, ou abata um infectado que invadir a casa.', needs: 'amostra' },
    { to: 100, name: 'Síntese da cura', desc: 'Precisa de mais uma amostra para os testes finais.', needs: 'amostra' },
  ],
};

export const SHOPS = {
  mercado: {
    name: 'Supermercado', icon: 'cart', desc: 'Comida, água, sementes e remédios',
    items: [
      { id: 'enlatados', name: 'Caixa de enlatados', icon: 'food', desc: '+4 porções de comida', price: 55, gives: { comida: 4 } },
      { id: 'galao', name: 'Galão de água 20L', icon: 'water', desc: '+4 porções de água', price: 22, gives: { agua: 4 } },
      { id: 'sementes', name: 'Pacote de sementes', icon: 'seeds', desc: '+4 sementes para canteiros', price: 25, gives: { sementes: 4 } },
      { id: 'kit', name: 'Kit médico', icon: 'medkit', desc: 'Recupera 40 de saúde', price: 90, gives: { kitMedico: 1 } },
    ],
  },
  farmacia: {
    name: 'Distribuidora Hospitalar', icon: 'flask', desc: 'Reagentes para o laboratório e kits médicos',
    items: [
      { id: 'reagente', name: 'Frasco de reagentes', icon: 'flask', desc: '+1 reagente (1 sessão de pesquisa)', price: 45, gives: { reagentes: 1 } },
      { id: 'caixaReag', name: 'Caixa de reagentes', icon: 'flask', desc: '+5 reagentes', price: 200, gives: { reagentes: 5 } },
      { id: 'kit2', name: 'Kit médico', icon: 'medkit', desc: 'Recupera 40 de saúde', price: 80, gives: { kitMedico: 1 } },
    ],
  },
  construcao: {
    name: 'Loja de Construção', icon: 'store', desc: 'Materiais para reformar e vedar a casa',
    items: [
      { id: 'madeira', name: 'Tábuas de madeira', icon: 'wood', desc: '+1 madeira', price: 30, gives: { madeira: 1 } },
      { id: 'tijolo', name: 'Lote de tijolos', icon: 'brick', desc: '+1 tijolo', price: 12, gives: { tijolo: 1 } },
      { id: 'metal', name: 'Chapas de metal', icon: 'metal', desc: '+1 metal', price: 55, gives: { metal: 1 } },
      { id: 'vedacao', name: 'Kit de vedação', icon: 'tape', desc: 'Fita, silicone e lona. Veda 1 janela ou porta.', price: 40, gives: { vedacao: 1 } },
    ],
  },
};

// Itens construíveis no modo construção. floors = andares onde pode ser feito.
const ALL = ['ground', 'attic', 'bunker'];
export const BUILD = {
  wall: { name: 'Parede', icon: 'wall', kind: 'edge', floors: ALL, cost: { tijolo: 4 }, time: 40, desc: 'Fecha buracos. Toque perto da borda de um piso.' },
  window: { name: 'Janela', icon: 'window', kind: 'edge', floors: ['ground'], cost: { tijolo: 2, madeira: 1 }, time: 45, desc: 'Precisa ser vedada antes do Dia 0.' },
  door: { name: 'Porta', icon: 'door', kind: 'edge', floors: ALL, cost: { madeira: 3 }, time: 45, desc: 'Passagem entre cômodos.' },
  floor: { name: 'Piso interno', icon: 'floor', kind: 'floor', floors: ['ground'], cost: { madeira: 1 }, time: 15, desc: 'Amplia a casa (e o sótão). Cerque com paredes!' },
  ladder: { name: 'Escada do sótão', icon: 'attic', kind: 'object', where: 'indoor', floors: ['ground'], once: true, cost: { madeira: 4 }, time: 90, desc: 'Abre o forro e dá acesso ao sótão. Zumbis não sobem escadas.' },
  bunkerHatch: { name: 'Alçapão do bunker', icon: 'bunker', kind: 'object', where: 'indoor', floors: ['ground'], once: true, cost: { metal: 3, tijolo: 4 }, time: 180, desc: 'Abre um abrigo subterrâneo de 2×2. Escave para ampliar.' },
  dig: { name: 'Escavar', icon: 'shovel', kind: 'dig', floors: ['bunker'], cost: { madeira: 1 }, time: 120, desc: 'Cava e escora 1 tile ao lado do bunker. Ar limpo, sem janelas, escuro.' },
  planter: { name: 'Canteiro', icon: 'planter', kind: 'object', floors: ['ground', 'attic'], cost: { madeira: 3 }, time: 40, desc: 'Plante e regue todo dia. Colheita em 3 dias.' },
  tank: { name: "Caixa d'água", icon: 'cistern', kind: 'object', where: 'indoor', floors: ['attic'], cost: { metal: 2, madeira: 2 }, time: 120, desc: 'Recolhe a chuva do telhado: +2 água por dia (+4 se chover).' },
  cistern: { name: 'Cisterna', icon: 'cistern', kind: 'object', where: 'outdoor', floors: ['ground'], cost: { metal: 3, tijolo: 6 }, time: 180, desc: 'Capta chuva e leva água para dentro.' },
  solar: { name: 'Painel solar', icon: 'solar', kind: 'object', where: 'outdoor', floors: ['ground'], cost: { metal: 4 }, time: 120, desc: 'Energia quando a rede cair (Dia 1).' },
  filter: { name: 'Filtro de ar', icon: 'filter', kind: 'object', where: 'indoor', floors: ALL, cost: { metal: 3, vedacao: 1 }, time: 120, desc: 'Limpa o ar interno. Precisa de energia.' },
  lab: { name: 'Laboratório', icon: 'flask', kind: 'object', where: 'indoor', floors: ALL, once: true, cost: { metal: 4, madeira: 2, tijolo: 2 }, time: 240, desc: 'Bancada para pesquisar a cura. Precisa de energia e reagentes. No bunker rende +50%.' },
  fence: { name: 'Cerca', icon: 'fence', kind: 'edge', floors: ['ground'], cost: { madeira: 1 }, time: 15, desc: 'Barra os zumbis no quintal até eles a derrubarem. Só lá fora.' },
  spikes: { name: 'Estacas', icon: 'spikes', kind: 'object', where: 'outdoor', floors: ['ground'], cost: { madeira: 2 }, time: 40, desc: 'Armadilha no quintal: abate até 3 zumbis que pisarem nela.' },
};

// Objetos do mundo
export const OBJ = {
  bed: { name: 'Cama', w: 1, h: 2, ht: 28, actions: ['sleep'] },
  fridge: { name: 'Geladeira', ht: 62, actions: ['eat', 'fridgeInfo'] },
  sink: { name: 'Pia', ht: 34, actions: ['drink'] },
  stove: { name: 'Fogão', ht: 28, actions: ['eat'] },
  table: { name: 'Mesa', ht: 22, actions: [] },
  tv: { name: 'TV', ht: 50, actions: ['news'] },
  sofa: { name: 'Sofá', ht: 26, actions: ['rest'] },
  computer: { name: 'Computador', ht: 46, actions: ['work', 'pcInfo'] },
  shelf: { name: 'Despensa', ht: 64, actions: ['inventory'] },
  plant: { name: 'Planta', ht: 36, actions: [] },
  tree: { name: 'Árvore', ht: 70, actions: ['chop'] },
  car: { name: 'Carro', w: 1, h: 2, ht: 34, actions: ['travel'], fixed: true },
  planter: { name: 'Canteiro', ht: 30, actions: ['planter'] },
  cistern: { name: 'Cisterna', ht: 58, actions: ['cisternInfo'] },
  solar: { name: 'Painel solar', ht: 34, actions: ['solarInfo'] },
  filter: { name: 'Filtro de ar', ht: 44, actions: ['filterInfo'] },
  ladder: { name: 'Escada do sótão', ht: 74, actions: ['goUp'], fixed: true },
  atticHatch: { name: 'Alçapão (descer)', ht: 12, actions: ['goDown'], fixed: true },
  bunkerHatch: { name: 'Alçapão do bunker', ht: 10, actions: ['goBunker'], fixed: true },
  bunkerLadder: { name: 'Escada do bunker', ht: 74, actions: ['goGround', 'sealHatch'], fixed: true },
  lab: { name: 'Laboratório', ht: 44, actions: ['research'] },
  tank: { name: "Caixa d'água", ht: 50, actions: ['tankInfo'] },
  boxes: { name: 'Caixas antigas', ht: 34, actions: ['search'] },
  spikes: { name: 'Estacas', ht: 18, actions: ['spikesInfo'] },
  // móveis da casa
  counter: { name: 'Bancada da cozinha', ht: 30, actions: [] },
  peninsula: { name: 'Balcão', w: 1, h: 2, ht: 34, actions: ['eat'] },
  claypot: { name: 'Filtro de barro', ht: 48, actions: ['drink'] },
  bin: { name: 'Lixeira', ht: 18, actions: [] },
  diningTable: { name: 'Mesa de jantar', w: 2, h: 1, ht: 26, actions: ['eat'] },
  chair: { name: 'Cadeira', ht: 30, actions: [] },
  deskChair: { name: 'Cadeira do escritório', ht: 36, actions: [] },
  cristaleira: { name: 'Cristaleira', ht: 70, actions: ['cristInfo'] },
  grandClock: { name: 'Relógio de pêndulo', ht: 76, actions: ['clockInfo'] },
  bookcase: { name: 'Estante de livros', ht: 70, actions: ['bookInfo'] },
  scienceShelf: { name: 'Estante do cientista', ht: 54, actions: ['sciInfo'] },
  armchair: { name: 'Poltrona', ht: 32, actions: ['relax'] },
  rocker: { name: 'Cadeira de balanço', ht: 36, actions: ['relax'] },
  coffeeTable: { name: 'Mesa de centro', ht: 16, actions: [] },
  floorLamp: { name: 'Abajur de pé', ht: 62, actions: [] },
  radio: { name: 'Rádio de pilha', ht: 34, actions: ['radio'] },
  fern: { name: 'Samambaia', ht: 42, actions: [] },
  bed2: { name: 'Cama de casal', w: 2, h: 2, ht: 34, actions: ['sleep'] },
  nightstand: { name: 'Criado-mudo', ht: 36, actions: [] },
  wardrobe: { name: 'Guarda-roupa', w: 1, h: 2, ht: 68, actions: [] },
  dresser: { name: 'Cômoda', ht: 42, actions: ['photoInfo'] },
  toilet: { name: 'Vaso sanitário', ht: 30, actions: [] },
  bathSink: { name: 'Pia do banheiro', ht: 32, actions: ['medkit'] },
  shower: { name: 'Chuveiro', ht: 70, actions: ['shower'] },
  washer: { name: 'Máquina de lavar', ht: 34, actions: [] },
  tanque: { name: 'Tanque', ht: 28, actions: [] },
};
