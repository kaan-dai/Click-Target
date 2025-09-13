class ClickTargetGame {
    constructor() {
        this.score = 0;
        this.lives = 2;
        this.timeLeft = 180;
        this.gameActive = false;
        this.initialSpawnInterval = 1500;  // 1.5 seconds
        this.initialTargetDuration = 2000;  // 2.0 seconds
        this.finalSpawnInterval = 200;      // 0.2 seconds
        this.finalTargetDuration = 500;     // 0.5 seconds
        this.spawnInterval = this.initialSpawnInterval;
        this.targetDuration = this.initialTargetDuration;
        this.powerUpActive = false;
        this.precisionMode = false;
        this.timeFreeze = false;
        this.freezeTimeout = null;  // Track the freeze timeout
        this.highScore = localStorage.getItem('highScore') || 0;
        
        // Combo system properties
        this.combo = 0;
        this.comboMultiplier = 1;
        this.lastClickTime = 0;
        this.comboTimeout = 3500; // 3 seconds to maintain combo
        this.comboElement = document.getElementById('combo');

        // DOM Elements
        this.titleScreen = document.getElementById('title-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.livesElement = document.getElementById('lives');
        this.finalScoreElement = document.getElementById('final-score');
        this.highScoreElement = document.getElementById('high-score');

        // Event Listeners
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('restart-button').addEventListener('click', () => this.startGame());
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.lives = 2;
        this.timeLeft = 180;
        this.gameActive = true;
        this.spawnInterval = this.initialSpawnInterval;
        this.targetDuration = this.initialTargetDuration;
        this.powerUpActive = false;
        this.precisionMode = false;
        this.timeFreeze = false;
        this.freezeTimeout = null;
        
        // Reset combo system
        this.combo = 0;
        this.comboMultiplier = 1;
        this.lastClickTime = 0;
        this.updateCombo();

        // Update UI
        this.updateScore();
        this.updateLives();
        this.updateTimer();
        this.clearGameArea();

        // Show game screen
        this.titleScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');

        // Start game loops
        this.startSpawnLoop();
        this.startTimer();
    }

    startSpawnLoop() {
        if (!this.gameActive) return;

        const spawnTarget = () => {
            if (!this.gameActive) return;
            this.spawnTarget();
            setTimeout(spawnTarget, this.spawnInterval);
        };

        spawnTarget();
    }

    startTimer() {
        if (!this.gameActive) return;

        // Clear any existing timer interval
        if (this.timerInterval) {
            clearTimeout(this.timerInterval);
        }

        const updateTimer = () => {
            if (!this.gameActive || this.timeFreeze) return;
            this.timeLeft--;
            
            // Calculate new spawn interval and target duration based on remaining time
            const timeProgress = (180 - this.timeLeft) / 180; // Progress from 0 to 1
            this.spawnInterval = this.initialSpawnInterval - 
                (this.initialSpawnInterval - this.finalSpawnInterval) * timeProgress;
            this.targetDuration = this.initialTargetDuration - 
                (this.initialTargetDuration - this.finalTargetDuration) * timeProgress;
            
            this.updateTimer();
            if (this.timeLeft <= 0) {
                this.endGame();
            } else {
                this.timerInterval = setTimeout(updateTimer, 1000);
            }
        };

        updateTimer();
    }

    isPositionValid(x, y, size) {
        // Get all existing targets
        const targets = this.gameArea.getElementsByClassName('target');
        
        // Check each existing target for overlap
        for (const target of targets) {
            const targetX = parseFloat(target.style.left);
            const targetY = parseFloat(target.style.top);
            const targetSize = target.classList.contains('giant') ? 60 : 30;
            
            // Calculate distance between centers
            const dx = x - targetX;
            const dy = y - targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If distance is less than combined radii, position is invalid
            if (distance < (size + targetSize) / 2) {
                return false;
            }
        }
        
        return true;
    }

    spawnTarget() {
        const target = document.createElement('div');
        target.className = 'target';

        // Determine target size based on type
        let targetSize;
        const random = Math.random();
        if (random < 0.6) {                     // 60% chance for regular target
            target.classList.add('regular');
            targetSize = 30;
            target.addEventListener('click', () => this.handleRegularClick(target));
        } else if (random < 0.8) {              // 20% chance for bomb target
            target.classList.add('bomb');
            targetSize = 30;
            target.addEventListener('click', () => this.handleBomb(target));
        } else if (random < 0.85) {             // 5% chance for score multiplier target
            target.classList.add('score-multiplier');
            targetSize = 30;
            target.addEventListener('click', () => this.handleScoreMultiplier(target));
        } else if (random < 0.90) {             // 5% chance for time freeze target
            target.classList.add('time-freeze');
            targetSize = 30;
            target.addEventListener('click', () => this.handleTimeFreeze(target));
        } else if (random < 0.92) {            // 2% chance for precision mode target
            target.classList.add('precision-mode');
            targetSize = 30;
            target.addEventListener('click', () => this.handlePrecisionMode(target));
        } else if (random < 0.95 && this.lives < 2) { // 3% chance for extra life target
            target.classList.add('extra-life');
            targetSize = 30;
            target.addEventListener('click', () => this.handleExtraLife(target));
        } else if (random < 0.98) {            // 3% chance for giant target
            target.classList.add('giant');
            targetSize = 60;
            target.addEventListener('click', () => this.handleGiantClick(target));
        }

        // Adjust target size if precision mode is active
        if (this.precisionMode) {
            targetSize *= 1.5; // Make targets 50% larger during precision mode
            target.classList.add('precision-enhanced');
        }

        // Find valid position
        const maxX = this.gameArea.clientWidth - targetSize;
        const hudHeight = 60;
        const maxY = this.gameArea.clientHeight - targetSize - hudHeight;
        
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loop
        
        while (!validPosition && attempts < maxAttempts) {
            const x = Math.random() * maxX;
            const y = Math.random() * maxY + hudHeight;
            
            if (this.isPositionValid(x, y, targetSize)) {
                target.style.left = x + 'px';
                target.style.top = y + 'px';
                validPosition = true;
            }
            attempts++;
        }

        // Only add target if we found a valid position
        if (validPosition) {
            this.gameArea.appendChild(target);

            // Remove target after duration
            setTimeout(() => {
                if (target.parentNode) {
                    target.remove();
                }
            }, this.targetDuration);
        }
    }

    handleRegularClick(target) {
        if (!this.gameActive) return;
        this.handleCombo();
        this.addScore(1 * this.comboMultiplier);
        target.remove();
    }

    handleExtraLife(target) {
        if (!this.gameActive) return;
        if (this.lives < 3) {
            this.lives++;
            this.updateLives();
        }
        target.remove();
    }

    handleBomb(target) {
        if (!this.gameActive) return;
        this.lives--;
        this.updateLives();
        // Reset combo when hitting a bomb
        this.combo = 0;
        this.comboMultiplier = 1;
        this.updateCombo();
        if (this.lives <= 0) {
            this.endGame();
        }
        target.remove();
    }

    handleTimeFreeze(target) {
        if (!this.gameActive) return;
        this.timeFreeze = true;
        const originalSpawnInterval = this.spawnInterval;
        const originalTargetDuration = this.targetDuration;
        this.handleCombo();
        // Clear the current timer interval
        if (this.timerInterval) {
            clearTimeout(this.timerInterval);
        }
        
        this.spawnInterval = this.initialSpawnInterval;
        this.targetDuration = this.initialTargetDuration;

        // Clear existing freeze timeout if any
        if (this.freezeTimeout) {
            clearTimeout(this.freezeTimeout);
        }

        // Set new freeze timeout
        this.freezeTimeout = setTimeout(() => {
            this.timeFreeze = false;
            this.spawnInterval = originalSpawnInterval;
            this.targetDuration = originalTargetDuration;
            
            // Resume the timer
            if (this.gameActive) {
                this.startTimer();
            }
        }, 5000);

        target.remove();
    }

    handlePrecisionMode(target) {
        if (!this.gameActive) return;
        this.precisionMode = true;
        const originalComboMultiplier = this.comboMultiplier;
        
        // Double combo multiplier
        this.comboMultiplier *= 2;

        // Add precision mode class to game area for visual effects
        this.gameArea.classList.add('precision-mode');

        setTimeout(() => {
            this.precisionMode = false;
            this.comboMultiplier = originalComboMultiplier;
            this.gameArea.classList.remove('precision-mode');
        }, 5000);

        target.remove();
    }

    handleScoreMultiplier(target) {
        if (!this.gameActive) return;
        const originalComboMultiplier = this.comboMultiplier;
        this.comboMultiplier *= 2; // Double the combo multiplier
        
        setTimeout(() => {
            this.comboMultiplier = originalComboMultiplier;
        }, 5000);
        
        target.remove();
    }

    handleGiantClick(target) {
        if (!this.gameActive) return;
        this.handleCombo();
        this.addScore(5 * this.comboMultiplier);
        target.remove();
    }

    addScore(points) {
        this.score += points;
        this.updateScore();
    }

    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    updateLives() {
        this.livesElement.textContent = `Lives: ${this.lives}`;
    }

    updateTimer() {
        this.timerElement.textContent = `Time: ${this.timeLeft}`;
    }

    clearGameArea() {
        while (this.gameArea.firstChild) {
            this.gameArea.removeChild(this.gameArea.firstChild);
        }
    }

    endGame() {
        this.gameActive = false;
        this.clearGameArea();

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }

        // Update UI
        this.finalScoreElement.textContent = `Final Score: ${this.score}`;
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;

        // Show game over screen
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.remove('hidden');
    }

    updateCombo() {
        this.comboElement.textContent = `Combo: ${this.combo}x`;
        if (this.combo > 1) {
            this.comboElement.classList.add('active');
        } else {
            this.comboElement.classList.remove('active');
        }
    }

    handleCombo() {
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.comboTimeout) {
            this.combo++;
            // Increase combo multiplier every 3 hits
            this.comboMultiplier = Math.floor(this.combo / 3) + 1;
        } else {
            this.combo = 1;
            this.comboMultiplier = 1;
        }
        this.lastClickTime = currentTime;
        this.updateCombo();
    }
}

// Initialize game when the page loads
window.addEventListener('load', () => {
    new ClickTargetGame();
}); 