const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const paddle = {
    width: 100,
    height: 15, // Increased from 10 to 15
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,
    speed: 2, // Reduced paddle speed from 3 to 2
    dx: 0
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    radius: 8,
    speed: 4,
    dx: 4,
    dy: -4
};

const ballSpeed = 1; // Reduced ball speed for slower gameplay

let bricks = [];
let rows = 4;
let cols = 8;
let brickWidth = 75;
let brickHeight = 20;
let brickPadding = 10;
let brickOffsetTop = 30;
let brickOffsetLeft = 35;
let level = 1;
let infiniteMode = false;
let wave = 0;
let powerUps = [];
let score = 0;

let infiniteModeActive = false; // Track if infinite mode is active
let infiniteBrickTimer = 0; // Timer for spawning bricks in infinite mode

let lives = 3;
let startTime;
let elapsedTime = 0;

let gameActive = false; // Track if the game is active
let ballOnPaddle = true; // Track if the ball is on the paddle

const powerUpTypes = ['expandPaddle', 'extraBall', 'extraLife']; // Updated power-up types

const powerUpColors = {
    expandPaddle: '#FFD700', // Gold
    extraBall: '#0000FF', // Blue (changed from green)
    extraLife: '#FF0000', // Red
};

let balls = [ball]; // Array to track multiple balls
let paddleOriginalWidth = paddle.width; // Store the original paddle width
let paddleExpandTimer = 0; // Timer for the expand paddle effect

const backgrounds = {
    level_1: 'backgrounds/level_1.png',
    level_2: 'backgrounds/level_2.png',
    level_3: 'backgrounds/level_3.png',
    level_4: 'backgrounds/level_4.png',
    level_5: 'backgrounds/level_5.png',
    level_6: 'backgrounds/level_6.png',
    level_7: 'backgrounds/level_7.png',
    level_8: 'backgrounds/level_8.png',
    level_9: 'backgrounds/level_9.png',
    level_10: 'backgrounds/level_10.png',
    infinite: 'backgrounds/infinite.png',
};

let currentBackground = new Image();

// Function to set the background based on the level or mode
function setBackground(level) {
    const key = infiniteModeActive ? 'infinite' : `level_${level}`;
    currentBackground.src = backgrounds[key] || '';
}

// Function to draw the background
function drawBackground() {
    if (currentBackground.complete) {
        ctx.drawImage(currentBackground, 0, 0, canvas.width, canvas.height);
    }
}

// Function to spawn power-ups
function spawnPowerUp(x, y) {
    if (Math.random() < 1 / 8) {
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({ x, y, type, active: true });
    }
}

