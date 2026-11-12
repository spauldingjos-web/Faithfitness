import { ChristianGenre } from './musicCatalog';

export interface CalisthenicsExercise {
  id: string;
  name: string;
  category: 'Skill & Statics' | 'Upper Pull' | 'Upper Push' | 'Core & Compression' | 'Legs & Plyo';
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
    | 'Push & Planche Mechanics'
    | 'Pull & Front Lever Armor'
    | 'Legs, Pistol & Core Compression'
    | 'Bike Cadence & Endurance Ride'
    | 'Muscle-Up & Ring Transitions'
    | 'Spartan Full-Body Gauntlet'
    | 'Active Recovery, Mobility & Deep Selah';
  difficultyBadge: 'Foundation' | 'Intermediate' | 'Advanced' | 'Elite Spartan';
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
    title: 'The Discipline of the Unseen Rep',
    reflection:
      'Calisthenics exposes every weakness because you carry your own weight. Nobody can do the pull-up for you, and nobody can walk your spiritual walk for you. When you hold a hollow body or lock out your final dip with clean form, you are training your mind to choose obedience over comfort.',
    prayer:
      'Lord, forge steadfastness in my body and spirit today. Let every strict repetition remind me that endurance builds character.',
    challenge: 'Zerokip Rule: Complete every eccentric (lowering) phase for a full 3 seconds today—no rushing through discomfort.',
  },
  {
    ref: '2 Samuel 22:34–35',
    text: 'He makes my feet like the feet of a deer; He causes me to stand on the heights. He trains my hands for battle; my arms can bend a bow of bronze.',
    title: 'Hands Trained for the Heights',
    reflection:
      'Strength is not for vanity; it is for readiness and service. Whether gripping cold steel on a pull-up bar, stabilizing on wooden rings, or climbing a steep grade on your bike, God honors the stewardship of the strength He has entrusted to you.',
    prayer:
      'Father, strengthen my grip, my core, and my resolve so I can carry heavy burdens for those around me without faltering.',
    challenge: 'Add a 20-second dead-hang or active scapula hang at the end of your workout while reciting today’s verse.',
  },
  {
    ref: 'Hebrews 12:1–2',
    text: 'Let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us.',
    title: 'Cadence Through Resistance',
    reflection:
      'On a bike climb or in the middle of a high-rep calisthenics circuit, extra weight and wasted motion immediately slow your cadence. Spiritual maturity works the same way: stripping away distraction so your energy flows cleanly toward the mark.',
    prayer:
      'Jesus, strip away mental clutter and fatigue today. Set my rhythm to Your grace as I press through today’s session.',
    challenge: 'Hold a steady nasal breathing cadence during your warmup and first two working sets.',
  },
  {
    ref: 'Isaiah 40:29–31',
    text: 'He gives strength to the weary and increases the power of the weak. Even youths grow tired and weary, and young men stumble and fall; but those who hope in the Lord will renew their strength.',
    title: 'Second Wind in the Fourth Set',
    reflection:
      'Natural motivation fades around Week 3, or right when lactic acid hits your forearms. Renewed strength comes when your training is anchored in worship rather than ego. Let the music lift your focus off the burn and onto gratitude.',
    prayer:
      'Lord, be my second wind today. When my muscles tremble in the hold, quiet my mind in Your presence.',
    challenge: 'Between sets during your rest timer, keep your phone down and spend 30 seconds in gratitude.',
  },
  {
    ref: 'Proverbs 24:10',
    text: 'If you falter in a time of trouble, how small is your strength!',
    title: 'Forged Under Tension',
    reflection:
      'Isometric holds like the L-sit, front lever, and planche teach a profound truth: stillness under high tension requires more strength than frantic movement. Peace in trials is spiritual isometric strength.',
    prayer:
      'God of Peace, teach me to hold my ground with calm, unshakable composure when pressure mounts.',
    challenge: 'Accumulate 60 total seconds of strict L-sit or hollow-body hold today without dropping tension.',
  },
  {
    ref: 'Philippians 3:13–14',
    text: 'Forgetting what is behind and straining toward what is ahead, I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.',
    title: 'Forward Lean & Full Commitment',
    reflection:
      'In a pseudo-planche push-up, your shoulders must lean forward past your wrists—you cannot advance while leaning back in safety. Stepping into growth requires leaning forward past yesterday’s comfort zone.',
    prayer:
      'Lord, give me the courage to lean forward into the calling You placed before me today, leaving yesterday’s excuses behind.',
    challenge: 'Measure your forward shoulder lean on push-ups today and hold the top protraction for 2 full seconds.',
  },
  {
    ref: 'Psalm 144:1',
    text: 'Praise be to the Lord my Rock, who trains my hands for war, my fingers for battle.',
    title: 'Sabbath Mobility & Temple Stewardship',
    reflection:
      'Recovery, joint integrity, and tendon conditioning are what allow a 365-day athlete to stay unbroken all year. Honoring rest and deep tissue mobility is an act of humility and long-term vision.',
    prayer:
      'Creator of my frame, restore my joints, tendons, and nervous system as I stretch and meditate on Your Word.',
    challenge: 'Complete 15 minutes of thoracic spine, wrist, and hip mobility while listening to Worship & Gospel R&B.',
  },
];

