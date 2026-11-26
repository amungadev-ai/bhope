import { Text, View } from 'react-native';
import { useApp } from '../lib/context';
import { openDrawer } from '../navigation/actions';
import {
  Body,
  colors,
  fonts,
  IconButton,
  Label,
  LanguageSwitch,
  Screen,
  styles,
  Title,
} from '../components/ui';
export default function Settings() {
  const { language, fontSize, setFontSize } = useApp();
  const sw = language === 'sw';
  return (
    <Screen>
      <IconButton name="menu-outline" label="Open menu" onPress={openDrawer} />
      <View style={{ gap: 8 }}>
        <Label>{sw ? 'FANYA NAFASI HII IWE YAKO' : 'MAKE THIS SPACE YOUR OWN'}</Label>
        <Title>{sw ? 'Njia yako ya kusoma.' : 'Your reading rhythm.'}</Title>
        <Body muted>
          {sw
            ? 'Mapendeleo madogo kwa wakati wenye utulivu.'
            : 'A few small preferences for a quieter moment.'}
        </Body>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Body>{sw ? 'Lugha ya kusoma' : 'Reading language'}</Body>
          <LanguageSwitch />
        </View>
        <View style={styles.row}>
          <Body>{sw ? 'Ukubwa wa maandishi' : 'Bible text size'}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconButton
              name="remove"
              label="Smaller text"
              onPress={() => setFontSize(fontSize - 2)}
            />
            <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>Aa</Text>
            <IconButton name="add" label="Larger text" onPress={() => setFontSize(fontSize + 2)} />
          </View>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.soft }]}>
        <Label>{sw ? 'HAJA YA KUSOMA' : 'A LITTLE PREVIEW'}</Label>
        <Text
          style={{
            fontFamily: fonts.serif,
            color: colors.ink,
            fontSize,
            lineHeight: fontSize * 1.7,
          }}
        >
          {sw
            ? 'Neno lako ni taa ya miguu yangu, na mwanga wa njia yangu.'
            : 'Thy word is a lamp unto my feet, and a light unto my path.'}
        </Text>
        <Body muted>
          {sw
            ? 'Zaburi 119:105 · mfano wa ukubwa wa maandishi'
            : 'Psalm 119:105 · text size preview'}
        </Body>
      </View>
      <Body muted>
        {sw
          ? 'Mapendeleo yako yanahifadhiwa kwenye kifaa hiki.'
          : 'Your preferences are saved on this device.'}
      </Body>
    </Screen>
  );
}
