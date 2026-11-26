import { Pressable, Text, View } from 'react-native';
import { fonts, Icon, useUi, type IconName } from './ui';
import type { EditorCommand } from './rich-editor-types';
const tools: { command: EditorCommand; label: string; text?: string; icon?: IconName }[] = [
  { command: 'bold', label: 'Bold', text: 'B' },
  { command: 'italic', label: 'Italic', text: 'I' },
  { command: 'underline', label: 'Underline', text: 'U' },
  { command: 'heading', label: 'Heading', text: 'H2' },
  { command: 'paragraph', label: 'Paragraph', text: '¶' },
  { command: 'checkbox', label: 'Checklist', icon: 'checkbox-outline' },
  { command: 'ordered', label: 'Numbered list', text: '1.' },
  { command: 'unordered', label: 'Bullet list', icon: 'list-outline' },
  { command: 'undo', label: 'Undo', icon: 'arrow-undo-outline' },
  { command: 'redo', label: 'Redo', icon: 'arrow-redo-outline' },
];
export function EditorToolbar({ onCommand }: { onCommand: (command: EditorCommand) => void }) {
  const { colors } = useUi();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tools.map((tool) => (
        <Pressable
          key={tool.command}
          accessibilityRole="button"
          accessibilityLabel={tool.label}
          onPress={() => onCommand(tool.command)}
          style={{
            width: '18%',
            minHeight: 62,
            borderRadius: 12,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
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
    </View>
  );
}
