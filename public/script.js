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
    
    // Quick entry functionality
    initializeQuickEntry();
    
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
    
    // Initialize add score modal
    initializeAddScoreModal();
    
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
        const categoryName = categoryDisplayNames[category] || category;
        const scoreElement = document.getElementById(`${category}-score`);
        const currentScore = currentScores[category] || 0;
        
        // Special handling for Yahtzee - allow multiple if current roll is a Yahtzee
        if (category === 'yahtzee' && scorecard[category] !== undefined) {
            const dice = getDiceValues();
            const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
            
            if (isCurrentRollYahtzee) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i> Bonus!';
                btn.style.backgroundColor = '#ffc107';
                btn.style.color = '#000';
                btn.setAttribute('aria-label', `Score bonus Yahtzee for ${currentScore} points in ${categoryName}`);
                btn.className = 'use-score-btn bonus-available';
            } else {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Used';
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.setAttribute('aria-label', `${categoryName} already used`);
                btn.className = 'use-score-btn used';
            }
        } else if (scorecard[category] !== undefined) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Used';
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.setAttribute('aria-label', `${categoryName} already used`);
            btn.className = 'use-score-btn used';
        } else {
            // Check if dice are entered before enabling buttons
            const dice = getDiceValues();
            const allDiceEntered = dice.every(d => d > 0);
            
            if (!allDiceEntered) {
                // No dice entered yet - disable button and show neutral text
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-dice" aria-hidden="true"></i> Roll Dice';
                btn.className = 'use-score-btn';
                btn.setAttribute('aria-label', `Roll dice to see ${categoryName} score`);
                btn.style.backgroundColor = '';
                btn.style.color = '';
            } else {
                // Dice are entered - show appropriate action
                btn.disabled = false;
                
                let buttonClass = 'use-score-btn';
                let ariaLabel = `Score ${currentScore} points in ${categoryName}`;
                
                if (currentScore > 0) {
                    buttonClass += ' available-score';
                    ariaLabel += ' - Available option';
                    btn.innerHTML = `<i class="fas fa-plus" aria-hidden="true"></i> Score`;
                } else {
                    buttonClass += ' zero-score';
                    ariaLabel += ' - Zero points option';
                    btn.innerHTML = `<i class="fas fa-times" aria-hidden="true"></i> Take 0`;
                }
                btn.className = buttonClass;
                btn.setAttribute('aria-label', ariaLabel);
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
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
    // Get current player's scorecard to check which categories are used
    let usedCategories = {};
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            usedCategories = player.scorecard;
        }
    }

    Object.keys(scores).forEach(category => {
        const scoreElement = document.getElementById(`${category}-score`);
        if (scoreElement) {
            // Skip updating score display for used categories
            if (usedCategories[category] !== undefined) {
                // Special handling for Yahtzee - show 100 if this is a bonus Yahtzee
                if (category === 'yahtzee' && currentPlayer && currentGame) {
                    const player = currentGame.players.find(p => p.name === currentPlayer);
                    if (player && player.scorecard) {
                        const dice = getDiceValues();
                        const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
                        
                        // If current roll is a Yahtzee and player already has Yahtzee, show 100
                        if (isCurrentRollYahtzee) {
                            scoreElement.textContent = '100';
                            scoreElement.classList.remove('available', 'zero-option', 'used');
                            scoreElement.classList.add('available');
                            scoreElement.setAttribute('aria-label', `100 points available for bonus Yahtzee`);
                            scoreElement.setAttribute('role', 'status');
                            return;
                        }
                    }
                }
                
                // Show "-" for used categories instead of the actual scored value
                scoreElement.textContent = '-';
                scoreElement.classList.remove('available', 'zero-option');
                scoreElement.classList.add('used');
                scoreElement.setAttribute('aria-label', `already scored in this category`);
                scoreElement.setAttribute('role', 'status');
                return;
            }

            let displayScore = scores[category];
            
            // Special handling for Yahtzee - show 100 if this is a bonus Yahtzee
            if (category === 'yahtzee' && currentPlayer && currentGame) {
                const player = currentGame.players.find(p => p.name === currentPlayer);
                if (player && player.scorecard) {
                    const hasYahtzee = player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0;
                    const dice = getDiceValues();
                    const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
                    
                    // If player already has a Yahtzee and current roll is also a Yahtzee, show 100
                    if (hasYahtzee && isCurrentRollYahtzee && displayScore === 50) {
                        displayScore = 100;
                    }
                }
            }
            
            scoreElement.textContent = displayScore;
            
            // Clean functional state display
            scoreElement.classList.remove('available', 'zero-option', 'used');
            
            if (displayScore > 0) {
                // Available category with points
                scoreElement.classList.add('available');
                scoreElement.setAttribute('aria-label', `${displayScore} points available in this category`);
            } else {
                // Available category but would score zero
                scoreElement.classList.add('zero-option');
                scoreElement.setAttribute('aria-label', `0 points - strategic option available`);
            }
            
            scoreElement.setAttribute('role', 'status');
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
    // Bonus Yahtzee is now only displayed in individual player scorecards
    // This function is kept for compatibility but no longer needs to do anything
    // since the bonus display is handled in createScorecardElement()
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
            scoreElement.textContent = '-';
            scoreElement.classList.remove('available', 'zero-option');
            scoreElement.removeAttribute('aria-label');
            scoreElement.removeAttribute('role');
        }
    });
    
    // Hide bonus Yahtzee row when clearing scores
    const bonusYahtzeeItem = document.getElementById('bonus-yahtzee-item');
    if (bonusYahtzeeItem) {
        bonusYahtzeeItem.style.display = 'none';
    }
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
        console.log('Submitting score:', { category, score, dice, currentPlayer, gameId: currentGame.gameId });
        
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
        console.log('Server response:', data);
        
        if (data.error) {
            console.error('Server error details:', data);
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
        showToast('This category already has a score. Use the edit button to modify it.', 'warning');
        return;
    }
    
    showAddScoreModal(playerName, category);
}

