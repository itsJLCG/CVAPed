import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReceptiveLanguageScreen from './ReceptiveLanguageScreen';
import ExpressiveLanguageScreen from './ExpressiveLanguageScreen';
import FluencyTherapyScreen from './FluencyTherapyScreen';

const { width } = Dimensions.get('window');

const LanguageTherapyScreen = ({ onBack }) => {
  const [currentScreen, setCurrentScreen] = useState('selection'); // 'selection', 'receptive', 'expressive', 'fluency'
  const [triggerReload, setTriggerReload] = useState(0);

  const handleBackToSelection = () => {
    setCurrentScreen('selection');
  };

  const handleNavigateToReceptive = () => {
    setCurrentScreen('receptive');
    setTriggerReload(prev => prev + 1); // Trigger reload when returning
  };

  const handleNavigateToExpressive = () => {
    setCurrentScreen('expressive');
    setTriggerReload(prev => prev + 1); // Trigger reload when returning
  };

  const handleNavigateToFluency = () => {
    setCurrentScreen('fluency');
    setTriggerReload(prev => prev + 1); // Trigger reload when returning
  };

  if (currentScreen === 'receptive') {
    return <ReceptiveLanguageScreen onBack={handleBackToSelection} reloadTrigger={triggerReload} />;
  }

  if (currentScreen === 'expressive') {
    return <ExpressiveLanguageScreen onBack={handleBackToSelection} reloadTrigger={triggerReload} />;
  }

  if (currentScreen === 'fluency') {
    return <FluencyTherapyScreen onBack={handleBackToSelection} />;
  }

  const therapyAreas = [
    {
      id: 1,
      icon: '💬',
      title: 'Receptive Language',
      subtitle: 'Understanding & Comprehension',
      color: '#4A90E2',
      skills: [
        'Listening Comprehension',
        'Following Directions',
        'Vocabulary Recognition',
        'Sentence Understanding',
      ],
    },
    {
      id: 2,
      icon: '💬',
      title: 'Expressive Language',
      subtitle: 'Communication & Expression',
      color: '#9B59B6',
      skills: [
        'Picture Description',
        'Sentence Formation',
        'Story Retelling',
        'Verbal Expression',
      ],
    },
    {
      id: 3,
      icon: '🗣️',
      title: 'Fluency Therapy',
      subtitle: 'Speech Flow & Rhythm',
      color: '#F4A460',
      skills: [
        'Speech Flow Practice',
        'Rhythm & Pacing',
        'Fluency Techniques',
        'Speech Rate Control',
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language Therapy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Language Therapy Assessment</Text>
          <Text style={styles.subtitle}>Choose your therapy focus area</Text>
        </View>

        {/* Therapy Areas */}
        <View style={styles.areasContainer}>
          {therapyAreas.map((area) => (
            <View key={area.id} style={styles.areaCard}>
              {/* Icon Badge */}
              <View style={styles.iconBadgeContainer}>
                <View style={[styles.iconBadge, { backgroundColor: area.color }]}>
                  <Text style={styles.iconText}>{area.icon}</Text>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.areaTitle}>{area.title}</Text>
                  <Text style={[styles.areaSubtitle, { color: area.color }]}>
                    {area.subtitle}
                  </Text>

                  {/* Skills List */}
                  <View style={styles.skillsList}>
                  {area.skills.map((skill, index) => (
                    <View key={index} style={styles.skillItem}>
                      <Text style={styles.checkmark}>✓</Text>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                  </View>
                </View>

                {/* Start Button */}
                <TouchableOpacity 
                  style={[styles.exerciseButton, { backgroundColor: area.color }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (area.id === 1) {
                      handleNavigateToReceptive();
                    } else if (area.id === 2) {
                      handleNavigateToExpressive();
                    } else if (area.id === 3) {
                      handleNavigateToFluency();
                    }
                  }}
                >
                  <Text style={styles.exerciseButtonText}>START THERAPY</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  headerSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  areasContainer: {
    padding: 15,
    gap: 15,
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flexDirection: 'column',
    width: '100%',
  },
  iconBadgeContainer: {
    marginBottom: 15,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  iconText: {
    fontSize: 30,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  areaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  areaSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  skillsList: {
    marginBottom: 20,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 16,
    color: '#27AE60',
    marginRight: 10,
    fontWeight: 'bold',
  },
  skillText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  exerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  exerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default LanguageTherapyScreen;
