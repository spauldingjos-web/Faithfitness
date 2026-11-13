import { ChristianGenre } from './musicCatalog';

export interface CalisthenicsExercise {
  id: string;
  name: string;
  category:
    | 'Warm-Up & Flow'
    | 'Back & Posture'
    | 'Upper Push'
    | 'Core & Sculpt'
    | 'Legs & Glutes'
    | 'Optional Dumbbells';
  sets: number;
  repsOrHold: string;
  restSeconds: number;
  tempo: string;
  equipment: string;
  formCue: string;
}

export interface BikeProtocol {
  title: string;
  durationMinutes: number;
  targetCadenceRpm: string;
  intensityZone: string;
  intervalsSummary: string;
}

export interface DailyDevotional {
  scriptureRef: string;
  scriptureText: string;
  title: string;
  reflection: string;
  prayerFocus: string;
  dailyDisciplineChallenge: string;
}

export interface CalisthenicsDayPlan {
  dayNumber: number; // 1 to 365
  quarterNumber: 1 | 2 | 3 | 4;
  phaseTitle: string;
  weekNumber: number;
  dayOfWeekLabel: string;
  workoutTitle: string;
  focusArea:
    | 'Upper Push, Chest & Arm Tone'
    | 'Back Posture, Shoulders & Light Tone'
    | 'Legs, Glutes & Core Sculpt'
    | 'Cardio Burn & Optional Bike Ride'
    | 'Arms, Core & Optional Dumbbell Finishers'
    | 'Full-Body Toning Circuit'
    | 'Active Recovery, Stretch & Deep Selah';
  difficultyBadge: 'Beginner' | 'Tone Builder' | 'Sculpt & Strength' | 'Full Definition';
  estimatedMinutes: number;
  targetBpm: number;
  recommendedGenre: Exclude<ChristianGenre, 'all'>;
  exercises: CalisthenicsExercise[];
  bikeProtocol: BikeProtocol;
  devotional: DailyDevotional;
}

