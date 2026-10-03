import { GameState, CombatLog, GamePhase, RegimeBase } from './types';
import type { BalanceConfig } from './balance';
import { getUpgrades, getUpgradeCost } from './upgrades';
import { runRegimeAI, runCoalitionAI } from './ai';

let baseIdCounter = 0;
function genBaseId(): string { return `base_${baseIdCounter++}`; }

let lastSpawnSector: 'north' | 'south' = 'south';

function createBase(balance: BalanceConfig, type: 'military' | 'civilian' | 'fake' = 'military'): RegimeBase {
  const cb = balance.createBase;
  const sector = lastSpawnSector === 'north' ? 'south' : 'north';
  lastSpawnSector = sector;

  // North: y < 0.5 (scaled by range), South: y >= 0.5
  const yBase = sector === 'north' ? 0.1 : 0.6;
  const yRand = Math.random() * 0.3;

  return {
    id: genBaseId(), type, burialLevel: 0,
    scansRequired: type === 'military' ? 0 : type === 'civilian' ? cb.civilianScansRequired : cb.fakeScansRequired,
    scansReceived: 0, revealed: false, revealedType: null, alive: true,
    x: cb.xMin + Math.random() * cb.xRange, 
    y: yBase + yRand,
    visibleAfterScan: false, hiddenBase: false, knownToCoalition: false,
  };
}

export function createInitialState(balance: BalanceConfig): GameState {
  const upgrades: Record<string, { level: number; researching: boolean; researchProgress: number; researchTarget: number }> = {};
  const upgradeList = getUpgrades(balance);
  upgradeList.forEach((u) => { upgrades[u.id] = { level: 0, researching: false, researchProgress: 0, researchTarget: u.researchTime }; });

  const ri = balance.regime.initial;
  const ci = balance.coalition.initial;
  const bases: RegimeBase[] = [];
  for (let i = 0; i < balance.global.militaryBaseCount; i++) bases.push(createBase(balance, 'military'));

  return {
    tick: 0, running: false, speed: 1, role: 'both', phase: 'early',
    regime: {
      money: ri.money, moneyRegen: ri.moneyRegen, oilShippingLevel: 0,
      fervor: ri.fervor, dispersion: ri.dispersion, resilience: ri.resilience,
      bases, baseCost: ri.baseCost, baseBuildQueue: [],
      droneStock: { stock: ri.initialDroneStock, producing: false, productionProgress: 0, productionTime: ri.droneProductionTime, autoBuy: false, autoLaunch: false },
      missileStock: { stock: ri.initialMissileStock, producing: false, productionProgress: 0, productionTime: ri.missileProductionTime, autoBuy: false, autoLaunch: false },
      droneCost: ri.droneCost, missileCost: ri.missileCost,
      totalDronesLaunched: 0, totalMissilesLaunched: 0,
      manualDronesToLaunch: 0, manualMissilesToLaunch: 0,
      flyingDrones: [], flyingMissiles: [],
      antiAirLevel: 0, kamikazeMineCount: 0, kamikazeMineCost: ri.kamikazeMineCost,
      radarLockdownAvailable: true, radarLockdownCooldown: 0,
      radarLockdownActive: false, radarLockdownTimer: 0,
      nuclearUnlocked: false, nuclearProgress: 0, nuclearBaseId: null,
      droneBias: ri.droneBias, missileBias: ri.missileBias, totalMoneySpent: 0, totalBasesBuilt: balance.global.militaryBaseCount, totalDroneImpacts: 0, totalMissileImpacts: 0,
    },
    coalition: {
      debt: 0, prevDebt: 0, incomePerTick: 0, debtBreakdownTolerance: ci.debtBreakdownTolerance, publicTaxLevel: 0,
      economy: ci.economy, economyDerivative: 0, publicSupport: ci.publicSupport, publicSupportDerivative: 0, handFree: ci.handFree,
      strikeStock: { stock: ci.initialStrikeStock, producing: false, productionProgress: 0, productionTime: ci.strikeProductionTime, autoBuy: false, autoLaunch: false },
      fighterStock: { stock: ci.initialFighterStock, producing: false, productionProgress: 0, productionTime: ci.fighterProductionTime, autoBuy: false, autoLaunch: false },
      interceptorStock: ci.interceptorStock,
      interceptorMax: ci.patriots * balance.coalition.patriots.interceptorsPerPatriot,
      interceptorRechargeTimer: 0,
      interceptorRechargeTime: ci.interceptorRechargeTime,
      patriots: ci.patriots, patriotCost: ci.patriotCost, miniguns: ci.miniguns, minigunCost: ci.minigunCost, radarSpots: ci.radarSpots, radarSpotCost: ci.radarSpotCost,
      patriotUnits: Array(ci.patriots).fill(0).map(() => ({ reloadTimer: 0 })),
      fogOfWarLimit: ci.fogOfWarLimit,
      scanAvailable: true, scanActive: false, scanTimer: 0, scanZoneX: ci.scanZoneX, scanZoneY: ci.scanZoneY,
      scanConsecutiveCount: 0, scanBaseCost: ci.scanBaseCost,
      scanSector: 'north',
      scanSizeMultiplier: 1.0,
      totalStrikes: 0, successfulStrikes: 0, manualStrikesToLaunch: 0, flyingStrikes: [], strikePower: ci.strikePower, strikeAccuracy: ci.strikeAccuracy, intelligenceModifier: ci.intelligenceModifier,
      laserDefense: 0, maintenanceCost: ci.maintenanceCost, recentStrikeTimestamps: [],
      totalIntercepted: 0, totalIncoming: 0,
      totalMissilesIncoming: 0, totalMissilesIntercepted: 0,
      totalDronesIncoming: 0, totalDronesIntercepted: 0,
      totalPatriotShots: 0,
      totalMinigunKills: 0, totalDronePatriotKills: 0,
      totalMinigunBullets: 0,
      radarDamage: 0,
      fearBusinessAvailable: false, fearBusinessActive: false, fearBusinessTimer: 0,
      flyingFighters: [], manualFightersToLaunch: 0, fighterReloadCost: ci.fighterReloadCost,
      minigunFireRate: ci.minigunFireRate, minigunProjectileSpeed: ci.minigunProjectileSpeed, totalDebtAccumulated: 0, totalFightersLaunched: 0,
    },
    upgrades, combatLog: [], gameOver: false, winner: null, winReason: '',
    autoFireRegime: false, autoFireCoalition: false,
    coalitionPibBase: balance.global.coalitionPibBase, milestones: {},
  };
}

function determinePhase(state: GameState, balance: BalanceConfig): GamePhase {
  if (state.regime.nuclearUnlocked) return 'nuclear';
  if (state.tick < balance.phases.earlyMaxTickExclusive) return 'early';
  if (state.tick < balance.phases.midMaxTickExclusive) return 'mid';
  return 'late';
}

function processResearch(state: GameState, balance: BalanceConfig) {
  const upgradeList = getUpgrades(balance);
  for (const id of Object.keys(state.upgrades)) {
    const u = state.upgrades[id];
    if (u.researching) {
      u.researchProgress += 1;
      if (u.researchProgress >= u.researchTarget) {
        u.level += 1;
        u.researching = false;
        u.researchProgress = 0;
        const def = upgradeList.find((up) => up.id === id);
        if (def) def.effect(state, u.level);
      }
    }
  }
}