function showAddScoreModal(playerName, category) {
    const modal = document.getElementById('add-score-modal');
    const playerElement = document.getElementById('add-score-player');
    const categoryElement = document.getElementById('add-score-category');
    const scoreInputGroup = document.getElementById('score-input-group');
    const fixedScoreSection = document.getElementById('fixed-score-section');
    const scoreInput = document.getElementById('score-input');
    const fixedScoreValue = document.getElementById('fixed-score-value');
    const fixedScoreText = document.getElementById('fixed-score-text');
    const scoreHelp = document.getElementById('score-help');
    
    const displayName = categoryDisplayNames[category] || category;
    
    // Update modal content
    playerElement.textContent = playerName;
    categoryElement.textContent = displayName;
    
    // Update dice display
    updateAddScoreDiceDisplay();
    
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
    
    // Check if this is a bonus Yahtzee
    if (category === 'yahtzee' && currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === playerName);
        if (player && player.scorecard) {
            const hasYahtzee = player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0;
            const dice = getDiceValues();
            const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
            
            // If player already has a Yahtzee and current roll is also a Yahtzee, it's worth 100
            if (hasYahtzee && isCurrentRollYahtzee) {
                setValues.yahtzee = 100;
            }
        }
    }
    
    // Define editable categories (upper section + chance)
    const editableCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'chance'];
    
    if (editableCategories.includes(category)) {
        // Show input field for manual entry
        scoreInputGroup.style.display = 'block';
        fixedScoreSection.style.display = 'none';
        
        // Set appropriate max values and help text
        if (category === 'chance') {
            scoreInput.max = 30;
            scoreHelp.textContent = 'Enter the sum of all dice (5-30)';
        } else {
            scoreInput.max = 30;
            scoreHelp.textContent = `Enter points for ${displayName} (0-30)`;
        }
        
        scoreInput.value = '';
        scoreInput.focus();
        
    } else {
        const setValue = setValues[category];
        
        if (setValue === 'Sum of all dice') {
            // Show input field for sum of dice
            scoreInputGroup.style.display = 'block';
            fixedScoreSection.style.display = 'none';
            
            scoreInput.min = 5;
            scoreInput.max = 30;
            scoreInput.value = '';
            scoreHelp.textContent = 'Enter the sum of all your dice (5-30)';
            scoreInput.focus();
            
        } else {
            // Show fixed value
            scoreInputGroup.style.display = 'none';
            fixedScoreSection.style.display = 'block';
            
            fixedScoreValue.textContent = setValue;
            fixedScoreText.textContent = `${displayName} has a fixed value of ${setValue} points.`;
        }
    }
    
    // Store current modal data
    modal.dataset.playerName = playerName;
    modal.dataset.category = category;
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function updateAddScoreDiceDisplay() {
    const addScoreDice = document.getElementById('add-score-dice');
    if (!addScoreDice) return;
    
    const dice = getDiceValues();
    addScoreDice.innerHTML = '';
    
    dice.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = 'confirmation-die';
        
        if (value > 0) {
            die.innerHTML = `<i class="${getDiceSymbol(value)}"></i>`;
        } else {
            die.innerHTML = '<i class="fas fa-question"></i>';
        }
        
        if (diceFrozen[index]) {
            die.classList.add('frozen');
        }
        
        addScoreDice.appendChild(die);
    });
}

