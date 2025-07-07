// Category display names for user-friendly messages
const categoryDisplayNames = {
    'ones': 'Ones',
    'twos': 'Twos',
    'threes': 'Threes',
    'fours': 'Fours',
    'fives': 'Fives',
    'sixes': 'Sixes',
    'threeOfAKind': 'Three of a Kind',
    'fourOfAKind': 'Four of a Kind',
    'fullHouse': 'Full House',
    'smallStraight': 'Small Straight',
    'largeStraight': 'Large Straight',
    'yahtzee': 'Yahtzee',
    'chance': 'Chance'
};

// Utility function for screen reader announcements
function announceToScreenReader(message) {
    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    // Remove the announcement after a short delay
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Toast notification function
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    
    const iconClass = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            removeToast(toast);
        }
    }, duration);
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Yahtzee Score Calculator with Player Management

let currentGame = null;
let currentPlayer = null;
let currentScores = {};
let devMode = false;

// Virtual dice enhancement
let diceFrozen = [false, false, false, false, false];
let rollsRemainingInTurn = 3;

// localStorage keys
const STORAGE_KEYS = {
    GAME_STATE: 'yahtzee_game_state',
    DEV_MODE: 'yahtzee_dev_mode'
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Load app configuration from server
    loadAppConfig();
    
    // Get DOM elements
    const gameSetup = document.getElementById('game-setup');
    const gamePlay = document.getElementById('game-play');
    const playerScoreCards = document.getElementById('player-scorecards');
    const leaderboard = document.getElementById('leaderboard');
    
    const startGameBtn = document.getElementById('start-game');
    const newGameBtn = document.getElementById('new-game');
    const resetGameBtn = document.getElementById('reset-game');
    const saveGameBtn = document.getElementById('save-game');
    const playerTabsContainer = document.getElementById('player-tabs');
    const rollDiceBtn = document.getElementById('roll-dice');
    const resetDiceBtn = document.getElementById('reset-dice');
    
    // Developer mode elements
    const devModeToggle = document.getElementById('dev-mode-toggle');
    const quickDemoBtn = document.getElementById('quick-demo');
    const loadSavedGameBtn = document.getElementById('load-saved-game');
    const clearSavedDataBtn = document.getElementById('clear-saved-data');
    
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];

    // Event listeners
    // Handle form submission for starting game
    const playerSetupForm = document.getElementById('player-setup-form');
    playerSetupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        startNewGame();
    });
    
    newGameBtn.addEventListener('click', resetToSetup);
    resetGameBtn.addEventListener('click', resetCurrentGame);
    saveGameBtn.addEventListener('click', saveGameState);
    rollDiceBtn.addEventListener('click', rollRandomDice);
    resetDiceBtn.addEventListener('click', resetDice);
    
    // Developer mode listeners
    devModeToggle.addEventListener('change', toggleDevMode);
    quickDemoBtn.addEventListener('click', createQuickDemo);
    loadSavedGameBtn.addEventListener('click', loadSavedGame);
    clearSavedDataBtn.addEventListener('click', clearSavedData);
    
    // Test dice buttons
    document.querySelectorAll('.test-dice-btn').forEach(btn => {
        btn.addEventListener('click', loadTestDice);
    });
    
    // Dice input listeners
    diceInputs.forEach(input => {
        input.addEventListener('input', updateDiceDisplay);
        input.addEventListener('input', debounce(calculateAllScores, 500));
        
        // Enhanced input validation for mobile
        input.addEventListener('input', validateDiceInput);
        input.addEventListener('keydown', handleDiceKeydown);
        input.addEventListener('paste', handleDicePaste);
        
        // Accessible selection behavior
        input.addEventListener('focus', handleDiceFocus);
        input.addEventListener('blur', handleDiceBlur);
        input.addEventListener('click', handleDiceClick);
    });
    
    // Use score button listeners
    document.querySelectorAll('.use-score-btn').forEach(btn => {
        btn.addEventListener('click', useScore);
    });
    
    // Initialize die edit modal
    initializeDieEditModal();
    
    // Initialize score confirmation modal
    initializeScoreConfirmationModal();
    
    // Initialize virtual dice display
    updateRollsDisplay();
    updateDiceFreezeDisplay();

    // Initialize display
    updateDiceDisplay();
    
    // Try to load saved game on startup
    tryLoadSavedGame();
}

async function startNewGame() {
    const playerInputs = [
        document.getElementById('player1'),
        document.getElementById('player2'),
        document.getElementById('player3'),
        document.getElementById('player4')
    ];
    
    // Check if at least one player name is provided
    const player1Name = playerInputs[0].value.trim();
    
    if (!player1Name) {
        showToast('Please enter at least one player name!', 'warning');
        playerInputs[0].focus();
        return;
    }
    
    const players = playerInputs
        .map(input => input.value.trim())
        .filter(name => name.length > 0);
    
    try {
        const response = await fetch('/api/game/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ players })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showToast('Error creating game: ' + data.error, 'error');
            return;
        }
        
        currentGame = data;
        setupGamePlay();
        showToast(`Game started with ${players.length} player${players.length !== 1 ? 's' : ''}!`, 'success');
        
    } catch (error) {
        console.error('Error creating game:', error);
        showToast('Error creating game. Please try again.', 'error');
    }
}

function setupGamePlay() {
    // Hide setup, show game play
    document.getElementById('game-setup').style.display = 'none';
    document.getElementById('game-play').style.display = 'block';
    document.getElementById('player-scorecards').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    
    // Create player tabs
    const playerTabsContainer = document.getElementById('player-tabs');
    playerTabsContainer.innerHTML = '';
    
    currentGame.players.forEach(player => {
        const tabButton = document.createElement('button');
        tabButton.className = 'player-tab';
        tabButton.textContent = player.name;
        tabButton.dataset.playerName = player.name;
        tabButton.addEventListener('click', () => switchToPlayer(player.name));
        playerTabsContainer.appendChild(tabButton);
    });
    
    // Auto-select the first player
    if (currentGame.players.length > 0) {
        currentPlayer = currentGame.players[0].name;
        updateActivePlayerTab();
        
        // Update use score buttons for the first player
        updateUseScoreButtons(currentGame.players[0].scorecard);
        
        // Reset dice when starting new game
        resetDice();
    }
    
    // Update scorecards display
    updateScorecardsDisplay();
    updateLeaderboard();
    
    // Show sticky header
    updateStickyHeader();
}

