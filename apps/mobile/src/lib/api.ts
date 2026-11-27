import { getToken } from './session';
import { createApiClient, normalizeApiUrl } from './api-core';

let configurationError = '';
let configuredUrl = '';
try {
  configuredUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
} catch {
  configurationError =
    'The API address is invalid. Check EXPO_PUBLIC_API_URL; your Bible and notebook remain available offline.';
}
export const apiUrl = configuredUrl;
const request = createApiClient(apiUrl, getToken);

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (configurationError) throw new Error(configurationError);
  return request<T>(path, options);
}
