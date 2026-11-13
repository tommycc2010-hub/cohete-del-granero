// Misiones de superficie: cada lugar tiene una mecánica propia y un objetivo que la usa.
// La mecánica (por ejemplo, el calor de Mercurio) existe siempre; el objetivo solo si la misión no está hecha.
//
// Cada misión devuelve:
//   objetivo  -> texto del objetivo actual, o null si no hay
//   balizas   -> [{ pos, texto }] puntos que se marcan en pantalla
//   medidor   -> { texto, valor (0 a 1), alerta } o null
//   actualizar(dt, pos) -> { dano (% de traje por segundo), aviso, sinCorrer }
//   usar(clave) -> { aviso, hecha } al pulsar E en algo de la misión
import * as THREE from "three";
import { caja, cilindro, cono, esfera } from "./estilo.js";
import { crearParticulas } from "./particulas.js";

const basico = (color, opacidad = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacidad < 1, opacity: opacidad });
const dentro = (pos, x, z, r) => Math.hypot(pos.x - x, pos.z - z) < r;

// Aro en el suelo que marca un sitio de la misión.
function marcarSitio(api, x, z, color) {
  const aro = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.14, 6, 28), basico(color, 0.9));
  aro.rotation.x = Math.PI / 2;
  aro.position.set(x, api.altura(x, z) + 0.25, z);
  api.grupo.add(aro);
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 40, 8), basico(color, 0.3));
  haz.material.fog = false;
  haz.position.set(x, api.altura(x, z) + 20, z);
  api.grupo.add(haz);
  return { aro, haz, pos: new THREE.Vector3(x, api.altura(x, z) + 2, z) };
}

function quitar(api, ...cosas) { cosas.forEach(c => api.grupo.remove(c)); }
function quitarInteractuable(api, clave) {
  const i = api.interactuables.findIndex(it => it.clave === clave);
  if (i >= 0) api.interactuables.splice(i, 1);
}

// ===== Mercurio: avanzar de sombra en sombra hasta un cráter con hielo =====
function mercurio(api, hecha) {
  const sombras = [{ x: 0, z: 0, r: 7 }]; // el cohete también da sombra
  const ponerSombra = (x, z) => {
    const y = api.altura(x, z), alto = 6 + api.azar() * 4;
    const roca = caja(2.8, alto, 2.8, 0x4a433c);
    roca.position.set(x + 2.6, y + alto / 2 - 0.5, z + 2.2);
    roca.rotation.set(0.08, api.azar() * 3, -0.1);
    api.grupo.add(roca);
    api.colisiones.push({ minX: x + 1.2, maxX: x + 4, minZ: z + 0.8, maxZ: z + 3.6 });
    const disco = new THREE.Mesh(new THREE.CircleGeometry(5.5, 18), basico(0x000000, 0.45));
    disco.rotation.x = -Math.PI / 2;
    disco.position.set(x, y + 0.14, z);
    api.grupo.add(disco);
    sombras.push({ x, z, r: 5.5 });
  };
  const meta = { x: -72, z: -78 };
  for (let d = 19; d < 96; d += 19) { // sombras a lo largo de la ruta al cráter
    const f = d / Math.hypot(meta.x, meta.z), lado = (api.azar() - 0.5) * 9;
    ponerSombra(meta.x * f + lado, meta.z * f - lado);
  }
  for (let i = 0; i < 22; i++) {      // y repartidas por el resto del terreno
    const a = api.azar() * Math.PI * 2, r = 20 + api.azar() * 135;
    ponerSombra(Math.cos(a) * r, Math.sin(a) * r);
  }

  // Cráter en sombra permanente, con hielo
  const yMeta = api.altura(meta.x, meta.z);
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(13, 24), basico(0x000000, 0.6));
  fondo.rotation.x = -Math.PI / 2;
  fondo.position.set(meta.x, yMeta + 0.16, meta.z);
  api.grupo.add(fondo);
  sombras.push({ x: meta.x, z: meta.z, r: 13 });
  for (let i = 0; i < 6; i++) {
    const hielo = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + api.azar() * 0.5), basico(0x8fe3f0, 0.9));
    hielo.position.set(meta.x + (api.azar() - 0.5) * 6, yMeta + 0.5, meta.z + (api.azar() - 0.5) * 6);
    api.grupo.add(hielo);
  }
  const sitio = hecha ? null : marcarSitio(api, meta.x, meta.z, 0x8fe3f0);
  if (!hecha) api.interactuables.push({ id: "mision", clave: "hielo", texto: "Tomar una muestra de hielo", x: meta.x, z: meta.z, radio: 5 });

  let calor = 0;
  return {
    get objetivo() { return hecha ? null : "Llega al cráter en sombra y toma una muestra de hielo. Avanza de sombra en sombra."; },
    get balizas() { return hecha ? [] : [{ pos: sitio.pos, texto: "🧊 Cráter en sombra" }]; },
    get medidor() { return { texto: `🌡 Calor del traje ${Math.round(calor)} %`, valor: calor / 100, alerta: calor > 75 }; },
    actualizar(dt, pos) {
      const enSombra = sombras.some(s => dentro(pos, s.x, s.z, s.r));
      calor = THREE.MathUtils.clamp(calor + (enSombra ? -28 : 7.5) * dt, 0, 100);
      const quema = calor >= 100;
      return { dano: quema ? 22 : 0, aviso: quema ? "🌡 ¡El traje se está friendo al sol! Busca una sombra." : null };
    },
    usar() {
      hecha = true;
      quitarInteractuable(api, "hielo");
      quitar(api, sitio.aro, sitio.haz);
      return { hecha: true, aviso: "🧊 ¡Muestra de hielo! En un planeta pegado al Sol, el agua sobrevive donde nunca llega la luz." };
    },
  };
}

