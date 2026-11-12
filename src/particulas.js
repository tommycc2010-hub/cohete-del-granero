// Partículas simples: polvo, humo, vapor y destellos. Cada sistema es un THREE.Points
// cuyas posiciones se actualizan en JavaScript (pocas decenas o cientos por sistema).
import * as THREE from "three";

let texturaPunto = null;
// Textura redonda y difusa para que las partículas no se vean cuadradas.
export function texturaSuave() {
  if (texturaPunto) return texturaPunto;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  texturaPunto = new THREE.CanvasTexture(c);
  return texturaPunto;
}

// Crea un sistema de `n` partículas. `aditivo` hace que brillen (destellos, lava, vapor iluminado).
export function crearParticulas(n, { color = 0xffffff, tam = 1, opacidad = 0.8, aditivo = false } = {}) {
  const pos = new Float32Array(n * 3).fill(-9999);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size: tam, map: texturaSuave(), transparent: true, opacity: opacidad, depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true,
  });
  const puntos = new THREE.Points(geo, mat);
  puntos.frustumCulled = false;
  return {
    puntos, pos,
    poner(i, x, y, z) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; },
    listo() { geo.attributes.position.needsUpdate = true; },
  };
}

// Ráfaga de destellos que salen de un punto y se apagan (al recoger algo, al aterrizar…).
// Devuelve un objeto con actualizar(dt) que responde false cuando terminó.
export function crearRafaga(padre, x, y, z, { color = 0xffffff, n = 26, vel = 4, duracion = 0.7, tam = 0.35, gravedad = -3, aditivo = true } = {}) {
  const p = crearParticulas(n, { color, tam, aditivo, opacidad: 1 });
  const v = [];
  for (let i = 0; i < n; i++) {
    const d = new THREE.Vector3().randomDirection();
    d.y = Math.abs(d.y) * 0.8 + 0.2;
    v.push(d.multiplyScalar(vel * (0.4 + Math.random() * 0.6)));
    p.poner(i, x, y, z);
  }
  p.listo();
  padre.add(p.puntos);
  let t = 0;
  return {
    actualizar(dt) {
      t += dt;
      for (let i = 0; i < n; i++) {
        v[i].y += gravedad * dt;
        p.pos[i * 3] += v[i].x * dt; p.pos[i * 3 + 1] += v[i].y * dt; p.pos[i * 3 + 2] += v[i].z * dt;
      }
      p.listo();
      p.puntos.material.opacity = Math.max(0, 1 - t / duracion);
      if (t < duracion) return true;
      padre.remove(p.puntos);
      p.puntos.geometry.dispose();
      p.puntos.material.dispose();
      return false;
    },
  };
}
