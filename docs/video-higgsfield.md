# Tráiler con Higgsfield · Granero Orbital

Paquete para hacer un tráiler de unos 40 segundos con Higgsfield. Las imágenes de partida son las capturas reales de [`docs/capturas`](capturas).

## Una advertencia antes de empezar

La IA de video **inventa detalles**: puede cambiar el cohete, el HUD o los colores del juego. Para el jurado, lo que cuenta es el juego real.

- Usen Higgsfield para **la intro, las transiciones y los planos de ambiente**.
- Usen **grabación real del juego** para mostrar cómo se juega (ver [`guion-video.md`](guion-video.md)).
- Si algo del video no existe en el juego, no lo usen: un juez puede abrir el enlace y comparar.

## Cómo usar este paquete

1. En Higgsfield, elijan **imagen a video** (image-to-video) para las tomas que dicen "Imagen: …", y **texto a video** para la intro.
2. Suban la captura indicada y peguen el prompt en inglés (los modelos responden mejor en inglés).
3. Duración de cada toma: **5 segundos**. Generen 2 o 3 versiones y elijan la que menos cambie el juego.
4. Repitan en todos los prompts las palabras de estilo para que todas las tomas se parezcan:
   `low-poly 3D, flat colors, thick black outlines, toon shading, bright cartoon style`

## Las tomas

### 1. Intro: el granero (texto a video)
**Prompt:**
> A lonely red wooden barn in a green field at golden hour, low hills and snowy low-poly mountains behind. The barn doors slowly creak open, revealing a small broken white-and-red cartoon rocket lying on wooden supports, smoke rising from its engine. Slow dolly-in toward the doors. Low-poly 3D, flat colors, thick black outlines, toon shading, bright cartoon style.

**Voz:** "Encontramos un cohete abandonado en un granero."

### 2. El mundo del juego
**Imagen:** `01-menu-principal.png` (recorten el menú de la izquierda antes de subirla, o usen una captura del granero sin menú).
**Prompt:**
> Slow aerial orbit around a red barn in a green valley with a small lake and mountains, gentle wind moving the trees, small clouds drifting. Keep the scene and colors exactly as in the image. Low-poly 3D, flat colors, thick black outlines, toon shading.

**Voz:** "Para repararlo hay que tomar decisiones como en una misión real."

### 3. El vuelo
**Imagen:** `04-vuelo-jupiter.png` (recórtenla para quitar el HUD de arriba y abajo).
**Prompt:**
> A small cartoon rocket with blue solar panels flies toward a huge banded orange planet, stars twinkling, slow push-in camera following the rocket, engine flame flickering. Keep the rocket design as in the image. Low-poly 3D, flat colors, thick black outlines, toon shading.

**Voz:** "Cada mejora suma masa, y la masa cuesta combustible."

### 4. El aterrizaje
**Imagen:** `05-descenso.png` (sin el HUD).
**Prompt:**
> The cartoon rocket descends slowly onto a yellow volcanic moon, landing legs extended, engine flame pushing clouds of dust outward, Jupiter looming in the black sky. Camera slowly tilts down with the rocket. Low-poly 3D, flat colors, thick black outlines, toon shading.

**Voz:** "La señal tarda 43 minutos en llegar a la Tierra: el aterrizaje es tuyo."

### 5. Marte
**Imagen:** `07-marte-rover.png` (sin el HUD ni los brazos).
**Prompt:**
> A dusty boxy cartoon rover on red Martian terrain with mesas, wind blowing red dust across the ground, the rover's solar panel slowly rotating toward the sun and a small green light turning on. Slow dolly-in. Low-poly 3D, flat colors, thick black outlines, toon shading.

**Voz:** "Cada planeta guarda una misión basada en ciencia real."

### 6. Europa: el final
**Imagen:** `09-final-europa.png` (sin el subtítulo).
**Prompt:**
> Glowing cartoon jellyfish-like creatures in cyan, green and pink slowly rise from a crack in a frozen icy moon, pulsing light rings expanding from the crack, a small rocket hovering nearby, giant banded planet in the starry sky. Slow upward crane shot. Low-poly 3D, flat colors, thick black outlines, toon shading, magical mood.

**Voz:** "…y escuchar lo que hay bajo el hielo de Europa."

### 7. Cierre (en el editor, no en Higgsfield)
Fondo con la toma 6 congelada y desenfocada, y encima:
- **COHETE DEL GRANERO**
- "Una misión de diseño espacial · NASA Space Apps 2026"
- El enlace para jugar: granero-orbital.study
- "Siderense Rocket Labs"

**Voz:** "Granero Orbital. Diseñar una misión es decidir."

## Armar el tráiler

1. Junten las tomas en orden en **Clipchamp** (viene con Windows 11) o CapCut.
2. Entre la toma 2 y la 3, y entre la 5 y la 6, intercalen **3 a 5 segundos de juego real**: el taller cambiando el cohete y el Mapa con las ventanas de lanzamiento. Así se ve que el juego existe de verdad.
3. Graben la voz aparte y añádanla encima.
4. Música: pueden grabar la del propio juego, que es original y se genera con código.
5. Exporten en 1080p.

**Créditos:** si usan Higgsfield, conviene decirlo al final del video ("Tomas cinematográficas generadas con IA") y en la entrega, igual que el uso de IA en el código.
