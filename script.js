// Import the functions you need from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvs1S2_-8xRD8WCDE-qsCNPf8lqaZIh2Q",
  authDomain: "aishooter-24e57.firebaseapp.com",
  projectId: "aishooter-24e57",
  storageBucket: "aishooter-24e57.appspot.com",
  messagingSenderId: "329119638955",
  appId: "1:329119638955:web:94afc8a0166331ef42deee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game variables
const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart');
let gameWidth = gameContainer.clientWidth;
let gameHeight = gameContainer.clientHeight;
let playerX = gameWidth / 2 - 25;
let bullets = [];
let enemies = [];
let score = 0;
let lives = 3;
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
let isMovingLeft = false;
let isMovingRight = false;
let highestScore = 0;
let gameActive = true; // Track if the game is active
let swarmBossActive = false; // Track if a Swarm Boss is currently active

// Player speed variables
let playerSpeed = 5; // Initial player speed
const playerSpeedIncrease = 0.03; // 3% speed increase
const maxPlayerSpeed = 10; // Maximum player speed

// Tougher enemy variables
let tougherEnemyHealth = 2; // Initial health for tougher enemies
const tougherEnemyColors = ['green', 'yellow', 'orange', 'red']; // Colors for each hit
let activeTougherEnemies = 0; // Track the number of active tougher enemies
const maxTougherEnemies = 3; // Maximum number of active tougher enemies

// Boss variables
let boss = null; // Track the current boss
let bossHealth = 10; // Boss health
let bossSpeed = 2; // Initial boss speed
let bossChargeTimer = 0; // Timer before boss charges at the player

// Track enemies that pass the player
let extraEnemies = 0; // Number of extra enemies to add

// Bullet cooldown variables
let bulletCooldown = 0; // Cooldown timer
const cooldownDuration = 50; // Cooldown duration in milliseconds (e.g., 500ms = 0.5 seconds)

// Fetch the highest score from Firestore
async function fetchHighestScore() {
  const docRef = doc(db, "scores", "highestScore");

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      highestScore = docSnap.data().score;
      document.getElementById('highest-score-value').textContent = highestScore;
    } else {
      await setDoc(docRef, { score: 0 });
      console.log("Created highestScore document with default score 0.");
      highestScore = 0;
      document.getElementById('highest-score-value').textContent = highestScore;
    }
  } catch (error) {
    console.error("Error fetching or creating highest score:", error);
  }
}

fetchHighestScore();

// Keyboard controls for movement
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    isMovingLeft = true;
  } else if (e.key === 'ArrowRight') {
    isMovingRight = true;
  } else if (e.key === ' ') {
    shootBullet();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') {
    isMovingLeft = false;
  } else if (e.key === 'ArrowRight') {
    isMovingRight = false;
  }
});

// Mouse/touch controls for movement
document.addEventListener('mousemove', (e) => {
  const rect = gameContainer.getBoundingClientRect();
  playerX = e.clientX - rect.left - 25; // Adjust for player width
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;
});

document.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = gameContainer.getBoundingClientRect();
  playerX = touch.clientX - rect.left - 25; // Adjust for player width
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;
});

// Shoot on mouse click or touch
document.addEventListener('click', () => {
  shootBullet();
});

document.addEventListener('touchstart', (e) => {
  e.preventDefault();
  shootBullet();
});

function shootBullet() {
  // Check if cooldown is active
  if (bulletCooldown > 0) return;

  // Create a new bullet
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  const bulletX = playerX + player.offsetWidth / 2 - 5;
  bullet.style.left = `${bulletX}px`;
  bullet.style.bottom = '70px';
  gameContainer.appendChild(bullet);
  bullets.push(bullet);

  // Reset cooldown
  bulletCooldown = cooldownDuration;
}

