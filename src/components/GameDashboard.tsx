import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerRole } from '../game/types';
import { createInitialState, gameTick, purchaseUpgrade, canAffordUpgrade } from '../game/engine';
import { UPGRADES, getUpgradeCost } from '../game/upgrades';
import Battlefield, { BattlefieldHandle } from './Battlefield';

// ─── Stat Display ───
const Stat: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="flex flex-col gap-0.5">
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${color ?? ''}`}>{typeof value === 'number' ? Math.round(value).toLocaleString() : value}</span>
  </div>
);

// ─── Progress Bar ───
const Bar: React.FC<{ value: number; max: number; color: string; label: string }> = ({ value, max, color, label }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between">
      <span className="stat-label">{label}</span>
      <span className="stat-label">{Math.round(value)}/{max}</span>
    </div>
    <div className="h-2 rounded-sm bg-secondary overflow-hidden">
      <div className={`h-full rounded-sm transition-all duration-300 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

// ─── Upgrade Button ───
const UpgradeButton: React.FC<{
  upgradeId: string;
  state: GameState;
  onPurchase: (id: string) => void;
  side: 'coalition' | 'regime';
}> = ({ upgradeId, state, onPurchase, side }) => {
  const upgrade = UPGRADES.find(u => u.id === upgradeId)!;
  const level = state.upgrades[upgradeId]?.level ?? 0;
  const cost = getUpgradeCost(upgrade, level);
  const affordable = canAffordUpgrade(state, upgradeId);
  const maxed = level >= upgrade.maxLevel;

  return (
    <button
      className={side === 'coalition' ? 'upgrade-btn-coalition' : 'upgrade-btn-regime'}
      disabled={!affordable || maxed}
      onClick={() => onPurchase(upgradeId)}
    >
      <div className="flex justify-between items-center gap-3">
        <div className="text-left">
          <div className="font-semibold">{upgrade.name} <span className="opacity-50">Lv.{level}</span></div>
          <div className="opacity-60 text-[10px]">{upgrade.description}</div>
        </div>
        <div className="text-right whitespace-nowrap">
          {maxed ? <span className="text-muted-foreground">MAX</span> : <span>{Math.round(cost).toLocaleString()}</span>}
        </div>
      </div>
    </button>
  );
};

// ─── Panel ───
const Panel: React.FC<{ title: string; side?: 'coalition' | 'regime'; children: React.ReactNode; className?: string }> = ({ title, side, children, className }) => (
  <div className={`border rounded bg-card p-3 panel-glow ${side === 'coalition' ? 'border-coalition/20' : side === 'regime' ? 'border-regime/20' : 'border-border'} ${className ?? ''}`}>
    <h3 className={`text-xs mb-3 ${side === 'coalition' ? 'text-coalition' : side === 'regime' ? 'text-regime' : 'text-primary'}`}>
      {title}
    </h3>
    {children}
  </div>
);

// ─── Combat Feed ───
const CombatFeed: React.FC<{ logs: GameState['combatLog'] }> = ({ logs }) => (
  <div className="space-y-1 max-h-48 overflow-y-auto text-[10px] font-mono">
    {logs.slice(0, 15).map((log, i) => (
      <div key={i} className="flex gap-2 opacity-80" style={{ opacity: 1 - i * 0.05 }}>
        <span className="text-muted-foreground w-10">T{log.tick}</span>
        <span className="text-coalition">▲{log.drones_intercepted}d {log.missiles_intercepted}m</span>
        <span className="text-regime">▼{log.drone_impacts}d {log.missile_impacts}m</span>
        {log.bases_destroyed > 0 && <span className="text-warning">💥-{log.bases_destroyed}bases</span>}
      </div>
    ))}
  </div>
);

