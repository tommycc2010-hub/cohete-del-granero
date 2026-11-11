// App de escritorio: abre el juego ya compilado (carpeta dist) en una ventana propia.
// Lo sirve con un pequeño servidor local, porque los módulos de JavaScript no cargan bien desde file://.
const { app, BrowserWindow, Menu } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "dist");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };

function servir() {
  return new Promise(resolve => {
    const servidor = http.createServer((req, res) => {
      const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const archivo = path.normalize(path.join(RAIZ, ruta === "/" ? "index.html" : ruta));
      if (!archivo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); } // nada fuera de dist
      fs.readFile(archivo, (err, datos) => {
        if (err) { res.writeHead(404); return res.end("No encontrado"); }
        res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
        res.end(datos);
      });
    });
    servidor.listen(0, "127.0.0.1", () => resolve(servidor.address().port)); // puerto libre, solo local
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const puerto = await servir();
  const ventana = new BrowserWindow({
    width: 1280, height: 760, minWidth: 900, minHeight: 560,
    title: "Cohete del Granero", backgroundColor: "#8ed1f0", show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  ventana.once("ready-to-show", () => ventana.show());
  ventana.loadURL(`http://127.0.0.1:${puerto}/`);
  // F11: pantalla completa
  ventana.webContents.on("before-input-event", (e, entrada) => {
    if (entrada.type === "keyDown" && entrada.key === "F11") ventana.setFullScreen(!ventana.isFullScreen());
  });
});

app.on("window-all-closed", () => app.quit());
