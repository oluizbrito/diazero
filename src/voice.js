// Narração e vozes dos personagens com a síntese de voz do navegador (Web Speech API),
// usando as vozes em português instaladas no aparelho. Cada personagem tem um timbre:
// gênero + tom + velocidade (vizinhos ganham um tom próprio derivado do nome).
// Desligado por padrão: o jogador liga no Menu.
const KEY = 'diazero.voice.v2'; // nova chave: começa desligado mesmo para quem já testou
const settings = { on: false, vol: 0.9 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {} };

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
function loadVoices() {
  if (!synth) return;
  const all = synth.getVoices();
  voices = all.filter((v) => /^pt[-_]BR/i.test(v.lang));
  if (!voices.length) voices = all.filter((v) => /^pt/i.test(v.lang));
}
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

const FEM = /maria|francisca|luciana|vit[oó]ria|fernanda|leila|thalita|yara|raquel|female|feminin|google portugu/i;
const MAL = /daniel|ant[oô]nio|felipe|fabio|f[aá]bio|donato|julio|j[uú]lio|nicolau|valerio|humberto|male|masculin/i;
const quality = (v) => (/natural|online|neural/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : 1);

// escolhe a melhor voz do gênero pedido; se só houver uma, o tom diferencia
function voiceFor(g, k = 0) {
  if (!voices.length) return null;
  let list = voices.filter((v) => (g === 'f' ? FEM.test(v.name) && !MAL.test(v.name) : MAL.test(v.name)));
  if (!list.length) list = voices;
  list = list.slice().sort((a, b) => quality(b) - quality(a));
  const top = list.filter((v) => quality(v) === quality(list[0]));
  return top[k % top.length];
}
const hasGender = (g) => voices.some((v) => (g === 'f' ? FEM.test(v.name) && !MAL.test(v.name) : MAL.test(v.name)));

// perfis de voz
export const VOICES = {
  narrator: { g: 'm', pitch: 0.92, rate: 0.95 },
  doctor: { g: 'm', pitch: 0.78, rate: 0.9 },
  anchor: { g: 'f', pitch: 1.05, rate: 1.06 },
  radio: { g: 'm', pitch: 0.95, rate: 1.02 },
};
const h01 = (str) => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h / 9973; };
// vizinhos e sobreviventes: voz pelo gênero, tom pelo nome
export function personVoice(name, female, old = false) {
  const k = h01(name);
  return { g: female ? 'f' : 'm', pitch: (female ? 1.08 : 0.86) + (k - 0.5) * 0.3 - (old ? 0.08 : 0), rate: 0.95 + (k - 0.5) * 0.14 - (old ? 0.06 : 0), k: Math.floor(k * 10) };
}

export const voiceSettings = () => ({ ...settings, available: !!synth && voices.length > 0 });
export function setVoiceOn(on) { settings.on = !!on; if (!on) hush(); save(); }

let duck = null;
export function onSpeaking(fn) { duck = fn; }

const clean = (t) => String(t)
  .replace(/<[^>]+>/g, '')
  .replace(/["“”]/g, '')
  .replace(/\s*\([^)]*\)/g, '') // efeitos entre parênteses (+2 comida…) não são falados
  .replace(/\.\.\.|…/g, '. ')
  .replace(/Dr\./g, 'Doutor')
  .replace(/Dia -(\d)/g, 'Dia menos $1')
  .replace(/R\$\s?(\d+)/g, '$1 reais')
  .replace(/\s+/g, ' ')
  .trim();

// o Chrome corta falas longas: divide por frases
const chunks = (t) => (t.match(/[^.!?]+[.!?]*/g) || [t]).map((x) => x.trim()).filter(Boolean);

let token = 0, pending = 0;
// Fala um texto. Retorna uma Promise que resolve quando termina (ou na hora, se as vozes estão desligadas).
// queue: espera as falas anteriores; senão interrompe o que estiver falando.
export function say(text, who = VOICES.narrator, { queue = false } = {}) {
  if (!synth || !settings.on || !voices.length) return Promise.resolve(false);
  const txt = clean(text);
  if (!txt) return Promise.resolve(false);
  if (!queue) hush();
  const my = token;
  const v = voiceFor(who.g, who.k || 0);
  // mesma voz para homem e mulher: o tom faz a diferença
  let pitch = who.pitch ?? 1;
  if (!hasGender(who.g)) pitch += who.g === 'f' ? 0.25 : -0.15;
  const parts = chunks(txt);
  return new Promise((resolve) => {
    let left = parts.length;
    for (const part of parts) {
      const u = new SpeechSynthesisUtterance(part);
      if (v) u.voice = v;
      u.lang = v?.lang || 'pt-BR';
      u.pitch = Math.max(0.1, Math.min(2, pitch));
      u.rate = who.rate ?? 1;
      u.volume = settings.vol;
      u.onstart = () => { pending++; duck?.(true); };
      const end = () => {
        pending = Math.max(0, pending - 1);
        if (!pending) duck?.(false);
        if (--left <= 0 || my !== token) resolve(my === token);
      };
      u.onend = end; u.onerror = end;
      synth.speak(u);
    }
  });
}

export function hush() {
  token++;
  pending = 0;
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
  duck?.(false);
}
