// Genera las capturas del juego para el README y la entrega: npm run capturas
// Abre el juego compilado (dist) en una ventana de Electron, prepara cada escena y guarda docs/capturas/*.png.
const { app, BrowserWindow } = require("electron");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "dist");
const SALIDA = path.join(__dirname, "..", "docs", "capturas");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// Perfil temporal: sin partida guardada ni opciones previas.
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "cohete-capturas-")));

function servir() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const archivo = path.normalize(path.join(RAIZ, ruta === "/" ? "index.html" : ruta));
      if (!archivo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
      fs.readFile(archivo, (err, datos) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
        res.end(datos);
      });
    });
    s.listen(0, "127.0.0.1", () => resolve(s.address().port));
  });
}

// Ayudas que se inyectan en la página: pilotar, aterrizar y caminar sin teclado ni mouse.
const AYUDAS = `
(() => { // el objetivo del tutorial no avanza en las capturas: se oculta
  const estilo = document.createElement("style");
  estilo.textContent = "#objetivo, #logro { display: none !important; }";
  document.head.appendChild(estilo);
})();
window.T = (() => {
  const j = window.__juego;
  const ocultar = () => document.getElementById("inicio").classList.add("oculto");
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  async function despegar(dest) {
    j.estado.combustible = 60 + 20 * j.estado.mejoras.tanque;
    j.telefono.abrir("mapa");
    [...document.querySelectorAll(".tel-item")].find(b => b.textContent.includes(dest)).click();
    j.avanzar(4.2); await pausa(1300); ocultar();
  }
  function volarHacia(segundos) {
    const e = j.espacio; j.jugador.teclas.KeyW = true;
    if (e.lluvia) e.iniciarLluvia(false); // sin meteoritos ni eventos al azar: capturas repetibles
    j.eventosEsp.limpiar();
    j.estado.combustible = Math.max(j.estado.combustible, j.estado.mision.ida + 60); // margen para no quedarse sin reserva
    for (let n = 0; n < segundos / 0.05 && j.modo === "espacio"; n++) {
      ocultar();
      const d = e.pista.position.clone().sub(e.nave.position);
      e.girar(e.nave.rotation.y - Math.atan2(-d.x, -d.z), e.nave.rotation.x - Math.asin(d.y / d.length()));
      j.avanzar(0.05);
    }
    j.jugador.teclas.KeyW = false;
  }
  function bajarHasta(altura) {
    const k = j.jugador.teclas;
    for (let n = 0; n < 6000 && j.modo === "descenso" && j.desc.h > altura; n++) {
      const d = j.desc, an = 1.5 * d.g + 3;
      k.KeyW = d.v < -(1.5 + Math.sqrt(2 * 0.6 * an * Math.max(0, d.h - 0.5)));
      j.avanzar(0.05);
    }
  }
  async function aterrizar() { bajarHasta(-1); j.jugador.teclas.KeyW = false; await pausa(1300); ocultar(); j.eventosSuelo.limpiar(); j.avanzar(0.3); }
  return { j, ocultar, pausa, despegar, volarHacia, bajarHasta, aterrizar };
})(); "ok";`;

