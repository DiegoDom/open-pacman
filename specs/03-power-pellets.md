# SPEC 03 — Power pellets y fantasmas comestibles

> **Estado:** Approved **Depende de:** SPEC 01, SPEC 02 **Fecha:** 2026-09-18 **Objetivo:** Añadir 4 power pellets en las esquinas del laberinto que, al comerlos, hacen a los fantasmas vulnerables durante \~6 s para que Pac-Man pueda comérselos.

## Alcance

**Incluye:**

- 4 power pellets en las celdas-esquina que hoy ya tienen dot: `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)`. Nuevo código de tile `4`.
- Al comer un pellet: `+50` puntos y los 4 fantasmas entran en modo vulnerable durante `POWER_FRAMES` (360, \~6 s a 60 fps).
- Comer otro pellet con poder activo reinicia el temporizador a 360 y resetea la racha de puntos.
- Fantasmas vulnerables: se mueven a la mitad de velocidad (`GHOST_SPEED / 2`), huyen de Pac-Man (`pickAway`), ignoran su `kind` y se dibujan azules con parpadeo en el último segundo.
- Colisión con fantasma vulnerable: en vez de perder vida, Pac-Man se lo come. Puntuación clásica escalada `200/400/800/1600` por racha (se reinicia al comer un pellet o al terminar el poder).
- Fantasma comido: se teletransporta a su celda de origen en la pen, queda congelado y vuelve a salir por la puerta \~1 s después reusando la escalera de `releaseTicks` de SPEC 02.
- `win` cuenta dots (tile 2) + pellets (tile 4); el juego sigue siendo ganable.
- Perder una vida cancela el poder (véase `resetPositions`).

**Fuera de alcance (futuros specs):**

- Modo «ojos» clásico: recorrer el laberinto hasta la pen tras ser comido.
- Reversión de dirección de los fantasmas al activarse el poder.
- Velocidades/conductas propias por fantasma, dificultad progresiva.
- Indicador de poder en el HUD.

## Data model

```js
// maze.js — parseTile('O') => 4; las 4 esquinas hoy con '.' pasan a 'O'.
const MAZE_STR = [
  '#O..........##..........O#', // fila 1, pellets en (1,1) y (26,1)
  // ...
  '#O........................O#', // fila 29, pellets en (1,29) y (26,29)
];

// game.js — estado nuevo y constantes
const POWER_FRAMES = 360;        // ~6 s a 60 fps
const GHOST_POINTS = [200, 400, 800, 1600];
game.power = { active: false, framesLeft: 0, chain: 0 };

// game.js — cada fantasma guarda su celda de origen (se teletransporta ahí al ser comido)
{ x, y, dir, speed, kind, leaving, releaseTicks, home: { x, y } }
```

Convenciones que se mantienen: vulnerabilidad **global** (`game.power.active`), no por fantasma; el fugitivo reusa `pickAway`/`choices` de `decideGhost`; `leaving` sigue teniendo prioridad sobre `kind`.

## Implementation plan

1. `maze.js` + `game.js` + `render.js`: tile `4` en las esquinas; `createGame` cuenta `2` y `4` en `dotsRemaining`; `movePacman` come el tile `4` (grid→0, `+50`, `dots--`); `render.js` dibuja el pellet más grande. El juego sigue corriendo, ganable y con pellets visibles; aún sin poder.
2. `game.js`: `movePacman` activa `game.power` (framesLeft=360, chain=0); `update` decrementa `framesLeft` y apaga `active` a 0; `moveGhost` usa `speed = active ? GHOST_SPEED / 2 : GHOST_SPEED` y `decideGhost` desvía a `pickAway` mientras `active`. Prueba: comer un pellet → los 4 huyen, vuelven a la normalidad a los \~6 s.
3. `game.js`: colisión — si `active` → comer (suma `GHOST_POINTS[min(chain,3)]`, `chain++`, teletransporte a `home`, `leaving=false`, `releaseTicks = game.ticks + GHOST_RELEASE_INTERVAL`); si no → vida perdida como hoy. `resetPositions` resetea `game.power`. Prueba: comer 4 fantasmas seguidos → 200/400/800/1600; el comido re-sale por la puerta.
4. `render.js`: `drawGhost` con parámetro de poder — cuerpo azul, parpadeo azul/blanco en el último segundo (`framesLeft < 60`, alternando cada \~8 frames).

Cada paso deja el juego funcional y commiteable.

## Acceptance criteria

- [ ] `src/index.html` se abre sin errores en consola.

- [ ] Se ven 4 pellets grandes en `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)`, más grandes que un dot normal.

- [ ] Comer un pellet suma exactamente 50 puntos y vuelve azules a los 4 fantasmas durante \~6 s.

- [ ] Comer otro pellet con poder activo reinicia los \~6 s y resetea la racha de puntos.

- [ ] Los fantasmas vulnerables van a media velocidad (0.05) y huyen de Pac-Man; al agotarse el tiempo recuperan color, velocidad y su `kind`.

- [ ] En el último segundo de poder, los fantasmas parpadean azul/blanco.

- [ ] Tocar un fantasma vulnerable se lo come (no pierde vida) y suma 200, 400, 800 y 1600 pts por racha consecutiva.

- [ ] El fantasma comido reaparece congelado en su celda de la pen y vuelve a salir por la puerta \~1 s después.

- [ ] Comerse todos los dots y pellets sigue mostrando «GANASTE».

- [ ] Perder una vida cancela el poder y rearma la salida escalonada de la pen.

## Decisions

- **Sí:** pellets en las 4 celdas-esquina que ya tienen dot. Es el clásico y evita tocar la geometría del laberinto.
- **Sí:** temporizador de 360 frames, reiniciable con cada pellet. Clásico y trivial con `game.ticks` (misma métrica que el release).
- **Sí:** vulnerabilidad global (`game.power.active`). Sin flags por fantasma.
- **Sí:** fantasma comido → teleport a `home` + congelado + re-salida con la escalera de SPEC 02 (`releaseTicks`). Es la vía que menos mecánica nueva añade.
- **No:** modo «ojos» recorriendo el laberinto. Bonito pero añade un modo de movimiento entero; va a su propio spec.
- **Sí:** huida con `pickAway` reusando el helper existente. Sin aleatoriedad nueva.
- **Sí:** media velocidad (0.05) durante el poder; sigue en la familia sub-celda/frame que `aligned()` ya sabe encajar.
- **Sí:** puntuación 200/400/800/1600 con racha por pellet. Clásica, con un solo contador `chain`.
- **No:** reversión de dirección al activar el poder. Simplifica `decideGhost`.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Timing en frames se desvía si el tab baja de 60 fps | Misma convención que `GHOST_RELEASE_INTERVAL` en SPEC 02; aceptado como consistente. |
| Fantasma re-salido en pleno poder vuelve azul | Comportamiento arcade aceptable; se documenta aquí para que no parezca un bug. |

## Lo que **no** entra en este spec

- Modo «ojos»/recorrido hasta la pen tras ser comido.
- Reversión de dirección al activar el poder.
- Velocidades/dificultad progresiva por fantasma.
- Indicador de poder en el HUD.

Cada uno de esos, si llega, va en su propio spec.