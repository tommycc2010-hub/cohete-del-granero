// Escena del granero: terreno, granero, cohete averiado y puestos interactivos.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, etiqueta, toon } from "./estilo.js";
import { crearCohete } from "./cohete.js";
import { crearCientifico, NOMBRE } from "./cientifico.js";

const ROJO = 0xe5483b, ROJO_OSC = 0xc93a2e, CREMA = 0xfff6e5, MADERA = 0xb07a45, MADERA_OSC = 0x8a5a2b;

export function crearGranero(scene, mejoras) {
  const colisiones = [];
  const interactuables = [];
  const col = (x, z, w, d) => colisiones.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const poner = (obj, x, y, z) => { obj.position.set(x, y, z); scene.add(obj); return obj; };

  // ----- Cielo y luces -----
  scene.background = new THREE.Color(0x8ed1f0);
  scene.fog = new THREE.Fog(0xbfe6f5, 45, 110);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfa3, 1.6));
  const lampara = new THREE.PointLight(0xffe2b0, 40, 16, 1.6); // luz cálida dentro del granero
  lampara.position.set(0, 4.3, -6.5);
  scene.add(lampara);
  const sol = new THREE.DirectionalLight(0xfff1d0, 2.2);
  sol.position.set(14, 22, 12);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 70 });
  sol.shadow.bias = -0.0005;
  scene.add(sol);

  // ----- Terreno -----
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toon(0x7bc96f));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);
  const camino = new THREE.Mesh(new THREE.PlaneGeometry(5, 26), toon(0xd9b77e));
  camino.rotation.x = -Math.PI / 2;
  camino.position.set(0, 0.02, 10);
  camino.receiveShadow = true;
  scene.add(camino);

  // ----- Granero (12 x 10 m, frente abierto hacia +Z) -----
  const Z0 = -8; // centro del granero
  poner(caja(12, 0.1, 10, 0xc9a36b, false), 0, 0.05, Z0);          // piso
  poner(caja(12, 5, 0.3, ROJO), 0, 2.5, Z0 - 5);                    // fondo
  poner(caja(0.3, 5, 10, ROJO), -6, 2.5, Z0);                       // izquierda
  poner(caja(0.3, 5, 10, ROJO), 6, 2.5, Z0);                        // derecha
  poner(caja(3, 5, 0.3, ROJO), -4.5, 2.5, Z0 + 5);                  // frente izq.
  poner(caja(3, 5, 0.3, ROJO), 4.5, 2.5, Z0 + 5);                   // frente der.
  poner(caja(6, 1, 0.3, ROJO), 0, 4.5, Z0 + 5);                     // dintel
  col(0, Z0 - 5, 12, 0.3); col(-6, Z0, 0.3, 10); col(6, Z0, 0.3, 10);
  col(-4.5, Z0 + 5, 3, 0.3); col(4.5, Z0 + 5, 3, 0.3);

  // Marco blanco de la entrada
  poner(caja(0.35, 4, 0.4, CREMA), -3, 2, Z0 + 5.05);
  poner(caja(0.35, 4, 0.4, CREMA), 3, 2, Z0 + 5.05);
  poner(caja(6.7, 0.35, 0.4, CREMA), 0, 4.1, Z0 + 5.05);

  // Techo a dos aguas
  const ang = Math.atan2(3, 6.4), largoAla = Math.hypot(6.4, 3) + 0.3;
  const alaIzq = poner(caja(largoAla, 0.3, 11, ROJO_OSC), -3.2, 6.5, Z0);
  alaIzq.rotation.z = ang;
  const alaDer = poner(caja(largoAla, 0.3, 11, ROJO_OSC), 3.2, 6.5, Z0);
  alaDer.rotation.z = -ang;
  // Hastiales (triángulos del frente y del fondo)
  const tri = new THREE.Shape();
  tri.moveTo(-6, 0); tri.lineTo(6, 0); tri.lineTo(0, 2.85); tri.closePath();
  const geoTri = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false });
  [Z0 + 4.85, Z0 - 5.15].forEach(z => {
    const h = new THREE.Mesh(geoTri, toon(ROJO));
    h.castShadow = true;
    poner(h, 0, 5, z);
  });
  poner(etiqueta("MI GRANERO", { fondo: "#fff6e5", ancho: 4 }), 0, 5.9, Z0 + 5.4);

  // ----- Cohete averiado dentro del granero -----
  const baseCohete = new THREE.Group();
  baseCohete.position.set(0, 1.75, Z0);
  baseCohete.rotation.z = Math.PI / 2 - 0.22; // tumbado, con la punta un poco levantada
  scene.add(baseCohete);
  let cohete = crearCohete(mejoras);
  baseCohete.add(cohete);
  function reconstruirCohete(m) {
    baseCohete.remove(cohete);
    cohete = crearCohete(m);
    baseCohete.add(cohete);
  }
  poner(caja(0.5, 1.5, 2.2, MADERA), -1.3, 0.75, Z0);
  poner(caja(0.5, 1.0, 2.2, MADERA), 1.3, 0.5, Z0);
  col(0, Z0, 6.4, 2.4);
  interactuables.push({ id: "cohete", texto: "Revisar el cohete", x: 0, z: Z0, radio: 4.2 });

  // Humo del motor averiado
  const humo = [];
  const matHumo = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 5), matHumo.clone());
    p.userData.fase = i / 7;
    scene.add(p);
    humo.push(p);
  }

  // ----- Taller (dentro, al fondo a la izquierda) -----
  poner(caja(2.6, 0.15, 1.1, MADERA), -4.2, 0.95, Z0 - 4.1);
  [[-5.3, -4.5], [-3.1, -4.5], [-5.3, -3.7], [-3.1, -3.7]].forEach(([x, dz]) =>
    poner(caja(0.15, 0.9, 0.15, MADERA_OSC), x, 0.45, Z0 + dz));
  poner(caja(0.5, 0.3, 0.35, ROJO), -4.8, 1.18, Z0 - 4.1);          // caja de herramientas
  poner(cilindro(0.08, 0.08, 0.5, 0x888888, 6), -3.8, 1.07, Z0 - 4.0).rotation.z = Math.PI / 2;
  poner(etiqueta("TALLER", { ancho: 2 }), -4.2, 2.2, Z0 - 4.3);
  col(-4.2, Z0 - 4.1, 2.6, 1.1);
  interactuables.push({ id: "taller", texto: "Abrir el taller", x: -4.2, z: Z0 - 4.1, radio: 2.6 });

  // ----- El científico (dentro, a la derecha de la entrada) -----
  const cientifico = crearCientifico(3.9, Z0 + 2.6);
  scene.add(cientifico.grupo);
  col(3.9, Z0 + 2.6, 0.8, 0.6);
  interactuables.push({ id: "cientifico", texto: `Hablar con el ${NOMBRE}`, x: 3.9, z: Z0 + 2.6, radio: 2.6 });

  // ----- Bomba de combustible -----
  poner(caja(1.6, 0.2, 1.2, 0x9a9a9a), 8.5, 0.1, 3);
  poner(caja(1, 1.8, 0.6, ROJO), 8.5, 1.1, 3);
  poner(caja(0.7, 0.45, 0.05, CREMA), 8.5, 1.5, 3.33);
  poner(cilindro(0.5, 0.5, 0.25, CREMA, 12), 8.5, 2.15, 3);
  poner(cilindro(0.06, 0.06, 1, TINTA_GRIS(), 6), 9.15, 1.1, 3.1);
  poner(etiqueta("COMBUSTIBLE", { ancho: 2.6 }), 8.5, 3, 3);
  col(8.5, 3, 1.6, 1.2);
  interactuables.push({ id: "bomba", texto: "Comprar 10 de combustible", x: 8.5, z: 3, radio: 2.6 });

  // ----- Mesa de venta -----
  poner(caja(2.8, 0.15, 1.2, MADERA), -8.5, 0.95, 3);
  [[-9.7, 2.5], [-7.3, 2.5], [-9.7, 3.5], [-7.3, 3.5]].forEach(([x, z]) =>
    poner(caja(0.15, 0.9, 0.15, MADERA_OSC), x, 0.45, z));
  poner(caja(0.7, 0.7, 0.7, MADERA_OSC), -10.6, 0.35, 3.2).rotation.y = 0.3;
  poner(caja(0.6, 0.6, 0.6, MADERA), -10.5, 1.0, 3.2).rotation.y = -0.2;
  poner(esfera(0.22, 0xffc94a, 8), -8.9, 1.25, 3);
  poner(cono(0.2, 0.5, 0xe28bff, 6), -8.2, 1.28, 3.1);
  poner(etiqueta("VENTA", { fondo: "#5cc46b", ancho: 2 }), -8.5, 2.4, 3);
  col(-8.5, 3, 2.8, 1.2); col(-10.55, 3.2, 0.9, 0.9);
  interactuables.push({ id: "venta", texto: "Vender la carga", x: -8.5, z: 3, radio: 2.6 });

  // ----- Árboles, cerca y nubes -----
  [[-15, -14, 1.2], [15, -10, 1], [-17, 6, 1.1], [16, 12, 1.3], [-12, 17, 0.9], [11, -17, 1.1], [18, 0, 0.9]].forEach(([x, z, s]) => {
    poner(cilindro(0.3 * s, 0.4 * s, 2 * s, MADERA_OSC, 7), x, s, z);
    poner(cono(1.7 * s, 2.6 * s, 0x3f9c4f, 7), x, 3.1 * s, z);
    poner(cono(1.3 * s, 2.2 * s, 0x4fb561, 7), x, 4.5 * s, z);
    col(x, z, 0.9 * s, 0.9 * s);
  });
  const L = 22;
  for (let i = -L; i <= L; i += 4) {
    [[i, -L], [i, L], [-L, i], [L, i]].forEach(([x, z]) => poner(caja(0.25, 1.2, 0.25, CREMA), x, 0.6, z));
  }
  [0.45, 0.9].forEach(y => {
    poner(caja(2 * L, 0.12, 0.1, CREMA, false), 0, y, -L);
    poner(caja(2 * L, 0.12, 0.1, CREMA, false), 0, y, L);
    poner(caja(0.1, 0.12, 2 * L, CREMA, false), -L, y, 0);
    poner(caja(0.1, 0.12, 2 * L, CREMA, false), L, y, 0);
  });
  const nubes = [];
  [[-20, 24, -35], [12, 28, -45], [30, 22, -10], [-34, 26, 15], [5, 30, 40]].forEach(([x, y, z]) => {
    const n = new THREE.Group();
    [[0, 0, 0, 5], [3.5, -0.4, 0.5, 3.5], [-3.5, -0.5, -0.3, 3.2]].forEach(([dx, dy, dz, s]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
      b.position.set(dx, dy, dz);
      n.add(b);
    });
    poner(n, x, y, z);
    nubes.push(n);
  });

  // ----- Despegue: un cohete en pie frente al granero que sube con llama -----
  const lanzadera = new THREE.Group();
  lanzadera.visible = false;
  scene.add(lanzadera);
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.6, 10), new THREE.MeshBasicMaterial({ color: 0xffa726 }));
  llama.rotation.x = Math.PI; // punta hacia abajo
  let coheteVuelo = null, alturaBase = 0, despegando = false;

  function iniciarDespegue(m) {
    if (coheteVuelo) lanzadera.remove(coheteVuelo);
    coheteVuelo = crearCohete(m);
    const largo = coheteVuelo.userData.largo;
    lanzadera.add(coheteVuelo, llama);
    llama.position.y = -(largo / 2 + 0.6 + 1.2);
    alturaBase = largo / 2 + 0.95;
    lanzadera.position.set(0, alturaBase, 6);
    lanzadera.visible = true;
    baseCohete.visible = false;
    despegando = true;
  }

  // t = segundos desde que empezó el despegue. Devuelve la altura del cohete.
  function actualizarDespegue(t) {
    const s = Math.max(0, t - 0.9);
    lanzadera.position.set(Math.sin(t * 45) * 0.03, alturaBase + 2.4 * s * s, 6);
    llama.visible = t > 0.4;
    llama.scale.set(1, 0.7 + Math.random() * 0.6, 1);
    humo.forEach((p, i) => {
      const f = Math.min(1, Math.max(0, t - 0.4) / 2.5 + p.userData.fase * 0.3);
      const a = i * 0.9;
      p.visible = t > 0.4;
      p.position.set(Math.cos(a) * f * 5, 0.5 + f * 0.8, 6 + Math.sin(a) * f * 5);
      p.scale.setScalar(1 + f * 4);
      p.material.opacity = 0.5 * (1 - f * 0.7);
    });
    return lanzadera.position.y;
  }

  function terminarDespegue() {
    lanzadera.visible = false;
    baseCohete.visible = true;
    despegando = false;
  }

  let t = 0;
  function actualizar(dt, hayHumo, jugadorPos) {
    if (despegando) return;
    t += dt;
    cientifico.actualizar(dt, jugadorPos);
    humo.forEach(p => {
      p.visible = hayHumo;
      const f = (t * 0.25 + p.userData.fase) % 1;
      p.position.set(2.3 + Math.sin(f * 6 + p.userData.fase * 9) * 0.3, 1.2 + f * 3, Z0 + Math.cos(f * 5) * 0.25);
      p.scale.setScalar(0.6 + f * 1.8);
      p.material.opacity = 0.45 * (1 - f);
    });
    nubes.forEach(n => { n.position.x += dt * 0.4; if (n.position.x > 60) n.position.x = -60; });
  }

  return {
    colisiones, interactuables, actualizar, reconstruirCohete, limite: L - 0.6,
    iniciarDespegue, actualizarDespegue, terminarDespegue,
    cientifico: { x: 3.9, z: Z0 + 2.6 },
  };
}

function TINTA_GRIS() { return 0x333333; }
