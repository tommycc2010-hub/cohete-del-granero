// Laboratorio de Diseño de Misión: la pantalla donde se diseña cada viaje antes de despegar.
// Inspirado en el Mission Design Lab de la NASA y en los niveles de madurez del concepto (CML) del JPL:
// 1) objetivo · 2) instrumentos · 3) lanzador · 4) tipo de misión, con un panel que muestra en vivo
// cómo cada decisión cambia la masa, la energía, el presupuesto, el combustible y los datos.
// En modo equipo (2 a 4 personas) cada parte tiene una persona responsable y todas deben aprobar el despegue.
import { estado, ponerEquipo } from "./reglas.js";
import { DATOS_PLANETAS } from "./datos.js";
import {
  INSTRUMENTOS, LANZADORES, TIPOS, OBJETIVOS, ROLES, calcularDiseno, disenoParaMision,
  memoriaNave, enlace, premioObjetivo, armarEquipo, quienTieneRol,
} from "./diseno.js";

const CML = ["Sin definir", "CML 1 · Idea", "CML 2 · Viabilidad", "CML 3 · Comparar opciones", "CML 4 · Diseño final"];
const barra = (valor, max, clase = "") => `<div class="lab-barra ${clase}"><i style="width:${Math.min(100, 100 * valor / Math.max(1, max))}%"></i></div>`;

// Qué rol decide cada parte del diseño
const PARTE_ROL = { objetivo: "direccion", inst: "ciencia", lanzador: "ingenieria", tipo: "operaciones" };

