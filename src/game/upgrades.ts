import { UpgradeDef } from './types';

// === COALITION DOCTRINE ===
// Branch 1: SPIN DOCTOR (media/economy)
//   Sub-branch A: Information War (manipulate public support decay)
//   Sub-branch B: Economic Leverage (boost economy)
// Branch 2: WAR FALCON (military power)
//   Sub-branch A: Lethal Force (strike/fighter power)
//   Sub-branch B: Tech Advance (defense tech, laser, precision)

// === REGIME DOCTRINE ===
// Branch 1: SUPREME LEADER (fervor/oil)
//   Sub-branch A: Ideological Fervor (fervor bonuses)
//   Sub-branch B: Resource War (oil/economy)
// Branch 2: TACTICAL HARASSMENT (military/sabotage)
//   Sub-branch A: Military Efficiency (production, cost)
//   Sub-branch B: Sabotage & Disruption (mines, radar lockdown, fakes)

export const UPGRADES: UpgradeDef[] = [
  // ==========================================
  // COALITION — SPIN DOCTOR — Information War
  // ==========================================
  { id: 'c_media_campaign', name: 'Media Campaign', description: 'Reduce public support loss from drone hits by 10%',
    baseCost: 800, costExponent: 1.5, maxLevel: 10, side: 'coalition', branch: 'Spin Doctor', tier: 1, researchTime: 12,
    effect: () => {} },
  { id: 'c_embedded_journalists', name: 'Embedded Journalists', description: 'Successful strikes boost public support',
    baseCost: 1200, costExponent: 1.6, maxLevel: 8, side: 'coalition', branch: 'Spin Doctor', tier: 1, researchTime: 15,
    effect: () => {} },
  { id: 'c_censorship', name: 'Information Control', description: 'Reduce missile hit visibility by 12%',
    baseCost: 2000, costExponent: 1.65, maxLevel: 8, side: 'coalition', branch: 'Spin Doctor', tier: 2, researchTime: 20,
    effect: () => {} },
  { id: 'c_narrative_control', name: 'Narrative Control', description: 'Civilian base hits cause 30% less support loss when scanned',
    baseCost: 3000, costExponent: 1.7, maxLevel: 5, side: 'coalition', branch: 'Spin Doctor', tier: 3, researchTime: 25,
    effect: () => {} },
  { id: 'c_war_fatigue_resist', name: 'War Fatigue Resistance', description: 'Slow down natural public support decay',
    baseCost: 5000, costExponent: 1.75, maxLevel: 5, side: 'coalition', branch: 'Spin Doctor', tier: 4, researchTime: 30,
    effect: () => {} },

  // ==========================================
  // COALITION — SPIN DOCTOR — Economic Leverage
  // ==========================================
  { id: 'c_war_economy', name: 'War Economy', description: 'Increase debt breakdown tolerance by 2%',
    baseCost: 1000, costExponent: 1.55, maxLevel: 15, side: 'coalition', branch: 'Spin Doctor', tier: 1, researchTime: 10,
    effect: () => {} },
  { id: 'c_trade_routes', name: 'Trade Routes', description: '+5% income per tick',
    baseCost: 1500, costExponent: 1.6, maxLevel: 12, side: 'coalition', branch: 'Spin Doctor', tier: 1, researchTime: 15,
    effect: () => {} },
  { id: 'c_gdp_growth', name: 'GDP Stimulus', description: 'Positive economy derivative boost',
    baseCost: 3000, costExponent: 1.65, maxLevel: 8, side: 'coalition', branch: 'Spin Doctor', tier: 2, researchTime: 20,
    effect: () => {} },
  { id: 'c_allied_aid', name: 'Allied Aid Package', description: 'Periodic free money injection',
    baseCost: 5000, costExponent: 1.7, maxLevel: 5, side: 'coalition', branch: 'Spin Doctor', tier: 3, researchTime: 25,
    effect: () => {} },
  { id: 'c_war_bonds_upgrade', name: 'Premium Bonds', description: 'Treasury bonds give 20% more income',
    baseCost: 4000, costExponent: 1.65, maxLevel: 6, side: 'coalition', branch: 'Spin Doctor', tier: 3, researchTime: 22,
    effect: () => {} },

  // ==========================================
  // COALITION — WAR FALCON — Lethal Force
  // ==========================================
  { id: 'c_precision', name: 'Precision Guidance', description: '+5% strike accuracy',
    baseCost: 1200, costExponent: 1.6, maxLevel: 12, side: 'coalition', branch: 'War Falcon', tier: 1, researchTime: 15,
    effect: (s, l) => { s.coalition.strikeAccuracy = 0.5 + l * 0.05; } },
  { id: 'c_bunker_buster', name: 'Bunker Busters', description: 'Strikes can hit buried bases (−1 burial level)',
    baseCost: 3000, costExponent: 1.7, maxLevel: 5, side: 'coalition', branch: 'War Falcon', tier: 2, researchTime: 25,
    effect: () => {} },
  { id: 'c_carpet', name: 'Carpet Bombing', description: '+50% strike power, −public support per tick',
    baseCost: 4000, costExponent: 1.75, maxLevel: 5, side: 'coalition', branch: 'War Falcon', tier: 3, researchTime: 30,
    effect: () => {} },
  { id: 'c_fighter_doctrine', name: 'Fighter Doctrine', description: 'Fighters reload 20% faster',
    baseCost: 2000, costExponent: 1.6, maxLevel: 10, side: 'coalition', branch: 'War Falcon', tier: 1, researchTime: 15,
    effect: () => {} },
  { id: 'c_intelligence', name: 'Intelligence Network', description: '+10% intel modifier for strikes',
    baseCost: 2500, costExponent: 1.65, maxLevel: 8, side: 'coalition', branch: 'War Falcon', tier: 2, researchTime: 20,
    effect: (s, l) => { s.coalition.intelligenceModifier = 1 + l * 0.1; } },

  // ==========================================
  // COALITION — WAR FALCON — Tech Advance
  // ==========================================
  { id: 'c_patriot_upgrade', name: 'Patriot Upgrade', description: '+15% patriot interception vs missiles',
    baseCost: 1500, costExponent: 1.6, maxLevel: 10, side: 'coalition', branch: 'War Falcon', tier: 1, researchTime: 12,
    effect: () => {} },
  { id: 'c_minigun_upgrade', name: 'CIWS Enhancement', description: '+20% minigun efficiency vs drones',
    baseCost: 800, costExponent: 1.5, maxLevel: 12, side: 'coalition', branch: 'War Falcon', tier: 1, researchTime: 10,
    effect: () => {} },
  { id: 'c_laser', name: 'Laser Defense', description: '+3 laser interceptions per tick',
    baseCost: 5000, costExponent: 1.75, maxLevel: 10, side: 'coalition', branch: 'War Falcon', tier: 3, researchTime: 30,
    effect: (s, l) => { s.coalition.laserDefense = l * 3; } },
  { id: 'c_radar_upgrade', name: 'Advanced Radar', description: 'Radar spots reveal wider area',
    baseCost: 2000, costExponent: 1.6, maxLevel: 8, side: 'coalition', branch: 'War Falcon', tier: 2, researchTime: 18,
    effect: () => {} },
  { id: 'c_scan_upgrade', name: 'Scan Duration+', description: 'Scan lasts 50% longer',
    baseCost: 3000, costExponent: 1.65, maxLevel: 5, side: 'coalition', branch: 'War Falcon', tier: 2, researchTime: 20,
    effect: () => {} },
  { id: 'c_mass_production', name: 'Mass Production', description: '−10% all unit costs',
    baseCost: 2000, costExponent: 1.6, maxLevel: 10, side: 'coalition', branch: 'War Falcon', tier: 2, researchTime: 15,
    effect: () => {} },

  // ==========================================
  // REGIME — SUPREME LEADER — Ideological Fervor
  // ==========================================
  { id: 'r_propaganda', name: 'State Propaganda', description: '+2 fervor per tick',
    baseCost: 30, costExponent: 1.4, maxLevel: 15, side: 'regime', branch: 'Supreme Leader', tier: 1, researchTime: 8,
    effect: () => {} },
  { id: 'r_martyrdom', name: 'Martyrdom Doctrine', description: 'Destroyed bases give fervor instead of losing it',
    baseCost: 60, costExponent: 1.5, maxLevel: 8, side: 'regime', branch: 'Supreme Leader', tier: 2, researchTime: 15,
    effect: () => {} },
  { id: 'r_cult_personality', name: 'Cult of Personality', description: 'Fervor decay reduced by 15%',
    baseCost: 100, costExponent: 1.6, maxLevel: 6, side: 'regime', branch: 'Supreme Leader', tier: 3, researchTime: 20,
    effect: () => {} },
  { id: 'r_jihad_tax', name: 'Fervor Tax', description: 'Convert fervor to money (costs fervor)',
    baseCost: 40, costExponent: 1.45, maxLevel: 10, side: 'regime', branch: 'Supreme Leader', tier: 1, researchTime: 10,
    effect: () => {} },
  { id: 'r_volunteer_army', name: 'Volunteer Army', description: 'High fervor gives free drones per tick',
    baseCost: 120, costExponent: 1.6, maxLevel: 8, side: 'regime', branch: 'Supreme Leader', tier: 3, researchTime: 22,
    effect: () => {} },

  // ==========================================
  // REGIME — SUPREME LEADER — Resource War
  // ==========================================
  { id: 'r_oil_refinery', name: 'Oil Refinery', description: '+15% oil shipping returns',
    baseCost: 50, costExponent: 1.5, maxLevel: 12, side: 'regime', branch: 'Supreme Leader', tier: 1, researchTime: 10,
    effect: () => {} },
  { id: 'r_smuggling', name: 'Smuggling Network', description: 'Bypass diminishing returns on oil',
    baseCost: 80, costExponent: 1.55, maxLevel: 8, side: 'regime', branch: 'Supreme Leader', tier: 2, researchTime: 15,
    effect: () => {} },
  { id: 'r_war_profiteering', name: 'War Profiteering', description: 'Kamikaze mines give more oil value',
    baseCost: 100, costExponent: 1.6, maxLevel: 6, side: 'regime', branch: 'Supreme Leader', tier: 2, researchTime: 18,
    effect: () => {} },
  { id: 'r_black_market', name: 'Black Market', description: 'Sell intercepted coalition tech for money',
    baseCost: 150, costExponent: 1.65, maxLevel: 5, side: 'regime', branch: 'Supreme Leader', tier: 3, researchTime: 22,
    effect: () => {} },

  // ==========================================
  // REGIME — TACTICAL HARASSMENT — Military Efficiency
  // ==========================================
  { id: 'r_drone_factory', name: 'Drone Workshop', description: '−15% drone production time',
    baseCost: 25, costExponent: 1.45, maxLevel: 15, side: 'regime', branch: 'Tactical Harassment', tier: 1, researchTime: 8,
    effect: () => {} },
  { id: 'r_missile_factory', name: 'Missile Foundry', description: '−12% missile production time',
    baseCost: 45, costExponent: 1.5, maxLevel: 12, side: 'regime', branch: 'Tactical Harassment', tier: 1, researchTime: 10,
    effect: () => {} },
  { id: 'r_swarm_tactics', name: 'Swarm Tactics', description: 'Drone swarms within 2s get damage bonus',
    baseCost: 60, costExponent: 1.55, maxLevel: 10, side: 'regime', branch: 'Tactical Harassment', tier: 2, researchTime: 15,
    effect: () => {} },
  { id: 'r_warhead_upgrade', name: 'Warhead Upgrade', description: '+20% missile impact damage',
    baseCost: 80, costExponent: 1.6, maxLevel: 8, side: 'regime', branch: 'Tactical Harassment', tier: 2, researchTime: 18,
    effect: () => {} },
  { id: 'r_stealth_drones', name: 'Stealth Coating', description: 'Drones 8% harder to intercept',
    baseCost: 100, costExponent: 1.6, maxLevel: 8, side: 'regime', branch: 'Tactical Harassment', tier: 3, researchTime: 20,
    effect: () => {} },
  { id: 'r_submunitions', name: 'Submunitions', description: 'Missiles split into 2 warheads on approach',
    baseCost: 150, costExponent: 1.7, maxLevel: 5, side: 'regime', branch: 'Tactical Harassment', tier: 4, researchTime: 28,
    effect: () => {} },
  { id: 'r_cheap_drones', name: 'Improvised Parts', description: '−10% drone cost',
    baseCost: 20, costExponent: 1.4, maxLevel: 15, side: 'regime', branch: 'Tactical Harassment', tier: 1, researchTime: 6,
    effect: (s, l) => { s.regime.droneCost = Math.max(1, 8 - l * 0.5); } },

  // ==========================================
  // REGIME — TACTICAL HARASSMENT — Sabotage & Disruption
  // ==========================================
  { id: 'r_base_hardening', name: 'Base Hardening', description: 'Bases harder to destroy by strikes',
    baseCost: 60, costExponent: 1.55, maxLevel: 10, side: 'regime', branch: 'Tactical Harassment', tier: 1, researchTime: 12,
    effect: () => {} },
  { id: 'r_decoy_missiles', name: 'Decoy Warheads', description: 'Missiles 8% harder to intercept',
    baseCost: 80, costExponent: 1.6, maxLevel: 8, side: 'regime', branch: 'Tactical Harassment', tier: 2, researchTime: 15,
    effect: () => {} },
  { id: 'r_tunnel_network', name: 'Tunnel Network', description: 'Buried bases cost 20% less to bury',
    baseCost: 70, costExponent: 1.55, maxLevel: 8, side: 'regime', branch: 'Tactical Harassment', tier: 2, researchTime: 18,
    effect: () => {} },
  { id: 'r_camouflage', name: 'Camouflage Tech', description: 'Civilian/fake bases harder to scan',
    baseCost: 90, costExponent: 1.6, maxLevel: 6, side: 'regime', branch: 'Tactical Harassment', tier: 3, researchTime: 20,
    effect: () => {} },
  { id: 'r_radar_jam', name: 'Radar Jamming', description: 'Radar lockdown lasts 30% longer',
    baseCost: 120, costExponent: 1.65, maxLevel: 5, side: 'regime', branch: 'Tactical Harassment', tier: 3, researchTime: 22,
    effect: () => {} },
  { id: 'r_anti_air', name: 'Anti-Air Systems', description: '+1 anti-air level vs strikes',
    baseCost: 50, costExponent: 1.5, maxLevel: 15, side: 'regime', branch: 'Tactical Harassment', tier: 1, researchTime: 8,
    effect: (s, l) => { s.regime.antiAirLevel = l; } },
];

export function getUpgradeCost(upgrade: UpgradeDef, level: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costExponent, level));
}

export function getMaxUnlockedTier(state: Record<string, { level: number }>, branch: string): number {
  const branchUpgrades = UPGRADES.filter(u => u.branch === branch);
  let maxTier = 1;
  for (let tier = 1; tier <= 4; tier++) {
    const tierUpgrades = branchUpgrades.filter(u => u.tier === tier);
    const totalLevels = tierUpgrades.reduce((sum, u) => sum + (state[u.id]?.level ?? 0), 0);
    if (totalLevels >= tier * 3) maxTier = tier + 1; // need tier*3 total levels to unlock next
  }
  return Math.min(maxTier, 4);
}
