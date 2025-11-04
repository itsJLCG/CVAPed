import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signInWithPopup,
  signOut 
} from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrj_RrynkNqkd4y68hJW1SKrGZyHlL2rI",
  authDomain: "cvaped-fa8b2.firebaseapp.com",
  projectId: "cvaped-fa8b2",
  storageBucket: "cvaped-fa8b2.firebasestorage.app",
  messagingSenderId: "195089617239",
  appId: "1:195089617239:web:c635a1cf461d0b8fa4ae12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const facebookProvider = new FacebookAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      success: true,
      user: result.user,
      token: await result.user.getIdToken()
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
    const result = await signInWithPopup(auth, facebookProvider);
    return {
      success: true,
      user: result.user,
      token: await result.user.getIdToken()
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
