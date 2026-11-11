// Tutorial: una lista corta de objetivos que guía la primera partida.
const PASOS = [
  { clave: "hablo",    texto: "Entra al granero y habla con el Dr. Nova (E)" },
  { clave: "despego",  texto: "Ve al cohete, pulsa E y despega hacia Mercurio" },
  { clave: "aterrizo", texto: "Vuela hasta la zona 🛬 y frena con W para posarte a menos de 3 m/s" },
  { clave: "recogio",  texto: "Recoge objetos a pie. Vigila el oxígeno: el cohete lo recarga" },
  { clave: "regreso",  texto: "Vuelve al cohete y pulsa E para regresar al granero" },
  { clave: "vendio",   texto: "Vende la carga en la mesa de VENTA (o en el pueblo, +20 %)" },
  { clave: "mejoro",   texto: "Compra una mejora en el TALLER" },
];

export function crearTutorial(el) {
  const hecho = {};
  let i = 0;

  function pintar() {
    el.innerHTML = i < PASOS.length
      ? `<b>Objetivo ${i + 1}/${PASOS.length}</b>${PASOS[i].texto}`
      : `<b>Objetivo</b>Mejora el cohete y sigue la señal hasta Europa`;
  }

  // Marca algo como hecho. Devuelve true si con eso se completó el objetivo actual.
  function marcar(clave) {
    hecho[clave] = true;
    const antes = i;
    while (i < PASOS.length && hecho[PASOS[i].clave]) i++;
    if (i !== antes) pintar();
    return i !== antes;
  }

  pintar();
  return { marcar };
}
