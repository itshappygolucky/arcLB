const fs = require('fs');
const path = require('path');

const webBuildDir = path.join(__dirname, '..', 'web-build');

function removeNodeModules(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const nodeModulesPath = path.join(dir, 'assets', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('Removing node_modules from build output...');
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('✓ Removed node_modules');
  }
}

removeNodeModules(webBuildDir);
