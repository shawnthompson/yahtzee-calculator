const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_NAME = process.env.APP_NAME || 'Yahtzee Score Calculator';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN
}));
app.use(express.json());
app.use(express.static('public'));

// Yahtzee scoring functions
const yahtzeeScoring = {
  // Upper section scoring
  ones: (dice) => dice.filter(d => d === 1).reduce((sum, d) => sum + d, 0),
  twos: (dice) => dice.filter(d => d === 2).reduce((sum, d) => sum + d, 0),
  threes: (dice) => dice.filter(d => d === 3).reduce((sum, d) => sum + d, 0),
  fours: (dice) => dice.filter(d => d === 4).reduce((sum, d) => sum + d, 0),
  fives: (dice) => dice.filter(d => d === 5).reduce((sum, d) => sum + d, 0),
  sixes: (dice) => dice.filter(d => d === 6).reduce((sum, d) => sum + d, 0),

  // Lower section scoring
  threeOfAKind: (dice) => {
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const hasThreeOfAKind = Object.values(counts).some(count => count >= 3);
    return hasThreeOfAKind ? dice.reduce((sum, d) => sum + d, 0) : 0;
  },

  fourOfAKind: (dice) => {
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const hasFourOfAKind = Object.values(counts).some(count => count >= 4);
    return hasFourOfAKind ? dice.reduce((sum, d) => sum + d, 0) : 0;
  },

  fullHouse: (dice) => {
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const countValues = Object.values(counts).sort();
    const isFullHouse = countValues.length === 2 && countValues[0] === 2 && countValues[1] === 3;
    return isFullHouse ? 25 : 0;
  },

  smallStraight: (dice) => {
    const unique = [...new Set(dice)].sort();
    const sequences = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6]
    ];
    const hasSmallStraight = sequences.some(seq => 
      seq.every(num => unique.includes(num))
    );
    return hasSmallStraight ? 30 : 0;
  },

  largeStraight: (dice) => {
    const unique = [...new Set(dice)].sort();
    const isLargeStraight = 
      (unique.length === 5 && unique[0] === 1 && unique[4] === 5) ||
      (unique.length === 5 && unique[0] === 2 && unique[4] === 6);
    return isLargeStraight ? 40 : 0;
  },

  yahtzee: (dice) => {
    const allSame = dice.every(d => d === dice[0]);
    return allSame ? 50 : 0;
  },

  chance: (dice) => dice.reduce((sum, d) => sum + d, 0)
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/calculate', (req, res) => {
  try {
    const { dice, category } = req.body;
    
    // Validate input
    if (!dice || !Array.isArray(dice) || dice.length !== 5) {
      return res.status(400).json({ error: 'Invalid dice array. Must be 5 numbers.' });
    }
    
    if (!dice.every(d => d >= 1 && d <= 6)) {
      return res.status(400).json({ error: 'Each die must be between 1 and 6.' });
    }
    
    if (!category || !yahtzeeScoring[category]) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    
    const score = yahtzeeScoring[category](dice);
    res.json({ score, dice, category });
  } catch (error) {
    res.status(500).json({ error: 'Server error calculating score.' });
  }
});

app.get('/api/calculate-all', (req, res) => {
  try {
    const { dice } = req.query;
    
    if (!dice) {
      return res.status(400).json({ error: 'Missing dice parameter' });
    }
    
    const diceArray = dice.split(',').map(Number);
    
    if (diceArray.length !== 5 || !diceArray.every(d => d >= 1 && d <= 6)) {
      return res.status(400).json({ error: 'Invalid dice. Must be 5 numbers between 1 and 6.' });
    }
    
    const scores = {};
    Object.keys(yahtzeeScoring).forEach(category => {
      scores[category] = yahtzeeScoring[category](diceArray);
    });
    
    res.json({ scores, dice: diceArray });
  } catch (error) {
    res.status(500).json({ error: 'Server error calculating scores.' });
  }
});

app.listen(PORT, () => {
  console.log(`🎲 ${APP_NAME} server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📝 Access the app at: http://localhost:${PORT}`);
});
