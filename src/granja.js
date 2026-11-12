// Alrededores del granero: cosas útiles y detalles que lo hacen más vivo.
// - Tablero de misiones (dentro): una tarjeta por destino, con sello verde al cumplirla.
// - Vitrina de trofeos (dentro): una copa por logro conseguido.
// - Telescopio (fuera): muestra qué ventanas de lanzamiento están abiertas.
// - Estación de tierra: la antena, los paneles y los tanques crecen con las mejoras del cohete.
// - Detalles: guirnalda de luces, molino, veleta, pacas de paja, tractor, flores y buzón.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, etiqueta, toon } from "./estilo.js";

const MADERA = 0xb07a45, MADERA_OSC = 0x8a5a2b, CREMA = 0xfff6e5, METAL = 0xb8c0c6;
const COLOR_DESTINO = { mercurio: "#a79a8a", venus: "#e8c372", marte: "#c1440e", jupiter: "#c9955c", europa: "#dcebf5" };
const NOMBRE_DESTINO = { mercurio: "MERCURIO", venus: "VENUS", marte: "MARTE", jupiter: "ÍO", europa: "EUROPA" };

// Material que brilla con luz propia (el postprocesado le añade resplandor)
function brilla(malla, color, fuerza = 1.4) {
  malla.material.emissive = new THREE.Color(color);
  malla.material.emissiveIntensity = fuerza;
  return malla;
}

