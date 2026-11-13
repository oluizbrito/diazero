// Interface HTML sobre o canvas: HUD, menus, lojas, notícias, modais.
import { RESOURCES, SHOPS, BUILD, TRIP_MINUTES, RATES, MEAL, DRINK, OUTBREAK_TIME, FLOORS, RESEARCH } from './config.js';
import { NEWS, POST_NEWS, HELP_HTML, PROTAGONIST } from './content.js';
import { dayIndex, clockStr, periodStr, periodIcon, durationStr, priceMult, shopsStatus, hasPower, hasTapWater, survivedDays } from './time.js';
import { sealStatus, countBuilt, isIndoor, onFloor } from './world.js';
import { isExteriorOpening } from './siege.js';
import { homeInfo, homeName, residentsOf, residentProfile, placeInfo, isOpenAt, hoursStr, peopleInside, regularsOf, regularRole } from './neighbors.js';
import { dread } from './mood.js';
import { minuteOfDay } from './time.js';
import { drawPerson, citizenLook, zombieLook } from './people.js';
import { setTint } from './draw.js';
import { allRooms, roomWanted, setRoomLight, setAllLights } from './rooms.js';
import { attention, attentionLevel, currentNoise } from './attention.js';
import { contaminationRate } from './sim.js';
import { missingFor, costStr, pendingBuild } from './build.js';
import { taskProgress } from './player.js';
import { ACTIONS, researchInfo } from './actions.js';
import { bus } from './bus.js';
import { buildTV } from './tv.js';
import { icon, iconHTML } from './icons.js';
import { promoMult } from './events.js';
import { audioSettings, setVolume, setMute, play } from './sfx.js';
import { say, hush, VOICES, personVoice, voiceSettings, setVoiceOn } from './voice.js';
import { EGGS, isFound, foundCount } from './eastereggs.js';

const $ = (sel) => document.querySelector(sel);

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

const money = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

// ---------------- Toasts ----------------
export function showToast({ msg, kind = 'info' }) {
  const box = $('#toasts');
  const el = h('div', { class: 'toast ' + kind }, msg);
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  const ms = kind === 'event' ? 7500 : kind === 'egg' ? 4200 : 2600;
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 500);
}

// ---------------- Modais ----------------
let modalCount = 0;
export const isModalOpen = () => modalCount > 0;

export function openModal({ title, icon: ic, body, buttons = [], cls = '', dismissable = true, onClose }) {
  const overlay = h('div', { class: 'modal-overlay' });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    modalCount--;
    onClose?.();
  };
  const btns = buttons.map((b) =>
    h('button', {
      class: 'btn ' + (b.kind || ''),
      disabled: b.disabled,
      onClick: () => {
        const r = b.onClick?.();
        if (r !== false) close();
      },
    }, b.label));
  const card = h('div', { class: 'modal ' + cls },
    title ? h('h2', {}, ic ? icon(ic) : null, h('span', {}, title)) : null,
    h('div', { class: 'modal-body' }, body),
    btns.length ? h('div', { class: 'modal-buttons' }, btns) : null);
  overlay.append(card);
  if (dismissable) overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(); });
  $('#modal-root').append(overlay);
  modalCount++;
  return close;
}

// ---------------- Menu de contexto ----------------
export function showContextMenu(x, y, title, items, onPick) {
  const m = $('#ctxmenu');
  m.innerHTML = '';
  if (title) m.append(h('div', { class: 'ctx-title' }, title));
  for (const it of items) {
    if (it.info) { m.append(h('div', { class: 'info' }, it.icon ? icon(it.icon) : null, h('span', {}, it.label))); continue; }
    m.append(h('button', {
      disabled: !!it.reason,
      onClick: () => { hideContextMenu(); onPick(it); },
    }, icon(it.icon), h('span', {}, it.label, it.reason ? h('span', { class: 'reason' }, it.reason) : null)));
  }
  if (!items.length) m.append(h('div', { class: 'info' }, 'Nada a fazer aqui.'));
  m.classList.remove('hidden');
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x - r.width / 2)) + 'px';
  m.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y + 12)) + 'px';
}
export const hideContextMenu = () => $('#ctxmenu').classList.add('hidden');
export const isContextOpen = () => !$('#ctxmenu').classList.contains('hidden');

// ---------------- HUD ----------------
const NEEDS = [
  { key: 'hunger', icon: 'hunger', name: 'Fome' },
  { key: 'thirst', icon: 'thirst', name: 'Sede' },
  { key: 'energy', icon: 'energy', name: 'Energia' },
  { key: 'health', icon: 'health', name: 'Saúde' },
];
const needColor = (v) => (v > 55 ? '#7d9c6a' : v > 25 ? '#c9953b' : '#b8372b');

let needEls = null;
function buildNeeds() {
  const box = $('#needs');
  box.innerHTML = '';
  needEls = {};
  for (const n of [...NEEDS, { key: 'contamination', icon: 'biohazard', name: 'Ar contaminado' }]) {
    const fill = h('div', { class: 'fill' });
    const row = h('div', { class: 'need', title: n.name }, h('span', { class: 'ic' }, icon(n.icon)), h('div', { class: 'bar' }, fill));
    box.append(row);
    needEls[n.key] = { row, fill };
  }
}

const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };

export function updateHud(G) {
  const s = G.s;
  if (!needEls) buildNeeds();
  const day = dayIndex(s.time);
  const clk = $('#clock');
  if (!clk.querySelector('.per')) clk.innerHTML = '<span class="txt"></span><span class="per"><span class="ic"></span><span class="pt"></span></span>';
  setText(clk.querySelector('.txt'), `Dia ${day} · ${clockStr(s.time)} · `);
  const per = periodStr(s.time);
  const pe = clk.querySelector('.per');
  if (pe.dataset.p !== per) {
    pe.dataset.p = per;
    pe.className = 'per ' + periodIcon(s.time);
    pe.querySelector('.ic').innerHTML = iconHTML(periodIcon(s.time));
    pe.querySelector('.pt').textContent = per;
  }
  const cd = $('#countdown');
  const pre = s.time < OUTBREAK_TIME;
  const mode = pre ? 'danger' : 'ok';
  if (cd.dataset.mode !== mode) {
    cd.dataset.mode = mode;
    cd.className = 'chip ' + mode;
    cd.innerHTML = iconHTML(pre ? 'biohazard' : 'home') + '<span></span>';
  }
  setText(cd.lastChild, pre ? `Vírus no ar em ${durationStr(OUTBREAK_TIME - s.time)}` : `Sobrevivendo · ${survivedDays(s)} dia(s)`);
  setText($('#money'), money(s.money));
  for (const n of NEEDS) {
    const v = s.needs[n.key];
    const e = needEls[n.key];
    e.fill.style.width = v + '%';
    e.fill.style.background = needColor(v);
    e.row.classList.toggle('pulse', v < 20);
  }
  const c = needEls.contamination;
  c.row.classList.toggle('hidden', s.time < OUTBREAK_TIME);
  c.fill.style.width = s.needs.contamination + '%';
  c.fill.style.background = '#8e9b3a';
  c.row.classList.toggle('pulse', s.needs.contamination > 40);

  document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('active', +b.dataset.speed === G.speed));
  document.querySelectorAll('#toolbar button').forEach((b) => b.classList.toggle('active', b.dataset.tool === 'build' && G.mode === 'build'));

  updateQueue(G);
  updateStock(G);
  updateLightBtn(G);
  updateFloorChip(G);

  if (G.mode === 'build') updateBuildBar(G);
}

