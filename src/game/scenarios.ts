import { BalanceConfig } from './balance';
import { fetchJsonData, saveJsonData } from '@/lib/api';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Extreme';
  icon: string;
  coalitionStrength: string;
  regimeStrength: string;
  config: Partial<BalanceConfig>;
}

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'default_skirmish',
    name: 'Escarmouche Standard',
    description: 'Mode classique. La simulation pure de l\'asymétrie. Les deux camps partent équilibrés — à vous de jouer.',
    difficulty: 'Normal',
    icon: '⚔️',
    coalitionStrength: 'Paramètres standards',
    regimeStrength: 'Paramètres standards',
    config: {}
  },
  {
    id: 'iron_dome',
    name: 'Bouclier de Fer',
    description: 'La Coalition dispose d\'une défense aérienne surpuissante : Patriots, Miniguns, Fighters en masse et intercepteurs ultra-rapides. MAIS son économie et son soutien public sont au plus bas. Chaque drone qui passe est une catastrophe politique. Ne laissez rien passer.',
    difficulty: 'Hard',
    icon: '🛡️',
    coalitionStrength: 'Défense anti-aérienne maximale, intercepteurs rapides',
    regimeStrength: 'Standard, mais la Coalition est économiquement très fragile',
    config: {
      global: {
        coalitionPibBase: 12000000000,
        militaryBaseCount: 20,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      coalition: {
        initial: {
          economy: 42,
          publicSupport: 38,
          patriots: 10,
          interceptorStock: 40,
          interceptorRechargeTime: 0.6,
          miniguns: 8,
          initialFighterStock: 18,
          initialStrikeStock: 3,
          strikeProductionTime: 80,
          fighterProductionTime: 15,
          maintenanceCost: 90,
          handFree: 80,
          patriotCost: 800,
          minigunCost: 400,
        } as any
      }
    }
  },
  {
    id: 'blind_shield',
    name: 'Bouclier Aveugle',
    description: 'La Coalition dispose d\'un mur anti-missile presque parfait. Le danger ne vient pas du volume, mais d\'une courte fenetre de blackout radar : deux missiles qui passent peuvent transformer une guerre maitrisee en crise politique majeure.',
    difficulty: 'Hard',
    icon: '!!',
    coalitionStrength: 'Patriots tres rapides, opinion haute mais fragile',
    regimeStrength: 'Salves missiles coordonnees avec blackout radar',
    config: {
      global: {
        coalitionPibBase: 12000000000,
        militaryBaseCount: 18,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      phases: {
        earlyMaxTickExclusive: 200,
        midMaxTickExclusive: 800,
        nuclearResilienceThreshold: 150,
      },
      coalition: {
        initial: {
          economy: 86,
          publicSupport: 96,
          handFree: 86,
          patriots: 12,
          interceptorStock: 60,
          interceptorRechargeTime: 1,
          miniguns: 8,
          initialFighterStock: 14,
          initialStrikeStock: 20,
          strikeProductionTime: 80,
          fighterProductionTime: 30,
          fogOfWarLimit: 0.30,
        } as any,
        patriots: {
          interceptorsPerPatriot: 5,
          interceptorsGrantedOnPurchase: 5,
          minInterceptorReloadTicks: 1,
        } as any,
        scan: {
          activeTicks: 10,
        } as any,
      },
      regime: {
        initial: {
          money: 420,
          fervor: 25,
          baseCost: 25,
          initialDroneStock: 18,
          initialMissileStock: 24,
          droneProductionTime: 13,
          missileProductionTime: 20,
          droneCost: 10,
          missileCost: 25,
          droneBias: 0.45,
          missileBias: 2.4,
        } as any,
        economy: {
          moneyRegenBase: 2.2,
          moneyRegenPerAliveBase: 0.05,
          dispersionPerBase: 0.35,
          dispersionPerBurialLevel: 0.8,
          fervorDecay: 0.12,
        } as any,
        radarLockdown: {
          activeTicks: 14,
          cooldownTicks: 24,
        } as any,
      },
      simulation: {
        upgrades: {
          carpetSupportPenaltyPerLevel: 0,
        } as any,
        combat: {
          missileImpactSupportMultiplier: 18,
          droneImpactSupportMultiplier: 0.04,
          naturalSupportDecayPerTick: 0,
          interceptionDeficitSquaredMultiplier: 12,
          autoLaunchMaxMissiles: 4,
          autoLaunchMaxDrones: 3,
        } as any,
      },
    }
  },
  {
    id: 'slow_burn',
    name: 'La Guerre Froide',
    description: 'Le Régime est extrêmement lent — pas d\'effet boule de neige — mais ses bases sont quasi-indestructibles. La Coalition a des moyens confortables mais ses frappes sont peu efficaces. Une guerre d\'usure longue et psychologique. La patience est une arme.',
    difficulty: 'Hard',
    icon: '🌊',
    coalitionStrength: 'Économie stable, production de strikes rapide',
    regimeStrength: 'Bases très résistantes, reconstruction lente mais inévitable',
    config: {
      global: {
        coalitionPibBase: 12000000000,
        militaryBaseCount: 28,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      coalition: {
        initial: {
          economy: 75,
          publicSupport: 88,
          strikePower: 0.35,
          strikeAccuracy: 0.55,
          strikeProductionTime: 18,
          initialStrikeStock: 10,
          initialFighterStock: 4,
          patriots: 4,
          miniguns: 3,
        } as any
      },
      regime: {
        initial: {
          money: 80,
          fervor: 30,
          baseCost: 90,
          droneProductionTime: 45,
          missileProductionTime: 90,
          droneCost: 12,
          missileCost: 30,
          initialDroneStock: 8,
          initialMissileStock: 2,
        } as any,
        economy: {
          fervorDecay: 2.5,
          fervorCap: 60,
          moneyRegenBase: 2,
          oilShippingIncomePerLevel: 2,
          moneyRegenPerAliveBase: 0.05,
          oilDiminishingMin: 0.3,
          oilDiminishingPerShippingLevel: 0.02,
          dispersionBase: 5,
          dispersionPerBase: 0.8,
          dispersionPerBurialLevel: 1,
          dispersionCap: 100,
          burialFervorPerTotalBurial: 0.05,
          volunteerArmyFervorThreshold: 50,
          volunteerArmyFreeRatePerLevel: 0.02,
          kamikazeEconomyPenaltyPerMine: 5,
        } as any,
        build: {
          civilianCostMultiplier: 0.5,
          fakeCostMultiplier: 0.3,
          constructionSpeedDiscountPerLevel: 0.05,
          minCostMultiplier: 0.3,
          militaryBuildTicks: 280,
          civilianBuildTicks: 350,
          fakeBuildTicks: 200,
          minBuildTicks: 100,
        } as any
      }
    }
  },
  {
    id: 'blitzkrieg',
    name: 'Tempête de Fer',
    description: 'Le Régime est déjà en guerre totale : drones en masse, missiles rapides, ferveur au maximum. La Coalition arrive avec une défense initiale très faible et doit investir vite avant d\'être submergée. Chaque seconde compte.',
    difficulty: 'Extreme',
    icon: '🔥',
    coalitionStrength: 'Économie solide, mais défense initiale très faible',
    regimeStrength: 'Machine de guerre industrielle déjà lancée à pleine vitesse',
    config: {
      global: {
        coalitionPibBase: 12000000000,
        militaryBaseCount: 40,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      coalition: {
        initial: {
          economy: 80,
          publicSupport: 82,
          patriots: 2,
          interceptorStock: 6,
          interceptorRechargeTime: 5,
          miniguns: 1,
          initialStrikeStock: 6,
          initialFighterStock: 2,
          strikeProductionTime: 30,
          fighterProductionTime: 35,
        } as any
      },
      regime: {
        initial: {
          money: 800,
          fervor: 88,
          baseCost: 25,
          droneProductionTime: 6,
          missileProductionTime: 18,
          droneCost: 4,
          missileCost: 15,
          initialDroneStock: 80,
          initialMissileStock: 30,
        } as any,
        economy: {
          moneyRegenBase: 14,
          oilShippingIncomePerLevel: 6,
          moneyRegenPerAliveBase: 0.3,
          fervorDecay: 0.3,
          fervorCap: 100,
          oilDiminishingMin: 0.3,
          oilDiminishingPerShippingLevel: 0.02,
          dispersionBase: 5,
          dispersionPerBase: 0.8,
          dispersionPerBurialLevel: 1,
          dispersionCap: 100,
          burialFervorPerTotalBurial: 0.05,
          volunteerArmyFervorThreshold: 50,
          volunteerArmyFreeRatePerLevel: 0.02,
          kamikazeEconomyPenaltyPerMine: 5,
        } as any
      }
    }
  },
  {
    id: 'nuclear_race',
    name: 'Course à l\'Atome',
    description: 'Le Régime est à deux doigts du seuil nucléaire. La Coalition dispose de frappes de précision redoutables, mais son peuple est fatigué de la guerre et le soutien public s\'effondre vite. Chaque frappe doit être chirurgicale. Le temps est compté.',
    difficulty: 'Extreme',
    icon: '☢️',
    coalitionStrength: 'Frappes de précision redoutables',
    regimeStrength: 'Résilience élevée, seuil nucléaire imminent',
    config: {
      global: {
        coalitionPibBase: 12000000000,
        militaryBaseCount: 35,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      phases: {
        earlyMaxTickExclusive: 100,
        midMaxTickExclusive: 300,
        nuclearResilienceThreshold: 60,
      },
      coalition: {
        initial: {
          economy: 65,
          publicSupport: 32,
          strikePower: 1.9,
          strikeAccuracy: 0.92,
          initialStrikeStock: 14,
          strikeProductionTime: 22,
          initialFighterStock: 5,
          patriots: 5,
          miniguns: 4,
          interceptorRechargeTime: 2,
        } as any
      },
      regime: {
        initial: {
          money: 300,
          fervor: 72,
          dispersion: 70,
          initialDroneStock: 20,
          initialMissileStock: 8,
          droneProductionTime: 12,
          missileProductionTime: 30,
        } as any,
        economy: {
          fervorDecay: 0.4,
          fervorCap: 100,
          moneyRegenBase: 6,
          oilShippingIncomePerLevel: 4,
          moneyRegenPerAliveBase: 0.15,
          oilDiminishingMin: 0.3,
          oilDiminishingPerShippingLevel: 0.02,
          dispersionBase: 5,
          dispersionPerBase: 0.8,
          dispersionPerBurialLevel: 1,
          dispersionCap: 100,
          burialFervorPerTotalBurial: 0.05,
          volunteerArmyFervorThreshold: 50,
          volunteerArmyFreeRatePerLevel: 0.02,
          kamikazeEconomyPenaltyPerMine: 5,
        } as any
      }
    }
  },
  {
    id: 'economic_warfare',
    name: 'La Guerre des Marchés',
    description: 'Tout est économie. La Coalition peut émettre des obligations généreuses mais chaque achat militaire coûte très cher. Le Régime dépend entièrement de son réseau pétrolier — sans revenus, plus rien ne fonctionne. La victoire se gagne dans les bilans financiers.',
    difficulty: 'Hard',
    icon: '💰',
    coalitionStrength: 'Économie florissante, obligations très rentables',
    regimeStrength: 'Pétrole ultra-rentable, mais unités et bases très chères',
    config: {
      global: {
        coalitionPibBase: 16000000000,
        militaryBaseCount: 22,
        combatLogMaxEntries: 20,
        percentScale: 100,
      },
      coalition: {
        initial: {
          economy: 92,
          publicSupport: 68,
          strikeProductionTime: 50,
          fighterProductionTime: 60,
          initialStrikeStock: 4,
          initialFighterStock: 3,
          patriots: 3,
          miniguns: 2,
          patriotCost: 5000,
          minigunCost: 3000,
          radarSpotCost: 4000,
        } as any,
        bonds: {
          debtAmount: 250,
          incomePerTick: 4,
          toleranceBonus: 3,
          economyBoost: 8,
        } as any
      },
      regime: {
        initial: {
          money: 120,
          fervor: 45,
          baseCost: 60,
          droneCost: 22,
          missileCost: 50,
          droneProductionTime: 20,
          missileProductionTime: 45,
          initialDroneStock: 5,
          initialMissileStock: 2,
        } as any,
        economy: {
          moneyRegenBase: 2,
          oilShippingIncomePerLevel: 10,
          moneyRegenPerAliveBase: 0.1,
          fervorDecay: 1.0,
          fervorCap: 80,
          oilDiminishingMin: 0.3,
          oilDiminishingPerShippingLevel: 0.02,
          dispersionBase: 5,
          dispersionPerBase: 0.8,
          dispersionPerBurialLevel: 1,
          dispersionCap: 100,
          burialFervorPerTotalBurial: 0.05,
          volunteerArmyFervorThreshold: 50,
          volunteerArmyFreeRatePerLevel: 0.02,
          kamikazeEconomyPenaltyPerMine: 5,
        } as any
      }
    }
  },
];

export async function loadScenarios(): Promise<Scenario[]> {
  const data = await fetchJsonData<Scenario[]>('scenarios');
  return data || DEFAULT_SCENARIOS;
}

export async function saveScenarios(scenarios: Scenario[]): Promise<void> {
  await saveJsonData('scenarios', scenarios);
}

export async function getScenarioOverrides(): Promise<Record<string, Partial<BalanceConfig>>> {
  const data = await fetchJsonData<Record<string, Partial<BalanceConfig>>>('overrides');
  return data || {};
}

export async function saveScenarioOverride(scenarioId: string, config: Partial<BalanceConfig>): Promise<void> {
  const overrides = await getScenarioOverrides();
  overrides[scenarioId] = config;
  await saveJsonData('overrides', overrides);
}

export async function clearScenarioOverride(scenarioId: string): Promise<void> {
  const overrides = await getScenarioOverrides();
  delete overrides[scenarioId];
  await saveJsonData('overrides', overrides);
}

export async function getDefaultConfig(base: BalanceConfig, scenarioId?: string): Promise<BalanceConfig> {
  if (!scenarioId) return base;
  const scenarios = await loadScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario) return base;

  const overrides = await getScenarioOverrides();
  const override = overrides[scenarioId] || {};

  // Deep merge target
  const merged = JSON.parse(JSON.stringify(base));
  const applyConfig = (target: any, source: any) => {
    if (!source) return;
    for (const key in source) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        applyConfig(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  };

  applyConfig(merged, scenario.config);
  applyConfig(merged, override);
  
  return merged;
}
