import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaWrapper from './components/SafeAreaWrapper';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import OTPScreen from './components/OTPScreen';
import ProfileCompletionScreen from './components/ProfileCompletionScreen';
import HomePage from './components/HomePage';
import AdminDashboard from './components/AdminDashboard';
import TherapistDashboard from './components/TherapistDashboard';
import './config/firebase'; // Initialize Google Sign-In configuration

// Keep the splash screen visible while we fetch resources
SplashScreenExpo.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userData, setUserData] = useState(null);
  const [googleUserData, setGoogleUserData] = useState(null);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user has seen the landing page before
        const hasSeenLanding = await AsyncStorage.getItem('hasSeenLanding');
        if (hasSeenLanding === 'true') {
          setShowLanding(false);
          setShowLogin(true);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepare();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleGetStarted = async () => {
    try {
      // Save flag to AsyncStorage so landing page won't show again
      await AsyncStorage.setItem('hasSeenLanding', 'true');
      console.log('✅ Landing page flag saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving landing page flag:', error);
    }
    
    setShowLanding(false);
    setShowLogin(true);
  };

  const handleRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  const handleRegisterSubmit = (email) => {
    setUserEmail(email);
    setShowRegister(false);
    setShowOTP(true);
  };

  const handleVerifyOTP = (userData) => {
    console.log('OTP Verified, user data:', userData);
    // Store user data and token (implement AsyncStorage later)
    // Redirect to login screen after successful verification
    setShowOTP(false);
    setShowLogin(true);
  };

  const handleLoginSuccess = async (data) => {
    console.log('Login successful, user data:', data);
    
    // Store token in AsyncStorage
    try {
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        console.log('✅ Token saved to AsyncStorage');
      }
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      console.log('✅ User data saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving to AsyncStorage:', error);
    }
    
    // Store user data in state
    setUserData(data);
    setShowLogin(false);
    
    // Check if user is admin and redirect to admin dashboard
    if (data.role === 'admin') {
      setShowHome(true); // We'll handle admin routing in HomePage
    } else if (data.role === 'therapist') {
      setShowHome(true); // Therapist dashboard
    } else {
      setShowHome(true);
    }
  };

  const handleGoogleSignIn = async (data) => {
    console.log('Google Sign-In data received in App.js:', data);
    
    // Store token and user data in AsyncStorage
    try {
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        console.log('✅ Google token saved to AsyncStorage');
      }
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      console.log('✅ Google user data saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving Google data to AsyncStorage:', error);
    }
    
    // Store the Google user data with token
    setGoogleUserData(data);
    setShowLogin(false);
    setShowRegister(false);
    setShowProfileCompletion(true);
  };

  const handleProfileComplete = async (data) => {
    console.log('Profile completion successful:', data);
    
    // Store token and updated user data in AsyncStorage
    try {
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        console.log('✅ Profile completion token saved to AsyncStorage');
      }
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      console.log('✅ Profile completion user data saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Error saving profile data to AsyncStorage:', error);
    }
    
    // Store updated user data with profile info
    setUserData(data);
    setShowProfileCompletion(false);
    
    // Check if user is admin and redirect to admin dashboard
    if (data.role === 'admin') {
      setShowHome(true); // We'll handle admin routing in HomePage
    } else if (data.role === 'therapist') {
      setShowHome(true); // Therapist dashboard
    } else {
      setShowHome(true);
    }
  };

  const handleLogout = async () => {
    console.log('User logged out');
    
    try {
      // Clear token and user data from AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userData');
      console.log('✅ User session cleared from AsyncStorage');
    } catch (error) {
      console.error('❌ Error clearing AsyncStorage:', error);
    }
    
    // Clear user data in state
    setUserData(null);
    setGoogleUserData(null);
    
    // Reset to login screen (NOT landing page since they've already seen it)
    setShowHome(false);
    setShowLogin(true);
  };

  if (!appIsReady || showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (showLanding) {
    return (
      <SafeAreaWrapper>
        <LandingPage onGetStarted={handleGetStarted} />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  if (showLogin) {
    return (
      <SafeAreaWrapper>
        <LoginScreen 
          onRegister={handleRegister}
          onLoginSuccess={handleLoginSuccess}
          onGoogleSignIn={handleGoogleSignIn}
        />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  if (showRegister) {
    return (
      <SafeAreaWrapper>
        <RegisterScreen 
          onLogin={handleBackToLogin}
          onRegisterSuccess={handleRegisterSubmit}
          onGoogleSignIn={handleGoogleSignIn}
        />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  if (showOTP) {
    return (
      <SafeAreaWrapper>
        <OTPScreen 
          email={userEmail}
          onVerify={handleVerifyOTP}
        />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  if (showProfileCompletion) {
    return (
      <SafeAreaWrapper>
        <ProfileCompletionScreen 
          token={googleUserData?.token}
          userData={googleUserData}
          onComplete={handleProfileComplete}
        />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  if (showHome) {
    // Check if user is admin and show AdminDashboard instead
    if (userData && userData.role === 'admin') {
      return (
        <SafeAreaWrapper>
          <AdminDashboard 
            userData={userData} 
            onLogout={handleLogout}
          />
          <StatusBar style="auto" />
        </SafeAreaWrapper>
      );
    }
    
    // Check if user is therapist and show TherapistDashboard
    if (userData && userData.role === 'therapist') {
      return (
        <SafeAreaWrapper>
          <TherapistDashboard 
            userData={userData} 
            onLogout={handleLogout}
          />
          <StatusBar style="auto" />
        </SafeAreaWrapper>
      );
    }
    
    return (
      <SafeAreaWrapper>
        <HomePage 
          userData={userData} 
          onLogout={handleLogout}
        />
        <StatusBar style="auto" />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      {/* Main app content will go here */}
      <StatusBar style="auto" />
    </SafeAreaWrapper>
  );
}
