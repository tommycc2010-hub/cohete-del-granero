// Red del multijugador en línea (sin nada visual).
// Una persona crea una sala y recibe un código de 4 letras; las demás se unen con ese código desde su teléfono o PC.
// La conexión es directa entre navegadores (WebRTC, con la librería PeerJS). El servidor público gratuito de PeerJS
// solo sirve para que los jugadores se encuentren: no guarda partidas ni datos personales.
// Forma de estrella: el anfitrión tiene la partida y reenvía los mensajes a los demás.
import { Peer } from "peerjs";

const PREFIJO = "cohete-del-granero-26-";
const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ"; // sin I, L ni O, que se confunden con 1 y 0
export const MAX_JUGADORES = 4;

const oyentes = {};
let peer = null, alAnfitrion = null; // invitado: conexión con el anfitrión
const conexiones = new Map();        // anfitrión: id → conexión de cada invitado
let videoSaliente = null;            // anfitrión: la imagen del juego que se transmite

export const red = {
  activo: false, anfitrion: false, codigo: "", miId: "", jugadores: [], // [{ id, nombre }], el anfitrión primero
  get invitado() { return this.activo && !this.anfitrion; },
  get miIndice() { return this.jugadores.findIndex(j => j.id === this.miId); },
  nombreDe(id) { const j = this.jugadores.find(x => x.id === id); return j ? j.nombre : "Alguien"; },
};

// Escuchar un tipo de mensaje: fn(mensaje, idDeQuienLoMando)
export function on(tipo, fn) { (oyentes[tipo] ||= []).push(fn); }
function avisar(tipo, msg, de) { (oyentes[tipo] || []).forEach(fn => { try { fn(msg, de); } catch (e) { console.error(e); } }); }

const codigoAzar = () => Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
const limpiarNombre = n => String(n || "").replace(/[<>&"]/g, "").trim().slice(0, 16) || "Jugador";

// Enviar: el anfitrión lo manda a todos (menos a `excepto`); un invitado se lo manda al anfitrión.
export function enviar(msg, excepto = null) {
  if (!red.activo) return;
  if (red.anfitrion) { for (const [id, c] of conexiones) if (id !== excepto && c.open) c.send(msg); }
  else if (alAnfitrion && alAnfitrion.open) alAnfitrion.send(msg);
}
// Solo el anfitrión: a una persona
export function enviarA(id, msg) { const c = conexiones.get(id); if (c && c.open) c.send(msg); }

function publicarSala() {
  const m = { t: "sala", jugadores: red.jugadores, codigo: red.codigo };
  enviar(m);
  avisar("sala", m, red.miId);
}

// ----- Anfitrión -----
export function crearSala(nombre, intentos = 4) {
  salir();
  return new Promise((resolver, rechazar) => {
    const codigo = codigoAzar();
    peer = new Peer(PREFIJO + codigo, { debug: 0 });
    peer.on("open", id => {
      Object.assign(red, { activo: true, anfitrion: true, codigo, miId: id, jugadores: [{ id, nombre: limpiarNombre(nombre) }] });
      publicarSala();
      resolver(codigo);
    });
    peer.on("error", err => {
      if (err.type === "unavailable-id" && intentos > 0) { peer.destroy(); crearSala(nombre, intentos - 1).then(resolver, rechazar); return; }
      if (!red.activo) { salir(); rechazar(textoError(err)); } else avisar("error", { texto: textoError(err) });
    });
    peer.on("connection", conn => {
      conn.on("data", msg => {
        if (!msg || typeof msg.t !== "string") return;
        if (msg.t === "hola") {
          if (red.jugadores.length >= MAX_JUGADORES) { conn.send({ t: "llena" }); setTimeout(() => conn.close(), 300); return; }
          conexiones.set(conn.peer, conn);
          red.jugadores.push({ id: conn.peer, nombre: limpiarNombre(msg.nombre) });
          avisar("entra", { id: conn.peer }, conn.peer); // main manda la partida al recién llegado
          publicarSala();
          if (videoSaliente) peer.call(conn.peer, videoSaliente);
          return;
        }
        if (!conexiones.has(conn.peer)) return;
        avisar(msg.t, msg, conn.peer);
        if (msg.reenviar) enviar({ ...msg, de: conn.peer }, conn.peer); // posiciones, radio… para los demás
      });
      conn.on("close", () => quitar(conn.peer));
      conn.on("error", () => quitar(conn.peer));
    });
    peer.on("disconnected", () => { if (peer && !peer.destroyed) peer.reconnect(); });
  });
}
function quitar(id) {
  if (!conexiones.has(id)) return;
  conexiones.delete(id);
  const j = red.jugadores.find(x => x.id === id);
  red.jugadores = red.jugadores.filter(x => x.id !== id);
  avisar("sale", { id, nombre: j ? j.nombre : "" }, id);
  enviar({ t: "sale", id, nombre: j ? j.nombre : "" });
  publicarSala();
}

// Transmitir la imagen del juego a todos los invitados (y a los que lleguen después)
export function transmitir(stream) {
  videoSaliente = stream;
  if (!peer || !red.anfitrion) return;
  for (const id of conexiones.keys()) peer.call(id, stream);
}

// ----- Invitado -----
export function unirse(codigo, nombre) {
  salir();
  codigo = String(codigo || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  return new Promise((resolver, rechazar) => {
    if (codigo.length !== 4) return rechazar("El código tiene 4 letras.");
    peer = new Peer({ debug: 0 });
    let listo = false;
    const plazo = setTimeout(() => { if (!listo) { salir(); rechazar("No hubo respuesta. Revisa el código y que la sala siga abierta."); } }, 15000);
    peer.on("open", id => {
      red.miId = id;
      alAnfitrion = peer.connect(PREFIJO + codigo, { reliable: true, serialization: "json" });
      alAnfitrion.on("open", () => alAnfitrion.send({ t: "hola", nombre: limpiarNombre(nombre) }));
      alAnfitrion.on("data", msg => {
        if (!msg || typeof msg.t !== "string") return;
        if (msg.t === "llena") { clearTimeout(plazo); salir(); return rechazar(`La sala ya tiene ${MAX_JUGADORES} jugadores.`); }
        if (msg.t === "sala") {
          Object.assign(red, { activo: true, anfitrion: false, codigo, jugadores: msg.jugadores });
          if (!listo) { listo = true; clearTimeout(plazo); resolver(codigo); }
        }
        avisar(msg.t, msg, msg.de || alAnfitrion.peer);
      });
      alAnfitrion.on("close", () => { if (red.activo) { salir(); avisar("cerrada", {}); } });
    });
    peer.on("call", llamada => {
      llamada.answer();
      llamada.on("stream", s => avisar("video", { stream: s }));
    });
    peer.on("error", err => {
      if (!listo) { clearTimeout(plazo); salir(); rechazar(textoError(err)); }
      else avisar("error", { texto: textoError(err) });
    });
  });
}

export function salir() {
  red.activo = false; red.anfitrion = false; red.codigo = ""; red.jugadores = [];
  conexiones.clear();
  alAnfitrion = null;
  videoSaliente = null;
  if (peer) { try { peer.destroy(); } catch { /* ya cerrado */ } peer = null; }
}

function textoError(err) {
  const t = err && err.type;
  if (t === "peer-unavailable") return "No existe una sala con ese código.";
  if (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed") return "Sin conexión con el servidor de salas. Revisa tu internet.";
  if (t === "browser-incompatible") return "Este navegador no permite jugar en línea.";
  return "No se pudo conectar (" + (t || "error") + ").";
}