const SCRIPTURE_VAULT: {
  ref: string;
  text: string;
  title: string;
  reflection: string;
  prayer: string;
  challenge: string;
}[] = [
  {
    ref: '1 Corinthians 9:25–27',
    text: 'Everyone who competes in the games goes into strict training. They do it to get a crown that will not last, but we do it to get a crown that will last forever.',
    title: 'Small Faithful Steps Build Real Strength',
    reflection:
      'You do not need fancy equipment or extreme workouts to honor your body. Showing up on your living room floor with steady squats, controlled push-ups, and clean breathing trains your mind to choose consistency over excuses.',
    prayer:
      'Lord, build quiet consistency in my body and spirit today. Let every steady repetition remind me that small daily obedience adds up.',
    challenge: 'Slow & Steady Rule: Lower slowly for 2–3 seconds on every rep today instead of rushing through.',
  },
  {
    ref: '2 Samuel 22:34–35',
    text: 'He makes my feet like the feet of a deer; He causes me to stand on the heights. He trains my hands for battle; my arms can bend a bow of bronze.',
    title: 'Steady Ground & Everyday Strength',
    reflection:
      'Strength is not for showing off; it is for energy, posture, and readiness to serve others well. Whether holding a calm floor plank, stepping into lunges, or going for a brisk walk, God honors the care you put into the frame He gave you.',
    prayer:
      'Father, steady my posture, strengthen my core, and give me energy to serve my family and community today.',
    challenge: 'Finish your session with a calm 20-second posture hold (standing tall or forearm plank) while reciting today’s verse.',
  },
  {
    ref: 'Hebrews 12:1–2',
    text: 'Let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us.',
    title: 'Rhythm Over Rush',
    reflection:
      'During a steady walk, bike spin, or bodyweight circuit, trying to sprint from second one burns you out early. Spiritual endurance works the same way: find a sustainable pace, breathe evenly, and keep moving forward.',
    prayer:
      'Jesus, quiet the rush and comparison in my mind today. Set my rhythm to Your grace as I move through this workout.',
    challenge: 'Keep smooth, relaxed nasal breathing during your warm-up and first two exercises.',
  },
  {
    ref: 'Isaiah 40:29–31',
    text: 'He gives strength to the weary and increases the power of the weak. Even youths grow tired and weary, and young men stumble and fall; but those who hope in the Lord will renew their strength.',
    title: 'Renewed Strength Set by Set',
    reflection:
      'Motivation naturally dips after the first couple of weeks when legs feel heavy or arms start to tone up. Lasting energy comes when training is rooted in worship and gratitude rather than perfection.',
    prayer:
      'Lord, be my strength today. When muscles start to feel tired, remind me to breathe, stay patient, and thank You for progress.',
    challenge: 'During rest breaks today, put your phone down and take three slow, grateful breaths.',
  },
  {
    ref: 'Proverbs 24:10',
    text: 'If you falter in a time of trouble, how small is your strength!',
    title: 'Calm Under Gentle Tension',
    reflection:
      'Simple floor holds like planks, wall sits, and glute bridges teach a helpful lesson: staying calm and steady while muscles work takes more focus than rushing. Inner peace works the very same way.',
    prayer:
      'God of Peace, teach me to stay calm, steady, and grounded when life feels demanding.',
    challenge: 'Keep your shoulders relaxed away from your ears during every plank or bridge hold today.',
  },
  {
    ref: 'Philippians 3:13–14',
    text: 'Forgetting what is behind and straining toward what is ahead, I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.',
    title: 'Progress Over Perfection',
    reflection:
      'If a push-up starts against a wall or on your knees today, that is right where strong foundations begin. Every week you grow a little steadier, tone a little deeper, and build confidence for the next step.',
    prayer:
      'Lord, thank You for meeting me right where I am today while gently growing me stronger tomorrow.',
    challenge: 'Focus on clean, comfortable range of motion today—never force pain, just aim for one extra clean rep.',
  },
  {
    ref: 'Psalm 144:1',
    text: 'Praise be to the Lord my Rock, who trains my hands for war, my fingers for battle.',
    title: 'Rest, Mobility & Temple Care',
    reflection:
      'Gentle stretching, walking, and recovery days are where your muscles actually rebuild and tone up. Honoring rest keeps your joints happy so you can stay consistent all 365 days of the year.',
    prayer:
      'Creator of my frame, refresh my joints, relax tight muscles, and restore my mind as I rest in Your Word.',
    challenge: 'Spend 10–15 relaxed minutes stretching your hips, shoulders, and back while listening to Worship.',
  },
];

interface PhaseConfig {
  quarter: 1 | 2 | 3 | 4;
  title: string;
  difficulty: CalisthenicsDayPlan['difficultyBadge'];
  pushMove: [string, string, string];
  backMove: [string, string, string];
  legMove: [string, string, string];
  coreMove: [string, string, string];
  toneMove: [string, string, string];
  cardioMove: [string, string];
}

