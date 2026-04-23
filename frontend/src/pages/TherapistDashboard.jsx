import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { therapistService, authService, fluencyExerciseService, languageExerciseService, receptiveExerciseService, articulationExerciseService, successStoryService, appointmentService, diagnosticComparisonService, detectionProblemsService, exerciseRecommendationsService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '../components/MedicalLoading';
import './TherapistDashboard.css';
import { generatePdfReport, PHYSICAL_THERAPY_METRICS_COLUMNS, buildGaitMetricsRows, generateDiagnosticComparisonPdf, generatePreEvalPdf, generateArticulationPdf, generateFluencyPdf, generateLanguagePdf, generatePhysicalTherapyPdf, generateTherapistReportsPdf } from '../components/PdfReportTemplate';
import DashboardOverview from '../components/DashboardOverview';
import SidebarDrawer from '../components/SidebarDrawer';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const REPORT_CATEGORY_OPTIONS = [
  { key: 'age', label: 'Age', icon: '👥' },
  { key: 'gender', label: 'Gender', icon: '⚧️' },
  { key: 'work', label: 'Work', icon: '💼' },
];

const REPORT_GENDER_META = {
  male: { label: 'Male', icon: '👨' },
  female: { label: 'Female', icon: '👩' },
  other: { label: 'Other', icon: '🧑' },
  'prefer-not-to-say': { label: 'Prefer not to say', icon: '❓' },
};

function SectionLoading({ children, className = '' }) {
  return (
    <div className={`therapist-loading-panel ${className}`.trim()} role="status" aria-live="polite">
      {children}
    </div>
  );
}

function LoadingCardGrid({ count = 4, height = '140px', className = '' }) {
  return (
    <div className={`therapist-loading-grid cards-${count} ${className}`.trim()}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} height={height} />
      ))}
    </div>
  );
}

