import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTherapyCategory } from '../components/TherapyCategoryContext';
import Header from '../components/Header';
import './ExercisePlans.css';

// Placeholder exercise data – structured so real API data can replace it later
const EXERCISE_CATEGORIES = [
  { id: 'all', label: 'All Exercises', icon: 'fas fa-th-large' },
  { id: 'balance', label: 'Balance & Symmetry', icon: 'fas fa-balance-scale' },
  { id: 'speed', label: 'Speed & Rhythm', icon: 'fas fa-tachometer-alt' },
  { id: 'gait', label: 'Gait Pattern', icon: 'fas fa-shoe-prints' },
  { id: 'strength', label: 'Strength & Endurance', icon: 'fas fa-dumbbell' },
];

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// ── Backend problem key → display metadata ────────────────────────────────
// Keys match exactly what gait_problem_detector.py emits so this map can be
// replaced by a single API call when the backend exposes an /exercise-labels endpoint.
const PROBLEM_LABELS = {
  slow_cadence:    { label: 'Slow Cadence',    icon: 'fas fa-tachometer-alt',   color: '#3498db' },
  asymmetric_gait: { label: 'Gait Asymmetry',  icon: 'fas fa-balance-scale',    color: '#e67e22' },
  short_stride:    { label: 'Short Stride',     icon: 'fas fa-ruler-horizontal', color: '#9b59b6' },
  slow_velocity:   { label: 'Reduced Speed',    icon: 'fas fa-walking',          color: '#e74c3c' },
  poor_stability:  { label: 'Poor Stability',   icon: 'fas fa-shield-alt',       color: '#f39c12' },
  irregular_steps: { label: 'Irregular Steps',  icon: 'fas fa-heartbeat',        color: '#16a085' },
  // foot_drop is not yet emitted by the backend detector but is reserved for future extension
  foot_drop:       { label: 'Foot Clearance',   icon: 'fas fa-shoe-prints',      color: '#8e44ad' },
};

// ── Per-exercise gait-cycle metadata ─────────────────────────────────────
// Kept separate from EXERCISES so these fields can be fetched from a future
// /api/exercises/metadata endpoint without touching the exercise data array.
const EXERCISE_METADATA = {
  'ex-001': { gaitPhase: 'Mid-Stance',       targetedDeviation: 'Gait Asymmetry'  },
  'ex-002': { gaitPhase: 'Full Cycle',       targetedDeviation: 'Poor Stability'  },
  'ex-003': { gaitPhase: 'Loading Response', targetedDeviation: 'Gait Asymmetry'  },
  'ex-004': { gaitPhase: 'Stance Phase',     targetedDeviation: 'Poor Stability'  },
  'ex-019': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Gait Asymmetry'  },
  'ex-005': { gaitPhase: 'Full Cycle',       targetedDeviation: 'Slow Cadence'    },
  'ex-006': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Slow Cadence'    },
  'ex-007': { gaitPhase: 'Full Cycle',       targetedDeviation: 'Reduced Speed'   },
  'ex-008': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Slow Cadence'    },
  'ex-009': { gaitPhase: 'Terminal Stance',  targetedDeviation: 'Short Stride'    },
  'ex-010': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Foot Clearance'  },
  'ex-011': { gaitPhase: 'Loading Response', targetedDeviation: 'Short Stride'    },
  'ex-012': { gaitPhase: 'Mid-Stance',       targetedDeviation: 'Gait Asymmetry'  },
  'ex-020': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Short Stride'    },
  'ex-021': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Foot Clearance'  },
  'ex-013': { gaitPhase: 'Loading Response', targetedDeviation: 'Reduced Speed'   },
  'ex-014': { gaitPhase: 'Push-Off',         targetedDeviation: 'Reduced Speed'   },
  'ex-015': { gaitPhase: 'Loading Response', targetedDeviation: 'Reduced Speed'   },
  'ex-016': { gaitPhase: 'Loading Response', targetedDeviation: 'Gait Asymmetry'  },
  'ex-017': { gaitPhase: 'Push-Off',         targetedDeviation: 'Short Stride'    },
  'ex-018': { gaitPhase: 'Mid-Stance',       targetedDeviation: 'Gait Asymmetry'  },
  'ex-022': { gaitPhase: 'Swing Phase',      targetedDeviation: 'Gait Asymmetry'  },
  'ex-023': { gaitPhase: 'Mid-Stance',       targetedDeviation: 'Poor Stability'  },
};

