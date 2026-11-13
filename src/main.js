// Ponto de entrada: loop, câmera, entrada (toque/mouse) e ligação entre simulação e interface.
import { W, H, SPEEDS, SLEEP_SPEED, BUILD, TRIP_MINUTES, ATTIC_LIFT } from './config.js';
import { createNewGame, saveGame, loadGame, hasSave, clearSave } from './state.js';
import { update, gameOver } from './sim.js';
import { render, pickAt } from './render.js';
import { P, screenToWorld } from './draw.js';
import { inLot, tileAt, isWalkable } from './world.js';
import { actionsFor, ACTIONS } from './actions.js';
import { queueTask, moveTo, clearTasks, cancelCurrent, cancelQueued, isSleeping, placePlayerNear } from './player.js';
import { canPlace, placeBlueprint, missingFor, edgeFromPoint, demolish } from './build.js';
import { initNpcs, updateNpcs } from './npc.js';
import { updateTraffic } from './traffic.js';
import { CITY } from './city.js';
import { citizenInfo } from './citizens.js';
import { buildingById, homeName, residentsOf, placeInfo, isOpenAt } from './neighbors.js';
import { minuteOfDay as mod } from './time.js';
import { bus, toast } from './bus.js';
import * as UI from './ui.js';
import { gradeFilter, dread } from './mood.js';
import { hasPower } from './time.js';
import { allRooms, roomWanted, setAllLights } from './rooms.js';
import { playCinematic, startTutorial, updateTutorial, resetTutorial } from './tutorial.js';
import { onLoadEvents } from './events.js';
import { doorbell, knock, unlock, updateAudio, play, setMute, audioSettings, duckAmbient } from './sfx.js';
import { say, hush, VOICES, onSpeaking } from './voice.js';
import { onKey, findEgg, zombieQuirk, initTitleEgg } from './eastereggs.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { w: 0, h: 0, dpr: 1 };
const [cx0, cy0] = P(10, 8);
const cam = { x: cx0, y: cy0, zoom: 1 };
const uiState = { wallMode: 'cutaway', ghost: null, pickables: [] };

const G = {
  s: null,
  speed: 1,
  mode: 'live',
  buildSel: null,
  running: false,
  get wallMode() { return uiState.wallMode; },
  set wallMode(v) { uiState.wallMode = v; },
  cancelCurrent() { cancelCurrent(G.s); },
  toggleLights() {
    const s = G.s;
    if (!hasPower(s)) { toast('Sem energia. Sem painel solar, a casa fica no escuro.', 'bad'); return; }
    const any = allRooms(s).some((r) => roomWanted(s, r));
    setAllLights(s, !any);
    toast(!any ? 'Todas as luzes acesas' : 'Todas as luzes apagadas', 'info');
  },
  cancelQueued(id) { cancelQueued(G.s, id); },
  newGame,
  saveNow(show) { if (G.s && !G.s.flags.gameOver) { saveGame(G.s); if (show) toast('Jogo salvo', 'good'); } },
  async doTrip(shop, total, gained) {
    const s = G.s;
    s.money -= total;
    const p = s.player;
    const resume = [...(p.task ? [{ target: p.task.target, act: p.task.act }] : []), ...p.queue];
    clearTasks(s);
    s.player.away = true;
    if (s.player.floor !== 'ground') { s.player.floor = 'ground'; bus.emit('floor', 'ground'); }
    play('car');
    await UI.travelOverlay(`Indo ao ${shop.name}…`, 1800, () => {
      update(s, TRIP_MINUTES);
      for (const [r, v] of Object.entries(gained)) s.stock[r] = (s.stock[r] || 0) + v;
    });
    s.player.away = false;
    placePlayerNear(s, 10, 11);
    for (const q of resume) if (q.act === 'build') queueTask(s, q.target, q.act);
    const list = Object.entries(gained).filter(([, v]) => v > 0).map(([r, v]) => `+${v} ${r}`).join(', ');
    toast(`De volta em casa: ${list}`, 'good');
    bus.emit('trip', shop);
    G.saveNow();
  },
  focusOn(x, y) {
    const [px, py] = P(x + 0.5, y + 0.5);
    cam.x = px; cam.y = py; cam.zoom = Math.max(cam.zoom, 1.4);
    clampCam();
  },
  leaveAfterOutbreak() {
    gameOver(G.s, 'left', 'Você saiu de casa', 'Bastaram alguns passos na rua. O ar ardeu nos pulmões… e o Dr. virou mais um deles.');
  },
};