function switchToPlayer(playerName) {
    currentPlayer = playerName;
    updateActivePlayerTab();
    
    // Update use score buttons based on current player's scorecard
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player) {
            updateUseScoreButtons(player.scorecard);
        }
    }
    
    // Update sticky header
    updateStickyHeader();
}

function updateActivePlayerTab() {
    const playerTabs = document.querySelectorAll('.player-tab');
    playerTabs.forEach(tab => {
        if (tab.dataset.playerName === currentPlayer) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

function updateUseScoreButtons(scorecard) {
    document.querySelectorAll('.use-score-btn').forEach(btn => {
        const category = btn.dataset.category;
        
        // Special handling for Yahtzee - allow multiple if current roll is a Yahtzee
        if (category === 'yahtzee' && scorecard[category] !== undefined) {
            const dice = getDiceValues();
            const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
            
            if (isCurrentRollYahtzee) {
                btn.disabled = false;
                btn.textContent = 'Bonus!';
                btn.style.backgroundColor = '#ffc107';
                btn.style.color = '#000';
            } else {
                btn.disabled = true;
                btn.textContent = 'Used';
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
        } else if (scorecard[category] !== undefined) {
            btn.disabled = true;
            btn.textContent = 'Used';
            btn.style.backgroundColor = '';
            btn.style.color = '';
        } else {
            btn.disabled = false;
            btn.textContent = 'Use';
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }
    });
}

function resetToSetup() {
    document.getElementById('game-setup').style.display = 'block';
    document.getElementById('game-play').style.display = 'none';
    document.getElementById('player-scorecards').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    
    currentGame = null;
    currentPlayer = null;
    currentScores = {};
    
    // Clear player inputs
    document.querySelectorAll('.player-inputs input').forEach(input => {
        input.value = '';
    });
    
    // Clear dice
    document.querySelectorAll('.dice-container input').forEach(input => {
        input.value = '';
    });
    
    updateDiceDisplay();
    
    // Hide sticky header
    updateStickyHeader();
    clearAllScores();
}

function getDiceValues() {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    return diceInputs.map(input => {
        const value = parseInt(input.value);
        return isNaN(value) || value < 1 || value > 6 ? 0 : value;
    });
}

function updateDiceDisplay() {
    const dice = getDiceValues();
    const diceElements = document.querySelectorAll('.dice-visual .die');
    
    diceElements.forEach((die, index) => {
        const value = dice[index];
        
        // Update die value and styling
        if (value > 0) {
            die.innerHTML = `<i class="${getDiceSymbol(value)}"></i>`;
            die.style.backgroundColor = '#4CAF50';
            die.style.color = 'white';
        } else {
            die.innerHTML = '<i class="fas fa-question"></i>';
            die.style.backgroundColor = 'white';
            die.style.color = '#333';
        }
        
        // Update frozen state
        if (diceFrozen[index]) {
            die.classList.add('frozen');
        } else {
            die.classList.remove('frozen');
        }
    });
    
    // Re-attach die modal event listeners after updating innerHTML
    attachDieModalListeners();
    
    // Update use score buttons to handle multiple Yahtzees
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            updateUseScoreButtons(player.scorecard);
        }
    }
    
    // Update sticky header dice display
    updateStickyDiceDisplay();
}

function getDiceSymbol(value) {
    const icons = {
        1: 'fas fa-dice-one',
        2: 'fas fa-dice-two',
        3: 'fas fa-dice-three',
        4: 'fas fa-dice-four',
        5: 'fas fa-dice-five',
        6: 'fas fa-dice-six'
    };
    return icons[value] || 'fas fa-question';
}

function rollRandomDice() {
    if (rollsRemainingInTurn <= 0) {
        alert('No rolls remaining! Reset dice to start a new turn.');
        return;
    }
    
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    // Only roll dice that aren't frozen
    diceInputs.forEach((input, index) => {
        if (!diceFrozen[index]) {
            input.value = Math.floor(Math.random() * 6) + 1;
        }
    });
    
    // Decrease rolls remaining
    rollsRemainingInTurn--;
    updateRollsDisplay();
    
    updateDiceDisplay();
    calculateAllScores();
}

function resetDice() {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    diceInputs.forEach(input => {
        input.value = '';
    });
    
    // Reset virtual dice state
    diceFrozen = [false, false, false, false, false];
    rollsRemainingInTurn = 3;
    updateRollsDisplay();
    updateDiceFreezeDisplay();
    
    updateDiceDisplay();
    clearAllScores();
}

// Virtual dice helper functions
function updateRollsDisplay() {
    // Update the roll dice button text to show remaining rolls
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        if (rollsRemainingInTurn > 0) {
            rollButton.innerHTML = `<i class="fas fa-dice"></i> Roll Dice (${rollsRemainingInTurn} left)`;
            rollButton.disabled = false;
        } else {
            rollButton.innerHTML = `<i class="fas fa-dice"></i> No Rolls Left`;
            rollButton.disabled = true;
        }
    }
    
    // Update sticky header
    updateStickyHeader();
}

function updateDiceFreezeDisplay() {
    const diceElements = document.querySelectorAll('.dice-visual .die');
    diceElements.forEach((die, index) => {
        if (diceFrozen[index]) {
            die.classList.add('frozen');
        } else {
            die.classList.remove('frozen');
        }
    });
}

function toggleDiceFreeze(index) {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    // Only allow freezing if the die has a value
    if (!diceInputs[index].value) {
        return;
    }
    
    diceFrozen[index] = !diceFrozen[index];
    updateDiceFreezeDisplay();
}

// Enhanced dice input validation for mobile
function validateDiceInput(event) {
    const input = event.target;
    let value = input.value;
    
    // Remove any non-numeric characters except empty
    value = value.replace(/[^1-6]/g, '');
    
    // Limit to single digit and ensure it's 1-6
    if (value.length > 1) {
        value = value.slice(-1); // Keep only the last digit
    }
    
    // Ensure value is between 1-6
    if (value && (parseInt(value) < 1 || parseInt(value) > 6)) {
        value = '';
    }
    
    input.value = value;
}

function handleDiceFocus(event) {
    const input = event.target;
    
    // Only auto-select if the user clicked on the input
    // This preserves keyboard navigation behavior for screen readers
    if (event.relatedTarget && event.relatedTarget.tagName !== 'INPUT') {
        // Coming from non-input element (likely clicked), select all
        setTimeout(() => {
            input.select();
        }, 0);
    }
    
    // Add visual focus indicator for accessibility
    input.setAttribute('aria-selected', 'true');
}

function handleDiceBlur(event) {
    const input = event.target;
    // Remove the selection indicator when focus leaves
    input.removeAttribute('aria-selected');
}

function handleDiceClick(event) {
    const input = event.target;
    
    // Only select all if the field has content and user clicked
    if (input.value && !input.dataset.hasBeenClicked) {
        setTimeout(() => {
            input.select();
        }, 0);
        input.dataset.hasBeenClicked = 'true';
        
        // Reset the flag after a short delay
        setTimeout(() => {
            delete input.dataset.hasBeenClicked;
        }, 200);
    }
}

function handleDiceKeydown(event) {
    const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight',
        'ArrowUp', 'ArrowDown', '1', '2', '3', '4', '5', '6'
    ];
    
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey || event.metaKey) {
        return;
    }
    
    // Prevent invalid keys
    if (!allowedKeys.includes(event.key)) {
        event.preventDefault();
    }
    
    // Handle arrow key navigation between dice
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
        const currentIndex = Array.from(document.querySelectorAll('.dice-container input')).indexOf(event.target);
        if (currentIndex < 4) {
            document.querySelectorAll('.dice-container input')[currentIndex + 1].focus();
        }
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    }
    
    if (event.key === 'ArrowLeft') {
        const currentIndex = Array.from(document.querySelectorAll('.dice-container input')).indexOf(event.target);
        if (currentIndex > 0) {
            document.querySelectorAll('.dice-container input')[currentIndex - 1].focus();
        }
    }
}

