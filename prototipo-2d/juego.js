// ===== Estado y reglas =====
const ORDEN = ["mercurio", "venus", "marte", "jupiter", "europa"];
const MEJORAS = {
  motor:  { nombre: "Motor",          base: 150, max: 5, desc: "Gasta menos combustible por viaje. Anade masa." },
  tanque: { nombre: "Tanque",         base: 120, max: 5, desc: "+20 de capacidad de combustible. Anade masa." },
  escudo: { nombre: "Escudo termico", base: 200, max: 5, desc: "Protege la carga en la reentrada." },
  sensor: { nombre: "Sensores",       base: 180, max: 5, desc: "Mas probabilidad de objetos raros." },
  antena: { nombre: "Antena",         base: 250, max: 3, desc: "Nivel 2 necesario para la senal de Europa." },
};
const COMBUSTIBLE_PRECIO = 2;
const COSTO_EXPLORAR = 3;
const ENCUENTROS = 4;

const estado = {
  dinero: 100,
  combustible: 60,
  mejoras: { motor: 0, tanque: 0, escudo: 0, sensor: 0, antena: 0 },
  carga: [],
  visitados: {},
  pantalla: "granero",
  mision: null,
  final: false,
  log: ["Bienvenido al granero. El cohete necesita reparaciones."],
};

function capacidad() { return 60 + 20 * estado.mejoras.tanque; }

function factorMasa() {
  const m = estado.mejoras;
  return 1 + 0.1 * m.motor + 0.08 * (m.tanque + m.escudo + m.sensor + m.antena);
}

function costoIda(id) {
  const m = estado.mejoras;
  return Math.ceil(DATOS_PLANETAS[id].distancia * 12 * factorMasa() / (1 + 0.25 * m.motor));
}

function desbloqueado(id) {
  if (id === "mercurio") return true;
  if (id === "europa") return !!estado.visitados.jupiter && estado.mejoras.antena >= 2;
  return !!estado.visitados[ORDEN[ORDEN.indexOf(id) - 1]];
}

function msg(t) {
  estado.log.unshift(t);
  estado.log = estado.log.slice(0, 6);
}

function ir(p) { estado.pantalla = p; render(); }

// ===== Acciones del granero =====
function comprarCombustible(cant) {
  cant = Math.min(cant, capacidad() - estado.combustible, Math.floor(estado.dinero / COMBUSTIBLE_PRECIO));
  if (cant <= 0) { msg("No puedes comprar mas combustible ahora."); return render(); }
  estado.combustible += cant;
  estado.dinero -= cant * COMBUSTIBLE_PRECIO;
  msg(`Compraste ${cant} de combustible.`);
  render();
}

function costoMejora(k) { return MEJORAS[k].base * (estado.mejoras[k] + 1); }

function comprarMejora(k) {
  const lvl = estado.mejoras[k];
  if (lvl >= MEJORAS[k].max) { msg("Ya esta al maximo."); return render(); }
  const c = costoMejora(k);
  if (estado.dinero < c) { msg(`Te faltan ${c - estado.dinero} para ${MEJORAS[k].nombre}.`); return render(); }
  estado.dinero -= c;
  estado.mejoras[k]++;
  msg(`Mejoraste ${MEJORAS[k].nombre} al nivel ${lvl + 1}.`);
  render();
}

function vender() {
  if (!estado.carga.length) { msg("No tienes carga que vender."); return render(); }
  const total = estado.carga.reduce((s, o) => s + o.valor, 0);
  estado.dinero += total;
  msg(`Vendiste ${estado.carga.length} objetos por ${total}.`);
  estado.carga = [];
  render();
}

// ===== Misión =====
function iniciarMision(id) {
  if (!desbloqueado(id)) { msg("Destino bloqueado."); return render(); }
  const ida = costoIda(id);
  if (estado.combustible < ida * 2) { msg(`Necesitas ${ida * 2} de combustible para ir y volver.`); return render(); }
  estado.combustible -= ida;
  estado.visitados[id] = true;
  estado.mision = { dest: id, ida, hecho: 0, encuentros: ENCUENTROS, carga: [], ultimo: "" };
  estado.pantalla = "mision";
  msg(`Despegaste hacia ${DATOS_PLANETAS[id].nombre}.`);
  render();
}

