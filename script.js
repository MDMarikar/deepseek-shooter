// Import the functions you need from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvs1S2_-8xRD8WCDE-qsCNPf8lqaZIh2Q",
  authDomain: "aishooter-24e57.firebaseapp.com",
  projectId: "aishooter-24e57",
  storageBucket: "aishooter-24e57.firebasestorage.app",
  messagingSenderId: "329119638955",
  appId: "1:329119638955:web:94afc8a0166331ef42deee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game variables
const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const wall = document.getElementById('wall');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart');
let gameWidth = gameContainer.clientWidth; // Dynamic width based on container
let gameHeight = gameContainer.clientHeight; // Dynamic height based on container
let playerX = gameWidth / 2 - 25;
let bullets = [];
let enemies = [];
let score = 0;
const scoreElement = document.getElementById('score');
const wallBlocks = [];
const totalWallBlocks = Math.floor(gameWidth / 22); // 20px width + 2px gap
let isMovingLeft = false;
let isMovingRight = false;
let highestScore = 0;

// Fetch the highest score from Firestore
async function fetchHighestScore() {
  const docRef = doc(db, "scores", "highestScore");

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // If the document exists, fetch the highest score
      highestScore = docSnap.data().score;
      document.getElementById('highest-score-value').textContent = highestScore;
    } else {
      // If the document doesn't exist, create it with a default score of 0
      await setDoc(docRef, { score: 0 });
      console.log("Created highestScore document with default score 0.");
      highestScore = 0;
      document.getElementById('highest-score-value').textContent = highestScore;
    }
  } catch (error) {
    console.error("Error fetching or creating highest score:", error);
  }
}

// Call this function to fetch the highest score when the page loads
fetchHighestScore();

// Create the wall
function createWall() {
  for (let i = 0; i < totalWallBlocks; i++) {
    const block = document.createElement('div');
    block.classList.add('wall-block');
    wall.appendChild(block);
    wallBlocks.push(block);
  }
}

createWall(); // Initialize the wall

// Keyboard controls for movement
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    isMovingLeft = true;
  } else if (e.key === 'ArrowRight') {
    isMovingRight = true;
  } else if (e.key === ' ') { // Spacebar to shoot
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
  playerX = e.clientX - rect.left - 25; // Move player to mouse position
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;
});

document.addEventListener('touchmove', (e) => {
  e.preventDefault(); // Prevent default touch behavior (scrolling/swiping)
  const touch = e.touches[0];
  const rect = gameContainer.getBoundingClientRect();
  playerX = touch.clientX - rect.left - 25; // Move player to touch position
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;
});

// Shoot on mouse click or touch
document.addEventListener('click', () => {
  shootBullet();
});

document.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent default touch behavior
  shootBullet();
});

function shootBullet() {
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  const bulletX = playerX + player.offsetWidth / 2 - 5; // Center the bullet relative to the player
  bullet.style.left = `${bulletX}px`;
  bullet.style.bottom = '70px';
  gameContainer.appendChild(bullet);
  bullets.push(bullet);
}

function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.classList.add('enemy');
  const x = Math.random() * (gameWidth - 40); // Spawn within game width
  enemy.style.left = `${x}px`;
  enemy.style.top = '0';
  gameContainer.appendChild(enemy);
  enemies.push(enemy);
}

function updateScore() {
  score += 10;
  scoreElement.textContent = `Score: ${score}`;
}

function resetScore() {
  score = 0;
  scoreElement.textContent = `Score: ${score}`;
}

function handlePlayerHit() {
  resetScore(); // Reset the score
  player.style.backgroundColor = 'red'; // Flash the player red
  setTimeout(() => {
    player.style.backgroundColor = 'blue'; // Reset color
  }, 200);
}

function breakWall() {
  if (wallBlocks.length > 0) {
    const block = wallBlocks.pop(); // Remove the last block
    block.remove();

    // Check if all wall blocks are gone
    if (wallBlocks.length === 0) {
      endGame("You Lost!");
    }
  }
}

async function endGame(message) {
  gameOverScreen.style.display = 'block'; // Show the game over screen
  cancelAnimationFrame(gameLoop); // Stop the game loop

  // Check if the current score is higher than the saved highest score
  if (score > highestScore) {
    highestScore = score;

    try {
      // Save the highest score to Firestore
      await setDoc(doc(db, "scores", "highestScore"), {
        score: highestScore
      });
      console.log("Highest score saved to Firestore!");
      // Update the displayed highest score
      document.getElementById('highest-score-value').textContent = highestScore;
    } catch (error) {
      console.error("Error saving score:", error);
    }
  }
}

function resetGame() {
  // Reset game state
  score = 0;
  scoreElement.textContent = `Score: ${score}`;
  bullets.forEach(bullet => bullet.remove());
  enemies.forEach(enemy => enemy.remove());
  bullets = [];
  enemies = [];
  wall.innerHTML = ''; // Clear the wall
  createWall(); // Rebuild the wall
  gameOverScreen.style.display = 'none'; // Hide the game over screen
  gameLoop(); // Restart the game loop
}

restartButton.addEventListener('click', resetGame);

function gameLoop() {
  // Move player based on keyboard input
  if (isMovingLeft) {
    playerX -= 20; // Move left
  }
  if (isMovingRight) {
    playerX += 20; // Move right
  }
  playerX = Math.max(0, Math.min(playerX, gameWidth - 50)); // Keep player within bounds
  player.style.left = `${playerX}px`;

  // Move bullets
  bullets.forEach((bullet, index) => {
    const bottom = parseFloat(bullet.style.bottom);
    bullet.style.bottom = `${bottom + 15}px`; // Move bullets faster
    if (bottom > gameHeight) {
      bullet.remove();
      bullets.splice(index, 1);
    }
  });

  // Move enemies
  enemies.forEach((enemy, index) => {
    const top = parseFloat(enemy.style.top);
    enemy.style.top = `${top + 3}px`; // Move enemies slower
    if (top > gameHeight) {
      enemy.remove();
      enemies.splice(index, 1);

      // Break a wall block
      breakWall();
    }
  });

  // Check for collisions between bullets and enemies
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
        // Collision detected between bullet and enemy
        bullet.remove();
        enemy.remove();
        bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);

        // Update the score
        updateScore();
      }
    });
  });

  // Check for collisions between player and enemies
  const playerRect = player.getBoundingClientRect();
  enemies.forEach((enemy, index) => {
    const enemyRect = enemy.getBoundingClientRect();
    if (
      playerRect.left < enemyRect.right &&
      playerRect.right > enemyRect.left &&
      playerRect.top < enemyRect.bottom &&
      playerRect.bottom > enemyRect.top
    ) {
      // Collision detected between player and enemy
      handlePlayerHit();
    }
  });

  requestAnimationFrame(gameLoop);
}

// Start game
setInterval(spawnEnemy, 1000);
gameLoop();