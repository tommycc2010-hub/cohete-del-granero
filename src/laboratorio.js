// Laboratorio de Diseño de Misión: la pantalla donde se diseña cada viaje antes de despegar.
// Es una guía paso a paso (una decisión por pantalla) para que se entienda sin leer tablas:
// 1) objetivo · 2) instrumentos · 3) lanzador · 4) ruta (tipo de misión) · 5) revisar y despegar.
// A un lado, "Tu nave" muestra con medidores simples cómo cada decisión cambia el peso, la energía,
// el dinero, el combustible y los datos, y el Dr. Nova explica cada paso con palabras sencillas.
// Inspirado en el Mission Design Lab de la NASA y en los niveles de madurez del concepto (CML) del JPL.
// En modo equipo (2 a 4 personas) cada paso tiene una persona responsable y todas deben aprobar el despegue.
import { estado, ponerEquipo } from "./reglas.js";
import { DATOS_PLANETAS } from "./datos.js";
import {
  INSTRUMENTOS, LANZADORES, TIPOS, OBJETIVOS, ROLES, calcularDiseno, disenoParaMision,
  memoriaNave, premioObjetivo, armarEquipo, quienTieneRol,
} from "./diseno.js";

// Madurez del diseño (CML), dicha con palabras sencillas
const MADUREZ = ["Sin empezar", "Idea", "Posible", "Comparado", "Listo"];
// Qué rol decide cada parte del diseño
const PARTE_ROL = { objetivo: "direccion", inst: "ciencia", lanzador: "ingenieria", tipo: "operaciones" };
const PASOS = [
  { id: "objetivo", nombre: "Objetivo", icono: "🎯", pregunta: "¿Qué quieres descubrir?" },
  { id: "inst", nombre: "Instrumentos", icono: "🔬", pregunta: "¿Con qué vas a observar?" },
  { id: "lanzador", nombre: "Lanzador", icono: "🚀", pregunta: "¿Qué cohete te sube al espacio?" },
  { id: "tipo", nombre: "Ruta", icono: "🛰", pregunta: "¿Cómo vas a visitar el planeta?" },
  { id: "revisar", nombre: "¡Despegar!", icono: "✅", pregunta: "Revisa el plan y despega" },
];
// Dibujo sencillo de cada ruta
const RUTA_DIBUJO = { sobrevuelo: "🪐 ⤳ 🚀 ⤳", orbitador: "🪐 ⟲ 🛰", aterrizaje: "🪐 ⬇ 🚀" };
const RUTA_CORTA = {
  sobrevuelo: "Pasas cerca del planeta y sigues de largo. Barato, pero solo hay unos segundos para observar.",
  orbitador: "Te quedas dando vueltas alrededor del planeta. Mucho tiempo para observar desde arriba.",
  aterrizaje: "Bajas a la superficie. Lo más completo, pero gasta más combustible y es más arriesgado.",
};
const nivel = (v, poco, mucho) => (v <= poco ? "poco" : v <= mucho ? "medio" : "mucho");

