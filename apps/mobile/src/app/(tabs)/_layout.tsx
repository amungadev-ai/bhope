import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, colors, fonts } from '../../components/ui';
import { useApp } from '../../lib/context';
export default function TabLayout() {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#8A9589',
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, marginTop: 0 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.line,
          height: 80 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 9,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: language === 'sw' ? 'Leo' : 'Today',
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? 'sunny' : 'sunny-outline'}
              color={typeof color === 'string' ? color : colors.ink}
              size={23}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: language === 'sw' ? 'Biblia' : 'Bible',
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? 'book' : 'book-outline'}
              color={typeof color === 'string' ? color : colors.ink}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: language === 'sw' ? 'Daftari' : 'Notebook',
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? 'journal' : 'journal-outline'}
              color={typeof color === 'string' ? color : colors.ink}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: language === 'sw' ? 'Zaidi' : 'More',
          tabBarIcon: ({ color }) => (
            <Icon
              name="grid-outline"
              color={typeof color === 'string' ? color : colors.ink}
              size={21}
            />
          ),
        }}
      />
    </Tabs>
  );
}
