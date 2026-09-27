/**
 * TFC GROUP — Universal Static Build Script
 * Populates both public/ and dist/ directories to guarantee deployment on
 * Cloudflare Pages, Cloudflare Workers, and standard static web servers.
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

console.log('Building TFC GROUP static bundle...');

[publicDir, distDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Copy index.html
  if (fs.existsSync(path.join(rootDir, 'index.html'))) {
    fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(dir, 'index.html'));
  }

  // Copy _headers
  if (fs.existsSync(path.join(rootDir, '_headers'))) {
    fs.copyFileSync(path.join(rootDir, '_headers'), path.join(dir, '_headers'));
  }

  // Copy _routes.json if present
  if (fs.existsSync(path.join(rootDir, '_routes.json'))) {
    fs.copyFileSync(path.join(rootDir, '_routes.json'), path.join(dir, '_routes.json'));
  }
});

console.log('Build complete! Populated public/ and dist/');
