import { Pressable, ScrollView, Text, View } from 'react-native';
import { fonts, Icon, useUi, type IconName } from './ui';
import type { EditorCommand } from './rich-editor-types';
const tools: { command: EditorCommand; label: string; text?: string; icon?: IconName }[] = [
  { command: 'bold', label: 'Bold', text: 'B' },
  { command: 'italic', label: 'Italic', text: 'I' },
  { command: 'underline', label: 'Underline', text: 'U' },
  { command: 'heading', label: 'Heading', text: 'H2' },
  { command: 'paragraph', label: 'Paragraph', text: '¶' },
  { command: 'unordered', label: 'Bullet list', icon: 'list-outline' },
  { command: 'ordered', label: 'Numbered list', text: '1.' },
  { command: 'checkbox', label: 'Checklist', icon: 'checkbox-outline' },
  { command: 'undo', label: 'Undo', icon: 'arrow-undo-outline' },
  { command: 'redo', label: 'Redo', icon: 'arrow-redo-outline' },
];
export function EditorToolbar({ onCommand }: { onCommand: (command: EditorCommand) => void }) {
  const { colors } = useUi();
  return (
    <View
      nativeID="note-formatting-sidebar"
      testID="formatting-sidebar"
      style={{
        width: 60,
        position: 'absolute',
        left: 6,
        top: 0,
        bottom: 6,
        maxHeight: 448,
        zIndex: 4,
        elevation: 6,
        borderRadius: 14,
        backgroundColor: colors.soft,
        boxShadow: '2px 3px 12px #00000018',
        overflow: 'hidden',
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingVertical: 4, gap: 0 }}
      >
        {tools.map((tool) => (
          <Pressable
            key={tool.command}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
            onPress={() => onCommand(tool.command)}
            style={{
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              paddingHorizontal: 2,
            }}
          >
            {tool.icon ? (
              <Icon name={tool.icon} size={20} />
            ) : (
              <Text
                style={{
                  fontFamily: tool.command === 'italic' ? fonts.italic : fonts.bold,
                  fontSize: 17,
                  width: 30,
                  height: 26,
                  lineHeight: 24,
                  paddingHorizontal: 4,
                  textAlign: 'center',
                  textAlignVertical: 'center',
                  includeFontPadding: true,
                  color: colors.ink,
                  fontStyle: 'normal',
                  textDecorationLine: tool.command === 'underline' ? 'underline' : 'none',
                }}
              >
                {tool.text}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.body, fontSize: 9, lineHeight: 11, color: colors.muted }}
            >
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
