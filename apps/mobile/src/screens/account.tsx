import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../lib/api';
import { clearToken, setToken } from '../lib/session';
import { Body, Button, Icon, Input, Label, Screen, Title, useUi } from '../components/ui';
import { useApp } from '../lib/context';
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
export default function AccountScreen() {
  const { colors, styles } = useUi();
  const { refreshUser } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
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
      await refreshUser();
      setUser(result.user);
      setPassword('');
      setPasswordVisible(false);
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
      await refreshUser();
      setUser(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
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
          <View style={{ justifyContent: 'center' }}>
            <Input
              accessibilityLabel="Password"
              placeholder={register ? 'Password · at least 10 characters' : 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete={register ? 'new-password' : 'current-password'}
              style={{ paddingRight: 60 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={({ pressed }) => ({
                position: 'absolute',
                right: 6,
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                color={colors.muted}
              />
            </Pressable>
          </View>
          <Button busy={busy} onPress={() => void submit()}>
            {register ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            secondary
            disabled={busy}
            onPress={() => {
              setRegister(!register);
              setPasswordVisible(false);
              setError('');
            }}
          >
            {register ? 'I already have an account' : 'Create a free account'}
          </Button>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}
