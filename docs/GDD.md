# Game Design Document — Palace Rush

> Source de vérité chiffrée : `src/balance.ts`. Ce document l'explique. Toute modif de l'un → l'autre.

## Pitch
Arcade idle de gestion d'hôtel, chill, à un doigt. On part d'un motel miteux, on finit à la tête d'un
empire de palaces. Le contraste visuel entre le début et la fin EST la récompense.

## Contrôles
Un seul : joystick flottant. Tout le reste se déclenche en entrant dans une zone au sol.

## Boucle de base
1. Un client arrive et fait la queue à la réception.
2. Le joueur se place derrière le comptoir (cercle) → le client est enregistré et part en chambre.
3. Le client dort (~8,5 s), puis part en laissant une pile de cash et une chambre sale.
4. Le joueur prend du linge à la réserve (pile sur le dos), nettoie la chambre (cercle), ramasse le cash.
5. Le cash se dépense en restant sur les dalles d'achat au sol.

(La suite du document — économie, paliers, prestige — est complétée aux jalons J3 à J5.)
