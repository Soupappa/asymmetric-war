export type PlayerRole = 'coalition' | 'regime' | 'both' | 'observer';
export type GamePhase = 'early' | 'mid' | 'late' | 'nuclear';

// === STOCK SYSTEM ===
export interface StockItem {
  stock: number;
  producing: boolean;
  productionProgress: number; // 0-1
  productionTime: number; // ticks per unit
  autoBuy: boolean;
  autoLaunch: boolean;
}

// === REGIME BASE TYPES ===
export type BaseType = 'military' | 'civilian' | 'fake';
export interface RegimeBase {
  id: string;
  type: BaseType;
  burialLevel: number; // 0-3
  scansRequired: number; // scans needed to reveal (increases with burial)
  scansReceived: number;
  revealed: boolean;
  alive: boolean;
  x: number; // battlefield position
  y: number;
}

// === UPGRADE SYSTEM ===
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costExponent: number;
  maxLevel: number;
  side: 'coalition' | 'regime';
  branch: string; // doctrine branch
  tier: number; // unlock tier within branch
  researchTime: number;
  effect: (state: GameState, level: number) => void;
}

export interface UpgradeState {
  level: number;
  researching: boolean;
  researchProgress: number;
  researchTarget: number;
}

// === REGIME STATE ===
export interface RegimeState {
  // Economy
  money: number; // reserve bar
  moneyRegen: number; // per tick
  oilShippingLevel: number; // diminishing returns
  
  // Macro bar: Resilience = (fervor/100) * (dispersion/100) * 100
  fervor: number; // 0-100, starts 25
  dispersion: number; // 0-100, starts 25
  resilience: number; // computed: fervor * dispersion / 100

  // Bases
  bases: RegimeBase[];
  baseCost: number;

  // Stocks
  droneStock: StockItem;
  missileStock: StockItem;

  // Unit costs (reduced by fervor)
  droneCost: number;
  missileCost: number;

  // Stats
  totalDronesLaunched: number;
  totalMissilesLaunched: number;
  antiAirLevel: number;

  // Kamikaze mines
  kamikazeMineCount: number;
  kamikazeMineCost: number;

  // Radar lockdown
  radarLockdownAvailable: boolean;
  radarLockdownCooldown: number;

  // Nuclear
  nuclearUnlocked: boolean;
  nuclearProgress: number; // 0-100 countdown
  nuclearBaseId: string | null;

  // Doctrine bias (adaptive)
  droneBias: number;
  missileBias: number;
}

// === COALITION STATE ===
export interface CoalitionState {
  // Economy: debt-based
  debt: number; // starts 0, grows with spending
  money: number; // current available cash (from bonds/tax/income)
  incomePerTick: number; // from treasury bonds
  debtBreakdownTolerance: number; // % of PIB before economy derivative goes negative

  // Macro bar: Hand Free = (economy/100) * (publicSupport/100) * 100
  economy: number; // 0-100, starts 100
  economyDerivative: number; // per tick change
  publicSupport: number; // 0-100, starts 100
  publicSupportDerivative: number;
  handFree: number; // computed

  // Stocks
  strikeStock: StockItem;
  fighterStock: StockItem;

  // Defense (construction-based, not stock)
  patriots: number; // heavy AA, good vs missiles
  patriotCost: number;
  miniguns: number; // cheap AA, good vs drones
  minigunCost: number;
  radarSpots: number;
  radarSpotCost: number;

  // Scan
  scanAvailable: boolean;
  scanCooldown: number;
  scanActive: boolean;
  scanTimer: number; // remaining ticks of active scan
  scanZoneX: number;
  scanZoneY: number;

  // Stats
  totalStrikes: number;
  successfulStrikes: number;
  strikePower: number;
  strikeAccuracy: number;
  intelligenceModifier: number;
  laserDefense: number;
  warCostPerSec: number;

  // Rafale bonus
  recentStrikeTimestamps: number[]; // for grouped strike bonus
}

// === COMBAT LOG ===
export interface CombatLog {
  tick: number;
  dronesLaunched: number;
  missilesLaunched: number;
  dronesIntercepted: number;
  missilesIntercepted: number;
  droneImpacts: number;
  missileImpacts: number;
  basesDestroyed: number;
  civilianHits: number;
  fakeBasesHit: number;
  event?: string;
  eventColor?: string;
}

// === GAME STATE ===
export interface GameState {
  tick: number;
  running: boolean;
  speed: number;
  role: PlayerRole;
  phase: GamePhase;
  regime: RegimeState;
  coalition: CoalitionState;
  upgrades: Record<string, UpgradeState>;
  combatLog: CombatLog[];
  gameOver: boolean;
  winner: 'coalition' | 'regime' | null;
  winReason: string;
  autoFireRegime: boolean;
  autoFireCoalition: boolean;

  // Constants
  coalitionPibBase: number;

  // Log-worthy events tracker
  milestones: Record<string, boolean>;
}
