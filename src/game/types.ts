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

export interface FlightGroup {
  launched: number;
  intercepted: number;
  impacts: number;
  timer: number;
  targetX?: number;
  targetY?: number;
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
  revealedType: BaseType | null; // what the scan revealed
  alive: boolean;
  x: number;
  y: number;
  visibleAfterScan: boolean; // stays visible after scan ends (as "normal")
  hiddenBase: boolean; // buried/hidden base that disappears after scan
  knownToCoalition: boolean; // If true, it was scanned/seen and stays "gray"
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
  baseBuildQueue: { type: BaseType; timer: number; buildTime: number }[];

  droneStock: StockItem;
  missileStock: StockItem;

  droneCost: number;
  missileCost: number;

  totalDronesLaunched: number;
  totalMissilesLaunched: number;
  manualDronesToLaunch: number;
  manualMissilesToLaunch: number;
  flyingDrones: (FlightGroup & { minigunDamage?: number })[];
  flyingMissiles: FlightGroup[];
  antiAirLevel: number;

  kamikazeMineCount: number;
  kamikazeMineCost: number;

  radarLockdownAvailable: boolean;
  radarLockdownCooldown: number;
  radarLockdownActive: boolean;
  radarLockdownTimer: number;

  nuclearUnlocked: boolean;
  nuclearProgress: number;
  nuclearBaseId: string | null;

  droneBias: number;
  missileBias: number;

  // Endgame stats
  totalMoneySpent: number;
  totalBasesBuilt: number;
  totalDroneImpacts: number;
  totalMissileImpacts: number;
}

// === COALITION STATE ===
export interface CoalitionState {
  debt: number;
  prevDebt: number;
  incomePerTick: number;
  debtBreakdownTolerance: number;
  publicTaxLevel: number;

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
  interceptorMax: number;
  interceptorRechargeTimer: number;
  interceptorRechargeTime: number;

  // Defense
  patriots: number;
  patriotCost: number;
  miniguns: number;
  minigunCost: number;
  radarSpots: number;
  radarSpotCost: number;
  patriotUnits: { reloadTimer: number }[];

  // Fog of war
  fogOfWarLimit: number;

  // Scan — no cooldown, exponential cost on consecutive use
  scanAvailable: boolean;
  scanActive: boolean;
  scanTimer: number;
  scanZoneX: number;
  scanZoneY: number;
  scanConsecutiveCount: number;
  scanBaseCost: number;
  scanSector: 'north' | 'south'; // Alternates each time
  scanSizeMultiplier: number; // For the new upgrade

  // Stats
  totalStrikes: number;
  successfulStrikes: number;
  manualStrikesToLaunch: number;
  flyingStrikes: FlightGroup[];
  strikePower: number;
  strikeAccuracy: number;
  intelligenceModifier: number;
  laserDefense: number;
  maintenanceCost: number;

  // Interception stats
  totalIntercepted: number;
  totalIncoming: number;
  totalMissilesIncoming: number;
  totalMissilesIntercepted: number;
  totalDronesIncoming: number;
  totalDronesIntercepted: number;
  totalPatriotShots: number;
  totalMinigunKills: number;
  totalDronePatriotKills: number;
  totalMinigunBullets: number;
  radarDamage: number;

  // Rafale bonus
  recentStrikeTimestamps: number[];

  // Fear Business
  fearBusinessAvailable: boolean;
  fearBusinessActive: boolean;
  fearBusinessTimer: number;

  // Fighter patrol state
  flyingFighters: { id: string; state: 'patrol' | 'returning' | 'reloading'; timer: number; maxTimer: number; targetX: number; targetY: number }[];
  manualFightersToLaunch: number;
  fighterReloadCost: number;
  minigunFireRate: number;
  minigunProjectileSpeed: number;

  // Endgame stats
  totalDebtAccumulated: number;
  totalFightersLaunched: number;
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
  radarsDestroyed?: number;
  event?: string;
  eventColor?: string;
  satiricalEvent?: string;
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
