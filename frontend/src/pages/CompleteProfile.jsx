import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import './Auth.css';

function CompleteProfile({ onLogin }) {
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [copyParentInfo, setCopyParentInfo] = useState(false);
  const [copyPatientInfo, setCopyPatientInfo] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    // Get stored user info from OAuth login
    const storedUser = authService.getStoredUser();
    if (!storedUser) {
      navigate('/register');
      return;
    }
    
    if (storedUser.isProfileComplete) {
      navigate('/therapy-selection');
      return;
    }

    setUserInfo(storedUser);
    
    // Pre-fill with user info from OAuth
    setFormData(prev => ({
      ...prev,
      parentEmail: storedUser.email,
      parentFirstName: storedUser.firstName,
      parentLastName: storedUser.lastName,
    }));
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleCopyParentInfo = (e) => {
    const checked = e.target.checked;
    setCopyParentInfo(checked);
    
    if (checked && userInfo) {
      setFormData(prev => ({
        ...prev,
        parentFirstName: userInfo.firstName,
        parentLastName: userInfo.lastName,
        parentEmail: userInfo.email,
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
    
    if (checked && userInfo) {
      setFormData(prev => ({
        ...prev,
        patientFirstName: userInfo.firstName,
        patientLastName: userInfo.lastName,
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
      const response = await authService.completeProfile(formData);
      
      // Backend returns { message, user } on success
      if (response.user) {
        toast.success('Profile completed successfully!');
        // Update authentication state
        if (onLogin) {
          onLogin();
        }
        navigate('/therapy-selection');
      } else {
        const errorMsg = response.message || 'Failed to complete profile';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to complete profile. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="auth-page">
      {/* Navigation Header */}
      <nav className="auth-nav">
        <div className="auth-nav-container">
          <div className="auth-nav-left">
            <img src={images.logo} alt="CVAPed Logo" className="auth-nav-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="auth-nav-text" />
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
                <h2>Complete Your Profile</h2>
                <p>Just a few more details to personalize your experience</p>
              </div>
            </div>
          </div>

          {/* Right Side - Profile Completion Form */}
          <div className="auth-right">
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h1>Welcome, {userInfo.firstName}!</h1>
                <p>Please complete your profile to continue</p>
              </div>

              {error && <div className="error-alert">{error}</div>}

              <form className="auth-form" onSubmit={handleSubmit}>
                {/* Step 1: Therapy Type Selection */}
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
                          <strong>Speech Therapy</strong>
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

                {/* Step 2: Patient Type Selection */}
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
                          <span>Use my account information as parent info</span>
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
                  {loading ? 'Completing Profile...' : 'Complete Profile'}
                </button>
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
        </div>
      </footer>
    </div>
  );
}

export default CompleteProfile;
