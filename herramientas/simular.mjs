// Simulador de balance: juega muchas partidas con las reglas reales del juego (src/reglas.js)
// y un jugador "promedio" simplificado, para medir cuántos viajes y cuánto tiempo toma llegar al final.
//
// Uso:  npm run simular            (300 partidas)
//       npm run simular -- 1000    (otra cantidad)
//       npm run simular -- 1 -v    (una partida, viaje por viaje)
//
// Lo que NO mide: la habilidad real con los controles. Los tiempos de cada tramo son estimaciones.
import {
  estado, MEJORAS, ORDEN, capacidad, costoIda, costoMejora, comprarMejora, comprarCombustible,
  iniciarMision, gastar, recolectar, regresar, vender, completarMision, generarCampo, consumoImpulso,
  oxigenoMax, desgasteTraje, desbloqueado, COMBUSTIBLE_PRECIO, FUGA_POR_SEGUNDO, VALOR_ORBITA,
  energiaMax, generacion, consumoSistemas, ENERGIA_RECARGA_OXI, ventana, esperar, COSTO_DIA,
} from "../src/reglas.js";
import { DATOS_PLANETAS, MISIONES } from "../src/datos.js";

const N = Number(process.argv[2]) || 300;
const DETALLE = process.argv.includes("-v");

// ----- Supuestos sobre el jugador promedio -----
const J = {
  aterrizaje: { suave: 0.55, medio: 0.33 },  // el resto son aterrizajes duros
  exitoMision: 0.8,          // probabilidad de cumplir la misión al intentarla (si le alcanza el traje y el oxígeno)
  margenTraje: 0.8,          // no gasta más del 80 % del traje antes de volver
  margenOxigeno: 0.9,
  paciencia: 150,            // segundos máximos recolectando por viaje
  velocidad: 8,              // corre casi siempre
  segPorPieza: 12,           // buscar una pieza de repuesto
  segGranero: 70,            // vender, comprar, hablar
  segVuelo: 45,              // despegue, órbita y descenso
  ordenCompras: ["oxigeno", "traje", "bateria", "sensor", "escudo", "motor", "tanque"], // en qué gasta el dinero que le sobra
};

// Lo que exige cada misión: segundos fuera del cohete y oxígeno de la salida más larga.
const NECESITA = {
  mercurio: { seg: 45, oxi: 45 },
  venus:    { seg: 52, oxi: 57 },
  marte:    { seg: 28, oxi: 32 },
  jupiter:  { seg: 38, oxi: 61 },
  europa:   { seg: 61, oxi: 30 },
};

function reiniciar() {
  Object.assign(estado, {
    dinero: 100, combustible: 60, carga: [], visitados: {}, misiones: {}, mision: null, final: false, log: [], dia: 1,
    mejoras: { motor: 0, tanque: 0, escudo: 0, sensor: 0, antena: 0, traje: 0, oxigeno: 0, paneles: 0, bateria: 0, rtg: 0 },
  });
}

// Combustible de las maniobras: órbita y descenso frenando contra la gravedad del lugar.
function combustibleManiobras(dest) {
  const g = 9.8 * DATOS_PLANETAS[dest].gravedad;
  const caida = Math.sqrt(64 + 2 * g * 150);
  const segFrenando = caida / (1.5 * g + 3) * 1.25; // un 25 % de más por no frenar perfecto
  return 6 * consumoImpulso() + segFrenando * consumoImpulso() * 1.2;
}
const combustibleViaje = dest => costoIda(dest) * 2 + combustibleManiobras(dest) + 3;
const segundosTraje = dest => 100 / desgasteTraje(dest) * J.margenTraje;

// Segundos que la batería deja estar en la superficie, tras gastar en el vuelo (unos 45 s) y en recargar oxígeno.
function segundosEnergia(dest) {
  const vuelo = Math.max(0, consumoSistemas() - generacion(dest, false)) * 45;
  const recargas = 2 * ENERGIA_RECARGA_OXI * 3;
  const neto = consumoSistemas() - generacion(dest, true);
  const queda = energiaMax() - vuelo - recargas;
  if (neto <= 0) return Infinity;
  return Math.max(0, queda / neto * 0.85);
}

function puedeMision(dest) {
  if (!desbloqueado(dest) || capacidad() < combustibleViaje(dest)) return false;
  return segundosTraje(dest) >= NECESITA[dest].seg && oxigenoMax() * J.margenOxigeno >= NECESITA[dest].oxi
    && segundosEnergia(dest) >= NECESITA[dest].seg + 25;
}

