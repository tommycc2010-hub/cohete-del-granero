// Paisaje del granero: cielo por bandas con sol, nubes esponjosas, pasto y flores que se mueven con el viento,
// lago con ondas, juncos y nenúfares, mariposas y bandadas de pájaros. Todo con código y en el estilo toon.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toon, TINTA } from "./estilo.js";
import { azarSemilla } from "./ruido.js";

const tiempo = { value: 0 };

// Material toon que se mece con el viento (pasto, flores, juncos). `fuerza`: cuánto se dobla la punta.
function conViento(m, fuerza = 0.12, clave = "viento") {
  const previo = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    previo(sh);
    sh.uniforms.uTiempo = tiempo;
    sh.vertexShader = "uniform float uTiempo;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float fase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
      #else
        float fase = 0.0;
      #endif
      float ola = sin(uTiempo * 1.7 + fase) + 0.5 * sin(uTiempo * 3.1 + fase * 1.7);
      transformed.x += ola * ${fuerza.toFixed(3)} * max(position.y, 0.0);
      transformed.z += cos(uTiempo * 1.2 + fase) * ${(fuerza * 0.5).toFixed(3)} * max(position.y, 0.0);`);
  };
  const clavePrevia = m.customProgramCacheKey;
  m.customProgramCacheKey = () => clavePrevia() + clave + fuerza;
  return m;
}

// ----- Cielo: degradado por bandas (como el sombreado toon) y un sol con contorno -----
function crearCielo(dirSol) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cenit: { value: new THREE.Color(0x4fa8e6) }, medio: { value: new THREE.Color(0x8ed1f0) }, horizonte: { value: new THREE.Color(0xbfe6f5) },
      sol: { value: dirSol.clone().normalize() },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 cenit, medio, horizonte, sol; varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        float b = floor(pow(h, 0.55) * 5.0) / 5.0;        // bandas, no degradado liso
        vec3 c = mix(horizonte, medio, smoothstep(0.0, 0.4, b));
        c = mix(c, cenit, smoothstep(0.4, 1.0, b));
        if (vDir.y < 0.0) c = horizonte;
        float s = dot(normalize(vDir), sol);
        c = mix(c, vec3(1.0, 0.97, 0.82), step(0.985, s) * 0.35);               // halo
        c = mix(c, vec3(0.114), step(0.9962, s));                                // contorno del sol
        c = mix(c, vec3(1.0, 0.86, 0.3), step(0.9968, s));                       // sol
        c = mix(c, vec3(1.0, 0.95, 0.62), step(0.9985, s));                      // centro más claro
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

// ----- Nube esponjosa: bolas facetadas con contorno, sombreadas en 3 tonos según hacia dónde mira cada cara -----
const matNube = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
const matNubeBorde = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide, fog: false });
const TONOS_NUBE = [new THREE.Color(0xffffff), new THREE.Color(0xe6f3fb), new THREE.Color(0xbcd9ee)];
function geoBola(r) {
  const g = new THREE.IcosahedronGeometry(r, 1).toNonIndexed();
  g.scale(1, 0.7, 1);
  const pos = g.attributes.position, col = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const luz = n.y * 0.8 + n.x * 0.35 + n.z * 0.2; // el sol viene de arriba y un poco de lado
    const t = TONOS_NUBE[luz > 0.25 ? 0 : luz > -0.3 ? 1 : 2];
    for (let k = 0; k < 3; k++) col.push(t.r, t.g, t.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}
function nube(azar, escala) {
  const g = new THREE.Group();
  const n = 5 + Math.floor(azar() * 4);
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 4.2 : 2.2 + azar() * 2.4;
    const x = i === 0 ? 0 : (azar() - 0.5) * 14, z = (azar() - 0.5) * 5;
    const y = (i === 0 ? 0.6 : (azar() - 0.4) * 1.4) - Math.abs(x) * 0.08;  // más alta al centro
    const geo = geoBola(r);
    const bola = new THREE.Mesh(geo, matNube);
    bola.position.set(x, y, z);
    const borde = new THREE.Mesh(geo, matNubeBorde);
    borde.scale.setScalar(1.045);
    bola.add(borde);
    g.add(bola);
  }
  g.scale.setScalar(escala);
  return g;
}

// ----- Pasto: tres hojas finas en abanico -----
function geoMata() {
  const hojas = [-0.5, 0, 0.5].map((a, i) => {
    const h = new THREE.ConeGeometry(0.07, 0.55 + (i === 1 ? 0.2 : 0), 3, 1);
    h.translate(0, (0.55 + (i === 1 ? 0.2 : 0)) / 2, 0);
    h.rotateZ(a * 0.6);
    h.rotateY(i * 2.1);
    return h;
  });
  return mergeGeometries(hojas);
}

// libre(x, z): true si ahí se puede poner pasto (no hay casa, camino, lago, plaza ni roca)
export function crearPaisaje({ scene, altura, libre, lago, dirSol }) {
  const azar = azarSemilla(77);
  scene.background = null;
  scene.add(crearCielo(dirSol));

  // ----- Nubes -----
  const nubes = [];
  for (let i = 0; i < 16; i++) {
    const a = azar() * Math.PI * 2, d = 60 + azar() * 260;
    const n = nube(azar, 1.1 + azar() * 1.2);
    n.position.set(Math.cos(a) * d, 46 + azar() * 22, Math.sin(a) * d);
    n.rotation.y = azar() * Math.PI;
    n.userData.vel = 0.5 + azar() * 0.6;
    scene.add(n);
    nubes.push(n);
  }

  // ----- Pasto y flores (miles, en una sola llamada de dibujo cada uno) -----
  const tmp = new THREE.Object3D(), color = new THREE.Color();
  const puntos = [];
  for (let i = 0; i < 26000 && puntos.length < 5200; i++) {
    const r = Math.sqrt(azar()) * 150, a = azar() * Math.PI * 2;
    const x = -25 + Math.cos(a) * r, z = 20 + Math.sin(a) * r;
    if (!libre(x, z)) continue;
    const y = altura(x, z);
    if (Math.abs(altura(x + 1, z) - y) > 0.8) continue; // en las pendientes fuertes no
    puntos.push([x, y, z]);
  }
  const nPasto = Math.floor(puntos.length * 0.8);
  const matPasto = conViento(toon(0xffffff), 0.16, "pasto");
  const pasto = new THREE.InstancedMesh(geoMata(), matPasto, nPasto);
  const verdes = [0x5fae55, 0x6fbf63, 0x7fcf6c, 0x8ad37c, 0x9ad77e];
  for (let i = 0; i < nPasto; i++) {
    const [x, y, z] = puntos[i];
    tmp.position.set(x, y - 0.05, z);
    tmp.rotation.set(0, azar() * Math.PI * 2, 0);
    tmp.scale.setScalar(0.7 + azar() * 0.9);
    tmp.updateMatrix();
    pasto.setMatrixAt(i, tmp.matrix);
    pasto.setColorAt(i, color.setHex(verdes[Math.floor(azar() * verdes.length)]));
  }
  pasto.receiveShadow = true;
  scene.add(pasto);

  const nFlores = puntos.length - nPasto;
  const geoTallo = new THREE.CylinderGeometry(0.025, 0.03, 0.5, 4); geoTallo.translate(0, 0.25, 0);
  const geoFlor = mergeGeometries([
    new THREE.IcosahedronGeometry(0.13, 0).translate(0, 0.55, 0),
    ...[0, 1, 2, 3, 4].map(k => new THREE.SphereGeometry(0.09, 5, 3).scale(1, 0.45, 1).translate(Math.cos(k * 1.257) * 0.14, 0.53, Math.sin(k * 1.257) * 0.14)),
  ].map(g => g.toNonIndexed()));
  const tallos = new THREE.InstancedMesh(geoTallo, conViento(toon(0x4c9a45), 0.16, "tallo"), nFlores);
  const flores = new THREE.InstancedMesh(geoFlor, conViento(toon(0xffffff), 0.16, "flor"), nFlores);
  const COLORES_FLOR = [0xffffff, 0xffd23f, 0xff8fb8, 0xb58cff, 0xff7a4d, 0x7fd4ff];
  const lugaresFlor = [];
  for (let i = 0; i < nFlores; i++) {
    const [x, y, z] = puntos[nPasto + i];
    tmp.position.set(x, y - 0.03, z);
    tmp.rotation.set(0, azar() * Math.PI * 2, 0);
    tmp.scale.setScalar(0.8 + azar() * 0.6);
    tmp.updateMatrix();
    tallos.setMatrixAt(i, tmp.matrix);
    flores.setMatrixAt(i, tmp.matrix);
    flores.setColorAt(i, color.setHex(COLORES_FLOR[Math.floor(azar() * COLORES_FLOR.length)]));
    if (Math.hypot(x, z) < 60) lugaresFlor.push([x, y, z]);
  }
  scene.add(tallos, flores);

  // ----- Lago: ondas por bandas, espuma en la orilla, juncos y nenúfares -----
  const matAgua = new THREE.ShaderMaterial({
    uniforms: { uTiempo: tiempo, radio: { value: lago.r } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTiempo, radio; varying vec2 vP;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
      float ruido(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
      void main() {
        float d = length(vP) / radio;
        vec3 c = mix(vec3(0.29, 0.64, 0.91), vec3(0.18, 0.47, 0.78), step(0.55, 1.0 - d));   // más hondo al centro
        float o = ruido(vP * 0.35 + vec2(uTiempo * 0.25, uTiempo * 0.17)) + 0.5 * ruido(vP * 0.8 - uTiempo * 0.3);
        c = mix(c, vec3(0.62, 0.86, 0.98), step(1.18, o));                                // brillos de las ondas
        float anillo = fract(d * 6.0 - uTiempo * 0.12);
        c = mix(c, vec3(0.45, 0.76, 0.95), step(0.93, anillo) * step(d, 0.85) * 0.6);
        c = mix(c, vec3(0.94, 0.98, 1.0), step(0.93 + 0.03 * sin(atan(vP.y, vP.x) * 9.0 + uTiempo), d));    // espuma
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const agua = new THREE.Mesh(new THREE.CircleGeometry(lago.r, 48), matAgua);
  agua.rotation.x = -Math.PI / 2;
  agua.position.set(lago.x, lago.y, lago.z);
  scene.add(agua);
  const matHoja = toon(0x4fae58);
  for (let i = 0; i < 14; i++) {
    const a = azar() * Math.PI * 2, d = 6 + azar() * (lago.r - 10);
    const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0.9 + azar() * 0.5, 0.9, 0.06, 10, 1, false, 0.5, Math.PI * 2 - 0.5), matHoja);
    hoja.position.set(lago.x + Math.cos(a) * d, lago.y + 0.05, lago.z + Math.sin(a) * d);
    hoja.rotation.y = azar() * Math.PI * 2;
    if (azar() < 0.4) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), toon(azar() < 0.5 ? 0xffffff : 0xff9fc6));
      f.position.y = 0.2;
      hoja.add(f);
    }
    scene.add(hoja);
  }
  const geoJunco = mergeGeometries([0, 1, 2, 3].map(k => {
    const g = new THREE.CylinderGeometry(0.04, 0.06, 2.2 + k * 0.3, 4);
    g.translate(Math.cos(k * 1.7) * 0.25, (2.2 + k * 0.3) / 2, Math.sin(k * 1.7) * 0.25);
    return g.toNonIndexed();
  }).concat([new THREE.CylinderGeometry(0.11, 0.11, 0.5, 6).translate(0, 2.5, 0).toNonIndexed()]));
  const juncos = new THREE.InstancedMesh(geoJunco, conViento(toon(0x6f9a3e), 0.06, "junco"), 40);
  for (let i = 0; i < 40; i++) {
    const a = azar() * Math.PI * 2, d = lago.r - 1 + azar() * 2.5;
    const x = lago.x + Math.cos(a) * d, z = lago.z + Math.sin(a) * d;
    tmp.position.set(x, Math.max(lago.y, altura(x, z)) - 0.2, z);
    tmp.rotation.set(0, azar() * 6, 0);
    tmp.scale.setScalar(0.8 + azar() * 0.5);
    tmp.updateMatrix();
    juncos.setMatrixAt(i, tmp.matrix);
  }
  scene.add(juncos);

  // ----- Mariposas: dos alas que aletean, revoloteando cerca de las flores -----
  const mariposas = [];
  const geoAla = new THREE.CircleGeometry(0.16, 6).translate(0.15, 0, 0);
  for (let i = 0; i < 14 && lugaresFlor.length; i++) {
    const [x, y, z] = lugaresFlor[Math.floor(azar() * lugaresFlor.length)];
    const mat = new THREE.MeshBasicMaterial({ color: COLORES_FLOR[1 + Math.floor(azar() * 5)], side: THREE.DoubleSide });
    const g = new THREE.Group();
    const alas = [1, -1].map(lado => { const a = new THREE.Mesh(geoAla, mat); a.scale.x = lado; a.rotation.x = -Math.PI / 2; const p = new THREE.Group(); p.add(a); g.add(p); return p; });
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), new THREE.MeshBasicMaterial({ color: TINTA }));
    g.add(cuerpo);
    g.userData = { cx: x, cy: y + 0.9, cz: z, fase: azar() * 10, alas };
    scene.add(g);
    mariposas.push(g);
  }

  // ----- Pájaros: bandadas en V que dan vueltas a lo lejos -----
  const bandadas = [];
  const matPajaro = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.DoubleSide });
  const geoPajaro = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.9, 0.25, 0), new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(0, 0, -0.12),
    new THREE.Vector3(0.9, 0.25, 0), new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(0, 0, 0.12)]);
  for (let b = 0; b < 3; b++) {
    const g = new THREE.Group();
    const pajaros = [];
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(geoPajaro, matPajaro);
      const fila = Math.ceil(k / 2), lado = k % 2 ? 1 : -1;
      p.position.set(lado * fila * 2.2, 0, -fila * 2.4);
      g.add(p); pajaros.push(p);
    }
    g.userData = { r: 90 + b * 55, y: 55 + b * 8, vel: 0.05 + b * 0.015, fase: b * 2.1, pajaros };
    scene.add(g);
    bandadas.push(g);
  }

  let t = 0;
  function actualizar(dt) {
    t += dt;
    tiempo.value = t;
    for (const n of nubes) { n.position.x += dt * n.userData.vel; if (n.position.x > 330) n.position.x = -330; }
    for (const m of mariposas) {
      const u = m.userData, f = t * 0.7 + u.fase;
      const x = u.cx + Math.sin(f) * 2.2 + Math.sin(f * 2.3) * 0.6, z = u.cz + Math.cos(f * 0.8) * 2.2;
      const y = u.cy + Math.sin(f * 3.1) * 0.35;
      m.rotation.y = Math.atan2(x - m.position.x, z - m.position.z);
      m.position.set(x, y, z);
      const aleteo = Math.sin(t * 22 + u.fase) * 0.9;
      u.alas[0].rotation.z = aleteo; u.alas[1].rotation.z = -aleteo;
    }
    for (const g of bandadas) {
      const u = g.userData, a = t * u.vel + u.fase;
      g.position.set(-20 + Math.cos(a) * u.r, u.y + Math.sin(t * 0.4 + u.fase) * 2, 10 + Math.sin(a) * u.r);
      g.rotation.y = -a + Math.PI; // de frente al sentido de la vuelta
      u.pajaros.forEach((p, k) => { p.scale.y = 0.4 + 0.8 * Math.abs(Math.sin(t * 6 + k)); });
    }
  }
  return { actualizar };
}
