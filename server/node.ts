import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Readable } from 'node:stream';
import { handleApi } from './api';
const root = resolve('dist');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const init: RequestInit & { duplex?: string } = { method: req.method, headers: req.headers as Record<string, string> };
      if (!['GET', 'HEAD'].includes(req.method || 'GET')) { init.body = Readable.toWeb(req) as ReadableStream; init.duplex = 'half'; }
      const response = await handleApi(new Request(url, init), process.env, req.socket.remoteAddress);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) { res.writeHead(405); res.end(); return; }
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try { if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html'); } catch { res.writeHead(404); res.end('Not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Server error'); }
}).listen(Number(process.env.PORT || 4317), '0.0.0.0', () => console.log(`Afterglow listening on port ${process.env.PORT || 4317}`));
