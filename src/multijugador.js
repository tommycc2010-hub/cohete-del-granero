// Multijugador en línea: la sala (panel del menú), los compañeros en el granero y el Control de Misión.
// - El anfitrión tiene la partida: dinero, combustible, mejoras y la misión. La comparte con los invitados.
// - En el laboratorio cada persona decide la parte de su rol (Dirección, Ciencia, Ingeniería, Operaciones).
// - En el granero todos caminan y se ven entre sí.
// - Durante el vuelo, los invitados ven en vivo la imagen del anfitrión, la telemetría, y le mandan mensajes por radio.
import { red, on, enviar, enviarA, crearSala, unirse, salir, transmitir, MAX_JUGADORES } from "./red.js";
import { crearPersona } from "./cientifico.js";
import { ROLES, armarEquipo } from "./diseno.js";
import { DATOS_PLANETAS } from "./datos.js";

const CLAVE_NOMBRE = "cohete-del-granero:nombre";
const COLORES = [0x4aa3e8, 0xe5483b, 0x5cc46b, 0xe28bff];
const hex = c => "#" + c.toString(16).padStart(6, "0");
const EN_MISION = ["despegue", "transicion", "espacio", "descenso", "superficie", "final"];
const FRASES = [
  "👍 ¡Bien hecho!", "⛽ Cuida el combustible", "🔋 Revisa la energía", "🎯 Ve por el objetivo",
  "🐢 ¡Aterriza despacio!", "🏠 Vuelve a casa", "💾 La memoria se llena", "🚀 ¡Vamos!",
];
// El reporte llega como HTML del anfitrión: se quitan scripts, eventos y enlaces antes de mostrarlo
function limpiarHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, style, img, svg, a, form, input, video, audio").forEach(e => e.remove());
  doc.body.querySelectorAll("*").forEach(e => [...e.attributes].forEach(a => { if (a.name.startsWith("on") || /^(href|src|action|formaction|xlink:href)$/i.test(a.name)) e.removeAttribute(a.name); }));
  return doc.body.innerHTML;
}
const esc = t => String(t).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

