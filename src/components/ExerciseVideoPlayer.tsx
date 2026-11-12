import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize2, X, Eye, Gauge } from 'lucide-react';
import { CalisthenicsExercise } from '../data/calisthenics365';

interface ExerciseVideoPlayerProps {
  exercise: CalisthenicsExercise;
  compact?: boolean;
}

type MotionArchetype =
  | 'pullup'
  | 'muscleup'
  | 'pushup'
  | 'dip'
  | 'handstand'
  | 'lsit'
  | 'frontlever'
  | 'pistol'
  | 'core'
  | 'bike'
  | 'mobility';

function detectMotionArchetype(ex: CalisthenicsExercise): MotionArchetype {
  const name = ex.name.toLowerCase();
  if (name.includes('muscle-up')) return 'muscleup';
  if (name.includes('front lever')) return 'frontlever';
  if (name.includes('handstand') || name.includes('hspu') || name.includes('pike')) return 'handstand';
  if (name.includes('l-sit') || name.includes('v-sit') || name.includes('frog') || name.includes('planche hold')) return 'lsit';
  if (name.includes('dip')) return 'dip';
  if (name.includes('push-up') || name.includes('planche')) return 'pushup';
  if (name.includes('pistol') || name.includes('squat') || name.includes('lunge') || name.includes('nordic') || name.includes('jump')) return 'pistol';
  if (name.includes('bike') || name.includes('cadence') || name.includes('climb') || name.includes('spin')) return 'bike';
  if (name.includes('hollow') || name.includes('dragon') || name.includes('toes-to-bar') || name.includes('knee') || name.includes('wiper') || name.includes('rollout')) return 'core';
  if (name.includes('hang') || name.includes('mobility') || name.includes('wrist')) return 'mobility';
  if (ex.category === 'Upper Pull') return 'pullup';
  if (ex.category === 'Upper Push') return 'pushup';
  if (ex.category === 'Legs & Plyo') return 'pistol';
  if (ex.category === 'Core & Compression') return 'core';
  return 'pullup';
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({ exercise }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 0.5>(1);
  const [cameraAngle, setCameraAngle] = useState<'side' | 'front'>('side');
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Concentric Drive');

  const archetype = detectMotionArchetype(exercise);

  useEffect(() => {
    let animId: number;
    let startTime = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = ((now - startTime) / 1000) * speed;
      // 3.6 second full rep cycle
      const cycle = (elapsed % 3.6) / 3.6;
      // Smooth 0 -> 1 -> 0 rep curve with brief top hold
      let t = 0;
      let currentPhase = 'Eccentric Control (3s)';
      if (cycle < 0.38) {
        t = Math.sin((cycle / 0.38) * (Math.PI / 2));
        currentPhase = 'Concentric Drive';
      } else if (cycle < 0.55) {
        t = 1;
        currentPhase = 'Peak Isometric Lock';
      } else {
        t = Math.cos(((cycle - 0.55) / 0.45) * (Math.PI / 2));
        currentPhase = 'Strict Eccentric Lowering';
      }

      setPhaseLabel(currentPhase);

      if (canvasRef.current) {
        drawAthleteCanvas(canvasRef.current, archetype, t, elapsed, cameraAngle, exercise.name);
      }
      if (isFullscreenModal && modalCanvasRef.current) {
        drawAthleteCanvas(modalCanvasRef.current, archetype, t, elapsed, cameraAngle, exercise.name);
      }

      if (isPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(renderFrame);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed, cameraAngle, archetype, isFullscreenModal, exercise.name]);

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-[#08090E] border border-slate-800 group">
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
            <span>HD WORKOUT VIDEO</span>
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
                {exercise.category}
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

  // Studio dark background with subtle spotlight gradient
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, W * 0.65);
  grad.addColorStop(0, '#1A1E2E');
  grad.addColorStop(1, '#08090E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle biomechanics grid lines
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

  // Floor line
  const floorY = H * 0.84;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, floorY);
  ctx.lineTo(W * 0.9, floorY);
  ctx.stroke();

  const cx = W * 0.5;

  // Helper to draw articulated limb & muscle glow
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

  if (archetype === 'pullup' || archetype === 'muscleup' || archetype === 'mobility') {
    // Draw Pull-Up Rig Bar
    const barY = H * 0.24;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 85, floorY);
    ctx.lineTo(cx - 85, barY - 12);
    ctx.moveTo(cx + 85, floorY);
    ctx.lineTo(cx + 85, barY - 12);
    ctx.stroke();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 85, barY);
    ctx.lineTo(cx + 85, barY);
    ctx.stroke();

    const maxPull = archetype === 'muscleup' ? 76 : archetype === 'mobility' ? 14 : 48;
    const bodyLift = t * maxPull;
    const shoulderY = barY + 46 - bodyLift;
    const hipY = shoulderY + 52;
    const kneeY = hipY + 38;
    const ankleY = kneeY + 36;

    if (angle === 'front') {
      // Front view: Wide grip hands on bar
      const leftHandX = cx - 32;
      const rightHandX = cx + 32;
      const leftElbowX = cx - 44 + t * 10;
      const rightElbowX = cx + 44 - t * 10;
      const elbowY = (barY + shoulderY) * 0.5 + 10 - t * 12;

      drawLimb(leftHandX, barY, leftElbowX, elbowY, 6, true);
      drawLimb(leftElbowX, elbowY, cx - 18, shoulderY, 7, true);
      drawLimb(rightHandX, barY, rightElbowX, elbowY, 6, true);
      drawLimb(rightElbowX, elbowY, cx + 18, shoulderY, 7, true);

      // Torso V-taper
      drawLimb(cx - 18, shoulderY, cx + 18, shoulderY, 9, true);
      drawLimb(cx, shoulderY, cx, hipY, 14, true);
      drawLimb(cx - 10, hipY, cx - 10, kneeY, 8);
      drawLimb(cx + 10, hipY, cx + 10, kneeY, 8);
      drawLimb(cx - 10, kneeY, cx - 10, ankleY, 6);
      drawLimb(cx + 10, kneeY, cx + 10, ankleY, 6);
      drawHead(cx, shoulderY - 18);
    } else {
      // Side profile view: C-curve pull-up / muscle-up path
      const cCurveX = archetype === 'muscleup' ? Math.sin(t * Math.PI) * 16 : 0;
      const shX = cx + cCurveX;
      const elbowX = cx - 22 + t * 8;
      const elbowY = barY + 26 - bodyLift * 0.45;

      drawLimb(cx, barY, elbowX, elbowY, 6, true);
      drawLimb(elbowX, elbowY, shX, shoulderY, 8, true);
      drawLimb(shX, shoulderY, shX + 4, hipY, 12, true);
      drawLimb(shX + 4, hipY, shX + 10, kneeY, 9);
      drawLimb(shX + 10, kneeY, shX + 14, ankleY, 7);
      drawHead(shX + 2, shoulderY - 17);
      drawJoint(cx, barY, 5, true);
      drawJoint(elbowX, elbowY, 4, true);
    }
  } else if (archetype === 'pushup' || archetype === 'lsit') {
    // Parallettes on floor
    const handX = cx + (angle === 'side' ? 36 : 0);
    const handY = floorY - 8;

    if (archetype === 'lsit') {
      // Strict L-Sit on parallettes
      const shX = cx - 10;
      const shY = handY - 52 - t * 6;
      const hipX = shX;
      const hipY = handY - 10 - t * 8;
      const footX = hipX + 68;
      const footY = hipY - t * 12; // V-sit lift on t

      drawLimb(shX, shY, hipX, hipY, 12, true);
      drawLimb(shX, shY, handX - 10, handY, 7, true);
      drawLimb(hipX, hipY, footX, footY, 9, true);
      drawHead(shX + 2, shY - 16);
      drawJoint(hipX, hipY, 5, true);
    } else {
      // Push-Up / Pseudo-Planche Push-Up
      const drop = (1 - t) * 32;
      const lean = t * 12;
      const footX = cx - 72;
      const footY = floorY - 4;
      const shX = cx + 38 + lean;
      const shY = floorY - 56 + drop;
      const hipX = (footX + shX) * 0.5;
      const hipY = (footY + shY) * 0.5 - 2;
      const elbowX = handX - 14;
      const elbowY = (shY + handY) * 0.55;

      drawLimb(footX, footY, hipX, hipY, 9);
      drawLimb(hipX, hipY, shX, shY, 12, true);
      drawLimb(shX, shY, elbowX, elbowY, 8, true);
      drawLimb(elbowX, elbowY, handX, handY, 7, true);
      drawHead(shX + 16, shY - 6);
      drawJoint(handX, handY, 5, true);
      drawJoint(elbowX, elbowY, 4, true);
    }
  } else if (archetype === 'dip') {
    // Parallel Bars / Rings Dip
    const barY = H * 0.48;
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 50, barY);
    ctx.lineTo(cx + 50, barY);
    ctx.moveTo(cx - 35, barY);
    ctx.lineTo(cx - 35, floorY);
    ctx.moveTo(cx + 35, barY);
    ctx.lineTo(cx + 35, floorY);
    ctx.stroke();

    const dipDrop = (1 - t) * 36;
    const shX = cx + 6;
    const shY = barY - 40 + dipDrop;
    const elbowX = cx - 18;
    const elbowY = barY - 18 + dipDrop * 0.6;
    const hipX = cx - 4;
    const hipY = shY + 50;
    const kneeY = hipY + 36;

    drawLimb(cx, barY, elbowX, elbowY, 7, true);
    drawLimb(elbowX, elbowY, shX, shY, 8, true);
    drawLimb(shX, shY, hipX, hipY, 12, true);
    drawLimb(hipX, hipY, hipX, kneeY, 9);
    drawLimb(hipX, kneeY, hipX - 18, kneeY + 18, 7);
    drawHead(shX + 4, shY - 16);
  } else if (archetype === 'frontlever') {
    // Bar + Horizontal Front Lever Raise & Hold
    const barY = H * 0.25;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 70, barY);
    ctx.lineTo(cx + 70, barY);
    ctx.stroke();

    const shX = cx - 18;
    const shY = barY + 44;
    const angleRad = (1 - t) * 0.65; // Rotates up into strict horizontal lock
    const hipX = shX + Math.cos(angleRad) * 48;
    const hipY = shY + Math.sin(angleRad) * 48;
    const footX = hipX + Math.cos(angleRad) * 68;
    const footY = hipY + Math.sin(angleRad) * 68;

    drawLimb(cx, barY, shX, shY, 7, true);
    drawLimb(shX, shY, hipX, hipY, 12, true);
    drawLimb(hipX, hipY, footX, footY, 9, true);
    drawHead(shX - 14, shY);
    drawJoint(cx, barY, 5, true);
  } else if (archetype === 'handstand') {
    // Handstand Push-Up
    const handY = floorY - 4;
    const pressLift = t * 32;
    const shY = handY - 26 - pressLift;
    const elbowX = cx - 18 * (1 - t);
    const elbowY = (handY + shY) * 0.5;
    const hipY = shY - 52;
    const footY = hipY - 64;

    drawLimb(cx, handY, elbowX, elbowY, 7, true);
    drawLimb(elbowX, elbowY, cx, shY, 8, true);
    drawLimb(cx, shY, cx, hipY, 12, true);
    drawLimb(cx, hipY, cx, footY, 9);
    drawHead(cx + 2, shY + 14);
  } else if (archetype === 'pistol') {
    // Strict Pistol Squat
    const squatDepth = (1 - t) * 52;
    const ankleX = cx - 10;
    const ankleY = floorY - 4;
    const kneeX = ankleX + 18 + (1 - t) * 14;
    const kneeY = ankleY - 38 + squatDepth * 0.35;
    const hipX = ankleX - 16 - (1 - t) * 12;
    const hipY = kneeY - 36 + squatDepth * 0.65;
    const shX = hipX + 14;
    const shY = hipY - 48;
    // Extended front leg
    const extFootX = hipX + 68;
    const extFootY = hipY + 8;

    drawLimb(ankleX, ankleY, kneeX, kneeY, 9, true);
    drawLimb(kneeX, kneeY, hipX, hipY, 11, true);
    drawLimb(hipX, hipY, extFootX, extFootY, 8, true);
    drawLimb(hipX, hipY, shX, shY, 12);
    drawLimb(shX, shY, shX + 46, shY + 4, 6);
    drawHead(shX + 4, shY - 16);
  } else if (archetype === 'core') {
    // Dragon Flag / Hollow Body Leg Raise
    const shX = cx - 54;
    const shY = floorY - 10;
    const liftAngle = 0.15 + t * 0.85;
    const hipX = shX + Math.cos(liftAngle) * 48;
    const hipY = shY - Math.sin(liftAngle) * 48;
    const footX = hipX + Math.cos(liftAngle) * 66;
    const footY = hipY - Math.sin(liftAngle) * 66;

    drawLimb(shX, shY, hipX, hipY, 12, true);
    drawLimb(hipX, hipY, footX, footY, 9, true);
    drawHead(shX - 15, shY - 4);
  } else if (archetype === 'bike') {
    // Road / Indoor Cycling Sprint Cadence
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

    // Frame
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

    // Pedaling legs at high RPM
    const pedalAngle = elapsed * 9;
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

  // Exercise watermark title inside canvas bottom right
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(exerciseName.slice(0, 38), W - 12, floorY + 22);
}
