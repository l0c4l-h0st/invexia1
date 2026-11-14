/**
 * Monétisation FACTICE. Toute demande de pub récompensée passe par cette interface.
 * Brancher une vraie régie plus tard = écrire une autre implémentation d'AdProvider
 * (ex. AdMob via Capacitor) et la passer à `setAdProvider`. Aucune pub forcée, jamais.
 */
export type AdPlacement = 'income_x2' | 'speed' | 'offline_x2';

export interface AdProvider {
  /** Vrai si une pub récompensée est disponible pour cet emplacement. */
  isReady(placement: AdPlacement): boolean;
  /** Affiche la pub. Résout `true` si la récompense doit être accordée. */
  showRewarded(placement: AdPlacement): Promise<boolean>;
}

/** Implémentation de test : accorde la récompense immédiatement, sans rien afficher. */
export class MockAdProvider implements AdProvider {
  isReady(): boolean {
    return true;
  }
  showRewarded(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

let provider: AdProvider = new MockAdProvider();
export const ads = {
  get: (): AdProvider => provider,
  set: (p: AdProvider): void => {
    provider = p;
  },
};
