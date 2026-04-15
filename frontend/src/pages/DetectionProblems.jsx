import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './DetectionProblems.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SEVERITY_CONFIG = {
  severe: { label: 'Severe', className: 'severity-severe', icon: 'fa-exclamation-triangle' },
  moderate: { label: 'Moderate', className: 'severity-moderate', icon: 'fa-exclamation-circle' },
  mild: { label: 'Mild', className: 'severity-mild', icon: 'fa-info-circle' },
};

function DetectionProblems({ onLogout }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    selectCategory('physical');
    loadProblems();
  }, [selectCategory]);

  const loadProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/physical/detection-problems`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProblems(data.problems || []);
      } else {
        setError('Failed to load detection problems.');
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(problems.map((p) => p.category))];

  const filtered = activeCategory === 'All'
    ? problems
    : problems.filter((p) => p.category === activeCategory);

  return (
    <div className="dp-page">
      <Header onLogout={onLogout} />
      <main className="dp-main">
        <div className="dp-container">
          <div className="dp-header">
            <div className="dp-header-icon">
              <i className="fas fa-search-plus"></i>
            </div>
            <h1 className="dp-title">Detection Problems</h1>
            <p className="dp-subtitle">
              Common gait and physical abnormalities identified during rehabilitation assessments
            </p>
          </div>

          {loading && (
            <div className="dp-loading">
              <i className="fas fa-circle-notch fa-spin"></i>
              <span>Loading problems...</span>
            </div>
          )}

          {error && !loading && (
            <div className="dp-error">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
              <button className="dp-retry-btn" onClick={loadProblems}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="dp-category-filter">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`dp-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="dp-empty">
                  <i className="fas fa-clipboard-check"></i>
                  <p>No detection problems available in this category.</p>
                </div>
              ) : (
                <div className="dp-grid">
                  {filtered.map((problem) => {
                    const sev = SEVERITY_CONFIG[problem.severity_level] ?? SEVERITY_CONFIG.mild;
                    return (
                      <div key={problem._id} className={`dp-card ${sev.className}`}>
                        <div className="dp-card-header">
                          <div className="dp-card-title-row">
                            <h3 className="dp-card-name">{problem.name}</h3>
                            <span className={`dp-severity-badge ${sev.className}`}>
                              <i className={`fas ${sev.icon}`}></i>
                              {sev.label}
                            </span>
                          </div>
                          <div className="dp-card-meta">
                            <span className="dp-cat-tag">
                              <i className="fas fa-tag"></i>
                              {problem.category}
                            </span>
                            {problem.affected_area && (
                              <span className="dp-area-tag">
                                <i className="fas fa-map-marker-alt"></i>
                                {problem.affected_area}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="dp-card-body">
                          <p className="dp-description">{problem.description}</p>

                          {problem.normal_range && (
                            <div className="dp-info-row">
                              <span className="dp-info-label">
                                <i className="fas fa-chart-line"></i>
                                Normal Range
                              </span>
                              <span className="dp-info-value">{problem.normal_range}</span>
                            </div>
                          )}

                          {problem.indicators && problem.indicators.length > 0 && (
                            <div className="dp-indicators">
                              <div className="dp-indicators-label">
                                <i className="fas fa-clipboard-list"></i>
                                Clinical Indicators
                              </div>
                              <ul className="dp-indicators-list">
                                {problem.indicators.map((ind, i) => (
                                  <li key={i}>{ind}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="dp-action-row">
                <button className="dp-back-btn" onClick={() => navigate('/physical-therapy')}>
                  <i className="fas fa-arrow-left"></i>
                  Back to Physical Therapy
                </button>
                <button className="dp-exercises-btn" onClick={() => navigate('/exercise-recommendations')}>
                  View Exercise Recommendations
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default DetectionProblems;
