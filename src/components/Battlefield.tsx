import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { GameState, RegimeBase } from '../game/types';
import { MISSILE_FLIGHT_TIME, DRONE_FLIGHT_TIME, STRIKE_FLIGHT_TIME } from '../game/engine';
import { sounds } from '../lib/soundUtils';

type ProjectileType = 'missile' | 'drone' | 'interceptor' | 'strike' | 'fighter' | 'minigun_tracer' | 'fighter_tracer';

interface Projectile {
  id: number;
  type: ProjectileType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  baseSpeed: number; // For scaling with game speed
  progress: number;
  intercepted: boolean;
  interceptAt: number;
  trail: { x: number; y: number }[];
  wobble: number;
  size: number;
  alive: boolean;
  explosionTimer: number;
  returning?: boolean;
  logicalId?: string;
  delay: number;
}

interface Unit {
  id: string;
  type: string;
  x: number;
  y: number;
  alive: boolean;
  pulsePhase: number;
  burialLevel?: number;
  revealed?: boolean;
  revealedType?: string | null;
  knownToCoalition?: boolean;
}

export interface BattlefieldHandle {
  launchDrones: (n: number) => void;
  launchMissiles: (n: number) => void;
  launchStrike: (n: number) => void;
  launchFighter: (n: number) => void;
  addAA: () => void;
  addBase: () => void;
}

