import { Pressable, Text, View } from 'react-native';
import { useApp } from '../lib/context';
import { themes, type ThemeId } from '../lib/themes';
import {
  Body,
  Icon,
  IconButton,
  Label,
  LanguageSwitch,
  Screen,
  fonts,
  useUi,
} from '../components/ui';
export default function Settings() {
  const { colors, styles } = useUi();
  const { language, bibleLanguage, theme, setTheme, fontSize, setFontSize } = useApp();
  const sw = language === 'sw';
  return (
    <Screen>
      <View style={styles.card}>
        <View style={styles.row}>
          <Body>{sw ? 'Lugha ya programu' : 'App language'}</Body>
          <LanguageSwitch />
        </View>
        <Body muted>
          {sw
            ? 'Lugha ya menyu na tafakari. Lugha ya Biblia inachaguliwa ndani ya Biblia.'
            : 'Controls menus and devotionals. Choose your Bible language separately in the reader.'}
        </Body>
      </View>
      <View style={{ gap: 12 }}>
        <Label>{sw ? 'MWONEKANO' : 'COLOR THEME'}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(themes) as ThemeId[]).map((id) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={`Theme ${themes[id].name}`}
              accessibilityState={{ checked: theme === id }}
              aria-checked={theme === id}
              onPress={() => setTheme(id)}
              style={{
                width: '48%',
                borderWidth: 2,
                borderColor: theme === id ? colors.green : colors.line,
                backgroundColor: themes[id].colors.background,
                padding: 14,
                borderRadius: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 13,
                    backgroundColor: themes[id].colors.ink,
                  }}
                />
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 13,
                    backgroundColor: themes[id].colors.soft,
                  }}
                />
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 13,
                    backgroundColor: themes[id].colors.gold,
                  }}
                />
                {theme === id ? (
                  <Icon name="checkmark-circle" size={20} color={themes[id].colors.ink} />
                ) : null}
              </View>
              <Text style={{ fontFamily: fonts.medium, color: themes[id].colors.ink }}>
                {sw ? themes[id].nameSw : themes[id].name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Body>{sw ? 'Ukubwa wa maandishi' : 'Bible text size'}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconButton
              name="remove"
              label="Smaller text"
              onPress={() => setFontSize(fontSize - 2)}
            />
            <Text style={{ fontFamily: fonts.serif, color: colors.ink }}>Aa</Text>
            <IconButton name="add" label="Larger text" onPress={() => setFontSize(fontSize + 2)} />
          </View>
        </View>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize,
            lineHeight: fontSize * 1.6,
            color: colors.ink,
          }}
        >
          {bibleLanguage === 'sw'
            ? 'Neno lako ni taa ya miguu yangu, na mwanga wa njia yangu.'
            : 'Thy word is a lamp unto my feet, and a light unto my path.'}
        </Text>
      </View>
      <Body muted>
        {sw
          ? 'Mapendeleo yako yanahifadhiwa kwenye kifaa hiki.'
          : 'Preferences are saved on this device.'}
      </Body>
    </Screen>
  );
}
