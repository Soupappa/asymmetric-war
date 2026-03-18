export type PlayerRole = 'coalition' | 'regime' | 'both' | 'observer';
export type GamePhase = 'early' | 'mid' | 'late' | 'nuclear';

// === STOCK SYSTEM ===
export interface StockItem {
  stock: number;
  producing: boolean;
  productionProgress: number;
  productionTime: number;
  autoBuy: boolean;
  autoLaunch: boolean;
}

// === REGIME BASE TYPES ===
export type BaseType = 'military' | 'civilian' | 'fake';
export interface RegimeBase {
  id: string;
  type: BaseType;
  burialLevel: number;
  scansRequired: number;
  scansReceived: number;
  revealed: boolean;
  alive: boolean;
  x: number;
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
  branch: string;
  tier: number;
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
  money: number;
  moneyRegen: number;
  oilShippingLevel: number;
  
  fervor: number;
  dispersion: number;
  resilience: number;

  bases: RegimeBase[];
  baseCost: number;

  droneStock: StockItem;
  missileStock: StockItem;

  droneCost: number;
  missileCost: number;

  totalDronesLaunched: number;
  totalMissilesLaunched: number;
  antiAirLevel: number;

  kamikazeMineCount: number;
  kamikazeMineCost: number;

  radarLockdownAvailable: boolean;
  radarLockdownCooldown: number;

  nuclearUnlocked: boolean;
  nuclearProgress: number;
  nuclearBaseId: string | null;

  droneBias: number;
  missileBias: number;
}

// === COALITION STATE ===
export interface CoalitionState {
  // Debt-only economy: no money pool, all spending = debt
  debt: number;
  incomePerTick: number; // from treasury bonds, reduces net debt growth
  debtBreakdownTolerance: number;

  // Macro bar
  economy: number;
  economyDerivative: number;
  publicSupport: number;
  publicSupportDerivative: number;
  handFree: number;

  // Stocks
  strikeStock: StockItem;
  fighterStock: StockItem;

  // Interceptor missiles (auto-recharge from patriots)
  interceptorStock: number;
  interceptorMax: number; // = patriots * 3
  interceptorRechargeTimer: number;
  interceptorRechargeTime: number; // ticks per interceptor

  // Defense
  patriots: number;
  patriotCost: number;
  miniguns: number;
  minigunCost: number;
  radarSpots: number;
  radarSpotCost: number;

  // Fog of war: 0.0 = front line (0.42), extends right with radars
  fogOfWarLimit: number; // x-position on battlefield where fog starts

  // Scan
  scanAvailable: boolean;
  scanCooldown: number;
  scanActive: boolean;
  scanTimer: number;
  scanZoneX: number;
  scanZoneY: number;

  // Stats
  totalStrikes: number;
  successfulStrikes: number;
  strikePower: number;
  strikeAccuracy: number;
  intelligenceModifier: number;
  laserDefense: number;
  maintenanceCost: number; // constant cost per tick even idle

  // Rafale bonus
  recentStrikeTimestamps: number[];
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

  coalitionPibBase: number;
  milestones: Record<string, boolean>;
}
