# Mapa del proyecto · Cohete del Granero

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
| `informe.js` | Reporte de misión y la lección del viaje |
| `tutorial.js`, `tactil.js` | Objetivos del tutorial · controles del celular |

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
| `datos.js` | 10 archivos, incluido el simulador | `npm run simular` |
| `main.js` | Es el único que importa `granero.js` y `superficie.js` | Probar los 6 modos |
| `superficie.js` | Los 5 biomas | Aterrizar en 2 o 3 planetas |
| `index.html` (HUD) | Todos los modos y el celular | Probar con `?movil` |

## Recetas rápidas
- **Añadir una mejora del cohete:** `reglas.js` (`MEJORAS`, `estado.mejoras`) → `telefono.js` (se lista sola) → `cohete.js` si se ve → `simular.mjs`.
- **Añadir una misión secundaria:** `datos.js` (`SECUNDARIAS`) → si es de un tipo nuevo, `reglas.js` (`progresoSecundaria`, `marcarPunto`) y `secundarias.js`.
- **Añadir un evento aleatorio:** `eventos.js` (+ sonido en `sonido.js`, logro en `reglas.js` si lo tiene).
- **Añadir un logro:** `reglas.js` (`LOGROS` + `desbloquearLogro("id")` donde ocurre).
- **Añadir un dato de planeta:** `datos.js` (`DATOS_PLANETAS`) y, si tiene bioma, `superficie.js` (`BIOMAS`, `CIELOS`).
- **Tocar el aspecto de un objeto 3D:** su archivo (`objetos.js`, `granja.js`, `pueblo.js`…) y después fotografiarlo con `herramientas/revisar.cjs`.
- **Publicar:** `npm run empaquetar` → release en GitHub (el APK lo compila Actions solo).

## Pendiente por el reto (ver el análisis del reto)
Para el reto *Space Mission Design Game* faltan un laboratorio de diseño de misión (objetivo, instrumentos, lanzador, órbita), el recurso **datos** y la comunicación, un puntaje con análisis, y el modo equipo de hasta 4 jugadores. Casi todo iría en archivos **nuevos** (`mision-diseno.js`, `instrumentos.js`, `puntaje.js`) y conectaría con `reglas.js` y el teléfono, sin tocar los mundos 3D.