// ---------------- Andar atual ----------------
let floorKey = '';
function updateFloorChip(G) {
  const s = G.s;
  const f = s.player.floor || 'ground';
  const n = Object.keys(s.floors).length;
  const key = f + n;
  if (key === floorKey) return;
  floorKey = key;
  const el = $('#floor-chip');
  el.classList.toggle('hidden', n < 2);
  el.className = 'chip floor ' + f + (n < 2 ? ' hidden' : '');
  el.innerHTML = iconHTML(FLOORS[f].icon) + `<span>${FLOORS[f].name}</span>`;
  el.title = 'Andar atual · use a escada/alçapão para trocar';
}

// ---------------- Luz por cômodo ----------------
let lightMode = '';
function updateLightBtn(G) {
  const s = G.s;
  const btn = $('#light-btn');
  const rooms = allRooms(s);
  const on = rooms.filter((r) => roomWanted(s, r)).length;
  const mode = !hasPower(s) ? 'nopower' : on === rooms.length ? 'on' : on ? 'partial' : 'off';
  const key = mode + on + '/' + rooms.length;
  if (key !== lightMode) {
    lightMode = key;
    btn.className = 'card light-toggle ' + mode;
    btn.querySelector('.ic').innerHTML = iconHTML(mode === 'on' || mode === 'partial' ? 'bulb' : 'bulbOff');
    btn.querySelector('.lbl').textContent = mode === 'nopower' ? 'Sem energia' : mode === 'on' ? 'Luzes acesas' : mode === 'off' ? 'Luzes apagadas' : `Luz ${on}/${rooms.length}`;
  }
  updateAlert(G);
  if (!$('#light-panel').classList.contains('hidden')) renderLightPanel(G);
}

// Atenção dos zumbis (depois do Dia 0)
let alertKey = '';
function attentionText(a) {
  const why = [];
  if (a.leaks.length) why.push(`luz em ${a.leaks.length} janela(s)${a.night < 0.4 ? ' (de dia pesa pouco)' : ''}`);
  if (a.noise > 0.15) why.push('barulho');
  return why.length ? why.join(' · ') : 'casa escura e em silêncio: eles passam direto';
}
function updateAlert(G) {
  const s = G.s;
  const el = $('#alert-chip');
  if (s.time < OUTBREAK_TIME) { el.classList.add('hidden'); alertKey = ''; return; }
  const a = attention(s);
  const lvl = attentionLevel(a);
  const noisy = a.noise > 0.15;
  const key = lvl + noisy + a.leaks.length;
  if (key === alertKey) return;
  alertKey = key;
  el.className = 'card alert-chip ' + lvl;
  el.querySelector('.ic').innerHTML = iconHTML(lvl === 'low' ? 'eyeOff' : 'eye') + (noisy ? iconHTML('ear') : '');
  el.querySelector('.lbl').textContent = lvl === 'low' ? 'Despercebido' : lvl === 'mid' ? 'Chamando atenção' : 'Atraindo a horda!';
  el.title = 'Atenção dos infectados: ' + attentionText(a);
}

export function toggleLightPanel(G) {
  const p = $('#light-panel');
  const show = p.classList.contains('hidden');
  p.classList.toggle('hidden', !show);
  if (show) renderLightPanel(G, true);
}
export const hideLightPanel = () => $('#light-panel').classList.add('hidden');

let panelKey = '';
function renderLightPanel(G, force) {
  const s = G.s;
  const p = $('#light-panel');
  const rooms = allRooms(s);
  const power = hasPower(s);
  const post = s.time >= OUTBREAK_TIME;
  const a = post ? attention(s) : null;
  const key = rooms.map((r) => r.key + roomWanted(s, r)).join() + power + (a ? attentionLevel(a) + a.leaks.length + (a.noise > 0.15) : '');
  if (!force && key === panelKey) return;
  panelKey = key;
  p.innerHTML = '';
  p.append(h('div', { class: 'lp-head' }, icon('bulb'), h('b', {}, 'Luz dos cômodos'),
    h('button', { class: 'lp-x', title: 'Fechar', onClick: hideLightPanel }, icon('cancel'))));
  if (!power) p.append(h('div', { class: 'warn red' }, 'Sem energia: a casa está no escuro.'));
  if (a) p.append(h('div', { class: 'lp-att ' + attentionLevel(a) }, icon(attentionLevel(a) === 'low' ? 'eyeOff' : 'eye'), h('span', {}, attentionText(a))));
  else p.append(h('div', { class: 'lp-tip' }, 'Depois do Dia 0, luz nas janelas e barulho atraem os infectados.'));
  const floors = [...new Set(rooms.map((r) => r.floor))];
  for (const f of floors) {
    if (floors.length > 1) p.append(h('div', { class: 'lp-floor' }, FLOORS[f].name));
    for (const r of rooms.filter((q) => q.floor === f)) {
      const on = roomWanted(s, r);
      p.append(h('button', {
        class: 'lp-row' + (on ? ' on' : ''), disabled: !power,
        onClick: () => { setRoomLight(s, r, !on); renderLightPanel(G, true); updateLightBtn(G); },
      },
      h('span', { class: 'lp-name' }, r.name),
      r.windows.length ? h('span', { class: 'lp-win', title: 'Janelas para fora: a luz vaza' }, icon('window'), String(r.windows.length)) : null,
      h('span', { class: 'lp-sw' }, h('span', { class: 'knob' }))));
    }
  }
  p.append(h('div', { class: 'lp-all' },
    h('button', { class: 'btn', disabled: !power, onClick: () => { setAllLights(s, false); renderLightPanel(G, true); updateLightBtn(G); } }, 'Apagar tudo'),
    h('button', { class: 'btn', disabled: !power, onClick: () => { setAllLights(s, true); renderLightPanel(G, true); updateLightBtn(G); } }, 'Acender tudo')));
}

// ---------------- Dica ao passar o mouse ----------------
export function setHoverTip(text, x, y) {
  const tip = $('#hover-tip');
  if (!text) { tip.classList.add('hidden'); return; }
  if (tip.textContent !== text) tip.textContent = text;
  tip.classList.remove('hidden');
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px';
  tip.style.top = Math.max(8, y - r.height - 10) + 'px';
}

