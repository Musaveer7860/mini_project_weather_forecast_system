import { useState, useEffect } from 'react';
import { Search, MapPin, Compass } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ onSearch, onLocate, isLoading }) {
  const [city, setCity] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (city.trim().length < 2) {
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const API = import.meta.env.DEV ? 'http://localhost:5000' : '';
        const res = await fetch(`${API}/api/weather/search/suggestions?q=${encodeURIComponent(city.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [city]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city.trim());
      setShowDropdown(false);
    }
  };

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onLocate(position.coords.latitude, position.coords.longitude);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            onLocate(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            setIsLocating(false);
            console.error(err);
            alert('Location access denied or unavailable. Please ensure location permissions are enabled in your browser address bar.');
          }
        );
      },
      { enableHighAccuracy: false, timeout: 4000 }
    );
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="glass-panel search-bar-form"
    >
      <div className="search-container search-input-wrapper">
        <MapPin className="search-icon-left" size={18} />
        
        <input
          type="text"
          value={city}
          onChange={(e) => {
            const val = e.target.value;
            setCity(val);
            if (val.trim().length < 2) {
              setSuggestions([]);
            }
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search by city name..."
          disabled={isLoading || isLocating}
          className="search-input"
        />
        
        <button
          type="button"
          onClick={handleGPSClick}
          disabled={isLoading || isLocating}
          title="Use current location"
          className={`btn-locate ${isLocating ? 'active' : ''}`}
        >
          <Compass 
            size={20} 
            style={{ 
              animation: isLocating ? 'spin 2s infinite linear' : 'none' 
            }} 
          />
        </button>

        {showDropdown && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  const displayName = item.state ? `${item.name}, ${item.state}` : item.name;
                  setCity(displayName);
                  setShowDropdown(false);
                  if (item.lat !== undefined && item.lon !== undefined) {
                    onLocate(item.lat, item.lon);
                  } else {
                    onSearch(item.name);
                  }
                }}
                className="suggestion-item"
              >
                <span className="suggestion-city">
                  {item.name}
                </span>
                {(item.state || item.country) && (
                  <span className="suggestion-region">
                    {[item.state, item.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button
        type="submit"
        disabled={isLoading || isLocating || !city.trim()}
        className="btn-primary btn-search-submit"
      >
        <Search size={18} />
        <span>Search</span>
      </button>
    </form>
  );
}
