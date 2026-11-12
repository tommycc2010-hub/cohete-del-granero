// Guardado automático en el navegador (localStorage). Solo se guarda estando en casa:
// si cierras el juego en plena misión, vuelves al granero como estabas antes de despegar.
const CLAVE = "cohete-del-granero:partida:v1";

export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ version: 1, fecha: Date.now(), ...datos }));
    return true;
  } catch {
    return false; // navegación privada o almacenamiento bloqueado: el juego sigue igual
  }
}

export function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return datos && datos.version === 1 && datos.estado ? datos : null;
  } catch {
    return null;
  }
}

export function borrar() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
}
