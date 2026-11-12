// Datos de EJEMPLO. Se reemplazan por la base de datos oficial de la NASA cuando se libere.
export const DATOS_PLANETAS = {
  mercurio: { nombre: "Mercurio", lugar: "Mercurio", ciclo: 12, viaje: 6, fase: 0, senal: [4, 12], luz: 6.67, suelo_luz: 1, gravedad: 0.38, arrastre: 0, distancia: 1.0, peligro: 0.6, nota: "Calor extremo, sin atmósfera",
    suelo: "Aterrizamos en una llanura de cráteres. Sin atmósfera, el cielo es negro aunque sea de día. Al sol el traje se calienta: avanza de sombra en sombra.",
    dato: "Casi no tiene atmósfera que guarde el calor: de día ronda los 430 °C y de noche baja a unos -180 °C." },
  venus:    { nombre: "Venus", lugar: "Venus", ciclo: 58, viaje: 8, fase: 50, senal: [2, 14], luz: 1.91, suelo_luz: 0.15, gravedad: 0.90, arrastre: 0.02, distancia: 1.6, peligro: 0.8, nota: "Presión y calor enormes",
    suelo: "Bienvenido al horno: nubes de ácido sulfúrico, volcanes y charcos de lava. El traje va a sufrir, no te alejes demasiado.",
    dato: "Su superficie ronda los 465 °C y la presión es unas 90 veces la de la Tierra. Un escudo térmico es obligatorio." },
  marte:    { nombre: "Marte", lugar: "Marte", ciclo: 78, viaje: 12, fase: 40, senal: [3, 22], luz: 0.43, suelo_luz: 1, gravedad: 0.38, arrastre: 0.002, distancia: 2.4, peligro: 0.5, nota: "Agua antigua",
    suelo: "Marte: polvo rojo, mesetas y remolinos de polvo. El aire es tan fino que no sirve para respirar. Vigila tu oxígeno.",
    dato: "Tiene hielo de agua en los polos y cauces secos de ríos y lagos antiguos. Donde hubo agua, pudo haber vida." },
  jupiter:  { nombre: "Júpiter", lugar: "Ío, luna de Júpiter", ciclo: 40, viaje: 30, fase: 25, senal: [33, 53], luz: 0.037, suelo_luz: 1, gravedad: 0.18, arrastre: 0, distancia: 3.6, peligro: 1.0, nota: "Radiación intensa; se aterriza en su luna Ío",
    suelo: "Júpiter es puro gas, no hay dónde posarse. Por eso bajamos en Ío, su luna: el lugar con más volcanes activos del sistema solar.",
    dato: "Es un gigante gaseoso sin suelo donde aterrizar, y sus cinturones de radiación dañan la electrónica." },
  europa:   { nombre: "Europa", lugar: "Europa", ciclo: 40, viaje: 32, fase: 25, senal: [33, 53], luz: 0.037, suelo_luz: 1, gravedad: 0.13, arrastre: 0, distancia: 3.8, peligro: 0.9, nota: "Océano bajo el hielo (final)",
    suelo: "Estamos sobre el hielo de Europa. La antena marca el origen de la señal 📡: camina hasta allí y cuidado con los géiseres.",
    dato: "Bajo su corteza de hielo los datos indican un océano de agua salada, con más agua que todos los océanos de la Tierra." },
};
// `ciclo`: días entre ventanas de lanzamiento (el periodo sinódico real dividido por 10: Marte, 780 días → 78).
// `viaje`: días de ida y vuelta en el juego. `senal`: minutos que tarda la luz en llegar desde la Tierra (mín. y máx.).
// `luz` es la luz solar comparada con la de la Tierra (cae con el cuadrado de la distancia al Sol);
// `suelo_luz` es la parte que llega a la superficie (las nubes de Venus dejan pasar poca).
// `gravedad` es la del lugar donde se aterriza (Tierra = 1); `arrastre` es el freno de su atmósfera.
// `dato` es conocimiento general de divulgación; hay que contrastarlo con la base de datos de la NASA.