// Compra lo que hace falta para la siguiente misión; si no alcanza, devuelve false.
function comprarLoNecesario(dest) {
  const quiere = () => {
    if (dest === "europa" && estado.mejoras.antena < 2) return "antena";
    if (capacidad() < combustibleViaje(dest)) {
      const opciones = ["tanque", "motor"].filter(k => estado.mejoras[k] < MEJORAS[k].max);
      return opciones.sort((a, b) => costoMejora(a) - costoMejora(b))[0];
    }
    if (segundosTraje(dest) < NECESITA[dest].seg) return "traje";
    if (oxigenoMax() * J.margenOxigeno < NECESITA[dest].oxi) return "oxigeno";
    if (segundosEnergia(dest) < NECESITA[dest].seg + 25) {
      // Lejos del Sol conviene el RTG; cerca, batería o paneles.
      if (DATOS_PLANETAS[dest].luz < 0.1 && estado.mejoras.rtg < MEJORAS.rtg.max) return "rtg";
      const opciones = ["bateria", "paneles"].filter(k => estado.mejoras[k] < MEJORAS[k].max);
      return opciones.sort((a, b) => costoMejora(a) - costoMejora(b))[0] || "rtg";
    }
    return null;
  };
  for (let k; (k = quiere());) {
    if (estado.dinero - costoMejora(k) < combustibleViaje(dest) * COMBUSTIBLE_PRECIO) return false;
    comprarMejora(k);
  }
  return true;
}

function comprarExtras(dest) {
  const reserva = combustibleViaje(dest) * COMBUSTIBLE_PRECIO + 60;
  for (let compro = true; compro;) {
    compro = false;
    for (const k of J.ordenCompras) {
      if (estado.mejoras[k] >= Math.min(MEJORAS[k].max, 3)) continue;
      if (estado.dinero - costoMejora(k) < reserva) continue;
      // Cada mejora añade masa: no la compra si con eso el tanque ya no alcanza para el viaje.
      estado.mejoras[k]++;
      const sigueLlegando = capacidad() >= combustibleViaje(dest);
      estado.mejoras[k]--;
      if (!sigueLlegando) continue;
      comprarMejora(k); compro = true; break;
    }
  }
}

// Un viaje completo. Devuelve los segundos que tomó.
function viaje(dest, registro) {
  // ¿Esperar la ventana de lanzamiento o salir ya? Elige lo más barato.
  const v = ventana(dest);
  let esperó = 0;
  if (!v.abierta) {
    const extra = costoIda(dest) * 2 * (1 - 1 / (1 + v.recargo)) * COMBUSTIBLE_PRECIO;
    if (v.abre * COSTO_DIA < extra && estado.dinero >= v.abre * COSTO_DIA + combustibleViaje(dest) * COMBUSTIBLE_PRECIO) {
      esperar(v.abre);
      esperó = v.abre;
    }
  }
  const dineroAntes = estado.dinero;
  const falta = Math.ceil(Math.min(capacidad(), combustibleViaje(dest) + 4) - estado.combustible);
  comprarCombustible(Math.max(0, falta)); // con 0 solo actúa el combustible de emergencia, si hace falta
  iniciarMision(dest);
  if (!estado.mision) return 0; // no alcanzó ni para despegar
  gastar(combustibleManiobras(dest));
  if (Math.random() < 0.5) recolectar(generarCampo(dest, 1, VALOR_ORBITA)[0]); // algo recogido en órbita

  // Aterrizaje
  const r = Math.random();
  const piezas = r < J.aterrizaje.suave ? 0 : r < J.aterrizaje.suave + J.aterrizaje.medio ? 1 : 3;
  let seg = 0, traje = Math.min(segundosTraje(dest), segundosEnergia(dest));
  if (piezas) {
    const t = piezas * J.segPorPieza;
    seg += t; traje -= t;
    if (Math.random() < 0.5) gastar(FUGA_POR_SEGUNDO * t);
  }

  // Misión
  let cumplio = false;
  if (!estado.misiones[dest] && traje >= NECESITA[dest].seg && oxigenoMax() * J.margenOxigeno >= NECESITA[dest].oxi) {
    seg += NECESITA[dest].seg; traje -= NECESITA[dest].seg;
    if (Math.random() < J.exitoMision) { completarMision(dest); cumplio = true; }
  }

  // Recolección: salidas de ida y vuelta al objeto más cercano mientras quede traje y paciencia.
  const lento = dest === "mercurio" ? 1.4 : 1; // ir de sombra en sombra
  let recolectando = 0, recogidos = 0;
  generarCampo(dest, 12).forEach((obj, i) => {
    const t = 2 * (19.5 + 9 * i) / J.velocidad * lento;
    if (t * 1.6 > oxigenoMax() * J.margenOxigeno || t > traje || recolectando + t > J.paciencia) return;
    traje -= t; recolectando += t; recogidos++;
    recolectar(obj);
  });
  seg += recolectando;

  regresar();
  const carga = estado.carga.reduce((s, o) => s + o.valor, 0);
  vender();
  registro.push({ dest, cumplio, recogidos, carga, piezas, neto: Math.round(estado.dinero - dineroAntes), esperó });
  return seg + J.segVuelo + J.segGranero;
}

