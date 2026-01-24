import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArticulationTherapyScreen from './speech/ArticulationTherapyScreen';
import LanguageTherapyScreen from './speech/LanguageTherapyScreen';
import FluencyTherapyScreen from './speech/FluencyTherapyScreen';

const { width } = Dimensions.get('window');

const SpeechTherapyScreen = ({ onBack }) => {
  console.log('SpeechTherapyScreen rendered');
  
  const [selectedTherapy, setSelectedTherapy] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in and slide up animation for welcome section
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

    // Stagger animation for cards
    Animated.stagger(200, [
      Animated.timing(card1Anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(card2Anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(card3Anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBeginAssessment = (therapyType) => {
    setSelectedTherapy(therapyType);
  };

  const handleBackFromTherapy = () => {
    setSelectedTherapy(null);
  };

  // Show specific therapy screen if selected
  if (selectedTherapy === 'articulation') {
    return <ArticulationTherapyScreen onBack={handleBackFromTherapy} />;
  }
  if (selectedTherapy === 'language') {
    return <LanguageTherapyScreen onBack={handleBackFromTherapy} />;
  }
  if (selectedTherapy === 'fluency') {
    return <FluencyTherapyScreen onBack={handleBackFromTherapy} />;
  }

  const therapyTypes = [
    {
      id: 1,
      icon: 'mic',
      title: 'Articulation Therapy',
      subtitle: 'Sound Production & Pronunciation',
      description: 'Clinical speech sound therapy focused on improving articulation accuracy and phonological development through systematic assessment and intervention.',
      color: '#FF6B6B',
      type: 'articulation',
      animRef: card1Anim,
      features: [
        'Standardized pronunciation assessments',
        'Multi-trial recording system',
        'Real-time accuracy feedback',
        'Comprehensive progress tracking',
      ],
    },
    {
      id: 2,
      icon: 'chatbubbles',
      title: 'Language Therapy',
      subtitle: 'Receptive & Expressive Language',
      description: 'Comprehensive language intervention program designed to support receptive development, comprehension skills, and expressive language use.',
      color: '#4ECDC4',
      type: 'language',
      animRef: card2Anim,
      features: [
        'Receptive language assessment',
        'Expressive language evaluation',
        'Grammar and syntax exercises',
        'Age-appropriate progression',
      ],
    },
    {
      id: 3,
      icon: 'volume-high',
      title: 'Fluency Therapy',
      subtitle: 'Speech Flow & Rate Control',
      description: 'Evidence-based fluency intervention program designed to address stuttering behaviors and improve speech flow through systematic techniques.',
      color: '#F4A460',
      type: 'fluency',
      animRef: card3Anim,
      features: [
        'Structured speaking tasks',
        'Speech rate analysis (WPM)',
        'Dysfluency identification',
        'Real-time biofeedback',
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
        <Text style={styles.headerTitle}>Speech Therapy</Text>
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
            <Ionicons name="chatbubbles" size={50} color="#6B9AC4" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Speech Therapy</Text>
          <Text style={styles.welcomeSubtitle}>For Children</Text>
          <Text style={styles.welcomeDescription}>
            CVAPed provides comprehensive speech therapy programs designed to improve 
            communication skills for children through specialized therapy types tailored 
            to specific needs.
          </Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={28} color="#6B9AC4" />
            <Text style={styles.infoTitle}>Choose Your Therapy Type</Text>
          </View>
          
          <Text style={styles.infoDescription}>
            Select from our three specialized therapy programs:
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="mic" size={20} color="#FF6B6B" />
              <Text style={styles.benefitText}>Articulation for sound production</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="chatbubbles" size={20} color="#4ECDC4" />
              <Text style={styles.benefitText}>Language for comprehension & expression</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="volume-high" size={20} color="#F4A460" />
              <Text style={styles.benefitText}>Fluency for speech flow control</Text>
            </View>
          </View>
        </Animated.View>

        {/* Therapy Type Selection */}
        <Animated.View 
          style={[
            styles.therapySection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.therapySectionTitle}>Available Therapy Programs</Text>
          <Text style={styles.therapySectionSubtitle}>Select the therapy type that matches your needs</Text>

          {therapyTypes.map((therapy) => (
            <Animated.View
              key={therapy.id}
              style={[
                styles.therapyCard,
                {
                  opacity: therapy.animRef,
                  transform: [
                    {
                      translateY: therapy.animRef.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() => handleBeginAssessment(therapy.type)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: therapy.color }]}>
                    <Ionicons name={therapy.icon} size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{therapy.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: therapy.color }]}>
                      {therapy.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={therapy.color} />
                </View>

                <Text style={styles.cardDescription}>{therapy.description}</Text>

                {/* Features List */}
                <View style={styles.featuresList}>
                  {therapy.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={therapy.color} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Begin Button */}
                <View style={[styles.beginButton, { backgroundColor: therapy.color }]}>
                  <Text style={styles.beginButtonText}>BEGIN ASSESSMENT</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
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
    backgroundColor: '#FFFFFF',
    padding: 25,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#6B9AC4',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B9AC4',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 10,
    flex: 1,
  },
  infoDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 15,
  },
  benefitsList: {
    marginTop: 5,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },

  // Therapy Section
  therapySection: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  therapySectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
    textAlign: 'center',
  },
  therapySectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Therapy Card
  therapyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardTouchable: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 15,
    textAlign: 'justify',
  },

  // Features
  featuresList: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
    lineHeight: 18,
  },

  // Begin Button
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  beginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default SpeechTherapyScreen;
