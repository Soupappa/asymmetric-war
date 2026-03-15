import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerRole } from '../game/types';
import {
  createInitialState, gameTick, canAffordUpgrade, startResearch,
  buyAA, buyFighter, sendStrike, issueBonds,
  regimeBuildBase, regimeLaunchDrones, regimeLaunchMissiles,
} from '../game/engine';
import { UPGRADES, getUpgradeCost } from '../game/upgrades';
import Battlefield, { BattlefieldHandle } from './Battlefield';

const Stat: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="flex flex-col gap-0.5">
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${color ?? ''}`}>{typeof value === 'number' ? Math.round(value).toLocaleString() : value}</span>
  </div>
);

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

const ResearchButton: React.FC<{
  upgradeId: string;
  state: GameState;
  onResearch: (id: string) => void;
  side: 'coalition' | 'regime';
}> = ({ upgradeId, state, onResearch, side }) => {
  const upgrade = UPGRADES.find(u => u.id === upgradeId)!;
  const u = state.upgrades[upgradeId];
  const level = u?.level ?? 0;
  const cost = getUpgradeCost(upgrade, level);
  const affordable = canAffordUpgrade(state, upgradeId);
  const maxed = level >= upgrade.maxLevel;
  const researching = u?.researching ?? false;
  const progress = researching ? (u.researchProgress / u.researchTarget) * 100 : 0;

  return (
    <button
      className={`relative overflow-hidden ${side === 'coalition' ? 'upgrade-btn-coalition' : 'upgrade-btn-regime'}`}
      disabled={!affordable || maxed || researching}
      onClick={() => onResearch(upgradeId)}
    >
      {researching && (
        <div
          className={`absolute inset-0 ${side === 'coalition' ? 'bg-coalition' : 'bg-regime'} opacity-20`}
          style={{ width: `${progress}%` }}
        />
      )}
      <div className="relative flex justify-between items-center gap-3">
        <div className="text-left">
          <div className="font-semibold">
            {upgrade.name} <span className="opacity-50">Lv.{level}</span>
            {researching && <span className="ml-1 text-[9px] opacity-70">⏳ {Math.round(progress)}%</span>}
          </div>
          <div className="opacity-60 text-[10px]">{upgrade.description}</div>
        </div>
        <div className="text-right whitespace-nowrap text-[10px]">
          {maxed ? <span className="text-muted-foreground">MAX</span>
            : researching ? <span>🔬 {u.researchTarget - u.researchProgress}t</span>
            : <span>{Math.round(cost).toLocaleString()} {side === 'coalition' ? '$' : '◆'}</span>}
        </div>
      </div>
    </button>
  );
};

const Panel: React.FC<{ title: string; side?: 'coalition' | 'regime'; children: React.ReactNode; className?: string }> = ({ title, side, children, className }) => (
  <div className={`border rounded bg-card p-3 panel-glow ${side === 'coalition' ? 'border-coalition/20' : side === 'regime' ? 'border-regime/20' : 'border-border'} ${className ?? ''}`}>
    <h3 className={`text-xs mb-3 ${side === 'coalition' ? 'text-coalition' : side === 'regime' ? 'text-regime' : 'text-primary'}`}>{title}</h3>
    {children}
  </div>
);

const CombatFeed: React.FC<{ logs: GameState['combatLog'] }> = ({ logs }) => (
  <div className="space-y-1 max-h-48 overflow-y-auto text-[10px] font-mono">
    {logs.slice(0, 15).map((log, i) => (
      <div key={i} className="flex gap-2 opacity-80" style={{ opacity: 1 - i * 0.05 }}>
        <span className="text-muted-foreground w-10">T{log.tick}</span>
        <span className="text-coalition">▲{log.drones_intercepted}d {log.missiles_intercepted}m</span>
        <span className="text-regime">▼{log.drone_impacts}d {log.missile_impacts}m</span>
        {log.bases_destroyed > 0 && <span className="text-warning">💥-{log.bases_destroyed}b</span>}
      </div>
    ))}
  </div>
);

export default function GameDashboard() {
  const [state, setState] = useState<GameState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battlefieldRef = useRef<BattlefieldHandle>(null);

  const toggleRunning = useCallback(() => setState(s => ({ ...s, running: !s.running })), []);
  const setSpeed = useCallback((speed: number) => setState(s => ({ ...s, speed })), []);
  const setRole = useCallback((role: PlayerRole) => setState(s => ({ ...s, role })), []);
  const resetGame = useCallback(() => setState(createInitialState()), []);

  const handleResearch = useCallback((id: string) => setState(s => startResearch(s, id)), []);

  // Coalition actions
  const handleBuyAA = useCallback(() => {
    setState(s => buyAA(s));
    battlefieldRef.current?.addAA();
  }, []);
  const handleBuyFighter = useCallback((count: number) => {
    setState(s => {
      let ns = s;
      for (let i = 0; i < count; i++) ns = buyFighter(ns);
      return ns;
    });
    battlefieldRef.current?.launchFighter(count);
  }, []);
  const handleSendStrike = useCallback((count: number) => {
    setState(s => {
      let ns = s;
      for (let i = 0; i < count; i++) ns = sendStrike(ns);
      return ns;
    });
    battlefieldRef.current?.launchStrike(count);
  }, []);
  const handleBonds = useCallback((amount: number) => setState(s => issueBonds(s, amount)), []);

  // Regime actions
  const handleBuildBase = useCallback(() => {
    setState(s => regimeBuildBase(s));
    battlefieldRef.current?.addBase();
  }, []);
  const handleLaunchDrones = useCallback((count: number) => {
    setState(s => regimeLaunchDrones(s, count));
    battlefieldRef.current?.launchDrones(count);
  }, []);
  const handleLaunchMissiles = useCallback((count: number) => {
    setState(s => regimeLaunchMissiles(s, count));
    battlefieldRef.current?.launchMissiles(count);
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.running && !state.gameOver) {
      const ms = Math.max(16, 1000 / state.speed);
      intervalRef.current = setInterval(() => setState(s => gameTick(s)), ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.running, state.speed, state.gameOver]);

  const canPlayCoalition = state.role === 'coalition' || state.role === 'both';
  const canPlayRegime = state.role === 'regime' || state.role === 'both';

  const regimeUpgrades = UPGRADES.filter(u => u.side === 'regime');
  const coalitionUpgrades = UPGRADES.filter(u => u.side === 'coalition');
  const regimeCategories = [...new Set(regimeUpgrades.map(u => u.category))];
  const coalitionCategories = [...new Set(coalitionUpgrades.map(u => u.category))];

  const resilienceDiscount = Math.max(0.3, 1 - state.regime.resilience * 0.001);
  const effectiveDroneCost = Math.round(state.regime.drone_cost * resilienceDiscount);
  const effectiveMissileCost = Math.round(state.regime.missile_cost * resilienceDiscount);
  const baseCostDisplay = state.regime.base_cost + state.regime.bases * 30;

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
          <div className="flex gap-1">
            {(['coalition', 'regime', 'both', 'observer'] as PlayerRole[]).map(role => (
              <button key={role} onClick={() => setRole(role)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-sm border transition-colors ${
                  state.role === role ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}>{role}</button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex gap-1">
            {[1, 2, 5, 10].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-[10px] rounded-sm border transition-colors ${
                  state.speed === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}>{s}x</button>
            ))}
          </div>
          <button onClick={toggleRunning}
            className={`px-3 py-1 text-xs rounded-sm border font-display tracking-wider transition-colors ${
              state.running ? 'border-regime bg-regime/10 text-regime' : 'border-success bg-success/10 text-success-foreground'
            }`}>{state.running ? '■ PAUSE' : '▶ RUN'}</button>
          <button onClick={resetGame} className="px-3 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:border-primary/30 font-display tracking-wider">↺ RESET</button>
        </div>
      </header>

      {/* Game Over */}
      {state.gameOver && (
        <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className={`text-3xl font-display tracking-widest ${state.winner === 'coalition' ? 'text-coalition' : 'text-regime'}`}>
              {state.winner === 'coalition' ? 'COALITION VICTORY' : 'REGIME VICTORY'}
            </h2>
            <p className="text-muted-foreground">{state.winReason}</p>
            <p className="text-sm text-muted-foreground">Tick {state.tick} — {state.phase} game</p>
            <button onClick={resetGame} className="px-6 py-2 border border-primary text-primary font-display tracking-wider hover:bg-primary/10 transition-colors">NEW SIMULATION</button>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 p-3 max-w-[1800px] mx-auto" style={{ height: 'calc(100vh - 56px)' }}>
        {/* COALITION SIDE */}
        <div className="space-y-3 overflow-y-auto pr-1">
          <Panel title="COALITION STATUS" side="coalition">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Stat label="Budget $" value={state.coalition.budget} color="text-coalition" />
              <Stat label="Hand Free" value={state.coalition.hand_free} />
            </div>
            <Bar value={state.coalition.public_support} max={100} color="bg-coalition" label="Public Support" />
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Stat label="Economy" value={state.coalition.economy_output} />
              <Stat label="AA Batteries" value={state.coalition.aa_batteries} />
              <Stat label="Fighters" value={state.coalition.fighters_available} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Stat label="Strike Pwr" value={state.coalition.strike_power} />
              <Stat label="Accuracy" value={`${(state.coalition.strike_accuracy * 100).toFixed(0)}%`} />
              <Stat label="War Cost/s" value={state.coalition.war_cost_per_sec} color="text-warning" />
            </div>
          </Panel>

          {canPlayCoalition && (
            <Panel title="ACTIONS" side="coalition">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Auto-Fire</span>
                  <button onClick={() => setState(s => ({ ...s, autoFireCoalition: !s.autoFireCoalition }))}
                    className={`px-2 py-0.5 text-[9px] rounded-sm border transition-colors ${
                      state.autoFireCoalition ? 'border-coalition bg-coalition/20 text-coalition' : 'border-border text-muted-foreground'
                    }`}>{state.autoFireCoalition ? 'AUTO ON' : 'AUTO OFF'}</button>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Defense</div>
                <button onClick={handleBuyAA} disabled={state.coalition.budget < state.coalition.aa_cost}
                  className="w-full upgrade-btn-coalition text-center">
                  🛡 Build AA — ${state.coalition.aa_cost}
                </button>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 mb-1">Offense</div>
                <div className="flex gap-1">
                  <button onClick={() => handleBuyFighter(1)} disabled={state.coalition.budget < state.coalition.fighter_cost}
                    className="flex-1 upgrade-btn-coalition text-center text-[10px]">✈ Fighter ${state.coalition.fighter_cost}</button>
                  <button onClick={() => handleBuyFighter(5)} disabled={state.coalition.budget < state.coalition.fighter_cost * 5}
                    className="flex-1 upgrade-btn-coalition text-center text-[10px]">×5</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleSendStrike(1)} disabled={state.coalition.budget < state.coalition.strike_cost}
                    className="flex-1 upgrade-btn-coalition text-center text-[10px]">⚡ Strike ${state.coalition.strike_cost}</button>
                  <button onClick={() => handleSendStrike(5)} disabled={state.coalition.budget < state.coalition.strike_cost * 5}
                    className="flex-1 upgrade-btn-coalition text-center text-[10px]">×5</button>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 mb-1">Finance</div>
                <div className="flex gap-1">
                  <button onClick={() => handleBonds(5000)} className="flex-1 upgrade-btn-coalition text-center text-[10px]">
                    📜 Bonds +$5K <span className="text-danger">−10 sup</span>
                  </button>
                  <button onClick={() => handleBonds(20000)} className="flex-1 upgrade-btn-coalition text-center text-[10px]">
                    📜 +$20K <span className="text-danger">−40 sup</span>
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {canPlayCoalition && (
            <Panel title="RESEARCH" side="coalition">
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {coalitionCategories.map(cat => (
                  <div key={cat}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{cat}</div>
                    <div className="space-y-1">
                      {coalitionUpgrades.filter(u => u.category === cat).map(u => (
                        <ResearchButton key={u.id} upgradeId={u.id} state={state} onResearch={handleResearch} side="coalition" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* CENTER */}
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
                  <span className="text-muted-foreground">Budget</span>
                  <span className={state.coalition.budget < 5000 ? 'text-danger' : 'text-success'}>
                    {state.coalition.budget < 5000 ? 'CRITICAL' : state.coalition.budget < 20000 ? 'LOW' : 'STABLE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resilience Disc.</span>
                  <span>{Math.round((1 - resilienceDiscount) * 100)}%</span>
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
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Stat label="Budget ◆" value={state.regime.budget} color="text-regime" />
              <Stat label="Resilience" value={Math.round(state.regime.resilience)} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Stat label="Bases" value={state.regime.bases} />
              <Stat label="Anti-Air" value={state.regime.anti_air_level} />
              <Stat label="Mines" value={state.regime.mine_count} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Stat label="Drones/s" value={state.regime.drones_per_sec.toFixed(1)} />
              <Stat label="Missiles/s" value={state.regime.missiles_per_sec.toFixed(1)} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Stat label="Drone Cost" value={effectiveDroneCost} />
              <Stat label="Missile Cost" value={effectiveMissileCost} />
            </div>
          </Panel>

          {canPlayRegime && (
            <Panel title="ACTIONS" side="regime">
              <div className="space-y-2">
                <button onClick={handleBuildBase} disabled={state.regime.budget < baseCostDisplay}
                  className="w-full upgrade-btn-regime text-center">
                  🏗 Build Base — ◆{baseCostDisplay}
                </button>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2 mb-1">Launch</div>
                <div className="flex gap-1">
                  <button onClick={() => handleLaunchDrones(10)} disabled={state.regime.budget < effectiveDroneCost * 10}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]">🛩 10 Drones ◆{effectiveDroneCost * 10}</button>
                  <button onClick={() => handleLaunchDrones(50)} disabled={state.regime.budget < effectiveDroneCost * 50}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]">×50</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleLaunchMissiles(5)} disabled={state.regime.budget < effectiveMissileCost * 5}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]">🚀 5 Missiles ◆{effectiveMissileCost * 5}</button>
                  <button onClick={() => handleLaunchMissiles(20)} disabled={state.regime.budget < effectiveMissileCost * 20}
                    className="flex-1 upgrade-btn-regime text-center text-[10px]">×20</button>
                </div>
              </div>
            </Panel>
          )}

          {canPlayRegime && (
            <Panel title="RESEARCH" side="regime">
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {regimeCategories.map(cat => (
                  <div key={cat}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{cat}</div>
                    <div className="space-y-1">
                      {regimeUpgrades.filter(u => u.category === cat).map(u => (
                        <ResearchButton key={u.id} upgradeId={u.id} state={state} onResearch={handleResearch} side="regime" />
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
