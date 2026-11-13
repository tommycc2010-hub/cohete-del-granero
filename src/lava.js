// Charcos de lava con aspecto creíble pero en el estilo del juego (toon: colores por bandas y borde oscuro).
// - La superficie es un shader: placas de costra enfriada separadas por grietas que brillan, zonas fundidas
//   que se mueven despacio, y la orilla más fría y oscura (la lava se enfría primero por los bordes).
// - Alrededor, un reborde de roca y piedras; encima, brasas que suben.
// Paletas por lugar: Venus (lava basáltica naranja), Ío (lava muy caliente, casi amarilla, con costra negra)
// y Mercurio (roca al rojo vivo: casi todo costra, con grietas encendidas).
import * as THREE from "three";
import { toon } from "./estilo.js";
import { crearParticulas } from "./particulas.js";

export const PALETAS = {
  venus:    { caliente: 0xffc24a, medio: 0xff5a1a, costra: 0x2a140c, roca: 0x3b2a20, cubierta: 0.12, brasas: 0xffb060 },
  jupiter:  { caliente: 0xfff07a, medio: 0xff8a1a, costra: 0x1c140c, roca: 0x2e261a, cubierta: 0.05, brasas: 0xffe08a },
  mercurio: { caliente: 0xff9a4a, medio: 0xd8381a, costra: 0x3a2f28, roca: 0x5a5048, cubierta: 0.85, brasas: 0xff7a3a },
};

const tiempo = { value: 0 }; // compartido por todos los charcos

const VERTICE = /* glsl */`
  varying vec3 vMundo;
  #include <fog_pars_vertex>
  void main() {
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vMundo = mundo.xyz;
    vec4 mvPosition = viewMatrix * mundo;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAGMENTO = /* glsl */`
  uniform float t, cubierta, radio;
  uniform vec3 caliente, medio, costra;
  uniform vec2 centro;
  varying vec3 vMundo;
  #include <fog_pars_fragment>

  vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i).x, h2(i + vec2(1, 0)).x, u.x), mix(h2(i + vec2(0, 1)).x, h2(i + vec2(1, 1)).x, u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * ruido(p); p *= 2.03; a *= 0.5; } return v; }
  // Distancia al borde de la celda más cercana (0 justo en la grieta entre dos placas de costra)
  float grietas(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)), o = h2(i + g);
      o = 0.5 + 0.38 * sin(t * 0.18 + 6.2831 * o); // las placas derivan despacio
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return sqrt(d2) - sqrt(d1);
  }

  void main() {
    vec2 p = vMundo.xz;
    float dc = clamp(length(p - centro) / radio, 0.0, 1.0);          // 0 en el centro, 1 en la orilla
    vec2 flujo = p * 0.6 + vec2(t * 0.04, t * 0.025) + (vec2(fbm(p * 0.25 + t * 0.03), fbm(p * 0.25 - t * 0.03)) - 0.5) * 1.6;
    float borde = grietas(flujo);
    float ancho = mix(0.16, 0.05, cubierta) * (1.0 - 0.5 * dc);       // grietas más finas cerca de la orilla
    float grieta = 1.0 - smoothstep(0.0, ancho, borde);
    float calor = fbm(p * 0.7 - vec2(t * 0.12, t * 0.07));
    float fundido = smoothstep(0.40, 0.58, calor) * (1.0 - cubierta) * (1.0 - dc * 0.6);
    // Como en los lagos de lava reales (Loki, en Ío): junto a la orilla la costra se rompe y brilla
    float orilla = smoothstep(0.74, 0.84, dc) * (1.0 - smoothstep(0.86, 0.92, dc)) * (0.55 + 0.45 * ruido(p * 1.5 + t * 0.2));
    float g = clamp(max(max(grieta, fundido) - dc * dc * 0.2, orilla * (1.0 - cubierta * 0.6)), 0.0, 1.0);
    g = floor(g * 4.0 + 0.5) / 4.0;                                    // por bandas, como el resto del juego

    vec3 c = mix(costra, medio, smoothstep(0.15, 0.5, g));
    c = mix(c, caliente * 1.7, smoothstep(0.6, 0.95, g));             // lo más caliente brilla (bloom)
    c *= 1.0 + 0.12 * sin(t * 1.7 + calor * 7.0);                      // late despacio
    float grano = step(0.62, ruido(p * 3.5)) * (1.0 - g);              // textura de la costra
    c = mix(c, costra * 0.55, grano * 0.6);
    c = mix(c, costra * 1.6 + 0.04, (1.0 - g) * smoothstep(0.45, 0.8, ruido(p * 1.3 + 9.0)) * 0.35); // costra más gris en placas viejas
    c = mix(c, vec3(0.06, 0.05, 0.05), smoothstep(0.95, 1.0, dc));     // contorno oscuro
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

const materiales = {};
function materialBase(dest) {
  if (materiales[dest]) return materiales[dest];
  const pal = PALETAS[dest];
  const m = new THREE.ShaderMaterial({
    vertexShader: VERTICE, fragmentShader: FRAGMENTO, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      cubierta: { value: pal.cubierta }, radio: { value: 5 }, centro: { value: new THREE.Vector2() },
      caliente: { value: new THREE.Color(pal.caliente) }, medio: { value: new THREE.Color(pal.medio) }, costra: { value: new THREE.Color(pal.costra) },
    }]),
  });
  m.uniforms.t = tiempo;
  materiales[dest] = m;
  return m;
}

