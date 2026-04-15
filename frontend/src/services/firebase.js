import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signInWithPopup,
  signOut 
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account' // Always prompt user to select account
});
// Force account selection to avoid cached credentials
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const facebookProvider = new FacebookAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Clear any existing Firebase session first
    await signOut(auth).catch(() => {}); // Ignore errors if not signed in
    
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get fresh token
    const token = await result.user.getIdToken(true); // force refresh
    
    return {
      success: true,
      user: result.user,
      token: token
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Sign in with Facebook
export const signInWithFacebook = async () => {
  try {
    // Clear any existing Firebase session first
    await signOut(auth).catch(() => {}); // Ignore errors if not signed in
    
    const result = await signInWithPopup(auth, facebookProvider);
    
    // Get fresh token
    const token = await result.user.getIdToken(true); // force refresh
    
    return {
      success: true,
      user: result.user,
      token: token
    };
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    
    // Provide a more helpful error message for app review issues
    let errorMessage = error.message;
    if (error.code === 'auth/operation-not-allowed' || 
        error.message.includes('Feature Unavailable') ||
        error.message.includes('updating additional details')) {
      errorMessage = 'Facebook Login is currently in development mode. Please use Google Sign-In or register with email for now.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Sign out
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
};
