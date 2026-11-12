// Reporte de misión: registra lo que pasa en cada viaje y, al volver, lo resume
// junto con la lección (el trade-off) que más pesó en ese viaje.
import { DATOS_PLANETAS, MISIONES } from "./datos.js";

export function crearInforme() {
  let v = null;

  return {
    get activo() { return !!v; },

    // Al despegar. `combustible` es el que había antes de restar el viaje de ida.
    empezar({ dest, combustible, capacidad, ida, masa, misionHecha }) {
      v = {
        dest, combustible, capacidad, ida, masa, misionHecha,
        gasto: { orbita: 0, descenso: 0, fuga: 0 },
        tiempo: 0, aterrizo: false, velAterrizaje: 0, averias: [], desmayos: 0, trajeMin: 100, oxiMin: 1, energiaMin: 1, sinEnergia: false,
      };
    },
    gasto(tipo, cantidad) { if (v) v.gasto[tipo] += cantidad; },
    tiempo(dt) { if (v) v.tiempo += dt; },
    aterrizaje(vel, averias) { if (v) Object.assign(v, { aterrizo: true, velAterrizaje: vel, averias }); },
    desmayo() { if (v) v.desmayos++; },
    suelo(traje, oxiFraccion) {
      if (!v) return;
      v.trajeMin = Math.min(v.trajeMin, traje);
      v.oxiMin = Math.min(v.oxiMin, oxiFraccion);
    },
    energia(fraccion) {
      if (!v) return;
      v.energiaMin = Math.min(v.energiaMin, fraccion);
      if (fraccion <= 0) v.sinEnergia = true;
    },
    cancelar() { v = null; },

    // Al volver: devuelve los datos del reporte.
    terminar({ combustibleFinal, rescate, traidos, perdidos, misionHecha }) {
      if (!v) return null;
      const r = {
        ...v, combustibleFinal, rescate, traidos, perdidos,
        cumplio: misionHecha && !v.misionHecha,
        valor: traidos.reduce((s, o) => s + o.valor, 0),
      };
      r.leccion = leccion(r);
      v = null;
      return r;
    },
  };
}

// La lección más importante del viaje, en orden de gravedad.
function leccion(r) {
  const lugar = DATOS_PLANETAS[r.dest].lugar;
  if (r.rescate) return "Te quedaste sin combustible para volver y hubo que rescatarte. En una misión real la reserva de regreso se calcula antes de despegar: vigila la línea punteada de la barra de combustible.";
  if (r.desmayos) return "Te quedaste sin oxígeno lejos del cohete. En una caminata espacial real el aire limita cada salida: planea salidas más cortas o mejora el tanque de oxígeno.";
  if (r.sinEnergia) return `Te quedaste sin energía en ${lugar}, donde llega ${DATOS_PLANETAS[r.dest].luz >= 1 ? "mucha" : "muy poca"} luz del Sol. Sin energía el cohete no recarga el oxígeno ni funcionan los instrumentos: más batería, paneles o un generador RTG.`;
  if (r.averias.includes("pata")) return `Tocaste suelo a ${r.velAterrizaje.toFixed(1)} m/s y rompiste una pata. Frenar antes cuesta un poco más de combustible, pero ahorra tiempo, oxígeno y piezas.`;
  if (r.averias.length) return `Tocaste suelo a ${r.velAterrizaje.toFixed(1)} m/s y el cohete se averió. Por debajo de 3 m/s el aterrizaje es limpio.`;
  if (r.perdidos) return `La reentrada dañó ${r.perdidos === 1 ? "1 objeto" : r.perdidos + " objetos"}. El escudo térmico protege la carga: las cápsulas reales superan los 1.500 °C al volver a la atmósfera.`;
  if (r.combustibleFinal < r.capacidad * 0.12) return `Volviste con solo ${Math.floor(r.combustibleFinal)} de combustible. Un margen tan pequeño es arriesgado: un tanque mayor da margen, pero suma masa; un motor mejor gasta menos.`;
  if (r.trajeMin < 30) return `El traje llegó al ${Math.round(r.trajeMin)} %. Un traje mejor resiste más el ambiente de ${lugar}, a cambio de algo de masa.`;
  if (!r.aterrizo) return "No aterrizaste. Lo que flota en órbita vale poco: lo valioso y las misiones están en la superficie.";
  if (!r.cumplio && !r.misionHecha) return `No cumpliste la misión de ${lugar}. Es la forma principal de ganar dinero y abre el siguiente destino.`;
  return `¡Viaje redondo! Tu cohete pesa x${r.masa.toFixed(2)} respecto al original: cada mejora nueva hará que cada viaje gaste más. Elige la que resuelva lo que hoy te frena.`;
}

const fila = (a, b) => `<div class="inf-fila"><span>${a}</span><b>${b}</b></div>`;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function htmlInforme(r) {
  const d = DATOS_PLANETAS[r.dest], M = MISIONES[r.dest];
  const usado = r.combustible - r.combustibleFinal;
  const viaje = r.ida * (r.rescate ? 1 : 2);
  const partes = [
    `viaje ${viaje.toFixed(0)}`,
    r.gasto.orbita >= 0.5 && `órbita ${r.gasto.orbita.toFixed(0)}`,
    r.gasto.descenso >= 0.5 && `descenso ${r.gasto.descenso.toFixed(0)}`,
    r.gasto.fuga >= 0.5 && `fuga ${r.gasto.fuga.toFixed(0)}`,
  ].filter(Boolean).join(" · ");
  const aterrizaje = !r.aterrizo ? "No aterrizaste"
    : `${r.velAterrizaje.toFixed(1)} m/s · ${r.averias.length ? (r.averias.includes("pata") ? "pata rota" : "avería") : "suave"}`;
  const mision = r.misionHecha ? "Ya estaba cumplida"
    : r.cumplio ? `✅ ${M.titulo} · +${M.recompensa} 💰` : `Pendiente: ${M.titulo}`;
  const carga = r.rescate ? "Perdida en el rescate"
    : `${r.traidos.length} ${r.traidos.length === 1 ? "objeto" : "objetos"} · ${r.valor} 💰${r.perdidos ? ` · ${r.perdidos} dañados al volver` : ""}`;
  const traje = `${Math.round(r.trajeMin)} % mínimo${r.desmayos ? ` · ${r.desmayos} desmayo${r.desmayos > 1 ? "s" : ""}` : ""}`;

  return `<h2>📋 Reporte de misión</h2>
    <p class="inf-destino">${d.lugar} · ${mmss(r.tiempo)}</p>
    ${fila("⛽ Combustible usado", `${usado.toFixed(0)} (${partes})`)}
    ${fila("⛽ Al volver", `${Math.floor(r.combustibleFinal)} / ${r.capacidad}`)}
    ${fila("🛬 Aterrizaje", aterrizaje)}
    ${fila("🎯 Misión", mision)}
    ${fila("📦 Carga", carga)}
    ${r.aterrizo ? fila("🛡 Traje", traje) : ""}
    ${fila("🔋 Energía", r.sinEnergia ? "Se agotó" : `${Math.round(r.energiaMin * 100)} % mínimo`)}
    <div class="inf-leccion"><b>📻 Lección del Dr. Nova</b>${r.leccion}</div>
    <p class="inf-cerrar"><kbd>E</kbd> continuar</p>`;
}
