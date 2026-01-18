import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, adminService } from '../services/api';
import { useToast } from '../components/ToastContext';
import { images } from '../assets/images';
import { FiCopy, FiTrash2, FiCheck, FiX, FiUsers, FiActivity, FiBriefcase, FiShield, FiGrid, FiEdit3 } from 'react-icons/fi';
import './AdminDashboard.css';

function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Overview state
  const [stats, setStats] = useState(null);
  
  // User management state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    console.log('Effect triggered - user:', user, 'activeTab:', activeTab);
    if (user) {
      if (activeTab === 'overview') {
        console.log('Loading stats...');
        loadStats();
      } else if (activeTab === 'users') {
        console.log('Loading users...');
        loadUsers();
      }
    }
  }, [activeTab, user, currentPage, perPage]);

  const checkAuth = async () => {
    try {
      const response = await authService.getCurrentUser();
      const currentUser = response.user || response; // Handle both { user: {...} } and {...} formats
      console.log('Current user:', currentUser);
      if (currentUser.role !== 'admin') {
        console.log('User is not admin, redirecting...');
        navigate('/dashboard');
      } else {
        console.log('User is admin, setting user state...');
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/login');
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('Calling adminService.getStats()...');
      const response = await adminService.getStats();
      console.log('Stats response:', response);
      setStats(response.stats || response.data?.stats || response);
    } catch (error) {
      console.error('Error loading stats:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Calling adminService.getAllUsers()...');
      const response = await adminService.getAllUsers(currentPage, perPage, searchTerm);
      console.log('Users response:', response);
      console.log('Pagination object:', response.pagination);
      setUsers(response.users || []);
      setTotalPages(response.pagination?.total_pages || 1);
      console.log('Set totalPages to:', response.pagination?.total_pages || 1);
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const startEditRole = (userId, currentRole) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  const saveRole = async (userId) => {
    try {
      const response = await adminService.updateUserRole(userId, editingRole);
      if (response.success) {
        toast.success('User role updated successfully!');
        setEditingUserId(null);
        setEditingRole('');
        loadUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating role');
    }
  };

  const confirmDelete = (userId, userName) => {
    setDeleteConfirm({ userId, userName });
  };

  const deleteUser = async () => {
    try {
      const response = await adminService.deleteUser(deleteConfirm.userId);
      if (response.success) {
        toast.success('User deleted successfully!');
        setDeleteConfirm(null);
        loadUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user');
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <h2 className="section-title">System Overview</h2>
      
      {loading ? (
        <div className="loading">Loading statistics...</div>
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{stats.total_users}</div>
              </div>
            </div>
            
            <div className="stat-card patients">
              <div className="stat-icon">
                <FiActivity />
              </div>
              <div className="stat-content">
                <div className="stat-label">Patients</div>
                <div className="stat-value">{stats.total_patients}</div>
              </div>
            </div>
            
            <div className="stat-card therapists">
              <div className="stat-icon">
                <FiBriefcase />
              </div>
              <div className="stat-content">
                <div className="stat-label">Therapists</div>
                <div className="stat-value">{stats.total_therapists}</div>
              </div>
            </div>
            
            <div className="stat-card admins">
              <div className="stat-icon">
                <FiShield />
              </div>
              <div className="stat-content">
                <div className="stat-label">Administrators</div>
                <div className="stat-value">{stats.total_admins}</div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            {/* User Distribution - Pie Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <FiGrid className="title-icon" />
                User Distribution
              </h3>
              <div className="pie-chart">
                <div className="pie-chart-container">
                  <svg viewBox="0 0 200 200" className="pie-svg">
                    {/* Calculate percentages */}
                    {(() => {
                      const total = stats.total_users || 1;
                      const patientPercent = (stats.total_patients / total) * 100;
                      const therapistPercent = (stats.total_therapists / total) * 100;
                      const adminPercent = (stats.total_admins / total) * 100;
                      
                      let cumulativePercent = 0;
                      
                      const createArc = (percent, color) => {
                        const startAngle = (cumulativePercent / 100) * 360;
                        const endAngle = ((cumulativePercent + percent) / 100) * 360;
                        cumulativePercent += percent;
                        
                        const start = polarToCartesian(100, 100, 80, endAngle);
                        const end = polarToCartesian(100, 100, 80, startAngle);
                        const largeArc = percent > 50 ? 1 : 0;
                        
                        return (
                          <path
                            key={color}
                            d={`M 100 100 L ${start.x} ${start.y} A 80 80 0 ${largeArc} 0 ${end.x} ${end.y} Z`}
                            fill={color}
                            className="pie-slice"
                          />
                        );
                      };
                      
                      return (
                        <>
                          {patientPercent > 0 && createArc(patientPercent, '#4caf50')}
                          {therapistPercent > 0 && createArc(therapistPercent, '#e8b04e')}
                          {adminPercent > 0 && createArc(adminPercent, '#ce3630')}
                          {/* Center circle for donut effect */}
                          <circle cx="100" cy="100" r="50" fill="white" />
                          <text x="100" y="95" textAnchor="middle" className="pie-center-text">Total</text>
                          <text x="100" y="115" textAnchor="middle" className="pie-center-number">{stats.total_users}</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color patients-color"></span>
                    <span className="legend-text">
                      <strong>Patients</strong>
                      <span className="legend-stats">
                        {stats.total_patients} users ({Math.round((stats.total_patients / stats.total_users) * 100)}%)
                      </span>
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color therapists-color"></span>
                    <span className="legend-text">
                      <strong>Therapists</strong>
                      <span className="legend-stats">
                        {stats.total_therapists} users ({Math.round((stats.total_therapists / stats.total_users) * 100)}%)
                      </span>
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color admins-color"></span>
                    <span className="legend-text">
                      <strong>Admins</strong>
                      <span className="legend-stats">
                        {stats.total_admins} users ({Math.round((stats.total_admins / stats.total_users) * 100)}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Role Summary - Bar Chart */}
            <div className="chart-card">
              <h3 className="chart-title">
                <FiActivity className="title-icon" />
                User Role Summary
              </h3>
              <div className="bar-chart">
                <div className="bar-item">
                  <div className="bar-header">
                    <div className="bar-label">
                      <span className="bar-icon patients-icon">👥</span>
                      <span>Patients</span>
                    </div>
                    <div className="bar-count">{stats.total_patients}</div>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill patients" 
                      style={{width: `${(stats.total_patients / stats.total_users) * 100}%`}}
                    >
                      <span className="bar-percentage">{Math.round((stats.total_patients / stats.total_users) * 100)}%</span>
                    </div>
                  </div>
                </div>
                <div className="bar-item">
                  <div className="bar-header">
                    <div className="bar-label">
                      <span className="bar-icon therapists-icon">🩺</span>
                      <span>Therapists</span>
                    </div>
                    <div className="bar-count">{stats.total_therapists}</div>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill therapists" 
                      style={{width: `${(stats.total_therapists / stats.total_users) * 100}%`}}
                    >
                      <span className="bar-percentage">{Math.round((stats.total_therapists / stats.total_users) * 100)}%</span>
                    </div>
                  </div>
                </div>
                <div className="bar-item">
                  <div className="bar-header">
                    <div className="bar-label">
                      <span className="bar-icon admins-icon">🛡️</span>
                      <span>Admins</span>
                    </div>
                    <div className="bar-count">{stats.total_admins}</div>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill admins" 
                      style={{width: `${(stats.total_admins / stats.total_users) * 100}%`}}
                    >
                      <span className="bar-percentage">{Math.round((stats.total_admins / stats.total_users) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data">No statistics available</div>
      )}
    </div>
  );

  // Helper function for pie chart
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const renderUserManagement = () => (
    <div className="user-management-section">
      <h2 className="section-title">User Management</h2>
      
      {/* Search and controls */}
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-search">Search</button>
        </div>
        
        <div className="per-page-selector">
          <label>Show:</label>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.email}</td>
                    <td>
                      {editingUserId === user.id ? (
                        <select 
                          value={editingRole} 
                          onChange={(e) => setEditingRole(e.target.value)}
                          className="role-select"
                        >
                          <option value="patient">Patient</option>
                          <option value="therapist">Therapist</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <div className="table-actions">
                        {editingUserId === user.id ? (
                          <>
                            <button 
                              onClick={() => saveRole(user.id)} 
                              className="btn-save"
                              title="Save"
                            >
                              <FiCheck />
                            </button>
                            <button 
                              onClick={cancelEdit} 
                              className="btn-cancel"
                              title="Cancel"
                            >
                              <FiX />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditRole(user.id, user.role)} 
                              className="btn-edit"
                              title="Edit Role"
                            >
                              Edit Role
                            </button>
                            <button 
                              onClick={() => confirmDelete(user.id, `${user.firstName} ${user.lastName}`)} 
                              className="btn-delete"
                              title="Delete User"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button 
              onClick={() => {
                console.log('Previous clicked - currentPage:', currentPage, 'totalPages:', totalPages, 'loading:', loading);
                setCurrentPage(prev => Math.max(1, prev - 1));
              }}
              disabled={currentPage === 1 || loading}
              style={{cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'}}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => {
                console.log('Next clicked - currentPage:', currentPage, 'totalPages:', totalPages, 'loading:', loading);
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
              }}
              disabled={currentPage >= totalPages || loading}
              style={{cursor: (currentPage >= totalPages || loading) ? 'not-allowed' : 'pointer'}}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!user) {
    return <div className="loading">Loading user data...</div>;
  }

  return (
    <>
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-container">
          <div className="admin-logo-group">
            <img src={images.logo} alt="CVAPed Logo" className="admin-header-logo" />
            <img src={images.cvacareText} alt="CVAPed" className="admin-header-text" />
            <span className="admin-badge">Admin Panel</span>
          </div>
          <div className="admin-header-actions">
            <span className="admin-user-name">
              {user.firstName} {user.lastName}
            </span>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-dashboard">
        {/* Main Content */}
        <div className="admin-content">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <nav className="sidebar-nav">
              <button
                className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span className="nav-icon">
                  <FiGrid />
                </span>
                <span className="nav-label">Overview</span>
              </button>
              
              <button
                className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <span className="nav-icon">
                  <FiUsers />
                </span>
                <span className="nav-label">User Management</span>
              </button>
            </nav>
          </aside>

          {/* Main Section */}
          <main className="admin-main">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUserManagement()}
          </main>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Confirm Delete</h3>
              <p className="modal-body">
                Are you sure you want to delete user <strong>{deleteConfirm.userName}</strong>? 
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="modal-btn modal-btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteUser} 
                  className="modal-btn modal-btn-confirm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminDashboard;
