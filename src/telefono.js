// Teléfono: el menú del juego. Se abre con Tab y tiene apps de Estado, Taller, Mapa y Diario.
import {
  estado, MEJORAS, ORDEN, COSTO_EXPLORAR, capacidad, factorMasa, costoIda, costoMejora,
  desbloqueado, comprarMejora, iniciarMision, explorar, regresar, energiaMax, generacion, consumoSistemas,
  ventana, retrasoSenal, esperar, COSTO_DIA, ENCARGOS, LOGROS, tieneParaEncargo, progresoSecundaria, secundariasHechas } from "./reglas.js";
import { DATOS_PLANETAS, MISIONES, SECUNDARIAS } from "./datos.js";

const APPS = {
  estado: { icono: "📊", nombre: "Estado", color: "#4aa3e8" },
  taller: { icono: "🔧", nombre: "Taller", color: "#ffd23f" },
  mapa:   { icono: "🚀", nombre: "Mapa",   color: "#e5483b" },
  misiones: { icono: "🎯", nombre: "Misiones", color: "#e28bff" },
  logros:   { icono: "🏆", nombre: "Logros",   color: "#ffb14a" },
  diario: { icono: "📓", nombre: "Diario", color: "#5cc46b" },
};

export function crearTelefono({ alAbrir, alCerrar, alLanzar, alDisenar }) {
  const el = document.getElementById("telefono");
  const pantalla = el.querySelector(".tel-pantalla");
  let app = "inicio", abierto = false, ultimo = "";

  const fila = (a, b) => `<div class="tel-fila"><span>${a}</span><b>${b}</b></div>`;

  function vistaInicio() {
    return `<div class="tel-apps">${Object.entries(APPS).map(([id, a]) =>
      `<button class="tel-app" data-acc="app:${id}"><span style="background:${a.color}">${a.icono}</span>${a.nombre}</button>`).join("")}</div>`;
  }

  function vistaEstado() {
    const carga = estado.carga.length
      ? estado.carga.map(o => fila(`<i style="background:${o.color}"></i>${o.nombre}`, `${o.valor} 💰`)).join("")
      : `<p class="tel-nota">Sin carga. Sal al espacio a recolectar.</p>`;
    return fila("Dinero", `${estado.dinero} 💰`)
      + fila("Combustible", `${Math.floor(estado.combustible)} / ${capacidad()} ⛽`)
      + fila("Masa del cohete", `x${factorMasa().toFixed(2)}`)
      + fila("Batería", `${energiaMax()} 🔋`)
      + `<p class="tel-nota">Más masa = más combustible por viaje.</p>`
      + `<h3>Carga (${estado.carga.length})</h3>${carga}`;
  }

  function vistaTaller() {
    return Object.keys(MEJORAS).map(k => {
      const M = MEJORAS[k], lvl = estado.mejoras[k], tope = lvl >= M.max;
      const caro = !tope && estado.dinero < costoMejora(k);
      return `<button class="tel-item" data-acc="mejora:${k}" ${tope ? "disabled" : ""}>
        <b>${M.nombre}</b> <em>nivel ${lvl}/${M.max}</em>
        <span class="tel-precio ${caro ? "caro" : ""}">${tope ? "MAX" : costoMejora(k) + " 💰"}</span>
        <small>${M.desc}</small></button>`;
    }).join("");
  }

  function vistaMapa() {
    return `<div class="tel-fila"><span>📅 Hoy</span><b>Día ${estado.dia}</b></div>` + ORDEN.map(id => {
      const d = DATOS_PLANETAS[id], ok = desbloqueado(id), ida = costoIda(id);
      let nota = d.nota;
      if (!ok) nota = id === "europa"
        ? "Bloqueado: cumple la misión de Júpiter y sube la antena a nivel 2."
        : `Bloqueado: cumple la misión de ${DATOS_PLANETAS[ORDEN[ORDEN.indexOf(id) - 1]].nombre}.`;
      const v = ventana(id);
      const estadoVentana = v.abierta
        ? `<span class="tel-ventana abierta">🟢 Ventana abierta · quedan ${v.quedan} días</span>`
        : `<span class="tel-ventana">🔴 Fuera de ventana · +${Math.round(v.recargo * 100)} % combustible · abre en ${v.abre} días</span>`;
      const espera = ok && !v.abierta
        ? `<button class="tel-esperar" data-acc="esperar:${v.abre}">⏳ Esperar ${v.abre} días (${v.abre * COSTO_DIA} 💰)</button>` : "";
      return `<div class="tel-destino"><button class="tel-item" data-acc="lanzar:${id}" ${ok ? "" : "disabled"}>
        <b>${ok ? "" : "🔒 "}${d.nombre}</b>${estado.visitados[id] ? " <em>visitado</em>" : ""}
        <span class="tel-precio ${ok && estado.combustible < ida * 2 ? "caro" : ""}">${ida * 2} ⛽ ida y vuelta</span>
        <small>${nota}</small>
        ${ok ? `<small class="tel-disenar">🧪 Toca para diseñar la misión${estado.records[id] ? ` · 🏅 récord ${estado.records[id].total} ${"⭐".repeat(estado.records[id].estrellas)}` : ""}</small>` : ""}
        ${ok ? estadoVentana : ""}
        <small>☀ Luz solar ${d.luz >= 1 ? d.luz.toFixed(1) + "×" : "1/" + Math.round(1 / d.luz)} la de la Tierra · 🔋 ${(generacion(id, true) - consumoSistemas()) >= 0 ? "energía de sobra" : "la batería se gasta"}</small>
        <small>📡 Señal: ${retrasoSenal(id)} min de retraso · 📅 viaje de ${d.viaje} días</small></button>${espera}</div>`;
    }).join("");
  }

  function vistaMision() {
    const m = estado.mision;
    const carga = m.carga.map(o => fila(`<i style="background:${o.color}"></i>${o.nombre}`, `${o.valor} 💰`)).join("");
    return `<h3>Rumbo a ${DATOS_PLANETAS[m.dest].nombre}</h3>`
      + fila("Zonas exploradas", `${m.hecho} / ${m.encuentros}`)
      + fila("Combustible", `${Math.floor(estado.combustible)} ⛽`)
      + fila("Reserva para volver", `${m.ida} ⛽`)
      + `<button class="tel-boton azul" data-acc="explorar">🔭 Explorar (${COSTO_EXPLORAR} ⛽)</button>
         <button class="tel-boton" data-acc="regresar">🏠 Regresar al granero</button>
         <h3>Recolectado (${m.carga.length})</h3>${carga || `<p class="tel-nota">Nada todavía.</p>`}
         <p class="tel-nota">Modo simple: el vuelo en 3D llega en el Paso 5.</p>`;
  }

  function vistaMisiones() {
    return ORDEN.map(id => {
      const M = MISIONES[id], hecha = estado.misiones[id], abierta = desbloqueado(id);
      const marca = hecha ? "✅" : abierta ? "🎯" : "🔒";
      return `<div class="tel-fila tel-mision ${hecha ? "hecha" : ""}">
        <div><b>${marca} ${DATOS_PLANETAS[id].lugar}: ${M.titulo}</b>
          <small>${abierta || hecha ? M.desc : "Cumple la misión anterior para verla."}</small>
          ${hecha ? `<small class="tel-dato">Dato real: ${M.dato}</small>` : ""}</div>
        <span class="tel-precio">${M.recompensa} 💰</span></div>
        ${estado.records[id] ? `<div class="tel-record">🏅 Mejor diseño: ${estado.records[id].total} puntos ${"⭐".repeat(estado.records[id].estrellas)} (${estado.records[id].tipo})</div>` : ""}
        ${abierta || hecha ? `<div class="tel-secundarias"><b>⭐ Secundarias ${secundariasHechas(id)}/5</b>` + SECUNDARIAS[id].map(sx => {
          const pr = progresoSecundaria(id, sx), ok = pr === "✅";
          return `<div class="${ok ? "hecha" : ""}"><span>${ok ? "✅" : sx.icono}</span><div><b>${sx.titulo}</b> <i>${ok ? "" : pr}</i><small>${ok ? "Dato real: " + sx.dato : sx.desc}</small></div><em>${sx.recompensa} 💰</em></div>`;
        }).join("") + `</div>` : ""}`;
    }).join("");
  }

  function vistaEncargos() {
    return `<h3>Encargos del pueblo</h3>` + Object.entries(ENCARGOS).map(([id, e]) => {
      const st = estado.encargos[id];
      const marca = st === "hecho" ? "✅" : st === "activo" ? "📦" : "💬";
      const detalle = st === "hecho" ? "Cumplido." : st === "activo" ? `${e.desc} Llevas ${tieneParaEncargo(id)}/${e.cantidad}.` : `Habla con ${e.vecino} en Villa Siderense.`;
      return `<div class="tel-fila tel-mision ${st === "hecho" ? "hecha" : ""}"><div><b>${marca} ${e.vecino}: ${e.titulo}</b><small>${detalle}</small></div>
        <span class="tel-precio">${e.premio}</span></div>`;
    }).join("");
  }

  function vistaLogros() {
    const total = Object.keys(LOGROS).length, hechos = Object.keys(estado.logros).length;
    return `<p class="tel-nota">${hechos} de ${total} logros</p><div class="tel-logros">` + Object.entries(LOGROS).map(([id, l]) =>
      `<div class="tel-logro ${estado.logros[id] ? "" : "bloqueado"}"><span>${estado.logros[id] ? l.icono : "🔒"}</span><b>${l.titulo}</b><small>${l.desc}</small></div>`).join("") + `</div>`;
  }

  function vistaDiario() {
    const destinos = ORDEN.map(id => fila(DATOS_PLANETAS[id].nombre, estado.visitados[id] ? "✅ visitado" : "—")).join("");
    const hallazgos = ORDEN.filter(id => estado.visitados[id])
      .map(id => `<p class="tel-nota"><b>${DATOS_PLANETAS[id].nombre}:</b> ${DATOS_PLANETAS[id].dato}</p>`).join("")
      || `<p class="tel-nota">Visita un destino para confirmar sus datos.</p>`;
    const senal = estado.final ? `<div class="tel-fila"><span>📡 Señal de Europa</span><b>✅ detectada</b></div>` : "";
    return `<h3>Destinos</h3>${destinos}${senal}<h3>Descubrimientos confirmados</h3>${hallazgos}<h3>Últimos sucesos</h3>`
      + estado.log.map(t => `<p class="tel-nota">• ${t}</p>`).join("");
  }

  function vistaFinal() {
    return `<h3>📡 ¡Señal detectada en Europa!</h3>
      <p>Bajo el hielo hay un océano, y tu antena captó una señal que no viene de la Tierra.</p>
      <p><b>Hay vida extraterrestre.</b></p>
      <p class="tel-nota">Habla con el Dr. Nova en el granero: él te explica qué significa la señal.</p>
      <button class="tel-boton verde" data-acc="reiniciar">Jugar de nuevo</button>`;
  }

  function pintar() {
    const vistas = { inicio: vistaInicio, estado: vistaEstado, taller: vistaTaller, mapa: vistaMapa, misiones: () => vistaMisiones() + vistaEncargos(), logros: vistaLogros, mision: vistaMision, diario: vistaDiario, final: vistaFinal };
    const titulo = app === "inicio" ? "Mi teléfono" : app === "mision" ? "Misión" : app === "final" ? "Europa" : APPS[app].nombre;
    const atras = ["inicio", "mision", "final"].includes(app) ? "" : `<button class="tel-atras" data-acc="app:inicio">‹</button>`;
    pantalla.innerHTML = `<div class="tel-barra">${atras}<span>${titulo}</span></div>
      <div class="tel-cuerpo">${vistas[app]()}</div>
      ${ultimo ? `<div class="tel-msg">${ultimo}</div>` : ""}`;
  }

  pantalla.addEventListener("click", e => {
    const b = e.target.closest("[data-acc]");
    if (!b || b.disabled) return;
    const [tipo, valor] = b.dataset.acc.split(":");
    if (tipo === "app") { app = valor; ultimo = ""; }
    else if (tipo === "mejora") ultimo = comprarMejora(valor);
    else if (tipo === "esperar") ultimo = esperar(Number(valor));
    else if (tipo === "lanzar" && alDisenar) { // se diseña la misión en el laboratorio antes de despegar
      abierto = false;
      el.classList.remove("abierto");
      return alDisenar(valor);
    }
    else if (tipo === "lanzar") {
      ultimo = iniciarMision(valor);
      if (estado.mision) { // despegue: el teléfono se guarda y empieza el vuelo en 3D
        abierto = false;
        el.classList.remove("abierto");
        return alLanzar(valor);
      }
    }
    else if (tipo === "explorar") { ultimo = explorar(); if (!estado.mision) app = "estado"; }
    else if (tipo === "regresar") { ultimo = regresar(); app = "estado"; }
    else if (tipo === "reiniciar") return location.reload();
    pintar();
  });

  function abrir(cual = "inicio") {
    app = cual;
    ultimo = "";
    abierto = true;
    pintar();
    el.classList.add("abierto");
    alAbrir();
  }

  function cerrar() {
    abierto = false;
    el.classList.remove("abierto");
    alCerrar();
    return true;
  }

  return {
    abrir, cerrar, pintar,
    alternar: () => (abierto ? cerrar() : abrir()),
    get abierto() { return abierto; },
  };
}
