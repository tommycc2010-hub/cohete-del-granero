// Escena final: el cohete flota sobre una grieta en el hielo de Europa y algo sube desde el océano.
// Es ficción: hoy no hay evidencia de vida en Europa.
import * as THREE from "three";
import { caja, toon } from "./estilo.js";
import { crearCohete } from "./cohete.js";
import { crearPlaneta } from "./espacio.js";
import { crearLlama } from "./efectos.js";

export const DURACION = 19; // segundos hasta que aparece la tarjeta final

export function crearFinal() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b1f);
  scene.fog = new THREE.Fog(0x070b1f, 90, 260);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4a6a8a, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.8);
  sol.position.set(-60, 50, 40);
  scene.add(sol);
  const brillo = new THREE.PointLight(0x4de3ff, 0, 60, 1.4); // luz que sale de la grieta
  brillo.position.set(0, 2, 0);
  scene.add(brillo);

  // Estrellas y Júpiter en el cielo
  const pos = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1500);
    v.y = Math.abs(v.y);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geoE = new THREE.BufferGeometry();
  geoE.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geoE, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false })));
  const jupiter = crearPlaneta("jupiter", 170);
  jupiter.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } });
  jupiter.position.set(-230, 190, -560);
  scene.add(jupiter);

  // Hielo: suelo, bloques y grietas
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(300, 40), toon(0xdcebf5));
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);
  const azar = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 46; i++) {
    const a = azar(0, Math.PI * 2), r = azar(16, 120), s = azar(1, 5);
    const b = caja(s * azar(0.8, 2), s, s * azar(0.8, 2), i % 3 ? 0xc4d9e8 : 0xeef6fb);
    b.position.set(Math.cos(a) * r, s * 0.3, Math.sin(a) * r);
    b.rotation.set(azar(-0.3, 0.3), azar(0, 3), azar(-0.3, 0.3));
    scene.add(b);
  }
  for (let i = 0; i < 30; i++) {
    const a = azar(0, Math.PI * 2), r = azar(10, 110);
    const g = caja(azar(6, 26), 0.05, 0.35, 0x9a6b4a, false);
    g.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    g.rotation.y = azar(0, 3);
    scene.add(g);
  }

  // Grieta central con agua que brilla
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(7, 30), new THREE.MeshBasicMaterial({ color: 0x0e3a5c }));
  agua.rotation.x = -Math.PI / 2;
  agua.position.y = 0.06;
  scene.add(agua);
  const matLuz = new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true, opacity: 0.2 });
  const luzAgua = new THREE.Mesh(new THREE.PlaneGeometry(4, 25), matLuz);
  luzAgua.rotation.x = -Math.PI / 2;
  luzAgua.position.y = 0.08;
  scene.add(luzAgua);
  for (let i = 0; i < 10; i++) { // bordes de hielo roto
    const lado = i % 2 ? 1 : -1, z = -13 + i * 2.8;
    const b = caja(azar(1.5, 3), azar(0.8, 2.2), azar(2, 3.4), 0xeef6fb);
    b.position.set(lado * azar(4.2, 5.2), 0.5, z);
    b.rotation.set(azar(-0.2, 0.2), azar(-0.4, 0.4), lado * azar(0.1, 0.4));
    scene.add(b);
  }

  // Ondas de la señal
  const aros = [];
  for (let i = 0; i < 4; i++) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true }));
    aro.rotation.x = Math.PI / 2;
    aro.userData.fase = i / 4;
    scene.add(aro);
    aros.push(aro);
  }

  // Vapor que sale de la grieta
  const vapor = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 7, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    p.userData = { fase: i / 10, x: azar(-1.5, 1.5), z: azar(-11, 11) };
    scene.add(p);
    vapor.push(p);
  }

  // Criaturas luminosas (parecidas a medusas) que suben desde el océano
  const COLORES = [0x4de3ff, 0x6ee37a, 0xe28bff, 0x8fe3f0, 0xffd23f];
  const criaturas = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: COLORES[i % COLORES.length], transparent: true, opacity: 0.9 });
    const s = azar(0.6, 1.3);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(s, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat));
    const tentaculos = [];
    for (let k = 0; k < 5; k++) {
      const tent = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 1.8 * s, 0.1 * s), mat);
      const a = k / 5 * Math.PI * 2;
      tent.position.set(Math.cos(a) * s * 0.55, -0.9 * s, Math.sin(a) * s * 0.55);
      g.add(tent);
      tentaculos.push(tent);
    }
    g.userData = { sale: 8.5 + i * 0.9, alto: azar(5, 17), radio: azar(4, 13), giro: azar(0.15, 0.4) * (i % 2 ? 1 : -1), fase: azar(0, 6), z0: azar(-10, 10), tentaculos };
    g.visible = false;
    scene.add(g);
    criaturas.push(g);
  }

  // Cohete flotando con la llama encendida
  const nave = new THREE.Group();
  scene.add(nave);
  const llama = crearLlama(0.92);
  llama.rotation.x = Math.PI;
  let modelo = null, t = 0;

  function iniciar(mejoras) {
    t = 0;
    if (modelo) nave.remove(modelo);
    modelo = crearCohete(mejoras);
    nave.add(modelo, llama);
    llama.position.y = -(modelo.userData.largo / 2 + 0.6 + 1.1);
    criaturas.forEach(c => { c.visible = false; });
    actualizar(0);
  }

  function actualizar(dt) {
    t += dt;
    const suave = x => x * x * (3 - 2 * x);

    // El cohete baja y se queda flotando junto a la grieta
    const baja = suave(Math.min(1, t / 3.5));
    nave.position.set(10, 46 - 35 * baja + Math.sin(t * 1.4) * 0.3, 5);
    nave.rotation.z = Math.sin(t * 0.9) * 0.03;
    llama.scale.set(0.92, 0.92 * (0.75 + Math.random() * 0.4), 0.92);

    // La señal: ondas y brillo que laten
    const fuerza = Math.min(1, Math.max(0, (t - 1) / 3));
    aros.forEach(aro => {
      const f = (t * 0.33 + aro.userData.fase) % 1;
      aro.scale.setScalar(1 + f * 26);
      aro.position.y = 0.3 + f * 1.5;
      aro.material.opacity = fuerza * 0.9 * (1 - f);
    });
    const latido = 0.5 + 0.5 * Math.sin(t * 3);
    matLuz.opacity = 0.2 + fuerza * (0.35 + 0.35 * latido);
    brillo.intensity = fuerza * (60 + 90 * latido);

    vapor.forEach(p => {
      const f = (t * 0.22 + p.userData.fase) % 1;
      p.position.set(p.userData.x + Math.sin(f * 5) * 0.6, f * 16, p.userData.z);
      p.scale.setScalar(0.6 + f * 3);
      p.material.opacity = 0.35 * (1 - f);
    });

    // Las criaturas salen de la grieta y luego dan vueltas alrededor del cohete
    criaturas.forEach(c => {
      const u = c.userData, vida = t - u.sale;
      c.visible = vida > 0;
      if (!c.visible) return;
      const sube = suave(Math.min(1, vida / 4));
      const a = u.fase + vida * u.giro;
      c.position.set(
        Math.cos(a) * u.radio * sube,
        -2 + (u.alto + 2) * sube + Math.sin(t * 1.2 + u.fase) * 0.5,
        u.z0 * (1 - sube) + Math.sin(a) * u.radio * sube);
      const pulso = 1 + Math.sin(t * 3 + u.fase) * 0.12;
      c.scale.set(pulso, 2 - pulso, pulso);
      u.tentaculos.forEach((tent, k) => { tent.rotation.x = Math.sin(t * 2.5 + k + u.fase) * 0.35; });
    });

    // Cámara: órbita lenta que se va acercando
    const ang = 0.9 + t * 0.07, dist = 40 - 9 * suave(Math.min(1, t / DURACION));
    camera.position.set(Math.cos(ang) * dist, 6 + Math.min(t, DURACION) * 0.25, Math.sin(ang) * dist);
    camera.lookAt(4, 7, 1);
    return t;
  }

  return { scene, camera, iniciar, actualizar };
}
