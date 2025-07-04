# Yahtzee Score Calculator

A simple, beautiful web application to calculate Yahtzee scores and manage multiple players during family game nights. Built with Node.js, Express, and Docker for easy deployment.

## Features

- 🎮 **Multi-Player Support**: Add up to 4 players per game
- 🎲 **Real-time Score Calculation**: Automatically calculates all possible Yahtzee scores
- 📊 **Individual Scorecards**: Track each player's scores separately
- � **Live Leaderboard**: Real-time rankings updated after each score
- �🎯 **Interactive Dice Input**: Visual dice representation with easy input
- ✅ **Score Validation**: Prevents using the same category twice per player
- 🎨 **Modern UI**: Clean, responsive design that works on all devices
- 🚀 **Docker Ready**: Easy deployment with Docker and nginx
- ⚡ **Fast & Lightweight**: Optimized for quick calculations during gameplay
- 🔄 **Game Session Management**: Create and track multiple game sessions

## Yahtzee Categories Supported

### Upper Section
- Ones, Twos, Threes, Fours, Fives, Sixes

### Lower Section
- Three of a Kind
- Four of a Kind
- Full House (25 points)
- Small Straight (30 points)
- Large Straight (40 points)
- Yahtzee (50 points)
- Chance

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd yahtzee-calculator
   ```

2. **Configure environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to customize settings like port, etc.
   ```

3. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   Open your browser and go to `http://localhost` (or the port specified in your .env file)

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   Open your browser and go to `http://localhost:3000`

## Usage

### Setting Up a Game
1. **Enter player names** (1-4 players) in the setup section
2. **Click "Start Game"** to begin
3. **Select current player** from the dropdown

### Playing the Game
1. **Enter your dice values** in the input fields (1-6) or use "Roll Random Dice"
2. **Use "Reset Dice"** to quickly clear all dice fields
3. **Click "Calculate All Scores"** to see all possible scoring options
4. **Click "Use" button** next to your chosen category to record the score
5. **Switch players** and repeat for each turn

### Viewing Results
- **Player Scorecards**: See individual progress for each player
- **Live Leaderboard**: Real-time rankings with detailed score breakdowns
- **Final Scores**: Automatic calculation with upper section bonus (35 pts for 63+)

### Keyboard Shortcuts

- **Enter**: Calculate all scores
- **R**: Roll random dice
- **C**: Reset/Clear dice
- **Ctrl+S**: Save game (Developer Mode)
- **Ctrl+L**: Load saved game (Developer Mode)

## Mobile Optimization

The app is fully optimized for iPhone and mobile devices:

### Mobile Features:
- **Numeric Keypad**: Dice inputs automatically show the number keyboard
- **Input Validation**: Only accepts numbers 1-6
- **Touch-Friendly**: Proper touch target sizes (48px minimum)
- **Arrow Navigation**: Use arrow keys to move between dice inputs
- **Auto-Focus**: Pressing Enter moves to the next dice input
- **Paste Support**: Paste multiple dice values at once
- **Visual Feedback**: Clear hover and active states for touch interaction

### Mobile Tips:
- Tap any dice input to bring up the numeric keypad
- Use the arrow keys for quick navigation between dice
- Invalid numbers (0, 7-9) are automatically rejected
- Copy/paste works: "12345" will fill all dice at once