function closeAddScoreModal() {
    const modal = document.getElementById('add-score-modal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Clear form
    const scoreInput = document.getElementById('score-input');
    scoreInput.value = '';
}

async function confirmAddScore() {
    const modal = document.getElementById('add-score-modal');
    const playerName = modal.dataset.playerName;
    const category = modal.dataset.category;
    const scoreInput = document.getElementById('score-input');
    const fixedScoreSection = document.getElementById('fixed-score-section');
    const fixedScoreValue = document.getElementById('fixed-score-value');
    
    let score;
    
    if (fixedScoreSection.style.display === 'none') {
        // User input required
        const inputValue = scoreInput.value.trim();
        
        if (!inputValue) {
            showToast('Please enter a score', 'warning');
            scoreInput.focus();
            return;
        }
        
        score = parseInt(inputValue);
        
        if (isNaN(score) || score < 0) {
            showToast('Please enter a valid score (0 or positive number)', 'error');
            scoreInput.focus();
            return;
        }
        
        // Validate range based on category
        const min = parseInt(scoreInput.min) || 0;
        const max = parseInt(scoreInput.max) || 50;
        
        if (score < min || score > max) {
            showToast(`Score must be between ${min} and ${max}`, 'error');
            scoreInput.focus();
            return;
        }
        
    } else {
        // Fixed value
        score = parseInt(fixedScoreValue.textContent);
    }
    
    try {
        await addScoreToServer(playerName, category, score);
        closeAddScoreModal();
        
        const displayName = categoryDisplayNames[category] || category;
        showToast(`Score added: ${score} points for ${displayName}!`, 'success');
        
    } catch (error) {
        console.error('Error adding score:', error);
        showToast('Error adding score. Please try again.', 'error');
    }
}

function initializeAddScoreModal() {
    const modal = document.getElementById('add-score-modal');
    const closeBtn = document.getElementById('close-add-score-modal');
    const cancelBtn = document.getElementById('cancel-add-score');
    const confirmBtn = document.getElementById('confirm-add-score');
    const scoreInput = document.getElementById('score-input');
    
    // Close button handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAddScoreModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddScoreModal);
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmAddScore);
    }
    
    // Enter key support in input
    if (scoreInput) {
        scoreInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAddScore();
            }
        });
    }
    
    // Click outside to close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddScoreModal();
            }
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeAddScoreModal();
        }
    });
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
        
        // Add Yahtzee bonus row after Yahtzee but before Chance
        if (category.name === 'yahtzee') {
            const bonusYahtzees = player.scorecard.bonusYahtzees || 0;
            const hasYahtzee = player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0;
            
            if (bonusYahtzees > 0 || hasYahtzee) {
                html += `
                    <div class="scorecard-item bonus-yahtzee-item">
                        <span>Bonus Yahtzee</span>
                        <span>${bonusYahtzees > 0 ? `${bonusYahtzees} × 100 = ${bonusYahtzees * 100}` : '0'}</span>
                        <div class="scorecard-actions">
                            <!-- No actions for bonus Yahtzee as it's automatic -->
                        </div>
                    </div>
                `;
            }
        }
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
            btn.textContent = 'Score';
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

// Quick Entry Functions for Real Dice Play
function initializeQuickEntry() {
    const fastInput = document.getElementById('dice-fast-input');
    const setDiceBtn = document.getElementById('set-dice-btn');
    
    // Fast input event listeners
    if (fastInput && setDiceBtn) {
        // Set dice from fast input when button clicked
        setDiceBtn.addEventListener('click', setDiceFromFastInput);
        
        // Set dice from fast input when Enter is pressed
        fastInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setDiceFromFastInput();
            }
        });
        
        // Real-time validation and formatting
        fastInput.addEventListener('input', validateFastInput);
        
        // Clear input after successful dice setting
        fastInput.addEventListener('blur', () => {
            if (fastInput.value && isDiceSetComplete()) {
                setTimeout(() => {
                    fastInput.value = '';
                }, 100);
            }
        });
    }
}

