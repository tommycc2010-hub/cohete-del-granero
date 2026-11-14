# Mapa del proyecto · Granero Orbital

Generado con el grafo de Graphify (commit `b3c755d`, 642 nodos, 1599 relaciones, 45 comunidades) y revisado a mano.
Sirve para saber **qué tocar y qué se rompe** antes de editar. Si el código cambia mucho, se vuelve a consultar Graphify.

## En una frase
`main.js` es el director: tiene el bucle del juego y los modos (granero → despegue → espacio → descenso → superficie → final). Todo lo demás son piezas que crea y llama. Las **reglas** (dinero, combustible, misiones) viven aparte, sin nada visual, en `reglas.js`.

## Capas

```
                         ┌──────────────────────── main.js ────────────────────────┐
                         │  bucle · modos · HUD · guardado · eventos · diálogos     │
                         └───┬───────────┬───────────┬────────────┬────────────┬───┘
   REGLAS (sin 3D)           │           │           │            │            │
   reglas.js ◄───────────────┤     MUNDOS 3D        PERSONAJES    INTERFAZ     SISTEMAS
   datos.js  ◄── 10 archivos │   granero.js ─┬ granja.js      cientifico.js  telefono.js   guardado.js
                             │   espacio.js  └ pueblo.js ─ crearPersona   dialogos.js   menu.js        sonido.js
                             │   superficie.js ─ misiones.js · secundarias.js · lava.js · ambiente.js   informe.js     musica.js
                             │   final.js        eventos.js (espacio y suelo)                           tutorial.js    tactil.js
                             │                                                                           postpro.js
                             └──► estilo.js (materiales toon, textura, contorno) ◄── lo usan ~15 archivos
```

## Archivos y para qué sirven

### Núcleo
| Archivo | Qué hace | Lo usa |
|---|---|---|
| `index.html` · `jugar.html` | La **presentación** del juego y **el juego** (el HUD y todo lo demás vive en `jugar.html`). Las apps y la PWA abren `jugar.html` | Vite compila las dos (`vite.config.js`) |
| `src/main.js` (~1300 líneas) | Bucle, modos, HUD, guardado, eventos, mochila, radio con retraso, calidad automática | `index.html` |
| `src/reglas.js` | **Estado del juego** y toda la economía: mejoras, combustible, energía, ventanas de lanzamiento, misiones, encargos, logros, secundarias, museo | main, telefono, cientifico, dialogos, `simular.mjs` |
| `src/datos.js` | Planetas (gravedad, luz, señal…), misiones, `SECUNDARIAS` (25), objetos | 10 archivos |

### Mundos y escenas
| Archivo | Qué hace |
|---|---|
| `granero.js` | Granero, terreno, cohete averiado, despegue. Crea `granja.js` y `pueblo.js` |
| `granja.js` | Tablero de misiones, vitrina, telescopio, estación de tierra, molino, tractor |
| `pueblo.js` | Villa Siderense: casas, plaza, museo, café, vecinos |
| `espacio.js` | Vuelo en órbita, planetas, lluvia de micrometeoritos |
| `superficie.js` | Un bioma por planeta (relieve, cielo, rocas, zonas de peligro). Usa `lava.js`, `ambiente.js`, `misiones.js`, `secundarias.js` |
| `final.js` | Escena final en Europa |
| `lava.js` | Charcos de lava con shader y relieve 3D |
| `ambiente.js` | Efectos de cada bioma (géiseres, volcanes, remolinos) |
| `misiones.js` | Las 5 misiones principales y sus puzzles |
| `secundarias.js` | Puntos de las 25 misiones secundarias y mochilas |
| `eventos.js` | Eventos aleatorios: 6 en el espacio, 2 en el suelo |