// ---------------- Estoque sempre visível ----------------
const STOCK_ORDER = ['comida', 'agua', 'sementes', 'kitMedico', null, 'madeira', 'tijolo', 'metal', 'vedacao', null, 'reagentes', 'amostra'];
let stockEls = null;
const lastStock = {};

function updateStock(G) {
  const s = G.s;
  const box = $('#stock');
  if (!stockEls) {
    stockEls = {};
    box.innerHTML = '';
    box.addEventListener('click', () => showInventory(G));
    for (const r of STOCK_ORDER) {
      if (!r) { box.append(h('div', { class: 'stk-sep' })); continue; }
      const num = h('span', {}, '0');
      const el = h('div', { class: 'stk', title: RESOURCES[r].name }, icon(RESOURCES[r].icon), num);
      box.append(el);
      stockEls[r] = { el, num };
    }
  }
  for (const r of STOCK_ORDER) {
    if (!r) continue;
    const v = s.stock[r] || 0;
    const { el, num } = stockEls[r];
    if (lastStock[r] !== v) {
      if (lastStock[r] !== undefined) {
        el.classList.remove('up', 'down');
        void el.offsetWidth; // reinicia a animação
        el.classList.add(v > lastStock[r] ? 'up' : 'down');
      }
      lastStock[r] = v;
      num.textContent = v;
      el.classList.toggle('zero', v === 0);
    }
  }
}

// ---------------- Fila de tarefas ----------------
function taskLabel(s, t) {
  const A = ACTIONS[t.act];
  if (t.act === 'build') {
    const b = pendingBuild(s, t.target);
    if (b === 'dig') return 'Escavar';
    return `Construir ${b ? BUILD[b].name.toLowerCase() : ''}`;
  }
  if (t.act === 'goto') return 'Andar';
  return A.label.replace(/ \(.*\)$/, '');
}

function updateQueue(G) {
  const s = G.s;
  const box = $('#task');
  const p = s.player;
  const cur = p.task;
  if (!cur && !p.queue.length) { box.classList.add('hidden'); box.dataset.key = ''; return; }
  box.classList.remove('hidden');
  const key = [cur ? cur.id + cur.phase + (cur.dark ? 'd' : '') : '-', ...p.queue.map((q) => q.id)].join('|');
  if (box.dataset.key !== key) {
    box.dataset.key = key;
    box.innerHTML = '';
    if (cur) {
      const A = ACTIONS[cur.act];
      box.append(h('div', { class: 'q-item current' },
        h('span', { class: 'q-ic' }, icon(A.icon)),
        h('div', { class: 'q-main' },
          h('div', { class: 'q-label' }, taskLabel(s, cur) + (cur.phase === 'walk' ? '…' : ''), cur.dark ? h('span', { class: 'q-dark' }, ' · no escuro') : null),
          h('div', { class: 'q-bar' }, h('div', { class: 'q-fill' }))),
        h('button', { class: 'q-x', title: 'Cancelar', onClick: () => G.cancelCurrent() }, icon('cancel'))));
    }
    p.queue.forEach((q, i) => {
      box.append(h('div', { class: 'q-item' },
        h('span', { class: 'q-n' }, String(i + 1)),
        h('span', { class: 'q-ic' }, icon(ACTIONS[q.act].icon)),
        h('div', { class: 'q-main' }, h('div', { class: 'q-label' }, taskLabel(s, q))),
        h('button', { class: 'q-x', title: 'Remover da fila', onClick: () => G.cancelQueued(q.id) }, icon('cancel'))));
    });
  }
  const fill = box.querySelector('.q-fill');
  if (fill) {
    const pr = taskProgress(s);
    fill.style.width = (pr == null ? 0 : pr * 100) + '%';
  }
}

// ---------------- Barra de construção ----------------
let bbBuilt = '';
export function showBuildBar(G, show) {
  const bar = $('#build-bar');
  bar.classList.toggle('hidden', !show);
  document.body.classList.toggle('building', show);
  const f = G.s.player.floor || 'ground';
  if (show && bbBuilt !== f) {
    bbBuilt = f;
    if (G.buildSel && G.buildSel !== 'demolish' && !BUILD[G.buildSel].floors.includes(f)) G.buildSel = null;
    bar.innerHTML = '';
    const items = h('div', { class: 'bb-items' });
    for (const [id, B] of Object.entries(BUILD)) {
      if (!B.floors.includes(f)) continue;
      items.append(h('button', { class: 'bb-item', 'data-id': id, onClick: () => { G.buildSel = id; updateBuildBar(G, true); } },
        icon(B.icon, 'em'), h('span', { class: 'nm' }, B.name), h('div', { class: 'cost', html: costHTML(B.cost) })));
    }
    items.append(h('button', { class: 'bb-item demolish', 'data-id': 'demolish', onClick: () => { G.buildSel = 'demolish'; updateBuildBar(G, true); } },
      icon('trash', 'em'), h('span', { class: 'nm' }, 'Demolir'), h('div', { class: 'cost' }, 'devolve 50%')));
    bar.append(items, h('div', { class: 'bb-info' }));
  }
  if (show) updateBuildBar(G, true);
}

let lastBB = '';
function updateBuildBar(G, force) {
  const s = G.s;
  const key = G.buildSel + JSON.stringify(s.stock);
  if (!force && key === lastBB) return;
  lastBB = key;
  document.querySelectorAll('.bb-item').forEach((el) => {
    const id = el.dataset.id;
    el.classList.toggle('sel', id === G.buildSel);
    if (BUILD[id]) el.classList.toggle('cant', missingFor(s, BUILD[id].cost).length > 0);
  });
  const info = $('.bb-info');
  if (!info) return;
  if (G.buildSel === 'demolish') info.innerHTML = '<b>Demolir:</b> toque numa obra, parede ou objeto para remover.';
  else if (G.buildSel) {
    const B = BUILD[G.buildSel];
    const miss = missingFor(s, B.cost);
    info.innerHTML = `<b>${B.name}</b> · ${durationStr(B.time)} de trabalho · ${B.desc}` + (miss.length ? ` <span class="miss">Falta: ${miss.join(', ')}</span>` : '');
  } else info.textContent = `${FLOORS[s.player.floor || 'ground'].name}: escolha o que construir. Materiais na Loja de Construção (botão Compras).`;
}

