import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useApp } from '../lib/context';
import { bible } from '../lib/storage';
export const colors = {
  background: '#F7F7F0',
  paper: '#FFFFFF',
  ink: '#193B32',
  muted: '#748077',
  line: '#E4E8DD',
  green: '#315F49',
  soft: '#E9EEDF',
  gold: '#CFAD63',
  peach: '#F4E9D7',
  danger: '#AE4940',
};
export const fonts = {
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  serif: 'Lora_400Regular',
  italic: 'Lora_400Regular_Italic',
};
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: ComponentProps<typeof Ionicons>['color'];
}) {
  return <Ionicons name={name} size={size} color={color} accessible={false} aria-hidden />;
}
export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function Label({ children, color }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.label, color ? { color } : undefined]}>{children}</Text>;
}
export function Title({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<import('react-native').TextStyle>;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: colors.muted }]}>{children}</Text>;
}
export function Button({
  children,
  onPress,
  icon,
  secondary,
  disabled,
  busy,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : '#fff'} />
      ) : icon ? (
        <Icon name={icon} color={secondary ? colors.ink : '#fff'} size={19} />
      ) : null}
      <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>{children}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function LanguageSwitch() {
  const { language, setLanguage } = useApp();
  return (
    <View style={styles.language}>
      {(['en', 'sw'] as const)
        .filter((value) => bible.versions.some((version) => version.id === value))
        .map((value) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={value === 'en' ? 'Switch to English' : 'Switch to Swahili'}
            accessibilityState={{ selected: language === value }}
            key={value}
            onPress={() => setLanguage(value)}
            style={[styles.languageButton, language === value && styles.languageActive]}
          >
            <Text style={[styles.languageText, language === value && { color: '#fff' }]}>
              {value.toUpperCase()}
            </Text>
          </Pressable>
        ))}
    </View>
  );
}
export function Input(props: TextInputProps) {
  return (
    <TextInput placeholderTextColor="#8B938A" {...props} style={[styles.input, props.style]} />
  );
}
export function Empty({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Body muted>{children}</Body>
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.row}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <IconButton name="close" onPress={onClose} label="Close" />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16, gap: 16 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 36, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.1 },
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 43, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 23, color: colors.ink },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.ink,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: colors.soft },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: '#fff' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  language: { backgroundColor: '#E8ECDD', padding: 4, borderRadius: 24, flexDirection: 'row' },
  languageButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  languageActive: { backgroundColor: colors.ink },
  languageText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  input: {
    minHeight: 50,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 15,
  },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.soft,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  overlay: {
    flex: 1,
    backgroundColor: '#10291F66',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 18,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#CFD6C8',
    alignSelf: 'center',
  },
  sheetTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 23, flex: 1 },
  card: {
    padding: 22,
    backgroundColor: colors.paper,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: colors.danger },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.soft,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
});
