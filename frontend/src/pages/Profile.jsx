import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { authService } from '../services/api';
import noProfileImg from '../assets/no_profile.png';
import './Profile.css';

function Profile({ onLogout, onFacilityExit }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      
      // Load user data
      const storedUser = authService.getStoredUser();
      setUser(storedUser);
      setEditData({
        firstName: storedUser.firstName || '',
        lastName: storedUser.lastName || '',
        email: storedUser.email || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset edit data if canceling
      setEditData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Call API to update user profile
      const response = await authService.updateProfile(editData);
      
      if (response.user) {
        setUser(response.user);
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-text">Loading your profile...</div>
          <div className="loading-subtext">Please wait</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <p>Unable to load profile. Please login again.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />

      {/* Main Content */}
      <div className="profile-content">
        {/* Profile Header */}
        <div className="profile-header-section">
            <div className="profile-avatar">
              <div className="avatar-circle">
                <img src={noProfileImg} alt="Profile" />
              </div>
            </div>
            <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges">
              <span className="badge badge-therapy">
                <span className="badge-icon">🏥</span>
                {user.therapyType || 'N/A'}
              </span>
              {user.patientType && (
                <span className="badge badge-patient">
                  <span className="badge-icon">📋</span>
                  {user.patientType}
                </span>
              )}
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="profile-card">
            <div className="card-header">
              <div className="card-title-wrapper">
                <span className="card-icon">👤</span>
                <h2 className="card-title">Personal Information</h2>
              </div>
              <button 
                onClick={handleEditToggle} 
                className={`btn-edit ${isEditing ? 'btn-cancel' : ''}`}
              >
                {isEditing ? (
                  <>
                    <span>✕</span> Cancel
                  </>
                ) : (
                  <>
                    <span>✎</span> Edit Profile
                  </>
                )}
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <label className="info-label">
                    <span className="label-icon">📝</span>
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleInputChange}
                      className="info-input"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="info-value">{user.firstName}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">
                    <span className="label-icon">📝</span>
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleInputChange}
                      className="info-input"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="info-value">{user.lastName}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">
                    <span className="label-icon">📧</span>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      className="info-input"
                      placeholder="Enter email"
                    />
                  ) : (
                    <p className="info-value">{user.email}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">
                    <span className="label-icon">🏥</span>
                    Therapy Type
                  </label>
                  <p className="info-value capitalize">{user.therapyType || 'Not Set'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">
                    <span className="label-icon">📋</span>
                    Patient Type
                  </label>
                  <p className="info-value capitalize">{user.patientType || 'Not Set'}</p>
                </div>
              </div>
              {isEditing && (
                <div className="edit-actions">
                  <button 
                    onClick={handleSaveProfile} 
                    className="btn-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner"></span> Saving...
                      </>
                    ) : (
                      <>
                        <span>✓</span> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

export default Profile;
