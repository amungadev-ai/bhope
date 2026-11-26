import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora/400Regular_Italic';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../lib/context';
import { Body, Button, colors, fonts } from '../components/ui';
function Navigation() {
  const { ready, error, retry } = useApp();
  if (error || !ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 20,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontFamily: fonts.serif, fontSize: 32, color: colors.ink }}>
          Beacon of Hope
        </Text>
        {error ? (
          <>
            <Body>{error}</Body>
            <Button onPress={retry}>Try again</Button>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.ink} />
            <Body muted>Preparing your offline library…</Body>
          </>
        )}
      </View>
    );
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="note/[id]" />
      <Stack.Screen name="devotional/[id]" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: '#E5E9DE', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 560 }}>
          <AppProvider>
            <Navigation />
          </AppProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
