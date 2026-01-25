import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { therapistService, authService, fluencyExerciseService, languageExerciseService, receptiveExerciseService, articulationExerciseService } from '../services/api';
import { images } from '../assets/images';
import './TherapistDashboard.css';

function TherapistDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [speechDropdownOpen, setSpeechDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSub, setActiveSub] = useState('receptive');
  const [therapyData, setTherapyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFluencyLevels, setShowFluencyLevels] = useState(false);
  const [fluencyExercises, setFluencyExercises] = useState({});
  const [editingExercise, setEditingExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableFluencyOrders, setAvailableFluencyOrders] = useState([1]);
  const [newExercise, setNewExercise] = useState({
    level: 1,
    level_name: 'Breathing & Single Words',
    level_color: '#e8b04e',
    type: 'controlled-breathing',
    instruction: '',
    target: '',
    expected_duration: 3,
    order: 1,
    breathing: true,
    is_active: false
  });

  // Language exercise states
  const [showLanguageLevels, setShowLanguageLevels] = useState(false);
  const [languageExercises, setLanguageExercises] = useState({});
  const [editingLanguageExercise, setEditingLanguageExercise] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [availableLanguageOrders, setAvailableLanguageOrders] = useState([1]);
  
  // Initialize new language exercise based on mode
  const getDefaultLanguageExercise = (mode) => {
    if (mode === 'receptive') {
      return {
        mode: 'receptive',
        level: 1,
        level_name: 'Vocabulary',
        level_color: '#3b82f6',
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

  // Articulation exercise states
  const [showArticulationLevels, setShowArticulationLevels] = useState(false);
  const [articulationExercises, setArticulationExercises] = useState({});
  const [editingArticulationExercise, setEditingArticulationExercise] = useState(null);
  const [showArticulationModal, setShowArticulationModal] = useState(false);
  const [activeArticulationSound, setActiveArticulationSound] = useState('s');
  const [soundDropdownOpen, setSoundDropdownOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState([1]);
  const [newArticulationExercise, setNewArticulationExercise] = useState({
    sound_id: 's',
    sound_name: 'S Sound',
    level: 1,
    level_name: 'Sound',
    target: '',
    order: 1,
    is_active: true
  });

  // Overview stats state
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Physical therapy gait analyses state
  const [gaitAnalyses, setGaitAnalyses] = useState([]);
  const [loadingPhysical, setLoadingPhysical] = useState(false);
  const [expandedGaitRows, setExpandedGaitRows] = useState({});
  const [currentGaitPage, setCurrentGaitPage] = useState(1);
  const [gaitEntriesPerPage, setGaitEntriesPerPage] = useState(5);

  // Load overview statistics
  const loadOverviewStats = async () => {
    setLoadingStats(true);
    try {
      const response = await therapistService.getStats();
      console.log('Therapist stats response:', response);
      setOverviewStats(response.stats || response);
    } catch (error) {
      console.error('Failed to load therapist stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load stats when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview' && user) {
      loadOverviewStats();
    }
  }, [activeTab, user]);

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
          type: 'controlled-breathing',
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
      // Only send editable fields
      const updateData = {
        type: editingExercise.type,
        instruction: editingExercise.instruction,
        target: editingExercise.target,
        expected_duration: editingExercise.expectedDuration,
        breathing: editingExercise.breathing,
        is_active: editingExercise.is_active
      };
      const response = await fluencyExerciseService.update(editingExercise._id, updateData);
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
      
      // For receptive, only send allowed fields (target, options, is_active)
      let updateData;
      if (activeSub === 'receptive') {
        updateData = {
          target: editingLanguageExercise.target,
          options: editingLanguageExercise.options,
          is_active: editingLanguageExercise.is_active
        };
      } else {
        // For expressive, send all data
        updateData = editingLanguageExercise;
      }
      
      const response = await service.update(editingLanguageExercise._id, updateData);
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

  // Articulation Exercise CRUD Functions
  const loadArticulationExercises = async () => {
    try {
      const response = await articulationExerciseService.getAll();
      if (response.success) {
        setArticulationExercises(response.exercises_by_sound || {});
      }
    } catch (error) {
      console.error('Failed to load articulation exercises:', error);
    }
  };

  const loadAvailableOrders = async (soundId, level) => {
    try {
      const response = await articulationExerciseService.getAvailableOrders(soundId, level);
      if (response.success) {
        setAvailableOrders(response.available_orders.length > 0 ? response.available_orders : [1]);
        // Set the first available order as default
        setNewArticulationExercise(prev => ({
          ...prev,
          order: response.available_orders[0] || 1
        }));
      }
    } catch (error) {
      console.error('Failed to load available orders:', error);
      setAvailableOrders([1]);
    }
  };

  const loadAvailableFluencyOrders = async (level) => {
    try {
      const response = await fluencyExerciseService.getAvailableOrders(level);
      if (response.success) {
        setAvailableFluencyOrders(response.available_orders.length > 0 ? response.available_orders : [1]);
        // Set the first available order as default
        setNewExercise(prev => ({
          ...prev,
          order: response.available_orders[0] || 1
        }));
      }
    } catch (error) {
      console.error('Failed to load available fluency orders:', error);
      setAvailableFluencyOrders([1]);
    }
  };

  const loadAvailableLanguageOrders = async (level) => {
    try {
      if (activeSub === 'receptive') {
        const response = await receptiveExerciseService.getAvailableOrders(level);
        if (response.success) {
          setAvailableLanguageOrders(response.available_orders.length > 0 ? response.available_orders : [1]);
          // Set the first available order as default
          setNewLanguageExercise(prev => ({
            ...prev,
            order: response.available_orders[0] || 1
          }));
        }
      } else {
        // For expressive, you might want to add similar logic if backend supports it
        setAvailableLanguageOrders([1]);
      }
    } catch (error) {
      console.error('Failed to load available language orders:', error);
      setAvailableLanguageOrders([1]);
    }
  };

  const handleSeedArticulationExercises = async () => {
    if (!window.confirm('This will seed the database with default articulation exercises for all sounds. Continue?')) return;
    try {
      const response = await articulationExerciseService.seedDefault();
      if (response.success) {
        alert(`Successfully seeded ${response.count} articulation exercises!`);
        loadArticulationExercises();
      }
    } catch (error) {
      alert('Failed to seed exercises: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateArticulationExercise = async () => {
    try {
      const response = await articulationExerciseService.create(newArticulationExercise);
      if (response.success) {
        setShowArticulationModal(false);
        setNewArticulationExercise({
          sound_id: activeArticulationSound,
          sound_name: getSoundName(activeArticulationSound),
          level: 1,
          level_name: 'Sound',
          target: '',
          order: 1,
          is_active: true
        });
        loadArticulationExercises();
        alert('Exercise created successfully!');
      }
    } catch (error) {
      alert('Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateArticulationExercise = async () => {
    try {
      // Only send target and is_active for update
      const updateData = {
        target: editingArticulationExercise.target,
        is_active: editingArticulationExercise.is_active
      };
      const response = await articulationExerciseService.update(editingArticulationExercise._id, updateData);
      if (response.success) {
        setEditingArticulationExercise(null);
        loadArticulationExercises();
        alert('Exercise updated successfully!');
      }
    } catch (error) {
      alert('Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteArticulationExercise = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) return;
    try {
      const response = await articulationExerciseService.delete(id);
      if (response.success) {
        loadArticulationExercises();
        alert('Exercise deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleArticulationActive = async (id) => {
    try {
      const response = await articulationExerciseService.toggleActive(id);
      if (response.success) {
        loadArticulationExercises();
      }
    } catch (error) {
      alert('Failed to toggle exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const getSoundName = (soundId) => {
    const soundNames = {
      's': 'S Sound',
      'r': 'R Sound',
      'l': 'L Sound',
      'k': 'K Sound',
      'th': 'TH Sound'
    };
    return soundNames[soundId] || soundId;
  };

  const getLevelName = (level) => {
    const levelNames = {
      1: 'Sound',
      2: 'Syllable',
      3: 'Word',
      4: 'Phrase',
      5: 'Sentence'
    };
    return levelNames[level] || `Level ${level}`;
  };

  useEffect(() => {
    const stored = authService.getStoredUser();
    setUser(stored);
  }, []);

  useEffect(() => {
    // Load available orders when creating new exercise and sound/level changes
    if (showArticulationModal) {
      loadAvailableOrders(newArticulationExercise.sound_id, newArticulationExercise.level);
    }
  }, [showArticulationModal, newArticulationExercise.sound_id, newArticulationExercise.level]);

  useEffect(() => {
    // Load available orders when creating new fluency exercise and level changes
    if (showExerciseModal) {
      loadAvailableFluencyOrders(newExercise.level);
    }
  }, [showExerciseModal, newExercise.level]);

  useEffect(() => {
    // Load available orders when creating new language exercise and level changes
    if (showLanguageModal && activeSub === 'receptive') {
      loadAvailableLanguageOrders(newLanguageExercise.level);
    }
  }, [showLanguageModal, newLanguageExercise.level, activeSub]);

  useEffect(() => {
    // Load default overview stats via admin stats
    if (activeTab !== 'overview') return;
    loadOverview();
  }, [activeTab]);

  useEffect(() => {
    // Load therapy data when switching tabs
    if (activeTab === 'articulation') {
      loadArticulation(); // Load patient session data
      loadArticulationExercises(); // Always load exercises for articulation
    }
    if (activeTab === 'language') {
      loadLanguage(activeSub); // Load patient session data
      loadLanguageExercises(); // Always load exercises for language
    }
    if (activeTab === 'fluency') {
      loadFluency(); // Load patient session data
      loadFluencyExercises(); // Always load exercises for fluency
    }
    if (activeTab === 'physical') loadPhysical();
  }, [activeTab, activeSub, showFluencyLevels, showLanguageLevels, showArticulationLevels]);

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
    setLoadingPhysical(true);
    try {
      const response = await therapistService.getPhysicalPatients();
      if (response.success) {
        setGaitAnalyses(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load gait analyses', e);
      setGaitAnalyses([]);
    } finally {
      setLoadingPhysical(false);
    }
  };

  const toggleGaitDetails = (id) => {
    setExpandedGaitRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <div 
            className="sidebar-logo" 
            onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
            style={sidebarCollapsed ? { cursor: 'pointer' } : {}}
          >
            <img src={images.logo} alt="CVAPed Logo" className="logo-img" />
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>CVAPed</h2>
                <span className="admin-badge">Therapist</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              ←
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setTherapyData([]); }}>
            <span className="nav-icon">📊</span>
            {!sidebarCollapsed && <span className="nav-label">Overview</span>}
          </button>

          <div className="dropdown-container">
            <button 
              className={`nav-item ${activeTab === 'articulation' || activeTab === 'language' || activeTab === 'fluency' ? 'active' : ''}`} 
              onClick={() => setSpeechDropdownOpen(!speechDropdownOpen)}
            >
              <span className="nav-icon">🎤</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-label">Speech Therapy</span>
                  <span className={`dropdown-arrow ${speechDropdownOpen ? 'open' : ''}`}>▼</span>
                </>
              )}
            </button>
            {!sidebarCollapsed && speechDropdownOpen && (
              <div className="dropdown-menu">
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
            <div className="overview-section">
              {loadingStats ? (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading statistics...</p>
                </div>
              ) : overviewStats ? (
                <>
                  {/* Stats Cards */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <span className="stat-icon-emoji">👥</span>
                      </div>
                      <div className="stat-details">
                        <h3 className="stat-value">{overviewStats.total_patients || 0}</h3>
                        <p className="stat-label">Total Patients</p>
                        <span className="stat-badge">Registered</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <span className="stat-icon-emoji">�</span>
                      </div>
                      <div className="stat-details">
                        <h3 className="stat-value">{overviewStats.total_sessions || 0}</h3>
                        <p className="stat-label">Total Sessions</p>
                        <span className="stat-badge">Therapy</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <span className="stat-icon-emoji">✅</span>
                      </div>
                      <div className="stat-details">
                        <h3 className="stat-value">{overviewStats.active_patients || 0}</h3>
                        <p className="stat-label">Active Patients</p>
                        <span className="stat-badge">Last 30 Days</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                        <span className="stat-icon-emoji">🎯</span>
                      </div>
                      <div className="stat-details">
                        <h3 className="stat-value">{overviewStats.total_exercises || 0}</h3>
                        <p className="stat-label">Total Exercises</p>
                        <span className="stat-badge">Available</span>
                      </div>
                    </div>
                  </div>

                  {/* Therapy Sessions Distribution - Donut Chart */}
                  <div className="therapy-distribution-section">
                    <div className="chart-card full-width">
                      <div className="chart-header">
                        <h3 className="chart-title">
                          <span className="chart-icon">�</span>
                          Therapy Sessions Distribution
                        </h3>
                      </div>
                      <div className="donut-chart-container">
                        {/* Donut Chart */}
                        <div className="donut-chart-wrapper">
                          <svg className="donut-chart" viewBox="0 0 200 200">
                            <defs>
                              <linearGradient id="articulation-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
                              </linearGradient>
                              <linearGradient id="language-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
                              </linearGradient>
                              <linearGradient id="fluency-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                              </linearGradient>
                              <filter id="shadow">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15"/>
                              </filter>
                              <filter id="shadow-hover">
                                <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.3"/>
                              </filter>
                            </defs>
                            {(() => {
                              const total = overviewStats.total_sessions || 1;
                              const articulationCount = overviewStats.articulation_sessions || 0;
                              const languageCount = overviewStats.language_sessions || 0;
                              const fluencyCount = overviewStats.fluency_sessions || 0;
                              
                              // Build dynamic therapy data array based on what exists
                              const therapyData = [];
                              
                              if (articulationCount > 0) {
                                therapyData.push({
                                  name: 'Articulation',
                                  count: articulationCount,
                                  percentage: (articulationCount / total) * 100,
                                  color: 'url(#articulation-gradient)',
                                  hoverColor: 'rgba(245, 158, 11, 0.4)',
                                  icon: '🗣️',
                                  description: 'Sound pronunciation therapy',
                                  className: 'articulation-slice'
                                });
                              }
                              
                              if (languageCount > 0) {
                                therapyData.push({
                                  name: 'Language',
                                  count: languageCount,
                                  percentage: (languageCount / total) * 100,
                                  color: 'url(#language-gradient)',
                                  hoverColor: 'rgba(139, 92, 246, 0.4)',
                                  icon: '💬',
                                  description: 'Receptive & expressive skills',
                                  className: 'language-slice'
                                });
                              }
                              
                              if (fluencyCount > 0) {
                                therapyData.push({
                                  name: 'Fluency',
                                  count: fluencyCount,
                                  percentage: (fluencyCount / total) * 100,
                                  color: 'url(#fluency-gradient)',
                                  hoverColor: 'rgba(16, 185, 129, 0.4)',
                                  icon: '⚡',
                                  description: 'Speech flow & rhythm training',
                                  className: 'fluency-slice'
                                });
                              }
                              
                              // Helper function to create pie slice path
                              const createPieSlice = (startAngle, endAngle, radius = 85) => {
                                const start = (startAngle - 90) * Math.PI / 180;
                                const end = (endAngle - 90) * Math.PI / 180;
                                
                                const x1 = 100 + radius * Math.cos(start);
                                const y1 = 100 + radius * Math.sin(start);
                                const x2 = 100 + radius * Math.cos(end);
                                const y2 = 100 + radius * Math.sin(end);
                                
                                const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                                
                                return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                              };
                              
                              let currentAngle = 0;
                              
                              return (
                                <g className="pie-chart-group">
                                  {therapyData.length === 0 ? (
                                    // No data - show empty state
                                    <>
                                      <circle cx="100" cy="100" r="85" fill="#f1f5f9" opacity="0.5" />
                                      <circle cx="100" cy="100" r="45" fill="white" filter="url(#shadow)" />
                                      <text x="100" y="100" textAnchor="middle" fontSize="14" fontWeight="600" fill="#94a3b8">
                                        No Data
                                      </text>
                                    </>
                                  ) : (
                                    <>
                                      {/* Dynamic pie slices based on available data */}
                                      {therapyData.map((therapy, index) => {
                                        const angle = (therapy.percentage / 100) * 360;
                                        const sliceStartAngle = currentAngle;
                                        const sliceEndAngle = currentAngle + angle;
                                        currentAngle += angle;
                                        
                                        return (
                                          <path
                                            key={therapy.name}
                                            className={`pie-slice ${therapy.className}`}
                                            d={createPieSlice(sliceStartAngle, sliceEndAngle)}
                                            fill={therapy.color}
                                            filter="url(#shadow)"
                                            style={{ 
                                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                              cursor: 'pointer',
                                              transformOrigin: '100px 100px'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.setAttribute('filter', 'url(#shadow-hover)');
                                              e.currentTarget.style.transform = 'scale(1.05)';
                                              e.currentTarget.style.opacity = '0.95';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.setAttribute('filter', 'url(#shadow)');
                                              e.currentTarget.style.transform = 'scale(1)';
                                              e.currentTarget.style.opacity = '1';
                                            }}
                                            onClick={() => {
                                              console.log(`${therapy.name} sessions:`, therapy.count);
                                            }}
                                          >
                                            <title>{therapy.icon} {therapy.name}: {therapy.count} sessions ({therapy.percentage.toFixed(1)}%)</title>
                                          </path>
                                        );
                                      })}
                                      
                                      {/* Separator lines between slices */}
                                      {therapyData.map((therapy, index) => {
                                        if (index === 0) {
                                          // First separator at top
                                          return <line key={`sep-0`} x1="100" y1="100" x2="100" y2="15" stroke="white" strokeWidth="2" opacity="0.8" />;
                                        }
                                        
                                        // Calculate cumulative angle for each separator
                                        let cumulativeAngle = 0;
                                        for (let i = 0; i < index; i++) {
                                          cumulativeAngle += (therapyData[i].percentage / 100) * 360;
                                        }
                                        
                                        const angle = (cumulativeAngle - 90) * Math.PI / 180;
                                        return (
                                          <line 
                                            key={`sep-${index}`}
                                            x1="100" 
                                            y1="100" 
                                            x2={100 + 85 * Math.cos(angle)} 
                                            y2={100 + 85 * Math.sin(angle)} 
                                            stroke="white" 
                                            strokeWidth="2" 
                                            opacity="0.8" 
                                          />
                                        );
                                      })}
                                      
                                      {/* Center circle with stats */}
                                      <circle cx="100" cy="100" r="45" fill="white" filter="url(#shadow)" />
                                      
                                      {/* Center content */}
                                      <text x="100" y="90" textAnchor="middle" fontSize="32" fontWeight="800" fill="#1a202c">
                                        {total}
                                      </text>
                                      <text x="100" y="108" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b" letterSpacing="0.5">
                                        TOTAL
                                      </text>
                                      <text x="100" y="122" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b" letterSpacing="0.5">
                                        SESSIONS
                                      </text>
                                    </>
                                  )}
                                </g>
                              );
                            })()}
                          </svg>
                          
                          {/* Stats Summary Below Chart */}
                          <div className="donut-stats-summary">
                            <div className="donut-stat-item">
                              <div className="donut-stat-value">{overviewStats.total_sessions || 0}</div>
                              <div className="donut-stat-label">Total</div>
                            </div>
                            <div className="donut-stat-divider"></div>
                            <div className="donut-stat-item">
                              <div className="donut-stat-value">
                                {overviewStats.total_sessions > 0 
                                  ? Math.round((overviewStats.articulation_sessions || 0) + (overviewStats.language_sessions || 0) + (overviewStats.fluency_sessions || 0))
                                  : 0}
                              </div>
                              <div className="donut-stat-label">Active</div>
                            </div>
                            <div className="donut-stat-divider"></div>
                            <div className="donut-stat-item">
                              <div className="donut-stat-value">
                                {[
                                  overviewStats.articulation_sessions || 0,
                                  overviewStats.language_sessions || 0,
                                  overviewStats.fluency_sessions || 0
                                ].filter(count => count > 0).length}
                              </div>
                              <div className="donut-stat-label">Types</div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Legend - Dynamic based on data */}
                        <div className="donut-legend">
                          <div className="legend-header">
                            <h4 className="legend-title">Session Breakdown</h4>
                            <span className="legend-total">{overviewStats.total_sessions || 0} Total</span>
                          </div>
                          
                          <div className="legend-items">
                            {/* Articulation - only show if has data */}
                            {(overviewStats.articulation_sessions || 0) > 0 && (
                              <div 
                                className="legend-item"
                                onMouseEnter={() => {
                                  const segment = document.querySelector('.articulation-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow-hover)');
                                    segment.style.transform = 'scale(1.05)';
                                  }
                                }}
                                onMouseLeave={() => {
                                  const segment = document.querySelector('.articulation-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow)');
                                    segment.style.transform = 'scale(1)';
                                  }
                                }}
                              >
                                <div className="legend-left">
                                  <div className="legend-color-box" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                                    <span className="legend-box-icon">🗣️</span>
                                  </div>
                                  <div className="legend-info">
                                    <span className="legend-label">Articulation</span>
                                    <span className="legend-description">Sound pronunciation therapy</span>
                                  </div>
                                </div>
                                <div className="legend-right">
                                  <span className="legend-count">{overviewStats.articulation_sessions || 0}</span>
                                  <div className="legend-percentage-bar">
                                    <div 
                                      className="legend-percentage-fill articulation-fill"
                                      style={{
                                        width: `${overviewStats.total_sessions > 0 
                                          ? ((overviewStats.articulation_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                          : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="legend-percentage">
                                    {overviewStats.total_sessions > 0 
                                      ? ((overviewStats.articulation_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                      : 0}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Language - only show if has data */}
                            {(overviewStats.language_sessions || 0) > 0 && (
                              <div 
                                className="legend-item"
                                onMouseEnter={() => {
                                  const segment = document.querySelector('.language-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow-hover)');
                                    segment.style.transform = 'scale(1.05)';
                                  }
                                }}
                                onMouseLeave={() => {
                                  const segment = document.querySelector('.language-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow)');
                                    segment.style.transform = 'scale(1)';
                                  }
                                }}
                              >
                                <div className="legend-left">
                                  <div className="legend-color-box" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                                    <span className="legend-box-icon">💬</span>
                                  </div>
                                  <div className="legend-info">
                                    <span className="legend-label">Language</span>
                                    <span className="legend-description">Receptive & expressive skills</span>
                                  </div>
                                </div>
                                <div className="legend-right">
                                  <span className="legend-count">{overviewStats.language_sessions || 0}</span>
                                  <div className="legend-percentage-bar">
                                    <div 
                                      className="legend-percentage-fill language-fill"
                                      style={{
                                        width: `${overviewStats.total_sessions > 0 
                                          ? ((overviewStats.language_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                          : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="legend-percentage">
                                    {overviewStats.total_sessions > 0 
                                      ? ((overviewStats.language_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                      : 0}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Fluency - only show if has data */}
                            {(overviewStats.fluency_sessions || 0) > 0 && (
                              <div 
                                className="legend-item"
                                onMouseEnter={() => {
                                  const segment = document.querySelector('.fluency-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow-hover)');
                                    segment.style.transform = 'scale(1.05)';
                                  }
                                }}
                                onMouseLeave={() => {
                                  const segment = document.querySelector('.fluency-slice');
                                  if (segment) {
                                    segment.setAttribute('filter', 'url(#shadow)');
                                    segment.style.transform = 'scale(1)';
                                  }
                                }}
                              >
                                <div className="legend-left">
                                  <div className="legend-color-box" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                    <span className="legend-box-icon">⚡</span>
                                  </div>
                                  <div className="legend-info">
                                    <span className="legend-label">Fluency</span>
                                    <span className="legend-description">Speech flow & rhythm training</span>
                                  </div>
                                </div>
                                <div className="legend-right">
                                  <span className="legend-count">{overviewStats.fluency_sessions || 0}</span>
                                  <div className="legend-percentage-bar">
                                    <div 
                                      className="legend-percentage-fill fluency-fill"
                                      style={{
                                        width: `${overviewStats.total_sessions > 0 
                                          ? ((overviewStats.fluency_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                          : 0}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="legend-percentage">
                                    {overviewStats.total_sessions > 0 
                                      ? ((overviewStats.fluency_sessions || 0) / overviewStats.total_sessions * 100).toFixed(1)
                                      : 0}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-data-message">
                  <span className="no-data-icon">📊</span>
                  <h3>No Statistics Available</h3>
                  <p>Unable to load dashboard statistics. Please try again later.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'articulation' && (
            <div className="articulation-section">
              <div className="controls-section">
                  <div className="control-group">
                    <button className="btn-primary" onClick={handleSeedArticulationExercises}>
                      🌱 Seed Default Exercises
                    </button>
                    <button className="btn-primary" onClick={() => setShowArticulationModal(true)}>
                      ➕ New Exercise
                    </button>
                  </div>
                </div>

                <div className="sound-selector">
                  <div className="sound-selector-title">Select Sound</div>
                  <div className="sound-dropdown-wrapper">
                    <button 
                      className="sound-dropdown-button"
                      onClick={() => setSoundDropdownOpen(!soundDropdownOpen)}
                    >
                      <span className="selected-sound">/{activeArticulationSound.toUpperCase()}/</span>
                      <span className={`dropdown-arrow ${soundDropdownOpen ? 'open' : ''}`}>▼</span>
                    </button>
                    {soundDropdownOpen && (
                      <div className="sound-dropdown-menu">
                        {Object.keys(articulationExercises).map(sound => (
                          <button
                            key={sound}
                            className={`sound-dropdown-item ${activeArticulationSound === sound ? 'active' : ''}`}
                            onClick={() => {
                              setActiveArticulationSound(sound);
                              setSoundDropdownOpen(false);
                            }}
                          >
                            /{sound.toUpperCase()}/
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {Object.keys(articulationExercises).length === 0 ? (
                  <div className="no-exercises">
                    <div className="no-exercises-icon">🎤</div>
                    <p className="no-exercises-text">No exercises found</p>
                    <p className="no-exercises-hint">Click "Seed Default Exercises" to get started</p>
                  </div>
                ) : (
                  articulationExercises[activeArticulationSound] && 
                  Object.entries(articulationExercises[activeArticulationSound].levels || {}).map(([level, data]) => (
                    <div key={level} className="exercise-table">
                      <table>
                        <thead>
                          <tr>
                            <th colSpan="6">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Level {level}: {data.level_name}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>
                                  {data.exercises.length} exercise{data.exercises.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </th>
                          </tr>
                          <tr>
                            <th>#</th>
                            <th>Exercise ID</th>
                            <th>Target</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.exercises.map((exercise, idx) => (
                            <tr key={exercise._id}>
                              <td>{idx + 1}</td>
                              <td>
                                <span className={`table-badge level-${level}`}>{exercise.exercise_id}</span>
                              </td>
                              <td><strong>{exercise.target}</strong></td>
                              <td>{exercise.order}</td>
                              <td>
                                <span className={`status-badge ${exercise.is_active ? 'active' : 'inactive'}`}>
                                  {exercise.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <div className="exercise-actions">
                                  <button 
                                    className="btn-edit" 
                                    onClick={() => setEditingArticulationExercise(exercise)}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="btn-delete" 
                                    onClick={() => handleDeleteArticulationExercise(exercise._id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
            </div>
          )}

          {activeTab === 'physical' && (
            <div className="physical-section">
              {loadingPhysical ? (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading gait analyses...</p>
                </div>
              ) : gaitAnalyses.length === 0 ? (
                <div className="no-exercises">
                  <div className="no-exercises-icon">🚶</div>
                  <p className="no-exercises-text">No gait analyses found</p>
                  <p className="no-exercises-hint">Gait analyses will appear here after patients perform them</p>
                </div>
              ) : (
                <div className="gait-analyses-container">
                  <div className="controls-section">
                    <div className="control-group">
                      <div className="search-container">
                        <input
                          type="text"
                          placeholder="Search by patient name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                      <div className="pagination-controls">
                        <label className="entries-label">
                          Show:
                          <select 
                            value={gaitEntriesPerPage} 
                            onChange={(e) => {
                              setGaitEntriesPerPage(Number(e.target.value));
                              setCurrentGaitPage(1);
                            }}
                            className="entries-select"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                          </select>
                          entries
                        </label>
                      </div>
                      <div className="stats-summary">
                        <span className="stat-item">
                          <strong>{gaitAnalyses.length}</strong> Total Analyses
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table className="logs-table gait-table">
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Email</th>
                          <th>Problems</th>
                          <th>Score</th>
                          <th>Severity</th>
                          <th>Date & Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredAnalyses = gaitAnalyses.filter(analysis => 
                            !searchTerm || 
                            analysis.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            analysis.user_email.toLowerCase().includes(searchTerm.toLowerCase())
                          );
                          const indexOfLastEntry = currentGaitPage * gaitEntriesPerPage;
                          const indexOfFirstEntry = indexOfLastEntry - gaitEntriesPerPage;
                          const currentEntries = filteredAnalyses.slice(indexOfFirstEntry, indexOfLastEntry);
                          return currentEntries.map(analysis => (
                            <React.Fragment key={analysis.id}>
                              <tr className="gait-row">
                                <td>
                                  <div className="patient-cell">
                                    <div className="patient-avatar-small">
                                      {analysis.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <span className="patient-name-text">{analysis.user_name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="email-text">{analysis.user_email}</span>
                                </td>
                                <td>
                                  <div className="problems-cell">
                                    <span className="problems-count">{analysis.problems_count} issues</span>
                                    {analysis.problems.length > 0 && (
                                      <div className="problems-preview">
                                        {analysis.problems.slice(0, 2).map((problem, idx) => (
                                          <span key={idx} className="problem-badge">{problem.replace(/_/g, ' ')}</span>
                                        ))}
                                        {analysis.problems.length > 2 && (
                                          <span className="problem-more">+{analysis.problems.length - 2}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="score-cell" style={{ color: getScoreColor(analysis.overall_score) }}>
                                    <span className="score-number">{analysis.overall_score}%</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`severity-badge severity-${analysis.severity}`}>
                                    {analysis.severity}
                                  </span>
                                </td>
                                <td>
                                  <div className="date-cell-container">
                                    <span className="date-cell">{formatDate(analysis.created_at)}</span>
                                    {analysis.gait_metrics && (
                                      <button 
                                        className={`gait-dropdown-btn ${expandedGaitRows[analysis.id] ? 'expanded' : ''}`}
                                        onClick={() => toggleGaitDetails(analysis.id)}
                                        title={expandedGaitRows[analysis.id] ? 'Hide details' : 'Show details'}
                                      >
                                        ▼
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Expandable Gait Details Row */}
                              {expandedGaitRows[analysis.id] && (
                                <tr className="gait-details-row">
                                  <td colSpan="6">
                                    <div className="gait-details-container">
                                      <div className="gait-metrics-grid">
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">👣</span>
                                          <div>
                                            <div className="metric-label">Steps</div>
                                            <div className="metric-value">{analysis.gait_metrics.step_count}</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">⚡</span>
                                          <div>
                                            <div className="metric-label">Cadence</div>
                                            <div className="metric-value">{analysis.gait_metrics.cadence?.toFixed(1)} steps/min</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">📏</span>
                                          <div>
                                            <div className="metric-label">Stride Length</div>
                                            <div className="metric-value">{analysis.gait_metrics.stride_length?.toFixed(2)} m</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">🏃</span>
                                          <div>
                                            <div className="metric-label">Velocity</div>
                                            <div className="metric-value">{analysis.gait_metrics.velocity?.toFixed(2)} m/s</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">⚖️</span>
                                          <div>
                                            <div className="metric-label">Symmetry</div>
                                            <div className="metric-value">{analysis.gait_metrics.gait_symmetry?.toFixed(1)}%</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">🎯</span>
                                          <div>
                                            <div className="metric-label">Stability</div>
                                            <div className="metric-value">{analysis.gait_metrics.stability_score?.toFixed(1)}%</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">📊</span>
                                          <div>
                                            <div className="metric-label">Step Regularity</div>
                                            <div className="metric-value">{analysis.gait_metrics.step_regularity?.toFixed(1)}%</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">⏱️</span>
                                          <div>
                                            <div className="metric-label">Duration</div>
                                            <div className="metric-value">{analysis.analysis_duration?.toFixed(0)}s</div>
                                          </div>
                                        </div>
                                        <div className="gait-metric-item">
                                          <span className="metric-icon">✨</span>
                                          <div>
                                            <div className="metric-label">Data Quality</div>
                                            <div className="metric-value">{analysis.data_quality}</div>
                                          </div>
                                        </div>
                                      </div>
                                      {analysis.problems.length > 0 && (
                                        <div className="problems-detail-section">
                                          <h4 className="problems-title">Detected Issues:</h4>
                                          <div className="problems-list">
                                            {analysis.problems.map((problem, idx) => (
                                              <span key={idx} className="problem-chip">{problem.replace(/_/g, ' ')}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Footer */}
                  {(() => {
                    const filteredAnalyses = gaitAnalyses.filter(analysis => 
                      !searchTerm || 
                      analysis.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      analysis.user_email.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    const totalPages = Math.ceil(filteredAnalyses.length / gaitEntriesPerPage);
                    if (totalPages <= 1) return null;
                    
                    const indexOfLastEntry = currentGaitPage * gaitEntriesPerPage;
                    const indexOfFirstEntry = indexOfLastEntry - gaitEntriesPerPage + 1;
                    const actualLastEntry = Math.min(indexOfLastEntry, filteredAnalyses.length);
                    
                    return (
                      <div className="pagination-footer">
                        <div className="pagination-info">
                          Showing {indexOfFirstEntry} to {actualLastEntry} of {filteredAnalyses.length} entries
                        </div>
                        <div className="pagination-buttons">
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentGaitPage(1)}
                            disabled={currentGaitPage === 1}
                          >
                            «
                          </button>
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentGaitPage(prev => Math.max(1, prev - 1))}
                            disabled={currentGaitPage === 1}
                          >
                            ‹
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentGaitPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentGaitPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentGaitPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                className={`pagination-btn ${currentGaitPage === pageNum ? 'active' : ''}`}
                                onClick={() => setCurrentGaitPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentGaitPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentGaitPage === totalPages}
                          >
                            ›
                          </button>
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentGaitPage(totalPages)}
                            disabled={currentGaitPage === totalPages}
                          >
                            »
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'language' && (
            <div className="language-section">
              <div className="controls-section">
                <div className="control-group">
                  <button className="btn-primary" onClick={handleSeedLanguageExercises}>
                    🌱 Seed Default Exercises
                  </button>
                  <button className="btn-primary" onClick={() => {
                    setNewLanguageExercise(getDefaultLanguageExercise(activeSub));
                    setShowLanguageModal(true);
                  }}>
                    ➕ New Exercise
                  </button>
                </div>
              </div>

              {Object.keys(languageExercises).length === 0 ? (
                <div className="no-exercises">
                  <div className="no-exercises-icon">💬</div>
                  <p className="no-exercises-text">No exercises found</p>
                  <p className="no-exercises-hint">Click "Seed Default Exercises" to get started</p>
                </div>
              ) : (
                <div className="language-levels-container">
                  {Object.entries(languageExercises).map(([level, data]) => (
                    <div key={level} className="language-level-section" data-level={level}>
                      <div className="language-level-header">
                        <div className="level-info">
                          <h3 className="language-level-title">Level {level}</h3>
                          <p className="language-level-subtitle">{data.name}</p>
                        </div>
                        <span className="language-exercise-count">{data.exercises.length} exercise{data.exercises.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="language-exercises-list">
                        {data.exercises.map((exercise) => (
                          <div key={exercise._id} className="language-exercise-card" style={{ opacity: exercise.is_active ? 1 : 0.65 }}>
                            <div className="language-card-header">
                              <div className="language-card-meta">
                                <span className="language-order-badge">#{exercise.order}</span>
                                <span className="language-type-label">{exercise.type}</span>
                              </div>
                              <div className="language-card-actions">
                                <label className="language-active-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={exercise.is_active}
                                    onChange={() => handleToggleLanguageActive(exercise._id)}
                                  />
                                  <span>Active</span>
                                </label>
                                <button className="btn-edit" onClick={() => setEditingLanguageExercise(exercise)}>Edit</button>
                                <button className="btn-delete" onClick={() => handleDeleteLanguageExercise(exercise._id)}>Delete</button>
                              </div>
                            </div>
                            <div className="language-card-body">
                              <div className="language-instruction">
                                <span className="instruction-label">Instruction:</span>
                                <p>{exercise.instruction}</p>
                              </div>
                              {activeSub === 'receptive' ? (
                                <>
                                  <div className="language-target">
                                    <span className="target-label">Target:</span>
                                    <span className="target-value">"{exercise.target}"</span>
                                  </div>
                                  {exercise.options && exercise.options.length > 0 && (
                                    <div className="language-options">
                                      <span className="options-label">Options:</span>
                                      <div className="options-list">
                                        {exercise.options.map((option, idx) => (
                                          <span key={idx} className={`option-badge ${option.correct ? 'correct' : ''}`}>
                                            {option.image && <span className="option-emoji">{option.image}</span>}
                                            {option.text} {option.correct && '✓'}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="expressive-prompt-section">
                                    <span className="prompt-label">Prompt:</span>
                                    <div className="prompt-content">{exercise.prompt}</div>
                                  </div>
                                  
                                  {exercise.expectedKeywords && (
                                    <div className="expressive-keywords-section">
                                      <span className="keywords-label">Expected Keywords:</span>
                                      <div className="keywords-list">
                                        {(Array.isArray(exercise.expectedKeywords) 
                                          ? exercise.expectedKeywords 
                                          : exercise.expectedKeywords.split(',').map(k => k.trim())
                                        ).map((keyword, idx) => (
                                          <span key={idx} className="keyword-tag">{keyword}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {exercise.story && (
                                    <div className="expressive-story-section">
                                      <span className="story-label">Story:</span>
                                      <div className="story-content">
                                        <p>{exercise.story}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="expressive-meta">
                                    <div className="meta-item">
                                      <span className="meta-icon">📝</span>
                                      <span className="meta-text">Minimum {exercise.minWords} words required</span>
                                    </div>
                                    <div className="meta-item">
                                      <span className="meta-icon">🔑</span>
                                      <span className="meta-text">{exercise.expectedKeywords?.length || 0} keywords to include</span>
                                    </div>
                                  </div>
                                </>
                              )}
                              <div className="language-badges">
                                {!exercise.is_active && <span className="language-badge inactive">👁️ Hidden</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'fluency' && (
            <div className="fluency-section">
              <div className="controls-section">
                <div className="control-group">
                  <button className="btn-primary" onClick={handleSeedExercises}>
                    🌱 Seed Default Exercises
                  </button>
                  <button className="btn-primary" onClick={() => setShowExerciseModal(true)}>
                    ➕ New Exercise
                  </button>
                </div>
              </div>

              {Object.keys(fluencyExercises).length === 0 ? (
                <div className="no-exercises">
                  <div className="no-exercises-icon">🗣️</div>
                  <p className="no-exercises-text">No exercises found</p>
                  <p className="no-exercises-hint">Click "Seed Default Exercises" to get started</p>
                </div>
              ) : (
                <div className="fluency-levels-container">
                  {Object.entries(fluencyExercises).map(([level, data]) => (
                    <div key={level} className="fluency-level-section" data-level={level}>
                      <div className="fluency-level-header">
                        <div className="level-info">
                          <h3 className="fluency-level-title">Level {level}</h3>
                          <p className="fluency-level-subtitle">{data.name}</p>
                        </div>
                        <span className="fluency-exercise-count">{data.exercises.length} exercise{data.exercises.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="fluency-exercises-list">
                        {data.exercises.map((exercise) => (
                          <div key={exercise._id} className="fluency-exercise-card" style={{ opacity: exercise.is_active ? 1 : 0.65 }}>
                            <div className="fluency-card-header">
                              <div className="fluency-card-meta">
                                <span className="fluency-order-badge">#{exercise.order}</span>
                                <span className="fluency-type-label">{exercise.type}</span>
                              </div>
                              <div className="fluency-card-actions">
                                <label className="fluency-active-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={exercise.is_active}
                                    onChange={() => handleToggleActive(exercise._id)}
                                  />
                                  <span>Active</span>
                                </label>
                                <button className="btn-edit" onClick={() => setEditingExercise(exercise)}>Edit</button>
                                <button className="btn-delete" onClick={() => handleDeleteExercise(exercise._id)}>Delete</button>
                              </div>
                            </div>
                            <div className="fluency-card-body">
                              <div className="fluency-instruction">
                                <span className="instruction-label">Instruction:</span>
                                <p>{exercise.instruction}</p>
                              </div>
                              <div className="fluency-target">
                                <span className="target-label">Target:</span>
                                <span className="target-value">"{exercise.target}"</span>
                              </div>
                              <div className="fluency-badges">
                                <span className="fluency-badge duration">⏱️ {exercise.expectedDuration}s</span>
                                {exercise.breathing && <span className="fluency-badge breathing">🫁 Breathing</span>}
                                {!exercise.is_active && <span className="fluency-badge inactive">👁️ Hidden</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
              <h2>Create New Fluency Exercise</h2>
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
                <label>Order (within level)</label>
                <select 
                  value={newExercise.order}
                  onChange={(e) => setNewExercise({ ...newExercise, order: parseInt(e.target.value) })}
                >
                  {availableFluencyOrders.map(order => (
                    <option key={order} value={order}>Order {order}</option>
                  ))}
                </select>
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Available order numbers for this level
                </small>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={newExercise.type}
                  onChange={(e) => setNewExercise({ ...newExercise, type: e.target.value })}
                >
                  <option value="controlled-breathing">Controlled Breathing</option>
                  <option value="short-phrase">Short Phrase</option>
                  <option value="sentence">Sentence</option>
                  <option value="reading">Reading</option>
                  <option value="conversation">Conversation</option>
                </select>
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
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Fluency Exercise</h2>
              <button className="modal-close" onClick={() => setEditingExercise(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Non-editable fields section */}
              <div className="form-section">
                <h3 className="section-title">Exercise Information (Read-only)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Exercise ID</label>
                    <input 
                      type="text" 
                      value={editingExercise.id}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Order</label>
                    <input 
                      type="number" 
                      value={editingExercise.order}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                </div>
              </div>

              {/* Editable fields section */}
              <div className="form-section">
                <h3 className="section-title editable-section">Editable Fields</h3>
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    value={editingExercise.type}
                    onChange={(e) => setEditingExercise({ ...editingExercise, type: e.target.value })}
                  >
                    <option value="controlled-breathing">Controlled Breathing</option>
                    <option value="short-phrase">Short Phrase</option>
                    <option value="sentence">Sentence</option>
                    <option value="reading">Reading</option>
                    <option value="conversation">Conversation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Instruction</label>
                  <textarea 
                    value={editingExercise.instruction}
                    onChange={(e) => setEditingExercise({ ...editingExercise, instruction: e.target.value })}
                    rows={3}
                    placeholder="Instructions for the patient..."
                  />
                </div>
                <div className="form-group">
                  <label>Target (word/phrase/sentence)</label>
                  <textarea 
                    value={editingExercise.target}
                    onChange={(e) => setEditingExercise({ ...editingExercise, target: e.target.value })}
                    rows={2}
                    placeholder="The target word, phrase, or sentence"
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
                <div className="form-group-inline">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={editingExercise.breathing}
                      onChange={(e) => setEditingExercise({ ...editingExercise, breathing: e.target.checked })}
                    />
                    <span>Requires breathing exercise</span>
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={editingExercise.is_active}
                      onChange={(e) => setEditingExercise({ ...editingExercise, is_active: e.target.checked })}
                    />
                    <span>Active (visible to patients)</span>
                  </label>
                </div>
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
                    <label>Order (within level)</label>
                    <select 
                      value={newLanguageExercise.order}
                      onChange={(e) => setNewLanguageExercise({ ...newLanguageExercise, order: parseInt(e.target.value) })}
                    >
                      {availableLanguageOrders.map(order => (
                        <option key={order} value={order}>Order {order}</option>
                      ))}
                    </select>
                    <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                      Available order numbers for this level
                    </small>
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
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {activeSub === 'receptive' ? 'Receptive' : 'Expressive'} Language Exercise</h2>
              <button className="modal-close" onClick={() => setEditingLanguageExercise(null)}>×</button>
            </div>
            <div className="modal-body">
              {activeSub === 'receptive' ? (
                // Receptive edit modal with restrictions
                <>
                  <div className="form-section">
                    <h3 className="section-title">Exercise Information (Read-only)</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Exercise ID</label>
                        <input 
                          type="text" 
                          value={editingLanguageExercise.id}
                          disabled
                          className="disabled-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Order</label>
                        <input 
                          type="number" 
                          value={editingLanguageExercise.order || 1}
                          disabled
                          className="disabled-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title editable-section">Editable Fields</h3>
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
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={editingLanguageExercise.is_active}
                          onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, is_active: e.target.checked })}
                        />
                        <span>Active (visible to patients)</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                // Expressive edit modal - all fields editable
                <>
                  <div className="form-group">
                    <label>Exercise ID</label>
                    <input 
                      type="text" 
                      value={editingLanguageExercise.id}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select 
                      value={editingLanguageExercise.type}
                      onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, type: e.target.value })}
                    >
                      <option value="description">Description</option>
                      <option value="sentence">Sentence</option>
                      <option value="retell">Retell</option>
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
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={editingLanguageExercise.is_active}
                        onChange={(e) => setEditingLanguageExercise({ ...editingLanguageExercise, is_active: e.target.checked })}
                      />
                      <span>Active (visible to patients)</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setEditingLanguageExercise(null)}>Cancel</button>
              <button className="primary-btn" onClick={handleUpdateLanguageExercise}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Articulation Exercise Modal */}
      {showArticulationModal && (
        <div className="modal-overlay" onClick={() => setShowArticulationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Articulation Exercise</h2>
              <button className="modal-close" onClick={() => setShowArticulationModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Sound</label>
                <select 
                  value={newArticulationExercise.sound_id}
                  onChange={(e) => {
                    const soundId = e.target.value;
                    setNewArticulationExercise({ 
                      ...newArticulationExercise, 
                      sound_id: soundId,
                      sound_name: getSoundName(soundId)
                    });
                  }}
                >
                  <option value="s">S Sound</option>
                  <option value="r">R Sound</option>
                  <option value="l">L Sound</option>
                  <option value="k">K Sound</option>
                  <option value="th">TH Sound</option>
                </select>
              </div>
              <div className="form-group">
                <label>Level</label>
                <select 
                  value={newArticulationExercise.level}
                  onChange={(e) => {
                    const level = parseInt(e.target.value);
                    setNewArticulationExercise({ 
                      ...newArticulationExercise, 
                      level,
                      level_name: getLevelName(level)
                    });
                  }}
                >
                  <option value={1}>Level 1 - Sound</option>
                  <option value={2}>Level 2 - Syllable</option>
                  <option value={3}>Level 3 - Word</option>
                  <option value={4}>Level 4 - Phrase</option>
                  <option value={5}>Level 5 - Sentence</option>
                </select>
              </div>
              <div className="form-group">
                <label>Order (within level)</label>
                <select 
                  value={newArticulationExercise.order}
                  onChange={(e) => setNewArticulationExercise({ ...newArticulationExercise, order: parseInt(e.target.value) })}
                >
                  {availableOrders.map(order => (
                    <option key={order} value={order}>Order {order}</option>
                  ))}
                </select>
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Available order numbers for this sound/level combination
                </small>
              </div>
              <div className="form-group">
                <label>Target (text to pronounce)</label>
                <input 
                  type="text" 
                  value={newArticulationExercise.target}
                  onChange={(e) => setNewArticulationExercise({ ...newArticulationExercise, target: e.target.value })}
                  placeholder="e.g., sun, See the sun."
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={newArticulationExercise.is_active}
                    onChange={(e) => setNewArticulationExercise({ ...newArticulationExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowArticulationModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleCreateArticulationExercise}>Create Exercise</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Articulation Exercise Modal */}
      {editingArticulationExercise && (
        <div className="modal-overlay" onClick={() => setEditingArticulationExercise(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Articulation Exercise</h2>
              <button className="modal-close" onClick={() => setEditingArticulationExercise(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Exercise ID</label>
                <input 
                  type="text" 
                  value={editingArticulationExercise.exercise_id}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                />
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Exercise ID cannot be changed
                </small>
              </div>
              <div className="form-group">
                <label>Sound</label>
                <select 
                  value={editingArticulationExercise.sound_id}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                >
                  <option value="s">S Sound</option>
                  <option value="r">R Sound</option>
                  <option value="l">L Sound</option>
                  <option value="k">K Sound</option>
                  <option value="th">TH Sound</option>
                </select>
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Sound cannot be changed
                </small>
              </div>
              <div className="form-group">
                <label>Level</label>
                <select 
                  value={editingArticulationExercise.level}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                >
                  <option value={1}>Level 1 - Sound</option>
                  <option value={2}>Level 2 - Syllable</option>
                  <option value={3}>Level 3 - Word</option>
                  <option value={4}>Level 4 - Phrase</option>
                  <option value={5}>Level 5 - Sentence</option>
                </select>
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Level cannot be changed
                </small>
              </div>
              <div className="form-group">
                <label>Order (within level)</label>
                <input 
                  type="number" 
                  value={editingArticulationExercise.order}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                />
                <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Order cannot be changed
                </small>
              </div>
              <div className="form-group">
                <label>Target (text to pronounce)</label>
                <input 
                  type="text" 
                  value={editingArticulationExercise.target}
                  onChange={(e) => setEditingArticulationExercise({ ...editingArticulationExercise, target: e.target.value })}
                  placeholder="e.g., sun, See the sun."
                  style={{ backgroundColor: '#fff', fontWeight: '600' }}
                />
                <small style={{ color: '#059669', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  ✓ This field can be edited
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editingArticulationExercise.is_active}
                    onChange={(e) => setEditingArticulationExercise({ ...editingArticulationExercise, is_active: e.target.checked })}
                  />
                  Active (visible to patients)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setEditingArticulationExercise(null)}>Cancel</button>
              <button className="primary-btn" onClick={handleUpdateArticulationExercise}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TherapistDashboard;
