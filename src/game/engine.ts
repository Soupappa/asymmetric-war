import { GameState, CombatLog, GamePhase } from './types';
import { UPGRADES, getUpgradeCost } from './upgrades';

export function createInitialState(): GameState {
  const upgrades: Record<string, { level: number }> = {};
  UPGRADES.forEach(u => { upgrades[u.id] = { level: 0 }; });

  return {
    tick: 0,
    running: false,
    speed: 1,
    role: 'both',
    phase: 'early',
    regime: {
      resilience: 100,
      bases: 24,
      drones_per_sec: 0,
      missiles_per_sec: 0,
      drone_efficiency: 0.5,
      missile_efficiency: 0.2,
      drone_bias: 1,
      missile_bias: 1,
      anti_air_level: 0,
      mine_count: 0,
      total_drones_launched: 0,
      total_missiles_launched: 0,
    },
    coalition: {
      economy_output: 500,
      public_support: 100,
      hand_free: 500,
      anti_drone_capacity: 10,
      anti_missile_capacity: 5,
      strike_power: 1,
      strike_accuracy: 0.5,
      intelligence_modifier: 1,
      laser_defense: 0,
      total_strikes: 0,
      successful_strikes: 0,
      war_cost_per_sec: 0,
    },
    upgrades,
    combatLog: [],
    gameOver: false,
    winner: null,
    winReason: '',
  };
}

function determinePhase(state: GameState): GamePhase {
  if (state.tick < 120) return 'early';
  if (state.tick < 600) return 'mid';
  return 'late';
}

function applyUpgradeEffects(state: GameState) {
  UPGRADES.forEach(u => {
    const lvl = state.upgrades[u.id]?.level ?? 0;
    if (lvl > 0) u.effect(state, lvl);
  });
}

function applyDoctrine(state: GameState) {
  const c = state.coalition;
  const r = state.regime;

  if (c.anti_missile_capacity > c.anti_drone_capacity * 1.25) {
    r.drone_bias = Math.min(3, r.drone_bias + 0.002);
    r.missile_bias = Math.max(0.5, r.missile_bias - 0.001);
  } else if (c.anti_drone_capacity > c.anti_missile_capacity * 1.25) {
    r.missile_bias = Math.min(3, r.missile_bias + 0.002);
    r.drone_bias = Math.max(0.5, r.drone_bias - 0.001);
  }
}

function autoCreateBases(state: GameState) {
  const r = state.regime;
  const baseCost = 250 + r.bases * 90;
  if (r.resilience >= baseCost) {
    r.resilience -= baseCost;
    r.bases += 1;
  }
}

