const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Minimal 1x1 Blue Pixel PNG
// data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMZbITAAAAABJRU5ErkJggg==
// Detailed Blue Square (100x100 approx) - actually I'll just use a small valid PNG buffer
// and copy it to different names.

// A simple blue 64x64 PNG (approx)
const blueIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVHhe7cwxAQAgDMCwPf41qw82kIAZ2Ds32bstAAAAAAAAAADgRw94gAe84AEPeMADHvCABzzgAQ94wAMe8IAHPOABD3jAAx7wAAAAAAAAvgwV+QAd04O1nQAAAABJRU5ErkJggg==";

const buffer = Buffer.from(blueIconBase64, 'base64');

const icons = [
    'icon-192.png',
    'icon-512.png',
    'apple-icon.png',
    'icon-light-32x32.png',
    'icon-dark-32x32.png'
];

console.log('Generating placeholder icons in public/ ...');

icons.forEach(iconName => {
    const filePath = path.join(publicDir, iconName);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Created ${iconName}`);
        console.log(`   Path: ${filePath}`);
    } else {
        console.log(`ℹ️  Skipped ${iconName} (already exists)`);
    }
});

// Also create SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0F1A3A"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="250" fill="#00F5FF">LV</text>
</svg>`;

const svgPath = path.join(publicDir, 'icon.svg');
if (!fs.existsSync(svgPath)) {
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created icon.svg`);
} else {
    console.log(`ℹ️  Skipped icon.svg (already exists)`);
}

console.log('\n✨ Done! You can replace these files with real icons later.');
