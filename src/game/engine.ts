import { GameState, CombatLog, GamePhase, RegimeBase } from './types';
import { UPGRADES, getUpgradeCost } from './upgrades';

const COALITION_PIB_BASE = 500000; // massive economy

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
      debt: 0, money: 5000, incomePerTick: 0, debtBreakdownTolerance: 10,
      economy: 100, economyDerivative: 0, publicSupport: 100, publicSupportDerivative: 0, handFree: 100,
      strikeStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 5, autoBuy: false, autoLaunch: false },
      fighterStock: { stock: 0, producing: false, productionProgress: 0, productionTime: 10, autoBuy: false, autoLaunch: false },
      patriots: 2, patriotCost: 3000, miniguns: 3, minigunCost: 400, radarSpots: 1, radarSpotCost: 1500,
      scanAvailable: true, scanCooldown: 0, scanActive: false, scanTimer: 0, scanZoneX: 0.7, scanZoneY: 0.5,
      totalStrikes: 0, successfulStrikes: 0, strikePower: 1, strikeAccuracy: 0.5, intelligenceModifier: 1,
      laserDefense: 0, warCostPerSec: 0, recentStrikeTimestamps: [],
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
        // Apply immediate effects
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
  // Auto-buy drones (only when autoBuy is ON)
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

  // Coalition strike production
  const strikeCost = 800;
  if (c.strikeStock.producing) {
    c.strikeStock.productionProgress += 1;
    if (c.strikeStock.productionProgress >= c.strikeStock.productionTime) {
      c.strikeStock.stock += 1;
      c.strikeStock.productionProgress = 0;
      c.strikeStock.producing = false;
    }
  }
  if (c.strikeStock.autoBuy && !c.strikeStock.producing && c.money >= strikeCost) {
    c.money -= strikeCost;
    c.debt += strikeCost;
    c.strikeStock.producing = true;
    c.strikeStock.productionProgress = 0;
  }

  // Coalition fighter production
  const fighterCost = 2000;
  if (c.fighterStock.producing) {
    c.fighterStock.productionProgress += 1;
    if (c.fighterStock.productionProgress >= c.fighterStock.productionTime) {
      c.fighterStock.stock += 1;
      c.fighterStock.productionProgress = 0;
      c.fighterStock.producing = false;
    }
  }
  if ((c.fighterStock.autoBuy || !c.fighterStock.producing) && c.money >= fighterCost && !c.fighterStock.producing) {
    c.money -= fighterCost;
    c.debt += fighterCost;
    c.fighterStock.producing = true;
    c.fighterStock.productionProgress = 0;
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
  const militaryBases = aliveBases.filter(b => b.type === 'military');
  
  // Money regen: base regen + oil shipping
  const oilRefBonus = 1 + (state.upgrades.r_oil_refinery?.level ?? 0) * 0.15;
  const smugglingReduction = 1 - (state.upgrades.r_smuggling?.level ?? 0) * 0.08;
  const oilDiminishing = Math.max(0.2, 1 - r.oilShippingLevel * 0.1 * smugglingReduction);
  r.moneyRegen = 2 + r.oilShippingLevel * 3 * oilDiminishing * oilRefBonus + aliveBases.length * 0.3;
  r.money += r.moneyRegen;

  // Dispersion: based on bases + burial
  const totalBurial = aliveBases.reduce((s, b) => s + b.burialLevel, 0);
  r.dispersion = Math.min(100, 15 + aliveBases.length * 2.5 + totalBurial * 3);

  // Fervor: propaganda + hit events (applied in combat below)
  const propagandaBonus = (state.upgrades.r_propaganda?.level ?? 0) * 0.15;
  const cultReduction = 1 - (state.upgrades.r_cult_personality?.level ?? 0) * 0.12;
  r.fervor = Math.min(100, Math.max(0, r.fervor + propagandaBonus));
  // Natural fervor decay
  r.fervor = Math.max(0, r.fervor - 0.05 * cultReduction);

  // Resilience = fervor * dispersion / 100
  r.resilience = (r.fervor / 100) * (r.dispersion / 100) * 100;

  // Volunteer army: free drones from high fervor
  if ((state.upgrades.r_volunteer_army?.level ?? 0) > 0 && r.fervor > 60) {
    const freeRate = (state.upgrades.r_volunteer_army?.level ?? 0) * 0.1;
    if (Math.random() < freeRate) r.droneStock.stock += 1;
  }

  // Radar lockdown cooldown
  if (r.radarLockdownCooldown > 0) {
    r.radarLockdownCooldown -= 1;
    if (r.radarLockdownCooldown <= 0) r.radarLockdownAvailable = true;
  }

  // === COALITION ECONOMY ===
  // Income from bonds
  const bondBonus = 1 + (state.upgrades.c_war_bonds_upgrade?.level ?? 0) * 0.2;
  c.money += c.incomePerTick * bondBonus;

  // Allied aid
  if ((state.upgrades.c_allied_aid?.level ?? 0) > 0 && state.tick % 50 === 0) {
    c.money += (state.upgrades.c_allied_aid?.level ?? 0) * 500;
  }

  // Economy derivative
  const debtRatio = c.debt / state.coalitionPibBase * 100;
  const toleranceBonus = (state.upgrades.c_war_economy?.level ?? 0) * 2;
  const effectiveTolerance = c.debtBreakdownTolerance + toleranceBonus;
  const gdpBonus = (state.upgrades.c_gdp_growth?.level ?? 0) * 0.3;
  
  if (debtRatio < effectiveTolerance) {
    c.economyDerivative = 0.02 + gdpBonus;
  } else {
    const excess = debtRatio - effectiveTolerance;
    c.economyDerivative = -(excess * excess) * 0.001;
  }

  // Mine pressure on economy
  c.economy = Math.max(0, Math.min(100, c.economy + c.economyDerivative - r.kamikazeMineCount * 0.5));

  // Trade routes income
  const tradeBonus = 1 + (state.upgrades.c_trade_routes?.level ?? 0) * 0.05;
  c.money += 10 * tradeBonus;

  // War cost
  c.warCostPerSec = c.patriots * 50 + c.miniguns * 10 + c.radarSpots * 20;
  c.money -= c.warCostPerSec / 10;
  c.debt += c.warCostPerSec / 10;

  // Scan cooldown/timer
  if (c.scanCooldown > 0) {
    c.scanCooldown -= 1;
    if (c.scanCooldown <= 0) c.scanAvailable = true;
  }
  if (c.scanActive) {
    c.scanTimer -= 1;
    if (c.scanTimer <= 0) {
      c.scanActive = false;
      // Un-reveal all bases
      r.bases.forEach(b => { b.revealed = false; });
    }
  }

  // === COMBAT ===
  // Auto-launch from stocks
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

  // Coalition auto-launch
  let strikesLaunched = 0;
  if (c.strikeStock.autoLaunch && c.strikeStock.stock > 0) {
    c.strikeStock.stock -= 1;
    strikesLaunched += 1;
  }

  // Interception
  const stealthReduction = 1 - (state.upgrades.r_stealth_drones?.level ?? 0) * 0.08;
  const decoyReduction = 1 - (state.upgrades.r_decoy_missiles?.level ?? 0) * 0.08;
  const patriotUpgrade = 1 + (state.upgrades.c_patriot_upgrade?.level ?? 0) * 0.15;
  const minigunUpgrade = 1 + (state.upgrades.c_minigun_upgrade?.level ?? 0) * 0.2;

  // Miniguns: excellent vs drones, useless vs missiles
  const minigunAntiDrone = c.miniguns * 4 * minigunUpgrade * stealthReduction;
  // Patriots: excellent vs missiles, wasteful vs drones
  const patriotAntiMissile = c.patriots * 3 * patriotUpgrade * decoyReduction;
  const patriotAntiDrone = c.patriots * 0.5; // bad efficiency
  // Laser
  const laserIntercept = c.laserDefense;
  // Fighters intercept drones well
  const fighterIntercept = c.fighterStock.stock * 2;

  const totalAntiDrone = minigunAntiDrone + patriotAntiDrone + laserIntercept + fighterIntercept;
  const totalAntiMissile = patriotAntiMissile;

  const dronesIntercepted = Math.min(dronesLaunched, Math.floor(totalAntiDrone));
  const missilesIntercepted = Math.min(missilesLaunched, Math.floor(totalAntiMissile));

  const droneImpacts = Math.max(0, dronesLaunched - dronesIntercepted);
  const missileImpacts = Math.max(0, missilesLaunched - missilesIntercepted);

  // Interception rate for public support
  const totalIncoming = dronesLaunched + missilesLaunched;
  const totalIntercepted = dronesIntercepted + missilesIntercepted;
  const interceptionRate = totalIncoming > 0 ? totalIntercepted / totalIncoming : 1;

  // Public support derivative
  const mediaBonus = 1 - (state.upgrades.c_media_campaign?.level ?? 0) * 0.1;
  const censorshipBonus = 1 - (state.upgrades.c_censorship?.level ?? 0) * 0.12;
  const fatiguResist = 1 - (state.upgrades.c_war_fatigue_resist?.level ?? 0) * 0.1;

  let supportChange = 0;
  // Missile interception > 95% = positive
  if (interceptionRate > 0.95 && totalIncoming > 0) {
    supportChange += 0.05;
  } else if (totalIncoming > 0) {
    const deficit = 0.95 - interceptionRate;
    supportChange -= deficit * deficit * 5;
  }
  // Impacts
  supportChange -= missileImpacts * 1.5 * censorshipBonus;
  supportChange -= droneImpacts * 0.2 * mediaBonus;
  // War fatigue
  supportChange -= 0.02 * fatiguResist;

  // Carpet bombing penalty
  if ((state.upgrades.c_carpet?.level ?? 0) > 0) {
    supportChange -= 0.08 * (state.upgrades.c_carpet?.level ?? 0);
  }

  c.publicSupportDerivative = supportChange;
  c.publicSupport = Math.max(0, Math.min(100, c.publicSupport + supportChange));

  // Hand Free = economy * publicSupport / 100
  c.handFree = (c.economy / 100) * (c.publicSupport / 100) * 100;

  // Fervor from hits
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
        // Pick a target base
        const targetableBases = aliveBases.filter(b => {
          if (b.burialLevel > bunkerBuster) return false;
          if ((b.type === 'civilian' || b.type === 'fake') && !b.revealed && !c.scanActive) return false;
          return true;
        });
        // Without scan, can also hit civilian/fake thinking they're military
        const allVisible = aliveBases.filter(b => {
          if (b.burialLevel > bunkerBuster) return false;
          if (b.type === 'civilian' || b.type === 'fake') {
            return b.revealed || !c.scanActive; // without scan, they look military
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
            r.fervor = Math.max(0, r.fervor - 3); // regime also loses fervor from civilian deaths
          } else {
            target.alive = false;
            basesDestroyed += 1;
            c.successfulStrikes += 1;
          }
        }
      }
    }
  }

  // Embedded journalists: strikes boost support
  if (basesDestroyed > 0 && (state.upgrades.c_embedded_journalists?.level ?? 0) > 0) {
    c.publicSupport = Math.min(100, c.publicSupport + basesDestroyed * 0.5 * (state.upgrades.c_embedded_journalists?.level ?? 0));
  }

  // Nuclear check
  if (r.resilience >= 95 && !r.nuclearUnlocked && !state.milestones.nuclear_unlocked) {
    r.nuclearUnlocked = true;
    // Create a hidden nuclear base
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
  const antiMissileStrength = patriotAntiMissile;
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

// Coalition: Buy Patriot (construction)
export function buyPatriot(state: GameState): GameState {
  if (state.coalition.money < state.coalition.patriotCost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.money -= s.coalition.patriotCost;
  s.coalition.debt += s.coalition.patriotCost;
  s.coalition.patriots += 1;
  return s;
}

// Coalition: Buy Minigun
export function buyMinigun(state: GameState): GameState {
  if (state.coalition.money < state.coalition.minigunCost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.money -= s.coalition.minigunCost;
  s.coalition.debt += s.coalition.minigunCost;
  s.coalition.miniguns += 1;
  return s;
}

// Coalition: Build Radar Spot
export function buildRadar(state: GameState): GameState {
  if (state.coalition.money < state.coalition.radarSpotCost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.money -= s.coalition.radarSpotCost;
  s.coalition.debt += s.coalition.radarSpotCost;
  s.coalition.radarSpots += 1;
  return s;
}

// Coalition: Buy Strike (into stock)
export function buyStrike(state: GameState): GameState {
  const cost = 800;
  if (state.coalition.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.money -= cost;
  s.coalition.debt += cost;
  s.coalition.strikeStock.producing = true;
  s.coalition.strikeStock.productionProgress = 0;
  return s;
}

// Coalition: Buy Fighter (into stock)
export function buyFighter(state: GameState): GameState {
  const cost = 2000;
  if (state.coalition.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.money -= cost;
  s.coalition.debt += cost;
  s.coalition.fighterStock.producing = true;
  s.coalition.fighterStock.productionProgress = 0;
  return s;
}

// Coalition: Launch strikes from stock
export function launchStrikes(state: GameState, count: number): GameState {
  const available = Math.min(count, state.coalition.strikeStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.strikeStock.stock -= available;
  return s;
}

// Coalition: Launch fighters from stock
export function launchFighters(state: GameState, count: number): GameState {
  const available = Math.min(count, state.coalition.fighterStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.fighterStock.stock -= available;
  return s;
}

// Coalition: Treasury Bonds
export function issueBonds(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const bondAmount = 5000;
  s.coalition.debt += bondAmount;
  s.coalition.incomePerTick += 5; // permanent income per tick
  s.coalition.debtBreakdownTolerance += 0.5;
  return s;
}

// Coalition: Public Tax
export function publicTax(state: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const taxAmount = 2000;
  s.coalition.debt = Math.max(0, s.coalition.debt - taxAmount);
  s.coalition.money += taxAmount;
  s.coalition.publicSupport = Math.max(0, s.coalition.publicSupport - 5);
  return s;
}

// Coalition: Activate Scan
export function activateScan(state: GameState): GameState {
  if (!state.coalition.scanAvailable || state.coalition.scanActive) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.scanActive = true;
  const scanDuration = 15 + (state.upgrades.c_scan_upgrade?.level ?? 0) * 7;
  s.coalition.scanTimer = scanDuration;
  s.coalition.scanAvailable = false;
  s.coalition.scanCooldown = 60;
  // Reveal bases in scan zone
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

// Regime: Build Base
export function regimeBuildBase(state: GameState, type: 'military' | 'civilian' | 'fake' = 'military'): GameState {
  const cost = type === 'military' ? state.regime.baseCost : type === 'civilian' ? state.regime.baseCost * 0.6 : state.regime.baseCost * 0.3;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.bases.push(createBase(type));
  return s;
}

// Regime: Bury Base
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

// Regime: Buy drones (into stock)
export function buyDrones(state: GameState, count: number): GameState {
  const fervorDiscount = Math.max(0.3, 1 - state.regime.fervor * 0.005);
  const cost = state.regime.droneCost * fervorDiscount * count;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.droneStock.stock += count;
  return s;
}

// Regime: Buy missiles (into stock)
export function buyMissiles(state: GameState, count: number): GameState {
  const fervorDiscount = Math.max(0.3, 1 - state.regime.fervor * 0.005);
  const cost = state.regime.missileCost * fervorDiscount * count;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.missileStock.stock += count;
  return s;
}

// Regime: Launch drones from stock
export function regimeLaunchDrones(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.droneStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.droneStock.stock -= available;
  s.regime.totalDronesLaunched += available;
  return s;
}

// Regime: Launch missiles from stock
export function regimeLaunchMissiles(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.missileStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.missileStock.stock -= available;
  s.regime.totalMissilesLaunched += available;
  return s;
}

// Regime: Oil Shipping
export function oilShipping(state: GameState): GameState {
  const cost = 20 + state.regime.oilShippingLevel * 10;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost;
  s.regime.oilShippingLevel += 1;
  return s;
}

// Regime: Kamikaze Mine
export function deployKamikazeMine(state: GameState): GameState {
  if (state.regime.money < state.regime.kamikazeMineCost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= s.regime.kamikazeMineCost;
  s.regime.kamikazeMineCount += 1;
  s.regime.fervor = Math.max(0, s.regime.fervor - 2);
  return s;
}

// Regime: Radar Lockdown
export function radarLockdown(state: GameState): GameState {
  if (!state.regime.radarLockdownAvailable) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.radarLockdownAvailable = false;
  const jamDuration = 20 + (state.upgrades.r_radar_jam?.level ?? 0) * 6;
  s.regime.radarLockdownCooldown = 80;
  // Disable coalition scan for duration
  if (s.coalition.scanActive) {
    s.coalition.scanActive = false;
    s.coalition.scanTimer = 0;
    s.regime.bases.forEach(b => { b.revealed = false; });
  }
  s.coalition.scanAvailable = false;
  s.coalition.scanCooldown = jamDuration;
  return s;
}

// Research
export function startResearch(state: GameState, upgradeId: string): GameState {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return state;
  const u = state.upgrades[upgradeId];
  if (!u || u.researching || u.level >= upgrade.maxLevel) return state;

  const cost = getUpgradeCost(upgrade, u.level);
  // Coalition pays with money (adds debt), regime pays with money
  if (upgrade.side === 'coalition' && state.coalition.money < cost) return state;
  if (upgrade.side === 'regime' && state.regime.money < cost) return state;

  const s: GameState = JSON.parse(JSON.stringify(state));
  if (upgrade.side === 'coalition') {
    s.coalition.money -= cost;
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
  return state.coalition.money >= cost;
}