// ---------------- Notícias ----------------
export const DOCTOR_SVG = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <defs><clipPath id="dr-c"><circle cx="24" cy="24" r="24"/></clipPath></defs>
  <g clip-path="url(#dr-c)">
  <circle cx="24" cy="24" r="24" fill="#2a3140"/>
  <path d="M5 50c0-9 7-14 19-14s19 5 19 14z" fill="#d6a03c"/>
  <path d="M5 50c0-6 2-10 6-12l3 12z" fill="#b4852f"/>
  <path d="M43 50c0-6-2-10-6-12l-3 12z" fill="#b4852f"/>
  <path d="M18 36.5h12L24 48z" fill="#d6e4ef"/>
  <path d="M18 36.5l6 3.2-3.4 3.6zM30 36.5l-6 3.2 3.4 3.6z" fill="#f4f8fb"/>
  <path d="M17.6 36.4L24 48M30.4 36.4L24 48" stroke="#e8bb5c" stroke-width="1.2"/>
  <circle cx="24" cy="45.5" r="0.9" fill="#6b4a2a"/>
  <path d="M21 31h6v6.5h-6z" fill="#cf9f74"/>
  <ellipse cx="13.6" cy="23.5" rx="2.4" ry="3.2" fill="#d9a77e"/>
  <ellipse cx="34.4" cy="23.5" rx="2.4" ry="3.2" fill="#d9a77e"/>
  <ellipse cx="24" cy="21.5" rx="10.2" ry="11.6" fill="#d9a77e"/>
  <ellipse cx="24.6" cy="20.6" rx="9" ry="10.6" fill="#e8b98a"/>
  <ellipse cx="22" cy="12.6" rx="4" ry="1.8" fill="#fff" opacity=".45"/>
  <path d="M13.4 22.8c-1.6-3.4-.6-7 1.4-8.4.4 2 1.6 2.6 1.6 2.6-.6 1.8-.4 4.2.2 6.2-1.3-.4-2.5-.4-3.2-.4z" fill="#e6e7ea"/>
  <path d="M34.6 22.8c1.6-3.4.6-7-1.4-8.4-.4 2-1.6 2.6-1.6 2.6.6 1.8.4 4.2-.2 6.2 1.3-.4 2.5-.4 3.2-.4z" fill="#e6e7ea"/>
  <path d="M12.2 19.5c-1.2-1.6-.6-3.6.6-4.6M35.8 19.5c1.2-1.6.6-3.6-.6-4.6" stroke="#c4c6cc" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M17.2 17.6q2.6-1.6 5 .2M25.8 17.8q2.4-1.8 5-.2" stroke="#b9bcc2" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="20.2" cy="21.5" r="3.4" fill="#cfe6f5" opacity=".4"/>
  <circle cx="27.8" cy="21.5" r="3.4" fill="#cfe6f5" opacity=".4"/>
  <circle cx="20.4" cy="21.7" r="1.1" fill="#2b2622"/>
  <circle cx="27.6" cy="21.7" r="1.1" fill="#2b2622"/>
  <circle cx="20.2" cy="21.5" r="3.4" fill="none" stroke="#5a4232" stroke-width="0.9"/>
  <circle cx="27.8" cy="21.5" r="3.4" fill="none" stroke="#5a4232" stroke-width="0.9"/>
  <path d="M23.6 21.2q.4-.6.8 0M16.8 21l-2.6-.6M31.2 21l2.6-.6" stroke="#5a4232" stroke-width="0.9" fill="none"/>
  <path d="M18.6 20.2l1.2-1.1" stroke="#fff" stroke-width=".6" stroke-linecap="round"/>
  <path d="M23 22.4c-.6 2.2-1.6 3.8-.4 4.6.8.5 2 .5 2.8 0 1.2-.8.2-2.4-.4-4.6z" fill="#d9a77e"/>
  <path d="M24 28.4c-1.4-1.4-4.4-1.6-6 .4-.6.8-.4 2.2.6 2 1.6-.4 3-1 5.4-.8 2.4-.2 3.8.4 5.4.8 1 .2 1.2-1.2.6-2-1.6-2-4.6-1.8-6-.4z" fill="#e6e7ea"/>
  <path d="M21.4 31.6q2.6 1.4 5.2 0" stroke="#8a5a45" stroke-width="1" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

function costHTML(cost) {
  return Object.entries(cost).map(([r, n]) => `<span class="c">${iconHTML(RESOURCES[r].icon)}${n}</span>`).join('');
}

// Ícones fixos do HTML (barra de ferramentas, velocidade, título)
export function initStaticIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = iconHTML(el.dataset.icon); });
}

// ---------------- Notícias ----------------
export function showNews(G, day, onClose) {
  const s = G.s;
  const n = NEWS[day] || POST_NEWS[Math.abs(day) % POST_NEWS.length];
  const body = h('div', {},
    buildTV(n, day, s.time),
    h('div', { class: 'news-thought' }, h('span', { class: 'av', html: DOCTOR_SVG }), h('div', {}, n.thought)));
  s.flags.newsSeen = Math.max(s.flags.newsSeen, day);
  // a apresentadora lê a manchete; depois o Dr. pensa alto
  say(`${n.headline}. ${n.body}`, day > 0 ? VOICES.radio : VOICES.anchor).then((ok) => ok && say(n.thought, VOICES.doctor, { queue: true }));
  openModal({ body, cls: 'news', buttons: [{ label: 'Desligar a TV', kind: 'primary' }], onClose: () => { hush(); onClose?.(); } });
}

// ---------------- Viagem / Lojas ----------------
export function showTravel(G) {
  const s = G.s;
  if (s.time >= OUTBREAK_TIME) {
    openModal({
      title: 'Sair de casa?',
      icon: 'warning',
      cls: 'grim',
      body: h('div', {}, h('div', { class: 'warn red' }, 'O vírus está no ar. Qualquer pessoa que sair vira zumbi em minutos. Não há máscara que segure.'), h('p', {}, 'Tem certeza?')),
      buttons: [
        { label: 'Ficar em casa', kind: 'primary' },
        { label: 'Sair mesmo assim', kind: 'danger', onClick: () => G.leaveAfterOutbreak() },
      ],
    });
    return;
  }
  const closed = shopsStatus(s);
  const mult = priceMult(s);
  const body = h('div', {},
    closed ? h('div', { class: 'warn red' }, closed) : null,
    mult > 1.001 ? h('div', { class: 'warn' }, `Pânico na cidade: preços +${Math.round((mult - 1) * 100)}%`) : null,
    s.ev?.promo && !closed ? h('div', { class: 'warn good' }, `Promoção hoje: ${SHOPS[s.ev.promo.shop].name} com 25% de desconto`) : null,
    h('div', { class: 'dest' },
      Object.entries(SHOPS).map(([id, sh]) =>
        h('button', { disabled: !!closed, onClick: () => { close(); showShop(G, id); } },
          icon(sh.icon, 'em'),
          h('div', {}, h('b', {}, sh.name), h('br'), h('small', {}, `${sh.desc} · ida e volta ${TRIP_MINUTES / 60}h`))))));
  const close = openModal({ title: 'Para onde?', icon: 'car', body, buttons: [{ label: 'Ficar em casa' }] });
}