// ===== Venus: llevar una estación meteorológica entre la lava antes de que el calor la destruya =====
function venus(api, hecha) {
  const meta = { x: 70, z: -60 }, largo = Math.hypot(meta.x, meta.z);
  const u = { x: meta.x / largo, z: meta.z / largo }, p = { x: -u.z, z: u.x };
  // Dos filas de lava cruzan el camino; cada una tiene un solo hueco para pasar.
  [[38, 3], [62, -2]].forEach(([d, hueco]) => {
    for (let k = -4; k <= 4; k++) {
      if (k === hueco) continue;
      api.ponerZona(u.x * d + p.x * k * 9, u.z * d + p.z * k * 9, 4.6); // se tocan sin montarse: solo se pasa por el hueco
    }
  });

  const LIMITE = 75;
  let fase = hecha ? "hecha" : "espera", t = 0;
  const cajon = caja(1, 0.8, 0.8, 0xffd23f);
  cajon.position.set(-3.6, api.altura(-3.6, 3) + 0.4, 3);
  let sitio = null;
  if (!hecha) {
    api.grupo.add(cajon);
    sitio = marcarSitio(api, meta.x, meta.z, 0xffd23f);
    api.interactuables.push({ id: "mision", clave: "sacar", texto: "Sacar la estación meteorológica", x: -3.6, z: 3, radio: 2.6 });
    api.interactuables.push({ id: "mision", clave: "instalar", texto: "Instalar la estación meteorológica", x: meta.x, z: meta.z, radio: 4.5 });
  }

  function construirEstacion() {
    const y = api.altura(meta.x, meta.z);
    const poste = cilindro(0.1, 0.14, 3, 0xdddddd, 6);
    poste.position.set(meta.x, y + 1.5, meta.z);
    const cajaInst = caja(0.7, 0.6, 0.5, 0xffd23f);
    cajaInst.position.set(meta.x, y + 1.3, meta.z + 0.3);
    const veleta = caja(1.6, 0.08, 0.2, 0xe5483b);
    veleta.position.set(meta.x, y + 3.1, meta.z);
    api.grupo.add(poste, cajaInst, veleta);
    return veleta;
  }
  let veleta = hecha ? construirEstacion() : null;

  return {
    get objetivo() {
      if (fase === "hecha") return null;
      return fase === "espera"
        ? "Saca la estación del cohete y llévala al punto marcado antes de que el calor la destruya."
        : "Lleva la estación al punto marcado. Cargándola no puedes correr. Busca el hueco entre la lava.";
    },
    get balizas() { return fase === "hecha" ? [] : [{ pos: sitio.pos, texto: "📡 Sitio de la estación" }]; },
    get medidor() {
      return fase === "llevando" ? { texto: `⏱ La estación aguanta ${Math.ceil(t)} s`, valor: t / LIMITE, alerta: t < 20 } : null;
    },
    actualizar(dt) {
      if (veleta) veleta.rotation.y += dt * 3;
      if (fase !== "llevando") return { dano: 0 };
      t -= dt;
      if (t > 0) return { dano: 0, sinCorrer: true };
      fase = "espera";
      api.grupo.add(cajon);
      return { dano: 0, aviso: "🔥 El calor derritió la estación. Queda otra de repuesto en el cohete." };
    },
    usar(clave) {
      if (clave === "sacar") {
        if (fase === "llevando") return { aviso: "Ya llevas la estación. Camina hasta el punto marcado." };
        fase = "llevando";
        t = LIMITE;
        quitar(api, cajon);
        return { aviso: `Llevas la estación. Tienes ${LIMITE} s antes de que el calor la destruya.` };
      }
      if (fase !== "llevando") return { aviso: "Primero saca la estación meteorológica del cohete.", error: true };
      fase = "hecha";
      hecha = true;
      quitarInteractuable(api, "sacar");
      quitarInteractuable(api, "instalar");
      quitar(api, sitio.aro, sitio.haz);
      veleta = construirEstacion();
      return { hecha: true, aviso: "📡 ¡Estación instalada! Ya transmite presión, viento y temperatura." };
    },
  };
}