function handleDicePaste(event) {
    event.preventDefault();
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    
    // Extract valid dice numbers from pasted text
    const validNumbers = pastedText.match(/[1-6]/g);
    
    if (validNumbers) {
        const diceInputs = document.querySelectorAll('.dice-container input');
        const startIndex = Array.from(diceInputs).indexOf(event.target);
        
        validNumbers.slice(0, 5 - startIndex).forEach((num, index) => {
            if (startIndex + index < diceInputs.length) {
                diceInputs[startIndex + index].value = num;
            }
        });
        
        updateDiceDisplay();
        calculateAllScores();
    }
}

async function calculateAllScores() {
    const dice = getDiceValues();
    
    // Check if all dice have valid values
    if (dice.some(d => d === 0)) {
        clearAllScores();
        return;
    }

    try {
        const response = await fetch(`/api/calculate-all?dice=${dice.join(',')}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error calculating scores:', data.error);
            return;
        }

        currentScores = data.scores;
        updateScoreDisplay(data.scores);
        
    } catch (error) {
        console.error('Error fetching scores:', error);
    }
}

function updateScoreDisplay(scores) {
    Object.keys(scores).forEach(category => {
        const scoreElement = document.getElementById(`${category}-score`);
        if (scoreElement) {
            scoreElement.textContent = scores[category];
            
            // Add visual feedback for good scores
            if (scores[category] > 0) {
                scoreElement.style.backgroundColor = '#e8f5e8';
                scoreElement.style.color = '#2e7d32';
            } else {
                scoreElement.style.backgroundColor = '#ffebee';
                scoreElement.style.color = '#c62828';
            }
        }
    });
    
    // Update use score buttons to handle multiple Yahtzees
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            updateUseScoreButtons(player.scorecard);
        }
    }
    
    // Check for potential bonus Yahtzee
    updateBonusYahtzeeDisplay();
}

function updateBonusYahtzeeDisplay() {
    const dice = getDiceValues();
    const bonusYahtzeeElement = document.getElementById('bonus-yahtzee-score');
    
    if (!bonusYahtzeeElement) return;
    
    // Check if current player has a Yahtzee in their scorecard
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            const hasYahtzee = player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0;
            const bonusYahtzees = player.scorecard.bonusYahtzees || 0;
            const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
            
            // Update bonus Yahtzee display
            bonusYahtzeeElement.textContent = `${bonusYahtzees} × 100 = ${bonusYahtzees * 100}`;
            
            // Show potential bonus if current roll is a Yahtzee and player has a Yahtzee
            if (isCurrentRollYahtzee && hasYahtzee) {
                bonusYahtzeeElement.style.backgroundColor = '#fff3cd';
                bonusYahtzeeElement.style.color = '#856404';
                bonusYahtzeeElement.parentElement.style.borderColor = '#ffc107';
                
                // Show notification
                const notification = bonusYahtzeeElement.parentElement.querySelector('.bonus-notification');
                if (!notification) {
                    const notificationDiv = document.createElement('div');
                    notificationDiv.className = 'bonus-notification';
                    notificationDiv.style.cssText = 'font-size: 12px; color: #856404; font-weight: bold; margin-top: 5px;';
                    notificationDiv.textContent = 'Bonus Yahtzee available! (+100 points)';
                    bonusYahtzeeElement.parentElement.appendChild(notificationDiv);
                }
            } else {
                bonusYahtzeeElement.style.backgroundColor = '#f0f8ff';
                bonusYahtzeeElement.style.color = '#333';
                bonusYahtzeeElement.parentElement.style.borderColor = '#4CAF50';
                
                // Remove notification
                const notification = bonusYahtzeeElement.parentElement.querySelector('.bonus-notification');
                if (notification) {
                    notification.remove();
                }
            }
        }
    }
}

function clearAllScores() {
    const categories = [
        'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
        'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight',
        'largeStraight', 'yahtzee', 'chance'
    ];
    
    categories.forEach(category => {
        const scoreElement = document.getElementById(`${category}-score`);
        if (scoreElement) {
            scoreElement.textContent = '0';
            scoreElement.style.backgroundColor = '#e8f5e8';
            scoreElement.style.color = '#4CAF50';
        }
    });
}

async function useScore(event) {
    const category = event.target.dataset.category;
    
    if (!currentPlayer) {
        alert('Please select a player first!');
        return;
    }
    
    if (!currentGame) {
        alert('No game in progress!');
        return;
    }
    
    const score = currentScores[category] || 0;
    const dice = getDiceValues();
    
    // Check if all dice have valid values
    if (dice.some(d => d === 0)) {
        alert('Please set all dice values before scoring!');
        return;
    }
    
    // Show score confirmation dialog
    showScoreConfirmationDialog(category, score, dice);
}

// Submit score to server (called after confirmation)
async function submitScore(category, score, dice) {
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: currentPlayer,
                category: category,
                score: score,
                dice: dice
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error recording score: ' + data.error);
            return;
        }
        
        // Update the current game data
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player) {
            player.scorecard = data.scorecard;
            player.finalScore = data.finalScore;
        }
        
        // Update displays
        updateUseScoreButtons(data.scorecard);
        updateScorecardsDisplay();
        updateLeaderboard();
        
        // Auto-switch to next player for smoother gameplay
        switchToNextPlayer();
        
        return data; // Return data for confirmation dialog
        
    } catch (error) {
        console.error('Error recording score:', error);
        alert('Error recording score. Please try again.');
        throw error;
    }
}

function switchToNextPlayer() {
    if (!currentGame || !currentPlayer) return;
    
    // Find current player index
    const currentPlayerIndex = currentGame.players.findIndex(p => p.name === currentPlayer);
    
    // Calculate next player index (cycle back to 0 if at end)
    const nextPlayerIndex = (currentPlayerIndex + 1) % currentGame.players.length;
    const nextPlayer = currentGame.players[nextPlayerIndex];
    
    // Update current player and refresh UI
    currentPlayer = nextPlayer.name;
    updateActivePlayerTab();
    switchToPlayer(nextPlayer.name);
    
    // Reset dice for the new player's turn
    resetDice();
}

function updateScorecardsDisplay() {
    const container = document.getElementById('scorecards-container');
    container.innerHTML = '';
    
    if (!currentGame) return;
    
    currentGame.players.forEach(player => {
        const scorecard = createScorecardElement(player);
        container.appendChild(scorecard);
    });
    
    // Add event listeners for edit, clear, and add score buttons
    document.querySelectorAll('.edit-score-btn').forEach(btn => {
        btn.addEventListener('click', handleEditScore);
    });
    
    document.querySelectorAll('.clear-score-btn').forEach(btn => {
        btn.addEventListener('click', handleClearScore);
    });
    
    document.querySelectorAll('.add-score-btn').forEach(btn => {
        btn.addEventListener('click', handleAddScore);
    });
}

async function handleEditScore(event) {
    const playerName = event.target.dataset.player;
    const category = event.target.dataset.category;
    const player = currentGame.players.find(p => p.name === playerName);
    
    if (!player) return;
    
    const currentScore = player.scorecard[category];
    const displayName = categoryDisplayNames[category] || category;
    
    const newScore = prompt(
        `Edit score for ${displayName} (${playerName}):\n\nCurrent score: ${currentScore}`,
        currentScore
    );
    
    if (newScore === null) return; // User cancelled
    
    const parsedScore = parseInt(newScore);
    if (isNaN(parsedScore) || parsedScore < 0) {
        alert('Please enter a valid score (0 or positive number).');
        return;
    }
    
    // Update the score on the server
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                category: category,
                score: parsedScore
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error updating score: ' + data.error);
            return;
        }
        
        // Update the current game data
        player.scorecard = data.scorecard;
        player.finalScore = data.finalScore;
        
        // Update displays
        updateScorecardsDisplay();
        updateLeaderboard();
        
        alert(`Score updated: ${parsedScore} points for ${displayName}!`);
        
    } catch (error) {
        console.error('Error updating score:', error);
        alert('Error updating score. Please try again.');
    }
}

async function handleClearScore(event) {
    const playerName = event.target.dataset.player;
    const category = event.target.dataset.category;
    const player = currentGame.players.find(p => p.name === playerName);
    
    if (!player) return;
    
    const displayName = categoryDisplayNames[category] || category;
    const currentScore = player.scorecard[category];
    
    if (!confirm(`Clear ${displayName} score for ${playerName}?\n\nCurrent score: ${currentScore}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    // Clear the score on the server
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/clear-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                category: category
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error clearing score: ' + data.error);
            return;
        }
        
        // Update the current game data
        player.scorecard = data.scorecard;
        player.finalScore = data.finalScore;
        
        // Update displays
        updateScorecardsDisplay();
        updateLeaderboard();
        
        // Update use score buttons if this is the current player
        if (playerName === currentPlayer) {
            updateUseScoreButtons(data.scorecard);
        }
        
        alert(`${displayName} score cleared for ${playerName}!`);
        
    } catch (error) {
        console.error('Error clearing score:', error);
        alert('Error clearing score. Please try again.');
    }
}

