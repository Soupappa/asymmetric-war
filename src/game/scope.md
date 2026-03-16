# ASYMMETRIC WARS — SCOPE

## Product intent

Asymmetric Wars is a real-time idle war simulation built around asymmetry, doctrine counterplay, economic deterioration, political pressure, and escalating battlefield automation.

The goal is not to make a generic military clicker.
The goal is to make a highly readable systemic war asymetrical machine where:
- the Coalition feels technologically dominant and politically fragile, while its exponential economy can become too expensive (time is an ennemy)
- the Regime feels materially weaker but structurally resilient, deceptive, and strategically patient (time is an ally)
- both sides can be played
- observer mode can run the simulation without player intervention
- doctrine adaptation (upgrades tree) is a key part
- the battlefield visibly evolves from sparse engagements to dense industrial saturation
- all mecanics are assymétrical beetween both sides

---

## Supported play modes

The game must support four modes:
- Coalition only
- Regime only
- Both sides
- Observer / AI-vs-AI simulation

Observer mode should hide interactive controls and emphasize logs, metrics, and timeline.

---

## Win / loss conditions

### Coalition victory
Coalition wins if :
- all real regime bases destroyed


### Regime victory
Regime wins if:
- - Hand Free reaches zero
- or nuclear launch succeeds


---

## Core strategic model

There are two strategic macro bars.

### Coalition macro bar
Hand Free

Hand Free is a war viability meter, not spendable currency.
It starts at max and trends downward unless actively stabilized, or partially augmented.
It is an indice (0-100) , mulitplication of two indices :
- Economy : start at 100, derivative in relation to debt : if debt < 10 % of COALITION_PIB_BASE, then economy_derivative is positive, else is negative squarely proportionned. other parameters influencing economy : mine_trap (weapons from regime) : reduce economy (not derivative,chunk) ; Tresor_Bonds : up economy (chunk)
note : COALITION_PIB_BASE is a number to be balanced, representing a large amount of a super giant country budget 
- Public Support : start at 100, derivative in relation to war event : if interception_missile > 95 % , derivative is positive, else is negative, squarely proportionned. other parameters influencing Public_support : missile hit reduce it (large chunk), drone hit : reduce it (little chunk, but mutliplicative if hit are close on time : swarm hit), civilian base  : if hitten whitout casualties (hitten when scanned) then rise Public support (chunk), else reduce (chunk), public tax : reduce (chunk) , 

### Regime macro bar
Resilience

Resilience is also not spendable currency.
It starts low and grows slowly.
It is indice (0-100) , mulitplication of two indices :
- Fervor : start at 25%, rise (chunk) when missile and drone hit , reduced (chunk) when civilian base are hitten whit casualties, reduced (chunk) when kamikaze mine or ferfor tax are used (chunk)
- Dispersion : start at 25 % , rise for each base and each time a base is burried

If Resilience reaches a threshold (typically 95%):
- nuclear program unlocks
- countdown sequence begins
- a real nuclear launch base must be found and destroyed in time

This creates a hard late-game sword of Damocles and prevents endless drift.

---

## Core economic asymmetry

For buying weapons, defensive, utils, or upgrades, the two camps both use money, but not with the same model, neither the same mathématic scale.

### Coalition money model
Coalition does not operate with a normal spend-down budget bar.
Coalition accumulates War Debt, by billions, and can occasionnaly generate credit with income mecanism
Coalition start with a balance at 0. 

Coalition money loop:
- actions increase debt
- debt affects economy derivative
- economy affects Hand Free
- Hand Free determines long-term survivability

Coalition economic actions:
- Treasury Bonds
- Public Tax
- economy upgrades

Treasury Bonds:
- increase debt immediately for a positive money income per tick
- increase debt breakdown tolerance for economy derivative (10% initially, increase by a little chunk)

Public Tax:
- reduces debt by a chunk
- harms Public Support

### Regime money model
Regime operates with a more classical reserve bar.
It starts partially filled and regenerates slowly.
fervor rising reduce the price of weapons 

Regime economic actions:
- Oil shipping
- Kamikaze mining
- production upgrades

Oil shipping:
- improves money regeneration
- should have diminishing returns

Kamikaze mining:
- hurts Coalition economy
- improves regime oil price
- as a cost in fervor


Regime economy must not become infinitely exponential.
Its identity is:
- cheap persistence
- stabilization
- survival floor rather than infinite snowball

---

## Core military loop

The military system must be built around:
- production
- stock
- launch
- battlefield travel
- interception
- impact
- consequence

The key principle is that production and launch are decoupled.

### Stock system
For stock-based munitions, each item has:
- a buy / produce action
- a short production recharge bar
- a stock container
- a launch action

