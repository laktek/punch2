import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn): Promise<Response> {
  const { config, request, remoteAddr } = ctx;
  const url = new URL(request.url);
  const { pathname } = url;
  const newCtx = { ...ctx };

  if (config.proxies) {
    // First try exact match
    const proxy = config.proxies[pathname];
    if (proxy) {
      const response = await proxyRequest(request, proxy, pathname, remoteAddr);
      newCtx.response = response;
      return next()(newCtx, next);
    }

    // Then try wildcard matches (e.g., /api/* matches /api/foo, /api/bar, etc.)
    for (const [pattern, proxy] of Object.entries(config.proxies)) {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1); // Remove '*', keep the '/'
        if (pathname.startsWith(prefix)) {
          const response = await proxyRequest(request, proxy, pathname, remoteAddr);
          newCtx.response = response;
          return next()(newCtx, next);
        }
      }
    }
  }

  return next()(newCtx, next);
}

async function proxyRequest(
  request: Request,
  proxy: {
    destination: string;
    preserveHost?: boolean;
    stripPath?: boolean;
    headers?: Record<string, string>;
    timeout?: number;
    websocket?: boolean;
  },
  pathname: string,
  remoteAddr?: Deno.Addr,
): Promise<Response> {
  const originalUrl = new URL(request.url);
  const destinationUrl = new URL(proxy.destination);

  // Construct the target URL
  let targetPath = pathname;
  if (proxy.stripPath) {
    // If stripPath is true, use only the destination path
    targetPath = destinationUrl.pathname;
  } else {
    // Combine destination path with request pathname
    targetPath = destinationUrl.pathname.replace(/\/$/, '') + pathname;
  }

  // Preserve query string
  const targetUrl = new URL(targetPath + originalUrl.search, destinationUrl.origin);

  // Build headers
  const headers = new Headers(request.headers);

  // Add X-Forwarded-* headers
  const clientIp = remoteAddr && 'hostname' in remoteAddr
    ? remoteAddr.hostname
    : 'unknown';

  // X-Forwarded-For: append to existing or create new
  const existingXFF = headers.get('X-Forwarded-For');
  headers.set(
    'X-Forwarded-For',
    existingXFF ? `${existingXFF}, ${clientIp}` : clientIp
  );

  // X-Forwarded-Host: original host
  if (!headers.has('X-Forwarded-Host')) {
    headers.set('X-Forwarded-Host', originalUrl.host);
  }

  // X-Forwarded-Proto: original protocol
  if (!headers.has('X-Forwarded-Proto')) {
    headers.set('X-Forwarded-Proto', originalUrl.protocol.replace(':', ''));
  }

  // X-Forwarded-Port: original port
  if (!headers.has('X-Forwarded-Port')) {
    const port = originalUrl.port || (originalUrl.protocol === 'https:' ? '443' : '80');
    headers.set('X-Forwarded-Port', port);
  }

  // Handle Host header
  if (!proxy.preserveHost) {
    headers.set('Host', destinationUrl.host);
  }

  // Add custom headers from config
  if (proxy.headers) {
    for (const [key, value] of Object.entries(proxy.headers)) {
      headers.set(key, value);
    }
  }

  // Handle WebSocket upgrade
  if (proxy.websocket && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    // For WebSocket, we need to preserve the upgrade headers
    headers.set('Connection', 'Upgrade');
    headers.set('Upgrade', 'websocket');
  }

  try {
    // Create the proxied request
    const proxyInit: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual', // Don't follow redirects automatically
    };

    // Add body for methods that support it
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      proxyInit.body = request.body;
    }

    // Add timeout signal if configured
    if (proxy.timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), proxy.timeout);
      proxyInit.signal = controller.signal;

      try {
        const response = await fetch(targetUrl.toString(), proxyInit);
        clearTimeout(timeoutId);
        return createProxyResponse(response);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return new Response('Gateway Timeout', { status: 504 });
        }
        throw error;
      }
    } else {
      const response = await fetch(targetUrl.toString(), proxyInit);
      return createProxyResponse(response);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Bad Gateway', { status: 502 });
  }
}

function createProxyResponse(upstreamResponse: Response): Response {
  // Clone headers from upstream response
  const headers = new Headers(upstreamResponse.headers);

  // Remove hop-by-hop headers that shouldn't be forwarded
  const hopByHopHeaders = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
  ];

  for (const header of hopByHopHeaders) {
    headers.delete(header);
  }

  // Stream the response body
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
