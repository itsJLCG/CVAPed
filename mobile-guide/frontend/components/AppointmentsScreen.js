import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { appointmentAPI } from '../services/api';

const { width } = Dimensions.get('window');

const AppointmentsScreen = ({ onBack }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, upcoming, past

  // Book modal state
  const [showBookModal, setShowBookModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    therapy_type: 'articulation',
    preferred_date: new Date(),
    preferred_time: new Date(),
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [booking, setBooking] = useState(false);

  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await appointmentAPI.patient.getAppointments();
      if (response.success) {
        setAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, []);

  const handleBookAppointment = async () => {
    if (booking) return;

    // Validation
    const now = new Date();
    const selectedDate = new Date(newAppointment.preferred_date);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date.');
      return;
    }

    setBooking(true);
    try {
      // Combine date and time
      const date = newAppointment.preferred_date;
      const time = newAppointment.preferred_time;
      const appointmentDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      );

      const response = await appointmentAPI.patient.bookAppointment({
        therapy_type: newAppointment.therapy_type,
        appointment_date: appointmentDateTime.toISOString(),
        notes: newAppointment.notes,
      });

      if (response.success) {
        Alert.alert('Success', 'Appointment request sent successfully!');
        setShowBookModal(false);
        setNewAppointment({
          therapy_type: 'articulation',
          preferred_date: new Date(),
          preferred_time: new Date(),
          notes: '',
        });
        loadAppointments();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await appointmentAPI.patient.cancelAppointment(appointmentId);
              if (response.success) {
                Alert.alert('Success', 'Appointment cancelled successfully');
                loadAppointments();
                if (showDetailsModal) setShowDetailsModal(false);
              }
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    if (filter === 'upcoming') {
      return appointments.filter(
        (apt) =>
          new Date(apt.appointment_date) >= now &&
          apt.status !== 'cancelled' &&
          apt.status !== 'completed'
      );
    } else if (filter === 'past') {
      return appointments.filter(
        (apt) =>
          new Date(apt.appointment_date) < now ||
          apt.status === 'cancelled' ||
          apt.status === 'completed'
      );
    }
    return appointments;
  };

  const filteredAppointments = getFilteredAppointments();

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      scheduled: '#3b82f6',
      confirmed: '#10b981',
      completed: '#059669',
      cancelled: '#6b7280',
      'no-show': '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getTherapyIcon = (type) => {
    const icons = {
      articulation: '🗣️',
      language: '💬',
      fluency: '🎯',
      physical: '🏃',
    };
    return icons[type] || '📋';
  };

  const getTherapyColor = (type) => {
    const colors = {
      articulation: '#FF6B6B',
      language: '#4ECDC4',
      fluency: '#45B7D1',
      physical: '#96CEB4',
    };
    return colors[type] || '#999';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewAppointment({ ...newAppointment, preferred_date: selectedDate });
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setNewAppointment({ ...newAppointment, preferred_time: selectedTime });
    }
  };

  const therapyTypes = [
    { value: 'articulation', label: '🗣️ Articulation Therapy', color: '#FF6B6B' },
    { value: 'language', label: '💬 Language Therapy', color: '#4ECDC4' },
    { value: 'fluency', label: '🎯 Fluency Therapy', color: '#45B7D1' },
    { value: 'physical', label: '🏃 Physical Therapy', color: '#96CEB4' },
  ];

  // ==================== RENDER ====================

  const renderAppointmentCard = (appointment) => (
    <TouchableOpacity
      key={appointment._id}
      style={[styles.appointmentCard, { borderLeftColor: getTherapyColor(appointment.therapy_type) }]}
      onPress={() => {
        setSelectedAppointment(appointment);
        setShowDetailsModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.therapyTypeContainer}>
          <Text style={styles.therapyIcon}>{getTherapyIcon(appointment.therapy_type)}</Text>
          <Text style={styles.therapyName}>
            {appointment.therapy_type.charAt(0).toUpperCase() + appointment.therapy_type.slice(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardInfoRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text style={styles.cardInfoText}>{formatDate(appointment.appointment_date)}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Ionicons name="time-outline" size={16} color="#64748b" />
          <Text style={styles.cardInfoText}>{formatTime(appointment.appointment_date)}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Ionicons name="hourglass-outline" size={16} color="#64748b" />
          <Text style={styles.cardInfoText}>{appointment.duration || 60} min</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Ionicons name="person-outline" size={16} color="#64748b" />
          <Text style={styles.cardInfoText}>
            {appointment.therapist_name || 'Pending Assignment'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => {
            setSelectedAppointment(appointment);
            setShowDetailsModal(true);
          }}
        >
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
        {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelAppointment(appointment._id)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Appointments</Text>
          <Text style={styles.headerSubtitle}>View and manage your therapy appointments</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={() => setShowBookModal(true)}>
          <Ionicons name="add-circle" size={28} color="#C9302C" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({appointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'upcoming' && styles.filterBtnActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming ({appointments.filter((a) => new Date(a.appointment_date) >= new Date() && a.status !== 'cancelled' && a.status !== 'completed').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'past' && styles.filterBtnActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Past ({appointments.filter((a) => new Date(a.appointment_date) < new Date() || a.status === 'cancelled' || a.status === 'completed').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9302C" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : filteredAppointments.length > 0 ? (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9302C']} />
          }
        >
          {filteredAppointments.map(renderAppointmentCard)}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Appointments Found</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming'
              ? "You don't have any upcoming appointments."
              : filter === 'past'
              ? "You don't have any past appointments."
              : "You haven't booked any appointments yet."}
          </Text>
          <TouchableOpacity style={styles.emptyBookBtn} onPress={() => setShowBookModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyBookBtnText}>Book Your First Appointment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ==================== BOOK APPOINTMENT MODAL ==================== */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book New Appointment</Text>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Therapy Type */}
              <Text style={styles.formLabel}>
                Therapy Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.therapyTypeGrid}>
                {therapyTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.therapyTypeOption,
                      newAppointment.therapy_type === type.value && {
                        borderColor: type.color,
                        backgroundColor: type.color + '15',
                      },
                    ]}
                    onPress={() =>
                      setNewAppointment({ ...newAppointment, therapy_type: type.value })
                    }
                  >
                    <Text style={styles.therapyTypeOptionText}>{type.label}</Text>
                    {newAppointment.therapy_type === type.value && (
                      <Ionicons name="checkmark-circle" size={20} color={type.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Picker */}
              <Text style={styles.formLabel}>
                Preferred Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateTimeInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>
                  {newAppointment.preferred_date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={newAppointment.preferred_date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              {/* Time Picker */}
              <Text style={styles.formLabel}>
                Preferred Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateTimeInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>
                  {newAppointment.preferred_time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={newAppointment.preferred_time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              {/* Notes */}
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={newAppointment.notes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, notes: text })
                }
                placeholder="Any specific concerns or requirements..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoBoxText}>
                  Your appointment request must be approved by a therapist. Once approved, the
                  assigned therapist will handle your appointment at the scheduled time. You'll be
                  notified once a therapist is assigned.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowBookModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bookModalBtn, booking && styles.bookModalBtnDisabled]}
                onPress={handleBookAppointment}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={18} color="#fff" />
                    <Text style={styles.bookModalBtnText}>Request Appointment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== APPOINTMENT DETAILS MODAL ==================== */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Therapy Type */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Therapy Type</Text>
                  <View style={styles.detailValueRow}>
                    <Text style={styles.therapyIcon}>
                      {getTherapyIcon(selectedAppointment.therapy_type)}
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.therapy_type.charAt(0).toUpperCase() +
                        selectedAppointment.therapy_type.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Status */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadgeLarge,
                      { backgroundColor: getStatusColor(selectedAppointment.status) },
                    ]}
                  >
                    <Text style={styles.statusTextLarge}>
                      {selectedAppointment.status.charAt(0).toUpperCase() +
                        selectedAppointment.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {/* Time */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointment.appointment_date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Duration */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.duration || 60} minutes
                  </Text>
                </View>

                {/* Therapist */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Therapist</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.therapist_name || 'Pending Assignment'}
                  </Text>
                </View>

                {/* Pending Info */}
                {!selectedAppointment.therapist_name && (
                  <View style={styles.pendingInfoBox}>
                    <Ionicons name="hourglass" size={20} color="#f59e0b" />
                    <Text style={styles.pendingInfoText}>
                      Your appointment request is pending approval. Once a therapist approves and
                      assigns themselves, they will handle your appointment at the scheduled time.
                    </Text>
                  </View>
                )}

                {/* Confirmed Info */}
                {selectedAppointment.therapist_name &&
                  selectedAppointment.status === 'confirmed' && (
                    <View style={styles.confirmedInfoBox}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      <Text style={styles.confirmedInfoText}>
                        Your appointment has been approved!{' '}
                        <Text style={{ fontWeight: '700' }}>
                          {selectedAppointment.therapist_name}
                        </Text>{' '}
                        will be handling your appointment at the scheduled time.
                      </Text>
                    </View>
                  )}

                {/* Notes */}
                {selectedAppointment.notes ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValueNotes}>{selectedAppointment.notes}</Text>
                  </View>
                ) : null}

                {/* Booked On */}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Booked On</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAppointment.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Details Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Close</Text>
              </TouchableOpacity>
              {selectedAppointment &&
                selectedAppointment.status !== 'completed' &&
                selectedAppointment.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => handleCancelAppointment(selectedAppointment._id)}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.dangerBtnText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#C9302C',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  bookButton: {
    padding: 8,
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#C9302C',
    borderColor: '#C9302C',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9302C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyBookBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Appointment Card
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  therapyTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  therapyIcon: {
    fontSize: 20,
  },
  therapyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    gap: 6,
    marginBottom: 12,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },

  // Form
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#ef4444',
  },
  therapyTypeGrid: {
    gap: 8,
  },
  therapyTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  therapyTypeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dateTimeText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: 100,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    marginTop: 20,
    marginBottom: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 19,
  },

  // Modal Buttons
  cancelModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  bookModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#C9302C',
  },
  bookModalBtnDisabled: {
    opacity: 0.6,
  },
  bookModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Details
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValueNotes: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
  },
  statusBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    marginBottom: 16,
  },
  pendingInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 19,
  },
  confirmedInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    marginBottom: 16,
  },
  confirmedInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    lineHeight: 19,
  },
});

export default AppointmentsScreen;
