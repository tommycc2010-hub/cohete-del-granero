// Reglas del juego, sin nada visual. La parte 3D y el HUD leen `estado` y llaman a estas funciones.
import { DATOS_PLANETAS, OBJETOS } from "./datos.js";

export const ORDEN = ["mercurio", "venus", "marte", "jupiter", "europa"];
export const MEJORAS = {
  motor:  { nombre: "Motor",          base: 150, max: 5, desc: "Gasta menos combustible por viaje. Añade masa." },
  tanque: { nombre: "Tanque",         base: 120, max: 5, desc: "+20 de capacidad de combustible. Añade masa." },
  escudo: { nombre: "Escudo térmico", base: 200, max: 5, desc: "Protege la carga en la reentrada." },
  sensor: { nombre: "Sensores",       base: 180, max: 5, desc: "Más probabilidad de objetos raros." },
  antena: { nombre: "Antena",         base: 250, max: 3, desc: "Nivel 2 necesario para la señal de Europa." },
};
export const COMBUSTIBLE_PRECIO = 2;
export const COSTO_EXPLORAR = 3;
export const ENCUENTROS = 4;

export const estado = {
  dinero: 100,
  combustible: 60,
  mejoras: { motor: 0, tanque: 0, escudo: 0, sensor: 0, antena: 0 },
  carga: [],
  visitados: {},
  mision: null,
  final: false,
  log: ["Bienvenido al granero. El cohete necesita reparaciones."],
};

const oyentes = [];
export function suscribir(fn) { oyentes.push(fn); }
function cambio() { oyentes.forEach(fn => fn(estado)); }

function msg(t) {
  estado.log.unshift(t);
  estado.log = estado.log.slice(0, 6);
  return t;
}

export function capacidad() { return 60 + 20 * estado.mejoras.tanque; }

export function factorMasa() {
  const m = estado.mejoras;
  return 1 + 0.1 * m.motor + 0.08 * (m.tanque + m.escudo + m.sensor + m.antena);
}

export function costoIda(id) {
  return Math.ceil(DATOS_PLANETAS[id].distancia * 12 * factorMasa() / (1 + 0.25 * estado.mejoras.motor));
}

export function desbloqueado(id) {
  if (id === "mercurio") return true;
  if (id === "europa") return !!estado.visitados.jupiter && estado.mejoras.antena >= 2;
  return !!estado.visitados[ORDEN[ORDEN.indexOf(id) - 1]];
}

// Cada acción devuelve el mensaje que explica lo que pasó.
export function comprarCombustible(cant) {
  cant = Math.min(cant, capacidad() - estado.combustible, Math.floor(estado.dinero / COMBUSTIBLE_PRECIO));
  if (cant <= 0) {
    const t = msg(estado.combustible >= capacidad() ? "El tanque ya está lleno." : "No te alcanza el dinero para combustible.");
    cambio();
    return t;
  }
  estado.combustible += cant;
  estado.dinero -= cant * COMBUSTIBLE_PRECIO;
  const t = msg(`Compraste ${cant} de combustible.`);
  cambio();
  return t;
}

export function costoMejora(k) { return MEJORAS[k].base * (estado.mejoras[k] + 1); }

export function comprarMejora(k) {
  const lvl = estado.mejoras[k];
  let t;
  if (lvl >= MEJORAS[k].max) t = msg("Ya está al máximo.");
  else if (estado.dinero < costoMejora(k)) t = msg(`Te faltan ${costoMejora(k) - estado.dinero} para ${MEJORAS[k].nombre}.`);
  else {
    estado.dinero -= costoMejora(k);
    estado.mejoras[k]++;
    t = msg(`Mejoraste ${MEJORAS[k].nombre} al nivel ${lvl + 1}.`);
  }
  cambio();
  return t;
}

export function vender() {
  let t;
  if (!estado.carga.length) t = msg("No tienes carga que vender.");
  else {
    const total = estado.carga.reduce((s, o) => s + o.valor, 0);
    estado.dinero += total;
    t = msg(`Vendiste ${estado.carga.length} objetos por ${total}.`);
    estado.carga = [];
  }
  cambio();
  return t;
}

