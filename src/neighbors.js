// Vizinhança: quem mora em cada casa, endereço e como o Dr. conhece cada família.
import { PX, PY } from './city.js';
import { BUILDINGS } from './city.js';
import { favPlace, HOMES_NEAR } from './citizens.js';

const SURNAMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Lima',
  'Carvalho', 'Gomes', 'Ribeiro', 'Martins', 'Rocha', 'Barbosa', 'Araújo', 'Mendes', 'Nunes', 'Teixeira', 'Moreira', 'Cardoso',
  'Monteiro', 'Freitas', 'Castro', 'Pinto', 'Batista', 'Vieira', 'Duarte', 'Campos', 'Ramos', 'Siqueira'];
const STREETS = ['Rua das Acácias', 'Rua dos Ipês', 'Rua Sete de Setembro', 'Rua Dom Pedro II', 'Rua das Palmeiras'];
const AVENUES = ['Av. Brasil', 'Rua Tiradentes', 'Rua São João', 'Av. das Flores', 'Rua Santos Dumont'];

// Como o Dr. conhece a família
const RELATIONS = [
  'Vizinhos há mais de vinte anos. Todo aniversário do Dr. aparecem com um bolo de fubá.',
  'Os filhos cresceram brincando na frente da casa do Dr. Hoje mal acenam.',
  'Foram pacientes do consultório do Dr. por anos. Ainda o chamam de "doutor" com respeito.',
  'Mal se cumprimentam. Mas o cachorro deles late para o Dr. toda manhã.',
  'Ajudaram muito quando a esposa do Dr. adoeceu. Ele nunca esqueceu.',
  'Jogam dominó com o Dr. na praça aos domingos — e sempre perdem.',
  'Chegaram há pouco tempo. O Dr. ainda não sabe bem o que fazem.',
  'Emprestaram uma escada ao Dr. em 2019. Ele ainda não devolveu.',
  'Discutiram com o Dr. por causa de uma árvore que sujava a calçada. Fizeram as pazes no Natal.',
  'Compram ovos do mesmo feirante que o Dr. e sempre trocam receitas.',
  'Acham o Dr. meio esquisito, com aquelas histórias de vírus. Educados, mas distantes.',
  'Pedem conselhos de saúde ao Dr. por cima do muro. Ele sempre responde.',
];

const PROFILE = {
  escritorio: 'Trabalha num escritório no centro. Sai cedo, volta no fim da tarde.',
  tranquilo: 'Aposentado(a). Padaria de manhã, praça à tarde, às vezes a igreja.',
  estudante: 'Estudante. Escola de manhã; à tarde, academia ou praça.',
  noturno: 'Vida noturna: acorda tarde e quase sempre termina o dia no bar.',
  atleta: 'Corre todo dia de madrugada pelo bairro. Saúde de ferro.',
  casa: 'Cuida da casa. Conhece todo mundo do mercado e da padaria.',
};

const h01 = (a, b, k = 0) => Math.abs(Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453) % 1;
const pickH = (arr, b, k) => arr[Math.floor(h01(b.x, b.y, k) * arr.length) % arr.length];

export const buildingId = (b) => BUILDINGS.indexOf(b);
export const buildingById = (id) => BUILDINGS[id] || null;

export function homeInfo(b) {
  if (b._home) return b._home;
  const bx = Math.floor(b.x / PX), by = Math.floor(b.y / PY);
  const fy = !b.door || b.door.face === 'y';
  const street = fy ? STREETS[(by + 2 + 5) % 5] : AVENUES[(bx + 2 + 5) % 5];
  const along = fy ? b.x - bx * PX : b.y - by * PY;
  const number = 20 + along * 12 + (fy ? (by & 1 ? 1 : 0) : (bx & 1 ? 1 : 0)) + Math.floor(h01(b.x, b.y, 9) * 6) * 2;
  const blocks = Math.max(Math.abs(bx), Math.abs(by));
  b._home = {
    // cada casa conhecida tem um sobrenome diferente
    surname: HOMES_NEAR.indexOf(b) >= 0 && HOMES_NEAR.indexOf(b) < SURNAMES.length ? SURNAMES[(HOMES_NEAR.indexOf(b) * 7) % SURNAMES.length] : pickH(SURNAMES, b, 1),
    address: `${street}, ${number}`,
    relation: pickH(RELATIONS, b, 2),
    distance: blocks <= 1 ? 'Vizinho de quarteirão' : `A ${blocks} quarteirões da casa do Dr.`,
  };
  return b._home;
}

