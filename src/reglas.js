// Reglas del juego, sin nada visual. La parte 3D y el HUD leen `estado` y llaman a estas funciones.
import { DATOS_PLANETAS, OBJETOS, MISIONES, SECUNDARIAS } from "./datos.js";

export const ORDEN = ["mercurio", "venus", "marte", "jupiter", "europa"];
export const MEJORAS = {
  motor:  { nombre: "Motor",          base: 150, max: 5, desc: "Gasta menos combustible por viaje. Añade masa." },
  tanque: { nombre: "Tanque",         base: 120, max: 5, desc: "+20 de capacidad de combustible. Añade masa." },
  escudo: { nombre: "Escudo térmico", base: 200, max: 5, desc: "Protege la carga en la reentrada." },
  sensor: { nombre: "Sensores",       base: 180, max: 5, desc: "Más probabilidad de objetos raros." },
  antena: { nombre: "Antena",         base: 250, max: 3, desc: "Nivel 2 necesario para la señal de Europa." },
  traje:  { nombre: "Traje espacial", base: 160, max: 5, desc: "Resiste más el ambiente al explorar a pie. Añade algo de masa." },
  oxigeno:{ nombre: "Tanque de oxígeno", base: 140, max: 5, desc: "+25 s de oxígeno para explorar a pie. Añade algo de masa." },
  paneles:{ nombre: "Paneles solares", base: 140, max: 4, desc: "Generan energía con la luz del Sol. Rinden mucho menos lejos del Sol." },
  bateria:{ nombre: "Batería",         base: 130, max: 5, desc: "+40 de energía guardada para los sistemas y para recargar oxígeno." },
  rtg:    { nombre: "Generador RTG",   base: 500, max: 2, desc: "Energía nuclear constante, sin importar la luz. Muy pesado y caro." },
};
export const COMBUSTIBLE_PRECIO = 2;
export const COSTO_EXPLORAR = 3;
export const ENCUENTROS = 4;
export const COSTO_ATERRIZAR = 4;   // reserva mínima de combustible para empezar el descenso
export const FUGA_POR_SEGUNDO = 0.12; // combustible que se pierde con una fuga en el tanque
export const BONO_PUEBLO = 1.2;     // el mercado del pueblo paga un 20 % más
export const VALOR_ORBITA = 0.35;
export const COSTO_DIA = 3;          // mantenimiento del granero por cada día de espera
export const VENTANA = 0.25;         // parte del ciclo en que la ventana está abierta
export const RECARGO_MAX = 0.6;      // fuera de ventana el viaje puede gastar hasta un 60 % más   // lo que flota en órbita vale poco: lo bueno está en el suelo

export const estado = {
  dinero: 100,
  combustible: 60,
  mejoras: { motor: 0, tanque: 0, escudo: 0, sensor: 0, antena: 0, traje: 0, oxigeno: 0, paneles: 0, bateria: 0, rtg: 0 },
  carga: [],
  visitados: {},
  misiones: {}, // misiones principales cumplidas, por destino
  dia: 1,       // calendario de la misión
  encargos: {}, // encargos del pueblo: "activo" o "hecho"
  logros: {},   // logros conseguidos
  descuento: 0, // descuento en el taller (por el encargo de Tomás)
  museo: {},    // piezas donadas al Museo del Espacio
  secundarias: {}, // misiones secundarias: true si está cumplida, o su progreso (número o puntos visitados)
  mision: null,
  final: false,
  log: ["Bienvenido al granero. El cohete necesita reparaciones."],
};

// ----- Guardar y cargar -----
const GUARDABLE = ["dia", "dinero", "combustible", "mejoras", "carga", "visitados", "misiones", "final", "log", "encargos", "logros", "descuento", "museo", "secundarias"];

export function exportarEstado() {
  return JSON.parse(JSON.stringify(Object.fromEntries(GUARDABLE.map(k => [k, estado[k]]))));
}

