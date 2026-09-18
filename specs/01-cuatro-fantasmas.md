# SPEC 01 — Cuatro fantasmas con conducta propia

> **Estado:** Approved **Depende de:** — **Fecha:** 2026-09-18 **Objetivo:** Tener 4 fantasmas en la partida, cada uno con una conducta `kind` distinta — uno de ellos persiguiendo agresivamente a Pac-Man.

## Alcance

**Incluye:**

- 4 entradas en `GHOST_STARTS` (`maze.js`), dentro de la pen.
- 4 conductas `kind`: `hunter` (perseguidor, ya existe), `ambusher` (anticipador), `clever` (astuto), `shy` (tímido).
- Dispatch por `kind` en `decideGhost` (`game.js`).
- Colores clásicos por índice en `render.js`: rojo, rosa, cian, naranja.
- Todos salen a la vez desde el inicio, con velocidad común `GHOST_SPEED` (0.1).

**Fuera de alcance (futuros specs):**

- Modo *frightened* (huir / azules) — el MVP no tiene pastilla de poder.
- Velocidades distintas por fantasma.
- Salida escalonada de la pen con temporizador.
- Colisión fantasma-fantasma.

## Data model

```js
// maze.js — GHOST_STARTS con 4 kinds
const GHOST_STARTS = [
  { x: 13, y: 13, kind: 'hunter' },   // rojo, persigue a Pac-Man
  { x: 14, y: 13, kind: 'ambusher' }, // rosa, apunta delante de Pac-Man
  { x: 13, y: 14, kind: 'clever' },   // cian, combina cazador + Pac-Man
  { x: 14, y: 14, kind: 'shy' },      // naranja, vaga y huye si estás cerca
];
```

- `ambusher`: objetivo = 2 celdas en la dirección actual de Pac-Man; elige el `dir` que minimiza distancia Manhattan a ese objetivo.
- `clever`: objetivo = punto 2 celdas delante de Pac-Man, duplicado el vector desde el `hunter` hasta él; referencia la posición del fantasma `hunter` en `game.ghosts`.
- `shy`: si distancia Manhattan a Pac-Man &gt; 8 → aleatorio; si ≤8 → maximiza distancia (huye).
- Reutilizan `canMove`, `OPPOSITE`, `aligned` y las decisiones en centros de celda, como hoy.

## Implementation plan

1. `maze.js`: sustituir `GHOST_STARTS` por las 4 entradas. Sigue corriendo; las 3 nuevas caen en el `else` random actual.
2. `game.js`: refactorizar `decideGhost` a dispatch por `kind`; `hunter` idéntico; añadir `ambusher` y `shy`; eliminar la rama `random`. Prueba: rojo y rosa persiguen, rosa se adelanta, naranja vaga/huye.
3. `game.js`: añadir `clever` (usa posición del `hunter`). Prueba: el cian corta el paso por caminos paralelos.
4. `render.js`: reordenar `GHOST_COLORS` a `['#ff0000', '#ffb8ff', '#00ffff', '#ffb852']` para que el índice coincida con el orden de `GHOST_STARTS`.

Cada paso deja el juego funcional y commiteable.

## Acceptance criteria

- [ ] `src/index.html` se abre sin errores en consola.

- [ ] Se ven 4 fantasmas a la vez, cada uno de un color: rojo, rosa, cian, naranja.

- [ ] El rojo persigue siempre minimizando distancia Manhattan (conducta `hunter` inalterada).

- [ ] El rosa se dirige a un punto 2 celdas delante de la dirección de Pac-Man y se adelanta en intersecciones.

- [ ] El cian calcula su objetivo a partir de la posición del rojo y de Pac-Man.

- [ ] El naranja vaga al azar lejos y huye cuando Pac-Man está a ≤8 celdas.

- [ ] Los 4 cruzan la puerta de la pen (tipo 3) y Pac-Man sigue bloqueado por ella.

- [ ] Al perder una vida, los 4 vuelven a sus celdas de inicio.

## Decisions

- **Sí:** las 4 personalidades clásicas. Reconocibles y mutuamente distintas.
- **No:** salida escalonada con temporizador. No aporta al objetivo, añade estado.
- **Sí:** reutilizar `hunter` como el agresivo. Ya implementa el requisito.
- **No:** velocidades propias. Todo a `GHOST_SPEED` (0.1).
- **No:** rama `random` genérica. Queda absorbida por `shy`.
- **Sí:** color por índice en `render.js`, reordenando `GHOST_COLORS` según `GHOST_STARTS`.

## Lo que **no** entra en este spec

- Modo *frightened* / pastilla de poder / fantasmas azules.
- Velocidades distintas por fantasma.
- Salida escalonada con temporizador.
- Colisión fantasma-fantasma.
- Vuelta a la pen o reparto dirigido tras colisión (la repartida actual ya reinicia posiciones).

Cada uno de esos, si llega, va en su propio spec.