const EXERCISES = [
  // ── Balance & Symmetry ───────────────────────────────────────────────
  {
    id: 'ex-001',
    name: 'Single-Leg Stance',
    category: 'balance',
    targetMuscleOrFunction: 'Hip stabilizers, ankle dorsiflexors, foot intrinsic muscles',
    description:
      'Stand on one leg to train the hip and ankle stability required during the single-support phase of gait. Deficits in single-limb stability are a primary cause of asymmetric gait and lateral trunk sway after stroke.',
    instructions: [
      'Stand near a wall or sturdy chair for safety.',
      'Shift your weight onto one leg and slowly lift the other foot 2–3 inches off the floor.',
      'Hold the position, keeping your hips level and pelvis square — do not hike one hip.',
      'Lower your foot and repeat on the other side.',
    ],
    reps: '3 sets × 30 seconds each side',
    duration: '5–8 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-male',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },
  {
    id: 'ex-002',
    name: 'Tandem Walking (Heel-to-Toe)',
    category: 'balance',
    targetMuscleOrFunction: 'Ankle stabilizers, hip abductors, dynamic mediolateral balance',
    description:
      'Walk in a straight line placing the heel of one foot directly in front of the toes of the other. Challenges the mediolateral balance and precise foot-placement accuracy critical for safe community ambulation.',
    instructions: [
      'Place a strip of tape on the floor as a guide line.',
      'Place your heel directly in front of and touching the toes of your other foot.',
      'Walk forward slowly for 10 steps, then turn and walk back.',
      'Keep your gaze forward; do not look down at your feet.',
    ],
    reps: '3 sets × 10 steps',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-walking',
    relatedProblems: ['poor_stability', 'asymmetric_gait'],
  },
  {
    id: 'ex-003',
    name: 'Weight-Shifting Drills',
    category: 'balance',
    targetMuscleOrFunction: 'Gluteus medius, hip abductors, lateral ankle stabilizers',
    description:
      'Practice shifting body weight from side to side and front to back to retrain the symmetrical weight distribution needed for balanced gait initiation and mid-stance stability. Directly corrects the weight-bearing asymmetry common after stroke.',
    instructions: [
      'Stand with feet shoulder-width apart, knees slightly bent.',
      'Slowly shift your weight to the right foot, lifting the left foot slightly off the floor.',
      'Hold for 3 seconds with hips level, then shift to the left.',
      'Repeat, then perform forward and backward weight shifts using the same hold.',
    ],
    reps: '3 sets × 10 shifts each direction',
    duration: '5–7 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-arrows-alt-h',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },
  {
    id: 'ex-004',
    name: 'Foam Pad Balance Training',
    category: 'balance',
    targetMuscleOrFunction: 'Ankle plantar/dorsiflexors, peroneal muscles, proprioceptive pathways',
    description:
      'Standing on a foam pad trains the ankle and foot reflexes responsible for correcting body sway during the stance phase of gait. Directly improves the reactive balance responses used on uneven terrain and curbs.',
    instructions: [
      'Place a foam balance pad on the floor near a wall.',
      'Step onto the pad with both feet, keeping knees slightly bent.',
      'Hold your balance for up to 30 seconds without holding onto anything.',
      'Progress to single-leg stance on the pad as stability improves.',
    ],
    reps: '3 sets × 30 seconds',
    duration: '5 minutes',
    difficulty: 'Advanced',
    icon: 'fas fa-circle',
    relatedProblems: ['poor_stability', 'irregular_steps'],
  },
  {
    id: 'ex-019',
    name: 'Star Excursion Balance Reach',
    category: 'balance',
    targetMuscleOrFunction: 'Hip stabilizers, knee extensors, ankle dorsiflexors',
    description:
      'While standing on one leg, reach the free foot in multiple directions along the floor. Trains the dynamic stability and lower-limb coordination required during the swing phase of gait, and reveals asymmetries between limbs.',
    instructions: [
      'Stand on your right leg at the center of an imaginary star pattern.',
      'Reach your left foot as far forward as possible while maintaining balance, then return to center.',
      'Repeat reaching to the side and then diagonally (6 directions total).',
      'Complete all directions, then switch to stand on the left leg.',
    ],
    reps: '3 sets × 6 directions each leg',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-star',
    relatedProblems: ['asymmetric_gait', 'poor_stability', 'irregular_steps'],
  },

  // ── Speed & Rhythm ───────────────────────────────────────────────────
  {
    id: 'ex-005',
    name: 'Metronome-Paced Walking',
    category: 'speed',
    targetMuscleOrFunction: 'Cadence regulation, hip flexors, knee extensors',
    description:
      'Walk to the beat of a metronome, starting at your comfortable cadence and progressively increasing the tempo. Rhythmic auditory stimulation is evidence-based for improving step cadence and inter-limb symmetry in stroke gait rehabilitation.',
    instructions: [
      'Set a free metronome app to your current comfortable cadence (e.g., 80 bpm).',
      'Walk to the beat, matching each foot strike to a click.',
      'Every 2 minutes, increase the tempo by 5 bpm.',
      'Continue for the full session; reduce tempo if form breaks down.',
    ],
    reps: 'Continuous walking',
    duration: '10–15 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-music',
    relatedProblems: ['slow_cadence'],
  },
  {
    id: 'ex-006',
    name: 'High Knee Marching',
    category: 'speed',
    targetMuscleOrFunction: 'Hip flexors (iliopsoas), knee extensors, tibialis anterior',
    description:
      'March in place lifting knees to hip height with active ankle dorsiflexion on each lift. Builds the hip flexor power and foot-clearance height needed for a faster, higher-clearing swing phase that reduces tripping risk.',
    instructions: [
      'Stand tall with feet hip-width apart, hands resting lightly on a support if needed.',
      'Lift your right knee to hip height while pulling the toes up (dorsiflex the ankle), then lower.',
      'Alternate legs in a controlled marching rhythm.',
      'Focus on driving the knee up — the quality of lift matters more than speed.',
    ],
    reps: '3 sets × 20 marches (10 each leg)',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-running',
    relatedProblems: ['slow_cadence', 'slow_velocity', 'foot_drop'],
  },
  {
    id: 'ex-007',
    name: 'Interval Speed Walking',
    category: 'speed',
    targetMuscleOrFunction: 'Quadriceps, hamstrings, hip flexors, gastrocnemius',
    description:
      'Alternate between comfortable pace and brisk walking in timed intervals. Builds the lower-limb cardiovascular endurance and muscular power needed to sustain community-level walking speeds over longer distances.',
    instructions: [
      'Warm up with 2 minutes of comfortable walking.',
      'Walk briskly for 1 minute — lengthen your stride and increase your cadence.',
      'Return to comfortable pace for 2 minutes to recover.',
      'Repeat the cycle 4–5 times, then cool down with slow walking.',
    ],
    reps: '4–5 intervals',
    duration: '15–20 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-stopwatch',
    relatedProblems: ['slow_cadence', 'slow_velocity'],
  },
  {
    id: 'ex-008',
    name: 'Quick Stepping Drills',
    category: 'speed',
    targetMuscleOrFunction: 'Tibialis anterior, peroneal muscles, hip flexors',
    description:
      'Perform rapid small alternating steps in place, emphasizing brisk foot placement. Trains the neuromuscular response speed of the lower limb needed to produce faster, reactive foot-placement during ambulation.',
    instructions: [
      'Stand in an open area with feet hip-width apart.',
      'Rapidly alternate small steps as fast as you safely can for 15 seconds.',
      'Rest for 30 seconds, breathing in a controlled manner.',
      'Repeat for the prescribed sets, prioritising quick lift over large movement.',
    ],
    reps: '4 sets × 15 seconds',
    duration: '5 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-bolt',
    relatedProblems: ['slow_cadence', 'slow_velocity'],
  },

  // ── Gait Pattern ─────────────────────────────────────────────────────
  {
    id: 'ex-009',
    name: 'Lunge Walking',
    category: 'gait',
    targetMuscleOrFunction: 'Quadriceps, gluteus maximus, hip flexors, hamstrings',
    description:
      'Walk forward taking exaggerated lunge steps to encourage a longer stride length and full hip extension. Directly addresses the short-stride and flexed-hip posture common after stroke and lower-limb injury.',
    instructions: [
      'Stand upright in an open hallway with feet together.',
      'Step forward with one leg into a deep lunge — front knee over the ankle, back knee near the floor.',
      'Push off the back foot and step through into the next lunge.',
      'Maintain an upright torso throughout; avoid leaning forward.',
    ],
    reps: '3 sets × 10 lunges (5 each leg)',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-shoe-prints',
    relatedProblems: ['short_stride'],
  },
  {
    id: 'ex-010',
    name: 'Obstacle Stepping',
    category: 'gait',
    targetMuscleOrFunction: 'Hip flexors, knee extensors, tibialis anterior',
    description:
      'Step over small obstacles placed along a walking path to train the foot clearance and stride length needed for safe community ambulation. Directly targets the foot-drop and circumduction patterns by demanding active ankle dorsiflexion.',
    instructions: [
      'Place 4–5 small obstacles (rolled towels or foam blocks) in a line, spaced 1–2 feet apart.',
      'Walk along the line, stepping over each obstacle with exaggerated hip and knee flexion.',
      'Actively pull your toes up (dorsiflex the ankle) during each step-over.',
      'Turn and repeat; progress by increasing obstacle height gradually.',
    ],
    reps: '3 sets × 5 obstacle sets',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-road',
    relatedProblems: ['short_stride', 'irregular_steps', 'foot_drop'],
  },
  {
    id: 'ex-011',
    name: 'Heel-Strike Walking',
    category: 'gait',
    targetMuscleOrFunction: 'Tibialis anterior, gastrocnemius, ankle dorsi/plantarflexors',
    description:
      'Walk with an exaggerated heel-first landing and deliberate toe push-off to reinforce the normal gait loading pattern. Restores the heel-strike phase frequently lost after stroke, reducing flat-footed shuffling.',
    instructions: [
      'Stand at one end of a hallway.',
      'Step forward, landing clearly on your heel with toes pointing toward the ceiling.',
      'Roll your foot forward through the arch and push off firmly from the ball of the foot.',
      'Focus on a smooth, controlled heel-to-toe transition with every single step.',
    ],
    reps: '3 sets × 20 steps',
    duration: '7 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-step-forward',
    relatedProblems: ['short_stride', 'irregular_steps', 'foot_drop'],
  },
  {
    id: 'ex-012',
    name: 'Lateral Side-Stepping',
    category: 'gait',
    targetMuscleOrFunction: 'Hip abductors (gluteus medius), hip adductors, peroneal muscles',
    description:
      'Step sideways over a floor line to train lateral gait control needed for turning, navigating doorways, and community ambulation. Strengthens the hip stabilizers that prevent a Trendelenburg gait deviation and lateral trunk sway.',
    instructions: [
      'Place a strip of tape straight across the floor.',
      'Stand to the left; step sideways over the tape leading with the right foot.',
      'Bring the trailing foot to meet it, maintaining a small stance width.',
      'Return leading with the left foot. Repeat continuously.',
    ],
    reps: '3 sets × 10 crossings each side',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-arrows-alt-h',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },
  {
    id: 'ex-020',
    name: 'Backward Walking (Retro Gait)',
    category: 'gait',
    targetMuscleOrFunction: 'Quadriceps, tibialis anterior, hip extensors',
    description:
      'Walking backward preferentially recruits the quadriceps and tibialis anterior in patterns not achievable with forward walking alone. Retrains knee extension control and foot-clearance mechanics, and is used clinically to correct crouch-gait and improve terminal swing.',
    instructions: [
      'Stand in an open area with a clear, unobstructed path behind you.',
      'Reach back with one foot, landing toe-first then lowering the heel to the floor.',
      'Transfer weight backward and step through with the other foot.',
      'Keep your chin level and use a mirror or spotter for safety feedback.',
    ],
    reps: '3 sets × 20 steps (10 meters)',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-reply',
    relatedProblems: ['short_stride', 'slow_velocity', 'foot_drop'],
  },
  {
    id: 'ex-021',
    name: 'Ankle Dorsiflexion Exercises',
    category: 'gait',
    targetMuscleOrFunction: 'Tibialis anterior, extensor digitorum longus',
    description:
      'Isolate and strengthen the muscles that lift the front of the foot during the swing phase of gait. Directly targets foot-drop — the most prevalent gait deviation after stroke — restoring heel-strike and eliminating the trip hazard caused by a dragging toe.',
    instructions: [
      'Sit in a chair with feet flat on the floor.',
      'Keeping your heel planted, lift the front of your foot as high as possible.',
      'Hold for 3 seconds at the top, then lower slowly.',
      'Progress to standing with a light resistance band around the forefoot.',
    ],
    reps: '3 sets × 15 reps each foot',
    duration: '6 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-angle-double-up',
    relatedProblems: ['foot_drop', 'irregular_steps'],
  },

  // ── Strength & Endurance ─────────────────────────────────────────────
  {
    id: 'ex-013',
    name: 'Seated Knee Extensions',
    category: 'strength',
    targetMuscleOrFunction: 'Quadriceps (vastus medialis, rectus femoris)',
    description:
      'Seated knee extension isolates the quadriceps — the primary knee-stabilising muscle group for the loading-response and mid-stance phases of gait. Quadriceps weakness directly impairs step quality and elevates fall risk.',
    instructions: [
      'Sit in a sturdy chair with feet flat on the floor, back supported.',
      'Slowly straighten one knee until the leg is fully extended.',
      'Hold for 3 seconds, squeezing the quadriceps firmly at the top.',
      'Lower slowly over 3 counts, then complete all reps before switching legs.',
    ],
    reps: '3 sets × 12 reps each leg',
    duration: '8 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-chair',
    relatedProblems: ['slow_velocity', 'short_stride'],
  },
  {
    id: 'ex-014',
    name: 'Standing Calf Raises',
    category: 'strength',
    targetMuscleOrFunction: 'Gastrocnemius, soleus, tibialis posterior',
    description:
      'Rising onto the toes strengthens the plantar flexors responsible for the push-off phase of gait. Calf weakness leads to reduced walking speed, shorter stride length, and a flat-footed shuffle.',
    instructions: [
      'Stand behind a chair, holding the backrest lightly for balance only.',
      'Rise slowly onto the balls of both feet over 2 counts.',
      'Hold at the top for 2 seconds, maximally contracting the calves.',
      'Lower slowly back to the floor over 3 counts — control the descent.',
    ],
    reps: '3 sets × 15 reps',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-angle-double-up',
    relatedProblems: ['slow_velocity', 'short_stride'],
  },
  {
    id: 'ex-015',
    name: 'Sit-to-Stand Transfers',
    category: 'strength',
    targetMuscleOrFunction: 'Quadriceps, gluteus maximus, hip extensors',
    description:
      'Repeatedly standing from a chair without hand support builds the lower-limb power needed for independent gait initiation and functional daily transfers. The movement pattern directly mirrors the terminal stance phase of walking.',
    instructions: [
      'Sit at the edge of a sturdy chair, feet flat and hip-width apart.',
      'Lean slightly forward from the hips, shifting weight to your feet.',
      'Drive through your heels to stand, extending the hips and knees fully.',
      'Pause at the top, then lower slowly with control. Progress by crossing arms over chest.',
    ],
    reps: '3 sets × 10 reps',
    duration: '8 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-arrow-up',
    relatedProblems: ['slow_velocity', 'poor_stability'],
  },
  {
    id: 'ex-016',
    name: 'Step-Up Exercises',
    category: 'strength',
    targetMuscleOrFunction: 'Quadriceps, gluteus maximus, hip abductors',
    description:
      'Stepping up onto a low platform mimics stair climbing and builds the single-limb push-off and weight-acceptance strength that is required with every step in walking. Preferentially loads the weaker limb to correct gait asymmetry.',
    instructions: [
      'Stand in front of a low step (4–6 inches high), using a railing if needed.',
      'Step up leading with your weaker leg, driving through the heel to extend the knee fully.',
      'Bring the other foot up to the step, then step back down leading with the stronger leg.',
      'Keep the movement controlled; do not push off the trailing foot.',
    ],
    reps: '3 sets × 10 reps each leg',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-level-up-alt',
    relatedProblems: ['asymmetric_gait', 'slow_velocity'],
  },
  {
    id: 'ex-017',
    name: 'Glute Bridge',
    category: 'strength',
    targetMuscleOrFunction: 'Gluteus maximus, hamstrings, hip extensors',
    description:
      'Lifting the hips from a supine position strengthens the gluteus maximus and hamstrings — the muscles producing hip extension power during gait push-off. Weakness in these muscles causes a forward-trunk lean and reduced stride length.',
    instructions: [
      'Lie on your back with knees bent, feet flat on the floor hip-width apart.',
      'Squeeze your glutes and lift your hips until knees, hips, and shoulders form a straight line.',
      'Hold at the top for 3 seconds without arching your lower back.',
      'Lower slowly over 3 counts back to the floor.',
    ],
    reps: '3 sets × 12 reps',
    duration: '6 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-mountain',
    relatedProblems: ['slow_velocity', 'short_stride'],
  },
  {
    id: 'ex-018',
    name: 'Resistance Band Side Steps',
    category: 'strength',
    targetMuscleOrFunction: 'Gluteus medius, hip abductors, tensor fasciae latae',
    description:
      'Walking sideways against a resistance band around the ankles strengthens the gluteus medius — the primary muscle controlling pelvic drop during single-leg stance in gait. Weakness here causes the Trendelenburg gait deviation and excessive lateral trunk sway.',
    instructions: [
      'Place a light resistance band around both ankles.',
      'Stand with feet hip-width apart, knees slightly bent, in a quarter-squat position.',
      'Step sideways to the right for 10 steps, maintaining constant tension in the band.',
      'Return stepping to the left for 10 steps; do not let feet come together.',
    ],
    reps: '3 sets × 10 steps each direction',
    duration: '7 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-expand-arrows-alt',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },
  {
    id: 'ex-022',
    name: 'Hip Hike (Pelvic Drop) Drills',
    category: 'strength',
    targetMuscleOrFunction: 'Gluteus medius, hip abductors, quadratus lumborum',
    description:
      'Standing on one leg at the edge of a low step, deliberately raise and lower the pelvis on the free side to target the hip hiking action required for foot clearance during the swing phase. Directly corrects the Trendelenburg (hip-drop) gait deviation common after stroke.',
    instructions: [
      'Stand sideways on a low step, with your weaker leg on the edge and the stronger leg in the air.',
      'Let the stronger-side hip drop below the step level (controlled Trendelenburg).',
      'Use the standing leg\'s hip abductors to hike that hip back up to level.',
      'Maintain an upright posture — isolate the hip movement, do not lean sideways.',
    ],
    reps: '3 sets × 12 reps each side',
    duration: '7 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-level-up-alt',
    relatedProblems: ['asymmetric_gait', 'irregular_steps', 'poor_stability'],
  },
  {
    id: 'ex-023',
    name: 'Terminal Knee Extension (TKE)',
    category: 'strength',
    targetMuscleOrFunction: 'Vastus medialis oblique (VMO), hamstrings',
    description:
      'Using a resistance band anchored at knee height, practice full terminal knee extension to strengthen the VMO and restore the knee-locking mechanism used during weight acceptance and mid-stance in gait. Reduces knee buckling and instability in the stance phase.',
    instructions: [
      'Loop a resistance band around a fixed anchor at knee height. Step into the loop, placing it behind your knee.',
      'Stand slightly back to create band tension with the knee slightly bent.',
      'Straighten (extend) the knee fully against the resistance, squeezing the VMO.',
      'Hold for 2 seconds, then slowly release. Keep the movement isolated to the knee joint.',
    ],
    reps: '3 sets × 15 reps each leg',
    duration: '6 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-compress-arrows-alt',
    relatedProblems: ['poor_stability', 'slow_velocity', 'asymmetric_gait'],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ExercisePlans({ onLogout, onFacilityExit }) {
  const navigate = useNavigate();
  const { selectCategory } = useTherapyCategory();

  // Keep therapy context in sync
  useEffect(() => {
    selectCategory('physical');
  }, [selectCategory]);

  // State
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDifficulty, setActiveDifficulty] = useState(null); // null = all
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load gait analysis result from localStorage (set by GaitRecording page)
  const gaitResult = useMemo(() => {
    try {
      const saved = localStorage.getItem('gaitAnalysisResult');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Derive recommended exercise IDs from gait analysis detected problems
  const recommendedIds = useMemo(() => {
    if (!gaitResult?.detected_problems) return new Set();
    const problemNames = gaitResult.detected_problems.map((p) => p.problem);
    const ids = new Set();
    EXERCISES.forEach((ex) => {
      if (ex.relatedProblems.some((rp) => problemNames.includes(rp))) {
        ids.add(ex.id);
      }
    });
    return ids;
  }, [gaitResult]);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return EXERCISES.filter((ex) => {
      const matchesCategory = activeCategory === 'all' || ex.category === activeCategory;
      const matchesDifficulty = !activeDifficulty || ex.difficulty === activeDifficulty;
      const matchesSearch =
        !searchQuery ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.targetMuscleOrFunction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesDifficulty && matchesSearch;
    });
  }, [activeCategory, activeDifficulty, searchQuery]);

  // Sort recommended to the top when "all" category is selected
  const sortedExercises = useMemo(() => {
    if (recommendedIds.size === 0) return filteredExercises;
    return [...filteredExercises].sort((a, b) => {
      const aRec = recommendedIds.has(a.id) ? 0 : 1;
      const bRec = recommendedIds.has(b.id) ? 0 : 1;
      return aRec - bRec;
    });
  }, [filteredExercises, recommendedIds]);

  const toggleExpand = (id) => {
    setExpandedExercise((prev) => (prev === id ? null : id));
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'Beginner':
        return '#388e3c';
      case 'Intermediate':
        return '#e8b04e';
      case 'Advanced':
        return '#ce3630';
      default:
        return '#666';
    }
  };

  return (
    <div className="exercise-plans-page">
      <Header onLogout={onLogout} onFacilityExit={onFacilityExit} />

      <main className="exercise-plans-main">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="ep-header-section">
          <div className="ep-header-icon">
            <i className="fas fa-dumbbell"></i>
          </div>
          <h1 className="ep-title">Exercise Plans</h1>
          <p className="ep-subtitle">
            Stroke Rehabilitation — Targeted exercises to improve your mobility
            and address detected gait problems
          </p>

          {gaitResult && recommendedIds.size > 0 && (
            <div className="ep-recommendation-banner">
              <i className="fas fa-star"></i>
              <span>
                Based on your latest gait analysis, <strong>{recommendedIds.size} exercises</strong> are
                recommended for you. They are highlighted below.
              </span>
            </div>
          )}

          {/* ── Detected Issues strip ────────────────────────────── */}
          {gaitResult?.detected_problems?.length > 0 && (
            <div className="ep-detected-issues">
              <span className="ep-issues-label">
                <i className="fas fa-exclamation-circle"></i> Detected Issues:
              </span>
              <div className="ep-issue-tags">
                {gaitResult.detected_problems.map((p) => {
                  const meta = PROBLEM_LABELS[p.problem];
                  return (
                    <span
                      key={p.problem}
                      className={`ep-issue-tag ${p.severity}`}
                      title={p.description}
                    >
                      {meta && <i className={meta.icon}></i>}
                      {meta ? meta.label : p.problem.replace(/_/g, ' ')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="ep-filters">
          {/* Search */}
          <div className="ep-search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="ep-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="ep-category-tabs">
            {EXERCISE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`ep-cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <i className={cat.icon}></i>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Difficulty Pills */}
          <div className="ep-difficulty-pills">
            <span className="ep-pill-label">Difficulty:</span>
            <button
              className={`ep-diff-pill ${!activeDifficulty ? 'active' : ''}`}
              onClick={() => setActiveDifficulty(null)}
            >
              All
            </button>
            {DIFFICULTY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                className={`ep-diff-pill ${activeDifficulty === lvl ? 'active' : ''}`}
                style={
                  activeDifficulty === lvl
                    ? { background: getDifficultyColor(lvl), borderColor: getDifficultyColor(lvl) }
                    : {}
                }
                onClick={() => setActiveDifficulty(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* ── Exercise Grid ───────────────────────────────────────── */}
        {sortedExercises.length === 0 ? (
          <div className="ep-empty-state">
            <i className="fas fa-search"></i>
            <p>No exercises match your filters. Try adjusting the category or difficulty level.</p>
          </div>
        ) : (
          <div className="ep-exercise-grid">
            {sortedExercises.map((ex) => {
              const isRecommended = recommendedIds.has(ex.id);
              const isExpanded = expandedExercise === ex.id;

              return (
                <div
                  key={ex.id}
                  className={`ep-exercise-card ${isRecommended ? 'recommended' : ''} ${isExpanded ? 'expanded' : ''}`}
                >
                  {isRecommended && (
                    <div className="ep-recommended-badge">
                      <i className="fas fa-star"></i> Recommended
                    </div>
                  )}

                  <div className="ep-card-header">
                    <div className="ep-card-icon" style={{ color: getDifficultyColor(ex.difficulty) }}>
                      <i className={ex.icon}></i>
                    </div>
                    <div className="ep-card-title-group">
                      <h3 className="ep-card-title">{ex.name}</h3>
                      <span
                        className="ep-difficulty-badge"
                        style={{ background: getDifficultyColor(ex.difficulty) }}
                      >
                        {ex.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="ep-card-target">
                    <i className="fas fa-crosshairs"></i>
                    <span>{ex.targetMuscleOrFunction}</span>
                  </div>

                  {/* Gait phase badge */}
                  {EXERCISE_METADATA[ex.id]?.gaitPhase && (
                    <div className="ep-card-phase-badge">
                      <i className="fas fa-shoe-prints"></i>
                      <span>{EXERCISE_METADATA[ex.id].gaitPhase}</span>
                    </div>
                  )}

                  <p className="ep-card-description">{ex.description}</p>

                  {/* Addresses tag – shown only on recommended cards */}
                  {isRecommended && gaitResult && (() => {
                    const addressed = gaitResult.detected_problems
                      .filter((p) => ex.relatedProblems.includes(p.problem))
                      .map((p) => PROBLEM_LABELS[p.problem]?.label ?? p.problem.replace(/_/g, ' '));
                    return addressed.length > 0 ? (
                      <div className="ep-addresses-tag">
                        <i className="fas fa-check-circle"></i>
                        <span>Addresses: {addressed.join(' · ')}</span>
                      </div>
                    ) : null;
                  })()}

                  <div className="ep-card-meta">
                    <div className="ep-meta-item">
                      <i className="fas fa-redo"></i>
                      <span>{ex.reps}</span>
                    </div>
                    <div className="ep-meta-item">
                      <i className="fas fa-clock"></i>
                      <span>{ex.duration}</span>
                    </div>
                  </div>

                  {/* Expandable Instructions */}
                  <button className="ep-expand-btn" onClick={() => toggleExpand(ex.id)}>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                    {isExpanded ? 'Hide Instructions' : 'Show Instructions'}
                  </button>

                  {isExpanded && (
                    <div className="ep-instructions">
                      <h4>Step-by-Step Instructions</h4>
                      <ol>
                        {ex.instructions.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Back Button ─────────────────────────────────────────── */}
        <div className="ep-actions">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i>
            Back to Results
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="ep-footer">
        <div className="ep-footer-container">
          <p>&copy; 2025 CVAPed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default ExercisePlans;
