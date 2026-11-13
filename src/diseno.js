// Diseño de misión (el corazón del reto "Space Mission Design Game"):
// antes de cada viaje se elige un objetivo científico, los instrumentos, el lanzador y el tipo de misión.
// Cada decisión tiene consecuencias: más instrumentos = más ciencia, pero también más masa (combustible),
// más energía, más costo y más datos que guardar y enviar a la Tierra.
// Aquí están los catálogos, el cálculo del diseño, la generación y envío de datos, y la evaluación final.
// Todo sin nada visual (lo dibujan laboratorio.js e informe).
import { estado, ORDEN, factorMasa, costoIda, energiaMax, generacion, consumoSistemas, retrasoSenal } from "./reglas.js";
import { DATOS_PLANETAS } from "./datos.js";

// ----- Instrumentos científicos -----
// masa en kg · potencia en energía/s (la nave base gasta 0.35) · costo en 💰 por misión (integración y operación)
// datos en MB por segundo de observación · valor = puntos de ciencia por MB · donde funciona
export const INSTRUMENTOS = {
  camara:       { nombre: "Cámara de alta resolución", icono: "📷", masa: 20, potencia: 0.08, costo: 60,  datos: 3,   valor: 1,   donde: ["orbita", "suelo"],
                  desc: "Fotografía el relieve con mucho detalle.", real: "HiRISE, en el Mars Reconnaissance Orbiter, distingue objetos del tamaño de una mesa desde órbita." },
  espectrometro:{ nombre: "Espectrómetro", icono: "🌈", masa: 35, potencia: 0.12, costo: 120, datos: 1.5, valor: 3,   donde: ["orbita", "suelo"],
                  desc: "Descompone la luz para saber de qué está hecho algo.", real: "Así se identificó hielo de agua en los cráteres de Mercurio y minerales formados con agua en Marte." },
  radar:        { nombre: "Radar que atraviesa el suelo", icono: "📡", masa: 60, potencia: 0.25, costo: 200, datos: 2,   valor: 3,   donde: ["orbita"],
                  desc: "Ve lo que hay bajo el hielo o el polvo. Pesa y gasta mucha energía.", real: "El radar REASON de Europa Clipper estudiará el hielo de Europa hasta varios kilómetros de profundidad." },
  termico:      { nombre: "Cámara infrarroja", icono: "🌡", masa: 25, potencia: 0.1,  costo: 110, datos: 2,   valor: 2,   donde: ["orbita", "suelo"],
                  desc: "Mide temperaturas: encuentra volcanes activos y zonas calientes.", real: "Con infrarrojos, la sonda Galileo y la misión Juno vigilaron los volcanes de Ío." },
  magnetometro: { nombre: "Magnetómetro", icono: "🧲", masa: 10, potencia: 0.04, costo: 70,  datos: 0.5, valor: 4,   donde: ["orbita", "suelo"],
                  desc: "Mide campos magnéticos. Ligero y barato, pero genera pocos datos.", real: "El magnetómetro de Galileo dio la primera pista del océano de agua salada bajo el hielo de Europa." },
  sismometro:   { nombre: "Sismómetro", icono: "〰", masa: 25, potencia: 0.05, costo: 90,  datos: 0.6, valor: 5,   donde: ["suelo"],
                  desc: "Escucha los temblores para conocer el interior. Solo funciona apoyado en el suelo.", real: "El sismómetro SEIS de InSight registró más de 1300 martemotos y midió el núcleo de Marte." },
  meteo:        { nombre: "Estación meteorológica", icono: "🌬", masa: 15, potencia: 0.06, costo: 60,  datos: 0.8, valor: 2.5, donde: ["suelo"],
                  desc: "Mide viento, presión y temperatura. Solo en el suelo.", real: "Los rovers de Marte llevan estaciones meteorológicas, como REMS en Curiosity." },
};

// ----- Lanzadores: llevan el cohete hasta el espacio -----
export const LANZADORES = {
  ligero: { nombre: "Lanzador ligero", icono: "🚀", capacidad: 900,  costo: 0,   desc: "Barato. Sirve para naves pequeñas." },
  medio:  { nombre: "Lanzador medio",  icono: "🚀", capacidad: 1300, costo: 150, desc: "Para naves con varias mejoras e instrumentos." },
  pesado: { nombre: "Lanzador pesado", icono: "🚀", capacidad: 2000, costo: 400, desc: "Lleva casi cualquier cosa, pero es caro." },
};