// Carga una partida guardada, ignorando cualquier valor con un tipo inesperado.
export function importarEstado(d) {
  const num = (x, def) => (typeof x === "number" && isFinite(x) && x >= 0 ? x : def);
  estado.dinero = Math.round(num(d.dinero, estado.dinero));
  estado.combustible = num(d.combustible, estado.combustible);
  if (d.mejoras && typeof d.mejoras === "object") {
    for (const k of Object.keys(estado.mejoras)) {
      estado.mejoras[k] = Math.min(MEJORAS[k].max, Math.floor(num(d.mejoras[k], 0)));
    }
  }
  if (Array.isArray(d.carga)) {
    estado.carga = d.carga.filter(o => o && typeof o.nombre === "string" && typeof o.valor === "number")
      .map(o => ({ nombre: o.nombre, valor: o.valor, color: String(o.color || "#ffffff"), origen: ORDEN.includes(o.origen) ? o.origen : undefined }));
  }
  for (const k of ["visitados", "misiones"]) {
    if (d[k] && typeof d[k] === "object") estado[k] = Object.fromEntries(ORDEN.filter(id => d[k][id]).map(id => [id, true]));
  }
  estado.final = !!d.final;
  if (d.encargos && typeof d.encargos === "object") {
    estado.encargos = Object.fromEntries(Object.keys(ENCARGOS).filter(k => ["activo", "hecho"].includes(d.encargos[k])).map(k => [k, d.encargos[k]]));
  }
  if (d.logros && typeof d.logros === "object") estado.logros = Object.fromEntries(Object.keys(LOGROS).filter(k => d.logros[k]).map(k => [k, true]));
  estado.descuento = d.descuento === 0.15 ? 0.15 : 0;
  estado.secundarias = {};
  if (d.secundarias && typeof d.secundarias === "object") {
    for (const dest of ORDEN) for (const sx of SECUNDARIAS[dest]) {
      const v = d.secundarias[`${dest}.${sx.tipo}`];
      if (v === true || (typeof v === "number" && v >= 0) || (Array.isArray(v) && v.length === 3)) estado.secundarias[`${dest}.${sx.tipo}`] = Array.isArray(v) ? v.map(Boolean) : v;
    }
  }
  estado.museo = d.museo && typeof d.museo === "object" ? Object.fromEntries(PIEZAS_MUSEO.filter(n => d.museo[n]).map(n => [n, true])) : {};
  estado.dia = Math.max(1, Math.floor(num(d.dia, 1)));
  if (Array.isArray(d.log)) estado.log = d.log.filter(t => typeof t === "string").slice(0, 6);
  estado.combustible = Math.min(estado.combustible, capacidad());
  estado.mision = null;
  cambio();
}

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
  return 1 + 0.1 * m.motor + 0.08 * (m.tanque + m.escudo + m.sensor + m.antena) + 0.04 * (m.traje + m.oxigeno)
    + 0.04 * m.paneles + 0.05 * m.bateria + 0.15 * m.rtg;
}

// ----- Energía -----
// La batería se carga en el granero; en el viaje los sistemas la gastan y los paneles y el RTG la reponen.
export const ENERGIA_RECARGA_OXI = 2.5; // energía por segundo mientras el cohete recarga el oxígeno del traje
export function energiaMax() { return 80 + 40 * estado.mejoras.bateria; }
export function consumoSistemas() { return 0.35 + 0.06 * (estado.mejoras.sensor + estado.mejoras.antena); }
export function generacionSolar(id, enSuelo) {
  const d = DATOS_PLANETAS[id];
  return Math.min(4, 0.35 * (1 + 0.8 * estado.mejoras.paneles) * d.luz * (enSuelo ? d.suelo_luz : 1));
}
export function generacion(id, enSuelo) { return generacionSolar(id, enSuelo) + 0.9 * estado.mejoras.rtg; }

// ----- Ventanas de lanzamiento -----
// Los planetas se alinean cada cierto tiempo; en la ventana el viaje es el más corto y barato.
export function ventana(id, dia = estado.dia) {
  const d = DATOS_PLANETAS[id];
  const fase = ((dia + d.fase) % d.ciclo) / d.ciclo; // 0 a 1
  if (fase < VENTANA) return { abierta: true, quedan: Math.ceil((VENTANA - fase) * d.ciclo), abre: 0, recargo: 0, fase };
  const x = fase - VENTANA, cerrada = 1 - VENTANA;
  const lejos = Math.min(x, cerrada - x) / (cerrada / 2); // 0 junto a una ventana, 1 en el punto más lejano
  return { abierta: false, quedan: 0, abre: Math.ceil((1 - fase) * d.ciclo), recargo: RECARGO_MAX * lejos, fase };
}

// Minutos que tarda la señal en llegar desde la Tierra: menos cerca de la ventana, más lejos de ella (aproximado).
export function retrasoSenal(id, dia = estado.dia) {
  const [min, max] = DATOS_PLANETAS[id].senal, f = ventana(id, dia).fase;
  const lejania = Math.min(1, Math.abs(f - VENTANA / 2) * 2);
  return Math.round(min + (max - min) * lejania);
}

