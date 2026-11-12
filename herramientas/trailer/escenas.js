// Se inyecta en la página del juego. Prepara cada toma del tráiler y avanza el juego cuadro a cuadro.
// window.TR.preparar(id) deja la escena lista; window.TR.cuadro(id, i, n) avanza y dibuja el cuadro i de n.
(() => {
  const J = window.__juego, G = J.grabar, DT = 1 / 30;
  const $ = id => document.getElementById(id);
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const ocultarMenu = () => $("inicio").classList.add("oculto");

  // ----- Capas propias del tráiler: franjas de cine, subtítulos, títulos y fundidos -----
  const estilo = document.createElement("style");
  estilo.textContent = `
    #objetivo, #aviso, .ayuda, #tarjeta-final { display: none !important; }
    body.cine .fila-hud, body.cine #pista, body.cine #mira, body.cine #accion, body.cine #alerta,
    body.cine #marcadores, body.cine .baliza, body.cine #balizas-mision, body.cine #mision,
    body.cine #subtitulo { display: none !important; }
    #tr-franjas::before, #tr-franjas::after { content: ""; position: fixed; left: 0; right: 0; height: 8vh; background: #000; z-index: 40; }
    #tr-franjas::before { top: 0; } #tr-franjas::after { bottom: 0; }
    #tr-franjas { display: none; } body.cine #tr-franjas { display: block; }
    #tr-sub { position: fixed; left: 50%; bottom: 10vh; transform: translateX(-50%); z-index: 45; max-width: 74vw;
      padding: 10px 22px; border-radius: 14px; background: rgba(10, 14, 28, .78); color: #fff; text-align: center;
      font: 600 26px "Trebuchet MS", sans-serif; line-height: 1.3; opacity: 0; }
    #tr-titulo { position: fixed; inset: 0; z-index: 44; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; opacity: 0; pointer-events: none; text-align: center; color: #fff; font-family: "Trebuchet MS", sans-serif; }
    #tr-titulo .l1 { font-size: 120px; font-weight: 900; color: #ffd23f; -webkit-text-stroke: 5px #1d1d1d; paint-order: stroke fill;
      text-shadow: 8px 8px 0 #1d1d1d; transform: rotate(-3deg); line-height: .9; }
    #tr-titulo .l2 { font-size: 70px; font-weight: 900; -webkit-text-stroke: 4px #1d1d1d; paint-order: stroke fill;
      text-shadow: 6px 6px 0 #1d1d1d; transform: rotate(-3deg); }
    #tr-titulo .l3 { margin-top: 18px; font-size: 26px; font-weight: bold; text-shadow: 2px 2px 0 #1d1d1d; }
    #tr-titulo .l4 { margin-top: 26px; padding: 10px 22px; font-size: 24px; font-weight: bold; color: #1d1d1d; background: #ffd23f;
      border: 4px solid #1d1d1d; border-radius: 16px; box-shadow: 5px 5px 0 #1d1d1d; }
    #tr-titulo .l5 { margin-top: 18px; font-size: 20px; font-weight: bold; opacity: .9; text-shadow: 2px 2px 0 #1d1d1d; }
    #tr-titulo.cierre { background: radial-gradient(ellipse at center, rgba(7, 11, 31, .55), rgba(7, 11, 31, .9)); }
    #tr-negro { position: fixed; inset: 0; z-index: 50; background: #000; opacity: 1; pointer-events: none; }
    #tr-flash { position: fixed; inset: 0; z-index: 46; background: #fff; opacity: 0; pointer-events: none; }`;
  document.head.appendChild(estilo);
  document.body.insertAdjacentHTML("beforeend", `
    <div id="tr-franjas"></div><div id="tr-sub"></div><div id="tr-titulo"></div>
    <div id="tr-flash"></div><div id="tr-negro"></div>`);

  const TITULO = `<div class="l1">COHETE</div><div class="l2">DEL GRANERO</div>`;
  const CIERRE = TITULO + `<div class="l3">Un juego de diseño de misiones espaciales</div>
    <div class="l4">▶ tommycc2010-hub.github.io/cohete-del-granero</div>
    <div class="l5">Siderense Rocket Labs · NASA Space Apps Challenge 2026</div>`;

  // ----- Ayudas de juego -----
  function pilotoDescenso(objetivo = 1.5) {
    const d = G.desc, an = 1.5 * d.g + 3;
    J.jugador.teclas.KeyW = d.v < -(objetivo + Math.sqrt(2 * 0.6 * an * Math.max(0, d.h - 0.5)));
  }
  function apuntarPista() {
    const e = J.espacio, d = e.pista.position.clone().sub(e.nave.position);
    e.girar(e.nave.rotation.y - Math.atan2(-d.x, -d.z), e.nave.rotation.x - Math.asin(d.y / d.length()));
  }
  // Avanza el juego sin grabar hasta que se cumpla `cond` (con un tope de seguridad).
  function avanzarHasta(cond, antes = () => {}, max = 4000) {
    for (let n = 0; n < max && !cond(); n++) { antes(); G.paso(DT); }
  }
  async function esperarModo(m) {
    for (let n = 0; n < 60 && J.modo !== m; n++) { await pausa(100); G.paso(DT); }
    ocultarMenu();
  }
  async function despegarHacia(dest) {
    J.estado.combustible = 60 + 20 * J.estado.mejoras.tanque;
    J.telefono.abrir("mapa");
    [...document.querySelectorAll(".tel-item")].find(b => b.textContent.includes(dest)).click();
    ocultarMenu();
  }
  async function llegarAlEspacio() {
    avanzarHasta(() => J.modo !== "despegue");
    await esperarModo("espacio");
  }
  async function bajarAlSuelo() {
    J.jugador.teclas.KeyW = true;
    avanzarHasta(() => J.modo !== "espacio", apuntarPista);
    J.jugador.teclas.KeyW = false;
    await esperarModo("descenso");
  }
  async function aterrizar() {
    avanzarHasta(() => J.modo !== "descenso", () => pilotoDescenso());
    J.jugador.teclas.KeyW = false;
    await esperarModo("superficie");
    J.suelo = { oxi: 90 };
  }
  async function volverACasa() {
    J.jugador.colocar(J.superficie, 2.4, 4, 0, 0);
    G.paso(DT);
    J.interactuar();
    await esperarModo("granero");
    await pausa(300);
  }
  const cine = si => document.body.classList.toggle("cine", si);
  const mejoras = m => { Object.assign(J.estado.mejoras, m); J.granero.reconstruirCohete(J.estado.mejoras); J.refrescarHud(); };
  const suave = x => x * x * (3 - 2 * x);

  // ----- Las tomas -----
  // preparar(): deja la escena lista. antes(i, n): entradas antes del paso. despues(i, n): cámara después del paso.
  const TOMAS = {
    granero: {
      async preparar() {
        [...document.querySelectorAll("#inicio button")].find(b => b.textContent.includes("Jugar")).click();
        await pausa(300); ocultarMenu();
        G.iniciar(); G.manos = false; cine(true);
        mejoras({ motor: 0, tanque: 0, escudo: 0, sensor: 0, antena: 0, paneles: 0, bateria: 0, rtg: 0 });
      },
      despues(i, n) {
        const k = suave(i / n), a = 0.95 - 0.7 * k, r = 34 - 14 * k, h = 15 - 10 * k;
        J.camera.position.set(Math.sin(a) * r, h, -6 + Math.cos(a) * r);
        J.camera.lookAt(0, 3 - k, -6);
      },
      titulo: (i, n) => [TITULO, Math.min(1, Math.max(0, (i / n - 0.6) / 0.15))],
    },
    "cohete-roto": {
      async preparar() { cine(true); G.manos = false; },
      despues(i, n) {
        const k = suave(i / n);
        J.camera.position.set(3.6 - 2.1 * k, 2.5 - 0.7 * k, -1.2 - 3.4 * k);
        J.camera.lookAt(0, 1.4, -8);
      },
    },
    "dr-nova": {
      async preparar() {
        cine(false); G.manos = true;
        J.estado.dinero = 1240; J.refrescarHud();
        J.jugador.colocar(J.granero, 2.4, -3.7, 3.9, -5.4); G.paso(DT);
        J.interactuar(); J.interactuar();
        J.jugador.colocar(J.granero, 1.4, -2.4, 3.9, -5.4); G.paso(DT);
        J.camera.lookAt(2.2, 1.55, -6.3);
      },
      despues() { J.camera.rotateY(-0.0006); },
    },
    mejoras: {
      async preparar() {
        for (let k = 0; k < 6; k++) J.interactuar(); // cierra el diálogo
        cine(true); G.manos = false;
      },
      antes(i, n) {
        const pasos = [[0.12, { paneles: 1 }], [0.28, { motor: 1, tanque: 2 }], [0.42, { bateria: 1 }],
          [0.56, { antena: 1 }], [0.7, { rtg: 1 }], [0.84, { paneles: 3, escudo: 1 }]];
        for (const [f, m] of pasos) if (i === Math.round(f * n)) { mejoras(m); flash = 1; }
      },
      despues(i, n) {
        const k = i / n, a = 0.35 + 1.0 * k;
        J.camera.position.set(Math.sin(a) * 4.6, 2.7, -8 + Math.cos(a) * 4.6);
        J.camera.lookAt(0, 1.6, -8);
      },
    },
    mapa: {
      async preparar() {
        cine(false); G.manos = true;
        J.estado.misiones = { mercurio: true }; J.estado.dia = 1; J.estado.dinero = 1240;
        J.jugador.colocar(J.granero, 0, 13, 0, -8); G.paso(DT);
        J.telefono.abrir("mapa"); ocultarMenu(); J.refrescarHud();
      },
      antes(i) { const c = document.querySelector(".tel-cuerpo"); if (c) c.scrollTop = Math.max(0, i - 40) * 1.6; },
    },
    despegue: {
      async preparar() {
        J.telefono.cerrar(); ocultarMenu();
        cine(true); G.manos = false;
        mejoras({ motor: 3, tanque: 5, antena: 2, oxigeno: 2, traje: 2, sensor: 1, paneles: 3, bateria: 1, rtg: 1, escudo: 1 });
        J.estado.misiones = { mercurio: true, venus: true, marte: true }; J.estado.dia = 15;
        await despegarHacia("Júpiter");
      },
    },
    vuelo: {
      async preparar() { await llegarAlEspacio(); cine(false); G.manos = false; },
      antes(i) { J.jugador.teclas.KeyW = i < 30; apuntarPista(); },
    },
    descenso: {
      async preparar() {
        await bajarAlSuelo();
        avanzarHasta(() => G.desc.h <= 60, () => pilotoDescenso());
      },
      antes() {
        pilotoDescenso(2);
        if (G.desc.h < 2.5) { G.desc.v = Math.max(G.desc.v, -0.2); J.jugador.teclas.KeyW = true; } // se queda flotando: no aterriza en cámara
      },
    },
    io: {
      async preparar() {
        await aterrizar(); G.manos = true;
        // a un costado del cohete, para que no quede en el camino hacia Júpiter
        J.jugador.colocar(J.superficie, 13, 7, 13 - 36, 7 - 78); G.paso(DT);
        J.camera.lookAt(J.camera.position.x - 38, J.camera.position.y + 9, J.camera.position.z - 82);
      },
      antes(i) {
        J.suelo = { oxi: 70 };
        J.jugador.mover(1, 0, DT, false);
        if (i === 18 || i === 110) J.jugador.saltar();
      },
    },
    reporte: {
      async preparar() { J.jugador.teclas.KeyW = false; await volverACasa(); G.manos = true; },
    },
    europa: {
      async preparar() {
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })); // cierra el reporte
        J.estado.misiones = { mercurio: true, venus: true, marte: true, jupiter: true }; J.estado.dia = 95;
        await despegarHacia("Europa"); await llegarAlEspacio(); await bajarAlSuelo(); await aterrizar();
        const s = J.superficie;
        for (let k = 0; k < 3; k++) {
          const b = s.mision.balizas[0].pos;
          J.jugador.colocar(s, b.x + 1.5, b.z + 1.5, b.x, b.z); G.paso(DT); J.interactuar(); G.paso(DT);
        }
        const p = s.senal.position;
        J.jugador.colocar(s, p.x - 40, p.z - 32, p.x, p.z); G.paso(DT);
        J.camera.lookAt(p.x, p.y + 7, p.z);
        G.manos = true;
      },
      antes() { J.suelo = { oxi: 80 }; J.jugador.mover(1, 0, DT * 0.6, false); },
    },
    final: {
      async preparar() {
        const p = J.superficie.senal.position;
        J.jugador.colocar(J.superficie, p.x + 1, p.z + 1, 0, 0); G.paso(DT);
        await esperarModo("final");
        cine(true); G.manos = false;
        avanzarHasta(() => G.tFinal >= 8.5, () => {}, 400);
      },
    },
    cierre: {
      async preparar() { cine(true); },
      titulo: (i) => [CIERRE, Math.min(1, i / 24)],
      claseTitulo: "cierre",
    },
  };

  let flash = 0;
  window.TR = {
    ids: Object.keys(TOMAS),
    async preparar(id) {
      await TOMAS[id].preparar();
      $("tr-titulo").className = TOMAS[id].claseTitulo || "";
      return J.modo;
    },
    // sub: texto del subtítulo y en qué cuadros se ve; fundir: cuadros de fundido al empezar y al terminar.
    cuadro(id, i, n, { sub = "", subDesde = 0, subHasta = 0, fundirEntrada = 6, fundirSalida = 4 } = {}) {
      const t = TOMAS[id];
      if (t.antes) t.antes(i, n);
      G.paso(DT);
      if (t.despues) t.despues(i, n);
      // capas
      const negro = Math.max(fundirEntrada ? 1 - i / fundirEntrada : 0, fundirSalida ? 1 - (n - 1 - i) / fundirSalida : 0);
      $("tr-negro").style.opacity = Math.max(0, Math.min(1, negro));
      const s = $("tr-sub");
      s.textContent = sub;
      s.style.opacity = sub && i >= subDesde && i <= subHasta ? 1 : 0;
      const [html, op] = t.titulo ? t.titulo(i, n) : ["", 0];
      const tit = $("tr-titulo");
      if (tit.innerHTML !== html) tit.innerHTML = html;
      tit.style.opacity = op;
      $("tr-flash").style.opacity = flash * 0.55;
      flash = Math.max(0, flash - 0.25);
      G.dibujar(DT);
      ocultarMenu();
      return true;
    },
    // Música del juego renderizada a WAV (base64) según los segmentos del tráiler.
    async musica(segmentos, total) {
      const buf = await G.renderizarPista(segmentos, total);
      const canales = [buf.getChannelData(0), buf.getChannelData(1)], len = buf.length, sr = buf.sampleRate;
      const datos = new DataView(new ArrayBuffer(44 + len * 4));
      const txt = (o, s) => [...s].forEach((c, k) => datos.setUint8(o + k, c.charCodeAt(0)));
      txt(0, "RIFF"); datos.setUint32(4, 36 + len * 4, true); txt(8, "WAVE"); txt(12, "fmt ");
      datos.setUint32(16, 16, true); datos.setUint16(20, 1, true); datos.setUint16(22, 2, true);
      datos.setUint32(24, sr, true); datos.setUint32(28, sr * 4, true); datos.setUint16(32, 4, true); datos.setUint16(34, 16, true);
      txt(36, "data"); datos.setUint32(40, len * 4, true);
      for (let k = 0, o = 44; k < len; k++) for (const c of canales) { datos.setInt16(o, Math.max(-1, Math.min(1, c[k])) * 32767, true); o += 2; }
      const bytes = new Uint8Array(datos.buffer);
      let bin = "";
      for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
      return btoa(bin);
    },
  };
})();
