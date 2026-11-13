// Personagens: o Dr., os moradores e os zumbis. Tudo procedural, com esqueleto simples
// (braços e pernas com cotovelo/joelho), vista de frente e de costas, poses por ação
// e reações às necessidades (sono, fome, sede, doença).
import { col, shade, circle, ellipse, poly } from './draw.js';
import { drawIcon } from './icons.js';

// O Doutor Átila Varela: cabelo branco rareando, bigode grisalho, óculos, cardigã mostarda
export const PLAYER_LOOK = {
  body: 'm', age: 0.7, skin: '#e8b98a', hair: '#e6e7ea', hairStyle: 'balding', beard: 'mustache', glasses: true,
  shirt: '#d6e4ef', outfit: 'cardigan', coat: '#d6a03c', pants: '#5d5a54', shoes: '#3a2a20', slippers: true,
};

// ---------- utilidades ----------
export function hash01(v) {
  let h = 2166136261;
  const str = String(v);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const R = (seed, k) => hash01(seed + ':' + k);
const pickS = (arr, seed, k) => arr[Math.floor(R(seed, k) * arr.length) % arr.length];

function seg(ctx, x0, y0, x1, y1, w, c) {
  ctx.strokeStyle = col(c);
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function rr(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = col(fill); ctx.fill();
}
// membro com articulação: ângulos a partir da vertical (para baixo); positivo = para a frente (+x)
function limb(ctx, x0, y0, a1, l1, a2, l2, w, c1, c2) {
  const x1 = x0 + Math.sin(a1) * l1, y1 = y0 + Math.cos(a1) * l1;
  const x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
  seg(ctx, x0, y0, x1, y1, w, c1);
  seg(ctx, x1, y1, x2, y2, w * 0.9, c2);
  return [x2, y2, a1 + a2];
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---------- visual dos moradores ----------
const FEMALE = /a$|^(Nair|Isabel|Alice)$/;
const PERSONA_STYLE = {
  escritorio: (f, sd) => ({ outfit: f ? 'blouse' : 'shirtTie', tie: pickS(['#2d3a5a', '#7a2a3a', '#2f4f3f'], sd, 'tie'), bag: R(sd, 'b') < 0.4 ? 'briefcase' : null }),
  tranquilo: (f, sd) => ({ outfit: f ? 'dress' : 'cardigan', coat: pickS(['#8a7a64', '#6f7d6a', '#9a8070'], sd, 'c'), age: 0.85, cane: R(sd, 'cane') < 0.35, hairGray: true, hat: !f && R(sd, 'h') < 0.4 ? 'fedora' : null }),
  estudante: (f, sd) => ({ outfit: 'tee', bag: 'backpack', bagColor: pickS(['#3a6ea5', '#c0392b', '#27ae60', '#8e44ad'], sd, 'bc'), age: 0 }),
  noturno: (f, sd) => ({ outfit: 'jacket', coat: pickS(['#1f1f27', '#3a2a22', '#2a3442'], sd, 'j') }),
  atleta: (f, sd) => ({ outfit: 'tank', shorts: true, hat: R(sd, 'h') < 0.5 ? 'cap' : 'band', hatColor: pickS(['#e63946', '#00b4d8', '#ffb703'], sd, 'hc') }),
  casa: (f, sd) => ({ outfit: f ? 'apronDress' : 'tee', bag: R(sd, 'b') < 0.5 ? 'grocery' : null }),
};
const HAIR_F = ['long', 'bun', 'ponytail', 'curly', 'bob'];
const HAIR_M = ['short', 'short', 'buzz', 'curly', 'balding', 'side'];

export function citizenLook(c) {
  if (c.look) return c.look;
  const sd = c.id ?? c.name;
  const f = FEMALE.test(c.name || '');
  const st = (PERSONA_STYLE[c.persona] || PERSONA_STYLE.casa)(f, sd);
  const old = st.age >= 0.8;
  c.look = {
    body: f ? 'f' : 'm',
    age: st.age ?? R(sd, 'age') * 0.4,
    skin: c.skin, shirt: c.shirt, pants: c.pants,
    hair: st.hairGray ? pickS(['#cfd1d6', '#b9bcc2', '#e2e3e6'], sd, 'gh') : c.hair,
    hairStyle: f ? (old ? 'bun' : pickS(HAIR_F, sd, 'hs')) : (old ? pickS(['balding', 'short', 'bald'], sd, 'hs') : pickS(HAIR_M, sd, 'hs')),
    beard: !f && R(sd, 'beard') < (old ? 0.5 : 0.25) ? pickS(['mustache', 'full', 'stubble'], sd, 'bt') : null,
    glasses: R(sd, 'gl') < (old ? 0.6 : 0.15),
    shoes: pickS(['#2b2b2b', '#5a3a28', '#e8e8e8', '#3a4a6a'], sd, 'sh'),
    ...st,
  };
  return c.look;
}

// ---------- zumbis ----------
const ZSKINS = ['#8fbf7a', '#9fb08a', '#a7b9a0', '#7fa58c', '#b0b892'];
export function zombieLook(n) {
  if (n.zlook) return n.zlook;
  const sd = n.id;
  const base = n.look || citizenLook(n);
  n.zlook = {
    ...base,
    skin: pickS(ZSKINS, sd, 'zs'),
    shirt: mix(base.shirt || '#888888', '#6b6458', 0.35),
    pants: mix(base.pants || '#3a3f55', '#4a4038', 0.3),
    hat: null, bag: null, cane: false, glasses: R(sd, 'zg') < 0.15,
    zArm: R(sd, 'arm') < 0.35 ? 'dangle' : 'reach', // um braço caído ou os dois esticados
    zLean: 0.18 + R(sd, 'lean') * 0.22,
    zLimp: R(sd, 'limp') < 0.5,
    blood: [0, 1, 2].map((i) => [R(sd, 'bx' + i) * 12 - 6, -34 + R(sd, 'by' + i) * 16, 1.5 + R(sd, 'br' + i) * 2.5]),
    shoeless: R(sd, 'shoe') < 0.4,
  };
  return n.zlook;
}

// ---------- desenho ----------
// o: { look, facing, back, walk, moving, time, pose, needs, zombie, bashing, seed, fall, seated, rock, progress }
export function drawPerson(ctx, sx, sy, o) {
  const L = o.zombie ? (o.look || {}) : o.look || o;
  const t = o.time ?? performance.now();
  const seed = o.seed ?? 0;
  const ph = R(seed, 'ph') * 1000;
  const z = !!o.zombie;
  const back = !!o.back;
  const needs = o.needs || null;
  let pose = o.pose || null;

  // reações às necessidades (só quando não está fazendo outra coisa)
  let skin = L.skin || '#e0ac69';
  let lean = (L.age || 0) * 0.1;
  let eyes = 'open', mouth = 'smile';
  let gesture = null; // gesto do braço da frente
  if (needs && !z) {
    if (needs.contamination > 30) skin = mix(skin, '#a7c07a', Math.min(0.55, (needs.contamination - 30) / 90));
    if (needs.health < 35) skin = mix(skin, '#d8d0c8', 0.35);
    if (needs.energy < 40) { eyes = 'tired'; lean += 0.06; mouth = 'flat'; }
    if (needs.hunger < 30 || needs.thirst < 30) mouth = 'flat';
    if (!pose) {
      const cyc = (t + ph) % 7000;
      if (needs.contamination > 30 && cyc < 900) { gesture = 'cough'; mouth = 'open'; }
      else if (needs.energy < 25 && cyc > 3000 && cyc < 4400) { gesture = 'yawn'; mouth = 'yawn'; eyes = 'closed'; }
      else if (needs.hunger < 30 && cyc > 5000 && cyc < 6500) gesture = 'belly';
      else if (needs.thirst < 30 && cyc > 1500 && cyc < 2600) gesture = 'brow';
    }
  }
  if (z) { lean = L.zLean ?? 0.25; mouth = 'zombie'; eyes = 'zombie'; }
  if (!z && eyes === 'open' && (t + ph) % 4200 < 130) eyes = 'closed';
  if (pose === 'drink' || pose === 'snack' || pose === 'eatSeat') mouth = 'chew';

  const moving = !!o.moving;
  const walk = o.walk || 0;
  const sw = moving ? Math.sin(walk) : 0;
  let bob = moving ? Math.abs(Math.cos(walk)) * (z ? 2.2 : 1.4) : 0;
  if (moving && needs && needs.energy < 25) bob *= 0.5;
  // respiração
  const breathe = Math.sin((t + ph) / 700) * 0.5;

  ctx.save();
  ctx.translate(sx, sy);
  ellipse(ctx, 0, 0, 11, 5, 'rgba(0,0,0,.2)');
  if (o.fall) { ctx.translate(0, -2); ctx.rotate(o.fall * 1.35 * (o.facing || 1)); }
  ctx.scale((o.facing || 1) * (L.age > 0.8 ? 0.96 : 1), L.age > 0.8 ? 0.96 : 1);
  if (z && moving) ctx.translate(Math.sin(walk * 0.5) * 1.2, 0);
  ctx.translate(0, -bob);

  const seated = pose === 'sit' || pose === 'type' || pose === 'eatSeat' || pose === 'read';
  const crouch = pose === 'crouch' || pose === 'rummage' || pose === 'water';
  const hipY = seated ? -11 : crouch ? -11 : -18;

  // ---- pernas ----
  const pantsC = L.pants || '#3a3f55';
  const shinC = L.shorts ? skin : pantsC;
  const shoeC = z && L.shoeless ? shade(skin, 0.8) : L.slippers ? '#6b4a3a' : L.shoes || '#2b2b2b';
  const legs = [];
  if (seated) {
    legs.push([0.95 * Math.PI / 2, -Math.PI / 2 + 0.1], [Math.PI / 2, -Math.PI / 2]);
  } else if (crouch) {
    legs.push([1.25, -2.3], [0.9, -1.9]);
  } else {
    let amp = z ? 0.32 : 0.42;
    if (needs && needs.energy < 25) amp *= 0.75;
    const a = sw * amp, b = -sw * amp * (z && L.zLimp ? 0.45 : 1);
    legs.push([b, b < 0 ? b * 0.9 : -b * 0.8], [a, a < 0 ? a * 0.9 : -a * 0.8]);
    if (L.cane && !moving) { legs[0] = [-0.05, 0]; legs[1] = [0.05, 0]; }
  }
  const drawLeg = (hx, [a1, a2], dark) => {
    const pc = dark ? shade(pantsC, 0.82) : pantsC;
    const [fx, fy] = limb(ctx, hx, -17, a1, 9, a2, 9, 5.2, pc, dark ? shade(shinC, 0.85) : shinC);
    if (z && !dark && !L.shorts) circle(ctx, hx + Math.sin(a1) * 9, -17 + Math.cos(a1) * 9, 1.8, skin); // joelho rasgado
    // sapato apontando para a frente
    rr(ctx, fx - 2.4, fy - 2.2, 6.5, 3.6, 1.6, dark ? shade(shoeC, 0.8) : shoeC);
    if (L.slippers) rr(ctx, fx - 2.4, fy + 0.5, 6.5, 1, 0.5, dark ? '#8a7a68' : '#b8a68e');
  };
  // dress: saia cobre as coxas
  const dress = L.outfit === 'dress' || L.outfit === 'apronDress';

  // ---- parte de cima (gira para inclinar) ----
  const shoulderBack = [-5.5, -33], shoulderFront = [4.5, -33];
  const coat = L.coat || '#888';
  const sleeveC = L.outfit === 'cardigan' || L.outfit === 'jacket' ? coat : L.shirt || '#ccc';
  const bareArms = L.outfit === 'tank';
  const foreC = bareArms || (z && L.zArm === 'dangle') ? skin : L.outfit === 'tee' || L.outfit === 'apronDress' ? skin : sleeveC;
  const upperC = bareArms ? skin : sleeveC;

  // braços: [a1, a2] (ombro, cotovelo)
  let armB = [-sw * 0.35, 0.15], armF = [sw * 0.35, 0.2];
  let holdF = null, holdB = null; // objetos na mão
  const T = t / 1000;
  if (z) {
    const sway = Math.sin(T * 2.2 + ph) * 0.12;
    if (o.bashing) {
      const hit = Math.sin(T * 14 + ph);
      armF = [1.9 + hit * 0.5, 0.4]; armB = [1.7 - hit * 0.5, 0.3];
    } else if (L.zArm === 'dangle') {
      armF = [1.45 + sway, 0.1]; armB = [0.1 + sw * 0.25, 0.05];
    } else {
      armF = [1.5 + sway, 0.08]; armB = [1.35 - sway, 0.1];
    }
  } else if (pose) {
    switch (pose) {
      case 'drink': { const k = Math.min(1, (o.progress ?? 0.5) * 3); armF = [0.6 + 0.9 * k, 0.6 + 1.5 * k]; holdF = 'glass'; break; }
      case 'snack': { const bite = Math.sin(T * 5) > 0.3; armF = bite ? [1.5, 2.1] : [1.1, 1.2]; holdF = 'sandwich'; break; }
      case 'eatSeat': { const bite = Math.sin(T * 4) > 0.2; armF = bite ? [1.5, 2.1] : [1.2, 0.6]; holdF = 'fork'; armB = [1.3, 0.3]; break; }
      case 'cook': armF = [1.2, 0.3 + Math.sin(T * 6) * 0.3]; holdF = 'spoon'; armB = [1.0, 0.4]; break;
      case 'type': armF = [1.1, 0.5 + Math.sin(T * 18) * 0.12]; armB = [1.0, 0.5 + Math.cos(T * 16) * 0.12]; break;
      case 'read': armF = [1.0, 1.6]; armB = [0.9, 1.5]; holdF = 'paper'; break;
      case 'sit': armF = [0.4, 1.0]; armB = [0.35, 1.0]; break;
      case 'lab': armF = [1.3, 0.5 + Math.sin(T * 3) * 0.2]; armB = [1.1, 0.5]; holdF = 'pipette'; lean += 0.12; break;
      case 'hammer': { const sw2 = Math.sin(T * 9); armF = [1.8 + sw2 * 0.8, 0.6]; holdF = 'hammer'; armB = [1.2, 0.4]; break; }
      case 'dig': { const sw2 = Math.sin(T * 4); armF = [0.9 + sw2 * 0.4, 0.3]; armB = [1.2 + sw2 * 0.4, 0.3]; holdF = 'shovel'; lean += 0.18 + sw2 * 0.08; break; }
      case 'axe': { const sw2 = Math.sin(T * 5); armF = [2.6 + sw2 * 0.9, 0.2]; armB = [2.4 + sw2 * 0.9, 0.2]; holdF = 'axe'; break; }
      case 'tape': armF = [1.5 + Math.sin(T * 4) * 0.5, 0.4]; armB = [1.4, 0.5]; holdF = 'tape'; break;
      case 'crouch': case 'rummage': armF = [1.1 + Math.sin(T * 5) * 0.3, 0.2]; armB = [0.9 + Math.cos(T * 4) * 0.3, 0.2]; lean += 0.25; break;
      case 'water': armF = [1.3, 0.3]; holdF = 'can'; lean += 0.15; break;
      case 'punch': { const p2 = Math.sin(T * 11); armF = [1.55, p2 > 0 ? 0 : 1.8]; armB = [1.4, p2 > 0 ? 1.8 : 0]; lean += 0.1; break; }
      case 'vial': armF = [2.6, 0.2]; holdF = 'vial'; break;
      case 'work': default: armF = [1.1, 0.7 + Math.sin(T * 14) * 0.25]; armB = [1.0, 0.6]; break;
    }
  } else if (gesture === 'yawn') { armF = [1.5, 2.15]; lean -= 0.05; }
  else if (gesture === 'cough') { armF = [1.4, 2.2]; lean += 0.12 * Math.abs(Math.sin(T * 20)); }
  else if (gesture === 'belly') { armF = [0.3, -1.5]; lean += 0.05; }
  else if (gesture === 'brow') { armF = [2.4, 1.7]; }
  else if (L.cane) { armF = [0.45 + sw * 0.1, -0.1]; holdF = 'cane'; }
  else if (L.bag === 'grocery' || L.bag === 'briefcase') { armF = [0.05 + sw * 0.1, 0]; holdF = L.bag; }
  if (o.rock) lean += Math.sin(T * 1.6) * 0.06;

  // ---- ordem de desenho ----
  ctx.save();
  ctx.translate(0, hipY + 18);
  const upper = () => {
    ctx.translate(0, -18);
    ctx.rotate(lean);
    ctx.translate(0, 18 + breathe * 0.3);
  };
  if (back) {
    // ---- de costas: pernas e braços que vão "para dentro" da tela ficam escondidos pelo corpo ----
    const shoeB = (fx, fy) => rr(ctx, fx - 3, fy - 3.2, 6, 3.6, 1.6, shoeC);
    if (crouch) { shoeB(-3.5, -1); shoeB(3.5, -1); }
    else if (!seated) {
      for (const [lx, lift] of [[-3.3, Math.max(0, sw) * 3.5], [3.3, Math.max(0, -sw) * 3.5]]) {
        seg(ctx, lx, -17, lx, -8 - lift * 0.5, 5.2, pantsC);
        seg(ctx, lx, -8 - lift * 0.5, lx, -1.5 - lift, 5, shinC);
        shoeB(lx, -lift);
      }
    }
    if (dress) poly(ctx, [[-8, -18], [8.5, -18], [10.5, seated || crouch ? -9 : -7], [-9.5, seated || crouch ? -9 : -7]], L.outfit === 'apronDress' ? L.shirt : L.coat || L.shirt);
    ctx.save(); upper();
    drawTorso(ctx, L, z, back, skin);
    rr(ctx, -2, -40, 4.5, 5, 1.5, shade(skin, 0.92));
    ctx.save();
    ctx.translate(0, -39); ctx.rotate(z ? Math.sin(T * 1.3 + ph) * 0.18 : 0); ctx.translate(0, 39);
    drawHead(ctx, L, { z, back, skin, eyes, mouth, T, ph });
    ctx.restore();
    for (const [ax, arm] of [[-7.6, armB], [7.6, armF]]) {
      if (arm[0] > 2.1) {
        // braço erguido (machado, frasco): aparece acima do ombro
        seg(ctx, ax, -33, ax * 0.9, -44, 4.4, upperC);
        circle(ctx, ax * 0.85, -46, 2.3, skin);
      } else if (arm[0] > 0.6) {
        // braço para a frente: só o começo aparece
        seg(ctx, ax, -33, ax * 1.06, -26.5, 4.4, upperC);
      } else {
        const len = 15.5 - Math.abs(arm[0]) * 5;
        seg(ctx, ax, -33, ax * 1.08, -33 + len * 0.52, 4.4, upperC);
        seg(ctx, ax * 1.08, -33 + len * 0.52, ax * 1.1, -33 + len, 4, foreC);
        circle(ctx, ax * 1.1, -33 + len + 0.5, 2.3, skin);
      }
    }
  } else {
    // perna de trás
    drawLeg(-2, legs[0], true);
    // braço de trás (atrás do tronco) — em vista de costas os dois ficam nas laterais
    ctx.save(); upper();
    if (L.bag === 'backpack' && !back) rr(ctx, -12, -35, 6, 15, 2, L.bagColor || '#3a6ea5');
    const [bhx, bhy, bha] = limb(ctx, shoulderBack[0], shoulderBack[1], armB[0], 8, armB[1], 7.5, 4.3, shade(upperC, 0.82), shade(foreC, 0.85));
    circle(ctx, bhx, bhy, 2.3, shade(skin, 0.88));
    ctx.restore();
    drawLeg(2.5, legs[1], false);
    if (dress) {
      poly(ctx, [[-8, -18], [8.5, -18], [10.5, seated || crouch ? -9 : -7], [-9.5, seated || crouch ? -9 : -7]], L.outfit === 'apronDress' ? L.shirt : L.coat || L.shirt);
    }
    // ---- tronco ----
    ctx.save(); upper();
    drawTorso(ctx, L, z, back, skin);
    // pescoço e cabeça
    rr(ctx, -2, -40, 4.5, 5, 1.5, shade(skin, 0.92));
    let tilt = 0;
    if (z) tilt = Math.sin(T * 1.3 + ph) * 0.18 + 0.12;
    if (gesture === 'yawn') tilt = -0.15;
    if (pose === 'drink') tilt = -0.25 * Math.min(1, (o.progress ?? 0.5) * 3);
    if (eyes === 'tired' && !moving && !pose) tilt += Math.sin(T * 0.8) * 0.05 + 0.05;
    ctx.save();
    ctx.translate(0, -39); ctx.rotate(tilt); ctx.translate(0, 39);
    drawHead(ctx, L, { z, back, skin, eyes, mouth, T, ph });
    ctx.restore();
    // braço da frente
    const [hx, hy, ha] = limb(ctx, shoulderFront[0], shoulderFront[1], armF[0], 8, armF[1], 7.5, 4.5, upperC, foreC);
    if (L.outfit === 'cardigan' && !z) circle(ctx, hx - Math.sin(ha) * 1.9, hy - Math.cos(ha) * 1.9, 2.35, shade(foreC, 0.84));
    if (holdF) drawHeld(ctx, holdF, hx, hy, ha, T, L);
    circle(ctx, hx, hy, 2.4, skin);
  }
  if (back && L.bag === 'backpack') rr(ctx, -6, -36, 12, 15, 3, L.bagColor || '#3a6ea5');
  ctx.restore();
  ctx.restore();
  // efeitos sobre a cabeça (fora da escala do personagem)
  ctx.restore();
  if (!z && needs && !o.noBubble) drawNeedFx(ctx, sx, sy, needs, t, ph, gesture, pose);
  if (gesture === 'cough') { const k = ((t + ph) % 7000) / 900; ctx.fillStyle = `rgba(190,220,140,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx + (o.facing || 1) * (14 + k * 8), sy - 42 - k * 4, 3 + k * 5, 0, Math.PI * 2); ctx.fill(); }
}

function drawTorso(ctx, L, z, back, skin) {
  const shirt = L.shirt || '#cccccc';
  const coat = L.coat || '#888888';
  const tank = L.outfit === 'tank';
  if (tank) rr(ctx, -7.5, -37, 15, 21, 5, skin);
  // corpo da camisa
  rr(ctx, tank ? -7 : -8.5, tank ? -34 : -37, tank ? 14 : 17, tank ? 18 : 21, 5.5, shirt);
  if (z) {
    // barra rasgada e sangue
    poly(ctx, [[-8.5, -18], [-5, -15], [-2, -18.5], [1, -14.5], [4.5, -18], [8.5, -15.5], [8.5, -19], [-8.5, -19]], shade(shirt, 0.75));
    for (const [bx, by, br] of L.blood || []) { circle(ctx, bx, by, br, '#7a1f1a'); circle(ctx, bx + 0.6, by + br * 0.7, br * 0.45, '#7a1f1a'); }
  }
  if (back) {
    if (L.outfit === 'cardigan' || L.outfit === 'jacket') {
      rr(ctx, -8.8, -37, 17.6, 21.5, 5.5, coat);
      rr(ctx, -8.8, -37, 3.5, 21.5, [5.5, 0, 0, 5.5], shade(coat, 0.86));
      rr(ctx, 5.3, -37, 3.5, 21.5, [0, 5.5, 5.5, 0], shade(coat, 0.86));
      if (L.outfit === 'cardigan') rr(ctx, -8.8, -18.8, 17.6, 2.8, [0, 0, 5, 5], shade(coat, 0.82));
    }
    rr(ctx, -3, -37.5, 6, 2.5, 1, shade(L.outfit === 'cardigan' || L.outfit === 'jacket' ? coat : shirt, 0.85));
    return;
  }
  switch (L.outfit) {
    case 'cardigan': {
      const cd = shade(coat, 0.82), cl = shade(coat, 1.12);
      rr(ctx, -8.8, -37, 17.6, 21.5, 5.5, coat);
      rr(ctx, -8.8, -37, 5, 21.5, [5.5, 0, 0, 5.5], cd); // lado de trás na sombra
      rr(ctx, -8.8, -18.8, 17.6, 2.8, [0, 0, 5, 5], cd); // barra canelada
      poly(ctx, [[-0.6, -37.3], [5.4, -37.3], [2.6, -27.5]], shirt); // decote em V
      poly(ctx, [[-0.6, -37.6], [2.3, -37.6], [1.2, -33.4]], shade(shirt, 1.08)); // gola
      poly(ctx, [[2.9, -37.6], [5.6, -37.6], [4, -33.6]], shade(shirt, 0.95));
      seg(ctx, -0.6, -37, 2.6, -27.5, 1.1, cl);
      seg(ctx, 5.4, -37, 2.6, -27.5, 1.1, cl);
      seg(ctx, 2.6, -27.5, 2.6, -16.5, 0.9, cd);
      for (const y of [-25.5, -22, -18.6]) circle(ctx, 2.6, y, 0.85, '#6b4a2a');
      rr(ctx, 4.4, -24.5, 3.4, 3.6, 0.8, cd); // bolso
      rr(ctx, 4.4, -24.5, 3.4, 0.9, 0.4, cl);
      break;
    }
    case 'jacket':
      rr(ctx, -8.8, -37, 10, 21.5, 5, coat);
      rr(ctx, 4.5, -37, 4.3, 21.5, 3, coat);
      poly(ctx, [[0.5, -37], [-1.5, -32], [1.2, -33]], shade(coat, 1.25));
      break;
    case 'shirtTie':
      poly(ctx, [[0.2, -37], [4.2, -37], [2.2, -34]], '#ffffff');
      poly(ctx, [[1.6, -34.5], [2.8, -34.5], [3.3, -23], [2.2, -21.5], [1.1, -23]], L.tie || '#2d3a5a');
      break;
    case 'blouse':
      poly(ctx, [[-0.5, -37], [5, -37], [2.2, -32.5]], shade(skin, 0.95));
      for (const y of [-29, -24]) circle(ctx, 2.3, y, 0.8, shade(shirt, 0.75));
      break;
    case 'apronDress':
      rr(ctx, -2, -31, 10, 16, 2, '#f7f4ec');
      rr(ctx, 0.5, -26, 5, 4, 1, shade('#f7f4ec', 0.9));
      break;
    case 'dress':
      rr(ctx, -8.5, -37, 17, 21, 5.5, coat);
      poly(ctx, [[0, -37], [4.5, -37], [2.2, -33.5]], shade(coat, 1.2));
      break;
    case 'tank':
      break;
    default: // camiseta / camisa
      ctx.strokeStyle = col(shade(shirt, 0.8)); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(2, -37.5, 3, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  // cinto
  if (L.outfit !== 'dress' && L.outfit !== 'apronDress' && L.outfit !== 'cardigan' && !z) rr(ctx, -8.5, -17.8, 17, 2, 0.8, shade(L.pants || '#333333', 0.7));
}

// franja de cabelo ralo em volta da cabeça (calvície): faixa contínua com borda ondulada
function fringe(ctx, hx, hy, r, a0, a1, hair) {
  const n = 10;
  const band = (rin, rout, wob, c) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (a0 + ((a1 - a0) * i) / n) * Math.PI;
      const taper = i === 0 || i === n ? 1.6 : i === 1 || i === n - 1 ? 0.5 : 0;
      const ro = rout + (i % 2 ? wob : -wob * 0.3) - taper;
      ctx[i ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * ro, hy + Math.sin(a) * ro);
    }
    for (let i = n; i >= 0; i--) {
      const a = (a0 + ((a1 - a0) * i) / n) * Math.PI;
      ctx.lineTo(hx + Math.cos(a) * rin, hy + Math.sin(a) * rin);
    }
    ctx.closePath();
    ctx.fillStyle = col(c); ctx.fill();
  };
  band(r - 3.8, r + 1.3, 0.7, shade(hair, 0.84)); // sombra
  band(r - 2.6, r + 1.3, 0.7, hair);
}

function drawHead(ctx, L, { z, back, skin, eyes, mouth, T, ph }) {
  const hx = 1, hy = -46, r = 8.6;
  const hair = L.hair || '#3b2a20';
  const hs = z ? (L.hairStyle === 'long' || L.hairStyle === 'bun' ? 'long' : 'messy') : L.hairStyle || 'short';
  // cabelo atrás da cabeça
  if (!back && (hs === 'long' || hs === 'ponytail')) {
    rr(ctx, hx - 10, hy - 6, 9, hs === 'long' ? 17 : 9, 4, shade(hair, 0.9));
  }
  if (hs === 'ponytail') {
    const sw = Math.sin(T * 6 + ph) * 1.5;
    rr(ctx, hx - 13 + sw, hy - 4, 4.5, 11, 2.2, shade(hair, 0.9));
  }
  if (hs === 'bun') circle(ctx, hx - 6.5, hy - 7, 3.6, shade(hair, 0.95));
  // orelha + cabeça
  if (back) { circle(ctx, hx - 8.4, hy + 0.5, 2, shade(skin, 0.9)); circle(ctx, hx + 8.4, hy + 0.5, 2, shade(skin, 0.9)); }
  // cabeça levemente oval, com sombra do lado de trás e no queixo
  ellipse(ctx, hx, hy, r - 0.2, r + 0.3, shade(skin, 0.86));
  ellipse(ctx, hx + (back ? 0 : 0.9), hy - 0.9, r - 1.2, r - 0.7, skin);
  if (!back) {
    ellipse(ctx, hx - 3.7, hy + 0.9, 1.8, 2.5, shade(skin, 0.9));
    ellipse(ctx, hx - 3.5, hy + 1, 0.8, 1.4, shade(skin, 0.74));
  }
  if (z) {
    circle(ctx, hx - 2, hy - 4, 2.2, shade(skin, 0.82));
    circle(ctx, hx + 4, hy + 4.5, 1.6, shade(skin, 0.78));
  }

  // cabelo por cima
  const cap = (from, to, rr2 = r + 0.6, dy = 0) => {
    ctx.beginPath(); ctx.arc(hx - 0.5, hy - 0.5 + dy, rr2, from, to); ctx.closePath();
    ctx.fillStyle = col(hair); ctx.fill();
  };
  if (back) {
    if (hs === 'bald') { /* nada */ }
    else if (hs === 'balding') {
      // coroa calva com franja em ferradura dos lados e atrás
      // de costas: a nuca toda coberta de cabelo branco, com a borda de cima ondulada
      ctx.save();
      ctx.beginPath(); ctx.ellipse(hx, hy, r + 0.9, r + 1.1, 0, 0, Math.PI * 2); ctx.clip();
      for (const [c, dy] of [[shade(hair, 0.84), 1.2], [hair, 0]]) {
        ctx.beginPath();
        ctx.moveTo(hx - r - 2, hy - 1 + dy);
        for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(hx - r + (i + 0.5) * (2 * r / 6.5), hy - 3.6 + dy + (i % 2) * 1.2, hx - r + (i + 1) * (2 * r / 6.5), hy - 1.2 + dy);
        ctx.lineTo(hx + r + 2, hy + r + 2); ctx.lineTo(hx - r - 2, hy + r + 2); ctx.closePath();
        ctx.fillStyle = col(c); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha *= 0.45; ellipse(ctx, hx - 1.5, hy - 5.5, 3, 1.6, '#ffffff'); ctx.globalAlpha /= 0.45;
    } else {
      circle(ctx, hx, hy - 0.5, r + 0.6, hair);
      if (hs === 'long') rr(ctx, hx - 8, hy, 16, 12, 4, hair);
      if (hs === 'ponytail') rr(ctx, hx - 2, hy + 2, 4, 12, 2, shade(hair, 0.9));
      if (hs === 'bun') circle(ctx, hx, hy - 6, 3.8, shade(hair, 0.95));
    }
  } else {
    switch (hs) {
      case 'bald': break;
      case 'balding': {
        // coroa calva; franja fofa em ferradura atrás e dos lados, até a orelha
        fringe(ctx, hx, hy, r, 0.56, 1.2, hair);
        ctx.beginPath(); ctx.moveTo(hx - 4.6, hy - 4.4); ctx.quadraticCurveTo(hx - 1.4, hy - 4.6, hx - 1.5, hy - 1.2);
        ctx.quadraticCurveTo(hx - 2.6, hy - 0.4, hx - 4.6, hy - 1); ctx.closePath();
        ctx.fillStyle = col(hair); ctx.fill(); // costeleta sobre a orelha
        ctx.globalAlpha *= 0.5; ellipse(ctx, hx + 2, hy - 6, 3, 1.5, '#ffffff'); ctx.globalAlpha /= 0.5; // brilho
        ctx.strokeStyle = col(hair); ctx.lineWidth = 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - 3, hy - 7.4); ctx.quadraticCurveTo(hx + 0.5, hy - 11, hx + 3.4, hy - 8.8); ctx.stroke(); // fios ralos
        break;
      }
      case 'buzz':
        ctx.globalAlpha *= 0.7; cap(Math.PI * 1.02, Math.PI * 1.98, r + 0.3); ctx.globalAlpha /= 0.7;
        break;
      case 'curly':
        for (let i = 0; i < 7; i++) { const a = Math.PI * (0.95 + i * 0.16); circle(ctx, hx + Math.cos(a) * (r - 1), hy + Math.sin(a) * (r - 1) - 1, 3.4, i % 2 ? hair : shade(hair, 0.9)); }
        break;
      case 'messy':
        cap(Math.PI * 1.05, Math.PI * 1.55);
        cap(Math.PI * 1.65, Math.PI * 1.9, r + 0.4);
        rr(ctx, hx - 10, hy - 5, 4.5, 7, 2, hair);
        break;
      case 'side':
        cap(Math.PI * 1.0, Math.PI * 1.95);
        rr(ctx, hx - 9.8, hy - 6, 5, 9, 2, hair);
        poly(ctx, [[hx - 2, hy - 9.5], [hx + 8.5, hy - 5], [hx + 2, hy - 8]], shade(hair, 1.15));
        break;
      case 'bob':
        cap(Math.PI * 0.95, Math.PI * 2.0);
        rr(ctx, hx - 10, hy - 6, 6, 12, 3, hair);
        break;
      case 'long': case 'ponytail': case 'bun':
        cap(Math.PI * 1.0, Math.PI * 1.98);
        rr(ctx, hx - 9.8, hy - 6, 5, hs === 'long' ? 12 : 8, 2.5, hair);
        break;
      default: // short
        cap(Math.PI * 1.02, Math.PI * 1.96);
        rr(ctx, hx - 9.6, hy - 6, 5, 8, 2, hair);
    }
  }

  // chapéus
  if (L.hat === 'cap') {
    ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, r + 1, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = col(L.hatColor || '#e63946'); ctx.fill();
    if (!back) rr(ctx, hx + 4, hy - 3, 9, 2.2, 1, shade(L.hatColor || '#e63946', 0.8));
  } else if (L.hat === 'band') {
    rr(ctx, hx - 9, hy - 5.5, 18, 2.6, 1.2, L.hatColor || '#00b4d8');
  } else if (L.hat === 'fedora') {
    ellipse(ctx, hx, hy - 6.5, 12, 3, '#4a3f35');
    rr(ctx, hx - 6.5, hy - 14, 13, 8, 3, '#5a4d40');
    rr(ctx, hx - 6.5, hy - 8.5, 13, 2, 0.5, '#2a2420');
  }
  if (back) return;

  // ---- rosto (olhando para a direita) ----
  const ex1 = hx + 2.2, ex2 = hx + 6.2, ey = hy - 0.5;
  if (z) {
    ellipse(ctx, ex1, ey, 2.4, 2, shade(skin, 0.62));
    ellipse(ctx, ex2, ey, 2.2, 1.9, shade(skin, 0.62));
    circle(ctx, ex1, ey, 1.3, '#f2f0d8'); circle(ctx, ex2, ey, 1.2, '#f2f0d8');
    circle(ctx, ex1 + 0.3, ey, 0.55, '#c0281f'); circle(ctx, ex2 + 0.3, ey, 0.5, '#c0281f');
    seg(ctx, ex1 - 1.5, ey - 3, ex1 + 1.5, ey - 2.2, 1, shade(skin, 0.5));
    seg(ctx, ex2 - 1.3, ey - 2.2, ex2 + 1.3, ey - 3, 1, shade(skin, 0.5));
  } else if (eyes === 'closed') {
    seg(ctx, ex1 - 1.1, ey + 0.3, ex1 + 1.1, ey + 0.3, 1, '#3a2a22');
    seg(ctx, ex2 - 1, ey + 0.3, ex2 + 1, ey + 0.3, 1, '#3a2a22');
  } else {
    ellipse(ctx, ex1 + 0.2, ey, 0.95, 1.15, '#2b2622');
    ellipse(ctx, ex2 + 0.1, ey, 0.8, 1.05, '#2b2622');
    circle(ctx, ex1 + 0.5, ey - 0.45, 0.35, '#ffffff');
    if (eyes === 'tired') {
      // pálpebras pesadas e olheiras
      rr(ctx, ex1 - 1.6, ey - 1.8, 3.2, 1.8, 0.8, skin);
      rr(ctx, ex2 - 1.5, ey - 1.8, 3, 1.8, 0.8, skin);
      seg(ctx, ex1 - 1.2, ey + 1.7, ex1 + 1, ey + 1.7, 0.8, shade(skin, 0.78));
    }
    // sobrancelhas
    const old = (L.age || 0) >= 0.6;
    const bc = old ? shade(L.hair || '#333333', 0.9) : shade(L.hair || '#333333', 0.75);
    const bw = old ? 1.3 : 1, by = L.glasses ? -3.4 : -2.9;
    const bcc = old ? shade(L.hair || '#333333', 0.72) : bc;
    seg(ctx, ex1 - 1.1, ey + by + 0.3, ex1 + 0.9, ey + by - 0.3, bw, bcc);
    seg(ctx, ex2 - 0.7, ey + by - 0.3, ex2 + 1, ey + by + 0.1, bw, bcc);
  }
  // nariz
  ctx.beginPath();
  ctx.moveTo(hx + 7.3, hy - 2);
  ctx.quadraticCurveTo(hx + 11.2, hy + 1.2, hx + 8.9, hy + 2.9);
  ctx.quadraticCurveTo(hx + 7.6, hy + 3.4, hx + 7, hy + 2.2);
  ctx.closePath();
  ctx.fillStyle = col(shade(skin, 0.9)); ctx.fill();
  // boca
  const mx = hx + 5, my = hy + 5;
  if (mouth === 'zombie') {
    const open = 1.6 + Math.abs(Math.sin(T * 2 + ph)) * 1.6;
    ellipse(ctx, mx, my, 2.8, open, '#3a1414');
    rr(ctx, mx - 1.8, my - open + 0.2, 1.1, 1.1, 0.2, '#e8e2c8');
    rr(ctx, mx + 0.4, my - open + 0.2, 1.1, 1.1, 0.2, '#e8e2c8');
    seg(ctx, mx + 1.5, my + open, mx + 1.7, my + open + 3, 1, '#7a1f1a');
  } else if (mouth === 'yawn') {
    ellipse(ctx, mx, my, 2, 2.6, '#5a2a2a');
  } else if (mouth === 'open') {
    ellipse(ctx, mx, my, 1.5, 1.3, '#5a2a2a');
  } else if (mouth === 'chew') {
    const c = Math.abs(Math.sin(T * 9));
    ellipse(ctx, mx, my, 1.8, 0.4 + c * 0.9, '#6a3030');
  } else {
    ctx.strokeStyle = col('#7a4a3a'); ctx.lineWidth = 1;
    ctx.beginPath();
    if (mouth === 'smile') ctx.arc(mx, my - (L.beard === 'mustache' ? 0.6 : 1.6), 2.2, 0.35 * Math.PI, 0.75 * Math.PI);
    else { ctx.moveTo(mx - 1.8, my); ctx.lineTo(mx + 1.8, my); }
    ctx.stroke();
  }
  if (L.body === 'f' && !z) circle(ctx, hx + 6.8, hy + 2.6, 1.5, 'rgba(230,120,120,.25)');
  // barba / bigode
  if (L.beard === 'mustache' || L.beard === 'full') {
    const mc = mix(L.hair || '#333333', '#999999', 0.15);
    ctx.beginPath();
    ctx.moveTo(mx - 3, my - 0.4);
    ctx.quadraticCurveTo(mx - 2.4, my - 3.1, mx + 0.6, my - 2.7);
    ctx.quadraticCurveTo(mx + 3.6, my - 3.4, mx + 4.1, my - 0.8);
    ctx.quadraticCurveTo(mx + 3.7, my + 0.9, mx + 2.7, my - 0.2);
    ctx.quadraticCurveTo(mx + 0.8, my - 1.2, mx - 1.2, my - 0.1);
    ctx.quadraticCurveTo(mx - 2.5, my + 0.9, mx - 3, my - 0.4);
    ctx.fillStyle = col(mc); ctx.fill();
    seg(ctx, mx - 1.6, my - 1.1, mx + 3, my - 1.3, 0.5, shade(mc, 0.85));
  }
  if (L.beard === 'full') { ctx.beginPath(); ctx.arc(hx + 2, hy + 1, r + 0.2, 0.08 * Math.PI, 0.7 * Math.PI); ctx.lineTo(hx + 2, hy + 4); ctx.closePath(); ctx.fillStyle = col(L.hair); ctx.fill(); }
  if (L.beard === 'stubble') { ctx.globalAlpha *= 0.3; ctx.beginPath(); ctx.arc(hx + 2, hy + 1, r, 0.1 * Math.PI, 0.65 * Math.PI); ctx.lineTo(hx + 2, hy + 4); ctx.closePath(); ctx.fillStyle = col(L.hair); ctx.fill(); ctx.globalAlpha /= 0.3; }
  // óculos
  if (L.glasses) {
    // lentes levemente azuladas, aro fino de tartaruga, haste até a orelha
    ctx.globalAlpha *= 0.35;
    ellipse(ctx, ex1, ey + 0.1, 2.1, 1.9, '#cfe6f5');
    ellipse(ctx, ex2 + 0.1, ey + 0.1, 1.6, 1.8, '#cfe6f5');
    ctx.globalAlpha /= 0.35;
    ctx.strokeStyle = col('#5a4232'); ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.ellipse(ex1, ey + 0.1, 2.1, 1.9, 0, 0, Math.PI * 2);
    ctx.moveTo(ex2 + 1.7, ey + 0.1); ctx.ellipse(ex2 + 0.1, ey + 0.1, 1.6, 1.8, 0, 0, Math.PI * 2);
    ctx.moveTo(ex1 + 2.1, ey - 0.3); ctx.quadraticCurveTo(ex1 + 3, ey - 1, ex2 - 1.5, ey - 0.3);
    ctx.moveTo(ex1 - 2.1, ey - 0.2); ctx.lineTo(hx - 3.4, hy - 0.6);
    ctx.stroke();
    seg(ctx, ex1 + 0.4, ey - 1, ex1 + 1.2, ey - 0.3, 0.45, 'rgba(255,255,255,.8)');
  }
}

// objetos na mão da frente (mão em hx,hy; ângulo do antebraço ha)
function drawHeld(ctx, what, hx, hy, ha, T, L) {
  const dx = Math.sin(ha), dy = Math.cos(ha);
  switch (what) {
    case 'glass':
      rr(ctx, hx - 1.8, hy - 6, 3.6, 6.5, 1, 'rgba(200,230,255,.85)');
      rr(ctx, hx - 1.4, hy - 3.5, 2.8, 3.5, 0.8, 'rgba(110,170,230,.9)');
      break;
    case 'sandwich':
      rr(ctx, hx - 1, hy - 4, 6, 3.4, 1.2, '#e8c27a');
      rr(ctx, hx - 1, hy - 2.5, 6, 0.9, 0.4, '#7cb342');
      break;
    case 'fork':
      seg(ctx, hx, hy, hx + dx * 5, hy + dy * 5, 1, '#c9ced6');
      break;
    case 'spoon':
      seg(ctx, hx, hy, hx + 4, hy + 6, 1.4, '#a7774a');
      break;
    case 'paper':
      poly(ctx, [[hx - 1, hy - 9], [hx + 7, hy - 7], [hx + 7, hy + 3], [hx - 1, hy + 1]], '#f2efe6');
      for (let i = 0; i < 4; i++) seg(ctx, hx + 0.5, hy - 6.5 + i * 2.4, hx + 5.5, hy - 5 + i * 2.4, 0.6, '#9aa0a8');
      break;
    case 'pipette':
      seg(ctx, hx, hy, hx + 2, hy + 7, 1.3, '#e8f0f6');
      circle(ctx, hx + 2, hy + 7.5, 0.8, '#7dff9a');
      break;
    case 'hammer':
      seg(ctx, hx, hy, hx + dx * 8, hy + dy * 8, 1.6, '#8a5a3c');
      seg(ctx, hx + dx * 8 - dy * 3, hy + dy * 8 + dx * 3, hx + dx * 8 + dy * 3, hy + dy * 8 - dx * 3, 2.6, '#6c737f');
      break;
    case 'shovel':
      seg(ctx, hx - 6, hy - 6, hx + 6, hy + 14, 1.6, '#8a5a3c');
      poly(ctx, [[hx + 4, hy + 13], [hx + 9, hy + 12], [hx + 10, hy + 18], [hx + 6, hy + 19]], '#8e96a3');
      break;
    case 'axe':
      seg(ctx, hx, hy, hx + dx * 11, hy + dy * 11, 1.8, '#8a5a3c');
      poly(ctx, [[hx + dx * 9, hy + dy * 9], [hx + dx * 12 + dy * 4, hy + dy * 12 - dx * 4], [hx + dx * 7 + dy * 4, hy + dy * 7 - dx * 4]], '#9aa3b0');
      break;
    case 'tape':
      circle(ctx, hx + 1, hy + 1, 2.4, '#c9c3b5');
      circle(ctx, hx + 1, hy + 1, 1, '#8a8478');
      break;
    case 'can':
      rr(ctx, hx - 2, hy - 1, 6, 5, 1, '#5e9bd1');
      seg(ctx, hx + 4, hy, hx + 8, hy + 3, 1.2, '#5e9bd1');
      for (let i = 0; i < 3; i++) { const k = ((T * 2 + i / 3) % 1); circle(ctx, hx + 8.5 + k * 1.5, hy + 4 + k * 9, 0.8, '#9cd3ff'); }
      break;
    case 'vial':
      rr(ctx, hx - 1, hy - 7, 2.2, 7, 1, 'rgba(220,240,220,.9)');
      rr(ctx, hx - 0.8, hy - 3, 1.8, 3, 0.8, '#9acd32');
      break;
    case 'cane':
      seg(ctx, hx, hy, hx + 2, hy + 17, 1.6, '#5a3d2b');
      seg(ctx, hx, hy, hx - 2.5, hy - 1, 1.6, '#5a3d2b');
      break;
    case 'grocery':
      rr(ctx, hx - 3.5, hy, 7, 8, 1.5, '#e9dcc4');
      circle(ctx, hx - 1, hy, 1.8, '#7cb342');
      circle(ctx, hx + 1.6, hy - 0.5, 1.5, '#e53935');
      break;
    case 'briefcase':
      rr(ctx, hx - 4, hy + 0.5, 8, 6, 1, '#4a3628');
      break;
  }
}

// balão de pensamento com a necessidade mais urgente, zZz de sono, suor de sede
function drawNeedFx(ctx, sx, sy, needs, t, ph, gesture, pose) {
  const list = [];
  if (needs.hunger < 30) list.push(['hunger', '#e0a050']);
  if (needs.thirst < 30) list.push(['thirst', '#6fb3e8']);
  if (needs.energy < 25) list.push(['energy', '#e8d36f']);
  if (needs.health < 35) list.push(['health', '#e07070']);
  if (needs.contamination > 40) list.push(['biohazard', '#9ccc65']);
  if (needs.energy < 25 && !pose) {
    const k = ((t + ph) / 1600) % 1;
    ctx.fillStyle = `rgba(220,226,236,${0.9 * (1 - k)})`;
    ctx.font = '600 10px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('z', sx + 9 + k * 6, sy - 58 - k * 12);
  }
  if (!list.length) return;
  const cyc = (t + ph) % 6000;
  if (cyc > 3200) return; // aparece e some
  const [name, c] = list[Math.floor((t + ph) / 6000) % list.length];
  const a = Math.min(1, cyc / 250, (3200 - cyc) / 250);
  const bx = sx + 16, by = sy - 76 + Math.sin(t / 400) * 1.5;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(245,244,240,.95)';
  ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 8, sy - 63, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 5, sy - 58, 1.5, 0, Math.PI * 2); ctx.fill();
  drawIcon(ctx, name, bx, by, 12, c === '#e8d36f' ? '#b89b2a' : c, 2.2);
  ctx.restore();
  if (gesture === 'brow') {
    ctx.fillStyle = 'rgba(160,210,255,.85)';
    ctx.beginPath(); ctx.arc(sx - 4, sy - 50 + ((t / 30) % 8), 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

// Dormindo: cabeça no travesseiro, respirando
export function drawSleeperHead(ctx, sx, sy, t = performance.now()) {
  const L = PLAYER_LOOK;
  circle(ctx, sx + 2, sy - 3, 8.5, L.hair);
  circle(ctx, sx - 1, sy, 7.6, L.skin);
  circle(ctx, sx - 4, sy - 4, 3, L.hair);
  rr(ctx, sx - 3.5, sy + 2.3, 5, 1.6, 0.8, mix(L.hair, '#999999', 0.2));
  ctx.strokeStyle = col('#3a2a22');
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy - 1.2); ctx.lineTo(sx - 2.4, sy - 0.6);
  ctx.moveTo(sx + 0.5, sy + 0.2); ctx.lineTo(sx + 3, sy + 0.9);
  ctx.stroke();
}

// Sentado no sofá, visto de costas (olhando para a TV); cochila quando está cansado
export function drawSitterBack(ctx, sx, sy, t = performance.now(), tired = false) {
  const L = PLAYER_LOOK;
  const nod = tired ? Math.max(0, Math.sin(t / 900)) * 3 : 0;
  rr(ctx, -12 + sx, sy - 22, 4.5, 14, 2, shade(L.coat, 0.85));
  rr(ctx, 7.5 + sx, sy - 22, 4.5, 14, 2, shade(L.coat, 0.85));
  rr(ctx, -9 + sx, sy - 26, 18, 26, 6, L.coat);
  circle(ctx, sx, sy - 34 + nod, 9.2, L.skin);
  ctx.beginPath(); ctx.arc(sx, sy - 34 + nod, 9.5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineTo(sx - 7, sy - 36 + nod); ctx.lineTo(sx + 7, sy - 36 + nod); ctx.closePath();
  ctx.fillStyle = col(L.hair); ctx.fill();
  ctx.strokeStyle = col('#333'); ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(sx - 9.2, sy - 35 + nod); ctx.lineTo(sx - 7, sy - 32 + nod);
  ctx.moveTo(sx + 9.2, sy - 35 + nod); ctx.lineTo(sx + 7, sy - 32 + nod);
  ctx.stroke();
}