export function iniciarMision(id) {
  let t;
  const ida = costoIda(id);
  if (!desbloqueado(id)) t = msg("Destino bloqueado.");
  else if (estado.combustible < ida * 2) t = msg(`Necesitas ${ida * 2} de combustible para ir y volver.`);
  else {
    estado.combustible -= ida;
    estado.visitados[id] = true;
    estado.mision = { dest: id, ida, hecho: 0, encuentros: ENCUENTROS, carga: [], ultimo: "" };
    t = msg(`Despegaste hacia ${DATOS_PLANETAS[id].nombre}.`);
  }
  cambio();
  return t;
}

export function tirarObjeto(id) {
  const s = 1 + 0.3 * estado.mejoras.sensor;
  const pesos = OBJETOS.map(o => o.prob * (o.valor >= 200 ? s : 1));
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < pesos.length - 1 && (r -= pesos[i]) > 0) i++;
  const base = OBJETOS[i];
  return {
    nombre: base.nombre,
    valor: Math.round(base.valor * (0.5 + DATOS_PLANETAS[id].peligro)),
    color: base.color,
  };
}

// ----- Vuelo en 3D -----
// Objetos que flotan cerca del destino, ordenados del más barato al más valioso.
// La escena coloca los valiosos más lejos: ir por ellos cuesta más combustible.
export function generarCampo(id, n = 9) {
  return Array.from({ length: n }, () => tirarObjeto(id)).sort((a, b) => a.valor - b.valor);
}

// Combustible por segundo de impulso. Más masa gasta más; un mejor motor gasta menos.
export function consumoImpulso() {
  return 0.5 * factorMasa() / (1 + 0.25 * estado.mejoras.motor);
}

// Alcance al que los sensores identifican un objeto.
export function alcanceSensor() { return 50 + 35 * estado.mejoras.sensor; }

export function gastar(cantidad) {
  estado.combustible = Math.max(0, estado.combustible - cantidad);
}

export function recolectar(o) {
  const m = estado.mision;
  if (!m) return "";
  m.carga.push(o);
  m.hecho++;
  const t = msg(`Recogiste ${o.nombre} (valor ${o.valor}).`);
  cambio();
  return t;
}

// El final: la nave llega al origen de la señal de Europa.
export function detectarSenal() {
  estado.final = true;
  const t = msg("📡 Detectaste la señal de Europa.");
  cambio();
  return t;
}

// ----- Misión en modo texto (prototipo 2D) -----
export function explorar() {
  const m = estado.mision;
  if (!m) return "";
  if (estado.combustible < COSTO_EXPLORAR + m.ida) {
    const t = msg("No alcanza para explorar y volver. Regresa ya.");
    cambio();
    return t;
  }
  estado.combustible -= COSTO_EXPLORAR;
  m.hecho++;
  if (Math.random() < 0.75) {
    const o = tirarObjeto(m.dest);
    m.carga.push(o);
    m.ultimo = `Encontraste ${o.nombre} (valor ${o.valor}).`;
  } else {
    m.ultimo = "Sin hallazgos en esta zona.";
  }
  const t = msg(m.ultimo);
  if (m.hecho >= m.encuentros) return regresar();
  cambio();
  return t;
}

export function regresar() {
  const m = estado.mision;
  if (!m) return "";
  let carga = m.carga, t;
  if (estado.combustible < m.ida) {
    const rescate = Math.min(80, estado.dinero);
    estado.dinero -= rescate;
    carga = [];
    t = msg(`Sin combustible para volver. Rescate por ${rescate} y carga perdida.`);
  } else {
    estado.combustible -= m.ida;
    const perdida = Math.max(0, 0.3 - 0.06 * estado.mejoras.escudo);
    if (carga.length && Math.random() < perdida) {
      const perdidos = Math.ceil(carga.length / 2);
      carga = carga.slice(perdidos);
      t = msg(`La reentrada dañó ${perdidos} objetos. Mejora el escudo térmico.`);
    } else {
      t = msg(!carga.length ? "Regresaste sin carga." : carga.length === 1 ? "Regresaste con 1 objeto." : `Regresaste con ${carga.length} objetos.`);
    }
  }
  estado.carga.push(...carga);
  estado.mision = null;
  cambio();
  return t;
}
