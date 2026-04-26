const packager = require('electron-packager');
const fs = require('fs-extra');
const path = require('path');

async function build() {
  console.log('Packaging Electron app...');
  
  // Package the electron app
  const appPaths = await packager({
    dir: '.',
    name: 'SyncWave',
    platform: 'win32',
    arch: 'x64',
    icon: 'icon.png',
    out: 'release',
    overwrite: true,
    ignore: [
      /^\/release/,
      /^\/build-app\.js/
    ]
  });

  const appPath = appPaths[0];
  console.log(`App packaged successfully at: ${appPath}`);

  // Now copy backend and frontend into resources folder
  const resourcesPath = path.join(appPath, 'resources');
  
  console.log('Copying backend files...');
  const backendSrc = path.join(__dirname, '../backend');
  const backendDest = path.join(resourcesPath, 'backend');
  
  await fs.copy(backendSrc, backendDest, {
    filter: (src) => !src.includes('\\uploads') && !src.includes('/uploads')
  });

  console.log('Copying frontend files...');
  const frontendSrc = path.join(__dirname, '../frontend/dist');
  const frontendDest = path.join(resourcesPath, 'frontend/dist');
  
  await fs.copy(frontendSrc, frontendDest);

  console.log('Build complete! Your executable is in the release folder.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
