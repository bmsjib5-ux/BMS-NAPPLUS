const http = require('http');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const STATIC_DIR = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index_workshop.html' : pathname;
  filePath = path.join(STATIC_DIR, filePath.replace(/\.\./g, ''));
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

// === Config (override via environment variables) ===
const PORT = process.env.API_PORT || 7714;
const PG_HOST = process.env.PG_HOST || 'localhost';
const PG_PORT = process.env.PG_PORT || 5432;
const PG_DATABASE = process.env.PG_DATABASE || 'hosxp_db';
const PG_USER = process.env.PG_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || '';

// Runtime PG config (overrides env vars when set via /api/config)
let runtimePg = {
  host: PG_HOST,
  port: parseInt(PG_PORT),
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD
};

function pgConfig() {
  const cfg = {
    host: runtimePg.host,
    port: parseInt(runtimePg.port),
    database: runtimePg.database,
    user: runtimePg.user,
    connectionTimeoutMillis: 10000,
    query_timeout: 60000
  };
  if (runtimePg.password) cfg.password = runtimePg.password;
  return cfg;
}

// === CORS Headers ===
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, code, obj) {
  setCors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// === SQL Execution ===
async function executeSql(sql) {
  const client = new Client(pgConfig());
  try {
    await client.connect();
    const result = await client.query(sql);
    return { MessageCode: 200, Message: 'OK', data: result.rows };
  } catch (err) {
    const msg = err.message || err.code || String(err);
    let code = 409;
    if (err.code === 'ECONNREFUSED') code = 502;
    else if (err.code === 'ENOTFOUND') code = 502;
    else if (err.code === 'ETIMEDOUT') code = 504;
    else if (err.code === '28P01' || err.code === '28000') code = 401;  // auth failed
    console.error('  [PG ERROR]', err.code || '?', '-', msg);
    return { MessageCode: code, Message: 'Database error: ' + msg + (err.code ? ' (' + err.code + ')' : '') };
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

// === HTTP Server ===
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url, 'http://localhost');
  // Normalize path: collapse duplicate /api/sql segments (e.g. /api/sql/api/sql -> /api/sql)
  const pathname = parsed.pathname.replace(/(\/api\/sql)+$/, '/api/sql');
  const query = Object.fromEntries(parsed.searchParams);

  // Health check
  if (pathname === '/health') {
    sendJson(res, 200, {
      MessageCode: 200,
      Message: 'BMS Workshop API is running',
      config: { host: runtimePg.host, port: runtimePg.port, database: runtimePg.database, user: runtimePg.user }
    });
    return;
  }

  // Config endpoint: POST /api/config to update PG connection at runtime
  if (pathname === '/api/config') {
    if (req.method === 'GET') {
      sendJson(res, 200, {
        MessageCode: 200,
        config: { host: runtimePg.host, port: runtimePg.port, database: runtimePg.database, user: runtimePg.user }
      });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { MessageCode: 405, Message: 'Method Not Allowed' });
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    let cfg;
    try { cfg = JSON.parse(body); }
    catch(e) { sendJson(res, 400, { MessageCode: 400, Message: 'Invalid JSON' }); return; }

    // Update only provided fields
    if (cfg.host !== undefined) runtimePg.host = cfg.host;
    if (cfg.port !== undefined) runtimePg.port = cfg.port;
    if (cfg.database !== undefined) runtimePg.database = cfg.database;
    if (cfg.user !== undefined) runtimePg.user = cfg.user;
    if (cfg.password !== undefined) runtimePg.password = cfg.password;

    // Test the new config
    const test = await executeSql('SELECT 1 AS ok');
    if (test.MessageCode === 200) {
      console.log('  [CONFIG] Updated PG: ' + runtimePg.user + '@' + runtimePg.host + ':' + runtimePg.port + '/' + runtimePg.database);
      sendJson(res, 200, { MessageCode: 200, Message: 'Config updated and tested',
        config: { host: runtimePg.host, port: runtimePg.port, database: runtimePg.database, user: runtimePg.user } });
    } else {
      sendJson(res, 200, { MessageCode: test.MessageCode, Message: test.Message });
    }
    return;
  }

  // SQL endpoint: GET /api/sql?sql=...&app=...
  if (pathname === '/api/sql') {
    let sql = '';

    if (req.method === 'GET') {
      sql = query.sql || '';
    } else if (req.method === 'POST') {
      // Read body
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      try {
        const json = JSON.parse(body);
        sql = json.sql || '';
      } catch (_) {
        sql = body;
      }
    } else {
      sendJson(res, 405, { MessageCode: 405, Message: 'Method Not Allowed' });
      return;
    }

    if (!sql.trim()) {
      sendJson(res, 400, { MessageCode: 400, Message: 'Missing sql parameter' });
      return;
    }

    const app = query.app || 'unknown';
    const start = Date.now();
    const result = await executeSql(sql);
    const elapsed = Date.now() - start;

    // Log
    const rows = result.data ? result.data.length : 0;
    const status = result.MessageCode === 200 ? '\x1b[32mOK\x1b[0m' : '\x1b[31mERR\x1b[0m';
    const sqlPreview = sql.replace(/\s+/g, ' ').substring(0, 80);
    console.log(`  [${status}] ${elapsed}ms | ${rows} rows | ${app} | ${sqlPreview}...`);

    result.RequestTime = new Date().toISOString();
    sendJson(res, 200, result);
    return;
  }

  // Static files (HTML, CSS, JS, images, etc.)
  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
    return;
  }

  // 404
  sendJson(res, 404, { MessageCode: 404, Message: 'Not Found: ' + pathname });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  \x1b[36m==========================================\x1b[0m');
  console.log('  \x1b[1m  BMS Workshop REST API\x1b[0m');
  console.log('  \x1b[36m==========================================\x1b[0m');
  console.log('');
  console.log('  \x1b[33mPostgreSQL\x1b[0m');
  console.log('    Host     : ' + PG_HOST + ':' + PG_PORT);
  console.log('    Database : ' + PG_DATABASE);
  console.log('    User     : ' + PG_USER);
  console.log('');
  console.log('  \x1b[33mServer\x1b[0m');
  console.log('    Workshop : \x1b[32mhttp://localhost:' + PORT + '/index_workshop.html\x1b[0m');
  console.log('    API      : http://localhost:' + PORT + '/api/sql');
  console.log('    Health   : http://localhost:' + PORT + '/health');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('  \x1b[36m==========================================\x1b[0m');
  console.log('');
});
