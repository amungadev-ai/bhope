import { useUi } from './ui';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { createEditorDocument } from '../lib/editor-document';
import type { RichEditorHandle, RichEditorProps } from './rich-editor-types';
export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  function RichEditor(props, ref) {
    const { colors } = useUi();
    const webview = useRef<WebView<object>>(null);
    const ready = useRef(false);
    const pending = useRef<string[]>([]);
    const [document] = useState(() =>
      createEditorDocument({
        html: props.initialHtml,
        text: props.initialText,
        placeholder: props.placeholder,
        colors,
      }),
    );
    function run(code: string) {
      if (ready.current) webview.current?.injectJavaScript(code);
      else pending.current.push(code);
    }
    useImperativeHandle(ref, () => ({
      command: (command) => run(`window.BeaconEditor.command(${JSON.stringify(command)});true;`),
      appendText: (text) => run(`window.BeaconEditor.appendText(${JSON.stringify(text)});true;`),
    }));
    useEffect(() => {
      if (ready.current)
        webview.current?.injectJavaScript(
          `window.BeaconEditor.setTheme(${JSON.stringify(colors)});true;`,
        );
    }, [colors]);
    return (
      <WebView<object>
        ref={webview}
        source={{ html: document }}
        originWhitelist={['about:blank']}
        style={{ flex: 1, minHeight: 120, backgroundColor: colors.background }}
        scrollEnabled
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        javaScriptEnabled
        allowsLinkPreview={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' || request.url.startsWith('data:text/html')
        }
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'ready') {
              ready.current = true;
              webview.current?.injectJavaScript(
                `window.BeaconEditor.setTheme(${JSON.stringify(colors)});true;`,
              );
              for (const code of pending.current.splice(0)) webview.current?.injectJavaScript(code);
            } else if (
              message.type === 'change' &&
              typeof message.html === 'string' &&
              typeof message.text === 'string'
            )
              props.onChange(message.html.slice(0, 300000), message.text.slice(0, 100000));
            else if (message.type === 'selection') props.onSelection(String(message.text ?? ''));
            else if (message.type === 'reference' && message.reference?.bookId)
              props.onReference(
                message.reference,
                message.intent === 'actions' ? 'actions' : 'preview',
              );
          } catch {
            /* malformed bridge messages are ignored */
          }
        }}
      />
    );
  },
);
