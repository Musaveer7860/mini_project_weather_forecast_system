import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import RecentSearches from './components/RecentSearches';
import Footer from './components/Footer';
import { CloudOff, AlertCircle } from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : '';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [unit, setUnit] = useState(() => {
    return localStorage.getItem('unit') || 'C';
  });

  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('searchHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgClass, setBgClass] = useState('default');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleUnit = () => {
    setUnit(prev => prev === 'C' ? 'F' : 'C');
  };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        localStorage.setItem('searchHistory', JSON.stringify(data));
      }
    } catch {
    }
  }, []);

  const getBgClass = useCallback((condition) => {
    if (!condition) return 'default';
    const cond = condition.toLowerCase();
    if (cond.includes('clear') || cond.includes('sunny')) return 'sunny';
    if (cond.includes('cloud')) return 'cloudy';
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('thunderstorm')) return 'rainy';
    if (cond.includes('snow')) return 'snowy';
    return 'default';
  }, []);

  const saveToHistory = useCallback(async (weatherData) => {
    const newEntry = {
      city: weatherData.city,
      temp: weatherData.temp,
      condition: weatherData.condition,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      icon: weatherData.icon,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.city.toLowerCase() !== newEntry.city.toLowerCase());
      const updated = [newEntry, ...filtered].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`${API_BASE}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      fetchHistory();
    } catch (err) {
      console.error('Failed to post search history to API, kept locally:', err);
    }
  }, [fetchHistory]);

  const handleSearch = useCallback(async (city, shouldSaveToHistory = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/weather/${encodeURIComponent(city)}`);
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to retrieve weather for "${city}"`);
      }

      const data = await res.json();
      setWeather(data);
      setBgClass(getBgClass(data.condition));

      if (shouldSaveToHistory) {
        await saveToHistory(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [saveToHistory, getBgClass]);

  const handleSearchByCoords = async (lat, lon) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/weather/coords?lat=${lat}&lon=${lon}`);
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to retrieve weather for coordinates');
      }

      const data = await res.json();
      setWeather(data);
      setBgClass(getBgClass(data.condition));

      await saveToHistory(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred fetching location coordinates weather.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
    try {
      await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear search history on API:', err);
    }
  };

  const handleDeleteHistoryItem = async (city) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.city.toLowerCase() !== city.toLowerCase());
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      return updated;
    });
    try {
      await fetch(`${API_BASE}/api/history/${encodeURIComponent(city)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete history item on API:', err);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('unit', unit);
  }, [unit]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchHistory();
      handleSearch('New York', false);
    });
  }, [fetchHistory, handleSearch]);

  useEffect(() => {
    if (!weather) return;
    const interval = setInterval(() => {
      handleSearch(weather.city, false);
    }, 300000);
    return () => clearInterval(interval);
  }, [weather, handleSearch]);

  return (
    <div className="app-container">
      <div className={`bg-dynamic-wrapper ${bgClass}`}>
        <div className="bg-animation">
          {bgClass === 'sunny' && <div className="sunny-rays" />}
          
          {bgClass === 'rainy' && (
            <div className="rain-container">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="rain-drop"
                  style={{
                    left: `${(i * 7.7) % 100}%`,
                    animationDelay: `${(i * 0.23) % 1.5}s`,
                    animationDuration: `${1.0 + ((i * 0.17) % 0.8)}s`
                  }}
                />
              ))}
            </div>
          )}

          {bgClass === 'cloudy' && (
            <>
              <div className="cloud-drift-1" />
              <div className="cloud-drift-2" />
            </>
          )}
        </div>
      </div>

      <Navbar theme={theme} toggleTheme={toggleTheme} unit={unit} toggleUnit={toggleUnit} />

      <main className="main-content">
        <SearchBar 
          onSearch={(city) => handleSearch(city, true)} 
          onLocate={handleSearchByCoords} 
          isLoading={isLoading} 
        />

        <div className="dashboard-grid">
          <div className="weather-display-area">
            {isLoading && (
              <div className="glass-panel status-card">
                <div className="status-icon loading">
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid var(--accent-primary)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%'
                  }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Weather Data...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Please wait, fetching current conditions and forecast details.
                </p>
              </div>
            )}

            {!isLoading && error && (
              <div className="glass-panel status-card">
                <div className="status-icon error">
                  <AlertCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--danger)' }}>
                  Retrieval Error
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {error}
                </p>
              </div>
            )}

            {!isLoading && !error && !weather && (
              <div className="glass-panel status-card">
                <div className="status-icon" style={{ color: 'var(--text-muted)' }}>
                  <CloudOff size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>No Weather Data</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Search for a city above to view its current weather and forecast.
                </p>
              </div>
            )}

            {!isLoading && !error && weather && (
              <WeatherCard weather={weather} unit={unit} />
            )}
          </div>

          <div>
            <RecentSearches 
              history={history} 
              onSelectCity={(city) => handleSearch(city, true)} 
              onClearHistory={handleClearHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              unit={unit}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
