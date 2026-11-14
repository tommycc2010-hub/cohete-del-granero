// Prepara las imágenes de la página de presentación: convierte las capturas de docs/capturas (PNG pesados)
// en JPG ligeros dentro de public/img. Uso: npm run imagenes  (primero npm run capturas)
const { app, nativeImage } = require("electron");
const fs = require("fs"), path = require("path");

const ENTRADA = path.join(__dirname, "..", "docs", "capturas");
const SALIDA = path.join(__dirname, "..", "public", "img");
const ANCHO = 1280;

app.whenReady().then(() => {
  fs.mkdirSync(SALIDA, { recursive: true });
  let total = 0;
  for (const f of fs.readdirSync(ENTRADA).filter(n => n.endsWith(".png") && !n.includes("sin-hud"))) {
    const nombre = f.replace(/^\d+-/, "").replace(/\.png$/, ""); // 04-vuelo-jupiter.png → vuelo-jupiter.jpg
    let img = nativeImage.createFromPath(path.join(ENTRADA, f));
    const { width } = img.getSize();
    if (width > ANCHO) img = img.resize({ width: ANCHO, quality: "best" });
    const jpg = img.toJPEG(82);
    fs.writeFileSync(path.join(SALIDA, nombre + ".jpg"), jpg);
    total += jpg.length;
    console.log("✔", nombre + ".jpg", Math.round(jpg.length / 1024) + " kB");
  }
  console.log("Total:", Math.round(total / 1024) + " kB");
  app.quit();
});
