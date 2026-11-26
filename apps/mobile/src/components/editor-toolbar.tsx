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
        width: 68,
        marginLeft: 10,
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: colors.soft,
        overflow: 'hidden',
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingVertical: 6, gap: 2 }}
      >
        {tools.map((tool) => (
          <Pressable
            key={tool.command}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
            onPress={() => onCommand(tool.command)}
            style={{
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingHorizontal: 3,
            }}
          >
            {tool.icon ? (
              <Icon name={tool.icon} size={20} />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 17,
                  color: colors.ink,
                  fontStyle: tool.command === 'italic' ? 'italic' : 'normal',
                  textDecorationLine: tool.command === 'underline' ? 'underline' : 'none',
                }}
              >
                {tool.text}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.body, fontSize: 9, color: colors.muted }}
            >
              {tool.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
