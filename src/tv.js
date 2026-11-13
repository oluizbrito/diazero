// Tela de TV para os plantões de notícias: estúdio, apresentador, letreiro, rodapé, chiado.
import { NEWS, TICKER } from './content.js';
import { clockStr } from './time.js';
import { eggTicker } from './eastereggs.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// Fundo do estúdio + apresentador (SVG simples, mesmo estilo chapado do jogo)
function studioSVG(mode) {
  const wall = mode === 'urgent' ? '#6b1220' : '#13284d';
  const wall2 = mode === 'urgent' ? '#8e1a2b' : '#1c3a6e';
  const accent = mode === 'urgent' ? '#ff3b4e' : '#e53935';
  const spikes = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const x1 = 250 + Math.cos(a) * 46, y1 = 70 + Math.sin(a) * 46;
    const x2 = 250 + Math.cos(a) * 62, y2 = 70 + Math.sin(a) * 62;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="6" fill="${accent}"/>`;
  }).join('');
  return `
  <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" xmlns="${SVGNS}">
    <defs>
      <linearGradient id="tvwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall2}"/><stop offset="1" stop-color="${wall}"/></linearGradient>
      <pattern id="tvgrid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1"/></pattern>
    </defs>
    <rect width="320" height="180" fill="url(#tvwall)"/>
    <rect width="320" height="180" fill="url(#tvgrid)"/>
    <!-- telão com o vírus -->
    <rect x="186" y="12" width="128" height="116" rx="6" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.18)"/>
    <g opacity=".95">${spikes}<circle cx="250" cy="70" r="46" fill="${accent}" opacity=".9"/><circle cx="236" cy="58" r="9" fill="rgba(255,255,255,.35)"/><circle cx="262" cy="84" r="6" fill="rgba(0,0,0,.25)"/><circle cx="268" cy="56" r="4" fill="rgba(0,0,0,.25)"/></g>
    <!-- apresentador -->
    <g transform="translate(34 -30)">
      <path d="M58 180 L66 128 Q70 112 92 108 L128 108 Q150 112 154 128 L162 180 Z" fill="#2b3550"/>
      <path d="M100 108 L110 136 L120 108 Z" fill="#ffffff"/>
      <path d="M107 112 L110 134 L113 112 Z" fill="${accent}"/>
      <rect x="102" y="92" width="16" height="18" rx="4" fill="#d9a074"/>
      <ellipse cx="110" cy="74" rx="22" ry="25" fill="#e0ac7c"/>
      <path d="M86 72 Q86 44 110 44 Q136 44 134 72 Q130 56 110 56 Q92 56 86 72 Z" fill="#3a2a22"/>
      <circle cx="102" cy="76" r="2.2" fill="#2b2b2b"/><circle cx="118" cy="76" r="2.2" fill="#2b2b2b"/>
      <path d="M104.5 89 L115.5 89" stroke="#8a4b3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M98 70 L106 71 M114 71 L122 70" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/>
    </g>
    <!-- bancada -->
    <path d="M0 150 L320 150 L320 180 L0 180 Z" fill="#0d1a33"/>
    <path d="M0 150 L320 150 L320 154 L0 154 Z" fill="${accent}"/>
  </svg>`;
}

// Cartão de transmissão de emergência (depois do Dia 0)
function emergencySVG() {
  const stripes = Array.from({ length: 24 }, (_, i) => `<path d="M${i * 28 - 40} 0 L${i * 28 - 26} 0 L${i * 28 - 66} 40 L${i * 28 - 80} 40 Z" fill="#111"/>`).join('');
  return `
  <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" xmlns="${SVGNS}">
    <rect width="320" height="180" fill="#1a1a1a"/>
    <g><rect width="320" height="40" fill="#f5c518"/>${stripes}</g>
    <g transform="translate(0 140)"><rect width="320" height="40" fill="#f5c518"/>${stripes}</g>
    <text x="160" y="68" text-anchor="middle" fill="#f5c518" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="24" letter-spacing="1">ALERTA DE EMERGÊNCIA</text>
    <text x="160" y="88" text-anchor="middle" fill="#ffffff" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="14" letter-spacing="1.5">SISTEMA NACIONAL DE DEFESA CIVIL</text>
  </svg>`;
}

// Chiado animado em um canvas pequeno, ampliado com pixels duros
function staticNoise(intensity) {
  const c = document.createElement('canvas');
  c.className = 'tv-static';
  c.width = 160;
  c.height = 90;
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  let last = 0;
  const loop = (t) => {
    if (!c.isConnected && last) return;
    if (t - last > 50) {
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      c.style.opacity = String(intensity * (0.7 + Math.random() * 0.6));
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return c;
}

/**
 * Monta a TV. `news` = {headline, body}. `day` define o estilo:
 *  < 0 → plantão normal; 0 → urgente; > 0 → emergência com sinal fraco.
 */
export function buildTV(news, day, time) {
  const mode = day < 0 ? 'normal' : day === 0 ? 'urgent' : 'weak';
  const tv = el('div', `tv tv-${mode}`);
  const screen = el('div', 'tv-screen');
  const content = el('div', 'tv-content');

  content.append(el('div', 'tv-bg', mode === 'weak' ? emergencySVG() : studioSVG(mode)));

  // topo: logo do canal + AO VIVO + relógio
  const top = el('div', 'tv-top');
  top.append(
    el('div', 'tv-logo', '<b>C1</b><span>NEWS</span>'),
    el('div', 'tv-live', mode === 'weak' ? '● SINAL FRACO' : '● AO VIVO'),
  );
  content.append(top, el('div', 'tv-clock', clockStr(time)));

  // vinheta piscando
  content.append(el('div', 'tv-flash', mode === 'normal' ? 'PLANTÃO' : mode === 'urgent' ? 'URGENTE' : 'EMERGÊNCIA'));

  // letreiro (lower third)
  const lower = el('div', 'tv-lower');
  lower.append(
    el('div', 'tv-tag', mode === 'weak' ? 'DEFESA CIVIL' : 'C1 NEWS'),
    el('div', 'tv-headline'),
    el('div', 'tv-sub'),
  );
  lower.querySelector('.tv-headline').textContent = news.headline;
  lower.querySelector('.tv-sub').textContent = news.body;
  content.append(lower);

  // rodapé com notícias correndo
  const lines = (TICKER[mode] || TICKER.normal).slice();
  if (mode === 'normal') lines.splice(2, 0, ...eggTicker(day));
  for (const [d, n] of Object.entries(NEWS)) if (+d < day && +d >= day - 3) lines.unshift(n.headline);
  const ticker = el('div', 'tv-ticker');
  const label = el('div', 'tv-ticker-label', 'ÚLTIMAS');
  const track = el('div', 'tv-ticker-track');
  const span = el('span');
  span.textContent = lines.join('   •   ') + '   •   ';
  track.append(span, span.cloneNode(true));
  ticker.append(label, track);
  content.append(ticker);

  screen.append(content);
  if (mode === 'weak') screen.append(staticNoise(0.35));
  screen.append(el('div', 'tv-scanlines'), el('div', 'tv-glare'));

  const bezel = el('div', 'tv-bezel');
  bezel.append(screen);
  const base = el('div', 'tv-base', '<span class="tv-brand">DIAZERO</span><span class="tv-led"></span>');
  tv.append(bezel, base, el('div', 'tv-stand'));
  return tv;
}