function tirarObjeto(id) {
  const s = 1 + 0.3 * estado.mejoras.sensor;
  const pesos = OBJETOS.map(o => o.prob * (o.valor >= 200 ? s : 1));
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < pesos.length - 1 && (r -= pesos[i]) > 0) i++;
  const base = OBJETOS[i];
  return {
    nombre: base.nombre,
    valor: Math.round(base.valor * (0.5 + DATOS_PLANETAS[id].peligro)),
    color: base.color,
  };
}

function explorar() {
  const m = estado.mision;
  if (estado.combustible < COSTO_EXPLORAR + m.ida) { msg("No alcanza para explorar y volver. Regresa ya."); return render(); }
  estado.combustible -= COSTO_EXPLORAR;
  m.hecho++;
  if (Math.random() < 0.75) {
    const o = tirarObjeto(m.dest);
    m.carga.push(o);
    m.ultimo = `Encontraste ${o.nombre} (valor ${o.valor}).`;
  } else {
    m.ultimo = "Sin hallazgos en esta zona.";
  }
  msg(m.ultimo);
  if (m.hecho >= m.encuentros) regresar(); else render();
}

function regresar() {
  const m = estado.mision;
  let carga = m.carga;
  let ok = true;
  if (estado.combustible < m.ida) {
    const rescate = Math.min(80, estado.dinero);
    estado.dinero -= rescate;
    carga = [];
    ok = false;
    msg(`Sin combustible para volver. Rescate por ${rescate} y carga perdida.`);
  } else {
    estado.combustible -= m.ida;
    const perdida = Math.max(0, 0.3 - 0.06 * estado.mejoras.escudo);
    if (carga.length && Math.random() < perdida) {
      const perdidos = Math.ceil(carga.length / 2);
      carga = carga.slice(perdidos);
      msg(`La reentrada danio ${perdidos} objetos. Mejora el escudo termico.`);
    } else {
      msg(`Regresaste con ${carga.length} objetos.`);
    }
  }
  estado.carga.push(...carga);
  if (ok && m.dest === "europa" && estado.mejoras.antena >= 2) estado.final = true;
  estado.mision = null;
  estado.pantalla = "granero";
  render();
}

function reiniciar() { location.reload(); }

// ===== Escena (canvas) =====
function render() { dibujarEscena(); dibujarPantalla(); }

function dibujarEscena() {
  const c = document.getElementById("escena");
  const g = c.getContext("2d");
  if (estado.mision) dibujarEspacio(g, estado.mision.dest);
  else dibujarGranero(g);
}

function contorno(g) { g.strokeStyle = "#1d1d1d"; g.lineWidth = 4; }

