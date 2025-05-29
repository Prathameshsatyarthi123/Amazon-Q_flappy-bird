// Game constants
const GRAVITY = 0.25;
const FLAP_FORCE = -6; // Increased for larger canvas
const PIPE_SPEED = 3; // Slightly increased for larger canvas
const PIPE_SPAWN_INTERVAL = 1800; // Increased slightly for larger canvas
const PIPE_GAP = 150; // Increased for larger canvas
const GROUND_HEIGHT = 112;

// Game variables
let canvas, ctx;
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let gameState = 'start'; // start, playing, over

// Game objects
const bird = {
    x: 120, // Moved further right for larger canvas
    y: 300, // Adjusted for larger canvas
    width: 50, // Increased size
    height: 35, // Increased size
    velocity: 0,
    rotation: 0,
    radius: 20, // Increased size
    frame: 0,
    animation: [0, 1, 2, 1], // Animation sequence
    animationSpeed: 5, // Change frame every 5 game frames
    
    flap: function() {
        if (gameState === 'playing') {
            this.velocity = FLAP_FORCE;
            sounds.flap.play();
        }
    },
    
    update: function() {
        // Bird animation
        if (frames % this.animationSpeed === 0) {
            this.frame = (this.frame + 1) % this.animation.length;
        }
        
        // Bird falls if game is playing
        if (gameState === 'playing') {
            this.velocity += GRAVITY;
            this.y += this.velocity;
            
            // Rotation based on velocity
            if (this.velocity <= 0) {
                this.rotation = -25 * Math.PI / 180; // Rotate up when flapping
            } else {
                if (this.rotation < 90 * Math.PI / 180) {
                    this.rotation += 0.03; // Gradually rotate down when falling
                }
            }
        }
        
        // Ground collision
        if (this.y + this.height >= canvas.height - GROUND_HEIGHT) {
            this.y = canvas.height - GROUND_HEIGHT - this.height;
            if (gameState === 'playing') {
                gameOver();
            }
        }
        
        // Ceiling collision
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    
    draw: function() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Draw the bird as a simple colored circle instead of using sprite
        ctx.fillStyle = "#FFD700"; // Gold color
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add eye
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(this.radius/2, -this.radius/3, this.radius/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Add beak
        ctx.fillStyle = "#FF6600";
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(this.radius + 10, -5);
        ctx.lineTo(this.radius + 10, 5);
        ctx.closePath();
        ctx.fill();
        
        // Add wing
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        // Wing animation based on frame
        if (frames % 15 < 7) {
            ctx.ellipse(-5, 5, 15, 10, Math.PI/4, 0, Math.PI * 2);
        } else {
            ctx.ellipse(-5, 0, 15, 8, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        
        ctx.restore();
    },
    
    reset: function() {
        this.y = 150;
        this.velocity = 0;
        this.rotation = 0;
    }
};

const pipes = {
    position: [],
    
    reset: function() {
        this.position = [];
    },
    
    spawn: function() {
        // Calculate random position for pipe gap
        const topHeight = Math.floor(Math.random() * (canvas.height - PIPE_GAP - GROUND_HEIGHT - 60)) + 20;
        
        // Add new pipe pair to array
        this.position.push({
            x: canvas.width,
            y: 0,
            topHeight: topHeight,
            bottomY: topHeight + PIPE_GAP,
            scored: false
        });
    },
    
    update: function() {
        if (gameState !== 'playing') return;
        
        // Spawn new pipes at interval
        if (frames % Math.floor(PIPE_SPAWN_INTERVAL / (1000/60)) === 0) {
            this.spawn();
        }
        
        // Update pipe positions and check for score
        for (let i = 0; i < this.position.length; i++) {
            let pipe = this.position[i];
            
            // Move pipe
            pipe.x -= PIPE_SPEED;
            
            // Check if bird passed the pipe
            if (!pipe.scored && pipe.x + sprites.pipeWidth < bird.x) {
                score++;
                pipe.scored = true;
                sounds.score.play();
                updateScoreDisplay();
            }
            
            // Remove pipes that are off screen
            if (pipe.x + sprites.pipeWidth <= 0) {
                this.position.shift();
            }
            
            // Check for collision
            if (gameState === 'playing') {
                // Top pipe collision
                if (
                    bird.x + bird.radius > pipe.x &&
                    bird.x - bird.radius < pipe.x + sprites.pipeWidth &&
                    bird.y - bird.radius < pipe.topHeight
                ) {
                    gameOver();
                }
                
                // Bottom pipe collision
                if (
                    bird.x + bird.radius > pipe.x &&
                    bird.x - bird.radius < pipe.x + sprites.pipeWidth &&
                    bird.y + bird.radius > pipe.bottomY
                ) {
                    gameOver();
                }
            }
        }
    },
    
    draw: function() {
        for (let i = 0; i < this.position.length; i++) {
            let pipe = this.position[i];
            
            // Draw pipes with rectangles instead of images
            // Top pipe
            ctx.fillStyle = "#74BF2E"; // Green color for pipes
            ctx.fillRect(pipe.x, 0, sprites.pipeWidth, pipe.topHeight);
            
            // Bottom pipe
            ctx.fillRect(pipe.x, pipe.bottomY, sprites.pipeWidth, canvas.height - pipe.bottomY - GROUND_HEIGHT);
            
            // Pipe caps (darker green)
            ctx.fillStyle = "#598C22";
            // Top pipe cap
            ctx.fillRect(pipe.x - 3, pipe.topHeight - 15, sprites.pipeWidth + 6, 15);
            // Bottom pipe cap
            ctx.fillRect(pipe.x - 3, pipe.bottomY, sprites.pipeWidth + 6, 15);
            
            // Add some pipe details
            ctx.fillStyle = "#8FD133";
            // Top pipe highlight
            ctx.fillRect(pipe.x + 10, 0, 5, pipe.topHeight - 15);
            // Bottom pipe highlight
            ctx.fillRect(pipe.x + 10, pipe.bottomY + 15, 5, canvas.height - pipe.bottomY - GROUND_HEIGHT - 15);
        }
    }
};

const background = {
    draw: function() {
        // Draw sky
        ctx.fillStyle = "#70c5ce";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw simple clouds
        ctx.fillStyle = "#ffffff";
        // Cloud 1
        ctx.beginPath();
        ctx.arc(150, 120, 40, 0, Math.PI * 2);
        ctx.arc(200, 100, 50, 0, Math.PI * 2);
        ctx.arc(250, 120, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Cloud 2
        ctx.beginPath();
        ctx.arc(500, 150, 30, 0, Math.PI * 2);
        ctx.arc(550, 130, 40, 0, Math.PI * 2);
        ctx.arc(600, 150, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Cloud 3
        ctx.beginPath();
        ctx.arc(350, 80, 25, 0, Math.PI * 2);
        ctx.arc(380, 70, 30, 0, Math.PI * 2);
        ctx.arc(410, 80, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw ground
        ctx.fillStyle = "#DED895"; // Sandy color
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
        
        // Draw grass on top of ground
        ctx.fillStyle = "#73BF2E";
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 15);
    }
};

// Load sprites
const sprites = {
    bird: new Image(),
    background: new Image(),
    ground: new Image(),
    pipeTop: new Image(),
    pipeBottom: new Image(),
    
    pipeWidth: 80, // Increased for larger canvas
    pipeHeight: 500 // Increased for larger canvas
};

sprites.bird.src = 'images/bird.png';
sprites.background.src = 'images/background.png';
sprites.ground.src = 'images/ground.png';
sprites.pipeTop.src = 'images/pipe-top.png';
sprites.pipeBottom.src = 'images/pipe-bottom.png';

// Load sounds
const sounds = {
    flap: {
        play: function() {
            // Create a simple beep sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 100);
            } catch (e) {
                console.log("Audio not supported");
            }
        }
    },
    score: {
        play: function() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = 1200;
                gainNode.gain.value = 0.1;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 200);
            } catch (e) {
                console.log("Audio not supported");
            }
        }
    },
    hit: {
        play: function() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.1;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 300);
            } catch (e) {
                console.log("Audio not supported");
            }
        }
    },
    die: {
        play: function() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 100;
                gainNode.gain.value = 0.1;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                setTimeout(() => oscillator.stop(), 500);
            } catch (e) {
                console.log("Audio not supported");
            }
        }
    }
};