const PHASES: PhaseConfig[] = [
  {
    quarter: 1,
    title: 'Phase I (Days 1–90): Beginner Foundation & Joint Awakening',
    difficulty: 'Beginner',
    pushMove: [
      'Wall Push-Ups (Gentle Incline)',
      'Modified Knee Push-Ups (Slow Control)',
      'Standing Wall Shoulder Taps & Press',
    ],
    backMove: [
      'Scapular Wall Slides (Upper Back & Posture)',
      'Prone Floor W-Squeeze (No Equipment Back Tone)',
      'Standing Bent-Over Y-T Raises (Optional Light Dumbbells or Bodyweight)',
    ],
    legMove: [
      'Box / Chair-Depth Bodyweight Squats (No Chair Needed)',
      'Floor Glute Bridges (2-Second Top Squeeze)',
      'Supported Reverse Step-Back Lunges',
    ],
    coreMove: [
      'Knee Forearm Plank Hold',
      'Lying Dead Bug (Slow Opposite Arm & Leg)',
      'Bird-Dog Balance Hold',
    ],
    toneMove: [
      'Standing Arm Circles & Bicep Pulse (Optional Light Dumbbells)',
      'Floor Tricep Dip Prep (Hips Low, Bent Knees)',
      'Standing Lateral Raises (Optional Light Dumbbells or Isometric Squeeze)',
    ],
    cardioMove: ['Low-Impact Marching High Knees', 'Step-Out Jumping Jacks (No Jump Option)'],
  },
  {
    quarter: 2,
    title: 'Phase II (Days 91–180): Lean Tone Builder & Core Sculpting',
    difficulty: 'Tone Builder',
    pushMove: [
      'Incline or Standard Push-Ups (Clean Form)',
      'Slow Knee-to-Toes Push-Up Combos',
      'Elevated-Hip Pike Push-Up Prep',
    ],
    backMove: [
      'Prone Superman Lift & Swim (Upper & Lower Back Tone)',
      'Bent-Over Dumbbell Rows (Optional Dumbbells — or Prone Floor Pulls)',
      'Floor Snow Angels (Shoulder & Posture Sculpt)',
    ],
    legMove: [
      'Full-Depth Bodyweight Squats (with 1s Pause)',
      'Alternating Forward & Reverse Lunges',
      'Single-Leg Glute Bridges (Alternating)',
    ],
    coreMove: [
      'Full Toes Forearm Plank Hold',
      'Slow Bicycle Crunches (Controlled Twist)',
      'Side Plank Hold (Knees Bent or Straight)',
    ],
    toneMove: [
      'Dumbbell Curl to Overhead Press (Optional Light Dumbbells or Bodyweight)',
      'Push-Up Shoulder Taps (Core & Arm Stability)',
      'Reverse Squat + Overhead Reach',
    ],
    cardioMove: ['Rhythmic Jumping Jacks', 'Shadow Boxing & Squat Pulses'],
  },
  {
    quarter: 3,
    title: 'Phase III (Days 181–270): Athletic Toning & Deep Control',
    difficulty: 'Sculpt & Strength',
    pushMove: [
      'Tempo Push-Ups (3 Seconds Lowering)',
      'Close-Grip / Diamond Push-Ups (Tricep Tone)',
      'Pike Shoulder Push-Ups (Floor)',
    ],
    backMove: [
      'Single-Arm Bent-Over Dumbbell Row (Optional Dumbbell or Isometric Towel Pull)',
      'Prone Superman Holds + W-Pulls',
      'Reverse Plank Bridge (Posterior Chain & Shoulders)',
    ],
    legMove: [
      'Goblet Squats (Optional Dumbbell or Bodyweight Pulse Squats)',
      'Split Squat Pulses (No Bench Needed)',
      'Lateral Side Lunges (Inner Thigh & Glute Tone)',
    ],
    coreMove: [
      'Hollow Body Hold & Flutter Kicks',
      'Forearm Plank Hip Dips',
      'Jackknife / Seated V-Tucks (Hands Free Option)',
    ],
    toneMove: [
      'Dumbbell Hammer Curls & Lateral Raise Superset (Optional Dumbbells or Fast Iso-Holds)',
      'Inchworm Walkout to Push-Up',
      'Wall Sit Isometric Hold (Thigh Tone)',
    ],
    cardioMove: ['Slow-to-Fast Mountain Climbers', 'Soft-Landing Squat Jumps (or Fast Air Squats)'],
  },
  {
    quarter: 4,
    title: 'Phase IV (Days 271–365): Full-Body Definition & Stamina',
    difficulty: 'Full Definition',
    pushMove: [
      'Archer Push-Up Progressions (Side-to-Side)',
      'Dive-Bomber / Flow Push-Ups',
      'Deep Pike Shoulder Push-Ups (or Wall Hold)',
    ],
    backMove: [
      'Plank Renegade Rows (Optional Dumbbells — or Slow Plank Shoulder Taps)',
      'Prone Back-Extension Swimmers & Squeeze Hold',
      'Dumbbell Curl, Press & Rear-Delt Flow (Optional Dumbbells or Bodyweight)',
    ],
    legMove: [
      'Single-Leg Skater Squat Prep (Touch Floor Lightly)',
      'Split-Stance Lunge Switches (Low-Impact Option Available)',
      'Deep Sumo Squat Pulses + Calf Raise',
    ],
    coreMove: [
      'Hollow Body Rocks & Strict Hold',
      'Full V-Ups / V-Sit Compression Hold',
      'Long-Lever Plank Body Saw',
    ],
    toneMove: [
      'Dumbbell Squat-to-Press Thrusters (Optional Dumbbells or Squat-to-Reach)',
      'Push-Up + Side Plank Rotation',
      '60s Wall Sit with Alternating Heel Raises',
    ],
    cardioMove: ['Step-Back or Full Burpee Flow', 'Bear Crawl Forward & Back (Full Body Tone)'],
  },
];

