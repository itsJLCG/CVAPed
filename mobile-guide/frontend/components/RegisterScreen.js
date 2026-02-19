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
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authAPI } from '../services/api';
import '../config/firebase';
import { Picker } from '@react-native-picker/picker';
import TermsAndConditionsModal from './TermsAndConditionsModal';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ onLogin, onRegisterSuccess, onGoogleSignIn }) => {
  // Basic Account Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  
  // Therapy Selection
  const [therapyType, setTherapyType] = useState(''); // 'speech' or 'physical'
  const [patientType, setPatientType] = useState(''); // 'myself', 'child', 'dependent'
  
  // Speech Therapy - Child Information
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDateOfBirth, setChildDateOfBirth] = useState('');
  const [childGender, setChildGender] = useState('');
  
  // Speech Therapy - Parent/Guardian Information
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Therapy Type, 3: Patient Type & Register
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Handle copying parent info
  const toggleCopyParentInfo = () => {
    const newValue = !copyParentInfo;
    setCopyParentInfo(newValue);
    if (newValue) {
      setParentFirstName(firstName);
      setParentLastName(lastName);
      setParentEmail(email);
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
      setPatientFirstName(firstName);
      setPatientLastName(lastName);
    } else {
      setPatientFirstName('');
      setPatientLastName('');
    }
  };

  // Auto-fill patient info when "myself" is selected for physical therapy
  useEffect(() => {
    if (therapyType === 'physical' && patientType === 'myself') {
      setPatientFirstName(firstName);
      setPatientLastName(lastName);
      // Phone will be empty since users haven't entered their phone in basic info
    } else if (therapyType === 'physical' && patientType !== 'myself' && patientFirstName === firstName && patientLastName === lastName) {
      // Clear auto-filled data when switching away from "myself"
      setPatientFirstName('');
      setPatientLastName('');
      setPatientPhone('');
    }
  }, [therapyType, patientType, firstName, lastName]);

  // Validate current step
  const validateStep = () => {
    if (currentStep === 1) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword || !phone.trim()) {
        Alert.alert('Error', 'Please fill in all fields');
        return false;
      }
      if (!age || !gender) {
        Alert.alert('Error', 'Please provide your age and gender');
        return false;
      }
      if (parseInt(age) < 1 || parseInt(age) > 120) {
        Alert.alert('Error', 'Please enter a valid age between 1 and 120');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return false;
      }
      if (!agreedToTerms) {
        Alert.alert('Error', 'Please agree to the Terms and Conditions');
        return false;
      }
      return true;
    }
    
    if (currentStep === 2) {
      if (!therapyType) {
        Alert.alert('Error', 'Please select a therapy type');
        return false;
      }
      return true;
    }
    
    if (currentStep === 3) {
      if (!patientType) {
        Alert.alert('Error', 'Please select who needs therapy');
        return false;
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

  const handleRegister = async () => {
    if (!validateStep()) {
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        firstName,
        lastName,
        email,
        password,
        phone,
        age: parseInt(age),
        gender,
        therapyType,
        patientType,
      };

      const response = await authAPI.register(registrationData);
      Alert.alert(
        'Success',
        'Registration successful! Please check your email for OTP.',
        [{ text: 'OK', onPress: () => onRegisterSuccess(email) }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign out first to force account selection
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.log('No previous Google sign-in to sign out from');
      }
      
      // Sign in with Google - this will show account picker
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Send ID token to backend
      const response = await authAPI.googleSignIn(idToken);
      
      if (response.success) {
        console.log('Registration successful, user data:', response.data);
        console.log('Needs profile completion:', response.needsProfileCompletion);
        
        if (response.needsProfileCompletion) {
          // Navigate to profile completion screen
          if (onGoogleSignIn) {
            onGoogleSignIn(response.data);
          }
        } else {
          Alert.alert(
            'Success', 
            'Google Sign-In successful!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to login or home screen
                  if (onLogin) {
                    onLogin(response.data);
                  }
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        Alert.alert('Cancelled', 'Google Sign-In was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        Alert.alert('In Progress', 'Sign-In is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#B0B0B0"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#B0B0B0"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#B0B0B0"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#B0B0B0"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              maxLength={3}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={setGender}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
                <Picker.Item label="Prefer not to say" value="prefer-not-to-say" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#B0B0B0"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#B0B0B0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#B0B0B0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            
            {/* Terms and Conditions Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={styles.termsCheckboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <Ionicons 
                  name={agreedToTerms ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={agreedToTerms ? "#C9302C" : "#D0D0D0"} 
                />
                <Text style={styles.termsText}>
                  I have read and agree to the{' '}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
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
                    Speech/Language Therapy
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

      case 3:
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

          <Text style={styles.title}>Create Your Account</Text>

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
                style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>REGISTER</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {currentStep === 1 && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity 
                style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]} 
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285F4" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={24} color="#4285F4" style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.loginLink}>Login Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Terms and Conditions Modal */}
        <TermsAndConditionsModal 
          isOpen={showTermsModal} 
          onClose={() => setShowTermsModal(false)} 
        />
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
    width: 100,
    height: 100,
    marginBottom: -30,
  },
  logoText: {
    width: width * 0.55,
    height: 45,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
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
  registerButton: {
    backgroundColor: '#C9302C',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  registerButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 15,
    color: '#333333',
  },
  loginLink: {
    fontSize: 15,
    color: '#6B9AC4',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0D0D0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexDirection: 'row',
  },
  googleButtonDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  termsText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  termsLink: {
    fontSize: 14,
    color: '#C9302C',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 34,
  },
});

export default RegisterScreen;
