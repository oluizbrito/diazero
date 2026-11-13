// Abertura cinematográfica + "Primeiros passos": objetivos jogáveis no lugar de modais.
import { OBJ } from './config.js';
import { P } from './draw.js';
import { parseEdge } from './world.js';
import { bus, toast } from './bus.js';
import { h, DOCTOR_SVG } from './ui.js';
import { iconHTML } from './icons.js';
import { PROTAGONIST } from './content.js';
import { say as speak, hush, VOICES, voiceSettings } from './voice.js';

const $ = (sel) => document.querySelector(sel);

// ---------------- Abertura ----------------
const CINE_LINES = [
  { t: 'Dia -7. Uma manhã comum.' },
  { t: `Você é o <b>${PROTAGONIST}</b>, infectologista aposentado. O maior cientista da sua geração.` },
  { t: 'Hoje, a vida é café, jornal e plantas.' },
  { t: 'Mas uma notícia pequena, quase escondida, está prestes a passar na TV…' },
];

export function playCinematic(G, onDone) {
  const cam = G.cam;
  const target = G.camFit(); // { x, y, zoom } final, na casa
  const from = { x: G.cityCenter[0], y: G.cityCenter[1] + 120, zoom: G.camMin() };
  Object.assign(cam, from);
  G.cinematic = true;
  document.body.classList.add('cinematic');

  const root = h('div', { class: 'cine' },
    h('div', { class: 'cine-bar top' }),
    h('div', { class: 'cine-bar bottom' }, h('div', { class: 'cine-cap' }), h('div', { class: 'cine-hint' }, 'toque para continuar')),
    h('button', { class: 'cine-skip', onClick: (e) => { e.stopPropagation(); finish(); } }, 'Pular ›'));
  document.body.append(root);
  const cap = root.querySelector('.cine-cap');

  let i = -1, typing = null, autoT = null, done = false, raf = 0;
  const t0 = performance.now();
  const total = CINE_LINES.length * 3600;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  const pan = (now) => {
    if (done) return;
    const k = ease(Math.min(1, (now - t0) / total));
    cam.x = from.x + (target.x - from.x) * k;
    cam.y = from.y + (target.y - from.y) * k;
    cam.zoom = from.zoom + (target.zoom - from.zoom) * k;
    raf = requestAnimationFrame(pan);
  };
  raf = requestAnimationFrame(pan);

  const show = () => {
    i++;
    if (i >= CINE_LINES.length) { finish(); return; }
    const html = CINE_LINES[i].t;
    // datilografia: revela o texto (sem tags) aos poucos
    const plain = html.replace(/<[^>]+>/g, '');
    let n = 0;
    // narração: a próxima linha só vem quando o narrador terminar
    const line = i;
    spoken = !(voiceSettings().on && voiceSettings().available);
    speak(plain, VOICES.narrator).then(() => { if (line === i) { spoken = true; if (!typing && !done) scheduleNext(0); } });
    cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    clearInterval(typing);
    typing = setInterval(() => {
      n += 2;
      if (n >= plain.length) { clearInterval(typing); typing = null; cap.innerHTML = html; scheduleNext(plain.length); return; }
      cap.textContent = plain.slice(0, n);
    }, 28);
  };
  let spoken = true;
  const scheduleNext = (len) => { clearTimeout(autoT); if (!spoken) { autoT = setTimeout(show, 15000); return; } autoT = setTimeout(show, len ? 1400 + len * 35 : 700); };
  const advance = () => {
    if (typing) { clearInterval(typing); typing = null; cap.innerHTML = CINE_LINES[i].t; scheduleNext(CINE_LINES[i].t.length); }
    else { clearTimeout(autoT); hush(); show(); }
  };
  const onKey = (e) => { if (e.key === 'Escape') finish(); else if (e.key === ' ' || e.key === 'Enter') advance(); };
  root.addEventListener('pointerdown', advance);
  window.addEventListener('keydown', onKey);

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    clearInterval(typing); clearTimeout(autoT);
    hush();
    window.removeEventListener('keydown', onKey);
    G.camGlide(target, 700);
    root.classList.add('out');
    setTimeout(() => root.remove(), 600);
    document.body.classList.remove('cinematic');
    G.cinematic = false;
    onDone?.();
  }
  setTimeout(show, 500);
}

