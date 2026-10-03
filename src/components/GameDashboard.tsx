import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameState, PlayerRole, UpgradeDef } from '../game/types';
import type { BalanceConfig } from '../game/balance';
import {
  createInitialState, gameTick, canAffordUpgrade, startResearch,
  buyPatriot, buyMinigun, buildRadar, buyStrike, buyFighter,
  launchStrikes, launchFighters, issueBonds, publicTax, activateScan,
  activateFearBusiness,
  regimeBuildBase, buryBase, buryBaseByLevel, buyDrones, buyMissiles, regimeLaunchDrones, regimeLaunchMissiles,
  oilShipping, deployKamikazeMine, radarLockdown,
} from '../game/engine';
import { getUpgrades, getUpgradeCost, getMaxUnlockedTier } from '../game/upgrades';
import { loadMergedBalance, saveBalanceToStorage } from '../game/balanceStorage';
import BalancePanel from './BalancePanel';
import Battlefield, { BattlefieldHandle } from './Battlefield';
import { sounds } from '../lib/soundUtils';
import { loadScenarios, getDefaultConfig, Scenario } from '../game/scenarios';
import { IntroSequence } from './IntroSequence';
import { TutorialOverlay } from './TutorialOverlay';

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
  ({ label, stock, producing, progress, time, side }) => {
  const isInstant = time <= 1;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-16 truncate">{label}</span>
      <span className={`font-bold ${side === 'coalition' ? 'text-coalition' : 'text-regime'}`}>{stock}</span>
      {producing && (
        <div className="flex-1 h-1.5 bg-secondary rounded overflow-hidden relative">
          <div className={`h-full ${side === 'coalition' ? 'bg-coalition' : 'bg-regime'} transition-all ${isInstant ? 'animate-pulse' : ''}`} 
            style={{ width: isInstant ? '100%' : `${(progress / time) * 100}%` }} />
        </div>
      )}
    </div>
  );
};



  const ResearchButton: React.FC<{
  upgradeId: string;
  state: GameState;
  balance: BalanceConfig;
  upgrades: UpgradeDef[];
  onResearch: (id: string) => void;
  side: 'coalition' | 'regime';
  disabled?: boolean;
}> = ({ upgradeId, state, balance, upgrades, onResearch, side, disabled: externalDisabled }) => {
  const upgrade = upgrades.find((u) => u.id === upgradeId)!;
  const u = state.upgrades[upgradeId];
  const level = u?.level ?? 0;
  const cost = getUpgradeCost(upgrade, level);
  const affordable = canAffordUpgrade(state, balance, upgradeId);
  const maxed = level >= upgrade.maxLevel;
  const researching = u?.researching ?? false;
  const progress = researching ? (u.researchProgress / u.researchTarget) * 100 : 0;
  const maxTier = getMaxUnlockedTier(state.upgrades, upgrade.branch, balance);
  const locked = upgrade.tier > maxTier;

  // Visual level indicators
  const dots = [];
  for (let i = 0; i < upgrade.maxLevel; i++) {
    dots.push(
      <span key={i} className={`text-[8px] leading-none ${i < level ? (side === 'coalition' ? 'text-coalition shadow-[0_0_5px_rgba(30,144,255,0.5)]' : 'text-regime shadow-[0_0_5px_rgba(255,69,0,0.5)]') : 'text-muted-foreground opacity-30 italic'}`}>
        {i < level ? '★' : '•'}
      </span>
    );
  }

  return (
    <button
      className={`relative overflow-hidden w-full transition-all border p-1 rounded-sm text-[10px] ${
        side === 'coalition' 
          ? (level > 0 ? 'bg-coalition/10 border-coalition/40' : 'bg-secondary/20 border-border/40')
          : (level > 0 ? 'bg-regime/10 border-regime/40' : 'bg-secondary/20 border-border/40')
      } ${(!affordable || maxed || researching || locked || externalDisabled) ? 'opacity-70 grayscale-[0.3]' : 'hover:border-primary/60 hover:translate-x-0.5'}`}
      disabled={!affordable || maxed || researching || locked || externalDisabled}
      onClick={() => onResearch(upgradeId)}
    >
      {researching && (
        <div className={`absolute inset-y-0 left-0 ${side === 'coalition' ? 'bg-coalition' : 'bg-regime'} opacity-20 transition-all duration-300`}
          style={{ width: `${progress}%` }} />
      )}
      <div className="relative flex flex-col gap-0.5">
        <div className="flex justify-between items-start gap-1">
          <div className="text-left font-display tracking-tight text-[10px] uppercase truncate flex-1">
            {locked && '🔒 '}{upgrade.name}
          </div>
          <div className="flex gap-0.5">{dots}</div>
        </div>
        <div className="flex justify-between items-center gap-2">
          <div className="opacity-70 text-[9px] text-left leading-tight truncate-multiline max-h-[22px] overflow-hidden">{upgrade.description}</div>
          <div className="text-right whitespace-nowrap text-[10px] font-mono">
            {maxed ? <span className="text-muted-foreground">MAX</span>
              : researching ? <span className="animate-pulse">🔬 {u.researchTarget - u.researchProgress}t</span>
              : locked ? <span className="text-muted-foreground opacity-50">T{upgrade.tier}</span>
              : <span className={affordable ? (side === 'coalition' ? 'text-coalition' : 'text-regime') : 'text-muted-foreground'}>
                  {side === 'coalition' ? `+$${Math.round(cost).toLocaleString()}` : `◆${Math.round(cost).toLocaleString()}`}
                </span>}
          </div>
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

const AIPanelBadge: React.FC<{ side: 'coalition' | 'regime' }> = ({ side }) => (
  <div className={`absolute top-2 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-tighter animate-pulse z-10 ${
    side === 'coalition' ? 'bg-coalition/10 border-coalition/40 text-coalition shadow-[0_0_8px_rgba(30,144,255,0.3)]' : 'bg-regime/10 border-regime/40 text-regime shadow-[0_0_8px_rgba(255,69,0,0.3)]'
  }`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
    <span>AI ACTIVE</span>
  </div>
);

const CombatFeed: React.FC<{ logs: GameState['combatLog'] }> = ({ logs }) => (
  <div className="space-y-1 h-full overflow-y-auto text-[10px] font-mono">
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
      active ? '' : 'border-border text-muted-foreground'
    }`} style={active ? { borderColor: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}))`, background: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}) / 0.2)`, color: `hsl(var(--${side === 'coalition' ? 'coalition-primary' : 'regime-primary'}))` } : {}}>
    {label}
  </button>
);

export default function GameDashboard() {
  const [balance, setBalance] = useState<BalanceConfig | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  useEffect(() => {
    async function init() {
      const b = await loadMergedBalance();
      const s = await loadScenarios();
      setBalance(b);
      setState(createInitialState(b));
      setScenarios(s);
    }
    init();
  }, []);
  
  const [activeCoalitionDoctrine, setActiveCoalitionDoctrine] = useState<string>('SPIN DOCTOR');
  const [activeRegimeDoctrine, setActiveRegimeDoctrine] = useState<string>('INDOCRINATION');
  const upgrades = useMemo(() => balance ? getUpgrades(balance) : [], [balance]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battlefieldRef = useRef<BattlefieldHandle>(null);

  const [announcements, setAnnouncements] = useState<{ id: number; text: string }[]>([]);
  const nextAnnId = useRef(0);
  const lastLogTick = useRef(-1);

  // V14 - Retro Experience & Scenarios States
  const [gameStarted, setGameStarted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sounds.muted = next;
  };

  const handleStartGame = async (scenarioId: string | null) => {
    sounds.play('click');
    const b = await loadMergedBalance();
    const newConfig = await getDefaultConfig(b, scenarioId || undefined);
    setBalance(newConfig);
    setState(createInitialState(newConfig));
    setSelectedScenario(scenarioId);
    setShowIntro(true);
  };

  const handleFinishIntro = () => {
    setGameStarted(true);
    setShowIntro(false);
  };

  const checkAdmin = () => {
    if (adminInput.toUpperCase() === 'MAAB8') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminInput('');
      sounds.play('victory');
    } else {
      sounds.play('defeat');
    }
  };

  useEffect(() => {
    if (!state) return;
    const latestLog = state.combatLog[0];
    if (latestLog && latestLog.satiricalEvent && latestLog.tick !== lastLogTick.current) {
      lastLogTick.current = latestLog.tick;
      const id = nextAnnId.current++;
      const text = latestLog.satiricalEvent;
      setAnnouncements(prev => [...prev.slice(-2), { id, text }]);
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }, 5000);
    }
  }, [state?.combatLog]);

  const step = useCallback(() => {
    if (!balance) return;
    setState(prev => {
      if (!prev) return prev;
      const next = gameTick(prev, balance);
      
      return next;
    });
  }, [balance]);

  const toggleGame = () => {
    sounds.play('click');
    setState(prev => prev ? { ...prev, running: !prev.running } : null);
  };

  const updateSpeed = (speed: number) => {
    sounds.play('click');
    setState(prev => prev ? { ...prev, speed } : null);
  };

  useEffect(() => {
    if (state) sounds.gameSpeed = state.speed;
  }, [state?.speed]);

  useEffect(() => {
    if (!state) return;
    if (state.running && gameStarted) {
      intervalRef.current = setInterval(step, 1000 / state.speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state?.running, state?.speed, step, gameStarted]);

  const handleResearch = (id: string) => {
    if (!balance) return;
    sounds.play('scan');
    setState(prev => prev ? startResearch(prev, balance, id) : null);
  };
  
  const handleAction = (fn: any, ...args: any[]) => {
    if (!balance) return;
    let sound: any = 'click';
    if (fn.name === 'publicTax' || fn.name === 'issueBonds' || fn.name === 'activateFearBusiness') sound = 'finance';
    sounds.play(sound);
    setState(prev => prev ? fn(prev, balance, ...args) : null);
  };

  const handleStrike = (count: number) => {
    sounds.play('launch_strike');
    setState(prev => prev ? launchStrikes(prev, count) : null);
  };

  const handleFighters = (count: number) => {
    sounds.play('launch_fighter');
    setState(prev => {
      if (!prev) return null;
      const available = Math.min(count, prev.coalition.fighterStock.stock);
      if (available <= 0) return prev;
      const s = JSON.parse(JSON.stringify(prev));
      s.coalition.fighterStock.stock -= available;
      s.coalition.manualFightersToLaunch = (s.coalition.manualFightersToLaunch || 0) + available;
      return s;
    });
  };

  const handleScan = () => {
    if (!balance) return;
    sounds.play('scan');
    setState(prev => prev ? activateScan(prev, balance) : null);
  };

  const setRole = (role: PlayerRole) => {
    sounds.play('click');
    setState(s => s ? ({ ...s, role }) : null);
  };
  
  const impactBufferRef = useRef<Set<string>>(new Set());
  const soundThrottleRef = useRef<number>(0);

  const handleVisualImpact = useCallback((type: string) => {
    impactBufferRef.current.add(type);
    
    // Throttle sounds to one per frame/batch
    if (Date.now() - soundThrottleRef.current < 50) return;
    soundThrottleRef.current = Date.now();

    setTimeout(() => {
      const batch = Array.from(impactBufferRef.current);
      if (batch.length === 0) return;
      
      if (batch.length >= 3 || batch.includes('strike')) {
        sounds.play('triple_boom');
      } else if (batch.length > 1) {
        sounds.play('heavy_impact');
      } else {
        sounds.play('impact');
      }
      impactBufferRef.current.clear();
    }, 10);
  }, []);

  const handleVisualIntercept = useCallback(() => {
    if (Date.now() - soundThrottleRef.current < 30) return; // Light throttle
    sounds.play('intercept');
  }, []);

  const resetGame = async () => {
    sounds.play('victory'); // Retro "restart" feel
    const newConfig = await loadMergedBalance();
    setBalance(newConfig);
    setState(createInitialState(newConfig));
    setGameStarted(false);
    setShowIntro(false);
  };

  const handleBuildBase = useCallback((type: 'military' | 'civilian' | 'fake') => {
    if (!balance) return;
    sounds.play('build');
    setState(s => s ? regimeBuildBase(s, balance, type) : null);
    battlefieldRef.current?.addBase();
  }, [balance]);

  const handleBuryByLevel = (level: number) => {
    if (!balance) return;
    sounds.play('build');
    setState(s => s ? buryBaseByLevel(s, balance, level) : null);
  };

  const handleBuyDrones = (n: number) => {
    if (!balance) return;
    sounds.play('click');
    setState(s => s ? buyDrones(s, balance, n) : null);
  };

  const handleBuyMissiles = (n: number) => {
    if (!balance) return;
    sounds.play('click');
    setState(s => s ? buyMissiles(s, balance, n) : null);
  };

  const handleLaunchDrones = (n: number) => {
    sounds.play('launch_drone');
    setState(s => s ? regimeLaunchDrones(s, n) : null);
  };

  const handleLaunchMissiles = (n: number) => {
    sounds.play('launch_missile');
    setState(s => s ? regimeLaunchMissiles(s, n) : null);
  };

  const handleOilShipping = () => {
    if (!balance) return;
    sounds.play('finance');
    setState(s => s ? oilShipping(s, balance) : null);
  };

  const handleKamikazeMine = () => {
    if (!balance) return;
    sounds.play('intercept');
    setState(s => s ? deployKamikazeMine(s, balance) : null);
  };

  const handleRadarLockdown = () => {
    if (!balance) return;
    sounds.play('radar');
    setState(s => s ? radarLockdown(s, balance) : null);
  };

  const toggleAutoBuy = useCallback((side: 'coalition' | 'regime', item: 'drone' | 'missile' | 'strike' | 'fighter') => {
    setState(s => {
      if (!s) return s;
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
      if (!s) return s;
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

  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return !localStorage.getItem('asymmetric-war-tutorial-seen');
  });

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem('asymmetric-war-tutorial-seen', '1');
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    if (!state) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.running && !state.gameOver && gameStarted) {
      const ms = Math.min(1000, Math.max(16, 1000 / state.speed));
      intervalRef.current = setInterval(step, ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state?.running, state?.speed, state?.gameOver, gameStarted, step]);

  if (!balance || !state) {
    return <div className="fixed inset-0 bg-[#0a0c10] flex items-center justify-center text-primary font-display text-2xl animate-pulse tracking-[0.2em] text-center">INITIATING<br/>ASYMMETRIC WARFARE ENGINE...</div>;
  }

  const canPlayCoalition = state.role === 'coalition' || state.role === 'both';
  const canPlayRegime = state.role === 'regime' || state.role === 'both';

  const regimeUpgrades = upgrades.filter(u => u.side === 'regime');
  const coalitionUpgrades = upgrades.filter(u => u.side === 'coalition');
  const regimeBranches = [...new Set(regimeUpgrades.map(u => u.branch))];
  const coalitionBranches = [...new Set(coalitionUpgrades.map(u => u.branch))];

  const aliveBases = state.regime.bases.filter(b => b.alive);
  const militaryBases = aliveBases.filter(b => b.type === 'military');
  const fd = balance.simulation.fervor;
  const fervorDiscount = Math.max(fd.discountMin, 1 - state.regime.fervor * fd.discountPerFervor);
  const effectiveDroneCost = Math.round(state.regime.droneCost * fervorDiscount * 2);
  const effectiveMissileCost = Math.round(state.regime.missileCost * fervorDiscount * 2);

  const interceptionPct = state.coalition.totalIncoming > 0
    ? Math.round((state.coalition.totalIntercepted / state.coalition.totalIncoming) * balance.global.percentScale)
    : balance.global.percentScale;

  const scanCost = Math.round(
    state.coalition.scanBaseCost * Math.pow(balance.coalition.scan.costExponent, state.coalition.scanConsecutiveCount),
  );

  const auto = balance.simulation.autoBuy;
  const bonds = balance.coalition.bonds;
  const tax = balance.coalition.tax;
  const fear = balance.coalition.fearBusiness;
  const rb = balance.regime.build;
  const buryCfg = balance.regime.bury;
  const oilCfg = balance.regime.oilShipping;
  const oilShipCost = oilCfg.baseCost + state.regime.oilShippingLevel * oilCfg.costPerLevel;
  const rl = balance.regime.radarLockdown;

  const sp = balance.simulation.production;
  const strikeReloadBonus = 1 - (state.upgrades.c_strike_reload?.level ?? 0) * sp.strikeReloadTimeReductionPerLevel;
  const effectiveStrikeTime = Math.max(sp.minStrikeProductionTicks, state.coalition.strikeStock.productionTime * strikeReloadBonus);

  const fighterReloadBonus = 1 - (state.upgrades.c_fighter_reload?.level ?? 0) * sp.fighterReloadTimeReductionPerLevel;
  const effectiveFighterTime = Math.max(sp.minFighterProductionTicks, state.coalition.fighterStock.productionTime * fighterReloadBonus);

  if (!gameStarted && !showIntro) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex items-center justify-center p-6 font-mono overflow-auto">
        <div className="max-w-4xl w-full flex flex-col gap-8">
          <header className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-display text-primary tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,191,0,0.3)]">
              ASYMMETRIC WAR
            </h1>
            <p className="text-muted-foreground font-pixel text-[10px] tracking-widest opacity-60">SELECT YOUR THEATER OF OPERATIONS</p>
          </header>

          <div className="grid md:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleStartGame(scenario.id)}
                className="flex flex-col gap-4 p-6 border-2 border-primary/20 bg-card/40 backdrop-blur-md hover:border-primary/60 hover:bg-primary/5 transition-all group text-left relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <span className="text-3xl">{scenario.icon}</span>
                  <span className={`text-[9px] font-pixel px-2 py-1 rounded border ${
                    scenario.difficulty === 'Easy' ? 'border-success/40 text-success bg-success/10' :
                    scenario.difficulty === 'Normal' ? 'border-primary/40 text-primary bg-primary/10' :
                    'border-danger/40 text-danger bg-danger/10 shadow-[0_0_10px_rgba(255,0,0,0.2)]'
                  }`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-display text-primary">{scenario.name}</h2>
                  <p className="text-[10px] text-muted-foreground leading-relaxed h-[60px] overflow-hidden">{scenario.description}</p>
                </div>
                <div className="pt-4 border-t border-primary/10 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[9px] text-coalition"><span className="font-bold">COALITION:</span> {scenario.coalitionStrength}</div>
                  <div className="text-[9px] text-regime"><span className="font-bold">REGIME:</span> {scenario.regimeStrength}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-12">
             <button 
               onClick={() => handleStartGame(null)}
               className="px-8 py-3 border-2 border-primary/40 text-primary font-display text-xs hover:bg-primary hover:text-black transition-all tracking-[0.3em] bg-transparent"
             >
               DEFAULT SKIRMISH
             </button>
          </div>

          <footer className="mt-12 flex justify-between items-center opacity-30 text-[10px]">
            <span>V14 // GRAND STRATEGIST ENGINE</span>
            {/* Legacy Key Button Removed - Now using Top Left Dot */}
          </footer>

          {showAdminLogin && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 text-foreground">
              <div className="w-80 p-8 border-2 border-primary/40 bg-card space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xs text-primary font-pixel uppercase">Admin Protocol</h3>
                  <p className="text-[9px] text-muted-foreground">INPUT CLEARANCE CODE</p>
                </div>
                <input 
                  type="password"
                  autoFocus
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkAdmin()}
                  className="w-full bg-black border border-primary/20 p-2 text-center font-mono text-primary outline-none focus:border-primary/60"
                  placeholder="********"
                />
                <div className="flex gap-2">
                  <button onClick={checkAdmin} className="flex-1 py-2 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold hover:bg-primary/40">UNLOCK</button>
                  <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-2 border border-border text-muted-foreground text-[10px] font-bold">CANCEL</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroSequence onComplete={handleFinishIntro} />;
  }

  return (
    <div className="min-h-screen bg-background scanline relative">
      {/* Hidden Admin Trigger - Top Left Dot */}
      <button 
        onClick={() => setShowAdminLogin(true)}
        className="absolute top-0 left-0 w-4 h-4 opacity-0 hover:opacity-10 z-[100] cursor-default bg-white"
        title="Admin Terminal"
      />

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
          <div className="flex gap-1" data-tutorial="tutorial-role-select">
            {(['coalition', 'regime', 'both', 'observer'] as PlayerRole[]).map(role => (
              <button key={role} onClick={() => setRole(role)}
                title={role === 'observer' ? 'Watch AI vs AI' : role === 'both' ? 'Manual control for both sides' : `Play as ${role}, AI controls the other`}
                className={`px-3 py-1 text-[10px] uppercase font-display tracking-widest rounded-sm border transition-all ${
                  state.role === role 
                    ? (role === 'coalition' ? 'border-coalition bg-coalition/10 text-coalition shadow-[0_0_10px_rgba(30,144,255,0.2)]' 
                      : role === 'regime' ? 'border-regime bg-regime/10 text-regime shadow-[0_0_10px_rgba(255,69,0,0.2)]'
                      : 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(255,215,0,0.2)]') 
                    : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}>{role}</button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex gap-1">
            {[1, 2, 5, 10].map(s => (
              <button key={s} onClick={() => updateSpeed(s)}
                className={`px-2 py-1 text-[10px] rounded-sm border transition-colors ${
                  state.speed === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}>{s}x</button>
            ))}
          </div>
          <button onClick={toggleMute} 
            className={`px-3 py-1 text-xs rounded-sm border font-display tracking-wider transition-colors ${
              muted ? 'border-danger bg-danger/10 text-danger' : 'border-border text-muted-foreground hover:border-primary/30'
            }`}>
            {muted ? '🔇 MUTE' : '🔊 SOUND'}
          </button>
          <button onClick={toggleGame}
            className={`px-3 py-1 text-xs rounded-sm border font-display tracking-wider transition-colors ${
              state.running ? 'border-regime bg-regime/10 text-regime' : 'border-success bg-success/10 text-success-foreground'
            }`}>{state.running ? '■ PAUSE' : '▶ RUN'}</button>
          <button onClick={resetGame} className="px-3 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:border-primary/30 font-display tracking-wider">↺</button>
          <button onClick={() => setShowTutorial(true)}
            className="px-3 py-1 text-xs rounded-sm border border-primary/40 text-primary/60 hover:border-primary hover:text-primary font-display tracking-wider transition-colors">
            ? HELP
          </button>

        </div>
      </header>

      {/* Tutorial Overlay */}
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}

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

      <div className="grid grid-cols-[280px_1fr_280px] gap-2 p-2" style={{ height: 'calc(100vh - 48px)' }}>
        {/* COALITION SIDE */}
        <div className="overflow-y-auto pr-1 text-[11px]" data-tutorial="tutorial-coalition-side">
          <div className="sticky top-0 z-10 space-y-2 pb-2">
            <Panel title="HAND FREE" side="coalition">
              <div className="text-center mb-2">
                <span className={`text-2xl font-display tracking-widest ${state.coalition.handFree < 20 ? 'text-danger' : state.coalition.handFree < 50 ? 'text-warning' : 'text-coalition'}`}>
                  {Math.round(state.coalition.handFree)}
                </span>
                <span className="text-muted-foreground text-[10px] ml-1">/ 100</span>
              </div>
              <Bar value={state.coalition.economy} max={100} color="bg-coalition" label="Economy" showDerivative={state.coalition.economyDerivative} />
              <Bar value={state.coalition.publicSupport} max={100} color="bg-coalition" label="Public Support" showDerivative={state.coalition.publicSupportDerivative} />
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Stat label="Debt $" value={state.coalition.debt} color="text-danger" small />
                <Stat label="Cost/t" value={Math.round(state.coalition.maintenanceCost / 10)} color="text-warning" small />
                <Stat label="Intercept" value={`${interceptionPct}%`} color={interceptionPct > 80 ? 'text-success' : interceptionPct > 50 ? 'text-warning' : 'text-danger'} small />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Stat label="Income/t" value={state.coalition.incomePerTick} small />
                <div className="flex flex-col gap-0.5">
                  <span className="stat-label">Intercptrs</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-coalition">{state.coalition.interceptorStock}/{state.coalition.interceptorMax}</span>
                    {state.coalition.interceptorStock < state.coalition.interceptorMax && (
                      <div className="flex-1 h-1.5 bg-secondary rounded overflow-hidden">
                        <div className="h-full bg-coalition transition-all" style={{ width: `${(state.coalition.interceptorRechargeTimer / (balance.coalition.initial.interceptorRechargeTime || 1)) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
                <Stat label="On Patrol" value={state.coalition.flyingFighters.filter(f => f.state === 'patrol').length} small />
              </div>
              {state.coalition.fearBusinessActive && (
                <div className="mt-1 text-[9px] text-warning animate-pulse">⚡ FEAR BUSINESS — {state.coalition.fearBusinessTimer}t remaining</div>
              )}
            </Panel>
          </div>

          <div className="space-y-2">
            <Panel title="STOCKPILE" side="coalition">
              <StockDisplay label="Strikes" stock={state.coalition.strikeStock.stock} producing={state.coalition.strikeStock.producing}
                progress={state.coalition.strikeStock.productionProgress} time={effectiveStrikeTime} side="coalition" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleAction(buyStrike)} disabled={!canPlayCoalition} side="coalition" className="flex-1">{`Order +$${auto.strikeOrderDebt.toLocaleString()} debt`}</ActionBtn>
                <ToggleBtn active={state.coalition.strikeStock.autoBuy} onClick={() => canPlayCoalition && toggleAutoBuy('coalition', 'strike')} label="Auto" side="coalition" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleStrike(1)} disabled={!canPlayCoalition || state.coalition.strikeStock.stock < 1} side="coalition" className="flex-1">⚡ Fire ×1</ActionBtn>
                <ActionBtn onClick={() => handleStrike(5)} disabled={!canPlayCoalition || state.coalition.strikeStock.stock < 5} side="coalition" className="flex-1">×5</ActionBtn>
                <ToggleBtn active={state.coalition.strikeStock.autoLaunch} onClick={() => canPlayCoalition && toggleAutoLaunch('coalition', 'strike')} label="Auto" side="coalition" />
              </div>

              <div className="border-t border-border mt-2 pt-2" />
              <StockDisplay label="Fighters" stock={state.coalition.fighterStock.stock} producing={state.coalition.fighterStock.producing}
                progress={state.coalition.fighterStock.productionProgress} time={effectiveFighterTime} side="coalition" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleAction(buyFighter)} disabled={!canPlayCoalition} side="coalition" className="flex-1">{`Order +$${auto.fighterOrderDebt.toLocaleString()} debt`}</ActionBtn>
                <ToggleBtn active={state.coalition.fighterStock.autoBuy} onClick={() => canPlayCoalition && toggleAutoBuy('coalition', 'fighter')} label="Auto" side="coalition" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleFighters(2)} disabled={!canPlayCoalition || state.coalition.fighterStock.stock < 2} side="coalition" className="flex-1">🚁 Patrol ×2</ActionBtn>
                <ActionBtn onClick={() => handleFighters(5)} disabled={!canPlayCoalition || state.coalition.fighterStock.stock < 5} side="coalition" className="flex-1">×5</ActionBtn>
                <ToggleBtn active={state.coalition.fighterStock.autoLaunch} onClick={() => canPlayCoalition && toggleAutoLaunch('coalition', 'fighter')} label="Auto" side="coalition" />
              </div>

              {state.coalition.flyingFighters.length > 0 && (
                <div className="mt-2 text-[10px] space-y-1 border-t border-border/30 pt-2 font-pixel">
                  <div className="flex justify-between">
                    <span className="text-coalition">ACTIVE PATROL:</span>
                    <span>{state.coalition.flyingFighters.filter(f => f.state === 'patrol').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warning">RETURNING:</span>
                    <span>{state.coalition.flyingFighters.filter(f => f.state === 'returning').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RELOADING:</span>
                    <span>{state.coalition.flyingFighters.filter(f => f.state === 'reloading').length}</span>
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="ECONOMIC & INTEL" side="coalition">
              <div className="space-y-1">
              <ActionBtn onClick={() => handleAction(issueBonds)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                {`📜 Treasury Bonds — +$${bonds.debtAmount.toLocaleString()} debt, +${bonds.incomePerTick} income/t, +${bonds.economyBoost} economy`}
              </ActionBtn>
              <ActionBtn onClick={() => handleAction(publicTax)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                <span>
                  {`💰 Public Tax — −$${tax.debtReduction.toLocaleString()} debt, `}
                  <span className="text-danger">−{tax.publicSupportLoss} support</span>
                  {`, +eco deriv (perm ×${state.coalition.publicTaxLevel})`}
                </span>
              </ActionBtn>
              <ActionBtn onClick={handleScan} disabled={!canPlayCoalition || !state.coalition.scanAvailable || state.coalition.scanActive || state.regime.radarLockdownActive} side="coalition" className="w-full">
                {state.coalition.scanActive ? `🔍 SCANNING... ${state.coalition.scanTimer}t` 
                  : state.regime.radarLockdownActive ? '🔍 JAMMED'
                  : `🔍 Scan — +$${scanCost} debt`}
              </ActionBtn>
              {state.coalition.scanConsecutiveCount > 0 && !state.coalition.scanActive && (
                <div className="text-[9px] text-muted-foreground">Chain ×{state.coalition.scanConsecutiveCount} — cost escalating</div>
              )}
              {state.coalition.fearBusinessAvailable && (
                <ActionBtn onClick={() => handleAction(activateFearBusiness)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                  {`💀 FEAR BUSINESS — sell stocks ×${fear.salePriceMultiplier}, +${fear.economyBoost} eco, ×${fear.fearMultiplier} scan bonus ${fear.activeTicks}t`}
                </ActionBtn>
              )}
                {state.coalition.fearBusinessActive && (
                  <div className="text-[9px] text-warning">⚡ Fear Business active — {state.coalition.fearBusinessTimer}t</div>
                )}
              </div>
            </Panel>

            <Panel title="COALITION COMMAND" side="coalition" className="relative">
              {(state.role === 'regime' || state.role === 'observer' || state.role === 'both') && <AIPanelBadge side="coalition" />}
              {/* AI Researching Banner */}
              {(state.role === 'regime' || state.role === 'observer' || state.role === 'both') && upgrades.find(u => u.side === 'coalition' && state.upgrades[u.id]?.researching) && (
                <div className="text-[10px] text-coalition font-mono animate-pulse mb-2 border border-coalition/30 bg-coalition/10 px-2 py-1 rounded">
                  🔬 AI RESEARCHING: {upgrades.find(u => u.side === 'coalition' && state.upgrades[u.id]?.researching)?.name}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Stat label="Patriots" value={state.coalition.patriots} small />
                <Stat label="Miniguns" value={state.coalition.miniguns} small />
                <Stat label="Radar" value={state.coalition.radarSpots} small />
              </div>
              <div className="space-y-1">
                <ActionBtn onClick={() => handleAction(buyPatriot)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                  🛡 Patriot +${state.coalition.patriotCost.toLocaleString()} debt
                </ActionBtn>
                <ActionBtn onClick={() => handleAction(buyMinigun)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                  🔫 Minigun +${state.coalition.minigunCost} debt
                </ActionBtn>
                <ActionBtn onClick={() => handleAction(buildRadar)} disabled={!canPlayCoalition} side="coalition" className="w-full">
                  📡 Radar +${state.coalition.radarSpotCost.toLocaleString()} debt — extends fog
                </ActionBtn>
              </div>
            </Panel>

            <div data-tutorial="tutorial-doctrines">
            <Panel title="DOCTRINE" side="coalition">
              {/* Doctrine Tabs */}
              <div className="flex gap-1 mb-2 border-b border-border/30 pb-2">
                {coalitionBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setActiveCoalitionDoctrine(branch)}
                    className={`flex-1 py-1 text-[9px] font-display tracking-wider transition-all rounded ${
                      activeCoalitionDoctrine === branch 
                        ? 'bg-coalition/20 text-coalition border border-coalition/40 font-bold' 
                        : 'bg-secondary/10 text-muted-foreground border border-transparent hover:bg-secondary/20'
                    }`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {coalitionUpgrades
                  .filter(u => u.branch === activeCoalitionDoctrine)
                  .sort((a, b) => {
                    const lvlA = state.upgrades[a.id]?.level || 0;
                    const lvlB = state.upgrades[b.id]?.level || 0;
                    if (lvlA > 0 && lvlB === 0) return -1;
                    if (lvlB > 0 && lvlA === 0) return 1;
                    return a.tier - b.tier;
                  })
                  .map(u => (
                    <ResearchButton key={u.id} upgradeId={u.id} state={state} balance={balance} upgrades={upgrades} onResearch={handleResearch} side="coalition" disabled={!canPlayCoalition} />
                  ))}
              </div>
            </Panel>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col gap-2 min-h-0">
          <Panel title="BATTLEFIELD" className="flex-1 min-h-0">
            <div className="h-full" data-tutorial="tutorial-battlefield" style={{ minHeight: 300 }}>
              <Battlefield 
            ref={battlefieldRef} 
            state={state} 
            onImpact={handleVisualImpact}
            onIntercept={handleVisualIntercept}
          />
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
                  <span className="text-muted-foreground">Interception Rate</span>
                  <span className={interceptionPct > 80 ? 'text-success' : interceptionPct > 50 ? 'text-warning' : 'text-danger'}>{interceptionPct}%</span>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fog of War</span>
                  <span>{Math.round(state.coalition.fogOfWarLimit * 100)}% visible</span>
                </div>
                {state.regime.radarLockdownActive && (
                  <div className="text-danger animate-pulse">📡 RADAR JAMMED — {state.regime.radarLockdownTimer}t</div>
                )}
              </div>
            </Panel>
            <Panel title="COMBAT LOG" className="flex flex-col overflow-hidden h-[140px] shrink-0">
              {/* Satirical Pixel Announcements */}
              <div className="flex flex-col gap-2 mb-2 pointer-events-none min-h-[40px] justify-end shrink-0">
                {announcements.map(ann => (
                  <div key={ann.id} className="pixel-popup text-primary border-primary/50">
                    {ann.text}
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                <CombatFeed logs={state.combatLog} />
              </div>
            </Panel>
          </div>
        </div>

        {/* REGIME SIDE */}
        <div className="overflow-y-auto pl-1 text-[11px]" data-tutorial="tutorial-regime-side">
          <div className="sticky top-0 z-10 space-y-2 pb-2">
            <Panel title="REGIME COMMAND" side="regime" className="relative">
              {(state.role === 'coalition' || state.role === 'observer' || state.role === 'both') && <AIPanelBadge side="regime" />}
              {/* AI Researching Banner */}
              {(state.role === 'coalition' || state.role === 'observer' || state.role === 'both') && upgrades.find(u => u.side === 'regime' && state.upgrades[u.id]?.researching) && (
                <div className="text-[10px] text-regime font-mono animate-pulse mb-2 border border-regime/30 bg-regime/10 px-2 py-1 rounded">
                  🧪 AI RESEARCHING: {upgrades.find(u => u.side === 'regime' && state.upgrades[u.id]?.researching)?.name}
                </div>
              )}
              <div className="text-center mb-2" data-tutorial="tutorial-resilience">
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
          </div>

          <div className="space-y-2">
            <Panel title="STOCKPILE" side="regime">
              <StockDisplay label="Drones" stock={state.regime.droneStock.stock} producing={state.regime.droneStock.producing}
                progress={state.regime.droneStock.productionProgress} time={state.regime.droneStock.productionTime} side="regime" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleBuyDrones(1)} disabled={!canPlayRegime || state.regime.money < effectiveDroneCost} side="regime" className="flex-1">
                  Instant ×1 ◆{effectiveDroneCost}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuyDrones(5)} disabled={!canPlayRegime || state.regime.money < effectiveDroneCost * 5} side="regime" className="flex-1">
                  ×5
                </ActionBtn>
                <ActionBtn onClick={() => handleBuyDrones(20)} disabled={!canPlayRegime || state.regime.money < effectiveDroneCost * 20} side="regime" className="flex-1">×20</ActionBtn>
                <ToggleBtn active={state.regime.droneStock.autoBuy} onClick={() => canPlayRegime && toggleAutoBuy('regime', 'drone')} label="Auto" side="regime" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchDrones(1)} disabled={!canPlayRegime || state.regime.droneStock.stock < 1} side="regime" className="flex-1">
                  🛩 ×1
                </ActionBtn>
                <ActionBtn onClick={() => handleLaunchDrones(5)} disabled={!canPlayRegime || state.regime.droneStock.stock < 5} side="regime" className="flex-1">×5</ActionBtn>
                <ActionBtn onClick={() => handleLaunchDrones(20)} disabled={!canPlayRegime || state.regime.droneStock.stock < 20} side="regime" className="flex-1">×20</ActionBtn>
                <ToggleBtn active={state.regime.droneStock.autoLaunch} onClick={() => canPlayRegime && toggleAutoLaunch('regime', 'drone')} label="Auto" side="regime" />
              </div>

              <div className="border-t border-border mt-2 pt-2" />
              <StockDisplay label="Missiles" stock={state.regime.missileStock.stock} producing={state.regime.missileStock.producing}
                progress={state.regime.missileStock.productionProgress} time={state.regime.missileStock.productionTime} side="regime" />
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleBuyMissiles(1)} disabled={!canPlayRegime || state.regime.money < effectiveMissileCost} side="regime" className="flex-1">
                  Instant ×1 ◆{effectiveMissileCost}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuyMissiles(3)} disabled={!canPlayRegime || state.regime.money < effectiveMissileCost * 3} side="regime" className="flex-1">×3</ActionBtn>
                <ActionBtn onClick={() => handleBuyMissiles(10)} disabled={!canPlayRegime || state.regime.money < effectiveMissileCost * 10} side="regime" className="flex-1">×10</ActionBtn>
                <ToggleBtn active={state.regime.missileStock.autoBuy} onClick={() => canPlayRegime && toggleAutoBuy('regime', 'missile')} label="Auto" side="regime" />
              </div>
              <div className="flex gap-1 mt-1">
                <ActionBtn onClick={() => handleLaunchMissiles(1)} disabled={!canPlayRegime || state.regime.missileStock.stock < 1} side="regime" className="flex-1">
                  🚀 ×1
                </ActionBtn>
                <ActionBtn onClick={() => handleLaunchMissiles(2)} disabled={!canPlayRegime || state.regime.missileStock.stock < 2} side="regime" className="flex-1">×2</ActionBtn>
                <ActionBtn onClick={() => handleLaunchMissiles(10)} disabled={!canPlayRegime || state.regime.missileStock.stock < 10} side="regime" className="flex-1">×10</ActionBtn>
                <ToggleBtn active={state.regime.missileStock.autoLaunch} onClick={() => canPlayRegime && toggleAutoLaunch('regime', 'missile')} label="Auto" side="regime" />
              </div>
            </Panel>

            <Panel title="CONSTRUCTION" side="regime">
              <div className="space-y-1">
                <ActionBtn onClick={() => handleBuildBase('military')} disabled={!canPlayRegime || state.regime.money < state.regime.baseCost} side="regime" className="w-full">
                  🏗 Military Base ◆{state.regime.baseCost}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuildBase('civilian')} disabled={!canPlayRegime || state.regime.money < state.regime.baseCost * rb.civilianCostMultiplier} side="regime" className="w-full">
                  🏘 Civilian Base ◆{Math.round(state.regime.baseCost * rb.civilianCostMultiplier)}
                </ActionBtn>
                <ActionBtn onClick={() => handleBuildBase('fake')} disabled={!canPlayRegime || state.regime.money < state.regime.baseCost * rb.fakeCostMultiplier} side="regime" className="w-full">
                  🎭 Fake Base ◆{Math.round(state.regime.baseCost * rb.fakeCostMultiplier)}
                </ActionBtn>
              </div>
                {/* Build queue */}
                {state.regime.baseBuildQueue.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {state.regime.baseBuildQueue.map((bq, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span>🔨 {bq.type}</span>
                        <div className="flex-1 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-regime transition-all" style={{ width: `${((bq.buildTime - bq.timer) / bq.buildTime) * 100}%` }} />
                        </div>
                        <span>{bq.timer}t</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 border-t border-border pt-2">
                  <div className="text-[9px] text-muted-foreground mb-1">BURY BASES (+fervor, hide from strikes)</div>
                  <div className="space-y-1">
                    {[1, 2, 3].map(lvl => {
                      const eligibleCount = aliveBases.filter(b => b.burialLevel === lvl - 1).length;
                      const tunnelDiscount = 1 - (state.upgrades.r_tunnel_network?.level ?? 0) * buryCfg.tunnelDiscountPerLevel;
                      const buryCost = Math.round((buryCfg.baseCost + (lvl - 1) * buryCfg.costPerBurialLevel) * tunnelDiscount);
                      return (
                        <ActionBtn key={lvl} onClick={() => canPlayRegime && handleBuryByLevel(lvl)}
                          disabled={!canPlayRegime || eligibleCount === 0 || state.regime.money < buryCost} side="regime" className="w-full">
                          ⛏ Bury Lv{lvl} ◆{buryCost} <span className="text-muted-foreground">({eligibleCount} eligible)</span>
                        </ActionBtn>
                      );
                    })}
                  </div>
                </div>
            </Panel>

            <Panel title="SPECIAL OPS" side="regime">
                <div className="space-y-1">
                  <ActionBtn onClick={handleOilShipping} disabled={!canPlayRegime || state.regime.money < oilShipCost} side="regime" className="w-full">
                    🛢 Oil Shipping ◆{oilShipCost}
                  </ActionBtn>
                  <ActionBtn onClick={handleKamikazeMine} disabled={!canPlayRegime || state.regime.money < state.regime.kamikazeMineCost} side="regime" className="w-full">
                    💣 Kamikaze Mine ◆{state.regime.kamikazeMineCost} <span className="text-warning">−fervor</span>
                  </ActionBtn>
                  <ActionBtn onClick={handleRadarLockdown} disabled={!canPlayRegime || !state.regime.radarLockdownAvailable} side="regime" className="w-full">
                    {state.regime.radarLockdownActive ? `📡 JAMMING... ${state.regime.radarLockdownTimer}t`
                      : state.regime.radarLockdownAvailable ? `📡 Radar Lockdown (${rl.activeTicks}t jam, ${rl.cooldownTicks}t cycle)` 
                      : `📡 Cooldown ${state.regime.radarLockdownCooldown}t`}
                  </ActionBtn>
                </div>
              </Panel>

            <Panel title="DOCTRINE" side="regime">
                {/* Doctrine Tabs */}
                <div className="flex gap-1 mb-2 border-b border-border/30 pb-2">
                  {regimeBranches.map(branch => (
                    <button
                      key={branch}
                      onClick={() => setActiveRegimeDoctrine(branch)}
                      className={`flex-1 py-1 text-[9px] font-display tracking-wider transition-all rounded ${
                        activeRegimeDoctrine === branch 
                          ? 'bg-regime/20 text-regime border border-regime/40 font-bold' 
                          : 'bg-secondary/10 text-muted-foreground border border-transparent hover:bg-secondary/20'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {regimeUpgrades
                    .filter(u => u.branch === activeRegimeDoctrine)
                    .sort((a, b) => {
                      const lvlA = state.upgrades[a.id]?.level || 0;
                      const lvlB = state.upgrades[b.id]?.level || 0;
                      if (lvlA > 0 && lvlB === 0) return -1;
                      if (lvlB > 0 && lvlA === 0) return 1;
                      return a.tier - b.tier;
                    })
                    .map(u => (
                      <ResearchButton 
                        key={u.id} 
                        upgradeId={u.id} 
                        state={state} 
                        balance={balance} 
                        upgrades={upgrades} 
                        onResearch={handleResearch} 
                        side="regime" 
                        disabled={!canPlayRegime}
                      />
                    ))}
                </div>
              </Panel>
          </div>
        </div>
      </div>

      {state.gameOver && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-4xl w-full bg-card border-2 border-primary/40 p-8 shadow-2xl flex flex-col gap-6 font-mono text-[11px] text-foreground">
            <header className="text-center space-y-4 border-b border-border/50 pb-6">
              <h1 className="text-4xl md:text-5xl font-display tracking-[0.2em] uppercase" style={{ color: state.winner === 'coalition' ? '#3b82f6' : state.winner === 'regime' ? '#ef4444' : '#ffbf00' }}>
                {state.winner === 'coalition' ? 'COALITION VICTORY' : state.winner === 'regime' ? 'REGIME VICTORY' : 'CEASEFIRE'}
              </h1>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">{state.winReason}</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8 mt-4">
              {/* COALITION STATS */}
              <div className="space-y-4">
                <h2 className="text-lg font-display text-coalition text-center border-b border-coalition/30 pb-2">COALITION REPORT</h2>
                
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-xs"><span className="text-muted-foreground">TOTAL BUDGET SPENT</span><span className="text-danger">◆{Math.round(state.coalition.totalDebtAccumulated).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Strikes Launched</span><span>{state.coalition.totalStrikes}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fighters Launched</span><span>{state.coalition.totalFightersLaunched}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Patriot Interceptors Fired</span><span>{state.coalition.totalPatriotShots}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Minigun Bullets Fired</span><span>{state.coalition.totalMinigunBullets}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bases Destroyed</span><span className="text-success">{state.coalition.successfulStrikes}</span></div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-coalition font-bold mt-4 mb-2">UPGRADES UNLOCKED</h3>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(state.upgrades).filter(([id, u]) => u.level > 0 && id.startsWith('c_')).map(([id, u]) => (
                       <span key={id} className="bg-coalition/10 text-coalition px-2 py-0.5 rounded text-[9px]">{upgrades.find(up => up.id === id)?.name} (Lv{u.level})</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* REGIME STATS */}
              <div className="space-y-4">
                <h2 className="text-lg font-display text-regime text-center border-b border-regime/30 pb-2">REGIME REPORT</h2>
                
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-xs"><span className="text-muted-foreground">TOTAL BUDGET SPENT</span><span className="text-danger">◆{Math.round(state.regime.totalMoneySpent).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Drones Launched</span><span>{state.regime.totalDronesLaunched}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Missiles Launched</span><span>{state.regime.totalMissilesLaunched}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Drones Impacted</span><span className="text-success">{state.regime.totalDroneImpacts}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Missiles Impacted</span><span className="text-success">{state.regime.totalMissileImpacts}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bases Built</span><span>{state.regime.totalBasesBuilt}</span></div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-regime font-bold mt-4 mb-2">UPGRADES UNLOCKED</h3>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(state.upgrades).filter(([id, u]) => u.level > 0 && id.startsWith('r_')).map(([id, u]) => (
                       <span key={id} className="bg-regime/10 text-regime px-2 py-0.5 rounded text-[9px]">{upgrades.find(up => up.id === id)?.name} (Lv{u.level})</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center space-y-6">
              <h2 className="text-xl md:text-2xl font-display text-primary tracking-widest animate-pulse border-y border-primary/30 py-4">
                LA GUERRE, IL FAUT Y JOUER POUR PAS LA FAIRE !
              </h2>
              <button 
                onClick={resetGame}
                className="px-8 py-3 bg-primary/20 border-2 border-primary text-primary font-bold hover:bg-primary hover:text-black transition-all"
              >
                RETURN TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center">
          <BalancePanel
            balance={balance}
            scenarios={scenarios}
            onScenariosChange={setScenarios}
            onChange={(next) => setBalance(next)}
            onRestart={async (next) => {
              await saveBalanceToStorage(next);
              const b = await loadMergedBalance();
              setBalance(b);
              setState(createInitialState(b));
              setGameStarted(false);
              setShowIntro(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