function partida() {
  reiniciar();
  const registro = [];
  let seg = 0;
  while (!estado.misiones.europa && registro.length < 60) {
    const objetivo = ORDEN.find(id => !estado.misiones[id]);
    // Si fuera de ventana el tanque no alcanza, espera a que se abra (como haría una persona).
    const vo = ventana(objetivo);
    if (desbloqueado(objetivo) && !vo.abierta && capacidad() < combustibleViaje(objetivo) && estado.dinero >= vo.abre * COSTO_DIA) esperar(vo.abre);
    let dest = objetivo;
    const alcanza = id => capacidad() >= combustibleViaje(id)
      && estado.combustible + Math.floor(estado.dinero / COMBUSTIBLE_PRECIO) >= combustibleViaje(id);
    if (!(comprarLoNecesario(objetivo) && puedeMision(objetivo) && alcanza(objetivo))) {
      // No alcanza para la siguiente misión: vuelve al destino más lejano que sí puede pagar, a juntar dinero.
      dest = [...ORDEN].reverse().find(id => estado.misiones[id] && alcanza(id)) || "mercurio";
    } else comprarExtras(objetivo);
    const t = viaje(dest, registro);
    if (!t) break; // sin dinero ni para combustible
    seg += t;
  }
  return { viajes: registro.length, min: seg / 60, registro, mejoras: { ...estado.mejoras }, gano: !!estado.misiones.europa, dinero: estado.dinero, dias: estado.dia };
}

// ----- Resultados -----
const partidas = Array.from({ length: N }, partida);
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const media = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const f1 = x => x.toFixed(1);

if (DETALLE) {
  partidas[0].registro.forEach((v, i) => console.log(
    `${String(i + 1).padStart(2)}. ${DATOS_PLANETAS[v.dest].nombre.padEnd(9)} ${v.cumplio ? "misión ✔" : "        "}  ` +
    `objetos ${String(v.recogidos).padStart(2)}  carga ${String(v.carga).padStart(5)}  averías ${v.piezas ? v.piezas + " piezas" : "no"}  neto ${v.neto >= 0 ? "+" : ""}${v.neto}`));
  console.log("Mejoras al final:", partidas[0].mejoras, "· dinero", partidas[0].dinero);
}

const ganadas = partidas.filter(p => p.gano);
console.log(`\nPartidas: ${N} · terminadas: ${(100 * ganadas.length / N).toFixed(0)} %`);
if (ganadas.length) {
  const v = ganadas.map(p => p.viajes), m = ganadas.map(p => p.min);
  console.log(`Viajes hasta el final:  media ${f1(media(v))}  ·  típico ${pct(v, 0.25)} a ${pct(v, 0.75)}  ·  9 de cada 10 en ${pct(v, 0.9)} o menos  ·  máximo ${Math.max(...v)}`);
  console.log(`Minutos de juego:       media ${f1(media(m))}  ·  típico ${f1(pct(m, 0.25))} a ${f1(pct(m, 0.75))}`);
  console.log("\nViajes por destino (media) y dinero neto por viaje:");
  for (const id of ORDEN) {
    const todos = ganadas.flatMap(p => p.registro.filter(r => r.dest === id));
    if (!todos.length) continue;
    console.log(`  ${DATOS_PLANETAS[id].nombre.padEnd(9)} ${f1(todos.length / ganadas.length).padStart(4)} viajes · ` +
      `objetos ${f1(media(todos.map(r => r.recogidos)))} · carga ${Math.round(media(todos.map(r => r.carga)))} · ` +
      `neto ${Math.round(media(todos.map(r => r.neto)))} · misión ${MISIONES[id].recompensa}`);
  }
  const primero = partidas.map(p => p.registro[0].neto);
  console.log(`\nPrimer viaje: neto medio ${Math.round(media(primero))} · en el ${(100 * primero.filter(x => x < 150).length / N).toFixed(0)} % no alcanza ni para la mejora más barata`);
  console.log("Mejoras al terminar (nivel medio):");
  console.log("  " + Object.keys(MEJORAS).map(k => `${k} ${f1(media(ganadas.map(p => p.mejoras[k])))}`).join(" · "));
  const esperas = ganadas.flatMap(p => p.registro.map(r => r.esperó));
  console.log(`Días de calendario: media ${Math.round(media(ganadas.map(p => p.dias)))} · viajes en que esperó la ventana: ${(100 * esperas.filter(x => x > 0).length / esperas.length).toFixed(0)} %`);
  console.log(`Dinero sobrante al terminar: ${Math.round(media(ganadas.map(p => p.dinero)))}`);
}
