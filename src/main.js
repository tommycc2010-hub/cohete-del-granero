import * as THREE from "three";
import { crearGranero } from "./granero.js";
import { crearEspacio } from "./espacio.js";
import { crearFinal, DURACION } from "./final.js";
import { crearJugador } from "./jugador.js";
import { crearTelefono } from "./telefono.js";
import { consejos, NOMBRE, TEXTO_CONFIANZA } from "./cientifico.js";
import { DATOS_PLANETAS } from "./datos.js";
import {
  estado, capacidad, comprarCombustible, vender, suscribir, regresar,
  generarCampo, consumoImpulso, alcanceSensor, gastar, recolectar, detectarSenal,
} from "./reglas.js";

// ----- Render -----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById("juego").appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 300);

const granero = crearGranero(scene, estado.mejoras);
const espacio = crearEspacio();
const final = crearFinal();
const jugador = crearJugador(camera, renderer.domElement, granero.colisiones, granero.limite);

function camaraAlInicio() {
  camera.position.set(0, 1.7, 13);
  camera.lookAt(0, 2.2, -8);
}
camaraAlInicio();

function ajustar() {
  renderer.setSize(innerWidth, innerHeight);
  for (const c of [camera, espacio.camera, final.camera]) {
    c.aspect = innerWidth / innerHeight;
    c.updateProjectionMatrix();
  }
}
addEventListener("resize", ajustar);
ajustar();

// Modos: "granero" (caminar), "despegue" (animación), "espacio" (pilotar), "final" (escena de Europa),
// "transicion" (fundido).
let modo = "granero";
const $ = id => document.getElementById(id);
const pausado = () => !$("inicio").classList.contains("oculto");

function ponerModo(m) {
  modo = m;
  document.body.dataset.modo = m;
}
ponerModo("granero");

// Funde a negro, ejecuta `fn` y vuelve a aclarar.
function fundido(fn) {
  $("fundido").classList.add("activo");
  setTimeout(() => { fn(); $("fundido").classList.remove("activo"); }, 500);
}

// ----- HUD del granero -----
function pintarHud() {
  $("dinero").textContent = estado.dinero;
  $("combustible").textContent = `${Math.floor(estado.combustible)}/${capacidad()}`;
  $("carga").textContent = estado.carga.length;
}

// El cohete del granero se reconstruye cuando cambia alguna mejora.
let firmaMejoras = JSON.stringify(estado.mejoras);
suscribir(() => {
  pintarHud();
  const firma = JSON.stringify(estado.mejoras);
  if (firma !== firmaMejoras) { firmaMejoras = firma; granero.reconstruirCohete(estado.mejoras); }
});
pintarHud();

let relojAviso;
function aviso(texto) {
  if (!texto) return;
  $("aviso").textContent = texto;
  $("aviso").classList.add("visible");
  clearTimeout(relojAviso);
  relojAviso = setTimeout(() => $("aviso").classList.remove("visible"), Math.max(2600, texto.length * 65));
}

// ----- Diálogo con el científico: E pasa a la siguiente frase -----
let dialogo = null;
function pintarDialogo() {
  $("dialogo").classList.toggle("visible", !!dialogo);
  if (!dialogo) return;
  const l = dialogo.lineas[dialogo.i];
  $("dialogo-texto").textContent = l.texto;
  $("dialogo-confianza").textContent = l.confianza ? TEXTO_CONFIANZA[l.confianza] : "";
  $("dialogo-confianza").className = l.confianza || "";
  $("dialogo-sigue").innerHTML = `<b>E</b> ${dialogo.i < dialogo.lineas.length - 1 ? "seguir" : "cerrar"} · ${dialogo.i + 1}/${dialogo.lineas.length}`;
}
function hablar() {
  dialogo = { lineas: consejos(), i: 0 };
  $("accion").classList.remove("visible");
  pintarDialogo();
}
function avanzarDialogo() {
  if (++dialogo.i >= dialogo.lineas.length) cerrarDialogo();
  else pintarDialogo();
}
function cerrarDialogo() {
  if (!dialogo) return;
  dialogo = null;
  cercano = null; // para que vuelva a salir el aviso de "E"
  pintarDialogo();
}