export function showShop(G, shopId) {
  const s = G.s;
  const shop = SHOPS[shopId];
  const mult = priceMult(s) * promoMult(s, shopId);
  const cart = {};
  const totalEl = h('span');
  const leftEl = h('span');
  const price = (it) => Math.round(it.price * mult);
  const total = () => shop.items.reduce((t, it) => t + (cart[it.id] || 0) * price(it), 0);
  let buyBtn;
  const refresh = () => {
    const t = total();
    totalEl.textContent = money(t);
    leftEl.textContent = 'Saldo após: ' + money(s.money - t);
    leftEl.className = s.money - t < 0 ? 'over' : '';
    if (buyBtn) buyBtn.disabled = t <= 0 || t > s.money;
  };
  const rows = shop.items.map((it) => {
    const qty = h('span', {}, '0');
    const set = (v) => {
      v = Math.max(0, v);
      cart[it.id] = v;
      qty.textContent = v;
      refresh();
    };
    return h('div', { class: 'shop-row' },
      icon(it.icon, 'em'),
      h('div', { class: 'info' }, h('b', {}, it.name), h('small', {}, it.desc), h('div', { class: 'price' }, money(price(it)))),
      h('div', { class: 'stepper' },
        h('button', { onClick: () => set((cart[it.id] || 0) - 1) }, '−'),
        qty,
        h('button', { onClick: () => set((cart[it.id] || 0) + 1) }, '+'),
        h('button', { onClick: () => set((cart[it.id] || 0) + 5), title: '+5' }, '⁺⁵')));
  });
  const body = h('div', {},
    h('div', { class: 'shop-list' }, rows),
    h('div', { class: 'shop-total' }, h('span', {}, 'Total: ', totalEl), leftEl));
  const close = openModal({
    title: shop.name,
    icon: shop.icon,
    body,
    buttons: [
      { label: 'Voltar', onClick: () => { setTimeout(() => showTravel(G), 0); } },
      {
        label: `Comprar e voltar (${TRIP_MINUTES / 60}h)`, kind: 'primary',
        onClick: () => {
          const t = total();
          if (t <= 0 || t > s.money) return false;
          const gained = {};
          for (const it of shop.items) {
            const n = cart[it.id] || 0;
            for (const [r, v] of Object.entries(it.gives)) gained[r] = (gained[r] || 0) + v * n;
          }
          G.doTrip(shop, t, gained);
        },
      },
    ],
  });
  buyBtn = document.querySelector('.modal-overlay:last-child .btn.primary');
  refresh();
}

export function travelOverlay(text, ms, mid) {
  return new Promise((res) => {
    const el = h('div', { class: 'overlay-travel' }, h('div', { class: 'car' }, icon('car')), h('div', {}, text));
    document.body.append(el);
    modalCount++;
    setTimeout(() => { mid?.(); }, ms / 2);
    setTimeout(() => { el.remove(); modalCount--; res(); }, ms);
  });
}

// ---------------- Estoque ----------------
export function showInventory(G) {
  const s = G.s;
  const st = s.stock;
  const foodDays = (st.comida * MEAL) / (RATES.hunger * 24);
  const waterDays = (st.agua * DRINK) / (RATES.thirst * 24);
  const cell = (r) => h('div', { class: 'inv-cell' }, icon(RESOURCES[r].icon, 'em'), h('b', {}, st[r] || 0), h('small', {}, RESOURCES[r].name));
  const body = h('div', {},
    h('div', { class: 'inv-sub' }, 'Suprimentos'),
    h('div', { class: 'inv-grid' }, ['comida', 'agua', 'sementes', 'kitMedico'].map(cell)),
    h('p', { class: 'inv-note' },
      `Comida para ~${foodDays.toFixed(1)} dias · Água para ~${waterDays.toFixed(1)} dias` +
      (hasTapWater(s) ? ' (a torneira ainda funciona)' : '') + (countBuilt(s, 'cistern') ? ' + cisterna' : '')),
    h('div', { class: 'inv-sub' }, 'Materiais'),
    h('div', { class: 'inv-grid' }, ['madeira', 'tijolo', 'metal', 'vedacao'].map(cell)),
    h('div', { class: 'inv-sub' }, 'Laboratório'),
    h('div', { class: 'inv-grid' }, ['reagentes', 'amostra'].map(cell)),
    researchBox(s));
  openModal({
    title: 'Estoque',
    icon: 'box',
    body,
    buttons: [
      { label: 'Usar kit médico (+40 saúde)', disabled: !(st.kitMedico > 0) || s.needs.health >= 100, onClick: () => { st.kitMedico--; s.needs.health = Math.min(100, s.needs.health + 40); } },
      { label: 'Fechar', kind: 'primary' },
    ],
  });
}

// ---------------- Pesquisa ----------------
function researchBox(s) {
  const ri = researchInfo(s);
  const hasLab = countBuilt(s, 'lab') > 0;
  return h('div', { class: 'research' },
    h('div', { class: 'r-head' }, h('b', {}, 'Pesquisa da cura'), h('span', {}, Math.round(ri.pts) + '%')),
    h('div', { class: 'r-bar' }, RESEARCH.phases.map((ph, i) => {
      const from = i ? RESEARCH.phases[i - 1].to : 0;
      const f = Math.max(0, Math.min(1, (ri.pts - from) / (ph.to - from)));
      return h('div', { class: 'r-seg', style: `flex:${ph.to - from}` }, h('div', { class: 'r-fill', style: `width:${f * 100}%` }));
    })),
    h('small', {}, hasLab
      ? `Fase ${ri.idx + 1}: ${ri.phase.name}. ${ri.locked ? ri.phase.desc : 'Cada sessão de 4h gasta 1 reagente.'}`
      : 'Construa um laboratório (precisa de energia e reagentes da Distribuidora Hospitalar).'));
}

