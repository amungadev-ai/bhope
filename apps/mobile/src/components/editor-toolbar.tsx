import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type GestureResponderEvent } from 'react-native';
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
type Position = { x: number; y: number };
const inset = 6;
const width = 60;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function EditorToolbar({
  onCommand,
  bounds,
  position,
  onPositionChange,
  onDraggingChange,
}: {
  onCommand: (command: EditorCommand) => void;
  bounds: { width: number; height: number };
  position: Position;
  onPositionChange: (position: Position) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { colors } = useUi();
  const [dragging, setDragging] = useState(false);
  const touch = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const height = Math.min(480, Math.max(0, bounds.height - inset * 2));
  const availableX = Math.max(0, bounds.width - width - inset * 2);
  const availableY = Math.max(0, bounds.height - height - inset * 2);
  function move(event: GestureResponderEvent) {
    const start = touch.current;
    if (!start) return;
    onPositionChange({
      x: availableX ? clamp((start.originX + event.nativeEvent.pageX - start.x) / availableX) : 0,
      y: availableY ? clamp((start.originY + event.nativeEvent.pageY - start.y) / availableY) : 0,
    });
  }
  function stop() {
    touch.current = null;
    setDragging(false);
    onDraggingChange(false);
  }
  if (height < 60 || bounds.width < width + inset * 2) return null;
  return (
    <View
      nativeID="note-formatting-sidebar"
      testID="formatting-sidebar"
      style={{
        width,
        height,
        position: 'absolute',
        left: inset + position.x * availableX,
        top: inset + position.y * availableY,
        zIndex: 4,
        elevation: 6,
        opacity: dragging ? 0.85 : 1,
        borderRadius: 14,
        backgroundColor: colors.soft,
        boxShadow: '2px 3px 12px #00000018',
        overflow: 'hidden',
      }}
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Move formatting sidebar"
        accessibilityHint="Drag this handle to move the sidebar within your note."
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(position.y * 100),
          text: `${Math.round(position.x * 100)}% from left, ${Math.round(position.y * 100)}% from top`,
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Move down' },
          { name: 'decrement', label: 'Move up' },
          { name: 'moveLeft', label: 'Move left' },
          { name: 'moveRight', label: 'Move right' },
          { name: 'resetPosition', label: 'Move to top left' },
        ]}
        onAccessibilityAction={({ nativeEvent: { actionName } }) => {
          if (actionName === 'resetPosition') onPositionChange({ x: 0, y: 0 });
          else
            onPositionChange({
              x: clamp(
                position.x +
                  (actionName === 'moveRight' ? 0.1 : actionName === 'moveLeft' ? -0.1 : 0),
              ),
              y: clamp(
                position.y +
                  (actionName === 'increment' ? 0.1 : actionName === 'decrement' ? -0.1 : 0),
              ),
            });
        }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          touch.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
            originX: position.x * availableX,
            originY: position.y * availableY,
          };
          setDragging(true);
          onDraggingChange(true);
        }}
        onResponderMove={move}
        onResponderRelease={stop}
        onResponderTerminate={stop}
        onResponderTerminationRequest={() => false}
        testID="formatting-sidebar-handle"
        style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="reorder-two-outline" size={20} color={colors.muted} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
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
