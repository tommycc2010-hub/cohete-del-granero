// Mundo del granero: llanuras, montañas al norte, mesetas al este, un lago y el pueblo.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, etiqueta, toon } from "./estilo.js";
import { crearCohete } from "./cohete.js";
import { crearCientifico, NOMBRE } from "./cientifico.js";
import { crearPueblo } from "./pueblo.js";
import { crearTerreno } from "./terreno.js";
import { fbm, ruido, paso, azarSemilla, distSegmento } from "./ruido.js";

const ROJO = 0xe5483b, ROJO_OSC = 0xc93a2e, CREMA = 0xfff6e5, MADERA = 0xb07a45, MADERA_OSC = 0x8a5a2b;
const PUEBLO = { x: -75, z: 70 };
const LAGO = { x: -120, z: -20 };
const TAM = 480;

// ----- Relieve -----
function alturaBase(x, z) {
  const dGranero = Math.hypot(x, z + 4), dPueblo = Math.hypot(x - PUEBLO.x, z - PUEBLO.z);
  const libre = paso(32, 80, dGranero) * paso(36, 60, dPueblo); // 0 en las zonas que deben ser planas
  let h = fbm(x * 0.012, z * 0.012) * 6 * libre;                 // llanuras onduladas
  const m = paso(-85, -190, z);                                  // montañas al norte
  h += m * (30 + 42 * Math.abs(fbm(x * 0.016 + 9, z * 0.016, 3)));
  const e = paso(75, 100, x) * (1 - m);                          // mesetas al este
  h += e * 15 * paso(0.47, 0.53, ruido(x * 0.02 + 30, z * 0.02 + 5));
  h -= 3.5 * paso(34, 12, Math.hypot(x - LAGO.x, z - LAGO.z));   // cuenca del lago
  return h;
}

function distCamino(x, z) {
  return Math.min(
    distSegmento(x, z, 0, -2, 0, 26),
    distSegmento(x, z, 0, 26, -45, 52),
    distSegmento(x, z, -45, 52, PUEBLO.x + 24, PUEBLO.z - 20));
}

function colorTerreno(x, z, h, pend, c) {
  const m = paso(-85, -190, z), e = paso(75, 100, x) * (1 - m), r = ruido(x * 0.06, z * 0.06);
  if (h > 52) c.set(0xffffff);                                              // nieve
  else if (m > 0.2 && (h > 20 || pend > 0.9)) c.set(r > 0.5 ? 0x8d8f98 : 0x7a7c86); // roca
  else if (e > 0.3 && pend > 0.6) c.set(0xb5622f);                          // pared de meseta
  else if (e > 0.3 && h > 6) c.set(r > 0.5 ? 0xd98a4e : 0xe09a5c);          // cima de meseta
  else if (h < -1.2) c.set(0xd8c890);                                       // orilla del lago
  else if (Math.hypot(x - PUEBLO.x, z - PUEBLO.z) < 31) c.set(0xdccba2);    // plaza del pueblo
  else if (distCamino(x, z) < 2.6) c.set(0xd9b77e);                         // camino de tierra
  else c.set(r > 0.66 ? 0x8ad37c : r > 0.33 ? 0x7bc96f : 0x6fbf63);         // pasto
  return c;
}

