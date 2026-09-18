# SPEC 02 — Fantasmas salen de la pen al iniciar

> **Estado:** Approved **Depende de:** SPEC 01 **Fecha:** 2026-09-18 **Objetivo:** Los 4 fantasmas arrancan en línea dentro de la pen y salen uno tras otro por la puerta al iniciar el juego y tras cada vida perdida.

## Alcance

**Incluye:**

- Disposición en línea: los 4 arrancan en una fila horizontal (fila 14, columnas 12–15), ordenados como su orden de salida.
- Salida escalonada con temporizador fijo: un fantasma cada `GHOST_RELEASE_INTERVAL` frames, en orden rojo → rosa → cian → naranja (índice 0→3).
- Fase `leaving` por fantasma: mientras está dentro de la pen ignoran su `kind` y se dirigen al punto de salida justo encima de la puerta.
- Ruta de salida única: subir por las columnas 13–14 y cruzar la puerta (fila 12, tipo 3).
- Un fantasma no liberado queda congelado en su celda hasta que `game.ticks >= releaseTicks`.
- `resetPositions` rearma la escalera (vuelve a `game.ticks = 0` y a cada fantasma su `releaseTicks`) al perder una vida.
- Visibilidad de inicio: al pulsar Start los 4 se ven en línea dentro de la pen; el overlay no se toca.

**Fuera de alcance (futuros specs):**

- Dots comidos como gatillo de salida (esta espec se limita al temporizador fijo).
- Cambiar `GHOST_STARTS` a posiciones fuera de la pen.
- Ajustes de overlay/CSS de la pantalla de inicio.
- Modo frightened, velocidades propias, colisión fantasma-fantasma.
- Vuelta dirigida a la pen tras colisión (la repartida ya rearma la salida).

## Data model

```js
// maze.js — los 4 en fila horizontal; el orden de la lista es el de salida.
const GHOST_STARTS = [
  { x: 12, y: 14, kind: 'hunter' },   // rojo, sale 1º
  { x: 13, y: 14, kind: 'ambusher' }, // rosa, sale 2º
  { x: 14, y: 14, kind: 'clever' },   // cian, sale 3º
  { x: 15, y: 14, kind: 'shy' },      // naranja, sale 4º
];

// game.js — temporizador y fantasma
const GHOST_RELEASE_INTERVAL = 60; // frames (~1 s a 60 fps) entre salidas
game.ticks = 0;                    // frames de juego transcurridos
{ x, y, dir, speed, kind, leaving: false, releaseTicks: i * GHOST_RELEASE_INTERVAL }

// Punto de salida: centro de la celda justo encima de la puerta.
const DOOR_EXIT = { x: 13.5, y: 11 };
```

Convención: con `leaving === false` y `game.ticks < releaseTicks` el fantasma no se mueve (congelado en su celda). Cuando `game.ticks >= releaseTicks`, pasa a `leaving = true` y `decideGhost` ignora `kind`, eligiendo la dirección que minimiza la distancia Manhattan a `DOOR_EXIT`. Al estar alineado con `y <= 11`, cambia `leaving = false` y pasa a usar su `kind`.

## Implementation plan

1. `maze.js` — `GHOST_STARTS` a la fila horizontal (cols 12–15, fila 14). El juego sigue corriendo igual (aún sin temporizador; los 4 salen juntos con la lógica `leaving` actual).
2. `game.js` — temporizador en `createGame`: añadir `game.ticks`; cada fantasma con `leaving: false` y `releaseTicks: i * GHOST_RELEASE_INTERVAL`; `update` incrementa `game.ticks`; `moveGhost` libera al fantasma cuando `ticks >= releaseTicks` y mientras tanto lo deja quieto. Prueba manual: Start → rojo sale al instante, rosa \~1 s después, cian y naranja escalonados; cada uno cruza y sigue su conducta.
3. `game.js` — `resetPositions`: `game.ticks = 0` y reaparecer cada fantasma en su celda con `leaving: false` y su `releaseTicks`. Prueba: perder una vida → repite la escalera.

Cada paso deja el juego funcional y commiteable.

## Acceptance criteria

- [ ] Abrir `src/index.html` no muestra errores en consola.

- [ ] Al pulsar Start se ven los 4 fantasmas en línea dentro de la pen (fila 14, columnas 12–15).

- [ ] Salen uno tras otro por la puerta (fila 12): rojo al instante, luego rosa, cian y naranja con un intervalo fijo entre cada uno.

- [ ] Ningún fantasma queda atrapado dentro de la pen (filas 13–15, columnas 11–16).

- [ ] Fuera de la pen cada fantasma usa su `kind` de SPEC 01 (hunter persigue, ambusher se adelanta, clever corta el paso, shy vaga/huye).

- [ ] Al perder una vida, los 4 vuelven en línea a la pen y repiten la salida escalonada por la puerta.

- [ ] Pac-Man sigue bloqueado por la puerta (tipo 3) y los fantasmas la atraviesan.

## Decisions

- **Sí:** disposición en línea (fila horizontal, cols 12–15). Encaja en la pen interior (6×3) y hace visible el escalón de salida. Revisión de SPEC 02: sustituye el arranque 2×2.
- **Sí:** salida escalonada con temporizador fijo (`GHOST_RELEASE_INTERVAL`). Revierte la decisión de SPEC 01/02 y se destacó como candidato a futuro spec.
- **Sí:** orden de salida = índice de `GHOST_STARTS` (rojo, rosa, cian, naranja), igual al clásico.
- **No:** dots comidos como gatillo. Añade estado y va en su propio spec si llega.
- **Sí:** rearmar la escalera en `resetPositions` (`game.ticks = 0` + `releaseTicks`). Cubre el respawn sin lógica nueva.
- **No:** cambios de overlay/CSS. Con el escalonado, la línea inicial se ve al pulsar Start.

## Lo que **no** entra en este spec

- Dots comidos como gatillo de salida.
- Cambios de overlay/CSS en la pantalla de inicio.
- Modo frightened, velocidades propias, colisión fantasma-fantasma.
- Vuelta dirigida a la pen tras colisión.

Cada uno de esos, si llega, va en su propio spec.