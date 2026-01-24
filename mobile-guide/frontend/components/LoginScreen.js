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

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ onRegister, onLoginSuccess, onGoogleSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.success) {
        Alert.alert('Success', 'Login successful!');
        // Store token and user data (implement AsyncStorage later)
        if (onLoginSuccess) {
          onLoginSuccess(response.data);
        }
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
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
        console.log('Login successful, user data:', response.data);
        console.log('Needs profile completion:', response.needsProfileCompletion);
        
        if (response.needsProfileCompletion) {
          // Navigate to profile completion screen
          if (onGoogleSignIn) {
            onGoogleSignIn(response.data);
          }
        } else {
          Alert.alert('Success', 'Google Sign-In successful!');
          if (onLoginSuccess) {
            onLoginSuccess(response.data);
          }
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        // User cancelled the login flow
        Alert.alert('Cancelled', 'Google Sign-In was cancelled');
      } else if (error.code === 'IN_PROGRESS') {
        // Operation (e.g. sign in) is in progress already
        Alert.alert('In Progress', 'Sign-In is already in progress');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        // Play services not available or outdated
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        // Some other error happened
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setGoogleLoading(false);
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

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
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

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>LOGIN</Text>
              )}
            </TouchableOpacity>

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
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Doesn't have an account? </Text>
              <TouchableOpacity onPress={onRegister}>
                <Text style={styles.registerLink}>Register Now</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 400,
    height: 250,
    marginBottom: -70,
  },
  logoText: {
    width: width * 0.6,
    height: 50,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 20,
    color: '#333333',
  },
  loginButton: {
    backgroundColor: '#C9302C',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  registerText: {
    fontSize: 15,
    color: '#333333',
  },
  registerLink: {
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

export default LoginScreen;
