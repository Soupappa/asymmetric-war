import { GameState } from './types';
import { BalanceConfig } from './balance';
import { 
  buyDrones, buyMissiles, regimeLaunchDrones, regimeLaunchMissiles,
  buyPatriot, buildRadar, launchStrikes, activateScan,
  issueBonds, publicTax, regimeBuildBase, buryBase,
  startResearch, canAffordUpgrade, oilShipping, buyFighter, launchFighters, buyStrike,
  buyMinigun, radarLockdown, activateFearBusiness
} from './engine';
import { getUpgrades } from './upgrades';

/**
 * PERSISTENT HYDRA REGIME AI (V12)
 * - Hydra Expansion: Relentless base construction, no caps.
 * - Saturation Swarms: Waits for overwhelming numbers to deplete Coalition interceptors.
 * - Reactive Defense: Optimizes Radar Lockdown and Burial based on scan pressure.
 */
export function runRegimeAI(state: GameState, balance: BalanceConfig): GameState {
  if (state.tick % 15 !== 0) return state;

  let s = state;
  const r = s.regime;
  const c = s.coalition;
  const milBases = r.bases.filter(b => b.alive && b.type === 'military');

  // 1. SURVIVAL & DEFENSE
  // Proactive burial: target bases that are revealed
  const vulnerableBases = r.bases.filter(b => b.alive && b.revealed && b.burialLevel < balance.regime.bury.maxBurialLevel);
  for (const eb of vulnerableBases) {
    if (r.money > 40) s = buryBase(s, balance, eb.id);
  }

  // STRATEGIC BURIAL (V13.4): Bury random military bases if wealthy to fuel fervor and dispersion
  if (r.money > 250 && milBases.length > 30 && state.tick % 30 === 0) {
    const unburied = milBases.filter(b => b.burialLevel < balance.regime.bury.maxBurialLevel);
    if (unburied.length > 0) {
      const target = unburied[Math.floor(Math.random() * unburied.length)];
      s = buryBase(s, balance, target.id);
    }
  }

  // Tactical Radar Lockdown: Activate immediately if a scan is active and military positions are known
  if (c.scanActive && (vulnerableBases.length > 0 || milBases.some(b => b.knownToCoalition)) && r.radarLockdownAvailable) {
    s = radarLockdown(s, balance);
  }

  // 2. THE HYDRA EXPANSION (Balanced Reconstruction)
  const maxQueue = 12; // Slightly smaller queue to save money for pulses
  const minMoneyBuffer = 40; 
  // ONLY build if we have a minimum stock of defense units or excess cash
  if (r.baseBuildQueue.length < maxQueue && r.money > (s.regime.baseCost + minMoneyBuffer)) {
    // Allocate 60% to bases, 40% reserved for units
    const spendable = r.money * 0.6;
    let buildPower = Math.floor(spendable / (s.regime.baseCost + 2));
    for (let i = 0; i < Math.min(buildPower, maxQueue - r.baseBuildQueue.length); i++) {
      const type = Math.random() < 0.7 ? 'military' : 'fake';
      s = regimeBuildBase(s, balance, type);
    }
  }

  // 3. ECONOMIC COMBOS
  const oilCfg = balance.regime.oilShipping;
  if (r.money > (oilCfg.baseCost + r.oilShippingLevel * oilCfg.costPerLevel) && r.oilShippingLevel < 40) {
     // Combo: Oil Refinery + Smuggling Network + Oil Shipping
     const petroCombo = ['r_oil_refinery', 'r_smuggling', 'r_war_profiteering'];
     const currentResearch = Object.values(s.upgrades).find(u => u.researching);
     
     if (!currentResearch && milBases.length >= 10) {
        const nextPetro = petroCombo.find(id => canAffordUpgrade(s, balance, id));
        if (nextPetro) s = startResearch(s, balance, nextPetro);
     }
     
     if (milBases.length >= 6 || r.oilShippingLevel < 5) {
        s = oilShipping(s, balance);
     }
  }

  // 4. ADVANCED TACTICAL ADAPTATION
  const pLevel = s.upgrades.c_patriot_upgrade?.level ?? 0;
  const mLevel = s.upgrades.c_minigun_upgrade?.level ?? 0;

  if (state.tick % 45 === 0) {
    const currentResearch = Object.entries(s.upgrades).find(([id, u]) => id.startsWith('r_') && u.researching);
    if (!currentResearch) {
      const upgrades = getUpgrades(balance).filter(u => u.side === 'regime' && canAffordUpgrade(s, balance, u.id));
      let priorities: string[] = [];

      if (pLevel > 3 || c.patriots > 4) {
        // "Ghost Wave" Combo: Bypass heavy intercepts
        priorities = ['r_decoy_missiles', 'r_stealth_drones', 'r_swarm_tactics', 'r_submunitions'];
      } else if (mLevel > 4 || c.miniguns > 6) {
        // "Steel rain" Combo: Saturate short-range defense
        priorities = ['r_swarm_tactics', 'r_drone_factory', 'r_cheap_drones', 'r_warhead_upgrade'];
      } else if (c.economy > 80 || s.coalition.debt < 2000) {
        // "Petrodollar" Combo: Out-finance the coalition
        priorities = ['r_oil_refinery', 'r_smuggling', 'r_black_market', 'r_jihad_tax'];
      } else {
        // "Iron Shield" Combo: Endurance
        priorities = ['r_base_hardening', 'r_anti_air', 'r_tunnel_network', 'r_camouflage'];
      }

      const target = upgrades.find(u => priorities.includes(u.id)) || upgrades.sort((a,b) => a.tier - b.tier)[0];
      if (target) s = startResearch(s, balance, target.id);
    }
  }

  // 5. SATURATION SWARMS & RESPONSIVE FIRE
  // Scale thresholds with size: Waves become massive in late game (V13.4)
  const baseThreshold = milBases.length > 150 ? 80 : milBases.length > 60 ? 40 : 20;
  const droneLaunchThreshold = baseThreshold;
  const missileLaunchThreshold = Math.floor(baseThreshold / 2);

  // Spoiler Swarm: If Coalition is scanning, launch a small wave to force them to focus on defense
  const shouldSpoilerValue = c.scanActive && (r.droneStock.stock > 10 || r.missileStock.stock > 5);

  if (r.droneStock.stock >= droneLaunchThreshold || r.missileStock.stock >= missileLaunchThreshold || shouldSpoilerValue) {
    const dCount = Math.floor(r.droneStock.stock * 0.9);
    const mCount = Math.floor(r.missileStock.stock * 0.9);
    
    if (mCount >= 3) s = regimeLaunchMissiles(s, mCount);
    if (dCount >= 5) s = regimeLaunchDrones(s, dCount);
  }

  // Unit production: BATCH BUYING (V13.4)
  // Scaling purchases by treasury to support "Massive Waves"
  if (!r.droneStock.producing) {
    const droneBatch = r.money > 1500 ? 60 : r.money > 600 ? 25 : 10;
    if (r.money > r.droneCost * droneBatch) s = buyDrones(s, balance, droneBatch);
  }
  if (!r.missileStock.producing) {
    const missileBatch = r.money > 2000 ? 50 : r.money > 800 ? 20 : 5;
    if (r.money > r.missileCost * missileBatch) s = buyMissiles(s, balance, missileBatch);
  }

  return s;
}

