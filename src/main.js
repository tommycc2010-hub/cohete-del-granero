import * as THREE from "three";
import { crearGranero } from "./granero.js";
import { crearEspacio } from "./espacio.js";
import { crearSuperficie } from "./superficie.js";
import { crearFinal, DURACION } from "./final.js";
import { crearJugador } from "./jugador.js";
import { crearManos } from "./manos.js";
import { crearTelefono } from "./telefono.js";
import { crearTutorial } from "./tutorial.js";
import { sonido } from "./sonido.js";
import { consejos, NOMBRE, TEXTO_CONFIANZA, yaPresentado, marcarPresentado } from "./cientifico.js";
import { guardar, cargar, borrar } from "./guardado.js";
import { crearInforme, htmlInforme } from "./informe.js";
import { crearMenu } from "./menu.js";
import { renderizarPista } from "./musica.js";
import { DATOS_PLANETAS } from "./datos.js";
import {
  estado, capacidad, comprarCombustible, vender, suscribir, regresar,
  generarCampo, consumoImpulso, alcanceSensor, gastar, recolectar, detectarSenal,
  oxigenoMax, resistenciaTraje, desgasteTraje, puedeAterrizar, aterrizar, perderRecolectado,
  BONO_PUEBLO, VALOR_ORBITA, FUGA_POR_SEGUNDO, completarMision, exportarEstado, importarEstado, factorMasa,
  energiaMax, generacion, consumoSistemas, ENERGIA_RECARGA_OXI, retrasoSenal,
} from "./reglas.js";

// ----- Render -----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false; // se dibuja el mundo y encima los brazos
document.getElementById("juego").appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2400);

const granero = crearGranero(scene, estado.mejoras);
const espacio = crearEspacio();
const superficie = crearSuperficie();
const final = crearFinal();
const manos = crearManos();
const jugador = crearJugador(camera, renderer.domElement, {
  alPaso: () => sonido.reproducir("paso"),
  alSaltar: () => sonido.reproducir("salto"),
  alCaer(golpe) {
    if (golpe > 3) sonido.reproducir("paso");
    if (modo === "superficie" && golpe > 11) { // una caída fuerte daña el traje
      traje = Math.max(0, traje - (golpe - 11) * 3 / resistenciaTraje());
      aviso("Caída fuerte: el traje se dañó.");
      sonido.reproducir("dano");
    }
  },
});

// `mundo` es donde camina el jugador: el granero o la superficie de un planeta.
let mundo = granero;
function alGranero() {
  mundo = granero;
  jugador.colocar(granero, 0, 13, 0, -8);
}
alGranero();

function ajustar() {
  renderer.setSize(innerWidth, innerHeight);
  for (const c of [camera, espacio.camera, final.camera]) {
    c.aspect = innerWidth / innerHeight;
    c.updateProjectionMatrix();
  }
  manos.ajustar(innerWidth / innerHeight);
}
addEventListener("resize", ajustar);
ajustar();

// Modos: "granero" (caminar), "despegue" (animación), "espacio" (pilotar), "descenso" (aterrizar),
// "superficie" (explorar a pie),
// "final" (escena de Europa) y "transicion" (fundido entre modos).
let modo = "granero";
let vista = { escena: scene, camara: camera }; // lo que se dibuja; no cambia durante un fundido
const VISTAS = {
  granero: () => ({ escena: scene, camara: camera }),
  despegue: () => ({ escena: scene, camara: camera }),
  espacio: () => ({ escena: espacio.scene, camara: espacio.camera }),
  descenso: () => ({ escena: superficie.scene, camara: camera }),
  superficie: () => ({ escena: superficie.scene, camara: camera }),
  final: () => ({ escena: final.scene, camara: final.camera }),
};
const $ = id => document.getElementById(id);
const pausado = () => !$("inicio").classList.contains("oculto");

function actualizarMusica() {
  if (modo === "granero" || modo === "despegue") sonido.musica("granero");
  else if (modo === "espacio" || modo === "descenso") sonido.musica("espacio");
  else if (modo === "superficie" && estado.mision) sonido.musica(estado.mision.dest);
  else if (modo === "final") sonido.musica(null);
}
function ponerModo(m) {
  modo = m;
  if (m !== "transicion") actualizarMusica();
  document.body.dataset.modo = m;
  $("aviso").classList.remove("visible"); // los avisos del modo anterior no se arrastran al nuevo
  if (VISTAS[m]) vista = VISTAS[m]();
}
ponerModo("granero");

// Funde a negro, ejecuta `fn` y vuelve a aclarar.
function fundido(fn) {
  $("fundido").classList.add("activo");
  setTimeout(() => { fn(); $("fundido").classList.remove("activo"); }, 500);
}

// El navegador solo deja sonar después del primer clic o tecla.
addEventListener("pointerdown", () => sonido.iniciar(), { once: true });
addEventListener("keydown", () => sonido.iniciar(), { once: true });

const tutorial = crearTutorial($("objetivo"), () => guardarPartida());
const informe = crearInforme();

