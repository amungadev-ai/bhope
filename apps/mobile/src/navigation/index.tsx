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
import { fonts, Icon, IconButton, useUi, type IconName } from '../components/ui';
import {
  navigationRef,
  openDrawer,
  openMore,
  openNote,
  type DrawerRoutes,
  type RootRoutes,
  type TabRoutes,
} from './actions';
import Today from '../screens/today';
import Bible from '../screens/bible';
import Notes from '../screens/notes';
import NoteEditor from '../screens/note-editor';
import Devotional from '../screens/devotional';
import Account from '../screens/account';
import Settings from '../screens/settings';
import Inspirations from '../screens/inspirations';
import More from '../screens/more';
import AiPlan from '../screens/ai-plan';
import { Giving, DonationHistory } from '../screens/giving';
import { About, SavedVerses } from '../screens/library';
const Stack = createNativeStackNavigator<RootRoutes>();
const Tabs = createBottomTabNavigator<TabRoutes>();
const Drawer = createDrawerNavigator<DrawerRoutes>();
function HomeHeader() {
  const { colors } = useUi();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View
        style={{
          height: 54,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <IconButton name="menu-outline" label="Open More menu" onPress={openDrawer} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>
          beacon of hope<Text style={{ color: colors.gold }}>.</Text>
        </Text>
      </View>
    </View>
  );
}
function MainTabs() {
  const { language } = useApp();
  const { colors } = useUi();
  const sw = language === 'sw';
  const insets = useSafeAreaInsets();
  const labels = {
    Today: sw ? 'Leo' : 'Today',
    Bible: sw ? 'Biblia' : 'Bible',
    Notebook: sw ? 'Daftari' : 'Notebook',
    Inspirations: sw ? 'Msukumo' : 'Inspiration',
    More: sw ? 'Zaidi' : 'More',
  };
  const icons: Record<keyof TabRoutes, IconName> = {
    Today: 'sunny-outline',
    Bible: 'book-outline',
    Notebook: 'journal-outline',
    Inspirations: 'play-circle-outline',
    More: 'ellipsis-horizontal',
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 23 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarAccessibilityLabel: labels[route.name],
        title: labels[route.name],
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, marginTop: 0 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.line,
          height: 60 + insets.bottom,
          paddingTop: 7,
          paddingBottom: insets.bottom + 6,
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color }) => <Icon name={icons[route.name]} color={color} size={22} />,
      })}
    >
      <Tabs.Screen name="Today" component={Today} options={{ header: () => <HomeHeader /> }} />
      <Tabs.Screen name="Bible" component={Bible} options={{ headerShown: false }} />
      <Tabs.Screen
        name="Notebook"
        component={Notes}
        options={{
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <IconButton name="add" label="Create a note" onPress={() => void openNote()} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="Inspirations" component={Inspirations} />
      <Tabs.Screen
        name="More"
        component={MoreDrawer}
        options={{ headerShown: false }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            openMore('MoreHome');
          },
        }}
      />
    </Tabs.Navigator>
  );
}
function DrawerContent(props: DrawerContentComponentProps) {
  const { user, language } = useApp();
  const { colors } = useUi();
  const sw = language === 'sw';
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 12 }}
    >
      <View style={{ padding: 18, gap: 10 }}>
        <Icon name="sunny-outline" color={colors.green} size={28} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 24, color: colors.ink }}>
          beacon of hope.
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>
          {user?.name || (sw ? 'Karibu, msomaji' : 'Welcome, reader')}
        </Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label={sw ? 'Tembelea TikTok' : 'Visit our TikTok'}
        labelStyle={{ fontFamily: fonts.medium, color: colors.ink }}
        icon={({ size }) => <Icon name="logo-tiktok" size={size} />}
        onPress={() => {
          void Linking.openURL('https://www.tiktok.com/@auramultipurposesoap').catch(
            () => undefined,
          );
        }}
      />
      <Text style={{ padding: 20, fontFamily: fonts.body, color: colors.muted, fontSize: 11 }}>
        {sw ? 'Kusoma na kuandika ni bure.' : 'Read and write freely. An account is optional.'}
      </Text>
    </DrawerContentScrollView>
  );
}
function MoreDrawer() {
  const { language } = useApp();
  const { colors } = useUi();
  const sw = language === 'sw';
  const labels = {
    MoreHome: sw ? 'Zaidi' : 'More',
    Account: sw ? 'Akaunti' : 'My account',
    SavedVerses: sw ? 'Mistari iliyohifadhiwa' : 'Saved verses',
    AiPlan: sw ? 'Msaada wa kutafakari' : 'AI access & plan',
    Giving: sw ? 'Saidia huduma' : 'Give a little hope',
    DonationHistory: sw ? 'Historia ya kutoa' : 'Donation history',
    Settings: sw ? 'Mapendeleo' : 'Preferences',
    About: sw ? 'Kuhusu huduma' : 'About & transparency',
  };
  const icons: Record<keyof DrawerRoutes, IconName> = {
    MoreHome: 'grid-outline',
    Account: 'person-outline',
    SavedVerses: 'bookmark-outline',
    AiPlan: 'sparkles-outline',
    Giving: 'heart-outline',
    DonationHistory: 'receipt-outline',
    Settings: 'options-outline',
    About: 'leaf-outline',
  };
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ route, navigation }) => ({
        title: labels[route.name],
        drawerType: 'front',
        swipeEnabled: route.name === 'MoreHome',
        drawerStyle: { backgroundColor: colors.background, width: 294 },
        drawerActiveBackgroundColor: colors.soft,
        drawerActiveTintColor: colors.ink,
        drawerInactiveTintColor: colors.muted,
        drawerLabelStyle: { fontFamily: fonts.medium, fontSize: 13 },
        drawerItemStyle: { borderRadius: 14 },
        drawerIcon: ({ size }) => <Icon name={icons[route.name]} size={size} />,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.serif, fontSize: 22 },
        headerShadowVisible: false,
        headerLeft: () => (
          <View style={{ marginLeft: 14 }}>
            <IconButton
              name={route.name === 'MoreHome' ? 'menu-outline' : 'arrow-back'}
              label={route.name === 'MoreHome' ? 'Open More menu' : 'Back to More'}
              onPress={() =>
                route.name === 'MoreHome'
                  ? navigation.openDrawer()
                  : navigation.navigate('MoreHome')
              }
            />
          </View>
        ),
      })}
    >
      <Drawer.Screen name="MoreHome" component={More} />
      <Drawer.Screen name="Account" component={Account} />
      <Drawer.Screen name="SavedVerses" component={SavedVerses} />
      <Drawer.Screen name="AiPlan" component={AiPlan} />
      <Drawer.Screen name="Giving" component={Giving} />
      <Drawer.Screen name="DonationHistory" component={DonationHistory} />
      <Drawer.Screen name="Settings" component={Settings} />
      <Drawer.Screen name="About" component={About} />
    </Drawer.Navigator>
  );
}
export function AppNavigation() {
  const { colors } = useUi();
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
                Today: '',
                Bible: 'bible',
                Notebook: 'notes',
                Inspirations: 'inspirations',
                More: {
                  screens: {
                    MoreHome: 'more',
                    Giving: 'give',
                    DonationHistory: 'giving-history',
                    Settings: 'settings',
                    SavedVerses: 'saved',
                    About: 'about',
                    Account: 'profile',
                    AiPlan: 'ai-plan',
                  },
                },
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
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="NoteEditor" component={NoteEditor} getId={({ params }) => params.id} />
        <Stack.Screen name="Devotional" component={Devotional} />
        <Stack.Screen name="BibleReader" component={Bible} />
        <Stack.Screen
          name="AiPlan"
          component={AiPlan}
          options={{
            headerShown: true,
            title: 'AI access & plan',
            headerTintColor: colors.ink,
            headerStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="Account"
          component={Account}
          options={{
            headerShown: true,
            title: 'Account',
            headerTintColor: colors.ink,
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { fontFamily: fonts.serif },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
