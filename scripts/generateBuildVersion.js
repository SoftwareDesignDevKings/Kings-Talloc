const fs = require('fs');
const path = require('path');

// on npm build - script npm prebuild will create a version. 
const version = {
    build: Date.now().toString()
};

const outPath = path.join(__dirname, '..', 'public', 'version.json');
const publicDir = path.dirname(outPath);

// ensure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(version, null, 2));
console.log('[BuildVersion] Generated version.json:', version.build);