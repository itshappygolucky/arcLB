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
      // Fix route references - be careful not to break absolute URLs
      { from: /"\/index\.html"/g, to: `"${baseUrl}/index.html"` },
      { from: /"\/planner\.html"/g, to: `"${baseUrl}/planner.html"` },
      // Fix route paths in route manifest (more specific)
      { from: /"path":"\/"/g, to: `"path":"${baseUrl}/"` },
      { from: /"path":"\/planner"/g, to: `"path":"${baseUrl}/planner"` },
      // Fix base path references in code
      { from: /baseUrl\s*=\s*["']\//g, to: `baseUrl="${baseUrl}/` },
      { from: /baseUrl\s*:\s*["']\//g, to: `baseUrl:"${baseUrl}/` },
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
      // Process HTML, JS, JSON, and other text files that might contain paths
      if (entry.name.endsWith('.html') || 
          entry.name.endsWith('.js') || 
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.map') ||
          entry.name.endsWith('.txt')) {
        fixBaseUrlInFile(fullPath);
      }
    }
  }
}

console.log('Fixing baseUrl paths in build output...');
processDirectory(webBuildDir);

// Create 404.html for GitHub Pages to redirect to index.html
const indexPath = path.join(webBuildDir, 'index.html');
const notFoundPath = path.join(webBuildDir, '404.html');

// Add base tag to HTML files and create 404.html
function addBaseTagToHtml(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if base tag already exists
    if (!content.includes('<base')) {
      // Insert base tag right after <head>
      content = content.replace(/<head[^>]*>/i, `$&\n  <base href="${baseUrl}/">`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Added base tag to: ${path.relative(webBuildDir, filePath)}`);
    }
  } catch (error) {
    console.error(`Error adding base tag to ${filePath}:`, error.message);
  }
}

// Process all HTML files to add base tag
function addBaseTags(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        addBaseTags(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      addBaseTagToHtml(fullPath);
    }
  }
}

if (fs.existsSync(indexPath)) {
  try {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    // Update baseUrl in 404.html copy
    indexContent = indexContent.replace(/\/_expo\//g, `${baseUrl}/_expo/`);
    indexContent = indexContent.replace(/\/assets\//g, `${baseUrl}/assets/`);
    // Ensure base tag is in 404.html
    if (!indexContent.includes('<base')) {
      indexContent = indexContent.replace(/<head[^>]*>/i, `$&\n  <base href="${baseUrl}/">`);
    }
    fs.writeFileSync(notFoundPath, indexContent, 'utf8');
    console.log('✓ Created 404.html for GitHub Pages');
  } catch (error) {
    console.error('Error creating 404.html:', error.message);
  }
}

// Add base tags to all HTML files
addBaseTags(webBuildDir);

console.log('✓ BaseUrl paths fixed');
