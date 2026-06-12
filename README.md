# AI-Powered Weather Forecast System using MERN Stack

A premium, modern weather forecasting application built using the MERN stack (MongoDB, Express, React, Node.js). The interface uses beautiful glassmorphic visual designs, weather-based dynamic animated backgrounds, responsive grids, and an automated rule-based **AI Meteorologist Insight Engine** that synthesizes local condition parameters into weather advice.

---

## Features

- **Dynamic Weather Backdrops**: The visual environment automatically shifts based on the weather conditions in the searched city:
  - **Sunny**: Bright warm gradient with a floating pulsing solar glow.
  - **Rainy**: Dark blue gradient with animated rain drops falling down the screen.
  - **Cloudy**: Muted grey-blue fog gradient with drifting cloud layers.
  - **Snowy**: Icy white-blue winter visual landscape.
- **AI Meteorologist Insights**: Evaluates combination statistics (heat indices, freeze levels, humidity, and wind shear) to generate readable warnings, outdoor recommendations, and clothing tips.
- **Search History Logging**: Maintains a historic log of searched cities, storing them in MongoDB (or falling back to local memory if MongoDB is unavailable) and displays them in an interactive dashboard table.
- **Fuzzy Search & Fast Re-Entry**: Clicking any row in the history list automatically triggers a search for that city.
- **Full Theme Customization**: Interactive dark-mode/light-mode toggle adjusts the color-scheme.
- **Offline / Mock Fallback System**: If no OpenWeather API key is present, the app automatically switches to **Offline Demo Mode**, generating stable, realistic mock weather data derived from city name hashes.

---

## Directory Structure

```
internship/
├── backend/
│   ├── models/
│   │   └── SearchHistory.js   # Mongoose model for search records
│   ├── .env                   # Configuration file (Port, Mongo, API keys)
│   ├── .env.example           # Configuration template
│   ├── package.json           # Backend dependencies and scripts
│   └── server.js              # Express app, Mock generator & AI engine
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Branding & dark/light theme switch
│   │   │   ├── SearchBar.jsx      # Input validations & submit actions
│   │   │   ├── WeatherCard.jsx    # Display panels, stats & AI advice block
│   │   │   ├── RecentSearches.jsx # Search logs table with fuzzy timing
│   │   │   └── Footer.jsx         # Credit and copyright footer
│   │   ├── App.jsx            # State coordinator, fetch & background engines
│   │   ├── App.css            # Glassmorphism, animations & background styles
│   │   ├── index.css          # Design system typography, resets & themes
│   │   └── main.jsx           # App entry point
│   ├── index.html             # Document template with SEO meta tags
│   └── package.json           # Frontend packages (Vite, React, Lucide-React)
└── README.md                  # Setup & operational instruction guide
```

---

## Configuration & Environment Setup

1. Rename the template configuration file in the `backend` folder:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Open `.env` and fill in your variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/weather-db
   OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
   ```
   *Note: If you leave `OPENWEATHER_API_KEY` blank or at default, the application will operate in **Offline Demo Mode**.*

---

## Running the Application Locally

Follow these steps to run both parts of the application:

### Step 1: Start the Backend Server
```bash
cd backend
npm run dev
```
The server will start listening at `http://localhost:5000`.

### Step 2: Start the Frontend Client
```bash
cd frontend
npm run dev
```
The Vite development server will compile files and boot at `http://localhost:5173`.

---

## Backend API Specification

- **GET `/api/weather/:city`**: Fetches weather metrics for the specified city, compiles and structures data, and generates AI forecasts.
- **GET `/api/history`**: Retrieves the last 10 search records sorted by search time.
- **POST `/api/history`**: Logs a new weather search record into the database.