function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy');
  const x = Math.random() * (gameWidth - 40);
  enemy.style.left = `${x}px`;
  enemy.style.top = '0';

  // Randomly assign behavior: 30% drift, 30% normal, 40% erratic
  const behavior = Math.random();

  if (behavior < 0.3) {
    // Drift towards player's position at spawn time
    const targetX = playerX + player.offsetWidth / 2;

    enemy.move = () => {
      const currentX = parseFloat(enemy.style.left);
      const currentY = parseFloat(enemy.style.top);

      // Calculate direction towards the player's position
      const directionX = targetX - currentX;
      const directionY = gameHeight - currentY;

      // Normalize the direction vector
      const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
      const moveX = (directionX / magnitude) * 1; // Adjust speed as needed
      const moveY = (directionY / magnitude) * 2; // Adjust speed as needed

      // Update enemy position
      enemy.style.left = `${currentX + moveX}px`;
      enemy.style.top = `${currentY + moveY}px`;
    };
  } else if (behavior < 0.6) {
    // Move straight down
    enemy.move = () => {
      const currentY = parseFloat(enemy.style.top);
      enemy.style.top = `${currentY + 2}px`; // Adjust speed as needed
    };
  } else {
    // Move erratically
    let directionX = Math.random() > 0.5 ? 1 : -1; // Randomize left or right movement
    let directionY = 1; // Move down

    enemy.move = () => {
      const currentX = parseFloat(enemy.style.left);
      const currentY = parseFloat(enemy.style.top);

      // Randomly change direction
      if (Math.random() < 0.1) {
        directionX = Math.random() > 0.5 ? 1 : -1;
      }

      // Update enemy position
      enemy.style.left = `${currentX + directionX * 1}px`; // Adjust speed as needed
      enemy.style.top = `${currentY + directionY * 2}px`; // Adjust speed as needed
    };
  }

  gameContainer.appendChild(enemy);
  enemies.push(enemy);
}

function spawnFastEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy', 'fast-enemy');
  const x = Math.random() * (gameWidth - 40);
  enemy.style.left = `${x}px`;
  enemy.style.top = '0';

  // Store the player's position when the enemy is spawned
  const targetX = playerX + player.offsetWidth / 2;

  // Add movement towards the player's position
  enemy.move = () => {
    const currentX = parseFloat(enemy.style.left);
    const currentY = parseFloat(enemy.style.top);

    // Calculate direction towards the player's position
    const directionX = targetX - currentX;
    const directionY = gameHeight - currentY;

    // Normalize the direction vector
    const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
    const moveX = (directionX / magnitude) * 2; // Adjust speed as needed
    const moveY = (directionY / magnitude) * 4; // Adjust speed as needed

    // Update enemy position
    enemy.style.left = `${currentX + moveX}px`;
    enemy.style.top = `${currentY + moveY}px`;
  };

  gameContainer.appendChild(enemy);
  enemies.push(enemy);
}

function spawnArmoredEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy', 'armored-enemy');
  const x = Math.random() * (gameWidth - 40);
  enemy.style.left = `${x}px`;
  enemy.style.top = '0';
  enemy.health = 3; // Requires 3 hits to defeat

  // Store the player's position when the enemy is spawned
  const targetX = playerX + player.offsetWidth / 2;

  // Add movement towards the player's position
  enemy.move = () => {
    const currentX = parseFloat(enemy.style.left);
    const currentY = parseFloat(enemy.style.top);

    // Calculate direction towards the player's position
    const directionX = targetX - currentX;
    const directionY = gameHeight - currentY;

    // Normalize the direction vector
    const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
    const moveX = (directionX / magnitude) * 1; // Adjust speed as needed
    const moveY = (directionY / magnitude) * 2; // Adjust speed as needed

    // Update enemy position
    enemy.style.left = `${currentX + moveX}px`;
    enemy.style.top = `${currentY + moveY}px`;
  };

  gameContainer.appendChild(enemy);
  enemies.push(enemy);
}