const DAY_TYPES: {
  dayIndex: number;
  label: string;
  focusArea: CalisthenicsDayPlan['focusArea'];
  genre: Exclude<ChristianGenre, 'all'>;
  targetBpm: number;
  minutes: number;
}[] = [
  { dayIndex: 0, label: 'Day 1 · Mon', focusArea: 'Upper Push, Chest & Arm Tone', genre: 'rock', targetBpm: 124, minutes: 24 },
  { dayIndex: 1, label: 'Day 2 · Tue', focusArea: 'Back Posture, Shoulders & Light Tone', genre: 'hiphop', targetBpm: 120, minutes: 25 },
  { dayIndex: 2, label: 'Day 3 · Wed', focusArea: 'Legs, Glutes & Core Sculpt', genre: 'workout-edm', targetBpm: 128, minutes: 26 },
  { dayIndex: 3, label: 'Day 4 · Thu', focusArea: 'Cardio Burn & Optional Bike Ride', genre: 'hiphop', targetBpm: 132, minutes: 28 },
  { dayIndex: 4, label: 'Day 5 · Fri', focusArea: 'Arms, Core & Optional Dumbbell Finishers', genre: 'rock', targetBpm: 126, minutes: 25 },
  { dayIndex: 5, label: 'Day 6 · Sat', focusArea: 'Full-Body Toning Circuit', genre: 'workout-edm', targetBpm: 130, minutes: 30 },
  { dayIndex: 6, label: 'Day 7 · Sun', focusArea: 'Active Recovery, Stretch & Deep Selah', genre: 'rnb', targetBpm: 90, minutes: 18 },
];