export const homeName = (b) => `Casa dos ${homeInfo(b).surname}`;

export const residentsOf = (s, b) => (s.npcs || []).filter((c) => c.mode === 'citizen' && c.home === b);

export function residentProfile(c) {
  return PROFILE[c.persona] || '';
}

// ---------------- Comércio ----------------
const FIRST_M = ['José', 'Antônio', 'Raimundo', 'Sebastião', 'Geraldo', 'Joaquim', 'Benedito', 'Valdir', 'Edson', 'Nelson', 'Wilson', 'Osvaldo'];
const FIRST_F = ['Maria', 'Francisca', 'Graça', 'Aparecida', 'Conceição', 'Lourdes', 'Irene', 'Zélia', 'Cida', 'Rita', 'Dalva', 'Glória'];
const FIRST = [...FIRST_M, ...FIRST_F];
// cargo no feminino → nome feminino; no masculino → nome masculino; neutro → qualquer um
const roleNames = (role) => (/(a|Caixa|Recepcionista)$/.test(role) ? (/(Caixa|Recepcionista)$/.test(role) ? FIRST : FIRST_F) : FIRST_M);

const SHOP = {
  padaria: {
    names: ['Padaria Pão Quente', 'Panificadora Estrela', 'Padaria Santa Rita', 'Padaria do Largo', 'Panificadora Bom Dia', 'Padaria Real'],
    open: [6, 20], what: 'Pão francês quentinho, sonho, café passado e mortadela no balcão.',
    staff: ['Padeiro', 'Atendente do balcão', 'Caixa'], ownerNote: 'Acorda às quatro para assar o primeiro pão.',
    dr: 'O Dr. compra meia dúzia de pães toda manhã. Já sabem o pedido de cor.',
  },
  mercado: {
    names: ['Supermercado Bom Preço', 'Mercado Avenida', 'Supermercado Econômico', 'Mercado Central'],
    open: [7, 21], what: 'Enlatados, água, sementes e o básico do dia a dia.',
    staff: ['Repositor', 'Caixa', 'Açougueiro', 'Gerente'], ownerNote: 'Conhece o preço de tudo de cabeça.',
    dr: 'É aqui que o Dr. faz o estoque para o abrigo.',
  },
  farmacia: {
    names: ['Drogaria Saúde', 'Farmácia Popular do Bairro', 'Drogaria São Lucas'],
    open: [7, 22], what: 'Remédios, curativos e conversa sobre pressão alta.',
    staff: ['Farmacêutica', 'Balconista', 'Caixa'], ownerNote: 'Farmacêutico formado, pede receita até para vitamina.',
    dr: 'Às vezes pedem a opinião do Dr. antes de vender um remédio.',
  },
  escritorio: {
    names: ['Centro Empresarial Atlântico', 'Edifício Comercial Horizonte', 'Torre Empresarial Paulista', 'Centro Empresarial Aurora', 'Edifício Tríade', 'Centro Executivo Ipiranga'],
    open: [8, 18], what: 'Contabilidades, advogados, uma agência de seguros e um dentista no 3º andar.',
    staff: ['Porteiro', 'Recepcionista', 'Zelador'], ownerNote: 'Síndico do prédio, vive reclamando do elevador.', owner: 'Síndico',
    dr: 'O contador do Dr. tem uma sala aqui.',
  },
  escola: {
    names: ['Escola Municipal Monteiro Lobato', 'Escola Municipal Cecília Meireles', 'Escola Municipal Paulo Freire'],
    open: [7, 17], what: 'Ensino fundamental e médio. Quadra, pátio e cantina.',
    staff: ['Professora de Ciências', 'Professor de Matemática', 'Merendeira', 'Inspetor'], ownerNote: 'Diretora há quinze anos. Firme, mas justa.', owner: 'Diretora',
    dr: 'O Dr. já deu palestra aqui sobre vacinas. Os alunos acharam chato.',
  },
  academia: {
    names: ['Academia Corpo em Forma', 'Academia Força Total'],
    open: [6, 22], what: 'Musculação, spinning e uma aula de dança às quintas.',
    staff: ['Instrutor', 'Recepcionista', 'Professora de spinning'], ownerNote: 'Ex-fisiculturista, só fala de proteína.',
    dr: 'Já ofereceram ao Dr. um plano para a terceira idade. Ele recusou educadamente.',
  },
  igreja: {
    names: ['Paróquia São José'],
    open: [7, 19], what: 'Missa às 7h e às 19h. Quermesse em junho.',
    staff: ['Sacristão', 'Secretária paroquial', 'Organista'], ownerNote: 'Padre da paróquia há vinte anos. Batizou meio bairro.', owner: 'Padre',
    dr: 'O padre e o Dr. discutem ciência e fé no banco da praça — sem nunca concordar.',
  },
  bar: {
    names: ['Bar do Zé', 'Bar do Zé (Filial)', 'Bar do Zé (Esquina)'],
    open: [17, 2], what: 'Cerveja gelada, torresmo e futebol na TV.',
    staff: ['Garçom', 'Cozinheira', 'Garçom'], ownerNote: 'O próprio Zé. Fiado só para os amigos.',
    dr: 'O Dr. não bebe, mas vem ver jogo da seleção.',
  },
};

