// Menú principal y de pausa, con opciones guardadas en el navegador.
// Usa el elemento #inicio: visible = juego en pausa o en el menú.
const CLAVE_OPCIONES = "cohete-del-granero:opciones:v1";
export const OPCIONES_BASE = { volumen: 0.7, musica: 0.5, sensibilidad: 1, fov: 70, calidad: "alta" };

export function cargarOpciones() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_OPCIONES)) || {};
    const num = (x, min, max, def) => (typeof x === "number" && x >= min && x <= max ? x : def);
    return {
      volumen: num(o.volumen, 0, 1, OPCIONES_BASE.volumen),
      musica: num(o.musica, 0, 1, OPCIONES_BASE.musica),
      sensibilidad: num(o.sensibilidad, 0.2, 3, OPCIONES_BASE.sensibilidad),
      fov: num(o.fov, 55, 100, OPCIONES_BASE.fov),
      calidad: ["alta", "media", "baja"].includes(o.calidad) ? o.calidad : OPCIONES_BASE.calidad,
    };
  } catch {
    return { ...OPCIONES_BASE };
  }
}

function guardarOpciones(o) {
  try { localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(o)); } catch { /* sin almacenamiento */ }
}

const COMO_JUGAR = `
  <h3>Cómo se juega</h3>
  <ol>
    <li><b>En el granero</b> compras combustible, vendes muestras y mejoras el cohete. Habla con el Dr. Nova: te aconseja según tu partida.</li>
    <li><b>Despegas</b> desde el teléfono y vuelas hasta la zona de aterrizaje 🛬.</li>
    <li><b>Aterrizas a mano</b> frenando con W. Por debajo de 3 m/s, sin daños.</li>
    <li><b>Exploras a pie</b> con oxígeno, traje y energía limitados. El cohete recarga el oxígeno si tiene energía.</li>
    <li><b>Cumples la misión</b> del lugar y vuelves a vender lo que encontraste.</li>
  </ol>
  <p class="nota">Regla de oro: cada mejora añade masa, y más masa gasta más combustible.</p>
  <table>
    <tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Caminar · impulso y dirección del cohete</td></tr>
    <tr><td>🖱</td><td>Mirar · dirigir el cohete</td></tr>
    <tr><td><kbd>Espacio</kbd></td><td>Saltar (depende de la gravedad)</td></tr>
    <tr><td><kbd>Shift</kbd></td><td>Correr (gasta más oxígeno)</td></tr>
    <tr><td><kbd>E</kbd></td><td>Usar, hablar, reparar</td></tr>
    <tr><td><kbd>Tab</kbd></td><td>Teléfono</td></tr>
    <tr><td><kbd>R</kbd></td><td>Volver a casa desde la órbita</td></tr>
    <tr><td><kbd>M</kbd> · <kbd>Esc</kbd></td><td>Silenciar · pausa</td></tr>
  </table>`;

const CREDITOS = `
  <h3>Créditos</h3>
  <p><b>Siderense Rocket Labs</b><br>NASA Space Apps Challenge 2026 · reto <i>Space Mission Design Game</i></p>
  <p>Hecho con Three.js, Vite y Electron. Los modelos, terrenos, texturas, sonidos y música se generan con código.</p>
  <p>Los datos científicos son de divulgación general y se reemplazarán por la base de datos de la NASA. El final con vida en Europa es ficción.</p>
  <p class="nota">Parte del trabajo se hizo con ayuda de Claude, un asistente de IA de Anthropic. NASA no respalda este proyecto.</p>`;

