import { createInitialState, gameTick } from './src/game/engine';
import { DEFAULT_BALANCE, mergeBalance, cloneBalance } from './src/game/balance';
import { runRegimeAI, runCoalitionAI } from './src/game/ai';

function runScenario(name: string, patch: any, ticks: number = 1000) {
  const balance = mergeBalance(cloneBalance(DEFAULT_BALANCE), patch);
  let state = createInitialState(balance);
  state.role = 'observer';
  state.autoFireCoalition = true;
  state.autoFireRegime = true;
  
  for (let i = 0; i < ticks; i++) {
    state.tick++;
    state = runRegimeAI(state, balance);
    state = runCoalitionAI(state, balance);
    state = gameTick(state, balance);
    if (state.gameOver) {
       console.log(`[${name}] GAME OVER at tick ${state.tick} - Winner: ${state.winner}`);
       break;
    }
  }
  
  console.log(`\n=== SCENARIO: ${name} ===`);
  const milBases = state.regime.bases.filter(b => b.alive && b.type === 'military').length;
  console.log(`Ticks Run: ${state.tick}`);
  console.log(`Winner (if any): ${state.winner || 'None'}`);
  console.log(`Regime Mil Bases: ${milBases}`);
  console.log(`Regime Money: $${state.regime.money.toFixed(1)}`);
  console.log(`Regime Shipping Lvl: ${state.regime.oilShippingLevel}`);
  console.log(`Coalition Support: ${state.coalition.publicSupport.toFixed(1)}`);
  console.log(`Coalition Debt: $${state.coalition.debt.toFixed(0)}`);
  console.log(`Coalition Economy: ${state.coalition.economy.toFixed(1)}`);
}

// 1. Hydra => High Regime Expansion
runScenario('Hydra', {
  regime: {
    initial: { baseCost: 25, moneyRegen: 4 },
    build: { militaryBuildTicks: 4 }
  }
});

// 2. Thunderbolt => High Coalition Aggression
runScenario('Thunderbolt', {
  coalition: {
    initial: { strikeProductionTime: 1, strikeAccuracy: 0.7 }
  },
  simulation: {
    autoBuy: { strikeOrderDebt: 400 }
  }
});

// 3. Attrition => Heavy Economic Stress for Coalition
runScenario('Attrition', {
  global: { coalitionPibBase: 300000 },
  coalition: {
    economy: { maintenancePerPatriot: 100 }
  },
  regime: {
    oilShipping: { baseCost: 10 }
  }
});