This applies to:
- Coalition offensive munitions
- Coalition defensive munitions
- Regime offensive munitions

The player must be able to:
- invest into stock generation
- delay launch
- release coordinated salvos
- automate buy
- automate launch

### Construction system
Non-stock systems are not launched from stock.
They are:
- purchased immediately
- then built over time with a construction timer

This applies to:
- bases
- buried bases
- anti-air
- radar spots
- infrastructure

Scan is an exception:
- immediate effect
- temporary reveal window

---

## Coalition military features

### Strike
Laser-guided ballistic strike.
Best direct tool against regime bases.
Accuracy strongly benefits from radar visibility and scan windows.

Special rule:
- consecutive grouped strikes receive a rafale bonus : in a short period of time (2s) , the 4th strike is free (doesnt take from stock)

### Jet Fighter
Carrier-based fighter.
Lifecycle:
- expensive initial acquisition
- cheaper reload than replacement
- intercept drones first
- if no drones, attack a regime base
- return to carrier
- reload
- wait for next launch

### Radar Spot
Buildable radar installation.
Improves passive battlefield visibility : reveal a part of fog of war. The radar spot are build nearer and nearer, so they becoem the first target for regime
Does not reveal hidden bases, civilian bases, or fake bases.

### Patriots
Heavy anti-air missile system.
Excellent against missiles.
Acceptable but economically bad against drones.

### Minigun / Cheap AA
Cheap anti-drone defense system.
Excellent against drones.
Ineffective against missiles.

### Scan
Active intelligence reveal on a chosen zone for a short duration.
Reveals:
- hidden bases
- civilian bases
- fake bases
- missiles and drone flying

During reveal:
- strikes can target those installations automatically
- civilian losses can be avoided by target discrimination

When scan ends:
- information is lost
- coalition auto-targeting can no longer see those disguised assets


---

## Regime military features

### Missile
Ballistic missile attack.
High damage if not intercepted.
Punishes anti-drone-heavy coalition builds.

Upgrade paths can include:
- submunitions
- speed
- power
- cost reduction
- penetration behavior

### Drone
Autonomous kamikaze attack platform.
Cheap saturation weapon.
Low individual damage.
Strong doctrine tool against missile-heavy coalition defenses.

### Create Base
Build a real military base.
Effects:
- increases dispersion 
- increases offensive production potential



### Bury Base
Hide a base underground.
Three burial levels should exist.
Each level:
- increases résilience
- increases scan number needed to identify it 

### Civilian Base
Convert a real base into a civilian-looking installation.
If destroyed without scan awareness:
- large public support penalty to coalition
- negative fervor effect for regime

### Fake Base
Create a false base signature.
Visible as a normal base.
Does not increase resilience.
Exists to waste coalition resources.

### Temporary radar lockdown
deployable device that stop radar for a zone and a brief moment

### Kamikaze Mine 
Strategic disruption action.
Effects:
- damages coalition economy indirectly
- increases value of oil sales for regime
- reduce fervor 
---

## Doctrine system and upograde

the doctrine are like tree for upgrade , non exclusive one to each other, organized by tier for upgrades
like all good idle, an absurd amount of upgrades is required, exploiting the mecanics of the game 
dotrines : 2 main branch, with 2 sub branches each : no exclusivity but a systeme of tier to unlock in each branch  
COALITION : Spin Doctor (media/econeomy : modifiy the way pussblic support is reduced , manipulating information, and/or boosting economy) and War Falcon (emphase the lethal power of the army, and/or the technologic advance ). 
REGIME : Supreme Leader (emphase the fervor and/or the oil effect ) and Tactical Harassment (emphase military efficiency and/or sabotage disruption)
---

## RESUMEE  Political system

### Coalition political layer
Public Support is affected by:
- precision strikes on valid targets
- high interception success
- missile hits
- drone hits
- civilian casualties from bad targeting
- taxation
- media / propaganda upgrades

### Regime political layer
Fervor is affected by:
- successful hits
- successful swarms
- fake-base destruction
- civilian losses caused by coalition
- internal extraction tools like Kamikaze Mine

---



## Logs and war storytelling

The game should produce readable emergent war stories.
Combat log and post-match summaries are not optional.
ironical and 2nd degree to emphase asymétri (for ex : a 20k drone shot down by a 2 millions patriots .. opinion ask : is it worth it ? )

Examples of log-worthy events:
- first missile hit
- first successful scan of hidden installation
- civilian base destroyed
- fake base wasted high-value strike
- first swarm breakthrough
- hand free critical
- nuclear program unlocked
- nuclear base destroyed
- coalition withdrawal

Post-match report should summarize:
- doctrine matchup
- total launches
- total successful impacts
- fake vs real targets destroyed
- economic collapse path
- decisive event