// Function to draw power-ups with glowing pulsating effect
function drawPowerUps() {
    const time = Date.now() / 500; // Used for pulsating effect
    powerUps.forEach((powerUp) => {
        if (powerUp.active) {
            const scale = 1 + 0.1 * Math.sin(time); // Scale factor for pulsating
            ctx.save();
            ctx.translate(powerUp.x, powerUp.y);
            ctx.scale(scale, scale);
            ctx.translate(-powerUp.x, -powerUp.y);
            ctx.shadowBlur = 20;
            ctx.shadowColor = powerUpColors[powerUp.type] || '#FFFFFF'; // Glow color matches power-up color
            ctx.fillStyle = powerUpColors[powerUp.type] || '#FFFFFF'; // Default to white if type is unknown
            ctx.beginPath();
            ctx.arc(powerUp.x, powerUp.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
    });
}

// Function to handle power-up effects
function applyPowerUp(powerUp, triggeringBall) {
    if (powerUp.type === 'expandPaddle') {
        if (paddle.width < paddleOriginalWidth * 1.5) {
            paddle.width = Math.min(paddle.width + 30, paddleOriginalWidth * 1.5); // Expand by 30px, max 1.5x original width
            paddleExpandTimer = 10000; // Set timer for 10 seconds
        }
    } else if (powerUp.type === 'extraBall') {
        balls.push({
            x: triggeringBall.x,
            y: triggeringBall.y,
            radius: triggeringBall.radius,
            speed: triggeringBall.speed,
            dx: -triggeringBall.dx,
            dy: -triggeringBall.dy,
        }); // Add a new ball with opposite direction
    } else if (powerUp.type === 'extraLife') {
        if (lives < 3) {
            lives++; // Grant an extra life if lives are below 3
        }
    }
}

// Update power-ups
function updatePowerUps() {
    powerUps.forEach((powerUp) => {
        powerUp.y += 2; // Move power-up down
        if (
            powerUp.y > paddle.y &&
            powerUp.x > paddle.x &&
            powerUp.x < paddle.x + paddle.width
        ) {
            applyPowerUp(powerUp, balls[0]); // Apply power-up to the first ball
            powerUp.active = false;
        }
        if (powerUp.y > canvas.height) {
            powerUp.active = false;
        }
    });
    powerUps = powerUps.filter((powerUp) => powerUp.active);
}

// Update paddle size (reset after expand effect ends)
function updatePaddleSize(deltaTime) {
    if (paddleExpandTimer > 0) {
        paddleExpandTimer -= deltaTime;
        if (paddleExpandTimer <= 0) {
            paddle.width = paddleOriginalWidth; // Reset paddle width
        }
    }
}

function createBricks() {
    bricks = [];
    for (let r = 0; r < rows; r++) {
        bricks[r] = [];
        for (let c = 0; c < cols; c++) {
            let hp = 1; // Default HP for bricks
            if (level === 1) {
                hp = 2; // All bricks have 2 HP on level 1
            } else if (level >= 5 && Math.random() < 1 / 7) {
                hp = 2; // 1 in 7 chance for bricks with 2 HP from level 5 and up
            } else if (level >= 4 && Math.random() < 1 / 6) {
                hp = 2; // 1 in 6 chance for bricks with 2 HP on levels 4 and above (except level 1)
            }
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            bricks[r][c] = { x: brickX, y: brickY, hp }; // Initialize brick with position and HP
        }
    }
}

const brickSprite = new Image();
brickSprite.src = 'sprites/block_2_orange.png'; // Load the regular brick sprite

const brickStrongSprite = new Image();
brickStrongSprite.src = 'sprites/block_2_red_outline.png'; // Load the sprite for bricks with more than 1 HP

function drawBricks() {
    const time = Date.now() / 500; // Used for pulsating effect
    bricks.forEach((row) => {
        row.forEach((brick) => {
            if (brick.hp > 0) {
                if (brick.hp === 2) {
                    // Bricks with 2 HP use the strong brick sprite
                    if (brickStrongSprite.complete) {
                        ctx.drawImage(brickStrongSprite, brick.x, brick.y, brickWidth, brickHeight);
                    } else {
                        // Fallback to pulsating effect if the sprite is not loaded
                        const scale = 1 + 0.1 * Math.sin(time); // Scale factor for pulsating
                        ctx.save();
                        ctx.translate(brick.x + brickWidth / 2, brick.y + brickHeight / 2);
                        ctx.scale(scale, scale);
                        ctx.translate(-(brick.x + brickWidth / 2), -(brick.y + brickHeight / 2));
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = 'red';
                        ctx.fillStyle = 'red'; // 2 HP bricks are red
                        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
                        ctx.restore();
                    }
                } else {
                    // Regular bricks with sprite
                    if (brickSprite.complete) {
                        ctx.drawImage(brickSprite, brick.x, brick.y, brickWidth, brickHeight);
                    } else {
                        // Fallback to drawing a rectangle if the sprite is not loaded
                        ctx.shadowBlur = 0;
                        ctx.fillStyle = '#0095DD'; // Regular bricks are blue
                        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
                    }
                }
            }
        });
    });
    // Reset shadow settings after drawing
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

// Update paddle movement
function movePaddle() {
    paddle.x += paddle.dx;

    // Prevent paddle from going out of bounds
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }

    // Move the ball with the paddle if it's on the paddle
    if (ballOnPaddle) {
        ball.x = paddle.x + paddle.width / 2;
    }
}

// Draw paddle
const paddleSprite = new Image();
paddleSprite.src = 'sprites/paddle_sprite.png'; // Load the paddle sprite

// Update the drawPaddle function to use the sprite
function drawPaddle() {
    if (paddleSprite.complete) {
        ctx.drawImage(paddleSprite, paddle.x, paddle.y, paddle.width, paddle.height);
    } else {
        // Fallback to drawing a rectangle if the sprite is not loaded
        ctx.fillStyle = '#0095DD';
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    }
}

const ballSprite = new Image();
ballSprite.src = 'sprites/ball_sprite.png'; // Load the ball sprite

// Update the drawBall function to use the sprite
function drawBall(b) {
    if (ballSprite.complete) {
        ctx.drawImage(ballSprite, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
    } else {
        // Fallback to drawing a circle if the sprite is not loaded
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FF5733';
        ctx.fill();
        ctx.closePath();
    }
}

const wallHitSound = new Audio('sounds/sfx_wallhit/sfx_wallhit.mp3'); // Load the wall hit sound
const brickHitSound = new Audio('sounds/sfx_brickhit/sfx_brickhit.mp3'); // Load the brick hit sound
const brickBreakSound = new Audio('sounds/sfx_brick_break/sfx_brick_break.mp3'); // Load the brick break sound
const paddleHitSound = new Audio('sounds/sfx_bathit/sfx_bathit.mp3'); // Load the paddle hit sound
const ballSpawnSound = new Audio('sounds/sfx_ball_spawn/sfx_ball_spawn.mp3'); // Load the ball spawn sound

const backgroundMusic = new Audio('sounds/Music_Ingame/Music_Ingame.mp3'); // Load the background music
backgroundMusic.loop = true; // Enable looping for the music
let musicEnabled = true; // Track if the music is enabled

function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
        backgroundMusic.play();
    } else {
        backgroundMusic.pause();
    }
}

// Move all balls
function moveBalls() {
    balls.forEach((b, index) => {
        b.x += b.dx;
        b.y += b.dy;

        // Wall collision (left/right)
        if (b.x + b.radius > canvas.width || b.x - b.radius < 0) {
            b.dx *= -1;
            wallHitSound.play(); // Play the sound when the ball hits the left or right wall
        }

        // Wall collision (top)
        if (b.y - b.radius < 0) {
            b.dy *= -1;
            wallHitSound.play(); // Play the sound when the ball hits the top wall
        }

        // Paddle collision
        if (
            b.y + b.radius > paddle.y &&
            b.x > paddle.x &&
            b.x < paddle.x + paddle.width
        ) {
            b.dy *= -1; // Reverse ball direction
            b.y = paddle.y - b.radius; // Adjust ball position
            paddleHitSound.play(); // Play the sound when the ball hits the paddle
        }

        // Ball falls below the paddle
        if (b.y - b.radius > canvas.height) {
            balls.splice(index, 1); // Remove the ball
            if (balls.length === 0) {
                lives--;
                resetBallOnPaddle();
            }
        }
    });
}

// Reset ball position
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    ball.dx = ballSpeed * (Math.random() > 0.5 ? 1 : -1); // Use consistent speed
    ball.dy = -ballSpeed;
    ballSpawnSound.play(); // Play the sound when the ball spawns
}

