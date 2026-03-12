import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { signInWithGoogle } from '../services/firebase';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function FacilityLogin({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.facilityLogin(formData);
      toast.success('Patient logged in. Facility Mode active.');
      onLogin();
      navigate('/therapy-selection');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithGoogle();

      if (result.success) {
        const user = result.user;
        const freshToken = await user.getIdToken(true);

        try {
          const response = await authService.facilityFirebaseAuth({
            firebaseToken: freshToken,
            email: user.email,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            profilePicture: user.photoURL,
            provider: 'google',
            providerId: user.uid,
          });

          if (response.token && response.user) {
            onLogin();
            toast.success('Patient signed in with Google. Facility Mode active.');
            navigate('/therapy-selection');
          } else {
            setError(response.message || 'Authentication failed');
            toast.error(response.message || 'Authentication failed');
          }
        } catch (err) {
          const errorMsg = err.response?.data?.message || 'Failed to authenticate with server';
          setError(errorMsg);
          toast.error(errorMsg);

          if (err.response?.data?.code?.includes('token')) {
            const { firebaseSignOut } = await import('../services/firebase');
            await firebaseSignOut();
          }
        }
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (err) {
      const errorMsg = err.message || 'Google sign-in failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <div className="auth-nav-container">
          <div className="auth-nav-left">
            <img src={images.logo} alt="CVAPed Logo" className="auth-nav-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="auth-nav-text" />
          </div>
          <div className="auth-nav-right">
            <span className="auth-nav-link" style={{ color: '#ce3630', fontWeight: 700 }}>
              Facility Mode
            </span>
          </div>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-left">
            <div className="auth-image-wrapper">
              <img src={images.imageBig} alt="CVAPed" className="auth-main-image" />
              <div className="auth-image-overlay">
                <h2>Facility Mode</h2>
                <p>Patient login for in-clinic therapy sessions</p>
              </div>
            </div>
          </div>

          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Patient Login</h1>
                <p>Please have the patient log in to begin a facility session.</p>
              </div>

              {error && <div className="error-message">{error}</div>}

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
                    placeholder="Patient email"
                    autoComplete="off"
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
                    placeholder="Patient password"
                    autoComplete="off"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Start Facility Session'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <div className="auth-footer-container">
          <div className="footer-left">
            <p>&copy; 2025 CVAPed. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FacilityLogin;