// ----- Tipo de misión -----
// combustible: multiplica el viaje · orbita/suelo: cuánto rinden los instrumentos en cada lugar
export const TIPOS = {
  sobrevuelo: { nombre: "Sobrevuelo", icono: "☄", combustible: 0.65, orbita: 2.0, suelo: 0, aterriza: false, ventana: 35,
                desc: "Pasa cerca del planeta sin frenar: el más barato, pero solo tienes unos segundos para observar.",
                real: "Así exploraron por primera vez los planetas las Mariner y las Voyager." },
  orbitador:  { nombre: "Orbitador", icono: "🛰", combustible: 1.0, orbita: 1.0, suelo: 0, aterriza: false,
                desc: "Se queda en órbita observando todo el tiempo que quieras. No baja al suelo.",
                real: "Los orbitadores, como MESSENGER o Juno, estudian un planeta durante años." },
  aterrizaje: { nombre: "Aterrizaje", icono: "🛬", combustible: 1.0, orbita: 0.4, suelo: 1.5, aterriza: true,
                desc: "Bajas a la superficie: la mayor ciencia y los instrumentos de suelo, pero el mayor riesgo.",
                real: "Venera, InSight y Perseverance aterrizaron para estudiar el suelo de cerca." },
};

// ----- Objetivos científicos: 3 por destino -----
// necesita: instrumentos que sirven (basta uno) · datos: MB mínimos de esos instrumentos para cumplirlo
export const OBJETIVOS = {
  mercurio: [
    { id: "hielo", titulo: "Hielo en los polos", necesita: ["radar", "espectrometro"], datos: 90, desc: "Confirmar el hielo escondido en los cráteres en sombra." },
    { id: "mapa", titulo: "Mapa de la superficie", necesita: ["camara"], datos: 160, desc: "Fotografiar el planeta lleno de cráteres." },
    { id: "campo", titulo: "Campo magnético", necesita: ["magnetometro"], datos: 30, desc: "Medir el campo magnético de un planeta tan pequeño." },
  ],
  venus: [
    { id: "atmosfera", titulo: "Química de las nubes", necesita: ["espectrometro"], datos: 90, desc: "Saber de qué están hechas las nubes de ácido." },
    { id: "volcanes", titulo: "Volcanes activos", necesita: ["termico", "radar"], datos: 110, desc: "Buscar volcanes que aún echan lava." },
    { id: "sismos", titulo: "¿Tiembla Venus?", necesita: ["sismometro"], datos: 30, desc: "Nadie lo ha medido: hace falta aterrizar." },
  ],
  marte: [
    { id: "agua", titulo: "Agua bajo el suelo", necesita: ["radar"], datos: 110, desc: "Encontrar capas de hielo enterradas." },
    { id: "clima", titulo: "El tiempo en Marte", necesita: ["meteo"], datos: 50, desc: "Medir el viento y las tormentas de polvo (en el suelo)." },
    { id: "interior", titulo: "El corazón de Marte", necesita: ["sismometro"], datos: 35, desc: "Escuchar martemotos para conocer su núcleo." },
  ],
  jupiter: [
    { id: "volcanes", titulo: "Los volcanes de Ío", necesita: ["termico"], datos: 110, desc: "Vigilar el lugar más volcánico del sistema solar." },
    { id: "azufre", titulo: "El azufre de Ío", necesita: ["espectrometro"], datos: 90, desc: "Medir de qué está hecha su superficie de colores." },
    { id: "magnetosfera", titulo: "El imán de Júpiter", necesita: ["magnetometro"], datos: 35, desc: "Medir el campo magnético más fuerte entre los planetas." },
  ],
  europa: [
    { id: "oceano", titulo: "El océano escondido", necesita: ["radar", "magnetometro"], datos: 90, desc: "Confirmar el agua líquida bajo el hielo." },
    { id: "sales", titulo: "Sales en las grietas", necesita: ["espectrometro"], datos: 90, desc: "Analizar el material rojizo que sube del océano." },
    { id: "mapa", titulo: "Mapa del hielo", necesita: ["camara"], datos: 160, desc: "Fotografiar las grietas para elegir dónde aterrizar algún día." },
  ],
};
// Premio en 💰 al cumplir el objetivo, según lo lejos del destino
export const premioObjetivo = dest => 120 + 90 * ORDEN.indexOf(dest);

