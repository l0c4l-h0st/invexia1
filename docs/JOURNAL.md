# Journal de développement

## 2026-11-13 / 14 — Session 1

### Étape 0 — repo
- Tag `backup-avant-reset` créé **en local** sur le commit `583163d` (ancien projet Next.js).
- ⚠️ Le **push du tag a été refusé** (HTTP 403) : le proxy git de la session n'autorise que la
  branche de travail. La sauvegarde existe quand même à distance : la branche `main` pointe sur ce
  même commit et n'a pas été touchée. Commande à lancer depuis le PC : voir `docs/TODO.md`.
- Tout le contenu du repo supprimé (hors `.git`), nouveau projet créé sur la branche
  `claude/palace-rush-idle-hotel-okk14b`.

### J1 — contrôles + caméra + motel jouable
- Stack posée : Vite + TypeScript strict + Three.js, store minimal, sauvegarde versionnée.
- Joystick flottant (`src/core/input.ts`) : le doigt posé n'importe où crée le stick ; le socle suit
  le doigt quand on dépasse le rayon. Clavier ZQSD/flèches pour le test sur PC.
- Caméra aérienne à 50°, suivi lissé exponentiel, largeur visible fixe en portrait.
- Boucle complète : file d'attente → enregistrement (zone) → chambre → sommeil → cash + chambre sale →
  réserve de linge (pile sur le dos) → nettoyage (zone) → cash qui vole → dalles d'achat au sol.
- Guidage : flèche 3D sur la cible + chevron au sol près du joueur + jauge "prochain déblocage".

### Décisions prises (sans poser de questions)
- **Assets procéduraux** : Kenney / Quaternius / Poly Pizza bloqués par le réseau (403). Tout est
  modélisé par code avec des primitives arrondies fusionnées. Détails dans `docs/ASSETS.md`.
