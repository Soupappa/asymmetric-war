import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState } from '../game/types';

interface Projectile {
  id: number;
  type: 'drone' | 'missile' | 'strike' | 'fighter';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
  intercepted: boolean;
  interceptAt: number;
  trail: { x: number; y: number }[];
  wobble: number;
  size: number;
  alive: boolean;
  explosionTimer: number;
}

interface MapUnit {
  id: number;
  type: 'aa_battery' | 'base';
  x: number;
  y: number;
  alive: boolean;
  flashTimer: number;
  pulsePhase: number;
}

export interface BattlefieldHandle {
  launchDrones: (count: number) => void;
  launchMissiles: (count: number) => void;
  launchStrike: (count: number) => void;
  launchFighter: (count: number) => void;
  addAA: () => void;
  addBase: () => void;
}

interface BattlefieldProps {
  state: GameState;
}

let nextId = 0;

const Battlefield = forwardRef<BattlefieldHandle, BattlefieldProps>(({ state }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const unitsRef = useRef<MapUnit[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const impactsRef = useRef<{ x: number; y: number; timer: number; success: boolean; type: string }[]>([]);

  // Initialize units from state
  useEffect(() => {
    const units: MapUnit[] = [];
    // Regime bases on right
    for (let i = 0; i < Math.min(state.regime.bases, 40); i++) {
      units.push({
        id: nextId++,
        type: 'base',
        x: 0.65 + Math.random() * 0.3,
        y: 0.1 + Math.random() * 0.8,
        alive: true,
        flashTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    // Coalition AA on left
    for (let i = 0; i < Math.min(state.coalition.aa_batteries, 20); i++) {
      units.push({
        id: nextId++,
        type: 'aa_battery',
        x: 0.05 + Math.random() * 0.2,
        y: 0.1 + Math.random() * 0.8,
        alive: true,
        flashTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    unitsRef.current = units;
  }, []);

  // Sync bases
  useEffect(() => {
    const currentBases = unitsRef.current.filter(u => u.type === 'base' && u.alive).length;
    const target = Math.min(state.regime.bases, 50);
    if (target > currentBases) {
      for (let i = 0; i < target - currentBases; i++) {
        unitsRef.current.push({
          id: nextId++, type: 'base',
          x: 0.65 + Math.random() * 0.3, y: 0.1 + Math.random() * 0.8,
          alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    } else if (target < currentBases) {
      let toKill = currentBases - target;
      for (const u of unitsRef.current) {
        if (u.type === 'base' && u.alive && toKill > 0) {
          u.alive = false; u.flashTimer = 1.5; toKill--;
        }
      }
    }
  }, [state.regime.bases]);

  // Sync AA batteries
  useEffect(() => {
    const currentAA = unitsRef.current.filter(u => u.type === 'aa_battery' && u.alive).length;
    const target = Math.min(state.coalition.aa_batteries, 30);
    if (target > currentAA) {
      for (let i = 0; i < target - currentAA; i++) {
        unitsRef.current.push({
          id: nextId++, type: 'aa_battery',
          x: 0.05 + Math.random() * 0.2, y: 0.1 + Math.random() * 0.8,
          alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }
  }, [state.coalition.aa_batteries]);

  const spawnProjectile = useCallback((type: 'drone' | 'missile' | 'strike' | 'fighter') => {
    const aliveBases = unitsRef.current.filter(u => u.type === 'base' && u.alive);
    const aliveAA = unitsRef.current.filter(u => u.type === 'aa_battery' && u.alive);

    let startX: number, startY: number, targetX: number, targetY: number;

    if (type === 'strike') {
      startX = 0.02 + Math.random() * 0.08;
      startY = 0.1 + Math.random() * 0.8;
      if (aliveBases.length > 0) {
        const t = aliveBases[Math.floor(Math.random() * aliveBases.length)];
        targetX = t.x; targetY = t.y;
      } else {
        targetX = 0.8; targetY = 0.5;
      }
    } else if (type === 'fighter') {
      startX = 0.05 + Math.random() * 0.1;
      startY = 0.05 + Math.random() * 0.3;
      // Fighters patrol middle area
      targetX = 0.4 + Math.random() * 0.2;
      targetY = 0.2 + Math.random() * 0.6;
    } else {
      // Regime projectiles: from bases toward coalition
      if (aliveBases.length > 0) {
        const src = aliveBases[Math.floor(Math.random() * aliveBases.length)];
        startX = src.x; startY = src.y;
      } else {
        startX = 0.8; startY = 0.5;
      }
      targetX = 0.02 + Math.random() * 0.15;
      targetY = 0.1 + Math.random() * 0.8;
    }

    // Interception probability
    let interceptChance: number;
    if (type === 'drone') {
      const cap = state.coalition.aa_batteries * 2 + state.coalition.fighters_available * 3 + state.coalition.laser_defense;
      interceptChance = Math.min(0.95, cap / Math.max(1, state.regime.drones_per_sec + cap) * 1.2);
    } else if (type === 'missile') {
      const cap = state.coalition.aa_batteries * 0.8;
      interceptChance = Math.min(0.85, cap / Math.max(1, state.regime.missiles_per_sec + cap));
    } else {
      interceptChance = 1 - state.coalition.strike_accuracy;
    }

    const willIntercept = (type === 'drone' || type === 'missile') && Math.random() < interceptChance;
    const interceptProgress = willIntercept ? 0.3 + Math.random() * 0.5 : 1;

    const proj: Projectile = {
      id: nextId++, type,
      x: startX, y: startY,
      targetX, targetY,
      speed: type === 'drone' ? 0.06 + Math.random() * 0.03
           : type === 'missile' ? 0.15 + Math.random() * 0.08
           : type === 'fighter' ? 0.2 + Math.random() * 0.1
           : 0.35 + Math.random() * 0.15,
      progress: 0,
      intercepted: false,
      interceptAt: interceptProgress,
      trail: [],
      wobble: type === 'drone' ? 10 + Math.random() * 8 : type === 'missile' ? 1 + Math.random() * 1 : 0,
      size: type === 'drone' ? 2 : type === 'missile' ? 4 : type === 'fighter' ? 3 : 5,
      alive: true,
      explosionTimer: 0,
    };
    projectilesRef.current.push(proj);
  }, [state]);

  useImperativeHandle(ref, () => ({
    launchDrones: (count: number) => {
      for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('drone'), i * 20 + Math.random() * 40);
    },
    launchMissiles: (count: number) => {
      for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('missile'), i * 60 + Math.random() * 40);
    },
    launchStrike: (count: number) => {
      for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('strike'), i * 40 + Math.random() * 30);
    },
    launchFighter: (count: number) => {
      for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('fighter'), i * 50 + Math.random() * 30);
    },
    addAA: () => {
      unitsRef.current.push({
        id: nextId++, type: 'aa_battery',
        x: 0.05 + Math.random() * 0.2, y: 0.1 + Math.random() * 0.8,
        alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
      });
    },
    addBase: () => {
      unitsRef.current.push({
        id: nextId++, type: 'base',
        x: 0.65 + Math.random() * 0.3, y: 0.1 + Math.random() * 0.8,
        alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
      });
    },
  }), [spawnProjectile]);

  // Auto-launch (only when enabled)
  useEffect(() => {
    if (!state.running) return;
    const interval = setInterval(() => {
      if (state.autoFireRegime) {
        const dronesToLaunch = Math.ceil(state.regime.drones_per_sec / 5);
        const missilesToLaunch = Math.ceil(state.regime.missiles_per_sec / 8);
        for (let i = 0; i < Math.min(dronesToLaunch, 20); i++) spawnProjectile('drone');
        for (let i = 0; i < Math.min(missilesToLaunch, 8); i++) spawnProjectile('missile');
      }
      if (state.autoFireCoalition && state.coalition.strike_power > 0) {
        for (let i = 0; i < Math.min(Math.ceil(state.coalition.strike_power / 5), 3); i++) spawnProjectile('strike');
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.running, state.autoFireRegime, state.autoFireCoalition, state.regime.drones_per_sec, state.regime.missiles_per_sec, state.coalition.strike_power, spawnProjectile]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = (time: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      ctx.fillStyle = 'hsl(220, 20%, 4%)';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'hsla(220, 15%, 15%, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Front line
      ctx.strokeStyle = 'hsla(45, 50%, 40%, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      ctx.beginPath(); ctx.moveTo(w * 0.45, 0); ctx.lineTo(w * 0.45, h); ctx.stroke();
      ctx.setLineDash([]);

      // Zone labels
      ctx.font = '11px Orbitron';
      ctx.fillStyle = 'hsla(210, 80%, 55%, 0.4)';
      ctx.fillText('COALITION', 10, 18);
      ctx.fillStyle = 'hsla(0, 70%, 50%, 0.4)';
      ctx.fillText('REGIME', w - 80, 18);

      const now = time / 1000;

      // Draw units
      for (const u of unitsRef.current) {
        const ux = u.x * w;
        const uy = u.y * h;

        if (u.flashTimer > 0) {
          const r = (1.5 - u.flashTimer) * 30;
          const gradient = ctx.createRadialGradient(ux, uy, 0, ux, uy, r);
          gradient.addColorStop(0, `hsla(30, 100%, 70%, ${u.flashTimer})`);
          gradient.addColorStop(1, `hsla(0, 100%, 50%, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(ux, uy, r, 0, Math.PI * 2); ctx.fill();
          u.flashTimer -= dt * 1.5;
          continue;
        }
        if (!u.alive) continue;

        if (u.type === 'base') {
          // Regime base: red diamond with pulse
          const pulse = 0.8 + Math.sin(now * 2 + u.pulsePhase) * 0.2;
          const glow = ctx.createRadialGradient(ux, uy, 0, ux, uy, 14);
          glow.addColorStop(0, `hsla(0, 70%, 50%, ${0.25 * pulse})`);
          glow.addColorStop(1, 'hsla(0, 70%, 50%, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(ux, uy, 14, 0, Math.PI * 2); ctx.fill();

          ctx.save();
          ctx.translate(ux, uy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = `hsla(0, 60%, 40%, ${pulse})`;
          ctx.fillRect(-5, -5, 10, 10);
          ctx.strokeStyle = 'hsl(0, 70%, 55%)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5, -5, 10, 10);
          ctx.restore();

          // Antenna
          ctx.strokeStyle = 'hsla(0, 50%, 50%, 0.5)';
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(ux, uy - 7); ctx.lineTo(ux, uy - 14); ctx.stroke();
        } else if (u.type === 'aa_battery') {
          // AA battery: blue circle with radar sweep
          const glow = ctx.createRadialGradient(ux, uy, 0, ux, uy, 16);
          glow.addColorStop(0, 'hsla(210, 80%, 55%, 0.15)');
          glow.addColorStop(1, 'hsla(210, 80%, 55%, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(ux, uy, 16, 0, Math.PI * 2); ctx.fill();

          // Base
          ctx.fillStyle = 'hsl(210, 50%, 35%)';
          ctx.beginPath(); ctx.arc(ux, uy, 5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsl(210, 70%, 55%)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ux, uy, 5, 0, Math.PI * 2); ctx.stroke();

          // Radar sweep
          const sweepAngle = (now * 3 + u.pulsePhase) % (Math.PI * 2);
          ctx.strokeStyle = 'hsla(210, 80%, 60%, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(ux + Math.cos(sweepAngle) * 12, uy + Math.sin(sweepAngle) * 12);
          ctx.stroke();

          // Barrel
          ctx.strokeStyle = 'hsl(210, 60%, 50%)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + 10, uy - 6); ctx.stroke();
        }
      }

      // Draw coalition city (background)
      ctx.fillStyle = 'hsl(210, 40%, 25%)';
      for (let i = 0; i < 8; i++) {
        const cx = 8 + i * 14;
        const cy = h / 2 - 40 + (i % 3) * 20;
        const bh = 12 + Math.sin(i * 1.7) * 8;
        ctx.fillRect(cx, cy, 8, bh);
        ctx.strokeStyle = 'hsla(210, 60%, 50%, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, cy, 8, bh);
      }

      // Update projectiles
      const stillAlive: Projectile[] = [];
      for (const p of projectilesRef.current) {
        if (!p.alive && p.explosionTimer <= 0) continue;

        if (p.alive) {
          p.progress += p.speed * dt;
          const t = p.progress;
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const perpX = -dy;
          const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;

          const wobbleOffset = Math.sin(t * 20 + p.id) * p.wobble;
          const curX = (p.x + dx * t + (perpX / len) * wobbleOffset * 0.01) * w;
          const curY = (p.y + dy * t + (perpY / len) * wobbleOffset * 0.01) * h;

          p.trail.push({ x: curX, y: curY });
          const maxTrail = p.type === 'strike' ? 40 : p.type === 'missile' ? 25 : p.type === 'fighter' ? 15 : 12;
          if (p.trail.length > maxTrail) p.trail.shift();

          if (p.progress >= p.interceptAt && p.interceptAt < 1) {
            p.alive = false;
            p.intercepted = true;
            p.explosionTimer = 0.5;
            impactsRef.current.push({ x: curX, y: curY, timer: 1.2, success: false, type: p.type });
          }

          if (p.progress >= 1) {
            p.alive = false;
            p.explosionTimer = p.type === 'strike' ? 1.0 : p.type === 'missile' ? 0.8 : 0.4;
            const isHit = p.type === 'strike' || p.type === 'fighter';
            impactsRef.current.push({ x: curX, y: curY, timer: 1.5, success: !isHit, type: p.type });
          }

          // Draw trail
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);

            if (p.type === 'strike') {
              // Powerful cyan beam with glow
              ctx.strokeStyle = 'hsla(195, 100%, 75%, 0.9)';
              ctx.lineWidth = 4;
              ctx.stroke();
              ctx.strokeStyle = 'hsla(195, 100%, 85%, 0.25)';
              ctx.lineWidth = 12;
              ctx.stroke();
            } else if (p.type === 'fighter') {
              ctx.strokeStyle = 'hsla(180, 90%, 60%, 0.7)';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (p.type === 'drone') {
              // Thin red wobbly trail
              ctx.strokeStyle = 'hsla(0, 55%, 50%, 0.4)';
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Missile: thick orange-red, more direct
              ctx.strokeStyle = 'hsla(15, 90%, 55%, 0.8)';
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.strokeStyle = 'hsla(25, 100%, 65%, 0.2)';
              ctx.lineWidth = 6;
              ctx.stroke();
            }
          }

          // Draw head
          if (p.type === 'strike') {
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 10);
            grd.addColorStop(0, 'hsla(195, 100%, 95%, 1)');
            grd.addColorStop(0.4, 'hsla(195, 100%, 70%, 0.6)');
            grd.addColorStop(1, 'hsla(195, 100%, 50%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 10, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'fighter') {
            // Small triangle
            ctx.fillStyle = 'hsl(180, 80%, 60%)';
            ctx.beginPath();
            ctx.moveTo(curX + 5, curY);
            ctx.lineTo(curX - 3, curY - 3);
            ctx.lineTo(curX - 3, curY + 3);
            ctx.closePath();
            ctx.fill();
          } else if (p.type === 'drone') {
            ctx.fillStyle = 'hsl(0, 50%, 55%)';
            ctx.beginPath(); ctx.arc(curX, curY, 2, 0, Math.PI * 2); ctx.fill();
          } else {
            // Missile: bigger, imposing, with fire glow
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 8);
            grd.addColorStop(0, 'hsla(20, 100%, 80%, 1)');
            grd.addColorStop(0.3, 'hsla(10, 100%, 60%, 0.8)');
            grd.addColorStop(1, 'hsla(0, 80%, 40%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 8, 0, Math.PI * 2); ctx.fill();
            // Missile body
            const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(angle);
            ctx.fillStyle = 'hsl(0, 0%, 70%)';
            ctx.fillRect(-6, -1.5, 12, 3);
            ctx.fillStyle = 'hsl(15, 100%, 55%)';
            ctx.fillRect(4, -2, 3, 4); // warhead
            ctx.restore();
          }
        }

        // Explosions
        if (!p.alive && p.explosionTimer > 0) {
          const last = p.trail[p.trail.length - 1];
          if (last) {
            const maxR = p.intercepted ? 15 : (p.type === 'strike' ? 35 : p.type === 'missile' ? 25 : 12);
            const r = (1 - p.explosionTimer / (p.type === 'strike' ? 1.0 : 0.8)) * maxR;
            const alpha = p.explosionTimer;

            if (p.intercepted) {
              // White flash + X for interception
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(0, 0%, 100%, ${alpha})`);
              grd.addColorStop(0.5, `hsla(45, 80%, 60%, ${alpha * 0.4})`);
              grd.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = `hsla(0, 0%, 100%, ${alpha * 0.8})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(last.x - 5, last.y - 5); ctx.lineTo(last.x + 5, last.y + 5);
              ctx.moveTo(last.x + 5, last.y - 5); ctx.lineTo(last.x - 5, last.y + 5);
              ctx.stroke();
            } else if (p.type === 'strike') {
              // Big blue-white explosion on base
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(195, 100%, 95%, ${alpha})`);
              grd.addColorStop(0.3, `hsla(200, 100%, 70%, ${alpha * 0.7})`);
              grd.addColorStop(0.6, `hsla(30, 100%, 60%, ${alpha * 0.3})`);
              grd.addColorStop(1, 'hsla(0, 100%, 40%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
            } else {
              // Regime impacts on coalition: red/orange fireball - VISIBLE
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(25, 100%, 80%, ${alpha})`);
              grd.addColorStop(0.4, `hsla(10, 90%, 55%, ${alpha * 0.6})`);
              grd.addColorStop(1, 'hsla(0, 80%, 30%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
            }
          }
          p.explosionTimer -= dt * 1.5;
        }

        if (p.alive || p.explosionTimer > 0) stillAlive.push(p);
      }
      projectilesRef.current = stillAlive;

      // Draw persistent impact markers
      const aliveImpacts: typeof impactsRef.current = [];
      for (const imp of impactsRef.current) {
        imp.timer -= dt;
        if (imp.timer <= 0) continue;
        aliveImpacts.push(imp);

        const alpha = imp.timer * 0.5;
        if (imp.success) {
          // Hit on coalition: red circle
          ctx.strokeStyle = `hsla(0, 70%, 55%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, 8, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `hsla(0, 60%, 50%, ${alpha * 0.3})`;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, 4, 0, Math.PI * 2); ctx.fill();
        } else if (imp.type === 'strike') {
          // Strike miss on regime: fading cross
          ctx.strokeStyle = `hsla(210, 60%, 50%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(imp.x - 6, imp.y - 6); ctx.lineTo(imp.x + 6, imp.y + 6);
          ctx.moveTo(imp.x + 6, imp.y - 6); ctx.lineTo(imp.x - 6, imp.y + 6);
          ctx.stroke();
        }
      }
      impactsRef.current = aliveImpacts;

      // HUD
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'hsla(45, 50%, 60%, 0.5)';
      const active = stillAlive.filter(p => p.alive);
      const dc = active.filter(p => p.type === 'drone').length;
      const mc = active.filter(p => p.type === 'missile').length;
      const sc = active.filter(p => p.type === 'strike').length;
      const fc = active.filter(p => p.type === 'fighter').length;
      ctx.fillText(`Active: ${dc}d ${mc}m ${sc}s ${fc}f`, 10, h - 8);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full h-full relative" style={{ minHeight: 300 }}>
      <canvas ref={canvasRef} className="w-full h-full block rounded" />
    </div>
  );
});

Battlefield.displayName = 'Battlefield';
export default Battlefield;