// ---------------- Câmera / tela ----------------
function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = window.innerWidth;
  view.h = window.innerHeight;
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
}
window.addEventListener('resize', () => { resize(); cam.zoom = Math.max(cam.zoom, minZoom()); clampCam(); });
resize();

// A cidade projetada é um losango; a tela (retângulo) precisa caber inteira dentro dele.
const CITY_HALF_W = CITY.size * 32 * 0.97, CITY_HALF_H = CITY.size * 16 * 0.97;
const [CITY_SX, CITY_SY] = P(CITY.cx, CITY.cy);
const minZoom = () => Math.max(0.3, view.w / 2 / CITY_HALF_W + view.h / 2 / CITY_HALF_H);

function fitTarget() {
  const [x, y] = P(10, 8);
  return { x, y, zoom: Math.max(minZoom(), Math.min(1.3, Math.min(view.w / 760, view.h / 600))) };
}
function fitZoom() { Object.assign(cam, fitTarget()); }

// ganchos de câmera para a abertura cinematográfica
G.cam = cam;
G.camFit = fitTarget;
G.camMin = minZoom;
G.cityCenter = [CITY_SX, CITY_SY];
G.camGlide = (to, ms) => {
  const from = { ...cam }, t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3;
    cam.x = from.x + (to.x - from.x) * e;
    cam.y = from.y + (to.y - from.y) * e;
    cam.zoom = from.zoom + (to.zoom - from.zoom) * e;
    if (k < 1) requestAnimationFrame(step); else clampCam();
  };
  requestAnimationFrame(step);
};

const toWorldScreen = (sx, sy) => [(sx - view.w / 2) / cam.zoom + cam.x, (sy - view.h / 2) / cam.zoom + cam.y];
// no sótão tudo é desenhado ATTIC_LIFT px acima: desfaz o deslocamento para achar o tile
const lift = () => (G.running && G.s.player.floor === 'attic' ? ATTIC_LIFT : 0);
const toLayer = (sx, sy) => { const [wx, wy] = toWorldScreen(sx, sy); return [wx, wy + lift()]; };

function clampCam() {
  // a câmera pode passear pela cidade toda; só não pode mostrar além da borda
  // mantém a tela inteira dentro da cidade (nunca mostra o vazio)
  const a = view.w / 2 / cam.zoom, b = view.h / 2 / cam.zoom;
  const slack = Math.max(0, 1 - a / CITY_HALF_W - b / CITY_HALF_H);
  const dx = cam.x - CITY_SX, dy = cam.y - CITY_SY;
  const used = Math.abs(dx) / CITY_HALF_W + Math.abs(dy) / CITY_HALF_H;
  if (used > slack) {
    const f = used > 0 ? slack / used : 0;
    cam.x = CITY_SX + dx * f;
    cam.y = CITY_SY + dy * f;
  }
}

function zoomAt(sx, sy, nz) {
  nz = Math.max(minZoom(), Math.min(2.5, nz));
  const [bx, by] = toWorldScreen(sx, sy);
  cam.zoom = nz;
  const [ax, ay] = toWorldScreen(sx, sy);
  cam.x += bx - ax;
  cam.y += by - ay;
  clampCam();
}

// ---------------- Entrada ----------------
const pointers = new Map();
let drag = null, pinch = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.zoom };
    if (drag) drag.moved = true;
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.zoom * (d / pinch.d));
  } else if (drag && pointers.size === 1) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; UI.hideContextMenu(); }
    if (drag.moved) {
      cam.x = drag.cx - dx / cam.zoom;
      cam.y = drag.cy - dy / cam.zoom;
      clampCam();
    }
  }
  if (e.pointerType === 'mouse') hover(e.clientX, e.clientY);
});
const endPointer = (e) => {
  if (drag && !drag.moved && pointers.size === 1 && e.type === 'pointerup') tap(e.clientX, e.clientY);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) drag = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { uiState.ghost = null; uiState.hover = null; UI.setHoverTip(null); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, cam.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (!G.running || G.cinematic || UI.isModalOpen()) return;
  if (onKey(G, e) === 'konami') { setMode('live'); return; }
  if (e.key === ' ') { G.speed = G.speed === 0 ? 1 : 0; e.preventDefault(); }
  if (e.key >= '1' && e.key <= '3') G.speed = +e.key;
  if (e.key === 'b') setMode(G.mode === 'build' ? 'live' : 'build');
  if (e.key === 'l') G.toggleLights();
  if (e.key === 'm') { const m = !audioSettings().mute; setMute(m); toast(m ? 'Som desligado (M para ligar)' : 'Som ligado', 'info'); }
  if (e.key === 'Escape') { UI.hideContextMenu(); if (G.mode === 'build') setMode('live'); }
});

