// Terreno low-poly: una malla de triángulos planos con color por cara.
import * as THREE from "three";
import { toon } from "./estilo.js";

// altura(x, z) -> metros.  color(x, z, h, pendiente, c) escribe el color de la cara en `c`.
export function crearTerreno({ tam, seg, altura, color }) {
  const n = seg + 1, celda = tam / seg, mitad = tam / 2;
  const H = new Float32Array(n * n);
  for (let iz = 0; iz < n; iz++)
    for (let ix = 0; ix < n; ix++) H[iz * n + ix] = altura(-mitad + ix * celda, -mitad + iz * celda);

  const pos = new Float32Array(seg * seg * 18), col = new Float32Array(seg * seg * 18);
  const c = new THREE.Color();
  const v = (ix, iz) => [-mitad + ix * celda, H[iz * n + ix], -mitad + iz * celda];
  let k = 0;
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = v(ix, iz), b = v(ix, iz + 1), cc = v(ix + 1, iz + 1), d = v(ix + 1, iz);
      for (const tri of [[a, b, d], [b, cc, d]]) {
        const ys = tri.map(p => p[1]);
        const pend = (Math.max(...ys) - Math.min(...ys)) / celda;
        color((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][2] + tri[1][2] + tri[2][2]) / 3, (ys[0] + ys[1] + ys[2]) / 3, pend, c);
        for (const p of tri) { pos.set(p, k); col.set([c.r, c.g, c.b], k); k += 3; }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = toon(0xffffff);
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  // Altura exacta de la malla en (x, z), para que el jugador pise justo el suelo que ve.
  function alturaEn(x, z) {
    const gx = Math.min(seg - 1e-4, Math.max(0, (x + mitad) / celda));
    const gz = Math.min(seg - 1e-4, Math.max(0, (z + mitad) / celda));
    const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, w = gz - iz;
    const a = H[iz * n + ix], d = H[iz * n + ix + 1], b = H[(iz + 1) * n + ix], c2 = H[(iz + 1) * n + ix + 1];
    return u + w <= 1 ? a + (d - a) * u + (b - a) * w : c2 + (b - c2) * (1 - u) + (d - c2) * (1 - w);
  }

  return { mesh, altura: alturaEn };
}