// Game functions
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Update high score display
    document.getElementById('high-score-display').textContent = `Best: ${highScore}`;
    
    // Event listeners
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            if (gameState === 'start') {
                startGame();
            } else if (gameState === 'playing') {
                bird.flap();
            } else if (gameState === 'over') {
                resetGame();
            }
        }
    });
    
    canvas.addEventListener('click', function() {
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'playing') {
            bird.flap();
        }
    });
    
    document.getElementById('restart-button').addEventListener('click', resetGame);
    
    // Start game loop
    loop();
}

function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').classList.add('hidden');
}

function gameOver() {
    gameState = 'over';
    sounds.hit.play();
    setTimeout(() => sounds.die.play(), 500);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    
    // Show game over screen
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('best-score').textContent = highScore;
}

function resetGame() {
    gameState = 'start';
    score = 0;
    frames = 0;
    updateScoreDisplay();
    bird.reset();
    pipes.reset();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = score;
}

function loop() {
    // Update
    frames++;
    bird.update();
    pipes.update();
    
    // Draw
    background.draw();
    pipes.draw();
    bird.draw();
    
    // Continue loop
    requestAnimationFrame(loop);
}

// Wait for all assets to load before starting
window.onload = function() {
    // Initialize the game immediately instead of waiting for all assets
    init();
    
    // Handle errors for missing assets
    sprites.bird.onerror = function() {
        console.error("Failed to load bird sprite");
    };
    sprites.background.onerror = function() {
        console.error("Failed to load background sprite");
    };
    sprites.ground.onerror = function() {
        console.error("Failed to load ground sprite");
    };
    sprites.pipeTop.onerror = function() {
        console.error("Failed to load pipe-top sprite");
    };
    sprites.pipeBottom.onerror = function() {
        console.error("Failed to load pipe-bottom sprite");
    };
};
