# SPEC 02 — Fantasmas salen de la pen al iniciar

> **Estado:** Approved **Depende de:** SPEC 01 **Fecha:** 2026-09-18 **Objetivo:** Los 4 fantasmas cruzan la puerta de la pen y salen al mapa cuando empiezan a moverse, al inicio y tras cada vida perdida.

## Alcance

**Incluye:**

- Fase `leaving` por fantasma: mientras están dentro de la pen ignoran su `kind` y se dirigen al punto de salida justo encima de la puerta.
- Ruta de salida única: subir por las columnas 13–14 y cruzar la puerta (fila 12, tipo 3).
- `leaving` se arma al crear partida y se rearma en `resetPositions` al perder una vida.
- Los 4 salen a la vez desde el primer frame (se mantiene la decisión de SPEC 01).
- Visibilidad de inicio: al pulsar Start los 4 salen visibles; el overlay no se toca.

**Fuera de alcance (futuros specs):**

- Salida escalonada con temporizador (descartada en SPEC 01).
- Cambiar `GHOST_STARTS` o arrancar fuera de la pen.
- Ajustes de overlay/CSS de la pantalla de inicio.
- Modo frightened, velocidades propias, colisión fantasma-fantasma.
- Vuelta dirigida a la pen tras colisión (la repartida ya rearma la salida).

## Data model

```js
// game.js — cada fantasma en createGame() y resetPositions()
{ x, y, dir, speed, kind, leaving: true }

// Punto de salida: centro de la celda justo encima de la puerta.
const DOOR_EXIT = { x: 13.5, y: 11 };
```

Convención: con `leaving === true`, `decideGhost` ignora `kind` y elige dirección minimizando la distancia Manhattan a `DOOR_EXIT`. Al estar alineado con `y <= 11`, cambia `leaving = false` y pasa a usar su `kind`.

## Implementation plan

1. `game.js` — `createGame`: añadir `leaving: true` a cada fantasma (`game.js:39-45`). El juego sigue corriendo igual (aún sin conducta).
2. `game.js` — `decideGhost`: abrir con `if (g.leaving)`: si `Math.round(g.y) <= 11` → `leaving = false` y continuar por `kind`; si no → `g.dir = pickToward(choices, g, DOOR_EXIT.x, DOOR_EXIT.y)` y return. Prueba manual: Start → los 4 suben, cruzan la puerta y cada uno sigue su conducta.
3. `game.js` — `resetPositions`: poner `g.leaving = true`. Prueba: perder una vida → los 4 vuelven a salir por la puerta.

Cada paso deja el juego funcional y commiteable.

## Acceptance criteria

- [ ] Abrir `src/index.html` no muestra errores en consola.

- [ ] Al pulsar Start se ven los 4 fantasmas salir de la pen por la puerta (fila 12) y transitando el mapa.

- [ ] Ningún fantasma queda atrapado dentro de la pen (filas 13–15, columnas 11–16).

- [ ] Fuera de la pen cada fantasma usa su `kind` de SPEC 01 (hunter persigue, ambusher se adelanta, clever corta el paso, shy vaga/huye).

- [ ] Al perder una vida, los 4 vuelven a la pen y repiten la salida por la puerta.

- [ ] Pac-Man sigue bloqueado por la puerta (tipo 3) y los fantasmas la atraviesan.

## Decisions

- **Sí:** fase `leaving` con punto de salida fijo (13.5, 11). Un único destino enruta desde cualquier celda de la pen y evita que la IA `hunter` empuje a los fantasmas hacia abajo, lejos de la puerta (causa del bug).
- **No:** arrancar fuera de la pen o mover `GHOST_STARTS`. Conserva SPEC 01 y la salida visible.
- **No:** salida escalonada con temporizador. Decisión cerrada de SPEC 01.
- **Sí:** todos a la vez desde el primer frame de juego.
- **Sí:** rearmar `leaving` en `resetPositions`. Cubre el respawn sin lógica nueva.
- **No:** cambios de overlay/CSS. Con la salida el primer frame, los 4 se ven en el mapa.

## Lo que **no** entra en este spec

- Salida escalonada con temporizador.
- Cambios de overlay/CSS en la pantalla de inicio.
- Modo frightened, velocidades propias, colisión fantasma-fantasma.
- Vuelta dirigida a la pen tras colisión.

Cada uno de esos, si llega, va en su propio spec.