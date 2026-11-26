// Browser preview tokens last only for this tab. Native tokens use SecureStore.
export async function getToken() {
  return sessionStorage.getItem('bhope-session');
}
export async function setToken(token: string) {
  sessionStorage.setItem('bhope-session', token);
}
export async function clearToken() {
  sessionStorage.removeItem('bhope-session');
}
