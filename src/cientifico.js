// Personajes de bloques y los consejos del Dr. Nova, que guía al jugador sin decidir por él.
import * as THREE from "three";
import { caja, etiqueta } from "./estilo.js";
import { DATOS_PLANETAS, MISIONES } from "./datos.js";
import { estado, ORDEN, capacidad, costoIda, alcanceSensor, oxigenoMax, COSTO_ATERRIZAR } from "./reglas.js";

export const NOMBRE = "Dr. Nova";

// ----- Modelo de persona (sirve para el científico y los vecinos del pueblo) -----
export function crearPersona({
  x, z, y = 0, nombre, piel = 0xf2c9a0, ropa = 0xf4f4f4, pantalon = 0x34495e, pelo = 0xb9bcc2,
  cartel = "#4aa3e8", gafas = false, bigote = false, corbata = false, giro = 0, escala = 1,
  ruta = null, velocidad = 1.3, // ruta: puntos [x, z] por los que pasea, en orden
}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(escala);
  g.rotation.y = giro;
  const pieza = (m, px, py, pz, padre = g) => { m.position.set(px, py, pz); padre.add(m); return m; };

  const piernas = [-1, 1].map(lado => { // giran desde la cadera
    const cadera = new THREE.Group();
    cadera.position.set(lado * 0.16, 0.8, 0);
    g.add(cadera);
    pieza(caja(0.24, 0.8, 0.26, pantalon), 0, -0.4, 0, cadera);
    return cadera;
  });
  pieza(caja(0.74, 1.0, 0.42, ropa), 0, 1.25, 0);
  if (corbata) {
    pieza(caja(0.2, 0.7, 0.03, 0x4aa3e8, false), 0, 1.35, 0.22);
    pieza(caja(0.08, 0.4, 0.03, 0xe5483b, false), 0, 1.4, 0.24);
  }

  const brazos = [-1, 1].map(lado => { // giran desde el hombro
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.48, 1.68, 0);
    g.add(hombro);
    pieza(caja(0.2, 0.8, 0.22, ropa), 0, -0.36, 0, hombro);
    pieza(caja(0.16, 0.16, 0.18, piel), 0, -0.82, 0, hombro);
    return hombro;
  });

  const cabeza = new THREE.Group();
  cabeza.position.set(0, 2.05, 0);
  g.add(cabeza);
  pieza(caja(0.52, 0.52, 0.5, piel), 0, 0, 0, cabeza);
  pieza(caja(0.58, 0.2, 0.56, pelo), 0, 0.3, 0, cabeza);
  pieza(caja(0.1, 0.3, 0.3, pelo), -0.3, 0.1, -0.05, cabeza);
  pieza(caja(0.1, 0.3, 0.3, pelo), 0.3, 0.1, -0.05, cabeza);
  if (gafas) {
    pieza(caja(0.18, 0.14, 0.04, 0x1d1d1d, false), -0.13, 0.04, 0.26, cabeza);
    pieza(caja(0.18, 0.14, 0.04, 0x1d1d1d, false), 0.13, 0.04, 0.26, cabeza);
    pieza(caja(0.12, 0.09, 0.02, 0x9fd8ff, false), -0.13, 0.04, 0.285, cabeza);
    pieza(caja(0.12, 0.09, 0.02, 0x9fd8ff, false), 0.13, 0.04, 0.285, cabeza);
  } else {
    pieza(caja(0.08, 0.08, 0.02, 0x1d1d1d, false), -0.13, 0.04, 0.26, cabeza);
    pieza(caja(0.08, 0.08, 0.02, 0x1d1d1d, false), 0.13, 0.04, 0.26, cabeza);
  }
  if (bigote) pieza(caja(0.3, 0.07, 0.04, pelo, false), 0, -0.14, 0.26, cabeza);

  const letrero = etiqueta(nombre.toUpperCase(), { fondo: cartel, ancho: 1.7 });
  letrero.position.y = 2.85;
  g.add(letrero);

  let t = Math.random() * 6, paso = 0, destino = 0, espera = Math.random() * 3;
  const estado = { hablando: false };

  function mirarHacia(px, pz, dt, rapidez = 5) {
    let dif = Math.atan2(px - g.position.x, pz - g.position.z) - g.rotation.y;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    g.rotation.y += dif * Math.min(1, dt * rapidez);
  }

  // Pasea por su ruta; se detiene y mira al jugador si está cerca o si le habla.
  function actualizar(dt, jugadorPos) {
    t += dt;
    const cerca = Math.hypot(jugadorPos.x - g.position.x, jugadorPos.z - g.position.z);
    let caminando = false;
    if (ruta && !estado.hablando && cerca > 4.5) {
      if (espera > 0) espera -= dt;
      else {
        const [tx, tz] = ruta[destino];
        const dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { destino = (destino + 1) % ruta.length; espera = 1 + Math.random() * 3; }
        else {
          const v = Math.min(d, velocidad * dt);
          g.position.x += dx / d * v;
          g.position.z += dz / d * v;
          mirarHacia(tx, tz, dt, 8);
          caminando = true;
        }
      }
    }
    if (!caminando && (cerca < 9 || estado.hablando)) mirarHacia(jugadorPos.x, jugadorPos.z, dt);

    // Piernas y brazos: paso al caminar; gestos al hablar; respiración en reposo.
    paso = caminando ? paso + dt * velocidad * 5.5 : paso * Math.exp(-10 * dt);
    const zancada = caminando ? Math.sin(paso) * 0.55 : 0;
    piernas[0].rotation.x = zancada;
    piernas[1].rotation.x = -zancada;
    if (estado.hablando) {
      brazos[0].rotation.x = -0.5 + Math.sin(t * 5) * 0.35;
      brazos[1].rotation.x = -0.2 + Math.sin(t * 3.7 + 1) * 0.25;
      brazos[0].rotation.z = -0.25;
      cabeza.rotation.x = Math.sin(t * 6) * 0.08;
    } else {
      brazos[0].rotation.x = caminando ? -zancada * 0.8 : Math.sin(t * 2) * 0.12;
      brazos[1].rotation.x = caminando ? zancada * 0.8 : -Math.sin(t * 2) * 0.12;
      brazos[0].rotation.z = 0;
      cabeza.rotation.x = 0;
    }
    cabeza.rotation.z = Math.sin(t * 1.3) * 0.05;
    g.position.y = y + (caminando ? Math.abs(Math.sin(paso)) * 0.06 : Math.sin(t * 2) * 0.03);
  }

  return {
    grupo: g, actualizar,
    get hablando() { return estado.hablando; },
    set hablando(v) { estado.hablando = v; },
  };
}