// ----- Pantalla de inicio / pausa y captura del mouse -----
$("inicio").addEventListener("click", () => jugador.controls.lock());
jugador.controls.addEventListener("lock", () => $("inicio").classList.add("oculto"));
jugador.controls.addEventListener("unlock", () => {
  if (!telefono.abierto && !tarjetaFinal) $("inicio").classList.remove("oculto");
});

// ----- Teléfono (Tab) -----
// Al abrirlo se libera el mouse para poder hacer clic; al cerrarlo se vuelve a capturar.
const telefono = crearTelefono({
  alAbrir() {
    cerrarDialogo();
    $("inicio").classList.add("oculto");
    $("accion").classList.remove("visible");
    cercano = null;
    if (jugador.controls.isLocked) jugador.controls.unlock();
  },
  alCerrar() {
    $("inicio").classList.remove("oculto"); // se oculta solo cuando el mouse queda capturado
    jugador.controls.lock();
  },
  alLanzar: despegar,
});

addEventListener("keydown", e => {
  if (e.code === "Tab") {
    e.preventDefault();
    if (!e.repeat && modo === "granero") telefono.alternar();
  } else if (e.code === "Escape" && telefono.abierto) telefono.cerrar();
  else if (e.code === "KeyE" && !e.repeat && modo === "granero") interactuar();
  else if (e.code === "KeyR" && !e.repeat && modo === "espacio") volver();
  else if (e.code === "KeyE" && !e.repeat && modo === "final") tFinal = Math.max(tFinal, DURACION); // saltar la escena
});

// ----- Interacción con la tecla E -----
let cercano = null;
function buscarCercano() {
  if (telefono.abierto) return;
  const p = camera.position;
  if (dialogo) { // alejarse del científico cierra la conversación
    if (Math.hypot(p.x - granero.cientifico.x, p.z - granero.cientifico.z) > 4) cerrarDialogo();
    return;
  }
  let mejor = null, dMejor = Infinity;
  for (const it of granero.interactuables) {
    const d = Math.hypot(p.x - it.x, p.z - it.z);
    if (d < it.radio && d < dMejor) { mejor = it; dMejor = d; }
  }
  if (mejor !== cercano) {
    cercano = mejor;
    $("accion").classList.toggle("visible", !!cercano);
    if (cercano) $("accion").innerHTML = `<b>E</b> ${cercano.texto}`;
  }
}

function interactuar() {
  if (telefono.abierto) return;
  if (dialogo) return avanzarDialogo();
  if (!cercano) return;
  if (cercano.id === "cientifico") return hablar();
  if (cercano.id === "bomba") aviso(comprarCombustible(10));
  else if (cercano.id === "venta") aviso(vender());
  else if (cercano.id === "taller") telefono.abrir("taller");
  else if (cercano.id === "cohete") telefono.abrir("mapa");
}

// ----- Despegue -----
let tDespegue = 0;
function despegar() {
  tDespegue = 0;
  cerrarDialogo();
  cercano = null;
  $("accion").classList.remove("visible");
  granero.iniciarDespegue(estado.mejoras);
  camera.position.set(11, 1.6, 17);
  ponerModo("despegue");
  jugador.controls.lock(); // el clic en el teléfono permite capturar el mouse para el vuelo
}

function entrarAlEspacio() {
  ponerModo("transicion");
  const dest = estado.mision.dest;
  fundido(() => {
    granero.terminarDespegue();
    espacio.iniciar(dest, estado.mejoras, generarCampo(dest));
    crearMarcadores();
    $("destino").textContent = `🪐 ${DATOS_PLANETAS[dest].nombre}`;
    ponerModo("espacio");
    aviso(dest === "europa"
      ? `📻 ${NOMBRE}: ¡La antena capta una señal cerca de la superficie! Sigue el marcador 📡.`
      : `📻 ${NOMBRE}: Llegaste a ${DATOS_PLANETAS[dest].nombre}. ${DATOS_PLANETAS[dest].dato}`);
  });
}

