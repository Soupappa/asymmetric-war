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
  effect: (state: GameState, level: number) => void;
}

export interface UpgradeState {
  level: number;
}

export interface RegimeState {
  resilience: number;
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
}

export interface CoalitionState {
  economy_output: number;
  public_support: number;
  hand_free: number;
  anti_drone_capacity: number;
  anti_missile_capacity: number;
  strike_power: number;
  strike_accuracy: number;
  intelligence_modifier: number;
  laser_defense: number;
  total_strikes: number;
  successful_strikes: number;
  war_cost_per_sec: number;
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
  resilience_gained: number;
  support_lost: number;
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
}
