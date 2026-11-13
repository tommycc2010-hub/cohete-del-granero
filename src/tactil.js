import * as THREE from "three";

// Controles táctiles para celular: joystick a la izquierda, arrastrar a la derecha para mirar,
// y botones que "pulsan" las mismas teclas que en la computadora (así el resto del juego no cambia).
// Se activan solos en pantallas táctiles, o con ?movil en la dirección (para probar en la computadora).

export const esTactil = () =>
  new URLSearchParams(location.search).has("movil") ||
  (matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 0);

const tecla = (code, tipo = "keydown") => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
const pulsar = code => { tecla(code); setTimeout(() => tecla(code, "keyup"), 60); };

// avisos: { mirar(dx, dy), modo() -> "granero" | "espacio" | ..., activo() -> bool, pausar() }
export function crearTactil(avisos) {
  document.body.classList.add("tactil");
  const raiz = document.createElement("div");
  raiz.id = "tactil";
  raiz.innerHTML = `
    <div class="tc-joy"><div class="tc-base"><div class="tc-palo"></div></div></div>
    <div class="tc-mirar"></div>
    <div class="tc-arriba">
      <button data-tecla="Tab" data-en="granero" title="Teléfono">📱</button>
      <button data-tecla="KeyG" title="Guardar">G</button>
      <button data-accion="pausa" title="Pausa">⏸</button>
    </div>
    <div class="tc-botones">
      <button class="grande" data-tecla="KeyE" data-en="granero superficie">E</button>
      <button data-tecla="Space" data-en="granero superficie" data-mantener>⤒</button>
      <button data-tecla="ShiftLeft" data-en="granero superficie" data-alternar>🏃</button>
      <button class="grande" data-tecla="KeyW" data-en="espacio descenso" data-mantener>🔥</button>
      <button data-tecla="KeyS" data-en="espacio" data-mantener>🛑</button>
      <button data-tecla="KeyR" data-en="espacio">🏠</button>
      <button class="grande" data-tecla="KeyE" data-en="final">⏭</button>
    </div>
    <div class="tc-girar">📱↻ Gira el teléfono para jugar en horizontal</div>`;
  document.body.appendChild(raiz);

  // ----- Botones -----
  raiz.querySelectorAll(".tc-arriba button, .tc-botones button").forEach(b => {
    const code = b.dataset.tecla;
    const apretar = e => {
      e.preventDefault();
      e.stopPropagation();
      if (b.dataset.accion === "pausa") return avisos.pausar();
      if (b.hasAttribute("data-alternar")) { // correr: se queda puesto hasta volver a tocar
        const on = !b.classList.contains("on");
        b.classList.toggle("on", on);
        tecla(code, on ? "keydown" : "keyup");
      } else if (b.hasAttribute("data-mantener")) { b.classList.add("on"); tecla(code); }
      else { b.classList.add("on"); pulsar(code); setTimeout(() => b.classList.remove("on"), 120); }
    };
    const soltar = e => {
      if (b.hasAttribute("data-mantener")) { e.preventDefault(); b.classList.remove("on"); tecla(code, "keyup"); }
    };
    b.addEventListener("touchstart", apretar, { passive: false });
    b.addEventListener("touchend", soltar);
    b.addEventListener("touchcancel", soltar);
    b.addEventListener("mousedown", apretar); // para probar con el mouse
    b.addEventListener("mouseup", soltar);
  });

  // ----- Joystick: W A S D según hacia dónde se empuje -----
  const joy = raiz.querySelector(".tc-joy"), base = raiz.querySelector(".tc-base"), palo = raiz.querySelector(".tc-palo");
  let dedoJoy = null, centro = null;
  const RADIO = 52;
  const ponerTeclas = (x, y) => {
    const m = Math.hypot(x, y) / RADIO;
    const dir = { KeyW: y < -0.35 * RADIO && m > 0.3, KeyS: y > 0.35 * RADIO && m > 0.3, KeyA: x < -0.35 * RADIO && m > 0.3, KeyD: x > 0.35 * RADIO && m > 0.3 };
    for (const [k, on] of Object.entries(dir)) {
      if (on !== !!estadoJoy[k]) { estadoJoy[k] = on; tecla(k, on ? "keydown" : "keyup"); }
    }
  };
  const estadoJoy = {};
  const moverJoy = t => {
    let x = t.clientX - centro.x, y = t.clientY - centro.y;
    const d = Math.hypot(x, y);
    if (d > RADIO) { x *= RADIO / d; y *= RADIO / d; }
    palo.style.transform = `translate(${x}px, ${y}px)`;
    ponerTeclas(x, y);
  };
  joy.addEventListener("touchstart", e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    dedoJoy = t.identifier;
    const r = joy.getBoundingClientRect();
    centro = { x: t.clientX, y: t.clientY }; // el joystick aparece donde pones el dedo
    base.style.left = `${t.clientX - r.left}px`;
    base.style.top = `${t.clientY - r.top}px`;
    base.classList.add("activo");
    moverJoy(t);
  }, { passive: false });
  const finJoy = e => {
    for (const t of e.changedTouches) if (t.identifier === dedoJoy) {
      dedoJoy = null;
      palo.style.transform = "";
      base.classList.remove("activo");
      ponerTeclas(0, 0);
    }
  };
  joy.addEventListener("touchmove", e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === dedoJoy) moverJoy(t); }, { passive: false });
  joy.addEventListener("touchend", finJoy);
  joy.addEventListener("touchcancel", finJoy);

  // ----- Mirar: arrastrar con el dedo por la mitad derecha -----
  const zona = raiz.querySelector(".tc-mirar");
  let dedoMirar = null, ultimo = null;
  zona.addEventListener("touchstart", e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    dedoMirar = t.identifier;
    ultimo = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  zona.addEventListener("touchmove", e => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === dedoMirar) {
      avisos.mirar((t.clientX - ultimo.x) * 2.2, (t.clientY - ultimo.y) * 2.2);
      ultimo = { x: t.clientX, y: t.clientY };
    }
  }, { passive: false });
  const finMirar = e => { for (const t of e.changedTouches) if (t.identifier === dedoMirar) dedoMirar = null; };
  zona.addEventListener("touchend", finMirar);
  zona.addEventListener("touchcancel", finMirar);

  // Muestra solo los botones que sirven en cada modo, y nada mientras hay un menú abierto
  function actualizar() {
    const activo = avisos.activo(), modo = avisos.modo();
    raiz.classList.toggle("oculto", !activo);
    raiz.querySelectorAll("[data-en]").forEach(b => { b.style.display = b.dataset.en.split(" ").includes(modo) ? "" : "none"; });
    if (!activo) { // al pausar se sueltan todas las teclas
      for (const k of Object.keys(estadoJoy)) if (estadoJoy[k]) { estadoJoy[k] = false; tecla(k, "keyup"); }
    }
  }

  // Pantalla completa y horizontal al empezar a jugar (si el navegador lo permite)
  function pantallaCompleta() {
    const el = document.documentElement;
    try { if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); } catch { /* no disponible */ }
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch { /* no disponible */ }
  }

  return { actualizar, pantallaCompleta };
}

// En el celular no hay "capturar el mouse": se simula para que el juego funcione igual
// (bloquear = jugando, desbloquear = pausa), y mirar se hace girando la cámara a mano.
export function simularBloqueo(controls, camera) {
  controls.lock = () => { if (!controls.isLocked) { controls.isLocked = true; controls.dispatchEvent({ type: "lock" }); } };
  controls.unlock = () => { if (controls.isLocked) { controls.isLocked = false; controls.dispatchEvent({ type: "unlock" }); } };
  const e = new THREE.Euler(0, 0, 0, "YXZ");
  return (dx, dy) => {
    const v = 0.002 * (controls.pointerSpeed || 1);
    e.setFromQuaternion(camera.quaternion);
    e.y -= dx * v;
    e.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, e.x - dy * v));
    camera.quaternion.setFromEuler(e);
  };
}
