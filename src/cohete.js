// Modelo del cohete. Cada mejora cambia una pieza visible. El eje del cohete es +Y (punta arriba).
import * as THREE from "three";
import { caja, cilindro, cono, esfera } from "./estilo.js";

const BLANCO = 0xe9e9e9, ROJO = 0xe5483b, AZUL = 0x4aa3e8;

export function crearCohete(mejoras) {
  const g = new THREE.Group();
  const largo = 3 + 0.3 * mejoras.tanque;

  const cuerpo = cilindro(0.8, 0.8, largo, BLANCO, 14);
  g.add(cuerpo);

  const franja = cilindro(0.82, 0.82, 0.35, ROJO, 14, false);
  franja.position.y = largo / 2 - 0.45;
  g.add(franja);

  const punta = cono(0.8, 1.4, ROJO, 14);
  punta.position.y = largo / 2 + 0.7;
  g.add(punta);

  const tobera = cilindro(0.45, 0.7, 0.6, mejoras.motor > 0 ? 0xffb14a : 0x777777, 12);
  tobera.position.y = -largo / 2 - 0.3;
  g.add(tobera);

  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const aleta = caja(0.9, 1.1, 0.12, ROJO);
    aleta.position.set(Math.cos(a) * 1.1, -largo / 2 + 0.5, Math.sin(a) * 1.1);
    aleta.rotation.y = -a;
    g.add(aleta);
  }

  const ventana = esfera(0.3, AZUL, 12);
  ventana.position.set(0, largo / 4, 0.68);
  g.add(ventana);

  if (mejoras.escudo === 0) {
    // Grietas del casco averiado
    [[-0.15, 0.4, 0.5], [0.1, -0.2, -0.45], [-0.05, -0.75, 0.35]].forEach(([x, y, rz]) => {
      const grieta = caja(0.07, 0.75, 0.05, 0x7a1c15, false);
      grieta.position.set(x, y - 0.3, 0.8);
      grieta.rotation.z = rz;
      g.add(grieta);
    });
  } else {
    const anillo = cilindro(0.9, 0.9, 0.3, 0x3aa0e8, 14);
    anillo.position.y = -0.4;
    g.add(anillo);
  }

  if (mejoras.antena > 0) {
    const mastil = cilindro(0.04, 0.04, 1.1, 0x555555, 6);
    mastil.rotation.x = Math.PI / 2;
    mastil.position.set(0, largo / 2 - 1, -1.3);
    g.add(mastil);
    const bola = esfera(0.16, 0xffd23f, 8);
    bola.position.set(0, largo / 2 - 1, -1.9);
    g.add(bola);
  }

  g.userData.largo = largo;
  return g;
}