function processStockProduction(state: GameState, balance: BalanceConfig) {
  const sp = balance.simulation.production;
  const ab = balance.simulation.autoBuy;
  const fd = balance.simulation.fervor;
  const r = state.regime;
  const c = state.coalition;

  const droneTimeReduction = 1 - (state.upgrades.r_drone_factory?.level ?? 0) * sp.droneFactoryTimeReductionPerLevel;
  const reloadDroneBonus = 1 - (state.upgrades.r_drone_reload?.level ?? 0) * sp.droneReloadTimeReductionPerLevel;
  const effectiveDroneTime = Math.max(sp.minDroneProductionTicks, r.droneStock.productionTime * droneTimeReduction * reloadDroneBonus);
  if (r.droneStock.producing) {
    r.droneStock.productionProgress += 1;
    if (r.droneStock.productionProgress >= effectiveDroneTime) {
      r.droneStock.stock += 1;
      r.droneStock.productionProgress = 0;
      r.droneStock.producing = false;
    }
  }
  const fervorDiscount = Math.max(fd.discountMin, 1 - r.fervor * fd.discountPerFervor);
  const effectiveDroneCost = r.droneCost * fervorDiscount;
  if (r.droneStock.autoBuy && !r.droneStock.producing && r.money >= effectiveDroneCost) {
    r.money -= effectiveDroneCost; r.totalMoneySpent += effectiveDroneCost;
    r.droneStock.producing = true;
    r.droneStock.productionProgress = 0;
  }

  const missileTimeReduction = 1 - (state.upgrades.r_missile_factory?.level ?? 0) * sp.missileFactoryTimeReductionPerLevel;
  const reloadMissileBonus = 1 - (state.upgrades.r_missile_reload?.level ?? 0) * sp.missileReloadTimeReductionPerLevel;
  const effectiveMissileTime = Math.max(sp.minMissileProductionTicks, r.missileStock.productionTime * missileTimeReduction * reloadMissileBonus);
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
    r.money -= effectiveMissileCost; r.totalMoneySpent += effectiveMissileCost;
    r.missileStock.producing = true;
    r.missileStock.productionProgress = 0;
  }

  const strikeReloadBonus = 1 - (state.upgrades.c_strike_reload?.level ?? 0) * sp.strikeReloadTimeReductionPerLevel;
  const effectiveStrikeTime = Math.max(sp.minStrikeProductionTicks, c.strikeStock.productionTime * strikeReloadBonus);
  // Place order immediately if autoBuy is on and nothing in queue
  if (c.strikeStock.autoBuy && !c.strikeStock.producing) {
    c.debt += ab.strikeOrderDebt; c.totalDebtAccumulated += ab.strikeOrderDebt;
    c.strikeStock.producing = true;
  }
  if (c.strikeStock.producing) {
    c.strikeStock.productionProgress += 1;
    while (c.strikeStock.productionProgress >= effectiveStrikeTime) {
      c.strikeStock.stock += 1;
      c.strikeStock.productionProgress -= effectiveStrikeTime;
      if (c.strikeStock.autoBuy) {
        // Immediately start next order for continuous production
        c.debt += ab.strikeOrderDebt; c.totalDebtAccumulated += ab.strikeOrderDebt;
        // producing stays true
      } else {
        c.strikeStock.producing = false;
        break;
      }
    }
  }

  const fighterReloadBonus = 1 - (state.upgrades.c_fighter_reload?.level ?? 0) * sp.fighterReloadTimeReductionPerLevel;
  const effectiveFighterTime = Math.max(sp.minFighterProductionTicks, c.fighterStock.productionTime * fighterReloadBonus);
  // Place order immediately if autoBuy is on and nothing in queue
  if (c.fighterStock.autoBuy && !c.fighterStock.producing) {
    c.debt += ab.fighterOrderDebt; c.totalDebtAccumulated += ab.fighterOrderDebt;
    c.fighterStock.producing = true;
  }
  if (c.fighterStock.producing) {
    c.fighterStock.productionProgress += 1;
    while (c.fighterStock.productionProgress >= effectiveFighterTime) {
      c.fighterStock.stock += 1;
      c.fighterStock.productionProgress -= effectiveFighterTime;
      if (c.fighterStock.autoBuy) {
        c.debt += ab.fighterOrderDebt; c.totalDebtAccumulated += ab.fighterOrderDebt;
        // producing stays true
      } else {
        c.fighterStock.producing = false;
        break;
      }
    }
  }



  const ipp = balance.coalition.patriots.interceptorsPerPatriot;
  const minReload = balance.coalition.patriots.minInterceptorReloadTicks;
  c.interceptorMax = c.patriots * ipp;
  if (c.interceptorStock < c.interceptorMax) {
    c.interceptorRechargeTimer += 1;
    const rechargeSpeed = Math.max(minReload, c.interceptorRechargeTime);
    if (c.interceptorRechargeTimer >= rechargeSpeed) {
      const rechargeCount = Math.min(5, c.patriots, c.interceptorMax - c.interceptorStock);
      c.interceptorStock = Math.min(c.interceptorMax, c.interceptorStock + rechargeCount);
      c.interceptorRechargeTimer = 0;
    }
  }
}

export const MISSILE_FLIGHT_TIME = 12;
export const DRONE_FLIGHT_TIME = 30;
export const STRIKE_FLIGHT_TIME = 8;
export const FIGHTER_PATROL_TIME = 20;
export const FIGHTER_RETURN_TIME = 40; 
export const FIGHTER_RELOAD_TIME = 200;
export const FIGHTER_STRAFE_CHANCE = 0.02;

