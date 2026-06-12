import { Sun, Moon } from 'lucide-react';
import './Navbar.css';

export default function Navbar({ theme, toggleTheme, unit, toggleUnit }) {
  return (
    <header className="glass-panel navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4.5" />
            <path d="M3 13.5c3-1.5 6-1.5 9 0s6 1.5 9 0" />
            <path d="M5.5 17c2.5-1.2 5-1.2 7.5 0s5 1.2 7.5 0" />
            <path d="M8 20.5c1.8-0.8 3.5-0.8 5.3 0s3.5 0.8 5.3 0" />
          </svg>
        </div>
        <div>
          <h1 className="navbar-title">
            Weather Forecast System
          </h1>
        </div>
      </div>

      <div className="navbar-actions">
        <button
          onClick={toggleUnit}
          aria-label="Toggle temperature unit"
          className="btn-unit-toggle"
        >
          {unit === 'C' ? '°C' : '°F'}
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="btn-theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="theme-icon-sun" style={{ color: '#fbbf24' }} />
          ) : (
            <Moon size={18} className="theme-icon-moon" style={{ color: '#3b82f6' }} />
          )}
        </button>
      </div>
    </header>
  );
}
