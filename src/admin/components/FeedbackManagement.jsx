import { useState, useEffect } from 'react';
import { getFeedbacks, updateFeedbackStatus, getFeedbackStats } from '../services/adminService';

function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [feedbacksData, statsData] = await Promise.all([
        getFeedbacks(filters),
        getFeedbackStats()
      ]);
      setFeedbacks(feedbacksData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateFeedbackStatus(id, newStatus);
      await loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      punctuality: '⏰',
      cleanliness: '🧹',
      driver: '👤',
      crowding: '👥',
      facilities: '🚌',
      other: '📝'
    };
    return icons[category] || '📝';
  };

  const getStatusBadge = (status) => {
    const classes = {
      pending: 'badge-warning',
      reviewed: 'badge-info',
      action_taken: 'badge-success'
    };
    const labels = {
      pending: 'Pending',
      reviewed: 'Reviewed',
      action_taken: 'Action Taken'
    };
    return <span className={`badge ${classes[status]}`}>{labels[status]}</span>;
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesCategory = !filters.category || fb.category === filters.category;
    const matchesStatus = !filters.status || fb.status === filters.status;
    const matchesSearch = !searchTerm || 
      fb.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fb.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fb.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  if (loading) return <div className="loading">Loading feedback...</div>;

  return (
    <div className="feedback-management ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">💬</span>
              User Feedback Analytics
            </h2>
            <p className="ultra-subtitle">Monitor passenger satisfaction and service quality insights</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill total">
              <span className="stat-value">{stats?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-pill rating">
              <span className="stat-value">{stats?.avgRating || 0} ★</span>
              <span className="stat-label">Avg Rating</span>
            </div>
            <div className="stat-pill pending">
              <span className="stat-value">{stats?.byStatus?.pending || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      {stats && (
        <div className="ultra-stats-grid">
          <div className="ultra-stat-card primary">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Feedback</div>
            </div>
          </div>
          <div className="ultra-stat-card success">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-value">{stats.avgRating} ★</div>
              <div className="stat-label">Average Rating</div>
            </div>
          </div>
          <div className="ultra-stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus.pending || 0}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="ultra-stat-card info">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.byStatus.action_taken || 0}</div>
              <div className="stat-label">Actions Taken</div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter & Search Bar */}
      <div className="ultra-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search feedback by comment, bus, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ultra-search-input"
            />
          </div>
        </div>
        <div className="filter-section">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="ultra-filter-select"
          >
            <option value="">All Categories</option>
            <option value="punctuality">⏰ Punctuality</option>
            <option value="cleanliness">🧹 Cleanliness</option>
            <option value="driver">👤 Driver</option>
            <option value="crowding">👥 Crowding</option>
            <option value="facilities">🚌 Facilities</option>
            <option value="other">📝 Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="ultra-filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="reviewed">👁️ Reviewed</option>
            <option value="action_taken">✅ Action Taken</option>
          </select>
        </div>
        <div className="results-info">
          <span className="result-count">{filteredFeedbacks.length} feedback items</span>
        </div>
      </div>

      {/* Ultra-Modern Feedback List */}
      <div className="ultra-feedback-section">
        {filteredFeedbacks.length === 0 ? (
          <div className="ultra-empty-state">
            <div className="empty-icon">📭</div>
            <h3>No feedback found</h3>
            <p>
              {searchTerm 
                ? `No feedback matches "${searchTerm}"`
                : "No feedback matches the selected filters"
              }
            </p>
          </div>
        ) : (
          <div className="ultra-feedback-grid">
            {filteredFeedbacks.map((fb, index) => (
              <div 
                key={fb.id} 
                className={`ultra-feedback-card rating-${fb.rating}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feedback-card-header">
                  <div className="feedback-meta-section">
                    <div className="category-info">
                      <span className="category-icon">{getCategoryIcon(fb.category)}</span>
                      <span className="category-name">{fb.category}</span>
                    </div>
                    <div className="bus-info">
                      <span className="bus-tag">🚌 Bus {fb.busNumber}</span>
                    </div>
                  </div>
                  <div className="feedback-status-section">
                    {getStatusBadge(fb.status)}
                  </div>
                </div>

                <div className="feedback-card-body">
                  <div className="rating-section">
                    <div className="rating-display">
                      <span className={`stars rating-${fb.rating}`}>{getRatingStars(fb.rating)}</span>
                      <span className="rating-text">{fb.rating}/5 Stars</span>
                    </div>
                  </div>
                  
                  <div className="comment-section">
                    <p className="feedback-comment">"{fb.comment}"</p>
                  </div>
                  
                  <div className="feedback-meta-grid">
                    <div className="meta-item">
                      <span className="meta-label">Submitted</span>
                      <span className="meta-value">{formatTime(fb.timestamp)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Category</span>
                      <span className="meta-value">{fb.category}</span>
                    </div>
                  </div>
                </div>

                {fb.status === 'pending' && (
                  <div className="feedback-card-actions">
                    <button
                      className="ultra-btn secondary small"
                      onClick={() => handleStatusChange(fb.id, 'reviewed')}
                    >
                      <span className="btn-icon">👁️</span>
                      Mark Reviewed
                    </button>
                    <button
                      className="ultra-btn success small"
                      onClick={() => handleStatusChange(fb.id, 'action_taken')}
                    >
                      <span className="btn-icon">✅</span>
                      Action Taken
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackManagement;
