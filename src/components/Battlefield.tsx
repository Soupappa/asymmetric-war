import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState } from '../game/types';

interface Projectile {
  id: number;
  type: 'drone' | 'missile' | 'strike' | 'fighter';
  x: number; y: number;
  targetX: number; targetY: number;
  speed: number; progress: number;
  intercepted: boolean; interceptAt: number;
  trail: { x: number; y: number }[];
  wobble: number; size: number;
  alive: boolean; explosionTimer: number;
}

interface MapUnit {
  id: number;
  type: 'patriot' | 'minigun' | 'radar' | 'base_military' | 'base_civilian' | 'base_fake';
  x: number; y: number;
  alive: boolean; flashTimer: number; pulsePhase: number;
  burialLevel?: number;
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

  // Sync units from state
  useEffect(() => {
    const units: MapUnit[] = [];
    // Regime bases
    for (const b of state.regime.bases) {
      if (!b.alive) continue;
      units.push({
        id: nextId++,
        type: b.type === 'military' ? 'base_military' : b.type === 'civilian' ? 'base_civilian' : 'base_fake',
        x: b.x, y: b.y, alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2,
        burialLevel: b.burialLevel,
      });
    }
    // Coalition defenses
    for (let i = 0; i < Math.min(state.coalition.patriots, 15); i++) {
      units.push({ id: nextId++, type: 'patriot', x: 0.08 + Math.random() * 0.15, y: 0.1 + Math.random() * 0.8, alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < Math.min(state.coalition.miniguns, 20); i++) {
      units.push({ id: nextId++, type: 'minigun', x: 0.12 + Math.random() * 0.18, y: 0.1 + Math.random() * 0.8, alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < Math.min(state.coalition.radarSpots, 10); i++) {
      units.push({ id: nextId++, type: 'radar', x: 0.25 + Math.random() * 0.15, y: 0.15 + Math.random() * 0.7, alive: true, flashTimer: 0, pulsePhase: Math.random() * Math.PI * 2 });
    }
    unitsRef.current = units;
  }, [state.regime.bases, state.coalition.patriots, state.coalition.miniguns, state.coalition.radarSpots]);

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

    let interceptChance: number;
    if (type === 'drone') {
      const cap = s.coalition.miniguns * 4 + s.coalition.laserDefense;
      interceptChance = Math.min(0.95, cap / Math.max(1, 10 + cap) * 1.2);
    } else if (type === 'missile') {
      const cap = s.coalition.patriots * 3;
      interceptChance = Math.min(0.85, cap / Math.max(1, 5 + cap));
    } else {
      interceptChance = 1 - s.coalition.strikeAccuracy;
    }

    const willIntercept = (type === 'drone' || type === 'missile') && Math.random() < interceptChance;
    const interceptProgress = willIntercept ? 0.3 + Math.random() * 0.5 : 1;

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
    });
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

      // Scan zone
      if (stateRef.current.coalition.scanActive) {
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

      // Zone labels
      ctx.font = '10px Orbitron';
      ctx.fillStyle = 'hsla(210, 80%, 55%, 0.4)';
      ctx.fillText('COALITION', 10, 16);
      ctx.fillStyle = 'hsla(0, 70%, 50%, 0.4)';
      ctx.fillText('REGIME', w - 70, 16);

      const now = time / 1000;

      // Draw units
      for (const u of unitsRef.current) {
        if (!u.alive) continue;
        const ux = u.x * w;
        const uy = u.y * h;

        if (u.type === 'base_military') {
          const pulse = 0.8 + Math.sin(now * 2 + u.pulsePhase) * 0.2;
          const buried = u.burialLevel ?? 0;
          // Glow
          const glow = ctx.createRadialGradient(ux, uy, 0, ux, uy, 14);
          glow.addColorStop(0, `hsla(0, 70%, 50%, ${0.25 * pulse})`);
          glow.addColorStop(1, 'hsla(0, 70%, 50%, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(ux, uy, 14, 0, Math.PI * 2); ctx.fill();
          // Diamond
          ctx.save();
          ctx.translate(ux, uy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = `hsla(0, 60%, ${30 + buried * 5}%, ${pulse})`;
          ctx.fillRect(-5, -5, 10, 10);
          ctx.strokeStyle = 'hsl(0, 70%, 55%)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5, -5, 10, 10);
          ctx.restore();
          // Burial indicator
          if (buried > 0) {
            ctx.fillStyle = 'hsla(30, 60%, 50%, 0.6)';
            for (let i = 0; i < buried; i++) {
              ctx.fillRect(ux - 6 + i * 5, uy + 8, 3, 2);
            }
          }
        } else if (u.type === 'base_civilian') {
          // Green-ish house
          ctx.fillStyle = 'hsla(120, 30%, 35%, 0.7)';
          ctx.fillRect(ux - 5, uy - 4, 10, 8);
          ctx.beginPath();
          ctx.moveTo(ux - 6, uy - 4);
          ctx.lineTo(ux, uy - 10);
          ctx.lineTo(ux + 6, uy - 4);
          ctx.closePath();
          ctx.fillStyle = 'hsla(120, 40%, 40%, 0.8)';
          ctx.fill();
        } else if (u.type === 'base_fake') {
          // Looks like military but slightly different shade
          ctx.save();
          ctx.translate(ux, uy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = 'hsla(0, 50%, 35%, 0.6)';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeStyle = 'hsla(0, 60%, 45%, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-4, -4, 8, 8);
          ctx.restore();
        } else if (u.type === 'patriot') {
          // Big blue circle with cross
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
          // Sweep
          const sweep = (now * 2 + u.pulsePhase) % (Math.PI * 2);
          ctx.strokeStyle = 'hsla(210, 80%, 60%, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + Math.cos(sweep) * 14, uy + Math.sin(sweep) * 14); ctx.stroke();
        } else if (u.type === 'minigun') {
          // Small orange circle
          ctx.fillStyle = 'hsl(35, 70%, 40%)';
          ctx.beginPath(); ctx.arc(ux, uy, 3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsl(35, 80%, 55%)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ux, uy, 3, 0, Math.PI * 2); ctx.stroke();
          // Barrel
          ctx.strokeStyle = 'hsl(35, 60%, 50%)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + 8, uy - 4); ctx.stroke();
        } else if (u.type === 'radar') {
          // Radar dish
          ctx.strokeStyle = 'hsla(180, 60%, 50%, 0.6)';
          ctx.lineWidth = 1;
          const angle = (now * 1.5 + u.pulsePhase) % (Math.PI * 2);
          ctx.beginPath(); ctx.arc(ux, uy, 10, angle, angle + Math.PI * 0.4); ctx.stroke();
          ctx.fillStyle = 'hsla(180, 60%, 50%, 0.3)';
          ctx.beginPath(); ctx.arc(ux, uy, 2, 0, Math.PI * 2); ctx.fill();
          // Visibility circle
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
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const perpX = -dy; const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const wobbleOffset = Math.sin(t * 20 + p.id) * p.wobble;
          const curX = (p.x + dx * t + (perpX / len) * wobbleOffset * 0.01) * w;
          const curY = (p.y + dy * t + (perpY / len) * wobbleOffset * 0.01) * h;

          p.trail.push({ x: curX, y: curY });
          const maxTrail = p.type === 'strike' ? 40 : p.type === 'missile' ? 30 : p.type === 'fighter' ? 15 : 10;
          if (p.trail.length > maxTrail) p.trail.shift();

          if (p.progress >= p.interceptAt && p.interceptAt < 1) {
            p.alive = false; p.intercepted = true; p.explosionTimer = 0.5;
            impactsRef.current.push({ x: curX, y: curY, timer: 1.2, success: false, type: p.type });
          }
          if (p.progress >= 1) {
            p.alive = false;
            p.explosionTimer = p.type === 'strike' ? 1.0 : p.type === 'missile' ? 0.8 : 0.4;
            impactsRef.current.push({ x: curX, y: curY, timer: 1.5, success: p.type !== 'strike' && p.type !== 'fighter', type: p.type });
          }

          // Trail
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
            if (p.type === 'strike') {
              ctx.strokeStyle = 'hsla(195, 100%, 75%, 0.9)'; ctx.lineWidth = 4; ctx.stroke();
              ctx.strokeStyle = 'hsla(195, 100%, 85%, 0.2)'; ctx.lineWidth = 14; ctx.stroke();
            } else if (p.type === 'fighter') {
              ctx.strokeStyle = 'hsla(180, 90%, 60%, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
            } else if (p.type === 'drone') {
              ctx.strokeStyle = 'hsla(0, 55%, 50%, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
            } else {
              // Missile: thick, direct, imposing
              ctx.strokeStyle = 'hsla(15, 90%, 55%, 0.85)'; ctx.lineWidth = 3; ctx.stroke();
              ctx.strokeStyle = 'hsla(25, 100%, 65%, 0.15)'; ctx.lineWidth = 8; ctx.stroke();
            }
          }

          // Head
          if (p.type === 'strike') {
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 12);
            grd.addColorStop(0, 'hsla(195, 100%, 95%, 1)');
            grd.addColorStop(0.4, 'hsla(195, 100%, 70%, 0.5)');
            grd.addColorStop(1, 'hsla(195, 100%, 50%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 12, 0, Math.PI * 2); ctx.fill();
          } else if (p.type === 'fighter') {
            ctx.fillStyle = 'hsl(180, 80%, 60%)';
            ctx.beginPath();
            ctx.moveTo(curX + 5, curY); ctx.lineTo(curX - 3, curY - 3); ctx.lineTo(curX - 3, curY + 3);
            ctx.closePath(); ctx.fill();
          } else if (p.type === 'drone') {
            ctx.fillStyle = 'hsl(0, 50%, 55%)';
            ctx.beginPath(); ctx.arc(curX, curY, 2, 0, Math.PI * 2); ctx.fill();
          } else {
            // Missile: big body + fire
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 10);
            grd.addColorStop(0, 'hsla(20, 100%, 80%, 1)');
            grd.addColorStop(0.3, 'hsla(10, 100%, 60%, 0.7)');
            grd.addColorStop(1, 'hsla(0, 80%, 40%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(curX, curY, 10, 0, Math.PI * 2); ctx.fill();
            // Body
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
            const maxR = p.intercepted ? 12 : (p.type === 'strike' ? 35 : p.type === 'missile' ? 28 : 10);
            const r = (1 - p.explosionTimer) * maxR;
            const alpha = p.explosionTimer;
            if (p.intercepted) {
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(0, 0%, 100%, ${alpha})`);
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
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(195, 100%, 95%, ${alpha})`);
              grd.addColorStop(0.3, `hsla(200, 100%, 70%, ${alpha * 0.7})`);
              grd.addColorStop(0.6, `hsla(30, 100%, 60%, ${alpha * 0.3})`);
              grd.addColorStop(1, 'hsla(0, 100%, 40%, 0)');
              ctx.fillStyle = grd;
              ctx.beginPath(); ctx.arc(last.x, last.y, r, 0, Math.PI * 2); ctx.fill();
            } else {
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
      ctx.fillText(`🛩${active.filter(p => p.type === 'drone').length} 🚀${active.filter(p => p.type === 'missile').length} ⚡${active.filter(p => p.type === 'strike').length} ✈${active.filter(p => p.type === 'fighter').length}`, 10, h - 8);

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
