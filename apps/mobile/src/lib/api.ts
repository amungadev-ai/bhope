import { getToken } from './session';
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl)
    throw new Error(
      'This service is not available yet. Your Bible and notebook still work offline.',
    );
  const token = await getToken();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(35000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Could not reach Beacon of Hope. Check your connection and API address.');
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result as T;
}