export function gameTick(prev: GameState): GameState {
  if (prev.gameOver) return prev;

  const state: GameState = JSON.parse(JSON.stringify(prev));
  state.tick += 1;
  state.phase = determinePhase(state);

  const r = state.regime;
  const c = state.coalition;

  // Apply upgrade effects
  applyUpgradeEffects(state);

  // Doctrine adaptation
  applyDoctrine(state);

  // Regime production
  const swarmBonus = 1 + (state.upgrades.r_swarm_tactics?.level ?? 0) * 0.15;
  const warheadBonus = 1 + (state.upgrades.r_warhead_upgrade?.level ?? 0) * 0.2;

  r.drones_per_sec = r.bases * r.drone_efficiency * r.drone_bias * swarmBonus;
  r.missiles_per_sec = r.bases * r.missile_efficiency * r.missile_bias * warheadBonus;

  const drones = r.drones_per_sec;
  const missiles = r.missiles_per_sec;
  r.total_drones_launched += drones;
  r.total_missiles_launched += missiles;

  // Coalition interception
  const stealthReduction = 1 - (state.upgrades.r_stealth_drones?.level ?? 0) * 0.05;
  const decoyReduction = 1 - (state.upgrades.r_decoy_missiles?.level ?? 0) * 0.05;
  const cheapBatteryBonus = (state.upgrades.c_cheap_battery?.level ?? 0) * 12;
  const patriotBonus = (state.upgrades.c_patriot?.level ?? 0) * 8;

  const effectiveAntiDrone = (c.anti_drone_capacity + cheapBatteryBonus + c.laser_defense) * stealthReduction;
  const effectiveAntiMissile = (c.anti_missile_capacity + patriotBonus) * decoyReduction;

  const dronesIntercepted = Math.min(drones, effectiveAntiDrone);
  const missilesIntercepted = Math.min(missiles, effectiveAntiMissile);

  const droneImpacts = Math.max(0, drones - dronesIntercepted);
  const missileImpacts = Math.max(0, missiles - missilesIntercepted);
  const totalImpacts = droneImpacts + missileImpacts;

  // Mine pressure on economy
  const minePressure = r.mine_count;
  const mineMultiplier = Math.max(0.3, 1 - minePressure * 0.03);

  // Trade routes bonus
  const tradeBonus = (state.upgrades.c_trade_routes?.level ?? 0) * 30;
  const effectiveEconomy = (c.economy_output + tradeBonus) * mineMultiplier;

  // Hand_free calculation
  c.hand_free = effectiveEconomy * (c.public_support / 100);

  // War cost
  const defenseCost = (c.anti_drone_capacity + c.anti_missile_capacity + c.laser_defense) * 2;
  const offenseCost = c.strike_power * 5;
  c.war_cost_per_sec = defenseCost + offenseCost;

  // Public support impact
  const propagandaReduction = 1 - (state.upgrades.c_propaganda?.level ?? 0) * 0.05;
  const censorshipReduction = 1 - (state.upgrades.c_censorship?.level ?? 0) * 0.08;
  const impactVisibility = propagandaReduction * censorshipReduction;

  let supportLoss = 0;
  supportLoss += droneImpacts * 0.5 * impactVisibility;
  supportLoss += missileImpacts * 1.5 * impactVisibility;

  // Strike success ratio check
  if (c.total_strikes > 10) {
    const ratio = c.successful_strikes / c.total_strikes;
    if (ratio < 0.9) {
      supportLoss += (0.9 - ratio) * 2;
    }
  }

  c.public_support = Math.max(0, Math.min(100, c.public_support - supportLoss));

  // Resilience gain
  const tunnelBonus = 1 + (state.upgrades.r_tunnel_network?.level ?? 0) * 0.25;
  const ideologyBonus = 1 + (state.upgrades.r_ideology?.level ?? 0) * 0.1;
  const resilienceGain = (r.bases * 2 + totalImpacts * 5) * tunnelBonus * ideologyBonus;
  r.resilience += resilienceGain;

  // Coalition strikes
  const baseHardening = 1 + (state.upgrades.r_base_hardening?.level ?? 0) * 0.1;
  const defenseModifier = (1 + r.anti_air_level * 0.15 + r.bases * 0.01) * baseHardening;
  const carpetBonus = 1 + (state.upgrades.c_carpet?.level ?? 0) * 0.5;
  const empBonus = state.upgrades.c_emp?.level ?? 0;

  const effectiveStrikePower = c.strike_power * carpetBonus * (1 + empBonus * 0.1);
  const basesDestroyed = Math.min(
    r.bases,
    Math.max(0, Math.floor(
      (effectiveStrikePower * c.strike_accuracy * c.intelligence_modifier) / defenseModifier
    ))
  );

  if (basesDestroyed > 0) {
    r.bases = Math.max(0, r.bases - basesDestroyed);
    c.total_strikes += 1;
    c.successful_strikes += 1;
  } else if (c.strike_power > 0) {
    c.total_strikes += 1;
  }

  // Carpet bombing support cost
  if ((state.upgrades.c_carpet?.level ?? 0) > 0) {
    c.public_support = Math.max(0, c.public_support - 0.1 * (state.upgrades.c_carpet?.level ?? 0));
  }

  // Auto create bases
  autoCreateBases(state);

  // Combat log
  const log: CombatLog = {
    tick: state.tick,
    drones_launched: Math.round(drones),
    missiles_launched: Math.round(missiles),
    drones_intercepted: Math.round(dronesIntercepted),
    missiles_intercepted: Math.round(missilesIntercepted),
    drone_impacts: Math.round(droneImpacts),
    missile_impacts: Math.round(missileImpacts),
    bases_destroyed: basesDestroyed,
    resilience_gained: Math.round(resilienceGain),
    support_lost: Math.round(supportLoss * 100) / 100,
  };
  state.combatLog = [log, ...state.combatLog.slice(0, 49)];

  // Win/lose conditions
  if (r.bases <= 0) {
    state.gameOver = true;
    state.winner = 'coalition';
    state.winReason = 'All regime bases destroyed';
  } else if (c.hand_free <= 0) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Coalition economic collapse';
  } else if (c.public_support <= 5) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Coalition political collapse';
  }

  return state;
}

export function canAffordUpgrade(state: GameState, upgradeId: string): boolean {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return false;
  const level = state.upgrades[upgradeId]?.level ?? 0;
  if (level >= upgrade.maxLevel) return false;
  const cost = getUpgradeCost(upgrade, level);
  if (upgrade.side === 'regime') return state.regime.resilience >= cost;
  return state.coalition.hand_free >= cost;
}

export function purchaseUpgrade(state: GameState, upgradeId: string): GameState {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade || !canAffordUpgrade(state, upgradeId)) return state;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const level = newState.upgrades[upgradeId]?.level ?? 0;
  const cost = getUpgradeCost(upgrade, level);

  if (upgrade.side === 'regime') {
    newState.regime.resilience -= cost;
  } else {
    newState.coalition.hand_free -= cost;
  }
  newState.upgrades[upgradeId] = { level: level + 1 };

  return newState;
}
