// Conversaciones con opciones. Cada conversación es { lineas: [{ texto, confianza? }], opciones: [{ texto, accion }] }.
// `accion()` devuelve la siguiente conversación, o null para cerrarla.
import { DATOS_PLANETAS, MISIONES } from "./datos.js";
import { consejos } from "./cientifico.js";
import { estado, ORDEN, ENCARGOS, encargoDe, aceptarEncargo, entregarEncargo, tieneParaEncargo } from "./reglas.js";

const L = (...textos) => textos.map(texto => ({ texto }));
const progreso = () => ORDEN.filter(id => estado.misiones[id]).length; // misiones cumplidas, de 0 a 5

// ----- Dr. Nova -----
const HISTORIA = L(
  "Hace treinta años trabajaba en un radiotelescopio. Una noche captamos un pulso débil que venía de la dirección de Júpiter.",
  "Se repetía cada pocos minutos. Mis colegas dijeron que era la radiación de Júpiter, que emite ondas de radio muy fuertes. Probablemente tenían razón.",
  "Pero yo nunca dejé de preguntarme si venía de Europa, de ese océano bajo el hielo. Por eso construí este cohete… y por eso acabó estrellado en un granero.",
  "Ahora tú puedes terminar lo que yo empecé.",
);
const HISTORIA_FINAL = L(
  "¿Te das cuenta? El pulso que oí hace treinta años venía de Europa. No estaba loco.",
  "Aunque, siendo científicos, habrá que repetir la medición muchas veces antes de anunciarlo. Así funciona la ciencia.",
);

function sobrePlaneta(id) {
  const d = DATOS_PLANETAS[id], M = MISIONES[id];
  const luz = d.luz >= 1 ? `${d.luz.toFixed(1)} veces más luz` : `${Math.round(1 / d.luz)} veces menos luz`;
  return [
    { texto: `${d.lugar}: gravedad de ${d.gravedad} g, ${luz} del Sol que la Tierra, y la señal tarda entre ${d.senal[0]} y ${d.senal[1]} minutos en llegar.`, confianza: "alta" },
    { texto: d.dato, confianza: estado.visitados[id] ? "alta" : "media" },
    { texto: `La misión allí: ${M.desc} ${M.dato}`, confianza: "alta" },
  ];
}

export function conversacionNova() {
  const siguiente = ORDEN.find(id => !estado.misiones[id]) || "europa";
  const menu = lineas => ({
    lineas,
    opciones: [
      { texto: "¿Qué hago ahora?", accion: () => menu(consejos()) },
      { texto: `Háblame de ${DATOS_PLANETAS[siguiente].nombre}`, accion: () => menu(sobrePlaneta(siguiente)) },
      { texto: "¿Por qué te importa tanto Europa?", accion: () => menu(estado.final ? HISTORIA_FINAL : HISTORIA) },
      { texto: "Hasta luego", accion: () => null },
    ],
  });
  return menu(consejos()); // la primera vez, consejos() es la presentación
}

// ----- Vecinos -----
// Saludos según cuántas misiones llevas: [0], [1-2], [3-4], [5]
const SALUDOS = {
  "Doña Luz": [
    L("¿Tú eres quien revivió el cohete del viejo granero? ¡Todo el pueblo te vio humear!"),
    L("Anoche vi tu cohete cruzar el cielo como una estrella fugaz. ¡Qué orgullo para el pueblo!"),
    L("Dicen que ya llegaste hasta Júpiter. Desde aquí se ve a simple vista: es ese punto brillante que no titila."),
    L("¡Vida en Europa! Esta noche miraré a Júpiter sabiendo que allí, en una de sus lunas, alguien nos devolvió el saludo."),
  ],
  "Marta": [
    L("¡Bienvenido al mercado! Aquí pago un 20 % más que en tu granero."),
    L("Lo que traes del espacio se vende solo. La gente quiere tener un pedacito de otro mundo."),
    L("Ya tengo clientes que preguntan por ti antes de que aterrices. ¿Qué traes hoy?"),
    L("Pondré un cartel: «Aquí compró el descubridor de la vida en Europa». ¡Las ventas se van a disparar!"),
  ],
  "Tomás": [
    L("Consejo de mecánico: lo que pesa, cuesta. Cada pieza que le pones al cohete pide más combustible para moverla."),
    L("Si tu motor se calienta mucho al despegar, no es un error: es física. Respeta la masa."),
    L("Un cohete que va tan lejos necesita energía de sobra. Allá afuera, sin energía no hay oxígeno."),
    L("Ese cohete empezó roto en un granero y llegó a Europa. Es la mejor reparación que he visto."),
  ],
  "Leo": [
    L("¿Es verdad que en Venus las nubes son de ácido? ¡Guácala!"),
    L("¿Saltaste muy alto en Mercurio? ¡Yo quiero saltar en un planeta con poca gravedad!"),
    L("En la escuela dije que conozco a alguien que fue a Júpiter. ¡Nadie me cree!"),
    L("Cuando sea grande voy a ser científico como el Dr. Nova. ¡Y voy a ir a Europa a saludar a los bichitos!"),
  ],
};

export function conversacionVecino(nombre) {
  const etapa = [0, 1, 1, 2, 2, 3][progreso()];
  const id = encargoDe(nombre), e = ENCARGOS[id];

  const menu = lineas => {
    const opciones = [];
    const estadoEncargo = estado.encargos[id];
    if (!estadoEncargo) opciones.push({ texto: "¿Necesitas algo?", accion: () => pedido() });
    else if (estadoEncargo === "activo") {
      const tengo = tieneParaEncargo(id);
      opciones.push(tengo >= e.cantidad
        ? { texto: `Entregar: ${e.titulo} (${tengo}/${e.cantidad})`, accion: () => menu([{ texto: `¡Gracias! ${entregarEncargo(id)}` }]) }
        : { texto: `¿Qué me habías pedido? (${tengo}/${e.cantidad})`, accion: () => menu(L(`${e.desc} Te daré ${e.premio}.`)) });
    }
    opciones.push({ texto: "Adiós", accion: () => null });
    return { lineas, opciones };
  };

  const pedido = () => ({
    lineas: L(`${e.desc} A cambio te daré ${e.premio}.`),
    opciones: [
      { texto: "Trato hecho", accion: () => (aceptarEncargo(id), menu(L("¡Gracias! Te esperaré aquí."))) },
      { texto: "Ahora no", accion: () => menu(L("Como quieras. Si cambias de idea, aquí estoy.")) },
    ],
  });

  const saludo = estado.encargos[id] === "hecho" && etapa < 3
    ? [...SALUDOS[nombre][etapa], { texto: "Por cierto, gracias otra vez por el encargo." }]
    : SALUDOS[nombre][etapa];
  return menu(saludo);
}
