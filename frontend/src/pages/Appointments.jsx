import React, { useState, useEffect } from 'react';
import { appointmentService } from '../services/api';
import Header from '../components/Header';
import './Appointments.css';

function Appointments({ onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    therapy_type: 'articulation',
    preferred_date: '',
    preferred_time: '',
    notes: ''
  });
  const [filter, setFilter] = useState('all'); // all, upcoming, past

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await appointmentService.patient.getAppointments();
        if (!cancelled && response.success) {
          setAppointments(response.appointments || []);
        }
      } catch (error) {
        if (!cancelled) console.error('Error loading appointments:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const handleBookAppointment = async () => {
    try {
      // Combine date and time
      const appointmentDateTime = `${newAppointment.preferred_date}T${newAppointment.preferred_time}`;
      
      const response = await appointmentService.patient.bookAppointment({
        therapy_type: newAppointment.therapy_type,
        appointment_date: appointmentDateTime,
        notes: newAppointment.notes
      });

      if (response.success) {
        alert('Appointment request sent successfully!');
        setShowBookModal(false);
        setNewAppointment({
          therapy_type: 'articulation',
          preferred_date: '',
          preferred_time: '',
          notes: ''
        });
        loadAppointments();
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await appointmentService.patient.cancelAppointment(appointmentId);
      if (response.success) {
        alert('Appointment cancelled successfully');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    
    if (filter === 'upcoming') {
      return appointments.filter(apt => 
        new Date(apt.appointment_date) >= now && 
        apt.status !== 'cancelled' && 
        apt.status !== 'completed'
      );
    } else if (filter === 'past') {
      return appointments.filter(apt => 
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
      'no-show': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getTherapyIcon = (type) => {
    const icons = {
      articulation: '🗣️',
      language: '💬',
      fluency: '🎯',
      physical: '🏃'
    };
    return icons[type] || '📋';
  };

  return (
    <>
      <Header onLogout={onLogout} />
      <div className="appointments-page">
        <div className="appointments-container">
          {/* Header */}
          <div className="appointments-header">
            <div className="header-content">
              <h1>My Appointments</h1>
              <p>View and manage your therapy appointments</p>
            </div>
            <button className="btn-book-appointment" onClick={() => setShowBookModal(true)}>
              <span>📅</span> Book New Appointment
          </button>
        </div>

        {/* Filters */}
        <div className="appointments-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Appointments ({appointments.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming ({appointments.filter(apt => 
              new Date(apt.appointment_date) >= new Date() && 
              apt.status !== 'cancelled' && 
              apt.status !== 'completed'
            ).length})
          </button>
          <button 
            className={`filter-btn ${filter === 'past' ? 'active' : ''}`}
            onClick={() => setFilter('past')}
          >
            Past ({appointments.filter(apt => 
              new Date(apt.appointment_date) < new Date() || 
              apt.status === 'cancelled' || 
              apt.status === 'completed'
            ).length})
          </button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading appointments...</p>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="appointments-table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Therapy Type</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Therapist</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment._id} className={`appointment-row status-${appointment.status}`}>
                    <td>
                      <div className="therapy-type-cell">
                        <span className="therapy-icon">{getTherapyIcon(appointment.therapy_type)}</span>
                        <span className="therapy-name">
                          {appointment.therapy_type.charAt(0).toUpperCase() + appointment.therapy_type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="datetime-cell">
                        <span className="date">
                          {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="time">
                          {new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="duration">{appointment.duration || 60} min</span>
                    </td>
                    <td>
                      <div className="therapist-cell">
                        {appointment.therapist_name ? (
                          <>
                            <div className="therapist-avatar">
                              {appointment.therapist_name.charAt(0)}
                            </div>
                            <span>{appointment.therapist_name}</span>
                          </>
                        ) : (
                          <span className="pending-assignment">Pending Assignment</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(appointment.status) }}
                      >
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-action btn-view"
                          onClick={() => handleViewDetails(appointment)}
                          title="View Details"
                        >
                          View
                        </button>
                        {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                          <button 
                            className="btn-action btn-cancel"
                            onClick={() => handleCancelAppointment(appointment._id)}
                            title="Cancel Appointment"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-appointments">
            <div className="no-appointments-icon">📅</div>
            <h3>No Appointments Found</h3>
            <p>
              {filter === 'upcoming' 
                ? "You don't have any upcoming appointments." 
                : filter === 'past'
                ? "You don't have any past appointments."
                : "You haven't booked any appointments yet."}
            </p>
            <button className="btn-book-primary" onClick={() => setShowBookModal(true)}>
              Book Your First Appointment
            </button>
          </div>
        )}

        {/* Book Appointment Modal */}
        {showBookModal && (
          <div className="modal-overlay" onClick={() => setShowBookModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Book New Appointment</h2>
                <button className="modal-close" onClick={() => setShowBookModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Therapy Type <span className="required">*</span></label>
                  <select
                    value={newAppointment.therapy_type}
                    onChange={(e) => setNewAppointment({ ...newAppointment, therapy_type: e.target.value })}
                  >
                    <option value="articulation">🗣️ Articulation Therapy</option>
                    <option value="language">💬 Language Therapy</option>
                    <option value="fluency">🎯 Fluency Therapy</option>
                    <option value="physical">🏃 Physical Therapy</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Preferred Date <span className="required">*</span></label>
                    <input
                      type="date"
                      value={newAppointment.preferred_date}
                      onChange={(e) => setNewAppointment({ ...newAppointment, preferred_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Time <span className="required">*</span></label>
                    <input
                      type="time"
                      value={newAppointment.preferred_time}
                      onChange={(e) => setNewAppointment({ ...newAppointment, preferred_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    placeholder="Any specific concerns or requirements..."
                    rows="4"
                  />
                </div>

                <div className="info-box">
                  <strong>ℹ️ Important:</strong> Your appointment request must be approved by a therapist. 
                  Once approved, the assigned therapist will handle your appointment at the scheduled time. 
                  You'll be notified once a therapist is assigned and approves your request.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowBookModal(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleBookAppointment}
                  disabled={!newAppointment.preferred_date || !newAppointment.preferred_time}
                >
                  Request Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Appointment Details</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Therapy Type</label>
                    <div className="detail-value">
                      <span className="therapy-icon">{getTherapyIcon(selectedAppointment.therapy_type)}</span>
                      {selectedAppointment.therapy_type.charAt(0).toUpperCase() + selectedAppointment.therapy_type.slice(1)}
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Status</label>
                    <div className="detail-value">
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(selectedAppointment.status) }}
                      >
                        {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Date</label>
                    <div className="detail-value">
                      {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Time</label>
                    <div className="detail-value">
                      {new Date(selectedAppointment.appointment_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Duration</label>
                    <div className="detail-value">{selectedAppointment.duration || 60} minutes</div>
                  </div>

                  <div className="detail-item">
                    <label>Therapist</label>
                    <div className="detail-value">
                      {selectedAppointment.therapist_name || (
                        <span className="pending-text">Pending Assignment</span>
                      )}
                    </div>
                  </div>

                  {!selectedAppointment.therapist_name && (
                    <div className="detail-item full-width">
                      <div className="info-box-detail">
                        <strong>⏳ Status:</strong> Your appointment request is pending approval. 
                        Once a therapist approves and assigns themselves, they will handle your appointment at the scheduled time.
                      </div>
                    </div>
                  )}

                  {selectedAppointment.therapist_name && selectedAppointment.status === 'confirmed' && (
                    <div className="detail-item full-width">
                      <div className="info-box-success">
                        <strong>Confirmed:</strong> Your appointment has been approved! 
                        <strong>{selectedAppointment.therapist_name}</strong> will be handling your appointment at the scheduled time.
                      </div>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div className="detail-item full-width">
                      <label>Notes</label>
                      <div className="detail-value notes">{selectedAppointment.notes}</div>
                    </div>
                  )}

                  <div className="detail-item">
                    <label>Booked On</label>
                    <div className="detail-value">
                      {new Date(selectedAppointment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
                {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                  <button 
                    className="btn-danger" 
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleCancelAppointment(selectedAppointment._id);
                    }}
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

export default Appointments;
