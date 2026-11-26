import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, apiUrl } from '../lib/api';
import { clearToken, setToken } from '../lib/session';
import {
  Body,
  Button,
  colors,
  IconButton,
  Input,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (apiUrl)
      void api<User>('/auth/me')
        .then((result) => {
          if (active) setUser(result);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: User; token: string }>(
        register ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
            ...(register ? { name: name.trim() } : {}),
          }),
        },
      );
      await setToken(result.token);
      setUser(result.user);
      setPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      await clearToken();
      setUser(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View style={styles.row}>
        <IconButton name="arrow-back" label="Back" onPress={() => router.back()} />
        <Label>BEACON OF HOPE</Label>
        <View style={{ width: 44 }} />
      </View>
      <Title>
        {user
          ? `Welcome, ${user.name.split(' ')[0]}.`
          : register
            ? 'A place to belong.'
            : 'Welcome back.'}
      </Title>
      <Body muted>
        {user
          ? 'Your account connects you to AI assistance. Your notebook is saved locally on this device.'
          : 'Your Bible and notebook are always available without an account. Sign in when you want AI assistance.'}
      </Body>
      {user ? (
        <View style={styles.card}>
          <Label>YOUR ACCOUNT</Label>
          <Body>{user.email}</Body>
          <Button secondary busy={busy} onPress={() => void logout()}>
            Sign out
          </Button>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {register ? (
            <Input
              accessibilityLabel="Your name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          ) : null}
          <Input
            accessibilityLabel="Email address"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            accessibilityLabel="Password"
            placeholder={register ? 'Password · at least 10 characters' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={register ? 'new-password' : 'current-password'}
          />
          <Button busy={busy} disabled={!apiUrl} onPress={() => void submit()}>
            {register ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            secondary
            onPress={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'I already have an account' : 'Create a free account'}
          </Button>
          {!apiUrl ? (
            <View style={[styles.card, { backgroundColor: colors.soft }]}>
              <Body>
                This preview is running offline. Account services will be available once the Beacon
                of Hope API is connected.
              </Body>
            </View>
          ) : null}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}
