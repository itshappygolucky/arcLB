const fs = require('fs');
const path = require('path');

const webBuildDir = path.join(__dirname, '..', 'web-build');
const baseUrl = '/arcLB';

function fixBaseUrlInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix script and link tags that start with /_expo or /assets
    // Replace /_expo with /arcLB/_expo and /assets with /arcLB/assets
    const patterns = [
      { from: /href="\/_expo\//g, to: `href="${baseUrl}/_expo/` },
      { from: /src="\/_expo\//g, to: `src="${baseUrl}/_expo/` },
      { from: /href="\/assets\//g, to: `href="${baseUrl}/assets/` },
      { from: /src="\/assets\//g, to: `src="${baseUrl}/assets/` },
      // Fix JSON imports and other references
      { from: /"\/_expo\//g, to: `"${baseUrl}/_expo/` },
      { from: /"\/assets\//g, to: `"${baseUrl}/assets/` },
    ];

    patterns.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed baseUrl in: ${path.relative(webBuildDir, filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules if it exists
      if (entry.name !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // Process HTML, JS, and JSON files
      if (entry.name.endsWith('.html') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
        fixBaseUrlInFile(fullPath);
      }
    }
  }
}

console.log('Fixing baseUrl paths in build output...');
processDirectory(webBuildDir);
console.log('✓ BaseUrl paths fixed');
