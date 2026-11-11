// Datos de EJEMPLO. Se reemplazan por la base de datos oficial de la NASA cuando se libere.
export const DATOS_PLANETAS = {
  mercurio: { nombre: "Mercurio", lugar: "Mercurio", gravedad: 0.38, arrastre: 0, distancia: 1.0, peligro: 0.6, nota: "Calor extremo, sin atmósfera",
    suelo: "Aterrizamos en una llanura de cráteres. Sin atmósfera, el cielo es negro aunque sea de día. Al sol el traje se calienta: avanza de sombra en sombra.",
    dato: "Casi no tiene atmósfera que guarde el calor: de día ronda los 430 °C y de noche baja a unos -180 °C." },
  venus:    { nombre: "Venus", lugar: "Venus", gravedad: 0.90, arrastre: 0.02, distancia: 1.6, peligro: 0.8, nota: "Presión y calor enormes",
    suelo: "Bienvenido al horno: nubes de ácido sulfúrico, volcanes y charcos de lava. El traje va a sufrir, no te alejes demasiado.",
    dato: "Su superficie ronda los 465 °C y la presión es unas 90 veces la de la Tierra. Un escudo térmico es obligatorio." },
  marte:    { nombre: "Marte", lugar: "Marte", gravedad: 0.38, arrastre: 0.002, distancia: 2.4, peligro: 0.5, nota: "Agua antigua",
    suelo: "Marte: polvo rojo, mesetas y remolinos de polvo. El aire es tan fino que no sirve para respirar. Vigila tu oxígeno.",
    dato: "Tiene hielo de agua en los polos y cauces secos de ríos y lagos antiguos. Donde hubo agua, pudo haber vida." },
  jupiter:  { nombre: "Júpiter", lugar: "Ío, luna de Júpiter", gravedad: 0.18, arrastre: 0, distancia: 3.6, peligro: 1.0, nota: "Radiación intensa; se aterriza en su luna Ío",
    suelo: "Júpiter es puro gas, no hay dónde posarse. Por eso bajamos en Ío, su luna: el lugar con más volcanes activos del sistema solar.",
    dato: "Es un gigante gaseoso sin suelo donde aterrizar, y sus cinturones de radiación dañan la electrónica." },
  europa:   { nombre: "Europa", lugar: "Europa", gravedad: 0.13, arrastre: 0, distancia: 3.8, peligro: 0.9, nota: "Océano bajo el hielo (final)",
    suelo: "Estamos sobre el hielo de Europa. La antena marca el origen de la señal 📡: camina hasta allí y cuidado con los géiseres.",
    dato: "Bajo su corteza de hielo los datos indican un océano de agua salada, con más agua que todos los océanos de la Tierra." },
};
// `gravedad` es la del lugar donde se aterriza (Tierra = 1); `arrastre` es el freno de su atmósfera.
// `dato` es conocimiento general de divulgación; hay que contrastarlo con la base de datos de la NASA.

// Misión principal de cada destino. `dato` es el hecho real en el que se basa.
export const MISIONES = {
  mercurio: { titulo: "Hielo en la sombra", recompensa: 300,
    desc: "Toma una muestra de hielo en un cráter donde nunca da el sol.",
    dato: "En los cráteres de los polos de Mercurio hay hielo de agua en sombra permanente, aunque el planeta está pegado al Sol." },
  venus: { titulo: "Estación contra el calor", recompensa: 450,
    desc: "Instala una estación meteorológica antes de que el calor la destruya.",
    dato: "Las sondas soviéticas Venera aguantaron como mucho unas dos horas en la superficie de Venus." },
  marte: { titulo: "El rover dormido", recompensa: 650,
    desc: "Limpia y orienta el panel solar de un rover abandonado.",
    dato: "El polvo acumulado en los paneles solares dejó sin energía a varias misiones reales en Marte." },
  jupiter: { titulo: "El pulso del volcán", recompensa: 900,
    desc: "Coloca un sismógrafo junto a un volcán activo de Ío.",
    dato: "Ío es el cuerpo con más volcanes activos del sistema solar: la gravedad de Júpiter lo estira y lo calienta por dentro." },
  europa: { titulo: "Triangular la señal", recompensa: 1500,
    desc: "Planta tres antenas y encuentra el origen de la señal.",
    dato: "Con varios receptores separados se ubica una fuente de radio viendo dónde se cruzan sus lecturas." },
};

// Objetos recolectables: prob = peso base de aparición, valor = precio base de venta.
export const OBJETOS = [
  { nombre: "Chatarra espacial", valor: 30,   prob: 0.50, color: "#9aa3a8" },
  { nombre: "Hielo",             valor: 80,   prob: 0.25, color: "#8fe3f0" },
  { nombre: "Mineral raro",      valor: 200,  prob: 0.15, color: "#ffc94a" },
  { nombre: "Cristal lunar",     valor: 600,  prob: 0.07, color: "#e28bff" },
  { nombre: "Muestra biológica", valor: 2000, prob: 0.03, color: "#6ee37a" },
];