// ----- Vuelo -----
addEventListener("mousemove", e => {
  if (modo === "espacio" && document.pointerLockElement && !pausado()) espacio.girar(e.movementX * 0.0022, e.movementY * 0.0022);
});

function volar(dt) {
  const k = jugador.teclas;
  const giroYaw = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  const giroPitch = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0);
  if (giroYaw || giroPitch) espacio.girar(giroYaw * 1.4 * dt, giroPitch * 1.1 * dt);

  let impulso = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
  if (estado.combustible <= 0) impulso = 0;
  const r = espacio.actualizar(dt, impulso);
  if (impulso) gastar(consumoImpulso() * dt);
  r.recogidos.forEach(o => aviso(recolectar(o)));
  if (r.enLimite) aviso("Te alejas demasiado. Vuelve hacia el planeta.");

  pintarHudVuelo(r.velocidad);
  pintarMarcadores();
  if (r.enSenal) return empezarFinal();
  if (estado.combustible <= 0) volver();
}

// ----- Final en Europa -----
const SUBTITULOS = [
  [1, "La antena capta algo... La señal viene de esa grieta en el hielo."],
  [5.5, "Se repite con un ritmo exacto. Eso no es ruido."],
  [9.5, "¡Espera! Algo sube por el agua..."],
  [14, "Brillan. Se mueven. Responden a nuestra luz."],
  [17, "No estamos solos."],
];
let tFinal = 0, tarjetaFinal = false;

function empezarFinal() {
  ponerModo("transicion");
  detectarSenal();
  fundido(() => {
    $("marcadores").innerHTML = "";
    marcadores = [];
    tFinal = 0;
    final.iniciar(estado.mejoras);
    $("subtitulo").classList.remove("visible");
    ponerModo("final");
  });
}

function pasoFinal(dt) {
  tFinal += dt;
  final.actualizar(dt);
  const actual = SUBTITULOS.filter(([t]) => tFinal >= t).pop();
  $("subtitulo").classList.toggle("visible", !!actual && !tarjetaFinal);
  if (actual) $("subtitulo-texto").textContent = actual[1];
  if (tFinal >= DURACION && !tarjetaFinal) {
    tarjetaFinal = true;
    $("tarjeta-final").classList.add("visible");
    if (jugador.controls.isLocked) jugador.controls.unlock(); // libera el mouse para los botones
  }
}

$("final-seguir").addEventListener("click", () => {
  if (modo !== "final") return;
  $("tarjeta-final").classList.remove("visible");
  ponerModo("transicion");
  jugador.controls.lock();
  const texto = regresar();
  fundido(() => {
    tarjetaFinal = false;
    camaraAlInicio();
    ponerModo("granero");
    if (!jugador.controls.isLocked) $("inicio").classList.remove("oculto");
    aviso(`${texto} El ${NOMBRE} quiere hablar contigo.`);
  });
});
$("final-reiniciar").addEventListener("click", () => location.reload());

function pintarHudVuelo(velocidad) {
  const m = estado.mision, cap = capacidad();
  $("barra-comb").style.width = `${100 * estado.combustible / cap}%`;
  $("barra-reserva").style.left = `${100 * m.ida / cap}%`;
  $("txt-comb").textContent = `⛽ ${estado.combustible.toFixed(1)} · reserva ${m.ida}`;
  $("recolectado").textContent = `📦 ${m.carga.length} · quedan ${espacio.objetos.length}`;
  $("velocidad").textContent = `${Math.round(velocidad)} m/s`;
  const justo = estado.combustible <= m.ida + 2;
  $("barra").classList.toggle("alerta", justo);
  $("alerta").classList.toggle("visible", justo);
  $("alerta").textContent = estado.combustible < m.ida
    ? "⚠ Ya no alcanza para volver: habrá rescate y perderás la carga. Pulsa R."
    : "⚠ Combustible justo para volver. Pulsa R para regresar.";
}

