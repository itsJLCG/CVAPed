const FacilityDiagnostic = require('../models/FacilityDiagnostic');
const ArticulationProgress = require('../models/ArticulationProgress');
const FluencyProgress = require('../models/FluencyProgress');
const LanguageProgress = require('../models/LanguageProgress');
const GaitProgress = require('../models/GaitProgress');
const User = require('../models/User');

/**
 * Diagnostic Comparison Controller
 * Mirrors the web backend's Compare / Validate feature (app.py lines 4269-4908).
 *
 * Endpoints:
 *  - createFacilityDiagnostic   (POST)
 *  - getFacilityDiagnostics     (GET  list)
 *  - updateFacilityDiagnostic   (PUT)
 *  - deleteFacilityDiagnostic   (DELETE)
 *  - getDiagnosticComparison    (GET  computed comparison)
 *  - getComparisonHistory       (GET  historical diagnostics for trends)
 *  - getPatientOwnComparison    (GET  patient read-only)
 */

// ────────────────────────────────────────
// Helper: validate a numeric score 0-100
// ────────────────────────────────────────
const validateScore = (val, fieldName) => {
  if (val === null || val === undefined || val === '') return { valid: true, value: null };
  const num = Number(val);
  if (isNaN(num)) return { valid: false, message: `${fieldName} must be a number` };
  if (num < 0 || num > 100) return { valid: false, message: `${fieldName} must be between 0 and 100` };
  return { valid: true, value: num };
};

// ────────────────────────────────────────
// Helper: aggregate at-home scores
//   Same logic the web backend uses to pull
//   mastery / accuracy values from progress
//   collections and convert to 0-100 scale.
// ────────────────────────────────────────
const aggregateHomeScores = async (userId) => {
  const homeScores = {};

  // ─── Articulation ───
  const articulationProgress = await ArticulationProgress.find({ user_id: userId });
  const artScores = {};
  for (const prog of articulationProgress) {
    const sound = prog.sound_id || '';
    if (!sound) continue;
    const mastery = prog.overall_mastery || 0;
    artScores[sound] = mastery <= 1 ? Math.round(mastery * 1000) / 10 : Math.round(mastery * 10) / 10;
  }
  homeScores.articulation = artScores;

  // ─── Fluency ───
  const fluencyProgress = await FluencyProgress.findOne({ user_id: userId });
  if (fluencyProgress) {
    const m = fluencyProgress.overall_mastery || 0;
    homeScores.fluency = m <= 1 ? Math.round(m * 1000) / 10 : Math.round(m * 10) / 10;
  } else {
    homeScores.fluency = null;
  }

  // ─── Receptive ───
  const receptiveProgress = await LanguageProgress.findOne({ user_id: userId, mode: 'receptive' });
  if (receptiveProgress) {
    const a = receptiveProgress.accuracy || 0;
    homeScores.receptive = a <= 1 ? Math.round(a * 1000) / 10 : Math.round(a * 10) / 10;
  } else {
    homeScores.receptive = null;
  }

  // ─── Expressive ───
  const expressiveProgress = await LanguageProgress.findOne({ user_id: userId, mode: 'expressive' });
  if (expressiveProgress) {
    const a = expressiveProgress.accuracy || 0;
    homeScores.expressive = a <= 1 ? Math.round(a * 1000) / 10 : Math.round(a * 10) / 10;
  } else {
    homeScores.expressive = null;
  }

  // ─── Gait ───
  const gaitRecords = await GaitProgress.find({ user_id: userId });
  if (gaitRecords.length > 0) {
    let stability = 0, symmetry = 0, regularity = 0;
    for (const g of gaitRecords) {
      const m = g.metrics || {};
      stability += m.stability_score || 0;
      symmetry += m.gait_symmetry || 0;
      regularity += m.step_regularity || 0;
    }
    const cnt = gaitRecords.length;
    homeScores.gait = {
      stability_score: Math.round((stability / cnt) * 1000) / 10,
      gait_symmetry:   Math.round((symmetry  / cnt) * 1000) / 10,
      step_regularity: Math.round((regularity/ cnt) * 1000) / 10,
      overall_gait:    Math.round(((stability + symmetry + regularity) / (cnt * 3)) * 1000) / 10
    };
  } else {
    homeScores.gait = {};
  }

  return homeScores;
};

