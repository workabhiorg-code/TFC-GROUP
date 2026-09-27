/**
 * TFC GROUP — Static Build Script for Cloudflare Pages / Workers
 * Copies production web assets to dist/ directory to avoid publishing node_modules.
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('Building TFC GROUP static bundle...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy index.html
if (fs.existsSync(path.join(rootDir, 'index.html'))) {
  fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
  console.log('  -> Copied index.html to dist/index.html');
}

// Copy _headers
if (fs.existsSync(path.join(rootDir, '_headers'))) {
  fs.copyFileSync(path.join(rootDir, '_headers'), path.join(distDir, '_headers'));
  console.log('  -> Copied _headers to dist/_headers');
}

// Copy _routes.json if present
if (fs.existsSync(path.join(rootDir, '_routes.json'))) {
  fs.copyFileSync(path.join(rootDir, '_routes.json'), path.join(distDir, '_routes.json'));
  console.log('  -> Copied _routes.json to dist/_routes.json');
}

console.log('Build complete! Output directory: dist/');
