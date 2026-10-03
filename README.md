# ⚔️ Asymmetric Wars

> *Real-time idle war simulation built around asymmetry, doctrine counterplay, economic deterioration, political pressure, and escalating battlefield automation.*

---

## 📖 Concept

Two fundamentally unequal forces locked in a war of attrition:

- **The Coalition** — technologically dominant, politically fragile. An exponentially growing economy that can become its own enemy. Time is its worst foe.
- **The Régime** — materially weaker but structurally resilient, deceptive, and strategically patient. Time is its best weapon.

---

## 🎮 Play Modes

| Mode | Description |
|---|---|
| **Coalition only** | Manage the military-industrial superpower |
| **Régime only** | Run the asymmetric resistance |
| **Both sides** | Full strategic control of the conflict |
| **Observer / AI vs AI** | Watch the simulation unfold without intervention |

---

## 🏆 Victory Conditions

### Coalition wins when:
- All real Régime military bases are destroyed

### Régime wins when:
- Coalition **Hand Free** reaches zero
- **OR** a nuclear launch succeeds before the nuclear base is destroyed

---

## 🏛️ Coalition — Full Feature Set

### Economic System
- **War Debt model** — Coalition accumulates debt (in billions) rather than spending a budget bar
- **Treasury Bonds** — immediate debt + income per tick + debt tolerance boost
- **Public Tax** — reduces debt at the cost of Public Support
- **Fear Business** — emergency liquidity tool, activated under crisis conditions
- **Maintenance cost** — ongoing upkeep penalizes overextension

### Macro Bars
- **Economy** (0–100) — driven by debt-to-PIB ratio; positive derivative if debt < 10% of base PIB, negative and squared above that
- **Public Support** (0–100) — rises from successful interceptions; damaged by missile/drone hits, civilian casualties, swarm breakthroughs, and taxation
- **Hand Free** — product of Economy × Public Support; reaching zero triggers Coalition defeat

### Offensive Arsenal
- **Airstrikes** — precision guided strikes against Régime bases; accuracy improved by radar visibility and active scan windows; *Rafale bonus*: 4th strike within a 2-second burst is free
- **Jet Fighters** — carrier-based interceptors; intercept drones on patrol, strike a Régime base if no threat is active, then return and reload

### Defensive Grid
- **Patriot batteries** — heavy anti-air; excellent vs missiles, costly vs drones
- **Minigun / CIWS** — cheap anti-drone; ineffective vs missiles
- **Interceptor missiles** — auto-recharge from Patriot batteries; magazine system
- **Laser defense** — additional interception layer (upgrade-unlocked)
- **Radar Spots** — buildable installations that passively lift fog of war; does not reveal hidden/civilian/fake bases; closer builds become priority Régime targets

### Intelligence
- **Scan** — active satellite reveal on a chosen north/south sector; temporarily exposes hidden, civilian, and fake bases; scan window enables discriminating targeting; info is lost when scan ends
- **Fog of War** — limits baseline visibility; radar spots reduce it progressively

### Upgrade Doctrine — *Spin Doctor* branch (information / economy)
| Upgrade | Effect |
|---|---|
| Media Campaign | −10% public support loss from drone hits |
| Embedded Journalists | Successful strikes boost public support |
| Information Control | Missile hit visibility −12% |
| Narrative Control | Civilian hits cause 30% less support loss when scanned |
| War Fatigue Resistance | Slows natural public support decay |
| War Economy | +2% debt breakdown tolerance per level |
| Trade Routes | +5% income per tick |
| GDP Stimulus | Boosts economy derivative |
| Allied Aid Package | Periodic debt reduction |
| Premium Bonds | Treasury bonds yield 20% more income |

### Upgrade Doctrine — *War Falcon* branch (military / technology)
| Upgrade | Effect |
|---|---|
| Precision Guidance | +5% strike accuracy per level |
| Bunker Busters | Strikes can hit buried bases (−1 burial level per hit) |
| Carpet Bombing | +50% strike power, −public support over time |
| Fighter Doctrine | Fighters reload 20% faster |
| Intelligence Network | +10% intel modifier for strikes |
| Patriot Upgrade | +15% interception rate vs missiles |
| CIWS Enhancement | +20% minigun efficiency vs drones |
| Laser Defense | +3 laser interceptions per tick per level |
| Advanced Radar | Radar spots reveal wider area |
| Scan Duration+ | Scan window lasts 50% longer |
| Satellite Resolution | +10% scan area coverage per level |
| Mass Production | −10% all unit costs |
| Strike Fast-Track | −10% strike production time |
| Fighter Quick-Turn | −8% fighter production time |
| Rapid Deployment | −5% maintenance cost per level |
| Interceptor Surge | Interceptors recharge 15% faster |