const PHASES: {
  quarter: 1 | 2 | 3 | 4;
  title: string;
  difficulty: CalisthenicsDayPlan['difficultyBadge'];
  pushMove: [string, string, string];
  pullMove: [string, string, string];
  skillMove: [string, string, string];
  legMove: [string, string, string];
  coreMove: [string, string, string];
}[] = [
  {
    quarter: 1,
    title: 'Phase I (Days 1–90): Strict Bodyweight Armor & Joint Conditioning',
    difficulty: 'Foundation',
    pushMove: ['Strict Scapular & Diamond Push-Ups', 'Parallel Bar Dips (Full Lockout)', 'Pike Push-Ups (Elevated Feet)'],
    pullMove: ['Strict Chin-Ups & Pull-Ups (Chest to Bar)', 'Australian Ring/Bar Rows (Feet Elevated)', 'Scapular Pulls & 30s Active Dead Hang'],
    skillMove: ['Tuck L-Sit Hold on Parallettes/Floor', 'Frog Stand / Crow Balance', 'Wall Handstand Chest-to-Wall Hold'],
    legMove: ['Assisted Pistol Squats (Box/Ring)', 'Bulgarian Split Squats (Explosive)', 'Nordic Hamstring Eccentrics'],
    coreMove: ['Hollow Body Rocks & Hold', 'Hanging Knee-to-Chest Raises', 'Plank Protraction Saw'],
  },
  {
    quarter: 2,
    title: 'Phase II (Days 91–180): Explosive Power & Handstand Mastery',
    difficulty: 'Intermediate',
    pushMove: ['Pseudo Planche Push-Ups (30° Lean)', 'Deep Ring Dips (RTO Turnout)', 'Wall Handstand Push-Ups (Strict)'],
    pullMove: ['Explosive High Pull-Ups (Waist/Sternum)', 'Archer Pull-Ups (Bar or Rings)', 'Tuck Front Lever Pulls'],
    skillMove: ['Strict L-Sit Hold (Legs Straight)', 'Freestanding Handstand Kick-Ups', 'Tuck Planche Hold on Parallettes'],
    legMove: ['Strict Unassisted Pistol Squats', 'Explosive Jump Switch Lunges', 'Single-Leg Hip Thrusts (Paused)'],
    coreMove: ['Strict Toes-to-Bar (Zero Kip)', 'Dragon Flag Tuck Negatives', 'Windshield Wipers (Hanging)'],
  },
  {
    quarter: 3,
    title: 'Phase III (Days 181–270): Bar & Ring Muscle-Ups + Lever Progressions',
    difficulty: 'Advanced',
    pushMove: ['Straight Bar Dips (Muscle-Up Lockout)', 'Ring Bulgarian Dips', 'Freestanding / Deep Pike HSPU'],
    pullMove: ['Bar Muscle-Up Transitions & Negatives', 'False-Grip Ring Pull-Ups', 'Advanced Tuck Front Lever Hold'],
    skillMove: ['Bar / Ring Muscle-Up Skill Sets', 'Advanced Tuck Planche Hold', 'V-Sit Compression Hold'],
    legMove: ['Weighted / Tempo Pistol Squats (4s Down)', 'Shrimp Squats (Both Hands Behind)', 'Plyo Box / Broad Jumps'],
    coreMove: ['Full Dragon Flags (Strict)', 'Hanging L-Sit to Toes-to-Bar', 'Ab-Wheel / Ring Rollouts'],
  },
  {
    quarter: 4,
    title: 'Phase IV (Days 271–365): Elite Spartan Statics & Full Mastery',
    difficulty: 'Elite Spartan',
    pushMove: ['90-Degree Push-Up Progressions', 'RTO 45° Ring Dips', 'Planche Lean Push-Ups (Paused)'],
    pullMove: ['Strict Bar & Ring Muscle-Ups', 'One-Arm Chin-Up Eccentrics / Assisted', 'Straddle Front Lever Rows'],
    skillMove: ['Straddle / Full Front Lever Holds', 'Straddle Planche / Maltese Prep', 'One-Arm Handstand Wall Shifts'],
    legMove: ['Dragon Pistol Squats', 'Explosive Single-Leg Box Jumps', 'Isometric Horse Stance (3 Min)'],
    coreMove: ['Strict Straight-Body Dragon Flags', 'Victorian Cross Core Compression', 'Hanging Front Lever Raises'],
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
  { dayIndex: 0, label: 'Day 1 · Mon', focusArea: 'Push & Planche Mechanics', genre: 'rock', targetBpm: 152, minutes: 48 },
  { dayIndex: 1, label: 'Day 2 · Tue', focusArea: 'Pull & Front Lever Armor', genre: 'hiphop', targetBpm: 148, minutes: 50 },
  { dayIndex: 2, label: 'Day 3 · Wed', focusArea: 'Legs, Pistol & Core Compression', genre: 'workout-edm', targetBpm: 162, minutes: 45 },
  { dayIndex: 3, label: 'Day 4 · Thu', focusArea: 'Bike Cadence & Endurance Ride', genre: 'hiphop', targetBpm: 138, minutes: 55 },
  { dayIndex: 4, label: 'Day 5 · Fri', focusArea: 'Muscle-Up & Ring Transitions', genre: 'rock', targetBpm: 156, minutes: 52 },
  { dayIndex: 5, label: 'Day 6 · Sat', focusArea: 'Spartan Full-Body Gauntlet', genre: 'rock', targetBpm: 160, minutes: 60 },
  { dayIndex: 6, label: 'Day 7 · Sun', focusArea: 'Active Recovery, Mobility & Deep Selah', genre: 'rnb', targetBpm: 94, minutes: 35 },
];

export function getCalisthenicsDayPlan(dayNumber: number): CalisthenicsDayPlan {
  const clampedDay = Math.max(1, Math.min(365, Math.floor(dayNumber)));
  const quarterIdx = clampedDay <= 90 ? 0 : clampedDay <= 180 ? 1 : clampedDay <= 270 ? 2 : 3;
  const phase = PHASES[quarterIdx];
  const weekNumber = Math.ceil(clampedDay / 7);
  const dow = (clampedDay - 1) % 7;
  const dayType = DAY_TYPES[dow];
  const scripture = SCRIPTURE_VAULT[(clampedDay - 1) % SCRIPTURE_VAULT.length];

  // Progressive rep/hold scaling across each 90-day quarter
  const dayInQuarter = ((clampedDay - 1) % 90) + 1;
  const progressionBonusSets = dayInQuarter > 60 ? 1 : 0;
  const baseSets = 4 + progressionBonusSets;
  const holdSeconds = 15 + Math.floor(dayInQuarter / 6) * 2;
  const repCount = 8 + Math.floor(dayInQuarter / 10);

  let exercises: CalisthenicsExercise[] = [];

  if (dayType.focusArea === 'Push & Planche Mechanics') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.skillMove[2],
        category: 'Skill & Statics',
        sets: 4,
        repsOrHold: `${holdSeconds}s strict hold`,
        restSeconds: 75,
        tempo: 'Isometric Lock',
        equipment: 'Floor / Parallettes',
        formCue: 'Protract shoulder blades hard, lock elbows, posterior pelvic tilt.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.pushMove[0],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${repCount} strict reps`,
        restSeconds: 90,
        tempo: '3-1-1-1',
        equipment: 'Floor / Parallettes',
        formCue: 'Keep elbows tucked 45°, lean shoulders forward past wrists at bottom.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.pushMove[1],
        category: 'Upper Push',
        sets: baseSets,
        repsOrHold: `${repCount + 2} reps`,
        restSeconds: 90,
        tempo: '2-1-1-1',
        equipment: 'Parallel Bars / Rings',
        formCue: 'Break 90° depth cleanly, depress shoulders at top lockout.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.pushMove[2],
        category: 'Upper Push',
        sets: 4,
        repsOrHold: `${Math.max(6, repCount - 2)} reps`,
        restSeconds: 90,
        tempo: '3-0-1-1',
        equipment: 'Wall / Box',
        formCue: 'Head forms a tripod triangle in front of hands; press vertically.',
      },
      {
        id: `d${clampedDay}-ex5`,
        name: phase.coreMove[0],
        category: 'Core & Compression',
        sets: 3,
        repsOrHold: `${holdSeconds + 15}s hold`,
        restSeconds: 60,
        tempo: 'Strict Tension',
        equipment: 'Floor',
        formCue: 'Lower back glued to floor; ribs pulled down to hips.',
      },
    ];
  } else if (dayType.focusArea === 'Pull & Front Lever Armor') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.pullMove[2],
        category: 'Skill & Statics',
        sets: 4,
        repsOrHold: `${holdSeconds}s hold / 6 pulls`,
        restSeconds: 90,
        tempo: 'Controlled Isometric',
        equipment: 'Pull-Up Bar / Rings',
        formCue: 'Straight arms, depress lats, engage glutes and core horizontally.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.pullMove[0],
        category: 'Upper Pull',
        sets: baseSets,
        repsOrHold: `${repCount} chest-to-bar reps`,
        restSeconds: 90,
        tempo: '2-1-1-1',
        equipment: 'Pull-Up Bar',
        formCue: 'Start from dead hang, drive elbows down to ribs, zero kipping.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.pullMove[1],
        category: 'Upper Pull',
        sets: 4,
        repsOrHold: `${repCount} reps per side/set`,
        restSeconds: 75,
        tempo: '2-1-2-0',
        equipment: 'Rings / Low Bar',
        formCue: 'Squeeze shoulder blades together for 1 full second at top.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[1],
        category: 'Core & Compression',
        sets: 4,
        repsOrHold: `${repCount + 2} strict reps`,
        restSeconds: 60,
        tempo: '2-1-2-0',
        equipment: 'Pull-Up Bar',
        formCue: 'Zero swing; curl pelvis upward using lower abs and hip flexors.',
      },
    ];
  } else if (dayType.focusArea === 'Legs, Pistol & Core Compression') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.skillMove[0],
        category: 'Skill & Statics',
        sets: 4,
        repsOrHold: `${holdSeconds}s L-Sit compression`,
        restSeconds: 60,
        tempo: 'Isometric Lock',
        equipment: 'Parallettes / Floor',
        formCue: 'Push shoulders down away from ears; lock knees and point toes.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.legMove[0],
        category: 'Legs & Plyo',
        sets: baseSets,
        repsOrHold: `${Math.max(6, repCount - 2)} reps each leg`,
        restSeconds: 90,
        tempo: '3-1-1-0',
        equipment: 'Bodyweight',
        formCue: 'Keep heel planted flat; control knee tracking over toes.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.legMove[1],
        category: 'Legs & Plyo',
        sets: 4,
        repsOrHold: `${repCount + 4} reps`,
        restSeconds: 75,
        tempo: 'Explosive Concentric',
        equipment: 'Bodyweight / Bench',
        formCue: 'Drive forcefully through mid-foot; land softly with bent knee.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.legMove[2],
        category: 'Legs & Plyo',
        sets: 3,
        repsOrHold: `${repCount} slow reps`,
        restSeconds: 75,
        tempo: '4-0-1-0',
        equipment: 'Floor Anchor',
        formCue: 'Keep hips extended straight from knees to shoulders.',
      },
    ];
  } else if (dayType.focusArea === 'Bike Cadence & Endurance Ride') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: 'Cadence Warm-Up Spin + Scapular Bar Decompression',
        category: 'Skill & Statics',
        sets: 2,
        repsOrHold: '5 min spin + 45s dead hang',
        restSeconds: 45,
        tempo: '90 RPM Smooth',
        equipment: 'Road/Stationary Bike + Bar',
        formCue: 'Open chest, relax grip on handlebars, steady nasal breathing.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: 'Hill Climb Standing Sprints (Music BPM Synced)',
        category: 'Legs & Plyo',
        sets: 6,
        repsOrHold: '90s standing climb / 60s saddle recovery',
        restSeconds: 60,
        tempo: '75–85 RPM Heavy Gear',
        equipment: 'Bike (Outdoor or Indoor)',
        formCue: 'Sync pedal stroke directly to the snare/kick of the 140+ BPM track.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: 'High-Cadence Flat Road Tempo Surge',
        category: 'Legs & Plyo',
        sets: 4,
        repsOrHold: '4 min @ 100–110 RPM',
        restSeconds: 90,
        tempo: '105 RPM',
        equipment: 'Bike',
        formCue: 'Zero upper body bounce; smooth circular pedal pull-through.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[0],
        category: 'Core & Compression',
        sets: 3,
        repsOrHold: `${holdSeconds + 10}s hold post-ride`,
        restSeconds: 45,
        tempo: 'Isometric',
        equipment: 'Floor',
        formCue: 'Lock core stability after dismounting the bike.',
      },
    ];
  } else if (dayType.focusArea === 'Muscle-Up & Ring Transitions') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: phase.skillMove[1],
        category: 'Skill & Statics',
        sets: 5,
        repsOrHold: `${Math.max(4, repCount - 4)} skill reps / transitions`,
        restSeconds: 120,
        tempo: 'Explosive Pull + Fast Wrist Turn',
        equipment: 'High Bar / Gymnastic Rings',
        formCue: 'Pull around the bar (C-path), snap chest over bar at peak height.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: phase.pullMove[0],
        category: 'Upper Pull',
        sets: 4,
        repsOrHold: `${repCount} explosive reps`,
        restSeconds: 90,
        tempo: '1-0-X-0',
        equipment: 'Pull-Up Bar',
        formCue: 'Pull bar to lower chest/upper abs every rep.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.pushMove[0],
        category: 'Upper Push',
        sets: 4,
        repsOrHold: `${repCount + 2} straight-bar / ring dips`,
        restSeconds: 90,
        tempo: '2-1-1-1',
        equipment: 'High Bar / Rings',
        formCue: 'Lean torso slightly over bar on descent, full elbow lock at top.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[2],
        category: 'Core & Compression',
        sets: 4,
        repsOrHold: `${repCount} strict reps`,
        restSeconds: 60,
        tempo: '3-1-1-0',
        equipment: 'Bar / Floor',
        formCue: 'Maintain full body tension from shoulders to toes.',
      },
    ];
  } else if (dayType.focusArea === 'Spartan Full-Body Gauntlet') {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: `${phase.pullMove[0]} (EMOM Superset)`,
        category: 'Upper Pull',
        sets: 5,
        repsOrHold: `${repCount} strict reps`,
        restSeconds: 45,
        tempo: 'Continuous Clean Cadence',
        equipment: 'Pull-Up Bar',
        formCue: 'Full extension at bottom, chin clears bar cleanly.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: `${phase.pushMove[1]} (EMOM Superset)`,
        category: 'Upper Push',
        sets: 5,
        repsOrHold: `${repCount + 4} reps`,
        restSeconds: 45,
        tempo: 'Continuous Clean Cadence',
        equipment: 'Parallel Bars / Rings',
        formCue: 'Keep chest proud and shoulders packed.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: phase.legMove[0],
        category: 'Legs & Plyo',
        sets: 4,
        repsOrHold: `${repCount} alternating reps`,
        restSeconds: 60,
        tempo: '2-1-1-0',
        equipment: 'Bodyweight',
        formCue: 'Controlled depth, explosive stand.',
      },
      {
        id: `d${clampedDay}-ex4`,
        name: phase.coreMove[1],
        category: 'Core & Compression',
        sets: 4,
        repsOrHold: `${repCount + 4} reps`,
        restSeconds: 60,
        tempo: 'Strict',
        equipment: 'Bar / Floor',
        formCue: 'Finish the week strong with zero form breakdown.',
      },
    ];
  } else {
    exercises = [
      {
        id: `d${clampedDay}-ex1`,
        name: 'Passive & Active Spinal Bar Decompression Hang',
        category: 'Skill & Statics',
        sets: 3,
        repsOrHold: '45s relaxed hang + 5 scapular shrugs',
        restSeconds: 45,
        tempo: 'Deep Breathing',
        equipment: 'Pull-Up Bar',
        formCue: 'Inhale 4s through nose, exhale 6s while letting lats and spine lengthen.',
      },
      {
        id: `d${clampedDay}-ex2`,
        name: 'Planche & Handstand Wrist Conditioning Flow',
        category: 'Skill & Statics',
        sets: 3,
        repsOrHold: '12 wrist push-ups + 30s dorsal stretch',
        restSeconds: 30,
        tempo: 'Slow & Deliberate',
        equipment: 'Floor',
        formCue: 'Keep elbows locked while lifting palms smoothly off the mat.',
      },
      {
        id: `d${clampedDay}-ex3`,
        name: '90/90 Hip Opening & Thoracic Bridge Flow',
        category: 'Legs & Plyo',
        sets: 3,
        repsOrHold: '60s per side',
        restSeconds: 30,
        tempo: 'Fluid Mobility',
        equipment: 'Floor',
        formCue: 'Open thoracic spine toward the ceiling and reach long.',
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
    estimatedMinutes: dayType.minutes,
    targetBpm: dayType.targetBpm,
    recommendedGenre: dayType.genre,
    exercises,
    bikeProtocol: {
      title:
        dayType.focusArea === 'Bike Cadence & Endurance Ride'
          ? `Day ${clampedDay} Primary Road / Indoor Cycling Interval Session`
          : `Day ${clampedDay} Optional 20-Min Bike Conditioning Add-On`,
      durationMinutes: dayType.focusArea === 'Bike Cadence & Endurance Ride' ? 45 : 20,
      targetCadenceRpm:
        dayType.focusArea === 'Active Recovery, Mobility & Deep Selah' ? '75–85 RPM Zone 2' : '92–108 RPM Tempo',
      intensityZone:
        dayType.focusArea === 'Active Recovery, Mobility & Deep Selah'
          ? 'Zone 2 Recovery Spin'
          : 'Zone 3/4 Threshold & Sprint Intervals',
      intervalsSummary:
        dayType.focusArea === 'Bike Cadence & Endurance Ride'
          ? '10m Warmup · 6x (90s Hill Sprint @ 150 BPM / 60s Spin) · 15m Cadence Cruise · 5m Cooldown'
          : '5m Warmup Spin · 10m High-Cadence Rhythm Ride synced to music · 5m Cooldown',
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