// ===== Marte: limpiar y orientar los paneles solares de un rover abandonado =====
function marte(api, hecha) {
  const meta = { x: 60, z: 55 }, y = api.altura(meta.x, meta.z);
  const rover = new THREE.Group();
  rover.position.set(meta.x, y, meta.z);
  api.grupo.add(rover);
  const pon = (m, x, yy, z) => { m.position.set(x, yy, z); rover.add(m); return m; };
  pon(caja(2.4, 0.6, 1.6, 0xd8d8d8), 0, 0.9, 0);
  [-0.9, 0, 0.9].forEach(x => [-0.95, 0.95].forEach(z => { pon(cilindro(0.35, 0.35, 0.3, 0x333333, 10), x, 0.35, z).rotation.x = Math.PI / 2; }));
  pon(cilindro(0.06, 0.06, 1.4, 0x888888, 6), 0.9, 1.9, 0);
  const cabeza = pon(caja(0.5, 0.3, 0.3, 0xd8d8d8), 0.9, 2.65, 0);
  const luz = pon(esfera(0.12, 0x555555, 8, false), 1.16, 2.65, 0);
  // Panel: un pivote que gira de 45° en 45°
  const pivote = new THREE.Group();
  pivote.position.set(-0.3, 1.5, 0);
  rover.add(pivote);
  const POLVO = 0xb08a6a, LIMPIO = 0x2a5fb5;
  const panel = caja(2.4, 0.08, 1.5, hecha ? LIMPIO : POLVO);
  panel.rotation.z = -0.5; // inclinado hacia donde "mira" el pivote
  pivote.add(panel);
  api.colisiones.push({ minX: meta.x - 1.5, maxX: meta.x + 1.5, minZ: meta.z - 1.1, maxZ: meta.z + 1.1 });

  const SOL = Math.atan2(12, 14); // dirección horizontal del sol en la escena
  const ideal = Math.round(SOL / (Math.PI / 4));
  let giro = hecha ? ideal : (ideal + 3 + Math.floor(Math.random() * 3)) % 8;
  let limpiezas = hecha ? 3 : 0;
  const energia = () => Math.round(Math.max(0, Math.cos(giro * Math.PI / 4 - SOL)) * 100 * (limpiezas / 3));
  const aplicar = () => { pivote.rotation.y = -giro * Math.PI / 4; };
  aplicar();
  if (hecha) luz.material.color.set(0x6ee37a);

  const sitio = hecha ? null : marcarSitio(api, meta.x + 3, meta.z + 3, 0xffc94a);
  const boton = { id: "mision", clave: "rover", texto: "", x: meta.x, z: meta.z, radio: 4.2 };
  const rotular = () => {
    boton.texto = limpiezas < 3 ? `Limpiar el polvo del panel (${limpiezas}/3)` : `Girar el panel 45° · energía ${energia()} %`;
  };
  if (!hecha) { rotular(); api.interactuables.push(boton); }

  return {
    get objetivo() {
      if (hecha) return null;
      return limpiezas < 3
        ? "Encuentra el rover abandonado y limpia el polvo de su panel solar."
        : "Gira el panel hasta que apunte al Sol. Mira la sombra del rover para saber dónde está.";
    },
    get balizas() { return hecha ? [] : [{ pos: sitio.pos, texto: "🤖 Rover abandonado" }]; },
    get medidor() { return hecha ? null : { texto: `🔋 Energía del rover ${energia()} %`, valor: energia() / 100, alerta: energia() < 50 }; },
    actualizar(dt) {
      if (hecha) cabeza.rotation.y = Math.sin(performance.now() / 700) * 0.6; // el rover despierto mira a los lados
      return { dano: 0 };
    },
    usar() {
      if (limpiezas < 3) {
        limpiezas++;
        panel.material.color.lerpColors(new THREE.Color(POLVO), new THREE.Color(LIMPIO), limpiezas / 3);
        rotular();
        return { aviso: limpiezas < 3 ? `Quitaste polvo del panel (${limpiezas}/3).` : "Panel limpio. Ahora hay que orientarlo hacia el Sol." };
      }
      giro = (giro + 1) % 8;
      aplicar();
      rotular();
      if (energia() < 95) return { aviso: `Panel girado. Energía: ${energia()} %.` };
      hecha = true;
      luz.material.color.set(0x6ee37a);
      quitarInteractuable(api, "rover");
      quitar(api, sitio.aro, sitio.haz);
      return { hecha: true, aviso: "🤖 ¡El rover despertó! Con el panel limpio y de cara al Sol vuelve a tener energía." };
    },
  };
}