const placeIdx = (b) => {
  const same = BUILDINGS.filter((q) => q.role === b.role);
  return Math.max(0, same.indexOf(b));
};
const person = (b, k, f = FIRST) => `${f[Math.floor(h01(b.x, b.y, k) * f.length) % f.length]} ${SURNAMES[Math.floor(h01(b.x, b.y, k + 50) * SURNAMES.length) % SURNAMES.length]}`;

export function placeInfo(b) {
  if (b._place) return b._place;
  const S = SHOP[b.role];
  const i = placeIdx(b);
  const name = S.names[i % S.names.length];
  let owner = person(b, 11, S.owner === 'Diretora' ? FIRST_F : S.owner === 'Padre' || S.owner === 'Síndico' ? FIRST_M : FIRST);
  if (b.role === 'bar') owner = 'José "Zé" ' + SURNAMES[Math.floor(h01(b.x, b.y, 61) * SURNAMES.length)];
  const n = 2 + Math.floor(h01(b.x, b.y, 12) * 2);
  const staff = Array.from({ length: n }, (_, j) => { const role = S.staff[j % S.staff.length]; return { name: person(b, 20 + j, roleNames(role)), role }; });
  b._place = { name, owner, ownerTitle: S.owner || (FIRST_F.includes(owner.split(' ')[0]) ? 'Dona' : 'Dono'), ownerNote: S.ownerNote, staff, what: S.what, dr: S.dr, open: S.open, address: homeInfo(b).address };
  return b._place;
}

export function isOpenAt(b, minute) {
  const [a, z] = SHOP[b.role].open;
  const h = minute / 60;
  return a < z ? h >= a && h < z : h >= a || h < z;
}
export const hoursStr = (b) => { const [a, z] = SHOP[b.role].open; return `${String(a).padStart(2, '0')}h às ${String(z).padStart(2, '0')}h`; };

// moradores que estão lá dentro agora / que frequentam o lugar
export const peopleInside = (s, b) => (s.npcs || []).filter((c) => c.mode === 'citizen' && !c.zombie && c.state === 'inside' && c.at === b);
const VISITS = {
  escritorio: ['padaria', 'escritorio', 'mercado', 'bar'], tranquilo: ['padaria', 'farmacia', 'igreja'],
  estudante: ['escola', 'academia', 'bar'], noturno: ['padaria', 'mercado', 'bar'],
  atleta: ['escritorio', 'academia', 'mercado'], casa: ['padaria', 'mercado', 'farmacia'],
};
// moradores que frequentam o lugar; no escritório trabalham, na escola estudam
export function regularsOf(s, b) {
  return (s.npcs || []).filter((c) => c.mode === 'citizen' && VISITS[c.persona]?.includes(b.role) && favPlace(c, b.role) === b);
}
export const regularRole = (c, b) => (b.role === 'escritorio' ? 'trabalha aqui' : b.role === 'escola' ? 'estuda aqui' : 'cliente de sempre');
