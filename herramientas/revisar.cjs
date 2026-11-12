// Revisión visual: saca una foto de cada objeto desde un punto de vista dado, sin HUD ni brazos.
// Uso: npx electron herramientas/revisar.cjs vistas.json carpeta-de-salida
// vistas.json: [["nombre", px, pz, tx, ty, tz, alturaOpcional], ...]  (coordenadas del mundo del granero)
const { app, BrowserWindow } = require("electron");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "dist");
const [vistasArchivo, SALIDA] = process.argv.slice(-2);
const VISTAS = JSON.parse(fs.readFileSync(vistasArchivo, "utf8"));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "cohete-revisar-")));

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

const PREPARAR = `(async () => {
  const j = window.__juego;
  [...document.querySelectorAll("#inicio button")].find(b => b.textContent.includes("Jugar")).click();
  await new Promise(r => setTimeout(r, 400));
  const st = document.createElement("style");
  st.textContent = "#inicio,.fila-hud,#pista,#columna-derecha,#accion,#aviso,#logro,#mira,#dialogo{display:none!important}";
  document.head.appendChild(st);
  Object.assign(j.estado.mejoras, { antena: 3, paneles: 4, tanque: 5 });
  j.granero.reconstruirCohete(j.estado.mejoras);
  j.estado.misiones = { mercurio: true, venus: true };
  j.estado.logros = { despegue: true, seda: true, salto: true, cometa: true, fuga: true };
  j.estado.museo = { "Hielo": true, "Meteorito": true, "Sonda perdida": true, "Cristal lunar": true };
  j.granero.mostrarProgreso(j.estado);
  j.grabar.manos = false;
  j.grabar.iniciar(); // el bucle se detiene: cada foto se dibuja a mano, sin que la física mueva la cámara
  return "ok";
})()`;

app.whenReady().then(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const puerto = await servir();
  const ventana = new BrowserWindow({ width: 1280, height: 720, useContentSize: true, show: true, webPreferences: { backgroundThrottling: false } });
  await ventana.loadURL(`http://127.0.0.1:${puerto}/?demo`);
  const js = codigo => ventana.webContents.executeJavaScript(codigo, true);
  await new Promise(r => setTimeout(r, 1500));
  await js(PREPARAR);
  for (const [nombre, px, pz, tx, ty, tz, h] of VISTAS) {
    try {
      await js(`(() => { const j = window.__juego; j.jugador.colocar(j.granero, ${px}, ${pz}, ${tx}, ${tz}); j.avanzar(0.6);
        ${h !== undefined ? `j.camera.position.set(${px}, ${h}, ${pz});` : ""} j.camera.lookAt(${tx}, ${ty}, ${tz}); j.grabar.dibujar(0.016); return "ok"; })()`);
      await new Promise(r => setTimeout(r, 450));
      const imagen = await ventana.webContents.capturePage();
      fs.writeFileSync(path.join(SALIDA, nombre + ".png"), imagen.toPNG());
      console.log("✔", nombre);
    } catch (err) {
      console.log("✘", nombre, err.message);
    }
  }
  app.quit();
});
