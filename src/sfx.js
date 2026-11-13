// Som do jogo, todo sintetizado com Web Audio (nenhum arquivo de áudio).
//  · ambiente: cidade, vento, chuva, sirenes, pássaros, cachorros, trovões — muda com a tensão e a noite
//  · ações do Dr.: martelo, machado, pá, teclado, fita, passos, chuveiro, ronco…
//  · zumbis: gemidos no quintal, pancadas nas portas, rosnado dentro de casa
//  · interface: cliques, alertas, campainha, batidas na porta
import { OUTBREAK_TIME } from './config.js';
import { dayIndex, hasPower } from './time.js';
import { dread, rainAmount, sirenCount } from './mood.js';
import { nightLevel, NIGHT_MAX } from './light.js';
import { pendingBuild } from './build.js';
import { tileAt } from './world.js';

const KEY = 'diazero.audio';
const settings = { vol: 0.7, mute: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} };

let ac = null, master, sfxBus, ambBus, noiseBuf, brownBuf;
const R = Math.random;
const rr = (a, b) => a + R() * (b - a);

function init() {
  if (ac) return ac;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master = ac.createGain();
  master.gain.value = settings.mute ? 0 : settings.vol;
  master.connect(comp).connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  ambBus = ac.createGain(); ambBus.gain.value = 0.7; ambBus.connect(master);
  const n = ac.sampleRate * 2;
  noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
  brownBuf = ac.createBuffer(1, n, ac.sampleRate);
  const w = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    w[i] = R() * 2 - 1;
    last = (last + 0.02 * w[i]) / 1.02;
    b[i] = last * 3.5;
  }
  return ac;
}

// o navegador só libera áudio depois de um toque/clique
export function unlock() {
  const a = init();
  if (a && a.state === 'suspended') a.resume();
}
const ready = () => ac && ac.state === 'running';

// abaixa o ambiente enquanto alguém fala
export function duckAmbient(on) {
  if (!ambBus) return;
  ambBus.gain.setTargetAtTime(on ? 0.3 : 0.7, ac.currentTime, on ? 0.08 : 0.5);
}

// ---------- configurações ----------
export const audioSettings = () => ({ ...settings });
export function setVolume(v) {
  settings.vol = Math.max(0, Math.min(1, v));
  if (master && !settings.mute) master.gain.setTargetAtTime(settings.vol, ac.currentTime, 0.05);
  saveSettings();
}
export function setMute(m) {
  settings.mute = !!m;
  if (master) master.gain.setTargetAtTime(settings.mute ? 0 : settings.vol, ac.currentTime, 0.05);
  saveSettings();
}

// ---------- primitivas ----------
function out(pan, bus) {
  if (!pan || !ac.createStereoPanner) return bus || sfxBus;
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(bus || sfxBus);
  return p;
}
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function noise({ t = 0, dur = 0.1, type = 'bandpass', f = 1000, f2 = null, q = 1, vol = 0.2, a = 0.004, pan = 0, brown = false, bus = null }) {
  const t0 = ac.currentTime + t;
  const src = ac.createBufferSource();
  src.buffer = brown ? brownBuf : noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + a + dur);
  const g = ac.createGain();
  env(g, t0, a, vol, dur);
  src.connect(fl).connect(g).connect(out(pan, bus));
  src.start(t0, R() * 1.5);
  src.stop(t0 + a + dur + 0.05);
}
function tone({ t = 0, f = 440, f2 = null, dur = 0.2, type = 'sine', vol = 0.1, a = 0.005, pan = 0, lp = null, bus = null }) {
  const t0 = ac.currentTime + t;
  const o = ac.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + dur);
  const g = ac.createGain();
  env(g, t0, a, vol, dur);
  let node = o;
  if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
  node.connect(g).connect(out(pan, bus));
  o.start(t0); o.stop(t0 + a + dur + 0.05);
}

