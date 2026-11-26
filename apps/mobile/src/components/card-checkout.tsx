import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiUrl } from '../lib/api';
export function CardCheckout({
  url,
  onFinished,
  onError,
}: {
  url: string;
  onFinished: () => void;
  onError: () => void;
}) {
  const [popup, setPopup] = useState('');
  function allow(address: string) {
    try {
      const parsed = new URL(address);
      const callback = new URL(`${apiUrl}/payments/paystack/return`);
      if (parsed.origin === callback.origin && parsed.pathname === callback.pathname) {
        onFinished();
        return false;
      }
      if (parsed.origin === 'https://standard.paystack.co' && parsed.pathname === '/close') {
        setPopup('');
        return false;
      }
      return parsed.protocol === 'https:' || address === 'about:blank';
    } catch {
      return false;
    }
  }
  const common = {
    javaScriptEnabled: true,
    sharedCookiesEnabled: true,
    thirdPartyCookiesEnabled: true,
    onError,
    onShouldStartLoadWithRequest: (request: { url: string }) => allow(request.url),
    onOpenWindow: (event: { nativeEvent: { targetUrl: string } }) => {
      if (allow(event.nativeEvent.targetUrl)) setPopup(event.nativeEvent.targetUrl);
    },
  };
  return (
    <View style={{ height: 500 }}>
      <WebView<object> {...common} source={{ uri: url }} style={{ flex: 1 }} />
      {popup ? (
        <WebView<object>
          {...common}
          source={{ uri: popup }}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
    </View>
  );
}
