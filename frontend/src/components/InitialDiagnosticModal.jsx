import React, { useState, useEffect } from 'react';
import './InitialDiagnosticModal.css';

const TOTAL_STEPS = 5;
const STEP_TITLES = ['Facility', 'Therapy', 'Condition', 'Baseline', 'Summary'];

const INITIAL_WIZARD_DATA = {
  // Step 1
  hasInitialDiagnostic: null,
  // Step 2
  therapyFocus: null,
  // Physical therapy — stroke patient (Steps 3 & 4)
  strokeTimeframe: null,
  affectedSide: null,
  mobilityStatus: null,
  balanceIssues: null,
  armMotorFunction: null,
  legMotorFunction: null,
  spasticity: null,
  priorPhysicalTherapy: null,
  // Pediatric speech therapy (Steps 3 & 4)
  childAgeGroup: null,
  childCommunicationMode: null,
  speechIntelligibility: null,
  mainSpeechConcern: null,
  followsInstructions: null,
  respondsToName: null,
  priorSpeechEval: null,
  primarySpeechGoal: null,
  // Computed recommendation
  recommendedTherapy: null,
  recommendedLevel: null,
  recommendedFocus: null,
};

function computeRecommendation(data) {
  const focus = data.therapyFocus;
  let recommendedLevel = 'beginner';
  let recommendedFocus = '';
  let recommendedTherapyCategory = 'articulation';
  let recommendedStartingLevel = 1;
  let recommendedLevelName = 'Level 1 – Sound Level';
  // "both" is treated as a stroke patient who also needs speech support
  const recommendedTherapy = focus === 'both' ? 'physical' : focus;

  if (focus === 'speech') {
    const comm = data.childCommunicationMode;
    const intelligibility = data.speechIntelligibility;
    const concern = data.mainSpeechConcern;

    if (concern === 'fluency') {
      recommendedLevel = 'intermediate';
      recommendedFocus = 'Fluency / Stuttering Therapy';
      recommendedTherapyCategory = 'fluency';
      if (intelligibility === 'easily') {
        recommendedStartingLevel = 3;
        recommendedLevelName = 'Level 3 – Sentence Level';
      } else if (intelligibility === 'mostly_family') {
        recommendedStartingLevel = 2;
        recommendedLevelName = 'Level 2 – Phrase Level';
      } else {
        recommendedStartingLevel = 1;
        recommendedLevelName = 'Level 1 – Word Level';
      }
    } else if (comm === 'preverbal' || intelligibility === 'not_speaking') {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Early Communication Development';
      recommendedTherapyCategory = 'articulation';
      recommendedStartingLevel = 1;
      recommendedLevelName = 'Level 1 – Sound Level';
    } else if (comm === 'single_words' || intelligibility === 'difficult') {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Articulation + Early Language';
      recommendedTherapyCategory = 'articulation';
      recommendedStartingLevel = 2;
      recommendedLevelName = 'Level 2 – Syllable Level';
    } else if (comm === 'short_phrases' || intelligibility === 'mostly_family') {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Articulation Therapy';
      recommendedTherapyCategory = 'articulation';
      recommendedStartingLevel = 3;
      recommendedLevelName = 'Level 3 – Word Level';
    } else if (comm === 'sentences' && intelligibility === 'easily') {
      recommendedLevel = 'intermediate';
      recommendedFocus = 'Expressive Language + Fluency';
      recommendedTherapyCategory = 'language';
      recommendedStartingLevel = 3;
      recommendedLevelName = 'Level 3 – Story Retell';
    } else {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Speech Therapy';
      recommendedTherapyCategory = 'articulation';
      recommendedStartingLevel = 1;
      recommendedLevelName = 'Level 1 – Sound Level';
    }
  } else {
    recommendedTherapyCategory = 'physical';
    const mobility = data.mobilityStatus;
    const armMotor = data.armMotorFunction;
    const legMotor = data.legMotorFunction;
    if (mobility === 'bed_bound' || armMotor === 'severe_weakness' || legMotor === 'severe_weakness') {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Basic Motor Activation';
      recommendedStartingLevel = 1;
      recommendedLevelName = 'Beginner Level';
    } else if (mobility === 'wheelchair') {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Mobility + Strength Training';
      recommendedStartingLevel = 1;
      recommendedLevelName = 'Beginner Level';
    } else if (mobility === 'assisted' || armMotor === 'moderate_weakness' || legMotor === 'moderate_weakness') {
      recommendedLevel = 'intermediate';
      recommendedFocus = 'Gait Training + Upper Limb Rehabilitation';
      recommendedStartingLevel = 2;
      recommendedLevelName = 'Intermediate Level';
    } else if (mobility === 'independent') {
      recommendedLevel = 'intermediate';
      recommendedFocus = 'Functional Rehabilitation';
      recommendedStartingLevel = 2;
      recommendedLevelName = 'Intermediate Level';
    } else {
      recommendedLevel = 'beginner';
      recommendedFocus = 'Physical Therapy';
      recommendedStartingLevel = 1;
      recommendedLevelName = 'Beginner Level';
    }
    if (focus === 'both') {
      recommendedFocus = recommendedFocus + ' + Speech Support';
    }
  }

  return {
    recommendedTherapy,
    recommendedLevel,
    recommendedFocus,
    recommendedTherapyCategory,
    recommendedStartingLevel,
    recommendedLevelName,
  };
}

