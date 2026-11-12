// Lo que aparece en el suelo de cada planeta además de la misión principal:
// - Puntos de las misiones secundarias: lugares para fotografiar 📸 o donde instalar un sensor.
// - Mochilas 🎒: si te quedas sin oxígeno, lo que llevabas encima queda donde caíste hasta que vuelvas a por ello.
import * as THREE from "three";
import { SECUNDARIAS } from "./datos.js";
import { caja, cilindro, esfera, cono } from "./estilo.js";
import { azarSemilla } from "./ruido.js";
import { crearRafaga } from "./particulas.js";

const COLOR = { foto: 0x4dc3ff, sensores: 0xffd23f };
const DISTANCIA = 3.2; // a esta distancia se toma la foto o se instala el sensor

const brilla = (m, color, f = 1.2) => { m.material.emissive = new THREE.Color(color); m.material.emissiveIntensity = f; return m; };

// Las mismas 3 posiciones en cada viaje al mismo planeta (dependen solo del planeta y del tipo de misión)
function posiciones(dest, tipo) {
  const azar = azarSemilla(500 + dest.charCodeAt(0) * 31 + dest.length * 7 + (tipo === "foto" ? 0 : 211));
  const lista = [];
  for (let n = 0; lista.length < 3 && n < 200; n++) {
    const a = azar() * Math.PI * 2, r = 32 + azar() * 85;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (lista.every(p => Math.hypot(p.x - x, p.z - z) > 35)) lista.push({ x, z });
  }
  return lista;
}

// Poste con un rombo que gira y un haz de luz: se ve de lejos
function baliza(color) {
  const g = new THREE.Group();
  const poste = cilindro(0.08, 0.1, 2.2, 0x333333, 6);
  poste.position.y = 1.1;
  const rombo = brilla(esfera(0.35, color, 4), color, 0.9);
  rombo.scale.y = 1.6;
  rombo.position.y = 2.7;
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 18, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, fog: false, depthWrite: false }));
  haz.position.y = 9;
  const aro = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = 0.08;
  g.add(poste, rombo, haz, aro);
  g.userData.rombo = rombo;
  return g;
}

// Sensor ya instalado: caja con antena y luz que parpadea
function sensor() {
  const g = new THREE.Group();
  const cuerpo = caja(0.6, 0.45, 0.6, 0xe8e8e8);
  cuerpo.position.y = 0.25;
  const franja = caja(0.62, 0.1, 0.62, 0xffd23f, false);
  franja.position.y = 0.32;
  const antena = cilindro(0.025, 0.025, 1, 0x555555, 5, false);
  antena.position.set(0.18, 0.95, 0.18);
  const luz = brilla(esfera(0.06, 0x6ee37a, 6, false), 0x6ee37a, 2);
  luz.position.set(0.18, 1.48, 0.18);
  for (const a of [0.8, 2.9, 5]) { const pata = cilindro(0.03, 0.03, 0.5, 0x555555, 4, false); pata.position.set(Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35); pata.rotation.z = Math.cos(a) * 0.4; g.add(pata); }
  g.add(cuerpo, franja, antena, luz);
  g.userData.luz = luz;
  return g;
}

// Mochila con lo que se te cayó
function mochila() {
  const g = new THREE.Group();
  const bolsa = caja(0.7, 0.8, 0.45, 0xe5843b);
  bolsa.position.y = 0.4;
  const tapa = caja(0.72, 0.25, 0.5, 0xc96a28);
  tapa.position.y = 0.75;
  const bolsillo = caja(0.45, 0.3, 0.1, 0xc96a28);
  bolsillo.position.set(0, 0.3, 0.26);
  g.add(bolsa, tapa, bolsillo);
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 18, 8),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
  haz.position.y = 9;
  g.add(haz);
  g.rotation.z = 0.25; // caída de lado
  return g;
}