// avisos: { alDespegar(diseno) -> true si despegó, alCancelar(), alCerrarVista(),
//           enLinea() -> null o { anfitrion, miIndice, equipo } (multijugador en línea),
//           compartir(estadoLab) (anfitrión: manda el diseño a todos), pedir(accion) (invitado: pide un cambio al anfitrión) }
export function crearLaboratorio(avisos) {
  const el = document.getElementById("laboratorio");
  let dest = null, sel = null, aprobado = {}, verMetas = false, armando = false, paso = 0;
  let previo = null;          // el cálculo anterior: para mostrar qué cambió (+35 kg, +120 💰)
  const anchoAntes = {};      // ancho anterior de cada medidor, para animar el cambio
  const recordados = {};      // último diseño de cada destino

  const linea = () => (avisos.enLinea && avisos.enLinea()) || null;
  const equipo = () => (linea() ? linea().equipo : estado.equipo);
  const enEquipo = () => !!(equipo() && equipo().activo);
  // ¿Puede la persona `quien` (índice en el equipo) cambiar esta parte? Sin red, todos pueden todo.
  function puede(parte, quien) {
    const L = linea();
    if (!L) return true;
    const j = equipo().jugadores[quien];
    return !!j && j.roles.includes(PARTE_ROL[parte]);
  }
  const mia = parte => puede(parte, linea() ? linea().miIndice : 0);
  const quienDecide = parte => quienTieneRol(equipo(), PARTE_ROL[parte]);
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
    paso = primerPasoMio();
    previo = null;
    el.classList.add("abierto");
    pintar();
    compartir();
  }
  function cerrar() { el.classList.remove("abierto"); compartir(); }
  // En línea, cada persona empieza en el primer paso que le toca decidir
  function primerPasoMio() {
    if (!linea()) return 0;
    const i = PASOS.findIndex(p => PARTE_ROL[p.id] && mia(p.id));
    return Math.max(0, i);
  }
  // Invitado: el anfitrión mandó el estado del diseño
  function recibir(s) {
    if (!s || !s.abierto || !Object.hasOwn(OBJETIVOS, s.dest) || !s.sel || !Array.isArray(s.sel.instrumentos)) return el.classList.remove("abierto");
    const nuevo = !el.classList.contains("abierto") || dest !== s.dest;
    dest = s.dest; sel = s.sel; aprobado = s.aprobado || {}; armando = false;
    if (nuevo) { paso = primerPasoMio(); previo = null; }
    el.classList.add("abierto");
    pintar();
  }

  // ----- Piezas de la pantalla -----
  // Medidor con carita: 😀 bien · 😬 justo · ⛔ no alcanza
  function medidor(clave, icono, nombre, usado, max, detalle, estadoM) {
    const pct = Math.max(2, Math.min(100, 100 * usado / Math.max(1, max)));
    const de = anchoAntes[clave] ?? pct;
    anchoAntes[clave] = pct;
    const cara = { bien: "😀 Bien", justo: "😬 Justo", mal: "⛔ No alcanza" }[estadoM];
    return `<div class="lm ${estadoM}"><div class="lm-cab"><span>${icono} ${nombre}</span><b>${cara}</b></div>
      <div class="lm-barra"><i style="--de:${de}%;--a:${pct}%"></i></div><small>${detalle}</small></div>`;
  }
  const chip = (texto, clase = "") => `<span class="lchip ${clase}">${texto}</span>`;

  function pintar() {
    if (armando) return pintarEquipo();
    const c = calcularDiseno(dest, sel);
    const L = LANZADORES[sel.lanzador], P = DATOS_PLANETAS[dest];
    const obj = OBJETIVOS[dest].find(o => o.id === sel.objetivo);
    const aprobados = enEquipo() ? equipo().jugadores.every((j, i) => aprobado[i]) : true;
    const red = linea();
    const pasoA = PASOS[paso];
    const parte = PARTE_ROL[pasoA.id] ? pasoA.id : null, rol = PARTE_ROL[pasoA.id]; // la parte del diseño y el rol que la decide
    const bloq = parte && !mia(parte) ? "disabled" : "";

    // ¿Qué cambió desde la última vez? (se ve como una etiqueta que aparece y se va)
    let cambio = "";
    if (previo) {
      const dm = c.masa - previo.masa, dc = c.costo - previo.costo, df = c.ida * 2 - previo.ida * 2;
      const partes = [dm && `${dm > 0 ? "+" : ""}${dm} kg`, dc && `${dc > 0 ? "+" : ""}${dc} 💰`, df && `${df > 0 ? "+" : ""}${df} ⛽`].filter(Boolean);
      if (partes.length) cambio = `<div class="lab-cambio ${dm > 0 || dc > 0 ? "sube" : "baja"}">${partes.join(" · ")}</div>`;
    }
    previo = c;

    // Estado de cada paso, para la barra de pasos de arriba
    const estadoPaso = {
      objetivo: obj ? "ok" : "falta",
      inst: c.sirven.length ? "ok" : "aviso",
      lanzador: c.masa > L.capacidad ? "mal" : "ok",
      tipo: estado.combustible < c.ida * 2 ? "mal" : "ok",
      revisar: c.errores.length ? "mal" : c.avisos.length ? "aviso" : "ok",
    };
    const marca = { ok: "✓", aviso: "!", mal: "✕", falta: "" };
    const pasos = PASOS.map((p, i) => {
      const j = PARTE_ROL[p.id] && enEquipo() ? quienDecide(p.id) : null;
      const yo = red && j && j === equipo().jugadores[red.miIndice];
      return `<button class="lp ${i === paso ? "actual" : ""} ${estadoPaso[p.id]}" data-paso="${i}">
        <span class="lp-num">${i === paso ? p.icono : marca[estadoPaso[p.id]] || i + 1}</span><b>${p.nombre}</b>
        ${j ? `<small class="${yo ? "yo" : ""}">${ROLES[PARTE_ROL[p.id]].icono} ${yo ? "Tú" : j.nombre}</small>` : ""}</button>`;
    }).join(`<i class="lp-linea"></i>`);

    // ----- Contenido del paso actual -----
    let cuerpo = "", nova = "";
    if (pasoA.id === "objetivo") {
      cuerpo = `<div class="lc-grid tres">${OBJETIVOS[dest].map(o => `<button class="lc ${sel.objetivo === o.id ? "sel" : ""}" data-objetivo="${o.id}" ${bloq}>
        <span class="lc-icono">${INSTRUMENTOS[o.necesita[0]].icono}</span><b>${o.titulo}</b><p>${o.desc}</p>
        <div class="lc-chips">${chip("Necesitas " + o.necesita.map(id => INSTRUMENTOS[id].icono + " " + INSTRUMENTOS[id].nombre).join(" o "), "morado")}${chip("🏆 premio " + premioObjetivo(dest) + " 💰", "oro")}</div></button>`).join("")}</div>`;
      nova = `Cada objetivo es una pregunta de verdad que la ciencia quiere responder sobre ${P.lugar}. Elige una: en el siguiente paso escogerás los instrumentos que la responden.`;
    } else if (pasoA.id === "inst") {
      const necesita = obj ? obj.necesita.map(id => INSTRUMENTOS[id].icono + " " + INSTRUMENTOS[id].nombre).join(" o ") : "";
      cuerpo = `<div class="lc-grid">${Object.entries(INSTRUMENTOS).map(([id, I]) => {
        const on = sel.instrumentos.includes(id), util = obj && obj.necesita.includes(id);
        const sirve = (I.donde.includes("orbita") && TIPOS[sel.tipo].orbita > 0) || (I.donde.includes("suelo") && TIPOS[sel.tipo].suelo > 0);
        return `<button class="lc chico ${on ? "sel" : ""} ${sirve ? "" : "apagado"}" data-inst="${id}" title="${I.real}" ${bloq}>
          ${util ? `<em class="lc-sello">🎯 Lo pide tu objetivo</em>` : !sirve ? `<em class="lc-sello gris">No sirve en esta ruta</em>` : ""}
          <span class="lc-icono">${I.icono}</span><b>${I.nombre}</b><p>${I.desc}</p>
          <div class="lc-chips">${chip("⚖ " + I.masa + " kg")}${chip("⚡ " + nivel(I.potencia, 0.06, 0.12))}${chip("💰 " + I.costo)}${chip("⭐ ×" + I.valor + " ciencia", "oro")}${chip(I.donde.map(x => (x === "orbita" ? "🛰 órbita" : "🥾 suelo")).join(" · "), "claro")}</div>
          <span class="lc-accion">${on ? "✓ En la nave · quitar" : "+ Añadir a la nave"}</span></button>`;
      }).join("")}</div>`;
      nova = !c.sirven.length ? `Tu objetivo necesita <b>${necesita}</b>. Búscalo con el sello 🎯. Sin él, el objetivo no se puede cumplir.`
        : `¡Bien! Ya llevas lo que pide tu objetivo. Cada instrumento de más da más ciencia (⭐), pero pesa, gasta energía y cuesta. Mira cómo cambian los medidores de tu nave.`;
    } else if (pasoA.id === "lanzador") {
      cuerpo = `<div class="lc-grid tres">${Object.entries(LANZADORES).map(([id, X], i) => {
        const cabe = c.masa <= X.capacidad;
        return `<button class="lc ${sel.lanzador === id ? "sel" : ""} ${cabe ? "" : "apagado"}" data-lanzador="${id}" ${bloq}>
          <span class="lc-icono" style="font-size:${30 + i * 14}px">🚀</span><b>${X.nombre}</b><p>${X.desc}</p>
          <div class="lc-cabe"><div class="lm-barra"><i style="--de:0%;--a:${Math.min(100, 100 * c.masa / X.capacidad)}%" class="${cabe ? "" : "mal"}"></i></div>
            <small>Tu nave: ${c.masa} kg de ${X.capacidad} kg</small></div>
          <div class="lc-chips">${chip(cabe ? "✓ Cabe" : "✕ No cabe", cabe ? "verde" : "rojo")}${chip(X.costo ? X.costo + " 💰" : "Gratis", "oro")}</div></button>`;
      }).join("")}</div>`;
      nova = c.masa > L.capacidad ? `Tu nave pesa <b>${c.masa} kg</b> y este lanzador solo puede subir ${L.capacidad} kg. Elige uno más grande o lleva menos instrumentos.`
        : `Tu nave cabe. Truco de ingeniería: el lanzador más pequeño que te sirva es el más barato. Los cohetes reales también se eligen así.`;
    } else if (pasoA.id === "tipo") {
      cuerpo = `<div class="lc-grid tres">${Object.entries(TIPOS).map(([id, X]) => `<button class="lc ${sel.tipo === id ? "sel" : ""}" data-tipo="${id}" ${bloq}>
        <span class="lc-dibujo">${RUTA_DIBUJO[id]}</span><b>${X.icono} ${X.nombre}</b><p>${RUTA_CORTA[id]}</p>
        <div class="lc-chips">${chip("⛽ " + (X.combustible < 1 ? "menos" : X.combustible > 1 ? "más" : "normal") + " combustible")}${chip(id === "aterrizaje" ? "⚠ más riesgo" : "🙂 poco riesgo")}${chip(id === "sobrevuelo" ? "⏱ poco tiempo" : id === "orbitador" ? "⏱ mucho tiempo" : "🥾 ciencia en el suelo", "claro")}</div>
        <small class="lc-real">${X.real}</small></button>`).join("")}</div>`;
      nova = estado.combustible < c.ida * 2 ? `Con esta ruta hacen falta <b>${c.ida * 2} ⛽</b> para ir y volver y tienes ${Math.floor(estado.combustible)}. Un sobrevuelo gasta menos, o compra combustible en el granero.`
        : `Piensa qué necesita tu objetivo: lo que se mide en el suelo (como un sismómetro) solo sirve si aterrizas.`;
    } else {
      const fila = (i, icono, titulo, texto) => `<div class="lr-fila"><span class="lr-icono">${icono}</span><div><small>${titulo}</small><b>${texto}</b></div><button class="lr-cambiar" data-paso="${i}">Cambiar</button></div>`;
      const revision = c.errores.map(t => `<li class="mal">⛔ ${t}</li>`).join("") + c.avisos.map(t => `<li class="justo">⚠ ${t}</li>`).join("")
        || `<li class="bien">✅ ¡Todo listo! Cumple el objetivo, cabe en el lanzador y tiene energía y memoria de sobra.</li>`;
      const aprobacion = enEquipo() ? `<div class="lab-aprobar"><b>👥 Todo el equipo debe aprobar:</b><div class="la-lista">${equipo().jugadores.map((j, i) =>
        `<label class="la ${aprobado[i] ? "si" : ""} ${red && i === red.miIndice ? "yo" : ""}"><input type="checkbox" data-aprueba="${i}" ${aprobado[i] ? "checked" : ""} ${red && i !== red.miIndice ? "disabled" : ""}>
          <span>${aprobado[i] ? "👍" : "🤔"}</span> ${red && i === red.miIndice ? "Tú" : j.nombre} <small>${j.roles.map(r => ROLES[r].icono).join("")}</small></label>`).join("")}</div>
        <button class="lab-link" data-acc="metas">${verMetas ? "Ocultar" : "Ver"} las metas de cada rol</button>
        ${verMetas ? `<ul class="lab-metas">${Object.entries(ROLES).map(([id, R]) => `<li>${R.icono} <b>${R.nombre}</b> (${(quienTieneRol(equipo(), id) || {}).nombre || "—"}): ${R.meta}</li>`).join("")}</ul>` : ""}</div>` : "";
      cuerpo = `<div class="lr">
        <div class="lr-plan">
          ${fila(0, "🎯", "Objetivo", obj ? obj.titulo : "Sin elegir")}
          ${fila(1, sel.instrumentos.length ? sel.instrumentos.map(id => INSTRUMENTOS[id].icono).join("") : "🔬", "Instrumentos", sel.instrumentos.length ? sel.instrumentos.map(id => INSTRUMENTOS[id].nombre).join(", ") : "Ninguno")}
          ${fila(2, "🚀", "Lanzador", L.nombre)}
          ${fila(3, TIPOS[sel.tipo].icono, "Ruta", TIPOS[sel.tipo].nombre)}
        </div>
        <div class="lr-madurez"><small>Madurez del diseño (como en el JPL de la NASA)</small>
          <div>${MADUREZ.slice(1).map((m, i) => `<span class="${c.cml > i ? "on" : ""}">${m}</span>`).join("<i>›</i>")}</div></div>
        <ul class="lab-revision">${revision}</ul>
        ${aprobacion}
      </div>`;
      nova = c.errores.length ? "Hay cosas marcadas con ⛔ que impiden despegar. Pulsa «Cambiar» en la parte que quieras arreglar."
        : c.avisos.length ? "Puedes despegar, pero mira los avisos ⚠: son cosas que pueden salir mal en el viaje."
        : "Este plan está muy bien pensado. ¡Cuando quieras, despegamos!";
    }

    // En línea: este paso lo decide otra persona
    const ajeno = parte && !mia(parte) ? (() => { const j = quienDecide(parte);
      return `<div class="lab-ajeno">👀 Este paso lo decide <b>${j ? j.nombre : "otra persona"}</b> (${ROLES[rol].icono} ${ROLES[rol].nombre}). Puedes mirar y opinar por radio.</div>`; })() : "";

    // ----- Tu nave: medidores sencillos -----
    const est = (usado, max, justo = 0.9) => (usado > max ? "mal" : usado > max * justo ? "justo" : "bien");
    const nave = `
      <div class="ln-bodega"><small>Bodega de la nave</small><div>${sel.instrumentos.map(id => `<span title="${INSTRUMENTOS[id].nombre}">${INSTRUMENTOS[id].icono}</span>`).join("")}${
        Array.from({ length: Math.max(0, 4 - sel.instrumentos.length) }, () => `<span class="vacio"></span>`).join("")}</div></div>
      ${medidor("masa", "⚖", "Peso", c.masa, L.capacidad, `${c.masa} de ${L.capacidad} kg que sube el lanzador`, est(c.masa, L.capacidad))}
      ${medidor("energia", "🔋", "Energía", c.gasto, Math.max(c.gen, 0.01), `Genera ${c.gen.toFixed(1)} · gasta ${c.gasto.toFixed(1)} por segundo`, c.gen < c.gasto ? "mal" : c.gasto > c.gen * 0.85 ? "justo" : "bien")}
      ${medidor("dinero", "💰", "Dinero", c.costo, estado.dinero, `Cuesta ${c.costo} de tus ${estado.dinero} 💰`, est(c.costo, estado.dinero, 0.8))}
      ${medidor("comb", "⛽", "Combustible", c.ida * 2, estado.combustible, `Ir y volver: ${c.ida * 2} de ${Math.floor(estado.combustible)} ⛽`, est(c.ida * 2, estado.combustible))}
      ${medidor("datos", "💾", "Datos", c.datosEsperados, memoriaNave(), `Unos ${c.datosEsperados} MB · caben ${memoriaNave()} MB`, c.datosEsperados > memoriaNave() * 1.5 ? "justo" : "bien")}
      <p class="ln-viaje">📅 ${P.viaje} días de viaje · 📡 la señal tarda ${Math.round(P.senal[0])}-${P.senal[1]} min</p>`;

    const ultimo = paso === PASOS.length - 1;
    const puedeDespegar = c.valido && aprobados && (!red || red.anfitrion);
    el.innerHTML = `<div class="lab tarjeta">
      <div class="lab-cabeza">
        <h2>🧪 Diseña tu misión a ${P.lugar}</h2>
        ${red ? `<span class="lab-link en-linea">🌐 Sala en línea · ${equipo().jugadores.length} ${equipo().jugadores.length === 1 ? "persona" : "personas"}</span>`
          : `<button class="lab-link" data-acc="equipo">👥 ${enEquipo() ? "Equipo: " + estado.equipo.jugadores.map(j => j.nombre).join(", ") : "Jugar en equipo"}</button>`}
        <button class="lab-x" data-acc="cancelar" title="Volver al mapa">✕</button>
      </div>
      <nav class="lab-pasos-barra">${pasos}</nav>
      <div class="lab-cuerpo">
        <section class="lab-paso">
          <h3 class="lab-pregunta"><span>Paso ${paso + 1} de ${PASOS.length}</span>${pasoA.pregunta}</h3>
          <div class="lab-nova"><span class="lab-nova-cara">👨‍🔬</span><p><b>Dr. Nova:</b> ${nova}</p></div>
          ${ajeno}
          ${cuerpo}
        </section>
        <aside class="lab-nave"><h3>🚀 Tu nave</h3>${cambio}${nave}</aside>
      </div>
      <div class="lab-pie">
        <button class="lab-boton" data-acc="${paso ? "atras" : "cancelar"}">${paso ? "← Atrás" : "← Volver al mapa"}</button>
        <span class="lab-pie-nota">${ultimo ? (!c.valido ? "Arregla lo marcado con ⛔ para despegar." : !aprobados ? "Falta que todo el equipo apruebe." : red && !red.anfitrion ? `${equipo().jugadores[0].nombre} (anfitrión) pulsa Despegar.` : "") : ""}</span>
        ${ultimo ? `<button class="lab-boton principal" data-acc="despegar" ${puedeDespegar ? "" : "disabled"}>🚀 ¡Despegar!</button>`
          : `<button class="lab-boton siguiente" data-acc="siguiente">Siguiente: ${PASOS[paso + 1].nombre} →</button>`}
      </div></div>`;
  }

  // Preparar el modo equipo en un solo dispositivo: de 1 (individual) a 4 personas
  function pintarEquipo() {
    const n = estado.equipo && estado.equipo.activo ? estado.equipo.jugadores.length : 1;
    const nombres = estado.equipo ? estado.equipo.jugadores.map(j => j.nombre) : [];
    el.innerHTML = `<div class="lab tarjeta lab-equipo">
      <div class="lab-cabeza"><h2>👥 Jugar en equipo</h2><button class="lab-x" data-acc="volver">✕</button></div>
      <p>De 2 a 4 personas diseñan la misión juntas en este dispositivo. Cada una decide uno o dos pasos y tiene una <b>meta de rol</b>
      que choca con las de las demás (Ciencia quiere más instrumentos, Dirección quiere gastar poco…). Tienen que ponerse de acuerdo: el cohete solo despega si <b>todo el equipo aprueba</b>.
      Al final, cada meta cumplida suma puntos. ¿Cada uno en su teléfono? Usa <b>Jugar en línea</b> en el menú.</p>
      <div class="lc-grid cuatro">${[1, 2, 3, 4].map(k => `<button class="lc ${k === n ? "sel" : ""}" data-personas="${k}"><span class="lc-icono">${"🧑‍🚀".repeat(k)}</span><b>${k === 1 ? "Solo yo" : k + " personas"}</b></button>`).join("")}</div>
      <div class="lab-nombres">${n > 1 ? Array.from({ length: n }, (_, i) => `<label>Persona ${i + 1} <input data-nombre="${i}" maxlength="20" value="${(nombres[i] || "").replace(/"/g, "")}" placeholder="Nombre"></label>`).join("") : ""}</div>
      <ul class="lab-metas">${Object.values(ROLES).map(R => `<li>${R.icono} <b>${R.nombre}</b> (${R.parte === "tipo" ? "ruta" : R.parte}): ${R.meta}</li>`).join("")}</ul>
      <div class="lab-pie"><span></span><span></span><button class="lab-boton principal" data-acc="guardar-equipo">Listo</button></div></div>`;
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
    // Navegar entre pasos: cada persona por su cuenta (no cambia el diseño)
    if (b.dataset.paso !== undefined) { paso = Math.max(0, Math.min(PASOS.length - 1, Number(b.dataset.paso))); return pintar(); }
    const acc = b.dataset.acc;
    if (acc === "siguiente") { paso = Math.min(PASOS.length - 1, paso + 1); return pintar(); }
    if (acc === "atras") { paso = Math.max(0, paso - 1); return pintar(); }
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
    irAPaso(i) { paso = Math.max(0, Math.min(PASOS.length - 1, i)); if (el.classList.contains("abierto")) pintar(); },
    get abierto() { return el.classList.contains("abierto"); },
  };
}