function dibujarGranero(g) {
  const W = 640, H = 420;
  const cielo = g.createLinearGradient(0, 0, 0, H);
  cielo.addColorStop(0, "#8ed1f0");
  cielo.addColorStop(1, "#ffe8b0");
  g.fillStyle = cielo; g.fillRect(0, 0, W, H);

  // Suelo
  g.fillStyle = "#7bc96f"; g.fillRect(0, 330, W, H - 330);
  contorno(g); g.beginPath(); g.moveTo(0, 330); g.lineTo(W, 330); g.stroke();

  // Granero
  g.fillStyle = "#e5483b";
  g.fillRect(50, 190, 260, 170); g.strokeRect(50, 190, 260, 170);
  g.beginPath(); g.moveTo(40, 190); g.lineTo(180, 100); g.lineTo(320, 190); g.closePath();
  g.fillStyle = "#c93a2e"; g.fill(); g.stroke();
  g.fillStyle = "#fff6e5"; g.fillRect(150, 250, 60, 110); g.strokeRect(150, 250, 60, 110);
  g.beginPath(); g.moveTo(150, 250); g.lineTo(210, 360); g.moveTo(210, 250); g.lineTo(150, 360); g.stroke();
  g.fillStyle = "#1d1d1d"; g.font = "bold 18px Trebuchet MS"; g.fillText("MI GRANERO", 95, 225);

  // Cohete averiado (crece con las mejoras)
  const m = estado.mejoras;
  g.save();
  g.translate(480, 290); g.rotate(-0.12);
  const ancho = 90 + 8 * m.tanque;
  g.fillStyle = "#e6e6e6";
  g.beginPath(); g.roundRect(-ancho / 2, -28, ancho, 56, 16); g.fill(); contorno(g); g.stroke();
  g.fillStyle = "#f2f2f2";
  g.beginPath(); g.moveTo(ancho / 2, -28); g.lineTo(ancho / 2 + 50, 0); g.lineTo(ancho / 2, 28); g.closePath(); g.fill(); g.stroke();
  // Aletas
  g.fillStyle = "#e5483b";
  g.beginPath(); g.moveTo(-ancho / 2, 28); g.lineTo(-ancho / 2 - 30, 55); g.lineTo(-ancho / 2 + 20, 28); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-ancho / 2, -28); g.lineTo(-ancho / 2 - 30, -55); g.lineTo(-ancho / 2 + 20, -28); g.closePath(); g.fill(); g.stroke();
  // Grietas (desaparecen al mejorar el casco con escudo)
  if (m.escudo === 0) {
    g.strokeStyle = "#b3261e"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-10, -28); g.lineTo(-4, -8); g.lineTo(-14, 6); g.lineTo(-2, 28); g.stroke();
  } else {
    g.strokeStyle = "#3aa0e8"; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, ancho / 2 + 8, 36, 0, 0, Math.PI * 2); g.stroke();
  }
  // Motor
  g.fillStyle = m.motor > 0 ? "#ffb14a" : "#888";
  g.fillRect(-ancho / 2 - 8, -12, 10, 24); g.strokeStyle = "#1d1d1d"; g.lineWidth = 3; g.strokeRect(-ancho / 2 - 8, -12, 10, 24);
  // Antena
  if (m.antena > 0) {
    g.strokeStyle = "#1d1d1d"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-10, -28); g.lineTo(-10, -70); g.stroke();
    g.beginPath(); g.arc(-10, -72, 6, 0, Math.PI * 2); g.fillStyle = "#ffd23f"; g.fill(); g.stroke();
  }
  g.restore();

  // Humo si el motor no esta reparado
  if (m.motor === 0) {
    g.fillStyle = "rgba(90,90,90,0.35)";
    [[430, 230, 18], [445, 200, 24], [470, 170, 30]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  }
}

function estrellas(g, W, H) {
  g.fillStyle = "#0b0f2a"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = (i * 73) % W, y = (i * 131) % H, r = (i % 3) * 0.6 + 0.6;
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

function dibujarEspacio(g, dest) {
  const W = 640, H = 420;
  estrellas(g, W, H);

  const planeta = dest === "europa" ? "jupiter" : dest;
  const colores = { mercurio: "#b5a58f", venus: "#e8c372", marte: "#c1440e", jupiter: "#d9a066" };
  const cx = 520, cy = 200, R = dest === "mercurio" ? 60 : 120;
  g.fillStyle = colores[planeta];
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); contorno(g); g.stroke();
  if (planeta === "jupiter") {
    g.save();
    g.beginPath(); g.arc(cx, cy, R - 2, 0, Math.PI * 2); g.clip();
    g.strokeStyle = "rgba(120,60,20,0.5)"; g.lineWidth = 8;
    [-60, -20, 20, 55].forEach(y => { g.beginPath(); g.moveTo(cx - R, cy + y); g.lineTo(cx + R, cy + y); g.stroke(); });
    g.restore();
  }
  if (dest === "europa") {
    g.fillStyle = "#cfe3f0"; g.beginPath(); g.arc(380, 110, 16, 0, Math.PI * 2); g.fill(); contorno(g); g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 14px Trebuchet MS"; g.fillText("Europa", 360, 90);
  }

  // Cohete en vuelo
  g.save(); g.translate(180, 210); g.rotate(0.1);
  g.fillStyle = "#e6e6e6";
  g.beginPath(); g.roundRect(-40, -18, 80, 36, 12); g.fill(); contorno(g); g.stroke();
  g.beginPath(); g.moveTo(40, -18); g.lineTo(70, 0); g.lineTo(40, 18); g.closePath(); g.fillStyle = "#f2f2f2"; g.fill(); g.stroke();
  g.fillStyle = "#ffb14a"; g.beginPath(); g.moveTo(-40, -8); g.lineTo(-66, 0); g.lineTo(-40, 8); g.closePath(); g.fill(); g.stroke();
  g.restore();

  g.fillStyle = "#fff"; g.font = "bold 20px Trebuchet MS";
  g.fillText(DATOS_PLANETAS[dest].nombre.toUpperCase(), 24, 36);
  g.font = "14px Trebuchet MS"; g.fillText(DATOS_PLANETAS[dest].nota, 24, 58);
}

