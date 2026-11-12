// Alrededores del granero: cosas útiles y detalles que lo hacen más vivo.
// - Tablero de misiones (dentro): una tarjeta por destino, con sello verde al cumplirla.
// - Vitrina de trofeos (dentro): una copa por logro conseguido.
// - Telescopio (fuera): muestra qué ventanas de lanzamiento están abiertas.
// - Estación de tierra: la antena, los paneles y los tanques crecen con las mejoras del cohete.
// - Detalles: guirnalda de luces, molino, veleta, pacas de paja, tractor, flores y buzón.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, etiqueta, toon, palo, cuerda } from "./estilo.js";

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
  const fondoV = caja(2.5, 1.45, 0.05, 0x24365e, false); // fondo de terciopelo azul
  fondoV.position.set(0, 0.75, -0.37);
  vitrina.add(fondoV);
  const techoV = caja(2.7, 0.12, 0.85, MADERA_OSC);
  techoV.position.y = 1.55;
  vitrina.add(techoV);
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.08, depthWrite: false }));
  vidrio.position.set(0, 0.75, 0.42);
  vitrina.add(vidrio);
  const copas = [];
  for (let i = 0; i < 16; i++) {
    const copa = new THREE.Group();
    const ORO = 0xf2b81c;
    const base = caja(0.16, 0.05, 0.16, 0x5a3a1a, false);
    base.position.y = 0.085;
    const pie = brilla(cilindro(0.025, 0.04, 0.1, ORO, 6, false), 0x7a5200, 0.5);
    pie.position.y = 0.16;
    const cuerpo = brilla(cilindro(0.1, 0.05, 0.16, ORO, 10), 0x7a5200, 0.5);
    cuerpo.position.y = 0.29;
    copa.add(base, pie, cuerpo);
    for (const lado of [-1, 1]) { // asas
      const asa = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 10, Math.PI), cuerpo.material);
      asa.rotation.z = -lado * Math.PI / 2;
      asa.position.set(lado * 0.1, 0.3, 0);
      copa.add(asa);
    }
    copa.position.set(-1.05 + (i % 8) * 0.3, i < 8 ? 0.0 : 0.8, 0);
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
  const bombillas = [], cable = [];
  for (let i = 0; i <= 18; i++) {
    const f = i / 18, x = -6 + 12 * f, y = 4.8 - Math.sin(f * Math.PI) * 0.55;
    cable.push(new THREE.Vector3(x, y, Z0 + 5.3));
    const b = brilla(esfera(0.09, COLORES_LUZ[i % 5], 6, false), COLORES_LUZ[i % 5], 1.6);
    poner(b, x, y - 0.12, Z0 + 5.3); // la bombilla cuelga del cable
    bombillas.push(b);
  }
  poner(cuerda(cable), 0, 0, 0);
  animar.push(t => bombillas.forEach((b, i) => { b.material.emissiveIntensity = 1.1 + 0.6 * Math.sin(t * 2 + i * 0.8); }));

  // ===== Veleta en el tejado =====
  poner(cilindro(0.06, 0.06, 1.8, 0x333333, 6), 0, 8.6, Z0 - 2);
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
  veleta.scale.setScalar(1.8);
  poner(veleta, 0, 9.5, Z0 - 2);
  animar.push(t => { veleta.rotation.y = Math.sin(t * 0.3) * 0.8 + Math.sin(t * 1.7) * 0.1; });

  // ===== Molino de viento =====
  {
    const mx = 9, mz = -23, y = altura(mx, mz);
    poner(cilindro(0.55, 1.3, 10, 0xd9d2c4, 8), mx, y + 5, mz);
    poner(caja(1.3, 1.1, 1.6, 0xc93a2e), mx, y + 10.4, mz); // góndola
    poner(cono(0.9, 0.9, 0xc93a2e, 4), mx, y + 11.4, mz).rotation.y = Math.PI / 4;
    poner(caja(0.6, 0.9, 0.06, MADERA_OSC, false), mx, y + 1.0, mz + 1.22); // puerta
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
    poner(aspas, mx, y + 10.4, mz + 1.0);
    col(mx, mz, 2.4, 2.4);
    animar.push((t, dt) => { aspas.rotation.z -= dt * 0.9; });
  }

  // ===== Pacas de paja, tractor, flores y buzón =====
  const paca = (x, z, y = 0.45, r = 0) => {
    const p = cilindro(0.55, 0.55, 1.1, 0xe8c25a, 10);
    p.rotation.set(0, r, Math.PI / 2);
    poner(p, x, y, z);
  };
  paca(6.6, -15.6); paca(7.8, -15.4, 0.45, 0.2); paca(7.2, -15.5, 1.4, 0.1);
  col(7.2, -15.5, 2.4, 1.2);
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
    const tx = -13, tz = 12, y = altura(tx, tz) + 0.2;
    poner(cilindro(1.4, 1.5, 0.2, MADERA, 12), tx, y - 0.1, tz);
    const cima = new THREE.Vector3(tx, y + 1.35, tz);
    for (const a of [0.3, 2.4, 4.5]) { // trípode: las tres patas se juntan en la montura
      const pata = palo(new THREE.Vector3(tx + Math.cos(a) * 0.7, y, tz + Math.sin(a) * 0.7), cima, 0.045, 0x333333);
      poner(pata, pata.position.x, pata.position.y, pata.position.z);
    }
    poner(caja(0.3, 0.22, 0.3, 0x333333), tx, y + 1.42, tz); // montura
    const tubo = new THREE.Group(); // gira en horizontal (y) y apunta hacia arriba (z)
    const cuerpo = cilindro(0.17, 0.2, 1.7, 0xfff6e5, 12);
    cuerpo.rotation.z = -Math.PI / 2;
    cuerpo.position.x = 0.35;
    const aro = cilindro(0.21, 0.21, 0.14, 0x2a2a2a, 12);
    aro.rotation.z = -Math.PI / 2;
    aro.position.x = 1.2;
    const lente = brilla(cilindro(0.16, 0.16, 0.02, 0x7fd4ff, 12, false), 0x2a8fd0, 1);
    lente.rotation.z = -Math.PI / 2;
    lente.position.x = 1.28;
    const ocular = cilindro(0.05, 0.05, 0.25, 0x2a2a2a, 8);
    ocular.position.set(-0.45, 0.1, 0);
    ocular.rotation.z = 0.5;
    const buscador = cilindro(0.05, 0.05, 0.6, 0x2a2a2a, 8); // telescopio buscador, pequeño y paralelo
    buscador.rotation.z = -Math.PI / 2;
    buscador.position.set(0.4, 0.24, 0);
    tubo.add(cuerpo, aro, lente, ocular, buscador);
    tubo.rotation.z = 0.55;
    poner(tubo, tx, y + 1.62, tz);
    poner(etiqueta("TELESCOPIO", { ancho: 2.2 }), tx, y + 3.2, tz);
    col(tx, tz, 1.4, 1.4);
    interactuables.push({ id: "telescopio", texto: "Mirar por el telescopio (ventanas de lanzamiento)", x: tx, z: tz, radio: 2.6 });
    animar.push(t => { tubo.rotation.y = 0.8 + Math.sin(t * 0.15) * 0.6; });
  }

  // ===== Estación de tierra: crece con las mejoras =====
  // Antena de seguimiento (como las de la Red de Espacio Profundo de la NASA), un nivel por mejora de antena.
  // Plato parabólico: una superficie de revolución, cóncava, con su borde oscuro
  function plato(r, prof) {
    const puntos = [];
    for (let i = 0; i <= 10; i++) { const f = i / 10; puntos.push(new THREE.Vector2(Math.max(0.001, r * f), prof * f * f)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(puntos, 24), toon(0xf2f2f2));
    m.material.side = THREE.DoubleSide;
    m.castShadow = true;
    const borde = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0x1d1d1d }));
    borde.rotation.x = Math.PI / 2;
    borde.position.y = prof;
    m.add(borde);
    return m;
  }
  const antenas = [1, 2, 3].map(n => {
    const g = new THREE.Group();
    const r = 0.9 + n * 0.4, alto = 1.6 + n * 0.5, prof = r * 0.35;
    g.add(cilindro(0.35, 0.5, alto, METAL, 8)); // pedestal
    g.children[0].position.y = alto / 2;
    const horquilla = new THREE.Group(); // gira en horizontal
    horquilla.position.y = alto;
    for (const lado of [-1, 1]) { const brazo = caja(0.12, 0.7, 0.3, METAL); brazo.position.set(lado * 0.35, 0.3, -0.35); horquilla.add(brazo); }
    const base = caja(0.9, 0.15, 0.4, METAL);
    base.position.y = 0.05;
    horquilla.add(base);
    const cabeza = new THREE.Group(); // se inclina hacia el cielo
    cabeza.position.y = 0.6;
    const p = plato(r, prof);
    cabeza.add(p);
    // Receptor en el foco, sostenido por tres tirantes desde el borde del plato
    const foco = new THREE.Vector3(0, r * r / (4 * prof), 0);
    for (const a of [0, 2.1, 4.2]) cabeza.add(palo(new THREE.Vector3(Math.cos(a) * r * 0.95, prof * 0.9, Math.sin(a) * r * 0.95), foco, 0.025, 0x555555, false));
    const receptor = cilindro(0.1, 0.14, 0.3, 0x555555, 8);
    receptor.position.copy(foco);
    cabeza.add(receptor);
    const luz = brilla(esfera(0.07, 0xff3b3b, 6, false), 0xff3b3b, 2);
    luz.position.copy(foco).add(new THREE.Vector3(0, 0.2, 0));
    cabeza.add(luz);
    cabeza.rotation.x = 0.85; // mira al cielo, hacia el sur
    horquilla.add(cabeza);
    g.add(horquilla);
    g.visible = false;
    animar.push(t => { luz.visible = (t * 0.8 + n * 0.3) % 1 < 0.5; horquilla.rotation.y = Math.sin(t * 0.12 + n) * 0.5; });
    return g;
  });
  antenas.forEach(g => poner(g, 13, altura(13, -5), -5)); // todas en el mismo sitio: se ve la del nivel actual
  col(13, -5, 1.2, 1.2);
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
    const soporte = caja(1.2, 0.08, 0.08, 0x555555, false); // travesaño bajo el panel
    soporte.position.y = 1.08;
    g.add(soporte);
    g.visible = false;
    const x = -8.5 - i * 2.2, z = -17.5;
    poner(g, x, altura(x, z), z);
    return g;
  });
  // Tanques de combustible: uno por nivel de tanque
  poner(caja(3.8, 0.12, 2.4, 0xb9b9b9, false), 12.3, 0.06, 6.6); // losa de hormigón
  const tanques = [0, 1, 2, 3, 4].map(i => {
    const g = new THREE.Group();
    const color = i % 2 ? 0xe8e8e8 : 0xffd23f;
    const t = cilindro(0.38, 0.38, 1.2, color, 12);
    t.position.y = 0.72;
    const tapa = esfera(0.38, color, 12);
    tapa.scale.y = 0.45;
    tapa.position.y = 1.32;
    const franja = cilindro(0.39, 0.39, 0.12, 0xe5483b, 12, false);
    franja.position.y = 0.95;
    const valvula = cilindro(0.05, 0.05, 0.25, 0x555555, 6, false);
    valvula.position.y = 1.55;
    g.add(t, tapa, franja, valvula);
    g.visible = false;
    poner(g, 11 + (i % 3) * 1.1, 0.12, 6.0 + Math.floor(i / 3) * 1.1);
    return g;
  });
  col(12.3, 6.6, 3.8, 2.4);
  const cartelEstacion = poner(etiqueta("ESTACIÓN DE TIERRA", { ancho: 3.4, fondo: "#bfe9ff" }), 13, 6.6, -5);

  function mostrarMejoras(m) {
    antenas.forEach((g, i) => { g.visible = m.antena === i + 1; });
    cartelEstacion.visible = m.antena > 0;
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

