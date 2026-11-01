/**
 * scripts/autostart-mac.js
 * Generates macOS launchd plist for user login autostart (P5-07).
 * Supports saving to autostart/ directory and deploying to ~/Library/LaunchAgents/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function generateMacAutostart() {
  const projectRoot = path.resolve(__dirname, '..');
  const autostartDir = path.join(projectRoot, 'autostart');
  const plistFilename = 'com.aiworldnewsdesk.app.plist';
  const plistPath = path.join(autostartDir, plistFilename);
  const logsDir = path.join(projectRoot, 'data', 'logs');

  if (!fs.existsSync(autostartDir)) {
    fs.mkdirSync(autostartDir, { recursive: true });
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aiworldnewsdesk.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>npm run dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectRoot}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${path.join(logsDir, 'mac-autostart.stdout.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(logsDir, 'mac-autostart.stderr.log')}</string>
</dict>
</plist>
`;

  fs.writeFileSync(plistPath, plistContent, 'utf8');
  console.log(`[autostart:mac] Generated launchd plist at: ${plistPath}`);

  const userLaunchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const targetUserPlist = path.join(userLaunchAgentsDir, plistFilename);

  if (process.platform === 'darwin') {
    try {
      if (!fs.existsSync(userLaunchAgentsDir)) {
        fs.mkdirSync(userLaunchAgentsDir, { recursive: true });
      }
      fs.copyFileSync(plistPath, targetUserPlist);
      console.log(`[autostart:mac] Deployed plist to: ${targetUserPlist}`);

      execSync(`launchctl unload "${targetUserPlist}" 2>/dev/null || true`);
      execSync(`launchctl load "${targetUserPlist}"`);
      console.log(`[autostart:mac] SUCCESS: launchctl agent loaded successfully.`);
    } catch (err) {
      console.log(`[autostart:mac] Could not register via launchctl directly (${err.message}).`);
      console.log(`[autostart:mac] To load manually:`);
      console.log(`    cp "${plistPath}" ~/Library/LaunchAgents/`);
      console.log(`    launchctl load ~/Library/LaunchAgents/${plistFilename}`);
    }
  } else {
    console.log(`[autostart:mac] Running on non-macOS host (${process.platform}). Plist definition saved.`);
  }

  return plistPath;
}

if (require.main === module) {
  generateMacAutostart();
}

module.exports = { generateMacAutostart };