---

## 🗡️ Régime — Full Feature Set

### Economic System
- **Cash reserve** — classical money bar; regenerates progressively
- **Oil Shipping** — upgradeable income multiplier with diminishing returns
- **Kamikaze Mines** — damage Coalition economy, improve oil sale value, cost Fervor
- **Fervor-linked pricing** — high fervor reduces the cost of offensive weapons

### Macro Bars
- **Fervor** (0–100) — rises from successful hits and swarm breakthroughs; drops from civilian base losses, kamikaze mines, and Fervor Tax
- **Dispersion** (0–100) — grows with each base built and each burial; measures strategic spread
- **Resilience** — product of Fervor × Dispersion; at threshold (~95%), the nuclear program unlocks and the countdown begins

### Offensive Arsenal
- **Drones** — cheap kamikaze swarm weapons; low individual damage, high saturation power; swarms within 2 seconds get a coordinated damage bonus; minigun bait
- **Ballistic Missiles** — high impact if not intercepted; punishes minigun-heavy Coalition builds; upgradeable with submunitions and penetration

### Infrastructure
- **Military Base** — increases Dispersion and offensive production potential
- **Civilian Base** — disguised installation; destroying it without scan confirmation causes a major Coalition public support penalty and a moderate Régime Fervor penalty
- **Fake Base** — decoy that wastes Coalition strikes; does not contribute to Resilience
- **Bury Base** — three burial levels; each level increases Resilience and the number of consecutive scans needed to identify the base
- **Build Queue** — bases are queued and built over time with a construction timer

### Special Actions
- **Radar Lockdown** — temporary zone blackout; counters active scan windows; has a cooldown
- **Kamikaze Mine** — strategic disruption tool; harms Coalition economy indirectly

### Nuclear Escalation
- When Resilience crosses the threshold, a hidden **nuclear base** is spawned
- Coalition must find and destroy it within the countdown window or lose

### Upgrade Doctrine — *Supreme Leader* branch (fervor / economy)
| Upgrade | Effect |
|---|---|
| State Propaganda | +2 Fervor per tick |
| Martyrdom Doctrine | Destroyed bases grant Fervor instead of losing it |
| Cult of Personality | Fervor decay −15% |
| Fervor Tax | Convert Fervor into money |
| Volunteer Army | High Fervor generates free drones per tick |
| Oil Refinery | +15% oil shipping returns |
| Smuggling Network | Bypass diminishing returns on oil |
| War Profiteering | Kamikaze mines increase oil value further |
| Black Market | Sell intercepted Coalition tech for money |

### Upgrade Doctrine — *Tactical Harassment* branch (military / disruption)
| Upgrade | Effect |
|---|---|
| Drone Workshop | −15% drone production time |
| Missile Foundry | −12% missile production time |
| Swarm Tactics | Drones within 2s of each other deal bonus damage |
| Warhead Upgrade | +20% missile impact damage |
| Stealth Coating | Drones 8% harder to intercept |
| Submunitions | Missiles split into 2 warheads on approach |
| Improvised Parts | −10% drone cost |
| Drone Quick-Load | −8% drone production time (stacks) |
| Missile Fast-Arm | −6% missile production time (stacks) |
| Rapid Fortification | −8% base construction cost |
| Base Hardening | Bases harder to destroy from strikes |
| Decoy Warheads | Missiles 8% harder to intercept |
| Tunnel Network | Buried bases cost 20% less to bury |
| Camouflage Tech | Civilian/fake bases harder to scan |
| Radar Jamming | Radar Lockdown lasts 30% longer |
| Anti-Air Systems | +1 anti-air level vs incoming strikes |

---

## 🎯 Scenarios

Six pre-built scenarios, each with a distinct doctrine matchup:

