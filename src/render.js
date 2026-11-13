// Renderização da cena: chão, cidade, casa, objetos, personagens e efeitos.
import { W, H, OBJ, BUILD, ATTIC_LIFT } from './config.js';
import { shade } from './draw.js';
import { P, tile, box, poly, faceY, faceX, boxHull, drawWall, wallHull, DRAW, drawPerson, ellipse, WALL_TALL, setTint, col, PLAYER_LOOK } from './draw.js';
import { computeLighting, LAMPS, nightLevel } from './light.js';
import { hasGrid } from './time.js';
import { inLot, tileAt, isIndoor, isIndoorTile, parseEdge, sealStatusFloor, isOutbreak, onFloor, perimeterEdges } from './world.js';
import { hpFrac } from './siege.js';
import { hasPower, minuteOfDay } from './time.js';
import { taskProgress } from './player.js';
import { ACTIONS } from './actions.js';
import { CITY, BUILDINGS, TREES, groundType, laneMark, crosswalk } from './city.js';
import { isVisibleCitizen } from './citizens.js';
import { drawBuilding } from './buildings.js';
import { drawIcon } from './icons.js';
import { citizenLook, zombieLook } from './people.js';
import { pendingBuild } from './build.js';
import './furniture.js';
import { dread, rainAmount, fireCount } from './mood.js';

const BG = '#cfdcea';
const GROUND = {
  grass: ['#a5d67e', '#9dcf76'],
  floor: ['#efdcbc', '#e6cfa9'],
  tile: ['#f6f7fa', '#dde1e9'],
  path: ['#dfe4ec', '#d8dde6'],
  drive: ['#d4d8df', '#d0d4dc'],
  sidewalk: ['#e8eef5', '#e3e9f1'],
  street: ['#4b5161', '#4b5161'],
  ground: ['#d7e2ee', '#d2deeb'],
  wood: ['#b48659', '#a97c50'],
  bath: ['#e3eef4', '#cfdfe8'],
  attic: ['#c79f71', '#bf9667'],
  concrete: ['#a4a8ae', '#9da1a8'],
  earth: ['#4a3b2e', '#45372b'],
};

function wallIsTall(s, d, x, y, mode) {
  if (mode === 'up') return true;
  if (mode === 'down') return false;
  if (d === 'n') return isIndoor(s, x, y) && !isIndoor(s, x, y - 1);
  return isIndoor(s, x, y) && !isIndoor(s, x - 1, y);
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pickAt(pickables, wx, wy, { walls = false } = {}) {
  let best = null;
  for (const p of pickables) {
    if (p.plainWall && !walls) continue;
    if (pointInPoly(wx, wy, p.poly) && (!best || p.k > best.k)) best = p;
  }
  return best ? best.target : null;
}

export function render(ctx, s, view, cam, ui) {
  const { w, h, dpr } = view;
  const now = performance.now();
  const floor = s.player.floor || 'ground';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setTint(floor === 'bunker' ? 0 : nightLevel(s));
  ctx.fillStyle = col(floor === 'bunker' ? '#211a14' : BG);
  setTint(0);
  ctx.fillRect(0, 0, w, h);
  const z = cam.zoom;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 - cam.x * z), dpr * (h / 2 - cam.y * z));
  const vx0 = cam.x - w / 2 / z - 64, vx1 = cam.x + w / 2 / z + 64;
  const vy0 = cam.y - h / 2 / z - 40, vy1 = cam.y + h / 2 / z + 140;
  const env = { now, vx0, vx1, vy0, vy1 };

  if (floor === 'ground') {
    onFloor(s, 'ground', () => drawLayer(ctx, s, 'ground', env, ui, { active: true, wallMode: ui.wallMode }));
  } else if (floor === 'attic') {
    // o térreo (casa fechada, paredes inteiras) fica embaixo, escurecido; o sótão por cima
    onFloor(s, 'ground', () => drawLayer(ctx, s, 'ground', env, ui, { active: false, wallMode: 'up' }));
    setTint(0);
    ctx.fillStyle = 'rgba(12,16,26,.38)';
    ctx.fillRect(vx0 - 200, vy0 - 400, vx1 - vx0 + 400, vy1 - vy0 + 800);
    ctx.save();
    ctx.translate(0, -ATTIC_LIFT);
    onFloor(s, 'attic', () => drawLayer(ctx, s, 'attic', env, ui, { active: true, wallMode: ui.wallMode }));
    ctx.restore();
  } else {
    onFloor(s, 'bunker', () => drawLayer(ctx, s, 'bunker', env, ui, { active: true, wallMode: ui.wallMode }));
  }

  // ---- efeitos de tela ----
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dr = dread(s);
  if (floor !== 'bunker') {
    const rain = rainAmount(s);
    // céu encoberto
    const overcast = 0.06 + 0.16 * dr + 0.12 * rain;
    ctx.fillStyle = `rgba(40,48,62,${overcast})`;
    ctx.fillRect(0, 0, w, h);
    if (isOutbreak(s)) drawSpores(ctx, w, h, now);
    if (rain > 0) drawRain(ctx, w, h, now, rain);
  }
  // vinheta
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${(floor === 'bunker' ? 0.5 : 0.28) + 0.42 * dr})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