// Draw lives and score
function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText(`Lives: ${lives}`, 10, 20);
    ctx.fillText(`Score: ${score}`, canvas.width - 100, 20);
    // Removed interval counter for infinite mode
}

// Ball and brick collision
function handleBrickCollision() {
    balls.forEach((b) => {
        bricks.forEach((row) => {
            row.forEach((brick) => {
                if (brick.hp > 0) {
                    if (
                        b.x > brick.x &&
                        b.x < brick.x + brickWidth &&
                        b.y - b.radius < brick.y + brickHeight &&
                        b.y + b.radius > brick.y
                    ) {
                        b.dy *= -1; // Reverse ball direction
                        brick.hp--; // Reduce brick HP
                        score += 10; // Increase score

                        if (brick.hp === 0) {
                            brickBreakSound.play(); // Play the sound when the brick breaks
                            spawnPowerUp(brick.x + brickWidth / 2, brick.y + brickHeight / 2);
                        } else {
                            brickHitSound.play(); // Play the sound when the brick is hit but not broken
                        }
                    }
                }
            });
        });
    });
}

// Check for win condition
function checkWin() {
    const allBricksBroken = bricks.every((row) => row.every((brick) => brick.hp === 0));
    if (allBricksBroken) {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        showWinScreen();
    }
}

