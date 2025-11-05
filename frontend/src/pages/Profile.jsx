import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import { authService, articulationService, languageService } from '../services/api';
import './Profile.css';

function Profile({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allProgress, setAllProgress] = useState([]);
  const [languageProgress, setLanguageProgress] = useState([]);
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

      // Load articulation progress data
      const progressResponse = await articulationService.getAllProgress();
      if (progressResponse.success) {
        setAllProgress(progressResponse.progress);
      }

      // Load language therapy progress data
      const languageProgressResponse = await languageService.getAllProgress();
      if (languageProgressResponse.success) {
        setLanguageProgress(languageProgressResponse.progress);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
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

  const calculateSoundProgress = (soundProgress) => {
    const levels = soundProgress.levels || {};
    const totalLevels = 5;
    const completedLevels = Object.values(levels).filter(level => level.is_complete).length;
    const percentage = (completedLevels / totalLevels) * 100;
    
    return {
      completedLevels,
      totalLevels,
      percentage: Math.round(percentage)
    };
  };

  const getSoundName = (soundId) => {
    const soundNames = {
      's': 'S Sound',
      'r': 'R Sound',
      'l': 'L Sound',
      'k': 'K Sound',
      'th': 'TH Sound'
    };
    return soundNames[soundId] || soundId.toUpperCase();
  };

  const getSoundColor = (soundId) => {
    const soundColors = {
      's': '#ce3630',
      'r': '#479ac3',
      'l': '#e8b04e',
      'k': '#8e44ad',
      'th': '#27ae60'
    };
    return soundColors[soundId] || '#6b7280';
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
      <header className="profile-header">
        <div className="profile-header-container">
          <div className="profile-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="profile-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="profile-header-text" />
          </div>
          <div className="profile-header-actions">
            <button onClick={() => navigate('/therapy-selection')} className="btn-back">
              ← Back to Dashboard
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="profile-content">
        <div className="profile-container">
          <h1 className="profile-title">My Profile</h1>

          {/* Personal Information Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">Personal Information</h2>
              <button 
                onClick={handleEditToggle} 
                className={`btn-edit ${isEditing ? 'btn-cancel' : ''}`}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <label className="info-label">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleInputChange}
                      className="info-input"
                    />
                  ) : (
                    <p className="info-value">{user.firstName}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleInputChange}
                      className="info-input"
                    />
                  ) : (
                    <p className="info-value">{user.lastName}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      className="info-input"
                    />
                  ) : (
                    <p className="info-value">{user.email}</p>
                  )}
                </div>
                <div className="info-item">
                  <label className="info-label">Therapy Type</label>
                  <p className="info-value capitalize">{user.therapyType || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Patient Type</label>
                  <p className="info-value capitalize">{user.patientType || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Role</label>
                  <p className="info-value capitalize">{user.role || 'Patient'}</p>
                </div>
              </div>
              {isEditing && (
                <div className="edit-actions">
                  <button 
                    onClick={handleSaveProfile} 
                    className="btn-save"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Summary Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">Articulation Therapy Progress</h2>
            </div>
            <div className="card-body">
              {allProgress.length === 0 ? (
                <div className="no-progress">
                  <p>No progress recorded yet.</p>
                  <p className="no-progress-hint">Start your therapy exercises to track your progress!</p>
                  <button 
                    onClick={() => navigate('/articulation')} 
                    className="btn-start-therapy"
                  >
                    Start Articulation Therapy
                  </button>
                </div>
              ) : (
                <div className="progress-list">
                  {allProgress.map((soundProgress) => {
                    const progress = calculateSoundProgress(soundProgress);
                    const soundColor = getSoundColor(soundProgress.sound_id);
                    
                    return (
                      <div key={soundProgress.sound_id} className="progress-item">
                        <div className="progress-item-header">
                          <div className="progress-sound-info">
                            <div 
                              className="progress-sound-badge"
                              style={{ backgroundColor: soundColor }}
                            >
                              {soundProgress.sound_id.toUpperCase()}
                            </div>
                            <div className="progress-sound-details">
                              <h3 className="progress-sound-name">
                                {getSoundName(soundProgress.sound_id)}
                              </h3>
                              <p className="progress-sound-stats">
                                {progress.completedLevels} of {progress.totalLevels} levels completed
                              </p>
                            </div>
                          </div>
                          <div className="progress-percentage" style={{ color: soundColor }}>
                            {progress.percentage}%
                          </div>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill"
                            style={{ 
                              width: `${progress.percentage}%`,
                              backgroundColor: soundColor
                            }}
                          ></div>
                        </div>
                        <div className="progress-levels">
                          {[1, 2, 3, 4, 5].map(levelNum => {
                            const levelKey = String(levelNum);
                            const levelData = soundProgress.levels?.[levelKey];
                            const isComplete = levelData?.is_complete || false;
                            const completedItems = levelData?.completed_items || 0;
                            const totalItems = levelData?.total_items || 0;
                            
                            return (
                              <div 
                                key={levelNum} 
                                className={`level-badge ${isComplete ? 'complete' : 'incomplete'}`}
                                title={`Level ${levelNum}: ${completedItems}/${totalItems} items`}
                              >
                                <span className="level-number">{levelNum}</span>
                                {isComplete && <span className="level-check">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => navigate(`/articulation/${soundProgress.sound_id}`)}
                          className="btn-continue"
                          style={{ borderColor: soundColor, color: soundColor }}
                        >
                          Continue Practice →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Language Therapy Progress Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">Language Therapy Progress</h2>
            </div>
            <div className="card-body">
              {languageProgress.length === 0 ? (
                <div className="no-progress">
                  <p>No language therapy progress recorded yet.</p>
                  <p className="no-progress-hint">Start language therapy exercises to track your progress!</p>
                  <button 
                    onClick={() => navigate('/speech-therapy')} 
                    className="btn-start-therapy"
                  >
                    Start Language Therapy
                  </button>
                </div>
              ) : (
                <div className="progress-list">
                  {languageProgress.map((modeProgress) => {
                    const percentage = Math.round((modeProgress.correct_exercises / modeProgress.total_exercises) * 100) || 0;
                    const modeColor = modeProgress.mode === 'receptive' ? '#3b82f6' : '#8b5cf6';
                    const modeName = modeProgress.mode === 'receptive' ? 'Receptive Language' : 'Expressive Language';
                    
                    return (
                      <div key={modeProgress.mode} className="progress-item">
                        <div className="progress-item-header">
                          <div className="progress-sound-info">
                            <div 
                              className="progress-sound-badge"
                              style={{ backgroundColor: modeColor }}
                            >
                              {modeProgress.mode === 'receptive' ? '👂' : '💬'}
                            </div>
                            <div className="progress-sound-details">
                              <h3 className="progress-sound-name">
                                {modeName}
                              </h3>
                              <p className="progress-sound-stats">
                                {modeProgress.completed_exercises} of {modeProgress.total_exercises} exercises completed
                                {' • '}
                                {Math.round(modeProgress.accuracy * 100)}% accuracy
                              </p>
                            </div>
                          </div>
                          <div className="progress-percentage" style={{ color: modeColor }}>
                            {percentage}%
                          </div>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: modeColor
                            }}
                          ></div>
                        </div>
                        <div className="language-stats">
                          <div className="language-stat">
                            <span className="stat-icon">✓</span>
                            <span className="stat-text">{modeProgress.correct_exercises} Correct</span>
                          </div>
                          <div className="language-stat">
                            <span className="stat-icon">📊</span>
                            <span className="stat-text">{Math.round(modeProgress.accuracy * 100)}% Accuracy</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/language-therapy')}
                          className="btn-continue"
                          style={{ borderColor: modeColor, color: modeColor }}
                        >
                          Continue Practice →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Statistics Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">Overall Statistics</h2>
            </div>
            <div className="card-body">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{allProgress.length}</div>
                  <div className="stat-label">Sounds Practiced</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {allProgress.reduce((total, sound) => {
                      return total + Object.values(sound.levels || {}).filter(l => l.is_complete).length;
                    }, 0)}
                  </div>
                  <div className="stat-label">Levels Completed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {languageProgress.reduce((total, mode) => {
                      return total + (mode.completed_exercises || 0);
                    }, 0)}
                  </div>
                  <div className="stat-label">Language Exercises</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {Math.round(
                      allProgress.reduce((total, sound) => {
                        const progress = calculateSoundProgress(sound);
                        return total + progress.percentage;
                      }, 0) / (allProgress.length || 1)
                    )}%
                  </div>
                  <div className="stat-label">Average Progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
