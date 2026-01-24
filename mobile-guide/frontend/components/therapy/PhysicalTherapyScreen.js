import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GaitAnalysisScreen from './GaitAnalysisScreen';
import ExercisePlanScreen from './ExercisePlanScreen';
import ExerciseChecklistScreen from './ExerciseChecklistScreen';
import { exerciseApi } from '../../services/api';

const { width } = Dimensions.get('window');

const PhysicalTherapyScreen = ({ onBack }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showGaitAnalysis, setShowGaitAnalysis] = useState(false);
  const [showExercisePlan, setShowExercisePlan] = useState(false);
  const [showExerciseChecklist, setShowExerciseChecklist] = useState(false);
  const [exercisePlanId, setExercisePlanId] = useState(null);

  useEffect(() => {
    // Fade in and slide up animation for header
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleMobileDevice = async () => {
    try {
      console.log('=== Checking if user can perform gait analysis ===');
      
      // Check if user has incomplete exercises
      const userStr = await AsyncStorage.getItem('userData');
      if (!userStr) {
        console.log('❌ No user found in storage');
        setShowGaitAnalysis(true);
        return;
      }
      
      const userData = JSON.parse(userStr);
      const userId = userData.user?._id || userData._id;
      console.log('✓ User ID:', userId);
      
      if (!userId) {
        console.log('❌ No user ID found in userData');
        setShowGaitAnalysis(true);
        return;
      }
      
      const canAnalyzeResponse = await exerciseApi.canAnalyze(userId);
      console.log('✓ canAnalyze response:', JSON.stringify(canAnalyzeResponse, null, 2));
      
      // Check if user is allowed to perform gait analysis
      const isAllowed = canAnalyzeResponse.allowed;
      console.log('✓ Is allowed:', isAllowed);
      
      if (!isAllowed) {
        console.log('❌ User has incomplete exercises - redirecting to exercise plan');
        
        // Get today's exercise plan
        const planResponse = await exerciseApi.getTodaysPlan();
        console.log('✓ Plan response:', planResponse.success ? 'Success' : 'Failed');
        
        if (planResponse.success && planResponse.plan) {
          console.log('✓ Showing exercise plan screen with ID:', planResponse.plan._id);
          // Show exercise plan screen instead of gait analysis
          setExercisePlanId(planResponse.plan._id);
          setShowExercisePlan(true);
          return;
        } else {
          console.log('❌ No plan found, showing gait analysis anyway');
        }
      } else {
        console.log('✓ User is allowed - showing gait analysis screen');
      }
    } catch (error) {
      console.log('❌ Error checking exercise status:', error);
      // Continue to gait analysis if check fails
    }
    
    // No incomplete exercises or check failed - show gait analysis
    console.log('→ Displaying gait analysis screen');
    setShowGaitAnalysis(true);
  };

  const handleWearableDevice = () => {
    setShowComingSoonModal(true);
  };

  // If showing exercise checklist, render that screen
  if (showExerciseChecklist) {
    return (
      <ExerciseChecklistScreen 
        navigation={{ 
          goBack: () => setShowExerciseChecklist(false),
          navigate: (screen, params) => {
            if (screen === 'ExercisePlan') {
              setExercisePlanId(params.planId);
              setShowExerciseChecklist(false);
              setShowExercisePlan(true);
            } else if (screen === 'GaitAnalysis') {
              setShowExerciseChecklist(false);
              setShowGaitAnalysis(true);
            }
          }
        }} 
        route={{ params: { planId: exercisePlanId } }} 
      />
    );
  }

  // If showing exercise plan, render that screen
  if (showExercisePlan) {
    return (
      <ExercisePlanScreen 
        navigation={{ 
          goBack: () => setShowExercisePlan(false), 
          navigate: (screen, params) => {
            if (screen === 'ExerciseChecklist') {
              setExercisePlanId(params.planId);
              setShowExercisePlan(false);
              setShowExerciseChecklist(true);
            }
          }
        }} 
        route={{ params: { planId: exercisePlanId } }} 
      />
    );
  }

  // If showing gait analysis, render that screen instead
  if (showGaitAnalysis) {
    return (
      <GaitAnalysisScreen 
        onBack={() => setShowGaitAnalysis(false)} 
        onNavigateToExercisePlan={(planId) => {
          setExercisePlanId(planId);
          setShowGaitAnalysis(false);
          setShowExercisePlan(true);
        }}
      />
    );
  }
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Physical Therapy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section with Animation */}
        <Animated.View 
          style={[
            styles.welcomeSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="walk" size={50} color="#C9302C" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Physical Therapy</Text>
          <Text style={styles.welcomeSubtitle}>For Stroke Patients</Text>
          <Text style={styles.welcomeDescription}>
            CVAPed specializes in physical therapy designed specifically for stroke patients, 
            with a primary focus on improving walking ability and gait rehabilitation.
          </Text>
        </Animated.View>

        {/* Gait Analysis Info Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <Ionicons name="analytics" size={28} color="#C9302C" />
            <Text style={styles.infoTitle}>Let's Start with Gait Analysis</Text>
          </View>
          
          <Text style={styles.infoDescription}>
            Gait analysis is a systematic study of human walking patterns. It helps us:
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
              <Text style={styles.benefitText}>Assess your current walking pattern</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
              <Text style={styles.benefitText}>Identify areas needing improvement</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
              <Text style={styles.benefitText}>Create personalized therapy plans</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
              <Text style={styles.benefitText}>Track progress over time</Text>
            </View>
          </View>
        </Animated.View>

        {/* Device Selection Section */}
        <Animated.View 
          style={[
            styles.deviceSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.deviceSectionTitle}>Choose Your Device</Text>
          <Text style={styles.deviceSectionSubtitle}>Select how you'd like to perform the gait analysis</Text>

          {/* Mobile Device Option */}
          <TouchableOpacity 
            style={styles.deviceCard}
            onPress={handleMobileDevice}
            activeOpacity={0.8}
          >
            <View style={styles.deviceIconContainer}>
              <Ionicons name="phone-portrait" size={40} color="#C9302C" />
            </View>
            <View style={styles.deviceContent}>
              <Text style={styles.deviceTitle}>Use My Mobile Device</Text>
              <Text style={styles.deviceDescription}>
                Use your smartphone's built-in sensors to perform gait analysis
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C9302C" />
          </TouchableOpacity>

          {/* Wearable Device Option - Locked */}
          <TouchableOpacity 
            style={[styles.deviceCard, styles.lockedCard]}
            onPress={handleWearableDevice}
            activeOpacity={0.8}
          >
            <View style={styles.deviceIconContainer}>
              <Ionicons name="footsteps" size={40} color="#95A5A6" />
            </View>
            <View style={styles.deviceContent}>
              <View style={styles.titleWithBadge}>
                <Text style={[styles.deviceTitle, styles.lockedText]}>Use Wearable Device</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.deviceDescription, styles.lockedText]}>
                Connect specialized wearable sensors for advanced gait analysis
              </Text>
            </View>
            <Ionicons name="lock-closed" size={24} color="#95A5A6" />
          </TouchableOpacity>

          {/* View Exercise Plan Button */}
          <TouchableOpacity 
            style={styles.viewExercisesButton}
            onPress={async () => {
              try {
                const planResponse = await exerciseApi.getTodaysPlan();
                if (planResponse.success && planResponse.plan) {
                  setExercisePlanId(planResponse.plan._id);
                  setShowExercisePlan(true);
                } else {
                  // No plan available
                  alert('No exercise plan available. Complete a gait analysis first.');
                }
              } catch (error) {
                console.error('Error loading exercise plan:', error);
                alert('No exercise plan found. Please perform a gait analysis first.');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={24} color="#0066CC" />
            <Text style={styles.viewExercisesButtonText}>View My Exercise Plan</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoonModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowComingSoonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="construct" size={60} color="#F4A460" />
            </View>
            <Text style={styles.modalTitle}>Coming Soon!</Text>
            <Text style={styles.modalDescription}>
              We're currently working on the hardware integration for wearable devices. 
              Our development team is creating specialized sensors that will provide 
              even more accurate gait analysis data.
            </Text>
            <Text style={styles.modalNote}>
              Stay tuned for updates!
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowComingSoonModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },

  // Welcome Section
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#C9302C',
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginVertical: 25,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9302C',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  infoDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 15,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },

  // Device Selection Section
  deviceSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deviceSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  deviceSectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 25,
    textAlign: 'center',
  },

  // Device Cards
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#C9302C',
  },
  lockedCard: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  deviceIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  deviceContent: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  deviceDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  lockedText: {
    color: '#95A5A6',
  },
  comingSoonBadge: {
    backgroundColor: '#F4A460',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  viewExercisesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
  },
  viewExercisesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  modalNote: {
    fontSize: 14,
    color: '#F4A460',
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 25,
  },
  modalButton: {
    backgroundColor: '#C9302C',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhysicalTherapyScreen;
