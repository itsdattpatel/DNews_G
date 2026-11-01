/**
 * scripts/autostart-linux.js
 * Generates Linux systemd user service file for user login autostart (P5-08).
 * Supports saving to autostart/ directory and deploying to ~/.config/systemd/user/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function generateLinuxAutostart() {
  const projectRoot = path.resolve(__dirname, '..');
  const autostartDir = path.join(projectRoot, 'autostart');
  const serviceFilename = 'ai-world-news-desk.service';
  const servicePath = path.join(autostartDir, serviceFilename);

  if (!fs.existsSync(autostartDir)) {
    fs.mkdirSync(autostartDir, { recursive: true });
  }

  const serviceContent = `[Unit]
Description=AI World News Desk - Real-time Editorial Intelligence Desk
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${projectRoot}
ExecStart=/bin/sh -c "npm run dev"
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;

  fs.writeFileSync(servicePath, serviceContent, 'utf8');
  console.log(`[autostart:linux] Generated systemd user service at: ${servicePath}`);

  const userServiceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  const targetUserService = path.join(userServiceDir, serviceFilename);

  if (process.platform === 'linux') {
    try {
      if (!fs.existsSync(userServiceDir)) {
        fs.mkdirSync(userServiceDir, { recursive: true });
      }
      fs.copyFileSync(servicePath, targetUserService);
      console.log(`[autostart:linux] Deployed service to: ${targetUserService}`);

      execSync('systemctl --user daemon-reload');
      execSync(`systemctl --user enable --now ${serviceFilename}`);
      console.log(`[autostart:linux] SUCCESS: systemd user service enabled and started.`);
    } catch (err) {
      console.log(`[autostart:linux] Note: automatic systemctl setup encountered: ${err.message}`);
      console.log(`[autostart:linux] To enable manually, run:`);
      console.log(`    mkdir -p ~/.config/systemd/user/`);
      console.log(`    cp "${servicePath}" ~/.config/systemd/user/`);
      console.log(`    systemctl --user daemon-reload`);
      console.log(`    systemctl --user enable --now ${serviceFilename}`);
    }
  } else {
    console.log(`[autostart:linux] Running on non-Linux host (${process.platform}). Systemd service saved.`);
  }

  return servicePath;
}

if (require.main === module) {
  generateLinuxAutostart();
}

module.exports = { generateLinuxAutostart };
