import { GameState, CombatLog, GamePhase, RegimeBase } from './types';
import { UPGRADES, getUpgradeCost } from './upgrades';

const COALITION_PIB_BASE = 500000;

let baseIdCounter = 0;
function genBaseId(): string { return `base_${baseIdCounter++}`; }

function createBase(type: 'military' | 'civilian' | 'fake' = 'military'): RegimeBase {
  return {
    id: genBaseId(), type, burialLevel: 0,
    scansRequired: type === 'military' ? 0 : type === 'civilian' ? 1 : 1,
    scansReceived: 0, revealed: false, alive: true,
    x: 0.6 + Math.random() * 0.35, y: 0.08 + Math.random() * 0.84,
  };
}

export function createInitialState(): GameState {
  const upgrades: Record<string, { level: number; researching: boolean; researchProgress: number; researchTarget: number }> = {};
  UPGRADES.forEach(u => { upgrades[u.id] = { level: 0, researching: false, researchProgress: 0, researchTarget: u.researchTime }; });

  const bases: RegimeBase[] = [];
  for (let i = 0; i < 12; i++) bases.push(createBase('military'));

  return {
    tick: 0, running: false, speed: 1, role: 'both', phase: 'early',
    regime: {
      money: 150, moneyRegen: 2, oilShippingLevel: 0,
      fervor: 25, dispersion: 25, resilience: 6.25,
      bases, baseCost: 40,
      droneStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 3, autoBuy: false, autoLaunch: false },
      missileStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 8, autoBuy: false, autoLaunch: false },
      droneCost: 8, missileCost: 25,
      totalDronesLaunched: 0, totalMissilesLaunched: 0,
      antiAirLevel: 0, kamikazeMineCount: 0, kamikazeMineCost: 30,
      radarLockdownAvailable: true, radarLockdownCooldown: 0,
      nuclearUnlocked: false, nuclearProgress: 0, nuclearBaseId: null,
      droneBias: 1, missileBias: 1,
    },
    coalition: {
      debt: 0, incomePerTick: 0, debtBreakdownTolerance: 10,
      economy: 100, economyDerivative: 0, publicSupport: 100, publicSupportDerivative: 0, handFree: 100,
      strikeStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 3, autoBuy: false, autoLaunch: false },
      fighterStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 6, autoBuy: false, autoLaunch: false },
      interceptorStock: 6, interceptorMax: 6, interceptorRechargeTimer: 0, interceptorRechargeTime: 3,
      patriots: 2, patriotCost: 3000, miniguns: 3, minigunCost: 400, radarSpots: 1, radarSpotCost: 1500,
      fogOfWarLimit: 0.48, // just past frontline
      scanAvailable: true, scanCooldown: 0, scanActive: false, scanTimer: 0, scanZoneX: 0.7, scanZoneY: 0.5,
      totalStrikes: 0, successfulStrikes: 0, strikePower: 1, strikeAccuracy: 0.5, intelligenceModifier: 1,
      laserDefense: 0, maintenanceCost: 50, recentStrikeTimestamps: [],
    },
    upgrades, combatLog: [], gameOver: false, winner: null, winReason: '',
    autoFireRegime: false, autoFireCoalition: false,
    coalitionPibBase: COALITION_PIB_BASE, milestones: {},
  };
}

function determinePhase(state: GameState): GamePhase {
  if (state.regime.nuclearUnlocked) return 'nuclear';
  if (state.tick < 200) return 'early';
  if (state.tick < 800) return 'mid';
  return 'late';
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
        const def = UPGRADES.find(up => up.id === id);
        if (def) def.effect(state, u.level);
      }
    }
  }
}