// avisos: { alJugar(), alNuevaPartida(), alCambiarOpciones(opciones), infoPartida() -> texto o null }
export function crearMenu(raiz, avisos) {
  const opciones = cargarOpciones();
  let enJuego = false, panel = null, confirmar = false;

  raiz.innerHTML = `
    <div class="menu-lado">
      <div class="logo"><span>COHETE</span><span>DEL GRANERO</span></div>
      <p class="lema">Una misión de diseño espacial · NASA Space Apps 2026</p>
      <div class="menu-botones"></div>
      <p class="menu-info"></p>
    </div>
    <div class="menu-panel tarjeta"></div>
    <div class="menu-pie">Siderense Rocket Labs · v1.1</div>`;
  const botones = raiz.querySelector(".menu-botones");
  const cajaPanel = raiz.querySelector(".menu-panel");
  const info = raiz.querySelector(".menu-info");

  function pintar() {
    raiz.classList.toggle("pausa", enJuego);
    const hay = avisos.infoPartida();
    const lista = enJuego
      ? [["jugar", "▶ Reanudar"], ["opciones", "⚙ Opciones"], ["ayuda", "❔ Cómo jugar"]]
      : [["jugar", hay ? "▶ Continuar" : "▶ Jugar"], ...(hay ? [["nueva", confirmar ? "¿Seguro? Se borra el progreso" : "✦ Nueva partida"]] : []),
        ["opciones", "⚙ Opciones"], ["ayuda", "❔ Cómo jugar"], ["creditos", "★ Créditos"]];
    botones.innerHTML = lista.map(([id, txt]) =>
      `<button data-id="${id}" class="${id === "jugar" ? "principal" : ""} ${id === "nueva" && confirmar ? "peligro" : ""}">${txt}</button>`).join("");
    const demo = new URLSearchParams(location.search).has("demo");
    info.textContent = enJuego ? "Juego en pausa" : demo ? "Modo demo: todo desbloqueado, no se guarda el progreso" : hay || "";
    cajaPanel.style.display = panel ? "" : "none";
    if (panel === "ayuda") cajaPanel.innerHTML = COMO_JUGAR;
    else if (panel === "creditos") cajaPanel.innerHTML = CREDITOS;
    else if (panel === "opciones") pintarOpciones();
  }

  const deslizador = (id, nombre, min, max, paso, valor, texto) => `
    <label class="opcion"><span>${nombre}</span>
      <input type="range" data-op="${id}" min="${min}" max="${max}" step="${paso}" value="${valor}">
      <b data-ver="${id}">${texto}</b></label>`;

  function pintarOpciones() {
    const pct = v => `${Math.round(v * 100)} %`;
    cajaPanel.innerHTML = `<h3>Opciones</h3>
      ${deslizador("volumen", "Volumen general", 0, 1, 0.05, opciones.volumen, pct(opciones.volumen))}
      ${deslizador("musica", "Música", 0, 1, 0.05, opciones.musica, pct(opciones.musica))}
      ${deslizador("sensibilidad", "Sensibilidad del mouse", 0.2, 3, 0.1, opciones.sensibilidad, opciones.sensibilidad.toFixed(1))}
      ${deslizador("fov", "Campo de visión", 55, 100, 1, opciones.fov, `${opciones.fov}°`)}
      <div class="opcion"><span>Calidad gráfica</span><div class="segmentos">
        ${["alta", "media", "baja"].map(c => `<button data-calidad="${c}" class="${opciones.calidad === c ? "activo" : ""}">${c[0].toUpperCase() + c.slice(1)}</button>`).join("")}
      </div></div>
      <p class="nota">Baja: sin sombras y menos resolución, para computadoras modestas.</p>`;
  }

  raiz.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.calidad) {
      opciones.calidad = b.dataset.calidad;
      guardarOpciones(opciones);
      avisos.alCambiarOpciones(opciones);
      return pintarOpciones();
    }
    const id = b.dataset.id;
    if (id === "jugar") { panel = null; confirmar = false; enJuego = true; pintar(); return avisos.alJugar(); }
    if (id === "nueva") {
      if (!confirmar) { confirmar = true; return pintar(); }
      return avisos.alNuevaPartida();
    }
    confirmar = false;
    panel = panel === id ? null : id;
    pintar();
  });

  raiz.addEventListener("input", e => {
    const op = e.target.dataset && e.target.dataset.op;
    if (!op) return;
    opciones[op] = Number(e.target.value);
    const ver = raiz.querySelector(`[data-ver="${op}"]`);
    ver.textContent = op === "fov" ? `${opciones.fov}°` : op === "sensibilidad" ? opciones.sensibilidad.toFixed(1) : `${Math.round(opciones[op] * 100)} %`;
    guardarOpciones(opciones);
    avisos.alCambiarOpciones(opciones);
  });

  pintar();
  avisos.alCambiarOpciones(opciones);

  return {
    opciones,
    get enJuego() { return enJuego; },
    refrescar: pintar,
    // La calidad automática la baja si el juego va lento; queda guardada como si la eligiera el jugador.
    cambiarCalidad(c) {
      opciones.calidad = c;
      guardarOpciones(opciones);
      avisos.alCambiarOpciones(opciones);
    },
  };
}
