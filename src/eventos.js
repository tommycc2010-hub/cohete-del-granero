// Eventos aleatorios: imprevistos del viaje con base científica.
// En el espacio: sonda perdida, cometa, fuga de combustible, tormenta de partículas, giroscopio averiado y el eco de Europa.
// En la superficie: caída de un meteorito y sismo.
// El módulo no toca el estado directamente: todo pasa por `api`, que le da main.js.
import * as THREE from "three";
import { DATOS_PLANETAS } from "./datos.js";
import { crearParticulas, texturaSuave } from "./particulas.js";
import { colorPolvo } from "./ambiente.js";

const azar = (a, b) => a + Math.random() * (b - a);
function elegir(pesos) {
  const lista = Object.entries(pesos).filter(([, p]) => p > 0);
  let r = Math.random() * lista.reduce((s, [, p]) => s + p, 0);
  for (const [id, p] of lista) if ((r -= p) <= 0) return id;
  return lista.length ? lista[lista.length - 1][0] : null;
}
// Valor de un objeto según el destino (igual que los objetos normales: más peligro, más valor)
const valorEn = (dest, base) => Math.round(base * (0.5 + DATOS_PLANETAS[dest].peligro));

// ===================================================================================
// Espacio
// api: { aviso, radio, sonido, alerta(texto|null), gastarSobrante(c) → gastado, recolectar(dato),
//        nuevosMarcadores(), sensores(bool), estado, teclas, nombre }
// ===================================================================================
export function crearEventosEspacio(espacio, api) {
  const grupo = new THREE.Group();
  espacio.scene.add(grupo);
  let ev = null; // evento en curso: { id, t, ... }
  let pendiente = null, espera = 0;

  function limpiar() {
    grupo.clear();
    if (ev && ev.id === "tormenta") api.sensores(true);
    ev = null;
    pendiente = null;
    api.alerta(null);
  }

  // Al llegar al espacio se decide si habrá un evento en este viaje, cuál, y en cuántos segundos.
  function iniciar(dest, conLluvia) {
    limpiar();
    if (Math.random() > (conLluvia ? 0.45 : 0.8)) return;
    const e = api.estado;
    pendiente = elegir({
      sonda: 1, cometa: 1, fuga: 1, tormenta: 1, giroscopio: 0.8,
      eco: e.misiones.marte && !e.final && dest !== "europa" ? 0.8 : 0,
    });
    espera = pendiente === "sonda" ? 1.5 : azar(2, 4); // la sonda se ve desde el principio: hay que decidir si desviarse
    ev = null;
    if (pendiente) empezar(pendiente, dest);
  }

  function empezar(id, dest) {
    if (!espacio.pista) return;
    const pista = espacio.pista.position;
    ev = { id, t: 0, dest, activo: false };
    if (id === "sonda") {
      // A un lado de la ruta: desviarse cuesta combustible, pero la sonda vale mucho.
      const lado = new THREE.Vector3().crossVectors(pista.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize();
      if (Math.random() < 0.5) lado.negate();
      const pos = pista.clone().multiplyScalar(azar(0.35, 0.55)).addScaledVector(lado, azar(40, 55)).add(new THREE.Vector3(0, azar(-10, 10), 0));
      ev.objeto = espacio.agregarObjeto({ nombre: "Sonda perdida", valor: valorEn(dest, azar(260, 400)), color: "#ffd23f" }, pos);
      api.nuevosMarcadores();
    } else if (id === "cometa") {
      // La cola apunta siempre lejos del Sol. Se coloca para que cruce la ruta hacia la zona de aterrizaje.
      const anti = espacio.dirSol.clone().negate();
      const cruce = pista.clone().multiplyScalar(azar(0.3, 0.5));
      const nucleo = cruce.clone().addScaledVector(anti, -40);
      const lateral = new THREE.Vector3().crossVectors(anti, new THREE.Vector3(0, 1, 0)).normalize();
      const nucleoMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshToonMaterial({ color: 0x8a8f99 }));
      const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSuave(), color: 0xbfe9ff, transparent: true,
        opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      coma.scale.setScalar(16);
      const cola = crearParticulas(220, { color: 0xa8e4ff, tam: 2.6, aditivo: true, opacidad: 0.55 });
      const polvo = crearParticulas(90, { color: 0xffe2a8, tam: 2, aditivo: true, opacidad: 0.4 });
      const semillas = Array.from({ length: 220 }, () => ({ f: Math.random(), a: Math.random() * 6.28, r: Math.random(), v: azar(0.08, 0.2) }));
      grupo.add(nucleoMesh, coma, cola.puntos, polvo.puntos);
      Object.assign(ev, { nucleo, anti, lateral, nucleoMesh, coma, cola, polvo, semillas, largo: 90, atrapados: 0, esperaHielo: 0 });
    }
  }

  // Distancia de un punto a la cola del cometa, y su radio en ese tramo
  function dentroDeCola(p) {
    const rel = p.clone().sub(ev.nucleo);
    const a = rel.dot(ev.anti);
    if (a < 0 || a > ev.largo) return false;
    const radio = 3 + (a / ev.largo) * 14;
    return rel.addScaledVector(ev.anti, -a).length() < radio;
  }

  function anunciar() {
    const { id, dest } = ev, N = api.nombre;
    api.sonido(id === "eco" ? "eco" : "alarma");
    if (id === "sonda") {
      api.aviso("🛰️ El radar detecta una sonda vieja a la deriva, fuera de la ruta.");
      api.radio(`📻 ${N}: ¡Una sonda perdida! Desviarte gasta combustible, pero sus datos valen una fortuna. Hay naves de los años 70 que siguen viajando: las Voyager aún mandan señales desde fuera del sistema solar.`);
    } else if (id === "cometa") {
      api.aviso("🌠 ¡Un cometa cruza la ruta! Atraviesa su cola para atrapar hielo.");
      api.radio(`📻 ${N}: La cola de un cometa apunta siempre lejos del Sol, no hacia atrás: la empuja el viento solar. Es hielo y polvo que se evapora con el calor.`);
    } else if (id === "fuga") {
      ev.activo = true; ev.sellado = 0; ev.perdido = 0;
      api.aviso("⛽ ¡Fuga de combustible! Mantén pulsada E para sellarla.");
      api.radio(`📻 ${N}: En 2018 la Estación Espacial perdía aire por un agujero de 2 mm. Los astronautas lo encontraron y lo taparon con sellador. Tú puedes hacer lo mismo: mantén E.`);
    } else if (id === "tormenta") {
      ev.activo = true; ev.dur = 9;
      const dir = new THREE.Vector3().randomDirection(); dir.y *= 0.3;
      ev.empuje = dir.normalize();
      ev.rayas = crearParticulas(120, { color: 0xffd9a0, tam: 1.3, aditivo: true, opacidad: 0.9 });
      ev.semillas = Array.from({ length: 120 }, () => new THREE.Vector3(azar(-30, 30), azar(-20, 20), azar(-40, 10)));
      grupo.add(ev.rayas.puntos);
      api.sensores(false);
      api.aviso("☀️ ¡Tormenta de partículas solares! Los sensores entran en modo seguro.");
      api.radio(`📻 ${N}: Cuando llega una tormenta solar, las sondas reales apagan sus instrumentos para protegerlos: se llama modo seguro. Aguanta unos segundos.`);
    } else if (id === "giroscopio") {
      ev.activo = true; ev.dur = 7; ev.fase = Math.random() * 6;
      api.aviso("🧭 ¡Falla un giroscopio! La nave gira sola: corrige el rumbo a mano.");
      api.radio(`📻 ${N}: Los giroscopios mantienen la orientación. El telescopio Hubble tenía seis y desde 2024 trabaja con uno solo. Tú tienes manos: corrige.`);
    } else if (id === "eco") {
      api.aviso("📡 La antena capta un pulso débil y regular…");
      api.radio(`📻 ${N}: ¿Lo oyes? Es el mismo pulso que capté hace treinta años. Viene de la dirección de Júpiter… Cuando llegues a Europa, escucha con atención.`);
    }
  }

  function actualizar(dt) {
    if (!ev) return;
    ev.t += dt;
    if (!ev.anunciado && ev.t >= espera) { ev.anunciado = true; anunciar(); }
    const nave = espacio.nave.position;

    if (ev.id === "cometa") {
      ev.nucleo.addScaledVector(ev.lateral, dt * 1.2); // el cometa avanza despacio
      ev.nucleoMesh.position.copy(ev.nucleo);
      ev.nucleoMesh.rotation.y += dt * 0.3;
      ev.coma.position.copy(ev.nucleo);
      const brillo = Math.min(1, ev.t / 1.5);
      ev.cola.puntos.material.opacity = 0.55 * brillo;
      for (let i = 0; i < ev.semillas.length; i++) {
        const s = ev.semillas[i];
        s.f = (s.f + dt * s.v) % 1;
        const a = s.f * ev.largo, r = (1 + s.f * 13) * s.r;
        const x = ev.nucleo.x + ev.anti.x * a, y = ev.nucleo.y + ev.anti.y * a, z = ev.nucleo.z + ev.anti.z * a;
        const ca = Math.cos(s.a + s.f * 2) * r, sa = Math.sin(s.a + s.f * 2) * r;
        ev.cola.poner(i, x + ev.lateral.x * ca, y + sa, z + ev.lateral.z * ca);
        if (i < 90) ev.polvo.poner(i, x + ev.lateral.x * (ca + a * 0.15), y + sa * 0.6 - a * 0.05, z + ev.lateral.z * (ca + a * 0.15)); // la cola de polvo se curva
      }
      ev.cola.listo(); ev.polvo.listo();
      ev.esperaHielo -= dt;
      if (ev.anunciado && ev.atrapados < 3 && ev.esperaHielo <= 0 && dentroDeCola(nave)) {
        ev.esperaHielo = 1;
        ev.atrapados++;
        api.recolectar({ nombre: "Hielo", valor: valorEn(ev.dest, 80), color: "#8fe3f0" });
        api.logro("cometa");
        api.aviso(`🌠 El colector atrapó hielo del cometa (${ev.atrapados}/3).`);
      }
    } else if (ev.id === "fuga" && ev.activo) {
      ev.perdido += api.gastarSobrante(1.6 * dt);
      const k = api.teclas;
      ev.sellado = k.KeyE ? ev.sellado + dt / 2.2 : Math.max(0, ev.sellado - dt * 0.3);
      espacio.sacudir(0.04);
      if (ev.sellado >= 1) {
        ev.activo = false;
        api.sonido("comprar");
        api.logro("fuga");
        api.alerta(null);
        api.aviso(`🧯 ¡Fuga sellada! Perdiste ${ev.perdido.toFixed(0)} de combustible.`);
      } else {
        const n = Math.round(ev.sellado * 10);
        api.alerta(`⛽ Fuga de combustible · mantén E para sellar ${"▮".repeat(n)}${"▯".repeat(10 - n)}`);
      }
    } else if (ev.id === "tormenta" && ev.activo) {
      ev.dur -= dt;
      espacio.empujar(ev.empuje.clone().multiplyScalar(2.2 * dt));
      const cam = espacio.camera;
      for (let i = 0; i < ev.semillas.length; i++) { // rayas de partículas que cruzan delante de la cámara
        const s = ev.semillas[i];
        s.addScaledVector(ev.empuje, -dt * 60);
        if (s.length() > 45) s.set(azar(-30, 30), azar(-20, 20), azar(-40, 10)).addScaledVector(ev.empuje, 30);
        const w = s.clone().applyQuaternion(cam.quaternion).add(cam.position);
        ev.rayas.poner(i, w.x, w.y, w.z);
      }
      ev.rayas.listo();
      api.alerta(`☀️ Tormenta solar · sensores en modo seguro (${Math.ceil(ev.dur)} s)`);
      if (ev.dur <= 0) {
        ev.activo = false;
        grupo.remove(ev.rayas.puntos);
        api.sensores(true);
        api.alerta(null);
        api.aviso("☀️ La tormenta pasó. Sensores en línea.");
      }
    } else if (ev.id === "giroscopio" && ev.activo) {
      ev.dur -= dt;
      const f = ev.fase + ev.t;
      espacio.girar((Math.sin(f * 1.3) * 0.45 + 0.3) * dt, Math.sin(f * 0.9) * 0.3 * dt);
      api.alerta(`🧭 Giroscopio averiado · corrige el rumbo (${Math.ceil(ev.dur)} s)`);
      if (ev.dur <= 0) {
        ev.activo = false;
        api.alerta(null);
        api.aviso("🧭 Giroscopio de repuesto en marcha. Rumbo estable.");
      }
    }
  }

  return {
    iniciar, actualizar, limpiar,
    get actual() { return ev && ev.id; },
    forzar(id, dest) { limpiar(); espera = 0.2; empezar(id, dest); }, // para probar
  };
}