const IMPLICIT_WALL = {
  attic: { color: '#dcc6a4', top: '#7a5a3e' },
  bunker: { color: '#a3a6ab', top: '#5e6168' },
};

// Desenha um andar. `active` = é o andar do jogador (recebe cliques, prévia e destaque).
function drawLayer(ctx, s, layer, env, ui, { active, wallMode }) {
  const { now, vx0, vx1, vy0, vy1 } = env;
  const city = layer === 'ground';
  const visible = (x, y) => {
    const [sx, sy] = P(x + 0.5, y + 0.5);
    return sx > vx0 && sx < vx1 && sy > vy0 && sy < vy1;
  };
  const outbreak = isOutbreak(s);
  const L = computeLighting(s);
  const N = L.N;
  // fração de janelas acesas na cidade (só com a rede elétrica funcionando)
  const litFrac = N > 0.2 && hasGrid(s) ? 0.38 * (1 - 0.55 * dread(s)) : 0;
  const shopsLit = N > 0.2 && hasGrid(s);

  // ---- chão ----
  const [X0, Y0, X1, Y1] = city ? [CITY.x0, CITY.y0, CITY.x1, CITY.y1] : [0, 0, W, H];
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      if (!visible(x, y)) continue;
      let type, pending = false;
      if (inLot(x, y)) { const t = tileAt(s, x, y); type = t.type; pending = !!t.pending; }
      else type = groundType(x, y);
      if (type === 'void') continue;
      const pal = GROUND[type];
      setTint(L.at(x, y));
      tile(ctx, x, y, pal[(x + y) & 1]);
      if (type === 'floor' || type === 'wood' || type === 'attic') {
        // tábuas do assoalho
        ctx.strokeStyle = 'rgba(80,50,20,.09)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const f of [0.25, 0.5, 0.75]) { ctx.moveTo(...P(x, y + f)); ctx.lineTo(...P(x + 1, y + f)); }
        const j = ((x * 7 + y * 3) % 4) / 4 + 0.12;
        ctx.moveTo(...P(x + j, y)); ctx.lineTo(...P(x + j, y + 0.25));
        ctx.moveTo(...P(x + ((j + 0.5) % 1), y + 0.5)); ctx.lineTo(...P(x + ((j + 0.5) % 1), y + 0.75));
        ctx.stroke();
      } else if (type === 'tile' || type === 'bath') {
        // azulejos
        ctx.strokeStyle = type === 'bath' ? 'rgba(90,130,160,.18)' : 'rgba(120,130,150,.14)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(...P(x + 0.5, y)); ctx.lineTo(...P(x + 0.5, y + 1));
        ctx.moveTo(...P(x, y + 0.5)); ctx.lineTo(...P(x + 1, y + 0.5));
        ctx.stroke();
      }
      if (type === 'drive') {
        // placas de concreto: junta de dilatação a cada tile
        ctx.strokeStyle = 'rgba(90,100,120,.16)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(...P(x, y)); ctx.lineTo(...P(x + 1, y)); ctx.stroke();
      }
      if (type === 'earth') {
        const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
        if (r > 0.55) { const [sx, sy] = P(x + 0.3 + r * 0.3, y + 0.5); ellipse(ctx, sx, sy, 4, 2, '#3a2e24'); }
      }
      if (pending) {
        ctx.globalAlpha = 0.55;
        tile(ctx, x, y, (layer === 'bunker' ? GROUND.concrete : GROUND.floor)[(x + y) & 1]);
        ctx.globalAlpha = 1;
        poly(ctx, [P(x + 0.1, y + 0.1), P(x + 0.9, y + 0.1), P(x + 0.9, y + 0.9), P(x + 0.1, y + 0.9)], null, '#2f7fe0', 1.5);
      }
      const zebra = type === 'street' ? crosswalk(x, y) : null;
      if (zebra) {
        for (let i = 0; i < 3; i++) {
          const a = 0.12 + i * 0.28;
          const pts = zebra === 'x'
            ? [P(x + 0.08, y + a), P(x + 0.92, y + a), P(x + 0.92, y + a + 0.14), P(x + 0.08, y + a + 0.14)]
            : [P(x + a, y + 0.08), P(x + a + 0.14, y + 0.08), P(x + a + 0.14, y + 0.92), P(x + a, y + 0.92)];
          poly(ctx, pts, 'rgba(240,240,240,.85)');
        }
      }
      const lane = type === 'street' && !zebra ? laneMark(x, y) : null;
      if (lane) {
        const pts = lane === 'y' ? [P(x + 0.2, y - 0.04), P(x + 0.8, y - 0.04), P(x + 0.8, y + 0.04), P(x + 0.2, y + 0.04)]
          : [P(x - 0.04, y + 0.2), P(x + 0.04, y + 0.2), P(x + 0.04, y + 0.8), P(x - 0.04, y + 0.8)];
        poly(ctx, pts, '#f4f4f4');
      }
      if (city && outbreak && !isIndoorTile(inLot(x, y) ? tileAt(s, x, y) : null)) {
        tile(ctx, x, y, 'rgba(130,190,60,.13)');
      }
    }
  }

  // tapetes
  for (const r of s.world.rugs || []) {
    setTint(L.at(r.x, r.y));
    const pts = (m) => [P(r.x + m, r.y + m), P(r.x + r.w - m, r.y + m), P(r.x + r.w - m, r.y + r.h - m), P(r.x + m, r.y + r.h - m)];
    poly(ctx, pts(0.08), r.c);
    poly(ctx, pts(0.16), null, r.b, 2);
    poly(ctx, pts(0.3), null, shade(r.c, 1.25), 1.2);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, m = Math.min(r.w, r.h) * 0.22;
    poly(ctx, [P(cx, cy - m), P(cx + m, cy), P(cx, cy + m), P(cx - m, cy)], r.b);
  }

  setTint(0);
  // buracos na vedação: linha vermelha no chão
  const seal = sealStatusFloor(s, layer);
  if (active) {
    ctx.strokeStyle = `rgba(229,57,53,${0.55 + 0.35 * Math.sin(now / 250)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const k of seal.breaches) {
      const { d, x, y } = parseEdge(k);
      const a = P(x, y), b = d === 'n' ? P(x + 1, y) : P(x, y + 1);
      ctx.moveTo(...a);
      ctx.lineTo(...b);
    }
    ctx.stroke();
  }

  // ---- lista ordenada por profundidade ----
  const list = [];
  const picks = [];
  if (city) {
    const homesKnown = new Set((s.npcs || []).filter((c) => c.mode === 'citizen').map((c) => c.home));
    for (const b of BUILDINGS) {
      const [lx] = P(b.x, b.y + b.d), [rx] = P(b.x + b.w, b.y);
      const top = P(b.x, b.y, b.h)[1], bottom = P(b.x + b.w, b.y + b.d)[1];
      if (rx < vx0 || lx > vx1 || bottom < vy0 || top > vy1) continue;
      list.push({ k: b.x + b.w / 2 + b.y + b.d / 2, o: 0, t: N, draw: () => drawBuilding(ctx, b, N, litFrac, shopsLit) });
    // casas de vizinhos conhecidos: clicáveis
    if (active && b.role) picks.push({ k: b.x + b.w / 2 + b.y + b.d / 2 - 0.001, poly: boxHull(b.x, b.y, 0, b.w, b.d, b.h + 8), target: { kind: 'building', id: BUILDINGS.indexOf(b) } });
    else if (active && homesKnown.has(b)) picks.push({ k: b.x + b.w / 2 + b.y + b.d / 2 - 0.001, poly: boxHull(b.x, b.y, 0, b.w, b.d, b.h + 17), target: { kind: 'building', id: BUILDINGS.indexOf(b) } });
    }
    for (const tr of TREES) {
      if (!visible(tr.x, tr.y)) continue;
      list.push({ k: tr.x + tr.y + 1, o: 1, t: L.at(tr.x, tr.y), draw: () => DRAW.tree(ctx, tr) });
    }
    // cerca do terreno
    const fence = (d, x, y) => list.push({
      k: d === 'n' ? x + 0.5 + y : x + y + 0.5, o: 0, t: L.at(x, y),
      draw: () => {
        const t = 0.06;
        if (d === 'n') box(ctx, x, y - t / 2, 0, 1, t, 9, '#ffffff', { top: '#ffffff', left: '#eef1f6' });
        else box(ctx, x - t / 2, y, 0, t, 1, 9, '#ffffff', { top: '#ffffff', right: '#e2e6ee' });
      },
    });
    for (let x = 0; x < W; x++) { fence('n', x, 0); if (!['path', 'drive'].includes(tileAt(s, x, H - 1).type)) fence('n', x, H); }
    for (let y = 0; y < H; y++) { fence('w', 0, y); fence('w', W, y); }
  }

  // paredes (no sótão e no bunker, a borda é fechada pelo telhado / pela terra)
  const unsealedSet = new Set(seal.unsealed);
  const walls = Object.entries(s.world.walls);
  if (!city) {
    for (const k of perimeterEdges(s)) if (!s.world.walls[k]) walls.push([k, { type: 'wall', built: true, implicit: true }]);
  }
  for (const [k, wall] of walls) {
    const { d, x, y } = parseEdge(k);
    const tall = wallIsTall(s, d, x, y, wallMode);
    const key = d === 'n' ? x + 0.5 + y : x + y + 0.5;
    const isBp = !wall.built;
    const [sa, sb] = d === 'n' ? [[x, y - 1], [x, y]] : [[x - 1, y], [x, y]];
    const wopts = city ? {} : IMPLICIT_WALL[layer];
    list.push({
      k: key, o: 1, t: Math.min(L.at(...sa), L.at(...sb)),
      draw: () => {
        if (isBp) ctx.globalAlpha = 0.4;
        drawWall(ctx, d, x, y, wall, tall, wopts);
        ctx.globalAlpha = 1;
        if (wall.pending) {
          ctx.globalAlpha = 0.5;
          drawWall(ctx, d, x, y, { type: wall.pending }, tall, { color: '#bcd8ff' });
          ctx.globalAlpha = 1;
        }
        const top = (tall ? WALL_TALL : 14) + 12;
        const [sx, sy] = d === 'n' ? P(x + 0.5, y, top) : P(x, y + 0.5, top);
        if (active && unsealedSet.has(k)) {
          const r = 7 + Math.sin(now / 200) * 1.2;
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fillStyle = '#b3261e'; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 11px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('!', sx, sy + 0.5);
        }
        // resistência de aberturas e cercas atacadas
        if (city && wall.hp != null && !wall.broken) {
          setTint(0);
          const f = hpFrac(wall);
          const by = sy - (unsealedSet.has(k) ? 14 : 0);
          ctx.fillStyle = 'rgba(16,19,24,.85)';
          ctx.beginPath(); ctx.roundRect(sx - 17, by - 3, 34, 6, 2); ctx.fill();
          ctx.fillStyle = f > 0.55 ? '#7d9c6a' : f > 0.25 ? '#c9953b' : '#d84a3b';
          ctx.beginPath(); ctx.roundRect(sx - 15.5, by - 1.5, 31 * f, 3, 1); ctx.fill();
        }
      },
    });
    if (!wall.implicit && active) picks.push({ k: key + 0.001, poly: wallHull(d, x, y, tall), target: { kind: 'edge', key: k }, plainWall: wall.type === 'wall' && wall.built && !wall.pending });
  }

  // objetos
  const p = s.player;
  const power = hasPower(s);
  for (const o of s.world.objects) {
    const ow = o.w || 1, oh = o.h || 1;
    const key = o.x + ow / 2 + o.y + oh / 2;
    const using = p.task && p.task.phase === 'do' && p.task.target.kind === 'obj' && p.task.target.id === o.id;
    const on = (o.type === 'radio' && s._radioOn === o.id) || (o.type === 'tv' && (using || (s._tvOn === o.id && power))) || ((o.type === 'computer' || o.type === 'lab') && using) || (o.type === 'filter' && power);
    let ot = L.at(o.x, o.y);
    for (let xx = o.x; xx < o.x + ow; xx++) for (let yy = o.y; yy < o.y + oh; yy++) ot = Math.min(ot, L.at(xx, yy));
    list.push({
      k: key, o: 1, t: ot,
      draw: () => {
        if (!o.built) ctx.globalAlpha = 0.45;
        DRAW[o.type]?.(ctx, o, s, on, using && p.hidden ? p.task.act : null);
        ctx.globalAlpha = 1;
        if (!o.built) poly(ctx, [P(o.x + 0.05, o.y + 0.05), P(o.x + ow - 0.05, o.y + 0.05), P(o.x + ow - 0.05, o.y + oh - 0.05), P(o.x + 0.05, o.y + oh - 0.05)], null, '#2f7fe0', 1.5);
        setTint(0);
        if ((o.type === 'bed' || o.type === 'bed2') && using && p.hidden) {
          const [sx, sy] = P(o.x + 0.5, o.y + 0.5, 30);
          ctx.fillStyle = '#c9cfd8'; ctx.font = '600 16px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
          const t = (now / 600) % 3;
          ctx.fillText('Z', sx + 6, sy - 6 * t);
          ctx.font = '600 11px Barlow Condensed, sans-serif';
          ctx.fillText('z', sx + 14, sy - 6 * ((t + 1.5) % 3) - 4);
        }
        if (!active) return;
        if (o.type === 'planter' && o.built && o.data.stage === 'ripe') badge(ctx, o.x + 0.5, o.y + 0.5, 46, 'harvest', now, '#6f9e4a');
        if (o.type === 'planter' && o.built && o.data.stage === 'growing' && !o.data.watered) badge(ctx, o.x + 0.5, o.y + 0.5, 40, 'water', now, '#4f7fa8');
        if (o.type === 'boxes' && !o.data.searched) badge(ctx, o.x + 0.5, o.y + 0.5, 48, 'info', now, '#d9a441');
        if ((o.type === 'ladder' || o.type === 'bunkerLadder') && o.built) badge(ctx, o.x + 0.5, o.y + 0.5, WALL_TALL + 14, 'up', now, '#c9ccd2');
        if ((o.type === 'atticHatch' || o.type === 'bunkerHatch') && o.built) badge(ctx, o.x + 0.5, o.y + 0.5, 22, 'down', now, '#c9ccd2');
      },
    });
    if (active) picks.push({ k: key, poly: boxHull(o.x, o.y, 0, ow, oh, OBJ[o.type].ht), target: { kind: 'obj', id: o.id } });
  }

  // NPCs (só existem no térreo e na cidade)
  if (city) for (const n of s.npcs || []) {
    if (n.mode === 'citizen' && !isVisibleCitizen(n)) continue;
    // de dia os infectados da cidade se escondem da claridade (só alguns ficam vagando)
    if (n.mode === 'citizen' && n.zombie && nightLevel(s) < 0.3 && hashId(n.id) > 0.12) continue;
    if (!visible(n.px - 0.5, n.py - 0.5)) continue;
    const kk = n.px + n.py;
    list.push({
      k: kk, o: 2, t: L.at(n.px, n.py),
      draw: () => {
        let [sx, sy] = P(n.px, n.py);
        if (n.bashing) sx += Math.sin(now / 45 + kk) * 1.6;
        if (n.alpha != null && n.alpha < 1) ctx.globalAlpha = Math.max(0, n.alpha);
        const look = n.zombie ? zombieLook(n) : citizenLook(n);
        drawPerson(ctx, sx, sy, {
          look: n.mask && !n.zombie ? { ...look, mask: true } : look, zombie: n.zombie, facing: n.facing, back: !!n.back,
          walk: n.walk, moving: n.moving, time: now, seed: n.id, bashing: n.bashing, fall: n.dead ? Math.min(1, 1.2 - n.alpha) : 0,
        });
        ctx.globalAlpha = 1;
        if (n.mode === 'intruder' && !n.dead) { setTint(0); badge(ctx, n.px, n.py, 66, 'warning', now, '#e2786c'); }
        if (n.mode === 'visitor' && n.ring) { setTint(0); badge(ctx, n.px, n.py, 70, n.knock ? 'door' : 'bell', now, '#12c8e8'); }
      },
    });
    if (active) {
      const [sx, sy] = P(n.px, n.py);
      picks.push({ k: kk + 0.2, poly: [[sx - 11, sy + 4], [sx + 11, sy + 4], [sx + 11, sy - 54], [sx - 11, sy - 54]], target: { kind: 'npc', id: n.id ?? -1 }, npc: n });
    }
  }

  if (city) {
    // postes de rua
    const lampsLit = L.lamps.length > 0;
    for (const l of LAMPS) {
      if (!visible(l.x - 0.5, l.y - 0.5)) continue;
      list.push({ k: l.x + l.y, o: 1, t: L.at(l.x, l.y), draw: () => drawLamp(ctx, l, lampsLit && N > 0.15) });
    }
    // viaturas com sirene
    for (const c of s.cars || []) {
      const bx = c.axis === 'y' ? { x: c.cx - 0.4, y: c.cy - 0.9, dir: 'y' } : { x: c.cx - 0.9, y: c.cy - 0.4, dir: 'x' };
      list.push({ k: c.cx + c.cy, o: 1, t: L.at(c.cx, c.cy), draw: () => drawPoliceCar(ctx, bx, now, c.abandoned) });
    }
  }

  // jogador (sentado: desenhado na cadeira, atrás do encosto se estiver de costas)
  if (!p.hidden && !p.away && p.floor === layer) {
    const { seat } = playerPose(s, p);
    const pk = seat ? seat.x + seat.y + (DIR_VIEW[seat.dir][1] && !seat.chair ? -0.02 : 0.02) : p.px + p.py;
    list.push({
      k: pk, o: seat && DIR_VIEW[seat.dir][1] && !seat.chair ? 0.5 : 2, t: L.at(p.px, p.py),
      draw: () => {
        const { pose, seat } = playerPose(s, p);
        const [sx, sy] = seat ? P(seat.x, seat.y) : P(p.px, p.py);
        const [facing, back] = seat ? DIR_VIEW[seat.dir] : [p.facing, !!p.back];
        const prog = taskProgress(s);
        const chairAfter = seat?.chair && back;
        if (seat?.chair && !back) drawOfficeChair(ctx, seat.x, seat.y, seat.dir);
        drawPerson(ctx, sx, sy, {
          look: PLAYER_LOOK, facing, back, walk: p.walk, moving: p.moving && !seat, time: now, seed: 'dr',
          pose: seat && !pose ? 'sit' : pose, progress: prog ?? 0, needs: s.needs, rock: seat?.rock, noBubble: prog != null,
        });
        if (chairAfter) drawOfficeChair(ctx, seat.x, seat.y, seat.dir);
        setTint(0);
        if (prog != null) {
          ctx.fillStyle = 'rgba(16,19,24,.88)';
          ctx.beginPath(); ctx.roundRect(sx - 22, sy - 70, 44, 7, 2); ctx.fill();
          ctx.fillStyle = '#d9a441';
          ctx.beginPath(); ctx.roundRect(sx - 20, sy - 68, 40 * prog, 3, 1); ctx.fill();
          ctx.fillStyle = 'rgba(16,19,24,.88)';
          ctx.beginPath(); ctx.arc(sx, sy - 84, 11, 0, Math.PI * 2); ctx.fill();
          drawIcon(ctx, ACTIONS[p.task.act].icon, sx, sy - 84, 14, '#e8e4dc', 2.2);
        }
      },
    });
    if (p.goal) {
      const [gx, gy] = p.goal;
      const a = 0.5 + 0.3 * Math.sin(now / 150);
      poly(ctx, [P(gx + 0.2, gy + 0.2), P(gx + 0.8, gy + 0.2), P(gx + 0.8, gy + 0.8), P(gx + 0.2, gy + 0.8)], null, `rgba(255,255,255,${a})`, 2.5);
    }
  }

  list.sort((a, b) => a.k - b.k || a.o - b.o);
  for (const it of list) { setTint(it.t || 0); it.draw(); }
  setTint(0);

  // ---- brilho quente das luzes (soma de luz) ----
  if (N > 0.05) drawGlows(ctx, L, N, s);

  // ---- incêndios e fumaça na cidade ----
  if (city) {
    const fires = fireCount(s);
    for (let i = 0; i < fires && i < FIRE_BUILDINGS.length; i++) drawFire(ctx, FIRE_BUILDINGS[i], now, i, N);
  }

  if (!active) return;
  // ---- destaque do objeto sob o mouse ----
  if (ui.hover) drawHover(ctx, picks, ui.hover, now);
  // ---- prévia de construção ----
  if (ui.ghost) drawGhost(ctx, s, ui.ghost, wallMode);
  ui.pickables = picks;
}

const hashId = (v) => (Math.abs(Math.sin(String(v).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) * 43758.5453) % 1);

// ---------- Poses do Dr. ----------
const DIR_VIEW = { e: [1, false], s: [-1, false], n: [1, true], w: [-1, true] };
const POSE = {
  drink: 'drink', research: 'lab', seal: 'tape', sealHatch: 'tape', plant: 'crouch', harvest: 'crouch', water: 'water',
  chop: 'axe', reinforce1: 'hammer', reinforce2: 'hammer', patch: 'hammer', rebuild: 'hammer', fight: 'punch',
  sampleAir: 'vial', search: 'rummage', relax: 'read', medkit: 'drink', news: null, radio: null,
};
const dirTo = (p, x, y) => {
  const dx = x - p.px, dy = y - p.py;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
};

// Que pose o Dr. faz agora, e se está sentado em algum lugar
function playerPose(s, p) {
  const t = p.task;
  if (!t || t.phase !== 'do' || ACTIONS[t.act].hide) return { pose: null, seat: null };
  let pose = t.act in POSE ? POSE[t.act] : t.duration > 0 ? 'work' : null;
  let seat = null;
  const e = t.target.kind === 'obj' ? s.world.objects.find((o) => o.id === t.target.id) : null;
  if (t.act === 'eat' && e) {
    if (e.type === 'stove') pose = 'cook';
    else if (e.type === 'diningTable') {
      // senta na cadeira livre mais perto
      const chairs = s.world.objects.filter((c) => c.type === 'chair' && c.x >= e.x - 1 && c.x <= e.x + e.w && c.y >= e.y - 1 && c.y <= e.y + e.h);
      chairs.sort((a, b) => Math.hypot(a.x + 0.5 - p.px, a.y + 0.5 - p.py) - Math.hypot(b.x + 0.5 - p.px, b.y + 0.5 - p.py));
      if (chairs[0]) { seat = { x: chairs[0].x + 0.5, y: chairs[0].y + 0.5, dir: chairs[0].data.dir || 'n' }; pose = 'eatSeat'; }
      else pose = 'snack';
    } else pose = 'snack';
  }
  if (t.act === 'build') pose = pendingBuild(s, t.target) === 'dig' ? 'dig' : 'hammer';
  if (t.act === 'work' && e) {
    // senta na cadeira do escritório encostada na escrivaninha (saves antigos: cadeira desenhada na hora)
    const ch = s.world.objects.find((c) => c.type === 'deskChair' && Math.abs(c.x - e.x) + Math.abs(c.y - e.y) === 1);
    seat = ch ? { x: ch.x + 0.5, y: ch.y + 0.5, dir: ch.data.dir || 'n' } : { x: p.px, y: p.py, dir: dirTo(p, e.x + 0.5, e.y + 0.5), chair: true };
    pose = 'type';
  }
  if (t.act === 'relax' && e) seat = { x: e.x + 0.5, y: e.y + 0.5, dir: e.data.dir || 's', rock: e.type === 'rocker' };
  if (t.act === 'fight') {
    const n = (s.npcs || []).find((q) => q.id === t.target.id);
    if (n) { p.facing = n.px - n.py - (p.px - p.py) > 0 ? 1 : -1; p.back = false; }
  }
  return { pose, seat };
}

function drawOfficeChair(ctx, x, y, dir) {
  const [vx, vy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
  box(ctx, x - 0.03, y - 0.03, 0, 0.06, 0.06, 9, '#3a3f4a');
  box(ctx, x - 0.25, y - 0.25, 9, 0.5, 0.5, 3, '#4a5160');
  const bx = vx === 0 ? x - 0.25 : vx > 0 ? x - 0.3 : x + 0.22;
  const by = vy === 0 ? y - 0.25 : vy > 0 ? y - 0.3 : y + 0.22;
  box(ctx, bx, by, 12, vx === 0 ? 0.5 : 0.08, vx === 0 ? 0.08 : 0.5, 16, '#4a5160');
}

// ---------- Clima e cidade em crise ----------

// prédios que pegam fogo: os mais próximos da casa (atrás e dos lados, para a fumaça não cobrir a casa)
const FIRE_BUILDINGS = BUILDINGS
  .filter((b) => (b.x + b.w <= 0 || b.y + b.d <= 0) && b.h >= 40)
  .map((b) => ({ b, dist: Math.hypot(b.x + b.w / 2 - W / 2, b.y + b.d / 2 - H / 2) }))
  .sort((a, b) => a.dist - b.dist)
  .slice(0, 12)
  .map((o, i) => ({ ...o, r: Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 }))
  .sort((a, b) => a.r - b.r)
  .map((o) => o.b);

function drawFire(ctx, b, now, seed, night = 0) {
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
  const [sx, sy] = P(cx, cy, b.h);
  const t = now / 1000;
  // brilho do fogo no telhado
  const fl = 0.75 + 0.25 * Math.sin(t * 9 + seed) * Math.sin(t * 5.3 + seed * 2);
  const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 46);
  g.addColorStop(0, `rgba(255,170,60,${0.55 * fl})`);
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const fx = sx + (i - 1.5) * 7, hgt = 10 + 8 * Math.abs(Math.sin(t * 7 + i * 1.7 + seed));
    ctx.fillStyle = i % 2 ? 'rgba(255,120,30,.9)' : 'rgba(255,200,80,.9)';
    ctx.beginPath();
    ctx.moveTo(fx - 5, sy);
    ctx.quadraticCurveTo(fx - 3, sy - hgt * 0.6, fx, sy - hgt);
    ctx.quadraticCurveTo(fx + 3, sy - hgt * 0.6, fx + 5, sy);
    ctx.fill();
  }
  // coluna de fumaça (sem estado: cada baforada é função do tempo)
  const N = 14;
  for (let i = 0; i < N; i++) {
    const ph = (t * 0.07 + i / N + seed * 0.13) % 1;
    const x = sx + ph * 70 + Math.sin(ph * 6 + i) * 8;
    const y = sy - 8 - ph * 190;
    const r = 8 + ph * 34;
    const k = 1 - night * 0.8;
    ctx.fillStyle = `rgba(${(40 + ph * 40) * k},${(40 + ph * 40) * k},${(44 + ph * 40) * k},${0.55 * (1 - ph)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPoliceCar(ctx, c, now, abandoned) {
  const { x, y } = c;
  const alongY = c.dir === 'y';
  const w = alongY ? 0.8 : 1.8, d = alongY ? 1.8 : 0.8;
  for (const [a, b] of alongY ? [[0.1, 0.35], [0.7, 0.35], [0.1, 1.45], [0.7, 1.45]] : [[0.35, 0.1], [0.35, 0.7], [1.45, 0.1], [1.45, 0.7]]) {
    const [wx, wy] = P(x + a, y + b, 4);
    ellipse(ctx, wx, wy, 5, 5, '#1b1d22');
  }
  box(ctx, x, y, 4, w, d, 11, '#eef0f3');
  // capô e porta-malas pretos
  if (alongY) { box(ctx, x, y, 4, w, 0.4, 11.5, '#1d2230'); box(ctx, x, y + 1.4, 4, w, 0.4, 11.5, '#1d2230'); }
  else { box(ctx, x, y, 4, 0.4, d, 11.5, '#1d2230'); box(ctx, x + 1.4, y, 4, 0.4, d, 11.5, '#1d2230'); }
  // cabine
  const cx0 = alongY ? x + 0.08 : x + 0.5, cy0 = alongY ? y + 0.5 : y + 0.08;
  box(ctx, cx0, cy0, 15, alongY ? 0.64 : 0.8, alongY ? 0.8 : 0.64, 8, '#3d4a63');
  // giroflex
  const on = Math.floor(now / 230) % 2 === 0;
  const lx = x + w / 2, ly = y + d / 2;
  const blink = !abandoned || Math.floor(now / 700) % 4 !== 0;
  box(ctx, lx - 0.16, ly - 0.16, 23, 0.16, 0.32, 3.5, blink && on ? '#ff2a2a' : '#5a1a1a');
  box(ctx, lx, ly - 0.16, 23, 0.16, 0.32, 3.5, blink && !on ? '#2f63ff' : '#1a234a');
  if (blink) {
    const [sx, sy] = P(lx, ly, 26);
    const col = on ? '255,50,40' : '50,100,255';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 80);
    g.addColorStop(0, `rgba(${col},.9)`);
    g.addColorStop(0.4, `rgba(${col},.3)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawRain(ctx, w, h, now, amount) {
  const n = Math.floor(260 * amount);
  ctx.strokeStyle = 'rgba(190,205,225,.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const t = now / 1000;
  for (let i = 0; i < n; i++) {
    const rx = (Math.sin(i * 91.7) * 0.5 + 0.5);
    const ry = (Math.sin(i * 47.3) * 0.5 + 0.5);
    const sp = 0.9 + (i % 7) * 0.08;
    const y = ((ry + t * sp) % 1) * (h + 40) - 20;
    const x = ((rx + t * 0.12) % 1) * (w + 40) - 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 16);
  }
  ctx.stroke();
}

function drawLamp(ctx, l, on) {
  const x = l.x - 0.04, y = l.y - 0.04;
  box(ctx, x, y, 0, 0.08, 0.08, 62, '#5b6270');
  box(ctx, x - 0.12, y - 0.04, 62, 0.32, 0.16, 4, '#4a505c');
  setTint(0);
  const [sx, sy] = P(l.x, l.y, 60);
  ellipse(ctx, sx, sy, 5, 2.5, on ? '#ffe7a8' : '#2a2e36');
}

function drawGlows(ctx, L, N, s) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, z, r, rgb, a) => {
    const [sx, sy] = P(x, y, z);
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  };
  const k = N / 0.82;
  for (const l of L.lamps) {
    glow(l.x, l.y, 60, 18, '255,225,160', 0.7 * k);
    glow(l.x, l.y, 0, 100, '255,190,110', 0.12 * k);
  }
  for (const w of L.wins) glow(w.x, w.y, 20, 70, '255,200,130', 0.14 * k);
  if (L.house) {
    // luz quente dentro de casa
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (L.lit[y * W + x]) poly(ctx, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], `rgba(255,190,110,${0.07 * k})`);
    }
  }
  ctx.restore();
}

function sameTarget(a, b) {
  return a && b && a.kind === b.kind && a.id === b.id && a.key === b.key && a.x === b.x && a.y === b.y;
}

function drawHover(ctx, picks, target, now) {
  const danger = target.danger;
  let pts = null;
  const pk = picks.find((p) => sameTarget(p.target, target));
  if (pk) pts = pk.poly;
  else if (target.kind === 'tile') pts = [P(target.x, target.y), P(target.x + 1, target.y), P(target.x + 1, target.y + 1), P(target.x, target.y + 1)];
  if (!pts) return;
  const a = 0.75 + 0.25 * Math.sin(now / 220);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]);
  ctx.closePath();
  ctx.fillStyle = danger ? 'rgba(220,74,59,.16)' : 'rgba(255,226,170,.12)';
  ctx.fill();
  ctx.shadowColor = danger ? 'rgba(220,74,59,.9)' : 'rgba(255,200,110,.9)';
  ctx.shadowBlur = 14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = danger ? `rgba(240,110,95,${a})` : `rgba(255,222,160,${a})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function badge(ctx, x, y, zz, name, now, color) {
  const [sx, sy] = P(x, y, zz + Math.sin(now / 300) * 2);
  ctx.fillStyle = 'rgba(20,24,30,.85)';
  ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
  drawIcon(ctx, name, sx, sy, 13, color, 2.4);
}

function drawGhost(ctx, s, g, wallMode) {
  const B = BUILD[g.item];
  const col = g.ok === true ? 'rgba(76,175,80,.55)' : 'rgba(229,57,53,.55)';
  ctx.globalAlpha = 0.6;
  if (B.kind === 'edge') {
    const { d, x, y } = parseEdge(g.edge);
    drawWall(ctx, d, x, y, { type: g.item }, wallMode === 'up', { color: g.ok === true ? '#c8f2c9' : '#ffc9c9' });
  } else if (B.kind === 'floor' || B.kind === 'dig') {
    tile(ctx, g.x, g.y, col);
  } else {
    tile(ctx, g.x, g.y, col);
    DRAW[g.item]?.(ctx, { x: g.x, y: g.y, w: 1, h: 1, id: 0, data: { stage: 'empty' } }, s, false);
  }
  ctx.globalAlpha = 1;
}

const spores = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, sp: 0.2 + Math.random() * 0.6 }));
function drawSpores(ctx, w, h, now) {
  ctx.fillStyle = 'rgba(150,210,80,.35)';
  for (const p of spores) {
    const x = ((p.x + now * 0.00002 * p.sp) % 1) * w;
    const y = ((p.y + Math.sin(now * 0.0005 + p.x * 10) * 0.02 + now * 0.00001 * p.sp) % 1) * h;
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

export { ellipse };
