/**
 * `web.output: "single"` generates a plain index.html without the Expo Router
 * `+html.tsx` hook. This post-export step injects the small amount of head
 * markup the SPA needs: PWA manifest, early theme detection (no flash) and
 * mobile web-app metadata.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(file)) {
  throw new Error('dist/index.html not found. Run `npx expo export --platform web` first.');
}

let html = fs.readFileSync(file, 'utf8');

const themeScript = `
    <script>
      (function () {
        try {
          var stored = localStorage.getItem('needcart.theme') || 'system';
          var dark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          var root = document.documentElement;
          if (dark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
          root.style.colorScheme = dark ? 'dark' : 'light';
          var fallback = dark ? '#121212' : '#FAF7F0';
          var background = localStorage.getItem('needcart.background') || fallback;
          root.style.backgroundColor = background;
          if (document.body) { document.body.style.backgroundColor = background; }
          var meta = document.querySelector('meta[name="theme-color"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', '#121212');
        } catch (error) {}
      })();
    </script>`;

const headMarkup = `
    <meta name="description" content="A shared shopping list for your family, partner, or roommates." />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="NeedCart" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />${themeScript}
`;

html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${headMarkup}\n  </head>`);
}

fs.writeFileSync(file, html, 'utf8');
console.log('Injected web head markup into dist/index.html');