// ----- La nave -----
export const masaNave = () => Math.round(600 * factorMasa(0));      // kg: crece con cada mejora
export const memoriaNave = () => 120 + 60 * estado.mejoras.sensor + 40 * estado.mejoras.antena; // MB a bordo
// MB/s que la antena envía a la Tierra: más antena = más rápido; más lejos (más minutos de señal) = más lento
export const enlace = dest => (1.2 + 1.6 * estado.mejoras.antena) / (1 + retrasoSenal(dest) / 12);

// ----- Calcular un diseño -----
// Devuelve el diseño con sus totales, y lo que falla o conviene revisar.
export function calcularDiseno(dest, { objetivo, instrumentos = [], lanzador = "ligero", tipo = "aterrizaje" }) {
  const inst = instrumentos.filter(id => INSTRUMENTOS[id]);
  const masaInstr = inst.reduce((s, id) => s + INSTRUMENTOS[id].masa, 0);
  const potencia = +inst.reduce((s, id) => s + INSTRUMENTOS[id].potencia, 0).toFixed(2);
  const L = LANZADORES[lanzador], T = TIPOS[tipo];
  const costo = inst.reduce((s, id) => s + INSTRUMENTOS[id].costo, 0) + L.costo;
  const masa = masaNave() + masaInstr;
  const d = { dest, objetivo, instrumentos: inst, lanzador, tipo, masaInstr, potencia, costo, masa, factorCombustible: T.combustible };
  const ida = costoIda(dest, d);
  const obj = (OBJETIVOS[dest] || []).find(o => o.id === objetivo);
  const sirven = obj ? inst.filter(id => obj.necesita.includes(id)) : [];
  const utilesAqui = id => (INSTRUMENTOS[id].donde.includes("orbita") && T.orbita > 0) || (INSTRUMENTOS[id].donde.includes("suelo") && T.suelo > 0);
  // Energía en el lugar: lo que generan paneles y RTG menos lo que gastan los sistemas y los instrumentos
  const gen = generacion(dest, T.aterriza), gasto = consumoSistemas() + potencia;
  // Datos esperados en una misión típica (sobrevuelo: su ventana; orbitador: 60 s; aterrizaje: 12 s en órbita + 120 s en el suelo)
  const segOrbita = tipo === "sobrevuelo" ? T.ventana : tipo === "orbitador" ? 60 : 12;
  const segSuelo = T.aterriza ? 120 : 0;
  const datosEsperados = Math.round(inst.reduce((s, id) => {
    const I = INSTRUMENTOS[id];
    return s + (I.donde.includes("orbita") ? I.datos * T.orbita * segOrbita : 0) + (I.donde.includes("suelo") ? I.datos * T.suelo * segSuelo : 0);
  }, 0));
  const datosObjetivo = Math.round(sirven.reduce((s, id) => {
    const I = INSTRUMENTOS[id];
    return s + (I.donde.includes("orbita") ? I.datos * T.orbita * segOrbita : 0) + (I.donde.includes("suelo") ? I.datos * T.suelo * segSuelo : 0);
  }, 0));

  const errores = [], avisos = [];
  if (!obj) errores.push("Elige un objetivo científico.");
  if (masa > L.capacidad) errores.push(`La nave pesa ${masa} kg y el ${L.nombre.toLowerCase()} solo lleva ${L.capacidad} kg. Usa un lanzador mayor o lleva menos instrumentos.`);
  if (estado.dinero < costo) errores.push(`El diseño cuesta ${costo} 💰 y tienes ${estado.dinero} 💰.`);
  if (estado.combustible < ida * 2) errores.push(`Hace falta ${ida * 2} ⛽ para ir y volver y tienes ${Math.floor(estado.combustible)} ⛽. Compra combustible o elige un sobrevuelo.`);
  if (obj && !sirven.length) avisos.push(`Para "${obj.titulo}" necesitas: ${obj.necesita.map(id => INSTRUMENTOS[id].nombre).join(" o ")}. Sin eso el objetivo no se cumple.`);
  else if (obj && datosObjetivo < obj.datos) avisos.push(`Con este diseño esperas unos ${datosObjetivo} MB para el objetivo y hacen falta ${obj.datos} MB: quizá tengas que observar más tiempo.`);
  inst.filter(id => !utilesAqui(id)).forEach(id => avisos.push(`${INSTRUMENTOS[id].nombre} no sirve en un ${T.nombre.toLowerCase()}: ${INSTRUMENTOS[id].donde.includes("suelo") ? "solo funciona en el suelo" : "solo funciona desde órbita"}. Es masa y costo de más.`));
  if (gen < gasto) avisos.push(`En ${DATOS_PLANETAS[dest].lugar} generarás ${gen.toFixed(1)} de energía por segundo y gastarás ${gasto.toFixed(1)}: la batería dura unos ${Math.round(energiaMax() / (gasto - gen))} s. Sin energía los instrumentos se apagan.`);
  if (datosEsperados > memoriaNave() + enlace(dest) * (segOrbita + segSuelo)) avisos.push(`Generarás más datos (${datosEsperados} MB) de los que caben (${memoriaNave()} MB) y la antena puede enviar: perderás ciencia. Mejora sensores o antena.`);
  if (!errores.length && masa > L.capacidad * 0.9) avisos.push(`El lanzador va al ${Math.round(100 * masa / L.capacidad)} % de su capacidad: casi sin margen.`);
  const cml = !obj ? 0 : !inst.length ? 1 : !errores.length && !avisos.length ? 4 : !errores.length ? 3 : 2;
  return { ...d, ida, gen, gasto, datosEsperados, datosObjetivo, sirven, errores, avisos, cml, valido: !errores.length };
}

