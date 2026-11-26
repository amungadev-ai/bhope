import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, fonts, Icon, type IconName } from './ui';
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
export function EditorToolbar({
  onCommand,
  onReflect,
  onBible,
}: {
  onCommand: (command: EditorCommand) => void;
  onReflect: () => void;
  onBible: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: '#EBEEDF',
        padding: 6,
        gap: 4,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 2 }}
      >
        {tools.map((tool) => (
          <Pressable
            key={tool.command}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
            onPress={() => onCommand(tool.command)}
            style={{
              height: 40,
              minWidth: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
            }}
          >
            {tool.icon ? (
              <Icon name={tool.icon} size={19} />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 16,
                  color: colors.ink,
                  fontStyle: tool.command === 'italic' ? 'italic' : 'normal',
                  textDecorationLine: tool.command === 'underline' ? 'underline' : 'none',
                }}
              >
                {tool.text}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          borderLeftWidth: 1,
          borderLeftColor: '#D6DECA',
          paddingLeft: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Bible beside this note"
          onPress={onBible}
          style={{ height: 40, width: 42, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="book-outline" size={20} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reflection tools"
          onPress={onReflect}
          style={{ height: 40, width: 42, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="sparkles-outline" size={19} color={colors.green} />
        </Pressable>
      </View>
    </View>
  );
}
