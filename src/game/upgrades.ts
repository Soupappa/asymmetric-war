import { UpgradeDef } from './types';
import type { BalanceConfig } from './balance';
import { DEFAULT_BALANCE } from './balance';

/** Stable order for UI and iteration (matches original UPGRADES array). */
export const UPGRADE_IDS: readonly string[] = [
  'c_media_campaign', 'c_embedded_journalists', 'c_censorship', 'c_narrative_control', 'c_war_fatigue_resist',
  'c_war_economy', 'c_trade_routes', 'c_gdp_growth', 'c_allied_aid', 'c_war_bonds_upgrade',
  'c_precision', 'c_bunker_buster', 'c_carpet', 'c_fighter_doctrine', 'c_intelligence',
  'c_patriot_upgrade', 'c_minigun_upgrade', 'c_laser', 'c_radar_upgrade', 'c_scan_upgrade', 'c_mass_production',
  'c_strike_reload', 'c_fighter_reload', 'c_construction_speed', 'c_interceptor_reload', 'c_scan_size',
  'r_propaganda', 'r_martyrdom', 'r_cult_personality', 'r_jihad_tax', 'r_volunteer_army',
  'r_oil_refinery', 'r_smuggling', 'r_war_profiteering', 'r_black_market',
  'r_drone_factory', 'r_missile_factory', 'r_swarm_tactics', 'r_warhead_upgrade', 'r_stealth_drones', 'r_submunitions', 'r_cheap_drones',
  'r_drone_reload', 'r_missile_reload', 'r_construction_speed',
  'r_base_hardening', 'r_decoy_missiles', 'r_tunnel_network', 'r_camouflage', 'r_radar_jam', 'r_anti_air',
] as const;

const UPGRADE_META: Record<string, { name: string; description: string }> = {
  c_media_campaign: { name: 'Media Campaign', description: 'Reduce public support loss from drone hits by 10%' },
  c_embedded_journalists: { name: 'Embedded Journalists', description: 'Successful strikes boost public support' },
  c_censorship: { name: 'Information Control', description: 'Reduce missile hit visibility by 12%' },
  c_narrative_control: { name: 'Narrative Control', description: 'Civilian base hits cause 30% less support loss when scanned' },
  c_war_fatigue_resist: { name: 'War Fatigue Resistance', description: 'Slow down natural public support decay' },
  c_war_economy: { name: 'War Economy', description: 'Increase debt breakdown tolerance by 2%' },
  c_trade_routes: { name: 'Trade Routes', description: '+5% income per tick' },
  c_gdp_growth: { name: 'GDP Stimulus', description: 'Positive economy derivative boost' },
  c_allied_aid: { name: 'Allied Aid Package', description: 'Periodic debt reduction' },
  c_war_bonds_upgrade: { name: 'Premium Bonds', description: 'Treasury bonds give 20% more income' },
  c_precision: { name: 'Precision Guidance', description: '+5% strike accuracy' },
  c_bunker_buster: { name: 'Bunker Busters', description: 'Strikes can hit buried bases (−1 burial level)' },
  c_carpet: { name: 'Carpet Bombing', description: '+50% strike power, −public support per tick' },
  c_fighter_doctrine: { name: 'Fighter Doctrine', description: 'Fighters reload 20% faster' },
  c_intelligence: { name: 'Intelligence Network', description: '+10% intel modifier for strikes' },
  c_patriot_upgrade: { name: 'Patriot Upgrade', description: '+15% patriot interception vs missiles' },
  c_minigun_upgrade: { name: 'CIWS Enhancement', description: '+20% minigun efficiency vs drones' },
  c_laser: { name: 'Laser Defense', description: '+3 laser interceptions per tick' },
  c_radar_upgrade: { name: 'Advanced Radar', description: 'Radar spots reveal wider area' },
  c_scan_upgrade: { name: 'Scan Duration+', description: 'Scan lasts 50% longer' },
  c_scan_size: { name: 'Satellite Resolution', description: 'Increase scan area coverage (+10% per level)' },
  c_mass_production: { name: 'Mass Production', description: '−10% all unit costs' },
  c_strike_reload: { name: 'Strike Fast-Track', description: '−10% strike production time' },
  c_fighter_reload: { name: 'Fighter Quick-Turn', description: '−8% fighter production time' },
  c_construction_speed: { name: 'Rapid Deployment', description: '−5% maintenance cost per level' },
  c_interceptor_reload: { name: 'Interceptor Surge', description: 'Interceptors recharge 15% faster' },
  r_propaganda: { name: 'State Propaganda', description: '+2 fervor per tick' },
  r_martyrdom: { name: 'Martyrdom Doctrine', description: 'Destroyed bases give fervor instead of losing it' },
  r_cult_personality: { name: 'Cult of Personality', description: 'Fervor decay reduced by 15%' },
  r_jihad_tax: { name: 'Fervor Tax', description: 'Convert fervor to money (costs fervor)' },
  r_volunteer_army: { name: 'Volunteer Army', description: 'High fervor gives free drones per tick' },
  r_oil_refinery: { name: 'Oil Refinery', description: '+15% oil shipping returns' },
  r_smuggling: { name: 'Smuggling Network', description: 'Bypass diminishing returns on oil' },
  r_war_profiteering: { name: 'War Profiteering', description: 'Kamikaze mines give more oil value' },
  r_black_market: { name: 'Black Market', description: 'Sell intercepted coalition tech for money' },
  r_drone_factory: { name: 'Drone Workshop', description: '−15% drone production time' },
  r_missile_factory: { name: 'Missile Foundry', description: '−12% missile production time' },
  r_swarm_tactics: { name: 'Swarm Tactics', description: 'Drone swarms within 2s get damage bonus' },
  r_warhead_upgrade: { name: 'Warhead Upgrade', description: '+20% missile impact damage' },
  r_stealth_drones: { name: 'Stealth Coating', description: 'Drones 8% harder to intercept' },
  r_submunitions: { name: 'Submunitions', description: 'Missiles split into 2 warheads on approach' },
  r_cheap_drones: { name: 'Improvised Parts', description: '−10% drone cost' },
  r_drone_reload: { name: 'Drone Quick-Load', description: '−8% drone production time (stacks with Workshop)' },
  r_missile_reload: { name: 'Missile Fast-Arm', description: '−6% missile production time (stacks)' },
  r_construction_speed: { name: 'Rapid Fortification', description: '−8% base construction cost' },
  r_base_hardening: { name: 'Base Hardening', description: 'Bases harder to destroy by strikes' },
  r_decoy_missiles: { name: 'Decoy Warheads', description: 'Missiles 8% harder to intercept' },
  r_tunnel_network: { name: 'Tunnel Network', description: 'Buried bases cost 20% less to bury' },
  r_camouflage: { name: 'Camouflage Tech', description: 'Civilian/fake bases harder to scan' },
  r_radar_jam: { name: 'Radar Jamming', description: 'Radar lockdown lasts 30% longer' },
  r_anti_air: { name: 'Anti-Air Systems', description: '+1 anti-air level vs strikes' },
};