export function gameTick(prev: GameState, balance: BalanceConfig): GameState {
  if (prev.gameOver) return prev;
  let state: GameState = JSON.parse(JSON.stringify(prev));
  state.tick += 1;

  // AUTO AI PROCESSING
  if (state.role === 'coalition' || state.role === 'observer') {
    state = runRegimeAI(state, balance);
  }
  if (state.role === 'regime' || state.role === 'observer') {
    state = runCoalitionAI(state, balance);
  }

  state.phase = determinePhase(state, balance);
  const r = state.regime;
  const c = state.coalition;
  const ce = balance.coalition.economy;
  const sc = balance.simulation.combat;
  const su = balance.simulation.upgrades;
  const re = balance.regime.economy;
  const ps = balance.global.percentScale;

  const aliveBases = r.bases.filter((b) => b.alive);

  // Update Patriot reload timers
  const interceptorReloadBonus = 1 - (state.upgrades.c_interceptor_reload?.level ?? 0) * (balance.upgrades['c_interceptor_reload']?.interceptorRechargeReductionPerLevel ?? 0.15);
  const minRC = balance.coalition.patriots.minInterceptorReloadTicks;
  const currentRechargeTime = Math.max(minRC, Math.round(c.interceptorRechargeTime * interceptorReloadBonus));
  c.patriotUnits.forEach(u => {
    if (u.reloadTimer > 0) u.reloadTimer -= 1;
  });

  const upgradeList = getUpgrades(balance);

  processResearch(state, balance);
  processStockProduction(state, balance);

  upgradeList.forEach((u) => {
    const lvl = state.upgrades[u.id]?.level ?? 0;
    if (lvl > 0) u.effect(state, lvl);
  });

  const oilRefBonus = 1 + (state.upgrades.r_oil_refinery?.level ?? 0) * su.oilRefineryBonusPerLevel;
  const smugglingReduction = 1 - (state.upgrades.r_smuggling?.level ?? 0) * su.smugglingReductionPerLevel;
  const oilDiminishing = Math.max(re.oilDiminishingMin, 1 - r.oilShippingLevel * re.oilDiminishingPerShippingLevel * smugglingReduction);
  r.moneyRegen = re.moneyRegenBase + r.oilShippingLevel * re.oilShippingIncomePerLevel * oilDiminishing * oilRefBonus + aliveBases.length * re.moneyRegenPerAliveBase;
  r.money += r.moneyRegen;

  const totalBurial = aliveBases.reduce((s, b) => s + b.burialLevel, 0);
  r.dispersion = Math.min(re.dispersionCap, re.dispersionBase + aliveBases.length * re.dispersionPerBase + totalBurial * re.dispersionPerBurialLevel);

  const burialFervorBonus = totalBurial * re.burialFervorPerTotalBurial;

  const propagandaBonus = (state.upgrades.r_propaganda?.level ?? 0) * su.propagandaFervorPerLevel;
  const cultReduction = 1 - (state.upgrades.r_cult_personality?.level ?? 0) * su.cultFervorDecayReductionPerLevel;
  r.fervor = Math.min(re.fervorCap, Math.max(0, r.fervor + propagandaBonus + burialFervorBonus));
  r.fervor = Math.max(0, r.fervor - re.fervorDecay * cultReduction);
  r.resilience = (r.fervor / ps) * (r.dispersion / ps) * ps;

  if ((state.upgrades.r_volunteer_army?.level ?? 0) > 0 && r.fervor > re.volunteerArmyFervorThreshold) {
    const freeRate = (state.upgrades.r_volunteer_army?.level ?? 0) * re.volunteerArmyFreeRatePerLevel;
    if (Math.random() < freeRate) r.droneStock.stock += 1;
  }

  const finishedBases: number[] = [];
  for (let i = 0; i < r.baseBuildQueue.length; i++) {
    r.baseBuildQueue[i].timer -= 1;
    if (r.baseBuildQueue[i].timer <= 0) {
      r.bases.push(createBase(balance, r.baseBuildQueue[i].type)); r.totalBasesBuilt += 1;
      finishedBases.push(i);
    }
  }
  for (let i = finishedBases.length - 1; i >= 0; i--) {
    r.baseBuildQueue.splice(finishedBases[i], 1);
  }

  const rl = balance.regime.radarLockdown;
  if (r.radarLockdownActive) {
    r.radarLockdownTimer -= 1;
    if (r.radarLockdownTimer <= 0) {
      r.radarLockdownActive = false;
    }
  }
  if (r.radarLockdownCooldown > 0) {
    r.radarLockdownCooldown -= 1;
    if (r.radarLockdownCooldown <= 0) r.radarLockdownAvailable = true;
  }
  const constructionCostBonus = 1 - (state.upgrades.c_construction_speed?.level ?? 0) * su.constructionSpeedMaintenanceBonusPerLevel;
  c.maintenanceCost = (ce.maintenanceBase + c.patriots * ce.maintenancePerPatriot + c.miniguns * ce.maintenancePerMinigun + c.radarSpots * ce.maintenancePerRadar)
    * Math.max(ce.maintenanceCostMinMultiplier, constructionCostBonus);

  c.prevDebt = prev.coalition.debt;
  c.debt += c.maintenanceCost / ce.debtFromMaintenanceDivisor; c.totalDebtAccumulated += c.maintenanceCost / ce.debtFromMaintenanceDivisor;

  const bondBonus = 1 + (state.upgrades.c_war_bonds_upgrade?.level ?? 0) * su.warBondsIncomeBonusPerLevel;
  const income = c.incomePerTick * bondBonus;
  c.debt = Math.max(0, c.debt - income);

  if ((state.upgrades.c_allied_aid?.level ?? 0) > 0 && state.tick % ce.alliedAidTickInterval === 0) {
    c.debt = Math.max(0, c.debt - (state.upgrades.c_allied_aid?.level ?? 0) * ce.alliedAidDebtReductionPerLevel);
  }

  const tradeReduction = (state.upgrades.c_trade_routes?.level ?? 0) * ce.tradeRouteDebtReductionPerLevel;
  c.debt = Math.max(0, c.debt - ce.tradeRouteDebtReductionBase - tradeReduction);

  const debtRatio = c.debt / state.coalitionPibBase * ce.debtRatioToPercentMultiplier;
  const toleranceBonus = (state.upgrades.c_war_economy?.level ?? 0) * ce.warEconomyToleranceBonusPerLevel;
  const effectiveTolerance = c.debtBreakdownTolerance + toleranceBonus;
  const gdpBonus = (state.upgrades.c_gdp_growth?.level ?? 0) * ce.gdpGrowthDerivativePerLevel;
  const publicTaxBonus = c.publicTaxLevel * ce.publicTaxDerivativePerLevel;

  if (debtRatio < effectiveTolerance) {
    c.economyDerivative = ce.positiveEconomyDerivative + gdpBonus + publicTaxBonus;
  } else {
    const excess = debtRatio - effectiveTolerance;
    c.economyDerivative = -(excess * excess) * ce.debtExcessPenaltyCoefficient + publicTaxBonus;
  }

  if (c.debt <= c.prevDebt && c.debt > 0) {
    c.economyDerivative += ce.debtStabilityBonus;
  }

  c.economy = Math.max(0, Math.min(ce.economyCap, c.economy + c.economyDerivative - r.kamikazeMineCount * re.kamikazeEconomyPenaltyPerMine));

  const fog = balance.coalition.fog;
  if (r.radarLockdownActive) {
    c.fogOfWarLimit = fog.lockdownLimit;
  } else {
    const additionalSpots = Math.max(0, c.radarSpots - balance.coalition.initial.radarSpots);
    c.fogOfWarLimit = balance.coalition.initial.fogOfWarLimit + additionalSpots * fog.radarSpotVisibilityPerSpot;
    c.fogOfWarLimit = Math.min(fog.radarMaxVisibility, c.fogOfWarLimit);
  }

  const scanCfg = balance.coalition.scan;
  if (!c.scanActive && c.scanConsecutiveCount > 0 && state.tick % scanCfg.consecutiveDecayTickInterval === 0) {
    c.scanConsecutiveCount = Math.max(0, c.scanConsecutiveCount - 1);
  }

  if (c.scanActive) {
    c.scanTimer -= 1;
    if (state.tick % scanCfg.fakeRemovalTickModulo === 0) {
      const fakes = r.bases.filter((b) => b.alive && b.type === 'fake' && b.revealed);
      if (fakes.length > 0) {
        fakes[0].alive = false;
      }
    }
    if (c.scanTimer <= 0) {
      c.scanActive = false;
      c.scanAvailable = true;
      r.bases.forEach((b) => {
        if (!b.alive) return;
        // Elimination of identified decoys at scan end
        if (b.type === 'fake' && b.revealed) {
          b.alive = false;
          return;
        }
        b.revealed = false;
        b.revealedType = null;
        if (b.burialLevel > 0 && b.type === 'military') {
          b.knownToCoalition = false; // They hide well if buried
          b.hiddenBase = true;
        }
      });
    }
  }

  const fbTh = ce.fearBusinessPublicSupportThreshold;
  c.fearBusinessAvailable = c.publicSupport <= fbTh && !c.fearBusinessActive;
  if (c.fearBusinessActive) {
    c.fearBusinessTimer -= 1;
    if (c.fearBusinessTimer <= 0) {
      c.fearBusinessActive = false;
    }
  }

  // Strike launches
  let newlyLaunchedStrikes = c.manualStrikesToLaunch || 0;
  c.manualStrikesToLaunch = 0;
  if (c.strikeStock.autoLaunch && c.strikeStock.stock > 0 && newlyLaunchedStrikes === 0) {
    const batch = Math.min(c.strikeStock.stock, sc.autoLaunchStrikesPerTick);
    c.strikeStock.stock -= batch;
    newlyLaunchedStrikes += batch;
    c.totalStrikes += batch; 
  }
  if (newlyLaunchedStrikes > 0) {
    c.flyingStrikes = c.flyingStrikes || [];
    const revealedBases = r.bases.filter(b => b.alive && b.revealed);
    const knownBases = r.bases.filter(b => b.alive && b.knownToCoalition);
    const primaryTargets = revealedBases.length > 0 ? revealedBases : knownBases;
    
    // Individualize strikes for visual staggering
    for (let i = 0; i < newlyLaunchedStrikes; i++) {
      // DEFAULT: Target a random point in the regime territory (prevents sticking to home side)
      let tx = 0.3 + Math.random() * 0.5, ty = 0.1 + Math.random() * 0.8;
      
      if (primaryTargets.length > 0) {
        const b = primaryTargets[Math.floor(Math.random() * primaryTargets.length)];
        tx = b.x; ty = b.y;
      }
      
      c.flyingStrikes.push({ 
        launched: 1, intercepted: 0, impacts: 1, 
        timer: STRIKE_FLIGHT_TIME + Math.floor(i * 0.5),
        targetX: tx, targetY: ty
      });
    }
  }

  // Drone launches
  let newlyLaunchedDrones = r.manualDronesToLaunch || 0;
  r.manualDronesToLaunch = 0;
  if (r.droneStock.autoLaunch && r.droneStock.stock > 0 && newlyLaunchedDrones === 0) {
    const batch = Math.min(r.droneStock.stock, sc.autoLaunchMaxDrones);
    r.droneStock.stock -= batch;
    newlyLaunchedDrones += batch;
    r.totalDronesLaunched += batch;
  }
  if (newlyLaunchedDrones > 0) {
    r.flyingDrones = r.flyingDrones || [];
    // Individualize for swarm effect
    for (let i = 0; i < newlyLaunchedDrones; i++) {
      r.flyingDrones.push({ 
        launched: 1, intercepted: 0, impacts: 0, 
        timer: DRONE_FLIGHT_TIME + Math.floor(i * 0.8),
        targetX: 0.08, targetY: 0.1 + Math.random() * 0.8
      });
    }
  }

  // Missile launches
  let newlyLaunchedMissiles = r.manualMissilesToLaunch || 0;
  r.manualMissilesToLaunch = 0;
  if (r.missileStock.autoLaunch && r.missileStock.stock > 0 && newlyLaunchedMissiles === 0) {
    const batch = Math.min(r.missileStock.stock, sc.autoLaunchMaxMissiles);
    r.missileStock.stock -= batch;
    newlyLaunchedMissiles += batch;
    r.totalMissilesLaunched += batch;
  }
  if (newlyLaunchedMissiles > 0) {
    r.flyingMissiles = r.flyingMissiles || [];
    // Individualize missiles
    for (let i = 0; i < newlyLaunchedMissiles; i++) {
      r.flyingMissiles.push({ 
        launched: 1, intercepted: 0, impacts: 0, 
        timer: MISSILE_FLIGHT_TIME + Math.floor(i * 1.2),
        targetX: 0.08, targetY: 0.1 + Math.random() * 0.8
      });
    }
  }

  // Fighter launches
  let newlyLaunchedFighters = c.manualFightersToLaunch || 0;
  c.manualFightersToLaunch = 0;
  if (c.fighterStock.autoLaunch && c.fighterStock.stock > 0 && newlyLaunchedFighters === 0) {
    const batch = Math.min(c.fighterStock.stock, 1);
    c.fighterStock.stock -= batch;
    newlyLaunchedFighters += batch;
  }
  if (newlyLaunchedFighters > 0) {
    c.flyingFighters = c.flyingFighters || [];
    for (let i = 0; i < newlyLaunchedFighters; i++) {
      c.flyingFighters.push({
        id: Math.random().toString(36).substr(2, 9),
        state: 'patrol',
        timer: FIGHTER_PATROL_TIME,
        maxTimer: FIGHTER_PATROL_TIME,
        targetX: 0.6 + Math.random() * 0.3,
        targetY: 0.1 + Math.random() * 0.8
      });
    }
  }

  const patrol = balance.coalition.fighterPatrol;
  let extraDroneIntercept = 0;
  let activeFightersCount = 0;
  
  c.flyingFighters = (c.flyingFighters || []).map(f => {
    f.timer -= 1;
    if (f.state === 'patrol') {
      activeFightersCount += 1;
      
      // Damage window: only shoot when progress is > 0.8 (Final approach over targets)
      const progress = 1 - (f.timer / f.maxTimer);
      if (progress > 0.8 && Math.random() < FIGHTER_STRAFE_CHANCE) {
        const validTargets = aliveBases.filter(b => b.type === 'fake' || b.burialLevel <= 0);
        if (validTargets.length > 0) {
          const revealed = validTargets.filter(b => b.revealed);
          const target = revealed.length > 0 
            ? revealed[Math.floor(Math.random() * revealed.length)] 
            : validTargets[Math.floor(Math.random() * validTargets.length)];
          target.alive = false;
        }
      }
      
      if (f.timer <= 0) {
        f.state = 'returning';
        f.timer = FIGHTER_RETURN_TIME;
        f.maxTimer = FIGHTER_RETURN_TIME;
        f.targetX = 0.05 + Math.random() * 0.1;
        f.targetY = 0.2 + Math.random() * 0.6;
      }
    } else if (f.state === 'returning') {
      if (f.timer <= 0) {
        f.state = 'reloading';
        f.timer = FIGHTER_RELOAD_TIME;
        f.maxTimer = FIGHTER_RELOAD_TIME;
      }
    } else if (f.state === 'reloading') {
      if (f.timer <= 0) {
        c.debt += c.fighterReloadCost; c.totalDebtAccumulated += c.fighterReloadCost;
        c.fighterStock.stock += 1;
        return null; // Will be filtered out
      }
    }
    return f;
  }).filter(f => f !== null);

  extraDroneIntercept = activeFightersCount * patrol.dronesPerFighterIntercept;

  const stealthReduction = 1 - (state.upgrades.r_stealth_drones?.level ?? 0) * su.stealthDroneReductionPerLevel;
  const minigunUpgrade = 1 + (state.upgrades.c_minigun_upgrade?.level ?? 0) * su.minigunUpgradePerLevel;
  const minigunAntiDrone = c.miniguns * su.minigunAntiDronePerUnit * minigunUpgrade * stealthReduction;
  const laserIntercept = c.laserDefense;
  const totalAntiDroneCap = minigunAntiDrone + laserIntercept + extraDroneIntercept;
  // Drone interception happens dynamically as they cross the fog (engine handles miniguns then patriots)
  const newlyDronesIntercepted = 0;
  const newlyDroneImpacts = 0;

  const decoyReduction = 1 - (state.upgrades.r_decoy_missiles?.level ?? 0) * su.decoyMissileReductionPerLevel;
  const patriotUpgrade = 1 + (state.upgrades.c_patriot_upgrade?.level ?? 0) * su.patriotUpgradePerLevel;
  const interceptorEfficiency = patriotUpgrade * decoyReduction;

  // Missiles are no longer intercepted at launch. 
  // Interception happens during flight once they enter the radar zone.
  const newlyMissilesIntercepted = 0;
  const newlyMissileImpacts = 0; // calculated at arrival tick


  // Group push removed, handled individually above
  
  let arrivingDronesLaunched = 0;
  let arrivingDronesIntercepted = 0;
  let arrivingDroneImpacts = 0;
  
  // Bullets available this tick
  let availableMinigunBullets = Math.floor(c.miniguns * c.minigunFireRate * (1 + (state.upgrades.c_minigun_upgrade?.level ?? 0) * su.minigunUpgradePerLevel) * (1 - (state.upgrades.r_stealth_drones?.level ?? 0) * su.stealthDroneReductionPerLevel)) + Math.floor(c.laserDefense * 3) + Math.floor(extraDroneIntercept * 3);
  let bulletsFiredThisTick = 0;

  r.flyingDrones = (r.flyingDrones || []).map(group => {
    const d = { ...group, timer: group.timer - 1 };
    
    const progress = (DRONE_FLIGHT_TIME - d.timer) / DRONE_FLIGHT_TIME;
    const detectionLine = 1 - c.fogOfWarLimit;
    const isVisible = progress >= detectionLine && !r.radarLockdownActive;

    if (isVisible) {
      // 1. Minigun Auto-Cannon (Short range: 30% of map, meaning progress >= 0.70)
      if (progress >= 0.70 && availableMinigunBullets > 0) {
         const aliveDrones = d.launched - d.intercepted;
         if (aliveDrones > 0) {
            // Need 3 bullets to destroy 1 drone.
            const totalBulletsNeeded = (aliveDrones * 3) - (d.minigunDamage || 0);
            const bulletsToFire = Math.min(availableMinigunBullets, totalBulletsNeeded);
            
            d.minigunDamage = (d.minigunDamage || 0) + bulletsToFire;
            availableMinigunBullets -= bulletsToFire;
            bulletsFiredThisTick += bulletsToFire;

            const kills = Math.floor(d.minigunDamage / 3);
            const actualKills = Math.min(kills, d.launched - d.intercepted);
            if (actualKills > 0) {
               d.intercepted += actualKills;
               c.totalMinigunKills += actualKills;
               d.minigunDamage -= actualKills * 3;
            }
         }
      }

      // 2. Patriot Backup (Last resort: progress >= backupRange)
      const backupRange = sc.patriotBackupRange;
      if (progress >= backupRange) {
        let remaining = d.launched - d.intercepted;
        for (let i = 0; i < remaining; i++) {
          const readyPatriot = c.patriotUnits.find(u => u.reloadTimer <= 0);
          if (readyPatriot && c.interceptorStock > 0) {
            readyPatriot.reloadTimer = currentRechargeTime;
            c.interceptorStock -= 1;
            c.totalPatriotShots += 1;
            if (Math.random() < interceptorEfficiency) {
              d.intercepted += 1;
              c.totalDronePatriotKills += 1;
            }
          } else break;
        }
      }
    }
    return d;
  }).filter(d => {
    if (d.timer <= 0) { 
      arrivingDronesLaunched += d.launched; 
      arrivingDronesIntercepted += d.intercepted; 
      arrivingDroneImpacts += Math.max(0, d.launched - d.intercepted); 
      return false; 
    }
    return true;
  });

  c.totalMinigunBullets = (c.totalMinigunBullets || 0) + bulletsFiredThisTick;

  let arrivingMissilesLaunched = 0;
  let arrivingMissilesIntercepted = 0;
  let arrivingMissileImpacts = 0;

  r.flyingMissiles = (r.flyingMissiles || []).map(group => {
    const updatedGroup = { ...group, timer: group.timer - 1 };
    
    // Check if detected (crosses fog line)
    const progress = (MISSILE_FLIGHT_TIME - updatedGroup.timer) / MISSILE_FLIGHT_TIME;
    const detectionLine = 1 - c.fogOfWarLimit;
    const isVisible = progress >= detectionLine && !r.radarLockdownActive;

    if (isVisible) {
      // Try to intercept remaining missiles in this group
      let remainingToIntercept = updatedGroup.launched - updatedGroup.intercepted;
      for (let i = 0; i < remainingToIntercept; i++) {
        const readyPatriot = c.patriotUnits.find(u => u.reloadTimer <= 0);
        if (readyPatriot && c.interceptorStock > 0) {
          // FIRE SHOT
          readyPatriot.reloadTimer = currentRechargeTime;
          c.interceptorStock -= 1;
          c.totalPatriotShots += 1;
          if (Math.random() < interceptorEfficiency) {
            updatedGroup.intercepted += 1;
          }
        } else {
          break; // No more ready patriots or stock
        }
      }
    }

    return updatedGroup;
  }).filter(d => {
    if (d.timer <= 0) { 
      arrivingMissilesLaunched += d.launched; 
      arrivingMissilesIntercepted += d.intercepted; 
      // Impact is what's left
      arrivingMissileImpacts += Math.max(0, d.launched - d.intercepted); 
      return false; 
    }
    return true;
  });

  let arrivingStrikes = 0;
  c.flyingStrikes = (c.flyingStrikes || []).map(d => ({ ...d, timer: d.timer - 1 })).filter(d => {
    if (d.timer <= 0) { arrivingStrikes += d.impacts; return false; }
    return true;
  });

  const totalIncoming = arrivingDronesLaunched + arrivingMissilesLaunched;
  const totalIntercepted = arrivingDronesIntercepted + arrivingMissilesIntercepted;
  
  c.totalIncoming += totalIncoming;
  c.totalIntercepted += totalIntercepted;
  c.totalMissilesIncoming += arrivingMissilesLaunched;
  c.totalMissilesIntercepted += arrivingMissilesIntercepted;
  c.totalDronesIncoming += arrivingDronesLaunched;
  c.totalDronesIntercepted += arrivingDronesIntercepted;

  const interceptionRate = totalIncoming > 0 ? totalIntercepted / totalIncoming : 1;

  const mediaBonus = 1 - (state.upgrades.c_media_campaign?.level ?? 0) * su.mediaCampaignSupportBonusPerLevel;
  const censorshipBonus = 1 - (state.upgrades.c_censorship?.level ?? 0) * su.censorshipMissilePenaltyPerLevel;
  const fatiguResist = 1 - (state.upgrades.c_war_fatigue_resist?.level ?? 0) * su.warFatigueResistPerLevel;

  let supportChange = 0;
  if (interceptionRate > sc.interceptionSupportThreshold && totalIncoming > 0) {
    supportChange += sc.interceptionSupportBonus;
  } else if (totalIncoming > 0) {
    const deficit = sc.interceptionSupportThreshold - interceptionRate;
    supportChange -= deficit * deficit * sc.interceptionDeficitSquaredMultiplier;
  }
  supportChange -= arrivingMissileImpacts * sc.missileImpactSupportMultiplier * censorshipBonus;
  supportChange -= arrivingDroneImpacts * sc.droneImpactSupportMultiplier * mediaBonus;
  supportChange -= sc.naturalSupportDecayPerTick * fatiguResist;

  if ((state.upgrades.c_carpet?.level ?? 0) > 0) {
    supportChange -= su.carpetSupportPenaltyPerLevel * (state.upgrades.c_carpet?.level ?? 0);
  }

  c.publicSupportDerivative = supportChange;
  c.publicSupport = Math.max(0, Math.min(ce.economyCap, c.publicSupport + supportChange));
  c.handFree = (c.economy / ps) * (c.publicSupport / ps) * ps;

  r.fervor = Math.min(re.fervorCap, r.fervor + arrivingDroneImpacts * sc.droneImpactFervor + arrivingMissileImpacts * sc.missileImpactFervor); r.totalDroneImpacts += arrivingDroneImpacts; r.totalMissileImpacts += arrivingMissileImpacts;

  let basesDestroyed = 0;
  let civilianHits = 0;
  let fakeBasesHit = 0;
  let radarsDestroyed = 0;

  if (arrivingMissileImpacts > 0 && c.radarSpots > 0) {
    c.radarDamage = (c.radarDamage || 0) + arrivingMissileImpacts;
    if (c.radarDamage >= sc.missileHitsToDestroyRadar) {
      const destroyed = Math.floor(c.radarDamage / sc.missileHitsToDestroyRadar);
      const actualD = Math.min(c.radarSpots, destroyed);
      c.radarSpots -= actualD;
      radarsDestroyed += actualD;
      c.radarDamage -= actualD * sc.missileHitsToDestroyRadar;
    }
  }

  const fearCfg = balance.coalition.fearBusiness;

  if (arrivingStrikes > 0) {
    const bunkerBuster = state.upgrades.c_bunker_buster?.level ?? 0;
    const carpetBonus = 1 + (state.upgrades.c_carpet?.level ?? 0) * su.carpetStrikePowerPerLevel;
    const baseHardening = 1 + (state.upgrades.r_base_hardening?.level ?? 0) * su.baseHardeningPerLevel;
    const defMod = (1 + r.antiAirLevel * su.antiAirPerLevel) * baseHardening;

    for (let i = 0; i < arrivingStrikes; i++) {
      const hitChance = (c.strikeAccuracy * c.intelligenceModifier * carpetBonus) / defMod;

      if (Math.random() < hitChance) {
        let pool: RegimeBase[];
        if (c.scanActive) {
          const civilians = aliveBases.filter((b) => b.type === 'civilian' && b.revealed);
          const buried = aliveBases.filter((b) => b.burialLevel > 0 && b.burialLevel <= bunkerBuster && b.revealed);
          const military = aliveBases.filter((b) => b.type === 'military' && b.revealed && b.burialLevel <= bunkerBuster);

          if (civilians.length > 0) pool = civilians;
          else if (buried.length > 0) pool = buried;
          else pool = military.length > 0 ? military : aliveBases.filter(b => b.revealed);
        } else {
          // Prioritize known bases (grayed out)
          const known = aliveBases.filter(b => b.knownToCoalition && b.burialLevel <= bunkerBuster);
          if (known.length > 0) {
            pool = known;
          } else {
            pool = aliveBases.filter((b) => {
              if (b.hiddenBase && !b.knownToCoalition) return false;
              if (b.burialLevel > bunkerBuster) return false;
              return true;
            });
          }
        }

        if (pool.length > 0) {
          const target = pool[Math.floor(Math.random() * pool.length)];
          if (target.type === 'fake') {
            fakeBasesHit += 1;
            target.alive = false;
          } else if (target.type === 'civilian') {
            if (c.scanActive) {
              target.alive = false;
              basesDestroyed += 1;
              c.successfulStrikes += 1;
              let scanStrikeBonus = fearCfg.scanStrikeBonus;
              if (c.fearBusinessActive) scanStrikeBonus *= fearCfg.fearMultiplier;
              c.publicSupport = Math.min(ce.economyCap, c.publicSupport + scanStrikeBonus);
            } else {
              target.alive = false;
              c.publicSupport = Math.max(0, c.publicSupport - sc.unscannedCivilianSupportLoss);
              r.fervor = Math.max(0, r.fervor - sc.unscannedCivilianFervorLoss);
              // Collateral damage under jamming is worse
              if (r.radarLockdownActive) {
                c.publicSupport = Math.max(0, c.publicSupport - sc.unscannedCivilianSupportLoss);
              }
            }
          } else {
            target.alive = false;
            basesDestroyed += 1;
            c.successfulStrikes += 1;
            if (c.scanActive && target.burialLevel > 0) {
              let buriedBonus = fearCfg.buriedBonusDuringScan;
              if (c.fearBusinessActive) buriedBonus *= fearCfg.fearMultiplier;
              c.publicSupport = Math.min(ce.economyCap, c.publicSupport + buriedBonus);
            }
          }
        }
      }
    }
  }

  if (basesDestroyed > 0 && (state.upgrades.c_embedded_journalists?.level ?? 0) > 0) {
    c.publicSupport = Math.min(
      ce.economyCap,
      c.publicSupport + basesDestroyed * su.embeddedJournalistsPerBasePerLevel * (state.upgrades.c_embedded_journalists?.level ?? 0),
    );
  }

  const nuke = balance.regime.nuclear;
  const nukeTh = balance.phases.nuclearResilienceThreshold;
  if (r.resilience >= nukeTh && !r.nuclearUnlocked && !state.milestones.nuclear_unlocked) {
    r.nuclearUnlocked = true;
    const nBase = createBase(balance, 'military');
    nBase.burialLevel = nuke.newBaseBurialLevel;
    nBase.scansRequired = nuke.newBaseScansRequired;
    r.bases.push(nBase);
    r.nuclearBaseId = nBase.id;
    state.milestones.nuclear_unlocked = true;
  }

  if (r.nuclearUnlocked && r.nuclearBaseId) {
    const nBase = r.bases.find((b) => b.id === r.nuclearBaseId);
    if (nBase && nBase.alive) {
      r.nuclearProgress = Math.min(nuke.winProgress, r.nuclearProgress + nuke.progressPerTick);
    } else {
      r.nuclearUnlocked = false;
      r.nuclearProgress = 0;
      r.nuclearBaseId = null;
    }
  }

  const antiDroneStrength = minigunAntiDrone + extraDroneIntercept;
  const antiMissileStrength = c.interceptorStock;
  const dr = sc.doctrineStrengthRatio;
  if (antiMissileStrength > antiDroneStrength * dr) {
    r.droneBias = Math.min(sc.doctrineBiasMax, r.droneBias + sc.doctrineBiasPrimaryStep);
    r.missileBias = Math.max(sc.doctrineBiasMin, r.missileBias - sc.doctrineBiasSecondaryStep);
  } else if (antiDroneStrength > antiMissileStrength * dr) {
    r.missileBias = Math.min(sc.doctrineBiasMax, r.missileBias + sc.doctrineBiasPrimaryStep);
    r.droneBias = Math.max(sc.doctrineBiasMin, r.droneBias - sc.doctrineBiasSecondaryStep);
  }

  let event: string | undefined;
  let eventColor: string | undefined;
  if (civilianHits > 0) { event = `⚠ CIVILIAN CASUALTIES — ${civilianHits} civilian base(s) hit!`; eventColor = 'text-danger'; }
  else if (fakeBasesHit > 0) { event = `🎭 DECOY — ${fakeBasesHit} fake base(s) wasted strikes`; eventColor = 'text-warning'; }
  else if (basesDestroyed > 0) { event = `💥 ${basesDestroyed} base(s) destroyed`; eventColor = 'text-coalition'; }
  else if (radarsDestroyed > 0) { event = `📡 RADAR DESTROYED! (${radarsDestroyed} lost)`; eventColor = 'text-danger'; }
  
  if (r.nuclearUnlocked && r.nuclearProgress > 0 && !state.milestones.nuclear_warning) {
    event = '☢ NUCLEAR PROGRAM DETECTED — Find and destroy the launch site!';
    eventColor = 'text-danger';
    state.milestones.nuclear_warning = true;
  }

  if (arrivingDronesLaunched > 0 || arrivingMissilesLaunched > 0 || arrivingStrikes > 0) {
    let satiricalEvent: string | undefined;

    if (civilianHits > 0 && Math.random() < 0.6) {
      const texts = [
        "Precision strike successfully neutralized a local bakery.",
        "Coalition targets verified: 1 hostile hospital destroyed.",
        "Collateral damage? We prefer the term 'unplanned infrastructure remodeling'."
      ];
      satiricalEvent = texts[Math.floor(Math.random() * texts.length)];
    } else if (fakeBasesHit > 0 && Math.random() < 0.6) {
      const texts = [
        "Coalition Command proudly announces the destruction of a plywood decoy.",
        "Millions spent on intel to bomb an inflatable tent.",
        "Target destroyed! Wait... was that cardboard?"
      ];
      satiricalEvent = texts[Math.floor(Math.random() * texts.length)];
    } else if (arrivingMissileImpacts > 0 && c.interceptorStock > 0 && Math.random() < 0.4) {
      const texts = [
        "A $25k artisanal missile casually bypassed a $30M Patriot radar.",
        "10 Patriots strictly observing as a regime missile hits the deck.",
        "Air Defense system busy performing a software update during the incoming strike."
      ];
      satiricalEvent = texts[Math.floor(Math.random() * texts.length)];
    } else if (arrivingDronesIntercepted > 0 && Math.random() < 0.4) {
      const texts = [
        "$50,000 of high-caliber ammo used to vaporize a $20 drone.",
        "Coalition economy significantly hurt by shooting down budget plastics.",
        "A triumph! We spent more shooting it than they did building it."
      ];
      satiricalEvent = texts[Math.floor(Math.random() * texts.length)];
    }

    const log: CombatLog = {
      tick: state.tick,
      dronesLaunched: arrivingDronesLaunched, missilesLaunched: arrivingMissilesLaunched, 
      dronesIntercepted: arrivingDronesIntercepted, missilesIntercepted: arrivingMissilesIntercepted,
      droneImpacts: arrivingDroneImpacts, missileImpacts: arrivingMissileImpacts, 
      basesDestroyed, civilianHits, fakeBasesHit, radarsDestroyed,
      event, eventColor,
      satiricalEvent,
    };
    const logCap = balance.global.combatLogMaxEntries;
    state.combatLog = [log, ...state.combatLog.slice(0, logCap - 1)];
  }

  const realBases = r.bases.filter((b) => b.alive && b.type === 'military');
  if (realBases.length <= 0) {
    state.gameOver = true;
    state.winner = 'coalition';
    state.winReason = 'All regime military bases destroyed';
  } else if (c.handFree <= 0) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Hand Free collapsed — war unsustainable';
  } else if (r.nuclearProgress >= nuke.winProgress) {
    state.gameOver = true;
    state.winner = 'regime';
    state.winReason = 'Nuclear launch successful';
  }

  return state;
}