function setDiceFromFastInput() {
    const fastInput = document.getElementById('dice-fast-input');
    const inputValue = fastInput.value.trim();
    
    if (!inputValue) {
        showToast('Please enter dice values first', 'warning');
        fastInput.focus();
        return;
    }
    
    const diceValues = parseDiceInput(inputValue);
    
    if (diceValues.length !== 5) {
        showToast('Please enter exactly 5 dice values (1-6)', 'error');
        fastInput.focus();
        return;
    }
    
    // Validate all values are 1-6
    const invalidValues = diceValues.filter(val => val < 1 || val > 6);
    if (invalidValues.length > 0) {
        showToast('All dice values must be between 1 and 6', 'error');
        fastInput.focus();
        return;
    }
    
    // Set the dice
    setDiceFromString(diceValues.join(','));
    
    // Show success message and clear input
    showToast(`Dice set to: ${diceValues.join('-')}`, 'success', 2000);
    fastInput.value = '';
    
    // Announce to screen reader
    announceToScreenReader(`Dice set to ${diceValues.join(', ')}`);
}

function parseDiceInput(input) {
    // Remove all whitespace
    let cleaned = input.replace(/\s/g, '');
    
    // Handle comma-separated format (1,2,3,4,5)
    if (cleaned.includes(',')) {
        return cleaned.split(',').map(val => parseInt(val.trim())).filter(val => !isNaN(val));
    }
    
    // Handle space-separated format (1 2 3 4 5) - already handled by whitespace removal
    // Handle continuous format (12345)
    if (cleaned.length === 5 && /^\d{5}$/.test(cleaned)) {
        return cleaned.split('').map(digit => parseInt(digit));
    }
    
    // Handle dash-separated format (1-2-3-4-5)
    if (cleaned.includes('-')) {
        return cleaned.split('-').map(val => parseInt(val.trim())).filter(val => !isNaN(val));
    }
    
    // Handle dot-separated format (1.2.3.4.5)
    if (cleaned.includes('.')) {
        return cleaned.split('.').map(val => parseInt(val.trim())).filter(val => !isNaN(val));
    }
    
    // Fallback: try to extract all digits
    const digits = cleaned.match(/\d/g);
    return digits ? digits.map(digit => parseInt(digit)) : [];
}

function setDiceFromString(diceString) {
    const diceValues = diceString.split(',').map(Number);
    
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    diceInputs.forEach((input, index) => {
        if (index < diceValues.length) {
            input.value = diceValues[index];
        }
    });
    
    // Reset frozen state when manually setting dice
    diceFrozen = [false, false, false, false, false];
    
    updateDiceDisplay();
    calculateAllScores();
}

function validateFastInput(event) {
    const input = event.target;
    let value = input.value;
    
    // Allow only digits, commas, spaces, dashes, and dots
    value = value.replace(/[^\d,\s\-\.]/g, '');
    
    // Limit length to prevent excessive input
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    input.value = value;
    
    // Provide real-time feedback
    const diceValues = parseDiceInput(value);
    if (value.length > 0) {
        if (diceValues.length === 5 && diceValues.every(val => val >= 1 && val <= 6)) {
            input.style.borderColor = 'var(--primary-color)';
            input.style.backgroundColor = '#e8f5e8';
        } else if (diceValues.length > 0) {
            input.style.borderColor = 'var(--accent-color)';
            input.style.backgroundColor = '#fff3e0';
        } else {
            input.style.borderColor = 'var(--error-color)';
            input.style.backgroundColor = '#ffebee';
        }
    } else {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
    }
}

function isDiceSetComplete() {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    return diceInputs.every(input => {
        const value = parseInt(input.value);
        return !isNaN(value) && value >= 1 && value <= 6;
    });
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
    
    // Update score display - check for bonus Yahtzee
    let displayScore = score;
    if (category === 'yahtzee' && currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            const hasYahtzee = player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0;
            const isCurrentRollYahtzee = dice.length === 5 && dice.every(d => d === dice[0] && d > 0);
            
            // If player already has a Yahtzee and current roll is also a Yahtzee, show 100
            if (hasYahtzee && isCurrentRollYahtzee && score === 50) {
                displayScore = 100;
            }
        }
    }
    scorePoints.textContent = displayScore;
    
    // Update score description based on category
    scoreDescription.textContent = getScoreDescription(category, displayScore, dice);
    
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
        'yahtzee': score > 0 ? (score === 100 ? 'All five dice show the same number! (Bonus Yahtzee)' : 'All five dice show the same number!') : 'No Yahtzee found',
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
