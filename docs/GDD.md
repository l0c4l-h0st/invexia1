# Game Design Document — Palace Rush

> Source de vérité chiffrée : `src/balance.ts` (formules dérivées dans `src/game/economy.ts`).
> Ce document l'explique. **Toute modification de l'un doit être reportée dans l'autre.**

## 1. Pitch
Arcade idle de gestion d'hôtel, chill, à un doigt, en portrait. On part d'un motel miteux, on finit à
la tête d'un empire de palaces. Le contraste visuel entre le début et la fin EST la récompense.

## 2. Contrôles
Un seul : **joystick flottant**. Poser le doigt n'importe où crée le stick à cet endroit ; glisser
déplace le personnage. Aucun bouton d'action : tout se déclenche en entrant dans une zone au sol
(cercle qui se remplit) ou en restant sur une dalle d'achat. Les seuls boutons sont ceux de l'UI.

Caméra : vue aérienne à 50°, suivi lissé, ~10 unités de large visibles en portrait.

## 3. Boucle de base
1. Un client arrive et fait la queue à la réception.
2. Le joueur se place derrière le comptoir → cercle de 0,6 s → le client paie **un acompte de 30 %**
   tout de suite (billets qui volent) et part en chambre.
3. Le client dort 5,5 s, puis laisse **une pile de cash** et **une chambre sale**.
4. Le joueur prend du linge à la réserve (pile sur le dos, 0,07 s par pièce), nettoie la chambre
   (cercle de 0,9 s, consomme 1 pièce de linge), ramasse le cash (aimant : rayon 1,7).
5. Le cash se dépense en restant sur les **dalles d'achat** : chambre, amélioration des chambres,
   service, embauche, établissement suivant.

### Les 3 premières minutes (priorité absolue)
Le début a été refait après un premier test jugé ennuyeux (« en 3 min on a envie de désinstaller »).
Principes :
- **Une récompense dans les 10 premières secondes** : une pile de bienvenue de 20 $ attend dans le
  hall ; la première dalle (chambre 3) coûte 15 $. Ramasser, acheter, confettis.
- **Jamais d'attente** : on démarre avec 2 chambres, les clients arrivent toutes les 1,5 s, dorment
  5,5 s. Il y a toujours quelqu'un à accueillir ou une chambre à faire.
- **Un achat toutes les 20 à 40 s** au motel (mesuré : toutes les ~20 s pour le bot).
- **Chaque geste rapporte tout de suite** : acompte à l'enregistrement, pile à la sortie, combo.
- **Premier employé vers 2 min 30** au lieu de 10 min.

