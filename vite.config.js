import { defineConfig } from "vite";
import { resolve } from "node:path";

// base "./": rutas relativas, para que la versión web funcione en cualquier carpeta
// (GitHub Pages, itch.io, un servidor cualquiera) y dentro de la app de Electron.
export default defineConfig({
  base: "./",
  // Dos páginas: la presentación del juego (index.html) y el juego (jugar.html)
  build: {
    chunkSizeWarningLimit: 900, // Three.js ocupa unos 650 kB: es esperado
    rollupOptions: { input: { inicio: resolve(__dirname, "index.html"), juego: resolve(__dirname, "jugar.html") } },
  },
});
