# Assets & licences

## Modèles 3D — procéduraux (aucun fichier)
Tentative du 2026-11-13 : téléchargement de packs CC0 en GLB (Kenney `kenney.nl`, Quaternius
`quaternius.com`, Poly Pizza `poly.pizza`). **Le réseau de l'environnement de build bloque ces
domaines (HTTP 403 au proxy).** Conformément à la consigne, tout est donc modélisé en procédural :

- `src/gfx/build.ts` — builder de primitives arrondies fusionnées (couleurs de sommets).
- `src/gfx/props.ts` — mobilier, véhicules, végétation, décors.
- `src/gfx/chars.ts` — personnages instanciés et animés.
- `src/gfx/hotel.ts` — assemblage des établissements, services, environnements.

Licence : code du projet (aucun asset tiers). Si le réseau du PC le permet, on pourra remplacer
certains objets par des GLB CC0 (voir `docs/TODO.md`) en gardant la palette de `src/gfx/styles.ts`.

## Icônes — maison
`src/ui/icons.ts` : jeu d'icônes SVG dessiné pour le projet (aucune dépendance, aucun emoji).

## Police
| Asset | Source | Licence |
|---|---|---|
| Fredoka (500/600/700, latin) | paquet npm `@fontsource/fredoka` | SIL Open Font License 1.1 |

## Audio — procédural (aucun fichier)
`src/core/audio.ts` : musique lo-fi et SFX synthétisés en WebAudio. Aucun sample tiers.

## Bibliothèques
| Bibliothèque | Licence |
|---|---|
| three | MIT |
| vite, vite-plugin-pwa, vite-plugin-singlefile, typescript (dev) | MIT / Apache-2.0 |