function processStockProduction(state: GameState) {
  const r = state.regime;
  const c = state.coalition;

  // Regime drone production
  const droneTimeReduction = 1 - (state.upgrades.r_drone_factory?.level ?? 0) * 0.12;
  const effectiveDroneTime = Math.max(1, r.droneStock.productionTime * droneTimeReduction);
  if (r.droneStock.producing) {
    r.droneStock.productionProgress += 1;
    if (r.droneStock.productionProgress >= effectiveDroneTime) {
      r.droneStock.stock += 1;
      r.droneStock.productionProgress = 0;
      r.droneStock.producing = false;
    }
  }
  const fervorDiscount = Math.max(0.3, 1 - r.fervor * 0.005);
  const effectiveDroneCost = r.droneCost * fervorDiscount;
  if (r.droneStock.autoBuy && !r.droneStock.producing && r.money >= effectiveDroneCost) {
    r.money -= effectiveDroneCost;
    r.droneStock.producing = true;
    r.droneStock.productionProgress = 0;
  }

  // Regime missile production
  const missileTimeReduction = 1 - (state.upgrades.r_missile_factory?.level ?? 0) * 0.10;
  const effectiveMissileTime = Math.max(2, r.missileStock.productionTime * missileTimeReduction);
  if (r.missileStock.producing) {
    r.missileStock.productionProgress += 1;
    if (r.missileStock.productionProgress >= effectiveMissileTime) {
      r.missileStock.stock += 1;
      r.missileStock.productionProgress = 0;
      r.missileStock.producing = false;
    }
  }
  const effectiveMissileCost = r.missileCost * fervorDiscount;
  if (r.missileStock.autoBuy && !r.missileStock.producing && r.money >= effectiveMissileCost) {
    r.money -= effectiveMissileCost;
    r.missileStock.producing = true;
    r.missileStock.productionProgress = 0;
  }

  // Coalition strike production — FAST (productionTime defaults to 3)
  if (c.strikeStock.producing) {
    c.strikeStock.productionProgress += 1;
    if (c.strikeStock.productionProgress >= c.strikeStock.productionTime) {
      c.strikeStock.stock += 1;
      c.strikeStock.productionProgress = 0;
      c.strikeStock.producing = false;
    }
  }
  // Auto-buy: coalition has no money limit, just adds debt
  if (c.strikeStock.autoBuy && !c.strikeStock.producing) {
    c.debt += 800;
    c.strikeStock.producing = true;
    c.strikeStock.productionProgress = 0;
  }

  // Coalition fighter production
  if (c.fighterStock.producing) {
    c.fighterStock.productionProgress += 1;
    if (c.fighterStock.productionProgress >= c.fighterStock.productionTime) {
      c.fighterStock.stock += 1;
      c.fighterStock.productionProgress = 0;
      c.fighterStock.producing = false;
    }
  }
  if (c.fighterStock.autoBuy && !c.fighterStock.producing) {
    c.debt += 2000;
    c.fighterStock.producing = true;
    c.fighterStock.productionProgress = 0;
  }

  // Coalition interceptor auto-recharge
  c.interceptorMax = c.patriots * 3;
  if (c.interceptorStock < c.interceptorMax) {
    c.interceptorRechargeTimer += 1;
    if (c.interceptorRechargeTimer >= c.interceptorRechargeTime) {
      c.interceptorStock = Math.min(c.interceptorMax, c.interceptorStock + 1);
      c.interceptorRechargeTimer = 0;
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

  processResearch(state);
  processStockProduction(state);

  // Apply upgrade effects
  UPGRADES.forEach(u => {
    const lvl = state.upgrades[u.id]?.level ?? 0;
    if (lvl > 0) u.effect(state, lvl);
  });

  // === REGIME ECONOMY ===
  const aliveBases = r.bases.filter(b => b.alive);
  const oilRefBonus = 1 + (state.upgrades.r_oil_refinery?.level ?? 0) * 0.15;
  const smugglingReduction = 1 - (state.upgrades.r_smuggling?.level ?? 0) * 0.08;
  const oilDiminishing = Math.max(0.2, 1 - r.oilShippingLevel * 0.1 * smugglingReduction);
  r.moneyRegen = 2 + r.oilShippingLevel * 3 * oilDiminishing * oilRefBonus + aliveBases.length * 0.3;
  r.money += r.moneyRegen;

  const totalBurial = aliveBases.reduce((s, b) => s + b.burialLevel, 0);
  r.dispersion = Math.min(100, 15 + aliveBases.length * 2.5 + totalBurial * 3);

  const propagandaBonus = (state.upgrades.r_propaganda?.level ?? 0) * 0.15;
  const cultReduction = 1 - (state.upgrades.r_cult_personality?.level ?? 0) * 0.12;
  r.fervor = Math.min(100, Math.max(0, r.fervor + propagandaBonus));
  r.fervor = Math.max(0, r.fervor - 0.05 * cultReduction);
  r.resilience = (r.fervor / 100) * (r.dispersion / 100) * 100;

  if ((state.upgrades.r_volunteer_army?.level ?? 0) > 0 && r.fervor > 60) {
    const freeRate = (state.upgrades.r_volunteer_army?.level ?? 0) * 0.1;
    if (Math.random() < freeRate) r.droneStock.stock += 1;
  }

  if (r.radarLockdownCooldown > 0) {
    r.radarLockdownCooldown -= 1;
    if (r.radarLockdownCooldown <= 0) r.radarLockdownAvailable = true;
  }

  // === COALITION ECONOMY (debt-only) ===
  // Constant maintenance cost every tick — even idle
  c.maintenanceCost = 50 + c.patriots * 50 + c.miniguns * 10 + c.radarSpots * 20;
  c.debt += c.maintenanceCost / 10;

  // Income from bonds reduces debt
  const bondBonus = 1 + (state.upgrades.c_war_bonds_upgrade?.level ?? 0) * 0.2;
  const income = c.incomePerTick * bondBonus;
  c.debt = Math.max(0, c.debt - income);

  // Allied aid reduces debt
  if ((state.upgrades.c_allied_aid?.level ?? 0) > 0 && state.tick % 50 === 0) {
    c.debt = Math.max(0, c.debt - (state.upgrades.c_allied_aid?.level ?? 0) * 500);
  }

  // Trade routes reduce debt
  const tradeBonus = 1 + (state.upgrades.c_trade_routes?.level ?? 0) * 0.05;
  c.debt = Math.max(0, c.debt - 10 * tradeBonus);

  // Economy derivative based on debt ratio
  const debtRatio = c.debt / state.coalitionPibBase * 100;
  const toleranceBonus = (state.upgrades.c_war_economy?.level ?? 0) * 2;
  const effectiveTolerance = c.debtBreakdownTolerance + toleranceBonus;
  const gdpBonus = (state.upgrades.c_gdp_growth?.level ?? 0) * 0.3;
  
  if (debtRatio < effectiveTolerance) {
    c.economyDerivative = 0.1 + gdpBonus;
  } else {
    const excess = debtRatio - effectiveTolerance;
    c.economyDerivative = -(excess * excess) * 0.005;
  }

  c.economy = Math.max(0, Math.min(100, c.economy + c.economyDerivative - r.kamikazeMineCount * 0.5));

  // === FOG OF WAR ===
  // Radars push the fog limit further into regime territory
  c.fogOfWarLimit = 0.42 + c.radarSpots * 0.06;
  // Clamp to max visible
  c.fogOfWarLimit = Math.min(1.0, c.fogOfWarLimit);

  // Scan cooldown/timer
  if (c.scanCooldown > 0) {
    c.scanCooldown -= 1;
    if (c.scanCooldown <= 0) c.scanAvailable = true;
  }
  if (c.scanActive) {
    c.scanTimer -= 1;
    if (c.scanTimer <= 0) {
      c.scanActive = false;
      r.bases.forEach(b => { b.revealed = false; });
    }
  }

  // === COMBAT ===
  let dronesLaunched = 0;
  let missilesLaunched = 0;

  if (r.droneStock.autoLaunch && r.droneStock.stock > 0) {
    const batch = Math.min(r.droneStock.stock, 5);
    r.droneStock.stock -= batch;
    dronesLaunched += batch;
    r.totalDronesLaunched += batch;
  }
  if (r.missileStock.autoLaunch && r.missileStock.stock > 0) {
    const batch = Math.min(r.missileStock.stock, 2);
    r.missileStock.stock -= batch;
    missilesLaunched += batch;
    r.totalMissilesLaunched += batch;
  }

  let strikesLaunched = 0;
  if (c.strikeStock.autoLaunch && c.strikeStock.stock > 0) {
    c.strikeStock.stock -= 1;
    strikesLaunched += 1;
  }

  // === INTERCEPTION ===
  // Drones: miniguns + laser
  const stealthReduction = 1 - (state.upgrades.r_stealth_drones?.level ?? 0) * 0.08;
  const minigunUpgrade = 1 + (state.upgrades.c_minigun_upgrade?.level ?? 0) * 0.2;
  const minigunAntiDrone = c.miniguns * 4 * minigunUpgrade * stealthReduction;
  const laserIntercept = c.laserDefense;
  const fighterIntercept = c.fighterStock.stock * 2;
  const totalAntiDrone = minigunAntiDrone + laserIntercept + fighterIntercept;
  const dronesIntercepted = Math.min(dronesLaunched, Math.floor(totalAntiDrone));

  // Missiles: interceptor missiles (from patriot stock)
  // Only intercept missiles that are within fog-cleared zone
  // Missiles originate from regime bases (x > 0.6), travel left
  // They become "detected" when they cross fogOfWarLimit
  // We simulate: missiles in fog = undetectable, past fog = interceptable
  const decoyReduction = 1 - (state.upgrades.r_decoy_missiles?.level ?? 0) * 0.08;
  const patriotUpgrade = 1 + (state.upgrades.c_patriot_upgrade?.level ?? 0) * 0.15;
  
  // Detected missiles = those that have entered the visible zone
  // More radars = earlier detection = more time to intercept = higher rate
  const detectionRate = Math.min(1, (c.fogOfWarLimit - 0.42) / 0.58); // 0 at frontline, 1 at full coverage
  const detectedMissiles = Math.floor(missilesLaunched * detectionRate);
  
  // Each interceptor can stop 1 missile
  const interceptorsUsed = Math.min(detectedMissiles, c.interceptorStock);
  const interceptorEfficiency = patriotUpgrade * decoyReduction;
  const missilesIntercepted = Math.min(detectedMissiles, Math.floor(interceptorsUsed * interceptorEfficiency));
  c.interceptorStock = Math.max(0, c.interceptorStock - interceptorsUsed);

  const droneImpacts = Math.max(0, dronesLaunched - dronesIntercepted);
  const missileImpacts = Math.max(0, missilesLaunched - missilesIntercepted);

  // Interception rate for public support
  const totalIncoming = dronesLaunched + missilesLaunched;
  const totalIntercepted = dronesIntercepted + missilesIntercepted;
  const interceptionRate = totalIncoming > 0 ? totalIntercepted / totalIncoming : 1;

  // Public support
  const mediaBonus = 1 - (state.upgrades.c_media_campaign?.level ?? 0) * 0.1;
  const censorshipBonus = 1 - (state.upgrades.c_censorship?.level ?? 0) * 0.12;
  const fatiguResist = 1 - (state.upgrades.c_war_fatigue_resist?.level ?? 0) * 0.1;

  let supportChange = 0;
  if (interceptionRate > 0.95 && totalIncoming > 0) {
    supportChange += 0.05;
  } else if (totalIncoming > 0) {
    const deficit = 0.95 - interceptionRate;
    supportChange -= deficit * deficit * 5;
  }
  supportChange -= missileImpacts * 1.5 * censorshipBonus;
  supportChange -= droneImpacts * 0.2 * mediaBonus;
  supportChange -= 0.02 * fatiguResist;

  if ((state.upgrades.c_carpet?.level ?? 0) > 0) {
    supportChange -= 0.08 * (state.upgrades.c_carpet?.level ?? 0);
  }

  c.publicSupportDerivative = supportChange;
  c.publicSupport = Math.max(0, Math.min(100, c.publicSupport + supportChange));
  c.handFree = (c.economy / 100) * (c.publicSupport / 100) * 100;

  r.fervor = Math.min(100, r.fervor + droneImpacts * 0.5 + missileImpacts * 2);

  // === STRIKES on regime bases ===
  let basesDestroyed = 0;
  let civilianHits = 0;
  let fakeBasesHit = 0;

  if (strikesLaunched > 0) {
    const bunkerBuster = state.upgrades.c_bunker_buster?.level ?? 0;
    const carpetBonus = 1 + (state.upgrades.c_carpet?.level ?? 0) * 0.5;
    const baseHardening = 1 + (state.upgrades.r_base_hardening?.level ?? 0) * 0.12;
    const defMod = (1 + r.antiAirLevel * 0.15) * baseHardening;

    for (let i = 0; i < strikesLaunched; i++) {
      c.totalStrikes += 1;
      const hitChance = (c.strikeAccuracy * c.intelligenceModifier * carpetBonus) / defMod;
      
      if (Math.random() < hitChance) {
        const targetableBases = aliveBases.filter(b => {
          if (b.burialLevel > bunkerBuster) return false;
          if ((b.type === 'civilian' || b.type === 'fake') && !b.revealed && !c.scanActive) return false;
          return true;
        });
        const allVisible = aliveBases.filter(b => {
          if (b.burialLevel > bunkerBuster) return false;
          if (b.type === 'civilian' || b.type === 'fake') {
            return b.revealed || !c.scanActive;
          }
          return true;
        });

        const pool = c.scanActive ? targetableBases : allVisible;
        if (pool.length > 0) {
          const target = pool[Math.floor(Math.random() * pool.length)];
          if (target.type === 'fake') {
            fakeBasesHit += 1;
            target.alive = false;
          } else if (target.type === 'civilian' && !target.revealed) {
            civilianHits += 1;
            target.alive = false;
            c.publicSupport = Math.max(0, c.publicSupport - 8);
            r.fervor = Math.max(0, r.fervor - 3);
          } else {
            target.alive = false;
            basesDestroyed += 1;
            c.successfulStrikes += 1;
          }
        }
      }
    }
  }

  if (basesDestroyed > 0 && (state.upgrades.c_embedded_journalists?.level ?? 0) > 0) {
    c.publicSupport = Math.min(100, c.publicSupport + basesDestroyed * 0.5 * (state.upgrades.c_embedded_journalists?.level ?? 0));
  }

  // Nuclear check
  if (r.resilience >= 95 && !r.nuclearUnlocked && !state.milestones.nuclear_unlocked) {
    r.nuclearUnlocked = true;
    const nBase = createBase('military');
    nBase.burialLevel = 3;
    nBase.scansRequired = 3;
    r.bases.push(nBase);
    r.nuclearBaseId = nBase.id;
    state.milestones.nuclear_unlocked = true;
  }

  if (r.nuclearUnlocked && r.nuclearBaseId) {
    const nBase = r.bases.find(b => b.id === r.nuclearBaseId);
    if (nBase && nBase.alive) {
      r.nuclearProgress = Math.min(100, r.nuclearProgress + 0.2);
    } else {
      r.nuclearUnlocked = false;
      r.nuclearProgress = 0;
      r.nuclearBaseId = null;
    }
  }

  // Doctrine adaptation
  const antiDroneStrength = minigunAntiDrone + fighterIntercept;
  const antiMissileStrength = c.interceptorStock;
  if (antiMissileStrength > antiDroneStrength * 1.3) {
    r.droneBias = Math.min(3, r.droneBias + 0.003);
    r.missileBias = Math.max(0.5, r.missileBias - 0.001);
  } else if (antiDroneStrength > antiMissileStrength * 1.3) {
    r.missileBias = Math.min(3, r.missileBias + 0.003);
    r.droneBias = Math.max(0.5, r.droneBias - 0.001);
  }

  // Combat log
  let event: string | undefined;
  let eventColor: string | undefined;
  if (civilianHits > 0) { event = `⚠ CIVILIAN CASUALTIES — ${civilianHits} civilian base(s) hit!`; eventColor = 'text-danger'; }
  else if (fakeBasesHit > 0) { event = `🎭 DECOY — ${fakeBasesHit} fake base(s) wasted strikes`; eventColor = 'text-warning'; }
  else if (basesDestroyed > 0) { event = `💥 ${basesDestroyed} base(s) destroyed`; eventColor = 'text-coalition'; }
  if (r.nuclearUnlocked && r.nuclearProgress > 0 && !state.milestones.nuclear_warning) {
    event = '☢ NUCLEAR PROGRAM DETECTED — Find and destroy the launch site!';
    eventColor = 'text-danger';
    state.milestones.nuclear_warning = true;
  }

  const log: CombatLog = {
    tick: state.tick,
    dronesLaunched, missilesLaunched, dronesIntercepted, missilesIntercepted,
    droneImpacts, missileImpacts, basesDestroyed, civilianHits, fakeBasesHit,
    event, eventColor,
  };
  state.combatLog = [log, ...state.combatLog.slice(0, 49)];

  // Win conditions
  const realBases = r.bases.filter(b => b.alive && b.type === 'military');
  if (realBases.length <= 0) {
    state.gameOver = true;
    state.winner = 'coalition';
    state.winReason = 'All regime military bases destroyed';
  } else if (c.handFree <= 0) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Hand Free collapsed — war unsustainable';
  } else if (r.nuclearProgress >= 100) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Nuclear launch successful';
  }

  return state;
}

