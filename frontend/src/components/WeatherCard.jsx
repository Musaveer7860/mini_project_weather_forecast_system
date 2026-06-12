import { useRef, useEffect, useState } from 'react';
import { 
   Sun, 
   Cloud, 
   CloudRain, 
   CloudDrizzle, 
   CloudLightning, 
   Snowflake, 
   CloudFog, 
   CloudSun, 
   Droplets, 
   Wind, 
   Gauge,
   Eye,
   Thermometer,
   ShieldAlert,
   ShieldCheck,
   Shield,
   Info
} from 'lucide-react';
import './WeatherCard.css';

const getWeatherIcon = (condition, size = 64) => {
  const cond = condition ? condition.toLowerCase() : '';
  if (cond.includes('clear') || cond.includes('sunny')) {
    return <Sun size={size} style={{ color: '#eab308' }} className="animate-spin-slow" />;
  }
  if (cond.includes('thunderstorm')) {
    return <CloudLightning size={size} style={{ color: '#a855f7' }} />;
  }
  if (cond.includes('drizzle')) {
    return <CloudDrizzle size={size} style={{ color: '#60a5fa' }} />;
  }
  if (cond.includes('rain')) {
    return <CloudRain size={size} style={{ color: '#3b82f6' }} />;
  }
  if (cond.includes('snow')) {
    return <Snowflake size={size} style={{ color: '#93c5fd' }} />;
  }
  if (cond.includes('cloud')) {
    return <Cloud size={size} style={{ color: '#94a3b8' }} />;
  }
  if (cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) {
    return <CloudFog size={size} style={{ color: '#cbd5e1' }} />;
  }
  return <CloudSun size={size} style={{ color: '#64748b' }} />;
};

const getAQIDetails = (level) => {
  switch (level) {
    case 1:
      return { label: 'Good', color: '#10b981', desc: 'Air quality is excellent.' };
    case 2:
      return { label: 'Fair', color: '#84cc16', desc: 'Air quality is acceptable.' };
    case 3:
      return { label: 'Moderate', color: '#eab308', desc: 'Moderate pollution present.' };
    case 4:
      return { label: 'Poor', color: '#f97316', desc: 'Unhealthy for sensitive groups.' };
    case 5:
      return { label: 'Very Poor', color: '#ef4444', desc: 'Health warning! Stay indoors.' };
    default:
      return { label: 'Good', color: '#10b981', desc: '' };
  }
};

