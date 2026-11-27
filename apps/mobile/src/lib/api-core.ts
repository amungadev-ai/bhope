export const defaultApiUrl = 'https://api.billucsolutions.co.ke/api/v1';

export function normalizeApiUrl(value?: string): string {
  const url = new URL(value?.trim() || defaultApiUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Use an HTTP or HTTPS API address without credentials, a query or a fragment.');
  const path = url.pathname.replace(/\/+$/, '');
  if (!['', '/api', '/api/v1'].includes(path))
    throw new Error('Use the API origin or its /api/v1 address.');
  url.pathname = '/api/v1';
  return url.toString().replace(/\/$/, '');
}

export function createApiClient(
  baseUrl: string,
  readToken: () => Promise<string | null>,
  fetchRequest: typeof fetch = fetch,
) {
  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!/^\/[A-Za-z0-9/_-]+(?:\?[^#]*)?$/.test(path))
      throw new Error('This API request path is invalid.');
    const token = await readToken();
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
    let response: Response;
    let raw: string;
    try {
      response = await fetchRequest(baseUrl + path, {
        ...options,
        credentials: 'omit',
        redirect: 'error',
        signal: options.signal ?? AbortSignal.timeout(35000),
        headers,
      });
      if (response.status === 204) return undefined as T;
      raw = await response.text();
    } catch {
      throw new Error('Could not reach Beacon of Hope. Check your connection and API address.');
    }
    if (/^\s*</.test(raw))
      throw new Error(
        'The API returned a web page instead of data (HTTP ' +
          response.status +
          '). Check the API connection.',
      );
    let result: unknown;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error('The API returned unreadable data (HTTP ' + response.status + ').');
    }
    if (!response.ok) {
      const failure = result as { error?: unknown; code?: unknown };
      const message =
        typeof failure?.error === 'string'
          ? failure.error.slice(0, 1000)
          : 'The request could not be completed.';
      const code =
        typeof failure?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(failure.code)
          ? failure.code
          : '';
      throw new Error(message + (code ? ' [' + code + ']' : ''));
    }
    return result as T;
  };
}