export function crearGranero(scene, mejoras) {
  const colisiones = [];
  const interactuables = [];
  const col = (x, z, w, d) => colisiones.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const poner = (obj, x, y, z) => { obj.position.set(x, y, z); scene.add(obj); return obj; };

  // ----- Cielo y luces -----
  scene.background = new THREE.Color(0x8ed1f0);
  scene.fog = new THREE.Fog(0xbfe6f5, 170, 560);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfa3, 1.6));
  const lampara = new THREE.PointLight(0xffe2b0, 40, 16, 1.6); // luz cálida dentro del granero
  lampara.position.set(0, 4.3, -6.5);
  scene.add(lampara);
  const sol = new THREE.DirectionalLight(0xfff1d0, 2.2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 });
  sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);

  // ----- Terreno -----
  const terreno = crearTerreno({ tam: TAM, seg: 120, altura: alturaBase, color: colorTerreno });
  scene.add(terreno.mesh);
  const altura = terreno.altura;
  const lejos = new THREE.Mesh(new THREE.CircleGeometry(1800, 24), toon(0x7bc96f)); // suelo hasta el horizonte
  lejos.rotation.x = -Math.PI / 2;
  lejos.position.y = -2.5;
  scene.add(lejos);
  const agua = new THREE.Mesh(new THREE.CircleGeometry(33, 24), toon(0x4aa3e8));
  agua.rotation.x = -Math.PI / 2;
  agua.position.set(LAGO.x, -1.5, LAGO.z);
  scene.add(agua);

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
  poner(caja(largoAla, 0.3, 11, ROJO_OSC), -3.2, 6.5, Z0).rotation.z = ang;
  poner(caja(largoAla, 0.3, 11, ROJO_OSC), 3.2, 6.5, Z0).rotation.z = -ang;
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
  interactuables.push({ id: "cohete", texto: "Elegir destino y despegar", x: 0, z: Z0, radio: 4.2 });

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
  poner(caja(0.5, 0.3, 0.35, ROJO), -4.8, 1.18, Z0 - 4.1);
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
  poner(cilindro(0.06, 0.06, 1, 0x333333, 6), 9.15, 1.1, 3.1);
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

  // Cartel hacia el pueblo, al final del patio
  poner(cilindro(0.08, 0.08, 2.2, MADERA_OSC, 6), -3.2, 1.1, 27);
  poner(etiqueta("← PUEBLO", { fondo: "#fff6e5", ancho: 2.6 }), -3.2, 2.5, 27);

  // ----- Cerca a los lados del patio (solo adorno) -----
  for (const x of [-22, 22]) {
    for (let z = -20; z <= 20; z += 4) poner(caja(0.25, 1.2, 0.25, CREMA), x, 0.6, z);
    [0.45, 0.9].forEach(y => poner(caja(0.1, 0.12, 40, CREMA, false), x, y, 0));
  }

  // ----- Árboles repartidos por las llanuras -----
  const azar = azarSemilla(2026);
  const arbol = (x, z, s) => {
    const y = altura(x, z);
    poner(cilindro(0.3 * s, 0.4 * s, 2 * s, MADERA_OSC, 7), x, y + s, z);
    poner(cono(1.7 * s, 2.6 * s, 0x3f9c4f, 7), x, y + 3.1 * s, z);
    poner(cono(1.3 * s, 2.2 * s, 0x4fb561, 7), x, y + 4.5 * s, z);
    col(x, z, 0.9 * s, 0.9 * s);
  };
  [[-15, -14, 1.2], [15, -10, 1], [-17, 6, 1.1], [16, 12, 1.3], [-12, 17, 0.9], [11, -17, 1.1], [18, 0, 0.9]].forEach(a => arbol(...a));
  for (let i = 0, puestos = 0; i < 400 && puestos < 75; i++) {
    const x = (azar() - 0.5) * 400, z = (azar() - 0.5) * 400, h = altura(x, z);
    if (Math.hypot(x, z + 4) < 30 || Math.hypot(x - PUEBLO.x, z - PUEBLO.z) < 37 || distCamino(x, z) < 6) continue;
    if (h > 22 || h < -0.6 || Math.abs(altura(x + 2, z) - h) > 1.6) continue; // ni roca, ni lago, ni pared
    arbol(x, z, 0.8 + azar() * 0.8);
    puestos++;
  }

  // ----- Pueblo -----
  const pueblo = crearPueblo({ cx: PUEBLO.x, cz: PUEBLO.z, poner, col, interactuables });

  // ----- Nubes -----
  const nubes = [];
  [[-20, 44, -35], [12, 50, -45], [30, 42, -10], [-34, 46, 15], [5, 52, 40], [-90, 48, 90], [100, 55, -80], [-120, 50, -60]].forEach(([x, y, z]) => {
    const n = new THREE.Group();
    [[0, 0, 0, 7], [5, -0.5, 0.6, 5], [-5, -0.6, -0.4, 4.5]].forEach(([dx, dy, dz, s]) => {
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
  let coheteVuelo = null, alturaLanzadera = 0, despegando = false;

  function iniciarDespegue(m) {
    if (coheteVuelo) lanzadera.remove(coheteVuelo);
    coheteVuelo = crearCohete(m);
    const largo = coheteVuelo.userData.largo;
    lanzadera.add(coheteVuelo, llama);
    llama.position.y = -(largo / 2 + 0.6 + 1.2);
    alturaLanzadera = largo / 2 + 0.95;
    lanzadera.position.set(0, alturaLanzadera, 6);
    lanzadera.visible = true;
    baseCohete.visible = false;
    despegando = true;
  }

  // t = segundos desde que empezó el despegue. Devuelve la altura del cohete.
  function actualizarDespegue(t) {
    const s = Math.max(0, t - 0.9);
    lanzadera.position.set(Math.sin(t * 45) * 0.03, alturaLanzadera + 2.4 * s * s, 6);
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
    pueblo.actualizar(dt, jugadorPos);
    // El sol sigue al jugador para que siempre haya sombras a su alrededor
    sol.position.set(jugadorPos.x + 14, jugadorPos.y + 22, jugadorPos.z + 12);
    sol.target.position.set(jugadorPos.x, jugadorPos.y - 1.7, jugadorPos.z);
    humo.forEach(p => {
      p.visible = hayHumo;
      const f = (t * 0.25 + p.userData.fase) % 1;
      p.position.set(2.3 + Math.sin(f * 6 + p.userData.fase * 9) * 0.3, 1.2 + f * 3, Z0 + Math.cos(f * 5) * 0.25);
      p.scale.setScalar(0.6 + f * 1.8);
      p.material.opacity = 0.45 * (1 - f);
    });
    nubes.forEach(n => { n.position.x += dt * 0.6; if (n.position.x > 220) n.position.x = -220; });
  }

  return {
    scene, altura, colisiones, interactuables, actualizar, reconstruirCohete, limite: TAM / 2 - 22,
    iniciarDespegue, actualizarDespegue, terminarDespegue,
    cientifico: { x: 3.9, z: Z0 + 2.6 },
    hablando(nombre) { cientifico.hablando = nombre === NOMBRE; pueblo.hablando(nombre); },
  };
}