// Check for lose condition
function checkLose() {
    if (lives <= 0) {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        showLoseScreen();
    }
}

// Stop the game
function stopGame() {
    gameActive = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
}

// Reset the canvas and game state
function resetCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    lives = 3;
    score = 0;
    elapsedTime = 0;
    gameActive = false;
}

function resetGame() {
    // Reset all game variables to their initial state
    lives = 3;
    score = 0;
    elapsedTime = 0;
    level = 1;
    infiniteModeActive = false;
    bonusRoundActive = false;
    gameActive = false;
    resetCanvas();
    resetBallOnPaddle();
    createBricks();
    setBackground(level); // Reset background to the first level
}

// Show win screen
function showWinScreen() {
    stopGame(); // Stop the game and timer
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Time: ${elapsedTime}s`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Press N for Next Level or L for Level Select', canvas.width / 2, canvas.height / 2 + 80);

    document.addEventListener('keydown', handleWinScreenInput);
}

// Show lose screen (updated for infinite mode)
function showLoseScreen() {
    stopGame(); // Stop the game and timer
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Lose!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press R to Restart or L for Level Select', canvas.width / 2, canvas.height / 2 + 40);

    document.addEventListener('keydown', handleLoseScreenInput);
}

// Handle input on win screen
function handleWinScreenInput(e) {
    if (e.key === 'n') {
        document.removeEventListener('keydown', handleWinScreenInput);
        resetGame(); // Reset the game
        level++;
        startLevel(level);
    } else if (e.key === 'l') {
        document.removeEventListener('keydown', handleWinScreenInput);
        resetGame(); // Reset the game
        showLevelMenu();
    }
}

// Handle input on lose screen
function handleLoseScreenInput(e) {
    if (e.key === 'r') {
        document.removeEventListener('keydown', handleLoseScreenInput);
        resetGame(); // Reset the game
        startLevel(level);
    } else if (e.key === 'l') {
        document.removeEventListener('keydown', handleLoseScreenInput);
        resetGame(); // Reset the game
        showLevelMenu();
    }
}

// Reset ball position on paddle
function resetBallOnPaddle() {
    balls = [ball]; // Reset to a single ball
    ballOnPaddle = true;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
    ball.dx = 0;
    ball.dy = 0;
    ballSpawnSound.play(); // Play the sound when the ball spawns on the paddle
}

// Start ball movement
function launchBall() {
    ballOnPaddle = false;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
}

// Update function
function update(deltaTime) {
    if (!gameActive) return; // Stop updating if the game is not active

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(); // Draw the background
    drawBricks(); // Ensure bricks are drawn before HUD
    movePaddle();
    moveBalls();
    handleBrickCollision();
    if (!infiniteModeActive) checkWin();
    checkLose();

    drawPaddle();
    balls.forEach(drawBall);
    drawPowerUps();
    updatePowerUps();
    updatePaddleSize(deltaTime);
    if (infiniteModeActive) updateInfiniteMode(deltaTime);
    drawHUD();

    requestAnimationFrame((timestamp) => update(timestamp - deltaTime));
}

// Paddle controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
        paddle.dx = paddle.speed;
    } else if (e.key === 'ArrowLeft') {
        paddle.dx = -paddle.speed;
    } else if (e.key === ' ' && ballOnPaddle) {
        launchBall();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        paddle.dx = 0;
    }
});

// Start game
function startGame() {
    resetGame(); // Reset the game state
    startTime = Date.now();
    resetBallOnPaddle();
    createBricks();
    setBackground(selectedLevel); // Set background for the level
    gameActive = true;
    requestAnimationFrame((timestamp) => update(0)); // Start the game loop
}

// Menu navigation and level selection
const menu = document.getElementById('menu');
const levelMenu = document.getElementById('levelMenu');
const gameCanvas = document.getElementById('gameCanvas');
const startGameButton = document.getElementById('startGame');
const levelSelectButton = document.getElementById('levelSelect');
const backToMenuButton = document.getElementById('backToMenu');
const levelsContainer = document.getElementById('levels');

let selectedLevel = 1;

// Show menu
function showMenu() {
    menu.classList.remove('hidden');
    levelMenu.classList.add('hidden');
    gameCanvas.classList.add('hidden');
}

// Show level select screen
function showLevelMenu() {
    resetCanvas();
    menu.classList.add('hidden');
    levelMenu.classList.remove('hidden');
    levelsContainer.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const levelButton = document.createElement('button');
        levelButton.textContent = `Level ${i}`;
        levelButton.addEventListener('click', () => startLevel(i));
        levelsContainer.appendChild(levelButton);
    }
    const infiniteModeButton = document.createElement('button');
    infiniteModeButton.textContent = 'Infinite Mode';
    infiniteModeButton.addEventListener('click', startInfiniteMode);
    levelsContainer.appendChild(infiniteModeButton);
}

// Start a specific level
function startLevel(level) {
    resetCanvas();
    selectedLevel = level;
    startTime = Date.now();
    resetBallOnPaddle();
    levelMenu.classList.add('hidden');
    gameCanvas.classList.remove('hidden');
    level = selectedLevel;
    rows = level <= 3 ? 4 : 5 + (level - 3); // Adjust rows based on level
    createBricks();
    setBackground(level); // Set background for the level
    gameActive = true;
    update(0);
}

// Load the button click sound
const buttonClickSound = new Audio('sounds/sfx_button_click/sfx_button_click.mp3'); // Load the button click sound

// Add sound effect to button click events
startGameButton.addEventListener('click', () => {
    buttonClickSound.play(); // Play the sound
    resetGame(); // Reset the game
    menu.classList.add('hidden');
    gameCanvas.classList.remove('hidden');
    startGame();
});

levelSelectButton.addEventListener('click', () => {
    buttonClickSound.play(); // Play the sound
    resetGame(); // Reset the game
    showLevelMenu();
});

backToMenuButton.addEventListener('click', () => {
    buttonClickSound.play(); // Play the sound
    resetGame(); // Reset the game
    showMenu();
});

// Event listeners for menu buttons
startGameButton.addEventListener('click', () => {
    resetCanvas();
    menu.classList.add('hidden');
    gameCanvas.classList.remove('hidden');
    startGame();
});

levelSelectButton.addEventListener('click', () => {
    resetCanvas();
    showLevelMenu();
});

backToMenuButton.addEventListener('click', () => {
    resetCanvas();
    showMenu();
});

// Initialize game with menu
showMenu();

startGame();

let maxBricksOnScreen = 20; // Limit the number of bricks on the screen in infinite mode

function createInfiniteBrick() {
    if (bricks.flat().length < maxBricksOnScreen) { // Only add bricks if below the limit
        const brickX = Math.random() * (canvas.width - brickWidth);
        const brickY = -brickHeight; // Start above the canvas
        const hp = Math.random() < 0.2 ? 2 : 1; // 20% chance for 2 HP bricks
        bricks.push([{ x: brickX, y: brickY, hp }]); // Add a new brick row
    }
}

function startInfiniteMode() {
    resetGame();
    infiniteModeActive = true;
    lives = 3; // Ensure the player has 3 lives in infinite mode
    drawBackground(); // Draw the background before the game starts
    drawHUD(); // Draw the HUD before the game starts
    gameActive = true;
    requestAnimationFrame((timestamp) => update(0));
}

function updateInfiniteMode(deltaTime) {
    if (infiniteModeActive) {
        infiniteBrickTimer += deltaTime;
        if (infiniteBrickTimer > 3000) { // Spawn a new brick every 3 seconds
            createInfiniteBrick();
            infiniteBrickTimer = 0;
        }
        bricks.forEach((row) => {
            row.forEach((brick) => {
                brick.y += 1; // Move bricks down
                if (brick.y > canvas.height) {
                    brick.hp = 0; // Remove bricks that fall off the screen
                }
            });
        });
        bricks = bricks.filter(row => row.some(brick => brick.hp > 0)); // Remove empty rows
    }
}
