// Dibuja el icono de Granero Orbital (en el estilo del juego: colores planos y contorno negro grueso)
// y lo guarda en todos los formatos: npm run iconos
//   public/          → web e instalación en el celular (PWA): 192, 512, "maskable" y Apple
//   electron/        → app de Windows: icono.ico (varios tamaños) e icono.png (ventana)
//   android/…/res/   → app de Android: iconos de cada densidad, redondo, adaptativo e imagen de inicio
const { app, BrowserWindow } = require("electron");
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");

// Dibujo en un lienzo de 512×512. `margen` encoge el dibujo (iconos adaptativos que el sistema recorta),
// `redondo` lo recorta en círculo y `fondo` = false lo deja transparente alrededor (primer plano adaptativo).
const DIBUJO = `(tam, { margen = 0, redondo = false, fondo = true } = {}) => {
  const c = document.createElement("canvas"); c.width = c.height = tam;
  const g = c.getContext("2d");
  g.scale(tam / 512, tam / 512);
  const T = "#1d1d1d";
  const trazo = (w = 12) => { g.lineWidth = w; g.strokeStyle = T; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); };
  const circulo = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
  if (redondo) { circulo(256, 256, 256); g.clip(); }

  if (fondo) {
    // Cielo nocturno con degradado
    const cielo = g.createLinearGradient(0, 0, 0, 512);
    cielo.addColorStop(0, "#14204a"); cielo.addColorStop(0.65, "#2e4f9c"); cielo.addColorStop(1, "#5a86d6");
    g.fillStyle = cielo; g.fillRect(0, 0, 512, 512);
  }
  g.save(); g.translate(256, 256); g.scale(1 - margen, 1 - margen); g.translate(-256, -256);

  if (fondo) {
    // Estrellas
    g.fillStyle = "#fff6e5";
    [[60, 70, 5], [130, 40, 3], [210, 95, 4], [40, 170, 3], [300, 50, 3], [175, 165, 3], [95, 245, 4], [455, 230, 3], [250, 30, 4]].forEach(([x, y, r]) => { circulo(x, y, r); g.fill(); });
    // Júpiter con sus bandas
    g.save(); circulo(410, 110, 78); g.clip();
    g.fillStyle = "#e6c79a"; g.fillRect(320, 20, 180, 180);
    g.fillStyle = "#c98a52"; [[48, 22], [92, 18], [132, 20], [170, 14]].forEach(([y, h]) => g.fillRect(320, y, 180, h));
    g.fillStyle = "#b5432a"; g.beginPath(); g.ellipse(432, 140, 18, 10, 0, 0, Math.PI * 2); g.fill();
    g.restore(); circulo(410, 110, 78); trazo(12);
    // Colinas
    g.fillStyle = "#4fb561";
    g.beginPath(); g.moveTo(-20, 420); g.quadraticCurveTo(140, 350, 300, 400); g.quadraticCurveTo(420, 360, 540, 390); g.lineTo(540, 540); g.lineTo(-20, 540); g.closePath(); g.fill(); trazo(12);
    g.fillStyle = "#3f9c4f"; g.beginPath(); g.moveTo(-20, 470); g.quadraticCurveTo(200, 430, 540, 470); g.lineTo(540, 540); g.lineTo(-20, 540); g.closePath(); g.fill();
    // Granero
    g.fillStyle = "#e5483b";
    g.beginPath(); g.moveTo(40, 440); g.lineTo(40, 345); g.lineTo(110, 295); g.lineTo(180, 345); g.lineTo(180, 440); g.closePath(); g.fill(); trazo(11);
    g.fillStyle = "#c93a2e"; g.beginPath(); g.moveTo(28, 352); g.lineTo(110, 290); g.lineTo(192, 352); trazo(14);
    g.fillStyle = "#fff6e5"; g.fillRect(85, 375, 50, 65); g.beginPath(); g.rect(85, 375, 50, 65); trazo(9);
    g.beginPath(); g.moveTo(85, 375); g.lineTo(135, 440); g.moveTo(135, 375); g.lineTo(85, 440); trazo(6);
  }

  // Humo del despegue
  g.fillStyle = "#fff6e5";
  [[250, 440, 34], [205, 455, 26], [300, 452, 28], [170, 470, 20], [340, 470, 22]].forEach(([x, y, r]) => { circulo(x, y, r); g.fill(); trazo(10); });

  // Cohete inclinado, subiendo
  g.save(); g.translate(285, 270); g.rotate(0.38);
  // llama
  g.fillStyle = "#ff8a1a"; g.beginPath(); g.moveTo(-34, 118); g.quadraticCurveTo(0, 230, 34, 118); g.closePath(); g.fill(); trazo(10);
  g.fillStyle = "#ffd23f"; g.beginPath(); g.moveTo(-18, 118); g.quadraticCurveTo(0, 185, 18, 118); g.closePath(); g.fill();
  // aletas
  g.fillStyle = "#e5483b";
  g.beginPath(); g.moveTo(-50, 40); g.lineTo(-92, 120); g.lineTo(-50, 110); g.closePath(); g.fill(); trazo(11);
  g.beginPath(); g.moveTo(50, 40); g.lineTo(92, 120); g.lineTo(50, 110); g.closePath(); g.fill(); trazo(11);
  // tobera
  g.fillStyle = "#555"; g.beginPath(); g.moveTo(-30, 108); g.lineTo(-36, 128); g.lineTo(36, 128); g.lineTo(30, 108); g.closePath(); g.fill(); trazo(9);
  // cuerpo
  g.fillStyle = "#fff6e5"; g.beginPath(); g.moveTo(-52, 112); g.lineTo(-52, -40); g.quadraticCurveTo(-52, -150, 0, -205); g.quadraticCurveTo(52, -150, 52, -40); g.lineTo(52, 112); g.closePath(); g.fill();
  // sombra toon del cuerpo
  g.save(); g.clip(); g.fillStyle = "#e3d6bd"; g.fillRect(18, -220, 60, 340); g.restore();
  g.beginPath(); g.moveTo(-52, 112); g.lineTo(-52, -40); g.quadraticCurveTo(-52, -150, 0, -205); g.quadraticCurveTo(52, -150, 52, -40); g.lineTo(52, 112); g.closePath(); trazo(12);
  // punta roja y franja
  g.fillStyle = "#e5483b"; g.beginPath(); g.moveTo(-40, -115); g.quadraticCurveTo(0, -102, 40, -115); g.quadraticCurveTo(28, -165, 0, -205); g.quadraticCurveTo(-28, -165, -40, -115); g.closePath(); g.fill(); trazo(10);
  g.fillStyle = "#4aa3e8"; g.fillRect(-52, 62, 104, 20); g.beginPath(); g.rect(-52, 62, 104, 20); trazo(9);
  // ventana
  g.fillStyle = "#4aa3e8"; circulo(0, -40, 30); g.fill(); trazo(11);
  g.fillStyle = "#bfe9ff"; circulo(-9, -50, 9); g.fill();
  g.restore();
  g.restore();
  return c.toDataURL("image/png");
}`;

