#!/usr/bin/env node
// Injects the HouseRules boot splash into the Expo web export.
// Usage: node scripts/inject-web-splash.js [dist-dir]
// - Copies assets/splash.png into dist/
// - Adds a full-screen #hr-splash div to dist/index.html (removed by App.tsx on mount)
// - Rewrites absolute asset paths for the /houserules/ GitHub Pages subpath
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const distDir = process.argv[2] || path.join(appDir, 'dist');
const SUBPATH = '/houserules';

// 1. Copy splash image
const splashSrc = path.join(appDir, 'assets', 'splash.png');
const splashDst = path.join(distDir, 'splash.png');
if (fs.existsSync(splashSrc)) {
  fs.copyFileSync(splashSrc, splashDst);
  console.log('splash.png copied');
} else {
  console.warn('WARNING: assets/splash.png not found, skipping copy');
}

// 2. Patch index.html
const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Subpath rewrites for GitHub Pages
html = html.split('/_expo/').join(`${SUBPATH}/_expo/`);
html = html.split('"/favicon.ico"').join(`"${SUBPATH}/favicon.ico"`);

// Splash div + styles, inserted right after <body>
const splashHtml = `<div id="hr-splash" style="position:fixed;inset:0;z-index:9999;background:#0A2E23 url('${SUBPATH}/splash.png') center/cover no-repeat;"></div>`;
if (!html.includes('id="hr-splash"')) {
  html = html.replace(/<body([^>]*)>/, `<body$1>${splashHtml}`);
  console.log('splash div injected');
} else {
  console.log('splash div already present');
}

// 3. Rewrite absolute /assets/ paths inside the JS bundle
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
if (fs.existsSync(jsDir)) {
  for (const f of fs.readdirSync(jsDir)) {
    if (!f.endsWith('.js')) continue;
    const p = path.join(jsDir, f);
    const js = fs.readFileSync(p, 'utf8');
    if (js.includes('"/assets/')) {
      fs.writeFileSync(p, js.split('"/assets/').join(`"${SUBPATH}/assets/`));
      console.log(`patched ${f}`);
    }
  }
}

fs.writeFileSync(indexPath, html);
console.log('done');