// ─── Main Game Component ───
export default function GameDashboard() {
  const [state, setState] = useState<GameState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battlefieldRef = useRef<BattlefieldHandle>(null);

  const toggleRunning = useCallback(() => {
    setState(s => ({ ...s, running: !s.running }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(s => ({ ...s, speed }));
  }, []);

  const setRole = useCallback((role: PlayerRole) => {
    setState(s => ({ ...s, role }));
  }, []);

  const handleUpgrade = useCallback((id: string) => {
    setState(s => purchaseUpgrade(s, id));
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.running && !state.gameOver) {
      const ms = Math.max(16, 1000 / state.speed);
      intervalRef.current = setInterval(() => {
        setState(s => gameTick(s));
      }, ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.running, state.speed, state.gameOver]);

  const canPlayCoalition = state.role === 'coalition' || state.role === 'both';
  const canPlayRegime = state.role === 'regime' || state.role === 'both';

  const regimeUpgrades = UPGRADES.filter(u => u.side === 'regime');
  const coalitionUpgrades = UPGRADES.filter(u => u.side === 'coalition');

  const regimeCategories = [...new Set(regimeUpgrades.map(u => u.category))];
  const coalitionCategories = [...new Set(coalitionUpgrades.map(u => u.category))];

  const strikeRatio = state.coalition.total_strikes > 0
    ? (state.coalition.successful_strikes / state.coalition.total_strikes * 100).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen bg-background scanline">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm text-primary tracking-widest">ASYMMETRIC WARS</h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {state.phase} game — T{state.tick}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Role selector */}
          <div className="flex gap-1">
            {(['coalition', 'regime', 'both', 'observer'] as PlayerRole[]).map(role => (
              <button
                key={role}
                onClick={() => setRole(role)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-sm border transition-colors ${
                  state.role === role
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          {/* Speed controls */}
          <div className="flex gap-1">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-[10px] rounded-sm border transition-colors ${
                  state.speed === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <button
            onClick={toggleRunning}
            className={`px-3 py-1 text-xs rounded-sm border font-display tracking-wider transition-colors ${
              state.running
                ? 'border-regime bg-regime/10 text-regime'
                : 'border-success bg-success/10 text-success-foreground'
            }`}
          >
            {state.running ? '■ PAUSE' : '▶ RUN'}
          </button>
          <button onClick={resetGame} className="px-3 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:border-primary/30 font-display tracking-wider">
            ↺ RESET
          </button>
        </div>
      </header>

      {/* Game Over overlay */}
      {state.gameOver && (
        <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className={`text-3xl font-display tracking-widest ${state.winner === 'coalition' ? 'text-coalition' : 'text-regime'}`}>
              {state.winner === 'coalition' ? 'COALITION VICTORY' : 'REGIME VICTORY'}
            </h2>
            <p className="text-muted-foreground">{state.winReason}</p>
            <p className="text-sm text-muted-foreground">Tick {state.tick} — {state.phase} game</p>
            <button onClick={resetGame} className="px-6 py-2 border border-primary text-primary font-display tracking-wider hover:bg-primary/10 transition-colors">
              NEW SIMULATION
            </button>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 p-3 max-w-[1800px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>
        {/* COALITION SIDE */}
        <div className="space-y-3 overflow-y-auto pr-1">
          <Panel title="COALITION STATUS" side="coalition">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Stat label="Hand Free" value={state.coalition.hand_free} color="text-coalition" />
              <Stat label="Economy" value={state.coalition.economy_output} />
              <Stat label="War Cost/s" value={state.coalition.war_cost_per_sec} color="text-warning" />
            </div>
            <Bar value={state.coalition.public_support} max={100} color="bg-coalition" label="Public Support" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Stat label="Anti-Drone" value={state.coalition.anti_drone_capacity} />
              <Stat label="Anti-Missile" value={state.coalition.anti_missile_capacity} />
              <Stat label="Laser Def" value={state.coalition.laser_defense} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Stat label="Strike Power" value={state.coalition.strike_power} />
              <Stat label="Accuracy" value={`${(state.coalition.strike_accuracy * 100).toFixed(0)}%`} />
              <Stat label="Strike Ratio" value={`${strikeRatio}%`} color={Number(strikeRatio) < 90 ? 'text-danger' : 'text-success'} />
            </div>
          </Panel>

          {/* Coalition Fire Controls */}
          {canPlayCoalition && (
            <Panel title="FIRE CONTROL" side="coalition">
              <div className="space-y-2">
                <button
                  onClick={() => battlefieldRef.current?.launchStrike(1)}
                  className="w-full upgrade-btn-coalition text-center font-display tracking-wider"
                >
                  ⚡ STRIKE ×1
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => battlefieldRef.current?.launchStrike(5)}
                    className="flex-1 upgrade-btn-coalition text-center"
                  >
                    ×5
                  </button>
                  <button
                    onClick={() => battlefieldRef.current?.launchStrike(10)}
                    className="flex-1 upgrade-btn-coalition text-center"
                  >
                    ×10
                  </button>
                  <button
                    onClick={() => battlefieldRef.current?.launchStrike(25)}
                    className="flex-1 upgrade-btn-coalition text-center"
                  >
                    ×25
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {canPlayCoalition && (
            <Panel title="COALITION UPGRADES" side="coalition">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {coalitionCategories.map(cat => (
                  <div key={cat}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{cat}</div>
                    <div className="space-y-1">
                      {coalitionUpgrades.filter(u => u.category === cat).map(u => (
                        <UpgradeButton key={u.id} upgradeId={u.id} state={state} onPurchase={handleUpgrade} side="coalition" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* CENTER - Battlefield Canvas */}
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="BATTLEFIELD" className="flex-1 min-h-0">
            <div className="h-full" style={{ minHeight: 350 }}>
              <Battlefield ref={battlefieldRef} state={state} />
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3">
            <Panel title="SITUATION">
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase</span>
                  <span className={`uppercase font-display tracking-wider ${
                    state.phase === 'early' ? 'text-success' : state.phase === 'mid' ? 'text-warning' : 'text-danger'
                  }`}>{state.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctrine</span>
                  <span>{state.regime.drone_bias > state.regime.missile_bias ? 'DRONE SWARM' : 'MISSILE HEAVY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Econ Balance</span>
                  <span className={state.coalition.war_cost_per_sec > state.coalition.hand_free ? 'text-danger' : 'text-success'}>
                    {state.coalition.war_cost_per_sec > state.coalition.hand_free ? 'DEFICIT' : 'STABLE'}
                  </span>
                </div>
              </div>
            </Panel>

            <Panel title="COMBAT LOG">
              <CombatFeed logs={state.combatLog} />
            </Panel>
          </div>
        </div>

        {/* REGIME SIDE */}
        <div className="space-y-3 overflow-y-auto pl-1">
          <Panel title="REGIME STATUS" side="regime">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Stat label="Resilience" value={state.regime.resilience} color="text-regime" />
              <Stat label="Bases" value={state.regime.bases} />
              <Stat label="Anti-Air" value={state.regime.anti_air_level} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Stat label="Drones/s" value={state.regime.drones_per_sec.toFixed(1)} />
              <Stat label="Missiles/s" value={state.regime.missiles_per_sec.toFixed(1)} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Stat label="Total Drones" value={Math.round(state.regime.total_drones_launched)} />
              <Stat label="Total Missiles" value={Math.round(state.regime.total_missiles_launched)} />
            </div>
          </Panel>

          {/* Regime Fire Controls */}
          {canPlayRegime && (
            <Panel title="LAUNCH CONTROL" side="regime">
              <div className="space-y-2">
                <button
                  onClick={() => battlefieldRef.current?.launchDrones(10)}
                  className="w-full upgrade-btn-regime text-center font-display tracking-wider"
                >
                  🛩 DRONE WAVE ×10
                </button>
                <button
                  onClick={() => battlefieldRef.current?.launchMissiles(5)}
                  className="w-full upgrade-btn-regime text-center font-display tracking-wider"
                >
                  🚀 MISSILE SALVO ×5
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => battlefieldRef.current?.launchDrones(50)}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]"
                  >
                    50 DRONES
                  </button>
                  <button
                    onClick={() => battlefieldRef.current?.launchMissiles(20)}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]"
                  >
                    20 MISSILES
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {canPlayRegime && (
            <Panel title="REGIME UPGRADES" side="regime">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {regimeCategories.map(cat => (
                  <div key={cat}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{cat}</div>
                    <div className="space-y-1">
                      {regimeUpgrades.filter(u => u.category === cat).map(u => (
                        <UpgradeButton key={u.id} upgradeId={u.id} state={state} onPurchase={handleUpgrade} side="regime" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
