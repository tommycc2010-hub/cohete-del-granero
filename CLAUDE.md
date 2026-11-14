# Cohete del Granero · guía para trabajar en el proyecto

Juego 3D (Three.js + Vite) para el NASA Space Apps 2026, reto *Space Mission Design Game*. Apps: web (GitHub Pages), Windows (Electron) y Android (Capacitor). El texto del juego y los comentarios están en español.

## Antes de editar
1. Lee `docs/mapa-del-proyecto.md`: dice qué archivo hace qué y **qué se rompe si cambias cada uno**.
2. Si Graphify está conectado, úsalo en lugar de leer archivos enteros (el repositorio es `tommycc2010-hub/cohete-del-granero`):
   - `graphify_file_neighbors` con `symbols_only` → los símbolos de un archivo, sin leer su contenido.
   - `graphify_imports_exports` → quién importa a quién.
   - `graphify_impact` → qué se afecta al cambiar un símbolo.
   - `graphify_rank_files` → qué archivos mirar para una pregunta.
   - El grafo describe el último commit **subido a GitHub**: los cambios locales sin subir no aparecen.
3. `main.js` es muy largo: busca la función que necesitas y lee solo ese tramo.

## Comandos
- `npm run dev` → servidor local (puerto 5173; `?demo` = todo desbloqueado y sin guardar; `?movil` = controles táctiles)
- `npm run simular` → simulador de balance (debe dar ~9 viajes y 100 % terminadas)
- `npm run capturas` → capturas del README (`npm run capturas -- carpeta solo=04,05` para algunas) · `npm run iconos` → iconos · `npm run empaquetar` → app de Windows
- Multijugador: dos pestañas con `?demo`, una crea la sala y la otra se une. Si el panel del navegador no dibuja, el bucle no corre: avanzar con `__juego.avanzar(segundos)`
- `npx electron herramientas/revisar.cjs vistas.json carpeta` → fotos de objetos concretos (la forma fiable de revisar lo visual)

## Reglas del proyecto
- **Estilo visual:** toon de 3 tonos, colores planos y contorno negro. Todo se genera con código, sin imágenes ni audios externos. Cualquier novedad visual debe encajar en eso.
- **Las reglas no tocan lo visual:** economía y estado van en `reglas.js`. Si cambias números de balance, corre `npm run simular`.
- **Guardado:** si añades algo a `estado`, agrégalo a `GUARDABLE` e `importarEstado` (validando el tipo), o se perderá al guardar.
- **Datos científicos:** son de divulgación general. Cada dato debe ser real y decir de dónde viene; el final con vida en Europa es **ficción** y así se dice.
- **Probar lo visual:** el panel del navegador a veces no dibuja; para revisar el resultado usa las capturas de Electron (leen el lienzo, así que funcionan aunque la pantalla esté apagada).
- **Multijugador:** si añades un mensaje en `multijugador.js`, el anfitrión decide y los invitados solo piden; nunca confíes en lo que manda un invitado sin validarlo.

## Publicar
- Código: `git push origin main` (la web se publica sola).
- Apps: `npm run empaquetar`, crear la *release* en GitHub y subir el `.zip`; el APK lo compila y adjunta GitHub Actions solo.
- Commits con autor `Siderense Rocket Labs` y el correo `noreply` de GitHub. Nunca poner correos personales en commits ni en servicios externos.
- Las acciones de GitHub se hacen con la credencial guardada en el equipo; el usuario es quien inicia sesión.

## Reto
El diseño de misión (laboratorio, datos, puntaje y modo equipo) está en `diseno.js` y `laboratorio.js`; el flujo completo está en `docs/mapa-del-proyecto.md`. Lo pendiente también.
