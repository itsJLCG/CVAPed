import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';

const { width } = Dimensions.get('window');

const AdminDashboard = ({ userData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'overview') {
        const statsResponse = await adminAPI.getStats(userData.token);
        if (statsResponse.success) {
          setStats(statsResponse);
        }
      } else if (activeTab === 'users') {
        const usersResponse = await adminAPI.getAllUsers(userData.token);
        if (usersResponse.success) {
          setUsers(usersResponse.users);
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', error.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  const handleDeleteUser = async (userId, userName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await adminAPI.deleteUser(userData.token, userId);
              if (response.success) {
                Alert.alert('Success', 'User deleted successfully');
                loadAdminData();
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setEditModalVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      const response = await adminAPI.updateUser(userData.token, selectedUser.id, {
        role: editingRole
      });
      
      if (response.success) {
        Alert.alert('Success', 'User role updated successfully');
        setEditModalVisible(false);
        setSelectedUser(null);
        loadAdminData();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update user role');
    }
  };

  const toggleUserDetails = (userId) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderOverview = () => {
    if (!stats) return null;

    const statsCards = [
      {
        id: 1,
        title: 'Total Users',
        value: stats.stats.total_users.toLocaleString(),
        icon: 'people',
        color: '#C9302C',
        bgColor: '#C9302C15',
        gradient: ['#C9302C', '#E85E5A']
      },
      {
        id: 2,
        title: 'Admin Users',
        value: stats.stats.admin_users.toLocaleString(),
        icon: 'shield-checkmark',
        color: '#8B4513',
        bgColor: '#8B451315',
        gradient: ['#8B4513', '#A0522D']
      },
      {
        id: 3,
        title: 'Verified Users',
        value: stats.stats.verified_users.toLocaleString(),
        icon: 'checkmark-circle',
        color: '#10B981',
        bgColor: '#10B98115',
        gradient: ['#10B981', '#34D399']
      },
      {
        id: 4,
        title: 'Patient Users',
        value: stats.stats.patient_users.toLocaleString(),
        icon: 'medical',
        color: '#3B82F6',
        bgColor: '#3B82F615',
        gradient: ['#3B82F6', '#60A5FA']
      },
      {
        id: 5,
        title: 'Speech Therapy',
        value: stats.stats.speech_users.toLocaleString(),
        icon: 'chatbubbles',
        color: '#F59E0B',
        bgColor: '#F59E0B15',
        gradient: ['#F59E0B', '#FBBF24']
      },
      {
        id: 6,
        title: 'Physical Therapy',
        value: stats.stats.physical_users.toLocaleString(),
        icon: 'fitness',
        color: '#8B5CF6',
        bgColor: '#8B5CF615',
        gradient: ['#8B5CF6', '#A78BFA']
      }
    ];

    const totalTherapy = stats.therapy_distribution.speech + stats.therapy_distribution.physical;
    const speechPercent = totalTherapy > 0 ? (stats.therapy_distribution.speech / totalTherapy) * 100 : 0;
    const physicalPercent = totalTherapy > 0 ? (stats.therapy_distribution.physical / totalTherapy) * 100 : 0;

    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9302C']} />
        }
      >
        {/* Hero Stats Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="analytics" size={32} color="#fff" />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroValue}>{stats.stats.total_users.toLocaleString()}</Text>
              <Text style={styles.heroLabel}>Total Active Users</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitleMain}>Platform Statistics</Text>
          <View style={styles.statsGrid}>
            {statsCards.map(stat => (
              <View key={stat.id} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.title}</Text>
                </View>
                <View style={[styles.statAccent, { backgroundColor: stat.color }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Therapy Distribution - Enhanced */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderEnhanced}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="pie-chart" size={22} color="#C9302C" />
              <Text style={styles.sectionTitle}>Therapy Distribution</Text>
            </View>
            <View style={styles.sectionBadgeEnhanced}>
              <Text style={styles.sectionBadgeText}>{totalTherapy} Total</Text>
            </View>
          </View>
          
          <View style={styles.distributionCard}>
            {/* Visual Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarSegment, { 
                width: `${speechPercent}%`, 
                backgroundColor: '#C9302C',
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8
              }]} />
              <View style={[styles.progressBarSegment, { 
                width: `${physicalPercent}%`, 
                backgroundColor: '#3B82F6',
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8
              }]} />
            </View>

            {/* Distribution Items */}
            <View style={styles.distributionContent}>
              <View style={styles.distributionItemEnhanced}>
                <View style={styles.distributionLeft}>
                  <View style={styles.distributionIconContainer}>
                    <Ionicons name="chatbubbles" size={20} color="#C9302C" />
                  </View>
                  <View>
                    <Text style={styles.distributionLabel}>Speech Therapy</Text>
                    <Text style={styles.distributionSubLabel}>Language & Communication</Text>
                  </View>
                </View>
                <View style={styles.distributionRight}>
                  <Text style={[styles.distributionValue, { color: '#C9302C' }]}>
                    {stats.therapy_distribution.speech}
                  </Text>
                  <Text style={styles.distributionPercent}>{speechPercent.toFixed(1)}%</Text>
                </View>
              </View>

              <View style={styles.distributionDivider} />

              <View style={styles.distributionItemEnhanced}>
                <View style={styles.distributionLeft}>
                  <View style={styles.distributionIconContainer}>
                    <Ionicons name="fitness" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={styles.distributionLabel}>Physical Therapy</Text>
                    <Text style={styles.distributionSubLabel}>Movement & Rehabilitation</Text>
                  </View>
                </View>
                <View style={styles.distributionRight}>
                  <Text style={[styles.distributionValue, { color: '#3B82F6' }]}>
                    {stats.therapy_distribution.physical}
                  </Text>
                  <Text style={styles.distributionPercent}>{physicalPercent.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* System Metrics - Enhanced */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderEnhanced}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="speedometer" size={22} color="#C9302C" />
              <Text style={styles.sectionTitle}>System Metrics</Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="checkmark-done" size={24} color="#10B981" />
              </View>
              <Text style={styles.metricValue}>
                {((stats.stats.verified_users / stats.stats.total_users) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Verification Rate</Text>
              <View style={styles.metricProgressBar}>
                <View style={[styles.metricProgress, { 
                  width: `${(stats.stats.verified_users / stats.stats.total_users) * 100}%`,
                  backgroundColor: '#10B981'
                }]} />
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#8B4513" />
              </View>
              <Text style={styles.metricValue}>
                {((stats.stats.admin_users / stats.stats.total_users) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Admin Coverage</Text>
              <View style={styles.metricProgressBar}>
                <View style={[styles.metricProgress, { 
                  width: `${(stats.stats.admin_users / stats.stats.total_users) * 100}%`,
                  backgroundColor: '#8B4513'
                }]} />
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Ionicons name="medical" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.metricValue}>
                {((stats.stats.patient_users / stats.stats.total_users) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Patient Users</Text>
              <View style={styles.metricProgressBar}>
                <View style={[styles.metricProgress, { 
                  width: `${(stats.stats.patient_users / stats.stats.total_users) * 100}%`,
                  backgroundColor: '#3B82F6'
                }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Recent Registrations - Enhanced */}
        {stats.recent_users && stats.recent_users.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderEnhanced}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="time" size={22} color="#C9302C" />
                <Text style={styles.sectionTitle}>Recent Registrations</Text>
              </View>
              <Text style={styles.sectionSubtitleEnhanced}>Last 5 users</Text>
            </View>
            <View style={styles.recentUsersContainer}>
              {stats.recent_users.slice(0, 5).map((user, index) => {
                const userName = user.name || 'Unknown User';
                const initials = userName.split(' ').filter(n => n).map(n => n[0]).join('').substring(0, 2);
                
                return (
                  <View key={index} style={styles.recentUserItem}>
                    <View style={styles.recentUserLeft}>
                      <View style={styles.recentUserAvatar}>
                        <Text style={styles.recentUserAvatarText}>
                          {initials || '??'}
                        </Text>
                      </View>
                      <View style={styles.recentUserInfo}>
                        <Text style={styles.recentUserName}>{userName}</Text>
                        <Text style={styles.recentUserEmail}>{user.email}</Text>
                      </View>
                    </View>
                    <View style={styles.recentUserMeta}>
                      {user.therapyType && (
                        <View style={[styles.miniTag, styles[`miniTag_${user.therapyType}`]]}>
                          <Ionicons 
                            name={user.therapyType === 'speech' ? 'chatbubbles' : 'fitness'} 
                            size={10} 
                            color={user.therapyType === 'speech' ? '#F59E0B' : '#8B5CF6'} 
                          />
                          <Text style={styles.miniTagText}>{user.therapyType}</Text>
                        </View>
                      )}
                      <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={10} color="#999" />
                        <Text style={styles.recentUserDate}>{formatDate(user.joinedAt)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  const renderUsers = () => {
    const filteredUsersData = users.filter(user =>
      (user.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.therapyType?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.resultsCount}>
          Showing {filteredUsersData.length} of {users.length} users
        </Text>

        <ScrollView
          style={styles.usersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9302C']} />
          }
        >
          {filteredUsersData.map((user) => {
            const isExpanded = expandedUserId === user.id;
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
            const initials = `${firstName.charAt(0) || '?'}${lastName.charAt(0) || '?'}`;

            return (
              <View key={user.id} style={styles.userCard}>
                <TouchableOpacity
                  style={styles.userCardHeader}
                  onPress={() => toggleUserDetails(user.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userCardLeft}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {initials}
                      </Text>
                    </View>
                    <View style={styles.userCardInfo}>
                      <Text style={styles.userName}>{fullName}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.userTags}>
                        <View style={[styles.badge, styles[`badge_${user.role}`]]}>
                          <Text style={styles.badgeText}>{user.role}</Text>
                        </View>
                        {user.therapyType !== 'N/A' && (
                          <View style={[styles.badge, styles[`badge_${user.therapyType}`]]}>
                            <Text style={styles.badgeText}>{user.therapyType}</Text>
                          </View>
                        )}
                        {user.isVerified && (
                          <View style={[styles.badge, styles.badge_verified]}>
                            <Ionicons name="checkmark-circle" size={12} color="#27ae60" />
                            <Text style={[styles.badgeText, { color: '#27ae60' }]}>Verified</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#999"
                  />
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.userCardBody}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Basic Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>User ID:</Text>
                        <Text style={styles.detailValue}>{user.id}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{user.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Verified:</Text>
                        <Text style={[styles.detailValue, user.isVerified ? styles.textGreen : styles.textRed]}>
                          {user.isVerified ? 'Yes ✓' : 'No ✗'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Patient Type:</Text>
                        <Text style={styles.detailValue}>{user.patientType || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Joined:</Text>
                        <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                      </View>
                    </View>

                    {/* Child Info (for Physical Therapy) */}
                    {user.childInfo && Object.keys(user.childInfo).length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Child Information</Text>
                        {user.childInfo.name && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Name:</Text>
                            <Text style={styles.detailValue}>{user.childInfo.name}</Text>
                          </View>
                        )}
                        {user.childInfo.age && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Age:</Text>
                            <Text style={styles.detailValue}>{user.childInfo.age}</Text>
                          </View>
                        )}
                        {user.childInfo.condition && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Condition:</Text>
                            <Text style={styles.detailValue}>{user.childInfo.condition}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Parent Info */}
                    {user.parentInfo && Object.keys(user.parentInfo).length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Parent/Guardian Information</Text>
                        {user.parentInfo.name && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Name:</Text>
                            <Text style={styles.detailValue}>{user.parentInfo.name}</Text>
                          </View>
                        )}
                        {user.parentInfo.phone && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>{user.parentInfo.phone}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Patient Info (for Speech Therapy) */}
                    {user.patientInfo && Object.keys(user.patientInfo).length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Patient Information</Text>
                        {user.patientInfo.name && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Name:</Text>
                            <Text style={styles.detailValue}>{user.patientInfo.name}</Text>
                          </View>
                        )}
                        {user.patientInfo.phone && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>{user.patientInfo.phone}</Text>
                          </View>
                        )}
                        {user.patientInfo.age && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Age:</Text>
                            <Text style={styles.detailValue}>{user.patientInfo.age}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditUser(user)}
                      >
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Edit Role</Text>
                      </TouchableOpacity>
                      {user.role !== 'admin' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButtonAction]}
                          onPress={() => handleDeleteUser(user.id, fullName)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {filteredUsersData.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {searchTerm ? 'No users found matching your search' : 'No users available'}
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {userData?.firstName}!</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#C9302C" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'overview' ? '#C9302C' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? '#C9302C' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Users
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9302C" />
          <Text style={styles.loadingText}>Loading admin data...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
        </>
      )}

      {/* Role Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User Role</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalBody}>
                <View style={styles.userInfoModal}>
                  <View style={styles.userAvatarModal}>
                    <Text style={styles.userAvatarText}>
                      {(selectedUser.firstName?.charAt(0) || '?')}{(selectedUser.lastName?.charAt(0) || '?')}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.modalUserName}>
                      {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || 'Unknown User'}
                    </Text>
                    <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                  </View>
                </View>

                <View style={styles.roleSelector}>
                  <Text style={styles.roleSelectorLabel}>Select New Role:</Text>
                  <View style={styles.roleOptions}>
                    {['admin', 'patient', 'therapist'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          editingRole === role && styles.roleOptionSelected
                        ]}
                        onPress={() => setEditingRole(role)}
                      >
                        <View style={[
                          styles.roleRadio,
                          editingRole === role && styles.roleRadioSelected
                        ]}>
                          {editingRole === role && (
                            <View style={styles.roleRadioInner} />
                          )}
                        </View>
                        <Text style={[
                          styles.roleOptionText,
                          editingRole === role && styles.roleOptionTextSelected
                        ]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleUpdateRole}
                  >
                    <Text style={styles.modalButtonTextSave}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#C9302C',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#C9302C',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  distributionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  distributionLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
  },
  activityName: {
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    margin: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  resultsCount: {
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  userTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badge_admin: {
    backgroundColor: '#ce363015',
  },
  badge_patient: {
    backgroundColor: '#479ac315',
  },
  badge_therapist: {
    backgroundColor: '#27ae6015',
  },
  badge_speech: {
    backgroundColor: '#e8b04e15',
  },
  badge_physical: {
    backgroundColor: '#9b59b615',
  },
  badge_verified: {
    backgroundColor: '#27ae6015',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  // ===== ENHANCED OVERVIEW STYLES =====
  // Hero Section
  heroSection: {
    padding: 15,
    paddingTop: 20,
  },
  heroCard: {
    backgroundColor: '#C9302C',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#C9302C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  heroContent: {
    flex: 1,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // Stats Section
  statsSection: {
    padding: 15,
  },
  sectionTitleMain: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  statAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  // Distribution Enhanced
  sectionHeaderEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBadgeEnhanced: {
    backgroundColor: '#C9302C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarSegment: {
    height: '100%',
  },
  distributionContent: {
    gap: 0,
  },
  distributionItemEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  distributionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  distributionSubLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  distributionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 54) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 12,
  },
  metricProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  metricProgress: {
    height: '100%',
    borderRadius: 2,
  },
  // Recent Users Enhanced
  sectionSubtitleEnhanced: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  recentUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  // Enhanced Overview Styles (original section preserved)
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  sectionBadge: {
    backgroundColor: '#C9302C15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  distributionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distributionPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  recentUsersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recentUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentUserAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentUserInfo: {
    flex: 1,
  },
  recentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  recentUserEmail: {
    fontSize: 12,
    color: '#999',
  },
  recentUserMeta: {
    alignItems: 'flex-end',
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  miniTag_speech: {
    backgroundColor: '#e8b04e15',
  },
  miniTag_physical: {
    backgroundColor: '#9b59b615',
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  recentUserDate: {
    fontSize: 10,
    color: '#999',
  },
  // Enhanced User Card Styles
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardBody: {
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    width: '35%',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '400',
    width: '60%',
    textAlign: 'left',
  },
  textGreen: {
    color: '#27ae60',
  },
  textRed: {
    color: '#e74c3c',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButtonAction: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  roleTag_admin: {
    backgroundColor: '#ce363015',
  },
  roleTag_patient: {
    backgroundColor: '#479ac315',
  },
  roleTag_therapist: {
    backgroundColor: '#27ae6015',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  therapyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  therapyTag_speech: {
    backgroundColor: '#e8b04e15',
  },
  therapyTag_physical: {
    backgroundColor: '#9b59b615',
  },
  therapyTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  userCountContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  userCountText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalBody: {
    padding: 20,
  },
  userInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  userAvatarModal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9302C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  modalUserEmail: {
    fontSize: 13,
    color: '#666',
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  roleOptions: {
    gap: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  roleOptionSelected: {
    borderColor: '#C9302C',
    backgroundColor: '#C9302C05',
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleRadioSelected: {
    borderColor: '#C9302C',
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C9302C',
  },
  roleOptionText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: '#C9302C',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSave: {
    backgroundColor: '#C9302C',
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextSave: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AdminDashboard;
