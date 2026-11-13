// Dibuja el icono de la app (cohete delante de un granero, en el estilo del juego) y lo guarda en public/
// a varios tamaños: npx electron herramientas/iconos.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("fs"), path = require("path");
const SALIDA = path.join(__dirname, "..", "public");
const DIBUJO = `(tam, margen) => {
  const c = document.createElement("canvas"); c.width = c.height = tam;
  const g = c.getContext("2d"), s = tam / 512;
  g.scale(s, s);
  // fondo: cielo con borde redondeado (margen para iconos "maskable")
  g.fillStyle = "#8ed1f0"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#5cc46b"; g.fillRect(0, 380, 512, 132);
  const m = margen;
  g.save(); g.translate(256, 256); g.scale(1 - m, 1 - m); g.translate(-256, -256);
  g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#1d1d1d";
  // granero
  g.fillStyle = "#e5483b";
  g.beginPath(); g.moveTo(70, 400); g.lineTo(70, 250); g.lineTo(256, 140); g.lineTo(442, 250); g.lineTo(442, 400); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#fff6e5"; g.fillRect(186, 270, 140, 130); g.strokeRect(186, 270, 140, 130);
  // cohete
  g.save(); g.translate(256, 250); g.rotate(-0.35);
  g.fillStyle = "#e5483b"; g.beginPath(); g.moveTo(-62, 70); g.lineTo(-100, 140); g.lineTo(-40, 120); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(62, 70); g.lineTo(100, 140); g.lineTo(40, 120); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#fff6e5"; g.beginPath(); g.moveTo(-48, 130); g.lineTo(-48, -60); g.quadraticCurveTo(0, -200, 48, -60); g.lineTo(48, 130); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#e5483b"; g.beginPath(); g.moveTo(-40, -82); g.quadraticCurveTo(0, -200, 40, -82); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#4aa3e8"; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ffa726"; g.beginPath(); g.moveTo(-30, 130); g.lineTo(0, 200); g.lineTo(30, 130); g.closePath(); g.fill(); g.stroke();
  g.restore(); g.restore();
  return c.toDataURL("image/png");
}`;
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL("about:blank");
  const guardar = (archivo, url) => fs.writeFileSync(archivo, Buffer.from(url.split(",")[1], "base64"));
  for (const [nombre, tam, margen] of [["icono-192.png", 192, 0], ["icono-512.png", 512, 0], ["icono-mascara-512.png", 512, 0.2], ["apple-touch-icon.png", 180, 0]]) {
    guardar(path.join(SALIDA, nombre), await w.webContents.executeJavaScript(`(${DIBUJO})(${tam}, ${margen})`));
    console.log("✔", nombre);
  }
  // App de Android: iconos de cada densidad e imagen de inicio, con los mismos tamaños que los de Capacitor
  const RES = path.join(__dirname, "..", "android", "app", "src", "main", "res");
  const tamPng = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  if (fs.existsSync(RES)) {
    for (const dir of fs.readdirSync(RES)) {
      for (const f of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png", "splash.png"]) {
        const archivo = path.join(RES, dir, f);
        if (!fs.existsSync(archivo)) continue;
        const [an, al] = tamPng(archivo);
        const codigo = f === "splash.png"
          ? `(() => { const c = document.createElement("canvas"); c.width = ${an}; c.height = ${al}; const g = c.getContext("2d");
              g.fillStyle = "#8ed1f0"; g.fillRect(0, 0, ${an}, ${al}); const i = new Image(); return new Promise(r => { i.onload = () => {
              const t = Math.min(${an}, ${al}) * 0.45; g.drawImage(i, (${an} - t) / 2, (${al} - t) / 2, t, t); r(c.toDataURL("image/png")); };
              i.src = (${DIBUJO})(512, 0); }); })()`
          : `(${DIBUJO})(${an}, ${f === "ic_launcher_foreground.png" ? 0.3 : 0})`;
        guardar(archivo, await w.webContents.executeJavaScript(codigo));
      }
    }
    console.log("✔ iconos e inicio de Android");
  }
  app.exit(0);
});
