import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/context';
import { colors, fonts, Icon, type IconName } from '../components/ui';
import { navigationRef, type DrawerRoutes, type RootRoutes, type TabRoutes } from './actions';
import Today from '../screens/today';
import Bible from '../screens/bible';
import Notes from '../screens/notes';
import NoteEditor from '../screens/note-editor';
import Devotional from '../screens/devotional';
import Account from '../screens/account';
import Settings from '../screens/settings';
import Inspirations from '../screens/inspirations';
import { Giving, DonationHistory } from '../screens/giving';
import { About, SavedVerses } from '../screens/library';
const Stack = createNativeStackNavigator<RootRoutes>();
const Tabs = createBottomTabNavigator<TabRoutes>();
const Drawer = createDrawerNavigator<DrawerRoutes>();
function HomeTabs() {
  const { language } = useApp();
  const sw = language === 'sw';
  const insets = useSafeAreaInsets();
  const icons: Record<keyof TabRoutes, IconName> = {
    Today: 'sunny-outline',
    Bible: 'book-outline',
    Notebook: 'journal-outline',
    Inspirations: 'play-circle-outline',
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#8A9589',
        tabBarAccessibilityLabel: {
          Today: sw ? 'Leo' : 'Today',
          Bible: sw ? 'Biblia' : 'Bible',
          Notebook: sw ? 'Daftari' : 'Notebook',
          Inspirations: sw ? 'Msukumo' : 'Inspirations',
        }[route.name],
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, marginTop: 0 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.line,
          height: 78 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 9,
        },
        tabBarIcon: ({ color }) => (
          <Icon
            name={icons[route.name]}
            color={typeof color === 'string' ? color : colors.ink}
            size={23}
          />
        ),
      })}
    >
      <Tabs.Screen name="Today" component={Today} options={{ title: sw ? 'Leo' : 'Today' }} />
      <Tabs.Screen name="Bible" component={Bible} options={{ title: sw ? 'Biblia' : 'Bible' }} />
      <Tabs.Screen
        name="Notebook"
        component={Notes}
        options={{ title: sw ? 'Daftari' : 'Notebook' }}
      />
      <Tabs.Screen
        name="Inspirations"
        component={Inspirations}
        options={{ title: sw ? 'Msukumo' : 'Inspirations' }}
      />
    </Tabs.Navigator>
  );
}
function DrawerContent(props: DrawerContentComponentProps) {
  const { user, language } = useApp();
  const sw = language === 'sw';
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flexGrow: 1, paddingTop: 28, paddingHorizontal: 12 }}
    >
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
          <Icon name="sunny-outline" size={29} color={colors.green} />
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink }}>
            beacon of hope.
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.body, lineHeight: 21, fontSize: 12, color: colors.muted }}>
          {sw
            ? 'Nafasi yako ya kusoma, kutafakari na kukua.'
            : 'A little space to read, reflect, and grow.'}
        </Text>
      </View>
      <DrawerItemList {...props} />
      <View
        style={{ borderTopWidth: 1, borderTopColor: colors.line, marginTop: 20, paddingTop: 12 }}
      >
        <DrawerItem
          label={sw ? 'Tembelea TikTok' : 'Visit our TikTok'}
          icon={({ color, size }) => (
            <Icon
              name="logo-tiktok"
              color={typeof color === 'string' ? color : colors.ink}
              size={size}
            />
          )}
          labelStyle={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}
          onPress={() => {
            void Linking.openURL('https://www.tiktok.com/@auramultipurposesoap').catch(
              () => undefined,
            );
          }}
        />
      </View>
      <View style={{ marginTop: 'auto', padding: 20, gap: 8 }}>
        <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>
          {user ? user.name : sw ? 'Karibu, msomaji' : 'Welcome, reader'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, lineHeight: 19, color: colors.muted }}>
          {user
            ? user.email
            : sw
              ? 'Kusoma na kuandika ni bure bila akaunti.'
              : 'Read and write freely. An account is optional.'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 9, color: '#97A087', marginTop: 10 }}>
          BEACON OF HOPE · 0.2.0
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}
function MainDrawer() {
  const { language, user } = useApp();
  const sw = language === 'sw';
  const icons: Record<keyof DrawerRoutes, IconName> = {
    HomeTabs: 'sunny-outline',
    Account: 'person-outline',
    SavedVerses: 'bookmark-outline',
    Giving: 'heart-outline',
    DonationHistory: 'receipt-outline',
    Settings: 'options-outline',
    About: 'leaf-outline',
  };
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { backgroundColor: colors.background, width: 292 },
        drawerActiveBackgroundColor: '#E6ECDC',
        drawerActiveTintColor: colors.ink,
        drawerInactiveTintColor: colors.muted,
        drawerLabelStyle: { fontFamily: fonts.medium, fontSize: 13 },
        drawerItemStyle: { borderRadius: 14, marginVertical: 3 },
        drawerIcon: ({ color, size }) => (
          <Icon
            name={icons[route.name]}
            color={typeof color === 'string' ? color : colors.ink}
            size={size}
          />
        ),
      })}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={HomeTabs}
        options={{ title: sw ? 'Nafasi yako ya leo' : 'Your daily space' }}
      />
      <Drawer.Screen
        name="Account"
        component={Account}
        options={{
          title: user
            ? sw
              ? 'Akaunti yangu'
              : 'My account'
            : sw
              ? 'Ingia / Jisajili'
              : 'Sign in / Create account',
        }}
      />
      <Drawer.Screen
        name="SavedVerses"
        component={SavedVerses}
        options={{ title: sw ? 'Mistari niliyohifadhi' : 'Saved verses' }}
      />
      <Drawer.Screen
        name="Giving"
        component={Giving}
        options={{ title: sw ? 'Saidia huduma' : 'Give a little hope' }}
      />
      <Drawer.Screen
        name="DonationHistory"
        component={DonationHistory}
        options={{ title: sw ? 'Historia ya kutoa' : 'Donation history' }}
      />
      <Drawer.Screen
        name="Settings"
        component={Settings}
        options={{ title: sw ? 'Mapendeleo' : 'Reading preferences' }}
      />
      <Drawer.Screen
        name="About"
        component={About}
        options={{ title: sw ? 'Kuhusu huduma' : 'About & transparency' }}
      />
    </Drawer.Navigator>
  );
}
export function AppNavigation() {
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.ink,
          background: colors.background,
          card: colors.background,
          text: colors.ink,
          border: colors.line,
        },
      }}
      linking={{
        prefixes: [ExpoLinking.createURL('/'), 'beaconofhope://'],
        config: {
          screens: {
            Main: {
              screens: {
                HomeTabs: {
                  screens: {
                    Today: '',
                    Bible: 'bible',
                    Notebook: 'notes',
                    Inspirations: 'inspirations',
                  },
                },
                Giving: 'give',
                DonationHistory: 'giving-history',
                Settings: 'settings',
                SavedVerses: 'saved',
                About: 'about',
                Account: 'profile',
              },
            },
            NoteEditor: 'note/:id',
            Devotional: 'devotional/:id',
            BibleReader: 'passage',
            Account: 'account',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Main" component={MainDrawer} />
        <Stack.Screen name="NoteEditor" component={NoteEditor} getId={({ params }) => params.id} />
        <Stack.Screen name="Devotional" component={Devotional} />
        <Stack.Screen name="BibleReader" component={Bible} />
        <Stack.Screen name="Account" component={Account} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