async function handleAddScore(event) {
    const playerName = event.target.dataset.player;
    const category = event.target.dataset.category;
    const player = currentGame.players.find(p => p.name === playerName);
    
    if (!player) return;
    
    // Check if category already has a score
    if (player.scorecard[category] !== undefined) {
        alert('This category already has a score. Use the edit button to modify it.');
        return;
    }
    
    const displayName = categoryDisplayNames[category] || category;
    
    // Define set values for specific categories
    const setValues = {
        'threeOfAKind': 'Sum of all dice',
        'fourOfAKind': 'Sum of all dice', 
        'fullHouse': 25,
        'smallStraight': 30,
        'largeStraight': 40,
        'yahtzee': 50,
        'chance': 'Sum of all dice'
    };
    
    // Define editable categories (upper section + chance)
    const editableCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'chance'];
    
    let promptMessage = `Add score for ${displayName} (${playerName}):\n\n`;
    let newScore;
    
    if (editableCategories.includes(category)) {
        // Allow manual entry for upper section and chance
        promptMessage += 'Enter the score you want to add:';
        newScore = prompt(promptMessage, '');
        
        if (newScore === null) return; // User cancelled
        
        if (newScore.trim() === '') {
            alert('Please enter a score or cancel.');
            return;
        }
        
        const parsedScore = parseInt(newScore);
        if (isNaN(parsedScore) || parsedScore < 0) {
            alert('Please enter a valid score (0 or positive number).');
            return;
        }
        
        await addScoreToServer(playerName, category, parsedScore);
        
    } else {
        // For categories with set values, show the set value and ask for confirmation
        const setValue = setValues[category];
        if (setValue === 'Sum of all dice') {
            promptMessage += `This category uses the sum of all dice.\nEnter the sum of your dice:`;
            newScore = prompt(promptMessage, '');
            
            if (newScore === null) return; // User cancelled
            
            if (newScore.trim() === '') {
                alert('Please enter the sum of your dice or cancel.');
                return;
            }
            
            const parsedScore = parseInt(newScore);
            if (isNaN(parsedScore) || parsedScore < 5 || parsedScore > 30) {
                alert('Please enter a valid sum of dice (5-30).');
                return;
            }
            
            await addScoreToServer(playerName, category, parsedScore);
            
        } else {
            // Fixed value categories
            promptMessage += `This category has a fixed value of ${setValue} points.\nAdd this score?`;
            if (confirm(promptMessage)) {
                await addScoreToServer(playerName, category, setValue);
            }
        }
    }
}

