# 🚀 Cohete del Granero

**Juego 3D de diseño de misiones espaciales** para el reto *Space Mission Design Game* de NASA Space Apps Challenge 2026.

**▶ Jugar en el navegador:** https://tommycc2010-hub.github.io/cohete-del-granero/

**Equipo:** Siderense Rocket Labs

---

## La idea

Encuentras un cohete abandonado y averiado en un granero. Junto al **Dr. Nova**, un científico que te guía durante todo el viaje, lo reparas pieza por pieza, despegas, aterrizas en otros mundos y vuelves con muestras que vendes para seguir mejorándolo.

Cada destino es más lejano y más difícil que el anterior: **Mercurio, Venus, Marte, Ío (la luna volcánica de Júpiter) y Europa**. El viaje termina sobre el hielo de Europa, siguiendo una señal que viene del océano escondido bajo la superficie.

## El problema que resuelve

Diseñar una misión espacial obliga a equilibrar demandas que compiten entre sí: objetivos, diseño de la nave, instrumentos, presupuesto, energía, masa, comunicaciones y restricciones del viaje. Para la mayoría de los estudiantes esos trade-offs se quedan en la teoría.

En *Cohete del Granero* **el jugador siente cada trade-off en carne propia**. La regla central del juego es la misma que en una misión real: **cada mejora añade masa, y más masa gasta más combustible**. Un tanque más grande permite ir más lejos, pero pesa; un escudo protege la carga, pero también pesa. No hay una respuesta correcta: hay decisiones con consecuencias.

## Cómo cubre el reto

| Elemento del reto | Cómo aparece en el juego |
|---|---|
| **Objetivos de misión** | Cada destino tiene una misión científica propia, basada en un hecho real. Cumplirla abre el siguiente destino. |
| **Diseño de la nave** | Siete mejoras: motor, tanque, escudo térmico, sensores, antena, traje espacial y tanque de oxígeno. Cada una cambia el modelo 3D del cohete. |
| **Instrumentos científicos** | Escáner en la mano, estación meteorológica (Venus), sismógrafo (Ío) y tres antenas para triangular una señal (Europa). |
| **Presupuesto** | El dinero viene de vender muestras y cumplir misiones; el combustible y cada mejora cuestan. |
| **Masa** | Un factor de masa que crece con cada mejora y sube el consumo de combustible de cada viaje. |
| **Energía** | La misión de Marte: un rover sin energía porque el polvo cubre su panel solar, que hay que limpiar y orientar hacia el Sol. |
| **Comunicaciones** | La antena: sin el nivel suficiente no se puede llegar a Europa, y si se avería al aterrizar los sensores no identifican nada. |
| **Restricciones del viaje** | Distancia y combustible de ida y vuelta, una reserva para volver, el aterrizaje contra la gravedad real de cada lugar y averías si se toca suelo demasiado rápido. |

## La ciencia detrás del juego

- **Gravedad real** de cada lugar al saltar y al aterrizar: Venus 0.90, Mercurio y Marte 0.38, Ío 0.18 y Europa 0.13 veces la de la Tierra.
- **Mercurio:** en los cráteres de sus polos hay hielo de agua en sombra permanente, aunque es el planeta más cercano al Sol. En el juego, al sol el traje se calienta y hay que avanzar de sombra en sombra.
- **Venus:** su superficie ronda los 465 °C con una presión unas 90 veces la de la Tierra. Las sondas soviéticas Venera aguantaron como mucho unas dos horas; en el juego, la estación se derrite si no la instalas a tiempo.
- **Marte:** el polvo sobre los paneles solares dejó sin energía a misiones reales.
- **Ío:** el cuerpo con más volcanes activos del sistema solar. Júpiter es un gigante de gas sin suelo, por eso se aterriza en su luna.
- **Europa:** los datos indican un océano de agua salada bajo el hielo. La NASA envió la misión Europa Clipper a estudiar si podría ser habitable.

> **Ficción y realidad:** el final con vida extraterrestre es ficción, y el propio juego lo aclara en la pantalla final. Hoy no hay evidencia de vida en Europa.

Los datos de los planetas están en [`src/datos.js`](src/datos.js). Son conocimiento general de divulgación y se reemplazarán por la base de datos oficial de la NASA cuando se publique.

## Cómo se juega

