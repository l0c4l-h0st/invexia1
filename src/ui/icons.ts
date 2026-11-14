/**
 * Jeu d'icônes maison (SVG 24×24, aplats colorés) : une seule source pour le DOM,
 * les dalles 3D (canvas) et les cercles de zone. Aucune dépendance, aucun emoji.
 */
const I: Record<string, string> = {
  cash: `<rect x="1.5" y="5.5" width="21" height="13" rx="3" fill="#2fb35f"/><rect x="3.5" y="7.5" width="17" height="9" rx="2" fill="#5fdb86"/><circle cx="12" cy="12" r="3.3" fill="#2fb35f"/><circle cx="6" cy="12" r="1.1" fill="#2fb35f"/><circle cx="18" cy="12" r="1.1" fill="#2fb35f"/>`,
  star: `<path d="M12 1.8l3 6.4 7 .9-5.1 4.9 1.3 7L12 17.6 5.8 21l1.3-7L2 9.1l7-.9z" fill="#ffc933" stroke="#e8951c" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 5.5l1.7 3.7 1.6.2" fill="none" stroke="#fff3b0" stroke-width="1.2" stroke-linecap="round"/>`,
  bed: `<rect x="1.5" y="4" width="3.4" height="15.5" rx="1.5" fill="#9a6335"/><rect x="19.2" y="11" width="3.3" height="8.5" rx="1.5" fill="#9a6335"/><rect x="3" y="11" width="18.5" height="6" rx="2" fill="#5b8def"/><rect x="5.5" y="8" width="6.5" height="4.6" rx="2" fill="#ffffff"/><rect x="12" y="11" width="9.5" height="2.2" rx="1" fill="#8fb4ff"/>`,
  broom: `<rect x="10.9" y="1" width="2.4" height="13" rx="1.2" fill="#c48a4f" transform="rotate(38 12 12)"/><path d="M3 21.5l1.2-6.3 4.6 4.6z" fill="#ffc933"/><path d="M4.2 15.2l3-3 4.6 4.6-3 3z" fill="#ffab2e"/><path d="M5 22l-2.4-.3M9 19.8l-.5 2.2M6.9 21l-1 1.4" stroke="#ffc933" stroke-width="1.2" stroke-linecap="round"/>`,
  towel: `<rect x="3" y="13.5" width="18" height="6" rx="3" fill="#ffffff"/><rect x="3" y="13.5" width="18" height="6" rx="3" fill="none" stroke="#c9d6e8" stroke-width="1"/><rect x="5" y="7.5" width="14" height="6" rx="3" fill="#7fd6f5"/><rect x="7" y="2" width="10" height="5.5" rx="2.7" fill="#ffffff" stroke="#c9d6e8" stroke-width="1"/><circle cx="18" cy="16.5" r="1.3" fill="#c9d6e8"/><circle cx="16.2" cy="10.5" r="1.2" fill="#4fb7de"/>`,
  bell: `<rect x="2.5" y="17.5" width="19" height="3.6" rx="1.8" fill="#8a5a2b"/><path d="M4 17.5a8 8 0 0116 0z" fill="#ffc933"/><path d="M7 14.5a5.4 5.4 0 013.4-3.6" fill="none" stroke="#fff3b0" stroke-width="1.4" stroke-linecap="round"/><rect x="10.7" y="5.5" width="2.6" height="4" rx="1.2" fill="#e8951c"/><circle cx="12" cy="4.6" r="2" fill="#e8951c"/>`,
  bag: `<path d="M8.5 7V5a2 2 0 012-2h3a2 2 0 012 2v2" fill="none" stroke="#6b3f1d" stroke-width="2"/><rect x="2.5" y="7" width="19" height="13.5" rx="3" fill="#b8703a"/><rect x="2.5" y="11.5" width="19" height="2.4" fill="#8a4f24"/><rect x="10.3" y="10.6" width="3.4" height="4.2" rx="1" fill="#ffc933"/>`,
  person: `<circle cx="12" cy="7" r="4.6" fill="#ffd2b0"/><path d="M7.4 6.4a4.6 4.6 0 019.2 0c-1.2-1-2.3-1.4-4.6-1.4s-3.4.4-4.6 1.4z" fill="#4a2f1c"/><path d="M3.5 21.5a8.5 8.5 0 0117 0z" fill="#18c29c"/>`,
  up: `<path d="M12 2.5l8 8.5h-4.6v9a1.5 1.5 0 01-1.5 1.5h-3.8A1.5 1.5 0 018.6 20v-9H4z" fill="#3ddc6c" stroke="#1f9e45" stroke-width="1.3" stroke-linejoin="round"/>`,
  gear: `<path d="M10.3 2h3.4l.6 2.7 1.9.8 2.3-1.5 2.4 2.4-1.5 2.3.8 1.9 2.8.6v3.4l-2.8.6-.8 1.9 1.5 2.3-2.4 2.4-2.3-1.5-1.9.8-.6 2.9h-3.4l-.6-2.9-1.9-.8-2.3 1.5-2.4-2.4 1.5-2.3-.8-1.9L1 13.6v-3.4l2.8-.6.8-1.9-1.5-2.3 2.4-2.4 2.3 1.5 1.9-.8z" fill="#8f9bb8"/><circle cx="12" cy="12" r="3.6" fill="#ffffff"/>`,
  quest: `<rect x="3.5" y="3.5" width="17" height="19" rx="3" fill="#f4b860"/><rect x="5.8" y="6.2" width="12.4" height="14" rx="1.5" fill="#fffaf0"/><rect x="8" y="1.5" width="8" height="4.6" rx="2" fill="#8f9bb8"/><path d="M8 11.2l1.6 1.6 2.8-3M8 16.6l1.6 1.6 2.8-3" fill="none" stroke="#3ddc6c" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 11.5h2.2M14.5 17h2.2" stroke="#c9b48a" stroke-width="1.6" stroke-linecap="round"/>`,
  gift: `<rect x="3" y="10" width="18" height="11.5" rx="2.5" fill="#ff5d73"/><rect x="2" y="6.5" width="20" height="5" rx="2" fill="#ff8093"/><rect x="10.2" y="6.5" width="3.6" height="15" fill="#ffd166"/><path d="M12 6.5C10 2 5.5 2.6 6.4 5.2c.5 1.4 3 1.3 5.6 1.3zM12 6.5c2-4.500 6.5-3.900 5.6-1.300-.5 1.400-3 1.300-5.600 1.300z" fill="#ffd166"/>`,
  globe: `<circle cx="12" cy="12" r="10" fill="#38b6ff"/><path d="M6 6.500c2 .5 3.500 0 4.500 1.500s-1 2.500-.5 4 2.500 1.500 2 3.500-2.500 2-3 4.500C5 19 2.500 15 2.500 12c0-2 1.500-4.500 3.500-5.500zM14.500 3c1 1.500 3 1.500 3.500 3s-1.500 2-1 3.500 3 1 4 2.500c.5-3.500-2-7.500-6.500-9zM16 15c1.500 0 2.500 1 2.500 2.500-.5 1-1.500 2-2.500 2.500-.5-1.500-1-3.500 0-5z" fill="#6bd968"/>`,
  crown: `<path d="M2.500 8l4.500 4 5-7.500 5 7.500 4.500-4-1.800 11H4.300z" fill="#ffc933" stroke="#e8951c" stroke-width="1.300" stroke-linejoin="round"/><circle cx="12" cy="15" r="1.700" fill="#ff5d73"/><circle cx="7.300" cy="15.600" r="1.100" fill="#38b6ff"/><circle cx="16.700" cy="15.600" r="1.100" fill="#38b6ff"/>`,
  lock: `<path d="M7 11V7.500a5 5 0 0110 0V11" fill="none" stroke="#8f9bb8" stroke-width="2.600"/><rect x="4" y="10.500" width="16" height="11.500" rx="3" fill="#ffc933"/><circle cx="12" cy="15.500" r="1.900" fill="#8a5a2b"/><rect x="11.100" y="16" width="1.800" height="3.600" rx=".9" fill="#8a5a2b"/>`,
  check: `<circle cx="12" cy="12" r="10.500" fill="#3ddc6c"/><path d="M6.500 12.500l3.700 3.700 7.300-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  pool: `<rect x="2" y="4" width="20" height="17" rx="5" fill="#35c3ee"/><path d="M4.500 10.500c2-1.800 3.500-1.800 5 0s3 1.800 5 0 3-1.800 5 0M4.500 15.500c2-1.800 3.500-1.800 5 0s3 1.800 5 0 3-1.800 5 0" fill="none" stroke="#fff" stroke-width="1.800" stroke-linecap="round"/><path d="M15 9V4.500a2 2 0 014 0" fill="none" stroke="#dfe6f0" stroke-width="1.800" stroke-linecap="round"/>`,
  food: `<circle cx="13" cy="13" r="8.500" fill="#fff" stroke="#dfe6f0" stroke-width="1.200"/><circle cx="13" cy="13" r="5" fill="#ffb347"/><path d="M4 3v6.500M2 3v4a2 2 0 004 0V3M4 9.500V21" fill="none" stroke="#8f9bb8" stroke-width="1.700" stroke-linecap="round"/>`,
  spa: `<path d="M12 21c-5 0-9-2.500-9.500-7.500C6 13.500 9.500 15 12 21z" fill="#6bd968"/><path d="M12 21c5 0 9-2.500 9.500-7.500C18 13.500 14.500 15 12 21z" fill="#6bd968"/><path d="M12 21c-3.500-3-4.500-9.500 0-17 4.500 7.500 3.500 14 0 17z" fill="#9aed8f"/>`,
  casino: `<rect x="3" y="3" width="18" height="18" rx="4" fill="#ff5d73"/><circle cx="8" cy="8" r="1.900" fill="#fff"/><circle cx="16" cy="8" r="1.900" fill="#fff"/><circle cx="12" cy="12" r="1.900" fill="#fff"/><circle cx="8" cy="16" r="1.900" fill="#fff"/><circle cx="16" cy="16" r="1.900" fill="#fff"/>`,
  heli: `<circle cx="12" cy="12" r="10.500" fill="#5b6ee1"/><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="1.400"/><path d="M8.500 7.500v9M15.500 7.500v9M8.500 12h7" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>`,
  parking: `<rect x="2.500" y="2.500" width="19" height="19" rx="4.500" fill="#3f7fe8"/><path d="M9 18V6.500h4a3.600 3.600 0 010 7.200H9" fill="none" stroke="#fff" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/>`,
  vending: `<rect x="4" y="1.500" width="16" height="21" rx="2.500" fill="#ff5d73"/><rect x="6" y="4" width="8.500" height="11" rx="1.200" fill="#bfeaff"/><rect x="16" y="5" width="2.200" height="3.500" rx=".8" fill="#ffd166"/><rect x="6" y="17" width="12" height="3" rx="1" fill="#7a1f33"/><circle cx="8.500" cy="7" r="1.300" fill="#ffd166"/><circle cx="12" cy="7" r="1.300" fill="#6bd968"/><circle cx="8.500" cy="11.500" r="1.300" fill="#38b6ff"/><circle cx="12" cy="11.500" r="1.300" fill="#ff9f43"/>`,
  sound: `<path d="M3 9h4l5.500-4.500v15L7 15H3z" fill="#5b6ee1"/><path d="M15.500 8.500a5 5 0 010 7M18 6a8.500 8.500 0 010 12" fill="none" stroke="#5b6ee1" stroke-width="2" stroke-linecap="round"/>`,
  music: `<path d="M9 17.500V4.500l11-2.500v13" fill="none" stroke="#b983ff" stroke-width="2.400" stroke-linejoin="round"/><ellipse cx="6.300" cy="17.800" rx="3.500" ry="2.800" fill="#b983ff"/><ellipse cx="17.300" cy="15.300" rx="3.500" ry="2.800" fill="#b983ff"/>`,
  vibrate: `<rect x="7.500" y="2.500" width="9" height="19" rx="2.500" fill="#ff9f43"/><rect x="9.300" y="5" width="5.400" height="11.500" rx="1" fill="#fff5e6"/><path d="M4.500 8v8M2 10v4M19.500 8v8M22 10v4" stroke="#ff9f43" stroke-width="1.800" stroke-linecap="round"/>`,
  lang: `<circle cx="12" cy="12" r="10" fill="#fff" stroke="#38b6ff" stroke-width="1.800"/><path d="M2 12h20M12 2c-3.500 3-3.500 17 0 20M12 2c3.500 3 3.500 17 0 20M4 7h16M4 17h16" fill="none" stroke="#38b6ff" stroke-width="1.500"/>`,
  bolt: `<path d="M13.500 1.500L4 13.500h6.500L9 22.500 20 9.500h-6.800z" fill="#ffd166" stroke="#e8951c" stroke-width="1.300" stroke-linejoin="round"/>`,
  box: `<path d="M12 2l9 4.500v11L12 22l-9-4.500v-11z" fill="#d9a066"/><path d="M12 11.500l9-5v11L12 22z" fill="#b8793f"/><path d="M12 11.500l-9-5L12 2l9 4.500z" fill="#ecc08a"/><path d="M7.500 4.300l9 4.700v3.500" fill="none" stroke="#fff5e6" stroke-width="1.600"/>`,
  coins: `<ellipse cx="9" cy="17.500" rx="7" ry="3.500" fill="#e8951c"/><ellipse cx="9" cy="15.500" rx="7" ry="3.500" fill="#ffc933"/><ellipse cx="9" cy="13" rx="7" ry="3.500" fill="#e8951c"/><ellipse cx="9" cy="11" rx="7" ry="3.500" fill="#ffc933"/><ellipse cx="15.500" cy="8.500" rx="6.500" ry="3.300" fill="#e8951c"/><ellipse cx="15.500" cy="6.500" rx="6.500" ry="3.300" fill="#ffd966"/>`,
  clock: `<circle cx="12" cy="12" r="10" fill="#fff" stroke="#5b6ee1" stroke-width="2.400"/><path d="M12 6.500V12l4 2.500" fill="none" stroke="#5b6ee1" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/>`,
  play: `<rect x="1.500" y="4" width="21" height="16" rx="4" fill="#7b5cff"/><path d="M10 8.500v7l6-3.500z" fill="#fff"/>`,
  trophy: `<path d="M6.500 3h11v6a5.500 5.500 0 01-11 0z" fill="#ffc933"/><path d="M6.500 5H3c0 3.500 1.500 5 4 5.500M17.500 5H21c0 3.500-1.500 5-4 5.500" fill="none" stroke="#e8951c" stroke-width="1.800"/><rect x="10.700" y="14" width="2.600" height="4" fill="#e8951c"/><rect x="7" y="18" width="10" height="3.500" rx="1.200" fill="#8a5a2b"/>`,
  plane: `<path d="M21.500 3.500c1.500 1.500-.5 4-2 5.500l-2.500 2.500 2 8.500-2 2-4-7-3.500 3.500.5 3-1.500 1.500-2-4-4-2 1.500-1.500 3 .5L10.500 12l-7-4 2-2 8.500 2 2.500-2.500c1.500-1.500 4-3.500 5-2z" fill="#38b6ff" stroke="#1d7fc4" stroke-width="1" stroke-linejoin="round"/>`,
  hotel: `<rect x="4" y="3" width="16" height="19" rx="2" fill="#ff9f43"/><rect x="2.500" y="1.500" width="19" height="3.600" rx="1.500" fill="#e8651c"/><rect x="7" y="7.500" width="3.400" height="3.400" rx=".8" fill="#fff5c2"/><rect x="13.600" y="7.500" width="3.400" height="3.400" rx=".8" fill="#fff5c2"/><rect x="7" y="12.500" width="3.400" height="3.400" rx=".8" fill="#fff5c2"/><rect x="13.600" y="12.500" width="3.400" height="3.400" rx=".8" fill="#fff5c2"/><rect x="10" y="17.500" width="4" height="4.500" rx="1" fill="#8a3f12"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.400" stroke-linecap="round"/>`,
  hand: `<path d="M9.500 21.500c-2.500-.500-4-3-5-5.500l-1.300-3.200c-.5-1.400 1.300-2.300 2.200-1.100L7 14V4.300a1.700 1.700 0 013.400 0V10l6.200 1.100c1.700.3 2.800 1.700 2.600 3.400l-.5 4c-.2 1.800-1.700 3-3.500 3z" fill="#fff" stroke="#3b3355" stroke-width="1.500" stroke-linejoin="round"/>`,
  sparkle: `<path d="M10 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffd166"/><path d="M18.500 13l1.100 3.400 3.400 1.100-3.400 1.100-1.100 3.400-1.100-3.400-3.400-1.100 3.400-1.100z" fill="#ffab2e"/>`,
  trash: `<rect x="5" y="7" width="14" height="14.500" rx="2.500" fill="#ff5d73"/><rect x="3" y="4" width="18" height="3.400" rx="1.500" fill="#d93a52"/><rect x="9" y="1.800" width="6" height="3" rx="1.200" fill="#d93a52"/><path d="M9.500 10.500v7.500M14.500 10.500v7.500" stroke="#fff" stroke-width="1.800" stroke-linecap="round"/>`,
  sell: `<path d="M3 12.500V4.500A1.500 1.500 0 014.500 3h8l9 9-9.500 9.500z" fill="#ffc933" stroke="#e8951c" stroke-width="1.300" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="#fff"/>`,
};

export type IconName = keyof typeof I;

export function icon(name: string, size = 24, cls = ''): string {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${I[name] ?? I.star}</svg>`;
}

const images = new Map<string, HTMLImageElement>();
const pending: Promise<void>[] = [];

/** Image rastérisable de l'icône (pour canvas 2D). */
export function iconImage(name: string): HTMLImageElement {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    const src = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" color="#fff">${I[name] ?? I.star}</svg>`;
    const el = img;
    pending.push(
      new Promise<void>((res) => {
        el.onload = () => res();
        el.onerror = () => res();
      }),
    );
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    images.set(name, img);
  }
  return img;
}

export function preloadIcons(names: string[] = Object.keys(I)): Promise<void> {
  names.forEach(iconImage);
  return Promise.all(pending).then(() => undefined);
}

export const iconNames = Object.keys(I);
