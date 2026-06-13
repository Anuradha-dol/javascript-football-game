// ================= CANVAS =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ================= IMAGES =================
// Player images (2 options)
const playerImgs = [
    "resources/player_User.png",
    "resources/player4.png"
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

// Opponent images (2 options)
const opponentImgs = [
    "resources/player_Opponent.png",
    "resources/player3.png"
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const ballImg = new Image();
ballImg.src = "resources/ball.png";
const bgImg = new Image();
bgImg.src = "resources/ground.jpg";

// ================= SOUNDS =================
const kickSound = new Audio("resources/kick.mp3");
const goalSound = new Audio("resources/goal.mp3");
const selectSound = new Audio("resources/select.mp3");
const crowdCheerSound = new Audio("resources/west-ham-bubbles-77370.mp3");
crowdCheerSound.loop = true;
crowdCheerSound.volume = 0.4;

const audioTracks = {
    launch: "resources/launch_music.mp3",
    menu: "resources/menu_music.mp3",
    match: "resources/football-412586.mp3"
};

let bgMusic = new Audio(audioTracks.launch);
bgMusic.loop = true;
bgMusic.volume = 0.5;

function playAudio(audio) {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
    }
}

function setBackgroundTrack(trackPath) {
    if (!bgMusic.src.endsWith(trackPath)) {
        bgMusic.pause();
        bgMusic.src = trackPath;
        bgMusic.loop = true;
    }
    playAudio(bgMusic);
}

// ================= GAME STATE =================
let matchTime = 180; // 3 minutes
let lastMinuteCheck = 180;
let specialShots = 3;
let scorePlayer = 0;
let scoreOpponent = 0;
let highScore = Number(localStorage.getItem("highScore") || 0);
let difficulty = "medium";

// ================= PLAYER/OPPONENT =================
let selectedPlayer = 0; // Default to player_User.png
let selectedOpponent = 0; // Default to player_Opponent.png

const player = { x: 150, y: HEIGHT - 80, w: 45, h: 65, dy: 0, jump: false, speed: 4 };
const opponent = { x: WIDTH - 200, y: HEIGHT - 80, w: 45, h: 65, dy: 0, jump: false, speed: 3, active: false, shooting: false };
const ball = { x: WIDTH / 2, y: HEIGHT - 70, r: 14, dx: 0, dy: 0, lastTouch: "player" };

// ================= INPUT =================
const keys = {};
let started = false;
let paused = false;
let kickoff = true;
let kickoffSide = "player";
let kickoffCountdown = 3;

// Load saved character selections
if (localStorage.getItem('selectedPlayer')) {
    selectedPlayer = parseInt(localStorage.getItem('selectedPlayer'));
}
if (localStorage.getItem('selectedOpponent')) {
    selectedOpponent = parseInt(localStorage.getItem('selectedOpponent'));
}

// Load saved volume settings
let musicVolume = localStorage.getItem('musicVolume') || 50;
let sfxVolume = localStorage.getItem('sfxVolume') || 70;
bgMusic.volume = musicVolume / 100;
kickSound.volume = sfxVolume / 100;
goalSound.volume = sfxVolume / 100;
selectSound.volume = sfxVolume / 100;
crowdCheerSound.volume = sfxVolume / 100;

// ================= INPUT HANDLING =================
document.addEventListener("keydown", e => {
    const launchScreen = document.getElementById("launchPage");
    const gameScreen = document.getElementById("gameContainer");

    if (e.code === "Enter" && launchScreen && launchScreen.style.display !== "none") {
        e.preventDefault();
        document.getElementById("enterBtn").click();
        return;
    }

    keys[e.code] = true;

    if (gameScreen && gameScreen.style.display === "none") return;

    if (e.code === "Enter" && !paused) {
        if (!started) started = true;
        else restartMatch();
    }
    if (e.code === "Escape") {
        togglePause();
    }

    if (!kickoff && !paused) {
        if (e.code === "KeyD") shootBall(player, 8, -6);
        if ((e.code === "Space" || e.code === "KeyQ") && specialShots > 0) {
            e.preventDefault();
            specialShoot(player);
        }
    }
});

document.addEventListener("keyup", e => keys[e.code] = false);

// ================= UI ELEMENTS =================
const launchPage = document.getElementById('launchPage');
const homeMenu = document.getElementById('homeMenu');
const gameContainer = document.getElementById('gameContainer');
const settingsPanel = document.getElementById('settingsPanel');
const highScoresPanel = document.getElementById('highScoresPanel');
const characterPanel = document.getElementById('characterPanel');
const matchOverPanel = document.getElementById('matchOverPanel');
const pausePanel = document.getElementById('pausePanel');

const playerScoreDisplay = document.getElementById('playerScore');
const opponentScoreDisplay = document.getElementById('opponentScore');
const matchTimeDisplay = document.getElementById('matchTime');
const specialShotsDisplay = document.getElementById('specialShots');
const highScoreDisplay = document.getElementById('highScoreDisplay');

// ================= INITIALIZE =================
function init() {
    playAudio(bgMusic);
    gameLoop();
    
    // Load saved volume settings to UI
    document.getElementById('musicVolume').value = musicVolume;
    document.getElementById('sfxVolume').value = sfxVolume;
}

// ================= MENU FUNCTIONS =================
document.getElementById('enterBtn').addEventListener('click', () => {
    selectSound.play();
    launchPage.style.opacity = 0;
    setTimeout(() => {
        launchPage.style.display = 'none';
        homeMenu.style.display = 'flex';
        setBackgroundTrack(audioTracks.menu);
    }, 500);
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    selectSound.play();
    homeMenu.style.display = 'none';
    gameContainer.style.display = 'block';
    setBackgroundTrack(audioTracks.match);
    restartMatch(true);
    playAudio(crowdCheerSound);
});

// ================= CHARACTER SELECTION =================
document.getElementById('characterBtn').addEventListener('click', () => {
    selectSound.play();
    characterPanel.style.display = 'block';
    updateCharacterSelectionUI();
});

document.getElementById('closeCharacter').addEventListener('click', () => {
    selectSound.play();
    characterPanel.style.display = 'none';
});

document.getElementById('saveCharacters').addEventListener('click', () => {
    selectSound.play();
    characterPanel.style.display = 'none';
    localStorage.setItem('selectedPlayer', selectedPlayer);
    localStorage.setItem('selectedOpponent', selectedOpponent);
});

function updateCharacterSelectionUI() {
    // Update player selection
    document.querySelectorAll('.character-card[data-player]').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.player) === selectedPlayer) {
            card.classList.add('selected');
        }
    });
    
    // Update opponent selection
    document.querySelectorAll('.character-card[data-opponent]').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.opponent) === selectedOpponent) {
            card.classList.add('selected');
        }
    });
}

