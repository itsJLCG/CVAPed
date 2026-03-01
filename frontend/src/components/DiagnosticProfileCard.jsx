import React from 'react';
import './DiagnosticProfileCard.css';

const TIMEFRAME_LABELS = {
  less_than_1_month: 'Less than 1 month',
  '1_to_6_months': '1–6 months',
  '6_to_12_months': '6–12 months',
  over_1_year: 'Over 1 year',
};
const SIDE_LABELS = { left: 'Left Side', right: 'Right Side', both: 'Both Sides', unknown: 'Not Sure' };
const MOBILITY_LABELS = { independent: 'Walks Independently', assisted: 'With Assistance', wheelchair: 'Wheelchair User', bed_bound: 'Bed-bound' };
const MOTOR_LABELS = { normal: 'Normal', mild_weakness: 'Mild Weakness', moderate_weakness: 'Moderate Weakness', severe_weakness: 'Severe / No Movement' };
const AGE_LABELS = { toddler: '1–2 Years (Toddler)', preschool: '3–4 Years (Preschool)', school_age: '5–8 Years (School-Age)', older: '9+ Years' };
const COMM_MODE_LABELS = { preverbal: 'Pre-verbal / Non-verbal', single_words: 'Single Words', short_phrases: 'Short Phrases', sentences: 'Full Sentences' };
const INTELL_LABELS = { easily: 'Easily Understood', mostly_family: 'Mostly by Family', difficult: 'Difficult to Understand', not_speaking: 'Not Yet Speaking' };
const SPEECH_CONCERN_LABELS = { articulation: 'Pronunciation / Articulation', language: 'Language Development', fluency: 'Fluency / Stuttering', multiple: 'Multiple Areas' };
const FOLLOWS_LABELS = { yes_consistently: 'Yes, Consistently', sometimes: 'Sometimes', rarely: 'Rarely', no: 'No / Not Yet' };
const RESPONDS_LABELS = { always: 'Always', usually: 'Usually', inconsistently: 'Inconsistently', rarely_no: 'Rarely / No' };
const PRIOR_SPEECH_LABELS = { formal_eval: 'Formal Evaluation', informal: 'Informal Screening', no: 'None' };
const PRIOR_PT_LABELS = { facility: 'At a Facility', self_guided: 'Self-Guided', no: 'No' };
const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const THERAPY_LABELS = { speech: 'Speech Therapy', physical: 'Physical Therapy', both: 'Both Therapies' };
const FOCUS_LABELS = { speech: 'Speech', physical: 'Physical', both: 'Both' };

