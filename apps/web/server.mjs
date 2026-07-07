import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist/web/browser');
const port = Number(process.env.PORT ?? 3000);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

const sendFile = async (pathname, response) => {
  const absolutePath = resolve(root, `.${pathname}`);

  try {
    const fileStat = await stat(absolutePath);

    if (fileStat.isDirectory()) {
      return sendFile(`${pathname.replace(/\/$/, '')}/index.html`, response);
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypes[extname(absolutePath)] ?? 'application/octet-stream');
    createReadStream(absolutePath).pipe(response);
    return;
  } catch {
    if (pathname !== '/index.html') {
      return sendFile('/index.html', response);
    }

    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Not found');
  }
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  void sendFile(url.pathname, response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Static web server listening on ${port}`);
});