async function addScoreToServer(playerName, category, score) {
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                category: category,
                score: score
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error adding score: ' + data.error);
            return;
        }
        
        // Update the current game data
        const player = currentGame.players.find(p => p.name === playerName);
        if (player) {
            player.scorecard = data.scorecard;
            player.finalScore = data.finalScore;
        }
        
        // Update displays
        updateScorecardsDisplay();
        updateLeaderboard();
        
        // Update use score buttons if this is the current player
        if (playerName === currentPlayer) {
            updateUseScoreButtons(data.scorecard);
        }
        
        const displayName = categoryDisplayNames[category] || category;
        alert(`Score added: ${score} points for ${displayName}!`);
        
    } catch (error) {
        console.error('Error adding score:', error);
        alert('Error adding score. Please try again.');
    }
}

function createScorecardElement(player) {
    const scorecard = document.createElement('div');
    scorecard.className = 'scorecard';
    
    const categories = [
        { name: 'ones', display: 'Ones' },
        { name: 'twos', display: 'Twos' },
        { name: 'threes', display: 'Threes' },
        { name: 'fours', display: 'Fours' },
        { name: 'fives', display: 'Fives' },
        { name: 'sixes', display: 'Sixes' },
        { name: 'threeOfAKind', display: '3 of a Kind' },
        { name: 'fourOfAKind', display: '4 of a Kind' },
        { name: 'fullHouse', display: 'Full House' },
        { name: 'smallStraight', display: 'Small Straight' },
        { name: 'largeStraight', display: 'Large Straight' },
        { name: 'yahtzee', display: 'Yahtzee' },
        { name: 'chance', display: 'Chance' }
    ];
    
    let html = `<h3>${player.name}</h3><div class="scorecard-grid">`;
    
    // Calculate upper section totals for bonus tracking
    const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    let upperTotal = 0;
    let upperUsedCount = 0;
    
    upperCategories.forEach(cat => {
        if (player.scorecard[cat] !== undefined) {
            upperTotal += player.scorecard[cat];
            upperUsedCount++;
        }
    });
    
    categories.forEach(category => {
        const score = player.scorecard[category.name];
        const isUsed = score !== undefined;
        
        html += `
            <div class="scorecard-item ${isUsed ? 'used' : ''}">
                <span>${category.display}</span>
                <span>${isUsed ? score : '-'}</span>
                ${isUsed ? `
                    <div class="scorecard-actions">
                        <button class="edit-score-btn" data-player="${player.name}" data-category="${category.name}" title="Edit score">✏️</button>
                        <button class="clear-score-btn" data-player="${player.name}" data-category="${category.name}" title="Clear score">🗑️</button>
                    </div>
                ` : `
                    <div class="scorecard-actions">
                        <button class="add-score-btn" data-player="${player.name}" data-category="${category.name}" title="Add score">➕</button>
                    </div>
                `}
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add upper section bonus tracking
    const bonusThreshold = 63;
    const bonusAmount = 35;
    const pointsNeeded = Math.max(0, bonusThreshold - upperTotal);
    const remainingCategories = 6 - upperUsedCount;
    
    if (upperUsedCount < 6) {
        html += `
            <div class="bonus-tracker">
                <h4>Upper Section Bonus</h4>
                <div class="bonus-info">
                    <div>Current: ${upperTotal}/63 points</div>
                    <div>Need: ${pointsNeeded} more points</div>
                    <div>Bonus: 35 points (if 63+ achieved)</div>
                    ${remainingCategories > 0 ? `<div>Categories left: ${remainingCategories}</div>` : ''}
                    ${pointsNeeded > 0 && remainingCategories > 0 ? 
                        `<div>Average needed: ${Math.ceil(pointsNeeded / remainingCategories)} per category</div>` : ''}
                </div>
            </div>
        `;
    }
    
    if (player.finalScore) {
        html += `
            <div class="final-score">
                <div>Upper: ${player.finalScore.upperTotal} + Bonus: ${player.finalScore.upperBonus}</div>
                <div>Lower: ${player.finalScore.lowerTotal}</div>
                ${player.finalScore.bonusYahtzees > 0 ? 
                    `<div>Bonus Yahtzees: ${player.finalScore.bonusYahtzees} × 100 = ${player.finalScore.bonusYahtzeeScore}</div>` : ''}
                <div>Total: ${player.finalScore.totalScore}</div>
            </div>
        `;
    }
    
    scorecard.innerHTML = html;
    return scorecard;
}

async function updateLeaderboard() {
    if (!currentGame) return;
    
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/leaderboard`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error fetching leaderboard:', data.error);
            return;
        }
        
        const container = document.getElementById('leaderboard-container');
        
        if (data.leaderboard.length === 0) {
            container.innerHTML = '<p>No scores recorded yet.</p>';
            return;
        }
        
        let html = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Total Score</th>
                        <th>Upper</th>
                        <th>Bonus</th>
                        <th>Lower</th>
                        <th>Yahtzee Bonus</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.leaderboard.forEach(player => {
            const rankClass = player.rank <= 3 ? `rank-${player.rank}` : '';
            const bonusYahtzees = player.bonusYahtzees || 0;
            const bonusYahtzeeScore = player.bonusYahtzeeScore || 0;
            html += `
                <tr class="${rankClass}">
                    <td>${player.rank}</td>
                    <td>${player.name}</td>
                    <td>${player.totalScore}</td>
                    <td>${player.upperTotal}</td>
                    <td>${player.upperBonus}</td>
                    <td>${player.lowerTotal}</td>
                    <td>${bonusYahtzees > 0 ? `${bonusYahtzees} × 100` : '-'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Sticky header functionality
function updateStickyHeader() {
    const stickyHeader = document.getElementById('sticky-header');
    const stickyPlayerName = document.getElementById('sticky-player-name');
    const stickyRollsRemaining = document.getElementById('sticky-rolls-remaining');
    const stickyDiceMini = document.getElementById('sticky-dice-mini');
    
    if (currentGame && currentPlayer) {
        // Show sticky header
        stickyHeader.style.display = 'block';
        document.body.classList.add('sticky-header-visible');
        
        // Update player name
        stickyPlayerName.textContent = currentPlayer;
        
        // Update rolls remaining
        const rollsText = rollsRemainingInTurn === 1 ? '1 roll left' : `${rollsRemainingInTurn} rolls left`;
        stickyRollsRemaining.textContent = rollsText;
        
        // Update mini dice display
        updateStickyDiceDisplay();
    } else {
        // Hide sticky header
        stickyHeader.style.display = 'none';
        document.body.classList.remove('sticky-header-visible');
    }
}

function updateStickyDiceDisplay() {
    const stickyDiceMini = document.getElementById('sticky-dice-mini');
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    const miniDice = stickyDiceMini.querySelectorAll('.mini-die');
    
    diceInputs.forEach((input, index) => {
        const miniDie = miniDice[index];
        const value = parseInt(input.value);
        
        if (value >= 1 && value <= 6) {
            miniDie.innerHTML = `<i class="fas fa-dice-${getDiceIcon(value)}"></i>`;
        } else {
            miniDie.innerHTML = '<i class="fas fa-question"></i>';
        }
        
        // Show frozen state
        if (diceFrozen[index]) {
            miniDie.classList.add('frozen');
        } else {
            miniDie.classList.remove('frozen');
        }
    });
}

function getDiceIcon(value) {
    const icons = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    return icons[value] || '';
}

// Developer Mode Functions
async function loadAppConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        devMode = config.devMode;
        
        // Update UI based on server configuration
        const devModeToggle = document.getElementById('dev-mode-toggle');
        if (devModeToggle) {
            devModeToggle.checked = devMode;
            // Hide the toggle since it's now controlled by environment variable
            devModeToggle.parentElement.style.display = 'none';
        }
        
        if (devMode) {
            showDevModeFeatures();
        } else {
            hideDevModeFeatures();
        }
    } catch (error) {
        console.error('Error loading app config:', error);
        // Fallback to false if can't load from server
        devMode = false;
        hideDevModeFeatures();
    }
}

function loadDevModeState() {
    const savedDevMode = localStorage.getItem(STORAGE_KEYS.DEV_MODE);
    if (savedDevMode === 'true') {
        devMode = true;
        document.getElementById('dev-mode-toggle').checked = true;
        showDevModeFeatures();
    }
}

function toggleDevMode() {
    devMode = document.getElementById('dev-mode-toggle').checked;
    localStorage.setItem(STORAGE_KEYS.DEV_MODE, devMode.toString());
    
    if (devMode) {
        showDevModeFeatures();
    } else {
        hideDevModeFeatures();
    }
}

function showDevModeFeatures() {
    document.querySelectorAll('.dev-mode-section').forEach(section => {
        section.style.display = 'block';
    });
}

function hideDevModeFeatures() {
    document.querySelectorAll('.dev-mode-section').forEach(section => {
        section.style.display = 'none';
    });
}

async function createQuickDemo() {
    // Create a demo game with test players
    const demoPlayers = ['Alice', 'Bob', 'Charlie'];
    
    try {
        // Actually create the game on the server
        const response = await fetch('/api/game/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ players: demoPlayers })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error creating demo game: ' + data.error);
            return;
        }
        
        currentGame = data;
        setupGamePlay();
        
        // Show success message
        alert('Demo game created with players: ' + demoPlayers.join(', '));
        
    } catch (error) {
        console.error('Error creating demo game:', error);
        alert('Error creating demo game. Please try again.');
    }
}

function saveGameState() {
    if (!currentGame) {
        alert('No game to save!');
        return;
    }
    
    const gameState = {
        currentGame: currentGame,
        currentPlayer: currentPlayer,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(gameState));
    alert('Game saved successfully!');
}

function loadSavedGame() {
    const savedState = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (!savedState) {
        alert('No saved game found!');
        return;
    }
    
    try {
        const gameState = JSON.parse(savedState);
        currentGame = gameState.currentGame;
        currentPlayer = gameState.currentPlayer;
        
        setupGamePlay();
        
        // Restore current player selection
        if (currentPlayer) {
            updateActivePlayerTab();
            switchToPlayer(currentPlayer);
        }
        
        alert('Game loaded successfully!');
    } catch (error) {
        alert('Error loading saved game: ' + error.message);
    }
}

function tryLoadSavedGame() {
    // Auto-load saved game if in dev mode
    if (devMode) {
        const savedState = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
        if (savedState) {
            try {
                const gameState = JSON.parse(savedState);
                currentGame = gameState.currentGame;
                currentPlayer = gameState.currentPlayer;
                
                setupGamePlay();
                
                if (currentPlayer) {
                    updateActivePlayerTab();
                    switchToPlayer(currentPlayer);
                }
            } catch (error) {
                console.log('Could not auto-load saved game:', error);
            }
        }
    }
}

function clearSavedData() {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    alert('Saved game data cleared!');
}

function resetCurrentGame() {
    if (!currentGame) {
        alert('No game to reset!');
        return;
    }
    
    if (confirm('Are you sure you want to reset the current game? All scores will be lost.')) {
        // Reset all player scorecards
        currentGame.players.forEach(player => {
            player.scorecard = {};
            player.finalScore = null;
        });
        
        // Update displays
        updateScorecardsDisplay();
        updateLeaderboard();
        
        // Reset use score buttons
        document.querySelectorAll('.use-score-btn').forEach(btn => {
            btn.disabled = false;
            btn.textContent = 'Use';
        });
        
        alert('Game reset successfully!');
    }
}

function loadTestDice(event) {
    const diceString = event.target.dataset.dice;
    const diceValues = diceString.split(',').map(Number);
    
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    diceInputs.forEach((input, index) => {
        input.value = diceValues[index];
    });
    
    updateDiceDisplay();
    calculateAllScores();
}

// Die edit modal functionality
let currentEditingDie = null;

function attachDieModalListeners() {
    // Add click listeners to dice
    const diceElements = document.querySelectorAll('.dice-visual .die');
    
    diceElements.forEach((die, index) => {
        // Remove existing listeners to avoid duplicates
        if (die._modalClickHandler) {
            die.removeEventListener('click', die._modalClickHandler);
        }
        
        // Create and store the click handler
        die._modalClickHandler = () => {
            openDieEditModal(index);
        };
        
        die.addEventListener('click', die._modalClickHandler);
    });
}

function initializeDieEditModal() {
    console.log('Initializing die edit modal...');
    const modal = document.getElementById('die-edit-modal');
    const closeBtn = document.getElementById('close-die-modal');
    const doneBtn = document.getElementById('close-die-editor');
    const toggleLockBtn = document.getElementById('toggle-die-lock');
    
    console.log('Modal elements:', { modal: !!modal, closeBtn: !!closeBtn, doneBtn: !!doneBtn, toggleLockBtn: !!toggleLockBtn });
    
    // Initial attachment of die listeners
    attachDieModalListeners();
    
    // Modal close handlers
    if (closeBtn) {
        console.log('Adding close button listener');
        closeBtn.addEventListener('click', (e) => {
            console.log('Close button clicked');
            closeDieEditModal();
        });
    }
    if (doneBtn) {
        console.log('Adding done button listener');
        doneBtn.addEventListener('click', (e) => {
            console.log('Done button clicked');
            closeDieEditModal();
        });
    }
    
    // Click outside to close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDieEditModal();
            }
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeDieEditModal();
        }
    });
    
    // Die value buttons
    const dieValueButtons = document.querySelectorAll('.die-value-btn');
    console.log('Found die value buttons:', dieValueButtons.length);
    dieValueButtons.forEach((btn, index) => {
        console.log(`Adding listener to die value button ${index + 1}`);
        btn.addEventListener('click', (e) => {
            console.log('Die value button clicked:', e.currentTarget.dataset.value);
            const value = parseInt(e.currentTarget.dataset.value);
            if (currentEditingDie !== null) {
                setDieValue(currentEditingDie, value);
            }
        });
    });
    
    // Lock toggle
    if (toggleLockBtn) {
        console.log('Adding lock toggle listener');
        toggleLockBtn.addEventListener('click', (e) => {
            console.log('Lock toggle clicked');
            if (currentEditingDie !== null) {
                toggleDieFreeze(currentEditingDie);
            }
        });
    }
}

function openDieEditModal(dieIndex) {
    currentEditingDie = dieIndex;
    const modal = document.getElementById('die-edit-modal');
    const modalDieDisplay = document.getElementById('modal-die-display');
    const lockBtn = document.getElementById('toggle-die-lock');
    const lockText = document.getElementById('lock-text');
    const lockIcon = lockBtn.querySelector('i');
    
    // Update modal title
    document.getElementById('die-modal-title').textContent = `Edit Die ${dieIndex + 1}`;
    
    // Update die display in modal
    const currentValue = getDiceValues()[dieIndex];
    if (currentValue > 0) {
        modalDieDisplay.innerHTML = `<i class="${getDiceSymbol(currentValue)}"></i>`;
        modalDieDisplay.style.backgroundColor = diceFrozen[dieIndex] ? '#e3f2fd' : '#4CAF50';
        modalDieDisplay.style.color = 'white';
    } else {
        modalDieDisplay.innerHTML = '<i class="fas fa-question"></i>';
        modalDieDisplay.style.backgroundColor = 'white';
        modalDieDisplay.style.color = '#333';
    }
    
    // Update lock button
    if (diceFrozen[dieIndex]) {
        lockBtn.classList.add('locked');
        lockIcon.className = 'fas fa-lock';
        lockText.textContent = 'Unlock Die';
    } else {
        lockBtn.classList.remove('locked');
        lockIcon.className = 'fas fa-unlock';
        lockText.textContent = 'Lock Die';
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus management
    lockBtn.focus();
}

function closeDieEditModal() {
    console.log('closeDieEditModal called');
    const modal = document.getElementById('die-edit-modal');
    const editingDieIndex = currentEditingDie; // Store before clearing
    
    console.log('Modal element:', modal);
    console.log('Current modal display:', modal ? modal.style.display : 'modal not found');
    
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentEditingDie = null;
        
        // Return focus to the die that was being edited
        if (editingDieIndex !== null) {
            const dieElement = document.getElementById(`die-${editingDieIndex + 1}`);
            if (dieElement) {
                dieElement.focus();
            }
        }
        console.log('Modal closed successfully');
    } else {
        console.error('Modal element not found');
    }
}

function setDieValue(dieIndex, value) {
    if (dieIndex === null) return;
    
    // Update the hidden input
    const hiddenInput = document.getElementById(`die${dieIndex + 1}`);
    hiddenInput.value = value;
    
    // Update the visual display
    updateDiceDisplay();
    
    // Update modal display
    const modalDieDisplay = document.getElementById('modal-die-display');
    modalDieDisplay.innerHTML = `<i class="${getDiceSymbol(value)}"></i>`;
    modalDieDisplay.style.backgroundColor = diceFrozen[dieIndex] ? '#e3f2fd' : '#4CAF50';
    modalDieDisplay.style.color = 'white';
    
    // Calculate scores
    calculateAllScores();
    
    // Update sticky header if visible
    updateStickyDiceDisplay();
}

function toggleDieFreeze(dieIndex) {
    if (dieIndex === null) return;
    
    diceFrozen[dieIndex] = !diceFrozen[dieIndex];
    
    // Update main die display
    updateDiceDisplay();
    
    // Update modal display
    const modalDieDisplay = document.getElementById('modal-die-display');
    const currentValue = getDiceValues()[dieIndex];
    if (currentValue > 0) {
        modalDieDisplay.style.backgroundColor = diceFrozen[dieIndex] ? '#e3f2fd' : '#4CAF50';
    }
    
    // Update lock button in modal
    const lockBtn = document.getElementById('toggle-die-lock');
    const lockText = document.getElementById('lock-text');
    const lockIcon = lockBtn.querySelector('i');
    
    if (diceFrozen[dieIndex]) {
        lockBtn.classList.add('locked');
        lockIcon.className = 'fas fa-lock';
        lockText.textContent = 'Unlock Die';
        announceToScreenReader(`Die ${dieIndex + 1} locked`);
    } else {
        lockBtn.classList.remove('locked');
        lockIcon.className = 'fas fa-unlock';
        lockText.textContent = 'Lock Die';
        announceToScreenReader(`Die ${dieIndex + 1} unlocked`);
    }
    
    // Update sticky header
    updateStickyDiceDisplay();
}

// Score Confirmation Dialog Functions
let pendingScoreData = null;

function showScoreConfirmationDialog(category, score, dice) {
    // Store the pending score data
    pendingScoreData = { category, score, dice };
    
    const modal = document.getElementById('score-confirmation-modal');
    const selectedCategory = document.getElementById('selected-category');
    const scorePoints = document.getElementById('score-points');
    const scoreDescription = document.getElementById('score-description');
    const confirmationPlayer = document.getElementById('confirmation-player');
    const rollsUsed = document.getElementById('rolls-used');
    const confirmationDice = document.getElementById('confirmation-dice');
    const bonusInfoSection = document.getElementById('bonus-info-section');
    const bonusMessage = document.getElementById('bonus-message');
    
    // Update category display
    selectedCategory.textContent = categoryDisplayNames[category] || category;
    
    // Update score display
    scorePoints.textContent = score;
    
    // Update score description based on category
    scoreDescription.textContent = getScoreDescription(category, score, dice);
    
    // Update player info
    confirmationPlayer.textContent = currentPlayer;
    rollsUsed.textContent = `Rolls used: ${3 - rollsRemainingInTurn}/3`;
    
    // Update dice display
    updateConfirmationDiceDisplay(dice);
    
    // Check for bonus information
    updateBonusInfo(category, score, dice);
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus on confirm button
    document.getElementById('confirm-score').focus();
}

function updateConfirmationDiceDisplay(dice) {
    const confirmationDice = document.getElementById('confirmation-dice');
    confirmationDice.innerHTML = '';
    
    dice.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = 'confirmation-die';
        die.innerHTML = `<i class="${getDiceSymbol(value)}"></i>`;
        
        if (diceFrozen[index]) {
            die.classList.add('frozen');
        }
        
        confirmationDice.appendChild(die);
    });
}

function getScoreDescription(category, score, dice) {
    const descriptions = {
        'ones': `Sum of all 1s: ${dice.filter(d => d === 1).length} × 1`,
        'twos': `Sum of all 2s: ${dice.filter(d => d === 2).length} × 2`,
        'threes': `Sum of all 3s: ${dice.filter(d => d === 3).length} × 3`,
        'fours': `Sum of all 4s: ${dice.filter(d => d === 4).length} × 4`,
        'fives': `Sum of all 5s: ${dice.filter(d => d === 5).length} × 5`,
        'sixes': `Sum of all 6s: ${dice.filter(d => d === 6).length} × 6`,
        'threeOfAKind': score > 0 ? `Sum of all dice: ${dice.reduce((a, b) => a + b, 0)}` : 'No three of a kind found',
        'fourOfAKind': score > 0 ? `Sum of all dice: ${dice.reduce((a, b) => a + b, 0)}` : 'No four of a kind found',
        'fullHouse': score > 0 ? 'Three of one number + pair of another' : 'No full house found',
        'smallStraight': score > 0 ? 'Four consecutive numbers' : 'No small straight found',
        'largeStraight': score > 0 ? 'Five consecutive numbers' : 'No large straight found',
        'yahtzee': score > 0 ? 'All five dice show the same number!' : 'No Yahtzee found',
        'chance': `Sum of all dice: ${dice.reduce((a, b) => a + b, 0)}`
    };
    
    return descriptions[category] || `Score: ${score} points`;
}

function updateBonusInfo(category, score, dice) {
    const bonusInfoSection = document.getElementById('bonus-info-section');
    const bonusMessage = document.getElementById('bonus-message');
    
    let showBonus = false;
    let message = '';
    
    // Check for Yahtzee bonus
    if (category === 'yahtzee' && score > 0 && currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard && player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0) {
            showBonus = true;
            message = 'Bonus Yahtzee! +100 points will be added to your score!';
        }
    }
    
    // Check for upper section bonus progress
    if (['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].includes(category)) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
            let currentUpperTotal = 0;
            upperCategories.forEach(cat => {
                if (player.scorecard[cat] !== undefined) {
                    currentUpperTotal += player.scorecard[cat];
                }
            });
            
            const projectedTotal = currentUpperTotal + score;
            if (projectedTotal >= 63) {
                showBonus = true;
                message = `Upper section bonus achieved! You'll get +35 bonus points!`;
            } else {
                const remaining = 63 - projectedTotal;
                const remainingCategories = upperCategories.filter(cat => 
                    cat !== category && player.scorecard[cat] === undefined
                ).length;
                
                if (remainingCategories > 0) {
                    showBonus = true;
                    message = `Upper section progress: ${remaining} more points needed for +35 bonus`;
                }
            }
        }
    }
    
    if (showBonus) {
        bonusInfoSection.style.display = 'block';
        bonusMessage.textContent = message;
    } else {
        bonusInfoSection.style.display = 'none';
    }
}

