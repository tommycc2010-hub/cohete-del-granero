// Graba el tráiler: npm run trailer (después de generar la narración con narrar.py).
// Abre el juego compilado en Electron, graba cada toma cuadro a cuadro, renderiza la música y monta el MP4 con ffmpeg.
const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("ffmpeg-static");

const RAIZ = path.join(__dirname, "..", "..");
const DIST = path.join(RAIZ, "dist");
const SALIDA = path.join(RAIZ, "salida", "trailer");
const FINAL = path.join(RAIZ, "salida", "trailer-cohete-del-granero.mp4");
const guion = JSON.parse(fs.readFileSync(path.join(__dirname, "guion.json"), "utf8"));
const duraciones = JSON.parse(fs.readFileSync(path.join(SALIDA, "duraciones.json"), "utf8"));
const FPS = guion.fps;
const ENTRADA_VOZ = 0.4; // segundos desde el inicio de la toma hasta que empieza la voz
const FIJAS = { despegue: 3.7 }; // el despegue pasa al espacio a los 4 s

app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "cohete-trailer-")));

function servir() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const archivo = path.normalize(path.join(DIST, ruta === "/" ? "index.html" : ruta));
      if (!archivo.startsWith(DIST)) { res.writeHead(403); return res.end(); }
      fs.readFile(archivo, (err, datos) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": archivo.endsWith(".js") ? "text/javascript" : "text/html" });
        res.end(datos);
      });
    });
    s.listen(0, "127.0.0.1", () => resolve(s.address().port));
  });
}

function ejecutar(args) {
  return new Promise((ok, mal) => {
    const p = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", d => { err += d; });
    p.on("close", c => (c === 0 ? ok() : mal(new Error(err.slice(-1500)))));
  });
}

app.whenReady().then(async () => {
  // Línea de tiempo: cada toma dura lo que su voz más un respiro, o su mínimo.
  let t = 0;
  const tomas = guion.tomas.map(toma => {
    const voz = duraciones[toma.id] || 0;
    const dur = FIJAS[toma.id] || Math.max(toma.min, voz ? voz + ENTRADA_VOZ + 0.7 : 0);
    const r = { ...toma, voz, desde: t, cuadros: Math.round(dur * FPS) };
    t += r.cuadros / FPS;
    return r;
  });
  const total = t;
  console.log(`Tráiler: ${tomas.length} tomas, ${total.toFixed(1)} s`);

  const puerto = await servir();
  const ventana = new BrowserWindow({
    width: 1280, height: 720, useContentSize: true, show: true, title: "Grabando tráiler…",
    webPreferences: { backgroundThrottling: false },
  });
  await ventana.loadURL(`http://127.0.0.1:${puerto}/jugar.html`);
  const js = codigo => ventana.webContents.executeJavaScript(codigo, true);
  await new Promise(r => setTimeout(r, 1500));
  await js(fs.readFileSync(path.join(__dirname, "escenas.js"), "utf8"));

  // Video: los cuadros van directo a ffmpeg como JPEG
  const video = path.join(SALIDA, "video.mp4");
  const cod = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", video],
  { stdio: ["pipe", "ignore", "ignore"] });
  const terminado = new Promise(r => cod.on("close", r));

  for (const [k, toma] of tomas.entries()) {
    const modo = await js(`TR.preparar(${JSON.stringify(toma.id)})`);
    const opciones = {
      sub: toma.texto,
      subDesde: Math.round(ENTRADA_VOZ * FPS) - 2,
      subHasta: Math.round((ENTRADA_VOZ + toma.voz + 0.35) * FPS),
      fundirEntrada: k === 0 ? 30 : 6,
      fundirSalida: k === tomas.length - 1 ? 36 : 4,
    };
    for (let i = 0; i < toma.cuadros; i++) {
      await js(`TR.cuadro(${JSON.stringify(toma.id)}, ${i}, ${toma.cuadros}, ${JSON.stringify(opciones)})`);
      const img = await ventana.webContents.capturePage();
      if (!cod.stdin.write(img.toJPEG(92))) await new Promise(r => cod.stdin.once("drain", r));
    }
    console.log(`✔ ${toma.id.padEnd(12)} ${(toma.cuadros / FPS).toFixed(1)} s (modo: ${modo})`);
  }
  cod.stdin.end();
  await terminado;

  // Música: estilos seguidos se unen en un solo segmento
  const segmentos = [];
  for (const toma of tomas) {
    const fin = toma.desde + toma.cuadros / FPS, ult = segmentos[segmentos.length - 1];
    if (ult && ult.estilo === toma.musica) ult.hasta = fin;
    else segmentos.push({ estilo: toma.musica, desde: Math.max(0, toma.desde - 0.6), hasta: fin + 0.6 });
  }
  segmentos[segmentos.length - 1].hasta = total;
  const wav = await js(`TR.musica(${JSON.stringify(segmentos)}, ${total})`);
  const musica = path.join(SALIDA, "musica.wav");
  fs.writeFileSync(musica, Buffer.from(wav, "base64"));
  console.log("✔ música");

  // Montaje: video + música + voces en su momento
  const voces = tomas.filter(x => x.voz > 0);
  const args = ["-y", "-i", video, "-i", musica];
  voces.forEach(v => args.push("-i", path.join(SALIDA, `${v.id}.wav`)));
  const filtros = [`[1:a]volume=0.55,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5[m]`];
  voces.forEach((v, k) => {
    const ms = Math.round((v.desde + ENTRADA_VOZ) * 1000);
    filtros.push(`[${k + 2}:a]aresample=44100,volume=0.85,adelay=${ms}|${ms}[v${k}]`);
  });
  const etiquetasVoz = voces.map((_, k) => `[v${k}]`).join("");
  // apad: la pista de voz dura todo el video, para que la mezcla no corte el final
  filtros.push(`${etiquetasVoz}amix=inputs=${voces.length}:normalize=0,apad=whole_dur=${total.toFixed(2)}[voz]`);
  // La música baja sola cuando habla el narrador
  filtros.push(`[voz]asplit=2[voz1][voz2]`, `[m][voz1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[mb]`,
    `[mb][voz2]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]`);
  args.push("-filter_complex", filtros.join(";"), "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", FINAL);
  await ejecutar(args);
  console.log(`✔ Tráiler listo: ${FINAL}`);
  app.quit();
}).catch(err => { console.error(err); app.quit(); });