Il y a toujours **1 ou 2 dalles visibles**, une flèche qui y mène, et la jauge « prochain
déblocage » dans le HUD (avec l'avancement du palier, ex. `3/11`).

## 4. Combo « Rush » et pourboires
- **Combo** : chaque action faite *par le joueur* (enregistrer, nettoyer, ramasser, acheter) monte le
  combo d'un cran ; il retombe à zéro après 6 s sans action. Chaque cran = **+5 % de cash** sur ce
  que le joueur encaisse lui-même, plafonné à **×1,5** (10 crans). Bonus uniquement, jamais de malus.
- **RUSH** : à partir de 6 crans, vitesse +12 % et traînée d'étincelles tant que le combo tient.
- **Pourboires oubliés** : une pièce d'or apparaît toutes les 12 à 22 s quelque part dans l'hôtel
  (3 maximum). Elle vaut 1,2 séjour et compte pour le combo. De quoi courir entre deux clients.

## 5. Introduction des systèmes, un par un
| Système | Condition (`B.unlock`, `Game.checkFeatures`) | Moment mesuré (bot) |
|---|---|---|
| Boucle de base, combo, pourboires | dès le départ | 0 min |
| **Staff** (dalles d'embauche) | 2 min 30 de jeu **et** 4 chambres au motel | ~2 min 30 |
| **Améliorations** (bouton HUD) | 2 employés embauchés | ~3 min 30 |
| **Bonus** (pubs factices) | arrivée au Petit hôtel | ~4 min |
| **Quêtes & succès** | 3 achats dans le Petit hôtel | ~8 min |
| **Monde & Prestige** | arrivée au premier Palace | ~30 min |

Un humain est ~1,5× plus lent que le bot. Après un prestige, tous les systèmes restent débloqués.

> Écart assumé par rapport à la consigne d'origine (« rien d'autre que la boucle de base pendant
> 10 minutes ») : au test, 10 minutes seul étaient trop longues. La valeur est `B.unlock.staffTime`.

Tutoriel : 3 pastilles sans texte (billet → cloche → balai), une main animée tant qu'on n'a pas
bougé, puis la flèche de guidage. Il se termine quand on a acheté, accueilli et nettoyé une fois.

## 6. Paliers d'un établissement
Chaque palier est une nouvelle carte, une nouvelle palette et de nouveaux services.

| # | Palier | Tarif / séjour | `costBase` | Chambres (départ → max) | Services |
|---|---|---|---|---|---|
| 1 | Motel miteux | 10 | 1 | 2 → 6 | distributeur |
| 2 | Petit hôtel | 60 | 18 | 3 → 8 | parking, café |
| 3 | Hôtel de ville | 380 | 250 | 4 → 10 | parking, restaurant |
| 4 | Resort | 2 400 | 2 400 | 4 → 12 | parking, restaurant, piscine, spa |
| 5 | Palace | 15 000 | 20 000 | 5 → 14 | parking, restaurant, piscine, spa, casino, héliport |

Le staff et les améliorations sont conservés d'un palier à l'autre ; chambres, niveau des chambres
et services repartent du minimum du nouveau palier.

### Chaîne d'achats
Chaque palier a une liste ordonnée d'achats (`TIERS[i].chain`), chacun avec un poids `w`.

```
coût = w × costBase(palier) × 7500^ville
```

Motel (costBase 1) : chambre 3 = 15 · chambre 4 = 35 · chambres niv. 2 = 60 · distributeur = 90 ·
chambre 5 = 120 · réceptionniste = 150 · chambre 6 = 190 · femme/homme de chambre = 230 ·
chambres niv. 3 = 300 · bagagiste = 280 · **Petit hôtel = 700**.

Les embauches ne sont proposées qu'une fois le staff débloqué. La dalle « établissement suivant »
n'apparaît que lorsque tout le reste est acheté.

## 7. Revenus
```
séjour   = tarif(palier) × 2500^ville × niveauChambre × multRevenus × (VIP ? 6 : 1) × pourboire
acompte  = 30 % d'un séjour, payé à l'enregistrement (en plus du séjour)
niveauChambre = 1 / 1,5 / 2,25                       (niveaux 1 / 2 / 3)
multRevenus   = (1 + 0,10 × Standing) × (1 + 0,5 × étoile Fortune) × (1 + 0,01 × succès) × (boost ? 2 : 1)
pourboire     = 1 sans bagagiste, sinon 1,10 + 0,10 × niveau « Sourire commercial »
combo         = × (1 + 0,05 × crans), max ×1,5, sur ce que le joueur encaisse lui-même
```
- **Services** : 65 % des clients passent par un service après leur séjour et y laissent 55 % du
  tarif (pile de cash sur la soucoupe du service). Parking : 20 % du tarif à chaque enregistrement.
  Héliport : VIP 1,6× plus fréquents.
- **VIP** : un toutes les 50 à 90 s, paie ×6.

## 8. Staff
Embauché sur les dalles au sol, amélioré dans le panneau « Améliorations → Staff ».

| Rôle | Fait | Niveau vitesse | Niveau capacité |
|---|---|---|---|
| Réceptionniste | enregistre (1,0 s de base) | −temps d'enregistrement | +1 place en file |
| Femme/homme de chambre | va chercher le linge, nettoie (1,4 s) | +8 % vitesse | +1 linge porté (base 2) |
| Bagagiste | ramasse tout le cash, +10 % de pourboire | +8 % vitesse | +10 % de pourboire |

Effectifs max : 1 réceptionniste, 5 femmes/hommes de chambre, 2 bagagistes (répartis sur les paliers).
Le staff ne profite pas du combo : jouer soi-même reste plus rentable que regarder.

## 9. Améliorations (cash)
`coût = base × croissance^niveau`

| Id | Nom | Effet / niveau | Base | Croissance | Max |
|---|---|---|---|---|---|
| pSpeed | Baskets | +6 % vitesse du joueur (base 5,6) | 120 | 2,5 | 10 |
| pCap | Sac à linge | +1 linge porté (base 4) | 150 | 2,6 | 12 |
| pIncome | Standing | +10 % revenus | 250 | 2,15 | ∞ |
| recSpeed | Réception express | enregistrement plus rapide | 300 | 2,5 | 10 |
| recCap | File d'attente | +1 client en file | 400 | 3,0 | 6 |
| hkSpeed | Ménage éclair | +8 % vitesse | 350 | 2,5 | 10 |
| hkCap | Chariot de linge | +1 linge | 300 | 2,7 | 8 |
| bhSpeed | Chariot à roulettes | +8 % vitesse | 300 | 2,5 | 10 |
| bhCap | Sourire commercial | +10 % pourboires | 500 | 2,8 | 10 |

## 10. Monde
Terminer le Palace ouvre la ville suivante : Centre-ville → Plage → Montagne → Désert → Mégapole →
Sous-marin, puis les 5 thèmes tournent sans fin (Plage +, Montagne +…).

- Revenus **×2 500** par ville, coûts **×7 500** par ville : le motel de la ville suivante rapporte
  plus que le palace quitté, mais chaque ville demande ~3× plus de séjours que la précédente.
- On arrive dans une nouvelle ville **les poches vides** (le cash est investi dans le voyage).
  Staff et améliorations sont conservés.
- Ce mur croissant est voulu : c'est le prestige qui permet d'aller plus loin.

## 11. Prestige
Disponible dès le premier Palace. On revend tout contre des Étoiles :

```
étoiles gagnées = floor( sqrt( cash gagné pendant le run / 65 000 ) )      (minimum 5 pour revendre)
```
Mesuré : ~12 étoiles en arrivant au Palace, ~39 Palace terminé, ~3 200 ville 2 terminée.

Remis à zéro : cash, ville, palier, staff, améliorations. Conservé : étoiles, arbre, succès, réglages.

### Arbre d'Étoiles — `coût du niveau n = coût × n`
| Nœud | Effet / niveau | Coût | Max | Prérequis |
|---|---|---|---|---|
| Fortune | +50 % revenus | 3 | ∞ | — |
| Vélocité | +5 % vitesse (joueur + staff) | 2 | 10 | Fortune |
| Gros bras | +1 linge porté (joueur + staff) | 2 | 10 | Fortune |
| Veilleur de nuit | plafond hors-ligne +1 h | 2 | 11 | Vélocité |
| Gestion à distance | gains hors-ligne +10 % | 2 | 5 | Gros bras |
| Départ canon | cash de départ : 150 × 6^(n−1) | 4 | 6 | Veilleur de nuit |
| Carnet d'adresses | VIP 12 % plus fréquents | 3 | 5 | Gestion à distance |

## 12. Gains hors-ligne
```
gain = revenuAutomatisé × (0,40 + 0,10 × Gestion à distance) × min(absence, 2 h + 1 h × Veilleur de nuit)
```
`revenuAutomatisé` (`autoIncome`) estime ce que le staff produit seul : il vaut presque zéro sans
réceptionniste ni personnel de chambre. Affiché au retour (à partir de 60 s d'absence), avec un ×2
optionnel via pub factice.

## 13. Quêtes et succès
- **Quêtes** : 3 actives, tirées parmi enregistrer / nettoyer / ramasser / gagner / servir un VIP /
  acheter. Récompense ≈ 6 séjours au tarif courant × difficulté, croissante avec le nombre de quêtes
  terminées.
- **Succès** : 8 familles à paliers (clients, chambres, VIP, cash, achats, paliers, quêtes,
  prestiges). Chaque palier validé = **+1 % de revenus permanent**.

## 14. Monétisation (factice)
Tout passe par l'interface `AdProvider` (`src/core/ads.ts`) ; l'implémentation `MockAdProvider`
accorde la récompense immédiatement. Emplacements : revenus ×2 pendant 5 min, vitesse +50 % pendant
3 min, gains hors-ligne ×2. Aucune pub forcée, aucune régie branchée.

## 15. Rythme mesuré
Mesures faites avec le bot (`node scripts/sim.cjs`), qui joue sans erreur, tient son combo en
permanence et achète les améliorations dès qu'elles coûtent moins de 20 % du cash.
**Un humain est ~1,5× plus lent.**

| Étape | Bot, 1er run | Bot, 2e run (35 étoiles : Fortune 3, Vélocité 2, Gros bras 2) |
|---|---|---|
| Motel → Petit hôtel | 4 min | 2 min |
| Petit hôtel → Hôtel de ville | 8 min | 2 min |
| Hôtel de ville → Resort | 9 min | 4 min |
| Resort → Palace | 9 min | 5 min |
| Palace → ville 2 | 10 min | 4 min |
| **Ville 1 complète** | **40 min** | **16 min (×2,5)** |
| Ville 2 complète (sans prestige) | +41 min | +17 min |

Motel, détail du 1er run (bot) : achats à 0:12, 0:24, 0:48, 1:12, 1:36, 2:00, 2:24, 2:36, 3:00,
3:12, puis le Petit hôtel à 3:54. Staff à 2:24, améliorations à 3:00.

Objectif tenu : 2e run 2 à 4× plus rapide.

## 16. Direction artistique
- Low-poly « chunky » : primitives arrondies fusionnées, dégradé vertical cuit par pièce, rim light,
  ombres douces cuites + blob shadows, brouillard d'horizon, vignette.
- Une palette par palier (`TIER_STYLES`) : crème passé, turquoise écaillé et corail (motel) → crème
  et bleu → pierre, marine et laiton → blanc, turquoise et corail → marbre, or et pourpre (palace).
- Une ambiance par ville (`THEME_MOODS`) : heure dorée, plage, neige, désert, nuit néon, fonds marins.
- **Le motel est miteux mais attachant** : couleurs rétro vives, usées par les détails (néon avec une
  lettre morte qui clignote, peinture écaillée, lino aux dalles manquantes, parking fissuré, herbes
  folles, bidons et pneus, voitures rouillées). Premier essai en bruns sombres : rejeté au test,
  il donnait envie de partir avant d'avoir joué.
- Abords habillés : haies, arbres et massifs le long du bâtiment, portes ouvertes dans les chambres.
