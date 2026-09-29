interface R2ObjectBody {
  body: ReadableStream;
  writeHttpMetadata?: (headers: Headers) => void;
  httpMetadata?: {
    contentType?: string;
  };
}

interface R2Bucket {
  get: (key: string) => Promise<R2ObjectBody | null>;
  put: (key: string, value: ReadableStream | ArrayBuffer | string, options?: any) => Promise<any>;
}

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  AFFIDAVITS_BUCKET?: R2Bucket;
}

// Whitelisted ECI domains per SSRF prevention policy (AGENTS.md)
const ALLOWED_EXACT_HOSTS = new Set([
  'affidavit.eci.gov.in',
  'affidavitresults.eci.gov.in',
  'suvidha.eci.gov.in',
  'eci.gov.in',
]);

const ALLOWED_HOST_SUFFIXES = [
  '.eci.gov.in',
];

function isAllowedPdfUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    // Prevent loopback and private network targets
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/.test(hostname)
    ) {
      return false;
    }

    if (ALLOWED_EXACT_HOSTS.has(hostname)) {
      return true;
    }
    for (const suffix of ALLOWED_HOST_SUFFIXES) {
      if (hostname.endsWith(suffix)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Dynamic endpoint: Proxy ECI affidavit PDFs to strip frame-ancestors CSP directive
    // or serve directly from Cloudflare R2 object storage if archived
    if (url.pathname === '/api/affidavit-proxy') {
      const keyParam = url.searchParams.get('key');
      const targetParam = url.searchParams.get('url');

      // 1. If an R2 storage key exists, attempt to serve directly from R2 bucket
      if (keyParam && env.AFFIDAVITS_BUCKET) {
        try {
          const r2Object = await env.AFFIDAVITS_BUCKET.get(keyParam);
          if (r2Object) {
            const headers = new Headers();
            if (r2Object.writeHttpMetadata) {
              r2Object.writeHttpMetadata(headers);
            }
            headers.set('Content-Type', 'application/pdf');
            headers.set('Content-Disposition', 'inline');
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Cache-Control', 'public, max-age=604800, s-maxage=2592000');
            headers.set('X-ApnaNeta-Source', 'R2-Archive');

            return new Response(r2Object.body, {
              status: 200,
              headers,
            });
          }
        } catch {
          // If R2 fetch fails, seamlessly fall back to ECI direct url below
        }
      }

      // 2. Fall back to official ECI portal URL
      if (!targetParam) {
        return new Response('Missing "url" or "key" query parameter', {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      if (!isAllowedPdfUrl(targetParam)) {
        return new Response('Target URL is not an approved ECI domain', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      try {
        const upstreamResponse = await fetch(targetParam, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ApnaNeta/1.0; +https://apnaneta.in)',
            Accept: 'application/pdf,*/*',
          },
        });

        if (!upstreamResponse.ok) {
          return new Response(`Upstream ECI portal returned HTTP ${upstreamResponse.status}`, {
            status: upstreamResponse.status,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }

        const headers = new Headers(upstreamResponse.headers);
        // Strip headers that prevent embedding in ApnaNeta
        headers.delete('content-security-policy');
        headers.delete('x-frame-options');
        headers.delete('x-content-security-policy');

        // Configure headers for seamless in-app document viewing and CDN caching
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', 'inline');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        headers.set('X-ApnaNeta-Source', 'ECI-Direct');

        return new Response(upstreamResponse.body, {
          status: 200,
          headers,
        });
      } catch (err: any) {
        return new Response(`Failed to fetch affidavit: ${err?.message || 'Upstream connection error'}`, {
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    // Serve static assets for all other routes
    return env.ASSETS.fetch(request);
  },
};
