const Appointment = require('../models/Appointment');
const User = require('../models/User');

// ==================== THERAPIST ENDPOINTS ====================

// @desc    Get all appointments for the logged-in therapist
// @route   GET /api/therapist/appointments
// @access  Private (Therapist only)
exports.getTherapistAppointments = async (req, res) => {
  try {
    const therapistId = req.user._id;

    // Get query parameters for filtering
    const { date, status, therapy_type } = req.query;

    // Build query
    const query = { therapist_id: therapistId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointment_date = { $gte: startDate, $lt: endDate };
    }

    if (status) {
      query.status = status;
    }

    if (therapy_type) {
      query.therapy_type = therapy_type;
    }

    const appointments = await Appointment.find(query).sort({ appointment_date: 1 });

    return res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('❌ Error fetching therapist appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
};

// @desc    Get unassigned/pending appointments
// @route   GET /api/therapist/appointments/unassigned
// @access  Private (Therapist only)
exports.getUnassignedAppointments = async (req, res) => {
  try {
    const { therapy_type } = req.query;

    // Build query for pending appointments without therapist
    const query = {
      $or: [
        { therapist_id: null },
        { therapist_id: { $exists: false } },
        { status: 'pending' }
      ]
    };

    if (therapy_type) {
      query.therapy_type = therapy_type;
    }

    const appointments = await Appointment.find(query).sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('❌ Error fetching unassigned appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned appointments',
      error: error.message
    });
  }
};

// @desc    Assign therapist to an appointment
// @route   PUT /api/therapist/appointments/:id/assign
// @access  Private (Therapist only)
exports.assignToAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const therapistId = req.user._id;

    // Get the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if appointment already has a therapist
    if (appointment.therapist_id && appointment.therapist_id.toString() !== therapistId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already assigned to another therapist'
      });
    }

    // Update appointment with therapist info
    const therapistName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    const therapistEmail = req.user.email || '';

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        therapist_id: therapistId,
        therapist_name: therapistName,
        therapist_email: therapistEmail,
        status: 'confirmed',
        approved: true,
        approved_at: new Date(),
        approved_by: therapistId,
        updated_at: new Date()
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Successfully assigned to appointment',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('❌ Error assigning therapist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign therapist',
      error: error.message
    });
  }
};

// @desc    Create a new appointment (therapist side)
// @route   POST /api/therapist/appointments
// @access  Private (Therapist only)
exports.createTherapistAppointment = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { patient_id, appointment_date, therapy_type, duration, notes } = req.body;

    // Validate required fields
    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }
    if (!appointment_date) {
      return res.status(400).json({ success: false, message: 'Appointment date is required' });
    }
    if (!therapy_type) {
      return res.status(400).json({ success: false, message: 'Therapy type is required' });
    }

    // Validate therapy type
    const validTypes = ['articulation', 'language', 'fluency', 'physical'];
    if (!validTypes.includes(therapy_type)) {
      return res.status(400).json({ success: false, message: 'Invalid therapy type' });
    }

    // Get patient info
    const patient = await User.findById(patient_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Parse appointment date
    const parsedDate = new Date(appointment_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use ISO 8601 format' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient_id,
      therapist_id: therapistId,
      therapy_type,
      appointment_date: parsedDate,
      duration: duration || 60,
      status: 'confirmed', // Therapist-created appointments are auto-confirmed
      approved: true,
      approved_at: new Date(),
      approved_by: therapistId,
      notes: notes || '',
      patient_name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      patient_email: patient.email || '',
      therapist_name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      therapist_email: req.user.email || '',
      reminder_sent: false
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message
    });
  }
};