// ===== Pantalla del teléfono =====
function dibujarPantalla() {
  const el = document.getElementById("pantalla");
  const cab = `<h1>📡 Cohete del Granero</h1>
    <div class="stat"><span>💰 ${estado.dinero}</span><span>⛽ ${Math.floor(estado.combustible)}/${capacidad()}</span><span>📦 ${estado.carga.length}</span></div>`;

  if (estado.final) {
    el.innerHTML = `${cab}
      <h2>¡Senal detectada en Europa!</h2>
      <p>Bajo el hielo hay un oceano, y tu sensor capto una senal que no es de la Tierra. Hay vida alienigena.</p>
      <button class="btn-verde" onclick="reiniciar()">Jugar de nuevo</button>`;
    return;
  }

  const volver = `<button onclick="ir('granero')">⬅ Volver al granero</button>`;
  let cuerpo = "";

  if (estado.pantalla === "granero") {
    cuerpo = `
      <button onclick="ir('mapa')">🚀 Lanzar mision</button>
      <button onclick="ir('taller')">🔧 Taller (mejoras)</button>
      <button onclick="comprarCombustible(10)">⛽ Comprar 10 de combustible (${10 * COMBUSTIBLE_PRECIO} 💰)</button>
      <button class="btn-verde" onclick="vender()">🧺 Vender carga</button>`;
  } else if (estado.pantalla === "mapa") {
    cuerpo = ORDEN.map(id => {
      const d = DATOS_PLANETAS[id], ok = desbloqueado(id);
      return `<button ${ok ? "" : "disabled"} onclick="iniciarMision('${id}')">${d.nombre} · ida ${costoIda(id)} ⛽<br><small>${d.nota}${ok ? "" : " (bloqueado)"}</small></button>`;
    }).join("") + volver;
  } else if (estado.pantalla === "taller") {
    cuerpo = Object.keys(MEJORAS).map(k => {
      const M = MEJORAS[k], lvl = estado.mejoras[k], maxed = lvl >= M.max;
      return `<button ${maxed ? "disabled" : ""} onclick="comprarMejora('${k}')">${M.nombre} nivel ${lvl}/${M.max} · ${maxed ? "MAX" : costoMejora(k) + " 💰"}<br><small>${M.desc}</small></button>`;
    }).join("") + volver;
  } else if (estado.pantalla === "mision" && estado.mision) {
    const m = estado.mision;
    cuerpo = `<p><b>${DATOS_PLANETAS[m.dest].nombre}</b> · encuentros ${m.hecho}/${m.encuentros}</p>
      <p>${m.ultimo || "Empieza la exploracion."}</p>
      <button class="btn-azul" onclick="explorar()">🔭 Explorar (${COSTO_EXPLORAR} ⛽)</button>
      <button onclick="regresar()">🏠 Regresar ya</button>`;
  }

  el.innerHTML = cab + cuerpo + `<div class="log">${estado.log.join("<br>")}</div>`;
}

render();