function DiagnosticProfileCard({ diagnosticData, compact = false, onUpdate }) {
  if (!diagnosticData?.completedWizard) return null;

  const isPediatricSpeech = diagnosticData.therapyFocus === 'speech';
  const isStrokeOrBoth = diagnosticData.therapyFocus === 'physical' || diagnosticData.therapyFocus === 'both';

  const conditionItems = isPediatricSpeech ? [
    diagnosticData.childAgeGroup && { label: 'Age Group', value: AGE_LABELS[diagnosticData.childAgeGroup] ?? diagnosticData.childAgeGroup },
    diagnosticData.childCommunicationMode && { label: 'Communication', value: COMM_MODE_LABELS[diagnosticData.childCommunicationMode] ?? diagnosticData.childCommunicationMode },
    diagnosticData.speechIntelligibility && { label: 'Intelligibility', value: INTELL_LABELS[diagnosticData.speechIntelligibility] ?? diagnosticData.speechIntelligibility },
    diagnosticData.mainSpeechConcern && { label: 'Main Concern', value: SPEECH_CONCERN_LABELS[diagnosticData.mainSpeechConcern] ?? diagnosticData.mainSpeechConcern },
    diagnosticData.followsInstructions && { label: 'Follows Instructions', value: FOLLOWS_LABELS[diagnosticData.followsInstructions] ?? diagnosticData.followsInstructions },
    diagnosticData.respondsToName && { label: 'Responds to Name', value: RESPONDS_LABELS[diagnosticData.respondsToName] ?? diagnosticData.respondsToName },
    diagnosticData.priorSpeechEval && { label: 'Prior Speech Eval', value: PRIOR_SPEECH_LABELS[diagnosticData.priorSpeechEval] ?? diagnosticData.priorSpeechEval },
    diagnosticData.primarySpeechGoal && { label: 'Primary Goal', value: diagnosticData.primarySpeechGoal },
  ].filter(Boolean) : [
    diagnosticData.strokeTimeframe && { label: 'Stroke Timeframe', value: TIMEFRAME_LABELS[diagnosticData.strokeTimeframe] ?? diagnosticData.strokeTimeframe },
    diagnosticData.affectedSide && { label: 'Affected Side', value: SIDE_LABELS[diagnosticData.affectedSide] ?? diagnosticData.affectedSide },
    isStrokeOrBoth && diagnosticData.mobilityStatus && { label: 'Mobility', value: MOBILITY_LABELS[diagnosticData.mobilityStatus] ?? diagnosticData.mobilityStatus },
    isStrokeOrBoth && diagnosticData.armMotorFunction && { label: 'Arm Motor', value: MOTOR_LABELS[diagnosticData.armMotorFunction] ?? diagnosticData.armMotorFunction },
    isStrokeOrBoth && diagnosticData.legMotorFunction && { label: 'Leg Motor', value: MOTOR_LABELS[diagnosticData.legMotorFunction] ?? diagnosticData.legMotorFunction },
    diagnosticData.balanceIssues != null && { label: 'Balance Issues', value: diagnosticData.balanceIssues ? 'Yes' : 'No' },
    diagnosticData.spasticity != null && { label: 'Spasticity', value: diagnosticData.spasticity ? 'Present' : 'None' },
    diagnosticData.priorPhysicalTherapy && { label: 'Prior Physical Therapy', value: PRIOR_PT_LABELS[diagnosticData.priorPhysicalTherapy] ?? diagnosticData.priorPhysicalTherapy },
  ].filter(Boolean);

  if (compact) {
    return (
      <div className="dpc-compact">
        <div className="dpc-compact-header">
          <span className="dpc-compact-icon">{isPediatricSpeech ? '🧒' : '📋'}</span>
          <div>
            <div className="dpc-compact-title">Self-Report Profile</div>
            <div className="dpc-compact-focus">{FOCUS_LABELS[diagnosticData.therapyFocus]} Therapy</div>
          </div>
        </div>
        {diagnosticData.recommendedFocus && (
          <div className="dpc-compact-rec">
            <span className="dpc-compact-rec-label">Recommended:</span>
            <span className="dpc-compact-rec-value">{diagnosticData.recommendedFocus}</span>
            {diagnosticData.recommendedLevelName ? (
              <span className="dpc-compact-level-badge">{diagnosticData.recommendedLevelName}</span>
            ) : diagnosticData.recommendedLevel && (
              <span className="dpc-compact-level-badge">{LEVEL_LABELS[diagnosticData.recommendedLevel]}</span>
            )}
          </div>
        )}
        {onUpdate && (
          <button className="dpc-update-btn" onClick={onUpdate}>Update Diagnostic</button>
        )}
      </div>
    );
  }

  return (
    <div className="dpc-card">
      <div className="dpc-card-header">
        <div className="dpc-card-title-row">
          <span className="dpc-card-icon">{isPediatricSpeech ? '🧒' : '📋'}</span>
          <h3 className="dpc-card-title">Your Diagnostic Self-Report</h3>
        </div>
        {onUpdate && (
          <button className="dpc-update-btn" onClick={onUpdate}>Update</button>
        )}
      </div>

      <div className="dpc-card-body">
        <div className="dpc-section">
          <div className="dpc-section-label">Therapy Focus</div>
          <span className="dpc-therapy-badge">{THERAPY_LABELS[diagnosticData.therapyFocus] ?? 'Not specified'}</span>
        </div>

        {conditionItems.length > 0 && (
          <div className="dpc-section">
            <div className="dpc-section-label">
              {isPediatricSpeech ? "Child's Profile" : 'Condition Profile'}
            </div>
            <div className="dpc-items-grid">
              {conditionItems.map((item, i) => (
                <div key={i} className="dpc-item">
                  <span className="dpc-item-label">{item.label}</span>
                  <span className="dpc-item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {diagnosticData.recommendedFocus && (
          <div className="dpc-section dpc-rec-section">
            <div className="dpc-section-label">Recommended Starting Point</div>
            <div className="dpc-rec-badges">
              <span className="dpc-rec-therapy-badge">{THERAPY_LABELS[diagnosticData.recommendedTherapy] ?? 'Therapy'}</span>
              {diagnosticData.recommendedLevelName ? (
                <span className="dpc-rec-level-badge">{diagnosticData.recommendedLevelName}</span>
              ) : diagnosticData.recommendedLevel && (
                <span className="dpc-rec-level-badge">{LEVEL_LABELS[diagnosticData.recommendedLevel]} Level</span>
              )}
            </div>
            <div className="dpc-rec-focus">
              <strong>Focus:</strong> {diagnosticData.recommendedFocus}
            </div>
          </div>
        )}

        {diagnosticData.hasInitialDiagnostic === false && (
          <div className="dpc-no-visit-note">
            <span>📅</span>
            <span>No facility visit on record. Book an initial assessment for the most accurate plan.</span>
          </div>
        )}
        {diagnosticData.hasInitialDiagnostic === true && (
          <div className="dpc-visit-note">
            <span>✅</span>
            <span>Initial facility visit completed.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiagnosticProfileCard;
