# Posts Reddit — Asymmetric Wars

---

## r/indiegaming

**Titre :**
```
I made a war simulation idle game where the technologically dominant side loses — not through bad luck, but by design [OC]
```

**Post :**
```
Asymmetric Wars is a real-time idle simulation about asymmetric conflict — the kind where one side has jets, Patriot batteries, and a GDP to match, and still loses.

**The core concept:**

Two fundamentally different forces:

- **The Coalition** — technologically superior, politically fragile. It operates on war debt (not a budget bar), and that debt eats into its Economy index. Economy × Public Support = Hand Free, the only meter that matters. When Hand Free hits zero, the war ends. Not because the Coalition was outgunned — because it outlasted itself.

- **The Régime** — materially weaker, structurally resilient. It doesn't fight to win battles. It builds, buries, disperses, and waits. Fervor × Dispersion = Resilience, its own strategic meter. If Resilience crosses the threshold, a nuclear program unlocks.

**What makes it different from a standard strategy game:**

- Both sides are **completely asymmetric** in mechanics, not just stats. The Coalition manages debt spirals and press releases. The Régime builds fake bases to waste precision strikes and buries real ones three levels deep.
- The combat log runs **satirical commentary** in real time: "A $20k drone just absorbed a $2M Patriot intercept. Coalition considers this a defensive win."
- **Observer mode**: let two AIs fight each other and just watch. The log tells the story.
- **6 scenarios** with distinct doctrine matchups, from economic warfare to nuclear race.

Built in React + TypeScript with a custom ~4000-line simulation engine.

→ [URL]

Happy to talk mechanics, design decisions, or historical references behind the systems.
```

**Tags à ajouter :** `indiegame` `strategy` `simulation` `OC` `idlegame`

---

## r/strategy

**Titre :**
```
Built a war sim where political fragility kills the stronger side — asymmetric conflict as core mechanic [OC]
```

**Post :**
```
Strategy games usually solve asymmetry with number tweaks. I tried something different: the two sides in Asymmetric Wars have fundamentally different game loops.

**The Coalition's game:**

Economic attrition. It doesn't spend from a budget — it accumulates War Debt. Debt degrades the Economy index. Economy × Public Support = Hand Free, the war viability meter. Hand Free draining to zero = Coalition defeat, regardless of battlefield score.

This means a Coalition that intercepts every missile, destroys every real base, and maintains air superiority can still lose — if the economic cost of doing so has already broken domestic support.

**The Régime's game:**

Dispersion and patience. Build bases, bury them (3 levels deep, each requiring more consecutive scans to identify), disguise some as civilian installations, build fake ones to waste high-value strikes. The Régime's goal isn't to "win" — it's to remain structurally alive long enough for Hand Free to collapse on the other side.

If Resilience (Fervor × Dispersion) crosses 95%, a nuclear program unlocks and a countdown begins. The Coalition must find and destroy the hidden launch base before it fires.

**Doctrine trees:**

Both sides have two doctrine branches:
- Coalition: *Spin Doctor* (media manipulation, economic management) vs *War Falcon* (military escalation)
- Régime: *Supreme Leader* (fervor + oil economy) vs *Tactical Harassment* (military efficiency + sabotage)

The interesting decisions aren't "do I buy more firepower" — they're about doctrine identity under pressure.

**Observer mode** lets the two AIs play against each other while a satirical combat log comments on the absurdity of the cost ratios.

→ [URL]

Would love feedback from strategy players on the doctrine balance especially.
```

---

## r/gamedev

**Titre :**
```
Devlog: building asymmetric war mechanics that aren't just "one side has more HP" [OC]
```

**Post :**
```
I've been building Asymmetric Wars, a real-time idle war sim, and the core design challenge was: how do you make two factions feel genuinely different without just changing numbers?

**The answer I landed on: asymmetric loss conditions.**

The Coalition can't afford to "not win" — every week of war costs debt that corrodes its political structure. The Régime can't afford to "lose everything" — but it doesn't need to win battles, just maintain enough dispersion to outlast the Coalition's political will.

This created two completely different gameplay loops from the same battlefield.

**Technical note:** the game runs on a custom TypeScript simulation engine (~4000 lines, `engine.ts`) with all balance parameters externalized in a JSON system so each scenario can override any value without touching game logic. The result is 6 distinct scenarios with very different strategic feels without code duplication.

**The satirical log system:**

One thing I'm proud of: the combat log generates ironic milestone commentary. When a drone worth $20k is intercepted by a Patriot worth $2M, the log notes the cost ratio. When a civilian base gets struck without scan confirmation, the log summarizes the diplomatic fallout. It's a light layer, but it gives the simulation a "voice" that reinforces the game's thesis.

**What I'm still balancing:**

- Doctrine tree progression timing (when does War Falcon vs Spin Doctor diverge meaningfully?)
- Observer AI tempo — the AI-vs-AI match should feel like a war story, not just numbers moving
- Nuclear endgame countdown pacing

→ Demo: [URL]

Open to feedback on the mechanic design especially.
```

---

## Notes de timing

| Subreddit | Meilleur moment | Heure FR |
|-----------|----------------|----------|
| r/indiegaming | Lun-Mer | 16h-20h |
| r/strategy | Mar-Jeu | 15h-18h |
| r/gamedev | Mar-Jeu | 15h-19h |

Poster r/indiegaming en premier (plus de trafic = plus de visibilité cross-platform).
