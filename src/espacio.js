// Escena espacial: el cohete vuela cerca del planeta de destino y recoge objetos.
import * as THREE from "three";
import { toon, TINTA } from "./estilo.js";
import { crearCohete } from "./cohete.js";

const matContorno = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });
const LIMITE = 330;      // radio de la zona de vuelo
const RADIO_RECOGER = 4.5;

// ----- Texturas de planetas dibujadas en un canvas (datos visuales de ejemplo) -----
function texturaPlaneta(tipo) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  const azar = (a, b) => a + Math.random() * (b - a);
  const manchas = (n, color, rMin, rMax) => {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(azar(0, 512), azar(20, 236), azar(rMin, rMax), azar(rMin, rMax) * 0.7, 0, 0, 7); g.fill(); }
  };
  const bandas = colores => colores.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 256 / colores.length, 512, 256 / colores.length + 1); });

  if (tipo === "mercurio") {
    g.fillStyle = "#a79a8a"; g.fillRect(0, 0, 512, 256);
    manchas(40, "#8c8072", 6, 22); manchas(25, "#c2b6a6", 4, 12);
  } else if (tipo === "venus") {
    bandas(["#e8c372", "#f0d28e", "#dcb25e", "#f0d28e", "#e8c372", "#d6a955", "#ecca80"]);
    manchas(18, "#f5deaa", 20, 50);
  } else if (tipo === "marte") {
    g.fillStyle = "#c1440e"; g.fillRect(0, 0, 512, 256);
    manchas(22, "#9a3409", 12, 40); manchas(14, "#dd6a35", 10, 30);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 14); g.fillRect(0, 244, 512, 12);
  } else if (tipo === "jupiter") {
    bandas(["#c9955c", "#e6c79a", "#b9773f", "#ecd4ad", "#c98a52", "#e6c79a", "#a9683a", "#dcb98a", "#c9955c"]);
    g.fillStyle = "#b5432a"; g.beginPath(); g.ellipse(340, 160, 34, 18, 0, 0, 7); g.fill();
  } else { // europa
    g.fillStyle = "#dcebf5"; g.fillRect(0, 0, 512, 256);
    manchas(12, "#c4d9e8", 20, 50);
    g.strokeStyle = "#9a6b4a"; g.lineWidth = 2.5;
    for (let i = 0; i < 28; i++) {
      g.beginPath(); let x = azar(0, 512), y = azar(0, 256); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += azar(-70, 70); y += azar(-40, 40); g.lineTo(x, y); }
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function crearPlaneta(tipo, radio) {
  const m = toon(0xffffff);
  m.map = texturaPlaneta(tipo);
  const p = new THREE.Mesh(new THREE.SphereGeometry(radio, 40, 28), m);
  p.add(new THREE.Mesh(new THREE.SphereGeometry(radio * 1.012, 40, 28), matContorno));
  return p;
}

// Los objetos recolectables viven en objetos.js; se reexportan para no cambiar quién los importa.
export { crearObjeto } from "./objetos.js";
import { crearObjeto } from "./objetos.js";

export function crearEspacio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f2a);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 4000);

  scene.add(new THREE.HemisphereLight(0xcfdcff, 0x3a3a5a, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4);
  sol.position.set(300, 200, 150);
  scene.add(sol);

  // Estrellas
  const pos = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1800);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const estrellas = new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false }));
  scene.add(estrellas);

  // Nave: el grupo mira hacia -Z; el modelo del cohete (eje +Y) va girado dentro.
  const nave = new THREE.Group();
  nave.rotation.order = "YXZ";
  scene.add(nave);
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), new THREE.MeshBasicMaterial({ color: 0xffa726 }));
  llama.rotation.x = Math.PI / 2; // la punta de la llama apunta hacia atrás (+Z)
  nave.add(llama);
  let modelo = null;

  const mundo = new THREE.Group(); // planeta y objetos de la misión actual
  scene.add(mundo);

  let objetos = [], pista = null;
  let yaw = 0, pitch = 0, t = 0;
  const vel = new THREE.Vector3();
  const frente = new THREE.Vector3(), deseada = new THREE.Vector3();

  function iniciar(dest, mejoras, campo) {
    mundo.clear();
    if (modelo) nave.remove(modelo);
    modelo = crearCohete(mejoras);
    modelo.rotation.x = -Math.PI / 2;
    nave.add(modelo);
    llama.position.z = modelo.userData.largo / 2 + 0.6 + 1.3;

    if (dest === "europa") {
      const jupiter = crearPlaneta("jupiter", 300);
      jupiter.position.set(-520, 120, -1300);
      mundo.add(jupiter);
    }
    const planeta = crearPlaneta(dest, dest === "mercurio" ? 110 : dest === "jupiter" ? 220 : 150);
    planeta.position.set(40, -40, -520);
    planeta.rotation.z = 0.2;
    mundo.add(planeta);
    mundo.userData.planeta = planeta;

    // Zona de aterrizaje: llegar a ella baja la nave a la superficie.
    {
      pista = new THREE.Group();
      pista.position.copy(planeta.position).setLength(200);
      const matPista = new THREE.MeshBasicMaterial({ color: 0x6ee37a, transparent: true, opacity: 0.85 });
      pista.add(new THREE.Mesh(new THREE.OctahedronGeometry(2.2), matPista));
      for (let i = 0; i < 3; i++) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 28), matPista.clone());
        aro.userData.fase = i / 3;
        pista.add(aro);
      }
      mundo.add(pista);
    }

    // Los objetos más valiosos quedan más lejos del punto de llegada.
    objetos = campo.map((dato, i) => {
      const dir = new THREE.Vector3(THREE.MathUtils.randFloatSpread(1.5), THREE.MathUtils.randFloatSpread(0.8), -1).normalize();
      const mesh = crearObjeto(dato);
      mesh.scale.setScalar(1.5);
      mesh.position.copy(dir.multiplyScalar(40 + i * 24 + Math.random() * 10));
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      mundo.add(mesh);
      return { dato, mesh };
    });

    nave.position.set(0, 0, 0);
    yaw = 0; pitch = 0; vel.set(0, 0, -6);
    nave.rotation.set(0, 0, 0);
    camera.position.set(0, 4.2, 14);
    camera.quaternion.identity();
  }

  function girar(dYaw, dPitch) {
    yaw -= dYaw;
    pitch = THREE.MathUtils.clamp(pitch - dPitch, -1.35, 1.35);
  }

  // impulso: 1 acelera, -1 frena, 0 nada. Devuelve los objetos recogidos en este paso.
  // ----- Lluvia de micrometeoritos: rocas que cruzan la ruta hacia la zona de aterrizaje -----
  const rocas = [];
  const geoRoca = new THREE.DodecahedronGeometry(1);
  const matRoca = toon(0x7a6a5a);
  let sacudida = 0;
  function iniciarLluvia(activar) {
    for (const r of rocas) mundo.remove(r.mesh);
    rocas.length = 0;
    if (!activar || !pista) return;
    for (let i = 0; i < 36; i++) {
      const base = pista.position.clone().multiplyScalar(0.15 + Math.random() * 0.75);
      const m = new THREE.Mesh(geoRoca, matRoca);
      m.add(new THREE.Mesh(geoRoca, matContorno));
      m.children[0].scale.setScalar(1.12);
      const s = 0.6 + Math.random() * 1.6;
      m.scale.setScalar(s);
      const vel = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3).normalize().multiplyScalar(5 + Math.random() * 9);
      m.position.copy(base).addScaledVector(vel, (Math.random() - 0.5) * 6);
      mundo.add(m);
      rocas.push({ mesh: m, base, vel, radio: s + 1.5, espera: 0, giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()) });
    }
  }

  function actualizar(dt, impulso) {
    t += dt;
    let impactos = 0;
    for (const r of rocas) {
      r.mesh.position.addScaledVector(r.vel, dt);
      r.mesh.rotation.x += r.giro.x * dt; r.mesh.rotation.y += r.giro.y * dt;
      if (r.mesh.position.distanceTo(r.base) > 32) r.mesh.position.copy(r.base).addScaledVector(r.vel, -28 / r.vel.length());
      r.espera = Math.max(0, r.espera - dt);
      if (!r.espera && r.mesh.position.distanceTo(nave.position) < r.radio) { impactos++; r.espera = 2; sacudida = 0.5; }
    }
    nave.rotation.set(pitch, yaw, 0);
    frente.set(0, 0, -1).applyQuaternion(nave.quaternion);

    if (impulso > 0) vel.addScaledVector(frente, 16 * dt);
    else if (impulso < 0) vel.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
    vel.multiplyScalar(Math.max(0, 1 - 0.18 * dt)); // un poco de freno para que sea fácil de pilotar
    if (vel.length() > 42) vel.setLength(42);
    nave.position.addScaledVector(vel, dt);

    let enLimite = false;
    if (nave.position.length() > LIMITE) {
      nave.position.setLength(LIMITE);
      vel.multiplyScalar(-0.4);
      enLimite = true;
    }

    llama.visible = impulso > 0;
    llama.scale.set(1, 0.8 + Math.random() * 0.5, 1);

    const recogidos = [];
    objetos = objetos.filter(o => {
      o.mesh.userData.animar(t);
      o.mesh.rotation.x += dt * 0.3;
      if (o.mesh.position.distanceTo(nave.position) < RADIO_RECOGER) {
        mundo.remove(o.mesh);
        recogidos.push(o.dato);
        return false;
      }
      return true;
    });

    if (mundo.userData.planeta) mundo.userData.planeta.rotation.y += dt * 0.02;

    let enPista = false;
    if (pista) {
      pista.children[0].rotation.y += dt * 1.5;
      pista.children.slice(1).forEach(aro => { // aros que se expanden como ondas
        const f = (t * 0.5 + aro.userData.fase) % 1;
        aro.scale.setScalar(2 + f * 12);
        aro.material.opacity = 0.9 * (1 - f);
        aro.quaternion.copy(camera.quaternion);
      });
      enPista = pista.position.distanceTo(nave.position) < 12;
    }

    // Cámara detrás de la nave
    const k = 1 - Math.exp(-7 * dt);
    deseada.set(0, 4.2, 14).applyQuaternion(nave.quaternion).add(nave.position);
    camera.position.lerp(deseada, k);
    camera.quaternion.slerp(nave.quaternion, k);
    if (sacudida > 0) { // un impacto sacude la cámara
      sacudida = Math.max(0, sacudida - dt);
      camera.position.x += (Math.random() - 0.5) * sacudida * 1.6;
      camera.position.y += (Math.random() - 0.5) * sacudida * 1.6;
    }
    estrellas.position.copy(camera.position);

    return { recogidos, enLimite, enPista, impactos, velocidad: vel.length() };
  }

  return {
    scene, camera, nave, iniciar, girar, actualizar, iniciarLluvia,
    get lluvia() { return rocas.length > 0; },
    get objetos() { return objetos; },
    get pista() { return pista; },
  };
}
