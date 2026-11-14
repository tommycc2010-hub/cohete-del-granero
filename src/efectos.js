// Efectos del cohete en estilo toon: llama de 3 capas con contorno y nubes de humo/polvo sombreadas en 3 tonos.
import * as THREE from "three";
import { TINTA } from "./estilo.js";
import { texturaSuave } from "./particulas.js";

// ----- Llama: rojo por fuera, naranja y un núcleo casi blanco que brilla. -----
// Se arma como un ConeGeometry (punta hacia +Y) para poder usarla igual que el cono de antes.
export function crearLlama(escala = 1) {
  const g = new THREE.Group();
  const capa = (r, h, color, brillo) => {
    const geo = new THREE.ConeGeometry(r, h, 10, 1, true);
    geo.translate(0, -1.4 + h / 2, 0); // todas las capas salen de la misma base (la tobera)
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: !brillo }));
    g.add(m);
    return m;
  };
  const fuera = capa(0.62, 2.8, 0xff5a1f);
  const borde = new THREE.Mesh(fuera.geometry, new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide }));
  borde.scale.set(1.12, 1.04, 1.12);
  fuera.add(borde);
  const medio = capa(0.45, 2.1, 0xffa726);
  const nucleo = capa(0.26, 1.3, 0xfff3b0, true);
  // Resplandor en la tobera
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSuave(), color: 0xffc46b, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  brillo.position.y = -1.2;
  brillo.scale.setScalar(2.4);
  g.add(brillo);
  // Cada vez que se dibuja, las capas tiemblan un poco por separado
  fuera.onBeforeRender = () => {
    const t = performance.now() / 1000;
    medio.scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(t * 31)), 1);
    nucleo.scale.set(1, 0.8 + 0.3 * Math.random(), 1);
    brillo.material.opacity = 0.55 + 0.35 * Math.random();
  };
  g.scale.setScalar(escala);
  return g;
}

// ----- Bocanada facetada con 3 tonos según hacia dónde mira cada cara (el color lo pone el material) -----
let geoBocanadaCache = null;
export function geoBocanada() {
  if (geoBocanadaCache) return geoBocanadaCache;
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
  const pos = g.attributes.position, col = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const luz = n.y * 0.8 + n.x * 0.35 + n.z * 0.25;
    const k = luz > 0.25 ? 1 : luz > -0.3 ? 0.84 : 0.68;
    for (let j = 0; j < 3; j++) col.push(k, k, k);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return (geoBocanadaCache = g);
}

// ----- Humo del despegue: bocanadas que salen en anillo desde la base y suben creciendo -----
export function crearHumoDespegue(n = 26) {
  const grupo = new THREE.Group();
  grupo.visible = false;
  const geo = geoBocanada();
  const borde = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide, transparent: true });
  const bocanadas = [];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: i % 3 ? 0xf2f2f2 : 0xd9d9d9, vertexColors: true, transparent: true });
    const m = new THREE.Mesh(geo, mat);
    const b = new THREE.Mesh(geo, borde.clone());
    b.scale.setScalar(1.06);
    m.add(b);
    m.userData = { ang: i / n * Math.PI * 2 + Math.random() * 0.25, fase: Math.random() * 0.6, sube: 0.4 + Math.random() * 0.8, giro: Math.random() * 3 };
    grupo.add(m);
    bocanadas.push(m);
  }
  return {
    grupo,
    // t: segundos desde el encendido. (x, y, z): dónde está la base del cohete en el suelo.
    actualizar(t, x, y, z) {
      grupo.visible = t > 0;
      grupo.position.set(x, y, z);
      for (const m of bocanadas) {
        const u = m.userData, f = Math.min(1, Math.max(0, (t - u.fase) / 3.2));
        const r = 1.2 + 6.5 * Math.sqrt(f);
        m.visible = f > 0;
        m.position.set(Math.cos(u.ang) * r, 0.6 + f * f * 6 * u.sube, Math.sin(u.ang) * r);
        m.scale.setScalar(0.6 + f * 2.2);
        m.rotation.set(u.giro * f, u.giro, 0);
        const op = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;
        m.material.opacity = op;
        m.children[0].material.opacity = op;
      }
    },
    ocultar() { grupo.visible = false; },
  };
}