// @desc    Update an existing appointment
// @route   PUT /api/therapist/appointments/:id
// @access  Private (Therapist only)
exports.updateTherapistAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const therapistId = req.user._id;

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      therapist_id: therapistId
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Build update object
    const updateDoc = { updated_at: new Date() };

    if (req.body.appointment_date) {
      const parsedDate = new Date(req.body.appointment_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
      updateDoc.appointment_date = parsedDate;
    }

    if (req.body.duration !== undefined) {
      updateDoc.duration = parseInt(req.body.duration);
    }

    if (req.body.status) {
      const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      updateDoc.status = req.body.status;
    }

    if (req.body.notes !== undefined) {
      updateDoc.notes = req.body.notes;
    }

    if (req.body.session_summary !== undefined) {
      updateDoc.session_summary = req.body.session_summary;
    }

    if (req.body.cancellation_reason !== undefined) {
      updateDoc.cancellation_reason = req.body.cancellation_reason;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { $set: updateDoc },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
};

// @desc    Cancel/delete an appointment
// @route   DELETE /api/therapist/appointments/:id
// @access  Private (Therapist only)
exports.deleteTherapistAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const therapistId = req.user._id;

    const result = await Appointment.findOneAndUpdate(
      { _id: appointmentId, therapist_id: therapistId },
      { $set: { status: 'cancelled', updated_at: new Date() } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// @desc    Search patients by name (for therapist autocomplete)
// @route   GET /api/therapist/patients/search
// @access  Private (Therapist only)
exports.searchPatients = async (req, res) => {
  try {
    const searchQuery = (req.query.query || '').trim();
    const limit = parseInt(req.query.limit) || 10;

    if (!searchQuery) {
      return res.status(200).json({ success: true, patients: [] });
    }

    const regex = new RegExp(searchQuery, 'i');

    const patients = await User.find(
      {
        role: 'patient',
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex }
        ]
      },
      {
        firstName: 1,
        lastName: 1,
        email: 1,
        age: 1,
        gender: 1,
        therapyType: 1,
        patientType: 1
      }
    ).limit(limit);

    const formatted = patients.map(p => ({
      ...p.toObject(),
      fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim()
    }));

    return res.status(200).json({
      success: true,
      patients: formatted
    });
  } catch (error) {
    console.error('❌ Error searching patients:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search patients',
      error: error.message
    });
  }
};

// ==================== PATIENT ENDPOINTS ====================

// @desc    Get all appointments for the logged-in patient
// @route   GET /api/patient/appointments
// @access  Private
exports.getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { status } = req.query;

    const query = { patient_id: patientId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query).sort({ appointment_date: 1 });

    return res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('❌ Error fetching patient appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
};

// @desc    Book a new appointment (patient side)
// @route   POST /api/patient/appointments/book
// @access  Private
exports.bookPatientAppointment = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { appointment_date, therapy_type, therapist_id, duration, notes } = req.body;

    // Validate required fields
    if (!appointment_date) {
      return res.status(400).json({ success: false, message: 'Appointment date is required' });
    }
    if (!therapy_type) {
      return res.status(400).json({ success: false, message: 'Therapy type is required' });
    }

    // Validate therapy type
    const validTypes = ['articulation', 'language', 'fluency', 'physical'];
    if (!validTypes.includes(therapy_type)) {
      return res.status(400).json({ success: false, message: 'Invalid therapy type' });
    }

    // Parse appointment date
    const parsedDate = new Date(appointment_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use ISO 8601 format' });
    }

    // Build appointment data
    const appointmentData = {
      patient_id: patientId,
      therapist_id: therapist_id || null,
      therapy_type,
      appointment_date: parsedDate,
      duration: duration || 60,
      status: therapist_id ? 'scheduled' : 'pending',
      notes: notes || '',
      patient_name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      patient_email: req.user.email || '',
      therapist_name: null,
      therapist_email: null,
      reminder_sent: false
    };

    // If therapist is specified, get therapist info
    if (therapist_id) {
      const therapist = await User.findOne({ _id: therapist_id, role: 'therapist' });
      if (therapist) {
        appointmentData.therapist_name = `${therapist.firstName || ''} ${therapist.lastName || ''}`.trim();
        appointmentData.therapist_email = therapist.email || '';
      }
    }

    const appointment = await Appointment.create(appointmentData);

    return res.status(201).json({
      success: true,
      message: therapist_id
        ? 'Appointment booked successfully'
        : 'Appointment request submitted successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error booking appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message
    });
  }
};

// @desc    Cancel an appointment (patient side)
// @route   PUT /api/patient/appointments/:id/cancel
// @access  Private
exports.cancelPatientAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const patientId = req.user._id;
    const { reason } = req.body;

    const result = await Appointment.findOneAndUpdate(
      { _id: appointmentId, patient_id: patientId },
      {
        $set: {
          status: 'cancelled',
          cancellation_reason: reason || 'Cancelled by patient',
          updated_at: new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// ==================== SHARED ENDPOINTS ====================

// @desc    Get available therapists
// @route   GET /api/therapists/available
// @access  Private
exports.getAvailableTherapists = async (req, res) => {
  try {
    const { therapy_type } = req.query;

    const query = { role: 'therapist' };
    if (therapy_type) {
      query.therapyType = therapy_type;
    }

    const therapists = await User.find(query, {
      firstName: 1,
      lastName: 1,
      email: 1,
      therapyType: 1
    });

    return res.status(200).json({
      success: true,
      therapists
    });
  } catch (error) {
    console.error('❌ Error fetching available therapists:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch therapists',
      error: error.message
    });
  }
};
