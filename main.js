const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

let gameStarted = false;
let gamePaused = false;
let board;
let activePiece;
let nextPiece;
let score;
let level;
let lines;
let dropCounter;
let dropInterval;
let lastTime;
let running;
let paused;
let gameOver;
let animationId;

function initGame(animationId, rows, cols, types, shapes) {
  board = createBoard(rows, cols);
  score = 0;
  level = 1;
  lines = 0;
  dropCounter = 0;
  dropInterval = 900;
  lastTime = 0;
  running = true;
  paused = false;
  gameOver = false;
  activePiece = getRandomShape(types, shapes, cols);
  nextPiece = getRandomShape(types, shapes, cols);
  hideOverlay();
  updateStats();
  drawNext();

  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running) return;

  const delta = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      softDrop();
    }
  }

  draw();
  animationId = requestAnimationFrame(update);
}

function collide(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix, cols, rows, board) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;

      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;

      if (newX < 0 || newX >= cols || newY >= rows) return true;
      if (newY >= 0 && board[newY][newX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  activePiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = activePiece.y + y;
        const boardX = activePiece.x + x;
        if (boardY >= 0) board[boardY][boardX] = activePiece.type;
      }
    });
  });
}

function spawnPiece() {
  activePiece = nextPiece;
  activePiece.x =
    Math.floor(COLS / 2) - Math.ceil(activePiece.matrix[0].length / 2);
  activePiece.y = getStartY(activePiece.type, SHAPES);
  nextPiece = getRandomShape(TYPES, SHAPES, COLS);
  drawNext();

  if (collide(activePiece, 0, 0, activePiece.matrix, COLS, ROWS, board)) {
    endGame();
  }
}

function softDrop() {
  if (!activePiece) return;

  activePiece.y++;
  if (collide(activePiece, 0, 0, activePiece.matrix, COLS, ROWS, board)) {
    activePiece.y--;
    mergePiece();
    clearLines();
    spawnPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (!activePiece || paused || gameOver) return;

  let distance = 0;
  while (!collide(activePiece, 0, 1, activePiece.matrix, COLS, ROWS, board)) {
    activePiece.y++;
    distance++;
  }

  score += distance * 2;
  mergePiece();
  clearLines();
  spawnPiece();
  updateStats();
  dropCounter = 0;
}

function movePiece(direction) {
  if (!activePiece || paused || gameOver) return;

  activePiece.x += direction;
  if (collide(activePiece, 0, 0, activePiece.matrix, COLS, ROWS, board)) {
    activePiece.x -= direction;
  }
}

function rotateMatrix(matrix, clockwise = true) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (clockwise) {
        rotated[x][size - 1 - y] = matrix[y][x];
      } else {
        rotated[size - 1 - x][y] = matrix[y][x];
      }
    }
  }
  return rotated;
}

function rotatePiece(clockwise = true) {
  if (!activePiece || paused || gameOver) return;

  const rotated = rotateMatrix(activePiece.matrix, clockwise);
  const originalX = activePiece.x;
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    activePiece.x = originalX + kick;
    if (!collide(activePiece, 0, 0, rotated, COLS, ROWS, board)) {
      activePiece.matrix = rotated;
      return;
    }
  }

  activePiece.x = originalX;
}

function clearLines() {
  let cleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }

    board.splice(y, 1);
    board.unshift(Array(COLS).fill(null));
    cleared++;
    y++;
  }

  if (cleared > 0) {
    lines += cleared;
    score += LINE_POINTS[cleared] * level;
    level = Math.floor(lines / 5) + 1;
    dropInterval = Math.max(100, 900 - level * 100);
    updateStats();
  }
}

function updateStats() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  linesEl.textContent = String(lines);
}

function drawCell(context, x, y, size, color) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);

  context.fillStyle = "rgba(255, 255, 255, 0.18)";
  context.fillRect(x * size + 2, y * size + 2, size - 4, 4);

  context.strokeStyle = "rgba(15, 23, 42, 0.72)";
  context.lineWidth = 2;
  context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(canvas.width, y * BLOCK);
    ctx.stroke();
  }
}

function drawGhost() {
  if (!activePiece) return;

  const ghost = {
    ...activePiece,
    matrix: activePiece.matrix,
  };

  while (!collide(ghost, 0, 1, ghost.matrix, COLS, ROWS, board)) {
    ghost.y++;
  }

  ctx.globalAlpha = 0.23;
  ghost.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && ghost.y + y >= 0) {
        drawCell(ctx, ghost.x + x, ghost.y + y, BLOCK, COLORS[ghost.type]);
      }
    });
  });
  ctx.globalAlpha = 1;
}

function drawPiece(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.y + y >= 0) {
        drawCell(ctx, piece.x + x, piece.y + y, BLOCK, COLORS[piece.type]);
      }
    });
  });
}

function drawBoard() {
  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawCell(ctx, x, y, BLOCK, COLORS[type]);
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawBoard();
  if (!gameOver) {
    drawGhost();
    drawPiece(activePiece);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#020617";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const matrix = getNextShapePreview(nextPiece.type, SHAPES_PREVIEW).matrix;
  const offsetX = Math.floor(
    (nextCanvas.width / NEXT_BLOCK - matrix.length) / 2,
  );
  const offsetY = Math.floor(
    (nextCanvas.height / NEXT_BLOCK - matrix.length) / 2,
  );

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(
          nextCtx,
          x + offsetX,
          y + offsetY,
          NEXT_BLOCK,
          COLORS[nextPiece.type],
        );
      }
    });
  });
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add("visible");
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    showOverlay("Pauza", 'Stiskni "Pokračovat" pro pokračování.');
    // rename to "Pokračovat"
    document.getElementById("pauseBtn").textContent = "Pokračovat";
  } else {
    hideOverlay();
    document.getElementById("pauseBtn").textContent = "Pauza";
    lastTime = performance.now();
  }
}

function endGame() {
  gameOver = true;
  running = false;
  showOverlay("Game Over", "Stiskni Start pro novou hru.");
  document.getElementById("pauseBtn").style.display = "none";
  document.getElementById("startBtn").style.display = "block";
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", "arrowdown", "arrowup", " "].includes(key)) {
    event.preventDefault();
  }

  if (!running || paused || gameOver) return;

  switch (key) {
    case "arrowleft":
      movePiece(-1);
      break;
    case "arrowright":
      movePiece(1);
      break;
    case "arrowdown":
      softDrop();
      score += 1;
      updateStats();
      break;
    case "arrowup":
      rotatePiece(true);
      break;
    case " ":
      hardDrop();
      break;
  }
});

document.getElementById("startBtn").addEventListener("click", () => initGame(animationId, ROWS, COLS, TYPES, SHAPES));

// Add event listener for pause button
document.getElementById("pauseBtn").addEventListener("click", togglePause);
// Pause the game when the user focus off the window and resume when they focus back
window.addEventListener("blur", () => {
  if (running && !paused) {
    togglePause();
  }
});

document.getElementById("pauseBtn").style.display = "none";
document.getElementById("startBtn").addEventListener("click", () => {
  document.getElementById("pauseBtn").style.display = "block";
  document.getElementById("startBtn").style.display = "none";
});