### Personajes e interfaz
| Archivo | Qué hace |
|---|---|
| `cientifico.js` | Dr. Nova y `crearPersona` (lo usa también el pueblo). Consejos según la partida |
| `dialogos.js` | Conversaciones con opciones y encargos de los vecinos |
| `telefono.js` | Menú del teléfono: mapa, taller, misiones, logros |
| `menu.js` | Menú principal, pausa, opciones y las 4 ranuras |
| `informe.js` | Reporte de misión como pantalla de resultados (`htmlReporte`, `animarReporte`) y la lección del viaje |
| `diseno.js` | **Diseño de misión** (sin nada visual): instrumentos, lanzadores, tipos de misión, objetivos, `SITIOS` (3 lugares reales por objetivo), `observarSitio`, cálculo del diseño, datos y memoria, evaluación, récords y modo equipo |
| `laboratorio.js` | Laboratorio de Diseño de Misión paso a paso (`PASOS`): una decisión por pantalla, "Tu nave" con medidores y el Dr. Nova explicando cada paso. Cada persona navega los pasos por su cuenta; solo el diseño se comparte |
| `tutorial.js`, `tactil.js` | Objetivos del tutorial · controles del celular |
| `red.js` | **Red del multijugador** (sin nada visual): crear sala, unirse, enviar mensajes, video. Usa PeerJS (WebRTC) |
| `multijugador.js` | Panel de la sala en el menú, compañeros caminando en el granero, Control de Misión de los invitados, radio |

### Paisaje y efectos
| Archivo | Qué hace |
|---|---|
| `paisaje.js` | Cielo por bandas con sol, nubes, pasto y flores con viento (instancias), lago con ondas, mariposas y pájaros. Lo crea `granero.js` |
| `efectos.js` | `crearLlama` (la usan granero, espacio, superficie y final), humo del despegue, `geoBocanada` (polvo del aterrizaje) |

### Utilidades (casi nadie las importa a ellas)
`estilo.js` (⚠ **el más compartido**), `objetos.js`, `cohete.js`, `particulas.js`, `terreno.js`, `ruido.js`, `jugador.js`, `manos.js`, `postpro.js`, `sonido.js`, `musica.js`, `guardado.js`.

### Fuera de `src/`
`herramientas/` (simulador de balance, capturas, tráiler, revisar objetos, iconos) · `electron/` (app de Windows) · `android/` (app de Android con Capacitor) · `public/` (icono, manifiesto y service worker) · `.github/workflows/` (web y APK).

## ⚠ Qué se rompe si toco…
| Si cambio… | Afecta a | Qué hacer después |
|---|---|---|
| `estilo.js` (`toon`, `caja`…) | **Todo lo que se ve**: 15 archivos | Revisar con `npx electron herramientas/revisar.cjs` |
| `reglas.js` (números de economía) | Balance, teléfono, Dr. Nova, simulador | `npm run simular` (debe seguir ~9 viajes) |
| `reglas.js` (`GUARDABLE`, `estado`) | **Partidas guardadas** | Probar guardar y cargar; añadir el campo en `importarEstado` |
| `reglas.js` (`factorMasa`, `consumoSistemas`, `costoIda`) | Incluyen la masa y la energía de los instrumentos del diseño: afectan al vuelo, la energía y al laboratorio | `npm run simular` |
| `diseno.js` (catálogos, premios) | Laboratorio, evaluación y simulador (usa `disenoAutomatico`) | `npm run simular` y probar el laboratorio |
| `datos.js` | 10 archivos, incluido el simulador | `npm run simular` |
| `main.js` | Es el único que importa `granero.js` y `superficie.js` | Probar los 6 modos |
| `superficie.js` | Los 5 biomas | Aterrizar en 2 o 3 planetas |
| `index.html` (HUD) | Todos los modos y el celular | Probar con `?movil` |
| `laboratorio.js` (`aplicar`, `recibir`) | El laboratorio en línea: cada cambio pasa por el anfitrión | Probar con dos pestañas en una sala |
| `red.js` / `multijugador.js` (tipos de mensaje) | Anfitrión e invitados deben hablar la misma versión | Probar crear sala y unirse en dos pestañas |
| `crearPersona` (`cientifico.js`) | Dr. Nova, vecinos y compañeros en línea (`remoto: true`) | Ver el pueblo y una sala |
| `paisaje.js` (`libre`) | Dónde sale pasto: si se añade un edificio con colisión, el pasto lo evita solo | `herramientas/revisar.cjs` |

