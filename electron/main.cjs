// App de escritorio: abre el juego ya compilado (carpeta dist) en una ventana propia.
// Lo sirve con un protocolo propio (app://juego) con dirección fija: así las partidas guardadas y las opciones
// (que viven en el almacenamiento de esa dirección) se conservan al cerrar y volver a abrir la app.
const { app, BrowserWindow, Menu, protocol } = require("electron");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "dist");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".mp4": "video/mp4" };

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.whenReady().then(() => {
  protocol.handle("app", async req => {
    const ruta = decodeURIComponent(new URL(req.url).pathname);
    const archivo = path.normalize(path.join(RAIZ, ruta === "/" ? "index.html" : ruta));
    if (!archivo.startsWith(RAIZ)) return new Response("Prohibido", { status: 403 }); // nada fuera de dist
    try {
      const datos = await fs.promises.readFile(archivo);
      return new Response(datos, { headers: { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" } });
    } catch {
      return new Response("No encontrado", { status: 404 });
    }
  });

  Menu.setApplicationMenu(null);
  const ventana = new BrowserWindow({
    width: 1280, height: 760, minWidth: 900, minHeight: 560,
    title: "Cohete del Granero", backgroundColor: "#8ed1f0", show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  ventana.once("ready-to-show", () => ventana.show());
  ventana.loadURL("app://juego/");
  // F11: pantalla completa
  ventana.webContents.on("before-input-event", (e, entrada) => {
    if (entrada.type === "keyDown" && entrada.key === "F11") ventana.setFullScreen(!ventana.isFullScreen());
  });
});

app.on("window-all-closed", () => app.quit());