// ---------- efeitos ----------
const FX = {
  click: () => { noise({ type: 'highpass', f: 4500, dur: 0.012, vol: 0.05 }); tone({ f: 1900, dur: 0.02, vol: 0.015 }); },
  good: () => { tone({ f: 660, dur: 0.15, vol: 0.05 }); tone({ t: 0.1, f: 990, dur: 0.25, vol: 0.045 }); },
  bad: () => { tone({ f: 466, dur: 0.13, vol: 0.05, type: 'square', lp: 1400 }); tone({ t: 0.14, f: 349, dur: 0.22, vol: 0.05, type: 'square', lp: 1200 }); },
  event: () => { tone({ f: 880, dur: 0.5, vol: 0.035, type: 'triangle' }); tone({ t: 0.08, f: 1320, dur: 0.4, vol: 0.015 }); },
  doorbell: () => { tone({ f: 659, dur: 1.1, vol: 0.16 }); tone({ f: 1318, dur: 0.5, vol: 0.03 }); tone({ t: 0.55, f: 523, dur: 1.4, vol: 0.16 }); tone({ t: 0.55, f: 1046, dur: 0.6, vol: 0.03 }); },
  knock: () => { for (const [i, t] of [[0, 0], [1, 0.22], [2, 0.42]]) { tone({ t, f: 150 - i * 8, f2: 60, dur: 0.13, vol: 0.4, type: 'triangle' }); noise({ t, type: 'lowpass', f: 500, dur: 0.06, vol: 0.2 }); } },
  hammer: (p) => { noise({ type: 'highpass', f: 2200, dur: 0.04, vol: 0.32, pan: p }); tone({ f: rr(1700, 2300), dur: 0.12, vol: 0.06, type: 'triangle', pan: p }); tone({ f: 170, f2: 90, dur: 0.07, vol: 0.28, pan: p }); },
  axe: (p) => { tone({ f: 130, f2: 50, dur: 0.18, vol: 0.45, pan: p }); noise({ f: 900, q: 1.2, dur: 0.1, vol: 0.3, pan: p }); noise({ t: 0.05, type: 'highpass', f: 3000, dur: 0.06, vol: 0.08, pan: p }); },
  dig: (p) => noise({ f: 700, f2: 280, q: 0.9, dur: 0.32, a: 0.03, vol: 0.2, pan: p }),
  type: () => { for (let i = 0, n = 2 + (R() * 4) | 0; i < n; i++) noise({ t: i * rr(0.06, 0.12), type: 'highpass', f: 3200, dur: 0.012, vol: 0.07 }); },
  clink: () => { tone({ f: rr(3000, 3600), dur: 0.25, vol: 0.035, type: 'triangle' }); tone({ t: 0.01, f: 4700, dur: 0.18, vol: 0.015 }); },
  tape: () => noise({ f: 2200, f2: 4200, q: 0.8, dur: 0.32, a: 0.02, vol: 0.13 }),
  rustle: () => noise({ f: rr(1200, 1900), q: 0.6, dur: 0.22, a: 0.03, vol: 0.07 }),
  pour: () => noise({ f: 700, f2: 1300, q: 3, dur: 1.1, a: 0.1, vol: 0.08 }),
  crunch: () => { noise({ f: 1800, q: 1.5, dur: 0.05, vol: 0.12 }); noise({ t: 0.12, f: 1500, q: 1.5, dur: 0.05, vol: 0.09 }); },
  gulp: () => { tone({ f: 320, f2: 170, dur: 0.09, vol: 0.12 }); tone({ t: 0.35, f: 300, f2: 160, dur: 0.09, vol: 0.1 }); },
  snore: () => { noise({ type: 'lowpass', f: 320, dur: 0.9, a: 0.45, vol: 0.1 }); tone({ f: 85, dur: 0.8, a: 0.4, vol: 0.03, type: 'sawtooth', lp: 300 }); },
  punch: (p) => { tone({ f: 120, f2: 55, dur: 0.12, vol: 0.45, pan: p }); noise({ type: 'lowpass', f: 900, dur: 0.06, vol: 0.25, pan: p }); },
  // passos: baixinhos, com leve variação a cada pisada
  step: () => { noise({ type: 'lowpass', f: 380, dur: 0.045, vol: 0.06 }); tone({ f: 95, f2: 60, dur: 0.04, vol: 0.04 }); },
  stepFloor: (p) => { // assoalho/piso: batida seca e abafada do calcanhar
    const k = rr(0.8, 1.1);
    noise({ type: 'bandpass', f: rr(700, 950), q: 1.4, dur: 0.028, vol: 0.022 * k, pan: p });
    tone({ f: rr(105, 125), f2: 65, dur: 0.035, vol: 0.022 * k, pan: p });
  },
  stepTile: (p) => { // azulejo: um pouco mais estalado
    const k = rr(0.8, 1.1);
    noise({ type: 'bandpass', f: rr(1600, 2100), q: 1.8, dur: 0.02, vol: 0.016 * k, pan: p });
    tone({ f: rr(130, 150), f2: 80, dur: 0.03, vol: 0.016 * k, pan: p });
  },
  stepGrass: (p) => { // grama: roçar macio, sem batida
    const k = rr(0.75, 1.1), f = rr(2400, 3400);
    noise({ f, f2: f * 0.7, q: 0.7, dur: 0.11, a: 0.02, vol: 0.02 * k, pan: p });
    noise({ type: 'lowpass', f: 260, dur: 0.05, a: 0.01, vol: 0.022 * k, pan: p, brown: true });
  },
  stepHard: (p) => { // calçada/concreto: raspar de sola com areia
    const k = rr(0.8, 1.1);
    noise({ type: 'highpass', f: rr(2600, 3400), dur: 0.035, a: 0.006, vol: 0.012 * k, pan: p });
    tone({ f: rr(110, 130), f2: 70, dur: 0.03, vol: 0.02 * k, pan: p });
  },
  stairs: () => { for (let i = 0; i < 4; i++) { FX.step(); noise({ t: i * 0.18, type: 'lowpass', f: 420, dur: 0.05, vol: 0.08 }); } tone({ t: 0.2, f: 300, f2: 430, dur: 0.25, vol: 0.02, type: 'triangle' }); },
  car: () => { noise({ type: 'lowpass', f: 220, dur: 1.8, a: 0.2, vol: 0.25, brown: true }); tone({ f: 45, f2: 75, dur: 1.6, a: 0.15, vol: 0.06, type: 'sawtooth', lp: 260 }); },
  bird: (p) => { const base = rr(2600, 3400), n = 2 + (R() * 4) | 0; for (let i = 0; i < n; i++) tone({ t: i * rr(0.08, 0.12), f: base, f2: base * rr(1.15, 1.4), dur: 0.06, vol: 0.022, pan: p, bus: ambBus }); },
  dog: (p) => { for (const t of [0, 0.2]) tone({ t, f: rr(380, 460), f2: 260, dur: 0.11, vol: 0.03, type: 'sawtooth', lp: 1200, pan: p, bus: ambBus }); },
  thunder: () => { noise({ type: 'lowpass', f: 160, dur: 3.2, a: 0.08, vol: 0.5, brown: true, bus: ambBus }); noise({ t: 0.6, type: 'lowpass', f: 90, dur: 2.5, a: 0.3, vol: 0.4, brown: true, bus: ambBus }); },
  moan: (p) => {
    const t0 = ac.currentTime, f = rr(95, 150), d = rr(1.2, 2);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.72, t0 + d);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = rr(4, 7); lg.gain.value = f * 0.04;
    lfo.connect(lg).connect(o.frequency);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = rr(500, 750); f1.Q.value = 5;
    const g = ac.createGain(); env(g, t0, 0.35, 0.09, d);
    o.connect(f1).connect(g).connect(out(p));
    o.start(t0); lfo.start(t0); o.stop(t0 + d + 0.5); lfo.stop(t0 + d + 0.5);
  },
  growl: (p) => { tone({ f: rr(70, 90), f2: 55, dur: 0.8, a: 0.1, vol: 0.12, type: 'sawtooth', lp: 450, pan: p }); noise({ type: 'lowpass', f: 600, dur: 0.7, a: 0.1, vol: 0.12, pan: p }); },
  bash: (p, v = 1) => { tone({ f: 75, f2: 42, dur: 0.24, vol: 0.4 * v, pan: p }); noise({ type: 'lowpass', f: 320, dur: 0.18, vol: 0.32 * v, pan: p }); noise({ t: 0.01, f: 1300, q: 2, dur: 0.05, vol: 0.08 * v, pan: p }); },
  outbreak: () => { tone({ f: 55, dur: 4, a: 0.05, vol: 0.25 }); tone({ f: 58.3, dur: 4, a: 0.05, vol: 0.2 }); noise({ type: 'lowpass', f: 140, dur: 4, a: 0.02, vol: 0.5, brown: true }); },
  gameover: () => { for (const [f, v] of [[110, 0.12], [116.5, 0.1], [155.6, 0.08], [55, 0.15]]) tone({ f, f2: f * 0.94, dur: 3.5, a: 0.1, vol: v }); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone({ t: i * 0.18, f, dur: 1.2, vol: 0.06, type: 'triangle' })); },
};

