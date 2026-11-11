// Superficie de un planeta: un bioma por destino para explorar a pie.
// El relieve es siempre el mismo para cada planeta; los objetos cambian en cada viaje.
import * as THREE from "three";
import { caja, toon } from "./estilo.js";
import { crearCohete } from "./cohete.js";
import { crearPlaneta, crearObjeto } from "./espacio.js";
import { crearTerreno } from "./terreno.js";
import { fbm, ruido, paso, azarSemilla } from "./ruido.js";
import { DATOS_PLANETAS } from "./datos.js";
import { crearMision } from "./misiones.js";

const TAM = 440;
const RADIO_RECOGER = 2.4;

// Aspecto de cada bioma (valores visuales de ejemplo).
const BIOMAS = {
  mercurio: { semilla: 11, cielo: 0x05060d, niebla: null, suelo: [0x7d7265, 0xa79a8a, 0xc2b6a6], roca: 0x6b6258,
    luz: 2.6, ambiente: 0.9, estrellas: true, sol: 90, peligro: { nombre: "Roca al rojo vivo", color: 0xff7a2a } },
  venus: { semilla: 23, cielo: 0xd9a441, niebla: [0xd9a441, 18, 150], suelo: [0x5e3f22, 0x8a5a2b, 0xb07a45], roca: 0x4a321c,
    luz: 1.2, ambiente: 1.5, peligro: { nombre: "Charco de lava", color: 0xff4a1a } },
  marte: { semilla: 37, cielo: 0xe0a878, niebla: [0xe0a878, 70, 300], suelo: [0x9a3409, 0xc1440e, 0xdd6a35], roca: 0x7a2a08,
    luz: 1.9, ambiente: 1.3, sol: 22, peligro: { nombre: "Remolino de polvo", color: 0xf0d2a8 } },
  jupiter: { semilla: 51, cielo: 0x0a0a14, niebla: null, suelo: [0xa88f1c, 0xe0c93a, 0xf2e27a], roca: 0x7a6a14,
    luz: 1.8, ambiente: 1.2, estrellas: true, jupiter: 300, peligro: { nombre: "Lava de azufre", color: 0xff5a1a } },
  europa: { semilla: 67, cielo: 0x070b1f, niebla: null, suelo: [0xb4cfe0, 0xdcebf5, 0xffffff], roca: 0x9fbcd0,
    luz: 1.7, ambiente: 1.4, estrellas: true, jupiter: 190, peligro: { nombre: "Géiser helado", color: 0x8fe3f0 } },
};

// Devuelve la función de altura del bioma.
function crearRelieve(dest, azar) {
  const focos = Array.from({ length: 16 }, () => ({ x: (azar() - 0.5) * 300, z: (azar() - 0.5) * 300, r: 9 + azar() * 17 }))
    .filter(f => Math.hypot(f.x, f.z) > 34 + f.r);
  return (x, z) => {
    let h = 0;
    if (dest === "mercurio") {            // llanura de cráteres
      h = fbm(x * 0.03, z * 0.03) * 2.5;
      for (const f of focos) {
        const d = Math.hypot(x - f.x, z - f.z) / f.r;
        if (d < 1.7) h += -f.r * 0.22 * Math.max(0, 1 - d * d) + f.r * 0.12 * Math.exp(-(((d - 1) / 0.18) ** 2));
      }
    } else if (dest === "venus" || dest === "jupiter") { // conos volcánicos
      h = fbm(x * 0.02, z * 0.02) * 4;
      for (const f of focos) {
        const d = Math.hypot(x - f.x, z - f.z) / f.r;
        if (d < 1) h += f.r * 0.7 * (1 - d) - (d < 0.25 ? f.r * 0.35 * (1 - d / 0.25) : 0);
      }
    } else if (dest === "marte") {        // mesetas y llanuras de polvo
      h = fbm(x * 0.015, z * 0.015) * 3 + 11 * paso(0.5, 0.56, ruido(x * 0.018 + 3, z * 0.018 + 8));
    } else {                              // europa: hielo con crestas
      h = fbm(x * 0.025, z * 0.025) * 2 + 3.2 * Math.pow(1 - Math.abs(fbm(x * 0.05 + 4, z * 0.05, 2)), 6);
    }
    return h * paso(9, 30, Math.hypot(x, z)); // zona plana para aterrizar
  };
}

