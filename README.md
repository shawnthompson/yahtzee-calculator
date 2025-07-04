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
- **C**: Reset/clear dice

## API Endpoints

### Game Management
- `POST /api/game/create`: Create a new game with players
- `GET /api/game/:gameId`: Get current game state
- `POST /api/game/:gameId/score`: Record a player's score for a category  
- `GET /api/game/:gameId/leaderboard`: Get current player rankings

### Score Calculation
- `GET /`: Main application page
- `POST /api/calculate`: Calculate score for a specific category
- `GET /api/calculate-all`: Calculate all possible scores for dice combination

## Development

### Project Structure
```
yahtzee-calculator/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styling
│   └── script.js       # Frontend JavaScript
├── server.js           # Express server
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
└── nginx.conf         # Nginx configuration
```

### Running in Development Mode
```bash
npm run dev
```

This starts the server with nodemon for automatic restarts on file changes.

## Environment Variables

The application can be configured using environment variables. Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Available environment variables:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `APP_NAME`: Application name displayed in logs
- `APP_VERSION`: Application version
- `CORS_ORIGIN`: CORS origin settings (* for all, or specific domain)
- `LOG_LEVEL`: Logging level (info, debug, error)

## Docker Commands

### Build and run with Docker Compose:
```bash
docker-compose up -d
```

### Stop the application:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs -f
```

### Rebuild after changes:
```bash
docker-compose up -d --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your own family game nights!

## Made with ❤️ for Family Game Nights

Perfect for keeping track of Yahtzee scores during family game time. No more manual calculations - just focus on having fun!
