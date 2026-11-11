# 🚀 Cohete del Granero

Juego 3D para el reto **Space Mission Design Game** de NASA Space Apps Challenge 2026.

Encontraste un cohete averiado en un granero. Repáralo, aterriza en Mercurio, Venus, Marte, Ío y Europa, cumple una misión científica en cada lugar y sigue una señal hasta el océano bajo el hielo de Europa.

Cada decisión es un trade-off real de diseño de misiones: cada mejora añade masa, y más masa gasta más combustible.

## Cómo jugar

| Tecla | Acción |
|---|---|
| W A S D | Caminar · en el cohete: impulso y dirección |
| Mouse | Mirar · dirigir el cohete |
| Espacio | Saltar (la altura depende de la gravedad real de cada lugar) |
| Shift | Correr (gasta más oxígeno) |
| E | Usar, hablar, reparar |
| Tab | Teléfono: estado, taller, mapa, misiones y diario |
| R | Volver a casa desde la órbita |
| M | Sonido sí / no |

## Ciencia detrás del juego

- **Gravedad real** de cada lugar al saltar y al aterrizar.
- **Mercurio:** hielo en cráteres de sombra permanente.
- **Venus:** calor y presión extremos; las sondas Venera duraron como mucho unas dos horas.
- **Marte:** el polvo sobre los paneles solares dejó sin energía a misiones reales.
- **Ío:** el cuerpo con más volcanes activos del sistema solar.
- **Europa:** un océano de agua salada bajo el hielo. El final con vida extraterrestre es ficción, y el juego lo dice.

Los datos de los planetas están en `src/datos.js` y son valores de ejemplo hasta tener la base de datos oficial de la NASA.

## Ejecutar

```bash
npm install
npm run dev          # versión web para desarrollo (http://localhost:5173)
npm run build        # versión web lista para publicar, en dist/
npm run app          # abrir como app de escritorio (Electron)
npm run empaquetar   # crear salida/CoheteDelGranero-windows.zip
npm run simular      # simular partidas para revisar el balance
```

Hecho con [Three.js](https://threejs.org/), [Vite](https://vite.dev/) y [Electron](https://www.electronjs.org/). Todos los modelos 3D, sonidos y texturas se generan con código.

**Equipo:** Siderense Rocket Labs