// Superficie que sigue el relieve: anillos alrededor del centro, con la orilla irregular
function geometriaCharco(x, z, radio, altura, forma, anillos = 7, lados = 36, alzado = 0.1) {
  const pos = [x, altura(x, z) + alzado, z], idx = [];
  for (let a = 1; a <= anillos; a++) {
    for (let s = 0; s < lados; s++) {
      const ang = s / lados * Math.PI * 2, r = radio * (a / anillos) * forma(ang);
      const px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
      pos.push(px, altura(px, pz) + alzado, pz);
    }
  }
  const v = (a, s) => (a === 0 ? 0 : 1 + (a - 1) * lados + (s % lados));
  for (let a = 0; a < anillos; a++) {
    for (let s = 0; s < lados; s++) {
      if (a === 0) idx.push(0, v(1, s + 1), v(1, s));
      else idx.push(v(a, s), v(a, s + 1), v(a + 1, s), v(a, s + 1), v(a + 1, s + 1), v(a + 1, s));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Reborde de roca: un anillo levantado que sigue el relieve
function geometriaReborde(x, z, radio, altura, forma, lados = 36) {
  const pos = [], idx = [];
  const anillo = [[0.96, 0.22], [1.08, 0.38], [1.22, 0.05]]; // [radio relativo, altura sobre el suelo]
  for (const [k, h] of anillo) {
    for (let s = 0; s < lados; s++) {
      const ang = s / lados * Math.PI * 2, r = radio * k * forma(ang);
      const px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
      pos.push(px, altura(px, pz) + h, pz);
    }
  }
  for (let a = 0; a < anillo.length - 1; a++) for (let s = 0; s < lados; s++) {
    const i0 = a * lados + s, i1 = a * lados + (s + 1) % lados, j0 = i0 + lados, j1 = i1 + lados;
    idx.push(i0, j0, i1, i1, j0, j1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const matBorde = new THREE.MeshBasicMaterial({ color: 0x1d1d1d, side: THREE.BackSide });

// Crea un charco de lava en (x, z). Devuelve { grupo, actualizar(dt) }.
export function crearLava(dest, x, z, radio, altura, azar) {
  const pal = PALETAS[dest];
  const grupo = new THREE.Group();
  // Orilla irregular: cada charco tiene su forma
  const f1 = azar() * 6, f2 = azar() * 6, k1 = 0.08 + azar() * 0.06, k2 = 0.05 + azar() * 0.05;
  const forma = a => 1 + k1 * Math.sin(3 * a + f1) + k2 * Math.sin(5 * a + f2);

  const mat = materialBase(dest).clone();
  mat.uniforms.t = tiempo;
  mat.uniforms.centro.value.set(x, z);
  mat.uniforms.radio.value = radio;
  grupo.add(new THREE.Mesh(geometriaCharco(x, z, radio, altura, forma), mat));

  const roca = toon(pal.roca);
  roca.flatShading = true;
  const reborde = new THREE.Mesh(geometriaReborde(x, z, radio, altura, forma), roca);
  reborde.receiveShadow = true;
  grupo.add(reborde);

  // Piedras sueltas en la orilla, con contorno
  const geoPiedra = new THREE.IcosahedronGeometry(1, 0);
  const nPiedras = 5 + Math.floor(azar() * 5);
  for (let i = 0; i < nPiedras; i++) {
    const a = azar() * Math.PI * 2, r = radio * forma(a) * (1.05 + azar() * 0.15), s = 0.25 + azar() * 0.45;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const p = new THREE.Mesh(geoPiedra, roca);
    p.scale.set(s * (0.8 + azar() * 0.6), s * 0.7, s);
    p.rotation.set(azar() * 3, azar() * 3, azar() * 3);
    p.position.set(px, altura(px, pz) + s * 0.3, pz);
    p.castShadow = true;
    const b = new THREE.Mesh(geoPiedra, matBorde);
    b.scale.setScalar(1.1);
    p.add(b);
    grupo.add(p);
  }

  // Brasas que saltan y suben desde la superficie
  const N = 14, brasas = crearParticulas(N, { color: pal.brasas, tam: 0.32, aditivo: true, opacidad: 0.95 });
  grupo.add(brasas.puntos);
  const chispas = Array.from({ length: N }, () => ({ a: azar() * 6.28, r: azar() * 0.8, f: azar(), v: 0.25 + azar() * 0.35 }));

  return {
    grupo,
    actualizar(dt) {
      for (let i = 0; i < N; i++) {
        const c = chispas[i];
        c.f += dt * c.v;
        if (c.f > 1) { c.f = 0; c.a = Math.random() * 6.28; c.r = Math.random() * 0.8; }
        const px = x + Math.cos(c.a) * c.r * radio, pz = z + Math.sin(c.a) * c.r * radio;
        brasas.poner(i, px + Math.sin(c.f * 9 + i) * 0.3, altura(px, pz) + 0.2 + c.f * 3.2, pz + Math.cos(c.f * 7 + i) * 0.3);
      }
      brasas.listo();
    },
  };
}

// Se llama una vez por fotograma: avanza el tiempo de todas las superficies de lava
export function avanzarLava(dt) { tiempo.value += dt; }
export const tieneLava = dest => !!PALETAS[dest];
