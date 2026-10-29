#!/usr/bin/env node

/**
 * KYNEXIS - Shutdown Script
 * Stops all microservices and development processes.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(REPO_ROOT, '.kynexis-dev.pid');

const PORTS = [5173, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089];

console.log('\x1b[36m============================================================\x1b[0m');
console.log('\x1b[36m\x1b[1m   KYNEXIS - Stopping Development Services                 \x1b[0m');
console.log('\x1b[36m============================================================\x1b[0m');

// 1. Stop recorded PIDs
if (fs.existsSync(PID_FILE)) {
  const content = fs.readFileSync(PID_FILE, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  
  for (const line of lines) {
    const [pidStr, name] = line.split(':');
    const pid = parseInt(pidStr, 10);
    if (pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } else {
          process.kill(pid, 'SIGKILL');
        }
        console.log(`  \x1b[33mStopped\x1b[0m ${name || 'Process'} (PID: ${pid})`);
      } catch {
        // process might already be stopped
      }
    }
  }

  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

// 2. Scan ports on Windows to kill any remaining listeners
if (process.platform === 'win32') {
  try {
    for (const port of PORTS) {
      try {
        const netstatOutput = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
        const lines = netstatOutput.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && parseInt(pid, 10) > 0) {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            console.log(`  \x1b[33mKilled remaining listener\x1b[0m on Port ${port} (PID: ${pid})`);
          }
        }
      } catch {}
    }
  } catch {}
}

console.log('\x1b[32m✓ All Kynexis services stopped successfully.\x1b[0m\n');
