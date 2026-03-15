export type PlayerRole = 'coalition' | 'regime' | 'both' | 'observer';
export type GamePhase = 'early' | 'mid' | 'late';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costExponent: number;
  maxLevel: number;
  side: 'coalition' | 'regime';
  category: string;
  researchTime: number; // ticks to research
  effect: (state: GameState, level: number) => void;
}

export interface UpgradeState {
  level: number;
  researching: boolean;
  researchProgress: number; // 0-1
  researchTarget: number; // ticks needed
}

export interface RegimeState {
  budget: number; // low currency, multiplied by bases
  bases: number;
  drones_per_sec: number;
  missiles_per_sec: number;
  drone_efficiency: number;
  missile_efficiency: number;
  drone_bias: number;
  missile_bias: number;
  anti_air_level: number;
  mine_count: number;
  total_drones_launched: number;
  total_missiles_launched: number;
  resilience: number; // lowers weapon costs
  // Unit costs
  drone_cost: number;
  missile_cost: number;
  base_cost: number;
}

export interface CoalitionState {
  budget: number; // dollars - large starting amount
  economy_output: number;
  public_support: number;
  hand_free: number; // budget * (public_support/100) - used for upgrades
  // Defense units
  aa_batteries: number;
  // Offense
  fighters_available: number;
  strike_power: number;
  strike_accuracy: number;
  intelligence_modifier: number;
  laser_defense: number;
  total_strikes: number;
  successful_strikes: number;
  war_cost_per_sec: number;
  // Unit costs (dollars)
  aa_cost: number;
  fighter_cost: number;
  strike_cost: number;
}

export interface CombatLog {
  tick: number;
  drones_launched: number;
  missiles_launched: number;
  drones_intercepted: number;
  missiles_intercepted: number;
  drone_impacts: number;
  missile_impacts: number;
  bases_destroyed: number;
  support_lost: number;
  event?: string;
}

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
}