export function esperar(dias) {
  if (dias > 0) desbloquearLogro("paciencia");
  const pago = Math.min(estado.dinero, COSTO_DIA * dias);
  estado.dinero -= pago;
  estado.dia += dias;
  const t = msg(`Esperaste ${dias === 1 ? "1 día" : dias + " días"}. Mantenimiento: ${pago} 💰.`);
  cambio();
  return t;
}

export function costoIda(id) {
  return Math.ceil(DATOS_PLANETAS[id].distancia * 12 * factorMasa() / (1 + 0.25 * estado.mejoras.motor) * (1 + ventana(id).recargo));
}

export function desbloqueado(id) {
  if (id === "mercurio") return true;
  // Cada destino se abre al cumplir la misión del anterior.
  if (id === "europa") return !!estado.misiones.jupiter && estado.mejoras.antena >= 2;
  return !!estado.misiones[ORDEN[ORDEN.indexOf(id) - 1]];
}

// Cada acción devuelve el mensaje que explica lo que pasó.
// Combustible mínimo para un viaje completo a Mercurio (ida, vuelta y maniobras).
export function combustibleMinimo() { return costoIda("mercurio") * 2 + 8; }

export function comprarCombustible(cant) {
  // Se cobran unidades enteras; el tanque nunca pasa de su capacidad.
  cant = Math.min(cant, Math.ceil(capacidad() - estado.combustible), Math.floor(estado.dinero / COMBUSTIBLE_PRECIO));
  let t;
  if (cant > 0) {
    estado.combustible = Math.min(capacidad(), estado.combustible + cant);
    estado.dinero -= cant * COMBUSTIBLE_PRECIO;
    t = msg(`Compraste ${cant} de combustible.`);
  } else {
    t = msg(estado.combustible >= capacidad() ? "El tanque ya está lleno." : "No te alcanza el dinero para combustible.");
  }
  // Red de seguridad: sin dinero ni combustible para ir a Mercurio, el juego no puede quedarse atascado.
  const falta = combustibleMinimo() - estado.combustible;
  if (falta > 0 && estado.dinero < falta * COMBUSTIBLE_PRECIO) {
    estado.combustible = combustibleMinimo();
    t = msg("El Dr. Nova te presta combustible de emergencia: alcanza justo para un viaje a Mercurio.");
  }
  cambio();
  return t;
}

export function costoMejora(k) { return Math.round(MEJORAS[k].base * (estado.mejoras[k] + 1) * (1 - estado.descuento)); }

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

