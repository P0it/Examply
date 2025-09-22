/**
 * Development server startup script with automatic environment setup.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function setupEnvFile() {
  const envFile = path.join(__dirname, '..', '.env.local');
  const envExample = path.join(__dirname, '..', '.env.local.example');

  if (!fs.existsSync(envFile)) {
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log(`✅ Created ${envFile}`);
    } else {
      // Create minimal .env.local file
      const envContent = `# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
`;
      fs.writeFileSync(envFile, envContent);
      console.log(`✅ Created minimal ${envFile}`);
    }
  }
}

function main() {
  console.log('🚀 Starting Examply frontend development server...');

  // Setup environment file
  setupEnvFile();

  // Start Next.js development server
  const nextProcess = spawn('npx', ['next', 'dev', '--turbopack'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 Frontend server stopped');
    nextProcess.kill('SIGINT');
    process.exit(0);
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Failed to start frontend server:', error);
    process.exit(1);
  });

  nextProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Frontend server exited with code ${code}`);
      process.exit(code);
    }
  });
}

main();