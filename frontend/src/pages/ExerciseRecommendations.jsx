import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './ExerciseRecommendations.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Beginner', className: 'diff-beginner' },
  intermediate: { label: 'Intermediate', className: 'diff-intermediate' },
  advanced: { label: 'Advanced', className: 'diff-advanced' },
};

function ExerciseRecommendations({ onLogout }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    selectCategory('physical');
    loadExercises();
  }, [selectCategory]);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/physical/exercise-recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setExercises(data.exercises || []);
      } else {
        setError('Failed to load exercise recommendations.');
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(exercises.map((e) => e.category))];
  const filtered = activeCategory === 'All'
    ? exercises
    : exercises.filter((e) => e.category === activeCategory);

  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="er-page">
      <Header onLogout={onLogout} />
      <main className="er-main">
        <div className="er-container">
          <div className="er-header">
            <div className="er-header-icon">
              <i className="fas fa-dumbbell"></i>
            </div>
            <h1 className="er-title">Exercise Recommendations</h1>
            <p className="er-subtitle">
              Therapeutic exercises recommended to address detected gait and physical problems
            </p>
          </div>

          {loading && (
            <div className="er-loading">
              <i className="fas fa-circle-notch fa-spin"></i>
              <span>Loading exercises...</span>
            </div>
          )}

          {error && !loading && (
            <div className="er-error">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
              <button className="er-retry-btn" onClick={loadExercises}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="er-category-filter">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`er-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="er-empty">
                  <i className="fas fa-clipboard-check"></i>
                  <p>No exercises available in this category.</p>
                </div>
              ) : (
                <div className="er-list">
                  {filtered.map((exercise) => {
                    const diff = DIFFICULTY_CONFIG[exercise.difficulty_level] ?? DIFFICULTY_CONFIG.beginner;
                    const isExpanded = expandedId === exercise._id;
                    return (
                      <div key={exercise._id} className="er-card">
                        <div
                          className="er-card-header"
                          onClick={() => handleToggleExpand(exercise._id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleToggleExpand(exercise._id)}
                        >
                          <div className="er-card-left">
                            <div className="er-card-title-row">
                              <h3 className="er-card-name">{exercise.name}</h3>
                              <span className={`er-diff-badge ${diff.className}`}>{diff.label}</span>
                            </div>
                            <div className="er-card-meta">
                              <span className="er-meta-tag">
                                <i className="fas fa-tag"></i>
                                {exercise.category}
                              </span>
                              {exercise.duration_minutes > 0 && (
                                <span className="er-meta-tag">
                                  <i className="fas fa-clock"></i>
                                  {exercise.duration_minutes} min
                                </span>
                              )}
                              {exercise.sets > 0 && exercise.repetitions > 0 && (
                                <span className="er-meta-tag">
                                  <i className="fas fa-redo"></i>
                                  {exercise.sets} sets × {exercise.repetitions} reps
                                </span>
                              )}
                            </div>
                          </div>
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} er-expand-icon`}></i>
                        </div>

                        {isExpanded && (
                          <div className="er-card-body">
                            <p className="er-description">{exercise.description}</p>

                            {exercise.target_problems && exercise.target_problems.length > 0 && (
                              <div className="er-section">
                                <div className="er-section-label">
                                  <i className="fas fa-bullseye"></i>
                                  Addresses
                                </div>
                                <div className="er-tags">
                                  {exercise.target_problems.map((p, i) => (
                                    <span key={i} className="er-problem-tag">{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {exercise.instructions && exercise.instructions.length > 0 && (
                              <div className="er-section">
                                <div className="er-section-label">
                                  <i className="fas fa-list-ol"></i>
                                  Instructions
                                </div>
                                <ol className="er-instructions-list">
                                  {exercise.instructions.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
                              <div className="er-section">
                                <div className="er-section-label">
                                  <i className="fas fa-tools"></i>
                                  Equipment Needed
                                </div>
                                <div className="er-tags">
                                  {exercise.equipment_needed.map((eq, i) => (
                                    <span key={i} className="er-equip-tag">{eq}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {exercise.precautions && (
                              <div className="er-precautions">
                                <i className="fas fa-exclamation-triangle"></i>
                                <span>{exercise.precautions}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="er-action-row">
                <button className="er-back-btn" onClick={() => navigate('/physical-therapy')}>
                  <i className="fas fa-arrow-left"></i>
                  Back to Physical Therapy
                </button>
                <button className="er-problems-btn" onClick={() => navigate('/detection-problems')}>
                  View Detection Problems
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

export default ExerciseRecommendations;
