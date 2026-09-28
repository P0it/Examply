// Starts backend (:8010) and frontend (:3000) together. Ctrl+C stops both.
const { spawn, execSync } = require('child_process');
const path = require('path');

const win = process.platform === 'win32';
const run = (cmd, dir) =>
  spawn(cmd, { cwd: path.join(__dirname, dir), shell: true, stdio: 'inherit', detached: !win });

const procs = [
  run('uv run uvicorn app.main:app --reload --port 8010', 'backend'),
  run('npm run dev', 'frontend'),
];

// Kill whole process trees (uvicorn reloader, next workers), not just the shells.
function stopAll() {
  for (const p of procs) {
    try {
      if (win) execSync(`taskkill /T /F /PID ${p.pid}`, { stdio: 'ignore' });
      else process.kill(-p.pid, 'SIGTERM');
    } catch {}
  }
  process.exit();
}

procs.forEach((p) => p.on('exit', stopAll));
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