// Misión principal de cada destino. `dato` es el hecho real en el que se basa.
export const MISIONES = {
  mercurio: { titulo: "Hielo en la sombra", recompensa: 300,
    desc: "Toma una muestra de hielo en un cráter donde nunca da el sol.",
    dato: "En los cráteres de los polos de Mercurio hay hielo de agua en sombra permanente, aunque el planeta está pegado al Sol." },
  venus: { titulo: "Estación contra el calor", recompensa: 550,
    desc: "Instala una estación meteorológica antes de que el calor la destruya.",
    dato: "Las sondas soviéticas Venera aguantaron como mucho unas dos horas en la superficie de Venus." },
  marte: { titulo: "El rover dormido", recompensa: 850,
    desc: "Limpia y orienta el panel solar de un rover abandonado.",
    dato: "El polvo acumulado en los paneles solares dejó sin energía a varias misiones reales en Marte." },
  jupiter: { titulo: "El pulso del volcán", recompensa: 900,
    desc: "Coloca un sismógrafo junto a un volcán activo de Ío.",
    dato: "Ío es el cuerpo con más volcanes activos del sistema solar: la gravedad de Júpiter lo estira y lo calienta por dentro." },
  europa: { titulo: "Triangular la señal", recompensa: 1500,
    desc: "Planta tres antenas y encuentra el origen de la señal.",
    dato: "Con varios receptores separados se ubica una fuente de radio viendo dónde se cruzan sus lecturas." },
};

