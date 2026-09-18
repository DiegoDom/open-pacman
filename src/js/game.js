// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Punto de salida de la pen: centro de la celda justo encima de la puerta.
const DOOR_EXIT = { x: 13.5, y: 11 };

// Frames entre la salida de cada fantasma (~1 s a 60 fps).
const GHOST_RELEASE_INTERVAL = 60;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    ticks: 0,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      leaving: false,
      releaseTicks: i * GHOST_RELEASE_INTERVAL,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function manhattan( ax, ay, bx, by ) {
  return Math.abs( ax - bx ) + Math.abs( ay - by );
}

// Elige la direccion de `choices` que minimiza la distancia Manhattan al target.
function pickToward( choices, g, tx, ty ) {
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = manhattan( g.x + d.x, g.y + d.y, tx, ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

// Elige la direccion de `choices` que maximiza la distancia Manhattan al target.
function pickAway( choices, g, tx, ty ) {
  let best = choices[ 0 ];
  let bestDist = -Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = manhattan( g.x + d.x, g.y + d.y, tx, ty );
    if ( dist > bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  if ( g.leaving ) {
    if ( Math.round( g.y ) <= 11 ) {
      g.leaving = false;
    } else {
      g.dir = pickToward( choices, g, DOOR_EXIT.x, DOOR_EXIT.y );
      return;
    }
  }

  if ( g.kind === 'ambusher' ) {
    // Apunta 2 celdas en la direccion actual de Pac-Man.
    const d = DIRS[ p.dir ];
    const tx = Math.round( p.x ) + d.x * 2;
    const ty = Math.round( p.y ) + d.y * 2;
    g.dir = pickToward( choices, g, tx, ty );
  } else if ( g.kind === 'shy' ) {
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    // Lejos (>8) vaga al azar; cerca huye maximizando la distancia.
    if ( manhattan( Math.round( g.x ), Math.round( g.y ), px, py ) > 8 ) {
      g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    } else {
      g.dir = pickAway( choices, g, px, py );
    }
  } else if ( g.kind === 'clever' ) {
    // Objetivo: punto 2 celdas delante de Pac-Man con el vector desde el
    // hunter duplicado (hunter + 2 * (PacManDelante - hunter)).
    const d = DIRS[ p.dir ];
    const aheadX = Math.round( p.x ) + d.x * 2;
    const aheadY = Math.round( p.y ) + d.y * 2;
    const hunter = game.ghosts.find( ( gh ) => gh.kind === 'hunter' );
    const tx = Math.round( hunter.x ) + 2 * ( aheadX - Math.round( hunter.x ) );
    const ty = Math.round( hunter.y ) + 2 * ( aheadY - Math.round( hunter.y ) );
    g.dir = pickToward( choices, g, tx, ty );
  } else {
    // hunter
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    g.dir = pickToward( choices, g, px, py );
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Congelado en su celda hasta que toca salir de la pen.
  if ( !g.leaving ) {
    if ( game.ticks >= g.releaseTicks ) g.leaving = true;
    else return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ticks = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.leaving = false;
    g.releaseTicks = i * GHOST_RELEASE_INTERVAL;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.ticks++;
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
