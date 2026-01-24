import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { authAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

const ProfileCompletionScreen = ({ token, userData, onComplete }) => {
  // Therapy Selection
  const [therapyType, setTherapyType] = useState('');
  const [patientType, setPatientType] = useState('');
  
  // Speech Therapy - Child Information
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDateOfBirth, setChildDateOfBirth] = useState('');
  const [childGender, setChildGender] = useState('');
  
  // Speech Therapy - Parent/Guardian Information
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState(userData?.email || '');
  const [parentPhone, setParentPhone] = useState('');
  const [relationshipWithChild, setRelationshipWithChild] = useState('');
  const [copyParentInfo, setCopyParentInfo] = useState(false);
  
  // Physical Therapy - Patient Information
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientLastName, setPatientLastName] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [copyPatientInfo, setCopyPatientInfo] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Therapy Type, 2: Patient Type, 3: Additional Info

  // Get user's first and last name for auto-fill
  const userFirstName = userData?.firstName || '';
  const userLastName = userData?.lastName || '';

  // Auto-fill patient info when "myself" is selected for physical therapy
  useEffect(() => {
    if (therapyType === 'physical' && patientType === 'myself') {
      setPatientFirstName(userFirstName);
      setPatientLastName(userLastName);
    } else if (therapyType === 'physical' && patientType !== 'myself' && patientFirstName === userFirstName && patientLastName === userLastName) {
      // Clear auto-filled data when switching away from "myself"
      setPatientFirstName('');
      setPatientLastName('');
      setPatientPhone('');
    }
  }, [therapyType, patientType, userFirstName, userLastName]);

  // Handle copying parent info
  const toggleCopyParentInfo = () => {
    const newValue = !copyParentInfo;
    setCopyParentInfo(newValue);
    if (newValue) {
      setParentFirstName(userFirstName);
      setParentLastName(userLastName);
      setParentEmail(userData?.email || '');
    } else {
      setParentFirstName('');
      setParentLastName('');
      setParentEmail('');
    }
  };

  // Handle copying patient info
  const toggleCopyPatientInfo = () => {
    const newValue = !copyPatientInfo;
    setCopyPatientInfo(newValue);
    if (newValue) {
      setPatientFirstName(userFirstName);
      setPatientLastName(userLastName);
    } else {
      setPatientFirstName('');
      setPatientLastName('');
    }
  };

  // Validate current step
  const validateStep = () => {
    if (currentStep === 1) {
      if (!therapyType) {
        Alert.alert('Error', 'Please select a therapy type');
        return false;
      }
      return true;
    }
    
    if (currentStep === 2) {
      if (!patientType) {
        Alert.alert('Error', 'Please select who needs therapy');
        return false;
      }
      return true;
    }
    
    if (currentStep === 3) {
      // For speech therapy with child
      if (therapyType === 'speech' && patientType === 'child') {
        if (!childFirstName.trim() || !childLastName.trim() || !childDateOfBirth.trim() || !childGender) {
          Alert.alert('Error', 'Please fill in all child information');
          return false;
        }
        if (!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim() || !parentPhone.trim() || !relationshipWithChild.trim()) {
          Alert.alert('Error', 'Please fill in all parent/guardian information');
          return false;
        }
      }
      
      // For physical therapy
      if (therapyType === 'physical') {
        if (!patientFirstName.trim() || !patientLastName.trim() || !patientGender) {
          Alert.alert('Error', 'Please fill in all patient information');
          return false;
        }
        // Phone required only if not myself
        if (patientType !== 'myself' && !patientPhone.trim()) {
          Alert.alert('Error', 'Please provide patient phone number');
          return false;
        }
      }
      
      return true;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (!validateStep()) {
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        therapyType,
        patientType,
      };

      // Add conditional fields based on therapy type and patient type
      if (therapyType === 'speech' && patientType === 'child') {
        profileData.childFirstName = childFirstName;
        profileData.childLastName = childLastName;
        profileData.childDateOfBirth = childDateOfBirth;
        profileData.childGender = childGender;
        profileData.parentFirstName = parentFirstName;
        profileData.parentLastName = parentLastName;
        profileData.parentEmail = parentEmail;
        profileData.parentPhone = parentPhone;
        profileData.relationshipWithChild = relationshipWithChild;
      }

      if (therapyType === 'physical') {
        profileData.patientFirstName = patientFirstName;
        profileData.patientLastName = patientLastName;
        profileData.patientGender = patientGender;
        profileData.patientPhone = patientPhone;
      }

      const response = await authAPI.completeProfile(token, profileData);
      Alert.alert(
        'Success',
        'Profile completed successfully!',
        [{ text: 'OK', onPress: () => onComplete(response.data) }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Select Therapy Type</Text>
            <Text style={styles.subtitle}>What type of therapy do you need?</Text>
            
            <TouchableOpacity
              style={[styles.optionCard, therapyType === 'speech' && styles.optionCardSelected]}
              onPress={() => setTherapyType('speech')}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="chatbubbles-outline" 
                  size={32} 
                  color={therapyType === 'speech' ? '#C9302C' : '#666'} 
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, therapyType === 'speech' && styles.optionTitleSelected]}>
                    Speech Therapy
                  </Text>
                  <Text style={styles.optionDescription}>For pediatric speech and language development</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, therapyType === 'physical' && styles.optionCardSelected]}
              onPress={() => setTherapyType('physical')}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="walk-outline" 
                  size={32} 
                  color={therapyType === 'physical' ? '#C9302C' : '#666'} 
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, therapyType === 'physical' && styles.optionTitleSelected]}>
                    Physical Therapy
                  </Text>
                  <Text style={styles.optionDescription}>For stroke recovery and rehabilitation</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Who needs therapy?</Text>
            
            <TouchableOpacity
              style={[styles.optionCard, patientType === 'myself' && styles.optionCardSelected]}
              onPress={() => setPatientType('myself')}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="person-outline" 
                  size={32} 
                  color={patientType === 'myself' ? '#C9302C' : '#666'} 
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, patientType === 'myself' && styles.optionTitleSelected]}>
                    Myself
                  </Text>
                  <Text style={styles.optionDescription}>I'm seeking therapy for myself</Text>
                </View>
              </View>
            </TouchableOpacity>

            {therapyType === 'speech' && (
              <TouchableOpacity
                style={[styles.optionCard, patientType === 'child' && styles.optionCardSelected]}
                onPress={() => setPatientType('child')}
              >
                <View style={styles.optionContent}>
                  <Ionicons 
                    name="happy-outline" 
                    size={32} 
                    color={patientType === 'child' ? '#C9302C' : '#666'} 
                  />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, patientType === 'child' && styles.optionTitleSelected]}>
                      My Child
                    </Text>
                    <Text style={styles.optionDescription}>For my son/daughter</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.optionCard, patientType === 'dependent' && styles.optionCardSelected]}
              onPress={() => setPatientType('dependent')}
            >
              <View style={styles.optionContent}>
                <Ionicons 
                  name="people-outline" 
                  size={32} 
                  color={patientType === 'dependent' ? '#C9302C' : '#666'} 
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, patientType === 'dependent' && styles.optionTitleSelected]}>
                    A Dependent
                  </Text>
                  <Text style={styles.optionDescription}>For someone I care for</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        );

      case 3:
        if (therapyType === 'speech' && patientType === 'child') {
          return (
            <View style={styles.formContainer}>
              <Text style={styles.stepTitle}>Child Information</Text>
              <TextInput
                style={styles.input}
                placeholder="Child's First Name"
                placeholderTextColor="#B0B0B0"
                value={childFirstName}
                onChangeText={setChildFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Child's Last Name"
                placeholderTextColor="#B0B0B0"
                value={childLastName}
                onChangeText={setChildLastName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (MM/DD/YYYY)"
                placeholderTextColor="#B0B0B0"
                value={childDateOfBirth}
                onChangeText={setChildDateOfBirth}
              />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={childGender}
                  onValueChange={setChildGender}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>

              <Text style={[styles.stepTitle, { marginTop: 20 }]}>Parent/Guardian Information</Text>
              
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={toggleCopyParentInfo}
              >
                <Ionicons 
                  name={copyParentInfo ? "checkbox" : "square-outline"} 
                  size={24} 
                  color="#C9302C" 
                />
                <Text style={styles.checkboxLabel}>Use my information</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Parent's First Name"
                placeholderTextColor="#B0B0B0"
                value={parentFirstName}
                onChangeText={setParentFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent's Last Name"
                placeholderTextColor="#B0B0B0"
                value={parentLastName}
                onChangeText={setParentLastName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent's Email"
                placeholderTextColor="#B0B0B0"
                value={parentEmail}
                onChangeText={setParentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent's Phone"
                placeholderTextColor="#B0B0B0"
                value={parentPhone}
                onChangeText={setParentPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Mother, Father)"
                placeholderTextColor="#B0B0B0"
                value={relationshipWithChild}
                onChangeText={setRelationshipWithChild}
                autoCapitalize="words"
              />
            </View>
          );
        }

        if (therapyType === 'physical') {
          return (
            <View style={styles.formContainer}>
              <Text style={styles.stepTitle}>Patient Information</Text>
              
              {patientType !== 'myself' && (
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={toggleCopyPatientInfo}
                >
                  <Ionicons 
                    name={copyPatientInfo ? "checkbox" : "square-outline"} 
                    size={24} 
                    color="#C9302C" 
                  />
                  <Text style={styles.checkboxLabel}>Use my information</Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.input}
                placeholder="Patient's First Name"
                placeholderTextColor="#B0B0B0"
                value={patientFirstName}
                onChangeText={setPatientFirstName}
                autoCapitalize="words"
                editable={patientType !== 'myself'}
              />
              <TextInput
                style={styles.input}
                placeholder="Patient's Last Name"
                placeholderTextColor="#B0B0B0"
                value={patientLastName}
                onChangeText={setPatientLastName}
                autoCapitalize="words"
                editable={patientType !== 'myself'}
              />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={patientGender}
                  onValueChange={setPatientGender}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Patient's Phone Number"
                placeholderTextColor="#B0B0B0"
                value={patientPhone}
                onChangeText={setPatientPhone}
                keyboardType="phone-pad"
              />
            </View>
          );
        }

        return null;

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/cvalogonotext.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Image
              source={require('../assets/CVAPed_Text.png')}
              style={styles.logoText}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.welcomeText}>Welcome, {userData?.name}!</Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  currentStep >= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {renderStepContent()}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 3 && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {currentStep === 3 && (
              <TouchableOpacity 
                style={[styles.completeButton, loading && styles.completeButtonDisabled]} 
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.completeButtonText}>COMPLETE PROFILE</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  logoText: {
    width: width * 0.5,
    height: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D0D0D0',
  },
  progressDotActive: {
    backgroundColor: '#C9302C',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  formContainer: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    color: '#333333',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333333',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  optionCardSelected: {
    borderColor: '#C9302C',
    backgroundColor: '#FFF5F5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 15,
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  optionTitleSelected: {
    color: '#C9302C',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    backgroundColor: '#C9302C',
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  nextButtonText: {
    marginRight: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#C9302C',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  completeButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default ProfileCompletionScreen;
