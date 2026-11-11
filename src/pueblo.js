// Villa Siderense: un pueblo pequeño al que se llega caminando desde el granero.
import { caja, cilindro, cono, esfera, etiqueta } from "./estilo.js";
import { crearPersona } from "./cientifico.js";

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
    P(esfera(0.3, 0xffd23f, 8), x, 3.15, z);
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
    actualizar(dt, pos) {
      personas.forEach(p => {
        p.actualizar(dt, pos);
        p.boton.x = p.grupo.position.x; // el botón de "hablar" sigue al vecino
        p.boton.z = p.grupo.position.z;
      });
    },
    hablando(nombre) { personas.forEach(p => { p.hablando = p.nombre === nombre; }); },
  };
}
