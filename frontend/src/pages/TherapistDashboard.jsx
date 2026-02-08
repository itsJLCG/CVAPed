import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { therapistService, authService, fluencyExerciseService, languageExerciseService, receptiveExerciseService, articulationExerciseService, successStoryService, appointmentService, diagnosticComparisonService } from '../services/api';
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
  const [selectedDays, setSelectedDays] = useState(30); // Default to 30 days

  // Physical therapy gait analyses state
  const [gaitAnalyses, setGaitAnalyses] = useState([]);
  const [loadingPhysical, setLoadingPhysical] = useState(false);
  const [expandedGaitRows, setExpandedGaitRows] = useState({});
  const [currentGaitPage, setCurrentGaitPage] = useState(1);
  const [gaitEntriesPerPage, setGaitEntriesPerPage] = useState(5);

  // Success Stories state
  const [successStories, setSuccessStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [currentStoryPage, setCurrentStoryPage] = useState(1);
  const [storyEntriesPerPage, setStoryEntriesPerPage] = useState(10);
  const [storySearchTerm, setStorySearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [newStory, setNewStory] = useState({
    patientName: '',
    story: ''
  });

  // Reports state
  const [reportsData, setReportsData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Diagnostic Comparison state
  const [diagComparisonData, setDiagComparisonData] = useState(null);
  const [diagPatientDiagnostics, setDiagPatientDiagnostics] = useState([]);
  const [loadingDiagComparison, setLoadingDiagComparison] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagSearchQuery, setDiagSearchQuery] = useState('');
  const [diagSearchResults, setDiagSearchResults] = useState([]);
  const [showDiagPatientDropdown, setShowDiagPatientDropdown] = useState(false);
  const [searchingDiagPatients, setSearchingDiagPatients] = useState(false);
  const [selectedDiagPatient, setSelectedDiagPatient] = useState(null);
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);
  const [newDiagnostic, setNewDiagnostic] = useState({
    assessment_date: new Date().toISOString().split('T')[0],
    assessment_type: 'initial',
    articulation_scores: { r: '', s: '', l: '', th: '', k: '' },
    fluency_score: '',
    receptive_score: '',
    expressive_score: '',
    gait_scores: { stability_score: '', gait_symmetry: '', step_regularity: '', overall_gait: '' },
    notes: '',
    severity_level: '',
    recommended_focus: []
  });

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [unassignedAppointments, setUnassignedAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentFilters, setAppointmentFilters] = useState({
    date: '',
    status: '',
    therapy_type: ''
  });
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    therapy_type: 'articulation',
    appointment_date: '',
    duration: 60,
    notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showUnassignedSection, setShowUnassignedSection] = useState(true);
  
  // Patient search autocomplete state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Load overview statistics
  const loadOverviewStats = async (days = selectedDays) => {
    setLoadingStats(true);
    try {
      const response = await therapistService.getStats(days);
      console.log('Therapist stats response:', response);
      setOverviewStats(response.stats || response);
    } catch (error) {
      console.error('Failed to load therapist stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load stats when overview tab is active or filter changes
  useEffect(() => {
    if (activeTab === 'overview' && user) {
      loadOverviewStats();
    }
  }, [activeTab, user, selectedDays]);

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
    if (activeTab === 'success-stories') loadSuccessStories();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'appointments') {
      loadAppointments();
      loadUnassignedAppointments();
    }
    // Diagnostic comparison tab resets when switching to it
    if (activeTab === 'diagnostics') {
      // Keep selectedDiagPatient if already set; otherwise no auto-load
    }
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

  // Success Stories Functions
  const loadSuccessStories = async () => {
    console.log('🔍 Loading success stories...');
    setLoadingStories(true);
    try {
      const response = await successStoryService.getAll();
      console.log('📦 Success stories response:', response);
      if (response.success) {
        setSuccessStories(response.data || []);
        console.log('✅ Success stories loaded:', response.data?.length || 0);
      }
    } catch (e) {
      console.error('❌ Failed to load success stories', e);
      setSuccessStories([]);
    } finally {
      setLoadingStories(false);
    }
  };

  // Diagnostic Comparison Functions
  const searchDiagPatients = async (query) => {
    if (!query || query.length < 2) {
      setDiagSearchResults([]);
      setShowDiagPatientDropdown(false);
      return;
    }
    setSearchingDiagPatients(true);
    try {
      const response = await appointmentService.therapist.searchPatients(query);
      if (response.success) {
        setDiagSearchResults(response.patients || []);
        setShowDiagPatientDropdown(true);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearchingDiagPatients(false);
    }
  };

  const selectDiagPatient = async (patient) => {
    setSelectedDiagPatient(patient);
    setDiagSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setShowDiagPatientDropdown(false);
    // Load comparison data for this patient
    await loadDiagComparison(patient._id || patient.id);
  };

  const loadDiagComparison = async (userId) => {
    setLoadingDiagComparison(true);
    try {
      const [comparisonRes, diagnosticsRes] = await Promise.all([
        diagnosticComparisonService.getComparison(userId),
        diagnosticComparisonService.getDiagnostics(userId)
      ]);
      setDiagComparisonData(comparisonRes);
      setDiagPatientDiagnostics(diagnosticsRes.diagnostics || []);
    } catch (error) {
      console.error('Error loading diagnostic comparison:', error);
      setDiagComparisonData(null);
      setDiagPatientDiagnostics([]);
    } finally {
      setLoadingDiagComparison(false);
    }
  };

  const handleSaveDiagnostic = async () => {
    if (!selectedDiagPatient) {
      alert('Please select a patient first');
      return;
    }
    setSavingDiagnostic(true);
    try {
      // Build the payload, converting empty strings to null
      const payload = {
        user_id: selectedDiagPatient._id || selectedDiagPatient.id,
        assessment_date: newDiagnostic.assessment_date,
        assessment_type: newDiagnostic.assessment_type,
        articulation_scores: {},
        fluency_score: newDiagnostic.fluency_score !== '' ? Number(newDiagnostic.fluency_score) : null,
        receptive_score: newDiagnostic.receptive_score !== '' ? Number(newDiagnostic.receptive_score) : null,
        expressive_score: newDiagnostic.expressive_score !== '' ? Number(newDiagnostic.expressive_score) : null,
        gait_scores: {},
        notes: newDiagnostic.notes,
        severity_level: newDiagnostic.severity_level,
        recommended_focus: newDiagnostic.recommended_focus
      };

      // Only include articulation scores that have values
      ['r', 's', 'l', 'th', 'k'].forEach(sound => {
        if (newDiagnostic.articulation_scores[sound] !== '') {
          payload.articulation_scores[sound] = Number(newDiagnostic.articulation_scores[sound]);
        }
      });

      // Only include gait scores that have values
      ['stability_score', 'gait_symmetry', 'step_regularity', 'overall_gait'].forEach(key => {
        if (newDiagnostic.gait_scores[key] !== '') {
          payload.gait_scores[key] = Number(newDiagnostic.gait_scores[key]);
        }
      });

      const response = await diagnosticComparisonService.createDiagnostic(payload);
      if (response.success) {
        alert('Facility diagnostic saved successfully!');
        setShowDiagModal(false);
        // Reset form
        setNewDiagnostic({
          assessment_date: new Date().toISOString().split('T')[0],
          assessment_type: 'initial',
          articulation_scores: { r: '', s: '', l: '', th: '', k: '' },
          fluency_score: '',
          receptive_score: '',
          expressive_score: '',
          gait_scores: { stability_score: '', gait_symmetry: '', step_regularity: '', overall_gait: '' },
          notes: '',
          severity_level: '',
          recommended_focus: []
        });
        // Reload comparison
        await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id);
      }
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      alert(error.response?.data?.message || 'Failed to save diagnostic');
    } finally {
      setSavingDiagnostic(false);
    }
  };

  const handleDeleteDiagnostic = async (diagnosticId) => {
    if (!window.confirm('Are you sure you want to delete this diagnostic record?')) return;
    try {
      const response = await diagnosticComparisonService.deleteDiagnostic(diagnosticId);
      if (response.success) {
        alert('Diagnostic deleted successfully');
        await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id);
      }
    } catch (error) {
      console.error('Error deleting diagnostic:', error);
      alert('Failed to delete diagnostic');
    }
  };

  const getDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined) return { text: 'N/A', className: 'delta-na', icon: '—' };
    if (delta > 0) return { text: `+${delta}%`, className: 'delta-positive', icon: '▲' };
    if (delta < 0) return { text: `${delta}%`, className: 'delta-negative', icon: '▼' };
    return { text: '0%', className: 'delta-neutral', icon: '—' };
  };

  // Reports Functions
  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await therapistService.getReports();
      if (response.success) {
        setReportsData(response.data || null);
      }
    } catch (e) {
      console.error('Failed to load reports', e);
      setReportsData(null);
    } finally {
      setLoadingReports(false);
    }
  };

  // Appointments Functions
  const loadAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const response = await appointmentService.therapist.getAppointments(appointmentFilters);
      if (response.success) {
        setAppointments(response.appointments || []);
      }
    } catch (e) {
      console.error('Failed to load appointments', e);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadUnassignedAppointments = async () => {
    setLoadingUnassigned(true);
    try {
      const response = await appointmentService.therapist.getUnassignedAppointments();
      if (response.success) {
        setUnassignedAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error('Error loading unassigned appointments:', error);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleAssignToMe = async (appointmentId) => {
    try {
      const response = await appointmentService.therapist.assignToAppointment(appointmentId);
      if (response.success) {
        alert('Appointment approved and assigned to you! The patient will be notified.');
        // Refresh both lists
        loadAppointments();
        loadUnassignedAppointments();
      }
    } catch (error) {
      console.error('Error assigning to appointment:', error);
      alert(error.response?.data?.message || 'Failed to approve and assign appointment');
    }
  };

  const loadPatients = async () => {
    // This would be a new endpoint to get all patients
    // For now, we'll leave it empty and handle it when creating appointments
    try {
      // TODO: Add endpoint to fetch all patients
      // const response = await therapistService.getPatients();
      // setPatients(response.patients || []);
    } catch (e) {
      console.error('Failed to load patients', e);
    }
  };

  const handleAddAppointment = () => {
    setEditingAppointment(null);
    setNewAppointment({
      patient_id: '',
      therapy_type: 'articulation',
      appointment_date: '',
      duration: 60,
      notes: ''
    });
    // Reset patient search
    setPatientSearchQuery('');
    setSelectedPatient(null);
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    try {
      // Validation
      if (!newAppointment.patient_id) {
        alert('Please select a patient');
        return;
      }
      if (!newAppointment.appointment_date) {
        alert('Please select date and time');
        return;
      }

      if (editingAppointment) {
        // Update existing appointment
        const response = await appointmentService.therapist.updateAppointment(
          editingAppointment._id,
          newAppointment
        );
        if (response.success) {
          alert('Appointment updated successfully');
          setShowAppointmentModal(false);
          loadAppointments();
        }
      } else {
        // Create new appointment
        const response = await appointmentService.therapist.createAppointment(newAppointment);
        if (response.success) {
          alert('Appointment created successfully');
          setShowAppointmentModal(false);
          loadAppointments();
        }
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(error.response?.data?.message || 'Failed to save appointment');
    }
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setNewAppointment({
      patient_id: appointment.patient_id,
      therapy_type: appointment.therapy_type,
      appointment_date: appointment.appointment_date,
      duration: appointment.duration,
      notes: appointment.notes || '',
      status: appointment.status || 'scheduled'
    });
    
    // Set patient search info for editing
    if (appointment.patient_name) {
      setPatientSearchQuery(appointment.patient_name);
      setSelectedPatient({
        _id: appointment.patient_id,
        fullName: appointment.patient_name,
        email: appointment.patient_email || ''
      });
    }
    
    setShowAppointmentModal(true);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await appointmentService.therapist.cancelAppointment(appointmentId);
      if (response.success) {
        alert('Appointment cancelled successfully');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const handleMarkComplete = async (appointmentId) => {
    try {
      const response = await appointmentService.therapist.updateAppointment(appointmentId, {
        status: 'completed'
      });
      if (response.success) {
        alert('Appointment marked as completed');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error marking appointment complete:', error);
      alert('Failed to update appointment');
    }
  };

  // Patient search with debouncing
  useEffect(() => {
    const searchPatients = async () => {
      if (!patientSearchQuery || patientSearchQuery.trim().length < 2) {
        setPatientSearchResults([]);
        setShowPatientDropdown(false);
        return;
      }

      setSearchingPatients(true);
      try {
        const response = await appointmentService.therapist.searchPatients(patientSearchQuery.trim(), 10);
        if (response.success) {
          setPatientSearchResults(response.patients || []);
          setShowPatientDropdown(true);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
        setPatientSearchResults([]);
      } finally {
        setSearchingPatients(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [patientSearchQuery]);

  // Close autocomplete dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPatientDropdown && !event.target.closest('.autocomplete-container')) {
        setShowPatientDropdown(false);
      }
    };

    if (showPatientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPatientDropdown]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.fullName);
    setNewAppointment({ ...newAppointment, patient_id: patient._id });
    setShowPatientDropdown(false);
  };

  const handlePatientSearchChange = (e) => {
    const value = e.target.value;
    setPatientSearchQuery(value);
    
    // Clear selected patient if search is cleared
    if (!value) {
      setSelectedPatient(null);
      setNewAppointment({ ...newAppointment, patient_id: '' });
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);
    
    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(previews);
  };

  const handleRemoveImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviewUrls.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviewUrls(newPreviews);
  };

  const handleAddStory = () => {
    setEditingStory(null);
    setNewStory({
      patientName: '',
      story: ''
    });
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setShowStoryModal(true);
  };

  const handleSaveStory = async () => {
    try {
      // Validation
      if (!newStory.patientName.trim()) {
        alert('Patient name is required');
        return;
      }
      if (!newStory.story.trim()) {
        alert('Success story content is required');
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('patientName', newStory.patientName);
      formData.append('story', newStory.story);
      
      // Append images
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await successStoryService.create(formData);
      
      if (response.success) {
        setShowStoryModal(false);
        setSelectedImages([]);
        setImagePreviewUrls([]);
        loadSuccessStories();
        alert('Success story added successfully!');
      }
    } catch (error) {
      console.error('Failed to add success story:', error);
      alert(error.response?.data?.message || 'Failed to add success story');
    }
  };

  const handleEditStory = (story) => {
    setEditingStory(story);
    setNewStory({
      patientName: story.patientName,
      story: story.story
    });
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setShowStoryModal(true);
  };

  const handleUpdateStory = async () => {
    try {
      // Validation
      if (!newStory.patientName.trim()) {
        alert('Patient name is required');
        return;
      }
      if (!newStory.story.trim()) {
        alert('Success story content is required');
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('patientName', newStory.patientName);
      formData.append('story', newStory.story);
      
      // Append new images
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      const response = await successStoryService.update(editingStory.id, formData);
      
      if (response.success) {
        setShowStoryModal(false);
        setEditingStory(null);
        setSelectedImages([]);
        setImagePreviewUrls([]);
        loadSuccessStories();
        alert('Success story updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update success story:', error);
      alert(error.response?.data?.message || 'Failed to update success story');
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this success story?')) return;
    
    try {
      const response = await successStoryService.delete(storyId);
      if (response.success) {
        loadSuccessStories();
        alert('Success story deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete success story:', error);
      alert(error.response?.data?.message || 'Failed to delete success story');
    }
  };

  const handleRemoveExistingImage = async (storyId, imagePath) => {
    if (!window.confirm('Are you sure you want to remove this image?')) return;
    
    try {
      const response = await successStoryService.removeImage(storyId, imagePath);
      if (response.success) {
        loadSuccessStories();
        alert('Image removed successfully!');
      }
    } catch (error) {
      console.error('Failed to remove image:', error);
      alert(error.response?.data?.message || 'Failed to remove image');
    }
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

          <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => { setActiveTab('appointments'); setTherapyData([]); }}>
            <span className="nav-icon">📅</span>
            {!sidebarCollapsed && <span className="nav-label">Appointments</span>}
          </button>

          <button className={`nav-item ${activeTab === 'success-stories' ? 'active' : ''}`} onClick={() => { setActiveTab('success-stories'); setTherapyData([]); }}>
            <span className="nav-icon">⭐</span>
            {!sidebarCollapsed && <span className="nav-label">Success Stories</span>}
          </button>

          <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setTherapyData([]); }}>
            <span className="nav-icon">📊</span>
            {!sidebarCollapsed && <span className="nav-label">Reports</span>}
          </button>

          <button className={`nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => { setActiveTab('diagnostics'); setTherapyData([]); }}>
            <span className="nav-icon">🔬</span>
            {!sidebarCollapsed && <span className="nav-label">Diagnostic Comparison</span>}
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
            <h1 className="page-title">{activeTab === 'overview' ? 'Overview' : activeTab === 'physical' ? 'Physical Therapy' : activeTab === 'articulation' ? 'Articulation' : activeTab === 'language' ? `Language - ${activeSub}` : activeTab === 'fluency' ? 'Fluency' : activeTab === 'appointments' ? 'Appointments' : activeTab === 'success-stories' ? 'Success Stories' : activeTab === 'reports' ? 'Reports' : activeTab === 'diagnostics' ? 'Diagnostic Comparison' : 'Therapist'}</h1>
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
                        <div className="stat-filter-inline">
                          <select
                            className="stat-filter-dropdown"
                            value={selectedDays}
                            onChange={(e) => setSelectedDays(e.target.value)}
                          >
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="180">Last 6 Months</option>
                            <option value="365">Last Year</option>
                            <option value="all">All Time</option>
                          </select>
                        </div>
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

                    {/* Appointment Stats */}
                    {overviewStats.appointments && (
                      <>
                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                            <span className="stat-icon-emoji">📅</span>
                          </div>
                          <div className="stat-details">
                            <h3 className="stat-value">{overviewStats.appointments.today || 0}</h3>
                            <p className="stat-label">Today's Appointments</p>
                            <span className="stat-badge">Scheduled</span>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}>
                            <span className="stat-icon-emoji">📆</span>
                          </div>
                          <div className="stat-details">
                            <h3 className="stat-value">{overviewStats.appointments.upcoming || 0}</h3>
                            <p className="stat-label">Upcoming Appointments</p>
                            <span className="stat-badge">Next 7 Days</span>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }}>
                            <span className="stat-icon-emoji">✔️</span>
                          </div>
                          <div className="stat-details">
                            <h3 className="stat-value">{overviewStats.appointments.completed || 0}</h3>
                            <p className="stat-label">Completed Appointments</p>
                            <span className="stat-badge">{overviewStats.appointments.completion_rate || 0}% Rate</span>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
                            <span className="stat-icon-emoji">📊</span>
                          </div>
                          <div className="stat-details">
                            <h3 className="stat-value">{overviewStats.appointments.total || 0}</h3>
                            <p className="stat-label">Total Appointments</p>
                            <span className="stat-badge">All Time</span>
                          </div>
                        </div>
                      </>
                    )}
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

          {activeTab === 'success-stories' && (
            <div className="success-stories-section">
              <div className="controls-section">
                <div className="control-group">
                  <button className="btn-primary" onClick={handleAddStory}>
                    ➕ Add Success Story
                  </button>
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search by patient name..."
                      value={storySearchTerm}
                      onChange={(e) => setStorySearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="pagination-controls">
                    <label className="entries-label">
                      Show:
                      <select 
                        value={storyEntriesPerPage} 
                        onChange={(e) => {
                          setStoryEntriesPerPage(Number(e.target.value));
                          setCurrentStoryPage(1);
                        }}
                        className="entries-select"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      entries
                    </label>
                  </div>
                  <div className="stats-summary">
                    <span className="stat-item">
                      <strong>{successStories.length}</strong> Total Stories
                    </span>
                  </div>
                </div>
              </div>

              {loadingStories ? (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading success stories...</p>
                </div>
              ) : successStories.length === 0 ? (
                <div className="no-exercises">
                  <div className="no-exercises-icon">⭐</div>
                  <p className="no-exercises-text">No success stories yet</p>
                  <p className="no-exercises-hint">Click "Add Success Story" to share patient achievements</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="logs-table stories-table">
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Story Preview</th>
                        <th>Images</th>
                        <th>Date Added</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredStories = successStories.filter(story =>
                          !storySearchTerm ||
                          story.patientName.toLowerCase().includes(storySearchTerm.toLowerCase())
                        );
                        const indexOfLastEntry = currentStoryPage * storyEntriesPerPage;
                        const indexOfFirstEntry = indexOfLastEntry - storyEntriesPerPage;
                        const currentEntries = filteredStories.slice(indexOfFirstEntry, indexOfLastEntry);
                        return currentEntries.map(story => (
                          <tr key={story.id}>
                            <td>
                              <div className="patient-cell">
                                <div className="patient-avatar-small">
                                  {story.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <span className="patient-name-text">{story.patientName}</span>
                              </div>
                            </td>
                            <td>
                              <div className="story-preview">
                                {story.story.length > 100 
                                  ? `${story.story.substring(0, 100)}...` 
                                  : story.story}
                              </div>
                            </td>
                            <td>
                              <div className="story-images-preview">
                                {story.images && story.images.length > 0 ? (
                                  <div className="image-thumbnails">
                                    {story.images.slice(0, 3).map((imagePath, idx) => (
                                      <img 
                                        key={idx}
                                        src={`http://localhost:5000/${imagePath}`}
                                        alt={`${story.patientName} - Image ${idx + 1}`}
                                        className="story-thumbnail"
                                        title={`Image ${idx + 1} of ${story.images.length}`}
                                      />
                                    ))}
                                    {story.images.length > 3 && (
                                      <div className="more-images-badge">
                                        +{story.images.length - 3}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="no-images-text">No images</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="date-cell">{formatDate(story.createdAt)}</span>
                            </td>
                            <td>
                              <div className="exercise-actions">
                                <button 
                                  className="btn-edit" 
                                  onClick={() => handleEditStory(story)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn-delete" 
                                  onClick={() => handleDeleteStory(story.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="pagination">
                    <button 
                      onClick={() => setCurrentStoryPage(prev => Math.max(1, prev - 1))}
                      disabled={currentStoryPage === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentStoryPage} of {Math.ceil(successStories.filter(story =>
                        !storySearchTerm ||
                        story.patientName.toLowerCase().includes(storySearchTerm.toLowerCase())
                      ).length / storyEntriesPerPage) || 1}
                    </span>
                    <button 
                      onClick={() => setCurrentStoryPage(prev => Math.min(Math.ceil(successStories.filter(story =>
                        !storySearchTerm ||
                        story.patientName.toLowerCase().includes(storySearchTerm.toLowerCase())
                      ).length / storyEntriesPerPage), prev + 1))}
                      disabled={currentStoryPage === Math.ceil(successStories.filter(story =>
                        !storySearchTerm ||
                        story.patientName.toLowerCase().includes(storySearchTerm.toLowerCase())
                      ).length / storyEntriesPerPage)}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
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

          {activeTab === 'appointments' && (
            <div className="appointments-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Manage Appointments</h2>
                  <p>Schedule and track therapy sessions with patients</p>
                </div>
                <button className="btn-primary" onClick={handleAddAppointment}>
                  <span>📅</span> New Appointment
                </button>
              </div>

              {/* Unassigned Appointments Section */}
              {unassignedAppointments.length > 0 && (
                <div className="unassigned-appointments-container">
                  <div className="unassigned-header">
                    <div className="header-content">
                      <h3>
                        <span className="badge-count">{unassignedAppointments.length}</span>
                        Pending Appointment Request{unassignedAppointments.length !== 1 ? 's' : ''}
                      </h3>
                      <p>These appointment requests need your approval. Assign yourself to approve and handle the appointment.</p>
                    </div>
                    <button 
                      className="btn-toggle"
                      onClick={() => setShowUnassignedSection(!showUnassignedSection)}
                    >
                      {showUnassignedSection ? '▼ Hide' : '▶ Show'}
                    </button>
                  </div>

                  {showUnassignedSection && (
                    <div className="unassigned-list">
                      {loadingUnassigned ? (
                        <div className="loading-message">Loading pending appointments...</div>
                      ) : (
                        <div className="unassigned-grid">
                          {unassignedAppointments.map((appointment) => (
                            <div key={appointment._id} className="unassigned-card">
                              <div className="unassigned-card-header">
                                <div className="therapy-badge-large" data-type={appointment.therapy_type}>
                                  {appointment.therapy_type === 'articulation' && '🗣️'}
                                  {appointment.therapy_type === 'language' && '💬'}
                                  {appointment.therapy_type === 'fluency' && '🎯'}
                                  {appointment.therapy_type === 'physical' && '🏃'}
                                  <span>{appointment.therapy_type.charAt(0).toUpperCase() + appointment.therapy_type.slice(1)}</span>
                                </div>
                                <span className="pending-badge">Pending</span>
                              </div>

                              <div className="unassigned-card-body">
                                <div className="patient-info-large">
                                  <div className="patient-avatar-large">
                                    {appointment.patient_name?.charAt(0) || 'P'}
                                  </div>
                                  <div>
                                    <h4>{appointment.patient_name || 'Unknown Patient'}</h4>
                                    <p className="patient-email">{appointment.patient_email || ''}</p>
                                  </div>
                                </div>

                                <div className="appointment-info-grid">
                                  <div className="info-item">
                                    <span className="icon">📅</span>
                                    <div>
                                      <label>Date</label>
                                      <span>{new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}</span>
                                    </div>
                                  </div>
                                  <div className="info-item">
                                    <span className="icon">🕒</span>
                                    <div>
                                      <label>Time</label>
                                      <span>{new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</span>
                                    </div>
                                  </div>
                                  <div className="info-item">
                                    <span className="icon">⏱️</span>
                                    <div>
                                      <label>Duration</label>
                                      <span>{appointment.duration || 60} min</span>
                                    </div>
                                  </div>
                                </div>

                                {appointment.notes && (
                                  <div className="notes-section">
                                    <label>Notes:</label>
                                    <p>{appointment.notes}</p>
                                  </div>
                                )}
                              </div>

                              <div className="unassigned-card-footer">
                                <button 
                                  className="btn-assign-me"
                                  onClick={() => handleAssignToMe(appointment._id)}
                                >
                                  Approve & Assign to Me
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* My Appointments Section Header */}
              {unassignedAppointments.length > 0 && (
                <div className="section-divider">
                  <h3>My Confirmed Appointments</h3>
                  <p>Appointments you've approved and are handling</p>
                </div>
              )}

              {/* Filters */}
              <div className="appointments-filters">
                <div className="filter-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={appointmentFilters.date}
                    onChange={(e) => {
                      setAppointmentFilters({ ...appointmentFilters, date: e.target.value });
                      loadAppointments();
                    }}
                  />
                </div>
                <div className="filter-group">
                  <label>Status</label>
                  <select
                    value={appointmentFilters.status}
                    onChange={(e) => {
                      setAppointmentFilters({ ...appointmentFilters, status: e.target.value });
                      loadAppointments();
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Therapy Type</label>
                  <select
                    value={appointmentFilters.therapy_type}
                    onChange={(e) => {
                      setAppointmentFilters({ ...appointmentFilters, therapy_type: e.target.value });
                      loadAppointments();
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="articulation">Articulation</option>
                    <option value="language">Language</option>
                    <option value="fluency">Fluency</option>
                    <option value="physical">Physical</option>
                  </select>
                </div>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setAppointmentFilters({ date: '', status: '', therapy_type: '' });
                    loadAppointments();
                  }}
                >
                  Clear Filters
                </button>
              </div>

              {loadingAppointments ? (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading appointments...</p>
                </div>
              ) : appointments.length > 0 ? (
                <div className="datatable-container">
                  <table className="appointments-datatable">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Therapy Type</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment._id} className={`appointment-row status-${appointment.status}`}>
                          <td className="patient-cell">
                            <div className="patient-info-inline">
                              <div className="patient-avatar-small">
                                {appointment.patient_name?.charAt(0) || 'P'}
                              </div>
                              <div className="patient-details">
                                <div className="patient-name">{appointment.patient_name || 'Unknown Patient'}</div>
                                <div className="patient-email">{appointment.patient_email || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="therapy-type-badge" data-type={appointment.therapy_type}>
                              {appointment.therapy_type === 'articulation' && '🗣️'}
                              {appointment.therapy_type === 'language' && '💬'}
                              {appointment.therapy_type === 'fluency' && '🎯'}
                              {appointment.therapy_type === 'physical' && '🏃'}
                              <span>{appointment.therapy_type.charAt(0).toUpperCase() + appointment.therapy_type.slice(1)}</span>
                            </div>
                          </td>
                          <td className="date-cell">
                            {new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </td>
                          <td className="time-cell">
                            {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </td>
                          <td className="duration-cell">{appointment.duration} min</td>
                          <td>
                            <span className={`status-badge status-${appointment.status}`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                          <td className="notes-cell">
                            {appointment.notes ? (
                              <div className="notes-preview" title={appointment.notes}>
                                {appointment.notes.length > 30 ? appointment.notes.substring(0, 30) + '...' : appointment.notes}
                              </div>
                            ) : (
                              <span className="no-notes">—</span>
                            )}
                          </td>
                          <td className="actions-cell">
                            <div className="action-buttons">
                              <button 
                                className="btn-icon-small btn-view"
                                onClick={() => handleViewAppointment(appointment)}
                                title="View Details"
                              >
                                View
                              </button>
                              <button 
                                className="btn-icon-small btn-edit"
                                onClick={() => handleEditAppointment(appointment)}
                                title="Edit Appointment"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data-message">
                  <span className="no-data-icon">📅</span>
                  <h3>No Appointments Found</h3>
                  <p>No appointments match your current filters. Try adjusting the filters or create a new appointment.</p>
                  <button className="btn-primary" onClick={handleAddAppointment}>
                    <span>📅</span> Schedule New Appointment
                  </button>
                </div>
              )}

              {/* Appointment Modal */}
              {showAppointmentModal && (
                <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
                  <div className="modal-content appointment-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>{editingAppointment ? 'Edit Appointment' : 'New Appointment'}</h3>
                      <button className="modal-close" onClick={() => setShowAppointmentModal(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Patient <span className="required">*</span></label>
                        <div className="autocomplete-container">
                          <input
                            type="text"
                            value={patientSearchQuery}
                            onChange={handlePatientSearchChange}
                            onFocus={() => {
                              if (patientSearchResults.length > 0) {
                                setShowPatientDropdown(true);
                              }
                            }}
                            placeholder="Search by name or email..."
                            disabled={editingAppointment}
                            className={selectedPatient ? 'has-selection' : ''}
                          />
                          {searchingPatients && (
                            <div className="autocomplete-loading">
                              <div className="spinner-small"></div>
                            </div>
                          )}
                          {showPatientDropdown && patientSearchResults.length > 0 && (
                            <div className="autocomplete-dropdown">
                              {patientSearchResults.map((patient) => (
                                <div
                                  key={patient._id}
                                  className="autocomplete-item"
                                  onClick={() => handleSelectPatient(patient)}
                                >
                                  <div className="autocomplete-item-name">{patient.fullName}</div>
                                  <div className="autocomplete-item-details">
                                    {patient.email} • Age: {patient.age} • {patient.therapyType}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {showPatientDropdown && patientSearchQuery.trim().length >= 2 && patientSearchResults.length === 0 && !searchingPatients && (
                            <div className="autocomplete-dropdown">
                              <div className="autocomplete-empty">
                                No patients found matching "{patientSearchQuery}"
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedPatient && (
                          <div className="selected-patient-info">
                            ✓ Selected: <strong>{selectedPatient.fullName}</strong> ({selectedPatient.email})
                          </div>
                        )}
                        <small className="form-hint">
                          {editingAppointment 
                            ? 'Patient cannot be changed for existing appointments' 
                            : 'Type at least 2 characters to search for patients'}
                        </small>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Therapy Type <span className="required">*</span></label>
                          <select
                            value={newAppointment.therapy_type}
                            onChange={(e) => setNewAppointment({ ...newAppointment, therapy_type: e.target.value })}
                          >
                            <option value="articulation">🗣️ Articulation</option>
                            <option value="language">💬 Language</option>
                            <option value="fluency">🎯 Fluency</option>
                            <option value="physical">🏃 Physical</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Duration (minutes)</label>
                          <select
                            value={newAppointment.duration}
                            onChange={(e) => setNewAppointment({ ...newAppointment, duration: parseInt(e.target.value) })}
                          >
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Date & Time <span className="required">*</span></label>
                          <input
                            type="datetime-local"
                            value={newAppointment.appointment_date ? new Date(newAppointment.appointment_date).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                          />
                        </div>

                        {editingAppointment && (
                          <div className="form-group">
                            <label>Status <span className="required">*</span></label>
                            <select
                              value={newAppointment.status || 'scheduled'}
                              onChange={(e) => setNewAppointment({ ...newAppointment, status: e.target.value })}
                              className="status-select"
                            >
                              <option value="scheduled">📅 Scheduled</option>
                              <option value="confirmed">✅ Confirmed</option>
                              <option value="completed">✔️ Completed</option>
                              <option value="cancelled">❌ Cancelled</option>
                              <option value="no-show">⚠️ No Show</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Notes</label>
                        <textarea
                          value={newAppointment.notes}
                          onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                          placeholder="Add any additional notes or special requirements..."
                          rows="4"
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setShowAppointmentModal(false)}>
                        Cancel
                      </button>
                      <button className="btn-primary" onClick={handleSaveAppointment}>
                        {editingAppointment ? 'Update Appointment' : 'Create Appointment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Details Modal */}
              {showAppointmentDetails && selectedAppointment && (
                <div className="modal-overlay" onClick={() => setShowAppointmentDetails(false)}>
                  <div className="modal-content appointment-details-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <div className="modal-header-content">
                        <h3>Appointment Details</h3>
                        <span className={`status-badge status-${selectedAppointment.status}`}>
                          {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                        </span>
                      </div>
                      <button className="modal-close" onClick={() => setShowAppointmentDetails(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      {/* Patient Information Section */}
                      <div className="details-section">
                        <h4 className="section-heading">Patient Information</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <div className="detail-label">Patient Name</div>
                            <div className="detail-value">
                              <div className="patient-avatar-inline">
                                {selectedAppointment.patient_name?.charAt(0) || 'P'}
                              </div>
                              {selectedAppointment.patient_name}
                            </div>
                          </div>
                          {selectedAppointment.patient_email && (
                            <div className="detail-item">
                              <div className="detail-label">Email</div>
                              <div className="detail-value">{selectedAppointment.patient_email}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Appointment Information Section */}
                      <div className="details-section">
                        <h4 className="section-heading">Appointment Details</h4>
                        <div className="details-grid">
                          <div className="detail-item">
                            <div className="detail-label">Therapy Type</div>
                            <div className="detail-value">
                              <span className="therapy-type-badge" data-type={selectedAppointment.therapy_type}>
                                {selectedAppointment.therapy_type === 'articulation' && '🗣️ '}
                                {selectedAppointment.therapy_type === 'language' && '💬 '}
                                {selectedAppointment.therapy_type === 'fluency' && '🎯 '}
                                {selectedAppointment.therapy_type === 'physical' && '🏃 '}
                                {selectedAppointment.therapy_type.charAt(0).toUpperCase() + selectedAppointment.therapy_type.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Duration</div>
                            <div className="detail-value">
                              <span className="duration-badge">{selectedAppointment.duration} minutes</span>
                            </div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Date</div>
                            <div className="detail-value date-value">
                              {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Time</div>
                            <div className="detail-value time-value">
                              {new Date(selectedAppointment.appointment_date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information Section */}
                      {(selectedAppointment.notes || selectedAppointment.session_summary || selectedAppointment.cancellation_reason) && (
                        <div className="details-section">
                          <h4 className="section-heading">Additional Information</h4>
                          {selectedAppointment.notes && (
                            <div className="detail-block">
                              <div className="detail-label">Notes</div>
                              <div className="detail-text">{selectedAppointment.notes}</div>
                            </div>
                          )}
                          {selectedAppointment.session_summary && (
                            <div className="detail-block">
                              <div className="detail-label">Session Summary</div>
                              <div className="detail-text">{selectedAppointment.session_summary}</div>
                            </div>
                          )}
                          {selectedAppointment.cancellation_reason && (
                            <div className="detail-block">
                              <div className="detail-label">Cancellation Reason</div>
                              <div className="detail-text cancellation-text">{selectedAppointment.cancellation_reason}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setShowAppointmentDetails(false)}>
                        Close
                      </button>
                      <button className="btn-primary" onClick={() => {
                        setShowAppointmentDetails(false);
                        handleEditAppointment(selectedAppointment);
                      }}>
                        Edit Appointment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-section">
              {loadingReports ? (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading reports...</p>
                </div>
              ) : reportsData ? (
                <div className="reports-container">
                  {/* Age Bracket Analysis */}
                  <div className="report-card">
                    <div className="report-card-header">
                      <h3 className="report-card-title">
                        <span className="report-icon">👥</span>
                        Age Distribution
                      </h3>
                      <p className="report-card-subtitle">Patient distribution across age brackets</p>
                    </div>
                    <div className="report-card-body">
                      {reportsData.ageBrackets && reportsData.ageBrackets.length > 0 ? (
                        <>
                          <div className="age-brackets-grid">
                            {reportsData.ageBrackets.map((bracket, index) => (
                              <div 
                                key={index} 
                                className={`age-bracket-item ${bracket.isHighest ? 'highest' : ''}`}
                              >
                                <div className="bracket-label">{bracket.range}</div>
                                <div className="bracket-count">{bracket.count}</div>
                                <div className="bracket-percentage">{bracket.percentage}%</div>
                                {bracket.isHighest && (
                                  <div className="highest-badge">Highest</div>
                                )}
                                <div className="bracket-bar">
                                  <div 
                                    className="bracket-bar-fill" 
                                    style={{ width: `${bracket.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="report-summary">
                            <div className="summary-item highlight">
                              <span className="summary-icon">🎯</span>
                              <div className="summary-content">
                                <span className="summary-label">Highest Age Bracket:</span>
                                <span className="summary-value">{reportsData.highestAgeBracket?.range || 'N/A'}</span>
                              </div>
                              <div className="summary-count">{reportsData.highestAgeBracket?.count || 0} patients</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="no-data">
                          <div className="no-data-icon">📊</div>
                          <p>No age data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gender Distribution */}
                  <div className="report-card">
                    <div className="report-card-header">
                      <h3 className="report-card-title">
                        <span className="report-icon">⚧️</span>
                        Gender Distribution
                      </h3>
                      <p className="report-card-subtitle">Patient distribution by gender</p>
                    </div>
                    <div className="report-card-body">
                      {reportsData.genderDistribution && reportsData.genderDistribution.length > 0 ? (
                        <>
                          <div className="gender-distribution-grid">
                            {reportsData.genderDistribution.map((gender, index) => (
                              <div key={index} className="gender-item">
                                <div className="gender-icon-wrapper">
                                  <span className="gender-emoji">
                                    {gender.gender === 'male' ? '👨' : 
                                     gender.gender === 'female' ? '👩' : 
                                     gender.gender === 'other' ? '🧑' : '❓'}
                                  </span>
                                </div>
                                <div className="gender-info">
                                  <div className="gender-label">
                                    {gender.gender.charAt(0).toUpperCase() + gender.gender.slice(1)}
                                  </div>
                                  <div className="gender-stats">
                                    <span className="gender-count">{gender.count} patients</span>
                                    <span className="gender-percentage">{gender.percentage}%</span>
                                  </div>
                                  <div className="gender-bar">
                                    <div 
                                      className={`gender-bar-fill ${gender.gender}`}
                                      style={{ width: `${gender.percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="report-summary">
                            <div className="summary-stats-row">
                              <div className="summary-stat">
                                <span className="stat-label">Total Patients</span>
                                <span className="stat-value">{reportsData.totalPatients || 0}</span>
                              </div>
                              <div className="summary-stat">
                                <span className="stat-label">Gender Categories</span>
                                <span className="stat-value">{reportsData.genderDistribution.length}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="no-data">
                          <div className="no-data-icon">⚧️</div>
                          <p>No gender data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data-large">
                  <div className="no-data-icon">📊</div>
                  <p className="no-data-text">No reports data available</p>
                  <p className="no-data-hint">Reports will appear here once patient data is available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="diagnostics-section">
              {/* Patient Search */}
              <div className="diag-search-bar">
                <div className="diag-search-wrapper">
                  <span className="diag-search-icon">🔍</span>
                  <input
                    type="text"
                    className="diag-search-input"
                    placeholder="Search patient by name..."
                    value={diagSearchQuery}
                    onChange={(e) => {
                      setDiagSearchQuery(e.target.value);
                      searchDiagPatients(e.target.value);
                    }}
                    onFocus={() => { if (diagSearchResults.length > 0) setShowDiagPatientDropdown(true); }}
                  />
                  {searchingDiagPatients && <span className="diag-search-spinner">⏳</span>}
                  {showDiagPatientDropdown && diagSearchResults.length > 0 && (
                    <div className="diag-patient-dropdown">
                      {diagSearchResults.map((p) => (
                        <button
                          key={p._id || p.id}
                          className="diag-patient-option"
                          onClick={() => selectDiagPatient(p)}
                        >
                          <span className="diag-patient-name">{p.firstName} {p.lastName}</span>
                          <span className="diag-patient-email">{p.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedDiagPatient && (
                  <button className="diag-add-btn" onClick={() => setShowDiagModal(true)}>
                    + Add Facility Diagnostic
                  </button>
                )}
              </div>

              {/* No patient selected */}
              {!selectedDiagPatient && (
                <div className="no-data-large">
                  <div className="no-data-icon">🔬</div>
                  <p className="no-data-text">Select a patient to view diagnostic comparison</p>
                  <p className="no-data-hint">Use the search bar above to find a patient, then view their facility vs. at-home results</p>
                </div>
              )}

              {/* Loading */}
              {selectedDiagPatient && loadingDiagComparison && (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Loading comparison data...</p>
                </div>
              )}

              {/* Comparison Results */}
              {selectedDiagPatient && !loadingDiagComparison && diagComparisonData && (
                <>
                  {/* Info Header */}
                  <div className="diag-info-header">
                    <div className="diag-patient-info">
                      <h3>{diagComparisonData.patient_name || `${selectedDiagPatient.firstName} ${selectedDiagPatient.lastName}`}</h3>
                      {diagComparisonData.has_facility_data && (
                        <div className="diag-meta">
                          <span className="diag-meta-item">
                            📅 Assessment: {new Date(diagComparisonData.assessment_date).toLocaleDateString()}
                          </span>
                          <span className="diag-meta-item">
                            📋 Type: {diagComparisonData.assessment_type?.charAt(0).toUpperCase() + diagComparisonData.assessment_type?.slice(1)}
                          </span>
                          {diagComparisonData.assessor_name && (
                            <span className="diag-meta-item">
                              👤 Assessed by: {diagComparisonData.assessor_name}
                            </span>
                          )}
                          {diagComparisonData.severity_level && (
                            <span className={`diag-severity diag-severity-${diagComparisonData.severity_level}`}>
                              {diagComparisonData.severity_level.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!diagComparisonData.has_facility_data ? (
                    <div className="no-data-large">
                      <div className="no-data-icon">📋</div>
                      <p className="no-data-text">No facility diagnostic found for this patient</p>
                      <p className="no-data-hint">Click "Add Facility Diagnostic" above to enter assessment results</p>
                    </div>
                  ) : (
                    <>
                      {/* Comparison Table */}
                      <div className="report-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">📊</span>
                            Facility vs. At-Home Comparison
                          </h3>
                          <p className="report-card-subtitle">Side-by-side view of diagnostic results and current home performance</p>
                        </div>
                        <div className="report-card-body">
                          <table className="diag-comparison-table">
                            <thead>
                              <tr>
                                <th>Metric</th>
                                <th>Facility Score</th>
                                <th>At-Home Score</th>
                                <th>Δ Change</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Articulation Sounds */}
                              {['r', 's', 'l', 'th', 'k'].map(sound => {
                                const facilityVal = diagComparisonData.facility_scores?.articulation?.[sound];
                                const homeVal = diagComparisonData.home_scores?.articulation?.[sound];
                                const delta = diagComparisonData.deltas?.articulation?.[sound];
                                const d = getDeltaDisplay(delta);
                                if (facilityVal == null && homeVal == null) return null;
                                return (
                                  <tr key={`art-${sound}`}>
                                    <td className="metric-name">
                                      <span className="metric-icon" style={{ backgroundColor: '#9C27B0' }}>🗣️</span>
                                      Articulation /{sound.toUpperCase()}/
                                    </td>
                                    <td className="score-cell">{facilityVal != null ? `${facilityVal}%` : '—'}</td>
                                    <td className="score-cell">{homeVal != null ? `${homeVal}%` : '—'}</td>
                                    <td className={`delta-cell ${d.className}`}>
                                      <span className="delta-icon">{d.icon}</span> {d.text}
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Fluency */}
                              {(diagComparisonData.facility_scores?.fluency != null || diagComparisonData.home_scores?.fluency != null) && (
                                <tr>
                                  <td className="metric-name">
                                    <span className="metric-icon" style={{ backgroundColor: '#FF9800' }}>💬</span>
                                    Fluency
                                  </td>
                                  <td className="score-cell">{diagComparisonData.facility_scores?.fluency != null ? `${diagComparisonData.facility_scores.fluency}%` : '—'}</td>
                                  <td className="score-cell">{diagComparisonData.home_scores?.fluency != null ? `${diagComparisonData.home_scores.fluency}%` : '—'}</td>
                                  <td className={`delta-cell ${getDeltaDisplay(diagComparisonData.deltas?.fluency).className}`}>
                                    <span className="delta-icon">{getDeltaDisplay(diagComparisonData.deltas?.fluency).icon}</span> {getDeltaDisplay(diagComparisonData.deltas?.fluency).text}
                                  </td>
                                </tr>
                              )}

                              {/* Receptive */}
                              {(diagComparisonData.facility_scores?.receptive != null || diagComparisonData.home_scores?.receptive != null) && (
                                <tr>
                                  <td className="metric-name">
                                    <span className="metric-icon" style={{ backgroundColor: '#2196F3' }}>👂</span>
                                    Receptive Language
                                  </td>
                                  <td className="score-cell">{diagComparisonData.facility_scores?.receptive != null ? `${diagComparisonData.facility_scores.receptive}%` : '—'}</td>
                                  <td className="score-cell">{diagComparisonData.home_scores?.receptive != null ? `${diagComparisonData.home_scores.receptive}%` : '—'}</td>
                                  <td className={`delta-cell ${getDeltaDisplay(diagComparisonData.deltas?.receptive).className}`}>
                                    <span className="delta-icon">{getDeltaDisplay(diagComparisonData.deltas?.receptive).icon}</span> {getDeltaDisplay(diagComparisonData.deltas?.receptive).text}
                                  </td>
                                </tr>
                              )}

                              {/* Expressive */}
                              {(diagComparisonData.facility_scores?.expressive != null || diagComparisonData.home_scores?.expressive != null) && (
                                <tr>
                                  <td className="metric-name">
                                    <span className="metric-icon" style={{ backgroundColor: '#2196F3' }}>🗣️</span>
                                    Expressive Language
                                  </td>
                                  <td className="score-cell">{diagComparisonData.facility_scores?.expressive != null ? `${diagComparisonData.facility_scores.expressive}%` : '—'}</td>
                                  <td className="score-cell">{diagComparisonData.home_scores?.expressive != null ? `${diagComparisonData.home_scores.expressive}%` : '—'}</td>
                                  <td className={`delta-cell ${getDeltaDisplay(diagComparisonData.deltas?.expressive).className}`}>
                                    <span className="delta-icon">{getDeltaDisplay(diagComparisonData.deltas?.expressive).icon}</span> {getDeltaDisplay(diagComparisonData.deltas?.expressive).text}
                                  </td>
                                </tr>
                              )}

                              {/* Gait */}
                              {(diagComparisonData.facility_scores?.gait?.overall_gait != null || diagComparisonData.home_scores?.gait?.overall_gait != null) && (
                                <tr>
                                  <td className="metric-name">
                                    <span className="metric-icon" style={{ backgroundColor: '#4CAF50' }}>🚶</span>
                                    Gait (Overall)
                                  </td>
                                  <td className="score-cell">{diagComparisonData.facility_scores?.gait?.overall_gait != null ? `${diagComparisonData.facility_scores.gait.overall_gait}%` : '—'}</td>
                                  <td className="score-cell">{diagComparisonData.home_scores?.gait?.overall_gait != null ? `${diagComparisonData.home_scores.gait.overall_gait}%` : '—'}</td>
                                  <td className={`delta-cell ${getDeltaDisplay(diagComparisonData.deltas?.gait).className}`}>
                                    <span className="delta-icon">{getDeltaDisplay(diagComparisonData.deltas?.gait).icon}</span> {getDeltaDisplay(diagComparisonData.deltas?.gait).text}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Visual Bar Chart */}
                      <div className="report-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">📈</span>
                            Visual Comparison
                          </h3>
                          <p className="report-card-subtitle">Facility (blue) vs. At-Home (green) performance</p>
                        </div>
                        <div className="report-card-body">
                          <div className="diag-bar-chart">
                            {[
                              { label: 'Fluency', facility: diagComparisonData.facility_scores?.fluency, home: diagComparisonData.home_scores?.fluency },
                              { label: 'Receptive', facility: diagComparisonData.facility_scores?.receptive, home: diagComparisonData.home_scores?.receptive },
                              { label: 'Expressive', facility: diagComparisonData.facility_scores?.expressive, home: diagComparisonData.home_scores?.expressive },
                              ...(diagComparisonData.facility_scores?.gait?.overall_gait != null || diagComparisonData.home_scores?.gait?.overall_gait != null
                                ? [{ label: 'Gait', facility: diagComparisonData.facility_scores?.gait?.overall_gait, home: diagComparisonData.home_scores?.gait?.overall_gait }]
                                : []),
                              ...['r', 's', 'l', 'th', 'k']
                                .filter(s => diagComparisonData.facility_scores?.articulation?.[s] != null || diagComparisonData.home_scores?.articulation?.[s] != null)
                                .map(s => ({
                                  label: `/${s.toUpperCase()}/`,
                                  facility: diagComparisonData.facility_scores?.articulation?.[s],
                                  home: diagComparisonData.home_scores?.articulation?.[s]
                                }))
                            ].filter(item => item.facility != null || item.home != null).map((item, idx) => (
                              <div key={idx} className="diag-bar-row">
                                <span className="diag-bar-label">{item.label}</span>
                                <div className="diag-bar-tracks">
                                  <div className="diag-bar-track">
                                    <div className="diag-bar-fill diag-bar-facility" style={{ width: `${item.facility || 0}%` }}>
                                      {item.facility != null && <span className="diag-bar-value">{item.facility}%</span>}
                                    </div>
                                  </div>
                                  <div className="diag-bar-track">
                                    <div className="diag-bar-fill diag-bar-home" style={{ width: `${item.home || 0}%` }}>
                                      {item.home != null && <span className="diag-bar-value">{item.home}%</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="diag-bar-legend">
                              <span className="diag-legend-item"><span className="diag-legend-dot diag-legend-facility"></span> Facility</span>
                              <span className="diag-legend-item"><span className="diag-legend-dot diag-legend-home"></span> At-Home</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Therapist Notes */}
                      {diagComparisonData.notes && (
                        <div className="report-card">
                          <div className="report-card-header">
                            <h3 className="report-card-title">
                              <span className="report-icon">📝</span>
                              Therapist Notes
                            </h3>
                          </div>
                          <div className="report-card-body">
                            <p className="diag-notes-text">{diagComparisonData.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Diagnostic History */}
                      {diagPatientDiagnostics.length > 0 && (
                        <div className="report-card">
                          <div className="report-card-header">
                            <h3 className="report-card-title">
                              <span className="report-icon">📋</span>
                              Assessment History
                            </h3>
                            <p className="report-card-subtitle">{diagPatientDiagnostics.length} assessment(s) on file</p>
                          </div>
                          <div className="report-card-body">
                            <div className="diag-history-list">
                              {diagPatientDiagnostics.map((diag) => (
                                <div key={diag._id} className="diag-history-item">
                                  <div className="diag-history-info">
                                    <span className="diag-history-date">{new Date(diag.assessment_date).toLocaleDateString()}</span>
                                    <span className={`diag-history-type diag-type-${diag.assessment_type}`}>
                                      {diag.assessment_type?.charAt(0).toUpperCase() + diag.assessment_type?.slice(1)}
                                    </span>
                                    <span className="diag-history-assessor">by {diag.assessor_name}</span>
                                  </div>
                                  <button
                                    className="diag-history-delete"
                                    onClick={() => handleDeleteDiagnostic(diag._id)}
                                    title="Delete this diagnostic"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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

      {/* Success Story Modal */}
      {showStoryModal && (
        <div className="modal-overlay" onClick={() => setShowStoryModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStory ? 'Edit Success Story' : 'Add New Success Story'}</h2>
              <button className="modal-close" onClick={() => setShowStoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Patient Name *</label>
                <input 
                  type="text" 
                  value={newStory.patientName}
                  onChange={(e) => setNewStory({ ...newStory, patientName: e.target.value })}
                  placeholder="Enter patient's name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Success Story *</label>
                <textarea 
                  value={newStory.story}
                  onChange={(e) => setNewStory({ ...newStory, story: e.target.value })}
                  placeholder="Share the patient's journey, challenges overcome, and achievements..."
                  rows={8}
                  required
                  style={{ resize: 'vertical', minHeight: '150px' }}
                />
              </div>

              <div className="form-group">
                <label>Upload Images</label>
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', width: '100%' }}
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '8px', display: 'block' }}>
                  Supported formats: PNG, JPG, JPEG, GIF, WebP. Max size: 5MB per image.
                </small>
              </div>

              {/* Image Preview */}
              {imagePreviewUrls.length > 0 && (
                <div className="form-group">
                  <label>Selected Images ({imagePreviewUrls.length})</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e0e0e0' }}>
                        <img 
                          src={url} 
                          alt={`Preview ${index + 1}`} 
                          style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: '1'
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Images (when editing) */}
              {editingStory && editingStory.images && editingStory.images.length > 0 && (
                <div className="form-group">
                  <label>Existing Images ({editingStory.images.length})</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    {editingStory.images.map((imagePath, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e0e0e0' }}>
                        <img 
                          src={`http://localhost:5000/${imagePath}`} 
                          alt={`Existing ${index + 1}`} 
                          style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => handleRemoveExistingImage(editingStory.id, imagePath)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: '1'
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowStoryModal(false)}>Cancel</button>
              <button 
                className="primary-btn" 
                onClick={editingStory ? handleUpdateStory : handleSaveStory}
              >
                {editingStory ? 'Update Story' : 'Add Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facility Diagnostic Modal */}
      {showDiagModal && (
        <div className="modal-overlay" onClick={() => setShowDiagModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Facility Diagnostic</h2>
              <button className="modal-close" onClick={() => setShowDiagModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="diag-modal-patient">Patient: <strong>{selectedDiagPatient?.firstName} {selectedDiagPatient?.lastName}</strong></p>

              <div className="form-row">
                <div className="form-group">
                  <label>Assessment Date</label>
                  <input
                    type="date"
                    value={newDiagnostic.assessment_date}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, assessment_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Assessment Type</label>
                  <select
                    value={newDiagnostic.assessment_type}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, assessment_type: e.target.value })}
                  >
                    <option value="initial">Initial</option>
                    <option value="follow_up">Follow-Up</option>
                    <option value="discharge">Discharge</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Severity Level</label>
                  <select
                    value={newDiagnostic.severity_level}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, severity_level: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <h4 className="diag-section-label">Articulation Scores (0–100)</h4>
              <div className="form-row">
                {['r', 's', 'l', 'th', 'k'].map(sound => (
                  <div className="form-group" key={sound}>
                    <label>/{sound.toUpperCase()}/ Sound</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="—"
                      value={newDiagnostic.articulation_scores[sound]}
                      onChange={(e) => setNewDiagnostic({
                        ...newDiagnostic,
                        articulation_scores: { ...newDiagnostic.articulation_scores, [sound]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>

              <h4 className="diag-section-label">Language & Fluency Scores (0–100)</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Fluency</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="—"
                    value={newDiagnostic.fluency_score}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, fluency_score: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Receptive Language</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="—"
                    value={newDiagnostic.receptive_score}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, receptive_score: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Expressive Language</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="—"
                    value={newDiagnostic.expressive_score}
                    onChange={(e) => setNewDiagnostic({ ...newDiagnostic, expressive_score: e.target.value })}
                  />
                </div>
              </div>

              <h4 className="diag-section-label">Gait Scores (0–100)</h4>
              <div className="form-row">
                {[
                  { key: 'stability_score', label: 'Stability' },
                  { key: 'gait_symmetry', label: 'Symmetry' },
                  { key: 'step_regularity', label: 'Regularity' },
                  { key: 'overall_gait', label: 'Overall Gait' }
                ].map(({ key, label }) => (
                  <div className="form-group" key={key}>
                    <label>{label}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="—"
                      value={newDiagnostic.gait_scores[key]}
                      onChange={(e) => setNewDiagnostic({
                        ...newDiagnostic,
                        gait_scores: { ...newDiagnostic.gait_scores, [key]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Clinical Notes</label>
                <textarea
                  rows="3"
                  placeholder="Observations, recommendations, etc."
                  value={newDiagnostic.notes}
                  onChange={(e) => setNewDiagnostic({ ...newDiagnostic, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowDiagModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSaveDiagnostic} disabled={savingDiagnostic}>
                {savingDiagnostic ? 'Saving...' : 'Save Diagnostic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TherapistDashboard;