// [nombre del archivo, código que prepara la escena, milisegundos de espera antes de la foto]
const ESCENAS = [
  ["01-menu-principal", `"ok"`, 3000],

  ["02-granero-dr-nova", `(async () => {
    [...document.querySelectorAll("#inicio button")].find(b => b.textContent.includes("Jugar")).click();
    await T.pausa(300); T.ocultar();
    Object.assign(T.j.estado.mejoras, { motor: 1, escudo: 1, antena: 1, paneles: 2, bateria: 1 });
    T.j.estado.dinero = 1240; T.j.estado.misiones = { mercurio: true };
    T.j.granero.reconstruirCohete(T.j.estado.mejoras); T.j.refrescarHud();
    T.j.jugador.colocar(T.j.granero, 2.4, -3.7, 3.9, -5.4); T.j.avanzar(0.3);
    T.j.interactuar(); T.j.interactuar();
    // el diálogo se abre de cerca; después la cámara retrocede (sigue dentro de la distancia de conversación)
    T.j.jugador.colocar(T.j.granero, 1.4, -2.4, 3.9, -5.4); T.j.avanzar(0.4);
    T.j.camera.lookAt(2.2, 1.55, -6.3);
  })()`, 1500],

  ["03-telefono-mapa", `(async () => {
    for (let i = 0; i < 8; i++) T.j.interactuar();
    T.j.estado.misiones = { mercurio: true, venus: true };
    T.j.jugador.colocar(T.j.granero, 0, 13, 0, -8); T.j.avanzar(0.3);
    T.j.telefono.abrir("mapa");
  })()`, 1200],

  ["04-vuelo-jupiter", `(async () => {
    Object.assign(T.j.estado.mejoras, { motor: 3, tanque: 5, antena: 2, oxigeno: 2, traje: 2, sensor: 2, rtg: 1 });
    T.j.estado.misiones = { mercurio: true, venus: true, marte: true };
    T.j.estado.dia = 30;
    await T.despegar("Júpiter");
    T.volarHacia(1.6);
  })()`, 900],

  ["05-descenso", `(async () => {
    T.volarHacia(60); await T.pausa(1300); T.ocultar();
    T.bajarHasta(12); T.j.jugador.teclas.KeyW = true; T.j.avanzar(0.2);
  })()`, 700],

  ["06-reporte-mision", `(async () => {
    await T.aterrizar();
    const o = T.j.superficie.objetos[0];
    T.j.jugador.colocar(T.j.superficie, o.mesh.position.x + 1, o.mesh.position.z + 1, 0, 0); T.j.avanzar(0.5);
    T.j.jugador.colocar(T.j.superficie, 2.4, 4, 0, 0); T.j.avanzar(0.3);
    T.j.interactuar(); await T.pausa(1300); T.ocultar(); T.j.avanzar(0.2);
  })()`, 900],

  ["07-marte-rover", `(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    T.j.estado.misiones = { mercurio: true, venus: true };
    await T.despegar("Marte"); T.volarHacia(60); await T.pausa(1300); T.ocultar(); await T.aterrizar();
    T.j.suelo = { oxi: 88 };
    T.j.jugador.colocar(T.j.superficie, 55.5, 49.5, 60, 55); T.j.avanzar(0.3);
    T.j.camera.lookAt(59.5, 1.1, 55);
    T.j.interactuar(); T.j.avanzar(0.2);
  })()`, 1200],

  ["08-europa-antenas", `(async () => {
    T.j.jugador.colocar(T.j.superficie, 2.4, 4, 0, 0); T.j.avanzar(0.3); T.j.interactuar(); await T.pausa(1300); T.ocultar();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    T.j.estado.misiones = { mercurio: true, venus: true, marte: true, jupiter: true };
    T.j.estado.dia = 95; // día con la ventana a Júpiter y Europa abierta
    await T.despegar("Europa"); T.volarHacia(60); await T.pausa(1300); T.ocultar(); await T.aterrizar();
    const s = T.j.superficie;
    for (let i = 0; i < 3; i++) {
      T.j.suelo = { oxi: 88 };
      const b = s.mision.balizas[0].pos;
      T.j.jugador.colocar(s, b.x + 1.5, b.z + 1.5, b.x, b.z); T.j.avanzar(0.3); T.j.interactuar(); T.j.avanzar(0.3);
    }
    const p = s.senal.position;
    T.j.jugador.colocar(s, p.x - 38, p.z - 30, p.x, p.z); T.j.avanzar(0.3);
    T.j.camera.lookAt(p.x, p.y + 8, p.z);
  })()`, 1500],

  ["09-final-europa", `(async () => {
    const p = T.j.superficie.senal.position;
    T.j.jugador.colocar(T.j.superficie, p.x + 1, p.z + 1, 0, 0); T.j.avanzar(0.3);
    await T.pausa(1300); T.j.avanzar(14);
  })()`, 900],

  ["10-pueblo", `(async () => {
    document.getElementById("final-seguir").click(); await T.pausa(1300); T.ocultar();
    for (let i = 0; i < 4; i++) window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    T.j.jugador.colocar(T.j.granero, -62, 56, -75, 72); T.j.avanzar(4);
    T.j.camera.lookAt(-76, 2.2, 70);
  })()`, 1200],
];

app.whenReady().then(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const puerto = await servir();
  const ventana = new BrowserWindow({
    width: 1600, height: 900, useContentSize: true, show: true, title: "Capturas",
    webPreferences: { backgroundThrottling: false },
  });
  await ventana.loadURL(`http://127.0.0.1:${puerto}/`);
  const js = codigo => ventana.webContents.executeJavaScript(codigo, true);
  await new Promise(r => setTimeout(r, 1500));
  await js(AYUDAS);
  for (const [nombre, codigo, espera] of ESCENAS) {
    try {
      await js(codigo);
      await new Promise(r => setTimeout(r, espera));
      const imagen = await ventana.webContents.capturePage();
      fs.writeFileSync(path.join(SALIDA, nombre + ".png"), imagen.toPNG());
      console.log("✔", nombre);
    } catch (err) {
      console.log("✘", nombre, err.message);
    }
  }
  app.quit();
});