export function play(name, ...args) {
  if (!ready() || settings.mute) return;
  try { FX[name]?.(...args); } catch {}
}
export const doorbell = () => play('doorbell');
export const knock = () => play('knock');

// ---------- camadas contínuas (loops) ----------
const loops = {};
function loop(name, build) {
  if (loops[name]) return loops[name];
  const src = ac.createBufferSource();
  src.loop = true;
  const g = ac.createGain(); g.gain.value = 0;
  const L = { g, level: 0, ...build(src) };
  L.tail.connect(g).connect(ambBus);
  src.start(0, R() * 1.5);
  return (loops[name] = L);
}
function level(L, v, tc = 0.6) {
  if (Math.abs(L.level - v) < 0.002) return;
  L.level = v;
  L.g.gain.setTargetAtTime(v, ac.currentTime, tc);
}
const filt = (type, f, q = 1) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };

function buildLoops() {
  loop('city', (src) => { src.buffer = brownBuf; const f = filt('lowpass', 320); src.connect(f); return { tail: f }; });
  loop('wind', (src) => {
    src.buffer = noiseBuf; const f = filt('bandpass', 420, 0.8); src.connect(f);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 220; lfo.connect(lg).connect(f.frequency); lfo.start();
    return { tail: f };
  });
  loop('rain', (src) => { src.buffer = noiseBuf; const a = filt('highpass', 900), b = filt('lowpass', 6500); src.connect(a).connect(b); return { tail: b }; });
  loop('tv', (src) => { src.buffer = noiseBuf; const a = filt('bandpass', 1100, 2.5), m = ac.createGain(); m.gain.value = 0; src.connect(a).connect(m); return { tail: m, mod: m }; });
  loop('radio', (src) => { src.buffer = noiseBuf; const a = filt('bandpass', 2600, 0.7), m = ac.createGain(); m.gain.value = 1; src.connect(a).connect(m); return { tail: m, mod: m }; });
  loop('shower', (src) => { src.buffer = noiseBuf; const a = filt('bandpass', 3200, 0.5); src.connect(a); return { tail: a }; });
  loop('sizzle', (src) => { src.buffer = noiseBuf; const a = filt('highpass', 4200), m = ac.createGain(); src.connect(a).connect(m); return { tail: m, mod: m }; });
  loop('siren', () => {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 760;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.28; lg.gain.value = 210; lfo.connect(lg).connect(o.frequency);
    const f = filt('lowpass', 1300); o.connect(f); o.start(); lfo.start();
    return { tail: f };
  });
}

