// The web preview keeps payment recovery for this browser tab only.
export async function getGivingRecovery() {
  return sessionStorage.getItem('bhope-giving-recovery');
}
export async function setGivingRecovery(value: string) {
  sessionStorage.setItem('bhope-giving-recovery', value);
}
export async function clearGivingRecovery() {
  sessionStorage.removeItem('bhope-giving-recovery');
}