// Character selection event listeners
document.querySelectorAll('.character-card[data-player]').forEach(card => {
    card.addEventListener('click', () => {
        selectSound.play();
        selectedPlayer = parseInt(card.dataset.player);
        updateCharacterSelectionUI();
    });
});

document.querySelectorAll('.character-card[data-opponent]').forEach(card => {
    card.addEventListener('click', () => {
        selectSound.play();
        selectedOpponent = parseInt(card.dataset.opponent);
        updateCharacterSelectionUI();
    });
});

// ================= SETTINGS PANEL =================
document.getElementById('settingsBtn').addEventListener('click', () => {
    selectSound.play();
    settingsPanel.style.display = 'block';
});

document.getElementById('closeSettings').addEventListener('click', () => {
    selectSound.play();
    settingsPanel.style.display = 'none';
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    selectSound.play();
    
    // Save music selection
    const musicSelect = document.getElementById('musicSelect');
    const selectedMusic = musicSelect.options[musicSelect.selectedIndex].value;
    
    // Save volume settings
    musicVolume = document.getElementById('musicVolume').value;
    sfxVolume = document.getElementById('sfxVolume').value;
    
    // Apply volume settings
    bgMusic.volume = musicVolume / 100;
    kickSound.volume = sfxVolume / 100;
    goalSound.volume = sfxVolume / 100;
    selectSound.volume = sfxVolume / 100;
    crowdCheerSound.volume = sfxVolume / 100;
    
    // Save to localStorage
    localStorage.setItem('musicVolume', musicVolume);
    localStorage.setItem('sfxVolume', sfxVolume);
    
    // Change music if needed
    if (bgMusic.src.indexOf(selectedMusic) === -1) {
        const wasPlaying = !bgMusic.paused;
        bgMusic.pause();
        bgMusic.src = "resources/" + selectedMusic;
        bgMusic.loop = true;
        if (wasPlaying) {
            playAudio(bgMusic);
        }
    }
    
    settingsPanel.style.display = 'none';
});

