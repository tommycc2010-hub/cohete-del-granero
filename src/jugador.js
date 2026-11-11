// Jugador en primera persona: mouse para mirar, WASD o flechas para caminar, Shift para correr.
// Camina sobre el relieve del "mundo" actual (el granero o la superficie de un planeta).
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const RADIO = 0.4;       // ancho del jugador
const OJOS = 1.7;        // altura de la cámara sobre el suelo
const SUBIDA_MAX = 0.62; // cuánto puede subir en medio metro: lo más empinado no se puede escalar

export function crearJugador(camera, dom, alPaso) {
  const controls = new PointerLockControls(camera, dom);
  const teclas = {};
  addEventListener("keydown", e => { teclas[e.code] = true; });
  addEventListener("keyup", e => { teclas[e.code] = false; });
  addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

  let mundo = null, recorrido = 0;
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
    const p = camera.position, h0 = mundo.altura(p.x, p.z);
    const escalable = (ex, ez) => mundo.altura(p.x + ex * 0.5, p.z + ez * 0.5) - h0 <= SUBIDA_MAX;
    const x0 = p.x, z0 = p.z;
    if (dx && libre(p.x + dx, p.z) && escalable(Math.sign(dx), 0)) p.x += dx;
    if (dz && libre(p.x, p.z + dz) && escalable(0, Math.sign(dz))) p.z += dz;
    recorrido += Math.hypot(p.x - x0, p.z - z0);
    if (recorrido > 2.2) { recorrido = 0; if (alPaso) alPaso(); }
  }

  // Mantiene la cámara a la altura de los ojos sobre el suelo.
  function asentar(dt) {
    const p = camera.position, meta = mundo.altura(p.x, p.z) + OJOS;
    p.y += (meta - p.y) * (1 - Math.exp(-14 * dt));
  }

  function actualizar(dt) {
    mov.moviendo = false;
    if (controls.isLocked) {
      const f = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0);
      const s = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0);
      mov.moviendo = !!(f || s);
      mov.corriendo = mov.moviendo && !!(teclas.ShiftLeft || teclas.ShiftRight);
      mover(f, s, dt, mov.corriendo);
    }
    asentar(dt);
  }

  // Cambia de mundo y coloca al jugador en (x, z) mirando hacia (mx, mz).
  function colocar(nuevoMundo, x, z, mx, mz) {
    mundo = nuevoMundo;
    const y = mundo.altura(x, z) + OJOS;
    camera.position.set(x, y, z);
    camera.lookAt(mx, mundo.altura(mx, mz) + OJOS, mz);
  }

  return { controls, actualizar, mover, asentar, libre, colocar, teclas, mov };
}