// ===== Ío: cruzar respiraderos que entran en erupción a intervalos y colocar un sismógrafo =====
function io(api, hecha) {
  const meta = { x: -80, z: 50 }, largo = Math.hypot(meta.x, meta.z);
  const u = { x: meta.x / largo, z: meta.z / largo }, p = { x: -u.z, z: u.x };
  const CICLO = 5, ACTIVO = 2, AVISO = 0.8, RADIO = 4.5;
  const filas = [30, 55, 78].map((d, i) => {
    const bocas = [];
    for (let k = -3; k <= 3; k++) {
      const x = u.x * d + p.x * k * 8, z = u.z * d + p.z * k * 8, y = api.altura(x, z);
      const boca = new THREE.Mesh(new THREE.SphereGeometry(RADIO, 12, 6), basico(0x5a2408, 0.9));
      boca.scale.y = 0.12;
      boca.position.set(x, y + 0.1, z);
      // Chorro de lava: partículas que suben y caen como una fuente
      const chorro = crearParticulas(55, { color: 0xffa020, tam: 0.9, aditivo: true, opacidad: 0.95 });
      const gotas = Array.from({ length: 55 }, () => [Math.random(), Math.random() * Math.PI * 2, Math.random()]);
      api.grupo.add(boca, chorro.puntos);
      bocas.push({ x, z, y, boca, chorro, gotas });
    }
    return { bocas, desfase: i * 1.7 };
  });

  const y = api.altura(meta.x, meta.z);
  const sitio = hecha ? null : marcarSitio(api, meta.x, meta.z, 0xff8a2a);
  if (!hecha) api.interactuables.push({ id: "mision", clave: "sismografo", texto: "Colocar el sismógrafo", x: meta.x, z: meta.z, radio: 4.5 });
  function construir() {
    [0, 2.1, 4.2].forEach(a => {
      const pata = cilindro(0.05, 0.05, 1.2, 0x888888, 5);
      pata.position.set(meta.x + Math.cos(a) * 0.35, y + 0.55, meta.z + Math.sin(a) * 0.35);
      pata.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      api.grupo.add(pata);
    });
    const cuerpo = caja(0.6, 0.4, 0.6, 0xff8a2a);
    cuerpo.position.set(meta.x, y + 1.25, meta.z);
    api.grupo.add(cuerpo);
  }
  if (hecha) construir();

  let t = 0;
  return {
    get objetivo() { return hecha ? null : "Cruza los respiraderos cuando se apaguen y coloca el sismógrafo junto al volcán."; },
    get balizas() { return hecha ? [] : [{ pos: sitio.pos, texto: "🌋 Punto de medición" }]; },
    medidor: null,
    actualizar(dt, pos) {
      t += dt;
      let dano = 0;
      for (const fila of filas) {
        const tt = (t + fila.desfase) % CICLO, activa = tt < ACTIVO, avisa = tt > CICLO - AVISO;
        for (const b of fila.bocas) {
          b.chorro.puntos.visible = activa;
          if (activa) {
            b.gotas.forEach((g, n) => {
              const f = (tt * 1.4 + g[0]) % 1, r = g[2] * RADIO * 0.8 * f;
              b.chorro.poner(n, b.x + Math.cos(g[1]) * r, b.y + 15 * Math.sin(f * Math.PI) * (0.6 + g[2] * 0.5), b.z + Math.sin(g[1]) * r);
            });
            b.chorro.listo();
          }
          b.boca.material.color.set(activa ? 0xffb02a : avisa ? 0xff6a1a : 0x5a2408); // se enciende antes de estallar
          if (activa && dentro(pos, b.x, b.z, RADIO)) dano = 60;
        }
      }
      return { dano, aviso: dano ? "🌋 ¡Estás dentro de una erupción! Sal de ahí." : null };
    },
    usar() {
      hecha = true;
      quitarInteractuable(api, "sismografo");
      quitar(api, sitio.aro, sitio.haz);
      construir();
      return { hecha: true, aviso: "🌋 ¡Sismógrafo colocado! Ya registra cada sacudida del volcán." };
    },
  };
}