export function crearCientifico(x, z) {
  return crearPersona({ x, z, nombre: NOMBRE, gafas: true, bigote: true, corbata: true, giro: 0.4 });
}

// ----- Consejos -----
// Devuelve las frases que dice según el estado de la partida.
// `confianza` indica qué tan seguro está: los datos de un planeta se confirman al visitarlo.
let presentado = false;

export function consejos() {
  const L = [];
  const di = (texto, confianza) => L.push({ texto, confianza });
  const m = estado.mejoras;

  if (estado.final) {
    di("¡Lo logramos! La señal de Europa se repite con un patrón regular. No conozco ningún proceso natural que haga eso.", "alta");
    di("Esto es solo el comienzo. Habrá que volver con mejores instrumentos para entender qué la produce.");
    return L;
  }

  if (!presentado) {
    presentado = true;
    di("¡Hola! Soy el Dr. Nova. Veo que encontraste mi viejo cohete... o lo que queda de él.");
    di("Si lo reparamos pieza por pieza, llegaremos cada vez más lejos. Mi sueño es escuchar qué hay bajo el hielo de Europa.");
    di("El plan de cada viaje: despegar, aterrizar despacio, cumplir la misión del lugar y volver con muestras. Mira la app Misiones del teléfono.");
    di("Regla de oro: cada mejora añade masa, y más masa gasta más combustible. En una misión espacial nada es gratis.");
    return L;
  }

  const objetivo = ORDEN.find(id => !estado.misiones[id]) || "europa";
  const p = DATOS_PLANETAS[objetivo];
  const necesita = costoIda(objetivo) * 2 + COSTO_ATERRIZAR;
  const yaVolo = Object.keys(estado.visitados).length > 0;

  if (estado.carga.length) {
    const total = estado.carga.reduce((s, o) => s + o.valor, 0);
    const uno = estado.carga.length === 1;
    di(`Traes ${uno ? "1 objeto" : estado.carga.length + " objetos"} por ${total} 💰. ${uno ? "Véndelo" : "Véndelos"} en la mesa de afuera, o camina al pueblo: el mercado paga un 20 % más.`);
  }

  di(`Misión en ${p.lugar}: ${MISIONES[objetivo].desc} Paga ${MISIONES[objetivo].recompensa} 💰 y abre el siguiente destino.`);

  if (objetivo === "europa" && m.antena < 2) {
    di("Para Europa necesito la antena en nivel 2. Sin ella no podremos escuchar nada bajo el hielo.", "alta");
  }
  if (capacidad() < necesita + 4) {
    di(`${p.nombre} pide unos ${necesita} de combustible para ir, aterrizar y volver, y el tanque solo carga ${capacidad()}. No llegamos así.`, "alta");
    di("Hay dos caminos: ampliar el tanque, que añade masa, o mejorar el motor, que gasta menos por viaje. Compáralos en el Taller.");
  } else if (estado.combustible < necesita + 4) {
    di(`Carga combustible: ${p.nombre} pide ${necesita} para ir, aterrizar y volver, más lo que gastes maniobrando.`, "alta");
  } else {
    di(`Estamos listos para ${p.nombre}. Recuerda: solo el impulso gasta combustible. Acelera, suelta y déjate llevar.`);
  }

  if (yaVolo && m.oxigeno === 0) {
    di(`A pie solo tienes ${oxigenoMax()} s de oxígeno. Volver al cohete lo recarga, pero si te desmayas lejos pierdes lo que lleves encima. Un tanque mayor te deja llegar más lejos.`, "alta");
  } else if (yaVolo && m.traje === 0) {
    di("Tu traje se desgasta con el ambiente y se daña rápido en zonas peligrosas. Si se rompe, el oxígeno se escapa cuatro veces más rápido.", "alta");
  } else if (yaVolo && m.escudo === 0) {
    di("Sin escudo térmico hay un 30 % de riesgo de dañar la mitad de la carga en la reentrada. Cada nivel baja ese riesgo.", "alta");
  } else if (yaVolo && m.sensor === 0) {
    di(`Tus sensores solo identifican objetos a ${alcanceSensor()} m. Con mejores sensores sabrás qué vale la pena antes de caminar hasta allí.`, "alta");
  }

  di(`Sobre ${p.nombre}: ${p.dato}`, estado.visitados[objetivo] ? "alta" : "media");
  return L;
}

export const TEXTO_CONFIANZA = {
  alta: "Confianza alta: dato medido o confirmado",
  media: "Confianza media: datos de telescopio, lo confirmaremos al llegar",
};
