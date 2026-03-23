const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const leftScoreEl = document.getElementById('leftScore');
const rightScoreEl = document.getElementById('rightScore');
const overlay = document.getElementById('overlay');
const toggleButton = document.getElementById('toggleButton');
const resetButton = document.getElementById('resetButton');

const paddle = {
  width: 16,
  height: 96,
  speed: 420,
  margin: 28,
};

const ballTemplate = {
  size: 14,
  speed: 360,
};

const state = {
  leftScore: 0,
  rightScore: 0,
  paused: false,
  keys: new Set(),
  lastTime: 0,
  leftPaddle: {
    x: paddle.margin,
    y: canvas.height / 2 - paddle.height / 2,
  },
  rightPaddle: {
    x: canvas.width - paddle.margin - paddle.width,
    y: canvas.height / 2 - paddle.height / 2,
  },
  ball: { ...ballTemplate, x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0 },
};

function setOverlay(message = '', visible = false) {
  overlay.textContent = message;
  overlay.classList.toggle('visible', visible);
}

function serveBall(direction = Math.random() > 0.5 ? 1 : -1) {
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  state.ball.x = canvas.width / 2;
  state.ball.y = canvas.height / 2;
  state.ball.vx = Math.cos(angle) * ballTemplate.speed * direction;
  state.ball.vy = Math.sin(angle) * ballTemplate.speed;
}

function resetGame() {
  state.leftScore = 0;
  state.rightScore = 0;
  state.leftPaddle.y = canvas.height / 2 - paddle.height / 2;
  state.rightPaddle.y = canvas.height / 2 - paddle.height / 2;
  updateScore();
  serveBall();
  if (state.paused) {
    setOverlay('Game paused', true);
  }
}

function updateScore() {
  leftScoreEl.textContent = state.leftScore;
  rightScoreEl.textContent = state.rightScore;
}

function clampPaddle(y) {
  return Math.max(0, Math.min(canvas.height - paddle.height, y));
}

function updatePaddles(delta) {
  if (state.keys.has('w')) {
    state.leftPaddle.y -= paddle.speed * delta;
  }
  if (state.keys.has('s')) {
    state.leftPaddle.y += paddle.speed * delta;
  }
  if (state.keys.has('ArrowUp')) {
    state.rightPaddle.y -= paddle.speed * delta;
  }
  if (state.keys.has('ArrowDown')) {
    state.rightPaddle.y += paddle.speed * delta;
  }

  state.leftPaddle.y = clampPaddle(state.leftPaddle.y);
  state.rightPaddle.y = clampPaddle(state.rightPaddle.y);
}

function bounceOffPaddle(paddleState, direction) {
  const relativeIntersectY =
    state.ball.y - (paddleState.y + paddle.height / 2);
  const normalized = relativeIntersectY / (paddle.height / 2);
  const bounceAngle = normalized * (Math.PI / 3);
  const currentSpeed = Math.min(
    Math.hypot(state.ball.vx, state.ball.vy) + 24,
    760,
  );

  state.ball.vx = Math.cos(bounceAngle) * currentSpeed * direction;
  state.ball.vy = Math.sin(bounceAngle) * currentSpeed;
  state.ball.x =
    direction === 1
      ? paddleState.x + paddle.width + state.ball.size / 2
      : paddleState.x - state.ball.size / 2;
}

function updateBall(delta) {
  state.ball.x += state.ball.vx * delta;
  state.ball.y += state.ball.vy * delta;

  if (state.ball.y - state.ball.size / 2 <= 0 || state.ball.y + state.ball.size / 2 >= canvas.height) {
    state.ball.vy *= -1;
    state.ball.y = Math.max(
      state.ball.size / 2,
      Math.min(canvas.height - state.ball.size / 2, state.ball.y),
    );
  }

  const leftCollision =
    state.ball.x - state.ball.size / 2 <= state.leftPaddle.x + paddle.width &&
    state.ball.y + state.ball.size / 2 >= state.leftPaddle.y &&
    state.ball.y - state.ball.size / 2 <= state.leftPaddle.y + paddle.height &&
    state.ball.vx < 0;

  const rightCollision =
    state.ball.x + state.ball.size / 2 >= state.rightPaddle.x &&
    state.ball.y + state.ball.size / 2 >= state.rightPaddle.y &&
    state.ball.y - state.ball.size / 2 <= state.rightPaddle.y + paddle.height &&
    state.ball.vx > 0;

  if (leftCollision) {
    bounceOffPaddle(state.leftPaddle, 1);
  } else if (rightCollision) {
    bounceOffPaddle(state.rightPaddle, -1);
  }

  if (state.ball.x < 0) {
    state.rightScore += 1;
    updateScore();
    serveBall(1);
  } else if (state.ball.x > canvas.width) {
    state.leftScore += 1;
    updateScore();
    serveBall(-1);
  }
}

function drawCourt() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e2e8f0';
  for (let y = 18; y < canvas.height; y += 34) {
    ctx.fillRect(canvas.width / 2 - 3, y, 6, 18);
  }

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(state.leftPaddle.x, state.leftPaddle.y, paddle.width, paddle.height);
  ctx.fillRect(state.rightPaddle.x, state.rightPaddle.y, paddle.width, paddle.height);

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.02);
  state.lastTime = timestamp;

  if (!state.paused) {
    updatePaddles(delta);
    updateBall(delta);
  }

  drawCourt();
  requestAnimationFrame(loop);
}

function togglePause(forceValue) {
  state.paused = typeof forceValue === 'boolean' ? forceValue : !state.paused;
  toggleButton.textContent = state.paused ? 'Resume' : 'Pause';
  setOverlay(state.paused ? 'Game paused' : '', state.paused);
}

window.addEventListener('keydown', (event) => {
  if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    state.keys.add(event.key);
  }

  if (event.key === ' ') {
    event.preventDefault();
    togglePause();
  }
});

window.addEventListener('keyup', (event) => {
  state.keys.delete(event.key);
});

toggleButton.addEventListener('click', () => {
  togglePause();
});

resetButton.addEventListener('click', () => {
  resetGame();
  togglePause(false);
});

updateScore();
serveBall();
requestAnimationFrame(loop);