// ===== Europa: plantar tres antenas y triangular el origen de la señal =====
function europa(api, hecha) {
  const origen = api.senal.position;
  const puntos = [2.6, 4.6, 0.1].map(a => ({ x: Math.cos(a) * 55, z: Math.sin(a) * 55 }));
  const sitios = [];
  let puestas = hecha ? 3 : 0;

  function plantar(pt) {
    const y = api.altura(pt.x, pt.z);
    const mastil = cilindro(0.08, 0.12, 3.4, 0xdddddd, 6);
    mastil.position.set(pt.x, y + 1.7, pt.z);
    const plato = cono(0.8, 0.5, 0x4de3ff, 10);
    plato.position.set(pt.x, y + 3.5, pt.z);
    plato.rotation.x = Math.PI;
    api.grupo.add(mastil, plato);
    // Rayo hacia el origen de la señal: donde se cruzan los tres está la fuente
    const dx = origen.x - pt.x, dz = origen.z - pt.z, d = Math.hypot(dx, dz) + 25;
    const rayo = new THREE.Mesh(new THREE.BoxGeometry(d, 0.12, 0.12), basico(0x4de3ff, 0.65));
    rayo.material.fog = false;
    rayo.position.set(pt.x + dx / 2 * (d / (d - 25)), y + 3.4, pt.z + dz / 2 * (d / (d - 25)));
    rayo.rotation.y = -Math.atan2(dz, dx);
    api.grupo.add(rayo);
  }

  puntos.forEach((pt, i) => {
    if (hecha) return plantar(pt);
    const sitio = marcarSitio(api, pt.x, pt.z, 0x4de3ff);
    sitios.push(sitio);
    api.interactuables.push({ id: "mision", clave: `antena${i}`, texto: "Plantar una antena", x: pt.x, z: pt.z, radio: 4.5, indice: i });
  });
  api.senal.visible = hecha;

  return {
    get objetivo() {
      if (hecha) return null;
      return puestas < 3
        ? `Planta las 3 antenas (${puestas}/3). Donde se crucen sus lecturas está el origen de la señal.`
        : "Las tres lecturas se cruzan en un punto. Camina hasta el origen de la señal 📡.";
    },
    get balizas() { return sitios.filter(s => !s.puesta).map(s => ({ pos: s.pos, texto: "📶 Sitio de antena" })); },
    medidor: null,
    actualizar() { return { dano: 0 }; },
    usar(clave) {
      const i = Number(clave.replace("antena", "")), sitio = sitios[i];
      sitio.puesta = true;
      quitarInteractuable(api, clave);
      quitar(api, sitio.aro, sitio.haz);
      plantar(puntos[i]);
      puestas++;
      if (puestas < 3) return { aviso: `📶 Antena ${puestas}/3 plantada. Su lectura apunta en una dirección; hacen falta más para saber la distancia.` };
      api.senal.visible = true;
      return { aviso: "📶 ¡Tres lecturas! Se cruzan en un punto: ahí está el origen de la señal 📡." };
    },
  };
}

const CREAR = { mercurio, venus, marte, jupiter: io, europa };

export function crearMision(dest, api, hecha) {
  return CREAR[dest](api, hecha);
}
