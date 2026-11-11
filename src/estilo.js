// Estilo visual: materiales toon de 3 tonos y contorno negro por "casco invertido".
import * as THREE from "three";

export const TINTA = 0x1d1d1d;

const gradiente = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter;
gradiente.needsUpdate = true;

const matContorno = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });

export function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradiente });
}

function malla(geo, color, geoContorno) {
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = true;
  m.receiveShadow = true;
  if (geoContorno) m.add(new THREE.Mesh(geoContorno, matContorno));
  return m;
}

const T = 0.07; // grosor del contorno

export function caja(w, h, d, color, contorno = true) {
  return malla(new THREE.BoxGeometry(w, h, d), color, contorno && new THREE.BoxGeometry(w + T, h + T, d + T));
}

export function cilindro(rArriba, rAbajo, h, color, seg = 12, contorno = true) {
  return malla(
    new THREE.CylinderGeometry(rArriba, rAbajo, h, seg), color,
    contorno && new THREE.CylinderGeometry(rArriba + T / 2, rAbajo + T / 2, h + T, seg));
}

export function cono(r, h, color, seg = 12, contorno = true) {
  return malla(new THREE.ConeGeometry(r, h, seg), color, contorno && new THREE.ConeGeometry(r + T * 0.8, h + T * 2, seg));
}

export function esfera(r, color, seg = 12, contorno = true) {
  const filas = Math.max(6, Math.round(seg * 0.66));
  return malla(new THREE.SphereGeometry(r, seg, filas), color, contorno && new THREE.SphereGeometry(r + T / 2, seg, filas));
}

// Cartel con texto que siempre mira a la cámara.
export function etiqueta(texto, { fondo = "#ffd23f", ancho = 2.4 } = {}) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = fondo;
  g.strokeStyle = "#1d1d1d";
  g.lineWidth = 10;
  g.beginPath(); g.roundRect(8, 8, 496, 112, 28); g.fill(); g.stroke();
  g.fillStyle = "#1d1d1d";
  g.font = "bold 56px Trebuchet MS, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(texto, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  s.scale.set(ancho, ancho / 4, 1);
  return s;
}
