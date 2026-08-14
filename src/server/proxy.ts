import { EnvHttpProxyAgent, fetch as undiciFetch } from 'undici';

let installed = false;

export function installProxyAwareFetch(): void {
  if (installed) return;
  installed = true;

  if (!process.env.HTTP_PROXY && !process.env.HTTPS_PROXY && !process.env.ALL_PROXY) {
    return;
  }

  const dispatcher = new EnvHttpProxyAgent({ keepAliveTimeout: 10_000 });
  globalThis.fetch = ((input: any, init?: any) =>
    undiciFetch(input, { ...(init || {}), dispatcher } as any)) as typeof fetch;

  console.log('[Proxy] HTTP(S) traffic routed via EnvHttpProxyAgent (HTTP_PROXY honored, NO_PROXY respected).');
}
