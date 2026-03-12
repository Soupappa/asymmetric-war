import { GameState, CombatLog, GamePhase } from './types';
import { UPGRADES, getUpgradeCost } from './upgrades';

export function createInitialState(): GameState {
  const upgrades: Record<string, { level: number; researching: boolean; researchProgress: number; researchTarget: number }> = {};
  UPGRADES.forEach(u => { upgrades[u.id] = { level: 0, researching: false, researchProgress: 0, researchTarget: u.researchTime }; });

  return {
    tick: 0,
    running: false,
    speed: 1,
    role: 'both',
    phase: 'early',
    regime: {
      budget: 200,
      resilience: 0,
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
      drone_cost: 5,
      missile_cost: 20,
      base_cost: 80,
    },
    coalition: {
      budget: 50000,
      economy_output: 2000,
      public_support: 100,
      hand_free: 50000,
      aa_batteries: 5,
      fighters_available: 0,
      strike_power: 1,
      strike_accuracy: 0.5,
      intelligence_modifier: 1,
      laser_defense: 0,
      total_strikes: 0,
      successful_strikes: 0,
      war_cost_per_sec: 0,
      aa_cost: 200,
      fighter_cost: 500,
      strike_cost: 800,
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
  const antiDrone = c.aa_batteries * (1 + (state.upgrades.c_aa_upgrade?.level ?? 0) * 0.2);
  const antiMissile = c.aa_batteries * 0.5; // AA less effective vs missiles

  if (antiMissile > antiDrone * 1.25) {
    r.drone_bias = Math.min(3, r.drone_bias + 0.002);
    r.missile_bias = Math.max(0.5, r.missile_bias - 0.001);
  } else if (antiDrone > antiMissile * 1.25) {
    r.missile_bias = Math.min(3, r.missile_bias + 0.002);
    r.drone_bias = Math.max(0.5, r.drone_bias - 0.001);
  }
}

function processResearch(state: GameState) {
  for (const id of Object.keys(state.upgrades)) {
    const u = state.upgrades[id];
    if (u.researching) {
      u.researchProgress += 1;
      if (u.researchProgress >= u.researchTarget) {
        u.level += 1;
        u.researching = false;
        u.researchProgress = 0;
      }
    }
  }
}

export function gameTick(prev: GameState): GameState {
  if (prev.gameOver) return prev;

  const state: GameState = JSON.parse(JSON.stringify(prev));
  state.tick += 1;
  state.phase = determinePhase(state);

  const r = state.regime;
  const c = state.coalition;

  // Process research
  processResearch(state);

  // Apply upgrade effects
  applyUpgradeEffects(state);

  // Doctrine adaptation
  applyDoctrine(state);

  // Regime budget: base income * bases
  const ideologyBonus = 1 + (state.upgrades.r_ideology?.level ?? 0) * 0.1;
  r.budget += r.bases * 2 * ideologyBonus;

  // Resilience grows slowly from survival
  const tunnelBonus = 1 + (state.upgrades.r_tunnel_network?.level ?? 0) * 0.25;
  r.resilience += (r.bases * 0.5) * tunnelBonus;

  // Resilience discount on costs
  const resilienceDiscount = Math.max(0.3, 1 - r.resilience * 0.001);
  const effectiveDroneCost = r.drone_cost * resilienceDiscount;
  const effectiveMissileCost = r.missile_cost * resilienceDiscount;

  // Regime production (auto)
  const swarmBonus = 1 + (state.upgrades.r_swarm_tactics?.level ?? 0) * 0.15;
  const warheadBonus = 1 + (state.upgrades.r_warhead_upgrade?.level ?? 0) * 0.2;

  r.drones_per_sec = r.bases * r.drone_efficiency * r.drone_bias * swarmBonus;
  r.missiles_per_sec = r.bases * r.missile_efficiency * r.missile_bias * warheadBonus;

  // Auto-spend budget on production
  const dronesBudget = Math.floor(r.budget * 0.4 / effectiveDroneCost);
  const missilesBudget = Math.floor(r.budget * 0.3 / effectiveMissileCost);
  const drones = Math.min(r.drones_per_sec, dronesBudget);
  const missiles = Math.min(r.missiles_per_sec, missilesBudget);

  r.budget -= drones * effectiveDroneCost + missiles * effectiveMissileCost;
  r.total_drones_launched += drones;
  r.total_missiles_launched += missiles;

  // Coalition interception via AA batteries
  const stealthReduction = 1 - (state.upgrades.r_stealth_drones?.level ?? 0) * 0.05;
  const decoyReduction = 1 - (state.upgrades.r_decoy_missiles?.level ?? 0) * 0.05;
  const aaEfficiency = 1 + (state.upgrades.c_aa_upgrade?.level ?? 0) * 0.2;

  const effectiveAntiDrone = (c.aa_batteries * 2 * aaEfficiency + c.laser_defense) * stealthReduction;
  const effectiveAntiMissile = (c.aa_batteries * 0.8 * aaEfficiency) * decoyReduction;

  // Fighters intercept drones very well
  const fighterInterceptions = c.fighters_available * 3;
  const totalAntiDrone = effectiveAntiDrone + fighterInterceptions;

  const dronesIntercepted = Math.min(drones, totalAntiDrone);
  const missilesIntercepted = Math.min(missiles, effectiveAntiMissile);

  const droneImpacts = Math.max(0, drones - dronesIntercepted);
  const missileImpacts = Math.max(0, missiles - missilesIntercepted);

  // Fighters get consumed in combat
  if (c.fighters_available > 0 && drones > 0) {
    c.fighters_available = Math.max(0, c.fighters_available - Math.ceil(drones * 0.1));
  }

  // Mine pressure on economy
  const minePressure = r.mine_count;
  const mineMultiplier = Math.max(0.3, 1 - minePressure * 0.03);

  const tradeBonus = (state.upgrades.c_trade_routes?.level ?? 0) * 50;
  const effectiveEconomy = (c.economy_output + tradeBonus) * mineMultiplier;

  // Coalition budget refill from economy (auto income)
  c.budget += effectiveEconomy / 10; // income per tick

  // Hand_free = budget * (public_support / 100) - for upgrades
  c.hand_free = c.budget * (c.public_support / 100);

  // War cost
  const defenseCost = c.aa_batteries * 5;
  const offenseCost = c.strike_power * 10;
  c.war_cost_per_sec = defenseCost + offenseCost;
  c.budget -= c.war_cost_per_sec / 10;

  // Public support impact
  const propagandaReduction = 1 - (state.upgrades.c_propaganda?.level ?? 0) * 0.05;
  const censorshipReduction = 1 - (state.upgrades.c_censorship?.level ?? 0) * 0.08;
  const impactVisibility = propagandaReduction * censorshipReduction;

  let supportLoss = 0;
  supportLoss += droneImpacts * 0.3 * impactVisibility;
  supportLoss += missileImpacts * 1.5 * impactVisibility;

  if (c.total_strikes > 10) {
    const ratio = c.successful_strikes / c.total_strikes;
    if (ratio < 0.9) supportLoss += (0.9 - ratio) * 2;
  }

  c.public_support = Math.max(0, Math.min(100, c.public_support - supportLoss));

  // Coalition strikes (auto based on strike_power)
  const baseHardening = 1 + (state.upgrades.r_base_hardening?.level ?? 0) * 0.1;
  const defenseModifier = (1 + r.anti_air_level * 0.15 + r.bases * 0.01) * baseHardening;
  const carpetBonus = 1 + (state.upgrades.c_carpet?.level ?? 0) * 0.5;

  const effectiveStrikePower = c.strike_power * carpetBonus;
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
    // Impacts give resilience to regime
    r.resilience += basesDestroyed * 10;
  } else if (c.strike_power > 0) {
    c.total_strikes += 1;
  }

  if ((state.upgrades.c_carpet?.level ?? 0) > 0) {
    c.public_support = Math.max(0, c.public_support - 0.1 * (state.upgrades.c_carpet?.level ?? 0));
  }

  // Impacts give resilience
  r.resilience += (droneImpacts + missileImpacts) * 3;

  // Auto create bases for regime
  const autoCost = 250 + r.bases * 90;
  if (r.budget >= autoCost && r.bases < 60) {
    r.budget -= autoCost;
    r.bases += 1;
  }

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
    support_lost: Math.round(supportLoss * 100) / 100,
  };
  state.combatLog = [log, ...state.combatLog.slice(0, 49)];

  // Win/lose conditions
  if (r.bases <= 0) {
    state.gameOver = true;
    state.winner = 'coalition';
    state.winReason = 'All regime bases destroyed';
  } else if (c.budget <= 0) {
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

// === PLAYER ACTIONS ===

// Coalition: Buy AA battery (costs dollars)
export function buyAA(state: GameState): GameState {
  if (state.coalition.budget < state.coalition.aa_cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.budget -= s.coalition.aa_cost;
  s.coalition.aa_batteries += 1;
  return s;
}

// Coalition: Buy fighter (costs dollars)
export function buyFighter(state: GameState): GameState {
  if (state.coalition.budget < state.coalition.fighter_cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.budget -= s.coalition.fighter_cost;
  s.coalition.fighters_available += 1;
  return s;
}

// Coalition: Send strike (costs dollars)
export function sendStrike(state: GameState): GameState {
  if (state.coalition.budget < state.coalition.strike_cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.budget -= s.coalition.strike_cost;
  s.coalition.strike_power += 1;
  return s;
}

// Coalition: Issue treasury bonds (refill budget, lose support)
export function issueBonds(state: GameState, amount: number): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.budget += amount;
  s.coalition.public_support = Math.max(0, s.coalition.public_support - amount * 0.002);
  return s;
}

// Regime: Build base (costs budget)
export function regimeBuildBase(state: GameState): GameState {
  const cost = state.regime.base_cost + state.regime.bases * 30;
  if (state.regime.budget < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.budget -= cost;
  s.regime.bases += 1;
  return s;
}

// Regime: Launch drone wave (costs budget)
export function regimeLaunchDrones(state: GameState, count: number): GameState {
  const resilienceDiscount = Math.max(0.3, 1 - state.regime.resilience * 0.001);
  const cost = state.regime.drone_cost * resilienceDiscount * count;
  if (state.regime.budget < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.budget -= cost;
  s.regime.total_drones_launched += count;
  return s;
}

// Regime: Launch missile salvo (costs budget)
export function regimeLaunchMissiles(state: GameState, count: number): GameState {
  const resilienceDiscount = Math.max(0.3, 1 - state.regime.resilience * 0.001);
  const cost = state.regime.missile_cost * resilienceDiscount * count;
  if (state.regime.budget < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.budget -= cost;
  s.regime.total_missiles_launched += count;
  return s;
}

// Start researching an upgrade (costs hand_free for coalition, budget for regime)
export function startResearch(state: GameState, upgradeId: string): GameState {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return state;
  const u = state.upgrades[upgradeId];
  if (!u || u.researching || u.level >= upgrade.maxLevel) return state;

  const cost = getUpgradeCost(upgrade, u.level);
  if (upgrade.side === 'coalition' && state.coalition.hand_free < cost) return state;
  if (upgrade.side === 'regime' && state.regime.budget < cost) return state;

  const s: GameState = JSON.parse(JSON.stringify(state));
  if (upgrade.side === 'coalition') {
    s.coalition.budget -= cost; // deduct from budget
  } else {
    s.regime.budget -= cost;
  }
  s.upgrades[upgradeId].researching = true;
  s.upgrades[upgradeId].researchProgress = 0;
  s.upgrades[upgradeId].researchTarget = upgrade.researchTime;
  return s;
}

export function canAffordUpgrade(state: GameState, upgradeId: string): boolean {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return false;
  const u = state.upgrades[upgradeId];
  if (!u || u.level >= upgrade.maxLevel || u.researching) return false;
  const cost = getUpgradeCost(upgrade, u.level);
  if (upgrade.side === 'regime') return state.regime.budget >= cost;
  return state.coalition.hand_free >= cost;
}
