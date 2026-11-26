import * as SecureStore from 'expo-secure-store';
// Keep the retry identity and receipt token across app restarts, never payment credentials.
export const getGivingRecovery = () => SecureStore.getItemAsync('bhope-giving-recovery');
export const setGivingRecovery = (value: string) =>
  SecureStore.setItemAsync('bhope-giving-recovery', value);
export const clearGivingRecovery = () => SecureStore.deleteItemAsync('bhope-giving-recovery');