export function vender(bono = 1) {
  let t;
  if (!estado.carga.length) t = msg("No tienes carga que vender.");
  else {
    const total = Math.round(estado.carga.reduce((s, o) => s + o.valor, 0) * bono);
    estado.dinero += total;
    t = msg(`Vendiste ${estado.carga.length === 1 ? "1 objeto" : estado.carga.length + " objetos"} por ${total} 💰${bono > 1 ? " (precio de mercado)" : ""}.`);
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
    estado.mision = { dest: id, ida, hecho: 0, encuentros: ENCUENTROS, carga: [], ultimo: "", recargo: ventana(id).recargo, dias: DATOS_PLANETAS[id].viaje };
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
export function generarCampo(id, n = 9, factor = 1) {
  return Array.from({ length: n }, () => {
    const o = tirarObjeto(id);
    o.valor = Math.max(1, Math.round(o.valor * factor));
    return o;
  }).sort((a, b) => a.valor - b.valor);
}

// ----- Exploración a pie -----
// Segundos de oxígeno con el tanque lleno.
export function oxigenoMax() { return 75 + 25 * estado.mejoras.oxigeno; }

// Cuánto resiste el traje: divide todo el daño que recibe.
export function resistenciaTraje() { return 1 + 0.5 * estado.mejoras.traje; }

// Desgaste del traje por segundo (en %) solo por estar en ese ambiente.
export function desgasteTraje(id) { return 1.2 * DATOS_PLANETAS[id].peligro / resistenciaTraje(); }

export function puedeAterrizar() {
  const m = estado.mision;
  return !!m && estado.combustible >= m.ida + COSTO_ATERRIZAR;
}

export function aterrizar() {
  const t = msg(`Aterrizaste en ${DATOS_PLANETAS[estado.mision.dest].lugar}.`);
  cambio();
  return t;
}

// Si te desmayas sin oxígeno pierdes lo recogido desde la última vez que pasaste por el cohete.
export function perderRecolectado(desde) {
  const m = estado.mision;
  const perdidos = m.carga.length - desde;
  m.carga.length = desde;
  const t = msg(perdidos > 0
    ? `Te quedaste sin oxígeno. Perdiste ${perdidos === 1 ? "1 objeto" : perdidos + " objetos"} en el camino.`
    : "Te quedaste sin oxígeno. Por suerte no llevabas nada encima.");
  cambio();
  return t;
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
  o.origen = m.dest; // de dónde viene (para los encargos)
  m.carga.push(o);
  m.hecho++;
  if (o.nombre === "Muestra biológica") desbloquearLogro("legendario");
  if (o.nombre === "Sonda perdida") desbloquearLogro("sonda");
  if (o.nombre === "Meteorito") desbloquearLogro("meteorito");
  anotarRecogida(o, m.dest);
  const t = msg(`Recogiste ${o.nombre} (valor ${o.valor}).`);
  cambio();
  return t;
}

// Cumplir la misión de un destino paga su recompensa y abre el siguiente.
export function completarMision(id) {
  if (estado.misiones[id]) return "";
  estado.misiones[id] = true;
  estado.dinero += MISIONES[id].recompensa;
  const t = msg(`✅ Misión cumplida: ${MISIONES[id].titulo}. Recompensa: ${MISIONES[id].recompensa} 💰.`);
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
  if (estado.combustible >= 0 && carga.length) revisarCarga(m.dest, carga);
  estado.dia += m.dias || 0;
  estado.mision = null;
  cambio();
  return t;
}

// ----- Encargos del pueblo -----
export const ENCARGOS = {
  leo:   { vecino: "Leo", titulo: "Una piedra de Marte", desc: "Tráele a Leo cualquier cosa recogida en Marte.",
           cumple: o => o.origen === "marte", cantidad: 1, dinero: 250, premio: "250 💰" },
  marta: { vecino: "Marta", titulo: "Hielo para el mercado", desc: "Lleva 3 bloques de hielo al puesto de Marta.",
           cumple: o => o.nombre === "Hielo", cantidad: 3, dinero: 450, premio: "450 💰" },
  tomas: { vecino: "Tomás", titulo: "Chatarra para el taller", desc: "Tomás necesita 4 piezas de chatarra espacial para sus inventos.",
           cumple: o => o.nombre === "Chatarra espacial", cantidad: 4, dinero: 0, descuento: 0.15, premio: "15 % de descuento en el taller" },
  luz:   { vecino: "Doña Luz", titulo: "Un cristal para la colección", desc: "Doña Luz colecciona piedras y quiere un cristal lunar.",
           cumple: o => o.nombre === "Cristal lunar", cantidad: 1, dinero: 700, premio: "700 💰" },
};

export function encargoDe(vecino) { return Object.keys(ENCARGOS).find(k => ENCARGOS[k].vecino === vecino); }
export function tieneParaEncargo(id) { return estado.carga.filter(ENCARGOS[id].cumple).length; }

export function aceptarEncargo(id) {
  estado.encargos[id] = "activo";
  const t = msg(`Nuevo encargo: ${ENCARGOS[id].titulo}.`);
  cambio();
  return t;
}

export function entregarEncargo(id) {
  const e = ENCARGOS[id];
  if (estado.encargos[id] !== "activo" || tieneParaEncargo(id) < e.cantidad) return "";
  let quedan = e.cantidad;
  estado.carga = estado.carga.filter(o => (quedan > 0 && e.cumple(o) ? (quedan--, false) : true));
  estado.encargos[id] = "hecho";
  estado.dinero += e.dinero;
  if (e.descuento) estado.descuento = e.descuento;
  if (Object.keys(ENCARGOS).every(k => estado.encargos[k] === "hecho")) desbloquearLogro("vecino");
  const t = msg(`Encargo cumplido: ${e.titulo}. Premio: ${e.premio}.`);
  cambio();
  return t;
}

// ----- Logros -----
export const LOGROS = {
  despegue:   { icono: "🚀", titulo: "¡Despegamos!", desc: "Haz despegar el cohete por primera vez." },
  seda:       { icono: "🪶", titulo: "Aterrizaje de seda", desc: "Toca el suelo a menos de 1 m/s." },
  salto:      { icono: "🦘", titulo: "Salto lunar", desc: "Salta en un lugar con menos de 0.2 g de gravedad." },
  legendario: { icono: "🧬", titulo: "Hallazgo legendario", desc: "Recoge una muestra biológica." },
  ingeniero:  { icono: "🔧", titulo: "Ingeniería espacial", desc: "Compra 10 mejoras para el cohete." },
  paciencia:  { icono: "⏳", titulo: "La paciencia paga", desc: "Espera a que se abra una ventana de lanzamiento." },
  esquiva:    { icono: "☄️", titulo: "Piloto experto", desc: "Cruza una lluvia de micrometeoritos sin recibir impactos." },
  refugio:    { icono: "☀️", titulo: "A salvo de la tormenta", desc: "Pasa una tormenta solar dentro del cohete." },
  explorador: { icono: "🗺️", titulo: "Explorador", desc: "Visita los cinco destinos." },
  vecino:     { icono: "🤝", titulo: "Vecino del año", desc: "Cumple los cuatro encargos del pueblo." },
  sonda:      { icono: "🛰️", titulo: "Arqueología espacial", desc: "Recupera una sonda perdida a la deriva." },
  cometa:     { icono: "🌠", titulo: "Cazador de cometas", desc: "Atrapa hielo de la cola de un cometa." },
  fuga:       { icono: "🧯", titulo: "Mecánico en órbita", desc: "Sella una fuga de combustible en pleno vuelo." },
  meteorito:  { icono: "🌑", titulo: "Caído del cielo", desc: "Recoge un meteorito recién caído." },
  cientifico: { icono: "🔬", titulo: "Científico de campo", desc: "Cumple las 5 misiones secundarias de un mismo lugar." },
  curador:    { icono: "🏛️", titulo: "Curador del museo", desc: "Dona al museo una pieza de cada tipo." },
  contacto:   { icono: "🛸", titulo: "No estamos solos", desc: "Encuentra el origen de la señal de Europa." },
};
export const logrosNuevos = []; // la pantalla los muestra y vacía la lista

export function desbloquearLogro(id) {
  if (!LOGROS[id] || estado.logros[id]) return false;
  estado.logros[id] = true;
  logrosNuevos.push(id);
  msg(`🏆 Logro: ${LOGROS[id].titulo}.`);
  cambio();
  return true;
}

// ----- Museo del Espacio (en el pueblo) -----
// La primera pieza de cada tipo que dones se paga al 150 % de su valor y queda expuesta.
export const PIEZAS_MUSEO = ["Chatarra espacial", "Hielo", "Mineral raro", "Cristal lunar", "Muestra biológica", "Sonda perdida", "Meteorito"];

export function donarMuseo() {
  const i = estado.carga.findIndex(o => PIEZAS_MUSEO.includes(o.nombre) && !estado.museo[o.nombre]);
  if (i < 0) {
    const faltan = PIEZAS_MUSEO.filter(n => !estado.museo[n]);
    return faltan.length
      ? msg(`🏛️ El museo busca: ${faltan.join(", ")}. Tráelo en tu carga.`)
      : msg("🏛️ ¡La colección del museo está completa! Gracias por compartir tus hallazgos.");
  }
  const [o] = estado.carga.splice(i, 1);
  const premio = Math.round(o.valor * 1.5);
  estado.museo[o.nombre] = true;
  estado.dinero += premio;
  if (PIEZAS_MUSEO.every(n => estado.museo[n])) desbloquearLogro("curador");
  const t = msg(`🏛️ Donaste ${o.nombre} al museo. Te pagan ${premio} 💰 (150 % de su valor). Piezas: ${Object.keys(estado.museo).length}/${PIEZAS_MUSEO.length}.`);
  cambio();
  return t;
}

// Recupera una misión en curso desde una partida guardada (si es válida).
export function importarMision(m) {
  if (!m || !ORDEN.includes(m.dest)) return false;
  const num = (x, def) => (typeof x === "number" && isFinite(x) && x >= 0 ? x : def);
  estado.mision = {
    dest: m.dest, ida: num(m.ida, costoIda(m.dest)), hecho: num(m.hecho, 0), encuentros: num(m.encuentros, ENCUENTROS),
    carga: (Array.isArray(m.carga) ? m.carga : []).filter(o => o && typeof o.nombre === "string" && typeof o.valor === "number")
      .map(o => ({ nombre: o.nombre, valor: o.valor, color: String(o.color || "#ffffff"), origen: m.dest })),
    ultimo: "", recargo: num(m.recargo, 0), dias: num(m.dias, DATOS_PLANETAS[m.dest].viaje),
  };
  return true;
}

// ----- Misiones secundarias (5 por destino) -----
export const avisosSecundarias = []; // textos que la pantalla muestra uno a uno
const idSec = (dest, tipo) => `${dest}.${tipo}`;
const buscarSec = (dest, tipo) => (SECUNDARIAS[dest] || []).find(x => x.tipo === tipo);
export function secundariaHecha(dest, tipo) { return estado.secundarias[idSec(dest, tipo)] === true; }

// Texto del progreso: "✅", "2/3", "1/2"…
export function progresoSecundaria(dest, sx) {
  const v = estado.secundarias[idSec(dest, sx.tipo)];
  if (v === true) return "✅";
  if (sx.tipo === "foto" || sx.tipo === "sensores") return `${Array.isArray(v) ? v.filter(Boolean).length : 0}/3`;
  if (sx.tipo === "recoger") return `${typeof v === "number" ? v : 0}/${sx.cantidad}`;
  return "";
}
export function secundariasHechas(dest) { return (SECUNDARIAS[dest] || []).filter(x => secundariaHecha(dest, x.tipo)).length; }

function completarSecundaria(dest, sx) {
  if (secundariaHecha(dest, sx.tipo)) return;
  estado.secundarias[idSec(dest, sx.tipo)] = true;
  estado.dinero += sx.recompensa;
  const t = msg(`⭐ Misión secundaria cumplida: ${sx.titulo}. +${sx.recompensa} 💰`);
  avisosSecundarias.push(`${t} Dato real: ${sx.dato}`);
  if (secundariasHechas(dest) === SECUNDARIAS[dest].length) desbloquearLogro("cientifico");
  cambio();
}

// Foto tomada o sensor instalado en el punto i (0 a 2). Devuelve cuántos lleva.
export function marcarPunto(dest, tipo, i) {
  const sx = buscarSec(dest, tipo);
  if (!sx || secundariaHecha(dest, tipo)) return 3;
  const v = Array.isArray(estado.secundarias[idSec(dest, tipo)]) ? estado.secundarias[idSec(dest, tipo)] : [false, false, false];
  v[i] = true;
  estado.secundarias[idSec(dest, tipo)] = v;
  const n = v.filter(Boolean).length;
  if (n >= 3) completarSecundaria(dest, sx); else cambio();
  return n;
}
function anotarRecogida(o, dest) {
  const sx = buscarSec(dest, "recoger");
  if (!sx || secundariaHecha(dest, "recoger") || o.nombre !== sx.objeto) return;
  const v = estado.secundarias[idSec(dest, "recoger")];
  const n = (typeof v === "number" ? v : 0) + 1;
  estado.secundarias[idSec(dest, "recoger")] = n;
  if (n >= sx.cantidad) completarSecundaria(dest, sx);
}
export function revisarAterrizaje(dest, vel) {
  const sx = buscarSec(dest, "aterrizaje");
  if (sx && vel < sx.vel) completarSecundaria(dest, sx);
}
function revisarCarga(dest, carga) {
  const sx = buscarSec(dest, "carga");
  if (sx && carga.reduce((t, o) => t + o.valor, 0) >= sx.valor) completarSecundaria(dest, sx);
}

// ----- Mochila: al quedarte sin oxígeno, lo que llevabas encima queda donde caíste -----
export function soltarRecolectado(desde) {
  const m = estado.mision;
  const objetos = m.carga.splice(desde);
  const texto = msg(objetos.length
    ? `Te quedaste sin oxígeno. ${objetos.length === 1 ? "El objeto que llevabas quedó" : `Los ${objetos.length} objetos que llevabas quedaron`} en tu mochila 🎒, donde caíste. Ve a buscarla.`
    : "Te quedaste sin oxígeno. Por suerte no llevabas nada encima.");
  cambio();
  return { texto, objetos };
}
export function recuperarMochila(objetos) {
  const m = estado.mision;
  if (!m) return "";
  m.carga.push(...objetos);
  const t = msg(`🎒 Recuperaste tu mochila: ${objetos.length === 1 ? "1 objeto" : objetos.length + " objetos"}.`);
  cambio();
  return t;
}
