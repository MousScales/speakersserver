// Simple build script for Vercel
// This ensures Vercel knows we have static files to serve
const fs = require('fs');
const path = require('path');

console.log('✅ Build complete - static files are ready');
console.log('📁 Static files detected:');
const staticFiles = [
  'index.html',
  'auth.html',
  'room.html',
  'onboarding.html',
  'about.html',
  'styles.css',
  'room.css',
  'script.js',
  'room.js'
];

staticFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✓ ${file}`);
  }
});

// Exit successfully
process.exit(0);