// ---------------- Primeiros passos ----------------
const objOf = (s, type) => s.floors.ground.objects.find((o) => o.type === type);
const ground = (s) => (s.player.floor || 'ground') === 'ground';

function nearestWindow(s) {
  const p = s.player;
  let best = null, bd = 1e9;
  for (const [k, w] of Object.entries(s.floors.ground.walls)) {
    if (w.type !== 'window' || w.sealed || !w.built) continue;
    const e = parseEdge(k);
    const [x, y] = e.d === 'n' ? [e.x + 0.5, e.y] : [e.x, e.y + 0.5];
    const d = Math.hypot(x - p.px, y - p.py);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}

const STEPS = [
  {
    id: 'walk', icon: 'walk', title: 'Ande pela casa',
    hint: 'Toque no chão para caminhar. Arraste para mover a câmera.',
    say: 'Hm. Joelho rangendo de novo. Vamos ver como está a casa.',
    start: (s, st) => { st.x = s.player.x; st.y = s.player.y; },
    done: (s, st) => s.player.path.length > 0 || s.player.x !== st.x || s.player.y !== st.y,
    marker: () => [7.5, 9.5, 0],
  },
  {
    id: 'tv', icon: 'tv', title: 'Ligue a TV da sala',
    hint: 'Toque na TV e escolha "Ver notícias".',
    say: 'Hora do jornal da manhã. Vamos ver o que está acontecendo lá fora.',
    event: 'news',
    marker: (s) => { const o = objOf(s, 'tv'); return o && [o.x + o.w / 2, o.y + o.h / 2, OBJ.tv.ht]; },
  },
  {
    id: 'build', icon: 'build', title: 'Abra o modo Construir',
    hint: 'Paredes, canteiros, cisterna, filtro de ar… Tudo começa aqui.',
    say: 'Eu conheço esse padrão. Transmissão aérea. Esta casa precisa virar um abrigo.',
    done: (s, st, G) => G.mode === 'build',
    ui: '#toolbar [data-tool="build"]',
  },
  {
    id: 'trip', icon: 'car', title: 'Compre kits de vedação',
    hint: 'Toque em Compras e vá à Loja de Construção. Aproveite e leve madeira.',
    say: 'Sem material não se constrói nada. E as lojas não vão ficar abertas para sempre.',
    done: (s) => s.stock.vedacao > 0 || Object.values(s.floors.ground.walls).some((w) => w.sealed),
    ui: '#toolbar [data-tool="travel"]',
  },
  {
    id: 'seal', icon: 'seal', title: 'Vede uma janela',
    hint: 'Toque numa janela e escolha "Vedar". Cada fresta deixa o ar entrar.',
    say: 'Se o vírus vier pelo ar, cada fresta conta. Começando pela janela.',
    done: (s) => Object.values(s.floors.ground.walls).some((w) => w.sealed),
    marker: (s) => { const w = nearestWindow(s); return w && [w[0], w[1], 40]; },
  },
];

const T = { G: null, el: null, marker: null, bubble: null, st: {}, flag: false, uiEl: null, bubbleT: 0 };

export function startTutorial(G) {
  T.G = G;
  const s = G.s;
  if (s.flags.tut == null || s.flags.tut >= STEPS.length) { teardown(); return; }
  if (!T.el) buildCard();
  enter(s.flags.tut, false);
}

bus.on('news', () => { if (cur()?.event === 'news') T.flag = true; });

const cur = () => (T.G && T.G.s.flags.tut != null ? STEPS[T.G.s.flags.tut] : null);

function buildCard() {
  T.el = h('div', { class: 'card tut' },
    h('div', { class: 'tut-head' }, h('span', {}, 'Primeiros passos'), h('span', { class: 'tut-n' }),
      h('button', { class: 'tut-x', title: 'Pular tutorial', onClick: skip, html: iconHTML('cancel') })),
    h('div', { class: 'tut-step' }, h('span', { class: 'tut-ic' }), h('div', {}, h('b', {}), h('small', {}))),
    h('div', { class: 'tut-dots' }, STEPS.map(() => h('i'))));
  $('.hud-right').append(T.el);
  T.marker = h('div', { class: 'tut-marker hidden', html: '<span></span>' });
  T.bubble = h('div', { class: 'tut-say hidden' }, h('span', { class: 'av', html: DOCTOR_SVG }), h('div'));
  document.body.append(T.marker, T.bubble);
}

function enter(i, celebrate) {
  const G = T.G, s = G.s;
  s.flags.tut = i;
  T.uiEl?.classList.remove('tut-pulse');
  T.uiEl = null;
  if (i >= STEPS.length) { finishAll(celebrate); return; }
  const S = STEPS[i];
  T.st = {};
  T.flag = false;
  S.start?.(s, T.st);
  T.el.querySelector('.tut-n').textContent = `${i + 1}/${STEPS.length}`;
  T.el.querySelector('.tut-ic').innerHTML = iconHTML(S.icon);
  T.el.querySelector('.tut-step b').textContent = S.title;
  T.el.querySelector('.tut-step small').textContent = S.hint;
  T.el.querySelectorAll('.tut-dots i').forEach((d, k) => { d.className = k < i ? 'ok' : k === i ? 'on' : ''; });
  T.el.classList.remove('pop'); void T.el.offsetWidth; T.el.classList.add('pop');
  if (S.ui) { T.uiEl = $(S.ui); T.uiEl?.classList.add('tut-pulse'); }
  say(S.say, celebrate ? 900 : 300);
}

function say(text, delay = 0) {
  clearTimeout(T.bubbleT);
  T.bubbleT = setTimeout(() => {
    T.bubble.lastChild.textContent = text;
    T.bubble.classList.remove('hidden', 'out');
    speak(text, VOICES.doctor, { queue: !!document.querySelector('.modal-overlay') }); // não corta a TV
    T.bubbleT = setTimeout(() => { T.bubble.classList.add('out'); T.bubbleT = setTimeout(() => T.bubble.classList.add('hidden'), 400); }, 3200 + text.length * 40);
  }, delay);
}

function skip() {
  if (!T.G) return;
  T.G.s.flags.tut = STEPS.length;
  teardown();
  toast('Tutorial pulado. A ajuda completa está em Menu › Como jogar.', 'info');
}

function finishAll(celebrate) {
  teardown(true);
  if (celebrate) {
    toast('Primeiros passos concluídos!', 'good');
    say('Uma janela. Faltam todas as outras. E meus cadernos antigos devem estar em algum canto do sótão…', 600);
  }
}

export function resetTutorial() { teardown(); T.G = null; }

function teardown(keepBubble) {
  T.uiEl?.classList.remove('tut-pulse');
  T.uiEl = null;
  T.el?.remove(); T.el = null;
  T.marker?.remove(); T.marker = null;
  if (!keepBubble) { clearTimeout(T.bubbleT); T.bubble?.remove(); T.bubble = null; }
}

// chamado a cada quadro pelo loop principal
export function updateTutorial(G, view, cam) {
  if (!T.el || !G.running || G.cinematic) return;
  const s = G.s;
  const S = cur();
  if (!S) return;
  if (T.flag || S.done?.(s, T.st, G)) {
    T.flag = false;
    const el = T.el.querySelector('.tut-step');
    el.classList.add('ok');
    setTimeout(() => el.classList.remove('ok'), 500);
    enter(s.flags.tut + 1, true);
    return;
  }
  const m = S.marker && ground(s) && !document.querySelector('.modal-overlay') ? S.marker(s) : null;
  T.marker.classList.toggle('hidden', !m);
  if (m) {
    const [wx, wy] = P(m[0], m[1], m[2]);
    const sx = (wx - cam.x) * cam.zoom + view.w / 2;
    const sy = (wy - cam.y) * cam.zoom + view.h / 2;
    T.marker.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  }
}
