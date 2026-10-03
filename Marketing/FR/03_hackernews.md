# Show HN — Hacker News

> **Timing recommandé :** mardi ou mercredi, 8h-10h heure US (14h-16h FR)
> HN est très sensible à l'heure de post. Viser la fenêtre 7h-9h PST / 10h-12h EST.

---

## Titre

```
Show HN: Asymmetric Wars – simulation de guerre en temps réel où la fragilité politique bat la domination militaire
```

---

## Post

```
J'ai construit une simulation de guerre idle dans le navigateur autour du conflit asymétrique — l'observation historique que les forces militairement supérieures perdent fréquemment leurs guerres non pas par échec militaire, mais par épuisement économique et effondrement politique.

**Le modèle central :**

Deux camps avec des boucles de jeu fondamentalement différentes :

La **Coalition** accumule de la Dette de Guerre (pas une barre de budget). La dette dégrade l'Économie. Économie × Soutien Populaire = Main Libre, l'indice de viabilité de la guerre. Quand Main Libre tombe à zéro, la Coalition se retire — quel que soit l'état du terrain. La Coalition peut détruire toutes les vraies bases ennemies et quand même perdre si elle s'est détruite elle-même dans le processus.

Le **Régime** construit sa Résilience : Ferveur × Dispersion. Il ne combat pas pour gagner des engagements — il se disperse (construit, enterre sur 3 niveaux, se déguise), absorbe les coups, et attend que Main Libre s'effondre. Si la Résilience dépasse le seuil (~95 %), un programme nucléaire caché se déverrouille et un compte à rebours commence.

**Ce que j'ai trouvé intéressant à modéliser :**

- **L'asymétrie économique de l'interception** : des Patriots (~2 M€ le tir) qui interceptent des drones (~20 000 € l'unité) — la stratégie de saturation du Régime est rentable même avec 0 % de succès mission. Le jeu modélise ce ratio et laisse le log de combat commenter.
- **L'asymétrie d'information** : la Coalition voit une base — est-ce une vraie, une civile, ou un leurre ? Frapper sans confirmation de scan satellite coûte du soutien populaire sur les frappes civiles. La fenêtre de scan est temporaire. Le Verrouillage Radar peut aveugler un secteur en plein milieu d'un scan.
- **La fragilité politique comme ventre mou de la puissance dure** : les upgrades de doctrine Spin Doctor laissent la Coalition manipuler la perception publique, ralentir l'érosion du soutien, contrôler le cadrage médiatique. Les upgrades Faucon de Guerre escaladent la puissance militaire au coût politique. La tension entre les deux, c'est le jeu.

**Mode Observateur** : les deux IA jouent l'une contre l'autre pendant qu'un log satirique commente. On peut juste regarder la guerre se consumer.

**Tech :** React 18, TypeScript, Tailwind CSS, shadcn/ui. Moteur de simulation custom en TypeScript (~4 000 lignes), paramètres d'équilibre externalisés en JSON pour que les scénarios puissent tout surcharger sans toucher à la logique du moteur.

**6 scénarios** avec des doctrines distinctes : asymétrie standard, guerre économique, course nucléaire, tempête de fer (Régime à pleine vitesse industrielle), etc.

→ Démo : [URL]
→ Source : [URL GitHub]
```

---

## Réponses anticipées à préparer

**"N'est-ce pas politiquement biaisé — présenter la 'Coalition' comme le méchant ?"**
```
Les deux camps sont jouables, et les deux ont des chemins vers la victoire et la défaite. L'objectif de design n'était pas de moraliser mais de modéliser les dynamiques structurelles qui produisent historiquement ces résultats. La Coalition peut gagner ; elle doit juste gérer le coût politique, pas seulement la production militaire. Le mode Observateur montre délibérément les deux camps comme des systèmes appliquant leur propre logique — aucun n'est "le méchant", ils sont tous les deux pris dans la même machine.
```

**"Comment joue l'IA ?"**
```
L'IA du Régime (Hydre Persistante) développe en continu ses bases, attend l'épuisement des intercepteurs avant les lancements de saturation, enterre immédiatement les bases révélées, et change de doctrine selon la build de la Coalition. L'IA de la Coalition (Banquier Central) gère l'échelle fiscale via un Indice de Stabilité Fiscale, retarde la production lors des pics de dette, et coordonne les fenêtres de scan avec les salves de frappes. Aucune IA n'est optimale — elles ont des personnalités distinctes qui créent des récits variés en mode Observateur.
```

**"Qu'est-ce que 'idle' veut dire ici — c'est juste un clicker ?"**
```
Les mécaniques idle sont la couche d'automatisation : achat automatique, lancement automatique, et prise en charge IA de l'un ou l'autre camp. Mais les décisions intéressantes sont au niveau de la doctrine (quels upgrades prioriser, quand changer de stratégie) et du timing (coordonner les fenêtres de scan avec les lancements de frappes, retenir les intercepteurs avant un swarm). La couche idle laisse la simulation tourner sans micro constant, mais la couche stratégique récompense l'attention.
```

**"Pourquoi dans le navigateur ?"**
```
Principalement pour l'accès immédiat — pas de barrière d'installation pour un jeu que les gens évaluent. Le moteur custom est entièrement en TypeScript, ce qui rendait la cible navigateur naturelle. Les performances sur du matériel milieu de gamme gèrent la boucle de simulation sans problème à l'échelle actuelle.
```