export function buyPatriot(state: GameState, balance: BalanceConfig): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const ipp = balance.coalition.patriots.interceptorsPerPatriot;
  const ig = balance.coalition.patriots.interceptorsGrantedOnPurchase;
  s.coalition.debt += s.coalition.patriotCost; s.coalition.totalDebtAccumulated += s.coalition.patriotCost;
  s.coalition.patriots += 1;
  s.coalition.patriotUnits.push({ reloadTimer: 0 });
  s.coalition.interceptorMax = s.coalition.patriots * ipp;
  s.coalition.interceptorStock = Math.min(s.coalition.interceptorMax, s.coalition.interceptorStock + ig);
  return s;
}

export function buyMinigun(state: GameState, balance: BalanceConfig): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += s.coalition.minigunCost; s.coalition.totalDebtAccumulated += s.coalition.minigunCost;
  s.coalition.miniguns += 1;
  return s;
}

export function buildRadar(state: GameState, balance: BalanceConfig): GameState {
  const fog = balance.coalition.fog;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += s.coalition.radarSpotCost; s.coalition.totalDebtAccumulated += s.coalition.radarSpotCost;
  s.coalition.radarSpots += 1;
  const additionalSpots = Math.max(0, s.coalition.radarSpots - balance.coalition.initial.radarSpots);
  s.coalition.fogOfWarLimit = balance.coalition.initial.fogOfWarLimit + additionalSpots * fog.radarSpotVisibilityPerSpot;
  s.coalition.fogOfWarLimit = Math.min(fog.radarMaxVisibility, s.coalition.fogOfWarLimit);
  return s;
}