// Lo que se guarda en la misión (sin los textos de ayuda)
export const disenoParaMision = c => ({
  dest: c.dest, objetivo: c.objetivo, instrumentos: c.instrumentos, lanzador: c.lanzador, tipo: c.tipo,
  masaInstr: c.masaInstr, potencia: c.potencia, costo: c.costo, masa: c.masa, factorCombustible: c.factorCombustible,
});

// Diseño automático razonable (lo usa el simulador de balance): el objetivo que pide el instrumento más barato,
// solo ese instrumento, el lanzador más barato que alcanza y aterrizaje.
export function disenoAutomatico(dest) {
  const opciones = OBJETIVOS[dest].flatMap(o => o.necesita.map(id => ({ o, id })));
  opciones.sort((a, b) => INSTRUMENTOS[a.id].costo - INSTRUMENTOS[b.id].costo);
  const { o, id } = opciones[0];
  for (const lanzador of Object.keys(LANZADORES)) {
    const c = calcularDiseno(dest, { objetivo: o.id, instrumentos: [id], lanzador, tipo: "aterrizaje" });
    if (c.masa <= LANZADORES[lanzador].capacidad) return disenoParaMision(c);
  }
  return disenoParaMision(calcularDiseno(dest, { objetivo: o.id, instrumentos: [id], lanzador: "pesado", tipo: "aterrizaje" }));
}

// ----- Datos durante la misión -----
export const nuevosDatos = () => ({ memoria: 0, enviados: 0, perdidos: 0, generados: {}, sinEnergia: 0 });

// Un paso de observación: los instrumentos generan datos (si hay energía), la memoria se llena y la antena envía.
// lugar: "orbita" o "suelo". Devuelve { lleno } para avisar al jugador.
export function pasoDatos(m, dt, lugar, hayEnergia) {
  const d = m.diseno, D = m.datos;
  if (!d || !D) return {};
  const T = TIPOS[d.tipo], factor = lugar === "suelo" ? T.suelo : T.orbita;
  const cap = memoriaNave();
  let lleno = false;
  if (!hayEnergia) D.sinEnergia += dt;
  else {
    for (const id of d.instrumentos) {
      const I = INSTRUMENTOS[id];
      if (!I.donde.includes(lugar) || !factor) continue;
      const mb = I.datos * factor * dt;
      const cabe = Math.max(0, Math.min(mb, cap - D.memoria));
      D.memoria += cabe;
      D.generados[id] = (D.generados[id] || 0) + cabe;
      if (cabe < mb) { D.perdidos += mb - cabe; lleno = true; }
    }
    const envio = Math.min(D.memoria, enlace(m.dest) * dt); // la antena necesita energía para transmitir
    D.memoria -= envio;
    D.enviados += envio;
  }
  return { lleno, cap };
}