// ===================================================================================
// Superficie
// api: { aviso, radio, sonido, nuevosMarcadores(), sacudir(s), nombre }
// ===================================================================================
const SISMO = {
  mercurio: "Mercurio se encoge poco a poco al enfriarse su núcleo, y eso levanta acantilados enormes. Por eso podría temblar.",
  venus: "Nadie ha medido todavía un sismo en Venus. Si esto fuera real, sería un descubrimiento.",
  marte: "Es un martemoto. La sonda InSight registró más de 1300 entre 2018 y 2022.",
  jupiter: "La gravedad de Júpiter estira y aprieta a Ío. Ese roce la calienta por dentro y la hace temblar.",
  europa: "Las mareas de Júpiter también estiran a Europa y agrietan su hielo.",
};
const METEORITO = {
  mercurio: "Mercurio casi no tiene atmósfera: los meteoritos no se frenan ni se queman. Por eso está lleno de cráteres.",
  marte: "La atmósfera de Marte es muy fina. InSight llegó a sentir el golpe de cuatro meteoritos.",
  jupiter: "Ío no tiene casi atmósfera, así que las rocas llegan enteras al suelo.",
  europa: "En Europa, sin aire que lo frene, el meteorito llega entero al hielo.",
};

export function crearEventosSuelo(superficie, api) {
  let ev = null;

  function limpiar() {
    if (ev && ev.roca) superficie.quitar(ev.roca);
    ev = null;
  }

  function iniciar(dest, hayTormenta) {
    limpiar();
    if (hayTormenta || Math.random() > 0.6) return;
    const id = elegir({ meteorito: dest === "venus" ? 0 : 1.2, sismo: 1 }); // en Venus la atmósfera espesa frena las rocas pequeñas
    ev = { id, dest, t: -azar(18, 40), fase: "espera" };
  }

  // El impacto cae delante del jugador, a una distancia segura
  function puntoCerca(pos, dir, min, max) {
    for (let n = 0; n < 12; n++) {
      const a = Math.atan2(dir.x, dir.z) + azar(-0.8, 0.8), r = azar(min, max);
      const x = pos.x + Math.sin(a) * r, z = pos.z + Math.cos(a) * r;
      if (Math.abs(x) < superficie.limite && Math.abs(z) < superficie.limite && Math.hypot(x, z) > 9) return { x, z };
    }
    return { x: pos.x + min, z: pos.z };
  }

  function actualizar(dt, pos, dir) {
    if (!ev) return;
    ev.t += dt;
    const N = api.nombre;
    if (ev.id === "meteorito") {
      if (ev.fase === "espera" && ev.t >= 0) {
        const p = puntoCerca(pos, dir, 18, 30);
        const y = superficie.altura(p.x, p.z);
        ev.fin = new THREE.Vector3(p.x, y, p.z);
        // Entra en diagonal desde más allá del punto de impacto, para que se vea cruzar el cielo
        const lejos = new THREE.Vector3(p.x - pos.x, 0, p.z - pos.z).normalize();
        const lado = new THREE.Vector3(-lejos.z, 0, lejos.x).multiplyScalar(azar(-35, 35));
        ev.inicio = ev.fin.clone().addScaledVector(lejos, azar(50, 70)).add(lado).add(new THREE.Vector3(0, 55, 0));
        ev.roca = new THREE.Group();
        const bola = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
        const fuego = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSuave(), color: 0xff8a3a, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        fuego.scale.setScalar(9);
        ev.estela = crearParticulas(60, { color: 0xffb36b, tam: 2.2, aditivo: true, opacidad: 0.8 });
        ev.rastro = [];
        ev.roca.add(bola, fuego);
        superficie.agregar(ev.roca);
        superficie.agregar(ev.estela.puntos);
        ev.fase = "cae";
        ev.t = 0;
        api.sonido("alarma");
        api.aviso("☄️ ¡Mira al cielo! Algo cae muy cerca…");
      } else if (ev.fase === "cae") {
        const k = Math.min(1, ev.t / 2.6);
        ev.roca.position.lerpVectors(ev.inicio, ev.fin, k * k);
        ev.rastro.unshift(ev.roca.position.clone());
        if (ev.rastro.length > 60) ev.rastro.pop();
        ev.rastro.forEach((p, i) => ev.estela.poner(i, p.x + azar(-0.4, 0.4), p.y + azar(-0.4, 0.4), p.z + azar(-0.4, 0.4)));
        ev.estela.listo();
        if (k >= 1) {
          const { x, y, z } = ev.fin;
          superficie.quitar(ev.roca);
          superficie.quitar(ev.estela.puntos);
          ev.roca = null;
          superficie.rafaga(x, y + 0.5, z, { color: 0xffa040, n: 50, vel: 9, duracion: 1.2, tam: 1.1 });
          superficie.rafaga(x, y + 0.3, z, { color: colorPolvo(ev.dest), n: 40, vel: 5, duracion: 2.2, tam: 1.6, gravedad: -1, aditivo: false });
          const crater = new THREE.Mesh(new THREE.RingGeometry(1.6, 3.4, 24), new THREE.MeshBasicMaterial({ color: 0x1d1612, transparent: true, opacity: 0.55, depthWrite: false }));
          crater.rotation.x = -Math.PI / 2;
          crater.position.set(x, y + 0.06, z);
          superficie.agregar(crater);
          superficie.agregarObjeto({ nombre: "Meteorito", valor: valorEn(ev.dest, azar(220, 340)), color: "#ff7a3a" }, x, z);
          api.nuevosMarcadores();
          api.sonido("impacto");
          api.sacudir(Math.max(0.05, 0.6 - pos.distanceTo(ev.fin) / 60));
          api.radio(`📻 ${N}: ¡Un meteorito recién caído! ${METEORITO[ev.dest]} Recógelo: es material de los orígenes del sistema solar.`);
          ev = null;
        }
      }
    } else if (ev.id === "sismo") {
      if (ev.fase === "espera" && ev.t >= 0) {
        ev.fase = "tiembla";
        ev.t = 0;
        api.sonido("temblor");
        api.aviso("🌋 ¡El suelo tiembla!");
      } else if (ev.fase === "tiembla") {
        api.sacudir(0.16 * Math.max(0, 1 - ev.t / 4));
        if (ev.t > 4) {
          const p = puntoCerca(pos, dir, 10, 16);
          superficie.agregarObjeto({ nombre: "Mineral raro", valor: valorEn(ev.dest, 200), color: "#ffc94a" }, p.x, p.z);
          superficie.rafaga(p.x, superficie.altura(p.x, p.z) + 0.3, p.z, { color: colorPolvo(ev.dest), n: 30, vel: 3, duracion: 1.5, tam: 1.2, gravedad: -1, aditivo: false });
          api.nuevosMarcadores();
          api.radio(`📻 ${N}: ${SISMO[ev.dest]} Mira: el temblor dejó al descubierto un mineral.`);
          ev = null;
        }
      }
    }
  }

  return {
    iniciar, actualizar, limpiar,
    get actual() { return ev && ev.id; },
    forzar(id, dest) { limpiar(); ev = { id, dest, t: -0.2, fase: "espera" }; }, // para probar
  };
}
