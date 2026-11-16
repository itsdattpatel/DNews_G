const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'bin');
const targetFile = path.join(targetDir, 'node.exe');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (!fs.existsSync(targetFile)) {
  const currentExec = process.execPath;
  if (currentExec.toLowerCase().endsWith('node.exe') && fs.existsSync(currentExec)) {
    console.log(`[ensure-binaries] Copying ${currentExec} to ${targetFile}...`);
    fs.copyFileSync(currentExec, targetFile);
    console.log('[ensure-binaries] Node runtime copied successfully.');
  } else {
    console.warn(`[ensure-binaries] Warning: Could not find valid node.exe from process.execPath: ${currentExec}`);
  }
} else {
  console.log('[ensure-binaries] Node runtime already present in assets/bin/node.exe.');
}