1. **En el granero** compras combustible, vendes muestras y mejoras el cohete. El Dr. Nova da consejos según tu partida, con un nivel de confianza en cada dato.
2. **Despegas** hacia un destino y vuelas hasta la zona de aterrizaje. Lo que flota en órbita vale poco.
3. **Aterrizas a mano**, frenando contra la gravedad. Si tocas el suelo rápido, el cohete se avería y hay que buscar piezas para repararlo.
4. **Exploras a pie** con oxígeno y traje limitados. El cohete recarga el oxígeno; las zonas peligrosas dañan el traje.
5. **Cumples la misión** del lugar, recoges muestras y vuelves a casa a venderlas. En el pueblo, Villa Siderense, el mercado paga un 20 % más.
6. **Lees el reporte de misión:** combustible gastado en cada fase, cómo fue el aterrizaje, qué trajiste y la lección del viaje, es decir, el trade-off que más pesó.

La partida se guarda sola en el navegador cada vez que estás en el granero.

### Controles

| Tecla | Acción |
|---|---|
| W A S D | Caminar · en el cohete: impulso y dirección |
| Mouse | Mirar · dirigir el cohete |
| Espacio | Saltar |
| Shift | Correr (gasta más oxígeno) |
| E | Usar, hablar, reparar |
| Tab | Teléfono: estado, taller, mapa, misiones y diario |
| R | Volver a casa desde la órbita |
| M | Sonido sí / no |
| F11 | Pantalla completa (app de escritorio) |

## Tecnología

- **[Three.js](https://threejs.org/)** para el 3D, con estilo low-poly y materiales "toon" inspirados en el juego Schedule I.
- **[Vite](https://vite.dev/)** para compilar la versión web.
- **[Electron](https://www.electronjs.org/)** para la app de escritorio de Windows.
- **Todo se genera con código:** modelos 3D, terrenos, texturas de planetas y sonidos. El juego no usa archivos externos de arte ni audio.
- **Simulador de balance:** un script que juega miles de partidas con las reglas reales y mide cuántos viajes y minutos toma terminar. Hoy da unos 7 viajes y 29 minutos de media.

### Estructura

```
src/
  main.js         bucle principal, modos de juego y pantalla
  reglas.js       economía, mejoras, combustible, oxígeno y misiones (sin nada visual)
  datos.js        planetas, objetos y misiones
  granero.js      el mundo del granero: relieve, lago y pueblo
  pueblo.js       Villa Siderense y sus vecinos
  espacio.js      vuelo en órbita
  superficie.js   biomas de cada planeta para explorar a pie
  misiones.js     las cinco misiones y sus puzzles
  final.js        escena final en Europa
  jugador.js      movimiento en primera persona, salto y gravedad
  manos.js        brazos y escáner en primera persona
  cientifico.js   personajes y consejos del Dr. Nova
  telefono.js     menú del teléfono
  informe.js      reporte de misión y lección de cada viaje
  guardado.js     guardado automático de la partida
  cohete.js, estilo.js, terreno.js, ruido.js, sonido.js, tutorial.js
herramientas/simular.mjs   simulador de balance
electron/main.cjs          app de escritorio
prototipo-2d/              primer prototipo del juego, en 2D
```

## Ejecutar el proyecto

Requiere [Node.js](https://nodejs.org/) 20 o más reciente.

```bash
npm install
npm run dev          # versión web para desarrollo (http://localhost:5173)
npm run build        # versión web lista para publicar, en dist/
npm run app          # abrir como app de escritorio
npm run empaquetar   # crear salida/CoheteDelGranero-windows.zip
npm run simular      # simular partidas para revisar el balance
```

Cada cambio que se sube a la rama `main` se publica solo en GitHub Pages.

## Próximos pasos

- Cargar la base de datos oficial de la NASA en lugar de los valores de ejemplo.
- Ventanas de lanzamiento y retraso de las comunicaciones según la distancia.
- Un sistema de energía para la nave (paneles solares, baterías y generador de radioisótopos).

## Uso de inteligencia artificial

Parte del código, los textos y el diseño se hicieron con ayuda de Claude, un asistente de IA de Anthropic, bajo la dirección del equipo.

## Créditos

Hecho por **Siderense Rocket Labs** para NASA Space Apps Challenge 2026. NASA no respalda este proyecto: el nombre se usa solo para identificar el evento.
