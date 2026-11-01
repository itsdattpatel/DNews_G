/**
 * scripts/autostart-windows.js
 * Generates Windows Task Scheduler XML definition for user-logon autostart (P5-06).
 * Supports automatic task registration via `schtasks` or saving the XML template.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function generateWindowsAutostart() {
  const projectRoot = path.resolve(__dirname, '..');
  const autostartDir = path.join(projectRoot, 'autostart');
  const xmlPath = path.join(autostartDir, 'windows-task-scheduler.xml');

  if (!fs.existsSync(autostartDir)) {
    fs.mkdirSync(autostartDir, { recursive: true });
  }

  const username = os.userInfo().username || process.env.USERNAME || 'User';
  // Use cmd.exe /c npm run dev to start the desk cleanly in background
  const command = 'cmd.exe';
  const args = `/c npm run dev`;

  const xmlContent = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>AI World News Desk - Real-time Editorial Intelligence Desk</Description>
    <URI>\\AIWorldNewsDesk</URI>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT10S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${command}</Command>
      <Arguments>${args}</Arguments>
      <WorkingDirectory>${projectRoot}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;

  // Write with UTF-16LE or UTF-8 BOM if required by schtasks; standard UTF-8 is accepted by modern Windows schtasks
  fs.writeFileSync(xmlPath, xmlContent, 'utf8');
  console.log(`[autostart:windows] Generated Task Scheduler XML at: ${xmlPath}`);

  if (process.platform === 'win32') {
    const taskName = 'AIWorldNewsDesk';
    const registerCmd = `schtasks /create /tn "${taskName}" /xml "${xmlPath}" /f`;
    console.log(`[autostart:windows] Task Name: "${taskName}"`);
    console.log(`[autostart:windows] Register command: ${registerCmd}`);

    try {
      execSync(registerCmd, { stdio: 'pipe' });
      console.log(`[autostart:windows] SUCCESS: Task Scheduler entry "${taskName}" registered successfully!`);
    } catch (err) {
      console.log(`[autostart:windows] Note: Automatic registration requires standard privileges or manual confirmation.`);
      console.log(`[autostart:windows] To register manually, run PowerShell/cmd as Administrator:`);
      console.log(`    ${registerCmd}`);
    }
  } else {
    console.log(`[autostart:windows] Running on non-Windows host (${process.platform}). XML definition generated.`);
  }

  return xmlPath;
}

if (require.main === module) {
  generateWindowsAutostart();
}

module.exports = { generateWindowsAutostart };
