// Brazos en primera persona, como en Schedule I: la mano derecha sostiene un escáner con pantalla.
// Se dibujan en una escena aparte, encima del mundo, para que nunca atraviesen paredes.
import * as THREE from "three";
import { caja } from "./estilo.js";

export function crearManos() {
  const scene = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.7));
  const luz = new THREE.DirectionalLight(0xffffff, 1.6);
  luz.position.set(1, 2, 1.5);
  scene.add(luz);

  const raiz = new THREE.Group(); // todo se mueve junto con el balanceo
  scene.add(raiz);
  const D = { x: 0.27, y: -0.25, z: -0.6 }, I = { x: -0.34, y: -0.33, z: -0.62 }; // posición de reposo de cada brazo

  // ----- Brazo derecho con el escáner -----
  const derecho = new THREE.Group();
  derecho.position.set(D.x, D.y, D.z);
  derecho.scale.setScalar(0.72);
  raiz.add(derecho);
  const mangaD = caja(0.13, 0.13, 0.5, 0xc0392b);
  mangaD.position.set(0.05, -0.06, 0.24);
  mangaD.rotation.x = 0.25;
  derecho.add(mangaD);
  const manoD = caja(0.12, 0.11, 0.13, 0xf2c9a0);
  manoD.position.set(0.05, -0.07, 0.02); // sujeta el escáner por debajo, sin tapar la pantalla
  derecho.add(manoD);

  const escaner = new THREE.Group();
  escaner.position.set(-0.07, 0.04, -0.12);
  escaner.rotation.set(0.85, -0.25, 0); // inclinado hacia el jugador
  derecho.add(escaner);
  escaner.add(caja(0.2, 0.05, 0.28, 0x3a3f4a));
  const antena = caja(0.02, 0.1, 0.02, 0x222222, false);
  antena.position.set(0.07, 0.06, -0.12);
  escaner.add(antena);
  const lucecita = caja(0.025, 0.025, 0.025, 0x6ee37a, false);
  lucecita.position.set(0.07, 0.12, -0.12);
  escaner.add(lucecita);

  // Pantalla del escáner: un canvas que se actualiza con lecturas
  const lienzo = document.createElement("canvas");
  lienzo.width = 256; lienzo.height = 160;
  const g = lienzo.getContext("2d");
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.106), new THREE.MeshBasicMaterial({ map: textura }));
  pantalla.rotation.x = -Math.PI / 2;
  pantalla.position.set(0, 0.027, 0.02);
  escaner.add(pantalla);

  // ----- Brazo izquierdo -----
  const izquierdo = new THREE.Group();
  izquierdo.position.set(I.x, I.y, I.z);
  izquierdo.scale.setScalar(0.72);
  raiz.add(izquierdo);
  const mangaI = caja(0.13, 0.13, 0.5, 0xc0392b);
  mangaI.position.set(-0.04, -0.06, 0.24);
  mangaI.rotation.x = 0.25;
  izquierdo.add(mangaI);
  const manoI = caja(0.12, 0.11, 0.13, 0xf2c9a0);
  manoI.position.set(0, 0, -0.04);
  izquierdo.add(manoI);

  // ----- Estado de la animación -----
  let fase = 0, bajon = 0, alcanzar = 0, agarrar = 0, destello = 0, colorDestello = "#ffffff";
  let enSueloAntes = true, tiempo = 0;
  const giroAntes = new THREE.Euler(), giro = new THREE.Euler();
  const vaiven = new THREE.Vector2();
  let lineas = ["", ""], acento = "#6ee37a";

  function dibujarPantalla() {
    g.fillStyle = "#0e1a14";
    g.fillRect(0, 0, 256, 160);
    g.strokeStyle = acento;
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 148);
    g.fillStyle = acento;
    g.font = "bold 30px Trebuchet MS, sans-serif";
    g.fillText(lineas[0], 20, 62);
    g.font = "bold 40px Trebuchet MS, sans-serif";
    g.fillText(lineas[1], 20, 118);
    if (destello > 0) {
      g.globalAlpha = Math.min(1, destello * 2);
      g.fillStyle = colorDestello;
      g.fillRect(0, 0, 256, 160);
      g.globalAlpha = 1;
    }
    textura.needsUpdate = true;
  }
  dibujarPantalla();

  // Cambia las mangas y las manos: camisa a cuadros en la Tierra, traje espacial en los planetas.
  function vestir(conTraje) {
    const manga = conTraje ? 0xf2f2f2 : 0xc0392b, mano = conTraje ? 0xdddddd : 0xf2c9a0;
    [mangaD, mangaI].forEach(m => m.material.color.set(manga));
    [manoD, manoI].forEach(m => m.material.color.set(mano));
  }

  function escribir(arriba, abajo, color = "#6ee37a") {
    if (arriba === lineas[0] && abajo === lineas[1] && color === acento && destello <= 0) return;
    lineas = [arriba, abajo];
    acento = color;
    dibujarPantalla();
  }

  // mov: { moviendo, corriendo }, enSuelo: si pisa el suelo, camaraMundo: la cámara del jugador.
  function actualizar(dt, mov, enSuelo, camaraMundo) {
    tiempo += dt;
    // Balanceo al caminar: más fuerte al correr
    if (mov.moviendo && enSuelo) fase += dt * (mov.corriendo ? 13 : 8.5);
    const fuerza = mov.moviendo && enSuelo ? (mov.corriendo ? 1.6 : 1) : 0;
    const bx = Math.sin(fase) * 0.018 * fuerza, by = -Math.abs(Math.cos(fase)) * 0.022 * fuerza;
    const respira = Math.sin(tiempo * 1.8) * 0.006;

    // Retraso al mirar: los brazos se quedan un poco atrás del giro de la cámara
    giro.setFromQuaternion(camaraMundo.quaternion, "YXZ");
    let dy = giro.y - giroAntes.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const dx = giro.x - giroAntes.x;
    giroAntes.copy(giro);
    vaiven.x = THREE.MathUtils.clamp(vaiven.x + dy * 0.6, -0.07, 0.07);
    vaiven.y = THREE.MathUtils.clamp(vaiven.y - dx * 0.6, -0.07, 0.07);
    vaiven.multiplyScalar(Math.exp(-9 * dt));

    // Salto: los brazos suben en el aire y bajan de golpe al caer
    if (enSuelo && !enSueloAntes) bajon = 0.07;
    enSueloAntes = enSuelo;
    bajon *= Math.exp(-7 * dt);
    const aire = enSuelo ? 0 : 0.035;

    raiz.position.set(bx + vaiven.x, by + respira + aire - bajon + vaiven.y, 0);
    raiz.rotation.z = -vaiven.x * 1.5;

    // E: el brazo derecho se estira hacia adelante
    alcanzar = Math.max(0, alcanzar - dt * 3.2);
    const a = Math.sin(Math.min(1, alcanzar) * Math.PI);
    derecho.position.set(D.x - a * 0.06, D.y + a * 0.04, D.z - a * 0.14);
    derecho.rotation.x = a * 0.35;

    // Recoger: la mano izquierda sube, agarra y baja hacia la mochila
    agarrar = Math.max(0, agarrar - dt * 2.6);
    const b = Math.sin(Math.min(1, agarrar) * Math.PI);
    izquierdo.position.set(I.x + b * 0.14, I.y + b * 0.18, I.z - b * 0.1);
    izquierdo.rotation.set(b * 0.6, 0, -b * 0.5);

    if (destello > 0) { destello -= dt; dibujarPantalla(); }
    lucecita.material.color.set(Math.sin(tiempo * 6) > 0 ? acento : "#1d1d1d");
  }

  return {
    scene, camara, vestir, escribir, actualizar,
    usar() { alcanzar = 1; },
    recoger(color = "#ffffff") { agarrar = 1; destello = 0.35; colorDestello = color; dibujarPantalla(); },
    ajustar(aspecto) { camara.aspect = aspecto; camara.updateProjectionMatrix(); },
  };
}