// Tarjeta de papel dibujada en un canvas
function tarjetaDestino(id, hecha) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 160;
  const g = c.getContext("2d");
  g.fillStyle = "#fff6e5"; g.fillRect(0, 0, 128, 160);
  g.strokeStyle = "#1d1d1d"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 154);
  g.fillStyle = COLOR_DESTINO[id];
  g.beginPath(); g.arc(64, 62, 34, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#1d1d1d"; g.font = "bold 20px Trebuchet MS, sans-serif"; g.textAlign = "center";
  g.fillText(NOMBRE_DESTINO[id], 64, 128);
  if (hecha) {
    g.strokeStyle = "#2f9e44"; g.lineWidth = 12; g.lineCap = "round";
    g.beginPath(); g.moveTo(30, 66); g.lineTo(56, 94); g.lineTo(104, 34); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function crearGranja({ poner, col, interactuables, altura, Z0 }) {
  const animar = [];

  // ===== Tablero de misiones (pared izquierda, junto a la entrada) =====
  const tablero = new THREE.Group();
  tablero.add(caja(0.12, 1.7, 2.6, 0xc8955a));
  const marco = caja(0.08, 1.9, 2.8, MADERA_OSC, false);
  marco.position.x = -0.03;
  tablero.add(marco);
  const ORDEN = ["mercurio", "venus", "marte", "jupiter", "europa"];
  const tarjetas = ORDEN.map((id, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshBasicMaterial({ map: tarjetaDestino(id, false) }));
    m.rotation.y = Math.PI / 2;
    m.position.set(0.08, i < 3 ? 0.38 : -0.32, -(i < 3 ? (i - 1) * 0.75 : (i - 3.5) * 0.75)); // de izquierda a derecha visto desde dentro
    m.rotation.x = (i % 2 ? 0.05 : -0.05);
    tablero.add(m);
    const chincheta = esfera(0.04, 0xe5483b, 6, false);
    chincheta.position.set(0.12, m.position.y + 0.22, m.position.z);
    tablero.add(chincheta);
    return { id, m, hecha: false };
  });
  poner(tablero, -5.78, 2.1, Z0 + 2.4);
  poner(etiqueta("MISIONES", { ancho: 1.8 }), -5.5, 3.25, Z0 + 2.4);
  interactuables.push({ id: "tablero", texto: "Ver el tablero de misiones", x: -5, z: Z0 + 2.4, radio: 2.2 });

  // ===== Vitrina de trofeos (fondo a la derecha) =====
  const vitrina = new THREE.Group();
  vitrina.add(caja(2.6, 0.12, 0.8, MADERA)); // estantes
  const estante2 = caja(2.6, 0.12, 0.8, MADERA);
  estante2.position.y = 0.8;
  vitrina.add(estante2);
  for (const x of [-1.3, 1.3]) { const lado = caja(0.1, 2.1, 0.8, MADERA_OSC); lado.position.set(x, 0.5, 0); vitrina.add(lado); }
  const techoV = caja(2.7, 0.12, 0.85, MADERA_OSC);
  techoV.position.y = 1.55;
  vitrina.add(techoV);
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.18, depthWrite: false }));
  vidrio.position.set(0, 0.75, 0.42);
  vitrina.add(vidrio);
  const copas = [];
  for (let i = 0; i < 16; i++) {
    const copa = new THREE.Group();
    const cuerpo = brilla(cono(0.12, 0.2, 0xffb800, 8, false), 0xc98a00, 0.8);
    cuerpo.rotation.x = Math.PI;
    cuerpo.position.y = 0.26;
    const pie = cilindro(0.03, 0.06, 0.12, 0xffc94a, 6, false);
    pie.position.y = 0.1;
    copa.add(cuerpo, pie);
    copa.position.set(-1.05 + (i % 8) * 0.3, i < 8 ? 0.06 : 0.86, 0);
    copa.visible = false;
    vitrina.add(copa);
    copas.push(copa);
  }
  poner(vitrina, 3.9, 0.9, Z0 - 4.3);
  poner(caja(2.6, 0.9, 0.8, MADERA_OSC), 3.9, 0.45, Z0 - 4.3);
  poner(etiqueta("TROFEOS", { ancho: 1.8 }), 3.9, 3.0, Z0 - 4.3);
  col(3.9, Z0 - 4.3, 2.6, 0.9);
  interactuables.push({ id: "vitrina", texto: "Mirar la vitrina de trofeos", x: 3.9, z: Z0 - 4.3, radio: 2.4 });

  // ===== Guirnalda de luces en la fachada =====
  const COLORES_LUZ = [0xffd23f, 0xff6b6b, 0x6ee37a, 0x4dc3ff, 0xe28bff];
  const bombillas = [];
  for (let i = 0; i <= 18; i++) {
    const f = i / 18, x = -6 + 12 * f, y = 4.75 - Math.sin(f * Math.PI) * 0.55;
    const b = brilla(esfera(0.09, COLORES_LUZ[i % 5], 6, false), COLORES_LUZ[i % 5], 1.6);
    poner(b, x, y, Z0 + 5.3);
    bombillas.push(b);
  }
  animar.push(t => bombillas.forEach((b, i) => { b.material.emissiveIntensity = 1.1 + 0.6 * Math.sin(t * 2 + i * 0.8); }));

  // ===== Veleta en el tejado =====
  poner(cilindro(0.04, 0.04, 1, 0x333333, 6), 0, 8.3, Z0 - 2);
  const veleta = new THREE.Group();
  const flecha = caja(1.1, 0.06, 0.06, 0x333333, false);
  const cola = caja(0.05, 0.35, 0.3, 0x333333, false);
  cola.position.x = -0.5;
  const punta = cono(0.1, 0.25, 0x333333, 4, false);
  punta.rotation.z = -Math.PI / 2;
  punta.position.x = 0.6;
  const gallo = cono(0.18, 0.4, 0xc93a2e, 5, false);
  gallo.position.y = 0.25;
  veleta.add(flecha, cola, punta, gallo);
  poner(veleta, 0, 8.85, Z0 - 2);
  animar.push(t => { veleta.rotation.y = Math.sin(t * 0.3) * 0.8 + Math.sin(t * 1.7) * 0.1; });

  // ===== Molino de viento =====
  {
    const mx = 18.5, mz = -15, y = altura(mx, mz);
    poner(cilindro(0.45, 1.1, 8, 0xd9d2c4, 8), mx, y + 4, mz);
    poner(cono(0.9, 1.2, 0xc93a2e, 8), mx, y + 8.6, mz);
    const aspas = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const aspa = caja(0.5, 3.4, 0.08, CREMA);
      aspa.position.y = 1.9;
      const brazo = new THREE.Group();
      brazo.add(aspa);
      brazo.rotation.z = i * Math.PI / 2;
      aspas.add(brazo);
    }
    aspas.add(cilindro(0.2, 0.2, 0.3, 0x555555, 8));
    aspas.children[aspas.children.length - 1].rotation.x = Math.PI / 2;
    poner(aspas, mx, y + 7.6, mz + 0.95);
    col(mx, mz, 2, 2);
    animar.push((t, dt) => { aspas.rotation.z -= dt * 0.9; });
  }

  // ===== Pacas de paja, tractor, flores y buzón =====
  const paca = (x, z, y = 0.45, r = 0) => {
    const p = cilindro(0.55, 0.55, 1.1, 0xe8c25a, 10);
    p.rotation.set(0, r, Math.PI / 2);
    poner(p, x, y, z);
  };
  paca(7.6, -1.2); paca(8.8, -1.0, 0.45, 0.2); paca(8.2, -1.1, 1.4, 0.1);
  col(8.2, -1.1, 2.4, 1.2);
  paca(-7.4, -10, 0.45, 1.4); col(-7.4, -10, 1.2, 1.2);
  {
    const tx = -13, tz = -1;
    const t = new THREE.Group();
    t.add(caja(2.2, 0.8, 1.2, 0x3f9c4f));
    const cabina = caja(1, 1.1, 1.1, 0x3f9c4f);
    cabina.position.set(-0.4, 0.95, 0);
    t.add(cabina);
    const ventana = caja(0.9, 0.5, 1.12, 0x9fd8ff, false);
    ventana.position.set(-0.4, 1.15, 0);
    t.add(ventana);
    const chimenea = cilindro(0.08, 0.08, 0.8, 0x333333, 6);
    chimenea.position.set(0.7, 0.8, 0.3);
    t.add(chimenea);
    for (const [x, z, r] of [[-0.7, 0.7, 0.65], [-0.7, -0.7, 0.65], [0.8, 0.65, 0.4], [0.8, -0.65, 0.4]]) {
      const rueda = cilindro(r, r, 0.3, 0x2a2a2a, 10);
      rueda.rotation.x = Math.PI / 2;
      rueda.position.set(x, r - 0.4, z);
      t.add(rueda);
    }
    t.rotation.y = 0.5;
    poner(t, tx, altura(tx, tz) + 0.65, tz);
    col(tx, tz, 2.6, 2);
  }
  const FLORES = [0xff6b6b, 0xffd23f, 0xe28bff, 0xffffff, 0xff9ecf];
  for (const lado of [-1, 1]) {
    poner(caja(2.6, 0.3, 0.6, MADERA_OSC), lado * 4.6, 0.15, Z0 + 5.7);
    for (let i = 0; i < 6; i++) {
      const tallo = cilindro(0.03, 0.03, 0.35, 0x3f9c4f, 4, false);
      poner(tallo, lado * 4.6 - 1.05 + i * 0.42, 0.45, Z0 + 5.7);
      poner(esfera(0.12, FLORES[(i + (lado > 0 ? 2 : 0)) % 5], 6, false), lado * 4.6 - 1.05 + i * 0.42, 0.66, Z0 + 5.7);
    }
  }
  poner(cilindro(0.06, 0.06, 1.1, MADERA_OSC, 6), 2.2, 0.55, 22);
  poner(caja(0.5, 0.4, 0.7, 0x4a6fa5), 2.2, 1.25, 22);
  poner(caja(0.05, 0.25, 0.08, 0xe5483b, false), 2.48, 1.45, 21.85);

  // ===== Telescopio sobre una tarima =====
  {
    const tx = -13, tz = 12, y = altura(tx, tz);
    poner(cilindro(1.6, 1.6, 0.3, MADERA, 12), tx, y + 0.15, tz);
    for (const a of [0, 2.1, 4.2]) {
      const pata = cilindro(0.05, 0.05, 1.5, 0x333333, 5);
      pata.position.set(tx + Math.cos(a) * 0.35, y + 1.0, tz + Math.sin(a) * 0.35);
      pata.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      poner(pata, pata.position.x, pata.position.y, pata.position.z);
    }
    const tubo = new THREE.Group();
    const cuerpo = cilindro(0.2, 0.26, 1.8, 0xfff6e5, 12);
    cuerpo.rotation.z = Math.PI / 2 - 0.7;
    tubo.add(cuerpo);
    const lente = brilla(cilindro(0.21, 0.21, 0.05, 0x7fd4ff, 12, false), 0x2a8fd0, 0.9);
    lente.rotation.z = Math.PI / 2 - 0.7;
    lente.position.set(-0.58, 0.69, 0);
    tubo.add(lente);
    poner(tubo, tx, y + 1.95, tz);
    poner(etiqueta("TELESCOPIO", { ancho: 2.2 }), tx, y + 3.4, tz);
    col(tx, tz, 1.2, 1.2);
    interactuables.push({ id: "telescopio", texto: "Mirar por el telescopio (ventanas de lanzamiento)", x: tx, z: tz, radio: 2.6 });
    animar.push(t => { tubo.rotation.y = Math.sin(t * 0.15) * 0.6; });
  }

  // ===== Estación de tierra: crece con las mejoras =====
  // Antena de seguimiento (como las de la Red de Espacio Profundo de la NASA), un nivel por mejora de antena.
  const antenas = [1, 2, 3].map(n => {
    const g = new THREE.Group();
    const r = 0.9 + n * 0.45;
    g.add(cilindro(0.18, 0.3, 2 + n * 0.6, METAL, 8));
    g.children[0].position.y = (2 + n * 0.6) / 2;
    const plato = cono(r, r * 0.45, 0xf2f2f2, 16);
    plato.rotation.x = Math.PI * 0.75;
    plato.position.set(0, 2.3 + n * 0.6, 0.2);
    const receptor = cilindro(0.04, 0.04, r * 0.9, 0x555555, 5, false);
    receptor.rotation.x = Math.PI * 0.25;
    receptor.position.set(0, 2.6 + n * 0.6, 0.45);
    const luz = brilla(esfera(0.08, 0xff3b3b, 6, false), 0xff3b3b, 2);
    luz.position.set(0, 2.95 + n * 0.6 + r * 0.25, 0.7);
    g.add(plato, receptor, luz);
    g.visible = false;
    animar.push(t => { luz.visible = (t * 0.8 + n * 0.3) % 1 < 0.5; plato.rotation.z = Math.sin(t * 0.2 + n) * 0.3; });
    return g;
  });
  antenas.forEach((g, i) => poner(g, 12 + i * 0.01, altura(12, -5), -5)); // todas en el mismo sitio: se ve la del nivel actual
  // Paneles solares: uno por nivel
  const paneles = [0, 1, 2, 3].map(i => {
    const g = new THREE.Group();
    g.add(cilindro(0.06, 0.06, 1.1, 0x555555, 5));
    g.children[0].position.y = 0.55;
    const p = caja(1.8, 0.08, 1.1, 0x2f5fb3);
    p.position.y = 1.15;
    p.rotation.x = -0.5;
    g.add(p);
    for (let k = -1; k <= 1; k++) { const linea = caja(0.03, 0.09, 1.12, 0xbfd8ff, false); linea.position.set(k * 0.45, 1.15, 0); linea.rotation.x = -0.5; g.add(linea); }
    g.visible = false;
    const x = -9 - i * 2.3, z = -16;
    poner(g, x, altura(x, z), z);
    return g;
  });
  // Tanques de combustible: uno por nivel de tanque
  const tanques = [0, 1, 2, 3, 4].map(i => {
    const g = new THREE.Group();
    const t = cilindro(0.45, 0.45, 1.6, i % 2 ? 0xe8e8e8 : 0xffd23f, 12);
    t.position.y = 0.8;
    const tapa = esfera(0.45, i % 2 ? 0xe8e8e8 : 0xffd23f, 12);
    tapa.scale.y = 0.4;
    tapa.position.y = 1.6;
    g.add(t, tapa);
    g.visible = false;
    poner(g, 11 + i * 1.15, 0, 7);
    return g;
  });
  poner(etiqueta("ESTACIÓN DE TIERRA", { ancho: 3.4, fondo: "#bfe9ff" }), 12, 6.2, -5);

  function mostrarMejoras(m) {
    antenas.forEach((g, i) => { g.visible = m.antena === i + 1; });
    paneles.forEach((g, i) => { g.visible = i < m.paneles; });
    tanques.forEach((g, i) => { g.visible = i < m.tanque; });
  }

  function mostrarProgreso(estado) {
    tarjetas.forEach(c => {
      const hecha = !!estado.misiones[c.id];
      if (hecha !== c.hecha) { c.hecha = hecha; c.m.material.map.dispose(); c.m.material.map = tarjetaDestino(c.id, hecha); }
    });
    const n = Object.keys(estado.logros).length;
    copas.forEach((c, i) => { c.visible = i < n; });
  }

  let t = 0;
  return {
    mostrarMejoras, mostrarProgreso,
    actualizar(dt) { t += dt; animar.forEach(f => f(t, dt)); },
  };
}

