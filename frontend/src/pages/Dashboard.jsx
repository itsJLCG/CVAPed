import React, { useState, useEffect } from 'react';
import { authService, appointmentService } from '../services/api';
import { useToast } from '../components/ToastContext';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    therapist_id: '',
    therapy_type: 'articulation',
    appointment_date: '',
    duration: 60,
    notes: ''
  });
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (!cancelled) setUser(storedUser);
      } catch (error) {
        if (!cancelled) console.error('Error loading user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }

      setLoadingAppointments(true);
      try {
        const response = await appointmentService.patient.getAppointments();
        if (!cancelled && response.success) setAppointments(response.appointments || []);
      } catch (error) {
        if (!cancelled) console.error('Error loading appointments:', error);
      } finally {
        if (!cancelled) setLoadingAppointments(false);
      }

      try {
        const response = await appointmentService.getAvailableTherapists();
        if (!cancelled && response.success) setTherapists(response.therapists || []);
      } catch (error) {
        if (!cancelled) console.error('Error loading therapists:', error);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const handleBookAppointment = async () => {
    try {
      if (!newAppointment.therapist_id) {
        toast.error('Please select a therapist');
        return;
      }
      if (!newAppointment.appointment_date) {
        toast.error('Please select date and time');
        return;
      }

      const response = await appointmentService.patient.bookAppointment({
        ...newAppointment,
        appointment_date: new Date(newAppointment.appointment_date).toISOString()
      });

      if (response.success) {
        toast.success('Appointment booked successfully!');
        setShowBookingModal(false);
        loadAppointments();
        setNewAppointment({
          therapist_id: '',
          therapy_type: 'articulation',
          appointment_date: '',
          duration: 60,
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await appointmentService.patient.cancelAppointment(appointmentId, 'Cancelled by patient');
      if (response.success) {
        toast.success('Appointment cancelled successfully');
        loadAppointments();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.info('Logged out successfully. See you soon!');
    onLogout();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>CVACare</h1>
            <p>Physical & Speech Therapy</p>
          </div>
          <div className="navbar-menu">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <button className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back, {user?.firstName}! 👋</h2>
          <p className="user-type-badge">
            Role: <span className="badge">{user?.role}</span>
          </p>
        </div>

        <div className="info-cards">
          <div className="info-card card-primary">
            <div className="card-icon">🏥</div>
            <h3>Physical Therapy</h3>
            <p>Specialized care for stroke patients with comprehensive rehabilitation programs</p>
          </div>

          <div className="info-card card-secondary">
            <div className="card-icon">💬</div>
            <h3>Speech Therapy</h3>
            <p>Pediatric speech therapy services for children's communication development</p>
          </div>

          <div className="info-card card-accent">
            <div className="card-icon">📊</div>
            <h3>Progress Tracking</h3>
            <p>Monitor patient progress and therapy outcomes with detailed analytics</p>
          </div>

          <div className="info-card card-appointments" onClick={() => setShowBookingModal(true)} style={{ cursor: 'pointer' }}>
            <div className="card-icon">📅</div>
            <h3>Book Appointment</h3>
            <p>Schedule therapy sessions with our qualified therapists</p>
          </div>
        </div>

        {/* My Appointments Section */}
        <div className="appointments-section">
          <div className="section-header">
            <h3>My Appointments</h3>
            <button className="btn btn-primary" onClick={() => setShowBookingModal(true)}>
              📅 Book New Appointment
            </button>
          </div>

          {loadingAppointments ? (
            <div className="loading-message">Loading appointments...</div>
          ) : appointments.length > 0 ? (
            <div className="appointments-list">
              {appointments
                .filter(apt => apt.status !== 'cancelled')
                .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                .map((appointment) => (
                  <div key={appointment._id} className={`appointment-item status-${appointment.status}`}>
                    <div className="appointment-info">
                      <div className="appointment-therapy-type" data-type={appointment.therapy_type}>
                        {appointment.therapy_type === 'articulation' && '🗣️'}
                        {appointment.therapy_type === 'language' && '💬'}
                        {appointment.therapy_type === 'fluency' && '🎯'}
                        {appointment.therapy_type === 'physical' && '🏃'}
                        <span>{appointment.therapy_type.charAt(0).toUpperCase() + appointment.therapy_type.slice(1)}</span>
                      </div>
                      <div className="appointment-details-patient">
                        <div className="appointment-date">
                          <strong>📅 {new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}</strong>
                          <span className="appointment-time">
                            🕒 {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} • {appointment.duration} min
                          </span>
                        </div>
                        <div className="appointment-therapist">
                          <strong>Therapist:</strong> {appointment.therapist_name}
                        </div>
                        {appointment.notes && (
                          <div className="appointment-notes-patient">
                            <strong>Notes:</strong> {appointment.notes}
                          </div>
                        )}
                      </div>
                      <div className={`appointment-status status-${appointment.status}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </div>
                    </div>
                    {appointment.status === 'scheduled' || appointment.status === 'confirmed' ? (
                      <button 
                        className="btn btn-cancel-appointment"
                        onClick={() => handleCancelAppointment(appointment._id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : (
            <div className="no-appointments">
              <p>📅 No appointments scheduled yet</p>
              <button className="btn btn-primary" onClick={() => setShowBookingModal(true)}>
                Book Your First Appointment
              </button>
            </div>
          )}
        </div>

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
            <div className="modal-content booking-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Book an Appointment</h3>
                <button className="modal-close" onClick={() => setShowBookingModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Therapist <span className="required">*</span></label>
                  <select
                    value={newAppointment.therapist_id}
                    onChange={(e) => setNewAppointment({ ...newAppointment, therapist_id: e.target.value })}
                  >
                    <option value="">Select a therapist</option>
                    {therapists.map((therapist) => (
                      <option key={therapist._id} value={therapist._id}>
                        {therapist.firstName} {therapist.lastName} - {therapist.therapyType || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Therapy Type <span className="required">*</span></label>
                  <select
                    value={newAppointment.therapy_type}
                    onChange={(e) => setNewAppointment({ ...newAppointment, therapy_type: e.target.value })}
                  >
                    <option value="articulation">🗣️ Articulation</option>
                    <option value="language">💬 Language</option>
                    <option value="fluency">🎯 Fluency</option>
                    <option value="physical">🏃 Physical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date & Time <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    value={newAppointment.appointment_date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <select
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration: parseInt(e.target.value) })}
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    placeholder="Add any special requirements or notes..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleBookAppointment}>
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="user-info-section">
          <h3>Your Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{user?.role}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value status-active">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
