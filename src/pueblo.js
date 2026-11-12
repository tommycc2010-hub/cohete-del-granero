// Villa Siderense: un pueblo pequeño al que se llega caminando desde el granero.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, etiqueta } from "./estilo.js";
import { crearPersona } from "./cientifico.js";
import { crearObjeto } from "./objetos.js";
import { crearParticulas } from "./particulas.js";
import { PIEZAS_MUSEO } from "./reglas.js";

const brilla = (m, color, fuerza = 1.4) => { m.material.emissive = new THREE.Color(color); m.material.emissiveIntensity = fuerza; return m; };

const MADERA = 0xb07a45, MADERA_OSC = 0x8a5a2b, CREMA = 0xfff6e5, PIEDRA = 0xa9adb5;

// `poner(obj, x, y, z)` añade a la escena; `col(x, z, ancho, fondo)` añade una colisión.
export function crearPueblo({ cx, cz, poner, col, interactuables }) {
  const P = (obj, x, y, z) => poner(obj, cx + x, y, cz + z);
  const C = (x, z, w, d) => col(cx + x, cz + z, w, d);

  // ----- Casas alrededor de la plaza (la puerta mira hacia el centro) -----
  const CASAS = [
    [-21, -12, 0xf2d7a0, 0xc93a2e], [-25, 7, 0xbfe0f0, 0x4a6fa5], [-11, 24, 0xf7c6c6, 0x8a5a2b],
    [10, 25, 0xd6efc2, 0xc93a2e], [25, 9, 0xfde9a8, 0x4a6fa5], [-7, -27, 0xe6d6f5, 0x8a5a2b], [6, -27, 0xf2d7a0, 0x3f9c4f],
  ];
  CASAS.forEach(([x, z, pared, tejado]) => {
    P(caja(6, 3.4, 6, pared), x, 1.7, z);
    const techo = cono(5, 2.6, tejado, 4);
    techo.rotation.y = Math.PI / 4;
    P(techo, x, 4.7, z);
    P(caja(0.7, 1.2, 0.7, PIEDRA), x + 1.5, 4.6, z + 1.2); // chimenea
    const enX = Math.abs(x) > Math.abs(z), s = enX ? -Math.sign(x) : -Math.sign(z);
    // Macetas con flores a los lados de la puerta
    [-1, 1].forEach((lado, k) => {
      const px = enX ? x + s * 3.5 : x + lado * 0.95, pz = enX ? z + lado * 0.95 : z + s * 3.5;
      P(cilindro(0.25, 0.2, 0.4, 0xc06a3a, 8), px, 0.2, pz);
      P(esfera(0.28, [0xff6b6b, 0xffd23f, 0xe28bff, 0xff9ecf][(k + Math.abs(x)) % 4], 7, false), px, 0.55, pz);
    });
    if (enX) {
      P(caja(0.15, 2, 1.1, MADERA_OSC), x + s * 3.02, 1, z);
      P(caja(0.12, 1, 1, 0x9fd8ff), x + s * 3.02, 1.9, z - 1.8);
      P(caja(0.12, 1, 1, 0x9fd8ff), x + s * 3.02, 1.9, z + 1.8);
    } else {
      P(caja(1.1, 2, 0.15, MADERA_OSC), x, 1, z + s * 3.02);
      P(caja(1, 1, 0.12, 0x9fd8ff), x - 1.8, 1.9, z + s * 3.02);
      P(caja(1, 1, 0.12, 0x9fd8ff), x + 1.8, 1.9, z + s * 3.02);
    }
    C(x, z, 6.2, 6.2);
  });

  // ----- Plaza: fuente, faroles y bancos -----
  P(cilindro(2.6, 2.8, 0.6, PIEDRA, 10), 0, 0.3, 0);
  P(cilindro(2.2, 2.2, 0.1, 0x4aa3e8, 10, false), 0, 0.62, 0);
  P(cilindro(0.3, 0.4, 1.7, PIEDRA, 8), 0, 1.4, 0);
  P(esfera(0.45, 0x4aa3e8, 8), 0, 2.4, 0);
  C(0, 0, 5.4, 5.4);
  [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([x, z]) => {
    P(cilindro(0.08, 0.12, 3, 0x333333, 6), x, 1.5, z);
    P(brilla(esfera(0.3, 0xffd23f, 8), 0xffc94a, 1.3), x, 3.15, z);
    C(x, z, 0.4, 0.4);
  });
  [[0, -6.5, 0], [0, 6.5, 0]].forEach(([x, z]) => {
    P(caja(2.4, 0.12, 0.6, MADERA), x, 0.5, z);
    P(caja(0.12, 0.5, 0.6, MADERA_OSC), x - 1, 0.25, z);
    P(caja(0.12, 0.5, 0.6, MADERA_OSC), x + 1, 0.25, z);
    C(x, z, 2.4, 0.6);
  });

  // ----- Mercado: aquí la carga se vende un 20 % más cara -----
  const mx = 12, mz = -6;
  P(caja(3.6, 0.15, 1.4, MADERA), mx, 0.95, mz);
  [[-1.6, -0.5], [1.6, -0.5], [-1.6, 0.5], [1.6, 0.5]].forEach(([dx, dz]) => P(caja(0.14, 0.9, 0.14, MADERA_OSC), mx + dx, 0.45, mz + dz));
  [[-1.8, 0.9], [1.8, 0.9], [-1.8, -0.9], [1.8, -0.9]].forEach(([dx, dz]) => P(cilindro(0.06, 0.06, 2.8, MADERA_OSC, 6), mx + dx, 1.4, mz + dz));
  for (let i = 0; i < 6; i++) P(caja(0.66, 0.14, 2.2, i % 2 ? CREMA : 0xe5483b), mx - 1.65 + i * 0.66, 2.85, mz); // toldo a rayas
  P(esfera(0.22, 0xffc94a, 8), mx - 1, 1.25, mz);
  P(cono(0.2, 0.5, 0xe28bff, 6), mx - 0.2, 1.28, mz);
  P(caja(0.4, 0.3, 0.4, 0x8fe3f0), mx + 0.8, 1.18, mz);
  P(caja(0.7, 0.7, 0.7, MADERA_OSC), mx + 2.6, 0.35, mz + 0.4);
  P(etiqueta("MERCADO +20 %", { fondo: "#5cc46b", ancho: 3 }), mx, 3.7, mz);
  C(mx, mz, 3.8, 1.6);
  interactuables.push({ id: "mercado", texto: "Vender la carga en el mercado (+20 %)", x: cx + mx, z: cz + mz, radio: 4.2 });

  // ----- Torre de agua y cartel de entrada -----
  [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([dx, dz]) => P(cilindro(0.15, 0.15, 7, MADERA_OSC, 6), 30 + dx, 3.5, 22 + dz));
  P(cilindro(2.6, 2.6, 3.2, 0x9fb8c8, 12), 30, 8.6, 22);
  P(cono(2.9, 1.6, 0xc93a2e, 12), 30, 11, 22);
  C(30, 22, 3.6, 3.6);
  P(cilindro(0.1, 0.1, 2.6, MADERA_OSC, 6), 24, 1.3, -22);
  P(cilindro(0.1, 0.1, 2.6, MADERA_OSC, 6), 28, 1.3, -18);
  P(etiqueta("VILLA SIDERENSE", { fondo: "#fff6e5", ancho: 5.6 }), 26, 3, -20);

  const anim = [];

  // ----- Agua de la fuente -----
  const agua = crearParticulas(70, { color: 0x9fdcff, tam: 0.35, aditivo: true, opacidad: 0.85 });
  P(agua.puntos, 0, 0, 0);
  const gotas = Array.from({ length: 70 }, (_, i) => ({ a: i / 70 * Math.PI * 2, f: Math.random() }));
  anim.push(dt => {
    gotas.forEach((g, i) => {
      g.f = (g.f + dt * 0.7) % 1;
      const r = g.f * 1.9, y = 2.55 + g.f * 1.4 - g.f * g.f * 3.1;
      agua.poner(i, Math.cos(g.a) * r, y, Math.sin(g.a) * r);
    });
    agua.listo();
  });

  // ----- Banderines entre los faroles -----
  const COLORES = [0xe5483b, 0xffd23f, 0x4aa3e8, 0x5cc46b, 0xe28bff];
  const banderines = [];
  [[-8, -8, 8, -8], [8, -8, 8, 8], [8, 8, -8, 8], [-8, 8, -8, -8]].forEach(([x0, z0, x1, z1]) => {
    for (let i = 1; i < 10; i++) {
      const f = i / 10;
      const b = cono(0.15, 0.3, COLORES[i % 5], 3, false);
      b.rotation.x = Math.PI;
      P(b, x0 + (x1 - x0) * f, 2.95 - Math.sin(f * Math.PI) * 0.7, z0 + (z1 - z0) * f);
      banderines.push(b);
    }
  });
  let tb = 0;
  anim.push(dt => { tb += dt; banderines.forEach((b, i) => { b.rotation.z = Math.sin(tb * 2.2 + i * 0.6) * 0.18; }); });

  // ----- Museo del Espacio: dona una pieza de cada tipo y te paga por ella -----
  const ux = -26, uz = 20;
  P(caja(6, 0.4, 10.4, 0xd9d2c4), ux, 0.2, uz);                   // escalinata
  P(caja(5.4, 4.2, 9.6, 0xf3ecdc), ux - 0.4, 2.5, uz);             // edificio
  P(caja(6.2, 0.5, 10.6, 0xe0d6c0), ux, 4.85, uz);                 // cornisa
  const fronton = cono(3.9, 1.6, 0xc93a2e, 4);
  fronton.scale.set(0.85, 1, 1.6);
  fronton.rotation.y = Math.PI / 4;
  P(fronton, ux, 5.9, uz);
  for (let i = 0; i < 5; i++) P(cilindro(0.28, 0.32, 4.1, 0xffffff, 10), ux + 2.6, 2.45, uz - 4 + i * 2); // columnas
  P(caja(0.15, 2.4, 1.8, MADERA_OSC), ux + 2.36, 1.6, uz);       // puerta
  P(etiqueta("MUSEO DEL ESPACIO", { fondo: "#fff6e5", ancho: 4.6 }), ux + 3, 6.2, uz);
  C(ux, uz, 6, 10.4);
  const vitrinas = PIEZAS_MUSEO.map((nombre, i) => {
    const vz = uz - 5.4 + i * 1.8, vx = ux + 6.4;
    P(cilindro(0.42, 0.5, 1, 0xfff6e5, 10), vx, 0.5, vz);
    P(cilindro(0.5, 0.5, 0.1, 0xd9a441, 10), vx, 1.03, vz);
    const pieza = crearObjeto({ nombre });
    pieza.scale.setScalar(0.42);
    pieza.visible = false;
    P(pieza, vx, 1.45, vz);
    const vacio = esfera(0.16, 0x666666, 6, false);
    vacio.material.transparent = true;
    vacio.material.opacity = 0.35;
    P(vacio, vx, 1.3, vz);
    C(vx, vz, 0.9, 0.9);
    return { nombre, pieza, vacio };
  });
  let tm = 0;
  anim.push(dt => { tm += dt; vitrinas.forEach(v => { if (v.pieza.visible) v.pieza.userData.animar(tm); }); });
  interactuables.push({ id: "museo", texto: "Donar al Museo del Espacio", x: cx + ux + 5, z: cz + uz, radio: 4.2 });

  // ----- Tablón de anuncios -----
  {
    const bx = 5, bz = -12;
    P(cilindro(0.08, 0.08, 2.4, MADERA_OSC, 6), bx - 1.1, 1.2, bz);
    P(cilindro(0.08, 0.08, 2.4, MADERA_OSC, 6), bx + 1.1, 1.2, bz);
    P(caja(2.4, 1.3, 0.12, 0xc8955a), bx, 1.75, bz);
    const techito = caja(2.8, 0.12, 0.6, 0xc93a2e);
    techito.rotation.x = 0.3;
    P(techito, bx, 2.55, bz);
    [[-0.7, 0.2, 0xfff6e5], [0.1, 0.1, 0xffe9a8], [0.75, 0.25, 0xd6efc2], [-0.4, -0.35, 0xf7c6c6], [0.5, -0.3, 0xbfe0f0]].forEach(([dx, dy, color], i) => {
      const nota = caja(0.5, 0.42, 0.02, color, false);
      nota.rotation.z = (i % 2 ? 0.08 : -0.06);
      P(nota, bx + dx, 1.75 + dy, bz + 0.08);
    });
    P(etiqueta("ENCARGOS", { ancho: 1.9 }), bx, 3.1, bz);
    C(bx, bz, 2.4, 0.4);
    interactuables.push({ id: "tablon", texto: "Leer el tablón de encargos", x: cx + bx, z: cz + bz + 0.8, radio: 2.4 });
  }

  // ----- Café con mesas y sombrillas -----
  [[-14, 1.5, 0xe5483b], [-14, -3.5, 0x4aa3e8]].forEach(([x, z, color]) => {
    P(cilindro(0.6, 0.6, 0.08, 0xffffff, 10), x, 0.8, z);
    P(cilindro(0.06, 0.06, 0.8, 0x555555, 6), x, 0.4, z);
    P(cilindro(0.04, 0.04, 2.2, 0x555555, 6), x, 1.6, z);
    const sombrilla = cono(1.5, 0.6, color, 8);
    P(sombrilla, x, 2.75, z);
    P(cono(1.52, 0.6, 0xffffff, 8, false), x, 2.73, z).rotation.y = Math.PI / 8; // gajos blancos
    [[-0.9, 0], [0.9, 0]].forEach(([dx, dz]) => {
      P(caja(0.45, 0.08, 0.45, MADERA), x + dx, 0.5, z + dz);
      P(caja(0.08, 0.5, 0.45, MADERA_OSC), x + dx * 1.25, 0.75, z + dz);
    });
    C(x, z, 2.4, 1.2);
  });
  P(etiqueta("CAFÉ ESTELAR", { fondo: "#ffe9a8", ancho: 2.8 }), -14, 3.6, -1);

  // ----- Árboles redondos -----
  [[18, 17], [-16, -21], [17, -17], [-29, -2], [20, 30]].forEach(([x, z]) => {
    P(cilindro(0.3, 0.4, 2.2, MADERA_OSC, 7), x, 1.1, z);
    P(esfera(1.7, 0x4fb561, 8), x, 3.2, z);
    P(esfera(1.2, 0x5cc46b, 8), x + 0.7, 3.9, z - 0.4);
    C(x, z, 0.9, 0.9);
  });

  // ----- Vecinos -----
  const VECINOS = [
    { x: -4, z: 4, ruta: [[-9.5, 0], [0, 9.5], [9.5, 0], [0, -9.5]], velocidad: 1, nombre: "Doña Luz", ropa: 0xe28bff, pelo: 0xeeeeee, pantalon: 0x6a4a8a, cartel: "#e28bff", gafas: true, lineas: [
      "¿Tú eres quien revivió el cohete del viejo granero? ¡Todo el pueblo te vio despegar!",
      "Sube al cerro de noche: desde aquí Júpiter se ve a simple vista, como una estrella muy brillante.",
    ] },
    { x: 15, z: -4.2, nombre: "Marta", ropa: 0x5cc46b, pelo: 0x5a3a1a, pantalon: 0x34495e, cartel: "#5cc46b", lineas: [
      "¡Bienvenido al mercado! Aquí pago un 20 % más que en tu granero. El paseo vale la pena si traes buena carga.",
      "Los cristales y las muestras biológicas son lo que más me piden. La chatarra... bueno, también la compro.",
    ] },
    { x: 5, z: 9, ruta: [[5, 12], [16, 14], [17, 2], [5, 12], [-14, 16]], velocidad: 1.4, nombre: "Tomás", ropa: 0xe5843b, pelo: 0x2a2a2a, pantalon: 0x4a4a4a, cartel: "#ffd23f", bigote: true, lineas: [
      "Consejo de mecánico: lo que pesa, cuesta. Cada pieza que le pones al cohete pide más combustible para moverla.",
      "Antes de comprar, pregúntate qué problema te está frenando: ¿el tanque, el oxígeno o el traje?",
    ] },
    { x: -9, z: -3, ruta: [[-4.5, 0], [0, 4.5], [4.5, 0], [0, -4.5], [-14, -10]], velocidad: 2.3, nombre: "Leo", ropa: 0x4aa3e8, pelo: 0xd9a441, pantalon: 0x2f6f3a, cartel: "#4aa3e8", escala: 0.72, lineas: [
      "¿Es verdad que en Venus las nubes son de ácido? ¡Guácala!",
      "Cuando sea grande quiero ir a Marte. ¿Me traes una piedra?",
    ] },
  ];
  const personas = VECINOS.map(v => {
    const ruta = v.ruta && v.ruta.map(([x, z]) => [cx + x, cz + z]);
    const p = crearPersona({ ...v, ruta, x: cx + v.x, z: cz + v.z });
    poner(p.grupo, cx + v.x, 0, cz + v.z);
    if (!ruta) C(v.x, v.z, 0.7, 0.6); // los que pasean no bloquean el paso
    p.nombre = v.nombre;
    p.boton = { id: "vecino", texto: `Hablar con ${v.nombre}`, nombre: v.nombre, lineas: v.lineas, x: cx + v.x, z: cz + v.z, radio: 2.4 };
    interactuables.push(p.boton);
    return p;
  });

  return {
    // Muestra en el museo las piezas donadas
    mostrarMuseo(museo) { vitrinas.forEach(v => { v.pieza.visible = !!museo[v.nombre]; v.vacio.visible = !museo[v.nombre]; }); },
    actualizar(dt, pos) {
      anim.forEach(f => f(dt));
      personas.forEach(p => {
        p.actualizar(dt, pos);
        p.boton.x = p.grupo.position.x; // el botón de "hablar" sigue al vecino
        p.boton.z = p.grupo.position.z;
      });
    },
    hablando(nombre) { personas.forEach(p => { p.hablando = p.nombre === nombre; }); },
  };
}
