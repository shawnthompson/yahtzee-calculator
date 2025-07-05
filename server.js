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

// Player score calculation functions
const calculateFinalScore = (scorecard) => {
  const upperSection = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  const lowerSection = ['threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];
  
  // Calculate upper section total
  const upperTotal = upperSection.reduce((sum, category) => {
    return sum + (scorecard[category] || 0);
  }, 0);
  
  // Upper section bonus (35 points if total >= 63)
  const upperBonus = upperTotal >= 63 ? 35 : 0;
  
  // Calculate lower section total
  const lowerTotal = lowerSection.reduce((sum, category) => {
    return sum + (scorecard[category] || 0);
  }, 0);

  // Add bonus Yahtzees (100 points each)
  const bonusYahtzees = scorecard.bonusYahtzees || 0;
  const bonusYahtzeeScore = bonusYahtzees * 100;
  
  // Total score
  const totalScore = upperTotal + upperBonus + lowerTotal + bonusYahtzeeScore;
  
  return {
    upperTotal,
    upperBonus,
    lowerTotal,
    bonusYahtzees,
    bonusYahtzeeScore,
    totalScore
  };
};

// In-memory storage for game sessions (in production, use a database)
let gameSessions = {};

// Generate a simple game ID
const generateGameId = () => Math.random().toString(36).substring(2, 8);

// Helper function to check if dice form a Yahtzee
const isYahtzee = (dice) => {
  return dice.every(d => d === dice[0]);
};

// Helper function to handle multiple Yahtzees
const handleMultipleYahtzees = (player, dice, category) => {
  const rollIsYahtzee = isYahtzee(dice);
  
  if (rollIsYahtzee) {
    // If this is a Yahtzee roll
    if (category === 'yahtzee') {
      // Recording in the Yahtzee category
      if (player.scorecard.yahtzee !== undefined) {
        // Already have a Yahtzee, this is a bonus - don't update the yahtzee score
        player.scorecard.bonusYahtzees = (player.scorecard.bonusYahtzees || 0) + 1;
        // Return the existing score and indicate this is a bonus
        return { score: player.scorecard.yahtzee, bonusYahtzee: true, bonusPoints: 100, skipUpdate: true };
      } else {
        // First Yahtzee
        return { score: 50, bonusYahtzee: false };
      }
    } else {
      // Using Yahtzee as joker for another category
      if (player.scorecard.yahtzee !== undefined && player.scorecard.yahtzee > 0) {
        // Have a Yahtzee, can use as joker
        player.scorecard.bonusYahtzees = (player.scorecard.bonusYahtzees || 0) + 1;
        
        // Calculate score for the chosen category
        const score = yahtzeeScoring[category](dice);
        return { score, bonusYahtzee: true, joker: true, bonusPoints: 100 };
      }
    }
  }
  
  // Normal scoring
  const score = yahtzeeScoring[category](dice);
  return { score, bonusYahtzee: false };
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

// Player and game management endpoints
app.post('/api/game/create', (req, res) => {
  try {
    const { players } = req.body;
    
    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'Must provide at least one player name' });
    }
    
    const gameId = generateGameId();
    const gameData = {
      id: gameId,
      players: players.map(name => ({
        name: name.trim(),
        scorecard: {},
        finalScore: null
      })),
      createdAt: new Date().toISOString()
    };
    
    gameSessions[gameId] = gameData;
    res.json({ gameId, players: gameData.players });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating game.' });
  }
});

app.get('/api/game/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = gameSessions[gameId];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving game.' });
  }
});

app.post('/api/game/:gameId/score', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerName, category, score, dice } = req.body;
    
    const game = gameSessions[gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = game.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    let finalScore = score;
    let bonusYahtzee = false;
    let joker = false;
    let bonusPoints = 0;
    let skipUpdate = false;

    // Handle multiple Yahtzees if dice are provided
    if (dice && dice.length === 5) {
      const result = handleMultipleYahtzees(player, dice, category);
      finalScore = result.score;
      bonusYahtzee = result.bonusYahtzee;
      joker = result.joker || false;
      bonusPoints = result.bonusPoints || 0;
      skipUpdate = result.skipUpdate || false;
    }

    // Update player's scorecard only if not skipping
    if (!skipUpdate) {
      player.scorecard[category] = finalScore;
    }

    // Calculate final score
    player.finalScore = calculateFinalScore(player.scorecard);

    res.json({ 
      playerName, 
      category, 
      score: finalScore, 
      finalScore: player.finalScore,
      scorecard: player.scorecard,
      bonusYahtzee,
      joker,
      bonusPoints
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating score.' });
  }
});

app.post('/api/game/:gameId/clear-score', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerName, category } = req.body;
    
    const game = gameSessions[gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = game.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Remove the category from player's scorecard
    delete player.scorecard[category];
    
    // Recalculate final score
    player.finalScore = calculateFinalScore(player.scorecard);
    
    res.json({ 
      playerName, 
      category, 
      finalScore: player.finalScore,
      scorecard: player.scorecard 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error clearing score.' });
  }
});

app.get('/api/game/:gameId/leaderboard', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = gameSessions[gameId];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Sort players by total score (descending)
    const leaderboard = game.players
      .filter(p => p.finalScore !== null)
      .sort((a, b) => b.finalScore.totalScore - a.finalScore.totalScore)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name,
        totalScore: player.finalScore.totalScore,
        upperTotal: player.finalScore.upperTotal,
        upperBonus: player.finalScore.upperBonus,
        lowerTotal: player.finalScore.lowerTotal
      }));
    
    res.json({ gameId, leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating leaderboard.' });
  }
});

app.listen(PORT, () => {
  console.log(`🎲 ${APP_NAME} server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📝 Access the app at: http://localhost:${PORT}`);
});
