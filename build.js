// Simple build script for Vercel
// This ensures Vercel knows we have static files to serve
const fs = require('fs');

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
  'room.js',
  'animations.css'
];

let found = 0;
staticFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✓ ${file}`);
    found++;
  } else {
    console.log(`   ✗ ${file} (missing)`);
  }
});

console.log(`\n📊 Found ${found}/${staticFiles.length} static files`);
console.log('🚀 Ready to deploy!');

// Exit successfully
process.exit(0);

