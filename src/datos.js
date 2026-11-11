// Datos de EJEMPLO. Se reemplazan por la base de datos oficial de la NASA cuando se libere.
export const DATOS_PLANETAS = {
  mercurio: { nombre: "Mercurio", lugar: "Mercurio", distancia: 1.0, peligro: 0.6, nota: "Calor extremo, sin atmósfera",
    suelo: "Aterrizamos en una llanura de cráteres. Sin atmósfera, el cielo es negro aunque sea de día. Aléjate de las rocas al rojo vivo.",
    dato: "Casi no tiene atmósfera que guarde el calor: de día ronda los 430 °C y de noche baja a unos -180 °C." },
  venus:    { nombre: "Venus", lugar: "Venus", distancia: 1.6, peligro: 0.8, nota: "Presión y calor enormes",
    suelo: "Bienvenido al horno: nubes de ácido sulfúrico, volcanes y charcos de lava. El traje va a sufrir, no te alejes demasiado.",
    dato: "Su superficie ronda los 465 °C y la presión es unas 90 veces la de la Tierra. Un escudo térmico es obligatorio." },
  marte:    { nombre: "Marte", lugar: "Marte", distancia: 2.4, peligro: 0.5, nota: "Agua antigua",
    suelo: "Marte: polvo rojo, mesetas y remolinos de polvo. El aire es tan fino que no sirve para respirar. Vigila tu oxígeno.",
    dato: "Tiene hielo de agua en los polos y cauces secos de ríos y lagos antiguos. Donde hubo agua, pudo haber vida." },
  jupiter:  { nombre: "Júpiter", lugar: "Ío, luna de Júpiter", distancia: 3.6, peligro: 1.0, nota: "Radiación intensa; se aterriza en su luna Ío",
    suelo: "Júpiter es puro gas, no hay dónde posarse. Por eso bajamos en Ío, su luna: el lugar con más volcanes activos del sistema solar.",
    dato: "Es un gigante gaseoso sin suelo donde aterrizar, y sus cinturones de radiación dañan la electrónica." },
  europa:   { nombre: "Europa", lugar: "Europa", distancia: 3.8, peligro: 0.9, nota: "Océano bajo el hielo (final)",
    suelo: "Estamos sobre el hielo de Europa. La antena marca el origen de la señal 📡: camina hasta allí y cuidado con los géiseres.",
    dato: "Bajo su corteza de hielo los datos indican un océano de agua salada, con más agua que todos los océanos de la Tierra." },
};
// `dato` es conocimiento general de divulgación; hay que contrastarlo con la base de datos de la NASA.

// Objetos recolectables: prob = peso base de aparición, valor = precio base de venta.
export const OBJETOS = [
  { nombre: "Chatarra espacial", valor: 20,   prob: 0.50, color: "#9aa3a8" },
  { nombre: "Hielo",             valor: 60,   prob: 0.25, color: "#8fe3f0" },
  { nombre: "Mineral raro",      valor: 200,  prob: 0.15, color: "#ffc94a" },
  { nombre: "Cristal lunar",     valor: 600,  prob: 0.07, color: "#e28bff" },
  { nombre: "Muestra biológica", valor: 2000, prob: 0.03, color: "#6ee37a" },
];