// ----- Evaluación al volver -----
// Datos entregados: lo enviado por la antena más lo que queda en la memoria (si el cohete vuelve).
// Cada instrumento aporta en proporción a lo que generó.
export function evaluar(m, { rescate, averias = [], desmayos = 0, combustibleFinal = 0, capacidad = 1 }) {
  const d = m.diseno, D = m.datos;
  if (!d || !D) return null;
  const generadoTotal = Object.values(D.generados).reduce((s, x) => s + x, 0);
  const entregadoTotal = D.enviados + (rescate ? 0 : D.memoria);
  const parte = generadoTotal ? entregadoTotal / generadoTotal : 0;
  const entregado = Object.fromEntries(Object.entries(D.generados).map(([id, x]) => [id, x * parte]));
  const ciencia = Math.round(Object.entries(entregado).reduce((s, [id, x]) => s + x * INSTRUMENTOS[id].valor, 0));
  const obj = OBJETIVOS[d.dest].find(o => o.id === d.objetivo);
  const datosObj = obj ? obj.necesita.reduce((s, id) => s + (entregado[id] || 0), 0) : 0;
  const cumplido = !!obj && datosObj >= obj.datos;
  const pctEnviado = generadoTotal ? D.enviados / generadoTotal : 0;

  // Puntaje: ciencia + objetivo + buen uso del presupuesto - riesgos
  const puntos = {
    ciencia,
    objetivo: cumplido ? 300 : 0,
    presupuesto: Math.max(0, 150 - Math.round(d.costo / 4)),
    riesgo: -(rescate ? 200 : 0) - 40 * averias.length - 50 * desmayos - (D.sinEnergia > 5 ? 50 : 0),
  };
  const total = Math.max(0, Object.values(puntos).reduce((s, x) => s + x, 0));
  const meta = 300 + 150 * ORDEN.indexOf(d.dest); // puntaje de referencia del destino
  const estrellas = total >= meta * 1.6 ? 3 : total >= meta ? 2 : total >= meta * 0.45 ? 1 : 0;

  // ¿Por qué salió así? Explicaciones en palabras simples, de lo más importante a lo menos
  const porque = [];
  if (cumplido) porque.push(`✅ Objetivo cumplido: entregaste ${Math.round(datosObj)} MB de ${obj.necesita.filter(id => entregado[id]).map(id => INSTRUMENTOS[id].nombre.toLowerCase()).join(" y ")} y hacían falta ${obj.datos} MB.`);
  else if (obj && !d.instrumentos.some(id => obj.necesita.includes(id))) porque.push(`❌ Objetivo no cumplido: "${obj.titulo}" necesita ${obj.necesita.map(id => INSTRUMENTOS[id].nombre.toLowerCase()).join(" o ")}, y no lo llevabas.`);
  else if (obj) porque.push(`❌ Objetivo no cumplido: entregaste ${Math.round(datosObj)} de ${obj.datos} MB. ${d.tipo === "sobrevuelo" ? "Un sobrevuelo da poco tiempo para observar." : "Faltó tiempo observando, energía o espacio en la memoria."}`);
  if (D.perdidos > 1) porque.push(`💾 La memoria se llenó y se perdieron ${Math.round(D.perdidos)} MB. Más memoria (sensores) o una antena mejor para enviar más rápido.`);
  if (D.sinEnergia > 5) porque.push(`🔋 Los instrumentos estuvieron ${Math.round(D.sinEnergia)} s apagados por falta de energía. Cada instrumento gasta: más paneles, batería o un RTG.`);
  if (rescate) porque.push("🛟 Hubo que rescatarte: los datos que quedaban en la memoria se perdieron. Solo contó lo que ya habías enviado por la antena.");
  if (generadoTotal > 0) porque.push(`📡 La antena envió el ${Math.round(pctEnviado * 100)} % de los datos durante el viaje${pctEnviado < 0.5 ? ": la antena no dio abasto (más nivel de antena envía más rápido, y desde lejos todo va más lento)" : ""}.`);
  if (d.costo > 0) porque.push(`💰 El diseño costó ${d.costo} 💰 (${d.instrumentos.length} instrumento${d.instrumentos.length === 1 ? "" : "s"} y ${LANZADORES[d.lanzador].nombre.toLowerCase()}).`);
  if (averias.length) porque.push(`🔧 El aterrizaje dejó ${averias.length === 1 ? "una avería" : averias.length + " averías"}: frenar a tiempo también es parte del diseño.`);

  return {
    d, puntos, total, estrellas, meta, ciencia, cumplido, obj, entregado, entregadoTotal: Math.round(entregadoTotal),
    perdidos: Math.round(D.perdidos), pctEnviado, porque, parecido: misionParecida(d),
    combustibleFinal, capacidad,
  };
}

