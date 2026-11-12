// Música ambiental generada en el momento con Web Audio: acordes suaves, un arpegio y campanas.
// Cada lugar tiene su propio estilo. No usa archivos de audio.

// Notas MIDI de cada acorde; cada acorde dura un compás.
const ESTILOS = {
  granero: { bpm: 84, acordes: [[48, 55, 64, 67], [45, 52, 60, 64], [41, 53, 57, 60], [43, 50, 59, 62]], arpegio: true, campanas: 0.1, brillo: 1400 },
  espacio: { bpm: 56, acordes: [[38, 50, 57, 64], [34, 46, 53, 62], [41, 48, 57, 64], [36, 48, 55, 62]], arpegio: false, campanas: 0.35, brillo: 900 },
  mercurio: { bpm: 70, acordes: [[40, 52, 59, 64], [41, 53, 57, 64], [40, 52, 59, 67], [38, 50, 57, 65]], arpegio: true, campanas: 0.15, brillo: 1800 },
  venus: { bpm: 52, acordes: [[33, 45, 52, 55], [34, 46, 53, 56], [33, 45, 52, 60], [31, 43, 50, 55]], arpegio: false, campanas: 0.05, brillo: 600 },
  marte: { bpm: 64, acordes: [[45, 57, 60, 64], [43, 55, 59, 62], [41, 53, 57, 60], [43, 55, 59, 62]], arpegio: true, campanas: 0.2, brillo: 1100 },
  jupiter: { bpm: 60, acordes: [[37, 49, 56, 61], [38, 50, 57, 62], [37, 49, 56, 64], [35, 47, 54, 59]], arpegio: true, campanas: 0.1, brillo: 1300 },
  europa: { bpm: 50, acordes: [[41, 53, 60, 64, 69], [40, 52, 59, 62, 67], [38, 50, 57, 60, 65], [43, 55, 62, 65, 69]], arpegio: false, campanas: 0.45, brillo: 2200 },
};

const hz = n => 440 * Math.pow(2, (n - 69) / 12);

// Sintetizador: programa compases de un estilo en cualquier contexto de audio (en vivo o renderizado).
function crearSintetizador(ctx, mezcla) {
  function nota(frec, t, dur, { tipo = "sine", vol = 0.05, ataque = 0.02, filtro = 0 } = {}) {
    const osc = ctx.createOscillator(), gan = ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frec;
    gan.gain.setValueAtTime(0.0001, t);
    gan.gain.linearRampToValueAtTime(vol, t + ataque);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let ultimo = osc;
    if (filtro) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filtro;
      osc.connect(f);
      ultimo = f;
    }
    ultimo.connect(gan).connect(mezcla);
    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  // Programa el compás número `n` del estilo a partir del tiempo t. Devuelve su duración.
  function compas(nombre, t, n) {
    const e = ESTILOS[nombre], beat = 60 / e.bpm, largo = beat * 4;
    const acorde = e.acordes[n % e.acordes.length];
    // Colchón de acordes: dos osciladores un poco desafinados por nota
    acorde.forEach((nt, i) => {
      const vol = i === 0 ? 0.045 : 0.03;
      nota(hz(nt), t, largo * 1.15, { tipo: "triangle", vol, ataque: largo * 0.3, filtro: e.brillo });
      nota(hz(nt) * 1.004, t, largo * 1.15, { tipo: "sine", vol: vol * 0.7, ataque: largo * 0.35 });
    });
    // Bajo
    nota(hz(acorde[0] - 12), t, largo * 0.95, { tipo: "sine", vol: 0.06, ataque: 0.05 });
    // Arpegio en corcheas
    if (e.arpegio) {
      const arriba = acorde.slice(1).map(nt => nt + 12);
      for (let i = 0; i < 8; i++) {
        if (Math.random() < 0.18) continue; // algunos silencios para que no suene mecánico
        nota(hz(arriba[(i * 2 + n) % arriba.length]), t + i * beat / 2, beat * 0.9, { tipo: "triangle", vol: 0.022, filtro: e.brillo * 1.6 });
      }
    }
    // Campanas al azar
    for (let i = 0; i < 4; i++) {
      if (Math.random() < e.campanas) {
        nota(hz(acorde[1 + (i % (acorde.length - 1))] + 24), t + i * beat + Math.random() * 0.1, 2.4, { vol: 0.018, ataque: 0.005 });
      }
    }
    return largo;
  }

  return { compas };
}

// Eco suave para dar espacio. Devuelve el nodo donde conectar las notas.
function conEco(ctx, salida) {
  const eco = ctx.createDelay(1);
  eco.delayTime.value = 0.38;
  const ecoGan = ctx.createGain();
  ecoGan.gain.value = 0.28;
  eco.connect(ecoGan).connect(eco);
  ecoGan.connect(salida);
  const mezcla = ctx.createGain();
  mezcla.connect(salida);
  mezcla.connect(eco);
  return mezcla;
}

export function crearMusica(ctx, destino) {
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(destino);
  const sint = crearSintetizador(ctx, conEco(ctx, salida));

  let estilo = null, compas = 0, proximo = 0, reloj = null, volumen = 0.5;
  const programarCompas = t => sint.compas(estilo, t, compas++);

  function tic() {
    if (!estilo) return;
    while (proximo < ctx.currentTime + 1.5) proximo += programarCompas(Math.max(proximo, ctx.currentTime + 0.05));
  }

  return {
    // Cambia de estilo con un fundido; null la apaga.
    poner(nuevo) {
      if (nuevo && !ESTILOS[nuevo]) nuevo = "espacio";
      if (nuevo === estilo) return;
      const t = ctx.currentTime;
      salida.gain.cancelScheduledValues(t);
      salida.gain.setTargetAtTime(0, t, 0.4);
      clearInterval(reloj);
      estilo = nuevo;
      if (!estilo) return;
      setTimeout(() => {
        if (estilo !== nuevo) return;
        compas = 0;
        proximo = ctx.currentTime + 0.1;
        salida.gain.setTargetAtTime(volumen, ctx.currentTime, 1.2);
        tic();
        reloj = setInterval(tic, 300);
      }, 700);
    },
    volumen(v) {
      volumen = v;
      if (estilo) salida.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
    },
  };
}

// Renderiza una pista de música a un AudioBuffer (para el tráiler).
// segmentos: [{ estilo, desde, hasta }] en segundos; cada uno entra y sale con un fundido.
export async function renderizarPista(segmentos, total, frecuencia = 44100) {
  const ctx = new OfflineAudioContext(2, Math.ceil(total * frecuencia), frecuencia);
  const salida = ctx.createGain();
  salida.gain.value = 0.9;
  salida.connect(ctx.destination);
  for (const { estilo, desde, hasta } of segmentos) {
    const g = ctx.createGain();
    g.connect(salida);
    g.gain.setValueAtTime(0, desde);
    g.gain.linearRampToValueAtTime(1, desde + 1.2);
    g.gain.setValueAtTime(1, Math.max(desde + 1.2, hasta - 1.5));
    g.gain.linearRampToValueAtTime(0, hasta);
    const sint = crearSintetizador(ctx, conEco(ctx, g));
    for (let t = desde, n = 0; t < hasta; n++) t += sint.compas(estilo, t, n);
  }
  return ctx.startRendering();
}