// ================= HIGH SCORES =================
document.getElementById('scoresBtn').addEventListener('click', () => {
    selectSound.play();
    updateHighScoresList();
    highScoresPanel.style.display = 'block';
});

document.getElementById('closeScores').addEventListener('click', () => {
    selectSound.play();
    highScoresPanel.style.display = 'none';
});

document.getElementById('closeScoresBtn').addEventListener('click', () => {
    selectSound.play();
    highScoresPanel.style.display = 'none';
});

// ================= CREDITS =================
document.getElementById('creditsBtn').addEventListener('click', () => {
    selectSound.play();
    alert("GoalRush 2D Soccer Game\nCreated with HTML5 Canvas\nGraphics & Sounds from various sources");
});

// ================= PAUSE FUNCTIONALITY =================
function togglePause() {
    if (!started) return;
    
    paused = !paused;
    
    if (paused) {
        crowdCheerSound.pause();
        bgMusic.pause();
        pausePanel.style.display = 'flex';
    } else {
        if (!kickoff) playAudio(crowdCheerSound);
        playAudio(bgMusic);
        pausePanel.style.display = 'none';
    }
}

document.getElementById('resumeBtn').addEventListener('click', () => {
    selectSound.play();
    togglePause();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    selectSound.play();
    pausePanel.style.display = 'none';
    restartMatch();
});

document.getElementById('pauseMainMenuBtn').addEventListener('click', () => {
    selectSound.play();
    pausePanel.style.display = 'none';
    gameContainer.style.display = 'none';
    homeMenu.style.display = 'flex';
    setBackgroundTrack(audioTracks.menu);
    restartMatch(false);
});

// ================= GAME FUNCTIONS =================
function shootBall(p, dxPower, dyPower) {
    if (collision(p) || ball.lastTouch === "player") {
        kickSound.play();
        const hitPos = (ball.y - p.y) / p.h;
        ball.dx = dxPower;
        ball.dy = dyPower + hitPos * 4;
        ball.lastTouch = "player";
        opponent.active = true;
    }
}

function specialShoot(p) {
    if (specialShots <= 0) return;
    
    kickSound.play();
    const goalX = WIDTH - 20;
    const goalY = HEIGHT - 110 / 2;
    ball.dx = (goalX - ball.x) / 20;
    ball.dy = (goalY - ball.y) / 20;
    ball.lastTouch = "player";
    opponent.active = false;
    specialShots--;
}