function placementAt(sx, sy) {
  const [wx, wy] = toLayer(sx, sy);
  const [fx, fy] = screenToWorld(wx, wy);
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const item = G.buildSel;
  const B = BUILD[item];
  const edge = B.kind === 'edge' ? edgeFromPoint(fx, fy) : null;
  return { item, x: tx, y: ty, edge, ok: canPlace(G.s, item, tx, ty, edge) };
}

function hover(sx, sy) {
  uiState.hover = null;
  uiState.ghost = null;
  let tip = null;
  if (G.running && !UI.isModalOpen() && !UI.isContextOpen() && !(drag && drag.moved) && !G.s.flags.gameOver) {
    const s = G.s;
    const [wx, wy] = toLayer(sx, sy);
    const [fx, fy] = screenToWorld(wx, wy);
    const tx = Math.floor(fx), ty = Math.floor(fy);
    const demolishing = G.mode === 'build' && G.buildSel === 'demolish';
    if (G.mode === 'build' && BUILD[G.buildSel]) {
      uiState.ghost = placementAt(sx, sy);
    } else {
      let target = pickAt(uiState.pickables, wx, wy, { walls: demolishing });
      if (!target && inLot(tx, ty) && tileAt(s, tx, ty).pending) target = { kind: 'tile', x: tx, y: ty };
      if (target && target.kind === 'npc') {
        const n = s.npcs.find((q) => q.id === target.id);
        if (n && G.mode === 'live') { uiState.hover = target; tip = npcLabel(n); }
      } else if (target && target.kind === 'building') {
        const b = buildingById(target.id);
        if (b && G.mode === 'live') {
          uiState.hover = target;
          tip = b.role
            ? `${placeInfo(b).name} · ${s.flags.outbreak ? 'abandonado' : isOpenAt(b, mod(s.time)) && s.time < 7 * 1440 ? 'aberto' : 'fechado'}`
            : `${homeName(b)} · ${residentsOf(s, b).length} morador(es)`;
        }
      } else if (target) {
        const { title, items } = actionsFor(s, target);
        if (demolishing) { uiState.hover = { ...target, danger: true }; tip = `Demolir: ${title || 'Parede'}`; }
        else if (G.mode === 'live' && (items.length || title)) { uiState.hover = target; tip = title; }
      }
    }
  }
  canvas.style.cursor = uiState.hover ? 'pointer' : uiState.ghost ? 'crosshair' : '';
  UI.setHoverTip(tip, sx, sy);
}

function npcLabel(n) {
  if (n.mode === 'yard' || n.mode === 'intruder') return `Infectado · ${(n.mode === 'yard' && zombieQuirk(n)) || n.activity}`;
  if (n.mode === 'visitor' || n.mode === 'guest') return `${n.name} · ${n.activity}`;
  const i = citizenInfo(n);
  return `${i.name} · ${i.activity}`;
}

