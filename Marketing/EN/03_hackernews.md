# Show HN — Hacker News

> **Recommended timing:** Tuesday or Wednesday, 7–9am PST (10am–12pm EST)
> HN ranking is very time-sensitive. Aim for the 7–9am PST window.

---

## Title

```
Show HN: Asymmetric Wars – real-time war simulation where political fragility defeats military dominance
```

---

## Post

```
I built a browser-based idle war simulation around asymmetric conflict — the historical observation that technologically superior forces frequently lose wars not through military failure, but through economic exhaustion and political collapse.

**The core model:**

Two sides with fundamentally different game loops:

The **Coalition** accumulates War Debt (not a budget bar). Debt degrades Economy, Economy × Public Support = Hand Free, the war viability index. When Hand Free hits zero, the Coalition withdraws — regardless of battlefield score. The Coalition can destroy every real enemy base and still lose if it destroyed itself in the process.

The **Régime** builds Resilience: Fervor × Dispersion. It doesn't fight to win engagements — it disperses (builds, buries at 3 depth levels, disguises), absorbs hits, and waits for Hand Free to collapse. If Resilience crosses the threshold (~95%), a hidden nuclear program unlocks and a launch countdown begins.

**What I found interesting to model:**

- The **economic asymmetry of interception**: Patriots (~$2M per shot) intercepting drones (~$20k each) — the Régime's saturation strategy is profitable even with 0% mission success. The game models this ratio and lets the combat log comment on it.
- **Information asymmetry**: The Coalition sees a base — is it real, civilian, or fake? Striking without satellite scan confirmation costs public support on civilian hits. The scan window is temporary. Radar Lockdown can blackout a sector mid-scan.
- **Political fragility as the soft underbelly of hard power**: Spin Doctor doctrine upgrades let the Coalition manipulate public perception, slow support decay, control media framing. War Falcon upgrades escalate military power at political cost. The tension between them is the game.

**Observer mode**: both AIs play against each other while a satirical combat log narrates. You can just watch the war consume itself.

**Tech:** React 18, TypeScript, Tailwind CSS, shadcn/ui. Custom simulation engine in TypeScript (~4,000 lines), balance parameters externalized in JSON so scenarios override without touching engine logic.

**6 scenarios** with distinct doctrines: standard asymmetry, economic warfare, nuclear race, iron storm (Régime at full industrial speed), etc.

→ Demo: [URL]
→ Source: [GitHub URL]
```

---

## Anticipated responses to prepare

**"Isn't this politically biased — framing the 'Coalition' as the bad guy?"**
```
Both sides can be played, and both have paths to victory and defeat. The design goal wasn't to moralize but to model the structural dynamics that historically produce these outcomes. The Coalition can win; it just has to manage political cost, not just military output. Observer mode deliberately shows both sides as systems running their own logic — neither is "the bad guy," they're both caught in the same machine.
```

**"How does the AI play?"**
```
The Régime AI (Persistent Hydra) runs continuous base expansion, waits for interceptor depletion before saturation launches, buries revealed bases immediately, and switches doctrine based on Coalition build. The Coalition AI (Central Banker) runs fiscal scaling via a Fiscal Stability Index, delays production during debt spikes, and coordinates scan windows with strike salvos. Neither AI is optimal — they have distinct personalities that create varied Observer mode narratives.
```

**"What does 'idle' mean here — is it just a clicker game?"**
```
The idle mechanics are the automation layer: autobuy, autolaunch, and AI takeover of either side. But the interesting decisions are doctrine-level (what upgrades to prioritize, when to shift strategy) and timing-based (coordinating scan windows with strike launches, withholding interceptors before a swarm). The idle layer lets the simulation run without constant micro, but the strategic layer rewards attention.
```

**"Why browser-based?"**
```
Primarily for instant access — no install barrier for a game people are evaluating. The custom engine is entirely in TypeScript, which made the browser target natural. Performance on mid-range hardware handles the simulation loop without issue at the current scale.
```
