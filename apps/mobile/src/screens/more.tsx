import { useEffect } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useApp } from '../lib/context';
import { openMore, type DrawerRoutes } from '../navigation/actions';
import { Body, Icon, Screen, fonts, useUi, type IconName } from '../components/ui';
export default function More() {
  const { colors, styles } = useUi();
  const { user, language } = useApp();
  const sw = language === 'sw';
  const navigation = useNavigation<DrawerNavigationProp<DrawerRoutes>>();
  const params = useRoute().params as DrawerRoutes['MoreHome'];
  useEffect(() => {
    if (params?.openDrawer) {
      navigation.dispatch(DrawerActions.openDrawer());
      navigation.setParams({ openDrawer: undefined });
    }
  }, [params?.openDrawer, navigation]);
  const links: { route: keyof DrawerRoutes; label: string; detail: string; icon: IconName }[] = [
    {
      route: 'Account',
      label: user
        ? sw
          ? 'Akaunti yangu'
          : 'My account'
        : sw
          ? 'Ingia / Jisajili'
          : 'Sign in / Create account',
      detail: user?.email || (sw ? 'Akaunti ni ya hiari' : 'An account is optional'),
      icon: 'person-outline',
    },
    {
      route: 'Settings',
      label: sw ? 'Mapendeleo' : 'Preferences',
      detail: sw
        ? 'Lugha, mwonekano na ukubwa wa maandishi'
        : 'App language, themes, and reading size',
      icon: 'options-outline',
    },
    {
      route: 'SavedVerses',
      label: sw ? 'Mistari iliyohifadhiwa' : 'Saved verses',
      detail: sw ? 'Maneno ya kukubeba' : 'Words to come back to',
      icon: 'bookmark-outline',
    },
    {
      route: 'AiPlan',
      label: sw ? 'Msaada wa kutafakari' : 'AI access & plan',
      detail: sw ? 'Matumizi 5 bure · kisha KES 150/mwezi' : '5 free uses · then KES 150/month',
      icon: 'sparkles-outline',
    },
    {
      route: 'Giving',
      label: sw ? 'Saidia huduma' : 'Give a little hope',
      detail: sw ? 'Zawadi yako ni ya hiari' : 'An optional gift to the ministry',
      icon: 'heart-outline',
    },
    {
      route: 'DonationHistory',
      label: sw ? 'Historia ya kutoa' : 'Donation history',
      detail: sw ? 'Zawadi zilizounganishwa na akaunti' : 'Gifts linked to your account',
      icon: 'receipt-outline',
    },
    {
      route: 'About',
      label: sw ? 'Kuhusu huduma' : 'About & transparency',
      detail: sw ? 'Imani, faragha na malengo yetu' : 'Our purpose, privacy, and funding',
      icon: 'leaf-outline',
    },
  ];
  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: fonts.serif, color: colors.ink, fontSize: 25 }}>
          {sw ? 'Nafasi yako, kwa njia yako.' : 'Your space, your way.'}
        </Text>
        <Body muted>
          {sw ? 'Yote yanayosaidia safari yako.' : 'A few things to support your journey.'}
        </Body>
      </View>
      <View style={{ gap: 2 }}>
        {links.map((item) => (
          <Pressable
            key={item.route}
            accessibilityRole="button"
            onPress={() => openMore(item.route)}
            style={[
              styles.row,
              { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
            ]}
          >
            <Icon name={item.icon} color={colors.green} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}>
                {item.label}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
                {item.detail}
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} />
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Linking.openURL('https://www.tiktok.com/@auramultipurposesoap').catch(
            () => undefined,
          );
        }}
        style={styles.row}
      >
        <Icon name="logo-tiktok" />
        <Body>{sw ? 'Tembelea TikTok yetu' : 'Visit our TikTok'}</Body>
        <Icon name="open-outline" size={17} />
      </Pressable>
    </Screen>
  );
}
