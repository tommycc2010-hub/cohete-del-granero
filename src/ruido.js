// Ruido determinista para generar relieve: siempre da el mismo paisaje.
function hash(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// Ruido suave entre 0 y 1.
export function ruido(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

// Varias capas de ruido sumadas. Devuelve aproximadamente entre -1 y 1.
export function fbm(x, z, capas = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < capas; i++) { s += a * (ruido(x * f, z * f) * 2 - 1); f *= 2; a *= 0.5; }
  return s;
}

// Transición suave de 0 a 1 cuando v va de a hasta b (también funciona con a > b).
export function paso(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Generador de números al azar repetible a partir de una semilla.
export function azarSemilla(semilla) {
  let s = semilla >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Distancia de un punto al segmento (ax,az)-(bx,bz).
export function distSegmento(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