export default function WeatherCard({ weather, unit = 'C' }) {
  const cardRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, [weather]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!weather) return null;

  const { 
    city, 
    temp, 
    feelsLike, 
    tempMin, 
    tempMax, 
    condition, 
    description, 
    humidity, 
    windSpeed, 
    windDeg,
    pressure, 
    visibility, 
    aqi, 
    uv,
    forecast, 
    hourly,
    historical,
    weatherAdvice, 
    isMock 
  } = weather;

  const timezoneOffsetMs = (weather.timezone || 0) * 1000;
  const cityCurrentLocalDate = new Date(currentTime + timezoneOffsetMs);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = `${weekdays[cityCurrentLocalDate.getUTCDay()]}, ${months[cityCurrentLocalDate.getUTCMonth()]} ${cityCurrentLocalDate.getUTCDate()}`;
  const hoursStr = cityCurrentLocalDate.getUTCHours().toString().padStart(2, '0');
  const minutesStr = cityCurrentLocalDate.getUTCMinutes().toString().padStart(2, '0');
  const secondsStr = cityCurrentLocalDate.getUTCSeconds().toString().padStart(2, '0');
  const currentTimeStr = `${hoursStr}:${minutesStr}:${secondsStr}`;

  const formatTemp = (celsiusVal) => {
    if (celsiusVal === undefined) return 0;
    if (unit === 'F') {
      return Math.round((celsiusVal * 9) / 5 + 32);
    }
    return Math.round(celsiusVal);
  };

  const formatHourlyTime = (timeValue, idx) => {
    if (idx === 0) return 'Now';
    try {
      const utcTimeMs = timeValue * 1000;
      const cityLocalDate = new Date(utcTimeMs + timezoneOffsetMs);
      const hours = cityLocalDate.getUTCHours().toString().padStart(2, '0');
      return `${hours}:00`;
    } catch {
      return '';
    }
  };

  const formatForecastDayLabel = (day, idx) => {
    try {
      const dateObj = new Date((day.dt * 1000) + timezoneOffsetMs);
      const dayNum = dateObj.getUTCDate();
      const month = months[dateObj.getUTCMonth()];
      const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = shortWeekdays[dateObj.getUTCDay()];
      
      const cleanDate = `${dayNum} ${month}`;
      
      if (idx === 0) return `${cleanDate} Today`;
      if (idx === 1) return `${cleanDate} Tomorrow`;
      return `${cleanDate} ${dayName}`;
    } catch {
      return day.date || '';
    }
  };

  const getUVLabel = (uvVal) => {
    const val = Math.round(uvVal || 0);
    if (val <= 2) return `${val} Very weak`;
    if (val <= 5) return `${val} Moderate`;
    if (val <= 7) return `${val} High`;
    if (val <= 10) return `${val} Very high`;
    return `${val} Extreme`;
  };

  const getWindDirection = (deg) => {
    const val = Math.floor(((deg || 0) / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  const formatWindSpeed = (speedMs) => {
    if (unit === 'F') {
      return `${Math.round((speedMs || 0) * 2.237)} mph`;
    }
    return `${Math.round((speedMs || 0) * 3.6)} km/h`;
  };

  const aqiInfo = getAQIDetails(aqi);

  const renderAQIIcon = () => {
    if (aqi <= 2) return <ShieldCheck size={18} style={{ color: aqiInfo.color }} />;
    if (aqi === 3) return <Shield size={18} style={{ color: aqiInfo.color }} />;
    return <ShieldAlert size={18} style={{ color: aqiInfo.color }} />;
  };

  const renderHistoricalChart = () => {
    if (!historical || historical.length === 0) return null;

    const temps = historical.map(item => formatTemp(item.temp));
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp || 1;

    const svgWidth = 500;
    const svgHeight = 140;
    const paddingLeft = 40;
    const paddingRight = 40;
    const graphWidth = svgWidth - paddingLeft - paddingRight;

    const points = historical.map((item, idx) => {
      const x = paddingLeft + (idx / (historical.length - 1)) * graphWidth;
      const t = formatTemp(item.temp);
      const y = 105 - ((t - minTemp) / range) * 75;
      return { x, y, temp: t, date: item.date, raw: item };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }

    const fillPath = `${linePath} L ${points[points.length - 1].x} 120 L ${points[0].x} 120 Z`;

    return (
      <div className="trend-section">
        <h4 className="trend-title">
          Past 5 Days Temperature Trend
        </h4>
        
        <div className="trend-chart-container">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <line x1={paddingLeft} y1="30" x2={svgWidth - paddingRight} y2="30" stroke="var(--border-glass)" strokeDasharray="3" />
            <line x1={paddingLeft} y1="67" x2={svgWidth - paddingRight} y2="67" stroke="var(--border-glass)" strokeDasharray="3" />
            <line x1={paddingLeft} y1="105" x2={svgWidth - paddingRight} y2="105" stroke="var(--border-glass)" strokeDasharray="3" />

            <path d={fillPath} fill="url(#chartGrad)" />

            <path 
              d={linePath} 
              fill="none" 
              stroke="var(--accent-primary)" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {points.map((p, idx) => (
              <g key={idx}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={hoveredPoint === idx ? 7 : 5} 
                  fill="var(--bg-primary)" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={hoveredPoint === idx ? 4.5 : 3.5} 
                  style={{ transition: 'all 0.15s ease' }}
                />
                
                <text 
                  x={p.x} 
                  y={p.y - 12} 
                  textAnchor="middle" 
                  style={{
                    fill: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  {p.temp}°
                </text>

                <text 
                  x={p.x} 
                  y="132" 
                  textAnchor="middle" 
                  style={{
                    fill: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}
                >
                  {p.date}
                </text>

                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="18" 
                  fill="transparent" 
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </svg>

          {hoveredPoint !== null && (
            <div 
              className="trend-tooltip"
              style={{
                left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
                top: `${(points[hoveredPoint].y / svgHeight) * 100}%`
              }}
            >
              <div className="trend-tooltip-header">
                <span className="trend-tooltip-date">
                  {points[hoveredPoint].date}
                </span>
                {getWeatherIcon(points[hoveredPoint].raw.condition, 16)}
              </div>
              <div className="trend-tooltip-temp">
                {points[hoveredPoint].temp}°{unit}
              </div>
              <div className="trend-tooltip-details">
                <span>Condition: {points[hoveredPoint].raw.condition}</span>
                <span>Humidity: {points[hoveredPoint].raw.humidity}%</span>
                <span>Wind: {formatWindSpeed(points[hoveredPoint].raw.windSpeed)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={cardRef}
      className="glass-panel glow-card weather-card"
    >
      {isMock && (
        <span className="weather-offline-badge">
          OFFLINE DEMO MODE
        </span>
      )}

      <div className="weather-header">
        <div>
          <h2 className="weather-city-title">
            <span>{city}</span>
            <span className="weather-live-badge">
              <span className="weather-live-dot" />
              LIVE METEOROLOGICAL OBS
            </span>
          </h2>
          <div className="weather-subheader">
            <span>{currentDate}</span>
            <span style={{ color: 'var(--border-glass)' }}>|</span>
            <span className="weather-time-badge">
              {currentTimeStr}
            </span>
          </div>
        </div>
        
        <div className="weather-icon-wrapper">
          {getWeatherIcon(condition, 56)}
        </div>
      </div>

      <div className="weather-summary-section">
        <div className="temp-display-wrapper">
          <span className="temp-value">
            {formatTemp(temp)}
          </span>
          <span className="temp-unit">
            °{unit}
          </span>
        </div>

        <div className="condition-details">
          <h3 className="condition-title">
            {condition}
          </h3>
          <p className="condition-desc">
            {description}
          </p>
          <div className="temp-extremes">
            <span style={{ color: 'var(--danger)' }}>H: {formatTemp(tempMax)}°</span>
            <span style={{ color: 'var(--accent-primary)' }}>L: {formatTemp(tempMin)}°</span>
          </div>
        </div>
      </div>

      {hourly && hourly.length > 0 && (
        <div className="hourly-scroll-wrapper">
          {hourly.map((item, idx) => (
            <div key={idx} className="hourly-card">
              <span className="hourly-time">
                {formatHourlyTime(item.dt, idx)}
              </span>
              <div className="hourly-icon-container">
                {getWeatherIcon(item.condition, 24)}
              </div>
              <span className="hourly-temp">
                {formatTemp(item.temp)}°
              </span>
            </div>
          ))}
        </div>
      )}

      {aqi && (
        <div className="aqi-panel">
          <div className="aqi-summary-row">
            <div className="aqi-header-label">
              {renderAQIIcon()}
              <span>AIR QUALITY INDEX:</span>
            </div>
            <div 
              className="aqi-badge"
              style={{
                background: `color-mix(in srgb, ${aqiInfo.color} 12%, transparent)`,
                color: aqiInfo.color,
                border: `1px solid color-mix(in srgb, ${aqiInfo.color} 30%, transparent)`
              }}
            >
              {aqiInfo.label} (Level {aqi})
            </div>
            <span className="aqi-desc">
              {aqiInfo.desc}
            </span>
          </div>

          {weather.aqiComponents && (
            <div className="aqi-pollutants-grid">
              <div className="pollutant-card">
                <span className="pollutant-name">PM2.5</span>
                <span className="pollutant-value">
                  {weather.aqiComponents.pm2_5.toFixed(1)} <span className="pollutant-unit">µg/m³</span>
                </span>
              </div>
              <div className="pollutant-card">
                <span className="pollutant-name">PM10</span>
                <span className="pollutant-value">
                  {weather.aqiComponents.pm10.toFixed(1)} <span className="pollutant-unit">µg/m³</span>
                </span>
              </div>
              <div className="pollutant-card">
                <span className="pollutant-name">NO₂</span>
                <span className="pollutant-value">
                  {weather.aqiComponents.no2.toFixed(1)} <span className="pollutant-unit">µg/m³</span>
                </span>
              </div>
              <div className="pollutant-card">
                <span className="pollutant-name">O₃</span>
                <span className="pollutant-value">
                  {weather.aqiComponents.o3.toFixed(1)} <span className="pollutant-unit">µg/m³</span>
                </span>
              </div>
            </div>
          )}

          {weatherAdvice && (
            <div className="weather-report-section">
              <div className="weather-report-header">
                <Info size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>WEATHER REPORT</span>
              </div>
              <p className="weather-report-text">
                {weatherAdvice}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="weather-details-grid">
        <div className="weather-detail-card">
          <Sun size={22} style={{ color: 'var(--accent-secondary)' }} />
          <span className="weather-detail-label">UV</span>
          <span className="weather-detail-value">
            {getUVLabel(uv)}
          </span>
        </div>

        <div className="weather-detail-card">
          <Thermometer size={22} style={{ color: '#ef4444' }} />
          <span className="weather-detail-label">Feels like</span>
          <span className="weather-detail-value">
            {formatTemp(feelsLike)}°
          </span>
        </div>

        <div className="weather-detail-card">
          <Droplets size={22} style={{ color: 'var(--accent-primary)' }} />
          <span className="weather-detail-label">Humidity</span>
          <span className="weather-detail-value">
            {humidity}%
          </span>
        </div>

        <div className="weather-detail-card">
          <Wind size={22} style={{ color: 'var(--text-secondary)' }} />
          <span className="weather-detail-label">
            {getWindDirection(windDeg)} wind
          </span>
          <span className="weather-detail-value">
            {formatWindSpeed(windSpeed)}
          </span>
        </div>

        <div className="weather-detail-card">
          <Gauge size={22} style={{ color: '#10b981' }} />
          <span className="weather-detail-label">Air pressure</span>
          <span className="weather-detail-value">
            {pressure} hPa
          </span>
        </div>

        <div className="weather-detail-card">
          <Eye size={22} style={{ color: '#a855f7' }} />
          <span className="weather-detail-label">Visibility</span>
          <span className="weather-detail-value">
            {visibility} km
          </span>
        </div>
      </div>

      {renderHistoricalChart()}

      {forecast && forecast.length > 0 && (
        <div className="forecast-section">
          <h4 className="forecast-title">
            Multi-day forecast
          </h4>
          
          <div className="forecast-list">
            {forecast.map((day, idx) => (
              <div 
                key={idx}
                className="forecast-row"
              >
                <span className="forecast-day">
                  {formatForecastDayLabel(day, idx)}
                </span>

                <div className="forecast-icon-container">
                  {getWeatherIcon(day.condition, 26)}
                </div>

                <span className="forecast-temp-range">
                  <span>{formatTemp(day.tempMin)}°</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem', fontWeight: 400 }}>/</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatTemp(day.tempMax)}°</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style>{`
        .hourly-scroll-container::-webkit-scrollbar {
          height: 4px;
        }
        .hourly-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
