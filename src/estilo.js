// Estilo visual: materiales toon de 3 tonos y contorno negro por "casco invertido".
import * as THREE from "three";

export const TINTA = 0x1d1d1d;

const gradiente = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter;
gradiente.needsUpdate = true;

const matContorno = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });

// ----- Textura procedural, en el mismo estilo que la lava -----
// Se calcula en la GPU según la posición en el mundo (no hay imágenes): placas con grietas, grano,
// manchas de tono y todo por bandas, para que encaje con el sombreado toon de 3 tonos.
// Tipos: general (casi todo), roca, suelo (planetas), pasto (granero), madera.
const TIPOS = { general: 0, roca: 1, suelo: 2, pasto: 3, madera: 4 };
const GLSL_TEXTURA = /* glsl */`
  varying vec3 vPosMundo;
  varying vec3 vNorMundo;
  vec2 txH2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  float txRuido(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(txH2(i).x, txH2(i + vec2(1, 0)).x, u.x), mix(txH2(i + vec2(0, 1)).x, txH2(i + vec2(1, 1)).x, u.x), u.y);
  }
  float txFbm(vec2 p) { float v = 0.0, a = 0.5; for (int k = 0; k < 3; k++) { v += a * txRuido(p); p *= 2.07; a *= 0.5; } return v; }
  // x: distancia al borde de la placa (0 en la grieta) · y: tono propio de cada placa
  vec2 txPlacas(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)), o = txH2(i + g), r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = o.x; } else if (d < d2) d2 = d;
    }
    return vec2(sqrt(d2) - sqrt(d1), id);
  }
  // Placas deformadas, como la costra de la lava: nada de baldosas regulares
  vec2 txPlacasW(vec2 p) { return txPlacas(p + (vec2(txFbm(p * 0.45), txFbm(p * 0.45 + 7.3)) - 0.5) * 1.3); }
  float txBandas(float v, float n) { return floor(v * n + 0.5) / n; }
  // Roca: placas con grietas oscuras, como la costra de la lava
  float txRoca(vec2 q, float escala) {
    vec2 c = txPlacasW(q * escala);
    float k = 0.84 + 0.26 * txBandas(c.y, 3.0);
    k *= mix(0.5, 1.0, smoothstep(0.0, 0.08, c.x));
    k *= 1.0 - 0.14 * step(0.62, txRuido(q * escala * 3.5));
    return k;
  }
  float textura(vec3 p, vec3 n) {
    vec2 q = abs(n.y) > 0.6 ? p.xz : (abs(n.x) > abs(n.z) ? p.zy : p.xy); // proyección según hacia dónde mira la cara
    float k = 1.0;
    #if TX_TIPO == 0
      k *= 0.97 + 0.05 * txBandas(txFbm(q * 0.9), 3.0);                  // muy suave: solo da algo de vida
      k *= 1.0 - 0.04 * step(0.72, txRuido(q * 7.0));
    #elif TX_TIPO == 1
      k = txRoca(q, 1.6);
    #elif TX_TIPO == 2
      vec2 c = txPlacasW(q * 0.42);
      k *= 0.9 + 0.16 * txBandas(c.y, 3.0);
      k *= mix(0.68, 1.0, smoothstep(0.0, 0.05, c.x));
      k *= 1.0 - 0.1 * step(0.64, txRuido(q * 2.6));
      k *= 0.94 + 0.12 * txBandas(txFbm(q * 0.12), 3.0);
      k = mix(k, txRoca(q, 0.9), smoothstep(0.82, 0.6, n.y));       // en las pendientes, roca agrietada
    #elif TX_TIPO == 3
      k *= 0.92 + 0.15 * txBandas(txFbm(q * 0.22), 4.0);
      k *= 1.0 - 0.07 * step(0.66, txRuido(q * 3.2));
      k *= 1.0 + 0.06 * step(0.72, txRuido(q * 2.1 + 7.0));
      k = mix(k, txRoca(q, 0.7), smoothstep(0.78, 0.55, n.y));      // laderas de roca en las montañas
    #elif TX_TIPO == 4
      float tabla = fract(q.x * 2.5);                                   // tablas de unos 40 cm
      k *= 0.9 + 0.14 * txBandas(txH2(vec2(floor(q.x * 2.5), 3.0)).x, 3.0);
      k *= mix(0.62, 1.0, smoothstep(0.0, 0.05, tabla) * smoothstep(1.0, 0.95, tabla));
      k *= 1.0 - 0.08 * step(0.6, txRuido(vec2(q.x * 18.0, q.y * 1.5)));   // vetas
    #endif
    return k;
  }`;

function texturizar(m, tipo) {
  const n = TIPOS[tipo] ?? 0;
  m.defines = { ...(m.defines || {}), TX_TIPO: n };
  m.onBeforeCompile = sh => {
    sh.vertexShader = "varying vec3 vPosMundo;\nvarying vec3 vNorMundo;\n" + sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
      vec4 txp = vec4(transformed, 1.0);
      vec3 txn = objectNormal;
      #ifdef USE_INSTANCING
        txp = instanceMatrix * txp;
        txn = mat3(instanceMatrix) * txn;
      #endif
      vPosMundo = (modelMatrix * txp).xyz;
      vNorMundo = normalize(mat3(modelMatrix) * txn);`);
    sh.fragmentShader = GLSL_TEXTURA + "\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      diffuseColor.rgb *= textura(vPosMundo, normalize(vNorMundo));`);
  };
  m.customProgramCacheKey = () => "tx" + n;
  return m;
}

// tipo: "general" (por defecto), "roca", "suelo", "pasto" o "madera"
export function toon(color, tipo = "general") {
  return texturizar(new THREE.MeshToonMaterial({ color, gradientMap: gradiente }), tipo);
}

// Cambia la textura de una malla (y de sus hijas con material toon), conservando el color
export function conTextura(obj, tipo) {
  obj.traverse(o => { if (o.material && o.material.isMeshToonMaterial) o.material = toon(o.material.color.getHex(), tipo); });
  return obj;
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

// Palo (cilindro) que va de un punto `a` a otro `b`: patas, cables, tirantes…
const ARRIBA = new THREE.Vector3(0, 1, 0);
export function palo(a, b, r, color, contorno = true) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = cilindro(r, r, dir.length(), color, 6, contorno);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(ARRIBA, dir.normalize());
  return m;
}

// Cuerda que une varios puntos con tramos rectos (guirnaldas, banderines)
export function cuerda(puntos, r = 0.018, color = 0x2a2a2a) {
  const g = new THREE.Group();
  for (let i = 0; i < puntos.length - 1; i++) g.add(palo(puntos[i], puntos[i + 1], r, color, false));
  return g;
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
  let tam = 56; // el texto largo se achica para que no se corte
  do { g.font = `bold ${tam}px Trebuchet MS, sans-serif`; tam -= 2; } while (g.measureText(texto).width > 450 && tam > 24);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(texto, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  s.scale.set(ancho, ancho / 4, 1);
  return s;
}
