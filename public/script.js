// Yahtzee Score Calculator with Player Management

let currentGame = null;
let currentPlayer = null;
let currentScores = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Get DOM elements
    const gameSetup = document.getElementById('game-setup');
    const gamePlay = document.getElementById('game-play');
    const playerScoreCards = document.getElementById('player-scorecards');
    const leaderboard = document.getElementById('leaderboard');
    
    const startGameBtn = document.getElementById('start-game');
    const newGameBtn = document.getElementById('new-game');
    const currentPlayerSelect = document.getElementById('current-player-select');
    const calculateAllBtn = document.getElementById('calculate-all');
    const rollDiceBtn = document.getElementById('roll-dice');
    const resetDiceBtn = document.getElementById('reset-dice');
    
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
    calculateAllBtn.addEventListener('click', calculateAllScores);
    rollDiceBtn.addEventListener('click', rollRandomDice);
    resetDiceBtn.addEventListener('click', resetDice);
    currentPlayerSelect.addEventListener('change', switchPlayer);
    
    // Dice input listeners
    diceInputs.forEach(input => {
        input.addEventListener('input', updateDiceDisplay);
        input.addEventListener('input', debounce(calculateAllScores, 500));
    });
    
    // Use score button listeners
    document.querySelectorAll('.use-score-btn').forEach(btn => {
        btn.addEventListener('click', useScore);
    });
    
    // Initialize display
    updateDiceDisplay();
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
    
    // Populate player select
    const playerSelect = document.getElementById('current-player-select');
    playerSelect.innerHTML = '<option value="">Select Player</option>';
    
    currentGame.players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = player.name;
        playerSelect.appendChild(option);
    });
    
    // Update scorecards display
    updateScorecardsDisplay();
    updateLeaderboard();
}

function switchPlayer() {
    const playerSelect = document.getElementById('current-player-select');
    currentPlayer = playerSelect.value;
    
    // Update use score buttons based on current player's scorecard
    if (currentPlayer && currentGame) {
        const player = currentGame.players.find(p => p.name === currentPlayer);
        if (player) {
            updateUseScoreButtons(player.scorecard);
        }
    }
}

function updateUseScoreButtons(scorecard) {
    document.querySelectorAll('.use-score-btn').forEach(btn => {
        const category = btn.dataset.category;
        if (scorecard[category] !== undefined) {
            btn.disabled = true;
            btn.textContent = 'Used';
        } else {
            btn.disabled = false;
            btn.textContent = 'Use';
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
            die.textContent = getDiceSymbol(value);
            die.style.backgroundColor = '#4CAF50';
            die.style.color = 'white';
        } else {
            die.textContent = '?';
            die.style.backgroundColor = 'white';
            die.style.color = '#333';
        }
    });
}

function getDiceSymbol(value) {
    const symbols = {
        1: '⚀',
        2: '⚁',
        3: '⚂',
        4: '⚃',
        5: '⚄',
        6: '⚅'
    };
    return symbols[value] || value;
}

function rollRandomDice() {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];
    
    diceInputs.forEach(input => {
        input.value = Math.floor(Math.random() * 6) + 1;
    });
    
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
    
    updateDiceDisplay();
    clearAllScores();
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
    
    try {
        const response = await fetch(`/api/game/${currentGame.gameId}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: currentPlayer,
                category: category,
                score: score
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
        
        // Show success message
        alert(`Score recorded: ${score} points for ${category}!`);
        
    } catch (error) {
        console.error('Error recording score:', error);
        alert('Error recording score. Please try again.');
    }
}

function updateScorecardsDisplay() {
    const container = document.getElementById('scorecards-container');
    container.innerHTML = '';
    
    if (!currentGame) return;
    
    currentGame.players.forEach(player => {
        const scorecard = createScorecardElement(player);
        container.appendChild(scorecard);
    });
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
    
    categories.forEach(category => {
        const score = player.scorecard[category.name];
        const isUsed = score !== undefined;
        
        html += `
            <div class="scorecard-item ${isUsed ? 'used' : ''}">
                <span>${category.display}</span>
                <span>${isUsed ? score : '-'}</span>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (player.finalScore) {
        html += `
            <div class="final-score">
                <div>Upper: ${player.finalScore.upperTotal} + Bonus: ${player.finalScore.upperBonus}</div>
                <div>Lower: ${player.finalScore.lowerTotal}</div>
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
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.leaderboard.forEach(player => {
            const rankClass = player.rank <= 3 ? `rank-${player.rank}` : '';
            html += `
                <tr class="${rankClass}">
                    <td>${player.rank}</td>
                    <td>${player.name}</td>
                    <td>${player.totalScore}</td>
                    <td>${player.upperTotal}</td>
                    <td>${player.upperBonus}</td>
                    <td>${player.lowerTotal}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

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
