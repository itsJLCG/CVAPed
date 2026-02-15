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

const EXERCISES = [
  // ── Balance & Symmetry ───────────────────────────────────────────────
  {
    id: 'ex-001',
    name: 'Single-Leg Stance',
    category: 'balance',
    targetMuscleOrFunction: 'Hip stabilizers, ankle proprioception',
    description:
      'Stand on one leg while maintaining balance. Use a wall or chair for support if needed. Focus on keeping your hips level and body upright.',
    instructions: [
      'Stand near a wall or sturdy chair for safety.',
      'Shift your weight onto one leg and slowly lift the other foot off the floor.',
      'Hold the position, keeping your hips level.',
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
    targetMuscleOrFunction: 'Dynamic balance, core stability',
    description:
      'Walk in a straight line placing the heel of one foot directly in front of the toes of the other. This challenges balance and coordination used during normal gait.',
    instructions: [
      'Find a straight line on the floor or use tape.',
      'Place your heel directly touching the toes of your other foot.',
      'Walk forward slowly for 10 steps, then turn and walk back.',
      'Keep your gaze forward and arms relaxed at your sides.',
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
    targetMuscleOrFunction: 'Lateral hip muscles, weight transfer',
    description:
      'Practice shifting body weight from side to side and front to back to improve the symmetrical weight distribution needed for a balanced gait.',
    instructions: [
      'Stand with feet shoulder-width apart.',
      'Slowly shift your weight to the right foot, lifting the left foot slightly.',
      'Hold for 3 seconds, then shift to the left.',
      'Repeat, then shift forward and backward the same way.',
    ],
    reps: '3 sets × 10 shifts each direction',
    duration: '5–7 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-arrows-alt-h',
    relatedProblems: ['asymmetric_gait'],
  },
  {
    id: 'ex-004',
    name: 'BOSU Ball Balance Training',
    category: 'balance',
    targetMuscleOrFunction: 'Ankle stabilizers, proprioception, vestibular system',
    description:
      'Stand on an unstable surface (BOSU ball or foam pad) to challenge your balance system at a higher level. Develops the reflexive ankle and hip strategies needed to prevent falls.',
    instructions: [
      'Place a BOSU ball flat-side up on the floor near a wall.',
      'Step onto the ball with both feet, keeping knees slightly bent.',
      'Hold your balance for up to 30 seconds.',
      'Progress by closing your eyes or adding arm movements.',
    ],
    reps: '3 sets × 30 seconds',
    duration: '5 minutes',
    difficulty: 'Advanced',
    icon: 'fas fa-circle',
    relatedProblems: ['poor_stability'],
  },

  // ── Speed & Rhythm ───────────────────────────────────────────────────
  {
    id: 'ex-005',
    name: 'Metronome-Paced Walking',
    category: 'speed',
    targetMuscleOrFunction: 'Cadence regulation, rhythmic coordination',
    description:
      'Walk to the beat of a metronome app, starting at your comfortable pace and gradually increasing the tempo. Rhythmic auditory stimulation is evidence-based for improving cadence in stroke recovery.',
    instructions: [
      'Set a metronome app to your current comfortable cadence (e.g., 80 bpm).',
      'Walk to the beat, matching each step to a click.',
      'Every 2 minutes, increase the tempo by 5 bpm.',
      'Continue for the full session duration.',
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
    targetMuscleOrFunction: 'Hip flexors, cardiovascular endurance',
    description:
      'March in place lifting knees to hip height. Builds the hip flexor strength and coordination needed for a faster, more energetic gait cycle.',
    instructions: [
      'Stand tall with core engaged.',
      'Lift your right knee to hip height, then lower it.',
      'Alternate legs in a marching rhythm.',
      'Use arm swing naturally for balance.',
    ],
    reps: '3 sets × 20 marches (10 each leg)',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-running',
    relatedProblems: ['slow_cadence', 'slow_velocity'],
  },
  {
    id: 'ex-007',
    name: 'Interval Speed Walking',
    category: 'speed',
    targetMuscleOrFunction: 'Cardiovascular fitness, fast-twitch muscle fibers',
    description:
      'Alternate between comfortable walking pace and brisk walking in timed intervals. Builds the endurance and power needed for functional walking speed.',
    instructions: [
      'Warm up with 2 minutes of comfortable walking.',
      'Walk briskly for 1 minute (push your pace).',
      'Return to comfortable pace for 2 minutes.',
      'Repeat the cycle 4–5 times, then cool down.',
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
    targetMuscleOrFunction: 'Foot speed, neuromuscular coordination',
    description:
      'Perform rapid small steps in place or across a short distance. Trains the nervous system to produce faster motor commands to the legs.',
    instructions: [
      'Stand in an open area with feet hip-width apart.',
      'Rapidly alternate small steps as fast as you safely can for 15 seconds.',
      'Rest for 30 seconds.',
      'Repeat for the prescribed sets.',
    ],
    reps: '4 sets × 15 seconds',
    duration: '5 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-bolt',
    relatedProblems: ['slow_cadence'],
  },

  // ── Gait Pattern ─────────────────────────────────────────────────────
  {
    id: 'ex-009',
    name: 'Lunge Walking',
    category: 'gait',
    targetMuscleOrFunction: 'Quadriceps, glutes, hip flexor flexibility',
    description:
      'Walk forward taking exaggerated lunge steps. Encourages a longer stride length and improves hip flexibility — directly addressing the short-stride pattern common after stroke.',
    instructions: [
      'Stand upright with feet together.',
      'Step forward with one leg into a deep lunge, keeping your front knee over the ankle.',
      'Push off the back foot and step through into the next lunge.',
      'Continue for the prescribed distance, then rest.',
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
    targetMuscleOrFunction: 'Hip flexors, knee extensors, spatial awareness',
    description:
      'Step over small obstacles (foam blocks, rolled towels) placed along a walking path. Trains the leg clearance and stride length needed for safe, functional walking.',
    instructions: [
      'Place 4–5 small obstacles (e.g., rolled towels) in a line, spaced 1–2 feet apart.',
      'Walk along the line, stepping over each obstacle with exaggerated hip and knee flexion.',
      'Turn around and repeat.',
      'Progress by increasing obstacle height.',
    ],
    reps: '3 sets × 5 obstacles',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-road',
    relatedProblems: ['short_stride', 'irregular_steps'],
  },
  {
    id: 'ex-011',
    name: 'Heel-to-Toe Exaggerated Walking',
    category: 'gait',
    targetMuscleOrFunction: 'Ankle dorsiflexors, calf flexibility',
    description:
      'Walk forward striking with the heel first and rolling through the foot to push off with the toes. Reinforces the normal heel-strike gait pattern that is often lost after stroke.',
    instructions: [
      'Stand at one end of a hallway.',
      'Step forward landing clearly on your heel.',
      'Roll your foot forward and push off firmly from your toes.',
      'Focus on a smooth transition from heel to toe with each step.',
    ],
    reps: '3 sets × 20 steps',
    duration: '7 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-step-forward',
    relatedProblems: ['short_stride'],
  },
  {
    id: 'ex-012',
    name: 'Lateral Stepping Over Line',
    category: 'gait',
    targetMuscleOrFunction: 'Hip abductors, lateral stability',
    description:
      'Step sideways over a line on the floor, training the lateral movement patterns needed for turning, sidestepping, and functional mobility.',
    instructions: [
      'Place a strip of tape on the floor.',
      'Stand next to the tape. Step sideways over it, leading with one foot.',
      'Bring the trailing foot to meet it.',
      'Step back over, leading with the other foot.',
    ],
    reps: '3 sets × 10 crossings',
    duration: '5 minutes',
    difficulty: 'Beginner',
    icon: 'fas fa-arrows-alt-h',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },

  // ── Strength & Endurance ─────────────────────────────────────────────
  {
    id: 'ex-013',
    name: 'Seated Knee Extensions',
    category: 'strength',
    targetMuscleOrFunction: 'Quadriceps',
    description:
      'Strengthen the quadriceps from a seated position. Essential for knee stability and generating the push-off force needed during walking.',
    instructions: [
      'Sit in a sturdy chair with feet flat on the floor.',
      'Slowly straighten one knee until the leg is fully extended.',
      'Hold for 3 seconds, then lower slowly.',
      'Complete all reps on one side before switching.',
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
    targetMuscleOrFunction: 'Gastrocnemius, soleus (calf muscles)',
    description:
      'Rise onto your toes and lower back down. The calf muscles are critical for the push-off phase of gait and for maintaining balance.',
    instructions: [
      'Stand behind a chair, holding the backrest for support.',
      'Rise onto the balls of both feet.',
      'Hold at the top for 2 seconds.',
      'Slowly lower your heels back to the floor.',
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
    targetMuscleOrFunction: 'Quadriceps, glutes, core',
    description:
      'Practice standing up from and sitting down in a chair without using your hands. This functional exercise builds the lower-body strength needed for independent mobility.',
    instructions: [
      'Sit at the edge of a sturdy chair, feet flat and hip-width apart.',
      'Lean slightly forward and push through your heels to stand up.',
      'Pause at the top, then slowly sit back down with control.',
      'Progress by crossing your arms over your chest.',
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
    targetMuscleOrFunction: 'Quadriceps, glutes, hip stabilizers',
    description:
      'Step up onto a low step or platform and step back down. Mimics stair climbing and builds the single-leg strength critical for walking.',
    instructions: [
      'Stand in front of a low step (4–6 inches high).',
      'Step up with your weaker leg first, bringing the other foot up.',
      'Step back down, leading with the stronger leg.',
      'Keep your movements controlled and use a railing if needed.',
    ],
    reps: '3 sets × 10 reps each leg',
    duration: '8 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-level-up-alt',
    relatedProblems: ['asymmetric_gait', 'slow_velocity'],
  },
  {
    id: 'ex-017',
    name: 'Bridging (Glute Bridge)',
    category: 'strength',
    targetMuscleOrFunction: 'Glutes, hamstrings, core',
    description:
      'Lying on your back, lift your hips off the floor. Strengthens the posterior chain muscles that provide hip extension power during the push-off phase of walking.',
    instructions: [
      'Lie on your back with knees bent and feet flat on the floor.',
      'Squeeze your glutes and lift your hips toward the ceiling.',
      'Hold at the top for 3 seconds.',
      'Lower slowly back to the starting position.',
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
    targetMuscleOrFunction: 'Hip abductors (gluteus medius)',
    description:
      'Walk sideways against the resistance of an elastic band placed around the ankles. Strengthens the hip abductors that control pelvic stability during single-leg stance in gait.',
    instructions: [
      'Place a resistance band around both ankles.',
      'Stand with feet hip-width apart, knees slightly bent.',
      'Step sideways to the right for 10 steps.',
      'Return stepping to the left for 10 steps.',
    ],
    reps: '3 sets × 10 steps each direction',
    duration: '7 minutes',
    difficulty: 'Intermediate',
    icon: 'fas fa-expand-arrows-alt',
    relatedProblems: ['asymmetric_gait', 'poor_stability'],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ExercisePlans({ onLogout }) {
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
      <Header onLogout={onLogout} />

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

                  <p className="ep-card-description">{ex.description}</p>

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