function getRequiredFields(step, wizardData) {
  const focus = wizardData.therapyFocus;
  const isPediatricSpeech = focus === 'speech';
  const isStrokeOrBoth = focus === 'physical' || focus === 'both';

  if (step === 1) return ['hasInitialDiagnostic'];
  if (step === 2) return ['therapyFocus'];
  if (step === 3) {
    if (isPediatricSpeech) return ['childAgeGroup', 'childCommunicationMode', 'speechIntelligibility'];
    if (isStrokeOrBoth) return ['strokeTimeframe', 'affectedSide', 'mobilityStatus'];
    return [];
  }
  if (step === 4) {
    if (isPediatricSpeech) return ['followsInstructions', 'respondsToName'];
    if (isStrokeOrBoth) return ['armMotorFunction', 'legMotorFunction'];
    return [];
  }
  return [];
}

function StepBar({ currentStep, total, titles }) {
  return (
    <div className="wizard-step-bar">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <React.Fragment key={step}>
            <div className={`wizard-step-node${isCompleted ? ' completed' : ''}${isActive ? ' active' : ''}`}>
              <div className="wizard-step-node-circle">
                {isCompleted ? '✓' : step}
              </div>
              <span className="wizard-step-node-label">{titles[i]}</span>
            </div>
            {step < total && (
              <div className={`wizard-step-connector${isCompleted ? ' completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ChoiceCard({ value, selected, onClick, icon, label, description }) {
  return (
    <button
      type="button"
      className={`wizard-choice-card${selected ? ' selected' : ''}`}
      onClick={() => onClick(value)}
    >
      {icon && <span className="wizard-choice-icon">{icon}</span>}
      <span className="wizard-choice-label">{label}</span>
      {description && <span className="wizard-choice-description">{description}</span>}
    </button>
  );
}

function FieldGroup({ label, required, hasError, children }) {
  return (
    <div className={`wizard-field-group${hasError ? ' wizard-field-group--error' : ''}`}>
      <label className="wizard-field-label">
        {label}
        {required && <span className="wizard-required-mark"> *</span>}
      </label>
      {children}
      {hasError && (
        <span className="wizard-field-error">Please select an option to continue</span>
      )}
    </div>
  );
}

function InitialDiagnosticModal({ isOpen, onClose, onConfirm, loading }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState(INITIAL_WIZARD_DATA);
  const [recommendation, setRecommendation] = useState(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && currentStep === 1) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, currentStep]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setWizardData(INITIAL_WIZARD_DATA);
      setRecommendation(null);
      setShowValidation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (key, value) => {
    setWizardData(prev => ({ ...prev, [key]: value }));
    setShowValidation(false);
  };

  const requiredFields = getRequiredFields(currentStep, wizardData);
  const allRequiredFilled = requiredFields.every(f => wizardData[f] !== null);
  const isFieldError = (field) => showValidation && requiredFields.includes(field) && wizardData[field] === null;

  const handleNext = () => {
    if (!allRequiredFilled) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (currentStep === 4) {
      const rec = computeRecommendation(wizardData);
      setRecommendation(rec);
      setWizardData(prev => ({ ...prev, ...rec }));
    }
    setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    setShowValidation(false);
    setCurrentStep(s => s - 1);
  };

  const handleSkip = () => {
    setShowValidation(false);
    if (currentStep === 4) {
      const rec = computeRecommendation(wizardData);
      setRecommendation(rec);
      setWizardData(prev => ({ ...prev, ...rec }));
    }
    setCurrentStep(s => s + 1);
  };

  const handleFinish = () => {
    const rec = recommendation ?? computeRecommendation(wizardData);
    onConfirm({ ...wizardData, ...rec, completedWizard: true });
  };

  const isPediatricSpeech = wizardData.therapyFocus === 'speech';
  const isStrokeOrBoth = wizardData.therapyFocus === 'physical' || wizardData.therapyFocus === 'both';

  // ── Step 1: Facility Check ──────────────────────────────────────
  const renderStep1 = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">🏥</span>
        <h3 className="wizard-step-title">Have you visited our facility?</h3>
        <p className="wizard-step-description">
          Have you already had an initial diagnostic assessment or visited the <strong> Taguig City Disability Resource and Development Center </strong> facility?
        </p>
      </div>
      <FieldGroup label="Please select one" required hasError={isFieldError('hasInitialDiagnostic')}>
        <div className="wizard-choices wizard-choices-col">
          <ChoiceCard value={true} selected={wizardData.hasInitialDiagnostic === true}
            onClick={v => update('hasInitialDiagnostic', v)} icon="✅"
            label="Yes, I Have"
            description="I've visited the facility and had a diagnostic assessment" />
          <ChoiceCard value={false} selected={wizardData.hasInitialDiagnostic === false}
            onClick={v => update('hasInitialDiagnostic', v)} icon="📋"
            label="No, Not Yet"
            description="I haven't had an assessment — I'll complete my profile now" />
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 2: Therapy Focus ───────────────────────────────────────
  const renderStep2 = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">🎯</span>
        <h3 className="wizard-step-title">Which therapy do you need?</h3>
        <p className="wizard-step-description">Select the primary therapy area that applies.</p>
      </div>
      <FieldGroup label="Therapy type" required hasError={isFieldError('therapyFocus')}>
        <div className="wizard-choices wizard-choices-col">
          <ChoiceCard value="speech" selected={wizardData.therapyFocus === 'speech'}
            onClick={v => update('therapyFocus', v)} icon="🗣️"
            label="Speech Therapy"
            description="Pediatric speech development — articulation, language, and communication" />
          <ChoiceCard value="physical" selected={wizardData.therapyFocus === 'physical'}
            onClick={v => update('therapyFocus', v)} icon="🏃"
            label="Physical Therapy"
            description="Stroke rehabilitation — restore mobility, gait, balance, and motor function" />
          <ChoiceCard value="both" selected={wizardData.therapyFocus === 'both'}
            onClick={v => update('therapyFocus', v)} icon="💊"
            label="Both Therapies"
            description="Physical stroke rehabilitation with speech support" />
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 3A: Physical Therapy Condition Summary ─────────────────
  const renderStep3Physical = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">🦴</span>
        <h3 className="wizard-step-title">Physical Condition Summary</h3>
        <p className="wizard-step-description">
          Tell us about your stroke history, current mobility, and walking ability.
        </p>
      </div>

      <FieldGroup label="When did your stroke / CVA occur?" required hasError={isFieldError('strokeTimeframe')}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'less_than_1_month', label: '< 1 Month', icon: '🔴' },
            { value: '1_to_6_months', label: '1–6 Months', icon: '🟠' },
            { value: '6_to_12_months', label: '6–12 Months', icon: '🟡' },
            { value: 'over_1_year', label: 'Over 1 Year', icon: '🟢' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.strokeTimeframe === o.value}
              onClick={v => update('strokeTimeframe', v)} icon={o.icon} label={o.label} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Which side is primarily affected?" required hasError={isFieldError('affectedSide')}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'left', label: 'Left Side', icon: '←' },
            { value: 'right', label: 'Right Side', icon: '→' },
            { value: 'both', label: 'Both Sides', icon: '↔' },
            { value: 'unknown', label: 'Not Sure', icon: '?' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.affectedSide === o.value}
              onClick={v => update('affectedSide', v)} icon={o.icon} label={o.label} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Current mobility and walking level" required hasError={isFieldError('mobilityStatus')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'independent', label: '🚶 Walks Independently', description: 'No aid needed — walks on own' },
            { value: 'assisted', label: '🦯 Walks With Assistance', description: 'Uses cane, walker, or requires support' },
            { value: 'wheelchair', label: '♿ Wheelchair User', description: 'Primarily uses a wheelchair for mobility' },
            { value: 'bed_bound', label: '🛏️ Bed-bound', description: 'Mostly confined to bed, unable to walk' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.mobilityStatus === o.value}
              onClick={v => update('mobilityStatus', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Balance and coordination issues" hasError={false}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'rarely', label: 'Rarely' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'frequently', label: 'Frequently' },
            { value: 'unable_alone', label: 'Cannot Stand Alone' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.balanceIssues === o.value}
              onClick={v => update('balanceIssues', v)} label={o.label} />
          ))}
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 3B: Pediatric Speech Profile ──────────────────────────
  const renderStep3Speech = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">🧒</span>
        <h3 className="wizard-step-title">Child's Speech Profile</h3>
        <p className="wizard-step-description">
          Tell us about the child's current communication and speech development.
        </p>
      </div>

      <FieldGroup label="Child's current age group" required hasError={isFieldError('childAgeGroup')}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'toddler', label: '1–2 Years', icon: '🧸', description: 'Toddler' },
            { value: 'preschool', label: '3–4 Years', icon: '🎨', description: 'Preschool' },
            { value: 'school_age', label: '5–8 Years', icon: '📚', description: 'School-Age' },
            { value: 'older', label: '9+ Years', icon: '🏫', description: 'Older Child' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.childAgeGroup === o.value}
              onClick={v => update('childAgeGroup', v)} icon={o.icon} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="How does the child primarily communicate?" required hasError={isFieldError('childCommunicationMode')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'preverbal', label: '🤚 Pre-verbal / Non-verbal', description: 'Gestures, pointing, or no speech yet' },
            { value: 'single_words', label: '🗣️ Single Words Only', description: 'Uses some words, mostly isolated' },
            { value: 'short_phrases', label: '💬 Short Phrases', description: 'Combines 2–3 words together' },
            { value: 'sentences', label: '📢 Full Sentences', description: 'Communicates in full sentences' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.childCommunicationMode === o.value}
              onClick={v => update('childCommunicationMode', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="How easily do others understand the child's speech?" required hasError={isFieldError('speechIntelligibility')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'easily', label: '😊 Easily Understood', description: 'Most people understand without difficulty' },
            { value: 'mostly_family', label: '🙂 Mostly by Family', description: 'Familiar people understand, strangers struggle' },
            { value: 'difficult', label: '😐 Difficult to Understand', description: 'Hard to understand even for family' },
            { value: 'not_speaking', label: '😶 Not Yet Speaking', description: 'Child does not yet use spoken words' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.speechIntelligibility === o.value}
              onClick={v => update('speechIntelligibility', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Primary speech concern" hasError={false}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'articulation', label: 'Pronunciation', description: 'Sound errors' },
            { value: 'language', label: 'Language', description: 'Vocab / grammar' },
            { value: 'fluency', label: 'Fluency', description: 'Stuttering' },
            { value: 'multiple', label: 'Multiple Areas', description: 'Several concerns' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.mainSpeechConcern === o.value}
              onClick={v => update('mainSpeechConcern', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 4A: Physical Motor Baseline ───────────────────────────
  const renderStep4Physical = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">💪</span>
        <h3 className="wizard-step-title">Motor Function Baseline</h3>
        <p className="wizard-step-description">
          Help us understand your strength and movement on the affected side.
        </p>
      </div>

      <FieldGroup label="Arm / hand motor function (affected side)" required hasError={isFieldError('armMotorFunction')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'normal', label: '💪 Normal', description: 'Full strength and grip control' },
            { value: 'mild_weakness', label: '👋 Mild Weakness', description: 'Slight reduction in grip or reach' },
            { value: 'moderate_weakness', label: '✋ Moderate Weakness', description: 'Significant difficulty with fine motor tasks' },
            { value: 'severe_weakness', label: '🤚 Severe / No Movement', description: 'Unable to use the arm effectively' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.armMotorFunction === o.value}
              onClick={v => update('armMotorFunction', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Leg / foot motor function (affected side)" required hasError={isFieldError('legMotorFunction')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'normal', label: '🦵 Normal', description: 'Full strength and gait control' },
            { value: 'mild_weakness', label: '🦿 Mild Weakness', description: 'Some difficulty on steps or slopes' },
            { value: 'moderate_weakness', label: '🦽 Moderate Weakness', description: 'Needs support when walking' },
            { value: 'severe_weakness', label: '🛏️ Severe / No Movement', description: 'Cannot bear weight effectively' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.legMotorFunction === o.value}
              onClick={v => update('legMotorFunction', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Spasticity / muscle stiffness" hasError={false}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'no', label: 'None' },
            { value: 'mild', label: 'Mild' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'severe', label: 'Severe' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.spasticity === o.value}
              onClick={v => update('spasticity', v)} label={o.label} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Have you received physical therapy before?" hasError={false}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'facility', label: 'Yes, at a Facility' },
            { value: 'self_guided', label: 'Yes, Self-Guided' },
            { value: 'no', label: 'No' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.priorPhysicalTherapy === o.value}
              onClick={v => update('priorPhysicalTherapy', v)} label={o.label} />
          ))}
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 4B: Pediatric Communication Details ───────────────────
  const renderStep4Speech = () => (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">💬</span>
        <h3 className="wizard-step-title">Communication Details</h3>
        <p className="wizard-step-description">
          Help us understand the child's comprehension and interaction patterns.
        </p>
      </div>

      <FieldGroup label="Does the child follow simple instructions?" required hasError={isFieldError('followsInstructions')}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'yes_consistently', label: '✅ Yes, Consistently', description: 'Follows single and two-step instructions' },
            { value: 'sometimes', label: '🙂 Sometimes', description: 'Follows simple directions with prompting' },
            { value: 'rarely', label: '😐 Rarely', description: 'Significant difficulty following directions' },
            { value: 'no', label: '❌ No / Not Yet', description: 'Does not yet follow verbal instructions' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.followsInstructions === o.value}
              onClick={v => update('followsInstructions', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Does the child respond when their name is called?" required hasError={isFieldError('respondsToName')}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'always', label: 'Always', description: 'Consistently responds' },
            { value: 'usually', label: 'Usually', description: 'Responds most of the time' },
            { value: 'inconsistently', label: 'Inconsistently', description: 'Only sometimes' },
            { value: 'rarely_no', label: 'Rarely / No', description: 'Rarely or never responds' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.respondsToName === o.value}
              onClick={v => update('respondsToName', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Has the child had a speech evaluation before?" hasError={false}>
        <div className="wizard-choices wizard-choices-col-sm">
          {[
            { value: 'formal_eval', label: '📋 Yes, Formal Evaluation', description: 'Assessed by a speech-language pathologist' },
            { value: 'informal', label: '📝 Yes, Informal Screening', description: 'General developmental check' },
            { value: 'no', label: '❌ No, This Is the First', description: 'No prior assessment' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.priorSpeechEval === o.value}
              onClick={v => update('priorSpeechEval', v)} label={o.label} description={o.description} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Primary speech therapy goal" hasError={false}>
        <div className="wizard-choices wizard-choices-grid">
          {[
            { value: 'pronunciation', label: '🗣️ Clearer Pronunciation' },
            { value: 'language', label: '📖 More Words / Language' },
            { value: 'sentences', label: '💬 Better Sentences' },
            { value: 'social', label: '🤝 Social Communication' },
          ].map(o => (
            <ChoiceCard key={o.value} value={o.value}
              selected={wizardData.primarySpeechGoal === o.value}
              onClick={v => update('primarySpeechGoal', v)} label={o.label} />
          ))}
        </div>
      </FieldGroup>
    </div>
  );

  // ── Step 5: Summary ─────────────────────────────────────────────
  const renderStep5 = () => {
    const rec = recommendation ?? computeRecommendation(wizardData);

    const TIMEFRAME_LABELS = {
      less_than_1_month: '< 1 month',
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
    const THERAPY_LABELS = { speech: 'Speech Therapy', physical: 'Physical Therapy', both: 'Both Therapies' };
    const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

    const summaryItems = isPediatricSpeech ? [
      wizardData.childAgeGroup && { label: 'Age Group', value: AGE_LABELS[wizardData.childAgeGroup] },
      wizardData.childCommunicationMode && { label: 'Communication', value: COMM_MODE_LABELS[wizardData.childCommunicationMode] },
      wizardData.speechIntelligibility && { label: 'Intelligibility', value: INTELL_LABELS[wizardData.speechIntelligibility] },
    ] : [
      wizardData.strokeTimeframe && { label: 'Stroke Timeframe', value: TIMEFRAME_LABELS[wizardData.strokeTimeframe] },
      wizardData.affectedSide && { label: 'Affected Side', value: SIDE_LABELS[wizardData.affectedSide] },
      wizardData.mobilityStatus && { label: 'Mobility', value: MOBILITY_LABELS[wizardData.mobilityStatus] },
      wizardData.armMotorFunction && { label: 'Arm Motor', value: MOTOR_LABELS[wizardData.armMotorFunction] },
      wizardData.legMotorFunction && { label: 'Leg Motor', value: MOTOR_LABELS[wizardData.legMotorFunction] },
    ];

    return (
      <div className="wizard-step-content wizard-summary">
        <div className="wizard-summary-header">
          <div className="wizard-summary-check">✓</div>
          <h3>Profile Complete!</h3>
          <p>Your condition summary and recommended starting point</p>
        </div>

        {summaryItems.filter(Boolean).length > 0 && (
          <div className="wizard-summary-section">
            <h4 className="wizard-summary-section-title">
              {isPediatricSpeech ? "🧒 Child's Profile" : '📋 Condition Profile'}
            </h4>
            <div className="wizard-summary-items">
              {summaryItems.filter(Boolean).map((item, i) => (
                <div key={i} className="wizard-summary-item">
                  <span className="wizard-summary-item-label">{item.label}</span>
                  <span className="wizard-summary-item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="wizard-summary-section wizard-recommendation-section">
          <h4 className="wizard-summary-section-title">🎯 Recommended Starting Point</h4>
          <div className="wizard-rec-badge-row">
            <span className="wizard-rec-therapy-badge">{THERAPY_LABELS[rec.recommendedTherapy] ?? 'Therapy'}</span>
            <span className="wizard-rec-level-badge">
              {rec.recommendedLevelName ?? (LEVEL_LABELS[rec.recommendedLevel] + ' Level')}
            </span>
          </div>
          {rec.recommendedFocus && (
            <div className="wizard-rec-focus-text">
              <strong>Focus:</strong> {rec.recommendedFocus}
            </div>
          )}
        </div>

        {wizardData.hasInitialDiagnostic === false && (
          <div className="wizard-no-diagnostic-note">
            <span>📅</span>
            <p>No facility visit on record — your self-report has been saved. We recommend booking an initial assessment for the most accurate therapy plan.</p>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = isPediatricSpeech ? renderStep3Speech : renderStep3Physical;
  const renderStep4 = isPediatricSpeech ? renderStep4Speech : renderStep4Physical;
  const steps = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="diagnostic-modal-overlay" onClick={currentStep === 1 ? onClose : undefined}>
      <div className="diagnostic-modal-content wizard-mode" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="diagnostic-modal-header wizard-header">
          <div className="wizard-header-top">
            <div className="wizard-header-title-block">
              <h2 className="wizard-title">Initial Diagnostic</h2>
              <span className="wizard-step-sublabel">
                Step {currentStep} of {TOTAL_STEPS} — {STEP_TITLES[currentStep - 1]}
              </span>
            </div>
            {currentStep === 1 && (
              <button className="diagnostic-modal-close" onClick={onClose} aria-label="Close">×</button>
            )}
          </div>
          <StepBar currentStep={currentStep} total={TOTAL_STEPS} titles={STEP_TITLES} />
        </div>

        {/* Body */}
        <div className="diagnostic-modal-body wizard-body">
          {showValidation && !allRequiredFilled && (
            <div className="wizard-validation-banner">
              ⚠️ Please answer all required fields (marked with *) before continuing.
            </div>
          )}
          {steps[currentStep - 1]()}
        </div>

        {/* Footer */}
        <div className="diagnostic-modal-footer wizard-footer">
          {currentStep > 1 ? (
            <button className="btn-diagnostic btn-wizard-back" onClick={handleBack} disabled={loading}>
              ← Back
            </button>
          ) : (
            <div />
          )}
          <div className="wizard-footer-actions">
            {currentStep >= 3 && currentStep <= 4 && (
              <button className="btn-wizard-skip" onClick={handleSkip} disabled={loading}>
                Skip
              </button>
            )}
            {currentStep < 5 && (
              <button
                className="btn-diagnostic btn-diagnostic-yes"
                onClick={handleNext}
              >
                Continue →
              </button>
            )}
            {currentStep === 5 && (
              <button
                className="btn-diagnostic btn-diagnostic-yes"
                onClick={handleFinish}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Start Therapy →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InitialDiagnosticModal;
