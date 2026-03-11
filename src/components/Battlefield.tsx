import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GameState } from '../game/types';

interface Projectile {
  id: number;
  type: 'drone' | 'missile' | 'strike';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
  intercepted: boolean;
  interceptAt: number; // progress at which it gets intercepted (0-1, 1 = hits)
  trail: { x: number; y: number }[];
  wobble: number;
  size: number;
  alive: boolean;
  explosionTimer: number;
}

interface Base {
  x: number;
  y: number;
  alive: boolean;
  flashTimer: number;
}

export interface BattlefieldHandle {
  launchDrones: (count: number) => void;
  launchMissiles: (count: number) => void;
  launchStrike: (count: number) => void;
}

interface BattlefieldProps {
  state: GameState;
}

let nextId = 0;

const Battlefield = forwardRef<BattlefieldHandle, BattlefieldProps>(({ state }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const basesRef = useRef<Base[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize bases
  useEffect(() => {
    const bases: Base[] = [];
    for (let i = 0; i < Math.min(state.regime.bases, 40); i++) {
      bases.push({
        x: 0.7 + Math.random() * 0.25,
        y: 0.15 + Math.random() * 0.7,
        alive: true,
        flashTimer: 0,
      });
    }
    basesRef.current = bases;
  }, []);

  // Sync base count
  useEffect(() => {
    const current = basesRef.current.filter(b => b.alive).length;
    const target = Math.min(state.regime.bases, 40);
    if (target > current) {
      for (let i = 0; i < target - current; i++) {
        basesRef.current.push({
          x: 0.7 + Math.random() * 0.25,
          y: 0.15 + Math.random() * 0.7,
          alive: true,
          flashTimer: 0,
        });
      }
    } else if (target < current) {
      let toKill = current - target;
      for (const b of basesRef.current) {
        if (b.alive && toKill > 0) {
          b.alive = false;
          b.flashTimer = 1;
          toKill--;
        }
      }
    }
  }, [state.regime.bases]);

  const spawnProjectile = useCallback((type: 'drone' | 'missile' | 'strike') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isStrike = type === 'strike';
    const aliveBases = basesRef.current.filter(b => b.alive);
    
    let startX: number, startY: number, targetX: number, targetY: number;
    
    if (isStrike) {
      // Coalition strikes: left to right, targeting a base
      startX = 0.02 + Math.random() * 0.08;
      startY = 0.1 + Math.random() * 0.8;
      if (aliveBases.length > 0) {
        const target = aliveBases[Math.floor(Math.random() * aliveBases.length)];
        targetX = target.x;
        targetY = target.y;
      } else {
        targetX = 0.8 + Math.random() * 0.15;
        targetY = 0.2 + Math.random() * 0.6;
      }
    } else {
      // Regime projectiles: right to left
      startX = 0.7 + Math.random() * 0.2;
      startY = 0.15 + Math.random() * 0.7;
      targetX = 0.02 + Math.random() * 0.15;
      targetY = 0.1 + Math.random() * 0.8;
    }

    // Interception chance based on game state
    let interceptChance: number;
    if (type === 'drone') {
      const cap = state.coalition.anti_drone_capacity + state.coalition.laser_defense;
      interceptChance = Math.min(0.95, cap / Math.max(1, state.regime.drones_per_sec + cap) * 1.2);
    } else if (type === 'missile') {
      const cap = state.coalition.anti_missile_capacity;
      interceptChance = Math.min(0.9, cap / Math.max(1, state.regime.missiles_per_sec + cap) * 1.2);
    } else {
      interceptChance = 1 - state.coalition.strike_accuracy;
    }

    const willIntercept = !isStrike && Math.random() < interceptChance;
    const interceptProgress = willIntercept ? 0.3 + Math.random() * 0.5 : 1;

    const proj: Projectile = {
      id: nextId++,
      type,
      x: startX,
      y: startY,
      targetX,
      targetY,
      speed: type === 'drone' ? 0.08 + Math.random() * 0.04 
           : type === 'missile' ? 0.12 + Math.random() * 0.06
           : 0.4 + Math.random() * 0.2,
      progress: 0,
      intercepted: false,
      interceptAt: interceptProgress,
      trail: [],
      wobble: type === 'drone' ? 8 + Math.random() * 6 : type === 'missile' ? 3 + Math.random() * 2 : 0,
      size: type === 'drone' ? 2 : type === 'missile' ? 3 : 4,
      alive: true,
      explosionTimer: 0,
    };
    projectilesRef.current.push(proj);
  }, [state]);

  useImperativeHandle(ref, () => ({
    launchDrones: (count: number) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnProjectile('drone'), i * 30 + Math.random() * 50);
      }
    },
    launchMissiles: (count: number) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnProjectile('missile'), i * 80 + Math.random() * 60);
      }
    },
    launchStrike: (count: number) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnProjectile('strike'), i * 40 + Math.random() * 30);
      }
    },
  }), [spawnProjectile]);

  // Auto-launch based on game ticks
  useEffect(() => {
    if (!state.running) return;
    const dps = state.regime.drones_per_sec;
    const mps = state.regime.missiles_per_sec;
    const sp = state.coalition.strike_power;

    // Launch proportional projectiles per second
    const interval = setInterval(() => {
      const dronesToLaunch = Math.ceil(dps / 5);
      const missilesToLaunch = Math.ceil(mps / 5);
      const strikesToLaunch = Math.ceil(sp / 10);

      for (let i = 0; i < Math.min(dronesToLaunch, 15); i++) spawnProjectile('drone');
      for (let i = 0; i < Math.min(missilesToLaunch, 8); i++) spawnProjectile('missile');
      for (let i = 0; i < Math.min(strikesToLaunch, 5); i++) spawnProjectile('strike');
    }, 200);

    return () => clearInterval(interval);
  }, [state.running, state.regime.drones_per_sec, state.regime.missiles_per_sec, state.coalition.strike_power, spawnProjectile]);

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

      // Clear with dark background
      ctx.fillStyle = 'hsl(220, 20%, 5%)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'hsla(220, 15%, 20%, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw separator line
      ctx.strokeStyle = 'hsla(45, 50%, 40%, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.font = '10px Orbitron';
      ctx.fillStyle = 'hsla(210, 80%, 55%, 0.5)';
      ctx.fillText('COALITION', 10, 16);
      ctx.fillStyle = 'hsla(0, 70%, 50%, 0.5)';
      ctx.fillText('REGIME', w - 70, 16);

      // Draw bases
      for (const base of basesRef.current) {
        if (base.flashTimer > 0) {
          // Explosion flash
          const r = base.flashTimer * 20;
          const gradient = ctx.createRadialGradient(base.x * w, base.y * h, 0, base.x * w, base.y * h, r);
          gradient.addColorStop(0, `hsla(30, 100%, 70%, ${base.flashTimer})`);
          gradient.addColorStop(1, `hsla(0, 100%, 50%, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(base.x * w, base.y * h, r, 0, Math.PI * 2);
          ctx.fill();
          base.flashTimer -= dt * 2;
          continue;
        }
        if (!base.alive) continue;
        
        const bx = base.x * w;
        const by = base.y * h;

        // Base glow
        const glow = ctx.createRadialGradient(bx, by, 0, bx, by, 12);
        glow.addColorStop(0, 'hsla(0, 70%, 50%, 0.3)');
        glow.addColorStop(1, 'hsla(0, 70%, 50%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.fill();

        // Base shape
        ctx.fillStyle = 'hsl(0, 60%, 45%)';
        ctx.fillRect(bx - 4, by - 4, 8, 8);
        ctx.strokeStyle = 'hsl(0, 70%, 60%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 4, by - 4, 8, 8);
      }

      // Coalition base (city representation on left)
      ctx.fillStyle = 'hsl(210, 60%, 40%)';
      for (let i = 0; i < 5; i++) {
        const cx = 20 + i * 18;
        const cy = h / 2 - 30 + i * 12;
        const bh = 15 + Math.sin(i * 1.3) * 8;
        ctx.fillRect(cx, cy, 10, bh);
        ctx.strokeStyle = 'hsl(210, 80%, 55%)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx, cy, 10, bh);
      }

      // Update and draw projectiles
      const stillAlive: Projectile[] = [];
      for (const p of projectilesRef.current) {
        if (!p.alive && p.explosionTimer <= 0) continue;

        if (p.alive) {
          p.progress += p.speed * dt;
          
          // Calculate current position with wobble
          const t = p.progress;
          const wobbleOffset = Math.sin(t * 20 + p.id) * p.wobble;
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const perpX = -dy;
          const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          
          const curX = (p.x + dx * t + (perpX / len) * wobbleOffset * 0.01) * w;
          const curY = (p.y + dy * t + (perpY / len) * wobbleOffset * 0.01) * h;

          // Store trail
          p.trail.push({ x: curX, y: curY });
          if (p.trail.length > (p.type === 'strike' ? 30 : 20)) p.trail.shift();

          // Check interception
          if (p.progress >= p.interceptAt && p.interceptAt < 1) {
            p.alive = false;
            p.intercepted = true;
            p.explosionTimer = 0.4;
          }

          // Check arrival
          if (p.progress >= 1) {
            p.alive = false;
            p.explosionTimer = p.type === 'strike' ? 0.8 : 0.5;
          }

          // Draw trail
          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }

            if (p.type === 'strike') {
              // Coalition strike: bright cyan/blue beam
              ctx.strokeStyle = 'hsla(200, 100%, 70%, 0.9)';
              ctx.lineWidth = 3;
              ctx.stroke();
              // Glow layer
              ctx.strokeStyle = 'hsla(200, 100%, 80%, 0.3)';
              ctx.lineWidth = 8;
              ctx.stroke();
            } else if (p.type === 'drone') {
              // Drone: dim red trail
              ctx.strokeStyle = 'hsla(0, 60%, 50%, 0.5)';
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              // Missile: orange trail
              ctx.strokeStyle = 'hsla(25, 90%, 55%, 0.6)';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }

          // Draw head
          if (p.type === 'strike') {
            // Bright glowing head
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 8);
            grd.addColorStop(0, 'hsla(200, 100%, 90%, 1)');
            grd.addColorStop(0.5, 'hsla(200, 100%, 70%, 0.5)');
            grd.addColorStop(1, 'hsla(200, 100%, 50%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(curX, curY, 8, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'drone') {
            ctx.fillStyle = 'hsl(0, 50%, 55%)';
            ctx.beginPath();
            ctx.arc(curX, curY, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Missile head with small glow
            const grd = ctx.createRadialGradient(curX, curY, 0, curX, curY, 5);
            grd.addColorStop(0, 'hsla(25, 100%, 70%, 1)');
            grd.addColorStop(1, 'hsla(25, 100%, 50%, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(curX, curY, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Explosion effect
        if (!p.alive && p.explosionTimer > 0) {
          const last = p.trail[p.trail.length - 1];
          if (last) {
            const r = (1 - p.explosionTimer) * (p.intercepted ? 12 : (p.type === 'strike' ? 25 : 18));
            const alpha = p.explosionTimer;
            
            if (p.intercepted) {
              // Interception: white flash
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(0, 0%, 100%, ${alpha})`);
              grd.addColorStop(0.5, `hsla(45, 100%, 70%, ${alpha * 0.5})`);
              grd.addColorStop(1, `hsla(0, 0%, 100%, 0)`);
              ctx.fillStyle = grd;
              ctx.beginPath();
              ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
              ctx.fill();

              // "X" mark
              ctx.strokeStyle = `hsla(0, 0%, 100%, ${alpha})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(last.x - 4, last.y - 4);
              ctx.lineTo(last.x + 4, last.y + 4);
              ctx.moveTo(last.x + 4, last.y - 4);
              ctx.lineTo(last.x - 4, last.y + 4);
              ctx.stroke();
            } else if (p.type === 'strike') {
              // Strike impact: big blue/white explosion
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(200, 100%, 95%, ${alpha})`);
              grd.addColorStop(0.3, `hsla(200, 100%, 70%, ${alpha * 0.7})`);
              grd.addColorStop(0.6, `hsla(30, 100%, 60%, ${alpha * 0.4})`);
              grd.addColorStop(1, `hsla(0, 100%, 40%, 0)`);
              ctx.fillStyle = grd;
              ctx.beginPath();
              ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Regime impact: red/orange
              const grd = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, r);
              grd.addColorStop(0, `hsla(30, 100%, 70%, ${alpha})`);
              grd.addColorStop(0.5, `hsla(0, 80%, 50%, ${alpha * 0.5})`);
              grd.addColorStop(1, `hsla(0, 80%, 30%, 0)`);
              ctx.fillStyle = grd;
              ctx.beginPath();
              ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          p.explosionTimer -= dt * 2;
        }

        if (p.alive || p.explosionTimer > 0) {
          stillAlive.push(p);
        }
      }
      projectilesRef.current = stillAlive;

      // HUD overlay: counts
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'hsla(45, 50%, 60%, 0.6)';
      const active = stillAlive.filter(p => p.alive);
      const drones = active.filter(p => p.type === 'drone').length;
      const missiles = active.filter(p => p.type === 'missile').length;
      const strikes = active.filter(p => p.type === 'strike').length;
      ctx.fillText(`Projectiles: ${drones}d ${missiles}m ${strikes}s`, 10, h - 8);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      // Reset dimensions for drawing calculations
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
