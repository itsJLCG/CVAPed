import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PhysicalTherapyScreen from './therapy/PhysicalTherapyScreen';
import SpeechTherapyScreen from './therapy/SpeechTherapyScreen';
import BottomNav from './BottomNav';

const { width, height } = Dimensions.get('window');

const TherapyScreen = ({ onBack, onNavigate }) => {
  const [selectedTherapy, setSelectedTherapy] = useState(null);
  const [activeTab, setActiveTab] = useState('therapy');
  const [showPhysicalTherapy, setShowPhysicalTherapy] = useState(false);
  const [showSpeechTherapy, setShowSpeechTherapy] = useState(false);

  const therapyTypes = [
    {
      id: 1,
      name: 'Physical Therapy',
      icon: require('../assets/CVACare_Physical_Therapy.png'),
      description: 'Specialized treatment to restore movement, reduce pain, and improve physical function. Our expert therapists help you recover from injuries, manage chronic conditions, and enhance your overall mobility.',
      features: [
        'Movement Restoration',
        'Pain Management',
        'Injury Recovery',
        'Strength Building',
      ],
      buttonText: 'Select Physical Therapy',
      buttonColor: '#C9302C',
    },
    {
      id: 2,
      name: 'Speech Therapy',
      icon: require('../assets/CVACare_Speech_Therapy.png'),
      description: 'Comprehensive speech therapy programs designed to improve communication skills for children. Choose from three specialized therapy types tailored to specific needs.',
      subheading: 'Available Therapy Types:',
      therapyTypes: [
        {
          name: 'Articulation Therapy:',
          description: 'Sound production and pronunciation improvement',
        },
        {
          name: 'Language Therapy:',
          description: 'Receptive and expressive language development',
        },
        {
          name: 'Fluency Therapy:',
          description: 'Stuttering reduction and speech rate control',
        },
      ],
      buttonText: 'Explore Speech Therapy Options',
      buttonColor: '#6B9AC4',
    },
  ];

  const handleTherapyPress = (therapy) => {
    setSelectedTherapy(therapy);
  };

  const handleCloseModal = () => {
    setSelectedTherapy(null);
  };

  const handleTherapySelect = (therapyType) => {
    console.log('Selected therapy:', therapyType);
    handleCloseModal();
    
    // Navigate to the appropriate therapy screen
    if (therapyType === 'Physical Therapy') {
      setShowPhysicalTherapy(true);
    } else if (therapyType === 'Speech Therapy') {
      setShowSpeechTherapy(true);
    }
  };

  const handleBackFromPhysicalTherapy = () => {
    setShowPhysicalTherapy(false);
  };

  const handleBackFromSpeechTherapy = () => {
    setShowSpeechTherapy(false);
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (tab === 'home' && onNavigate) {
      onNavigate('home');
    } else if (tab === 'therapy') {
      // Already on therapy screen
    } else if (tab === 'health' && onNavigate) {
      onNavigate('health');
    } else if (tab === 'profile' && onNavigate) {
      onNavigate('profile');
    }
  };

  // Show Physical Therapy screen if selected
  if (showPhysicalTherapy) {
    return <PhysicalTherapyScreen onBack={handleBackFromPhysicalTherapy} />;
  }

  // Show Speech Therapy screen if selected
  if (showSpeechTherapy) {
    return <SpeechTherapyScreen onBack={handleBackFromSpeechTherapy} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Therapy</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Choose Your Therapy Type</Text>
          <Text style={styles.subtitle}>Select the therapy service you need</Text>
        </View>

        <View style={styles.therapyGrid}>
          {therapyTypes.map((therapy) => (
            <View key={therapy.id} style={styles.therapyItemContainer}>
              <TouchableOpacity
                style={styles.therapyCard}
                onPress={() => handleTherapyPress(therapy)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, therapy.id === 1 ? styles.physicalTherapyBorder : styles.speechTherapyBorder]}>
                      <Image 
                        source={therapy.icon} 
                        style={styles.therapyIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <Text style={styles.therapyName}>{therapy.name}</Text>
                  <View style={styles.tapHintContainer}>
                    <Text style={styles.tapHint}>Tap to learn more</Text>
                    <Ionicons name="arrow-forward-circle-outline" size={16} color="#7F8C8D" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3498DB" />
            <Text style={styles.infoText}>
              Our professional therapists are here to help you achieve your health goals through personalized treatment plans.
            </Text>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Choose CVAPed?</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.benefitText}>Expert Licensed Therapists</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.benefitText}>Physical Therapy for Stroke Patients</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.benefitText}>Speech Therapy for Pedia</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                <Text style={styles.benefitText}>Progress Tracking & Reports</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal for Therapy Details */}
      <Modal
        visible={selectedTherapy !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>

            {/* Modal Header with Icon */}
            {selectedTherapy && (
              <ScrollView 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconCircle}>
                    <Image 
                      source={selectedTherapy.icon} 
                      style={styles.modalIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.modalTitle}>{selectedTherapy.name}</Text>
                </View>

                {/* Description */}
                <Text style={styles.modalDescription}>{selectedTherapy.description}</Text>

                {/* Subheading */}
                {selectedTherapy.subheading && (
                  <Text style={styles.modalSubheading}>{selectedTherapy.subheading}</Text>
                )}

                {/* Features (Physical Therapy) */}
                {selectedTherapy.features && (
                  <View style={styles.featuresContainer}>
                    {selectedTherapy.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Text style={styles.checkmark}>✓</Text>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Therapy Types (Speech Therapy) */}
                {selectedTherapy.therapyTypes && (
                  <View style={styles.therapyTypesContainer}>
                    {selectedTherapy.therapyTypes.map((type, index) => (
                      <View key={index} style={styles.therapyTypeItem}>
                        <Text style={styles.therapyTypeName}>{type.name}</Text>
                        <Text style={styles.therapyTypeDesc}>{type.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Select Button */}
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: selectedTherapy.buttonColor }]}
                  onPress={() => handleTherapySelect(selectedTherapy.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectButtonText}>{selectedTherapy.buttonText}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navbar */}
      <BottomNav activeTab={activeTab} onTabPress={handleTabPress} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    width: 34,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerRight: {
    width: 34,
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },

  // Title Section
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
  },

  // Therapy Grid
  therapyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 25,
    backgroundColor: '#FFFFFF',
  },
  therapyItemContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
    maxWidth: '48%',
  },
  therapyCard: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  physicalTherapyBorder: {
    borderColor: '#C9302C',
  },
  speechTherapyBorder: {
    borderColor: '#6B9AC4',
  },
  therapyIcon: {
    width: 130,
    height: 130,
  },
  therapyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    paddingHorizontal: 5,
    marginBottom: 8,
  },
  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHint: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },

  // Info Section
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  benefitsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#C9302C',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  modalIcon: {
    width: 110,
    height: 110,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'left',
  },
  modalSubheading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    marginTop: 10,
  },

  // Features (for Physical Therapy)
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkmark: {
    fontSize: 20,
    color: '#27AE60',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },

  // Therapy Types (for Speech Therapy)
  therapyTypesContainer: {
    marginBottom: 20,
  },
  therapyTypeItem: {
    marginBottom: 15,
  },
  therapyTypeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  therapyTypeDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Select Button
  selectButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TherapyScreen;
