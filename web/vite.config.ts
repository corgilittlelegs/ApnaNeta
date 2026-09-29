import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function affidavitProxyPlugin(): Plugin {
  return {
    name: 'affidavit-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/affidavit-proxy')) {
          const reqUrl = new URL(req.url, 'http://localhost');
          const targetUrl = reqUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Missing "url" query parameter');
            return;
          }

          try {
            const parsed = new URL(targetUrl);
            const host = parsed.hostname.toLowerCase();
            const allowed =
              parsed.protocol === 'https:' &&
              (host === 'eci.gov.in' || host.endsWith('.eci.gov.in'));

            if (!allowed) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end('Target URL is not an approved ECI domain');
              return;
            }

            const upstream = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ApnaNeta/1.0; +https://apnaneta.in)',
                Accept: 'application/pdf,*/*',
              },
            });

            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(`Upstream returned ${upstream.status}`);
              return;
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
            const arrayBuffer = await upstream.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(`Proxy error: ${err?.message || 'Connection error'}`);
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), affidavitProxyPlugin()],
  envDir: '../',
  build: {
    outDir: 'dist',
  },
});
