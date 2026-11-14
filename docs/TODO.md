# TODO

## Demande ton PC (je ne peux pas le faire d'ici)
1. **Pousser le tag de sauvegarde** (refusé par le proxy de la session, HTTP 403) :
   ```bash
   git fetch origin
   git tag backup-avant-reset 583163d4201634d69ff6f7cc73ada5b7fd1e62fe
   git push origin backup-avant-reset
   ```
   En attendant, `main` pointe toujours sur ce commit : rien n'est perdu.

## En cours — jalons
- [x] J1 contrôles + caméra + motel jouable (boucle complète)
- [ ] J2 graphismes, animations, sons, "juice"
- [ ] J3 staff + améliorations + sauvegarde + hors-ligne
- [ ] J4 5 paliers d'hôtel + économie équilibrée
- [ ] J5 carte du monde + prestige + quêtes
- [ ] J6 perf mobile, PWA, i18n, polish
