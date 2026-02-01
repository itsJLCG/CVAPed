import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { signInWithGoogle, signInWithFacebook } from '../services/firebase';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    therapyType: '',
    patientType: '',
    // Pediatric Speech Therapy fields
    childFirstName: '',
    childLastName: '',
    childDateOfBirth: '',
    childGender: '',
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    relationshipWithChild: '',
    // Physical Therapy fields
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyParentInfo, setCopyParentInfo] = useState(false);
  const [copyPatientInfo, setCopyPatientInfo] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleCopyParentInfo = (e) => {
    const checked = e.target.checked;
    setCopyParentInfo(checked);
    
    if (checked) {
      setFormData(prev => ({
        ...prev,
        parentFirstName: prev.firstName,
        parentLastName: prev.lastName,
        parentEmail: prev.email,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        parentFirstName: '',
        parentLastName: '',
        parentEmail: '',
      }));
    }
  };

  const handleCopyPatientInfo = (e) => {
    const checked = e.target.checked;
    setCopyPatientInfo(checked);
    
    if (checked) {
      setFormData(prev => ({
        ...prev,
        patientFirstName: prev.firstName,
        patientLastName: prev.lastName,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        patientFirstName: '',
        patientLastName: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Validate therapy type and patient type
    if (!formData.therapyType) {
      const errorMsg = 'Please select a therapy type';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    if (!formData.patientType) {
      const errorMsg = 'Please select who this account is for';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    // Validate speech therapy pediatric fields
    if (formData.therapyType === 'speech' && formData.patientType === 'child') {
      if (!formData.childFirstName || !formData.childLastName || !formData.childDateOfBirth || !formData.childGender) {
        const errorMsg = 'Please fill in all child information fields';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
      if (!formData.parentFirstName || !formData.parentLastName || !formData.parentEmail || !formData.parentPhone || !formData.relationshipWithChild) {
        const errorMsg = 'Please fill in all parent/guardian information fields';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
    }

    // Validate physical therapy fields
    if (formData.therapyType === 'physical') {
      if (!formData.patientFirstName || !formData.patientLastName || !formData.patientGender) {
        const errorMsg = 'Please fill in all patient information fields';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await authService.register(registerData);
      
      // Clear token and user data from localStorage (don't auto-login)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show success message
      const successMsg = 'Registration successful! Please login with your credentials.';
      setSuccess(successMsg);
      toast.success(successMsg, 4000);
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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
            toast.success('Account created! Please complete your profile.');
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
            toast.success('Account created! Please complete your profile.');
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
            <Link to="/login" className="auth-nav-btn">Login</Link>
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
                <h2>Join CVAPed Today</h2>
                <p>Start your journey to better health and wellness management</p>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Create Account</h1>
                <p>Sign up to get started with CVAPed.</p>
              </div>

              {/* OAuth Buttons */}
              <div className="oauth-section">
                <button
                  type="button"
                  className="oauth-btn google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
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
                  <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#fff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </button> */}
              </div>

              <div className="auth-divider">
                <span>OR</span>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                {/* Step 1: Basic Account Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Account Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

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
                      minLength="6"
                      autoComplete="new-password"
                    />
                    <small className="form-hint">Minimum 6 characters</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      minLength="6"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Step 2: Therapy Type Selection */}
                <div className="form-section">
                  <h3 className="form-section-title">Therapy Type</h3>
                  <div className="form-group">
                    <label>Which therapy do you need?</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="therapyType"
                          value="speech"
                          checked={formData.therapyType === 'speech'}
                          onChange={handleChange}
                          required
                        />
                        <span className="radio-label">
                          <strong>Speech/Language Therapy</strong>
                          <small>For communication disorders (pediatric)</small>
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="therapyType"
                          value="physical"
                          checked={formData.therapyType === 'physical'}
                          onChange={handleChange}
                          required
                        />
                        <span className="radio-label">
                          <strong>Physical Therapy</strong>
                          <small>For stroke recovery and mobility</small>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Step 3: Patient Type Selection */}
                {formData.therapyType && (
                  <div className="form-section">
                    <h3 className="form-section-title">Who is this account for?</h3>
                    <div className="form-group">
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="patientType"
                            value="myself"
                            checked={formData.patientType === 'myself'}
                            onChange={handleChange}
                            required
                          />
                          <span className="radio-label">
                            <strong>Myself</strong>
                            <small>I am the patient</small>
                          </span>
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="patientType"
                            value="child"
                            checked={formData.patientType === 'child'}
                            onChange={handleChange}
                            required
                          />
                          <span className="radio-label">
                            <strong>My Child</strong>
                            <small>Registering for my child</small>
                          </span>
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="patientType"
                            value="dependent"
                            checked={formData.patientType === 'dependent'}
                            onChange={handleChange}
                            required
                          />
                          <span className="radio-label">
                            <strong>A Family Member</strong>
                            <small>Registering for a dependent</small>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional: Pediatric Speech Therapy Fields */}
                {formData.therapyType === 'speech' && formData.patientType === 'child' && (
                  <>
                    <div className="form-section">
                      <h3 className="form-section-title">Child Information</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="childFirstName">Child's First Name</label>
                          <input
                            type="text"
                            id="childFirstName"
                            name="childFirstName"
                            value={formData.childFirstName}
                            onChange={handleChange}
                            required
                            placeholder="Child's first name"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="childLastName">Child's Last Name</label>
                          <input
                            type="text"
                            id="childLastName"
                            name="childLastName"
                            value={formData.childLastName}
                            onChange={handleChange}
                            required
                            placeholder="Child's last name"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="childDateOfBirth">Child's Date of Birth</label>
                          <input
                            type="date"
                            id="childDateOfBirth"
                            name="childDateOfBirth"
                            value={formData.childDateOfBirth}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="childGender">Child's Gender</label>
                          <select
                            id="childGender"
                            name="childGender"
                            value={formData.childGender}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3 className="form-section-title">Parent/Guardian Information</h3>
                      <div className="form-group">
                        <label className="checkbox-option">
                          <input
                            type="checkbox"
                            checked={copyParentInfo}
                            onChange={handleCopyParentInfo}
                          />
                          <span>Use my registration information as parent info</span>
                        </label>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="parentFirstName">Parent's First Name</label>
                          <input
                            type="text"
                            id="parentFirstName"
                            name="parentFirstName"
                            value={formData.parentFirstName}
                            onChange={handleChange}
                            required
                            placeholder="Parent's first name"
                            disabled={copyParentInfo}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="parentLastName">Parent's Last Name</label>
                          <input
                            type="text"
                            id="parentLastName"
                            name="parentLastName"
                            value={formData.parentLastName}
                            onChange={handleChange}
                            required
                            placeholder="Parent's last name"
                            disabled={copyParentInfo}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="parentEmail">Parent's Email</label>
                        <input
                          type="email"
                          id="parentEmail"
                          name="parentEmail"
                          value={formData.parentEmail}
                          onChange={handleChange}
                          required
                          placeholder="Parent's email"
                          disabled={copyParentInfo}
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="parentPhone">Parent's Phone</label>
                          <input
                            type="tel"
                            id="parentPhone"
                            name="parentPhone"
                            value={formData.parentPhone}
                            onChange={handleChange}
                            required
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="relationshipWithChild">Relationship</label>
                          <select
                            id="relationshipWithChild"
                            name="relationshipWithChild"
                            value={formData.relationshipWithChild}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select relationship</option>
                            <option value="mother">Mother</option>
                            <option value="father">Father</option>
                            <option value="guardian">Guardian</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Conditional: Physical Therapy (Stroke Patient) Fields */}
                {formData.therapyType === 'physical' && (
                  <div className="form-section">
                    <h3 className="form-section-title">Patient Information</h3>
                    <div className="form-group">
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={copyPatientInfo}
                          onChange={handleCopyPatientInfo}
                        />
                        <span>Patient information is same as my account information</span>
                      </label>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patientFirstName">Patient's First Name</label>
                        <input
                          type="text"
                          id="patientFirstName"
                          name="patientFirstName"
                          value={formData.patientFirstName}
                          onChange={handleChange}
                          required
                          placeholder="Patient's first name"
                          disabled={copyPatientInfo}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patientLastName">Patient's Last Name</label>
                        <input
                          type="text"
                          id="patientLastName"
                          name="patientLastName"
                          value={formData.patientLastName}
                          onChange={handleChange}
                          required
                          placeholder="Patient's last name"
                          disabled={copyPatientInfo}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="patientGender">Patient's Gender</label>
                      <select
                        id="patientGender"
                        name="patientGender"
                        value={formData.patientGender}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="auth-divider">
                  <span>Already have an account?</span>
                </div>

                <Link to="/login" className="btn btn-secondary">
                  Login
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

export default Register;
