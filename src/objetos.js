// Objetos recolectables: un modelo de varias piezas por tipo, con su animación y un brillo según la rareza.
import * as THREE from "three";
import { caja, cilindro, cono, esfera, toon, TINTA } from "./estilo.js";
import { texturaSuave, crearParticulas } from "./particulas.js";

// Rareza por tipo: color del aura y del haz, y cuánto brilla.
export const RAREZA = {
  "Chatarra espacial": { nivel: "Común", color: 0xb8c0c6, brillo: 0 },
  "Hielo": { nivel: "Común", color: 0x8fe3f0, brillo: 0.25 },
  "Mineral raro": { nivel: "Raro", color: 0xffc94a, brillo: 0.55 },
  "Cristal lunar": { nivel: "Épico", color: 0xe28bff, brillo: 0.8 },
  "Muestra biológica": { nivel: "Legendario", color: 0x6ee37a, brillo: 1 },
  // Solo aparecen con eventos aleatorios
  "Sonda perdida": { nivel: "Épico", color: 0xffd23f, brillo: 0.7 },
  "Meteorito": { nivel: "Raro", color: 0xff7a3a, brillo: 0.6 },
};

const brillante = (color, emisivo, intensidad = 0.6) => {
  const m = toon(color);
  m.emissive = new THREE.Color(emisivo);
  m.emissiveIntensity = intensidad;
  return m;
};

function conMaterial(malla, material) {
  malla.material = material;
  return malla;
}

// ----- Modelos -----
function chatarra(g) {
  const metal = 0x9aa3a8, oscuro = 0x5f676c, oxido = 0xb5652d;
  const placa = caja(1.3, 0.12, 0.9, metal);
  placa.rotation.set(0.25, 0.3, 0.15);
  g.add(placa);
  const placa2 = caja(0.8, 0.1, 0.6, oscuro);
  placa2.position.set(0.25, 0.28, -0.2);
  placa2.rotation.set(-0.5, 0.9, 0.4);
  g.add(placa2);
  const tubo = cilindro(0.11, 0.11, 1.1, oxido, 8);
  tubo.position.set(-0.3, 0.15, 0.25);
  tubo.rotation.set(0.3, 0, 1.3);
  g.add(tubo);
  const codo = cilindro(0.11, 0.11, 0.45, oxido, 8);
  codo.position.set(-0.83, 0.38, 0.22);
  codo.rotation.set(0, 0, 0.2);
  g.add(codo);
  for (let i = 0; i < 4; i++) { // tornillos
    const t = caja(0.1, 0.08, 0.1, 0x3a3f44, false);
    t.position.set(-0.45 + i * 0.3, 0.13 + i * 0.03, -0.28 + (i % 2) * 0.5);
    g.add(t);
  }
  const antena = cilindro(0.025, 0.025, 0.7, 0xdddddd, 5, false);
  antena.position.set(0.5, 0.45, 0.3);
  antena.rotation.z = -0.6;
  g.add(antena);
  return t => { g.rotation.z = Math.sin(t * 1.1) * 0.12; };
}

function hielo(g) {
  const base = esfera(0.5, 0xeef8ff, 8);
  base.scale.set(1.3, 0.45, 1.1);
  g.add(base);
  const mat = brillante(0xbff3ff, 0x4fc9e8, 0.35);
  mat.transparent = true;
  mat.opacity = 0.88;
  const fragmentos = [];
  [[0, 0.75, 0, 1.3, 0], [0.4, 0.5, 0.2, 0.9, 0.5], [-0.38, 0.5, 0.1, 0.85, -0.45], [0.1, 0.45, -0.38, 0.75, -0.3], [-0.15, 0.4, 0.4, 0.65, 0.35]]
    .forEach(([x, y, z, alto, inc]) => {
      const f = conMaterial(cono(0.22, alto, 0, 5), mat);
      f.position.set(x, y + alto * 0.2, z);
      f.rotation.set(inc * 0.6, 0, inc);
      g.add(f);
      fragmentos.push(f);
    });
  return t => { mat.emissiveIntensity = 0.3 + Math.sin(t * 2.4) * 0.15; };
}

