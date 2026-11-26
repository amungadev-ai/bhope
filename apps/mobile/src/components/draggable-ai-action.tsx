import { useRef, useState } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import { Icon, useUi } from './ui';
const size = 46;
const inset = 8;
// Keep a generous touch area around the smaller visible bubble.
const touchPadding = 4;
type Anchor = { x: number; y: number };
type Bounds = { width: number; height: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function DraggableAiAction({
  bounds,
  onPress,
  onDraggingChange,
}: {
  bounds: Bounds;
  onPress: () => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { colors } = useUi();
  const [anchor, setAnchor] = useState<Anchor>({ x: 1, y: 1 });
  const [dragging, setDragging] = useState(false);
  const touch = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const dragged = useRef(false);
  function stop() {
    touch.current = null;
    setDragging(false);
    onDraggingChange(false);
  }
  function move(event: GestureResponderEvent) {
    const start = touch.current;
    if (!start) return;
    const availableX = Math.max(0, bounds.width - size - inset * 2),
      availableY = Math.max(0, bounds.height - size - inset * 2);
    setAnchor({
      x: availableX ? clamp((start.originX + event.nativeEvent.pageX - start.x) / availableX) : 0,
      y: availableY ? clamp((start.originY + event.nativeEvent.pageY - start.y) / availableY) : 0,
    });
  }
  if (bounds.width < size + inset * 2 || bounds.height < size + inset * 2) return null;
  return (
    <View
      onStartShouldSetResponderCapture={(event) => {
        touch.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
          originX: anchor.x * Math.max(0, bounds.width - size - inset * 2),
          originY: anchor.y * Math.max(0, bounds.height - size - inset * 2),
        };
        dragged.current = false;
        return false;
      }}
      onMoveShouldSetResponderCapture={(event) =>
        Boolean(
          touch.current &&
          Math.hypot(
            event.nativeEvent.pageX - touch.current.x,
            event.nativeEvent.pageY - touch.current.y,
          ) > 6,
        )
      }
      onResponderGrant={() => {
        dragged.current = true;
        setDragging(true);
        onDraggingChange(true);
      }}
      onResponderMove={move}
      onResponderRelease={stop}
      onResponderTerminate={stop}
      onResponderTerminationRequest={() => false}
      testID="draggable-ai-action"
      style={{
        position: 'absolute',
        left: inset - touchPadding + anchor.x * (bounds.width - size - inset * 2),
        top: inset - touchPadding + anchor.y * (bounds.height - size - inset * 2),
        width: size + touchPadding * 2,
        height: size + touchPadding * 2,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
      }}
    >
      <Pressable
        accessibilityRole="button"
        hitSlop={touchPadding}
        accessibilityLabel="Reflection tools"
        accessibilityHint="Tap for AI reflection tools. Drag to move within your note."
        accessibilityActions={[{ name: 'resetPosition', label: 'Move to bottom right' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'resetPosition') setAnchor({ x: 1, y: 1 });
        }}
        onPressIn={() => {
          dragged.current = false;
        }}
        onPress={() => {
          if (!dragged.current) onPress();
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.ink,
          opacity: dragging ? 0.8 : 1,
          elevation: 4,
          boxShadow: '0 3px 10px #00000020',
        }}
      >
        <Icon name="sparkles-outline" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}