// ================= GAME LOOP =================
function gameLoop() {
    if (paused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawField();

    if (!started) {
        drawText("PRESS ENTER TO START", WIDTH / 2, HEIGHT / 2, 36);
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (matchTime <= 0) {
        endMatch();
        requestAnimationFrame(gameLoop);
        return;
    }

    updateTimer();
    
    if (kickoff) {
        drawText("Kickoff in " + Math.ceil(kickoffCountdown), WIDTH / 2, HEIGHT / 2, 32);
        kickoffCountdown -= 1 / 60;
        if (kickoffCountdown <= 0) kickoff = false;
    }

    updatePlayer();
    updateOpponent();
    updateBall();
    
    // Draw characters with selected images
    drawPlayer(player, playerImgs[selectedPlayer]);
    drawPlayer(opponent, opponentImgs[selectedOpponent]);
    
    drawBall();
    updateHUD();

    requestAnimationFrame(gameLoop);
}

// ================= PLAYER/OPPONENT UPDATE =================
function updatePlayer() {
    if (kickoff) return;
    
    if (keys.ArrowLeft) player.x -= player.speed;
    if (keys.ArrowRight) player.x += player.speed;
    if (keys.ArrowUp && !player.jump) {
        player.dy = -11;
        player.jump = true;
    }

    player.dy += 0.55;
    player.y += player.dy;
    
    if (player.y + player.h >= HEIGHT) {
        player.y = HEIGHT - player.h;
        player.dy = 0;
        player.jump = false;
    }
    
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WIDTH) player.x = WIDTH - player.w;

    if (collision(player)) {
        kickSound.play();
        const hitPos = (ball.y - player.y) / player.h;
        ball.dx = 6;
        ball.dy = -6 + hitPos * 6;
        ball.lastTouch = "player";
        opponent.active = false;
        
        if (player.jump && specialShots > 0 && hitPos < 0.4) {
            ball.dy = -13;
            specialShots--;
        }
    }
}

function updateOpponent() {
    if (kickoff) return;
    
    const homeX = WIDTH - 200;
    const speedFactor = difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.5 : 0.8;

    if (!opponent.active) {
        opponent.x += (homeX - opponent.x) * 0.02;
        if (ball.lastTouch === "player" && ball.x > WIDTH / 2) opponent.active = true;
    }

    if (opponent.active) {
        if (ball.x < opponent.x) opponent.x -= opponent.speed * speedFactor;
        else opponent.x += opponent.speed * speedFactor;

        if (!opponent.jump && ball.y < HEIGHT - 30 && ball.x > opponent.x - 30 && ball.x < opponent.x + opponent.w + 30) {
            if (Math.random() < 0.5) {
                opponent.dy = -10 - Math.random() * 2;
                opponent.jump = true;
            }
        }

        const nearGoal = ball.x < WIDTH / 2 && ball.lastTouch !== "opponent";
        const missedBall = ball.x > opponent.x + 30 && ball.lastTouch === "player";

        if (!opponent.shooting && (nearGoal || missedBall) && Math.random() < 0.02) {
            opponent.shooting = true;
            setTimeout(() => {
                kickSound.play();
                const hitPos = (ball.y - opponent.y) / opponent.h;
                ball.dx = -6 + Math.random() * 2;
                ball.dy = -4 + hitPos * 4;
                ball.lastTouch = "opponent";
                opponent.shooting = false;
            }, 200);
        }

        opponent.x += Math.sin(Date.now() / 200) * 0.2;
    }

    opponent.dy += 0.55;
    opponent.y += opponent.dy;
    
    if (opponent.y + opponent.h >= HEIGHT) {
        opponent.y = HEIGHT - opponent.h;
        opponent.dy = 0;
        opponent.jump = false;
    }
    
    if (opponent.x < 0) opponent.x = 0;
    if (opponent.x + opponent.w > WIDTH) opponent.x = WIDTH - opponent.w;

    if (collision(opponent)) {
        kickSound.play();
        const hitPos = (ball.y - opponent.y) / opponent.h;
        ball.dx = -5 + Math.random() * 2;
        ball.dy = -4 + hitPos * 4;
        ball.lastTouch = "opponent";
    }
}

function updateBall() {
    if (!kickoff) {
        ball.x += ball.dx;
        ball.y += ball.dy;
        ball.dy += 0.55;

        if (ball.y + ball.r > HEIGHT) {
            ball.y = HEIGHT - ball.r;
            ball.dy *= -0.35;
            ball.dx *= 0.98;
        }
        
        if (ball.y - ball.r < 0) {
            ball.y = ball.r;
            ball.dy *= -0.5;
        }
        
        if (ball.x - ball.r < 0) {
            ball.x = ball.r;
            ball.dx *= -0.5;
        }
        
        if (ball.x + ball.r > WIDTH) {
            ball.x = WIDTH - ball.r;
            ball.dx *= -0.5;
        }

        const goalTop = HEIGHT - 110;
        if (ball.x + ball.r >= WIDTH && ball.y > goalTop) {
            scorePlayer++;
            goalSound.play();
            resetKickoff("player");
        }
        
        if (ball.x - ball.r <= 0 && ball.y > goalTop) {
            scoreOpponent++;
            goalSound.play();
            resetKickoff("opponent");
        }

        if (ball.lastTouch === "player" && ball.x > WIDTH / 2) opponent.active = true;

        ball.dx *= 0.98;
    }
}

function updateTimer() {
    matchTime -= 1 / 60;
    if (Math.floor(matchTime) <= lastMinuteCheck - 60) {
        if (specialShots < 3) specialShots++;
        lastMinuteCheck -= 60;
    }
}

function resetKickoff(side) {
    kickoff = true;
    kickoffSide = side;
    kickoffCountdown = 3;
    ball.x = WIDTH / 2;
    ball.y = HEIGHT - 70;
    ball.dx = 0;
    ball.dy = 0;
    ball.lastTouch = "player";
    player.x = WIDTH / 2 - 120;
    opponent.x = WIDTH / 2 + 80;
    opponent.active = false;
    opponent.shooting = false;
    
    setTimeout(() => {
        ball.dx = side === "player" ? 2 : -2;
        kickoff = false;
    }, 2000);
}

// ================= DRAW FUNCTIONS =================
function drawField() {
    ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);
    drawGoal(0, HEIGHT - 110);
    drawGoal(WIDTH - 40, HEIGHT - 110);
    
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawGoal(x, y) {
    const postWidth = 8;
    const crossbarHeight = 8;
    const goalWidth = 40;
    const goalHeight = 110;
    
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, postWidth, goalHeight);
    ctx.fillRect(x + goalWidth - postWidth, y, postWidth, goalHeight);
    ctx.fillRect(x, y, goalWidth, crossbarHeight);
}

