import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, adminService } from '../services/api';
import { images } from '../assets/images';
import './AdminDashboard.css';

function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [therapyData, setTherapyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const storedUser = authService.getStoredUser();
      setUser(storedUser);
      
      // Redirect if not admin
      if (storedUser?.role !== 'admin') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/login');
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await adminService.getStats();
      if (statsResponse.success) {
        setStats(statsResponse);
      }
      
      // Load users if on users tab
      if (activeTab === 'users') {
        const usersResponse = await adminService.getAllUsers();
        if (usersResponse.success) {
          setUsers(usersResponse.users);
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin' && activeTab === 'users' && users.length === 0) {
      loadUsers();
    }
    if (user && user.role === 'admin' && activeTab.startsWith('speech-') && therapyData.length === 0) {
      loadTherapyData();
    }
    if (user && user.role === 'admin' && activeTab === 'physical' && therapyData.length === 0) {
      loadTherapyData();
    }
  }, [activeTab, activeSubTab]);

  const loadUsers = async () => {
    try {
      const usersResponse = await adminService.getAllUsers();
      if (usersResponse.success) {
        setUsers(usersResponse.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTherapyData = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'speech-articulation') {
        response = await adminService.getArticulationData();
      } else if (activeTab === 'speech-language') {
        const mode = activeSubTab || 'receptive';
        response = await adminService.getLanguageData(mode);
      } else if (activeTab === 'speech-fluency') {
        response = await adminService.getFluencyData();
      } else if (activeTab === 'physical') {
        response = await adminService.getPhysicalData();
      }
      
      if (response && response.success) {
        setTherapyData(response.data);
      }
    } catch (error) {
      console.error('Error loading therapy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        alert('User deleted successfully');
        loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const response = await adminService.updateUser(userId, updates);
      if (response.success) {
        alert('User updated successfully');
        setEditingUser(null);
        loadUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data) => {
    let sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  };

  const sortedUsers = React.useMemo(() => {
    return sortData(users);
  }, [users, sortConfig]);

  const filteredUsers = React.useMemo(() => {
    return sortedUsers.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedUsers, searchTerm]);

  const sortedTherapyData = React.useMemo(() => {
    return sortData(therapyData);
  }, [therapyData, sortConfig]);

  const filteredTherapyData = React.useMemo(() => {
    return sortedTherapyData.filter(item =>
      (item.user_name && item.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.user_email && item.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sortedTherapyData, searchTerm]);

  const handleLogout = () => {
    authService.logout();
    onLogout();
    navigate('/login');
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format time ago
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
  };

  // Real stats data from backend
  const statsCards = stats ? [
    {
      id: 1,
      title: 'Total Users',
      value: stats.stats.total_users.toLocaleString(),
      change: '+12.5%',
      trend: 'up',
      icon: '👥',
      color: '#479ac3'
    },
    {
      id: 2,
      title: 'Active Sessions',
      value: stats.stats.total_sessions.toLocaleString(),
      change: '+8.2%',
      trend: 'up',
      icon: '🎯',
      color: '#e8b04e'
    },
    {
      id: 3,
      title: 'Therapy Completions',
      value: stats.stats.total_completions.toLocaleString(),
      change: '+15.3%',
      trend: 'up',
      icon: '✅',
      color: '#27ae60'
    },
    {
      id: 4,
      title: 'Average Score',
      value: `${stats.stats.average_score}%`,
      change: '+3.1%',
      trend: 'up',
      icon: '📊',
      color: '#ce3630'
    }
  ] : [];

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { 
      id: 'speech', 
      label: 'Speech Therapy', 
      icon: '🎤',
      subItems: [
        { id: 'speech-articulation', label: 'Articulation Therapy', icon: '🗣️' },
        { 
          id: 'speech-language', 
          label: 'Language Therapy', 
          icon: '�',
          subItems: [
            { id: 'receptive', label: 'Receptive' },
            { id: 'expressive', label: 'Expressive' }
          ]
        },
        { id: 'speech-fluency', label: 'Fluency Therapy', icon: '�' }
      ]
    },
    { id: 'physical', label: 'Physical Therapy', icon: '🏃' }
  ];

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={images.logo} alt="CVACare Logo" className="logo-img" />
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>CVACare</h2>
                <span className="admin-badge">Admin Panel</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <div key={item.id}>
              <button
                className={`nav-item ${activeTab === item.id || activeTab.startsWith(item.id) ? 'active' : ''}`}
                onClick={() => {
                  if (!item.subItems) {
                    setActiveTab(item.id);
                    setActiveSubTab(null);
                    setTherapyData([]);
                    setSearchTerm('');
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
              {!sidebarCollapsed && item.subItems && (
                <div className="sub-nav">
                  {item.subItems.map(subItem => (
                    <div key={subItem.id}>
                      <button
                        className={`nav-item sub-item ${activeTab === subItem.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab(subItem.id);
                          if (!subItem.subItems) {
                            setActiveSubTab(null);
                          } else {
                            setActiveSubTab(subItem.subItems[0].id);
                          }
                          setTherapyData([]);
                          setSearchTerm('');
                        }}
                      >
                        <span className="nav-icon">{subItem.icon}</span>
                        <span className="nav-label">{subItem.label}</span>
                      </button>
                      {subItem.subItems && (
                        <div className="sub-sub-nav">
                          {subItem.subItems.map(subSubItem => (
                            <button
                              key={subSubItem.id}
                              className={`nav-item sub-sub-item ${activeSubTab === subSubItem.id ? 'active' : ''}`}
                              onClick={() => {
                                setActiveTab('speech-language');
                                setActiveSubTab(subSubItem.id);
                                setTherapyData([]);
                                setSearchTerm('');
                              }}
                            >
                              <span className="nav-label">{subSubItem.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <div className="profile-info">
                <p className="profile-name">{user?.firstName} {user?.lastName}</p>
                <p className="profile-role">Administrator</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="header-left">
            <h1 className="page-title">
              {(() => {
                if (activeTab === 'overview') return 'Overview';
                if (activeTab === 'users') return 'User Management';
                if (activeTab === 'speech-articulation') return 'Articulation Therapy';
                if (activeTab === 'speech-language') return `Language Therapy - ${activeSubTab === 'expressive' ? 'Expressive' : 'Receptive'}`;
                if (activeTab === 'speech-fluency') return 'Fluency Therapy';
                if (activeTab === 'physical') return 'Physical Therapy';
                return 'Admin Dashboard';
              })()}
            </h1>
            <p className="page-subtitle">Welcome back, {user?.firstName}! Here's what's happening today.</p>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => navigate('/profile')}>
              👤 Profile
            </button>
            <button className="header-btn logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="admin-content">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading admin data...</p>
            </div>
          )}

          {activeTab === 'overview' && stats && (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                {statsCards.map(stat => (
                  <div key={stat.id} className="stat-card">
                    <div className="stat-header">
                      <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                        {stat.icon}
                      </div>
                      <span className={`stat-trend ${stat.trend}`}>
                        {stat.change}
                      </span>
                    </div>
                    <div className="stat-body">
                      <h3 className="stat-value">{stat.value}</h3>
                      <p className="stat-label">{stat.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="charts-row">
                <div className="chart-card large">
                  <div className="card-header">
                    <h3 className="card-title">Therapy Breakdown by Type</h3>
                  </div>
                  <div className="card-body">
                    <div className="therapy-breakdown">
                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <div className="breakdown-icon" style={{ background: '#ce3630' }}>🗣️</div>
                          <div className="breakdown-info">
                            <h4>Articulation Therapy</h4>
                            <p>Speech sound practice sessions</p>
                          </div>
                        </div>
                        <div className="breakdown-stats">
                          <div className="breakdown-stat">
                            <span className="stat-label">Sessions</span>
                            <span className="stat-value">{stats.stats?.articulation_sessions || 0}</span>
                          </div>
                          <div className="breakdown-stat">
                            <span className="stat-label">Avg Score</span>
                            <span className="stat-value">{stats.stats?.articulation_avg || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <div className="breakdown-icon" style={{ background: '#479ac3' }}>📚</div>
                          <div className="breakdown-info">
                            <h4>Language Therapy</h4>
                            <p>Receptive & expressive exercises</p>
                          </div>
                        </div>
                        <div className="breakdown-stats">
                          <div className="breakdown-stat">
                            <span className="stat-label">Sessions</span>
                            <span className="stat-value">{stats.stats?.language_sessions || 0}</span>
                          </div>
                          <div className="breakdown-stat">
                            <span className="stat-label">Avg Score</span>
                            <span className="stat-value">{stats.stats?.language_avg || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="breakdown-item">
                        <div className="breakdown-header">
                          <div className="breakdown-icon" style={{ background: '#e8b04e' }}>💬</div>
                          <div className="breakdown-info">
                            <h4>Fluency Therapy</h4>
                            <p>Speech fluency training</p>
                          </div>
                        </div>
                        <div className="breakdown-stats">
                          <div className="breakdown-stat">
                            <span className="stat-label">Sessions</span>
                            <span className="stat-value">{stats.stats?.fluency_sessions || 0}</span>
                          </div>
                          <div className="breakdown-stat">
                            <span className="stat-label">Avg Score</span>
                            <span className="stat-value">{stats.stats?.fluency_avg || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chart-card small">
                  <div className="card-header">
                    <h3 className="card-title">Therapy Distribution</h3>
                  </div>
                  <div className="card-body">
                    <div className="chart-container">
                      {stats.therapy_distribution ? (
                        <div className="pie-chart">
                          <div className="pie-stats">
                            <div className="pie-stat">
                              <div className="pie-color" style={{ background: '#ce3630' }}></div>
                              <span className="pie-label">Speech Therapy</span>
                              <span className="pie-value">{stats.therapy_distribution.speech}</span>
                            </div>
                            <div className="pie-stat">
                              <div className="pie-color" style={{ background: '#479ac3' }}></div>
                              <span className="pie-label">Physical Therapy</span>
                              <span className="pie-value">{stats.therapy_distribution.physical}</span>
                            </div>
                          </div>
                          <svg className="pie-svg" viewBox="0 0 200 200">
                            {(() => {
                              const total = stats.therapy_distribution.speech + stats.therapy_distribution.physical;
                              if (total === 0) return null;
                              
                              const speechPercent = (stats.therapy_distribution.speech / total) * 100;
                              const circumference = 2 * Math.PI * 80;
                              const speechLength = (speechPercent / 100) * circumference;
                              
                              return (
                                <>
                                  <circle cx="100" cy="100" r="80" fill="none" stroke="#479ac3" strokeWidth="40" />
                                  <circle 
                                    cx="100" 
                                    cy="100" 
                                    r="80" 
                                    fill="none" 
                                    stroke="#ce3630" 
                                    strokeWidth="40"
                                    strokeDasharray={`${speechLength} ${circumference}`}
                                    transform="rotate(-90 100 100)"
                                  />
                                  <text x="100" y="100" textAnchor="middle" dy="0.3em" fontSize="24" fontWeight="bold">
                                    {total}
                                  </text>
                                  <text x="100" y="125" textAnchor="middle" fontSize="12" fill="#666">
                                    Total Users
                                  </text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      ) : (
                        <div className="chart-placeholder">
                          <div className="chart-icon">🍩</div>
                          <p>Loading distribution...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="activity-section">
                <div className="section-header">
                  <h3 className="section-title">Recent Activity</h3>
                </div>
                <div className="activity-list">
                  {stats.recent_activity && stats.recent_activity.length > 0 ? (
                    stats.recent_activity.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon speech">🎤</div>
                        <div className="activity-details">
                          <p className="activity-text">
                            <strong>{activity.user_name}</strong> completed {activity.therapy_type} with score {activity.score}%
                          </p>
                          <span className="activity-time">{timeAgo(activity.timestamp)}</span>
                        </div>
                        <span className={`activity-status ${activity.status === 'completed' ? 'success' : 'warning'}`}>
                          {activity.status === 'completed' ? 'Completed' : 'Practicing'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="users-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>User Management</h2>
                  <p className="users-subtitle">Manage all registered users and their details</p>
                </div>
                <div className="users-actions">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('firstName')} className="sortable">
                        Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('email')} className="sortable">
                        Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('role')} className="sortable">
                        Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('therapyType')} className="sortable">
                        Therapy Type {sortConfig.key === 'therapyType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('patientType')} className="sortable">
                        Patient Type {sortConfig.key === 'patientType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('total_sessions')} className="sortable">
                        Sessions {sortConfig.key === 'total_sessions' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('active_therapies')} className="sortable">
                        Active {sortConfig.key === 'active_therapies' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('created_at')} className="sortable">
                        Joined {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </div>
                              <div className="user-info">
                                <div className="user-name">{user.firstName} {user.lastName}</div>
                                {user.gender !== 'N/A' && <div className="user-meta">{user.gender}, {user.age} years</div>}
                              </div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`badge ${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${user.therapyType}`}>
                              {user.therapyType}
                            </span>
                          </td>
                          <td>{user.patientType}</td>
                          <td>
                            <span className="stat-number">{user.total_sessions}</span>
                          </td>
                          <td>
                            <span className="stat-number">{user.active_therapies}</span>
                          </td>
                          <td>
                            <div className="date-cell">
                              <div>{formatDate(user.created_at)}</div>
                              <small>{timeAgo(user.last_active)}</small>
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn-icon edit"
                                title="Edit user"
                                onClick={() => setEditingUser(user)}
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-icon delete"
                                title="Delete user"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.role === 'admin'}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="no-data">
                          {searchTerm ? 'No users found matching your search' : 'No users available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </div>
          )}

          {/* Articulation Therapy Data */}
          {activeTab === 'speech-articulation' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Articulation Therapy Sessions</h2>
                  <p className="users-subtitle">View all articulation therapy trials and progress</p>
                </div>
                <div className="users-actions">
                  <input
                    type="text"
                    placeholder="Search by user..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('user_name')} className="sortable">
                        User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('sound')} className="sortable">
                        Sound {sortConfig.key === 'sound' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('word')} className="sortable">
                        Word {sortConfig.key === 'word' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('score')} className="sortable">
                        Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('is_correct')} className="sortable">
                        Result {sortConfig.key === 'is_correct' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Transcription</th>
                      <th onClick={() => handleSort('created_at')} className="sortable">
                        Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTherapyData.length > 0 ? (
                      filteredTherapyData.map((trial) => (
                        <tr key={trial.id}>
                          <td>
                            <div className="user-info">
                              <div className="user-name">{trial.user_name}</div>
                              <small>{trial.user_email}</small>
                            </div>
                          </td>
                          <td><span className="badge primary">{trial.sound}</span></td>
                          <td><strong>{trial.word}</strong></td>
                          <td><span className="stat-number">{trial.score}%</span></td>
                          <td>
                            <span className={`badge ${trial.is_correct ? 'success' : 'warning'}`}>
                              {trial.is_correct ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          </td>
                          <td><span className="transcription-text">{trial.transcription || 'N/A'}</span></td>
                          <td>{formatDate(trial.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="no-data">
                          {searchTerm ? 'No trials found matching your search' : 'No articulation therapy data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">
                  Showing {filteredTherapyData.length} of {therapyData.length} trials
                </div>
              </div>
            </div>
          )}

          {/* Language Therapy Data */}
          {activeTab === 'speech-language' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Language Therapy Sessions - {activeSubTab === 'expressive' ? 'Expressive' : 'Receptive'}</h2>
                  <p className="users-subtitle">View all {activeSubTab} language therapy trials</p>
                </div>
                <div className="users-actions">
                  <div className="tab-buttons">
                    <button
                      className={`tab-btn ${activeSubTab === 'receptive' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSubTab('receptive');
                        setTherapyData([]);
                        setSearchTerm('');
                      }}
                    >
                      Receptive
                    </button>
                    <button
                      className={`tab-btn ${activeSubTab === 'expressive' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSubTab('expressive');
                        setTherapyData([]);
                        setSearchTerm('');
                      }}
                    >
                      Expressive
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by user..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('user_name')} className="sortable">
                        User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('exercise_id')} className="sortable">
                        Exercise {sortConfig.key === 'exercise_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('score')} className="sortable">
                        Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('is_correct')} className="sortable">
                        Result {sortConfig.key === 'is_correct' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>User Answer</th>
                      <th>Transcription</th>
                      <th onClick={() => handleSort('created_at')} className="sortable">
                        Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTherapyData.length > 0 ? (
                      filteredTherapyData.map((trial) => (
                        <tr key={trial.id}>
                          <td>
                            <div className="user-info">
                              <div className="user-name">{trial.user_name}</div>
                              <small>{trial.user_email}</small>
                            </div>
                          </td>
                          <td><span className="badge primary">#{trial.exercise_index}</span></td>
                          <td><span className="stat-number">{trial.score}%</span></td>
                          <td>
                            <span className={`badge ${trial.is_correct ? 'success' : 'warning'}`}>
                              {trial.is_correct ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          </td>
                          <td>{trial.user_answer || 'N/A'}</td>
                          <td><span className="transcription-text">{trial.transcription || 'N/A'}</span></td>
                          <td>{formatDate(trial.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="no-data">
                          {searchTerm ? 'No trials found matching your search' : `No ${activeSubTab} language therapy data available`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">
                  Showing {filteredTherapyData.length} of {therapyData.length} trials
                </div>
              </div>
            </div>
          )}

          {/* Fluency Therapy Data */}
          {activeTab === 'speech-fluency' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Fluency Therapy Sessions</h2>
                  <p className="users-subtitle">View all fluency therapy trials and progress</p>
                </div>
                <div className="users-actions">
                  <input
                    type="text"
                    placeholder="Search by user..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('user_name')} className="sortable">
                        User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('exercise_type')} className="sortable">
                        Exercise Type {sortConfig.key === 'exercise_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('fluency_score')} className="sortable">
                        Fluency Score {sortConfig.key === 'fluency_score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('word_count')} className="sortable">
                        Words {sortConfig.key === 'word_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('filler_count')} className="sortable">
                        Fillers {sortConfig.key === 'filler_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Transcription</th>
                      <th onClick={() => handleSort('created_at')} className="sortable">
                        Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTherapyData.length > 0 ? (
                      filteredTherapyData.map((trial) => (
                        <tr key={trial.id}>
                          <td>
                            <div className="user-info">
                              <div className="user-name">{trial.user_name}</div>
                              <small>{trial.user_email}</small>
                            </div>
                          </td>
                          <td><span className="badge primary">{trial.exercise_type}</span></td>
                          <td><span className="stat-number">{trial.fluency_score}%</span></td>
                          <td>{trial.word_count}</td>
                          <td>{trial.filler_count}</td>
                          <td><span className="transcription-text">{trial.transcription || 'N/A'}</span></td>
                          <td>{formatDate(trial.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="no-data">
                          {searchTerm ? 'No trials found matching your search' : 'No fluency therapy data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">
                  Showing {filteredTherapyData.length} of {therapyData.length} trials
                </div>
              </div>
            </div>
          )}

          {/* Physical Therapy Data */}
          {activeTab === 'physical' && (
            <div className="therapy-management">
              <div className="users-header">
                <div className="users-title-section">
                  <h2>Physical Therapy Sessions</h2>
                  <p className="users-subtitle">View all physical therapy trials and progress</p>
                </div>
                <div className="users-actions">
                  <input
                    type="text"
                    placeholder="Search by user..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('user_name')} className="sortable">
                        User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('exercise_type')} className="sortable">
                        Exercise Type {sortConfig.key === 'exercise_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('score')} className="sortable">
                        Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('duration')} className="sortable">
                        Duration {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('created_at')} className="sortable">
                        Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTherapyData.length > 0 ? (
                      filteredTherapyData.map((trial) => (
                        <tr key={trial.id}>
                          <td>
                            <div className="user-info">
                              <div className="user-name">{trial.user_name}</div>
                              <small>{trial.user_email}</small>
                            </div>
                          </td>
                          <td><span className="badge primary">{trial.exercise_type}</span></td>
                          <td><span className="stat-number">{trial.score}%</span></td>
                          <td>{trial.duration} min</td>
                          <td>{formatDate(trial.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-data">
                          {searchTerm ? 'No trials found matching your search' : 'No physical therapy data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="table-info">
                  Showing {filteredTherapyData.length} of {therapyData.length} trials
                </div>
              </div>
            </div>
          )}

          {activeTab === 'therapies' && (
            <div className="tab-content">
              <div className="content-placeholder">
                <div className="placeholder-icon">🎯</div>
                <h3>Therapy Sessions</h3>
                <p>Therapy session management will be implemented here</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="tab-content">
              <div className="content-placeholder">
                <div className="placeholder-icon">📈</div>
                <h3>Analytics Dashboard</h3>
                <p>Advanced analytics and insights coming soon</p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="tab-content">
              <div className="content-placeholder">
                <div className="placeholder-icon">📄</div>
                <h3>Reports</h3>
                <p>Comprehensive reporting system will be added here</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <div className="content-placeholder">
                <div className="placeholder-icon">⚙️</div>
                <h3>System Settings</h3>
                <p>Configuration and settings panel coming soon</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editingUser.firstName}
                  onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editingUser.lastName}
                  onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Therapy Type</label>
                <select
                  value={editingUser.therapyType}
                  onChange={(e) => setEditingUser({...editingUser, therapyType: e.target.value})}
                >
                  <option value="speech">Speech</option>
                  <option value="physical">Physical</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleUpdateUser(editingUser.id, {
                  firstName: editingUser.firstName,
                  lastName: editingUser.lastName,
                  email: editingUser.email,
                  role: editingUser.role,
                  therapyType: editingUser.therapyType
                })}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
