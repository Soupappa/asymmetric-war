import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState } from '../game/types';

interface Projectile {
  id: number;
  type: 'drone' | 'missile' | 'strike' | 'fighter' | 'interceptor';
  x: number; y: number;
  targetX: number; targetY: number;
  speed: number; progress: number;
  intercepted: boolean; interceptAt: number;
  trail: { x: number; y: number }[];
  wobble: number; size: number;
  alive: boolean; explosionTimer: number;
  returning?: boolean;
}

interface MapUnit {
  id: number;
  type: 'patriot' | 'minigun' | 'radar' | 'base_military' | 'base_civilian' | 'base_fake';
  x: number; y: number;
  alive: boolean; flashTimer: number; pulsePhase: number;
  burialLevel?: number;
  revealed?: boolean;
  revealedType?: string | null;
}

export interface BattlefieldHandle {
  launchDrones: (count: number) => void;
  launchMissiles: (count: number) => void;
  launchStrike: (count: number) => void;
  launchFighter: (count: number) => void;
  addAA: () => void;
  addBase: () => void;
}

let nextId = 0;

const Battlefield = forwardRef<BattlefieldHandle, { state: GameState }>(({ state }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const unitsRef = useRef<MapUnit[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const impactsRef = useRef<{ x: number; y: number; timer: number; success: boolean; type: string }[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const coalitionPositionsRef = useRef<Map<string, { x: number; y: number; pulsePhase: number }>>(new Map());
  const prevCountsRef = useRef({ patriots: 0, miniguns: 0, radars: 0, baseIds: '' });

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
    const scanActive = state.coalition.scanActive;
    if (
      counts.patriots === prev.patriots &&
      counts.miniguns === prev.miniguns &&
      counts.radars === prev.radars &&
      counts.baseIds === prev.baseIds
    ) {
      // Still update revealed status
      for (const u of unitsRef.current) {
        if (u.type.startsWith('base_')) {
          const base = state.regime.bases.find(b => {
            const bt = b.type === 'military' ? 'base_military' : b.type === 'civilian' ? 'base_civilian' : 'base_fake';
            return bt === u.type && Math.abs(b.x - u.x) < 0.01 && Math.abs(b.y - u.y) < 0.01;
          });
          if (base) {
            u.revealed = base.revealed;
            u.revealedType = base.revealedType;
            u.burialLevel = base.burialLevel;
          }
        }
      }
      return;
    }
    prevCountsRef.current = counts;

    const units: MapUnit[] = [];
    for (const b of state.regime.bases) {
      if (!b.alive) continue;
      units.push({
        id: nextId++,
        type: b.type === 'military' ? 'base_military' : b.type === 'civilian' ? 'base_civilian' : 'base_fake',
        x: b.x, y: b.y, alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
        burialLevel: b.burialLevel,
        revealed: b.revealed,
        revealedType: b.revealedType,
      });
    }

    const posCache = coalitionPositionsRef.current;
    const newCache = new Map<string, { x: number; y: number; pulsePhase: number }>();

    const addCachedUnit = (type: 'patriot' | 'minigun' | 'radar', count: number, xMin: number, xRange: number, yMin: number, yRange: number) => {
      for (let i = 0; i < Math.min(count, type === 'minigun' ? 20 : type === 'patriot' ? 15 : 10); i++) {
        const key = `${type}_${i}`;
        let pos = posCache.get(key);
        if (!pos) {
          pos = { x: xMin + Math.random() * xRange, y: yMin + Math.random() * yRange, pulsePhase: Math.random() * Math.PI * 2 };
        }
        newCache.set(key, pos);
        units.push({ id: nextId++, type, x: pos.x, y: pos.y, alive: true, flashTimer: 0, pulsePhase: pos.pulsePhase });
      }
    };

    addCachedUnit('patriot', state.coalition.patriots, 0.08, 0.15, 0.1, 0.8);
    addCachedUnit('minigun', state.coalition.miniguns, 0.12, 0.18, 0.1, 0.8);
    addCachedUnit('radar', state.coalition.radarSpots, 0.25, 0.15, 0.15, 0.7);
    coalitionPositionsRef.current = newCache;
    unitsRef.current = units;
  }, [state.regime.bases, state.coalition.patriots, state.coalition.miniguns, state.coalition.radarSpots, state.coalition.scanActive]);

  const spawnProjectile = useCallback((type: 'drone' | 'missile' | 'strike' | 'fighter') => {
    const s = stateRef.current;
    const aliveBases = unitsRef.current.filter(u => u.type.startsWith('base_') && u.alive);

    let startX: number, startY: number, targetX: number, targetY: number;

    if (type === 'strike' || type === 'fighter') {
      startX = 0.02 + Math.random() * 0.08;
      startY = 0.1 + Math.random() * 0.8;
      if (aliveBases.length > 0) {
        const t = aliveBases[Math.floor(Math.random() * aliveBases.length)];
        targetX = t.x; targetY = t.y;
      } else {
        targetX = 0.8; targetY = 0.5;
      }
    } else {
      if (aliveBases.length > 0) {
        const src = aliveBases[Math.floor(Math.random() * aliveBases.length)];
        startX = src.x; startY = src.y;
      } else {
        startX = 0.8; startY = 0.5;
      }
      targetX = 0.02 + Math.random() * 0.15;
      targetY = 0.1 + Math.random() * 0.8;
    }

    const fogLimit = s.coalition.fogOfWarLimit;
    let interceptChance: number;
    if (type === 'drone') {
      const cap = s.coalition.miniguns * 4 + s.coalition.laserDefense + s.coalition.fightersOnPatrol * 2;
      interceptChance = Math.min(0.95, cap / Math.max(1, 10 + cap) * 1.2);
    } else if (type === 'missile') {
      const detectionRate = s.regime.radarLockdownActive ? 0 : Math.min(1, (fogLimit - 0.42) / 0.58);
      const hasInterceptor = s.coalition.interceptorStock > 0;
      interceptChance = hasInterceptor ? Math.min(0.9, detectionRate * 0.95) : 0;
    } else {
      interceptChance = 1 - s.coalition.strikeAccuracy;
    }

    const willIntercept = (type === 'drone' || type === 'missile') && Math.random() < interceptChance;
    const interceptProgress = willIntercept 
      ? (type === 'missile' ? Math.max(0.2, 1 - (fogLimit - 0.42) / 0.58 * 0.7) : 0.3 + Math.random() * 0.5) 
      : 1;

    projectilesRef.current.push({
      id: nextId++, type,
      x: startX, y: startY, targetX, targetY,
      speed: type === 'drone' ? 0.06 + Math.random() * 0.03
           : type === 'missile' ? 0.18 + Math.random() * 0.08
           : type === 'fighter' ? 0.15 + Math.random() * 0.08
           : 0.35 + Math.random() * 0.15,
      progress: 0, intercepted: false, interceptAt: interceptProgress,
      trail: [],
      wobble: type === 'drone' ? 10 + Math.random() * 8 : type === 'missile' ? 0.5 + Math.random() * 0.5 : 0,
      size: type === 'drone' ? 2 : type === 'missile' ? 5 : type === 'fighter' ? 3 : 5,
      alive: true, explosionTimer: 0,
      returning: false,
    });

    // Spawn interceptor missile for missile interception
    if (type === 'missile' && willIntercept) {
      const patriots = unitsRef.current.filter(u => u.type === 'patriot' && u.alive);
      if (patriots.length > 0) {
        const pat = patriots[Math.floor(Math.random() * patriots.length)];
        const intX = startX + (targetX - startX) * interceptProgress;
        const intY = startY + (targetY - startY) * interceptProgress;
        projectilesRef.current.push({
          id: nextId++, type: 'interceptor',
          x: pat.x, y: pat.y, targetX: intX, targetY: intY,
          speed: 0.25 + Math.random() * 0.1,
          progress: 0, intercepted: false, interceptAt: 1,
          trail: [], wobble: 0, size: 3,
          alive: true, explosionTimer: 0,
        });
      }
    }

    // Fighter: will return after reaching target
    if (type === 'fighter') {
      // The fighter projectile will return (handled in animation)
    }
  }, []);

  useImperativeHandle(ref, () => ({
    launchDrones: (count: number) => { for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('drone'), i * 15 + Math.random() * 30); },
    launchMissiles: (count: number) => { for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('missile'), i * 80 + Math.random() * 40); },
    launchStrike: (count: number) => { for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('strike'), i * 40 + Math.random() * 30); },
    launchFighter: (count: number) => { for (let i = 0; i < count; i++) setTimeout(() => spawnProjectile('fighter'), i * 50 + Math.random() * 30); },
    addAA: () => {},
    addBase: () => {},
  }), [spawnProjectile]);

  // Auto-launch visual sync
  useEffect(() => {
    if (!state.running) return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.regime.droneStock.autoLaunch && s.regime.droneStock.stock > 0) {
        for (let i = 0; i < Math.min(3, s.regime.droneStock.stock); i++) spawnProjectile('drone');
      }
      if (s.regime.missileStock.autoLaunch && s.regime.missileStock.stock > 0) {
        spawnProjectile('missile');
      }
      if (s.coalition.strikeStock.autoLaunch && s.coalition.strikeStock.stock > 0) {
        spawnProjectile('strike');
      }
    }, 300);
    return () => clearInterval(interval);
  }, [state.running, spawnProjectile]);

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

      // Grid
      ctx.strokeStyle = 'hsla(220, 15%, 15%, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Front line
      ctx.strokeStyle = 'hsla(45, 50%, 40%, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.42, h); ctx.stroke();
      ctx.setLineDash([]);

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
        const sx = 0.6 * w; const sy = 0.1 * h; const sw = 0.38 * w; const sh = 0.8 * h;
        ctx.strokeStyle = 'hsla(120, 80%, 50%, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
        ctx.fillStyle = 'hsla(120, 80%, 50%, 0.03)';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.font = '10px Orbitron';
        ctx.fillStyle = 'hsla(120, 80%, 50%, 0.5)';
        ctx.fillText('SCAN ACTIVE', sx + 4, sy + 14);
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
        if (!u.alive) continue;
        const ux = u.x * w;
        const uy = u.y * h;

        // Check if unit is in fog (only affects coalition view)
        const inFog = showFog && u.type.startsWith('base_') && u.x > fogLimit && !currentState.coalition.scanActive;

        if (u.type === 'base_military') {
          if (inFog) continue;
          const pulse = 0.8 + Math.sin(now * 2 + u.pulsePhase) * 0.2;
          const buried = u.burialLevel ?? 0;
          
          // Concentric circles for burial level
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

          // Show revealed type during scan
          if (u.revealed && u.revealedType) {
            ctx.font = '8px JetBrains Mono';
            ctx.fillStyle = 'hsla(120, 80%, 60%, 0.8)';
            ctx.fillText(u.revealedType === 'military' ? 'MIL' : u.revealedType === 'civilian' ? 'CIV' : 'FAKE', ux - 8, uy - 12);
          }
          if (buried > 0) {
            ctx.font = '7px JetBrains Mono';
            ctx.fillStyle = 'hsla(30, 60%, 60%, 0.7)';
            ctx.fillText(`B${buried}`, ux - 5, uy + 16);
          }
        } else if (u.type === 'base_civilian') {
          if (inFog) continue;
          // During scan, show as identified
          if (u.revealed) {
            ctx.fillStyle = 'hsla(120, 50%, 45%, 0.9)';
          } else {
            ctx.fillStyle = 'hsla(120, 30%, 35%, 0.7)';
          }
          ctx.fillRect(ux - 5, uy - 4, 10, 8);
          ctx.beginPath();
          ctx.moveTo(ux - 6, uy - 4);
          ctx.lineTo(ux, uy - 10);
          ctx.lineTo(ux + 6, uy - 4);
          ctx.closePath();
          ctx.fillStyle = u.revealed ? 'hsla(120, 50%, 50%, 0.9)' : 'hsla(120, 40%, 40%, 0.8)';
          ctx.fill();
          if (u.revealed) {
            ctx.font = '8px JetBrains Mono';
            ctx.fillStyle = 'hsla(120, 80%, 60%, 0.8)';
            ctx.fillText('CIV', ux - 8, uy - 12);
          }
          // Burial rings
          const cb = u.burialLevel ?? 0;
          if (cb > 0) {
            for (let ring = cb; ring > 0; ring--) {
              ctx.strokeStyle = `hsla(30, 60%, 50%, ${0.15 + ring * 0.1})`;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 4]);
              ctx.beginPath(); ctx.arc(ux, uy, 8 + ring * 6, 0, Math.PI * 2); ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        } else if (u.type === 'base_fake') {
          if (inFog) continue;
          ctx.save();
          ctx.translate(ux, uy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = u.revealed ? 'hsla(45, 70%, 50%, 0.7)' : 'hsla(0, 50%, 35%, 0.6)';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeStyle = u.revealed ? 'hsla(45, 80%, 60%, 0.7)' : 'hsla(0, 60%, 45%, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-4, -4, 8, 8);
          ctx.restore();
          if (u.revealed) {
            ctx.font = '8px JetBrains Mono';
            ctx.fillStyle = 'hsla(45, 80%, 60%, 0.8)';
            ctx.fillText('FAKE', ux - 10, uy - 8);
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
          p.progress += p.speed * dt;
          const t = p.progress;

          // Fighter return logic
          if (p.type === 'fighter' && !p.returning && t >= 0.85) {
            p.returning = true;
            // Reverse direction
            const tmpX = p.x; const tmpY = p.y;
            p.x = p.targetX; p.y = p.targetY;
            p.targetX = 0.05 + Math.random() * 0.1;
            p.targetY = 0.2 + Math.random() * 0.6;
            p.progress = 0;
            p.trail = [];
            p.interceptAt = 1; // no intercept on return
            continue;
          }

          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const perpX = -dy; const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const wobbleOffset = Math.sin(t * 20 + p.id) * p.wobble;
          const curX = (p.x + dx * t + (perpX / len) * wobbleOffset * 0.01) * w;
          const curY = (p.y + dy * t + (perpY / len) * wobbleOffset * 0.01) * h;

          p.trail.push({ x: curX, y: curY });
          const maxTrail = p.type === 'strike' ? 40 : p.type === 'missile' ? 30 : p.type === 'interceptor' ? 20 : p.type === 'fighter' ? 15 : 10;
          if (p.trail.length > maxTrail) p.trail.shift();

          if (p.progress >= p.interceptAt && p.interceptAt < 1) {
            p.alive = false; p.intercepted = true; p.explosionTimer = 0.5;
            impactsRef.current.push({ x: curX, y: curY, timer: 1.2, success: false, type: p.type });
          }
          if (p.progress >= 1) {
            p.alive = false;
            p.explosionTimer = p.type === 'strike' ? 1.0 : p.type === 'missile' ? 1.5 : p.type === 'interceptor' ? 0.5 : p.type === 'fighter' ? 0.1 : 0.4;
            const isHit = p.type !== 'strike' && p.type !== 'fighter' && p.type !== 'interceptor';
            impactsRef.current.push({ x: curX, y: curY, timer: isHit ? 3.0 : 1.5, success: isHit, type: p.type });
          }

          // Trail rendering
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
            if (p.type === 'strike') {
              ctx.strokeStyle = 'hsla(195, 100%, 75%, 0.9)'; ctx.lineWidth = 4; ctx.stroke();
              ctx.strokeStyle = 'hsla(195, 100%, 85%, 0.2)'; ctx.lineWidth = 14; ctx.stroke();
            } else if (p.type === 'fighter') {
              ctx.strokeStyle = p.returning ? 'hsla(180, 70%, 50%, 0.4)' : 'hsla(180, 90%, 60%, 0.6)';
              ctx.lineWidth = 2; ctx.stroke();
            } else if (p.type === 'drone') {
              ctx.strokeStyle = 'hsla(0, 55%, 50%, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
            } else if (p.type === 'interceptor') {
              ctx.strokeStyle = 'hsla(210, 90%, 70%, 0.7)'; ctx.lineWidth = 2; ctx.stroke();
              ctx.strokeStyle = 'hsla(210, 90%, 80%, 0.15)'; ctx.lineWidth = 6; ctx.stroke();
            } else {
              ctx.strokeStyle = 'hsla(15, 90%, 55%, 0.85)'; ctx.lineWidth = 3; ctx.stroke();
              ctx.strokeStyle = 'hsla(25, 100%, 65%, 0.15)'; ctx.lineWidth = 8; ctx.stroke();
            }
          }

          // Head rendering
          if (p.type === 'strike') {
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
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 8);
            grd.addColorStop(0, 'hsla(210, 100%, 90%, 1)');
            grd.addColorStop(0.3, 'hsla(210, 100%, 65%, 0.7)');
            grd.addColorStop(1, 'hsla(210, 80%, 40%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 8, 0, Math.PI * 2); ctx.fill();
            const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
            ctx.save(); ctx.translate(curX, curY); ctx.rotate(angle);
            ctx.fillStyle = 'hsl(210, 50%, 70%)';
            ctx.fillRect(-6, -1.5, 12, 3);
            ctx.fillStyle = 'hsl(210, 80%, 80%)';
            ctx.fillRect(4, -2, 3, 4);
            ctx.restore();
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
            const r = (1 - p.explosionTimer) * maxR;
            const alpha = p.explosionTimer;
            if (p.intercepted) {
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(210, 80%, 90%, ${alpha})`);
              grd.addColorStop(1, 'hsla(210, 80%, 70%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = `hsla(210, 80%, 80%, ${alpha * 0.8})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(last.x - 5, last.y - 5); ctx.lineTo(last.x + 5, last.y + 5);
              ctx.moveTo(last.x + 5, last.y - 5); ctx.lineTo(last.x - 5, last.y + 5);
              ctx.stroke();
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
        const alpha = imp.timer * 0.5;
        if (imp.success) {
          ctx.strokeStyle = `hsla(0, 70%, 55%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, 8, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `hsla(0, 60%, 50%, ${alpha * 0.3})`;
          ctx.beginPath(); ctx.arc(imp.x, imp.y, 4, 0, Math.PI * 2); ctx.fill();
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
