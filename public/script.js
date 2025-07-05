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
    startGameBtn.addEventListener('click', startNewGame);
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
    
    // Virtual dice click listeners for freezing
    document.querySelectorAll('.dice-visual .die').forEach((die, index) => {
        die.addEventListener('click', () => toggleDiceFreeze(index));
    });
    
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
    
    const players = playerInputs
        .map(input => input.value.trim())
        .filter(name => name.length > 0);
    
    if (players.length === 0) {
        alert('Please enter at least one player name!');
        return;
    }
    
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
            alert('Error creating game: ' + data.error);
            return;
        }
        
        currentGame = data;
        setupGamePlay();
        
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Error creating game. Please try again.');
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
        if (value > 0) {
            die.innerHTML = `<i class="${getDiceSymbol(value)}"></i>`;
            die.style.backgroundColor = '#4CAF50';
            die.style.color = 'white';
        } else {
            die.innerHTML = '<i class="fas fa-question"></i>';
            die.style.backgroundColor = 'white';
            die.style.color = '#333';
        }
    });
    
    // Update use score buttons to handle multiple Yahtzees
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player && player.scorecard) {
            updateUseScoreButtons(player.scorecard);
        }
    }
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
        
        // Show success message with user-friendly category name
        const displayName = categoryDisplayNames[category] || category;
        let message = `Score recorded: ${data.score} points for ${displayName}!`;
        
        // Add bonus Yahtzee information
        if (data.bonusYahtzee) {
            if (data.joker) {
                message += ` (Used as Yahtzee joker - Bonus +${data.bonusPoints || 100} points!)`;
            } else {
                message += ` (Bonus Yahtzee - +${data.bonusPoints || 100} points!)`;
            }
        }
        
        alert(message);
        
        // Auto-switch to next player for smoother gameplay
        switchToNextPlayer();
        
    } catch (error) {
        console.error('Error recording score:', error);
        alert('Error recording score. Please try again.');
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
    
    // Add event listeners for edit and clear buttons
    document.querySelectorAll('.edit-score-btn').forEach(btn => {
        btn.addEventListener('click', handleEditScore);
    });
    
    document.querySelectorAll('.clear-score-btn').forEach(btn => {
        btn.addEventListener('click', handleClearScore);
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
                ` : ''}
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

// Enhanced keyboard shortcuts for dev mode
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        calculateAllScores();
    } else if (e.key === 'r' || e.key === 'R') {
        rollRandomDice();
    } else if (e.key === 'c' || e.key === 'C') {
        resetDice();
    } else if (devMode && e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        saveGameState();
    } else if (devMode && e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        loadSavedGame();
    }
});

// Debounce function to limit API calls
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        calculateAllScores();
    } else if (e.key === 'r' || e.key === 'R') {
        rollRandomDice();
    } else if (e.key === 'c' || e.key === 'C') {
        resetDice();
    }
});

// Category display names for user-friendly messages
const categoryDisplayNames = {
    'ones': 'Ones',
    'twos': 'Twos',
    'threes': 'Threes',
    'fours': 'Fours',
    'fives': 'Fives',
    'sixes': 'Sixes',
    'threeOfAKind': '3 of a Kind',
    'fourOfAKind': '4 of a Kind',
    'fullHouse': 'Full House',
    'smallStraight': 'Small Straight',
    'largeStraight': 'Large Straight',
    'yahtzee': 'Yahtzee',
    'chance': 'Chance'
};

// Add tooltips for scoring rules
const tooltips = {
    'ones': 'Sum of all ones',
    'twos': 'Sum of all twos',
    'threes': 'Sum of all threes',
    'fours': 'Sum of all fours',
    'fives': 'Sum of all fives',
    'sixes': 'Sum of all sixes',
    'threeOfAKind': 'Sum of all dice if 3 or more of same number',
    'fourOfAKind': 'Sum of all dice if 4 or more of same number',
    'fullHouse': '25 points for 3 of one number and 2 of another',
    'smallStraight': '30 points for 4 consecutive numbers',
    'largeStraight': '40 points for 5 consecutive numbers',
    'yahtzee': '50 points for all 5 dice the same',
    'chance': 'Sum of all dice'
};

// Add tooltips to score items
document.addEventListener('DOMContentLoaded', function() {
    Object.keys(tooltips).forEach(category => {
        const scoreItem = document.querySelector(`[data-category="${category}"]`);
        if (scoreItem) {
            scoreItem.title = tooltips[category];
            scoreItem.style.cursor = 'help';
        }
    });
});

// Dice input validation for mobile
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