| Scenario | Difficulty | Concept |
|---|---|---|
| **⚔️ Escarmouche Standard** | Normal | Balanced starting parameters — pure asymmetry |
| **🛡️ Bouclier de Fer** | Hard | Coalition has overwhelming air defense but is economically fragile |
| **🌊 La Guerre Froide** | Hard | Slow war of attrition — Régime bases are near-indestructible |
| **🔥 Tempête de Fer** | Extreme | Régime starts at full industrial war speed; Coalition starts thin on defense |
| **☢️ Course à l'Atome** | Extreme | Régime is close to nuclear threshold; Coalition has precision strikes but crumbling public support |
| **💰 La Guerre des Marchés** | Hard | Pure economic warfare — both sides win or lose in their balance sheets |

---

## 🤖 AI Systems

Both sides run a full strategic AI when not controlled by the player:

### Régime AI — *Persistent Hydra*
- **Hydra Expansion** — relentless base construction with no hard cap
- **Saturation Swarms** — waits for overwhelming numbers to deplete Coalition interceptors before launching
- **Reactive Defense** — buries revealed bases immediately; activates Radar Lockdown when scans are active
- **Adaptive Research** — switches between Ghost Wave, Steel Rain, Petrodollar, and Iron Shield combos based on Coalition build

### Coalition AI — *Central Banker*
- **Strategic Fiscal Scaling** — proactive bond issuance and aggressive tax collection
- **Debt-Responsive Production** — adjusts strike/fighter autobuy thresholds based on Fiscal Stability Index (FSI)
- **Recovery Doctrine** — prioritizes economic upgrades when debt rises
- **Tactical Discipline** — scans when strikes are stocked; launches saturation salvos during scan windows; holds fire when stock is low and Régime is contained

---

## 📊 Combat Log & War Storytelling

- Live **combat log** tracking: drones/missiles launched, intercepted, impacts, bases destroyed, civilian hits, radar damage
- **Satirical event commentary** — ironic second-degree messages emphasizing the absurdity of asymmetric cost ratios (e.g. a $20k drone shot down by a $2M Patriot)
- **Milestone events**: first missile hit, first successful scan, civilian base destroyed, first swarm breakthrough, Hand Free critical, nuclear program unlocked, nuclear base destroyed, Coalition withdrawal
- **Post-game report**: doctrine matchup, total launches, successful impacts, fake vs. real targets, economic collapse path, decisive event

---

## 🛠️ Tech Stack

- **React** + **TypeScript** — UI and state management
- **Vite** — build tooling and hot reload
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component library
- **Custom game engine** — pure TypeScript simulation loop (`engine.ts`, ~4000 lines)
- **JSON balance system** — all numeric parameters externalized and overridable per scenario

---

## 🚀 Getting Started

```sh
# Clone the repository
git clone https://github.com/Soupappa/asymmetric-war.git
cd asymmetric-war

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🗺️ Roadmap

### 🔧 Polish & Équilibrage
- [ ] Rééquilibrage fin des scénarios (vitesses, seuils, courbes économiques)
- [ ] Ajustement des arbres de doctrine (coûts, effets, timing)
- [ ] Réglage du mode Observer (lisibilité des logs, métriques, timeline)
- [ ] Animations et feedback visuels supplémentaires sur le champ de bataille
- [ ] Améliorations UI/UX (tooltips, tutoriel enrichi, accessibilité)

### 📋 Scénarios
- [ ] Test et validation de chaque scénario jusqu'au bout
- [ ] Ajout de conditions de victoire alternatives par scénario
- [ ] Scénarios communautaires / éditeur de scénario

### 🌐 Déploiement
- [ ] Build de production optimisé
- [ ] Hébergement (Vercel / Netlify / GitHub Pages)
- [ ] Domaine personnalisé
- [ ] Monitoring et analytics (erreurs, sessions)

### 🧪 Beta Test
- [ ] Recrutement de testeurs internes
- [ ] Collecte de feedback structurée (formulaire, Discord)
- [ ] Itérations rapides sur retours beta
- [ ] Tests de performance sur différents appareils

### 🎉 Lancement
- [ ] Page de lancement (landing page)
- [ ] Annonce publique (réseaux sociaux, forums, itch.io...)
- [ ] Support post-lancement et correctifs
- [ ] Feuille de route publique post-v1

## Publication BAAM.Games

- URL publique : <https://asym.games.baam.pro/>
- Manifest : <https://asym.games.baam.pro/.well-known/baam.json>
- Build Netlify : `npm run build`, dossier publié `dist/`

En production, une notification Netlify `Deploy succeeded` appelle le build hook
privé de BAAM.Games. Le script `postbuild` reste disponible comme mécanisme de repli
avec `BAAM_DOWNSTREAM_BUILD_HOOK`.
