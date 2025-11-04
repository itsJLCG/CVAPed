import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { signInWithGoogle, signInWithFacebook } from '../services/firebase';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.login(formData);
      toast.success('Login successful! Welcome back.');
      onLogin();
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      const user = result.user;
      
      try {
        const response = await authService.firebaseAuth({
          firebaseToken: result.token,
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          profilePicture: user.photoURL,
          provider: 'google',
          providerId: user.uid
        });

        // Backend returns token and user on success
        if (response.token && response.user) {
          // Update authentication state
          if (onLogin) onLogin();
          
          // Check if profile is complete
          if (!response.user.isProfileComplete) {
            toast.success('Please complete your profile to continue.');
            navigate('/complete-profile');
          } else {
            toast.success('Successfully signed in with Google!');
            navigate('/therapy-selection');
          }
        } else {
          setError(response.message || 'Authentication failed');
          toast.error(response.message || 'Authentication failed');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to authenticate with server';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } else {
      setError(result.error);
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  // Handle Facebook Sign-In
  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError('');
    
    const result = await signInWithFacebook();
    
    if (result.success) {
      const user = result.user;
      
      try {
        const response = await authService.firebaseAuth({
          firebaseToken: result.token,
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          profilePicture: user.photoURL,
          provider: 'facebook',
          providerId: user.uid
        });

        // Backend returns token and user on success
        if (response.token && response.user) {
          // Update authentication state
          if (onLogin) onLogin();
          
          // Check if profile is complete
          if (!response.user.isProfileComplete) {
            toast.success('Please complete your profile to continue.');
            navigate('/complete-profile');
          } else {
            toast.success('Successfully signed in with Facebook!');
            navigate('/therapy-selection');
          }
        } else {
          setError(response.message || 'Authentication failed');
          toast.error(response.message || 'Authentication failed');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to authenticate with server';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } else {
      setError(result.error);
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Navigation Header */}
      <nav className="auth-nav">
        <div className="auth-nav-container">
          <div className="auth-nav-left">
            <img src={images.logo} alt="CVAPed Logo" className="auth-nav-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="auth-nav-text" />
          </div>
          <div className="auth-nav-right">
            <Link to="/" className="auth-nav-link">Home</Link>
            <Link to="/register" className="auth-nav-btn">Register</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="auth-container">
        <div className="auth-content">
          {/* Left Side - Image */}
          <div className="auth-left">
            <div className="auth-image-wrapper">
              <img src={images.imageBig} alt="CVAPed" className="auth-main-image" />
              <div className="auth-image-overlay">
                <h2>Welcome to CVAPed</h2>
                <p>Your trusted partner in Physical & Speech Therapy Management</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Login</h1>
                <p>Welcome back! Please login to your account.</p>
              </div>

              {/* OAuth Section */}
              <div className="oauth-section">
                <button 
                  type="button" 
                  className="oauth-btn google-btn" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="oauth-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Facebook Login - Hidden until app review complete */}
                {/* <button 
                  type="button" 
                  className="oauth-btn facebook-btn" 
                  onClick={handleFacebookSignIn}
                  disabled={loading}
                >
                  <svg className="oauth-icon" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </button> */}
              </div>

              <div className="auth-divider">
                <span>OR</span>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>

                <div className="auth-divider">
                  <span>Don't have an account?</span>
                </div>

                <Link to="/register" className="btn btn-secondary">
                  Create Account
                </Link>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="auth-footer">
        <div className="auth-footer-container">
          <div className="footer-left">
            <p>&copy; 2025 CVAPed. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
