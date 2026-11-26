import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getTikTokPlayerUrl } from '@bhope/shared';
import { colors } from './ui';
export function TikTokPlayer({ url, onError }: { url: string; onError: () => void }) {
  const player = getTikTokPlayerUrl(url);
  if (!player) return null;
  return (
    <View style={{ height: 450, borderRadius: 18, overflow: 'hidden', backgroundColor: '#EEF0E5' }}>
      <WebView<object>
        source={{ uri: player }}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={{ flex: 1 }} color={colors.ink} />}
        onError={onError}
        onHttpError={onError}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith('https://www.tiktok.com/') || request.url === 'about:blank')
            return true;
          if (request.url.startsWith('https://')) void Linking.openURL(request.url).catch(onError);
          return false;
        }}
      />
    </View>
  );
}