function drawPlayer(p, img) {
    ctx.drawImage(img, p.x, p.y, p.w, p.h);
}

function drawBall() {
    ctx.drawImage(ballImg, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
}

function drawText(text, x, y, size = 24) {
    ctx.fillStyle = "#fff";
    ctx.font = `${size}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
}

// ================= HUD =================
function updateHUD() {
    playerScoreDisplay.textContent = scorePlayer;
    opponentScoreDisplay.textContent = scoreOpponent;
    matchTimeDisplay.textContent = formatTime(matchTime);
    specialShotsDisplay.textContent = specialShots;
    highScoreDisplay.textContent = highScore;
}

function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ================= COLLISION =================
function collision(obj) {
    const dx = ball.x - Math.max(obj.x, Math.min(ball.x, obj.x + obj.w));
    const dy = ball.y - Math.max(obj.y, Math.min(ball.y, obj.y + obj.h));
    return (dx * dx + dy * dy) < ball.r * ball.r;
}

// ================= HIGH SCORES =================
function updateHighScoresList() {
    const list = document.getElementById("highScoresList");
    list.innerHTML = "";
    const scores = JSON.parse(localStorage.getItem("scores") || "[]");
    [...scores, scorePlayer].sort((a, b) => b - a).slice(0, 10).forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        list.appendChild(li);
    });
    
    if (scorePlayer > highScore) {
        highScore = scorePlayer;
        localStorage.setItem("highScore", highScore);
    }
}

function saveScore() {
    const scores = JSON.parse(localStorage.getItem("scores") || "[]");
    scores.push(scorePlayer);
    localStorage.setItem("scores", JSON.stringify(scores));

    if (scorePlayer > highScore) {
        highScore = scorePlayer;
        localStorage.setItem("highScore", highScore);
    }
}

// ================= END MATCH =================
function endMatch() {
    started = false;
    paused = true;
    crowdCheerSound.pause();
    crowdCheerSound.currentTime = 0;
    saveScore();

    matchOverPanel.style.display = "flex";
    document.getElementById("finalPlayerScore").textContent = scorePlayer;
    document.getElementById("finalOpponentScore").textContent = scoreOpponent;
}

// ================= RESTART =================
function restartMatch(startImmediately = true) {
    scorePlayer = 0;
    scoreOpponent = 0;
    matchTime = 180;
    lastMinuteCheck = 180;
    specialShots = 3;
    kickoff = true;
    kickoffCountdown = 3;
    player.x = 150;
    opponent.x = WIDTH - 200;
    ball.x = WIDTH / 2;
    ball.y = HEIGHT - 70;
    ball.dx = 0;
    ball.dy = 0;
    matchOverPanel.style.display = "none";
    pausePanel.style.display = "none";
    started = startImmediately;
    paused = false;
    updateHUD();

    if (startImmediately) {
        playAudio(bgMusic);
    } else {
        crowdCheerSound.pause();
        crowdCheerSound.currentTime = 0;
    }
}

// ================= BUTTON EVENT LISTENERS =================
document.getElementById("replayBtn").addEventListener("click", () => {
    restartMatch();
    matchOverPanel.style.display = "none";
});

document.getElementById("mainMenuBtn").addEventListener("click", () => {
    matchOverPanel.style.display = "none";
    gameContainer.style.display = "none";
    homeMenu.style.display = "flex";
    setBackgroundTrack(audioTracks.menu);
    restartMatch(false);
});

// ================= INITIALIZE GAME =================
init();