## Recetas rápidas
- **Añadir una mejora del cohete:** `reglas.js` (`MEJORAS`, `estado.mejoras`) → `telefono.js` (se lista sola) → `cohete.js` si se ve → `simular.mjs`.
- **Añadir una misión secundaria:** `datos.js` (`SECUNDARIAS`) → si es de un tipo nuevo, `reglas.js` (`progresoSecundaria`, `marcarPunto`) y `secundarias.js`.
- **Añadir un evento aleatorio:** `eventos.js` (+ sonido en `sonido.js`, logro en `reglas.js` si lo tiene).
- **Añadir un logro:** `reglas.js` (`LOGROS` + `desbloquearLogro("id")` donde ocurre).
- **Añadir un dato de planeta:** `datos.js` (`DATOS_PLANETAS`) y, si tiene bioma, `superficie.js` (`BIOMAS`, `CIELOS`).
- **Tocar el aspecto de un objeto 3D:** su archivo (`objetos.js`, `granja.js`, `pueblo.js`…) y después fotografiarlo con `herramientas/revisar.cjs`.
- **Añadir un instrumento:** `diseno.js` (`INSTRUMENTOS`); si es el que pide un objetivo, también en `OBJETIVOS`. Aparece solo en el laboratorio.
- **Añadir un objetivo científico:** `diseno.js` (`OBJETIVOS[destino]` y sus 3 lugares en `SITIOS[destino][id]`, con `lat`/`lon` o `suelo: true` y un dato real) y, si tiene misión real parecida, `REALES`.
- **Publicar:** `npm run empaquetar` → release en GitHub (el APK lo compila Actions solo).

## Flujo del diseño de misión
`telefono.js` (elegir destino) → `laboratorio.js` (diseñar; `diseno.calcularDiseno`) → `reglas.iniciarMision(dest, diseno)` (cobra el diseño, crea la memoria de datos) → `main.observar()` cada fotograma en órbita y en el suelo (`diseno.pasoDatos`, ciencia de fondo) · los lugares del objetivo: `espacio.ponerSitios` (en el planeta) o `superficie.ponerSitios` (en el suelo), y con E `main.empezarObservacion` → `diseno.observarSitio` (solo esto cuenta para el objetivo) → `main.volver()` → `diseno.evaluar` + `evaluarEquipo` → premio (`reglas.ganar`), récord y reporte (`informe.htmlReporte`).

## Flujo del multijugador en línea
Anfitrión: menú → *Jugar en línea* → `red.crearSala` (código de 4 letras). Invitados: `red.unirse(código)` → reciben la partida (`estado`) y la lista de la sala.
- **Partida compartida:** el anfitrión manda `estado` cuando cambia; las compras y ventas de un invitado se piden al anfitrión (`accion`), que las hace y responde.
- **Laboratorio:** el invitado propone un destino (`proponer`); el anfitrión abre el laboratorio y lo comparte (`lab`). Cada cambio de un invitado viaja como `pedir` → `laboratorio.aplicar(accion, quien)` revisa el rol → se comparte de nuevo. Solo el anfitrión despega.
- **Granero:** todos mandan su posición (`pos`) 10 veces por segundo; se dibujan con `crearPersona({ remoto: true })`.
- **Vuelo:** el anfitrión manda `modo`, telemetría (`tele`) 3 veces por segundo y transmite la imagen del lienzo como video. Los invitados mandan `radio`, que al anfitrión le llega con el retraso real de la señal. Al volver se comparte el `reporte`.
- Los invitados no guardan: la partida es del anfitrión.

## Pendiente por el reto
Ya están el laboratorio, los datos, el puntaje, el modo equipo local y el multijugador en línea. Quedan ideas como niveles de dificultad, modo sandbox, y compartir y comparar diseños entre equipos.