// ----- "Tu diseño se parece a…": misiones reales con un diseño parecido -----
const REALES = {
  mercurio: { sobrevuelo: "Mariner 10 (1974): la primera nave que visitó Mercurio, con tres sobrevuelos.",
              orbitador: "MESSENGER (2011-2015): orbitó Mercurio y confirmó el hielo en sus polos con un espectrómetro.",
              aterrizaje: "Ninguna nave ha aterrizado aún en Mercurio: tu diseño sería el primero." },
  venus: { sobrevuelo: "Mariner 2 (1962): el primer sobrevuelo con éxito de otro planeta.",
           orbitador: "Magellan (1990-1994): cartografió Venus a través de las nubes con un radar.",
           aterrizaje: "Venera 7 y Venera 13: las sondas soviéticas que aterrizaron en Venus y enviaron datos." },
  marte: { sobrevuelo: "Mariner 4 (1965): tomó las primeras fotos de cerca de Marte.",
           orbitador: "Mars Reconnaissance Orbiter: orbita Marte desde 2006 con la cámara HiRISE y un radar.",
           aterrizaje: "InSight (2018-2022) con su sismómetro, y los rovers Curiosity y Perseverance." },
  jupiter: { sobrevuelo: "Voyager 1 (1979): en su sobrevuelo descubrió los volcanes activos de Ío.",
             orbitador: "Galileo (1995-2003) y Juno (desde 2016): orbitan Júpiter y estudian sus lunas.",
             aterrizaje: "Nadie ha aterrizado en Ío: su radiación y sus volcanes lo hacen muy difícil." },
  europa: { sobrevuelo: "Galileo pasó cerca de Europa varias veces y su magnetómetro sugirió el océano.",
            orbitador: "Europa Clipper (llegará en 2030): estudiará Europa con radar, cámaras y magnetómetro.",
            aterrizaje: "Europa Lander: un concepto de la NASA para aterrizar en Europa, todavía sin aprobar." },
};
export const misionParecida = d => (REALES[d.dest] || {})[d.tipo] || "";

// ----- Récords: el mejor puntaje de cada destino -----
export function anotarRecord(ev) {
  const prev = estado.records[ev.d.dest];
  if (prev && prev.total >= ev.total) return false;
  estado.records[ev.d.dest] = { total: ev.total, estrellas: ev.estrellas, tipo: ev.d.tipo, dia: estado.dia };
  return true;
}

// ----- Modo equipo: de 2 a 4 personas, cada una con su rol -----
export const ROLES = {
  direccion:  { nombre: "Dirección", icono: "🧭", parte: "objetivo", meta: "Que el diseño cueste como mucho la mitad del dinero disponible.",
                cumple: (ev, x) => ev.d.costo <= x.dineroInicial * 0.5 },
  ciencia:    { nombre: "Ciencia", icono: "🔬", parte: "instrumentos", meta: "Entregar al menos 250 MB de datos.",
                cumple: ev => ev.entregadoTotal >= 250 },
  ingenieria: { nombre: "Ingeniería", icono: "🔧", parte: "lanzador", meta: "Dejar un 15 % de margen en el lanzador y no quedarse sin energía.",
                cumple: ev => ev.d.masa <= LANZADORES[ev.d.lanzador].capacidad * 0.85 && ev.puntos.riesgo > -50 },
  operaciones:{ nombre: "Operaciones", icono: "📡", parte: "tipo", meta: "Enviar por la antena al menos el 60 % de los datos y volver con algo de combustible.",
                cumple: (ev) => ev.pctEnviado >= 0.6 && ev.combustibleFinal >= ev.capacidad * 0.1 },
};
const REPARTO = { // qué roles lleva cada persona según cuántas son
  2: [["direccion", "ingenieria"], ["ciencia", "operaciones"]],
  3: [["direccion"], ["ciencia"], ["ingenieria", "operaciones"]],
  4: [["direccion"], ["ciencia"], ["ingenieria"], ["operaciones"]],
};
export function armarEquipo(nombres) {
  const n = Math.max(2, Math.min(4, nombres.length));
  return { activo: true, jugadores: nombres.slice(0, n).map((nombre, i) => ({ nombre: nombre.trim() || `Jugador ${i + 1}`, roles: REPARTO[n][i] })) };
}
export const quienTieneRol = (equipo, rol) => equipo && equipo.activo ? equipo.jugadores.find(j => j.roles.includes(rol)) : null;
// Bonus de equipo: 60 puntos por cada meta de rol cumplida
export function evaluarEquipo(ev, equipo, dineroInicial) {
  if (!equipo || !equipo.activo || !ev) return null;
  const metas = Object.entries(ROLES).map(([id, R]) => ({ id, ...R, jugador: quienTieneRol(equipo, id), ok: R.cumple(ev, { dineroInicial }) }));
  return { metas, bonus: 60 * metas.filter(m => m.ok).length };
}