// ---------------- Plano ----------------
export function showPlan(G) {
  const s = G.s;
  const seal = sealStatus(s);
  const st = s.stock;
  const planted = Object.entries(s.floors).some(([f, fl]) => onFloor(s, f, () => fl.objects.some((o) => o.type === 'planter' && o.built && isIndoor(s, o.x, o.y) && o.data.stage !== 'empty')));
  const ext = Object.entries(s.floors.ground.walls).filter(([k, w]) => isExteriorOpening(s, k, w));
  const reinforced = ext.filter(([, w]) => w.rf >= 1).length;
  const broken = Object.values(s.floors.ground.walls).filter((w) => w.broken).length;
  const ri = researchInfo(s);
  const total = seal.openings.length;
  const goals = [
    { ok: seal.breaches.length === 0, t: 'Casa sem buracos', d: seal.breaches.length ? `${seal.breaches.length} trecho(s) sem parede (linha vermelha no chão)` : 'Todas as bordas da casa têm parede.' },
    { ok: seal.unsealed.length === 0, t: 'Vedar janelas e portas', d: `${total - seal.unsealed.length}/${total} vedadas · kits na Loja de Construção. Toque numa janela para vedar.` },
    { ok: st.comida >= 15, t: 'Comida para 2 semanas', d: `${st.comida}/15 porções` },
    { ok: st.agua >= 15 || countBuilt(s, 'cistern') > 0, t: 'Água garantida', d: `${st.agua} porções${countBuilt(s, 'cistern') ? ' + cisterna' : ' · a água encanada para no Dia 2'}` },
    { ok: countBuilt(s, 'solar') > 0, t: 'Energia própria', d: 'A rede cai no Dia 1. Painel solar mantém filtro e TV.' },
    { ok: countBuilt(s, 'filter') > 0, t: 'Filtro de ar', d: 'Limpa o ar que entra pelas frestas (precisa de energia).' },
    { ok: planted, t: 'Horta dentro de casa', d: 'Canteiros do lado de fora ficam inacessíveis após o Dia 0.' },
    { ok: ext.length > 0 && reinforced === ext.length && !broken, t: 'Reforçar portas e janelas', d: broken ? `${broken} abertura(s) ARROMBADA(S): reconstrua já!` : `${reinforced}/${ext.length} reforçadas. Depois do Dia 0 os zumbis forçam as mais fracas.` },
    { ok: !!s.floors.attic || !!s.floors.bunker, t: 'Ter para onde fugir', d: 'Zumbis não sobem escadas: sótão ou bunker são o último refúgio.' },
    { ok: ri.done, t: 'Objetivo final: a cura', d: countBuilt(s, 'lab') ? `${Math.round(ri.pts)}% · fase ${ri.idx + 1}: ${ri.phase.name}${ri.locked ? ' · precisa de amostra viral: colete o ar numa janela ou abata um invasor' : ''}` : 'Monte um laboratório e pesquise. Você foi o maior cientista da sua geração.' },
  ];
  let extra = null;
  if (s.time >= OUTBREAK_TIME) {
    const c = contaminationRate(s);
    extra = h('div', { class: c.rate > 0 ? 'warn red' : 'warn' }, c.rate > 0 ? `O ar contaminado está entrando: +${c.rate.toFixed(1)}%/h` : 'O ar interno está sob controle.');
  }
  openModal({
    title: 'Plano de sobrevivência',
    icon: 'plan',
    body: h('div', {}, extra, h('ul', { class: 'plan' }, goals.map((g) =>
      h('li', { class: g.ok ? 'ok' : '' }, h('span', { class: 'ck' }, icon(g.ok ? 'check' : 'square')), h('div', {}, h('b', {}, g.t), h('small', {}, g.d)))))),
    buttons: [{ label: 'Fechar', kind: 'primary' }],
  });
}

// ---------------- Menu ----------------
export function showMenu(G) {
  const seg = h('div', { class: 'seg' });
  const modes = [['cutaway', 'Cortadas'], ['up', 'Altas'], ['down', 'Baixas']];
  const paint = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.m === G.wallMode));
  for (const [m, l] of modes) seg.append(h('button', { 'data-m': m, onClick: () => { G.wallMode = m; paint(); } }, l));
  paint();
  // som: mudo + volume
  const A = audioSettings();
  const muteBtn = h('button', { class: 'btn snd-mute', title: 'Ligar/desligar o som (tecla M)' });
  const paintMute = () => { const m = audioSettings().mute; muteBtn.innerHTML = iconHTML(m ? 'mute' : 'speaker') + (m ? 'Sem som' : 'Som ligado'); muteBtn.classList.toggle('off', m); };
  muteBtn.addEventListener('click', () => { setMute(!audioSettings().mute); paintMute(); });
  paintMute();
  const vol = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(A.vol * 100)), class: 'snd-vol', 'aria-label': 'Volume' });
  vol.addEventListener('input', () => { setVolume(vol.value / 100); if (audioSettings().mute) { setMute(false); paintMute(); } });
  vol.addEventListener('change', () => play('good'));
  const VS = voiceSettings();
  const voiceBtn = h('button', { class: 'btn snd-mute', disabled: !VS.available, title: VS.available ? 'Narração e vozes dos personagens' : 'Este aparelho não tem vozes em português instaladas' });
  const paintVoice = () => { const on = voiceSettings().on && VS.available; voiceBtn.innerHTML = iconHTML(on ? 'speaker' : 'mute') + (VS.available ? (on ? 'Vozes ligadas' : 'Vozes desligadas') : 'Sem vozes em português'); voiceBtn.classList.toggle('off', !on); };
  voiceBtn.addEventListener('click', () => { setVoiceOn(!voiceSettings().on); paintVoice(); if (voiceSettings().on) say('Vozes ligadas.', VOICES.doctor); });
  paintVoice();
  const body = h('div', {},
    h('b', {}, 'Paredes'), seg,
    h('b', { class: 'snd-label' }, 'Som'), h('div', { class: 'snd-row' }, muteBtn, vol), h('div', { class: 'snd-row' }, voiceBtn),
    h('div', { class: 'menu-list' },
      h('button', { class: 'btn', onClick: () => { G.saveNow(true); } }, icon('save'), 'Salvar agora'),
      h('button', { class: 'btn', onClick: () => { close(); showSecrets(); } }, icon('eye'), `Segredos (${foundCount()}/${EGGS.length})`),
      h('button', { class: 'btn', onClick: () => { close(); openModal({ title: 'Como jogar', icon: 'help', cls: 'help-modal', body: h('div', { html: HELP_HTML }), buttons: [{ label: 'OK', kind: 'primary' }] }); } }, icon('help'), 'Como jogar'),
      h('button', { class: 'btn danger', onClick: () => { close(); confirmNew(G); } }, icon('reset'), 'Novo jogo')));
  const close = openModal({ title: 'Menu', icon: 'menu', body, buttons: [{ label: 'Fechar', kind: 'primary' }] });
}

// ---------------- Segredos ----------------
function showSecrets() {
  const n = foundCount();
  openModal({
    title: `Segredos · ${n}/${EGGS.length}`,
    icon: 'eye',
    cls: 'secrets-modal',
    body: h('div', {},
      h('p', { class: 'secrets-intro' }, n === EGGS.length ? 'Você achou todos. O Dr. está orgulhoso (e um pouco preocupado com o seu tempo livre).' : 'Referências escondidas pela casa, pela TV, pelo rádio e no teclado. Os achados valem para todas as partidas.'),
      h('ul', { class: 'secrets' }, EGGS.map((e) => {
        const ok = isFound(e.id);
        return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'ck' }, icon(ok ? 'check' : 'square')),
          h('div', {}, h('b', {}, ok ? e.title : '???'), h('small', {}, ok ? e.desc : 'Dica: ' + e.hint)));
      }))),
    buttons: [{ label: 'Fechar', kind: 'primary' }],
  });
}

