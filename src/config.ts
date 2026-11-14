/**
 * Configuration produit — LE seul endroit où changer le titre du jeu.
 * Utilisé par : index.html (via vite.config.ts), manifest PWA, HUD, sauvegarde.
 */
export const CONFIG = {
  title: 'Palace Rush',
  shortTitle: 'Palace Rush',
  description: "Arcade idle de gestion d'hôtel : du motel miteux au palace.",
  themeColor: '#2b2350',
  saveKey: 'palace-rush-save',
  saveVersion: 1,
  appId: 'com.palacerush.game',
};
