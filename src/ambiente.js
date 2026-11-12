// Vida de cada bioma: fenómenos animados que hacen que cada lugar se sienta distinto.
//   Mercurio: polvo fino que brilla al sol rasante.
//   Venus:    columnas de humo de los volcanes y burbujas en la lava.
//   Marte:    remolinos de polvo (dust devils) y sus dos lunas, Fobos y Deimos.
//   Ío:       penachos volcánicos de azufre con forma de paraguas.
//   Europa:   posibles géiseres de vapor de agua (el telescopio Hubble vio indicios) y agujas de hielo.
import * as THREE from "three";
import { cono, esfera, toon } from "./estilo.js";
import { crearParticulas } from "./particulas.js";

export function crearAmbiente(dest, mundo, altura, azar) {
  const efectos = [];
  const lejos = (min, max) => { // un punto al azar lejos del cohete
    const a = azar() * Math.PI * 2, r = min + azar() * (max - min);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  // Polvo o cristales flotando cerca del jugador (sigue al jugador en una caja de 40 m)
  function motas(n, color, tam, vel, aditivo = false) {
    const p = crearParticulas(n, { color, tam, opacidad: 0.7, aditivo });
    const d = Array.from({ length: n }, () => [azar() * 40 - 20, azar() * 6, azar() * 40 - 20, azar() * 6]);
    mundo.add(p.puntos);
    efectos.push((t, dt, pos) => {
      d.forEach((m, i) => {
        m[0] += vel * dt; m[1] += Math.sin(t + m[3]) * 0.15 * dt;
        if (m[0] > 20) m[0] -= 40;
        const x = pos.x + m[0], z = pos.z + m[2];
        p.poner(i, x, altura(x, z) + 0.3 + m[1], z);
      });
      p.listo();
    });
  }

  // Columna de partículas que sube desde un punto (humo, vapor, penacho)
  function columna(x, z, { n = 60, color, tam = 3, alto = 40, ancho = 4, vel = 6, abre = 0, cae = false, ciclo = 0, aditivo = false, opacidad = 0.6 }) {
    const y0 = altura(x, z);
    const p = crearParticulas(n, { color, tam, opacidad, aditivo });
    mundo.add(p.puntos);
    const d = Array.from({ length: n }, (_, i) => [i / n, azar() * Math.PI * 2, azar()]);
    efectos.push(t => {
      // ciclo > 0: el chorro sale a ratos (géiseres); la fracción `activo` del ciclo está encendido
      const activo = ciclo ? Math.max(0, Math.sin(t * Math.PI * 2 / ciclo)) : 1;
      d.forEach((m, i) => {
        const f = (t * vel / alto + m[0]) % 1;
        let y = f * alto, r = ancho * (0.3 + f * 0.7) + abre * f * f;
        if (cae) { y = alto * Math.sin(f * Math.PI); r = ancho + abre * f; } // arco: sube y cae como un paraguas
        const visible = ciclo ? f < activo : true;
        p.poner(i, x + Math.cos(m[1]) * r * m[2], visible ? y0 + y : -9999, z + Math.sin(m[1]) * r * m[2]);
      });
      p.listo();
    });
  }

  if (dest === "mercurio") {
    motas(70, 0xfff3c4, 0.18, 0.4, true);
  }

  if (dest === "venus") {
    for (let i = 0; i < 4; i++) {
      const [x, z] = lejos(70, 170);
      columna(x, z, { n: 70, color: 0x6b5a48, tam: 9, alto: 70, ancho: 5, vel: 5, abre: 22, opacidad: 0.45 });
    }
    motas(60, 0xffb060, 0.25, 1.2, true); // cenizas encendidas en el aire
  }

  if (dest === "marte") {
    // Remolinos de polvo que recorren la llanura
    for (let i = 0; i < 3; i++) {
      const [x0, z0] = lejos(40, 120);
      const p = crearParticulas(90, { color: 0xd9905a, tam: 1.8, opacidad: 0.5 });
      mundo.add(p.puntos);
      const d = Array.from({ length: 90 }, (_, k) => [k / 90, azar() * Math.PI * 2]);
      const rumbo = azar() * Math.PI * 2;
      efectos.push(t => {
        const cx = x0 + Math.cos(rumbo) * Math.sin(t * 0.05) * 50, cz = z0 + Math.sin(rumbo) * Math.sin(t * 0.05) * 50;
        const y0 = altura(cx, cz);
        d.forEach((m, k) => {
          const f = (t * 0.25 + m[0]) % 1, a = m[1] + t * 4 + f * 6, r = 0.8 + f * 5;
          p.poner(k, cx + Math.cos(a) * r, y0 + f * 26, cz + Math.sin(a) * r);
        });
        p.listo();
      });
    }
    motas(60, 0xc98a5a, 0.3, 2.2);
    // Fobos y Deimos, las dos lunas pequeñas de Marte
    [[0.9, 520, 9], [2.4, 600, 5]].forEach(([a, r, tam]) => {
      const luna = new THREE.Mesh(new THREE.DodecahedronGeometry(tam), new THREE.MeshBasicMaterial({ color: 0x8a7a6a, fog: false }));
      luna.position.set(Math.cos(a) * r, 260 + tam * 8, Math.sin(a) * r);
      mundo.add(luna);
    });
  }

  if (dest === "jupiter") {
    // Penachos volcánicos de azufre con forma de paraguas, como los que fotografió la sonda Voyager
    for (let i = 0; i < 3; i++) {
      const [x, z] = lejos(90, 180);
      columna(x, z, { n: 120, color: 0xf0d860, tam: 3.5, alto: 60, ancho: 2, vel: 14, abre: 45, cae: true, opacidad: 0.55 });
      columna(x, z, { n: 30, color: 0xff7a2a, tam: 4, alto: 8, ancho: 3, vel: 6, aditivo: true, opacidad: 0.7 });
    }
    motas(50, 0xfff08a, 0.22, 0.8, true);
  }

  if (dest === "europa") {
    // Géiseres de vapor de agua que salen a ratos de las grietas del hielo
    for (let i = 0; i < 4; i++) {
      const [x, z] = lejos(45, 150);
      columna(x, z, { n: 80, color: 0xeaf8ff, tam: 2.6, alto: 55, ancho: 1.2, vel: 22, abre: 10, ciclo: 7 + i * 1.7, opacidad: 0.55 });
    }
    // Agujas de hielo (penitentes)
    const hielo = toon(0xdff4ff);
    for (let i = 0; i < 28; i++) {
      const [x, z] = lejos(20, 170);
      const grupo = new THREE.Group();
      for (let k = 0; k < 3 + Math.floor(azar() * 4); k++) {
        const alto = 2 + azar() * 6;
        const aguja = cono(0.5 + azar() * 0.6, alto, 0xdff4ff, 5);
        aguja.material = hielo;
        aguja.position.set(azar() * 3 - 1.5, alto / 2, azar() * 3 - 1.5);
        grupo.add(aguja);
      }
      grupo.position.set(x, altura(x, z) - 0.3, z);
      mundo.add(grupo);
    }
    motas(70, 0xffffff, 0.16, 0.5, true); // cristales de hielo flotando
  }

  let t = 0;
  return {
    actualizar(dt, pos) {
      t += dt;
      efectos.forEach(fn => fn(t, dt, pos));
    },
  };
}

// Pequeña nube de polvo a los pies del jugador (al caminar o al caer de un salto).
export function colorPolvo(dest) {
  return { mercurio: 0xb5aa9a, venus: 0x9a6b40, marte: 0xc1643a, jupiter: 0xe8d070, europa: 0xf2fbff }[dest] || 0xcccccc;
}
export { esfera };
