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
import { crearAmbiente, colorPolvo } from "./ambiente.js";
import { crearRafaga } from "./particulas.js";
import { crearLava, avanzarLava, tieneLava } from "./lava.js";

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

// Cielo de cada lugar: cenit, horizonte (igual a la niebla, para que el suelo lejano se funda con él),
// color del halo alrededor del Sol y su fuerza. En Marte el halo es azulado: allí los atardeceres son azules.
const CIELOS = {
  mercurio: { cenit: 0x010208, horizonte: 0x0b0e1c, halo: 0xfff1c9, fuerza: 1.1 },
  venus: { cenit: 0x8a5418, horizonte: 0xd9a441, halo: 0xffe7a8, fuerza: 0.45 },
  marte: { cenit: 0x9c5a3c, horizonte: 0xe0a878, halo: 0xa9cfff, fuerza: 0.9 },
  jupiter: { cenit: 0x010106, horizonte: 0x16121f, halo: 0xfff4d6, fuerza: 0.6 },
  europa: { cenit: 0x01030d, horizonte: 0x0f1938, halo: 0xe6f2ff, fuerza: 0.6 },
};
const DIR_SOL = new THREE.Vector3(420, 520, 360).normalize();

function crearCieloDomo() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cenit: { value: new THREE.Color() }, horizonte: { value: new THREE.Color() },
      halo: { value: new THREE.Color() }, fuerza: { value: 1 }, dirSol: { value: DIR_SOL },
    },
    vertexShader: `varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 cenit, horizonte, halo; uniform float fuerza; uniform vec3 dirSol; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = mix(horizonte, cenit, pow(clamp(d.y, 0.0, 1.0), 0.5));
        float s = max(dot(d, dirSol), 0.0);
        c += halo * fuerza * (pow(s, 6.0) * 0.28 + pow(s, 40.0) * 0.5 + pow(s, 400.0) * 1.2);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const domo = new THREE.Mesh(new THREE.SphereGeometry(1700, 32, 16), material);
  domo.renderOrder = -1;
  domo.frustumCulled = false;
  domo.userData.fijo = true; // no se libera al cambiar de planeta
  return domo;
}

// Roca low-poly: un icosaedro deformado, sombreado plano y con contorno negro.
const matBorde = new THREE.MeshBasicMaterial({ color: 0x1d1d1d, side: THREE.BackSide });
const matRocas = new Map();
function crearRoca(s, color, azar) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const p = geo.attributes.position, factor = new Map();
  for (let i = 0; i < p.count; i++) { // el mismo vértice comparte deformación en todas sus caras
    const k = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
    if (!factor.has(k)) factor.set(k, 0.7 + azar() * 0.55);
    const f = factor.get(k);
    p.setXYZ(i, p.getX(i) * f, Math.max(-0.35, p.getY(i)) * f * 0.75, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  if (!matRocas.has(color)) { const m = toon(color, "roca"); m.flatShading = true; matRocas.set(color, m); }
  const roca = new THREE.Mesh(geo, matRocas.get(color));
  roca.castShadow = roca.receiveShadow = true;
  const borde = new THREE.Mesh(geo, matBorde);
  borde.scale.setScalar(1.07);
  roca.add(borde);
  roca.scale.set(s * (0.8 + azar() * 0.6), s, s * (0.8 + azar() * 0.6));
  return roca;
}

// Libera la memoria de la GPU de lo que se quita del mundo: cada viaje crea un planeta nuevo.
// (Si algo compartido se libera, three.js lo vuelve a subir a la GPU la próxima vez que se dibuje.)
function liberar(grupo) {
  grupo.traverse(o => {
    if (o.userData.fijo) return;
    if (o.geometry) o.geometry.dispose();
  });
}

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

  const domo = crearCieloDomo(); // se vuelve a añadir al mundo en cada viaje
  const mundo = new THREE.Group(); // todo lo que cambia de un planeta a otro
  scene.add(mundo);

  const colisiones = [], interactuables = [];
  let altura = () => 0, objetos = [], zonas = [], piezas = [], senal = null, bioma = BIOMAS.mercurio, t = 0;
  let cohete = null, baseCohete = 0, gravedad = 1, mision = null, ambiente = null, destino = "mercurio";
  let rafagas = [];
  let patas = [], volando = [], tPolvo = 0, golpePolvo = 0;
  // Nube de polvo bajo el cohete al aterrizar
  const polvo = [];
  for (let i = 0; i < 16; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    p.userData = { ang: i / 16 * Math.PI * 2 + Math.random() * 0.3, fase: Math.random() };
    p.visible = false;
    polvo.push(p);
  }
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), new THREE.MeshBasicMaterial({ color: 0xffa726 }));
  llama.rotation.x = Math.PI; // punta hacia abajo

  function iniciar(dest, mejoras, campo, misionHecha) {
    liberar(mundo);
    mundo.clear();
    patas = [];
    volando = [];
    golpePolvo = 0;
    colisiones.length = 0;
    interactuables.length = 0;
    bioma = BIOMAS[dest];
    destino = dest;
    rafagas = [];
    gravedad = DATOS_PLANETAS[dest].gravedad;
    piezas = [];
    const azar = azarSemilla(bioma.semilla);

    const cielo = CIELOS[dest];
    scene.background = new THREE.Color(cielo.horizonte);
    scene.fog = bioma.niebla ? new THREE.Fog(...bioma.niebla) : new THREE.Fog(cielo.horizonte, 170, 460);
    domo.material.uniforms.cenit.value.set(cielo.cenit);
    domo.material.uniforms.horizonte.value.copy(scene.fog.color);
    domo.material.uniforms.halo.value.set(cielo.halo);
    domo.material.uniforms.fuerza.value = cielo.fuerza;
    hemi.intensity = bioma.ambiente;
    sol.intensity = bioma.luz;

    // ----- Terreno -----
    const relieve = crearRelieve(dest, azar);
    const cs = bioma.suelo;
    const terreno = crearTerreno({
      tam: TAM, seg: 110, altura: relieve,
      color: (x, z, h, pend, c) => {
        c.set(pend > 0.8 ? bioma.roca : cs[Math.min(2, Math.floor(ruido(x * 0.05, z * 0.05) * 3))]);
        // Variación suave por cara y algo más de luz en lo alto: el relieve se lee mejor
        c.multiplyScalar(0.9 + 0.2 * ruido(x * 0.35 + 7, z * 0.35 - 3) + Math.min(0.12, Math.max(-0.08, h * 0.012)));
      },
    });
    mundo.add(terreno.mesh);
    altura = terreno.altura;
    const lejos = new THREE.Mesh(new THREE.CircleGeometry(1600, 24), toon(cs[1], "suelo"));
    lejos.rotation.x = -Math.PI / 2;
    lejos.position.y = -3;
    mundo.add(lejos);

    // ----- Montañas en el horizonte: dan profundidad, sobre todo donde no hay aire -----
    {
      const N = 120, pos = [], radio = 300;
      const alto = k => 10 + 34 * Math.pow(Math.max(0, fbm(Math.cos(k) * 2.2 + bioma.semilla, Math.sin(k) * 2.2)), 1.6) + 6 * ruido(k * 9, 1);
      for (let i = 0; i < N; i++) {
        const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
        const h0 = alto(a0), h1 = alto(a1);
        const c0 = Math.cos(a0) * radio, s0 = Math.sin(a0) * radio, c1 = Math.cos(a1) * radio, s1 = Math.sin(a1) * radio;
        pos.push(c0, -4, s0, c1, -4, s1, c0 * 1.06, h0, s0 * 1.06);
        pos.push(c1, -4, s1, c1 * 1.06, h1, s1 * 1.06, c0 * 1.06, h0, s0 * 1.06);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const col = new THREE.Color(cs[0]).lerp(scene.fog.color, 0.35);
      mundo.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })));
    }

    // ----- Guijarros: cientos de piedras pequeñas en una sola llamada de dibujo -----
    {
      const n = 420, mat = toon(bioma.roca, "roca");
      mat.flatShading = true;
      const piedras = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, n);
      const o = new THREE.Object3D(), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const a = azar() * Math.PI * 2, r = 7 + Math.pow(azar(), 0.7) * 170, s = 0.12 + Math.pow(azar(), 3) * 0.45;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        o.position.set(x, altura(x, z) + s * 0.25, z);
        o.rotation.set(azar() * 3, azar() * 3, azar() * 3);
        o.scale.set(s * (0.8 + azar() * 0.6), s * 0.7, s);
        o.updateMatrix();
        piedras.setMatrixAt(i, o.matrix);
        piedras.setColorAt(i, c.set(i % 3 ? bioma.roca : cs[0]).multiplyScalar(0.85 + azar() * 0.3));
      }
      piedras.receiveShadow = true;
      mundo.add(piedras);
    }

    // ----- Cielo -----
    mundo.add(domo);
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
      disco.position.copy(DIR_SOL).multiplyScalar(820);
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
      const roca = crearRoca(s * 0.75, i % 3 ? bioma.roca : cs[0], azar);
      roca.position.set(x, altura(x, z) + s * 0.15, z);
      roca.rotation.set((azar() - 0.5) * 0.4, azar() * 3, (azar() - 0.5) * 0.4);
      mundo.add(roca);
      if (s > 1.6) colisiones.push({ minX: x - s * 0.6, maxX: x + s * 0.6, minZ: z - s * 0.6, maxZ: z + s * 0.6 });
    }

    // ----- Zonas peligrosas: dañan el traje -----
    zonas = [];
    const ponerZona = (x, z, radio) => {
      if (tieneLava(dest)) { // charco de lava con costra, grietas que brillan, reborde de roca y brasas
        const lava = crearLava(dest, x, z, radio, altura, azar);
        mundo.add(lava.grupo);
        zonas.push({ x, z, radio, lava });
        return;
      }
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
      patas.push(pata);
      cohete.add(giro);
    }
    llama.position.y = -(largo / 2 + 0.6 + 1.2);
    llama.visible = false;
    cohete.add(llama);
    mundo.add(cohete);
    polvo.forEach(p => { p.material.color.set(bioma.suelo[2]); p.visible = false; mundo.add(p); });
    colisiones.push({ minX: -1.6, maxX: 1.6, minZ: -1.6, maxZ: 1.6 });
    interactuables.push({ id: "despegar", texto: "Despegar de regreso al granero", x: 0, z: 0, radio: 6 });

    // ----- Objetos: los más valiosos quedan más lejos del cohete -----
    objetos = campo.map((dato, i) => {
      const a = Math.random() * Math.PI * 2, r = 16 + i * 9 + Math.random() * 7;
      return ponerObjeto(dato, Math.cos(a) * r, Math.sin(a) * r);
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
    ambiente = crearAmbiente(dest, mundo, altura, azar);
  }

  // Durante el descenso: coloca el cohete a `h` metros del suelo, con la llama encendida o no.
  function moverCohete(h, conLlama) {
    cohete.position.y = baseCohete + Math.max(0, h);
    llama.visible = conLlama;
    llama.scale.set(1, 0.7 + Math.random() * 0.6, 1);
    // Las patas se despliegan cerca del suelo
    const k = THREE.MathUtils.clamp((45 - h) / 25, 0, 1);
    patas.forEach(p => { p.rotation.z = -0.1 + 0.7 * k; p.position.x = 0.9 + 0.25 * k; });
    // El chorro del motor levanta polvo cuando está cerca del suelo
    tPolvo += 1 / 60;
    pintarPolvo(conLlama ? Math.max(0, 1 - h / 30) : 0, tPolvo);
    return cohete.position.y;
  }

  function pintarPolvo(fuerza, tt) {
    polvo.forEach(p => {
      p.visible = fuerza > 0.01;
      if (!p.visible) return;
      const f = (tt * 0.9 + p.userData.fase) % 1, r = 1.5 + f * 9 * (0.4 + fuerza);
      p.position.set(Math.cos(p.userData.ang) * r, 0.5 + f * 1.4, Math.sin(p.userData.ang) * r);
      p.scale.setScalar(0.6 + f * 2.2);
      p.material.opacity = 0.55 * fuerza * (1 - f);
    });
  }

  // Polvareda al tocar el suelo; más grande cuanto más fuerte el golpe.
  function polvareda(fuerza) { golpePolvo = Math.min(1.6, 0.5 + fuerza); tPolvo = 0; }

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
  // Coloca un objeto recolectable con su aura en el suelo y un haz de luz del color de su rareza.
  function ponerObjeto(dato, x, z) {
    const y = altura(x, z);
    const mesh = crearObjeto(dato);
    mesh.scale.setScalar(0.75);
    mesh.position.set(x, y + 1.0, z);
    mundo.add(mesh);
    const color = mesh.userData.rareza.color;
    // Aura en el suelo y haz de luz del color de su rareza, para verlo desde lejos
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    aura.rotation.x = -Math.PI / 2;
    aura.position.set(x, y + 0.08, z);
    mundo.add(aura);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 16, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, fog: false, depthWrite: false }));
    haz.position.set(x, y + 8.5, z);
    mundo.add(haz);
    haz.userData.aura = aura;
    return { dato, mesh, haz };
  }

  function actualizar(dt, pos) {
    t += dt;
    sol.position.set(pos.x + 14, pos.y + 22, pos.z + 12);
    sol.target.position.set(pos.x, pos.y - 1.7, pos.z);
    if (ambiente) ambiente.actualizar(dt, pos);
    rafagas = rafagas.filter(r => r.actualizar(dt));

    // Lo recogido vuela hacia la mochila y se encoge
    volando = volando.filter(v => {
      v.t += dt / 0.35;
      v.mesh.position.lerpVectors(v.desde, new THREE.Vector3(pos.x, pos.y - 0.9, pos.z), Math.min(1, v.t));
      v.mesh.scale.setScalar(v.escala * Math.max(0.05, 1 - v.t));
      v.mesh.rotation.y += dt * 12;
      if (v.t < 1) return true;
      mundo.remove(v.mesh);
      return false;
    });
    const alVuelo = o => {
      if (o.haz.userData.aura) mundo.remove(o.haz.userData.aura);
      const c = o.mesh.userData.rareza ? o.mesh.userData.rareza.color : 0xff8a2a;
      rafagas.push(crearRafaga(mundo, o.mesh.position.x, o.mesh.position.y, o.mesh.position.z, { color: c }));
      mundo.remove(o.haz);
      volando.push({ mesh: o.mesh, desde: o.mesh.position.clone(), escala: o.mesh.scale.x, t: 0 });
    };

    if (golpePolvo > 0) { // polvareda del aterrizaje
      tPolvo += dt;
      golpePolvo -= dt * 0.8;
      pintarPolvo(Math.max(0, golpePolvo), tPolvo * 0.5);
    }

    const recogidos = [];
    objetos = objetos.filter(o => {
      o.mesh.userData.animar(t);
      o.haz.material.opacity = 0.22 + Math.sin(t * 2 + o.mesh.position.x) * 0.08;
      if (Math.hypot(o.mesh.position.x - pos.x, o.mesh.position.z - pos.z) < RADIO_RECOGER) {
        alVuelo(o);
        recogidos.push(o.dato);
        return false;
      }
      return true;
    });

    let piezasRecogidas = 0;
    piezas = piezas.filter(o => {
      o.mesh.rotation.y += dt * 1.5;
      if (Math.hypot(o.mesh.position.x - pos.x, o.mesh.position.z - pos.z) < RADIO_RECOGER) {
        alVuelo(o);
        piezasRecogidas++;
        return false;
      }
      return true;
    });

    let enPeligro = false;
    avanzarLava(dt);
    for (const z of zonas) {
      if (z.lava) z.lava.actualizar(dt);
      else z.mesh.material.opacity = 0.6 + 0.3 * Math.sin(t * 3 + z.fase);
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
    scene, colisiones, interactuables, iniciar, actualizar, moverCohete, inclinar, ponerPiezas, polvareda, limite: TAM / 2 - 22,
    // Tormenta solar: el cielo se tiñe de un resplandor anaranjado (0 = normal, 1 = máximo)
    tormenta(k) {
      const cielo = CIELOS[destino], naranja = new THREE.Color(0xffb36b);
      const h = new THREE.Color(bioma.niebla ? bioma.niebla[0] : cielo.horizonte).lerp(naranja, k * 0.7);
      scene.background = h;
      if (scene.fog) scene.fog.color.copy(h);
      domo.material.uniforms.horizonte.value.copy(h);
      domo.material.uniforms.cenit.value.set(cielo.cenit).lerp(naranja, k * 0.35);
      sol.intensity = bioma.luz * (1 + k * 0.8);
    },
    // Nube de polvo a los pies (al caminar, al caer de un salto)
    polvoPaso(x, y, z, fuerte = false) {
      rafagas.push(crearRafaga(mundo, x, y + 0.1, z, {
        color: colorPolvo(destino), n: fuerte ? 22 : 8, vel: fuerte ? 3 : 1.2, duracion: fuerte ? 1 : 0.6,
        tam: fuerte ? 0.9 : 0.55, gravedad: -0.5 * gravedad, aditivo: false,
      }));
    },
    get gravedad() { return gravedad; },
    // Para los eventos: añadir un objeto nuevo, efectos y piezas al mundo del planeta
    agregarObjeto(dato, x, z) { const o = ponerObjeto(dato, x, z); objetos.push(o); return o; },
    rafaga(x, y, z, opts) { rafagas.push(crearRafaga(mundo, x, y, z, opts)); },
    agregar(obj) { mundo.add(obj); },
    quitar(obj) { mundo.remove(obj); },
    get destino() { return destino; },
    get piezas() { return piezas; },
    get mision() { return mision; },
    altura: (x, z) => altura(x, z),
    get objetos() { return objetos; },
    get senal() { return senal; },
  };
}