export function getCalisthenicsDayPlan(dayNumber: number): CalisthenicsDayPlan {
  const clampedDay = Math.max(1, Math.min(365, Math.floor(dayNumber)));
  const quarterIdx = clampedDay <= 90 ? 0 : clampedDay <= 180 ? 1 : clampedDay <= 270 ? 2 : 3;
  const phase = PHASES[quarterIdx];
  const weekNumber = Math.ceil(clampedDay / 7);
  const dow = (clampedDay - 1) % 7;
  const dayType = DAY_TYPES[dow];
  const scripture = SCRIPTURE_VAULT[(clampedDay - 1) % SCRIPTURE_VAULT.length];

  // Smooth progression within each 90-day quarter AND across quarters
  const dayInQuarter = ((clampedDay - 1) % 90) + 1;

  // Sets grow gently: Q1 starts at 2 sets (first 4 weeks), then 3 sets. Q2: 3->4, Q3: 3->4, Q4: 4->5
  const baseSets =
    quarterIdx === 0
      ? dayInQuarter <= 28
        ? 2
        : 3
      : quarterIdx === 1
      ? dayInQuarter > 60
        ? 4
        : 3
      : quarterIdx === 2
      ? dayInQuarter > 45
        ? 4
        : 3
      : dayInQuarter > 60
      ? 5
      : 4;

  // Reps & Holds ramp gently from beginner-friendly (6-8 reps / 15s) up to toning endurance (14-18 reps / 45-55s)
  const repBase = quarterIdx === 0 ? 6 : quarterIdx === 1 ? 9 : quarterIdx === 2 ? 11 : 12;
  const repCount = repBase + Math.floor(dayInQuarter / 18); // +0 to +5 over 90 days

  const holdBase = quarterIdx === 0 ? 15 : quarterIdx === 1 ? 25 : quarterIdx === 2 ? 32 : 40;
  const holdSeconds = holdBase + Math.floor(dayInQuarter / 15) * 3;

  // Estimated minutes grows gently from ~20 min in early beginner weeks to ~40 min in Quarter 4
  const estimatedMinutes =
    dayType.focusArea === 'Active Recovery, Stretch & Deep Selah'
      ? 18
      : dayType.minutes + quarterIdx * 5 + (dayInQuarter > 45 ? 3 : 0);

  // Target music BPM scales mildly with intensity
  const targetBpm = dayType.focusArea === 'Active Recovery, Stretch & Deep Selah' ? 90 : dayType.targetBpm + quarterIdx * 6;

  // Beginner-friendly rest timers (shorter brisk 45s in Q1/circuits, 60s on strength sets)
  const strengthRest = quarterIdx === 0 ? 45 : 60;

  let exercises: CalisthenicsExercise[] = [];

  if (dayType.focusArea === 'Upper Push, Chest & Arm Tone') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.pushMove[0],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${repCount} controlled reps`,
        restSeconds: strengthRest,
        tempo: '2-1-1-0',
        equipment: quarterIdx === 0 ? 'No Equipment (Wall or Floor)' : 'No Equipment (Floor / Mat)',
        formCue: 'Keep core engaged like a straight plank, elbows tucked slightly back at 45°.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.pushMove[1],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${Math.max(5, repCount - 1)} reps`,
        restSeconds: strengthRest,
        tempo: '2-0-1-1',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Lower chest smoothly with zero hip sag; pause softly if needed to stay clean.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.pushMove[2],
        category: 'Upper Push',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${repCount} reps`,
        restSeconds: 45,
        tempo: 'Steady Rhythm',
        equipment: 'No Equipment (Wall / Floor)',
        formCue: 'Keep shoulders down away from your ears and breathe out as you press.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[0],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${holdSeconds}s calm hold`,
        restSeconds: 45,
        tempo: 'Steady Hold',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Squeeze glutes lightly, tuck ribs gently toward hips, and breathe smoothly.',
      },
    ];
  } else if (dayType.focusArea === 'Back Posture, Shoulders & Light Tone') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.backMove[0],
        category: 'Back & Posture',
        sets: baseSets,
        repsOrHold: `${repCount + 2} slow reps`,
        restSeconds: 45,
        tempo: '2-2-1-0',
        equipment: quarterIdx === 0 ? 'No Equipment (Wall)' : 'No Equipment (Floor / Mat)',
        formCue: 'Feel your upper back muscles gently pinching shoulder blades together.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.backMove[1],
        category: 'Back & Posture',
        sets: baseSets,
        repsOrHold: `${repCount} reps`,
        restSeconds: strengthRest,
        tempo: '2-1-2-0',
        equipment:
          quarterIdx >= 1 && quarterIdx <= 2
            ? 'Optional Light Dumbbells (or No Weight)'
            : 'No Equipment (Floor / Mat)',
        formCue: 'Hinge gently or lift chest just off mat with neck long—never strain the lower back.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.backMove[2],
        category: quarterIdx === 0 || quarterIdx === 3 ? 'Optional Dumbbells' : 'Back & Posture',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${repCount + 2} reps`,
        restSeconds: 45,
        tempo: 'Controlled Squeeze',
        equipment:
          quarterIdx === 0 || quarterIdx === 3
            ? 'Optional Light Dumbbells (or Bodyweight)'
            : 'No Equipment (Floor / Mat)',
        formCue: 'Light weights or just squeezing your fists creates clean tone along shoulders and upper back.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[1],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${repCount + 2} alternating reps`,
        restSeconds: 45,
        tempo: 'Slow Control',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Keep lower back gently pressed against the floor as legs extend.',
      },
    ];
  } else if (dayType.focusArea === 'Legs, Glutes & Core Sculpt') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.legMove[0],
        category: 'Legs & Glutes',
        sets: baseSets,
        repsOrHold: `${repCount + 2} reps`,
        restSeconds: strengthRest,
        tempo: '2-1-1-0',
        equipment: quarterIdx === 2 ? 'Optional Dumbbell (or Bodyweight)' : 'No Equipment (Floor)',
        formCue: 'Keep heels flat on the floor and sit hips back smoothly like sitting into a chair.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.legMove[1],
        category: 'Legs & Glutes',
        sets: baseSets,
        repsOrHold: `${repCount} reps`,
        restSeconds: 45,
        tempo: '2-2-1-0',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Push through heels and squeeze glutes cleanly at the top without arching lower back.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.legMove[2],
        category: 'Legs & Glutes',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${Math.max(6, repCount - 2)} reps each leg`,
        restSeconds: 45,
        tempo: '2-0-1-0',
        equipment: 'No Equipment (Floor)',
        formCue: 'Keep torso upright and take a comfortable, balanced step.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[2],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${holdSeconds}s hold / side`,
        restSeconds: 45,
        tempo: 'Balanced Lock',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Move slowly and keep hips level without wobbling side to side.',
      },
    ];
  } else if (dayType.focusArea === 'Cardio Burn & Optional Bike Ride') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.cardioMove[0],
        category: 'Warm-Up & Flow',
        sets: Math.max(2, baseSets),
        repsOrHold: `${holdSeconds + 15}s brisk pace`,
        restSeconds: 30,
        tempo: 'Music Beat Sync',
        equipment: 'No Equipment (Standing / Floor)',
        formCue: 'Land softly on the balls of your feet and swing arms naturally to match the beat.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.cardioMove[1],
        category: 'Warm-Up & Flow',
        sets: baseSets,
        repsOrHold: `${holdSeconds + 10}s steady flow`,
        restSeconds: 45,
        tempo: 'Smooth Cardio',
        equipment: 'No Equipment (Standing / Floor)',
        formCue: 'Step wide cleanly or jump lightly—choose the option that keeps your breathing steady.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: 'Brisk Walk / Jog or Optional Stationary Bike Intervals',
        category: 'Warm-Up & Flow',
        sets: 4,
        repsOrHold: '2 min brisk pace / 1 min easy recovery',
        restSeconds: 60,
        tempo: 'Steady Cadence',
        equipment: 'No Equipment (Walk/Jog) or Optional Bike',
        formCue: 'Sync your stride or pedal stroke right to the drumbeat; relax your shoulders.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[1],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${repCount + 4} slow reps`,
        restSeconds: 45,
        tempo: 'Calm Finish',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Cool heart rate down with controlled core breathing.',
      },
    ];
  } else if (dayType.focusArea === 'Arms, Core & Optional Dumbbell Finishers') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.toneMove[0],
        category: 'Optional Dumbbells',
        sets: baseSets,
        repsOrHold: `${repCount + 2} smooth reps`,
        restSeconds: 45,
        tempo: '2-1-2-0',
        equipment: 'Optional Light Dumbbells (or Bodyweight)',
        formCue: 'Keep elbows tucked close to sides; avoid swinging torso for momentum.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.toneMove[1],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${repCount} controlled reps`,
        restSeconds: strengthRest,
        tempo: '2-0-1-1',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Feel triceps and chest tone evenly; take knee option whenever form starts to slip.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.toneMove[2],
        category: 'Optional Dumbbells',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${quarterIdx >= 2 ? `${holdSeconds}s hold / ` : ''}${repCount + 2} reps`,
        restSeconds: 45,
        tempo: 'Controlled Burn',
        equipment:
          quarterIdx <= 1 ? 'Optional Light Dumbbells (or Bodyweight)' : 'No Equipment (Wall / Floor)',
        formCue: 'Build lean arm & leg definition through slow, steady muscle tension.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[0],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${holdSeconds + 5}s hold`,
        restSeconds: 45,
        tempo: 'Steady Tension',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Brace tummy gently as if preparing for a light tap.',
      },
    ];
  } else if (dayType.focusArea === 'Full-Body Toning Circuit') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.legMove[0],
        category: 'Legs & Glutes',
        sets: baseSets,
        repsOrHold: `${repCount + 4} circuit reps`,
        restSeconds: 30,
        tempo: 'Smooth Continuous Flow',
        equipment: 'No Equipment (Floor)',
        formCue: 'Keep chest lifted and weight centered across whole foot.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.pushMove[0],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${repCount} circuit reps`,
        restSeconds: 30,
        tempo: 'Smooth Continuous Flow',
        equipment: quarterIdx === 0 ? 'No Equipment (Wall or Floor)' : 'No Equipment (Floor / Mat)',
        formCue: 'Keep hips aligned with shoulders on every rep.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.backMove[1],
        category: 'Back & Posture',
        sets: baseSets,
        repsOrHold: `${repCount + 2} reps`,
        restSeconds: 30,
        tempo: '1-1-1-0',
        equipment:
          quarterIdx === 1
            ? 'Optional Light Dumbbells (or Bodyweight)'
            : 'No Equipment (Floor / Mat)',
        formCue: 'Pull shoulder blades cleanly back and down away from neck.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[2],
        category: 'Core & Sculpt',
        sets: Math.max(2, baseSets - 1),
        repsOrHold: `${holdSeconds}s / ${repCount} reps`,
        restSeconds: 45,
        tempo: 'Clean Finisher',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Finish the week strong with calm breathing and good posture.',
      },
    ];
  } else {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: 'Cat-Cow Spine & Shoulder Blade Mobility Flow',
        category: 'Warm-Up & Flow',
        sets: 2,
        repsOrHold: '8 slow breath-led cycles',
        restSeconds: 30,
        tempo: '4s Inhale / 4s Exhale',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Round and arch spine slowly like a wave to release tension from neck to hips.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: 'Gentle Wrist, Chest & Shoulder Wall Stretch',
        category: 'Warm-Up & Flow',
        sets: 2,
        repsOrHold: '30s each side',
        restSeconds: 20,
        tempo: 'Relaxed Stretch',
        equipment: 'No Equipment (Floor / Wall)',
        formCue: 'Keep shoulders dropped and smile through slow breathing—zero forcing.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: '90/90 Hip & Gentle Glute Recovery Stretch',
        category: 'Legs & Glutes',
        sets: 2,
        repsOrHold: '45s per side',
        restSeconds: 20,
        tempo: 'Deep Breathing',
        equipment: 'No Equipment (Floor / Mat)',
        formCue: 'Lean chest gently forward over front shin until you feel a comfortable hip release.',
      },
    ];
  }

  return {
    dayNumber: clampedDay,
    quarterNumber: phase.quarter,
    phaseTitle: phase.title,
    weekNumber,
    dayOfWeekLabel: dayType.label,
    workoutTitle: `Day ${clampedDay}: ${dayType.focusArea}`,
    focusArea: dayType.focusArea,
    difficultyBadge: phase.difficulty,
    estimatedMinutes,
    targetBpm,
    recommendedGenre: dayType.genre,
    exercises,
    bikeProtocol: {
      title:
        dayType.focusArea === 'Cardio Burn & Optional Bike Ride'
          ? `Day ${clampedDay} Brisk Walk, Jog or Optional Bike Session`
          : `Day ${clampedDay} Optional 15-Min Walk / Easy Spin Cool-Down`,
      durationMinutes: dayType.focusArea === 'Cardio Burn & Optional Bike Ride' ? 25 + quarterIdx * 5 : 15,
      targetCadenceRpm:
        dayType.focusArea === 'Active Recovery, Stretch & Deep Selah'
          ? 'Easy 70–80 RPM / Relaxed Walk'
          : `${82 + quarterIdx * 4}–${96 + quarterIdx * 4} RPM Brisk Pace`,
      intensityZone:
        dayType.focusArea === 'Active Recovery, Stretch & Deep Selah'
          ? 'Zone 1–2 Easy Recovery'
          : 'Zone 2–3 Fat-Burn & Stamina Rhythm',
      intervalsSummary:
        dayType.focusArea === 'Cardio Burn & Optional Bike Ride'
          ? '5m Easy Warm-Up · 4x (2m Brisk Walk/Jog/Spin to Beat · 1m Easy Recovery) · 5m Cool-Down'
          : '3m Easy Warm-Up · 9m Steady Music-Synced Walk or Spin · 3m Relaxed Stretch',
    },
    devotional: {
      scriptureRef: scripture.ref,
      scriptureText: scripture.text,
      title: `Day ${clampedDay} Devotional — ${scripture.title}`,
      reflection: scripture.reflection,
      prayerFocus: scripture.prayer,
      dailyDisciplineChallenge: scripture.challenge,
    },
  };
}
