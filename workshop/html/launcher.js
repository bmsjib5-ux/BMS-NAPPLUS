#!/usr/bin/env node
/**
 * BMS Workshop Launcher
 * Starts the API server and opens the browser automatically.
 * Can be compiled to .exe using: pkg launcher.js --targets win-x64 --output BMS-Workshop.exe
 */
const { exec } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const API_PORT = process.env.API_PORT || 7714;

// ===== Detect local IP =====
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ===== Open browser =====
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start ""'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

// ===== Wait for server =====
function waitForServer(url, retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(url, () => resolve()).on('error', () => {
        if (++attempts >= retries) reject(new Error('Server did not start'));
        else setTimeout(check, 500);
      });
    };
    check();
  });
}

// ===== Main =====
async function main() {
  const ip = getLocalIP();

  console.log('');
  console.log('  ==========================================');
  console.log('  BMS Workshop Launcher');
  console.log('  ==========================================');
  console.log('');
  console.log('  Local IP : ' + ip);
  console.log('  API Port : ' + API_PORT);
  console.log('');

  // Start the server
  const appDir = path.dirname(process.argv[1]) || __dirname;
  process.chdir(appDir);

  // Check if port is already in use
  const portFree = await new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(true); });
    s.listen(API_PORT);
  });

  if (portFree) {
    require('./server.js');
  } else {
    console.log('  Port ' + API_PORT + ' already in use, connecting to existing server...');
  }

  // Wait for server to be ready, then open browser
  try {
    await waitForServer(`http://localhost:${API_PORT}/health`);
    const url = `http://localhost:${API_PORT}/index_workshop.html`;
    console.log('  Opening browser: ' + url);
    console.log('');
    console.log('  LAN access: http://' + ip + ':' + API_PORT + '/index_workshop.html');
    console.log('');
    openBrowser(url);
  } catch (e) {
    console.error('  [ERROR] ' + e.message);
  }
}

main();