// Archivo .ico de Windows con varias imágenes PNG dentro (16 a 256 px)
function crearIco(pngs) {
  const cab = Buffer.alloc(6 + 16 * pngs.length);
  cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4);
  let pos = cab.length;
  pngs.forEach(({ tam, datos }, i) => {
    const o = 6 + i * 16;
    cab.writeUInt8(tam >= 256 ? 0 : tam, o); cab.writeUInt8(tam >= 256 ? 0 : tam, o + 1);
    cab.writeUInt8(0, o + 2); cab.writeUInt8(0, o + 3);
    cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6);
    cab.writeUInt32LE(datos.length, o + 8); cab.writeUInt32LE(pos, o + 12);
    pos += datos.length;
  });
  return Buffer.concat([cab, ...pngs.map(p => p.datos)]);
}

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL("about:blank");
  const png = async (tam, op = {}) => Buffer.from((await w.webContents.executeJavaScript(`(${DIBUJO})(${tam}, ${JSON.stringify(op)})`)).split(",")[1], "base64");

  // Web y celular (PWA)
  const PUB = path.join(RAIZ, "public");
  fs.mkdirSync(PUB, { recursive: true });
  fs.writeFileSync(path.join(PUB, "icono-192.png"), await png(192));
  fs.writeFileSync(path.join(PUB, "icono-512.png"), await png(512));
  fs.writeFileSync(path.join(PUB, "icono-mascara-512.png"), await png(512, { margen: 0.18 }));
  fs.writeFileSync(path.join(PUB, "apple-touch-icon.png"), await png(180));
  fs.writeFileSync(path.join(PUB, "favicon.png"), await png(64));
  console.log("✔ web y PWA");

  // Windows (Electron)
  const ELE = path.join(RAIZ, "electron");
  const tamIco = [16, 24, 32, 48, 64, 128, 256];
  fs.writeFileSync(path.join(ELE, "icono.ico"), crearIco(await Promise.all(tamIco.map(async tam => ({ tam, datos: await png(tam) })))));
  fs.writeFileSync(path.join(ELE, "icono.png"), await png(512));
  console.log("✔ Windows");

  // Android: iconos de cada densidad e imagen de inicio, con los tamaños de los archivos de Capacitor
  const RES = path.join(RAIZ, "android", "app", "src", "main", "res");
  const tamPng = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  if (fs.existsSync(RES)) {
    for (const dir of fs.readdirSync(RES)) {
      for (const f of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png", "splash.png"]) {
        const archivo = path.join(RES, dir, f);
        if (!fs.existsSync(archivo)) continue;
        const [an, al] = tamPng(archivo);
        let datos;
        if (f === "splash.png") {
          datos = Buffer.from((await w.webContents.executeJavaScript(`(() => {
            const c = document.createElement("canvas"); c.width = ${an}; c.height = ${al}; const g = c.getContext("2d");
            const cielo = g.createLinearGradient(0, 0, 0, ${al}); cielo.addColorStop(0, "#14204a"); cielo.addColorStop(1, "#5a86d6");
            g.fillStyle = cielo; g.fillRect(0, 0, ${an}, ${al});
            const i = new Image();
            return new Promise(r => { i.onload = () => { const t = Math.min(${an}, ${al}) * 0.5;
              g.save(); g.beginPath(); g.roundRect((${an} - t) / 2, (${al} - t) / 2, t, t, t * 0.18); g.clip();
              g.drawImage(i, (${an} - t) / 2, (${al} - t) / 2, t, t); g.restore(); r(c.toDataURL("image/png")); };
              i.src = (${DIBUJO})(512); });
          })()`)).split(",")[1], "base64");
        } else if (f === "ic_launcher_round.png") datos = await png(an, { redondo: true });
        else if (f === "ic_launcher_foreground.png") datos = await png(an, { margen: 0.3 }); // el sistema recorta el borde
        else datos = await png(an);
        fs.writeFileSync(archivo, datos);
      }
    }
    console.log("✔ Android");
  }
  app.exit(0);
});
