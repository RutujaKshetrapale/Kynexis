#!/usr/bin/env node

/**
 * KYNEXIS - Instant Development Startup Runner
 * 
 * Launches ALL 10 Spring Boot microservices simultaneously in parallel,
 * verifies database connectivity, tracks PIDs, and starts the Vite frontend.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(REPO_ROOT, 'Backend');
const FRONTEND_DIR = path.join(REPO_ROOT, 'Frontend');
const PID_FILE = path.join(REPO_ROOT, '.kynexis-dev.pid');
const ENV_FILE = path.join(REPO_ROOT, '.env');

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

// 1. Parse .env
function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const DB_USER = env.SPRING_DATASOURCE_USERNAME || 'root';
const DB_PASS = env.SPRING_DATASOURCE_PASSWORD || '21011017';
const DB_URL = env.SPRING_DATASOURCE_URL || 'jdbc:mysql://localhost:3306/smart_factory_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC';
const JWT_SECRET = env.JWT_SECRET || 'SmartFactorySecretKeyForDevelopmentOnly123456789';
const INTERNAL_SECRET = env.INTERNAL_API_SECRET || 'KynexisInternalServiceCommunicationSecretKey2026';

// 2. Microservice Definitions
const SERVICES = [
  { name: 'authentication-service', port: 8081 },
  { name: 'plant-service',          port: 8082 },
  { name: 'machine-service',        port: 8088 },
  { name: 'sensor-service',         port: 8089 },
  { name: 'telemetry-service',      port: 8083 },
  { name: 'alert-service',          port: 8084 },
  { name: 'maintenance-service',    port: 8085 },
  { name: 'production-service',     port: 8086 },
  { name: 'energy-service',         port: 8087 },
  { name: 'api-gateway',            port: 8080 }
];

// Helper: Check if a local port is listening
function isPortOpen(port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      resolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      resolved = true;
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolved = true;
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, '127.0.0.1');
  });
}

// Helper: Check HTTP Health
function checkHttpHealth(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.status === 'UP');
        } catch {
          resolve(res.statusCode === 200);
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

// Helper: Record PID
function recordPid(pid, name) {
  const line = `${pid}:${name}:${new Date().toISOString()}\n`;
  fs.appendFileSync(PID_FILE, line, 'utf-8');
}

// Main Runner
async function main() {
  const args = process.argv.slice(2);
  const backendOnly = args.includes('--backend-only') || args.includes('-b');
  const frontendOnly = args.includes('--frontend-only') || args.includes('-f');

  console.log(`${colors.cyan}============================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}   KYNEXIS - Rapid Microservices Development Runner        ${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}`);

  // Check MySQL
  const mysqlUp = await isPortOpen(3306);
  if (mysqlUp) {
    console.log(`  ${colors.green}✓${colors.reset} MySQL Service: ${colors.green}LISTENING on Port 3306${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} MySQL Port 3306 is not open. Ensure MySQL is running if services fail to connect.`);
  }

  const spawnedPids = [];

  if (!frontendOnly) {
    console.log(`\n${colors.yellow}[1/2] Launching all 10 microservices simultaneously...${colors.reset}`);

    // Check existing open ports
    const portChecks = await Promise.all(SERVICES.map(s => isPortOpen(s.port)));

    // Launch missing services in parallel
    for (let i = 0; i < SERVICES.length; i++) {
      const svc = SERVICES[i];
      const isOpen = portChecks[i];

      if (isOpen) {
        console.log(`  ${colors.green}[REUSED]${colors.reset} ${svc.name.padEnd(24)} on Port ${svc.port} (already running)`);
        continue;
      }

      const jarPath = path.join(BACKEND_DIR, svc.name, 'target', `${svc.name}-0.0.1-SNAPSHOT.jar`);
      if (!fs.existsSync(jarPath)) {
        console.log(`  ${colors.red}[MISSING JAR]${colors.reset} ${jarPath}`);
        console.log(`  Building ${svc.name}...`);
        execSync(`mvn package -DskipTests -q`, { cwd: path.join(BACKEND_DIR, svc.name), stdio: 'inherit' });
      }

      const svcDir = path.join(BACKEND_DIR, svc.name);
      const javaArgs = [
        '-Xms64m',
        '-Xmx256m',
        '-XX:+TieredCompilation',
        '-XX:TieredStopAtLevel=1',
        `-Dspring.datasource.password=${DB_PASS}`,
        `-Dspring.datasource.username=${DB_USER}`,
        `-Dspring.datasource.url=${DB_URL}`,
        `-Djwt.secret=${JWT_SECRET}`,
        `-Dkynexis.security.internal-secret=${INTERNAL_SECRET}`,
        `-Dserver.port=${svc.port}`,
        '-jar',
        jarPath
      ];

      const child = spawn('java', javaArgs, {
        cwd: svcDir,
        detached: true,
        stdio: 'ignore'
      });

      child.unref();
      spawnedPids.push({ pid: child.pid, name: svc.name, port: svc.port });
      recordPid(child.pid, svc.name);

      console.log(`  ${colors.cyan}[SPAWNED]${colors.reset} ${svc.name.padEnd(24)} Port: ${svc.port} (PID: ${child.pid})`);
    }

    console.log(`${colors.green}  ✓ All microservices initiated concurrently in parallel!${colors.reset}`);
  }

  // Non-blocking asynchronous health reporter in background
  if (!frontendOnly && spawnedPids.length > 0) {
    const pendingServices = [...spawnedPids];
    const startTime = Date.now();
    const interval = setInterval(async () => {
      for (let j = pendingServices.length - 1; j >= 0; j--) {
        const item = pendingServices[j];
        const isUp = await checkHttpHealth(`http://localhost:${item.port}/actuator/health`);
        if (isUp) {
          const sec = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ${colors.green}✓ [ONLINE]${colors.reset} ${item.name.padEnd(24)} on Port ${item.port} in ${sec}s`);
          pendingServices.splice(j, 1);
        }
      }
      if (pendingServices.length === 0 || Date.now() - startTime > 45000) {
        clearInterval(interval);
      }
    }, 1500);
  }

  // Launch Frontend
  if (!backendOnly) {
    console.log(`\n${colors.yellow}[2/2] Launching Frontend Development Server...${colors.reset}`);
    const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');

    const viteProcess = spawn(process.execPath, [viteBin], {
      cwd: FRONTEND_DIR,
      stdio: 'inherit'
    });

    // Handle process shutdown
    const cleanup = () => {
      console.log(`\n${colors.yellow}Shutting down Kynexis microservices and Frontend dev server...${colors.reset}`);
      try {
        viteProcess.kill();
      } catch {}

      // Stop spawned microservices
      for (const item of spawnedPids) {
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /PID ${item.pid} /T /F`, { stdio: 'ignore' });
          } else {
            process.kill(item.pid, 'SIGKILL');
          }
        } catch {}
      }

      try {
        if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
      } catch {}

      console.log(`${colors.green}✓ All services stopped cleanly.${colors.reset}\n`);
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}

main().catch(err => {
  console.error(`${colors.red}Error starting Kynexis:${colors.reset}`, err);
  process.exit(1);
});