// ----- Guardado automático: solo en casa, nunca en plena misión -----
let cargando = false;
// Modo demo (?demo en la dirección): todo desbloqueado para grabar o presentar, sin tocar la partida guardada.
const DEMO = new URLSearchParams(location.search).has("demo");
function guardarPartida() {
  if (cargando || estado.mision || DEMO) return;
  guardar({ estado: exportarEstado(), tutorial: tutorial.hechos(), presentado: yaPresentado() });
}
const partida = DEMO ? null : cargar();
if (DEMO) {
  cargando = true;
  importarEstado({
    dinero: 3000, combustible: 140, dia: 15,
    mejoras: { motor: 3, tanque: 4, escudo: 2, sensor: 2, antena: 2, traje: 2, oxigeno: 2, paneles: 1, bateria: 1, rtg: 1 },
    visitados: { mercurio: true, venus: true, marte: true, jupiter: true },
    misiones: { mercurio: true, venus: true, marte: true, jupiter: true },
  });
  ["hablo", "despego", "aterrizo", "recogio", "regreso", "vendio", "mejoro"].forEach(k => tutorial.marcar(k));
  marcarPresentado(true);
  granero.reconstruirCohete(estado.mejoras);
  cargando = false;
}
if (partida) {
  cargando = true;
  importarEstado(partida.estado);
  tutorial.restaurar(partida.tutorial);
  marcarPresentado(partida.presentado);
  cargando = false;
}

// ----- HUD del granero -----
function pintarHud() {
  $("dinero").textContent = estado.dinero;
  $("combustible").textContent = `${Math.floor(estado.combustible)}/${capacidad()}`;
  $("carga").textContent = estado.carga.length;
  $("dia").textContent = estado.dia;
}

