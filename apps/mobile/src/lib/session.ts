import * as SecureStore from 'expo-secure-store';
export const getToken = () => SecureStore.getItemAsync('bhope-session');
export const setToken = (token: string) => SecureStore.setItemAsync('bhope-session', token);
export const clearToken = () => SecureStore.deleteItemAsync('bhope-session');
