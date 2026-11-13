import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize2, X, Eye, Gauge } from 'lucide-react';
import { CalisthenicsExercise } from '../data/calisthenics365';

interface ExerciseVideoPlayerProps {
  exercise: CalisthenicsExercise;
  compact?: boolean;
}

type MotionArchetype =
  | 'wallpushup'
  | 'pushup'
  | 'plank'
  | 'bridge'
  | 'dumbbell'
  | 'squat'
  | 'cardio'
  | 'core'
  | 'stretch'
  | 'handstand'
  | 'bike';

function detectMotionArchetype(ex: CalisthenicsExercise): MotionArchetype {
  const name = ex.name.toLowerCase();
  const equip = ex.equipment.toLowerCase();

  if (name.includes('bike') || name.includes('spin') || name.includes('cycling') || name.includes('cadence')) {
    return 'bike';
  }
  if (name.includes('handstand') || name.includes('pike')) {
    return 'handstand';
  }
  if (name.includes('wall push-up') || name.includes('wall slide') || name.includes('wall shoulder') || name.includes('wall stretch')) {
    return 'wallpushup';
  }
  if (name.includes('plank') || name.includes('bear crawl') || name.includes('mountain climber') || name.includes('inchworm')) {
    return 'plank';
  }
  if (
    name.includes('dumbbell') ||
    name.includes('curl') ||
    name.includes('lateral raise') ||
    name.includes('y-t raise') ||
    name.includes('thruster') ||
    name.includes('arm circle') ||
    name.includes('row') ||
    ex.category === 'Optional Dumbbells' ||
    equip.includes('dumbbell')
  ) {
    return 'dumbbell';
  }
  if (
    name.includes('glute bridge') ||
    name.includes('superman') ||
    name.includes('w-squeeze') ||
    name.includes('snow angel') ||
    name.includes('bird-dog') ||
    name.includes('swimmer') ||
    name.includes('cat-cow')
  ) {
    return 'bridge';
  }
  if (
    name.includes('squat') ||
    name.includes('lunge') ||
    name.includes('wall sit') ||
    name.includes('skater')
  ) {
    return 'squat';
  }
  if (
    name.includes('march') ||
    name.includes('jumping jack') ||
    name.includes('shadow boxing') ||
    name.includes('burpee') ||
    name.includes('walk / jog')
  ) {
    return 'cardio';
  }
  if (name.includes('push-up') || name.includes('dip')) {
    return 'pushup';
  }
  if (
    name.includes('dead bug') ||
    name.includes('bicycle') ||
    name.includes('hollow') ||
    name.includes('v-up') ||
    name.includes('v-sit') ||
    name.includes('jackknife') ||
    name.includes('v-tuck')
  ) {
    return 'core';
  }
  if (name.includes('stretch') || name.includes('mobility') || name.includes('recovery')) {
    return 'stretch';
  }

  if (ex.category === 'Upper Push') return 'pushup';
  if (ex.category === 'Legs & Glutes') return 'squat';
  if (ex.category === 'Back & Posture') return 'bridge';
  if (ex.category === 'Warm-Up & Flow') return 'cardio';
  return 'core';
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({ exercise }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPhaseRef = useRef('Controlled Move');
  const [isVisible, setIsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 0.5>(1);
  const [cameraAngle, setCameraAngle] = useState<'side' | 'front'>('side');
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Controlled Move');

  const archetype = detectMotionArchetype(exercise);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setIsVisible(entries[0].isIntersecting);
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || (!isVisible && !isFullscreenModal)) return;
    let animId: number;
    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = ((now - startTime) / 1000) * speed;
      const cycle = (elapsed % 3.6) / 3.6;
      let t = 0;
      let currentPhase = 'Slow Lowering';
      if (cycle < 0.38) {
        t = Math.sin((cycle / 0.38) * (Math.PI / 2));
        currentPhase = 'Smooth Drive';
      } else if (cycle < 0.55) {
        t = 1;
        currentPhase = 'Clean Tone Squeeze';
      } else {
        t = Math.cos(((cycle - 0.55) / 0.45) * (Math.PI / 2));
        currentPhase = 'Controlled Return';
      }

      if (lastPhaseRef.current !== currentPhase) {
        lastPhaseRef.current = currentPhase;
        setPhaseLabel(currentPhase);
      }

      if (canvasRef.current && isVisible) {
        drawAthleteCanvas(canvasRef.current, archetype, t, elapsed, cameraAngle, exercise.name);
      }
      if (isFullscreenModal && modalCanvasRef.current) {
        drawAthleteCanvas(modalCanvasRef.current, archetype, t, elapsed, cameraAngle, exercise.name);
      }

      if (isPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isVisible, speed, cameraAngle, archetype, isFullscreenModal, exercise.name]);

  return (
    <>
      <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-[#08090E] border border-slate-800 group">
        {/* Live 60FPS Short Workout Example Video Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-56 sm:h-64 object-cover block"
        />

        {/* Top Left Live Video Badge & Phase Telemetry */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-amber-400 flex items-center gap-1.5">
            <span>FORM DEMO</span>
            <span aria-hidden="true">·</span>
            <span className="text-white">{phaseLabel}</span>
          </div>

          <div className="px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-slate-300">
            {speed === 0.5 ? '0.5x SLOW-MO' : '60 FPS LOOP'}
          </div>
        </div>

        {/* Bottom Interactive Video Controls */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-8 w-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer"
              title={isPlaying ? 'Pause Video Demo' : 'Play Video Demo'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => setSpeed(speed === 1 ? 0.5 : 1)}
              className="h-8 px-2.5 rounded-lg bg-black/75 hover:bg-black text-white border border-white/15 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer"
              title="Toggle Slow-Motion Form Check"
            >
              <Gauge className="w-3 h-3 text-amber-400" />
              <span>{speed}x</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraAngle(cameraAngle === 'side' ? 'front' : 'side')}
              className="h-8 px-2.5 rounded-lg bg-black/75 hover:bg-black text-white border border-white/15 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer"
              title="Switch Camera Angle"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>{cameraAngle === 'side' ? 'Side View' : 'Front View'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreenModal(true)}
            className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Watch Full Screen Workout Video"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Screen</span>
          </button>
        </div>
      </div>

      {/* True 100vw x 100vh Full-Screen HD Form Check Video Modal */}
      {isFullscreenModal && (
        <div
          className="fixed inset-0 z-50 w-screen h-screen bg-[#07080D] overflow-hidden flex flex-col justify-between"
          style={{ width: '100vw', height: '100vh' }}
        >
          {/* Full-Bleed 100% Viewport Canvas */}
          <canvas
            ref={modalCanvasRef}
            width={1280}
            height={720}
            className="absolute inset-0 w-full h-full object-cover block"
            style={{ width: '100%', height: '100%' }}
          />

          <div className="relative z-10 px-5 sm:px-8 pt-5 pb-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-amber-400 font-bold uppercase">
                {exercise.category} · {exercise.equipment}
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{exercise.name}</h3>
            </div>
            <button
              onClick={() => setIsFullscreenModal(false)}
              className="w-11 h-11 rounded-full bg-black/70 hover:bg-white/20 text-white border border-white/25 flex items-center justify-center cursor-pointer transition-colors shadow-lg"
              aria-label="Exit full screen"
              title="Exit"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="relative z-10 p-5 sm:p-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-xs font-mono font-bold text-amber-300">
                <span>{phaseLabel}</span>
                <span>·</span>
                <span>{exercise.sets} Sets × {exercise.repsOrHold}</span>
                <span>·</span>
                <span>Tempo {exercise.tempo}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                <strong className="text-amber-400">Coach Form Cue:</strong> {exercise.formCue}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => setSpeed(speed === 1 ? 0.5 : 1)}
                className="min-h-[44px] px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-mono font-semibold cursor-pointer"
              >
                {speed === 1 ? '0.5x Slow-Mo' : '1.0x Normal Speed'}
              </button>
              <button
                onClick={() => setCameraAngle(cameraAngle === 'side' ? 'front' : 'side')}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                Angle: {cameraAngle === 'side' ? 'Side Profile' : 'Front Alignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function drawAthleteCanvas(
  canvas: HTMLCanvasElement,
  archetype: MotionArchetype,
  t: number,
  elapsed: number,
  angle: 'side' | 'front',
  exerciseName: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, W * 0.65);
  grad.addColorStop(0, '#1A1E2E');
  grad.addColorStop(1, '#08090E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
  ctx.lineWidth = 1;
  const gridStep = 28;
  for (let x = 0; x < W; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const floorY = H * 0.84;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, floorY);
  ctx.lineTo(W * 0.9, floorY);
  ctx.stroke();

  const cx = W * 0.5;

  const drawLimb = (x1: number, y1: number, x2: number, y2: number, thickness: number, isActiveMuscle = false) => {
    ctx.save();
    ctx.lineCap = 'round';
    if (isActiveMuscle) {
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#F59E0B';
    } else {
      ctx.strokeStyle = '#E2E8F0';
    }
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  const drawJoint = (x: number, y: number, r = 4, highlight = false) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? '#F59E0B' : '#94A3B8';
    ctx.fill();
  };

  const drawHead = (x: number, y: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  };

  const lowerName = exerciseName.toLowerCase();

  if (archetype === 'wallpushup') {
    // Wall Incline / Wall Slide / Wall Stretch
    const wallX = cx + 62;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wallX, H * 0.18);
    ctx.lineTo(wallX, floorY);
    ctx.stroke();

    const press = (1 - t) * 20;
    const footX = cx - 42;
    const footY = floorY - 4;
    const hipX = footX + 16 + press * 0.4;
    const hipY = floorY - 62;
    const shX = hipX + 18 + press * 0.8;
    const shY = hipY - 48;
    const handX = wallX - 4;
    const handY = shY + 4;
    const elbowX = (shX + handX) * 0.5 - press * 0.3;
    const elbowY = shY + 14;

    drawLimb(footX, footY, hipX, hipY, 9);
    drawLimb(hipX, hipY, shX, shY, 12, true);
    drawLimb(shX, shY, elbowX, elbowY, 7, true);
    drawLimb(elbowX, elbowY, handX, handY, 7, true);
    drawHead(shX - 2, shY - 17);
    drawJoint(handX, handY, 5, true);
  } else if (archetype === 'pushup') {
    const isKnee = lowerName.includes('knee');
    const drop = (1 - t) * 28;
    const handX = cx + (angle === 'side' ? 42 : 0);
    const handY = floorY - 4;
    const baseAnchorX = isKnee ? cx - 46 : cx - 72;
    const baseAnchorY = floorY - 4;
    const shX = cx + 38;
    const shY = floorY - 52 + drop;
    const hipX = (baseAnchorX + shX) * 0.5;
    const hipY = (baseAnchorY + shY) * 0.5 - 2;
    const elbowX = handX - 14;
    const elbowY = (shY + handY) * 0.55;

    if (isKnee) {
      drawLimb(baseAnchorX - 26, floorY - 22, baseAnchorX, baseAnchorY, 8);
    }
    drawLimb(baseAnchorX, baseAnchorY, hipX, hipY, 9);
    drawLimb(hipX, hipY, shX, shY, 12, true);
    drawLimb(shX, shY, elbowX, elbowY, 8, true);
    drawLimb(elbowX, elbowY, handX, handY, 7, true);
    drawHead(shX + 16, shY - 6);
    drawJoint(handX, handY, 5, true);
  } else if (archetype === 'plank') {
    const breath = Math.sin(elapsed * 2.5) * 2;
    const tapOffset = lowerName.includes('tap') || lowerName.includes('climber') ? Math.sin(elapsed * 5) * 10 : 0;
    const ankleX = cx - 70;
    const ankleY = floorY - 4;
    const hipX = cx - 12;
    const hipY = floorY - 36 + breath;
    const shX = cx + 44;
    const shY = floorY - 38 + breath;
    const elbowX = shX + 4;
    const elbowY = floorY - 6;

    drawLimb(ankleX, ankleY + (lowerName.includes('climber') ? Math.max(0, tapOffset) * -1.4 : 0), hipX, hipY, 9, true);
    drawLimb(hipX, hipY, shX, shY, 12, true);
    drawLimb(shX, shY, elbowX, elbowY, 7, true);
    drawLimb(elbowX, elbowY, elbowX + 18, floorY - 4, 6);
    drawHead(shX + 18, shY - 4);
  } else if (archetype === 'bridge') {
    if (lowerName.includes('superman') || lowerName.includes('w-squeeze') || lowerName.includes('snow angel') || lowerName.includes('swimmer')) {
      // Prone upper back extension / Superman on floor mat
      const lift = t * 18;
      const hipX = cx - 12;
      const hipY = floorY - 6;
      const shX = cx + 38;
      const shY = floorY - 8 - lift;
      const footX = cx - 72;
      const footY = floorY - 6 - lift * 0.7;

      drawLimb(footX, footY, hipX, hipY, 9, true);
      drawLimb(hipX, hipY, shX, shY, 12, true);
      drawLimb(shX, shY, shX + 34, shY - 10 - lift * 0.4, 7, true);
      drawHead(shX + 14, shY - 10);
    } else {
      // Floor Glute Bridge / Cat-Cow / Bird-Dog
      const hipLift = t * 34;
      const shX = cx - 44;
      const shY = floorY - 8;
      const hipX = cx + 4;
      const hipY = floorY - 12 - hipLift;
      const kneeX = cx + 42;
      const kneeY = floorY - 42;
      const footX = cx + 56;
      const footY = floorY - 4;

      drawLimb(shX, shY, hipX, hipY, 12, true);
      drawLimb(hipX, hipY, kneeX, kneeY, 10, true);
      drawLimb(kneeX, kneeY, footX, footY, 8);
      drawLimb(shX + 6, shY, hipX + 18, floorY - 4, 6);
      drawHead(shX - 15, shY - 4);
      drawJoint(hipX, hipY, 5, true);
    }
  } else if (archetype === 'dumbbell') {
    const isRow = lowerName.includes('row') || lowerName.includes('y-t');
    const isLateral = lowerName.includes('lateral');
    const ankleX = cx - 8;
    const ankleY = floorY - 4;
    const hipX = cx - 4;
    const hipY = floorY - 64;

    if (isRow) {
      // Hinged bent-over posture (dumbbell or bodyweight row squeeze)
      const shX = hipX + 38;
      const shY = hipY - 26;
      const handX = shX + 8;
      const handY = shY + 40 - t * 24;
      const elbowX = shX - 10;
      const elbowY = shY + 14 - t * 18;

      drawLimb(ankleX, ankleY, ankleX + 6, floorY - 34, 9);
      drawLimb(ankleX + 6, floorY - 34, hipX, hipY, 10);
      drawLimb(hipX, hipY, shX, shY, 12, true);
      drawLimb(shX, shY, elbowX, elbowY, 7, true);
      drawLimb(elbowX, elbowY, handX, handY, 7, true);
      drawHead(shX + 14, shY - 10);
      // Small optional dumbbell glyph
      ctx.fillStyle = '#34D399';
      ctx.fillRect(handX - 9, handY - 3, 18, 6);
    } else if (isLateral || angle === 'front') {
      // Standing Front Alignment Curl-to-Press / Lateral Raise
      const shY = hipY - 52;
      const kneeY = floorY - 34;
      drawLimb(cx - 12, ankleY, cx - 12, kneeY, 8);
      drawLimb(cx - 12, kneeY, cx - 10, hipY, 9);
      drawLimb(cx + 12, ankleY, cx + 12, kneeY, 8);
      drawLimb(cx + 12, kneeY, cx + 10, hipY, 9);
      drawLimb(cx, hipY, cx, shY, 14, true);

      const armSpread = isLateral ? 40 * t + 10 : 22;
      const handY = isLateral ? shY + 26 * (1 - t) : shY + 34 - t * 62;
      drawLimb(cx - 14, shY, cx - armSpread, handY, 7, true);
      drawLimb(cx + 14, shY, cx + armSpread, handY, 7, true);
      ctx.fillStyle = '#34D399';
      ctx.fillRect(cx - armSpread - 7, handY - 3, 14, 6);
      ctx.fillRect(cx + armSpread - 7, handY - 3, 14, 6);
      drawHead(cx, shY - 18);
    } else {
      // Side standing curl-to-overhead-press
      const shX = hipX + 2;
      const shY = hipY - 52;
      drawLimb(ankleX, ankleY, ankleX + 2, floorY - 34, 9);
      drawLimb(ankleX + 2, floorY - 34, hipX, hipY, 10);
      drawLimb(hipX, hipY, shX, shY, 12);

      const elbowX = shX + 14;
      const elbowY = shY + 22 - t * 28;
      const handX = shX + 20 - t * 8;
      const handY = shY + 38 - t * 68;
      drawLimb(shX, shY, elbowX, elbowY, 7, true);
      drawLimb(elbowX, elbowY, handX, handY, 7, true);
      ctx.fillStyle = '#34D399';
      ctx.fillRect(handX - 8, handY - 3, 16, 6);
      drawHead(shX + 2, shY - 17);
    }
  } else if (archetype === 'squat') {
    const isLunge = lowerName.includes('lunge') || lowerName.includes('split');
    const depth = (1 - t) * 38;
    if (isLunge) {
      const hipX = cx;
      const hipY = floorY - 72 + depth * 0.7;
      const frontFootX = cx + 44;
      const backFootX = cx - 44;
      const frontKneeX = cx + 38;
      const frontKneeY = floorY - 38 + depth * 0.25;
      const backKneeX = cx - 22;
      const backKneeY = floorY - 30 + depth * 0.55;
      const shX = hipX + 4;
      const shY = hipY - 50;

      drawLimb(frontFootX, floorY - 4, frontKneeX, frontKneeY, 9, true);
      drawLimb(frontKneeX, frontKneeY, hipX, hipY, 11, true);
      drawLimb(backFootX, floorY - 4, backKneeX, backKneeY, 8);
      drawLimb(backKneeX, backKneeY, hipX, hipY, 9);
      drawLimb(hipX, hipY, shX, shY, 12);
      drawHead(shX + 2, shY - 16);
    } else {
      const ankleX = cx;
      const ankleY = floorY - 4;
      const kneeX = cx + 16 + (1 - t) * 14;
      const kneeY = ankleY - 36 + depth * 0.35;
      const hipX = cx - 18 - (1 - t) * 14;
      const hipY = kneeY - 36 + depth * 0.65;
      const shX = hipX + 16;
      const shY = hipY - 48;

      drawLimb(ankleX, ankleY, kneeX, kneeY, 9, true);
      drawLimb(kneeX, kneeY, hipX, hipY, 11, true);
      drawLimb(hipX, hipY, shX, shY, 12);
      drawLimb(shX, shY, shX + 36, shY + 6, 6);
      drawHead(shX + 4, shY - 16);
    }
  } else if (archetype === 'cardio') {
    // Rhythmic Marching / Jumping Jacks / Walk Cardio
    const step = Math.sin(elapsed * 7);
    const bounce = Math.abs(step) * 10;
    const hipY = floorY - 64 - bounce;
    const shY = hipY - 50;

    drawLimb(cx, hipY, cx, shY, 13, true);
    drawLimb(cx - 10, hipY, cx - 18 - Math.max(0, step) * 12, floorY - 4 - Math.max(0, -step) * 24, 9, true);
    drawLimb(cx + 10, hipY, cx + 18 + Math.max(0, -step) * 12, floorY - 4 - Math.max(0, step) * 24, 9, true);
    drawLimb(cx - 12, shY, cx - 32 - Math.abs(step) * 10, shY - step * 28, 7, true);
    drawLimb(cx + 12, shY, cx + 32 + Math.abs(step) * 10, shY + step * 28, 7, true);
    drawHead(cx, shY - 18);
  } else if (archetype === 'core') {
    const shX = cx - 48;
    const shY = floorY - 10;
    const liftAngle = 0.15 + t * 0.72;
    const hipX = shX + Math.cos(liftAngle) * 44;
    const hipY = shY - Math.sin(liftAngle) * 44;
    const footX = hipX + Math.cos(liftAngle) * 62;
    const footY = hipY - Math.sin(liftAngle) * 62;

    drawLimb(shX, shY, hipX, hipY, 12, true);
    drawLimb(hipX, hipY, footX, footY, 9, true);
    drawHead(shX - 15, shY - 4);
  } else if (archetype === 'stretch') {
    // Gentle floor stretch / seated hip release
    const lean = t * 18;
    const hipX = cx - 20;
    const hipY = floorY - 8;
    const shX = hipX + 14 + lean;
    const shY = hipY - 44 + lean * 0.4;
    drawLimb(hipX, hipY, cx + 46, floorY - 6, 9, true);
    drawLimb(hipX, hipY, shX, shY, 12, true);
    drawLimb(shX, shY, shX + 26, shY + 12, 6, true);
    drawHead(shX + 4, shY - 16);
  } else if (archetype === 'handstand') {
    const handY = floorY - 4;
    const pressLift = t * 28;
    const shY = handY - 26 - pressLift;
    const elbowX = cx - 18 * (1 - t);
    const elbowY = (handY + shY) * 0.5;
    const hipY = shY - 52;
    const footY = hipY - 62;

    drawLimb(cx, handY, elbowX, elbowY, 7, true);
    drawLimb(elbowX, elbowY, cx, shY, 8, true);
    drawLimb(cx, shY, cx, hipY, 12, true);
    drawLimb(cx, hipY, cx, footY, 9);
    drawHead(cx + 2, shY + 14);
  } else if (archetype === 'bike') {
    const wheelR = 32;
    const rearX = cx - 48;
    const frontX = cx + 48;
    const wheelY = floorY - wheelR;

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rearX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(frontX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    const crankX = cx - 6;
    const crankY = wheelY;
    const seatX = cx - 26;
    const seatY = wheelY - 46;
    const barX = cx + 34;
    const barY = wheelY - 52;
    drawLimb(rearX, wheelY, crankX, crankY, 3);
    drawLimb(crankX, crankY, seatX, seatY, 3);
    drawLimb(crankX, crankY, barX, barY, 3);
    drawLimb(seatX, seatY, barX, barY, 3);

    const pedalAngle = elapsed * 8;
    const footX = crankX + Math.cos(pedalAngle) * 16;
    const footY = crankY + Math.sin(pedalAngle) * 16;
    const hipX = seatX + 6;
    const hipY = seatY - 10;
    const kneeX = (hipX + footX) * 0.5 + 14;
    const kneeY = (hipY + footY) * 0.5 - 10;
    const shX = barX - 12;
    const shY = barY - 26;

    drawLimb(hipX, hipY, kneeX, kneeY, 10, true);
    drawLimb(kneeX, kneeY, footX, footY, 8, true);
    drawLimb(hipX, hipY, shX, shY, 12);
    drawLimb(shX, shY, barX, barY, 7);
    drawHead(shX + 12, shY - 12);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(exerciseName.slice(0, 42), W - 12, floorY + 22);
}
