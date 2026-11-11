import { defineConfig } from "vite";

// base "./": rutas relativas, para que la versión web funcione en cualquier carpeta
// (GitHub Pages, itch.io, un servidor cualquiera) y dentro de la app de Electron.
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 900 }, // Three.js ocupa unos 650 kB: es esperado
});
