import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, Icon, useUi, type IconName } from './ui';
import type { EditorCommand } from './rich-editor-types';
const tools: { command: EditorCommand; label: string; text?: string; icon?: IconName }[] = [
  { command: 'bold', label: 'Bold', text: 'B' },
  { command: 'italic', label: 'Italic', text: 'I' },
  { command: 'underline', label: 'Underline', text: 'U' },
  { command: 'heading', label: 'Heading', text: 'H2' },
  { command: 'unordered', label: 'Bullet list', icon: 'list-outline' },
  { command: 'checkbox', label: 'Checklist', icon: 'checkbox-outline' },
  { command: 'paragraph', label: 'Paragraph', text: '¶' },
  { command: 'ordered', label: 'Numbered list', text: '1.' },
  { command: 'undo', label: 'Undo', icon: 'arrow-undo-outline' },
  { command: 'redo', label: 'Redo', icon: 'arrow-redo-outline' },
];
export function EditorToolbar({ onCommand }: { onCommand: (command: EditorCommand) => void }) {
  const { colors } = useUi();
  const [expanded, setExpanded] = useState(false);
  const toolButton = (tool: (typeof tools)[number]) => (
    <Pressable
      key={tool.command}
      accessibilityRole="button"
      accessibilityLabel={tool.label}
      onPress={() => onCommand(tool.command)}
      style={{
        flex: 1,
        minWidth: 36,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
      }}
    >
      {tool.icon ? (
        <Icon name={tool.icon} size={20} />
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
  );
  return (
    <View
      accessibilityLabel="Note formatting toolbar"
      style={{ backgroundColor: colors.soft, borderRadius: 14, padding: 4 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {tools.slice(0, 6).map(toolButton)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Fewer formatting tools' : 'More formatting tools'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={{
            minWidth: 36,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftWidth: 1,
            borderLeftColor: colors.line,
          }}
        >
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>
      </View>
      {expanded ? (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line }}>
          {tools.slice(6).map(toolButton)}
        </View>
      ) : null}
    </View>
  );
}
