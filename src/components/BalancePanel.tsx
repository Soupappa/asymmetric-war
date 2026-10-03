import React, { useCallback, useMemo, useState } from 'react';
import type { BalanceConfig } from '@/game/balance';
import { DEFAULT_BALANCE, cloneBalance, mergeBalance } from '@/game/balance';
import { clearBalanceStorage, loadPresets, savePreset, deletePreset } from '@/game/balanceStorage';
import { saveScenarioOverride, getScenarioOverrides, clearScenarioOverride, getDefaultConfig, Scenario, saveScenarios } from '@/game/scenarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Path = string;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function getAt(obj: unknown, path: Path): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAt<T extends object>(obj: T, path: Path, value: number): T {
  const parts = path.split('.');
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = cur[p];
    if (!isPlainObject(next)) {
      cur[p] = {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as T;
}

function collectNumberPaths(obj: unknown, prefix = ''): Path[] {
  if (!isPlainObject(obj)) return [];
  const paths: Path[] = [];
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof v === 'number' && Number.isFinite(v)) {
      paths.push(p);
    } else if (isPlainObject(v)) {
      paths.push(...collectNumberPaths(v, p));
    }
  }
  return paths;
}

interface BalancePanelProps {
  balance: BalanceConfig;
  onChange: (next: BalanceConfig) => void;
  onRestart?: (next: BalanceConfig) => void;
  className?: string;
  currentScenarioId?: string | null;
  scenarios: Scenario[];
  onScenariosChange: (s: Scenario[]) => void;
}

const BALANCE_DESCRIPTIONS: Record<string, string> = {
  'coalition.initial.interceptorRechargeTime': "Temps global pour qu'un Patriot soit prêt à tirer un nouvel intercepteur (ticks).",
  'coalition.initial.interceptorStock': "Réserve initiale d'intercepteurs. Affecte la capacité de rafales.",
  'coalition.initial.strikeProductionTime': "Temps nécessaire (en ticks) pour produire une Frappe.",
  'coalition.initial.fogOfWarLimit': "Position de la zone d'ombre 'Brouillard' au début du jeu (ex: 0.48).",
  'regime.initial.droneCost': "Coût de base pour commander 1 Drone (◆).",
  'regime.initial.missileCost': "Coût de base pour commander 1 Missile (◆).",
  'regime.initial.baseCost': "Prix minimal pour la construction d'une base (militaire).",
  'regime.radarLockdown.activeTicks': "Temps durant lequel la Coalition ne peut plus scanner.",
  'coalition.fog.radarSpotVisibilityPerSpot': "Pourcentage de recul du brouillard pour chaque Radar posé.",
  'simulation.combat.unscannedCivilianSupportLoss': "Baisse de soutien public si on détruit une base civile non identifiée (bavure).",
  'simulation.combat.missileImpactSupportMultiplier': "Multiplicateur de panique lorsqu'un missile touche la Coalition.",
  'simulation.combat.autoLaunchMaxDrones': "Nb maximum de drones envoyés automatiquement à la fois par l'auto-fire.",
  'coalition.initial.minigunFireRate': "Cadence de tir du minigun (balles par tick). Plus c'est bas, moins il est efficace.",
  'coalition.initial.minigunProjectileSpeed': "Vitesse physique des projectiles du minigun. Affecte le visuel de la file de pixels.",
  'simulation.combat.patriotBackupRange': "Portée à laquelle les Patriots tirent en dernier recours sur les drones (0.0 - 1.0)."
};

function getExplanation(path: string): string | undefined {
  if (BALANCE_DESCRIPTIONS[path]) return BALANCE_DESCRIPTIONS[path];
  const key = path.split('.').pop() || '';
  if (key === 'fervor') return "Niveau de ferveur/fanatisme (rend les armes moins chères).";
  if (key === 'dispersion') return "Dispersion des cellules du Régime.";
  if (key === 'resilience') return "Résistance (HP globaux) du Régime. À 0, le Régime meurt.";
  if (key === 'publicSupport') return "Soutien populaire envers la Coalition.";
  if (key === 'handFree') return "Marge de manœuvre politique (capacité à l'action libre).";
  if (key.includes('Cost')) return "Prix (en Dette ou Argent).";
  if (key.includes('ProductionTime')) return "Temps de construction dans les usines.";
  return undefined;
}

