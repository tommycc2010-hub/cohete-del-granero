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
  const puntita = cilindro(0.06, 0.12, 0.35, 0xd8d8d8, 8); // punta metálica
  puntita.position.y = largo / 2 + 1.5;
  g.add(puntita);

  // Juntas entre las placas del casco: líneas finas oscuras alrededor del cuerpo
  for (const y of [largo / 2 - 1.1, -largo / 2 + 0.25]) {
    const junta = cilindro(0.812, 0.812, 0.04, 0x9a9a9a, 14, false);
    junta.position.y = y;
    g.add(junta);
  }
  // Remaches: puntitos alrededor de la franja roja
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const remache = esfera(0.035, 0x7a7a7a, 5, false);
    remache.position.set(Math.cos(a) * 0.83, largo / 2 - 0.2, Math.sin(a) * 0.83);
    g.add(remache);
  }

  const tobera = cilindro(0.45, 0.7, 0.6, mejoras.motor > 0 ? 0xffb14a : 0x777777, 12);
  tobera.position.y = -largo / 2 - 0.3;
  g.add(tobera);
  const garganta = cilindro(0.3, 0.6, 0.02, 0x2a2a2a, 12, false); // el interior oscuro de la tobera
  garganta.position.y = -largo / 2 - 0.6;
  g.add(garganta);
  for (let i = 0; i < mejoras.motor; i++) { // cada nivel de motor suma un aro de refuerzo
    const aro = cilindro(0.5 + i * 0.06, 0.5 + i * 0.06, 0.07, 0xc98a2a, 12, false);
    aro.position.y = -largo / 2 - 0.12 - i * 0.16;
    g.add(aro);
  }

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
  const marco = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.06, 6, 16), new THREE.MeshBasicMaterial({ color: 0x8a8a8a }));
  marco.position.set(0, largo / 4, 0.8);
  g.add(marco);
  const reflejo = esfera(0.07, 0xffffff, 6, false); // brillo en el vidrio
  reflejo.position.set(-0.1, largo / 4 + 0.1, 0.96);
  g.add(reflejo);

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

  if (mejoras.paneles > 0) { // alas de paneles solares, más grandes con cada nivel
    const ancho = 1.1 + 0.45 * mejoras.paneles;
    [-1, 1].forEach(lado => {
      const brazo = cilindro(0.05, 0.05, 0.6, 0x888888, 6);
      brazo.rotation.z = Math.PI / 2;
      brazo.position.set(lado * 1.05, largo / 4 - 0.2, 0);
      g.add(brazo);
      const panel = caja(ancho, 0.06, 0.9, 0x2a5fb5);
      panel.position.set(lado * (1.3 + ancho / 2), largo / 4 - 0.2, 0);
      g.add(panel);
      for (let i = 1; i < 3; i++) { // líneas de las celdas
        const linea = caja(0.03, 0.07, 0.92, 0xd8d8d8, false);
        linea.position.set(lado * (1.3 + ancho * i / 3), largo / 4 - 0.2, 0);
        g.add(linea);
      }
    });
  }
  if (mejoras.bateria > 0) { // franjas de batería alrededor del cuerpo
    for (let i = 0; i < Math.min(3, mejoras.bateria); i++) {
      const franja = cilindro(0.84, 0.84, 0.14, 0x3a3f4a, 14, false);
      franja.position.y = -largo / 2 + 1.25 + i * 0.22;
      g.add(franja);
    }
  }
  if (mejoras.rtg > 0) { // generador de radioisótopos con aletas, a un costado
    const rtg = new THREE.Group();
    rtg.add(cilindro(0.22, 0.22, 1.1, 0x3a3a3a, 10));
    for (let i = 0; i < 6; i++) {
      const aleta = caja(0.6, 0.9, 0.05, 0x555555);
      aleta.rotation.y = i * Math.PI / 6;
      rtg.add(aleta);
    }
    const punta = esfera(0.14, 0xff8a2a, 8, false);
    punta.position.y = 0.6;
    rtg.add(punta);
    rtg.position.set(0, -largo / 2 + 0.8, -1.25);
    g.add(rtg);
  }

  g.userData.largo = largo;
  return g;
}
