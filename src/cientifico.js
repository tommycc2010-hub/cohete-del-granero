// El Dr. Nova: personaje de bloques que guía al jugador. Explica los trade-offs, pero no decide por ti.
import * as THREE from "three";
import { caja, etiqueta } from "./estilo.js";
import { DATOS_PLANETAS } from "./datos.js";
import { estado, ORDEN, capacidad, costoIda, alcanceSensor } from "./reglas.js";

export const NOMBRE = "Dr. Nova";

// ----- Modelo -----
export function crearCientifico(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pieza = (m, px, py, pz, padre = g) => { m.position.set(px, py, pz); padre.add(m); return m; };

  const PIEL = 0xf2c9a0, BATA = 0xf4f4f4, PANTALON = 0x34495e, PELO = 0xb9bcc2;
  pieza(caja(0.24, 0.8, 0.26, PANTALON), -0.16, 0.4, 0);
  pieza(caja(0.24, 0.8, 0.26, PANTALON), 0.16, 0.4, 0);
  pieza(caja(0.74, 1.0, 0.42, BATA), 0, 1.25, 0);            // bata
  pieza(caja(0.2, 0.7, 0.03, 0x4aa3e8, false), 0, 1.35, 0.22); // camisa
  pieza(caja(0.08, 0.4, 0.03, 0xe5483b, false), 0, 1.4, 0.24); // corbata

  // Brazos: giran desde el hombro
  const brazos = [-1, 1].map(lado => {
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.48, 1.68, 0);
    g.add(hombro);
    pieza(caja(0.2, 0.8, 0.22, BATA), 0, -0.36, 0, hombro);
    pieza(caja(0.16, 0.16, 0.18, PIEL), 0, -0.82, 0, hombro);
    return hombro;
  });

  const cabeza = new THREE.Group();
  cabeza.position.set(0, 2.05, 0);
  g.add(cabeza);
  pieza(caja(0.52, 0.52, 0.5, PIEL), 0, 0, 0, cabeza);
  pieza(caja(0.58, 0.2, 0.56, PELO), 0, 0.3, 0, cabeza);       // pelo
  pieza(caja(0.1, 0.3, 0.3, PELO), -0.3, 0.1, -0.05, cabeza);
  pieza(caja(0.1, 0.3, 0.3, PELO), 0.3, 0.1, -0.05, cabeza);
  pieza(caja(0.18, 0.14, 0.04, 0x1d1d1d, false), -0.13, 0.04, 0.26, cabeza); // gafas
  pieza(caja(0.18, 0.14, 0.04, 0x1d1d1d, false), 0.13, 0.04, 0.26, cabeza);
  pieza(caja(0.12, 0.09, 0.02, 0x9fd8ff, false), -0.13, 0.04, 0.285, cabeza);
  pieza(caja(0.12, 0.09, 0.02, 0x9fd8ff, false), 0.13, 0.04, 0.285, cabeza);
  pieza(caja(0.3, 0.07, 0.04, PELO, false), 0, -0.14, 0.26, cabeza);         // bigote

  const cartel = etiqueta(NOMBRE.toUpperCase(), { fondo: "#4aa3e8", ancho: 1.6 });
  cartel.position.y = 2.85;
  g.add(cartel);

  let t = 0;
  // Se mece un poco y gira para mirar al jugador cuando está cerca.
  function actualizar(dt, jugadorPos) {
    t += dt;
    g.position.y = Math.sin(t * 2) * 0.03;
    brazos[0].rotation.x = Math.sin(t * 2) * 0.12;
    brazos[1].rotation.x = -Math.sin(t * 2) * 0.12;
    cabeza.rotation.z = Math.sin(t * 1.3) * 0.05;
    const dx = jugadorPos.x - g.position.x, dz = jugadorPos.z - g.position.z;
    if (Math.hypot(dx, dz) < 9) {
      let dif = Math.atan2(dx, dz) - g.rotation.y;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      g.rotation.y += dif * Math.min(1, dt * 5);
    }
  }

  g.rotation.y = 0.4;
  return { grupo: g, actualizar };
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
    di("Regla de oro: cada mejora añade masa, y más masa gasta más combustible. En una misión espacial nada es gratis.");
    return L;
  }

  const objetivo = ORDEN.find(id => !estado.visitados[id]) || "europa";
  const p = DATOS_PLANETAS[objetivo];
  const necesita = costoIda(objetivo) * 2;
  const yaVolo = Object.keys(estado.visitados).length > 0;

  if (estado.carga.length) {
    const total = estado.carga.reduce((s, o) => s + o.valor, 0);
    const uno = estado.carga.length === 1;
    di(`Traes ${uno ? "1 objeto" : estado.carga.length + " objetos"} por ${total} 💰. ${uno ? "Véndelo" : "Véndelos"} en la mesa de afuera antes de planear la siguiente compra.`);
  }

  if (objetivo === "europa" && m.antena < 2) {
    di("Para Europa necesito la antena en nivel 2. Sin ella no podremos escuchar nada bajo el hielo.", "alta");
  }
  if (capacidad() < necesita + 6) {
    di(`${p.nombre} pide unos ${necesita} de combustible ida y vuelta, y el tanque solo carga ${capacidad()}. No llegamos así.`, "alta");
    di("Hay dos caminos: ampliar el tanque, que añade masa, o mejorar el motor, que gasta menos por viaje. Compáralos en el Taller.");
  } else if (estado.combustible < necesita + 6) {
    di(`Carga combustible: ${p.nombre} pide ${necesita} ida y vuelta, más lo que gastes maniobrando.`, "alta");
  } else {
    di(`Estamos listos para ${p.nombre}. Recuerda: solo el impulso gasta combustible. Acelera, suelta y déjate llevar.`);
  }

  if (yaVolo && m.escudo === 0) {
    di("Sin escudo térmico hay un 30 % de riesgo de dañar la mitad de la carga en la reentrada. Cada nivel baja ese riesgo.", "alta");
  } else if (yaVolo && m.sensor === 0) {
    di(`Tus sensores solo identifican objetos a ${alcanceSensor()} m. Con mejores sensores sabrás qué vale la pena antes de gastar combustible.`, "alta");
  }

  di(`Sobre ${p.nombre}: ${p.dato}`, estado.visitados[objetivo] ? "alta" : "media");
  return L;
}

export const TEXTO_CONFIANZA = {
  alta: "Confianza alta: dato medido o confirmado",
  media: "Confianza media: datos de telescopio, lo confirmaremos al llegar",
};