// ---------- diretor: lê o estado do jogo a cada quadro ----------
const timers = {};
const every = (k, dt, gap) => { timers[k] = (timers[k] ?? rr(0, gap)) - dt; if (timers[k] > 0) return false; timers[k] = gap; return true; };
let lastAct = null, lastWalkSign = 0, tvT = 0;

const ACT_SFX = {
  build: (s, p) => (pendingBuild(s, p.task.target) === 'dig' ? ['dig', 0.85] : ['hammer', 0.42]),
  reinforce1: () => ['hammer', 0.38], reinforce2: () => ['hammer', 0.3], patch: () => ['hammer', 0.45], rebuild: () => ['hammer', 0.4],
  chop: () => ['axe', 0.95], work: () => ['type', 0.45], research: () => ['clink', 1.3], seal: () => ['tape', 1.1], sealHatch: () => ['tape', 1.1],
  plant: () => ['rustle', 0.9], harvest: () => ['rustle', 0.7], water: () => ['pour', 1.3], search: () => ['rustle', 0.45],
  eat: () => ['crunch', 1.4], fight: () => ['punch', 0.4], sleep: () => ['snore', 3.2], sampleAir: () => ['rustle', 1.2], repairSolar: () => ['hammer', 0.6],
};

// som do passo conforme o chão sob o Dr.
const STEP_BY_TILE = { grass: 'stepGrass', earth: 'stepGrass', path: 'stepHard', drive: 'stepHard', sidewalk: 'stepHard', concrete: 'stepHard', tile: 'stepTile', bath: 'stepTile' };
function stepSound(s, p) {
  const t = tileAt(s, Math.floor(p.px), Math.floor(p.py));
  return (t && STEP_BY_TILE[t.type]) || 'stepFloor';
}