export function buyStrike(state: GameState, balance: BalanceConfig): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += balance.simulation.autoBuy.strikeOrderDebt; s.coalition.totalDebtAccumulated += balance.simulation.autoBuy.strikeOrderDebt;
  s.coalition.strikeStock.producing = true;
  s.coalition.strikeStock.productionProgress = 0;
  return s;
}

export function buyFighter(state: GameState, balance: BalanceConfig): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += balance.simulation.autoBuy.fighterOrderDebt; s.coalition.totalDebtAccumulated += balance.simulation.autoBuy.fighterOrderDebt;
  s.coalition.fighterStock.producing = true;
  s.coalition.fighterStock.productionProgress = 0;
  return s;
}

export function launchStrikes(state: GameState, count: number): GameState {
  const available = Math.min(count, state.coalition.strikeStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.strikeStock.stock -= available;
  s.coalition.totalStrikes += available;
  s.coalition.manualStrikesToLaunch = (s.coalition.manualStrikesToLaunch || 0) + available;
  return s;
}

export function launchFighters(state: GameState, balance: BalanceConfig, count: number): GameState {
  const available = Math.min(count, state.coalition.fighterStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.fighterStock.stock -= available; s.coalition.totalFightersLaunched += available;
  
  s.coalition.flyingFighters = s.coalition.flyingFighters || [];
  for (let i = 0; i < available; i++) {
    s.coalition.flyingFighters.push({
      id: Math.random().toString(36).substr(2, 9),
      state: 'patrol',
      timer: FIGHTER_PATROL_TIME,
      maxTimer: FIGHTER_PATROL_TIME,
      targetX: 0.6 + Math.random() * 0.3,
      targetY: 0.1 + Math.random() * 0.8
    });
  }
  return s;
}

export function issueBonds(state: GameState, balance: BalanceConfig): GameState {
  const b = balance.coalition.bonds;
  const cap = balance.coalition.economy.economyCap;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt += b.debtAmount; s.coalition.totalDebtAccumulated += b.debtAmount;
  s.coalition.incomePerTick += b.incomePerTick;
  s.coalition.debtBreakdownTolerance += b.toleranceBonus;
  s.coalition.economy = Math.min(cap, s.coalition.economy + b.economyBoost);
  return s;
}

export function publicTax(state: GameState, balance: BalanceConfig): GameState {
  const t = balance.coalition.tax;
  const cap = balance.coalition.economy.economyCap;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.coalition.debt = Math.max(0, s.coalition.debt - t.debtReduction);
  s.coalition.publicSupport = Math.max(0, s.coalition.publicSupport - t.publicSupportLoss);
  s.coalition.publicTaxLevel += 1;
  s.coalition.economy = Math.min(cap, s.coalition.economy + t.economyBoost);
  return s;
}

export function activateScan(state: GameState, balance: BalanceConfig): GameState {
  if (!state.coalition.scanAvailable || state.coalition.scanActive) return state;
  if (state.regime.radarLockdownActive) return state;

  const scanCost = state.coalition.scanBaseCost * Math.pow(balance.coalition.scan.costExponent, state.coalition.scanConsecutiveCount);

  const s: GameState = JSON.parse(JSON.stringify(state));
  const c = s.coalition;
  c.debt += scanCost; c.totalDebtAccumulated += scanCost;
  c.scanActive = true;
  c.scanTimer = balance.coalition.scan.activeTicks * (1 + (s.upgrades.c_scan_upgrade?.level ?? 0) * 0.5);
  c.scanConsecutiveCount += 1;

  // Toggle sector logic
  c.scanSector = c.scanSector === 'north' ? 'south' : 'north';
  c.scanZoneX = 0.5;
  c.scanZoneY = c.scanSector === 'north' ? 0.25 : 0.75;

  const camoPenalty = balance.coalition.scan.camouflageRevealPenaltyPerLevel;
  const sizeMult = c.scanSizeMultiplier || 1.0;

  s.regime.bases.forEach((b) => {
    // Sector logic
    const inNorth = b.y < 0.5;
    const inSouth = b.y >= 0.5;
    const inSector = (c.scanSector === 'north' && inNorth) || (c.scanSector === 'south' && inSouth);
    const globalScan = sizeMult >= 1.5;

    if (inSector || globalScan) {
      const camoBonus = (s.upgrades.r_camouflage?.level ?? 0) * camoPenalty;
      const revealChance = (1 - camoBonus) * sizeMult;
      if (Math.random() < revealChance) {
        b.revealed = true;
        b.revealedType = b.type;
        b.knownToCoalition = true;
        b.scansReceived += 1;
      }
    }
  });

  return s;
}

export function activateFearBusiness(state: GameState, balance: BalanceConfig): GameState {
  if (!state.coalition.fearBusinessAvailable) return state;
  const fb = balance.coalition.fearBusiness;
  const cap = balance.coalition.economy.economyCap;
  const s: GameState = JSON.parse(JSON.stringify(state));

  const strikesToSell = Math.floor(s.coalition.strikeStock.stock / 2);
  const fightersToSell = Math.floor(s.coalition.fighterStock.stock / 2);

  const strikesValue = strikesToSell * fb.strikeValuePerStock * fb.salePriceMultiplier;
  const fightersValue = fightersToSell * fb.fighterValuePerStock * fb.salePriceMultiplier;
  const totalSale = strikesValue + fightersValue;

  s.coalition.debt = Math.max(0, s.coalition.debt - totalSale);
  s.coalition.strikeStock.stock -= strikesToSell;
  s.coalition.fighterStock.stock -= fightersToSell;

  s.coalition.economy = Math.min(cap, s.coalition.economy + fb.economyBoost);

  s.coalition.fearBusinessActive = true;
  s.coalition.fearBusinessTimer = fb.activeTicks;
  s.coalition.fearBusinessAvailable = false;

  return s;
}

export function regimeBuildBase(state: GameState, balance: BalanceConfig, type: 'military' | 'civilian' | 'fake' = 'military'): GameState {
  const rb = balance.regime.build;
  const buildSpeedBonus = 1 - (state.upgrades.r_construction_speed?.level ?? 0) * rb.constructionSpeedDiscountPerLevel;
  const cost = (type === 'military' ? state.regime.baseCost : type === 'civilian' ? state.regime.baseCost * rb.civilianCostMultiplier : state.regime.baseCost * rb.fakeCostMultiplier)
    * Math.max(rb.minCostMultiplier, buildSpeedBonus);
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  const buildTime = Math.max(
    rb.minBuildTicks,
    Math.round((type === 'military' ? rb.militaryBuildTicks : type === 'civilian' ? rb.civilianBuildTicks : rb.fakeBuildTicks) * Math.max(rb.minCostMultiplier, buildSpeedBonus)),
  );
  s.regime.baseBuildQueue.push({ type, timer: buildTime, buildTime });
  return s;
}

export function buryBaseByLevel(state: GameState, balance: BalanceConfig, targetLevel: number): GameState {
  const bury = balance.regime.bury;
  const bases = state.regime.bases.filter((b) => b.alive && b.burialLevel === targetLevel - 1);
  if (bases.length === 0) return state;
  const base = bases[Math.floor(Math.random() * bases.length)];
  const tunnelDiscount = 1 - (state.upgrades.r_tunnel_network?.level ?? 0) * bury.tunnelDiscountPerLevel;
  const cost = (bury.baseCost + (targetLevel - 1) * bury.costPerBurialLevel) * tunnelDiscount;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  const b = s.regime.bases.find((b2) => b2.id === base.id)!;
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  b.burialLevel = targetLevel;
  b.hiddenBase = true;
  return s;
}

export function buryBase(state: GameState, balance: BalanceConfig, baseId: string): GameState {
  const bury = balance.regime.bury;
  const base = state.regime.bases.find((b) => b.id === baseId && b.alive);
  if (!base || base.burialLevel >= bury.maxBurialLevel) return state;
  const tunnelDiscount = 1 - (state.upgrades.r_tunnel_network?.level ?? 0) * bury.tunnelDiscountPerLevel;
  const cost = (bury.baseCost + base.burialLevel * bury.costPerBurialLevel) * tunnelDiscount;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  const b = s.regime.bases.find((b2) => b2.id === baseId)!;
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  b.burialLevel += 1;
  b.hiddenBase = true;
  return s;
}

export function buyDrones(state: GameState, balance: BalanceConfig, count: number): GameState {
  const fd = balance.simulation.fervor;
  const fervorDiscount = Math.max(fd.discountMin, 1 - state.regime.fervor * fd.discountPerFervor);
  // Instant buy costs 2x regular price
  const cost = state.regime.droneCost * fervorDiscount * count * 2;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  s.regime.droneStock.stock += count;
  return s;
}

export function buyMissiles(state: GameState, balance: BalanceConfig, count: number): GameState {
  const fd = balance.simulation.fervor;
  const fervorDiscount = Math.max(fd.discountMin, 1 - state.regime.fervor * fd.discountPerFervor);
  // Instant buy costs 2x regular price
  const cost = state.regime.missileCost * fervorDiscount * count * 2;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  s.regime.missileStock.stock += count;
  return s;
}

export function regimeLaunchDrones(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.droneStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.droneStock.stock -= available;
  s.regime.totalDronesLaunched += available;
  s.regime.manualDronesToLaunch = (s.regime.manualDronesToLaunch || 0) + available;
  return s;
}

export function regimeLaunchMissiles(state: GameState, count: number): GameState {
  const available = Math.min(count, state.regime.missileStock.stock);
  if (available <= 0) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.missileStock.stock -= available;
  s.regime.totalMissilesLaunched += available;
  s.regime.manualMissilesToLaunch = (s.regime.manualMissilesToLaunch || 0) + available;
  return s;
}

export function oilShipping(state: GameState, balance: BalanceConfig): GameState {
  const o = balance.regime.oilShipping;
  const cost = o.baseCost + state.regime.oilShippingLevel * o.costPerLevel;
  if (state.regime.money < cost) return state;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  s.regime.oilShippingLevel += 1;
  return s;
}

export function deployKamikazeMine(state: GameState, balance: BalanceConfig): GameState {
  if (state.regime.money < state.regime.kamikazeMineCost) return state;
  const k = balance.regime.kamikaze;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.money -= s.regime.kamikazeMineCost; s.regime.totalMoneySpent += s.regime.kamikazeMineCost;
  s.regime.kamikazeMineCount += 1;
  s.regime.fervor = Math.max(0, s.regime.fervor - k.fervorLoss);
  return s;
}

export function radarLockdown(state: GameState, balance: BalanceConfig): GameState {
  if (!state.regime.radarLockdownAvailable) return state;
  const rl = balance.regime.radarLockdown;
  const s: GameState = JSON.parse(JSON.stringify(state));
  s.regime.radarLockdownAvailable = false;
  s.regime.radarLockdownActive = true;
  s.regime.radarLockdownTimer = rl.activeTicks;
  s.regime.radarLockdownCooldown = rl.cooldownTicks;

  if (s.coalition.scanActive) {
    s.coalition.scanActive = false;
    s.coalition.scanTimer = 0;
    s.regime.bases.forEach((b) => { b.revealed = false; b.revealedType = null; });
  }

  return s;
}

export function startResearch(state: GameState, balance: BalanceConfig, upgradeId: string): GameState {
  const upgradeList = getUpgrades(balance);
  const upgrade = upgradeList.find((u) => u.id === upgradeId);
  if (!upgrade) return state;
  const u = state.upgrades[upgradeId];
  if (!u || u.researching || u.level >= upgrade.maxLevel) return state;

  const cost = getUpgradeCost(upgrade, u.level);
  if (upgrade.side === 'regime' && state.regime.money < cost) return state;

  const s: GameState = JSON.parse(JSON.stringify(state));
  if (upgrade.side === 'coalition') {
    s.coalition.debt += cost; s.coalition.totalDebtAccumulated += cost;
  } else {
    s.regime.money -= cost; s.regime.totalMoneySpent += cost;
  }
  s.upgrades[upgradeId].researching = true;
  s.upgrades[upgradeId].researchProgress = 0;
  s.upgrades[upgradeId].researchTarget = upgrade.researchTime;
  return s;
}

export function canAffordUpgrade(state: GameState, balance: BalanceConfig, upgradeId: string): boolean {
  const upgradeList = getUpgrades(balance);
  const upgrade = upgradeList.find((u) => u.id === upgradeId);
  if (!upgrade) return false;
  const u = state.upgrades[upgradeId];
  if (!u || u.level >= upgrade.maxLevel || u.researching) return false;
  const cost = getUpgradeCost(upgrade, u.level);
  if (upgrade.side === 'regime') return state.regime.money >= cost;
  return true;
}