function TherapistDashboard({ onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [speechDropdownOpen, setSpeechDropdownOpen] = useState(false);
  const [physicalDropdownOpen, setPhysicalDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSub, setActiveSub] = useState('receptive');
  const [therapyData, setTherapyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFluencyLevels, setShowFluencyLevels] = useState(false);
  const [fluencyExercises, setFluencyExercises] = useState({});
  const [editingExercise, setEditingExercise] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableFluencyOrders, setAvailableFluencyOrders] = useState([1]);
  const [loadingFluency, setLoadingFluency] = useState(false);
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
  const [loadingLanguage, setLoadingLanguage] = useState(false);
  
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
  const [loadingArticulation, setLoadingArticulation] = useState(false);
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
  const [speechEntries, setSpeechEntries] = useState([]);
  const [loadingSpeechEntries, setLoadingSpeechEntries] = useState(false);
  const [speechSearchTerm, setSpeechSearchTerm] = useState('');
  const [currentSpeechPage, setCurrentSpeechPage] = useState(1);
  const [speechEntriesPerPage, setSpeechEntriesPerPage] = useState(10);
  const [expandedSpeechRows, setExpandedSpeechRows] = useState({});
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set());
  const [recommendedExercises, setRecommendedExercises] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [recommendedSearchTerm, setRecommendedSearchTerm] = useState('');
  const [currentRecommendedPage, setCurrentRecommendedPage] = useState(1);
  const [recommendedEntriesPerPage, setRecommendedEntriesPerPage] = useState(10);
  const [updatingRecommendedIds, setUpdatingRecommendedIds] = useState(new Set());
  const [showRecommendedStatusControls, setShowRecommendedStatusControls] = useState(false);
  const [bulkUpdatingRecommendedVisibility, setBulkUpdatingRecommendedVisibility] = useState(false);

  // Success Stories state
  const [successStories, setSuccessStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [currentStoryPage, setCurrentStoryPage] = useState(1);
  const [storyEntriesPerPage, setStoryEntriesPerPage] = useState(5);
  const [storySearchTerm, setStorySearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [newStory, setNewStory] = useState({
    story: ''
  });

  // Reports state
  const [reportsData, setReportsData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeReportCategory, setActiveReportCategory] = useState('age');
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [exportingReports, setExportingReports] = useState(false);

  // Speech therapy analytics state (for PDF export)
  const [articulationAnalytics, setArticulationAnalytics] = useState(null);
  const [fluencyAnalytics, setFluencyAnalytics] = useState(null);
  const [languageAnalytics, setLanguageAnalytics] = useState(null);
  const [exportingArticulation, setExportingArticulation] = useState(false);
  const [exportingFluency, setExportingFluency] = useState(false);
  const [exportingLanguage, setExportingLanguage] = useState(false);

  // Diagnostic Comparison state
  const [diagComparisonData, setDiagComparisonData] = useState(null);
  const [diagPatientDiagnostics, setDiagPatientDiagnostics] = useState([]);
  const [diagComparisonHistory, setDiagComparisonHistory] = useState([]);
  const [loadingDiagComparison, setLoadingDiagComparison] = useState(false);
  const [patientSelfReport, setPatientSelfReport] = useState(null);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(null);
  const [diagSearchQuery, setDiagSearchQuery] = useState('');
  const [diagSearchResults, setDiagSearchResults] = useState([]);
  const [showDiagPatientDropdown, setShowDiagPatientDropdown] = useState(false);
  const [searchingDiagPatients, setSearchingDiagPatients] = useState(false);
  const [diagSearchError, setDiagSearchError] = useState(null);
  const diagSearchAbortRef = useRef(null);
  const [selectedDiagPatient, setSelectedDiagPatient] = useState(null);
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState(null);
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);

  // Pre-Evaluation tab state
  const [preEvalPatientList, setPreEvalPatientList] = useState([]);
  const [preEvalLoading, setPreEvalLoading] = useState(false);
  const [preEvalTableFilter, setPreEvalTableFilter] = useState('');
  const [preEvalModalEntry, setPreEvalModalEntry] = useState(null);
  const [preEvalEntriesPerPage, setPreEvalEntriesPerPage] = useState(10);
  const [preEvalCurrentPage, setPreEvalCurrentPage] = useState(1);
  const [showTrendChart, setShowTrendChart] = useState(false);
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
  const [currentAppointmentPage, setCurrentAppointmentPage] = useState(1);
  const [appointmentEntriesPerPage, setAppointmentEntriesPerPage] = useState(5);
  
  // Patient search autocomplete state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Detection Problems state
  const [detectionProblems, setDetectionProblems] = useState([]);
  const [loadingDetectionProblems, setLoadingDetectionProblems] = useState(false);
  const [showDPModal, setShowDPModal] = useState(false);
  const [editingDP, setEditingDP] = useState(null);
  const [dpSearchTerm, setDPSearchTerm] = useState('');
  const [currentDPPage, setCurrentDPPage] = useState(1);
  const [dpEntriesPerPage, setDPEntriesPerPage] = useState(10);
  const [newDP, setNewDP] = useState({
    name: '', category: '', description: '', severity_level: 'moderate',
    indicators: '', affected_area: '', normal_range: '', is_active: true
  });

  // Exercise Recommendations state
  const [exerciseRecs, setExerciseRecs] = useState([]);
  const [loadingExerciseRecs, setLoadingExerciseRecs] = useState(false);
  const [showERModal, setShowERModal] = useState(false);
  const [editingER, setEditingER] = useState(null);
  const [erSearchTerm, setERSearchTerm] = useState('');
  const [currentERPage, setCurrentERPage] = useState(1);
  const [erEntriesPerPage, setEREntriesPerPage] = useState(10);
  const [newER, setNewER] = useState({
    name: '', category: '', description: '', target_problems: '',
    difficulty_level: 'beginner', duration_minutes: 15, repetitions: 10,
    sets: 3, instructions: '', precautions: '', equipment_needed: '', is_active: true
  });

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
    let cancelled = false;
    if (activeTab === 'overview' && user) {
      loadOverviewStats();
    }
    return () => { cancelled = true; };
  }, [activeTab, user, selectedDays]);

  // Load exercises from database and group by level
  const loadFluencyExercises = async () => {
    setLoadingFluency(true);
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
    } finally {
      setLoadingFluency(false);
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
    setLoadingLanguage(true);
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
    } finally {
      setLoadingLanguage(false);
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
    setLoadingArticulation(true);
    try {
      const response = await articulationExerciseService.getAll();
      if (response.success) {
        setArticulationExercises(response.exercises_by_sound || {});
      }
    } catch (error) {
      console.error('Failed to load articulation exercises:', error);
    } finally {
      setLoadingArticulation(false);
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
    let cancelled = false;
    const stored = authService.getStoredUser();
    setUser(stored);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Load available orders when creating new exercise and sound/level changes
    if (showArticulationModal) {
      loadAvailableOrders(newArticulationExercise.sound_id, newArticulationExercise.level);
    }
    return () => { cancelled = true; };
  }, [showArticulationModal, newArticulationExercise.sound_id, newArticulationExercise.level]);

  useEffect(() => {
    let cancelled = false;
    // Load available orders when creating new fluency exercise and level changes
    if (showExerciseModal) {
      loadAvailableFluencyOrders(newExercise.level);
    }
    return () => { cancelled = true; };
  }, [showExerciseModal, newExercise.level]);

  useEffect(() => {
    let cancelled = false;
    // Load available orders when creating new language exercise and level changes
    if (showLanguageModal && activeSub === 'receptive') {
      loadAvailableLanguageOrders(newLanguageExercise.level);
    }
    return () => { cancelled = true; };
  }, [showLanguageModal, newLanguageExercise.level, activeSub]);

  useEffect(() => {
    let cancelled = false;
    // Load default overview stats via admin stats
    if (activeTab !== 'overview') return;
    loadOverview();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Auto-load all patients who completed the pre-evaluation wizard
  useEffect(() => {
    if (activeTab !== 'pre-evaluation') return;
    if (preEvalPatientList.length > 0) return; // already loaded
    let cancelled = false;
    setPreEvalLoading(true);
    diagnosticComparisonService.getAllCompletedEvaluations()
      .then((res) => {
        if (cancelled) return;
        const patients = res?.patients ?? [];
        setPreEvalPatientList(patients.map(p => ({ patient: p, selfReport: p.diagnosticData ?? null })));
        setPreEvalCurrentPage(1);
      })
      .catch((err) => {
        if (!cancelled) console.error('Pre-eval fetch error:', err);
      })
      .finally(() => {
        if (!cancelled) setPreEvalLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
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
    if (activeTab === 'speech-entries') loadSpeechEntries();
    if (activeTab === 'physical' || activeTab === 'most-common-problem') loadPhysical();
    if (activeTab === 'recommended-exercises') loadRecommendedExercises();
    if (activeTab === 'detection-problems') loadDetectionProblems();
    if (activeTab === 'exercise-recommendations') loadExerciseRecs();
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
    return () => { cancelled = true; };
  }, [activeTab, activeSub, showFluencyLevels, showLanguageLevels, showArticulationLevels]);

  const loadOverview = async () => {
    try {
      // Therapists don't have access to admin stats
      // Show a simple welcome message instead
      setTherapyData([
        { id: 'welcome', label: 'Welcome', value: 'Therapist Dashboard' },
        { id: 'info', label: 'Info', value: 'Use the sidebar to manage therapy exercises' },
      ]);
    } catch (e) {
      console.error('Failed to load overview', e);
    }
  };

  const loadArticulation = async () => {
    try {
      // Therapists don't have access to patient data
      // This is for managing exercises only
      setTherapyData([
        { id: 'info', label: 'Info', value: 'Exercise management coming soon' }
      ]);
    } catch (e) {
      console.error('Failed to load articulation', e);
      setTherapyData([]);
    }
  };

  const loadLanguage = async (mode) => {
    try {
      // Therapists don't have access to patient data
      setTherapyData([
        { id: 'info', label: 'Info', value: 'Exercise management coming soon' }
      ]);
    } catch (e) {
      console.error('Failed to load language', e);
      setTherapyData([]);
    }
  };

  const loadFluency = async () => {
    try {
      // Therapists don't have access to patient session data
      // They can only manage exercises via the Therapy Levels tab
      setTherapyData([]);
    } catch (e) {
      console.error('Failed to load fluency', e);
      setTherapyData([]);
    }
  };

  const loadPhysical = async () => {
    let cancelled = false;
    setLoadingPhysical(true);
    try {
      const response = await therapistService.getPhysicalPatients();
      if (!cancelled && response.success) {
        setGaitAnalyses(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load gait analyses', e);
      setGaitAnalyses([]);
    } finally {
      if (!cancelled) setLoadingPhysical(false);
    }
  };

  const loadSpeechEntries = async () => {
    let cancelled = false;
    setLoadingSpeechEntries(true);
    try {
      const response = await therapistService.getSpeechEntries(selectedDays, 1000);
      if (!cancelled && response.success) {
        setSpeechEntries(response.data || []);
      }
    } catch (e) {
      console.error('Failed to load speech entries', e);
      if (!cancelled) setSpeechEntries([]);
    } finally {
      if (!cancelled) setLoadingSpeechEntries(false);
    }
  };

  const loadRecommendedExercises = async () => {
    let cancelled = false;
    setLoadingRecommended(true);
    try {
      const response = await therapistService.getRecommendedExercises();
      if (!cancelled && response.success) {
        const rows = response.data || [];
        setRecommendedExercises(rows);
        setShowRecommendedStatusControls(rows.length > 0 && rows.every(row => (row.visibility || 'active') === 'active'));
      }
    } catch (e) {
      console.error('Failed to load recommended exercises', e);
      if (!cancelled) setRecommendedExercises([]);
    } finally {
      if (!cancelled) setLoadingRecommended(false);
    }
  };

  const handleUpdateRecommendedField = async (planId, field, value) => {
    const previousRows = recommendedExercises;
    setUpdatingRecommendedIds(prev => new Set([...prev, planId]));
    setRecommendedExercises(prev =>
      prev.map(row => (row.id === planId ? { ...row, [field]: value } : row))
    );

    try {
      const response = await therapistService.updateRecommendedExercise(planId, { [field]: value });
      if (!response.success) {
        setRecommendedExercises(previousRows);
        toast.error('Update failed. Please try again.');
      } else {
        toast.success(`${field === 'status' ? 'Status' : 'Visibility'} updated successfully.`);
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      setRecommendedExercises(previousRows);
      toast.error('Update failed. Please check your connection.');
    } finally {
      setUpdatingRecommendedIds(prev => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });
    }
  };

  const handleToggleRecommendedStatusControls = async (checked) => {
    const previousRows = recommendedExercises;
    const previousToggle = showRecommendedStatusControls;
    const nextVisibility = checked ? 'active' : 'hidden';
    const planIds = recommendedExercises.map(plan => plan.id);

    setShowRecommendedStatusControls(checked);
    setBulkUpdatingRecommendedVisibility(true);
    setRecommendedExercises(prev => prev.map(plan => ({ ...plan, visibility: nextVisibility })));

    if (!planIds.length) {
      setBulkUpdatingRecommendedVisibility(false);
      return;
    }

    try {
      const response = await therapistService.updateRecommendedExercisesVisibility(nextVisibility, planIds);
      if (!response.success) {
        setRecommendedExercises(previousRows);
        setShowRecommendedStatusControls(previousToggle);
        toast.error('Failed to update status display setting.');
      } else {
        toast.success(`Status display ${checked ? 'enabled' : 'hidden'} for recommended exercises.`);
      }
    } catch (error) {
      console.error('Failed to bulk update recommended exercise visibility:', error);
      setRecommendedExercises(previousRows);
      setShowRecommendedStatusControls(previousToggle);
      toast.error('Failed to update status display setting.');
    } finally {
      setBulkUpdatingRecommendedVisibility(false);
    }
  };

  const toggleGaitDetails = (id) => {
    setExpandedGaitRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleSpeechDetails = (id) => {
    setExpandedSpeechRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarDrawerOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }, [isMobile]);

  const closeSidebarDrawer = useCallback(() => {
    setSidebarDrawerOpen(false);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setTherapyData([]);
  }, []);

  const toggleSelectAnalysis = useCallback((id) => {
    setSelectedAnalysisIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback((pageIds) => {
    setSelectedAnalysisIds(prev => {
      const allSelected = pageIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...pageIds]);
    });
  }, []);

  const handleExportPhysicalPdf = useCallback(async () => {
    const selected = gaitAnalyses.filter(a => selectedAnalysisIds.has(a.id));
    if (!selected.length) return;

    const patients = selected.map(analysis => ({
      name: analysis.user_name,
      email: analysis.user_email,
      score: analysis.overall_score,
      severity: analysis.severity,
      date: formatDate(analysis.created_at),
      problem_details: analysis.problem_details ?? [],
      gait_score: analysis.gait_score ?? null,
      metricsRows: buildGaitMetricsRows(
        analysis.gait_metrics,
        analysis.analysis_duration,
        analysis.data_quality
      ),
    }));

    const uniqueNames = [...new Set(selected.map(a => a.user_name))];
    const namePart =
      uniqueNames.length === 1
        ? uniqueNames[0].replace(/\s+/g, '_')
        : 'Multiple_Patients';
    const filename = `CVAPed_PhysicalTherapyReport_${namePart}`;

    await generatePhysicalTherapyPdf({ patients, filename });
  }, [selectedAnalysisIds, gaitAnalyses]);

  const handleExportArticulationPdf = useCallback(async () => {
    setExportingArticulation(true);
    try {
      let analytics = articulationAnalytics;
      if (!analytics) {
        analytics = await therapistService.getArticulationAnalytics(selectedDays);
        setArticulationAnalytics(analytics);
      }
      await generateArticulationPdf({
        analytics,
        generatedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Therapist',
        filename: `CVAPed_Articulation_Analytics_${new Date().toISOString().split('T')[0]}`,
      });
    } catch (error) {
      console.error('Articulation PDF export failed:', error);
    } finally {
      setExportingArticulation(false);
    }
  }, [articulationAnalytics, selectedDays, user]);

  const handleExportFluencyPdf = useCallback(async () => {
    setExportingFluency(true);
    try {
      let analytics = fluencyAnalytics;
      if (!analytics) {
        analytics = await therapistService.getFluencyAnalytics(selectedDays);
        setFluencyAnalytics(analytics);
      }
      await generateFluencyPdf({
        analytics,
        generatedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Therapist',
        filename: `CVAPed_Fluency_Analytics_${new Date().toISOString().split('T')[0]}`,
      });
    } catch (error) {
      console.error('Fluency PDF export failed:', error);
    } finally {
      setExportingFluency(false);
    }
  }, [fluencyAnalytics, selectedDays, user]);

  const handleExportLanguagePdf = useCallback(async () => {
    setExportingLanguage(true);
    try {
      let analytics = languageAnalytics;
      if (!analytics) {
        analytics = await therapistService.getLanguageAnalytics(selectedDays);
        setLanguageAnalytics(analytics);
      }
      await generateLanguagePdf({
        analytics,
        generatedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Therapist',
        filename: `CVAPed_Language_Analytics_${new Date().toISOString().split('T')[0]}`,
      });
    } catch (error) {
      console.error('Language PDF export failed:', error);
    } finally {
      setExportingLanguage(false);
    }
  }, [languageAnalytics, selectedDays, user]);

  const handleExportDiagnosticPdf = useCallback(async () => {
    if (!selectedDiagPatient || !diagComparisonData) return;
    await generateDiagnosticComparisonPdf({
      comparisonData: diagComparisonData,
      patient: selectedDiagPatient,
    });
  }, [selectedDiagPatient, diagComparisonData]);

  const handleExportPreEvalPdf = useCallback(async (entry) => {
    if (!entry) return;
    const { patient, selfReport } = entry;
    await generatePreEvalPdf({ patient, selfReport });
  }, []);

  const getScoreColor = (score) => {    if (score >= 80) return '#4CAF50';
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

  const formatSpeechTherapyType = (type) => {
    if (type === 'receptive') return 'Language (Receptive)';
    if (type === 'expressive') return 'Language (Expressive)';
    if (type === 'articulation') return 'Articulation';
    if (type === 'fluency') return 'Fluency';
    return 'Language';
  };

  const renderSpeechDetails = (entry) => {
    let detailsGrid = [];

    if (entry.therapy_type === 'articulation') {
      detailsGrid = [
        { label: 'Sound', value: entry.details?.sound || 'N/A', highlight: true },
        { label: 'Target Word', value: entry.details?.target_word || 'N/A' },
        { label: 'Position', value: entry.details?.position || 'N/A' },
        { label: 'Score', value: typeof entry.score === 'number' ? `${entry.score}%` : 'N/A', highlight: true }
      ];
    } else if (entry.therapy_type === 'fluency') {
      detailsGrid = [
        { label: 'Exercise Type', value: entry.details?.exercise_type || 'N/A', highlight: true },
        { label: 'Instruction', value: entry.details?.instruction || 'N/A' },
        { label: 'Score', value: typeof entry.score === 'number' ? `${entry.score}%` : 'N/A', highlight: true }
      ];
    } else {
      detailsGrid = [
        { label: 'Exercise ID', value: entry.details?.exercise_id || 'N/A' },
        { label: 'Prompt', value: entry.details?.prompt || 'N/A', highlight: true },
        { label: 'Score', value: typeof entry.score === 'number' ? `${entry.score}%` : 'N/A', highlight: true }
      ];
    }

    return (
      <div className="speech-details-container">
        <div className="speech-details-header">
          <h4>
            <span className="speech-details-icon">🎤</span>
            Detailed Trial Information
          </h4>
          <span className="speech-details-score">
            {typeof entry.score === 'number' ? `${entry.score}% Accuracy` : 'No Score'}
          </span>
        </div>
        <div className="speech-details-grid">
          {detailsGrid.map((item, i) => (
            <div key={i} className="speech-detail-card">
              <span className="speech-detail-label">{item.label}</span>
              <p className={`speech-detail-value ${item.highlight ? 'highlight' : ''}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Success Stories Functions
  // ============= DETECTION PROBLEMS CRUD =============

  const loadDetectionProblems = async () => {
    setLoadingDetectionProblems(true);
    try {
      const response = await detectionProblemsService.getAll();
      if (response.success) setDetectionProblems(response.problems || []);
    } catch (e) {
      console.error('Failed to load detection problems', e);
      setDetectionProblems([]);
    } finally {
      setLoadingDetectionProblems(false);
    }
  };

  const resetDPForm = () => setNewDP({
    name: '', category: '', description: '', severity_level: 'moderate',
    indicators: '', affected_area: '', normal_range: '', is_active: true
  });

  const handleOpenDPCreate = () => {
    setEditingDP(null);
    resetDPForm();
    setShowDPModal(true);
  };

  const handleOpenDPEdit = (item) => {
    setEditingDP(item);
    setNewDP({
      name: item.name,
      category: item.category,
      description: item.description,
      severity_level: item.severity_level,
      indicators: (item.indicators || []).join(', '),
      affected_area: item.affected_area,
      normal_range: item.normal_range,
      is_active: item.is_active
    });
    setShowDPModal(true);
  };

  const handleSaveDP = async () => {
    if (!newDP.name.trim()) { alert('Name is required'); return; }
    const payload = {
      ...newDP,
      indicators: newDP.indicators.split(',').map(s => s.trim()).filter(Boolean)
    };
    try {
      let response;
      if (editingDP) {
        response = await detectionProblemsService.update(editingDP.problem_id, payload);
      } else {
        response = await detectionProblemsService.create(payload);
      }
      if (response.success) {
        setShowDPModal(false);
        loadDetectionProblems();
        alert(editingDP ? 'Detection problem updated!' : 'Detection problem created!');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Save failed');
    }
  };

  const handleDeleteDP = async (id) => {
    if (!window.confirm('Delete this detection problem?')) return;
    try {
      const response = await detectionProblemsService.delete(id);
      if (response.success) { loadDetectionProblems(); alert('Deleted successfully!'); }
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggleDP = async (id) => {
    try {
      const response = await detectionProblemsService.toggle(id);
      if (response.success) loadDetectionProblems();
    } catch (e) {
      alert(e.response?.data?.error || 'Toggle failed');
    }
  };

  const handleSeedDP = async () => {
    if (!window.confirm('Seed default detection problems?')) return;
    try {
      const response = await detectionProblemsService.seed();
      if (response.success) { loadDetectionProblems(); alert(`Seeded ${response.count} problems!`); }
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || 'Seed failed');
    }
  };

  // ============= EXERCISE RECOMMENDATIONS CRUD =============

  const loadExerciseRecs = async () => {
    setLoadingExerciseRecs(true);
    try {
      const response = await exerciseRecommendationsService.getAll();
      if (response.success) setExerciseRecs(response.exercises || []);
    } catch (e) {
      console.error('Failed to load exercise recommendations', e);
      setExerciseRecs([]);
    } finally {
      setLoadingExerciseRecs(false);
    }
  };

  const resetERForm = () => setNewER({
    name: '', category: '', description: '', target_problems: '',
    difficulty_level: 'beginner', duration_minutes: 15, repetitions: 10,
    sets: 3, instructions: '', precautions: '', equipment_needed: '', is_active: true
  });

  const handleOpenERCreate = () => {
    setEditingER(null);
    resetERForm();
    setShowERModal(true);
  };

  const handleOpenEREdit = (item) => {
    setEditingER(item);
    setNewER({
      name: item.name,
      category: item.category,
      description: item.description,
      target_problems: (item.target_problems || []).join(', '),
      difficulty_level: item.difficulty_level,
      duration_minutes: item.duration_minutes,
      repetitions: item.repetitions,
      sets: item.sets,
      instructions: (item.instructions || []).join('\n'),
      precautions: item.precautions,
      equipment_needed: (item.equipment_needed || []).join(', '),
      is_active: item.is_active
    });
    setShowERModal(true);
  };

  const handleSaveER = async () => {
    if (!newER.name.trim()) { alert('Name is required'); return; }
    const payload = {
      ...newER,
      target_problems: newER.target_problems.split(',').map(s => s.trim()).filter(Boolean),
      instructions: newER.instructions.split('\n').map(s => s.trim()).filter(Boolean),
      equipment_needed: newER.equipment_needed.split(',').map(s => s.trim()).filter(Boolean),
      duration_minutes: Number(newER.duration_minutes),
      repetitions: Number(newER.repetitions),
      sets: Number(newER.sets)
    };
    try {
      let response;
      if (editingER) {
        response = await exerciseRecommendationsService.update(editingER.exercise_id, payload);
      } else {
        response = await exerciseRecommendationsService.create(payload);
      }
      if (response.success) {
        setShowERModal(false);
        loadExerciseRecs();
        alert(editingER ? 'Exercise updated!' : 'Exercise created!');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Save failed');
    }
  };

  const handleDeleteER = async (id) => {
    if (!window.confirm('Delete this exercise recommendation?')) return;
    try {
      const response = await exerciseRecommendationsService.delete(id);
      if (response.success) { loadExerciseRecs(); alert('Deleted successfully!'); }
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggleER = async (id) => {
    try {
      const response = await exerciseRecommendationsService.toggle(id);
      if (response.success) loadExerciseRecs();
    } catch (e) {
      alert(e.response?.data?.error || 'Toggle failed');
    }
  };

  const handleSeedER = async () => {
    if (!window.confirm('Seed default exercise recommendations?')) return;
    try {
      const response = await exerciseRecommendationsService.seed();
      if (response.success) { loadExerciseRecs(); alert(`Seeded ${response.count} exercises!`); }
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || 'Seed failed');
    }
  };

  const loadSuccessStories = async () => {
    let cancelled = false;
    console.log('✨ Loading success stories...');
    setLoadingStories(true);
    try {
      const response = await successStoryService.getAll();
      console.log('Success stories response:', response);
      if (!cancelled && response.success) {
        setSuccessStories(response.data || []);
        console.log('Success stories loaded:', response.data?.length || 0);
      }
    } catch (e) {
      console.error('Failed to load success stories', e);
      setSuccessStories([]);
    } finally {
      if (!cancelled) setLoadingStories(false);
    }
  };

  // Diagnostic Comparison Functions
  useEffect(() => {
    if (!diagSearchQuery || diagSearchQuery.trim().length < 2) {
      setDiagSearchResults([]);
      setDiagSearchError(null);
      setShowDiagPatientDropdown(false);
      return;
    }

    const query = diagSearchQuery.trim();

    const runSearch = async () => {
      diagSearchAbortRef.current?.abort();
      diagSearchAbortRef.current = new AbortController();
      const { signal } = diagSearchAbortRef.current;

      setSearchingDiagPatients(true);
      setDiagSearchError(null);
      try {
        const response = await appointmentService.therapist.searchPatients(query, 10, signal);
        if (signal.aborted) return;
        if (response.success) {
          setDiagSearchResults(response.patients || []);
          setShowDiagPatientDropdown(true);
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
        console.error('Error searching patients:', error);
        setDiagSearchError('Failed to search patients. Please try again.');
        setDiagSearchResults([]);
        setShowDiagPatientDropdown(true);
      } finally {
        if (!signal.aborted) setSearchingDiagPatients(false);
      }
    };

    const timeoutId = setTimeout(runSearch, 400);
    return () => {
      clearTimeout(timeoutId);
      diagSearchAbortRef.current?.abort();
    };
  }, [diagSearchQuery]);

  const selectDiagPatient = async (patient) => {
    setSelectedDiagPatient(patient);
    setDiagSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setShowDiagPatientDropdown(false);
    // Load comparison data for this patient
    await loadDiagComparison(patient._id || patient.id);
  };

  const loadDiagComparison = async (userId, diagnosticId = null) => {
    setLoadingDiagComparison(true);
    setPatientSelfReport(null);
    try {
      const [comparisonRes, diagnosticsRes, historyRes, selfReportRes] = await Promise.all([
        diagnosticComparisonService.getComparison(userId, diagnosticId),
        diagnosticComparisonService.getDiagnostics(userId),
        diagnosticComparisonService.getComparisonHistory(userId),
        diagnosticComparisonService.getPatientSelfReport(userId).catch(() => null)
      ]);
      console.log('📊 Diagnostic Comparison Response:', comparisonRes);
      console.log('📊 Facility Scores:', comparisonRes?.facility_scores);
      console.log('📊 Home Scores:', comparisonRes?.home_scores);
      console.log('📊 Deltas:', comparisonRes?.deltas);
      setDiagComparisonData(comparisonRes);
      setDiagPatientDiagnostics(diagnosticsRes.diagnostics || []);
      setDiagComparisonHistory(historyRes.history || []);
      setPatientSelfReport(selfReportRes?.selfReport ?? null);
    } catch (error) {
      console.error('Error loading diagnostic comparison:', error);
      setDiagComparisonData(null);
      setDiagPatientDiagnostics([]);
      setDiagComparisonHistory([]);
      setPatientSelfReport(null);
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
    try {
      const response = await diagnosticComparisonService.deleteDiagnostic(diagnosticId);
      if (response.success) {
        setShowDeleteConfirmModal(null);
        await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id);
      }
    } catch (error) {
      console.error('Error deleting diagnostic:', error);
      alert('Failed to delete diagnostic');
      setShowDeleteConfirmModal(null);
    }
  };

  const getDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined) return { text: 'N/A', className: 'delta-na', icon: '—' };
    if (delta > 0) return { text: `+${delta}%`, className: 'delta-positive', icon: '▲' };
    if (delta < 0) return { text: `${delta}%`, className: 'delta-negative', icon: '▼' };
    return { text: '0%', className: 'delta-neutral', icon: '—' };
  };

  const getScoreBand = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', className: 'band-na' };
    if (score >= 86) return { label: 'Mastered', className: 'band-mastered' };
    if (score >= 71) return { label: 'Functional', className: 'band-functional' };
    if (score >= 51) return { label: 'Mild', className: 'band-mild' };
    if (score >= 31) return { label: 'Moderate', className: 'band-moderate' };
    return { label: 'Severe', className: 'band-severe' };
  };

  const getAlertBadge = (delta, homeVal) => {
    if (delta === null || delta === undefined) {
      if (homeVal != null) return { text: 'At-Home Only', className: 'alert-home-only', icon: '🏠' };
      return { text: 'No Data', className: 'alert-nodata', icon: '📋' };
    }
    if (delta >= 20) return { text: 'Significant Progress', className: 'alert-great', icon: '🎉' };
    if (delta >= 5) return { text: 'Improving', className: 'alert-good', icon: '📈' };
    if (delta >= -3) return { text: 'Stable', className: 'alert-stable', icon: '➡️' };
    if (delta >= -10) return { text: 'Slight Decline', className: 'alert-caution', icon: '⚠️' };
    return { text: 'Regression', className: 'alert-warning', icon: '🚨' };
  };

  const handleSelectAssessment = async (diagnosticId) => {
    setSelectedDiagnosticId(diagnosticId);
    await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id, diagnosticId);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Reports Functions
  const loadReports = async () => {
    let cancelled = false;
    setLoadingReports(true);
    try {
      const response = await therapistService.getReports();
      if (!cancelled && response.success) {
        setReportsData(response.data || null);
      }
    } catch (e) {
      console.error('Failed to load reports', e);
      setReportsData(null);
    } finally {
      if (!cancelled) setLoadingReports(false);
    }
  };

  // Appointments Functions
  const loadAppointments = async () => {
    let cancelled = false;
    setLoadingAppointments(true);
    try {
      const response = await appointmentService.therapist.getAppointments(appointmentFilters);
      if (!cancelled && response.success) {
        // Sort appointments: Cancelled and No Show at the bottom
        const sortedAppointments = (response.appointments || []).sort((a, b) => {
          const isABottom = a.status === 'cancelled' || a.status === 'no-show';
          const isBBottom = b.status === 'cancelled' || b.status === 'no-show';
          
          if (isABottom && !isBBottom) return 1;
          if (!isABottom && isBBottom) return -1;
          
          // If both are in the same group, sort by date (newest first)
          return new Date(b.appointment_date) - new Date(a.appointment_date);
        });
        setAppointments(sortedAppointments);
      }
    } catch (e) {
      console.error('Failed to load appointments', e);
      setAppointments([]);
    } finally {
      if (!cancelled) setLoadingAppointments(false);
    }
  };

  const loadUnassignedAppointments = async () => {
    let cancelled = false;
    setLoadingUnassigned(true);
    try {
      const response = await appointmentService.therapist.getUnassignedAppointments();
      if (!cancelled && response.success) {
        setUnassignedAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error('Error loading unassigned appointments:', error);
    } finally {
      if (!cancelled) setLoadingUnassigned(false);
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

      // Validate date and time
      const selectedDate = new Date(newAppointment.appointment_date);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Check if day is Monday (1), Wednesday (3), or Friday (5)
      if (dayOfWeek !== 1 && dayOfWeek !== 3 && dayOfWeek !== 5) {
        alert('Appointments can only be scheduled on Monday, Wednesday, or Friday.');
        return;
      }

      // Check if time is between 8:00 AM and 5:00 PM
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      
      if (hours < 8 || hours > 17 || (hours === 17 && minutes > 0)) {
        alert('Appointments can only be scheduled between 8:00 AM and 5:00 PM.');
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
    // Prevent editing cancelled or no-show appointments
    if (appointment.status === 'cancelled' || appointment.status === 'no-show') {
      alert('Cannot edit cancelled or no-show appointments. Please view details instead.');
      return;
    }
    
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
      story: ''
    });
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setShowStoryModal(true);
  };

  const handleSaveStory = async () => {
    try {
      // Validation
      if (!newStory.story.trim()) {
        alert('Success story content is required');
        return;
      }

      // Create FormData
      const formData = new FormData();
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
        alert(response.warnings ? `Success story added with warnings. ${response.warnings}` : 'Success story added successfully!');
      }
    } catch (error) {
      console.error('Failed to add success story:', error);
      alert(error.response?.data?.message || 'Failed to add success story');
    }
  };

  const handleEditStory = (story) => {
    setEditingStory(story);
    setNewStory({
      story: story.story
    });
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setShowStoryModal(true);
  };

  const handleUpdateStory = async () => {
    try {
      // Validation
      if (!newStory.story.trim()) {
        alert('Success story content is required');
        return;
      }

      // Create FormData
      const formData = new FormData();
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
        alert(response.warnings ? `Success story updated with warnings. ${response.warnings}` : 'Success story updated successfully!');
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

  const mostCommonProblemStats = useMemo(() => {
    const problemMap = new Map();

    gaitAnalyses.forEach((analysis) => {
      const problems = Array.isArray(analysis.problems) ? analysis.problems : [];

      problems.forEach((rawProblem) => {
        const normalized = String(rawProblem || '').trim().toLowerCase();
        if (!normalized) return;

        const existing = problemMap.get(normalized) || {
          key: normalized,
          label: normalized.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
          count: 0,
          patientKeys: new Set(),
        };

        existing.count += 1;
        const patientKey = analysis.user_email || analysis.user_name || analysis.id;
        if (patientKey) existing.patientKeys.add(patientKey);

        problemMap.set(normalized, existing);
      });
    });

    const ranked = Array.from(problemMap.values())
      .map(item => ({ ...item, patientCount: item.patientKeys.size }))
      .sort((a, b) => b.count - a.count || b.patientCount - a.patientCount || a.label.localeCompare(b.label));

    const totalMentions = ranked.reduce((sum, item) => sum + item.count, 0);

    return {
      ranked,
      totalMentions,
      uniqueProblems: ranked.length,
    };
  }, [gaitAnalyses]);

  const activeReportData = reportsData?.categories?.[activeReportCategory] || null;
  const reportTherapyPanels = useMemo(() => {
    if (!activeReportData?.byTherapy) return [];
    return ['speech', 'physical']
      .map((therapyKey) => activeReportData.byTherapy[therapyKey])
      .filter(Boolean);
  }, [activeReportData]);

  const getReportItemLabel = (item) => item.label || item.range || item.gender || item.key || 'Unknown';

  const overallReportItems = useMemo(() => {
    if (activeReportCategory === 'age') {
      return reportsData?.ageBrackets || [];
    }

    if (activeReportCategory === 'gender') {
      return reportsData?.genderDistribution || [];
    }

    if (!activeReportData?.byTherapy) return [];

    const aggregateMap = new Map();

    Object.values(activeReportData.byTherapy).forEach((panel) => {
      (panel?.items || []).forEach((item) => {
        const existing = aggregateMap.get(item.key) || {
          key: item.key,
          label: getReportItemLabel(item),
          count: 0,
        };

        existing.count += item.count || 0;
        aggregateMap.set(item.key, existing);
      });
    });

    const total = Array.from(aggregateMap.values()).reduce((sum, item) => sum + item.count, 0);

    return Array.from(aggregateMap.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [activeReportCategory, activeReportData, reportsData]);

  const getReportItemsForDisplay = (items = []) => {
    if (activeReportCategory === 'age') return items;
    return items.filter(item => item.count > 0);
  };

  const getProblemGenderMeta = (genderKey) => REPORT_GENDER_META[genderKey] || { label: genderKey, icon: '❓' };

  const handleExportReportsPdf = useCallback(async () => {
    if (!reportsData || !activeReportData) return;

    setExportingReports(true);
    try {
      await generateTherapistReportsPdf({
        reportTitle: `${activeReportData.title || 'Therapist'} Reports`,
        reportDescription: activeReportData.description || 'Therapist demographic report.',
        categoryLabel: activeReportData.title || 'Report',
        summaryStats: [
          { label: 'Total Patients', value: reportsData.totalPatients || 0 },
          { label: 'Speech Therapy', value: reportsData.therapyTotals?.speech?.totalPatients || 0 },
          { label: 'Physical Therapy', value: reportsData.therapyTotals?.physical?.totalPatients || 0 },
        ],
        overallItems: overallReportItems,
        therapyPanels: reportTherapyPanels.map((panel) => ({
          ...panel,
          items: getReportItemsForDisplay(panel.items || []),
        })),
        detectedProblems: activeReportCategory === 'gender' ? (activeReportData.detectedProblems || []) : [],
        generatedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Therapist',
        filename: `CVAPed_${(activeReportData.title || 'Report').replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}`,
      });
      toast.success(`${activeReportData.title || 'Report'} PDF exported successfully.`);
    } catch (error) {
      console.error('Reports PDF export failed:', error);
      toast.error('Failed to export report PDF. Please try again.');
    } finally {
      setExportingReports(false);
    }
  }, [activeReportCategory, activeReportData, overallReportItems, reportTherapyPanels, reportsData, toast, user]);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-wrapper">
        <header className="admin-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="navbar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarDrawerOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarDrawerOpen}
              aria-controls="therapist-sidebar-drawer"
            >
              <span className="toggle-icon">{sidebarDrawerOpen ? '×' : '☰'}</span>
            </button>
            <div className="navbar-brand">
              <img src={images.logo} alt="CVAPed" className="navbar-logo" />
              <div className="brand-content">
                <span className="brand-name">CVAPed</span>
                <span className="brand-subtitle">Therapist Dashboard</span>
              </div>
            </div>
          </div>
          
          <div className="navbar-right">
            <button className="navbar-btn facility-btn" onClick={() => {
              localStorage.setItem('therapistToken', localStorage.getItem('token') || '');
              localStorage.setItem('therapistUser', localStorage.getItem('user') || '');
              localStorage.setItem('facilityMode', 'true');
              navigate('/facility-login');
            }}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Facility Mode</span>
            </button>
            <button className="navbar-btn logout-btn" onClick={onLogout}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="dashboard-main">
          <SidebarDrawer
            isOpen={sidebarDrawerOpen}
            onClose={closeSidebarDrawer}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            activeReportCategory={activeReportCategory}
            onReportCategoryChange={setActiveReportCategory}
            speechDropdownOpen={speechDropdownOpen}
            onSpeechDropdownToggle={() => setSpeechDropdownOpen(prev => !prev)}
            physicalDropdownOpen={physicalDropdownOpen}
            onPhysicalDropdownToggle={() => setPhysicalDropdownOpen(prev => !prev)}
            reportsDropdownOpen={reportsDropdownOpen}
            onReportsDropdownToggle={() => setReportsDropdownOpen(prev => !prev)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            isMobile={isMobile}
          />

          <main className="admin-main">
            <div className="admin-content">
          {activeTab === 'overview' && (
            <DashboardOverview
              overviewStats={overviewStats}
              reportsData={overviewStats?.demographics || reportsData}
              selectedDays={selectedDays}
              setSelectedDays={setSelectedDays}
              loadingStats={loadingStats}
              loadingReports={loadingReports}
              user={user}
            />
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
                    <button
                      className="btn-primary"
                      onClick={handleExportArticulationPdf}
                      disabled={exportingArticulation}
                    >
                      {exportingArticulation ? '⏳ Generating...' : '📄 Export PDF'}
                    </button>
                  </div>
                </div>

                {loadingArticulation ? (
                  <div className="datatable-container">
                    <SectionLoading>
                      <LoadingCardGrid count={3} height="120px" />
                    </SectionLoading>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
            </div>
          )}

          {activeTab === 'physical' && (
            <div className="physical-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Physical Therapy</h2>
                  <p>Monitor and review patient gait analyses</p>
                </div>
                <div className="header-right">
                  <button
                    className={`btn-export-pdf${selectedAnalysisIds.size === 0 ? ' disabled' : ''}`}
                    onClick={handleExportPhysicalPdf}
                    disabled={selectedAnalysisIds.size === 0}
                    title={selectedAnalysisIds.size === 0 ? 'Select at least one record to export' : `Export ${selectedAnalysisIds.size} selected record${selectedAnalysisIds.size > 1 ? 's' : ''} to PDF`}
                  >
                    <span className="btn-export-icon">⬇</span>
                    Export to PDF
                    {selectedAnalysisIds.size > 0 && (
                      <span className="btn-export-count">{selectedAnalysisIds.size}</span>
                    )}
                  </button>
                </div>
              </div>

              {loadingPhysical ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <LoadingCardGrid count={4} height="120px" />
                  </SectionLoading>
                </div>
              ) : gaitAnalyses.length === 0 ? (
                <div className="datatable-container">
                  <div className="no-data-message">
                    <span className="no-data-icon">🚶</span>
                    <h3>No Gait Analyses Found</h3>
                    <p>Gait analyses will appear here after patients perform them.</p>
                  </div>
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

                  <div className="datatable-container">
                    <table className="logs-table gait-table">
                      <thead>
                        <tr>
                          <th className="gait-col-checkbox">
                            {(() => {
                              const filteredIds = gaitAnalyses
                                .filter(a =>
                                  !searchTerm ||
                                  a.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  a.user_email.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(a => a.id);
                              const pageStart = (currentGaitPage - 1) * gaitEntriesPerPage;
                              const pageIds = filteredIds.slice(pageStart, pageStart + gaitEntriesPerPage);
                              const allChecked = pageIds.length > 0 && pageIds.every(id => selectedAnalysisIds.has(id));
                              return (
                                <input
                                  type="checkbox"
                                  className="gait-checkbox"
                                  checked={allChecked}
                                  onChange={() => toggleSelectAllOnPage(pageIds)}
                                  title={allChecked ? 'Deselect all on this page' : 'Select all on this page'}
                                />
                              );
                            })()}
                          </th>
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
                              <tr className={`gait-row${selectedAnalysisIds.has(analysis.id) ? ' gait-row-selected' : ''}`}>
                                <td className="gait-col-checkbox">
                                  <input
                                    type="checkbox"
                                    className="gait-checkbox"
                                    checked={selectedAnalysisIds.has(analysis.id)}
                                    onChange={() => toggleSelectAnalysis(analysis.id)}
                                  />
                                </td>
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
                                  <td colSpan="7">
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
                </div>
              )}
            </div>
          )}

          {activeTab === 'most-common-problem' && (
            <div className="physical-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Most Common Problem</h2>
                  <p>Top detected gait problems ranked by how often they were recommended from patient analyses.</p>
                </div>
              </div>

              {loadingPhysical ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <SkeletonChart type="bar" height={220} />
                  </SectionLoading>
                </div>
              ) : mostCommonProblemStats.ranked.length === 0 ? (
                <div className="datatable-container">
                  <div className="no-data-message">
                    <span className="no-data-icon">📌</span>
                    <h3>No Ranked Problems Yet</h3>
                    <p>Rankings will appear after gait analyses detect patient problems.</p>
                  </div>
                </div>
              ) : (
                <div className="gait-analyses-container">
                  <div className="controls-section">
                    <div className="control-group common-problem-summary">
                      <span className="stat-item">
                        <strong>{gaitAnalyses.length}</strong> Total Analyses
                      </span>
                      <span className="stat-item">
                        <strong>{mostCommonProblemStats.uniqueProblems}</strong> Unique Problems
                      </span>
                      <span className="stat-item">
                        <strong>{mostCommonProblemStats.totalMentions}</strong> Total Recommendations
                      </span>
                    </div>
                  </div>

                  <div className="datatable-container">
                    <table className="logs-table common-problem-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Detected Problem</th>
                          <th>Times Recommended</th>
                          <th>Patients Affected</th>
                          <th>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostCommonProblemStats.ranked.map((problem, index) => {
                          const share = mostCommonProblemStats.totalMentions
                            ? ((problem.count / mostCommonProblemStats.totalMentions) * 100).toFixed(1)
                            : '0.0';

                          return (
                            <tr key={problem.key}>
                              <td>
                                <span className={`common-rank-badge rank-${index + 1}`}>
                                  #{index + 1}
                                </span>
                              </td>
                              <td>
                                <strong>{problem.label}</strong>
                              </td>
                              <td>{problem.count}</td>
                              <td>{problem.patientCount}</td>
                              <td>{share}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'speech-entries' && (
            <div className="physical-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Speech Entries</h2>
                  <p>View all patient speech trial records across articulation, language, and fluency.</p>
                </div>
              </div>

              <div className="gait-analyses-container">
                <div className="controls-section">
                  <div className="control-group">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search by patient name, email, or therapy type..."
                        value={speechSearchTerm}
                        onChange={(e) => {
                          setSpeechSearchTerm(e.target.value);
                          setCurrentSpeechPage(1);
                        }}
                        className="search-input"
                      />
                    </div>
                    <div className="pagination-controls">
                      <label className="entries-label">
                        Show:
                        <select
                          value={speechEntriesPerPage}
                          onChange={(e) => {
                            setSpeechEntriesPerPage(Number(e.target.value));
                            setCurrentSpeechPage(1);
                          }}
                          className="entries-select"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                        entries
                      </label>
                    </div>
                    <div className="stats-summary">
                      <span className="stat-item">
                        <strong>{speechEntries.length}</strong> Total Speech Entries
                      </span>
                    </div>
                  </div>
                </div>

                <div className="datatable-container">
                  {loadingSpeechEntries ? (
                    <SectionLoading>
                      <SkeletonTable rows={5} cols={6} />
                    </SectionLoading>
                  ) : speechEntries.length === 0 ? (
                    <div className="no-data-message">
                      <span className="no-data-icon">🎤</span>
                      <h3>No Speech Entries Found</h3>
                      <p>Speech entries will appear here once patients complete speech exercises.</p>
                    </div>
                  ) : (
                    <div>
                      <table className="logs-table gait-table">
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Email</th>
                          <th>Therapy Type</th>
                          <th>Level</th>
                          <th>Score</th>
                          <th>Date & Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const term = speechSearchTerm.trim().toLowerCase();
                          const filteredEntries = speechEntries.filter((entry) => {
                            if (!term) return true;
                            return (
                              (entry.user_name || '').toLowerCase().includes(term) ||
                              (entry.user_email || '').toLowerCase().includes(term) ||
                              formatSpeechTherapyType(entry.therapy_type).toLowerCase().includes(term)
                            );
                          });

                          const indexOfLastEntry = currentSpeechPage * speechEntriesPerPage;
                          const indexOfFirstEntry = indexOfLastEntry - speechEntriesPerPage;
                          const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);

                          return currentEntries.map((entry) => (
                            <React.Fragment key={entry.id}>
                              <tr>
                                <td>
                                  <div className="patient-cell">
                                    <div className="patient-avatar-small">
                                      {(entry.user_name || 'P').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <span className="patient-name-text">{entry.user_name || 'Unknown Patient'}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="email-text">{entry.user_email || 'N/A'}</span>
                                </td>
                                <td>
                                  <span className="therapy-type-badge" data-type={entry.therapy_type === 'receptive' || entry.therapy_type === 'expressive' ? 'language' : entry.therapy_type}>
                                    {formatSpeechTherapyType(entry.therapy_type)}
                                  </span>
                                </td>
                                <td>{entry.level || 'N/A'}</td>
                                <td>
                                  <span className="score-number">{typeof entry.score === 'number' ? `${entry.score}%` : 'N/A'}</span>
                                </td>
                                <td>
                                  <div className="date-cell-container">
                                    <span className="date-cell">{entry.entry_at ? formatDate(entry.entry_at) : 'N/A'}</span>
                                    <button
                                      className={`gait-dropdown-btn ${expandedSpeechRows[entry.id] ? 'expanded' : ''}`}
                                      onClick={() => toggleSpeechDetails(entry.id)}
                                      title={expandedSpeechRows[entry.id] ? 'Hide details' : 'Show details'}
                                    >
                                      ▼
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expandedSpeechRows[entry.id] && (
                                <tr className="gait-details-row">
                                  <td colSpan="6" style={{ padding: 0 }}>
                                    {renderSpeechDetails(entry)}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ));
                        })()}
                      </tbody>
                    </table>

                    {(() => {
                      const term = speechSearchTerm.trim().toLowerCase();
                      const filteredEntries = speechEntries.filter((entry) => {
                        if (!term) return true;
                        return (
                          (entry.user_name || '').toLowerCase().includes(term) ||
                          (entry.user_email || '').toLowerCase().includes(term) ||
                          formatSpeechTherapyType(entry.therapy_type).toLowerCase().includes(term)
                        );
                      });

                      const totalPages = Math.ceil(filteredEntries.length / speechEntriesPerPage);
                      if (totalPages <= 1) return null;

                      const indexOfLastEntry = currentSpeechPage * speechEntriesPerPage;
                      const indexOfFirstEntry = indexOfLastEntry - speechEntriesPerPage + 1;
                      const actualLastEntry = Math.min(indexOfLastEntry, filteredEntries.length);

                      return (
                        <div className="pagination-footer">
                          <div className="pagination-info">
                            Showing {indexOfFirstEntry} to {actualLastEntry} of {filteredEntries.length} entries
                          </div>
                          <div className="pagination-buttons">
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentSpeechPage(1)}
                              disabled={currentSpeechPage === 1}
                            >
                              «
                            </button>
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentSpeechPage(prev => Math.max(1, prev - 1))}
                              disabled={currentSpeechPage === 1}
                            >
                              ‹
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentSpeechPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentSpeechPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentSpeechPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  className={`pagination-btn ${currentSpeechPage === pageNum ? 'active' : ''}`}
                                  onClick={() => setCurrentSpeechPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentSpeechPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentSpeechPage === totalPages}
                            >
                              ›
                            </button>
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentSpeechPage(totalPages)}
                              disabled={currentSpeechPage === totalPages}
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
              </div>
            </div>
          )}

        {activeTab === 'recommended-exercises' && (
            <div className="physical-section recommended-exercises-section">
              <div className="gait-analyses-container">
                <div className="controls-section">
                  <div className="control-group">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search by patient name or email..."
                        value={recommendedSearchTerm}
                        onChange={(e) => {
                          setRecommendedSearchTerm(e.target.value);
                          setCurrentRecommendedPage(1);
                        }}
                        className="search-input"
                      />
                    </div>
                    <div className="pagination-controls">
                      <label className="entries-label">
                        Show:
                        <select
                          value={recommendedEntriesPerPage}
                          onChange={(e) => {
                            setRecommendedEntriesPerPage(Number(e.target.value));
                            setCurrentRecommendedPage(1);
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
                        <strong>{recommendedExercises.length}</strong> Total Plans
                      </span>
                    </div>
                    <div className="recommended-status-toggle-bar" title="Status controls visibility">
                      <span className="recommended-status-toggle-label">Status Mode</span>
                      <label className="recommended-toggle-switch">
                        <input
                          type="checkbox"
                          checked={showRecommendedStatusControls}
                          disabled={bulkUpdatingRecommendedVisibility}
                          onChange={(e) => handleToggleRecommendedStatusControls(e.target.checked)}
                        />
                        <span className="recommended-toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="datatable-container">
                  {loadingRecommended ? (
                    <SectionLoading>
                      <SkeletonTable rows={5} cols={4} />
                    </SectionLoading>
                  ) : recommendedExercises.length === 0 ? (
                    <div className="no-data-message">
                      <span className="no-data-icon">🧩</span>
                      <h3>No Recommended Exercises Yet</h3>
                      <p>Recommended exercises will appear after gait analyses create exercise plans.</p>
                    </div>
                  ) : (
                    <table className={`logs-table gait-table recommended-table ${showRecommendedStatusControls ? 'status-visible' : ''}`}>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Session</th>
                          <th>Recommended</th>
                          {showRecommendedStatusControls && <th>Status</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredPlans = recommendedExercises.filter(plan =>
                            !recommendedSearchTerm ||
                            plan.user_name.toLowerCase().includes(recommendedSearchTerm.toLowerCase()) ||
                            plan.user_email.toLowerCase().includes(recommendedSearchTerm.toLowerCase())
                          );

                          const indexOfLastEntry = currentRecommendedPage * recommendedEntriesPerPage;
                          const indexOfFirstEntry = indexOfLastEntry - recommendedEntriesPerPage;
                          const currentEntries = filteredPlans.slice(indexOfFirstEntry, indexOfLastEntry);

                          return currentEntries.map((plan) => {
                            const isUpdating = updatingRecommendedIds.has(plan.id);
                            const exercises = Array.isArray(plan.exercises) ? plan.exercises : [];
                            const primaryExercise = exercises[0]?.exercise_name || 'No exercise';
                            return (
                              <tr key={plan.id}>
                                <td>
                                  <span className="recommended-patient-name">{plan.user_name}</span>
                                </td>
                                <td><span className="date-cell">{formatDate(plan.session_created_at)}</span></td>
                                <td>
                                  <div className="recommended-main-cell">
                                    <span className="recommended-main-title">{primaryExercise}</span>
                                    <span className="recommended-main-meta">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </td>
                                {showRecommendedStatusControls && (
                                <td>
                                  <select
                                    className="recommended-select"
                                    value={plan.status || 'ongoing'}
                                    disabled={isUpdating}
                                    onChange={(e) => handleUpdateRecommendedField(plan.id, 'status', e.target.value)}
                                  >
                                    <option value="ongoing">Ongoing</option>
                                    <option value="done">Done</option>
                                  </select>
                                </td>
                                )}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  )}

                  {recommendedExercises.length > 0 && (() => {
                      const filteredPlans = recommendedExercises.filter(plan =>
                        !recommendedSearchTerm ||
                        plan.user_name.toLowerCase().includes(recommendedSearchTerm.toLowerCase()) ||
                        plan.user_email.toLowerCase().includes(recommendedSearchTerm.toLowerCase())
                      );
                      const totalPages = Math.ceil(filteredPlans.length / recommendedEntriesPerPage);
                      if (totalPages <= 1) return null;

                      const indexOfLastEntry = currentRecommendedPage * recommendedEntriesPerPage;
                      const indexOfFirstEntry = indexOfLastEntry - recommendedEntriesPerPage + 1;
                      const actualLastEntry = Math.min(indexOfLastEntry, filteredPlans.length);

                      return (
                        <div className="pagination-footer">
                          <div className="pagination-info">
                            Showing {indexOfFirstEntry} to {actualLastEntry} of {filteredPlans.length} entries
                          </div>
                          <div className="pagination-buttons">
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentRecommendedPage(1)}
                              disabled={currentRecommendedPage === 1}
                            >
                              «
                            </button>
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentRecommendedPage(prev => Math.max(1, prev - 1))}
                              disabled={currentRecommendedPage === 1}
                            >
                              ‹
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentRecommendedPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentRecommendedPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentRecommendedPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  className={`pagination-btn ${currentRecommendedPage === pageNum ? 'active' : ''}`}
                                  onClick={() => setCurrentRecommendedPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentRecommendedPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentRecommendedPage === totalPages}
                            >
                              ›
                            </button>
                            <button
                              className="pagination-btn"
                              onClick={() => setCurrentRecommendedPage(totalPages)}
                              disabled={currentRecommendedPage === totalPages}
                            >
                              »
                            </button>
                          </div>
                        </div>
                      );
                      })()}
                </div>
              </div>
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
                  <button
                    className="btn-primary"
                    onClick={handleExportLanguagePdf}
                    disabled={exportingLanguage}
                  >
                    {exportingLanguage ? '⏳ Generating...' : '📄 Export PDF'}
                  </button>
                </div>
              </div>

              {loadingLanguage ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <LoadingCardGrid count={3} height="120px" />
                  </SectionLoading>
                </div>
              ) : Object.keys(languageExercises).length === 0 ? (
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

          {activeTab === 'detection-problems' && (
            <div className="physical-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Detection Problems</h2>
                  <p>Manage physical problems commonly detected in CVA patients</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" style={{ background: '#6b7280' }} onClick={handleSeedDP}>
                    🌱 Seed Defaults
                  </button>
                  <button className="btn-primary" onClick={handleOpenDPCreate}>
                    ➕ Add Problem
                  </button>
                </div>
              </div>

              <div className="gait-analyses-container">
                <div className="controls-section">
                  <div className="control-group">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search by name or category..."
                        value={dpSearchTerm}
                        onChange={(e) => { setDPSearchTerm(e.target.value); setCurrentDPPage(1); }}
                        className="search-input"
                      />
                    </div>
                    <div className="pagination-controls">
                      <label className="entries-label">
                        Show:
                        <select
                          value={dpEntriesPerPage}
                          onChange={(e) => { setDPEntriesPerPage(Number(e.target.value)); setCurrentDPPage(1); }}
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
                      <span className="stat-item"><strong>{detectionProblems.filter(d => d.is_active).length}</strong> Active</span>
                      <span className="stat-item"><strong>{detectionProblems.length}</strong> Total</span>
                    </div>
                  </div>
                </div>

                <div className="datatable-container">
                  {loadingDetectionProblems ? (
                    <SectionLoading>
                      <SkeletonTable rows={5} cols={7} />
                    </SectionLoading>
                  ) : detectionProblems.length === 0 ? (
                    <div className="no-data-message">
                      <span className="no-data-icon">🔍</span>
                      <h3>No Detection Problems Yet</h3>
                      <p>Click "Seed Defaults" to populate or "Add Problem" to create one.</p>
                    </div>
                  ) : (
                    <>
                    <table className="logs-table gait-table detection-problems-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Severity</th>
                        <th>Affected Area</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = detectionProblems.filter(d =>
                          !dpSearchTerm ||
                          d.name?.toLowerCase().includes(dpSearchTerm.toLowerCase()) ||
                          d.category?.toLowerCase().includes(dpSearchTerm.toLowerCase())
                        );
                        const last = currentDPPage * dpEntriesPerPage;
                        const first = last - dpEntriesPerPage;
                        return filtered.slice(first, last).map(item => (
                          <tr key={item.problem_id} className="gait-row" style={{ opacity: item.is_active ? 1 : 0.55 }}>
                            <td><code style={{ fontSize: '0.8rem' }}>{item.problem_id}</code></td>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.category}</td>
                            <td>
                              <span className={`status-badge ${
                                item.severity_level === 'severe' ? 'status-critical' :
                                item.severity_level === 'moderate' ? 'status-warning' : 'status-active'
                              }`}>
                                {item.severity_level}
                              </span>
                            </td>
                            <td>{item.affected_area}</td>
                            <td>
                              <label className="fluency-active-switch">
                                <input
                                  type="checkbox"
                                  checked={item.is_active}
                                  onChange={() => handleToggleDP(item.problem_id)}
                                />
                                <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                              </label>
                            </td>
                            <td>
                              <div className="exercise-actions">
                                <button className="btn-edit" onClick={() => handleOpenDPEdit(item)}>Edit</button>
                                <button className="btn-delete" onClick={() => handleDeleteDP(item.problem_id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  {(() => {
                    const filtered = detectionProblems.filter(d =>
                      !dpSearchTerm ||
                      d.name?.toLowerCase().includes(dpSearchTerm.toLowerCase()) ||
                      d.category?.toLowerCase().includes(dpSearchTerm.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / dpEntriesPerPage);
                    if (totalPages <= 1) return null;
                    const last = currentDPPage * dpEntriesPerPage;
                    const first = last - dpEntriesPerPage;
                    return (
                      <div className="pagination-footer">
                        <span className="pagination-info">
                          Showing {first + 1} to {Math.min(last, filtered.length)} of {filtered.length} entries
                        </span>
                        <div className="pagination-buttons">
                          <button onClick={() => setCurrentDPPage(1)} disabled={currentDPPage === 1} className="pagination-btn">«</button>
                          <button onClick={() => setCurrentDPPage(p => Math.max(1, p - 1))} disabled={currentDPPage === 1} className="pagination-btn">‹</button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = totalPages <= 5 ? i + 1 : currentDPPage <= 3 ? i + 1 : currentDPPage >= totalPages - 2 ? totalPages - 4 + i : currentDPPage - 2 + i;
                            return <button key={p} onClick={() => setCurrentDPPage(p)} className={`pagination-btn ${currentDPPage === p ? 'active' : ''}`}>{p}</button>;
                          })}
                          <button onClick={() => setCurrentDPPage(p => Math.min(totalPages, p + 1))} disabled={currentDPPage === totalPages} className="pagination-btn">›</button>
                          <button onClick={() => setCurrentDPPage(totalPages)} disabled={currentDPPage === totalPages} className="pagination-btn">»</button>
                        </div>
                      </div>
                    );
                  })()}
                  </>
                )}
                </div>
              </div>
            </div>
          )}

          {showDPModal && (
            <div className="modal-overlay" onClick={() => setShowDPModal(false)}>
              <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{editingDP ? 'Edit Detection Problem' : 'Add Detection Problem'}</h3>
                  <button className="modal-close" onClick={() => setShowDPModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="dp-name">Name *</label>
                    <input id="dp-name" type="text" value={newDP.name} onChange={e => setNewDP({ ...newDP, name: e.target.value })} placeholder="e.g. Foot Drop" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-category">Category</label>
                    <input id="dp-category" type="text" value={newDP.category} onChange={e => setNewDP({ ...newDP, category: e.target.value })} placeholder="e.g. Gait, Balance" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-description">Description</label>
                    <textarea id="dp-description" rows="3" value={newDP.description} onChange={e => setNewDP({ ...newDP, description: e.target.value })} placeholder="Describe the problem..." />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-severity">Severity Level</label>
                    <select id="dp-severity" value={newDP.severity_level} onChange={e => setNewDP({ ...newDP, severity_level: e.target.value })}>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-indicators">Indicators (comma-separated)</label>
                    <input id="dp-indicators" type="text" value={newDP.indicators} onChange={e => setNewDP({ ...newDP, indicators: e.target.value })} placeholder="e.g. Dragging foot, Toe clearance issues" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-affected">Affected Area</label>
                    <input id="dp-affected" type="text" value={newDP.affected_area} onChange={e => setNewDP({ ...newDP, affected_area: e.target.value })} placeholder="e.g. Lower limb, Ankle" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-normal">Normal Range</label>
                    <input id="dp-normal" type="text" value={newDP.normal_range} onChange={e => setNewDP({ ...newDP, normal_range: e.target.value })} placeholder="e.g. Dorsiflexion 0-20°" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dp-active">
                      <input id="dp-active" type="checkbox" checked={newDP.is_active} onChange={e => setNewDP({ ...newDP, is_active: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                      Active (visible to patients)
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="secondary-btn" onClick={() => setShowDPModal(false)}>Cancel</button>
                  <button className="primary-btn" onClick={handleSaveDP}>{editingDP ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exercise-recommendations' && (
            <div className="physical-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Exercise Recommendations</h2>
                  <p>Manage therapist-curated exercises for CVA patients</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" style={{ background: '#6b7280' }} onClick={handleSeedER}>
                    🌱 Seed Defaults
                  </button>
                  <button className="btn-primary" onClick={handleOpenERCreate}>
                    ➕ Add Exercise
                  </button>
                </div>
              </div>

              <div className="gait-analyses-container">
                <div className="controls-section">
                  <div className="control-group">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search by name or category..."
                        value={erSearchTerm}
                        onChange={(e) => { setERSearchTerm(e.target.value); setCurrentERPage(1); }}
                        className="search-input"
                      />
                    </div>
                    <div className="pagination-controls">
                      <label className="entries-label">
                        Show:
                        <select
                          value={erEntriesPerPage}
                          onChange={(e) => { setEREntriesPerPage(Number(e.target.value)); setCurrentERPage(1); }}
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
                      <span className="stat-item"><strong>{exerciseRecs.filter(e => e.is_active).length}</strong> Active</span>
                      <span className="stat-item"><strong>{exerciseRecs.length}</strong> Total</span>
                    </div>
                  </div>
                </div>
              </div>

              {loadingExerciseRecs ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <SkeletonTable rows={5} cols={8} />
                  </SectionLoading>
                </div>
              ) : exerciseRecs.length === 0 ? (
                <div className="datatable-container">
                  <div className="no-data-message">
                    <span className="no-data-icon">💪</span>
                    <h3>No Exercise Recommendations Yet</h3>
                    <p>Click "Seed Defaults" to populate or "Add Exercise" to create one.</p>
                  </div>
                </div>
              ) : (
                <div className="datatable-container">
                  <table className="logs-table gait-table exercise-recs-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Difficulty</th>
                        <th>Duration</th>
                        <th>Sets × Reps</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = exerciseRecs.filter(e =>
                          !erSearchTerm ||
                          e.name?.toLowerCase().includes(erSearchTerm.toLowerCase()) ||
                          e.category?.toLowerCase().includes(erSearchTerm.toLowerCase())
                        );
                        const last = currentERPage * erEntriesPerPage;
                        const first = last - erEntriesPerPage;
                        return filtered.slice(first, last).map(item => (
                          <tr key={item.exercise_id} className="gait-row" style={{ opacity: item.is_active ? 1 : 0.55 }}>
                            <td><code style={{ fontSize: '0.8rem' }}>{item.exercise_id}</code></td>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.category}</td>
                            <td>
                              <span className={`status-badge ${
                                item.difficulty_level === 'advanced' ? 'status-critical' :
                                item.difficulty_level === 'intermediate' ? 'status-warning' : 'status-active'
                              }`}>
                                {item.difficulty_level}
                              </span>
                            </td>
                            <td>{item.duration_minutes} min</td>
                            <td>{item.sets} × {item.repetitions}</td>
                            <td>
                              <label className="fluency-active-switch">
                                <input
                                  type="checkbox"
                                  checked={item.is_active}
                                  onChange={() => handleToggleER(item.exercise_id)}
                                />
                                <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                              </label>
                            </td>
                            <td>
                              <div className="exercise-actions">
                                <button className="btn-edit" onClick={() => handleOpenEREdit(item)}>Edit</button>
                                <button className="btn-delete" onClick={() => handleDeleteER(item.exercise_id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  {(() => {
                    const filtered = exerciseRecs.filter(e =>
                      !erSearchTerm ||
                      e.name?.toLowerCase().includes(erSearchTerm.toLowerCase()) ||
                      e.category?.toLowerCase().includes(erSearchTerm.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / erEntriesPerPage);
                    if (totalPages <= 1) return null;
                    const last = currentERPage * erEntriesPerPage;
                    const first = last - erEntriesPerPage;
                    return (
                      <div className="pagination-footer">
                        <span className="pagination-info">
                          Showing {first + 1} to {Math.min(last, filtered.length)} of {filtered.length} entries
                        </span>
                        <div className="pagination-buttons">
                          <button onClick={() => setCurrentERPage(1)} disabled={currentERPage === 1} className="pagination-btn">«</button>
                          <button onClick={() => setCurrentERPage(p => Math.max(1, p - 1))} disabled={currentERPage === 1} className="pagination-btn">‹</button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = totalPages <= 5 ? i + 1 : currentERPage <= 3 ? i + 1 : currentERPage >= totalPages - 2 ? totalPages - 4 + i : currentERPage - 2 + i;
                            return <button key={p} onClick={() => setCurrentERPage(p)} className={`pagination-btn ${currentERPage === p ? 'active' : ''}`}>{p}</button>;
                          })}
                          <button onClick={() => setCurrentERPage(p => Math.min(totalPages, p + 1))} disabled={currentERPage === totalPages} className="pagination-btn">›</button>
                          <button onClick={() => setCurrentERPage(totalPages)} disabled={currentERPage === totalPages} className="pagination-btn">»</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {showERModal && (
            <div className="modal-overlay" onClick={() => setShowERModal(false)}>
              <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{editingER ? 'Edit Exercise' : 'Add Exercise Recommendation'}</h3>
                  <button className="modal-close" onClick={() => setShowERModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="er-name">Name *</label>
                    <input id="er-name" type="text" value={newER.name} onChange={e => setNewER({ ...newER, name: e.target.value })} placeholder="e.g. Ankle Dorsiflexion Stretch" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-category">Category</label>
                    <input id="er-category" type="text" value={newER.category} onChange={e => setNewER({ ...newER, category: e.target.value })} placeholder="e.g. Stretching, Balance" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-description">Description</label>
                    <textarea id="er-description" rows="2" value={newER.description} onChange={e => setNewER({ ...newER, description: e.target.value })} placeholder="Brief overview of the exercise..." />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-target">Target Problems (comma-separated)</label>
                    <input id="er-target" type="text" value={newER.target_problems} onChange={e => setNewER({ ...newER, target_problems: e.target.value })} placeholder="e.g. Foot Drop, Gait Asymmetry" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-difficulty">Difficulty Level</label>
                    <select id="er-difficulty" value={newER.difficulty_level} onChange={e => setNewER({ ...newER, difficulty_level: e.target.value })}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="er-duration">Duration (min)</label>
                      <input id="er-duration" type="number" min="1" value={newER.duration_minutes} onChange={e => setNewER({ ...newER, duration_minutes: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="er-sets">Sets</label>
                      <input id="er-sets" type="number" min="1" value={newER.sets} onChange={e => setNewER({ ...newER, sets: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="er-reps">Repetitions</label>
                      <input id="er-reps" type="number" min="1" value={newER.repetitions} onChange={e => setNewER({ ...newER, repetitions: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-instructions">Instructions (one per line)</label>
                    <textarea id="er-instructions" rows="4" value={newER.instructions} onChange={e => setNewER({ ...newER, instructions: e.target.value })} placeholder="Step 1&#10;Step 2&#10;Step 3" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-precautions">Precautions</label>
                    <input id="er-precautions" type="text" value={newER.precautions} onChange={e => setNewER({ ...newER, precautions: e.target.value })} placeholder="e.g. Stop if pain increases" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-equipment">Equipment Needed (comma-separated)</label>
                    <input id="er-equipment" type="text" value={newER.equipment_needed} onChange={e => setNewER({ ...newER, equipment_needed: e.target.value })} placeholder="e.g. Resistance band, Chair" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="er-active">
                      <input id="er-active" type="checkbox" checked={newER.is_active} onChange={e => setNewER({ ...newER, is_active: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                      Active (visible to patients)
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="secondary-btn" onClick={() => setShowERModal(false)}>Cancel</button>
                  <button className="primary-btn" onClick={handleSaveER}>{editingER ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'success-stories' && (
            <div className="success-stories-section">
              <div className="section-header">
                <div className="header-left">
                  <h2>Success Stories</h2>
                  <p>Share and manage inspiring patient recovery journeys</p>
                </div>
                <button className="btn-primary" onClick={handleAddStory}>
                  <span>⭐</span> Add Success Story
                </button>
              </div>

              <div className="stories-toolbar">
                <div className="toolbar-left">
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search by story content..."
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
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      entries
                    </label>
                  </div>
                </div>
                <div className="toolbar-right">
                  <div className="stats-summary">
                    <span className="stat-item">
                      <strong>{successStories.length}</strong> Total Stories
                    </span>
                  </div>
                </div>
              </div>

              {loadingStories ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <SkeletonTable rows={4} cols={3} />
                  </SectionLoading>
                </div>
              ) : successStories.length === 0 ? (
                <div className="datatable-container">
                  <div className="no-data-message">
                    <span className="no-data-icon">⭐</span>
                    <h3>No Success Stories Yet</h3>
                    <p>Click "Add Success Story" to share patient achievements.</p>
                    <button className="btn-primary" onClick={handleAddStory}>
                      <span>⭐</span> Add Success Story
                    </button>
                  </div>
                </div>
              ) : (
                <div className="datatable-container">
                    <table className="logs-table stories-table">
                      <thead>
                        <tr>
                          <th>Story Preview</th>
                          <th>Images</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredStories = successStories.filter(story =>
                            !storySearchTerm ||
                            story.story.toLowerCase().includes(storySearchTerm.toLowerCase())
                          );
                          const indexOfLastEntry = currentStoryPage * storyEntriesPerPage;
                          const indexOfFirstEntry = indexOfLastEntry - storyEntriesPerPage;
                          const currentEntries = filteredStories.slice(indexOfFirstEntry, indexOfLastEntry);
                          return currentEntries.map(story => (
                            <tr key={story.id}>
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
                                          src={imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}/${imagePath}`}
                                          alt={`Story ${idx + 1}`}
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
                  {(() => {
                    const filteredStories = successStories.filter(story =>
                      !storySearchTerm ||
                      story.story.toLowerCase().includes(storySearchTerm.toLowerCase())
                    );
                    const totalPages = Math.ceil(filteredStories.length / storyEntriesPerPage);
                    if (totalPages <= 1) return null;
                    const indexOfLastEntry = currentStoryPage * storyEntriesPerPage;
                    const indexOfFirstEntry = indexOfLastEntry - storyEntriesPerPage;
                    return (
                      <div className="pagination-footer">
                        <span className="pagination-info">
                          Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredStories.length)} of {filteredStories.length} entries
                        </span>
                        <div className="pagination-buttons">
                          <button
                            onClick={() => setCurrentStoryPage(1)}
                            disabled={currentStoryPage === 1}
                            className="pagination-btn"
                            title="First Page"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setCurrentStoryPage(prev => Math.max(1, prev - 1))}
                            disabled={currentStoryPage === 1}
                            className="pagination-btn"
                            title="Previous Page"
                          >
                            ‹
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentStoryPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentStoryPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentStoryPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentStoryPage(pageNum)}
                                className={`pagination-btn ${currentStoryPage === pageNum ? 'active' : ''}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentStoryPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentStoryPage === totalPages}
                            className="pagination-btn"
                            title="Next Page"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => setCurrentStoryPage(totalPages)}
                            disabled={currentStoryPage === totalPages}
                            className="pagination-btn"
                            title="Last Page"
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
                  <button
                    className="btn-primary"
                    onClick={handleExportFluencyPdf}
                    disabled={exportingFluency}
                  >
                    {exportingFluency ? '⏳ Generating...' : '📄 Export PDF'}
                  </button>
                </div>
              </div>

              {loadingFluency ? (
                <div className="datatable-container">
                  <SectionLoading>
                    <LoadingCardGrid count={3} height="120px" />
                  </SectionLoading>
                </div>
              ) : Object.keys(fluencyExercises).length === 0 ? (
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
                        <SectionLoading>
                          <LoadingCardGrid count={3} height="180px" />
                        </SectionLoading>
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
                <div className="datatable-container">
                  <SectionLoading>
                    <SkeletonTable rows={5} cols={8} />
                  </SectionLoading>
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
                      {(() => {
                        const indexOfLastEntry = currentAppointmentPage * appointmentEntriesPerPage;
                        const indexOfFirstEntry = indexOfLastEntry - appointmentEntriesPerPage;
                        const currentEntries = appointments.slice(indexOfFirstEntry, indexOfLastEntry);
                        return currentEntries.map((appointment) => (
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
                              {appointment.status !== 'cancelled' && appointment.status !== 'no-show' && (
                                <button 
                                  className="btn-icon-small btn-edit"
                                  onClick={() => handleEditAppointment(appointment)}
                                  title="Edit Appointment"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                      })()}
                    </tbody>
                  </table>

                  {/* Pagination Footer */}
                  {(() => {
                    const totalPages = Math.ceil(appointments.length / appointmentEntriesPerPage);
                    if (totalPages <= 1) return null;
                    
                    const indexOfLastEntry = currentAppointmentPage * appointmentEntriesPerPage;
                    const indexOfFirstEntry = indexOfLastEntry - appointmentEntriesPerPage + 1;
                    const actualLastEntry = Math.min(indexOfLastEntry, appointments.length);
                    
                    return (
                      <div className="pagination-footer">
                        <div className="pagination-info">
                          Showing {indexOfFirstEntry} to {actualLastEntry} of {appointments.length} entries
                        </div>
                        <div className="pagination-buttons">
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentAppointmentPage(1)}
                            disabled={currentAppointmentPage === 1}
                          >
                            «
                          </button>
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentAppointmentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentAppointmentPage === 1}
                          >
                            ‹
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentAppointmentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentAppointmentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentAppointmentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                className={`pagination-btn ${currentAppointmentPage === pageNum ? 'active' : ''}`}
                                onClick={() => setCurrentAppointmentPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentAppointmentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentAppointmentPage === totalPages}
                          >
                            ›
                          </button>
                          <button 
                            className="pagination-btn" 
                            onClick={() => setCurrentAppointmentPage(totalPages)}
                            disabled={currentAppointmentPage === totalPages}
                          >
                            »
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="datatable-container">
                  <div className="no-data-message">
                    <span className="no-data-icon">📅</span>
                    <h3>No Appointments Found</h3>
                    <p>No appointments match your current filters. Try adjusting the filters or create a new appointment.</p>
                    <button className="btn-primary" onClick={handleAddAppointment}>
                      <span>📅</span> Schedule New Appointment
                    </button>
                  </div>
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
                              <div className="search-skeleton-dot"></div>
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
                      {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'no-show' && (
                        <button className="btn-primary" onClick={() => {
                          setShowAppointmentDetails(false);
                          handleEditAppointment(selectedAppointment);
                        }}>
                          Edit Appointment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-section">
              {loadingReports ? (
                <div className="reports-container">
                  <SectionLoading>
                    <div className="reports-main reports-main-full">
                      <div className="report-card report-overview-card">
                        <div className="report-card-header">
                          <div className="report-loading-stack">
                            <SkeletonCard height="84px" />
                            <SkeletonCard height="84px" />
                          </div>
                        </div>
                        <div className="report-card-body">
                          <LoadingCardGrid count={3} height="92px" />
                        </div>
                      </div>
                      <div className="reports-therapy-grid">
                        <SkeletonCard height="220px" />
                        <SkeletonCard height="220px" />
                      </div>
                    </div>
                  </SectionLoading>
                </div>
              ) : reportsData && (reportsData.totalPatients || 0) > 0 ? (
                <div className="reports-container">
                  <div className="reports-main reports-main-full">
                    <div className="report-card report-overview-card">
                      <div className="report-card-header">
                        <div>
                          <h3 className="report-card-title">
                            <span className="report-icon">
                              {REPORT_CATEGORY_OPTIONS.find(option => option.key === activeReportCategory)?.icon || '📈'}
                            </span>
                            {activeReportData?.title || 'Reports Overview'}
                          </h3>
                          <p className="report-card-subtitle">{activeReportData?.description || 'Demographic reporting by therapy type.'}</p>
                        </div>
                        <button
                          type="button"
                          className="btn-export-pdf report-export-btn"
                          onClick={handleExportReportsPdf}
                          disabled={exportingReports}
                        >
                          {exportingReports ? '⏳ Generating...' : '📄 Export PDF'}
                        </button>
                      </div>
                      <div className="report-card-body">
                        <div className="report-summary">
                          <div className="summary-stats-row">
                            <div className="summary-stat">
                              <span className="stat-label">Total Patients</span>
                              <span className="stat-value">{reportsData.totalPatients || 0}</span>
                            </div>
                            <div className="summary-stat">
                              <span className="stat-label">Speech Therapy</span>
                              <span className="stat-value">{reportsData.therapyTotals?.speech?.totalPatients || 0}</span>
                            </div>
                            <div className="summary-stat">
                              <span className="stat-label">Physical Therapy</span>
                              <span className="stat-value">{reportsData.therapyTotals?.physical?.totalPatients || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeReportCategory === 'age' && overallReportItems.length > 0 && (
                      <div className="report-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">👥</span>
                            Age Distribution Overview
                          </h3>
                          <p className="report-card-subtitle">Patient distribution across age brackets, matching the previous dashboard summary.</p>
                        </div>
                        <div className="report-card-body">
                          <div className="age-brackets-grid">
                            {overallReportItems.map((bracket) => (
                              <div key={bracket.range} className={`age-bracket-item ${bracket.isHighest ? 'highest' : ''}`}>
                                <div className="bracket-label">{bracket.range}</div>
                                <div className="bracket-count">{bracket.count}</div>
                                <div className="bracket-percentage">{bracket.percentage}%</div>
                                {bracket.isHighest && <div className="highest-badge">Highest</div>}
                                <div className="bracket-bar">
                                  <div className="bracket-bar-fill" style={{ width: `${bracket.percentage}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="report-summary">
                            <div className="summary-item highlight">
                              <span className="summary-icon">🎯</span>
                              <div className="summary-content">
                                <span className="summary-label">Highest Age Bracket</span>
                                <span className="summary-value">{reportsData?.highestAgeBracket?.range || 'N/A'}</span>
                              </div>
                              <div className="summary-count">{reportsData?.highestAgeBracket?.count || 0} patients</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportCategory === 'gender' && overallReportItems.length > 0 && (
                      <div className="report-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">⚧️</span>
                            Gender Distribution Overview
                          </h3>
                          <p className="report-card-subtitle">Overall gender distribution before the therapy-specific breakdown below.</p>
                        </div>
                        <div className="report-card-body">
                          <div className="gender-distribution-grid">
                            {overallReportItems.map((gender) => {
                              const meta = getProblemGenderMeta(gender.gender || gender.key);
                              const barKey = gender.gender || gender.key;

                              return (
                                <div key={gender.key || gender.gender} className="gender-item">
                                  <div className="gender-icon-wrapper">
                                    <span className="gender-emoji">{meta.icon}</span>
                                  </div>
                                  <div className="gender-info">
                                    <div className="gender-label">{meta.label}</div>
                                    <div className="gender-stats">
                                      <span className="gender-count">{gender.count} patients</span>
                                      <span className="gender-percentage">{gender.percentage}%</span>
                                    </div>
                                    <div className="gender-bar">
                                      <div className={`gender-bar-fill ${barKey}`} style={{ width: `${gender.percentage}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportCategory === 'work' && overallReportItems.length > 0 && (
                      <div className="report-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">💼</span>
                            Work Distribution Overview
                          </h3>
                          <p className="report-card-subtitle">Overall occupation and employment status before the therapy-specific breakdown below.</p>
                        </div>
                        <div className="report-card-body">
                          <div className="report-breakdown-list report-breakdown-list-overview">
                            {overallReportItems.map((item) => (
                              <div key={item.key} className="report-breakdown-item overview">
                                <div className="report-breakdown-header">
                                  <span className="report-breakdown-label">{item.label}</span>
                                  <span className="report-breakdown-meta">{item.count} patients • {item.percentage}%</span>
                                </div>
                                <div className="report-breakdown-track">
                                  <div className="report-breakdown-fill" style={{ width: `${item.percentage}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="reports-therapy-grid">
                      {reportTherapyPanels.map((panel) => {
                        const displayItems = getReportItemsForDisplay(panel.items || []);
                        const maxCount = displayItems.reduce((highest, item) => Math.max(highest, item.count || 0), 0);

                        return (
                          <div key={panel.therapyType} className="report-card report-therapy-card">
                            <div className="report-card-header">
                              <h3 className="report-card-title">
                                <span className="report-icon">{panel.therapyType === 'speech' ? '🎤' : '🏃'}</span>
                                {panel.therapyLabel}
                              </h3>
                              <p className="report-card-subtitle">{panel.totalPatients || 0} patients in this therapy group</p>
                            </div>
                            <div className="report-card-body">
                              {displayItems.length > 0 ? (
                                <div className="report-breakdown-list">
                                  {displayItems.map((item) => (
                                    <div key={`${panel.therapyType}-${item.key}`} className="report-breakdown-item">
                                      <div className="report-breakdown-header">
                                        <span className="report-breakdown-label">{getReportItemLabel(item)}</span>
                                        <span className="report-breakdown-meta">{item.count} patients • {item.percentage}%</span>
                                      </div>
                                      <div className="report-breakdown-track">
                                        <div
                                          className="report-breakdown-fill"
                                          style={{ width: `${maxCount > 0 ? ((item.count / maxCount) * 100).toFixed(1) : 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="no-data">
                                  <div className="no-data-icon">📂</div>
                                  <p>No {activeReportCategory} data available for this therapy type</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {activeReportCategory === 'gender' && (
                      <div className="report-card report-problems-card">
                        <div className="report-card-header">
                          <h3 className="report-card-title">
                            <span className="report-icon">🦿</span>
                            Detected Physical Problems by Gender
                          </h3>
                          <p className="report-card-subtitle">Physical gait problems detected from therapist-viewable analyses and the gender most commonly affected.</p>
                        </div>
                        <div className="report-card-body">
                          {activeReportData?.detectedProblems?.length > 0 ? (
                            <div className="report-problem-list">
                              {activeReportData.detectedProblems.map((problem) => (
                                <div key={problem.key} className="report-problem-item">
                                  <div className="report-problem-top">
                                    <div>
                                      <h4 className="report-problem-title">{problem.label}</h4>
                                      <p className="report-problem-subtitle">{problem.totalPatients} patients affected</p>
                                    </div>
                                    <span className="problem-dominant-badge">Most common: {problem.dominantGenderLabel}</span>
                                  </div>
                                  <div className="problem-gender-grid">
                                    {Object.entries(problem.countsByGender || {}).map(([genderKey, count]) => {
                                      const meta = getProblemGenderMeta(genderKey);
                                      return (
                                        <div key={`${problem.key}-${genderKey}`} className="problem-gender-card">
                                          <span className="problem-gender-icon">{meta.icon}</span>
                                          <span className="problem-gender-name">{meta.label}</span>
                                          <span className="problem-gender-count">{count}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-data">
                              <div className="no-data-icon">🦿</div>
                              <p>No detected physical problems available yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
            <div className="diagnostics-section" id="diagnostics-print-section">
              {/* Patient Search */}
              <div className="diag-search-bar">
                <div className="diag-search-wrapper">
                  <span className="diag-search-icon">🔍</span>
                  <input
                    type="text"
                    className="diag-search-input"
                    placeholder="Search patient by name..."
                    value={diagSearchQuery}
                    onChange={(e) => setDiagSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (diagSearchResults.length > 0 || diagSearchError) setShowDiagPatientDropdown(true);
                    }}
                  />
                  {searchingDiagPatients && <div className="diag-search-loading-badge search-skeleton-dot"></div>}
                  {showDiagPatientDropdown && (
                    <div className="diag-patient-dropdown">
                      {diagSearchError ? (
                        <p className="diag-search-message diag-search-error-msg">{diagSearchError}</p>
                      ) : diagSearchResults.length > 0 ? (
                        diagSearchResults.map((p) => (
                          <button
                            key={p._id || p.id}
                            className="diag-patient-option"
                            onClick={() => selectDiagPatient(p)}
                          >
                            <span className="diag-patient-name">{p.firstName} {p.lastName}</span>
                            <span className="diag-patient-email">{p.email}</span>
                          </button>
                        ))
                      ) : (
                        <p className="diag-search-message diag-search-no-results">No patients found for &ldquo;{diagSearchQuery}&rdquo;</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedDiagPatient && (
                  <div className="diag-action-buttons">
                    <button className="diag-add-btn" onClick={() => setShowDiagModal(true)}>
                      + Add Facility Diagnostic
                    </button>
                    <button className="diag-print-btn" onClick={handleExportDiagnosticPdf} title="Export to PDF">
                      📄 Export PDF
                    </button>
                  </div>
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

              {/* Loading Skeleton */}
              {selectedDiagPatient && loadingDiagComparison && (
                <SectionLoading>
                  <div className="diag-skeleton-container">
                    <div className="diag-skeleton-header">
                      <SkeletonCard height="90px" />
                    </div>
                    <div className="diag-skeleton-table">
                      <SkeletonTable rows={5} cols={4} />
                    </div>
                  </div>
                </SectionLoading>
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
                            📊 Auto-aggregated from facility sessions
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Assessment Selector Dropdown */}
                    {diagPatientDiagnostics.length > 1 && (
                      <div className="diag-assessment-selector">
                        <label className="diag-selector-label">Compare with:</label>
                        <select
                          className="diag-selector-dropdown"
                          value={selectedDiagnosticId || ''}
                          onChange={(e) => handleSelectAssessment(e.target.value || null)}
                        >
                          <option value="">Latest Assessment</option>
                          {diagPatientDiagnostics.map(d => (
                            <option key={d._id} value={d._id}>
                              {new Date(d.assessment_date).toLocaleDateString()} — {d.assessment_type?.charAt(0).toUpperCase() + d.assessment_type?.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Patient Self-Report Panel */}
                  {patientSelfReport?.completedWizard && (
                    <div className="diag-self-report-panel">
                      <div className="diag-self-report-header">
                        <span className="diag-self-report-icon">📝</span>
                        <h4 className="diag-self-report-title">Patient Self-Report (Intake Wizard)</h4>
                        <span className="diag-self-report-badge">Self-Reported</span>
                      </div>
                      <div className="diag-self-report-grid">
                        {patientSelfReport.therapyFocus && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Therapy Focus</span>
                            <span className="diag-sr-value">{patientSelfReport.therapyFocus === 'both' ? 'Speech + Physical' : patientSelfReport.therapyFocus.charAt(0).toUpperCase() + patientSelfReport.therapyFocus.slice(1)}</span>
                          </div>
                        )}
                        {patientSelfReport.strokeTimeframe && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Stroke Timeframe</span>
                            <span className="diag-sr-value">{{
                              less_than_1_month: '< 1 Month',
                              '1_to_6_months': '1–6 Months',
                              '6_to_12_months': '6–12 Months',
                              over_1_year: 'Over 1 Year',
                            }[patientSelfReport.strokeTimeframe] ?? patientSelfReport.strokeTimeframe}</span>
                          </div>
                        )}
                        {patientSelfReport.affectedSide && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Affected Side</span>
                            <span className="diag-sr-value">{patientSelfReport.affectedSide.charAt(0).toUpperCase() + patientSelfReport.affectedSide.slice(1).replace('_', ' ')}</span>
                          </div>
                        )}
                        {patientSelfReport.childAgeGroup && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Age Group</span>
                            <span className="diag-sr-value">{{
                              toddler: '1–2 Years (Toddler)',
                              preschool: '3–4 Years (Preschool)',
                              school_age: '5–8 Years (School-Age)',
                              older: '9+ Years',
                            }[patientSelfReport.childAgeGroup] ?? patientSelfReport.childAgeGroup}</span>
                          </div>
                        )}
                        {patientSelfReport.childCommunicationMode && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Communication Mode</span>
                            <span className="diag-sr-value">{{
                              preverbal: 'Pre-verbal / Non-verbal',
                              single_words: 'Single Words',
                              short_phrases: 'Short Phrases',
                              sentences: 'Full Sentences',
                            }[patientSelfReport.childCommunicationMode] ?? patientSelfReport.childCommunicationMode}</span>
                          </div>
                        )}
                        {patientSelfReport.speechIntelligibility && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Intelligibility</span>
                            <span className="diag-sr-value">{{
                              easily: 'Easily Understood',
                              mostly_family: 'Mostly by Family',
                              difficult: 'Difficult to Understand',
                              not_speaking: 'Not Yet Speaking',
                            }[patientSelfReport.speechIntelligibility] ?? patientSelfReport.speechIntelligibility}</span>
                          </div>
                        )}
                        {patientSelfReport.mainSpeechConcern && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Speech Concern</span>
                            <span className="diag-sr-value">{{
                              articulation: 'Pronunciation',
                              language: 'Language',
                              fluency: 'Fluency',
                              multiple: 'Multiple Areas',
                            }[patientSelfReport.mainSpeechConcern] ?? patientSelfReport.mainSpeechConcern}</span>
                          </div>
                        )}
                        {patientSelfReport.followsInstructions && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Follows Instructions</span>
                            <span className="diag-sr-value">{{
                              yes_consistently: 'Yes, Consistently',
                              sometimes: 'Sometimes',
                              rarely: 'Rarely',
                              no: 'No / Not Yet',
                            }[patientSelfReport.followsInstructions] ?? patientSelfReport.followsInstructions}</span>
                          </div>
                        )}
                        {patientSelfReport.respondsToName && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Responds to Name</span>
                            <span className="diag-sr-value">{{
                              always: 'Always',
                              usually: 'Usually',
                              inconsistently: 'Inconsistently',
                              rarely_no: 'Rarely / No',
                            }[patientSelfReport.respondsToName] ?? patientSelfReport.respondsToName}</span>
                          </div>
                        )}
                        {patientSelfReport.priorSpeechEval && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Prior Speech Eval</span>
                            <span className="diag-sr-value">{{
                              formal_eval: 'Formal Evaluation',
                              informal: 'Informal Screening',
                              no: 'None',
                            }[patientSelfReport.priorSpeechEval] ?? patientSelfReport.priorSpeechEval}</span>
                          </div>
                        )}
                        {patientSelfReport.mobilityStatus && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Mobility</span>
                            <span className="diag-sr-value">{{
                              independent: 'Walks Independently',
                              assisted: 'With Assistance',
                              wheelchair: 'Wheelchair User',
                              bed_bound: 'Bed-bound',
                            }[patientSelfReport.mobilityStatus] ?? patientSelfReport.mobilityStatus}</span>
                          </div>
                        )}
                        {patientSelfReport.armMotorFunction && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Arm Motor</span>
                            <span className="diag-sr-value">{{
                              normal: 'Normal',
                              mild_weakness: 'Mild Weakness',
                              moderate_weakness: 'Moderate Weakness',
                              severe_weakness: 'Severe / No Movement',
                            }[patientSelfReport.armMotorFunction] ?? patientSelfReport.armMotorFunction}</span>
                          </div>
                        )}
                        {patientSelfReport.legMotorFunction && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Leg Motor</span>
                            <span className="diag-sr-value">{{
                              normal: 'Normal',
                              mild_weakness: 'Mild Weakness',
                              moderate_weakness: 'Moderate Weakness',
                              severe_weakness: 'Severe / No Movement',
                            }[patientSelfReport.legMotorFunction] ?? patientSelfReport.legMotorFunction}</span>
                          </div>
                        )}

                        {patientSelfReport.priorPhysicalTherapy && (
                          <div className="diag-sr-item">
                            <span className="diag-sr-label">Prior Physical Therapy</span>
                            <span className="diag-sr-value">{patientSelfReport.priorPhysicalTherapy === 'facility' ? 'At a Facility' : patientSelfReport.priorPhysicalTherapy === 'self_guided' ? 'Self-Guided' : 'No'}</span>
                          </div>
                        )}
                      </div>
                      {patientSelfReport.recommendedFocus && (
                        <div className="diag-sr-rec">
                          <span className="diag-sr-rec-label">Patient-Reported Recommendation:</span>
                          <span className="diag-sr-rec-therapy">{patientSelfReport.recommendedTherapy === 'speech' ? 'Speech Therapy' : patientSelfReport.recommendedTherapy === 'physical' ? 'Physical Therapy' : 'Therapy'}</span>
                          <span className="diag-sr-rec-level">{patientSelfReport.recommendedLevelName ?? (patientSelfReport.recommendedLevel?.charAt(0).toUpperCase() + patientSelfReport.recommendedLevel?.slice(1) + ' Level')}</span>
                          <span className="diag-sr-rec-focus">{patientSelfReport.recommendedFocus}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <>
                    {!diagComparisonData.has_facility_data && (
                      <div className="diag-no-facility-notice">
                        <span className="diag-no-facility-icon">📋</span>
                        <div>
                          <p className="diag-no-facility-text">No facility diagnostic on file</p>
                          <p className="diag-no-facility-hint">Click "Add Facility Diagnostic" above to add a formal assessment. At-home progress is shown below.</p>
                        </div>
                      </div>
                    )}

                      {/* Summary Insights Card */}
                      {diagComparisonData.has_facility_data && diagComparisonData.summary_insights && Object.keys(diagComparisonData.summary_insights).length > 0 && (
                        <div className="diag-insights-card">
                          <div className="diag-insights-header">
                            <h3 className="diag-insights-title">
                              <span className="report-icon">💡</span>
                              Summary Insights
                            </h3>
                          </div>
                          <div className="diag-insights-body">
                            <div className="diag-insights-grid">
                              <div className="diag-insight-stat">
                                <span className="diag-insight-value" style={{ color: diagComparisonData.summary_insights.overall_avg_delta >= 0 ? '#16a34a' : '#dc2626' }}>
                                  {diagComparisonData.summary_insights.overall_avg_delta >= 0 ? '+' : ''}{diagComparisonData.summary_insights.overall_avg_delta}%
                                </span>
                                <span className="diag-insight-label">Overall Avg Change</span>
                              </div>
                              <div className="diag-insight-stat">
                                <span className="diag-insight-value diag-insight-improving">
                                  {diagComparisonData.summary_insights.improving_count}
                                </span>
                                <span className="diag-insight-label">Improving</span>
                              </div>
                              <div className="diag-insight-stat">
                                <span className="diag-insight-value diag-insight-declining">
                                  {diagComparisonData.summary_insights.declining_count}
                                </span>
                                <span className="diag-insight-label">Declining</span>
                              </div>
                              <div className="diag-insight-stat">
                                <span className="diag-insight-value diag-insight-stable">
                                  {diagComparisonData.summary_insights.stable_count}
                                </span>
                                <span className="diag-insight-label">Stable</span>
                              </div>
                            </div>
                            <div className="diag-insights-highlights">
                              {diagComparisonData.summary_insights.strongest_area && diagComparisonData.summary_insights.strongest_area.delta > 0 && (
                                <div className="diag-highlight diag-highlight-best">
                                  <span className="diag-highlight-icon">🌟</span>
                                  <span>Most Improved: <strong>{diagComparisonData.summary_insights.strongest_area.metric}</strong> (+{diagComparisonData.summary_insights.strongest_area.delta}%)</span>
                                </div>
                              )}
                              {diagComparisonData.summary_insights.weakest_area && diagComparisonData.summary_insights.weakest_area.delta < 0 && (
                                <div className="diag-highlight diag-highlight-worst">
                                  <span className="diag-highlight-icon">⚠️</span>
                                  <span>Needs Attention: <strong>{diagComparisonData.summary_insights.weakest_area.metric}</strong> ({diagComparisonData.summary_insights.weakest_area.delta}%)</span>
                                </div>
                              )}
                              {/* Discharge readiness check */}
                              {(() => {
                                const allScores = [];
                                Object.values(diagComparisonData.home_scores?.articulation || {}).forEach(v => { if (v != null) allScores.push(v); });
                                if (diagComparisonData.home_scores?.fluency != null) allScores.push(diagComparisonData.home_scores.fluency);
                                if (diagComparisonData.home_scores?.receptive != null) allScores.push(diagComparisonData.home_scores.receptive);
                                if (diagComparisonData.home_scores?.expressive != null) allScores.push(diagComparisonData.home_scores.expressive);
                                const allAbove85 = allScores.length > 0 && allScores.every(s => s >= 85);
                                const allDeltasPositive = diagComparisonData.summary_insights.declining_count === 0 && diagComparisonData.summary_insights.improving_count > 0;
                                if (allAbove85 && allDeltasPositive) {
                                  return (
                                    <div className="diag-highlight diag-highlight-discharge">
                                      <span className="diag-highlight-icon">✅</span>
                                      <span>Patient may be ready for <strong>discharge assessment</strong> — all at-home scores above 85% with positive trends</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Speech Therapy Section */}
                      {(() => {
                        const hasSpeechFacility =
                          ['r', 's', 'l', 'th', 'k'].some(s => diagComparisonData.facility_scores?.articulation?.[s] != null) ||
                          diagComparisonData.facility_scores?.fluency != null ||
                          diagComparisonData.facility_scores?.receptive != null ||
                          diagComparisonData.facility_scores?.expressive != null;
                        const hasSpeechHome =
                          ['r', 's', 'l', 'th', 'k'].some(s => diagComparisonData.home_scores?.articulation?.[s] != null) ||
                          diagComparisonData.home_scores?.fluency != null ||
                          diagComparisonData.home_scores?.receptive != null ||
                          diagComparisonData.home_scores?.expressive != null;
                        const hasSpeechData = hasSpeechFacility || hasSpeechHome;

                        const speechBarItems = [
                          { label: 'Fluency', facility: diagComparisonData.facility_scores?.fluency, home: diagComparisonData.home_scores?.fluency },
                          { label: 'Receptive', facility: diagComparisonData.facility_scores?.receptive, home: diagComparisonData.home_scores?.receptive },
                          { label: 'Expressive', facility: diagComparisonData.facility_scores?.expressive, home: diagComparisonData.home_scores?.expressive },
                          ...['r', 's', 'l', 'th', 'k']
                            .filter(s => diagComparisonData.facility_scores?.articulation?.[s] != null || diagComparisonData.home_scores?.articulation?.[s] != null)
                            .map(s => ({
                              label: `/${s.toUpperCase()}/`,
                              facility: diagComparisonData.facility_scores?.articulation?.[s],
                              home: diagComparisonData.home_scores?.articulation?.[s]
                            }))
                        ].filter(item => item.facility != null || item.home != null);

                        return (
                          <div className="diag-therapy-section diag-therapy-speech">
                            <div className="diag-therapy-section-header">
                              <span className="diag-therapy-section-icon">🗣️</span>
                              <div>
                                <h3 className="diag-therapy-section-title">Speech Therapy</h3>
                                <p className="diag-therapy-section-subtitle">Articulation, fluency, and language metrics</p>
                              </div>
                            </div>

                            {!hasSpeechData ? (
                              <div className="diag-therapy-empty">
                                <span className="diag-therapy-empty-icon">🗣️</span>
                                <p>No speech therapy data available for this assessment</p>
                              </div>
                            ) : (
                              <>
                                <div className="report-card">
                                  <div className="report-card-header">
                                    <h3 className="report-card-title">
                                      <span className="report-icon">📊</span>
                                      Facility vs. At-Home Comparison
                                    </h3>
                                    <p className="report-card-subtitle">Side-by-side view of speech diagnostic results and current home performance</p>
                                  </div>
                                  <div className="report-card-body">
                                    <div className="diag-table-wrapper">
                                      <table className="diag-comparison-table">
                                        <thead>
                                          <tr>
                                            <th>Metric</th>
                                            <th>Facility Score</th>
                                            <th>Level</th>
                                            <th>At-Home Score</th>
                                            <th>Level</th>
                                            <th>Δ Change</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {['r', 's', 'l', 'th', 'k'].map(sound => {
                                            const facilityVal = diagComparisonData.facility_scores?.articulation?.[sound];
                                            const homeVal = diagComparisonData.home_scores?.articulation?.[sound];
                                            const delta = diagComparisonData.deltas?.articulation?.[sound];
                                            const d = getDeltaDisplay(delta);
                                            const fBand = getScoreBand(facilityVal);
                                            const hBand = getScoreBand(homeVal);
                                            const alert = getAlertBadge(delta, homeVal);
                                            if (facilityVal == null && homeVal == null) return null;
                                            return (
                                              <tr key={`art-${sound}`}>
                                                <td className="metric-name" title={`Measures the patient's ability to correctly produce the /${sound.toUpperCase()}/ phoneme in various word positions`}>
                                                  <span className="metric-content">
                                                    <span className="metric-icon" style={{ backgroundColor: '#9C27B0' }}>🗣️</span>
                                                    Articulation /{sound.toUpperCase()}/
                                                  </span>
                                                </td>
                                                <td className="score-cell">{facilityVal != null ? `${facilityVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${fBand.className}`}>{fBand.label}</span></td>
                                                <td className="score-cell">{homeVal != null ? `${homeVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${hBand.className}`}>{hBand.label}</span></td>
                                                <td className={`delta-cell ${d.className}`}>
                                                  <span className="delta-icon">{d.icon}</span> {d.text}
                                                </td>
                                                <td className="status-cell">
                                                  <span className={`alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span>
                                                </td>
                                              </tr>
                                            );
                                          })}

                                          {(diagComparisonData.facility_scores?.fluency != null || diagComparisonData.home_scores?.fluency != null) && (() => {
                                            const fVal = diagComparisonData.facility_scores?.fluency;
                                            const hVal = diagComparisonData.home_scores?.fluency;
                                            const delta = diagComparisonData.deltas?.fluency;
                                            const d = getDeltaDisplay(delta);
                                            const fBand = getScoreBand(fVal);
                                            const hBand = getScoreBand(hVal);
                                            const alert = getAlertBadge(delta, hVal);
                                            return (
                                              <tr key="fluency">
                                                <td className="metric-name" title="Measures speech smoothness, rate, and rhythm without interruptions">
                                                  <span className="metric-content">
                                                    <span className="metric-icon" style={{ backgroundColor: '#FF9800' }}>💬</span>
                                                    Fluency
                                                  </span>
                                                </td>
                                                <td className="score-cell">{fVal != null ? `${fVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${fBand.className}`}>{fBand.label}</span></td>
                                                <td className="score-cell">{hVal != null ? `${hVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${hBand.className}`}>{hBand.label}</span></td>
                                                <td className={`delta-cell ${d.className}`}>
                                                  <span className="delta-icon">{d.icon}</span> {d.text}
                                                </td>
                                                <td className="status-cell">
                                                  <span className={`alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span>
                                                </td>
                                              </tr>
                                            );
                                          })()}

                                          {(diagComparisonData.facility_scores?.receptive != null || diagComparisonData.home_scores?.receptive != null) && (() => {
                                            const fVal = diagComparisonData.facility_scores?.receptive;
                                            const hVal = diagComparisonData.home_scores?.receptive;
                                            const delta = diagComparisonData.deltas?.receptive;
                                            const d = getDeltaDisplay(delta);
                                            const fBand = getScoreBand(fVal);
                                            const hBand = getScoreBand(hVal);
                                            const alert = getAlertBadge(delta, hVal);
                                            return (
                                              <tr key="receptive">
                                                <td className="metric-name" title="Measures comprehension of spoken language, following directions, and understanding concepts">
                                                  <span className="metric-content">
                                                    <span className="metric-icon" style={{ backgroundColor: '#2196F3' }}>👂</span>
                                                    Receptive Language
                                                  </span>
                                                </td>
                                                <td className="score-cell">{fVal != null ? `${fVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${fBand.className}`}>{fBand.label}</span></td>
                                                <td className="score-cell">{hVal != null ? `${hVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${hBand.className}`}>{hBand.label}</span></td>
                                                <td className={`delta-cell ${d.className}`}>
                                                  <span className="delta-icon">{d.icon}</span> {d.text}
                                                </td>
                                                <td className="status-cell">
                                                  <span className={`alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span>
                                                </td>
                                              </tr>
                                            );
                                          })()}

                                          {(diagComparisonData.facility_scores?.expressive != null || diagComparisonData.home_scores?.expressive != null) && (() => {
                                            const fVal = diagComparisonData.facility_scores?.expressive;
                                            const hVal = diagComparisonData.home_scores?.expressive;
                                            const delta = diagComparisonData.deltas?.expressive;
                                            const d = getDeltaDisplay(delta);
                                            const fBand = getScoreBand(fVal);
                                            const hBand = getScoreBand(hVal);
                                            const alert = getAlertBadge(delta, hVal);
                                            return (
                                              <tr key="expressive">
                                                <td className="metric-name" title="Measures ability to express thoughts, use vocabulary, and form sentences">
                                                  <span className="metric-content">
                                                    <span className="metric-icon" style={{ backgroundColor: '#2196F3' }}>🗣️</span>
                                                    Expressive Language
                                                  </span>
                                                </td>
                                                <td className="score-cell">{fVal != null ? `${fVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${fBand.className}`}>{fBand.label}</span></td>
                                                <td className="score-cell">{hVal != null ? `${hVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${hBand.className}`}>{hBand.label}</span></td>
                                                <td className={`delta-cell ${d.className}`}>
                                                  <span className="delta-icon">{d.icon}</span> {d.text}
                                                </td>
                                                <td className="status-cell">
                                                  <span className={`alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span>
                                                </td>
                                              </tr>
                                            );
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>

                                {speechBarItems.length > 0 && (
                                  <div className="report-card">
                                    <div className="report-card-header">
                                      <h3 className="report-card-title">
                                        <span className="report-icon">📈</span>
                                        Visual Comparison — Speech
                                      </h3>
                                      <p className="report-card-subtitle">Facility (blue) vs. At-Home (green) performance</p>
                                    </div>
                                    <div className="report-card-body">
                                      <div className="diag-bar-chart">
                                        {speechBarItems.map((item, idx) => (
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
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Physical Therapy Section */}
                      {(() => {
                        const hasGaitFacility = diagComparisonData.facility_scores?.gait?.overall_gait != null;
                        const hasGaitHome = diagComparisonData.home_scores?.gait?.overall_gait != null;
                        const hasGaitData = hasGaitFacility || hasGaitHome;

                        const gaitMetrics = [
                          { key: 'stability_score', label: 'Stability', icon: '🦿', color: '#4CAF50', title: 'Measures postural stability and balance during walking' },
                          { key: 'gait_symmetry', label: 'Gait Symmetry', icon: '⚖️', color: '#009688', title: 'Measures the evenness of left/right stride patterns' },
                          { key: 'step_regularity', label: 'Step Regularity', icon: '👣', color: '#03A9F4', title: 'Measures consistency and rhythm of step timing' },
                          { key: 'overall_gait', label: 'Gait (Overall)', icon: '🚶', color: '#4CAF50', title: 'Measures overall walking pattern including stability, symmetry, and step regularity' },
                        ];

                        const ptBarItems = gaitMetrics
                          .filter(m => diagComparisonData.facility_scores?.gait?.[m.key] != null || diagComparisonData.home_scores?.gait?.[m.key] != null)
                          .map(m => ({
                            label: m.label,
                            facility: diagComparisonData.facility_scores?.gait?.[m.key],
                            home: diagComparisonData.home_scores?.gait?.[m.key]
                          }));

                        return (
                          <div className="diag-therapy-section diag-therapy-physical">
                            <div className="diag-therapy-section-header">
                              <span className="diag-therapy-section-icon">🦵</span>
                              <div>
                                <h3 className="diag-therapy-section-title">Physical Therapy</h3>
                                <p className="diag-therapy-section-subtitle">Gait and mobility metrics</p>
                              </div>
                            </div>

                            {!hasGaitData ? (
                              <div className="diag-therapy-empty">
                                <span className="diag-therapy-empty-icon">🦵</span>
                                <p>No physical therapy data available for this assessment</p>
                              </div>
                            ) : (
                              <>
                                <div className="report-card">
                                  <div className="report-card-header">
                                    <h3 className="report-card-title">
                                      <span className="report-icon">📊</span>
                                      Facility vs. At-Home Comparison
                                    </h3>
                                    <p className="report-card-subtitle">Side-by-side view of physical therapy diagnostic results and current home performance</p>
                                  </div>
                                  <div className="report-card-body">
                                    <div className="diag-table-wrapper">
                                      <table className="diag-comparison-table">
                                        <thead>
                                          <tr>
                                            <th>Metric</th>
                                            <th>Facility Score</th>
                                            <th>Level</th>
                                            <th>At-Home Score</th>
                                            <th>Level</th>
                                            <th>Δ Change</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {gaitMetrics.map(m => {
                                            const fVal = diagComparisonData.facility_scores?.gait?.[m.key];
                                            const hVal = diagComparisonData.home_scores?.gait?.[m.key];
                                            const delta = m.key === 'overall_gait'
                                              ? diagComparisonData.deltas?.gait
                                              : (hVal != null && fVal != null ? parseFloat((hVal - fVal).toFixed(1)) : null);
                                            const d = getDeltaDisplay(delta);
                                            const fBand = getScoreBand(fVal);
                                            const hBand = getScoreBand(hVal);
                                            const alert = getAlertBadge(delta, hVal);
                                            if (fVal == null && hVal == null) return null;
                                            return (
                                              <tr key={m.key}>
                                                <td className="metric-name" title={m.title}>
                                                  <span className="metric-content">
                                                    <span className="metric-icon" style={{ backgroundColor: m.color }}>{m.icon}</span>
                                                    {m.label}
                                                  </span>
                                                </td>
                                                <td className="score-cell">{fVal != null ? `${fVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${fBand.className}`}>{fBand.label}</span></td>
                                                <td className="score-cell">{hVal != null ? `${hVal}%` : '—'}</td>
                                                <td className="score-cell"><span className={`score-band ${hBand.className}`}>{hBand.label}</span></td>
                                                <td className={`delta-cell ${d.className}`}>
                                                  <span className="delta-icon">{d.icon}</span> {d.text}
                                                </td>
                                                <td className="status-cell">
                                                  <span className={`alert-badge ${alert.className}`}>{alert.icon} {alert.text}</span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>

                                {ptBarItems.length > 0 && (
                                  <div className="report-card">
                                    <div className="report-card-header">
                                      <h3 className="report-card-title">
                                        <span className="report-icon">📈</span>
                                        Visual Comparison — Physical
                                      </h3>
                                      <p className="report-card-subtitle">Facility (blue) vs. At-Home (green) performance</p>
                                    </div>
                                    <div className="report-card-body">
                                      <div className="diag-bar-chart">
                                        {ptBarItems.map((item, idx) => (
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
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Trend Chart (if multiple assessments) */}
                      {diagComparisonData.has_facility_data && diagComparisonHistory.length > 1 && (
                        <div className="report-card">
                          <div className="report-card-header">
                            <h3 className="report-card-title">
                              <span className="report-icon">📉</span>
                              Score Trends Over Time
                            </h3>
                            <p className="report-card-subtitle">Facility assessment scores across {diagComparisonHistory.length} assessments</p>
                            <button className="diag-trend-toggle" onClick={() => setShowTrendChart(!showTrendChart)}>
                              {showTrendChart ? 'Hide Chart' : 'Show Chart'}
                            </button>
                          </div>
                          {showTrendChart && (
                            <div className="report-card-body">
                              <div className="diag-trend-chart">
                                {/* CSS-based line chart using positioned dots */}
                                <div className="diag-trend-grid">
                                  {/* Y-axis labels */}
                                  <div className="diag-trend-yaxis">
                                    {[100, 75, 50, 25, 0].map(v => (
                                      <span key={v} className="diag-trend-ylabel">{v}%</span>
                                    ))}
                                  </div>
                                  <div className="diag-trend-area">
                                    {/* Grid lines */}
                                    <div className="diag-trend-gridlines">
                                      {[0, 25, 50, 75, 100].map(v => (
                                        <div key={v} className="diag-trend-gridline" style={{ bottom: `${v}%` }}></div>
                                      ))}
                                    </div>
                                    {/* Data points for each metric */}
                                    {[
                                      { key: 'fluency_score', label: 'Fluency', color: '#FF9800' },
                                      { key: 'receptive_score', label: 'Receptive', color: '#2196F3' },
                                      { key: 'expressive_score', label: 'Expressive', color: '#9C27B0' },
                                    ].map(metric => (
                                      <div key={metric.key} className="diag-trend-series">
                                        {diagComparisonHistory.map((entry, idx) => {
                                          const val = entry[metric.key];
                                          if (val == null) return null;
                                          const left = diagComparisonHistory.length > 1 ? (idx / (diagComparisonHistory.length - 1)) * 100 : 50;
                                          return (
                                            <div
                                              key={idx}
                                              className="diag-trend-dot"
                                              style={{
                                                left: `${left}%`,
                                                bottom: `${val}%`,
                                                backgroundColor: metric.color
                                              }}
                                              title={`${metric.label}: ${val}% (${new Date(entry.assessment_date).toLocaleDateString()})`}
                                            >
                                              <span className="diag-trend-dot-label">{val}</span>
                                            </div>
                                          );
                                        })}
                                        {/* Connecting lines via SVG */}
                                        <svg className="diag-trend-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                          <polyline
                                            fill="none"
                                            stroke={metric.color}
                                            strokeWidth="0.5"
                                            strokeOpacity="0.6"
                                            points={diagComparisonHistory
                                              .map((entry, idx) => {
                                                const val = entry[metric.key];
                                                if (val == null) return null;
                                                const x = diagComparisonHistory.length > 1 ? (idx / (diagComparisonHistory.length - 1)) * 100 : 50;
                                                return `${x},${100 - val}`;
                                              })
                                              .filter(Boolean)
                                              .join(' ')}
                                          />
                                        </svg>
                                      </div>
                                    ))}
                                    {/* X-axis labels */}
                                    <div className="diag-trend-xaxis">
                                      {diagComparisonHistory.map((entry, idx) => (
                                        <span
                                          key={idx}
                                          className="diag-trend-xlabel"
                                          style={{ left: `${diagComparisonHistory.length > 1 ? (idx / (diagComparisonHistory.length - 1)) * 100 : 50}%` }}
                                        >
                                          {new Date(entry.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="diag-trend-legend">
                                  <span className="diag-legend-item"><span className="diag-legend-dot" style={{ background: '#FF9800' }}></span> Fluency</span>
                                  <span className="diag-legend-item"><span className="diag-legend-dot" style={{ background: '#2196F3' }}></span> Receptive</span>
                                  <span className="diag-legend-item"><span className="diag-legend-dot" style={{ background: '#9C27B0' }}></span> Expressive</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommended Focus Areas */}
                      {diagComparisonData.has_facility_data && diagComparisonData.recommended_focus && diagComparisonData.recommended_focus.length > 0 && (
                        <div className="report-card diag-focus-card">
                          <div className="report-card-header">
                            <h3 className="report-card-title">
                              <span className="report-icon">🎯</span>
                              Recommended Focus Areas
                            </h3>
                          </div>
                          <div className="report-card-body">
                            <div className="diag-focus-list">
                              {diagComparisonData.recommended_focus.map((focus, idx) => (
                                <div key={idx} className="diag-focus-item">
                                  <span className="diag-focus-bullet">•</span>
                                  <span>{focus}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Therapist Notes */}
                      {diagComparisonData.has_facility_data && diagComparisonData.notes && (
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
                                    {diag.severity_level && (
                                      <span className={`diag-severity diag-severity-${diag.severity_level}`} style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                                        {diag.severity_level.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    className="diag-history-delete"
                                    onClick={() => setShowDeleteConfirmModal(diag)}
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
                </>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(null)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                    <div className="modal-header">
                      <h2>Confirm Deletion</h2>
                      <button className="modal-close" onClick={() => setShowDeleteConfirmModal(null)}>×</button>
                    </div>
                    <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                      <p style={{ fontSize: '1.05rem', color: '#374151', marginBottom: '0.5rem' }}>
                        Are you sure you want to delete this diagnostic?
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        Assessment from <strong>{new Date(showDeleteConfirmModal.assessment_date).toLocaleDateString()}</strong>
                        {' '}({showDeleteConfirmModal.assessment_type})
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: '0.75rem' }}>
                        This action cannot be undone.
                      </p>
                    </div>
                    <div className="modal-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
                      <button className="secondary-btn" onClick={() => setShowDeleteConfirmModal(null)}>Cancel</button>
                      <button
                        className="primary-btn"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={() => handleDeleteDiagnostic(showDeleteConfirmModal._id)}
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pre-evaluation' && (
            <div className="preval-therapist-section">
              <div className="preval-center-wrapper">

                {/* Header */}
                <div className="preval-dt-header">
                  <div>
                    <h2 className="preval-dt-title">🩺 Pre-Evaluation / Initial Diagnostic</h2>
                    <p className="preval-dt-subtitle">Patients who completed the self-reported intake wizard</p>
                  </div>
                  <div className="preval-dt-count">
                    <span className="preval-count-badge">{preEvalPatientList.length}</span>
                    <span>patients</span>
                  </div>
                </div>

                {/* Controls row */}
                <div className="preval-controls-row">
                  <input
                    type="text"
                    className="preval-filter-input"
                    placeholder="🔍 Filter by name or email..."
                    value={preEvalTableFilter}
                    onChange={(e) => { setPreEvalTableFilter(e.target.value); setPreEvalCurrentPage(1); }}
                  />
                  <div className="pagination-controls">
                    <label className="entries-label">
                      Show:
                      <select
                        className="entries-select"
                        value={preEvalEntriesPerPage}
                        onChange={(e) => { setPreEvalEntriesPerPage(Number(e.target.value)); setPreEvalCurrentPage(1); }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                      entries
                    </label>
                  </div>
                </div>

                {/* Datatable */}
                {preEvalLoading ? (
                  <SectionLoading>
                    <SkeletonTable rows={5} cols={4} />
                  </SectionLoading>
                ) : preEvalPatientList.length === 0 ? (
                  <div className="no-data-large">
                    <div className="no-data-icon">🩺</div>
                    <p className="no-data-text">No completed evaluations yet</p>
                    <p className="no-data-hint">Patients who complete the self-reported intake wizard will appear here automatically</p>
                  </div>
                ) : (() => {
                  const filtered = preEvalPatientList.filter(entry =>
                    !preEvalTableFilter ||
                    `${entry.patient.firstName} ${entry.patient.lastName}`.toLowerCase().includes(preEvalTableFilter.toLowerCase()) ||
                    entry.patient.email?.toLowerCase().includes(preEvalTableFilter.toLowerCase())
                  );
                  const totalPages = Math.max(1, Math.ceil(filtered.length / preEvalEntriesPerPage));
                  const safePage = Math.min(preEvalCurrentPage, totalPages);
                  const pageEntries = filtered.slice((safePage - 1) * preEvalEntriesPerPage, safePage * preEvalEntriesPerPage);

                  return (
                    <>
                      <div className="datatable-container">
                        <table className="logs-table preval-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Patient</th>
                              <th>Email</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageEntries.map((entry, idx) => {
                              const { patient } = entry;
                              const rowNum = (safePage - 1) * preEvalEntriesPerPage + idx + 1;
                              const initials = `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase();
                              return (
                                <tr key={patient._id || patient.id} className="preval-row">
                                  <td className="preval-num">{rowNum}</td>
                                  <td>
                                    <div className="patient-cell">
                                      <div className="patient-avatar-small">{initials}</div>
                                      <span className="patient-name-text">{patient.firstName} {patient.lastName}</span>
                                    </div>
                                  </td>
                                  <td><span className="email-text">{patient.email}</span></td>
                                  <td>
                                    <button
                                      className="preval-view-btn"
                                      onClick={() => setPreEvalModalEntry(entry)}
                                    >
                                      👁️ View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination footer */}
                      <div className="pagination-footer">
                        <span className="pagination-info">
                          Showing {Math.min((safePage - 1) * preEvalEntriesPerPage + 1, filtered.length)}–{Math.min(safePage * preEvalEntriesPerPage, filtered.length)} of {filtered.length} patients
                        </span>
                        <div className="pagination-buttons">
                          <button className="pagination-btn" disabled={safePage === 1} onClick={() => setPreEvalCurrentPage(1)}>«</button>
                          <button className="pagination-btn" disabled={safePage === 1} onClick={() => setPreEvalCurrentPage(p => p - 1)}>‹</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                            .reduce((acc, p, i, arr) => {
                              if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, i) =>
                              p === '...' ? (
                                <span key={`ellipsis-${i}`} className="pagination-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
                              ) : (
                                <button key={p} className={`pagination-btn${p === safePage ? ' active' : ''}`} onClick={() => setPreEvalCurrentPage(p)}>{p}</button>
                              )
                            )
                          }
                          <button className="pagination-btn" disabled={safePage === totalPages} onClick={() => setPreEvalCurrentPage(p => p + 1)}>›</button>
                          <button className="pagination-btn" disabled={safePage === totalPages} onClick={() => setPreEvalCurrentPage(totalPages)}>»</button>
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>
          )}

          {/* Pre-Evaluation Self-Report Modal */}
          {preEvalModalEntry && (() => {
            const { patient, selfReport: r } = preEvalModalEntry;
            const modalInitials = `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase();
            const focusLabel = { speech: 'Speech Therapy', physical: 'Physical Therapy', both: 'Speech + Physical' };

            const physicalFields = [
              r?.strokeTimeframe && { icon: '🕐', label: 'Stroke Timeframe', value: { less_than_1_month: '< 1 Month', '1_to_6_months': '1–6 Months', '6_to_12_months': '6–12 Months', over_1_year: 'Over 1 Year' }[r.strokeTimeframe] ?? r.strokeTimeframe },
              r?.affectedSide && { icon: '🧠', label: 'Affected Side', value: { left: 'Left Side', right: 'Right Side', both: 'Both Sides', unknown: 'Not Sure' }[r.affectedSide] ?? r.affectedSide },
              r?.mobilityStatus && { icon: '🚶', label: 'Mobility', value: { independent: 'Walks Independently', assisted: 'With Assistance', wheelchair: 'Wheelchair User', bed_bound: 'Bed-bound' }[r.mobilityStatus] ?? r.mobilityStatus },
              r?.balanceIssues != null && { icon: '⚖️', label: 'Balance Issues', value: r.balanceIssues ? 'Yes' : 'No' },
              r?.armMotorFunction && { icon: '💪', label: 'Arm Motor', value: { normal: 'Normal', mild_weakness: 'Mild Weakness', moderate_weakness: 'Moderate Weakness', severe_weakness: 'Severe / No Movement' }[r.armMotorFunction] ?? r.armMotorFunction },
              r?.legMotorFunction && { icon: '🦵', label: 'Leg Motor', value: { normal: 'Normal', mild_weakness: 'Mild Weakness', moderate_weakness: 'Moderate Weakness', severe_weakness: 'Severe / No Movement' }[r.legMotorFunction] ?? r.legMotorFunction },
              r?.spasticity != null && { icon: '⚡', label: 'Spasticity', value: r.spasticity ? 'Present' : 'None' },
              r?.priorPhysicalTherapy && { icon: '📋', label: 'Prior Physical Therapy', value: r.priorPhysicalTherapy === 'facility' ? 'At a Facility' : r.priorPhysicalTherapy === 'self_guided' ? 'Self-Guided' : 'No' },
            ].filter(Boolean);

            const speechFields = [
              r?.childAgeGroup && { icon: '🎂', label: 'Age Group', value: { toddler: '1–2 Years (Toddler)', preschool: '3–4 Years (Preschool)', school_age: '5–8 Years (School-Age)', older: '9+ Years' }[r.childAgeGroup] ?? r.childAgeGroup },
              r?.childCommunicationMode && { icon: '💬', label: 'Communication Mode', value: { preverbal: 'Pre-verbal / Non-verbal', single_words: 'Single Words', short_phrases: 'Short Phrases', sentences: 'Full Sentences' }[r.childCommunicationMode] ?? r.childCommunicationMode },
              r?.speechIntelligibility && { icon: '🗣️', label: 'Speech Intelligibility', value: { easily: 'Easily Understood', mostly_family: 'Mostly by Family', difficult: 'Difficult to Understand', not_speaking: 'Not Yet Speaking' }[r.speechIntelligibility] ?? r.speechIntelligibility },
              r?.mainSpeechConcern && { icon: '🔍', label: 'Main Concern', value: { articulation: 'Pronunciation', language: 'Language', fluency: 'Fluency', multiple: 'Multiple Areas' }[r.mainSpeechConcern] ?? r.mainSpeechConcern },
              r?.followsInstructions && { icon: '📝', label: 'Follows Instructions', value: { yes_consistently: 'Yes, Consistently', sometimes: 'Sometimes', rarely: 'Rarely', no: 'No / Not Yet' }[r.followsInstructions] ?? r.followsInstructions },
              r?.respondsToName && { icon: '👂', label: 'Responds to Name', value: { always: 'Always', usually: 'Usually', inconsistently: 'Inconsistently', rarely_no: 'Rarely / No' }[r.respondsToName] ?? r.respondsToName },
              r?.priorSpeechEval && { icon: '📊', label: 'Prior Speech Eval', value: { formal_eval: 'Formal Evaluation', informal: 'Informal Screening', no: 'None' }[r.priorSpeechEval] ?? r.priorSpeechEval },
              r?.primarySpeechGoal && { icon: '🎯', label: 'Primary Goal', value: r.primarySpeechGoal },
            ].filter(Boolean);

            const hasPhysical = (r?.therapyFocus === 'physical' || r?.therapyFocus === 'both') && physicalFields.length > 0;
            const hasSpeech = (r?.therapyFocus === 'speech' || r?.therapyFocus === 'both') && speechFields.length > 0;

            return (
              <div className="modal-overlay" onClick={() => setPreEvalModalEntry(null)}>
                <div className="modal-content preval-modal" onClick={(e) => e.stopPropagation()}>

                  {/* Hero Header */}
                  <div className="preval-modal-hero">
                    <div className={`preval-modal-avatar-lg preval-avatar-${r?.therapyFocus ?? 'default'}`}>{modalInitials}</div>
                    <div className="preval-modal-hero-info">
                      <h2 className="preval-modal-hero-name">{patient.firstName} {patient.lastName}</h2>
                      <p className="preval-modal-hero-email">{patient.email}</p>
                      <div className="preval-modal-hero-badges">
                        <span className="preval-hero-badge preval-hero-badge--self">🩺 Self-Reported</span>
                        {r?.therapyFocus && <span className={`preval-hero-badge preval-hero-badge--focus preval-focus-${r.therapyFocus}`}>{focusLabel[r.therapyFocus] ?? r.therapyFocus}</span>}
                        {r?.recommendedLevel && <span className={`preval-hero-badge preval-hero-badge--level preval-level-${r.recommendedLevel}`}>{r.recommendedLevel.charAt(0).toUpperCase() + r.recommendedLevel.slice(1)} Level</span>}
                      </div>
                    </div>
                    <div className="preval-modal-hero-actions">
                      <button
                        className="btn-export-pdf preval-hero-export-btn"
                        onClick={() => handleExportPreEvalPdf(preEvalModalEntry)}
                        title="Export patient pre-evaluation to PDF"
                      >
                        📄 Export PDF
                      </button>
                      <button className="modal-close preval-modal-close-btn" onClick={() => setPreEvalModalEntry(null)}>×</button>
                    </div>
                  </div>

                  <div className="modal-body preval-modal-body">
                    {r?.completedWizard ? (
                      <>
                        {/* General Section */}
                        <div className="preval-section">
                          <div className="preval-section-header preval-section-general">
                            <span>📋</span>
                            <h3>General Information</h3>
                          </div>
                          <div className="preval-section-grid">
                            {r.hasInitialDiagnostic != null && (
                              <div className="preval-field-card">
                                <span className="preval-field-icon">🏥</span>
                                <span className="preval-field-label">Facility Visit</span>
                                <span className="preval-field-value">{r.hasInitialDiagnostic ? 'Yes — Visited Facility' : 'No — Not Yet'}</span>
                              </div>
                            )}
                            {r.therapyFocus && (
                              <div className="preval-field-card">
                                <span className="preval-field-icon">🎯</span>
                                <span className="preval-field-label">Therapy Focus</span>
                                <span className="preval-field-value">{focusLabel[r.therapyFocus] ?? r.therapyFocus}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Physical Section */}
                        {hasPhysical && (
                          <div className="preval-section">
                            <div className="preval-section-header preval-section-physical">
                              <span>🏃</span>
                              <h3>Physical Therapy Assessment</h3>
                            </div>
                            <div className="preval-section-grid">
                              {physicalFields.map((f, i) => (
                                <div key={i} className="preval-field-card">
                                  <span className="preval-field-icon">{f.icon}</span>
                                  <span className="preval-field-label">{f.label}</span>
                                  <span className="preval-field-value">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Speech Section */}
                        {hasSpeech && (
                          <div className="preval-section">
                            <div className="preval-section-header preval-section-speech">
                              <span>🗣️</span>
                              <h3>Speech Therapy Assessment</h3>
                            </div>
                            <div className="preval-section-grid">
                              {speechFields.map((f, i) => (
                                <div key={i} className="preval-field-card">
                                  <span className="preval-field-icon">{f.icon}</span>
                                  <span className="preval-field-label">{f.label}</span>
                                  <span className="preval-field-value">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendation Banner */}
                        {r.recommendedFocus && (
                          <div className={`preval-rec-banner preval-rec-banner--${r.therapyFocus ?? 'default'}`}>
                            <div className="preval-rec-banner-icon">⭐</div>
                            <div className="preval-rec-banner-body">
                              <span className="preval-rec-banner-title">Recommended Starting Point</span>
                              <div className="preval-rec-banner-tags">
                                <span className="preval-rec-tag preval-rec-tag--therapy">{ { speech: 'Speech Therapy', physical: 'Physical Therapy', both: 'Both Therapies' }[r.recommendedTherapy] ?? 'Therapy' }</span>
                                {r.recommendedLevel && <span className="preval-rec-tag preval-rec-tag--level">{r.recommendedLevel.charAt(0).toUpperCase() + r.recommendedLevel.slice(1)} Level</span>}
                                {r.recommendedLevelName && <span className="preval-rec-tag preval-rec-tag--sublevel">{r.recommendedLevelName}</span>}
                              </div>
                              <span className="preval-rec-banner-focus">{r.recommendedFocus}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="no-data-large" style={{ padding: '3rem 1rem' }}>
                        <div className="no-data-icon">📋</div>
                        <p className="no-data-text">No self-diagnostic data found</p>
                        <p className="no-data-hint">This patient has not yet completed the initial self-assessment wizard</p>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button className="secondary-btn" onClick={() => setPreEvalModalEntry(null)}>Close</button>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>
        </div>
      </div>

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
                  If multiple images are uploaded, they appear one at a time in the landing carousel with the same story description.
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
                          src={imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}/${imagePath}`} 
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

              <div className="form-group">
                <label>Recommended Focus Areas</label>
                <textarea
                  rows="2"
                  placeholder="Enter focus areas separated by commas (e.g., R sound in initial position, Fluency pacing)"
                  value={(newDiagnostic.recommended_focus || []).join(', ')}
                  onChange={(e) => setNewDiagnostic({
                    ...newDiagnostic,
                    recommended_focus: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
                <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Separate multiple focus areas with commas
                </small>
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
