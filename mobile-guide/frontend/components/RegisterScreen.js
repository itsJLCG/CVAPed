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

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ onLogin, onRegisterSuccess, onGoogleSignIn }) => {
  // Basic Account Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Therapy Type, 3: Patient Type, 4: Additional Info

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
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
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
    
    if (currentStep === 4) {
      // Speech therapy - Child
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
      
      // Speech therapy - Myself
      if (therapyType === 'speech' && patientType === 'myself') {
        if (!patientGender || !patientPhone.trim()) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
      }
      
      // Speech therapy - Dependent
      if (therapyType === 'speech' && patientType === 'dependent') {
        if (!patientFirstName.trim() || !patientLastName.trim() || !childDateOfBirth.trim() || !childGender || !patientPhone.trim() || !relationshipWithChild.trim()) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
      }
      
      // Physical therapy
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
        therapyType,
        patientType,
      };

      // Add conditional fields based on therapy type and patient type
      if (therapyType === 'speech' && patientType === 'child') {
        registrationData.childFirstName = childFirstName;
        registrationData.childLastName = childLastName;
        registrationData.childDateOfBirth = childDateOfBirth;
        registrationData.childGender = childGender;
        registrationData.parentFirstName = parentFirstName;
        registrationData.parentLastName = parentLastName;
        registrationData.parentEmail = parentEmail;
        registrationData.parentPhone = parentPhone;
        registrationData.relationshipWithChild = relationshipWithChild;
      }

      if (therapyType === 'speech' && patientType === 'myself') {
        registrationData.patientGender = patientGender;
        registrationData.patientPhone = patientPhone;
      }

      if (therapyType === 'speech' && patientType === 'dependent') {
        registrationData.patientFirstName = patientFirstName;
        registrationData.patientLastName = patientLastName;
        registrationData.childDateOfBirth = childDateOfBirth;
        registrationData.childGender = childGender;
        registrationData.patientPhone = patientPhone;
        registrationData.relationshipWithChild = relationshipWithChild;
      }

      if (therapyType === 'physical') {
        registrationData.patientFirstName = patientFirstName;
        registrationData.patientLastName = patientLastName;
        registrationData.patientGender = patientGender;
        registrationData.patientPhone = patientPhone;
      }

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

      case 4:
        // Speech therapy - Child
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
                <Text style={styles.checkboxLabel}>Copy my information</Text>
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

        // Speech therapy - Myself or Dependent
        if (therapyType === 'speech' && (patientType === 'myself' || patientType === 'dependent')) {
          return (
            <View style={styles.formContainer}>
              <Text style={styles.stepTitle}>Patient Information</Text>
              <Text style={styles.subtitle}>
                {patientType === 'myself' 
                  ? 'Please provide additional contact information' 
                  : 'Please provide patient information'}
              </Text>

              {patientType === 'dependent' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Patient's First Name"
                    placeholderTextColor="#B0B0B0"
                    value={patientFirstName}
                    onChangeText={setPatientFirstName}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Patient's Last Name"
                    placeholderTextColor="#B0B0B0"
                    value={patientLastName}
                    onChangeText={setPatientLastName}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Date of Birth (MM/DD/YYYY)"
                    placeholderTextColor="#B0B0B0"
                    value={childDateOfBirth}
                    onChangeText={setChildDateOfBirth}
                  />
                </>
              )}

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={patientType === 'dependent' ? childGender : patientGender}
                  onValueChange={patientType === 'dependent' ? setChildGender : setPatientGender}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#B0B0B0"
                value={patientPhone}
                onChangeText={setPatientPhone}
                keyboardType="phone-pad"
              />

              {patientType === 'dependent' && (
                <>
                  <Text style={[styles.stepTitle, { marginTop: 20 }]}>Your Information (Guardian/Caregiver)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your Relationship to Patient"
                    placeholderTextColor="#B0B0B0"
                    value={relationshipWithChild}
                    onChangeText={setRelationshipWithChild}
                    autoCapitalize="words"
                  />
                </>
              )}
            </View>
          );
        }

        // Physical therapy
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
                  <Text style={styles.checkboxLabel}>Copy my information</Text>
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

          <Text style={styles.title}>Create Your Account</Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map((step) => (
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

            {currentStep < 4 && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {currentStep === 4 && (
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
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  registerButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
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
});

export default RegisterScreen;
