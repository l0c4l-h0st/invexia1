import * as THREE from 'three';

/** Ajoute un rim light (fresnel teinté) à un matériau Lambert : contour lumineux doux, coût quasi nul. */
function addRim<T extends THREE.Material>(mat: T, strength: number): T {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
      totalEmissiveRadiance += (diffuseColor.rgb * 0.75 + vec3(0.25, 0.24, 0.22)) * pow(rimF, 2.6) * ${strength.toFixed(2)};`,
    );
  };
  return mat;
}

/** Tout le décor statique : couleurs de sommets, éclairage doux. */
export const solidMat = addRim(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.42);

/** Pièces lumineuses (néons, ampoules, fenêtres) : non éclairées, pulsation globale via `color`. */
export const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });

/** Personnages instanciés : couleur par instance. */
export const charMat = addRim(new THREE.MeshLambertMaterial({ color: 0xffffff }), 0.6);

/** Petits objets instanciés (billets, serviettes). */
export const itemMat = addRim(new THREE.MeshLambertMaterial({ color: 0xffffff }), 0.35);

function softTexture(draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 64): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rectangle flou : ombres cuites sous le mobilier. */
export const softRectTex = softTexture((ctx, s) => {
  ctx.filter = 'blur(7px)';
  ctx.fillStyle = '#fff';
  const m = s * 0.2;
  ctx.beginPath();
  ctx.roundRect(m, m, s - m * 2, s - m * 2, s * 0.12);
  ctx.fill();
});

/** Disque flou : blob shadows des personnages. */
export const blobTex = softTexture((ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});

const shadowShader = {
  vertexShader: `
    attribute vec3 color;
    varying vec2 vUv; varying float vA;
    void main() {
      vUv = uv; vA = color.r;
      #ifdef USE_INSTANCING
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      #else
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #endif
    }`,
  fragmentShader: `
    uniform sampler2D map; uniform vec3 tint;
    varying vec2 vUv; varying float vA;
    void main() { gl_FragColor = vec4(tint, texture2D(map, vUv).a * vA); }`,
};

/** Ombres cuites (alpha par sommet). */
export const shadowMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: softRectTex }, tint: { value: new THREE.Color(0x1a1030) } },
  ...shadowShader,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** Blob shadows instanciées (alpha fixe via attribut color = blanc). */
export const blobMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: blobTex }, tint: { value: new THREE.Color(0x1a1030) } },
  ...shadowShader,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** Eau animée (piscine, spa, mer) : texture de reflets qui défile. */
export const waterTex = (() => {
  const t = softTexture((ctx, s) => {
    ctx.fillStyle = '#35c3ee';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = (i * 53) % s;
      const y = (i * 97) % s;
      for (const [ox, oy] of [[0, 0], [-s, 0], [0, -s], [s, 0], [0, s]]) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.quadraticCurveTo(x + ox + 12, y + oy - 8, x + ox + 26, y + oy);
        ctx.stroke();
      }
    }
  }, 128);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
export const waterMat = new THREE.MeshBasicMaterial({ map: waterTex, color: 0xffffff });
