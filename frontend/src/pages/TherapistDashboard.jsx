import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, authService, fluencyExerciseService, languageExerciseService, receptiveExerciseService } from '../services/api';
import { images } from '../assets/images';
import './AdminDashboard.css';

function TherapistDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSub, setActiveSub] = useState('receptive');
  const [therapyData, setTherapyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFluencyLevels, setShowFluencyLevels] = useState(false);
  const [fluencyExercises, setFluencyExercises] = useState({});
  const [editingExercise, setEditingExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({
    level: 1,
    level_name: 'Breathing & Single Words',
    level_color: '#e8b04e',
    exercise_id: '',
    type: 'controlled-breathing',
    instruction: '',
    target: '',
    expected_duration: 3,
    breathing: true,
    is_active: false
  });

  // Language exercise states
  const [showLanguageLevels, setShowLanguageLevels] = useState(false);
  const [languageExercises, setLanguageExercises] = useState({});
  const [editingLanguageExercise, setEditingLanguageExercise] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // Initialize new language exercise based on mode
  const getDefaultLanguageExercise = (mode) => {
    if (mode === 'receptive') {
      return {
        mode: 'receptive',
        level: 1,
        level_name: 'Vocabulary',
        level_color: '#3b82f6',
        exercise_id: '',
        type: 'vocabulary',
        instruction: '',
        target: '',
        options: [
          { id: 1, text: '', image: '', correct: false },
          { id: 2, text: '', image: '', correct: false },
          { id: 3, text: '', image: '', correct: false },
          { id: 4, text: '', image: '', correct: false }
        ],
        order: 1,
        is_active: true
      };
    } else {
      return {
        mode: 'expressive',
        level: 1,
        level_name: 'Picture Description',
        level_color: '#8b5cf6',
        exercise_id: '',
        type: 'description',
        instruction: '',
        prompt: '',
        expected_keywords: [],
        min_words: 5,
        story: '',
        is_active: false
      };
    }
  };
  
  const [newLanguageExercise, setNewLanguageExercise] = useState(getDefaultLanguageExercise('expressive'));

  // Load exercises from database and group by level
  const loadFluencyExercises = async () => {
    try {
      const response = await fluencyExerciseService.getAll();
      if (response.success) {
        // Group exercises by level
        const grouped = {};
        response.exercises.forEach(ex => {
          if (!grouped[ex.level]) {
            grouped[ex.level] = {
              name: ex.level_name,
              color: ex.level_color,
              exercises: []
            };
          }
          grouped[ex.level].exercises.push({
            _id: ex._id,
            id: ex.exercise_id,
            type: ex.type,
            instruction: ex.instruction,
            target: ex.target,
            expectedDuration: ex.expected_duration,
            breathing: ex.breathing,
            is_active: ex.is_active,
            order: ex.order
          });
        });
        
        // Sort exercises within each level by order
        Object.values(grouped).forEach(level => {
          level.exercises.sort((a, b) => a.order - b.order);
        });
        
        setFluencyExercises(grouped);
      }
    } catch (error) {
      console.error('Failed to load fluency exercises:', error);
    }
  };

  const handleSeedExercises = async () => {
    if (!window.confirm('This will seed the database with default exercises. Continue?')) return;
    try {
      const response = await fluencyExerciseService.seedDefault();
      if (response.success) {
        alert(`Successfully seeded ${response.count} exercises!`);
        loadFluencyExercises();
      }
    } catch (error) {
      alert('Failed to seed exercises: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateExercise = async () => {
    try {
      const response = await fluencyExerciseService.create(newExercise);
      if (response.success) {
        setShowExerciseModal(false);
        setNewExercise({
          level: 1,
          level_name: 'Breathing & Single Words',
          level_color: '#e8b04e',
          order: 1,
          exercise_id: '',
          type: '',
          instruction: '',
          target: '',
          expected_duration: 3,
          breathing: true,
          is_active: false
        });
        loadFluencyExercises();
        alert('Exercise created successfully!');
      }
    } catch (error) {
      alert('Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateExercise = async () => {
    try {
      const response = await fluencyExerciseService.update(editingExercise._id, editingExercise);
      if (response.success) {
        setEditingExercise(null);
        loadFluencyExercises();
        alert('Exercise updated successfully!');
      }
    } catch (error) {
      alert('Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) return;
    try {
      const response = await fluencyExerciseService.delete(id);
      if (response.success) {
        loadFluencyExercises();
        alert('Exercise deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const response = await fluencyExerciseService.toggleActive(id);
      if (response.success) {
        loadFluencyExercises();
      }
    } catch (error) {
      alert('Failed to toggle exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  // ============= LANGUAGE EXERCISE CRUD FUNCTIONS =============
  
  const loadLanguageExercises = async () => {
    try {
      // Use the appropriate service based on mode
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      const response = activeSub === 'receptive' 
        ? await service.getAll()  // receptive doesn't need mode parameter
        : await service.getAll(activeSub);  // expressive needs mode parameter
      
      if (response.success) {
        // Group exercises by level
        const grouped = {};
        response.exercises.forEach(ex => {
          const level = ex.level;
          if (!grouped[level]) {
            // Determine level metadata based on mode
            let levelName, levelColor;
            if (activeSub === 'receptive') {
              // Receptive levels
              if (level === 1) {
                levelName = 'Vocabulary';
                levelColor = '#3b82f6';
              } else if (level === 2) {
                levelName = 'Directions';
                levelColor = '#3b82f6';
              } else if (level === 3) {
                levelName = 'Comprehension';
                levelColor = '#3b82f6';
              } else {
                levelName = `Level ${level}`;
                levelColor = '#3b82f6';
              }
            } else {
              // Expressive levels (from database)
              levelName = ex.level_name || `Level ${level}`;
              levelColor = ex.level_color || '#8b5cf6';
            }
            
            grouped[level] = {
              name: levelName,
              color: levelColor,
              exercises: []
            };
          }
          
          grouped[level].exercises.push({
            _id: ex._id,
            id: ex.exercise_id,
            type: ex.type,
            instruction: ex.instruction,
            prompt: ex.prompt,
            target: ex.target || '',
            options: ex.options || [],
            expectedKeywords: ex.expected_keywords,
            minWords: ex.min_words,
            story: ex.story,
            is_active: ex.is_active,
            order: ex.order
          });
        });
        
        // Sort exercises within each level by order
        Object.values(grouped).forEach(level => {
          level.exercises.sort((a, b) => a.order - b.order);
        });
        
        setLanguageExercises(grouped);
      }
    } catch (error) {
      console.error('Failed to load language exercises:', error);
    }
  };

  const handleSeedLanguageExercises = async () => {
    const modeText = activeSub === 'receptive' ? 'receptive' : 'expressive';
    if (!window.confirm(`This will seed the database with default ${modeText} language exercises. Continue?`)) return;
    try {
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      const response = await service.seedDefault();
      if (response.success) {
        alert(`Successfully seeded ${response.count} exercises!`);
        loadLanguageExercises();
      }
    } catch (error) {
      alert('Failed to seed exercises: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateLanguageExercise = async () => {
    try {
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      
      // Prepare data based on mode
      let exerciseData = { ...newLanguageExercise };
      if (activeSub === 'expressive' && typeof exerciseData.expected_keywords === 'string') {
        // Convert comma-separated string to array
        exerciseData.expected_keywords = exerciseData.expected_keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k);
      }
      
      const response = await service.create(exerciseData);
      if (response.success) {
        setShowLanguageModal(false);
        setNewLanguageExercise(getDefaultLanguageExercise(activeSub));
        loadLanguageExercises();
        alert('Exercise created successfully!');
      }
    } catch (error) {
      alert('Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateLanguageExercise = async () => {
    try {
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      const response = await service.update(editingLanguageExercise._id, editingLanguageExercise);
      if (response.success) {
        setEditingLanguageExercise(null);
        loadLanguageExercises();
        alert('Exercise updated successfully!');
      }
    } catch (error) {
      alert('Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteLanguageExercise = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) return;
    try {
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      const response = await service.delete(id);
      if (response.success) {
        loadLanguageExercises();
        alert('Exercise deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleLanguageActive = async (id) => {
    try {
      const service = activeSub === 'receptive' ? receptiveExerciseService : languageExerciseService;
      const response = await service.toggleActive(id);
      if (response.success) {
        loadLanguageExercises();
      }
    } catch (error) {
      alert('Failed to toggle exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    const stored = authService.getStoredUser();
    setUser(stored);
  }, []);

  useEffect(() => {
    // Load default overview stats via admin stats
    if (activeTab !== 'overview') return;
    loadOverview();
  }, [activeTab]);

  useEffect(() => {
    // Load therapy data when switching tabs
    if (activeTab === 'articulation') loadArticulation();
    if (activeTab === 'language') {
      loadLanguage(activeSub); // Load patient session data
      if (showLanguageLevels) loadLanguageExercises(); // Load exercises for CRUD
    }
    if (activeTab === 'fluency') {
      loadFluency(); // Load patient session data
      if (showFluencyLevels) loadFluencyExercises(); // Load exercises for CRUD
    }
    if (activeTab === 'physical') loadPhysical();
  }, [activeTab, activeSub, showFluencyLevels, showLanguageLevels]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      // Therapists don't have access to admin stats
      // Show a simple welcome message instead
      setTherapyData([
        { id: 'welcome', label: 'Welcome', value: 'Therapist Dashboard' },
        { id: 'info', label: 'Info', value: 'Use the sidebar to manage therapy exercises' },
      ]);
    } catch (e) {
      console.error('Failed to load overview', e);
    } finally {
      setLoading(false);
    }
  };

  const loadArticulation = async () => {
    setLoading(true);
    try {
      // Therapists don't have access to patient data
      // This is for managing exercises only
      setTherapyData([
        { id: 'info', label: 'Info', value: 'Exercise management coming soon' }
      ]);
    } catch (e) {
      console.error('Failed to load articulation', e);
      setTherapyData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguage = async (mode) => {
    setLoading(true);
    try {
      // Therapists don't have access to patient data
      setTherapyData([
        { id: 'info', label: 'Info', value: 'Exercise management coming soon' }
      ]);
    } catch (e) {
      console.error('Failed to load language', e);
      setTherapyData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFluency = async () => {
    setLoading(true);
    try {
      // Therapists don't have access to patient session data
      // They can only manage exercises via the Therapy Levels tab
      setTherapyData([]);
    } catch (e) {
      console.error('Failed to load fluency', e);
      setTherapyData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPhysical = async () => {
    setLoading(true);
    try {
      // Therapists don't have access to patient data
      setTherapyData([
        { id: 'info', label: 'Info', value: 'Exercise management coming soon' }
      ]);
    } catch (e) {
      console.error('Failed to load physical', e);
      setTherapyData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
  };

  const filtered = therapyData.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (item.user_name && item.user_name.toLowerCase().includes(term)) ||
           (item.user_email && item.user_email.toLowerCase().includes(term));
  });

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={images.logo} alt="CVAPed Logo" className="logo-img" />
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>CVAPed</h2>
                <span className="admin-badge">Therapist</span>
              </div>
            )}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setTherapyData([]); }}>
            <span className="nav-icon">📊</span>
            {!sidebarCollapsed && <span className="nav-label">Overview</span>}
          </button>

          <div>
            <button className={`nav-item ${activeTab === 'speech' || activeTab.startsWith('speech-') ? 'active' : ''}`} onClick={() => { setActiveTab('speech'); setActiveSub(null); }}>
              <span className="nav-icon">🎤</span>
              {!sidebarCollapsed && <span className="nav-label">Speech Therapy</span>}
            </button>
            {!sidebarCollapsed && (
              <div className="sub-nav">
                <button className={`nav-item sub-item ${activeTab === 'articulation' ? 'active' : ''}`} onClick={() => { setActiveTab('articulation'); setTherapyData([]); }}>
                  <span className="nav-label">Articulation</span>
                </button>
                <div>
                  <button className={`nav-item sub-item ${activeTab === 'language' ? 'active' : ''}`} onClick={() => { setActiveTab('language'); setActiveSub('receptive'); setTherapyData([]); }}>
                    <span className="nav-label">Language</span>
                  </button>
                  {activeTab === 'language' && (
                    <div className="sub-sub-nav">
                      <button className={`nav-item sub-sub-item ${activeSub === 'receptive' ? 'active' : ''}`} onClick={() => { setActiveSub('receptive'); }}>
                        Receptive
                      </button>
                      <button className={`nav-item sub-sub-item ${activeSub === 'expressive' ? 'active' : ''}`} onClick={() => { setActiveSub('expressive'); }}>
                        Expressive
                      </button>
                    </div>
                  )}
                </div>
                <button className={`nav-item sub-item ${activeTab === 'fluency' ? 'active' : ''}`} onClick={() => { setActiveTab('fluency'); setTherapyData([]); }}>
                  <span className="nav-label">Fluency</span>
                </button>
              </div>
            )}
          </div>

          <button className={`nav-item ${activeTab === 'physical' ? 'active' : ''}`} onClick={() => { setActiveTab('physical'); setTherapyData([]); }}>
            <span className="nav-icon">🏃</span>
            {!sidebarCollapsed && <span className="nav-label">Physical Therapy</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</div>
            {!sidebarCollapsed && (
              <div className="profile-info">
                <p className="profile-name">{user?.firstName} {user?.lastName}</p>
                <p className="profile-role">Therapist</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <h1 className="page-title">{activeTab === 'overview' ? 'Overview' : activeTab === 'physical' ? 'Physical Therapy' : activeTab === 'articulation' ? 'Articulation' : activeTab === 'language' ? `Language - ${activeSub}` : activeTab === 'fluency' ? 'Fluency' : 'Therapist'}</h1>
            <p className="page-subtitle">Welcome, {user?.firstName}</p>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => navigate('/profile')}>👤 Profile</button>
            <button className="header-btn logout-btn" onClick={onLogout}>🚪 Logout</button>
          </div>
        </header>

        <div className="admin-content">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="stats-grid">
              {therapyData.map(card => (
                <div key={card.id} className="stat-card">
                  <div className="stat-header">
                    <div className="stat-icon" style={{ backgroundColor: '#479ac315', color: '#479ac3' }}>{card.label[0]}</div>
                  </div>
                  <div className="stat-body">
                    <h3 className="stat-value">{card.value}</h3>
                    <p className="stat-label">{card.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === 'articulation' || activeTab === 'physical') && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>{activeTab === 'articulation' ? 'Articulation Sessions' : 'Physical Sessions'}</h2>
                </div>
                <div className="users-actions">
                  <input type="text" placeholder="Search by user..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Info</th>
                      <th>Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? (
                      filtered.map(item => (
                        <tr key={item.id}>
                          <td>{item.user_name}<br/><small>{item.user_email}</small></td>
                          <td>{item.exercise_type || item.mode || item.word || item.exercise_id || '—'}</td>
                          <td>{item.score || item.fluency_score || item.score === 0 ? (item.score ?? item.fluency_score ?? item.score) : '—'}</td>
                          <td>{formatDate(item.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="no-data">{searchTerm ? 'No results' : 'No data available'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">Showing {filtered.length} of {therapyData.length}</div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Language Therapy - {activeSub === 'receptive' ? 'Receptive' : 'Expressive'}</h2>
                  <p className="users-subtitle">Therapy levels and exercises for patient assignments</p>
                </div>
                <div className="users-actions">
                  <button 
                    className={`tab-btn ${showLanguageLevels ? 'active' : ''}`}
                    onClick={() => setShowLanguageLevels(true)}
                  >
                    📚 Exercise Levels
                  </button>
                  <button 
                    className={`tab-btn ${!showLanguageLevels ? 'active' : ''}`}
                    onClick={() => setShowLanguageLevels(false)}
                  >
                    📊 Patient Sessions
                  </button>
                </div>
              </div>

              {showLanguageLevels ? (
                <div className="fluency-levels-container">
                  <div className="users-actions" style={{ padding: '0 24px 16px', gap: '8px', display: 'flex' }}>
                    <button className="primary-btn" onClick={handleSeedLanguageExercises}>
                      🌱 Seed Default Exercises
                    </button>
                    <button className="primary-btn" onClick={() => {
                      setNewLanguageExercise(getDefaultLanguageExercise(activeSub));
                      setShowLanguageModal(true);
                    }}>
                      ➕ New Exercise
                    </button>
                  </div>
                  
                  {Object.keys(languageExercises).length === 0 ? (
                    <div className="no-data" style={{ padding: '40px', textAlign: 'center' }}>
                      <p>No exercises found. Click "Seed Default Exercises" to get started.</p>
                    </div>
                  ) : (
                    Object.entries(languageExercises).map(([level, data]) => (
                      <div key={level} className="level-section">
                        <div className="level-header" style={{ borderLeftColor: data.color }}>
                          <h3 style={{ color: data.color }}>Level {level}: {data.name}</h3>
                          <span className="exercise-count">{data.exercises.length} exercises</span>
                        </div>
                        <div className="exercises-grid">
                          {data.exercises.map((exercise, idx) => (
                            <div key={exercise._id} className="exercise-card" style={{ opacity: exercise.is_active ? 1 : 0.6 }}>
                              <div className="exercise-header">
                                <span className="exercise-number">#{idx + 1}</span>
                                <span className="exercise-type" style={{ background: `${data.color}20`, color: data.color }}>
                                  {exercise.type}
                                </span>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={exercise.is_active}
                                      onChange={() => handleToggleLanguageActive(exercise._id)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                    Active
                                  </label>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => setEditingLanguageExercise(exercise)}
                                    title="Edit exercise"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="icon-btn danger" 
                                    onClick={() => handleDeleteLanguageExercise(exercise._id)}
                                    title="Delete exercise"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="exercise-content">
                                <p className="exercise-instruction">{exercise.instruction}</p>
                                <div className="exercise-target">
                                  <strong>Prompt:</strong> "{exercise.prompt}"
                                </div>
                                {exercise.story && (
                                  <div className="exercise-target" style={{ marginTop: '8px' }}>
                                    <strong>Story:</strong> {exercise.story.substring(0, 80)}...
                                  </div>
                                )}
                                <div className="exercise-meta">
                                  <span className="duration">📝 {exercise.minWords} words</span>
                                  <span className="breathing-badge">🔑 {exercise.expectedKeywords?.length || 0} keywords</span>
                                  {!exercise.is_active && <span className="inactive-badge">👁️ Hidden from patients</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="users-actions" style={{ padding: '0 24px 16px' }}>
                    <input type="text" placeholder="Search by user..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Exercise Type</th>
                          <th>Score</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length > 0 ? (
                          filtered.map(item => (
                            <tr key={item.id}>
                              <td>{item.user_name}<br/><small>{item.user_email}</small></td>
                              <td><span className="badge primary">{item.exercise_type || '—'}</span></td>
                              <td><span className="stat-number">{item.score || '—'}</span></td>
                              <td>{formatDate(item.created_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="no-data">{searchTerm ? 'No results' : 'No language sessions available'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <div className="table-info">Showing {filtered.length} of {therapyData.length} sessions</div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'fluency' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Fluency Therapy</h2>
                  <p className="users-subtitle">Therapy levels and exercises for patient assignments</p>
                </div>
                <div className="users-actions">
                  <button 
                    className={`tab-btn ${showFluencyLevels ? 'active' : ''}`}
                    onClick={() => setShowFluencyLevels(true)}
                  >
                    📚 Therapy Levels
                  </button>
                  <button 
                    className={`tab-btn ${!showFluencyLevels ? 'active' : ''}`}
                    onClick={() => setShowFluencyLevels(false)}
                  >
                    📊 Patient Sessions
                  </button>
                </div>
              </div>

              {showFluencyLevels ? (
                <div className="fluency-levels-container">
                  <div className="users-actions" style={{ padding: '0 24px 16px', gap: '8px', display: 'flex' }}>
                    <button className="primary-btn" onClick={handleSeedExercises}>
                      🌱 Seed Default Exercises
                    </button>
                    <button className="primary-btn" onClick={() => setShowExerciseModal(true)}>
                      ➕ New Exercise
                    </button>
                  </div>
                  
                  {Object.keys(fluencyExercises).length === 0 ? (
                    <div className="no-data" style={{ padding: '40px', textAlign: 'center' }}>
                      <p>No exercises found. Click "Seed Default Exercises" to get started.</p>
                    </div>
                  ) : (
                    Object.entries(fluencyExercises).map(([level, data]) => (
                      <div key={level} className="level-section">
                        <div className="level-header" style={{ borderLeftColor: data.color }}>
                          <h3 style={{ color: data.color }}>Level {level}: {data.name}</h3>
                          <span className="exercise-count">{data.exercises.length} exercises</span>
                        </div>
                        <div className="exercises-grid">
                          {data.exercises.map((exercise, idx) => (
                            <div key={exercise._id} className="exercise-card" style={{ opacity: exercise.is_active ? 1 : 0.6 }}>
                              <div className="exercise-header">
                                <span className="exercise-number">#{idx + 1}</span>
                                <span className="exercise-type" style={{ background: `${data.color}20`, color: data.color }}>
                                  {exercise.type}
                                </span>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={exercise.is_active}
                                      onChange={() => handleToggleActive(exercise._id)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                    Active
                                  </label>
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => setEditingExercise(exercise)}
                                    title="Edit exercise"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="icon-btn danger" 
                                    onClick={() => handleDeleteExercise(exercise._id)}
                                    title="Delete exercise"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              <div className="exercise-content">
                                <p className="exercise-instruction">{exercise.instruction}</p>
                                <div className="exercise-target">
                                  <strong>Target:</strong> "{exercise.target}"
                                </div>
                                <div className="exercise-meta">
                                  <span className="duration">⏱️ {exercise.expectedDuration}s</span>
                                  {exercise.breathing && <span className="breathing-badge">🫁 Breathing</span>}
                                  {!exercise.is_active && <span className="inactive-badge">👁️ Hidden from patients</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="users-actions" style={{ padding: '0 24px 16px' }}>
                    <input type="text" placeholder="Search by user..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Exercise Type</th>
                          <th>Fluency Score</th>
                          <th>Words</th>
                          <th>Fillers</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length > 0 ? (
                          filtered.map(item => (
                            <tr key={item.id}>
                              <td>{item.user_name}<br/><small>{item.user_email}</small></td>
                              <td><span className="badge primary">{item.exercise_type || '—'}</span></td>
                              <td><span className="stat-number">{item.fluency_score}%</span></td>
                              <td>{item.word_count || 0}</td>
                              <td>{item.filler_count || 0}</td>
                              <td>{formatDate(item.created_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="no-data">{searchTerm ? 'No results' : 'No fluency sessions available'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <div className="table-info">Showing {filtered.length} of {therapyData.length} sessions</div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Create Exercise Modal */}
      {showExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowExerciseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Exercise</h2>
              <button className="modal-close" onClick={() => setShowExerciseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Level</label>
                <select 
                  value={newExercise.level} 
                  onChange={(e) => {
                    const level = parseInt(e.target.value);
                    const levelData = {
                      1: { name: 'Breathing & Single Words', color: '#e8b04e' },
                      2: { name: 'Short Phrases', color: '#479ac3' },
                      3: { name: 'Complete Sentences', color: '#ce3630' },
                      4: { name: 'Reading Passages', color: '#8e44ad' },
                      5: { name: 'Spontaneous Speech', color: '#27ae60' }
                    };
                    setNewExercise({ 
                      ...newExercise, 
                      level, 
                      level_name: levelData[level].name,
                      level_color: levelData[level].color
                    });
                  }}
                >
                  <option value={1}>Level 1 - Breathing & Single Words</option>
                  <option value={2}>Level 2 - Short Phrases</option>
                  <option value={3}>Level 3 - Complete Sentences</option>
                  <option value={4}>Level 4 - Reading Passages</option>
                  <option value={5}>Level 5 - Spontaneous Speech</option>
                </select>
              </div>
              <div className="form-group">
                <label>Exercise ID (unique identifier)</label>
                <input 
                  type="text" 
                  value={newExercise.exercise_id}
                  onChange={(e) => setNewExercise({ ...newExercise, exercise_id: e.target.value })}
                  placeholder="e.g., breath-6, phrase-10"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input 
                  type="text" 
                  value={newExercise.type}
                  onChange={(e) => setNewExercise({ ...newExercise, type: e.target.value })}
                  placeholder="e.g., controlled-breathing, short-phrase"
                />
              </div>
              <div className="form-group">
                <label>Instruction</label>
                <textarea 
                  value={newExercise.instruction}
                  onChange={(e) => setNewExercise({ ...newExercise, instruction: e.target.value })}
                  placeholder="Instructions for the patient..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Target (word/phrase/sentence)</label>
                <textarea 
                  value={newExercise.target}
                  onChange={(e) => setNewExercise({ ...newExercise, target: e.target.value })}
                  placeholder="The target word, phrase, or sentence"
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Expected Duration (seconds)</label>
                <input 
                  type="number" 
                  value={newExercise.expected_duration}
                  onChange={(e) => setNewExercise({ ...newExercise, expected_duration: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newExercise.breathing}
                    onChange={(e) => setNewExercise({ ...newExercise, breathing: e.target.checked })}
                  />
                  Requires breathing exercise
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newExercise.is_active}
                    onChange={(e) => setNewExercise({ ...newExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowExerciseModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleCreateExercise}>Create Exercise</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <div className="modal-overlay" onClick={() => setEditingExercise(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Exercise</h2>
              <button className="modal-close" onClick={() => setEditingExercise(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Exercise ID</label>
                <input 
                  type="text" 
                  value={editingExercise.id}
                  onChange={(e) => setEditingExercise({ ...editingExercise, id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input 
                  type="text" 
                  value={editingExercise.type}
                  onChange={(e) => setEditingExercise({ ...editingExercise, type: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Instruction</label>
                <textarea 
                  value={editingExercise.instruction}
                  onChange={(e) => setEditingExercise({ ...editingExercise, instruction: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Target</label>
                <textarea 
                  value={editingExercise.target}
                  onChange={(e) => setEditingExercise({ ...editingExercise, target: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Expected Duration (seconds)</label>
                <input 
                  type="number" 
                  value={editingExercise.expectedDuration}
                  onChange={(e) => setEditingExercise({ ...editingExercise, expectedDuration: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editingExercise.breathing}
                    onChange={(e) => setEditingExercise({ ...editingExercise, breathing: e.target.checked })}
                  />
                  Requires breathing exercise
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editingExercise.is_active}
                    onChange={(e) => setEditingExercise({ ...editingExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setEditingExercise(null)}>Cancel</button>
              <button className="primary-btn" onClick={handleUpdateExercise}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Language Exercise Modal */}
      {showLanguageModal && (
        <div className="modal-overlay" onClick={() => setShowLanguageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New {activeSub === 'receptive' ? 'Receptive' : 'Expressive'} Language Exercise</h2>
              <button className="modal-close" onClick={() => setShowLanguageModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Mode</label>
                <input 
                  type="text" 
                  value={activeSub === 'receptive' ? 'Receptive' : 'Expressive'}
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>Level</label>
                <select 
                  value={newLanguageExercise.level} 
                  onChange={(e) => {
                    const level = parseInt(e.target.value);
                    let levelData;
                    if (activeSub === 'receptive') {
                      levelData = {
                        1: { name: 'Vocabulary', color: '#3b82f6', type: 'vocabulary' },
                        2: { name: 'Directions', color: '#3b82f6', type: 'directions' },
                        3: { name: 'Comprehension', color: '#3b82f6', type: 'comprehension' }
                      };
                    } else {
                      levelData = {
                        1: { name: 'Picture Description', color: '#8b5cf6', type: 'description' },
                        2: { name: 'Sentence Formation', color: '#ec4899', type: 'sentence' },
                        3: { name: 'Story Retell', color: '#f59e0b', type: 'retell' }
                      };
                    }
                    setNewLanguageExercise({ 
                      ...newLanguageExercise, 
                      level, 
                      level_name: levelData[level].name,
                      level_color: levelData[level].color,
                      type: levelData[level].type
                    });
                  }}
                >
                  {activeSub === 'receptive' ? (
                    <>
                      <option value={1}>Level 1 - Vocabulary</option>
                      <option value={2}>Level 2 - Directions</option>
                      <option value={3}>Level 3 - Comprehension</option>
                    </>
                  ) : (
                    <>
                      <option value={1}>Level 1 - Picture Description</option>
                      <option value={2}>Level 2 - Sentence Formation</option>
                      <option value={3}>Level 3 - Story Retell</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Exercise ID (unique identifier)</label>
                <input 
                  type="text" 
                  value={newLanguageExercise.exercise_id}
                  onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, exercise_id: e.target.value })}
                  placeholder={activeSub === 'receptive' ? 'e.g., vocab-6, directions-8' : 'e.g., description-6, sentence-8'}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={newLanguageExercise.type}
                  onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, type: e.target.value })}
                >
                  {activeSub === 'receptive' ? (
                    <>
                      <option value="vocabulary">Vocabulary</option>
                      <option value="directions">Directions</option>
                      <option value="comprehension">Comprehension</option>
                    </>
                  ) : (
                    <>
                      <option value="description">Description</option>
                      <option value="sentence">Sentence</option>
                      <option value="retell">Retell</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Instruction</label>
                <textarea 
                  value={newLanguageExercise.instruction}
                  onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, instruction: e.target.value })}
                  placeholder="Instructions for the patient..."
                  rows={3}
                />
              </div>
              
              {/* Receptive-specific fields */}
              {activeSub === 'receptive' && (
                <>
                  <div className="form-group">
                    <label>Target (word/phrase to match)</label>
                    <input 
                      type="text" 
                      value={newLanguageExercise.target}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, target: e.target.value })}
                      placeholder="e.g., apple, ball, turn right"
                    />
                  </div>
                  <div className="form-group">
                    <label>Options (4 choices - mark one as correct)</label>
                    {newLanguageExercise.options.map((option, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span style={{ width: '30px' }}>{idx + 1}.</span>
                        <input 
                          type="text" 
                          placeholder="Text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...newLanguageExercise.options];
                            newOptions[idx].text = e.target.value;
                            setNewLanguageExercise({ ...newLanguageExercise, options: newOptions });
                          }}
                          style={{ flex: '1' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Emoji"
                          value={option.image}
                          onChange={(e) => {
                            const newOptions = [...newLanguageExercise.options];
                            newOptions[idx].image = e.target.value;
                            setNewLanguageExercise({ ...newLanguageExercise, options: newOptions });
                          }}
                          style={{ width: '80px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="correct-option"
                            checked={option.correct}
                            onChange={() => {
                              const newOptions = newLanguageExercise.options.map((opt, i) => ({
                                ...opt,
                                correct: i === idx
                              }));
                              setNewLanguageExercise({ ...newLanguageExercise, options: newOptions });
                            }}
                          />
                          Correct
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label>Order</label>
                    <input 
                      type="number" 
                      value={newLanguageExercise.order}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, order: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </>
              )}
              
              {/* Expressive-specific fields */}
              {activeSub === 'expressive' && (
                <>
                  <div className="form-group">
                    <label>Prompt (emoji or words)</label>
                    <textarea 
                      value={newLanguageExercise.prompt}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, prompt: e.target.value })}
                      placeholder="e.g., 🏠🌳👨‍👩‍👧 or 'Words: boy, ball, playing'"
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expected Keywords (comma-separated)</label>
                    <input 
                      type="text" 
                      value={newLanguageExercise.expected_keywords}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, expected_keywords: e.target.value })}
                      placeholder="house, tree, family"
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Words</label>
                    <input 
                      type="number" 
                      value={newLanguageExercise.min_words}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, min_words: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                  {newLanguageExercise.type === 'retell' && (
                    <div className="form-group">
                      <label>Story (for retell exercises)</label>
                      <textarea 
                        value={newLanguageExercise.story}
                        onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, story: e.target.value })}
                        placeholder="A short story for the patient to retell..."
                        rows={4}
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newLanguageExercise.is_active}
                    onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowLanguageModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleCreateLanguageExercise}>Create Exercise</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Language Exercise Modal */}
      {editingLanguageExercise && (
        <div className="modal-overlay" onClick={() => setEditingLanguageExercise(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {activeSub === 'receptive' ? 'Receptive' : 'Expressive'} Language Exercise</h2>
              <button className="modal-close" onClick={() => setEditingLanguageExercise(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Exercise ID</label>
                <input 
                  type="text" 
                  value={editingLanguageExercise.exercise_id}
                  onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, exercise_id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={editingLanguageExercise.type}
                  onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, type: e.target.value })}
                >
                  {activeSub === 'receptive' ? (
                    <>
                      <option value="vocabulary">Vocabulary</option>
                      <option value="directions">Directions</option>
                      <option value="comprehension">Comprehension</option>
                    </>
                  ) : (
                    <>
                      <option value="description">Description</option>
                      <option value="sentence">Sentence</option>
                      <option value="retell">Retell</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Instruction</label>
                <textarea 
                  value={editingLanguageExercise.instruction}
                  onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, instruction: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Receptive-specific fields */}
              {activeSub === 'receptive' && (
                <>
                  <div className="form-group">
                    <label>Target (word/phrase to match)</label>
                    <input 
                      type="text" 
                      value={editingLanguageExercise.target || ''}
                      onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, target: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Options (4 choices - mark one as correct)</label>
                    {(editingLanguageExercise.options || []).map((option, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span style={{ width: '30px' }}>{idx + 1}.</span>
                        <input 
                          type="text" 
                          placeholder="Text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...editingLanguageExercise.options];
                            newOptions[idx].text = e.target.value;
                            setEditingLanguageExercise({ ...editingLanguageExercise, options: newOptions });
                          }}
                          style={{ flex: '1' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Emoji"
                          value={option.image}
                          onChange={(e) => {
                            const newOptions = [...editingLanguageExercise.options];
                            newOptions[idx].image = e.target.value;
                            setEditingLanguageExercise({ ...editingLanguageExercise, options: newOptions });
                          }}
                          style={{ width: '80px' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="edit-correct-option"
                            checked={option.correct}
                            onChange={() => {
                              const newOptions = editingLanguageExercise.options.map((opt, i) => ({
                                ...opt,
                                correct: i === idx
                              }));
                              setEditingLanguageExercise({ ...editingLanguageExercise, options: newOptions });
                            }}
                          />
                          Correct
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label>Order</label>
                    <input 
                      type="number" 
                      value={editingLanguageExercise.order || 1}
                      onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, order: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </>
              )}
              
              {/* Expressive-specific fields */}
              {activeSub === 'expressive' && (
                <>
                  <div className="form-group">
                    <label>Prompt</label>
                    <textarea 
                      value={editingLanguageExercise.prompt}
                      onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, prompt: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expected Keywords (comma-separated)</label>
                    <input 
                      type="text" 
                      value={Array.isArray(editingLanguageExercise.expectedKeywords) 
                        ? editingLanguageExercise.expectedKeywords.join(', ') 
                        : editingLanguageExercise.expectedKeywords || ''}
                      onChange={(e) => setEditingLanguageExercise({ 
                        ...editingLanguageExercise, 
                        expectedKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Words</label>
                    <input 
                      type="number" 
                      value={editingLanguageExercise.minWords}
                      onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, minWords: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                  {editingLanguageExercise.type === 'retell' && (
                    <div className="form-group">
                      <label>Story</label>
                      <textarea 
                        value={editingLanguageExercise.story || ''}
                        onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, story: e.target.value })}
                        rows={4}
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editingLanguageExercise.is_active}
                    onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setEditingLanguageExercise(null)}>Cancel</button>
              <button className="primary-btn" onClick={handleUpdateLanguageExercise}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TherapistDashboard;