export function showEggStory(G, st) {
  say(st.paras.join(' '), st.icon === 'radio' ? VOICES.radio : VOICES.narrator);
  openModal({
    onClose: hush,
    title: st.title,
    icon: st.icon,
    body: h('div', {}, st.paras.map((p) => h('p', {}, p))),
    buttons: [{ label: st.button || 'OK', kind: 'primary' }],
  });
}

function confirmNew(G) {
  openModal({
    title: 'Começar de novo?',
    body: h('p', {}, 'O progresso atual será perdido.'),
    buttons: [{ label: 'Cancelar' }, { label: 'Novo jogo', kind: 'danger', onClick: () => G.newGame() }],
  });
}

// ---------------- Fim de jogo ----------------
export function showGameOver(G, go) {
  const win = go.reason === 'cure';
  say(`${go.title}. ${go.text}`, VOICES.narrator);
  openModal({
    title: go.title,
    icon: win ? 'flask' : 'biohazard',
    cls: win ? 'win' : 'grim',
    dismissable: false,
    body: h('div', {}, h('p', {}, go.text), win ? h('p', {}, h('i', {}, 'E o Brasil, finalmente, ganha o seu primeiro Prêmio Nobel.')) : null, h('p', {}, h('b', {}, win ? `Cura encontrada ${go.days} dia(s) depois do Dia 0.` : `Dias sobrevividos após o Dia 0: ${go.days}`))),
    buttons: [{ label: 'Novo jogo', kind: 'primary', onClick: () => G.newGame() }],
  });
}

export function showOutbreak(G) {
  const seal = sealStatus(G.s);
  const ok = seal.breaches.length === 0 && seal.unsealed.length === 0;
  say('Um silêncio estranho toma a rua. Depois, os gritos. Tudo lá fora agora é contaminado. ' + (ok ? 'A casa está vedada. Por enquanto, o ar aqui dentro está limpo.' : 'A casa tem frestas. O ar contaminado vai entrar.'), VOICES.narrator);
  openModal({
    onClose: hush,
    title: 'Dia 0 — O vírus chegou',
    icon: 'biohazard',
    cls: 'grim',
    body: h('div', {},
      h('p', {}, 'Um silêncio estranho toma a rua. Depois, os gritos. Tudo lá fora agora é contaminado.'),
      h('div', { class: ok ? 'warn' : 'warn red' }, ok ? 'A casa está vedada. Por enquanto, o ar aqui dentro está limpo.' : `Atenção: ${seal.breaches.length} buraco(s) e ${seal.unsealed.length} abertura(s) sem vedação. O ar contaminado vai entrar!`),
      h('p', {}, 'A partir de agora: sobreviva com o que você construiu.')),
    buttons: [{ label: 'Sobreviver', kind: 'primary' }],
  });
}

export function showStory(G, id) {
  if (id === 'notes') {
    say('Embaixo de tábuas e jornais velhos: seus cadernos do instituto.', VOICES.narrator)
      .then((ok) => ok && say('Se um dia aparecer um vírus assim, a resposta está na fase de incubação.', VOICES.doctor, { queue: true }));
    openModal({
      onClose: hush,
      title: 'Cadernos de 1996',
      icon: 'plan',
      body: h('div', {},
        h('p', {}, 'Embaixo de tábuas e jornais velhos: seus cadernos do instituto. Modelos de transmissão aérea, rascunhos de uma vacina que ninguém quis financiar.'),
        h('p', {}, h('i', {}, '"Se um dia aparecer um vírus assim, a resposta está na fase de incubação."')),
        h('div', { class: 'warn' }, '+10% na pesquisa da cura · +3 madeira · +1 metal')),
      buttons: [{ label: 'Guardar os cadernos', kind: 'primary' }],
    });
  }
}

// ---------------- Casa de um vizinho ----------------
export function portrait(c) {
  const cv = document.createElement('canvas');
  cv.width = 112; cv.height = 136;
  cv.className = 'portrait';
  const ctx = cv.getContext('2d');
  setTint(0);
  ctx.scale(2, 2);
  // retrato do peito para cima
  ctx.translate(26, 96);
  ctx.scale(1.75, 1.75);
  drawPerson(ctx, 0, 0, { look: c.zombie ? zombieLook(c) : citizenLook(c), zombie: c.zombie, time: 1000, seed: c.id, noBubble: true });
  return cv;
}

function ageLabel(c) {
  const L = citizenLook(c);
  const f = L.body === 'f';
  if ((L.age || 0) >= 0.8) return f ? 'idosa' : 'idoso';
  if (c.persona === 'estudante') return 'jovem';
  return f ? 'adulta' : 'adulto';
}

function residentStatus(s, c) {
  if (c.zombie) return { t: 'Infectado. Vaga pela cidade.', cls: 'bad' };
  if (c.emergeAt != null) return { t: 'Sem notícias desde o Dia 0.', cls: 'warn' };
  const a = c.activity || 'em casa';
  return { t: a[0].toUpperCase() + a.slice(1), cls: c.at === c.home && c.state === 'inside' ? 'home' : '' };
}

export function showHome(G, b) {
  const s = G.s;
  const info = homeInfo(b);
  const res = residentsOf(s, b);
  const st = b.house || {};
  const kind = `${st.floors === 2 ? 'Sobrado' : 'Casa térrea'}${st.garage ? ' com garagem' : ''}`;
  const post = s.time >= OUTBREAK_TIME;
  const atHome = res.filter((c) => !c.zombie && c.state === 'inside' && c.at === c.home).length;
  const status = post
    ? (res.every((c) => c.zombie) ? 'A casa está às escuras. Ninguém mais responde ali.' : 'Silêncio total. Talvez alguém ainda esteja lá dentro.')
    : `Em casa agora: ${atHome} de ${res.length}.`;
  let close;
  const locate = (c) => {
    const spot = c.state === 'inside' && c.at ? c.at.door : { x: c.px, y: c.py };
    close(); G.focusOn(spot.x, spot.y);
  };
  const body = h('div', { class: 'home-info' },
    h('div', { class: 'hi-addr' }, icon('home'), h('span', {}, info.address), h('small', {}, ` · ${kind} · ${info.distance}`)),
    h('p', { class: 'hi-rel' }, info.relation),
    h('div', { class: post ? 'warn red' : 'warn' }, status),
    h('div', { class: 'inv-sub' }, `Moradores (${res.length})`),
    h('div', { class: 'hi-res' }, res.map((c) => {
      const stt = residentStatus(s, c);
      return h('div', { class: 'hi-person' + (c.zombie ? ' z' : '') },
        portrait(c),
        h('div', { class: 'hi-pinfo' },
          h('b', {}, `${c.name} ${info.surname}`),
          h('small', { class: 'hi-meta' }, `${ageLabel(c)} · ${c.zombie ? 'já não é mais quem era' : residentProfile(c)}`),
          h('div', { class: 'hi-status ' + stt.cls }, stt.t),
          h('button', { class: 'btn hi-loc', onClick: () => locate(c) }, icon('walk'), 'Localizar')));
    })));
  close = openModal({ title: homeName(b), icon: 'home', body, buttons: [{ label: 'Fechar', kind: 'primary' }] });
}

