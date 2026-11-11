// Datos de EJEMPLO. Se reemplazan por la base de datos oficial de la NASA cuando se libere.
const DATOS_PLANETAS = {
  mercurio: { nombre: "Mercurio", distancia: 1.0, peligro: 0.6, nota: "Calor extremo, sin atmosfera" },
  venus:    { nombre: "Venus",    distancia: 1.6, peligro: 0.8, nota: "Presion y calor enormes" },
  marte:    { nombre: "Marte",    distancia: 2.4, peligro: 0.5, nota: "Agua antigua" },
  jupiter:  { nombre: "Jupiter",  distancia: 3.6, peligro: 1.0, nota: "Radiacion intensa" },
  europa:   { nombre: "Europa",   distancia: 3.8, peligro: 0.9, nota: "Oceano bajo el hielo (final)" },
};

// Objetos recolectables: prob = peso base de aparicion, valor = precio base de venta.
const OBJETOS = [
  { nombre: "Chatarra espacial", valor: 20,   prob: 0.50, color: "#9aa3a8" },
  { nombre: "Hielo",             valor: 60,   prob: 0.25, color: "#8fe3f0" },
  { nombre: "Mineral raro",      valor: 200,  prob: 0.15, color: "#ffc94a" },
  { nombre: "Cristal lunar",     valor: 600,  prob: 0.07, color: "#e28bff" },
  { nombre: "Muestra biologica", valor: 2000, prob: 0.03, color: "#6ee37a" },
];
