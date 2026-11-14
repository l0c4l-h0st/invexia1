import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { CONFIG } from './src/config';
import pkg from './package.json';

/** Injecte le titre de config.ts dans index.html. */
function htmlTitle(): Plugin {
  return {
    name: 'html-title',
    transformIndexHtml(html) {
      return html.replaceAll('%TITLE%', CONFIG.title).replaceAll('%THEME%', CONFIG.themeColor).replaceAll('%DESC%', CONFIG.description);
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: {
      target: 'es2020',
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1200,
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    plugins: [
      htmlTitle(),
      ...(single
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icons/*.png', 'icons/*.svg'],
              manifest: {
                name: CONFIG.title,
                short_name: CONFIG.shortTitle,
                description: CONFIG.description,
                lang: 'fr',
                theme_color: CONFIG.themeColor,
                background_color: CONFIG.themeColor,
                display: 'fullscreen',
                display_override: ['fullscreen', 'standalone'],
                orientation: 'portrait',
                start_url: './',
                scope: './',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
              workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
            }),
          ]),
    ],
  };
});