// ────────────────────────────────────────
// Helper: compute deltas + summary insights
// ────────────────────────────────────────
const computeDeltas = (facilityScores, homeScores) => {
  const deltas = {};

  // ── Articulation per sound ──
  const fArt = facilityScores.articulation || {};
  const hArt = homeScores.articulation || {};
  const allSounds = new Set([...Object.keys(fArt), ...Object.keys(hArt)]);
  const artDeltas = {};
  for (const s of allSounds) {
    const fv = fArt[s] !== undefined && fArt[s] !== null ? Number(fArt[s]) : null;
    const hv = hArt[s] !== undefined && hArt[s] !== null ? Number(hArt[s]) : null;
    artDeltas[s] = (fv !== null && hv !== null) ? Math.round((hv - fv) * 10) / 10 : null;
  }
  deltas.articulation = artDeltas;

  // ── Fluency / Receptive / Expressive ──
  for (const key of ['fluency', 'receptive', 'expressive']) {
    const fv = facilityScores[key] !== undefined && facilityScores[key] !== null ? Number(facilityScores[key]) : null;
    const hv = homeScores[key]     !== undefined && homeScores[key]     !== null ? Number(homeScores[key])     : null;
    deltas[key] = (fv !== null && hv !== null) ? Math.round((hv - fv) * 10) / 10 : null;
  }

  // ── Gait overall ──
  const fGait = (facilityScores.gait || {}).overall_gait;
  const hGait = (homeScores.gait     || {}).overall_gait;
  deltas.gait = (fGait != null && hGait != null) ? Math.round((hGait - fGait) * 10) / 10 : null;

  // ── Summary insights ──
  const allDeltas = [];
  for (const [sound, d] of Object.entries(artDeltas)) {
    if (d !== null) allDeltas.push({ metric: `/${sound.toUpperCase()}/ Sound`, delta: d, category: 'articulation' });
  }
  for (const key of ['fluency', 'receptive', 'expressive']) {
    if (deltas[key] !== null) allDeltas.push({ metric: key.charAt(0).toUpperCase() + key.slice(1), delta: deltas[key], category: key });
  }
  if (deltas.gait !== null) allDeltas.push({ metric: 'Gait', delta: deltas.gait, category: 'gait' });

  let summaryInsights = {};
  if (allDeltas.length > 0) {
    const vals = allDeltas.map(d => d.delta);
    const best  = allDeltas.reduce((a, b) => b.delta > a.delta ? b : a);
    const worst = allDeltas.reduce((a, b) => b.delta < a.delta ? b : a);
    summaryInsights = {
      overall_avg_delta: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
      strongest_area: { metric: best.metric,  delta: best.delta  },
      weakest_area:   { metric: worst.metric, delta: worst.delta },
      total_metrics:    allDeltas.length,
      improving_count:  vals.filter(v => v > 0).length,
      declining_count:  vals.filter(v => v < 0).length,
      stable_count:     vals.filter(v => v === 0).length
    };
  }

  return { deltas, summaryInsights };
};

// ═══════════════════════════════════════
//  C R U D   E N D P O I N T S
// ═══════════════════════════════════════

/**
 * POST /api/therapist/diagnostics
 * Create a new facility diagnostic assessment for a patient
 */
