// Cross-origin deployments (Vercel) bake the API origin in at build time
// with NEXT_PUBLIC_API_URL; same-origin deployments keep the relative /api path.
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'This request could not be completed.');
  return result;
}
