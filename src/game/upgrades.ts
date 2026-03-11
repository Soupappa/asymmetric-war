import { UpgradeDef } from './types';

export const UPGRADES: UpgradeDef[] = [
  // === REGIME UPGRADES ===
  // Production
  { id: 'r_drone_factory', name: 'Drone Workshop', description: '+0.5 drone efficiency', baseCost: 50, costExponent: 1.6, maxLevel: 20, side: 'regime', category: 'Production',
    effect: (s, l) => { s.regime.drone_efficiency = 0.5 + l * 0.5; } },
  { id: 'r_missile_factory', name: 'Missile Foundry', description: '+0.3 missile efficiency', baseCost: 80, costExponent: 1.65, maxLevel: 20, side: 'regime', category: 'Production',
    effect: (s, l) => { s.regime.missile_efficiency = 0.2 + l * 0.3; } },
  { id: 'r_base_hardening', name: 'Base Hardening', description: 'Bases harder to destroy', baseCost: 120, costExponent: 1.7, maxLevel: 15, side: 'regime', category: 'Production',
    effect: () => {} },
  // Drone doctrine
  { id: 'r_swarm_tactics', name: 'Swarm Tactics', description: '+15% drone output', baseCost: 100, costExponent: 1.6, maxLevel: 15, side: 'regime', category: 'Drone Doctrine',
    effect: () => {} },
  { id: 'r_stealth_drones', name: 'Stealth Coating', description: 'Drones harder to intercept', baseCost: 200, costExponent: 1.7, maxLevel: 10, side: 'regime', category: 'Drone Doctrine',
    effect: () => {} },
  // Missile doctrine
  { id: 'r_warhead_upgrade', name: 'Warhead Upgrade', description: '+20% missile impact', baseCost: 150, costExponent: 1.65, maxLevel: 12, side: 'regime', category: 'Missile Doctrine',
    effect: () => {} },
  { id: 'r_decoy_missiles', name: 'Decoy Warheads', description: 'Harder to intercept', baseCost: 250, costExponent: 1.75, maxLevel: 10, side: 'regime', category: 'Missile Doctrine',
    effect: () => {} },
  // Defense
  { id: 'r_anti_air', name: 'Anti-Air Battery', description: '+1 anti-air level', baseCost: 100, costExponent: 1.6, maxLevel: 20, side: 'regime', category: 'Air Defense',
    effect: (s, l) => { s.regime.anti_air_level = l; } },
  // Mines
  { id: 'r_sea_mines', name: 'Sea Mines', description: '+2 mine pressure', baseCost: 180, costExponent: 1.65, maxLevel: 15, side: 'regime', category: 'Mine Warfare',
    effect: (s, l) => { s.regime.mine_count = l * 2; } },
  // Resilience
  { id: 'r_tunnel_network', name: 'Tunnel Network', description: '+25% resilience gain', baseCost: 200, costExponent: 1.7, maxLevel: 10, side: 'regime', category: 'Resilience',
    effect: () => {} },
  { id: 'r_ideology', name: 'Ideological Training', description: '+10% resilience multiplier', baseCost: 150, costExponent: 1.6, maxLevel: 15, side: 'regime', category: 'Resilience',
    effect: () => {} },

  // === COALITION UPGRADES ===
  // Economy
  { id: 'c_economy', name: 'War Economy', description: '+50 economy output', baseCost: 100, costExponent: 1.6, maxLevel: 25, side: 'coalition', category: 'Economy',
    effect: (s, l) => { s.coalition.economy_output = 500 + l * 50; } },
  { id: 'c_trade_routes', name: 'Trade Routes', description: '+30 economy output', baseCost: 150, costExponent: 1.65, maxLevel: 15, side: 'coalition', category: 'Economy',
    effect: () => {} },
  // Public support
  { id: 'c_propaganda', name: 'Media Campaign', description: 'Slower support decay', baseCost: 120, costExponent: 1.6, maxLevel: 15, side: 'coalition', category: 'Public Support',
    effect: () => {} },
  { id: 'c_censorship', name: 'Info Control', description: 'Reduced impact visibility', baseCost: 200, costExponent: 1.7, maxLevel: 10, side: 'coalition', category: 'Public Support',
    effect: () => {} },
  // Anti-missile
  { id: 'c_anti_missile', name: 'Missile Interceptor', description: '+5 anti-missile capacity', baseCost: 80, costExponent: 1.6, maxLevel: 25, side: 'coalition', category: 'Anti-Missile',
    effect: (s, l) => { s.coalition.anti_missile_capacity = 5 + l * 5; } },
  { id: 'c_patriot', name: 'Patriot Battery', description: '+8 anti-missile', baseCost: 200, costExponent: 1.7, maxLevel: 15, side: 'coalition', category: 'Anti-Missile',
    effect: () => {} },
  // Anti-drone
  { id: 'c_anti_drone', name: 'Drone Jammer', description: '+8 anti-drone capacity', baseCost: 60, costExponent: 1.55, maxLevel: 25, side: 'coalition', category: 'Anti-Drone',
    effect: (s, l) => { s.coalition.anti_drone_capacity = 10 + l * 8; } },
  { id: 'c_cheap_battery', name: 'Cheap Defense Battery', description: '+12 anti-drone (ironically effective)', baseCost: 40, costExponent: 1.5, maxLevel: 30, side: 'coalition', category: 'Anti-Drone',
    effect: () => {} },
  // Laser
  { id: 'c_laser', name: 'Laser Defense', description: '+3 laser interceptions', baseCost: 300, costExponent: 1.75, maxLevel: 15, side: 'coalition', category: 'Laser Defense',
    effect: (s, l) => { s.coalition.laser_defense = l * 3; } },
  // Offense
  { id: 'c_strike_power', name: 'Strike Package', description: '+2 strike power', baseCost: 100, costExponent: 1.6, maxLevel: 20, side: 'coalition', category: 'Offense',
    effect: (s, l) => { s.coalition.strike_power = 1 + l * 2; } },
  { id: 'c_precision', name: 'Precision Guidance', description: '+5% strike accuracy', baseCost: 150, costExponent: 1.65, maxLevel: 15, side: 'coalition', category: 'Offense',
    effect: (s, l) => { s.coalition.strike_accuracy = 0.5 + l * 0.05; } },
  { id: 'c_intelligence', name: 'Intelligence Network', description: '+10% intel modifier', baseCost: 200, costExponent: 1.7, maxLevel: 10, side: 'coalition', category: 'Offense',
    effect: (s, l) => { s.coalition.intelligence_modifier = 1 + l * 0.1; } },
  // Escalation
  { id: 'c_emp', name: 'EMP Bomb', description: 'Disables regime production temporarily', baseCost: 500, costExponent: 1.8, maxLevel: 5, side: 'coalition', category: 'Escalation',
    effect: () => {} },
  { id: 'c_carpet', name: 'Carpet Bombing', description: '+50% strike power, -2 public support per use', baseCost: 400, costExponent: 1.75, maxLevel: 8, side: 'coalition', category: 'Escalation',
    effect: () => {} },
];

export function getUpgradeCost(upgrade: UpgradeDef, level: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costExponent, level));
}
