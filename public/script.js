// Yahtzee Score Calculator JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const diceInputs = [
        document.getElementById('die1'),
        document.getElementById('die2'),
        document.getElementById('die3'),
        document.getElementById('die4'),
        document.getElementById('die5')
    ];

    const calculateAllBtn = document.getElementById('calculate-all');
    const rollDiceBtn = document.getElementById('roll-dice');
    const diceVisual = document.getElementById('dice-visual');

    // Add event listeners to dice inputs
    diceInputs.forEach(input => {
        input.addEventListener('input', updateDiceDisplay);
        input.addEventListener('input', debounce(calculateAllScores, 500));
    });

    calculateAllBtn.addEventListener('click', calculateAllScores);
    rollDiceBtn.addEventListener('click', rollRandomDice);

    function getDiceValues() {
        return diceInputs.map(input => {
            const value = parseInt(input.value);
            return isNaN(value) || value < 1 || value > 6 ? 0 : value;
        });
    }

    function updateDiceDisplay() {
        const dice = getDiceValues();
        const diceElements = diceVisual.querySelectorAll('.die');
        
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
        diceInputs.forEach(input => {
            input.value = Math.floor(Math.random() * 6) + 1;
        });
        updateDiceDisplay();
        calculateAllScores();
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

    // Initialize display
    updateDiceDisplay();

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            calculateAllScores();
        } else if (e.key === 'r' || e.key === 'R') {
            rollRandomDice();
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

    // Add tooltips to category names
    Object.keys(tooltips).forEach(category => {
        const categoryElement = document.querySelector(`#${category}-score`);
        if (categoryElement) {
            const parentItem = categoryElement.closest('.score-item');
            if (parentItem) {
                parentItem.title = tooltips[category];
                parentItem.style.cursor = 'help';
            }
        }
    });
});
