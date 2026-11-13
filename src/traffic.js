// Viaturas policiais circulando pela malha de ruas da cidade.
// Andam entre cruzamentos, escolhem caminhos aleatórios e às vezes encostam e param por um tempo.
import { W, H } from './config.js';
import { PX, PY } from './city.js';
import { sirenCount } from './mood.js';
import { isOutbreak } from './world.js';

// Índices de ruas dentro da cidade (ruas "verticais" k e "horizontais" m)
const KS = [-2, -1, 0, 1];
const MS = [-2, -1, 0, 1];
// centro do cruzamento (k, m)
const node = (k, m) => [k * PX + W + 2, m * PY + H + 2];

const LANE = 0.5; // distância do centro da rua até o centro da faixa
const CURB = 0.56; // encostado no meio-fio (sem subir na calçada)
const SPEED = 0.7; // tiles por minuto de jogo
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function chooseNext(c) {
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dk, dm]) => [c.k + dk, c.m + dm])
    .filter(([k, m]) => KS.includes(k) && MS.includes(m));
  const forward = opts.filter(([k, m]) => !(k === c.pk && m === c.pm));
  const [tk, tm] = pick(forward.length ? forward : opts);
  c.tk = tk;
  c.tm = tm;
  c.t = 0;
  // às vezes vai parar em algum ponto deste quarteirão
  c.stopAt = Math.random() < 0.3 ? rnd(0.2, 0.8) : null;
}

function newCar() {
  const c = { k: pick(KS), m: pick(MS), pk: null, pm: null, state: 'drive', wait: 0, off: LANE, abandoned: false };
  chooseNext(c);
  c.t = Math.random() * 0.9;
  place(c);
  return c;
}

function place(c) {
  const [ax, ay] = node(c.k, c.m);
  const [bx, by] = node(c.tk, c.tm);
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  // mão direita: deslocamento perpendicular à direção
  c.cx = ax + (bx - ax) * c.t - dy * c.off;
  c.cy = ay + (by - ay) * c.t + dx * c.off;
  c.axis = dx !== 0 ? 'x' : 'y';
}

export function updateTraffic(s, dt) {
  if (!s.cars) s.cars = [];
  const out = isOutbreak(s);
  const target = sirenCount(s);

  // após o Dia 0 sobra uma viatura abandonada, parada para sempre
  if (out && !s.cars.some((c) => c.abandoned)) {
    s.cars = s.cars.slice(0, 1);
    if (!s.cars.length) s.cars.push(newCar());
    const c = s.cars[0];
    Object.assign(c, { abandoned: true, state: 'park', off: CURB });
  }
  while (s.cars.length < target) s.cars.push(newCar());
  if (s.cars.length > target) s.cars.length = target;

  for (const c of s.cars) {
    if (c.abandoned) { place(c); continue; }
    if (c.state === 'park') {
      c.off = Math.min(CURB, c.off + 0.05 * dt);
      c.wait -= dt;
      if (c.wait <= 0) c.state = 'drive';
    } else {
      c.off = Math.max(LANE, c.off - 0.05 * dt);
      const [ax, ay] = node(c.k, c.m);
      const [bx, by] = node(c.tk, c.tm);
      const len = Math.hypot(bx - ax, by - ay);
      c.t += (SPEED * dt) / len;
      if (c.stopAt != null && c.t >= c.stopAt) {
        c.t = c.stopAt;
        c.stopAt = null;
        c.state = 'park';
        c.wait = rnd(15, 150); // fica parada de 15 min a 2h30 (tempo do jogo)
      } else if (c.t >= 1) {
        c.pk = c.k; c.pm = c.m;
        c.k = c.tk; c.m = c.tm;
        chooseNext(c);
      }
    }
    place(c);
  }
}
