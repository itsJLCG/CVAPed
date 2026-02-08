import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { successStoryAPI, therapistAPI, appointmentAPI, diagnosticComparisonAPI } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const { width, height } = Dimensions.get('window');

// ==================== DIAGNOSTIC TAB STYLES ====================
const diagStyles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  searchItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchItemAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C9302C',
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchItemEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  selectedPatientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedPatientText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  addDiagButton: {
    backgroundColor: '#C9302C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addDiagButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  assessmentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C9302C',
  },
  assessmentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  assessmentMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  assessmentDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  assessorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  assessorText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369a1',
  },
  insightStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  insightStatBox: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  insightStatValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  insightStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  insightCountsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  insightCountBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  insightCountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  insightCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  insightAreasContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
    gap: 6,
  },
  insightAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightAreaIcon: {
    fontSize: 14,
  },
  insightAreaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  insightAreaValue: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderCellCenter: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    flex: 2,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  recommendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  recommendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recommendBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9302C',
  },
  recommendText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9302C',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  historyMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  historyViewText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '600',
  },
  historyDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalSectionDivider: {
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  scoreGridItem: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scoreGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  scoreGridInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    color: '#1e293b',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
  },
  scoreInputLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  scoreInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#C9302C',
  },
  modalSaveText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