exports.createFacilityDiagnostic = async (req, res) => {
  try {
    const data = req.body;

    // Required fields
    if (!data.user_id) return res.status(400).json({ success: false, message: 'user_id is required' });
    if (!data.assessment_date) return res.status(400).json({ success: false, message: 'assessment_date is required' });

    // Validate simple scores
    for (const field of ['fluency_score', 'receptive_score', 'expressive_score']) {
      const check = validateScore(data[field], field);
      if (!check.valid) return res.status(400).json({ success: false, message: check.message });
    }

    // Validate articulation scores
    for (const [sound, val] of Object.entries(data.articulation_scores || {})) {
      const check = validateScore(val, `Articulation score for ${sound}`);
      if (!check.valid) return res.status(400).json({ success: false, message: check.message });
    }

    // Validate gait scores
    for (const [key, val] of Object.entries(data.gait_scores || {})) {
      const check = validateScore(val, `Gait score ${key}`);
      if (!check.valid) return res.status(400).json({ success: false, message: check.message });
    }

    // Verify patient exists
    const patient = await User.findById(data.user_id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const diagnostic = new FacilityDiagnostic({
      user_id:             data.user_id,
      assessed_by:         req.user._id.toString(),
      assessment_date:     new Date(data.assessment_date),
      assessment_type:     data.assessment_type || 'initial',
      articulation_scores: data.articulation_scores || {},
      fluency_score:       data.fluency_score   != null && data.fluency_score   !== '' ? Number(data.fluency_score)   : null,
      receptive_score:     data.receptive_score  != null && data.receptive_score  !== '' ? Number(data.receptive_score)  : null,
      expressive_score:    data.expressive_score != null && data.expressive_score !== '' ? Number(data.expressive_score) : null,
      gait_scores:         data.gait_scores || {},
      notes:               data.notes || '',
      severity_level:      data.severity_level || '',
      recommended_focus:   data.recommended_focus || []
    });

    await diagnostic.save();

    // If initial assessment, update hasInitialDiagnostic flag (same as web)
    if (diagnostic.assessment_type === 'initial') {
      await User.findByIdAndUpdate(data.user_id, {
        hasInitialDiagnostic: true,
        diagnosticStatusUpdatedAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`✅ Facility diagnostic created for patient ${data.user_id} by therapist ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Facility diagnostic created successfully',
      diagnostic_id: diagnostic._id.toString()
    });
  } catch (error) {
    console.error('❌ Error creating facility diagnostic:', error);
    res.status(500).json({ success: false, message: 'Failed to create facility diagnostic', error: error.message });
  }
};

/**
 * GET /api/therapist/diagnostics/:userId
 * Get all facility diagnostics for a patient
 */
exports.getFacilityDiagnostics = async (req, res) => {
  try {
    const { userId } = req.params;

    const patient = await User.findById(userId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const diagnostics = await FacilityDiagnostic.find({ user_id: userId }).sort({ assessment_date: -1 });

    const result = [];
    for (const diag of diagnostics) {
      let assessorName = 'Unknown';
      try {
        const assessor = await User.findById(diag.assessed_by);
        if (assessor) assessorName = `${assessor.firstName} ${assessor.lastName}`;
      } catch (_) { /* ignore */ }

      result.push({
        _id:                 diag._id.toString(),
        user_id:             diag.user_id,
        assessed_by:         diag.assessed_by,
        assessor_name:       assessorName,
        assessment_date:     diag.assessment_date.toISOString(),
        assessment_type:     diag.assessment_type || 'initial',
        articulation_scores: diag.articulation_scores || {},
        fluency_score:       diag.fluency_score,
        receptive_score:     diag.receptive_score,
        expressive_score:    diag.expressive_score,
        gait_scores:         diag.gait_scores || {},
        notes:               diag.notes || '',
        severity_level:      diag.severity_level || '',
        recommended_focus:   diag.recommended_focus || [],
        created_at:          diag.created_at ? diag.created_at.toISOString() : ''
      });
    }

    res.status(200).json({
      success: true,
      diagnostics: result,
      patient_name: `${patient.firstName} ${patient.lastName}`
    });
  } catch (error) {
    console.error('❌ Error fetching facility diagnostics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch facility diagnostics', error: error.message });
  }
};

/**
 * PUT /api/therapist/diagnostics/:diagnosticId
 * Update a facility diagnostic
 */
exports.updateFacilityDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const data = req.body;

    const existing = await FacilityDiagnostic.findById(diagnosticId);
    if (!existing) return res.status(404).json({ success: false, message: 'Diagnostic not found' });

    const allowedFields = [
      'assessment_date', 'assessment_type', 'articulation_scores',
      'fluency_score', 'receptive_score', 'expressive_score',
      'gait_scores', 'notes', 'severity_level', 'recommended_focus'
    ];

    const updateFields = { updated_at: new Date() };
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'assessment_date') {
          updateFields[field] = new Date(data[field]);
        } else {
          updateFields[field] = data[field];
        }
      }
    }

    await FacilityDiagnostic.findByIdAndUpdate(diagnosticId, { $set: updateFields });

    res.status(200).json({ success: true, message: 'Diagnostic updated successfully' });
  } catch (error) {
    console.error('❌ Error updating facility diagnostic:', error);
    res.status(500).json({ success: false, message: 'Failed to update diagnostic', error: error.message });
  }
};

/**
 * DELETE /api/therapist/diagnostics/:diagnosticId
 * Delete a facility diagnostic
 */
exports.deleteFacilityDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const result = await FacilityDiagnostic.findByIdAndDelete(diagnosticId);
    if (!result) return res.status(404).json({ success: false, message: 'Diagnostic not found' });

    res.status(200).json({ success: true, message: 'Diagnostic deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting facility diagnostic:', error);
    res.status(500).json({ success: false, message: 'Failed to delete diagnostic', error: error.message });
  }
};

// ═══════════════════════════════════════
//  C O M P A R I S O N   E N D P O I N T S
// ═══════════════════════════════════════

/**
 * GET /api/therapist/diagnostics/:userId/comparison
 * Compute comparison between facility diagnostic and current at-home performance
 */
exports.getDiagnosticComparison = async (req, res) => {
  try {
    const { userId } = req.params;

    const patient = await User.findById(userId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Get the specific diagnostic or latest
    const diagnosticId = req.query.diagnostic_id;
    let facilityDiag;
    if (diagnosticId) {
      facilityDiag = await FacilityDiagnostic.findById(diagnosticId);
    } else {
      facilityDiag = await FacilityDiagnostic.findOne({ user_id: userId }).sort({ assessment_date: -1 });
    }

    if (!facilityDiag) {
      return res.status(200).json({
        success: true,
        has_facility_data: false,
        message: 'No facility diagnostic found for this patient'
      });
    }

    // Build facility scores
    const facilityScores = {
      articulation: facilityDiag.articulation_scores || {},
      fluency:      facilityDiag.fluency_score,
      receptive:    facilityDiag.receptive_score,
      expressive:   facilityDiag.expressive_score,
      gait:         facilityDiag.gait_scores || {}
    };

    // Aggregate at-home scores
    const homeScores = await aggregateHomeScores(userId);

    // Compute deltas & summary
    const { deltas, summaryInsights } = computeDeltas(facilityScores, homeScores);

    // Look up assessor name
    let assessorName = 'Unknown';
    try {
      const assessor = await User.findById(facilityDiag.assessed_by);
      if (assessor) assessorName = `${assessor.firstName} ${assessor.lastName}`;
    } catch (_) { /* ignore */ }

    res.status(200).json({
      success: true,
      has_facility_data: true,
      patient_name: `${patient.firstName} ${patient.lastName}`,
      assessment_date: facilityDiag.assessment_date.toISOString(),
      assessment_type: facilityDiag.assessment_type || 'initial',
      assessor_name: assessorName,
      severity_level: facilityDiag.severity_level || '',
      notes: facilityDiag.notes || '',
      recommended_focus: facilityDiag.recommended_focus || [],
      facility_scores: facilityScores,
      home_scores: homeScores,
      deltas,
      summary_insights: summaryInsights
    });
  } catch (error) {
    console.error('❌ Error computing diagnostic comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to compute diagnostic comparison', error: error.message });
  }
};

/**
 * GET /api/therapist/diagnostics/:userId/comparison-history
 * Get all historical facility diagnostics with scores for trend visualisation
 */
exports.getComparisonHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const patient = await User.findById(userId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const diagnostics = await FacilityDiagnostic.find({ user_id: userId }).sort({ assessment_date: 1 });

    const history = diagnostics.map(diag => ({
      _id:                 diag._id.toString(),
      assessment_date:     diag.assessment_date.toISOString(),
      assessment_type:     diag.assessment_type || 'initial',
      severity_level:      diag.severity_level || '',
      articulation_scores: diag.articulation_scores || {},
      fluency_score:       diag.fluency_score,
      receptive_score:     diag.receptive_score,
      expressive_score:    diag.expressive_score,
      gait_scores:         diag.gait_scores || {}
    }));

    res.status(200).json({
      success: true,
      patient_name: `${patient.firstName} ${patient.lastName}`,
      history,
      total: history.length
    });
  } catch (error) {
    console.error('❌ Error fetching diagnostic history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch diagnostic history', error: error.message });
  }
};

/**
 * GET /api/diagnostic-comparison
 * Patient's own facility vs home comparison (read-only) – full data parity with therapist endpoint
 */
exports.getPatientOwnComparison = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Support selecting a specific diagnostic via query param
    const diagnosticId = req.query.diagnostic_id;
    let facilityDiag;
    if (diagnosticId) {
      facilityDiag = await FacilityDiagnostic.findOne({ _id: diagnosticId, user_id: userId });
    } else {
      facilityDiag = await FacilityDiagnostic.findOne({ user_id: userId }).sort({ assessment_date: -1 });
    }

    if (!facilityDiag) {
      return res.status(200).json({
        success: true,
        has_facility_data: false,
        message: 'No facility diagnostic found'
      });
    }

    // Build facility scores
    const facilityScores = {
      articulation: facilityDiag.articulation_scores || {},
      fluency:      facilityDiag.fluency_score,
      receptive:    facilityDiag.receptive_score,
      expressive:   facilityDiag.expressive_score,
      gait:         facilityDiag.gait_scores || {}
    };

    // Aggregate at-home scores
    const homeScores = await aggregateHomeScores(userId);

    // Compute deltas & summary
    const { deltas, summaryInsights } = computeDeltas(facilityScores, homeScores);

    // Assessor name
    let assessorName = 'Unknown';
    try {
      const assessor = await User.findById(facilityDiag.assessed_by);
      if (assessor) assessorName = `${assessor.firstName} ${assessor.lastName}`;
    } catch (_) { /* ignore */ }

    res.status(200).json({
      success: true,
      has_facility_data: true,
      patient_name: `${req.user.firstName} ${req.user.lastName}`,
      assessment_date: facilityDiag.assessment_date.toISOString(),
      assessment_type: facilityDiag.assessment_type || 'initial',
      assessor_name: assessorName,
      severity_level: facilityDiag.severity_level || '',
      notes: facilityDiag.notes || '',
      recommended_focus: facilityDiag.recommended_focus || [],
      facility_scores: facilityScores,
      home_scores: homeScores,
      deltas,
      summary_insights: summaryInsights
    });
  } catch (error) {
    console.error('❌ Error fetching patient diagnostic comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch diagnostic comparison', error: error.message });
  }
};