/**
 * CENTRAL BANKER COALITION AI (V13)
 * - Strategic Fiscal Scaling: Proactive bonds (Tick 50) and aggressive tax collection.
 * - Debt-Responsive Production: Green/Yellow/Red zones for munition manufacturing.
 * - Recovery Doctrine: Force-prioritizes War Economy and GDP growth when debt rises.
 */
export function runCoalitionAI(state: GameState, balance: BalanceConfig): GameState {
  if (state.tick % 10 !== 0) return state;

  let s = state;
  const c = s.coalition;
  const ce = balance.coalition.economy;
  
  // V14 INDICATORS
  const fsi = (c.economy + c.publicSupport) / 2; // Fiscal Stability Index
  const debtRatio = (c.debt / state.coalitionPibBase) * ce.debtRatioToPercentMultiplier;
  const milBasesCount = s.regime.bases.filter(b => b.alive && b.type === 'military').length;

  // 1. STRATEGIC FISCAL RECOVERY
  // Aggressive Bond usage if economy flinches
  if (c.economy < 55 && state.tick % 30 === 0) s = issueBonds(s, balance);
  // Tactical Tax if support is high enough to bear it
  if (c.publicSupport > 75 && debtRatio > 35 && state.tick % 50 === 0) s = publicTax(s, balance);
  // Fear Business as emergency liquidity
  if (c.fearBusinessAvailable && fsi < 30) s = activateFearBusiness(s, balance);

  // 2. PRODUCTION THROTTLING (FSI-Driven)
  if (fsi < 35) {
    // CRISIS: Halt all production
    s.coalition.strikeStock.autoBuy = false;
    s.coalition.fighterStock.autoBuy = false;
  } else if (fsi < 65) {
    // STRAINED: Maintenance only (Buffer 15/15)
    s.coalition.strikeStock.autoBuy = c.strikeStock.stock < 15;
    s.coalition.fighterStock.autoBuy = c.fighterStock.stock < 15;
  } else {
    // PROSPEROUS: Industrial Blitz (Buffer 40/30)
    s.coalition.strikeStock.autoBuy = c.strikeStock.stock < 40;
    s.coalition.fighterStock.autoBuy = c.fighterStock.stock < 30;
  }

  const researchingCount = Object.values(s.upgrades).filter(u => u.side === 'coalition' && u.researching).length;
  const maxConcurrentResearch = 3;
  
  if (researchingCount < maxConcurrentResearch && state.tick % 20 === 0) {
    let availableSlots = maxConcurrentResearch - researchingCount;
    while (availableSlots > 0) {
      const availableUpgrades = getUpgrades(balance).filter(u => u.side === 'coalition' && canAffordUpgrade(s, balance, u.id));
      if (availableUpgrades.length === 0) break;
      
      let pool = availableUpgrades;
      if (fsi < 60 || debtRatio > 40) {
        const ecoIds = ['c_war_economy', 'c_allied_aid', 'c_trade_routes', 'c_gdp_growth', 'c_war_bonds_upgrade', 'c_media_campaign', 'c_war_fatigue_resist'];
        const ecoUpgrades = availableUpgrades.filter(u => ecoIds.includes(u.id));
        if (ecoUpgrades.length > 0) pool = ecoUpgrades;
      } else {
        const techIds = [
          'c_strike_reload', 'c_mass_production', 'c_scan_size', 'c_precision', 'c_scan_upgrade', 
          'c_fighter_reload', 'c_fighter_doctrine', 'c_bunker_buster', 'c_carpet', 'c_intelligence',
          'c_patriot_upgrade', 'c_minigun_upgrade', 'c_laser', 'c_interceptor_reload', 'c_radar_upgrade', 'c_construction_speed'
        ];
        const techUpgrades = availableUpgrades.filter(u => techIds.includes(u.id));
        if (techUpgrades.length > 0) pool = techUpgrades;
      }

      const target = pool[Math.floor(Math.random() * pool.length)];
      if (target) {
        s = startResearch(s, balance, target.id);
        availableSlots--;
      } else {
        break;
      }
    }
  }

  // 4. DEFENSIVE GRID
  const targetRadars = Math.min(12, 4 + Math.floor(milBasesCount / 6));
  const targetPatriots = Math.min(18, 6 + Math.floor(milBasesCount / 4));
  if (c.radarSpots < targetRadars && fsi > 45) s = buildRadar(s, balance);
  if (c.patriots < targetPatriots && fsi > 50) s = buyPatriot(s, balance);

  // 5. OFFENSIVE DOCTRINE: TACTICAL DISCIPLINE (V14)
  const strikes = c.strikeStock.stock;
  const knownBases = s.regime.bases.filter(b => b.alive && b.knownToCoalition).length;

  // Toggle Auto-Fire: Reload vs Pressure
  // RELOAD: Stop firing if stock is low and regime is currently contained
  if (strikes < 8 && milBasesCount < 12 && !c.scanActive) {
    s.coalition.strikeStock.autoLaunch = false;
  } 
  // PRESSURE: Force fire if stock is high, regime is industrializing, or we are scanning
  else if (strikes > 25 || milBasesCount > 18 || c.scanActive || knownBases > 5) {
    s.coalition.strikeStock.autoLaunch = true;
  }

  // Strategic Scanning
  if (!c.scanActive && !s.regime.radarLockdownActive) {
    const pushThreshold = fsi > 60 ? 10 : 20;
    if ((strikes >= pushThreshold && knownBases === 0) || strikes >= 35) {
      s = activateScan(s, balance);
    }
  }

  // Saturation Salvos: Execute manual bursts during scan windows
  if (c.scanActive && (state.tick % 15 === 0)) {
    const burstSize = fsi > 50 ? (strikes > 20 ? 10 : 5) : 3;
    if (strikes > 0) s = launchStrikes(s, Math.min(strikes, burstSize));
  }

  // AIR PATROLS
  const activeFighters = c.flyingFighters?.length || 0;
  const fighterCap = fsi > 60 ? 35 : 15;
  if (c.fighterStock.stock > 0 && activeFighters < fighterCap && fsi > 40) {
    s = launchFighters(s, balance, 2);
  }

  return s;
}