function tap(sx, sy) {
  UI.setHoverTip(null);
  uiState.hover = null;
  if (!G.running || G.cinematic || UI.isModalOpen() || G.s.flags.gameOver) return;
  if (UI.isContextOpen()) { UI.hideContextMenu(); return; }
  const s = G.s;
  const [wx, wy] = toLayer(sx, sy);
  const [fx, fy] = screenToWorld(wx, wy);
  const tx = Math.floor(fx), ty = Math.floor(fy);

  if (G.mode === 'build') {
    if (G.buildSel === 'demolish') {
      let target = pickAt(uiState.pickables, wx, wy, { walls: true });
      if (!target && inLot(tx, ty) && tileAt(s, tx, ty).pending) target = { kind: 'tile', x: tx, y: ty };
      if (!target) return;
      const r = demolish(s, target);
      if (r === true) toast('Removido', 'info');
      else toast(r, 'bad');
      return;
    }
    if (!BUILD[G.buildSel]) { toast('Escolha um item na barra de construção', 'info'); return; }
    const g = placementAt(sx, sy);
    if (g.ok !== true) { toast(g.ok, 'bad'); return; }
    const miss = missingFor(s, BUILD[g.item].cost);
    if (miss.length) { toast('Falta: ' + miss.join(', '), 'bad'); return; }
    const target = placeBlueprint(s, g.item, g.x, g.y, g.edge);
    queueTask(s, target, 'build');
    return;
  }

  // modo normal
  let target = pickAt(uiState.pickables, wx, wy);
  if (target && target.kind === 'building') {
    const b = buildingById(target.id);
    if (b) { if (b.role) UI.showPlace(G, b); else UI.showHome(G, b); return; }
  }
  if (target && target.kind === 'npc') {
    const n = s.npcs.find((q) => q.id === target.id);
    if (n && n.mode === 'intruder' && !n.dead) {
      const reason = ACTIONS.fight.can ? ACTIONS.fight.can(s, n) : true;
      UI.showContextMenu(sx, sy, 'Infectado dentro de casa!', [
        { info: true, icon: 'warning', label: 'Ele vai te atacar. Enfrente ou fuja por uma escada.' },
        { act: 'fight', icon: 'fight', label: ACTIONS.fight.label, reason: reason === true ? null : reason },
      ], () => queueTask(s, { kind: 'npc', id: n.id }, 'fight'));
      return;
    }
    if (n && (n.mode === 'visitor' || n.mode === 'guest')) {
      const waiting = n.mode === 'visitor' && s.ev?.visit?.npc === n.id && s.ev.visit.state === 'wait';
      UI.showContextMenu(sx, sy, n.name, [
        { info: true, icon: 'walk', label: n.activity },
        ...(waiting ? [{ act: 'answer', icon: 'door', label: 'Atender a porta' }] : []),
      ], () => ACTIONS.answer.run(s));
      return;
    }
    if (n) {
      const quirk = n.mode === 'yard' && zombieQuirk(n);
      if (quirk) findEgg('zumbi');
      const i = n.mode === 'yard' ? { name: 'Desconhecido', persona: 'Infectado', activity: quirk || 'rondando a casa' } : citizenInfo(n);
      const items = [{ info: true, icon: 'info', label: i.persona }, { info: true, icon: 'walk', label: i.activity }];
      if (n.mode === 'citizen' && n.home) items.push({ act: 'home', icon: 'home', label: `Ver a ${homeName(n.home)}` });
      UI.showContextMenu(sx, sy, n.mode === 'citizen' && n.home ? `${i.name} ${homeName(n.home).replace('Casa dos ', '')}` : i.name, items, () => UI.showHome(G, n.home));
      return;
    }
    target = null;
  }
  if (!target && inLot(tx, ty) && tileAt(s, tx, ty).pending) target = { kind: 'tile', x: tx, y: ty };
  if (target) {
    const { title, items } = actionsFor(s, target);
    if (items.length || title) {
      for (const it of items) if (it.egg) findEgg(it.egg);
      UI.showContextMenu(sx, sy, title, items, (it) => runAction(target, it.act));
      return;
    }
  }
  if (inLot(tx, ty)) {
    if (isWalkable(s, tx, ty)) moveTo(s, tx, ty);
    else toast(s.flags.outbreak && s.player.floor === 'ground' ? 'Lá fora não. Nunca mais.' : 'Não dá para andar aí', 'bad');
  }
}

function runAction(target, act) {
  const A = ACTIONS[act];
  if (!A) return;
  if (A.ui) { A.run(G.s, target); return; }
  queueTask(G.s, target, act);
}

function setMode(m) {
  G.mode = m;
  uiState.ghost = null;
  UI.showBuildBar(G, m === 'build');
}

// ---------------- Botões do HUD ----------------
document.querySelectorAll('#speed button').forEach((b) => b.addEventListener('click', () => { G.speed = +b.dataset.speed; }));
document.getElementById('light-btn').addEventListener('click', (e) => { e.stopPropagation(); UI.hideContextMenu(); UI.toggleLightPanel(G); });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#light-panel') && !e.target.closest('#light-btn')) UI.hideLightPanel(); });
document.querySelectorAll('#toolbar button').forEach((b) => b.addEventListener('click', () => {
  UI.hideContextMenu();
  const t = b.dataset.tool;
  if (t === 'build') setMode(G.mode === 'build' ? 'live' : 'build');
  if (t === 'inventory') UI.showInventory(G);
  if (t === 'plan') UI.showPlan(G);
  if (t === 'travel') UI.showTravel(G);
  if (t === 'menu') UI.showMenu(G);
}));

