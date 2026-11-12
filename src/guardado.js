// Guardado de partidas en 4 ranuras (localStorage: en la web, del navegador; en la app de escritorio, de la propia app).
// Se puede guardar en cualquier momento: en casa, en órbita o explorando un planeta.
const RANURAS = 4;
const clave = n => `cohete-del-granero:ranura:${n}:v2`;
const CLAVE_ANTIGUA = "cohete-del-granero:partida:v1"; // la versión anterior tenía una sola partida
const CLAVE_ELEGIDA = "cohete-del-granero:cargar"; // ranura a cargar tras recargar la página

const leer = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const valida = d => d && d.version === 2 && d.estado && typeof d.estado === "object";

// La partida única de la versión anterior pasa a la ranura 1 (si está libre).
(function migrar() {
  try {
    const vieja = leer(CLAVE_ANTIGUA);
    if (vieja && vieja.version === 1 && vieja.estado && !localStorage.getItem(clave(1))) {
      localStorage.setItem(clave(1), JSON.stringify({ ...vieja, version: 2, donde: "granero" }));
    }
    if (vieja) localStorage.removeItem(CLAVE_ANTIGUA);
  } catch { /* sin almacenamiento */ }
})();

export const NUM_RANURAS = RANURAS;

export function guardarRanura(n, datos) {
  try {
    localStorage.setItem(clave(n), JSON.stringify({ version: 2, fecha: Date.now(), ...datos }));
    return true;
  } catch {
    return false; // navegación privada o almacenamiento lleno: el juego sigue igual
  }
}

export function cargarRanura(n) {
  const d = leer(clave(n));
  return valida(d) ? d : null;
}

export function borrarRanura(n) {
  try { localStorage.removeItem(clave(n)); } catch { /* nada que borrar */ }
}

// Lista de las 4 ranuras: { n, datos } (datos = null si está vacía)
export function listarRanuras() {
  return Array.from({ length: RANURAS }, (_, i) => ({ n: i + 1, datos: cargarRanura(i + 1) }));
}

// Para cargar otra partida en pleno juego se recarga la página con la ranura elegida.
export function elegirParaRecargar(n) {
  try { sessionStorage.setItem(CLAVE_ELEGIDA, String(n)); } catch { /* nada */ }
}
export function ranuraElegida() {
  try {
    const n = Number(sessionStorage.getItem(CLAVE_ELEGIDA));
    sessionStorage.removeItem(CLAVE_ELEGIDA);
    return n >= 1 && n <= RANURAS ? n : 0;
  } catch {
    return 0;
  }
}
