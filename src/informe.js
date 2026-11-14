// Reporte de misión: registra lo que pasa en cada viaje y, al volver, lo resume
// junto con la lección (el trade-off) que más pesó en ese viaje.
import { DATOS_PLANETAS, MISIONES } from "./datos.js";

export function crearInforme() {
  let v = null;

  return {
    get activo() { return !!v; },
    get datos() { return v && JSON.parse(JSON.stringify(v)); },
    restaurar(d) { v = d && typeof d === "object" && d.gasto ? d : null; },

    // Al despegar. `combustible` es el que había antes de restar el viaje de ida.
    empezar({ dest, combustible, capacidad, ida, masa, misionHecha, recargo = 0, dias = 0, dia = 1 }) {
      v = {
        dest, combustible, capacidad, ida, masa, misionHecha, recargo, dias, dia,
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
  if (r.recargo > 0.25) return `Despegaste fuera de la ventana de lanzamiento y el viaje gastó un ${Math.round(r.recargo * 100)} % más de combustible. Las misiones reales esperan la alineación de los planetas: a Marte, la ventana se abre cada 26 meses.`;
  if (r.combustibleFinal < r.capacidad * 0.12) return `Volviste con solo ${Math.floor(r.combustibleFinal)} de combustible. Un margen tan pequeño es arriesgado: un tanque mayor da margen, pero suma masa; un motor mejor gasta menos.`;
  if (r.trajeMin < 30) return `El traje llegó al ${Math.round(r.trajeMin)} %. Un traje mejor resiste más el ambiente de ${lugar}, a cambio de algo de masa.`;
  if (!r.aterrizo) return "No aterrizaste. Lo que flota en órbita vale poco: lo valioso y las misiones están en la superficie.";
  if (!r.cumplio && !r.misionHecha) return `No cumpliste la misión de ${lugar}. Es la forma principal de ganar dinero y abre el siguiente destino.`;
  return `¡Viaje redondo! Tu cohete pesa x${r.masa.toFixed(2)} respecto al original: cada mejora nueva hará que cada viaje gaste más. Elige la que resuelva lo que hoy te frena.`;
}

const fila = (a, b) => `<div class="inf-fila"><span>${a}</span><b>${b}</b></div>`;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const COLOR_PLANETA = { mercurio: "#a79a8a", venus: "#e8c372", marte: "#c1440e", jupiter: "#c9955c", europa: "#dcebf5" };
const signo = x => (x > 0 ? "+" : "") + x;

// Reporte de misión como pantalla de resultados: primero lo importante (estrellas, puntos y 4 fichas),
// luego la lección del Dr. Nova y por qué salió así; los números del viaje quedan en "Ver los números".
// r: datos del viaje · ev: evaluación del diseño (o null) · eq: metas del equipo (o null)
export function htmlReporte(r, ev = null, eq = null, { premio = 0, record = false } = {}) {
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

  const titulo = r.rescate ? "Misión con rescate" : ev && ev.cumplido ? "¡Objetivo cumplido!" : r.cumplio ? "¡Misión cumplida!" : "Misión terminada";
  const ganado = premio + (r.rescate ? 0 : r.valor) + (r.cumplio ? M.recompensa : 0);
  const margen = r.combustibleFinal / Math.max(1, r.capacidad);
  const ficha = (icono, nombre, valor, nota, clase) => `<div class="rf ${clase}"><span class="rf-icono">${icono}</span><small>${nombre}</small><b>${valor}</b><em>${nota}</em></div>`;
  const total = ev ? ev.total + (eq ? eq.bonus : 0) : 0;
  const p = ev ? ev.puntos : null;

  return `<div class="rep">
    <div class="rep-cabeza">
      <span class="rep-planeta" style="--c:${COLOR_PLANETA[r.dest]}"></span>
      <div><small>📋 Reporte de misión · ${d.lugar} · días ${r.dia} a ${r.dia + r.dias}</small><h2>${titulo}</h2></div>
    </div>
    ${ev ? `<div class="rep-puntos">
      <div class="rep-estrellas">${[0, 1, 2].map(i => `<span class="inf-estrella ${i < ev.estrellas ? "" : "vacia"}">${i < ev.estrellas ? "⭐" : "☆"}</span>`).join("")}</div>
      <div><b class="rep-total" data-contar="${total}">${total}</b> puntos <small>· la referencia de ${d.lugar} es ${ev.meta}</small></div>
      ${record ? `<span class="inf-record">🏅 ¡Nuevo récord!</span>` : ""}
    </div>` : ""}
    <div class="rep-fichas">
      ${ev ? ficha("🎯", "Objetivo", ev.cumplido ? "Cumplido" : "No cumplido", ev.obj ? ev.obj.titulo : "Sin objetivo", ev.cumplido ? "bien" : "mal")
        : ficha("🎯", "Misión", r.cumplio ? "Cumplida" : r.misionHecha ? "Ya hecha" : "Pendiente", M.titulo, r.cumplio ? "bien" : "")}
      ${ev ? ficha("🔬", "Ciencia", `${ev.entregadoTotal} MB`, ev.perdidos ? `${ev.perdidos} MB se perdieron` : "enviados a la Tierra", ev.perdidos ? "justo" : "bien")
        : ficha("📦", "Carga", `${r.traidos.length}`, r.traidos.length === 1 ? "objeto" : "objetos", "")}
      ${ficha("💰", "Ganaste", `+${ganado}`, "premio, carga y misión", ganado > 0 ? "bien" : "")}
      ${ficha("⛽", "Combustible", `${Math.floor(r.combustibleFinal)}`, r.rescate ? "¡hubo que rescatarte!" : `de ${r.capacidad} al volver`, r.rescate ? "mal" : margen < 0.12 ? "justo" : "bien")}
    </div>
    <div class="rep-nova"><span class="rep-nova-cara">👨‍🔬</span><div><b>Lo que aprendimos</b><p>${r.leccion}</p></div></div>
    ${ev ? `<div class="rep-bloque"><h3>¿Por qué salió así?</h3><ul class="rep-lista">${ev.porque.map(t => `<li>${t}</li>`).join("")}</ul></div>` : ""}
    ${eq ? `<div class="rep-bloque"><h3>👥 Metas del equipo · +${eq.bonus} puntos</h3><ul class="rep-lista">${eq.metas.map(m => `<li>${m.ok ? "✅" : "❌"} ${m.icono} <b>${m.jugador ? m.jugador.nombre : m.nombre}:</b> ${m.meta}</li>`).join("")}</ul></div>` : ""}
    ${ev && ev.parecido ? `<div class="rep-parecido"><span>🛰</span><div><small>Tu diseño se parece a una misión real</small><b>${ev.parecido}</b></div></div>` : ""}
    <details class="rep-detalles"><summary>📋 Ver los números del viaje</summary>
      ${fila("⛽ Combustible usado", `${usado.toFixed(0)} (${partes})`)}
      ${fila("⛽ Al volver", `${Math.floor(r.combustibleFinal)} / ${r.capacidad}`)}
      ${fila("🪐 Ventana", r.recargo > 0.01 ? `Fuera de ventana · +${Math.round(r.recargo * 100)} % combustible` : "Despegue en ventana")}
      ${fila("🛬 Aterrizaje", aterrizaje)}
      ${fila("🎯 Misión del lugar", mision)}
      ${fila("📦 Carga", carga)}
      ${r.aterrizo ? fila("🛡 Traje", traje) : ""}
      ${fila("🔋 Energía", r.sinEnergia ? "Se agotó" : `${Math.round(r.energiaMin * 100)} % mínimo`)}
      ${fila("⏱ Tiempo de juego", mmss(r.tiempo))}
      ${p ? fila("🔬 Puntos de ciencia", signo(p.ciencia)) + fila("🎯 Puntos del objetivo", ev.cumplido ? "+300" : "0") + fila("💰 Puntos de presupuesto", signo(p.presupuesto)) + (p.riesgo ? fila("⚠ Riesgos", signo(p.riesgo)) : "") : ""}
      ${eq ? fila("👥 Metas del equipo", `+${eq.bonus}`) : ""}
      ${premio ? fila("💵 Premio científico", `+${premio} 💰`) : ""}
    </details>
    <button class="rep-seguir" data-cerrar>Continuar <kbd>E</kbd></button>
  </div>`;
}

// Animación del reporte: los puntos cuentan desde 0
export function animarReporte(raiz) {
  raiz.scrollTop = 0;
  raiz.querySelectorAll("[data-contar]").forEach(e => {
    const fin = Number(e.dataset.contar) || 0, t0 = performance.now(), dur = 1100;
    const paso = ahora => {
      const f = Math.min(1, (ahora - t0) / dur);
      e.textContent = Math.round(fin * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(paso);
    };
    e.textContent = "0";
    requestAnimationFrame(paso);
  });
}