// avisos: { alDespegar(diseno) -> true si despegó, alCancelar(),
//           enLinea() -> null o { anfitrion, miIndice, equipo } (multijugador en línea),
//           compartir(estadoLab) (anfitrión: manda el diseño a todos), pedir(accion) (invitado: pide un cambio al anfitrión) }
export function crearLaboratorio(avisos) {
  const el = document.getElementById("laboratorio");
  let dest = null, sel = null, aprobado = {}, verMetas = false, armando = false;
  const recordados = {}; // último diseño de cada destino

  const linea = () => (avisos.enLinea && avisos.enLinea()) || null;
  const equipo = () => (linea() ? linea().equipo : estado.equipo);
  const responsable = rol => {
    const j = quienTieneRol(equipo(), rol);
    const yo = linea() && j === equipo().jugadores[linea().miIndice];
    return j ? `<span class="lab-rol ${yo ? "yo" : ""}">${ROLES[rol].icono} ${yo ? "Tú" : j.nombre} · ${ROLES[rol].nombre}</span>` : "";
  };
  const enEquipo = () => !!(equipo() && equipo().activo);
  // ¿Puede la persona `quien` (índice en el equipo) cambiar esta parte? Sin red, todos pueden todo.
  function puede(parte, quien) {
    const L = linea();
    if (!L) return true;
    const j = equipo().jugadores[quien];
    return !!j && j.roles.includes(PARTE_ROL[parte]);
  }
  const mia = parte => puede(parte, linea() ? linea().miIndice : 0);
  function compartir() {
    const L = linea();
    if (L && L.anfitrion && avisos.compartir) avisos.compartir({ abierto: el.classList.contains("abierto"), dest, sel, aprobado });
  }

  function abrir(d) {
    dest = d;
    // Por defecto, el lanzador más barato en el que cabe la nave
    const cabe = Object.keys(LANZADORES).find(id => LANZADORES[id].capacidad >= calcularDiseno(d, { objetivo: OBJETIVOS[d][0].id }).masa) || "pesado";
    sel = recordados[d] || { objetivo: OBJETIVOS[d][0].id, instrumentos: [], lanzador: cabe, tipo: "aterrizaje" };
    aprobado = {};
    armando = false;
    el.classList.add("abierto");
    pintar();
    compartir();
  }
  function cerrar() { el.classList.remove("abierto"); compartir(); }
  // Invitado: el anfitrión mandó el estado del diseño
  function recibir(s) {
    if (!s || !s.abierto || !Object.hasOwn(OBJETIVOS, s.dest) || !s.sel || !Array.isArray(s.sel.instrumentos)) return el.classList.remove("abierto");
    dest = s.dest; sel = s.sel; aprobado = s.aprobado || {}; armando = false;
    el.classList.add("abierto");
    pintar();
  }

  function pintar() {
    if (armando) return pintarEquipo();
    const c = calcularDiseno(dest, sel);
    const L = LANZADORES[sel.lanzador], P = DATOS_PLANETAS[dest];
    const obj = OBJETIVOS[dest].find(o => o.id === sel.objetivo);
    const aprobados = enEquipo() ? equipo().jugadores.every((j, i) => aprobado[i]) : true;
    const red = linea(), bloq = parte => (mia(parte) ? "" : "disabled");

    const objetivos = OBJETIVOS[dest].map(o => `<button class="lab-op ${sel.objetivo === o.id ? "sel" : ""}" data-objetivo="${o.id}" ${bloq("objetivo")}>
      <b>${o.titulo}</b><small>${o.desc}</small>
      <small class="lab-necesita">Necesita ${o.necesita.map(id => INSTRUMENTOS[id].icono + " " + INSTRUMENTOS[id].nombre).join(" o ")} · ${o.datos} MB · premio ${premioObjetivo(dest)} 💰</small></button>`).join("");

    const instrumentos = Object.entries(INSTRUMENTOS).map(([id, I]) => {
      const on = sel.instrumentos.includes(id), util = obj && obj.necesita.includes(id);
      const sirveAqui = (I.donde.includes("orbita") && TIPOS[sel.tipo].orbita > 0) || (I.donde.includes("suelo") && TIPOS[sel.tipo].suelo > 0);
      return `<button class="lab-inst ${on ? "sel" : ""} ${util ? "util" : ""} ${sirveAqui ? "" : "no-sirve"}" data-inst="${id}" title="${I.real}" ${bloq("inst")}>
        <span class="lab-icono">${I.icono}</span><b>${I.nombre}</b>${util ? `<em>objetivo</em>` : ""}
        <small>${I.desc}</small>
        <small class="lab-num">⚖ ${I.masa} kg · ⚡ ${I.potencia}/s · 💰 ${I.costo} · 💾 ${I.datos} MB/s · ⭐ ×${I.valor} · ${I.donde.map(x => x === "orbita" ? "órbita" : "suelo").join(" y ")}</small></button>`;
    }).join("");

    const lanzadores = Object.entries(LANZADORES).map(([id, X]) => `<button class="lab-op ${sel.lanzador === id ? "sel" : ""} ${c.masa > X.capacidad ? "no-sirve" : ""}" data-lanzador="${id}" ${bloq("lanzador")}>
      <b>${X.nombre}</b><small>Lleva hasta ${X.capacidad} kg · ${X.costo ? X.costo + " 💰" : "gratis"}</small><small>${X.desc}</small></button>`).join("");

    const tipos = Object.entries(TIPOS).map(([id, X]) => `<button class="lab-op ${sel.tipo === id ? "sel" : ""}" data-tipo="${id}" ${bloq("tipo")}>
      <b>${X.icono} ${X.nombre}</b><small>${X.desc}</small><small class="lab-necesita">Combustible ×${X.combustible} · ${X.real}</small></button>`).join("");

    const fila = (icono, nombre, texto, b) => `<div class="lab-dato"><span>${icono} ${nombre}</span><b>${texto}</b>${b}</div>`;
    const panel = `
      ${fila("⚖", "Masa", `${c.masa} / ${L.capacidad} kg`, barra(c.masa, L.capacidad, c.masa > L.capacidad ? "mal" : c.masa > L.capacidad * 0.9 ? "justo" : ""))}
      ${fila("⚡", "Energía", `${c.gen.toFixed(1)} genera · ${c.gasto.toFixed(1)} gasta /s`, barra(c.gasto, Math.max(c.gen, c.gasto), c.gen < c.gasto ? "mal" : ""))}
      ${fila("💰", "Presupuesto", `${c.costo} / ${estado.dinero} 💰`, barra(c.costo, estado.dinero, c.costo > estado.dinero ? "mal" : ""))}
      ${fila("⛽", "Combustible", `${c.ida * 2} / ${Math.floor(estado.combustible)} ⛽`, barra(c.ida * 2, estado.combustible, c.ida * 2 > estado.combustible ? "mal" : ""))}
      ${fila("💾", "Datos esperados", `${c.datosEsperados} MB · memoria ${memoriaNave()} MB`, barra(c.datosEsperados, memoriaNave() + enlace(dest) * 60, c.datosEsperados > memoriaNave() * 1.5 ? "justo" : ""))}
      ${fila("📡", "Enlace con la Tierra", `${enlace(dest).toFixed(1)} MB/s · señal ${Math.round(P.senal[0])}-${P.senal[1]} min`, "")}
      ${fila("📅", "Tiempo", `${P.viaje} días de viaje`, "")}`;

    const revision = c.errores.map(t => `<li class="mal">⛔ ${t}</li>`).join("") + c.avisos.map(t => `<li class="justo">⚠ ${t}</li>`).join("")
      || `<li class="bien">✅ Diseño equilibrado: cumple el objetivo, cabe en el lanzador y tiene energía y memoria de sobra.</li>`;

    const aprobacion = enEquipo() ? `<div class="lab-aprobar"><b>👥 Todo el equipo debe aprobar:</b>${equipo().jugadores.map((j, i) =>
      `<label class="${red && i === red.miIndice ? "yo" : ""}"><input type="checkbox" data-aprueba="${i}" ${aprobado[i] ? "checked" : ""} ${red && i !== red.miIndice ? "disabled" : ""}> ${red && i === red.miIndice ? "Tú" : j.nombre} (${j.roles.map(r => ROLES[r].icono).join("")})</label>`).join("")}
      <button class="lab-link" data-acc="metas">${verMetas ? "Ocultar" : "Ver"} las metas de cada rol</button>
      ${verMetas ? `<ul class="lab-metas">${Object.entries(ROLES).map(([id, R]) => `<li>${R.icono} <b>${R.nombre}</b> (${(quienTieneRol(equipo(), id) || {}).nombre || "—"}): ${R.meta}</li>`).join("")}</ul>` : ""}</div>` : "";

    el.innerHTML = `<div class="lab tarjeta">
      <div class="lab-cabeza">
        <h2>🧪 Laboratorio de Diseño de Misión · ${P.lugar}</h2>
        <div class="lab-cml">${[1, 2, 3, 4].map(n => `<i class="${c.cml >= n ? "on" : ""}"></i>`).join("")}<span>${CML[c.cml]}</span></div>
        ${red ? `<span class="lab-link en-linea">🌐 Sala en línea · ${equipo().jugadores.length} ${equipo().jugadores.length === 1 ? "persona" : "personas"}</span>`
          : `<button class="lab-link" data-acc="equipo">👥 ${enEquipo() ? "Equipo: " + estado.equipo.jugadores.map(j => j.nombre).join(", ") : "Modo equipo"}</button>`}
        <button class="lab-x" data-acc="cancelar" title="Volver">✕</button>
      </div>
      <div class="lab-cuerpo">
        <div class="lab-pasos">
          <h3>1 · Objetivo científico ${responsable("direccion")}</h3><div class="lab-ops">${objetivos}</div>
          <h3>2 · Instrumentos ${responsable("ciencia")}</h3><p class="lab-nota">Cada instrumento suma ciencia, pero también masa, energía, costo y datos que guardar y enviar.</p><div class="lab-insts">${instrumentos}</div>
          <h3>3 · Lanzador ${responsable("ingenieria")}</h3><div class="lab-ops">${lanzadores}</div>
          <h3>4 · Tipo de misión ${responsable("operaciones")}</h3><div class="lab-ops">${tipos}</div>
        </div>
        <div class="lab-lado">
          <h3>📊 Recursos de la misión</h3>${panel}
          <h3>📻 Revisión del Dr. Nova</h3><ul class="lab-revision">${revision}</ul>
          ${aprobacion}
          <div class="lab-botones">
            <button class="lab-boton" data-acc="cancelar">← Volver al mapa</button>
            <button class="lab-boton principal" data-acc="despegar" ${c.valido && aprobados && (!red || red.anfitrion) ? "" : "disabled"}>🚀 Despegar</button>
          </div>
          ${!c.valido ? `<p class="lab-nota">Corrige lo marcado con ⛔ para poder despegar.</p>` : !aprobados ? `<p class="lab-nota">Falta que todo el equipo apruebe el diseño.</p>`
            : red && !red.anfitrion ? `<p class="lab-nota">Todo aprobado: ${equipo().jugadores[0].nombre} (anfitrión) pulsa Despegar.</p>` : ""}
          ${red ? `<p class="lab-nota">Cada persona solo cambia la parte de su rol; las demás se ven en gris.</p>` : ""}
        </div>
      </div></div>`;
    el._calculo = c;
  }

  // Preparar el modo equipo: de 1 (individual) a 4 personas
  function pintarEquipo() {
    const n = estado.equipo && estado.equipo.activo ? estado.equipo.jugadores.length : 1;
    const nombres = estado.equipo ? estado.equipo.jugadores.map(j => j.nombre) : [];
    el.innerHTML = `<div class="lab tarjeta lab-equipo">
      <div class="lab-cabeza"><h2>👥 Modo equipo</h2><button class="lab-x" data-acc="volver">✕</button></div>
      <p>De 2 a 4 personas diseñan la misión juntas en este dispositivo. Cada una es responsable de una parte y tiene una <b>meta de rol</b>
      que choca con las de las demás (Ciencia quiere más instrumentos, Dirección quiere gastar poco…). Tienen que negociar: el cohete solo despega si <b>todo el equipo aprueba</b>.
      Al final, cada meta cumplida suma puntos al equipo.</p>
      <div class="lab-ops">${[1, 2, 3, 4].map(k => `<button class="lab-op ${k === n ? "sel" : ""}" data-personas="${k}"><b>${k === 1 ? "Individual" : k + " personas"}</b></button>`).join("")}</div>
      <div class="lab-nombres">${n > 1 ? Array.from({ length: n }, (_, i) => `<label>Persona ${i + 1} <input data-nombre="${i}" maxlength="20" value="${(nombres[i] || "").replace(/"/g, "")}" placeholder="Nombre"></label>`).join("") : ""}</div>
      <ul class="lab-metas">${Object.values(ROLES).map(R => `<li>${R.icono} <b>${R.nombre}</b> (${R.parte === "tipo" ? "tipo de misión" : R.parte}): ${R.meta}</li>`).join("")}</ul>
      <div class="lab-botones"><button class="lab-boton principal" data-acc="guardar-equipo">Listo</button></div></div>`;
    el._personas = n;
  }

  el.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (armando) {
      if (b.dataset.personas) {
        const n = Number(b.dataset.personas);
        const nombres = [...el.querySelectorAll("[data-nombre]")].map(i => i.value);
        ponerEquipo(n === 1 ? null : armarEquipo(Array.from({ length: n }, (_, i) => nombres[i] || `Jugador ${i + 1}`)));
        return pintar();
      }
      if (b.dataset.acc === "guardar-equipo") {
        const nombres = [...el.querySelectorAll("[data-nombre]")].map(i => i.value);
        if (nombres.length) ponerEquipo(armarEquipo(nombres));
        armando = false; aprobado = {};
        return pintar();
      }
      if (b.dataset.acc === "volver") { armando = false; return pintar(); }
      return;
    }
    const acc = b.dataset.acc;
    if (acc === "metas") { verMetas = !verMetas; return pintar(); }
    if (acc === "cancelar") {
      if (linea() && !linea().anfitrion) { el.classList.remove("abierto"); if (avisos.alCerrarVista) avisos.alCerrarVista(); return; } // el invitado solo deja de mirarlo
      return avisos.alCancelar();
    }
    if (acc === "equipo") { armando = true; return pintar(); }
    const d = b.dataset;
    const accion = d.objetivo ? { objetivo: d.objetivo } : d.inst ? { inst: d.inst } : d.lanzador ? { lanzador: d.lanzador }
      : d.tipo ? { tipo: d.tipo } : acc === "despegar" ? { despegar: true } : null;
    if (accion) hacer(accion);
  });
  el.addEventListener("change", e => {
    const i = e.target.dataset && e.target.dataset.aprueba;
    if (i !== undefined) hacer({ aprueba: Number(i), valor: e.target.checked });
  });
  // Un invitado pide el cambio al anfitrión; si no, se aplica aquí
  function hacer(accion) {
    const L = linea();
    if (L && !L.anfitrion) { if (avisos.pedir) avisos.pedir(accion); return; }
    aplicar(accion, L ? L.miIndice : 0);
  }
  // Aplicar un cambio de la persona `quien` (en línea, solo el anfitrión lo hace y luego lo comparte)
  function aplicar(accion, quien) {
    if (!dest || !el.classList.contains("abierto") || armando || !accion) return;
    const cambio = () => { aprobado = {}; recordados[dest] = sel; pintar(); compartir(); }; // cualquier cambio pide aprobar de nuevo
    const parte = ["objetivo", "inst", "lanzador", "tipo"].find(k => accion[k] !== undefined);
    if (parte && !puede(parte, quien)) return;
    const es = (tabla, k) => typeof k === "string" && Object.hasOwn(tabla, k); // nada de claves raras como "__proto__"
    if (accion.objetivo && OBJETIVOS[dest].some(o => o.id === accion.objetivo)) { sel = { ...sel, objetivo: accion.objetivo }; return cambio(); }
    if (accion.inst && es(INSTRUMENTOS, accion.inst)) {
      const id = accion.inst;
      sel = { ...sel, instrumentos: sel.instrumentos.includes(id) ? sel.instrumentos.filter(x => x !== id) : [...sel.instrumentos, id] };
      return cambio();
    }
    if (accion.lanzador && es(LANZADORES, accion.lanzador)) { sel = { ...sel, lanzador: accion.lanzador }; return cambio(); }
    if (accion.tipo && es(TIPOS, accion.tipo)) { sel = { ...sel, tipo: accion.tipo }; return cambio(); }
    if (Number.isInteger(accion.aprueba)) {
      if (linea() && accion.aprueba !== quien) return; // cada quien aprueba por sí mismo
      aprobado = { ...aprobado, [accion.aprueba]: !!accion.valor };
      pintar(); compartir();
      return;
    }
    if (accion.despegar) {
      const c = calcularDiseno(dest, sel);
      const aprobados = enEquipo() ? equipo().jugadores.every((j, i) => aprobado[i]) : true;
      if (!c.valido || !aprobados || (linea() && !linea().anfitrion)) return;
      recordados[dest] = sel;
      avisos.alDespegar(disenoParaMision(c));
    }
  }

  return {
    abrir, cerrar, recibir, aplicar,
    refrescar() { if (el.classList.contains("abierto")) { aprobado = {}; pintar(); compartir(); } },
    get abierto() { return el.classList.contains("abierto"); },
  };
}

// ----- Resultado de la misión, para el reporte -----
export function htmlEvaluacion(ev, eq, { premio = 0, record = false } = {}) {
  if (!ev) return "";
  const estrellas = `<span class="inf-estrellas-fila">${[0, 1, 2].map(i => `<span class="inf-estrella">${i < ev.estrellas ? "⭐" : "☆"}</span>`).join("")}</span>`;
  const p = ev.puntos;
  const fila = (a, b) => `<div class="inf-fila"><span>${a}</span><b>${b}</b></div>`;
  const signo = x => (x > 0 ? "+" : "") + x;
  return `<div class="inf-diseno">
    <h3>🧪 Evaluación del diseño</h3>
    <p class="inf-estrellas">${estrellas} <b>${ev.total + (eq ? eq.bonus : 0)} puntos</b> <small>(referencia de ${DATOS_PLANETAS[ev.d.dest].lugar}: ${ev.meta})</small>${record ? ` <span class="inf-record">🏅 ¡Nuevo récord!</span>` : ""}</p>
    ${fila("🔬 Ciencia", `${signo(p.ciencia)} · ${ev.entregadoTotal} MB entregados${ev.perdidos ? ` · ${ev.perdidos} MB perdidos` : ""}`)}
    ${fila("🎯 Objetivo", ev.cumplido ? `+300 · ${ev.obj.titulo}` : `0 · ${ev.obj ? ev.obj.titulo : "sin objetivo"}`)}
    ${fila("💰 Presupuesto", signo(p.presupuesto))}
    ${p.riesgo ? fila("⚠ Riesgos", signo(p.riesgo)) : ""}
    ${eq ? fila("👥 Metas del equipo", `+${eq.bonus}`) : ""}
    ${premio ? fila("💵 Premio científico", `+${premio} 💰`) : ""}
    <div class="inf-porque"><b>¿Por qué salió así?</b><ul>${ev.porque.map(t => `<li>${t}</li>`).join("")}</ul></div>
    ${eq ? `<div class="inf-porque"><b>👥 Metas de rol</b><ul>${eq.metas.map(m => `<li>${m.ok ? "✅" : "❌"} ${m.icono} ${m.jugador ? m.jugador.nombre : m.nombre}: ${m.meta}</li>`).join("")}</ul></div>` : ""}
    ${ev.parecido ? `<div class="inf-parecido">🛰 <b>Tu diseño se parece a:</b> ${ev.parecido}</div>` : ""}
  </div>`;
}
