import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerRole } from '../game/types';
import {
  createInitialState, gameTick, canAffordUpgrade, startResearch,
  buyPatriot, buyMinigun, buildRadar, buyStrike, buyFighter,
  launchStrikes, launchFighters, issueBonds, publicTax, activateScan,
  regimeBuildBase, buyDrones, buyMissiles, regimeLaunchDrones, regimeLaunchMissiles,
  oilShipping, deployKamikazeMine, radarLockdown,
} from '../game/engine';
import { UPGRADES, getUpgradeCost, getMaxUnlockedTier } from '../game/upgrades';
import Battlefield, { BattlefieldHandle } from './Battlefield';

const Stat: React.FC<{ label: string; value: string | number; color?: string; small?: boolean }> = ({ label, value, color, small }) => (
  <div className="flex flex-col gap-0.5">
    <span className="stat-label">{label}</span>
    <span className={`${small ? 'text-xs font-semibold' : 'stat-value'} ${color ?? ''}`}>{typeof value === 'number' ? Math.round(value).toLocaleString() : value}</span>
  </div>
);

const Bar: React.FC<{ value: number; max: number; color: string; label: string; showDerivative?: number }> = ({ value, max, color, label, showDerivative }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between">
      <span className="stat-label">{label}</span>
      <span className="stat-label">
        {Math.round(value)}/{max}
        {showDerivative !== undefined && (
          <span className={showDerivative >= 0 ? 'text-success' : 'text-danger'}> {showDerivative >= 0 ? '▲' : '▼'}{Math.abs(showDerivative).toFixed(2)}</span>
        )}
      </span>
    </div>
    <div className="h-2 rounded-sm bg-secondary overflow-hidden">
      <div className={`h-full rounded-sm transition-all duration-300 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

const StockDisplay: React.FC<{ label: string; stock: number; producing: boolean; progress: number; time: number; side: 'coalition' | 'regime' }> = 
  ({ label, stock, producing, progress, time, side }) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className="w-16 truncate">{label}</span>
    <span className={`font-bold ${side === 'coalition' ? 'text-coalition' : 'text-regime'}`}>{stock}</span>
    {producing && (
      <div className="flex-1 h-1.5 bg-secondary rounded overflow-hidden">
        <div className={`h-full ${side === 'coalition' ? 'bg-coalition' : 'bg-regime'} transition-all`} 
          style={{ width: `${(progress / time) * 100}%` }} />
      </div>
    )}
  </div>
);

const ResearchButton: React.FC<{
  upgradeId: string; state: GameState; onResearch: (id: string) => void; side: 'coalition' | 'regime';
}> = ({ upgradeId, state, onResearch, side }) => {
  const upgrade = UPGRADES.find(u => u.id === upgradeId)!;
  const u = state.upgrades[upgradeId];
  const level = u?.level ?? 0;
  const cost = getUpgradeCost(upgrade, level);
  const affordable = canAffordUpgrade(state, upgradeId);
  const maxed = level >= upgrade.maxLevel;
  const researching = u?.researching ?? false;
  const progress = researching ? (u.researchProgress / u.researchTarget) * 100 : 0;

  // Check tier lock
  const maxTier = getMaxUnlockedTier(state.upgrades, upgrade.branch);
  const locked = upgrade.tier > maxTier;

  return (
    <button
      className={`relative overflow-hidden w-full ${side === 'coalition' ? 'upgrade-btn-coalition' : 'upgrade-btn-regime'}`}
      disabled={!affordable || maxed || researching || locked}
      onClick={() => onResearch(upgradeId)}
    >
      {researching && (
        <div className={`absolute inset-0 ${side === 'coalition' ? 'bg-coalition' : 'bg-regime'} opacity-20`}
          style={{ width: `${progress}%` }} />
      )}
      <div className="relative flex justify-between items-center gap-2">
        <div className="text-left">
          <div className="font-semibold text-[10px]">
            {locked && '🔒 '}{upgrade.name} <span className="opacity-50">Lv.{level}</span>
            {researching && <span className="ml-1 text-[9px] opacity-70">⏳ {Math.round(progress)}%</span>}
          </div>
          <div className="opacity-60 text-[9px]">{upgrade.description}</div>
        </div>
        <div className="text-right whitespace-nowrap text-[9px]">
          {maxed ? <span className="text-muted-foreground">MAX</span>
            : researching ? <span>🔬 {u.researchTarget - u.researchProgress}t</span>
            : locked ? <span className="text-muted-foreground">T{upgrade.tier}</span>
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
    {logs.slice(0, 20).map((log, i) => (
      <div key={i} className="space-y-0.5" style={{ opacity: 1 - i * 0.04 }}>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-10">T{log.tick}</span>
          <span className="text-coalition">▲{log.dronesIntercepted}d {log.missilesIntercepted}m</span>
          <span className="text-regime">▼{log.droneImpacts}d {log.missileImpacts}m</span>
          {log.basesDestroyed > 0 && <span className="text-warning">💥−{log.basesDestroyed}b</span>}
        </div>
        {log.event && <div className={`pl-12 ${log.eventColor ?? 'text-warning'}`}>{log.event}</div>}
      </div>
    ))}
  </div>
);

const ActionBtn: React.FC<{ onClick: () => void; disabled?: boolean; side: 'coalition' | 'regime'; children: React.ReactNode; className?: string }> = 
  ({ onClick, disabled, side, children, className }) => (
  <button onClick={onClick} disabled={disabled}
    className={`${side === 'coalition' ? 'upgrade-btn-coalition' : 'upgrade-btn-regime'} text-center text-[10px] ${className ?? ''}`}>
    {children}
  </button>
);

const ToggleBtn: React.FC<{ active: boolean; onClick: () => void; label: string; side: 'coalition' | 'regime' }> = ({ active, onClick, label, side }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-[9px] rounded-sm border transition-colors ${
      active ? `border-${side === 'coalition' ? 'coalition' : 'regime'} bg-${side === 'coalition' ? 'coalition' : 'regime'}/20 text-${side === 'coalition' ? 'coalition' : 'regime'}` 
      : 'border-border text-muted-foreground'
    }`} style={active ? { borderColor: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}))`, background: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}) / 0.2)`, color: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}))` } : {}}>
    {label}
  </button>
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
  const handleBuyPatriot = useCallback(() => { setState(s => buyPatriot(s)); }, []);
  const handleBuyMinigun = useCallback(() => { setState(s => buyMinigun(s)); }, []);
  const handleBuildRadar = useCallback(() => { setState(s => buildRadar(s)); }, []);
  const handleBuyStrike = useCallback(() => { setState(s => buyStrike(s)); }, []);
  const handleBuyFighter = useCallback(() => { setState(s => buyFighter(s)); }, []);
  const handleLaunchStrikes = useCallback((n: number) => {
    setState(s => launchStrikes(s, n));
    battlefieldRef.current?.launchStrike(n);
  }, []);
  const handleLaunchFighters = useCallback((n: number) => {
    setState(s => launchFighters(s, n));
    battlefieldRef.current?.launchFighter(n);
  }, []);
  const handleBonds = useCallback(() => setState(s => issueBonds(s)), []);
  const handleTax = useCallback(() => setState(s => publicTax(s)), []);
  const handleScan = useCallback(() => setState(s => activateScan(s)), []);

  // Regime actions
  const handleBuildBase = useCallback((type: 'military' | 'civilian' | 'fake') => {
    setState(s => regimeBuildBase(s, type));
    battlefieldRef.current?.addBase();
  }, []);
  const handleBuyDrones = useCallback((n: number) => setState(s => buyDrones(s, n)), []);
  const handleBuyMissiles = useCallback((n: number) => setState(s => buyMissiles(s, n)), []);
  const handleLaunchDrones = useCallback((n: number) => {
    setState(s => regimeLaunchDrones(s, n));
    battlefieldRef.current?.launchDrones(n);
  }, []);
  const handleLaunchMissiles = useCallback((n: number) => {
    setState(s => regimeLaunchMissiles(s, n));
    battlefieldRef.current?.launchMissiles(n);
  }, []);
  const handleOilShipping = useCallback(() => setState(s => oilShipping(s)), []);
  const handleKamikazeMine = useCallback(() => setState(s => deployKamikazeMine(s)), []);
  const handleRadarLockdown = useCallback(() => setState(s => radarLockdown(s)), []);

  // Stock toggles
  const toggleAutoBuy = useCallback((side: 'coalition' | 'regime', item: 'drone' | 'missile' | 'strike' | 'fighter') => {
    setState(s => {
      const ns = JSON.parse(JSON.stringify(s));
      if (side === 'regime') {
        if (item === 'drone') ns.regime.droneStock.autoBuy = !ns.regime.droneStock.autoBuy;
        if (item === 'missile') ns.regime.missileStock.autoBuy = !ns.regime.missileStock.autoBuy;
      } else {
        if (item === 'strike') ns.coalition.strikeStock.autoBuy = !ns.coalition.strikeStock.autoBuy;
        if (item === 'fighter') ns.coalition.fighterStock.autoBuy = !ns.coalition.fighterStock.autoBuy;
      }
      return ns;
    });
  }, []);
  const toggleAutoLaunch = useCallback((side: 'coalition' | 'regime', item: 'drone' | 'missile' | 'strike' | 'fighter') => {
    setState(s => {
      const ns = JSON.parse(JSON.stringify(s));
      if (side === 'regime') {
        if (item === 'drone') ns.regime.droneStock.autoLaunch = !ns.regime.droneStock.autoLaunch;
        if (item === 'missile') ns.regime.missileStock.autoLaunch = !ns.regime.missileStock.autoLaunch;
      } else {
        if (item === 'strike') ns.coalition.strikeStock.autoLaunch = !ns.coalition.strikeStock.autoLaunch;
        if (item === 'fighter') ns.coalition.fighterStock.autoLaunch = !ns.coalition.fighterStock.autoLaunch;
      }
      return ns;
    });
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
  const regimeBranches = [...new Set(regimeUpgrades.map(u => u.branch))];
  const coalitionBranches = [...new Set(coalitionUpgrades.map(u => u.branch))];

  const aliveBases = state.regime.bases.filter(b => b.alive);
  const militaryBases = aliveBases.filter(b => b.type === 'military');
  const fervorDiscount = Math.max(0.3, 1 - state.regime.fervor * 0.005);
  const effectiveDroneCost = Math.round(state.regime.droneCost * fervorDiscount);
  const effectiveMissileCost = Math.round(state.regime.missileCost * fervorDiscount);

  return (
    <div className="min-h-screen bg-background scanline">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm text-primary tracking-widest">ASYMMETRIC WARS</h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {state.phase} — T{state.tick}
          </span>
          {state.regime.nuclearUnlocked && (
            <span className="text-[10px] text-danger animate-pulse tracking-wider">☢ NUCLEAR {Math.round(state.regime.nuclearProgress)}%</span>
          )}
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
          <button onClick={resetGame} className="px-3 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:border-primary/30 font-display tracking-wider">↺</button>
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
            <p className="text-sm text-muted-foreground">T{state.tick} — {state.phase}</p>
            <button onClick={resetGame} className="px-6 py-2 border border-primary text-primary font-display tracking-wider hover:bg-primary/10 transition-colors">NEW SIMULATION</button>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[280px_1fr_280px] gap-2 p-2" style={{ height: 'calc(100vh - 48px)' }}>
        {/* COALITION SIDE */}
        <div className="space-y-2 overflow-y-auto pr-1 text-[11px]">
          {/* Macro Bar */}
          <Panel title="HAND FREE" side="coalition">
            <div className="text-center mb-2">
              <span className={`text-2xl font-display tracking-widest ${state.coalition.handFree < 20 ? 'text-danger' : state.coalition.handFree < 50 ? 'text-warning' : 'text-coalition'}`}>
                {Math.round(state.coalition.handFree)}
              </span>
              <span className="text-muted-foreground text-[10px] ml-1">/ 100</span>
            </div>
            <Bar value={state.coalition.economy} max={100} color="bg-coalition" label="Economy" showDerivative={state.coalition.economyDerivative} />
            <Bar value={state.coalition.publicSupport} max={100} color="bg-coalition" label="Public Support" showDerivative={state.coalition.publicSupportDerivative} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="Money $" value={state.coalition.money} color="text-coalition" small />
              <Stat label="Debt $" value={state.coalition.debt} color="text-danger" small />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Stat label="Income/t" value={state.coalition.incomePerTick} small />
              <Stat label="War Cost" value={state.coalition.warCostPerSec} color="text-warning" small />
            </div>
          </Panel>

          {canPlayCoalition && (
            <Panel title="STOCKPILE" side="coalition">
              <StockDisplay label="Strikes" stock={state.coalition.strikeStock.stock} producing={state.coalition.strikeStock.producing}
                progress={state.coalition.strikeStock.productionProgress} time={state.coalition.strikeStock.productionTime} side="coalition" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={handleBuyStrike} disabled={state.coalition.money < 800} side="coalition" className="flex-1">Buy $800</ActionBtn>
                <ToggleBtn active={state.coalition.strikeStock.autoBuy} onClick={() => toggleAutoBuy('coalition', 'strike')} label="Auto" side="coalition" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchStrikes(1)} disabled={state.coalition.strikeStock.stock < 1} side="coalition" className="flex-1">⚡ Fire ×1</ActionBtn>
                <ActionBtn onClick={() => handleLaunchStrikes(5)} disabled={state.coalition.strikeStock.stock < 5} side="coalition" className="flex-1">×5</ActionBtn>
                <ToggleBtn active={state.coalition.strikeStock.autoLaunch} onClick={() => toggleAutoLaunch('coalition', 'strike')} label="Auto" side="coalition" />
              </div>

              <div className="border-t border-border mt-2 pt-2" />
              <StockDisplay label="Fighters" stock={state.coalition.fighterStock.stock} producing={state.coalition.fighterStock.producing}
                progress={state.coalition.fighterStock.productionProgress} time={state.coalition.fighterStock.productionTime} side="coalition" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={handleBuyFighter} disabled={state.coalition.money < 2000} side="coalition" className="flex-1">Buy $2K</ActionBtn>
                <ToggleBtn active={state.coalition.fighterStock.autoBuy} onClick={() => toggleAutoBuy('coalition', 'fighter')} label="Auto" side="coalition" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchFighters(1)} disabled={state.coalition.fighterStock.stock < 1} side="coalition" className="flex-1">✈ Deploy ×1</ActionBtn>
                <ActionBtn onClick={() => handleLaunchFighters(3)} disabled={state.coalition.fighterStock.stock < 3} side="coalition" className="flex-1">×3</ActionBtn>
                <ToggleBtn active={state.coalition.fighterStock.autoLaunch} onClick={() => toggleAutoLaunch('coalition', 'fighter')} label="Auto" side="coalition" />
              </div>
            </Panel>
          )}

          {canPlayCoalition && (
            <Panel title="CONSTRUCTION" side="coalition">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Stat label="Patriots" value={state.coalition.patriots} small />
                <Stat label="Miniguns" value={state.coalition.miniguns} small />
                <Stat label="Radar" value={state.coalition.radarSpots} small />
              </div>
              <div className="space-y-1">
                <ActionBtn onClick={handleBuyPatriot} disabled={state.coalition.money < state.coalition.patriotCost} side="coalition" className="w-full">
                  🛡 Patriot ${state.coalition.patriotCost.toLocaleString()}
                </ActionBtn>
                <ActionBtn onClick={handleBuyMinigun} disabled={state.coalition.money < state.coalition.minigunCost} side="coalition" className="w-full">
                  🔫 Minigun ${state.coalition.minigunCost}
                </ActionBtn>
                <ActionBtn onClick={handleBuildRadar} disabled={state.coalition.money < state.coalition.radarSpotCost} side="coalition" className="w-full">
                  📡 Radar ${state.coalition.radarSpotCost.toLocaleString()}
                </ActionBtn>
              </div>
            </Panel>
          )}

          {canPlayCoalition && (
            <Panel title="ECONOMIC & INTEL" side="coalition">
              <div className="space-y-1">
                <ActionBtn onClick={handleBonds} side="coalition" className="w-full">
                  📜 Treasury Bonds — +$5K debt, +income
                </ActionBtn>
                <ActionBtn onClick={handleTax} side="coalition" className="w-full">
                  💰 Public Tax — +$2K, <span className="text-danger">−5 support</span>
                </ActionBtn>
                <ActionBtn onClick={handleScan} disabled={!state.coalition.scanAvailable || state.coalition.scanActive} side="coalition" className="w-full">
                  {state.coalition.scanActive ? `🔍 SCANNING... ${state.coalition.scanTimer}t` 
                    : state.coalition.scanAvailable ? '🔍 Activate Scan' 
                    : `🔍 Cooldown ${state.coalition.scanCooldown}t`}
                </ActionBtn>
              </div>
            </Panel>
          )}

          {canPlayCoalition && (
            <Panel title="DOCTRINE" side="coalition">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {coalitionBranches.map(branch => (
                  <div key={branch}>
                    <div className="text-[10px] text-coalition uppercase tracking-widest mb-1 font-display">{branch}</div>
                    <div className="space-y-1">
                      {coalitionUpgrades.filter(u => u.branch === branch).sort((a, b) => a.tier - b.tier).map(u => (
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
        <div className="flex flex-col gap-2 min-h-0">
          <Panel title="BATTLEFIELD" className="flex-1 min-h-0">
            <div className="h-full" style={{ minHeight: 300 }}>
              <Battlefield ref={battlefieldRef} state={state} />
            </div>
          </Panel>
          <div className="grid grid-cols-2 gap-2">
            <Panel title="SITUATION">
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase</span>
                  <span className={`uppercase font-display tracking-wider ${
                    state.phase === 'early' ? 'text-success' : state.phase === 'mid' ? 'text-warning' : state.phase === 'nuclear' ? 'text-danger animate-pulse' : 'text-danger'
                  }`}>{state.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctrine</span>
                  <span>{state.regime.droneBias > state.regime.missileBias ? 'DRONE SWARM' : 'MISSILE HEAVY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bases (mil/civ/fake)</span>
                  <span>{militaryBases.length}/{aliveBases.filter(b => b.type === 'civilian').length}/{aliveBases.filter(b => b.type === 'fake').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hand Free</span>
                  <span className={state.coalition.handFree < 20 ? 'text-danger' : 'text-success'}>{Math.round(state.coalition.handFree)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resilience</span>
                  <span className={state.regime.resilience > 80 ? 'text-danger' : ''}>{Math.round(state.regime.resilience)}</span>
                </div>
              </div>
            </Panel>
            <Panel title="COMBAT LOG">
              <CombatFeed logs={state.combatLog} />
            </Panel>
          </div>
        </div>

        {/* REGIME SIDE */}
        <div className="space-y-2 overflow-y-auto pl-1 text-[11px]">
          {/* Macro Bar */}
          <Panel title="RESILIENCE" side="regime">
            <div className="text-center mb-2">
              <span className={`text-2xl font-display tracking-widest ${state.regime.resilience > 80 ? 'text-danger animate-pulse' : state.regime.resilience > 50 ? 'text-warning' : 'text-regime'}`}>
                {Math.round(state.regime.resilience)}
              </span>
              <span className="text-muted-foreground text-[10px] ml-1">/ 100</span>
              {state.regime.nuclearUnlocked && <span className="text-danger text-[10px] ml-2">☢ {Math.round(state.regime.nuclearProgress)}%</span>}
            </div>
            <Bar value={state.regime.fervor} max={100} color="bg-regime" label="Fervor" />
            <Bar value={state.regime.dispersion} max={100} color="bg-regime" label="Dispersion" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="Money ◆" value={state.regime.money} color="text-regime" small />
              <Stat label="Regen/t" value={state.regime.moneyRegen.toFixed(1)} small />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Stat label="Bases" value={aliveBases.length} small />
              <Stat label="Oil Lvl" value={state.regime.oilShippingLevel} small />
            </div>
          </Panel>

          {canPlayRegime && (
            <Panel title="STOCKPILE" side="regime">
              <StockDisplay label="Drones" stock={state.regime.droneStock.stock} producing={state.regime.droneStock.producing}
                progress={state.regime.droneStock.productionProgress} time={state.regime.droneStock.productionTime} side="regime" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleBuyDrones(5)} disabled={state.regime.money < effectiveDroneCost * 5} side="regime" className="flex-1">
                  Buy ×5 ◆{effectiveDroneCost * 5}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuyDrones(20)} disabled={state.regime.money < effectiveDroneCost * 20} side="regime" className="flex-1">×20</ActionBtn>
                <ToggleBtn active={state.regime.droneStock.autoBuy} onClick={() => toggleAutoBuy('regime', 'drone')} label="Auto" side="regime" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchDrones(5)} disabled={state.regime.droneStock.stock < 5} side="regime" className="flex-1">
                  🛩 Fire ×5
                </ActionBtn>
                <ActionBtn onClick={() => handleLaunchDrones(20)} disabled={state.regime.droneStock.stock < 20} side="regime" className="flex-1">×20</ActionBtn>
                <ToggleBtn active={state.regime.droneStock.autoLaunch} onClick={() => toggleAutoLaunch('regime', 'drone')} label="Auto" side="regime" />
              </div>

              <div className="border-t border-border mt-2 pt-2" />
              <StockDisplay label="Missiles" stock={state.regime.missileStock.stock} producing={state.regime.missileStock.producing}
                progress={state.regime.missileStock.productionProgress} time={state.regime.missileStock.productionTime} side="regime" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleBuyMissiles(3)} disabled={state.regime.money < effectiveMissileCost * 3} side="regime" className="flex-1">
                  Buy ×3 ◆{effectiveMissileCost * 3}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuyMissiles(10)} disabled={state.regime.money < effectiveMissileCost * 10} side="regime" className="flex-1">×10</ActionBtn>
                <ToggleBtn active={state.regime.missileStock.autoBuy} onClick={() => toggleAutoBuy('regime', 'missile')} label="Auto" side="regime" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchMissiles(2)} disabled={state.regime.missileStock.stock < 2} side="regime" className="flex-1">
                  🚀 Fire ×2
                </ActionBtn>
                <ActionBtn onClick={() => handleLaunchMissiles(10)} disabled={state.regime.missileStock.stock < 10} side="regime" className="flex-1">×10</ActionBtn>
                <ToggleBtn active={state.regime.missileStock.autoLaunch} onClick={() => toggleAutoLaunch('regime', 'missile')} label="Auto" side="regime" />
              </div>
            </Panel>
          )}

          {canPlayRegime && (
            <Panel title="CONSTRUCTION" side="regime">
              <div className="space-y-1">
                <ActionBtn onClick={() => handleBuildBase('military')} disabled={state.regime.money < state.regime.baseCost} side="regime" className="w-full">
                  🏗 Military Base ◆{state.regime.baseCost}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuildBase('civilian')} disabled={state.regime.money < state.regime.baseCost * 0.6} side="regime" className="w-full">
                  🏘 Civilian Base ◆{Math.round(state.regime.baseCost * 0.6)}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuildBase('fake')} disabled={state.regime.money < state.regime.baseCost * 0.3} side="regime" className="w-full">
                  🎭 Fake Base ◆{Math.round(state.regime.baseCost * 0.3)}
                </ActionBtn>
              </div>
            </Panel>
          )}

          {canPlayRegime && (
            <Panel title="SPECIAL OPS" side="regime">
              <div className="space-y-1">
                <ActionBtn onClick={handleOilShipping} disabled={state.regime.money < 20 + state.regime.oilShippingLevel * 10} side="regime" className="w-full">
                  🛢 Oil Shipping ◆{20 + state.regime.oilShippingLevel * 10}
                </ActionBtn>
                <ActionBtn onClick={handleKamikazeMine} disabled={state.regime.money < state.regime.kamikazeMineCost} side="regime" className="w-full">
                  💣 Kamikaze Mine ◆{state.regime.kamikazeMineCost} <span className="text-warning">−fervor</span>
                </ActionBtn>
                <ActionBtn onClick={handleRadarLockdown} disabled={!state.regime.radarLockdownAvailable} side="regime" className="w-full">
                  {state.regime.radarLockdownAvailable ? '📡 Radar Lockdown' : `📡 Cooldown ${state.regime.radarLockdownCooldown}t`}
                </ActionBtn>
              </div>
            </Panel>
          )}

          {canPlayRegime && (
            <Panel title="DOCTRINE" side="regime">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {regimeBranches.map(branch => (
                  <div key={branch}>
                    <div className="text-[10px] text-regime uppercase tracking-widest mb-1 font-display">{branch}</div>
                    <div className="space-y-1">
                      {regimeUpgrades.filter(u => u.branch === branch).sort((a, b) => a.tier - b.tier).map(u => (
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