function closeScoreConfirmationDialog() {
    const modal = document.getElementById('score-confirmation-modal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pendingScoreData = null;
}

async function confirmScore() {
    if (!pendingScoreData) return;
    
    const { category, score, dice } = pendingScoreData;
    
    try {
        const data = await submitScore(category, score, dice);
        
        // Close the modal
        closeScoreConfirmationDialog();
        
        // Show success message
        const displayName = categoryDisplayNames[category] || category;
        let message = `Score recorded: ${data.score} points for ${displayName}!`;
        
        // Add bonus information
        if (data.bonusYahtzee) {
            if (data.joker) {
                message += ` (Used as Yahtzee joker - Bonus +${data.bonusPoints || 100} points!)`;
            } else {
                message += ` (Bonus Yahtzee - +${data.bonusPoints || 100} points!)`;
            }
        }
        
        // Show a nice toast notification instead of alert
        showSuccessToast(message);
        
    } catch (error) {
        // Keep modal open if there was an error
        console.error('Error confirming score:', error);
    }
}

function showSuccessToast(message) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2000;
        max-width: 400px;
        font-weight: 500;
        animation: slideInToast 0.3s ease;
    `;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideInToast {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutToast {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutToast 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function initializeScoreConfirmationModal() {
    const modal = document.getElementById('score-confirmation-modal');
    const closeBtn = document.getElementById('close-score-modal');
    const cancelBtn = document.getElementById('cancel-score');
    const confirmBtn = document.getElementById('confirm-score');
    
    // Close button handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', closeScoreConfirmationDialog);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeScoreConfirmationDialog);
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmScore);
    }
    
    // Click outside to close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeScoreConfirmationDialog();
            }
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeScoreConfirmationDialog();
        }
    });
}