function buildUpgradeEffects(balance: BalanceConfig): Record<string, (s: import('./types').GameState, l: number) => void> {
  return {
    c_precision: (s, l) => {
      const entry = balance.upgrades.c_precision;
      const per = entry.strikeAccuracyPerLevel ?? 0.05;
      s.coalition.strikeAccuracy = balance.coalition.initial.strikeAccuracy + l * per;
    },
    c_intelligence: (s, l) => {
      const per = balance.upgrades.c_intelligence.intelligencePerLevel ?? 0.1;
      s.coalition.intelligenceModifier = 1 + l * per;
    },
    c_laser: (s, l) => {
      const per = balance.upgrades.c_laser.laserPerLevel ?? 3;
      s.coalition.laserDefense = l * per;
    },
    c_interceptor_reload: (s, l) => {
      const entry = balance.upgrades.c_interceptor_reload;
      const base = entry.interceptorBaseRechargeTime ?? 2;
      const red = entry.interceptorRechargeReductionPerLevel ?? 0.15;
      s.coalition.interceptorRechargeTime = Math.max(1, base - l * red);
    },
    c_scan_size: (s, l) => {
      s.coalition.scanSizeMultiplier = 1 + l * 0.1;
    },
    r_cheap_drones: (s, l) => {
      const entry = balance.upgrades.r_cheap_drones;
      const bc = entry.cheapDroneBaseCost ?? 8;
      const r = entry.cheapDroneReductionPerLevel ?? 0.5;
      s.regime.droneCost = Math.max(1, bc - l * r);
    },
    r_anti_air: (s, l) => {
      s.regime.antiAirLevel = l;
    },
  };
}

export function getUpgrades(balance: BalanceConfig): UpgradeDef[] {
  const effects = buildUpgradeEffects(balance);
  const table = balance.upgrades ?? DEFAULT_BALANCE.upgrades;
  return UPGRADE_IDS.map((id) => {
    const row = table[id] ?? DEFAULT_BALANCE.upgrades[id];
    if (!row) throw new Error(`Missing balance.upgrades.${id}`);
    const meta = UPGRADE_META[id];
    if (!meta) throw new Error(`Missing UPGRADE_META for ${id}`);
    return {
      id,
      name: meta.name,
      description: meta.description,
      baseCost: row.baseCost,
      costExponent: row.costExponent,
      maxLevel: row.maxLevel,
      side: row.side,
      branch: row.branch,
      tier: row.tier,
      researchTime: row.researchTime,
      effect: effects[id] ?? (() => {}),
    };
  });
}

export function getUpgradeCost(upgrade: UpgradeDef, level: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costExponent, level));
}

export function getMaxUnlockedTier(
  state: Record<string, { level: number }>,
  branch: string,
  balance: BalanceConfig,
): number {
  const upgrades = getUpgrades(balance);
  const branchUpgrades = upgrades.filter((u) => u.branch === branch);
  const cap = balance.simulation.tierUnlock.maxTier;
  const mult = balance.simulation.tierUnlock.levelsRequiredMultiplier;
  let maxTier = 1;
  for (let tier = 1; tier <= cap; tier++) {
    const tierUpgrades = branchUpgrades.filter((u) => u.tier === tier);
    const totalLevels = tierUpgrades.reduce((sum, u) => sum + (state[u.id]?.level ?? 0), 0);
    if (totalLevels >= tier * mult) maxTier = tier + 1;
  }
  return Math.min(maxTier, cap);
}
