import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 8782);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ttf':'font/ttf', '.pdf':'application/pdf', '.mp4':'video/mp4' };
createServer((request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep)) throw new Error('Outside root');
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes' };
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) { response.writeHead(416, {'Content-Range':`bytes */${stat.size}`}); response.end(); return; }
      response.writeHead(206, {...headers, 'Content-Range':`bytes ${start}-${end}/${stat.size}`, 'Content-Length':end-start+1});
      createReadStream(file,{start,end}).pipe(response);
    } else {
      response.writeHead(200,{...headers,'Content-Length':stat.size});
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
    }
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`Academic homepage preview: http://127.0.0.1:${port}/`));
