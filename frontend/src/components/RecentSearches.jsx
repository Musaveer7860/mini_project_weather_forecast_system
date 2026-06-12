import { History, Trash2 } from 'lucide-react';
import './RecentSearches.css';

const formatSearchTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Recently';
  }
};

const formatTemp = (celsiusVal, unit) => {
  if (celsiusVal === undefined) return 0;
  if (unit === 'F') {
    return Math.round((celsiusVal * 9) / 5 + 32);
  }
  return Math.round(celsiusVal);
};

export default function RecentSearches({ history, onSelectCity, onClearHistory, onDeleteHistoryItem, unit = 'C' }) {
  return (
    <div className="glass-panel recent-searches-panel">
      <div className="recent-searches-header">
        <div className="recent-searches-title-wrapper">
          <History size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="recent-searches-title">Recent Searches</h3>
        </div>
        
        {history && history.length > 0 && (
          <button 
            onClick={onClearHistory}
            className="btn-clear-all"
          >
            Clear All
          </button>
        )}
      </div>

      {!history || history.length === 0 ? (
        <div className="recent-searches-empty">
          No recent searches found.
          <p className="recent-searches-empty-sub">Your search history will appear here.</p>
        </div>
      ) : (
        <div className="recent-searches-list">
          {history.map((item, idx) => (
            <div 
              key={item._id || idx}
              onClick={() => onSelectCity(item.city)}
              className="recent-search-card"
            >
              <div className="recent-search-info">
                <span className="recent-search-city">
                  {item.city}
                </span>
                <span className="recent-search-time">
                  {formatSearchTime(item.timestamp)}
                </span>
              </div>

              <div className="recent-search-metrics">
                <div className="recent-search-temp-wrapper">
                  <span className="recent-search-temp-badge">
                    {formatTemp(item.temp, unit)}°{unit}
                  </span>
                  <span className="recent-search-cond-label">
                    {item.condition}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHistoryItem(item.city);
                  }}
                  className="btn-delete-history"
                  title="Delete search"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
