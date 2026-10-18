'use strict';
// A static site with one form. No dependencies. Put it behind nginx.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // only nginx can connect
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data', 'messages.jsonl');

fs.mkdirSync(path.dirname(DATA), { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, { ...HEADERS, 'Content-Type': type, ...extra });
  res.end(body);
}

function redirect(res, to) {
  res.writeHead(303, { ...HEADERS, Location: to });
  res.end();
}

function notFound(res) {
  fs.readFile(path.join(PUBLIC, '404.html'), (err, data) =>
    send(res, 404, err ? 'Not found' : data, TYPES['.html']));
}

// ---- Static files --------------------------------------------------
// "/" -> index.html, "/about" -> about.html, "/css/site.css" -> as is.
function serveFile(req, res) {
  let p;
  try {
    p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (p.includes('\0')) return send(res, 400, 'Bad request');
  if (p.endsWith('/')) p += 'index';
  if (!path.extname(p)) p += '.html';

  const file = path.join(PUBLIC, path.normalize(p));
  if (!file.startsWith(PUBLIC + path.sep)) return notFound(res);

  fs.readFile(file, (err, data) => {
    if (err) return notFound(res);
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
  });
}

// ---- Rate limit: 5 messages per 15 minutes per address -------------
const WINDOW = 15 * 60 * 1000;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    if (list.every((t) => now - t >= WINDOW)) hits.delete(ip);
  }
}, WINDOW).unref();

// ---- Contact form --------------------------------------------------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function handleContact(req, res) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/x-www-form-urlencoded')) return send(res, 415, 'Unsupported type');

  // Refuse a form that another site sends.
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, 'Forbidden');

  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
  if (limited(ip)) return redirect(res, '/contact-error');

  let body = '';
  let tooBig = false;
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    if (tooBig) return;
    body += chunk;
    if (body.length > 10000) {
      tooBig = true;
      res.writeHead(413, { ...HEADERS, Connection: 'close' });
      res.end('Too large', () => req.destroy());
    }
  });

  req.on('end', () => {
    if (tooBig) return;
    const f = new URLSearchParams(body);
    const name = (f.get('name') || '').trim();
    const email = (f.get('email') || '').trim();
    const message = (f.get('message') || '').trim();

    // A bot fills the hidden field. Tell it "thanks" and keep nothing.
    if (f.get('website')) return redirect(res, '/thanks');

    const valid =
      name && name.length <= 100 &&
      email.length <= 200 && EMAIL.test(email) &&
      message && message.length <= 5000;
    if (!valid) return redirect(res, '/contact-error');

    const line = JSON.stringify({ at: new Date().toISOString(), ip, name, email, message }) + '\n';
    fs.appendFile(DATA, line, (err) => {
      if (err) return send(res, 500, 'Server error');
      redirect(res, '/thanks');
    });
  });
}

// ---- Server --------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/contact') return handleContact(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveFile(req, res);
  send(res, 405, 'Method not allowed', undefined, { Allow: 'GET, HEAD, POST' });
});

server.headersTimeout = 10000;
server.requestTimeout = 15000;
server.listen(PORT, HOST, () => console.log(`http://${HOST}:${PORT}`));