function spawnTougherEnemy() {
  if (score % 300 === 0 && score !== 0 && activeTougherEnemies < maxTougherEnemies) {
    const tougherEnemy = document.createElement('div');
    tougherEnemy.classList.add('enemy', 'tougher-enemy');
    const x = Math.random() * (gameWidth - 40);
    tougherEnemy.style.left = `${x}px`;
    tougherEnemy.style.top = '0';
    tougherEnemy.health = tougherEnemyHealth; // Set initial health
    tougherEnemy.style.backgroundColor = tougherEnemyColors[0]; // Set initial color

    // Randomly assign behavior: 30% drift, 30% normal, 40% erratic
    const behavior = Math.random();

    if (behavior < 0.3) {
      // Drift towards player's position at spawn time
      const targetX = playerX + player.offsetWidth / 2;

      tougherEnemy.move = () => {
        const currentX = parseFloat(tougherEnemy.style.left);
        const currentY = parseFloat(tougherEnemy.style.top);

        // Calculate direction towards the player's position
        const directionX = targetX - currentX;
        const directionY = gameHeight - currentY;

        // Normalize the direction vector
        const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
        const moveX = (directionX / magnitude) * 1; // Adjust speed as needed
        const moveY = (directionY / magnitude) * 2; // Adjust speed as needed

        // Update enemy position
        tougherEnemy.style.left = `${currentX + moveX}px`;
        tougherEnemy.style.top = `${currentY + moveY}px`;
      };
    } else if (behavior < 0.6) {
      // Move straight down
      tougherEnemy.move = () => {
        const currentY = parseFloat(tougherEnemy.style.top);
        tougherEnemy.style.top = `${currentY + 2}px`; // Adjust speed as needed
      };
    } else {
      // Move erratically
      let directionX = Math.random() > 0.5 ? 1 : -1; // Randomize left or right movement
      let directionY = 1; // Move down

      tougherEnemy.move = () => {
        const currentX = parseFloat(tougherEnemy.style.left);
        const currentY = parseFloat(tougherEnemy.style.top);

        // Randomly change direction
        if (Math.random() < 0.1) {
          directionX = Math.random() > 0.5 ? 1 : -1;
        }

        // Update enemy position
        tougherEnemy.style.left = `${currentX + directionX * 1}px`; // Adjust speed as needed
        tougherEnemy.style.top = `${currentY + directionY * 2}px`; // Adjust speed as needed
      };
    }

    gameContainer.appendChild(tougherEnemy);
    enemies.push(tougherEnemy);
    activeTougherEnemies++; // Increment active tougher enemy count
  }
}

function spawnBoss() {
  if (score % 500 === 0 && score !== 0 && !boss) {
    boss = document.createElement('div');
    boss.classList.add('boss');
    boss.style.left = `${gameWidth / 2 - 50}px`; // Center the boss
    boss.style.top = '0';
    boss.health = bossHealth; // Set boss health
    gameContainer.appendChild(boss);
    bossChargeTimer = 0; // Reset charge timer
    bossSpeed = 2; // Reset boss speed
  }
}

function spawnSwarmBoss() {
  if (swarmBossActive) return; // Don't spawn if a Swarm Boss is already active

  const swarmBoss = document.createElement('div');
  swarmBoss.classList.add('swarm-boss');

  // Ensure the Swarm Boss spawns at a safe height (e.g., at least 50% of the game height)
  const minHeight = gameHeight * 0.5; // Minimum height (50% of the game height)
  const randomHeight = Math.random() * (gameHeight - minHeight); // Random height between minHeight and gameHeight
  swarmBoss.style.top = `${randomHeight}px`;
  swarmBoss.style.left = '0';

  swarmBoss.move = () => {
    const currentX = parseFloat(swarmBoss.style.left);
    swarmBoss.style.left = `${currentX + 2}px`; // Adjust speed as needed
    if (currentX > gameWidth) {
      swarmBoss.remove();
      enemies.splice(enemies.indexOf(swarmBoss), 1);
      swarmBossActive = false; // Reset Swarm Boss tracking
    }
  };

  gameContainer.appendChild(swarmBoss);
  enemies.push(swarmBoss);
  swarmBossActive = true; // Mark Swarm Boss as active
}

function spawnEnemySwarm() {
  for (let i = 0; i < 5; i++) { // Spawn 5 enemies at once
    spawnEnemy();
  }
}

function updateScore(points = 10) {
  score += points;
  scoreElement.textContent = `Score: ${score}`;

  // Spawn boss every 500 points
  if (score % 500 === 0 && score !== 0 && !boss) {
    spawnBoss();
  }

  // Spawn Swarm Boss every 200 points
  if (score % 200 === 0 && score !== 0 && !swarmBossActive) {
    spawnSwarmBoss();
  }
}

