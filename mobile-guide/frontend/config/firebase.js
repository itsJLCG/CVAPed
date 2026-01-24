import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In with Web Client ID from google-services.json
GoogleSignin.configure({
  webClientId: '292803901437-fk6kg98k8gj8e61k39osqlvf03cq3aer.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

export { GoogleSignin };
