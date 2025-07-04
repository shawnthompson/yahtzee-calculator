# Yahtzee Score Calculator

A simple, beautiful web application to calculate Yahtzee scores while playing with family and friends. Built with Node.js, Express, and Docker for easy deployment.

## Features

- 🎲 **Real-time Score Calculation**: Automatically calculates all possible Yahtzee scores
- 🎯 **Interactive Dice Input**: Visual dice representation with easy input
- 🎨 **Modern UI**: Clean, responsive design that works on all devices
- 🚀 **Docker Ready**: Easy deployment with Docker and nginx
- ⚡ **Fast & Lightweight**: Optimized for quick calculations during gameplay

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

2. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   Open your browser and go to `http://localhost`

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

1. **Enter your dice values** in the input fields (1-6)
2. **Click "Calculate All Scores"** or the scores will update automatically
3. **Use "Roll Random Dice"** to test with random values
4. **View all possible scores** for your current dice combination

### Keyboard Shortcuts
- **Enter**: Calculate all scores
- **R**: Roll random dice

## API Endpoints

- `GET /`: Main application page
- `POST /api/calculate`: Calculate score for a specific category
- `GET /api/calculate-all`: Calculate all possible scores

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