// ---------------- Estabelecimento ----------------
const STAFF_SHIRTS = ['#e8ecf2', '#9db4d4', '#f2c94c', '#d98cb3', '#9fc5a8', '#c98a6a', '#7a8fb0'];
const STAFF_SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a86b3c'];
const STAFF_HAIRS = ['#3b2a20', '#1d1d1d', '#a0522d', '#c9ccd3', '#6b4423'];
function fakePerson(b, k, fullName, persona) {
  const r = (n) => Math.abs(Math.sin(b.x * 12.9 + b.y * 78.2 + k * 37.7 + n)) * 1000 % 1;
  return {
    id: `p${b.x},${b.y},${k}`, name: fullName.split(' ')[0].replace(/"/g, ''), persona,
    shirt: STAFF_SHIRTS[Math.floor(r(1) * STAFF_SHIRTS.length)], pants: '#3a3f55',
    skin: STAFF_SKINS[Math.floor(r(2) * STAFF_SKINS.length)], hair: STAFF_HAIRS[Math.floor(r(3) * STAFF_HAIRS.length)],
  };
}

export function showPlace(G, b) {
  const s = G.s;
  const P = placeInfo(b);
  const post = s.time >= OUTBREAK_TIME;
  const open = isOpenAt(b, minuteOfDay(s.time));
  let status, cls = 'warn';
  if (post) { status = 'Abandonado. Vitrines quebradas e ninguém lá dentro — só eles.'; cls = 'warn red'; }
  else if (dayIndex(s.time) >= 0) { status = 'Fechado: saques e pânico na cidade.'; cls = 'warn red'; }
  else if (!open) status = `Fechado agora · abre ${hoursStr(b)}`;
  else if ((b.role === 'mercado' || b.role === 'farmacia') && dread(s) > 0.45) status = 'Aberto, mas com fila na porta e prateleiras quase vazias.';
  else status = `Aberto agora · ${hoursStr(b)}`;
  const inside = post ? [] : peopleInside(s, b);
  const regulars = regularsOf(s, b);
  let close;
  const locate = (c) => {
    const spot = c.state === 'inside' && c.at ? c.at.door : { x: c.px, y: c.py };
    close(); G.focusOn(spot.x, spot.y);
  };
  const card = (p, title, sub, extra) => h('div', { class: 'hi-person' + (p.zombie ? ' z' : '') }, portrait(p),
    h('div', { class: 'hi-pinfo' }, h('b', {}, title), h('small', { class: 'hi-meta' }, sub), extra));
  const resident = (c) => {
    const stt = residentStatus(s, c);
    return card(c, `${c.name} ${homeInfo(c.home).surname}`, `${regularRole(c, b)} · mora na ${homeName(c.home)}`,
      h('div', {}, h('div', { class: 'hi-status ' + stt.cls }, stt.t),
        h('div', { class: 'hi-btns' },
          h('button', { class: 'btn hi-loc', onClick: () => locate(c) }, icon('walk'), 'Localizar'),
          h('button', { class: 'btn hi-loc', onClick: () => { close(); setTimeout(() => showHome(G, c.home), 0); } }, icon('home'), 'Ver a casa'))));
  };
  const owner = fakePerson(b, 0, P.owner, 'tranquilo');
  const body = h('div', { class: 'home-info' },
    h('div', { class: 'hi-addr' }, icon('store'), h('span', {}, P.address), h('small', {}, ` · ${hoursStr(b)}`)),
    h('p', { class: 'hi-rel' }, P.what + ' ' + P.dr),
    h('div', { class: cls }, status),
    h('div', { class: 'inv-sub' }, P.ownerTitle),
    card(owner, P.owner, P.ownerNote, h('div', { class: 'hi-status' + (post ? ' bad' : '') }, post ? 'Ninguém sabe onde está.' : open && dayIndex(s.time) < 0 ? 'No balcão' : 'Em casa')),
    h('div', { class: 'inv-sub' }, `Funcionários (${P.staff.length})`),
    h('div', { class: 'hi-staff' }, P.staff.map((st, j) => h('div', { class: 'hi-chip' }, portrait(fakePerson(b, j + 1, st.name, 'casa')), h('div', {}, h('b', {}, st.name), h('small', {}, st.role))))),
    inside.length ? [h('div', { class: 'inv-sub' }, `Lá dentro agora (${inside.length})`), h('div', { class: 'hi-res' }, inside.map(resident))] : null,
    regulars.length ? [h('div', { class: 'inv-sub' }, b.role === 'escritorio' ? `Vizinhos que trabalham aqui (${regulars.length})` : b.role === 'escola' ? `Vizinhos que estudam aqui (${regulars.length})` : `Frequentadores do bairro (${regulars.length})`),
      h('div', { class: 'hi-res' }, regulars.filter((c) => !inside.includes(c)).map(resident))] : null);
  close = openModal({ title: P.name, icon: 'store', body, buttons: [{ label: 'Fechar', kind: 'primary' }] });
}

export { PROTAGONIST, hasPower };

// ---------------- Eventos: cartão de decisão ----------------
export function showEventCard(G, c) {
  let close;
  const choices = c.choices.map((ch) =>
    h('button', {
      class: 'ev-choice', disabled: ch.ok !== true,
      onClick: () => { hush(); close(); ch.run(); },
    },
    h('b', {}, ch.label),
    ch.ok !== true ? h('small', { class: 'no' }, ch.ok) : ch.desc ? h('small', {}, ch.desc) : null));
  const body = h('div', { class: 'ev' },
    h('div', { class: 'ev-top' },
      c.who ? h('div', { class: 'ev-who' }, portrait(c.who), h('div', {}, h('b', {}, c.who.name), c.house ? h('small', {}, c.house) : null)) : h('div', { class: 'ev-ic', html: iconHTML(c.icon || 'info') }),
      h('p', { class: 'ev-text' }, c.text)),
    h('div', { class: 'ev-choices' }, choices));
  // quem está na porta fala com a própria voz; avisos do rádio, com a do locutor
  const L = c.who?.look;
  say(c.text, c.who ? personVoice(c.who.name, L?.body === 'f', (L?.age || 0) >= 0.8) : c.icon === 'radio' ? VOICES.radio : VOICES.narrator);
  close = openModal({ title: c.title, icon: c.icon, cls: 'event' + (G.s.flags.outbreak ? ' grim' : ''), body, dismissable: false });
}