// Marcadores: etiquetas sobre cada objeto. Los sensores deciden a qué distancia se identifican.
let marcadores = [];
function crearMarcadores() {
  $("marcadores").innerHTML = "";
  marcadores = espacio.objetos.map(o => {
    const el = document.createElement("div");
    el.className = "marcador";
    $("marcadores").appendChild(el);
    return { o, el };
  });
}

const proy = new THREE.Vector3();
function pintarMarcadores() {
  const vivos = new Set(espacio.objetos);
  const alcance = alcanceSensor();
  marcadores = marcadores.filter(m => {
    if (vivos.has(m.o)) return true;
    m.el.remove();
    return false;
  });
  for (const { o, el } of marcadores) {
    proy.copy(o.mesh.position).project(espacio.camera);
    const visible = proy.z < 1 && Math.abs(proy.x) < 1 && Math.abs(proy.y) < 1;
    el.style.display = visible ? "" : "none";
    if (!visible) continue;
    const d = Math.round(o.mesh.position.distanceTo(espacio.nave.position));
    const conocido = d <= alcance;
    el.style.transform = `translate(${(proy.x + 1) / 2 * innerWidth}px, ${(1 - proy.y) / 2 * innerHeight}px)`;
    el.innerHTML = conocido
      ? `<i style="background:${o.dato.color}"></i>${o.dato.nombre} · ${o.dato.valor}💰 · ${d} m`
      : `<i></i>¿? · ${d} m`;
  }

  // Marcador de la señal de Europa: siempre visible, pegado al borde si queda fuera de pantalla.
  const ms = $("marcador-senal");
  ms.style.display = espacio.senal ? "" : "none";
  if (espacio.senal) {
    proy.copy(espacio.senal.position).project(espacio.camera);
    if (proy.z > 1) { proy.x = -proy.x; proy.y = -1; } // detrás de la cámara: apunta hacia abajo
    const x = THREE.MathUtils.clamp(proy.x, -0.85, 0.85), y = THREE.MathUtils.clamp(proy.y, -0.7, 0.75);
    ms.style.transform = `translate(${(x + 1) / 2 * innerWidth}px, ${(1 - y) / 2 * innerHeight}px)`;
    ms.textContent = `📡 Señal · ${Math.round(espacio.senal.position.distanceTo(espacio.nave.position))} m`;
  }
}

function volver() {
  if (modo !== "espacio") return;
  ponerModo("transicion");
  const texto = regresar();
  fundido(() => {
    $("marcadores").innerHTML = "";
    marcadores = [];
    camaraAlInicio();
    ponerModo("granero");
    aviso(texto);
  });
}

// ----- Bucle -----
let antes = performance.now();
function paso(dt) {
  if (modo === "granero") {
    jugador.actualizar(dt);
    buscarCercano();
    granero.actualizar(dt, estado.mejoras.motor === 0, camera.position);
  } else if (modo === "despegue") {
    tDespegue += dt;
    const altura = granero.actualizarDespegue(tDespegue);
    camera.lookAt(0, Math.max(3, altura), 6);
    if (tDespegue > 4) entrarAlEspacio();
  } else if (modo === "espacio" && !pausado()) {
    volar(dt);
  } else if (modo === "final") {
    pasoFinal(dt);
  }
}

function bucle() {
  const ahora = performance.now();
  paso(Math.min((ahora - antes) / 1000, 0.05));
  antes = ahora;
  if (modo === "final") renderer.render(final.scene, final.camera);
  else if (modo === "espacio") renderer.render(espacio.scene, espacio.camera);
  else renderer.render(scene, camera);
}
renderer.setAnimationLoop(bucle);

// Acceso para pruebas desde la consola del navegador.
window.__juego = {
  camera, jugador, granero, espacio, estado, telefono, interactuar, despegar, volver,
  get modo() { return modo; },
  avanzar(segundos) { for (let i = 0; i < segundos / 0.05; i++) paso(0.05); },
};