- **Audio procédural** (WebAudio) : pas de fichier son, pas de licence, poids nul.
- **Icônes SVG maison** plutôt que des emojis : rendu identique sur tous les téléphones.
- **Personnages instanciés** : ~9 draw calls pour tous les personnages, animation calculée sur CPU.
- **Navigation PNJ par "épine"** : chaque lieu connaît son chemin jusqu'au couloir central ; pas de
  pathfinding générique (inutile avec ce plan d'hôtel, et beaucoup plus léger).
- **Serviettes et papier** : un seul type de fourniture côté règles (1 par chambre), deux visuels
  alternés dans la pile. Plus simple à lire pour le joueur.
- **Le cash est crédité tout de suite** au ramassage ; le compteur du HUD rattrape en douceur et les
  billets volent pour le plaisir. Aucun cash perdu si on ferme l'app en plein vol.
- **Bot de test** (`?bot=1&speed=N&headless=1`) : suit la même logique que la flèche de guidage.
  Sert à vérifier la boucle et à mesurer la durée de chaque palier (`scripts/sim.cjs`).

### J2 — graphismes, animations, sons, "juice"
- Rendu : primitives arrondies fusionnées en un mesh à couleurs de sommets par objet, dégradé
  vertical cuit (fausse occlusion ambiante), rim light injecté dans le shader Lambert, ombres cuites
  + blob shadows, brouillard d'horizon, vignette CSS. Aucune ombre temps réel, aucun post-process.
- 5 palettes de palier et 6 ambiances de ville (`src/gfx/styles.ts`).
- Motel miteux : néon avec une lettre morte qui clignote, peinture écaillée, lino rapiécé, parking
  fissuré, herbes folles, voitures rouillées. Palace : marbre en damier, tapis rouge, colonnes et
  fontaine dorées.
- Animations : marche / idle / sommeil / nage procéduraux, squash & stretch, saut de joie aux achats,
  objets qui jaillissent du sol à la construction, billets et linge qui volent en cloche, confettis,
  étincelles, poussière sous les pas, Zzz, chiffres flottants, compteur de cash qui saute, bannières.
- Audio procédural : boucle lo-fi (accords jazzy, basse, batterie douce, craquement de vinyle) et
  SFX (cash à hauteur montante, pop, ding, ménage, fanfare, VIP). Vibrations. Réglages on/off.

### J3 — staff, améliorations, sauvegarde, hors-ligne
- Réceptionniste, femmes/hommes de chambre, bagagistes : machines à états simples, embauche par
  dalle, niveaux de vitesse et de capacité dans le panneau.
- Sauvegarde versionnée (fusion avec les valeurs par défaut + point d'entrée de migration),
  autosave toutes les 10 s et à la mise en arrière-plan. Le cash au sol est sauvegardé et réapparaît
  en pile dans le hall.
- Gains hors-ligne plafonnés à 2 h (plafond améliorable par étoiles), ×2 via pub factice.
- Testé par script : joystick, sauvegarde/rechargement, fenêtre hors-ligne (voir "Tests").

### J4 — 5 paliers et équilibrage
- 5 paliers avec carte, palette et services propres (distributeur, parking, café, restaurant,
  piscine, spa, casino, héliport).
- Équilibrage **par simulation** : le bot joue en accéléré sans rendu (`scripts/sim.cjs`).
  - 1re mesure : ville 1 en 42 min, villes suivantes en quelques minutes → trop rapide.
  - Corrections : `costBase` des paliers 2 à 5 relevés (16 / 180 / 1 700 / 14 000), villes à
    ×2 500 revenus et ×7 500 coûts, **départ à zéro cash dans chaque nouvelle ville**.
  - Résultat : ville 1 en 67 min pour le bot (~1 h 40 pour un humain). Tableau dans `docs/GDD.md` §14.
- Bugs trouvés par la simulation et corrigés : temps de jeu compté pendant les transitions ;
  bot coincé contre un mur extérieur.

### J5 — carte du monde, prestige, quêtes
- Carte du monde (panneau « Empire ») : 6 villes thématiques puis boucle sans fin.
- Prestige : `étoiles = floor(sqrt(cash du run / 65 000))`, arbre de 7 nœuds. Mesuré : 35 étoiles
  après le premier Palace, 2e run **2,7× plus rapide** (cible 2 à 4×).
- Quêtes tournantes (3 actives) et succès à paliers (+1 % de revenus chacun).
- Testé par script : passage à la ville suivante, remise à zéro du prestige, achats dans l'arbre.

### J6 — perf, PWA, i18n, polish
- Perf mesurée (rendu logiciel, valeurs indicatives) : motel 24 draw calls / 34 K triangles ;
  palace complet et animé 62 draw calls / 143 K triangles (266 K avant réduction des biseaux).
  Pixel ratio plafonné à 2, résolution adaptative si le téléphone peine.
- PWA : manifest portrait + plein écran, service worker (précache), icônes 192/512/maskable.
- i18n : FR par défaut + EN, tous les textes dans `src/i18n/`.
- Safari iOS : flou des ombres refait sans `ctx.filter` (non supporté).
- Flèche de guidage redessinée (plate, face caméra, contour sombre).

### Décisions supplémentaires
- **Systèmes écrits d'un bloc, vérifiés par jalon.** Le premier commit contient déjà le code de la
  plupart des systèmes ; les commits suivants correspondent à la vérification et aux corrections de
  chaque jalon. Les jalons J2 à J4 partagent un commit.
- **Aperçu sur téléphone** : publié comme page privée claude.ai (build mono-fichier). GitHub Pages est
  prêt mais demande une activation manuelle (voir TODO).
- **Enseigne basse et inclinée** plutôt que sur un mât : un mât masquait le bas du hall.
- **Nouvelle ville = cash remis à zéro** : sinon le cash du palace rendait les premiers paliers
  de la ville suivante instantanés.
- **Le prestige se débloque à l'arrivée au Palace**, pas à sa fin : le joueur voit le bouton et le
  gain d'étoiles grimper pendant qu'il termine le Palace.

### Tests
Pas de framework de test : des scripts Playwright pilotent le vrai jeu.
- `scripts/shot.cjs` : capture en viewport mobile 390×844 + erreurs console.
- `scripts/sim.cjs` : bot accéléré, journal des achats et des paliers.
- Vérifié à la main par captures : les 5 paliers, les 6 thèmes, les 8 vues de panneaux, le tutoriel,
  la fenêtre hors-ligne, FR et EN.
- **Non testé** : un vrai téléphone (toucher, 60 fps réels, audio, vibrations, installation PWA,
  safe areas). Voir TODO.

## 2026-11-14 — Session 2 : refonte du début de partie et du look

**Retour du propriétaire après avoir joué** : « le gameplay du début est pas assez bien, en 3 min
t'as envie de le désinstaller », et les graphismes doivent donner envie.

### Diagnostic
- Trop d'attente : 1 seule chambre, client qui dort 8,5 s, premier achat après ~1 min, deuxième
  après ~2 min 15. Entre deux, rien à faire.
- Aucune récompense immédiate : la première action (enregistrer) ne rapportait rien sur le moment.
- 10 minutes en solo avant le premier employé, alors que l'automatisation est le crochet du genre.
- Première image du jeu : un motel brun sombre sous un ciel violet. « Miteux » avait été pris au
  pied de la lettre ; ça ne donnait pas envie.

### Ce qui a changé
- **Rythme** (`src/balance.ts`) : départ avec 2 chambres, clients toutes les 1,5 s, sommeil 5,5 s,
  enregistrement 0,6 s, ménage 0,9 s, joueur plus rapide (5,6), aimant à cash (rayon 1,7), 4 pièces
  de linge portées. Chaîne du motel refaite : 11 achats de 15 à 700 $.
- **Pile de bienvenue** : 20 $ à ramasser dans le hall, première dalle à 15 $ → un achat avec
  confettis dans les 10 premières secondes.
- **Acompte à l'enregistrement** : 30 % du tarif tout de suite, billets qui volent du client au joueur.
- **Combo « Rush »** : enchaîner les actions soi-même donne jusqu'à ×1,5 de cash ; à 6 crans, mode
  RUSH (vitesse +12 %, étincelles). Badge animé dans le HUD. Bonus seulement, pas de malus.
- **Pourboires oubliés** : pièces d'or qui apparaissent dans l'hôtel, à aller chercher.
- **Staff à 2 min 30** au lieu de 10 min.
- **Écran-titre** avec logo ; un tap lance la partie et débloque le son.
- **Tutoriel** réordonné : acheter → accueillir → nettoyer, dans l'ordre où le jeu les présente.
- **Look du motel** : crème passé, turquoise écaillé, moquette corail, lino en damier, comptoir en
  formica turquoise, heure dorée. L'usure reste dans les détails. Haies, arbres, bidons et pneus
  autour du bâtiment ; portes ouvertes dans toutes les chambres ; cœurs quand un client est content ;
  billets plus gros, piles qui « respirent » ; caméra un peu plus proche, personnages un peu plus grands.
- HUD : avancement du palier (`3/11`) dans la carte d'objectif.

### Mesures (bot)
- Motel : un achat toutes les ~20 s, palier bouclé en 4 min (17 min avant). Un humain : ~6 à 8 min.
- Ville 1 : 40 min (67 avant). `costBase` des paliers 2 à 5 relevés (18 / 250 / 2 400 / 20 000) pour
  compenser le rythme plus rapide.
- 2e run après prestige : ×2,5 (cible 2 à 4×).

### Décisions
- **Écart à la consigne « 10 minutes de boucle de base seule »** : ramené à 2 min 30 parce que le test
  a montré que c'était trop long. Réglable en une ligne : `B.unlock.staffTime`.
- **« Miteux » = usé, pas triste.** Le contraste avec le palace reste fort (voir captures), mais la
  première minute doit être belle.
- **Le combo ne s'applique qu'au joueur**, pas au staff : jouer activement reste plus rentable que
  regarder, sans jamais punir celui qui pose son téléphone.
- Toujours non testé sur un vrai téléphone ; le ressenti du nouveau rythme est à confirmer en main.