function mineral(g) {
  const roca = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62), toon(0x8a7258));
  roca.scale.set(1.2, 0.8, 1);
  const borde = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62), new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide }));
  borde.scale.setScalar(1.1);
  roca.add(borde);
  g.add(roca);
  const oro = brillante(0xffc94a, 0xb87800, 0.5);
  [[0.25, 0.45, 0.1, 0.5, 0.3], [-0.2, 0.5, -0.1, 0.6, -0.4], [0.05, 0.55, 0.3, 0.45, 0.6], [-0.35, 0.25, 0.35, 0.35, -0.9], [0.45, 0.2, -0.3, 0.4, 1]]
    .forEach(([x, y, z, alto, inc]) => {
      const c = conMaterial(cono(0.17, alto * 1.25, 0, 6), oro);
      c.position.set(x, y, z);
      c.rotation.set(inc * 0.5, 0, inc);
      g.add(c);
    });
  return t => { oro.emissiveIntensity = 0.45 + Math.sin(t * 3.1) * 0.2; };
}

function cristal(g) {
  const mat = brillante(0xe28bff, 0x8a2fc0, 0.65);
  const base = esfera(0.45, 0x6b4a7a, 7);
  base.scale.set(1.4, 0.4, 1.2);
  g.add(base);
  [[0, 0, 0, 1.5, 0.28, 0], [0.38, 0, 0.12, 1.0, 0.2, 0.45], [-0.36, 0, 0.05, 1.15, 0.22, -0.4], [0.1, 0, -0.35, 0.8, 0.18, -0.35], [-0.12, 0, 0.36, 0.7, 0.16, 0.3]]
    .forEach(([x, y, z, alto, r, inc]) => {
      const prisma = new THREE.Group();
      const cuerpo = conMaterial(cilindro(r, r, alto, 0, 6), mat);
      cuerpo.position.y = alto / 2;
      const punta = conMaterial(cono(r, r * 1.8, 0, 6), mat);
      punta.position.y = alto + r * 0.9;
      prisma.add(cuerpo, punta);
      prisma.position.set(x, y, z);
      prisma.rotation.set(inc * 0.5, 0, inc);
      g.add(prisma);
    });
  return t => { mat.emissiveIntensity = 0.55 + Math.sin(t * 2) * 0.3; };
}

function muestra(g) {
  const metal = 0xc8ccd0;
  const tapaA = cilindro(0.42, 0.42, 0.2, metal, 12);
  tapaA.position.y = -0.55;
  const tapaB = cilindro(0.42, 0.42, 0.2, metal, 12);
  tapaB.position.y = 0.75;
  const asa = cilindro(0.08, 0.08, 0.25, 0x666666, 8);
  asa.position.y = 0.95;
  g.add(tapaA, tapaB, asa);
  const vidrio = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 14),
    new THREE.MeshBasicMaterial({ color: 0x9dffb4, transparent: true, opacity: 0.32, depthWrite: false }));
  vidrio.position.y = 0.1;
  g.add(vidrio);
  for (let i = 0; i < 3; i++) { // barras que unen las tapas
    const a = i * Math.PI * 2 / 3, barra = cilindro(0.04, 0.04, 1.1, metal, 6);
    barra.position.set(Math.cos(a) * 0.38, 0.1, Math.sin(a) * 0.38);
    g.add(barra);
  }
  const etiqueta = caja(0.3, 0.16, 0.02, 0xffd23f, false); // etiqueta de muestra en una de las tapas
  etiqueta.position.set(0, -0.55, 0.43);
  g.add(etiqueta);
  const vida = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), brillante(0x6ee37a, 0x2fbf4a, 0.9));
  vida.position.y = 0.1;
  g.add(vida);
  const burbujas = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xb6ffc0, transparent: true, opacity: 0.8 }));
    b.userData = { fase: i / 5, x: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.4 };
    g.add(b);
    burbujas.push(b);
  }
  return t => {
    const p = 1 + Math.sin(t * 3) * 0.15;
    vida.scale.set(p, 2 - p, p);
    vida.rotation.y = t;
    burbujas.forEach(b => {
      const f = (t * 0.5 + b.userData.fase) % 1;
      b.position.set(b.userData.x, -0.4 + f * 1.0, b.userData.z);
    });
  };
}