// El cohete del granero se reconstruye cuando cambia alguna mejora.
let firmaMejoras = JSON.stringify(estado.mejoras);
suscribir(() => {
  pintarHud();
  guardarPartida();
  const firma = JSON.stringify(estado.mejoras);
  if (firma !== firmaMejoras) {
    firmaMejoras = firma;
    granero.reconstruirCohete(estado.mejoras);
    sonido.reproducir("comprar");
    tutorial.marcar("mejoro");
  }
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

// ----- Diálogos: E pasa a la siguiente frase -----
let dialogo = null;
function pintarDialogo() {
  $("dialogo").classList.toggle("visible", !!dialogo);
  if (!dialogo) return;
  const l = dialogo.lineas[dialogo.i];
  $("dialogo-nombre").textContent = dialogo.nombre;
  $("dialogo-texto").textContent = l.texto;
  $("dialogo-confianza").textContent = l.confianza ? TEXTO_CONFIANZA[l.confianza] : "";
  $("dialogo-confianza").className = l.confianza || "";
  $("dialogo-sigue").innerHTML = `<b>E</b> ${dialogo.i < dialogo.lineas.length - 1 ? "seguir" : "cerrar"} · ${dialogo.i + 1}/${dialogo.lineas.length}`;
}
function hablar(nombre, lineas, x, z) {
  dialogo = { nombre, lineas, i: 0, x, z };
  granero.hablando(nombre);
  $("accion").classList.remove("visible");
  sonido.reproducir("hablar");
  pintarDialogo();
}
function avanzarDialogo() {
  if (++dialogo.i >= dialogo.lineas.length) return cerrarDialogo();
  sonido.reproducir("hablar");
  pintarDialogo();
}
function cerrarDialogo() {
  if (!dialogo) return;
  dialogo = null;
  granero.hablando(null);
  cercano = null; // para que vuelva a salir el aviso de "E" (lo repinta buscarCercano)
  pintarDialogo();
}

// ----- Pantalla de inicio / pausa y captura del mouse -----
// ----- Menú principal / pausa -----
const CALIDAD = { alta: { pr: 2, sombras: true }, media: { pr: 1, sombras: true }, baja: { pr: 0.75, sombras: false } };
let calidadActual = null;
const menu = crearMenu($("inicio"), {
  alJugar() {
    sonido.iniciar();
    if (!empezado) { empezado = true; alGranero(); document.body.classList.remove("en-menu"); }
    actualizarMusica();
    jugador.controls.lock();
  },
  alNuevaPartida() { borrar(); location.reload(); },
  infoPartida() {
    if (!partida) return null;
    return `Partida guardada: ${estado.dinero} 💰 · ${Object.keys(estado.misiones).length}/5 misiones`;
  },
  alCambiarOpciones(o) {
    sonido.volumen(o.volumen, o.musica);
    jugador.controls.pointerSpeed = o.sensibilidad;
    camera.fov = o.fov;
    camera.updateProjectionMatrix();
    if (calidadActual !== o.calidad) {
      calidadActual = o.calidad;
      const c = CALIDAD[o.calidad];
      renderer.setPixelRatio(Math.min(devicePixelRatio, c.pr));
      renderer.shadowMap.enabled = c.sombras;
      // los materiales deben recompilarse al activar o quitar las sombras
      for (const esc of [scene, espacio.scene, superficie.scene, final.scene]) {
        esc.traverse(obj => { if (obj.material) [].concat(obj.material).forEach(m => { m.needsUpdate = true; }); });
      }
      ajustar();
    }
  },
});
let empezado = false;
document.body.classList.add("en-menu"); // el HUD se oculta hasta empezar a jugar
jugador.controls.addEventListener("lock", () => $("inicio").classList.add("oculto"));
jugador.controls.addEventListener("unlock", () => {
  if (!telefono.abierto && !tarjetaFinal) { menu.refrescar(); $("inicio").classList.remove("oculto"); }
});

// ----- Teléfono (Tab) -----
// Al abrirlo se libera el mouse para poder hacer clic; al cerrarlo se vuelve a capturar.
const telefono = crearTelefono({
  alAbrir() {
    cerrarDialogo();
    sonido.reproducir("telefono");
    $("inicio").classList.add("oculto");
    soltarCercano();
    if (jugador.controls.isLocked) jugador.controls.unlock();
  },
  alCerrar() {
    $("inicio").classList.remove("oculto"); // se oculta solo cuando el mouse queda capturado
    jugador.controls.lock();
  },
  alLanzar: despegar,
});

addEventListener("keydown", e => {
  if (reporteAbierto) {
    if (["KeyE", "Enter", "Escape", "Space"].includes(e.code) && !e.repeat) { e.preventDefault(); cerrarReporte(); }
    return;
  }
  if (e.code === "Tab") {
    e.preventDefault();
    if (!e.repeat && modo === "granero") telefono.alternar();
  } else if (e.code === "Escape" && telefono.abierto) telefono.cerrar();
  else if (e.code === "KeyE" && !e.repeat && (modo === "granero" || modo === "superficie")) interactuar();
  else if (e.code === "KeyE" && !e.repeat && modo === "final") tFinal = Math.max(tFinal, DURACION); // saltar la escena
  else if (e.code === "KeyR" && !e.repeat && modo === "espacio") volver();
  else if (e.code === "KeyM" && !e.repeat) aviso(sonido.alternarMudo() ? "🔇 Sonido apagado" : "🔊 Sonido encendido");
});

// ----- Interacción con la tecla E -----
let cercano = null;
function soltarCercano() {
  cercano = null;
  $("accion").classList.remove("visible");
}
function buscarCercano() {
  if (telefono.abierto) return;
  const p = camera.position;
  if (dialogo) { // alejarse cierra la conversación
    if (Math.hypot(p.x - dialogo.x, p.z - dialogo.z) > 4.5) cerrarDialogo();
    return;
  }
  let mejor = null, dMejor = Infinity;
  for (const it of mundo.interactuables) {
    const d = Math.hypot(p.x - it.x, p.z - it.z);
    if (d < it.radio && d < dMejor) { mejor = it; dMejor = d; }
  }
  if (mejor !== cercano) {
    cercano = mejor;
    $("accion").classList.toggle("visible", !!cercano);
  }
  if (cercano) $("accion").innerHTML = `<b>E</b> ${cercano.texto}`; // el texto puede cambiar (reparaciones)
}

function venderCarga(bono) {
  const habia = estado.carga.length;
  aviso(vender(bono));
  sonido.reproducir(habia ? "vender" : "error");
  if (habia) tutorial.marcar("vendio");
}

function interactuar() {
  if (telefono.abierto) return;
  manos.usar();
  if (dialogo) return avanzarDialogo();
  if (!cercano) return;
  const c = cercano;
  if (c.id === "bomba") { aviso(comprarCombustible(10)); sonido.reproducir("clic"); }
  else if (c.id === "venta") venderCarga(1);
  else if (c.id === "mercado") venderCarga(BONO_PUEBLO);
  else if (c.id === "taller") telefono.abrir("taller");
  else if (c.id === "cohete") telefono.abrir("mapa");
  else if (c.id === "cientifico") { hablar(NOMBRE, consejos(), c.x, c.z); tutorial.marcar("hablo"); guardarPartida(); }
  else if (c.id === "vecino") hablar(c.nombre, c.lineas.map(texto => ({ texto })), c.x, c.z);
  else if (c.id === "despegar") usarCohete();
  else if (c.id === "mision") usarMision(c.clave);
}

// ----- Despegue -----
let tDespegue = 0;
function despegar() {
  tDespegue = 0;
  cerrarDialogo();
  soltarCercano();
  granero.iniciarDespegue(estado.mejoras);
  const m = estado.mision;
  energia = energiaMax();
  avisoEnergia = false;
  informe.empezar({
    dest: m.dest, combustible: estado.combustible + m.ida, capacidad: capacidad(), ida: m.ida,
    masa: factorMasa(), misionHecha: !!estado.misiones[m.dest], recargo: m.recargo, dias: m.dias, dia: estado.dia,
  });
  camera.position.set(11, 1.6, 17);
  ponerModo("despegue");
  tutorial.marcar("despego");
  jugador.controls.lock(); // el clic en el teléfono permite capturar el mouse para el vuelo
}

function entrarAlEspacio() {
  ponerModo("transicion");
  const dest = estado.mision.dest;
  fundido(() => {
    granero.terminarDespegue();
    sonido.motor(0);
    espacio.iniciar(dest, estado.mejoras, generarCampo(dest, 5, VALOR_ORBITA));
    crearMarcadores(espacio.objetos);
    $("destino").textContent = `🪐 ${DATOS_PLANETAS[dest].nombre}`;
    ponerModo("espacio");
    $("senal-esp").textContent = `📡 ${retrasoSenal(dest)} min`;
    radio(`📻 ${NOMBRE}: Lo que flota en órbita vale poco. Sigue el marcador 🛬 para aterrizar en ${DATOS_PLANETAS[dest].lugar}.`);
  });
}

// ----- Radio con retraso de la señal -----
// Escala del juego: cada minuto real de retraso son 0.4 s. El mensaje llega solo si la misión sigue en curso.
let radioId = 0;
function radio(texto) {
  if (!estado.mision) return aviso(texto);
  const min = retrasoSenal(estado.mision.dest), espera = min * 0.4, id = ++radioId;
  aviso(`📡 Mensaje del ${NOMBRE} en camino · la señal tarda ${min} min en llegar`);
  setTimeout(() => { if (id === radioId && estado.mision) { aviso(texto); sonido.reproducir("telefono"); } }, espera * 1000);
}

// ----- Energía del viaje -----
let energia = 0, avisoEnergia = false;
const sinEnergia = () => energia <= 0;
// extra: consumo adicional (por ejemplo, recargar oxígeno). Devuelve true si hubo energía para todo.
function pasoEnergia(dt, enSuelo, extra = 0) {
  const dest = estado.mision.dest;
  const pedia = extra * dt;
  energia += (generacion(dest, enSuelo) - consumoSistemas() - extra) * dt;
  const alcanzo = energia > 0 || pedia === 0;
  energia = Math.max(0, Math.min(energiaMax(), energia));
  informe.energia(energia / energiaMax());
  if (sinEnergia() && !avisoEnergia) {
    avisoEnergia = true;
    sonido.reproducir("alarma");
    aviso("🔋 ¡Sin energía! Los instrumentos se apagan y el cohete no puede recargar tu oxígeno.");
  }
  if (energia > energiaMax() * 0.1) avisoEnergia = false;
  const gen = generacion(dest, enSuelo), neto = gen - consumoSistemas();
  for (const id of ["en-esp", "en-desc", "en-suelo"]) {
    $(id + "-relleno").style.width = `${100 * energia / energiaMax()}%`;
    $(id + "-txt").textContent = `🔋 ${Math.floor(energia)} ${neto >= 0 ? "▲" : "▼"} ${Math.abs(neto).toFixed(1)}/s`;
    $(id).classList.toggle("alerta", energia < energiaMax() * 0.2);
  }
  return alcanzo;
}

// ----- Vuelo -----
addEventListener("mousemove", e => {
  if (modo === "espacio" && document.pointerLockElement && !pausado()) espacio.girar(e.movementX * 0.0022, e.movementY * 0.0022);
});

let esperaAviso = 0;
function volar(dt) {
  const k = jugador.teclas;
  const giroYaw = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  const giroPitch = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0);
  if (giroYaw || giroPitch) espacio.girar(giroYaw * 1.4 * dt, giroPitch * 1.1 * dt);

  pasoEnergia(dt, false);
  let impulso = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
  if (estado.combustible <= 0) impulso = 0;
  const r = espacio.actualizar(dt, impulso);
  if (impulso) { gastar(consumoImpulso() * dt); informe.gasto("orbita", consumoImpulso() * dt); }
  sonido.motor(impulso > 0 ? 0.6 : 0);
  r.recogidos.forEach(o => { aviso(recolectar(o)); sonido.reproducir("recoger"); });
  if (r.enLimite) aviso("Te alejas demasiado. Vuelve hacia el planeta.");

  pintarHudVuelo(r.velocidad);
  pintarMarcadores(espacio.camera, espacio.nave.position);
  pintarBaliza($("marcador-pista"), espacio.pista.position, espacio.camera, espacio.nave.position, "🛬 Aterrizar");
  pintarBaliza($("marcador-senal"), null);

  esperaAviso -= dt;
  if (r.enPista) {
    if (puedeAterrizar()) return empezarDescenso();
    if (esperaAviso <= 0) {
      esperaAviso = 4;
      aviso("No alcanza el combustible para aterrizar y volver. Regresa con R.");
      sonido.reproducir("error");
    }
  }
  if (estado.combustible <= 0) volver();
}

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

// ----- Marcadores sobre los objetos. Los sensores deciden a qué distancia se identifican. -----
let marcadores = [];
function crearMarcadores(lista) {
  $("marcadores").innerHTML = "";
  marcadores = lista.map(o => {
    const el = document.createElement("div");
    el.className = "marcador";
    $("marcadores").appendChild(el);
    return { o, el };
  });
}

const proy = new THREE.Vector3();
function pintarMarcadores(camara, ref) {
  const enSuelo = modo === "superficie";
  const lista = enSuelo ? superficie.objetos.concat(superficie.piezas) : espacio.objetos;
  const vivos = new Set(lista);
  const alcance = (enSuelo && averias.antena) || sinEnergia() ? 0 : alcanceSensor(); // antena averiada o sin energía: nada se identifica
  marcadores = marcadores.filter(m => {
    if (vivos.has(m.o)) return true;
    m.el.remove();
    return false;
  });
  for (const { o, el } of marcadores) {
    proy.copy(o.mesh.position).project(camara);
    const visible = proy.z < 1 && Math.abs(proy.x) < 1 && Math.abs(proy.y) < 1;
    el.style.display = visible ? "" : "none";
    if (!visible) continue;
    const d = Math.round(o.mesh.position.distanceTo(ref));
    el.style.transform = `translate(${(proy.x + 1) / 2 * innerWidth}px, ${(1 - proy.y) / 2 * innerHeight}px)`;
    el.innerHTML = o.pieza ? `🔧 Pieza de repuesto · ${d} m`
      : d <= alcance ? `<i style="background:${o.dato.color}"></i>${o.dato.nombre} · ${o.dato.valor}💰 · ${d} m`
      : `<i></i>¿? · ${d} m`;
  }
}

// Baliza: marcador siempre visible, pegado al borde si el punto queda fuera de pantalla.
function pintarBaliza(el, pos, camara, ref, texto) {
  el.style.display = pos ? "" : "none";
  if (!pos) return;
  proy.copy(pos).project(camara);
  if (proy.z > 1) { proy.x = -proy.x; proy.y = -1; } // detrás de la cámara: apunta hacia abajo
  const x = THREE.MathUtils.clamp(proy.x, -0.85, 0.85), y = THREE.MathUtils.clamp(proy.y, -0.7, 0.72);
  el.style.transform = `translate(${(x + 1) / 2 * innerWidth}px, ${(1 - y) / 2 * innerHeight}px)`;
  el.textContent = `${texto} · ${Math.round(pos.distanceTo(ref))} m`;
}

// ----- Exploración a pie -----
let oxi = 0, traje = 100, cargaSegura = 0, esperaPeligro = 0, esperaAlarma = 0;
const posCohete = new THREE.Vector3(0, 3, 0);
const ZONA_NAVE = 6.5; // cerca del cohete se recarga el oxígeno y la carga queda a salvo

// ----- Descenso: el jugador frena el cohete contra la gravedad del lugar -----
const V_SUAVE = 3, V_DURO = 7; // velocidad al tocar el suelo, en m/s
const NOMBRE_AVERIA = { pata: "pata rota", fuga: "fuga de combustible", antena: "antena desalineada" };
let desc = null;
let averias = {}, piezasNecesarias = 0, piezasEnMano = 0;

function empezarDescenso() {
  ponerModo("transicion");
  sonido.motor(0);
  const dest = estado.mision.dest, d = DATOS_PLANETAS[dest];
  fundido(() => {
    superficie.iniciar(dest, estado.mejoras, generarCampo(dest, 12), !!estado.misiones[dest]);
    mundo = superficie;
    desc = { h: 150, v: -8, g: 9.8 * d.gravedad, arrastre: d.arrastre };
    $("marcadores").innerHTML = "";
    marcadores = [];
    $("lugar-desc").textContent = `🛬 ${d.lugar} · gravedad ${d.gravedad.toFixed(2)} g`;
    pasoDescenso(0);
    ponerModo("descenso");
    const min = retrasoSenal(dest);
    aviso(min >= 3
      ? `📡 La señal tarda ${min} min en llegar a la Tierra: nadie puede ayudarte a tiempo. Aterrizaje autónomo: mantén W para frenar y toca el suelo a menos de ${V_SUAVE} m/s.`
      : `📻 ${NOMBRE}: Mantén W para frenar. Toca el suelo a menos de ${V_SUAVE} m/s o romperás algo.`);
  });
}

function pasoDescenso(dt) {
  const k = jugador.teclas;
  const empuje = !!(k.KeyW || k.Space || k.ArrowUp) && estado.combustible > 0;
  let a = -desc.g - desc.arrastre * desc.v * Math.abs(desc.v); // gravedad y freno de la atmósfera
  if (empuje) { a += 2.5 * desc.g + 3; gastar(consumoImpulso() * 1.2 * dt); informe.gasto("descenso", consumoImpulso() * 1.2 * dt); }
  desc.v += a * dt;
  desc.h += desc.v * dt;
  if (desc.h > 220) { desc.h = 220; desc.v = Math.min(0, desc.v); }
  const y = superficie.moverCohete(desc.h, empuje);
  camera.position.set(15, y + 3, 24);
  camera.lookAt(0, y - 2, 0);
  sonido.motor(empuje ? 0.8 : 0);

  const vel = Math.max(0, -desc.v);
  if (dt > 0) pasoEnergia(dt, false);
  const ciego = sinEnergia(); // sin energía no hay instrumentos: aterrizas a ojo
  $("desc-altura").textContent = ciego ? "Altura ¿?" : `Altura ${Math.max(0, desc.h).toFixed(0)} m`;
  $("desc-vel").textContent = ciego ? "⚠ Sin instrumentos" : `${vel.toFixed(1)} m/s`;
  $("m-vel").classList.toggle("aviso", vel > V_SUAVE && vel <= V_DURO);
  $("m-vel").classList.toggle("alerta", vel > V_DURO);
  $("vel-relleno").style.width = `${Math.min(100, vel / 30 * 100)}%`;
  $("desc-comb").textContent = `⛽ ${estado.combustible.toFixed(1)} · reserva ${estado.mision.ida}`;
  if (dt > 0 && desc.h <= 0) { superficie.polvareda(vel / 8); tocarSuelo(vel); }
}

// Según la velocidad al tocar el suelo, el cohete queda intacto o con averías que hay que reparar.
function tocarSuelo(vel) {
  ponerModo("transicion");
  sonido.motor(0);
  superficie.moverCohete(0, false);
  const dest = estado.mision.dest, d = DATOS_PLANETAS[dest];
  averias = {};
  const leve = Math.random() < 0.5 ? "fuga" : "antena";
  if (vel > V_DURO) { averias.pata = true; averias[leve] = true; }
  else if (vel > V_SUAVE) averias[leve] = true;
  piezasNecesarias = (averias.pata ? 2 : 0) + (averias.fuga || averias.antena ? 1 : 0);
  piezasEnMano = 0;
  superficie.ponerPiezas(piezasNecesarias);
  informe.aterrizaje(vel, Object.keys(averias));
  superficie.inclinar(!!averias.pata);
  sonido.reproducir(piezasNecesarias ? "dano" : "aterrizar");
  aterrizar();
  const lista = Object.keys(averias).map(k => NOMBRE_AVERIA[k]).join(" y ");
  const texto = !piezasNecesarias
    ? `📻 ${NOMBRE}: ¡Aterrizaje suave a ${vel.toFixed(1)} m/s! ${d.suelo}`
    : `📻 ${NOMBRE}: Tocaste suelo a ${vel.toFixed(1)} m/s y hay averías: ${lista}. Busca ${piezasNecesarias === 1 ? "la pieza de repuesto" : `las ${piezasNecesarias} piezas de repuesto`} 🔧 y vuelve al cohete.`;
  fundido(() => {
    jugador.colocar(superficie, 2.4, 4, 12, 30);
    oxi = oxigenoMax();
    traje = 100;
    cargaSegura = estado.mision.carga.length;
    soltarCercano();
    crearMarcadores(superficie.objetos.concat(superficie.piezas));
    $("lugar").textContent = `📍 ${d.lugar} · ${d.gravedad.toFixed(2)} g`;
    ponerModo("superficie");
    sonido.viento(dest === "venus" || dest === "marte" ? 1 : 0.25);
    $("senal-suelo").textContent = `📡 ${retrasoSenal(dest)} min`;
    radio(texto);
    tutorial.marcar("aterrizo");
  });
}

const hayAverias = () => piezasNecesarias > 0;

// E sobre algo de la misión del lugar.
function usarMision(clave) {
  const res = superficie.mision.usar(clave);
  soltarCercano();
  if (!res.hecha) {
    sonido.reproducir(res.error ? "error" : "clic");
    return aviso(res.aviso);
  }
  sonido.reproducir("vender");
  aviso(`${res.aviso} ${completarMision(estado.mision.dest)}`);
}

// Balizas de la misión: se crean según hagan falta.
function pintarBalizasMision(lista, p) {
  const caja = $("balizas-mision");
  while (caja.children.length < lista.length) {
    const el = document.createElement("div");
    el.className = "marcador baliza mision";
    caja.appendChild(el);
  }
  [...caja.children].forEach((el, i) => pintarBaliza(el, lista[i] && lista[i].pos, camera, p, lista[i] && lista[i].texto));
}

// E en el cohete: reparar si hay piezas, o despegar si se puede.
function usarCohete() {
  if (hayAverias() && piezasEnMano >= piezasNecesarias) {
    averias = {};
    piezasNecesarias = 0;
    superficie.inclinar(false);
    sonido.reproducir("comprar");
    return aviso("🔧 Cohete reparado. Todo en orden.");
  }
  if (averias.pata) {
    sonido.reproducir("error");
    return aviso(`Con la pata rota no se puede despegar. Te faltan ${piezasNecesarias - piezasEnMano} piezas de repuesto 🔧.`);
  }
  volver();
}

function textoCohete() {
  if (!hayAverias()) return "Despegar de regreso al granero";
  const cuenta = `piezas ${piezasEnMano}/${piezasNecesarias}`;
  if (piezasEnMano >= piezasNecesarias) return `Reparar el cohete (${cuenta})`;
  return averias.pata ? `Pata rota: faltan piezas (${cuenta})` : `Despegar sin reparar (${cuenta})`;
}

function pasoSuperficie(dt) {
  jugador.actualizar(dt);
  buscarCercano();
  const p = camera.position, m = estado.mision;
  const r = superficie.actualizar(dt, p);
  r.recogidos.forEach(o => { aviso(recolectar(o)); sonido.reproducir("recoger"); tutorial.marcar("recogio"); manos.recoger(o.color); });
  if (r.piezasRecogidas) {
    piezasEnMano += r.piezasRecogidas;
    manos.recoger("#ff8a2a");
    aviso(`🔧 Pieza de repuesto ${piezasEnMano}/${piezasNecesarias}.${piezasEnMano >= piezasNecesarias ? " Vuelve al cohete para reparar." : ""}`);
    sonido.reproducir("recoger");
  }
  if (averias.fuga) { gastar(FUGA_POR_SEGUNDO * dt); informe.gasto("fuga", FUGA_POR_SEGUNDO * dt); } // pierde combustible hasta repararla
  const mi = superficie.mision, rm = r.mision;
  jugador.mov.sinCorrer = !!rm.sinCorrer;
  superficie.interactuables[0].texto = textoCohete();

  const enNave = Math.hypot(p.x, p.z) < ZONA_NAVE;
  const recargando = enNave && oxi < oxigenoMax() && !sinEnergia();
  pasoEnergia(dt, true, recargando ? ENERGIA_RECARGA_OXI : 0);
  if (enNave && sinEnergia() && oxi < oxigenoMax() && esperaPeligro <= 0) {
    esperaPeligro = 3;
    aviso("🔋 Sin energía, el cohete no puede recargar tu oxígeno. Despega antes de que se acabe.");
  }
  if (recargando) {
    oxi = Math.min(oxigenoMax(), oxi + oxigenoMax() * dt / 3);
    cargaSegura = m.carga.length;
  } else {
    const dano = desgasteTraje(m.dest) + ((r.enPeligro ? 16 : 0) + rm.dano) / resistenciaTraje();
    traje = Math.max(0, traje - dano * dt);
    oxi -= dt * (jugador.mov.corriendo ? 1.6 : 1) * (traje <= 0 ? 4 : 1); // correr y el traje roto gastan más
    informe.suelo(traje, Math.max(0, oxi) / oxigenoMax());
  }

  esperaPeligro -= dt;
  if (r.enPeligro && esperaPeligro <= 0) {
    esperaPeligro = 1.5;
    aviso(`⚠ ${r.nombrePeligro}: ¡el traje se está dañando!`);
    sonido.reproducir("dano");
  }
  if (rm.aviso && esperaPeligro <= 0) {
    esperaPeligro = 2.5;
    aviso(rm.aviso);
    sonido.reproducir("dano");
  }
  esperaAlarma -= dt;
  if (!enNave && oxi < oxigenoMax() * 0.25 && esperaAlarma <= 0) { esperaAlarma = 1.2; sonido.reproducir("alarma"); }

  pintarHudSuelo(enNave);
  pintarMarcadores(camera, p);
  pintarBaliza($("marcador-pista"), posCohete, camera, p, "🚀 Cohete");
  pintarBaliza($("marcador-senal"), superficie.senal && superficie.senal.visible && superficie.senal.position, camera, p, "📡 Señal");
  pintarBalizasMision(mi.balizas, p);
  $("mision").style.display = mi.objetivo ? "" : "none";
  if (mi.objetivo) $("mision").innerHTML = `<b>🎯 Misión</b>${mi.objetivo}`;
  const med = mi.medidor;
  $("m-mision").style.display = med ? "" : "none";
  if (med) {
    $("mision-relleno").style.width = `${100 * Math.max(0, Math.min(1, med.valor))}%`;
    $("mision-txt").textContent = med.texto;
    $("m-mision").classList.toggle("alerta", !!med.alerta);
  }

  if (r.enSenal) return empezarFinal();
  if (oxi <= 0) desmayo();
}

function pintarHudSuelo(enNave) {
  const m = estado.mision, max = oxigenoMax();
  $("oxi-relleno").style.width = `${100 * Math.max(0, oxi) / max}%`;
  $("oxi-txt").textContent = `🫁 Oxígeno ${Math.ceil(Math.max(0, oxi))} s`;
  $("traje-relleno").style.width = `${traje}%`;
  $("traje-txt").textContent = traje > 0 ? `🛡 Traje ${Math.ceil(traje)} %` : "🛡 ¡Traje roto!";
  const pocoAire = oxi < max * 0.25;
  $("m-oxi").classList.toggle("alerta", pocoAire);
  $("m-traje").classList.toggle("alerta", traje < 25);
  $("recolectado-suelo").textContent = `📦 ${m.carga.length} · quedan ${superficie.objetos.length}`;
  $("suelo-comb").textContent = `⛽ ${estado.combustible.toFixed(0)} · reserva ${m.ida}`;
  $("suelo-comb").classList.toggle("rojo", estado.combustible < m.ida);
  $("averia").style.display = hayAverias() ? "" : "none";
  $("averia").textContent = `🔧 ${Object.keys(averias).map(k => NOMBRE_AVERIA[k]).join(", ")} · piezas ${piezasEnMano}/${piezasNecesarias}`;
  document.body.classList.toggle("traje-roto", traje <= 0);
  $("alerta").classList.toggle("visible", !enNave && (pocoAire || traje <= 0));
  $("alerta").textContent = traje <= 0
    ? "⚠ Traje roto: el oxígeno se escapa 4 veces más rápido. ¡Vuelve al cohete!"
    : "⚠ Poco oxígeno. Vuelve al cohete para recargar.";
}

// Sin oxígeno: despiertas junto al cohete y pierdes lo que llevabas encima.
function desmayo() {
  ponerModo("transicion");
  sonido.reproducir("error");
  const texto = perderRecolectado(cargaSegura);
  informe.desmayo();
  fundido(() => {
    jugador.colocar(superficie, 2.4, 4, 12, 30);
    oxi = oxigenoMax() * 0.5;
    traje = Math.max(0, traje - 15);
    soltarCercano();
    ponerModo("superficie");
    aviso(`${texto} Despertaste junto al cohete, con el traje más gastado.`);
  });
}

// ----- Final en Europa -----
const SUBTITULOS = [
  [1, "La antena capta algo... La señal viene de esa grieta en el hielo."],
  [5.5, "Se repite con un ritmo exacto. Eso no es ruido."],
  [9.5, "¡Espera! Algo sube por el agua..."],
  [14, "Brillan. Se mueven. Responden a nuestra luz."],
  [17, "No estamos solos."],
];
let tFinal = 0, tarjetaFinal = false, sonoFinal = false;

function limpiarMision() {
  $("marcadores").innerHTML = "";
  marcadores = [];
  $("alerta").classList.remove("visible");
  document.body.classList.remove("traje-roto");
  averias = {};
  piezasNecesarias = 0;
  jugador.mov.sinCorrer = false;
  $("balizas-mision").innerHTML = "";
  sonido.viento(0);
  sonido.motor(0);
}

function empezarFinal() {
  ponerModo("transicion");
  detectarSenal();
  completarMision("europa");
  sonido.reproducir("senal");
  fundido(() => {
    limpiarMision();
    tFinal = 0;
    sonoFinal = false;
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
  if (tFinal >= 9.5 && !sonoFinal) { sonoFinal = true; sonido.reproducir("final"); }
  if (tFinal >= DURACION && !tarjetaFinal) {
    tarjetaFinal = true;
    $("final-dias").innerHTML = `<b>Tu misión duró ${estado.dia} días.</b>`;
    $("tarjeta-final").classList.add("visible");
    if (jugador.controls.isLocked) jugador.controls.unlock(); // libera el mouse para los botones
  }
}

$("final-seguir").addEventListener("click", () => {
  if (modo !== "final") return;
  $("tarjeta-final").classList.remove("visible");
  informe.cancelar();
  ponerModo("transicion");
  jugador.controls.lock();
  const texto = regresar();
  fundido(() => {
    tarjetaFinal = false;
    soltarCercano();
    alGranero();
    ponerModo("granero");
    if (!jugador.controls.isLocked) $("inicio").classList.remove("oculto");
    aviso(`${texto} El ${NOMBRE} quiere hablar contigo.`);
  });
});
$("final-reiniciar").addEventListener("click", () => location.reload());

// ----- Regreso al granero (desde la órbita o desde la superficie) -----
function volver() {
  if (modo !== "espacio" && modo !== "superficie") return;
  const desdeSuelo = modo === "superficie";
  ponerModo("transicion");
  if (desdeSuelo) sonido.motor(1);
  const m = estado.mision, cargaAntes = estado.carga.length, llevaba = m.carga.length;
  const rescate = estado.combustible < m.ida;
  const texto = regresar();
  const traidos = estado.carga.slice(cargaAntes);
  const datos = informe.terminar({
    combustibleFinal: estado.combustible, rescate, traidos,
    perdidos: rescate ? 0 : llevaba - traidos.length, misionHecha: !!estado.misiones[m.dest],
  });
  fundido(() => {
    limpiarMision();
    soltarCercano();
    alGranero();
    ponerModo("granero");
    aviso(texto);
    if (desdeSuelo) tutorial.marcar("regreso");
    if (datos) abrirReporte(datos);
  });
}

// ----- Reporte de misión -----
let reporteAbierto = false;
function abrirReporte(datos) {
  $("informe-cuerpo").innerHTML = htmlInforme(datos);
  $("informe").classList.add("visible");
  reporteAbierto = true;
}
function cerrarReporte() {
  $("informe").classList.remove("visible");
  reporteAbierto = false;
}
$("informe").addEventListener("click", cerrarReporte);

// ----- Bucle -----
let tMenu = 0;
function paso(dt) {
  if (!empezado && pausado() && modo === "granero") { // vista del menú principal: la cámara gira alrededor del granero
    tMenu += dt;
    const a = 0.6 + tMenu * 0.05; // por encima de los árboles cercanos
    camera.position.set(Math.sin(a) * 25, 12 + Math.sin(tMenu * 0.2) * 1.5, -6 + Math.cos(a) * 25);
    camera.lookAt(0, 2.5, -6);
    granero.actualizar(dt, estado.mejoras.motor === 0, camera.position);
    return;
  }
  if (["espacio", "descenso", "superficie"].includes(modo) && !pausado()) informe.tiempo(dt);
  if (modo === "granero" && reporteAbierto) {
    granero.actualizar(dt, estado.mejoras.motor === 0, camera.position);
  } else if (modo === "granero") {
    jugador.actualizar(dt);
    buscarCercano();
    granero.actualizar(dt, estado.mejoras.motor === 0, camera.position);
  } else if (modo === "despegue") {
    tDespegue += dt;
    const altura = granero.actualizarDespegue(tDespegue);
    camera.lookAt(0, Math.max(3, altura), 6);
    sonido.motor(tDespegue > 0.4 ? 1 : 0);
    if (tDespegue > 4) entrarAlEspacio();
  } else if (modo === "espacio" && !pausado()) {
    volar(dt);
  } else if (modo === "descenso" && !pausado()) {
    pasoDescenso(dt);
  } else if (modo === "superficie" && !pausado()) {
    pasoSuperficie(dt);
  } else if (modo === "final") {
    pasoFinal(dt);
  }
}

// Lectura del escáner: el objeto más cercano en el planeta, o la próxima misión en el granero.
let relojEscaner = 0;
function leerEscaner() {
  const p = camera.position;
  if (modo === "superficie") {
    const lista = superficie.objetos.concat(superficie.piezas);
    let cerca = null, d = Infinity;
    for (const o of lista) {
      const dd = Math.hypot(o.mesh.position.x - p.x, o.mesh.position.z - p.z);
      if (dd < d) { d = dd; cerca = o; }
    }
    if (sinEnergia()) return manos.escribir("SIN ENERGÍA", "🔋 0", "#f3a59e");
    if (!cerca) return manos.escribir("ESCÁNER", "Zona limpia");
    if (cerca.pieza) return manos.escribir("🔧 Pieza", `${Math.round(d)} m`, "#ff8a2a");
    const conocido = !averias.antena && d <= alcanceSensor();
    return manos.escribir(conocido ? cerca.dato.nombre : "Señal ¿?", `${Math.round(d)} m`, conocido ? cerca.dato.color : "#6ee37a");
  }
  const sig = ORDEN_MISIONES.find(id => !estado.misiones[id]);
  manos.escribir(sig ? "Próximo destino" : "Misión cumplida", sig ? DATOS_PLANETAS[sig].nombre : "🛸");
}
const ORDEN_MISIONES = ["mercurio", "venus", "marte", "jupiter", "europa"];

let antes = performance.now();
// Grabación cuadro a cuadro (herramientas/trailer): el bucle normal se detiene y cada cuadro se avanza a mano.
let grabando = false, manosVisibles = true;

function bucle() {
  if (grabando) return;
  const ahora = performance.now();
  const dt = Math.min((ahora - antes) / 1000, 0.05);
  paso(dt);
  antes = ahora;
  dibujar(dt);
}

function dibujar(dt) {
  renderer.clear();
  renderer.render(vista.escena, vista.camara);
  // Brazos en primera persona: solo caminando, y no con el teléfono abierto
  if (manosVisibles && (modo === "granero" || modo === "superficie") && !telefono.abierto && (empezado || !pausado())) {
    manos.vestir(modo === "superficie");
    manos.actualizar(dt, jugador.mov, jugador.enSuelo, camera);
    if ((relojEscaner -= dt) <= 0) { relojEscaner = 0.25; leerEscaner(); }
    renderer.clearDepth();
    renderer.render(manos.scene, manos.camara);
  }
}
renderer.setAnimationLoop(bucle);

// Acceso para pruebas desde la consola del navegador.
window.__juego = {
  camera, jugador, granero, espacio, superficie, estado, telefono, interactuar, despegar, volver,
  get modo() { return modo; },
  refrescarHud: pintarHud,
  grabar: {
    iniciar() { grabando = true; },
    paso,
    dibujar,
    set manos(v) { manosVisibles = v; },
    get desc() { return desc; },
    get tFinal() { return tFinal; },
    renderizarPista,
  },
  menu,
  get reporteAbierto() { return reporteAbierto; },
  get suelo() { return { oxi, traje, cargaSegura, averias, piezasNecesarias, piezasEnMano }; },
  get desc() { return desc; },
  get radioId() { return radioId; },
  get energia() { return energia; },
  set energia(v) { energia = v; },
  set suelo(v) { if (v.oxi !== undefined) oxi = v.oxi; if (v.traje !== undefined) traje = v.traje; },
  avanzar(segundos) { for (let i = 0; i < segundos / 0.05; i++) paso(0.05); },
};