const TherapistDashboard = ({ onLogout, onNavigate }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('receptive');
  const [activeProgressTab, setActiveProgressTab] = useState('physical');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Patient Progress states
  const [fluencyProgress, setFluencyProgress] = useState([]);
  const [languageProgress, setLanguageProgress] = useState([]);
  const [receptiveProgress, setReceptiveProgress] = useState([]);
  const [articulationProgress, setArticulationProgress] = useState([]);
  
  // Fluency states
  const [fluencyExercises, setFluencyExercises] = useState({});
  const [showFluencyModal, setShowFluencyModal] = useState(false);
  const [editingFluency, setEditingFluency] = useState(null);
  const [newFluency, setNewFluency] = useState({
    level: 1,
    type: 'controlled-breathing',
    instruction: '',
    target: '',
    expected_duration: 3,
    breathing: true,
    order: 1,
    is_active: true
  });
  
  // Language states
  const [languageExercises, setLanguageExercises] = useState({});
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [newLanguage, setNewLanguage] = useState({
    level: 1,
    type: 'description',
    instruction: '',
    prompt: '',
    expected_keywords: '',
    min_words: 5,
    order: 1,
    is_active: true
  });
  
  // Receptive states
  const [receptiveExercises, setReceptiveExercises] = useState({});
  const [showReceptiveModal, setShowReceptiveModal] = useState(false);
  const [editingReceptive, setEditingReceptive] = useState(null);
  const [newReceptive, setNewReceptive] = useState({
    level: 1,
    type: 'vocabulary',
    instruction: '',
    target: '',
    options: [
      { text: '', emoji: '' },
      { text: '', emoji: '' },
      { text: '', emoji: '' },
      { text: '', emoji: '' }
    ],
    correct_answer: 0,
    order: 1,
    is_active: true
  });
  
  // Articulation states
  const [articulationExercises, setArticulationExercises] = useState({});
  const [activeSound, setActiveSound] = useState('s');
  const [showArticulationModal, setShowArticulationModal] = useState(false);
  const [editingArticulation, setEditingArticulation] = useState(null);
  const [newArticulation, setNewArticulation] = useState({
    sound_id: 's',
    level: 1,
    target: '',
    order: 1,
    is_active: true
  });

  // Success Story states
  const [successStories, setSuccessStories] = useState([]);
  const [showSuccessStoryModal, setShowSuccessStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [newStory, setNewStory] = useState({
    patientName: '',
    story: '',
    images: []
  });

  // Reports states
  const [reportsData, setReportsData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Scheduling states
  const [therapistAppointments, setTherapistAppointments] = useState([]);
  const [unassignedAppointments, setUnassignedAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [schedulingSubTab, setSchedulingSubTab] = useState('my'); // 'my', 'unassigned'
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [showAppointmentDetailModal, setShowAppointmentDetailModal] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({
    patient_id: '',
    patient_name: '',
    therapy_type: 'articulation',
    appointment_date: new Date(),
    appointment_time: new Date(),
    duration: 60,
    notes: '',
  });
  const [showApptDatePicker, setShowApptDatePicker] = useState(false);
  const [showApptTimePicker, setShowApptTimePicker] = useState(false);

  // Diagnostic Comparison states
  const [diagComparisonData, setDiagComparisonData] = useState(null);
  const [diagPatientDiagnostics, setDiagPatientDiagnostics] = useState([]);
  const [diagComparisonHistory, setDiagComparisonHistory] = useState([]);
  const [loadingDiagComparison, setLoadingDiagComparison] = useState(false);
  const [diagSearchQuery, setDiagSearchQuery] = useState('');
  const [diagSearchResults, setDiagSearchResults] = useState([]);
  const [showDiagPatientDropdown, setShowDiagPatientDropdown] = useState(false);
  const [searchingDiagPatients, setSearchingDiagPatients] = useState(false);
  const [selectedDiagPatient, setSelectedDiagPatient] = useState(null);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);
  const [showDeleteDiagConfirm, setShowDeleteDiagConfirm] = useState(null);
  const [showDiagDatePicker, setShowDiagDatePicker] = useState(false);
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

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'fluency') {
      loadFluencyExercises();
    } else if (activeTab === 'progress') {
      loadPatientProgress();
    } else if (activeTab === 'language' && activeSubTab === 'expressive') {
      loadLanguageExercises();
    } else if (activeTab === 'language' && activeSubTab === 'receptive') {
      loadReceptiveExercises();
    } else if (activeTab === 'articulation') {
      loadArticulationExercises();
    } else if (activeTab === 'success-stories') {
      loadSuccessStories();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'scheduling') {
      loadTherapistAppointments();
      loadUnassignedAppointments();
    } else if (activeTab === 'diagnostic') {
      // Keep selectedDiagPatient if already set; otherwise no auto-load
    }
  }, [activeTab, activeSubTab]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'fluency') {
      await loadFluencyExercises();
    } else if (activeTab === 'language' && activeSubTab === 'expressive') {
      await loadLanguageExercises();
    } else if (activeTab === 'language' && activeSubTab === 'receptive') {
      await loadReceptiveExercises();
    } else if (activeTab === 'articulation') {
      await loadArticulationExercises();
    } else if (activeTab === 'success-stories') {
      await loadSuccessStories();
    }
    setRefreshing(false);
  };

  // ==================== FLUENCY FUNCTIONS ====================
  const loadFluencyExercises = async () => {
    setLoading(true);
    try {
      const data = await api.therapyAPI.fluency.getAll();
      
      console.log('📥 Fluency API Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        // Group exercises by level
        const grouped = {};
        data.exercises.forEach(ex => {
          console.log('Exercise data:', {
            id: ex._id,
            level: ex.level,
            type: ex.type,
            level_type: typeof ex.level,
            type_type: typeof ex.type,
            hasLevel: 'level' in ex,
            hasType: 'type' in ex,
            allKeys: Object.keys(ex)
          });
          
          if (!grouped[ex.level]) {
            grouped[ex.level] = {
              name: ex.level_name,
              color: ex.level_color,
              exercises: []
            };
          }
          grouped[ex.level].exercises.push(ex);
        });
        setFluencyExercises(grouped);
      }
    } catch (error) {
      console.error('Failed to load fluency exercises:', error);
      Alert.alert('Error', 'Failed to load fluency exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedFluency = async () => {
    Alert.alert(
      'Seed Fluency Exercises',
      'This will add default fluency exercises to the database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const data = await api.therapyAPI.fluency.seed();
              
              if (data.success) {
                Alert.alert('Success', `Seeded ${data.count} exercises!`);
                loadFluencyExercises();
              } else {
                Alert.alert('Error', data.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to seed exercises');
            }
          }
        }
      ]
    );
  };

  const toggleFluencyActive = async (exerciseId, currentStatus) => {
    try {
      const data = await api.therapyAPI.fluency.toggleActive(exerciseId);
      
      if (data.success) {
        loadFluencyExercises();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle exercise status');
    }
  };

  const deleteFluencyExercise = async (exerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await api.therapyAPI.fluency.delete(exerciseId);
              
              if (data.success) {
                Alert.alert('Success', 'Exercise deleted');
                loadFluencyExercises();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            }
          }
        }
      ]
    );
  };

  const handleCreateFluency = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (fluencyExercises[newFluency.level]) {
        const duplicateOrder = fluencyExercises[newFluency.level].exercises.find(
          ex => ex.order === newFluency.order
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(fluencyExercises, newFluency.level);
          Alert.alert(
            'Duplicate Order',
            `Order ${newFluency.order} already exists in Level ${newFluency.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      const data = await api.therapyAPI.fluency.create(newFluency);
      
      if (data.success) {
        setShowFluencyModal(false);
        setNewFluency({
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
        Alert.alert('Success', 'Exercise created successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateFluency = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (fluencyExercises[editingFluency.level]) {
        const duplicateOrder = fluencyExercises[editingFluency.level].exercises.find(
          ex => ex.order === editingFluency.order && ex._id !== editingFluency._id
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(fluencyExercises, editingFluency.level, editingFluency._id);
          Alert.alert(
            'Duplicate Order',
            `Order ${editingFluency.order} already exists in Level ${editingFluency.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Send only the editable fields
      const updates = {
        level: editingFluency.level,
        type: editingFluency.type,
        instruction: editingFluency.instruction,
        target: editingFluency.target,
        expected_duration: editingFluency.expected_duration,
        breathing: editingFluency.breathing,
        order: editingFluency.order,
        is_active: editingFluency.is_active
      };
      
      const data = await api.therapyAPI.fluency.update(editingFluency._id, updates);
      
      if (data.success) {
        setEditingFluency(null);
        loadFluencyExercises();
        Alert.alert('Success', 'Exercise updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const openAddFluencyModal = () => {
    setEditingFluency(null);
    setShowFluencyModal(true);
  };

  // Helper to get level display name
  const getLevelName = (level) => {
    const levels = {
      1: 'Level 1 - Breathing & Single Words',
      2: 'Level 2 - Short Phrases',
      3: 'Level 3 - Complete Sentences',
      4: 'Level 4 - Reading Passages',
      5: 'Level 5 - Spontaneous Speech'
    };
    return levels[level] || 'Unknown Level';
  };

  // Helper to get type display name
  const getTypeName = (type) => {
    const types = {
      'controlled-breathing': 'Controlled Breathing',
      'short-phrase': 'Short Phrase',
      'sentence': 'Sentence',
      'passage': 'Passage',
      'spontaneous': 'Spontaneous'
    };
    return types[type] || type;
  };

  // Helper for Language level names
  const getLanguageLevelName = (level) => {
    const levels = {
      1: 'Level 1 - Picture Description',
      2: 'Level 2 - Sentence Formation',
      3: 'Level 3 - Story Retell'
    };
    return levels[level] || 'Unknown Level';
  };

  // Helper for Language type names
  const getLanguageTypeName = (type) => {
    const types = {
      'description': 'Description',
      'sentence': 'Sentence',
      'retell': 'Retell'
    };
    return types[type] || type;
  };

  // Helper for Receptive level names
  const getReceptiveLevelName = (level) => {
    const levels = {
      1: 'Level 1 - Vocabulary',
      2: 'Level 2 - Directions',
      3: 'Level 3 - Comprehension'
    };
    return levels[level] || 'Unknown Level';
  };

  // Helper for Receptive type names
  const getReceptiveTypeName = (type) => {
    const types = {
      'vocabulary': 'Vocabulary',
      'directions': 'Directions',
      'comprehension': 'Comprehension'
    };
    return types[type] || type;
  };

  // Helper for Articulation level names
  const getArticulationLevelName = (level) => {
    const levels = {
      1: 'Level 1 - Sound',
      2: 'Level 2 - Syllable',
      3: 'Level 3 - Word',
      4: 'Level 4 - Phrase',
      5: 'Level 5 - Sentence'
    };
    return levels[level] || 'Unknown Level';
  };

  // Helper for Articulation sound names
  const getArticulationSoundName = (sound) => {
    const sounds = {
      's': 'S Sound',
      'r': 'R Sound',
      'l': 'L Sound',
      'k': 'K Sound',
      'th': 'TH Sound'
    };
    return sounds[sound] || sound;
  };

  // Helper to get available order numbers for a specific level
  const getAvailableOrders = (exercises, selectedLevel, currentEditingId = null) => {
    if (!exercises || !exercises[selectedLevel]) {
      return [1]; // Only suggest next sequential number
    }
    
    const levelExercises = exercises[selectedLevel].exercises || [];
    const usedOrders = levelExercises
      .filter(ex => ex._id !== currentEditingId) // Exclude current exercise when editing
      .map(ex => ex.order)
      .sort((a, b) => a - b);
    
    if (usedOrders.length === 0) {
      return [1];
    }
    
    // Find ALL gaps in sequence and add the next number after max
    const available = [];
    const maxOrder = Math.max(...usedOrders);
    
    // Check for gaps from 1 to max
    for (let i = 1; i <= maxOrder; i++) {
      if (!usedOrders.includes(i)) {
        available.push(i);
      }
    }
    
    // Always add next sequential number after the highest
    available.push(maxOrder + 1);
    
    return available;
  };

  const openEditFluencyModal = (exercise) => {
    // Ensure proper data types for Picker components
    const editData = {
      ...exercise,
      level: exercise.level ? parseInt(exercise.level) : 1,
      order: exercise.order ? parseInt(exercise.order) : 1,
      expected_duration: exercise.expected_duration ? parseInt(exercise.expected_duration) : 3,
      type: exercise.type || 'controlled-breathing',
      instruction: exercise.instruction || '',
      target: exercise.target || '',
      breathing: exercise.breathing !== undefined ? exercise.breathing : false,
      is_active: exercise.is_active !== undefined ? exercise.is_active : true
    };
    
    setEditingFluency(editData);
    setShowFluencyModal(true);
  };

  // ==================== LANGUAGE (EXPRESSIVE) FUNCTIONS ====================
  const loadLanguageExercises = async () => {
    setLoading(true);
    try {
      const data = await api.therapyAPI.language.getAll();
      
      if (data.success) {
        const grouped = {};
        data.exercises.forEach(ex => {
          if (!grouped[ex.level]) {
            grouped[ex.level] = {
              name: ex.level_name,
              color: ex.level_color,
              exercises: []
            };
          }
          grouped[ex.level].exercises.push(ex);
        });
        setLanguageExercises(grouped);
      }
    } catch (error) {
      console.error('Failed to load language exercises:', error);
      Alert.alert('Error', 'Failed to load language exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedLanguage = async () => {
    Alert.alert(
      'Seed Expressive Language Exercises',
      'This will add default exercises. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const data = await api.therapyAPI.language.seed();
              
              if (data.success) {
                Alert.alert('Success', `Seeded ${data.count} exercises!`);
                loadLanguageExercises();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to seed exercises');
            }
          }
        }
      ]
    );
  };

  const toggleLanguageActive = async (exerciseId) => {
    try {
      const data = await api.therapyAPI.language.toggleActive(exerciseId);
      
      if (data.success) {
        loadLanguageExercises();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle exercise status');
    }
  };

  const deleteLanguageExercise = async (exerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.therapyAPI.language.delete(exerciseId);
              loadLanguageExercises();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            }
          }
        }
      ]
    );
  };

  const handleCreateLanguage = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (languageExercises[newLanguage.level]) {
        const duplicateOrder = languageExercises[newLanguage.level].exercises.find(
          ex => ex.order === newLanguage.order
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(languageExercises, newLanguage.level);
          Alert.alert(
            'Duplicate Order',
            `Order ${newLanguage.order} already exists in Level ${newLanguage.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Convert comma-separated keywords to array
      let exerciseData = { ...newLanguage };
      if (typeof exerciseData.expected_keywords === 'string') {
        exerciseData.expected_keywords = exerciseData.expected_keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k);
      }
      
      const data = await api.therapyAPI.language.create(exerciseData);
      
      if (data.success) {
        setShowLanguageModal(false);
        setNewLanguage({
          level: 1,
          order: 1,
          type: 'description',
          instruction: '',
          prompt: '',
          expected_keywords: '',
          min_words: 5,
          is_active: true
        });
        loadLanguageExercises();
        Alert.alert('Success', 'Exercise created successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateLanguage = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (languageExercises[editingLanguage.level]) {
        const duplicateOrder = languageExercises[editingLanguage.level].exercises.find(
          ex => ex.order === editingLanguage.order && ex._id !== editingLanguage._id
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(languageExercises, editingLanguage.level, editingLanguage._id);
          Alert.alert(
            'Duplicate Order',
            `Order ${editingLanguage.order} already exists in Level ${editingLanguage.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Send only the editable fields
      const updates = {
        level: editingLanguage.level,
        order: editingLanguage.order,
        type: editingLanguage.type,
        instruction: editingLanguage.instruction,
        prompt: editingLanguage.prompt,
        expected_keywords: editingLanguage.expected_keywords,
        min_words: editingLanguage.min_words,
        is_active: editingLanguage.is_active
      };
      
      const data = await api.therapyAPI.language.update(editingLanguage._id, updates);
      
      if (data.success) {
        setEditingLanguage(null);
        loadLanguageExercises();
        Alert.alert('Success', 'Exercise updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const openAddLanguageModal = () => {
    setEditingLanguage(null);
    setShowLanguageModal(true);
  };

  const openEditLanguageModal = (exercise) => {
    // Ensure level is a number for the Picker component
    setEditingLanguage({
      ...exercise,
      level: parseInt(exercise.level) || 1,
      order: parseInt(exercise.order) || 1
    });
    setShowLanguageModal(true);
  };

  // ==================== RECEPTIVE FUNCTIONS ====================
  const loadReceptiveExercises = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api.therapyAPI.receptive.getAll(token);
      
      if (data.success) {
        const grouped = {};
        data.exercises.forEach(ex => {
          if (!grouped[ex.level]) {
            grouped[ex.level] = {
              name: ex.level_name,
              color: ex.level_color,
              exercises: []
            };
          }
          grouped[ex.level].exercises.push(ex);
        });
        setReceptiveExercises(grouped);
      }
    } catch (error) {
      console.error('Failed to load receptive exercises:', error);
      Alert.alert('Error', 'Failed to load receptive exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedReceptive = async () => {
    Alert.alert(
      'Seed Receptive Language Exercises',
      'This will add default exercises. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const data = await api.therapyAPI.receptive.seed(token);
              
              if (data.success) {
                Alert.alert('Success', `Seeded ${data.count} exercises!`);
                loadReceptiveExercises();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to seed exercises');
            }
          }
        }
      ]
    );
  };

  const toggleReceptiveActive = async (exerciseId) => {
    try {
      const data = await api.therapyAPI.receptive.toggleActive(exerciseId);
      
      if (data.success) {
        loadReceptiveExercises();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle exercise status');
    }
  };

  const deleteReceptiveExercise = async (exerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.therapyAPI.receptive.delete(exerciseId);
              loadReceptiveExercises();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            }
          }
        }
      ]
    );
  };

  const handleCreateReceptive = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (receptiveExercises[newReceptive.level]) {
        const duplicateOrder = receptiveExercises[newReceptive.level].exercises.find(
          ex => ex.order === newReceptive.order
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(receptiveExercises, newReceptive.level);
          Alert.alert(
            'Duplicate Order',
            `Order ${newReceptive.order} already exists in Level ${newReceptive.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Transform options from form format {text, emoji} to simple strings for backend
      const optionsToSend = newReceptive.options.map(opt => opt.text);
      
      const dataToSend = {
        level: newReceptive.level,
        type: newReceptive.type,
        instruction: newReceptive.instruction,
        target: newReceptive.target,
        options: optionsToSend,
        options_emojis: newReceptive.options.map(opt => opt.emoji),
        correct_answer: newReceptive.correct_answer,
        order: newReceptive.order,
        is_active: newReceptive.is_active
      };
      
      const data = await api.therapyAPI.receptive.create(dataToSend);
      
      if (data.success) {
        setShowReceptiveModal(false);
        setNewReceptive({
          level: 1,
          type: 'vocabulary',
          instruction: '',
          target: '',
          options: [
            { text: '', emoji: '' },
            { text: '', emoji: '' },
            { text: '', emoji: '' },
            { text: '', emoji: '' }
          ],
          correct_answer: 0,
          order: 1,
          is_active: true
        });
        loadReceptiveExercises();
        Alert.alert('Success', 'Exercise created successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateReceptive = async () => {
    try {
      // Validate order is not duplicated in the same level
      if (receptiveExercises[editingReceptive.level]) {
        const duplicateOrder = receptiveExercises[editingReceptive.level].exercises.find(
          ex => ex.order === editingReceptive.order && ex._id !== editingReceptive._id
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(receptiveExercises, editingReceptive.level, editingReceptive._id);
          Alert.alert(
            'Duplicate Order',
            `Order ${editingReceptive.order} already exists in Level ${editingReceptive.level}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Transform options from form format {text, emoji} to simple strings for backend
      const optionsToSend = editingReceptive.options.map(opt => opt.text);
      
      // Send only the editable fields
      const updates = {
        level: editingReceptive.level,
        type: editingReceptive.type,
        instruction: editingReceptive.instruction,
        target: editingReceptive.target,
        options: optionsToSend,
        options_emojis: editingReceptive.options.map(opt => opt.emoji),
        correct_answer: editingReceptive.correct_answer,
        order: editingReceptive.order,
        is_active: editingReceptive.is_active
      };
      
      const data = await api.therapyAPI.receptive.update(editingReceptive._id, updates);
      
      if (data.success) {
        setEditingReceptive(null);
        loadReceptiveExercises();
        Alert.alert('Success', 'Exercise updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const openAddReceptiveModal = () => {
    setEditingReceptive(null);
    setShowReceptiveModal(true);
  };

  const openEditReceptiveModal = (exercise) => {
    // Transform options from backend format (with image/shape) to form format (with emoji)
    const transformedExercise = {
      ...exercise,
      level: parseInt(exercise.level) || 1,
      order: parseInt(exercise.order) || 1,
      options: exercise.options.map(opt => ({
        text: opt.text || '',
        emoji: opt.image || opt.shape || ''
      }))
    };
    setEditingReceptive(transformedExercise);
    setShowReceptiveModal(true);
  };

  // ==================== ARTICULATION FUNCTIONS ====================
  const loadArticulationExercises = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await api.therapyAPI.articulation.getAll(token);
      
      if (data.success) {
        setArticulationExercises(data.exercises_by_sound || {});
      }
    } catch (error) {
      console.error('Failed to load articulation exercises:', error);
      Alert.alert('Error', 'Failed to load articulation exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedArticulation = async () => {
    Alert.alert(
      'Seed Articulation Exercises',
      'This will add default exercises for all sounds. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const data = await api.therapyAPI.articulation.seed(token);
              
              if (data.success) {
                Alert.alert('Success', `Seeded ${data.count} exercises!`);
                loadArticulationExercises();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to seed exercises');
            }
          }
        }
      ]
    );
  };

  const toggleArticulationActive = async (exerciseId) => {
    try {
      const data = await api.therapyAPI.articulation.toggleActive(exerciseId);
      
      if (data.success) {
        loadArticulationExercises();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle exercise status');
    }
  };

  const deleteArticulationExercise = async (exerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.therapyAPI.articulation.delete(exerciseId);
              loadArticulationExercises();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            }
          }
        }
      ]
    );
  };

  const handleCreateArticulation = async () => {
    try {
      // Validate order is not duplicated in the same level for the same sound
      const soundExercises = articulationExercises[newArticulation.sound_id]?.levels || {};
      if (soundExercises[newArticulation.level]) {
        const duplicateOrder = soundExercises[newArticulation.level].exercises.find(
          ex => ex.order === newArticulation.order
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(soundExercises, newArticulation.level);
          Alert.alert(
            'Duplicate Order',
            `Order ${newArticulation.order} already exists in Level ${newArticulation.level} for ${getArticulationSoundName(newArticulation.sound_id)}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      const data = await api.therapyAPI.articulation.create(newArticulation);
      
      if (data.success) {
        setShowArticulationModal(false);
        setNewArticulation({
          sound_id: activeSound,
          level: 1,
          target: '',
          order: 1,
          is_active: false
        });
        loadArticulationExercises();
        Alert.alert('Success', 'Exercise created successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateArticulation = async () => {
    try {
      // Validate order is not duplicated in the same level for the same sound
      const soundExercises = articulationExercises[editingArticulation.sound_id]?.levels || {};
      if (soundExercises[editingArticulation.level]) {
        const duplicateOrder = soundExercises[editingArticulation.level].exercises.find(
          ex => ex.order === editingArticulation.order && ex._id !== editingArticulation._id
        );
        
        if (duplicateOrder) {
          const availableOrders = getAvailableOrders(soundExercises, editingArticulation.level, editingArticulation._id);
          Alert.alert(
            'Duplicate Order',
            `Order ${editingArticulation.order} already exists in Level ${editingArticulation.level} for ${getArticulationSoundName(editingArticulation.sound_id)}.\n\nAvailable orders: ${availableOrders.join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Send only the editable fields
      const updates = {
        sound_id: editingArticulation.sound_id,
        level: editingArticulation.level,
        target: editingArticulation.target,
        order: editingArticulation.order,
        is_active: editingArticulation.is_active
      };
      
      const data = await api.therapyAPI.articulation.update(editingArticulation._id, updates);
      
      if (data.success) {
        setEditingArticulation(null);
        loadArticulationExercises();
        Alert.alert('Success', 'Exercise updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const openAddArticulationModal = () => {
    setEditingArticulation(null);
    setNewArticulation({ ...newArticulation, sound_id: activeSound });
    setShowArticulationModal(true);
  };

  const openEditArticulationModal = (exercise) => {
    // Ensure sound and level fields are properly formatted for Picker
    setEditingArticulation({
      ...exercise,
      level: parseInt(exercise.level) || 1,
      order: parseInt(exercise.order) || 1
    });
    setShowArticulationModal(true);
  };

  // ==================== SUCCESS STORY FUNCTIONS ====================
  const loadSuccessStories = async () => {
    try {
      setLoading(true);
      const response = await successStoryAPI.getAll();
      if (response.success) {
        setSuccessStories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading success stories:', error);
      Alert.alert('Error', 'Failed to load success stories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccessStory = () => {
    setEditingStory(null);
    setNewStory({
      patientName: '',
      story: '',
      images: []
    });
    setShowSuccessStoryModal(true);
  };

  const handleEditSuccessStory = (story) => {
    setEditingStory(story);
    setNewStory({
      patientName: story.patientName,
      story: story.story,
      images: story.images || []
    });
    setShowSuccessStoryModal(true);
  };

  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg'
        }));
        setNewStory(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleRemoveImage = (index) => {
    setNewStory(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveSuccessStory = async () => {
    try {
      if (!newStory.patientName.trim()) {
        Alert.alert('Validation Error', 'Patient name is required');
        return;
      }
      if (!newStory.story.trim()) {
        Alert.alert('Validation Error', 'Success story content is required');
        return;
      }

      const formData = new FormData();
      formData.append('patientName', newStory.patientName.trim());
      formData.append('story', newStory.story.trim());

      // Append images with proper format for React Native
      newStory.images.forEach((image, index) => {
        if (image.uri) {
          // Get file extension from URI or name
          const uriParts = image.uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          formData.append('images', {
            uri: image.uri,
            name: image.name || `image_${Date.now()}_${index}.${fileType}`,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
          });
        }
      });

      let response;
      if (editingStory) {
        response = await successStoryAPI.update(editingStory.id, formData);
      } else {
        console.log('Sending success story with', newStory.images.length, 'images');
        response = await successStoryAPI.create(formData);
      }

      if (response.success) {
        Alert.alert(
          'Success',
          editingStory ? 'Success story updated!' : 'Success story created!'
        );
        setShowSuccessStoryModal(false);
        loadSuccessStories();
      }
    } catch (error) {
      console.error('Error saving success story:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', error.message || error || 'Failed to save success story');
    }
  };

  const handleDeleteSuccessStory = async (storyId) => {
    Alert.alert(
      'Delete Success Story',
      'Are you sure you want to delete this success story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await successStoryAPI.delete(storyId);
              if (response.success) {
                Alert.alert('Success', 'Success story deleted!');
                loadSuccessStories();
              }
            } catch (error) {
              console.error('Error deleting success story:', error);
              Alert.alert('Error', 'Failed to delete success story');
            }
          }
        }
      ]
    );
  };

  // ==================== RENDER FUNCTIONS ====================
  const loadPatientProgress = async () => {
    try {
      setLoading(true);
      const [fluencyRes, languageRes, receptiveRes, articulationRes] = await Promise.all([
        api.therapyAPI.fluency.getAllProgress(),
        api.therapyAPI.language.getAllProgress(),
        api.therapyAPI.receptive.getAllProgress(),
        api.therapyAPI.articulation.getAllProgress()
      ]);
      
      console.log('Fluency Response:', JSON.stringify(fluencyRes, null, 2));
      console.log('Articulation Response:', JSON.stringify(articulationRes, null, 2));
      
      if (fluencyRes.success) setFluencyProgress(fluencyRes.progress || []);
      if (languageRes.success) setLanguageProgress(languageRes.progress || []);
      if (receptiveRes.success) setReceptiveProgress(receptiveRes.progress || []);
      if (articulationRes.success) setArticulationProgress(articulationRes.progress || []);
    } catch (error) {
      console.error('Error loading patient progress:', error);
      Alert.alert('Error', 'Failed to load patient progress');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const response = await api.therapistAPI.getReports();
      if (response.success) {
        setReportsData(response.data || null);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setReportsData(null);
    } finally {
      setLoadingReports(false);
    }
  };

  // ==================== SCHEDULING FUNCTIONS ====================
  const loadTherapistAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const response = await appointmentAPI.therapist.getAppointments();
      if (response.success) {
        setTherapistAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error('Error loading therapist appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadUnassignedAppointments = async () => {
    try {
      const response = await appointmentAPI.therapist.getUnassignedAppointments();
      if (response.success) {
        setUnassignedAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error('Error loading unassigned appointments:', error);
    }
  };

  const handleAssignAppointment = (appointmentId) => {
    Alert.alert(
      'Assign Appointment',
      'Are you sure you want to assign yourself to this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              const response = await appointmentAPI.therapist.assignToAppointment(appointmentId);
              if (response.success) {
                Alert.alert('Success', 'You have been assigned to this appointment');
                loadTherapistAppointments();
                loadUnassignedAppointments();
              }
            } catch (error) {
              console.error('Error assigning appointment:', error);
              Alert.alert('Error', error.message || 'Failed to assign appointment');
            }
          },
        },
      ]
    );
  };

  const handleSearchPatients = async (query) => {
    setPatientSearchQuery(query);
    if (query.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const response = await appointmentAPI.therapist.searchPatients(query);
      if (response.success) {
        setPatientSearchResults(response.patients || []);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setNewAppointmentData({
      ...newAppointmentData,
      patient_id: patient._id,
      patient_name: patient.fullName || `${patient.firstName} ${patient.lastName}`,
    });
    setPatientSearchQuery(patient.fullName || `${patient.firstName} ${patient.lastName}`);
    setPatientSearchResults([]);
  };

  const handleCreateTherapistAppointment = async () => {
    if (!newAppointmentData.patient_id) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    try {
      const date = newAppointmentData.appointment_date;
      const time = newAppointmentData.appointment_time;
      const appointmentDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      );

      const response = await appointmentAPI.therapist.createAppointment({
        patient_id: newAppointmentData.patient_id,
        therapy_type: newAppointmentData.therapy_type,
        appointment_date: appointmentDateTime.toISOString(),
        duration: newAppointmentData.duration,
        notes: newAppointmentData.notes,
      });

      if (response.success) {
        Alert.alert('Success', 'Appointment created successfully');
        setShowCreateAppointmentModal(false);
        setNewAppointmentData({
          patient_id: '',
          patient_name: '',
          therapy_type: 'articulation',
          appointment_date: new Date(),
          appointment_time: new Date(),
          duration: 60,
          notes: '',
        });
        setPatientSearchQuery('');
        loadTherapistAppointments();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', error.message || 'Failed to create appointment');
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const response = await appointmentAPI.therapist.updateAppointment(appointmentId, {
        status: newStatus,
      });
      if (response.success) {
        Alert.alert('Success', `Appointment marked as ${newStatus}`);
        loadTherapistAppointments();
        setShowAppointmentDetailModal(false);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    }
  };

  const handleCancelTherapistAppointment = (appointmentId) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await appointmentAPI.therapist.cancelAppointment(appointmentId);
              if (response.success) {
                Alert.alert('Success', 'Appointment cancelled');
                loadTherapistAppointments();
                setShowAppointmentDetailModal(false);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const getApptStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      scheduled: '#3b82f6',
      confirmed: '#10b981',
      completed: '#059669',
      cancelled: '#6b7280',
      'no-show': '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getApptTherapyIcon = (type) => {
    const icons = {
      articulation: '🗣️',
      language: '💬',
      fluency: '🎯',
      physical: '🏃',
    };
    return icons[type] || '📋';
  };

  // ==================== DIAGNOSTIC COMPARISON FUNCTIONS ====================
  const searchDiagPatients = async (query) => {
    if (!query || query.length < 2) {
      setDiagSearchResults([]);
      setShowDiagPatientDropdown(false);
      return;
    }
    setSearchingDiagPatients(true);
    try {
      const response = await appointmentAPI.therapist.searchPatients(query);
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
    await loadDiagComparison(patient._id || patient.id);
  };

  const loadDiagComparison = async (userId, diagnosticId = null) => {
    setLoadingDiagComparison(true);
    try {
      const [comparisonRes, diagnosticsRes, historyRes] = await Promise.all([
        diagnosticComparisonAPI.getComparison(userId, diagnosticId),
        diagnosticComparisonAPI.getDiagnostics(userId),
        diagnosticComparisonAPI.getComparisonHistory(userId)
      ]);
      setDiagComparisonData(comparisonRes);
      setDiagPatientDiagnostics(diagnosticsRes.diagnostics || []);
      setDiagComparisonHistory(historyRes.history || []);
    } catch (error) {
      console.error('Error loading diagnostic comparison:', error);
      setDiagComparisonData(null);
      setDiagPatientDiagnostics([]);
      setDiagComparisonHistory([]);
    } finally {
      setLoadingDiagComparison(false);
    }
  };

  const handleSaveDiagnostic = async () => {
    if (!selectedDiagPatient) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }
    setSavingDiagnostic(true);
    try {
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

      ['r', 's', 'l', 'th', 'k'].forEach(sound => {
        if (newDiagnostic.articulation_scores[sound] !== '') {
          payload.articulation_scores[sound] = Number(newDiagnostic.articulation_scores[sound]);
        }
      });

      ['stability_score', 'gait_symmetry', 'step_regularity', 'overall_gait'].forEach(key => {
        if (newDiagnostic.gait_scores[key] !== '') {
          payload.gait_scores[key] = Number(newDiagnostic.gait_scores[key]);
        }
      });

      const response = await diagnosticComparisonAPI.createDiagnostic(payload);
      if (response.success) {
        Alert.alert('Success', 'Facility diagnostic saved successfully!');
        setShowDiagModal(false);
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
        await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id);
      }
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      Alert.alert('Error', error.message || 'Failed to save diagnostic');
    } finally {
      setSavingDiagnostic(false);
    }
  };

  const handleDeleteDiagnostic = async (diagnosticId) => {
    Alert.alert(
      'Delete Diagnostic',
      'Are you sure you want to delete this diagnostic? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await diagnosticComparisonAPI.deleteDiagnostic(diagnosticId);
              if (response.success) {
                Alert.alert('Success', 'Diagnostic deleted');
                await loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete diagnostic');
            }
          },
        },
      ]
    );
  };

  const getDiagDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined) return { text: 'N/A', color: '#999', icon: '—' };
    if (delta > 0) return { text: `+${delta}%`, color: '#10b981', icon: '▲' };
    if (delta < 0) return { text: `${delta}%`, color: '#ef4444', icon: '▼' };
    return { text: '0%', color: '#6b7280', icon: '—' };
  };

  const getDiagScoreBand = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', color: '#999' };
    if (score >= 86) return { label: 'Mastered', color: '#10b981' };
    if (score >= 71) return { label: 'Functional', color: '#3b82f6' };
    if (score >= 51) return { label: 'Mild', color: '#f59e0b' };
    if (score >= 31) return { label: 'Moderate', color: '#f97316' };
    return { label: 'Severe', color: '#ef4444' };
  };

  const getDiagAlertBadge = (delta) => {
    if (delta === null || delta === undefined) return { text: 'No Data', color: '#999', icon: '📋' };
    if (delta >= 20) return { text: 'Significant Progress', color: '#10b981', icon: '🎉' };
    if (delta >= 5) return { text: 'Improving', color: '#3b82f6', icon: '📈' };
    if (delta >= -3) return { text: 'Stable', color: '#6b7280', icon: '➡️' };
    if (delta >= -10) return { text: 'Slight Decline', color: '#f59e0b', icon: '⚠️' };
    return { text: 'Regression', color: '#ef4444', icon: '🚨' };
  };

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.welcomeCard}>
        <Ionicons name="person-circle" size={70} color="#C9302C" />
        <Text style={styles.welcomeTitle}>Welcome, Therapist!</Text>
        <Text style={styles.welcomeName}>{user?.firstName || 'User'}</Text>
        <Text style={styles.welcomeSubtitle}>
          Use the tabs below to manage therapy exercises for all speech therapy categories.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={22} color="#C9302C" />
        <Text style={styles.infoText}>
          You can create, edit, activate/deactivate, and delete exercises for:
        </Text>
        <View style={styles.categoryList}>
          <Text style={styles.categoryItem}>• Fluency Therapy (5 levels)</Text>
          <Text style={styles.categoryItem}>• Expressive Language (3 levels)</Text>
          <Text style={styles.categoryItem}>• Receptive Language (3 levels)</Text>
          <Text style={styles.categoryItem}>• Articulation (5 sounds × 5 levels)</Text>
        </View>
      </View>
    </View>
  );

  const renderFluencyTab = () => {
    const levelColors = {
      1: '#e8b04e',
      2: '#479ac3',
      3: '#ce3630',
      4: '#8e44ad',
      5: '#27ae60'
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>Fluency Exercise Management</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.addButton} onPress={openAddFluencyModal}>
              <Ionicons name="add-circle" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedButton} onPress={handleSeedFluency}>
              <Ionicons name="download" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Seed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        ) : (
          <ScrollView 
            style={styles.exercisesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {Object.keys(fluencyExercises).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={60} color="#CCC" />
                <Text style={styles.emptyText}>No exercises yet</Text>
                <Text style={styles.emptySubtext}>Tap "Seed Default" to add exercises</Text>
              </View>
            ) : (
              Object.keys(fluencyExercises).sort((a, b) => Number(a) - Number(b)).map(level => (
                <View key={level} style={styles.levelSection}>
                  <View style={[styles.levelHeader, { backgroundColor: levelColors[level] }]}>
                    <Text style={styles.levelTitle}>Level {level}: {fluencyExercises[level].name}</Text>
                    <Text style={styles.exerciseCount}>
                      {fluencyExercises[level].exercises.length} exercises
                    </Text>
                  </View>
                  
                  {fluencyExercises[level].exercises.map((exercise, idx) => (
                    <View key={exercise._id} style={styles.exerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseId}>{exercise.exercise_id}</Text>
                          <Text style={styles.exerciseType}>{exercise.type}</Text>
                        </View>
                        <View style={styles.exerciseActions}>
                          <TouchableOpacity 
                            onPress={() => toggleFluencyActive(exercise._id, exercise.is_active)}
                            style={[styles.statusBadge, exercise.is_active ? styles.activeBadge : styles.inactiveBadge]}
                          >
                            <Text style={styles.statusText}>
                              {exercise.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => openEditFluencyModal(exercise)}
                            style={styles.editBtn}
                          >
                            <Ionicons name="create-outline" size={18} color="#4A90E2" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => deleteFluencyExercise(exercise._id)}
                            style={styles.deleteBtn}
                          >
                            <Ionicons name="trash" size={18} color="#C9302C" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <Text style={styles.exerciseInstruction}>{exercise.instruction}</Text>
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.detailText}>Target: {exercise.target}</Text>
                        <Text style={styles.detailText}>Duration: {exercise.expected_duration}s</Text>
                        {exercise.breathing && (
                          <View style={styles.breathingBadge}>
                            <Text style={styles.breathingText}>🫁 Breathing</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderLanguageTab = () => {
    const exercises = activeSubTab === 'expressive' ? languageExercises : receptiveExercises;
    const handleSeed = activeSubTab === 'expressive' ? handleSeedLanguage : handleSeedReceptive;
    const handleToggle = activeSubTab === 'expressive' ? toggleLanguageActive : toggleReceptiveActive;
    const handleDelete = activeSubTab === 'expressive' ? deleteLanguageExercise : deleteReceptiveExercise;
    const handleAdd = activeSubTab === 'expressive' ? openAddLanguageModal : openAddReceptiveModal;
    const handleEdit = activeSubTab === 'expressive' ? openEditLanguageModal : openEditReceptiveModal;

    return (
      <View style={styles.tabContent}>
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, activeSubTab === 'receptive' && styles.subTabActive]}
            onPress={() => setActiveSubTab('receptive')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'receptive' && styles.subTabTextActive]}>
              Receptive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, activeSubTab === 'expressive' && styles.subTabActive]}
            onPress={() => setActiveSubTab('expressive')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'expressive' && styles.subTabTextActive]}>
              Expressive
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>
            {activeSubTab === 'expressive' ? 'Expressive' : 'Receptive'} Language
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Ionicons name="add-circle" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
              <Ionicons name="download" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Seed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        ) : (
          <ScrollView 
            style={styles.exercisesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {Object.keys(exercises).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={60} color="#CCC" />
                <Text style={styles.emptyText}>No exercises yet</Text>
                <Text style={styles.emptySubtext}>Tap "Seed" to add exercises</Text>
              </View>
            ) : (
              Object.keys(exercises).sort((a, b) => Number(a) - Number(b)).map(level => (
                <View key={level} style={styles.levelSection}>
                  <View style={[styles.levelHeader, { backgroundColor: exercises[level].color }]}>
                    <Text style={styles.levelTitle}>Level {level}: {exercises[level].name}</Text>
                    <Text style={styles.exerciseCount}>
                      {exercises[level].exercises.length} exercises
                    </Text>
                  </View>
                  
                  {exercises[level].exercises.map((exercise) => (
                    <View key={exercise._id} style={styles.exerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseId}>{exercise.exercise_id}</Text>
                          <Text style={styles.exerciseType}>{exercise.type}</Text>
                        </View>
                        <View style={styles.exerciseActions}>
                          <TouchableOpacity 
                            onPress={() => handleToggle(exercise._id)}
                            style={[styles.statusBadge, exercise.is_active ? styles.activeBadge : styles.inactiveBadge]}
                          >
                            <Text style={styles.statusText}>
                              {exercise.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleEdit(exercise)}
                            style={styles.editBtn}
                          >
                            <Ionicons name="create-outline" size={18} color="#4A90E2" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleDelete(exercise._id)}
                            style={styles.deleteBtn}
                          >
                            <Ionicons name="trash" size={18} color="#C9302C" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <Text style={styles.exerciseInstruction}>{exercise.instruction}</Text>
                      
                      {activeSubTab === 'receptive' && exercise.options && (
                        <View style={styles.optionsContainer}>
                          <Text style={styles.optionsTitle}>Options:</Text>
                          {exercise.options.map((opt) => (
                            <View key={opt.id} style={styles.optionRow}>
                              <Text style={styles.optionEmoji}>{opt.image}</Text>
                              <Text style={styles.optionText}>{opt.text}</Text>
                              {opt.correct && (
                                <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {activeSubTab === 'expressive' && (
                        <View style={styles.exerciseDetails}>
                          {exercise.prompt && <Text style={styles.detailText}>Prompt: {exercise.prompt}</Text>}
                          {exercise.min_words && <Text style={styles.detailText}>Min Words: {exercise.min_words}</Text>}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderArticulationTab = () => {
    const sounds = ['s', 'r', 'l', 'k', 'th'];
    const soundNames = {
      s: 'S Sound',
      r: 'R Sound',
      l: 'L Sound',
      k: 'K Sound',
      th: 'TH Sound'
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>Articulation Exercise Management</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.addButton} onPress={openAddArticulationModal}>
              <Ionicons name="add-circle" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedButton} onPress={handleSeedArticulation}>
              <Ionicons name="download" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Seed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sound Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.soundSelector}>
          {sounds.map(sound => (
            <TouchableOpacity
              key={sound}
              style={[styles.soundTab, activeSound === sound && styles.soundTabActive]}
              onPress={() => setActiveSound(sound)}
            >
              <Text style={[styles.soundTabText, activeSound === sound && styles.soundTabTextActive]}>
                {soundNames[sound]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        ) : (
          <ScrollView 
            style={styles.exercisesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {!articulationExercises[activeSound] ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={60} color="#CCC" />
                <Text style={styles.emptyText}>No exercises for {soundNames[activeSound]}</Text>
                <Text style={styles.emptySubtext}>Tap "Seed" to add exercises</Text>
              </View>
            ) : (
              Object.keys(articulationExercises[activeSound].levels || {}).sort((a, b) => Number(a) - Number(b)).map(level => (
                <View key={level} style={styles.levelSection}>
                  <View style={[styles.levelHeader, { backgroundColor: '#C9302C' }]}>
                    <Text style={styles.levelTitle}>
                      Level {level}: {articulationExercises[activeSound].levels[level].level_name}
                    </Text>
                    <Text style={styles.exerciseCount}>
                      {articulationExercises[activeSound].levels[level].exercises.length} exercises
                    </Text>
                  </View>
                  
                  {articulationExercises[activeSound].levels[level].exercises.map((exercise) => (
                    <View key={exercise._id} style={styles.exerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseId}>{exercise.exercise_id}</Text>
                        </View>
                        <View style={styles.exerciseActions}>
                          <TouchableOpacity 
                            onPress={() => toggleArticulationActive(exercise._id)}
                            style={[styles.statusBadge, exercise.is_active ? styles.activeBadge : styles.inactiveBadge]}
                          >
                            <Text style={styles.statusText}>
                              {exercise.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => openEditArticulationModal(exercise)}
                            style={styles.editBtn}
                          >
                            <Ionicons name="create-outline" size={18} color="#4A90E2" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => deleteArticulationExercise(exercise._id)}
                            style={styles.deleteBtn}
                          >
                            <Ionicons name="trash" size={18} color="#C9302C" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.detailText}>Target: {exercise.target}</Text>
                        <Text style={styles.detailText}>Order: {exercise.order}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderProgressTab = () => {
    const renderProgressList = (progressData, therapyType) => {
      if (progressData.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No patient progress data yet</Text>
          </View>
        );
      }

      return (
        <ScrollView 
          style={styles.progressList}
          contentContainerStyle={styles.progressListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadPatientProgress} />
          }
        >
          {progressData.map((progress, index) => {
            // Ensure all values are primitives (strings/numbers) to avoid rendering errors
            const safeProgress = {
              user_name: String(progress.user_name || 'Unknown Patient'),
              user_email: String(progress.user_email || 'N/A'),
              total_trials: Number(progress.total_trials) || 0,
              completed_trials: Number(progress.completed_trials) || 0,
              average_score: Number(progress.average_score) || 0,
              current_level: Number(progress.current_level) || 0,
              last_trial_date: progress.last_trial_date
            };
            
            return (
            <View key={index} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.progressPatientInfo}>
                  <View style={styles.progressAvatar}>
                    <Text style={styles.progressAvatarText}>
                      {safeProgress.user_name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.progressPatientName}>
                      {safeProgress.user_name}
                    </Text>
                    <Text style={styles.progressPatientEmail}>
                      {safeProgress.user_email}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressStats}>
                  <Text style={styles.progressStatValue}>{safeProgress.total_trials}</Text>
                  <Text style={styles.progressStatLabel}>Trials</Text>
                </View>
              </View>

              <View style={styles.progressDetails}>
                <View style={styles.progressDetailRow}>
                  <View style={styles.progressDetailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.progressDetailLabel}>Completed:</Text>
                    <Text style={[styles.progressDetailValue, {color: '#10B981'}]}>
                      {safeProgress.completed_trials}
                    </Text>
                  </View>
                  <View style={styles.progressDetailItem}>
                    <Ionicons name="trending-up" size={16} color="#3B82F6" />
                    <Text style={styles.progressDetailLabel}>Avg Score:</Text>
                    <Text style={[styles.progressDetailValue, {color: '#3B82F6'}]}>
                      {safeProgress.average_score ? `${safeProgress.average_score.toFixed(1)}%` : 'N/A'}
                    </Text>
                  </View>
                </View>

                {safeProgress.current_level > 0 && (
                  <View style={styles.progressLevelBadge}>
                    <Ionicons name="trophy" size={14} color="#F59E0B" />
                    <Text style={styles.progressLevelText}>
                      Current Level: {safeProgress.current_level}
                    </Text>
                  </View>
                )}

                {safeProgress.last_trial_date && (
                  <View style={styles.progressFooter}>
                    <Ionicons name="time-outline" size={12} color="#999" />
                    <Text style={styles.progressLastTrial}>
                      Last activity: {new Date(safeProgress.last_trial_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            );
          })}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      );
    };

    return (
      <View style={styles.tabContent}>
        {/* Sub-navigation for progress types */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabNav}>
          <TouchableOpacity
            style={[styles.subTab, activeProgressTab === 'physical' && styles.subTabActive]}
            onPress={() => setActiveProgressTab('physical')}
          >
            <Ionicons name="fitness" size={14} color={activeProgressTab === 'physical' ? '#C9302C' : '#666'} />
            <Text style={[styles.subTabText, activeProgressTab === 'physical' && styles.subTabTextActive]}>
              Physical
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeProgressTab === 'articulation' && styles.subTabActive]}
            onPress={() => setActiveProgressTab('articulation')}
          >
            <Ionicons name="mic" size={14} color={activeProgressTab === 'articulation' ? '#C9302C' : '#666'} />
            <Text style={[styles.subTabText, activeProgressTab === 'articulation' && styles.subTabTextActive]}>
              Articulation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeProgressTab === 'receptive' && styles.subTabActive]}
            onPress={() => setActiveProgressTab('receptive')}
          >
            <Ionicons name="ear" size={14} color={activeProgressTab === 'receptive' ? '#C9302C' : '#666'} />
            <Text style={[styles.subTabText, activeProgressTab === 'receptive' && styles.subTabTextActive]}>
              Receptive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeProgressTab === 'expressive' && styles.subTabActive]}
            onPress={() => setActiveProgressTab('expressive')}
          >
            <Ionicons name="chatbubbles" size={14} color={activeProgressTab === 'expressive' ? '#C9302C' : '#666'} />
            <Text style={[styles.subTabText, activeProgressTab === 'expressive' && styles.subTabTextActive]}>
              Expressive
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeProgressTab === 'fluency' && styles.subTabActive]}
            onPress={() => setActiveProgressTab('fluency')}
          >
            <Ionicons name="musical-notes" size={14} color={activeProgressTab === 'fluency' ? '#C9302C' : '#666'} />
            <Text style={[styles.subTabText, activeProgressTab === 'fluency' && styles.subTabTextActive]}>
              Fluency
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Progress Content */}
        <View style={styles.progressContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C9302C" />
              <Text style={styles.loadingText}>Loading patient progress...</Text>
            </View>
          ) : (
            <>
              {activeProgressTab === 'physical' && (
                <View style={styles.physicalPlaceholder}>
                  <Ionicons name="fitness" size={60} color="#ccc" />
                  <Text style={styles.emptyStateText}>Physical Therapy progress tracking coming soon</Text>
                </View>
              )}
              {activeProgressTab === 'articulation' && renderProgressList(articulationProgress, 'articulation')}
              {activeProgressTab === 'receptive' && renderProgressList(receptiveProgress, 'receptive')}
              {activeProgressTab === 'expressive' && renderProgressList(languageProgress, 'expressive')}
              {activeProgressTab === 'fluency' && renderProgressList(fluencyProgress, 'fluency')}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderSuccessStoriesTab = () => {
    const API_URL = 'http://10.0.2.2:5000'; // For Android emulator
    
    const truncateText = (text, maxLength = 80) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    return (
      <View style={styles.tabContent}>
        {/* Fixed Header - matches Appointments pattern */}
        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>
            Success Stories ({successStories.length})
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddSuccessStory}>
              <Ionicons name="add-circle" size={14} color="#FFF" />
              <Text style={styles.seedButtonText}>Add Story</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Stories List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C9302C" />
            <Text style={styles.loadingText}>Loading stories...</Text>
          </View>
        ) : successStories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No success stories yet</Text>
            <Text style={styles.emptySubtext}>
              Create inspiring success stories to showcase patient achievements
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddSuccessStory}>
              <Text style={styles.emptyButtonText}>Add First Story</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.exercisesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9302C']} />
            }
          >
          {successStories.map((story) => (
            <View key={story.id} style={styles.storyCard}>
              {/* Story Header */}
              <View style={styles.storyHeader}>
                <View style={styles.storyHeaderLeft}>
                  <Ionicons name="person-circle" size={40} color="#C9302C" />
                  <View style={styles.storyHeaderInfo}>
                    <Text style={styles.storyPatientName}>{story.patientName}</Text>
                    <Text style={styles.storyDate}>{formatDate(story.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.storyActions}>
                  <TouchableOpacity onPress={() => handleEditSuccessStory(story)} style={styles.iconButton}>
                    <Ionicons name="create-outline" size={20} color="#6B9AC4" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSuccessStory(story.id)} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={20} color="#C9302C" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Images */}
              {story.images && story.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storyImages}>
                  {story.images.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={styles.storyImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {/* Story Content */}
              <View style={styles.storyContent}>
                <Text style={styles.storyText}>{truncateText(story.story, 150)}</Text>
                {story.story.length > 150 && (
                  <Text style={styles.readMoreText}>Read more...</Text>
                )}
              </View>

              {/* Story Footer */}
              <View style={styles.storyFooter}>
                <View style={styles.storyMeta}>
                  <Ionicons name="images-outline" size={14} color="#999" />
                  <Text style={styles.storyMetaText}>
                    {story.images?.length || 0} {story.images?.length === 1 ? 'image' : 'images'}
                  </Text>
                </View>
                {story.createdByName && (
                  <View style={styles.storyMeta}>
                    <Ionicons name="person-outline" size={14} color="#999" />
                    <Text style={styles.storyMetaText}>By {story.createdByName}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          <View style={styles.bottomSpacing} />
          </ScrollView>
        )}
      </View>
    );
  };

  const renderReportsTab = () => {
    return (
      <ScrollView style={styles.scrollContainer} refreshControl={
        <RefreshControl refreshing={loadingReports} onRefresh={loadReports} />
      }>
        <View style={styles.reportsContainer}>
          <Text style={styles.sectionTitle}>Analytics & Reports</Text>
          <Text style={styles.sectionSubtitle}>Patient demographics and statistics</Text>

          {loadingReports ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C9302C" />
              <Text style={styles.loadingText}>Loading reports...</Text>
            </View>
          ) : reportsData ? (
            <View style={styles.reportsContent}>
              {/* Age Distribution Card */}
              <View style={styles.reportCard}>
                <View style={styles.reportCardHeader}>
                  <View style={styles.reportTitleContainer}>
                    <Ionicons name="people-outline" size={24} color="#C9302C" />
                    <Text style={styles.reportCardTitle}>Age Distribution</Text>
                  </View>
                  <Text style={styles.reportCardSubtitle}>Patient distribution across age brackets</Text>
                </View>
                
                <View style={styles.reportCardBody}>
                  {reportsData.ageBrackets && reportsData.ageBrackets.length > 0 ? (
                    <>
                      <View style={styles.ageBracketsContainer}>
                        {reportsData.ageBrackets.map((bracket, index) => (
                          <View 
                            key={index} 
                            style={[
                              styles.ageBracketItem, 
                              bracket.isHighest && styles.ageBracketHighest
                            ]}
                          >
                            <Text style={styles.bracketLabel}>{bracket.range}</Text>
                            <Text style={styles.bracketCount}>{bracket.count}</Text>
                            <Text style={styles.bracketPercentage}>{bracket.percentage}%</Text>
                            {bracket.isHighest && (
                              <View style={styles.highestBadge}>
                                <Text style={styles.highestBadgeText}>Highest</Text>
                              </View>
                            )}
                            <View style={styles.bracketBar}>
                              <View 
                                style={[
                                  styles.bracketBarFill, 
                                  { width: `${bracket.percentage}%` }
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                      
                      {reportsData.highestAgeBracket && (
                        <View style={styles.summaryContainer}>
                          <View style={styles.summaryItem}>
                            <Ionicons name="trophy-outline" size={20} color="#C9302C" />
                            <View style={styles.summaryContent}>
                              <Text style={styles.summaryLabel}>Highest Age Bracket:</Text>
                              <Text style={styles.summaryValue}>{reportsData.highestAgeBracket.range}</Text>
                              <Text style={styles.summaryCount}>{reportsData.highestAgeBracket.count} patients</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Ionicons name="bar-chart-outline" size={40} color="#D0D0D0" />
                      <Text style={styles.noDataText}>No age data available</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Gender Distribution Card */}
              <View style={styles.reportCard}>
                <View style={styles.reportCardHeader}>
                  <View style={styles.reportTitleContainer}>
                    <Ionicons name="person-outline" size={24} color="#C9302C" />
                    <Text style={styles.reportCardTitle}>Gender Distribution</Text>
                  </View>
                  <Text style={styles.reportCardSubtitle}>Patient distribution by gender</Text>
                </View>
                
                <View style={styles.reportCardBody}>
                  {reportsData.genderDistribution && reportsData.genderDistribution.length > 0 ? (
                    <>
                      <View style={styles.genderContainer}>
                        {reportsData.genderDistribution.map((gender, index) => (
                          <View key={index} style={styles.genderItem}>
                            <View style={styles.genderIcon}>
                              <Text style={styles.genderEmoji}>
                                {gender.gender === 'male' ? '👨' : 
                                 gender.gender === 'female' ? '👩' : 
                                 gender.gender === 'other' ? '🧑' : '❓'}
                              </Text>
                            </View>
                            <View style={styles.genderInfo}>
                              <Text style={styles.genderLabel}>
                                {gender.gender.charAt(0).toUpperCase() + gender.gender.slice(1)}
                              </Text>
                              <Text style={styles.genderCount}>{gender.count} patients</Text>
                              <Text style={styles.genderPercentage}>{gender.percentage}%</Text>
                              <View style={styles.genderBar}>
                                <View 
                                  style={[
                                    styles.genderBarFill,
                                    { 
                                      width: `${gender.percentage}%`,
                                      backgroundColor: gender.gender === 'male' ? '#4285F4' : 
                                                     gender.gender === 'female' ? '#FF6B9D' : '#34A853'
                                    }
                                  ]}
                                />
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                      
                      <View style={styles.summaryStats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Total Patients</Text>
                          <Text style={styles.statValue}>{reportsData.totalPatients || 0}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Gender Categories</Text>
                          <Text style={styles.statValue}>{reportsData.genderDistribution.length}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Ionicons name="person-outline" size={40} color="#D0D0D0" />
                      <Text style={styles.noDataText}>No gender data available</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataLarge}>
              <Ionicons name="bar-chart-outline" size={60} color="#D0D0D0" />
              <Text style={styles.noDataTitle}>No reports data available</Text>
              <Text style={styles.noDataHint}>Reports will appear here once patient data is available</Text>
            </View>
          )}
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderSchedulingTab = () => {
    const appointmentsToShow = schedulingSubTab === 'my' ? therapistAppointments : unassignedAppointments;

    return (
      <View style={styles.tabContent}>
        {/* Sub-tab navigation */}
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, schedulingSubTab === 'my' && styles.subTabActive]}
            onPress={() => setSchedulingSubTab('my')}
          >
            <Text style={[styles.subTabText, schedulingSubTab === 'my' && styles.subTabTextActive]}>
              My Appointments ({therapistAppointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, schedulingSubTab === 'unassigned' && styles.subTabActive]}
            onPress={() => setSchedulingSubTab('unassigned')}
          >
            <Text style={[styles.subTabText, schedulingSubTab === 'unassigned' && styles.subTabTextActive]}>
              Unassigned ({unassignedAppointments.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabHeader}>
          <Text style={styles.tabTitle}>
            {schedulingSubTab === 'my' ? 'My Appointments' : 'Unassigned Requests'}
          </Text>
          {schedulingSubTab === 'my' && (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowCreateAppointmentModal(true)}
              >
                <Ionicons name="add-circle" size={14} color="#FFF" />
                <Text style={styles.seedButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loadingAppointments ? (
          <ActivityIndicator size="large" color="#C9302C" style={{ marginTop: 50 }} />
        ) : appointmentsToShow.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>
              {schedulingSubTab === 'my' ? 'No appointments assigned' : 'No unassigned requests'}
            </Text>
            <Text style={styles.emptySubtext}>
              {schedulingSubTab === 'my' 
                ? 'Create a new appointment or check unassigned requests' 
                : 'All appointment requests have been assigned'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.exercisesList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadTherapistAppointments();
                  await loadUnassignedAppointments();
                  setRefreshing(false);
                }}
              />
            }
          >
            {appointmentsToShow.map((appt) => (
              <TouchableOpacity
                key={appt._id}
                style={[
                  styles.exerciseCard,
                  { borderLeftWidth: 4, borderLeftColor: getApptStatusColor(appt.status) }
                ]}
                onPress={() => {
                  setSelectedAppointmentDetail(appt);
                  setShowAppointmentDetailModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2C3E50' }}>
                      {getApptTherapyIcon(appt.therapy_type)}{' '}
                      {appt.therapy_type.charAt(0).toUpperCase() + appt.therapy_type.slice(1)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      {appt.patient_name || 'Unknown Patient'}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getApptStatusColor(appt.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color="#999" />
                    <Text style={{ fontSize: 13, color: '#555' }}>
                      {new Date(appt.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={{ fontSize: 13, color: '#555' }}>
                      {new Date(appt.appointment_date).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {' · '}{appt.duration || 60}{' min'}
                    </Text>
                  </View>
                </View>

                {schedulingSubTab === 'unassigned' && (
                  <TouchableOpacity
                    style={{
                      marginTop: 10,
                      backgroundColor: '#C9302C',
                      paddingVertical: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                    onPress={() => handleAssignAppointment(appt._id)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>
                      Assign to Me
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Create Appointment Modal */}
        <Modal
          visible={showCreateAppointmentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateAppointmentModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b' }}>Create Appointment</Text>
                  <TouchableOpacity onPress={() => setShowCreateAppointmentModal(false)}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: 20, maxHeight: 500 }}>
                  {/* Patient Search */}
                  <Text style={styles.label}>Patient *</Text>
                  <TextInput
                    style={styles.input}
                    value={patientSearchQuery}
                    onChangeText={handleSearchPatients}
                    placeholder="Search patient by name or email..."
                  />
                  {searchingPatients && <ActivityIndicator size="small" color="#C9302C" />}
                  {patientSearchResults.length > 0 && (
                    <View style={{ backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      {patientSearchResults.map((patient) => (
                        <TouchableOpacity
                          key={patient._id}
                          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                          onPress={() => handleSelectPatient(patient)}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>
                            {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>{patient.email}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {newAppointmentData.patient_name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, backgroundColor: '#ecfdf5', borderRadius: 8 }}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={{ color: '#065f46', fontWeight: '600' }}>
                        {newAppointmentData.patient_name}
                      </Text>
                    </View>
                  ) : null}

                  {/* Therapy Type */}
                  <Text style={styles.label}>Therapy Type *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newAppointmentData.therapy_type}
                      onValueChange={(value) => setNewAppointmentData({ ...newAppointmentData, therapy_type: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="🗣️ Articulation" value="articulation" color="#000" />
                      <Picker.Item label="💬 Language" value="language" color="#000" />
                      <Picker.Item label="🎯 Fluency" value="fluency" color="#000" />
                      <Picker.Item label="🏃 Physical" value="physical" color="#000" />
                    </Picker>
                  </View>

                  {/* Date */}
                  <Text style={styles.label}>Date *</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowApptDatePicker(true)}
                  >
                    <Text style={{ color: '#000' }}>
                      {newAppointmentData.appointment_date.toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showApptDatePicker && (
                    <DateTimePicker
                      value={newAppointmentData.appointment_date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowApptDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setNewAppointmentData({ ...newAppointmentData, appointment_date: selectedDate });
                        }
                      }}
                    />
                  )}

                  {/* Time */}
                  <Text style={styles.label}>Time *</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowApptTimePicker(true)}
                  >
                    <Text style={{ color: '#000' }}>
                      {newAppointmentData.appointment_time.toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showApptTimePicker && (
                    <DateTimePicker
                      value={newAppointmentData.appointment_time}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedTime) => {
                        setShowApptTimePicker(Platform.OS === 'ios');
                        if (selectedTime) {
                          setNewAppointmentData({ ...newAppointmentData, appointment_time: selectedTime });
                        }
                      }}
                    />
                  )}

                  {/* Duration */}
                  <Text style={styles.label}>Duration (minutes)</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newAppointmentData.duration}
                      onValueChange={(value) => setNewAppointmentData({ ...newAppointmentData, duration: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="30 minutes" value={30} color="#000" />
                      <Picker.Item label="45 minutes" value={45} color="#000" />
                      <Picker.Item label="60 minutes" value={60} color="#000" />
                      <Picker.Item label="90 minutes" value={90} color="#000" />
                    </Picker>
                  </View>

                  {/* Notes */}
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newAppointmentData.notes}
                    onChangeText={(text) => setNewAppointmentData({ ...newAppointmentData, notes: text })}
                    placeholder="Add notes..."
                    multiline
                    numberOfLines={3}
                  />
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 12 }}>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9' }}
                    onPress={() => setShowCreateAppointmentModal(false)}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#475569' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#C9302C' }}
                    onPress={handleCreateTherapistAppointment}
                  >
                    <Ionicons name="calendar" size={18} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Appointment Detail Modal */}
        <Modal
          visible={showAppointmentDetailModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAppointmentDetailModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b' }}>Appointment Details</Text>
                <TouchableOpacity onPress={() => setShowAppointmentDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {selectedAppointmentDetail && (
                <ScrollView style={{ padding: 20 }}>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Therapy Type</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }}>
                      {getApptTherapyIcon(selectedAppointmentDetail.therapy_type)}{' '}
                      {selectedAppointmentDetail.therapy_type.charAt(0).toUpperCase() + selectedAppointmentDetail.therapy_type.slice(1)}
                    </Text>
                  </View>
                  
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getApptStatusColor(selectedAppointmentDetail.status), alignSelf: 'flex-start' }]}>
                      <Text style={styles.statusText}>
                        {selectedAppointmentDetail.status.charAt(0).toUpperCase() + selectedAppointmentDetail.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Patient</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }}>
                      {selectedAppointmentDetail.patient_name || 'Unknown'}
                    </Text>
                    {selectedAppointmentDetail.patient_email ? (
                      <Text style={{ fontSize: 13, color: '#64748b' }}>{selectedAppointmentDetail.patient_email}</Text>
                    ) : null}
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Date & Time</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b' }}>
                      {new Date(selectedAppointmentDetail.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#475569' }}>
                      {new Date(selectedAppointmentDetail.appointment_date).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {' · '}{selectedAppointmentDetail.duration || 60}{' minutes'}
                    </Text>
                  </View>

                  {selectedAppointmentDetail.notes ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notes</Text>
                      <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        {selectedAppointmentDetail.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  {selectedAppointmentDetail.status !== 'completed' && selectedAppointmentDetail.status !== 'cancelled' && (
                    <View style={{ gap: 10, marginTop: 8, marginBottom: 20 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Actions</Text>
                      
                      {selectedAppointmentDetail.status !== 'confirmed' && (
                        <TouchableOpacity
                          style={{ backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                          onPress={() => handleUpdateAppointmentStatus(selectedAppointmentDetail._id, 'confirmed')}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Confirm Appointment</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={{ backgroundColor: '#059669', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleUpdateAppointmentStatus(selectedAppointmentDetail._id, 'completed')}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Mark as Completed</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleUpdateAppointmentStatus(selectedAppointmentDetail._id, 'no-show')}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✗ Mark as No-Show</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{ backgroundColor: '#6b7280', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleCancelTherapistAppointment(selectedAppointmentDetail._id)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Cancel Appointment</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9' }}
                  onPress={() => setShowAppointmentDetailModal(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#475569' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==================== DIAGNOSTIC COMPARISON TAB ====================
  const renderDiagnosticTab = () => {
    const compData = diagComparisonData;

    const renderScoreRow = (label, facilityVal, homeVal, delta, isLast = false) => {
      const deltaDisplay = getDiagDeltaDisplay(delta);
      return (
        <View key={label} style={[diagStyles.tableRow, isLast && { borderBottomWidth: 0 }]}>
          <Text style={diagStyles.tableCell}>{label}</Text>
          <Text style={diagStyles.tableCellCenter}>{facilityVal != null ? `${facilityVal}%` : '—'}</Text>
          <Text style={diagStyles.tableCellCenter}>{homeVal != null ? `${homeVal}%` : '—'}</Text>
          <Text style={[diagStyles.tableCellCenter, { color: deltaDisplay.color, fontWeight: '700' }]}>
            {deltaDisplay.icon} {deltaDisplay.text}
          </Text>
        </View>
      );
    };

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={diagStyles.container}>
          {/* Section Header - matches Reports tab pattern */}
          <View style={diagStyles.sectionHeader}>
            <View style={diagStyles.sectionTitleRow}>
              <Ionicons name="git-compare-outline" size={24} color="#C9302C" />
              <Text style={diagStyles.sectionTitle}>Compare / Validate</Text>
            </View>
            <Text style={diagStyles.sectionSubtitle}>
              Compare facility diagnostic scores with at-home therapy progress
            </Text>
          </View>

          {/* Patient Search Card */}
          <View style={diagStyles.card}>
            <Text style={styles.label}>Select Patient</Text>
            <TextInput
              style={styles.input}
              placeholder="Search patient by name..."
              placeholderTextColor="#94a3b8"
              value={diagSearchQuery}
              onChangeText={(text) => {
                setDiagSearchQuery(text);
                searchDiagPatients(text);
              }}
            />
            {searchingDiagPatients && <ActivityIndicator size="small" color="#C9302C" style={{ marginTop: 8 }} />}
            {showDiagPatientDropdown && diagSearchResults.length > 0 && (
              <View style={diagStyles.searchDropdown}>
                <ScrollView nestedScrollEnabled>
                  {diagSearchResults.map((p, i) => (
                    <TouchableOpacity
                      key={p._id || i}
                      style={[diagStyles.searchItem, i < diagSearchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}
                      onPress={() => selectDiagPatient(p)}
                    >
                      <View style={diagStyles.searchItemAvatar}>
                        <Text style={diagStyles.searchItemAvatarText}>
                          {(p.firstName || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={diagStyles.searchItemName}>{p.firstName} {p.lastName}</Text>
                        <Text style={diagStyles.searchItemEmail}>{p.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Selected Patient Chip */}
            {selectedDiagPatient && (
              <View style={diagStyles.selectedPatientChip}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={diagStyles.selectedPatientText}>
                  {selectedDiagPatient.firstName} {selectedDiagPatient.lastName}
                </Text>
                <TouchableOpacity onPress={() => { setDiagSearchQuery(''); }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Add Diagnostic Button */}
          {selectedDiagPatient && (
            <TouchableOpacity style={diagStyles.addDiagButton} onPress={() => setShowDiagModal(true)}>
              <Ionicons name="add-circle" size={18} color="#FFF" />
              <Text style={diagStyles.addDiagButtonText}>Add Facility Diagnostic</Text>
            </TouchableOpacity>
          )}

          {/* Loading */}
          {loadingDiagComparison && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C9302C" />
              <Text style={styles.loadingText}>Loading comparison data...</Text>
            </View>
          )}

          {/* No Patient Selected Empty State */}
          {!selectedDiagPatient && !loadingDiagComparison && (
            <View style={diagStyles.emptyState}>
              <Ionicons name="search-outline" size={60} color="#d1d5db" />
              <Text style={diagStyles.emptyStateTitle}>Select a Patient</Text>
              <Text style={diagStyles.emptyStateText}>
                Search for a patient above to view or create their diagnostic comparison.
              </Text>
            </View>
          )}

          {/* Comparison Results */}
          {selectedDiagPatient && !loadingDiagComparison && compData && (
            <>
              {compData.has_facility_data ? (
                <>
                  {/* Assessment Info Card */}
                  <View style={diagStyles.card}>
                    <View style={diagStyles.assessmentHeader}>
                      <View style={diagStyles.assessmentAvatar}>
                        <Text style={diagStyles.assessmentAvatarText}>
                          {(compData.patient_name || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={diagStyles.assessmentName}>{compData.patient_name}</Text>
                        <Text style={diagStyles.assessmentMeta}>
                          {compData.assessment_type?.charAt(0).toUpperCase() + compData.assessment_type?.slice(1)} Assessment
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                          <Text style={diagStyles.assessmentDate}>
                            {new Date(compData.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                      </View>
                      {compData.severity_level ? (
                        <View style={[diagStyles.severityBadge, {
                          backgroundColor: compData.severity_level === 'severe' ? '#fee2e2' : compData.severity_level === 'moderate' ? '#fef3c7' : '#dcfce7'
                        }]}>
                          <Text style={[diagStyles.severityText, {
                            color: compData.severity_level === 'severe' ? '#dc2626' : compData.severity_level === 'moderate' ? '#d97706' : '#16a34a'
                          }]}>
                            {compData.severity_level.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {compData.assessor_name && (
                      <View style={diagStyles.assessorRow}>
                        <Ionicons name="person-outline" size={13} color="#94a3b8" />
                        <Text style={diagStyles.assessorText}>Assessed by {compData.assessor_name}</Text>
                      </View>
                    )}
                  </View>

                  {/* Summary Insights Card */}
                  {compData.summary_insights && Object.keys(compData.summary_insights).length > 0 && (
                    <View style={[diagStyles.card, { borderLeftWidth: 4, borderLeftColor: '#0ea5e9' }]}>
                      <View style={diagStyles.insightHeader}>
                        <Ionicons name="analytics-outline" size={20} color="#0369a1" />
                        <Text style={diagStyles.insightTitle}>Summary Insights</Text>
                      </View>

                      <View style={diagStyles.insightStatsRow}>
                        <View style={diagStyles.insightStatBox}>
                          <Text style={[diagStyles.insightStatValue, { color: compData.summary_insights.overall_avg_delta >= 0 ? '#10b981' : '#ef4444' }]}>
                            {compData.summary_insights.overall_avg_delta >= 0 ? '+' : ''}{compData.summary_insights.overall_avg_delta}%
                          </Text>
                          <Text style={diagStyles.insightStatLabel}>Avg Delta</Text>
                        </View>
                        <View style={diagStyles.insightStatBox}>
                          <Text style={[diagStyles.insightStatValue, { color: '#334155' }]}>{compData.summary_insights.total_metrics}</Text>
                          <Text style={diagStyles.insightStatLabel}>Metrics</Text>
                        </View>
                      </View>

                      <View style={diagStyles.insightCountsRow}>
                        <View style={[diagStyles.insightCountBox, { backgroundColor: '#dcfce7' }]}>
                          <Text style={[diagStyles.insightCountValue, { color: '#16a34a' }]}>{compData.summary_insights.improving_count}</Text>
                          <Text style={[diagStyles.insightCountLabel, { color: '#16a34a' }]}>Improving</Text>
                        </View>
                        <View style={[diagStyles.insightCountBox, { backgroundColor: '#f3f4f6' }]}>
                          <Text style={[diagStyles.insightCountValue, { color: '#6b7280' }]}>{compData.summary_insights.stable_count}</Text>
                          <Text style={[diagStyles.insightCountLabel, { color: '#6b7280' }]}>Stable</Text>
                        </View>
                        <View style={[diagStyles.insightCountBox, { backgroundColor: '#fee2e2' }]}>
                          <Text style={[diagStyles.insightCountValue, { color: '#ef4444' }]}>{compData.summary_insights.declining_count}</Text>
                          <Text style={[diagStyles.insightCountLabel, { color: '#ef4444' }]}>Declining</Text>
                        </View>
                      </View>

                      {compData.summary_insights.strongest_area && (
                        <View style={diagStyles.insightAreasContainer}>
                          <View style={diagStyles.insightAreaRow}>
                            <Text style={diagStyles.insightAreaIcon}>💪</Text>
                            <Text style={diagStyles.insightAreaLabel}>Strongest:</Text>
                            <Text style={diagStyles.insightAreaValue}>
                              {compData.summary_insights.strongest_area.metric} ({compData.summary_insights.strongest_area.delta >= 0 ? '+' : ''}{compData.summary_insights.strongest_area.delta}%)
                            </Text>
                          </View>
                          <View style={diagStyles.insightAreaRow}>
                            <Text style={diagStyles.insightAreaIcon}>⚠️</Text>
                            <Text style={diagStyles.insightAreaLabel}>Weakest:</Text>
                            <Text style={diagStyles.insightAreaValue}>
                              {compData.summary_insights.weakest_area.metric} ({compData.summary_insights.weakest_area.delta >= 0 ? '+' : ''}{compData.summary_insights.weakest_area.delta}%)
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Score Comparison Table Card */}
                  <View style={diagStyles.card}>
                    <View style={diagStyles.cardTitleRow}>
                      <Ionicons name="stats-chart-outline" size={18} color="#C9302C" />
                      <Text style={diagStyles.cardTitle}>Score Comparison</Text>
                    </View>

                    {/* Table Header */}
                    <View style={diagStyles.tableHeader}>
                      <Text style={diagStyles.tableHeaderCell}>Area</Text>
                      <Text style={diagStyles.tableHeaderCellCenter}>Facility</Text>
                      <Text style={diagStyles.tableHeaderCellCenter}>Home</Text>
                      <Text style={diagStyles.tableHeaderCellCenter}>Delta</Text>
                    </View>

                    {/* Articulation scores */}
                    {Object.keys(compData.facility_scores?.articulation || {}).length > 0 && (
                      <>
                        {Object.keys({ ...(compData.facility_scores?.articulation || {}), ...(compData.home_scores?.articulation || {}) }).map(sound => {
                          return renderScoreRow(
                            `/${sound.toUpperCase()}/ Sound`,
                            compData.facility_scores?.articulation?.[sound],
                            compData.home_scores?.articulation?.[sound],
                            compData.deltas?.articulation?.[sound]
                          );
                        })}
                      </>
                    )}

                    {/* Fluency */}
                    {(compData.facility_scores?.fluency != null || compData.home_scores?.fluency != null) &&
                      renderScoreRow('Fluency', compData.facility_scores?.fluency, compData.home_scores?.fluency, compData.deltas?.fluency)
                    }

                    {/* Receptive */}
                    {(compData.facility_scores?.receptive != null || compData.home_scores?.receptive != null) &&
                      renderScoreRow('Receptive', compData.facility_scores?.receptive, compData.home_scores?.receptive, compData.deltas?.receptive)
                    }

                    {/* Expressive */}
                    {(compData.facility_scores?.expressive != null || compData.home_scores?.expressive != null) &&
                      renderScoreRow('Expressive', compData.facility_scores?.expressive, compData.home_scores?.expressive, compData.deltas?.expressive)
                    }

                    {/* Gait */}
                    {(Object.keys(compData.facility_scores?.gait || {}).length > 0 || Object.keys(compData.home_scores?.gait || {}).length > 0) &&
                      renderScoreRow('Gait (Overall)', compData.facility_scores?.gait?.overall_gait, compData.home_scores?.gait?.overall_gait, compData.deltas?.gait, true)
                    }
                  </View>

                  {/* Notes & Recommendations Card */}
                  {(compData.notes || (compData.recommended_focus && compData.recommended_focus.length > 0)) && (
                    <View style={diagStyles.card}>
                      <View style={diagStyles.cardTitleRow}>
                        <Ionicons name="document-text-outline" size={18} color="#C9302C" />
                        <Text style={diagStyles.cardTitle}>Notes & Recommendations</Text>
                      </View>
                      {compData.notes ? (
                        <View style={diagStyles.notesBox}>
                          <Text style={diagStyles.notesText}>{compData.notes}</Text>
                        </View>
                      ) : null}
                      {compData.recommended_focus && compData.recommended_focus.length > 0 && (
                        <View style={{ marginTop: compData.notes ? 12 : 0 }}>
                          <Text style={diagStyles.recommendLabel}>Recommended Focus Areas</Text>
                          {compData.recommended_focus.map((item, i) => (
                            <View key={i} style={diagStyles.recommendItem}>
                              <View style={diagStyles.recommendBullet} />
                              <Text style={diagStyles.recommendText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Historical Diagnostics Card */}
                  {diagPatientDiagnostics.length > 0 && (
                    <View style={diagStyles.card}>
                      <View style={diagStyles.cardTitleRow}>
                        <Ionicons name="time-outline" size={18} color="#C9302C" />
                        <Text style={diagStyles.cardTitle}>Diagnostic History ({diagPatientDiagnostics.length})</Text>
                      </View>
                      {diagPatientDiagnostics.map((diag, idx) => (
                        <View key={diag._id} style={[diagStyles.historyItem, idx === diagPatientDiagnostics.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={diagStyles.historyDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={diagStyles.historyTitle}>
                              {diag.assessment_type?.charAt(0).toUpperCase() + diag.assessment_type?.slice(1)} Assessment
                            </Text>
                            <Text style={diagStyles.historyMeta}>
                              {new Date(diag.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • by {diag.assessor_name}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={diagStyles.historyViewBtn}
                              onPress={() => loadDiagComparison(selectedDiagPatient._id || selectedDiagPatient.id, diag._id)}
                            >
                              <Ionicons name="eye-outline" size={14} color="#0369a1" />
                              <Text style={diagStyles.historyViewText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={diagStyles.historyDeleteBtn}
                              onPress={() => handleDeleteDiagnostic(diag._id)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={diagStyles.emptyState}>
                  <Ionicons name="clipboard-outline" size={60} color="#d1d5db" />
                  <Text style={diagStyles.emptyStateTitle}>No Diagnostic Found</Text>
                  <Text style={diagStyles.emptyStateText}>
                    No facility diagnostic found for this patient. Tap the button above to add one.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Create Diagnostic Modal */}
        <Modal
          visible={showDiagModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDiagModal(false)}
        >
          <View style={diagStyles.modalOverlay}>
            <View style={diagStyles.modalContainer}>
              <View style={diagStyles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="clipboard-outline" size={22} color="#C9302C" />
                  <Text style={diagStyles.modalTitle}>New Facility Diagnostic</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDiagModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={diagStyles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Assessment Type */}
                  <Text style={styles.label}>Assessment Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newDiagnostic.assessment_type}
                      onValueChange={(val) => setNewDiagnostic({ ...newDiagnostic, assessment_type: val })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Initial" value="initial" />
                      <Picker.Item label="Follow-up" value="follow-up" />
                      <Picker.Item label="Discharge" value="discharge" />
                    </Picker>
                  </View>

                  {/* Assessment Date */}
                  <Text style={styles.label}>Assessment Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowDiagDatePicker(true)}
                  >
                    <Text style={{ fontSize: 14, color: '#2C3E50' }}>{newDiagnostic.assessment_date}</Text>
                  </TouchableOpacity>
                  {showDiagDatePicker && (
                    <DateTimePicker
                      value={new Date(newDiagnostic.assessment_date)}
                      mode="date"
                      onChange={(event, selectedDate) => {
                        setShowDiagDatePicker(false);
                        if (selectedDate) {
                          setNewDiagnostic({ ...newDiagnostic, assessment_date: selectedDate.toISOString().split('T')[0] });
                        }
                      }}
                    />
                  )}

                  {/* Severity Level */}
                  <Text style={styles.label}>Severity Level</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newDiagnostic.severity_level}
                      onValueChange={(val) => setNewDiagnostic({ ...newDiagnostic, severity_level: val })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select severity..." value="" />
                      <Picker.Item label="Mild" value="mild" />
                      <Picker.Item label="Moderate" value="moderate" />
                      <Picker.Item label="Severe" value="severe" />
                    </Picker>
                  </View>

                  {/* Articulation Scores */}
                  <View style={diagStyles.modalSectionDivider}>
                    <Text style={diagStyles.modalSectionTitle}>Articulation Scores (0-100)</Text>
                  </View>
                  <View style={diagStyles.scoreGrid}>
                    {['r', 's', 'l', 'th', 'k'].map(sound => (
                      <View key={sound} style={diagStyles.scoreGridItem}>
                        <Text style={diagStyles.scoreGridLabel}>/{sound.toUpperCase()}/</Text>
                        <TextInput
                          style={diagStyles.scoreGridInput}
                          keyboardType="numeric"
                          placeholder="—"
                          placeholderTextColor="#cbd5e1"
                          value={String(newDiagnostic.articulation_scores[sound] || '')}
                          onChangeText={(val) => setNewDiagnostic({ ...newDiagnostic, articulation_scores: { ...newDiagnostic.articulation_scores, [sound]: val } })}
                        />
                      </View>
                    ))}
                  </View>

                  {/* Other Scores */}
                  <View style={diagStyles.modalSectionDivider}>
                    <Text style={diagStyles.modalSectionTitle}>Other Scores (0-100)</Text>
                  </View>
                  {[
                    { key: 'fluency_score', label: 'Fluency', icon: 'musical-notes' },
                    { key: 'receptive_score', label: 'Receptive', icon: 'ear' },
                    { key: 'expressive_score', label: 'Expressive', icon: 'chatbubble' },
                  ].map(item => (
                    <View key={item.key} style={diagStyles.scoreInputRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name={item.icon} size={16} color="#64748b" />
                        <Text style={diagStyles.scoreInputLabel}>{item.label}</Text>
                      </View>
                      <TextInput
                        style={diagStyles.scoreInput}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="#cbd5e1"
                        value={String(newDiagnostic[item.key] || '')}
                        onChangeText={(val) => setNewDiagnostic({ ...newDiagnostic, [item.key]: val })}
                      />
                    </View>
                  ))}

                  {/* Gait Scores */}
                  <View style={diagStyles.modalSectionDivider}>
                    <Text style={diagStyles.modalSectionTitle}>Gait Scores (0-100)</Text>
                  </View>
                  {[
                    { key: 'stability_score', label: 'Stability' },
                    { key: 'gait_symmetry', label: 'Symmetry' },
                    { key: 'step_regularity', label: 'Step Regularity' },
                    { key: 'overall_gait', label: 'Overall Gait' },
                  ].map(item => (
                    <View key={item.key} style={diagStyles.scoreInputRow}>
                      <Text style={[diagStyles.scoreInputLabel, { flex: 1 }]}>{item.label}</Text>
                      <TextInput
                        style={diagStyles.scoreInput}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="#cbd5e1"
                        value={String(newDiagnostic.gait_scores[item.key] || '')}
                        onChangeText={(val) => setNewDiagnostic({ ...newDiagnostic, gait_scores: { ...newDiagnostic.gait_scores, [item.key]: val } })}
                      />
                    </View>
                  ))}

                  {/* Notes */}
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Assessment notes..."
                    placeholderTextColor="#94a3b8"
                    value={newDiagnostic.notes}
                    onChangeText={(val) => setNewDiagnostic({ ...newDiagnostic, notes: val })}
                  />

                  <View style={{ height: 20 }} />
                </ScrollView>
              </KeyboardAvoidingView>

              {/* Modal Footer */}
              <View style={diagStyles.modalFooter}>
                <TouchableOpacity
                  style={diagStyles.modalCancelBtn}
                  onPress={() => setShowDiagModal(false)}
                >
                  <Text style={diagStyles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[diagStyles.modalSaveBtn, savingDiagnostic && { opacity: 0.6 }]}
                  onPress={handleSaveDiagnostic}
                  disabled={savingDiagnostic}
                >
                  {savingDiagnostic ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={diagStyles.modalSaveText}>Save Diagnostic</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../assets/cvalogonotext.png')} 
            style={[styles.logoImage, { transform: [{ scale: 3.5 }] }]}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>CVAPed Therapist</Text>
            <Text style={styles.headerSubtitle}>Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#C9302C" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavigation}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="home" 
            size={16} 
            color={activeTab === 'overview' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'articulation' && styles.tabButtonActive]}
          onPress={() => setActiveTab('articulation')}
        >
          <Ionicons 
            name="mic" 
            size={16} 
            color={activeTab === 'articulation' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'articulation' && styles.tabButtonTextActive]}>
            Articulation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'language' && styles.tabButtonActive]}
          onPress={() => setActiveTab('language')}
        >
          <Ionicons 
            name="chatbubbles" 
            size={16} 
            color={activeTab === 'language' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'language' && styles.tabButtonTextActive]}>
            Language
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'fluency' && styles.tabButtonActive]}
          onPress={() => setActiveTab('fluency')}
        >
          <Ionicons 
            name="musical-notes" 
            size={16} 
            color={activeTab === 'fluency' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'fluency' && styles.tabButtonTextActive]}>
            Fluency
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'progress' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Ionicons 
            name="analytics" 
            size={16} 
            color={activeTab === 'progress' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'progress' && styles.tabButtonTextActive]}>
            Patient Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'success-stories' && styles.tabButtonActive]}
          onPress={() => setActiveTab('success-stories')}
        >
          <Ionicons 
            name="star" 
            size={16} 
            color={activeTab === 'success-stories' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'success-stories' && styles.tabButtonTextActive]}>
            Success Stories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'reports' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons 
            name="bar-chart" 
            size={16} 
            color={activeTab === 'reports' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'reports' && styles.tabButtonTextActive]}>
            Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'scheduling' && styles.tabButtonActive]}
          onPress={() => setActiveTab('scheduling')}
        >
          <Ionicons 
            name="calendar" 
            size={16} 
            color={activeTab === 'scheduling' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'scheduling' && styles.tabButtonTextActive]}>
            Scheduling
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'diagnostic' && styles.tabButtonActive]}
          onPress={() => setActiveTab('diagnostic')}
        >
          <Ionicons 
            name="git-compare" 
            size={16} 
            color={activeTab === 'diagnostic' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'diagnostic' && styles.tabButtonTextActive]}>
            Compare
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'fluency' && renderFluencyTab()}
        {activeTab === 'language' && renderLanguageTab()}
        {activeTab === 'articulation' && renderArticulationTab()}
        {activeTab === 'progress' && renderProgressTab()}
        {activeTab === 'success-stories' && renderSuccessStoriesTab()}
        {activeTab === 'reports' && renderReportsTab()}
        {activeTab === 'scheduling' && renderSchedulingTab()}
        {activeTab === 'diagnostic' && renderDiagnosticTab()}
      </View>

      {/* Fluency Modal */}
      <Modal
        visible={showFluencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowFluencyModal(false);
          setEditingFluency(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFluency ? 'Edit Fluency Exercise' : 'Add Fluency Exercise'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowFluencyModal(false);
                setEditingFluency(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
            >
              <Text style={styles.label}>Level</Text>
              {editingFluency && (
                <Text style={styles.currentValueText}>
                  Current: {getLevelName(editingFluency.level)}
                </Text>
              )}
              {!editingFluency && (
                <Text style={styles.selectionText}>
                  Selected: {getLevelName(newFluency.level)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingFluency ? editingFluency.level : newFluency.level}
                  onValueChange={(value) => {
                    if (editingFluency) {
                      setEditingFluency({...editingFluency, level: value});
                    } else {
                      // Suggest first available order for new exercise
                      const availableOrders = getAvailableOrders(fluencyExercises, value);
                      setNewFluency({...newFluency, level: value, order: availableOrders[0] || 1});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Level 1 - Breathing & Single Words" value={1} />
                  <Picker.Item label="Level 2 - Short Phrases" value={2} />
                  <Picker.Item label="Level 3 - Complete Sentences" value={3} />
                  <Picker.Item label="Level 4 - Reading Passages" value={4} />
                  <Picker.Item label="Level 5 - Spontaneous Speech" value={5} />
                </Picker>
              </View>

              <Text style={styles.label}>Type</Text>
              {editingFluency && (
                <Text style={styles.currentValueText}>
                  Current: {getTypeName(editingFluency.type)}
                </Text>
              )}
              {!editingFluency && (
                <Text style={styles.selectionText}>
                  Selected: {getTypeName(newFluency.type)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingFluency ? editingFluency.type : newFluency.type}
                  onValueChange={(value) => {
                    editingFluency 
                      ? setEditingFluency({...editingFluency, type: value})
                      : setNewFluency({...newFluency, type: value});
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Controlled Breathing" value="controlled-breathing" />
                  <Picker.Item label="Short Phrase" value="short-phrase" />
                  <Picker.Item label="Sentence" value="sentence" />
                  <Picker.Item label="Passage" value="passage" />
                  <Picker.Item label="Spontaneous" value="spontaneous" />
                </Picker>
              </View>

              <Text style={styles.label}>Order (within level)</Text>
              {editingFluency && (
                <Text style={styles.currentValueText}>
                  Current order: {editingFluency.order}
                </Text>
              )}
              {!editingFluency && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    fluencyExercises, 
                    newFluency.level
                  ).join(', ')}
                </Text>
              )}
              {editingFluency && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    fluencyExercises, 
                    editingFluency.level,
                    editingFluency._id
                  ).join(', ')}
                </Text>
              )}
              <TextInput
                style={styles.input}
                value={editingFluency ? String(editingFluency.order || '') : String(newFluency.order || '')}
                onChangeText={(text) => {
                  const numValue = text === '' ? '' : parseInt(text) || '';
                  editingFluency 
                    ? setEditingFluency({...editingFluency, order: numValue})
                    : setNewFluency({...newFluency, order: numValue});
                }}
                keyboardType="numeric"
                placeholder="Enter order number"
              />

              <Text style={styles.label}>Instruction</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingFluency ? editingFluency.instruction : newFluency.instruction}
                onChangeText={(text) => editingFluency 
                  ? setEditingFluency({...editingFluency, instruction: text})
                  : setNewFluency({...newFluency, instruction: text})
                }
                placeholder="Enter instructions..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Target</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingFluency ? editingFluency.target : newFluency.target}
                onChangeText={(text) => editingFluency 
                  ? setEditingFluency({...editingFluency, target: text})
                  : setNewFluency({...newFluency, target: text})
                }
                placeholder="e.g., Hello (for words) or complete sentence/passage"
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Expected Duration (seconds)</Text>
              <TextInput
                style={styles.input}
                value={String(editingFluency ? editingFluency.expected_duration : newFluency.expected_duration)}
                onChangeText={(text) => editingFluency 
                  ? setEditingFluency({...editingFluency, expected_duration: parseInt(text) || 0})
                  : setNewFluency({...newFluency, expected_duration: parseInt(text) || 0})
                }
                keyboardType="numeric"
                placeholder="3"
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Breathing Exercise</Text>
                <TouchableOpacity
                  onPress={() => editingFluency
                    ? setEditingFluency({...editingFluency, breathing: !editingFluency.breathing})
                    : setNewFluency({...newFluency, breathing: !newFluency.breathing})
                  }
                  style={[styles.switch, (editingFluency ? editingFluency.breathing : newFluency.breathing) && styles.switchActive]}
                >
                  <Text style={styles.switchText}>
                    {(editingFluency ? editingFluency.breathing : newFluency.breathing) ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  onPress={() => editingFluency
                    ? setEditingFluency({...editingFluency, is_active: !editingFluency.is_active})
                    : setNewFluency({...newFluency, is_active: !newFluency.is_active})
                  }
                  style={[styles.switch, (editingFluency ? editingFluency.is_active : newFluency.is_active) && styles.switchActive]}
                >
                  <Text style={styles.switchText}>
                    {(editingFluency ? editingFluency.is_active : newFluency.is_active) ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowFluencyModal(false);
                  setEditingFluency(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editingFluency ? handleUpdateFluency : handleCreateFluency}
              >
                <Text style={styles.saveButtonText}>
                  {editingFluency ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language (Expressive) Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowLanguageModal(false);
          setEditingLanguage(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLanguage ? 'Edit Language Exercise' : 'Add Language Exercise'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowLanguageModal(false);
                setEditingLanguage(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
            >
              <Text style={styles.label}>Level</Text>
              {editingLanguage && (
                <Text style={styles.currentValueText}>
                  Current: {getLanguageLevelName(editingLanguage.level)}
                </Text>
              )}
              {!editingLanguage && (
                <Text style={styles.selectionText}>
                  Selected: {getLanguageLevelName(newLanguage.level)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingLanguage ? editingLanguage.level : newLanguage.level}
                  onValueChange={(value) => {
                    if (editingLanguage) {
                      setEditingLanguage({...editingLanguage, level: value});
                    } else {
                      // Suggest first available order for new exercise
                      const availableOrders = getAvailableOrders(languageExercises, value);
                      setNewLanguage({...newLanguage, level: value, order: availableOrders[0] || 1});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Level 1 - Picture Description" value={1} />
                  <Picker.Item label="Level 2 - Sentence Formation" value={2} />
                  <Picker.Item label="Level 3 - Story Retell" value={3} />
                </Picker>
              </View>

              <Text style={styles.label}>Type</Text>
              {editingLanguage && (
                <Text style={styles.currentValueText}>
                  Current: {getLanguageTypeName(editingLanguage.type)}
                </Text>
              )}
              {!editingLanguage && (
                <Text style={styles.selectionText}>
                  Selected: {getLanguageTypeName(newLanguage.type)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingLanguage ? editingLanguage.type : newLanguage.type}
                  onValueChange={(value) => editingLanguage 
                    ? setEditingLanguage({...editingLanguage, type: value})
                    : setNewLanguage({...newLanguage, type: value})
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Description" value="description" />
                  <Picker.Item label="Sentence" value="sentence" />
                  <Picker.Item label="Retell" value="retell" />
                </Picker>
              </View>

              <Text style={styles.label}>Order (within level)</Text>
              {editingLanguage && (
                <Text style={styles.currentValueText}>
                  Current order: {editingLanguage.order}
                </Text>
              )}
              {!editingLanguage && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    languageExercises, 
                    newLanguage.level
                  ).join(', ')}
                </Text>
              )}
              {editingLanguage && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    languageExercises, 
                    editingLanguage.level,
                    editingLanguage._id
                  ).join(', ')}
                </Text>
              )}
              <TextInput
                style={styles.input}
                value={editingLanguage ? String(editingLanguage.order || '') : String(newLanguage.order || '')}
                onChangeText={(text) => {
                  const numValue = text === '' ? '' : parseInt(text) || '';
                  editingLanguage 
                    ? setEditingLanguage({...editingLanguage, order: numValue})
                    : setNewLanguage({...newLanguage, order: numValue});
                }}
                keyboardType="numeric"
                placeholder="Enter order number"
              />

              <Text style={styles.label}>Instruction</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingLanguage ? editingLanguage.instruction : newLanguage.instruction}
                onChangeText={(text) => editingLanguage 
                  ? setEditingLanguage({...editingLanguage, instruction: text})
                  : setNewLanguage({...newLanguage, instruction: text})
                }
                placeholder="Enter instructions..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Prompt (emojis/text/words)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingLanguage ? editingLanguage.prompt : newLanguage.prompt}
                onChangeText={(text) => editingLanguage 
                  ? setEditingLanguage({...editingLanguage, prompt: text})
                  : setNewLanguage({...newLanguage, prompt: text})
                }
                placeholder="e.g., 🏠🌳👨‍👩‍👧 or Words: boy, ball, playing"
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Expected Keywords (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={editingLanguage 
                  ? (Array.isArray(editingLanguage.expected_keywords) 
                    ? editingLanguage.expected_keywords.join(', ') 
                    : editingLanguage.expected_keywords)
                  : newLanguage.expected_keywords
                }
                onChangeText={(text) => editingLanguage 
                  ? setEditingLanguage({...editingLanguage, expected_keywords: text})
                  : setNewLanguage({...newLanguage, expected_keywords: text})
                }
                placeholder="e.g., house, tree, family, people"
              />

              <Text style={styles.label}>Minimum Words</Text>
              <TextInput
                style={styles.input}
                value={String(editingLanguage ? editingLanguage.min_words : newLanguage.min_words)}
                onChangeText={(text) => editingLanguage 
                  ? setEditingLanguage({...editingLanguage, min_words: parseInt(text) || 0})
                  : setNewLanguage({...newLanguage, min_words: parseInt(text) || 0})
                }
                keyboardType="numeric"
                placeholder="5"
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  onPress={() => editingLanguage
                    ? setEditingLanguage({...editingLanguage, is_active: !editingLanguage.is_active})
                    : setNewLanguage({...newLanguage, is_active: !newLanguage.is_active})
                  }
                  style={[styles.switch, (editingLanguage ? editingLanguage.is_active : newLanguage.is_active) && styles.switchActive]}
                >
                  <Text style={styles.switchText}>
                    {(editingLanguage ? editingLanguage.is_active : newLanguage.is_active) ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowLanguageModal(false);
                  setEditingLanguage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editingLanguage ? handleUpdateLanguage : handleCreateLanguage}
              >
                <Text style={styles.saveButtonText}>
                  {editingLanguage ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receptive Modal */}
      <Modal
        visible={showReceptiveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowReceptiveModal(false);
          setEditingReceptive(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReceptive ? 'Edit Receptive Exercise' : 'Add Receptive Exercise'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowReceptiveModal(false);
                setEditingReceptive(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
            >
              <Text style={styles.label}>Level</Text>
              {editingReceptive && (
                <Text style={styles.currentValueText}>
                  Current: {getReceptiveLevelName(editingReceptive.level)}
                </Text>
              )}
              {!editingReceptive && (
                <Text style={styles.selectionText}>
                  Selected: {getReceptiveLevelName(newReceptive.level)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingReceptive ? editingReceptive.level : newReceptive.level}
                  onValueChange={(value) => {
                    if (editingReceptive) {
                      setEditingReceptive({...editingReceptive, level: value});
                    } else {
                      // Suggest first available order for new exercise
                      const availableOrders = getAvailableOrders(receptiveExercises, value);
                      setNewReceptive({...newReceptive, level: value, order: availableOrders[0] || 1});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Level 1 - Vocabulary" value={1} />
                  <Picker.Item label="Level 2 - Directions" value={2} />
                  <Picker.Item label="Level 3 - Comprehension" value={3} />
                </Picker>
              </View>

              <Text style={styles.label}>Type</Text>
              {editingReceptive && (
                <Text style={styles.currentValueText}>
                  Current: {getReceptiveTypeName(editingReceptive.type)}
                </Text>
              )}
              {!editingReceptive && (
                <Text style={styles.selectionText}>
                  Selected: {getReceptiveTypeName(newReceptive.type)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingReceptive ? editingReceptive.type : newReceptive.type}
                  onValueChange={(value) => editingReceptive 
                    ? setEditingReceptive({...editingReceptive, type: value})
                    : setNewReceptive({...newReceptive, type: value})
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Vocabulary" value="vocabulary" />
                  <Picker.Item label="Directions" value="directions" />
                  <Picker.Item label="Comprehension" value="comprehension" />
                </Picker>
              </View>

              <Text style={styles.label}>Order (within level)</Text>
              {editingReceptive && (
                <Text style={styles.currentValueText}>
                  Current order: {editingReceptive.order}
                </Text>
              )}
              {!editingReceptive && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    receptiveExercises, 
                    newReceptive.level
                  ).join(', ')}
                </Text>
              )}
              {editingReceptive && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    receptiveExercises, 
                    editingReceptive.level,
                    editingReceptive._id
                  ).join(', ')}
                </Text>
              )}
              <TextInput
                style={styles.input}
                value={editingReceptive ? String(editingReceptive.order || '') : String(newReceptive.order || '')}
                onChangeText={(text) => {
                  const numValue = text === '' ? '' : parseInt(text) || '';
                  editingReceptive 
                    ? setEditingReceptive({...editingReceptive, order: numValue})
                    : setNewReceptive({...newReceptive, order: numValue});
                }}
                keyboardType="numeric"
                placeholder="Enter order number"
              />

              <Text style={styles.label}>Target</Text>
              <TextInput
                style={styles.input}
                value={editingReceptive ? editingReceptive.target : newReceptive.target}
                onChangeText={(text) => editingReceptive 
                  ? setEditingReceptive({...editingReceptive, target: text})
                  : setNewReceptive({...newReceptive, target: text})
                }
                placeholder="e.g., apple, blue circle, sleeping"
              />

              <Text style={styles.label}>Instruction</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingReceptive ? editingReceptive.instruction : newReceptive.instruction}
                onChangeText={(text) => editingReceptive 
                  ? setEditingReceptive({...editingReceptive, instruction: text})
                  : setNewReceptive({...newReceptive, instruction: text})
                }
                placeholder="Enter instructions..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.sectionTitle}>Options (with emojis/icons)</Text>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.optionRow}>
                  <View style={{flex: 2}}>
                    <Text style={styles.label}>Option {index + 1} Text</Text>
                    <TextInput
                      style={styles.input}
                      value={editingReceptive 
                        ? (editingReceptive.options[index]?.text || '') 
                        : (newReceptive.options[index]?.text || '')
                      }
                      onChangeText={(text) => {
                        const updatedOptions = editingReceptive 
                          ? [...editingReceptive.options]
                          : [...newReceptive.options];
                        updatedOptions[index] = {...updatedOptions[index], text};
                        if (editingReceptive) {
                          setEditingReceptive({...editingReceptive, options: updatedOptions});
                        } else {
                          setNewReceptive({...newReceptive, options: updatedOptions});
                        }
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </View>
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.label}>Emoji/Icon</Text>
                    <TextInput
                      style={[styles.input, {fontSize: 20, textAlign: 'center'}]}
                      value={editingReceptive 
                        ? (editingReceptive.options[index]?.emoji || '') 
                        : (newReceptive.options[index]?.emoji || '')
                      }
                      onChangeText={(text) => {
                        const updatedOptions = editingReceptive 
                          ? [...editingReceptive.options]
                          : [...newReceptive.options];
                        updatedOptions[index] = {...updatedOptions[index], emoji: text};
                        if (editingReceptive) {
                          setEditingReceptive({...editingReceptive, options: updatedOptions});
                        } else {
                          setNewReceptive({...newReceptive, options: updatedOptions});
                        }
                      }}
                      placeholder="📖"
                    />
                  </View>
                </View>
              ))}

              <Text style={styles.label}>Correct Answer (1-4)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={(editingReceptive ? editingReceptive.correct_answer : newReceptive.correct_answer) + 1}
                  onValueChange={(value) => {
                    const index = value - 1;
                    if (editingReceptive) {
                      setEditingReceptive({...editingReceptive, correct_answer: index});
                    } else {
                      setNewReceptive({...newReceptive, correct_answer: index});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Option 1" value={1} />
                  <Picker.Item label="Option 2" value={2} />
                  <Picker.Item label="Option 3" value={3} />
                  <Picker.Item label="Option 4" value={4} />
                </Picker>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  onPress={() => editingReceptive
                    ? setEditingReceptive({...editingReceptive, is_active: !editingReceptive.is_active})
                    : setNewReceptive({...newReceptive, is_active: !newReceptive.is_active})
                  }
                  style={[styles.switch, (editingReceptive ? editingReceptive.is_active : newReceptive.is_active) && styles.switchActive]}
                >
                  <Text style={styles.switchText}>
                    {(editingReceptive ? editingReceptive.is_active : newReceptive.is_active) ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowReceptiveModal(false);
                  setEditingReceptive(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editingReceptive ? handleUpdateReceptive : handleCreateReceptive}
              >
                <Text style={styles.saveButtonText}>
                  {editingReceptive ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Articulation Modal */}
      <Modal
        visible={showArticulationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowArticulationModal(false);
          setEditingArticulation(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingArticulation ? 'Edit Articulation Exercise' : 'Add Articulation Exercise'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowArticulationModal(false);
                setEditingArticulation(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
            >
              <Text style={styles.label}>Sound</Text>
              {editingArticulation && (
                <Text style={styles.currentValueText}>
                  Current: {getArticulationSoundName(editingArticulation.sound_id)}
                </Text>
              )}
              {!editingArticulation && (
                <Text style={styles.selectionText}>
                  Selected: {getArticulationSoundName(newArticulation.sound_id)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingArticulation ? editingArticulation.sound_id : newArticulation.sound_id}
                  onValueChange={(value) => {
                    if (editingArticulation) {
                      setEditingArticulation({...editingArticulation, sound_id: value});
                    } else {
                      // Update sound and recalculate available order for the new sound
                      const soundExercises = articulationExercises[value]?.levels || {};
                      const availableOrders = getAvailableOrders(
                        soundExercises, 
                        newArticulation.level
                      );
                      setNewArticulation({...newArticulation, sound_id: value, order: availableOrders[0] || 1});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="S Sound" value="s" />
                  <Picker.Item label="R Sound" value="r" />
                  <Picker.Item label="L Sound" value="l" />
                  <Picker.Item label="K Sound" value="k" />
                  <Picker.Item label="TH Sound" value="th" />
                </Picker>
              </View>

              <Text style={styles.label}>Level</Text>
              {editingArticulation && (
                <Text style={styles.currentValueText}>
                  Current: {getArticulationLevelName(editingArticulation.level)}
                </Text>
              )}
              {!editingArticulation && (
                <Text style={styles.selectionText}>
                  Selected: {getArticulationLevelName(newArticulation.level)}
                </Text>
              )}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editingArticulation ? editingArticulation.level : newArticulation.level}
                  onValueChange={(value) => {
                    if (editingArticulation) {
                      setEditingArticulation({...editingArticulation, level: value});
                    } else {
                      // Suggest first available order for new exercise using current sound_id
                      const soundExercises = articulationExercises[newArticulation.sound_id]?.levels || {};
                      const availableOrders = getAvailableOrders(
                        soundExercises, 
                        value
                      );
                      setNewArticulation({...newArticulation, level: value, order: availableOrders[0] || 1});
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Level 1 - Sound" value={1} />
                  <Picker.Item label="Level 2 - Syllable" value={2} />
                  <Picker.Item label="Level 3 - Word" value={3} />
                  <Picker.Item label="Level 4 - Phrase" value={4} />
                  <Picker.Item label="Level 5 - Sentence" value={5} />
                </Picker>
              </View>

              <Text style={styles.label}>Order (within level)</Text>
              {editingArticulation && (
                <Text style={styles.currentValueText}>
                  Current order: {editingArticulation.order}
                </Text>
              )}
              {!editingArticulation && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    articulationExercises[newArticulation.sound_id]?.levels || {}, 
                    newArticulation.level
                  ).join(', ')}
                </Text>
              )}
              {editingArticulation && (
                <Text style={styles.recommendationText}>
                  Available orders: {getAvailableOrders(
                    articulationExercises[editingArticulation.sound_id]?.levels || {}, 
                    editingArticulation.level,
                    editingArticulation._id
                  ).join(', ')}
                </Text>
              )}
              <TextInput
                style={styles.input}
                value={editingArticulation ? String(editingArticulation.order || '') : String(newArticulation.order || '')}
                onChangeText={(text) => {
                  const numValue = text === '' ? '' : parseInt(text) || '';
                  editingArticulation 
                    ? setEditingArticulation({...editingArticulation, order: numValue})
                    : setNewArticulation({...newArticulation, order: numValue});
                }}
                keyboardType="numeric"
                placeholder="Enter order number"
              />

              <Text style={styles.label}>Target</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingArticulation ? editingArticulation.target : newArticulation.target}
                onChangeText={(text) => editingArticulation 
                  ? setEditingArticulation({...editingArticulation, target: text})
                  : setNewArticulation({...newArticulation, target: text})
                }
                placeholder="Enter target sound/syllable/word/phrase/sentence..."
                multiline
                numberOfLines={2}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  onPress={() => editingArticulation
                    ? setEditingArticulation({...editingArticulation, is_active: !editingArticulation.is_active})
                    : setNewArticulation({...newArticulation, is_active: !newArticulation.is_active})
                  }
                  style={[styles.switch, (editingArticulation ? editingArticulation.is_active : newArticulation.is_active) && styles.switchActive]}
                >
                  <Text style={styles.switchText}>
                    {(editingArticulation ? editingArticulation.is_active : newArticulation.is_active) ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowArticulationModal(false);
                  setEditingArticulation(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editingArticulation ? handleUpdateArticulation : handleCreateArticulation}
              >
                <Text style={styles.saveButtonText}>
                  {editingArticulation ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Story Modal */}
      <Modal
        visible={showSuccessStoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowSuccessStoryModal(false);
          setEditingStory(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStory ? 'Edit Success Story' : 'Add Success Story'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowSuccessStoryModal(false);
                setEditingStory(null);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Patient Name *</Text>
              <TextInput
                style={styles.input}
                value={newStory.patientName}
                onChangeText={(text) => setNewStory({...newStory, patientName: text})}
                placeholder="Enter patient name"
              />

              <Text style={styles.label}>Success Story *</Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                value={newStory.story}
                onChangeText={(text) => setNewStory({...newStory, story: text})}
                placeholder="Share the patient's inspiring recovery journey..."
                multiline
                numberOfLines={6}
              />

              <View style={styles.imagesSection}>
                <View style={styles.imagesSectionHeader}>
                  <Text style={styles.label}>Images</Text>
                  <TouchableOpacity style={styles.pickImagesButton} onPress={handlePickImages}>
                    <Ionicons name="images" size={18} color="#FFF" />
                    <Text style={styles.pickImagesButtonText}>Pick Images</Text>
                  </TouchableOpacity>
                </View>

                {newStory.images && newStory.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                    {newStory.images.map((img, index) => (
                      <View key={index} style={styles.imagePreviewContainer}>
                        <Image
                          source={{ uri: img.uri || img }}
                          style={styles.imagePreview}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#C9302C" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {(!newStory.images || newStory.images.length === 0) && (
                  <View style={styles.emptyImagesContainer}>
                    <Ionicons name="image-outline" size={40} color="#CCC" />
                    <Text style={styles.emptyImagesText}>No images selected</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowSuccessStoryModal(false);
                  setEditingStory(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveSuccessStory}
              >
                <Text style={styles.saveButtonText}>
                  {editingStory ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  headerText: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  logoutButton: {
    padding: 8,
  },
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxHeight: 40,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  tabButtonActive: {
    backgroundColor: '#C9302C',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  
  // Overview Styles
  overviewContainer: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#C9302C',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 12,
  },
  welcomeName: {
    fontSize: 17,
    color: '#C9302C',
    marginTop: 4,
    fontWeight: '600',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  categoryList: {
    marginLeft: 8,
  },
  categoryItem: {
    fontSize: 13,
    color: '#555',
    marginVertical: 3,
    lineHeight: 20,
  },
  
  // Tab Content Styles
  tabContent: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9302C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loader: {
    marginTop: 50,
  },
  exercisesList: {
    flex: 1,
    padding: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 6,
  },
  
  // Level Section Styles
  levelSection: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exerciseCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '600',
  },
  
  // Exercise Card Styles
  exerciseCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 8,
  },
  exerciseId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  exerciseType: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 3,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: '#10B981',
  },
  inactiveBadge: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  exerciseInstruction: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    lineHeight: 19,
  },
  exerciseDetails: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#C9302C',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  breathingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  breathingText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },
  
  // Language Sub-tabs
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#C9302C',
  },
  subTabNav: {
    maxHeight: 32,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  subTabTextActive: {
    color: '#C9302C',
    fontWeight: 'bold',
  },
  
  // Receptive Options
  optionsContainer: {
    marginTop: 10,
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 6,
  },
  optionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  
  // Articulation Sound Selector
  soundSelector: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 50,
  },
  soundTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundTabActive: {
    backgroundColor: '#C9302C',
    borderColor: '#C9302C',
  },
  soundTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  soundTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Header Buttons Container
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    marginLeft: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: width * 0.95,
    height: height * 0.90,
    padding: 20,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalForm: {
    flex: 1,
    paddingBottom: 10,
  },
  modalFormScroll: {
    flex: 1,
  },
  modalFormContent: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
    marginTop: 12,
  },
  currentValueText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  recommendationText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  selectionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#2C3E50',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  switch: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    minWidth: 60,
    alignItems: 'center',
  },
  switchActive: {
    backgroundColor: '#10B981',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#C9302C',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ===== PATIENT PROGRESS STYLES =====
  progressList: {
    flex: 1,
  },
  progressListContent: {
    paddingBottom: 80,
    paddingTop: 10,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressPatientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  progressPatientEmail: {
    fontSize: 13,
    color: '#999',
  },
  progressStats: {
    alignItems: 'center',
    backgroundColor: '#C9302C15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9302C',
  },
  progressStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  progressDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  progressDetailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  progressDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  progressLevelText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressLastTrial: {
    fontSize: 11,
    color: '#999',
  },
  progressContent: {
    flex: 1,
  },
  physicalPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  // Success Story Styles
  storyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storyHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  storyPatientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  storyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  storyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  storyImages: {
    marginBottom: 12,
  },
  storyImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  storyContent: {
    marginBottom: 12,
  },
  storyText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  readMoreText: {
    fontSize: 12,
    color: '#6B9AC4',
    marginTop: 4,
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storyMetaText: {
    fontSize: 12,
    color: '#999',
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B9AC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pickImagesButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreviewScroll: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyImagesContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyImagesText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  textAreaLarge: {
    height: 120,
    textAlignVertical: 'top',
  },

  // Reports styles
  reportsContainer: {
    padding: 20,
  },
  reportsContent: {
    marginTop: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardHeader: {
    marginBottom: 16,
  },
  reportTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reportCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reportCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  reportCardBody: {
    flex: 1,
  },
  ageBracketsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  ageBracketItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  ageBracketHighest: {
    backgroundColor: '#FFF5F5',
    borderLeftColor: '#C9302C',
  },
  bracketLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bracketCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9302C',
    marginBottom: 2,
  },
  bracketPercentage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  highestBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#C9302C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highestBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bracketBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bracketBarFill: {
    height: '100%',
    backgroundColor: '#C9302C',
    borderRadius: 2,
  },
  summaryContainer: {
    backgroundColor: '#F0F4F8',
    padding: 16,
    borderRadius: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCount: {
    fontSize: 14,
    color: '#C9302C',
    fontWeight: '600',
  },
  genderContainer: {
    gap: 16,
    marginBottom: 16,
  },
  genderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    gap: 16,
  },
  genderIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
  },
  genderEmoji: {
    fontSize: 20,
  },
  genderInfo: {
    flex: 1,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  genderCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  genderPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C9302C',
    marginBottom: 8,
  },
  genderBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  genderBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9302C',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  noDataLarge: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  noDataTitle: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
    marginTop: 16,
  },
  noDataHint: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  // ===== Missing styles for Success Stories tab =====
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyButton: {
    backgroundColor: '#C9302C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 30,
  },
});

export default TherapistDashboard;