// juego: lo que main.js presta al multijugador
// { scene, canvas, modo(), empezado(), posicion() -> {x,y,z,ry}, exportar(), importar(d), aviso(t), radio(t),
//   laboratorio, abrirReporte(html), alEmpezar(), accionRemota(tipo, valor) -> texto, telemetria() -> {...} }
export function crearMultijugador(juego) {
  let nombre = "";
  try { nombre = localStorage.getItem(CLAVE_NOMBRE) || ""; } catch { /* sin almacenamiento */ }
  let panel = null, estadoPanel = "inicio", mensaje = "", ocupado = false;
  const avatares = new Map(); // id → persona
  let relojPos = 0, relojTele = 0, estadoPendiente = null, streamPropio = null, modoAnfitrion = "granero";

  // ----- Panel de la sala (dentro del menú) -----
  function equipoEnLinea() {
    if (!red.activo || red.jugadores.length < 2) return null;
    return armarEquipo(red.jugadores.map(j => j.nombre));
  }
  function filaJugador(j, i, eq) {
    const roles = eq ? eq.jugadores[i].roles.map(r => `${ROLES[r].icono} ${ROLES[r].nombre}`).join(" · ") : "Todos los roles";
    const yo = j.id === red.miId;
    return `<div class="sala-jugador"><i style="background:${hex(COLORES[i % 4])}"></i>
      <b>${esc(j.nombre)}${yo ? " (tú)" : ""}${i === 0 ? " 👑" : ""}</b><small>${roles}</small></div>`;
  }
  function pintar(caja = panel) {
    if (!caja) return;
    panel = caja;
    if (red.activo) {
      const eq = equipoEnLinea();
      caja.innerHTML = `<h3>🌐 Sala en línea</h3>
        <div class="sala-codigo"><small>Código de la sala</small><b>${red.codigo}</b></div>
        <p class="nota">${red.anfitrion ? "Comparte este código: tus compañeros lo escriben en «Jugar en línea → Unirse»." : "Estás en la sala. El anfitrión (👑) lleva la partida."}</p>
        <div class="sala-lista">${red.jugadores.map((j, i) => filaJugador(j, i, eq)).join("")}
          ${Array.from({ length: MAX_JUGADORES - red.jugadores.length }, () => `<div class="sala-jugador vacio"><i></i><b>Esperando…</b></div>`).join("")}</div>
        <p class="nota">Los roles se reparten solos según cuántos son. En el laboratorio cada persona decide su parte y todos deben aprobar el despegue. Durante el vuelo, los demás ven la misión en vivo y mandan mensajes por radio.</p>
        ${mensaje ? `<p class="ranura-mensaje">${mensaje}</p>` : ""}
        <div class="sala-botones">
          <button data-red="empezar" class="principal">${juego.empezado() ? "▶ Volver al juego" : "▶ Empezar a jugar"}</button>
          <button data-red="salir">🚪 Salir de la sala</button></div>`;
      return;
    }
    caja.innerHTML = `<h3>🌐 Jugar en línea</h3>
      <p class="nota">De 2 a ${MAX_JUGADORES} personas, cada una en su teléfono o computadora, diseñan y vuelan la misión juntas.</p>
      <label class="sala-campo"><span>Tu nombre</span><input data-red-campo="nombre" maxlength="16" value="${esc(nombre)}" placeholder="Nombre"></label>
      <div class="sala-dos">
        <div class="sala-caja"><b>Crear una sala</b><small>Usa la partida que tienes abierta. Tú despegas el cohete.</small>
          <button data-red="crear" class="principal" ${ocupado ? "disabled" : ""}>✦ Crear sala</button></div>
        <div class="sala-caja"><b>Unirse a una sala</b><small>Escribe el código de 4 letras que te dieron.</small>
          <input data-red-campo="codigo" maxlength="4" placeholder="ABCD" autocomplete="off">
          <button data-red="unirse" class="principal" ${ocupado ? "disabled" : ""}>➜ Unirse</button></div>
      </div>
      ${mensaje ? `<p class="ranura-mensaje">${mensaje}</p>` : ""}
      <p class="nota">Se conecta directo entre navegadores. Un servidor público gratuito (PeerJS) solo ayuda a encontrarse: no guarda partidas ni datos personales.</p>`;
  }
  function leerNombre() {
    const i = panel && panel.querySelector('[data-red-campo="nombre"]');
    if (i) nombre = i.value.trim().slice(0, 16);
    try { localStorage.setItem(CLAVE_NOMBRE, nombre); } catch { /* sin almacenamiento */ }
    return nombre || "Jugador";
  }
  async function alClic(b) {
    const acc = b.dataset.red;
    if (acc === "crear" || acc === "unirse") {
      const n = leerNombre();
      const codigo = acc === "unirse" ? (panel.querySelector('[data-red-campo="codigo"]').value || "") : "";
      ocupado = true; mensaje = "⏳ Conectando…"; pintar();
      try {
        if (acc === "crear") await crearSala(n);
        else await unirse(codigo, n);
        mensaje = acc === "crear" ? "✔ Sala creada." : "✔ Te uniste a la sala.";
        document.body.classList.toggle("invitado", red.invitado);
        document.body.classList.add("en-linea");
      } catch (e) { mensaje = "⚠ " + (typeof e === "string" ? e : "No se pudo conectar."); }
      ocupado = false;
      pintarInsignia();
      return pintar();
    }
    if (acc === "salir") {
      const eraInvitado = red.invitado;
      salir();
      quitarAvatares();
      document.body.classList.remove("en-linea", "invitado");
      pintarInsignia();
      if (eraInvitado) return location.reload(); // la partida del anfitrión no se queda en este equipo
      mensaje = "Saliste de la sala."; return pintar();
    }
    if (acc === "empezar") juego.alEmpezar();
  }
  function conectarPanel(caja) {
    if (caja._red) return;
    caja._red = true;
    caja.addEventListener("click", e => { const b = e.target.closest("[data-red]"); if (b && !b.disabled) alClic(b); });
    caja.addEventListener("input", e => {
      if (e.target.dataset.redCampo === "codigo") e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    });
  }

  // ----- Insignia en pantalla mientras hay sala -----
  const insignia = document.getElementById("red-insignia");
  function pintarInsignia() {
    insignia.classList.toggle("visible", red.activo);
    if (!red.activo) return;
    insignia.innerHTML = `🌐 <b>${red.codigo}</b> ${red.jugadores.map((j, i) => `<i title="${esc(j.nombre)}" style="background:${hex(COLORES[i % 4])}">${esc(j.nombre[0] || "?")}</i>`).join("")}
      ${red.invitado && EN_MISION.includes(modoAnfitrion) ? `<button data-control="abrir">🛰 Control de misión</button>` : ""}`;
  }
  insignia.addEventListener("click", e => { if (e.target.closest('[data-control="abrir"]')) abrirControl(); });

  // ----- Compañeros en el granero -----
  function avatar(id) {
    if (avatares.has(id)) return avatares.get(id);
    const i = red.jugadores.findIndex(j => j.id === id);
    if (i < 0) return null;
    const color = COLORES[i % 4];
    const p = crearPersona({ x: 0, z: 10, nombre: red.jugadores[i].nombre, ropa: color, cartel: hex(color), pantalon: 0x2c3e50, pelo: [0x3b2a1a, 0xe0b04a, 0x1d1d1d, 0x8a4b2a][i % 4], remoto: true });
    juego.scene.add(p.grupo);
    p.grupo.visible = false;
    avatares.set(id, p);
    return p;
  }
  function quitarAvatar(id) { const p = avatares.get(id); if (p) { juego.scene.remove(p.grupo); avatares.delete(id); } }
  function quitarAvatares() { for (const id of [...avatares.keys()]) quitarAvatar(id); }

  // ----- Control de Misión (invitados durante el vuelo) -----
  const control = document.getElementById("control");
  const video = control.querySelector("video");
  let ultimaTele = null;
  function abrirControl() { control.classList.add("visible"); document.getElementById("inicio").classList.add("oculto"); pintarTele(); juego.soltar(); }
  function cerrarControl(aMano = false) {
    if (!control.classList.contains("visible")) return;
    control.classList.remove("visible");
    if (aMano) juego.capturar(); else juego.mostrarPausa();
  }
  control.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.control === "cerrar") return cerrarControl(true);
    if (b.dataset.frase) mandarRadio(FRASES[Number(b.dataset.frase)]);
  });
  control.querySelector(".control-frases").innerHTML = FRASES.map((f, i) => `<button data-frase="${i}">${f}</button>`).join("");
  function pintarTele() {
    const t = ultimaTele, cuerpo = control.querySelector(".control-tele");
    const anf = red.jugadores[0] ? red.jugadores[0].nombre : "El anfitrión";
    control.querySelector(".control-titulo").textContent = t && Object.hasOwn(DATOS_PLANETAS, t.dest || "") ? `🛰 Control de misión · ${anf} rumbo a ${DATOS_PLANETAS[t.dest].nombre}` : "🛰 Control de misión";
    if (!t || typeof t.combustible !== "number") { cuerpo.innerHTML = `<p class="lab-nota">📡 Esperando datos de la nave…</p>`; return; }
    const barra = (v, max, clase = "") => `<div class="lab-barra ${clase}"><i style="width:${Math.max(0, Math.min(100, 100 * v / Math.max(1, max)))}%"></i></div>`;
    const fila = (a, b, x = "") => `<div class="lab-dato"><span>${a}</span><b>${b}</b>${x}</div>`;
    const FASE = { despegue: "🚀 Despegue", transicion: "…", espacio: "🛰 En órbita", descenso: "🛬 Aterrizando", superficie: "🥾 Explorando a pie", final: "🌊 Europa" };
    const num = v => (Number.isFinite(v) ? v : 0);
    for (const k of ["capacidad", "energia", "energiaMax", "oxi", "traje", "carga", "senal"]) t[k] = num(t[k]);
    cuerpo.innerHTML = fila("Fase", FASE[t.modo] || esc(t.modo))
      + fila("⛽ Combustible", `${Math.floor(t.combustible)} / ${t.capacidad}`, barra(t.combustible, t.capacidad, t.combustible < t.capacidad * 0.2 ? "mal" : ""))
      + fila("🔋 Energía", `${Math.round(t.energia)} / ${t.energiaMax}`, barra(t.energia, t.energiaMax, t.energia < t.energiaMax * 0.2 ? "mal" : ""))
      + (t.modo === "superficie" ? fila("🫁 Oxígeno", `${Math.round(t.oxi)} %`, barra(t.oxi, 100, t.oxi < 25 ? "mal" : "")) + fila("🛡 Traje", `${Math.round(t.traje)} %`, barra(t.traje, 100, t.traje < 30 ? "mal" : "")) : "")
      + (Number.isFinite(t.velocidad) ? fila("⬇ Velocidad", `${t.velocidad.toFixed(1)} m/s`) : "")
      + (t.datos ? fila("💾 Datos", esc(t.datos)) : "")
      + fila("📦 Carga", `${t.carga} muestras`)
      + fila("📡 Señal", `${t.senal} min de retraso`);
  }
  function mandarRadio(texto) {
    const m = { t: "radio", reenviar: true, texto };
    if (red.anfitrion) enviar({ ...m, de: red.miId }); else enviar(m);
    juego.aviso(`📻 Tú: ${texto}`);
  }

  // ----- Mensajes de la red -----
  on("sala", () => {
    for (const id of [...avatares.keys()]) if (!red.jugadores.some(j => j.id === id)) quitarAvatar(id);
    pintar(); pintarInsignia();
    if (red.anfitrion) juego.laboratorio.refrescar(); // cambió el equipo: se reparten los roles y se aprueba de nuevo
  });
  on("entra", (m, id) => {
    juego.aviso(`🌐 ${red.nombreDe(id)} entró a la sala.`);
    enviarA(id, { t: "estado", d: juego.exportar() });
    enviarA(id, { t: "modo", modo: modoAnfitrion, dest: juego.telemetria().dest });
    if (!streamPropio && juego.canvas.captureStream) {
      try { streamPropio = juego.canvas.captureStream(20); transmitir(streamPropio); } catch { /* sin video: solo telemetría */ }
    }
    actualizarVideo();
  });
  on("sale", m => { juego.aviso(`🌐 ${m.nombre || "Alguien"} salió de la sala.`); quitarAvatar(m.id); });
  on("cerrada", () => { juego.aviso("🌐 El anfitrión cerró la sala."); quitarAvatares(); document.body.classList.remove("en-linea", "invitado"); pintarInsignia(); setTimeout(() => location.reload(), 2500); });
  on("estado", m => { if (red.invitado && m.d) juego.importar(m.d); });
  on("pos", (m, de) => {
    if (de === red.miId) return;
    const p = avatar(de);
    if (!p) return;
    const visible = !!m.v && juego.modo() === "granero";
    p.grupo.visible = visible;
    const n = v => (Number.isFinite(v) ? Math.max(-400, Math.min(400, v)) : 0);
    if (Number.isFinite(m.x) && Number.isFinite(m.z)) p.ir(n(m.x), n(m.y), n(m.z), Number.isFinite(m.ry) ? m.ry : 0);
  });
  on("radio", (m, de) => {
    if (de === red.miId || typeof m.texto !== "string") return;
    const t = `📻 ${red.nombreDe(de)}: ${m.texto.slice(0, 60)}`;
    if (red.anfitrion) juego.radio(t); else juego.aviso(t);
  });
  on("lab", m => {
    if (!red.invitado) return;
    const antes = juego.laboratorio.abierto;
    juego.laboratorio.recibir(m.s);
    if (juego.laboratorio.abierto && !antes) { cerrarControl(); juego.soltar(); juego.aviso("🧪 Se abrió el laboratorio: decide la parte de tu rol."); }
    else if (!juego.laboratorio.abierto && antes) juego.mostrarPausa();
  });
  on("pedir", (m, de) => {
    if (!red.anfitrion) return;
    const i = red.jugadores.findIndex(j => j.id === de);
    if (i >= 0) juego.laboratorio.aplicar(m.accion, i);
  });
  on("proponer", (m, de) => {
    if (!red.anfitrion || typeof m.dest !== "string" || !Object.hasOwn(DATOS_PLANETAS, m.dest)) return;
    juego.proponerDestino(m.dest, red.nombreDe(de));
  });
  on("accion", (m, de) => {
    if (!red.anfitrion) return;
    const texto = juego.accionRemota(m.tipo, m.valor);
    if (texto) { enviarA(de, { t: "respuesta", texto }); juego.aviso(`🌐 ${red.nombreDe(de)}: ${texto}`); }
  });
  on("respuesta", m => juego.aviso(m.texto));
  on("modo", m => {
    if (!red.invitado) return;
    const antes = modoAnfitrion;
    modoAnfitrion = m.modo;
    if (m.dest) ultimaTele = { ...(ultimaTele || {}), dest: m.dest };
    if (EN_MISION.includes(m.modo) && !EN_MISION.includes(antes)) {
      if (juego.laboratorio.abierto) juego.laboratorio.recibir(null);
      ultimaTele = { dest: m.dest };
      abrirControl();
      juego.aviso(`🚀 ¡${red.jugadores[0] ? red.jugadores[0].nombre : "El anfitrión"} despegó! Míralo en el Control de misión.`);
    } else if (m.modo === "granero" && EN_MISION.includes(antes)) cerrarControl();
    pintarInsignia();
  });
  on("tele", m => { if (red.invitado) { ultimaTele = m.d; if (control.classList.contains("visible")) pintarTele(); } });
  on("reporte", m => { if (red.invitado && typeof m.html === "string") juego.abrirReporte(limpiarHtml(m.html)); });
  on("video", m => { video.srcObject = m.stream; video.play().catch(() => {}); control.classList.add("con-video"); });
  on("error", m => juego.aviso("🌐 " + m.texto));

  // Solo el anfitrión transmite imagen, y solo durante la misión (en el granero cada quien camina por su cuenta)
  function actualizarVideo() {
    if (streamPropio) streamPropio.getVideoTracks().forEach(t => { t.enabled = EN_MISION.includes(modoAnfitrion); });
  }

  // ----- Cada cuadro -----
  function actualizar(dt, posJugador) {
    if (!red.activo) return;
    relojPos -= dt;
    if (relojPos <= 0) {
      relojPos = 0.1;
      const visible = juego.empezado() && juego.modo() === "granero";
      const p = juego.posicion();
      const m = { t: "pos", reenviar: true, v: visible, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ry: +p.ry.toFixed(2) };
      if (red.anfitrion) enviar({ ...m, de: red.miId }); else enviar(m);
    }
    for (const p of avatares.values()) if (p.grupo.visible) p.actualizar(dt, posJugador);
    if (!red.anfitrion) return;
    relojTele -= dt;
    if (EN_MISION.includes(modoAnfitrion) && relojTele <= 0) { relojTele = 0.33; enviar({ t: "tele", d: juego.telemetria() }); }
  }

  return {
    pintarPanel(caja) { conectarPanel(caja); pintar(caja); },
    actualizar,
    get activo() { return red.activo; },
    get anfitrion() { return red.activo && red.anfitrion; },
    get invitado() { return red.invitado; },
    get avatares() { return [...avatares.values()].map(p => ({ visible: p.grupo.visible, x: +p.grupo.position.x.toFixed(1), z: +p.grupo.position.z.toFixed(1) })); },
    // Para el laboratorio
    enLinea() { const eq = equipoEnLinea(); return eq ? { anfitrion: red.anfitrion, miIndice: red.miIndice, equipo: eq } : null; },
    equipo: equipoEnLinea,
    compartirLab(s) { if (red.anfitrion) enviar({ t: "lab", s }); },
    pedirLab(accion) { enviar({ t: "pedir", accion }); },
    // Invitado: proponer un destino o pedir una compra al anfitrión
    proponer(dest) { enviar({ t: "proponer", dest }); },
    pedirAccion(tipo, valor) { enviar({ t: "accion", tipo, valor }); },
    // Anfitrión
    // El dinero, el combustible y las mejoras se mandan a los demás (agrupando los cambios seguidos)
    estadoCambio() {
      if (!red.anfitrion || estadoPendiente) return;
      estadoPendiente = setTimeout(() => { estadoPendiente = null; enviar({ t: "estado", d: juego.exportar() }); }, 250);
    },
    cambioModo(m, dest) {
      if (!red.anfitrion) return;
      if (m === "transicion") return;
      modoAnfitrion = m;
      enviar({ t: "modo", modo: m, dest });
      actualizarVideo();
    },
    compartirReporte(html) { if (red.anfitrion) enviar({ t: "reporte", html }); },
  };
}
