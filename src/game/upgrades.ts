import { UpgradeDef } from './types';

export const UPGRADES: UpgradeDef[] = [
  // === REGIME UPGRADES ===
  // Production
  { id: 'r_drone_factory', name: 'Drone Workshop', description: '+0.5 drone efficiency', baseCost: 30, costExponent: 1.5, maxLevel: 20, side: 'regime', category: 'Production', researchTime: 10,
    effect: (s, l) => { s.regime.drone_efficiency = 0.5 + l * 0.5; } },
  { id: 'r_missile_factory', name: 'Missile Foundry', description: '+0.3 missile efficiency', baseCost: 50, costExponent: 1.6, maxLevel: 20, side: 'regime', category: 'Production', researchTime: 15,
    effect: (s, l) => { s.regime.missile_efficiency = 0.2 + l * 0.3; } },
  { id: 'r_base_hardening', name: 'Base Hardening', description: 'Bases harder to destroy', baseCost: 80, costExponent: 1.65, maxLevel: 15, side: 'regime', category: 'Production', researchTime: 20,
    effect: () => {} },
  // Drone doctrine
  { id: 'r_swarm_tactics', name: 'Swarm Tactics', description: '+15% drone output', baseCost: 60, costExponent: 1.55, maxLevel: 15, side: 'regime', category: 'Drone Doctrine', researchTime: 12,
    effect: () => {} },
  { id: 'r_stealth_drones', name: 'Stealth Coating', description: 'Drones harder to intercept', baseCost: 100, costExponent: 1.65, maxLevel: 10, side: 'regime', category: 'Drone Doctrine', researchTime: 25,
    effect: () => {} },
  // Missile doctrine
  { id: 'r_warhead_upgrade', name: 'Warhead Upgrade', description: '+20% missile impact', baseCost: 80, costExponent: 1.6, maxLevel: 12, side: 'regime', category: 'Missile Doctrine', researchTime: 18,
    effect: () => {} },
  { id: 'r_decoy_missiles', name: 'Decoy Warheads', description: 'Harder to intercept', baseCost: 120, costExponent: 1.7, maxLevel: 10, side: 'regime', category: 'Missile Doctrine', researchTime: 22,
    effect: () => {} },
  // Defense
  { id: 'r_anti_air', name: 'Anti-Air Upgrade', description: '+1 anti-air level', baseCost: 60, costExponent: 1.55, maxLevel: 20, side: 'regime', category: 'Air Defense', researchTime: 8,
    effect: (s, l) => { s.regime.anti_air_level = l; } },
  // Mines
  { id: 'r_sea_mines', name: 'Sea Mines', description: '+2 mine pressure', baseCost: 90, costExponent: 1.6, maxLevel: 15, side: 'regime', category: 'Mine Warfare', researchTime: 15,
    effect: (s, l) => { s.regime.mine_count = l * 2; } },
  // Resilience
  { id: 'r_tunnel_network', name: 'Tunnel Network', description: '+25% resilience gain', baseCost: 100, costExponent: 1.65, maxLevel: 10, side: 'regime', category: 'Resilience', researchTime: 20,
    effect: () => {} },
  { id: 'r_ideology', name: 'Ideological Training', description: '+10% resilience, −5% costs', baseCost: 70, costExponent: 1.55, maxLevel: 15, side: 'regime', category: 'Resilience', researchTime: 12,
    effect: () => {} },
  // Cost reduction
  { id: 'r_cheap_drones', name: 'Improvised Parts', description: '−10% drone cost', baseCost: 40, costExponent: 1.5, maxLevel: 15, side: 'regime', category: 'Logistics', researchTime: 8,
    effect: (s, l) => { s.regime.drone_cost = Math.max(1, 5 - l * 0.5); } },
  { id: 'r_missile_salvage', name: 'Salvage Program', description: '−8% missile cost', baseCost: 60, costExponent: 1.55, maxLevel: 12, side: 'regime', category: 'Logistics', researchTime: 10,
    effect: (s, l) => { s.regime.missile_cost = Math.max(5, 20 - l * 1.5); } },

  // === COALITION UPGRADES (cost hand_free) ===
  // Economy
  { id: 'c_economy', name: 'War Economy', description: '+100 economy output', baseCost: 500, costExponent: 1.6, maxLevel: 25, side: 'coalition', category: 'Economy', researchTime: 15,
    effect: (s, l) => { s.coalition.economy_output = 2000 + l * 100; } },
  { id: 'c_trade_routes', name: 'Trade Routes', description: '+50 economy output', baseCost: 800, costExponent: 1.65, maxLevel: 15, side: 'coalition', category: 'Economy', researchTime: 20,
    effect: () => {} },
  // Public support
  { id: 'c_propaganda', name: 'Media Campaign', description: 'Slower support decay', baseCost: 600, costExponent: 1.6, maxLevel: 15, side: 'coalition', category: 'Public Support', researchTime: 10,
    effect: () => {} },
  { id: 'c_censorship', name: 'Info Control', description: 'Reduced impact visibility', baseCost: 1000, costExponent: 1.7, maxLevel: 10, side: 'coalition', category: 'Public Support', researchTime: 15,
    effect: () => {} },
  // Defense upgrades
  { id: 'c_aa_upgrade', name: 'AA Efficiency', description: 'Each AA battery +20% more effective', baseCost: 400, costExponent: 1.6, maxLevel: 20, side: 'coalition', category: 'Anti-Air', researchTime: 12,
    effect: () => {} },
  { id: 'c_laser', name: 'Laser Defense', description: '+3 laser interceptions', baseCost: 1500, costExponent: 1.75, maxLevel: 15, side: 'coalition', category: 'Laser Defense', researchTime: 30,
    effect: (s, l) => { s.coalition.laser_defense = l * 3; } },
  // Offense upgrades
  { id: 'c_precision', name: 'Precision Guidance', description: '+5% strike accuracy', baseCost: 800, costExponent: 1.65, maxLevel: 15, side: 'coalition', category: 'Offense', researchTime: 18,
    effect: (s, l) => { s.coalition.strike_accuracy = 0.5 + l * 0.05; } },
  { id: 'c_intelligence', name: 'Intelligence Network', description: '+10% intel modifier', baseCost: 1000, costExponent: 1.7, maxLevel: 10, side: 'coalition', category: 'Offense', researchTime: 25,
    effect: (s, l) => { s.coalition.intelligence_modifier = 1 + l * 0.1; } },
  // Cost reduction
  { id: 'c_mass_production', name: 'Mass Production', description: '−10% AA cost', baseCost: 600, costExponent: 1.6, maxLevel: 15, side: 'coalition', category: 'Logistics', researchTime: 12,
    effect: (s, l) => { s.coalition.aa_cost = Math.max(50, 200 - l * 15); } },
  { id: 'c_fighter_doctrine', name: 'Fighter Doctrine', description: '−8% fighter cost, +5% effectiveness', baseCost: 700, costExponent: 1.6, maxLevel: 12, side: 'coalition', category: 'Logistics', researchTime: 15,
    effect: (s, l) => { s.coalition.fighter_cost = Math.max(100, 500 - l * 30); } },
  // Escalation
  { id: 'c_carpet', name: 'Carpet Bombing', description: '+50% strike power, −support', baseCost: 2000, costExponent: 1.75, maxLevel: 8, side: 'coalition', category: 'Escalation', researchTime: 30,
    effect: () => {} },
];

export function getUpgradeCost(upgrade: UpgradeDef, level: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costExponent, level));
}
