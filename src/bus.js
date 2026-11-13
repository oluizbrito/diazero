// Barramento de eventos simples: a simulação emite, a interface escuta.
const handlers = {};

export const bus = {
  on(type, fn) {
    (handlers[type] ||= []).push(fn);
  },
  emit(type, payload) {
    (handlers[type] || []).forEach((fn) => fn(payload));
  },
};

export const toast = (msg, kind = 'info') => bus.emit('toast', { msg, kind });
