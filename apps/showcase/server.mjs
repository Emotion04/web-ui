import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const showcaseRoot = join(appRoot, 'apps', 'showcase');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }

  const base = pathname.startsWith('/core/') ? join(appRoot, 'packages', 'core')
    : pathname.startsWith('/vanilla/') ? join(appRoot, 'packages', 'vanilla')
      : showcaseRoot;
  const relative = pathname.startsWith('/core/') ? pathname.slice('/core/'.length)
    : pathname.startsWith('/vanilla/') ? pathname.slice('/vanilla/'.length)
      : pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const file = resolve(base, normalize(relative));
  if (file !== base && !file.startsWith(base + sep)) { res.writeHead(403); res.end('Forbidden'); return; }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const requestedPort = Number(process.env.PORT || 4173);

// A dev server that dies with EADDRINUSE wastes a manual test round-trip.
// Try the requested port, then walk upward to the first free one.
function listen(port, attemptsLeft = 20) {
  server.once('error', error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      server.removeAllListeners('error');
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Universal UI showcase: http://127.0.0.1:${port}`);
  });
}

listen(requestedPort);