export function updateAudio(G, dt, panOf) {
  if (!ready()) return;
  if (!loops.city) buildLoops();
  const s = G.s;
  const out = s.time >= OUTBREAK_TIME;
  const night = Math.min(1, nightLevel(s) / NIGHT_MAX);
  const dr = dread(s);
  const rain = rainAmount(s);
  const paused = G.running && (G.speed === 0 || G.paused);
  const p = s.player;
  const indoor = G.running && !p.away;

  // ---- ambiente ----
  level(loops.city, out ? 0 : (0.22 + 0.12 * dr) * (1 - 0.55 * night));
  level(loops.wind, 0.03 + 0.1 * dr + (out ? 0.12 + 0.08 * night : 0));
  level(loops.rain, rain * (indoor ? 0.22 : 0.32));
  const sirens = !out ? sirenCount(s) : 0;
  level(loops.siren, sirens ? 0.012 * sirens * Math.max(0, Math.sin(performance.now() / 9000)) : 0, 1.5);
  if (!out && night < 0.6 && dr < 0.7 && every('bird', dt, rr(2, 7) / (1 - dr))) play('bird', rr(-0.8, 0.8));
  if (!out && every('dog', dt, rr(25, 70))) play('dog', rr(-0.9, 0.9));
  if (rain > 0.55 && every('thunder', dt, rr(40, 110))) play('thunder');

  // ---- casa: TV, rádio ----
  const tvOn = G.running && !!s._tvOn && hasPower(s);
  level(loops.tv, tvOn ? 0.14 : 0, 0.1);
  if (tvOn) { tvT -= dt; if (tvT <= 0) { tvT = rr(0.07, 0.2); loops.tv.mod.gain.setTargetAtTime(R() < 0.18 ? 0 : rr(0.4, 1), ac.currentTime, 0.02); } }
  level(loops.radio, G.running && s._radioOn ? 0.035 : 0, 0.1);

  // ---- ações do Dr. ----
  const t = G.running && !paused && p.task && p.task.phase === 'do' ? p.task : null;
  level(loops.shower, t?.act === 'shower' ? 0.09 : 0, 0.15);
  const cooking = t?.act === 'eat' && s.world.objects.find((o) => o.id === t.target.id)?.type === 'stove';
  level(loops.sizzle, cooking ? 0.05 : 0, 0.2);
  if (t && t.act !== lastAct) { if (t.act === 'drink') play('gulp'); lastAct = t.act; }
  if (!t) lastAct = null;
  const fx = t && !cooking && ACT_SFX[t.act]?.(s, p);
  if (fx && every('act:' + fx[0], dt, fx[1] * rr(0.85, 1.15))) play(fx[0], 0);
  // passos no ritmo da caminhada
  if (G.running && !paused && p.moving && !p.away) {
    const sg = Math.sign(Math.sin(p.walk));
    if (sg !== lastWalkSign) { lastWalkSign = sg; play(stepSound(s, p), panOf(p.px, p.py) * 0.5); }
  }

  // ---- zumbis ----
  if (G.running && !paused && out && s.npcs) {
    let yard = 0, bashers = [], intr = null;
    for (const n of s.npcs) {
      if (n.dead) continue;
      if (n.mode === 'yard') { yard++; if (n.bashing) bashers.push(n); }
      else if (n.mode === 'intruder') intr = n;
    }
    if (yard && every('moan', dt, rr(3, 9) / Math.min(4, yard))) {
      const n = s.npcs.filter((q) => q.mode === 'yard' && !q.dead)[(R() * yard) | 0];
      if (n) play('moan', panOf(n.px, n.py));
    }
    if (bashers.length && every('bash', dt, rr(0.9, 1.6) / Math.min(3, bashers.length))) {
      const n = bashers[(R() * bashers.length) | 0];
      play('bash', panOf(n.px, n.py), p.floor === 'ground' ? 1 : 0.4);
    }
    if (intr && p.floor === 'ground' && every('growl', dt, rr(2.5, 5))) play('growl', panOf(intr.px, intr.py));
  }
}