export function crearSuperficie() {
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1);
  const sol = new THREE.DirectionalLight(0xffffff, 2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 });
  sol.shadow.bias = -0.0005;
  scene.add(hemi, sol, sol.target);

  const mundo = new THREE.Group(); // todo lo que cambia de un planeta a otro
  scene.add(mundo);

  const colisiones = [], interactuables = [];
  let altura = () => 0, objetos = [], zonas = [], piezas = [], senal = null, bioma = BIOMAS.mercurio, t = 0;
  let cohete = null, baseCohete = 0, gravedad = 1, mision = null;
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), new THREE.MeshBasicMaterial({ color: 0xffa726 }));
  llama.rotation.x = Math.PI; // punta hacia abajo

  function iniciar(dest, mejoras, campo, misionHecha) {
    mundo.clear();
    colisiones.length = 0;
    interactuables.length = 0;
    bioma = BIOMAS[dest];
    gravedad = DATOS_PLANETAS[dest].gravedad;
    piezas = [];
    const azar = azarSemilla(bioma.semilla);

    scene.background = new THREE.Color(bioma.cielo);
    scene.fog = bioma.niebla ? new THREE.Fog(...bioma.niebla) : new THREE.Fog(bioma.cielo, 160, 420);
    hemi.intensity = bioma.ambiente;
    sol.intensity = bioma.luz;

    // ----- Terreno -----
    const relieve = crearRelieve(dest, azar);
    const cs = bioma.suelo;
    const terreno = crearTerreno({
      tam: TAM, seg: 110, altura: relieve,
      color: (x, z, h, pend, c) => c.set(pend > 0.8 ? bioma.roca : cs[Math.min(2, Math.floor(ruido(x * 0.05, z * 0.05) * 3))]),
    });
    mundo.add(terreno.mesh);
    altura = terreno.altura;
    const lejos = new THREE.Mesh(new THREE.CircleGeometry(1600, 24), toon(cs[1]));
    lejos.rotation.x = -Math.PI / 2;
    lejos.position.y = -3;
    mundo.add(lejos);

    // ----- Cielo -----
    if (bioma.estrellas) {
      const pos = new Float32Array(1200 * 3);
      for (let i = 0; i < 1200; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(1400);
        v.y = Math.abs(v.y) + 20;
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      mundo.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false })));
    }
    if (bioma.sol) {
      const disco = new THREE.Mesh(new THREE.SphereGeometry(bioma.sol, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
      disco.position.set(420, 520, 360);
      mundo.add(disco);
    }
    if (bioma.jupiter) {
      const j = crearPlaneta("jupiter", bioma.jupiter);
      j.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } });
      j.position.set(-380, 330, -820);
      mundo.add(j);
    }

    // ----- Rocas de adorno -----
    for (let i = 0; i < 55; i++) {
      const a = azar() * Math.PI * 2, r = 14 + azar() * 170, s = 0.6 + azar() * 2.4;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const roca = caja(s * (0.8 + azar()), s, s * (0.8 + azar()), i % 3 ? bioma.roca : cs[0]);
      roca.position.set(x, altura(x, z) + s * 0.3, z);
      roca.rotation.set(azar() - 0.5, azar() * 3, azar() - 0.5);
      mundo.add(roca);
      if (s > 1.6) colisiones.push({ minX: x - s * 0.6, maxX: x + s * 0.6, minZ: z - s * 0.6, maxZ: z + s * 0.6 });
    }

    // ----- Zonas peligrosas: dañan el traje -----
    zonas = [];
    const ponerZona = (x, z, radio) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(radio, 14, 8),
        new THREE.MeshBasicMaterial({ color: bioma.peligro.color, transparent: true, opacity: 0.8 }));
      m.scale.y = 0.16;
      m.position.set(x, altura(x, z) + 0.1, z);
      mundo.add(m);
      zonas.push({ x, z, radio, mesh: m, fase: azar() * 6 });
    };
    for (let i = 0; i < 11; i++) {
      const a = azar() * Math.PI * 2, r = 24 + azar() * 130;
      ponerZona(Math.cos(a) * r, Math.sin(a) * r, 4 + azar() * 3.5);
    }

    // ----- Cohete aterrizado en el centro -----
    cohete = crearCohete(mejoras);
    const largo = cohete.userData.largo;
    baseCohete = largo / 2 + 0.95;
    cohete.position.set(0, baseCohete, 0);
    for (let i = 0; i < 3; i++) { // patas de aterrizaje
      const giro = new THREE.Group();
      giro.rotation.y = i * Math.PI * 2 / 3;
      const pata = caja(0.16, 1.5, 0.16, 0x555555);
      pata.position.set(1.15, -largo / 2 - 0.3, 0);
      pata.rotation.z = 0.6;
      giro.add(pata);
      cohete.add(giro);
    }
    llama.position.y = -(largo / 2 + 0.6 + 1.2);
    llama.visible = false;
    cohete.add(llama);
    mundo.add(cohete);
    colisiones.push({ minX: -1.6, maxX: 1.6, minZ: -1.6, maxZ: 1.6 });
    interactuables.push({ id: "despegar", texto: "Despegar de regreso al granero", x: 0, z: 0, radio: 6 });

    // ----- Objetos: los más valiosos quedan más lejos del cohete -----
    objetos = campo.map((dato, i) => {
      const a = Math.random() * Math.PI * 2, r = 16 + i * 9 + Math.random() * 7;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = altura(x, z);
      const mesh = crearObjeto(dato);
      mesh.scale.setScalar(0.5);
      mesh.position.set(x, y + 1.1, z);
      mundo.add(mesh);
      // Haz de luz para verlo desde lejos
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 14, 6),
        new THREE.MeshBasicMaterial({ color: dato.color, transparent: true, opacity: 0.35, fog: false }));
      haz.position.set(x, y + 8, z);
      mundo.add(haz);
      return { dato, mesh, haz };
    });

    // ----- Europa: el origen de la señal, lejos del cohete -----
    senal = null;
    if (dest === "europa") {
      const a = 0.9, r = 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
      senal = new THREE.Group();
      senal.position.set(x, altura(x, z) + 1.5, z);
      const mat = new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true, opacity: 0.85, fog: false });
      senal.add(new THREE.Mesh(new THREE.OctahedronGeometry(1), mat));
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 60, 8), new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true, opacity: 0.3, fog: false }));
      haz.position.y = 30;
      senal.add(haz);
      for (let i = 0; i < 3; i++) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), mat.clone());
        aro.rotation.x = Math.PI / 2;
        aro.userData.fase = i / 3;
        senal.add(aro);
      }
      mundo.add(senal);
    }

    // ----- Misión del lugar (y su mecánica propia) -----
    mision = crearMision(dest, { grupo: mundo, altura, colisiones, interactuables, azar, ponerZona, senal }, misionHecha);
  }

  // Durante el descenso: coloca el cohete a `h` metros del suelo, con la llama encendida o no.
  function moverCohete(h, conLlama) {
    cohete.position.y = baseCohete + Math.max(0, h);
    llama.visible = conLlama;
    llama.scale.set(1, 0.7 + Math.random() * 0.6, 1);
    return cohete.position.y;
  }

  // Un aterrizaje muy duro deja el cohete torcido hasta que se repara.
  function inclinar(si) { cohete.rotation.z = si ? 0.14 : 0; }

  // Reparte `n` piezas de repuesto cerca del cohete.
  function ponerPiezas(n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 24;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = altura(x, z);
      const mesh = new THREE.Group();
      mesh.add(caja(0.8, 0.5, 0.5, 0xff8a2a));
      const asa = caja(0.4, 0.12, 0.12, 0x333333);
      asa.position.y = 0.34;
      mesh.add(asa);
      mesh.position.set(x, y + 0.9, z);
      mundo.add(mesh);
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 16, 6),
        new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.45, fog: false }));
      haz.position.set(x, y + 9, z);
      mundo.add(haz);
      piezas.push({ pieza: true, mesh, haz });
    }
  }

  // Devuelve lo recogido en este paso y si el jugador pisa una zona peligrosa.
  function actualizar(dt, pos) {
    t += dt;
    sol.position.set(pos.x + 14, pos.y + 22, pos.z + 12);
    sol.target.position.set(pos.x, pos.y - 1.7, pos.z);

    const recogidos = [];
    objetos = objetos.filter(o => {
      o.mesh.rotation.y += dt * 1.2;
      if (Math.hypot(o.mesh.position.x - pos.x, o.mesh.position.z - pos.z) < RADIO_RECOGER) {
        mundo.remove(o.mesh, o.haz);
        recogidos.push(o.dato);
        return false;
      }
      return true;
    });

    let piezasRecogidas = 0;
    piezas = piezas.filter(o => {
      o.mesh.rotation.y += dt * 1.5;
      if (Math.hypot(o.mesh.position.x - pos.x, o.mesh.position.z - pos.z) < RADIO_RECOGER) {
        mundo.remove(o.mesh, o.haz);
        piezasRecogidas++;
        return false;
      }
      return true;
    });

    let enPeligro = false;
    for (const z of zonas) {
      z.mesh.material.opacity = 0.6 + 0.3 * Math.sin(t * 3 + z.fase);
      if (Math.hypot(z.x - pos.x, z.z - pos.z) < z.radio) enPeligro = true;
    }

    let enSenal = false;
    if (senal) {
      senal.children[0].rotation.y += dt * 1.5;
      senal.children.slice(2).forEach(aro => {
        const f = (t * 0.5 + aro.userData.fase) % 1;
        aro.scale.setScalar(1 + f * 9);
        aro.material.opacity = 0.9 * (1 - f);
      });
      enSenal = senal.visible && Math.hypot(senal.position.x - pos.x, senal.position.z - pos.z) < 5;
    }

    return { recogidos, piezasRecogidas, enPeligro, enSenal, nombrePeligro: bioma.peligro.nombre, mision: mision.actualizar(dt, pos) };
  }

  return {
    scene, colisiones, interactuables, iniciar, actualizar, moverCohete, inclinar, ponerPiezas, limite: TAM / 2 - 22,
    get gravedad() { return gravedad; },
    get piezas() { return piezas; },
    get mision() { return mision; },
    altura: (x, z) => altura(x, z),
    get objetos() { return objetos; },
    get senal() { return senal; },
  };
}