// Misiones secundarias: 5 por destino, además de la principal. Todas pagan y enseñan un dato real.
// Tipos: foto (visitar 3 puntos 📸), sensores (instalar 3 aparatos), recoger (traer objetos de ese lugar),
// aterrizaje (tocar suelo muy suave) y carga (volver con carga de cierto valor en un solo viaje).
const sec = (foto, sensores, recoger, aterrizaje, carga) => [
  { tipo: "foto", icono: "📸", ...foto },
  { tipo: "sensores", ...sensores },
  { tipo: "recoger", icono: "🧺", ...recoger },
  { tipo: "aterrizaje", icono: "🪶", vel: 2, ...aterrizaje },
  { tipo: "carga", icono: "📦", ...carga },
];
export const SECUNDARIAS = {
  mercurio: sec(
    { titulo: "Cráteres con nombre", objetivo: "Cráter", desc: "Fotografía los 3 cráteres marcados.", recompensa: 150,
      dato: "Los cráteres de Mercurio llevan nombres de artistas, músicos y escritores." },
    { icono: "🌡", titulo: "Del horno al congelador", objetivo: "Termómetro", desc: "Instala 3 termómetros en los puntos marcados.", recompensa: 180,
      dato: "Entre el día y la noche, el suelo de Mercurio cambia unos 600 °C." },
    { titulo: "Planeta de hierro", objeto: "Mineral raro", cantidad: 2, desc: "Recoge 2 minerales raros en Mercurio (en uno o varios viajes).", recompensa: 200,
      dato: "El núcleo de hierro de Mercurio ocupa cerca del 85 % de su radio." },
    { titulo: "Aterrizaje de pluma", desc: "Toca el suelo de Mercurio a menos de 2 m/s.", recompensa: 150,
      dato: "La sonda MESSENGER terminó su misión en 2015 estrellándose a propósito contra Mercurio." },
    { titulo: "Viaje productivo", valor: 300, desc: "Vuelve de Mercurio con carga que valga al menos 300 💰 en un solo viaje.", recompensa: 200,
      dato: "BepiColombo, una misión europea y japonesa, viaja para orbitar Mercurio." }),
  venus: sec(
    { titulo: "Mil volcanes", objetivo: "Volcán", desc: "Fotografía los 3 volcanes marcados.", recompensa: 220,
      dato: "Venus tiene más volcanes que ningún otro planeta: se han contado más de 1600 grandes." },
    { icono: "🧭", titulo: "Bajo presión", objetivo: "Sensor de presión", desc: "Instala 3 sensores de presión en los puntos marcados.", recompensa: 250,
      dato: "La presión en el suelo de Venus es como la que hay a 900 m bajo el mar." },
    { titulo: "Escarcha de metal", objeto: "Mineral raro", cantidad: 2, desc: "Recoge 2 minerales raros en Venus.", recompensa: 260,
      dato: "En las montañas de Venus el radar ve un brillo extraño: podría ser una 'escarcha' de metales." },
    { titulo: "Como la Venera 7", desc: "Toca el suelo de Venus a menos de 2 m/s.", recompensa: 200,
      dato: "La soviética Venera 7 fue en 1970 la primera nave que envió datos desde el suelo de otro planeta." },
    { titulo: "Carga de horno", valor: 400, desc: "Vuelve de Venus con carga que valga al menos 400 💰 en un solo viaje.", recompensa: 250,
      dato: "Un día en Venus dura más que su año: gira sobre sí mismo muy despacio." }),
  marte: sec(
    { titulo: "Gigantes rojos", objetivo: "Meseta", desc: "Fotografía las 3 mesetas marcadas.", recompensa: 280,
      dato: "El Olympus Mons de Marte es el volcán más alto del sistema solar: unas 2.5 veces el Everest." },
    { icono: "🌪", titulo: "Parte del tiempo marciano", objetivo: "Estación meteorológica", desc: "Instala 3 estaciones meteorológicas.", recompensa: 300,
      dato: "En Marte hay tormentas de polvo que pueden cubrir todo el planeta durante semanas." },
    { titulo: "Agua congelada", objeto: "Hielo", cantidad: 2, desc: "Recoge 2 bloques de hielo en Marte.", recompensa: 320,
      dato: "Bajo el suelo de Marte hay grandes capas de hielo de agua." },
    { titulo: "Grúa del cielo", desc: "Toca el suelo de Marte a menos de 2 m/s.", recompensa: 260,
      dato: "El rover Perseverance aterrizó en 2021 colgado de cables desde una 'grúa del cielo'." },
    { titulo: "Muestras para la Tierra", valor: 500, desc: "Vuelve de Marte con carga que valga al menos 500 💰 en un solo viaje.", recompensa: 320,
      dato: "Perseverance guarda muestras de roca en tubos para que algún día las traigan a la Tierra." }),
  jupiter: sec(
    { titulo: "Lagos de lava", objetivo: "Lago de lava", desc: "Fotografía los 3 lagos de lava marcados en Ío.", recompensa: 320,
      dato: "Loki, en Ío, es un lago de lava de unos 200 km de ancho." },
    { icono: "☢", titulo: "Radiación de Júpiter", objetivo: "Medidor de radiación", desc: "Instala 3 medidores de radiación.", recompensa: 360,
      dato: "La radiación cerca de Júpiter es tan fuerte que la sonda Juno lleva su electrónica en una caja de titanio." },
    { titulo: "Joya de azufre", objeto: "Cristal lunar", cantidad: 1, desc: "Recoge 1 cristal lunar en Ío.", recompensa: 380,
      dato: "El azufre de sus volcanes da a Ío sus colores amarillos, naranjas y rojos." },
    { titulo: "Más fino que Galileo", desc: "Toca el suelo de Ío a menos de 2 m/s.", recompensa: 300,
      dato: "La sonda Galileo pasó tan cerca de Ío que la radiación le provocó fallos." },
    { titulo: "Botín volcánico", valor: 600, desc: "Vuelve de Ío con carga que valga al menos 600 💰 en un solo viaje.", recompensa: 380,
      dato: "Ío tarda unas 42 horas en dar una vuelta a Júpiter." }),
  europa: sec(
    { titulo: "Grietas rojizas", objetivo: "Grieta", desc: "Fotografía las 3 grietas marcadas.", recompensa: 400,
      dato: "Las líneas rojizas de Europa podrían ser sales del océano que suben por las grietas." },
    { icono: "📏", titulo: "¿Cuánto hielo hay?", objetivo: "Sonda de hielo", desc: "Instala 3 sondas que miden el espesor del hielo.", recompensa: 450,
      dato: "Se calcula que la corteza de hielo de Europa tiene entre 15 y 25 km de espesor." },
    { titulo: "Hielo para estudiar", objeto: "Hielo", cantidad: 3, desc: "Recoge 3 bloques de hielo en Europa.", recompensa: 450,
      dato: "La sonda Europa Clipper llegará a Júpiter en 2030 para estudiar Europa." },
    { titulo: "Sin paracaídas", desc: "Toca el suelo de Europa a menos de 2 m/s.", recompensa: 350,
      dato: "Europa casi no tiene atmósfera: una nave no puede frenar con paracaídas, solo con motores." },
    { titulo: "Tesoro helado", valor: 700, desc: "Vuelve de Europa con carga que valga al menos 700 💰 en un solo viaje.", recompensa: 450,
      dato: "Europa es un poco más pequeña que la Luna de la Tierra." }),
};

// Objetos recolectables: prob = peso base de aparición, valor = precio base de venta.
export const OBJETOS = [
  { nombre: "Chatarra espacial", valor: 30,   prob: 0.50, color: "#9aa3a8" },
  { nombre: "Hielo",             valor: 80,   prob: 0.25, color: "#8fe3f0" },
  { nombre: "Mineral raro",      valor: 200,  prob: 0.15, color: "#ffc94a" },
  { nombre: "Cristal lunar",     valor: 600,  prob: 0.07, color: "#e28bff" },
  { nombre: "Muestra biológica", valor: 2000, prob: 0.03, color: "#6ee37a" },
];
