import { useUi } from './ui';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createEditorDocument } from '../lib/editor-document';
import type { RichEditorHandle, RichEditorProps } from './rich-editor-types';
export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  function RichEditor(props, ref) {
    const { colors } = useUi();
    const frame = useRef<HTMLIFrameElement>(null);
    const ready = useRef(false);
    const pending = useRef<object[]>([]);
    const latest = useRef(props);
    latest.current = props;
    const [document] = useState(() =>
      createEditorDocument({
        html: props.initialHtml,
        text: props.initialText,
        placeholder: props.placeholder,
        colors,
      }),
    );
    function run(message: object) {
      if (ready.current)
        frame.current?.contentWindow?.postMessage({ beaconCommand: true, ...message }, '*');
      else pending.current.push(message);
    }
    useImperativeHandle(ref, () => ({
      command: (command) => run({ command }),
      appendText: (text) => run({ command: 'append', text }),
    }));
    useEffect(() => {
      function receive(event: MessageEvent) {
        if (event.source !== frame.current?.contentWindow || !event.data?.beaconEditor) return;
        const message = event.data.payload;
        if (message.type === 'ready') {
          ready.current = true;
          for (const item of pending.current.splice(0))
            frame.current?.contentWindow?.postMessage({ beaconCommand: true, ...item }, '*');
        } else if (
          message.type === 'change' &&
          typeof message.html === 'string' &&
          typeof message.text === 'string'
        )
          latest.current.onChange(message.html.slice(0, 300000), message.text.slice(0, 100000));
        else if (message.type === 'selection')
          latest.current.onSelection(String(message.text ?? ''));
        else if (message.type === 'reference' && message.reference?.bookId)
          latest.current.onReference(
            message.reference,
            message.intent === 'actions' ? 'actions' : 'preview',
          );
      }
      window.addEventListener('message', receive);
      frame.current?.contentWindow?.postMessage({ beaconCommand: true, command: 'connect' }, '*');
      return () => window.removeEventListener('message', receive);
    }, []);
    useEffect(() => {
      if (ready.current)
        frame.current?.contentWindow?.postMessage(
          { beaconCommand: true, command: 'theme', colors },
          '*',
        );
    }, [colors]);
    return (
      <iframe
        ref={frame}
        onLoad={() =>
          frame.current?.contentWindow?.postMessage(
            { beaconCommand: true, command: 'connect' },
            '*',
          )
        }
        title="Rich note editor"
        srcDoc={document}
        sandbox="allow-scripts"
        style={{
          border: 0,
          width: '100%',
          height: '100%',
          minHeight: 120,
          flex: 1,
          background: colors.background,
        }}
      />
    );
  },
);