function updatePlayerSpeed() {
  if (score % 200 === 0 && score !== 0) {
    playerSpeed = Math.min(maxPlayerSpeed, playerSpeed * (1 + playerSpeedIncrease)); // Cap player speed
  }
}

function handlePlayerHit() {
  lives--;
  livesElement.textContent = `Lives: ${lives}`;
  player.style.backgroundColor = 'red';
  setTimeout(() => {
    player.style.backgroundColor = 'blue';
  }, 200);

  if (lives === 0) {
    gameActive = false; // Stop the game
    endGame("Game Over!");
  }
}

async function endGame(message) {
  gameOverScreen.style.display = 'block';
  cancelAnimationFrame(gameLoop);

  if (score > highestScore) {
    highestScore = score;

    try {
      await setDoc(doc(db, "scores", "highestScore"), { score: highestScore });
      console.log("Highest score saved to Firestore!");
      document.getElementById('highest-score-value').textContent = highestScore;
    } catch (error) {
      console.error("Error saving score:", error);
    }
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  livesElement.textContent = `Lives: ${lives}`;
  scoreElement.textContent = `Score: ${score}`;
  bullets.forEach(bullet => bullet.remove());
  enemies.forEach(enemy => enemy.remove());
  if (boss) boss.remove();
  bullets = [];
  enemies = [];
  boss = null;
  swarmBossActive = false; // Reset Swarm Boss tracking
  activeTougherEnemies = 0; // Reset active tougher enemy count
  extraEnemies = 0; // Reset extra enemies counter
  gameOverScreen.style.display = 'none';
  gameActive = true; // Restart the game
  gameLoop();
}

restartButton.addEventListener('click', resetGame);

function updateBoss() {
  if (!boss) return;

  const bossRect = boss.getBoundingClientRect();
  const playerRect = player.getBoundingClientRect();

  // Side-to-side movement
  boss.style.left = `${parseFloat(boss.style.left) + Math.sin(Date.now() / 500) * bossSpeed}px`;

  // Speed up and charge at the player after 3 seconds
  bossChargeTimer += 1 / 60; // Increment timer (assuming 60 FPS)
  if (bossChargeTimer >= 3) { // Charge after 3 seconds
    const deltaX = playerRect.left - bossRect.left;
    const deltaY = playerRect.top - bossRect.top;
    const angle = Math.atan2(deltaY, deltaX);
    boss.style.left = `${parseFloat(boss.style.left) + Math.cos(angle) * bossSpeed}px`;
    boss.style.top = `${parseFloat(boss.style.top) + Math.sin(angle) * bossSpeed}px`;

    // Increase boss speed over time
    bossSpeed += 0.01;
  }

  // Check for collision with player
  if (
    bossRect.left < playerRect.right &&
    bossRect.right > playerRect.left &&
    bossRect.top < playerRect.bottom &&
    bossRect.bottom > playerRect.top
  ) {
    handlePlayerHit(); // Player loses a life
    boss.remove(); // Remove the boss
    boss = null;
  }
}

function gameLoop(timestamp) {
  if (!gameActive) return; // Stop the game loop if the game is over

  // Update cooldown
  if (bulletCooldown > 0) {
    bulletCooldown -= 16.67; // Decrement cooldown by ~16.67ms (assuming 60 FPS)
  }

  // Update player speed
  updatePlayerSpeed();

  // Spawn tougher enemies
  spawnTougherEnemy();

  // Spawn fast enemies every 200 points
  if (score % 200 === 0 && score !== 0) {
    spawnFastEnemy();
  }

  // Spawn armored enemies every 400 points
  if (score % 400 === 0 && score !== 0) {
    spawnArmoredEnemy();
  }

  // Spawn enemy swarms every 600 points
  if (score % 600 === 0 && score !== 0) {
    spawnEnemySwarm();
  }

  if (isMovingLeft) {
    playerX -= playerSpeed;
  }
  if (isMovingRight) {
    playerX += playerSpeed;
  }
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;

  bullets.forEach((bullet, index) => {
    const bottom = parseFloat(bullet.style.bottom);
    bullet.style.bottom = `${bottom + 8}px`;
    if (bottom > gameHeight) {
      bullet.remove();
      bullets.splice(index, 1);
    }
  });

  enemies.forEach((enemy, index) => {
    if (enemy.move) {
      enemy.move(); // Call the enemy's move function
    }

    const top = parseFloat(enemy.style.top);
    if (top > gameHeight) {
      enemy.remove();
      enemies.splice(index, 1);
      extraEnemies++; // Add 1 extra enemy to the wave
    }
  });

  // Spawn extra enemies
  if (extraEnemies > 0) {
    for (let i = 0; i < extraEnemies; i++) {
      spawnEnemy();
    }
    extraEnemies = 0; // Reset extra enemies counter
  }

  bullets.forEach((bullet, bulletIndex) => {
    const bulletRect = bullet.getBoundingClientRect();
    enemies.forEach((enemy, enemyIndex) => {
      const enemyRect = enemy.getBoundingClientRect();
      if (
        bulletRect.left < enemyRect.right &&
        bulletRect.right > enemyRect.left &&
        bulletRect.top < enemyRect.bottom &&
        bulletRect.bottom > enemyRect.top
      ) {
        bullet.remove();
        bullets.splice(bulletIndex, 1);

        if (enemy.classList.contains('swarm-boss')) {
          // Swarm Boss is hit
          enemy.remove();
          enemies.splice(enemyIndex, 1);
          swarmBossActive = false; // Reset Swarm Boss tracking

          // Kill half the enemies
          const halfEnemies = Math.floor(enemies.length * .75);
          for (let i = 0; i < halfEnemies; i++) {
            enemies[i].remove(); // Remove from the DOM
          }
          enemies.splice(0, halfEnemies); // Remove from the enemies array

          updateScore(100); // Give bonus points for defeating the Swarm Boss
        } else if (enemy.classList.contains('tougher-enemy')) {
          // Handle tougher enemy logic (existing code)
          enemy.health--;
          if (enemy.health <= 0) {
            enemy.remove();
            enemies.splice(enemyIndex, 1);
            activeTougherEnemies--;
            updateScore();
          } else {
            enemy.style.backgroundColor = tougherEnemyColors[tougherEnemyHealth - enemy.health];
          }
        } else if (enemy.classList.contains('armored-enemy')) {
          // Handle armored enemy logic
          enemy.health--;
          if (enemy.health <= 0) {
            enemy.remove();
            enemies.splice(enemyIndex, 1);
            updateScore(); // Give bonus points for defeating the armored enemy
          }
        } else {
          // Handle normal enemy logic (existing code)
          enemy.remove();
          enemies.splice(enemyIndex, 1);
          updateScore();
        }
      }
    });

    if (boss) {
      const bossRect = boss.getBoundingClientRect();
      if (
        bulletRect.left < bossRect.right &&
        bulletRect.right > bossRect.left &&
        bulletRect.top < bossRect.bottom &&
        bulletRect.bottom > bossRect.top
      ) {
        bullet.remove();
        bullets.splice(bulletIndex, 1);
        boss.health--; // Reduce boss health
        if (boss.health <= 0) {
          boss.remove(); // Remove the boss
          boss = null;
          updateScore(100); // Give bonus points for defeating the boss
        }
      }
    }
  });

  const playerRect = player.getBoundingClientRect();
  let hitDetected = false; // Track if a collision has been detected in this frame

  enemies.forEach((enemy, index) => {
    const enemyRect = enemy.getBoundingClientRect();
    if (
      playerRect.left < enemyRect.right &&
      playerRect.right > enemyRect.left &&
      playerRect.top < enemyRect.bottom &&
      playerRect.bottom > enemyRect.top
    ) {
      if (!hitDetected) {
        handlePlayerHit(); // Handle player-enemy collision
        enemy.remove(); // Remove the enemy from the DOM
        enemies.splice(index, 1); // Remove the enemy from the enemies array
        hitDetected = true; // Mark collision as detected
      }
    }
  });

  // Update boss movement
  updateBoss();

  requestAnimationFrame(gameLoop);
}

// Start game
setInterval(spawnEnemy, 1000);
gameLoop();