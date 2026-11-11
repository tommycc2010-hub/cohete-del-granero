# Plan: Cohete del Granero 3D

Juego 3D en primera persona con estilo tipo Schedule I: modelos low-poly, colores planos, contornos marcados y un teléfono como menú.

**Tecnología recomendada:** Three.js (3D en JavaScript) + Vite, empaquetado como app de escritorio con Electron.
- Corre en el navegador (link fácil para los jueces) y también como app `.exe`.
- Reutiliza las reglas que ya funcionan en `juego.js` y `datos.js`.
- Modelos low-poly gratis y con licencia libre (CC0): Kenney y Quaternius.

**Calendario:** preparación de hoy al viernes, hackathon sábado y domingo.

> Antes de empezar: revisa las reglas de NASA Space Apps sobre código hecho antes del evento. Si no lo permiten, usa estos días solo para practicar y prepara el código el sábado.

---

## Paso 0. Preparar el proyecto
- [x] Instalar Node.js (versión LTS).
- [x] Crear el proyecto con Vite e instalar Three.js.
- [x] Mover las reglas de `juego.js` a un módulo separado de la parte visual.
- [x] Guardar todo en git.

**Listo cuando:** `npm run dev` abre una página con un cubo 3D girando.

## Paso 1. Granero en 3D
- [x] Suelo, cielo, granero, cerca y luz de sol.
- [x] Estilo visual: materiales toon (`MeshToonMaterial`), contornos negros y colores planos.
- [x] Cohete averiado dentro del granero con humo.

**Listo cuando:** el granero se ve parecido a Schedule I.

## Paso 2. Caminar en primera persona
- [x] Controles WASD + mouse (`PointerLockControls`).
- [x] Colisiones simples con paredes y objetos.
- [x] Interactuar con la tecla **E**: bomba de combustible, mesa de venta, taller y cohete.

**Listo cuando:** puedes caminar y cada objeto muestra "Presiona E".

## Paso 3. Teléfono (menú)
- [x] Teléfono que se abre con **Tab**, superpuesto en HTML como en Schedule I.
- [x] Apps dentro del teléfono: Estado (dinero, combustible, carga), Taller, Mapa y Diario.
- [x] Conectarlo a las reglas existentes.

**Listo cuando:** puedes comprar, vender y mejorar desde el teléfono.

## Paso 4. Mejoras visibles en el cohete
- [x] Cada mejora cambia una pieza del modelo: motor, tanque, escudo, antena y sensores.
- [x] Las grietas y el humo desaparecen al reparar.

**Listo cuando:** se nota a simple vista qué mejoraste.

## Paso 5. Despegue y espacio
- [x] Animación de despegue desde el granero.
- [x] Escena espacial con estrellas y el planeta de destino.
- [x] Pilotar el cohete y recoger objetos flotando; cada maniobra gasta combustible.
- [x] Indicador de combustible y aviso de "combustible justo para volver".

**Listo cuando:** puedes ir, recoger objetos y regresar.

## Paso 6. Ciclo completo y progresión
- [x] Reentrada con riesgo de perder carga según el escudo.
- [x] Vender en el granero y desbloquear destinos en orden.
- [x] Los 4 planetas con su apariencia y peligro: Mercurio, Venus, Marte y Júpiter.

**Listo cuando:** puedes jugar de Mercurio a Júpiter sin trucos.

**Este es el MVP. Todo lo anterior debe estar listo antes del sábado.**

## Paso 7. Final en Europa
- [x] Escena de Europa con hielo y océano debajo.
- [x] Detección de la señal con la antena y escena final de vida extraterrestre.

## Paso 8. El científico
- [x] Personaje low-poly en el granero.
- [x] Diálogos que explican cada mejora y cada planeta, con datos y su nivel de confianza.
- [x] Él interpreta la señal final.

## Paso 8b. Exploración a pie y mundo abierto
- [x] Aterrizar en cada destino y explorar su bioma a pie (en Júpiter se aterriza en su luna Ío).
- [x] Oxígeno y traje: el cohete recarga el oxígeno, las zonas peligrosas dañan el traje.
- [x] Mejoras nuevas: traje espacial y tanque de oxígeno.
- [x] Lo que flota en órbita queda como extra pequeño (35 % del valor).
- [x] La señal de Europa está en la superficie: hay que caminar hasta ella.
- [x] Granero con montañas, mesetas, llanuras y lago.
- [x] Pueblo visitable (Villa Siderense) con vecinos y mercado que paga un 20 % más.

## Paso 9. Durante el hackathon (sábado y domingo)
- [ ] Cargar la base de datos de la NASA en `datos.js` cuando la liberen.
- [ ] Ajustar el balance: precios, combustible, oxígeno y probabilidades.
- [x] Sonido, pantalla de inicio y tutorial corto.
- [ ] Publicar la versión web (link para jueces) y empaquetar la app con Electron.
- [ ] Grabar el video demo y preparar la presentación.

## Ideas si sobra tiempo
- Eventos aleatorios: tormenta solar, fallo de componente, fuga de combustible.
- Ventanas de lanzamiento y retraso de comunicaciones.
- Reporte de misión al volver de cada viaje.