// === PLAYER ACTIONS ===

// Coalition: all purchases add debt directly — no money check
export function buyPatriot(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += s.coalition.patriotCost;
  s.coalition.patriots += 1;
  s.coalition.interceptorMax = s.coalition.patriots * 3;
  return s;
}

export function buyMinigun(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += s.coalition.minigunCost;
  s.coalition.miniguns += 1;
  return s;
}

export function buildRadar(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += s.coalition.radarSpotCost;
  s.coalition.radarSpots += 1;
  s.coalition.fogOfWarLimit = Math.min(1.0, 0.42 + s.coalition.radarSpots * 0.06);
  return s;
}

export function buyStrike(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += 800;
  s.coalition.strikeStock.producing = true;
  s.coalition.strikeStock.productionProgress = 0;
  return s;
}

export function buyFighter(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += 2000;
  s.coalition.fighterStock.producing = true;
  s.coalition.fighterStock.productionProgress = 0;
  return s;
}

export function launchStrikes(state: GameState, count: number): GameState {
  const available = Math.min(count, state.coalition.strikeStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.strikeStock.stock -= available;
  return s;
}

export function launchFighters(state: GameState, count: number): GameState {
  const available = Math.min(count, state.coalition.fighterStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.fighterStock.stock -= available;
  return s;
}

export function issueBonds(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const bondAmount = 5000;
  s.coalition.debt += bondAmount;
  s.coalition.incomePerTick += 5;
  s.coalition.debtBreakdownTolerance += 0.5;
  return s;
}

export function publicTax(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const taxAmount = 2000;
  s.coalition.debt = Math.max(0, s.coalition.debt - taxAmount);
  s.coalition.publicSupport = Math.max(0, s.coalition.publicSupport - 5);
  return s;
}

export function activateScan(state: GameState): GameState {
  if (!state.coalition.scanAvailable || state.coalition.scanActive) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.scanActive = true;
  const scanDuration = 15 + (state.upgrades.c_scan_upgrade?.level ?? 0) * 7;
  s.coalition.scanTimer = scanDuration;
  s.coalition.scanAvailable = false;
  s.coalition.scanCooldown = 60;
  s.regime.bases.forEach(b => {
    if (b.alive) {
      const camoBonus = (state.upgrades.r_camouflage?.level ?? 0) * 0.15;
      const revealChance = 1 - camoBonus;
      if (Math.random() < revealChance) {
        b.scansReceived += 1;
        if (b.scansReceived >= b.scansRequired + b.burialLevel) {
          b.revealed = true;
        }
      }
    }
  });
  return s;
}

export function regimeBuildBase(state: GameState, type: 'military' | 'civilian' | 'fake' = 'military'): GameState {
  const cost = type === 'military' ? state.regime.baseCost : type === 'civilian' ? state.regime.baseCost * 0.6 : state.regime.baseCost * 0.3;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.bases.push(createBase(type));
  return s;
}

export function buryBase(state: GameState, baseId: string): GameState {
  const base = state.regime.bases.find(b => b.id === baseId && b.alive);
  if (!base || base.burialLevel >= 3) return state;
  const tunnelDiscount = 1 - (state.upgrades.r_tunnel_network?.level ?? 0) * 0.2;
  const cost = (30 + base.burialLevel * 20) * tunnelDiscount;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  const b = s.regime.bases.find(b2 => b2.id === baseId)!;
  s.regime.money -= cost;
  b.burialLevel += 1;
  return s;
}

export function buyDrones(state: GameState, count: number): GameState {
  const fervorDiscount = Math.max(0.3, 1 - state.regime.fervor * 0.005);
  const cost = state.regime.droneCost * fervorDiscount * count;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.droneStock.stock += count;
  return s;
}

export function buyMissiles(state: GameState, count: number): GameState {
  const fervorDiscount = Math.max(0.3, 1 - state.regime.fervor * 0.005);
  const cost = state.regime.missileCost * fervorDiscount * count;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.missileStock.stock += count;
  return s;
}

export function regimeLaunchDrones(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.droneStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.droneStock.stock -= available;
  s.regime.totalDronesLaunched += available;
  return s;
}

export function regimeLaunchMissiles(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.missileStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.missileStock.stock -= available;
  s.regime.totalMissilesLaunched += available;
  return s;
}

export function oilShipping(state: GameState): GameState {
  const cost = 20 + state.regime.oilShippingLevel * 10;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.oilShippingLevel += 1;
  return s;
}

export function deployKamikazeMine(state: GameState): GameState {
  if (state.regime.money < state.regime.kamikazeMineCost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= s.regime.kamikazeMineCost;
  s.regime.kamikazeMineCount += 1;
  s.regime.fervor = Math.max(0, s.regime.fervor - 2);
  return s;
}

export function radarLockdown(state: GameState): GameState {
  if (!state.regime.radarLockdownAvailable) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.radarLockdownAvailable = false;
  const jamDuration = 20 + (state.upgrades.r_radar_jam?.level ?? 0) * 6;
  s.regime.radarLockdownCooldown = 80;
  if (s.coalition.scanActive) {
    s.coalition.scanActive = false;
    s.coalition.scanTimer = 0;
    s.regime.bases.forEach(b => { b.revealed = false; });
  }
  s.coalition.scanAvailable = false;
  s.coalition.scanCooldown = jamDuration;
  return s;
}

export function startResearch(state: GameState, upgradeId: string): GameState {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return state;
  const u = state.upgrades[upgradeId];
  if (!u || u.researching || u.level >= upgrade.maxLevel) return state;

  const cost = getUpgradeCost(upgrade, u.level);
  if (upgrade.side === 'regime' && state.regime.money < cost) return state;

  const s: GameState = JSON.parse(JSON.stringify(state));
  if (upgrade.side === 'coalition') {
    // Coalition: just add debt
    s.coalition.debt += cost;
  } else {
    s.regime.money -= cost;
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
  if (upgrade.side === 'regime') return state.regime.money >= cost;
  // Coalition can always afford — it's debt
  return true;
}
