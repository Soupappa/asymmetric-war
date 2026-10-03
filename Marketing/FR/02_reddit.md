# Posts Reddit — Asymmetric Wars

---

## r/indiegaming

**Titre :**
```
J'ai fait un jeu de simulation de guerre idle où le camp technologiquement dominant perd — pas par malchance, mais par conception [OC]
```

**Post :**
```
Asymmetric Wars est une simulation idle en temps réel sur les conflits asymétriques — le genre de guerre où un camp a des jets, des batteries Patriot et un PIB à la hauteur, et perd quand même.

**Le concept central :**

Deux forces fondamentalement différentes :

- **La Coalition** — technologiquement supérieure, politiquement fragile. Elle accumule de la dette de guerre (pas une barre de budget), et cette dette ronge son indice d'Économie. Économie × Soutien Populaire = Main Libre, le seul compteur qui compte. Quand Main Libre tombe à zéro, la guerre se termine. Pas parce que la Coalition a été surpassée militairement — parce qu'elle s'est épuisée elle-même.

- **Le Régime** — matériellement plus faible, structurellement résilient. Il ne combat pas pour gagner des batailles. Il construit, enterre, se disperse, et attend. Ferveur × Dispersion = Résilience, son propre compteur stratégique. Si la Résilience dépasse le seuil, un programme nucléaire se déverrouille.

**Ce qui le distingue d'un jeu de stratégie classique :**

- Les deux camps sont **complètement asymétriques** dans leurs mécaniques, pas seulement dans leurs stats. La Coalition gère des spirales de dette et des relations presse. Le Régime construit des bases leurres pour gaspiller les frappes de précision et enterre les vraies à trois niveaux de profondeur.
- Le log de combat produit un **commentaire satirique** en temps réel : "Un drone à 20 000 € vient d'absorber un tir de Patriot à 2 000 000 €. La Coalition considère ça comme une victoire défensive."
- **Mode Observateur** : laisse deux IA se battre et regarde. Le log raconte l'histoire.
- **6 scénarios** avec des confrontations doctrinales distinctes, de la guerre économique à la course nucléaire.

Fait avec React + TypeScript et un moteur de simulation custom d'environ 4 000 lignes.

→ [URL]

N'hésitez pas à parler des mécaniques, des décisions de design, ou des références historiques derrière les systèmes.
```

**Tags :** `indiegame` `strategy` `simulation` `OC` `idlegame`

---

## r/strategy

**Titre :**
```
J'ai construit un sim de guerre où la fragilité politique bat le camp le plus fort — le conflit asymétrique comme mécanique centrale [OC]
```

**Post :**
```
Les jeux de stratégie règlent l'asymétrie avec des ajustements de chiffres. J'ai essayé autre chose : les deux camps dans Asymmetric Wars ont des boucles de jeu fondamentalement différentes.

**Le jeu de la Coalition :**

Attrition économique. Elle n'a pas une barre de budget — elle accumule de la Dette de Guerre. La dette dégrade l'indice d'Économie. Économie × Soutien Populaire = Main Libre, le compteur de viabilité. Main Libre à zéro = défaite de la Coalition, quel que soit l'état du terrain.

Cela signifie qu'une Coalition qui intercepte chaque missile, détruit chaque vraie base, et maintient sa supériorité aérienne peut quand même perdre — si le coût économique a déjà brisé le soutien intérieur.

**Le jeu du Régime :**

Dispersion et patience. Construire des bases, les enterrer (3 niveaux, chacun nécessitant davantage de scans consécutifs pour être identifié), en déguiser certaines en installations civiles, en construire d'autres en leurres. L'objectif du Régime n'est pas de "gagner" — c'est de rester structurellement vivant assez longtemps pour que Main Libre s'effondre de l'autre côté.

Si la Résilience (Ferveur × Dispersion) dépasse 95 %, un programme nucléaire se déverrouille et un compte à rebours commence. La Coalition doit trouver et détruire la base de lancement cachée avant qu'elle tire.

**Les arbres de doctrine :**

Les deux camps ont deux branches de doctrine :
- Coalition : *Spin Doctor* (manipulation médiatique, gestion économique) vs *Faucon de Guerre* (escalade militaire)
- Régime : *Leader Suprême* (ferveur + économie pétrolière) vs *Harcèlement Tactique* (efficacité militaire + sabotage)

Les décisions intéressantes ne sont pas "est-ce que j'achète plus de puissance de feu" — elles portent sur l'identité doctrinale sous pression.

**Le mode Observateur** laisse les deux IA s'affronter pendant qu'un log satirique commente l'absurdité des ratios de coûts.

→ [URL]

Retours des joueurs de stratégie sur l'équilibre des doctrines bienvenus.
```

---

## r/gamedev

**Titre :**
```
Devlog : concevoir des mécaniques de guerre asymétrique qui ne se résument pas à "un camp a plus de PV" [OC]
```

**Post :**
```
J'ai construit Asymmetric Wars, un sim de guerre idle en temps réel, et le défi central de design était : comment rendre deux factions vraiment différentes sans juste changer des chiffres ?

**La réponse : des conditions de défaite asymétriques.**

La Coalition ne peut pas se permettre de "ne pas gagner" — chaque semaine de guerre coûte de la dette qui corrode sa structure politique. Le Régime ne peut pas se permettre de "tout perdre" — mais il n'a pas besoin de gagner des batailles, juste de maintenir assez de dispersion pour survivre à la volonté politique adverse.

Cela a créé deux boucles de jeu complètement différentes sur le même champ de bataille.

**Note technique :** le jeu tourne sur un moteur de simulation TypeScript custom (~4 000 lignes, `engine.ts`) avec tous les paramètres d'équilibre externalisés dans un système JSON, de sorte que chaque scénario peut surcharger n'importe quelle valeur sans toucher à la logique du moteur. Résultat : 6 scénarios avec des ressentis stratégiques très différents, sans duplication de code.

**Le système de log satirique :**

Le log de combat génère des commentaires ironiques sur les événements majeurs. Quand un drone à 20 000 € est intercepté par un Patriot à 2 000 000 €, le log note le ratio. Quand une base civile est frappée sans confirmation de scan, le log résume les retombées diplomatiques. C'est une couche légère, mais elle donne à la simulation une voix qui renforce la thèse du jeu.

**Ce que j'équilibre encore :**

- La progression des arbres de doctrine (quand Faucon de Guerre vs Spin Doctor divergent-ils vraiment ?)
- Le tempo de l'IA en mode Observateur — le match IA vs IA doit ressembler à une histoire de guerre, pas à des chiffres qui bougent
- Le rythme du compte à rebours nucléaire en fin de partie

→ Démo : [URL]

Ouvert aux retours sur la conception mécanique.
```

---

## Notes de timing

| Subreddit | Meilleur moment | Heure FR |
|-----------|----------------|----------|
| r/indiegaming | Lun-Mer | 16h-20h |
| r/strategy | Mar-Jeu | 15h-18h |
| r/gamedev | Mar-Jeu | 15h-19h |

Poster r/indiegaming en premier (plus de trafic = plus de visibilité cross-platform).
