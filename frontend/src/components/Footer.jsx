import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="glass-panel footer-panel">
      <div className="footer-grid">
        <div className="footer-column">
          <div className="footer-logo-row">
            <div className="footer-logo-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4.5" />
                <path d="M3 13.5c3-1.5 6-1.5 9 0s6 1.5 9 0" />
                <path d="M5.5 17c2.5-1.2 5-1.2 7.5 0s5 1.2 7.5 0" />
                <path d="M8 20.5c1.8-0.8 3.5-0.8 5.3 0s3.5 0.8 5.3 0" />
              </svg>
            </div>
            <span className="footer-logo-text">
              Weather Forecast System
            </span>
          </div>
          <p className="footer-desc">
            A modern weather forecasting dashboard built for my web development internship. Displays real-time current conditions, hourly projections, and a 5-day temperature trend using the OpenWeather API.
          </p>
          <div className="footer-status-row">
            <span className="footer-status-dot" />
            <span className="footer-status-text">
              24/7 real time updates active service
            </span>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-heading">
            Technologies Used
          </h4>
          <div className="footer-links-list">
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="footer-link">React.js & Vite</a>
            <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="footer-link">Node.js & Express</a>
            <a href="https://www.mongodb.com" target="_blank" rel="noopener noreferrer" className="footer-link">MongoDB Database</a>
            <a href="https://openweathermap.org" target="_blank" rel="noopener noreferrer" className="footer-link">OpenWeather Map API</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          &copy; {currentYear} Weather Forecast System. All rights reserved.
        </span>
      </div>

      <style>{`
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 500;
          transition: all 0.2s ease;
          width: fit-content;
        }
        .footer-link:hover {
          color: var(--accent-primary);
          transform: translateX(3px);
        }
      `}</style>
    </footer>
  );
}