// Sonda vieja a la deriva: cuerpo con lámina dorada, antena parabólica, paneles y una luz que aún parpadea.
function sonda(g) {
  const cuerpo = caja(0.7, 0.55, 0.7, 0xd9a53a);
  g.add(cuerpo);
  const franja = caja(0.72, 0.1, 0.72, 0x5b4a2a, false);
  franja.position.y = 0.12;
  g.add(franja);
  const plato = cono(0.75, 0.28, 0xe8e8e8, 16);
  plato.rotation.x = Math.PI;
  plato.position.y = 0.5;
  g.add(plato);
  const mastil = cilindro(0.03, 0.03, 0.45, 0xbbbbbb, 5, false);
  mastil.position.y = 0.5;
  g.add(mastil);
  for (const lado of [-1, 1]) {
    const brazo = cilindro(0.03, 0.03, 0.5, 0x888888, 5, false);
    brazo.rotation.z = Math.PI / 2;
    brazo.position.set(lado * 0.6, -0.05, 0);
    g.add(brazo);
    const panel = caja(0.75, 0.05, 0.45, 0x2f5fb3);
    panel.position.set(lado * 1.2, -0.05, 0);
    panel.rotation.x = 0.4 * lado;
    g.add(panel);
  }
  const boom = cilindro(0.02, 0.02, 1.4, 0xcccccc, 4, false); // brazo del magnetómetro
  boom.rotation.set(0.6, 0, 0.9);
  boom.position.set(-0.4, -0.45, 0.3);
  g.add(boom);
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
  luz.position.set(0.3, 0.3, 0.36);
  g.add(luz);
  return t => {
    luz.visible = (t * 1.3) % 1 < 0.25;
    g.rotation.z = Math.sin(t * 0.6) * 0.25;
  };
}

// Meteorito: roca oscura con costra de fusión y vetas de metal que todavía brillan por el calor.
function meteorito(g) {
  const roca = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), toon(0x3b302a));
  roca.scale.set(1.15, 0.85, 1);
  g.add(roca);
  const contorno = new THREE.Mesh(roca.geometry, new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide }));
  contorno.scale.setScalar(1.08);
  roca.add(contorno);
  const vetas = [];
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(new THREE.TetrahedronGeometry(0.14), brillante(0xffb070, 0xff5a1f, 1.1));
    const d = new THREE.Vector3().randomDirection().multiplyScalar(0.5);
    v.position.copy(d);
    v.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    roca.add(v);
    vetas.push(v);
  }
  return t => { vetas.forEach((v, i) => { v.material.emissiveIntensity = 0.7 + Math.sin(t * 3 + i) * 0.4; }); };
}

const MODELOS = { "Sonda perdida": sonda, "Meteorito": meteorito, "Chatarra espacial": chatarra, "Hielo": hielo, "Mineral raro": mineral, "Cristal lunar": cristal, "Muestra biológica": muestra };

// Crea el objeto. El grupo raíz lo coloca quien llama; dentro, el cuerpo flota y gira solo.
export function crearObjeto(dato) {
  const raiz = new THREE.Group();
  const cuerpo = new THREE.Group();
  raiz.add(cuerpo);
  const animarModelo = (MODELOS[dato.nombre] || hielo)(cuerpo);
  const r = RAREZA[dato.nombre] || RAREZA.Hielo;

  // Brillo detrás del objeto, más fuerte cuanto más raro
  let halo = null, chispas = null;
  if (r.brillo > 0) {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSuave(), color: r.color, transparent: true,
      opacity: 0.35 + r.brillo * 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(2.2 + r.brillo * 1.6);
    halo.position.y = 0.3;
    raiz.add(halo);
  }
  // Destellos que giran alrededor de los objetos raros, épicos y legendarios
  if (r.brillo >= 0.5) {
    chispas = crearParticulas(10, { color: 0xffffff, tam: 0.22, aditivo: true, opacidad: 0.9 });
    raiz.add(chispas.puntos);
  }

  const fase = Math.random() * 10;
  raiz.userData.rareza = r;
  raiz.userData.animar = t => {
    const tt = t + fase;
    cuerpo.position.y = Math.sin(tt * 1.6) * 0.18;
    cuerpo.rotation.y = tt * 0.7;
    animarModelo(tt);
    if (halo) halo.material.opacity = (0.35 + r.brillo * 0.35) * (0.8 + Math.sin(tt * 2.2) * 0.2);
    if (chispas) {
      for (let i = 0; i < 10; i++) {
        const a = tt * (0.9 + i * 0.07) + i * 0.63, rad = 0.9 + (i % 3) * 0.25;
        chispas.poner(i, Math.cos(a) * rad, 0.2 + Math.sin(tt * 1.3 + i) * 0.6, Math.sin(a) * rad);
      }
      chispas.listo();
    }
  };
  return raiz;
}
