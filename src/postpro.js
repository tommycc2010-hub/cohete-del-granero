// Postprocesado: resplandor (bloom) en lo que brilla y un viñeteado suave en los bordes.
// Solo se usa con calidad gráfica alta; en media y baja se dibuja directo, más rápido.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";

// Umbral y fuerza del resplandor por escena: en lugares muy claros (nieve, sol fuerte) el umbral sube
// para que solo brille lo que emite luz (lava, cristales, llamas), no el suelo.
const AJUSTES = {
  granero: { umbral: 1.6, fuerza: 0.3 },
  espacio: { umbral: 0.85, fuerza: 0.5 },
  final: { umbral: 0.62, fuerza: 0.75 },
  mercurio: { umbral: 1.1, fuerza: 0.4 },
  venus: { umbral: 0.8, fuerza: 0.6 },
  marte: { umbral: 0.95, fuerza: 0.45 },
  jupiter: { umbral: 0.85, fuerza: 0.65 },
  europa: { umbral: 1.25, fuerza: 0.55 },
};

export function crearPostpro(renderer) {
  const compositor = new EffectComposer(renderer);
  const pasada = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.45, 0.9);
  const vineta = new ShaderPass(VignetteShader);
  vineta.uniforms.offset.value = 0.95;
  vineta.uniforms.darkness.value = 1.05;
  compositor.addPass(pasada);
  compositor.addPass(bloom);
  compositor.addPass(vineta);
  compositor.addPass(new OutputPass());

  let activo = true;
  return {
    get activo() { return activo; },
    activar(si) { activo = si; },
    ajustar(ancho, alto, pr) {
      compositor.setPixelRatio(pr);
      compositor.setSize(ancho, alto);
    },
    // ambiente: clave de AJUSTES (el modo o el destino del planeta)
    dibujar(escena, camara, ambiente) {
      const a = AJUSTES[ambiente] || AJUSTES.granero;
      bloom.threshold = a.umbral;
      bloom.strength = a.fuerza;
      pasada.scene = escena;
      pasada.camera = camara;
      compositor.render();
    },
  };
}
