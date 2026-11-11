// Jugador en primera persona: mouse para mirar, WASD o flechas para caminar, Shift para correr.
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const RADIO = 0.4;

export function crearJugador(camera, dom, colisiones, limite) {
  const controls = new PointerLockControls(camera, dom);
  const teclas = {};
  addEventListener("keydown", e => { teclas[e.code] = true; });
  addEventListener("keyup", e => { teclas[e.code] = false; });
  addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

  function libre(x, z) {
    if (Math.abs(x) > limite || Math.abs(z) > limite) return false;
    return !colisiones.some(c => x > c.minX - RADIO && x < c.maxX + RADIO && z > c.minZ - RADIO && z < c.maxZ + RADIO);
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
    if (libre(p.x + dx, p.z)) p.x += dx;
    if (libre(p.x, p.z + dz)) p.z += dz;
  }

  function actualizar(dt) {
    if (!controls.isLocked) return;
    const f = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0);
    const s = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0);
    mover(f, s, dt, teclas.ShiftLeft || teclas.ShiftRight);
  }

  return { controls, actualizar, mover, libre, teclas };
}