// ---------------- Eventos da simulação ----------------
bus.on('toast', UI.showToast);
bus.on('toast', ({ kind }) => { if (kind === 'bad' || kind === 'good' || kind === 'event') play(kind); else if (kind === 'egg') play('good'); });
// avisos de evento (presentes, rádio, tempestade…) são narrados
bus.on('toast', ({ msg, kind }) => { if (kind === 'event') say(msg, /rádio/i.test(msg) ? VOICES.radio : VOICES.narrator, { queue: true }); });
onSpeaking(duckAmbient);
bus.on('news', (day) => UI.showNews(G, day, () => { G.s._tvOn = null; G.s._radioOn = null; }));
bus.on('openTravel', () => UI.showTravel(G));
bus.on('openInventory', () => UI.showInventory(G));
bus.on('outbreak', () => play('outbreak'));
bus.on('outbreak', () => { setMode('live'); UI.showOutbreak(G); G.saveNow(); });
bus.on('gameover', (go) => play(go.reason === 'cure' ? 'win' : 'gameover'));
bus.on('gameover', (go) => { clearSave(); UI.showGameOver(G, go); });
bus.on('floor', () => play('stairs'));
bus.on('floor', () => { UI.hideContextMenu(); uiState.hover = null; uiState.ghost = null; if (G.running) UI.showBuildBar(G, G.mode === 'build'); });
bus.on('story', (id) => UI.showStory(G, id));
bus.on('eggStory', (st) => UI.showEggStory(G, st));
bus.on('hour', () => G.saveNow());
bus.on('eventCard', (c) => UI.showEventCard(G, c));
bus.on('ring', (post) => (post ? knock() : doorbell()));
document.addEventListener('visibilitychange', () => { if (document.hidden) G.saveNow(); });

// ---------------- Início ----------------
function startGame(s, fresh) {
  G.s = s;
  G.speed = 1;
  G.running = true;
  initNpcs(s);
  setMode('live');
  fitZoom();
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  resetTutorial();
  onLoadEvents(s);
  if (fresh || !s.flags.intro) {
    s.flags.tut = 0;
    playCinematic(G, () => { s.flags.intro = true; startTutorial(G); G.saveNow(); });
  } else startTutorial(G);
}

function newGame() {
  hush();
  document.getElementById('modal-root').innerHTML = '';
  clearSave();
  const s = createNewGame();
  startGame(s, true);
  saveGame(s);
}

const btnContinue = document.getElementById('btn-continue');
if (hasSave()) btnContinue.classList.remove('hidden');
btnContinue.addEventListener('click', () => {
  const s = loadGame();
  if (s) startGame(s, false);
  else newGame();
});
document.getElementById('btn-new').addEventListener('click', newGame);

// cena de fundo na tela de título
const preview = createNewGame();
preview.time = 6 * 1440 + 17 * 60; // véspera do Dia 0, fim de tarde
initNpcs(preview);
G.s = preview;
fitZoom();

// acesso para depuração no console do navegador
window.G = G;
window.cam = cam;

UI.initStaticIcons();
initTitleEgg();
const grain = document.getElementById('grain');
let lastGrade = '';

// ---------------- Som ----------------
// o navegador só libera o áudio depois do primeiro toque
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) play('click'); }, { capture: true });
// posição na tela → pan estéreo (esquerda/direita)
const panOf = (x, y) => {
  const [wx] = P(x, y);
  return Math.max(-0.9, Math.min(0.9, ((wx - cam.x) * cam.zoom) / (view.w / 2) * 0.8));
};

// ---------------- Loop ----------------
let last = performance.now();
let hudTimer = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const s = G.s;
  if (G.running && !G.cinematic && !s.flags.gameOver && !UI.isModalOpen()) {
    const speed = isSleeping(s) && G.speed > 0 ? Math.max(SLEEP_SPEED, SPEEDS[G.speed]) : SPEEDS[G.speed];
    if (speed > 0) update(s, dt * speed);
  } else if (!G.running || G.cinematic) {
    // título / abertura: só os pedestres andam
    updateNpcs(s, dt * 5);
    updateTraffic(s, dt * 5);
    if (!G.running) { cam.x += Math.sin(now / 4000) * 0.15; clampCam(); }
  }
  render(ctx, s, view, cam, uiState);
  const grade = gradeFilter(s);
  if (grade !== lastGrade) {
    lastGrade = grade;
    canvas.style.filter = grade;
    grain.style.opacity = (0.05 + 0.09 * dread(s)).toFixed(3);
    document.body.dataset.dread = dread(s) > 0.6 || s.flags.outbreak ? 'high' : dread(s) > 0.3 ? 'mid' : 'low';
  }
  hudTimer += dt;
  if (G.running && hudTimer > 0.12) { hudTimer = 0; UI.updateHud(G); }
  G.paused = UI.isModalOpen();
  updateAudio(G, dt, panOf);
  if (G.running) updateTutorial(G, view, cam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