function BalanceField({ path, val, onChange, isStarred, onToggleStar }: { path: Path; val: number; onChange: (path: Path, val: number) => void; isStarred: boolean; onToggleStar: (path: Path) => void }) {
  const [text, setText] = React.useState(Number.isFinite(val) ? val.toString() : '0');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      setText(Number.isFinite(val) ? val.toString() : '0');
    }
  }, [val, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    const n = parseFloat(e.target.value);
    if (!Number.isNaN(n)) {
      onChange(path, n);
    }
  };

  const sliderMax = Math.max(1, Math.abs(val) * 4, 100);
  const showSlider = val >= 0 && val <= sliderMax && sliderMax <= 500000;

  return (
    <div className={cn("flex flex-col gap-0.5 p-1 -m-1 rounded transition-colors", isStarred ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent/30')}>
      <div className="flex items-center justify-between">
        <span className={cn("font-mono break-all text-[9px]", isStarred ? 'text-primary font-semibold' : 'text-muted-foreground')}>{path}</span>
        <button type="button" onClick={() => onToggleStar(path)} className={cn("text-[10px]", isStarred ? 'text-primary' : 'text-muted-foreground opacity-30 hover:opacity-100')}>
          {isStarred ? '★' : '☆'}
        </button>
      </div>
      {getExplanation(path) && (
        <div className="text-[9px] text-muted-foreground/60 italic leading-tight pt-0.5 pb-1 pr-4">
          {getExplanation(path)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="any"
          className="h-7 text-[10px] font-mono w-28 shrink-0"
          value={text}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showSlider && (
          <input
            type="range"
            className="flex-1 min-w-[80px]"
            min={0}
            max={sliderMax}
            step={sliderMax > 200 ? 1 : 0.01}
            value={val}
            onChange={(e) => onChange(path, parseFloat(e.target.value))}
          />
        )}
      </div>
    </div>
  );
}

export default function BalancePanel({ balance, onChange, onRestart, className, currentScenarioId, scenarios, onScenariosChange }: BalancePanelProps) {
  const [openParams, setOpenParams] = useState(false);
  const [openScenarios, setOpenScenarios] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [presets, setPresets] = useState<Record<string, Partial<BalanceConfig>>>({});
  const [scenarioOverrides, setScenarioOverrides] = useState<Record<string, Partial<BalanceConfig>>>({});
  const paths = useMemo(() => collectNumberPaths(balance), [balance]);

  React.useEffect(() => {
    loadPresets().then(setPresets);
    getScenarioOverrides().then(setScenarioOverrides);
  }, []);

  const [starredPaths, setStarredPaths] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('asymmetric-war-starred');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const toggleStar = useCallback((path: Path) => {
    setStarredPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      try { localStorage.setItem('asymmetric-war-starred', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, []);

  const sortedPaths = useMemo(() => {
    let filtered = paths;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = paths.filter(p => p.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      const aStar = starredPaths.has(a);
      const bStar = starredPaths.has(b);
      if (aStar && !bStar) return -1;
      if (!aStar && bStar) return 1;
      return 0; // maintain original grouping structure for unstarred items
    });
  }, [paths, starredPaths, searchQuery]);

  const handleSaveScenarioOverride = useCallback(async (scenarioId: string) => {
    await saveScenarioOverride(scenarioId, balance);
    setScenarioOverrides(await getScenarioOverrides());
  }, [balance]);

  const handleClearScenarioOverride = useCallback(async (scenarioId: string) => {
    await clearScenarioOverride(scenarioId);
    setScenarioOverrides(await getScenarioOverrides());
  }, []);

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim()) return;
    const newScen: Scenario = {
      id: newScenarioName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
      name: newScenarioName.trim(),
      description: 'Custom scenario based on current configuration.',
      difficulty: 'Normal',
      icon: '⚙️',
      coalitionStrength: 'Custom',
      regimeStrength: 'Custom',
      config: JSON.parse(JSON.stringify(balance)), // Snapshot current state
    };
    const next = [...scenarios, newScen];
    onScenariosChange(next);
    await saveScenarios(next);
    setNewScenarioName('');
  };

  const handleDeleteScenario = async (id: string) => {
    const next = scenarios.filter(s => s.id !== id);
    onScenariosChange(next);
    await saveScenarios(next);
    await clearScenarioOverride(id);
    setScenarioOverrides(await getScenarioOverrides());
  };

  const handleNumber = useCallback(
    (path: Path, n: number) => {
      if (Number.isNaN(n)) return;
      onChange(setAt(balance, path, n));
    },
    [balance, onChange],
  );

  const reset = useCallback(() => {
    onChange(cloneBalance(DEFAULT_BALANCE));
  }, [onChange]);

  const clearStorageAndReload = useCallback(() => {
    clearBalanceStorage();
    window.location.reload();
  }, []);

  const exportJson = useCallback((data: BalanceConfig | Partial<BalanceConfig>, name: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-preset-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'default'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={cn('flex flex-col gap-2 items-center', className)}>
      {/* Control Bar */}
      <div className="flex gap-2 bg-card/95 backdrop-blur-sm border border-border p-1.5 rounded shadow-lg pointer-events-auto">
        <Button 
          variant={openParams ? "default" : "outline"} 
          size="sm" 
          onClick={() => setOpenParams(!openParams)}
          className="text-[10px] h-7"
        >
          ⚙️ Params
        </Button>
        <Button 
          variant={openScenarios ? "default" : "outline"} 
          size="sm" 
          onClick={() => setOpenScenarios(!openScenarios)}
          className="text-[10px] h-7"
        >
          📁 Scenarios & Presets
        </Button>
        {onRestart && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => onRestart(balance)}
            className="text-[10px] h-7 font-bold text-primary border-primary/50 hover:bg-primary/20 shadow-[0_0_10px_rgba(255,191,0,0.2)]"
          >
            ▶ Inject & Restart
          </Button>
        )}
      </div>

      {/* Columns Container */}
      <div className="flex gap-4 items-start pointer-events-none justify-center max-w-[90vw]">
        
        {/* Scenarios & Presets Column */}
        {openScenarios && (
          <div className="w-[350px] pointer-events-auto bg-card/95 backdrop-blur-sm border border-border rounded shadow-xl p-3 flex flex-col gap-3 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
            {/* Scenarios UI */}
            <div className="space-y-1 mb-2 pb-3 border-b border-border/50">
              <span className="text-[9px] text-primary font-bold uppercase tracking-tight ml-1">Scenarios</span>
              <div className="flex gap-2 items-center mt-2">
                <Input type="text" placeholder="New scenario name..." className="h-7 text-[10px] flex-1" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} />
                <Button type="button" size="sm" className="text-[10px] h-7 shrink-0" onClick={handleCreateScenario}>Create</Button>
              </div>
              <div className="flex flex-col gap-1 mt-2 bg-black/20 rounded p-1.5 max-h-[250px] overflow-y-auto scrollbar-thin">
                {scenarios.map((scenario) => {
                  const isActive = currentScenarioId === scenario.id || (currentScenarioId === null && scenario.id === 'default_skirmish');
                  const hasOverride = !!scenarioOverrides[scenario.id];
                  return (
                    <div key={scenario.id} className={cn("flex justify-between items-center px-2 py-1.5 rounded", isActive ? "bg-primary/20 border border-primary/30" : "bg-secondary/30 hover:bg-secondary/50")}>
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono truncate" title={scenario.name}>{scenario.name}</span>
                          {isActive && <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded uppercase shrink-0">Active</span>}
                        </div>
                        {hasOverride && <span className="text-[8px] text-muted-foreground">Custom override saved</span>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button type="button" variant="outline" size="sm" className="text-[9px] h-6 px-2" onClick={async () => onChange(await getDefaultConfig(DEFAULT_BALANCE, scenario.id))}>Load</Button>
                        <Button type="button" variant="secondary" size="sm" className="text-[9px] h-6 px-2" onClick={() => handleSaveScenarioOverride(scenario.id)}>Save</Button>
                        {hasOverride && (
                          <Button type="button" variant="ghost" size="sm" className="text-[9px] h-6 px-2 text-warning" onClick={() => handleClearScenarioOverride(scenario.id)}>Clear</Button>
                        )}
                        <Button type="button" variant="destructive" size="sm" className="text-[9px] h-6 px-2" onClick={() => handleDeleteScenario(scenario.id)}>Del</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preset UI */}
            <div className="space-y-1">
              <span className="text-[9px] text-primary font-bold uppercase tracking-tight ml-1">My Presets</span>
              <div className="flex gap-2 items-center mt-2">
                <Input type="text" placeholder="Preset name..." className="h-7 text-[10px] flex-1" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                <Button type="button" size="sm" className="text-[10px] h-7 shrink-0" onClick={async () => {
                    if (!presetName.trim()) return;
                    await savePreset(presetName.trim(), balance);
                    setPresets(await loadPresets());
                    setPresetName('');
                  }}>Save Preset</Button>
              </div>
              
              {Object.keys(presets).length > 0 && (
                <div className="flex flex-col gap-1 mt-2 bg-black/20 rounded p-1.5">
                  {Object.keys(presets).map((name) => (
                    <div key={name} className="flex justify-between items-center bg-secondary/30 px-2 py-1.5 rounded hover:bg-secondary/50">
                      <span className="text-[10px] font-mono truncate max-w-[120px]">{name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button type="button" variant="outline" size="sm" className="text-[9px] h-6 px-2" onClick={() => {
                            const p = presets[name];
                            if (p) onChange(mergeBalance(DEFAULT_BALANCE, p));
                          }}>Load</Button>
                        <Button type="button" variant="secondary" size="sm" className="text-[9px] h-6 px-2" onClick={async () => {
                            await savePreset(name, balance);
                            setPresets(await loadPresets());
                          }}>Update</Button>
                        <Button type="button" variant="ghost" size="sm" className="text-[9px] h-6 px-2" onClick={() => {
                            const p = presets[name];
                            if (p) exportJson(p, name);
                          }}>Export</Button>
                        <Button type="button" variant="destructive" size="sm" className="text-[9px] h-6 px-2" onClick={async () => {
                            await deletePreset(name);
                            setPresets(await loadPresets());
                          }}>Del</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Params Column */}
        {openParams && (
          <div className="w-[320px] pointer-events-auto bg-card/95 backdrop-blur-sm border border-border rounded shadow-xl p-3 flex flex-col gap-3 max-h-[70vh]">
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" className="text-[9px] h-6 flex-1" onClick={reset}>Load Default</Button>
              <Button type="button" variant="destructive" size="sm" className="text-[9px] h-6 flex-1" onClick={clearStorageAndReload}>Hard Reset</Button>
              <Button type="button" variant="ghost" size="sm" className="text-[9px] h-6 flex-1" onClick={() => onChange(mergeBalance(DEFAULT_BALANCE, balance))}>Sanitize</Button>
              <Button type="button" variant="secondary" size="sm" className="text-[9px] h-6 flex-1" onClick={() => exportJson(balance, 'current_state')}>Export</Button>
            </div>
            <div className="flex gap-2">
              <Input type="text" placeholder="Search parameter..." className="h-7 text-[10px] w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
              <div className="space-y-2 pb-2">
                {sortedPaths.map((path) => {
                  const val = getAt(balance, path);
                  if (typeof val !== 'number') return null;
                  return <BalanceField key={path} path={path} val={val} onChange={handleNumber} isStarred={starredPaths.has(path)} onToggleStar={toggleStar} />;
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