const Battlefield = forwardRef<BattlefieldHandle, { state: GameState; onImpact?: (type: string) => void; onIntercept?: () => void }>(({ state, onImpact, onIntercept }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const bg = document.createElement('canvas');
    bg.width = 1200;
    bg.height = 800;
    const ctx = bg.getContext('2d');
    if (ctx) {
      // Base background: Ocean (Gulf) covering everything
      ctx.fillStyle = 'hsla(215, 50%, 12%, 0.3)';
      ctx.fillRect(0, 0, 1200, 800);
      
      // 1. Peninsula (Left side, x=0 to ~150)
      ctx.fillStyle = 'hsla(140, 20%, 15%, 0.5)';
      for (let y = 0; y < 800; y += 8) {
        const xEdge = 120 + Math.sin(y * 0.01) * 40 + Math.sin(y * 0.05) * 15 + Math.random() * 20;
        ctx.fillRect(0, y, xEdge, 8);
      }
      
      // 2. Gulf (Ocean textures from x=150 to x=600)
      ctx.fillStyle = 'hsla(215, 60%, 20%, 0.2)';
      for(let i = 0; i < 2000; i++) {
        ctx.fillRect(100 + Math.random()*500, Math.random()*800, 4, 4);
      }
      
      // 3. Desert coastline / Desert (x=500 to 1200)
      ctx.fillStyle = 'hsla(30, 40%, 10%, 0.4)';
      for (let y = 0; y < 800; y += 8) {
        // Coastline edge gently waving
        const xEdge = 550 + Math.sin(y * 0.008) * 60 + Math.sin(y * 0.03) * 20 + Math.random() * 30;
        ctx.fillRect(xEdge, y, 1200 - xEdge, 8);
      }
      
      // 4. Desert textures (sand pixels)
      ctx.fillStyle = 'hsla(30, 60%, 20%, 0.2)';
      for(let i = 0; i < 3000; i++) {
        ctx.fillRect(500 + Math.random()*700, Math.random()*800, 4, 4);
      }

      // 5. Canyons & dunes (Far right, x=800 to 1200)
      ctx.fillStyle = 'hsla(20, 50%, 8%, 0.6)';
      for (let i = 0; i < 60; i++) {
        const cy = Math.random() * 800;
        const cx = 750 + Math.random() * 400;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 60 + Math.random()*120, cy + 30 + Math.random()*80);
        ctx.lineTo(cx + 20 + Math.random()*40, cy + 80 + Math.random()*40);
        ctx.fill();
      }
    }
    bgCanvasRef.current = bg;
  }, []);
  const unitsRef = useRef<Unit[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const impactsRef = useRef<{ x: number; y: number; timer: number; success: boolean; type: string }[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  let nextId = 0;

  const prevCountsRef = useRef({ patriots: 0, miniguns: 0, radars: 0, baseIds: '' });
  const coalitionPositionsRef = useRef<Map<string, { x: number; y: number; pulsePhase: number }>>(new Map());

  // Sync units from state
  useEffect(() => {
    const baseIds = state.regime.bases.filter(b => b.alive).map(b => b.id).join(',');
    const counts = {
      patriots: state.coalition.patriots,
      miniguns: state.coalition.miniguns,
      radars: state.coalition.radarSpots,
      baseIds,
    };
    const prev = prevCountsRef.current;
    
    if (
      counts.patriots === prev.patriots &&
      counts.miniguns === prev.miniguns &&
      counts.radars === prev.radars &&
      counts.baseIds === prev.baseIds
    ) {
      // Still update revealed status
      for (const u of unitsRef.current) {
        if (u.type.startsWith('base_')) {
          const base = state.regime.bases.find(b => b.id === u.id);
          if (base) {
            u.revealed = base.revealed;
            u.revealedType = base.revealedType;
            u.burialLevel = base.burialLevel;
            u.alive = base.alive;
          }
        }
      }
      return;
    }
    prevCountsRef.current = counts;

    const units: Unit[] = [];
    for (const b of state.regime.bases) {
      // Show if alive OR if known to coalition (as a cross/gray)
      const shouldShow = b.alive || b.knownToCoalition;
      if (!shouldShow) continue;

      units.push({
        id: b.id,
        type: `base_${b.type}`,
        x: b.x, y: b.y, alive: b.alive, pulsePhase: Math.random() * Math.PI * 2,
        burialLevel: b.burialLevel,
        revealed: b.revealed,
        revealedType: b.revealedType,
        knownToCoalition: b.knownToCoalition,
      });
    }

    const posCache = coalitionPositionsRef.current;
    const newCache = new Map<string, { x: number; y: number; pulsePhase: number }>();

    const addCachedUnit = (type: string, count: number, xMin: number, xRange: number, yMin: number, yRange: number) => {
      for (let i = 0; i < count; i++) {
        const key = `${type}_${i}`;
        let pos = posCache.get(key);
        if (!pos) {
          pos = { x: xMin + Math.random() * xRange, y: yMin + Math.random() * yRange, pulsePhase: Math.random() * Math.PI * 2 };
        }
        newCache.set(key, pos);
        units.push({ id: key, type, x: pos.x, y: pos.y, alive: true, pulsePhase: pos.pulsePhase });
      }
    };

    addCachedUnit('patriot', state.coalition.patriots, 0.08, 0.05, 0.1, 0.8);
    addCachedUnit('minigun', state.coalition.miniguns, 0.12, 0.05, 0.15, 0.7);
    addCachedUnit('radar', state.coalition.radarSpots, 0.18, 0.05, 0.1, 0.8);
    coalitionPositionsRef.current = newCache;
    unitsRef.current = units;
  }, [state.regime.bases, state.coalition.patriots, state.coalition.miniguns, state.coalition.radarSpots]);

  // Sync logical fighters
  useEffect(() => {
    const flying = state.coalition.flyingFighters;
    const projectiles = projectilesRef.current;
    
    // 1. Remove projectiles that no longer have a logical fighter
    projectilesRef.current = projectiles.filter(p => {
      if (p.type !== 'fighter' || !p.logicalId) return true;
      return flying.some(f => f.id === p.logicalId && f.state !== 'reloading');
    });

    // 2. Add projectiles for new logical fighters
    for (const f of flying) {
      if (f.state !== 'reloading' && !projectilesRef.current.some(p => p.logicalId === f.id)) {
        projectilesRef.current.push({
          id: Date.now() + Math.random(),
          logicalId: f.id,
          type: 'fighter',
          x: 0.05, y: 0.2 + Math.random() * 0.6,
          targetX: f.targetX, targetY: f.targetY,
          speed: 0, // Driven by state
          baseSpeed: 0,
          progress: 0,
          intercepted: false,
          interceptAt: 1.0,
          trail: [],
          wobble: 0.5,
          size: 4,
          alive: true,
          explosionTimer: 0,
          returning: false,
          delay: 0
        });
      }
    }
  }, [state.coalition.flyingFighters]);

  const spawnProjectile = useCallback((type: 'missile' | 'drone' | 'strike' | 'fighter', delay = 0, tx?: number, ty?: number) => {
    const startX = type === 'strike' || type === 'fighter' ? 0.05 + Math.random() * 0.05 : 0.8 + Math.random() * 0.1;
    const startY = 0.1 + Math.random() * 0.8;
    
    let targetX = tx ?? 0.5, targetY = ty ?? 0.5;
    if (tx === undefined && ty === undefined) {
      if (type === 'strike') {
        const liveBases = unitsRef.current.filter(u => u.type.startsWith('base_') && u.alive);
        targetX = 0.3 + Math.random() * 0.5;
        targetY = 0.1 + Math.random() * 0.8;
        if (liveBases.length > 0) {
          const b = liveBases[Math.floor(Math.random() * liveBases.length)];
          targetX = b.x;
          targetY = b.y;
        }
      } else if (type === 'fighter') {
        targetX = 0.8; targetY = 0.1 + Math.random() * 0.8;
      } else {
        targetX = 0.08; targetY = 0.1 + Math.random() * 0.8;
      }
    } else {
      // If tx is provided, we respect it for all types, 
      // unless it is a drone/missile that somehow missed its target.
      // But for strikes, we MUST use tx.
      targetX = tx;
      targetY = ty;
    }

    // SPEED SYNC: state.speed / flightTicks
    const flightTicks = type === 'missile' ? MISSILE_FLIGHT_TIME : type === 'drone' ? DRONE_FLIGHT_TIME : type === 'strike' ? STRIKE_FLIGHT_TIME : 25;
    const baseSpeed = 1.0 / flightTicks;
    const mSpeed = baseSpeed * state.speed;

    projectilesRef.current.push({
      id: nextId++, type,
      x: startX, y: startY, targetX, targetY,
      speed: mSpeed,
      baseSpeed,
      progress: 0, intercepted: false, interceptAt: 1,
      trail: [],
      wobble: type === 'drone' ? 10 + Math.random() * 8 : type === 'missile' ? 0.5 + Math.random() * 0.5 : 0,
      size: type === 'drone' ? 2 : type === 'missile' ? 5 : type === 'fighter' ? 3 : 5,
      alive: true, explosionTimer: 0,
      returning: false,
      delay,
    });
  }, [state.speed]);

  useEffect(() => {
    for (const p of projectilesRef.current) {
      p.speed = p.baseSpeed * state.speed;
    }
  }, [state.speed]);

  const spawnVisualInterceptor = useCallback((target: Projectile) => {
    const patriots = unitsRef.current.filter(u => u.type === 'patriot' && u.alive);
    if (patriots.length === 0) return;

    // PREDICT MEETING POINT
    const progressLeft = 1.0 - target.progress;
    // We aim for an intercept late in the target's flight, giving 
    // the interceptor a healthy visual distance to cover, making it slower and more imposing.
    const margin = Math.max(0.01, progressLeft * 0.8); 
    const meetingProgress = Math.min(0.995, target.progress + margin);

    const dx = target.targetX - target.x;
    const dy = target.targetY - target.y;
    const tx = target.x + dx * meetingProgress;
    const ty = target.y + dy * meetingProgress;

    // SELECT CLOSEST Patriot
    let pat = patriots[0];
    let minDist = Infinity;
    for (const p of patriots) {
      const d = Math.sqrt(Math.pow(tx - p.x, 2) + Math.pow(ty - p.y, 2));
      if (d < minDist) {
        minDist = d;
        pat = p;
      }
    }

    const progressToCover = (meetingProgress - target.progress);
    
    // Exact synchronization: The interceptor must take the exact same visual duration
    // as the target. Interceptor progress 0->1 must happen in the same time target progress adds `progressToCover`
    const baseInterceptorSpeed = target.baseSpeed / Math.max(0.01, progressToCover);
    
    target.interceptAt = meetingProgress;

    projectilesRef.current.push({
      id: nextId++, type: 'interceptor',
      x: pat.x, y: pat.y, targetX: tx, targetY: ty,
      speed: baseInterceptorSpeed * state.speed,
      baseSpeed: baseInterceptorSpeed,
      progress: 0, intercepted: false, interceptAt: 1,
      trail: [], wobble: 0, size: 3, alive: true, explosionTimer: 0,
      delay: 0, 
    });
  }, [state.speed]);

  // Launch Watchers
  const lastHandledLaunchesRef = useRef({ 
    missiles: state.regime.totalMissilesLaunched, 
    drones: state.regime.totalDronesLaunched, 
    strikes: state.coalition.totalStrikes,
    fighters: state.coalition.fightersOnPatrol 
  });
  
  useEffect(() => {
    const last = lastHandledLaunchesRef.current;
    
    if (state.regime.totalMissilesLaunched > last.missiles) {
      const delta = state.regime.totalMissilesLaunched - last.missiles;
      const newGroups = state.regime.flyingMissiles.slice(-delta);
      for (let i = 0; i < delta; i++) {
        const g = newGroups[i];
        spawnProjectile('missile', i * 0.1, g?.targetX, g?.targetY);
      }
      last.missiles = state.regime.totalMissilesLaunched;
    }

    if (state.regime.totalDronesLaunched > last.drones) {
      const delta = state.regime.totalDronesLaunched - last.drones;
      const newGroups = state.regime.flyingDrones.slice(-delta);
      for (let i = 0; i < delta; i++) {
        const g = newGroups[i];
        spawnProjectile('drone', i * 0.05, g?.targetX, g?.targetY);
      }
      last.drones = state.regime.totalDronesLaunched;
    }

    if (state.coalition.totalStrikes > last.strikes) {
      const delta = state.coalition.totalStrikes - last.strikes;
      const newGroups = state.coalition.flyingStrikes.slice(-delta);
      for (let i = 0; i < delta; i++) {
        const g = newGroups[i];
        // Reduced delay to 0.05s for tighter, less 'stuck' looking salvos
        spawnProjectile('strike', i * 0.05, g?.targetX, g?.targetY);
      }
      last.strikes = state.coalition.totalStrikes;
    }

    if (state.coalition.fightersOnPatrol > last.fighters) {
      const delta = state.coalition.fightersOnPatrol - last.fighters;
      for (let i = 0; i < delta; i++) spawnProjectile('fighter', i * 0.2);
      last.fighters = state.coalition.fightersOnPatrol;
    }
  }, [state.regime.totalMissilesLaunched, state.regime.totalDronesLaunched, state.coalition.totalStrikes, state.coalition.fightersOnPatrol, spawnProjectile]);

  // Interception Watcher
  const lastHandledInterceptsRef = useRef({ 
    shots: state.coalition.totalPatriotShots, 
    drones: state.coalition.totalDronesIntercepted,
    minigunKills: state.coalition.totalMinigunKills || 0,
    dronePatKills: state.coalition.totalDronePatriotKills || 0,
    minigunBullets: state.coalition.totalMinigunBullets || 0
  });

  // Game Restart Reset
  useEffect(() => {
    if (state.tick === 0) {
      projectilesRef.current = [];
      impactsRef.current = [];
      lastHandledLaunchesRef.current = { 
        missiles: state.regime.totalMissilesLaunched, 
        drones: state.regime.totalDronesLaunched, 
        strikes: state.coalition.totalStrikes,
        fighters: state.coalition.fightersOnPatrol 
      };
      lastHandledInterceptsRef.current = { 
        shots: state.coalition.totalPatriotShots,
        drones: state.coalition.totalDronesIntercepted,
        minigunKills: state.coalition.totalMinigunKills || 0,
        dronePatKills: state.coalition.totalDronePatriotKills || 0,
        minigunBullets: state.coalition.totalMinigunBullets || 0
      };
      prevCountsRef.current = { patriots: 0, miniguns: 0, radars: 0, baseIds: '' };
      coalitionPositionsRef.current.clear();
    }
  }, [state.tick, state.regime.totalMissilesLaunched, state.regime.totalDronesLaunched, state.coalition.totalStrikes, state.coalition.fightersOnPatrol, state.coalition.totalPatriotShots, state.coalition.totalDronesIntercepted]);

  useEffect(() => {
    const last = lastHandledInterceptsRef.current;
    
    if (state.coalition.totalPatriotShots > last.shots) {
      const delta = state.coalition.totalPatriotShots - last.shots;
      last.shots = state.coalition.totalPatriotShots;
      
      for (let i = 0; i < delta; i++) {
        // Find best target: missile, alive, past fog line, not already marked
        // PRIORITY: Find missiles closest to impact (we add a small visual grace margin to the fog limit)
        const target = projectilesRef.current
          .filter(p => p.type === 'missile' && p.alive && p.progress > (1 - state.coalition.fogOfWarLimit - 0.1) && p.interceptAt === 1)
          .sort((a, b) => b.progress - a.progress)[0];
        
        if (target) {
          spawnVisualInterceptor(target);
        } else {
          // Fallback: search for ANY drone if no missile
          const droneTarget = projectilesRef.current
            .filter(p => p.type === 'drone' && p.alive && p.interceptAt === 1)
            .sort((a, b) => b.progress - a.progress)[0];
          
          if (droneTarget) {
            spawnVisualInterceptor(droneTarget);
          } else {
            // General defensive fire: make it 'majestic and slow' too
            const patriots = unitsRef.current.filter(u => u.type === 'patriot' && u.alive);
            if (patriots.length > 0) {
              const pat = patriots[Math.floor(Math.random() * patriots.length)];
              const tx = 0.2 + Math.random() * 0.1;
              const ty = 0.1 + Math.random() * 0.8;
              const baseInterceptorSpeed = 0.8;
              projectilesRef.current.push({
                id: nextId++, type: 'interceptor',
                x: pat.x, y: pat.y, targetX: tx, targetY: ty,
                speed: baseInterceptorSpeed * state.speed,
                baseSpeed: baseInterceptorSpeed,
                progress: 0, intercepted: false, interceptAt: 1,
                trail: [], wobble: 0, size: 3, alive: true, explosionTimer: 0, delay: 0,
              });
            }
          }
        }
      }
    }

    // Visual Tracers for Miniguns (Bullets based)
    if ((state.coalition.totalMinigunBullets || 0) > (last.minigunBullets || 0)) {
      const deltaBullets = state.coalition.totalMinigunBullets - (last.minigunBullets || 0);
      last.minigunBullets = state.coalition.totalMinigunBullets;

      // Spawning VISUAL bullets only (they don't instantly kill drones)
      const targetPool = projectilesRef.current.filter(p => p.type === 'drone' && !p.intercepted && p.alive && p.progress >= 0.65)
        .sort((a, b) => b.progress - a.progress);
        
      if (targetPool.length > 0) {
        for (let i = 0; i < deltaBullets; i++) {
          const t = targetPool[i % targetPool.length];
          const interceptOffset = Math.random() * 0.05; // randomized hit offset
          const predictedX = t.x + (t.targetX - t.x) * Math.min(1.0, t.progress + interceptOffset);
          const predictedY = t.y + (t.targetY - t.y) * Math.min(1.0, t.progress + interceptOffset);
          
          const miniguns = unitsRef.current.filter(u => u.type === 'minigun' && u.alive);
          let srcX = 0.2; let srcY = 0.5;
          if (miniguns.length > 0) {
            const m = miniguns[Math.floor(Math.random() * miniguns.length)];
            srcX = m.x; srcY = m.y;
          }
          
          const mSpeed = state.coalition.minigunProjectileSpeed || 25;
          projectilesRef.current.push({
            id: nextId++, type: 'minigun_tracer',
            x: srcX, y: srcY,
            targetX: predictedX,
            targetY: predictedY,
            speed: mSpeed * state.speed, baseSpeed: mSpeed, // Adjustable speed
            progress: 0, intercepted: false, interceptAt: 1, trail: [], wobble: 0, size: 1, 
            alive: true, explosionTimer: 0, delay: Math.random() * 0.15 // Slightly more staggered for stream effect
          });
        }
      }
    }

    // Actual Drone deaths from Miniguns logically in engine.ts
    if ((state.coalition.totalMinigunKills || 0) > (last.minigunKills || 0)) {
      const deltaKills = state.coalition.totalMinigunKills - (last.minigunKills || 0);
      last.minigunKills = state.coalition.totalMinigunKills;

      const killTargets = projectilesRef.current.filter(p => p.type === 'drone' && !p.intercepted && p.alive && p.interceptAt === 1)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, deltaKills);
        
      killTargets.forEach(t => {
        t.interceptAt = t.progress + 0.05; // drone visibly dies slightly later
      });
    }

    // Visual Backup for Patriots on drones
    if ((state.coalition.totalDronePatriotKills || 0) > (last.dronePatKills || 0)) {
      const delta = state.coalition.totalDronePatriotKills - (last.dronePatKills || 0);
      last.dronePatKills = state.coalition.totalDronePatriotKills;

      const targets = projectilesRef.current.filter(p => p.type === 'drone' && !p.intercepted && p.alive && p.interceptAt === 1)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, delta);
        
      targets.forEach(t => {
        spawnVisualInterceptor(t);
      });
    }
  }, [state.coalition.totalPatriotShots, state.coalition.totalMinigunKills, state.coalition.totalDronePatriotKills, spawnVisualInterceptor]);

  useImperativeHandle(ref, () => ({
    launchDrones: (n) => {}, // now handled by state
    launchMissiles: (n) => {},
    launchStrike: (n) => {},
    launchFighter: (n) => {},
    addAA: () => {},
    addBase: () => {
       // Optional: flash new bases?
    }
  }));

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

      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0, w, h);
      }

      // Grid
      ctx.strokeStyle = 'hsla(220, 15%, 15%, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Base Detection Line
      const baseFogX = w * 0.42;
      ctx.strokeStyle = 'hsla(45, 50%, 40%, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      ctx.beginPath(); ctx.moveTo(baseFogX, 0); ctx.lineTo(baseFogX, h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '10px Orbitron';
      ctx.fillStyle = 'hsla(45, 50%, 40%, 0.3)';
      ctx.fillText('BASE DETECTION', baseFogX + 4, h - 16);

      const currentState = stateRef.current;
      const fogLimit = currentState.coalition.fogOfWarLimit;
      const role = currentState.role;
      const showFog = role === 'coalition'; // Only show fog for coalition player

      // FOG OF WAR — only visible when playing coalition
      if (showFog) {
        const fogStartX = fogLimit * w;
        if (fogStartX < w) {
          const fogGrad = ctx.createLinearGradient(fogStartX - 30, 0, fogStartX + 40, 0);
          fogGrad.addColorStop(0, 'hsla(220, 20%, 4%, 0)');
          fogGrad.addColorStop(1, 'hsla(220, 20%, 4%, 0.85)');
          ctx.fillStyle = fogGrad;
          ctx.fillRect(fogStartX - 30, 0, w - fogStartX + 30, h);
          ctx.fillStyle = 'hsla(220, 20%, 4%, 0.85)';
          ctx.fillRect(fogStartX + 40, 0, w - fogStartX - 40, h);
          ctx.font = '10px Orbitron';
          ctx.fillStyle = 'hsla(0, 0%, 50%, 0.4)';
          ctx.fillText('FOG OF WAR', fogStartX + 10, 16);
        }
      }

      // Always show demarcation line (fog limit)
      const fogStartX = fogLimit * w;
      ctx.strokeStyle = 'hsla(180, 60%, 50%, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(fogStartX, 0); ctx.lineTo(fogStartX, h); ctx.stroke();
      ctx.setLineDash([]);

      // Scan zone
      if (currentState.coalition.scanActive) {
        const sector = currentState.coalition.scanSector;
        const sizeMult = currentState.coalition.scanSizeMultiplier || 1.0;
        
        const sx = 0.6 * w;
        let sy = sector === 'north' ? 0.1 * h : 0.5 * h;
        let sh = 0.4 * h;

        // If sizeMult is high, expand the visual
        if (sizeMult >= 1.5) {
          sy = 0.1 * h;
          sh = 0.8 * h;
        }

        const sw = 0.38 * w;

        ctx.strokeStyle = 'hsla(120, 80%, 50%, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
        ctx.fillStyle = 'hsla(120, 80%, 50%, 0.03)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.font = '10px Orbitron';
        ctx.fillStyle = 'hsla(120, 80%, 50%, 0.5)';
        ctx.fillText(`SCAN ACTIVE: ${sizeMult >= 1.5 ? 'FULL' : sector.toUpperCase()}`, sx + 4, sy + 14);
      }

      // Radar lockdown visual
      if (currentState.regime.radarLockdownActive) {
        ctx.fillStyle = 'hsla(0, 70%, 50%, 0.05)';
        ctx.fillRect(0, 0, w, h);
        ctx.font = '12px Orbitron';
        ctx.fillStyle = 'hsla(0, 70%, 50%, 0.6)';
        ctx.fillText('⚡ RADAR JAMMED', w / 2 - 60, 20);
      }

      // Zone labels
      ctx.font = '10px Orbitron';
      ctx.fillStyle = 'hsla(210, 80%, 55%, 0.4)';
      ctx.fillText('COALITION', 10, 16);
      ctx.fillStyle = 'hsla(0, 70%, 50%, 0.4)';
      if (!showFog || fogStartX >= w - 60) {
        ctx.fillText('REGIME', w - 70, 16);
      }

      const now = time / 1000;

      // Draw units
      for (const u of unitsRef.current) {
        const ux = u.x * w;
        const uy = u.y * h;

        // Check if unit is in fog (only affects coalition view)
        const inFog = showFog && u.type.startsWith('base_') && u.x > fogLimit;

        if (u.type.startsWith('base_')) {
          if (inFog && !u.knownToCoalition) continue;

          // CASE 1: DESTROYED (but known)
          if (!u.alive) {
            ctx.strokeStyle = 'hsla(0, 80%, 50%, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ux - 6, uy - 6); ctx.lineTo(ux + 6, uy + 6);
            ctx.moveTo(ux + 6, uy - 6); ctx.lineTo(ux - 6, uy + 6);
            ctx.stroke();
            continue;
          }

          // CASE 2: KNOWN but NOT REVEALED (Grayed out generic)
          if (u.knownToCoalition && !u.revealed) {
            ctx.fillStyle = 'hsla(0, 0%, 40%, 0.5)';
            ctx.fillRect(ux - 4, uy - 4, 8, 8);
            ctx.strokeStyle = 'hsla(0, 0%, 60%, 0.4)';
            ctx.strokeRect(ux - 4, uy - 4, 8, 8);
            continue;
          }

          // CASE 3: REVEALED (Full detail)
          if (u.type === 'base_military') {
            const pulse = 0.8 + Math.sin(now * 2 + u.pulsePhase) * 0.2;
            const buried = u.burialLevel ?? 0;
            
            if (buried > 0) {
              for (let ring = buried; ring > 0; ring--) {
                ctx.strokeStyle = `hsla(30, 60%, 50%, ${0.15 + ring * 0.1})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
                ctx.beginPath(); ctx.arc(ux, uy, 8 + ring * 6, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            const glow = ctx.createRadialGradient(ux, uy, 0, ux, uy, 14);
            glow.addColorStop(0, `hsla(0, 70%, 50%, ${0.25 * pulse})`);
            glow.addColorStop(1, 'hsla(0, 70%, 50%, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(ux, uy, 14, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.translate(ux, uy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = `hsla(0, 60%, ${30 + buried * 5}%, ${pulse})`;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.strokeStyle = 'hsl(0, 70%, 55%)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-5, -5, 10, 10);
            ctx.restore();

            if (u.revealed && u.revealedType) {
              ctx.font = '8px JetBrains Mono';
              ctx.fillStyle = 'hsla(120, 80%, 60%, 0.8)';
              ctx.fillText('MIL', ux - 8, uy - 12);
            }
          } else if (u.type === 'base_civilian') {
            ctx.fillStyle = 'hsla(120, 50%, 45%, 0.9)';
            ctx.fillRect(ux - 5, uy - 4, 10, 8);
            ctx.beginPath();
            ctx.moveTo(ux - 6, uy - 4);
            ctx.lineTo(ux, uy - 10);
            ctx.lineTo(ux + 6, uy - 4);
            ctx.closePath();
            ctx.fill();
            if (u.revealed) {
              ctx.font = '8px JetBrains Mono';
              ctx.fillStyle = 'hsla(120, 80%, 60%, 0.8)';
              ctx.fillText('CIV', ux - 8, uy - 12);
            }
          } else if (u.type === 'base_fake') {
            ctx.save();
            ctx.translate(ux, uy);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = 'hsla(45, 70%, 50%, 0.7)';
            ctx.fillRect(-4, -4, 8, 8);
            ctx.strokeStyle = 'hsla(45, 80%, 60%, 0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-4, -4, 8, 8);
            ctx.restore();
            if (u.revealed) {
              ctx.font = '8px JetBrains Mono';
              ctx.fillStyle = 'hsla(45, 80%, 60%, 0.8)';
              ctx.fillText('FAKE', ux - 10, uy - 8);
            }
          }
        } else if (u.type === 'patriot') {
          const glow = ctx.createRadialGradient(ux, uy, 0, ux, uy, 18);
          glow.addColorStop(0, 'hsla(210, 80%, 55%, 0.15)');
          glow.addColorStop(1, 'hsla(210, 80%, 55%, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(ux, uy, 18, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'hsl(210, 50%, 35%)';
          ctx.beginPath(); ctx.arc(ux, uy, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsl(210, 70%, 55%)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(ux, uy, 6, 0, Math.PI * 2); ctx.stroke();
          const sweep = (now * 2 + u.pulsePhase) % (Math.PI * 2);
          ctx.strokeStyle = 'hsla(210, 80%, 60%, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + Math.cos(sweep) * 14, uy + Math.sin(sweep) * 14); ctx.stroke();
        } else if (u.type === 'minigun') {
          ctx.fillStyle = 'hsl(35, 70%, 40%)';
          ctx.beginPath(); ctx.arc(ux, uy, 3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsl(35, 80%, 55%)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ux, uy, 3, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = 'hsl(35, 60%, 50%)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + 8, uy - 4); ctx.stroke();
        } else if (u.type === 'radar') {
          ctx.strokeStyle = 'hsla(180, 60%, 50%, 0.6)';
          ctx.lineWidth = 1;
          const angle = (now * 1.5 + u.pulsePhase) % (Math.PI * 2);
          ctx.beginPath(); ctx.arc(ux, uy, 10, angle, angle + Math.PI * 0.4); ctx.stroke();
          ctx.fillStyle = 'hsla(180, 60%, 50%, 0.3)';
          ctx.beginPath(); ctx.arc(ux, uy, 2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsla(180, 60%, 50%, 0.08)';
          ctx.beginPath(); ctx.arc(ux, uy, 35, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // Coalition city background
      ctx.fillStyle = 'hsl(210, 40%, 25%)';
      for (let i = 0; i < 6; i++) {
        const cx = 6 + i * 12;
        const cy = h / 2 - 30 + (i % 3) * 15;
        const bh = 10 + Math.sin(i * 1.7) * 6;
        ctx.fillRect(cx, cy, 6, bh);
      }

      // Projectiles
      const stillAlive: Projectile[] = [];
      for (const p of projectilesRef.current) {
        if (!p.alive && p.explosionTimer <= 0) continue;

        if (p.alive) {
          if (p.delay > 0) {
            p.delay -= dt;
            stillAlive.push(p);
            continue;
          }

          if (p.type === 'fighter' && p.logicalId) {
            const f = stateRef.current.coalition.flyingFighters.find(ff => ff.id === p.logicalId);
            if (!f) {
              p.alive = false;
              continue;
            }
            
            const isReturning = f.state === 'returning';
            if (p.returning !== isReturning) {
              p.returning = isReturning;
              // Swapping logic needs dx/dy based on PREVIOUS target
              const oldDx = p.targetX - p.x;
              const oldDy = p.targetY - p.y;
              p.x = p.x + oldDx * p.progress;
              p.y = p.y + oldDy * p.progress;
              p.targetX = f.targetX;
              p.targetY = f.targetY;
              p.progress = 0;
              p.trail = [];
            }
            
            p.progress = 1 - (f.timer / f.maxTimer);
          } else {
            p.progress += p.speed * dt;
          }
          
          const t = p.progress;
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const currentNormX = p.x + dx * t;
          const currentNormY = p.y + dy * t;

          // Fighter shooting animation
          // Only shoot if in enemy territory (deep x > 0.6)
          if (p.type === 'fighter' && !p.returning && currentNormX > 0.6 && Math.random() < 0.05) {
            sounds.play('fighter_shoot');
            const targetX = currentNormX + 0.2 + Math.random() * 0.3; // shoot forward
            const targetY = currentNormY + (Math.random() - 0.5) * 0.4;
            projectilesRef.current.push({
              id: Date.now() + Math.random(),
              type: 'fighter_tracer',
              x: currentNormX, y: currentNormY, targetX, targetY,
              speed: 1.5 * stateRef.current.speed, baseSpeed: 1.5, progress: 0,
              intercepted: false, interceptAt: 1.0,
              trail: [], wobble: 0, size: 2, alive: true, explosionTimer: 0, delay: 0
            });
          }

          const perpX = -dy; const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const wobbleOffset = Math.sin(t * 20 + p.id) * p.wobble;
          const curX = (currentNormX + (perpX / len) * wobbleOffset * 0.01) * w;
          const curY = (currentNormY + (perpY / len) * wobbleOffset * 0.01) * h;

          p.trail.push({ x: curX, y: curY });
          let maxTrail = 10;
          if (p.type === 'strike') maxTrail = 40;
          else if (p.type === 'missile') maxTrail = 30;
          else if (p.type === 'interceptor') maxTrail = 20;
          else if (p.type === 'fighter') maxTrail = 15;
          else if (p.type === 'minigun_tracer') maxTrail = 8; // Longer trail for stream feel
          
          if (p.trail.length > maxTrail) p.trail.shift();

          if (p.progress >= p.interceptAt && p.interceptAt < 1) {
            p.alive = false; p.intercepted = true; p.explosionTimer = 0.5;
            impactsRef.current.push({ x: curX, y: curY, timer: p.type === 'drone' ? 0.3 : 1.2, success: false, type: p.type });
            if (onIntercept) onIntercept();
          }
          if (p.progress >= 1) {
            const isLogicalHit = p.type === 'drone' || p.type === 'missile' || p.type === 'strike';
            if (onImpact && isLogicalHit) onImpact(p.type);
            
            p.alive = false;
            p.explosionTimer = p.type === 'strike' ? 1.0 : p.type === 'missile' ? 1.5 : p.type === 'interceptor' ? 0.5 : p.type === 'fighter' ? 0.1 : (p.type === 'minigun_tracer' || p.type === 'fighter_tracer') ? 0 : 0.4;
            const isHit = p.type !== 'strike' && p.type !== 'fighter' && p.type !== 'interceptor' && p.type !== 'minigun_tracer' && p.type !== 'fighter_tracer';
            const hitTimer = p.type === 'drone' ? 1.0 : p.type === 'missile' ? 3.0 : 1.5;
            if (p.type === 'minigun_tracer' || p.type === 'fighter_tracer') {
              impactsRef.current.push({ x: curX, y: curY, timer: 0.1, success: false, type: p.type });
            } else {
              impactsRef.current.push({ x: curX, y: curY, timer: isHit ? hitTimer : 1.5, success: isHit, type: p.type });
            }
          }

          const hideInFog = showFog && (p.type === 'missile' || p.type === 'drone') && curX > fogLimit * w;

          // Trail rendering
          if (p.trail.length > 1 && !hideInFog) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
            if (p.type === 'strike') {
              ctx.strokeStyle = 'hsla(195, 100%, 75%, 0.9)'; ctx.lineWidth = 4; ctx.stroke();
              ctx.strokeStyle = 'hsla(195, 100%, 85%, 0.2)'; ctx.lineWidth = 14; ctx.stroke();
            } else if (p.type === 'fighter') {
              ctx.strokeStyle = p.returning ? 'hsla(180, 70%, 50%, 0.2)' : 'hsla(180, 90%, 60%, 0.6)';
              ctx.lineWidth = 2; ctx.stroke();
            } else if (p.type === 'drone') {
              ctx.strokeStyle = 'hsla(0, 55%, 50%, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
            } else if (p.type === 'interceptor') {
              ctx.strokeStyle = 'hsla(210, 100%, 75%, 0.85)'; ctx.lineWidth = 2; ctx.stroke();
              ctx.strokeStyle = 'hsla(210, 100%, 85%, 0.3)'; ctx.lineWidth = 6; ctx.stroke();
              ctx.strokeStyle = 'hsla(190, 100%, 90%, 0.1)'; ctx.lineWidth = 12; ctx.stroke();
            } else if (p.type === 'minigun_tracer') {
              ctx.strokeStyle = 'hsla(45, 100%, 75%, 0.8)'; ctx.lineWidth = 1; ctx.stroke();
              ctx.strokeStyle = 'hsla(45, 100%, 85%, 0.3)'; ctx.lineWidth = 2; ctx.stroke();
            } else if (p.type === 'fighter_tracer') {
              ctx.strokeStyle = 'hsla(180, 100%, 75%, 0.8)'; ctx.lineWidth = 1; ctx.stroke();
              ctx.strokeStyle = 'hsla(180, 100%, 85%, 0.3)'; ctx.lineWidth = 2; ctx.stroke();
            } else {
              ctx.strokeStyle = 'hsla(15, 90%, 55%, 0.85)'; ctx.lineWidth = 3; ctx.stroke();
              ctx.strokeStyle = 'hsla(25, 100%, 65%, 0.15)'; ctx.lineWidth = 8; ctx.stroke();
            }
          }

          // Head rendering
          if (hideInFog) {
            // Skip head
          } else if (p.type === 'minigun_tracer' || p.type === 'fighter_tracer') {
            ctx.fillStyle = p.type === 'fighter_tracer' ? 'hsla(180, 100%, 80%, 1)' : 'hsla(45, 100%, 80%, 1)';
            const tdx = p.targetX - p.x; const tdy = p.targetY - p.y;
            const angle = Math.atan2(tdy, tdx);
            ctx.save(); ctx.translate(curX, curY); ctx.rotate(angle);
            ctx.fillRect(p.type === 'fighter_tracer' ? -3 : -2, -0.5, p.type === 'fighter_tracer' ? 6 : 4, 1);
            ctx.restore();
          } else if (p.type === 'strike') {
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 12);
            grd.addColorStop(0, 'hsla(195, 100%, 95%, 1)');
            grd.addColorStop(0.4, 'hsla(195, 100%, 70%, 0.5)');
            grd.addColorStop(1, 'hsla(195, 100%, 50%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 12, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'fighter') {
            ctx.fillStyle = p.returning ? 'hsl(180, 60%, 45%)' : 'hsl(180, 80%, 60%)';
            ctx.beginPath();
            const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
            ctx.save(); ctx.translate(curX, curY); ctx.rotate(angle);
            ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4);
            ctx.closePath(); ctx.fill();
            ctx.restore();
          } else if (p.type === 'drone') {
            ctx.fillStyle = 'hsl(0, 50%, 55%)';
            ctx.beginPath(); ctx.arc(curX, curY, 2, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'interceptor') {
            // Bright blue interceptor missile — very visible
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 12);
            grd.addColorStop(0, 'hsla(210, 100%, 95%, 1)');
            grd.addColorStop(0.2, 'hsla(210, 100%, 75%, 0.9)');
            grd.addColorStop(0.5, 'hsla(210, 100%, 55%, 0.4)');
            grd.addColorStop(1, 'hsla(210, 80%, 40%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 12, 0, Math.PI * 2); ctx.fill();
            const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
            ctx.save(); ctx.translate(curX, curY); ctx.rotate(angle);
            ctx.fillStyle = 'hsl(210, 80%, 80%)';
            ctx.fillRect(-8, -2, 16, 4);
            ctx.fillStyle = 'hsl(210, 100%, 90%)';
            ctx.fillRect(6, -3, 5, 6);
            ctx.restore();
            // Label
            ctx.font = '7px JetBrains Mono';
            ctx.fillStyle = 'hsla(210, 80%, 70%, 0.7)';
            ctx.fillText('INT', curX - 6, curY - 10);
          } else {
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 10);
            grd.addColorStop(0, 'hsla(20, 100%, 80%, 1)');
            grd.addColorStop(0.3, 'hsla(10, 100%, 60%, 0.7)');
            grd.addColorStop(1, 'hsla(0, 80%, 40%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 10, 0, Math.PI * 2); ctx.fill();
            const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
            ctx.save(); ctx.translate(curX, curY); ctx.rotate(angle);
            ctx.fillStyle = 'hsl(0, 0%, 65%)';
            ctx.fillRect(-8, -2, 16, 4);
            ctx.fillStyle = 'hsl(15, 100%, 55%)';
            ctx.fillRect(6, -2.5, 4, 5);
            ctx.restore();
          }
        }

        // Explosions
        if (!p.alive && p.explosionTimer > 0) {
          const last = p.trail[p.trail.length - 1];
          if (last) {
            const maxR = p.intercepted ? 12 : (p.type === 'strike' ? 35 : p.type === 'missile' ? 28 : p.type === 'interceptor' ? 15 : p.type === 'fighter' ? 5 : 10);
            const initialTimer = p.intercepted ? 0.5 : (p.type === 'strike' ? 1.0 : p.type === 'missile' ? 1.5 : p.type === 'interceptor' ? 0.5 : p.type === 'fighter' ? 0.1 : 0.4);
            const r = Math.max(0.1, (1 - p.explosionTimer / initialTimer) * maxR);
            const alpha = Math.max(0, Math.min(1, p.explosionTimer / initialTimer));
            
            if (p.intercepted) {
              if (p.type === 'drone') {
                // Intercepted drone minimal flash
                ctx.fillStyle = `hsla(30, 100%, 65%, ${alpha})`;
                ctx.fillRect(last.x - 2, last.y - 2, 4, 4);
                ctx.fillRect(last.x - 6, last.y - 1, 12, 2);
                ctx.fillRect(last.x - 1, last.y - 6, 2, 12);
                ctx.fillStyle = `hsla(45, 100%, 80%, ${alpha})`;
                ctx.fillRect(last.x - 1, last.y - 1, 2, 2);
              } else {
                const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r * 1.5);
                grd.addColorStop(0, `hsla(210, 100%, 98%, ${alpha})`);
                grd.addColorStop(0.2, `hsla(210, 100%, 85%, ${alpha * 0.9})`);
                grd.addColorStop(0.5, `hsla(210, 100%, 70%, ${alpha * 0.4})`);
                grd.addColorStop(1, 'hsla(210, 100%, 50%, 0)');
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(last.x, last.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
                
                // Electric flash ring
                ctx.strokeStyle = `hsla(210, 100%, 90%, ${alpha * 0.6})`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(last.x, last.y, r * 1.2, 0, Math.PI * 2); ctx.stroke();

                ctx.strokeStyle = `hsla(210, 100%, 95%, ${alpha * 0.9})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(last.x - 6, last.y - 6); ctx.lineTo(last.x + 6, last.y + 6);
                ctx.moveTo(last.x + 6, last.y - 6); ctx.lineTo(last.x - 6, last.y + 6);
                ctx.stroke();
              }
            } else if (p.type === 'strike') {
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(195, 100%, 95%, ${alpha})`);
              grd.addColorStop(0.3, `hsla(200, 100%, 70%, ${alpha * 0.7})`);
              grd.addColorStop(0.6, `hsla(30, 100%, 60%, ${alpha * 0.3})`);
              grd.addColorStop(1, 'hsla(0, 100%, 40%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
            } else if (p.type !== 'fighter') {
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

      // Impact markers
      const aliveImpacts: typeof impactsRef.current = [];
      for (const imp of impactsRef.current) {
        imp.timer -= dt;
        if (imp.timer <= 0) continue;
        aliveImpacts.push(imp);
        const alpha = Math.min(1, imp.timer * 0.6);
        if (!imp.success && (imp.type === 'minigun_tracer' || imp.type === 'fighter_tracer')) {
          // Tracer hit spark
          ctx.fillStyle = imp.type === 'fighter_tracer' ? `hsla(180, 100%, 75%, ${alpha})` : `hsla(45, 100%, 75%, ${alpha})`;
          ctx.fillRect(imp.x - 1, imp.y - 1, imp.type === 'fighter_tracer' ? 3 : 2, imp.type === 'fighter_tracer' ? 3 : 2);
        } else if (imp.success) {
          // Missile/drone hit — big visible red impact
          const pulseR = 6 + (1 - imp.timer / 3.0) * 20;
          // Outer shockwave
          ctx.strokeStyle = `hsla(0, 90%, 55%, ${alpha * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, pulseR + 8, 0, Math.PI * 2); ctx.stroke();
          // Inner glow
          const grd = ctx.createRadialGradient(imp.x, imp.y, 0, imp.x, imp.y, pulseR);
          grd.addColorStop(0, `hsla(15, 100%, 70%, ${alpha})`);
          grd.addColorStop(0.5, `hsla(0, 90%, 50%, ${alpha * 0.5})`);
          grd.addColorStop(1, 'hsla(0, 80%, 40%, 0)');
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, pulseR, 0, Math.PI * 2); ctx.fill();
          // Impact text
          if (imp.timer > 2.0) {
            ctx.font = '10px Orbitron';
            ctx.fillStyle = `hsla(0, 90%, 65%, ${alpha})`;
            ctx.fillText(imp.type === 'missile' ? '💥 HIT' : '💥', imp.x - 12, imp.y - pulseR - 4);
          }
        }
      }
      impactsRef.current = aliveImpacts;

      // HUD
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'hsla(45, 50%, 60%, 0.5)';
      const active = stillAlive.filter(p => p.alive);
      ctx.fillText(`🛩${active.filter(p => p.type === 'drone').length} 🚀${active.filter(p => p.type === 'missile').length} ⚡${active.filter(p => p.type === 'strike').length} ✈${active.filter(p => p.type === 'fighter').length} 🛡${active.filter(p => p.type === 'interceptor').length}`, 10, h - 8);

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
      // Use Math.floor to prevent sub-pixel jitter
      canvas.width = Math.floor(parent.clientWidth);
      canvas.height = Math.floor(parent.clientHeight);
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
