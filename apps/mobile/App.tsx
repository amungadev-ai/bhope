import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora/400Regular_Italic';
import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/lib/context';
import { AppNavigation } from './src/navigation';
import { Body, Button, colors, fonts } from './src/components/ui';
function Content() {
  const { ready, error, retry } = useApp();
  if (!ready || error)
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 20 }}
      >
        <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.ink }}>
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
  return <AppNavigation />;
}
export default function App() {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: '#E5E9DE', alignItems: 'center' }}>
          <View
            style={{ flex: 1, width: '100%', maxWidth: 600, backgroundColor: colors.background }}
          >
            <AppProvider>
              <Content />
            </AppProvider>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
