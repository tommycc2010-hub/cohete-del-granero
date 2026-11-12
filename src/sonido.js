// Sonido generado con Web Audio: no usa archivos, todo se sintetiza.
// El navegador solo permite sonido después de la primera interacción del jugador.
import { crearMusica } from "./musica.js";

let ctx = null, salida = null, motorGan = null, vientoGan = null, mudo = false, musica = null;
let volGeneral = 0.5, volMusica = 0.5, estiloPedido = null;

function iniciar() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  salida = ctx.createGain();
  salida.gain.value = volGeneral;
  salida.connect(ctx.destination);
  musica = crearMusica(ctx, salida);
  musica.volumen(volMusica);
  if (estiloPedido) musica.poner(estiloPedido);

  // Ruido blanco en bucle: base del motor y del viento
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const capa = (tipo, frec) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = frec;
    const gan = ctx.createGain();
    gan.gain.value = 0;
    src.connect(filtro).connect(gan).connect(salida);
    src.start();
    return gan;
  };
  motorGan = capa("lowpass", 170);
  vientoGan = capa("bandpass", 520);
}

// Una nota corta. `hasta` desliza la frecuencia; `cuando` la retrasa en segundos.
function tono(frec, dur = 0.12, tipo = "sine", vol = 0.2, hasta = null, cuando = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + cuando;
  const osc = ctx.createOscillator(), gan = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frec, t0);
  if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gan).connect(salida);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const EFECTOS = {
  clic: () => tono(620, 0.05, "square", 0.07),
  hablar: () => { tono(420, 0.06, "triangle", 0.15); tono(520, 0.06, "triangle", 0.15, null, 0.07); },
  recoger: () => { tono(880, 0.09, "sine", 0.22); tono(1320, 0.14, "sine", 0.22, null, 0.08); },
  comprar: () => [523, 659, 784].forEach((f, i) => tono(f, 0.12, "triangle", 0.2, null, i * 0.08)),
  vender: () => [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.1, "square", 0.09, null, i * 0.06)),
  error: () => tono(170, 0.2, "sawtooth", 0.14, 110),
  dano: () => tono(120, 0.22, "sawtooth", 0.2, 60),
  alarma: () => { tono(900, 0.1, "square", 0.1); tono(900, 0.1, "square", 0.1, null, 0.18); },
  salto: () => tono(300, 0.14, "sine", 0.14, 520),
  paso: () => tono(70 + Math.random() * 30, 0.05, "triangle", 0.1, 45),
  telefono: () => tono(740, 0.07, "sine", 0.14, 980),
  aterrizar: () => tono(220, 0.7, "sawtooth", 0.16, 55),
  senal: () => [1200, 1200, 1600].forEach((f, i) => tono(f, 0.14, "sine", 0.16, null, i * 0.2)),
  temblor: () => { tono(48, 1.4, "sawtooth", 0.2, 28); tono(62, 1.0, "square", 0.08, 35, 0.3); },
  impacto: () => { tono(90, 0.9, "sawtooth", 0.26, 30); tono(1400, 0.3, "sine", 0.1, 200); },
  eco: () => [0, 0.9, 1.8].forEach(d => tono(1046, 0.18, "sine", 0.14, 980, d)),
  final: () => [261.6, 329.6, 392, 523.3, 659.3].forEach((f, i) => tono(f, 5, "sine", 0.1, null, i * 0.5)),
};

export const sonido = {
  iniciar,
  reproducir(nombre) { if (ctx && !mudo && EFECTOS[nombre]) EFECTOS[nombre](); },
  // Nivel del motor del cohete, de 0 a 1.
  motor(nivel) { if (ctx) motorGan.gain.setTargetAtTime(mudo ? 0 : nivel * 0.9, ctx.currentTime, 0.08); },
  // Nivel del viento ambiente, de 0 a 1.
  viento(nivel) { if (ctx) vientoGan.gain.setTargetAtTime(mudo ? 0 : nivel * 0.25, ctx.currentTime, 0.4); },
  alternarMudo() {
    mudo = !mudo;
    if (mudo) { this.motor(0); this.viento(0); }
    if (ctx) salida.gain.setTargetAtTime(mudo ? 0 : volGeneral, ctx.currentTime, 0.1);
    return mudo;
  },
  // Música de fondo según el lugar: "granero", "espacio", el id de un planeta, o null.
  musica(estilo) {
    estiloPedido = estilo;
    if (musica) musica.poner(estilo);
  },
  // Volúmenes de 0 a 1.
  volumen(general, deMusica) {
    volGeneral = general;
    volMusica = deMusica * 0.6;
    if (!ctx) return;
    if (!mudo) salida.gain.setTargetAtTime(volGeneral, ctx.currentTime, 0.1);
    musica.volumen(volMusica);
  },
};
