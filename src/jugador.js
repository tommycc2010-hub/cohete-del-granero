// Jugador en primera persona: mouse para mirar, WASD o flechas para caminar, Shift para correr, Espacio para saltar.
// Camina sobre el relieve del "mundo" actual (el granero o la superficie de un planeta) con su gravedad.
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const RADIO = 0.4;       // ancho del jugador
const OJOS = 1.7;        // altura de la cámara sobre los pies
const SUBIDA_MAX = 0.62; // cuánto puede subir en medio metro: lo más empinado no se puede escalar
const V_SALTO = 4.6;     // impulso del salto en m/s: 1.1 m de alto en la Tierra, mucho más con poca gravedad
const G_TIERRA = 9.8;

// avisos: { alPaso(), alSaltar(), alCaer(velocidad) }
export function crearJugador(camera, dom, avisos = {}) {
  const controls = new PointerLockControls(camera, dom);
  const teclas = {};
  addEventListener("keydown", e => { teclas[e.code] = true; if (e.code === "Space") e.preventDefault(); });
  addEventListener("keyup", e => { teclas[e.code] = false; });
  addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

  let mundo = null, recorrido = 0;
  let pie = 0, vy = 0, enSuelo = true; // altura de los pies, velocidad vertical
  let fase = 0, hundido = 0;           // balanceo al caminar y bajón al caer
  const mov = { moviendo: false, corriendo: false };

  function libre(x, z) {
    if (Math.abs(x) > mundo.limite || Math.abs(z) > mundo.limite) return false;
    return !mundo.colisiones.some(c => x > c.minX - RADIO && x < c.maxX + RADIO && z > c.minZ - RADIO && z < c.maxZ + RADIO);
  }

  const frente = new THREE.Vector3(), lado = new THREE.Vector3();

  // Mueve al jugador. `f` = adelante/atrás, `s` = derecha/izquierda (entre -1 y 1).
  function mover(f, s, dt, corriendo) {
    if (!f && !s) return;
    camera.getWorldDirection(frente);
    frente.y = 0;
    frente.normalize();
    lado.crossVectors(frente, camera.up).normalize();
    const v = (corriendo ? 8 : 4.5) * dt / Math.hypot(f, s);
    const dx = (frente.x * f + lado.x * s) * v;
    const dz = (frente.z * f + lado.z * s) * v;
    const p = camera.position;
    // Se compara con la altura de los pies: saltando sí se puede subir a un escalón.
    const escalable = (ex, ez) => mundo.altura(p.x + ex * 0.5, p.z + ez * 0.5) - pie <= SUBIDA_MAX;
    const x0 = p.x, z0 = p.z;
    if (dx && libre(p.x + dx, p.z) && escalable(Math.sign(dx), 0)) p.x += dx;
    if (dz && libre(p.x, p.z + dz) && escalable(0, Math.sign(dz))) p.z += dz;
    const d = Math.hypot(p.x - x0, p.z - z0);
    if (!enSuelo) return;
    fase += d;
    recorrido += d;
    if (recorrido > 2.2) { recorrido = 0; if (avisos.alPaso) avisos.alPaso(); }
  }

  function saltar() {
    if (!enSuelo) return;
    vy = V_SALTO;
    enSuelo = false;
    if (avisos.alSaltar) avisos.alSaltar();
  }

  // Gravedad, salto y altura de la cámara.
  function asentar(dt) {
    const p = camera.position, suelo = mundo.altura(p.x, p.z);
    if (enSuelo) {
      if (pie - suelo > 0.7) { enSuelo = false; vy = 0; }        // caminó fuera de un borde: cae
      else pie += (suelo - pie) * (1 - Math.exp(-14 * dt));
    }
    if (!enSuelo) {
      vy -= G_TIERRA * (mundo.gravedad || 1) * dt;
      pie += vy * dt;
      if (pie <= suelo) {
        const golpe = -vy;
        pie = suelo; vy = 0; enSuelo = true;
        hundido = Math.min(0.5, golpe * 0.04);
        if (avisos.alCaer) avisos.alCaer(golpe);
      }
    }
    hundido *= Math.exp(-8 * dt);
    const balanceo = enSuelo ? Math.sin(fase * 2.6) * 0.045 : 0;
    p.y = pie + OJOS + balanceo - hundido;
  }

  function actualizar(dt) {
    mov.moviendo = false;
    if (controls.isLocked) {
      const f = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0);
      const s = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0);
      mov.moviendo = !!(f || s);
      mov.corriendo = mov.moviendo && !!(teclas.ShiftLeft || teclas.ShiftRight);
      if (teclas.Space) saltar();
      mover(f, s, dt, mov.corriendo);
    }
    asentar(dt);
  }

  // Cambia de mundo y coloca al jugador en (x, z) mirando hacia (mx, mz).
  function colocar(nuevoMundo, x, z, mx, mz) {
    mundo = nuevoMundo;
    pie = mundo.altura(x, z);
    vy = 0; enSuelo = true; hundido = 0;
    camera.position.set(x, pie + OJOS, z);
    camera.lookAt(mx, mundo.altura(mx, mz) + OJOS, mz);
  }

  return {
    controls, actualizar, mover, asentar, saltar, libre, colocar, teclas, mov,
    get enSuelo() { return enSuelo; },
    get pie() { return pie; },
  };
}
