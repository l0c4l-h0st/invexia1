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

Caméra : vue aérienne à 50°, suivi lissé, ~10,6 unités de large visibles en portrait.

## 3. Boucle de base
1. Un client arrive et fait la queue à la réception.
2. Le joueur se place derrière le comptoir → cercle de 1,0 s → le client part en chambre.
3. Le client dort 8,5 s, puis laisse **une pile de cash** et **une chambre sale**.
4. Le joueur prend du linge à la réserve (pile sur le dos, 0,11 s par pièce), nettoie la chambre
   (cercle de 1,5 s, consomme 1 pièce de linge), ramasse le cash (les billets volent vers lui).
5. Le cash se dépense en restant sur les **dalles d'achat** : chambre, amélioration des chambres,
   service, embauche, établissement suivant.

Pas de timer bloquant : le plus long est le sommeil d'un client (8,5 s) et il y a toujours autre
chose à faire. Il y a toujours **1 ou 2 dalles visibles**, une flèche qui y mène, et la jauge
« prochain déblocage » dans le HUD.

## 4. Introduction des systèmes, un par un
| Système | Condition (`B.unlock`, `Game.checkFeatures`) | Moment mesuré (bot) |
|---|---|---|
| Boucle de base | dès le départ | 0 min |
| **Staff** (dalles d'embauche) | 10 min de jeu **et** 4 chambres au motel | ~10 min |
| **Améliorations** (bouton HUD) | 2 employés embauchés | ~13 min |
| **Bonus** (pubs factices) | arrivée au Petit hôtel | ~17 min |
| **Quêtes & succès** | 3 achats dans le Petit hôtel | ~21 min |
| **Monde & Prestige** | arrivée au premier Palace | ~53 min |

Après un prestige, tous les systèmes restent débloqués.

Tutoriel : 3 pastilles sans texte (cloche → balai → flèche), une main animée tant qu'on n'a pas
bougé, puis la flèche de guidage. Il se termine au premier achat.

## 5. Paliers d'un établissement
Chaque palier est une nouvelle carte, une nouvelle palette et de nouveaux services.

| # | Palier | Tarif / séjour | `costBase` | Chambres (départ → max) | Services |
|---|---|---|---|---|---|
| 1 | Motel miteux | 10 | 1 | 1 → 6 | distributeur |
| 2 | Petit hôtel | 60 | 16 | 3 → 8 | parking, café |
| 3 | Hôtel de ville | 380 | 180 | 4 → 10 | parking, restaurant |
| 4 | Resort | 2 400 | 1 700 | 4 → 12 | parking, restaurant, piscine, spa |
| 5 | Palace | 15 000 | 14 000 | 5 → 14 | parking, restaurant, piscine, spa, casino, héliport |

Le staff et les améliorations sont conservés d'un palier à l'autre ; chambres, niveau des chambres
et services repartent du minimum du nouveau palier.

### Chaîne d'achats
Chaque palier a une liste ordonnée d'achats (`TIERS[i].chain`), chacun avec un poids `w`.

```
coût = w × costBase(palier) × 7500^ville
```

Exemple, motel (costBase 1) : chambre 2 = 25 · chambre 3 = 60 · chambres niv. 2 = 110 · chambre 4 = 160 ·
réceptionniste = 220 · chambre 5 = 260 · femme/homme de chambre = 320 · chambre 6 = 380 ·
distributeur = 300 · bagagiste = 400 · chambres niv. 3 = 520 · **Petit hôtel = 1 100**.

Les embauches ne sont proposées qu'une fois le staff débloqué. La dalle « établissement suivant »
n'apparaît que lorsque tout le reste est acheté.

## 6. Revenus
```
séjour   = tarif(palier) × 2500^ville × niveauChambre × multRevenus × (VIP ? 6 : 1) × pourboire
niveauChambre = 1 / 1,5 / 2,25                       (niveaux 1 / 2 / 3)
multRevenus   = (1 + 0,10 × Standing) × (1 + 0,5 × étoile Fortune) × (1 + 0,01 × succès) × (boost ? 2 : 1)
pourboire     = 1 sans bagagiste, sinon 1,10 + 0,10 × niveau « Sourire commercial »
```
- **Services** : 65 % des clients passent par un service après leur séjour et y laissent 55 % du
  tarif (pile de cash sur la soucoupe du service). Parking : 20 % du tarif à chaque enregistrement.
  Héliport : VIP 1,6× plus fréquents.
- **VIP** : un toutes les 50 à 90 s, paie ×6.

## 7. Staff
Embauché sur les dalles au sol, amélioré dans le panneau « Améliorations → Staff ».

| Rôle | Fait | Niveau vitesse | Niveau capacité |
|---|---|---|---|
| Réceptionniste | enregistre (1,4 s de base) | −temps d'enregistrement | +1 place en file |
| Femme/homme de chambre | va chercher le linge, nettoie (2,0 s) | +8 % vitesse | +1 linge porté (base 2) |
| Bagagiste | ramasse tout le cash, +10 % de pourboire | +8 % vitesse | +10 % de pourboire |

Effectifs max : 1 réceptionniste, 5 femmes/hommes de chambre, 2 bagagistes (répartis sur les paliers).

## 8. Améliorations (cash)
`coût = base × croissance^niveau`

| Id | Nom | Effet / niveau | Base | Croissance | Max |
|---|---|---|---|---|---|
| pSpeed | Baskets | +6 % vitesse du joueur | 120 | 2,5 | 10 |
| pCap | Sac à linge | +1 linge porté (base 3) | 150 | 2,6 | 12 |
| pIncome | Standing | +10 % revenus | 250 | 2,15 | ∞ |
| recSpeed | Réception express | enregistrement plus rapide | 300 | 2,5 | 10 |
| recCap | File d'attente | +1 client en file | 400 | 3,0 | 6 |
| hkSpeed | Ménage éclair | +8 % vitesse | 350 | 2,5 | 10 |
| hkCap | Chariot de linge | +1 linge | 300 | 2,7 | 8 |
| bhSpeed | Chariot à roulettes | +8 % vitesse | 300 | 2,5 | 10 |
| bhCap | Sourire commercial | +10 % pourboires | 500 | 2,8 | 10 |

## 9. Monde
Terminer le Palace ouvre la ville suivante : Centre-ville → Plage → Montagne → Désert → Mégapole →
Sous-marin, puis les 5 thèmes tournent sans fin (Plage +, Montagne +…).

- Revenus **×2 500** par ville, coûts **×7 500** par ville : le motel de la ville suivante rapporte
  plus que le palace quitté, mais chaque ville demande ~3× plus de séjours que la précédente.
- On arrive dans une nouvelle ville **les poches vides** (le cash est investi dans le voyage).
  Staff et améliorations sont conservés.
- Ce mur croissant est voulu : c'est le prestige qui permet d'aller plus loin.

## 10. Prestige
Disponible dès le premier Palace. On revend tout contre des Étoiles :

```
étoiles gagnées = floor( sqrt( cash gagné pendant le run / 65 000 ) )      (minimum 5 pour revendre)
```
Mesuré : ~11 étoiles en arrivant au Palace, ~35 Palace terminé, ~2 700 ville 2 terminée.

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

## 11. Gains hors-ligne
```
gain = revenuAutomatisé × (0,40 + 0,10 × Gestion à distance) × min(absence, 2 h + 1 h × Veilleur de nuit)
```
`revenuAutomatisé` (`autoIncome`) estime ce que le staff produit seul : il vaut presque zéro sans
réceptionniste ni personnel de chambre. Affiché au retour (à partir de 60 s d'absence), avec un ×2
optionnel via pub factice.

## 12. Quêtes et succès
- **Quêtes** : 3 actives, tirées parmi enregistrer / nettoyer / ramasser / gagner / servir un VIP /
  acheter. Récompense ≈ 6 séjours au tarif courant × difficulté, croissante avec le nombre de quêtes
  terminées.
- **Succès** : 8 familles à paliers (clients, chambres, VIP, cash, achats, paliers, quêtes,
  prestiges). Chaque palier validé = **+1 % de revenus permanent**.

## 13. Monétisation (factice)
Tout passe par l'interface `AdProvider` (`src/core/ads.ts`) ; l'implémentation `MockAdProvider`
accorde la récompense immédiatement. Emplacements : revenus ×2 pendant 5 min, vitesse +50 % pendant
3 min, gains hors-ligne ×2. Aucune pub forcée, aucune régie branchée.

## 14. Rythme mesuré
Mesures faites avec le bot (`node scripts/sim.cjs`), qui joue sans erreur et achète les améliorations
dès qu'elles coûtent moins de 20 % du cash. **Un humain est ~1,5× plus lent.**

| Étape | Bot, 1er run | Bot, 2e run (35 étoiles : Fortune 3, Vélocité 2, Gros bras 2) |
|---|---|---|
| Motel → Petit hôtel | 17 min | 4 min |
| Petit hôtel → Hôtel de ville | 11 min | 5 min |
| Hôtel de ville → Resort | 11 min | 6 min |
| Resort → Palace | 14 min | 5 min |
| Palace → ville 2 | 14 min | 5 min |
| **Ville 1 complète** | **67 min** | **25 min (×2,7)** |
| Ville 2 complète (sans prestige) | +56 min | +25 min |
| Ville 3 (sans prestige) | > 90 min | — |

Objectif tenu : 2e run 2 à 4× plus rapide.

## 15. Direction artistique
- Low-poly « chunky » : primitives arrondies fusionnées, dégradé vertical cuit par pièce, rim light,
  ombres douces cuites + blob shadows, brouillard d'horizon, vignette.
- Une palette par palier (`TIER_STYLES`) : moutarde délavée et moquette verdâtre (motel) → crème et
  bleu → pierre, marine et laiton → blanc, turquoise et corail → marbre, or et pourpre (palace).
- Une ambiance par ville (`THEME_MOODS`) : crépuscule, plage, neige, désert, nuit néon, fonds marins.
- Le motel est volontairement miteux : néon avec une lettre morte qui clignote, peinture écaillée,
  lino rapiécé, parking fissuré, herbes folles, voitures rouillées.