export function crearExtrasSuelo(superficie) {
  let puntos = [], instalados = [], mochilas = [], efectos = [], destino = null, t = 0;

  // estado.secundarias: true = cumplida; para fotos y sensores, un arreglo con los 3 puntos visitados
  function iniciar(dest, secundarias) {
    destino = dest;
    puntos = []; instalados = []; mochilas = []; efectos = [];
    for (const s of SECUNDARIAS[dest] || []) {
      if (s.tipo !== "foto" && s.tipo !== "sensores") continue;
      const prog = secundarias[`${dest}.${s.tipo}`];
      posiciones(dest, s.tipo).forEach((p, i) => {
        const y = superficie.altura(p.x, p.z);
        const visitado = prog === true || (Array.isArray(prog) && prog[i]);
        if (visitado) {
          if (s.tipo === "sensores") ponerSensor(p.x, y, p.z);
          return;
        }
        const g = baliza(COLOR[s.tipo]);
        g.position.set(p.x, y, p.z);
        superficie.agregar(g);
        puntos.push({ tipo: s.tipo, i, x: p.x, z: p.z, g, texto: `${s.icono} ${s.objetivo}` });
      });
    }
  }

  function ponerSensor(x, y, z) {
    const g = sensor();
    g.position.set(x, y, z);
    superficie.agregar(g);
    instalados.push(g);
  }

  function soltarMochila(x, z, objetos) {
    const g = mochila();
    g.position.set(x, superficie.altura(x, z), z);
    superficie.agregar(g);
    mochilas.push({ x, z, objetos, g });
  }

  // Devuelve { puntos: [{ tipo, i }] alcanzados en este paso, mochila: objetos recuperados o null }
  function actualizar(dt, pos) {
    t += dt;
    const alcanzados = [];
    puntos = puntos.filter(p => {
      p.g.userData.rombo.rotation.y += dt * 2;
      p.g.userData.rombo.position.y = 2.7 + Math.sin(t * 2 + p.i) * 0.15;
      if (Math.hypot(p.x - pos.x, p.z - pos.z) > DISTANCIA) return true;
      superficie.quitar(p.g);
      const y = superficie.altura(p.x, p.z);
      if (p.tipo === "sensores") ponerSensor(p.x, y, p.z);
      else superficie.rafaga(p.x, y + 1.5, p.z, { color: 0xffffff, n: 40, vel: 6, duracion: 0.5, tam: 0.6 }); // flash de la foto
      alcanzados.push({ tipo: p.tipo, i: p.i });
      return false;
    });
    instalados.forEach((g, k) => { g.userData.luz.visible = (t * 1.2 + k * 0.3) % 1 < 0.5; });
    let recuperado = null;
    mochilas = mochilas.filter(mo => {
      if (recuperado || Math.hypot(mo.x - pos.x, mo.z - pos.z) > 2.4) return true;
      superficie.quitar(mo.g);
      recuperado = mo.objetos;
      return false;
    });
    return { puntos: alcanzados, mochila: recuperado };
  }

  return {
    iniciar, actualizar, soltarMochila,
    // Marcadores: de cada misión solo el punto más cercano (para no llenar la pantalla), y todas las mochilas
    balizas(pos) {
      const cercanos = {};
      for (const p of puntos) {
        const d = Math.hypot(p.x - pos.x, p.z - pos.z);
        if (!cercanos[p.tipo] || d < cercanos[p.tipo].d) cercanos[p.tipo] = { p, d };
      }
      return Object.values(cercanos).map(({ p }) => ({ pos: new THREE.Vector3(p.x, superficie.altura(p.x, p.z) + 2.5, p.z), texto: p.texto }))
        .concat(mochilas.map(mo => ({ pos: new THREE.Vector3(mo.x, superficie.altura(mo.x, mo.z) + 1, mo.z), texto: `🎒 Tu mochila (${mo.objetos.length})` })));
    },
    mochilasGuardables: () => mochilas.map(mo => ({ x: mo.x, z: mo.z, objetos: mo.objetos })),
    get destino() { return destino; },
  };
}
