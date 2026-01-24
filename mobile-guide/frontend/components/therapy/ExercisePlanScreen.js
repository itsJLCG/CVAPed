import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../SafeAreaWrapper';
import { exerciseApi } from '../../services/api';

const ExercisePlanScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const planId = route?.params?.planId;

  useEffect(() => {
    if (planId) {
      loadPlanById(planId);
    } else {
      loadTodaysPlan();
    }
  }, [planId]);

  const loadPlanById = async (id) => {
    try {
      setLoading(true);
      const response = await exerciseApi.getPlanById(id);
      console.log('getPlanById response:', response);
      if (response.success && response.plan) {
        setPlan(response.plan);
      } else {
        Alert.alert('No Plan', 'Exercise plan not found.');
      }
    } catch (error) {
      console.error('Error loading exercise plan:', error);
      Alert.alert('Error', 'Failed to load exercise plan');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysPlan = async () => {
    try {
      setLoading(true);
      const response = await exerciseApi.getTodaysPlan();
      console.log('getTodaysPlan response:', response);
      if (response.success && response.plan) {
        setPlan(response.plan);
      } else {
        Alert.alert('No Plan', 'No exercise plan found for today.');
      }
    } catch (error) {
      console.error('Error loading exercise plan:', error);
      Alert.alert('Error', 'Failed to load exercise plan');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return '#DC2626';
      case 'moderate': return '#F59E0B';
      case 'mild': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getSeverityBadgeStyle = (severity) => ({
    ...styles.severityBadge,
    backgroundColor: getSeverityColor(severity),
  });

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return '#DC2626';
      case 'moderate': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handleViewExerciseDetails = (exercise) => {
    setSelectedExercise(exercise);
    setShowDetailModal(true);
  };

  const handleStartExercises = () => {
    navigation.navigate('ExerciseChecklist', { 
      planId: plan._id,
      exercises: plan.exercises 
    });
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading exercise plan...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!plan) {
    return (
      <SafeAreaWrapper>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Exercise Plan</Text>
          <Text style={styles.emptyText}>
            Complete a gait analysis to receive personalized exercise recommendations.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('GaitAnalysis')}
          >
            <Text style={styles.primaryButtonText}>Start Gait Analysis</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  const completionPercentage = Math.round(plan.completion_percentage || 0);
  const riskLevel = plan.detected_problems?.[0]?.risk_level || 'moderate';

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        {/* Back Button Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#0066CC" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Today's Exercise Plan</Text>
              <Text style={styles.headerDate}>
                {new Date(plan.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(riskLevel) }]}>
              <Text style={styles.riskBadgeText}>{riskLevel.toUpperCase()}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {plan.exercises_completed} of {plan.total_exercises} exercises completed
            </Text>
          </View>
        </View>

        {/* Detected Problems */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
            <Text style={styles.sectionTitle}>Detected Issues</Text>
          </View>
          {plan.detected_problems?.map((problem, index) => (
            <View key={index} style={styles.problemCard}>
              <View style={styles.problemHeader}>
                <Text style={styles.problemTitle}>
                  {(problem.problem || problem.type || 'Unknown')?.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <View style={getSeverityBadgeStyle(problem.severity)}>
                  <Text style={styles.severityBadgeText}>{problem.severity || 'unknown'}</Text>
                </View>
              </View>
              <Text style={styles.problemDescription}>{problem.description || 'No description available'}</Text>
              <View style={styles.problemMetric}>
                <Text style={styles.metricLabel}>Your Value:</Text>
                <Text style={styles.metricValue}>{problem.current_value || problem.user_value || 'N/A'}</Text>
              </View>
              <View style={styles.problemMetric}>
                <Text style={styles.metricLabel}>Normal Range:</Text>
                <Text style={styles.metricValue}>{problem.normal_range || 'N/A'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recommended Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Your Exercises</Text>
          </View>
          {plan.exercises?.map((exercise, index) => (
            <View key={exercise.exercise_id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumberBadge}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseTitleSection}>
                  <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.exerciseMetaText}>{exercise.duration}</Text>
                  </View>
                </View>
                {exercise.completed && (
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                )}
              </View>

              <Text style={styles.exerciseDescription} numberOfLines={2}>
                {exercise.description}
              </Text>

              {/* Quick Instructions Preview */}
              {exercise.instructions?.length > 0 && (
                <View style={styles.instructionsPreview}>
                  <Text style={styles.instructionItem}>
                    • {exercise.instructions[0]}
                  </Text>
                  {exercise.instructions.length > 1 && (
                    <Text style={styles.moreInstructions}>
                      +{exercise.instructions.length - 1} more steps
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleViewExerciseDetails(exercise)}
              >
                <Text style={styles.detailsButtonText}>View Full Instructions</Text>
                <Ionicons name="chevron-forward" size={16} color="#0066CC" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.startButton,
              plan.all_exercises_completed && styles.startButtonCompleted
            ]}
            onPress={handleStartExercises}
          >
            <Ionicons 
              name={plan.all_exercises_completed ? "checkmark-circle" : "play-circle"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.startButtonText}>
              {plan.all_exercises_completed ? 'Review Exercises' : 'Start Exercises'}
            </Text>
          </TouchableOpacity>

          {plan.can_retest_gait && (
            <View style={styles.retestNotice}>
              <Ionicons name="information-circle" size={20} color="#10B981" />
              <Text style={styles.retestNoticeText}>
                You can now re-test your gait to track improvement!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>{selectedExercise?.description}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Instructions</Text>
                {selectedExercise?.instructions?.map((instruction, index) => (
                  <View key={index} style={styles.instructionRow}>
                    <View style={styles.instructionNumberBadge}>
                      <Text style={styles.instructionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </View>

              {selectedExercise?.precautions?.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.precautionHeader}>
                    <Ionicons name="warning" size={20} color="#F59E0B" />
                    <Text style={styles.modalSectionTitle}>Precautions</Text>
                  </View>
                  {selectedExercise.precautions.map((precaution, index) => (
                    <Text key={index} style={styles.precautionText}>• {precaution}</Text>
                  ))}
                </View>
              )}

              {selectedExercise?.benefits?.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Benefits</Text>
                  {selectedExercise.benefits.map((benefit, index) => (
                    <Text key={index} style={styles.benefitText}>✓ {benefit}</Text>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066CC',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0066CC',
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  problemCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  problemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  problemDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 12,
    lineHeight: 20,
  },
  problemMetric: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    width: 110,
  },
  metricValue: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  exerciseCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exerciseTitleSection: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseMetaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  instructionsPreview: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  moreInstructions: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 6,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginRight: 4,
  },
  timelineCard: {
    backgroundColor: '#F5F3FF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 8,
  },
  timelineWeeks: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 4,
  },
  timelineConfidence: {
    fontSize: 13,
    color: '#7C3AED',
    marginBottom: 16,
  },
  milestones: {
    borderTopWidth: 1,
    borderTopColor: '#DDD6FE',
    paddingTop: 12,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 8,
  },
  milestoneItem: {
    fontSize: 13,
    color: '#6D28D9',
    marginBottom: 4,
  },
  actionSection: {
    padding: 16,
  },
  startButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonCompleted: {
    backgroundColor: '#10B981',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  retestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  retestNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  precautionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  precautionText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
    marginBottom: 6,
  },
  modalCloseButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ExercisePlanScreen;
